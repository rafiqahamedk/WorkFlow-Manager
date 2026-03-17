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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline text-sm">← Back</button>
        <h1 className="text-2xl font-semibold">{isNew ? 'New Workflow' : `Edit: ${form.name}`}</h1>
      </div>

      <form onSubmit={handleSaveWorkflow} className="bg-white rounded shadow p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Workflow Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            placeholder="e.g. Expense Approval"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="border rounded px-3 py-2 w-full"
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <label htmlFor="is_active" className="text-sm">Active</label>
        </div>

        <InputSchemaEditor
          schema={form.input_schema || {}}
          onChange={(schema) => setForm({ ...form, input_schema: schema })}
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Create Workflow' : 'Save Changes'}
        </button>
      </form>

      {!isNew && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Steps</h2>
            <button onClick={handleAddStep} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700">
              + Add Step
            </button>
          </div>
          {steps.length === 0 && (
            <p className="text-gray-400 text-sm">No steps yet. Add your first step above.</p>
          )}
          <div className="space-y-4">
            {steps.map((step) => (
              <StepCard
                key={step._id}
                step={step}
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
