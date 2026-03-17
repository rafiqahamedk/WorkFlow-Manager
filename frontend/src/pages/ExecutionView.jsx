import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getExecution, cancelExecution, retryExecution, approveStep } from '../api/client.js';

const STATUS_CONFIG = {
  pending:     { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  in_progress: { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     dot: 'bg-blue-400 animate-pulse' },
  completed:   { color: 'text-emerald-400',bg: 'bg-emerald-400/10 border-emerald-400/20',dot: 'bg-emerald-400' },
  failed:      { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',        dot: 'bg-red-400' },
  canceled:    { color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20',    dot: 'bg-slate-400' },
  skipped:     { color: 'text-slate-500',  bg: 'bg-slate-500/10 border-slate-500/20',    dot: 'bg-slate-500' },
};

const STEP_TYPE_ICON = { task: '⚙', approval: '✋', notification: '🔔' };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

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

  if (!execution) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const wf = execution.workflow_id;
  const isPendingApproval = execution.status === 'in_progress' &&
    execution.logs.some((l) => l.step_type === 'approval' && l.status === 'in_progress');

  const duration = execution.started_at && execution.ended_at
    ? `${((new Date(execution.ended_at) - new Date(execution.started_at)) / 1000).toFixed(1)}s`
    : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-300 transition-colors">Workflows</button>
        <span className="text-slate-700">/</span>
        <button onClick={() => navigate('/audit')} className="text-slate-500 hover:text-slate-300 transition-colors">Audit Log</button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 font-mono text-xs">{id.slice(-8)}</span>
      </div>

      {/* Header card */}
      <div className="glass rounded-xl p-6 mb-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">{wf?.name || 'Workflow'}</h1>
            <p className="text-slate-500 text-xs mt-1 font-mono">Execution ID: {execution._id}</p>
          </div>
          <StatusBadge status={execution.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Version', value: `v${execution.workflow_version}` },
            { label: 'Triggered By', value: execution.triggered_by },
            { label: 'Duration', value: duration || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-slate-500 mb-0.5">{label}</p>
              <p className="text-sm font-medium text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          {['pending', 'in_progress'].includes(execution.status) && (
            <button onClick={handleCancel} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors">
              Cancel
            </button>
          )}
          {execution.status === 'failed' && (
            <button onClick={handleRetry} className="px-3 py-1.5 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 text-sm transition-colors">
              ↺ Retry Failed Step
            </button>
          )}
        </div>
      </div>

      {/* Input data */}
      <div className="glass rounded-xl p-5 mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Input Data</p>
        <pre className="bg-slate-950/50 rounded-lg p-4 text-xs text-slate-300 overflow-auto font-mono leading-relaxed">
          {JSON.stringify(execution.data, null, 2)}
        </pre>
      </div>

      {/* Approval action */}
      {isPendingApproval && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✋</span>
            <p className="font-semibold text-amber-400">Approval Required</p>
          </div>
          <p className="text-slate-400 text-sm mb-4">This step requires manual approval to continue.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              placeholder="Your user ID"
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
            />
            <button onClick={() => handleApprove(true)} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
              ✓ Approve
            </button>
            <button onClick={() => handleApprove(false)} className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium transition-colors">
              ✕ Reject
            </button>
          </div>
        </div>
      )}

      {/* Step logs */}
      <div>
        <h2 className="text-base font-semibold text-white mb-3">Execution Logs</h2>
        {execution.logs.length === 0 && (
          <div className="glass rounded-xl p-8 text-center text-slate-500 text-sm">No logs yet.</div>
        )}
        <div className="space-y-3">
          {execution.logs.map((log, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{STEP_TYPE_ICON[log.step_type] || '⬡'}</span>
                  <div>
                    <span className="font-medium text-white text-sm">{log.step_name}</span>
                    <span className="text-slate-500 text-xs ml-2">{log.step_type}</span>
                  </div>
                </div>
                <StatusBadge status={log.status} />
              </div>

              <div className="px-5 py-4 space-y-3">
                {log.evaluated_rules?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Rules Evaluated</p>
                    <div className="space-y-1.5">
                      {log.evaluated_rules.map((r, j) => (
                        <div key={j} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg font-mono ${r.result ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800/50 text-slate-500'}`}>
                          <span className="mt-0.5 shrink-0">{r.result ? '✓' : '✗'}</span>
                          <span className="break-all">{r.rule}</span>
                          {r.error && <span className="text-red-400 ml-auto shrink-0">({r.error})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  {log.selected_next_step && (
                    <span>Next: <span className="text-slate-300 font-medium">{log.selected_next_step}</span></span>
                  )}
                  {log.approver_id && (
                    <span>Approver: <span className="text-slate-300">{log.approver_id}</span></span>
                  )}
                  {log.started_at && (
                    <span>Started: <span className="text-slate-300">{new Date(log.started_at).toLocaleTimeString()}</span></span>
                  )}
                  {log.ended_at && (
                    <span>Duration: <span className="text-slate-300">{((new Date(log.ended_at) - new Date(log.started_at)) / 1000).toFixed(2)}s</span></span>
                  )}
                </div>

                {log.error_message && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-xs">
                    {log.error_message}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
