import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import Execution from '../models/Execution.js';
import User from '../models/User.js';
import { evaluateRules } from './ruleEngine.js';
import { sendApprovalEmail } from '../services/emailService.js';
import { createNotification } from '../services/notificationService.js';
import crypto from 'crypto';

const MAX_ITERATIONS = 50;
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function runExecution(executionId) {
  const execution = await Execution.findById(executionId).populate('workflow_id');
  if (!execution) throw new Error('Execution not found');
  if (['completed', 'canceled', 'failed'].includes(execution.status)) return execution;

  const workflow = execution.workflow_id;
  const owner = workflow?.created_by
    ? await User.findById(workflow.created_by).catch(() => null)
    : null;

  // Fire-and-forget — never block execution waiting for notifications/email
  function notify(message, type, emailExtra = null) {
    if (!owner) return;
    createNotification({
      user_id: String(owner._id),
      user_email: owner.email,
      message,
      type,
      execution_id: executionId,
      emailExtra,
    }).catch((e) => console.error('[Executor] Notification error:', e.message));
  }

  execution.status = 'in_progress';
  execution.started_at = execution.started_at || new Date();

  let currentStepId = execution.current_step_id
    ? String(execution.current_step_id)
    : execution.workflow_id.start_step_id
      ? String(execution.workflow_id.start_step_id)
      : null;

  if (!currentStepId) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    await execution.save();
    throw new Error('Workflow has no start_step_id defined');
  }

  await execution.save();
  console.log(`[Executor] Starting execution ${executionId}, start_step_id: ${currentStepId}`);

  let iterations = 0;

  while (currentStepId && iterations < MAX_ITERATIONS) {
    iterations++;

    const step = await Step.findById(currentStepId).catch(() => null);
    if (!step) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.markModified('logs');
      await execution.save();
      throw new Error(`Step "${currentStepId}" not found`);
    }

    const stepIdStr = String(step._id);
    console.log(`[Executor] Step ${iterations}: "${step.name}" (${step.step_type}), id: ${stepIdStr}`);

    // Skip already-completed steps (resume support)
    const existingLog = execution.logs.find(
      (l) => l.step_id === stepIdStr && l.status === 'completed'
    );
    if (existingLog) {
      currentStepId = existingLog.next_step_id || null;
      continue;
    }

    // ── Approval step: pause, generate token, send email ─────────────────────
    if (step.step_type === 'approval') {
      const alreadyPending = execution.logs.find(
        (l) => l.step_id === stepIdStr && l.status === 'in_progress'
      );
      if (!alreadyPending) {
        execution.logs.push({
          step_id: stepIdStr,
          step_name: step.name,
          step_type: step.step_type,
          evaluated_rules: [],
          selected_next_step: null,
          next_step_id: null,
          status: 'in_progress',
          started_at: new Date(),
        });
        execution.current_step_id = stepIdStr;

        const token = crypto.randomBytes(32).toString('hex');
        execution.approval_token = token;
        execution.approval_token_step_id = stepIdStr;
        execution.approval_token_expires_at = new Date(Date.now() + TOKEN_TTL_MS);

        execution.markModified('logs');
        await execution.save(); // save first — respond fast

        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        const approveUrl = `${baseUrl}/approve?executionId=${executionId}&action=approve&token=${token}`;
        const rejectUrl  = `${baseUrl}/approve?executionId=${executionId}&action=reject&token=${token}`;

        // Fire approval email non-blocking
        if (step.approver_email) {
          sendApprovalEmail({
            to: step.approver_email,
            workflowName: workflow?.name || 'Workflow',
            stepName: step.name,
            inputData: execution.data,
            executionId: String(execution._id),
            token,
            baseUrl,
          }).then(() => console.log(`[Executor] Approval email sent to ${step.approver_email}`))
            .catch((e) => console.error(`[Executor] Approval email failed:`, e.message));
        }

        // Fire owner notification non-blocking
        notify(
          `Approval required for step "${step.name}" in "${workflow?.name}"`,
          'info',
          { approveUrl, rejectUrl }
        );
      }
      return execution;
    }

    // ── Task / Notification: auto-execute ────────────────────────────────────
    const stepLog = {
      step_id: stepIdStr,
      step_name: step.name,
      step_type: step.step_type,
      evaluated_rules: [],
      selected_next_step: null,
      next_step_id: null,
      status: 'in_progress',
      started_at: new Date(),
      ended_at: null,
      error_message: null,
    };

    const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
    let nextStepId = null;

    if (rules.length > 0) {
      let matchedRule, evaluationLog;
      try {
        ({ matchedRule, evaluationLog } = evaluateRules(rules, execution.data));
      } catch (err) {
        stepLog.status = 'failed';
        stepLog.error_message = err.message;
        stepLog.ended_at = new Date();
        execution.logs.push(stepLog);
        execution.status = 'failed';
        execution.ended_at = new Date();
        execution.markModified('logs');
        await execution.save();
        notify(`Workflow "${workflow?.name}" failed at step "${step.name}": ${err.message}`, 'error');
        return execution;
      }

      stepLog.evaluated_rules = evaluationLog;

      if (matchedRule) {
        if (matchedRule.next_step_id) {
          nextStepId = String(matchedRule.next_step_id);
          const nextStep = await Step.findById(nextStepId).catch(() => null);
          stepLog.selected_next_step = nextStep ? nextStep.name : null;
          stepLog.next_step_id = nextStepId;
        }
      } else {
        stepLog.status = 'failed';
        stepLog.error_message = 'No matching rule and no DEFAULT rule defined';
        stepLog.ended_at = new Date();
        execution.logs.push(stepLog);
        execution.status = 'failed';
        execution.ended_at = new Date();
        execution.markModified('logs');
        await execution.save();
        notify(`Workflow "${workflow?.name}" failed at step "${step.name}": no matching rule`, 'error');
        return execution;
      }
    }

    stepLog.status = 'completed';
    stepLog.ended_at = new Date();

    // ── Notification step: send email to step.approver_email ─────────────────
    if (step.step_type === 'notification' && step.approver_email) {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0];
      const viewUrl = `${frontendUrl}/executions/${executionId}`;
      createNotification({
        user_id: owner ? String(owner._id) : 'system',
        user_email: step.approver_email,
        message: `Notification from workflow "${workflow?.name}" — step "${step.name}" executed.`,
        type: 'info',
        execution_id: executionId,
        emailExtra: { viewUrl },
      }).catch((e) => console.error('[Executor] Notification step email failed:', e.message));
    }

    execution.logs.push(stepLog);
    execution.current_step_id = nextStepId;
    execution.markModified('logs');
    await execution.save();

    console.log(`[Executor] Step "${step.name}" completed. Next step ID: ${nextStepId || 'END'}`);
    currentStepId = nextStepId;
  }

  if (iterations >= MAX_ITERATIONS) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    await execution.save();
    notify(`Workflow "${workflow?.name}" failed: max iterations reached (possible loop)`, 'error');
    throw new Error('Max iterations reached — possible infinite loop');
  }

  execution.status = 'completed';
  execution.ended_at = new Date();
  await execution.save();
  notify(`Workflow "${workflow?.name}" completed successfully`, 'success');
  return execution;
}
