import React, { useState, useEffect } from 'react';
import { 
  Calendar, Monitor, UserCheck, CreditCard, 
  AlertOctagon, BrainCircuit, CheckCircle, 
  XCircle, Clock, ShieldAlert, MessageSquare, X,
  Briefcase, Users, FileText, Search, Filter, RefreshCw
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
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
  
  const filteredRequests = currentRequests.filter(r => {
    const matchesTab = activeTab === 'All' ? true : (r.requestType === activeTab || (activeTab === 'Other' && !['Faculty Support', 'Student Escalations', 'Resource Requests'].includes(r.requestType)));
    const matchesStatus = statusFilter === 'All' ? true : (r.status === statusFilter);
    const searchLower = searchQuery.toLowerCase();
    const nameStr = (viewMode === 'Staff' ? r.staffName : r.hodName) || '';
    const descStr = r.description || '';
    const reqTypeStr = r.requestType || '';
    const deptStr = r.department || '';
    const matchesSearch = !searchQuery || 
      nameStr.toLowerCase().includes(searchLower) ||
      descStr.toLowerCase().includes(searchLower) ||
      reqTypeStr.toLowerCase().includes(searchLower) ||
      deptStr.toLowerCase().includes(searchLower);
      
    return matchesTab && matchesStatus && matchesSearch;
  });

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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', gap: '0.75rem' }}>
      <RefreshCw className="animate-spin text-indigo-500" size={24} />
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Real-time Support Portal...</span>
    </div>
  );

  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Modern Clean Header (Background Banner Removed & ERP Styled) */}
      <div className="glass-card shadow-sm mb-6" style={{
        padding: '1.5rem 2rem',
        borderRadius: '16px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1.5rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            padding: '14px',
            borderRadius: '14px',
            background: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Support & Escalations Oversight
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
              Review and manage staff requests, leave applications, complaints, and HOD escalations in real time.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
            Real-Time ERP Synced
          </span>
          <button onClick={loadRequests} className="btn-secondary" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', background: 'var(--bg-secondary)', padding: '5px', borderRadius: '12px', border: '1px solid var(--border-color)', width: 'fit-content' }}>
        <button 
          onClick={() => { setViewMode('Staff'); setActiveTab('All'); }}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            fontSize: '0.88rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: viewMode === 'Staff' ? 'var(--primary)' : 'transparent',
            color: viewMode === 'Staff' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: viewMode === 'Staff' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
          }}
        >
          <Users size={18} /> Staff Requests ({staffRequests.length})
        </button>
        <button 
          onClick={() => { setViewMode('HOD'); setActiveTab('All'); }}
          style={{
            padding: '0.65rem 1.4rem',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            fontSize: '0.88rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: viewMode === 'HOD' ? 'var(--primary)' : 'transparent',
            color: viewMode === 'HOD' ? '#ffffff' : 'var(--text-muted)',
            boxShadow: viewMode === 'HOD' ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none'
          }}
        >
          <Briefcase size={18} /> HOD Escalations ({hodRequests.length})
        </button>
      </div>

      {/* Overview Cards */}
      {viewMode === 'Staff' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === 'All' ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === 'All' ? '2px' : '1px' }} onClick={() => setActiveTab('All')}>
            <div className="bg-indigo-500/10 text-indigo-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>All Staff Requests</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{staffRequests.length} Total</p>
            </div>
          </div>
          {SUPPORT_CATEGORIES.map(cat => {
            const catCount = staffRequests.filter(r => r.requestType === cat.id).length;
            return (
              <div key={cat.id} className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === cat.id ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === cat.id ? '2px' : '1px' }} onClick={() => setActiveTab(cat.id)}>
                <div className={`${cat.bg} ${cat.color}`} style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
                  <cat.icon size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>{cat.title}</p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{catCount} Request{catCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === 'All' ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === 'All' ? '2px' : '1px' }} onClick={() => setActiveTab('All')}>
            <div className="bg-indigo-500/10 text-indigo-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Clock size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>All HOD Escalations</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hodRequests.length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === 'Faculty Support' ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === 'Faculty Support' ? '2px' : '1px' }} onClick={() => setActiveTab('Faculty Support')}>
            <div className="bg-blue-500/10 text-blue-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Faculty Support</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => r.requestType === 'Faculty Support').length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === 'Student Escalations' ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === 'Student Escalations' ? '2px' : '1px' }} onClick={() => setActiveTab('Student Escalations')}>
            <div className="bg-red-500/10 text-red-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Student Escalations</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => r.requestType === 'Student Escalations').length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === 'Resource Requests' ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === 'Resource Requests' ? '2px' : '1px' }} onClick={() => setActiveTab('Resource Requests')}>
            <div className="bg-amber-500/10 text-amber-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <Monitor size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Resource Requests</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => r.requestType === 'Resource Requests').length} Total</p>
            </div>
          </div>
          <div className="glass-card hover-scale" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', background: 'var(--bg-secondary)', borderColor: activeTab === 'Other' ? 'var(--primary)' : 'var(--border-color)', borderWidth: activeTab === 'Other' ? '2px' : '1px' }} onClick={() => setActiveTab('Other')}>
            <div className="bg-purple-500/10 text-purple-500" style={{ padding: '12px', borderRadius: '12px', display: 'flex' }}>
              <FileText size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Other</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>{hodRequests.filter(r => !['Faculty Support', 'Student Escalations', 'Resource Requests'].includes(r.requestType)).length} Total</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Card with Toolbar */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 700 }}>
              {activeTab === 'All' ? 'All Recent Submissions' : `${activeTab} Requests`}
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredRequests.length} of {currentRequests.length} records
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, type, details..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <X size={14} onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        
        <div style={{ padding: '0' }}>
          {filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
              <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No requests match your search filter</p>
              <p style={{ fontSize: '0.85rem' }}>Try clearing your search keyword or status filter pill.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'var(--bg-primary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{viewMode === 'Staff' ? 'Staff Details' : 'HOD Details'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{viewMode === 'Staff' ? 'Request Type' : 'Escalation Type'}</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Description</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.88rem' }}>
                  {filteredRequests.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '1rem' }}>
                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>{viewMode === 'Staff' ? r.staffName : r.hodName}</p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.department || 'General'}</p>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', fontWeight: 600 }}>
                        {r.requestType} <br/> <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400 }}>{r.subType}</span>
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-main)', maxWidth: '280px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{r.description}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Submitted: {new Date(r.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '12px', 
                          fontSize: '0.78rem', 
                          fontWeight: 700, 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: r.status === 'Resolved' || r.status === 'Approved' ? 'rgba(16,185,129,0.12)' : r.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : r.status === 'Pending' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)', 
                          color: r.status === 'Resolved' || r.status === 'Approved' ? '#10b981' : r.status === 'Rejected' ? '#ef4444' : r.status === 'Pending' ? '#f59e0b' : '#3b82f6' 
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => { setSelectedRequest(r); setShowReplyModal(true); }} 
                            style={{ padding: '6px 10px', borderRadius: '7px', background: 'rgba(79,70,229,0.1)', color: 'var(--primary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }} 
                            title="Reply to User"
                          >
                            <MessageSquare size={15} /> Reply
                          </button>
                          {r.status !== 'Approved' && r.status !== 'Resolved' && (
                            <button 
                              onClick={() => handleUpdateStatus(r._id, r.requestType === 'Leave' ? 'Approved' : 'Resolved')} 
                              style={{ padding: '6px 10px', borderRadius: '7px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }} 
                              title="Approve/Resolve"
                            >
                              <CheckCircle size={15} /> Approve
                            </button>
                          )}
                          {r.status !== 'Rejected' && (
                            <button 
                              onClick={() => handleUpdateStatus(r._id, 'Rejected')} 
                              style={{ padding: '6px 10px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }} 
                              title="Reject"
                            >
                              <XCircle size={15} /> Reject
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
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '480px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1rem' }}>
                <MessageSquare size={18} color="var(--primary)"/> Reply to {viewMode === 'Staff' ? selectedRequest?.staffName : selectedRequest?.hodName}
              </h3>
              <button onClick={() => setShowReplyModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSendReply} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Your Response Message</label>
                <textarea 
                  rows="4"
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your official response here..."
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'none', fontSize: '0.9rem' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowReplyModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>Send Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrincipalStaffSupport;
