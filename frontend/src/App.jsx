import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import WorkflowList from './pages/WorkflowList.jsx';
import WorkflowEditor from './pages/WorkflowEditor.jsx';
import ExecutionView from './pages/ExecutionView.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      {/* Top nav */}
      <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">W</div>
            <span className="font-semibold text-white tracking-tight">WorkFlow Manager</span>
          </div>
          <div className="flex gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`
              }
            >
              Workflows
            </NavLink>
            <NavLink
              to="/audit"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`
              }
            >
              Audit Log
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <Routes>
          <Route path="/" element={<WorkflowList />} />
          <Route path="/workflows/new" element={<WorkflowEditor />} />
          <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
          <Route path="/executions/:id" element={<ExecutionView />} />
          <Route path="/audit" element={<AuditLog />} />
        </Routes>
      </main>
    </div>
  );
}
