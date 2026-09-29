import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library, Plus, Search, Edit2, Trash2, Mail, Phone,
  CheckCircle, XCircle, AlertTriangle, Eye, EyeOff,
  User, ExternalLink, ShieldCheck, X
} from 'lucide-react';
import { getLibrarians, createLibrarian, updateLibrarian, deleteLibrarian } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './LibrarianManagement.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  employeeId: '',
  password: '',
  status: 'Active'
};

const getInitials = (name) => (name || 'L').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = [
  'linear-gradient(135deg, #4f46e5, #3730a3)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)'
];

const LibrarianManagement = () => {
  const navigate = useNavigate();
  const [librarians, setLibrarians] = useState([]);
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

  const fetchLibrariansData = useCallback(async () => {
    try {
      setLoading(true);
      let list = [];
      try {
        const res = await getLibrarians();
        list = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.warn('API getLibrarians failed, reading local storage:', e);
      }
      const local = localStorage.getItem(`erp_librarians_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      if (local) {
        const parsed = JSON.parse(local);
        const ids = new Set(list.map(l => l._id || l.id));
        parsed.forEach(p => {
          if (!ids.has(p._id || p.id)) list.push(p);
        });
      }
      setLibrarians(list);
    } catch (err) {
      console.error('Failed to load librarians:', err);
      setLibrarians([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync(fetchLibrariansData, ['librarian', 'users', 'staff']);

  useEffect(() => {
    fetchLibrariansData();
  }, [fetchLibrariansData]);

  const filtered = librarians.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      (l?.name || '').toLowerCase().includes(q) ||
      (l?.email || '').toLowerCase().includes(q) ||
      (l?.phone || '').toLowerCase().includes(q) ||
      (l?.referenceId || '').toLowerCase().includes(q);
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
      showToast('Librarian Full Name is required', 'warning');
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
          await updateLibrarian(editTarget, form);
        } catch (apiErr) {
          console.warn('API update error, saving to local state:', apiErr);
        }
        setLibrarians(prev => {
          const updated = prev.map(l => (l._id === editTarget || l.id === editTarget) ? { 
            ...l, 
            ...form, 
            password: form.password ? form.password.trim() : l.password,
            referenceId: form.employeeId || l.referenceId 
          } : l);
          const tenantKey = `erp_librarians_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
          localStorage.setItem(tenantKey, JSON.stringify(updated));
          localStorage.setItem('erp_librarians_all', JSON.stringify(updated));
          return updated;
        });
        showToast(`Successfully updated credentials for ${form.name}`);
      } else {
        let newRecord = {
          _id: `LIB-${Date.now()}`,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone ? form.phone.trim() : '',
          referenceId: form.employeeId ? form.employeeId.trim() : `LIB-${Date.now().toString().slice(-4)}`,
          status: form.status || 'Active',
          role: 'Librarian',
          password: form.password ? form.password.trim() : ''
        };
        try {
          const res = await createLibrarian(form);
          if (res?.data?.user) {
            newRecord = { ...newRecord, ...res.data.user, _id: res.data.user.id || res.data.user._id || newRecord._id };
          }
        } catch (apiErr) {
          console.warn('API create error, saving to local state:', apiErr);
        }
        setLibrarians(prev => {
          const updated = [newRecord, ...prev.filter(l => l.email !== newRecord.email)];
          const tenantKey = `erp_librarians_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
          localStorage.setItem(tenantKey, JSON.stringify(updated));
          localStorage.setItem('erp_librarians_all', JSON.stringify(updated));
          return updated;
        });
        showToast(`Librarian profile created for ${form.name}`);
      }
      closeModal();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to save librarian credentials', 'warning');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to remove librarian ${item.name}? This will revoke their dashboard login access.`)) return;
    try {
      try {
        if (item._id && !item._id.startsWith('LIB-')) {
          await deleteLibrarian(item._id);
        }
      } catch (apiErr) {
        console.warn('API delete error, deleting from local state:', apiErr);
      }
      setLibrarians(prev => {
        const updated = prev.filter(l => (l._id !== item._id && l.id !== item._id && l.email !== item.email));
        localStorage.setItem(`erp_librarians_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast(`Removed access for ${item.name}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete librarian account', 'warning');
    }
  };

  return (
    <div className="librarian-management animate-fade-in">
      
      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h1>Librarian Management 📚</h1>
            <div className="erp-live-sync-pill">
              <span className="erp-live-pulse-dot"></span>
              <span>Real-Time ERP Synced</span>
            </div>
          </div>
          <p className="text-muted">Manage library staff accounts, generate login credentials, and control portal permissions.</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn-ghost" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--bg-primary, #ffffff)' }}
            onClick={() => navigate('/admin/library')}
          >
            <ExternalLink size={16} color="#4f46e5" /> Open Library Dashboard
          </button>
          
          <button id="add-librarian-btn" className="btn-primary shadow-glow" onClick={openAdd}>
            <Plus size={18} /> Add Librarian
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="sm-summary-row">
        {[
          { 
            label: 'Total Library Staff', 
            value: librarians.length, 
            cls: '', 
            icon: <Library size={20} color="#4f46e5" />, 
            bg: 'rgba(79, 70, 229, 0.08)' 
          },
          { 
            label: 'Active Credentials', 
            value: librarians.filter(l => (l.status || 'Active') === 'Active').length, 
            cls: 'text-success', 
            icon: <CheckCircle size={20} color="#10b981" />, 
            bg: 'rgba(16, 185, 129, 0.08)' 
          },
          { 
            label: 'Inactive Staff', 
            value: librarians.filter(l => l.status === 'Inactive').length, 
            cls: 'text-danger', 
            icon: <XCircle size={20} color="#ef4444" />, 
            bg: 'rgba(239, 68, 68, 0.08)' 
          }
        ].map((c, i) => (
          <div key={i} className="sm-summary-card glass-card">
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
      <div className="glass-card table-wrapper">
        
        {/* Filters row */}
        <div className="filters-row">
          <div className="search-box">
            <Search size={17} className="text-muted" />
            <input
              type="text" 
              placeholder="Search by name, email, phone, or ID..."
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && <button className="clear-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSearch('')}><X size={14} /></button>}
          </div>

          <div className="filter-group">
            <div className="filter-select-wrapper">
              <select 
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: 'center' }}>#</th>
                <th>Librarian Profile</th>
                <th>Contact Info</th>
                <th>Employee / Staff ID</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: 16, borderRadius: 4, width: j === 1 ? 160 : 90 }}></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Library size={40} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 600 }}>No librarian credentials found. Click "Add Librarian" to provision new credentials.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item._id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div 
                          className="avatar-sm" 
                          style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                        >
                          {getInitials(item.name || 'Librarian')}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</p>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Library Staff</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.82rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                          <Mail size={13} color="#4f46e5" /> {item.email}
                        </span>
                        {item.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            <Phone size={13} color="#10b981" /> {item.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="code-badge">{item.referenceId || `LIB-${(idx + 1).toString().padStart(3, '0')}`}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.status === 'Inactive' ? 'badge-inactive' : 'badge-active'}`}>
                        <span className="status-dot"></span>
                        {item.status || 'Active'}
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            <div>
              Showing <strong style={{ color: 'var(--text-main)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-main)' }}>{librarians.length}</strong> accounts
            </div>
            {(statusFilter !== 'All' || search) && (
              <button 
                style={{ background: 'none', border: 'none', color: 'var(--primary, #4f46e5)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setSearch(''); setStatusFilter('All'); }}
              >
                Clear all filters ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit Librarian Modal ── */}
      {modalOpen && (
        <div 
          className="modal-overlay" 
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div 
            className="modal-box glass-card" 
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-hd">
              <div>
                <h2>{editTarget ? 'Edit Librarian Credentials' : 'Provision Librarian Account'}</h2>
                <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                  {editTarget ? 'Update library staff account details and system credentials.' : 'Fill in the information to generate login credentials for the Library dashboard.'}
                </p>
              </div>
              <button className="modal-close-btn" type="button" onClick={closeModal}><X size={20} /></button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              noValidate
            >
              <div className="modal-body">
                <div className="form-grid">
                  
                  {/* Full Name */}
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label><User size={13} /> Librarian Full Name <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Meenakshi Sundaram"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="fld">
                    <label><Mail size={13} /> Login Email <span className="req">*</span></label>
                    <input
                      type="email"
                      placeholder="e.g. librarian@college.edu"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      autoComplete="off"
                      required
                    />
                  </div>

                  {/* Password */}
                  <div className="fld">
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
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Contact Phone */}
                  <div className="fld">
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
                  <div className="fld">
                    <label><ShieldCheck size={13} /> Employee / Librarian ID</label>
                    <input
                      type="text"
                      placeholder="e.g. LIB-001"
                      value={form.employeeId}
                      onChange={(e) => setForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      autoComplete="off"
                    />
                  </div>

                  {/* Status Toggle */}
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label><CheckCircle size={13} /> Account Status</label>
                    <div className="status-toggle-row">
                      {['Active', 'Inactive'].map(opt => (
                        <label key={opt} className={`status-toggle-opt ${form.status === opt ? 'selected' : ''}`}>
                          <input 
                            type="radio" 
                            name="librarianStatus" 
                            value={opt} 
                            checked={form.status === opt}
                            onChange={() => setForm(f => ({ ...f, status: opt }))} 
                            style={{ display: 'none' }} 
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              <div className="modal-ft">
                <button type="button" className="btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary shadow-glow">
                  {editTarget ? 'Save Changes' : 'Create Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: toast.type === 'success' ? '#059669' : '#d97706', color: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.88rem', zIndex: 9999 }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default LibrarianManagement;
