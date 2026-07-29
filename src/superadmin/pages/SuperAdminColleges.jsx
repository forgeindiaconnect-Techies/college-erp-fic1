import React, { useState, useEffect } from 'react';
import { Search, Building2, User, Phone, Mail, Activity, AlertTriangle, MoreVertical, Shield, Key } from 'lucide-react';
import api from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';

const SuperAdminColleges = () => {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/colleges');

      setColleges(res.data);
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (college) => {
    const isCurrentlyDeactivated = college.subscriptionStatus === 'Deactivated';
    const targetStatus = isCurrentlyDeactivated ? 'Active' : 'Deactivated';

    setModalState({
      isOpen: true,
      type: isCurrentlyDeactivated ? 'success' : 'danger',
      title: isCurrentlyDeactivated ? `Activate ${college.name}?` : `Deactivate ${college.name}?`,
      message: isCurrentlyDeactivated 
        ? `Are you sure you want to reactivate ${college.name}? All portal users for this college will regain login access.`
        : `Are you sure you want to deactivate ${college.name}? All portal users belonging to this college will be blocked from logging in.`,
      confirmText: isCurrentlyDeactivated ? 'Activate College' : 'Deactivate College',
      onConfirm: async () => {
        const idToUse = college._id || college.tenantId;
        const endpoint = targetStatus === 'Active' ? 'activate' : 'deactivate';
        try {
          await api.put(`/superadmin/college/${idToUse}/${endpoint}`);
        } catch (err) {
          console.warn('Superadmin endpoint fallback to status endpoint:', err);
          try {
            await api.put(`/auth/colleges/${idToUse}/status`, { status: targetStatus });
          } catch (e) {
            console.error('Failed to update status', e);
          }
        }
        setColleges(prev => prev.map(c => 
          (c._id === college._id || c.tenantId === college.tenantId) 
            ? { ...c, subscriptionStatus: targetStatus, isActive: targetStatus === 'Active' } 
            : c
        ));
      }
    });
  };

  const filteredColleges = colleges.filter(c => 
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (c.tenantId && c.tenantId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ padding: '24px' }}>
      <ConfirmModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        {...modalState} 
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Colleges Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage all registered tenant institutions.</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by name or Tenant ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px 10px 10px 36px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-main)'
            }}
          />
        </div>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Institution</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Administrator</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Plan / Status</th>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Users</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center' }}>Loading colleges...</td></tr>
            ) : filteredColleges.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>No colleges found.</td></tr>
            ) : (
              filteredColleges.map((college) => (
                <tr key={college._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>{college.name || 'Unknown College'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {college.tenantId || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>{college.adminName || 'Admin'}</div>
                    
                    {/* Admin Credential card */}
                    <div style={{
                      background: 'rgba(99,102,241,0.04)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      width: 'fit-content',
                      minWidth: '200px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5', marginBottom: '2px' }}>Admin</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42px', flexShrink: 0 }}>Email</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 500 }}>{college.email}</span>
                      </div>
                      <div style={{ height: '1px', background: 'rgba(99,102,241,0.1)' }} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42px', flexShrink: 0 }}>Pass</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.03em' }}>
                          {college.adminPassword || '••••••••'}
                        </span>
                      </div>
                    </div>

                    {/* Principal Credential card */}
                    {college.principalEmail && (
                      <div style={{
                        background: 'rgba(16,185,129,0.04)',
                        border: '1px solid rgba(16,185,129,0.15)',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        width: 'fit-content',
                        minWidth: '200px'
                      }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', marginBottom: '2px' }}>Principal</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42px', flexShrink: 0 }}>Email</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 500 }}>{college.principalEmail}</span>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(16,185,129,0.1)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', width: '42px', flexShrink: 0 }}>Pass</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.03em' }}>
                            {college.principalPassword || '••••••••'}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', verticalAlign: 'top' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '4px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                        background: college.subscriptionPlan === 'Trial' ? 'rgba(245,158,11,0.1)' : 'rgba(139,92,246,0.1)',
                        color: college.subscriptionPlan === 'Trial' ? '#f59e0b' : '#8b5cf6'
                      }}>
                        {college.subscriptionPlan}
                      </span>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800,
                        letterSpacing: '0.02em',
                        background:
                          college.subscriptionStatus === 'Active' ? 'rgba(16,185,129,0.15)' :
                          college.subscriptionStatus === 'Deactivated' ? 'rgba(239,68,68,0.15)' :
                          college.subscriptionStatus === 'Grace Period' ? 'rgba(245,158,11,0.15)' :
                          'rgba(239,68,68,0.15)',
                        color:
                          college.subscriptionStatus === 'Active' ? '#10b981' :
                          college.subscriptionStatus === 'Deactivated' ? '#ef4444' :
                          college.subscriptionStatus === 'Grace Period' ? '#f59e0b' :
                          '#ef4444',
                        border:
                          college.subscriptionStatus === 'Active' ? '1px solid rgba(16,185,129,0.3)' :
                          college.subscriptionStatus === 'Deactivated' ? '1px solid rgba(239,68,68,0.3)' :
                          '1px solid rgba(245,158,11,0.3)'
                      }}>
                        Status: {college.subscriptionStatus}
                      </span>
                    </div>
                    {college.subscriptionStatus === 'Active' && college.daysRemaining > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {college.daysRemaining}d left
                      </div>
                    )}
                    {college.subscriptionStatus === 'Grace Period' && (
                      <div style={{ fontSize: '0.72rem', color: '#f59e0b' }}>
                        Grace: {college.daysRemaining}d left
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500, verticalAlign: 'top' }}>
                    {college.totalUsers || 0} Registered
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', verticalAlign: 'top' }}>
                    <button 
                      onClick={() => handleToggleStatus(college)}
                      style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: college.subscriptionStatus === 'Deactivated' ? '#dcfce7' : '#fee2e2', 
                        color: college.subscriptionStatus === 'Deactivated' ? '#15803d' : '#dc2626', 
                        border: college.subscriptionStatus === 'Deactivated' ? '1px solid #86efac' : '1px solid #fca5a5', 
                        padding: '6px 14px', 
                        borderRadius: '8px', 
                        fontWeight: 700, 
                        fontSize: '0.8rem', 
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      {college.subscriptionStatus === 'Deactivated' ? '⚡ Activate College' : '⛔ Deactivate College'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminColleges;
