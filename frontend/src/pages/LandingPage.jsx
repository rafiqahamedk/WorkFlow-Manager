import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">W</div>
          <span className="text-white font-semibold text-lg tracking-tight">WorkFlow Manager</span>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/signin')} className="px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors">
            Sign In
          </button>
          <button type="button" onClick={() => navigate('/signup')} className="px-4 py-2 text-sm text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors">
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Workflow Automation Platform
        </div>

        <h1 className="text-5xl font-bold text-white mb-4 leading-tight max-w-2xl">
          Build and automate your{' '}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            workflows
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-xl mb-10">
          Design multi-step workflows with conditional rules, approval gates, and real-time execution tracking — all in one place.
        </p>

        <div className="flex gap-4">
          <button type="button" onClick={() => navigate('/signup')} className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-colors text-sm">
            Get Started Free
          </button>
          <button type="button" onClick={() => navigate('/signin')} className="px-6 py-3 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium rounded-xl transition-colors text-sm">
            Sign In
          </button>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 max-w-3xl w-full">
          {[
            { icon: '⚡', title: 'Rule Engine', desc: 'Conditional branching with AND/OR logic, comparisons, and string functions.' },
            { icon: '🔒', title: 'Approval Gates', desc: 'Pause execution for human approval before proceeding to the next step.' },
            { icon: '📊', title: 'Audit Logs', desc: 'Full execution history with per-step rule evaluation results.' },
          ].map((f) => (
            <div key={f.title} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 text-left">
              <div className="text-2xl mb-3">{f.icon}</div>
              <div className="text-white font-medium text-sm mb-1">{f.title}</div>
              <div className="text-slate-400 text-xs leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
