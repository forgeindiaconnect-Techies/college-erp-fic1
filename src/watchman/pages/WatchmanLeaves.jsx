import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  PlusCircle,
  RefreshCw,
  Shield,
  Send,
  XCircle
} from 'lucide-react';
import { getLeaves, applyLeave } from '../../api';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const WatchmanLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState('Medium');

  const sessionStr = sessionStorage.getItem('watchman_session');
  let watchmanInfo = {};
  try {
    watchmanInfo = sessionStr ? JSON.parse(sessionStr) : {};
  } catch (e) {
    watchmanInfo = {};
  }

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await getLeaves();
      const records = Array.isArray(res?.data) ? res.data : [];
      setLeaves(records);
    } catch (err) {
      console.warn('Failed to load leaves:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  useRealtimeSync(fetchLeaves, ['leaves', 'staffSupportUpdated']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!reason.trim()) {
      setErrorMsg('Please state a valid reason for the leave request.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start date cannot be after end date.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        staffName: watchmanInfo.name || 'Security Officer',
        staffId: watchmanInfo.employeeId || watchmanInfo.referenceId || 'WMN-001',
        role: 'Watchman',
        department: 'Campus Security & Safety',
        dept: 'Campus Security & Safety',
        type: leaveType,
        leaveType,
        subType: leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        description: reason.trim(),
        priority
      };

      await applyLeave(payload);
      setSuccessMsg('Leave request submitted successfully. Forwarded to Central Admin for approval.');
      setReason('');
      fetchLeaves();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = leaves.filter(l => (l.status || '').toLowerCase().includes('pending')).length;
  const approvedCount = leaves.filter(l => (l.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = leaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length;

  return (
    <div className="watchman-container animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#2563eb', color: '#fff', padding: '8px', borderRadius: '10px' }}>
              <Calendar size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Security Officer Leave Requests
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
                Submit absence requests directly to Central Administration and track approval status in real-time.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchLeaves}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '8px 16px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#334155'
          }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh History
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>Total Submissions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{leaves.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>All time leave requests</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>Pending Admin Review</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>{pendingCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706' }}>Awaiting Admin authorization</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>Approved Leaves</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '4px 0' }}>{approvedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>Officially sanctioned absence</div>
        </div>

        <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Rejected / Declined</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0' }}>{rejectedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Declined by Central Admin</div>
        </div>
      </div>

      {/* Main Grid: Application Form + Leave History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Application Form */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <PlusCircle size={18} color="#2563eb" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              New Leave Application
            </h2>
          </div>

          {successMsg && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Leave Type / Category
              </label>
              <select
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#f8fafc', color: '#0f172a' }}
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick / Medical Leave</option>
                <option value="Emergency Duty Leave">Emergency Family Leave</option>
                <option value="Annual Leave">Annual Earned Leave</option>
                <option value="Compensatory Off">Compensatory Off (Duty Swap)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#f8fafc', color: '#0f172a' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#f8fafc', color: '#0f172a' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Urgency Priority
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Low', 'Medium', 'High'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: priority === p ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: priority === p ? '#eff6ff' : '#f8fafc',
                      color: priority === p ? '#1d4ed8' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Reason / Detailed Description
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="State the reason for absence, shift coverage handover, and expected return time..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#f8fafc', color: '#0f172a', resize: 'vertical' }}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '12px 18px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 10px rgba(37,99,235,0.25)',
                opacity: submitting ? 0.7 : 1
              }}
            >
              <Send size={16} /> {submitting ? 'Submitting Application...' : 'Submit Leave Request'}
            </button>
          </form>
        </div>

        {/* Leave History List */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2563eb" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                My Leave History & Status
              </h2>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>
              {leaves.length} Applications
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px' }} />
              <div>Loading leave records...</div>
            </div>
          ) : leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
              <Calendar size={36} color="#cbd5e1" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, color: '#475569' }}>No leave applications on file</div>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>When you submit a leave request, it will appear here with live approval status.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
              {leaves.map((l) => {
                const status = l.status || 'Pending';
                const isApproved = status === 'Approved';
                const isRejected = status === 'Rejected';
                const isPending = !isApproved && !isRejected;

                return (
                  <div
                    key={l.id || l._id}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.92rem' }}>
                          {l.type || l.leaveType}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <Calendar size={13} />
                          <span>{l.startDate} to {l.endDate}</span>
                          {l.daysCount && <span style={{ fontWeight: 700, color: '#2563eb' }}>({l.daysCount} days)</span>}
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isApproved ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      ) : isRejected ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> Rejected
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Pending Admin Approval
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#475569', background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', marginTop: '6px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{l.reason || l.description}</div>
                      {isRejected && l.rejectionReason && (
                        <div style={{ marginTop: '6px', color: '#dc2626', fontSize: '0.76rem', fontWeight: 700 }}>
                          Reason for rejection: {l.rejectionReason}
                        </div>
                      )}
                      {isApproved && l.approvedBy && (
                        <div style={{ marginTop: '6px', color: '#16a34a', fontSize: '0.74rem', fontWeight: 700 }}>
                          Authorized by: {l.approvedBy}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                      <span>Submitted: {l.createdAt || l.startDate}</span>
                      <span style={{ fontWeight: 700, color: '#64748b' }}>Priority: {l.priority || 'Medium'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default WatchmanLeaves;
