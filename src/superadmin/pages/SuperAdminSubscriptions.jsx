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
import { 
  getSuperAdminSubscriptions, 
  upgradeSubscription, 
  renewSubscription, 
  cancelSubscription,
  approveSubscription,
  suspendSubscription
} from '../../api';
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
  const [customUpgradeAmount, setCustomUpgradeAmount] = useState(35000);
  const [upgradeBillingCycle, setUpgradeBillingCycle] = useState('Monthly');
  const [upgradeDurationMonths, setUpgradeDurationMonths] = useState(1);
  const [selectedBillingDetails, setSelectedBillingDetails] = useState(null);

  const PLAN_DEFAULT_RATES = {
    Elite: 35000,
    Premium: 20000,
    Basic: 10000,
    Starter: 10000,
    Custom: 25000
  };

  const handleSelectUpgradeTier = (tier) => {
    setSelectedUpgradePlan(tier);
    setCustomUpgradeAmount(PLAN_DEFAULT_RATES[tier] || 20000);
  };

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
    const pendingApproval = colleges.filter(c => (c.status || '') === 'Pending Approval').length;
    const active = colleges.filter(c => (c.status || 'Active') === 'Active').length;
    const suspended = colleges.filter(c => (c.status || '') === 'Suspended' || (c.status || '') === 'Cancelled').length;
    const elite = colleges.filter(c => (c.planName || '').toLowerCase().includes('elite')).length;
    const premium = colleges.filter(c => (c.planName || '').toLowerCase().includes('premium')).length;
    const basic = colleges.filter(c => (c.planName || '').toLowerCase().includes('basic') || (c.planName || '').toLowerCase().includes('standard') || (c.planName || '').toLowerCase().includes('starter')).length;
    const trials = colleges.filter(c => (c.planName || '').toLowerCase().includes('trial')).length;
    const expiringSoon = colleges.filter(c => c.daysRemaining && c.daysRemaining <= 15 && c.daysRemaining > 0).length;

    // Calculate actual configured MRR across institutions
    const mrr = colleges.reduce((acc, c) => {
      const plan = (c.planName || '').toLowerCase();
      if (plan.includes('trial')) return acc;
      const amt = c.amount || (plan.includes('elite') ? 35000 : plan.includes('premium') ? 20000 : 10000);
      return acc + (c.billingCycle === 'Annually' ? Math.round(amt / 12) : amt);
    }, 0);

    return { total, pendingApproval, active, suspended, elite, premium, basic, trials, expiringSoon, mrr };
  }, [colleges]);

  const handleActionClick = (action, collegeId, collegeName, currentPlan) => {
    if (action === 'Upgrade Plan') {
      const college = colleges.find(c => c._id === collegeId);
      const currentTier = currentPlan || college?.planName || 'Premium';
      setTargetCollegeForUpgrade(college || { _id: collegeId, collegeName, planName: currentPlan });
      setSelectedUpgradePlan(currentTier === 'Trial' ? 'Premium' : currentTier);
      setCustomUpgradeAmount(college?.amount || PLAN_DEFAULT_RATES[currentTier] || 20000);
      setUpgradeBillingCycle(college?.billingCycle || 'Monthly');
      setUpgradeDurationMonths(college?.billingCycle === 'Annually' ? 12 : 1);
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

    if (action === 'Approve Plan') {
      title = 'Approve & Activate Subscription';
      message = `Approve ${collegeName}'s registration and activate their ${currentPlan || 'selected'} subscription? Portal access will be granted immediately.`;
      type = 'success';
    } else if (action === 'Suspend Plan') {
      title = 'Suspend Subscription';
      message = `Are you sure you want to suspend ${collegeName}'s subscription? System access will be temporarily locked.`;
      type = 'warning';
    } else if (action === 'Renew Plan') {
      title = 'Renew College Subscription';
      message = `Renew ${collegeName}'s current subscription for an additional 30 billing days?`;
      type = 'info';
    } else if (action === 'Cancel Plan') {
      title = 'Cancel Subscription';
      message = `Are you sure you want to cancel ${collegeName}'s subscription? The college access will be cancelled.`;
      type = 'danger';
    }

    setModalState({ isOpen: true, type, title, message, action, collegeId, collegeName, selectedPlan: currentPlan });
  };

  const executeAction = async () => {
    const { action, collegeId, collegeName } = modalState;
    try {
      if (action === 'Approve Plan') {
        await approveSubscription(collegeId);
        setSuccessModal({ isOpen: true, title: 'Subscription Approved', message: `Successfully approved and activated subscription for ${collegeName}.` });
      } else if (action === 'Suspend Plan') {
        await suspendSubscription(collegeId);
        setSuccessModal({ isOpen: true, title: 'Subscription Suspended', message: `Subscription for ${collegeName} has been suspended.` });
      } else if (action === 'Renew Plan') {
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
      const collegeId = targetCollegeForUpgrade._id || targetCollegeForUpgrade.collegeId || targetCollegeForUpgrade.id;
      await upgradeSubscription(collegeId, {
        planName: selectedUpgradePlan,
        amount: Number(customUpgradeAmount) || 0,
        billingCycle: upgradeBillingCycle,
        durationMonths: Number(upgradeDurationMonths) || 1
      });
      setShowUpgradeModal(false);
      setSuccessModal({ 
        isOpen: true, 
        title: 'Plan & Pricing Updated Successfully!', 
        message: `${targetCollegeForUpgrade.collegeName || 'College'} has been updated to ${selectedUpgradePlan} plan at ₹${Number(customUpgradeAmount).toLocaleString('en-IN')}/${upgradeBillingCycle.toLowerCase()}.` 
      });
      fetchSubscriptions();
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert(error.response?.data?.message || 'Failed to update subscription plan.');
    }
  };

  const filteredColleges = useMemo(() => {
    return colleges.filter(c => {
      const name = (c.collegeName || c.name || '').toLowerCase();
      const plan = (c.planName || '').toLowerCase();
      const status = (c.status || '').toLowerCase();
      const tenant = (c.tenantId || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matches = !query || name.includes(query) || plan.includes(query) || status.includes(query) || tenant.includes(query) || email.includes(query);
      if (!matches) return false;

      if (activePlanFilter === 'ALL') return true;
      if (activePlanFilter === 'PENDING') return status === 'pending approval';
      if (activePlanFilter === 'ACTIVE') return status === 'active';
      if (activePlanFilter === 'SUSPENDED') return status === 'suspended' || status === 'cancelled';
      if (activePlanFilter === 'ELITE') return plan.includes('elite') || plan.includes('enterprise');
      if (activePlanFilter === 'PREMIUM') return plan.includes('premium');
      if (activePlanFilter === 'BASIC') return plan.includes('basic') || plan.includes('standard') || plan.includes('starter');
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
              className={`sa-filter-tab ${activePlanFilter === 'PENDING' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('PENDING')}
              style={metrics.pendingApproval > 0 ? { color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' } : {}}
            >
              Pending Approval
              <span className="sa-filter-tab-count" style={metrics.pendingApproval > 0 ? { background: '#f59e0b', color: '#000' } : {}}>
                {metrics.pendingApproval}
              </span>
            </button>

            <button 
              className={`sa-filter-tab ${activePlanFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('ACTIVE')}
            >
              Active
              <span className="sa-filter-tab-count">{metrics.active}</span>
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
              className={`sa-filter-tab ${activePlanFilter === 'SUSPENDED' ? 'active' : ''}`}
              onClick={() => setActivePlanFilter('SUSPENDED')}
            >
              Suspended / Cancelled
              <span className="sa-filter-tab-count">{metrics.suspended}</span>
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
              placeholder="Search college, tenant ID, email, plan, status..." 
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
                <th style={{ width: '25%' }}>Institution & Client</th>
                <th style={{ width: '17%' }}>Subscription Plan</th>
                <th style={{ width: '13%' }}>Payment Status</th>
                <th style={{ width: '14%' }}>Subscription Status</th>
                <th style={{ width: '14%' }}>Dates & Renewal</th>
                <th style={{ width: '17%', textAlign: 'center' }}>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" color="#6366f1" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading subscription ledger...</div>
                  </td>
                </tr>
              ) : filteredColleges.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
                  const paymentStatus = college.paymentStatus || (status === 'Active' && plan !== 'Trial' ? 'Paid' : 'Pending');
                  const expiryStr = college.endDate ? new Date(college.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Continuous';
                  const startStr = college.startDate ? new Date(college.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (college.createdAt ? new Date(college.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A');
                  const regDateStr = college.createdAt ? new Date(college.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
                  const daysLeft = college.daysRemaining || (plan === 'Trial' ? 14 : 30);

                  return (
                    <tr key={college._id || college.collegeId}>
                      {/* Institution & Client */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '2px' }}>
                          {collegeName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
                          <span style={{ fontSize: '0.72rem', background: 'rgba(99,102,241,0.12)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700 }}>
                            {college.tenantId || college._id?.slice(-8) || 'COL-ID'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Reg: {regDateStr}
                          </span>
                        </div>
                        {(college.adminName || college.email) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {college.adminName && <strong>{college.adminName}</strong>}
                            {college.email && <span> &bull; {college.email}</span>}
                            {college.phone && <span> &bull; {college.phone}</span>}
                          </div>
                        )}
                      </td>

                      {/* Plan Name & Price */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`sa-plan-badge ${
                              plan === 'Elite' || plan === 'Enterprise' ? 'sa-plan-elite' :
                              plan === 'Premium' ? 'sa-plan-premium' :
                              plan === 'Basic' || plan === 'Standard' || plan === 'Starter' ? 'sa-plan-basic' :
                              plan === 'Custom' ? 'sa-plan-custom' :
                              'sa-plan-trial'
                            }`}>
                              <Crown size={12} />
                              {plan}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 700 }}>
                            {plan === 'Trial' ? '₹0 (Free Trial)' : `₹${(college.amount || (plan === 'Elite' ? 35000 : plan === 'Premium' ? 20000 : 10000)).toLocaleString('en-IN')}`}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {' '}/{college.billingCycle || 'Monthly'}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.12)' : paymentStatus === 'Failed' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                          color: paymentStatus === 'Paid' ? '#10b981' : paymentStatus === 'Failed' ? '#ef4444' : '#f59e0b',
                          border: `1px solid ${paymentStatus === 'Paid' ? 'rgba(16, 185, 129, 0.3)' : paymentStatus === 'Failed' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {paymentStatus === 'Paid' ? <CheckCircle2 size={12} /> : paymentStatus === 'Failed' ? <AlertCircle size={12} /> : <Clock size={12} />}
                          {paymentStatus}
                        </span>
                      </td>

                      {/* Subscription Status */}
                      <td>
                        <span className={`sa-status-pill ${
                          status === 'Active' ? 'sa-status-active' :
                          status === 'Pending Approval' ? 'sa-status-grace' :
                          status === 'Grace Period' ? 'sa-status-grace' :
                          'sa-status-deactivated'
                        }`}>
                          <span className="sa-pulse-dot" style={{ 
                            width: '6px', 
                            height: '6px',
                            background: status === 'Active' ? '#10b981' : (status === 'Pending Approval' || status === 'Grace Period') ? '#f59e0b' : '#ef4444'
                          }}></span>
                          {status}
                        </span>
                      </td>

                      {/* Dates & Expiry */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-main)', fontWeight: 600 }}>
                            <Calendar size={13} color="#6366f1" />
                            <span>Exp: {expiryStr}</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Start: {startStr}
                          </div>
                          {daysLeft > 0 && status === 'Active' && (
                            <div style={{ fontSize: '0.72rem', color: daysLeft <= 10 ? '#f59e0b' : 'var(--text-muted)' }}>
                              {daysLeft} days left
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Management Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {/* Approve Action for Pending Approval or Suspended */}
                          {(status === 'Pending Approval' || status === 'Suspended') && (
                            <button 
                              onClick={() => handleActionClick('Approve Plan', college._id, collegeName, plan)}
                              title="Approve & Activate Subscription" 
                              style={{ 
                                background: 'rgba(16,185,129,0.15)', 
                                color: '#10b981', 
                                border: '1px solid rgba(16,185,129,0.3)', 
                                padding: '5px 8px', 
                                borderRadius: '6px', 
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700
                              }}
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                          )}

                          <button 
                            onClick={() => handleActionClick('Upgrade Plan', college._id, collegeName, plan)}
                            title="Change Subscription Plan & Amount" 
                            style={{ 
                              background: 'rgba(99,102,241,0.1)', 
                              color: '#6366f1', 
                              border: '1px solid rgba(99,102,241,0.2)', 
                              padding: '5px 8px', 
                              borderRadius: '6px', 
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <ArrowUpRight size={13} /> Plan
                          </button>

                          <button 
                            onClick={() => handleActionClick('Renew Plan', college._id, collegeName, plan)}
                            title="Renew +30 Days" 
                            style={{ 
                              background: 'rgba(16,185,129,0.1)', 
                              color: '#10b981', 
                              border: '1px solid rgba(16,185,129,0.2)', 
                              padding: '5px 7px', 
                              borderRadius: '6px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <RefreshCw size={13} />
                          </button>

                          {status === 'Active' && (
                            <button 
                              onClick={() => handleActionClick('Suspend Plan', college._id, collegeName, plan)}
                              title="Suspend Subscription" 
                              style={{ 
                                background: 'rgba(245,158,11,0.1)', 
                                color: '#f59e0b', 
                                border: '1px solid rgba(245,158,11,0.2)', 
                                padding: '5px 7px', 
                                borderRadius: '6px', 
                                cursor: 'pointer' 
                              }}
                            >
                              <AlertCircle size={13} />
                            </button>
                          )}

                          <button 
                            onClick={() => handleActionClick('Cancel Plan', college._id, collegeName, plan)}
                            title="Cancel Subscription" 
                            style={{ 
                              background: 'rgba(239,68,68,0.1)', 
                              color: '#ef4444', 
                              border: '1px solid rgba(239,68,68,0.2)', 
                              padding: '5px 7px', 
                              borderRadius: '6px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Ban size={13} />
                          </button>

                          <button 
                            onClick={() => handleActionClick('View Details', college._id, collegeName, plan)}
                            title="View Invoicing & Specs" 
                            style={{ 
                              background: 'var(--bg-primary)', 
                              color: 'var(--text-muted)', 
                              border: '1px solid var(--border-color)', 
                              padding: '5px 7px', 
                              borderRadius: '6px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Eye size={13} />
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
          <div className="sa-modal-card" style={{ maxWidth: '600px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Crown size={22} color="#6366f1" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Change Plan & Pricing for {targetCollegeForUpgrade.collegeName || 'Institution'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Select institutional tier and customize the exact subscription fee
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

            <div className="sa-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
              {/* Step 1: Select Tier */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                  1. Select Subscription Tier
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {/* Elite */}
                  <div 
                    onClick={() => handleSelectUpgradeTier('Elite')}
                    style={{
                      border: selectedUpgradePlan === 'Elite' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                      background: selectedUpgradePlan === 'Elite' ? 'rgba(99,102,241,0.08)' : 'var(--bg-primary)',
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Enterprise Elite</strong>
                      <span style={{ color: '#6366f1', fontSize: '0.78rem', fontWeight: 800 }}>₹35,000/mo</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Unlimited students & AI features</span>
                  </div>

                  {/* Premium */}
                  <div 
                    onClick={() => handleSelectUpgradeTier('Premium')}
                    style={{
                      border: selectedUpgradePlan === 'Premium' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                      background: selectedUpgradePlan === 'Premium' ? 'rgba(59,130,246,0.08)' : 'var(--bg-primary)',
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Premium Standard</strong>
                      <span style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: 800 }}>₹20,000/mo</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Up to 5,000 students, full ERP</span>
                  </div>

                  {/* Basic */}
                  <div 
                    onClick={() => handleSelectUpgradeTier('Basic')}
                    style={{
                      border: selectedUpgradePlan === 'Basic' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      background: selectedUpgradePlan === 'Basic' ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Starter Basic</strong>
                      <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 800 }}>₹10,000/mo</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Up to 1,500 students, core modules</span>
                  </div>

                  {/* Custom */}
                  <div 
                    onClick={() => handleSelectUpgradeTier('Custom')}
                    style={{
                      border: selectedUpgradePlan === 'Custom' ? '2px solid #f59e0b' : '1px solid var(--border-color)',
                      background: selectedUpgradePlan === 'Custom' ? 'rgba(245,158,11,0.08)' : 'var(--bg-primary)',
                      borderRadius: '10px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Custom Plan</strong>
                      <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 800 }}>Custom Price</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Tailored terms and negotiated rate</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Custom Amount & Pricing */}
              <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>2. Plan Pricing / Amount</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500 }}>Editable by Super Admin</span>
                </label>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '1rem' }}>₹</span>
                    <input 
                      type="number"
                      value={customUpgradeAmount}
                      onChange={(e) => setCustomUpgradeAmount(Number(e.target.value))}
                      placeholder="Enter plan amount"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 30px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-main)',
                        fontWeight: 700,
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[10000, 20000, 35000, 50000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCustomUpgradeAmount(amt)}
                        style={{
                          background: customUpgradeAmount === amt ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                          color: customUpgradeAmount === amt ? '#fff' : 'var(--text-muted)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        ₹{(amt/1000)}k
                      </button>
                    ))}
                  </div>
                </div>

                {/* Billing Cycle */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
                  {[
                    { id: 'Monthly', label: 'Monthly', months: 1 },
                    { id: 'Quarterly', label: 'Quarterly (3 Mo)', months: 3 },
                    { id: 'Annually', label: 'Annual (12 Mo)', months: 12 }
                  ].map(cycle => (
                    <button
                      key={cycle.id}
                      type="button"
                      onClick={() => {
                        setUpgradeBillingCycle(cycle.id);
                        setUpgradeDurationMonths(cycle.months);
                      }}
                      style={{
                        background: upgradeBillingCycle === cycle.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                        color: upgradeBillingCycle === cycle.id ? '#6366f1' : 'var(--text-muted)',
                        border: upgradeBillingCycle === cycle.id ? '1px solid #6366f1' : '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {cycle.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Invoice Summary */}
              <div style={{ 
                background: 'rgba(99,102,241,0.05)', 
                border: '1px dashed rgba(99,102,241,0.3)', 
                borderRadius: '10px', 
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated Billing Summary</div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                    {selectedUpgradePlan} Plan ({upgradeBillingCycle})
                  </strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rate per cycle</div>
                  <strong style={{ fontSize: '1.2rem', color: '#6366f1' }}>
                    ₹{Number(customUpgradeAmount || 0).toLocaleString('en-IN')}
                  </strong>
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
                Save Plan & Amount
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

            <div className="sa-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Institution Name:</span>
                  <strong>{selectedBillingDetails.collegeName || selectedBillingDetails.name || 'N/A'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Tenant ID:</span>
                  <span style={{ fontFamily: 'monospace', color: '#818cf8', fontWeight: 700 }}>
                    {selectedBillingDetails.tenantId || selectedBillingDetails._id || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Client / Administrator:</span>
                  <strong>{selectedBillingDetails.adminName || 'Admin'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Contact Email:</span>
                  <span>{selectedBillingDetails.email || 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Contact Mobile:</span>
                  <span>{selectedBillingDetails.phone || 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Registration Date:</span>
                  <span>{selectedBillingDetails.createdAt ? new Date(selectedBillingDetails.createdAt).toLocaleString('en-GB') : 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Subscription Plan:</span>
                  <strong style={{ color: '#6366f1' }}>{selectedBillingDetails.planName || 'Trial'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Billing Rate & Cycle:</span>
                  <strong>
                    ₹{Number(selectedBillingDetails.amount || 0).toLocaleString('en-IN')} / {selectedBillingDetails.billingCycle || 'Monthly'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Payment Status:</span>
                  <span style={{
                    fontWeight: 700,
                    color: selectedBillingDetails.paymentStatus === 'Paid' ? '#10b981' : selectedBillingDetails.paymentStatus === 'Failed' ? '#ef4444' : '#f59e0b'
                  }}>
                    {selectedBillingDetails.paymentStatus || 'Pending'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Subscription Status:</span>
                  <span style={{
                    fontWeight: 700,
                    color: selectedBillingDetails.status === 'Active' ? '#10b981' : selectedBillingDetails.status === 'Pending Approval' ? '#f59e0b' : '#ef4444'
                  }}>
                    {selectedBillingDetails.status || 'Active'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Subscription Start Date:</span>
                  <span>{selectedBillingDetails.startDate ? new Date(selectedBillingDetails.startDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                  <span>Subscription Expiry Date:</span>
                  <span>{selectedBillingDetails.endDate ? new Date(selectedBillingDetails.endDate).toLocaleDateString('en-GB') : 'Continuous'}</span>
                </div>

                {selectedBillingDetails.daysRemaining !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                    <span>Days Remaining:</span>
                    <strong style={{ color: selectedBillingDetails.daysRemaining <= 10 ? '#f59e0b' : '#10b981' }}>
                      {selectedBillingDetails.daysRemaining} days
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="sa-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(selectedBillingDetails.status === 'Pending Approval' || selectedBillingDetails.status === 'Suspended') && (
                  <button 
                    className="sa-btn" 
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                    onClick={() => {
                      const c = selectedBillingDetails;
                      setSelectedBillingDetails(null);
                      handleActionClick('Approve Plan', c._id, c.collegeName || c.name, c.planName);
                    }}
                  >
                    <CheckCircle2 size={15} /> Approve & Activate
                  </button>
                )}

                {selectedBillingDetails.status === 'Active' && (
                  <button 
                    className="sa-btn" 
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                    onClick={() => {
                      const c = selectedBillingDetails;
                      setSelectedBillingDetails(null);
                      handleActionClick('Suspend Plan', c._id, c.collegeName || c.name, c.planName);
                    }}
                  >
                    <AlertCircle size={15} /> Suspend
                  </button>
                )}

                <button 
                  className="sa-btn" 
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }}
                  onClick={() => {
                    const c = selectedBillingDetails;
                    setSelectedBillingDetails(null);
                    handleActionClick('Upgrade Plan', c._id, c.collegeName || c.name, c.planName);
                  }}
                >
                  <ArrowUpRight size={15} /> Change Plan & Amount
                </button>
              </div>

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
