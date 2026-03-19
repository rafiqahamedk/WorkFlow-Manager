import Execution from '../models/Execution.js';
import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import User from '../models/User.js';
import { evaluateRules } from '../engine/ruleEngine.js';
import { runExecution } from '../engine/workflowExecutor.js';
import { createNotification } from '../services/notificationService.js';

// GET /approve?executionId=&action=approve|reject&token=
export async function handleApprovalLink(req, res) {
  const { executionId, action, token } = req.query;

  const fail = (msg) => res.status(400).send(htmlPage('Error', `
    <div style="color:#f87171;font-size:18px;margin-bottom:8px;">✕ ${msg}</div>
    <p style="color:#94a3b8;font-size:14px;">Please contact the workflow owner.</p>
  `));

  if (!executionId || !action || !token) return fail('Invalid link — missing parameters.');
  if (!['approve', 'reject'].includes(action)) return fail('Invalid action.');

  const execution = await Execution.findById(executionId).populate('workflow_id').catch(() => null);
  if (!execution) return fail('Execution not found.');

  // Token validation
  if (!execution.approval_token || execution.approval_token !== token) {
    return fail('Invalid or already-used token.');
  }
  if (!execution.approval_token_expires_at || new Date() > execution.approval_token_expires_at) {
    return fail('This approval link has expired (10-minute limit).');
  }
  if (execution.status !== 'in_progress') {
    return fail(`Execution is already ${execution.status}.`);
  }

  const stepId = execution.approval_token_step_id || execution.current_step_id;
  const stepLog = execution.logs.find((l) => l.step_id === stepId && l.status === 'in_progress');
  if (!stepLog) return fail('No pending approval step found.');

  const step = await Step.findById(stepId).catch(() => null);
  if (!step) return fail('Step not found.');

  const approverEmail = step.approver_email || 'unknown';
  const approved = action === 'approve';

  // Invalidate token immediately (one-time use)
  execution.approval_token = null;
  execution.approval_token_expires_at = null;
  execution.approval_token_step_id = null;

  // Record approval history
  execution.approval_history.push({
    step_id: stepId,
    step_name: step.name,
    approver_email: approverEmail,
    action: approved ? 'approved' : 'rejected',
    timestamp: new Date(),
  });

  if (!approved) {
    stepLog.status = 'failed';
    stepLog.error_message = 'Rejected via email link';
    stepLog.approver_id = approverEmail;
    stepLog.ended_at = new Date();
    execution.status = 'failed';
    execution.ended_at = new Date();
    execution.markModified('logs');
    execution.markModified('approval_history');
    await execution.save();

    // Notify owner
    const wfOwner = execution.workflow_id?.created_by
      ? await User.findById(execution.workflow_id.created_by).catch(() => null) : null;
    if (wfOwner) {
      await createNotification({
        user_id: String(wfOwner._id), user_email: wfOwner.email,
        message: `Task "${step.name}" was rejected in "${execution.workflow_id?.name}"`,
        type: 'error', execution_id: executionId,
      }).catch(() => {});
    }

    return res.send(htmlPage('Rejected', `
      <div style="color:#f87171;font-size:20px;margin-bottom:8px;">✕ Task Declined</div>
      <p style="color:#94a3b8;font-size:14px;">You rejected <strong style="color:#e2e8f0;">${step.name}</strong> in <strong style="color:#e2e8f0;">${execution.workflow_id?.name}</strong>.</p>
      <p style="color:#64748b;font-size:12px;margin-top:8px;">The workflow has been stopped.</p>
    `));
  }

  // Approved — evaluate rules to find next step
  const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
  let nextStepId = null;

  if (rules.length > 0) {
    const { matchedRule, evaluationLog } = evaluateRules(rules, execution.data);
    stepLog.evaluated_rules = evaluationLog;
    if (matchedRule?.next_step_id) {
      nextStepId = String(matchedRule.next_step_id);
      const nextStep = await Step.findById(nextStepId).catch(() => null);
      stepLog.selected_next_step = nextStep ? nextStep.name : null;
      stepLog.next_step_id = nextStepId;
    }
  }

  stepLog.status = 'completed';
  stepLog.approver_id = approverEmail;
  stepLog.ended_at = new Date();
  execution.current_step_id = nextStepId;
  execution.markModified('logs');
  execution.markModified('approval_history');
  await execution.save();

  // Resume execution
  try {
    await runExecution(String(execution._id));
  } catch (err) {
    console.error('[Approve] Resume error:', err.message);
  }

  // Notify owner: approved
  const wfOwnerApprove = execution.workflow_id?.created_by
    ? await User.findById(execution.workflow_id.created_by).catch(() => null) : null;
  if (wfOwnerApprove) {
    await createNotification({
      user_id: String(wfOwnerApprove._id), user_email: wfOwnerApprove.email,
      message: `Task "${step.name}" was approved in "${execution.workflow_id?.name}"`,
      type: 'success', execution_id: executionId,
    }).catch(() => {});
  }

  return res.send(htmlPage('Approved', `
    <div style="color:#4ade80;font-size:20px;margin-bottom:8px;">✓ Task Accepted</div>
    <p style="color:#94a3b8;font-size:14px;">You approved <strong style="color:#e2e8f0;">${step.name}</strong> in <strong style="color:#e2e8f0;">${execution.workflow_id?.name}</strong>.</p>
    <p style="color:#64748b;font-size:12px;margin-top:8px;">The workflow has resumed automatically.</p>
  `));
}

function htmlPage(title, bodyContent) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — WorkFlow Manager</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px 48px;text-align:center;max-width:420px;width:90%;">
    <div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#0891b2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#fff;font-size:16px;margin:0 auto 20px;">W</div>
    ${bodyContent}
  </div>
</body>
</html>`;
}
