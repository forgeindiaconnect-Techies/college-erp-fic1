import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, Shield, Heart, Car, UserCheck, Building2,
  ChevronRight, CheckCircle2, Clock, Plus, Search, Filter,
  ArrowLeft, Sliders, Check, FileText, Award, RefreshCw, X,
  DollarSign, Sparkles, AlertCircle
} from 'lucide-react';
import { getPublicReferralFormConfig, getPublishedOpportunities, createOpportunity } from '../../api';
import InsuranceReferralModal from '../../components/referrals/InsuranceReferralModal';
import FormBuilderEditor from '../referrals/FormBuilderEditor';
import BusinessReferralCategoryNav from '../../components/referrals/BusinessReferralCategoryNav';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import '../referrals/AdminReferralManagement.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralInsurance() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;

  const { config: categoryConfig } = useCategoryConfig('insurance');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCategory, setSubmitCategory] = useState('Health');
  const [submitProvider, setSubmitProvider] = useState('Star Health & Allied Insurance');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');

  // Opportunity Publishing Modal States
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [oppModalTab, setOppModalTab] = useState('details'); // 'details' | 'benefits' | 'form' | 'incentives'
  const [savingOpp, setSavingOpp] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [oppFormData, setOppFormData] = useState({
    title: '',
    category: 'Insurance',
    subCategory: 'Health Insurance',
    providerName: 'Star Health & Allied Insurance',
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
      amount: 800,
      terms: 'Incentive calculated and approved upon official underwriter issuance verification.'
    },
    formSchema: []
  });

  // Live Database Configuration from ReferralFormConfig
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Published Opportunities
  const [publishedOpps, setPublishedOpps] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await getPublicReferralFormConfig('Insurance');
      if (res?.data?.success && res.data.data) {
        setDbConfig(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading insurance DB config:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchOpportunities = useCallback(async () => {
    try {
      setLoadingOpps(true);
      const res = await getPublishedOpportunities({ category: 'Insurance' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setPublishedOpps(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading insurance published opportunities:', err.message);
    } finally {
      setLoadingOpps(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchOpportunities();
  }, [fetchConfig, fetchOpportunities]);

  const handleOpenSubmit = (catKey, provider) => {
    setSubmitCategory(catKey || 'Health');
    setSubmitProvider(provider || 'Star Health & Allied Insurance');
    setShowSubmitModal(true);
  };

  const handleOpenCreateOpportunity = () => {
    setOppFormData({
      title: '',
      category: 'Insurance',
      subCategory: 'Health Insurance',
      providerName: 'Star Health & Allied Insurance',
      description: 'Comprehensive cashless healthcare coverage across 14,000+ top network hospitals nationwide with zero co-payment and pre-existing illness coverage.',
      benefits: 'Cashless treatment across 14,000+ hospitals\nZero co-payment requirement\nFree annual comprehensive health checkup\nTax benefit under Section 80D up to ₹25,000',
      keyHighlights: 'Instant Approval\n₹5 Lakh - ₹50 Lakh Cover\nNo Room Rent Capping',
      eligibilityCriteria: 'College students, faculty members, administrative staff, and their immediate family members (Age 18 - 65).',
      requirements: 'Aadhaar Card\nPAN Card\nBasic medical history declaration',
      targetColleges: ['ALL'],
      targetRoles: ['ALL'],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'Published',
      incentiveConfig: {
        milestone: 'Policy Issued',
        amountType: 'Fixed',
        amount: 800,
        terms: 'Incentive calculated and approved upon official underwriter policy issuance verification.'
      },
      formSchema: []
    });
    setOppModalTab('details');
    setShowOpportunityModal(true);
  };

  const handleSaveOpportunity = async (e) => {
    e.preventDefault();
    if (!oppFormData.title?.trim() || !oppFormData.providerName?.trim() || !oppFormData.subCategory?.trim()) {
      alert('Please fill out the Opportunity Title, Insurance Provider, and Sub-Category.');
      return;
    }

    try {
      setSavingOpp(true);
      const toLines = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return val.split('\n').map(s => s.trim()).filter(Boolean);
        return [];
      };

      const payload = {
        ...oppFormData,
        category: 'Insurance',
        title: oppFormData.title.trim(),
        providerName: oppFormData.providerName.trim(),
        subCategory: oppFormData.subCategory.trim(),
        description: oppFormData.description?.trim() || '',
        startDate: oppFormData.startDate || new Date().toISOString().split('T')[0],
        endDate: oppFormData.endDate || null,
        benefits: toLines(oppFormData.benefits),
        requirements: toLines(oppFormData.requirements),
        keyHighlights: toLines(oppFormData.keyHighlights),
        incentiveConfig: {
          ...oppFormData.incentiveConfig,
          amount: Number(oppFormData.incentiveConfig?.amount) || 0
        }
      };

      await createOpportunity(payload);
      setShowOpportunityModal(false);
      await fetchOpportunities();
      setToastMessage(`Insurance Opportunity "${payload.title}" published successfully!`);
      setTimeout(() => setToastMessage(null), 4500);
    } catch (err) {
      console.error('Error saving insurance opportunity:', err);
      alert(err.response?.data?.message || err.message || 'Error publishing opportunity');
    } finally {
      setSavingOpp(false);
    }
  };

  // Extract active partners & categories
  const partnersList = useMemo(() => {
    if (!dbConfig?.partners || !Array.isArray(dbConfig.partners)) {
      return [];
    }
    return dbConfig.partners.filter((p) => p.isActive !== false);
  }, [dbConfig]);

  const insuranceCategories = useMemo(() => {
    if (dbConfig?.categoriesList && Array.isArray(dbConfig.categoriesList) && dbConfig.categoriesList.length > 0) {
      return dbConfig.categoriesList;
    }
    return ['Health', 'Motor', 'Life', 'Property'];
  }, [dbConfig]);

  // Aggregate plans into full specification matrix
  const policyMatrix = useMemo(() => {
    const list = [];
    partnersList.forEach((partner) => {
      (partner.products || []).forEach((prod) => {
        if (prod.isActive !== false) {
          list.push({
            id: prod.id || `${partner.code}-${prod.name}`,
            providerName: partner.name,
            providerCode: partner.code,
            title: prod.name,
            subCategory: prod.productCategory || 'Health',
            coverageOptions: prod.annualFee || '₹5 Lakhs - ₹1 Crore',
            eligibility: prod.eligibilityConditions || 'Age 18-65. Pre-existing 2-3 yr waiting period.',
            requiredDocuments: prod.requiredDocuments || ['Aadhaar Card', 'PAN Card', 'Medical Proposal'],
            turnaroundTime: prod.turnaroundTime || 'Instant to 2 days',
            isPublishedOpp: false
          });
        }
      });
    });

    publishedOpps.forEach((opp) => {
      if (!list.some((item) => item.title.toLowerCase() === (opp.title || '').toLowerCase())) {
        list.push({
          id: opp._id || opp.opportunityCode,
          providerName: opp.providerName || 'Partner Insurer',
          providerCode: 'IRDAI',
          title: opp.title,
          subCategory: opp.subCategory || 'Health',
          coverageOptions: opp.keyHighlights?.[0] || '₹5 Lakhs - ₹50 Lakhs',
          eligibility: opp.description || 'Standard Underwriting & Medical Verification',
          requiredDocuments: opp.requiredDocuments || ['Aadhaar Card', 'PAN Card'],
          turnaroundTime: '2-3 business days',
          isPublishedOpp: true
        });
      }
    });

    return list;
  }, [partnersList, publishedOpps]);

  const filteredPolicies = useMemo(() => {
    return policyMatrix.filter((item) => {
      const matchesSearch =
        (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.providerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.subCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.eligibility || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || item.subCategory.toLowerCase() === categoryFilter.toLowerCase();
      const matchesProvider = providerFilter === 'ALL' || item.providerName === providerFilter;

      return matchesSearch && matchesCategory && matchesProvider;
    });
  }, [policyMatrix, searchQuery, categoryFilter, providerFilter]);

  return (
    <div className="management-page animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* ── Top Category Tabs Navigation ── */}
      <BusinessReferralCategoryNav activeCategory="insurance" />

      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #10b981, #059669, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Live IRDAI Licensed Partner Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Insurance Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Explore insurance categories, partner insurance companies, policy plans, coverage options, and submit institutional referrals.'}
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
                  style={{ background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0', fontWeight: 700 }}
                  onClick={() => navigate('/superadmin/referral-settings')}
                  title="Configure Insurance Underwriters, Products & Form Fields"
                >
                  <Sliders size={15} />
                  <span>Form Settings</span>
                </button>

                <button
                  type="button"
                  className="mgmt-btn-primary"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  onClick={handleOpenCreateOpportunity}
                  title="Publish a new Insurance Product or Policy Offering"
                >
                  <Plus size={16} />
                  <span>Publish New Insurance Opportunity</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              style={{ background: '#059669', borderColor: '#059669' }}
              onClick={() => handleOpenSubmit('Health', 'Star Health & Allied Insurance')}
              title="Submit a student or faculty insurance referral"
            >
              <Plus size={16} />
              <span>Submit Insurance Referral</span>
            </button>
          </div>
        </div>

        {toastMessage && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '12px 18px',
            borderRadius: '10px',
            margin: '16px 20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={18} color="#059669" />
            {toastMessage}
          </div>
        )}

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Coverage & Protection'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Partner Insurers: <strong>{partnersList.length} Underwriters</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Active Plans: <strong>{policyMatrix.length} Verified Policies</strong></span>
        </div>
      </div>

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Partner Insurers</span>
            <h3 className="mgmt-kpi-value">{partnersList.length} Licensed</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Approved Policy Plans</span>
            <h3 className="mgmt-kpi-value">{policyMatrix.length} Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Heart size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Coverage Range</span>
            <h3 className="mgmt-kpi-value">₹5L - ₹1 Crore</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Verification Trigger</span>
            <h3 className="mgmt-kpi-value">Policy Issuance</h3>
          </div>
        </div>
      </div>

      {/* ── Insurance Categories Selector / Highlights ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#059669' }} />
              <span>Insurance Categories & Coverage Domains</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Select an insurance sector to filter approved products and underwriter plans.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {insuranceCategories.map((cat) => {
            const isSelected = categoryFilter.toLowerCase() === cat.toLowerCase();
            const count = policyMatrix.filter((p) => p.subCategory.toLowerCase() === cat.toLowerCase()).length;
            return (
              <div
                key={cat}
                onClick={() => setCategoryFilter(isSelected ? 'ALL' : cat)}
                style={{
                  background: isSelected ? '#ecfdf5' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelected ? '#059669' : 'var(--border-color, #e2e8f0)'}`,
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
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: isSelected ? '#059669' : '#e2e8f0', color: isSelected ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {cat.toLowerCase().includes('motor') ? <Car size={18} /> : cat.toLowerCase().includes('life') ? <UserCheck size={18} /> : <Heart size={18} />}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{cat} Insurance</h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{count} plans listed</span>
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={16} style={{ color: '#059669' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Partner Insurance Companies Directory ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: '#059669' }} />
              <span>Partner Insurance Underwriters</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Accredited general and life insurance underwriters offering direct policy issuing and institutional incentives.
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
              <span>Configure Insurers</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {partnersList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #cbd5e1' }}>
              <Building2 size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>No Partner Insurers Configured Yet</h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#64748b' }}>
                All dummy underwriters and policies have been removed. Use Form Settings to add your licensed insurance companies and policy offerings.
              </p>
              {rootRole === 'superadmin' && (
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                  onClick={() => navigate('/superadmin/referral-settings')}
                >
                  <Sliders size={14} />
                  <span>Configure Insurers in Form Settings</span>
                </button>
              )}
            </div>
          ) : (
            partnersList.map((partner) => {
            const productCount = (partner.products || []).filter((p) => p.isActive !== false).length;
            const isSelected = providerFilter === partner.name;
            return (
              <div
                key={partner.id || partner.name}
                style={{
                  background: isSelected ? '#ecfdf5' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelected ? '#059669' : 'var(--border-color, #e2e8f0)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setProviderFilter(isSelected ? 'ALL' : partner.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#059669', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.86rem' }}>
                      {partner.code?.slice(0, 3) || partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{partner.name}</h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>IRDAI Verified</span>
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                    <CheckCircle2 size={11} /> Licensed
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Approved Plans: <strong>{productCount}</strong></span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSubmit('Health', partner.name);
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

      {/* ── Approved Insurance Plans Specification Matrix ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#059669' }} />
              <span>Approved Insurance Plans & Coverage Specification Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Compare coverage options, pre-existing waiting periods, required documents, and submit candidate policy referrals
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
                {insuranceCategories.map((c) => (
                  <option key={c} value={c}>{c} Insurance</option>
                ))}
              </select>
            </div>

            {/* Filter by Insurer */}
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
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
              <option value="ALL">All Insurers ({policyMatrix.length})</option>
              {partnersList.map((p) => (
                <option key={p.id || p.name} value={p.name}>{p.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search plans, coverage..."
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
                <th style={{ width: '180px' }}>Insurance Underwriter</th>
                <th style={{ width: '220px' }}>Approved Policy Plan</th>
                <th style={{ width: '130px' }}>Category</th>
                <th style={{ minWidth: '180px' }}>Coverage Options</th>
                <th style={{ minWidth: '240px' }}>Eligibility & Waiting Periods</th>
                <th style={{ width: '170px' }}>Required Documents</th>
                <th style={{ width: '130px' }}>Issuance SLA</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Direct Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingConfig && policyMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading verified insurance plans...
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <ShieldCheck size={38} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {policyMatrix.length === 0 ? 'No Insurance Plans Configured Yet' : 'No Insurance Plans Matched'}
                    </div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.84rem' }}>
                      {policyMatrix.length === 0
                        ? 'All dummy insurance policies have been removed. Add verified insurance plans in Form Settings.'
                        : 'Try clearing search filters or add products in Super Admin Referral Settings.'}
                    </p>
                    {policyMatrix.length === 0 && rootRole === 'superadmin' ? (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                        onClick={() => navigate('/superadmin/referral-settings')}
                      >
                        <Sliders size={14} />
                        <span>Add Plans in Form Settings</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', margin: '0 auto' }}
                        onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setProviderFilter('ALL'); }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((plan, idx) => (
                  <tr key={plan.id || idx}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{plan.providerName}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#ecfdf5', color: '#065f46' }}>
                        {plan.providerCode || 'IRDAI Licensed'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{plan.title}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        {plan.subCategory}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                        {plan.coverageOptions}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #475569)', lineHeight: '1.45' }}>
                      {plan.eligibility}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: '#475569' }}>
                        {plan.requiredDocuments?.map((doc, dIdx) => (
                          <span key={dIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} style={{ color: '#10b981' }} /> {doc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        <Clock size={11} /> {plan.turnaroundTime}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#059669', color: '#ffffff', borderColor: '#059669' }}
                        onClick={() => handleOpenSubmit(plan.subCategory, plan.providerName)}
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

      {/* ── Multi-Step Insurance Referral Modal ── */}
      <InsuranceReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultCategory={submitCategory}
        defaultProvider={submitProvider}
        rootRole={rootRole}
      />

      {/* ── Publish Insurance Opportunity Modal ── */}
      {showOpportunityModal && (
        <div className="ref-modal-overlay">
          <div className="ref-modal-card" style={{ maxWidth: '820px', width: '92%' }}>
            <div className="ref-modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="ref-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                <ShieldCheck size={20} style={{ color: '#059669' }} />
                <span>Publish New Insurance Opportunity</span>
              </div>
              <button
                type="button"
                className="ref-modal-close"
                onClick={() => setShowOpportunityModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
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
                  borderBottom: oppModalTab === 'details' ? '2.5px solid #059669' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'details' ? '#059669' : '#64748b',
                  fontWeight: oppModalTab === 'details' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <FileText size={15} />
                <span>1. Policy Details</span>
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
                  borderBottom: oppModalTab === 'benefits' ? '2.5px solid #059669' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'benefits' ? '#059669' : '#64748b',
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
                  borderBottom: oppModalTab === 'form' ? '2.5px solid #059669' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'form' ? '#059669' : '#64748b',
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
                  background: oppModalTab === 'form' ? '#059669' : '#e2e8f0',
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
                  borderBottom: oppModalTab === 'incentives' ? '2.5px solid #059669' : '2.5px solid transparent',
                  background: 'transparent',
                  color: oppModalTab === 'incentives' ? '#059669' : '#64748b',
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
              <div className="ref-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
                {/* ── TAB 1: DETAILS ── */}
                {oppModalTab === 'details' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Insurance Plan Title *
                        </label>
                        <input
                          type="text"
                          className="ref-input"
                          placeholder="e.g. Star Comprehensive Health Insurance Plan"
                          value={oppFormData.title}
                          onChange={(e) => setOppFormData({ ...oppFormData, title: e.target.value })}
                          required
                        />
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Underwriter / Insurance Provider *
                        </label>
                        <input
                          type="text"
                          className="ref-input"
                          placeholder="e.g. Star Health & Allied Insurance / HDFC ERGO"
                          value={oppFormData.providerName}
                          onChange={(e) => setOppFormData({ ...oppFormData, providerName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Insurance Category / Type *
                        </label>
                        <select
                          className="ref-select"
                          value={oppFormData.subCategory}
                          onChange={(e) => setOppFormData({ ...oppFormData, subCategory: e.target.value })}
                          required
                        >
                          <option value="Health Insurance">Health Insurance</option>
                          <option value="Life Insurance">Life Insurance</option>
                          <option value="Term Insurance">Term Insurance</option>
                          <option value="Motor Insurance">Motor / Vehicle Insurance</option>
                          <option value="Student Accidental Cover">Student Accidental Cover</option>
                          <option value="Travel Insurance">Travel Insurance</option>
                          <option value="Property Insurance">Property Insurance</option>
                        </select>
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Publishing Status
                        </label>
                        <select
                          className="ref-select"
                          value={oppFormData.status}
                          onChange={(e) => setOppFormData({ ...oppFormData, status: e.target.value })}
                        >
                          <option value="Published">Published (Live to Referrals)</option>
                          <option value="Draft">Save as Draft</option>
                          <option value="Paused">Paused</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '14px' }}>
                      <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                        Opportunity Description *
                      </label>
                      <textarea
                        rows={3}
                        className="ref-textarea"
                        placeholder="Comprehensive policy overview, coverage tiers, cashless networks, and hospital affiliations..."
                        value={oppFormData.description}
                        onChange={(e) => setOppFormData({ ...oppFormData, description: e.target.value })}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Application Start Date
                        </label>
                        <input
                          type="date"
                          className="ref-input"
                          value={oppFormData.startDate}
                          onChange={(e) => setOppFormData({ ...oppFormData, startDate: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Closing Date (Leave blank for ongoing)
                        </label>
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
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Key Benefits (one per line)
                        </label>
                        <textarea
                          rows={4}
                          className="ref-textarea"
                          placeholder="Cashless in 14,000+ hospitals&#10;Zero room rent capping&#10;Free annual health checkup"
                          value={oppFormData.benefits}
                          onChange={(e) => setOppFormData({ ...oppFormData, benefits: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Key Badges & Highlights (one per line)
                        </label>
                        <textarea
                          rows={4}
                          className="ref-textarea"
                          placeholder="Instant Approval&#10;₹5 Lakh - ₹50 Lakh Cover&#10;Zero Co-Payment"
                          value={oppFormData.keyHighlights}
                          onChange={(e) => setOppFormData({ ...oppFormData, keyHighlights: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Eligibility Criteria
                        </label>
                        <textarea
                          rows={3}
                          className="ref-textarea"
                          placeholder="e.g. Enrolled students (Age 18+), faculty members, and dependent family members."
                          value={oppFormData.eligibilityCriteria}
                          onChange={(e) => setOppFormData({ ...oppFormData, eligibilityCriteria: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#334155' }}>
                          Required Documents (one per line)
                        </label>
                        <textarea
                          rows={3}
                          className="ref-textarea"
                          placeholder="Aadhaar Card&#10;PAN Card&#10;College ID Proof"
                          value={oppFormData.requirements}
                          onChange={(e) => setOppFormData({ ...oppFormData, requirements: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TAB 3: FORM BUILDER ── */}
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
                      <Sliders size={20} style={{ color: '#2563eb' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e3a8a' }}>
                          Insurance Opportunity Form Schema
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#3b82f6' }}>
                          Add, edit, or customize form fields required when submitting referrals for this insurance policy.
                        </div>
                      </div>
                    </div>

                    <FormBuilderEditor
                      schema={oppFormData.formSchema}
                      onChange={(updatedSchema) => setOppFormData({ ...oppFormData, formSchema: updatedSchema })}
                    />
                  </div>
                )}

                {/* ── TAB 4: INCENTIVES ── */}
                {oppModalTab === 'incentives' && (
                  <div>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={18} /> Insurance Referral Incentive Payout Configuration
                      </div>
                      <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#15803d' }}>
                        Set the underwriter trigger milestone and payout reward per successful insurance policy referral.
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label className="ref-form-label" style={{ color: '#14532d' }}>Trigger Milestone *</label>
                          <input
                            type="text"
                            className="ref-input"
                            value={oppFormData.incentiveConfig?.milestone || 'Policy Issued'}
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
                            min="0"
                            className="ref-input"
                            value={oppFormData.incentiveConfig?.amount || 800}
                            onChange={(e) => setOppFormData({
                              ...oppFormData,
                              incentiveConfig: { ...oppFormData.incentiveConfig, amount: e.target.value }
                            })}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="ref-form-label" style={{ color: '#14532d' }}>Payout Terms & Underwriting Conditions</label>
                        <input
                          type="text"
                          className="ref-input"
                          value={oppFormData.incentiveConfig?.terms || ''}
                          onChange={(e) => setOppFormData({
                            ...oppFormData,
                            incentiveConfig: { ...oppFormData.incentiveConfig, terms: e.target.value }
                          })}
                          placeholder="e.g. Paid upon successful policy issuance and premium confirmation."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="ref-modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
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
                      style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857', fontWeight: 600 }}
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
                  <button type="submit" className="ref-btn-primary" style={{ background: '#059669', borderColor: '#059669' }} disabled={savingOpp}>
                    <Check size={16} /> {savingOpp ? 'Publishing...' : 'Save & Publish Insurance Opportunity'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
