import React, { useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createRule, updateRule, deleteRule } from '../api/client.js';

function SortableRule({ rule, allSteps, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rule._id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const nextStep = allSteps.find((s) => String(s._id) === String(rule.next_step_id));
  const isDefault = rule.condition.trim().toUpperCase() === 'DEFAULT';

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/30 rounded-lg px-3 py-2.5 group">
      <span {...attributes} {...listeners} className="cursor-grab text-slate-600 hover:text-slate-400 select-none text-base">⠿</span>
      <span className="w-5 h-5 rounded bg-slate-700 text-slate-400 text-xs flex items-center justify-center font-mono shrink-0">{rule.priority}</span>
      <span className={`flex-1 font-mono text-xs truncate ${isDefault ? 'text-amber-400' : 'text-slate-300'}`}>{rule.condition}</span>
      <span className="text-slate-600 text-xs shrink-0">→</span>
      <span className="text-xs text-slate-400 shrink-0 max-w-[120px] truncate">
        {nextStep ? nextStep.name : rule.next_step_id ? '?' : <span className="text-slate-600">END</span>}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(rule)} className="text-violet-400 hover:text-violet-300 text-xs px-2 py-1 rounded bg-violet-400/10 transition-colors">Edit</button>
        <button onClick={() => onDelete(rule._id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-400/10 transition-colors">✕</button>
      </div>
    </div>
  );
}

const emptyRule = { condition: '', next_step_id: '', priority: 1 };

export default function RuleEditor({ step, allSteps, rules, onChange }) {
  const [form, setForm] = useState(emptyRule);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));
  const otherSteps = allSteps.filter((s) => String(s._id) !== String(step._id));

  async function handleSave() {
    setError('');
    if (!form.condition.trim()) return setError('Condition is required');
    try {
      const payload = {
        condition: form.condition,
        next_step_id: form.next_step_id || null,
        priority: Number(form.priority),
      };
      if (editingId) {
        const res = await updateRule(editingId, payload);
        onChange(rules.map((r) => (r._id === editingId ? res.data : r)));
      } else {
        const res = await createRule(step._id, payload);
        onChange([...rules, res.data]);
      }
      setForm(emptyRule);
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  async function handleDelete(ruleId) {
    await deleteRule(ruleId);
    onChange(rules.filter((r) => r._id !== ruleId));
  }

  function handleEdit(rule) {
    setEditingId(rule._id);
    setForm({ condition: rule.condition, next_step_id: rule.next_step_id || '', priority: rule.priority });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rules.findIndex((r) => r._id === active.id);
    const newIndex = rules.findIndex((r) => r._id === over.id);
    const reordered = arrayMove(rules, oldIndex, newIndex).map((r, i) => ({ ...r, priority: i + 1 }));
    onChange(reordered);
    await Promise.all(reordered.map((r) => updateRule(r._id, { condition: r.condition, next_step_id: r.next_step_id, priority: r.priority })));
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rules — {step.name}</p>
        <p className="text-xs text-slate-600">Drag to reorder priority</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((r) => r._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5 mb-4">
            {sorted.length === 0 && (
              <p className="text-xs text-slate-600 py-2 text-center">No rules yet. Add one below.</p>
            )}
            {sorted.map((rule) => (
              <SortableRule key={rule._id} rule={rule} allSteps={allSteps} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add/Edit form */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400">{editingId ? '✎ Edit Rule' : '+ Add Rule'}</p>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder='e.g. amount > 100 && country == "US"  or  DEFAULT'
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 flex-1 min-w-0 font-mono"
          />
          <input
            type="number"
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 w-20"
          />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <label className="text-xs text-slate-500 shrink-0">Next Step:</label>
          <select
            value={form.next_step_id}
            onChange={(e) => setForm({ ...form, next_step_id: e.target.value })}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 flex-1"
          >
            <option value="">— End Workflow —</option>
            {otherSteps.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {editingId ? 'Update' : 'Add Rule'}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setForm(emptyRule); }} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Cancel</button>
          )}
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    </div>
  );
}
