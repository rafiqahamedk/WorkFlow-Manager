import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExecutions } from '../api/client.js';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-200 text-gray-600',
};

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

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Audit Log</h1>
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              {['Execution ID', 'Workflow', 'Version', 'Status', 'Started By', 'Start Time', 'End Time', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {executions.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-400">No executions yet</td></tr>
            )}
            {executions.map((ex) => (
              <tr key={ex._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{ex._id.slice(-8)}</td>
                <td className="px-4 py-3">{ex.workflow_id?.name || '—'}</td>
                <td className="px-4 py-3">v{ex.workflow_version}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ex.status]}`}>
                    {ex.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">{ex.triggered_by}</td>
                <td className="px-4 py-3 text-xs">{ex.started_at ? new Date(ex.started_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-xs">{ex.ended_at ? new Date(ex.ended_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => navigate(`/executions/${ex._id}`)} className="text-indigo-600 hover:underline text-xs">View Logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-end">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded border ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
