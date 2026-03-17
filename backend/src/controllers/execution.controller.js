import Execution from '../models/Execution.js';
import Workflow from '../models/Workflow.js';
import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import { runExecution } from '../engine/workflowExecutor.js';
import { evaluateRules } from '../engine/ruleEngine.js';

export async function startExecution(req, res, next) {
  try {
    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (!workflow.is_active) return res.status(400).json({ error: 'Workflow is not active' });

    const execution = await Execution.create({
      workflow_id: workflow._id,
      workflow_version: workflow.version,
      data: req.body.data || {},
      triggered_by: req.body.triggered_by || 'anonymous',
      current_step_id: workflow.start_step_id,
    });

    // Run async (non-blocking for approval steps)
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
    res.json(execution);
  } catch (err) {
    next(err);
  }
}

export async function listExecutions(req, res, next) {
  try {
    const { page = 1, limit = 10 } = req.query;
    const total = await Execution.countDocuments();
    const executions = await Execution.find()
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
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
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
    const execution = await Execution.findById(req.params.id);
    if (!execution) return res.status(404).json({ error: 'Execution not found' });
    if (execution.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed executions can be retried' });
    }

    // Reset failed step log and retry from current step
    const failedLog = execution.logs.find((l) => l.status === 'failed');
    if (failedLog) {
      failedLog.status = 'pending';
      failedLog.error_message = null;
    }

    execution.status = 'in_progress';
    execution.retries += 1;
    execution.ended_at = null;
    await execution.save();

    const result = await runExecution(String(execution._id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// Approve or reject an approval step
export async function approveStep(req, res, next) {
  try {
    const { approver_id, approved } = req.body;
    const execution = await Execution.findById(req.params.id).populate('workflow_id');
    if (!execution) return res.status(404).json({ error: 'Execution not found' });

    const stepLog = execution.logs.find(
      (l) => l.step_id === execution.current_step_id && l.status === 'in_progress'
    );
    if (!stepLog) return res.status(400).json({ error: 'No pending approval step found' });

    const step = await Step.findById(execution.current_step_id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    if (!approved) {
      stepLog.status = 'failed';
      stepLog.error_message = 'Rejected by approver';
      stepLog.approver_id = approver_id;
      stepLog.ended_at = new Date();
      execution.status = 'failed';
      execution.ended_at = new Date();
      await execution.save();
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
        }
      }
    }

    stepLog.status = 'completed';
    stepLog.approver_id = approver_id;
    stepLog.ended_at = new Date();
    execution.current_step_id = nextStepId;
    await execution.save();

    // Continue execution
    const result = await runExecution(String(execution._id));
    res.json(result);
  } catch (err) {
    next(err);
  }
}
