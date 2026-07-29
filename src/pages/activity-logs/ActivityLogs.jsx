import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, MapPin, User, Activity, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import './ActivityLogs.css';

// MOCK_LOGS removed, fetching real data via API
import api from '../../api/index';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Determine user context
  const [userContext, setUserContext] = useState({ role: 'Guest', dept: null });

  useEffect(() => {
    // 1. Figure out who is viewing this page
    let context = { role: 'Guest', dept: null };
    if (sessionStorage.getItem('admin_session')) {
      context = { role: 'Admin', dept: null };
    } else if (sessionStorage.getItem('subadmin_session')) {
      context = { role: 'Sub Admin', dept: null };
    } else if (sessionStorage.getItem('hod_session')) {
      try {
        const hodData = JSON.parse(sessionStorage.getItem('hod_session'));
        context = { role: 'HOD', dept: hodData.deptCode || 'CS' }; // default CS if not parsed correctly
      } catch (e) {
        context = { role: 'HOD', dept: 'CSE' };
      }
    }
    setUserContext(context);

    const fetchLogs = async () => {
      try {
        const res = await api.get('/reports/activity-logs');
        // Map database model fields to UI fields
        const formattedLogs = res.data.map(l => ({
          id: l._id,
          user: l.userName,
          role: l.role,
          action: l.action,
          module: l.moduleName,
          date: new Date(l.createdAt).toLocaleString(),
          ip: l.ip || '127.0.0.1',
          status: l.status || 'Success',
          dept: l.dept
        }));
        setLogs(formattedLogs);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = l.user.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.module.toLowerCase().includes(q);
    const matchRole = roleFilter === 'All' || l.role === roleFilter;
    return matchSearch && matchRole;
  });

  const uniqueRoles = ['All', ...new Set(logs.map(l => l.role))];

  return (
    <div className="activity-logs-page animate-fade-in">
      <div className="page-header">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="mb-0">System Activity & Audit Logs</h1>
            <span style={{ padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--primary)', border: '1px solid var(--border-color)', fontWeight: 500 }}>
              Viewing as: {userContext.role} {userContext.dept ? `(${userContext.dept})` : ''}
            </span>
          </div>
          <p className="text-muted m-0">
            Track and monitor all actions happening within the ERP system. 
          </p>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by user, action, or module..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <Filter size={14} className="text-muted" />
            <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              {uniqueRoles.map(r => <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User & Role</th>
                <th>Action Performed</th>
                <th>Module</th>
                <th>Date & Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>No activity logs found for your permission level.</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="log-avatar">
                          {log.role === 'Super Admin' ? <Shield size={14} /> : <User size={14} />}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{log.user}</div>
                          <div className="text-xs text-muted">{log.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-sm">{log.action}</span>
                    </td>
                    <td>
                      <span className="log-badge module">{log.module}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-muted">
                        <Clock size={12} /> {log.date}
                      </div>
                    </td>
                    <td>
                      <span className={`log-badge ${log.status === 'Success' ? 'success' : 'failed'}`}>
                        {log.status === 'Success' ? <CheckCircle size={10} style={{ display: 'inline', marginRight: '4px' }} /> : <AlertCircle size={10} style={{ display: 'inline', marginRight: '4px' }} />}
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && (
          <div className="table-footer">
            Showing <strong>{filtered.length}</strong> recorded actions in the audit trail.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
