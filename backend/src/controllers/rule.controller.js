import Rule from '../models/Rule.js';
import Step from '../models/Step.js';

export async function addRule(req, res, next) {
  try {
    const step = await Step.findById(req.params.step_id);
    if (!step) return res.status(404).json({ error: 'Step not found' });

    const rule = await Rule.create({ ...req.body, step_id: req.params.step_id });
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

export async function listRules(req, res, next) {
  try {
    const rules = await Rule.find({ step_id: req.params.step_id }).sort({ priority: 1 });
    res.json(rules);
  } catch (err) {
    next(err);
  }
}

export async function updateRule(req, res, next) {
  try {
    const rule = await Rule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

export async function deleteRule(req, res, next) {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    next(err);
  }
}
