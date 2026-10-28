import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getTransportComplaintById, updateTransportComplaint, addTransportComplaintReply, 
  createTransportNotification, getStaff, getTransportDrivers 
} from '../../api/index';
import { 
  ArrowLeft, MessageSquare, Clock, User, ShieldCheck, Send, CheckCircle, 
  AlertTriangle, Shield, Calendar, RefreshCcw, Bus, MapPin, Building, 
  AlertCircle, Edit2, ChevronDown, Check, UserCheck, Wrench
} from 'lucide-react';

const ResolveComplaintPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [driversList, setDriversList] = useState([]);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [assigneeInput, setAssigneeInput] = useState('');
  const [statusInput, setStatusInput] = useState('In Progress');
  const [resolutionNoteInput, setResolutionNoteInput] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [successToast, setSuccessToast] = useState('');

  // Check role
  const driverSession = JSON.parse(sessionStorage.getItem('driver_session') || 'null');
  const studentSession = JSON.parse(sessionStorage.getItem('student_session') || 'null');
  const isDriver = !!driverSession;
  const isStudent = !!studentSession;
  const isAdminOrStaff = !isDriver && !isStudent;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (isDriver) {
      navigate('/driver/tasks');
    } else {
      navigate('/admin/transport');
    }
  };

  const fetchComplaint = async () => {
    try {
      const [res, staffRes, driversRes] = await Promise.all([
        getTransportComplaintById(id).catch(err => {
          const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
          const localComplaints = [
            ...JSON.parse(localStorage.getItem(`erp_transport_complaints_${tenantId}`) || '[]'),
            ...JSON.parse(localStorage.getItem('erp_transport_complaints_mock_college_id') || '[]'),
            ...JSON.parse(localStorage.getItem('erp_transport_complaints') || '[]')
          ];
          const found = localComplaints.find(c => c._id === id || c.complaintId === id);
          if (found) return { data: found };
          throw err;
        }),
        getStaff().catch(() => ({ data: [] })),
        getTransportDrivers().catch(() => ({ data: [] }))
      ]);
      if (res?.data) {
        setComplaint(res.data);
      }
      setStaffList(staffRes.data || []);
      setDriversList(driversRes.data || []);
    } catch (err) {
      console.error(err);
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const localComplaints = [
        ...JSON.parse(localStorage.getItem(`erp_transport_complaints_${tenantId}`) || '[]'),
        ...JSON.parse(localStorage.getItem('erp_transport_complaints_mock_college_id') || '[]'),
        ...JSON.parse(localStorage.getItem('erp_transport_complaints') || '[]')
      ];
      const found = localComplaints.find(c => c._id === id || c.complaintId === id);
      if (found) {
        setComplaint(found);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
    const interval = setInterval(() => {
      fetchComplaint();
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setIsSubmitting(true);
    try {
      const sessionName = 
        JSON.parse(sessionStorage.getItem('admin_session') || '{}').name ||
        JSON.parse(sessionStorage.getItem('hod_session') || '{}').name ||
        JSON.parse(sessionStorage.getItem('staff_session') || '{}').name || 
        JSON.parse(sessionStorage.getItem('driver_session') || '{}').name ||
        'User';

      const userRole = isAdminOrStaff ? 'Admin' : (isDriver ? 'Driver' : 'Student');

      const replyRes = await addTransportComplaintReply(id, {
        message: replyMessage.trim(),
        sender: sessionName,
        role: userRole
      });

      // Display success message only after backend confirms save
      if (replyRes && (replyRes.status === 200 || replyRes.data)) {
        setSuccessToast('Message sent and recorded in complaint history.');
        setTimeout(() => setSuccessToast(''), 4000);
      }
      
      try {
        await createTransportNotification({
          title: `Reply from ${sessionName}`,
          message: `[Complaint ${complaint?.complaintId || id}] ${replyMessage}`,
          type: "Info",
          targetRole: "All"
        });
      } catch (notifErr) {
        // Notification API may be restricted for driver/student
      }

      setReplyMessage('');
      fetchComplaint();
    } catch (err) {
      console.error(err);
      alert('Failed to send reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin: Assign
  const handleConfirmAssign = async (e) => {
    e.preventDefault();
    if (!assigneeInput.trim()) return;
    setIsActionLoading(true);
    try {
      const nextStatus = complaint.status === 'Pending' ? 'Assigned' : complaint.status;
      await updateTransportComplaint(id, {
        assignedTo: assigneeInput.trim(),
        status: nextStatus
      });
      setShowAssignModal(false);
      fetchComplaint();
    } catch (err) {
      console.error(err);
      alert('Failed to assign complaint: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Admin: Update Status
  const handleConfirmStatusUpdate = async (e) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const isSafety = /brake|tire|tyre|steering|suspension|engine|safety/i.test(complaint.complaintType || '') ||
                       /brake|tire|tyre|steering|suspension|engine|safety/i.test(complaint.description || '');
      if (statusInput === 'Resolved' && isSafety && (!resolutionNoteInput || resolutionNoteInput.trim().length < 5)) {
        alert('Safety-critical complaint (Brakes/Tires) requires detailed resolution notes from authorized personnel before marking resolved.');
        setIsActionLoading(false);
        return;
      }

      await updateTransportComplaint(id, {
        status: statusInput,
        resolutionNote: resolutionNoteInput.trim()
      });
      setShowStatusModal(false);
      fetchComplaint();
    } catch (err) {
      console.error(err);
      alert('Failed to update status: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Admin: Resolve
  const handleConfirmResolve = async (e) => {
    e.preventDefault();
    const isSafety = /brake|tire|tyre|steering|suspension|engine|safety/i.test(complaint.complaintType || '') ||
                     /brake|tire|tyre|steering|suspension|engine|safety/i.test(complaint.description || '');
    if (isSafety && (!resolutionNoteInput || resolutionNoteInput.trim().length < 5)) {
      alert('Safety-critical issue (Brakes/Tires) must be verified and recorded with resolution notes before resolving.');
      return;
    }
    setIsActionLoading(true);
    try {
      await updateTransportComplaint(id, {
        status: 'Resolved',
        resolutionNote: resolutionNoteInput.trim() || 'Issue inspected, repaired and verified by authorized fleet personnel.'
      });
      setShowResolveModal(false);
      fetchComplaint();
    } catch (err) {
      console.error(err);
      alert('Failed to resolve complaint: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Driver: Acknowledge Resolution
  const handleDriverAcknowledge = async () => {
    setIsActionLoading(true);
    try {
      await updateTransportComplaint(id, {
        acknowledgedByDriver: true,
        driverAcknowledgeNote: `Acknowledged by Driver ${driverSession?.name || ''} at ${new Date().toLocaleTimeString()}`
      });
      fetchComplaint();
    } catch (err) {
      console.error(err);
      alert('Could not acknowledge resolution');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved':
      case 'Closed':
        return { bg: '#dcfce7', text: '#166534', dot: '#22c55e' };
      case 'In Progress':
      case 'Assigned':
        return { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' };
      default:
        return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#6b7280' }}>
      <div style={{ width: '3rem', height: '3rem', border: '4px solid #bfdbfe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}></div>
      <p style={{ fontWeight: 'bold' }}>Loading Complaint Details...</p>
    </div>
  );
  
  if (!complaint) return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '4rem', height: '4rem', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#dc2626', marginBottom: '1rem' }}>
        <AlertTriangle size={32} />
      </div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.5rem' }}>Complaint Not Found</h2>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>The complaint you are looking for does not exist or was removed.</p>
      <button 
        onClick={handleBack} 
        style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        Go Back
      </button>
    </div>
  );

  const statusStyle = getStatusColor(complaint.status);
  const isSafetyComplaint = /brake|tire|tyre|steering|suspension|engine|safety/i.test(complaint.complaintType || '') ||
                            /brake|tire|tyre|steering|suspension|engine|safety/i.test(complaint.description || '');

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Top Navigation */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={handleBack}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: '#475569', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}
        >
          <ArrowLeft size={16} /> {isDriver ? 'Back to Driver Tasks' : 'Back to Transport Management'}
        </button>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Details & Resolution Notes */}
        <div style={{ gridColumn: 'span 2' }}>
          
          {/* Top Info Card */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe', flexShrink: 0 }}>
                  <Wrench size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Complaint {complaint.complaintId}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                      <Clock size={12} /> {complaint.status}
                    </div>
                    {isSafetyComplaint && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px', border: '1px solid #fecaca' }}>
                        ⚠️ Safety Priority
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500 }}>
                    <Calendar size={12} /> Logged: {new Date(complaint.createdAt).toLocaleDateString()}, {new Date(complaint.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              
              {/* Admin Action Buttons */}
              {isAdminOrStaff && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
                  <button 
                    onClick={() => {
                      setAssigneeInput(complaint.assignedTo && complaint.assignedTo !== 'Unassigned' ? complaint.assignedTo : '');
                      setShowAssignModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700, borderRadius: '0.5rem', cursor: 'pointer' }}
                  >
                    <UserCheck size={14} /> Assign
                  </button>
                  <button 
                    onClick={() => {
                      setStatusInput(complaint.status || 'In Progress');
                      setResolutionNoteInput(complaint.resolutionNote || '');
                      setShowStatusModal(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', backgroundColor: '#2563eb', color: 'white', fontSize: '0.82rem', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                  >
                    <Edit2 size={14} /> Update Status
                  </button>
                  {complaint.status !== 'Resolved' && complaint.status !== 'Closed' && (
                    <button 
                      onClick={() => {
                        setResolutionNoteInput(complaint.resolutionNote || '');
                        setShowResolveModal(true);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', backgroundColor: '#16a34a', color: 'white', fontSize: '0.82rem', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                    >
                      <CheckCircle size={14} /> Resolve Complaint
                    </button>
                  )}
                </div>
              )}

              {/* Driver Action: Acknowledge */}
              {isDriver && complaint.status === 'Resolved' && !complaint.acknowledgedByDriver && (
                <button
                  onClick={handleDriverAcknowledge}
                  disabled={isActionLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', backgroundColor: '#16a34a', color: 'white', fontSize: '0.82rem', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}
                >
                  <Check size={14} /> Acknowledge Resolution
                </button>
              )}
            </div>

            {/* Meta Attributes Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
              <div style={{ minWidth: '130px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Reporter / Driver</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                  <User size={14} style={{ color: '#2563eb' }} />
                  <span>{complaint.name} <span style={{ fontWeight: 500, color: '#64748b' }}>({complaint.studentId || complaint.reporterType})</span></span>
                </div>
              </div>
              <div style={{ minWidth: '130px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Complaint Type</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                  <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                  <span>{complaint.complaintType}</span>
                </div>
              </div>
              <div style={{ minWidth: '130px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Vehicle</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                  <Bus size={14} style={{ color: '#3b82f6' }} />
                  <span>{complaint.busNumber || 'N/A'}</span>
                </div>
              </div>
              <div style={{ minWidth: '130px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Route</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#0f172a', fontWeight: 700, fontSize: '0.88rem' }}>
                  <MapPin size={14} style={{ color: '#64748b' }} />
                  <span>{complaint.routeId || 'N/A'}</span>
                </div>
              </div>
              <div style={{ minWidth: '130px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Assigned To</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#2563eb', fontWeight: 800, fontSize: '0.88rem' }}>
                  <UserCheck size={14} />
                  <span>{complaint.assignedTo || 'Unassigned'}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginTop: '1.25rem' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Description / Reported Concern</p>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.5 }}>
                {complaint.description}
              </div>
            </div>

            {/* Resolution Notes Box */}
            {complaint.resolutionNote && (
              <div style={{ marginTop: '1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  <CheckCircle size={16} /> Official Resolution Notes
                </div>
                <div style={{ fontSize: '0.88rem', color: '#14532d', lineHeight: 1.5 }}>
                  {complaint.resolutionNote}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '0.5rem', fontWeight: 600 }}>
                  Resolved by: {complaint.resolvedBy || 'Authorized Staff'} {complaint.resolvedAt ? `on ${new Date(complaint.resolvedAt).toLocaleString()}` : ''}
                </div>
                {complaint.acknowledgedByDriver && (
                  <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '4px' }}>
                    ✓ Resolution Acknowledged by Driver
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discussion Chat System */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <MessageSquare size={18} color="#475569" />
                <h2 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Resolution Discussion & Messaging</h2>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '9999px' }}>
                  {(complaint.replies || []).length} Messages
                </span>
              </div>
            </div>
            
            <div style={{ padding: '1.25rem', minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: '#fafafa' }}>
              {(!complaint.replies || complaint.replies.length === 0) ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No replies logged. Add a message below.
                </div>
              ) : (
                complaint.replies.map((reply, idx) => {
                  const isAdmin = ['admin', 'staff', 'system admin', 'hod'].includes((reply.role || '').toLowerCase());
                  
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, color: 'white', backgroundColor: isAdmin ? '#2563eb' : '#16a34a', flexShrink: 0 }}>
                        {(reply.sender || 'U').charAt(0).toUpperCase()}
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>{reply.sender}</span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>({reply.role})</span>
                          <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>•</span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{new Date(reply.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        
                        <div style={{ 
                          padding: '0.65rem 0.85rem', 
                          backgroundColor: isAdmin ? '#eff6ff' : 'white', 
                          color: isAdmin ? '#1e40af' : '#1e293b', 
                          borderRadius: '0.5rem',
                          border: isAdmin ? '1px solid #dbeafe' : '1px solid #e2e8f0',
                          fontSize: '0.85rem',
                          maxWidth: '90%',
                          width: 'fit-content',
                          lineHeight: 1.4
                        }}>
                          {reply.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', backgroundColor: 'white' }}>
              {successToast && (
                <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.85rem', backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                  <CheckCircle size={15} color="#059669" /> {successToast}
                </div>
              )}
              {complaint.status === 'Closed' && (
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldCheck size={14} color="#64748b" /> 
                  <span>Complaint status is <strong>Closed</strong>. Further replies remain enabled for post-resolution tracking & audit follow-ups.</span>
                </div>
              )}
              <form onSubmit={handleSendReply} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                  placeholder="Type an update or resolution reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={isSubmitting}
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting || !replyMessage.trim()}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '0.5rem', backgroundColor: '#2563eb', color: 'white', fontWeight: 700, border: 'none', cursor: isSubmitting || !replyMessage.trim() ? 'not-allowed' : 'pointer', opacity: isSubmitting || !replyMessage.trim() ? 0.5 : 1, fontSize: '0.85rem' }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Workflow Timeline */}
        <div>
          <div style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} color="#2563eb" /> Audit Timeline & History
            </h3>

            {(!complaint.timeline || complaint.timeline.length === 0) ? (
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No recorded timeline actions yet.</p>
            ) : (
              <div style={{ position: 'relative', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {complaint.timeline.map((item, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.35rem', top: '0.2rem', width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }}></div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{item.action}</div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>{item.details}</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(item.timestamp).toLocaleString()} {item.user ? `• by ${item.user}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Assign Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Assign Complaint {complaint.complaintId}</h3>
            <form onSubmit={handleConfirmAssign}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>Assign to Maintenance Team or Transport Officer</label>
                <select 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  value={assigneeInput}
                  onChange={e => setAssigneeInput(e.target.value)}
                  required
                >
                  <option value="">Select Assignee</option>
                  <optgroup label="Maintenance & Fleet Team">
                    <option value="Fleet Maintenance Team">Fleet Maintenance Team</option>
                    <option value="Chief Workshop Engineer - Ramesh">Chief Workshop Engineer - Ramesh</option>
                    <option value="Senior Bus Mechanic - Suresh">Senior Bus Mechanic - Suresh</option>
                    <option value="Tire & Brake Specialist - Kumar">Tire & Brake Specialist - Kumar</option>
                  </optgroup>
                  <optgroup label="Transport Supervisors & Officers">
                    <option value="Transport Supervisor">Transport Supervisor</option>
                    <option value="Safety & Compliance Officer">Safety & Compliance Officer</option>
                    <option value="Vaideeswari (Admin)">Vaideeswari (Admin)</option>
                  </optgroup>
                  {driversList.length > 0 && (
                    <optgroup label="Drivers">
                      {driversList.map(d => (
                        <option key={d.driverId || d._id} value={d.name}>{d.name} ({d.driverId || 'Driver'})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>Or Enter Custom Assignee</label>
                <input 
                  type="text"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  placeholder="e.g. Authorized Bosch Workshop"
                  value={assigneeInput}
                  onChange={e => setAssigneeInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isActionLoading || !assigneeInput.trim()}
                  style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isActionLoading ? 'Saving...' : 'Save Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Status Update Modal */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0' }}>Update Status: {complaint.complaintId}</h3>
            <form onSubmit={handleConfirmStatusUpdate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>Workflow Status</label>
                <select 
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  value={statusInput}
                  onChange={e => setStatusInput(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress (Inspection/Repair Active)</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>Resolution / Update Notes</label>
                <textarea 
                  rows="3"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  placeholder="Notes explaining progress or actions taken..."
                  value={resolutionNoteInput}
                  onChange={e => setResolutionNoteInput(e.target.value)}
                ></textarea>
                {isSafetyComplaint && (
                  <small style={{ color: '#b45309', display: 'block', marginTop: '4px', fontWeight: 600 }}>
                    ⚠️ Safety-critical item (Brakes/Tires). Mandatory resolution notes required to resolve.
                  </small>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowStatusModal(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isActionLoading}
                  style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isActionLoading ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Resolve Modal */}
      {showResolveModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#166534' }}>Resolve Complaint {complaint.complaintId}</h3>
            <form onSubmit={handleConfirmResolve}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', color: '#166534' }}>
                <div><strong>Issue:</strong> {complaint.complaintType}</div>
                <div><strong>Bus:</strong> {complaint.busNumber} | <strong>Route:</strong> {complaint.routeId}</div>
                <div style={{ marginTop: '2px' }}><strong>Description:</strong> {complaint.description}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem' }}>Authorized Resolution & Inspection Notes *</label>
                <textarea 
                  rows="4"
                  required
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  placeholder="Detail the technical action taken, inspection cleared, mechanic confirmation, and safety verification..."
                  value={resolutionNoteInput}
                  onChange={e => setResolutionNoteInput(e.target.value)}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowResolveModal(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isActionLoading || !resolutionNoteInput.trim()}
                  style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isActionLoading ? 'Saving...' : 'Confirm & Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ResolveComplaintPage;
