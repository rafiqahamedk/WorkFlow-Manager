import React, { useState } from 'react';

const TYPES = ['string', 'number', 'boolean'];

const TYPE_COLORS = {
  string: 'text-cyan-400 bg-cyan-400/10',
  number: 'text-violet-400 bg-violet-400/10',
  boolean: 'text-amber-400 bg-amber-400/10',
};

export default function InputSchemaEditor({ schema, onChange }) {
  const [newField, setNewField] = useState({ name: '', type: 'string', required: false, allowed_values: '' });

  const fields = Object.entries(schema || {});

  function addField() {
    if (!newField.name.trim()) return;
    const entry = { type: newField.type, required: newField.required };
    if (newField.allowed_values.trim()) {
      entry.allowed_values = newField.allowed_values.split(',').map((v) => v.trim());
    }
    onChange({ ...schema, [newField.name.trim()]: entry });
    setNewField({ name: '', type: 'string', required: false, allowed_values: '' });
  }

  function removeField(name) {
    const updated = { ...schema };
    delete updated[name];
    onChange(updated);
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Input Schema</label>

      {fields.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {fields.map(([name, def]) => (
            <div key={name} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2.5">
              <span className="font-mono text-sm text-white font-medium">{name}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[def.type] || 'text-slate-400 bg-slate-700'}`}>{def.type}</span>
              {def.required && <span className="text-xs text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">required</span>}
              {def.allowed_values && (
                <span className="text-xs text-slate-500">[{def.allowed_values.join(', ')}]</span>
              )}
              <button type="button" onClick={() => removeField(name)} className="ml-auto text-slate-600 hover:text-red-400 transition-colors text-sm">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 space-y-2">
        <p className="text-xs text-slate-500 font-medium">Add Field</p>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder="Field name"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 w-36"
          />
          <select
            value={newField.type}
            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
          >
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
              className="accent-violet-500"
            />
            Required
          </label>
          <input
            placeholder="Allowed values (comma-sep)"
            value={newField.allowed_values}
            onChange={(e) => setNewField({ ...newField, allowed_values: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 flex-1 min-w-0"
          />
          <button
            type="button"
            onClick={addField}
            className="bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
