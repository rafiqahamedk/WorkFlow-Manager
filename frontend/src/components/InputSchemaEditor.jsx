import React, { useState } from 'react';

const TYPES = ['string', 'number', 'boolean'];

export default function InputSchemaEditor({ schema, onChange }) {
  const [newField, setNewField] = useState({ name: '', type: 'string', required: false, allowed_values: '' });

  const fields = Object.entries(schema || {});

  function addField() {
    if (!newField.name.trim()) return;
    const entry = {
      type: newField.type,
      required: newField.required,
    };
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
      <label className="block text-sm font-medium mb-2">Input Schema</label>
      {fields.length > 0 && (
        <div className="mb-3 space-y-1">
          {fields.map(([name, def]) => (
            <div key={name} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm">
              <span className="font-mono font-medium">{name}</span>
              <span className="text-gray-500">{def.type}</span>
              {def.required && <span className="text-red-500 text-xs">required</span>}
              {def.allowed_values && <span className="text-gray-400 text-xs">[{def.allowed_values.join(', ')}]</span>}
              <button onClick={() => removeField(name)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 flex-wrap items-end">
        <input
          placeholder="Field name"
          value={newField.name}
          onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm w-32"
        />
        <select
          value={newField.type}
          onChange={(e) => setNewField({ ...newField, type: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm"
        >
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={newField.required} onChange={(e) => setNewField({ ...newField, required: e.target.checked })} />
          Required
        </label>
        <input
          placeholder="Allowed values (comma-sep)"
          value={newField.allowed_values}
          onChange={(e) => setNewField({ ...newField, allowed_values: e.target.value })}
          className="border rounded px-2 py-1.5 text-sm w-48"
        />
        <button onClick={addField} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700">Add Field</button>
      </div>
    </div>
  );
}
