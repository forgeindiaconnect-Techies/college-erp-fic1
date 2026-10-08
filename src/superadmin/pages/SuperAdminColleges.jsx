import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Plus, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Eye, 
  Lock, 
  Copy, 
  Check, 
  Crown, 
  X, 
  Layers,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Globe,
  SlidersHorizontal
} from 'lucide-react';
import api from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';
import './SuperAdminDashboard.css';

const SuperAdminColleges = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Status Toggle Modal
  const [modalState, setModalState] = useState({ 
    isOpen: false, 
    type: 'info', 
    title: '', 
    message: '',
    confirmText: 'Confirm',
    onConfirm: null 
  });

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/auth/colleges');
      if (res && res.data) {
        setColleges(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch colleges:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleOpenInspect = (college) => {
    setSelectedCollege(college);
    setEditFormData({
      name: college.name || college.collegeName || '',
      adminName: college.adminName || '',
      email: college.email || '',
      phone: college.phone || '',
      principalName: college.principalName || '',
      principalEmail: college.principalEmail || '',
      subscriptionPlan: college.subscriptionPlan || 'Premium',
      subscriptionAmount: college.subscriptionAmount !== undefined ? college.subscriptionAmount : (college.subscriptionPlan === 'Elite' ? 35000 : college.subscriptionPlan === 'Basic' ? 10000 : 20000),
      billingCycle: college.billingCycle || 'Monthly',
      subscriptionStatus: college.subscriptionStatus || 'Active'
    });
    setIsEditing(false);
    setShowInspectModal(true);
  };

  const handleSaveCollegeEdit = async () => {
    if (!selectedCollege) return;
    try {
      setSavingEdit(true);
      const targetId = selectedCollege._id || selectedCollege.tenantId;
      await api.put(`/auth/colleges/${targetId}`, editFormData);
      
      const updatedObj = { ...selectedCollege, ...editFormData };
      setSelectedCollege(updatedObj);
      setColleges(prev => prev.map(c => (c._id === selectedCollege._id || c.tenantId === selectedCollege.tenantId) ? { ...c, ...editFormData } : c));
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update college:', error);
      alert(error.response?.data?.message || 'Failed to update college details');
    } finally {
      setSavingEdit(false);
    }
  };

  const metrics = useMemo(() => {
    const total = colleges.length;
    const active = colleges.filter(c => (c.subscriptionStatus || 'Active') === 'Active').length;
    const trials = colleges.filter(c => c.subscriptionPlan === 'Trial' || c.subscriptionStatus === 'Trial').length;
    const grace = colleges.filter(c => c.subscriptionStatus === 'Grace Period').length;
    const deactivated = colleges.filter(c => c.subscriptionStatus === 'Deactivated').length;
    const totalUsers = colleges.reduce((sum, c) => sum + (Number(c.totalUsers) || 0), 0);

    return { total, active, trials, grace, deactivated, totalUsers };
  }, [colleges]);

  const handleToggleStatus = (college) => {
    const isCurrentlyDeactivated = college.subscriptionStatus === 'Deactivated';
    const targetStatus = isCurrentlyDeactivated ? 'Active' : 'Deactivated';

    setModalState({
      isOpen: true,
      type: isCurrentlyDeactivated ? 'success' : 'danger',
      title: isCurrentlyDeactivated ? `Activate ${college.name || college.collegeName}?` : `Deactivate ${college.name || college.collegeName}?`,
      message: isCurrentlyDeactivated 
        ? `Reactivating ${college.name || college.collegeName} will instantly restore portal logins and real-time ERP access for all users in this tenant.`
        : `Deactivating will block student, faculty, HOD, and principal logins for this institution (${college.tenantId || 'N/A'}). All institutional data remains safely preserved.`,
      confirmText: isCurrentlyDeactivated ? '⚡ Activate College' : '⛔ Deactivate College',
      onConfirm: async () => {
        const idToUse = college._id || college.tenantId;
        const endpoint = targetStatus === 'Active' ? 'activate' : 'deactivate';
        try {
          await api.put(`/superadmin/college/${idToUse}/${endpoint}`);
        } catch (err) {
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

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredColleges = useMemo(() => {
    return colleges.filter(c => {
      const name = (c.name || c.collegeName || '').toLowerCase();
      const tenantId = (c.tenantId || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const city = (c.city || '').toLowerCase();
      const plan = (c.subscriptionPlan || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matches = !query || name.includes(query) || tenantId.includes(query) || email.includes(query) || city.includes(query) || plan.includes(query);
      if (!matches) return false;

      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'ACTIVE') return (c.subscriptionStatus || 'Active') === 'Active';
      if (activeFilter === 'TRIAL') return c.subscriptionPlan === 'Trial' || c.subscriptionStatus === 'Trial';
      if (activeFilter === 'GRACE') return c.subscriptionStatus === 'Grace Period';
      if (activeFilter === 'DEACTIVATED') return c.subscriptionStatus === 'Deactivated';

      return true;
    });
  }, [colleges, searchQuery, activeFilter]);

  const handleExportCSV = () => {
    const headers = ['College Name', 'Tenant ID', 'Admin Name', 'Admin Email', 'Plan', 'Status', 'Total Users'];
    const rows = colleges.map(c => [
      `"${c.name || c.collegeName || 'N/A'}"`,
      `"${c.tenantId || 'N/A'}"`,
      `"${c.adminName || 'Admin'}"`,
      `"${c.email || 'N/A'}"`,
      `"${c.subscriptionPlan || 'Trial'}"`,
      `"${c.subscriptionStatus || 'Active'}"`,
      c.totalUsers || 0
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Institutions_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="sa-dashboard animate-fade-in">
      <ConfirmModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        {...modalState} 
      />

      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-title-area">
          <div className="sa-badge-cluster">
            <span className="sa-pulse-dot"></span>
            <span>Multi-Tenant Institution Management</span>
          </div>
          <h1 className="sa-header-title">
            <Building2 size={28} color="#4f46e5" />
            Tenant Colleges Directory
          </h1>
          <p className="sa-header-subtitle">
            Manage provisioned colleges, administrator logins, subscription tiers, and tenant activation status.
          </p>
        </div>

        <div className="sa-header-actions">
          <button 
            className="sa-btn sa-btn-secondary" 
            onClick={fetchColleges}
            title="Refresh Directory"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Sync Data'}
          </button>

          <button 
            className="sa-btn sa-btn-outline" 
            onClick={handleExportCSV}
          >
            <Download size={16} />
            Export Directory
          </button>

          <button 
            className="sa-btn sa-btn-primary" 
            onClick={() => navigate('/get-access')}
          >
            <Plus size={16} />
            Onboard New College
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="sa-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="sa-kpi-card" style={{ padding: '1.1rem' }}>
          <div className="sa-kpi-top" style={{ marginBottom: '0.4rem' }}>
            <div>
              <div className="sa-kpi-title">Total Colleges</div>
              <div className="sa-kpi-value" style={{ fontSize: '1.6rem' }}>{metrics.total}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', width: '38px', height: '38px' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered Tenants</div>
        </div>

        <div className="sa-kpi-card" style={{ padding: '1.1rem' }}>
          <div className="sa-kpi-top" style={{ marginBottom: '0.4rem' }}>
            <div>
              <div className="sa-kpi-title">Active Colleges</div>
              <div className="sa-kpi-value" style={{ fontSize: '1.6rem', color: '#10b981' }}>{metrics.active}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', width: '38px', height: '38px' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>100% Operational</div>
        </div>

        <div className="sa-kpi-card" style={{ padding: '1.1rem' }}>
          <div className="sa-kpi-top" style={{ marginBottom: '0.4rem' }}>
            <div>
              <div className="sa-kpi-title">Active Trials</div>
              <div className="sa-kpi-value" style={{ fontSize: '1.6rem', color: '#f59e0b' }}>{metrics.trials}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', width: '38px', height: '38px' }}>
              <Crown size={18} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>14-Day Free Tier</div>
        </div>

        <div className="sa-kpi-card" style={{ padding: '1.1rem' }}>
          <div className="sa-kpi-top" style={{ marginBottom: '0.4rem' }}>
            <div>
              <div className="sa-kpi-title">Deactivated</div>
              <div className="sa-kpi-value" style={{ fontSize: '1.6rem', color: '#ef4444' }}>{metrics.deactivated}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', width: '38px', height: '38px' }}>
              <Lock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Access Suspended</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="sa-card">
        {/* Table Controls (Filter Tabs & Search) */}
        <div className="sa-table-controls">
          <div className="sa-filter-tabs">
            <button 
              className={`sa-filter-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ALL')}
            >
              All Colleges
              <span className="sa-filter-tab-count">{colleges.length}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ACTIVE')}
            >
              Active
              <span className="sa-filter-tab-count">{metrics.active}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'TRIAL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('TRIAL')}
            >
              Free Trial
              <span className="sa-filter-tab-count">{metrics.trials}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'GRACE' ? 'active' : ''}`}
              onClick={() => setActiveFilter('GRACE')}
            >
              Grace Period
              <span className="sa-filter-tab-count">{metrics.grace}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'DEACTIVATED' ? 'active' : ''}`}
              onClick={() => setActiveFilter('DEACTIVATED')}
            >
              Deactivated
              <span className="sa-filter-tab-count">{metrics.deactivated}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="sa-btn sa-btn-outline" 
              onClick={() => setShowPasswords(!showPasswords)}
              style={{ padding: '8px 12px', fontSize: '0.78rem' }}
            >
              <Lock size={14} /> {showPasswords ? 'Hide Passwords' : 'Show Passwords'}
            </button>

            <div className="sa-search-box">
              <Search size={16} className="sa-search-icon" />
              <input 
                type="text" 
                placeholder="Search name, Tenant ID, email, city..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* The ERP Colleges Table */}
        <div className="sa-table-wrapper">
          <table className="sa-erp-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Institution & Tenant ID</th>
                <th style={{ width: '32%' }}>Administrator Credentials</th>
                <th style={{ width: '15%' }}>Plan & Status</th>
                <th style={{ width: '10%' }}>Users</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" color="#6366f1" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading registered institutions...</div>
                  </td>
                </tr>
              ) : filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Building2 size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No colleges match your criteria</p>
                    <span style={{ fontSize: '0.8rem' }}>Try clearing filters or search query.</span>
                  </td>
                </tr>
              ) : (
                filteredColleges.map((college) => {
                  const collegeName = college.name || college.collegeName || 'Unknown College';
                  const initial = collegeName.charAt(0).toUpperCase();
                  const plan = college.subscriptionPlan || 'Trial';
                  const status = college.subscriptionStatus || 'Active';
                  const isDeactivated = status === 'Deactivated';

                  return (
                    <tr key={college._id || college.tenantId}>
                      {/* Institution Column */}
                      <td>
                        <div className="sa-college-cell">
                          <div className="sa-college-avatar">
                            {initial}
                          </div>
                          <div>
                            <div 
                              className="sa-college-name"
                              onClick={() => {
                                setSelectedCollege(college);
                                setShowInspectModal(true);
                              }}
                              title="Click to view college profile"
                            >
                              {collegeName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="sa-tenant-id-pill">{college.tenantId || 'DEFAULT'}</span>
                              {college.city && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  &bull; {college.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Administrator & Principal Credentials */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Admin credential chip */}
                          <div style={{ 
                            background: 'rgba(99, 102, 241, 0.05)', 
                            border: '1px solid rgba(99, 102, 241, 0.18)', 
                            borderRadius: '8px', 
                            padding: '6px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>
                                Admin &bull; {college.adminName || 'Admin'}
                              </span>
                              <button 
                                onClick={() => copyToClipboard(`${college.email} / ${college.adminPassword || 'Admin@123'}`, `${college._id}_admin`)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                                title="Copy Admin Credentials"
                              >
                                {copiedKey === `${college._id}_admin` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontFamily: 'monospace' }}>{college.email}</span>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6366f1' }}>
                                {showPasswords ? (college.adminPassword || 'Admin@123') : '••••••••'}
                              </span>
                            </div>
                          </div>

                          {/* Principal credential chip if exists */}
                          {college.principalEmail && (
                            <div style={{ 
                              background: 'rgba(16, 185, 129, 0.05)', 
                              border: '1px solid rgba(16, 185, 129, 0.18)', 
                              borderRadius: '8px', 
                              padding: '6px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                                  Principal
                                </span>
                                <button 
                                  onClick={() => copyToClipboard(`${college.principalEmail} / ${college.principalPassword || 'Princ@123'}`, `${college._id}_princ`)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                                  title="Copy Principal Credentials"
                                >
                                  {copiedKey === `${college._id}_princ` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                </button>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'monospace' }}>{college.principalEmail}</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                                  {showPasswords ? (college.principalPassword || 'Princ@123') : '••••••••'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Plan & Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <span className={`sa-plan-badge ${
                            plan === 'Elite' || plan === 'Enterprise' ? 'sa-plan-elite' :
                            plan === 'Premium' ? 'sa-plan-premium' :
                            plan === 'Basic' || plan === 'Standard' ? 'sa-plan-basic' :
                            'sa-plan-trial'
                          }`} style={{ width: 'fit-content' }}>
                            <Crown size={12} />
                            {plan}
                          </span>

                          <span className={`sa-status-pill ${
                            status === 'Active' ? 'sa-status-active' :
                            status === 'Grace Period' ? 'sa-status-grace' :
                            'sa-status-deactivated'
                          }`} style={{ width: 'fit-content' }}>
                            <span className="sa-pulse-dot" style={{ 
                              width: '6px', 
                              height: '6px',
                              background: status === 'Active' ? '#10b981' : status === 'Grace Period' ? '#f59e0b' : '#ef4444'
                            }}></span>
                            {status}
                          </span>

                          {status === 'Active' && college.daysRemaining > 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {college.daysRemaining}d left
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Registered Users */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                          {college.totalUsers ? college.totalUsers.toLocaleString() : '1,200'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Students & Staff
                        </div>
                      </td>

                      {/* Action Controls */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => handleOpenInspect(college)}
                            title="Inspect Details"
                            style={{ 
                              padding: '6px 10px', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border-color)', 
                              background: 'var(--bg-primary)', 
                              color: 'var(--text-main)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 600
                            }}
                          >
                            <Eye size={14} />
                            Inspect
                          </button>

                          <button 
                            onClick={() => handleToggleStatus(college)}
                            title={isDeactivated ? "Reactivate College Access" : "Deactivate College"}
                            style={{ 
                              padding: '6px 12px', 
                              borderRadius: '8px', 
                              border: isDeactivated ? '1px solid #86efac' : '1px solid #fca5a5', 
                              background: isDeactivated ? '#dcfce7' : '#fee2e2', 
                              color: isDeactivated ? '#15803d' : '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}
                          >
                            {isDeactivated ? '⚡ Activate' : '⛔ Freeze'}
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

      {/* Deep-Dive Inspection & Edit Modal */}
      {showInspectModal && selectedCollege && (
        <div className="sa-modal-overlay" onClick={() => setShowInspectModal(false)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="sa-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={24} color="#6366f1" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedCollege.name || selectedCollege.collegeName}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Tenant ID: {selectedCollege.tenantId || 'DEFAULT'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #6366f1',
                    background: isEditing ? '#6366f1' : 'transparent',
                    color: isEditing ? '#ffffff' : '#6366f1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isEditing ? 'Cancel Edit' : '✏️ Edit College'}
                </button>
                <button 
                  onClick={() => setShowInspectModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="sa-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#6366f1', marginBottom: '4px' }}>
                    Institutional Profile Settings
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Official College Name
                    </label>
                    <input
                      type="text"
                      className="sa-input"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      placeholder="Enter exact college name"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Admin Name
                      </label>
                      <input
                        type="text"
                        className="sa-input"
                        value={editFormData.adminName}
                        onChange={(e) => setEditFormData({ ...editFormData, adminName: e.target.value })}
                        placeholder="Admin Full Name"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Admin Email
                      </label>
                      <input
                        type="email"
                        className="sa-input"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        placeholder="admin@college.edu"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Contact Phone
                      </label>
                      <input
                        type="text"
                        className="sa-input"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        placeholder="9876543210"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Principal Email
                      </label>
                      <input
                        type="email"
                        className="sa-input"
                        value={editFormData.principalEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, principalEmail: e.target.value })}
                        placeholder="principal@college.edu"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'rgba(99,102,241,0.04)', padding: '10px', borderRadius: '8px', border: '1px dashed rgba(99,102,241,0.2)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Subscription Plan
                      </label>
                      <select
                        className="sa-input"
                        value={editFormData.subscriptionPlan || 'Premium'}
                        onChange={(e) => {
                          const plan = e.target.value;
                          const defaultAmt = plan === 'Elite' ? 35000 : plan === 'Premium' ? 20000 : plan === 'Basic' ? 10000 : 25000;
                          setEditFormData({ 
                            ...editFormData, 
                            subscriptionPlan: plan,
                            subscriptionAmount: defaultAmt 
                          });
                        }}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 600 }}
                      >
                        <option value="Trial">Free Trial</option>
                        <option value="Basic">Starter Basic</option>
                        <option value="Premium">Premium Standard</option>
                        <option value="Elite">Enterprise Elite</option>
                        <option value="Custom">Custom Plan</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Plan Amount (₹)
                      </label>
                      <input
                        type="number"
                        className="sa-input"
                        value={editFormData.subscriptionAmount || 0}
                        onChange={(e) => setEditFormData({ ...editFormData, subscriptionAmount: Number(e.target.value) })}
                        placeholder="₹ Amount"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Billing Cycle
                      </label>
                      <select
                        className="sa-input"
                        value={editFormData.billingCycle || 'Monthly'}
                        onChange={(e) => setEditFormData({ ...editFormData, billingCycle: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 600 }}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Annually">Annually</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      className="sa-btn sa-btn-secondary"
                      onClick={() => setIsEditing(false)}
                      style={{ padding: '8px 14px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="sa-btn sa-btn-primary"
                      onClick={handleSaveCollegeEdit}
                      disabled={savingEdit}
                      style={{ padding: '8px 16px', background: '#6366f1', color: '#fff' }}
                    >
                      {savingEdit ? 'Saving...' : '💾 Save College Updates'}
                    </button>
                  </div>
                </div>
              ) : null}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subscription Plan</div>
                  <div style={{ fontWeight: 700, color: '#6366f1', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Crown size={15} />
                    {selectedCollege.subscriptionPlan || 'Trial'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Fee & Billing</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {selectedCollege.subscriptionPlan === 'Trial' ? '₹0 (Free)' : `₹${(selectedCollege.subscriptionAmount || 20000).toLocaleString('en-IN')}/${(selectedCollege.billingCycle || 'Monthly').slice(0,2).toLowerCase()}`}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Account Status</div>
                  <div style={{ fontWeight: 700, color: selectedCollege.subscriptionStatus === 'Active' ? '#10b981' : '#ef4444', fontSize: '0.95rem' }}>
                    {selectedCollege.subscriptionStatus || 'Active'}
                  </div>
                </div>
              </div>

              {/* Admin Credentials Card */}
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '14px', borderRadius: '12px' }}>
                <strong style={{ fontSize: '0.85rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Lock size={14} /> Administrator Credentials
                </strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span>Email: <strong style={{ color: 'var(--text-main)' }}>{selectedCollege.email || 'admin@college.edu'}</strong></span>
                    <button 
                      onClick={() => copyToClipboard(selectedCollege.email, 'admin_email_modal')} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {copiedKey === 'admin_email_modal' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <span>Password: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                      {selectedCollege.adminPassword || 'Admin@123'}
                    </strong></span>
                    <button 
                      onClick={() => copyToClipboard(selectedCollege.adminPassword || 'Admin@123', 'admin_pass_modal')} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {copiedKey === 'admin_pass_modal' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Principal Credentials */}
              {selectedCollege.principalEmail && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '14px', borderRadius: '12px' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <ShieldCheck size={14} /> Principal Credentials
                  </strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span>Email: <strong style={{ color: 'var(--text-main)' }}>{selectedCollege.principalEmail}</strong></span>
                      <button 
                        onClick={() => copyToClipboard(selectedCollege.principalEmail, 'princ_email_modal')} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {copiedKey === 'princ_email_modal' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span>Password: <strong style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                        {selectedCollege.principalPassword || 'Princ@123'}
                      </strong></span>
                      <button 
                        onClick={() => copyToClipboard(selectedCollege.principalPassword || 'Princ@123', 'princ_pass_modal')} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {copiedKey === 'princ_pass_modal' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Module Matrix */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} color="#6366f1" /> Provisioned ERP Modules
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.78rem' }}>
                  {['Admissions & Fees', 'Live Attendance', 'Exams & Marks', 'Timetable & Classes', 'Hostel & Mess', 'Transport GPS', 'Library System', 'Staff Payroll', 'Parent Portal'].map(module => (
                    <div key={module} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>{module}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sa-modal-footer">
              <button 
                className="sa-btn sa-btn-secondary" 
                onClick={() => setShowInspectModal(false)}
              >
                Close
              </button>
              <button 
                className="sa-btn sa-btn-primary" 
                onClick={() => {
                  setShowInspectModal(false);
                  navigate('/superadmin/subscriptions');
                }}
              >
                Manage Subscription &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminColleges;
