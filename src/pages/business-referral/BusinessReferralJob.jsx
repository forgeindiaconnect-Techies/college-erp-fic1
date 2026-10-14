import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Search, ChevronRight, CheckCircle2, Shield,
  FileText, Clock, Info, X, Check, Building2, Plus, Award, Edit
} from 'lucide-react';
import { getPublishedOpportunities } from '../../api';
import JobReferralModal from '../../components/referrals/JobReferralModal';
import EditCategoryModal from '../../components/referrals/EditCategoryModal';
import CategoryProgramSpotlight from '../../components/referrals/CategoryProgramSpotlight';
import { useCategoryConfig } from '../../utils/categoryConfig';
import '../admin/UserManagementCommon.css';
import './BusinessReferralCategory.css';

export default function BusinessReferralJob() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRole = location.pathname.split('/')[1] || 'admin';
  const basePath = `/${rootRole}/business-referral`;
  const dashboardPath = `/${rootRole}/dashboard`;

  const { config: categoryConfig } = useCategoryConfig('job-referral');
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitSector, setSubmitSector] = useState('IT / Software');
  const [submitCompany, setSubmitCompany] = useState('Corporate Partner');
  const [publishedJobs, setPublishedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const res = await getPublishedOpportunities({ category: 'Job Referral' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const cleanJobs = res.data.data.filter(
          (j) => j.opportunityCode !== 'OPP-JOB-2026-001' && j.title !== 'TCS Software Engineer / Full Stack Developer Opening'
        );
        setPublishedJobs(cleanJobs);
      }
    } catch (err) {
      console.warn('Notice loading job opportunities:', err.message);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleOpenSubmit = (sectorTitle, companyName) => {
    setSubmitSector(sectorTitle || 'Corporate Sector');
    setSubmitCompany(companyName || 'Corporate Partner');
    setShowSubmitModal(true);
  };

  const filteredJobs = publishedJobs.filter((job) =>
    (job.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (job.providerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (job.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="management-page animate-fade-in">
      {/* ── Real-Time ERP Header Card ── */}
      <div className="mgmt-header-card">
        <div className="mgmt-header-bar" style={{ background: 'linear-gradient(90deg, #6366f1, #4f46e5, #0284c7)' }}></div>
        
        <div className="mgmt-header-top">
          <div className="mgmt-header-title-area">
            <div className="mgmt-sync-badge">
              <span className="mgmt-sync-dot"></span>
              <span>Real-Time Corporate Mandate Network Active</span>
            </div>
            <h1>{categoryConfig?.title || 'Job Referral'}</h1>
            <p>
              {categoryConfig?.description || 'Direct institutional corporate hiring mandates. Connect alumni, graduating scholars, and qualified candidates with leading corporate recruiters.'}
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
                  title="Manage and Edit Job Opportunities in Central"
                >
                  <Plus size={15} />
                  <span>Publishing Central</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="mgmt-btn-primary"
              onClick={() => handleOpenSubmit('IT / Software', 'Tata Consultancy Services (TCS)')}
            >
              <Plus size={16} />
              <span>+ Refer Candidate</span>
            </button>
          </div>
        </div>

        <div className="mgmt-header-meta">
          <span className="meta-item">Module: <strong>Business Referral</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Category: <strong>{categoryConfig?.subtitle || 'Jobs & Talent Acquisition'}</strong></span>
          <span className="meta-bullet">•</span>
          <span className="meta-item">Track Mode: <strong>Direct Corporate Mandates</strong></span>
        </div>
      </div>

      {/* ── Category Program Spotlight & Guided Actions ── */}
      <CategoryProgramSpotlight
        config={categoryConfig}
        rootRole={rootRole}
        onOpenEdit={() => setShowEditCategoryModal(true)}
        onOpenSubmit={() => handleOpenSubmit('IT / Software', 'Tata Consultancy Services (TCS)')}
        onOpenPublish={() => navigate('/superadmin/business-referrals')}
      />

      {/* ── Standard ERP KPI Stat Cards ── */}
      <div className="mgmt-kpi-grid">
        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Briefcase size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Active Mandates</span>
            <h3 className="mgmt-kpi-value">{publishedJobs.length} Available</h3>
          </div>
        </div>

        <div className="mgmt-kpi-card">
          <div className="mgmt-kpi-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <Building2 size={22} />
          </div>
          <div className="mgmt-kpi-info">
            <span className="mgmt-kpi-label">Corporate Partners</span>
            <h3 className="mgmt-kpi-value">50+ MNC Partners</h3>
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

      {/* ── Corporate Mandate Specification Table ── */}
      <div className="mgmt-table-card">
        <div className="mgmt-filters-row">
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={18} style={{ color: '#6366f1' }} />
              <span>Active Corporate Hiring Mandates</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Accredited enterprise employer tracks with verified qualifications, compensation packages, and direct interview pipelines
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #94a3b8)' }} />
              <input
                type="text"
                placeholder="Search jobs..."
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
                <th style={{ width: '160px' }}>Sector / Track</th>
                <th style={{ width: '220px' }}>Corporate Employer</th>
                <th style={{ minWidth: '220px' }}>Representative Roles</th>
                <th style={{ minWidth: '220px' }}>Eligibility Criteria</th>
                <th style={{ width: '160px' }}>Compensation / Stipend</th>
                <th style={{ minWidth: '180px' }}>Milestone Trigger</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingJobs ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    Loading verified job mandates...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5', marginBottom: '0.75rem' }}>
                      <Briefcase size={26} />
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                      No Job Opportunities Published Yet
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748b', maxWidth: '460px', margin: '0 auto 1.25rem auto' }}>
                      {rootRole === 'superadmin' 
                        ? 'No corporate job mandates have been published yet. Go to Publishing & Opportunity Central to publish corporate mandates.'
                        : 'Corporate hiring mandates published by Super Admin will appear here dynamically in real time.'}
                    </div>
                    {rootRole === 'superadmin' && (
                      <button
                        type="button"
                        className="mgmt-btn-primary"
                        style={{ margin: '0 auto', background: '#4f46e5' }}
                        onClick={() => navigate('/superadmin/business-referrals')}
                      >
                        <Plus size={15} /> Publish New Job Mandate
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job._id || job.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {job.subCategory || 'Corporate Track'}
                    </td>
                    <td>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe' }}>
                        {job.providerName || job.title}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #334155)', fontWeight: 600 }}>{job.title}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', lineHeight: '1.45' }}>{job.eligibilityCriteria || job.description || 'Graduates & Postgraduates'}</td>
                    <td style={{ fontWeight: 700, color: '#4f46e5' }}>{job.rewardAmount ? `₹${Number(job.rewardAmount).toLocaleString('en-IN')}` : (job.rewardType || 'Per Placement')}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main, #475569)', lineHeight: '1.45' }}>Candidate Joining</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>
                        <Check size={11} /> Live
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="mgmt-btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', background: '#4f46e5', color: '#ffffff', borderColor: '#4f46e5' }}
                        onClick={() => handleOpenSubmit(job.subCategory || 'Corporate Track', job.providerName || job.title)}
                      >
                        <span>Refer Talent</span>
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

      {/* ── Real Multi-Step Job Referral Modal ── */}
      <JobReferralModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        defaultSector={submitSector}
        defaultCompany={submitCompany}
        rootRole={rootRole}
      />

      {/* ── Super Admin Edit Category Modal ── */}
      <EditCategoryModal
        isOpen={showEditCategoryModal}
        onClose={() => setShowEditCategoryModal(false)}
        categoryId="job-referral"
      />
    </div>
  );
}
