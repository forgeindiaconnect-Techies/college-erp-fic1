import React, { useState, useEffect } from 'react';
import {
  Shield, CreditCard, Landmark, Briefcase, Plus, Search, Filter,
  TrendingUp, CheckCircle2, Clock, XCircle, ArrowUpRight, Award,
  Users, DollarSign, Download, RefreshCw, Eye, Edit3, AlertCircle,
  FileText, Check, X, RotateCcw, Building2, Copy, Sparkles, CheckCheck
} from 'lucide-react';
import {
  getAdminReferrals, getAdminReferralOverview, updateReferralStatus,
  getIncentiveRules, createIncentiveRule, updateIncentiveRule,
  getIncentives, approveIncentive, processIncentivePayout, reverseIncentive,
  getReferralDetails, submitReferral
} from '../../api/index';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import './AdminReferralManagement.css';

export default function AdminReferralManagement({ initialCollegeId = null }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview | all | insurance | creditcard | bank | job | owners | rules | approvals | audit
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overview, setOverview] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [rules, setRules] = useState([]);
  const [incentives, setIncentives] = useState([]);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item modals
  const [selectedReferral, setSelectedReferral] = useState(null);
  const [referralAuditLogs, setReferralAuditLogs] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [reviewingReferral, setReviewingReferral] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [verifiedMilestone, setVerifiedMilestone] = useState('');
  const [returnForCorrection, setReturnForCorrection] = useState(false);
  const [policyOrAppNumber, setPolicyOrAppNumber] = useState('');

  // Payout Modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedIncentivesForPayout, setSelectedIncentivesForPayout] = useState([]);
  const [payoutMode, setPayoutMode] = useState('Bank Transfer');
  const [payoutTxnRef, setPayoutTxnRef] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  // New Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRuleData, setNewRuleData] = useState({
    ruleName: '',
    category: 'Insurance',
    partnerName: 'All',
    milestone: 'Policy Issued',
    amountType: 'Fixed',
    amount: 500,
    maxLimit: 0,
    eligibilityConditions: '',
    cancellationPolicy: '',
  });

  // Reversal Modal
  const [reversingIncentive, setReversingIncentive] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [showReversalModal, setShowReversalModal] = useState(false);

  // New Referral Submission Modal (Admin can also submit)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCategory, setSubmitCategory] = useState('Insurance');
  const [submissionForm, setSubmissionForm] = useState({
    insuranceDetails: { provider: 'Star Health', productType: 'Health', applicantName: '', applicantPhone: '', applicantEmail: '', applicantCity: '', estimatedSumInsured: 500000, notes: '' },
    creditCardDetails: { bankName: 'HDFC Bank', cardProduct: 'Millennia Cashback', applicantName: '', applicantPhone: '', applicantEmail: '', monthlyIncome: '₹45,000', employmentType: 'Salaried', city: '', notes: '' },
    bankAccountDetails: { bankName: 'HDFC Bank', accountType: 'Savings Account', applicantName: '', applicantPhone: '', applicantEmail: '', branchCity: '', initialDeposit: 5000, notes: '' },
    jobDetails: { sector: 'IT / Software', companyName: 'TCS', jobRole: 'Full Stack Engineer', candidateName: '', candidatePhone: '', candidateEmail: '', experienceYears: '2 Years', skills: 'React, Node.js', expectedCtc: '8 LPA', candidateConsentGiven: true, notes: '' },
  });

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const params = initialCollegeId ? { collegeId: initialCollegeId } : {};

      const [overviewRes, referralsRes, rulesRes, incentivesRes] = await Promise.all([
        getAdminReferralOverview(params),
        getAdminReferrals(params),
        getIncentiveRules(),
        getIncentives(params),
      ]);

      if (overviewRes?.data?.success) setOverview(overviewRes.data.data);
      if (referralsRes?.data?.success) setReferrals(referralsRes.data.data);
      if (rulesRes?.data?.success) setRules(rulesRes.data.data);
      if (incentivesRes?.data?.success) setIncentives(incentivesRes.data.data);
    } catch (err) {
      console.error('Error fetching admin referral data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // ── Real-time Socket Synchronization across all tabs and colleges ──
  useRealtimeSync(['referrals', 'incentives', 'referral_rules', 'payouts'], (payload) => {
    fetchData();
    setLastSyncTime(new Date());
    if (payload?.message) {
      setToastMessage(payload.message);
      setTimeout(() => setToastMessage(null), 5000);
    }
  });

  const handleCopy = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Visual Pipeline Stepper
  const renderPipelineStepper = (refItem) => {
    if (!refItem) return null;
    const stages = [
      { label: 'Submitted', key: 'Submitted' },
      { label: 'In Review / Verification', key: 'Review' },
      { label: 'Milestone Verified', key: 'Milestone' },
      { label: 'Incentive Settled', key: 'Paid' },
    ];

    let currentStep = 1;
    const status = refItem.status || 'Submitted';
    if (['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(status)) {
      currentStep = 2;
    } else if (['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(status)) {
      currentStep = 3;
      if (refItem.incentiveStatus === 'Paid') currentStep = 4;
    } else if (refItem.incentiveStatus === 'Paid') {
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
          const isCompleted = stepNum < currentStep || (stepNum === 4 && refItem.incentiveStatus === 'Paid');
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

  useEffect(() => {
    fetchData();
  }, [initialCollegeId]);

  // Open Details Modal
  const handleViewDetails = async (refItem) => {
    try {
      const res = await getReferralDetails(refItem._id);
      if (res?.data?.success) {
        setSelectedReferral(res.data.data);
        setReferralAuditLogs(res.data.auditLogs || []);
        setShowDetailModal(true);
      }
    } catch (err) {
      alert('Failed to load referral details: ' + (err.response?.data?.message || err.message));
    }
  };

  // Open Review Status Modal
  const handleOpenReview = (refItem) => {
    setReviewingReferral(refItem);
    setNewStatus(refItem.status);
    setReviewRemarks('');
    setReviewReason('');
    setVerifiedMilestone('');
    setReturnForCorrection(false);
    setPolicyOrAppNumber('');
    setShowReviewModal(true);
  };

  // Submit Status Update
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!reviewingReferral) return;

    try {
      const payload = {
        status: newStatus,
        remarks: reviewRemarks,
        reason: reviewReason,
        verifiedMilestoneName: verifiedMilestone,
        isReturnedForCorrection: returnForCorrection,
      };

      if (reviewingReferral.category === 'Insurance') payload.policyNumber = policyOrAppNumber;
      if (reviewingReferral.category === 'Credit Card') payload.applicationNumber = policyOrAppNumber;
      if (reviewingReferral.category === 'Bank Account') payload.accountNumberMasked = policyOrAppNumber;

      const res = await updateReferralStatus(reviewingReferral._id, payload);
      if (res?.data?.success) {
        alert(res.data.message || 'Status updated successfully!');
        setShowReviewModal(false);
        fetchData();
      }
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.message || err.message));
    }
  };

  // Approve / Reject Incentive
  const handleIncentiveAction = async (incentiveId, decision) => {
    const promptMsg = decision === 'Approved'
      ? 'Enter optional approval remarks:'
      : 'Enter mandatory reason for rejecting incentive:';
    const reason = window.prompt(promptMsg);
    if (decision === 'Rejected' && !reason) {
      alert('Rejection reason is required.');
      return;
    }

    try {
      const res = await approveIncentive(incentiveId, {
        decision,
        remarks: reason || 'Approved by administrator.',
        reason: reason || '',
      });
      if (res?.data?.success) {
        alert(`Incentive ${decision.toLowerCase()} successfully!`);
        fetchData();
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Open Payout Modal
  const handleOpenPayout = () => {
    const approved = incentives.filter(i => i.status === 'Approved');
    if (approved.length === 0) {
      alert('No approved incentives currently awaiting payout.');
      return;
    }
    setSelectedIncentivesForPayout(approved.map(a => a._id));
    setPayoutTxnRef(`UTR${Date.now().toString().slice(-8)}`);
    setShowPayoutModal(true);
  };

  // Submit Payout
  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (selectedIncentivesForPayout.length === 0) {
      alert('Please select at least one incentive.');
      return;
    }
    if (!payoutTxnRef.trim()) {
      alert('Transaction UTR / Receipt reference is required.');
      return;
    }

    try {
      const res = await processIncentivePayout({
        incentiveIds: selectedIncentivesForPayout,
        paymentMode: payoutMode,
        transactionReference: payoutTxnRef.trim(),
        notes: payoutNotes,
      });

      if (res?.data?.success) {
        alert(res.data.message || 'Payouts processed successfully!');
        setShowPayoutModal(false);
        fetchData();
      }
    } catch (err) {
      alert('Error processing payout: ' + (err.response?.data?.message || err.message));
    }
  };

  // Create Rule
  const handleCreateRule = async (e) => {
    e.preventDefault();
    try {
      const res = await createIncentiveRule(newRuleData);
      if (res?.data?.success) {
        alert('Incentive rule created successfully!');
        setShowRuleModal(false);
        fetchData();
      }
    } catch (err) {
      alert('Error creating rule: ' + (err.response?.data?.message || err.message));
    }
  };

  // Toggle Rule Active State
  const handleToggleRule = async (ruleId, currentStatus) => {
    try {
      await updateIncentiveRule(ruleId, { isActive: !currentStatus });
      fetchData();
    } catch (err) {
      alert('Error updating rule: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reversal Action
  const handleConfirmReversal = async (e) => {
    e.preventDefault();
    if (!reversingIncentive || !reversalReason.trim()) {
      alert('Reversal reason is required.');
      return;
    }
    try {
      const res = await reverseIncentive(reversingIncentive._id, { reversalReason: reversalReason.trim() });
      if (res?.data?.success) {
        alert('Incentive successfully reversed and audit logged.');
        setShowReversalModal(false);
        fetchData();
      }
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  // Submit New Referral
  const handleSubmitNewReferral = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category: submitCategory,
        insuranceDetails: submitCategory === 'Insurance' ? submissionForm.insuranceDetails : undefined,
        creditCardDetails: submitCategory === 'Credit Card' ? submissionForm.creditCardDetails : undefined,
        bankAccountDetails: submitCategory === 'Bank Account' ? submissionForm.bankAccountDetails : undefined,
        jobDetails: submitCategory === 'Job' ? submissionForm.jobDetails : undefined,
      };

      const res = await submitReferral(payload);
      if (res?.data?.success) {
        alert(res.data.message || 'Referral submitted successfully!');
        setShowSubmitModal(false);
        fetchData();
      }
    } catch (err) {
      alert('Error submitting referral: ' + (err.response?.data?.message || err.message));
    }
  };

  // Filtered referrals list
  const filteredReferrals = referrals.filter(r => {
    if (activeTab === 'insurance' && r.category !== 'Insurance') return false;
    if (activeTab === 'creditcard' && r.category !== 'Credit Card') return false;
    if (activeTab === 'bank' && r.category !== 'Bank Account') return false;
    if (activeTab === 'job' && r.category !== 'Job') return false;

    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (r.referralCode || '').toLowerCase();
      const submitter = (r.submitterName || '').toLowerCase();
      const applicant = (
        r.insuranceDetails?.applicantName ||
        r.creditCardDetails?.applicantName ||
        r.bankAccountDetails?.applicantName ||
        r.jobDetails?.candidateName ||
        ''
      ).toLowerCase();
      return code.includes(q) || submitter.includes(q) || applicant.includes(q);
    }
    return true;
  });

  const getApplicantDisplay = (r) => {
    if (r.category === 'Insurance') return `${r.insuranceDetails?.applicantName || 'Applicant'} (${r.insuranceDetails?.provider || 'Insurance'})`;
    if (r.category === 'Credit Card') return `${r.creditCardDetails?.applicantName || 'Applicant'} (${r.creditCardDetails?.bankName || 'Bank'})`;
    if (r.category === 'Bank Account') return `${r.bankAccountDetails?.applicantName || 'Customer'} (${r.bankAccountDetails?.accountType || 'Account'})`;
    if (r.category === 'Job') return `${r.jobDetails?.candidateName || 'Candidate'} (${r.jobDetails?.jobRole || 'Role'})`;
    return 'Lead';
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Submitted') return 'ref-badge-submitted';
    if (['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(status)) return 'ref-badge-success';
    if (['Rejected', 'Cancelled'].includes(status)) return 'ref-badge-rejected';
    if (status === 'Returned For Correction') return 'ref-badge-returned';
    return 'ref-badge-progress';
  };

  return (
    <div className="ref-mgmt-container">
      {/* ── REAL-TIME TOAST ALERT ── */}
      {toastMessage && (
        <div className="ref-floating-toast">
          <div className="ref-toast-icon">
            <Sparkles size={18} />
          </div>
          <div className="ref-toast-body">
            <div className="ref-toast-title">Live Real-Time Update</div>
            <div className="ref-toast-desc">{toastMessage}</div>
          </div>
          <button className="ref-toast-close" onClick={() => setToastMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── HEADER ROW ── */}
      <div className="ref-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="ref-header-title">
              <Award className="text-blue-600" size={28} />
              Business Referral & Incentive Management
            </h1>
            <div className="ref-live-sync-pill">
              <span className="ref-pulse-dot"></span>
              <span>Live Sync Active</span>
              <span className="ref-live-sync-time">• {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
          <p className="ref-header-sub">
            Enterprise partner lead tracking, multi-category pipelines, immutable incentive rules, and payout governance.
          </p>
        </div>

        <div className="ref-action-btns">
          <button className="ref-btn-secondary" onClick={fetchData} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <a
            href={`/api/referrals/export/csv${initialCollegeId ? `?collegeId=${initialCollegeId}` : ''}`}
            download
            className="ref-btn-secondary"
          >
            <Download size={16} /> Export CSV
          </a>
          <button className="ref-btn-primary" onClick={() => setShowSubmitModal(true)}>
            <Plus size={16} /> Register New Referral
          </button>
        </div>
      </div>

      {/* ── STATS METRICS ROW ── */}
      <div className="ref-metrics-grid">
        <div className="ref-stat-card">
          <div className="ref-stat-top">
            <span className="ref-stat-label">Total Referrals</span>
            <div className="ref-stat-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FileText size={20} />
            </div>
          </div>
          <div className="ref-stat-value">{overview?.totalReferrals || referrals.length}</div>
          <div className="ref-stat-sub">
            <span style={{ color: '#059669', fontWeight: 'bold' }}>{overview?.convertedCount || 0}</span> converted leads
          </div>
        </div>

        <div className="ref-stat-card">
          <div className="ref-stat-top">
            <span className="ref-stat-label">In Progress Leads</span>
            <div className="ref-stat-icon-wrap" style={{ background: '#fefce8', color: '#ca8a04' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="ref-stat-value">{overview?.inProgressCount || 0}</div>
          <div className="ref-stat-sub">Active partner review</div>
        </div>

        <div className="ref-stat-card">
          <div className="ref-stat-top">
            <span className="ref-stat-label">Pending Approval</span>
            <div className="ref-stat-icon-wrap" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="ref-stat-value">₹{(overview?.financials?.totalPendingApproval || 0).toLocaleString()}</div>
          <div className="ref-stat-sub">Verified milestones awaiting review</div>
        </div>

        <div className="ref-stat-card">
          <div className="ref-stat-top">
            <span className="ref-stat-label">Total Paid Incentives</span>
            <div className="ref-stat-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="ref-stat-value" style={{ color: '#059669' }}>
            ₹{(overview?.financials?.totalPaid || 0).toLocaleString()}
          </div>
          <div className="ref-stat-sub">Confirmed partner payouts</div>
        </div>
      </div>

      {/* ── 4 CATEGORIES QUICK PILLS ── */}
      <div className="ref-category-pills">
        <div
          className={`ref-cat-pill ${activeTab === 'insurance' ? 'active' : ''}`}
          onClick={() => setActiveTab('insurance')}
        >
          <div className="ref-cat-pill-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>🛡️</div>
          <div>
            <div className="ref-cat-pill-title">Insurance Referrals</div>
            <div className="ref-cat-pill-count">{overview?.categoryCounts?.['Insurance'] || 0} Leads</div>
          </div>
        </div>

        <div
          className={`ref-cat-pill ${activeTab === 'creditcard' ? 'active' : ''}`}
          onClick={() => setActiveTab('creditcard')}
        >
          <div className="ref-cat-pill-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>💳</div>
          <div>
            <div className="ref-cat-pill-title">Credit Card Leads</div>
            <div className="ref-cat-pill-count">{overview?.categoryCounts?.['Credit Card'] || 0} Leads</div>
          </div>
        </div>

        <div
          className={`ref-cat-pill ${activeTab === 'bank' ? 'active' : ''}`}
          onClick={() => setActiveTab('bank')}
        >
          <div className="ref-cat-pill-icon" style={{ background: '#ecfdf5', color: '#059669' }}>🏦</div>
          <div>
            <div className="ref-cat-pill-title">Bank Accounts</div>
            <div className="ref-cat-pill-count">{overview?.categoryCounts?.['Bank Account'] || 0} Leads</div>
          </div>
        </div>

        <div
          className={`ref-cat-pill ${activeTab === 'job' ? 'active' : ''}`}
          onClick={() => setActiveTab('job')}
        >
          <div className="ref-cat-pill-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>💼</div>
          <div>
            <div className="ref-cat-pill-title">Job Referrals</div>
            <div className="ref-cat-pill-count">{overview?.categoryCounts?.['Job'] || 0} Candidates</div>
          </div>
        </div>
      </div>

      {/* ── TABS BAR ── */}
      <div className="ref-tabs-bar">
        <button
          className={`ref-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <TrendingUp size={16} /> Overview Analytics
        </button>
        <button
          className={`ref-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <FileText size={16} /> All Referrals
          <span className="ref-tab-badge">{referrals.length}</span>
        </button>
        <button
          className={`ref-tab-btn ${activeTab === 'owners' ? 'active' : ''}`}
          onClick={() => setActiveTab('owners')}
        >
          <Users size={16} /> Referral Owners
        </button>
        <button
          className={`ref-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Award size={16} /> Incentive Configuration
          <span className="ref-tab-badge">{rules.length}</span>
        </button>
        <button
          className={`ref-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
          onClick={() => setActiveTab('approvals')}
        >
          <CheckCircle2 size={16} /> Approvals & Payouts
          <span className="ref-tab-badge">{incentives.filter(i => i.status === 'Pending Approval').length}</span>
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW ANALYTICS ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Category Conversion Rates */}
          <div className="ref-table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
              Conversion Performance by Category
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { cat: 'Insurance', icon: '🛡️', color: '#2563eb' },
                { cat: 'Credit Card', icon: '💳', color: '#7c3aed' },
                { cat: 'Bank Account', icon: '🏦', color: '#059669' },
                { cat: 'Job', icon: '💼', color: '#ea580c' },
              ].map(item => {
                const total = overview?.categoryCounts?.[item.cat] || 0;
                const conv = overview?.categoryConversions?.[item.cat] || 0;
                const pct = total > 0 ? Math.round((conv / total) * 100) : 0;
                return (
                  <div key={item.cat} style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{item.icon} {item.cat}</span>
                      <span style={{ fontWeight: 800, color: item.color }}>{conv} / {total} ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: item.color, borderRadius: '4px' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Pipeline */}
          <div className="ref-table-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>
              Incentive Pipeline Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#ecfdf5', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
                <span style={{ fontWeight: 600, color: '#047857' }}>✔ Total Paid & Settled</span>
                <span style={{ fontWeight: 800, color: '#047857', fontSize: '1.1rem' }}>₹{(overview?.financials?.totalPaid || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontWeight: 600, color: '#1d4ed8' }}>⏳ Approved (Awaiting Payout)</span>
                <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: '1.1rem' }}>₹{(overview?.financials?.totalApprovedUnpaid || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #fed7aa' }}>
                <span style={{ fontWeight: 600, color: '#c2410c' }}>📋 Pending Verification & Approval</span>
                <span style={{ fontWeight: 800, color: '#c2410c', fontSize: '1.1rem' }}>₹{(overview?.financials?.totalPendingApproval || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <span style={{ fontWeight: 600, color: '#b91c1c' }}>↩ Reversed / Cancelled</span>
                <span style={{ fontWeight: 800, color: '#b91c1c', fontSize: '1.1rem' }}>₹{(overview?.financials?.totalReversed || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2 / CATEGORY TABS: REFERRALS TABLE ── */}
      {['all', 'insurance', 'creditcard', 'bank', 'job'].includes(activeTab) && (
        <>
          {/* Filters Bar */}
          <div className="ref-filter-bar">
            <div className="ref-search-input-wrap">
              <Search size={16} className="ref-search-icon" />
              <input
                type="text"
                placeholder="Search referral code, applicant name, or submitter..."
                className="ref-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {activeTab === 'all' && (
              <select
                className="ref-select-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Insurance">Insurance</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Bank Account">Bank Account</option>
                <option value="Job">Job Referral</option>
              </select>
            )}

            <select
              className="ref-select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="Under Review">Under Review</option>
              <option value="Policy Issued">Policy Issued (Insurance)</option>
              <option value="Approved">Approved</option>
              <option value="Activated">Activated</option>
              <option value="Account Opened">Account Opened (Bank)</option>
              <option value="Joined">Joined (Job)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Table */}
          <div className="ref-table-card">
            <div className="ref-table-responsive">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Ref Code</th>
                    <th>Category</th>
                    <th>Applicant / Candidate</th>
                    <th>Referral Owner</th>
                    <th>Status</th>
                    <th>Milestone</th>
                    <th>Incentive Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="ref-empty-state">
                          <div className="ref-empty-icon">📂</div>
                          <div className="ref-empty-title">No referrals found</div>
                          <div className="ref-empty-sub">Try adjusting your search criteria or register a new referral.</div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredReferrals.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a' }}>
                              {r.referralCode}
                            </span>
                            <button
                              type="button"
                              className={`ref-copy-btn ${copiedId === r._id ? 'copied' : ''}`}
                              onClick={() => handleCopy(r.referralCode, r._id)}
                              title="Copy Referral Code"
                            >
                              {copiedId === r._id ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedId === r._id ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className={`ref-cat-tag ref-cat-${r.category.toLowerCase().replace(/\s+/g, '')}`}>
                            {r.category === 'Insurance' && '🛡️ '}
                            {r.category === 'Credit Card' && '💳 '}
                            {r.category === 'Bank Account' && '🏦 '}
                            {r.category === 'Job' && '💼 '}
                            {r.category}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{getApplicantDisplay(r)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {r.insuranceDetails?.applicantPhone || r.creditCardDetails?.applicantPhone || r.bankAccountDetails?.applicantPhone || r.jobDetails?.candidatePhone || ''}
                          </div>
                        </td>
                        <td>
                          <div className="ref-submitter-cell">
                            <span className="ref-submitter-name">{r.submitterName}</span>
                            <span className="ref-submitter-role">{r.submitterRole} • {r.submitterDepartment}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td>
                          {r.milestoneVerified ? (
                            <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> {r.verifiedMilestoneName || 'Verified'}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Unverified</span>
                          )}
                        </td>
                        <td>
                          {r.incentiveEligible ? (
                            <div>
                              <div style={{ fontWeight: 800, color: r.incentiveStatus === 'Paid' ? '#059669' : '#2563eb' }}>
                                ₹{r.incentiveAmount}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.incentiveStatus}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not eligible</span>
                          )}
                        </td>
                        <td>
                          <div className="ref-action-cell">
                            <button
                              className="ref-btn-sm ref-btn-view"
                              onClick={() => handleViewDetails(r)}
                              title="View Details"
                            >
                              <Eye size={14} /> View
                            </button>
                            <button
                              className="ref-btn-sm ref-btn-review"
                              onClick={() => handleOpenReview(r)}
                              title="Review / Update Status"
                            >
                              <Edit3 size={14} /> Review
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── TAB 3: REFERRAL OWNERS LEADERBOARD ── */}
      {activeTab === 'owners' && (
        <div className="ref-table-card">
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Referral Owners & Performance</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Authorized campus submitters across staff, students, and departments with conversion ratios.
            </p>
          </div>
          <div className="ref-table-responsive">
            <table className="ref-table">
              <thead>
                <tr>
                  <th>Referral Owner</th>
                  <th>Campus Role</th>
                  <th>Department</th>
                  <th>Total Submissions</th>
                  <th>Converted Leads</th>
                  <th>Conversion Rate</th>
                  <th>Total Incentives Earned</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.topOwners || []).map((owner) => {
                  const rate = owner.totalReferrals > 0 ? Math.round((owner.converted / owner.totalReferrals) * 100) : 0;
                  return (
                    <tr key={owner.userId}>
                      <td>
                        <span style={{ fontWeight: 700 }}>{owner.name}</span>
                      </td>
                      <td>
                        <span className="ref-badge ref-badge-submitted">{owner.role}</span>
                      </td>
                      <td>{owner.department}</td>
                      <td style={{ fontWeight: 800 }}>{owner.totalReferrals}</td>
                      <td style={{ color: '#059669', fontWeight: 800 }}>{owner.converted}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: rate > 50 ? '#059669' : '#ea580c' }}>
                          {rate}%
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>
                        ₹{(owner.earnedAmount || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: INCENTIVE CONFIGURATION RULES ── */}
      {activeTab === 'rules' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Active Incentive Policy Rules</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Configurable reward policies by partner, category, milestone, and calculation method.
              </p>
            </div>
            <button className="ref-btn-primary" onClick={() => setShowRuleModal(true)}>
              <Plus size={16} /> Add Incentive Rule
            </button>
          </div>

          <div className="ref-table-card">
            <div className="ref-table-responsive">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Rule Code</th>
                    <th>Policy Name</th>
                    <th>Category</th>
                    <th>Target Milestone</th>
                    <th>Calculation</th>
                    <th>Reward Amount</th>
                    <th>Conditions</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule._id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{rule.ruleCode}</td>
                      <td style={{ fontWeight: 700 }}>{rule.ruleName}</td>
                      <td>
                        <span className={`ref-cat-tag ref-cat-${rule.category.toLowerCase().replace(/\s+/g, '')}`}>
                          {rule.category}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1e3a8a' }}>{rule.milestone}</span>
                      </td>
                      <td>{rule.amountType}</td>
                      <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                        {rule.amountType === 'Fixed' ? `₹${rule.amount}` : `${rule.amount}%`}
                      </td>
                      <td style={{ maxWidth: '250px', fontSize: '0.78rem', color: '#64748b' }}>
                        {rule.eligibilityConditions}
                      </td>
                      <td>
                        <span className={`ref-badge ${rule.isActive ? 'ref-badge-success' : 'ref-badge-rejected'}`}>
                          {rule.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="ref-btn-sm ref-btn-view"
                          onClick={() => handleToggleRule(rule._id, rule.isActive)}
                        >
                          {rule.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: APPROVALS & PAYOUTS ── */}
      {activeTab === 'approvals' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Incentive Approval & Disbursement Queue</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                Two-stage governance: Milestone Verified → Approved → Payout Settlement with UTR recording.
              </p>
            </div>
            <button className="ref-btn-primary" onClick={handleOpenPayout}>
              <DollarSign size={16} /> Process Approved Payouts
            </button>
          </div>

          <div className="ref-table-card">
            <div className="ref-table-responsive">
              <table className="ref-table">
                <thead>
                  <tr>
                    <th>Incentive Code</th>
                    <th>Referral Code</th>
                    <th>Category</th>
                    <th>Recipient (Owner)</th>
                    <th>Amount</th>
                    <th>Applied Rule Milestone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incentives.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="ref-empty-state">No incentives recorded yet.</td>
                    </tr>
                  ) : (
                    incentives.map((inc) => (
                      <tr key={inc._id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{inc.incentiveCode}</td>
                        <td style={{ fontFamily: 'monospace', color: '#2563eb' }}>{inc.referralCode}</td>
                        <td>{inc.category}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{inc.earnedByName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{inc.earnedByRole}</div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                          ₹{inc.amount}
                        </td>
                        <td>{inc.ruleSnapshot?.milestone || 'Milestone Verified'}</td>
                        <td>
                          <span className={`ref-badge ${getStatusBadgeClass(inc.status)}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td>
                          <div className="ref-action-cell">
                            {inc.status === 'Pending Approval' && (
                              <>
                                <button
                                  className="ref-btn-sm"
                                  style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
                                  onClick={() => handleIncentiveAction(inc._id, 'Approved')}
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button
                                  className="ref-btn-sm"
                                  style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                                  onClick={() => handleIncentiveAction(inc._id, 'Rejected')}
                                >
                                  <X size={14} /> Reject
                                </button>
                              </>
                            )}
                            {inc.status === 'Paid' && (
                              <button
                                className="ref-btn-sm"
                                style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}
                                onClick={() => {
                                  setReversingIncentive(inc);
                                  setReversalReason('');
                                  setShowReversalModal(true);
                                }}
                              >
                                <RotateCcw size={14} /> Reverse
                              </button>
                            )}
                            {inc.status === 'Approved' && (
                              <span style={{ color: '#059669', fontSize: '0.78rem', fontWeight: 700 }}>
                                Ready for Payout
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: REFERRAL DETAILS & AUDIT TIMELINE ── */}
      {showDetailModal && selectedReferral && (
        <div className="ref-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">
                <span>Referral Details: {selectedReferral.referralCode}</span>
                <span className={`ref-badge ${getStatusBadgeClass(selectedReferral.status)}`}>
                  {selectedReferral.status}
                </span>
              </div>
              <button className="ref-modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="ref-modal-body">
              {/* Interactive Visual Stepper Pipeline */}
              {renderPipelineStepper(selectedReferral)}

              {/* Category-specific specs */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.2rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  {selectedReferral.category} Information
                </h4>
                {selectedReferral.category === 'Insurance' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Provider:</strong> {selectedReferral.insuranceDetails?.provider || 'N/A'}</div>
                    <div><strong>Plan Type:</strong> {selectedReferral.insuranceDetails?.productType || 'N/A'}</div>
                    <div><strong>Applicant:</strong> {selectedReferral.insuranceDetails?.applicantName}</div>
                    <div><strong>Phone:</strong> {selectedReferral.insuranceDetails?.applicantPhone}</div>
                    <div><strong>Sum Insured:</strong> ₹{selectedReferral.insuranceDetails?.estimatedSumInsured?.toLocaleString()}</div>
                    <div><strong>Policy #:</strong> {selectedReferral.insuranceDetails?.policyNumber || 'Not Issued Yet'}</div>
                  </div>
                )}
                {selectedReferral.category === 'Credit Card' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Bank:</strong> {selectedReferral.creditCardDetails?.bankName}</div>
                    <div><strong>Product:</strong> {selectedReferral.creditCardDetails?.cardProduct}</div>
                    <div><strong>Applicant:</strong> {selectedReferral.creditCardDetails?.applicantName}</div>
                    <div><strong>Phone:</strong> {selectedReferral.creditCardDetails?.applicantPhone}</div>
                    <div><strong>Employment:</strong> {selectedReferral.creditCardDetails?.employmentType}</div>
                    <div><strong>App #:</strong> {selectedReferral.creditCardDetails?.applicationNumber || 'Under Review'}</div>
                  </div>
                )}
                {selectedReferral.category === 'Bank Account' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Bank:</strong> {selectedReferral.bankAccountDetails?.bankName}</div>
                    <div><strong>Account Type:</strong> {selectedReferral.bankAccountDetails?.accountType}</div>
                    <div><strong>Customer:</strong> {selectedReferral.bankAccountDetails?.applicantName}</div>
                    <div><strong>KYC Status:</strong> {selectedReferral.bankAccountDetails?.kycStatus}</div>
                    <div><strong>Masked Acc #:</strong> {selectedReferral.bankAccountDetails?.accountNumberMasked || 'Pending Opening'}</div>
                  </div>
                )}
                {selectedReferral.category === 'Job' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Sector:</strong> {selectedReferral.jobDetails?.sector}</div>
                    <div><strong>Company:</strong> {selectedReferral.jobDetails?.companyName}</div>
                    <div><strong>Role:</strong> {selectedReferral.jobDetails?.jobRole}</div>
                    <div><strong>Candidate:</strong> {selectedReferral.jobDetails?.candidateName}</div>
                    <div><strong>Stage:</strong> {selectedReferral.jobDetails?.currentInterviewStage}</div>
                    <div><strong>Candidate Consent:</strong> Verified ✔</div>
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Lifecycle Status Timeline
              </h4>
              <div className="ref-timeline">
                {(selectedReferral.statusHistory || []).map((h, i) => (
                  <div key={i} className="ref-timeline-item">
                    <div className="ref-timeline-dot">✓</div>
                    <div className="ref-timeline-content">
                      <div className="ref-timeline-status">{h.status}</div>
                      <div className="ref-timeline-meta">
                        Updated by {h.updatedBy} ({h.role}) on {new Date(h.timestamp).toLocaleString()}
                      </div>
                      {h.remarks && <div className="ref-timeline-remarks">{h.remarks}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Audit Trail */}
              {referralAuditLogs.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Security & Governance Audit Trail
                  </h4>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto', fontSize: '0.78rem' }}>
                    {referralAuditLogs.map((log) => (
                      <div key={log._id} style={{ marginBottom: '6px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>[{log.action}]</span> {log.details} - by {log.performedByName} at {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ref-modal-footer">
              <button className="ref-btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REVIEW / UPDATE STATUS ── */}
      {showReviewModal && reviewingReferral && (
        <div className="ref-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">
                Review Referral: {reviewingReferral.referralCode}
              </div>
              <button className="ref-modal-close" onClick={() => setShowReviewModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveStatus}>
              <div className="ref-modal-body">
                {/* Visual Pipeline Stepper */}
                {renderPipelineStepper(reviewingReferral)}

                <div className="ref-form-group">
                  <label className="ref-form-label">New Status</label>
                  <select
                    className="ref-form-select"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                  >
                    <option value="Submitted">Submitted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Application in Progress">Application in Progress</option>
                    <option value="Verification">Verification / KYC</option>
                    <option value="Policy Issued">Policy Issued (Insurance Milestone)</option>
                    <option value="Approved">Approved (Credit Card)</option>
                    <option value="Activated">Activated (Card/Account Milestone)</option>
                    <option value="Account Opened">Account Opened (Bank Milestone)</option>
                    <option value="Interview Round 1">Interview Round 1</option>
                    <option value="Selected">Selected</option>
                    <option value="Joined">Joined (Job Milestone)</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Milestone Verification Trigger (Optional)</label>
                  <select
                    className="ref-form-select"
                    value={verifiedMilestone}
                    onChange={(e) => setVerifiedMilestone(e.target.value)}
                  >
                    <option value="">None (Automatic based on status)</option>
                    <option value="Policy Issued">Policy Issued (Triggers Insurance Incentive)</option>
                    <option value="Activated">Card / Account Activated (Triggers Card Incentive)</option>
                    <option value="Account Opened">Account Opened (Triggers Bank Incentive)</option>
                    <option value="Joined">Joined (Triggers Job Incentive)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Selecting a verified milestone will automatically trigger the Incentive Engine to calculate the reward for the submitter.
                  </span>
                </div>

                {reviewingReferral.category === 'Insurance' && (
                  <div className="ref-form-group">
                    <label className="ref-form-label">Policy Number</label>
                    <input
                      type="text"
                      className="ref-form-input"
                      placeholder="e.g. POL-9843212"
                      value={policyOrAppNumber}
                      onChange={(e) => setPolicyOrAppNumber(e.target.value)}
                    />
                  </div>
                )}

                {reviewingReferral.category === 'Bank Account' && (
                  <div className="ref-form-group">
                    <label className="ref-form-label">Masked Account Number</label>
                    <input
                      type="text"
                      className="ref-form-input"
                      placeholder="e.g. XXXXXX4589 (Protect customer privacy)"
                      value={policyOrAppNumber}
                      onChange={(e) => setPolicyOrAppNumber(e.target.value)}
                    />
                  </div>
                )}

                {(newStatus === 'Rejected' || newStatus === 'Cancelled') && (
                  <div className="ref-form-group">
                    <label className="ref-form-label" style={{ color: '#b91c1c' }}>Rejection Reason (Required)</label>
                    <textarea
                      className="ref-form-textarea"
                      rows={2}
                      placeholder="Explain why this referral was rejected..."
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="ref-form-group">
                  <label className="ref-form-label">Review Remarks / Notes</label>
                  <textarea
                    className="ref-form-textarea"
                    rows={2}
                    placeholder="Enter review notes visible to the referral owner..."
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                  />
                </div>
              </div>
              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowReviewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ref-btn-primary">
                  Update Status & Trigger Rules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: INCENTIVE RULE CREATION ── */}
      {showRuleModal && (
        <div className="ref-modal-overlay" onClick={() => setShowRuleModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">Configure New Incentive Rule</div>
              <button className="ref-modal-close" onClick={() => setShowRuleModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateRule}>
              <div className="ref-modal-body">
                <div className="ref-form-group">
                  <label className="ref-form-label">Rule Policy Name</label>
                  <input
                    type="text"
                    className="ref-form-input"
                    placeholder="e.g. Health Insurance Issuance Reward"
                    value={newRuleData.ruleName}
                    onChange={(e) => setNewRuleData({ ...newRuleData, ruleName: e.target.value })}
                    required
                  />
                </div>

                <div className="ref-form-row">
                  <div className="ref-form-group">
                    <label className="ref-form-label">Category</label>
                    <select
                      className="ref-form-select"
                      value={newRuleData.category}
                      onChange={(e) => setNewRuleData({ ...newRuleData, category: e.target.value })}
                    >
                      <option value="Insurance">Insurance</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Bank Account">Bank Account</option>
                      <option value="Job">Job Referral</option>
                    </select>
                  </div>

                  <div className="ref-form-group">
                    <label className="ref-form-label">Eligible Milestone</label>
                    <input
                      type="text"
                      className="ref-form-input"
                      placeholder="e.g. Policy Issued, Activated, Joined"
                      value={newRuleData.milestone}
                      onChange={(e) => setNewRuleData({ ...newRuleData, milestone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="ref-form-row">
                  <div className="ref-form-group">
                    <label className="ref-form-label">Amount Type</label>
                    <select
                      className="ref-form-select"
                      value={newRuleData.amountType}
                      onChange={(e) => setNewRuleData({ ...newRuleData, amountType: e.target.value })}
                    >
                      <option value="Fixed">Fixed Amount (₹)</option>
                      <option value="Percentage">Percentage (%)</option>
                    </select>
                  </div>

                  <div className="ref-form-group">
                    <label className="ref-form-label">Reward Amount</label>
                    <input
                      type="number"
                      className="ref-form-input"
                      placeholder="e.g. 1000"
                      value={newRuleData.amount}
                      onChange={(e) => setNewRuleData({ ...newRuleData, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Eligibility Conditions</label>
                  <textarea
                    className="ref-form-textarea"
                    rows={2}
                    placeholder="Conditions verified before incentive is granted..."
                    value={newRuleData.eligibilityConditions}
                    onChange={(e) => setNewRuleData({ ...newRuleData, eligibilityConditions: e.target.value })}
                  />
                </div>
              </div>
              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowRuleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ref-btn-primary">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PAYOUT PROCESSING ── */}
      {showPayoutModal && (
        <div className="ref-modal-overlay" onClick={() => setShowPayoutModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">Process Incentive Disbursements</div>
              <button className="ref-modal-close" onClick={() => setShowPayoutModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConfirmPayout}>
              <div className="ref-modal-body">
                <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1rem' }}>
                  You are disbursing <strong>{selectedIncentivesForPayout.length} approved incentives</strong>.
                </p>

                <div className="ref-form-row">
                  <div className="ref-form-group">
                    <label className="ref-form-label">Payment Mode</label>
                    <select
                      className="ref-form-select"
                      value={payoutMode}
                      onChange={(e) => setPayoutMode(e.target.value)}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT / RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="IMPS">IMPS</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>

                  <div className="ref-form-group">
                    <label className="ref-form-label">Transaction UTR / Reference</label>
                    <input
                      type="text"
                      className="ref-form-input"
                      placeholder="e.g. UTR194820194812"
                      value={payoutTxnRef}
                      onChange={(e) => setPayoutTxnRef(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Disbursement Notes</label>
                  <textarea
                    className="ref-form-textarea"
                    rows={2}
                    placeholder="Reference for bank records..."
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowPayoutModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ref-btn-primary">
                  Confirm Payout & Settle Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: REVERSAL CONFIRMATION ── */}
      {showReversalModal && reversingIncentive && (
        <div className="ref-modal-overlay" onClick={() => setShowReversalModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title" style={{ color: '#b91c1c' }}>
                Reverse Paid Incentive: {reversingIncentive.incentiveCode}
              </div>
              <button className="ref-modal-close" onClick={() => setShowReversalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleConfirmReversal}>
              <div className="ref-modal-body">
                <p style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '1rem' }}>
                  Reversing this incentive of <strong>₹{reversingIncentive.amount}</strong> will record an immutable cancellation audit log without deleting historical transaction records.
                </p>
                <div className="ref-form-group">
                  <label className="ref-form-label">Mandatory Reversal Reason</label>
                  <textarea
                    className="ref-form-textarea"
                    rows={3}
                    placeholder="e.g. Policy cancelled during 15-day free-look period; bank reversed commission."
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowReversalModal(false)}>Cancel</button>
                <button type="submit" className="ref-btn-primary" style={{ background: '#b91c1c' }}>
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 6: REGISTER NEW REFERRAL (ADMIN SUBMISSION) ── */}
      {showSubmitModal && (
        <div className="ref-modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">Register New Business Referral</div>
              <button className="ref-modal-close" onClick={() => setShowSubmitModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitNewReferral}>
              <div className="ref-modal-body">
                <div className="ref-form-group">
                  <label className="ref-form-label">Select Referral Category</label>
                  <select
                    className="ref-form-select"
                    value={submitCategory}
                    onChange={(e) => setSubmitCategory(e.target.value)}
                  >
                    <option value="Insurance">🛡️ Insurance Referral</option>
                    <option value="Credit Card">💳 Credit Card Referral</option>
                    <option value="Bank Account">🏦 Bank Account Opening</option>
                    <option value="Job">💼 Job Candidate Referral</option>
                  </select>
                </div>

                {submitCategory === 'Insurance' && (
                  <>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Insurance Provider</label>
                        <select
                          className="ref-form-select"
                          value={submissionForm.insuranceDetails.provider}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            insuranceDetails: { ...submissionForm.insuranceDetails, provider: e.target.value }
                          })}
                        >
                          <option value="Star Health">Star Health</option>
                          <option value="HDFC ERGO">HDFC ERGO</option>
                          <option value="ICICI Lombard">ICICI Lombard</option>
                          <option value="Tata AIG">Tata AIG</option>
                          <option value="LIC">LIC</option>
                          <option value="Care Health">Care Health</option>
                        </select>
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Policy Type</label>
                        <select
                          className="ref-form-select"
                          value={submissionForm.insuranceDetails.productType}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            insuranceDetails: { ...submissionForm.insuranceDetails, productType: e.target.value }
                          })}
                        >
                          <option value="Health">Health Insurance</option>
                          <option value="Term Life">Term Life Insurance</option>
                          <option value="Motor / Vehicle">Motor / Vehicle</option>
                          <option value="Personal Accident">Personal Accident</option>
                          <option value="Travel">Travel</option>
                        </select>
                      </div>
                    </div>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Applicant Name</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          placeholder="Full Name"
                          value={submissionForm.insuranceDetails.applicantName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            insuranceDetails: { ...submissionForm.insuranceDetails, applicantName: e.target.value }
                          })}
                          required
                        />
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Contact Phone</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          placeholder="10-digit mobile"
                          value={submissionForm.insuranceDetails.applicantPhone}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            insuranceDetails: { ...submissionForm.insuranceDetails, applicantPhone: e.target.value }
                          })}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {submitCategory === 'Credit Card' && (
                  <>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Bank</label>
                        <select
                          className="ref-form-select"
                          value={submissionForm.creditCardDetails.bankName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            creditCardDetails: { ...submissionForm.creditCardDetails, bankName: e.target.value }
                          })}
                        >
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="SBI Card">SBI Card</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra">Kotak Mahindra</option>
                          <option value="IDFC First Bank">IDFC First Bank</option>
                        </select>
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Card Product</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          placeholder="e.g. Millennia Cashback"
                          value={submissionForm.creditCardDetails.cardProduct}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            creditCardDetails: { ...submissionForm.creditCardDetails, cardProduct: e.target.value }
                          })}
                          required
                        />
                      </div>
                    </div>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Applicant Name</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.creditCardDetails.applicantName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            creditCardDetails: { ...submissionForm.creditCardDetails, applicantName: e.target.value }
                          })}
                          required
                        />
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Contact Phone</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.creditCardDetails.applicantPhone}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            creditCardDetails: { ...submissionForm.creditCardDetails, applicantPhone: e.target.value }
                          })}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {submitCategory === 'Bank Account' && (
                  <>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Bank</label>
                        <select
                          className="ref-form-select"
                          value={submissionForm.bankAccountDetails.bankName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            bankAccountDetails: { ...submissionForm.bankAccountDetails, bankName: e.target.value }
                          })}
                        >
                          <option value="HDFC Bank">HDFC Bank</option>
                          <option value="ICICI Bank">ICICI Bank</option>
                          <option value="State Bank of India">State Bank of India</option>
                          <option value="Axis Bank">Axis Bank</option>
                          <option value="Kotak Mahindra">Kotak Mahindra</option>
                        </select>
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Account Type</label>
                        <select
                          className="ref-form-select"
                          value={submissionForm.bankAccountDetails.accountType}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            bankAccountDetails: { ...submissionForm.bankAccountDetails, accountType: e.target.value }
                          })}
                        >
                          <option value="Savings Account">Savings Account</option>
                          <option value="Student Zero-Balance">Student Zero-Balance Account</option>
                          <option value="Salary Account">Salary Account</option>
                          <option value="Current Account">Current Account</option>
                        </select>
                      </div>
                    </div>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Customer Name</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.bankAccountDetails.applicantName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            bankAccountDetails: { ...submissionForm.bankAccountDetails, applicantName: e.target.value }
                          })}
                          required
                        />
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Contact Phone</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.bankAccountDetails.applicantPhone}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            bankAccountDetails: { ...submissionForm.bankAccountDetails, applicantPhone: e.target.value }
                          })}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {submitCategory === 'Job' && (
                  <>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Industry Sector</label>
                        <select
                          className="ref-form-select"
                          value={submissionForm.jobDetails.sector}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            jobDetails: { ...submissionForm.jobDetails, sector: e.target.value }
                          })}
                        >
                          <option value="IT / Software">IT / Software</option>
                          <option value="Non-IT / Core Engineering">Non-IT / Core Engineering</option>
                          <option value="Banking / Finance">Banking / Finance</option>
                          <option value="Healthcare / Pharma">Healthcare / Pharma</option>
                          <option value="EdTech / Education">EdTech / Education</option>
                        </select>
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Company Name</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.jobDetails.companyName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            jobDetails: { ...submissionForm.jobDetails, companyName: e.target.value }
                          })}
                          required
                        />
                      </div>
                    </div>
                    <div className="ref-form-row">
                      <div className="ref-form-group">
                        <label className="ref-form-label">Candidate Name</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.jobDetails.candidateName}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            jobDetails: { ...submissionForm.jobDetails, candidateName: e.target.value }
                          })}
                          required
                        />
                      </div>
                      <div className="ref-form-group">
                        <label className="ref-form-label">Candidate Phone</label>
                        <input
                          type="text"
                          className="ref-form-input"
                          value={submissionForm.jobDetails.candidatePhone}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            jobDetails: { ...submissionForm.jobDetails, candidatePhone: e.target.value }
                          })}
                          required
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#1e293b', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={submissionForm.jobDetails.candidateConsentGiven}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            jobDetails: { ...submissionForm.jobDetails, candidateConsentGiven: e.target.checked }
                          })}
                          required
                        />
                        <span>I confirm that the candidate has given explicit consent to be referred.</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowSubmitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ref-btn-primary">
                  Submit Referral
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
