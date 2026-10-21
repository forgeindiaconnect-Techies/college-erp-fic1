import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Building2, Landmark, Wallet, ShieldCheck, Clock, Plus,
  Search, Filter, CheckCircle2, ChevronRight, ArrowLeft, Sliders,
  Check, FileText, Award, RefreshCw, Sparkles
} from 'lucide-react';
import { getPublicReferralFormConfig, getPublishedOpportunities } from '../../api';
import AccountOpeningReferralModal from '../../components/referrals/AccountOpeningReferralModal';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralAccountOpening() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;

  const { config: categoryConfig } = useCategoryConfig('account-opening');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitAccountType, setSubmitAccountType] = useState('Savings Account');
  const [submitBank, setSubmitBank] = useState('HDFC Bank');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');

  // Live Database Configuration from ReferralFormConfig
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Published Opportunities
  const [publishedAccounts, setPublishedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await getPublicReferralFormConfig('Bank Account');
      if (res?.data?.success && res.data.data) {
        setDbConfig(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading bank account DB config:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const res = await getPublishedOpportunities({ category: 'Bank Account' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setPublishedAccounts(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading account published opportunities:', err.message);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchAccounts();
  }, [fetchConfig, fetchAccounts]);

  const handleOpenSubmit = (accountType, bankName) => {
    setSubmitAccountType(accountType || 'Savings Account');
    setSubmitBank(bankName || 'HDFC Bank');
    setShowSubmitModal(true);
  };

  // Extract active partner banks & categories
  const partnersList = useMemo(() => {
    if (!dbConfig?.partners || !Array.isArray(dbConfig.partners)) {
      return [];
    }
    return dbConfig.partners.filter((p) => p.isActive !== false);
  }, [dbConfig]);

  const accountCategories = useMemo(() => {
    if (dbConfig?.categoriesList && Array.isArray(dbConfig.categoriesList) && dbConfig.categoriesList.length > 0) {
      return dbConfig.categoriesList;
    }
    return ['Student Zero-Balance', 'Regular Savings', 'Corporate Salary', 'Current Account'];
  }, [dbConfig]);

  // Aggregate account products into full specification matrix
  const accountsMatrix = useMemo(() => {
    const list = [];
    partnersList.forEach((partner) => {
      (partner.products || []).forEach((prod) => {
        if (prod.isActive !== false) {
          list.push({
            id: prod.id || `${partner.code}-${prod.name}`,
            bankName: partner.name,
            bankCode: partner.code,
            productName: prod.name,
            accountCategory: prod.productCategory || 'Savings Account',
            depositRules: prod.annualFee || 'Zero Balance / No Minimum MAB',
            eligibility: prod.eligibilityConditions || 'Valid PAN & Aadhaar. 100% Instant Video KYC.',
            requiredDocuments: prod.requiredDocuments || ['Aadhaar Card', 'PAN Card', 'Student ID / Employment ID'],
            turnaroundTime: prod.turnaroundTime || 'Instant Digital Account',
            isPublishedOpp: false
          });
        }
      });
    });

    publishedAccounts.forEach((opp) => {
      if (!list.some((item) => item.productName.toLowerCase() === (opp.title || '').toLowerCase())) {
        list.push({
          id: opp._id || opp.opportunityCode,
          bankName: opp.providerName || 'Partner Bank',
          bankCode: 'BANK',
          productName: opp.title,
          accountCategory: opp.subCategory || 'Savings Account',
          depositRules: opp.keyHighlights?.[0] || 'Zero Balance Account',
          eligibility: opp.description || 'Standard Video KYC & Account Opening Eligibility',
          requiredDocuments: opp.requiredDocuments || ['Aadhaar Card', 'PAN Card'],
          turnaroundTime: '24-48 Hours',
          isPublishedOpp: true
        });
      }
    });

    return list;
  }, [partnersList, publishedAccounts]);

  const filteredAccounts = useMemo(() => {
    return accountsMatrix.filter((item) => {
      const matchesSearch =
        (item.productName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.bankName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.accountCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.eligibility || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || item.accountCategory.toLowerCase() === categoryFilter.toLowerCase();
      const matchesBank = bankFilter === 'ALL' || item.bankName === bankFilter;

      return matchesSearch && matchesCategory && matchesBank;
    });
  }, [accountsMatrix, searchQuery, categoryFilter, bankFilter]);

  return (
    <div className="management-page animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #9333ea, #7e22ce, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Live Scheduled Commercial Banking Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Bank Account Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Explore partner banks, student & corporate account categories, approved banking products, and submit zero-balance account referrals.'}
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
                title="Configure Partner Banks, Account Products & Form Fields"
              >
                <Sliders size={15} />
                <span>Form Settings</span>
              </button>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
              onClick={() => handleOpenSubmit('Savings Account', 'HDFC Bank')}
            >
              <Plus size={16} />
              <span>Submit Bank Account Referral</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Digital Accounts & Deposits'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Partner Banks: <strong>{partnersList.length} Scheduled Banks</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Approved Products: <strong>{accountsMatrix.length} Account Variants</strong></span>
        </div>
      </div>

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Partner Banks</span>
            <h3 className="mgmt-kpi-value">{partnersList.length} Scheduled</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Landmark size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Approved Products</span>
            <h3 className="mgmt-kpi-value">{accountsMatrix.length} Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Wallet size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Zero-Balance Variants</span>
            <h3 className="mgmt-kpi-value">₹0 MAB Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Digital KYC</span>
            <h3 className="mgmt-kpi-value">100% Video KYC</h3>
          </div>
        </div>
      </div>

      {/* ── Account Categories Selector / Highlights ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} style={{ color: '#7e22ce' }} />
              <span>Banking Account Categories & Special Offerings</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Select an account category to filter partner bank options and minimum initial deposit rules.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {accountCategories.map((cat) => {
            const isSelected = categoryFilter.toLowerCase() === cat.toLowerCase();
            const count = accountsMatrix.filter((a) => a.accountCategory.toLowerCase() === cat.toLowerCase()).length;
            return (
              <div
                key={cat}
                onClick={() => setCategoryFilter(isSelected ? 'ALL' : cat)}
                style={{
                  background: isSelected ? '#faf5ff' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelected ? '#9333ea' : 'var(--border-color, #e2e8f0)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: isSelected ? '#9333ea' : '#e2e8f0', color: isSelected ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{cat}</h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{count} products</span>
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={16} style={{ color: '#9333ea' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Partner Banks Directory ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: '#7e22ce' }} />
              <span>Partner Banking Institutions</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Scheduled commercial banks with integrated digital onboarding and institutional student and salary accounts.
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
              <span>Configure Banks</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {partnersList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
              <Building2 size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>No Partner Banks Configured Yet</h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#64748b' }}>
                All dummy banks and products have been removed. Use Form Settings to add your scheduled banks and account product variants.
              </p>
              {rootRole === 'superadmin' && (
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                  onClick={() => navigate('/superadmin/referral-settings')}
                >
                  <Sliders size={14} />
                  <span>Configure Banks in Form Settings</span>
                </button>
              )}
            </div>
          ) : (
            partnersList.map((partner) => {
            const productCount = (partner.products || []).filter((p) => p.isActive !== false).length;
            const isSelected = bankFilter === partner.name;
            return (
              <div
                key={partner.id || partner.name}
                style={{
                  background: isSelected ? '#faf5ff' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelected ? '#9333ea' : 'var(--border-color, #e2e8f0)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setBankFilter(isSelected ? 'ALL' : partner.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#7e22ce', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.86rem' }}>
                      {partner.code?.slice(0, 3) || partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{partner.name}</h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Scheduled Commercial Bank</span>
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Approved Accounts: <strong>{productCount}</strong></span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#7e22ce', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSubmit('Savings Account', partner.name);
                    }}
                  >
                    <span>Refer Now</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* ── Approved Account Products Specification Matrix ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} style={{ color: '#7e22ce' }} />
              <span>Approved Bank Account Products Specification Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Compare initial deposit rules, minimum average balance (MAB), digital onboarding features, and refer applicants directly
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter by Category */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: '#64748b' }} />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
                <option value="ALL">All Categories</option>
                {accountCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Bank */}
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
              <option value="ALL">All Banks ({accountsMatrix.length})</option>
              {partnersList.map((p) => (
                <option key={p.id || p.name} value={p.name}>{p.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search accounts, MAB, perks..."
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
                <th style={{ width: '180px' }}>Banking Institution</th>
                <th style={{ width: '220px' }}>Approved Account Product</th>
                <th style={{ width: '150px' }}>Category</th>
                <th style={{ minWidth: '170px' }}>Deposit & MAB Rules</th>
                <th style={{ minWidth: '240px' }}>Eligibility & Digital KYC</th>
                <th style={{ width: '170px' }}>Required Documents</th>
                <th style={{ width: '140px' }}>Activation SLA</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Direct Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingConfig && accountsMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading verified bank accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <Building2 size={38} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {accountsMatrix.length === 0 ? 'No Bank Accounts Configured Yet' : 'No Bank Accounts Matched'}
                    </div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.84rem' }}>
                      {accountsMatrix.length === 0
                        ? 'All dummy account products have been removed. Add verified banking products in Form Settings.'
                        : 'Try clearing search filters or add products in Super Admin Referral Settings.'}
                    </p>
                    {accountsMatrix.length === 0 && rootRole === 'superadmin' ? (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                        onClick={() => navigate('/superadmin/referral-settings')}
                      >
                        <Sliders size={14} />
                        <span>Add Accounts in Form Settings</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', margin: '0 auto' }}
                        onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setBankFilter('ALL'); }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, idx) => (
                  <tr key={account.id || idx}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{account.bankName}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#faf5ff', color: '#6b21a8' }}>
                        {account.bankCode || 'Scheduled Bank'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{account.productName}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        {account.accountCategory}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7e22ce' }}>
                        {account.depositRules}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #475569)', lineHeight: '1.45' }}>
                      {account.eligibility}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: '#475569' }}>
                        {account.requiredDocuments?.map((doc, dIdx) => (
                          <span key={dIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} style={{ color: '#10b981' }} /> {doc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        <Clock size={11} /> {account.turnaroundTime}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#7e22ce', color: '#ffffff', borderColor: '#7e22ce' }}
                        onClick={() => handleOpenSubmit(account.accountCategory, account.bankName)}
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

      {/* ── Multi-Step Bank Account Referral Modal ── */}
      <AccountOpeningReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultAccountType={submitAccountType}
        defaultBank={submitBank}
        rootRole={rootRole}
      />
    </div>
  );
}
