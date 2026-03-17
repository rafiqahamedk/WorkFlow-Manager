import Step from '../models/Step.js';
import Rule from '../models/Rule.js';
import Workflow from '../models/Workflow.js';

export async function addStep(req, res, next) {
  try {
    const workflow = await Workflow.findById(req.params.workflow_id);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const step = await Step.create({ ...req.body, workflow_id: req.params.workflow_id });

    // Set as start step if it's the first one
    if (!workflow.start_step_id) {
      workflow.start_step_id = String(step._id);
      await workflow.save();
    }

    res.status(201).json(step);
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

    // If this was the start step, clear it
    await Workflow.updateOne(
      { start_step_id: req.params.id },
      { $set: { start_step_id: null } }
    );

    res.json({ message: 'Step deleted' });
  } catch (err) {
    next(err);
  }
}
