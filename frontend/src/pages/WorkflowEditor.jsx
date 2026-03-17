import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getWorkflow, createWorkflow, updateWorkflow,
  createStep, updateStep, deleteStep,
} from '../api/client.js';
import StepCard from '../components/StepCard.jsx';
import InputSchemaEditor from '../components/InputSchemaEditor.jsx';

const emptyWorkflow = { name: '', description: '', input_schema: {}, is_active: true };

export default function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(emptyWorkflow);
  const [steps, setSteps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isNew) {
      getWorkflow(id).then((res) => {
        const { steps: s, ...wf } = res.data;
        setForm(wf);
        setSteps(s || []);
      });
    }
  }, [id]);

  async function handleSaveWorkflow(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const res = await createWorkflow(form);
        navigate(`/workflows/${res.data._id}/edit`);
      } else {
        await updateWorkflow(id, form);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStep() {
    const name = prompt('Step name?');
    if (!name) return;
    const type = prompt('Step type? (task / approval / notification)', 'task');
    if (!['task', 'approval', 'notification'].includes(type)) return alert('Invalid type');
    const res = await createStep(id, { name, step_type: type, order: steps.length });
    setSteps((prev) => [...prev, { ...res.data, rules: [] }]);
  }

  async function handleDeleteStep(stepId) {
    if (!confirm('Delete this step?')) return;
    await deleteStep(stepId);
    setSteps((prev) => prev.filter((s) => String(s._id) !== String(stepId)));
  }

  async function handleUpdateStep(stepId, data) {
    const res = await updateStep(stepId, data);
    setSteps((prev) => prev.map((s) => (String(s._id) === String(stepId) ? { ...s, ...res.data } : s)));
  }

  function handleRulesChange(stepId, rules) {
    setSteps((prev) => prev.map((s) => (String(s._id) === String(stepId) ? { ...s, rules } : s)));
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 transition-colors">Workflows</button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{isNew ? 'New Workflow' : form.name || 'Edit'}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{isNew ? 'New Workflow' : 'Edit Workflow'}</h1>
        {!isNew && (
          <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">v{form.version}</span>
        )}
      </div>

      {/* Workflow form */}
      <form onSubmit={handleSaveWorkflow} className="glass rounded-xl p-6 mb-6 space-y-5">
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Workflow Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
              placeholder="e.g. Expense Approval"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm resize-none"
              rows={2}
              placeholder="Optional description..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-violet-600' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-slate-300">{form.is_active ? 'Active' : 'Inactive'}</span>
        </div>

        <InputSchemaEditor
          schema={form.input_schema || {}}
          onChange={(schema) => setForm({ ...form, input_schema: schema })}
        />

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-900/30"
          >
            {saving ? 'Saving...' : isNew ? 'Create Workflow' : 'Save Changes'}
          </button>
          {saved && <span className="text-emerald-400 text-sm flex items-center gap-1.5">✓ Saved</span>}
          <button type="button" onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 text-sm transition-colors ml-auto">Cancel</button>
        </div>
      </form>

      {/* Steps section */}
      {!isNew && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Steps</h2>
              <p className="text-slate-500 text-xs mt-0.5">{steps.length} step{steps.length !== 1 ? 's' : ''} defined</p>
            </div>
            <button
              onClick={handleAddStep}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Add Step
            </button>
          </div>

          {steps.length === 0 && (
            <div className="glass rounded-xl p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl mx-auto mb-3">⬡</div>
              <p className="text-slate-400 text-sm">No steps yet. Add your first step to get started.</p>
            </div>
          )}

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <StepCard
                key={step._id}
                step={step}
                index={idx}
                allSteps={steps}
                onDelete={handleDeleteStep}
                onUpdate={handleUpdateStep}
                onRulesChange={handleRulesChange}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
