import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Search, Edit2, Trash2, Key, CheckCircle2,
  XCircle, Clock, MapPin, Phone, Mail, User, Eye, EyeOff,
  Copy, Check, AlertTriangle, RefreshCw, X
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
  const [watchmen, setWatchmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [gateFilter, setGateFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [selectedWatchman, setSelectedWatchman] = useState(null);

  // Forms
  const [form, setForm] = useState(EMPTY_FORM);
  const [shiftForm, setShiftForm] = useState({ shift: 'Morning', assignedGate: GATES[0] });
  const [pwdForm, setPwdForm] = useState({ newPassword: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toast & Copied state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [copied, setCopied] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchWatchmenData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getWatchmen();
      if (res?.data?.data && Array.isArray(res.data.data)) {
        setWatchmen(res.data.data);
      } else if (Array.isArray(res?.data)) {
        setWatchmen(res.data);
      }
    } catch (err) {
      console.error('Failed to load watchmen:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeSync(fetchWatchmenData, ['watchman', 'users']);

  useEffect(() => {
    fetchWatchmenData();
  }, [fetchWatchmenData]);

  // Generate strong random password
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: pwd }));
    setShowPwd(true);
  };

  // Submit Add Watchman
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.password) {
      showToast('Name, phone, email, and password are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await createWatchman(form);
      if (res.data?.success) {
        showToast('Watchman created successfully!');
        setCreatedCredentials({
          email: form.email,
          password: form.password,
          name: form.name,
          employeeId: res.data.data?.employeeId || form.employeeId || 'WMN-NEW',
          gate: form.assignedGate,
          shift: form.shift
        });
        fetchWatchmenData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create watchman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Watchman
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWatchman) return;

    try {
      setSubmitting(true);
      const res = await updateWatchman(selectedWatchman._id, form);
      if (res.data?.success) {
        showToast('Watchman updated successfully!');
        setEditModalOpen(false);
        fetchWatchmenData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update watchman', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Shift Assignment
  const handleShiftSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWatchman) return;

    try {
      setSubmitting(true);
      const res = await updateWatchman(selectedWatchman._id, shiftForm);
      if (res.data?.success) {
        showToast(`Shift updated to ${shiftForm.shift} at ${shiftForm.assignedGate}`);
        setShiftModalOpen(false);
        fetchWatchmenData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update shift', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedWatchman) return;
    if (!pwdForm.newPassword || pwdForm.newPassword.trim().length < 6) {
      showToast('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await resetWatchmanPassword(selectedWatchman._id, pwdForm.newPassword.trim());
      if (res.data?.success) {
        showToast(`Password reset successfully for ${selectedWatchman.name}!`);
        setPwdModalOpen(false);
        setPwdForm({ newPassword: '' });
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (watchman) => {
    const action = watchman.status === 'Active' ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${watchman.name}'s login access?`)) return;

    try {
      const res = await toggleWatchmanStatus(watchman._id);
      if (res.data?.success) {
        showToast(res.data.message);
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

  // Filtered list
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

  // Summary counts
  const totalCount = watchmen.length;
  const activeCount = watchmen.filter(w => w.status === 'Active').length;
  const morningCount = watchmen.filter(w => w.shift === 'Morning').length;
  const eveningNightCount = watchmen.filter(w => w.shift === 'Evening' || w.shift === 'Night').length;

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
            <h1>Watchman & Campus Security Management</h1>
            <p>Administer security personnel, gate shifts, account credentials, and access permissions</p>
          </div>
        </div>

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

      {/* Stats Cards */}
      <div className="wmn-stats-grid">
        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Total Security Staff</h4>
            <span className="stat-number">{totalCount}</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Shield size={22} />
          </div>
        </div>

        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Active On Duty Access</h4>
            <span className="stat-number" style={{ color: '#059669' }}>{activeCount}</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Morning Shift</h4>
            <span className="stat-number" style={{ color: '#d97706' }}>{morningCount}</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="wmn-stat-card">
          <div className="wmn-stat-info">
            <h4>Evening & Night Shifts</h4>
            <span className="stat-number" style={{ color: '#7c3aed' }}>{eveningNightCount}</span>
          </div>
          <div className="wmn-stat-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Clock size={22} />
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
            placeholder="Search by name, ID, phone, or gate..."
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
          {/* Shift Filter */}
          <select
            className="wmn-select"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
          >
            <option value="All">All Shifts</option>
            {SHIFTS.map(s => <option key={s} value={s}>{s} Shift</option>)}
          </select>

          {/* Gate Filter */}
          <select
            className="wmn-select"
            value={gateFilter}
            onChange={(e) => setGateFilter(e.target.value)}
          >
            <option value="All">All Gates</option>
            {GATES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Status Filter */}
          <select
            className="wmn-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>

          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px' }}
            onClick={fetchWatchmenData}
            title="Refresh list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Watchman Table Card */}
      <div className="wmn-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="wmn-table">
            <thead>
              <tr>
                <th>Watchman Profile</th>
                <th>Employee ID</th>
                <th>Contact Details</th>
                <th>Assigned Shift</th>
                <th>Assigned Gate</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', color: '#2563eb' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading security personnel...</p>
                  </td>
                </tr>
              ) : filteredWatchmen.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                    <Shield size={36} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#1e293b', fontWeight: 800 }}>No Watchmen Found</h4>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                      {search || shiftFilter !== 'All' || gateFilter !== 'All' || statusFilter !== 'All'
                        ? 'No watchman matches your active search and filter criteria.'
                        : 'No security guard accounts have been registered yet. Click "+ Add Watchman" to provision one.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWatchmen.map((w) => {
                  const initials = w.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'WM';
                  return (
                    <tr key={w._id}>
                      {/* Name & Avatar */}
                      <td>
                        <div className="wmn-name-cell">
                          <div className="wmn-avatar">{initials}</div>
                          <div>
                            <div className="wmn-name">{w.name}</div>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Role: Watchman</span>
                          </div>
                        </div>
                      </td>

                      {/* Employee ID */}
                      <td>
                        <span className="wmn-id-badge">{w.employeeId}</span>
                      </td>

                      {/* Contact Details */}
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

                      {/* Assigned Shift */}
                      <td>
                        <span className={`wmn-shift-badge shift-${w.shift.toLowerCase()}`}>
                          <Clock size={12} />
                          <span>{w.shift}</span>
                        </span>
                      </td>

                      {/* Assigned Gate */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#1e293b' }}>
                          <MapPin size={14} style={{ color: '#2563eb' }} />
                          <span>{w.assignedGate}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`wmn-status-pill status-${w.status.toLowerCase()}`}>
                          {w.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          <span>{w.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="wmn-actions-wrap" style={{ justifyContent: 'flex-end' }}>
                          {/* View Profile */}
                          <button
                            type="button"
                            className="wmn-action-btn"
                            title="View Full Details"
                            onClick={() => {
                              setSelectedWatchman(w);
                              setViewModalOpen(true);
                            }}
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="wmn-action-btn edit"
                            title="Edit Details"
                            onClick={() => {
                              setSelectedWatchman(w);
                              setForm({
                                name: w.name,
                                phone: w.phone,
                                email: w.email,
                                address: w.address || '',
                                shift: w.shift,
                                assignedGate: w.assignedGate,
                                status: w.status,
                                employeeId: w.employeeId
                              });
                              setEditModalOpen(true);
                            }}
                          >
                            <Edit2 size={15} />
                          </button>

                          {/* Reassign Shift */}
                          <button
                            type="button"
                            className="wmn-action-btn"
                            title="Assign Shift & Gate"
                            onClick={() => {
                              setSelectedWatchman(w);
                              setShiftForm({ shift: w.shift, assignedGate: w.assignedGate });
                              setShiftModalOpen(true);
                            }}
                          >
                            <Clock size={15} />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            className="wmn-action-btn key"
                            title="Reset Password"
                            onClick={() => {
                              setSelectedWatchman(w);
                              setPwdForm({ newPassword: '' });
                              setPwdModalOpen(true);
                            }}
                          >
                            <Key size={15} />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            type="button"
                            className="wmn-action-btn toggle"
                            title={w.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                            onClick={() => handleToggleStatus(w)}
                          >
                            {w.status === 'Active' ? <XCircle size={15} style={{ color: '#dc2626' }} /> : <CheckCircle2 size={15} style={{ color: '#059669' }} />}
                          </button>

                          {/* Delete */}
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

      {/* ── MODAL 1: ADD WATCHMAN ── */}
      {addModalOpen && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card">
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Shield size={20} style={{ color: '#2563eb' }} />
                <h3>Add New Watchman Account</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {createdCredentials ? (
              <div className="wmn-modal-body">
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Watchman Account Created!</h3>
                  <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                    Provide these login credentials to the watchman. They can now access the dedicated Watchman Dashboard.
                  </p>
                </div>

                <div className="wmn-cred-box">
                  <div className="wmn-cred-item">
                    <span style={{ color: '#64748b' }}>Full Name</span>
                    <strong>{createdCredentials.name}</strong>
                  </div>
                  <div className="wmn-cred-item">
                    <span style={{ color: '#64748b' }}>Employee ID</span>
                    <strong style={{ fontFamily: 'monospace' }}>{createdCredentials.employeeId}</strong>
                  </div>
                  <div className="wmn-cred-item">
                    <span style={{ color: '#64748b' }}>Login Email / Username</span>
                    <strong>{createdCredentials.email}</strong>
                  </div>
                  <div className="wmn-cred-item">
                    <span style={{ color: '#64748b' }}>Initial Password</span>
                    <strong style={{ fontFamily: 'monospace', color: '#2563eb' }}>{createdCredentials.password}</strong>
                  </div>
                  <div className="wmn-cred-item">
                    <span style={{ color: '#64748b' }}>Assigned Shift</span>
                    <strong>{createdCredentials.shift}</strong>
                  </div>
                  <div className="wmn-cred-item">
                    <span style={{ color: '#64748b' }}>Assigned Gate</span>
                    <strong>{createdCredentials.gate}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="wmn-btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={copyCredentials}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                  </button>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    onClick={() => {
                      setCreatedCredentials(null);
                      setAddModalOpen(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddSubmit}>
                <div className="wmn-modal-body">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">
                      Full Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Ramesh Kumar"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="wmn-form-grid-2">
                    <div className="wmn-form-group">
                      <label className="wmn-form-label">
                        Employee ID <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional - Auto if blank)</span>
                      </label>
                      <input
                        type="text"
                        className="wmn-form-input"
                        placeholder="e.g. WMN-001"
                        value={form.employeeId}
                        onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      />
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">
                        10-Digit Mobile Number <span className="req">*</span>
                      </label>
                      <input
                        type="tel"
                        className="wmn-form-input"
                        placeholder="e.g. 9876543210"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">
                      Email Address <span className="req">*</span>
                    </label>
                    <input
                      type="email"
                      className="wmn-form-input"
                      placeholder="e.g. ramesh.security@college.edu"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="wmn-form-grid-2">
                    <div className="wmn-form-group">
                      <label className="wmn-form-label">
                        Shift <span className="req">*</span>
                      </label>
                      <select
                        className="wmn-form-select"
                        value={form.shift}
                        onChange={(e) => setForm({ ...form, shift: e.target.value })}
                      >
                        {SHIFTS.map(s => <option key={s} value={s}>{s} Shift</option>)}
                      </select>
                    </div>

                    <div className="wmn-form-group">
                      <label className="wmn-form-label">
                        Assigned Gate <span className="req">*</span>
                      </label>
                      <select
                        className="wmn-form-select"
                        value={form.assignedGate}
                        onChange={(e) => setForm({ ...form, assignedGate: e.target.value })}
                      >
                        {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Address / Quarters Location</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Staff Quarters Block C, Room 12"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="wmn-form-label" style={{ margin: 0 }}>
                        Initial Login Password <span className="req">*</span>
                      </label>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                        onClick={generatePassword}
                      >
                        Generate Strong Password
                      </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPwd ? 'text' : 'password'}
                        className="wmn-form-input"
                        placeholder="Enter secure initial password (min 6 chars)"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                        onClick={() => setShowPwd(!showPwd)}
                      >
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="wmn-modal-footer">
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    onClick={() => setAddModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="wmn-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Watchman Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 2: EDIT WATCHMAN ── */}
      {editModalOpen && selectedWatchman && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card">
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Edit2 size={20} style={{ color: '#2563eb' }} />
                <h3>Edit Watchman Profile</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setEditModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="wmn-modal-body">
                <div className="wmn-form-group">
                  <label className="wmn-form-label">Full Name</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="wmn-form-grid-2">
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
                    <label className="wmn-form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="wmn-form-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Email Address</label>
                  <input
                    type="email"
                    className="wmn-form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Shift</label>
                    <select
                      className="wmn-form-select"
                      value={form.shift}
                      onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    >
                      {SHIFTS.map(s => <option key={s} value={s}>{s} Shift</option>)}
                    </select>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Assigned Gate</label>
                    <select
                      className="wmn-form-select"
                      value={form.assignedGate}
                      onChange={(e) => setForm({ ...form, assignedGate: e.target.value })}
                    >
                      {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Address</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Account Access Status</label>
                  <select
                    className="wmn-form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active (Login Enabled)</option>
                    <option value="Inactive">Inactive (Login Disabled)</option>
                  </select>
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: VIEW PROFILE ── */}
      {viewModalOpen && selectedWatchman && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card">
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Shield size={20} style={{ color: '#2563eb' }} />
                <h3>Security Personnel Profile</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setViewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="wmn-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '14px', background: 'linear-gradient(135deg, #1e293b, #334155)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800 }}>
                  {selectedWatchman.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{selectedWatchman.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span className="wmn-id-badge">{selectedWatchman.employeeId}</span>
                    <span className={`wmn-status-pill status-${selectedWatchman.status.toLowerCase()}`}>
                      {selectedWatchman.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Contact Phone</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{selectedWatchman.phone}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Login Email</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{selectedWatchman.email}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Shift</span>
                  <div style={{ marginTop: '2px' }}>
                    <span className={`wmn-shift-badge shift-${selectedWatchman.shift.toLowerCase()}`}>
                      {selectedWatchman.shift} Shift
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Assigned Gate Post</span>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>{selectedWatchman.assignedGate}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Address</span>
                  <div style={{ color: '#0f172a', marginTop: '2px' }}>{selectedWatchman.address || '—'}</div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Joining Date</span>
                  <div style={{ color: '#0f172a', marginTop: '2px' }}>{new Date(selectedWatchman.createdAt || Date.now()).toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
                </div>
              </div>
            </div>

            <div className="wmn-modal-footer">
              <button
                type="button"
                className="wmn-btn-sec"
                onClick={() => setViewModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: ASSIGN SHIFT & GATE ── */}
      {shiftModalOpen && selectedWatchman && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '440px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Clock size={20} style={{ color: '#2563eb' }} />
                <h3>Assign Shift & Gate</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setShiftModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit}>
              <div className="wmn-modal-body">
                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#64748b' }}>
                  Update duty schedule and gate assignment for <strong>{selectedWatchman.name}</strong>.
                </p>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Shift Timing</label>
                  <select
                    className="wmn-form-select"
                    value={shiftForm.shift}
                    onChange={(e) => setShiftForm({ ...shiftForm, shift: e.target.value })}
                  >
                    <option value="Morning">Morning (06:00 AM – 02:00 PM)</option>
                    <option value="Evening">Evening (02:00 PM – 10:00 PM)</option>
                    <option value="Night">Night (10:00 PM – 06:00 AM)</option>
                  </select>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Assigned Gate</label>
                  <select
                    className="wmn-form-select"
                    value={shiftForm.assignedGate}
                    onChange={(e) => setShiftForm({ ...shiftForm, assignedGate: e.target.value })}
                  >
                    {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setShiftModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: RESET PASSWORD ── */}
      {pwdModalOpen && selectedWatchman && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '440px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Key size={20} style={{ color: '#b45309' }} />
                <h3>Reset Watchman Password</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setPwdModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPassword}>
              <div className="wmn-modal-body">
                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#64748b' }}>
                  Set a new password for <strong>{selectedWatchman.name}</strong> ({selectedWatchman.email}).
                </p>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">New Password</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="Enter new password (min 6 chars)"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ newPassword: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setPwdModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  style={{ background: '#b45309' }}
                  disabled={submitting}
                >
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWatchmanManagement;
