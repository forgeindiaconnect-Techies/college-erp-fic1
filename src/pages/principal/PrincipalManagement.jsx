import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  GraduationCap, Plus, Trash2, Search, ShieldCheck, Phone, Mail,
  Lock, RefreshCw, X, CheckCircle2, UserCheck, Award, Eye, EyeOff
} from 'lucide-react';
import { getUsers, createUser, deleteUser } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../admin/UserManagementCommon.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  phone: ''
};

const PrincipalManagement = () => {
  const [principals, setPrincipals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [form, setForm] = useState(EMPTY_FORM);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const loadPrincipals = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);

      const res = await getUsers();
      const allUsers = Array.isArray(res?.data) ? res.data : [];

      const list = allUsers.filter(
        user => user.role?.toLowerCase() === 'principal'
      );
      setPrincipals(list);
      setLastSynced(new Date());
    } catch (err) {
      console.error('Failed to load Principals:', err);
      setPrincipals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync(loadPrincipals, ['users', 'staff', 'principal']);

  useEffect(() => {
    loadPrincipals();
  }, [loadPrincipals]);

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
        role: 'Principal'
      });

      setForm(EMPTY_FORM);
      setShowPassword(false);
      setShowModal(false);
      await loadPrincipals(true);
    } catch (err) {
      console.error('Create Principal failed:', err);
      alert(
        err?.response?.data?.message ||
        err?.message ||
        'Failed to create Principal.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Principal account?')) return;

    try {
      await deleteUser(id);
      await loadPrincipals(true);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete Principal.');
    }
  };

  const filtered = useMemo(() => {
    return principals.filter(user =>
      `${user.name || ''} ${user.email || ''} ${user.phone || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [principals, search]);

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #3730a5, #7c3aed, #06b6d4)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Principal Directory Sync Active</span>
            </div>
            <h1>Principal Management</h1>
            <p>Provision and manage administrative login credentials and leadership profiles for the Principal.</p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={() => loadPrincipals(true)}
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
              <Plus size={16} /> Add Principal
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Campus Module: <strong>Executive Leadership</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Access Level: <strong>Full Academic & Administrative Authorization</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Last Synced: <strong>{lastSynced.toLocaleTimeString()}</strong></span>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(55, 48, 165, 0.1)', color: '#3730a5' }}>
            <GraduationCap size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Active Principals</span>
            <h3 className="mgmt-kpi-value">{principals.length}</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
            <Award size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Role Scope</span>
            <h3 className="mgmt-kpi-value" style={{ color: '#7c3aed' }}>Institutional Head</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Security Status</span>
            <h3 className="mgmt-kpi-value" style={{ color: '#10b981' }}>100% Verified</h3>
          </div>
        </div>
      </div>

      {/* ── Table Card & Search ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div className="mgmt-search-box">
            <Search size={16} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search principal name, email, phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mgmt-search-input"
            />
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
            Showing <strong>{filtered.length}</strong> of <strong>{principals.length}</strong> Principals
          </span>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>Principal Profile</th>
                <th>Login Email / Username</th>
                <th>Contact Phone</th>
                <th>Role Scope</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spinning" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Loading Principal Profiles...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                    <GraduationCap size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>No Principal Accounts Found</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>Click "Add Principal" to create login credentials for the institutional head.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user._id || user.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                          style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '10px', 
                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: '700', 
                            textTransform: 'uppercase', 
                            fontSize: '15px' 
                          }}
                        >
                          {(user.name || 'P').charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{user.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>Head of Institution</div>
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
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px', background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed' }}>
                        Principal
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
                          justifyContent: 'center'
                        }}
                        title="Delete account"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Principal Modal Overlay ── */}
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
                <h3>Provision Principal Account</h3>
                <p>Create secure login access for the Principal leadership portal.</p>
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
                <label>Principal Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vaideeswari M.E., Ph.D."
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
                    placeholder="e.g. principal@college.edu"
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
                  {submitting ? 'Creating...' : 'Create Principal Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalManagement;
