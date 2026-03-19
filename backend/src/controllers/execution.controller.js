import Execution from '../models/Execution.js';
import Workflow from '../models/Workflow.js';
import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import User from '../models/User.js';
import { runExecution } from '../engine/workflowExecutor.js';
import { evaluateRules } from '../engine/ruleEngine.js';
import { createNotification } from '../services/notificationService.js';

export async function startExecution(req, res, next) {
  try {
    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (!workflow.is_active) return res.status(400).json({ error: 'Workflow is not active' });

    // Validate input data against workflow.input_schema
    const schema = workflow.input_schema || {};
    const inputData = req.body.data || {};
    for (const [field, def] of Object.entries(schema)) {
      if (def.required && (inputData[field] === undefined || inputData[field] === null || inputData[field] === '')) {
        return res.status(400).json({ error: `Missing required field: "${field}"` });
      }
      if (inputData[field] !== undefined && inputData[field] !== '') {
        if (def.type === 'number' && isNaN(Number(inputData[field]))) {
          return res.status(400).json({ error: `Field "${field}" must be a number` });
        }
        if (def.allowed_values && def.allowed_values.length > 0 && !def.allowed_values.includes(String(inputData[field]))) {
          return res.status(400).json({ error: `Field "${field}" must be one of: ${def.allowed_values.join(', ')}` });
        }
      }
    }

    // Auto-repair: if start_step_id is missing, find the first step by order
    let startStepId = workflow.start_step_id;
    if (!startStepId || startStepId === 'null') {
      const firstStep = await Step.findOne({ workflow_id: workflow._id }).sort({ order: 1, created_at: 1 });
      if (!firstStep) {
        return res.status(400).json({ error: 'Workflow has no steps. Add at least one step before executing.' });
      }
      startStepId = String(firstStep._id);
      await Workflow.findByIdAndUpdate(workflow._id, { start_step_id: startStepId });
      console.log(`[Execution] Auto-repaired start_step_id → ${startStepId}`);
    }

    const execution = await Execution.create({
      workflow_id: workflow._id,
      workflow_version: workflow.version,
      data: req.body.data || {},
      triggered_by: req.body.triggered_by || 'anonymous',
      current_step_id: startStepId,
    });

    const result = await runExecution(String(execution._id));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getExecution(req, res, next) {
  try {
    const execution = await Execution.findById(req.params.id).populate('workflow_id');
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    // Ownership check: verify the execution belongs to a workflow owned by this user
    const workflow = await Workflow.findOne({ _id: execution.workflow_id, created_by: req.user.id });
    if (!workflow) return res.status(403).json({ error: 'Access denied' });

    res.json(execution);
  } catch (err) {
    next(err);
  }
}

export async function listExecutions(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    // Only return executions for workflows owned by this user
    const userWorkflows = await Workflow.find({ created_by: req.user.id }, '_id');
    const workflowIds = userWorkflows.map((w) => w._id);
    const filter = { workflow_id: { $in: workflowIds } };
    const total = await Execution.countDocuments(filter);
    const executions = await Execution.find(filter)
      .populate('workflow_id', 'name version')
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ data: executions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

export async function cancelExecution(req, res, next) {
  try {
    const execution = await Execution.findById(req.params.id).populate('workflow_id', 'created_by');
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (String(execution.workflow_id?.created_by) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (['completed', 'canceled', 'failed'].includes(execution.status)) {
      return res.status(400).json({ error: `Cannot cancel execution in status: ${execution.status}` });
    }
    execution.status = 'canceled';
    execution.ended_at = new Date();
    await execution.save();
    res.json(execution);
  } catch (err) {
    next(err);
  }
}

export async function retryExecution(req, res, next) {
  try {
    const execution = await Execution.findById(req.params.id).populate('workflow_id', 'created_by');
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (String(execution.workflow_id?.created_by) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (execution.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed executions can be retried' });
    }

    // Reset failed step log and rewind current_step_id to that step
    const failedLog = execution.logs.find((l) => l.status === 'failed');
    if (failedLog) {
      execution.current_step_id = failedLog.step_id; // rewind to the failed step
      failedLog.status = 'pending';
      failedLog.error_message = null;
    }

    execution.status = 'in_progress';
    execution.retries += 1;
    execution.ended_at = undefined;
    execution.markModified('logs');
    await execution.save();

    const result = await runExecution(String(execution._id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Approve or reject an approval step (UI-triggered)
export async function approveStep(req, res, next) {
  try {
    const { approver_id, approved } = req.body;
    const execution = await Execution.findById(req.params.id).populate('workflow_id');
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    // Guard: already processed
    if (['completed', 'failed', 'canceled'].includes(execution.status)) {
      return res.status(400).json({ error: 'This approval has already been processed.' });
    }

    const stepLog = execution.logs.find(
      (l) => l.step_id === execution.current_step_id && l.status === 'in_progress'
    );
    if (!stepLog) return res.status(400).json({ error: 'No pending approval step found' });

    const step = await Step.findById(execution.current_step_id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    // Record in approval_history
    execution.approval_history.push({
      step_id: String(step._id),
      step_name: step.name,
      approver_email: approver_id || 'ui-approver',
      action: approved ? 'approved' : 'rejected',
      timestamp: new Date(),
    });

    if (!approved) {
      stepLog.status = 'failed';
      stepLog.error_message = 'Rejected by approver';
      stepLog.approver_id = approver_id;
      stepLog.ended_at = new Date();
      execution.status = 'failed';
      execution.ended_at = new Date();
      execution.markModified('logs');
      execution.markModified('approval_history');
      await execution.save();
      // Notify
      const ownerR = execution.workflow_id?.created_by
        ? await User.findById(execution.workflow_id.created_by).catch(() => null) : null;
      if (ownerR) await createNotification({
        user_id: String(ownerR._id), user_email: ownerR.email,
        message: `Task "${step.name}" was rejected in "${execution.workflow_id?.name}"`,
        type: 'error', execution_id: String(execution._id),
      }).catch(() => {});
      return res.json(execution);
    }

    // Evaluate rules to find next step
    const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
    let nextStepId = null;

    if (rules.length > 0) {
      const { matchedRule, evaluationLog } = evaluateRules(rules, execution.data);
      stepLog.evaluated_rules = evaluationLog;
      if (matchedRule) {
        nextStepId = matchedRule.next_step_id ? String(matchedRule.next_step_id) : null;
        if (matchedRule.next_step_id) {
          const nextStep = await Step.findById(matchedRule.next_step_id);
          stepLog.selected_next_step = nextStep ? nextStep.name : null;
          stepLog.next_step_id = nextStepId;
        }
      }
    }

    stepLog.status = 'completed';
    stepLog.approver_id = approver_id;
    stepLog.ended_at = new Date();
    // Invalidate any pending email token so email links can't double-fire
    execution.approval_token = null;
    execution.approval_token_expires_at = null;
    execution.approval_token_step_id = null;
    execution.current_step_id = nextStepId;
    execution.markModified('logs');
    execution.markModified('approval_history');
    await execution.save();

    // Notify: approved
    const ownerA = execution.workflow_id?.created_by
      ? await User.findById(execution.workflow_id.created_by).catch(() => null) : null;
    if (ownerA) await createNotification({
      user_id: String(ownerA._id), user_email: ownerA.email,
      message: `Task "${step.name}" was approved in "${execution.workflow_id?.name}"`,
      type: 'success', execution_id: String(execution._id),
    }).catch(() => {});

    const result = await runExecution(String(execution._id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
