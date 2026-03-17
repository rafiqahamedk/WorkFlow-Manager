import React, { useState } from 'react';

export default function ExecuteModal({ workflow, onClose, onExecute }) {
  const schema = workflow.input_schema || {};
  const fields = Object.entries(schema);
  const [values, setValues] = useState({});
  const [triggeredBy, setTriggeredBy] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function setValue(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    for (const [key, def] of fields) {
      if (def.required && (values[key] === undefined || values[key] === '')) {
        return setError(`"${key}" is required`);
      }
    }
    const coerced = {};
    for (const [key, def] of fields) {
      if (values[key] !== undefined && values[key] !== '') {
        coerced[key] = def.type === 'number' ? Number(values[key]) : def.type === 'boolean' ? values[key] === 'true' : values[key];
      }
    }
    setLoading(true);
    try {
      await onExecute(workflow, coerced, triggeredBy || 'anonymous');
    } catch (err) {
      setError(err.response?.data?.error || 'Execution failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-semibold text-white">Execute Workflow</h2>
            <p className="text-slate-500 text-xs mt-0.5">{workflow.name} · v{workflow.version}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Triggered By</label>
            <input
              placeholder="user ID (optional)"
              value={triggeredBy}
              onChange={(e) => setTriggeredBy(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {fields.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Input Data</p>
              {fields.map(([key, def]) => (
                <div key={key}>
                  <label className="flex items-center gap-2 text-sm text-slate-300 mb-1.5">
                    <span className="font-medium">{key}</span>
                    <span className="text-xs text-slate-600 font-mono">{def.type}</span>
                    {def.required && <span className="text-red-400 text-xs">*</span>}
                  </label>
                  {def.allowed_values ? (
                    <select
                      value={values[key] || ''}
                      onChange={(e) => setValue(key, e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Select...</option>
                      {def.allowed_values.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  ) : def.type === 'boolean' ? (
                    <select
                      value={values[key] || ''}
                      onChange={(e) => setValue(key, e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="">Select...</option>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : (
                    <input
                      type={def.type === 'number' ? 'number' : 'text'}
                      value={values[key] || ''}
                      onChange={(e) => setValue(key, e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                      placeholder={`Enter ${key}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {fields.length === 0 && (
            <p className="text-sm text-slate-500 bg-slate-800/50 rounded-lg px-4 py-3">No input schema defined for this workflow.</p>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 shadow-lg shadow-violet-900/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : '▶ Start Execution'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
