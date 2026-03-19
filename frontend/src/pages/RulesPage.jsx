import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow } from '../api/client.js';
import RuleEditor from '../components/RuleEditor.jsx';

const TYPE_CONFIG = {
  task:         { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     icon: '⚙' },
  approval:     { color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', icon: '✋' },
  notification: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: '🔔' },
};

function ProgressBar() {
  const steps = ['Workflow Details', 'Add Steps', 'Configure Rules'];
  return (
    <div className="glass rounded-xl p-4 mb-6 flex items-center gap-3">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < 3;
        const active = num === 3;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={`flex-1 h-px ${done ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
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

export default function RulesPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStepId, setActiveStepId] = useState(null);

  async function load() {
    const res = await getWorkflow(id);
    const { steps: s, ...wf } = res.data;
    setWorkflow(wf);
    setSteps(s || []);
    if (s && s.length > 0) setActiveStepId(String(s[0]._id));
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  function handleRulesChange(stepId, rules) {
    setSteps((prev) => prev.map((s) => String(s._id) === String(stepId) ? { ...s, rules } : s));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const activeStep = steps.find((s) => String(s._id) === activeStepId);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button type="button" onClick={() => navigate('/workflows')} className="text-slate-500 hover:text-slate-300 transition-colors">Workflows</button>
        <span className="text-slate-700">/</span>
        <button type="button" onClick={() => navigate(`/workflows/${id}/edit`)} className="text-slate-500 hover:text-slate-300 transition-colors">{workflow?.name}</button>
        <span className="text-slate-700">/</span>
        <button type="button" onClick={() => navigate(`/workflows/${id}/steps`)} className="text-slate-500 hover:text-slate-300 transition-colors">Steps</button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">Rules</span>
      </div>

      <ProgressBar />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Configure Rules</h1>
          <p className="text-slate-400 text-sm mt-1">
            {workflow?.name}
            <span className="ml-2 font-mono text-xs bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">v{workflow?.version}</span>
          </p>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-3xl mx-auto mb-4">⚡</div>
          <p className="text-slate-400 text-sm mb-2">No steps found</p>
          <p className="text-slate-600 text-xs mb-5">Add steps first before configuring rules</p>
          <button type="button" onClick={() => navigate(`/workflows/${id}/steps`)}
            className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
            ← Go to Steps
          </button>
        </div>
      ) : (
        <div className="flex gap-5">
          {/* Step selector sidebar */}
          <div className="w-48 shrink-0 space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Steps</p>
            {steps.map((step) => {
              const cfg = TYPE_CONFIG[step.step_type] || TYPE_CONFIG.task;
              const isActive = String(step._id) === activeStepId;
              const ruleCount = step.rules?.length || 0;
              return (
                <button type="button" key={step._id}
                  onClick={() => setActiveStepId(String(step._id))}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                    isActive
                      ? 'bg-violet-600/20 border border-violet-500/40 text-white'
                      : 'bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="shrink-0">{cfg.icon}</span>
                  <span className="flex-1 truncate text-xs font-medium">{step.name}</span>
                  {ruleCount > 0 && (
                    <span className={`shrink-0 text-xs rounded-full w-4 h-4 flex items-center justify-center font-mono ${
                      isActive ? 'bg-violet-500 text-white' : 'bg-slate-700 text-slate-400'
                    }`}>{ruleCount}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Rule editor panel */}
          <div className="flex-1 min-w-0">
            {activeStep ? (
              <div className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800/50">
                  <span className="text-lg">{TYPE_CONFIG[activeStep.step_type]?.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{activeStep.name}</p>
                    <p className={`text-xs ${TYPE_CONFIG[activeStep.step_type]?.color}`}>{activeStep.step_type}</p>
                  </div>
                </div>
                <RuleEditor
                  step={activeStep}
                  allSteps={steps}
                  rules={activeStep.rules || []}
                  onChange={(rules) => handleRulesChange(activeStep._id, rules)}
                />
              </div>
            ) : (
              <div className="glass rounded-xl p-8 text-center text-slate-500 text-sm">
                Select a step to configure its rules
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between glass rounded-xl p-4 mt-5">
        <button type="button"
          onClick={() => navigate(`/workflows/${id}/steps`)}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors border border-slate-700"
        >
          ← Back to Steps
        </button>
        <button type="button"
          onClick={() => navigate('/workflows')}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Done — Go to Workflows ✓
        </button>
      </div>
    </div>
  );
}
