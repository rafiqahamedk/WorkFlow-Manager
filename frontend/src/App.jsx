import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import WorkflowList from './pages/WorkflowList.jsx';
import WorkflowEditor from './pages/WorkflowEditor.jsx';
import ExecutionView from './pages/ExecutionView.jsx';
import AuditLog from './pages/AuditLog.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-indigo-700 text-white px-6 py-3 flex gap-6 items-center shadow">
        <span className="font-bold text-lg tracking-tight">Workflow Manager</span>
        <NavLink to="/" end className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Workflows</NavLink>
        <NavLink to="/audit" className={({ isActive }) => isActive ? 'underline' : 'hover:underline'}>Audit Log</NavLink>
      </nav>
      <main className="flex-1 p-6">
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
