import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CreditCard, LayoutDashboard, Clock, FileText,
  Building2, Check, Plus, ChevronRight, Award, Shield, Layers, Edit, CheckCircle2
} from 'lucide-react';
import { getPublishedOpportunities } from '../../api';
import CreditCardReferralModal from '../../components/referrals/CreditCardReferralModal';
import EditCategoryModal from '../../components/referrals/EditCategoryModal';
import CategoryProgramSpotlight from '../../components/referrals/CategoryProgramSpotlight';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralCreditCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;
  const dashboardPath = `/${rootRole}/dashboard`;

  const { config: categoryConfig } = useCategoryConfig('credit-card');
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [publishedCards, setPublishedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const fetchCreditCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      const res = await getPublishedOpportunities({ category: 'Credit Card' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const cleanCards = res.data.data.filter(
          (c) => c.opportunityCode !== 'OPP-CRD-2026-001' && c.title !== 'HDFC Millennia Cashback Credit Card'
        );
        setPublishedCards(cleanCards);
      }
    } catch (err) {
      console.warn('Notice loading credit cards:', err.message);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditCards();
  }, [fetchCreditCards]);

  const handleOpenSubmit = (bankName) => {
    setSelectedBank(bankName || 'HDFC Bank');
    setShowSubmitModal(true);
  };

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #2563eb, #10b981, #06b6d4)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Business Referral Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Credit Card Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Explore credit card referral opportunities, institutional partner cards, eligibility criteria, and application processing rules.'}
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
                  title="Manage and Publish Credit Card Opportunities in Central"
                >
                  <Plus size={15} />
                  <span>Publishing Central</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => handleOpenSubmit('HDFC Bank')}
            >
              <Plus size={16} />
              <span>+ Submit Referral</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Banking & Cards'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Network Status: <strong>Live Verified Institutional Partners</strong></span>
        </div>
      </div>

      {/* ── Category Program Spotlight & Guided Actions ── */}
      <CategoryProgramSpotlight
        config={categoryConfig}
        rootRole={rootRole}
        onOpenEdit={() => setShowEditCategoryModal(true)}
        onOpenSubmit={() => handleOpenSubmit('HDFC Bank')}
        onOpenPublish={() => navigate('/superadmin/business-referrals')}
      />

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Approved Banks</span>
            <h3 className="mgmt-kpi-value">4 Partners</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Shield size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Digital KYC</span>
            <h3 className="mgmt-kpi-value">100% Video KYC</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <CreditCard size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Annual Fee Variants</span>
            <h3 className="mgmt-kpi-value">Lifetime Free</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Verification Trigger</span>
            <h3 className="mgmt-kpi-value">Card Dispatch</h3>
          </div>
        </div>
      </div>

      {/* ── Approved Banking Cards Specification Table ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#2563eb' }} />
              <span>Approved Banking Cards Specification Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Compare partner bank terms, minimum criteria, and submit direct candidate referrals
            </p>
          </div>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Banking Partner</th>
                <th style={{ width: '220px' }}>Popular Card Variant</th>
                <th style={{ minWidth: '240px' }}>Key Perks & Cashbacks</th>
                <th style={{ minWidth: '240px' }}>Minimum Criteria</th>
                <th style={{ width: '160px' }}>Processing Mode</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Direct Action</th>
              </tr>
            </thead>
            <tbody>
              {publishedCards.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <CreditCard size={38} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>No Credit Card Opportunities Published Yet</div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.84rem' }}>
                      Opportunities published by Super Admin from Publishing Central will automatically appear here.
                    </p>
                    {rootRole === 'superadmin' && (
                      <button
                        type="button"
                        className="mgmt-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#2563eb', display: 'inline-flex', margin: '0 auto' }}
                        onClick={() => navigate('/superadmin/business-referrals')}
                      >
                        <Plus size={14} /> Publish Credit Card Opportunity
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                publishedCards.map((card, idx) => (
                  <tr key={card._id || idx}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{card.providerName}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                        {card.opportunityCode || 'Active Card'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-main, #334155)' }}>
                      {card.title}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.45' }}>
                      {card.description}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #475569)', lineHeight: '1.45' }}>
                      {card.keyHighlights?.[0] || 'Standard Underwriting Criteria'}
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, background: '#dcfce7', color: '#15803d', border: '1px solid #86efac' }}>
                        <CheckCircle2 size={11} /> Live (₹{card.incentiveConfig?.amount || 0})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
                        onClick={() => handleOpenSubmit(card.providerName)}
                      >
                        <span>Refer Now</span>
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

      {/* ── Multi-Step Credit Card Referral Modal ── */}
      <CreditCardReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultBank={selectedBank}
        rootRole={rootRole}
      />

      {/* ── Super Admin Edit Category Modal ── */}
      <EditCategoryModal
        isOpen={showEditCategoryModal}
        onClose={() => setShowEditCategoryModal(false)}
        categoryId="credit-card"
      />
    </div>
  );
}
