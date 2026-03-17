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

    // Validate required fields
    for (const [key, def] of fields) {
      if (def.required && (values[key] === undefined || values[key] === '')) {
        return setError(`Field "${key}" is required`);
      }
    }

    // Coerce types
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-1">Execute: {workflow.name}</h2>
        <p className="text-sm text-gray-500 mb-4">v{workflow.version}</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Triggered By</label>
            <input
              placeholder="user ID (optional)"
              value={triggeredBy}
              onChange={(e) => setTriggeredBy(e.target.value)}
              className="border rounded px-3 py-2 w-full text-sm"
            />
          </div>

          {fields.map(([key, def]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">
                {key} <span className="text-gray-400 font-normal">({def.type})</span>
                {def.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {def.allowed_values ? (
                <select
                  value={values[key] || ''}
                  onChange={(e) => setValue(key, e.target.value)}
                  className="border rounded px-3 py-2 w-full text-sm"
                >
                  <option value="">Select...</option>
                  {def.allowed_values.map((v) => <option key={v}>{v}</option>)}
                </select>
              ) : def.type === 'boolean' ? (
                <select
                  value={values[key] || ''}
                  onChange={(e) => setValue(key, e.target.value)}
                  className="border rounded px-3 py-2 w-full text-sm"
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
                  className="border rounded px-3 py-2 w-full text-sm"
                  placeholder={`Enter ${key}`}
                />
              )}
            </div>
          ))}

          {fields.length === 0 && (
            <p className="text-sm text-gray-400">This workflow has no input schema defined.</p>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex-1"
            >
              {loading ? 'Starting...' : 'Start Execution'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
