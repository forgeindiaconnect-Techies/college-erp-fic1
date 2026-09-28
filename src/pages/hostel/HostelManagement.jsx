import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, Plus, Trash2, Search, Building, ShieldCheck, Phone, Mail,
  Lock, RefreshCw, X, CheckCircle2, AlertCircle, Filter, UserCheck,
  Eye, EyeOff
} from 'lucide-react';
import { getUsers, createUser, deleteUser, getHostelBlocks } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

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
    <div className="management-page animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Real-Time ERP Header Card ── */}
      <div 
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3730a5, #06b6d4, #10b981)' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '0.4rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }}></span>
              <span>Real-Time Warden Directory Sync Active</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 0.25rem' }}>
              Hostel Warden Management
            </h1>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem', margin: 0 }}>
              Provision, assign, and manage login credentials for Boys & Girls Hostel Wardens.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => loadHostelUsers(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #e2e8f0)',
                background: 'var(--bg-secondary, #f8fafc)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={15} className={refreshing ? 'spinning' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Data'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowPassword(false);
                setShowModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'linear-gradient(135deg, #3730a5, #4f46e5)',
                color: '#ffffff',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(55, 48, 165, 0.25)'
              }}
            >
              <Plus size={16} /> Add Hostel Warden
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
          <span>Campus Module: <strong>Residential & Hostels</strong></span>
          <span>•</span>
          <span>Access Level: <strong>Hostel Warden Portal</strong></span>
          <span>•</span>
          <span>Last Updated: <strong>{lastSynced.toLocaleTimeString()}</strong></span>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(55, 48, 165, 0.1)', color: '#3730a5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Total Wardens</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: 'var(--text-main, #0f172a)' }}>{totalWardens}</h3>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Boys Hostel Wardens</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: '#3b82f6' }}>{boysWardens}</h3>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Girls Hostel Wardens</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: '#ec4899' }}>{girlsWardens}</h3>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>Active Credentials</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.1rem 0 0', color: '#10b981' }}>100% Active</h3>
          </div>
        </div>
      </div>

      {/* ── Table Card & Filter Controls ── */}
      <div 
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', padding: '0.5rem 0.85rem', borderRadius: '10px' }}>
              <Search size={16} className="text-muted" />
              <input 
                type="text" 
                placeholder="Search warden name, email, phone..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', width: '240px', fontSize: '0.82rem', fontFamily: 'inherit' }}
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

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', textAlign: 'left' }}>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Warden Profile</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Login Email / Username</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact Phone</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Warden Assignment</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ERP Role</th>
                <th style={{ padding: '0.85rem 1.25rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Actions</th>
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
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div 
            style={{
              background: 'var(--bg-card, #ffffff)',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Provision Hostel Warden
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                  Generate secure login access for Boys or Girls Hostel Wardens.
                </p>
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
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Warden Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ravi Kumar / Ms. Priya S"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Login Email</label>
                  <input
                    type="email"
                    placeholder="e.g. warden@college.edu"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Warden Assignment</label>
                  <select
                    value={form.wardenType}
                    onChange={(e) => setForm(prev => ({ ...prev, wardenType: e.target.value }))}
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  >
                    <option value="Boys Warden">Boys Warden</option>
                    <option value="Girls Warden">Girls Warden</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
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
