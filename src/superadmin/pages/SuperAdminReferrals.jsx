import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2, Award, DollarSign, TrendingUp, Users, CheckCircle2,
  Clock, ArrowRight, RefreshCw, Filter, Search, Globe, ChevronDown,
  Sparkles, X, Plus, Shield, CreditCard, Landmark, Briefcase, Eye,
  Play, Pause, AlertCircle, FileText, Download, Check, Edit, ChevronRight,
  Sliders, Layers
} from 'lucide-react';
import {
  getSuperAdminReferralOverview,
  getSuperAdminOpportunities,
  createOpportunity,
  updateOpportunity,
  updateOpportunityStatus,
  getOpportunityApplications,
  updateOpportunityApplicationStatus,
  getOpportunityExportCsvUrl
} from '../../api';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import AdminReferralManagement from '../../pages/referrals/AdminReferralManagement';
import FormBuilderEditor from '../../pages/referrals/FormBuilderEditor';
import DynamicFormRenderer from '../../pages/referrals/DynamicFormRenderer';
import '../../pages/referrals/AdminReferralManagement.css';
import './SuperAdminDashboard.css';

export default function SuperAdminReferrals() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialModule = searchParams.get('tab') === 'colleges' ? 'colleges' : 'Insurance';
  const [activeModule, setActiveModule] = useState(initialModule); // 'Insurance' | 'Credit Card' | 'Bank Account' | 'Job Referral' | 'colleges'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const renderPortalModal = (content) => {
    if (typeof document !== 'undefined') {
      return createPortal(content, document.body);
    }
    return content;
  };

  // Modal Tab navigation
  const [oppModalTab, setOppModalTab] = useState('details'); // 'details' | 'benefits' | 'form' | 'incentives'

  // Multi-tenant & Overview
  const [overviewData, setOverviewData] = useState(null);
  const [selectedCollegeId, setSelectedCollegeId] = useState('ALL');
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'colleges') {
      setActiveModule('colleges');
    } else if (tab && ['Insurance', 'Credit Card', 'Bank Account', 'Job Referral'].includes(tab)) {
      setActiveModule(tab);
    }
  }, [searchParams]);

  const handleSwitchModule = (mod) => {
    setActiveModule(mod);
    setSubCategoryFilter('All');
    if (mod === 'colleges') {
      setSearchParams({ tab: 'colleges' });
    } else {
      setSearchParams({ tab: mod });
    }
  };

  // Opportunities State
  const [opportunities, setOpportunities] = useState([]);
  const [oppCounts, setOppCounts] = useState({ insurance: 0, creditCard: 0, bankAccount: 0, jobReferral: 0, totalPublished: 0, totalDrafts: 0 });
  const [subCategoryFilter, setSubCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create / Edit Opportunity Modal
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState(null);
  const [oppFormData, setOppFormData] = useState({
    title: '',
    category: 'Insurance',
    subCategory: 'Health Insurance',
    providerName: '',
    description: '',
    benefits: '',
    eligibilityCriteria: '',
    requirements: '',
    keyHighlights: '',
    targetColleges: ['ALL'],
    targetRoles: ['ALL'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'Published',
    incentiveConfig: {
      milestone: 'Policy Issued',
      amountType: 'Fixed',
      amount: 500,
      terms: 'Incentive calculated and approved upon official milestone verification.',
    },
    formSchema: [],
  });

  // Applications Drawer / Modal
  const [viewingOppApplications, setViewingOppApplications] = useState(null);
  const [applicationsList, setApplicationsList] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [providerRef, setProviderRef] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isVerifyingMilestone, setIsVerifyingMilestone] = useState(false);

  const fetchOverview = async () => {
    try {
      setRefreshing(true);
      const res = await getSuperAdminReferralOverview();
      if (res?.data?.success) {
        setOverviewData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch superadmin referral overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const res = await getSuperAdminOpportunities();
      if (res?.data?.success) {
        const cleanList = (res.data.data || []).filter(
          (o) =>
            o.opportunityCode !== 'OPP-INS-2026-001' &&
            o.opportunityCode !== 'OPP-CRD-2026-001' &&
            o.opportunityCode !== 'OPP-BNK-2026-001' &&
            o.opportunityCode !== 'OPP-JOB-2026-001' &&
            o.title !== 'Star Comprehensive Health Insurance Plan' &&
            o.title !== 'HDFC Millennia Cashback Credit Card' &&
            o.title !== 'ICICI Mine Student & Youth Zero-Balance Savings Account' &&
            o.title !== 'TCS Software Engineer / Full Stack Developer Opening'
        );
        setOpportunities(cleanList);
        if (res.data.counts) setOppCounts(res.data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    }
  };

  // ── Network-wide Real-time Socket Sync ──
  useRealtimeSync(['referrals', 'incentives', 'colleges', 'opportunities', 'opportunity_applications'], (payload) => {
    fetchOverview();
    fetchOpportunities();
    setLastSyncTime(new Date());
    if (payload?.message) {
      setToastMessage(payload.message);
      setTimeout(() => setToastMessage(null), 5000);
    }
  });

  useEffect(() => {
    fetchOverview();
    fetchOpportunities();
  }, []);

  const colleges = overviewData?.colleges || [];
  const summary = overviewData?.summary || {
    totalColleges: 0,
    totalReferrals: 0,
    totalPaidIncentives: 0,
    totalPendingPayouts: 0,
  };

  // Open Create Opportunity with defaults for that category
  const handleOpenCreateModal = (category) => {
    setEditingOpportunity(null);

    let defaultSub = 'Health Insurance';
    let defaultMilestone = 'Policy Issued';
    let defaultAmount = 800;

    if (category === 'Credit Card') {
      defaultSub = 'Cashback Credit Card';
      defaultMilestone = 'Card Activated';
      defaultAmount = 1000;
    } else if (category === 'Bank Account') {
      defaultSub = 'Savings Account';
      defaultMilestone = 'Account Opened';
      defaultAmount = 500;
    } else if (category === 'Job Referral') {
      defaultSub = 'IT / Software';
      defaultMilestone = 'Joined';
      defaultAmount = 2500;
    }

    setOppFormData({
      title: '',
      category,
      subCategory: defaultSub,
      providerName: '',
      description: '',
      benefits: '',
      eligibilityCriteria: '',
      requirements: '',
      keyHighlights: '',
      targetColleges: ['ALL'],
      targetRoles: ['ALL'],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'Published',
      incentiveConfig: {
        milestone: defaultMilestone,
        amountType: 'Fixed',
        amount: defaultAmount,
        terms: 'Incentive calculated and approved upon official milestone verification.',
      },
      formSchema: [],
    });
    setOppModalTab('details');
    setShowOpportunityModal(true);
  };

  const handleOpenEditModal = (opp) => {
    setEditingOpportunity(opp);
    setOppFormData({
      title: opp.title,
      category: opp.category,
      subCategory: opp.subCategory,
      providerName: opp.providerName,
      description: opp.description || '',
      benefits: (opp.benefits || []).join('\n'),
      eligibilityCriteria: opp.eligibilityCriteria || '',
      requirements: (opp.requirements || []).join('\n'),
      keyHighlights: (opp.keyHighlights || []).join('\n'),
      targetColleges: opp.targetColleges || ['ALL'],
      targetRoles: opp.targetRoles || ['ALL'],
      startDate: opp.startDate ? new Date(opp.startDate).toISOString().split('T')[0] : '',
      endDate: opp.endDate ? new Date(opp.endDate).toISOString().split('T')[0] : '',
      status: opp.status,
      incentiveConfig: opp.incentiveConfig || {
        milestone: 'Policy Issued',
        amountType: 'Fixed',
        amount: 500,
        terms: '',
      },
      formSchema: opp.formSchema || [],
    });
    setOppModalTab('details');
    setShowOpportunityModal(true);
  };

  const handleSaveOpportunity = async (e) => {
    e.preventDefault();
    if (!oppFormData.title || !oppFormData.providerName || !oppFormData.subCategory) {
      alert('Please fill out the title, provider, and sub-category.');
      return;
    }

    try {
      const toLines = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split('\n').map(s => s.trim()).filter(Boolean);
        return [];
      };

      const payload = {
        ...oppFormData,
        title: oppFormData.title?.trim() || '',
        providerName: oppFormData.providerName?.trim() || '',
        subCategory: oppFormData.subCategory?.trim() || '',
        description: oppFormData.description?.trim() || '',
        startDate: oppFormData.startDate ? oppFormData.startDate : new Date().toISOString().split('T')[0],
        endDate: oppFormData.endDate ? oppFormData.endDate : null,
        benefits: toLines(oppFormData.benefits),
        requirements: toLines(oppFormData.requirements),
        keyHighlights: toLines(oppFormData.keyHighlights),
        incentiveConfig: {
          ...oppFormData.incentiveConfig,
          amount: Number(oppFormData.incentiveConfig?.amount) || 0,
        }
      };

      if (editingOpportunity) {
        await updateOpportunity(editingOpportunity._id, payload);
      } else {
        await createOpportunity(payload);
      }

      setShowOpportunityModal(false);
      fetchOpportunities();
      setToastMessage(`Opportunity "${payload.title}" saved successfully!`);
    } catch (err) {
      console.error('Error saving opportunity:', err);
      const errMsg = err.response?.data?.message || err.message || 'Error saving opportunity';
      alert(errMsg);
    }
  };

  const handleToggleStatus = async (opp, newStatus) => {
    try {
      await updateOpportunityStatus(opp._id, newStatus);
      fetchOpportunities();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleViewApplications = async (opp) => {
    setViewingOppApplications(opp);
    setSelectedApp(null);
    setLoadingApps(true);
    try {
      const res = await getOpportunityApplications(opp._id);
      if (res?.data?.success) {
        setApplicationsList(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingApps(false);
    }
  };

  const handleUpdateApplicationStatus = async () => {
    if (!selectedApp) return;
    try {
      await updateOpportunityApplicationStatus(selectedApp._id, {
        status: reviewStatus || selectedApp.status,
        remarks: reviewRemarks,
        providerApplicationRef: providerRef,
        verifyMilestone: isVerifyingMilestone,
      });

      alert('Application reviewed successfully.');
      handleViewApplications(viewingOppApplications);
      setSelectedApp(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update application');
    }
  };

  // One-click Auto-seed standard templates if empty
  const handleSeedDefaults = async () => {
    try {
      setRefreshing(true);
      const defaults = [
        {
          title: 'Star Comprehensive Health Insurance Plan',
          category: 'Insurance',
          subCategory: 'Health Insurance',
          providerName: 'Star Health Allied Insurance',
          description: 'Comprehensive family healthcare coverage with 100% cashless treatment across 14,000+ top hospitals nationwide, zero co-payment, and free annual checkups.',
          benefits: 'Cashless in 14,000+ hospitals\nZero co-payment required\nFree annual preventive health checkup\nTax benefit under Section 80D up to ₹25,000',
          keyHighlights: 'Instant Approval\n₹5 Lakh - ₹50 Lakh Cover\nNo Room Rent Capping',
          eligibilityCriteria: 'College students, staff, faculty, and their referred family members (Age 18 - 65).',
          requirements: 'Aadhaar Card\nPAN Card\nBasic medical history declaration',
          startDate: new Date().toISOString().split('T')[0],
          status: 'Published',
          incentiveConfig: { milestone: 'Policy Issued', amount: 800, amountType: 'Fixed' }
        },
        {
          title: 'HDFC Bank Millennia Cashback Credit Card',
          category: 'Credit Card',
          subCategory: 'Cashback Credit Card',
          providerName: 'HDFC Bank',
          description: 'Premium everyday lifestyle card offering 5% cashback on Amazon, Flipkart, Swiggy, and Zomato, plus complimentary airport lounge access.',
          benefits: '5% flat cashback on top merchant apps\n8 complimentary airport lounge visits/yr\n1% fuel surcharge waiver\nZero annual fee upon spend threshold',
          keyHighlights: '5% Instant Cashback\n8 Airport Lounge Visits\nZero Joining Fee',
          eligibilityCriteria: 'Salaried individuals with monthly net income ₹25,000+ or college staff/faculty.',
          requirements: 'PAN Card\nAadhaar Card\nLast 2 months salary slip or bank statement',
          startDate: new Date().toISOString().split('T')[0],
          status: 'Published',
          incentiveConfig: { milestone: 'Card Activated', amount: 1000, amountType: 'Fixed' }
        },
        {
          title: 'ICICI Bank Smart Salary & Savings Account',
          category: 'Bank Account',
          subCategory: 'Savings Account',
          providerName: 'ICICI Bank',
          description: 'High-yield zero-balance student & corporate savings account with free debit card, internet banking, and exclusive discounts.',
          benefits: 'Zero minimum balance requirement for verified college students\nFree international contactless debit card\nUnlimited free ATM transactions\nInstant mobile app setup with Video KYC',
          keyHighlights: 'Zero Balance Required\nInstant Video KYC\nComplimentary Debit Card',
          eligibilityCriteria: 'All enrolled students, faculty members, and administrative staff.',
          requirements: 'Aadhaar Card\nCollege ID Card / PAN Card',
          startDate: new Date().toISOString().split('T')[0],
          status: 'Published',
          incentiveConfig: { milestone: 'Account Opened', amount: 500, amountType: 'Fixed' }
        },
        {
          title: 'TCS & Cognizant Graduate Associate Software Engineer',
          category: 'Job Referral',
          subCategory: 'IT / Software',
          providerName: 'Tata Consultancy Services',
          description: 'Priority corporate campus referral for graduating engineers and MCA graduates for Full Stack Development and Cloud Engineering roles.',
          benefits: 'Direct fast-track interview invite\nAttractive CTC package of ₹6.5 - 9.0 LPA\nHybrid work option with state-of-the-art tech stack\nComprehensive relocation & training allowance',
          keyHighlights: '₹6.5 - 9.0 LPA CTC\nDirect Technical Interview\nBangalore / Chennai / Pune',
          eligibilityCriteria: 'B.Tech / B.E. (CSE, IT, ECE, EEE) or MCA with minimum 65% aggregate.',
          requirements: 'Updated Technical Resume (PDF link)\nAll Semesters Marksheet summary\nGitHub / LinkedIn Profile',
          startDate: new Date().toISOString().split('T')[0],
          status: 'Published',
          incentiveConfig: { milestone: 'Candidate Joined', amount: 2500, amountType: 'Fixed' }
        }
      ];

      for (const def of defaults) {
        try {
          await createOpportunity(def);
        } catch (e) {}
      }
      await fetchOpportunities();
      setToastMessage('Standard industry opportunities loaded successfully!');
    } catch (err) {
      console.error(err);
      fetchOpportunities();
    } finally {
      setRefreshing(false);
    }
  };

  // Filter opportunities for active category
  const filteredOpportunities = opportunities.filter((opp) => {
    if (activeModule !== 'colleges' && opp.category !== activeModule) return false;
    if (subCategoryFilter !== 'All' && opp.subCategory !== subCategoryFilter) return false;
    if (statusFilter !== 'All' && opp.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        opp.title?.toLowerCase().includes(q) ||
        opp.providerName?.toLowerCase().includes(q) ||
        opp.opportunityCode?.toLowerCase().includes(q) ||
        opp.subCategory?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const currentCollege = selectedCollege || colleges.find((c) => 
    String(c.tenantId) === String(selectedCollegeId) ||
    String(c._id) === String(selectedCollegeId) ||
    String(c.code) === String(selectedCollegeId) ||
    String(c.collegeId) === String(selectedCollegeId)
  ) || null;
  const selectedCollegeObj = currentCollege;

  return (
    <div className="superadmin-referrals-page" style={{ background: 'var(--bg-main, #f8fafc)', minHeight: '100vh' }}>
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
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="sa-ref-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '12px', color: '#fff' }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                  Business Opportunity & Referral Publishing Central
                </h1>
                <div className="ref-live-sync-pill">
                  <span className="ref-pulse-dot"></span>
                  <span>Live Network Connected</span>
                  <span className="ref-live-sync-time">• {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
              </div>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                Super Admin-controlled opportunity publishing, customizable form builder, multi-product pipelines & automated incentive rules
              </p>
            </div>
          </div>
        </div>

        <div className="sa-ref-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/superadmin/business-referral')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#1e293b',
              cursor: 'pointer'
            }}
            title="Navigate to All Categories Referral Dashboard"
          >
            <Layers size={16} style={{ color: '#2563eb' }} />
            <span>All Categories</span>
          </button>

          <button
            onClick={() => { fetchOverview(); fetchOpportunities(); }}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Syncing...' : 'Live Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── 5 SEPARATE MODULE NAVIGATION TABS ── */}
      <div className="opp-module-tabs">
        <button
          className="opp-module-tab"
          onClick={() => navigate('/superadmin/business-referral')}
          title="All Referral Categories Dashboard"
        >
          <Layers size={18} style={{ color: '#2563eb' }} />
          <span>All Categories</span>
        </button>

        <button
          className={`opp-module-tab ${activeModule === 'Insurance' ? 'active' : ''}`}
          onClick={() => handleSwitchModule('Insurance')}
        >
          <Shield size={18} />
          <span>Insurance Management</span>
          <span className="opp-badge-count">{oppCounts.insurance || 0}</span>
        </button>

        <button
          className={`opp-module-tab ${activeModule === 'Credit Card' ? 'active' : ''}`}
          onClick={() => handleSwitchModule('Credit Card')}
        >
          <CreditCard size={18} />
          <span>Credit Card Management</span>
          <span className="opp-badge-count">{oppCounts.creditCard || 0}</span>
        </button>

        <button
          className={`opp-module-tab ${activeModule === 'Bank Account' ? 'active' : ''}`}
          onClick={() => handleSwitchModule('Bank Account')}
        >
          <Landmark size={18} />
          <span>Account Opening Management</span>
          <span className="opp-badge-count">{oppCounts.bankAccount || 0}</span>
        </button>

        <button
          className={`opp-module-tab ${activeModule === 'Job Referral' ? 'active' : ''}`}
          onClick={() => handleSwitchModule('Job Referral')}
        >
          <Briefcase size={18} />
          <span>Job Referral Management</span>
          <span className="opp-badge-count">{oppCounts.jobReferral || 0}</span>
        </button>

        <button
          className={`opp-module-tab ${activeModule === 'colleges' ? 'active' : ''}`}
          onClick={() => handleSwitchModule('colleges')}
          style={{
            borderColor: activeModule === 'colleges' ? '#3b82f6' : undefined,
            fontWeight: 700
          }}
        >
          <Building2 size={18} />
          <span>College Multi-Tenant Lead Central</span>
          <span className="opp-badge-count">{colleges.length}</span>
        </button>
      </div>

      {/* ── MODULE 1, 2, 3, 4: OPPORTUNITY PUBLISHING SECTIONS ── */}
      {activeModule !== 'colleges' && (
        <div>
          {/* Action and Filter Toolbar */}
          <div className="opp-toolbar-card">
            <div className="opp-toolbar-filters">
              <div className="opp-search-wrap">
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="opp-search-input"
                  placeholder={`Search ${activeModule} opportunities...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                className="opp-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Drafts</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </select>

              {/* Sub Category Filter */}
              {activeModule === 'Insurance' && (
                <select
                  className="opp-filter-select"
                  value={subCategoryFilter}
                  onChange={(e) => setSubCategoryFilter(e.target.value)}
                >
                  <option value="All">All Insurance Types</option>
                  <option value="Health Insurance">Health Insurance</option>
                  <option value="Life Insurance">Life Insurance</option>
                  <option value="Term Insurance">Term Insurance</option>
                  <option value="Motor Insurance">Motor / Vehicle Insurance</option>
                  <option value="Travel Insurance">Travel Insurance</option>
                </select>
              )}

              {activeModule === 'Credit Card' && (
                <select
                  className="opp-filter-select"
                  value={subCategoryFilter}
                  onChange={(e) => setSubCategoryFilter(e.target.value)}
                >
                  <option value="All">All Card Products</option>
                  <option value="Cashback Credit Card">Cashback Credit Card</option>
                  <option value="Rewards Credit Card">Rewards Credit Card</option>
                  <option value="Travel Credit Card">Travel Credit Card</option>
                  <option value="Lifetime Free">Lifetime Free Card</option>
                </select>
              )}

              {activeModule === 'Bank Account' && (
                <select
                  className="opp-filter-select"
                  value={subCategoryFilter}
                  onChange={(e) => setSubCategoryFilter(e.target.value)}
                >
                  <option value="All">All Account Types</option>
                  <option value="Savings Account">Savings Account</option>
                  <option value="Salary Account">Corporate Salary Account</option>
                  <option value="Current Account">Current Account</option>
                  <option value="Zero Balance">Student Zero Balance</option>
                </select>
              )}

              {activeModule === 'Job Referral' && (
                <select
                  className="opp-filter-select"
                  value={subCategoryFilter}
                  onChange={(e) => setSubCategoryFilter(e.target.value)}
                >
                  <option value="All">All Sectors</option>
                  <option value="IT / Software">IT / Software</option>
                  <option value="Banking / Finance">Banking / Finance</option>
                  <option value="Core Engineering">Core Engineering</option>
                  <option value="Non-IT">Non-IT</option>
                </select>
              )}
            </div>

            {/* Create Opportunity Button */}
            <button
              className="opp-publish-btn"
              onClick={() => handleOpenCreateModal(activeModule)}
            >
              <Plus size={18} />
              <span>Publish New {activeModule} Opportunity</span>
            </button>
          </div>

          {/* Opportunities Cards Grid */}
          {filteredOpportunities.length === 0 ? (
            <div className="opp-empty-card">
              <div className="opp-empty-icon-wrap">
                <Award size={36} />
              </div>
              <h3 className="opp-empty-title">No {activeModule} Opportunities Active Yet</h3>
              <p className="opp-empty-desc">
                Publish verified {activeModule} products or load standard corporate industry opportunities to activate real-time applications across all authorized college campuses.
              </p>
              <div className="opp-empty-actions">
                <button
                  className="opp-publish-btn"
                  onClick={() => handleOpenCreateModal(activeModule)}
                >
                  <Plus size={16} />
                  <span>Publish New {activeModule} Opportunity</span>
                </button>
                <button
                  type="button"
                  className="ref-btn-secondary"
                  onClick={handleSeedDefaults}
                  style={{ height: '42px', padding: '0 18px', borderRadius: '10px' }}
                >
                  <Sparkles size={16} style={{ color: '#2563eb' }} />
                  <span>Load Standard Templates</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="opp-grid">
              {filteredOpportunities.map((opp) => (
                <div key={opp._id} className="opp-card">
                  <div className="opp-card-header">
                    <div>
                      <div className="opp-provider-tag">
                        <span>{opp.providerName}</span>
                        <span>•</span>
                        <span>{opp.subCategory}</span>
                      </div>
                      <div className="opp-title">{opp.title}</div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{opp.opportunityCode}</span>
                    </div>

                    <span className={`opp-status-pill ${opp.status.toLowerCase()}`}>
                      {opp.status}
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
                      <span>₹{opp.incentiveConfig?.amount || 0} / {opp.incentiveConfig?.milestone}</span>
                    </div>
                    <div>
                      <span>Form v{opp.formVersion || 1} • </span>
                      <strong>{opp.stats?.totalApplications || 0}</strong> apps
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', fontSize: '0.78rem', color: '#64748b' }}>
                    <div>Colleges: <strong>{opp.targetColleges?.includes('ALL') ? 'All Network' : `${opp.targetColleges?.length} Colleges`}</strong></div>
                    <div>Roles: <strong>{opp.targetRoles?.includes('ALL') ? 'All Roles' : opp.targetRoles?.join(', ')}</strong></div>
                  </div>

                  <div className="opp-card-actions">
                    <button
                      className="opp-btn-outline"
                      onClick={() => handleViewApplications(opp)}
                    >
                      <Users size={14} />
                      <span>Apps ({opp.stats?.totalApplications || 0})</span>
                    </button>

                    <button
                      className="opp-btn-outline"
                      onClick={() => handleOpenEditModal(opp)}
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>

                    {opp.status === 'Published' ? (
                      <button
                        className="opp-btn-outline"
                        style={{ color: '#d97706' }}
                        onClick={() => handleToggleStatus(opp, 'Paused')}
                        title="Pause applications"
                      >
                        <Pause size={14} />
                        <span>Pause</span>
                      </button>
                    ) : opp.status === 'Paused' || opp.status === 'Draft' ? (
                      <button
                        className="opp-btn-primary"
                        onClick={() => handleToggleStatus(opp, 'Published')}
                        title="Publish opportunity"
                      >
                        <Play size={14} />
                        <span>Publish</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MODULE 5: MULTI-TENANT COLLEGE OVERVIEW & EXISTING REPORT CENTRAL ── */}
      {activeModule === 'colleges' && (
        <div>
          {/* Top Summary Cards */}
          <div className="sa-top-summary-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Connected Colleges</p>
                <Building2 size={20} style={{ color: '#6366f1' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
                {summary.totalColleges}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Active institutional tenants</span>
            </div>

            <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Network Referrals</p>
                <TrendingUp size={20} style={{ color: '#0ea5e9' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>
                {summary.totalReferrals}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Across all 4 modules</span>
            </div>

            <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Disbursed Incentives</p>
                <DollarSign size={20} style={{ color: '#10b981' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>
                ₹{summary.totalPaidIncentives.toLocaleString()}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Verified payouts released</span>
            </div>

            <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Pending Approval</p>
                <Clock size={20} style={{ color: '#f59e0b' }} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>
                ₹{summary.totalPendingPayouts.toLocaleString()}
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>Awaiting audit verification</span>
            </div>
          </div>

          {selectedCollegeId === 'ALL' ? (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Institutional Tenants Referral Activity
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Click "Manage Leads" on any institution to audit their scoped referral operations and payout records.
                  </p>
                </div>
              </div>

              <div className="sa-tenants-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table className="sa-tenants-table" style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Institution Name</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Tenant Code</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Plan / Status</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Total Leads</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Successful</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Paid Incentives</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Pending</th>
                      <th style={{ padding: '12px 18px', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colleges.map((col) => (
                      <tr key={col._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f172a' }}>
                          {col.name || col.collegeName}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#64748b', fontFamily: 'monospace' }}>
                          {col.code || col.tenantId || 'COL001'}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: '#eff6ff', color: '#2563eb' }}>
                            {col.plan || 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                          {col.totalReferrals || 0}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 700 }}>
                          {col.successfulReferrals || 0}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#059669', fontWeight: 700 }}>
                          ₹{(col.totalPaid || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 18px', color: '#d97706', fontWeight: 700 }}>
                          ₹{(col.totalPending || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <button
                            onClick={() => {
                              setSelectedCollege(col);
                              setSelectedCollegeId(col.tenantId || col.code || col._id);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <span>Manage Leads</span>
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <div 
                className="sa-college-manage-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-main, #0f172a)',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  marginBottom: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div className="sa-college-manage-left" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Managing Multi-Tenant Institution
                      </span>
                      {(currentCollege?.tenantId || currentCollege?.code) && (
                        <span style={{ 
                          background: '#dbeafe', 
                          color: '#1d4ed8', 
                          fontFamily: 'monospace', 
                          fontWeight: 700, 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '6px' 
                        }}>
                          {currentCollege.tenantId || currentCollege.code}
                        </span>
                      )}
                      <span style={{ 
                        background: '#f1f5f9', 
                        color: '#334155', 
                        fontWeight: 600, 
                        fontSize: '0.75rem', 
                        padding: '2px 8px', 
                        borderRadius: '6px' 
                      }}>
                        {currentCollege?.plan || currentCollege?.subscriptionPlan || 'Active'} Plan
                      </span>
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {currentCollege?.name || currentCollege?.collegeName || 'Selected College'}
                    </div>
                  </div>
                </div>

                <div className="sa-college-manage-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div className="sa-college-select-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Switch Institution:</label>
                    <select
                      className="sa-college-select"
                      value={currentCollege?.tenantId || currentCollege?._id || selectedCollegeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'ALL') {
                          setSelectedCollegeId('ALL');
                          setSelectedCollege(null);
                        } else {
                          const chosen = colleges.find(c => String(c.tenantId) === String(val) || String(c._id) === String(val));
                          if (chosen) {
                            setSelectedCollege(chosen);
                            setSelectedCollegeId(chosen.tenantId || chosen.code || chosen._id);
                          }
                        }
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}
                    >
                      {colleges.map((col) => (
                        <option key={col._id || col.tenantId} value={col.tenantId || col._id}>
                          {col.name || col.collegeName} ({col.tenantId || col.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="sa-college-back-btn"
                    onClick={() => {
                      setSelectedCollegeId('ALL');
                      setSelectedCollege(null);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#334155',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    title="Return to the list of all connected institutions"
                  >
                    <Globe size={16} />
                    <span>Back to Network Overview</span>
                  </button>
                </div>
              </div>

              <AdminReferralManagement 
                key={currentCollege?.tenantId || currentCollege?._id || selectedCollegeId}
                initialCollegeId={currentCollege?.tenantId || currentCollege?._id || selectedCollegeId} 
              />
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT OPPORTUNITY MODAL ── */}
      {showOpportunityModal && renderPortalModal(
        <div className="ref-modal-overlay">
          <div className="ref-modal-card" style={{ maxWidth: '820px', width: '92%' }}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">
                <Plus size={20} style={{ color: '#2563eb' }} />
                <span>{editingOpportunity ? `Edit ${oppFormData.category} Opportunity` : `Publish New ${oppFormData.category} Opportunity`}</span>
              </div>
              <button type="button" className="ref-modal-close" onClick={() => setShowOpportunityModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '1px solid #e2e8f0',
              padding: '0 20px',
              background: '#f8fafc',
              overflowX: 'auto'
            }}>
              <button
                type="button"
                onClick={() => setOppModalTab('details')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: oppModalTab === 'details' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'details' ? '#2563eb' : '#64748b',
                  fontWeight: oppModalTab === 'details' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <FileText size={15} />
                <span>1. Opportunity Details</span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('benefits')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: oppModalTab === 'benefits' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'benefits' ? '#2563eb' : '#64748b',
                  fontWeight: oppModalTab === 'benefits' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Award size={15} />
                <span>2. Benefits & Eligibility</span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('form')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: oppModalTab === 'form' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'form' ? '#2563eb' : '#64748b',
                  fontWeight: oppModalTab === 'form' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Sliders size={15} />
                <span>3. Form Fields Builder</span>
                <span style={{
                  fontSize: '0.72rem',
                  background: oppModalTab === 'form' ? '#2563eb' : '#e2e8f0',
                  color: oppModalTab === 'form' ? '#ffffff' : '#334155',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  {oppFormData.formSchema?.length || 0} fields
                </span>
              </button>

              <button
                type="button"
                onClick={() => setOppModalTab('incentives')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom: oppModalTab === 'incentives' ? '2.5px solid #2563eb' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'incentives' ? '#2563eb' : '#64748b',
                  fontWeight: oppModalTab === 'incentives' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <DollarSign size={15} />
                <span>4. Incentive & Rewards</span>
              </button>
            </div>

            <form onSubmit={handleSaveOpportunity} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div className="ref-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* ── TAB 1: DETAILS ── */}
                {oppModalTab === 'details' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label">Opportunity Title *</label>
                        <input
                          type="text"
                          className="ref-input"
                          placeholder="e.g. Star Comprehensive Health Insurance"
                          value={oppFormData.title}
                          onChange={(e) => setOppFormData({ ...oppFormData, title: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="ref-form-label">Partner / Provider / Bank / Company *</label>
                        <input
                          type="text"
                          className="ref-input"
                          placeholder="e.g. Star Health / HDFC Bank / TCS"
                          value={oppFormData.providerName}
                          onChange={(e) => setOppFormData({ ...oppFormData, providerName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label">Sub-Category / Specific Product *</label>
                        <input
                          type="text"
                          className="ref-input"
                          placeholder="e.g. Term Life Insurance, Cashback Card, Savings Account"
                          value={oppFormData.subCategory}
                          onChange={(e) => setOppFormData({ ...oppFormData, subCategory: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="ref-form-label">Publishing Status</label>
                        <select
                          className="ref-select"
                          value={oppFormData.status}
                          onChange={(e) => setOppFormData({ ...oppFormData, status: e.target.value })}
                        >
                          <option value="Published">Published (Live to Applicants)</option>
                          <option value="Draft">Save as Draft</option>
                          <option value="Paused">Paused</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </div>

                    <div className="ref-form-group">
                      <label className="ref-form-label">Opportunity Description *</label>
                      <textarea
                        rows={3}
                        className="ref-textarea"
                        placeholder="Provide a compelling overview of this product, what applicants receive, and provider credentials..."
                        value={oppFormData.description}
                        onChange={(e) => setOppFormData({ ...oppFormData, description: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label">Application Start Date</label>
                        <input
                          type="date"
                          className="ref-input"
                          value={oppFormData.startDate}
                          onChange={(e) => setOppFormData({ ...oppFormData, startDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="ref-form-label">Closing Date (Leave blank for ongoing)</label>
                        <input
                          type="date"
                          className="ref-input"
                          value={oppFormData.endDate}
                          onChange={(e) => setOppFormData({ ...oppFormData, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 2: BENEFITS & ELIGIBILITY ── */}
                {oppModalTab === 'benefits' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label">Key Benefits (one per line)</label>
                        <textarea
                          rows={4}
                          className="ref-textarea"
                          placeholder="Cashless in 14,000+ hospitals&#10;5% cashback on Swiggy & Zomato&#10;Zero joining fee"
                          value={oppFormData.benefits}
                          onChange={(e) => setOppFormData({ ...oppFormData, benefits: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="ref-form-label">Key Highlights / Badges (one per line)</label>
                        <textarea
                          rows={4}
                          className="ref-textarea"
                          placeholder="Instant Approval&#10;Zero Annual Fee&#10;₹5 Lakh Coverage"
                          value={oppFormData.keyHighlights}
                          onChange={(e) => setOppFormData({ ...oppFormData, keyHighlights: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label">Eligibility Criteria</label>
                        <textarea
                          rows={3}
                          className="ref-textarea"
                          placeholder="e.g. Age 18-65. Salaried monthly income ₹35,000+"
                          value={oppFormData.eligibilityCriteria}
                          onChange={(e) => setOppFormData({ ...oppFormData, eligibilityCriteria: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="ref-form-label">Requirements / Documents (one per line)</label>
                        <textarea
                          rows={3}
                          className="ref-textarea"
                          placeholder="Aadhaar Card&#10;PAN Card&#10;Last 3 months salary slip"
                          value={oppFormData.requirements}
                          onChange={(e) => setOppFormData({ ...oppFormData, requirements: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: FORM BUILDER INTEGRATION ── */}
                {oppModalTab === 'form' && (
                  <div>
                    <div style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sliders size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e3a8a' }}>
                          Integrated Opportunity Form Fields Builder
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                          Add, edit, or customize fields required from applicants when applying for this {oppFormData.category} opportunity.
                        </div>
                      </div>
                    </div>

                    <FormBuilderEditor
                      schema={oppFormData.formSchema}
                      onChange={(updatedSchema) => setOppFormData({ ...oppFormData, formSchema: updatedSchema })}
                    />
                  </div>
                )}

                {/* ── TAB 4: INCENTIVES & RULES ── */}
                {oppModalTab === 'incentives' && (
                  <div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={18} /> Applicable Incentive Rule & Outcome Milestone
                      </div>
                      <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#15803d' }}>
                        Define the milestone condition that triggers the incentive payout and the reward amount per successful applicant referral.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label className="ref-form-label" style={{ color: '#14532d' }}>Trigger Milestone *</label>
                          <input
                            type="text"
                            className="ref-input"
                            placeholder="e.g. Policy Issued, Card Activated, Account Opened, Joined"
                            value={oppFormData.incentiveConfig.milestone}
                            onChange={(e) => setOppFormData({
                              ...oppFormData,
                              incentiveConfig: { ...oppFormData.incentiveConfig, milestone: e.target.value }
                            })}
                            required
                          />
                        </div>
                        <div>
                          <label className="ref-form-label" style={{ color: '#14532d' }}>Reward Amount (₹) *</label>
                          <input
                            type="number"
                            className="ref-input"
                            value={oppFormData.incentiveConfig.amount}
                            onChange={(e) => setOppFormData({
                              ...oppFormData,
                              incentiveConfig: { ...oppFormData.incentiveConfig, amount: Number(e.target.value) }
                            })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ color: '#14532d' }}>Verification Terms & Conditions</label>
                        <input
                          type="text"
                          className="ref-input"
                          placeholder="e.g. Incentive calculated and approved upon official milestone verification."
                          value={oppFormData.incentiveConfig.terms || ''}
                          onChange={(e) => setOppFormData({
                            ...oppFormData,
                            incentiveConfig: { ...oppFormData.incentiveConfig, terms: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="ref-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {oppModalTab !== 'details' && (
                    <button
                      type="button"
                      className="ref-btn-secondary"
                      onClick={() => {
                        if (oppModalTab === 'benefits') setOppModalTab('details');
                        else if (oppModalTab === 'form') setOppModalTab('benefits');
                        else if (oppModalTab === 'incentives') setOppModalTab('form');
                      }}
                    >
                      ← Previous Tab
                    </button>
                  )}
                  {oppModalTab !== 'incentives' && (
                    <button
                      type="button"
                      className="ref-btn-secondary"
                      style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8', fontWeight: 600 }}
                      onClick={() => {
                        if (oppModalTab === 'details') setOppModalTab('benefits');
                        else if (oppModalTab === 'benefits') setOppModalTab('form');
                        else if (oppModalTab === 'form') setOppModalTab('incentives');
                      }}
                    >
                      Next Tab →
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="ref-btn-secondary" onClick={() => setShowOpportunityModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="ref-btn-primary">
                    <Check size={16} /> Save & {oppFormData.status === 'Published' ? 'Publish' : 'Save as Draft'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── APPLICATIONS DRAWER / REVIEW MODAL ── */}
      {viewingOppApplications && renderPortalModal(
        <div className="ref-modal-overlay">
          <div className="ref-modal-card" style={{ maxWidth: '920px', width: '92%' }}>
            <div className="ref-modal-header">
              <div>
                <div className="ref-modal-title">
                  <Users size={20} className="text-blue-600" />
                  <span>Applications: {viewingOppApplications.title}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                  {viewingOppApplications.opportunityCode} • {applicationsList.length} total applicant submissions
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={getOpportunityExportCsvUrl(viewingOppApplications._id)}
                  download
                  className="ref-btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <Download size={14} /> Export CSV
                </a>
                <button className="ref-modal-close" onClick={() => setViewingOppApplications(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="ref-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {loadingApps ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading applications...</div>
              ) : applicationsList.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  <FileText size={40} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                  <div>No applications submitted yet for this opportunity.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {applicationsList.map((app) => (
                    <div
                      key={app._id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        background: selectedApp?._id === app._id ? '#eff6ff' : '#ffffff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{app.applicantName}</span>
                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{app.applicantRole}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>• {app.applicantDepartment}</span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                            App Code: <strong>{app.applicationCode}</strong> • Tenant: {app.tenantId} • Applied: {new Date(app.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`ref-badge ${app.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {app.status}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedApp(selectedApp?._id === app._id ? null : app);
                              setReviewStatus(app.status);
                              setProviderRef(app.providerApplicationRef || '');
                              setIsVerifyingMilestone(app.milestoneVerified || false);
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {selectedApp?._id === app._id ? 'Close Review' : 'Review & Audit'}
                          </button>
                        </div>
                      </div>

                      {/* Submitted Form Responses Preview */}
                      <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 14px', marginTop: '12px', fontSize: '0.82rem' }}>
                        <div style={{ fontWeight: 700, color: '#334155', marginBottom: '6px' }}>Applicant Submitted Data:</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                          {Object.entries(app.formData || {}).map(([k, v]) => (
                            <div key={k}>
                              <span style={{ color: '#64748b' }}>{k}: </span>
                              <strong style={{ color: '#0f172a' }}>{String(v)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Review & Milestone Verification Sub-panel */}
                      {selectedApp?._id === app._id && (
                        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label className="ref-form-label">Review Status</label>
                              <select
                                className="ref-select"
                                value={reviewStatus}
                                onChange={(e) => setReviewStatus(e.target.value)}
                              >
                                <option value="Submitted">Submitted</option>
                                <option value="Under Review">Under Review</option>
                                <option value="KYC Verification">KYC Verification</option>
                                <option value="Provider Processing">Provider Processing</option>
                                <option value="Approved">Approved</option>
                                <option value="Milestone Verified">Milestone Verified</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Returned for Correction">Returned for Correction</option>
                              </select>
                            </div>

                            <div>
                              <label className="ref-form-label">Provider Reference No. (Policy / Card / Account / Joining Ref)</label>
                              <input
                                type="text"
                                className="ref-input"
                                placeholder="e.g. POL-8492048, HDFC-CC-9412"
                                value={providerRef}
                                onChange={(e) => setProviderRef(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Verify Milestone Checkbox */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#059669', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isVerifyingMilestone}
                              onChange={(e) => setIsVerifyingMilestone(e.target.checked)}
                            />
                            <span>Verify Milestone Reached (Automatically calculates ₹{viewingOppApplications.incentiveConfig?.amount || 500} incentive reward)</span>
                          </label>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            <button
                              type="button"
                              className="ref-btn-primary"
                              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                              onClick={handleUpdateApplicationStatus}
                            >
                              <Check size={14} /> Submit Audit Decision
                            </button>
                            <button
                              type="button"
                              className="ref-btn-secondary"
                              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                              onClick={() => setSelectedApp(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
