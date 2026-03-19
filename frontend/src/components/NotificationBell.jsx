import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationsRead, clearNotifications } from '../api/client.js';

const TYPE_STYLES = {
  success: { dot: 'bg-emerald-400', text: 'text-emerald-400', icon: '✓' },
  error:   { dot: 'bg-red-400',     text: 'text-red-400',     icon: '✕' },
  info:    { dot: 'bg-blue-400',    text: 'text-blue-400',    icon: 'ℹ' },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const pollRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data.data);
      setUnread(res.data.unread);
    } catch {
      // silently ignore — user may not be authenticated yet
    }
  }, []);

  // Initial load + poll every 8s
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await markNotificationsRead().catch(() => {});
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  async function handleClear() {
    await clearNotifications().catch(() => {});
    setNotifications([]);
    setUnread(0);
  }

  function handleNotifClick(n) {
    if (n.execution_id) {
      navigate(`/executions/${n.execution_id}`);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {notifications.length > 0 && (
              <button type="button" onClick={handleClear}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">No notifications</div>
            ) : (
              notifications.map((n) => {
                const s = TYPE_STYLES[n.type] || TYPE_STYLES.info;
                return (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => handleNotifClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors flex items-start gap-3 ${!n.read ? 'bg-slate-800/30' : ''}`}
                  >
                    <span className={`mt-0.5 text-sm shrink-0 ${s.text}`}>{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!n.read ? 'text-slate-200' : 'text-slate-400'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.read && <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${s.dot}`} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
