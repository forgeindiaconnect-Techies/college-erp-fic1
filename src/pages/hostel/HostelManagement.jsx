import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, Plus, Trash2, Search, Building, ShieldCheck, Phone, Mail,
  Lock, RefreshCw, X, CheckCircle2, AlertCircle, Filter, UserCheck,
  Eye, EyeOff
} from 'lucide-react';
import { getUsers, createUser, deleteUser, getHostelBlocks } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../admin/UserManagementCommon.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: '',
  wardenType: 'Boys Warden'
};

const HostelManagement = () => {
  const [hostelUsers, setHostelUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [form, setForm] = useState(EMPTY_FORM);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const loadHostelUsers = useCallback(async (isManual = false) => {
    try {
      if (isManual) {
        setRefreshing(true);
      }

      const [res, blockRes] = await Promise.all([
        getUsers().catch(() => ({ data: [] })),
        getHostelBlocks().catch(() => ({ data: [] }))
      ]);

      const allUsers = Array.isArray(res?.data) ? res.data : [];
      const wardens = allUsers.filter(
        user => user.role?.toLowerCase() === 'hostel'
      );

      const combined = [...wardens];
      const seenNames = new Set(wardens.map(w => (w.name || '').toLowerCase().trim()));

      if (blockRes?.data && Array.isArray(blockRes.data)) {
        blockRes.data.forEach((b, idx) => {
          if (b.warden && b.warden.trim()) {
            const nameKey = b.warden.toLowerCase().trim();
            if (!seenNames.has(nameKey)) {
              seenNames.add(nameKey);
              combined.push({
                _id: b._id || `block-warden-${idx}`,
                name: b.warden,
                email: `${b.warden.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.edu`,
                phone: b.wardenContact || '9789012345',
                wardenType: b.name ? (b.name.toLowerCase().includes('girl') ? 'Girls Warden' : 'Boys Warden') : 'Hostel Warden',
                role: 'Hostel',
                allocatedBlock: b.name || b.blockId,
                createdAt: b.createdAt || new Date()
              });
            }
          }
        });
      }

      setHostelUsers(combined);
      setLastSynced(new Date());
    } catch (err) {
      console.error('Failed to load Hostel users:', err);
      setHostelUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync(loadHostelUsers, ['users', 'staff', 'hostel']);

  useEffect(() => {
    loadHostelUsers();
  }, [loadHostelUsers]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      alert('Name, Email and Password are required.');
      return;
    }

    try {
      setSubmitting(true);

      await createUser({
        ...form,
        role: 'Hostel'
      });

      setForm(EMPTY_FORM);
      setShowPassword(false);
      setShowModal(false);
      await loadHostelUsers(true);
    } catch (err) {
      console.error('Create Hostel user failed:', err);
      alert(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create Hostel credential.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Hostel Warden account?')) return;

    try {
      await deleteUser(id);
      await loadHostelUsers(true);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete Hostel account.');
    }
  };

  // KPI Calculations
  const totalWardens = hostelUsers.length;
  const boysWardens = hostelUsers.filter(u => (u.wardenType || '').toLowerCase().includes('boys')).length;
  const girlsWardens = hostelUsers.filter(u => (u.wardenType || '').toLowerCase().includes('girls')).length;

  const filtered = useMemo(() => {
    return hostelUsers.filter(user => {
      const matchSearch = `${user.name || ''} ${user.email || ''} ${user.phone || ''}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchType = typeFilter === 'All' ? true : (user.wardenType || 'Boys Warden') === typeFilter;
      return matchSearch && matchType;
    });
  }, [hostelUsers, search, typeFilter]);

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #3730a5, #06b6d4, #10b981)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Warden Directory Sync Active</span>
            </div>
            <h1>Hostel Warden Management</h1>
            <p>Provision, assign, and manage login credentials for Boys & Girls Hostel Wardens.</p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={() => loadHostelUsers(true)}
            >
              <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => {
                setShowPassword(false);
                setShowModal(true);
              }}
            >
              <Plus size={16} /> Add Hostel Warden
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Campus Module: <strong>Residential & Hostels</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Access Level: <strong>Hostel Warden Portal</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Last Updated: <strong>{lastSynced.toLocaleTimeString()}</strong></span>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid-4">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(55, 48, 165, 0.1)', color: '#3730a5' }}>
            <Building size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Total Wardens</span>
            <h3 className="mgmt-kpi-value">{totalWardens}</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Users size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Boys Wardens</span>
            <h3 className="mgmt-kpi-value" style={{ color: '#3b82f6' }}>{boysWardens}</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
            <Users size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Girls Wardens</span>
            <h3 className="mgmt-kpi-value" style={{ color: '#ec4899' }}>{girlsWardens}</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Active Credentials</span>
            <h3 className="mgmt-kpi-value" style={{ color: '#10b981' }}>100% Active</h3>
          </div>
        </div>
      </div>

      {/* ── Table Card & Filter Controls ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
            <div className="mgmt-search-box">
              <Search size={16} className="text-muted" />
              <input 
                type="text" 
                placeholder="Search warden name, email, phone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mgmt-search-input"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={14} className="text-muted" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'inherit' }}
              >
                <option value="All">All Types</option>
                <option value="Boys Warden">Boys Warden</option>
                <option value="Girls Warden">Girls Warden</option>
              </select>
            </div>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
            Showing <strong>{filtered.length}</strong> of <strong>{hostelUsers.length}</strong> Wardens
          </span>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Warden Profile</th>
                <th>Login Email / Username</th>
                <th>Contact Phone</th>
                <th>Warden Assignment</th>
                <th>ERP Role</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Loading Hostel Wardens...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                    <Building size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>No Hostel Warden Accounts Found</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Click "Add Hostel Warden" to provision login credentials for boys or girls hostel wardens.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isGirls = (user.wardenType || '').toLowerCase().includes('girls');
                  return (
                    <tr key={user._id || user.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{ 
                              width: '38px', 
                              height: '38px', 
                              borderRadius: '10px', 
                              background: isGirls ? 'linear-gradient(135deg, #ec4899, #db2777)' : 'linear-gradient(135deg, #3b82f6, #2563eb)', 
                              color: 'white', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: '700', 
                              textTransform: 'uppercase', 
                              fontSize: '15px' 
                            }}
                          >
                            {(user.name || 'H').charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{user.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>Hostel Resident In-Charge</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-main, #0f172a)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={13} className="text-muted" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted, #64748b)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} className="text-muted" />
                          <span>{user.phone || 'Not Provided'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            fontSize: '0.74rem', 
                            fontWeight: 700, 
                            padding: '0.25rem 0.65rem', 
                            borderRadius: '6px',
                            background: isGirls ? 'rgba(236, 72, 153, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: isGirls ? '#ec4899' : '#3b82f6'
                          }}
                        >
                          <Building size={12} />
                          {user.wardenType || 'Boys Warden'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                          Hostel Warden
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(user._id || user.id)}
                          style={{
                            padding: '0.45rem',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.06)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title="Delete account"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Warden Modal Overlay ── */}
      {showModal && (
        <div 
          className="mgmt-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div 
            className="mgmt-modal-card"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mgmt-modal-hd">
              <div>
                <h3>Provision Hostel Warden</h3>
                <p>Generate secure login access for Boys or Girls Hostel Wardens.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              className="mgmt-modal-form"
            >
              <div className="mgmt-form-field">
                <label>Warden Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ravi Kumar / Ms. Priya S"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="mgmt-form-input"
                />
              </div>

              <div className="mgmt-form-grid">
                <div className="mgmt-form-field">
                  <label>Login Email</label>
                  <input
                    type="email"
                    placeholder="e.g. warden@college.edu"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    className="mgmt-form-input"
                  />
                </div>

                <div className="mgmt-form-field">
                  <label>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="mgmt-form-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mgmt-form-grid">
                <div className="mgmt-form-field">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="mgmt-form-input"
                  />
                </div>

                <div className="mgmt-form-field">
                  <label>Warden Assignment</label>
                  <select
                    value={form.wardenType}
                    onChange={(e) => setForm(prev => ({ ...prev, wardenType: e.target.value }))}
                    className="mgmt-form-input"
                  >
                    <option value="Boys Warden">Boys Warden</option>
                    <option value="Girls Warden">Girls Warden</option>
                  </select>
                </div>
              </div>

              <div className="mgmt-modal-ft">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.65rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.35rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3730a5, #4f46e5)', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(55, 48, 165, 0.25)' }}
                >
                  {submitting ? 'Provisioning...' : 'Create Warden Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelManagement;
