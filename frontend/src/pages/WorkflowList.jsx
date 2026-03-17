import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkflows, deleteWorkflow } from '../api/client.js';
import ExecuteModal from '../components/ExecuteModal.jsx';

const STATUS_DOT = {
  true: 'bg-emerald-400',
  false: 'bg-slate-500',
};

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [executing, setExecuting] = useState(null);
  const navigate = useNavigate();
  const limit = 10;

  async function load() {
    try {
      const res = await getWorkflows({ page, limit, search });
      setWorkflows(res.data.data);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => { load(); }, [page, search]);

  async function handleDelete(id) {
    if (!confirm('Delete this workflow?')) return;
    await deleteWorkflow(id);
    load();
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows</h1>
          <p className="text-slate-400 text-sm mt-1">{total} workflow{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => navigate('/workflows/new')}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-violet-900/30"
        >
          <span className="text-lg leading-none">+</span> New Workflow
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search workflows..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              {['ID', 'Name', 'Steps', 'Version', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {workflows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl">⚡</div>
                    <p className="text-slate-400">No workflows yet</p>
                    <button onClick={() => navigate('/workflows/new')} className="text-violet-400 text-sm hover:underline">Create your first workflow</button>
                  </div>
                </td>
              </tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf._id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{wf._id.slice(-8)}</td>
                <td className="px-5 py-4">
                  <span className="font-medium text-white">{wf.name}</span>
                  {wf.description && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{wf.description}</p>}
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md text-xs">
                    <span className="text-slate-500">⬡</span> {wf.step_count ?? 0}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className="text-slate-300 text-xs font-mono bg-slate-800 px-2 py-0.5 rounded">v{wf.version}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${wf.is_active ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[wf.is_active]}`} />
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/workflows/${wf._id}/edit`)}
                      className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExecuting(wf)}
                      className="px-3 py-1.5 rounded-md bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-medium transition-colors border border-violet-600/30"
                    >
                      ▶ Execute
                    </button>
                    <button
                      onClick={() => handleDelete(wf._id)}
                      className="px-3 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-1.5 mt-5 justify-end">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {executing && (
        <ExecuteModal
          workflow={executing}
          onClose={() => setExecuting(null)}
          onExecute={async (wf, inputData, triggeredBy) => {
            const { executeWorkflow } = await import('../api/client.js');
            const res = await executeWorkflow(wf._id, { data: inputData, triggered_by: triggeredBy });
            setExecuting(null);
            navigate(`/executions/${res.data._id}`);
          }}
        />
      )}
    </div>
  );
}
