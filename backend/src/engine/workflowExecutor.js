import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import Execution from '../models/Execution.js';
import { evaluateRules } from './ruleEngine.js';

const MAX_ITERATIONS = 50;

export async function runExecution(executionId) {
  const execution = await Execution.findById(executionId).populate('workflow_id');
  if (!execution) throw new Error('Execution not found');
  if (['completed', 'canceled', 'failed'].includes(execution.status)) return execution;

  execution.status = 'in_progress';
  execution.started_at = execution.started_at || new Date();

  // Resolve starting step ID
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

    // Find step by ID — handle both string and ObjectId
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
      // selected_next_step stores the name — we need the ID from the next step log or re-evaluate
      // Instead, store next_step_id separately; for now re-evaluate by finding next step by name
      const nextStepByName = existingLog.next_step_id
        ? existingLog.next_step_id
        : null;
      currentStepId = nextStepByName;
      continue;
    }

    // ── Approval step: pause and wait ────────────────────────────────────────
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
        execution.markModified('logs');
        await execution.save();
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

    // Evaluate rules
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
        // null next_step_id = end of workflow
      } else {
        stepLog.status = 'failed';
        stepLog.error_message = 'No matching rule and no DEFAULT rule defined';
        stepLog.ended_at = new Date();
        execution.logs.push(stepLog);
        execution.status = 'failed';
        execution.ended_at = new Date();
        execution.markModified('logs');
        await execution.save();
        return execution;
      }
    }
    // No rules = step completes and workflow ends

    stepLog.status = 'completed';
    stepLog.ended_at = new Date();

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
    throw new Error('Max iterations reached — possible infinite loop');
  }

  execution.status = 'completed';
  execution.ended_at = new Date();
  await execution.save();
  return execution;
}
