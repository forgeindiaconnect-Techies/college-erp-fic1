import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, CreditCard, Landmark, Briefcase, Plus, Search, Filter,
  TrendingUp, CheckCircle2, Clock, XCircle, ArrowUpRight, Award,
  Users, DollarSign, Download, RefreshCw, Eye, Edit3, AlertCircle,
  FileText, Check, X, RotateCcw, Building2, Copy, Sparkles, CheckCheck,
  ArrowLeft, LayoutDashboard, Layers, Calendar, ChevronLeft, ChevronRight, User
} from 'lucide-react';
import {
  getAdminReferrals, getAdminReferralOverview, updateReferralStatus,
  getIncentiveRules, createIncentiveRule, updateIncentiveRule,
  getIncentives, approveIncentive, processIncentivePayout, reverseIncentive,
  getReferralDetails, submitReferral, getReferralExportCsvUrl
} from '../../api/index';
import ReferrerReportModal from '../../components/referrals/ReferrerReportModal';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import './AdminReferralManagement.css';
import '../admin/UserManagementCommon.css';

// ── CATEGORY-SPECIFIC WORKFLOW & STATUS CONFIGURATIONS ───────────────────────
export const CATEGORY_FLOW_CONFIG = {
  'Insurance': {
    name: 'Insurance Referral',
    color: '#2563eb',
    icon: Shield,
    stepper: [
      { label: 'Submitted', desc: 'Lead Registered' },
      { label: 'Under Review', desc: 'Underwriting / KYC' },
      { label: 'Policy Issued', desc: 'Policy Active' },
      { label: 'Incentive Settled', desc: 'Payout Completed' },
    ],
    statuses: [
      { value: 'Submitted', label: 'Submitted' },
      { value: 'Under Review', label: 'Under Review (Underwriting)' },
      { value: 'Verification', label: 'Verification / Document KYC' },
      { value: 'Policy Issued', label: 'Policy Issued (Policy Active)', isMilestone: true },
      { value: 'Rejected', label: 'Rejected' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
    milestoneStatus: 'Policy Issued',
    milestoneName: 'Policy Issued',
    refFieldLabel: 'Policy Number',
    refFieldPlaceholder: 'e.g. POL-9843212',
    applicantNameLabel: 'Insured Person',
  },
  'Credit Card': {
    name: 'Credit Card Referral',
    color: '#7c3aed',
    icon: CreditCard,
    stepper: [
      { label: 'Submitted', desc: 'Application Received' },
      { label: 'Bank Review', desc: 'Credit Bureau & KYC' },
      { label: 'Card Activated', desc: 'Card Active' },
      { label: 'Incentive Settled', desc: 'Payout Completed' },
    ],
    statuses: [
      { value: 'Submitted', label: 'Submitted' },
      { value: 'Under Review', label: 'Under Review (Bank Evaluation)' },
      { value: 'Approved', label: 'Approved (Card Sanctioned)' },
      { value: 'Activated', label: 'Activated (Card Active)', isMilestone: true },
      { value: 'Rejected', label: 'Rejected' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
    milestoneStatus: 'Activated',
    milestoneName: 'Activated',
    refFieldLabel: 'Card Application / Reference Number',
    refFieldPlaceholder: 'e.g. CC-APP-78214',
    applicantNameLabel: 'Card Applicant',
  },
  'Bank Account': {
    name: 'Bank Account Referral',
    color: '#059669',
    icon: Landmark,
    stepper: [
      { label: 'Submitted', desc: 'Lead Received' },
      { label: 'KYC Review', desc: 'Biometric / Video KYC' },
      { label: 'Account Opened', desc: 'Account Active' },
      { label: 'Incentive Settled', desc: 'Payout Completed' },
    ],
    statuses: [
      { value: 'Submitted', label: 'Submitted' },
      { value: 'Under Review', label: 'Under Review (Bank Processing)' },
      { value: 'Verification', label: 'Verification / Biometric KYC' },
      { value: 'Account Opened', label: 'Account Opened (Account Active)', isMilestone: true },
      { value: 'Activated', label: 'Activated (Account In-Use)' },
      { value: 'Rejected', label: 'Rejected' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
    milestoneStatus: 'Account Opened',
    milestoneName: 'Account Opened',
    refFieldLabel: 'Masked Account Number',
    refFieldPlaceholder: 'e.g. XXXXXX4589 (Protect customer privacy)',
    applicantNameLabel: 'Account Holder',
  },
  'Job': {
    name: 'Job Referral',
    color: '#d97706',
    icon: Briefcase,
    stepper: [
      { label: 'Submitted', desc: 'Profile Submitted' },
      { label: 'Interview / Screening', desc: 'Rounds in Progress' },
      { label: 'Candidate Joined', desc: 'Joined Company' },
      { label: 'Incentive Settled', desc: 'Payout Completed' },
    ],
    statuses: [
      { value: 'Submitted', label: 'Submitted' },
      { value: 'Under Review', label: 'Under Review (Screening)' },
      { value: 'Interview Round 1', label: 'Interview Round 1 Scheduled' },
      { value: 'Selected', label: 'Selected / Offer Released' },
      { value: 'Joined', label: 'Joined (Joined Company)', isMilestone: true },
      { value: 'Rejected', label: 'Rejected' },
      { value: 'Cancelled', label: 'Cancelled' },
    ],
    milestoneStatus: 'Joined',
    milestoneName: 'Joined',
    refFieldLabel: 'Candidate Employee ID / Offer Ref',
    refFieldPlaceholder: 'e.g. EMP-9821 or OFF-2026-01',
    applicantNameLabel: 'Candidate Name',
  },
};

export default function AdminReferralManagement({ initialCollegeId = null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const rootRole = ['admin', 'accounts', 'staff', 'student', 'principal', 'superadmin', 'hod', 'librarian'].includes(pathParts[0]?.toLowerCase())
    ? pathParts[0].toLowerCase()
    : 'admin';
  const dashboardPath = `/${rootRole}/dashboard`;
  const businessCatalogPath = `/${rootRole}/business-referral`;

  const [activeTab, setActiveTab] = useState('overview'); // overview | all | insurance | creditcard | bank | job | rules | approvals | audit
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overview, setOverview] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [rules, setRules] = useState([]);
  const [incentives, setIncentives] = useState([]);

  // Comprehensive filter states
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [incentiveStatusFilter, setIncentiveStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [referrerFilter, setReferrerFilter] = useState('All');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Referrer Detailed Individual Report Modal
  const [showReferrerModal, setShowReferrerModal] = useState(false);
  const [selectedReferrerId, setSelectedReferrerId] = useState(null);

  const handleOpenReferrer = (userId) => {
    if (!userId) return;
    setSelectedReferrerId(userId);
    setShowReferrerModal(true);
  };

  const handleResetFilters = () => {
    setStatusFilter('All');
    setIncentiveStatusFilter('All');
    setDepartmentFilter('All');
    setReferrerFilter('All');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

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
    insuranceDetails: { provider: 'Star Health', productType: 'Health', applicantName: '', applicantPhone: '', applicantEmail: '', applicantCity: '', estimatedSumInsured: 500000, notes: '', applicantConsentGiven: true },
    creditCardDetails: { bankName: 'HDFC Bank', cardProduct: 'Millennia Cashback', applicantName: '', applicantPhone: '', applicantEmail: '', monthlyIncome: '₹45,000', employmentType: 'Salaried', city: '', notes: '', applicantConsentGiven: true },
    bankAccountDetails: { bankName: 'HDFC Bank', accountType: 'Savings Account', applicantName: '', applicantPhone: '', applicantEmail: '', branchCity: '', initialDeposit: 5000, notes: '', applicantConsentGiven: true },
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

  // Visual Pipeline Stepper (Category Tailored & Interactive)
  const renderPipelineStepper = (refItem, previewStatus = null) => {
    if (!refItem) return null;
    const cat = refItem.category || 'Insurance';
    const flowConfig = CATEGORY_FLOW_CONFIG[cat] || CATEGORY_FLOW_CONFIG['Insurance'];
    const stages = flowConfig.stepper;

    let currentStep = 1;
    const status = previewStatus || refItem.status || 'Submitted';
    const isPaid = refItem.incentiveStatus === 'Paid';
    const isMilestone =
      refItem.milestoneVerified ||
      status === flowConfig.milestoneStatus ||
      ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(status);

    if (isPaid) {
      currentStep = 4;
    } else if (isMilestone) {
      currentStep = 3;
    } else if ([
      'Under Review', 'Contacted', 'Application in Progress', 'Verification',
      'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2',
      'Technical Assessment', 'Selected'
    ].includes(status)) {
      currentStep = 2;
    } else {
      currentStep = 1;
    }

    const fillPercent = ((currentStep - 1) / (stages.length - 1)) * 100;

    return (
      <div className="ref-stepper-wrap">
        <div className="ref-step-connector">
          <div className="ref-step-connector-fill" style={{ width: `${fillPercent}%` }} />
        </div>
        {stages.map((st, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep || (stepNum === 4 && isPaid);
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

  // Open Review Status Modal with Category Auto-Detection & Field Prefill
  const handleOpenReview = (refItem) => {
    setReviewingReferral(refItem);
    const initialStatus = refItem.status || 'Submitted';
    setNewStatus(initialStatus);
    setReviewRemarks(refItem.remarks || '');
    setReviewReason(refItem.rejectionReason || '');
    setReturnForCorrection(refItem.isReturnedForCorrection || false);

    const flow = CATEGORY_FLOW_CONFIG[refItem.category];
    if (flow && initialStatus === flow.milestoneStatus) {
      setVerifiedMilestone(flow.milestoneName);
    } else {
      setVerifiedMilestone(refItem.verifiedMilestoneName || '');
    }

    // Prefill category reference numbers
    if (refItem.category === 'Insurance') {
      setPolicyOrAppNumber(refItem.insuranceDetails?.policyNumber || '');
    } else if (refItem.category === 'Credit Card') {
      setPolicyOrAppNumber(refItem.creditCardDetails?.applicationNumber || '');
    } else if (refItem.category === 'Bank Account') {
      setPolicyOrAppNumber(refItem.bankAccountDetails?.accountNumberMasked || '');
    } else if (refItem.category === 'Job') {
      setPolicyOrAppNumber(refItem.jobDetails?.jobReferenceId || '');
    } else {
      setPolicyOrAppNumber('');
    }
    setShowReviewModal(true);
  };

  // Submit Status Update with Category Reference ID Mapping
  const handleSaveStatus = async (e) => {
    e.preventDefault();
    if (!reviewingReferral) return;

    try {
      const flow = CATEGORY_FLOW_CONFIG[reviewingReferral.category];
      const isMilestoneStatus = flow && newStatus === flow.milestoneStatus;

      const payload = {
        status: newStatus,
        remarks: reviewRemarks,
        reason: reviewReason,
        verifiedMilestoneName: isMilestoneStatus ? flow.milestoneName : (verifiedMilestone || undefined),
        isReturnedForCorrection: returnForCorrection,
      };

      if (reviewingReferral.category === 'Insurance') payload.policyNumber = policyOrAppNumber;
      if (reviewingReferral.category === 'Credit Card') payload.applicationNumber = policyOrAppNumber;
      if (reviewingReferral.category === 'Bank Account') payload.accountNumberMasked = policyOrAppNumber;
      if (reviewingReferral.category === 'Job') payload.jobReferenceId = policyOrAppNumber;

      const res = await updateReferralStatus(reviewingReferral._id, payload);
      if (res?.data?.success) {
        alert(res.data.message || 'Referral status updated successfully!');
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

  // Filtered referrals list across all search & filter criteria
  const filteredReferrals = referrals.filter(r => {
    if (activeTab === 'insurance' && r.category !== 'Insurance') return false;
    if (activeTab === 'creditcard' && r.category !== 'Credit Card') return false;
    if (activeTab === 'bank' && r.category !== 'Bank Account') return false;
    if (activeTab === 'job' && r.category !== 'Job') return false;

    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (incentiveStatusFilter !== 'All' && (r.incentiveStatus || 'None') !== incentiveStatusFilter) return false;
    if (departmentFilter !== 'All' && (r.submitterDepartment || 'General') !== departmentFilter) return false;
    if (referrerFilter !== 'All' && r.submittedBy !== referrerFilter && r.submitterName !== referrerFilter) return false;

    if (startDateFilter) {
      const start = new Date(startDateFilter);
      if (new Date(r.createdAt) < start) return false;
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      end.setHours(23, 59, 59, 999);
      if (new Date(r.createdAt) > end) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (r.referralCode || '').toLowerCase();
      const submitter = (r.submitterName || '').toLowerCase();
      const empId = (r.submitterEmployeeId || '').toLowerCase();
      const applicant = (
        r.insuranceDetails?.applicantName ||
        r.creditCardDetails?.applicantName ||
        r.bankAccountDetails?.applicantName ||
        r.jobDetails?.candidateName ||
        ''
      ).toLowerCase();
      const phone = (
        r.insuranceDetails?.applicantPhone ||
        r.creditCardDetails?.applicantPhone ||
        r.bankAccountDetails?.applicantPhone ||
        r.jobDetails?.candidatePhone ||
        ''
      ).toLowerCase();
      const appId = (
        r.insuranceDetails?.policyNumber ||
        r.creditCardDetails?.applicationNumber ||
        r.bankAccountDetails?.accountNumberMasked ||
        r.jobDetails?.jobReferenceId ||
        r.insuranceDetails?.partnerReferenceNumber ||
        r.creditCardDetails?.partnerReferenceNumber ||
        r.bankAccountDetails?.partnerReferenceNumber ||
        ''
      ).toLowerCase();

      return (
        code.includes(q) ||
        submitter.includes(q) ||
        empId.includes(q) ||
        applicant.includes(q) ||
        phone.includes(q) ||
        appId.includes(q)
      );
    }
    return true;
  });

  // Filtered incentives list for consolidated incentive reports
  const filteredIncentives = incentives.filter(inc => {
    if (categoryFilter !== 'All' && inc.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && inc.status !== statusFilter) return false;
    if (departmentFilter !== 'All' && (inc.earnedByDepartment || 'General') !== departmentFilter) return false;
    if (referrerFilter !== 'All' && inc.earnedBy !== referrerFilter && inc.earnedByName !== referrerFilter) return false;

    if (startDateFilter) {
      const start = new Date(startDateFilter);
      if (new Date(inc.createdAt) < start) return false;
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      end.setHours(23, 59, 59, 999);
      if (new Date(inc.createdAt) > end) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const incCode = (inc.incentiveCode || '').toLowerCase();
      const refCode = (inc.referralCode || '').toLowerCase();
      const earner = (inc.earnedByName || '').toLowerCase();
      const empId = (inc.earnedByEmployeeId || '').toLowerCase();
      const cand = (inc.candidateName || '').toLowerCase();
      const candApp = (inc.candidateApplicationId || '').toLowerCase();
      const pRef = (inc.payoutRef || '').toLowerCase();
      return (
        incCode.includes(q) ||
        refCode.includes(q) ||
        earner.includes(q) ||
        empId.includes(q) ||
        cand.includes(q) ||
        candApp.includes(q) ||
        pRef.includes(q)
      );
    }
    return true;
  });

  // Unique departments and submitters for filters
  const uniqueDepartments = Array.from(new Set(referrals.map(r => r.submitterDepartment || 'General').filter(Boolean)));
  const uniqueReferrers = Array.from(
    new Map(
      referrals.map(r => [r.submittedBy?.toString() || r.submitterName, { id: r.submittedBy, name: r.submitterName, empId: r.submitterEmployeeId }])
    ).values()
  );

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
    <div className="management-page animate-fade-in">
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

      {/* ── Standard ERP Header Card ── */}
      <div className="mgmt-header-card" style={{ marginBottom: '1.25rem' }}>
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #2563eb, #4f46e5)' }}></div>
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Network Active</span>
            </div>
            <h1>Candidate Referral & Incentive Management</h1>
            <p>
              Monitor multi-category candidate pipelines, applicant milestone verification, and authorized incentive disbursements.
            </p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={fetchData}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <a
              href={`/api/referrals/export/csv${initialCollegeId ? `?collegeId=${initialCollegeId}` : ''}`}
              download
              className="mgmt-btn-secondary"
            >
              <Download size={14} /> <span>Export CSV</span>
            </a>
            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => setShowSubmitModal(true)}
            >
              <Plus size={15} /> <span>+ Register Referral</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Enterprise Navigation Tabs (Clean Wrapping, NO Horizontal Scrollbar) ── */}
      <div className="ref-nav-tabs-bar">
        {[
          { key: 'overview', label: 'Overview Analytics', count: null, icon: TrendingUp },
          { key: 'creditcard', label: 'Credit Cards', count: referrals.filter(r => r.category === 'Credit Card').length, icon: CreditCard },
          { key: 'insurance', label: 'Insurance', count: referrals.filter(r => r.category === 'Insurance').length, icon: Shield },
          { key: 'job', label: 'Job Referrals', count: referrals.filter(r => r.category === 'Job').length, icon: Briefcase },
          { key: 'bank', label: 'Account Opening', count: referrals.filter(r => r.category === 'Bank Account').length, icon: Landmark },
          { key: 'incentives', label: 'Incentive Reports', count: incentives.length, icon: DollarSign },
          { key: 'rules', label: 'Incentive Settings', count: rules.length, icon: Award },
        ].map(tab => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setCurrentPage(1);
                if (tab.key === 'creditcard') setCategoryFilter('Credit Card');
                else if (tab.key === 'insurance') setCategoryFilter('Insurance');
                else if (tab.key === 'job') setCategoryFilter('Job');
                else if (tab.key === 'bank') setCategoryFilter('Bank Account');
                else setCategoryFilter('All');
              }}
              className={`ref-nav-tab-btn ${isActive ? 'active' : ''}`}
            >
              <IconComp size={15} style={{ color: isActive ? '#2563eb' : '#64748b', flexShrink: 0 }} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`ref-nav-tab-badge ${isActive ? 'active' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main ERP Management Card ── */}
      <div className="mgmt-table-card">
        <div style={{ padding: '20px' }}>
          {/* ── TAB 1: OVERVIEW DASHBOARD ── */}
          {activeTab === 'overview' && (
            <div>
              {/* 8 Real-Time KPI Summary Cards: Balanced Responsive Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '1.5rem' }}>
                {/* 1. Total Referrals */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                    <FileText size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">
                      Total Referrals
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#0f172a', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {overview?.totalReferrals || referrals.length}
                    </h3>
                  </div>
                </div>

                {/* 2. Submitted Applications */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <Clock size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">
                      Submitted Leads
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#0f172a', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {overview?.totalSubmitted || referrals.filter(r => r.status === 'Submitted').length}
                    </h3>
                  </div>
                </div>

                {/* 3. Under Review */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                    <AlertCircle size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">
                      Under Review
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#0f172a', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {overview?.underReview || referrals.filter(r => ['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(r.status)).length}
                    </h3>
                  </div>
                </div>

                {/* 4. Approved Applications */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">
                      Approved Leads
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#059669', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {overview?.approved || referrals.filter(r => ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status)).length}
                    </h3>
                  </div>
                </div>

                {/* 5. Rejected Applications */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                    <XCircle size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">
                      Rejected Leads
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#dc2626', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {overview?.rejected || referrals.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length}
                    </h3>
                  </div>
                </div>

                {/* 6. Total Eligible Incentives */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #6366f1', background: '#faf5ff' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}>
                    <DollarSign size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text" style={{ color: '#4f46e5' }}>
                      Eligible Rewards
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#4f46e5', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      ₹{(overview?.totalEligibleIncentives || ((overview?.financials?.totalPaid || 0) + (overview?.financials?.totalPendingApproval || 0) + (overview?.financials?.totalApprovedUnpaid || 0))).toLocaleString()}
                    </h3>
                  </div>
                </div>

                {/* 7. Total Incentives Paid */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
                    <CheckCheck size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text" style={{ color: '#047857' }}>
                      Incentives Paid
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#059669', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      ₹{(overview?.totalPaidIncentives || overview?.financials?.totalPaid || 0).toLocaleString()}
                    </h3>
                  </div>
                </div>

                {/* 8. Total Pending Incentives */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #ea580c', background: '#fff7ed' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c' }}>
                    <Clock size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text" style={{ color: '#c2410c' }}>
                      Pending Incentives
                    </span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#ea580c', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      ₹{(overview?.totalPendingIncentives || ((overview?.financials?.totalPendingApproval || 0) + (overview?.financials?.totalApprovedUnpaid || 0))).toLocaleString()}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Category-Wise Summaries Grid */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
                  Category-Wise Referral Performance & Pipeline
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {[
                    { key: 'Credit Card', tab: 'creditcard', label: 'Credit Card Referrals', icon: CreditCard, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                    { key: 'Insurance', tab: 'insurance', label: 'Insurance Referrals', icon: Shield, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    { key: 'Job', tab: 'job', label: 'Job Referrals', icon: Briefcase, color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
                    { key: 'Bank Account', tab: 'bank', label: 'Account Opening Referrals', icon: Landmark, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                  ].map(cat => {
                    const IconComp = cat.icon;
                    const catRefs = referrals.filter(r => r.category === cat.key);
                    const catIncs = incentives.filter(i => i.category === cat.key);
                    const total = catRefs.length;
                    const submitted = catRefs.filter(r => r.status === 'Submitted').length;
                    const underReview = catRefs.filter(r => ['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(r.status)).length;
                    const approved = catRefs.filter(r => ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status)).length;
                    const rejected = catRefs.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length;
                    let paid = 0;
                    let pending = 0;
                    catIncs.forEach(i => {
                      if (i.status === 'Paid') paid += i.amount;
                      else if (['Pending Approval', 'Approved', 'Processing', 'Calculated'].includes(i.status)) pending += i.amount;
                    });
                    const eligible = paid + pending;

                    return (
                      <div
                        key={cat.key}
                        style={{
                          background: '#ffffff',
                          border: `1px solid ${cat.border}`,
                          borderRadius: '12px',
                          padding: '16px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: cat.bg, color: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <IconComp size={16} />
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab(cat.tab);
                              setCategoryFilter(cat.key);
                            }}
                            style={{
                              background: cat.bg,
                              border: `1px solid ${cat.border}`,
                              color: cat.color,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            <span>View Report</span> <span>→</span>
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', textAlign: 'center' }}>
                          <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Total</div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{total}</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 600 }}>Submitted</div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#3b82f6' }}>{submitted}</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>Approved</div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#059669' }}>{approved}</div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>Rejected</div>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#dc2626' }}>{rejected}</div>
                          </div>
                        </div>

                        {/* Dedicated 3-box mini status bar: Zero collision, crystal clear */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                          <div style={{ background: '#f8fafc', padding: '6px 2px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Eligible</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: cat.color, marginTop: '2px' }}>₹{eligible.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#f0fdf4', padding: '6px 2px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <div style={{ fontSize: '0.64rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Paid</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>₹{paid.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#fff7ed', padding: '6px 2px', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                            <div style={{ fontSize: '0.64rem', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Pending</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>₹{pending.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conversion Funnel & Top Referrers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {/* Financial Pipeline Progress */}
                <div className="ref-table-card" style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                      Incentive Pipeline Summary
                    </h3>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                      Audit Cleared
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: 700, fontSize: '0.85rem' }}>
                        <CheckCircle2 size={16} /> <span>Total Paid & Settled</span>
                      </div>
                      <span style={{ fontWeight: 800, color: '#047857', fontSize: '1.15rem' }}>₹{(overview?.financials?.totalPaid || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Clock size={16} /> <span>Approved (Awaiting Payout)</span>
                      </div>
                      <span style={{ fontWeight: 800, color: '#1d4ed8', fontSize: '1.15rem' }}>₹{(overview?.financials?.totalApprovedUnpaid || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontWeight: 700, fontSize: '0.85rem' }}>
                        <AlertCircle size={16} /> <span>Pending Verification & Approval</span>
                      </div>
                      <span style={{ fontWeight: 800, color: '#c2410c', fontSize: '1.15rem' }}>₹{(overview?.financials?.totalPendingApproval || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem' }}>
                        <RotateCcw size={16} /> <span>Reversed / Cancelled</span>
                      </div>
                      <span style={{ fontWeight: 800, color: '#b91c1c', fontSize: '1.15rem' }}>₹{(overview?.financials?.totalReversed || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Top Referrers Leaderboard with Clickable Profiles */}
                <div className="ref-table-card" style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                      Top Referrer Performers
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Click name for detailed report
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(overview?.topOwners && overview.topOwners.length > 0) ? (
                      overview.topOwners.slice(0, 5).map((owner, idx) => (
                        <div
                          key={owner.userId || idx}
                          onClick={() => handleOpenReferrer(owner.userId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                          title="Click to view detailed individual referrer audit report"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#1d4ed8', fontSize: '0.85rem' }}>
                                {owner.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {owner.role} • {owner.department}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                              {owner.totalReferrals} Leads ({owner.converted} Approved)
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#059669', fontWeight: 700 }}>
                              ₹{owner.earnedAmount.toLocaleString()} Paid
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                        No referrer submissions recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── ALL REFERRAL SUBMISSIONS DIRECTORY & VERIFICATION PIPELINE ── */}
              <div style={{ marginTop: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      📋 All Referral Submissions & Pipeline Tracking
                    </h3>
                    <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                      Unified institutional ledger across Credit Cards, Insurance, Jobs, and Bank Accounts with live verification status.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '260px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Search candidate, code, referrer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: '6px 10px 6px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '100%', outline: 'none', background: '#ffffff' }}
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                    >
                      <option value="All">All Categories</option>
                      <option value="Credit Card">Credit Cards</option>
                      <option value="Insurance">Insurance</option>
                      <option value="Job">Jobs</option>
                      <option value="Bank Account">Bank Accounts</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Policy Issued">Policy Issued</option>
                      <option value="Account Opened">Account Opened</option>
                      <option value="Joined">Joined</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div className="mgmt-table-wrapper" style={{ overflowX: 'auto' }}>
                    <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>Referral Code</th>
                          <th>Category</th>
                          <th>Referrer & Emp ID</th>
                          <th>Candidate / Applicant</th>
                          <th>Application ID</th>
                          <th>Submission Date</th>
                          <th>Pipeline Status</th>
                          <th>Eligible Incentive</th>
                          <th>Payout Status</th>
                          <th style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReferrals.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                              No referral records found matching your filter criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredReferrals.slice(0, 15).map((r) => {
                            const candName =
                              r.insuranceDetails?.applicantName ||
                              r.creditCardDetails?.applicantName ||
                              r.bankAccountDetails?.applicantName ||
                              r.jobDetails?.candidateName ||
                              'N/A';
                            const candPhone =
                              r.insuranceDetails?.applicantPhone ||
                              r.creditCardDetails?.applicantPhone ||
                              r.bankAccountDetails?.applicantPhone ||
                              r.jobDetails?.candidatePhone ||
                              '';
                            const appId =
                              r.insuranceDetails?.policyNumber ||
                              r.creditCardDetails?.applicationNumber ||
                              r.bankAccountDetails?.accountNumberMasked ||
                              r.jobDetails?.jobReferenceId ||
                              r.insuranceDetails?.partnerReferenceNumber ||
                              r.creditCardDetails?.partnerReferenceNumber ||
                              r.bankAccountDetails?.partnerReferenceNumber ||
                              r.referralCode;

                            return (
                              <tr key={r._id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{r.referralCode}</span>
                                    <button
                                      type="button"
                                      className={`ref-copy-btn ${copiedId === r._id ? 'copied' : ''}`}
                                      onClick={() => handleCopy(r.referralCode, r._id)}
                                      title="Copy Code"
                                    >
                                      {copiedId === r._id ? <Check size={11} /> : <Copy size={11} />}
                                    </button>
                                  </div>
                                </td>

                                <td>
                                  <span className={`ref-cat-tag ref-cat-${r.category?.toLowerCase().replace(/\s+/g, '')}`}>
                                    {r.category}
                                  </span>
                                </td>

                                <td>
                                  <span
                                    onClick={() => handleOpenReferrer(r.submittedBy)}
                                    style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                    title="Click to view detailed individual referrer audit report"
                                  >
                                    {r.submitterName}
                                  </span>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                                    {r.submitterEmployeeId || 'N/A'}
                                  </div>
                                </td>

                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                  {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                                </td>

                                <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#1e40af' }}>
                                  {appId}
                                </td>

                                <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>

                                <td>
                                  <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                                    {r.status}
                                  </span>
                                </td>

                                <td>
                                  {r.incentiveEligible ? (
                                    <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem' }}>
                                      ₹{r.incentiveAmount}
                                    </span>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>₹0 (Pending Verification)</span>
                                  )}
                                </td>

                                <td>
                                  <span className={`ref-badge ${
                                    r.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                                    r.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                                    r.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                                    'ref-badge-submitted'
                                  }`}>
                                    {r.incentiveStatus || 'None'}
                                  </span>
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                  <div className="ref-action-cell" style={{ justifyContent: 'center' }}>
                                    <button className="ref-btn-sm ref-btn-view" onClick={() => handleViewDetails(r)}>
                                      <Eye size={13} /> View
                                    </button>
                                    <button className="ref-btn-sm ref-btn-review" onClick={() => handleOpenReview(r)}>
                                      <Edit3 size={13} /> Review
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
              </div>
            </div>
          )}

          {/* ── TABS 2-5: DEDICATED CATEGORY REPORTS ── */}
          {['creditcard', 'insurance', 'job', 'bank'].includes(activeTab) && (
            <div>
              {/* Category Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                    {activeTab === 'creditcard' && '💳 Credit Card Referral Report'}
                    {activeTab === 'insurance' && '🛡️ Insurance Referral Report'}
                    {activeTab === 'job' && '💼 Job Referral Report'}
                    {activeTab === 'bank' && '🏦 Account Opening Referral Report'}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                    {activeTab === 'creditcard' && 'Real-time tracking of credit card applications, dispatch status, activations, and eligible rewards.'}
                    {activeTab === 'insurance' && 'Underwriting tracking, policy document issuance verification, and institutional broker commissions.'}
                    {activeTab === 'job' && 'Candidate referral tracking through interview rounds, offer confirmations, and verified joining incentives.'}
                    {activeTab === 'bank' && 'Account opening journey tracking through Video-KYC completion, account allocation, and initial deposit.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={() => {
                    const catMap = { creditcard: 'Credit Card', insurance: 'Insurance', job: 'Job', bank: 'Bank Account' };
                    setSubmitCategory(catMap[activeTab] || 'Insurance');
                    setShowSubmitModal(true);
                  }}
                >
                  <Plus size={16} /> <span>+ Register New Referral</span>
                </button>
              </div>

              {/* Comprehensive Search & Filter Toolbar */}
              <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search referrer, employee ID, candidate, application ID, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: '6px 12px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '100%', outline: 'none', background: '#ffffff' }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        style={{ position: 'absolute', right: '8px', top: '7px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff', color: '#1e293b' }}
                      >
                        <option value="All">All Statuses</option>
                        {(() => {
                          const catMap = { creditcard: 'Credit Card', insurance: 'Insurance', job: 'Job', bank: 'Bank Account' };
                          const effCat = catMap[activeTab];
                          if (effCat && CATEGORY_FLOW_CONFIG[effCat]) {
                            return CATEGORY_FLOW_CONFIG[effCat].statuses.map(st => (
                              <option key={st.value} value={st.value}>{st.label}</option>
                            ));
                          }
                          return (
                            <>
                              <option value="Submitted">Submitted</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </>
                          );
                        })()}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Incentive:</span>
                      <select
                        value={incentiveStatusFilter}
                        onChange={(e) => setIncentiveStatusFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff', color: '#1e293b' }}
                      >
                        <option value="All">All Incentives</option>
                        <option value="Eligible">Eligible</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                        <option value="Reversed">Reversed</option>
                        <option value="Rejected">Rejected</option>
                        <option value="None">None</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Dept:</span>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff', color: '#1e293b' }}
                      >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                      <Calendar size={14} />
                      <span>From:</span>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
                      />
                      <span>To:</span>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Referrer:</span>
                      <select
                        value={referrerFilter}
                        onChange={(e) => setReferrerFilter(e.target.value)}
                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff', color: '#1e293b', maxWidth: '160px' }}
                      >
                        <option value="All">All Referrers</option>
                        {uniqueReferrers.map(u => (
                          <option key={u.id || u.name} value={u.id || u.name}>{u.name} ({u.empId || 'Emp'})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mgmt-btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                    >
                      Reset Filters
                    </button>
                    <a
                      href={getReferralExportCsvUrl({
                        category: activeTab === 'creditcard' ? 'Credit Card' : activeTab === 'insurance' ? 'Insurance' : activeTab === 'job' ? 'Job' : 'Bank Account',
                        status: statusFilter !== 'All' ? statusFilter : undefined,
                        startDate: startDateFilter || undefined,
                        endDate: endDateFilter || undefined,
                        collegeId: initialCollegeId || undefined
                      })}
                      download
                      className="mgmt-btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Download size={13} /> Export Report
                    </a>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {/* ── Table Headers Specific to Category ── */}
                        {activeTab === 'creditcard' && (
                          <>
                            <th>Referral ID</th>
                            <th>Referrer Name</th>
                            <th>Employee ID</th>
                            <th>Candidate Name</th>
                            <th>Application ID</th>
                            <th>Referral Date</th>
                            <th>Submission Date</th>
                            <th>Application Status</th>
                            <th>Incentive Rate</th>
                            <th>Eligible Incentive</th>
                            <th>Payment Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </>
                        )}

                        {activeTab === 'insurance' && (
                          <>
                            <th>Referral ID</th>
                            <th>Referrer Name</th>
                            <th>Employee ID</th>
                            <th>Candidate Name</th>
                            <th>Policy / App ID</th>
                            <th>Sum Insured / Product</th>
                            <th>Referral Date</th>
                            <th>Submission Date</th>
                            <th>Application Status</th>
                            <th>Incentive Rate</th>
                            <th>Eligible Incentive</th>
                            <th>Payment Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </>
                        )}

                        {activeTab === 'job' && (
                          <>
                            <th>Referrer Name & Emp ID</th>
                            <th>Candidate Name</th>
                            <th>Job Role & Company</th>
                            <th>Job App ID</th>
                            <th>Referral Date</th>
                            <th>Application Date</th>
                            <th>Recruitment Status</th>
                            <th>Hiring / Joining Date</th>
                            <th>Applicable Incentive</th>
                            <th>Payment Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </>
                        )}

                        {activeTab === 'bank' && (
                          <>
                            <th>Referrer Name & Emp ID</th>
                            <th>Candidate Name</th>
                            <th>Account Type & Bank</th>
                            <th>Referral Date</th>
                            <th>Application Date</th>
                            <th>Account Opening Status</th>
                            <th>Account Activation / Masked No</th>
                            <th>Applicable Incentive</th>
                            <th>Payment Status</th>
                            <th style={{ textAlign: 'center' }}>Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.length === 0 ? (
                        <tr>
                          <td colSpan={12}>
                            <div className="ref-empty-state">
                              <div className="ref-empty-icon">📂</div>
                              <div className="ref-empty-title">No referrals found</div>
                              <div className="ref-empty-sub">Try adjusting your search criteria or register a new referral.</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredReferrals
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((r) => {
                            const candName =
                              r.insuranceDetails?.applicantName ||
                              r.creditCardDetails?.applicantName ||
                              r.bankAccountDetails?.applicantName ||
                              r.jobDetails?.candidateName ||
                              'N/A';
                            const candPhone =
                              r.insuranceDetails?.applicantPhone ||
                              r.creditCardDetails?.applicantPhone ||
                              r.bankAccountDetails?.applicantPhone ||
                              r.jobDetails?.candidatePhone ||
                              '';
                            const appId =
                              r.insuranceDetails?.policyNumber ||
                              r.creditCardDetails?.applicationNumber ||
                              r.bankAccountDetails?.accountNumberMasked ||
                              r.jobDetails?.jobReferenceId ||
                              r.insuranceDetails?.partnerReferenceNumber ||
                              r.creditCardDetails?.partnerReferenceNumber ||
                              r.bankAccountDetails?.partnerReferenceNumber ||
                              r.referralCode;

                            const standardRate =
                              rules.find(ru => ru.category === r.category)?.amount ||
                              (r.category === 'Credit Card' ? 1000 : r.category === 'Insurance' ? 750 : r.category === 'Job' ? 2500 : 500);

                            return (
                              <tr key={r._id}>
                                {/* Credit Card Row */}
                                {activeTab === 'creditcard' && (
                                  <>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{r.referralCode}</span>
                                        <button
                                          type="button"
                                          className={`ref-copy-btn ${copiedId === r._id ? 'copied' : ''}`}
                                          onClick={() => handleCopy(r.referralCode, r._id)}
                                          title="Copy Code"
                                        >
                                          {copiedId === r._id ? <Check size={11} /> : <Copy size={11} />}
                                        </button>
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        onClick={() => handleOpenReferrer(r.submittedBy)}
                                        style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                        title="Click to view detailed individual referrer audit report"
                                      >
                                        {r.submitterName}
                                      </span>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.submitterRole}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                                      {r.submitterEmployeeId || 'N/A'}
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                      {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e40af' }}>
                                      {appId}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {r.applicationSubmissionDate ? new Date(r.applicationSubmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                                      ₹{standardRate}
                                    </td>
                                    <td>
                                      {r.incentiveEligible ? (
                                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                          ₹{r.incentiveAmount}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>₹0 (Pending Verification)</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${
                                        r.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                                        r.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                                        r.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                                        'ref-badge-submitted'
                                      }`}>
                                        {r.incentiveStatus || 'None'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div className="ref-action-cell" style={{ justifyContent: 'center' }}>
                                        <button className="ref-btn-sm ref-btn-view" onClick={() => handleViewDetails(r)}>
                                          <Eye size={13} /> View
                                        </button>
                                        <button className="ref-btn-sm ref-btn-review" onClick={() => handleOpenReview(r)}>
                                          <Edit3 size={13} /> Review
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}

                                {/* Insurance Row */}
                                {activeTab === 'insurance' && (
                                  <>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{r.referralCode}</span>
                                        <button
                                          type="button"
                                          className={`ref-copy-btn ${copiedId === r._id ? 'copied' : ''}`}
                                          onClick={() => handleCopy(r.referralCode, r._id)}
                                          title="Copy Code"
                                        >
                                          {copiedId === r._id ? <Check size={11} /> : <Copy size={11} />}
                                        </button>
                                      </div>
                                    </td>
                                    <td>
                                      <span
                                        onClick={() => handleOpenReferrer(r.submittedBy)}
                                        style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                        title="Click to view detailed individual referrer audit report"
                                      >
                                        {r.submitterName}
                                      </span>
                                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.submitterRole}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                                      {r.submitterEmployeeId || 'N/A'}
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                      {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e40af' }}>
                                      {appId}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                                      <div>₹{(r.insuranceDetails?.estimatedSumInsured || 500000).toLocaleString()}</div>
                                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.insuranceDetails?.productType || 'Health'}</div>
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {r.applicationSubmissionDate ? new Date(r.applicationSubmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                                      ₹{standardRate}
                                    </td>
                                    <td>
                                      {r.incentiveEligible ? (
                                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                          ₹{r.incentiveAmount}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>₹0 (Pending Policy)</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${
                                        r.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                                        r.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                                        r.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                                        'ref-badge-submitted'
                                      }`}>
                                        {r.incentiveStatus || 'None'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div className="ref-action-cell" style={{ justifyContent: 'center' }}>
                                        <button className="ref-btn-sm ref-btn-view" onClick={() => handleViewDetails(r)}>
                                          <Eye size={13} /> View
                                        </button>
                                        <button className="ref-btn-sm ref-btn-review" onClick={() => handleOpenReview(r)}>
                                          <Edit3 size={13} /> Review
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}

                                {/* Job Row */}
                                {activeTab === 'job' && (
                                  <>
                                    <td>
                                      <span
                                        onClick={() => handleOpenReferrer(r.submittedBy)}
                                        style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                        title="Click to view detailed individual referrer audit report"
                                      >
                                        {r.submitterName}
                                      </span>
                                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                                        {r.submitterEmployeeId || 'N/A'}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                      {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.jobDetails?.jobRole || 'Engineer'}</div>
                                      <div style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 600 }}>{r.jobDetails?.companyName || 'TCS'}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e40af' }}>
                                      {appId}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {r.applicationSubmissionDate ? new Date(r.applicationSubmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                                      {r.jobDetails?.joiningDate ? new Date(r.jobDetails.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : (r.status === 'Joined' ? 'Joined' : 'Pending Joining')}
                                    </td>
                                    <td>
                                      {r.incentiveEligible ? (
                                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                          ₹{r.incentiveAmount}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>₹{standardRate} (On Joining)</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${
                                        r.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                                        r.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                                        r.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                                        'ref-badge-submitted'
                                      }`}>
                                        {r.incentiveStatus || 'None'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div className="ref-action-cell" style={{ justifyContent: 'center' }}>
                                        <button className="ref-btn-sm ref-btn-view" onClick={() => handleViewDetails(r)}>
                                          <Eye size={13} /> View
                                        </button>
                                        <button className="ref-btn-sm ref-btn-review" onClick={() => handleOpenReview(r)}>
                                          <Edit3 size={13} /> Review
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}

                                {/* Account Opening Row */}
                                {activeTab === 'bank' && (
                                  <>
                                    <td>
                                      <span
                                        onClick={() => handleOpenReferrer(r.submittedBy)}
                                        style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                        title="Click to view detailed individual referrer audit report"
                                      >
                                        {r.submitterName}
                                      </span>
                                      <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                                        {r.submitterEmployeeId || 'N/A'}
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                      {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                                    </td>
                                    <td>
                                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.bankAccountDetails?.accountType || 'Savings Account'}</div>
                                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>{r.bankAccountDetails?.bankName || 'HDFC Bank'}</div>
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                      {r.applicationSubmissionDate ? new Date(r.applicationSubmissionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                                      {r.bankAccountDetails?.accountNumberMasked || (r.status === 'Account Opened' ? 'Active' : 'Pending KYC')}
                                    </td>
                                    <td>
                                      {r.incentiveEligible ? (
                                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                          ₹{r.incentiveAmount}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>₹{standardRate} (On KYC)</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`ref-badge ${
                                        r.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                                        r.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                                        r.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                                        'ref-badge-submitted'
                                      }`}>
                                        {r.incentiveStatus || 'None'}
                                      </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                      <div className="ref-action-cell" style={{ justifyContent: 'center' }}>
                                        <button className="ref-btn-sm ref-btn-view" onClick={() => handleViewDetails(r)}>
                                          <Eye size={13} /> View
                                        </button>
                                        <button className="ref-btn-sm ref-btn-review" onClick={() => handleOpenReview(r)}>
                                          <Edit3 size={13} /> Review
                                        </button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredReferrals.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredReferrals.length)} of {filteredReferrals.length} records
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredReferrals.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(filteredReferrals.length / itemsPerPage)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 6: CONSOLIDATED INCENTIVE REPORTS (SECTION 6) ── */}
          {activeTab === 'incentives' && (
            <div>
              {/* Header & Subtitle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                    💰 Consolidated Incentive Reports
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.84rem' }}>
                    Unified ledger of earned incentives across Credit Cards, Insurance, Jobs, and Account Openings with full rate and payout traceability.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={getReferralExportCsvUrl({ type: 'incentives', collegeId: initialCollegeId || undefined })}
                    download
                    className="mgmt-btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> Export Incentive Ledger
                  </a>
                  <button className="mgmt-btn-primary" onClick={handleOpenPayout}>
                    <DollarSign size={16} /> Process Approved Payouts
                  </button>
                </div>
              </div>

              {/* Formula & Policy Explanation Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 18px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#2563eb', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    ₹
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#1e3a8a', lineHeight: 1.45 }}>
                    <strong>Traceable Calculation Formula:</strong> <code>Total Eligible Incentive = Eligible Referrals (Qty) × Configured Category Rate</code>. Ineligible or pending applications do not trigger payouts until approved.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem' }}>
                  <span style={{ color: '#059669', fontWeight: 700 }}>Total Paid: ₹{(overview?.financials?.totalPaid || 0).toLocaleString()}</span>
                  <span style={{ color: '#ea580c', fontWeight: 700 }}>Pending Approval: ₹{(overview?.financials?.totalPendingApproval || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Filter Toolbar for Incentives */}
              <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search incentive code, referral code, referrer, candidate, UTR..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: '6px 12px 6px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '100%', outline: 'none', background: '#ffffff' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Category:</span>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                      >
                        <option value="All">All Categories</option>
                        <option value="Credit Card">Credit Cards</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Job">Jobs</option>
                        <option value="Bank Account">Bank Accounts</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#ffffff' }}
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Paid">Paid</option>
                        <option value="Reversed">Reversed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b' }}>
                    <Calendar size={14} />
                    <span>From:</span>
                    <input
                      type="date"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
                    />
                    <span>To:</span>
                    <input
                      type="date"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', background: '#ffffff' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mgmt-btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {/* Consolidated Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Incentive ID</th>
                        <th>Referrer Name & Emp ID</th>
                        <th>Category</th>
                        <th>Candidate & App ID</th>
                        <th>Referral Date</th>
                        <th>Approval Date</th>
                        <th>Rate (₹)</th>
                        <th>Eligible Qty</th>
                        <th>Total Eligible</th>
                        <th>Amount Paid</th>
                        <th>Remaining Pending</th>
                        <th>Payment Status</th>
                        <th>Payment Date & Txn Ref</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncentives.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="ref-empty-state">No incentive records found for the selected criteria.</td>
                        </tr>
                      ) : (
                        filteredIncentives
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((inc) => {
                            const isPaid = inc.status === 'Paid';
                            const paidAmt = isPaid ? inc.amount : 0;
                            const pendingAmt = isPaid ? 0 : inc.amount;

                            return (
                              <tr key={inc._id}>
                                <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{inc.incentiveCode}</span>
                                    <button
                                      type="button"
                                      className={`ref-copy-btn ${copiedId === inc._id ? 'copied' : ''}`}
                                      onClick={() => handleCopy(inc.incentiveCode, inc._id)}
                                      title="Copy Incentive Code"
                                    >
                                      {copiedId === inc._id ? <Check size={11} /> : <Copy size={11} />}
                                    </button>
                                  </div>
                                </td>

                                <td>
                                  <span
                                    onClick={() => handleOpenReferrer(inc.earnedBy)}
                                    style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                    title="Click to view detailed individual referrer audit report"
                                  >
                                    {inc.earnedByName}
                                  </span>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                                    {inc.earnedByEmployeeId || 'N/A'}
                                  </div>
                                </td>

                                <td>
                                  <span className={`ref-cat-tag ref-cat-${inc.category?.toLowerCase().replace(/\s+/g, '')}`}>
                                    {inc.category}
                                  </span>
                                </td>

                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{inc.candidateName || 'N/A'}</div>
                                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#475569' }}>
                                    {inc.candidateApplicationId || inc.referralCode}
                                  </div>
                                </td>

                                <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                                  {inc.referralDate ? new Date(inc.referralDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(inc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>

                                <td style={{ whiteSpace: 'nowrap', color: '#64748b' }}>
                                  {inc.approvalDate ? new Date(inc.approvalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date(inc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>

                                <td style={{ fontWeight: 700, color: '#475569' }}>
                                  ₹{inc.incentiveRate || inc.amount}
                                </td>

                                <td style={{ textAlign: 'center', fontWeight: 800 }}>
                                  {inc.eligibleCount || 1}
                                </td>

                                <td>
                                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.98rem' }}>
                                    ₹{inc.amount}
                                  </span>
                                </td>

                                <td>
                                  <span style={{ fontWeight: 700, color: isPaid ? '#059669' : '#94a3b8' }}>
                                    ₹{paidAmt}
                                  </span>
                                </td>

                                <td>
                                  <span style={{ fontWeight: 700, color: pendingAmt > 0 ? '#ea580c' : '#94a3b8' }}>
                                    ₹{pendingAmt}
                                  </span>
                                </td>

                                <td>
                                  <span className={`ref-badge ${getStatusBadgeClass(inc.status)}`}>
                                    {inc.status}
                                  </span>
                                </td>

                                <td style={{ fontSize: '0.74rem', color: '#475569' }}>
                                  {isPaid ? (
                                    <div>
                                      <div style={{ fontWeight: 700, color: '#059669' }}>
                                        {inc.paidAt ? new Date(inc.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Settled'}
                                      </div>
                                      <div style={{ fontFamily: 'monospace', color: '#2563eb', fontSize: '0.7rem' }}>
                                        {inc.payoutRef || 'Bank Transfer'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8' }}>Pending Disbursal</span>
                                  )}
                                </td>

                                <td style={{ textAlign: 'center' }}>
                                  <div className="ref-action-cell" style={{ justifyContent: 'center' }}>
                                    {inc.status === 'Pending Approval' && (
                                      <>
                                        <button
                                          className="ref-btn-sm"
                                          style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
                                          onClick={() => handleIncentiveAction(inc._id, 'Approved')}
                                        >
                                          <Check size={13} /> Approve
                                        </button>
                                        <button
                                          className="ref-btn-sm"
                                          style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                                          onClick={() => handleIncentiveAction(inc._id, 'Rejected')}
                                        >
                                          <X size={13} /> Reject
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
                                        <RotateCcw size={13} /> Reverse
                                      </button>
                                    )}
                                    {inc.status === 'Approved' && (
                                      <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                                        Ready for Payout
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredIncentives.length > itemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredIncentives.length)} of {filteredIncentives.length} records
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredIncentives.length / itemsPerPage)))}
                        disabled={currentPage === Math.ceil(filteredIncentives.length / itemsPerPage)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 7: INCENTIVE SETTINGS & RULES (SECTION 10) ── */}
          {activeTab === 'rules' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.18rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                    ⚙️ Incentive Settings & Calculation Rules
                  </h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
                    Configurable reward rates per category, milestone triggers, eligibility criteria, and reversal policies. Rates are not hardcoded and update calculations in real-time.
                  </p>
                </div>
                <button
                  type="button"
                  className="mgmt-btn-primary"
                  onClick={() => setShowRuleModal(true)}
                >
                  <Plus size={16} /> <span>+ Add Incentive Rule</span>
                </button>
              </div>

              {/* Explanatory Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '12px 18px',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#2563eb', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                    💡
                  </div>
                  <div style={{ fontSize: '0.83rem', color: '#1e3a8a', lineHeight: 1.45 }}>
                    <strong>Automated Incentive Engine:</strong> When an applicant reaches their <strong>Target Milestone</strong> (e.g. <em>Account Opened</em>, <em>Policy Issued</em>, or <em>Joined</em>), the ERP calculates incentives using these active category rates and routes records to <strong>Incentive Reports</strong> for payout approval.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  <span style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>1. Lead Verified</span>
                  <span>→</span>
                  <span style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>2. Reward Triggered</span>
                  <span>→</span>
                  <span style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>3. Payout Disbursed</span>
                </div>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>Incentive Policy & Code</th>
                        <th style={{ width: '13%' }}>Category</th>
                        <th style={{ width: '18%' }}>Target Milestone</th>
                        <th style={{ width: '13%' }}>Reward Rate (Configured)</th>
                        <th style={{ width: '22%' }}>Eligibility & Conditions</th>
                        <th style={{ width: '6%' }}>Status</th>
                        <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rules.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                            No incentive rules configured yet. Click "+ Add Incentive Rule" to configure an approved policy.
                          </td>
                        </tr>
                      ) : (
                        rules.map((rule) => (
                          <tr key={rule._id}>
                            <td>
                              <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)', fontSize: '0.88rem' }}>
                                {rule.ruleName}
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                                {rule.ruleCode}
                              </div>
                            </td>
                            <td>
                              <span className={`ref-cat-tag ref-cat-${rule.category.toLowerCase().replace(/\s+/g, '')}`}>
                                {rule.category}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#1e3a8a', fontSize: '0.84rem' }}>
                                {rule.milestone}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {rule.amountType} Calculation
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem' }}>
                                {rule.amountType === 'Fixed' ? `₹${Number(rule.amount).toLocaleString('en-IN')}` : `${rule.amount}%`}
                              </div>
                            </td>
                            <td>
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#475569',
                                  lineHeight: 1.45,
                                  maxWidth: '340px'
                                }}
                                title={rule.eligibilityConditions}
                              >
                                {rule.eligibilityConditions || 'Standard partner milestone policy'}
                              </div>
                            </td>
                            <td>
                              <span className={`ref-badge ${rule.isActive ? 'ref-badge-success' : 'ref-badge-rejected'}`}>
                                {rule.isActive ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="mgmt-btn-secondary"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.78rem',
                                  color: rule.isActive ? '#dc2626' : '#16a34a',
                                  borderColor: rule.isActive ? '#fecaca' : '#bbf7d0',
                                  background: rule.isActive ? '#fef2f2' : '#f0fdf4'
                                }}
                                onClick={() => handleToggleRule(rule._id, rule.isActive)}
                              >
                                {rule.isActive ? 'Deactivate' : 'Activate'}
                              </button>
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
        </div>
      </div>

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
                    <div><strong>Category:</strong> {selectedReferral.insuranceDetails?.insuranceCategory || selectedReferral.insuranceDetails?.productType || 'N/A'}</div>
                    {selectedReferral.insuranceDetails?.selectedOffering && (
                      <div><strong>Offering:</strong> {selectedReferral.insuranceDetails.selectedOffering}</div>
                    )}
                    <div><strong>Applicant:</strong> {selectedReferral.insuranceDetails?.applicantName}</div>
                    <div><strong>Phone:</strong> {selectedReferral.insuranceDetails?.applicantPhone}</div>
                    <div><strong>Sum Insured:</strong> {selectedReferral.insuranceDetails?.sumInsuredTier || `₹${selectedReferral.insuranceDetails?.estimatedSumInsured?.toLocaleString()}`}</div>
                    {selectedReferral.insuranceDetails?.partnerReferenceNumber && (
                      <div><strong>Partner Ref #:</strong> {selectedReferral.insuranceDetails.partnerReferenceNumber}</div>
                    )}
                    <div><strong>Consent Notice:</strong> {selectedReferral.insuranceDetails?.consentNoticeVersion || 'v1.2-FIC-INS-CONSENT'} ✔</div>
                  </div>
                )}
                {selectedReferral.category === 'Credit Card' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Bank:</strong> {selectedReferral.creditCardDetails?.bankName}</div>
                    <div><strong>Product:</strong> {selectedReferral.creditCardDetails?.cardProduct}</div>
                    <div><strong>Applicant:</strong> {selectedReferral.creditCardDetails?.applicantName}</div>
                    <div><strong>Phone:</strong> {selectedReferral.creditCardDetails?.applicantPhone}</div>
                    <div><strong>Employment:</strong> {selectedReferral.creditCardDetails?.employmentType}</div>
                    {selectedReferral.creditCardDetails?.referralSource && (
                      <div><strong>Referral Source:</strong> {selectedReferral.creditCardDetails.referralSource}</div>
                    )}
                    {selectedReferral.creditCardDetails?.partnerReferenceNumber && (
                      <div><strong>Partner Ref #:</strong> {selectedReferral.creditCardDetails.partnerReferenceNumber}</div>
                    )}
                    <div><strong>Consent Notice:</strong> {selectedReferral.creditCardDetails?.consentNoticeVersion || 'v2.4-FIC-CC-CONSENT'} ✔</div>
                  </div>
                )}
                {selectedReferral.category === 'Bank Account' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Bank:</strong> {selectedReferral.bankAccountDetails?.bankName}</div>
                    <div><strong>Account Product:</strong> {selectedReferral.bankAccountDetails?.accountProduct || selectedReferral.bankAccountDetails?.accountType}</div>
                    <div><strong>Customer:</strong> {selectedReferral.bankAccountDetails?.applicantName}</div>
                    <div><strong>Applicant Type:</strong> {selectedReferral.bankAccountDetails?.applicantType || 'Student'}</div>
                    <div><strong>KYC Status:</strong> {selectedReferral.bankAccountDetails?.kycStatus}</div>
                    {selectedReferral.bankAccountDetails?.partnerReferenceNumber && (
                      <div><strong>Partner Ref #:</strong> {selectedReferral.bankAccountDetails.partnerReferenceNumber}</div>
                    )}
                    <div><strong>Consent Notice:</strong> {selectedReferral.bankAccountDetails?.consentNoticeVersion || 'v1.2-FIC-ACC-CONSENT'} ✔</div>
                  </div>
                )}
                {selectedReferral.category === 'Job' && (
                  <div className="ref-form-row" style={{ fontSize: '0.85rem' }}>
                    <div><strong>Company:</strong> {selectedReferral.jobDetails?.companyName}</div>
                    <div><strong>Role:</strong> {selectedReferral.jobDetails?.jobRole} ({selectedReferral.jobDetails?.jobReferenceId || 'N/A'})</div>
                    <div><strong>Candidate:</strong> {selectedReferral.jobDetails?.candidateName}</div>
                    <div><strong>Experience:</strong> {selectedReferral.jobDetails?.experienceLevel || selectedReferral.jobDetails?.experienceYears}</div>
                    <div><strong>Relationship:</strong> {selectedReferral.jobDetails?.referrerRelationship || 'Alumni'}</div>
                    <div><strong>Stage:</strong> {selectedReferral.jobDetails?.currentInterviewStage}</div>
                    <div><strong>Candidate Consent:</strong> {selectedReferral.jobDetails?.consentNoticeVersion || 'v1.2-FIC-JOB-CONSENT'} ✔</div>
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

      {/* ── MODAL 2: REVIEW / UPDATE STATUS (CATEGORY-TAILORED FLOW) ── */}
      {showReviewModal && reviewingReferral && (
        <div className="ref-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">
                <span className={`ref-cat-tag ref-cat-${reviewingReferral.category.toLowerCase().replace(/\s+/g, '')}`}>
                  {reviewingReferral.category === 'Insurance' && <Shield size={14} />}
                  {reviewingReferral.category === 'Credit Card' && <CreditCard size={14} />}
                  {reviewingReferral.category === 'Bank Account' && <Landmark size={14} />}
                  {reviewingReferral.category === 'Job' && <Briefcase size={14} />}
                  {reviewingReferral.category}
                </span>
                <span>Review Referral: {reviewingReferral.referralCode}</span>
              </div>
              <button className="ref-modal-close" onClick={() => setShowReviewModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveStatus}>
              <div className="ref-modal-body">
                {/* Referral Overview Card */}
                <div className="ref-review-meta-box">
                  <div className="ref-review-meta-item">
                    <span className="ref-review-meta-label">
                      {CATEGORY_FLOW_CONFIG[reviewingReferral.category]?.applicantNameLabel || 'Applicant / Candidate'}
                    </span>
                    <span className="ref-review-meta-val">{getApplicantDisplay(reviewingReferral)}</span>
                  </div>
                  <div className="ref-review-meta-item">
                    <span className="ref-review-meta-label">Submitted By</span>
                    <span className="ref-review-meta-val">
                      {reviewingReferral.submitterName} ({reviewingReferral.submitterRole})
                    </span>
                  </div>
                  <div className="ref-review-meta-item">
                    <span className="ref-review-meta-label">Current Pipeline Status</span>
                    <span className={`ref-badge ${getStatusBadgeClass(reviewingReferral.status)}`}>
                      {reviewingReferral.status}
                    </span>
                  </div>
                </div>

                {/* Short and Sweet Visual Stepper (Interactive Preview) */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="ref-form-label" style={{ marginBottom: '2px' }}>
                    Process Lifecycle Flow ({reviewingReferral.category})
                  </label>
                  {renderPipelineStepper(reviewingReferral, newStatus)}
                </div>

                {/* Clean, Category-Specific Status Dropdown */}
                {(() => {
                  const flow = CATEGORY_FLOW_CONFIG[reviewingReferral.category] || CATEGORY_FLOW_CONFIG['Insurance'];
                  const isCurrentMilestone = newStatus === flow.milestoneStatus;

                  return (
                    <>
                      <div className="ref-form-group">
                        <label className="ref-form-label">
                          New Status <span style={{ color: '#ef4444' }}>*</span>
                          <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '6px', fontSize: '0.78rem' }}>
                            (Showing valid steps for {flow.name})
                          </span>
                        </label>
                        <select
                          className="ref-form-select"
                          value={newStatus}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewStatus(val);
                            if (val === flow.milestoneStatus) {
                              setVerifiedMilestone(flow.milestoneName);
                            } else {
                              setVerifiedMilestone('');
                            }
                          }}
                          required
                        >
                          {flow.statuses.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Completion Auto-Credit Callout Banner */}
                      {isCurrentMilestone && (
                        <div className="ref-milestone-auto-alert">
                          <Sparkles size={18} className="ref-milestone-alert-icon" />
                          <div>
                            <div className="ref-milestone-alert-title">
                              Referral Completed: {newStatus}
                            </div>
                            <div className="ref-milestone-alert-desc">
                              Setting this status confirms successful completion and qualifies <strong>{reviewingReferral.submitterName}</strong> for the incentive reward.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Category-Specific Reference ID Input */}
                      <div className="ref-form-group">
                        <label className="ref-form-label">
                          {flow.refFieldLabel}
                          <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '6px', fontSize: '0.78rem' }}>
                            (Optional reference tracking)
                          </span>
                        </label>
                        <input
                          type="text"
                          className="ref-form-input"
                          placeholder={flow.refFieldPlaceholder}
                          value={policyOrAppNumber}
                          onChange={(e) => setPolicyOrAppNumber(e.target.value)}
                        />
                      </div>
                    </>
                  );
                })()}

                {/* Rejection / Cancellation Reason (Conditional) */}
                {(newStatus === 'Rejected' || newStatus === 'Cancelled') && (
                  <div className="ref-form-group">
                    <label className="ref-form-label" style={{ color: '#b91c1c' }}>
                      Rejection Reason <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      className="ref-form-textarea"
                      rows={2}
                      placeholder="Explain why this referral was rejected or cancelled..."
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                {/* Remarks & Notes */}
                <div className="ref-form-group">
                  <label className="ref-form-label">Review Remarks / Internal Notes</label>
                  <textarea
                    className="ref-form-textarea"
                    rows={2}
                    placeholder="Enter review notes visible to the submitter and audit trail..."
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
                  <Check size={16} /> Update Status & Save
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
                    <div style={{ marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#1e293b', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={submissionForm.creditCardDetails?.applicantConsentGiven}
                          onChange={(e) => setSubmissionForm({
                            ...submissionForm,
                            creditCardDetails: { ...submissionForm.creditCardDetails, applicantConsentGiven: e.target.checked }
                          })}
                          required
                        />
                        <span>I confirm that the applicant has granted explicit consent for partner bank contact. (v2.4-FIC-CC-CONSENT) *</span>
                      </label>
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

      {/* ── DETAILED INDIVIDUAL REFERRER AUDIT REPORT MODAL ── */}
      <ReferrerReportModal
        isOpen={showReferrerModal}
        onClose={() => setShowReferrerModal(false)}
        referrerId={selectedReferrerId}
        onViewReferral={(refItem) => {
          setShowReferrerModal(false);
          handleViewDetails(refItem);
        }}
      />
    </div>
  );
}
