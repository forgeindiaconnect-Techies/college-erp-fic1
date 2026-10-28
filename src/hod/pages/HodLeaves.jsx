import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Search, Calendar, User, Clock, CheckCircle2, AlertCircle, FileText, PlusCircle, Users } from 'lucide-react';
import { getLeaves, updateLeaveStatus, createLeave } from '../../api';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science', name: 'HOD' }; }
  catch { return { dept: 'Computer Science', name: 'HOD' }; }
};

const DEFAULT_LEAVES = [
  { id:'LR001', name:'John Doe',       role:'Student', dept:'Computer Science', type:'Medical Leave',  startDate:'2026-05-24', endDate:'2026-05-26', reason:'Viral fever, medical certificate attached.', status:'Pending' },
  { id:'LR002', name:'Dr. Ananya Rao', role:'Staff',   dept:'Computer Science', type:'Casual Leave',   startDate:'2026-05-27', endDate:'2026-05-28', reason:'International academic conference.',           status:'Pending' },
  { id:'LR003', name:'Alice Smith',    role:'Student', dept:'Computer Science', type:'Casual Leave',   startDate:'2026-05-15', endDate:'2026-05-16', reason:'Family function.',                            status:'Approved' },
];

const TABS = ['Pending', 'Approved', 'Rejected', 'Parent Requests', 'My Leaves'];

const ROLE_COLORS = { Student:'#3b82f6', Staff:'#6366F1', Parent:'#10b981' };

const isDeptMatch = (leaveDept, hodDept) => {
  if (!leaveDept || !hodDept) return true;
  const lDept = leaveDept.toLowerCase();
  const hDept = hodDept.toLowerCase();
  if (lDept === hDept) return true;
  if (lDept.includes(hDept) || hDept.includes(lDept)) return true;
  const norm = s => s.replace(/engineering|engg|\.|\s+/g, '');
  return norm(lDept).includes(norm(hDept)) || norm(hDept).includes(norm(lDept));
};

