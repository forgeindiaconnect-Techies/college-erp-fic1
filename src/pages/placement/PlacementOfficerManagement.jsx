import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Plus, Search, Edit2, Trash2, Mail, Phone,
  CheckCircle, XCircle, AlertTriangle, Eye, EyeOff,
  User, ExternalLink, ShieldCheck, X, Building
} from 'lucide-react';
import { getPlacementOfficers, createPlacementOfficer, updatePlacementOfficer, deletePlacementOfficer } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './PlacementOfficerManagement.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  employeeId: '',
  password: '',
  designation: 'Training & Placement Officer',
  status: 'Active'
};

const getInitials = (name) => (name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  'linear-gradient(135deg, #0284c7, #0369a1)',
  'linear-gradient(135deg, #4f46e5, #3730a3)',
  'linear-gradient(135deg, #059669, #047857)',
  'linear-gradient(135deg, #d97706, #b45309)',
  'linear-gradient(135deg, #7c3aed, #6d28d9)'
];

const PlacementOfficerManagement = () => {
  const navigate = useNavigate();
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchPlacementOfficersData = useCallback(async () => {
    try {
      setLoading(true);
      let list = [];
      try {
        const res = await getPlacementOfficers();
        list = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.warn('API getPlacementOfficers failed, reading local storage:', e);
      }
      const local = localStorage.getItem(`erp_placement_officers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      if (local) {
        const parsed = JSON.parse(local);
        const ids = new Set(list.map(l => l._id || l.id));
        parsed.forEach(p => {
          if (!ids.has(p._id || p.id)) list.push(p);
        });
      }
      
      // Default demo officer if completely empty
      if (list.length === 0) {
        list = [
          {
            _id: 'PLC-DEMO-001',
            name: 'Dr. Suresh Kumar',
            email: 'placement@college.edu',
            phone: '9876543210',
            referenceId: 'PLC-001',
            department: 'Head of Corporate Relations & Placement',
            status: 'Active',
            role: 'Placement'
          }
        ];
      }

      setOfficers(list);
    } catch (err) {
      console.error('Failed to load placement officers:', err);
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync(fetchPlacementOfficersData, ['placement_officer', 'users', 'placement']);

  useEffect(() => {
    fetchPlacementOfficersData();
  }, [fetchPlacementOfficersData]);

  const filtered = officers.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      (l?.name || '').toLowerCase().includes(q) ||
      (l?.email || '').toLowerCase().includes(q) ||
      (l?.phone || '').toLowerCase().includes(q) ||
      (l?.referenceId || '').toLowerCase().includes(q) ||
      (l?.department || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || (l?.status || 'Active') === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setForm({
      _id: item._id,
      name: item.name || '',
      email: item.email || '',
      phone: item.phone || '',
      employeeId: item.referenceId || '',
      designation: item.department || 'Training & Placement Officer',
      password: '',
      status: item.status || 'Active'
    });
    setEditTarget(item._id);
    setShowPassword(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name || !form.name.trim()) {
      showToast('Placement Officer Full Name is required', 'warning');
      return;
    }
    if (!form.email || !form.email.trim()) {
      showToast('Login Email is required', 'warning');
      return;
    }
    if (!editTarget && (!form.password || !form.password.trim())) {
      showToast('Portal Password is required for new accounts', 'warning');
      return;
    }

    try {
      if (editTarget) {
        try {
          await updatePlacementOfficer(editTarget, form);
        } catch (apiErr) {
          console.warn('API update error, saving to local state:', apiErr);
        }
        setOfficers(prev => {
          const updated = prev.map(l => (l._id === editTarget || l.id === editTarget) ? { 
            ...l, 
            ...form, 
            department: form.designation || l.department,
            password: form.password ? form.password.trim() : l.password,
            referenceId: form.employeeId || l.referenceId 
          } : l);
          const tenantKey = `erp_placement_officers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
          localStorage.setItem(tenantKey, JSON.stringify(updated));
          localStorage.setItem('erp_placement_officers_all', JSON.stringify(updated));
          return updated;
        });
        showToast(`Successfully updated credentials for ${form.name}`);
      } else {
        const currentTenant = sessionStorage.getItem('tenantId') || 'COL004-3190860';
        let newRecord = {
          _id: `PLC-${Date.now()}`,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone ? form.phone.trim() : '',
          referenceId: form.employeeId ? form.employeeId.trim() : `PLC-${Date.now().toString().slice(-4)}`,
          department: form.designation || 'Training & Placement Officer',
          status: form.status || 'Active',
          role: 'Placement',
          password: form.password ? form.password.trim() : '',
          tenantId: currentTenant,
          collegeId: currentTenant
        };
        try {
          const res = await createPlacementOfficer(form);
          if (res?.data?.user) {
            newRecord = { ...newRecord, ...res.data.user, _id: res.data.user.id || res.data.user._id || newRecord._id, tenantId: currentTenant, collegeId: currentTenant };
          }
        } catch (apiErr) {
          console.warn('API create error, saving to local state:', apiErr);
        }
        setOfficers(prev => {
          const updated = [newRecord, ...prev.filter(l => (l.email || '').toLowerCase() !== newRecord.email.toLowerCase())];
          const tenantKey = `erp_placement_officers_${currentTenant}`;
          localStorage.setItem(tenantKey, JSON.stringify(updated));
          localStorage.setItem('erp_placement_officers_all', JSON.stringify(updated));
          return updated;
        });
        showToast(`Placement Officer credentials generated for ${form.name}`);
      }
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save placement officer credentials', 'warning');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to remove placement officer ${item.name}? This will revoke their dashboard login access.`)) return;
    try {
      try {
        if (item._id && !item._id.startsWith('PLC-')) {
          await deletePlacementOfficer(item._id);
        }
      } catch (apiErr) {
        console.warn('API delete error, deleting from local state:', apiErr);
      }
      setOfficers(prev => {
        const updated = prev.filter(l => (l._id !== item._id && l.id !== item._id && l.email !== item.email));
        localStorage.setItem(`erp_placement_officers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Removed access for ${item.name}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete placement officer account', 'warning');
    }
  };

  return (
    <div className="placement-officer-management animate-fade-in">
      
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1>Placement Management 💼</h1>
            <div className="erp-live-sync-pill">
              <span className="erp-live-pulse-dot"></span>
              <span>Real-Time ERP Synced</span>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
            Manage placement officer accounts, generate login credentials, and control portal permissions.
          </p>
        </div>

        <div className="header-actions">
          <button 
            type="button" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.1rem', borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-primary, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer'
            }}
            onClick={() => navigate('/placement/dashboard')}
          >
            <ExternalLink size={16} color="#0284c7" /> Open Placement Dashboard
          </button>
          
          <button 
            type="button" 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.55rem 1.25rem', borderRadius: '8px',
              background: '#0284c7', color: '#ffffff',
              border: 'none', fontWeight: 700, fontSize: '0.88rem',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}
            onClick={openAdd}
          >
            <Plus size={18} /> Add Placement Officer
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards Row ── */}
      <div className="sm-summary-row">
        {[
          { 
            label: 'Total Placement Staff', 
            value: officers.length, 
            cls: '', 
            icon: <Briefcase size={20} color="#0284c7" />, 
            bg: 'rgba(2, 132, 199, 0.1)' 
          },
          { 
            label: 'Active Credentials', 
            value: officers.filter(l => (l.status || 'Active') === 'Active').length, 
            cls: 'text-success', 
            icon: <CheckCircle size={20} color="#10b981" />, 
            bg: 'rgba(16, 185, 129, 0.1)' 
          },
          { 
            label: 'Inactive Staff', 
            value: officers.filter(l => l.status === 'Inactive').length, 
            cls: 'text-danger', 
            icon: <XCircle size={20} color="#ef4444" />, 
            bg: 'rgba(239, 68, 68, 0.1)' 
          }
        ].map((c, i) => (
          <div key={i} className="sm-summary-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="sm-summary-label">{c.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.icon}
              </div>
            </div>
            <span className={`sm-summary-value ${c.cls}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="table-wrapper">
        
        {/* Filters row */}
        <div className="filters-row">
          <div className="search-box">
            <Search size={17} style={{ color: 'var(--text-muted, #64748b)' }} />
            <input
              type="text" 
              placeholder="Search by name, email, phone, or ID..."
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} 
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50, textAlign: 'center' }}>#</th>
                <th>Placement Officer Profile</th>
                <th>Contact Info</th>
                <th>Employee / Staff ID</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={{ padding: '1rem' }}>
                        <div style={{ height: 16, background: '#e2e8f0', borderRadius: 4, width: j === 1 ? 160 : 90 }}></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Briefcase size={40} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No placement officer credentials found. Click "Add Placement Officer" to generate credentials.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => {
                  const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const isActive = (item.status || 'Active') === 'Active';

                  return (
                    <tr key={item._id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ 
                            width: 38, height: 38, borderRadius: '50%', background: avatarBg,
                            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 
                          }}>
                            {getInitials(item.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{item.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                              {item.department || 'Training & Placement Cell'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.84rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
                            <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                            <span>{item.email}</span>
                          </div>
                          {item.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                              <Phone size={13} />
                              <span>{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.6rem', borderRadius: '6px', 
                          background: 'var(--bg-secondary, #f1f5f9)', color: 'var(--text-main, #0f172a)',
                          fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem',
                          border: '1px solid var(--border-color, #e2e8f0)'
                        }}>
                          {item.referenceId || item.employeeId || 'PLC-STAFF'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${isActive ? 'active' : 'inactive'}`}>
                          <span className="status-dot"></span>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                          <button 
                            className="act-btn" 
                            title="Edit Details" 
                            onClick={() => openEdit(item)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="act-btn act-delete" 
                            title="Revoke Access" 
                            onClick={() => handleDelete(item)}
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

        {!loading && (
          <div style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            <div>
              Showing <strong style={{ color: 'var(--text-main)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-main)' }}>{officers.length}</strong> accounts
            </div>
            {(statusFilter !== 'All' || search) && (
              <button 
                style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setSearch(''); setStatusFilter('All'); }}
              >
                Clear all filters ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit Placement Officer Modal ── */}
      {modalOpen && (
        <div 
          className="placement-modal-overlay" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div 
            className="placement-modal-box" 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="placement-modal-hd">
              <div>
                <h2>{editTarget ? 'Edit Placement Officer' : 'Add Placement Officer'}</h2>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {editTarget ? 'Update placement staff profile & system credentials.' : 'Generate login credentials for the Placement Cell dashboard.'}
                </p>
              </div>
              <button className="placement-modal-close" type="button" onClick={closeModal}><X size={20} /></button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault();
              }}
              noValidate
            >
              <div className="placement-modal-body">
                <div className="placement-form-grid">
                  
                  {/* Full Name */}
                  <div className="placement-fld full">
                    <label><User size={13} /> Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Suresh Kumar"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="placement-fld">
                    <label><Mail size={13} /> Official Email <span className="req">*</span></label>
                    <input
                      type="email"
                      placeholder="placement@college.edu"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* Contact Phone */}
                  <div className="placement-fld">
                    <label><Phone size={13} /> Contact Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={form.phone}
                      onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="placement-fld">
                    <label>🏢 Employee / Staff ID</label>
                    <input
                      type="text"
                      placeholder="PLC-001"
                      value={form.employeeId}
                      onChange={(e) => setForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>

                  {/* Designation */}
                  <div className="placement-fld">
                    <label><Building size={13} /> Designation / Cell</label>
                    <input
                      type="text"
                      placeholder="Training & Placement Officer"
                      value={form.designation}
                      onChange={(e) => setForm(prev => ({ ...prev, designation: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>

                  {/* Password */}
                  <div className="placement-fld full">
                    <label>🔑 Portal Password {editTarget ? '(Leave blank to keep current)' : <span className="req">*</span>}</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editTarget ? '••••••••' : 'Enter login password'}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        required={!editTarget}
                        autoComplete="new-password"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="placement-fld full">
                    <label>Account Status</label>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem', textTransform: 'none', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="status"
                          value="Active"
                          checked={form.status === 'Active'}
                          onChange={() => setForm(prev => ({ ...prev, status: 'Active' }))}
                        />
                        <span style={{ color: '#10b981' }}>Active (Can Log In)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.88rem', textTransform: 'none', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="status"
                          value="Inactive"
                          checked={form.status === 'Inactive'}
                          onChange={() => setForm(prev => ({ ...prev, status: 'Inactive' }))}
                        />
                        <span style={{ color: '#ef4444' }}>Inactive (Access Suspended)</span>
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              <div className="placement-modal-ftr">
                <button 
                  type="button" 
                  style={{ 
                    padding: '0.55rem 1.15rem', borderRadius: '8px', 
                    border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-primary, #ffffff)', 
                    fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' 
                  }} 
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ 
                    padding: '0.55rem 1.35rem', borderRadius: '8px', 
                    border: 'none', background: '#0284c7', color: '#ffffff', 
                    fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' 
                  }}
                >
                  {editTarget ? 'Save Changes' : 'Generate Placement Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`placement-toast ${toast.type}`}>
          {toast.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
};

export default PlacementOfficerManagement;
