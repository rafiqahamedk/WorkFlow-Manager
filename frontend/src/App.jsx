import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import WorkflowList from './pages/WorkflowList.jsx';
import WorkflowEditor from './pages/WorkflowEditor.jsx';
import StepsPage from './pages/StepsPage.jsx';
import StepsRulesPage from './pages/StepsRulesPage.jsx';
import RulesPage from './pages/RulesPage.jsx';
import ExecutionView from './pages/ExecutionView.jsx';
import AuditLog from './pages/AuditLog.jsx';
import NotificationBell from './components/NotificationBell.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/signin" replace />;
}

function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  function handleLogout() {
    logout();
    navigate('/signin');
  }

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">W</div>
              <span className="font-semibold text-white tracking-tight">WorkFlow Manager</span>
            </div>
            <div className="flex gap-1">
              <NavLink to="/workflows" className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`
              }>Workflows</NavLink>
              <NavLink to="/audit" className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`
              }>Audit Log</NavLink>
            </div>
          </div>

          {/* Right side: Bell + User dropdown */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            {/* User dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="font-medium">{user?.username}</span>
                <svg className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-2.5 border-b border-slate-800">
                    <p className="text-xs font-semibold text-white truncate">{user?.username}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Protected routes */}
      <Route path="/workflows" element={<ProtectedRoute><AppLayout><WorkflowList /></AppLayout></ProtectedRoute>} />
      <Route path="/workflows/new" element={<ProtectedRoute><AppLayout><WorkflowEditor /></AppLayout></ProtectedRoute>} />
      <Route path="/workflows/:id/edit" element={<ProtectedRoute><AppLayout><WorkflowEditor /></AppLayout></ProtectedRoute>} />
      <Route path="/workflows/:id/steps" element={<ProtectedRoute><AppLayout><StepsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/workflows/:id/steps-rules" element={<ProtectedRoute><AppLayout><StepsRulesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/workflows/:id/rules" element={<ProtectedRoute><AppLayout><RulesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/executions/:id" element={<ProtectedRoute><AppLayout><ExecutionView /></AppLayout></ProtectedRoute>} />
      <Route path="/audit" element={<ProtectedRoute><AppLayout><AuditLog /></AppLayout></ProtectedRoute>} />
    </Routes>
  );
}
