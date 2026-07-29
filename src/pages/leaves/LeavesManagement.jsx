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
    const updated = leaves.map(l => l.id === id ? { ...l, status: newStatus } : l);
    setLeaves(updated);
    localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
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
    <div className="leaves-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Leave Requests Console</h1>
          <p className="text-muted">Review, approve, or reject absence requests submitted by students and faculty staff globally.</p>
        </div>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Pending Review</span>
          <span className="sm-summary-value text-warning-c">
            {leaves.filter(l => (l.status || 'Pending') === 'Pending').length} Request(s)
          </span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Approved Leaves</span>
          <span className="sm-summary-value text-success">
            {leaves.filter(l => (l.status || 'Pending') === 'Approved').length} Request(s)
          </span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Rejected Leaves</span>
          <span className="sm-summary-value text-muted">
            {leaves.filter(l => (l.status || 'Pending') === 'Rejected').length} Request(s)
          </span>
        </div>
      </div>

      <div className="leaves-tabs" style={{ marginTop: '1.5rem' }}>
        {['Pending', 'Approved', 'Rejected'].map(tab => (
          <button 
            key={tab} 
            className={`leaves-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab} ({leaves.filter(l => (l.status || 'Pending') === tab).length})
          </button>
        ))}
      </div>

      <div className="glass-card table-wrapper">
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search leaves by applicant name, category, or reason..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Applicant Name</th>
                <th>User Role</th>
                <th>Department</th>
                <th>Leave Category</th>
                <th>Absence Schedule</th>
                <th>Brief Explanation</th>
                <th>Current Status</th>
                {activeTab === 'Pending' && <th>Quick Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'Pending' ? 8 : 7} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No leave requests found in this queue.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => {
                  const name = l.name || l.staffName || 'Unknown User';
                  const role = l.role || (l.staffId?.startsWith('STF') ? 'Staff' : 'Student');
                  const status = l.status || 'Pending';
                  const dept = l.dept || 'Computer Science';
                  
                  return (
                    <tr key={l.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} className="text-muted" />
                          <span className="font-semibold">{name}</span>
                        </div>
                      </td>
                      <td><span className={`leave-role-tag ${role}`}>{role}</span></td>
                      <td><span className="text-muted">{dept}</span></td>
                      <td><span className="text-sm font-semibold">{l.type}</span></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <Calendar size={13} className="text-muted" />
                          <span>{l.startDate} to {l.endDate}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.reason}>
                          <FileText size={13} className="text-muted" style={{ flexShrink: 0 }} />
                          <span className="text-xs">{l.reason}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${status.toLowerCase()}`}>
                          {status === 'Approved' ? <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} /> : status === 'Rejected' ? <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} /> : <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                          {status}
                        </span>
                      </td>
                      {activeTab === 'Pending' && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn-primary" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleAction(l.id, 'Approved')}
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button 
                              className="btn-ghost btn-ghost-danger" 
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleAction(l.id, 'Rejected')}
                            >
                              <X size={12} /> Reject
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
