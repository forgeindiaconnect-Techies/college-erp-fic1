import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Search, Calendar, User, Clock, CheckCircle2, AlertCircle, FileText, Users } from 'lucide-react';
import './LeavesManagement.css';
import { getLeaves, updateLeaveStatus } from '../../api';
import useRealtimeSync, { emitERPDataUpdate } from '../../hooks/useRealtimeSync';

const DEFAULT_LEAVES = [
  { id: 'LR001', name: 'John Doe', role: 'Student', dept: 'Computer Science', type: 'Medical Leave', startDate: '2026-05-24', endDate: '2026-05-26', reason: 'Suffering from viral fever and prescribed bed rest.', status: 'Pending' },
  { id: 'LR002', name: 'Dr. Ananya Rao', role: 'Staff', dept: 'Computer Science', type: 'Casual Leave', startDate: '2026-05-27', endDate: '2026-05-28', reason: 'Need to attend an international educational seminar.', status: 'Pending' },
  { id: 'LR003', name: 'Alice Smith', role: 'Student', dept: 'Electrical Engg.', type: 'Casual Leave', startDate: '2026-05-15', endDate: '2026-05-16', reason: 'Family function at home.', status: 'Approved' }
];

const LeavesManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('Pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    try {
      const res = await getLeaves();
      const records = Array.isArray(res.data) ? res.data : [];
      if (records.length > 0) {
        setLeaves(records);
        localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(records));
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('API leave fetch fallback:', err.message);
    }

    const saved = localStorage.getItem(`erp_leave_requests_${tenantId}`);
    if (saved) {
      try {
        setLeaves(JSON.parse(saved));
      } catch {
        setLeaves(DEFAULT_LEAVES);
      }
    } else {
      localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(DEFAULT_LEAVES));
      setLeaves(DEFAULT_LEAVES);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaves();
    window.addEventListener('storage', fetchLeaves);
    return () => window.removeEventListener('storage', fetchLeaves);
  }, [fetchLeaves]);

  useRealtimeSync(fetchLeaves, ['leaves', 'staffSupportUpdated']);

  const handleAction = async (id, newStatus) => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const updated = leaves.map(l => (l.id === id || l._id === id) ? { ...l, status: newStatus, approvedBy: newStatus === 'Approved' ? 'Admin Office' : l.approvedBy } : l);
    setLeaves(updated);
    localStorage.setItem(`erp_leave_requests_${tenantId}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    try {
      const res = await updateLeaveStatus(id, {
        action: newStatus === 'Approved' ? 'approve' : 'reject',
        status: newStatus,
        remarks: newStatus === 'Approved' ? 'Final approval confirmed by Admin Office' : 'Rejected by Admin Office'
      });
      emitERPDataUpdate(['leaves', 'staffSupportUpdated'], 'updated', res?.data || { id, status: newStatus });
    } catch (err) {
      console.warn('Failed to update leave status on server:', err.message);
    }
  };

  const filtered = leaves.filter(l => {
    const q = search.toLowerCase();
    const name = l.name || l.staffName || 'Unknown User';
    const studentName = l.studentName || '';
    const studentId = l.studentId || '';
    const reason = l.reason || l.description || '';
    const type = l.type || '';
    const status = l.status || 'Pending';
    const isParentRequest = l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'));

    const matchesSearch = name.toLowerCase().includes(q) || 
                          studentName.toLowerCase().includes(q) ||
                          studentId.toLowerCase().includes(q) ||
                          reason.toLowerCase().includes(q) || 
                          type.toLowerCase().includes(q);
                          
    if (activeTab === 'Parent Requests') {
      return isParentRequest && matchesSearch;
    }
    if (activeTab === 'Pending') {
      return status !== 'Approved' && status !== 'Rejected' && status !== 'Cancelled' && matchesSearch;
    }
    return status === activeTab && matchesSearch;
  });

  return (
    <div className="leaves-management animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Institutional Leave Console
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Central HRMS Admin
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Audit, authorize, or decline institutional absence applications submitted by students, parents, faculty, and HODs institution-wide.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Real-Time Live Sync Active
          </span>
        </div>
      </div>

      {/* 5 Interactive KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Total Applications</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {leaves.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Records</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>All institutional leave submissions</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Pending Review</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status || 'Pending') !== 'Approved' && l.status !== 'Rejected' && l.status !== 'Cancelled').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>Pending</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Awaiting action or approval</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #059669', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Parent Ward Requests</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#047857', margin: '4px 0 2px' }}>
            {leaves.filter(l => l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'))).length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>From Parents</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>Applied for student scholars</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Approved Entitlements</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status || 'Pending') === 'Approved').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Approved</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Officially granted absence requests</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Rejected Leaves</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0 2px' }}>
            {leaves.filter(l => (l.status || 'Pending') === 'Rejected').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>Declined</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Declined leave log history</div>
        </div>
      </div>

      {/* Table Container with Filter Tabs & Search */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Filter Tab buttons */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', overflowX: 'auto', maxWidth: '100%' }}>
            {['Pending', 'Approved', 'Rejected', 'Parent Requests'].map(tab => {
              let count = 0;
              if (tab === 'Parent Requests') {
                count = leaves.filter(l => l.role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'))).length;
              } else if (tab === 'Pending') {
                count = leaves.filter(l => (l.status || 'Pending') !== 'Approved' && l.status !== 'Rejected' && l.status !== 'Cancelled').length;
              } else {
                count = leaves.filter(l => (l.status || 'Pending') === tab).length;
              }
              const isActive = activeTab === tab;
              return (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab === 'Parent Requests' && <Users size={14} color={isActive ? '#059669' : '#64748b'} />}
                  {tab} <span style={{ fontSize: '0.75rem', opacity: 0.85, background: isActive ? '#e2e8f0' : '#e2e8f0', padding: '1px 6px', borderRadius: '10px' }}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '300px' }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search applicant, student roll no, category, or reason..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem', color: '#0f172a' }}
            />
          </div>
        </div>

        {/* Real-time ERP Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Applicant & Student Details</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>User Role</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Department</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Leave Category</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Absence Schedule</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Reason / Explanation</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Current Status</th>
                {(activeTab === 'Pending' || activeTab === 'Parent Requests') && <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>Quick Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} style={{ padding: '12px' }}><div className="skeleton" style={{ height: '32px', borderRadius: '8px' }}></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={(activeTab === 'Pending' || activeTab === 'Parent Requests') ? 8 : 7} style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No leave requests in this queue</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Submitted requests will appear here with live approval status.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const name = l.name || l.staffName || 'Unknown User';
                  const role = l.role || (l.staffId?.startsWith('STF') ? 'Staff' : 'Student');
                  const isParent = role === 'Parent' || !!l.parentName || (l.description && l.description.includes('Parent Request'));
                  const status = l.status || 'Pending';
                  const dept = l.dept || l.department || 'Computer Science';
                  const isApproved = status === 'Approved';
                  const isRejected = status === 'Rejected';
                  const isPending = !isApproved && !isRejected && status !== 'Cancelled';
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

                            {/* Show Ward / Student details */}
                            {isParent && (
                              <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🎓 Ward:</span>
                                <span>{studentName || 'Student Scholar'}</span>
                                {studentId && <span style={{ color: '#64748b', fontWeight: 600 }}>({studentId})</span>}
                              </div>
                            )}

                            {l.email && !isParent && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.email}</div>}
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

                      <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                        {dept}
                      </td>

                      <td style={{ padding: '12px 14px', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b' }}>
                        {l.type}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>
                          <Calendar size={14} color="#64748b" />
                          {l.startDate} to {l.endDate}
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
                        {isApproved ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                            <CheckCircle2 size={13} /> Approved
                          </span>
                        ) : isRejected ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                            <AlertCircle size={13} /> Rejected
                          </span>
                        ) : status === 'HOD Approved – Pending Admin Approval' ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                            <Clock size={13} /> HOD Approved – Awaiting Admin
                          </span>
                        ) : status === 'Pending Admin Approval' ? (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fdf4ff', color: '#86198f', border: '1px solid #f5d0fe' }}>
                            <Clock size={13} /> Pending Admin Review
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
                            <Clock size={13} /> Pending HOD Review
                          </span>
                        )}
                      </td>

                      {(activeTab === 'Pending' || (activeTab === 'Parent Requests' && isPending)) ? (
                        <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleAction(l.id || l._id, 'Approved')}
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
                              <Check size={13} /> Confirm Approval
                            </button>
                            <button 
                              onClick={() => handleAction(l.id || l._id, 'Rejected')}
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
                      ) : (
                        activeTab === 'Parent Requests' ? (
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                            {isApproved ? `Approved by ${l.approvedBy || 'Admin'}` : 'Processed'}
                          </td>
                        ) : null
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default LeavesManagement;
