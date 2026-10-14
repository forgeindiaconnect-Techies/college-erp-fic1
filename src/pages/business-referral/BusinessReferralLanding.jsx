import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Network, Award, CreditCard, Shield, Briefcase, Landmark,
  ArrowRight, CheckCircle2, TrendingUp, Sparkles, Filter, Search,
  DollarSign, ChevronRight, Info, ExternalLink, SlidersHorizontal,
  Layers, Users, Check, Clock, AlertTriangle, ArrowLeft, LayoutDashboard,
  Edit, Save, RotateCcw, X
} from 'lucide-react';
import { getIncentiveRules } from '../../api';
import EditCategoryModal from '../../components/referrals/EditCategoryModal';
import { getCustomCategoryOverrides } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralLanding.css';

export default function BusinessReferralLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;
  const dashboardPath = `/${rootRole}/dashboard`;
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewCategory, setPreviewCategory] = useState(null);

  // Super Admin custom category overrides synced globally
  const [customCategoryOverrides, setCustomCategoryOverrides] = useState(() => getCustomCategoryOverrides());
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    const handleSync = () => {
      setCustomCategoryOverrides(getCustomCategoryOverrides());
    };
    window.addEventListener('erp_category_config_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('erp_category_config_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Dynamic backend incentive rules state
  const [rulesList, setRulesList] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchApprovedRules = async () => {
      try {
        setLoadingRules(true);
        setRulesError(null);
        const res = await getIncentiveRules();
        if (!isMounted) return;
        if (res && res.data && res.data.success && Array.isArray(res.data.data)) {
          setRulesList(res.data.data);
        } else if (res && res.data && Array.isArray(res.data)) {
          setRulesList(res.data);
        } else {
          setRulesList([]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Backend incentive rules load notification:', err.message);
        setRulesError(err.response?.data?.message || err.message || 'Reward terms depend on approved institutional rules');
        setRulesList([]);
      } finally {
        if (isMounted) setLoadingRules(false);
      }
    };

    fetchApprovedRules();
    return () => { isMounted = false; };
  }, []);

  // Filter approved rules only
  const approvedRules = useMemo(() => {
    return rulesList.filter(
      (r) => (r.approvalStatus === 'Approved' || (!r.approvalStatus && r.isActive)) && r.isActive !== false
    );
  }, [rulesList]);

  // Derive dynamic metrics & highlights for the Incentives category card
  const incentivesCardData = useMemo(() => {
    if (loadingRules) {
      return {
        earningPotential: 'Checking approved rules...',
        turnaround: 'Institutional settlement cycle',
        status: 'Checking Rules',
        badge: 'Institutional Rules',
        description: 'Comprehensive milestone rules, reward calculation methods, and settlement governance across verified referrals, strictly governed by approved institutional rate cards.',
        highlights: [
          'Checking approved institutional rate cards from database',
          'Disbursement strictly conditional on underwriter / partner reconciliation',
          'Candidate and applicant explicit consent verified prior to routing',
          'Audit trail maintained for all milestone reward determinations'
        ],
        tags: ['Milestones', 'Institutional Audit', 'Consent Verification', 'Rate Cards']
      };
    }

    if (approvedRules.length === 0) {
      return {
        earningPotential: 'Reward terms depend on approved institutional rules',
        turnaround: 'Institutional settlement cycle',
        status: 'Pending Rules',
        badge: 'Institutional Policy',
        description: 'Reward terms depend on approved institutional rules. No payouts occur without verified partner milestones and approved institutional rate cards.',
        highlights: [
          'Reward terms depend on approved institutional rules',
          'No payouts claimable without active approved rate cards',
          'Disbursements subject to partner reconciliation & verified clearance',
          'Candidate and applicant explicit consent required for eligibility'
        ],
        tags: ['Pending Approval', 'Institutional Policy', 'Audit Governance', 'Rate Cards']
      };
    }

    // Extract amount metrics from approved rules
    const fixedAmounts = approvedRules
      .filter((r) => r.amountType === 'Fixed' && typeof r.amount === 'number' && r.amount > 0)
      .map((r) => r.amount);

    const percentAmounts = approvedRules
      .filter((r) => r.amountType === 'Percentage' && typeof r.amount === 'number' && r.amount > 0)
      .map((r) => r.amount);

    let potentialStr = '';
    if (fixedAmounts.length > 0) {
      const minFixed = Math.min(...fixedAmounts);
      const maxFixed = Math.max(...fixedAmounts);
      potentialStr = minFixed === maxFixed ? `₹${minFixed.toLocaleString('en-IN')} approved` : `₹${minFixed.toLocaleString('en-IN')} - ₹${maxFixed.toLocaleString('en-IN')} approved`;
    }
    if (percentAmounts.length > 0) {
      const minPct = Math.min(...percentAmounts);
      const maxPct = Math.max(...percentAmounts);
      const pctStr = minPct === maxPct ? `${minPct}% of value` : `${minPct}% - ${maxPct}% of value`;
      potentialStr = potentialStr ? `${potentialStr} / ${pctStr}` : `${pctStr} approved`;
    }

    if (!potentialStr) {
      potentialStr = 'Reward terms depend on approved institutional rules';
    }

    const sampleMilestones = [...new Set(approvedRules.map((r) => r.milestone).filter(Boolean))];
    const milestoneStr = sampleMilestones.length > 0 ? sampleMilestones.slice(0, 2).join(' • ') : 'Verified milestone clearance';
    const categoryNames = [...new Set(approvedRules.map((r) => r.category).filter(Boolean))];

    return {
      earningPotential: potentialStr,
      turnaround: 'Institutional settlement cycle',
      status: `${approvedRules.length} Approved Rule${approvedRules.length > 1 ? 's' : ''}`,
      badge: 'Approved Rates',
      description: 'Comprehensive milestone rules, reward calculation methods, and settlement governance across verified referrals, strictly governed by approved institutional rate cards.',
      highlights: [
        `${approvedRules.length} approved category rate card${approvedRules.length > 1 ? 's' : ''} loaded from database`,
        `Verification milestones: ${milestoneStr}`,
        'Disbursement strictly conditional on underwriter / partner reconciliation',
        'Mandatory applicant consent verified prior to referral submission'
      ],
      tags: categoryNames.length > 0 ? [...categoryNames, 'Approved Rates'] : ['Approved Milestones', 'Rate Cards', 'Audit Log']
    };
  }, [loadingRules, approvedRules]);

  // Five defined categories for the Business Referral module with Incentives dynamically backed by database
  const rawCategories = useMemo(() => [
    {
      id: 'incentives',
      title: 'Incentives',
      subtitle: 'Approved Institutional Rates & Milestones',
      icon: <Award size={26} />,
      badge: incentivesCardData.badge,
      badgeColor: 'amber',
      accentColor: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      description: incentivesCardData.description,
      highlights: incentivesCardData.highlights,
      metrics: {
        earningPotential: incentivesCardData.earningPotential,
        turnaround: incentivesCardData.turnaround,
        status: incentivesCardData.status
      },
      tags: incentivesCardData.tags
    },
    {
      id: 'credit-card',
      title: 'Credit Card Referral',
      subtitle: 'Leading Banking & Card Partners',
      icon: <CreditCard size={26} />,
      badge: 'High Commission',
      badgeColor: 'blue',
      accentColor: '#2563eb',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      description: 'Refer students, staff, and network alumni for pre-approved credit cards from top private and public banks with instant cash rewards on card dispatch.',
      highlights: [
        'Partnerships with HDFC, ICICI, SBI & Axis Bank',
        'Lifetime free (LTF) and cashback card variants',
        'Zero paperwork digital onboarding links',
        'Incentives credited upon card approval & activation'
      ],
      metrics: {
        earningPotential: '₹1,200 - ₹3,000 / card',
        turnaround: 'Instant card tracking',
        status: 'Active'
      },
      tags: ['HDFC Bank', 'ICICI Bank', 'SBI Cards', 'Axis Bank']
    },
    {
      id: 'insurance',
      title: 'Insurance Referral',
      subtitle: 'Health, Life & Motor Protection',
      icon: <Shield size={26} />,
      badge: 'Verified Partners',
      badgeColor: 'emerald',
      accentColor: '#059669',
      gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      description: 'Comprehensive health cover, term life plans, and motor policies from IRDAI-regulated insurers tailored for campus staff, students, and families.',
      highlights: [
        'Star Health, HDFC ERGO, Care Insurance partnerships',
        'Comprehensive family floater & student cover plans',
        'Instant policy issuance with automated milestone check',
        'Dedicated campus insurance advisory support'
      ],
      metrics: {
        earningPotential: '15% - 25% of premium',
        turnaround: 'Same-day issuance',
        status: 'Active'
      },
      tags: ['Health Insurance', 'Term Life', 'Family Cover', 'Star Health']
    },
    {
      id: 'job-referral',
      title: 'Job Referral',
      subtitle: 'Campus Hiring & Corporate Placement',
      icon: <Briefcase size={26} />,
      badge: 'Corporate Network',
      badgeColor: 'indigo',
      accentColor: '#6366f1',
      gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      description: 'Connect graduating talent, alumni, and qualified candidates with premium tech and corporate recruitment pipelines for exclusive joining referral bonuses.',
      highlights: [
        'Direct tech & non-tech roles at Tier-1 companies',
        'Priority resume screening with hiring managers',
        'Candidate consent validation & status updates',
        'Substantial referral bonuses paid on candidate onboarding'
      ],
      metrics: {
        earningPotential: '₹5,000 - ₹25,000 / joiner',
        turnaround: 'Offer letter milestone',
        status: 'Active'
      },
      tags: ['Software Engineering', 'Corporate Roles', 'Internships', 'Alumni Network']
    },
    {
      id: 'account-opening',
      title: 'Account Opening Referral',
      subtitle: 'Digital Savings & Salary Accounts',
      icon: <Landmark size={26} />,
      badge: 'Instant Processing',
      badgeColor: 'purple',
      accentColor: '#9333ea',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
      description: 'Fast-track zero balance savings accounts and student salary accounts with instant Video-KYC from leading nationalized and private banking networks.',
      highlights: [
        'Kotak 811, HDFC DigiSave, AU Small Finance Bank',
        '100% paperless video KYC verification in 5 minutes',
        'Free virtual debit cards and net banking access',
        'Referral incentives verified upon first deposit or activation'
      ],
      metrics: {
        earningPotential: '₹350 - ₹800 / account',
        turnaround: '5-min Video KYC',
        status: 'Active'
      },
      tags: ['Zero Balance', 'Student Salary', 'Video KYC', 'Instant Debit']
    }
  ], [incentivesCardData]);

  // Merge Super Admin custom overrides
  const categories = useMemo(() => {
    return rawCategories.map((cat) => {
      const override = customCategoryOverrides[cat.id];
      if (override) {
        return {
          ...cat,
          ...override,
          metrics: {
            ...cat.metrics,
            ...(override.metrics || {}),
          },
          highlights: override.highlights || cat.highlights,
          tags: override.tags || cat.tags,
        };
      }
      return cat;
    });
  }, [rawCategories, customCategoryOverrides]);

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
  };

  // Filtering logic
  const filteredCategories = categories.filter((cat) => {
    const matchesFilter = selectedCategory === 'ALL' || cat.id === selectedCategory;
    const matchesSearch =
      cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card (Matches Screenshot 3 standard) ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #3730a5, #10b981, #06b6d4)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Business Referral Network Active</span>
            </div>
            <h1>Business Referral Console</h1>
            <p>
              Empower college staff, students, and institutional stakeholders to participate in certified partner opportunities.
              Track incentives, generate referrals, and audit payouts across 5 dedicated categories.
            </p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={() => navigate(dashboardPath)}
              title="Return to main Portal Dashboard"
            >
              <ArrowLeft size={15} />
              <span>Go to Dashboard</span>
            </button>

            {rootRole === 'superadmin' ? (
              <button
                type="button"
                className="mgmt-btn-primary"
                onClick={() => navigate('/superadmin/business-referrals')}
                title="Open Publishing & Lead Central to Create & Edit Opportunities"
              >
                <Edit size={16} />
                <span>Publishing & Opportunity Central</span>
              </button>
            ) : rootRole === 'admin' ? (
              <button
                type="button"
                className="mgmt-btn-primary"
                onClick={() => navigate('/admin/business-referrals')}
                title="Open Management & Audit Console"
              >
                <SlidersHorizontal size={16} />
                <span>Management Console</span>
              </button>
            ) : (
              <button
                type="button"
                className="mgmt-btn-primary"
                onClick={() => navigate(`/${rootRole}/referrals`)}
                title="View my referral applications and submission history"
              >
                <Clock size={16} />
                <span>My Submissions & Status</span>
              </button>
            )}
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Network Status: <strong>Live & Synchronized</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Approved Rate Cards: <strong>{approvedRules.length} Active Rules</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Categories: <strong>Banking, Insurance, Corporate Careers, Digital Accounts</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Audit Standard: <strong>100% Institutional Verification</strong></span>
        </div>
      </div>

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Layers size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Core Categories</span>
            <h3 className="mgmt-kpi-value">5 Streams</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Award size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Institutional Rates</span>
            <h3 className="mgmt-kpi-value">{loadingRules ? 'Syncing...' : approvedRules.length > 0 ? `${approvedRules.length} Approved` : 'Rule Policy'}</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Verification Governance</span>
            <h3 className="mgmt-kpi-value">100% Verified</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Settlement Audit</span>
            <h3 className="mgmt-kpi-value">Bi-Weekly Cycle</h3>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Control Bar (Matches Reports Filters) ── */}
      <div className="bus-ref-controls-card">
        <div className="bus-ref-search-wrap">
          <Search size={16} className="bus-ref-search-icon" />
          <input
            type="text"
            className="bus-ref-search-input"
            placeholder="Search categories, partner banks, insurance, jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="bus-ref-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="bus-ref-controls-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-light, #64748b)', fontSize: '0.82rem', fontWeight: 500 }}>
          <span>Explore all partner categories or select a specific stream from the sidebar menu</span>
        </div>
      </div>

      {/* ── 5 Categories Grid ── */}
      <div className="bus-ref-grid">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="bus-ref-card" style={{ '--accent-color': cat.accentColor }}>
            <div className="bus-card-accent-bar" style={{ background: cat.accentColor }} />
            
            <div className="bus-card-header">
              <div className="bus-card-icon-wrap" style={{ background: cat.gradient }}>
                {cat.icon}
              </div>
              <div className="bus-card-badge-wrap">
                <span className={`bus-badge bus-badge-${cat.badgeColor}`}>
                  {cat.badge}
                </span>
              </div>
            </div>

            <div className="bus-card-body">
              <div className="bus-card-title-group">
                <h2 className="bus-card-title">{cat.title}</h2>
                <p className="bus-card-subtitle">{cat.subtitle}</p>
              </div>
              <p className="bus-card-desc">{cat.description}</p>

              <div className="bus-card-highlights">
                {cat.highlights.map((item, idx) => (
                  <div key={idx} className="bus-highlight-row">
                    <CheckCircle2 size={13} className="bus-check-icon" style={{ color: cat.accentColor }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="bus-card-metrics-strip">
                <div className="bus-metric-box">
                  <span className="bus-metric-label">Reward Potential</span>
                  <span className="bus-metric-val">{cat.metrics.earningPotential}</span>
                </div>
                <div className="bus-metric-box">
                  <span className="bus-metric-label">Turnaround</span>
                  <span className="bus-metric-val">{cat.metrics.turnaround}</span>
                </div>
              </div>

              <div className="bus-card-tags">
                {cat.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="bus-tag-pill">{tag}</span>
                ))}
              </div>
            </div>

            <div className="bus-card-footer">
              <button
                type="button"
                className="bus-card-btn-preview"
                onClick={() => setPreviewCategory(cat)}
              >
                <Info size={14} />
                <span>Overview</span>
              </button>
              {rootRole === 'superadmin' && (
                <button
                  type="button"
                  className="bus-card-btn-preview"
                  style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    fontWeight: 700,
                  }}
                  onClick={() => handleOpenEditModal(cat)}
                  title={`Edit ${cat.title} Category Details`}
                >
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              )}
              <button
                type="button"
                className="bus-card-btn-action"
                style={{ background: cat.gradient }}
                onClick={() => navigate(`${basePath}/${cat.id}`)}
              >
                <span>Explore Category</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Standardized Workflow Lifecycle Card (Enterprise ERP Process) ── */}
      <div className="bus-ref-roadmap-card">
        <div className="bus-roadmap-header">
          <div className="bus-roadmap-title-wrap">
            <div className="bus-roadmap-icon-wrap">
              <Layers size={18} />
            </div>
            <div>
              <h3>How the Business Referral Workflow Operates</h3>
              <p>Standardized 4-step institutional lifecycle across all five referral categories</p>
            </div>
          </div>
        </div>

        <div className="bus-roadmap-steps">
          <div className="bus-step-item">
            <div className="bus-step-num">01</div>
            <div className="bus-step-content">
              <h4>Opportunity / Lead Entry</h4>
              <p>Users browse published programs or submit leads with verified applicant consent.</p>
            </div>
          </div>
          <div className="bus-step-connector">
            <ChevronRight size={18} />
          </div>
          <div className="bus-step-item">
            <div className="bus-step-num">02</div>
            <div className="bus-step-content">
              <h4>Partner Processing</h4>
              <p>Bank, insurer, or corporate partner processes application and issues official reference.</p>
            </div>
          </div>
          <div className="bus-step-connector">
            <ChevronRight size={18} />
          </div>
          <div className="bus-step-item">
            <div className="bus-step-num">03</div>
            <div className="bus-step-content">
              <h4>Conversion Verification</h4>
              <p>Institutional audit verifies referral completion (policy issuance, card dispatch, joining).</p>
            </div>
          </div>
          <div className="bus-step-connector">
            <ChevronRight size={18} />
          </div>
          <div className="bus-step-item">
            <div className="bus-step-num">04</div>
            <div className="bus-step-content">
              <h4>Incentive Settlement</h4>
              <p>Approved rewards calculated & settled via institutional reconciliation upon clearance.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detail Modal for Selected Category ── */}
      {previewCategory && (
        <div className="bus-modal-overlay" onClick={() => setPreviewCategory(null)}>
          <div className="bus-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="bus-modal-header" style={{ borderTop: `4px solid ${previewCategory.accentColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="bus-modal-icon-badge" style={{ background: previewCategory.gradient }}>
                  {previewCategory.icon}
                </div>
                <div>
                  <h3 className="bus-modal-title">{previewCategory.title}</h3>
                  <p className="bus-modal-sub">{previewCategory.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                className="bus-modal-close"
                onClick={() => setPreviewCategory(null)}
              >
                ×
              </button>
            </div>

            <div className="bus-modal-body">
              <div className="bus-modal-section">
                <h4>Category Summary</h4>
                <p>{previewCategory.description}</p>
              </div>

              {previewCategory.id === 'incentives' ? (
                <div className="bus-modal-section">
                  <h4>Approved Institutional Rate Cards & Terms</h4>
                  {loadingRules ? (
                    <div className="bus-empty-terms">
                      <p style={{ margin: 0 }}>Checking approved rules from institutional database...</p>
                    </div>
                  ) : approvedRules.length === 0 ? (
                    <div className="bus-empty-terms">
                      <AlertTriangle size={24} style={{ color: '#d97706', marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                        Reward terms depend on approved institutional rules
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                        No approved incentive rate cards are currently available in the database collection.
                      </p>
                    </div>
                  ) : (
                    <div className="bus-rules-list">
                      {approvedRules.map((rule) => (
                        <div key={rule._id || rule.ruleCode} className="bus-rule-card">
                          <div className="bus-rule-header">
                            <span className="bus-rule-title">{rule.ruleName}</span>
                            <span className="bus-rule-badge">{rule.category}</span>
                          </div>
                          <div className="bus-rule-details">
                            <div className="bus-rule-detail-row">
                              <span className="bus-rule-label">Approved Reward:</span>
                              <span className="bus-rule-val" style={{ fontWeight: 700, color: '#059669' }}>
                                {rule.amountType === 'Fixed'
                                  ? `₹${Number(rule.amount).toLocaleString('en-IN')} (Fixed Amount)`
                                  : `${rule.amount}% (Percentage Calculation)`}
                              </span>
                            </div>
                            <div className="bus-rule-detail-row">
                              <span className="bus-rule-label">Verification Milestone:</span>
                              <span className="bus-rule-val">{rule.milestone}</span>
                            </div>
                            <div className="bus-rule-detail-row">
                              <span className="bus-rule-label">Eligibility Conditions:</span>
                              <span className="bus-rule-val">{rule.eligibilityConditions || 'Standard institutional verification'}</span>
                            </div>
                            <div className="bus-rule-detail-row">
                              <span className="bus-rule-label">Consent Requirement:</span>
                              <span className="bus-rule-val">{rule.consentRequirement || 'Mandatory explicit applicant consent recorded'}</span>
                            </div>
                            <div className="bus-rule-detail-row">
                              <span className="bus-rule-label">Disbursement Terms:</span>
                              <span className="bus-rule-val">{rule.disbursementCondition || 'Processed in institutional settlement cycle'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bus-modal-section">
                  <h4>Core Program Features</h4>
                  <ul className="bus-modal-feature-list">
                    {previewCategory.highlights.map((h, i) => (
                      <li key={i}>
                        <Check size={16} style={{ color: previewCategory.accentColor, flexShrink: 0 }} />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bus-modal-meta-grid">
                <div className="bus-meta-card">
                  <span className="bus-meta-title">Incentive Potential</span>
                  <span className="bus-meta-value">{previewCategory.metrics.earningPotential}</span>
                </div>
                <div className="bus-meta-card">
                  <span className="bus-meta-title">Disbursement Terms</span>
                  <span className="bus-meta-value">{previewCategory.metrics.turnaround}</span>
                </div>
                <div className="bus-meta-card">
                  <span className="bus-meta-title">Approval Status</span>
                  <span className="bus-meta-value text-emerald">{previewCategory.metrics.status}</span>
                </div>
              </div>

              <div className="bus-modal-note">
                <Info size={16} style={{ flexShrink: 0 }} />
                <span>
                  {previewCategory.id === 'incentives'
                    ? 'Direct automated payment integration is not active. Disbursements are processed via authorized institutional accounts reconciliation following verified partner milestones. Reward terms depend on approved institutional rules.'
                    : `The full workflow integration for ${previewCategory.title} operates under verified milestone clearance. Reward terms depend on approved institutional rules.`}
                </span>
              </div>
            </div>

            <div className="bus-modal-footer">
              <button
                type="button"
                className="bus-modal-btn-sec"
                onClick={() => setPreviewCategory(null)}
              >
                Close
              </button>

              {rootRole === 'superadmin' && (
                <button
                  type="button"
                  className="bus-modal-btn-sec"
                  style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    const c = previewCategory;
                    setPreviewCategory(null);
                    handleOpenEditModal(c);
                  }}
                >
                  <Edit size={14} />
                  <span>Edit Category</span>
                </button>
              )}

              <button
                type="button"
                className="bus-modal-btn-pri"
                style={{ background: previewCategory.gradient }}
                onClick={() => {
                  const targetId = previewCategory.id;
                  setPreviewCategory(null);
                  navigate(`${basePath}/${targetId}`);
                }}
              >
                <span>{previewCategory.id === 'incentives' ? 'Explore Incentives & Rewards Page' : `Open ${previewCategory.title} Page`}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPER ADMIN EDIT CATEGORY MODAL ── */}
      <EditCategoryModal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        categoryId={editingCategory?.id}
        onSaved={() => setCustomCategoryOverrides(getCustomCategoryOverrides())}
      />
    </div>
  );
}
