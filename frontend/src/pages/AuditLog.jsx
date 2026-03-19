import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExecutions } from '../api/client.js';

const STATUS_CONFIG = {
  pending:     { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', dot: 'bg-yellow-400' },
  in_progress: { color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20',     dot: 'bg-blue-400 animate-pulse' },
  completed:   { color: 'text-emerald-400',bg: 'bg-emerald-400/10 border-emerald-400/20',dot: 'bg-emerald-400' },
  failed:      { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',        dot: 'bg-red-400' },
  canceled:    { color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20',    dot: 'bg-slate-400' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export default function AuditLog() {
  const [executions, setExecutions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const limit = 10;

  useEffect(() => {
    getExecutions({ page, limit }).then((res) => {
      setExecutions(res.data.data);
      setTotal(res.data.total);
    });
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const stats = {
    total,
    completed: executions.filter((e) => e.status === 'completed').length,
    failed: executions.filter((e) => e.status === 'failed').length,
    running: executions.filter((e) => e.status === 'in_progress').length,
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <p className="text-slate-400 text-sm mt-1">Track all workflow executions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: total, color: 'text-white' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
          { label: 'Failed', value: stats.failed, color: 'text-red-400' },
          { label: 'Running', value: stats.running, color: 'text-blue-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl px-5 py-4">
            <p className="text-xs text-slate-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['Execution ID', 'Workflow', 'Version', 'Status', 'Started By', 'Start Time', 'End Time', ''].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {executions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl">📋</div>
                    <p className="text-slate-400">No executions yet</p>
                  </div>
                </td>
              </tr>
            )}
            {executions.map((ex) => (
              <tr key={ex._id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{ex._id.slice(-8)}</td>
                <td className="px-5 py-4 font-medium text-slate-200">{ex.workflow_id?.name || '—'}</td>
                <td className="px-5 py-4">
                  <span className="font-mono text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">v{ex.workflow_version}</span>
                </td>
                <td className="px-5 py-4"><StatusBadge status={ex.status} /></td>
                <td className="px-5 py-4 text-slate-400 text-xs">{ex.triggered_by}</td>
                <td className="px-5 py-4 text-slate-400 text-xs">{ex.started_at ? new Date(ex.started_at).toLocaleString() : '—'}</td>
                <td className="px-5 py-4 text-slate-400 text-xs">{ex.ended_at ? new Date(ex.ended_at).toLocaleString() : '—'}</td>
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => navigate(`/executions/${ex._id}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    View Logs →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-1.5 mt-5 justify-end">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} type="button" onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