const HodLeaves = () => {
  const hod = getHodSession();
  const DEPT = hod.dept;

  const [leaves, setLeaves] = useState([]);
  const [tab, setTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [newLeave, setNewLeave] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });

  const loadLeaves = useCallback(async () => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    try {
      const res = await getLeaves();
      const records = Array.isArray(res.data) ? res.data : [];
      if (records.length > 0) {
        localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(records));
        const deptLeaves = records.filter(l => isDeptMatch(l.dept || l.department, DEPT) || (!l.dept && !l.role));
        setLeaves(deptLeaves.length ? deptLeaves : records);
        return;
      }
    } catch (err) {
      console.warn('API leave fetch fallback to local cache:', err.message);
    }

    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_LEAVES;
    const deptLeaves = all.filter(l => isDeptMatch(l.dept || l.department, DEPT) || (!l.dept && !l.role));
    setLeaves(deptLeaves.length ? deptLeaves : all);
  }, [DEPT]);

  useEffect(() => {
    loadLeaves();
    window.addEventListener('storage', loadLeaves);
    return () => window.removeEventListener('storage', loadLeaves);
  }, [loadLeaves]);

  useRealtimeSync(loadLeaves, ['leaves', 'staffSupportUpdated']);

  const action = async (id, decision) => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const targetStatus = decision === 'Approved' ? 'HOD Approved – Pending Admin Approval' : 'Rejected';
    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_LEAVES;
    const merged = all.map(l => (l.id === id || l._id === id) ? {
      ...l,
      status: targetStatus,
      hodApprovedBy: decision === 'Approved' ? (hod.name || 'HOD') : l.hodApprovedBy,
      rejectedBy: decision === 'Rejected' ? (hod.name || 'HOD') : l.rejectedBy
    } : l);
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));

    const deptLeaves = merged.filter(l => isDeptMatch(l.dept || l.department, DEPT) || (!l.dept && !l.role));
    setLeaves(deptLeaves.length ? deptLeaves : merged);

    // Call backend API to persist to MongoDB
    try {
      const res = await updateLeaveStatus(id, {
        action: decision === 'Approved' ? 'approve' : 'reject',
        status: targetStatus,
        remarks: decision === 'Approved'
          ? `HOD Approved by ${hod.name || 'HOD'} – Forwarded to Admin for final approval`
          : `Rejected by HOD (${hod.name || 'HOD'})`
      });
      emitERPDataUpdate(['leaves', 'staffSupportUpdated'], 'updated', res?.data || { id, status: targetStatus });
    } catch (err) {
      console.warn('Failed to update leave on server:', err.message);
    }
  };

  const filtered = leaves.filter(l => {
    const name = l.name || l.staffName || '';
    const studentName = l.studentName || '';
    const studentId = l.studentId || '';
    const q = search.toLowerCase();
    const status = l.status || 'Pending';
    const isParentRequest = l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'));

    const matchesSearch = name.toLowerCase().includes(q) ||
                          studentName.toLowerCase().includes(q) ||
                          studentId.toLowerCase().includes(q) ||
                          (l.reason || '').toLowerCase().includes(q) ||
                          (l.type || '').toLowerCase().includes(q);

    if (tab === 'My Leaves') {
      return l.role === 'HOD' && l.name === hod.name && matchesSearch;
    }
    if (tab === 'Parent Requests') {
      return isParentRequest && matchesSearch;
    }
    if (tab === 'Pending') {
      return (status === 'Pending' || status === 'Pending HOD Approval') && l.role !== 'HOD' && !isParentRequest && matchesSearch;
    }
    if (tab === 'Approved') {
      return (status === 'Approved' || status === 'HOD Approved – Pending Admin Approval') && l.role !== 'HOD' && matchesSearch;
    }
    return status === tab && l.role !== 'HOD' && matchesSearch;
  });

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    const newRequest = {
      id: 'LR' + Math.floor(Math.random() * 10000),
      name: hod.name,
      staffName: hod.name,
      role: 'HOD',
      dept: DEPT,
      ...newLeave,
      status: 'Pending Admin Approval',
      createdAt: new Date().toLocaleDateString('en-CA')
    };
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_LEAVES;
    const merged = [newRequest, ...all];
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));

    // Update local state
    setLeaves(merged.filter(l => isDeptMatch(l.dept || l.department, DEPT) || (!l.dept && !l.role)));
    setShowApplyModal(false);
    setTab('My Leaves');
    setNewLeave({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });

    try {
      await createLeave(newRequest);
      emitERPDataUpdate(['leaves', 'staffSupportUpdated'], 'created', newRequest);
    } catch (err) {
      console.warn('Failed to post HOD leave to API:', err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Leave Approvals & Management
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              {DEPT} Department
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Review absence applications submitted by faculty & students, track department logs, and manage HOD leave entitlements.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Academic Year 2026-27 Active
          </span>
          <button
            onClick={() => setShowApplyModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}
          >
            <PlusCircle size={17} /> Apply for Leave
          </button>
        </div>
      </div>

      {/* 5 Interactive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Pending Approvals</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {leaves.filter(l => ((l.status || 'Pending') === 'Pending' || l.status === 'Pending HOD Approval') && l.role !== 'HOD' && l.role !== 'Parent' && !l.parentName).length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Requests</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Awaiting HOD authorization</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Approved Entitlements</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status === 'Approved' || l.status === 'HOD Approved – Pending Admin Approval') && l.role !== 'HOD').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Approved</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Active approved absence logs</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Parent Ward Requests</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#047857', margin: '4px 0 2px' }}>
            {leaves.filter(l => l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'))).length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>From Parents</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Applied for student scholars</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Rejected Requests</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status || 'Pending') === 'Rejected' && l.role !== 'HOD').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>Declined</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Denied application history</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>My Personal Leaves</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>
            {leaves.filter(l => l.role === 'HOD' && l.name === hod.name).length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>Submitted</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Routed to Principal Office</div>
        </div>
      </div>

      {/* Main Content Container: Filter Tabs, Search & Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Tab buttons */}
          <div className="hod-pill-tabs" style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
            {TABS.map(t => {
              let count = 0;
              if (t === 'My Leaves') {
                count = leaves.filter(l => l.role === 'HOD' && l.name === hod.name).length;
              } else if (t === 'Parent Requests') {
                count = leaves.filter(l => l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'))).length;
              } else if (t === 'Pending') {
                count = leaves.filter(l => ((l.status || 'Pending') === 'Pending' || l.status === 'Pending HOD Approval') && l.role !== 'HOD' && l.role !== 'Parent' && !l.parentName).length;
              } else if (t === 'Approved') {
                count = leaves.filter(l => (l.status === 'Approved' || l.status === 'HOD Approved – Pending Admin Approval') && l.role !== 'HOD').length;
              } else {
                count = leaves.filter(l => (l.status || 'Pending') === t && l.role !== 'HOD').length;
              }
              const isActive = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#0f172a' : '#64748b',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t === 'Parent Requests' && <Users size={14} color={isActive ? '#059669' : '#64748b'} />}
                  {t} <span style={{ fontSize: '0.75rem', opacity: 0.85, background: isActive ? '#e2e8f0' : '#e2e8f0', padding: '1px 6px', borderRadius: '10px' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="hod-live-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '280px' }}>
            <Search size={16} color="#64748b" />
            <input
              placeholder="Search applicant, student roll no, leave type, or reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem', color: '#0f172a' }}
            />
          </div>
        </div>

        {/* Real-time ERP Table */}
        <div className="table-container" style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Applicant & Student Details</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Category / Role</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Leave Type</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Absence Schedule</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Reason / Notes</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Status</th>
                {tab === 'Pending' && <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>HOD Action</th>}
                {tab === 'Parent Requests' && <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>HOD Access Mode</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={(tab === 'Pending' || tab === 'Parent Requests') ? 7 : 6} style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No {tab.toLowerCase()} leave requests found</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Applications matching this criteria will appear in real time.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(l => {
                  const name = l.name || l.staffName || 'Unknown Applicant';
                  const role = l.role || 'Student';
                  const isParent = role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'));
                  const status = l.status || 'Pending';
                  const isApproved = status === 'Approved';
                  const isPending = status === 'Pending';
                  const studentName = l.studentName || (isParent && l.description && l.description.match(/Ward:\s*([^|(]+)/i)?.[1]?.trim()) || '';
                  const studentId = l.studentId || (isParent && l.description && l.description.match(/\(([^)]+)\)/)?.[1]?.trim()) || '';

                  return (
                    <tr key={l.id || l._id} style={{ background: '#f8fafc', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            background: isParent ? '#d1fae5' : (role === 'Staff' ? '#e0e7ff' : '#dbeafe'), 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: isParent ? '#065f46' : (role === 'Staff' ? '#4338ca' : '#1e40af'), 
                            fontWeight: 800, 
                            fontSize: '0.86rem' 
                          }}>
                            {(isParent ? (l.parentName || name) : name).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                                {isParent ? (l.parentName || name) : name}
                              </span>
                              {isParent && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '6px' }}>
                                  Parent
                                </span>
                              )}
                            </div>
                            
                            {/* Which Student's Parent Requested the Leave */}
                            {isParent && (
                              <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🎓 Ward:</span>
                                <span>{studentName || 'Student Scholar'}</span>
                                {studentId && <span style={{ color: '#64748b', fontWeight: 600 }}>({studentId})</span>}
                              </div>
                            )}

                            {l.dept && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Dept: {l.dept || l.department}</div>}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          background: isParent ? '#ecfdf5' : (role === 'Staff' ? '#e0e7ff' : (role === 'HOD' ? '#f3e8ff' : '#dbeafe')),
                          color: isParent ? '#047857' : (role === 'Staff' ? '#3730a3' : (role === 'HOD' ? '#6b21a8' : '#1e40af')),
                          border: `1px solid ${isParent ? '#a7f3d0' : (role === 'Staff' ? '#c7d2fe' : (role === 'HOD' ? '#e9d5ff' : '#bfdbfe'))}`
                        }}>
                          {isParent ? 'Parent (for Ward)' : role}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        {l.type}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                          <Calendar size={14} color="#64748b" />
                          {l.startDate} → {l.endDate}
                        </div>
                        {l.daysCount && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                            {l.daysCount} Day{l.daysCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason || l.description}>
                          <FileText size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {l.reason || l.description}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {(() => {
                          const isHodApproved = status === 'HOD Approved – Pending Admin Approval';
                          const isPendingAdmin = status === 'Pending Admin Approval';
                          const isPendingHod = status === 'Pending HOD Approval' || status === 'Pending';
                          if (status === 'Approved') {
                            return (
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                <CheckCircle2 size={13} /> Approved by Admin
                              </span>
                            );
                          }
                          if (status === 'Rejected') {
                            return (
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                <AlertCircle size={13} /> Rejected
                              </span>
                            );
                          }
                          if (isHodApproved) {
                            return (
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                <Clock size={13} /> HOD Approved – Awaiting Admin
                              </span>
                            );
                          }
                          if (isPendingAdmin) {
                            return (
                              <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                                <Clock size={13} /> Pending Admin Review
                              </span>
                            );
                          }
                          return (
                            <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                              <Clock size={13} /> Pending HOD Review
                            </span>
                          );
                        })()}
                      </td>

                      {tab === 'Pending' ? (
                        <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => action(l.id || l._id, 'Approved')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#16a34a',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(22,163,74,0.2)'
                              }}
                            >
                              <Check size={13} /> Approve (Forward to Admin)
                            </button>
                            <button
                              onClick={() => action(l.id || l._id, 'Rejected')}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: '1px solid #fecaca',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontWeight: 800,
                                fontSize: '0.76rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={13} /> Reject
                            </button>
                          </div>
                        </td>
                      ) : tab === 'Parent Requests' ? (
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '5px 12px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            👁️ View-Only (Admin Direct)
                          </span>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modern High-End ERP Glassmorphism Modal for HOD Leave Request */}
      {showApplyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '520px', borderRadius: '18px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#2563eb" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Apply for HOD Leave
                </h2>
              </div>
              <button onClick={() => setShowApplyModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              Submit your absence request for review by the Principal Office.
            </p>

            <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Leave Category</label>
                <select 
                  value={newLeave.type} 
                  onChange={e => setNewLeave({...newLeave, type: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#ffffff', color: '#0f172a' }}
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Medical Leave">Medical Leave (ML)</option>
                  <option value="On Duty (OD)">On Duty (OD) / Academic Conference</option>
                  <option value="Earned Leave">Earned Leave (EL)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Start Date</label>
                  <input type="date" required value={newLeave.startDate} onChange={e => setNewLeave({...newLeave, startDate: e.target.value})} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>End Date</label>
                  <input type="date" required value={newLeave.endDate} onChange={e => setNewLeave({...newLeave, endDate: e.target.value})} style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Reason / Explanation</label>
                <textarea required rows="4" value={newLeave.reason} onChange={e => setNewLeave({...newLeave, reason: e.target.value})} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', color: '#0f172a' }} placeholder="State your reason clearly for the Principal Office to review..."></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowApplyModal(false)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                  Submit HOD Request
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default HodLeaves;
