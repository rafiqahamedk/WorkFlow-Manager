import Workflow from '../models/Workflow.js';
import Step from '../models/Step.js';
import Rule from '../models/Rule.js';

export async function createWorkflow(req, res, next) {
  try {
    const workflow = await Workflow.create({ ...req.body, version: 1, start_step_id: null, created_by: req.user.id });
    res.status(201).json(workflow);
  } catch (err) {
    next(err);
  }
}

export async function listWorkflows(req, res, next) {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const query = search
      ? { name: { $regex: search, $options: 'i' }, created_by: req.user.id }
      : { created_by: req.user.id };
    const total = await Workflow.countDocuments(query);
    const workflows = await Workflow.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ created_at: -1 });

    const result = await Promise.all(
      workflows.map(async (wf) => {
        const stepCount = await Step.countDocuments({ workflow_id: wf._id });
        return { ...wf.toObject(), step_count: stepCount };
      })
    );

    res.json({ data: result, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

export async function getWorkflow(req, res, next) {
  try {
    const workflow = await Workflow.findOne({ _id: req.params.id, created_by: req.user.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: workflow._id }).sort({ order: 1 });
    const stepsWithRules = await Promise.all(
      steps.map(async (step) => {
        const rules = await Rule.find({ step_id: step._id }).sort({ priority: 1 });
        return { ...step.toObject(), rules };
      })
    );

    res.json({ ...workflow.toObject(), steps: stepsWithRules });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkflow(req, res, next) {
  try {
    const existing = await Workflow.findOne({ _id: req.params.id, created_by: req.user.id });
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    // Only increment version when name, description, or input_schema actually changes
    const hasStructuralChange =
      (req.body.name && req.body.name !== existing.name) ||
      (req.body.description !== undefined && req.body.description !== existing.description) ||
      (req.body.input_schema && JSON.stringify(req.body.input_schema) !== JSON.stringify(existing.input_schema));

    const updateData = {
      ...req.body,
      version: hasStructuralChange ? existing.version + 1 : existing.version,
      // Never wipe start_step_id from a PUT
      start_step_id: req.body.start_step_id || existing.start_step_id,
    };

    const updated = await Workflow.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkflow(req, res, next) {
  try {
    const workflow = await Workflow.findOneAndDelete({ _id: req.params.id, created_by: req.user.id });
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });

    const steps = await Step.find({ workflow_id: req.params.id });
    for (const step of steps) {
      await Rule.deleteMany({ step_id: step._id });
    }
    await Step.deleteMany({ workflow_id: req.params.id });

    res.json({ message: 'Workflow deleted' });
  } catch (err) {
    next(err);
  }
}

// Repair all workflows that have a missing/invalid start_step_id
export async function repairWorkflows(req, res, next) {
  try {
    const workflows = await Workflow.find({});
    const results = [];

    for (const wf of workflows) {
      const needsRepair = !wf.start_step_id || wf.start_step_id === 'null';
      if (needsRepair) {
        const firstStep = await Step.findOne({ workflow_id: wf._id }).sort({ order: 1, created_at: 1 });
        const startStepId = firstStep ? String(firstStep._id) : null;
        await Workflow.findByIdAndUpdate(wf._id, { start_step_id: startStepId });
        results.push({ workflow: wf.name, id: wf._id, start_step_id: startStepId, repaired: true });
      } else {
        results.push({ workflow: wf.name, id: wf._id, start_step_id: wf.start_step_id, repaired: false });
      }
    }

    res.json({ message: 'Repair complete', results });
  } catch (err) {
    next(err);
  }
}
