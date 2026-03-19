import React, { useState, useRef, useEffect } from 'react';

const STEP_TYPES = [
  {
    value: 'task',
    icon: '⚙',
    label: 'Task',
    desc: 'Automated or manual action (e.g. update database, generate report)',
    idle: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10',
    selected: 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500',
    iconBg: 'bg-blue-500/20 text-blue-400',
    labelColor: 'text-blue-300',
  },
  {
    value: 'approval',
    icon: '✋',
    label: 'Approval',
    desc: 'Pauses execution and waits for a user to approve or reject',
    idle: 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10',
    selected: 'border-purple-500 bg-purple-500/15 ring-1 ring-purple-500',
    iconBg: 'bg-purple-500/20 text-purple-400',
    labelColor: 'text-purple-300',
  },
  {
    value: 'notification',
    icon: '🔔',
    label: 'Notification',
    desc: 'Sends an alert or message (email, Slack, UI)',
    idle: 'border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/10',
    selected: 'border-orange-500 bg-orange-500/15 ring-1 ring-orange-500',
    iconBg: 'bg-orange-500/20 text-orange-400',
    labelColor: 'text-orange-300',
  },
];

export default function AddStepModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [stepType, setStepType] = useState('task');
  const [approverEmail, setApproverEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const needsEmail = stepType === 'approval' || stepType === 'notification';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Step name is required');
    if (stepType === 'approval' && !approverEmail.trim()) return setError('Approver email is required for approval steps');
    if (stepType === 'notification' && !approverEmail.trim()) return setError('Notify email is required for notification steps');
    setLoading(true);
    try {
      await onAdd({ name: name.trim(), step_type: stepType, approver_email: needsEmail ? approverEmail.trim() : null });
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
            type="button"
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
                    stepType === t.value ? t.selected : t.idle
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${t.iconBg}`}>
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${stepType === t.value ? t.labelColor : 'text-slate-300'}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{t.desc}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    stepType === t.value ? 'border-violet-500 bg-violet-500' : 'border-slate-600'
                  }`}>
                    {stepType === t.value && <span className="text-white text-xs leading-none">✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Email field — approval needs approver, notification needs recipient */}
          {stepType === 'approval' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Approver Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => { setApproverEmail(e.target.value); setError(''); }}
                placeholder="approver@example.com"
                className="w-full bg-slate-800 border border-purple-500/40 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors text-sm"
              />
              <p className="text-xs text-slate-500 mt-1.5">An approval email with Accept/Decline links will be sent to this address.</p>
            </div>
          )}

          {stepType === 'notification' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Notify Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => { setApproverEmail(e.target.value); setError(''); }}
                placeholder="recipient@example.com"
                className="w-full bg-slate-800 border border-orange-500/40 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
              />
              <p className="text-xs text-slate-500 mt-1.5">A notification email will be sent to this address when this step executes.</p>
            </div>
          )}

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
