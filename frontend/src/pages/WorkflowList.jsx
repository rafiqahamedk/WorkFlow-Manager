import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkflows, deleteWorkflow, executeWorkflow } from '../api/client.js';
import ExecuteModal from '../components/ExecuteModal.jsx';

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [executing, setExecuting] = useState(null); // workflow to execute
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

  async function handleExecute(workflow, inputData, triggeredBy) {
    const res = await executeWorkflow(workflow._id, { data: inputData, triggered_by: triggeredBy });
    setExecuting(null);
    navigate(`/executions/${res.data._id}`);
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Workflows</h1>
        <button
          onClick={() => navigate('/workflows/new')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          + Create Workflow
        </button>
      </div>

      <input
        type="text"
        placeholder="Search workflows..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="border rounded px-3 py-2 mb-4 w-full max-w-sm"
      />

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              {['ID', 'Name', 'Steps', 'Version', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No workflows found</td></tr>
            )}
            {workflows.map((wf) => (
              <tr key={wf._id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{wf._id.slice(-8)}</td>
                <td className="px-4 py-3 font-medium">{wf.name}</td>
                <td className="px-4 py-3">{wf.step_count ?? 0}</td>
                <td className="px-4 py-3">v{wf.version}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${wf.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button onClick={() => navigate(`/workflows/${wf._id}/edit`)} className="text-indigo-600 hover:underline">Edit</button>
                  <button onClick={() => setExecuting(wf)} className="text-green-600 hover:underline">Execute</button>
                  <button onClick={() => handleDelete(wf._id)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-end">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded border ${p === page ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100'}`}
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
          onExecute={handleExecute}
        />
      )}
    </div>
  );
}
