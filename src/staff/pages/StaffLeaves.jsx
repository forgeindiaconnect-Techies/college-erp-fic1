import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, Plus, Clock, CheckCircle2,
  XCircle, AlertCircle, ArrowLeft, Send, ShieldCheck,
  Award, Trash2, CheckCircle, RefreshCw, X
} from 'lucide-react';
import './StaffLeaves.css';

const DEFAULT_SESSION = {
  id: 'STF001',
  name: 'APPLE',
  dept: 'Computer Science Engineering',
  deptCode: 'CS',
  role: 'Staff',
  email: 'apple@college.edu'
};

const DEFAULT_MOCK_LEAVES = [
  {
    id: 'leave_101',
    staffId: 'STF001',
    staffName: 'APPLE',
    email: 'apple@college.edu',
    dept: 'Computer Science Engineering',
    type: 'Casual Leave',
    startDate: '2026-09-15',
    endDate: '2026-09-16',
    reason: 'Family wedding event attendance.',
    status: 'Approved',
    daysCount: 2,
    approvedBy: 'HOD Computer Science',
    createdAt: '2026-09-12'
  },
  {
    id: 'leave_102',
    staffId: 'STF001',
    staffName: 'APPLE',
    email: 'apple@college.edu',
    dept: 'Computer Science Engineering',
    type: 'Medical Leave',
    startDate: '2026-08-20',
    endDate: '2026-08-21',
    reason: 'Viral fever rest as prescribed by physician.',
    status: 'Approved',
    daysCount: 2,
    approvedBy: 'Principal Office',
    createdAt: '2026-08-19'
  }
];

const StaffLeaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);

  // Leave Requests database state
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'approved'

  // Form State
  const [form, setForm] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('staff_session');
    let activeStaff = DEFAULT_SESSION;
    if (session) {
      try {
        activeStaff = JSON.parse(session);
        setStaffSession(activeStaff);
      } catch (e) {}
    }

    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLeaves(parsed.length > 0 ? parsed : DEFAULT_MOCK_LEAVES);
      } catch (e) {
        setLeaves(DEFAULT_MOCK_LEAVES);
      }
    } else {
      localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(DEFAULT_MOCK_LEAVES));
      setLeaves(DEFAULT_MOCK_LEAVES);
    }

    setLoading(false);
  }, []);

  const staffName = staffSession.name || 'Faculty Member';
  const staffEmail = staffSession.email || '';
  const staffDept = staffSession.dept || staffSession.department || 'Computer Science Engineering';

  // Multi-tier matching for logged-in faculty
  const myLeaves = useMemo(() => {
    return leaves.filter(l => {
      const sName = (l.staffName || l.name || '').toLowerCase();
      const myName = staffName.toLowerCase();
      const sEmail = (l.email || '').toLowerCase();
      const myEmail = staffEmail.toLowerCase();
      return sName === myName || sEmail === myEmail || !l.staffName;
    });
  }, [leaves, staffName, staffEmail]);

  // Quota & balance metrics calculation
  const quota = useMemo(() => {
    let clUsed = 0;
    let mlUsed = 0;
    let odUsed = 0;

    myLeaves.forEach(l => {
      if (l.status === 'Approved') {
        const days = Number(l.daysCount || 1);
        if (l.type === 'Casual Leave') clUsed += days;
        else if (l.type === 'Medical Leave' || l.type === 'Sick Leave') mlUsed += days;
        else if (l.type.includes('Duty') || l.type.includes('OD')) odUsed += days;
      }
    });

    return {
      cl: { max: 12, used: clUsed, remaining: Math.max(0, 12 - clUsed) },
      ml: { max: 10, used: mlUsed, remaining: Math.max(0, 10 - mlUsed) },
      od: { max: 5, used: odUsed, remaining: Math.max(0, 5 - odUsed) },
      totalAvailed: clUsed + mlUsed + odUsed
    };
  }, [myLeaves]);

  // Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    let daysDiff = 1;
    if (form.startDate && form.endDate) {
      const d1 = new Date(form.startDate);
      const d2 = new Date(form.endDate);
      const diffTime = Math.abs(d2 - d1);
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const newLeave = {
      id: `leave_${Date.now()}`,
      staffId: staffSession.id || 'STF001',
      staffName,
      email: staffEmail,
      dept: staffDept,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      daysCount: daysDiff,
      reason: form.reason,
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-CA')
    };

    const updated = [newLeave, ...leaves];
    setLeaves(updated);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(updated));

    setSuccess(true);
    setForm({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleCancelLeave = (id) => {
    if (window.confirm('Cancel this pending leave application?')) {
      const updated = leaves.filter(l => l.id !== id);
      setLeaves(updated);
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(updated));
    }
  };

  const filteredLeaves = useMemo(() => {
    if (activeTab === 'pending') return myLeaves.filter(l => l.status === 'Pending');
    if (activeTab === 'approved') return myLeaves.filter(l => l.status === 'Approved');
    return myLeaves;
  }, [myLeaves, activeTab]);

  return (
    <div className="leaves-management-staff animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Faculty Leave Portal & Quotas
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              HRMS Console
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Apply for institutional leave entitlements, track HOD approvals, and inspect active balances for <strong>{staffName}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Academic Year 2026-27 Active
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.86rem' }}>
          <CheckCircle2 size={18} color="#059669" /> Leave application submitted successfully! Routed to HOD for approval.
        </div>
      )}

      {/* 4 Interactive KPI Cards for Leave Quotas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Casual Leave (CL)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {quota.cl.remaining} / {quota.cl.max} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>{quota.cl.used} days availed this session</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Medical Leave (ML)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {quota.ml.remaining} / {quota.ml.max} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>{quota.ml.used} days availed</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>On-Duty / Conference (OD)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>
            {quota.od.remaining} / {quota.od.max} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Sponsored academic symposiums</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Total Days Availed</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>
            {quota.totalAvailed} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>{myLeaves.length} Total applications logged</div>
        </div>
      </div>

      {/* DUAL WORKSTATION GRID: APPLY FORM (Left) & REQUEST AUDIT HISTORY (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        
        {/* Left Card: Apply for Leave Form */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Calendar size={20} color="#2563eb" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Apply for Leave
            </h2>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
            Select leave category and schedule dates for HOD approval.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Leave Category</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
              >
                <option value="Casual Leave">Casual Leave (CL) — {quota.cl.remaining} days left</option>
                <option value="Medical Leave">Medical Leave (ML) — {quota.ml.remaining} days left</option>
                <option value="Duty Leave">On-Duty / Conference (OD) — {quota.od.remaining} days left</option>
                <option value="Earned Leave">Earned Leave (EL)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>End Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={e => setForm({ ...form, endDate: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Reason / Explanation</label>
              <textarea
                required
                rows={4}
                placeholder="State the reason for leave clearly (e.g. personal family event, medical rest, conference presentation)..."
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' }}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: '6px',
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
              }}
            >
              <Send size={16} /> Submit Leave Application
            </button>
          </form>
        </div>

        {/* Right Card: Leave Request Audit History */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#7c3aed" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Request History & Logs
              </h2>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setActiveTab('all')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: activeTab === 'all' ? '#fff' : 'transparent', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', color: '#1e293b' }}
              >
                All ({myLeaves.length})
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: activeTab === 'pending' ? '#fff' : 'transparent', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', color: '#1e293b' }}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: activeTab === 'approved' ? '#fff' : 'transparent', fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', color: '#1e293b' }}
              >
                Approved
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '420px', overflowY: 'auto' }}>
            {filteredLeaves.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', margin: 'auto 0' }}>
                <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>No Leave Records Found</div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Submitted leave applications will appear here with live approval status.</p>
              </div>
            ) : (
              filteredLeaves.map((l, idx) => {
                const isApproved = l.status === 'Approved';
                const isPending = l.status === 'Pending';

                return (
                  <div
                    key={l.id || idx}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: isApproved ? '#f0fdf4' : (isPending ? '#fffbeb' : '#fef2f2'),
                      border: isApproved ? '1px solid #bbf7d0' : (isPending ? '1px solid #fde68a' : '1px solid #fecaca'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a' }}>
                        {l.type} ({l.daysCount || 1} {Number(l.daysCount || 1) === 1 ? 'Day' : 'Days'})
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          background: isApproved ? '#dcfce7' : (isPending ? '#fef3c7' : '#fee2e2'),
                          color: isApproved ? '#15803d' : (isPending ? '#b45309' : '#b91c1c')
                        }}>
                          {isApproved ? '✓ Approved' : (isPending ? '⏳ Pending HOD Review' : 'Rejected')}
                        </span>
                        {isPending && (
                          <button
                            title="Cancel Application"
                            onClick={() => handleCancelLeave(l.id)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="#64748b" />
                      <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '6px 10px', borderRadius: '6px' }}>
                      "{l.reason}"
                    </p>

                    {l.approvedBy && (
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                        ✓ Approved by {l.approvedBy}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default StaffLeaves;
