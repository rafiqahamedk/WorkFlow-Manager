import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkflow, createWorkflow, updateWorkflow } from '../api/client.js';
import InputSchemaEditor from '../components/InputSchemaEditor.jsx';
import Toggle from '../components/Toggle.jsx';

const emptyWorkflow = { name: '', description: '', input_schema: {}, is_active: true };

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

export default function WorkflowEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [form, setForm] = useState(emptyWorkflow);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew) {
      getWorkflow(id).then((res) => {
        const { steps: _s, ...wf } = res.data;
        setForm(wf);
      });
    }
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isNew) {
        const res = await createWorkflow(form);
        navigate(`/workflows/${res.data._id}/steps`);
      } else {
        await updateWorkflow(id, form);
        navigate(`/workflows/${id}/steps`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button type="button" onClick={() => navigate('/workflows')} className="text-slate-500 hover:text-slate-300 transition-colors">
          Workflows
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300">{isNew ? 'New Workflow' : form.name || 'Edit'}</span>
      </div>

      <ProgressBar step={1} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">{isNew ? 'New Workflow' : 'Edit Workflow'}</h1>
        {!isNew && (
          <span className="text-xs font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded">v{form.version}</span>
        )}
      </div>

      <form onSubmit={handleSave} className="glass rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Workflow Name *
          </label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
            placeholder="e.g. Expense Approval"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm resize-none"
            rows={2}
            placeholder="Optional description..."
          />
        </div>

        <Toggle
          checked={!!form.is_active}
          onChange={(val) => setForm({ ...form, is_active: val })}
        />

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
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : isNew ? 'Create Workflow' : 'Save Changes'}
          </button>

          <button type="button" onClick={() => navigate('/workflows')} className="text-slate-500 hover:text-slate-300 text-sm transition-colors ml-auto">
            Cancel
          </button>
        </div>
      </form>

    </div>
  );
}
