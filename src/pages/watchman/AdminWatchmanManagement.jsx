import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Search, Edit2, Trash2, Key, CheckCircle2,
  XCircle, Clock, MapPin, Phone, Mail, User, Eye, EyeOff,
  Copy, Check, AlertTriangle, RefreshCw, X, Users
} from 'lucide-react';
import {
  getWatchmen,
  createWatchman,
  updateWatchman,
  toggleWatchmanStatus,
  resetWatchmanPassword,
  deleteWatchman
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './AdminWatchmanManagement.css';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const SHIFTS = ['Morning', 'Evening', 'Night'];

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  shift: 'Morning',
  assignedGate: 'Gate 1 (Main Entrance)',
  status: 'Active',
  password: '',
  employeeId: ''
};

const AdminWatchmanManagement = () => {
  // Watchmen Directory State
  const [watchmen, setWatchmen] = useState([]);
  const [loadingWatchmen, setLoadingWatchmen] = useState(true);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [gateFilter, setGateFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Forms
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedWatchman, setSelectedWatchman] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Fetch Watchmen List
  const fetchWatchmenData = useCallback(async () => {
    try {
      setLoadingWatchmen(true);
      const res = await getWatchmen();
      if (res.data?.success) {
        setWatchmen(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load watchmen:', err);
      showToast('Failed to load watchmen list', 'error');
    } finally {
      setLoadingWatchmen(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchmenData();
  }, [fetchWatchmenData]);

  // Real-time synchronization
  useRealtimeSync({
    modules: ['watchman'],
    onSync: () => {
      fetchWatchmenData();
    }
  });

  // Handle Create Watchman
  const handleCreateWatchman = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.phone) {
      showToast('Please fill in Name, Phone, Email, and Password', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createWatchman(form);
      if (res.data?.success) {
        showToast('Watchman created successfully with login credentials!');
        setCreatedCredentials({
          name: form.name,
          email: form.email,
          password: form.password,
          employeeId: res.data.data?.employeeId || form.employeeId || 'Assigned',
          shift: form.shift,
          gate: form.assignedGate
        });
        fetchWatchmenData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create watchman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Watchman
  const handleEditWatchman = async (e) => {
    e.preventDefault();
    if (!selectedWatchman?._id) return;

    try {
      setSubmitting(true);
      const res = await updateWatchman(selectedWatchman._id, form);
      if (res.data?.success) {
        showToast('Watchman profile updated successfully');
        setEditModalOpen(false);
        fetchWatchmenData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update watchman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedWatchman?._id || !newPassword) {
      showToast('Please enter a new password', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await resetWatchmanPassword(selectedWatchman._id, newPassword);
      if (res.data?.success) {
        showToast(`Password updated for ${selectedWatchman.name}`);
        setCreatedCredentials({
          name: selectedWatchman.name,
          email: selectedWatchman.email,
          password: newPassword,
          employeeId: selectedWatchman.employeeId,
          shift: selectedWatchman.shift,
          gate: selectedWatchman.assignedGate
        });
        setResetModalOpen(false);
        setNewPassword('');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Login Status
  const handleToggleStatus = async (watchman) => {
    const action = watchman.status === 'Active' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${watchman.name}'s login access?`)) return;

    try {
      const res = await toggleWatchmanStatus(watchman._id);
      if (res.data?.success) {
        showToast(res.data.message || `Watchman ${action}d successfully`);
        fetchWatchmenData();
      }
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  // Delete Watchman
  const handleDelete = async (watchman) => {
    if (!window.confirm(`Permanently remove ${watchman.name} and their login account?`)) return;

    try {
      const res = await deleteWatchman(watchman._id);
      if (res.data?.success) {
        showToast('Watchman deleted successfully');
        fetchWatchmenData();
      }
    } catch (err) {
      showToast('Failed to delete watchman', 'error');
    }
  };

  // Copy Credentials
  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `College ERP Security Credentials\nName: ${createdCredentials.name}\nEmployee ID: ${createdCredentials.employeeId}\nPortal: ${window.location.origin}/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nAssigned Shift: ${createdCredentials.shift}\nGate: ${createdCredentials.gate}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filtered List
  const filteredWatchmen = watchmen.filter(w => {
    const matchesSearch =
      w.name?.toLowerCase().includes(search.toLowerCase()) ||
      w.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      w.phone?.toLowerCase().includes(search.toLowerCase()) ||
      w.email?.toLowerCase().includes(search.toLowerCase()) ||
      w.assignedGate?.toLowerCase().includes(search.toLowerCase());

    const matchesShift = shiftFilter === 'All' || w.shift === shiftFilter;
    const matchesGate = gateFilter === 'All' || w.assignedGate === gateFilter;
    const matchesStatus = statusFilter === 'All' || w.status === statusFilter;

    return matchesSearch && matchesShift && matchesGate && matchesStatus;
  });

  // KPI counts
  const totalGuardsCount = watchmen.length;
  const activeGuardsCount = watchmen.filter(w => w.status === 'Active').length;
  const morningShiftCount = watchmen.filter(w => w.shift === 'Morning').length;
  const otherShiftCount = watchmen.filter(w => w.shift === 'Evening' || w.shift === 'Night').length;

  return (
    <div className="wmn-mgmt-container">
      {/* Toast Alert */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 700,
          fontSize: '0.88rem'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="wmn-header-banner">
        <div className="wmn-banner-title">
          <div className="wmn-banner-icon">
            <Shield size={26} />
          </div>
          <div>
            <h1>Watchman Management</h1>
            <p>User Management • Add and manage campus security guards, login credentials, assigned gates, and shift schedules</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={fetchWatchmenData}
            title="Refresh list"
          >
            <RefreshCw size={16} className={loadingWatchmen ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="wmn-btn-primary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setCreatedCredentials(null);
              setAddModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Add Watchman</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="wmn-stats-grid">
        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Total Registered Guards</h4>
            <span className="stat-number">{totalGuardsCount}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Security Personnel</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Users size={22} />
          </div>
        </div>

        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Active Login Accounts</h4>
            <span className="stat-number" style={{ color: '#059669' }}>{activeGuardsCount}</span>
            <span style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>Authorized to Log in</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Morning Shift Guards</h4>
            <span className="stat-number">{morningShiftCount}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Day Patrol Schedule</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Evening & Night Shifts</h4>
            <span className="stat-number">{otherShiftCount}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Night Operations</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
            <Shield size={22} />
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Filters */}
      <div className="wmn-controls-card">
        <div className="wmn-search-wrap">
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            className="wmn-search-input"
            placeholder="Search by guard name, Employee ID, phone, email, or gate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => setSearch('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="wmn-filter-group">
          <select
            className="wmn-select"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value="All">All Shifts</option>
            {SHIFTS.map(s => <option key={s} value={s}>{s} Shift</option>)}
          </select>

          <select
            className="wmn-select"
            value={gateFilter}
            onChange={(e) => setGateFilter(e.target.value)}
          >
            <option value="All">All Gates</option>
            {GATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select
            className="wmn-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active (Login Allowed)</option>
            <option value="Inactive">Inactive (Suspended)</option>
          </select>

          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
            onClick={fetchWatchmenData}
            title="Refresh list"
          >
            <RefreshCw size={15} className={loadingWatchmen ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Watchmen Table */}
      <div className="wmn-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="wmn-table">
            <thead>
              <tr>
                <th>Security Guard</th>
                <th>Employee ID</th>
                <th>Contact Details</th>
                <th>Duty Shift</th>
                <th>Assigned Post</th>
                <th>Login Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingWatchmen ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#2563eb' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading security personnel directory...</p>
                  </td>
                </tr>
              ) : filteredWatchmen.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <Shield size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#1e293b', fontWeight: 800 }}>No Watchmen Found</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                      No registered guard accounts match your search or filter.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWatchmen.map((w) => {
                  const initials = w.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'WM';
                  return (
                    <tr key={w._id}>
                      <td>
                        <div className="wmn-name-cell">
                          <div className="wmn-avatar">{initials}</div>
                          <div>
                            <div className="wmn-name">{w.name}</div>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Security Personnel</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="wmn-id-badge">{w.employeeId}</span>
                      </td>

                      <td>
                        <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} style={{ color: '#64748b' }} />
                            <span>{w.phone}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#64748b' }}>
                            <Mail size={13} />
                            <span>{w.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`wmn-shift-badge shift-${(w.shift || 'morning').toLowerCase()}`}>
                          <Clock size={12} />
                          <span>{w.shift}</span>
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#1e293b' }}>
                          <MapPin size={14} style={{ color: '#2563eb' }} />
                          <span>{w.assignedGate}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`wmn-status-pill status-${(w.status || 'active').toLowerCase()}`}>
                          {w.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{w.status}</span>
                        </span>
                      </td>

                      <td>
                        <div className="wmn-actions-wrap" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="wmn-action-btn"
                            title="View Profile"
                            onClick={() => { setSelectedWatchman(w); setViewModalOpen(true); }}
                          >
                            <Eye size={15} />
                          </button>

                          <button
                            type="button"
                            className="wmn-action-btn edit"
                            title="Edit Profile"
                            onClick={() => {
                              setSelectedWatchman(w);
                              setForm({
                                name: w.name || '',
                                phone: w.phone || '',
                                email: w.email || '',
                                address: w.address || '',
                                shift: w.shift || 'Morning',
                                assignedGate: w.assignedGate || GATES[0],
                                status: w.status || 'Active',
                                employeeId: w.employeeId || '',
                                password: ''
                              });
                              setEditModalOpen(true);
                            }}
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            type="button"
                            className="wmn-action-btn key"
                            title="Reset Password"
                            onClick={() => {
                              setSelectedWatchman(w);
                              setNewPassword('');
                              setResetModalOpen(true);
                            }}
                          >
                            <Key size={15} />
                          </button>

                          <button
                            type="button"
                            className={`wmn-action-btn ${w.status === 'Active' ? 'deactivate' : 'activate'}`}
                            title={w.status === 'Active' ? 'Deactivate Login' : 'Activate Login'}
                            onClick={() => handleToggleStatus(w)}
                          >
                            {w.status === 'Active' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                          </button>

                          <button
                            type="button"
                            className="wmn-action-btn delete"
                            title="Delete Watchman"
                            onClick={() => handleDelete(w)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD WATCHMAN                                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {addModalOpen && (
        <div className="wmn-modal-overlay" onClick={() => !submitting && setAddModalOpen(false)}>
          <div className="wmn-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="wmn-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Add New Watchman</h3>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Create guard profile and portal login credentials</span>
                </div>
              </div>
              <button type="button" className="wmn-close-btn" onClick={() => setAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {createdCredentials ? (
              <div className="wmn-modal-body" style={{ textAlign: 'center', padding: '30px 24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Watchman Account Created!</h3>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Share the following login credentials with <strong>{createdCredentials.name}</strong> to access the Watchman Dashboard.
                </p>

                <div className="wmn-credentials-box">
                  <div className="wmn-cred-row">
                    <span>Login Email:</span>
                    <strong>{createdCredentials.email}</strong>
                  </div>
                  <div className="wmn-cred-row">
                    <span>Password:</span>
                    <strong>{createdCredentials.password}</strong>
                  </div>
                  <div className="wmn-cred-row">
                    <span>Employee ID:</span>
                    <strong>{createdCredentials.employeeId}</strong>
                  </div>
                  <div className="wmn-cred-row">
                    <span>Assigned Post:</span>
                    <strong>{createdCredentials.gate} ({createdCredentials.shift} Shift)</strong>
                  </div>
                  <div className="wmn-cred-row">
                    <span>Login URL:</span>
                    <strong>{window.location.origin}/login</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'center' }}>
                  <button type="button" className="wmn-btn-primary" onClick={copyCredentials}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                  </button>
                  <button type="button" className="wmn-btn-sec" onClick={() => { setCreatedCredentials(null); setAddModalOpen(false); }}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateWatchman}>
                <div className="wmn-modal-body">
                  <div className="wmn-form-grid">
                    <div className="wmn-form-group">
                      <label className="wmn-form-label">Full Name *</label>
                      <input
                        type="text"
                        className="wmn-form-input"
                        placeholder="e.g. Ramesh Kumar"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">Employee ID (Optional)</label>
                      <input
                        type="text"
                        className="wmn-form-input"
                        placeholder="Auto-generated if empty"
                        value={form.employeeId}
                        onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      />
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">Phone Number *</label>
                      <input
                        type="tel"
                        className="wmn-form-input"
                        placeholder="10-digit mobile number"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">Login Email *</label>
                      <input
                        type="email"
                        className="wmn-form-input"
                        placeholder="guard@college.edu"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">Portal Password *</label>
                      <div className="wmn-password-input-wrap">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="wmn-form-input"
                          placeholder="Temporary login password"
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          className="wmn-password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">Duty Shift *</label>
                      <select
                        className="wmn-form-select"
                        value={form.shift}
                        onChange={(e) => setForm({ ...form, shift: e.target.value })}
                      >
                        {SHIFTS.map(s => <option key={s} value={s}>{s} Shift</option>)}
                      </select>
                    </div>

                    <div className="wmn-form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="wmn-form-label">Assigned Gate Post *</label>
                      <select
                        className="wmn-form-select"
                        value={form.assignedGate}
                        onChange={(e) => setForm({ ...form, assignedGate: e.target.value })}
                      >
                        {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div className="wmn-form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="wmn-form-label">Residential Address</label>
                      <input
                        type="text"
                        className="wmn-form-input"
                        placeholder="Street, City, Pincode"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="wmn-modal-footer">
                  <button type="button" className="wmn-btn-sec" onClick={() => setAddModalOpen(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="wmn-btn-primary" disabled={submitting}>
                    {submitting ? 'Creating Guard Account...' : 'Save & Generate Credentials'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDIT WATCHMAN                                                  */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {editModalOpen && (
        <div className="wmn-modal-overlay" onClick={() => !submitting && setEditModalOpen(false)}>
          <div className="wmn-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="wmn-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit2 size={20} style={{ color: '#2563eb' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Edit Guard Profile</h3>
              </div>
              <button type="button" className="wmn-close-btn" onClick={() => setEditModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditWatchman}>
              <div className="wmn-modal-body">
                <div className="wmn-form-grid">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Full Name *</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Employee ID</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="wmn-form-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Email (Login ID)</label>
                    <input
                      type="email"
                      className="wmn-form-input"
                      value={form.email}
                      disabled
                      style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Duty Shift *</label>
                    <select
                      className="wmn-form-select"
                      value={form.shift}
                      onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    >
                      {SHIFTS.map(s => <option key={s} value={s}>{s} Shift</option>)}
                    </select>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Login Status</label>
                    <select
                      className="wmn-form-select"
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="wmn-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="wmn-form-label">Assigned Gate Post *</label>
                    <select
                      className="wmn-form-select"
                      value={form.assignedGate}
                      onChange={(e) => setForm({ ...form, assignedGate: e.target.value })}
                    >
                      {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="wmn-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="wmn-form-label">Residential Address</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button type="button" className="wmn-btn-sec" onClick={() => setEditModalOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="wmn-btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RESET PASSWORD                                                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {resetModalOpen && selectedWatchman && (
        <div className="wmn-modal-overlay" onClick={() => !submitting && setResetModalOpen(false)}>
          <div className="wmn-modal-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="wmn-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={20} style={{ color: '#2563eb' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Reset Guard Password</h3>
              </div>
              <button type="button" className="wmn-close-btn" onClick={() => setResetModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="wmn-modal-body">
                <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Enter a new login password for <strong>{selectedWatchman.name}</strong> ({selectedWatchman.email}).
                </p>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">New Password *</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="Enter new temporary password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button type="button" className="wmn-btn-sec" onClick={() => setResetModalOpen(false)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="wmn-btn-primary" disabled={submitting}>
                  {submitting ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: VIEW PROFILE                                                   */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {viewModalOpen && selectedWatchman && (
        <div className="wmn-modal-overlay" onClick={() => setViewModalOpen(false)}>
          <div className="wmn-modal-dialog" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="wmn-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} style={{ color: '#2563eb' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Watchman Profile</h3>
              </div>
              <button type="button" className="wmn-close-btn" onClick={() => setViewModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="wmn-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 800 }}>
                  {selectedWatchman.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{selectedWatchman.name}</h3>
                  <span className="wmn-id-badge" style={{ marginTop: '4px', display: 'inline-block' }}>{selectedWatchman.employeeId}</span>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Phone</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{selectedWatchman.phone}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Email</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{selectedWatchman.email}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Assigned Shift</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{selectedWatchman.shift}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Gate Post</span>
                  <strong style={{ display: 'block', color: '#2563eb' }}>{selectedWatchman.assignedGate}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Status</span>
                  <strong style={{ display: 'block', color: selectedWatchman.status === 'Active' ? '#16a34a' : '#dc2626' }}>{selectedWatchman.status}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Created Date</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>
                    {new Date(selectedWatchman.createdAt).toLocaleDateString()}
                  </strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Address</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{selectedWatchman.address || 'Not Provided'}</strong>
                </div>
              </div>
            </div>

            <div className="wmn-modal-footer">
              <button type="button" className="wmn-btn-sec" onClick={() => setViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWatchmanManagement;
