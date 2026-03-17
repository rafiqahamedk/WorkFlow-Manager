import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createRule, updateRule, deleteRule } from '../api/client.js';

function SortableRule({ rule, allSteps, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: rule._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const nextStep = allSteps.find((s) => String(s._id) === String(rule.next_step_id));

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 text-sm border">
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400 select-none">⠿</span>
      <span className="w-6 text-center font-mono text-gray-500">{rule.priority}</span>
      <span className="flex-1 font-mono text-xs">{rule.condition}</span>
      <span className="text-gray-500 text-xs">→ {nextStep ? nextStep.name : rule.next_step_id ? '?' : 'END'}</span>
      <button onClick={() => onEdit(rule)} className="text-indigo-500 text-xs hover:underline">Edit</button>
      <button onClick={() => onDelete(rule._id)} className="text-red-400 text-xs hover:underline">✕</button>
    </div>
  );
}

const emptyRule = { condition: '', next_step_id: '', priority: 1 };

export default function RuleEditor({ step, allSteps, rules, onChange }) {
  const [form, setForm] = useState(emptyRule);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

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
    // Persist new priorities
    await Promise.all(reordered.map((r) => updateRule(r._id, { condition: r.condition, next_step_id: r.next_step_id, priority: r.priority })));
  }

  const otherSteps = allSteps.filter((s) => String(s._id) !== String(step._id));

  return (
    <div>
      <p className="text-sm font-medium mb-2">Rules for: {step.name}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rules.map((r) => r._id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1 mb-3">
            {rules.length === 0 && <p className="text-xs text-gray-400">No rules yet. Add one below.</p>}
            {[...rules].sort((a, b) => a.priority - b.priority).map((rule) => (
              <SortableRule
                key={rule._id}
                rule={rule}
                allSteps={allSteps}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add/Edit form */}
      <div className="bg-indigo-50 rounded p-3 space-y-2">
        <p className="text-xs font-medium text-indigo-700">{editingId ? 'Edit Rule' : 'Add Rule'}</p>
        <div className="flex gap-2 flex-wrap">
          <input
            placeholder='Condition (e.g. amount > 100 && country == "US") or DEFAULT'
            value={form.condition}
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
            className="border rounded px-2 py-1.5 text-sm flex-1 min-w-0"
          />
          <input
            type="number"
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="border rounded px-2 py-1.5 text-sm w-20"
          />
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-600">Next Step:</label>
          <select
            value={form.next_step_id}
            onChange={(e) => setForm({ ...form, next_step_id: e.target.value })}
            className="border rounded px-2 py-1.5 text-sm flex-1"
          >
            <option value="">— End Workflow —</option>
            {otherSteps.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <button onClick={handleSave} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700">
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button onClick={() => { setEditingId(null); setForm(emptyRule); }} className="text-gray-500 text-sm">Cancel</button>
          )}
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
    </div>
  );
}
