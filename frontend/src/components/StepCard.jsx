import React, { useState } from 'react';
import RuleEditor from './RuleEditor.jsx';

const TYPE_CONFIG = {
  task:         { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',   icon: '⚙' },
  approval:     { color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', icon: '✋' },
  notification: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: '🔔' },
};

export default function StepCard({ step, index, allSteps, onDelete, onUpdate, onRulesChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: step.name, step_type: step.step_type, order: step.order, approver_email: step.approver_email || '', metadata: step.metadata || {} });
  const [showRules, setShowRules] = useState(false);

  const cfg = TYPE_CONFIG[step.step_type] || TYPE_CONFIG.task;

  async function handleSave() {
    await onUpdate(step._id, form);
    setEditing(false);
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
          {index + 1}
        </div>

        {editing ? (
          <div className="flex gap-2 flex-1 flex-wrap items-center">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 flex-1 min-w-0"
              autoFocus
            />
            <select
              value={form.step_type}
              onChange={(e) => setForm({ ...form, step_type: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
            >
              {['task', 'approval', 'notification'].map((t) => <option key={t}>{t}</option>)}
            </select>
            {form.step_type === 'approval' && (
              <input
                type="email"
                value={form.approver_email}
                onChange={(e) => setForm({ ...form, approver_email: e.target.value })}
                placeholder="approver@example.com"
                className="bg-slate-800 border border-purple-500/40 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-52"
              />
            )}
            <button type="button" onClick={handleSave} className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Cancel</button>
          </div>
        ) : (
          <>
            <span className="text-lg">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-white text-sm">{step.name}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
              {step.step_type}
            </span>
            {step.step_type === 'approval' && step.approver_email && (
              <span className="text-xs text-purple-400/70 font-mono hidden sm:block truncate max-w-[160px]" title={step.approver_email}>
                ✉ {step.approver_email}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowRules(!showRules)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showRules ? 'bg-violet-600/20 text-violet-400 border border-violet-600/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              Rules
              <span className="bg-slate-700 text-slate-300 rounded-full w-4 h-4 flex items-center justify-center text-xs">
                {step.rules?.length || 0}
              </span>
            </button>
            <button type="button" onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors text-sm">✎</button>
            <button type="button" onClick={() => onDelete(step._id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors text-sm">✕</button>
          </>
        )}
      </div>

      {/* Rules panel */}
      {showRules && (
        <div className="border-t border-slate-800/50 bg-slate-900/30 px-5 py-4">
          <RuleEditor
            step={step}
            allSteps={allSteps}
            rules={step.rules || []}
            onChange={(rules) => onRulesChange(step._id, rules)}
          />
        </div>
      )}
    </div>
  );
}
