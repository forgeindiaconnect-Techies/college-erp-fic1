import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTransportComplaintById, updateTransportComplaint, addTransportComplaintReply, createTransportNotification, getStaff } from '../../api/index';
import { ArrowLeft, MessageSquare, Clock, User, ShieldCheck, Send, CheckCircle, AlertTriangle, Shield, Calendar, RefreshCcw, Bus, MapPin, Building, AlertCircle, Edit2, ChevronDown, Paperclip } from 'lucide-react';

const ResolveComplaintPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Check if current user is a driver/student (read-only for status/assignment)
  const isReadOnly = sessionStorage.getItem('driver_session') !== null || sessionStorage.getItem('student_session') !== null;

  const fetchComplaint = async () => {
    try {
      const [res, staffRes] = await Promise.all([
        getTransportComplaintById(id),
        getStaff().catch(() => ({ data: [] }))
      ]);
      setComplaint(res.data);
      setStaffList(staffRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
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

      await addTransportComplaintReply(id, { message: replyMessage });
      
      try {
        // Notification API is restricted to Admins/Staff. If it fails, we still want the reply to succeed.
        await createTransportNotification({
          title: `Reply from ${sessionName}`,
          message: `[Complaint ${complaint.complaintId}] ${replyMessage}`,
          type: "Info",
          targetRole: "All"
        });
      } catch (notifErr) {
        console.warn('Could not send global notification (expected for Driver role), but reply was added successfully');
      }

      setReplyMessage('');
      fetchComplaint();
    } catch (err) {
      console.error(err);
      alert('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      await updateTransportComplaint(id, { status });
      fetchComplaint();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignStaff = async (staffName) => {
    try {
      await updateTransportComplaint(id, { assignedTo: staffName });
      await createTransportNotification({
        title: "Complaint Assigned",
        message: `You have been assigned to complaint ${complaint.complaintId}`,
        type: "Alert",
        targetRole: "Staff"
      });
      fetchComplaint();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved': return { bg: '#dcfce7', text: '#166534', dot: '#22c55e' };
      case 'In Progress': return { bg: '#fef9c3', text: '#854d0e', dot: '#eab308' };
      default: return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };
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
      
    </div>
  );

  const statusStyle = getStatusColor(complaint.status);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header Action */}
      

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Left Column: Details & Discussion */}
        <div style={{ gridColumn: '1 / -1' }} className="lg:col-span-2">
          
          {/* Top Info Card */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9d5ff', flexShrink: 0 }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Complaint {complaint.complaintId}</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                      <Clock size={12} /> Status: {complaint.status}
                    </div>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 500 }}>
                    <Calendar size={12} /> Reported on {new Date(complaint.createdAt).toLocaleDateString()}, {new Date(complaint.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
              
              {!isReadOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#9333ea', color: 'white', fontSize: '0.875rem', fontWeight: 'bold', borderRadius: '0.5rem', border: 'none', cursor: 'pointer' }}>
                    <Edit2 size={14} /> Edit Status
                  </button>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: 'white', border: '1px solid #e5e7eb', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', borderRadius: '0.5rem', cursor: 'pointer' }}>
                    More Actions <ChevronDown size={14} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '2rem' }}>
              <div style={{ minWidth: '140px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Reporter</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#1f2937', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  <User size={14} style={{ color: '#9333ea' }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{complaint.name} <span style={{ fontWeight: 500, color: '#6b7280' }}>({complaint.reporterType})</span></span>
                </div>
              </div>
              <div style={{ minWidth: '140px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Category</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#1f2937', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  <AlertCircle size={14} style={{ color: '#f97316' }} />
                  <span>{complaint.complaintType}</span>
                </div>
              </div>
              <div style={{ minWidth: '140px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Vehicle</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#1f2937', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  <Bus size={14} style={{ color: '#3b82f6' }} />
                  <span>{complaint.busNumber || 'TN01AB15678'}</span>
                </div>
              </div>
              <div style={{ minWidth: '140px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Route</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#1f2937', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  <MapPin size={14} style={{ color: '#6b7280' }} />
                  <span>{complaint.routeId || 'Anna Nagar Route'}</span>
                </div>
              </div>
              <div style={{ minWidth: '140px', flex: '1 1 0' }}>
                <p style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Department</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#1f2937', fontWeight: 'bold', fontSize: '0.875rem' }}>
                  <Building size={14} style={{ color: '#6366f1' }} />
                  <span>{complaint.department || 'Admin'}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '0.75rem' }}>Original Issue Description</p>
              <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f3f4f6', fontSize: '0.875rem', color: '#374151' }}>
                {complaint.description}
              </div>
            </div>
          </div>

          {/* Discussion Chat System */}
          <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MessageSquare size={20} color="#374151" />
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>Resolution Discussion</h2>
                <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', padding: '0.125rem 0.625rem', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: '9999px' }}>
                  {(complaint.replies || []).length} Messages
                </span>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: '#fafafa' }}>
              {(!complaint.replies || complaint.replies.length === 0) ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <p>No replies yet. Start the conversation below.</p>
                </div>
              ) : (
                complaint.replies.map((reply, idx) => {
                  const isAdminOrStaff = ['admin', 'staff', 'system admin', 'hod'].includes(reply.role?.toLowerCase());
                  
                  return (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold', color: 'white', backgroundColor: isAdminOrStaff ? '#6366F1' : '#22c55e', flexShrink: 0 }}>
                        {reply.sender.charAt(0).toUpperCase()}
                      </div>
                      
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.8125rem', color: '#111827' }}>{reply.sender}</span>
                          <span style={{ fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 500 }}>{reply.role}</span>
                          <span style={{ fontSize: '0.6875rem', color: '#d1d5db' }}>•</span>
                          <span style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>{new Date(reply.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        
                        <div style={{ 
                          padding: '0.75rem 1rem', 
                          backgroundColor: isAdminOrStaff ? '#f3e8ff' : 'white', 
                          color: isAdminOrStaff ? '#6b21a8' : '#374151', 
                          borderRadius: '0.5rem',
                          border: isAdminOrStaff ? '1px solid #e9d5ff' : '1px solid #e5e7eb',
                          fontSize: '0.875rem',
                          maxWidth: '90%',
                          width: 'fit-content',
                          lineHeight: '1.4'
                        }}>
                          {reply.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ padding: '1.25rem', borderTop: '1px solid #f3f4f6', backgroundColor: 'white' }}>
              <form onSubmit={handleSendReply} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.875rem', outline: 'none' }}
                  placeholder="Type a message to reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={isSubmitting}
                />
                <button 
                  type="submit" 
                  disabled={isSubmitting || !replyMessage.trim()}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', backgroundColor: '#9333ea', color: 'white', fontWeight: 'bold', border: 'none', cursor: isSubmitting || !replyMessage.trim() ? 'not-allowed' : 'pointer', opacity: isSubmitting || !replyMessage.trim() ? 0.5 : 1 }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolveComplaintPage;
