import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import Workflow from '../models/Workflow.js';

/** Returns true if the value is a missing/empty start_step_id */
function isMissing(val) {
  return !val || val === 'null' || val === 'undefined' || String(val).trim() === '';
}

export async function addStep(req, res, next) {
  try {
    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const step = await Step.create({ ...req.body, workflow_id: req.params.workflow_id });

    // Always set start_step_id to the lowest-order step
    await recalculateStartStep(workflow._id);

    const updated = await Workflow.findById(workflow._id);
    res.status(201).json({ ...step.toObject(), workflow_start_step_id: updated.start_step_id });
  } catch (err) {
    next(err);
  }
}

export async function listSteps(req, res, next) {
  try {
    const steps = await Step.find({ workflow_id: req.params.workflow_id }).sort({ order: 1 });
    res.json(steps);
  } catch (err) {
    next(err);
  }
}

export async function updateStep(req, res, next) {
  try {
    const step = await Step.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!step) return res.status(404).json({ error: 'Step not found' });

    // If order changed, recalculate start step
    if (req.body.order !== undefined) {
      await recalculateStartStep(step.workflow_id);
    }

    res.json(step);
  } catch (err) {
    next(err);
  }
}

export async function deleteStep(req, res, next) {
  try {
    const step = await Step.findByIdAndDelete(req.params.id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    // Cascade delete rules
    await Rule.deleteMany({ step_id: req.params.id });

    // Recalculate start step from remaining steps
    await recalculateStartStep(step.workflow_id);

    res.json({ message: 'Step deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * Sets workflow.start_step_id to the step with the lowest order value.
 * Falls back to the first created step if orders are equal.
 */
async function recalculateStartStep(workflowId) {
  const steps = await Step.find({ workflow_id: workflowId }).sort({ order: 1, created_at: 1 });
  const startStepId = steps.length > 0 ? String(steps[0]._id) : null;
  await Workflow.findByIdAndUpdate(workflowId, { start_step_id: startStepId });
  console.log(`[StartStep] workflow ${workflowId} → start_step_id set to ${startStepId}`);
  return startStepId;
}
