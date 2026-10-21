import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase, Building2, Shield, Clock, Plus, Search, Filter,
  CheckCircle2, ChevronRight, ArrowLeft, Sliders, Check,
  FileText, Award, RefreshCw, MapPin
} from 'lucide-react';
import { getPublicReferralFormConfig, getPublishedOpportunities } from '../../api';
import JobReferralModal from '../../components/referrals/JobReferralModal';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;

  const { config: categoryConfig } = useCategoryConfig('job-referral');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitSector, setSubmitSector] = useState('IT & Software');
  const [submitCompany, setSubmitCompany] = useState('Tata Consultancy Services (TCS)');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');

  // Live Database Configuration from ReferralFormConfig
  const [dbConfig, setDbConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Published Opportunities
  const [publishedJobs, setPublishedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await getPublicReferralFormConfig('Job');
      if (res?.data?.success && res.data.data) {
        setDbConfig(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading job DB config:', err.message);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const res = await getPublishedOpportunities({ category: 'Job Referral' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setPublishedJobs(res.data.data);
      }
    } catch (err) {
      console.warn('Notice loading job published opportunities:', err.message);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchJobs();
  }, [fetchConfig, fetchJobs]);

  const handleOpenSubmit = (sectorTitle, companyName) => {
    setSubmitSector(sectorTitle || 'IT & Software');
    setSubmitCompany(companyName || 'Tata Consultancy Services (TCS)');
    setShowSubmitModal(true);
  };

  // Extract active corporate partners & sectors
  const partnersList = useMemo(() => {
    if (!dbConfig?.partners || !Array.isArray(dbConfig.partners)) {
      return [];
    }
    return dbConfig.partners.filter((p) => p.isActive !== false);
  }, [dbConfig]);

  const sectorsList = useMemo(() => {
    if (dbConfig?.categoriesList && Array.isArray(dbConfig.categoriesList) && dbConfig.categoriesList.length > 0) {
      return dbConfig.categoriesList;
    }
    return ['IT & Software', 'Banking & Finance', 'Core Engineering', 'Marketing & Sales'];
  }, [dbConfig]);

  // Aggregate available positions into full specification matrix
  const jobsMatrix = useMemo(() => {
    const list = [];
    partnersList.forEach((partner) => {
      (partner.products || []).forEach((prod) => {
        if (prod.isActive !== false) {
          list.push({
            id: prod.id || `${partner.code}-${prod.name}`,
            companyName: partner.name,
            companyCode: partner.code,
            roleTitle: prod.name,
            sector: prod.productCategory || 'IT & Software',
            compensation: prod.annualFee || '₹4.5 LPA - ₹9 LPA',
            eligibility: prod.eligibilityConditions || 'B.Tech/BE/MCA/BSc (CS) with min 60% aggregate',
            requiredDocuments: prod.requiredDocuments || ['Resume / CV', 'Degree Certificate', 'Identity Proof'],
            turnaroundTime: prod.turnaroundTime || '5-10 business days',
            isPublishedOpp: false
          });
        }
      });
    });

    publishedJobs.forEach((opp) => {
      if (!list.some((item) => item.roleTitle.toLowerCase() === (opp.title || '').toLowerCase())) {
        list.push({
          id: opp._id || opp.opportunityCode,
          companyName: opp.providerName || 'Corporate Partner',
          companyCode: 'CORP',
          roleTitle: opp.title,
          sector: opp.subCategory || 'IT & Software',
          compensation: opp.keyHighlights?.[0] || 'Competitive CTC',
          eligibility: opp.description || 'Standard Graduate Qualification',
          requiredDocuments: opp.requiredDocuments || ['Resume / CV', 'Marksheets'],
          turnaroundTime: '1-2 weeks',
          isPublishedOpp: true
        });
      }
    });

    return list;
  }, [partnersList, publishedJobs]);

  const filteredJobs = useMemo(() => {
    return jobsMatrix.filter((item) => {
      const matchesSearch =
        (item.roleTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sector || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.eligibility || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSector = sectorFilter === 'ALL' || item.sector.toLowerCase() === sectorFilter.toLowerCase();
      const matchesCompany = companyFilter === 'ALL' || item.companyName === companyFilter;

      return matchesSearch && matchesSector && matchesCompany;
    });
  }, [jobsMatrix, searchQuery, sectorFilter, companyFilter]);

  return (
    <div className="management-page animate-fade-in" style={{ padding: '24px 32px' }}>
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #6366f1, #4f46e5, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Live Corporate Hiring Mandates Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Job Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Explore verified corporate hiring mandates, open job positions, compensation packages, eligibility criteria, and submit candidate referrals.'}
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
                title="Configure Corporate Partners, Positions & Form Fields"
              >
                <Sliders size={15} />
                <span>Form Settings</span>
              </button>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              style={{ background: '#4f46e5', borderColor: '#4f46e5' }}
              onClick={() => handleOpenSubmit('IT & Software', 'Tata Consultancy Services (TCS)')}
            >
              <Plus size={16} />
              <span>Refer Candidate for Job</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Talent Acquisition & Jobs'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Corporate Partners: <strong>{partnersList.length} Enterprises</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Available Positions: <strong>{jobsMatrix.length} Mandates</strong></span>
        </div>
      </div>

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Corporate Partners</span>
            <h3 className="mgmt-kpi-value">{partnersList.length} Enterprises</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Briefcase size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Open Positions</span>
            <h3 className="mgmt-kpi-value">{jobsMatrix.length} Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Shield size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Direct Mandates</span>
            <h3 className="mgmt-kpi-value">100% Verified</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Verification Trigger</span>
            <h3 className="mgmt-kpi-value">Candidate Joining</h3>
          </div>
        </div>
      </div>

      {/* ── Sectors Selector / Highlights ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} style={{ color: '#4f46e5' }} />
              <span>Employment Sectors & Industry Domains</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Select an employment domain to filter active opportunities and corporate partner roles.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {sectorsList.map((sec) => {
            const isSelected = sectorFilter.toLowerCase() === sec.toLowerCase();
            const count = jobsMatrix.filter((j) => j.sector.toLowerCase() === sec.toLowerCase()).length;
            return (
              <div
                key={sec}
                onClick={() => setSectorFilter(isSelected ? 'ALL' : sec)}
                style={{
                  background: isSelected ? '#eef2ff' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelected ? '#4f46e5' : 'var(--border-color, #e2e8f0)'}`,
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
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: isSelected ? '#4f46e5' : '#e2e8f0', color: isSelected ? '#ffffff' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{sec}</h4>
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{count} open roles</span>
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={16} style={{ color: '#4f46e5' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Corporate Partners Directory ── */}
      <div className="mgmt-table-card" style={{ marginBottom: '24px' }}>
        <div className="mgmt-filters-row" style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: '#4f46e5' }} />
              <span>Corporate Hiring Partners</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Accredited enterprise employers offering prioritized candidate interviews and direct recruitment tracks.
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
              <Briefcase size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>No Corporate Partners Configured Yet</h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.84rem', color: '#64748b' }}>
                All dummy employers and roles have been removed. Use Form Settings to add your corporate recruiting partners and open job mandates.
              </p>
              {rootRole === 'superadmin' && (
                <button
                  type="button"
                  className="mgmt-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                  onClick={() => navigate('/superadmin/referral-settings')}
                >
                  <Sliders size={14} />
                  <span>Configure Corporate Partners in Form Settings</span>
                </button>
              )}
            </div>
          ) : (
            partnersList.map((partner) => {
            const productCount = (partner.products || []).filter((p) => p.isActive !== false).length;
            const isSelected = companyFilter === partner.name;
            return (
              <div
                key={partner.id || partner.name}
                style={{
                  background: isSelected ? '#eef2ff' : 'var(--bg-main, #f8fafc)',
                  border: `1.5px solid ${isSelected ? '#4f46e5' : 'var(--border-color, #e2e8f0)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setCompanyFilter(isSelected ? 'ALL' : partner.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#4f46e5', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.86rem' }}>
                      {partner.code?.slice(0, 3) || partner.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>{partner.name}</h4>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Corporate Partner</span>
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                  <span>Open Roles: <strong>{productCount}</strong></span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSubmit('IT & Software', partner.name);
                    }}
                  >
                    <span>Refer Candidate</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* ── Available Positions Specification Matrix ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={18} style={{ color: '#4f46e5' }} />
              <span>Available Job Positions & Mandates Matrix</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Compare role requirements, compensation packages, required credentials, and refer candidates directly
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Filter by Sector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} style={{ color: '#64748b' }} />
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
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
                <option value="ALL">All Sectors</option>
                {sectorsList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filter by Company */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
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
              <option value="ALL">All Companies ({jobsMatrix.length})</option>
              {partnersList.map((p) => (
                <option key={p.id || p.name} value={p.name}>{p.name}</option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search positions, skills..."
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
                <th style={{ width: '180px' }}>Corporate Employer</th>
                <th style={{ width: '220px' }}>Available Position</th>
                <th style={{ width: '140px' }}>Sector</th>
                <th style={{ minWidth: '170px' }}>Compensation / CTC</th>
                <th style={{ minWidth: '240px' }}>Minimum Eligibility Criteria</th>
                <th style={{ width: '170px' }}>Required Documents</th>
                <th style={{ width: '130px' }}>Hiring SLA</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Direct Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingConfig && jobsMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                    Loading verified job mandates...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    <Briefcase size={38} style={{ color: '#cbd5e1', margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}>
                      {jobsMatrix.length === 0 ? 'No Job Mandates Configured Yet' : 'No Job Positions Matched'}
                    </div>
                    <p style={{ margin: '4px 0 16px', fontSize: '0.84rem' }}>
                      {jobsMatrix.length === 0
                        ? 'All dummy job mandates have been removed. Add verified corporate job positions in Form Settings.'
                        : 'Try clearing search filters or add positions in Super Admin Referral Settings.'}
                    </p>
                    {jobsMatrix.length === 0 && rootRole === 'superadmin' ? (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                        onClick={() => navigate('/superadmin/referral-settings')}
                      >
                        <Sliders size={14} />
                        <span>Add Positions in Form Settings</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', margin: '0 auto' }}
                        onClick={() => { setSearchQuery(''); setSectorFilter('ALL'); setCompanyFilter('ALL'); }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => (
                  <tr key={job.id || idx}>
                    <td>
                      <div style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{job.companyName}</div>
                      <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, background: '#eef2ff', color: '#3730a3' }}>
                        {job.companyCode || 'Corporate Employer'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{job.roleTitle}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        {job.sector}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#4338ca' }}>
                        {job.compensation}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #475569)', lineHeight: '1.45' }}>
                      {job.eligibility}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: '#475569' }}>
                        {job.requiredDocuments?.map((doc, dIdx) => (
                          <span key={dIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={11} style={{ color: '#10b981' }} /> {doc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#f1f5f9', color: '#334155' }}>
                        <Clock size={11} /> {job.turnaroundTime}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }}
                        onClick={() => handleOpenSubmit(job.sector, job.companyName)}
                      >
                        <span>Refer Candidate</span>
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

      {/* ── Multi-Step Job Referral Modal ── */}
      <JobReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultSector={submitSector}
        defaultCompany={submitCompany}
        rootRole={rootRole}
      />
    </div>
  );
}
