import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, createStep, updateStep, deleteStep } from '../api/client.js';
import AddStepModal from '../components/AddStepModal.jsx';

const TYPE_CONFIG = {
  task:         { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     icon: '⚙' },
  approval:     { color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', icon: '✋' },
  notification: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: '🔔' },
};

function ProgressBar({ step }) {
  const steps = ['Workflow Details', 'Add Steps', 'Configure Rules'];
  return (
    <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={`flex-1 h-px ${done ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${done ? 'bg-emerald-500 text-white' : active ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {done ? '✓' : num}
              </div>
              <span className={`text-xs font-medium hidden sm:block
                ${done ? 'text-emerald-400' : active ? 'text-violet-300' : 'text-slate-600'}`}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepRow({ step, index, onEdit, onDelete, editing, editForm, setEditForm, onSave, onCancel }) {
  const cfg = TYPE_CONFIG[step.step_type] || TYPE_CONFIG.task;
  return (
    <div className="glass rounded-xl px-5 py-4 flex items-center gap-4">
      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
        {index + 1}
      </div>
      <span className="text-lg shrink-0">{cfg.icon}</span>

      {editing ? (
        <div className="flex gap-2 flex-1 flex-wrap items-center">
          <input
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 flex-1 min-w-0"
            autoFocus
          />
          <select
            value={editForm.step_type}
            onChange={(e) => setEditForm({ ...editForm, step_type: e.target.value })}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            {['task', 'approval', 'notification'].map((t) => <option key={t}>{t}</option>)}
          </select>
          {editForm.step_type === 'approval' && (
            <input
              type="email"
              placeholder="Approver email"
              value={editForm.approver_email || ''}
              onChange={(e) => setEditForm({ ...editForm, approver_email: e.target.value })}
              className="bg-slate-800 border border-purple-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500 min-w-0"
            />
          )}
          {editForm.step_type === 'notification' && (
            <input
              type="email"
              placeholder="Notify email"
              value={editForm.approver_email || ''}
              onChange={(e) => setEditForm({ ...editForm, approver_email: e.target.value })}
              className="bg-slate-800 border border-orange-500/40 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-orange-500 min-w-0"
            />
          )}
          <button type="button" onClick={onSave} className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">Save</button>
          <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Cancel</button>
        </div>
      ) : (
        <>
          <span className="flex-1 font-medium text-white text-sm">{step.name}</span>
          {step.step_type === 'approval' && step.approver_email && (
            <span className="text-xs text-purple-400/70 font-mono hidden sm:block truncate max-w-[160px]" title={step.approver_email}>
              ✉ {step.approver_email}
            </span>
          )}
          {step.step_type === 'notification' && step.approver_email && (
            <span className="text-xs text-orange-400/70 font-mono hidden sm:block truncate max-w-[160px]" title={step.approver_email}>
              ✉ {step.approver_email}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${cfg.bg} ${cfg.color}`}>
            {step.step_type}
          </span>
          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={() => onEdit(step)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-sm" title="Edit">✎</button>
            <button type="button" onClick={() => onDelete(step._id)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm" title="Delete">✕</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function StepsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [showAddStep, setShowAddStep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  async function load() {
    const res = await getWorkflow(id);
    const { steps: s, ...wf } = res.data;
    setWorkflow(wf);
    setSteps(s || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleAddStep({ name, step_type, approver_email }) {
    const res = await createStep(id, { name, step_type, order: steps.length, approver_email });
    setSteps((prev) => [...prev, { ...res.data, rules: [] }]);
    setShowAddStep(false);
  }

  async function handleDelete(stepId) {
    if (!confirm('Delete this step and all its rules?')) return;
    await deleteStep(stepId);
    setSteps((prev) => prev.filter((s) => String(s._id) !== String(stepId)));
  }

  function startEdit(step) {
    setEditingId(step._id);
    setEditForm({ name: step.name, step_type: step.step_type, order: step.order, approver_email: step.approver_email || '' });
  }

  async function saveEdit() {
    const payload = {
      ...editForm,
      approver_email: editForm.approver_email?.trim() || null,
    };
    const res = await updateStep(editingId, payload);
    setSteps((prev) => prev.map((s) => String(s._id) === String(editingId) ? { ...s, ...res.data } : s));
    setEditingId(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button type="button" onClick={() => navigate('/workflows')} className="text-slate-500 hover:text-slate-300 transition-colors">Workflows</button>
        <span className="text-slate-700">/</span>
        <button type="button" onClick={() => navigate(`/workflows/${id}/edit`)} className="text-slate-500 hover:text-slate-300 transition-colors">{workflow?.name}</button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">Steps</span>
      </div>

      <ProgressBar step={2} />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Add Steps</h1>
          <p className="text-slate-400 text-sm mt-1">
            {workflow?.name}
            <span className="ml-2 font-mono text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">v{workflow?.version}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddStep(true)}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-violet-900/30"
        >
          + Add Step
        </button>
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl mx-auto mb-4">⬡</div>
          <p className="text-slate-400 text-sm mb-1">No steps yet</p>
          <p className="text-slate-600 text-xs mb-6">Add at least one step to define your workflow</p>
          <button
            type="button"
            onClick={() => setShowAddStep(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            + Add First Step
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {steps.map((step, idx) => (
              <StepRow
                key={step._id}
                step={step}
                index={idx}
                editing={editingId === step._id}
                editForm={editForm}
                setEditForm={setEditForm}
                onEdit={startEdit}
                onDelete={handleDelete}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
              />
            ))}
          </div>

          {/* Navigation footer */}
          <div className="flex items-center justify-between glass rounded-xl p-4 mt-2">
            <button type="button"
              onClick={() => navigate(`/workflows/${id}/edit`)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700"
            >
              ← Back to Details
            </button>
            <button type="button"
              onClick={() => navigate(`/workflows/${id}/rules`)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Next: Configure Rules →
            </button>
          </div>
        </>
      )}

      {showAddStep && (
        <AddStepModal onClose={() => setShowAddStep(false)} onAdd={handleAddStep} />
      )}
    </div>
  );
}
