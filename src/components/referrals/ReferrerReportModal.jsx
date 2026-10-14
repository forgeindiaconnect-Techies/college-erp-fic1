import React, { useState, useEffect } from 'react';
import {
  X, User, Building2, CreditCard, Shield, Briefcase, Landmark,
  DollarSign, CheckCircle2, Clock, AlertCircle, Download, FileText,
  Calendar, Check, Copy
} from 'lucide-react';
import { getReferrerReport, getReferralExportCsvUrl } from '../../api/index';

export default function ReferrerReportModal({ isOpen, onClose, referrerId, onViewReferral }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (isOpen && referrerId) {
      loadReport();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, referrerId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getReferrerReport(referrerId);
      if (res?.data?.success) {
        setData(res.data.data);
      } else {
        setError(res?.data?.message || 'Failed to load referrer profile');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error fetching referrer report');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, id) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleExportCSV = () => {
    if (!referrerId) return;
    const url = getReferralExportCsvUrl({ referrerId });
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const profile = data?.profile || {};
  const summary = data?.summary || {};
  const breakdown = data?.categoryBreakdown || {};
  const categoryFinancials = data?.categoryFinancials || {};
  const referrals = data?.referrals || [];

  return (
    <div className="mgmt-modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="mgmt-modal-card"
        style={{
          maxWidth: '1050px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              {profile.name ? profile.name.charAt(0).toUpperCase() : <User size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                  {profile.name || 'Referrer Report'}
                </h2>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                >
                  ID: {profile.employeeId || 'N/A'}
                </span>
                <span
                  style={{
                    background: '#22c55e',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {profile.role || 'Employee'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#bfdbfe', marginTop: '2px' }}>
                Department: <strong>{profile.department || 'General'}</strong> • Email: <strong>{profile.email}</strong> • Phone: <strong>{profile.phone}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: '#ffffff',
                padding: '7px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Download size={15} /> Export Report
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔄</div>
              <div>Loading detailed referrer audit history...</div>
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
              {error}
            </div>
          ) : (
            <>
              {/* Top Financial & Progression KPI Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '1.25rem' }}>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Referrals</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{summary.totalReferrals || 0}</div>
                  <div style={{ fontSize: '0.72rem', color: '#2563eb', marginTop: '2px' }}>All categories submitted</div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Eligible Leads</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{summary.eligibleCount || 0}</div>
                  <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>Milestones verified</div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Ineligible / Rejected</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{summary.rejectedCount || 0}</div>
                  <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '2px' }}>Void / Cancelled</div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Eligible Incentive</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>₹{(summary.totalEligibleIncentive || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Configured rule rate</div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Paid & Settled</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>₹{(summary.totalPaid || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '2px' }}>UTR bank verified</div>
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Remaining Pending</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>₹{(summary.totalPending || 0).toLocaleString()}</div>
                  <div style={{ fontSize: '0.72rem', color: '#ea580c', marginTop: '2px' }}>Awaiting clearance</div>
                </div>
              </div>

              {/* 4 Category Breakdown Cards */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                  Category-Wise Referral Distribution & Financials
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                  {[
                    { key: 'Credit Card', label: 'Credit Cards', icon: CreditCard, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                    { key: 'Insurance', label: 'Insurance', icon: Shield, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                    { key: 'Job', label: 'Jobs', icon: Briefcase, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                    { key: 'Bank Account', label: 'Bank Accounts', icon: Landmark, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                  ].map(cat => {
                    const count = breakdown[cat.key] || 0;
                    const fin = categoryFinancials[cat.key] || { eligible: 0, paid: 0, pending: 0 };
                    const IconComp = cat.icon;
                    return (
                      <div
                        key={cat.key}
                        style={{
                          background: cat.bg,
                          border: `1px solid ${cat.border}`,
                          borderRadius: '10px',
                          padding: '10px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: cat.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IconComp size={16} /> {cat.label}
                          </span>
                          <span style={{ background: '#ffffff', padding: '2px 8px', borderRadius: '12px', fontWeight: 800, fontSize: '0.82rem', color: '#1e293b', border: `1px solid ${cat.border}` }}>
                            {count} Leads
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '10px', textAlign: 'center' }}>
                          <div style={{ background: '#ffffff', padding: '5px 2px', borderRadius: '6px', border: `1px solid ${cat.border}` }}>
                            <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Eligible</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: cat.color, marginTop: '2px' }}>₹{fin.eligible.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#ffffff', padding: '5px 2px', borderRadius: '6px', border: `1px solid ${cat.border}` }}>
                            <div style={{ fontSize: '0.62rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>Paid</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>₹{fin.paid.toLocaleString()}</div>
                          </div>
                          <div style={{ background: '#ffffff', padding: '5px 2px', borderRadius: '6px', border: `1px solid ${cat.border}` }}>
                            <div style={{ fontSize: '0.62rem', color: '#c2410c', fontWeight: 700, textTransform: 'uppercase' }}>Pending</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>₹{fin.pending.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Individual Referral History Table */}
              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                    Individual Candidate Referral Ledger ({referrals.length})
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Traceable incentive amounts linked directly to verified milestones.
                  </span>
                </div>

                <div className="mgmt-table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="mgmt-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Ref Code</th>
                        <th style={{ padding: '8px 12px' }}>Category</th>
                        <th style={{ padding: '8px 12px' }}>Referred Candidate</th>
                        <th style={{ padding: '8px 12px' }}>Application / Ref ID</th>
                        <th style={{ padding: '8px 12px' }}>Referral Date</th>
                        <th style={{ padding: '8px 12px' }}>Application Status</th>
                        <th style={{ padding: '8px 12px' }}>Milestone / Eligibility</th>
                        <th style={{ padding: '8px 12px' }}>Rate & Incentive</th>
                        <th style={{ padding: '8px 12px' }}>Payment Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                            No referral records registered by this referrer yet.
                          </td>
                        </tr>
                      ) : (
                        referrals.map(r => {
                          const candName =
                            r.insuranceDetails?.applicantName ||
                            r.creditCardDetails?.applicantName ||
                            r.bankAccountDetails?.applicantName ||
                            r.jobDetails?.candidateName ||
                            'N/A';
                          const candPhone =
                            r.insuranceDetails?.applicantPhone ||
                            r.creditCardDetails?.applicantPhone ||
                            r.bankAccountDetails?.applicantPhone ||
                            r.jobDetails?.candidatePhone ||
                            '';
                          const appId =
                            r.insuranceDetails?.policyNumber ||
                            r.creditCardDetails?.applicationNumber ||
                            r.bankAccountDetails?.accountNumberMasked ||
                            r.jobDetails?.jobReferenceId ||
                            r.insuranceDetails?.partnerReferenceNumber ||
                            r.creditCardDetails?.partnerReferenceNumber ||
                            r.bankAccountDetails?.partnerReferenceNumber ||
                            r.referralCode;

                          const incRecord = r.incentiveRecord;

                          return (
                            <tr key={r._id}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#1e40af' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span>{r.referralCode}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(r.referralCode, r._id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8' }}
                                    title="Copy Code"
                                  >
                                    {copiedId === r._id ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </td>

                              <td style={{ padding: '8px 12px' }}>
                                <span className={`ref-cat-tag ref-cat-${r.category?.toLowerCase().replace(/\s+/g, '')}`}>
                                  {r.category}
                                </span>
                              </td>

                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{candName}</div>
                                {candPhone && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{candPhone}</div>}
                              </td>

                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.78rem', color: '#475569' }}>
                                {appId}
                              </td>

                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', fontSize: '0.78rem', color: '#64748b' }}>
                                {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>

                              <td style={{ padding: '8px 12px' }}>
                                <span className={`ref-badge ${
                                  r.status === 'Submitted' ? 'ref-badge-submitted' :
                                  ['Under Review', 'Verification', 'Screening'].includes(r.status) ? 'ref-badge-under-review' :
                                  ['Policy Issued', 'Approved', 'Activated', 'Account Opened', 'Joined'].includes(r.status) ? 'ref-badge-success' :
                                  'ref-badge-rejected'
                                }`}>
                                  {r.status}
                                </span>
                              </td>

                              <td style={{ padding: '8px 12px' }}>
                                {r.milestoneVerified ? (
                                  <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}>
                                    <CheckCircle2 size={13} /> {r.verifiedMilestoneName || 'Verified'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Under Review</span>
                                )}
                              </td>

                              <td style={{ padding: '8px 12px' }}>
                                {r.incentiveEligible ? (
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.92rem' }}>
                                      ₹{r.incentiveAmount}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                      Rate: ₹{r.incentiveAmount} × 1
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>₹0 (Pending)</span>
                                )}
                              </td>

                              <td style={{ padding: '8px 12px' }}>
                                {r.incentiveStatus === 'Paid' ? (
                                  <div>
                                    <span className="ref-badge ref-badge-success">Paid</span>
                                    {incRecord?.paidAt && (
                                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                                        {new Date(incRecord.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                      </div>
                                    )}
                                    {incRecord?.payoutRef && (
                                      <div style={{ fontSize: '0.66rem', color: '#2563eb', fontFamily: 'monospace' }}>
                                        {incRecord.payoutRef}
                                      </div>
                                    )}
                                  </div>
                                ) : r.incentiveStatus === 'Approved' ? (
                                  <span className="ref-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>Approved</span>
                                ) : r.incentiveStatus === 'Pending Approval' ? (
                                  <span className="ref-badge ref-badge-under-review">Pending Approval</span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>None</span>
                                )}
                              </td>

                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (onViewReferral) onViewReferral(r);
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#2563eb',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                  }}
                                >
                                  View
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
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            College ERP Candidate Referral Audit System • Real-Time Database Verified
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mgmt-btn-secondary"
            style={{ padding: '6px 18px', fontSize: '0.85rem' }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
