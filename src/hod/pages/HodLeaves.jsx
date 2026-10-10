import React, { useState, useEffect } from 'react';
import { Check, X, Search, Calendar, User, Clock, CheckCircle2, AlertCircle, FileText, PlusCircle } from 'lucide-react';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science', name: 'HOD' }; }
  catch { return { dept: 'Computer Science', name: 'HOD' }; }
};

const DEFAULT_LEAVES = [
  { id:'LR001', name:'John Doe',       role:'Student', dept:'Computer Science', type:'Medical Leave',  startDate:'2026-05-24', endDate:'2026-05-26', reason:'Viral fever, medical certificate attached.', status:'Pending' },
  { id:'LR002', name:'Dr. Ananya Rao', role:'Staff',   dept:'Computer Science', type:'Casual Leave',   startDate:'2026-05-27', endDate:'2026-05-28', reason:'International academic conference.',           status:'Pending' },
  { id:'LR003', name:'Alice Smith',    role:'Student', dept:'Computer Science', type:'Casual Leave',   startDate:'2026-05-15', endDate:'2026-05-16', reason:'Family function.',                            status:'Approved' },
];

const TABS = ['Pending', 'Approved', 'Rejected', 'My Leaves'];

const ROLE_COLORS = { Student:'#3b82f6', Staff:'#6366F1' };

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

  useEffect(() => {
    const loadLeaves = () => {
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
      const all = saved ? JSON.parse(saved) : DEFAULT_LEAVES;
      const deptLeaves = all.filter(l => isDeptMatch(l.dept, DEPT) || (!l.dept && !l.role));
      setLeaves(deptLeaves.length ? deptLeaves : all);
    };

    loadLeaves();
    window.addEventListener('storage', loadLeaves);
    return () => window.removeEventListener('storage', loadLeaves);
  }, [DEPT]);

  const action = (id, status) => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_LEAVES;
    const merged = all.map(l => l.id === id ? { ...l, status, approvedBy: status === 'Approved' ? (hod.name || 'HOD') : l.approvedBy } : l);
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));

    const deptLeaves = merged.filter(l => isDeptMatch(l.dept, DEPT) || (!l.dept && !l.role));
    setLeaves(deptLeaves.length ? deptLeaves : merged);
  };

  const filtered = leaves.filter(l => {
    const name = l.name || l.staffName || '';
    const q = search.toLowerCase();
    const status = l.status || 'Pending';
    if (tab === 'My Leaves') {
      return l.role === 'HOD' && l.name === hod.name && (name.toLowerCase().includes(q) || (l.reason||'').toLowerCase().includes(q) || (l.type||'').toLowerCase().includes(q));
    }
    return status === tab && l.role !== 'HOD' && (name.toLowerCase().includes(q) || (l.reason||'').toLowerCase().includes(q) || (l.type||'').toLowerCase().includes(q));
  });

  const handleApplyLeave = (e) => {
    e.preventDefault();
    const newRequest = {
      id: 'LR' + Math.floor(Math.random() * 10000),
      name: hod.name,
      staffName: hod.name,
      role: 'HOD',
      dept: DEPT,
      ...newLeave,
      status: 'Pending',
      createdAt: new Date().toLocaleDateString('en-CA')
    };
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_LEAVES;
    const merged = [newRequest, ...all];
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(merged));
    window.dispatchEvent(new Event('storage'));

    // Update local state
    setLeaves(merged.filter(l => isDeptMatch(l.dept, DEPT) || (!l.dept && !l.role)));
    setShowApplyModal(false);
    setTab('My Leaves');
    setNewLeave({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
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

      {/* 4 Interactive KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Pending Approvals</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status || 'Pending') === 'Pending' && l.role !== 'HOD').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Requests</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Awaiting HOD authorization</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Approved Entitlements</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status || 'Pending') === 'Approved' && l.role !== 'HOD').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Approved</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Active approved absence logs</div>
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
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {TABS.map(t => {
              const count = t === 'My Leaves' 
                ? leaves.filter(l => l.role === 'HOD' && l.name === hod.name).length 
                : leaves.filter(l => (l.status || 'Pending') === t && l.role !== 'HOD').length;
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
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t} <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '280px' }}>
            <Search size={16} color="#64748b" />
            <input
              placeholder="Search applicant name, leave type, or reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem', color: '#0f172a' }}
            />
          </div>
        </div>

        {/* Real-time ERP Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Applicant Name</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>User Role</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Leave Category</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Absence Schedule</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Reason / Notes</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Status</th>
                {tab === 'Pending' && <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>Quick Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={tab === 'Pending' ? 7 : 6} style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No {tab.toLowerCase()} leave requests found</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Applications matching this criteria will appear in real time.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(l => {
                  const name = l.name || l.staffName || 'Unknown Applicant';
                  const role = l.role || 'Student';
                  const status = l.status || 'Pending';
                  const isApproved = status === 'Approved';
                  const isPending = status === 'Pending';

                  return (
                    <tr key={l.id} style={{ background: '#f8fafc', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338ca', fontWeight: 800, fontSize: '0.82rem' }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{name}</div>
                            {l.dept && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.dept}</div>}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          padding: '3px 9px',
                          borderRadius: '12px',
                          background: role === 'Staff' ? '#e0e7ff' : (role === 'HOD' ? '#f3e8ff' : '#dbeafe'),
                          color: role === 'Staff' ? '#3730a3' : (role === 'HOD' ? '#6b21a8' : '#1e40af'),
                          border: `1px solid ${role === 'Staff' ? '#c7d2fe' : (role === 'HOD' ? '#e9d5ff' : '#bfdbfe')}`
                        }}>
                          {role}
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
                      </td>

                      <td style={{ padding: '12px 14px', maxWidth: '240px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason}>
                          <FileText size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {l.reason}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isApproved ? '#dcfce7' : (isPending ? '#fef3c7' : '#fee2e2'),
                          color: isApproved ? '#15803d' : (isPending ? '#b45309' : '#b91c1c'),
                          border: `1px solid ${isApproved ? '#bbf7d0' : (isPending ? '#fde68a' : '#fecaca')}`
                        }}>
                          {isApproved ? <CheckCircle2 size={13} /> : (isPending ? <Clock size={13} /> : <AlertCircle size={13} />)}
                          {isApproved ? 'Approved' : (isPending ? 'Pending HOD' : 'Rejected')}
                        </span>
                      </td>

                      {tab === 'Pending' && (
                        <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              onClick={() => action(l.id, 'Approved')}
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
                              <Check size={13} /> Approve
                            </button>
                            <button
                              onClick={() => action(l.id, 'Rejected')}
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
                      )}
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
