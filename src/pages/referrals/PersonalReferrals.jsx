import React, { useState, useEffect } from 'react';
import {
  Award, Shield, CreditCard, Landmark, Briefcase, Plus, Search,
  CheckCircle2, Clock, XCircle, ArrowUpRight, DollarSign, Download,
  RefreshCw, Eye, Lock, AlertCircle, FileText, ChevronRight, Copy,
  Sparkles, Check, Send, ChevronDown, CheckCheck
} from 'lucide-react';
import {
  getMyReferrals, getMyReferralStats, submitReferral, getReferralDetails,
  getPublishedOpportunities, getPublishedOpportunityDetails, applyForOpportunity,
  getMyOpportunityApplications
} from '../../api/index';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import DynamicFormRenderer from './DynamicFormRenderer';
import './PersonalReferrals.css';
import './AdminReferralManagement.css';

export default function PersonalReferrals() {
  const [mainView, setMainView] = useState('opportunities'); // 'opportunities' | 'my-applications' | 'direct-lead'
  const [oppCategory, setOppCategory] = useState('Insurance'); // 'Insurance' | 'Credit Card' | 'Bank Account' | 'Job Referral'
  const [publishedOpps, setPublishedOpps] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [myAppStats, setMyAppStats] = useState({ totalApplications: 0, totalIncentivesEarned: 0, pendingIncentives: 0 });

  // Direct Lead Data
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Application Modal for Published Opportunity
  const [selectedOppForApply, setSelectedOppForApply] = useState(null);
  const [oppFormData, setOppFormData] = useState({});
  const [oppFormErrors, setOppFormErrors] = useState({});
  const [submittingApp, setSubmittingApp] = useState(false);
  const [oppDetailModal, setOppDetailModal] = useState(null);

  // Direct Submission State
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formInsurance, setFormInsurance] = useState({ provider: 'Star Health', productType: 'Health', applicantName: '', applicantPhone: '', applicantEmail: '', applicantCity: '', estimatedSumInsured: 500000, notes: '' });
  const [formCreditCard, setFormCreditCard] = useState({ bankName: 'HDFC Bank', cardProduct: 'Millennia Cashback', applicantName: '', applicantPhone: '', applicantEmail: '', monthlyIncome: '₹40,000 - ₹60,000', employmentType: 'Salaried', city: '', notes: '' });
  const [formBankAccount, setFormBankAccount] = useState({ bankName: 'HDFC Bank', accountType: 'Savings Account', applicantName: '', applicantPhone: '', applicantEmail: '', branchCity: '', initialDeposit: 5000, notes: '' });
  const [formJob, setFormJob] = useState({ sector: 'IT / Software', companyName: 'TCS', jobRole: 'Software Engineer', candidateName: '', candidatePhone: '', candidateEmail: '', experienceYears: '1-3 Years', skills: '', resumeUrl: '', expectedCtc: '6-8 LPA', candidateConsentGiven: false, notes: '' });

  // Tracking Modal
  const [selectedRef, setSelectedRef] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, listRes, oppsRes, myAppsRes] = await Promise.all([
        getMyReferralStats(),
        getMyReferrals(),
        getPublishedOpportunities(),
        getMyOpportunityApplications(),
      ]);

      if (statsRes?.data?.success) setStats(statsRes.data.data);
      if (listRes?.data?.success) setReferrals(listRes.data.data);
      if (oppsRes?.data?.success) setPublishedOpps(oppsRes.data.data || []);
      if (myAppsRes?.data?.success) {
        setMyApplications(myAppsRes.data.data || []);
        if (myAppsRes.data.stats) setMyAppStats(myAppsRes.data.stats);
      }
    } catch (err) {
      console.error('Error fetching personal referral data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Real-time Socket Synchronization ──
  useRealtimeSync(['referrals', 'incentives', 'opportunities', 'opportunity_applications'], (payload) => {
    fetchAllData();
    setLastSyncTime(new Date());
    if (payload?.message) {
      setToastMessage(payload.message);
      setTimeout(() => setToastMessage(null), 5000);
    }
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleCopy = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleOpenApplyModal = (opp) => {
    setSelectedOppForApply(opp);
    setOppFormData({});
    setOppFormErrors({});
  };

  const handleSubmitOpportunityApplication = async (e) => {
    e.preventDefault();
    if (!selectedOppForApply) return;

    // Validate required fields
    const errors = {};
    for (const field of selectedOppForApply.formSchema || []) {
      if (field.required) {
        const val = oppFormData[field.name];
        if (val === undefined || val === null || val === '' || val === false) {
          errors[field.name] = `${field.label} is required`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setOppFormErrors(errors);
      alert('Please fill out all required fields marked with *');
      return;
    }

    setSubmittingApp(true);
    try {
      const res = await applyForOpportunity(selectedOppForApply._id, { formData: oppFormData });
      if (res?.data?.success) {
        alert(res.data.message || 'Application submitted successfully!');
        setSelectedOppForApply(null);
        setMainView('my-applications');
        fetchAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting application');
    } finally {
      setSubmittingApp(false);
    }
  };

  // Direct lead submission handler
  const handleSubmitLead = async (category) => {
    setSubmitting(true);
    try {
      let payload = { category };
      if (category === 'Insurance') payload.insuranceDetails = formInsurance;
      if (category === 'Credit Card') payload.creditCardDetails = formCreditCard;
      if (category === 'Bank Account') payload.bankAccountDetails = formBankAccount;
      if (category === 'Job') {
        if (!formJob.candidateConsentGiven) {
          alert('Candidate explicit consent is mandatory before submitting.');
          setSubmitting(false);
          return;
        }
        payload.jobDetails = formJob;
      }

      const res = await submitReferral(payload);
      if (res?.data?.success) {
        alert(res.data.message || 'Referral submitted successfully!');
        setSelectedCategory(null);
        fetchAllData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting referral');
    } finally {
      setSubmitting(false);
    }
  };

  // Visual Pipeline Stepper
  const renderPipelineStepper = (status, incentiveStatus) => {
    const stages = [
      { label: 'Submitted', key: 'Submitted' },
      { label: 'Under Review', key: 'Review' },
      { label: 'Milestone Verified', key: 'Milestone' },
      { label: 'Incentive Settled', key: 'Paid' },
    ];

    let currentStep = 1;
    if (['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Provider Processing', 'Screening', 'Selected'].includes(status)) {
      currentStep = 2;
    } else if (['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined', 'Milestone Verified'].includes(status)) {
      currentStep = 3;
      if (incentiveStatus === 'Paid') currentStep = 4;
    } else if (incentiveStatus === 'Paid') {
      currentStep = 4;
    }

    const fillPercent = ((currentStep - 1) / (stages.length - 1)) * 100;

    return (
      <div className="ref-stepper-wrap">
        <div className="ref-step-connector">
          <div className="ref-step-connector-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        {stages.map((st, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep || (stepNum === 4 && incentiveStatus === 'Paid');
          const isCurrent = stepNum === currentStep;
          return (
            <div key={st.label} className={`ref-step ${isCompleted ? 'completed' : isCurrent ? 'current' : ''}`}>
              <div className="ref-step-dot">{isCompleted ? '✓' : stepNum}</div>
              <div className="ref-step-label">{st.label}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Filter published opportunities
  const filteredOpps = publishedOpps.filter((opp) => {
    if (opp.category !== oppCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        opp.title?.toLowerCase().includes(q) ||
        opp.providerName?.toLowerCase().includes(q) ||
        opp.subCategory?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="pers-ref-container" style={{ padding: '24px', background: 'var(--bg-main, #f8fafc)', minHeight: '100vh' }}>
      {/* ── REAL-TIME TOAST ALERT ── */}
      {toastMessage && (
        <div className="ref-floating-toast">
          <div className="ref-toast-icon">
            <Sparkles size={18} />
          </div>
          <div className="ref-toast-body">
            <div className="ref-toast-title">Live Update</div>
            <div className="ref-toast-desc">{toastMessage}</div>
          </div>
          <button className="ref-toast-close" onClick={() => setToastMessage(null)}>
            ✕
          </button>
        </div>
      )}

      {/* ── HERO BANNER ── */}
      <div className="pers-hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
          <span className="pers-hero-badge">ENTERPRISE PARTNERSHIP REWARDS</span>
          <div className="ref-live-sync-pill" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }}>
            <span className="ref-pulse-dot" style={{ backgroundColor: '#4ade80' }}></span>
            <span>Live Sync Active</span>
            <span style={{ opacity: 0.85, fontSize: '0.78rem' }}>• {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
        </div>
        <h1 className="pers-hero-title">Business Opportunities & Referral Portal</h1>
        <p className="pers-hero-sub">
          Apply for officially published institution partner opportunities across Insurance, Credit Cards, Bank Accounts, and Jobs. Track real-time progress, provider verification, and earn authorized incentive payouts.
        </p>
      </div>

      {/* ── PRIVACY BANNER ── */}
      <div className="pers-privacy-banner">
        <Lock size={16} />
        <span>
          <strong>Confidential & Tenant-Isolated:</strong> Your application entries, personal documents, and earned incentive rewards are strictly private and accessible only to you and authorized institutional administrators.
        </span>
      </div>

      {/* ── PRIVATE EARNINGS CARDS ── */}
      <div className="pers-earnings-grid">
        <div className="pers-earn-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="pers-earn-label">
            <DollarSign size={16} className="text-emerald-600" />
            Total Incentives Disbursed
          </div>
          <div className="pers-earn-value" style={{ color: '#059669' }}>
            ₹{((stats?.incentives?.totalPaid || 0) + (myAppStats.totalIncentivesEarned || 0)).toLocaleString()}
          </div>
          <div className="pers-earn-meta">Directly credited via bank transfer</div>
        </div>

        <div className="pers-earn-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="pers-earn-label">
            <Clock size={16} className="text-blue-600" />
            Approved & Processing
          </div>
          <div className="pers-earn-value" style={{ color: '#2563eb' }}>
            ₹{((stats?.incentives?.totalApprovedUnpaid || 0) + (myAppStats.pendingIncentives || 0)).toLocaleString()}
          </div>
          <div className="pers-earn-meta">Approved, awaiting next disbursement batch</div>
        </div>

        <div className="pers-earn-card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <div className="pers-earn-label">
            <Award size={16} className="text-purple-600" />
            Active Opportunities Applied
          </div>
          <div className="pers-earn-value" style={{ color: '#7c3aed' }}>
            {myApplications.length} Opportunities
          </div>
          <div className="pers-earn-meta">Live tracking with stage steppers</div>
        </div>

        <div className="pers-earn-card" style={{ borderLeft: '4px solid #ea580c' }}>
          <div className="pers-earn-label">
            <CheckCircle2 size={16} className="text-orange-600" />
            Total Referrals Registered
          </div>
          <div className="pers-earn-value" style={{ color: '#ea580c' }}>
            {referrals.length} Leads
          </div>
          <div className="pers-earn-meta">Direct customer lead submissions</div>
        </div>
      </div>

      {/* ── TOP VIEW NAVIGATION TABS ── */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setMainView('opportunities')}
          style={{
            padding: '11px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: mainView === 'opportunities' ? '#2563eb' : '#64748b',
            borderBottom: mainView === 'opportunities' ? '3px solid #2563eb' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Award size={18} />
          <span>Browse Published Opportunities ({publishedOpps.length})</span>
        </button>

        <button
          onClick={() => setMainView('my-applications')}
          style={{
            padding: '11px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: mainView === 'my-applications' ? '#2563eb' : '#64748b',
            borderBottom: mainView === 'my-applications' ? '3px solid #2563eb' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>My Applications Tracking ({myApplications.length})</span>
        </button>

        <button
          onClick={() => setMainView('direct-lead')}
          style={{
            padding: '11px 20px',
            border: 'none',
            background: 'none',
            fontWeight: 800,
            fontSize: '0.95rem',
            color: mainView === 'direct-lead' ? '#2563eb' : '#64748b',
            borderBottom: mainView === 'direct-lead' ? '3px solid #2563eb' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus size={18} />
          <span>Direct Lead Submission & Referrals ({referrals.length})</span>
        </button>
      </div>

      {/* ── VIEW 1: BROWSE PUBLISHED OPPORTUNITIES ── */}
      {mainView === 'opportunities' && (
        <div>
          {/* Sub Categories Pill Selector */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`opp-module-tab ${oppCategory === 'Insurance' ? 'active' : ''}`}
              onClick={() => setOppCategory('Insurance')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: oppCategory === 'Insurance' ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
            >
              <Shield size={16} /> <span>Insurance</span>
            </button>
            <button
              className={`opp-module-tab ${oppCategory === 'Credit Card' ? 'active' : ''}`}
              onClick={() => setOppCategory('Credit Card')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: oppCategory === 'Credit Card' ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
            >
              <CreditCard size={16} /> <span>Credit Cards</span>
            </button>
            <button
              className={`opp-module-tab ${oppCategory === 'Bank Account' ? 'active' : ''}`}
              onClick={() => setOppCategory('Bank Account')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: oppCategory === 'Bank Account' ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
            >
              <Landmark size={16} /> <span>Bank Accounts</span>
            </button>
            <button
              className={`opp-module-tab ${oppCategory === 'Job Referral' ? 'active' : ''}`}
              onClick={() => setOppCategory('Job Referral')}
              style={{ padding: '8px 16px', borderRadius: '8px', border: oppCategory === 'Job Referral' ? '2px solid #2563eb' : '1px solid #cbd5e1' }}
            >
              <Briefcase size={16} /> <span>Job Openings</span>
            </button>

            <div style={{ marginLeft: 'auto', position: 'relative', minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder={`Search ${oppCategory}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '7px 12px 7px 32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  width: '100%',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {filteredOpps.length === 0 ? (
            <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1', padding: '40px', textAlign: 'center' }}>
              <Award size={44} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>No {oppCategory} opportunities currently published</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Check back soon or explore other product categories above.
              </p>
            </div>
          ) : (
            <div className="opp-grid">
              {filteredOpps.map((opp) => (
                <div key={opp._id} className="opp-card">
                  <div className="opp-card-header">
                    <div>
                      <div className="opp-provider-tag">
                        <span>{opp.providerName}</span>
                        <span>•</span>
                        <span>{opp.subCategory}</span>
                      </div>
                      <div className="opp-title">{opp.title}</div>
                    </div>
                    <span className="opp-status-pill published">
                      Available
                    </span>
                  </div>

                  <p className="opp-desc">{opp.description}</p>

                  {opp.keyHighlights?.length > 0 && (
                    <div className="opp-highlights">
                      {opp.keyHighlights.slice(0, 3).map((h, i) => (
                        <span key={i} className="opp-highlight-pill">{h}</span>
                      ))}
                    </div>
                  )}

                  <div className="opp-meta-row">
                    <div className="opp-incentive-box">
                      <DollarSign size={16} />
                      <span>Reward: ₹{opp.incentiveConfig?.amount || 0}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Milestone: <strong>{opp.incentiveConfig?.milestone}</strong>
                    </span>
                  </div>

                  <div className="opp-card-actions">
                    <button
                      className="opp-btn-outline"
                      onClick={() => setOppDetailModal(opp)}
                    >
                      <Eye size={14} />
                      <span>View Details</span>
                    </button>

                    <button
                      className="opp-btn-primary"
                      onClick={() => handleOpenApplyModal(opp)}
                    >
                      <span>Apply Now →</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: MY APPLICATIONS TRACKING ── */}
      {mainView === 'my-applications' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                My Submitted Applications
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Real-time tracking of your opportunity applications across verified milestones.
              </p>
            </div>
          </div>

          {myApplications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <FileText size={44} style={{ margin: '0 auto 10px', color: '#cbd5e1' }} />
              <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>You haven't applied to any opportunities yet</h4>
              <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.85rem' }}>
                Browse the published opportunities catalog above and apply with dedicated forms.
              </p>
              <button
                className="opp-btn-primary"
                style={{ display: 'inline-flex', padding: '8px 18px' }}
                onClick={() => setMainView('opportunities')}
              >
                Browse Opportunities Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {myApplications.map((app) => (
                <div
                  key={app._id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '18px',
                    background: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{app.category} • {app.providerName}</span>
                      </div>
                      <h4 style={{ margin: '2px 0 4px', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {app.opportunityTitle}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Application Code:</span>
                        <strong style={{ fontFamily: 'monospace', color: '#1e293b' }}>{app.applicationCode}</strong>
                        <button
                          className={`ref-copy-btn ${copiedId === app._id ? 'copied' : ''}`}
                          onClick={() => handleCopy(app.applicationCode, app._id)}
                          title="Copy Application Code"
                        >
                          <Copy size={12} />
                          <span>{copiedId === app._id ? 'Copied! ✓' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className={`ref-badge ${app.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {app.status}
                      </span>
                      <div style={{ marginTop: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                        Incentive: ₹{app.incentiveAmount || 0} ({app.incentiveStatus})
                      </div>
                      {app.providerApplicationRef && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                          Provider Ref: <strong>{app.providerApplicationRef}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 4-Stage Stepper Progress */}
                  {renderPipelineStepper(app.status, app.incentiveStatus)}

                  {/* Submitted Data Summary */}
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', marginTop: '14px', fontSize: '0.8rem' }}>
                    <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Submitted Details:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                      {Object.entries(app.formData || {}).map(([k, v]) => (
                        <div key={k}>
                          <span style={{ color: '#64748b' }}>{k}: </span>
                          <strong style={{ color: '#0f172a' }}>{String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 3: DIRECT REFERRAL SUBMISSION & EXISTING TRACKING ── */}
      {mainView === 'direct-lead' && (
        <div>
          {/* Direct Lead Registration Tiles */}
          <div className="pers-categories-section">
            <h2 className="pers-section-title">Direct Referral Registration</h2>
            <p className="pers-section-sub">Select one of the 4 partner categories below to register a direct client lead:</p>

            <div className="pers-cat-grid">
              <div
                className={`pers-cat-card ${selectedCategory === 'Insurance' ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Insurance' ? null : 'Insurance')}
              >
                <div>
                  <div className="pers-cat-header">
                    <div className="pers-cat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>🛡️</div>
                    <div className="pers-cat-title">Insurance</div>
                  </div>
                  <p className="pers-cat-desc">
                    Refer family or friends for Health, Term Life, and Motor insurance from top providers.
                  </p>
                </div>
                <div className="pers-cat-footer" style={{ color: '#2563eb' }}>
                  <span>{selectedCategory === 'Insurance' ? 'Form Open ▲' : 'Submit Lead →'}</span>
                  <span>Reward up to ₹800</span>
                </div>
              </div>

              <div
                className={`pers-cat-card ${selectedCategory === 'Credit Card' ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Credit Card' ? null : 'Credit Card')}
              >
                <div>
                  <div className="pers-cat-header">
                    <div className="pers-cat-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>💳</div>
                    <div className="pers-cat-title">Credit Cards</div>
                  </div>
                  <p className="pers-cat-desc">
                    Refer applicants for leading bank cards with zero joining fee and cashback rewards.
                  </p>
                </div>
                <div className="pers-cat-footer" style={{ color: '#7c3aed' }}>
                  <span>{selectedCategory === 'Credit Card' ? 'Form Open ▲' : 'Submit Lead →'}</span>
                  <span>Reward up to ₹1,000</span>
                </div>
              </div>

              <div
                className={`pers-cat-card ${selectedCategory === 'Bank Account' ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Bank Account' ? null : 'Bank Account')}
              >
                <div>
                  <div className="pers-cat-header">
                    <div className="pers-cat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>🏛️</div>
                    <div className="pers-cat-title">Bank Accounts</div>
                  </div>
                  <p className="pers-cat-desc">
                    Refer students and staff for zero-balance or corporate salary accounts with digital KYC.
                  </p>
                </div>
                <div className="pers-cat-footer" style={{ color: '#d97706' }}>
                  <span>{selectedCategory === 'Bank Account' ? 'Form Open ▲' : 'Submit Lead →'}</span>
                  <span>Reward up to ₹500</span>
                </div>
              </div>

              <div
                className={`pers-cat-card ${selectedCategory === 'Job' ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'Job' ? null : 'Job')}
              >
                <div>
                  <div className="pers-cat-header">
                    <div className="pers-cat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>💼</div>
                    <div className="pers-cat-title">Job Referrals</div>
                  </div>
                  <p className="pers-cat-desc">
                    Refer qualified graduates and professionals for partner corporate openings.
                  </p>
                </div>
                <div className="pers-cat-footer" style={{ color: '#059669' }}>
                  <span>{selectedCategory === 'Job' ? 'Form Open ▲' : 'Submit Lead →'}</span>
                  <span>Reward up to ₹2,500</span>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Submission Modal / Slide */}
          {selectedCategory && (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '2px solid #3b82f6', padding: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Submit {selectedCategory} Referral</h3>
                <button onClick={() => setSelectedCategory(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
              </div>

              {selectedCategory === 'Insurance' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="ref-form-label">Insurer Provider</label>
                    <input type="text" className="ref-input" value={formInsurance.provider} onChange={(e) => setFormInsurance({ ...formInsurance, provider: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Applicant Name</label>
                    <input type="text" className="ref-input" placeholder="Full name" value={formInsurance.applicantName} onChange={(e) => setFormInsurance({ ...formInsurance, applicantName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Mobile Phone</label>
                    <input type="text" className="ref-input" placeholder="10-digit number" value={formInsurance.applicantPhone} onChange={(e) => setFormInsurance({ ...formInsurance, applicantPhone: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Sum Insured (₹)</label>
                    <input type="number" className="ref-input" value={formInsurance.estimatedSumInsured} onChange={(e) => setFormInsurance({ ...formInsurance, estimatedSumInsured: Number(e.target.value) })} />
                  </div>
                </div>
              )}

              {selectedCategory === 'Credit Card' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="ref-form-label">Bank Name</label>
                    <input type="text" className="ref-input" value={formCreditCard.bankName} onChange={(e) => setFormCreditCard({ ...formCreditCard, bankName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Applicant Name (on PAN)</label>
                    <input type="text" className="ref-input" value={formCreditCard.applicantName} onChange={(e) => setFormCreditCard({ ...formCreditCard, applicantName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Phone</label>
                    <input type="text" className="ref-input" value={formCreditCard.applicantPhone} onChange={(e) => setFormCreditCard({ ...formCreditCard, applicantPhone: e.target.value })} />
                  </div>
                </div>
              )}

              {selectedCategory === 'Bank Account' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="ref-form-label">Bank</label>
                    <input type="text" className="ref-input" value={formBankAccount.bankName} onChange={(e) => setFormBankAccount({ ...formBankAccount, bankName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Applicant Name</label>
                    <input type="text" className="ref-input" value={formBankAccount.applicantName} onChange={(e) => setFormBankAccount({ ...formBankAccount, applicantName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Phone</label>
                    <input type="text" className="ref-input" value={formBankAccount.applicantPhone} onChange={(e) => setFormBankAccount({ ...formBankAccount, applicantPhone: e.target.value })} />
                  </div>
                </div>
              )}

              {selectedCategory === 'Job' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="ref-form-label">Company Name</label>
                    <input type="text" className="ref-input" value={formJob.companyName} onChange={(e) => setFormJob({ ...formJob, companyName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Candidate Name</label>
                    <input type="text" className="ref-input" value={formJob.candidateName} onChange={(e) => setFormJob({ ...formJob, candidateName: e.target.value })} />
                  </div>
                  <div>
                    <label className="ref-form-label">Phone</label>
                    <input type="text" className="ref-input" value={formJob.candidatePhone} onChange={(e) => setFormJob({ ...formJob, candidatePhone: e.target.value })} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={formJob.candidateConsentGiven} onChange={(e) => setFormJob({ ...formJob, candidateConsentGiven: e.target.checked })} />
                      <span>Candidate has given explicit permission for recruitment referral *</span>
                    </label>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="ref-btn-secondary" onClick={() => setSelectedCategory(null)}>Cancel</button>
                <button type="button" className="ref-btn-primary" disabled={submitting} onClick={() => handleSubmitLead(selectedCategory)}>
                  {submitting ? 'Submitting...' : 'Confirm Submission →'}
                </button>
              </div>
            </div>
          )}

          {/* Referrals Tracking Table */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 800 }}>Direct Referral Leads Tracking</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Referral Code</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Category</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Applicant</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Incentive</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                        {r.referralCode}
                        <button
                          className={`ref-copy-btn ${copiedId === r._id ? 'copied' : ''}`}
                          onClick={() => handleCopy(r.referralCode, r._id)}
                        >
                          <Copy size={12} />
                          <span>{copiedId === r._id ? '✓' : 'Copy'}</span>
                        </button>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{r.category}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {r.insuranceDetails?.applicantName || r.creditCardDetails?.applicantName || r.bankAccountDetails?.applicantName || r.jobDetails?.candidateName || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span className={`ref-badge ${r.status?.toLowerCase().replace(/\s+/g, '-')}`}>{r.status}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#059669' }}>
                        ₹{r.incentiveAmount || 0} ({r.incentiveStatus})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── OPPORTUNITY DETAILS MODAL ── */}
      {oppDetailModal && (
        <div className="ref-modal-overlay">
          <div className="ref-modal-card" style={{ maxWidth: '640px', width: '92%' }}>
            <div className="ref-modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {oppDetailModal.category} • {oppDetailModal.providerName}
                </span>
                <div className="ref-modal-title" style={{ marginTop: '2px' }}>{oppDetailModal.title}</div>
              </div>
              <button className="ref-modal-close" onClick={() => setOppDetailModal(null)}>✕</button>
            </div>
            <div className="ref-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '16px' }}>
                {oppDetailModal.description}
              </p>

              {oppDetailModal.benefits?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', marginBottom: '8px' }}>Key Benefits:</div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {oppDetailModal.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {oppDetailModal.eligibilityCriteria && (
                <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '4px' }}>Eligibility Criteria:</div>
                  <div style={{ fontSize: '0.84rem', color: '#475569' }}>{oppDetailModal.eligibilityCriteria}</div>
                </div>
              )}

              <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>Incentive Outcome:</div>
                  <div style={{ fontSize: '0.85rem', color: '#14532d' }}>Trigger: <strong>{oppDetailModal.incentiveConfig?.milestone}</strong></div>
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>
                  ₹{oppDetailModal.incentiveConfig?.amount || 0}
                </div>
              </div>
            </div>

            <div className="ref-modal-footer">
              <button className="ref-btn-secondary" onClick={() => setOppDetailModal(null)}>Close</button>
              <button
                className="ref-btn-primary"
                onClick={() => {
                  const opp = oppDetailModal;
                  setOppDetailModal(null);
                  handleOpenApplyModal(opp);
                }}
              >
                Apply Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLY NOW DYNAMIC FORM MODAL ── */}
      {selectedOppForApply && (
        <div className="ref-modal-overlay">
          <div className="ref-modal-card" style={{ maxWidth: '680px', width: '92%' }}>
            <div className="ref-modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                  {selectedOppForApply.category} Application Form
                </span>
                <div className="ref-modal-title" style={{ marginTop: '2px' }}>{selectedOppForApply.title}</div>
              </div>
              <button className="ref-modal-close" onClick={() => setSelectedOppForApply(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmitOpportunityApplication} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="ref-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '10px', marginBottom: '18px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 600 }}>
                    Please fill out the provider-requested fields below. All information is validated directly and encrypted for your privacy.
                  </div>
                </div>

                {/* DYNAMIC FORM BUILDER RENDERER */}
                <DynamicFormRenderer
                  schema={selectedOppForApply.formSchema}
                  formData={oppFormData}
                  onChange={setOppFormData}
                  errors={oppFormErrors}
                />
              </div>

              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setSelectedOppForApply(null)}>
                  Cancel
                </button>
                <button type="submit" className="ref-btn-primary" disabled={submittingApp}>
                  {submittingApp ? 'Submitting Application...' : 'Submit Application Now →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
