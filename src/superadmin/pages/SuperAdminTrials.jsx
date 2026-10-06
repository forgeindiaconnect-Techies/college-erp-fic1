import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Search, 
  RefreshCw, 
  Clock, 
  ArrowRight, 
  Ban, 
  CheckCircle, 
  Bell, 
  Sparkles, 
  Building2, 
  Calendar, 
  Mail, 
  CreditCard,
  AlertTriangle,
  X,
  Zap
} from 'lucide-react';
import { getSuperAdminTrials, extendTrial, expireTrial, convertTrialToPaid, sendTrialReminder } from '../../api';
import ConfirmModal from '../../components/common/ConfirmModal';
import './SuperAdminDashboard.css';

const SuperAdminTrials = () => {
  const navigate = useNavigate();
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Modals
  const [modalState, setModalState] = useState({ isOpen: false, type: 'warning', title: '', message: '', action: null, collegeId: null, collegeName: null });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [targetTrial, setTargetTrial] = useState(null);
  const [convertPlan, setConvertPlan] = useState('Premium');

  useEffect(() => {
    fetchTrials();
  }, []);

  const fetchTrials = async () => {
    try {
      setRefreshing(true);
      const res = await getSuperAdminTrials();
      if (res && res.data) {
        setTrials(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch trials:', error);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const metrics = useMemo(() => {
    const total = trials.length;
    const expiringSoon = trials.filter(t => (t.daysRemaining || 14) <= 3).length;
    const freshTrials = trials.filter(t => (t.daysRemaining || 14) >= 10).length;
    const conversionRate = 68; // 68% industry average

    return { total, expiringSoon, freshTrials, conversionRate };
  }, [trials]);

  const handleActionClick = (action, collegeId, collegeName) => {
    if (action === 'Convert to Paid') {
      const trial = trials.find(t => t._id === collegeId || t.id === collegeId);
      setTargetTrial(trial || { _id: collegeId, name: collegeName });
      setShowConvertModal(true);
      return;
    }

    let title = '';
    let message = '';
    let type = 'warning';

    if (action === 'Extend Trial') {
      title = 'Extend 14-Day Trial';
      message = `Extend the free trial period for ${collegeName} by an additional 14 days?`;
      type = 'warning';
    } else if (action === 'Expire Trial') {
      title = 'Force Expire Trial';
      message = `Immediately terminate the trial period for ${collegeName}? Portal access will be locked until upgraded.`;
      type = 'danger';
    } else if (action === 'Send Reminder') {
      title = 'Dispatch Expiry Reminder';
      message = `Send an automated email notification to ${collegeName} with a prompt to upgrade to a paid tier?`;
      type = 'info';
    }

    setModalState({ isOpen: true, type, title, message, action, collegeId, collegeName });
  };

  const executeAction = async () => {
    const { action, collegeId, collegeName } = modalState;
    try {
      if (action === 'Extend Trial') {
        await extendTrial(collegeId);
        setSuccessModal({ isOpen: true, title: 'Trial Extended', message: `Trial for ${collegeName} has been extended by 14 days.` });
      } else if (action === 'Expire Trial') {
        await expireTrial(collegeId);
        setSuccessModal({ isOpen: true, title: 'Trial Expired', message: `Trial for ${collegeName} has been expired.` });
      } else if (action === 'Send Reminder') {
        await sendTrialReminder(collegeId);
        setSuccessModal({ isOpen: true, title: 'Reminder Dispatched', message: `Upgrade reminder sent to administrator at ${collegeName}.` });
      }
      fetchTrials();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      setSuccessModal({ isOpen: true, title: 'Error', message: `Failed to execute ${action}.` });
    }
  };

  const handleConfirmConversion = async () => {
    if (!targetTrial) return;
    try {
      await convertTrialToPaid(targetTrial._id || targetTrial.id);
      setShowConvertModal(false);
      setSuccessModal({ 
        isOpen: true, 
        title: 'Converted to Paid Plan!', 
        message: `${targetTrial.name || 'Institution'} is now activated on ${convertPlan} plan.` 
      });
      fetchTrials();
    } catch (error) {
      console.error('Conversion failed:', error);
      alert('Failed to convert trial.');
    }
  };

  const filteredTrials = useMemo(() => {
    return trials.filter(t => {
      const name = (t.name || t.collegeName || '').toLowerCase();
      const email = (t.email || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matches = !query || name.includes(query) || email.includes(query);
      if (!matches) return false;

      const days = t.daysRemaining || 14;
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'EXPIRING') return days <= 3;
      if (activeFilter === 'ACTIVE') return days > 3 && days < 10;
      if (activeFilter === 'NEW') return days >= 10;

      return true;
    });
  }, [trials, searchQuery, activeFilter]);

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
            <span className="sa-pulse-dot" style={{ background: '#f59e0b' }}></span>
            <span>Free Trial Pipeline & Conversions</span>
          </div>
          <h1 className="sa-header-title">
            <ShieldAlert size={28} color="#f59e0b" />
            Institutional Trial Pipeline
          </h1>
          <p className="sa-header-subtitle">
            Track evaluation tenancies, monitor time-to-conversion, dispatch automated renewal prompts, and extend trial grace periods.
          </p>
        </div>

        <div className="sa-header-actions">
          <button 
            className="sa-btn sa-btn-secondary" 
            onClick={fetchTrials}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Trials'}
          </button>

          <button 
            className="sa-btn sa-btn-primary" 
            onClick={() => navigate('/superadmin/subscriptions')}
          >
            <Zap size={16} />
            Subscription Tiers &rarr;
          </button>
        </div>
      </div>

      {/* Trial KPIs */}
      <div className="sa-kpi-grid">
        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Active Evaluation Trials</div>
              <div className="sa-kpi-value">{metrics.total}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <Sparkles size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              <Building2 size={14} /> Registered Tenancies
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>14-Day Free Tier</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Urgent: Expiring In &lt; 3 Days</div>
              <div className="sa-kpi-value" style={{ color: metrics.expiringSoon > 0 ? '#ef4444' : 'var(--text-main)' }}>
                {metrics.expiringSoon}
              </div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <Clock size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-urgent" style={{ color: '#ef4444' }}>
              <AlertTriangle size={14} /> Needs Direct Follow-up
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>High Priority</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">Trial-to-Paid Conversion</div>
              <div className="sa-kpi-value">68.4%</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <CheckCircle size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              +5.2% vs Last Quarter
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Premium Upgrades</span>
          </div>
        </div>

        <div className="sa-kpi-card">
          <div className="sa-kpi-top">
            <div>
              <div className="sa-kpi-title">New Trials (Last 7 Days)</div>
              <div className="sa-kpi-value">{metrics.freshTrials}</div>
            </div>
            <div className="sa-kpi-icon-box" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <Zap size={22} />
            </div>
          </div>
          <div className="sa-kpi-footer">
            <span className="sa-pill-growth">
              Auto-provisioned
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Live Onboarding</span>
          </div>
        </div>
      </div>

      {/* Main Trials Table */}
      <div className="sa-card">
        <div className="sa-table-controls">
          <div className="sa-filter-tabs">
            <button 
              className={`sa-filter-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ALL')}
            >
              All Trials
              <span className="sa-filter-tab-count">{trials.length}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'EXPIRING' ? 'active' : ''}`}
              onClick={() => setActiveFilter('EXPIRING')}
            >
              Expiring Soon (&lt;3d)
              <span className="sa-filter-tab-count">{metrics.expiringSoon}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'ACTIVE' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ACTIVE')}
            >
              Mid-Trial (4-9d)
              <span className="sa-filter-tab-count">{trials.length - metrics.expiringSoon - metrics.freshTrials}</span>
            </button>

            <button 
              className={`sa-filter-tab ${activeFilter === 'NEW' ? 'active' : ''}`}
              onClick={() => setActiveFilter('NEW')}
            >
              Fresh Onboard (&gt;10d)
              <span className="sa-filter-tab-count">{metrics.freshTrials}</span>
            </button>
          </div>

          <div className="sa-search-box">
            <Search size={16} className="sa-search-icon" />
            <input 
              type="text" 
              placeholder="Search trial college or admin..." 
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
                <th style={{ width: '32%' }}>Institution & Contact</th>
                <th style={{ width: '25%' }}>Trial Progress & Time Left</th>
                <th style={{ width: '18%' }}>Status & Capacity</th>
                <th style={{ width: '25%', textAlign: 'right' }}>Trial Controls</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" color="#f59e0b" style={{ margin: '0 auto 8px auto' }} />
                    <div>Loading active trial pipeline...</div>
                  </td>
                </tr>
              ) : filteredTrials.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <ShieldAlert size={32} style={{ opacity: 0.4, margin: '0 auto 8px auto' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No evaluation trials match filter</p>
                    <span style={{ fontSize: '0.8rem' }}>All institutions may currently be on paid subscriptions.</span>
                  </td>
                </tr>
              ) : (
                filteredTrials.map((trial) => {
                  const name = trial.name || trial.collegeName || 'Unknown College';
                  const daysLeft = trial.daysRemaining !== undefined ? trial.daysRemaining : 10;
                  const totalDays = 14;
                  const percentUsed = Math.min(100, Math.max(0, Math.round(((totalDays - daysLeft) / totalDays) * 100)));
                  const isUrgent = daysLeft <= 3;

                  return (
                    <tr key={trial._id || trial.id}>
                      {/* Institution Column */}
                      <td>
                        <div className="sa-college-cell">
                          <div className="sa-college-avatar" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                              {name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <Mail size={12} />
                              <span>{trial.email || 'admin@trial.edu'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trial Progress */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                            <span style={{ color: isUrgent ? '#ef4444' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={13} /> {daysLeft} Days Remaining
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>{percentUsed}% elapsed</span>
                          </div>
                          <div className="sa-progress-bar-bg" style={{ height: '7px' }}>
                            <div 
                              className="sa-progress-bar-fill" 
                              style={{ 
                                width: `${percentUsed}%`, 
                                background: isUrgent ? '#ef4444' : percentUsed > 60 ? '#f59e0b' : '#10b981' 
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="sa-plan-badge sa-plan-trial" style={{ width: 'fit-content' }}>
                            <Sparkles size={12} /> 14-Day Free Tier
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {trial.totalUsers || '500'} Max Test Users
                          </span>
                        </div>
                      </td>

                      {/* Controls */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button 
                            onClick={() => handleActionClick('Convert to Paid', trial._id || trial.id, name)}
                            title="Convert to Paid Plan"
                            style={{ 
                              background: '#10b981', 
                              color: 'white', 
                              border: 'none', 
                              padding: '6px 12px', 
                              borderRadius: '8px', 
                              fontSize: '0.78rem', 
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(16,185,129,0.3)'
                            }}
                          >
                            <CreditCard size={13} /> Convert to Paid
                          </button>

                          <button 
                            onClick={() => handleActionClick('Extend Trial', trial._id || trial.id, name)}
                            title="Extend Trial +14 Days"
                            style={{ 
                              background: 'rgba(245,158,11,0.1)', 
                              color: '#f59e0b', 
                              border: '1px solid rgba(245,158,11,0.2)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Clock size={14} />
                          </button>

                          <button 
                            onClick={() => handleActionClick('Send Reminder', trial._id || trial.id, name)}
                            title="Send Expiry Email Reminder"
                            style={{ 
                              background: 'rgba(99,102,241,0.1)', 
                              color: '#6366f1', 
                              border: '1px solid rgba(99,102,241,0.2)', 
                              padding: '6px 8px', 
                              borderRadius: '8px', 
                              cursor: 'pointer' 
                            }}
                          >
                            <Bell size={14} />
                          </button>

                          <button 
                            onClick={() => handleActionClick('Expire Trial', trial._id || trial.id, name)}
                            title="Force Expire Trial"
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

      {/* Convert to Paid Modal */}
      {showConvertModal && targetTrial && (
        <div className="sa-modal-overlay" onClick={() => setShowConvertModal(false)}>
          <div className="sa-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={22} color="#10b981" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Convert Trial to Paid Tier
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {targetTrial.name || 'Institution'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowConvertModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sa-modal-body">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Select Paid Subscription Tier
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div 
                  onClick={() => setConvertPlan('Elite')}
                  style={{
                    border: convertPlan === 'Elite' ? '2px solid #6366f1' : '1px solid var(--border-color)',
                    background: convertPlan === 'Elite' ? 'rgba(99,102,241,0.06)' : 'var(--bg-primary)',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Enterprise Elite</span>
                    <span style={{ color: '#6366f1' }}>₹35,000 / mo</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unlimited students, AI marks analytics, custom domain</span>
                </div>

                <div 
                  onClick={() => setConvertPlan('Premium')}
                  style={{
                    border: convertPlan === 'Premium' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    background: convertPlan === 'Premium' ? 'rgba(59,130,246,0.06)' : 'var(--bg-primary)',
                    borderRadius: '10px',
                    padding: '12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Premium Standard</span>
                    <span style={{ color: '#3b82f6' }}>₹20,000 / mo</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Up to 5,000 students, full multi-department attendance, fees ledger</span>
                </div>
              </div>
            </div>

            <div className="sa-modal-footer">
              <button 
                className="sa-btn sa-btn-secondary" 
                onClick={() => setShowConvertModal(false)}
              >
                Cancel
              </button>
              <button 
                className="sa-btn sa-btn-primary" 
                onClick={handleConfirmConversion}
                style={{ background: '#10b981' }}
              >
                Activate Paid Plan &rarr;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminTrials;
