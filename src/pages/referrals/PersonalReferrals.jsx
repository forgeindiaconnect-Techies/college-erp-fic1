import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Award, Shield, CreditCard, Landmark, Briefcase, Plus, Search,
  CheckCircle2, Clock, XCircle, ArrowUpRight, DollarSign, Download,
  RefreshCw, Eye, Lock, AlertCircle, FileText, ChevronRight, Copy,
  Sparkles, Check, Send, ChevronDown, CheckCheck, Filter, UserCheck, ShieldCheck,
  TrendingUp, ArrowLeft, LayoutDashboard, Layers
} from 'lucide-react';
import {
  getMyReferrals, getMyReferralStats, submitReferral, getReferralDetails,
  getPublishedOpportunities, getPublishedOpportunityDetails, applyForOpportunity,
  getMyOpportunityApplications, processIncentivePayout
} from '../../api/index';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import DynamicFormRenderer from './DynamicFormRenderer';
import ReferralSubmissionModal from '../../components/referrals/ReferralSubmissionModal';
import TopReferralPerformers from '../../components/referrals/TopReferralPerformers';
import '../admin/UserManagementCommon.css';
import './PersonalReferrals.css';
import './AdminReferralManagement.css';

export default function PersonalReferrals() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const rootRole = ['admin', 'accounts', 'staff', 'student', 'principal', 'superadmin', 'hod', 'librarian', 'driver', 'parent', 'watchman', 'hostel', 'placement'].includes(pathParts[0]?.toLowerCase())
    ? pathParts[0].toLowerCase()
    : (sessionStorage.getItem('active_role')?.toLowerCase() || localStorage.getItem('role')?.toLowerCase() || 'staff');
  const dashboardPath = `/${rootRole}/dashboard`;
  const businessCatalogPath = `/${rootRole}/business-referral`;

  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const initialTab = rawTab === 'leaderboard' ? 'leaderboard' : 'my-referrals';
  const [mainView, setMainView] = useState(initialTab); // 'my-referrals' | 'leaderboard'
  const [oppCategory, setOppCategory] = useState('Insurance'); // 'Insurance' | 'Credit Card' | 'Bank Account' | 'Job Referral'
  const [publishedOpps, setPublishedOpps] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [myAppStats, setMyAppStats] = useState({ totalApplications: 0, totalIncentivesEarned: 0, pendingIncentives: 0 });

  // Direct Lead Data
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filter for My Referrals & Opportunities
  const [referralSearch, setReferralSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCategory, setSubmitCategory] = useState('Credit Card');

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

  // Payout Settlement Modal States
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutTargetRef, setPayoutTargetRef] = useState(null);
  const [payoutMode, setPayoutMode] = useState('Bank Transfer');
  const [payoutTxnRef, setPayoutTxnRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);

  const handleOpenPayoutForReferral = (refItem) => {
    setPayoutTargetRef(refItem);
    setPayoutTxnRef(`UTR${Date.now().toString().slice(-8)}`);
    setPayoutNotes(`Incentive settlement for ${refItem.referralCode} (${refItem.category})`);
    setShowPayoutModal(true);
  };

  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (!payoutTargetRef) return;
    if (!payoutTxnRef.trim()) {
      alert('Transaction UTR / Receipt reference is required.');
      return;
    }

    try {
      setProcessingPayout(true);
      const res = await processIncentivePayout({
        referralId: payoutTargetRef._id,
        incentiveIds: payoutTargetRef.incentiveRecord ? [payoutTargetRef.incentiveRecord] : [],
        paymentMode: payoutMode,
        transactionReference: payoutTxnRef.trim(),
        notes: payoutNotes,
      });

      if (res?.data?.success) {
        alert(res.data.message || `Payout of ₹${payoutTargetRef.incentiveAmount} processed successfully!`);
        setShowPayoutModal(false);
        setPayoutTargetRef(null);
        fetchAllData();
      }
    } catch (err) {
      alert('Error processing payout: ' + (err.response?.data?.message || err.message));
    } finally {
      setProcessingPayout(false);
    }
  };

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
      if (oppsRes?.data?.success) {
        const clean = (oppsRes.data.data || []).filter(
          (o) => !o.isDummy && o.opportunityCode !== 'DUMMY-SEED-001'
        );
        setPublishedOpps(clean);
      }
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

  // Visual Pipeline Stepper (Category Tailored)
  const renderPipelineStepper = (status, incentiveStatus, category = 'Insurance') => {
    let stages = [
      { label: 'Submitted', desc: 'Lead Registered' },
      { label: 'Under Review', desc: 'In Progress' },
      { label: 'Completed', desc: 'Verified' },
      { label: 'Incentive Settled', desc: 'Payout Completed' },
    ];

    if (category === 'Insurance') {
      stages = [
        { label: 'Submitted', desc: 'Lead Registered' },
        { label: 'Under Review', desc: 'Underwriting / KYC' },
        { label: 'Policy Issued', desc: 'Policy Active' },
        { label: 'Incentive Settled', desc: 'Payout Completed' },
      ];
    } else if (category === 'Job') {
      stages = [
        { label: 'Submitted', desc: 'Profile Submitted' },
        { label: 'Interview / Screening', desc: 'Rounds in Progress' },
        { label: 'Candidate Joined', desc: 'Joined Company' },
        { label: 'Incentive Settled', desc: 'Payout Completed' },
      ];
    } else if (category === 'Bank Account') {
      stages = [
        { label: 'Submitted', desc: 'Lead Received' },
        { label: 'KYC Review', desc: 'Biometric / Video KYC' },
        { label: 'Account Opened', desc: 'Account Active' },
        { label: 'Incentive Settled', desc: 'Payout Completed' },
      ];
    } else if (category === 'Credit Card') {
      stages = [
        { label: 'Submitted', desc: 'Application Received' },
        { label: 'Bank Review', desc: 'Credit Bureau & KYC' },
        { label: 'Card Activated', desc: 'Card Active' },
        { label: 'Incentive Settled', desc: 'Payout Completed' },
      ];
    }

    let currentStep = 1;
    if (['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Provider Processing', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(status)) {
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
              {st.desc && <div className="ref-step-sublabel">{st.desc}</div>}
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

  // Section 9: Specific Employee Dashboard KPI calculations
  const myTotalReferrals = referrals.length;
  const myCreditCardReferrals = referrals.filter(r => r.category === 'Credit Card').length;
  const myInsuranceReferrals = referrals.filter(r => r.category === 'Insurance').length;
  const myJobReferrals = referrals.filter(r => r.category === 'Job').length;
  const myAccountOpeningReferrals = referrals.filter(r => r.category === 'Bank Account').length;

  const myPaidIncentives = (stats?.incentives?.totalPaid || 0) + (myAppStats.totalIncentivesEarned || 0);
  const myPendingIncentives = (stats?.incentives?.totalPendingApproval || 0) + (stats?.incentives?.totalApprovedUnpaid || 0) + (myAppStats.pendingIncentives || 0);
  const myEligibleIncentives = myPaidIncentives + myPendingIncentives;

  return (
    <div className="management-page animate-fade-in">
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

      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #2563eb, #4f46e5, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Business Referral & Earnings Sync Active</span>
            </div>
            <h1>My Submissions & Referral Portfolio</h1>
            <p>
              Submit and track verified referrals for Insurance, Credit Cards, Bank Accounts, and Corporate Hiring Mandates. Monitor real-time status, milestone verification, and authorized incentive disbursements.
            </p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={fetchAllData}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => setShowSubmitModal(true)}
            >
              <Plus size={16} />
              <span>Submit Referral Lead</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Section: <strong>My Submissions & Earnings</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Privacy: <strong>100% Confidential & Tenant-Isolated</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Live Sync: <strong>{lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong></span>
        </div>
      </div>

      {/* ── SECTION 9: 8 EMPLOYEE KPI SUMMARY CARDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '1.5rem' }}>
        {/* Row 1: Category Referral Counts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="mgmt-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
              <FileText size={20} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label">My Total Referrals</span>
              <h3 className="mgmt-kpi-value">{myTotalReferrals}</h3>
            </div>
          </div>

          <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #1e40af' }}>
            <div className="mgmt-kpi-icon" style={{ background: 'rgba(30, 64, 175, 0.1)', color: '#1e40af' }}>
              <CreditCard size={20} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label">My Credit Card Referrals</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#1e40af' }}>{myCreditCardReferrals}</h3>
            </div>
          </div>

          <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #0284c7' }}>
            <div className="mgmt-kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
              <Shield size={20} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label">My Insurance Referrals</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#0284c7' }}>{myInsuranceReferrals}</h3>
            </div>
          </div>

          <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
            <div className="mgmt-kpi-icon" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
              <Briefcase size={20} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label">My Job Referrals</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#ea580c' }}>{myJobReferrals}</h3>
            </div>
          </div>

          <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #059669' }}>
            <div className="mgmt-kpi-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
              <Landmark size={20} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label">My Account Opening</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#059669' }}>{myAccountOpeningReferrals}</h3>
            </div>
          </div>
        </div>

        {/* Row 2: Incentive Financial Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div className="mgmt-kpi-card" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', border: '1px solid #bbf7d0', borderLeft: '4px solid #10b981' }}>
            <div className="mgmt-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
              <DollarSign size={22} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label" style={{ color: '#166534', fontWeight: 700 }}>My Eligible Incentives</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#15803d' }}>
                ₹{myEligibleIncentives.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="mgmt-kpi-card" style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)', border: '1px solid #fed7aa', borderLeft: '4px solid #f97316' }}>
            <div className="mgmt-kpi-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
              <Clock size={22} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label" style={{ color: '#9a3412', fontWeight: 700 }}>My Pending Incentives</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#c2410c' }}>
                ₹{myPendingIncentives.toLocaleString()}
              </h3>
            </div>
          </div>

          <div className="mgmt-kpi-card" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)', border: '1px solid #bfdbfe', borderLeft: '4px solid #2563eb' }}>
            <div className="mgmt-kpi-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
              <CheckCircle2 size={22} />
            </div>
            <div className="mgmt-kpi-info">
              <span className="mgmt-kpi-label" style={{ color: '#1e40af', fontWeight: 700 }}>My Paid Incentives</span>
              <h3 className="mgmt-kpi-value" style={{ color: '#1d4ed8' }}>
                ₹{myPaidIncentives.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ERP Management Card ── */}
      <div className="mgmt-table-card">
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color, #e2e8f0)', padding: '12px 18px', background: 'var(--bg-card, #ffffff)', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setMainView('my-referrals')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: (mainView === 'my-referrals' || mainView === 'direct-lead') ? '1px solid #2563eb' : '1px solid transparent',
              background: (mainView === 'my-referrals' || mainView === 'direct-lead') ? '#eff6ff' : 'transparent',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: (mainView === 'my-referrals' || mainView === 'direct-lead') ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <FileText size={16} />
            <span>My Referrals ({referrals.length})</span>
          </button>



          <button
            type="button"
            onClick={() => setMainView('leaderboard')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: mainView === 'leaderboard' ? '1px solid #2563eb' : '1px solid transparent',
              background: mainView === 'leaderboard' ? '#eff6ff' : 'transparent',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: mainView === 'leaderboard' ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Award size={16} />
            <span>Leaderboard</span>
          </button>
        </div>

      {/* ── VIEW 1: BROWSE PUBLISHED OPPORTUNITIES ── */}
      {mainView === 'opportunities' && (
        <div style={{ padding: '20px' }}>
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
        <div style={{ padding: '20px' }}>
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

                  {/* 4-Stage Stepper Progress (Category-Tailored) */}
                  {renderPipelineStepper(app.status, app.incentiveStatus, app.category)}

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

      {/* ── VIEW 3: MY REFERRALS & LIVE TRACKING ── */}
      {(mainView === 'my-referrals' || mainView === 'direct-lead') && (() => {
        const filteredDirectReferrals = referrals.filter((r) => {
          if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
          if (statusFilter !== 'All' && r.status !== statusFilter) return false;
          if (referralSearch) {
            const q = referralSearch.toLowerCase().trim();
            const applicantName = (
              r.applicantName ||
              r.formData?.applicantName ||
              r.insuranceDetails?.applicantName ||
              r.creditCardDetails?.applicantName ||
              r.bankAccountDetails?.applicantName ||
              r.jobDetails?.candidateName ||
              r.leadName ||
              r.fullName ||
              ''
            ).toLowerCase();
            const phone = (
              r.applicantPhone ||
              r.formData?.applicantPhone ||
              r.insuranceDetails?.applicantPhone ||
              r.creditCardDetails?.applicantPhone ||
              r.bankAccountDetails?.applicantPhone ||
              r.jobDetails?.candidatePhone ||
              r.phone ||
              ''
            ).toLowerCase();
            const code = (r.referralCode || '').toLowerCase();
            const partner = (r.partnerName || r.creditCardDetails?.partnerBank || '').toLowerCase();
            const product = (r.productName || r.creditCardDetails?.cardName || '').toLowerCase();
            const cat = (r.category || '').toLowerCase();

            if (
              !applicantName.includes(q) &&
              !phone.includes(q) &&
              !code.includes(q) &&
              !partner.includes(q) &&
              !product.includes(q) &&
              !cat.includes(q)
            ) {
              return false;
            }
          }
          return true;
        });

        return (
          <div style={{ padding: '20px' }}>
            {/* Header with Quick Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Referral Records & Verification Pipeline
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                  Live institutional ledger of your referrals, applicant milestones, and authorized payout settlements.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={() => {
                    setSubmitCategory(categoryFilter !== 'All' ? categoryFilter : 'Credit Card');
                    setShowSubmitModal(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontWeight: 600, borderRadius: '8px' }}
                >
                  <Plus size={16} />
                  <span>Submit New Referral</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mgmt-filters-row" style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px' }}>
                  <Filter size={14} /> Category:
                </span>
                {['All', 'Credit Card', 'Insurance', 'Bank Account', 'Job'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: categoryFilter === cat ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      background: categoryFilter === cat ? '#eff6ff' : '#ffffff',
                      color: categoryFilter === cat ? '#1d4ed8' : '#475569',
                      fontWeight: categoryFilter === cat ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      color: '#1e293b',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Milestone Verified">Milestone Verified</option>
                    <option value="Approved">Approved</option>
                    <option value="Paid">Paid</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '8px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search code, name, phone..."
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    style={{
                      padding: '5px 10px 5px 30px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      width: '100%',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                  {referralSearch && (
                    <button
                      type="button"
                      onClick={() => setReferralSearch('')}
                      style={{ position: 'absolute', right: '6px', top: '5px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Referrals Tracking Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                  Showing {filteredDirectReferrals.length} {filteredDirectReferrals.length === 1 ? 'record' : 'records'}
                </div>
                {refreshing && (
                  <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={13} className="spin" /> Syncing with institutional network...
                  </span>
                )}
              </div>

              {filteredDirectReferrals.length === 0 ? (
                <div style={{ padding: '48px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid #e2e8f0' }}>
                    <FileText size={24} style={{ color: '#94a3b8' }} />
                  </div>
                  {referrals.length === 0 ? (
                    <>
                      <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1rem', fontWeight: 800 }}>No referrals registered yet</h4>
                      <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.84rem', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                        Submit your first referral lead using the buttons above to earn authorized institutional incentives.
                      </p>
                      <button
                        type="button"
                        className="mgmt-btn-primary"
                        onClick={() => {
                          setSubmitCategory('Credit Card');
                          setShowSubmitModal(true);
                        }}
                      >
                        <Plus size={15} /> Submit Your First Referral
                      </button>
                    </>
                  ) : (
                    <>
                      <h4 style={{ margin: '0 0 4px', color: '#1e293b', fontSize: '1rem', fontWeight: 800 }}>No matching records found</h4>
                      <p style={{ margin: '0 0 14px', color: '#64748b', fontSize: '0.84rem' }}>
                        No submissions match the current category, status, or search query.
                      </p>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => {
                          setCategoryFilter('All');
                          setStatusFilter('All');
                          setReferralSearch('');
                        }}
                      >
                        Reset Filter Options
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mgmt-table-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflowX: 'auto' }}>
                  <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Referral Code</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Category & Offering</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Applicant Name & Contact</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Consent</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Pipeline Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Incentive Reward</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Submission Date</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDirectReferrals.map((r) => {
                        const applicantName = r.insuranceDetails?.applicantName || r.creditCardDetails?.applicantName || r.bankAccountDetails?.applicantName || r.jobDetails?.candidateName || 'N/A';
                        const applicantPhone = r.insuranceDetails?.applicantPhone || r.creditCardDetails?.applicantPhone || r.bankAccountDetails?.applicantPhone || r.jobDetails?.candidatePhone || '';
                        const productInfo = r.insuranceDetails?.provider || r.creditCardDetails?.bankName || r.bankAccountDetails?.bankName || r.jobDetails?.companyName || '';

                        return (
                          <tr key={r._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 700, fontFamily: 'monospace' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#1e293b' }}>{r.referralCode}</span>
                                <button
                                  type="button"
                                  className={`ref-copy-btn ${copiedId === r._id ? 'copied' : ''}`}
                                  onClick={() => handleCopy(r.referralCode, r._id)}
                                  title="Copy Referral Code"
                                  style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px' }}
                                >
                                  <Copy size={11} />
                                  <span>{copiedId === r._id ? '✓' : 'Copy'}</span>
                                </button>
                              </div>
                            </td>

                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.category}</div>
                              {productInfo && (
                                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{productInfo}</div>
                              )}
                            </td>

                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{applicantName}</div>
                              {applicantPhone && (
                                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>+91 {applicantPhone}</div>
                              )}
                            </td>

                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#065f46', padding: '2px 7px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 600 }}>
                                <Check size={11} /> Recorded
                              </span>
                            </td>

                            <td style={{ padding: '10px 14px' }}>
                              <span className={`ref-badge ${r.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                                {r.status}
                              </span>
                            </td>

                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 800, color: r.incentiveAmount > 0 ? '#059669' : '#64748b' }}>
                                {r.incentiveAmount > 0 ? `₹${r.incentiveAmount}` : 'Rule Pending'}
                              </div>
                              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                                {r.incentiveStatus || 'None'}
                              </div>
                            </td>

                            <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                              {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>

                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="mgmt-btn-secondary"
                                  style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => {
                                    setSelectedRef(r);
                                    setShowDetailModal(true);
                                  }}
                                >
                                  <Eye size={13} />
                                  <span>Audit</span>
                                </button>
                                {r.incentiveStatus === 'Approved' && (
                                  <button
                                    type="button"
                                    className="mgmt-btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#059669', borderColor: '#059669', color: '#ffffff' }}
                                    onClick={() => handleOpenPayoutForReferral(r)}
                                    title={`Process payout for approved incentive of ₹${r.incentiveAmount}`}
                                  >
                                    <DollarSign size={13} />
                                    <span>Pay ₹{r.incentiveAmount}</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── VIEW 4: TOP REFERRAL PERFORMERS LEADERBOARD ── */}
      {mainView === 'leaderboard' && (
        <div style={{ padding: '20px' }}>
          <TopReferralPerformers title="Campus Referral Leaderboard" />
        </div>
      )}
      </div>

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

      {/* ── REFERRAL DETAIL MODAL ── */}
      {showDetailModal && selectedRef && (
        <div className="ref-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="ref-modal-card" style={{ maxWidth: '640px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', textTransform: 'uppercase' }}>
                    {selectedRef.category}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Submitted {new Date(selectedRef.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="ref-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Referral {selectedRef.referralCode}</span>
                  <button
                    type="button"
                    className={`ref-copy-btn ${copiedId === selectedRef._id ? 'copied' : ''}`}
                    onClick={() => handleCopy(selectedRef.referralCode, selectedRef._id)}
                  >
                    <Copy size={13} />
                    <span>{copiedId === selectedRef._id ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <button type="button" className="ref-modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="ref-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 0' }}>
              {/* Stepper */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '10px' }}>Application Processing Pipeline</div>
                {renderPipelineStepper(selectedRef.status, selectedRef.incentiveStatus, selectedRef.category)}
              </div>

              {/* Applicant Info Box */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '18px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={16} className="text-blue-600" />
                  <span>Applicant Information</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Name:</span>{' '}
                    <strong>{selectedRef.insuranceDetails?.applicantName || selectedRef.creditCardDetails?.applicantName || selectedRef.bankAccountDetails?.applicantName || selectedRef.jobDetails?.candidateName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phone:</span>{' '}
                    <strong>+91 {selectedRef.insuranceDetails?.applicantPhone || selectedRef.creditCardDetails?.applicantPhone || selectedRef.bankAccountDetails?.applicantPhone || selectedRef.jobDetails?.candidatePhone || 'N/A'}</strong>
                  </div>
                  {(selectedRef.insuranceDetails?.applicantEmail || selectedRef.creditCardDetails?.applicantEmail || selectedRef.bankAccountDetails?.applicantEmail || selectedRef.jobDetails?.candidateEmail) && (
                    <div>
                      <span style={{ color: '#64748b' }}>Email:</span>{' '}
                      <span>{selectedRef.insuranceDetails?.applicantEmail || selectedRef.creditCardDetails?.applicantEmail || selectedRef.bankAccountDetails?.applicantEmail || selectedRef.jobDetails?.candidateEmail}</span>
                    </div>
                  )}
                  {(selectedRef.insuranceDetails?.provider || selectedRef.creditCardDetails?.bankName || selectedRef.bankAccountDetails?.bankName || selectedRef.jobDetails?.companyName) && (
                    <div>
                      <span style={{ color: '#64748b' }}>Target Partner:</span>{' '}
                      <strong>{selectedRef.insuranceDetails?.provider || selectedRef.creditCardDetails?.bankName || selectedRef.bankAccountDetails?.bankName || selectedRef.jobDetails?.companyName}</strong>
                    </div>
                  )}
                  {/* Category-Specific Rich Fields */}
                  {selectedRef.creditCardDetails?.cardProduct && (
                    <div>
                      <span style={{ color: '#64748b' }}>Card Product:</span>{' '}
                      <strong>{selectedRef.creditCardDetails.cardProduct}</strong>
                    </div>
                  )}
                  {selectedRef.creditCardDetails?.employmentType && (
                    <div>
                      <span style={{ color: '#64748b' }}>Employment:</span>{' '}
                      <span>{selectedRef.creditCardDetails.employmentType}</span>
                    </div>
                  )}
                  {selectedRef.creditCardDetails?.referralSource && (
                    <div>
                      <span style={{ color: '#64748b' }}>Referral Source:</span>{' '}
                      <span>{selectedRef.creditCardDetails.referralSource}</span>
                    </div>
                  )}
                  {selectedRef.creditCardDetails?.partnerReferenceNumber && (
                    <div>
                      <span style={{ color: '#64748b' }}>Partner Ref #:</span>{' '}
                      <span style={{ fontFamily: 'monospace' }}>{selectedRef.creditCardDetails.partnerReferenceNumber}</span>
                    </div>
                  )}

                  {/* Insurance Fields */}
                  {selectedRef.insuranceDetails?.selectedOffering && (
                    <div>
                      <span style={{ color: '#64748b' }}>Offering:</span>{' '}
                      <strong>{selectedRef.insuranceDetails.selectedOffering}</strong>
                    </div>
                  )}
                  {selectedRef.insuranceDetails?.sumInsuredTier && (
                    <div>
                      <span style={{ color: '#64748b' }}>Sum Insured:</span>{' '}
                      <span>{selectedRef.insuranceDetails.sumInsuredTier}</span>
                    </div>
                  )}
                  {selectedRef.insuranceDetails?.insuranceCategory && (
                    <div>
                      <span style={{ color: '#64748b' }}>Insurance Type:</span>{' '}
                      <span>{selectedRef.insuranceDetails.insuranceCategory}</span>
                    </div>
                  )}
                  {selectedRef.insuranceDetails?.partnerReferenceNumber && (
                    <div>
                      <span style={{ color: '#64748b' }}>Partner Ref #:</span>{' '}
                      <span style={{ fontFamily: 'monospace' }}>{selectedRef.insuranceDetails.partnerReferenceNumber}</span>
                    </div>
                  )}

                  {/* Job Fields */}
                  {selectedRef.jobDetails?.jobRole && (
                    <div>
                      <span style={{ color: '#64748b' }}>Job Role:</span>{' '}
                      <strong>{selectedRef.jobDetails.jobRole}</strong>
                    </div>
                  )}
                  {selectedRef.jobDetails?.jobReferenceId && (
                    <div>
                      <span style={{ color: '#64748b' }}>Job Ref ID:</span>{' '}
                      <span style={{ fontFamily: 'monospace' }}>{selectedRef.jobDetails.jobReferenceId}</span>
                    </div>
                  )}
                  {selectedRef.jobDetails?.experienceLevel && (
                    <div>
                      <span style={{ color: '#64748b' }}>Experience:</span>{' '}
                      <span>{selectedRef.jobDetails.experienceLevel}</span>
                    </div>
                  )}
                  {selectedRef.jobDetails?.referrerRelationship && (
                    <div>
                      <span style={{ color: '#64748b' }}>Relationship:</span>{' '}
                      <span>{selectedRef.jobDetails.referrerRelationship}</span>
                    </div>
                  )}

                  {/* Bank Account Fields */}
                  {selectedRef.bankAccountDetails?.accountProduct && (
                    <div>
                      <span style={{ color: '#64748b' }}>Account Product:</span>{' '}
                      <strong>{selectedRef.bankAccountDetails.accountProduct}</strong>
                    </div>
                  )}
                  {selectedRef.bankAccountDetails?.accountType && (
                    <div>
                      <span style={{ color: '#64748b' }}>Account Type:</span>{' '}
                      <span>{selectedRef.bankAccountDetails.accountType}</span>
                    </div>
                  )}
                  {selectedRef.bankAccountDetails?.applicantType && (
                    <div>
                      <span style={{ color: '#64748b' }}>Applicant Type:</span>{' '}
                      <span>{selectedRef.bankAccountDetails.applicantType}</span>
                    </div>
                  )}
                  {selectedRef.bankAccountDetails?.partnerReferenceNumber && (
                    <div>
                      <span style={{ color: '#64748b' }}>Partner Ref #:</span>{' '}
                      <span style={{ fontFamily: 'monospace' }}>{selectedRef.bankAccountDetails.partnerReferenceNumber}</span>
                    </div>
                  )}
                </div>

                {/* Consent Badge */}
                {(() => {
                  const consentNotice =
                    selectedRef.creditCardDetails?.consentNoticeVersion ||
                    selectedRef.insuranceDetails?.consentNoticeVersion ||
                    selectedRef.jobDetails?.consentNoticeVersion ||
                    selectedRef.bankAccountDetails?.consentNoticeVersion ||
                    'v1.0-GEN-CONSENT';

                  const consentTime =
                    selectedRef.creditCardDetails?.consentTimestamp ||
                    selectedRef.insuranceDetails?.consentTimestamp ||
                    selectedRef.jobDetails?.consentTimestamp ||
                    selectedRef.bankAccountDetails?.consentTimestamp;

                  return (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} className="text-emerald-600" />
                        <span style={{ fontSize: '0.82rem', color: '#065f46', fontWeight: 600 }}>
                          Applicant Consent: Explicitly Verified & Recorded ({consentNotice})
                        </span>
                      </div>
                      {consentTime && (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Timestamp: {new Date(consentTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Status & Review Remarks */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '18px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  Current Status & Admin Verification
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span className={`ref-badge ${selectedRef.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                    {selectedRef.status}
                  </span>
                  {selectedRef.milestoneVerified && (
                    <span style={{ background: '#ecfdf5', color: '#065f46', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                      ✓ Verified: {selectedRef.verifiedMilestoneName || 'Completed'}
                    </span>
                  )}
                </div>
                {selectedRef.notes && (
                  <div style={{ fontSize: '0.83rem', color: '#475569', marginTop: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Referral Notes:</span> {selectedRef.notes}
                  </div>
                )}
                {selectedRef.rejectionReason && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '8px 12px', borderRadius: '8px', fontSize: '0.83rem', marginTop: '8px' }}>
                    <strong>Rejection Reason:</strong> {selectedRef.rejectionReason}
                  </div>
                )}
                {selectedRef.returnReason && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '8px 12px', borderRadius: '8px', fontSize: '0.83rem', marginTop: '8px' }}>
                    <strong>Returned for Correction:</strong> {selectedRef.returnReason}
                  </div>
                )}
              </div>

              {/* Incentive Settlement Details */}
              <div style={{ background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', padding: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Incentive Settlement</div>
                    <div style={{ fontSize: '0.88rem', color: '#14532d', marginTop: '2px' }}>
                      Status: <strong style={{ color: selectedRef.incentiveStatus === 'Paid' ? '#059669' : '#d97706' }}>{selectedRef.incentiveStatus || 'None'}</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#059669' }}>
                    {selectedRef.incentiveAmount > 0 ? `₹${selectedRef.incentiveAmount}` : 'Rule Pending'}
                  </div>
                </div>

                {selectedRef.incentiveStatus === 'Approved' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                      ✓ <strong>Incentive Approved:</strong> Eligible for institutional payout disbursement.
                    </div>
                    <button
                      type="button"
                      className="mgmt-btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#059669', borderColor: '#059669', color: '#ffffff' }}
                      onClick={() => {
                        setShowDetailModal(false);
                        handleOpenPayoutForReferral(selectedRef);
                      }}
                    >
                      <DollarSign size={14} />
                      <span>Process Payout (₹{selectedRef.incentiveAmount})</span>
                    </button>
                  </div>
                )}

                {selectedRef.incentiveStatus === 'Paid' && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #bbf7d0', fontSize: '0.82rem', color: '#059669', fontWeight: 600 }}>
                    ✓ Payout Settled & Disbursed to Referrer.
                  </div>
                )}
              </div>

              {/* Status History / Audit Trail */}
              {selectedRef.statusHistory?.length > 0 && (
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                    Status Audit History
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedRef.statusHistory.map((hist, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem', borderBottom: i < selectedRef.statusHistory.length - 1 ? '1px dashed #e2e8f0' : 'none', paddingBottom: '6px' }}>
                        <div>
                          <strong style={{ color: '#1e293b' }}>{hist.status}</strong>
                          <span style={{ color: '#64748b' }}> • by {hist.role || 'Admin'}</span>
                          {hist.remarks && <div style={{ color: '#475569', fontSize: '0.78rem' }}>{hist.remarks}</div>}
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(hist.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="ref-modal-footer">
              <button type="button" className="ref-btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REFERRAL SUBMISSION MODAL ── */}
      <ReferralSubmissionModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultCategory={submitCategory}
        onSuccess={() => {
          fetchAllData();
        }}
      />

      {/* ── PAYOUT DISBURSEMENT MODAL ── */}
      {showPayoutModal && payoutTargetRef && (
        <div className="ref-modal-overlay" onClick={() => setShowPayoutModal(false)}>
          <div className="ref-modal-card" style={{ maxWidth: '520px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={18} className="text-emerald-600" />
                <span>Process Incentive Payout</span>
              </div>
              <button className="ref-modal-close" onClick={() => setShowPayoutModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConfirmPayout}>
              <div className="ref-modal-body">
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>PAYOUT SUMMARY</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
                      {payoutTargetRef.submitterName || 'Referrer'} ({payoutTargetRef.category})
                    </span>
                    <span style={{ fontSize: '1.35rem', color: '#059669', fontWeight: 900 }}>
                      ₹{payoutTargetRef.incentiveAmount}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Referral Code: <strong>{payoutTargetRef.referralCode}</strong>
                  </div>
                </div>

                <div className="ref-form-row">
                  <div className="ref-form-group">
                    <label className="ref-form-label">Payment Mode</label>
                    <select
                      className="ref-form-select"
                      value={payoutMode}
                      onChange={(e) => setPayoutMode(e.target.value)}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT / RTGS)</option>
                      <option value="UPI">UPI Payment</option>
                      <option value="IMPS">IMPS Immediate</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash Voucher</option>
                    </select>
                  </div>

                  <div className="ref-form-group">
                    <label className="ref-form-label">Transaction Reference / UTR *</label>
                    <input
                      type="text"
                      className="ref-form-input"
                      placeholder="e.g. UTR8912301948"
                      value={payoutTxnRef}
                      onChange={(e) => setPayoutTxnRef(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Disbursement Notes (Optional)</label>
                  <textarea
                    className="ref-form-textarea"
                    rows={2}
                    placeholder="Reference for institutional accounting records..."
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowPayoutModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ref-btn-primary"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  disabled={processingPayout}
                >
                  <Check size={16} />
                  <span>{processingPayout ? 'Processing...' : `Confirm & Settle ₹${payoutTargetRef.incentiveAmount}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
