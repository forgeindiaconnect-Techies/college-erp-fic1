import React, { useState, useEffect } from 'react';
import { 
  Calendar, Monitor, UserCheck, CreditCard, 
  AlertOctagon, BrainCircuit, CheckCircle, 
  XCircle, Clock, ShieldAlert, MessageSquare, X,
  Briefcase, Users, FileText
} from 'lucide-react';
import { 
  getStaffSupportRequests, updateStaffSupportRequest,
  getHodSupportRequests, updateHodSupportRequest
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const SUPPORT_CATEGORIES = [
  { id: 'Leave', title: 'Leave Management', icon: Calendar, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'Salary Query', title: 'Salary Queries', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'Complaint', title: 'Complaints', icon: AlertOctagon, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'Counseling', title: 'Training & Wellness', icon: BrainCircuit, color: 'text-amber-500', bg: 'bg-amber-500/10' },
];

const PrincipalStaffSupport = () => {
  const [viewMode, setViewMode] = useState('Staff'); // 'Staff' or 'HOD'
  const [staffRequests, setStaffRequests] = useState([]);
  const [hodRequests, setHodRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  
  // Modal State
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [replyText, setReplyText] = useState('');

  const loadRequests = async () => {
    try {
      const [staffRes, hodRes] = await Promise.all([
        getStaffSupportRequests(),
        getHodSupportRequests()
      ]);
      if (staffRes?.data) setStaffRequests(staffRes.data);
      if (hodRes?.data) setHodRequests(hodRes.data);
    } catch(err) {
      console.error('Failed to load support requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  useRealtimeSync(loadRequests, ['staffSupportUpdated', 'hodSupportUpdated']);

  // Depending on viewMode, determine which requests to filter
  const currentRequests = viewMode === 'Staff' ? staffRequests : hodRequests;
  const filteredRequests = activeTab === 'All' ? currentRequests : currentRequests.filter(r => r.requestType === activeTab);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      if (viewMode === 'Staff') {
        await updateStaffSupportRequest(id, { 
          status: newStatus,
          $push: { timeline: { date: new Date().toISOString().split('T')[0], text: `Status changed to ${newStatus}` } }
        });
      } else {
        await updateHodSupportRequest(id, { 
          status: newStatus,
          $push: { timeline: { date: new Date().toISOString().split('T')[0], text: `Principal Status changed to ${newStatus}` } }
        });
      }
      loadRequests();
    } catch(err) {
      console.error('Failed to update status', err);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !replyText) return;
    
    try {
      if (viewMode === 'Staff') {
        await updateStaffSupportRequest(selectedRequest._id, {
          $push: { timeline: { date: new Date().toISOString().split('T')[0], text: `Principal Reply: ${replyText}` } }
        });
      } else {
        await updateHodSupportRequest(selectedRequest._id, {
          $push: { timeline: { date: new Date().toISOString().split('T')[0], text: `Principal Reply: ${replyText}` } }
        });
      }
      setShowReplyModal(false);
      setSelectedRequest(null);
      setReplyText('');
      loadRequests();
    } catch(err) {
      console.error('Failed to send reply', err);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><span style={{ color: 'var(--text-muted)' }}>Loading Staff Requests...</span></div>;

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header Banner */}
      <div style={{
        background: '#3730A5',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blur */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(40px)' }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={24} /> Support & Escalations Oversight
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem', fontWeight: 500 }}>
            Review and manage staff requests, leaves, complaints, and HOD escalations.
          </p>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => { setViewMode('Staff'); setActiveTab('All'); }}
          className={viewMode === 'Staff' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, background: viewMode === 'Staff' ? '#3730A5' : undefined }}
        >
          <Users size={18} /> Staff Requests
        </button>
        <button 
          onClick={() => { setViewMode('HOD'); setActiveTab('All'); }}
          className={viewMode === 'HOD' ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, background: viewMode === 'HOD' ? '#3730A5' : undefined }}
        >
          <Briefcase size={18} /> HOD Escalations
        </button>
      </div>

      {/* Overview Cards */}
      {viewMode === 'Staff' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'All' ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === 'All' ? '2px' : '1px' }} onClick={() => setActiveTab('All')}>
            <div className="bg-indigo-500/10 text-indigo-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>All Staff Requests</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{staffRequests.length} Total</p>
            </div>
          </div>
          {SUPPORT_CATEGORIES.map(cat => {
            const catCount = staffRequests.filter(r => r.requestType === cat.id).length;
            return (
              <div key={cat.id} className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === cat.id ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === cat.id ? '2px' : '1px' }} onClick={() => setActiveTab(cat.id)}>
                <div className={`${cat.bg} ${cat.color}`} style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
                  <cat.icon size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{cat.title}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{catCount} Request{catCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'All' ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === 'All' ? '2px' : '1px' }} onClick={() => setActiveTab('All')}>
            <div className="bg-indigo-500/10 text-indigo-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>All HOD Escalations</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hodRequests.length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'Faculty Support' ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === 'Faculty Support' ? '2px' : '1px' }} onClick={() => setActiveTab('Faculty Support')}>
            <div className="bg-blue-500/10 text-blue-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Faculty Support</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => r.requestType === 'Faculty Support').length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'Student Escalations' ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === 'Student Escalations' ? '2px' : '1px' }} onClick={() => setActiveTab('Student Escalations')}>
            <div className="bg-red-500/10 text-red-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Student Escalations</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => r.requestType === 'Student Escalations').length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'Resource Requests' ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === 'Resource Requests' ? '2px' : '1px' }} onClick={() => setActiveTab('Resource Requests')}>
            <div className="bg-amber-500/10 text-amber-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Monitor size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Resource Requests</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => r.requestType === 'Resource Requests').length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderColor: activeTab === 'Other' ? '#3730A5' : 'var(--border-color)', borderWidth: activeTab === 'Other' ? '2px' : '1px' }} onClick={() => setActiveTab('Other')}>
            <div className="bg-purple-500/10 text-purple-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <FileText size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Other</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => !['Faculty Support', 'Student Escalations', 'Resource Requests'].includes(r.requestType)).length} Total</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem' }}>{activeTab === 'All' ? 'All Recent Requests' : `${activeTab} Requests`}</h3>
        </div>
        
        <div style={{ padding: '0' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No requests found in this category.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>{viewMode === 'Staff' ? 'Staff Details' : 'HOD Details'}</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>{viewMode === 'Staff' ? 'Request Type' : 'Escalation Type'}</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Description</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem' }}>
                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 600 }}>{viewMode === 'Staff' ? r.staffName : r.hodName}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.department}</p>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {r.requestType} <br/> <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.subType}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', maxWidth: '250px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Submitted: {new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: r.status === 'Resolved' || r.status === 'Approved' ? 'rgba(16,185,129,0.1)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.1)' : r.status === 'Pending' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', color: r.status === 'Resolved' || r.status === 'Approved' ? '#3730A5' : r.status === 'Rejected' ? '#ef4444' : r.status === 'Pending' ? '#f59e0b' : '#3b82f6' }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setSelectedRequest(r); setShowReplyModal(true); }} style={{ padding: '6px', borderRadius: '6px', background: 'rgba(79,70,229,0.1)', color: '#4f46e5', border: 'none', cursor: 'pointer' }} title="Reply to Staff">
                            <MessageSquare size={16} />
                          </button>
                          {r.status !== 'Approved' && r.status !== 'Resolved' && (
                            <button onClick={() => handleUpdateStatus(r._id, r.requestType === 'Leave' ? 'Approved' : 'Resolved')} style={{ padding: '6px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#3730A5', border: 'none', cursor: 'pointer' }} title="Approve/Resolve">
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {r.status !== 'Rejected' && (
                            <button onClick={() => handleUpdateStatus(r._id, 'Rejected')} style={{ padding: '6px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer' }} title="Reject">
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MessageSquare size={18} color="#4f46e5"/> Reply to {viewMode === 'Staff' ? selectedRequest?.staffName : selectedRequest?.hodName}
              </h3>
              <button onClick={() => setShowReplyModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSendReply} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Message</label>
                <textarea 
                  rows="4"
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your response here..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowReplyModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>Send Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalStaffSupport;
