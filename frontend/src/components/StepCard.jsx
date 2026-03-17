import React, { useState } from 'react';
import RuleEditor from './RuleEditor.jsx';

const TYPE_COLORS = {
  task: 'bg-blue-100 text-blue-700',
  approval: 'bg-purple-100 text-purple-700',
  notification: 'bg-orange-100 text-orange-700',
};

export default function StepCard({ step, allSteps, onDelete, onUpdate, onRulesChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: step.name, step_type: step.step_type, order: step.order, metadata: step.metadata || {} });
  const [showRules, setShowRules] = useState(false);

  async function handleSave() {
    await onUpdate(step._id, form);
    setEditing(false);
  }

  return (
    <div className="bg-white rounded shadow border border-gray-100">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-gray-400 font-mono text-sm">#{step.order + 1}</span>
        {editing ? (
          <div className="flex gap-2 flex-1 flex-wrap items-center">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border rounded px-2 py-1 text-sm flex-1 min-w-0"
            />
            <select
              value={form.step_type}
              onChange={(e) => setForm({ ...form, step_type: e.target.value })}
              className="border rounded px-2 py-1 text-sm"
            >
              {['task', 'approval', 'notification'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <button onClick={handleSave} className="bg-indigo-600 text-white px-3 py-1 rounded text-sm">Save</button>
            <button onClick={() => setEditing(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        ) : (
          <>
            <span className="font-medium flex-1">{step.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[step.step_type]}`}>{step.step_type}</span>
            <button onClick={() => setShowRules(!showRules)} className="text-indigo-600 text-sm hover:underline">
              Rules ({step.rules?.length || 0})
            </button>
            <button onClick={() => setEditing(true)} className="text-gray-500 text-sm hover:underline">Edit</button>
            <button onClick={() => onDelete(step._id)} className="text-red-400 text-sm hover:underline">Delete</button>
          </>
        )}
      </div>

      {showRules && (
        <div className="border-t px-4 py-3">
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
