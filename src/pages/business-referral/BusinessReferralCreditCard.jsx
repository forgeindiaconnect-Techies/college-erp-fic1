import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CreditCard, Building2, Shield, Clock, Plus, Search, CheckCircle2,
  ChevronRight, ArrowLeft, Sliders, FileText, Award, Sparkles,
  Filter, Check, ExternalLink, AlertCircle, RefreshCw
} from 'lucide-react';
import { getPublicReferralFormConfig, getPublishedOpportunities } from '../../api';
import CreditCardReferralModal from '../../components/referrals/CreditCardReferralModal';
import BusinessReferralCategoryNav from '../../components/referrals/BusinessReferralCategoryNav';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralCreditCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;

  const { config: categoryConfig } = useCategoryConfig('credit-card');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [searchQuery, setSearchQuery] = useState('');
  const [bankFilter, setBankFilter] = useState('ALL');

  // Live Database Configuration from Super Admin ReferralFormConfig
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Published Opportunities
  const [publishedCards, setPublishedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await getPublicReferralFormConfig('Credit Card');
      if (res?.data?.success && res.data.data) {
        setDbConfig(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading credit card DB config:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchCreditCards = useCallback(async () => {
    try {
      setLoadingCards(true);
      const res = await getPublishedOpportunities({ category: 'Credit Card' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setPublishedCards(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading credit card published opportunities:', err.message);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchCreditCards();
  }, [fetchConfig, fetchCreditCards]);

  const handleOpenSubmit = (bankName) => {
    setSelectedBank(bankName || 'HDFC Bank');
    setShowSubmitModal(true);
  };

  // Extract active partners & build combined approved products matrix
  const partnersList = useMemo(() => {
    if (!dbConfig?.partners || !Array.isArray(dbConfig.partners)) {
      return [];
    }
    return dbConfig.partners.filter((p) => p.isActive !== false);
  }, [dbConfig]);

  // Aggregate products from all active partners into matrix
  const cardProductsMatrix = useMemo(() => {
    const list = [];
    partnersList.forEach((partner) => {
      (partner.products || []).forEach((prod) => {
        if (prod.isActive !== false) {
          list.push({
            id: prod.id || `${partner.code}-${prod.name}`,
            partnerName: partner.name,
            partnerCode: partner.code,
            partnerWebsite: partner.website,
            cardName: prod.name,
            productCategory: prod.productCategory || 'Standard',
            annualFee: prod.annualFee || 'Free / Waived',
            eligibilityConditions: prod.eligibilityConditions || 'Standard KYC & Income Verification',
            requiredDocuments: prod.requiredDocuments || ['PAN Card', 'Aadhaar Card'],
            turnaroundTime: prod.turnaroundTime || '2-4 business days',
            isPublishedOpp: false
          });
        }
      });
    });

    // Merge any distinct published opportunities
    publishedCards.forEach((opp) => {
      if (!list.some((item) => item.cardName.toLowerCase() === (opp.title || '').toLowerCase())) {
        list.push({
          id: opp._id || opp.opportunityCode,
          partnerName: opp.providerName || 'Partner Bank',
          partnerCode: 'OPP',
          cardName: opp.title,
          productCategory: opp.subCategory || 'Featured',
          annualFee: 'Institutional Exclusive',
          eligibilityConditions: opp.description || 'Standard Underwriting Criteria',
          requiredDocuments: opp.requiredDocuments || ['PAN Card', 'Aadhaar Card'],
          turnaroundTime: '2-3 business days',
          isPublishedOpp: true
        });
      }
    });

    return list;
  }, [partnersList, publishedCards]);

  const filteredCardProducts = useMemo(() => {
    return cardProductsMatrix.filter((item) => {
      const matchesSearch =
        (item.cardName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.partnerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.productCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.eligibilityConditions || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBank = bankFilter === 'ALL' || item.partnerName === bankFilter;
      return matchesSearch && matchesBank;
    });
  }, [cardProductsMatrix, searchQuery, bankFilter]);

  return (
    <div className="management-page animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* ── Top Category Tabs Navigation ── */}
      <BusinessReferralCategoryNav activeCategory="credit-card" />

      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #2563eb, #10b981, #06b6d4)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Live Verified Credit Card Partner Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Credit Card Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Explore credit card referral opportunities, institutional partner banks, approved card products, eligibility criteria, and submit direct applicant referrals.'}
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
              <button
                type="button"
                className="mgmt-btn-secondary"
                style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', fontWeight: 700 }}
                onClick={() => navigate('/superadmin/referral-settings')}
                title="Configure Partner Banks, Products & Fields"
              >
                <Sliders size={15} />
                <span>Form Settings</span>
              </button>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              style={{ background: '#2563eb', borderColor: '#2563eb' }}
              onClick={() => handleOpenSubmit('HDFC Bank')}
              title="Submit a student or faculty credit card referral application"
            >
              <Plus size={16} />
              <span>Submit Credit Card Referral</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Banking & Cards'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Partner Banks: <strong>{partnersList.length} Verified</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Approved Card Products: <strong>{cardProductsMatrix.length} Variants</strong></span>
        </div>
      </div>

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Partner Banks</span>
            <h3 className="mgmt-kpi-value">{partnersList.length} Active</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CreditCard size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Approved Card Products</span>
            <h3 className="mgmt-kpi-value">{cardProductsMatrix.length} Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Shield size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Digital KYC</span>
            <h3 className="mgmt-kpi-value">100% Video KYC</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Processing SLA</span>
            <h3 className="mgmt-kpi-value">2-4 Days</h3>
          </div>
        </div>
      </div>

      {/* ── Verified Banking Partners Directory ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: '#2563eb' }} />
              <span>Verified Institutional Banking Partners</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Official banking tie-ups authorized for referral incentives, instant pre-approvals, and prioritized application processing.
            </p>
          </div>
          {rootRole === 'superadmin' && (
            <button
              type="button"
              className="mgmt-btn-secondary"
              style={{ fontSize: '0.78rem', padding: '5px 12px' }}
              onClick={() => navigate('/superadmin/referral-settings')}
            >
              <Sliders size={13} />
              <span>Configure Partners</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {partnersList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
              <Building2 size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>No Partner Banks Configured Yet</h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#64748b' }}>
                All dummy banks and products have been removed. Use Form Settings to add your verified banking partners and card products.
              </p>
              {rootRole === 'superadmin' && (
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                  onClick={() => navigate('/superadmin/referral-settings')}
                >
                  <Sliders size={14} />
                  <span>Configure Partners in Form Settings</span>
                </button>
              )}
            </div>
          ) : (
            partnersList.map((partner) => {
            const productCount = (partner.products || []).filter((p) => p.isActive !== false).length;
            const isSelectedFilter = bankFilter === partner.name;
            return (
              <div
                key={partner.id || partner.name}
                style={{
                  background: isSelectedFilter ? '#eff6ff' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelectedFilter ? '#2563eb' : 'var(--border-color, #e2e8f0)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onClick={() => setBankFilter(isSelectedFilter ? 'ALL' : partner.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
                      {partner.code?.slice(0, 3) || partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{partner.name}</h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{partner.code || 'Banking Partner'}</span>
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Approved Cards: <strong>{productCount}</strong></span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSubmit(partner.name);
                    }}
                  >
                    <span>Refer</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* ── Approved Credit Cards Specification Matrix ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#2563eb' }} />
              <span>Approved Credit Cards Specification Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Compare partner bank terms, minimum criteria, annual fees, and submit direct candidate referrals
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter by Bank */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: '#64748b' }} />
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.82rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  fontWeight: 600
                }}
              >
                <option value="ALL">All Banks ({cardProductsMatrix.length})</option>
                {partnersList.map((p) => (
                  <option key={p.id || p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search cards, fees, terms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-main, #0f172a)'
                }}
              />
            </div>
          </div>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Banking Partner</th>
                <th style={{ width: '220px' }}>Approved Card Product</th>
                <th style={{ minWidth: '180px' }}>Annual Fee & Waiver</th>
                <th style={{ minWidth: '240px' }}>Minimum Eligibility Criteria</th>
                <th style={{ width: '170px' }}>Required Documents</th>
                <th style={{ width: '140px' }}>Turnaround SLA</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Direct Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingConfig && cardProductsMatrix.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading verified credit card specifications...
                  </td>
                </tr>
              ) : filteredCardProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <CreditCard size={38} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {cardProductsMatrix.length === 0 ? 'No Credit Card Products Configured Yet' : 'No Matching Cards Found'}
                    </div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.84rem' }}>
                      {cardProductsMatrix.length === 0
                        ? 'All dummy credit card data has been removed. You can now add new verified banking partners and card products in Form Settings.'
                        : 'Try clearing search filters or add products in Super Admin Referral Settings.'}
                    </p>
                    {cardProductsMatrix.length === 0 && rootRole === 'superadmin' ? (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                        onClick={() => navigate('/superadmin/referral-settings')}
                      >
                        <Sliders size={14} />
                        <span>Add Products in Form Settings</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', margin: '0 auto' }}
                        onClick={() => { setSearchQuery(''); setBankFilter('ALL'); }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredCardProducts.map((card, idx) => (
                  <tr key={card.id || idx}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{card.partnerName}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>
                        {card.partnerCode || 'Verified Bank'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{card.cardName}</div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b', display: 'inline-block', marginTop: '2px' }}>
                        Category: <strong>{card.productCategory}</strong>
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#047857' }}>
                        {card.annualFee}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #475569)', lineHeight: '1.45' }}>
                      {card.eligibilityConditions}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: '#475569' }}>
                        {card.requiredDocuments?.map((doc, dIdx) => (
                          <span key={dIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} style={{ color: '#10b981' }} /> {doc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        <Clock size={11} /> {card.turnaroundTime}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
                        onClick={() => handleOpenSubmit(card.partnerName)}
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
    </div>
  );
}
