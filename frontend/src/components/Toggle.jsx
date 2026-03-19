import React from 'react';

/**
 * Toggle — a clean, accessible switch component.
 * Props:
 *   checked  : boolean
 *   onChange : (newValue: boolean) => void
 *   label    : optional string override (defaults to "Active" / "Inactive")
 */
export default function Toggle({ checked, onChange, label }) {
  const displayLabel = label ?? (checked ? 'Active' : 'Inactive');

  return (
    <div className="flex items-center gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex items-center
          w-12 h-6 rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          ${checked ? 'bg-violet-600' : 'bg-slate-700'}
        `}
      >
        {/* Knob */}
        <span
          aria-hidden="true"
          className={`
            inline-block w-4 h-4 rounded-full bg-white shadow-md
            transform transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-7' : 'translate-x-1'}
          `}
        />
      </button>

      {/* Label */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-200 ${
            checked ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
        />
        <span
          className={`text-sm font-medium transition-colors duration-200 ${
            checked ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          {displayLabel}
        </span>
        <span className="text-xs text-slate-600">
          {checked ? '— workflow can be executed' : '— workflow is disabled'}
        </span>
      </div>
    </div>
  );
}
