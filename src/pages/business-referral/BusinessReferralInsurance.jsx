import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Shield, Heart, Car, UserCheck, Building2,
  ChevronRight, CheckCircle2, ShieldCheck, Lock, FileText,
  Clock, AlertTriangle, Info, X, Check, Award, Loader2, Plus, Edit
} from 'lucide-react';
import { getIncentiveRuleByCategory, getPublishedOpportunities } from '../../api';
import InsuranceReferralModal from '../../components/referrals/InsuranceReferralModal';
import EditCategoryModal from '../../components/referrals/EditCategoryModal';
import CategoryProgramSpotlight from '../../components/referrals/CategoryProgramSpotlight';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralInsurance() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;
  const dashboardPath = `/${rootRole}/dashboard`;

  const { config: categoryConfig } = useCategoryConfig('insurance');
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showRewardTerms, setShowRewardTerms] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCategory, setSubmitCategory] = useState('Health');
  const [submitProvider, setSubmitProvider] = useState('Star Health & Allied Insurance');
  const [termsRule, setTermsRule] = useState(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [termsError, setTermsError] = useState(null);
  const [publishedOpps, setPublishedOpps] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);

  // Specification Matrix Data - strictly derived from real published opportunities


  // Fetch approved Insurance reward terms from backend endpoint
  const fetchInsuranceTerms = useCallback(async () => {
    try {
      setLoadingTerms(true);
      setTermsError(null);
      const res = await getIncentiveRuleByCategory('Insurance');
      if (res && res.data && res.data.success && res.data.data) {
        setTermsRule(res.data.data);
      } else {
        setTermsRule(null);
      }
    } catch (err) {
      console.warn('Insurance reward terms load notice:', err.message);
      setTermsError(err.response?.data?.message || err.message || 'Failed to load approved insurance reward terms.');
      setTermsRule(null);
    } finally {
      setLoadingTerms(false);
    }
  }, []);

  const fetchPublishedOpportunities = useCallback(async () => {
    try {
      setLoadingOpps(true);
      const res = await getPublishedOpportunities({ category: 'Insurance' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const cleanOpps = res.data.data.filter(
          (o) => o.opportunityCode !== 'OPP-INS-2026-001' && o.title !== 'Star Comprehensive Health Insurance Plan'
        );
        setPublishedOpps(cleanOpps);
      }
    } catch (err) {
      console.warn('Notice loading published insurance opportunities:', err.message);
    } finally {
      setLoadingOpps(false);
    }
  }, []);

  useEffect(() => {
    fetchPublishedOpportunities();
  }, [fetchPublishedOpportunities]);

  const handleOpenRewardTerms = () => {
    setShowRewardTerms(true);
    fetchInsuranceTerms();
  };

  const handleOpenSubmit = (catKey, provider) => {
    setSubmitCategory(catKey || 'Health');
    setSubmitProvider(provider || 'Star Health & Allied Insurance');
    setShowSubmitModal(true);
  };

  const isApproved = termsRule && (termsRule.approvalStatus === 'Approved' || (!termsRule.approvalStatus && termsRule.isActive));

  // Real-time published opportunities matrix
  const combinedPolicyMatrix = publishedOpps.map((opp) => {
    const highlights = Array.isArray(opp.keyHighlights) ? opp.keyHighlights : [];
    const sumInsuredMatch = highlights.find((h) => /(sum insured|cover|lakh|crore|₹)/i.test(h));
    const waitingPeriodMatch = highlights.find((h) => /(waiting|period|pre-existing)/i.test(h));
    const cleanSumInsured = sumInsuredMatch || (highlights[0] && !/(waiting|period)/i.test(highlights[0]) ? highlights[0] : '₹5 Lakhs - ₹50 Lakhs');
    const cleanWaitingPeriod = waitingPeriodMatch || (highlights[1] && /(waiting|period)/i.test(highlights[1]) ? highlights[1] : 'Standard Waiting Terms');

    return {
      category: opp.subCategory || 'Health Insurance',
      categoryKey: opp.subCategory?.toLowerCase().includes('motor') ? 'Motor' : opp.subCategory?.toLowerCase().includes('life') ? 'Life' : 'Health',
      partner: opp.providerName || 'Insurance Partner',
      tier: opp.title,
      sumInsured: cleanSumInsured,
      features: opp.description || 'IRDAI registered corporate health policy.',
      waitingPeriod: cleanWaitingPeriod,
      status: 'Live Published',
      isLivePublished: true,
      oppId: opp._id,
      rewardAmount: opp.incentiveConfig?.amount,
      milestone: opp.incentiveConfig?.milestone,
    };
  });

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #10b981, #059669, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Insurance Referral Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Insurance Referral'}</h1>
            <p>
              {categoryConfig?.description || 'IRDAI-accredited institutional insurance programs. Refer students, staff, and family members for health, motor, life, and property coverage.'}
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

            {rootRole === 'superadmin' && (
              <>
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 700 }}
                  onClick={() => setShowEditCategoryModal(true)}
                  title="Configure live title, rewards, turnaround time, description, and highlights"
                >
                  <Edit size={15} />
                  <span>Edit Category Details</span>
                </button>

                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 700 }}
                  onClick={() => navigate('/superadmin/business-referrals')}
                  title="Manage and Edit Insurance Opportunities in Central"
                >
                  <Plus size={15} />
                  <span>Publishing Central</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => handleOpenSubmit('Health', 'Star Health & Allied Insurance')}
            >
              <Plus size={16} />
              <span>+ Submit Referral</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Insurance & Protection'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Compliance: <strong>IRDAI Regulated Digital Onboarding</strong></span>
        </div>
      </div>

      {/* ── Category Program Spotlight & Guided Actions ── */}
      <CategoryProgramSpotlight
        config={categoryConfig}
        rootRole={rootRole}
        onOpenEdit={() => setShowEditCategoryModal(true)}
        onOpenSubmit={() => handleOpenSubmit('Health', 'Star Health & Allied Insurance')}
        onOpenPublish={() => navigate('/superadmin/business-referrals')}
      />

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Shield size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Insurance Classes</span>
            <h3 className="mgmt-kpi-value">4 Offerings</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Underwriter Partners</span>
            <h3 className="mgmt-kpi-value">5+ IRDAI Regulated</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Heart size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Cashless Network</span>
            <h3 className="mgmt-kpi-value">14,000+ Hospitals</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Policy Verification</span>
            <h3 className="mgmt-kpi-value">100% Real-Time</h3>
          </div>
        </div>
      </div>

      {/* ── Approved Offerings Specification Table ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#10b981' }} />
              <span>Approved Policy Offerings Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Accredited institutional underwriter schemes with verified coverage norms and real-time processing tracks
            </p>
          </div>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Insurance Category</th>
                <th style={{ width: '220px' }}>Accredited Partner</th>
                <th style={{ width: '200px' }}>Coverage Plan Tier</th>
                <th style={{ width: '140px' }}>Sum Insured Range</th>
                <th style={{ minWidth: '240px' }}>Key Features & Network</th>
                <th style={{ minWidth: '180px' }}>Waiting Period</th>
                <th style={{ width: '130px' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {combinedPolicyMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <Shield size={38} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>No Insurance Opportunities Published Yet</div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.84rem' }}>
                      Opportunities published by Super Admin from Publishing Central will automatically appear here.
                    </p>
                    {rootRole === 'superadmin' && (
                      <button
                        type="button"
                        className="mgmt-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#059669', display: 'inline-flex', margin: '0 auto' }}
                        onClick={() => navigate('/superadmin/business-referrals')}
                      >
                        <Plus size={14} /> Publish Insurance Opportunity
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                combinedPolicyMatrix.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {row.category}
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                        {row.partner}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-main, #334155)' }}>{row.tier}</td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>{row.sumInsured}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.45' }}>
                      {row.features}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #475569)', lineHeight: '1.45' }}>
                      {row.waitingPeriod}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                        <CheckCircle2 size={11} /> Live (₹{row.rewardAmount || 1500})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#059669', color: '#ffffff', borderColor: '#059669' }}
                        onClick={() => handleOpenSubmit(row.categoryKey, row.partner)}
                      >
                        <span>Refer Insured</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Approved Insurance Reward Terms Modal ── */}
      {showRewardTerms && (
        <div className="bus-modal-overlay" onClick={() => setShowRewardTerms(false)}>
          <div className="bus-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="bus-modal-header" style={{ borderTop: `4px solid #10b981` }}>
              <div>
                <h3 className="bus-modal-title">Insurance Referral Terms & Rate Cards</h3>
                <p className="bus-modal-sub">Real-time reward rules retrieved from active ERP rate schedule</p>
              </div>
              <button
                type="button"
                className="bus-modal-close"
                onClick={() => setShowRewardTerms(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bus-modal-body">
              {loadingTerms ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 size={32} className="animate-spin text-emerald" style={{ margin: '0 auto 12px auto' }} />
                  <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>Querying institutional database for Insurance terms...</p>
                </div>
              ) : termsError ? (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
                    <AlertTriangle size={16} />
                    <span>Rate Schedule Notification</span>
                  </div>
                  <p style={{ margin: 0 }}>{termsError}</p>
                </div>
              ) : !termsRule ? (
                <div style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
                    <Info size={16} />
                    <span>Default Institutional Rule Schedule</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0' }}>
                    Insurance referrals earn rewards upon verified policy issuance and clearance of the statutory free-look period.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '14px', background: isApproved ? '#ecfdf5' : '#fffbeb', border: `1px solid ${isApproved ? '#a7f3d0' : '#fde68a'}`, borderRadius: '8px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '0.92rem', color: isApproved ? '#065f46' : '#92400e' }}>
                        {termsRule.ruleName || 'Institutional Insurance Referral Policy'}
                      </strong>
                      <span className={`badge ${isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {termsRule.approvalStatus || (termsRule.isActive ? 'Active' : 'Pending')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>Reward Type:</span>
                        <div style={{ fontWeight: 600 }}>{termsRule.rewardType || 'Percentage / Fixed'}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>Reward Value:</span>
                        <div style={{ fontWeight: 700, color: '#059669' }}>
                          {termsRule.rewardType === 'Percentage' ? `${termsRule.rewardValue}% of Premium` : `₹${termsRule.rewardValue || '500'}`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bus-modal-section">
                    <h4>Institutional Guidelines</h4>
                    <p>{termsRule.description || 'Insurance referral rewards are processed following underwriter premium confirmation and compliance validation.'}</p>
                  </div>
                </>
              )}
            </div>

            <div className="bus-modal-footer">
              <button
                type="button"
                className="bus-modal-btn-sec"
                onClick={() => setShowRewardTerms(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Real Multi-Step Insurance Referral Modal ── */}
      <InsuranceReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultCategory={submitCategory}
        defaultProvider={submitProvider}
        rootRole={rootRole}
      />

      {/* ── Super Admin Edit Category Modal ── */}
      <EditCategoryModal
        isOpen={showEditCategoryModal}
        onClose={() => setShowEditCategoryModal(false)}
        categoryId="insurance"
      />
    </div>
  );
}
