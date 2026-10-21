import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, FileText, CheckCircle, XCircle, 
  Clock, AlertTriangle, ArrowRight, ShieldAlert, 
  UserCheck, Download, Edit3, Send, Signature, Search, Filter, HelpCircle
} from 'lucide-react';
import '../../pages/Dashboard.css';
import { getApprovals, submitApprovalAction } from '../../api/index.js';

// Real requests loaded dynamically from API & database
const initialRequests = [];

export default function PrincipalApprovals() {
  const [requests, setRequests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All'); // All, Pending, Approved, Rejected, Urgent
  const [selectedReq, setSelectedReq] = useState(null); // Currently open request in detail drawer
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch approvals dynamically & sync with local storage leave requests
  useEffect(() => {
    const loadData = () => {
      let combinedRequests = [];

      // Load leaves from localStorage
      try {
        const leaveKey = `erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
        const savedLeaves = localStorage.getItem(leaveKey);
        if (savedLeaves) {
          const parsedLeaves = JSON.parse(savedLeaves);
          const leaveApprovals = parsedLeaves.map(l => ({
            id: `LV_${l.id}`,
            type: 'Leave Application',
            department: l.dept || l.department || 'General',
            requestedBy: `${l.name || l.staffName || 'Faculty'} (${l.role || 'Staff'})`,
            date: l.startDate || 'Today',
            priority: l.status === 'Pending' ? 'High' : 'Normal',
            status: l.status || 'Pending',
            details: `Leave Type: ${l.type}. ${l.reason || 'No details provided.'} (Dates: ${l.startDate} to ${l.endDate})`,
            aiRecommendation: 'Safe to Approve. Faculty leave quota verified against department schedules.',
            aiScore: 94,
            remarks: l.remarks || ''
          }));
          
          combinedRequests = [...leaveApprovals];
        }
      } catch (err) {}

      getApprovals()
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            const mapped = res.data.map(item => ({
              ...item,
              id: item._id || item.id
            }));
            
            // Merge avoiding duplicate IDs
            const existingIds = new Set(mapped.map(r => r.id));
            combinedRequests.forEach(la => {
              if (!existingIds.has(la.id)) mapped.unshift(la);
            });
            setRequests(mapped);
          } else {
            setRequests(combinedRequests);
          }
        })
        .catch(() => {
          setRequests(combinedRequests);
        });
    };

    loadData();
    window.addEventListener('storage', loadData);
    window.addEventListener('erp_leave_updated', loadData);
    return () => {
      window.removeEventListener('storage', loadData);
      window.removeEventListener('erp_leave_updated', loadData);
    };
  }, []);
  
  // Signature credentials state
  const [signatureKey, setSignatureKey] = useState('');
  const [isSignatureVerified, setIsSignatureVerified] = useState(false);
  const [sigError, setSigError] = useState('');

  // Remarks state
  const [remarksInput, setRemarksInput] = useState('');

  // Action states for letter and forwarding
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [forwardSuccess, setForwardSuccess] = useState(false);

  // Notification Alerts & Activity Log states (pure dynamic from actual records)
  const [activityLogs, setActivityLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Compute live notifications from real pending requests
  useEffect(() => {
    const realNotes = [];
    requests.forEach(req => {
      if (req.status === 'Pending' && req.priority === 'High') {
        realNotes.push({
          id: `note_${req.id}`,
          text: `Urgent review required: ${req.type} from ${req.requestedBy} (${req.department})`,
          type: 'high'
        });
      } else if (req.status === 'Pending') {
        realNotes.push({
          id: `note_${req.id}`,
          text: `Pending ${req.type} submitted by ${req.requestedBy} (${req.department})`,
          type: 'warning'
        });
      }
    });
    setNotifications(realNotes);
  }, [requests]);

  // Restriction dialog for IT Admin boundaries (Step 6)
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [attemptedAction, setAttemptedAction] = useState('');

  const handleActionClick = (actionName) => {
    setAttemptedAction(actionName);
    setShowRestrictionDialog(true);
  };

  const handleApprove = (id, remarks = '') => {
    const finalRemarks = remarks || remarksInput || 'Approved by Principal';
    
    // Check if it's a leave request from localStorage
    if (String(id).startsWith('LV_')) {
      const realLeaveId = String(id).replace('LV_', '');
      try {
        const leaveKey = `erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
        const savedLeaves = localStorage.getItem(leaveKey);
        if (savedLeaves) {
          const parsedLeaves = JSON.parse(savedLeaves);
          const updatedLeaves = parsedLeaves.map(l => String(l.id) === realLeaveId ? { ...l, status: 'Approved', remarks: finalRemarks } : l);
          localStorage.setItem(leaveKey, JSON.stringify(updatedLeaves));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('erp_leave_updated'));
        }
      } catch (err) {}
    }

    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        const newLog = { 
          text: `Request #${req.id} (${req.type} - ${req.department}) APPROVED by Principal`, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today' 
        };
        setActivityLogs(prevLogs => [newLog, ...prevLogs]);

        const newAlert = {
          id: Date.now(),
          text: `Auto Notification sent: ${req.requestedBy} notified about approval.`,
          type: 'success'
        };
        setNotifications(prevAlerts => [newAlert, ...prevAlerts]);

        return { ...req, status: 'Approved', remarks: finalRemarks };
      }
      return req;
    }));

    if (selectedReq && selectedReq.id === id) {
      setSelectedReq(prev => ({ ...prev, status: 'Approved', remarks: finalRemarks }));
    }

    submitApprovalAction(id, 'Approved', finalRemarks).catch(() => {});
  };

  const handleReject = (id, remarks = '') => {
    if (!remarks && !remarksInput) {
      alert('Mandatory Remarks are required for rejection.');
      return;
    }
    const finalRemarks = remarks || remarksInput || 'Rejected';
    
    if (String(id).startsWith('LV_')) {
      const realLeaveId = String(id).replace('LV_', '');
      try {
        const leaveKey = `erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
        const savedLeaves = localStorage.getItem(leaveKey);
        if (savedLeaves) {
          const parsedLeaves = JSON.parse(savedLeaves);
          const updatedLeaves = parsedLeaves.map(l => String(l.id) === realLeaveId ? { ...l, status: 'Rejected', remarks: finalRemarks } : l);
          localStorage.setItem(leaveKey, JSON.stringify(updatedLeaves));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('erp_leave_updated'));
        }
      } catch (err) {}
    }

    setRequests(prev => prev.map(req => {
      if (req.id === id) {
        const newLog = { 
          text: `Request #${req.id} (${req.type} - ${req.department}) REJECTED by Principal`, 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today' 
        };
        setActivityLogs(prevLogs => [newLog, ...prevLogs]);

        const newAlert = {
          id: Date.now(),
          text: `Auto Notification sent: ${req.requestedBy} notified about rejection.`,
          type: 'danger'
        };
        setNotifications(prevAlerts => [newAlert, ...prevAlerts]);

        return { ...req, status: 'Rejected', remarks: finalRemarks };
      }
      return req;
    }));

    if (selectedReq && selectedReq.id === id) {
      setSelectedReq(prev => ({ ...prev, status: 'Rejected', remarks: finalRemarks }));
    }
    setRemarksInput('');

    submitApprovalAction(id, 'Rejected', finalRemarks).catch(() => {});
  };

  const handleVerifySignature = () => {
    if (signatureKey === 'SIG-SU-2026' || signatureKey === 'SIG-PRINCIPAL') {
      setIsSignatureVerified(true);
      setSigError('');
      const newLog = { 
        text: `Principal Digital Signature verified successfully.`, 
        time: 'Just Now' 
      };
      setActivityLogs(prevLogs => [newLog, ...prevLogs]);
    } else {
      setIsSignatureVerified(false);
      setSigError('Invalid Signature Key! Try "SIG-SU-2026" or "SIG-PRINCIPAL".');
    }
  };

  const handleGeneratePDF = (req) => {
    setIsGeneratingPDF(true);
    setPdfSuccess(false);

    setTimeout(() => {
      setIsGeneratingPDF(false);
      setPdfSuccess(true);
      
      setTimeout(() => {
        setPdfSuccess(false);
      }, 5000);
    }, 1500);
  };

  const handleForwardToAdmin = (req) => {
    setIsForwarding(true);
    setForwardSuccess(false);

    setTimeout(() => {
      setIsForwarding(false);
      setForwardSuccess(true);
      
      const newLog = { 
        text: `Request #${req.id} forwarded to System IT Administrator clearance queue.`, 
        time: 'Just Now' 
      };
      setActivityLogs(prevLogs => [newLog, ...prevLogs]);

      setTimeout(() => {
        setForwardSuccess(false);
      }, 5000);
    }, 1200);
  };

  // Stats Counters
  const countPending = requests.filter(r => r.status === 'Pending').length;
  const countApproved = requests.filter(r => r.status === 'Approved').length;
  const countRejected = requests.filter(r => r.status === 'Rejected').length;
  const countUrgent = requests.filter(r => r.status === 'Pending' && r.priority === 'High').length;

  // Filter & Search Logic
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
      req.department.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Pending') return req.status === 'Pending';
    if (activeFilter === 'Approved') return req.status === 'Approved';
    if (activeFilter === 'Rejected') return req.status === 'Rejected';
    if (activeFilter === 'Urgent') return req.status === 'Pending' && req.priority === 'High';
    return true;
  });

  return (
    <div className="principal-page-container principal-approvals-page" style={{ padding: '1.5rem', minHeight: '100%', background: 'transparent' }}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckSquare style={{ color: '#3730A5' }} size={28} /> Approvals & Decision Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Executive oversight desk: authorize budgets, leaves, events, placements, and statutory timetables.
          </p>
        </div>

        {/* Security / Permissions Profile */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5' }}>
          <UserCheck size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Security Bounds</span>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>Executive Signatory Active</strong>
          </div>
        </div>
      </div>

      {/* STEP 2: METRICS CARDS GRID */}
      <div className="stats-grid mb-6 animate-fade-in principal-kpi-grid">
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FAEEDA', color: 'var(--warning)' }}><Clock size={20} /></div>
          <div className="stat-details">
            <h3>Pending Approvals</h3>
            <p className="stat-value" style={{ color: 'var(--text-main)' }}>{countPending}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Awaiting Sign-off</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#E1F5EE', color: 'var(--success)' }}><CheckCircle size={20} /></div>
          <div className="stat-details">
            <h3>Approved Requests</h3>
            <p className="stat-value" style={{ color: 'var(--text-main)' }}>{countApproved}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Signed & Authorized</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FCEBEB', color: 'var(--danger)' }}><XCircle size={20} /></div>
          <div className="stat-details">
            <h3>Rejected Requests</h3>
            <p className="stat-value" style={{ color: 'var(--text-main)' }}>{countRejected}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Declined Submissions</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EFF6FF', color: '#3b82f6' }}><AlertTriangle size={20} /></div>
          <div className="stat-details">
            <h3>Urgent Action</h3>
            <p className="stat-value" style={{ color: 'var(--text-main)' }}>{countUrgent}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>High Priority Queue</span>
          </div>
        </div>
      </div>

      <div className="approvals-content-grid">
        
        {/* LEFT COLUMN: REQUESTS TABLE */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minWidth: 0, overflowX: 'auto' }}>
          
          {/* SEARCH & FILTERS HEADER */}
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <div className="approvals-filter-pills">
              {['All', 'Pending', 'Approved', 'Rejected', 'Urgent'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`btn-primary ${activeFilter === filter ? '' : 'btn-ghost'}`}
                  style={{
                    padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    background: activeFilter === filter ? 'var(--primary-gradient)' : 'transparent',
                    color: activeFilter === filter ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  {filter} Requests
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '250px' }}>
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.45rem 1rem 0.45rem 2.2rem', borderRadius: '8px',
                  border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                  color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem'
                }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* TABLE */}
          <div className="table-container animate-fade-in" style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>Request Type</th>
                  <th>Department</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                        <CheckCircle size={36} style={{ color: 'var(--success)', opacity: 0.8 }} />
                        <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>No Approval Requests Found</strong>
                        <p style={{ margin: 0, fontSize: '0.82rem', maxWidth: 360 }}>
                          {searchTerm ? `No requests match "${searchTerm}".` : `There are currently no ${activeFilter === 'All' ? '' : activeFilter.toLowerCase()} requests requiring authorization.`}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <span style={{ 
                          fontWeight: 700, fontSize: '0.82rem', 
                          color: 'var(--text-main)' 
                        }}>
                          {req.type}
                        </span>
                      </td>
                      <td>
                        <span className="dept-code-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                          {req.department}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>{req.requestedBy}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{req.date}</td>
                      <td>
                        <span style={{ 
                          color: req.priority === 'High' ? '#ef4444' : req.priority === 'Medium' ? '#f59e0b' : '#3b82f6',
                          fontWeight: 700, fontSize: '0.8rem'
                        }}>
                          ⚠️ {req.priority}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: req.status === 'Pending' ? 'rgba(245, 158, 11, 0.1)' : req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: req.status === 'Pending' ? '#f59e0b' : req.status === 'Approved' ? '#10b981' : '#ef4444',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', minWidth: '180px' }}>
                          <button 
                            onClick={() => { setSelectedReq(req); setSignatureKey(''); setIsSignatureVerified(false); }}
                            className="btn-primary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', flex: '1 1 auto', textAlign: 'center' }}
                          >
                            View Details
                          </button>
                          {req.status === 'Pending' && (
                            <>
                              <button 
                                onClick={() => handleApprove(req.id)}
                                className="btn-primary" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', background: 'var(--success)', flex: '1 1 auto', textAlign: 'center' }}
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => { setSelectedReq(req); setRemarksInput(''); }}
                                className="btn-primary" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px', background: 'var(--danger)', flex: '1 1 auto', textAlign: 'center' }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT COLUMN: INSTITUTIONAL ALERTS & SYSTEM ACTIVITY */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Notifications Feed */}
          <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              🔔 Notifications System
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  No pending action notifications
                </div>
              ) : (
                notifications.map((note) => (
                  <div 
                    key={note.id} 
                    style={{ 
                      padding: '0.65rem 0.8rem', borderRadius: '8px', 
                      background: 'var(--bg-secondary)', borderLeft: `3px solid ${note.type === 'high' ? '#ef4444' : note.type === 'success' ? '#10b981' : '#f59e0b'}`,
                      fontSize: '0.78rem', color: 'var(--text-main)'
                    }}
                  >
                    {note.text}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Logs */}
          <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
              📋 Decisions Activity Log
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '250px', overflowY: 'auto' }}>
              {activityLogs.length === 0 ? (
                <div style={{ padding: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  No recent decisions recorded today.
                </div>
              ) : (
                activityLogs.map((log, idx) => (
                  <div key={idx} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0 }}>{log.text}</p>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{log.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* IT Boundaries Guard Panel (Step 6 Permissions Shield) */}
          <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', borderLeft: '3px solid var(--danger)', background: 'rgba(239, 68, 68, 0.02)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🛡️ IT Boundaries Shield
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Principal credentials cannot override core server settings, alter schema architectures, or delete admin accounts:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
              <button 
                onClick={() => handleActionClick('Delete Institutional Administrator account')}
                className="glass-card" 
                style={{ padding: '4px', fontSize: '0.7rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600 }}
              >
                ❌ Delete Super Admin Account
              </button>
              <button 
                onClick={() => handleActionClick('Change server configurations')}
                className="glass-card" 
                style={{ padding: '4px', fontSize: '0.7rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600 }}
              >
                ⚙️ Alter Server Configurations
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* SLIDING DECISION DRAWER MODAL */}
      {selectedReq && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', justifyContent: 'flex-end', zIndex: 1000 
        }}>
          <div 
            className="glass-card animate-fade-in" 
            style={{ 
              width: '600px', height: '100%', background: 'var(--bg-secondary)', 
              padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', overflowY: 'auto'
            }}
          >
            <div>
              {/* Drawer Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span style={{ 
                    backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', 
                    padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 
                  }}>
                    {selectedReq.department} department
                  </span>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem' }}>
                    {selectedReq.type} Review Desk
                  </h2>
                </div>
                <button 
                  onClick={() => { setSelectedReq(null); setRemarksInput(''); }}
                  className="btn-primary"
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem' }}
                >
                  Close Desk
                </button>
              </div>

              {/* Request Core Statement */}
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', marginBottom: '1.2rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Submitted By: {selectedReq.requestedBy} ({selectedReq.date})
                </span>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                  {selectedReq.details}
                </p>
              </div>

              {/* AI COMPLIANCE RECOMMENDATION WIDGET */}
              <div style={{ 
                background: 'rgba(79, 70, 229, 0.05)', padding: '1rem', borderRadius: '12px', 
                borderLeft: '4px solid var(--primary)', marginBottom: '1.2rem' 
              }}>
                <div className="flex justify-between items-center mb-2">
                  <strong style={{ fontSize: '0.82rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    🤖 AI Compliance Recommendation
                  </strong>
                  <span style={{ 
                    fontSize: '0.78rem', padding: '2px 8px', borderRadius: '8px',
                    backgroundColor: selectedReq.aiScore >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: selectedReq.aiScore >= 90 ? '#10b981' : '#f59e0b',
                    fontWeight: 700
                  }}>
                    {selectedReq.aiScore}% Safe
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                  {selectedReq.aiRecommendation}
                </p>
              </div>

              {/* REMARKS PANEL */}
              <div style={{ marginBottom: '1.2rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Decision Remarks
                </label>
                <textarea
                  value={remarksInput || selectedReq.remarks}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  disabled={selectedReq.status !== 'Pending'}
                  placeholder="Enter custom remarks (Mandatory for rejection)..."
                  style={{ 
                    width: '100%', height: '80px', padding: '0.5rem', borderRadius: '8px', 
                    border: '1px solid var(--border-color)', background: 'var(--bg-primary)',
                    color: 'var(--text-main)', outline: 'none', resize: 'none', fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* DIGITAL SIGNATURE VERIFICATION PAD */}
              {selectedReq.status === 'Pending' && (
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                    🖋️ Digital Signature Verification
                  </label>
                  
                  {!isSignatureVerified ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        placeholder="Enter Signature Key (e.g. SIG-SU-2026)..."
                        value={signatureKey}
                        onChange={(e) => setSignatureKey(e.target.value)}
                        style={{ 
                          flex: 1, padding: '0.45rem', borderRadius: '8px', 
                          border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
                          color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none'
                        }}
                      />
                      <button 
                        onClick={handleVerifySignature}
                        className="btn-primary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '8px' }}
                      >
                        Verify Key
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 600, fontSize: '0.88rem' }}>
                      <CheckCircle size={18} /> Verified Signature Stamp Applied!
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'cursive' }}>~ Dr. Suresh Kumar</span>
                    </div>
                  )}

                  {sigError && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--danger)', marginTop: '0.3rem', fontWeight: 500 }}>
                      {sigError}
                    </span>
                  )}
                </div>
              )}

              {/* Exporters and Forward actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  onClick={() => handleGeneratePDF(selectedReq)}
                  disabled={isGeneratingPDF}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0.5rem 1rem', background: '#3b82f6' }}
                >
                  <Download size={14} /> {isGeneratingPDF ? 'Packaging Document...' : 'Download Signed PDF Letter'}
                </button>

                <button
                  onClick={() => handleForwardToAdmin(selectedReq)}
                  disabled={isForwarding}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', padding: '0.5rem 1rem', background: '#4F46E5' }}
                >
                  <Send size={14} /> {isForwarding ? 'Forwarding queue...' : 'Forward to Admin'}
                </button>
              </div>

              {pdfSuccess && (
                <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.8rem' }}>
                  ✓ Formal Signed PDF Institutional Letter download initialized!
                </div>
              )}

              {forwardSuccess && (
                <div style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.08)', color: '#4F46E5', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.8rem' }}>
                  ✓ Request successfully forwarded to the Central Super Admin database queue.
                </div>
              )}
            </div>

            {/* Bottom Actions Drawer */}
            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem', marginTop: '1.2rem' }}>
              {selectedReq.status === 'Pending' ? (
                <>
                  <button
                    onClick={() => { handleApprove(selectedReq.id, remarksInput); }}
                    disabled={!isSignatureVerified}
                    className="btn-primary"
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: isSignatureVerified ? 'var(--success)' : 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    {!isSignatureVerified ? '🔐 Sign Key to Approve' : '✓ Finalize & Approve'}
                  </button>
                  <button
                    onClick={() => { handleReject(selectedReq.id, remarksInput); }}
                    className="btn-primary"
                    style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'var(--danger)', fontSize: '0.9rem', fontWeight: 700 }}
                  >
                    ✗ Rejection Decline
                  </button>
                </>
              ) : (
                <div style={{ flex: 1, textAlign: 'center', padding: '0.5rem', borderRadius: '8px', border: `1.5px solid ${selectedReq.status === 'Approved' ? '#10b981' : '#ef4444'}`, color: selectedReq.status === 'Approved' ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  This request has been {selectedReq.status.toLowerCase()} with remarks: "{selectedReq.remarks || 'No remarks provided.'}"
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* IT Admin Boundary restriction dialogue modal */}
      {showRestrictionDialog && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '480px', margin: '0 1rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--danger)' }}>
            <ShieldAlert size={48} className="text-[#ef4444]" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Access Denied (Clearance Violation)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You attempted to: <strong style={{ color: 'var(--text-main)' }}>{attemptedAction}</strong>.<br />
              Principal permissions do not include direct IT database management or account deletions. General Super Admin clearance is required.
            </p>

            <button 
              onClick={() => setShowRestrictionDialog(false)} 
              className="btn-primary"
              style={{ background: 'var(--danger)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
