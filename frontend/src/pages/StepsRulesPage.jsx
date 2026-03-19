import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, createStep, updateStep, deleteStep } from '../api/client.js';
import StepCard from '../components/StepCard.jsx';
import AddStepModal from '../components/AddStepModal.jsx';

export default function StepsRulesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [showAddStep, setShowAddStep] = useState(false);
  const [loading, setLoading] = useState(true);

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

  async function handleDeleteStep(stepId) {
    if (!confirm('Delete this step and all its rules?')) return;
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button type="button" onClick={() => navigate('/workflows')} className="text-slate-500 hover:text-slate-300 transition-colors">Workflows</button>
        <span className="text-slate-700">/</span>
        <button type="button" onClick={() => navigate(`/workflows/${id}/edit`)} className="text-slate-500 hover:text-slate-300 transition-colors">{workflow?.name}</button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">Steps & Rules</span>
      </div>

      {/* Progress */}
      <div className="glass rounded-xl p-4 mb-6 flex items-center gap-4">
        <ProgressStep num={1} label="Create Workflow" done />
        <div className="flex-1 h-px bg-slate-700" />
        <ProgressStep num={2} label="Add Steps & Rules" active />
        <div className="flex-1 h-px bg-slate-700" />
        <ProgressStep num={3} label="Execute" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Steps & Rules</h1>
          <p className="text-slate-400 text-sm mt-1">
            {workflow?.name}
            <span className="ml-2 font-mono text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">v{workflow?.version}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(`/workflows/${id}/edit`)}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors border border-slate-700">
            ← Edit Details
          </button>
          <button type="button" onClick={() => setShowAddStep(true)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-violet-900/30">
            + Add Step
          </button>
        </div>
      </div>

      {/* Steps list */}
      {steps.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-2xl mx-auto mb-4">⬡</div>
          <p className="text-slate-400 text-sm mb-1">No steps yet</p>
          <p className="text-slate-600 text-xs mb-6">Add steps, then configure rules to define routing logic</p>
          <button type="button" onClick={() => setShowAddStep(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            + Add First Step
          </button>
        </div>
      ) : (
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

          {/* Go to Workflows CTA */}
          <button type="button" onClick={() => navigate('/workflows')}
            className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/30 hover:border-emerald-500/50 transition-all group mt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-base">✓</div>
              <div className="text-left">
                <p className="text-sm font-semibold text-emerald-400">Done — Go to Workflows</p>
                <p className="text-xs text-slate-500 mt-0.5">Execute the workflow with sample input data</p>
              </div>
            </div>
            <span className="text-emerald-500 group-hover:translate-x-1 transition-transform text-lg">→</span>
          </button>
        </div>
      )}

      {showAddStep && (
        <AddStepModal onClose={() => setShowAddStep(false)} onAdd={handleAddStep} />
      )}
    </div>
  );
}

function ProgressStep({ num, label, done, active }) {
  return (
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
  );
}
