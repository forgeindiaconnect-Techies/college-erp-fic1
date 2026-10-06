import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Search, 
  RefreshCw, 
  ArrowUpRight, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Ban, 
  Eye, 
  CreditCard, 
  Sparkles, 
  ShieldCheck, 
  X, 
  Zap,
  Clock,
  Download
} from 'lucide-react';
import { getSuperAdminSubscriptions, upgradeSubscription, renewSubscription, cancelSubscription } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';
import './SuperAdminDashboard.css';

const SuperAdminSubscriptions = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlanFilter, setActivePlanFilter] = useState('ALL');

  // Action Modals
  const [modalState, setModalState] = useState({ isOpen: false, type: 'warning', title: '', message: '', action: null, collegeId: null, collegeName: null, selectedPlan: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetCollegeForUpgrade, setTargetCollegeForUpgrade] = useState(null);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState('Elite');
  const [selectedBillingDetails, setSelectedBillingDetails] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setRefreshing(true);
      const res = await getSuperAdminSubscriptions();
      if (res && res.data) {
        setColleges(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const metrics = useMemo(() => {
    const total = colleges.length;
    const active = colleges.filter(c => (c.status || 'Active') === 'Active').length;
    const elite = colleges.filter(c => (c.planName || '').toLowerCase().includes('elite')).length;
    const premium = colleges.filter(c => (c.planName || '').toLowerCase().includes('premium')).length;
    const basic = colleges.filter(c => (c.planName || '').toLowerCase().includes('basic') || (c.planName || '').toLowerCase().includes('standard')).length;
    const trials = colleges.filter(c => (c.planName || '').toLowerCase().includes('trial')).length;
    const expiringSoon = colleges.filter(c => c.daysRemaining && c.daysRemaining <= 15 && c.daysRemaining > 0).length;

    // Estimate MRR
    const mrr = (elite * 35000) + (premium * 20000) + (basic * 10000);

    return { total, active, elite, premium, basic, trials, expiringSoon, mrr };
  }, [colleges]);

  const handleActionClick = (action, collegeId, collegeName, currentPlan) => {
    if (action === 'Upgrade Plan') {
      const college = colleges.find(c => c._id === collegeId);
      setTargetCollegeForUpgrade(college || { _id: collegeId, collegeName, planName: currentPlan });
      setSelectedUpgradePlan(currentPlan === 'Basic' ? 'Premium' : 'Elite');
      setShowUpgradeModal(true);
      return;
    }

    if (action === 'View Details') {
      const college = colleges.find(c => c._id === collegeId);
      setSelectedBillingDetails(college || { collegeName, planName: currentPlan });
      return;
    }

    let title = '';
    let message = '';
    let type = 'warning';

    if (action === 'Renew Plan') {
      title = 'Renew College Subscription';
      message = `Renew ${collegeName}'s current subscription for an additional 30 billing days?`;
      type = 'info';
    } else if (action === 'Cancel Plan') {
      title = 'Cancel Subscription';
      message = `Are you sure you want to cancel ${collegeName}'s subscription? The college will enter grace period immediately.`;
      type = 'danger';
    }

    setModalState({ isOpen: true, type, title, message, action, collegeId, collegeName });
  };

  const executeAction = async () => {
    const { action, collegeId, collegeName } = modalState;
    try {
      if (action === 'Renew Plan') {
        await renewSubscription(collegeId);
        setSuccessModal({ isOpen: true, title: 'Subscription Renewed', message: `Successfully renewed subscription for ${collegeName} by 30 days.` });
      } else if (action === 'Cancel Plan') {
        await cancelSubscription(collegeId);
        setSuccessModal({ isOpen: true, title: 'Subscription Cancelled', message: `Subscription for ${collegeName} has been cancelled.` });
      }
      fetchSubscriptions();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setSuccessModal({ isOpen: true, title: 'Error', message: `Failed to perform ${action}. Please try again.` });
    }
  };

  const handleConfirmUpgrade = async () => {
    if (!targetCollegeForUpgrade) return;
    try {
      await upgradeSubscription(targetCollegeForUpgrade._id, selectedUpgradePlan);
      setShowUpgradeModal(false);
      setSuccessModal({ 
        isOpen: true, 
        title: 'Plan Upgraded Successfully!', 
        message: `${targetCollegeForUpgrade.collegeName || 'College'} upgraded to ${selectedUpgradePlan} plan.` 
      });
      fetchSubscriptions();
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to upgrade subscription plan.');
    }
  };

  const filteredColleges = useMemo(() => {
    return colleges.filter(c => {
      const name = (c.collegeName || c.name || '').toLowerCase();
      const plan = (c.planName || '').toLowerCase();
      const status = (c.status || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matches = !query || name.includes(query) || plan.includes(query) || status.includes(query);
      if (!matches) return false;

      if (activePlanFilter === 'ALL') return true;
      if (activePlanFilter === 'ELITE') return plan.includes('elite') || plan.includes('enterprise');
      if (activePlanFilter === 'PREMIUM') return plan.includes('premium');
      if (activePlanFilter === 'BASIC') return plan.includes('basic') || plan.includes('standard');
      if (activePlanFilter === 'TRIAL') return plan.includes('trial');
      if (activePlanFilter === 'EXPIRING') return c.daysRemaining && c.daysRemaining <= 15;

      return true;
    });
  }, [colleges, searchQuery, activePlanFilter]);

  return (
    <div className="sa-dashboard animate-fade-in">
      <ConfirmModal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })} 
        onConfirm={executeAction}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
      <ConfirmModal 
        isOpen={successModal.isOpen} 
        onClose={() => setSuccessModal({ ...successModal, isOpen: false })} 
        title={successModal.title}
        message={successModal.message}
        type={successModal.type}
      />

      {/* Header */}
      <div className="sa-header">
        <div className="sa-header-title-area">
          <div className="sa-badge-cluster">
            <span className="sa-pulse-dot"></span>
            <span>SaaS Tier & Billing Matrix</span>
          </div>
          <h1 className="sa-header-title">
            <Crown size={28} color="#f59e0b" />
            Subscription & License Management
          </h1>
          <p className="sa-header-subtitle">
            Oversee recurring institutional plans, upgrade requests, auto-renewals, and license lifecycle.
          </p>
        </div>

        <div className="sa-header-actions">
          <button 
            className="sa-btn sa-btn-secondary" 
            onClick={fetchSubscriptions}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Subscriptions'}
          </button>

          <button 
            className="sa-btn sa-btn-primary" 
            onClick={() => navigate('/superadmin/colleges')}
          >
            <Zap size={16} />
            Manage Colleges &rarr;
          </button>
        </div>
      </div>

      {/* Subscription KPI Cards */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Active Paid Subscriptions</div>
              <div className="sa-kpi-value">{metrics.active}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <ShieldCheck size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              <CheckCircle2 size={14} /> 100% Verified
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{metrics.total} Total Tenancies</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Monthly Run-Rate (MRR)</div>
              <div className="sa-kpi-value">₹{(metrics.mrr / 100000).toFixed(1)}L</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}>
              <CreditCard size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              <ArrowUpRight size={14} /> Recurring Monthly
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Elite: {metrics.elite} | Prem: {metrics.premium}</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Expiring In &lt; 15 Days</div>
              <div className="sa-kpi-value" style={{ color: metrics.expiringSoon > 0 ? '#f59e0b' : 'var(--text-main)' }}>
                {metrics.expiringSoon}
              </div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Clock size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-urgent">
              <AlertCircle size={14} /> Requires Renewal Notice
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Automated Reminders</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Active Trials</div>
              <div className="sa-kpi-value">{metrics.trials}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
              <Sparkles size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <button 
              onClick={() => navigate('/superadmin/trials')} 
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Manage Trials Pipeline &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Main Subscriptions Table Card */}
      <div className="sa-card">
        <div className="sa-table-controls">
          <div className="sa-filter-tabs">
            <button 
              className={`sa-filter-tab ${activePlanFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('ALL')}
            >
              All Plans
              <span className="sa-filter-tab-count">{colleges.length}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activePlanFilter === 'ELITE' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('ELITE')}
            >
              Enterprise / Elite
              <span className="sa-filter-tab-count">{metrics.elite}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activePlanFilter === 'PREMIUM' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('PREMIUM')}
            >
              Premium
              <span className="sa-filter-tab-count">{metrics.premium}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activePlanFilter === 'BASIC' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('BASIC')}
            >
              Starter / Basic
              <span className="sa-filter-tab-count">{metrics.basic}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activePlanFilter === 'EXPIRING' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('EXPIRING')}
            >
              Expiring Soon (&lt;15d)
              <span className="sa-filter-tab-count">{metrics.expiringSoon}</span>
            </button>
          </div>

          <div className="sa-search-box">
            <Search size={16} className="sa-search-icon" />
            <input 
              type="text" 
              placeholder="Search college, plan, status..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="sa-table-wrapper">
          <table className="sa-erp-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Institution Name</th>
                <th style={{ width: '18%' }}>Subscription Plan</th>
                <th style={{ width: '15%' }}>License Status</th>
                <th style={{ width: '20%' }}>Expiry & Lifecycle</th>
                <th style={{ width: '17%', textAlign: 'center' }}>License Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" color="#6366f1" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading subscription ledger...</div>
                  </td>
                </tr>
              ) : filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <Crown size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No subscriptions found</p>
                    <span style={{ fontSize: '0.8rem' }}>Try clearing filters or search query.</span>
                  </td>
                </tr>
              ) : (
                filteredColleges.map((college) => {
                  const collegeName = college.collegeName || college.name || 'Unknown College';
                  const plan = college.planName || 'Trial';
                  const status = college.status || 'Active';
                  const expiryStr = college.endDate ? new Date(college.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Continuous';
                  const daysLeft = college.daysRemaining || (plan === 'Trial' ? 14 : 30);

                  return (
                    <tr key={college._id || college.collegeId}>
                      {/* College Name */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '2px' }}>
                          {collegeName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          Tenant: {college.tenantId || college._id?.slice(-8) || 'TENANT-ID'}
                        </div>
                      </td>

                      {/* Plan Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`sa-plan-badge ${
                            plan === 'Elite' || plan === 'Enterprise' ? 'sa-plan-elite' :
                            plan === 'Premium' ? 'sa-plan-premium' :
                            plan === 'Basic' || plan === 'Standard' ? 'sa-plan-basic' :
                            'sa-plan-trial'
                          }`}>
                            <Crown size={13} />
                            {plan}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {plan === 'Elite' ? '₹35,000/m' : plan === 'Premium' ? '₹20,000/m' : plan === 'Basic' ? '₹10,000/m' : 'Free Trial'}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`sa-status-pill ${
                          status === 'Active' ? 'sa-status-active' :
                          status === 'Grace Period' ? 'sa-status-grace' :
                          'sa-status-deactivated'
                        }`}>
                          <span className="sa-pulse-dot" style={{ 
                            width: '6px', 
                            height: '6px',
                            background: status === 'Active' ? '#10b981' : status === 'Grace Period' ? '#f59e0b' : '#ef4444'
                          }}></span>
                          {status}
                        </span>
                      </td>

                      {/* Expiry Date */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            <Calendar size={14} color="#6366f1" />
                            {expiryStr}
                          </div>
                          {daysLeft > 0 && (
                            <div style={{ fontSize: '0.75rem', color: daysLeft <= 10 ? '#f59e0b' : 'var(--text-muted)' }}>
                              {daysLeft} days remaining
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => handleActionClick('Upgrade Plan', college._id, collegeName, plan)}
                            title="Upgrade Subscription Plan" 
                            style={{ 
                              background: 'rgba(99,102,241,0.1)', 
                              color: '#6366f1', 
                              border: '1px solid rgba(99,102,241,0.2)', 
                              padding: '6px 10px', 
                              borderRadius: '8px', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}
                          >
                            <ArrowUpRight size={14} /> Upgrade
                          </button>

                          <button 
                            onClick={() => handleActionClick('Renew Plan', college._id, collegeName, plan)}
                            title="Renew +30 Days" 
                            style={{ 
                              background: 'rgba(16,185,129,0.1)', 
                              color: '#10b981', 
                              border: '1px solid rgba(16,185,129,0.2)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <RefreshCw size={14} />
                          </button>

                          <button 
                            onClick={() => handleActionClick('Cancel Plan', college._id, collegeName, plan)}
                            title="Cancel / Suspend" 
                            style={{ 
                              background: 'rgba(239,68,68,0.1)', 
                              color: '#ef4444', 
                              border: '1px solid rgba(239,68,68,0.2)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Ban size={14} />
                          </button>

                          <button 
                            onClick={() => handleActionClick('View Details', college._id, collegeName, plan)}
                            title="View Invoicing & Specs" 
                            style={{ 
                              background: 'var(--bg-primary)', 
                              color: 'var(--text-muted)', 
                              border: '1px solid var(--border-color)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Eye size={14} />
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

      {/* Upgrade Plan Modal */}
      {showUpgradeModal && targetCollegeForUpgrade && (
        <div className="sa-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Crown size={22} color="#f59e0b" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Upgrade Plan for {targetCollegeForUpgrade.collegeName || 'Institution'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Select new institutional licensing tier
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sa-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Elite Card */}
                <div 
                  onClick={() => setSelectedUpgradePlan('Elite')}
                  style={{
                    border: selectedUpgradePlan === 'Elite' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                    background: selectedUpgradePlan === 'Elite' ? 'rgba(99,102,241,0.06)' : 'var(--bg-primary)',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Crown size={18} color="#6366f1" />
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>Enterprise Elite Plan</strong>
                    </div>
                    <strong style={{ color: '#6366f1', fontSize: '1rem' }}>₹35,000 / mo</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Unlimited Students, Staff, Full Transport GPS, Automated Marks Grading, Custom Domain, 24/7 Dedicated Support.
                  </p>
                </div>

                {/* Premium Card */}
                <div 
                  onClick={() => setSelectedUpgradePlan('Premium')}
                  style={{
                    border: selectedUpgradePlan === 'Premium' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    background: selectedUpgradePlan === 'Premium' ? 'rgba(59,130,246,0.06)' : 'var(--bg-primary)',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={18} color="#3b82f6" />
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>Premium Standard</strong>
                    </div>
                    <strong style={{ color: '#3b82f6', fontSize: '1rem' }}>₹20,000 / mo</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Up to 5,000 Students, Multi-Department Attendance, Fees Gateway, Library & Hostel, Standard Support.
                  </p>
                </div>

                {/* Basic Card */}
                <div 
                  onClick={() => setSelectedUpgradePlan('Basic')}
                  style={{
                    border: selectedUpgradePlan === 'Basic' ? '2px solid #10b981' : '1px solid var(--border-color)',
                    background: selectedUpgradePlan === 'Basic' ? 'rgba(16,185,129,0.06)' : 'var(--bg-primary)',
                    borderRadius: '12px',
                    padding: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={18} color="#10b981" />
                      <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>Starter Basic</strong>
                    </div>
                    <strong style={{ color: '#10b981', fontSize: '1rem' }}>₹10,000 / mo</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Up to 1,500 Students, Core Admissions, Timetable, Daily Attendance, Standard Billing.
                  </p>
                </div>
              </div>
            </div>

            <div className="sa-modal-footer">
              <button 
                className="sa-btn sa-btn-secondary" 
                onClick={() => setShowUpgradeModal(false)}
              >
                Cancel
              </button>
              <button 
                className="sa-btn sa-btn-primary" 
                onClick={handleConfirmUpgrade}
              >
                Confirm Upgrade to {selectedUpgradePlan}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Billing Specs Modal */}
      {selectedBillingDetails && (
        <div className="sa-modal-overlay" onClick={() => setSelectedBillingDetails(null)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={22} color="#6366f1" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Billing & License Breakdown
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {selectedBillingDetails.collegeName || 'College'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBillingDetails(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sa-modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Current Tier:</span>
                  <strong style={{ color: '#6366f1' }}>{selectedBillingDetails.planName || 'Elite'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Recurring Rate:</span>
                  <strong>{selectedBillingDetails.planName === 'Elite' ? '₹35,000 / month' : '₹20,000 / month'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Auto-Renewal Status:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 Enabled</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Payment Gateway:</span>
                  <span>Razorpay Enterprise Auto-Debit</span>
                </div>
              </div>
            </div>

            <div className="sa-modal-footer">
              <button 
                className="sa-btn sa-btn-secondary" 
                onClick={() => setSelectedBillingDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminSubscriptions;
