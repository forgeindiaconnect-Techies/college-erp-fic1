import React, { useState, useEffect } from 'react';
import { Check, X, Search, Calendar, User, Clock, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import './LeavesManagement.css';

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

  useEffect(() => {
    fetchLeaves();
    window.addEventListener('storage', fetchLeaves);
    return () => window.removeEventListener('storage', fetchLeaves);
  }, []);

  const fetchLeaves = () => {
    setLoading(true);
    const saved = localStorage.getItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (saved) {
      setLeaves(JSON.parse(saved));
    } else {
      localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(DEFAULT_LEAVES));
      setLeaves(DEFAULT_LEAVES);
    }
    setLoading(false);
  };

  const handleAction = (id, newStatus) => {
    const updated = leaves.map(l => l.id === id ? { ...l, status: newStatus, approvedBy: newStatus === 'Approved' ? 'Admin Office' : l.approvedBy } : l);
    setLeaves(updated);
    localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const filtered = leaves.filter(l => {
    const q = search.toLowerCase();
    const name = l.name || l.staffName || 'Unknown User';
    const reason = l.reason || '';
    const type = l.type || '';
    const status = l.status || 'Pending';

    const matchesSearch = name.toLowerCase().includes(q) || 
                          reason.toLowerCase().includes(q) || 
                          type.toLowerCase().includes(q);
                          
    const matchesTab = status === activeTab;
    return matchesSearch && matchesTab;
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
            Audit, authorize, or decline institutional absence applications submitted by students, faculty, and HODs institution-wide.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Real-Time Live Sync Active
          </span>
        </div>
      </div>

      {/* 4 Interactive KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
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
            {leaves.filter(l => (l.status || 'Pending') === 'Pending').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>Pending</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Awaiting action or HOD review</div>
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
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {['Pending', 'Approved', 'Rejected'].map(tab => {
              const count = leaves.filter(l => (l.status || 'Pending') === tab).length;
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
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab} <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '300px' }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by applicant name, category, or reason..." 
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
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Department</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Leave Category</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Absence Schedule</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Reason / Explanation</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Current Status</th>
                {activeTab === 'Pending' && <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>Quick Action</th>}
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
                  <td colSpan={activeTab === 'Pending' ? 8 : 7} style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Clock size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No leave requests in this queue</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Submitted requests will appear here with live approval status.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const name = l.name || l.staffName || 'Unknown User';
                  const role = l.role || (l.staffId?.startsWith('STF') ? 'Staff' : 'Student');
                  const status = l.status || 'Pending';
                  const dept = l.dept || 'Computer Science';
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
                            {l.email && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{l.email}</div>}
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
                          {isApproved ? 'Approved' : (isPending ? 'Pending Review' : 'Rejected')}
                        </span>
                      </td>

                      {activeTab === 'Pending' && (
                        <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleAction(l.id, 'Approved')}
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
                              onClick={() => handleAction(l.id, 'Rejected')}
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
    </div>
  );
};

export default LeavesManagement;
