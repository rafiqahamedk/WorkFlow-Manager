import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import Execution from '../models/Execution.js';
import { evaluateRules } from './ruleEngine.js';

const MAX_ITERATIONS = 50; // prevent infinite loops

/**
 * Execute a workflow from the current step forward.
 * Handles task/notification steps automatically.
 * Pauses on approval steps (waiting for user action).
 */
export async function runExecution(executionId) {
  const execution = await Execution.findById(executionId).populate('workflow_id');
  if (!execution) throw new Error('Execution not found');
  if (['completed', 'canceled', 'failed'].includes(execution.status)) return execution;

  execution.status = 'in_progress';
  execution.started_at = execution.started_at || new Date();
  await execution.save();

  let currentStepId = execution.current_step_id || execution.workflow_id.start_step_id;
  let iterations = 0;

  while (currentStepId && iterations < MAX_ITERATIONS) {
    iterations++;

    const step = await Step.findById(currentStepId);
    if (!step) {
      execution.status = 'failed';
      execution.ended_at = new Date();
      await execution.save();
      throw new Error(`Step ${currentStepId} not found`);
    }

    // Check if this step already has a log entry
    const existingLog = execution.logs.find((l) => l.step_id === String(step._id));
    if (existingLog && existingLog.status === 'completed') {
      // Already done, move to next
      currentStepId = existingLog.selected_next_step;
      continue;
    }

    // Approval steps pause execution — wait for user action
    if (step.step_type === 'approval') {
      const pendingLog = execution.logs.find(
        (l) => l.step_id === String(step._id) && l.status === 'in_progress'
      );
      if (!pendingLog) {
        execution.logs.push({
          step_id: String(step._id),
          step_name: step.name,
          step_type: step.step_type,
          evaluated_rules: [],
          status: 'in_progress',
          started_at: new Date(),
        });
        execution.current_step_id = String(step._id);
        await execution.save();
      }
      // Pause — waiting for approval
      return execution;
    }

    // Task / Notification steps — auto-execute
    const stepLog = {
      step_id: String(step._id),
      step_name: step.name,
      step_type: step.step_type,
      evaluated_rules: [],
      selected_next_step: null,
      status: 'in_progress',
      started_at: new Date(),
    };

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
      } else {
        stepLog.status = 'failed';
        stepLog.error_message = 'No matching rule found and no DEFAULT rule defined';
        stepLog.ended_at = new Date();
        execution.logs.push(stepLog);
        execution.status = 'failed';
        execution.ended_at = new Date();
        await execution.save();
        return execution;
      }
    }

    stepLog.status = 'completed';
    stepLog.ended_at = new Date();
    execution.logs.push(stepLog);
    execution.current_step_id = nextStepId;
    currentStepId = nextStepId;
    await execution.save();
  }

  if (iterations >= MAX_ITERATIONS) {
    execution.status = 'failed';
    execution.ended_at = new Date();
    await execution.save();
    throw new Error('Max iterations reached — possible infinite loop detected');
  }

  execution.status = 'completed';
  execution.ended_at = new Date();
  await execution.save();
  return execution;
}
