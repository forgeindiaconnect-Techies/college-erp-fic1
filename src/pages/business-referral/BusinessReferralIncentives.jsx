import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Award, CreditCard, Shield, Briefcase, Landmark,
  ChevronRight, CheckCircle2, Clock, RefreshCw, X, Check, Database,
  FileCheck2, ShieldCheck, Loader2, Edit
} from 'lucide-react';
import { getIncentiveRules } from '../../api';
import BusinessReferralCategoryNav from '../../components/referrals/BusinessReferralCategoryNav';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralIncentives() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;
  const dashboardPath = `/${rootRole}/dashboard`;

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [rulesList, setRulesList] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState(null);

  // 4 Core Referral Incentive Programs
  const incentivePrograms = [
    {
      id: 'credit-card',
      title: 'Credit Cards',
      category: 'Banking & Cards',
      canonicalCategory: 'Credit Card',
      badge: 'Partner Banking',
      overview: 'Reward disbursement terms for successful institutional credit card allocations.',
      verificationTrigger: 'Physical card dispatch & activation confirmation',
      baseReward: '₹500 - ₹1,500 per approved card',
      eligibilityTerms: [
        'Applicant must meet minimum partner bank income and credit score criteria (CIBIL 700+).',
        'Primary applicant consent must be recorded prior to application routing.',
        'Incentive credited solely upon partner bank verification of successful dispatch.'
      ],
      disbursementTimeline: 'Processed in the subsequent institutional bi-weekly settlement cycle.'
    },
    {
      id: 'insurance',
      title: 'Insurance',
      category: 'Health & Life Protection',
      canonicalCategory: 'Insurance',
      badge: 'IRDAI Regulated',
      overview: 'Reward terms across authorized health, motor, and term life insurance plans.',
      verificationTrigger: 'Official policy generation & premium clearance',
      baseReward: '5% - 15% of first-year premium',
      eligibilityTerms: [
        'Policies must be underwritten by accredited institutional insurance partners.',
        'Free-look statutory cancellation period must lapse prior to final milestone confirmation.',
        'Incentives correspond to approved institutional partner commission schedules.'
      ],
      disbursementTimeline: 'Cleared upon underwriter reconciliation statement release.'
    },
    {
      id: 'job-referral',
      title: 'Jobs & Internships',
      category: 'Talent Acquisition',
      canonicalCategory: 'Job',
      badge: 'Corporate Network',
      overview: 'Referral reward terms for corporate candidate hiring, onboarding, and placement.',
      verificationTrigger: 'Candidate onboarding & completion of initial joining milestone',
      baseReward: '₹2,000 - ₹10,000 per verified joining',
      eligibilityTerms: [
        'Candidate must not be an active applicant in the employer database within the last 6 months.',
        'Requires documented candidate consent and formal interview clearance.',
        'Milestone verified via appointment letter or employee ID confirmation.'
      ],
      disbursementTimeline: 'Disbursed following verified candidate joining and attendance verification.'
    },
    {
      id: 'account-opening',
      title: 'Account Opening',
      category: 'Digital Banking',
      canonicalCategory: 'Bank Account',
      badge: 'Video-KYC',
      overview: 'Reward terms for zero-balance student and institutional salary bank accounts.',
      verificationTrigger: 'Successful digital Video-KYC completion & account allocation',
      baseReward: '₹150 - ₹400 per activated account',
      eligibilityTerms: [
        'Applicant must successfully pass partner bank digital Video-KYC verification.',
        'Account must record successful initial deposit or active mobile banking registration.',
        'Single reward per eligible individual customer profile.'
      ],
      disbursementTimeline: 'Reconciled bi-weekly via partner core banking system reports.'
    }
  ];

  // Fetch approved incentive rules from real backend database
  const fetchRules = useCallback(async () => {
    try {
      setLoadingRules(true);
      setRulesError(null);
      const res = await getIncentiveRules();
      if (res && res.data && res.data.success && Array.isArray(res.data.data)) {
        setRulesList(res.data.data);
      } else if (res && res.data && Array.isArray(res.data)) {
        setRulesList(res.data);
      } else {
        setRulesList([]);
      }
    } catch (err) {
      console.warn('Backend incentive rules load notification:', err.message);
      setRulesError(err.response?.data?.message || err.message || 'Failed to load approved incentive rules from server.');
      setRulesList([]);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Lookup matching rule from database collection
  const getRuleForProgram = (program) => {
    if (!program || !rulesList || rulesList.length === 0) return null;
    return rulesList.find((r) => {
      const cat = (r.category || '').toLowerCase();
      const target = (program.canonicalCategory || program.title || '').toLowerCase();
      if (target.includes('card') && cat.includes('card')) return true;
      if (target.includes('insurance') && cat.includes('insurance')) return true;
      if (target.includes('job') && cat.includes('job')) return true;
      if ((target.includes('bank') || target.includes('account')) && (cat.includes('bank') || cat.includes('account'))) return true;
      return false;
    });
  };

  const matchedRule = selectedProgram ? getRuleForProgram(selectedProgram) : null;
  const isRuleApproved = matchedRule && (matchedRule.approvalStatus === 'Approved' || (!matchedRule.approvalStatus && matchedRule.isActive));

  return (
    <div className="management-page animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* ── Top Category Tabs Navigation ── */}
      <BusinessReferralCategoryNav activeCategory="incentives" />

      {/* ── Real-Time ERP Header Card (Matches Screenshot 3 standard) ── */}
      <div className="mgmt-header-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706, #10b981)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Institutional Incentive Rate Sync Active</span>
            </div>
            <h1>Incentives</h1>
            <p>
              Transparent, audit-reconciled referral rate schedules. Review approved incentive rules, eligibility conditions,
              and verification milestones across all four business referral categories.
            </p>
          </div>

          <div className="mgmt-header-actions">
            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={() => navigate(basePath)}
            >
              <ArrowLeft size={15} />
              <span>All Categories</span>
            </button>

            <button
              type="button"
              className="mgmt-btn-secondary"
              onClick={() => navigate(`/${rootRole}/referrals`)}
            >
              <Clock size={15} />
              <span>Payout History</span>
            </button>

            {rootRole === 'superadmin' && (
              <button
                type="button"
                className="mgmt-btn-secondary"
                style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700 }}
                onClick={() => navigate('/superadmin/business-referrals')}
                title="Manage and Edit Incentives & Opportunities in Central"
              >
                <Edit size={15} />
                <span>Publishing & Edit Central</span>
              </button>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              onClick={fetchRules}
            >
              <RefreshCw size={15} className={loadingRules ? 'animate-spin' : ''} />
              <span>Sync Rules</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Governance: <strong>Approved Database Rate Cards</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Cycle: <strong>Bi-Weekly (1st & 15th of Each Month)</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Audit Standard: <strong>100% Reconciled Disbursal</strong></span>
        </div>
      </div>

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Award size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Regulated Streams</span>
            <h3 className="mgmt-kpi-value">4 Streams</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Settlement Frequency</span>
            <h3 className="mgmt-kpi-value">Bi-Weekly Cycle</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Database size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Active Rate Cards</span>
            <h3 className="mgmt-kpi-value">
              {loadingRules ? 'Syncing...' : rulesList.length > 0 ? `${rulesList.length} Active` : 'Base Cards'}
            </h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <FileCheck2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Compliance Standard</span>
            <h3 className="mgmt-kpi-value">100% Audited</h3>
          </div>
        </div>
      </div>

      {/* ── Active Institutional Rate Schedule Specification Table ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} style={{ color: '#f59e0b' }} />
              <span>Institutional Incentive Rate Cards & Payout Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Verified schedule of referral commissions and milestone conditions applied to member submissions
            </p>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
            <ShieldCheck size={13} />
            <span>Audited & Active</span>
          </span>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Referral Category</th>
                <th style={{ width: '220px' }}>Approved Partners / Offerings</th>
                <th style={{ minWidth: '220px' }}>Rate Schedule Name</th>
                <th style={{ width: '180px' }}>Reward Amount / Structure</th>
                <th style={{ minWidth: '240px' }}>Milestone Verification Trigger</th>
                <th style={{ width: '140px' }}>Disbursal Cycle</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loadingRules ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={18} className="animate-spin text-amber-500" />
                      <span>Syncing approved institutional rate schedules from database...</span>
                    </div>
                  </td>
                </tr>
              ) : rulesList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#fffbeb', color: '#f59e0b', marginBottom: '0.75rem' }}>
                      <Award size={26} />
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                      No Incentive Rate Cards Configured Yet
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
                      {rootRole === 'superadmin' 
                        ? 'No active incentive rate rules exist in the database. Super Admin can manage approved incentive structures in Publishing & Opportunity Central.'
                        : 'Approved institutional incentive rate cards will appear here dynamically once published by Super Admin.'}
                    </div>
                    {rootRole === 'superadmin' && (
                      <button
                        type="button"
                        className="mgmt-btn-primary"
                        style={{ margin: '0 auto', background: '#f59e0b' }}
                        onClick={() => navigate('/superadmin/business-referrals')}
                      >
                        <Edit size={15} /> Open Publishing & Opportunity Central
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rulesList.map((item, idx) => {
                  const catName = item.category || 'General';
                  const name = item.ruleName || `${catName} Incentive Rule`;
                  const offering = item.offering || (catName ? `${catName} Network Products` : 'Standard Catalog Offerings');
                  const reward = item.rewardValue
                    ? (item.rewardType === 'Percentage' ? `${item.rewardValue}% of Value` : `₹${Number(item.rewardValue).toLocaleString('en-IN')}`)
                    : (typeof item.amount === 'number'
                        ? (item.amountType === 'Percentage' ? `${item.amount}% (Percentage Calculation)` : `₹${Number(item.amount).toLocaleString('en-IN')} (Fixed Amount)`)
                        : item.structure || 'As per partner policy');
                  const trigger = item.milestone || item.verificationTrigger || item.trigger || 'Physical card dispatch / milestone verification';
                  const cycle = item.disbursementCondition || item.cycle || 'Institutional settlement cycle';
                  const status = item.approvalStatus || item.status || 'Active';

                  return (
                    <tr key={item._id || item.id || idx}>
                      <td style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                        {catName}
                      </td>
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                          {offering}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #334155)', fontWeight: 600 }}>{name}</td>
                      <td style={{ fontWeight: 700, color: '#059669' }}>{reward}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.45' }}>
                        {trigger}
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #475569)', lineHeight: '1.45' }}>{cycle}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                          <Check size={11} /> {status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="mgmt-btn-secondary"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const prog = incentivePrograms.find(p => 
                              (p.canonicalCategory && catName && p.canonicalCategory.toLowerCase().includes(catName.toLowerCase())) ||
                              (p.canonicalCategory && catName && catName.toLowerCase().includes(p.canonicalCategory.toLowerCase()))
                            ) || incentivePrograms[0];

                            const formattedTerms = (item.eligibilityConditions || item.consentRequirement || item.disbursementCondition)
                              ? [
                                  item.eligibilityConditions ? `Eligibility: ${item.eligibilityConditions}` : null,
                                  item.consentRequirement ? `Consent: ${item.consentRequirement}` : null,
                                  item.disbursementCondition ? `Disbursement: ${item.disbursementCondition}` : null
                                ].filter(Boolean)
                              : (item.terms || item.eligibilityTerms || prog.eligibilityTerms || []);

                            setSelectedProgram({
                              ...prog,
                              ruleName: name,
                              offering,
                              reward,
                              trigger,
                              cycle,
                              status,
                              categoryName: catName,
                              overview: item.description || prog.overview,
                              rawTerms: formattedTerms
                            });
                          }}
                        >
                          <span>View Terms</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── INCENTIVE TERMS & CONDITIONS MODAL ── */}
      {selectedProgram && (
        <div
          className="ref-modal-overlay"
          onClick={() => setSelectedProgram(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
        >
          <div
            className="ref-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e2e8f0',
              animation: 'persFade 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Award size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#fef3c7',
                        color: '#92400e'
                      }}
                    >
                      {selectedProgram.categoryName || selectedProgram.category}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#dcfce7',
                        color: '#166534'
                      }}
                    >
                      {selectedProgram.status || 'Active & Audited'}
                    </span>
                  </div>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedProgram.ruleName || selectedProgram.title} Terms
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProgram(null)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Summary Banner */}
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <ShieldCheck size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.84rem', color: '#92400e', lineHeight: 1.5 }}>
                  <strong>Institutional Policy Directive:</strong> {selectedProgram.overview || 'Standard institutional partner terms apply. Incentive earnings are credited post verification of milestone fulfillment.'}
                </div>
              </div>

              {/* Grid of Key Specifications */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reward Value</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
                    {selectedProgram.reward || selectedProgram.baseReward}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Approved Offerings</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                    {selectedProgram.offering || 'Accredited Catalog'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Milestone Verification Trigger</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
                    {selectedProgram.trigger || selectedProgram.verificationTrigger}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Disbursal Settlement Cycle</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
                    {selectedProgram.cycle || selectedProgram.disbursementTimeline}
                  </div>
                </div>
              </div>

              {/* Eligibility & Conditions */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileCheck2 size={16} style={{ color: '#2563eb' }} />
                  <span>Mandatory Eligibility & Compliance Guidelines</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(Array.isArray(selectedProgram.rawTerms) && selectedProgram.rawTerms.length > 0
                    ? selectedProgram.rawTerms
                    : selectedProgram.eligibilityTerms || []
                  ).map((term, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        background: '#f1f5f9',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.83rem',
                        color: '#334155'
                      }}
                    >
                      <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ lineHeight: 1.45 }}>{typeof term === 'string' ? term : JSON.stringify(term)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <button
                type="button"
                className="mgmt-btn-secondary"
                onClick={() => setSelectedProgram(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="mgmt-btn-primary"
                style={{ background: '#f59e0b' }}
                onClick={() => {
                  setSelectedProgram(null);
                  navigate(`/${rootRole}/business-referral/my-referrals`);
                }}
              >
                <span>Go to My Submissions</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
