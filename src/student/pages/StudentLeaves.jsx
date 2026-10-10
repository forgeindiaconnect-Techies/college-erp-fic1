import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, Plus, Clock, CheckCircle2,
  XCircle, AlertCircle, ArrowLeft, Send
} from 'lucide-react';
import './StudentLeaves.css';

const DEFAULT_STUDENT = {
  id: '',
  name: '',
  dept: '',
  sem: '',
  email: ''
};

const MOCK_LEAVES = [];

const StudentLeaves = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Leave Requests database state
  const [leaves, setLeaves] = useState([]);

  // Form State
  const [form, setForm] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('student_session');
    let activeStud = DEFAULT_STUDENT;
    if (session) {
      activeStud = JSON.parse(session);
      setStudentSession(activeStud);
    } else {
      navigate('/student/login');
      return;
    }

    // 2. Load leaves
    const loadLeaves = () => {
      const savedLeaves = localStorage.getItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      if (savedLeaves) {
        setLeaves(JSON.parse(savedLeaves));
      } else {
        localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(MOCK_LEAVES));
        setLeaves([]);
      }
    };

    loadLeaves();
    window.addEventListener('storage', loadLeaves);
    setLoading(false);
    return () => window.removeEventListener('storage', loadLeaves);
  }, [navigate]);

  const studentId = studentSession.id;
  const studentName = studentSession.name || 'Student';

  // Filter leaves to current student
  const myLeaves = leaves.filter(l => l.staffId === studentId || l.name === studentName || l.staffName === studentName);

  // Form Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    const newLeave = {
      id: `leave_${Date.now()}`,
      staffId: studentId,
      name: studentName,
      staffName: studentName,
      role: 'Student',
      dept: studentSession.dept || 'Computer Science',
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-CA')
    };

    const savedLeaves = localStorage.getItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const existing = savedLeaves ? JSON.parse(savedLeaves) : [];
    const updated = [newLeave, ...existing];
    setLeaves(updated);
    localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    setSuccess(true);
    setForm({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
    setTimeout(() => {
      setSuccess(false);
    }, 1500);
  };

  const getStatusIcon = (status) => {
    if (status === 'Approved') return <CheckCircle2 size={16} className="text-success" />;
    if (status === 'Pending') return <Clock size={16} className="text-warning-s" />;
    return <XCircle size={16} className="text-danger" />;
  };

  const clApproved = myLeaves.filter(l => l.status === 'Approved' && l.type === 'Casual Leave').length;
  const mlApproved = myLeaves.filter(l => l.status === 'Approved' && (l.type === 'Medical Leave' || l.type === 'Sick Leave')).length;
  const odApproved = myLeaves.filter(l => l.status === 'Approved' && l.type.includes('Duty')).length;

  return (
    <div className="student-leaves-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Student Leave Portal
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Student Self-Service
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Submit absence requests for Medical or Duty leave and track HOD approvals in real time for <strong>{studentName}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Academic Year 2026-27 Active
          </span>
        </div>
      </div>

      {/* 4 Interactive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Casual Leave (CL)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {clApproved} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Approved</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>Personal & family absence</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Medical Leave (ML)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {mlApproved} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Approved</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Health & doctor recommended</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>On Duty (OD)</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>
            {odApproved} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>Approved</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Symposiums & sports events</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Total Applications</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>
            {myLeaves.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>Submitted</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Logged in student history</div>
        </div>
      </div>

      {/* DUAL WORKSTATION GRID: APPLY FORM (Left) & HISTORY LOGS (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        
        {/* Left Column: Apply Form */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Send size={20} color="#2563eb" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Apply for Leave
            </h2>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
            Fill in leave parameters for HOD review.
          </p>

          {success && (
            <div style={{ padding: '12px 18px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.86rem', marginBottom: '14px' }}>
              <CheckCircle2 size={18} color="#059669" /> Leave request submitted successfully! Routed to HOD.
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Leave Category</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
              >
                <option value="Casual Leave">Casual Leave (CL)</option>
                <option value="Medical Leave">Medical Leave (ML)</option>
                <option value="On Duty Leave">On Duty Leave (OD)</option>
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
                placeholder="State your reason for taking leave..."
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

        {/* Right Column: History List */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <FileText size={20} color="#7c3aed" />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              My Leave History & Logs
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '420px', overflowY: 'auto' }}>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '70px', borderRadius: '10px' }}></div>
              ))
            ) : myLeaves.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', margin: 'auto 0' }}>
                <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>No Leave Applications</div>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Your submitted absence requests will appear here with live HOD status updates.</p>
              </div>
            ) : (
              myLeaves.map(l => {
                const isApproved = l.status === 'Approved';
                const isPending = l.status === 'Pending';

                return (
                  <div
                    key={l.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: isApproved ? '#f0fdf4' : (isPending ? '#fffbeb' : '#fef2f2'),
                      border: isApproved ? '1px solid #bbf7d0' : (isPending ? '1px solid #fde68a' : '1px solid #fecaca'),
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a' }}>
                        {l.type}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '20px',
                        background: isApproved ? '#dcfce7' : (isPending ? '#fef3c7' : '#fee2e2'),
                        color: isApproved ? '#15803d' : (isPending ? '#b45309' : '#b91c1c')
                      }}>
                        {isApproved ? '✓ Approved' : (isPending ? '⏳ Pending HOD Review' : 'Rejected')}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} color="#64748b" />
                      <strong>{l.startDate}</strong> to <strong>{l.endDate}</strong>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '6px 10px', borderRadius: '6px' }}>
                      "{l.reason}"
                    </p>

                    {l.approvedBy && (
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>
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

export default StudentLeaves;
