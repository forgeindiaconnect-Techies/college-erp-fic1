import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Landmark, Wallet, Building2, Briefcase, Layers,
  ChevronRight, CheckCircle2, ShieldCheck, Clock, Info, X, Check, Plus, Edit, Search
} from 'lucide-react';
import { getPublishedOpportunities } from '../../api';
import AccountOpeningReferralModal from '../../components/referrals/AccountOpeningReferralModal';
import EditCategoryModal from '../../components/referrals/EditCategoryModal';
import CategoryProgramSpotlight from '../../components/referrals/CategoryProgramSpotlight';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

// Real-time Business Referral - Digital Account Opening Stream
export default function BusinessReferralAccountOpening() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;
  const dashboardPath = `/${rootRole}/dashboard`;

  const { config: categoryConfig } = useCategoryConfig('account-opening');
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitAccountType, setSubmitAccountType] = useState('Savings Account');
  const [submitBank, setSubmitBank] = useState('Partner Bank');
  const [publishedAccounts, setPublishedAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoadingAccounts(true);
      const res = await getPublishedOpportunities({ category: 'Bank Account' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const cleanAccounts = res.data.data.filter(
          (a) => a.opportunityCode !== 'OPP-BNK-2026-001' && a.title !== 'ICICI Mine Student & Youth Zero-Balance Savings Account'
        );
        setPublishedAccounts(cleanAccounts);
      }
    } catch (err) {
      console.warn('Notice loading account opportunities:', err.message);
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenSubmit = (accountType, bankName) => {
    setSubmitAccountType(accountType || 'Savings Account');
    setSubmitBank(bankName || 'Partner Bank');
    setShowSubmitModal(true);
  };

  const filteredAccounts = publishedAccounts.filter((acc) =>
    (acc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.providerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.subCategory || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #9333ea, #7e22ce, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Digital Banking Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Account Opening Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Institutional banking partner programs. Refer students, faculty, campus vendors, and families for zero-balance digital savings and corporate salary accounts.'}
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
                  title="Manage and Edit Account Opportunities in Central"
                >
                  <Plus size={15} />
                  <span>Publishing Central</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => handleOpenSubmit('Savings Account', 'HDFC Bank')}
            >
              <Plus size={16} />
              <span>+ Refer Account</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Digital Accounts & Banking'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Onboarding: <strong>Paperless Video-KYC</strong></span>
        </div>
      </div>

      {/* ── Category Program Spotlight & Guided Actions ── */}
      <CategoryProgramSpotlight
        config={categoryConfig}
        rootRole={rootRole}
        onOpenEdit={() => setShowEditCategoryModal(true)}
        onOpenSubmit={() => handleOpenSubmit('Savings Account', 'HDFC Bank')}
        onOpenPublish={() => navigate('/superadmin/business-referrals')}
      />

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(147, 51, 234, 0.1)', color: '#9333ea' }}>
            <Wallet size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Active Schemes</span>
            <h3 className="mgmt-kpi-value">{publishedAccounts.length} Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <ShieldCheck size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Digital Onboarding</span>
            <h3 className="mgmt-kpi-value">5-Min Video KYC</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Partner Banks</span>
            <h3 className="mgmt-kpi-value">Verified Network</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Verification Trigger</span>
            <h3 className="mgmt-kpi-value">CBS Allocation</h3>
          </div>
        </div>
      </div>

      {/* ── Approved Digital Account Schemes Specification Table ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Landmark size={18} style={{ color: '#9333ea' }} />
              <span>Approved Digital Account Schemes Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Accredited institutional partner bank offerings with minimum balance exemptions and instant digital onboarding
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  background: 'var(--bg-card, #ffffff)',
                  color: 'var(--text-main, #0f172a)',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        </div>

        <div className="mgmt-table-wrapper">
          <table className="mgmt-table">
            <thead>
              <tr>
                <th style={{ width: '220px' }}>Scheme Variant</th>
                <th style={{ width: '180px' }}>Participating Bank</th>
                <th style={{ width: '150px' }}>Incentive / Reward</th>
                <th style={{ width: '160px' }}>Account Sub-Category</th>
                <th style={{ minWidth: '240px' }}>Key Specifications</th>
                <th style={{ minWidth: '160px' }}>KYC Mode</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingAccounts ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    Loading verified bank account schemes...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#faf5ff', color: '#9333ea', marginBottom: '0.75rem' }}>
                      <Landmark size={26} />
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                      No Bank Account Opportunities Published Yet
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
                      {rootRole === 'superadmin' 
                        ? 'No banking partner schemes have been published yet. Go to Publishing & Opportunity Central to publish digital account schemes.'
                        : 'Bank account schemes published by Super Admin will appear here dynamically in real time.'}
                    </div>
                    {rootRole === 'superadmin' && (
                      <button
                        type="button"
                        className="mgmt-btn-primary"
                        style={{ margin: '0 auto', background: '#9333ea' }}
                        onClick={() => navigate('/superadmin/business-referrals')}
                      >
                        <Plus size={15} /> Publish New Bank Account Scheme
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc._id || acc.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {acc.title}
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, background: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>
                        {acc.providerName || 'Partner Bank'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>
                      {acc.rewardAmount ? `₹${Number(acc.rewardAmount).toLocaleString('en-IN')}` : (acc.rewardType || 'Eligible')}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #334155)', fontWeight: 600 }}>
                      {acc.subCategory || 'Savings Account'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.45' }}>
                      {acc.description || acc.eligibilityCriteria || 'Digital account with zero balance & mobile banking'}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #475569)', lineHeight: '1.45' }}>
                      Paperless Video-KYC
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                        <Check size={11} /> Live
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#9333ea', color: '#ffffff', borderColor: '#9333ea' }}
                        onClick={() => handleOpenSubmit(acc.subCategory || 'Savings Account', acc.providerName || acc.title)}
                      >
                        <span>Refer Account</span>
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

      {/* ── Real Multi-Step Account Opening Referral Modal ── */}
      <AccountOpeningReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultAccountType={submitAccountType}
        defaultBank={submitBank}
        rootRole={rootRole}
      />

      {/* ── Super Admin Edit Category Modal ── */}
      <EditCategoryModal
        isOpen={showEditCategoryModal}
        onClose={() => setShowEditCategoryModal(false)}
        categoryId="account-opening"
      />
    </div>
  );
}
