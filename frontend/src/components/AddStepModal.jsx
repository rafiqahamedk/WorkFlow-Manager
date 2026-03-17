import React, { useState, useRef, useEffect } from 'react';

const STEP_TYPES = [
  {
    value: 'task',
    icon: '⚙',
    label: 'Task',
    desc: 'Automated or manual action (e.g. update database, generate report)',
    color: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
    selected: 'border-blue-500 bg-blue-500/20 ring-1 ring-blue-500',
  },
  {
    value: 'approval',
    icon: '✋',
    label: 'Approval',
    desc: 'Pauses execution and waits for a user to approve or reject',
    color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
    selected: 'border-purple-500 bg-purple-500/20 ring-1 ring-purple-500',
  },
  {
    value: 'notification',
    icon: '🔔',
    label: 'Notification',
    desc: 'Sends an alert or message (email, Slack, UI)',
    color: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    selected: 'border-orange-500 bg-orange-500/20 ring-1 ring-orange-500',
  },
];

export default function AddStepModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [stepType, setStepType] = useState('task');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Step name is required');
    setLoading(true);
    try {
      await onAdd({ name: name.trim(), step_type: stepType });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add step');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Add Step</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Step name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Step Name *
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. Manager Approval"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            />
          </div>

          {/* Step type selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Step Type *
            </label>
            <div className="space-y-2">
              {STEP_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setStepType(t.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                    stepType === t.value ? t.selected : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xl shrink-0">{t.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${stepType === t.value ? '' : 'text-slate-300'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{t.desc}</p>
                  </div>
                  {stepType === t.value && (
                    <span className="ml-auto text-xs shrink-0">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </span>
              ) : 'Add Step'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
