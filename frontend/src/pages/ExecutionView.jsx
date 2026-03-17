import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExecution, cancelExecution, retryExecution, approveStep } from '../api/client.js';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-200 text-gray-600',
};

export default function ExecutionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [execution, setExecution] = useState(null);
  const [approver, setApprover] = useState('');

  async function load() {
    const res = await getExecution(id);
    setExecution(res.data);
  }

  useEffect(() => { load(); }, [id]);

  async function handleCancel() {
    await cancelExecution(id);
    load();
  }

  async function handleRetry() {
    await retryExecution(id);
    load();
  }

  async function handleApprove(approved) {
    await approveStep(id, { approver_id: approver || 'anonymous', approved });
    load();
  }

  if (!execution) return <div className="text-gray-400">Loading...</div>;

  const wf = execution.workflow_id;
  const isPendingApproval = execution.status === 'in_progress' &&
    execution.logs.some((l) => l.step_type === 'approval' && l.status === 'in_progress');

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/')} className="text-indigo-600 hover:underline text-sm mb-4 block">← Back</button>

      <div className="bg-white rounded shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold">{wf?.name || 'Workflow'} — Execution</h1>
            <p className="text-xs text-gray-400 mt-1">ID: {execution._id}</p>
            <p className="text-sm text-gray-500 mt-1">Version: v{execution.workflow_version} · Triggered by: {execution.triggered_by}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[execution.status]}`}>
            {execution.status}
          </span>
        </div>

        <div className="mt-4 flex gap-3">
          {['pending', 'in_progress'].includes(execution.status) && (
            <button onClick={handleCancel} className="bg-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300">Cancel</button>
          )}
          {execution.status === 'failed' && (
            <button onClick={handleRetry} className="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm hover:bg-yellow-600">Retry</button>
          )}
        </div>

        {/* Input Data */}
        <div className="mt-4">
          <p className="text-sm font-medium mb-1">Input Data</p>
          <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto">{JSON.stringify(execution.data, null, 2)}</pre>
        </div>
      </div>

      {/* Approval Action */}
      {isPendingApproval && (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-6">
          <p className="font-medium text-yellow-800 mb-2">Approval Required</p>
          <input
            placeholder="Your user ID"
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm mr-2 w-48"
          />
          <button onClick={() => handleApprove(true)} className="bg-green-600 text-white px-3 py-1.5 rounded text-sm mr-2 hover:bg-green-700">Approve</button>
          <button onClick={() => handleApprove(false)} className="bg-red-500 text-white px-3 py-1.5 rounded text-sm hover:bg-red-600">Reject</button>
        </div>
      )}

      {/* Step Logs */}
      <h2 className="text-lg font-semibold mb-3">Execution Logs</h2>
      {execution.logs.length === 0 && <p className="text-gray-400 text-sm">No logs yet.</p>}
      <div className="space-y-3">
        {execution.logs.map((log, i) => (
          <div key={i} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">[Step {i + 1}] {log.step_name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}>{log.status}</span>
            </div>
            <p className="text-xs text-gray-500 mb-2">Type: {log.step_type} · Approver: {log.approver_id || '—'}</p>
            {log.evaluated_rules?.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium mb-1">Rules Evaluated:</p>
                {log.evaluated_rules.map((r, j) => (
                  <div key={j} className={`text-xs px-2 py-1 rounded mb-1 ${r.result ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {r.rule} → {r.result ? 'true' : 'false'}
                    {r.error && <span className="ml-2 text-red-500">({r.error})</span>}
                  </div>
                ))}
              </div>
            )}
            {log.selected_next_step && (
              <p className="text-xs text-gray-600">Next Step: <span className="font-medium">{log.selected_next_step}</span></p>
            )}
            {log.error_message && (
              <p className="text-xs text-red-500 mt-1">Error: {log.error_message}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {log.started_at && `Started: ${new Date(log.started_at).toLocaleTimeString()}`}
              {log.ended_at && ` · Ended: ${new Date(log.ended_at).toLocaleTimeString()}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
