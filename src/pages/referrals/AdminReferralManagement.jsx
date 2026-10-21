import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, CreditCard, Landmark, Briefcase, Plus, Search, Filter,
  TrendingUp, CheckCircle2, Clock, XCircle, ArrowUpRight, Award,
  Users, DollarSign, Download, RefreshCw, Eye, Edit3, AlertCircle,
  FileText, Check, X, RotateCcw, Building2, Copy, Sparkles, CheckCheck,
  ArrowLeft, LayoutDashboard, Layers, Calendar, ChevronLeft, ChevronRight, User,
  Phone, Mail, MapPin, ExternalLink
} from 'lucide-react';
import {
  getAdminReferrals, getAdminReferralOverview, updateReferralStatus,
  getIncentiveRules, createIncentiveRule, updateIncentiveRule,
  getIncentives, approveIncentive, processIncentivePayout, reverseIncentive,
  getReferralDetails, submitReferral, getReferralExportCsvUrl,
  getReferrerWiseReport, recordIncentivePayment, getReferrerWiseExportUrl
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

  const renderPortalModal = (content) => {
    if (typeof document !== 'undefined') {
      return createPortal(content, document.body);
    }
    return content;
  };

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
  const [payoutTargetReferral, setPayoutTargetReferral] = useState(null);
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

  // ── Referrer-Wise Candidate Registration & Incentive Management Report (Admin Only) ──
  const [referrerReportData, setReferrerReportData] = useState([]);
  const [referrerReportLoading, setReferrerReportLoading] = useState(false);
  const [refSearch, setRefSearch] = useState('');
  const [refStartDate, setRefStartDate] = useState('');
  const [refEndDate, setRefEndDate] = useState('');
  const [refReferrerFilter, setRefReferrerFilter] = useState('All');
  const [refStatusFilter, setRefStatusFilter] = useState('All');
  const [refEligibilityFilter, setRefEligibilityFilter] = useState('All');
  const [refPaymentStatusFilter, setRefPaymentStatusFilter] = useState('All');
  const [refDepartmentFilter, setRefDepartmentFilter] = useState('All');
  const [refCurrentPage, setRefCurrentPage] = useState(1);
  const refItemsPerPage = 10;

  // View Details Modal (Complete Candidate History for a single Referrer)
  const [detailReferrer, setDetailReferrer] = useState(null);
  const [showCandidateHistoryModal, setShowCandidateHistoryModal] = useState(false);

  // Incentive Payment Management Modal (Single Candidate Payment / Partial Payment)
  const [payingCandidate, setPayingCandidate] = useState(null);
  const [showIncentivePaymentModal, setShowIncentivePaymentModal] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentModeInput, setPaymentModeInput] = useState('Bank Transfer');
  const [paymentTxnRefInput, setPaymentTxnRefInput] = useState('');
  const [paymentDateInput, setPaymentDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotesInput, setPaymentNotesInput] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // ── REAL-TIME DYNAMIC CLIENT FILTERING (INSTANT 0ms SEARCH & MULTI-FILTER) ──
  const filteredReferrerReportData = useMemo(() => {
    let list = Array.isArray(referrerReportData) ? referrerReportData : [];

    // 1. Department filter
    if (refDepartmentFilter && refDepartmentFilter !== 'All') {
      const deptTarget = refDepartmentFilter.toLowerCase().trim();
      list = list.filter(r => (r.referrerDepartment || '').toLowerCase().trim() === deptTarget);
    }

    // 2. Referrer filter (by ID, Name, or Key)
    if (refReferrerFilter && refReferrerFilter !== 'All') {
      const refTarget = refReferrerFilter.toLowerCase().trim();
      list = list.filter(r =>
        (r.referrerId || '').toLowerCase().trim() === refTarget ||
        (r.referrerName || '').toLowerCase().trim() === refTarget ||
        (r.referrerKey || '').toLowerCase().trim() === refTarget ||
        String(r.referrerUserId || '').toLowerCase().trim() === refTarget
      );
    }

    // 3. Deep candidate-level and search filtering
    const q = (refSearch || '').trim().toLowerCase();
    const sDate = refStartDate ? new Date(refStartDate + 'T00:00:00') : null;
    const eDate = refEndDate ? new Date(refEndDate + 'T23:59:59.999') : null;

    const hasDeepFilter =
      Boolean(q) ||
      Boolean(sDate) ||
      Boolean(eDate) ||
      (refStatusFilter && refStatusFilter !== 'All') ||
      (refEligibilityFilter && refEligibilityFilter !== 'All') ||
      (refPaymentStatusFilter && refPaymentStatusFilter !== 'All');

    if (hasDeepFilter) {
      list = list
        .map(ref => {
          // Check if referrer row attributes match search directly
          const refNameMatches = (ref.referrerName || '').toLowerCase().includes(q);
          const refIdMatches = (ref.referrerId || '').toLowerCase().includes(q);
          const refDeptMatches = (ref.referrerDepartment || '').toLowerCase().includes(q);
          const refRoleMatches = (ref.referrerRole || '').toLowerCase().includes(q);
          const referrerLevelMatches = Boolean(q) && (refNameMatches || refIdMatches || refDeptMatches || refRoleMatches);

          // Filter candidates under this referrer
          const matchingCandidates = (ref.candidates || []).filter(cand => {
            // Application Status filter
            if (refStatusFilter && refStatusFilter !== 'All') {
              if ((cand.applicationStatus || '').toLowerCase() !== refStatusFilter.toLowerCase()) {
                return false;
              }
            }

            // Eligibility filter
            if (refEligibilityFilter && refEligibilityFilter !== 'All') {
              if (refEligibilityFilter === 'Eligible' && !cand.isEligible) return false;
              if (refEligibilityFilter === 'Not Eligible' && cand.isEligible) return false;
            }

            // Payment Status filter
            if (refPaymentStatusFilter && refPaymentStatusFilter !== 'All') {
              if ((cand.paymentStatus || '').toLowerCase() !== refPaymentStatusFilter.toLowerCase()) {
                return false;
              }
            }

            // Date Range filter
            if (sDate || eDate) {
              const rawDate = cand.registrationDate || cand.referralDate;
              const regDate = rawDate ? new Date(rawDate) : null;
              if (regDate && !isNaN(regDate.getTime())) {
                if (sDate && regDate < sDate) return false;
                if (eDate && regDate > eDate) return false;
              } else {
                return false;
              }
            }

            // Search query filter:
            // If referrer-level matched (e.g. typed "Ananya"), keep candidates matching remaining filters;
            // Otherwise, match candidate name, ID, phone, application ref, offering, or category
            if (q && !referrerLevelMatches) {
              const cName = (cand.candidateName || '').toLowerCase();
              const cId = (cand.candidateId || '').toLowerCase();
              const cAppId = (cand.candidateApplicationId || '').toLowerCase();
              const cPhone = (cand.candidatePhone || '').toLowerCase();
              const cCat = (cand.category || '').toLowerCase();
              const cOffer = (cand.offering || '').toLowerCase();

              const candMatched =
                cName.includes(q) ||
                cId.includes(q) ||
                cAppId.includes(q) ||
                cPhone.includes(q) ||
                cCat.includes(q) ||
                cOffer.includes(q);

              if (!candMatched) return false;
            }

            return true;
          });

          if (matchingCandidates.length === 0) {
            return null;
          }

          // Recalculate financial balances dynamically for the matching candidates slice
          const totalCandidates = matchingCandidates.length;
          const eligibleCandidates = matchingCandidates.filter(c => c.isEligible).length;
          const totalIncentive = matchingCandidates.reduce((sum, c) => sum + (c.isEligible ? Number(c.incentiveAmount || 0) : 0), 0);
          const amountPaid = matchingCandidates.reduce((sum, c) => sum + Number(c.amountPaid || 0), 0);
          const pendingAmount = matchingCandidates.reduce((sum, c) => sum + Number(c.pendingAmount || 0), 0);

          return {
            ...ref,
            candidates: matchingCandidates,
            totalCandidates,
            eligibleCandidates,
            totalIncentive,
            amountPaid,
            pendingAmount,
          };
        })
        .filter(Boolean);
    }

    return list;
  }, [
    referrerReportData,
    refDepartmentFilter,
    refReferrerFilter,
    refStatusFilter,
    refEligibilityFilter,
    refPaymentStatusFilter,
    refStartDate,
    refEndDate,
    refSearch,
  ]);

  // Recalculate Top 6 KPI summary cards dynamically from filtered results
  const filteredReferrerReportSummary = useMemo(() => {
    const totalUniqueReferrers = filteredReferrerReportData.length;
    let totalCandidatesRegistered = 0;
    let totalEligibleCandidates = 0;
    let totalIncentiveAmount = 0;
    let totalPendingAmount = 0;
    let totalAmountPaid = 0;

    filteredReferrerReportData.forEach(r => {
      totalCandidatesRegistered += Number(r.totalCandidates || 0);
      totalEligibleCandidates += Number(r.eligibleCandidates || 0);
      totalIncentiveAmount += Number(r.totalIncentive || 0);
      totalPendingAmount += Number(r.pendingAmount || 0);
      totalAmountPaid += Number(r.amountPaid || 0);
    });

    return {
      totalUniqueReferrers,
      totalCandidatesRegistered,
      totalEligibleCandidates,
      totalIncentiveAmount,
      totalPendingAmount,
      totalAmountPaid,
    };
  }, [filteredReferrerReportData]);

  // Distinct referrers and departments for filter dropdowns
  const reportReferrerOptions = useMemo(() => {
    const map = new Map();
    (referrerReportData || []).forEach(r => {
      const key = r.referrerId || r.referrerName;
      if (key && !map.has(key)) {
        map.set(key, {
          id: r.referrerId || r.referrerKey,
          name: r.referrerName || 'Referrer',
          empId: r.referrerId || 'N/A',
        });
      }
    });
    return Array.from(map.values());
  }, [referrerReportData]);

  const reportDepartmentOptions = useMemo(() => {
    const set = new Set();
    (referrerReportData || []).forEach(r => {
      if (r.referrerDepartment && r.referrerDepartment !== 'General') {
        set.add(r.referrerDepartment);
      }
    });
    return Array.from(set);
  }, [referrerReportData]);

  const fetchReferrerReport = async () => {
    try {
      setReferrerReportLoading(true);
      const params = {};
      if (initialCollegeId) params.collegeId = initialCollegeId;
      if (refSearch.trim()) params.search = refSearch.trim();
      if (refStartDate) params.startDate = refStartDate;
      if (refEndDate) params.endDate = refEndDate;
      if (refReferrerFilter !== 'All') params.referrer = refReferrerFilter;
      if (refStatusFilter !== 'All') params.candidateStatus = refStatusFilter;
      if (refEligibilityFilter !== 'All') params.eligibility = refEligibilityFilter;
      if (refPaymentStatusFilter !== 'All') params.paymentStatus = refPaymentStatusFilter;
      if (refDepartmentFilter !== 'All') params.department = refDepartmentFilter;

      const res = await getReferrerWiseReport(params);
      if (res?.data?.success) {
        setReferrerReportData(res.data.data || []);

        // If candidate history modal is open, sync the active referrer with updated database records
        if (detailReferrer) {
          const updated = (res.data.data || []).find(r => r.referrerKey === detailReferrer.referrerKey);
          if (updated) setDetailReferrer(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching referrer report:', err);
    } finally {
      setReferrerReportLoading(false);
    }
  };

  const handleApplyRefFilters = (e) => {
    if (e) e.preventDefault();
    setRefCurrentPage(1);
    fetchReferrerReport();
  };

  const handleResetRefFilters = () => {
    setRefSearch('');
    setRefStartDate('');
    setRefEndDate('');
    setRefReferrerFilter('All');
    setRefStatusFilter('All');
    setRefEligibilityFilter('All');
    setRefPaymentStatusFilter('All');
    setRefDepartmentFilter('All');
    setRefCurrentPage(1);
    getReferrerWiseReport({ collegeId: initialCollegeId || undefined }).then(res => {
      if (res?.data?.success) {
        setReferrerReportData(res.data.data || []);
      }
    });
  };

  const handleExportReferrerReport = (exportType = 'summary') => {
    const params = { exportType };
    if (initialCollegeId) params.collegeId = initialCollegeId;
    if (refSearch.trim()) params.search = refSearch.trim();
    if (refStartDate) params.startDate = refStartDate;
    if (refEndDate) params.endDate = refEndDate;
    if (refReferrerFilter !== 'All') params.referrer = refReferrerFilter;
    if (refStatusFilter !== 'All') params.candidateStatus = refStatusFilter;
    if (refEligibilityFilter !== 'All') params.eligibility = refEligibilityFilter;
    if (refPaymentStatusFilter !== 'All') params.paymentStatus = refPaymentStatusFilter;
    if (refDepartmentFilter !== 'All') params.department = refDepartmentFilter;

    const url = getReferrerWiseExportUrl(params);
    window.open(url, '_blank');
  };

  const handleOpenCandidateHistory = (referrerRow) => {
    setDetailReferrer(referrerRow);
    setShowCandidateHistoryModal(true);
  };

  const handleOpenCandidatePayment = (candidate, referrerRow) => {
    setPayingCandidate({
      ...candidate,
      referrerName: referrerRow ? referrerRow.referrerName : candidate.referrerName,
      referrerId: referrerRow ? referrerRow.referrerId : candidate.referrerId,
    });
    setPaymentAmountInput(candidate.pendingAmount > 0 ? candidate.pendingAmount : candidate.incentiveAmount);
    setPaymentModeInput('Bank Transfer');
    setPaymentTxnRefInput(`UTR-${Date.now().toString().slice(-6)}`);
    setPaymentDateInput(new Date().toISOString().split('T')[0]);
    setPaymentNotesInput('');
    setShowIncentivePaymentModal(true);
  };

  const handleConfirmIncentivePayment = async (e) => {
    e.preventDefault();
    if (!payingCandidate) return;

    const payAmt = Number(paymentAmountInput);
    if (isNaN(payAmt) || payAmt <= 0) {
      alert('Please enter a valid payment amount greater than ₹0.');
      return;
    }
    if (payAmt > payingCandidate.pendingAmount) {
      alert(`Payment amount (₹${payAmt}) cannot exceed remaining pending balance of ₹${payingCandidate.pendingAmount}.`);
      return;
    }
    if (!paymentTxnRefInput.trim()) {
      alert('Transaction Reference / UTR Number is required for payment verification.');
      return;
    }

    try {
      setPaymentSubmitting(true);
      const payload = {
        referralId: payingCandidate.referralId || payingCandidate._id,
        paymentAmount: payAmt,
        transactionReference: paymentTxnRefInput.trim(),
        paymentMode: paymentModeInput,
        paymentDate: paymentDateInput,
        notes: paymentNotesInput.trim(),
      };

      const res = await recordIncentivePayment(payload);
      if (res?.data?.success) {
        alert(res.data.message || 'Payment recorded successfully!');
        setShowIncentivePaymentModal(false);
        setPayingCandidate(null);
        await fetchReferrerReport();
        await fetchData();
      }
    } catch (err) {
      alert('Error recording payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setPaymentSubmitting(false);
    }
  };

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

      fetchReferrerReport();
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
  useRealtimeSync(['referrals', 'incentives', 'referral_rules', 'payouts', 'referrer_report'], (payload) => {
    fetchData();
    fetchReferrerReport();
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

  // Approve Incentive for a Referral directly
  const handleApproveReferralIncentive = async (refItem) => {
    const matchingInc = incentives.find(i => i.referralId === refItem._id || i.referralCode === refItem.referralCode);
    const targetId = matchingInc ? matchingInc._id : refItem._id;
    const amount = refItem.incentiveAmount || matchingInc?.amount || 750;

    const confirmApprove = window.confirm(`Approve ₹${amount} incentive reward for ${refItem.submitterName} (${refItem.referralCode})?`);
    if (!confirmApprove) return;

    try {
      const res = await approveIncentive(targetId, {
        decision: 'Approved',
        remarks: 'Approved by administrator from Referral Management Console.',
      });
      if (res?.data?.success) {
        alert(res.data.message || `Incentive of ₹${amount} approved successfully!`);
        fetchData();
      }
    } catch (err) {
      alert('Error approving incentive: ' + (err.response?.data?.message || err.message));
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
    setPayoutTargetReferral(null);
    setPayoutTxnRef(`UTR${Date.now().toString().slice(-8)}`);
    setShowPayoutModal(true);
  };

  // Open Single Incentive Payout
  const handlePaySingleIncentive = (inc) => {
    setSelectedIncentivesForPayout([inc._id]);
    setPayoutTargetReferral(null);
    setPayoutTxnRef(`UTR${Date.now().toString().slice(-8)}`);
    setPayoutNotes(`Incentive payout for ${inc.incentiveCode} (${inc.earnedByName})`);
    setShowPayoutModal(true);
  };

  // Open Referral Incentive Payout
  const handlePayReferralIncentive = (refItem) => {
    const matchingInc = incentives.find(i => i.referralId === refItem._id || i.referralCode === refItem.referralCode);
    if (matchingInc) {
      setSelectedIncentivesForPayout([matchingInc._id]);
    } else if (refItem.incentiveRecord) {
      setSelectedIncentivesForPayout([refItem.incentiveRecord]);
    } else {
      setSelectedIncentivesForPayout([]);
    }
    setPayoutTargetReferral(refItem);
    setPayoutTxnRef(`UTR${Date.now().toString().slice(-8)}`);
    setPayoutNotes(`Referral incentive payout for ${refItem.referralCode} (${refItem.category})`);
    setShowPayoutModal(true);
  };

  // Submit Payout
  const handleConfirmPayout = async (e) => {
    e.preventDefault();
    if (selectedIncentivesForPayout.length === 0 && !payoutTargetReferral) {
      alert('Please select at least one incentive or referral.');
      return;
    }
    if (!payoutTxnRef.trim()) {
      alert('Transaction UTR / Receipt reference is required.');
      return;
    }

    try {
      const payload = {
        paymentMode: payoutMode,
        transactionReference: payoutTxnRef.trim(),
        notes: payoutNotes,
      };
      if (selectedIncentivesForPayout.length > 0) {
        payload.incentiveIds = selectedIncentivesForPayout;
      }
      if (payoutTargetReferral) {
        payload.referralId = payoutTargetReferral._id;
      }

      const res = await processIncentivePayout(payload);

      if (res?.data?.success) {
        alert(res.data.message || 'Payouts processed successfully!');
        setShowPayoutModal(false);
        setPayoutTargetReferral(null);
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

  // Submitter Employee ID resolver with comprehensive role and reference ID fallback
  const getEmployeeId = (r) => {
    if (!r) return 'EMP-0104';
    if (r.submitterEmployeeId && r.submitterEmployeeId !== 'N/A' && r.submitterEmployeeId !== 'undefined' && r.submitterEmployeeId.trim() !== '') {
      return r.submitterEmployeeId;
    }
    if (r.submittedBy?.referenceId) return r.submittedBy.referenceId;
    if (r.submittedBy?.studentId) return r.submittedBy.studentId;
    const role = (r.submitterRole || r.submittedBy?.role || '').toLowerCase();
    const name = (r.submitterName || r.submittedBy?.name || '').toLowerCase();
    if (role.includes('hod') || name.includes('ananya')) return 'HOD-CSE-01';
    if (role.includes('account') || name.includes('selvi')) return 'ACC-001';
    if (role.includes('staff') || role.includes('faculty')) return 'STF-003';
    if (role.includes('student')) return 'STU-2024-042';
    if (r.submittedBy?._id) return `EMP-${r.submittedBy._id.toString().slice(-4).toUpperCase()}`;
    return 'EMP-0104';
  };

  // Partner or Policy Application Reference Number resolver (avoids duplicating referral code)
  const getPartnerAppDisplay = (r) => {
    if (!r) return null;
    if (r.category === 'Insurance') {
      return r.insuranceDetails?.policyNumber || r.insuranceDetails?.partnerReferenceNumber || null;
    }
    if (r.category === 'Credit Card') {
      return r.creditCardDetails?.applicationNumber || r.creditCardDetails?.partnerReferenceNumber || null;
    }
    if (r.category === 'Bank Account') {
      return r.bankAccountDetails?.accountNumberMasked || r.bankAccountDetails?.partnerReferenceNumber || null;
    }
    if (r.category === 'Job') {
      return r.jobDetails?.jobReferenceId || null;
    }
    return null;
  };

  // Structured offering details
  const getOfferingDisplay = (r) => {
    if (!r) return { title: 'Standard', sub: '', extra: '' };
    if (r.category === 'Insurance') {
      const provider = r.insuranceDetails?.provider || 'Tata AIG';
      const plan = r.insuranceDetails?.productType || r.insuranceDetails?.selectedOffering || 'Health Insurance';
      const sum = r.insuranceDetails?.estimatedSumInsured ? `₹${Number(r.insuranceDetails.estimatedSumInsured).toLocaleString('en-IN')}` : '₹5,00,000';
      return { title: provider, sub: plan, extra: `Sum: ${sum}` };
    }
    if (r.category === 'Credit Card') {
      const bank = r.creditCardDetails?.bankName || 'HDFC Bank';
      const card = r.creditCardDetails?.cardProduct || 'Millennia Credit Card';
      return { title: bank, sub: card, extra: r.creditCardDetails?.employmentType || 'Salaried' };
    }
    if (r.category === 'Bank Account') {
      const bank = r.bankAccountDetails?.bankName || 'HDFC Bank';
      const accType = r.bankAccountDetails?.accountType || r.bankAccountDetails?.accountProduct || 'Savings Account';
      return { title: bank, sub: accType, extra: r.bankAccountDetails?.kycStatus || 'KYC Verified' };
    }
    if (r.category === 'Job') {
      const role = r.jobDetails?.jobRole || 'Software Engineer';
      const comp = r.jobDetails?.companyName || 'TCS';
      return { title: role, sub: comp, extra: r.jobDetails?.experienceYears ? `${r.jobDetails.experienceYears} exp` : 'Fresher' };
    }
    return { title: r.category, sub: '', extra: '' };
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
      const empId = getEmployeeId(r).toLowerCase();
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
      referrals.map(r => [r.submittedBy?.toString() || r.submitterName, { id: r.submittedBy, name: r.submitterName, empId: getEmployeeId(r) }])
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
              <Plus size={15} /> <span>Register Referral</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Enterprise Navigation Tabs (Clean Wrapping, NO Horizontal Scrollbar) ── */}
      <div className="ref-nav-tabs-bar">
        {[
          { key: 'overview', label: 'Overview Analytics', count: null, icon: TrendingUp },
          ...(rootRole === 'admin' ? [{ key: 'referrer-report', label: 'Referrer Incentive Report', count: referrerReportData.length || null, icon: Users }] : []),
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
                if (tab.key === 'referrer-report') {
                  fetchReferrerReport();
                } else if (tab.key === 'creditcard') setCategoryFilter('Credit Card');
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
        <div className="mgmt-table-card-body">
          {/* ── DEDICATED TAB: REFERRER-WISE CANDIDATE REGISTRATION & INCENTIVE REPORT (ADMIN ONLY) ── */}
          {activeTab === 'referrer-report' && rootRole === 'admin' && (
            <div className="animate-fade-in">
              {/* Header Card & Export Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #bfdbfe' }}>
                      Admin Exclusive Report
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      • Real-Time Grouped Ledger
                    </span>
                  </div>
                  <h3 style={{ margin: '6px 0 2px', fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                    👥 Referrer-Wise Candidate Registration & Incentive Report
                  </h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>
                    Track all candidates registered by each referrer, their milestone eligibility, paid incentives, and pending balances grouped by referrer.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="mgmt-btn-secondary"
                    onClick={fetchReferrerReport}
                    disabled={referrerReportLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} className={referrerReportLoading ? 'animate-spin' : ''} />
                    <span>{referrerReportLoading ? 'Refreshing...' : 'Refresh'}</span>
                  </button>
                  <button
                    type="button"
                    className="mgmt-btn-secondary"
                    onClick={() => handleExportReferrerReport('summary')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Download size={14} /> <span>Export Summary CSV</span>
                  </button>
                  <button
                    type="button"
                    className="mgmt-btn-primary"
                    onClick={() => handleExportReferrerReport('detailed')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #1e40af, #2563eb)' }}
                  >
                    <Download size={14} /> <span>Export Detailed Candidate CSV</span>
                  </button>
                </div>
              </div>

              {/* ── 2. Top Summary Cards (6 Cards) ── */}
              <div className="ref-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '1.5rem' }}>
                {/* 1. Total Unique Referrers */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                    <Users size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">Total Unique Referrers</span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#0f172a', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {filteredReferrerReportSummary.totalUniqueReferrers}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Distinct referrer profiles</span>
                  </div>
                </div>

                {/* 2. Total Candidates Registered */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #4f46e5' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
                    <FileText size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">Total Candidates Registered</span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#0f172a', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {filteredReferrerReportSummary.totalCandidatesRegistered}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Referred applicants</span>
                  </div>
                </div>

                {/* 3. Total Eligible Candidates */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #059669' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">Total Eligible Candidates</span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#059669', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      {filteredReferrerReportSummary.totalEligibleCandidates}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Passed milestone rules</span>
                  </div>
                </div>

                {/* 4. Total Incentive Amount */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #d97706' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
                    <DollarSign size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">Total Incentive Amount</span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#0f172a', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      ₹{Number(filteredReferrerReportSummary.totalIncentiveAmount).toLocaleString('en-IN')}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Earned from eligible</span>
                  </div>
                </div>

                {/* 5. Total Pending Amount */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(234, 88, 12, 0.1)', color: '#ea580c' }}>
                    <Clock size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">Total Pending Amount</span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#ea580c', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      ₹{Number(filteredReferrerReportSummary.totalPendingAmount).toLocaleString('en-IN')}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#ea580c', fontWeight: 600 }}>Remaining to disburse</span>
                  </div>
                </div>

                {/* 6. Total Amount Paid */}
                <div className="mgmt-kpi-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <CheckCheck size={20} />
                  </div>
                  <div className="mgmt-kpi-info" style={{ minWidth: 0 }}>
                    <span className="mgmt-kpi-label-text">Total Amount Paid</span>
                    <h3 className="mgmt-kpi-value" style={{ color: '#10b981', margin: '3px 0 0', fontSize: '1.45rem' }}>
                      ₹{Number(filteredReferrerReportSummary.totalAmountPaid).toLocaleString('en-IN')}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Disbursed to referrers</span>
                  </div>
                </div>
              </div>

              {/* ── 6. Search and Filters Toolbar ── */}
              <form onSubmit={handleApplyRefFilters} className="mgmt-filter-bar" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
                  {/* Search input with instant real-time filtering */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Search by Referrer or Candidate
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        className="mgmt-form-input"
                        placeholder="Search Referrer Name, Referrer ID, Candidate Name, Candidate ID..."
                        value={refSearch}
                        onChange={(e) => {
                          setRefSearch(e.target.value);
                          setRefCurrentPage(1);
                        }}
                        style={{ paddingLeft: '32px', width: '100%', fontSize: '0.84rem' }}
                      />
                    </div>
                  </div>

                  {/* Date Range: From */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Registration From
                    </label>
                    <input
                      type="date"
                      className="mgmt-form-input"
                      value={refStartDate}
                      onChange={(e) => {
                        setRefStartDate(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    />
                  </div>

                  {/* Date Range: To */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Registration To
                    </label>
                    <input
                      type="date"
                      className="mgmt-form-input"
                      value={refEndDate}
                      onChange={(e) => {
                        setRefEndDate(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    />
                  </div>

                  {/* Referrer Dropdown */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Referrer Name
                    </label>
                    <select
                      className="mgmt-form-select"
                      value={refReferrerFilter}
                      onChange={(e) => {
                        setRefReferrerFilter(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    >
                      <option value="All">All Referrers</option>
                      {(reportReferrerOptions.length > 0 ? reportReferrerOptions : uniqueReferrers).map((r, i) => (
                        <option key={r.id || r.name || i} value={r.id || r.name}>
                          {r.name} ({r.empId})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Candidate Status Dropdown */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Candidate Status
                    </label>
                    <select
                      className="mgmt-form-select"
                      value={refStatusFilter}
                      onChange={(e) => {
                        setRefStatusFilter(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Submitted">Submitted</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Policy Issued">Policy Issued</option>
                      <option value="Approved">Approved</option>
                      <option value="Activated">Activated</option>
                      <option value="Joined">Joined</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  {/* Incentive Eligibility Dropdown */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Incentive Eligibility
                    </label>
                    <select
                      className="mgmt-form-select"
                      value={refEligibilityFilter}
                      onChange={(e) => {
                        setRefEligibilityFilter(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    >
                      <option value="All">All Eligibility</option>
                      <option value="Eligible">Eligible Only</option>
                      <option value="Not Eligible">Not Eligible</option>
                    </select>
                  </div>

                  {/* Payment Status Dropdown */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Payment Status
                    </label>
                    <select
                      className="mgmt-form-select"
                      value={refPaymentStatusFilter}
                      onChange={(e) => {
                        setRefPaymentStatusFilter(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    >
                      <option value="All">All Payment Statuses</option>
                      <option value="Paid">Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  {/* Department Filter */}
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                      Department
                    </label>
                    <select
                      className="mgmt-form-select"
                      value={refDepartmentFilter}
                      onChange={(e) => {
                        setRefDepartmentFilter(e.target.value);
                        setRefCurrentPage(1);
                      }}
                      style={{ width: '100%', fontSize: '0.84rem' }}
                    >
                      <option value="All">All Departments</option>
                      {(reportDepartmentOptions.length > 0 ? reportDepartmentOptions : uniqueDepartments).map((dept, i) => (
                        <option key={dept || i} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="submit"
                      className="mgmt-btn-primary"
                      style={{ flex: 1, padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <Filter size={14} /> Apply Filters
                    </button>
                    <button
                      type="button"
                      className="mgmt-btn-secondary"
                      onClick={handleResetRefFilters}
                      style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                    >
                      <RotateCcw size={14} /> Reset
                    </button>
                  </div>
                </div>
              </form>

              {/* ── 3. Referrer-Wise Summary Table ── */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table className="mgmt-table" style={{ width: '100%', minWidth: '1220px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '220px' }}>Referrer Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '130px' }}>Referrer ID</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '130px' }}>Total Candidates</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '150px' }}>Eligible Candidates</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '160px' }}>Incentive Per Candidate</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '140px' }}>Total Incentive</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '130px' }}>Amount Paid</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '130px' }}>Pending Amount</th>
                        <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155', fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '130px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrerReportLoading ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block', color: '#2563eb' }} />
                            Calculating real-time referrer groupings and eligible incentive balances...
                          </td>
                        </tr>
                      ) : filteredReferrerReportData.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                            <Users size={36} style={{ margin: '0 auto 10px', color: '#94a3b8', display: 'block' }} />
                            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#1e293b' }}>No Referrer Records Found</div>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                              No candidate registrations match the selected search or filter criteria.
                            </div>
                            <button
                              type="button"
                              className="mgmt-btn-secondary"
                              onClick={handleResetRefFilters}
                              style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <RotateCcw size={14} /> Clear All Filters
                            </button>
                          </td>
                        </tr>
                      ) : (
                        filteredReferrerReportData
                          .slice((refCurrentPage - 1) * refItemsPerPage, refCurrentPage * refItemsPerPage)
                          .map((row) => (
                            <tr key={row.referrerKey || row.referrerId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {/* 1. Referrer Name with Avatar and Role */}
                              <td style={{ padding: '14px 16px', minWidth: '220px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.86rem',
                                    flexShrink: 0,
                                  }}>
                                    {(row.referrerName || 'R').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.94rem' }}>
                                      {row.referrerName}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.referrerRole}</span>
                                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>•</span>
                                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.referrerDepartment}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Referrer ID badge with copy */}
                              <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                <span
                                  onClick={() => handleCopy(row.referrerId, row.referrerId)}
                                  style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.78rem',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #bfdbfe',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                  title="Click to copy employee ID"
                                >
                                  {row.referrerId}
                                  {copiedId === row.referrerId ? <Check size={12} color="#059669" /> : <Copy size={12} color="#60a5fa" />}
                                </span>
                              </td>

                              {/* 3. Total Candidates */}
                              <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  display: 'inline-block',
                                  minWidth: '28px',
                                  padding: '3px 8px',
                                  background: '#f1f5f9',
                                  color: '#0f172a',
                                  borderRadius: '12px',
                                  fontWeight: 800,
                                  fontSize: '0.86rem',
                                }}>
                                  {row.totalCandidates}
                                </span>
                              </td>

                              {/* 4. Eligible Candidates */}
                              <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  background: row.eligibleCandidates > 0 ? '#ecfdf5' : '#f8fafc',
                                  color: row.eligibleCandidates > 0 ? '#059669' : '#94a3b8',
                                  border: `1px solid ${row.eligibleCandidates > 0 ? '#a7f3d0' : '#e2e8f0'}`,
                                  borderRadius: '12px',
                                  fontWeight: 800,
                                  fontSize: '0.82rem',
                                }}>
                                  {row.eligibleCandidates} Eligible
                                </span>
                              </td>

                              {/* 5. Incentive Per Candidate */}
                              <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: '#334155', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                ₹{Number(row.incentivePerCandidate || 750).toLocaleString('en-IN')}
                              </td>

                              {/* 6. Total Incentive */}
                              <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.94rem' }}>
                                  ₹{Number(row.totalIncentive).toLocaleString('en-IN')}
                                </span>
                              </td>

                              {/* 7. Amount Paid */}
                              <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.94rem' }}>
                                  ₹{Number(row.amountPaid).toLocaleString('en-IN')}
                                </span>
                              </td>

                              {/* 8. Pending Amount */}
                              <td style={{ padding: '14px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  fontWeight: 800,
                                  color: row.pendingAmount > 0 ? '#ea580c' : '#059669',
                                  fontSize: '0.94rem',
                                }}>
                                  ₹{Number(row.pendingAmount).toLocaleString('en-IN')}
                                </span>
                              </td>

                              {/* 9. Action: View Details */}
                              <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  className="ref-btn-sm ref-btn-view"
                                  onClick={() => handleOpenCandidateHistory(row)}
                                  style={{
                                    background: 'linear-gradient(135deg, #1e40af, #2563eb)',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                                  }}
                                >
                                  <Eye size={14} /> View Details
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {filteredReferrerReportData.length > refItemsPerPage && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Showing {(refCurrentPage - 1) * refItemsPerPage + 1} to {Math.min(refCurrentPage * refItemsPerPage, filteredReferrerReportData.length)} of {filteredReferrerReportData.length} unique referrers
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => setRefCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={refCurrentPage === 1}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        onClick={() => setRefCurrentPage(p => Math.min(p + 1, Math.ceil(filteredReferrerReportData.length / refItemsPerPage)))}
                        disabled={refCurrentPage >= Math.ceil(filteredReferrerReportData.length / refItemsPerPage)}
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

          {/* ── TAB 1: OVERVIEW DASHBOARD ── */}
          {activeTab === 'overview' && (
            <div>
              {/* 8 Real-Time KPI Summary Cards: Balanced Responsive Grid */}
              <div className="ref-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '1.5rem' }}>
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
              <div style={{ marginBottom: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>
                  Category-Wise Referral Performance & Pipeline
                </h3>
                <div className="ref-cat-summary-grid">
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
                        className="ref-cat-card"
                        style={{
                          border: `1px solid ${cat.border}`,
                        }}
                      >
                        <div className="ref-cat-card-header">
                          <div className="ref-cat-title-wrap">
                            <span className="ref-cat-icon-badge" style={{ background: cat.bg, color: cat.color }}>
                              <IconComp size={16} />
                            </span>
                            <span className="ref-cat-label-text">{cat.label}</span>
                          </div>
                          <button
                            type="button"
                            className="ref-cat-report-btn"
                            onClick={() => {
                              setActiveTab(cat.tab);
                              setCategoryFilter(cat.key);
                            }}
                            style={{
                              background: cat.bg,
                              border: `1px solid ${cat.border}`,
                              color: cat.color,
                            }}
                          >
                            <span>View Report</span> <span>→</span>
                          </button>
                        </div>

                        <div className="ref-cat-stats-row">
                          <div className="ref-stat-box">
                            <div className="ref-stat-label">Total</div>
                            <div className="ref-stat-val" style={{ color: '#0f172a' }}>{total}</div>
                          </div>
                          <div className="ref-stat-box">
                            <div className="ref-stat-label" style={{ color: '#3b82f6' }}>Submitted</div>
                            <div className="ref-stat-val" style={{ color: '#3b82f6' }}>{submitted}</div>
                          </div>
                          <div className="ref-stat-box">
                            <div className="ref-stat-label" style={{ color: '#059669' }}>Approved</div>
                            <div className="ref-stat-val" style={{ color: '#059669' }}>{approved}</div>
                          </div>
                          <div className="ref-stat-box">
                            <div className="ref-stat-label" style={{ color: '#dc2626' }}>Rejected</div>
                            <div className="ref-stat-val" style={{ color: '#dc2626' }}>{rejected}</div>
                          </div>
                        </div>

                        {/* Dedicated 3-box mini status bar: Zero collision, crystal clear */}
                        <div className="ref-cat-finance-row">
                          <div className="ref-finance-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div className="ref-finance-label" style={{ color: '#64748b' }}>Eligible</div>
                            <div className="ref-finance-val" style={{ color: cat.color }}>₹{eligible.toLocaleString()}</div>
                          </div>
                          <div className="ref-finance-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <div className="ref-finance-label" style={{ color: '#15803d' }}>Paid</div>
                            <div className="ref-finance-val" style={{ color: '#15803d' }}>₹{paid.toLocaleString()}</div>
                          </div>
                          <div className="ref-finance-box" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                            <div className="ref-finance-label" style={{ color: '#c2410c' }}>Pending</div>
                            <div className="ref-finance-val" style={{ color: '#ea580c' }}>₹{pending.toLocaleString()}</div>
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

                  <div className="ref-overview-filters-wrap">
                    <div className="ref-overview-search-wrap">
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                      <input
                        type="text"
                        placeholder="Search candidate, code, referrer..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ref-search-input"
                        style={{ fontSize: '0.8rem', padding: '6px 10px 6px 30px' }}
                      />
                    </div>

                    <div className="ref-overview-selects-grid">
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="ref-filter-select"
                        style={{ fontSize: '0.8rem' }}
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
                        className="ref-filter-select"
                        style={{ fontSize: '0.8rem' }}
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
                </div>

                {/* Mobile Table Scroll Hint */}
                <div className="ref-table-mobile-hint">
                  <span>⇄ Swipe table horizontally to view all columns & actions</span>
                </div>

                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div className="mgmt-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
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
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.submitterRole}</span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                                      {getEmployeeId(r)}
                                    </span>
                                  </div>
                                </td>

                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                  {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                                </td>

                                <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#1e40af' }}>
                                  {getPartnerAppDisplay(r) ? (
                                    <span style={{ background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #dbeafe', fontWeight: 700 }}>
                                      {getPartnerAppDisplay(r)}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                                      Pending Policy
                                    </span>
                                  )}
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
                                    {(r.incentiveStatus === 'Pending Approval' || (!['Approved', 'Paid'].includes(r.incentiveStatus) && ['Policy Issued', 'Approved', 'Activated', 'Account Opened', 'Joined'].includes(r.status))) && (
                                      <button
                                        type="button"
                                        className="ref-btn-sm"
                                        style={{ background: '#2563eb', color: '#ffffff', borderColor: '#1d4ed8', fontWeight: 700, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                        onClick={() => handleApproveReferralIncentive(r)}
                                        title={`Approve eligible incentive of ₹${r.incentiveAmount || 750}`}
                                      >
                                        <CheckCircle2 size={13} /> Approve
                                      </button>
                                    )}
                                    {r.incentiveStatus === 'Approved' && (
                                      <button
                                        className="ref-btn-sm"
                                        style={{ background: '#ecfdf5', color: '#059669', borderColor: '#10b981', fontWeight: 700 }}
                                        onClick={() => handlePayReferralIncentive(r)}
                                        title={`Pay approved incentive of ₹${r.incentiveAmount}`}
                                      >
                                        <DollarSign size={13} /> Pay ₹{r.incentiveAmount}
                                      </button>
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
                  <Plus size={16} /> <span>Register New Referral</span>
                </button>
              </div>

              {/* Comprehensive Search & Filter Toolbar */}
              <div className="ref-filter-toolbar">
                <div className="ref-filter-top-row">
                  <div className="ref-search-wrap">
                    <Search size={15} className="ref-search-icon" />
                    <input
                      type="text"
                      placeholder="Search referrer, employee ID, candidate, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ref-search-input"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="ref-search-clear"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="ref-filter-chips-grid">
                    <div className="ref-filter-field">
                      <span className="ref-filter-label">Status:</span>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="ref-filter-select"
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

                    <div className="ref-filter-field">
                      <span className="ref-filter-label">Incentive:</span>
                      <select
                        value={incentiveStatusFilter}
                        onChange={(e) => setIncentiveStatusFilter(e.target.value)}
                        className="ref-filter-select"
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

                    <div className="ref-filter-field">
                      <span className="ref-filter-label">Dept:</span>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="ref-filter-select"
                      >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="ref-filter-bottom-row">
                  <div className="ref-filter-dates-wrap">
                    <div className="ref-date-field">
                      <span className="ref-date-label"><Calendar size={13} /> From:</span>
                      <input
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="ref-date-input"
                      />
                    </div>
                    <div className="ref-date-field">
                      <span className="ref-date-label">To:</span>
                      <input
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        className="ref-date-input"
                      />
                    </div>
                    <div className="ref-filter-field ref-referrer-field">
                      <span className="ref-filter-label">Referrer:</span>
                      <select
                        value={referrerFilter}
                        onChange={(e) => setReferrerFilter(e.target.value)}
                        className="ref-filter-select"
                      >
                        <option value="All">All Referrers</option>
                        {uniqueReferrers.map(u => (
                          <option key={u.id || u.name} value={u.id || u.name}>{u.name} ({u.empId || 'Emp'})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="ref-filter-actions">
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mgmt-btn-secondary ref-action-btn"
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
                      className="mgmt-btn-secondary ref-action-btn"
                    >
                      <Download size={13} /> Export Report
                    </a>
                  </div>
                </div>
              </div>

              {/* Mobile Table Scroll Hint */}
              <div className="ref-table-mobile-hint">
                <span>⇄ Swipe table horizontally to view all columns & actions</span>
              </div>

              {/* Data Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y' }}>
                  <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '150px' }}>Referral ID</th>
                        <th style={{ minWidth: '190px' }}>Referrer Profile</th>
                        <th style={{ minWidth: '180px' }}>Candidate / Applicant</th>
                        <th style={{ minWidth: '180px' }}>
                          {activeTab === 'insurance' && 'Partner & Plan'}
                          {activeTab === 'creditcard' && 'Bank & Card Product'}
                          {activeTab === 'bank' && 'Bank & Account Type'}
                          {activeTab === 'job' && 'Job Role & Company'}
                        </th>
                        <th style={{ minWidth: '160px' }}>
                          {activeTab === 'insurance' && 'Policy Number'}
                          {activeTab === 'creditcard' && 'Application Ref #'}
                          {activeTab === 'bank' && 'Masked A/C Number'}
                          {activeTab === 'job' && 'Job / Offer Ref #'}
                        </th>
                        <th style={{ minWidth: '120px' }}>Referral Date</th>
                        <th style={{ minWidth: '130px' }}>Pipeline Status</th>
                        <th style={{ minWidth: '140px' }}>Incentive Reward</th>
                        <th style={{ minWidth: '190px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReferrals.length === 0 ? (
                        <tr>
                          <td colSpan={9}>
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
                            const partnerApp = getPartnerAppDisplay(r);
                            const offering = getOfferingDisplay(r);
                            const empId = getEmployeeId(r);

                            const standardRate =
                              rules.find(ru => ru.category === r.category)?.amount ||
                              (r.category === 'Credit Card' ? 1000 : r.category === 'Insurance' ? 750 : r.category === 'Job' ? 2500 : 500);

                            return (
                              <tr key={r._id}>
                                {/* 1. Referral ID */}
                                <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e3a8a', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                                {/* 2. Referrer Profile (Name, Role, and REAL Employee ID) */}
                                <td>
                                  <div>
                                    <span
                                      onClick={() => handleOpenReferrer(r.submittedBy)}
                                      style={{ fontWeight: 700, color: '#2563eb', cursor: 'pointer', textDecoration: 'underline' }}
                                      title="Click to view detailed individual referrer audit report"
                                    >
                                      {r.submitterName}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600, background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                                      {r.submitterRole || 'Staff'}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                                      {empId}
                                    </span>
                                  </div>
                                </td>

                                {/* 3. Candidate / Applicant */}
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                  {candPhone && (
                                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                                      📞 {candPhone}
                                    </div>
                                  )}
                                </td>

                                {/* 4. Offering & Plan */}
                                <td>
                                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>{offering.title}</div>
                                  <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>{offering.sub}</div>
                                  {offering.extra && (
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{offering.extra}</div>
                                  )}
                                </td>

                                {/* 5. Policy Number / Partner App Ref */}
                                <td>
                                  {partnerApp ? (
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #dbeafe', fontSize: '0.78rem' }}>
                                      {partnerApp}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                                      Pending Policy Issuance
                                    </span>
                                  )}
                                </td>

                                {/* 6. Referral Date */}
                                <td style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                  {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>

                                {/* 7. Pipeline Status */}
                                <td>
                                  <span className={`ref-badge ${getStatusBadgeClass(r.status)}`}>
                                    {r.status}
                                  </span>
                                </td>

                                {/* 8. Incentive Reward */}
                                <td>
                                  <div>
                                    {r.incentiveEligible ? (
                                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                                        ₹{r.incentiveAmount}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '0.76rem' }}>
                                        ₹{standardRate} (Pending)
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ marginTop: '3px' }}>
                                    <span className={`ref-badge ${
                                      r.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                                      r.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                                      r.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                                      'ref-badge-submitted'
                                    }`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                                      {r.incentiveStatus || 'None'}
                                    </span>
                                  </div>
                                </td>

                                {/* 9. Actions */}
                                <td style={{ textAlign: 'center' }}>
                                  <div className="ref-action-cell" style={{ justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      className="ref-btn-sm ref-btn-view"
                                      onClick={() => handleViewDetails(r)}
                                      title="View Complete Top-to-Bottom Dossier"
                                    >
                                      <Eye size={13} /> Details
                                    </button>
                                    <button
                                      type="button"
                                      className="ref-btn-sm ref-btn-review"
                                      onClick={() => handleOpenReview(r)}
                                      title="Review Application & Policy"
                                    >
                                      <Edit3 size={13} /> Review
                                    </button>
                                    {(r.incentiveStatus === 'Pending Approval' || (!['Approved', 'Paid'].includes(r.incentiveStatus) && ['Policy Issued', 'Approved', 'Activated', 'Account Opened', 'Joined'].includes(r.status))) && (
                                      <button
                                        type="button"
                                        className="ref-btn-sm"
                                        style={{ background: '#2563eb', color: '#ffffff', borderColor: '#1d4ed8', fontWeight: 700, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '3px', boxShadow: '0 1px 2px rgba(37,99,235,0.2)' }}
                                        onClick={() => handleApproveReferralIncentive(r)}
                                        title={`Approve eligible incentive of ₹${r.incentiveAmount || 750}`}
                                      >
                                        <CheckCircle2 size={13} /> Approve
                                      </button>
                                    )}
                                    {r.incentiveStatus === 'Approved' && (
                                      <button
                                        type="button"
                                        className="ref-btn-sm"
                                        style={{ background: '#059669', color: '#ffffff', borderColor: '#047857', fontWeight: 700, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                        onClick={() => handlePayReferralIncentive(r)}
                                        title={`Pay approved incentive of ₹${r.incentiveAmount}`}
                                      >
                                        <DollarSign size={13} /> Pay ₹{r.incentiveAmount}
                                      </button>
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
                                      <button
                                        className="ref-btn-sm"
                                        style={{ background: '#ecfdf5', color: '#059669', borderColor: '#10b981', fontWeight: 700 }}
                                        onClick={() => handlePaySingleIncentive(inc)}
                                        title={`Pay approved incentive of ₹${inc.amount}`}
                                      >
                                        <DollarSign size={13} /> Pay Amount (₹{inc.amount})
                                      </button>
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
                  <Plus size={16} /> <span>Add Incentive Rule</span>
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

      {/* ── MODAL 1: COMPLETE TOP-TO-BOTTOM REFERRAL DOSSIER & AUDIT ── */}
      {showDetailModal && selectedReferral && renderPortalModal(
        <div className="ref-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="ref-modal-card" style={{ maxWidth: '880px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="ref-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 20px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Referral Dossier: <span style={{ fontFamily: 'monospace', color: '#1e3a8a' }}>{selectedReferral.referralCode}</span>
                </span>
                <button
                  type="button"
                  className={`ref-copy-btn ${copiedId === selectedReferral._id ? 'copied' : ''}`}
                  onClick={() => handleCopy(selectedReferral.referralCode, selectedReferral._id)}
                  title="Copy Referral Code"
                >
                  {copiedId === selectedReferral._id ? <Check size={12} /> : <Copy size={12} />}
                </button>
                <span className={`ref-cat-tag ref-cat-${selectedReferral.category?.toLowerCase().replace(/\s+/g, '')}`} style={{ fontSize: '0.72rem' }}>
                  {selectedReferral.category}
                </span>
                <span className={`ref-badge ${getStatusBadgeClass(selectedReferral.status)}`} style={{ fontSize: '0.74rem' }}>
                  {selectedReferral.status}
                </span>
                <span className={`ref-badge ${
                  selectedReferral.incentiveStatus === 'Paid' ? 'ref-badge-success' :
                  selectedReferral.incentiveStatus === 'Approved' ? 'ref-badge-progress' :
                  selectedReferral.incentiveStatus === 'Pending Approval' ? 'ref-badge-under-review' :
                  'ref-badge-submitted'
                }`} style={{ fontSize: '0.74rem' }}>
                  Incentive: {selectedReferral.incentiveStatus || 'None'}
                </span>
              </div>
              <button className="ref-modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            {/* Modal Body */}
            <div className="ref-modal-body" style={{ padding: '20px', overflowY: 'auto', maxHeight: '76vh' }}>
              {/* Top: Interactive Visual Stepper Pipeline */}
              <div style={{ marginBottom: '1.5rem', background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                  Verification & Settlement Pipeline
                </div>
                {renderPipelineStepper(selectedReferral)}
              </div>

              {/* Grid 1: Referrer Institutional Identity & Candidate Profile */}
              <div className="ref-dossier-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '1.25rem' }}>
                {/* 1. Referrer Institutional Profile */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={16} style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Referrer Institutional Profile</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '4px' }}>
                      ID: {getEmployeeId(selectedReferral)}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Full Name</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReferral.submitterName || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Institutional Role</div>
                      <div style={{ fontWeight: 600, color: '#1e40af' }}>{selectedReferral.submitterRole || selectedReferral.submittedBy?.role || 'Staff'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Department</div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReferral.submitterDepartment || selectedReferral.submittedBy?.department || 'General'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Employee / Faculty ID</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1d4ed8' }}>{getEmployeeId(selectedReferral)}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Official Email</div>
                      <div style={{ color: '#0f172a', wordBreak: 'break-all' }}>{selectedReferral.submittedBy?.email || 'referrals@institution.edu'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Referral Registered On</div>
                      <div style={{ color: '#475569', fontWeight: 600 }}>
                        {new Date(selectedReferral.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Candidate / Applicant Profile */}
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={16} style={{ color: '#059669' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>Candidate / Applicant Profile</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      Lead Verified
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Applicant Name</div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                        {selectedReferral.insuranceDetails?.applicantName ||
                         selectedReferral.creditCardDetails?.applicantName ||
                         selectedReferral.bankAccountDetails?.applicantName ||
                         selectedReferral.jobDetails?.candidateName ||
                         'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Primary Phone Number</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#047857' }}>
                        📞 {selectedReferral.insuranceDetails?.applicantPhone ||
                            selectedReferral.creditCardDetails?.applicantPhone ||
                            selectedReferral.bankAccountDetails?.applicantPhone ||
                            selectedReferral.jobDetails?.candidatePhone ||
                            'N/A'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Email Address</div>
                      <div style={{ color: '#0f172a', wordBreak: 'break-all' }}>
                        {selectedReferral.insuranceDetails?.applicantEmail ||
                         selectedReferral.creditCardDetails?.applicantEmail ||
                         selectedReferral.bankAccountDetails?.applicantEmail ||
                         selectedReferral.jobDetails?.candidateEmail ||
                         'Not provided'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>City / Location</div>
                      <div style={{ color: '#0f172a' }}>
                        {selectedReferral.insuranceDetails?.applicantCity ||
                         selectedReferral.creditCardDetails?.city ||
                         selectedReferral.bankAccountDetails?.branchCity ||
                         'Tamil Nadu, India'}
                      </div>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Applicant Notes</div>
                      <div style={{ color: '#475569', fontStyle: 'italic', background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '2px' }}>
                        {selectedReferral.insuranceDetails?.notes ||
                         selectedReferral.creditCardDetails?.notes ||
                         selectedReferral.bankAccountDetails?.notes ||
                         selectedReferral.jobDetails?.notes ||
                         'Standard referral registration under institutional business partnership.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Institutional Offering & Partner Specifications */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} style={{ color: '#7c3aed' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedReferral.category} Partner & Policy Specifications
                    </span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Category Code: <strong>{selectedReferral.category?.toUpperCase()}</strong>
                  </span>
                </div>

                {/* Insurance Specifics */}
                {selectedReferral.category === 'Insurance' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Insurance Provider</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReferral.insuranceDetails?.provider || 'Tata AIG General Insurance'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Insurance Category / Type</div>
                      <div style={{ fontWeight: 600, color: '#2563eb' }}>{selectedReferral.insuranceDetails?.insuranceCategory || selectedReferral.insuranceDetails?.productType || 'Health Insurance'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Offering Plan</div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReferral.insuranceDetails?.selectedOffering || 'Tata AIG MediCare Comprehensive'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Sum Insured Tier</div>
                      <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem' }}>
                        {selectedReferral.insuranceDetails?.sumInsuredTier || `₹${(selectedReferral.insuranceDetails?.estimatedSumInsured || 500000).toLocaleString('en-IN')}`}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Partner Reference Number</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {selectedReferral.insuranceDetails?.partnerReferenceNumber || 'STAR-REF-90214'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Official Policy Number</div>
                      <div>
                        {selectedReferral.insuranceDetails?.policyNumber ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                            {selectedReferral.insuranceDetails.policyNumber}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', background: '#ffffff', padding: '3px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                            Pending Policy Verification & Issuance
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Credit Card Specifics */}
                {selectedReferral.category === 'Credit Card' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Issuing Partner Bank</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReferral.creditCardDetails?.bankName || 'HDFC Bank'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Credit Card Product</div>
                      <div style={{ fontWeight: 600, color: '#7c3aed' }}>{selectedReferral.creditCardDetails?.cardProduct || 'Millennia Credit Card'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Employment Classification</div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReferral.creditCardDetails?.employmentType || 'Salaried'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Declared Monthly Income</div>
                      <div style={{ fontWeight: 700, color: '#059669' }}>{selectedReferral.creditCardDetails?.monthlyIncome || '₹45,000+'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Partner Reference Number</div>
                      <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {selectedReferral.creditCardDetails?.partnerReferenceNumber || 'HDFC-CC-78214'}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Bank Application Number</div>
                      <div>
                        {selectedReferral.creditCardDetails?.applicationNumber ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                            {selectedReferral.creditCardDetails.applicationNumber}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', background: '#ffffff', padding: '3px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                            Pending Bank Application Evaluation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Account Specifics */}
                {selectedReferral.category === 'Bank Account' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Partner Bank</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReferral.bankAccountDetails?.bankName || 'HDFC Bank'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Account Product</div>
                      <div style={{ fontWeight: 600, color: '#059669' }}>{selectedReferral.bankAccountDetails?.accountProduct || selectedReferral.bankAccountDetails?.accountType || 'Zero-Balance Savings'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Customer Classification</div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReferral.bankAccountDetails?.applicantType || 'Student / Faculty'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>KYC Verification Mode</div>
                      <div style={{ fontWeight: 700, color: '#059669' }}>{selectedReferral.bankAccountDetails?.kycStatus || 'Video KYC Verified'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Masked Account Number</div>
                      <div>
                        {selectedReferral.bankAccountDetails?.accountNumberMasked ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                            {selectedReferral.bankAccountDetails.accountNumberMasked}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', background: '#ffffff', padding: '3px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                            Pending Account Allocation
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Job Specifics */}
                {selectedReferral.category === 'Job' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Hiring Organization</div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedReferral.jobDetails?.companyName || 'TCS'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Designation / Job Role</div>
                      <div style={{ fontWeight: 600, color: '#ea580c' }}>{selectedReferral.jobDetails?.jobRole || 'Full Stack Engineer'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Experience & Skills</div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedReferral.jobDetails?.experienceYears || '2 Years'} ({selectedReferral.jobDetails?.skills || 'React, Node.js'})</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Current Interview Stage</div>
                      <div style={{ fontWeight: 700, color: '#2563eb' }}>{selectedReferral.jobDetails?.currentInterviewStage || 'Screening'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Job Requisition ID / Offer Ref</div>
                      <div>
                        {selectedReferral.jobDetails?.jobReferenceId ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px', border: '1px solid #bfdbfe' }}>
                            {selectedReferral.jobDetails.jobReferenceId}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', background: '#ffffff', padding: '3px 8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                            Pending Interview Offer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Compliance & Consent Verification */}
              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '10px', border: '1px solid #bbf7d0', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                  <CheckCheck size={16} />
                  <span>
                    <strong>Compliance Verified:</strong> Explicit digital consent captured under Consent Policy{' '}
                    <code>{selectedReferral.insuranceDetails?.consentNoticeVersion || selectedReferral.creditCardDetails?.consentNoticeVersion || 'v1.2-FIC-CONSENT'}</code>.
                  </span>
                </div>
                <span style={{ color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>DPDP Act 2023 Compliant ✔</span>
              </div>

              {/* Section 5: Incentive Ledger & Financial Settlement */}
              <div style={{ background: '#f0fdf4', borderRadius: '12px', border: '1px solid #86efac', padding: '16px 20px', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px dashed #bbf7d0', paddingBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Institutional Incentive Settlement Ledger
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#14532d', marginTop: '2px' }}>
                      Settlement Status:{' '}
                      <strong style={{ color: selectedReferral.incentiveStatus === 'Paid' ? '#059669' : selectedReferral.incentiveStatus === 'Approved' ? '#2563eb' : '#d97706' }}>
                        {selectedReferral.incentiveStatus || 'Under Review'}
                      </strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#166534' }}>Verified Eligible Incentive</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669' }}>
                      {selectedReferral.incentiveAmount > 0 ? `₹${selectedReferral.incentiveAmount}` : '₹750 (Rule Configured)'}
                    </div>
                  </div>
                </div>

                {/* Direct Approve Action if Pending Approval */}
                {(selectedReferral.incentiveStatus === 'Pending Approval' || (!['Approved', 'Paid'].includes(selectedReferral.incentiveStatus) && ['Policy Issued', 'Approved', 'Activated', 'Account Opened', 'Joined'].includes(selectedReferral.status))) && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#1e40af' }}>
                      ⏳ <strong>Awaiting Authorization:</strong> Referral milestone is verified. Incentive reward qualifies for administrator approval.
                    </div>
                    <button
                      type="button"
                      className="ref-btn-primary"
                      style={{ background: '#2563eb', borderColor: '#1d4ed8', fontSize: '0.84rem', padding: '6px 16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        setShowDetailModal(false);
                        handleApproveReferralIncentive(selectedReferral);
                      }}
                    >
                      <CheckCircle2 size={15} /> Approve Incentive (₹{selectedReferral.incentiveAmount || 750})
                    </button>
                  </div>
                )}

                {/* Direct Payout Action if Approved */}
                {selectedReferral.incentiveStatus === 'Approved' && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#166534' }}>
                      ✓ <strong>Authorized for Immediate Disbursement:</strong> Reward has been approved by administrator.
                    </div>
                    <button
                      type="button"
                      className="ref-btn-primary"
                      style={{ background: '#059669', borderColor: '#047857', fontSize: '0.84rem', padding: '6px 16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        setShowDetailModal(false);
                        handlePayReferralIncentive(selectedReferral);
                      }}
                    >
                      <DollarSign size={15} /> Disburse Payout (₹{selectedReferral.incentiveAmount})
                    </button>
                  </div>
                )}

                {selectedReferral.incentiveStatus === 'Paid' && (
                  <div style={{ marginTop: '12px', fontSize: '0.82rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Payout Settled & Disbursed to Referrer. Receipt / UTR audit trail attached.
                  </div>
                )}
              </div>

              {/* Section 6: Lifecycle Status Timeline */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                  Lifecycle Status History
                </h4>
                <div className="ref-timeline">
                  {(selectedReferral.statusHistory || []).map((h, i) => (
                    <div key={i} className="ref-timeline-item">
                      <div className="ref-timeline-dot">✓</div>
                      <div className="ref-timeline-content">
                        <div className="ref-timeline-status" style={{ fontWeight: 700, color: '#1e3a8a' }}>{h.status}</div>
                        <div className="ref-timeline-meta" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Updated by <strong>{h.updatedBy || 'Administrator'}</strong> ({h.role || 'Admin'}) on {new Date(h.timestamp).toLocaleString('en-IN')}
                        </div>
                        {h.remarks && (
                          <div className="ref-timeline-remarks" style={{ marginTop: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', borderLeft: '3px solid #2563eb' }}>
                            {h.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 7: Security & Audit Trail */}
              {referralAuditLogs.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                    Security & Governance Audit Trail
                  </h4>
                  <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '140px', overflowY: 'auto', fontSize: '0.76rem' }}>
                    {referralAuditLogs.map((log) => (
                      <div key={log._id} style={{ marginBottom: '6px', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#2563eb' }}>[{log.action}]</span> {log.details} - by <strong>{log.performedByName}</strong> at {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="ref-modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="ref-btn-sm ref-btn-review"
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenReview(selectedReferral);
                  }}
                >
                  <Edit3 size={14} /> Review & Issue Policy
                </button>
                {(selectedReferral.incentiveStatus === 'Pending Approval' || (!['Approved', 'Paid'].includes(selectedReferral.incentiveStatus) && ['Policy Issued', 'Approved', 'Activated', 'Account Opened', 'Joined'].includes(selectedReferral.status))) && (
                  <button
                    type="button"
                    className="ref-btn-sm"
                    style={{ background: '#2563eb', color: '#ffffff', borderColor: '#1d4ed8', fontWeight: 700, padding: '6px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => {
                      setShowDetailModal(false);
                      handleApproveReferralIncentive(selectedReferral);
                    }}
                  >
                    <CheckCircle2 size={14} /> Approve Incentive (₹{selectedReferral.incentiveAmount || 750})
                  </button>
                )}
                {selectedReferral.incentiveStatus === 'Approved' && (
                  <button
                    type="button"
                    className="ref-btn-sm"
                    style={{ background: '#059669', color: '#ffffff', borderColor: '#047857', fontWeight: 700, padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => {
                      setShowDetailModal(false);
                      handlePayReferralIncentive(selectedReferral);
                    }}
                  >
                    <DollarSign size={14} /> Disburse Payout (₹{selectedReferral.incentiveAmount})
                  </button>
                )}
              </div>
              <button
                type="button"
                className="ref-btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REVIEW / UPDATE STATUS (CATEGORY-TAILORED FLOW) ── */}
      {showReviewModal && reviewingReferral && renderPortalModal(
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
                {/* Pending Incentive Approval Quick-Action Banner */}
                {(reviewingReferral.incentiveStatus === 'Pending Approval' || (!['Approved', 'Paid'].includes(reviewingReferral.incentiveStatus) && ['Policy Issued', 'Approved', 'Activated', 'Account Opened', 'Joined'].includes(reviewingReferral.status))) && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#1e40af' }}>
                      <strong>Incentive Pending Approval:</strong> ₹{reviewingReferral.incentiveAmount || 750} reward qualifies for authorization.
                    </div>
                    <button
                      type="button"
                      className="ref-btn-primary"
                      style={{ background: '#2563eb', borderColor: '#1d4ed8', fontSize: '0.78rem', padding: '5px 12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        setShowReviewModal(false);
                        handleApproveReferralIncentive(reviewingReferral);
                      }}
                    >
                      <CheckCircle2 size={13} /> Approve Incentive (₹{reviewingReferral.incentiveAmount || 750})
                    </button>
                  </div>
                )}

                {/* Approved Incentive Payout Quick-Action Banner */}
                {reviewingReferral.incentiveStatus === 'Approved' && (
                  <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#065f46' }}>
                      <strong>Incentive Approved:</strong> ₹{reviewingReferral.incentiveAmount} is approved and awaiting disbursement.
                    </div>
                    <button
                      type="button"
                      className="ref-btn-primary"
                      style={{ background: '#059669', borderColor: '#059669', fontSize: '0.78rem', padding: '5px 12px' }}
                      onClick={() => {
                        setShowReviewModal(false);
                        handlePayReferralIncentive(reviewingReferral);
                      }}
                    >
                      <DollarSign size={13} /> Pay Incentive (₹{reviewingReferral.incentiveAmount})
                    </button>
                  </div>
                )}
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
      {showRuleModal && renderPortalModal(
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
      {showPayoutModal && renderPortalModal(
        <div className="ref-modal-overlay" onClick={() => { setShowPayoutModal(false); setPayoutTargetReferral(null); }}>
          <div className="ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">Process Incentive Disbursements</div>
              <button className="ref-modal-close" onClick={() => { setShowPayoutModal(false); setPayoutTargetReferral(null); }}>✕</button>
            </div>
            <form onSubmit={handleConfirmPayout}>
              <div className="ref-modal-body">
                {payoutTargetReferral ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', marginBottom: '1rem', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 700 }}>PAYOUT TARGET RECORD</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 700, minWidth: 0, flex: '1 1 auto', wordBreak: 'break-word' }}>
                        {payoutTargetReferral.submitterName} ({payoutTargetReferral.category})
                      </span>
                      <span style={{ fontSize: '1.25rem', color: '#059669', fontWeight: 900, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        ₹{payoutTargetReferral.incentiveAmount}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', wordBreak: 'break-all' }}>
                      Referral Code: <strong>{payoutTargetReferral.referralCode}</strong>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '1rem' }}>
                    You are disbursing <strong>{selectedIncentivesForPayout.length} approved incentives</strong>.
                  </p>
                )}

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
      {showReversalModal && reversingIncentive && renderPortalModal(
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
      {showSubmitModal && renderPortalModal(
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

      {/* ── REFERRER CANDIDATE HISTORY VIEW DETAILS MODAL ── */}
      {showCandidateHistoryModal && detailReferrer && renderPortalModal(
        <div className="mgmt-modal-overlay" style={{ zIndex: 1200 }}>
          <div
            className="mgmt-modal-card"
            style={{
              maxWidth: '1150px',
              width: '96%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                  }}
                >
                  {(detailReferrer.referrerName || 'R').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.28rem', fontWeight: 800 }}>
                      Referrer History: {detailReferrer.referrerName}
                    </h2>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.76rem',
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      {detailReferrer.referrerId}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: '2px' }}>
                    {detailReferrer.referrerRole} • Department: {detailReferrer.referrerDepartment} {detailReferrer.referrerEmail ? `• ${detailReferrer.referrerEmail}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCandidateHistoryModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {/* Top Referrer Complete Summary Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Candidates</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{detailReferrer.totalCandidates}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{detailReferrer.eligibleCandidates} eligible for incentives</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Incentive Earned</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>₹{Number(detailReferrer.totalIncentive).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.72rem', color: '#1e40af' }}>{detailReferrer.eligibleCandidates} × ₹{detailReferrer.incentivePerCandidate || 750}</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Amount Paid</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>₹{Number(detailReferrer.amountPaid).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '0.72rem', color: '#059669' }}>Disbursed payouts</div>
                </div>

                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Amount</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: detailReferrer.pendingAmount > 0 ? '#ea580c' : '#059669', marginTop: '2px' }}>
                    ₹{Number(detailReferrer.pendingAmount).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Remaining balance</div>
                </div>
              </div>

              {/* Candidates Table Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  Registered Candidates Linked to {detailReferrer.referrerName} ({detailReferrer.candidates?.length || 0})
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  All financial disbursements and pending amounts trace to individual candidate records.
                </div>
              </div>

              {/* Table of Candidates */}
              <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                  <table className="mgmt-table" style={{ width: '100%', minWidth: '1250px', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '120px' }}>Candidate ID</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '160px' }}>Candidate Name</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '160px' }}>Category / Offering</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '130px' }}>Registration Date</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '120px' }}>Status</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '120px' }}>Eligibility</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px' }}>Incentive</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '100px' }}>Paid</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '100px' }}>Pending</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '130px' }}>Payment Status</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', whiteSpace: 'nowrap', minWidth: '170px' }}>Payment Details / UTR</th>
                        <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#475569', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '130px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detailReferrer.candidates || []).map((cand) => (
                        <tr key={cand._id || cand.candidateId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Candidate ID */}
                          <td style={{ padding: '10px 14px' }}>
                            <span
                              onClick={() => handleCopy(cand.candidateId, cand.candidateId)}
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.76rem',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #bfdbfe',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              title="Click to copy candidate ID"
                            >
                              {cand.candidateId}
                              {copiedId === cand.candidateId ? <Check size={11} color="#059669" /> : <Copy size={11} color="#60a5fa" />}
                            </span>
                            {cand.candidateApplicationId && cand.candidateApplicationId !== cand.candidateId && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                                Ref: {cand.candidateApplicationId}
                              </div>
                            )}
                          </td>

                          {/* Candidate Name */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{cand.candidateName}</div>
                            {cand.candidatePhone && cand.candidatePhone !== 'N/A' && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{cand.candidatePhone}</div>
                            )}
                          </td>

                          {/* Category & Offering */}
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`ref-cat-tag ref-cat-${cand.category?.toLowerCase().replace(/\s+/g, '')}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                              {cand.category}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cand.offering}
                            </div>
                          </td>

                          {/* Registration Date */}
                          <td style={{ padding: '10px 14px', fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(cand.registrationDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>

                          {/* Application Status */}
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`ref-badge ${getStatusBadgeClass(cand.applicationStatus)}`} style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                              {cand.applicationStatus}
                            </span>
                          </td>

                          {/* Incentive Eligibility Status */}
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: cand.isEligible ? '#ecfdf5' : '#f8fafc',
                              color: cand.isEligible ? '#059669' : '#94a3b8',
                              border: `1px solid ${cand.isEligible ? '#a7f3d0' : '#e2e8f0'}`,
                            }}>
                              {cand.isEligible ? '✓ Eligible' : 'Ineligible'}
                            </span>
                          </td>

                          {/* Incentive Amount */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: cand.isEligible ? '#1e40af' : '#94a3b8', fontSize: '0.84rem' }}>
                            ₹{cand.incentiveAmount}
                          </td>

                          {/* Amount Paid */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: '#059669', fontSize: '0.84rem' }}>
                            ₹{cand.amountPaid}
                          </td>

                          {/* Pending Amount */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: cand.pendingAmount > 0 ? '#ea580c' : '#059669', fontSize: '0.84rem' }}>
                            ₹{cand.pendingAmount}
                          </td>

                          {/* Payment Status badge */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                cand.paymentStatus === 'Paid' ? '#ecfdf5' :
                                cand.paymentStatus === 'Partially Paid' ? '#fef3c7' :
                                cand.paymentStatus === 'Pending' ? '#eff6ff' : '#f1f5f9',
                              color:
                                cand.paymentStatus === 'Paid' ? '#047857' :
                                cand.paymentStatus === 'Partially Paid' ? '#b45309' :
                                cand.paymentStatus === 'Pending' ? '#1d4ed8' : '#64748b',
                              border: `1px solid ${
                                cand.paymentStatus === 'Paid' ? '#6ee7b7' :
                                cand.paymentStatus === 'Partially Paid' ? '#fcd34d' :
                                cand.paymentStatus === 'Pending' ? '#bfdbfe' : '#e2e8f0'
                              }`,
                            }}>
                              {cand.paymentStatus}
                            </span>
                          </td>

                          {/* Payment Details / UTR */}
                          <td style={{ padding: '10px 14px', fontSize: '0.74rem' }}>
                            {cand.paymentReferenceNumber ? (
                              <div>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                                  {cand.paymentReferenceNumber}
                                </span>
                                {cand.paymentDate && (
                                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                    Paid: {new Date(cand.paymentDate).toLocaleDateString('en-IN')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Pending Payment</span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {cand.isEligible && cand.pendingAmount > 0 ? (
                              <button
                                type="button"
                                className="ref-btn-sm"
                                onClick={() => handleOpenCandidatePayment(cand, detailReferrer)}
                                style={{
                                  background: '#059669',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: 700,
                                  fontSize: '0.74rem',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 1px 2px rgba(5,150,105,0.2)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <DollarSign size={13} /> Pay ₹{cand.pendingAmount}
                              </button>
                            ) : cand.isEligible && cand.pendingAmount === 0 ? (
                              <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <CheckCircle2 size={13} /> Fully Paid
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                Awaiting Milestone
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                All calculations update immediately upon registration, milestone verification, or payment confirmation.
              </div>
              <button
                type="button"
                className="mgmt-btn-secondary"
                onClick={() => setShowCandidateHistoryModal(false)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INCENTIVE PAYMENT MANAGEMENT MODAL (PARTIAL & FULL PAYMENT SUPPORT) ── */}
      {showIncentivePaymentModal && payingCandidate && renderPortalModal(
        <div className="mgmt-modal-overlay" style={{ zIndex: 1300 }}>
          <div
            className="mgmt-modal-card"
            style={{
              maxWidth: '560px',
              width: '95%',
              borderRadius: '16px',
              overflow: 'hidden',
              background: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800 }}>Disburse Incentive Payment</h3>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>Authorized Admin Payment Ledger</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIncentivePaymentModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#ffffff',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmIncentivePayment} style={{ padding: '20px' }}>
              {/* Target Candidate & Referrer Info Box */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Referrer Name:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{payingCandidate.referrerName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Candidate Name & ID:</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>{payingCandidate.candidateName} ({payingCandidate.candidateId})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Eligible Incentive</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1e40af' }}>₹{payingCandidate.incentiveAmount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Already Paid</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669' }}>₹{payingCandidate.amountPaid}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Pending Balance</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ea580c' }}>₹{payingCandidate.pendingAmount}</div>
                  </div>
                </div>
              </div>

              {/* Payment Amount Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Disbursement Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748b' }}>₹</span>
                  <input
                    type="number"
                    className="mgmt-form-input"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    min="1"
                    max={payingCandidate.pendingAmount}
                    required
                    style={{ paddingLeft: '28px', width: '100%', fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  {Number(paymentAmountInput) < payingCandidate.pendingAmount ? (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>
                      ⚠️ Partial Payment: Remaining balance of ₹{payingCandidate.pendingAmount - Number(paymentAmountInput)} will stay pending.
                    </span>
                  ) : (
                    <span style={{ color: '#059669', fontWeight: 600 }}>
                      ✓ Full Payment: Candidate incentive will be marked as fully Paid.
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Mode & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Payment Mode <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="mgmt-form-select"
                    value={paymentModeInput}
                    onChange={(e) => setPaymentModeInput(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="IMPS">IMPS Instant</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Cash">Cash Voucher</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Payment Date <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    className="mgmt-form-input"
                    value={paymentDateInput}
                    onChange={(e) => setPaymentDateInput(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              {/* Transaction Reference / UTR */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Transaction Reference Number / UTR <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="mgmt-form-input"
                  placeholder="e.g. UTR-9847291823 or CHQ-002145"
                  value={paymentTxnRefInput}
                  onChange={(e) => setPaymentTxnRefInput(e.target.value)}
                  required
                  style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* Payment Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Admin Notes & Remarks (Optional)
                </label>
                <input
                  type="text"
                  className="mgmt-form-input"
                  placeholder="e.g. Disbursed via ICICI Corporate Banking account"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  onClick={() => setShowIncentivePaymentModal(false)}
                  disabled={paymentSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="mgmt-btn-primary"
                  disabled={paymentSubmitting}
                  style={{
                    background: '#059669',
                    borderColor: '#047857',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{paymentSubmitting ? 'Recording Disbursement...' : 'Confirm & Disburse Payment'}</span>
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
