import React, { useState, useEffect } from 'react';
import { 
  Megaphone, FileText, AlertTriangle, Calendar, Users, CheckCircle, 
  Trash2, Edit2, Plus, Search, Filter, UploadCloud, Clock, Send, Eye, 
  ShieldAlert, Bell, Mail, MessageSquare, Settings, Share2, Sliders, X, AlertCircle
} from 'lucide-react';
import '../../pages/Dashboard.css';

// Pre-seeded communication logs to make the hub look instantly rich and functional
const INITIAL_LOGS = [];

export default function PrincipalCommunicationCenter() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [userName, setUserName] = useState('Principal');

  // Modal active states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Active items for detail viewing or editing
  const [activeLog, setActiveLog] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  // General Notification Toasts
  const [toast, setToast] = useState(null);

  // Forms states
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', category: 'Announcements', department: 'All', audience: 'Entire College', priority: 'Medium', channels: ['Email', 'Push'], attachment: null });
  const [scheduleForm, setScheduleForm] = useState({ title: '', content: '', category: 'Academic Updates', department: 'All', audience: 'Students', date: '', time: '', channels: ['Email'] });
  const [emergencyForm, setEmergencyForm] = useState({ title: '', content: '', channels: ['Email', 'SMS', 'Push'] });
  const [uploadForm, setUploadForm] = useState({ title: '', category: 'Circulars', department: 'All', audience: 'All', priority: 'High', fileName: '', fileLoaded: false });

  // IT Clearance Safeguard dialog states
  const [showClearanceBlock, setShowClearanceBlock] = useState(false);
  const [blockedActionName, setBlockedActionName] = useState('');

  useEffect(() => {
    // Sync principal session data
    const session = sessionStorage.getItem('principal_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUserName(parsed.name || 'Principal');
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }

    // Sync database / LocalStorage logs (Using v2 key to clear old mock data)
    const saved = localStorage.getItem(`erp_communication_logs_v2_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (saved) {
      setLogs(JSON.parse(saved));
    } else {
      localStorage.setItem(`erp_communication_logs_v2_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(INITIAL_LOGS));
      setLogs(INITIAL_LOGS);
    }
  }, []);

  const triggerToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const saveLogs = (newLogs) => {
    setLogs(newLogs);
    localStorage.setItem(`erp_communication_logs_v2_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(newLogs));
  };

  // Safe blocker modal for IT Super Admin permissions
  const handleClearanceTrigger = (action) => {
    setBlockedActionName(action);
    setShowClearanceBlock(true);
  };

  // CRUD: Edit announcement initializer
  const handleOpenEdit = (log) => {
    setEditTarget(log.id);
    setAnnouncementForm({
      title: log.title,
      content: log.content || 'Official circular directive details from Principal Office.',
      category: log.category,
      department: log.department,
      audience: log.audience,
      priority: log.priority,
      channels: log.channels,
      attachment: log.attachment
    });
    setIsCreateOpen(true);
  };

  // CRUD: Delete announcement
  const handleDeleteLog = (id) => {
    if (window.confirm('Delete this notice circular from the active historical archive? This will retract it from dashboard widgets.')) {
      const updated = logs.filter(l => l.id !== id);
      saveLogs(updated);
      triggerToast('🗑️ Announcement log permanently purged from transmission registers.', 'info');
    }
  };

  // Broadcast creators
  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    
    if (editTarget) {
      // Edit
      const updated = logs.map(l => l.id === editTarget ? { ...l, ...announcementForm } : l);
      saveLogs(updated);
      triggerToast('✓ Circular announcement updated successfully.');
      setEditTarget(null);
    } else {
      // New
      const newId = `COM${String(Date.now()).slice(-3)}`;
      const newLog = {
        id: newId,
        title: announcementForm.title,
        category: announcementForm.category,
        department: announcementForm.department,
        audience: announcementForm.audience,
        priority: announcementForm.priority,
        date: today,
        status: 'Sent',
        attachment: announcementForm.attachment,
        channels: announcementForm.channels,
        delivery: { email: 98, sms: announcementForm.channels.includes('SMS') ? 94 : 0, push: announcementForm.channels.includes('Push') ? 100 : 0 }
      };
      saveLogs([newLog, ...logs]);
      triggerToast('🔥 Notice successfully broadcasted across targeted channels!');
    }
    
    // Reset Form
    setAnnouncementForm({ title: '', content: '', category: 'Announcements', department: 'All', audience: 'Entire College', priority: 'Medium', channels: ['Email', 'Push'], attachment: null });
    setIsCreateOpen(false);
  };

  const handleScheduleNotice = (e) => {
    e.preventDefault();
    const newId = `COM${String(Date.now()).slice(-3)}`;
    const newLog = {
      id: newId,
      title: `[Scheduled] ${scheduleForm.title}`,
      category: scheduleForm.category,
      department: scheduleForm.department,
      audience: scheduleForm.audience,
      priority: 'High',
      date: scheduleForm.date,
      status: 'Scheduled',
      attachment: null,
      channels: scheduleForm.channels,
      delivery: { email: 0, sms: 0, push: 0 }
    };
    saveLogs([newLog, ...logs]);
    triggerToast(`⏰ Notice successfully scheduled for delivery on ${scheduleForm.date} at ${scheduleForm.time}.`);
    setIsScheduleOpen(false);
    setScheduleForm({ title: '', content: '', category: 'Academic Updates', department: 'All', audience: 'Students', date: '', time: '', channels: ['Email'] });
  };

  const handleSendEmergency = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const newId = `COM${String(Date.now()).slice(-3)}`;
    const newLog = {
      id: newId,
      title: `🚨 EMERGENCY: ${emergencyForm.title}`,
      category: 'Emergency Alerts',
      department: 'All',
      audience: 'Entire College',
      priority: 'Emergency',
      date: today,
      status: 'Sent',
      attachment: null,
      channels: emergencyForm.channels,
      delivery: { email: 99, sms: 98, push: 100 }
    };
    saveLogs([newLog, ...logs]);
    triggerToast('🚨 CRITICAL WARNING BROADCAST DISPATCHED VIA EMAIL, SMS & PUSH DIRECTLY!', 'warning');
    setIsEmergencyOpen(false);
    setEmergencyForm({ title: '', content: '', channels: ['Email', 'SMS', 'Push'] });
  };

  const handleCircularUpload = (e) => {
    e.preventDefault();
    if (!uploadForm.fileName) {
      alert('Please upload/attach a circular PDF first!');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const newId = `COM${String(Date.now()).slice(-3)}`;
    const newLog = {
      id: newId,
      title: uploadForm.title,
      category: 'Circulars',
      department: uploadForm.department,
      audience: uploadForm.audience === 'All' ? 'Entire College' : uploadForm.audience,
      priority: uploadForm.priority,
      date: today,
      status: 'Sent',
      attachment: uploadForm.fileName,
      channels: ['Email'],
      delivery: { email: 100, sms: 0, push: 0 }
    };
    saveLogs([newLog, ...logs]);
    triggerToast('✓ Signed PDF circular appended and uploaded to student/staff dashboards.');
    setIsUploadOpen(false);
    setUploadForm({ title: '', category: 'Circulars', department: 'All', audience: 'All', priority: 'High', fileName: '', fileLoaded: false });
  };

  const triggerMockFileUpload = () => {
    setUploadForm(prev => ({
      ...prev,
      fileName: `Circular_Ref_${String(Date.now()).slice(-5)}_Sign_Approved.pdf`,
      fileLoaded: true
    }));
    triggerToast('📎 Circular signed document attached successfully.');
  };

  const handleOpenDetails = (log) => {
    setActiveLog(log);
    setIsDetailsOpen(true);
  };

  // Close any open modal (used as backdrop click handler)
  const closeModal = () => {
    setIsCreateOpen(false);
    setIsScheduleOpen(false);
    setIsEmergencyOpen(false);
    setIsUploadOpen(false);
    setIsDetailsOpen(false);
    setEditTarget(null);
  };

  // Computed values
  const totalAnnouncements = logs.length;
  const today = new Date().toISOString().split('T')[0];
  const todayNotifications = logs.filter(l => l.date === today).length;
  const pendingCirculars = logs.filter(l => l.category === 'Circulars' && l.attachment).length;
  const deptNotices = logs.filter(l => l.department !== 'All').length;
  const unreadCount = logs.filter(l => l.status === 'Delivering' || l.status === 'Scheduled').length;

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const matchesSearch = 
      log.title.toLowerCase().includes(q) || 
      log.category.toLowerCase().includes(q) || 
      log.audience.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter;
    const matchesAudience = audienceFilter === 'All' || log.audience.includes(audienceFilter);
    return matchesSearch && matchesCategory && matchesAudience;
  });

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'Emergency': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      case 'High': return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
      case 'Medium': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'Low': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' };
      default: return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'Sent': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'Delivering': return { bg: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', class: 'animate-pulse' };
      case 'Scheduled': return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' };
      case 'Draft': return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280' };
      default: return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
    }
  };

  return (
    <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      
      {/* TOAST SYSTEM */}
      {toast && (
        <div className="animate-fade-in" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : toast.type === 'warning' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#ef4444' : '#3b82f6',
          border: `1.5px solid ${toast.type === 'success' ? '#10b981' : toast.type === 'warning' ? '#ef4444' : '#3b82f6'}`,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 1200,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Megaphone style={{ color: '#3730A5' }} size={28} /> Communication & Announcements Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Broadcasting circulars, critical SMS alerts, event schedules, and syllabus revisions across institutional divisions.
          </p>
        </div>

        {/* Security / Permissions bound badge */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5' }}>
          <CheckCircle size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Scope Rights</span>
            <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>College Broadcaster Clearance</strong>
          </div>
        </div>
      </div>

      {/* ACTION PANELS TRIGGER DOCK */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="glass-card flex justify-center items-center gap-2 p-4 cursor-pointer hover-scale"
          style={{ borderLeft: '4px solid var(--primary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--primary)', borderRadius: '12px', transition: 'all 0.3s ease' }}
        >
          <Megaphone className="text-[var(--primary)]" size={20} />
          <div style={{ textAlign: 'left' }}>
            <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-main)' }}>Create Announcement</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rich text notice feeds</span>
          </div>
        </button>

        <button 
          onClick={() => setIsScheduleOpen(true)}
          className="glass-card flex justify-center items-center gap-2 p-4 cursor-pointer hover-scale"
          style={{ borderLeft: '4px solid #6366F1', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid #6366F1', borderRadius: '12px', transition: 'all 0.3s ease' }}
        >
          <Clock className="text-[#6366F1]" size={20} />
          <div style={{ textAlign: 'left' }}>
            <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-main)' }}>Schedule Notification</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Set future calendar dates</span>
          </div>
        </button>

        <button 
          onClick={() => setIsEmergencyOpen(true)}
          className="glass-card flex justify-center items-center gap-2 p-4 cursor-pointer hover-scale"
          style={{ borderLeft: '4px solid #ef4444', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid #ef4444', borderRadius: '12px', transition: 'all 0.3s ease' }}
        >
          <AlertTriangle className="text-[#ef4444] animate-pulse" size={20} />
          <div style={{ textAlign: 'left' }}>
            <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-main)' }}>Send Emergency Alert</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SMS, Email & Push broadcast</span>
          </div>
        </button>

        <button 
          onClick={() => setIsUploadOpen(true)}
          className="glass-card flex justify-center items-center gap-2 p-4 cursor-pointer hover-scale"
          style={{ borderLeft: '4px solid #10b981', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid #10b981', borderRadius: '12px', transition: 'all 0.3s ease' }}
        >
          <UploadCloud className="text-[#10b981]" size={20} />
          <div style={{ textAlign: 'left' }}>
            <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-main)' }}>Upload Circular PDF</strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Upload signed bulletins</span>
          </div>
        </button>

      </div>

      {/* DASHBOARD METRICS CARDS (5 Cards) */}
      <div className="stats-grid mb-6 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'linear-gradient(135deg, var(--primary), #3b82f6)' }}><Megaphone size={18} /></div>
          <div className="stat-details">
            <h3>Total Announcements</h3>
            <p className="stat-value">{totalAnnouncements}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Communication Archive</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><Bell size={18} /></div>
          <div className="stat-details">
            <h3>Today Notifications</h3>
            <p className="stat-value">{todayNotifications}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--success)' }}>Dispatched since midnight</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><FileText size={18} /></div>
          <div className="stat-details">
            <h3>Pending Circulars</h3>
            <p className="stat-value">{pendingCirculars}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Signed document PDFs</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><Users size={18} /></div>
          <div className="stat-details">
            <h3>Department Notices</h3>
            <p className="stat-value">{deptNotices}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scoped to CSE/ECE/etc.</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><Clock size={18} /></div>
          <div className="stat-details">
            <h3>Unread / Scheduled</h3>
            <p className="stat-value">{unreadCount}</p>
            <span style={{ fontSize: '0.72rem', color: '#6366F1', fontWeight: 600 }}>Active delivering pipeline</span>
          </div>
        </div>

      </div>

      {/* CORE TIMELINE HISTORY WORKSPACE */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1.5rem' }}>
        
        {/* LEFT COMPONENT: DATABASE ARCHIVE TABLE */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', minWidth: 0, overflowX: 'auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              📋 Communication Transmission History Log
            </h3>

            {/* Filter Group */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'var(--bg-secondary)', 
                border: '1px solid var(--border-color)', 
                padding: '0.4rem 0.8rem', 
                borderRadius: '8px',
                fontSize: '0.8rem'
              }}>
                <Search size={14} style={{ color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search logs..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', width: '120px' }}
                />
              </div>

              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="All">All Categories</option>
                <option value="Announcements">Announcements</option>
                <option value="Circulars">Circulars</option>
                <option value="Emergency Alerts">Emergency Alerts</option>
                <option value="Meeting Notifications">Meetings</option>
                <option value="Department Notices">Dept Notices</option>
                <option value="Event Notifications">Events</option>
                <option value="Academic Updates">Academic Updates</option>
              </select>

              <select 
                value={audienceFilter} 
                onChange={e => setAudienceFilter(e.target.value)}
                style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
              >
                <option value="All">All Audiences</option>
                <option value="Students">Students</option>
                <option value="Staff">Staff</option>
                <option value="HODs">HODs</option>
                <option value="Parents">Parents</option>
                <option value="Entire College">Entire College</option>
              </select>

            </div>
          </div>

          {/* Table */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Audience / Dept</th>
                  <th>Priority</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No archived circulars matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    const prio = getPriorityBadgeStyle(log.priority);
                    const stat = getStatusBadgeStyle(log.status);
                    return (
                      <tr key={log.id} style={{ transition: 'background 0.2s ease' }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {log.category === 'Emergency Alerts' ? <AlertTriangle size={15} style={{ color: '#ef4444' }} /> :
                             log.category === 'Circulars' ? <FileText size={15} style={{ color: '#10b981' }} /> :
                             log.category === 'Meeting Notifications' ? <Users size={15} style={{ color: '#3b82f6' }} /> :
                             <Megaphone size={15} />}
                            <div>
                              <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{log.title}</strong>
                              {log.attachment && (
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>
                                  📎 PDF attached: {log.attachment}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{log.category}</td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>{log.audience}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dept: {log.department}</span>
                        </td>
                        <td>
                          <span style={{ backgroundColor: prio.bg, color: prio.color, padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {log.priority}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.date}</td>
                        <td>
                          <span className={stat.class} style={{ backgroundColor: stat.bg, color: stat.color, padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                            {log.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button 
                              onClick={() => handleOpenDetails(log)}
                              className="btn-icon" 
                              title="Monitor Delivery Rate"
                              style={{ display: 'inline-flex', padding: '4px', color: 'var(--primary)' }}
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => handleOpenEdit(log)}
                              className="btn-icon" 
                              title="Edit notice"
                              style={{ display: 'inline-flex', padding: '4px' }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="btn-icon btn-icon-danger" 
                              title="Delete Notice"
                              style={{ display: 'inline-flex', padding: '4px' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* RIGHT COMPONENT: SCHEDULED TIMELINE QUEUE & CLEARANCE bounds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Scheduled countdown alerts queue */}
          <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⏰ Scheduled Broadcast Queue
            </h3>

            {logs.filter(l => l.status === 'Scheduled').length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                No active announcements scheduled in the pipeline queue.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {logs.filter(l => l.status === 'Scheduled').map(s => (
                  <div key={s.id} style={{ background: 'var(--bg-secondary)', padding: '0.65rem', borderRadius: '8px', borderLeft: '3px solid #6366F1' }}>
                    <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.2rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.title.replace('[Scheduled] ', '')}
                    </h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      <span>Audience: <strong>{s.audience}</strong></span>
                      <span style={{ color: '#6366F1', fontWeight: 600 }}>On: {s.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* IT Bounds security restriction dock (permissions visual blocker) */}
          <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', border: '1.5px solid var(--border-color)', borderLeft: '3px solid var(--danger)' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              🔒 IT Operations Boundaries
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.75rem' }}>
              Principal scope authorizes communications & reporting. Core system configurations are restricted to prevent backend failures:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button 
                onClick={() => handleClearanceTrigger('Modifying master system security configurations')}
                className="glass-card" 
                style={{ padding: '5px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
              >
                ❌ Change System Security
              </button>
              <button 
                onClick={() => handleClearanceTrigger('Accessing root servers or database schemas')}
                className="glass-card" 
                style={{ padding: '5px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
              >
                🖥️ Manage Server & Database
              </button>
              <button 
                onClick={() => handleClearanceTrigger('Deleting administrative system users')}
                className="glass-card" 
                style={{ padding: '5px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
              >
                🗑️ Delete Administrative Users
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: CREATE/EDIT ANNOUNCEMENT */}
      {isCreateOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Announcement Circular' : 'Create Circular Announcement'}</h2>
              <button className="btn-icon" onClick={() => setIsCreateOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateAnnouncement} className="modal-form">
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Notice Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. End Semester Fees Schedule" 
                  value={announcementForm.title} 
                  onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Module / Category</label>
                  <select 
                    value={announcementForm.category}
                    onChange={e => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="Announcements">Announcements</option>
                    <option value="Circulars">Circulars</option>
                    <option value="Meeting Notifications">Meetings</option>
                    <option value="Department Notices">Department Notices</option>
                    <option value="Event Notifications">Event Notifications</option>
                    <option value="Academic Updates">Academic Updates</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Target Audience</label>
                  <select 
                    value={announcementForm.audience}
                    onChange={e => setAnnouncementForm({ ...announcementForm, audience: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="Entire College">Entire College</option>
                    <option value="HODs">HODs Only</option>
                    <option value="Staff">Staff / Faculty</option>
                    <option value="Students">Students Only</option>
                    <option value="Parents">Parents Only</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Department Scope</label>
                  <select 
                    value={announcementForm.department}
                    onChange={e => setAnnouncementForm({ ...announcementForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="All">All Departments</option>
                    <option value="CSE">CSE department</option>
                    <option value="ECE">ECE department</option>
                    <option value="EEE">EEE department</option>
                    <option value="MECH">MECH department</option>
                    <option value="MBA">MBA department</option>
                    <option value="BCA">BCA department</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Priority Level</label>
                  <select 
                    value={announcementForm.priority}
                    onChange={e => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Advanced triggers: Checkbox targeting channels */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Transmission Channels (Advanced targeting)</label>
                <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--bg-primary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={announcementForm.channels.includes('Email')}
                      onChange={(e) => {
                        const next = e.target.checked ? [...announcementForm.channels, 'Email'] : announcementForm.channels.filter(c => c !== 'Email');
                        setAnnouncementForm({ ...announcementForm, channels: next });
                      }}
                    /> <Mail size={13} style={{ color: '#3b82f6' }} /> Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={announcementForm.channels.includes('SMS')}
                      onChange={(e) => {
                        const next = e.target.checked ? [...announcementForm.channels, 'SMS'] : announcementForm.channels.filter(c => c !== 'SMS');
                        setAnnouncementForm({ ...announcementForm, channels: next });
                      }}
                    /> <MessageSquare size={13} style={{ color: '#10b981' }} /> SMS Alert
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={announcementForm.channels.includes('Push')}
                      onChange={(e) => {
                        const next = e.target.checked ? [...announcementForm.channels, 'Push'] : announcementForm.channels.filter(c => c !== 'Push');
                        setAnnouncementForm({ ...announcementForm, channels: next });
                      }}
                    /> <Bell size={13} style={{ color: '#6366F1' }} /> Push Notice
                  </label>
                </div>
              </div>

              {/* Rich text editor simulation */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Rich text message details *</label>
                
                {/* Simulated formatting bar */}
                <div style={{ display: 'flex', gap: '0.2rem', padding: '0.35rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderBottom: 'none', borderRadius: '8px 8px 0 0', flexWrap: 'wrap' }}>
                  <button type="button" style={{ padding: '2px 8px', fontSize: '0.7rem', fontWeight: 700, borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>B</button>
                  <button type="button" style={{ padding: '2px 8px', fontSize: '0.7rem', fontStyle: 'italic', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>I</button>
                  <button type="button" style={{ padding: '2px 8px', fontSize: '0.7rem', textDecoration: 'underline', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>U</button>
                  <span style={{ width: '1px', background: 'var(--border-color)', margin: '0 4px' }} />
                  <button type="button" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>Align Left</button>
                  <button type="button" style={{ padding: '2px 6px', fontSize: '0.65rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>Bullets</button>
                </div>

                <textarea 
                  required 
                  placeholder="Draft the details of the official announcement broadcast here..."
                  value={announcementForm.content}
                  onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  style={{ width: '100%', minHeight: '110px', padding: '0.55rem', borderRadius: '0 0 8px 8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, var(--primary), #3b82f6)' }}>
                  {editTarget ? 'Publish Updates' : 'Broadcast Announcement'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE NOTIFICATION */}
      {isScheduleOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="modal-header">
              <h2>Schedule Academic Broadcast</h2>
              <button className="btn-icon" onClick={() => setIsScheduleOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleScheduleNotice} className="modal-form">
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Notice Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Schedule Roster Launch" 
                  value={scheduleForm.title} 
                  onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Select Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={scheduleForm.date} 
                    onChange={e => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Select Time *</label>
                  <input 
                    type="time" 
                    required 
                    value={scheduleForm.time} 
                    onChange={e => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Target Wing</label>
                  <select 
                    value={scheduleForm.audience}
                    onChange={e => setScheduleForm({ ...scheduleForm, audience: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="Students">Students Only</option>
                    <option value="Staff">Faculty Staff</option>
                    <option value="HODs">HODs Only</option>
                    <option value="Parents">Parents Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Department</label>
                  <select 
                    value={scheduleForm.department}
                    onChange={e => setScheduleForm({ ...scheduleForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="All">All Departments</option>
                    <option value="CSE">CSE department</option>
                    <option value="ECE">ECE department</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsScheduleOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#6366F1' }}>Save & Schedule Notice</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EMERGENCY ALERT DOCK */}
      {isEmergencyOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--bg-secondary)', border: '2px solid #ef4444' }}>
            <div className="modal-header">
              <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle className="animate-bounce" size={22} /> Send Instant Emergency Alert
              </h2>
              <button className="btn-icon" onClick={() => setIsEmergencyOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSendEmergency} className="modal-form">
              
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '4px solid #ef4444', padding: '0.8rem', borderRadius: '8px', fontSize: '0.75rem', color: '#ef4444', lineHeight: '1.4', marginBottom: '1rem', fontWeight: 600 }}>
                ⚠️ WARNING: Dispatching an emergency alert forces red alert overlays on student, HOD & staff dashboards and immediately sends high-priority SMS alerts, push alerts, and direct emails. Use only for weather campus closures, administrative halts, or safety warnings.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Emergency Header Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Torrential Rain Forecast - Campus Off" 
                  value={emergencyForm.title} 
                  onChange={e => setEmergencyForm({ ...emergencyForm, title: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Broadcast Channels targeting (Emergency force)</label>
                <div style={{ display: 'flex', gap: '1.5rem', background: 'var(--bg-primary)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    <input type="checkbox" checked disabled /> <Mail size={13} style={{ color: '#ef4444' }} /> Force Email
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    <input type="checkbox" checked disabled /> <MessageSquare size={13} style={{ color: '#ef4444' }} /> Force SMS Alert
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    <input type="checkbox" checked disabled /> <Bell size={13} style={{ color: '#ef4444' }} /> Force Push Alert
                  </label>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Emergency Message Details *</label>
                <textarea 
                  required 
                  placeholder="Enter direct campus directive instructions..." 
                  value={emergencyForm.content} 
                  onChange={e => setEmergencyForm({ ...emergencyForm, content: e.target.value })}
                  style={{ width: '100%', minHeight: '100px', padding: '0.55rem', borderRadius: '8px', border: '1px solid #ef4444', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsEmergencyOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary animate-pulse" style={{ background: '#ef4444' }}>Send Emergency Broadcast</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CIRCULAR PDF UPLOADER */}
      {isUploadOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="modal-header">
              <h2>Upload Official Circular PDF</h2>
              <button className="btn-icon" onClick={() => setIsUploadOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCircularUpload} className="modal-form">
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Circular Bulletin Title *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. End Semester Fees Schedule" 
                  value={uploadForm.title} 
                  onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Target Wing</label>
                  <select 
                    value={uploadForm.audience} 
                    onChange={e => setUploadForm({ ...uploadForm, audience: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="All">Entire College</option>
                    <option value="HODs">HODs Only</option>
                    <option value="Staff">Faculty Staff</option>
                    <option value="Students">Students Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Department</label>
                  <select 
                    value={uploadForm.department} 
                    onChange={e => setUploadForm({ ...uploadForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="All">All Departments</option>
                    <option value="CSE">CSE department</option>
                    <option value="ECE">ECE department</option>
                  </select>
                </div>
              </div>

              {/* Drag and Drop pdf upload segment */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Attach Signed PDF Document *</label>
                <div 
                  onClick={triggerMockFileUpload}
                  style={{
                    border: `2px dashed ${uploadForm.fileLoaded ? '#10b981' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--bg-primary)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = uploadForm.fileLoaded ? '#10b981' : 'var(--border-color)'}
                >
                  <UploadCloud size={32} style={{ color: uploadForm.fileLoaded ? '#10b981' : 'var(--text-muted)' }} />
                  {uploadForm.fileLoaded ? (
                    <div>
                      <strong style={{ color: '#10b981', fontSize: '0.85rem', display: 'block' }}>✓ PDF Signed and Attached!</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{uploadForm.fileName} (182 KB)</span>
                    </div>
                  ) : (
                    <div>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.85rem', display: 'block' }}>Click to Browse Signed Bulletins</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Supports PDF uploads up to 10MB</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsUploadOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Upload Circular PDF</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELIVERY RATE MONITOR (Workflow History details popup) */}
      {isDetailsOpen && activeLog && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="modal-header">
              <div>
                <span style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                  ID: {activeLog.id} • {activeLog.category}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {activeLog.title}
                </h2>
              </div>
              <button className="btn-icon" onClick={() => setIsDetailsOpen(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
              
              {/* Transmission specs row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div>Target wing: <strong style={{ color: 'var(--text-main)', display: 'block' }}>{activeLog.audience}</strong></div>
                <div>Department: <strong style={{ color: 'var(--text-main)', display: 'block' }}>{activeLog.department}</strong></div>
                <div>Priority: <strong style={{ color: 'var(--text-main)', display: 'block' }}>{activeLog.priority}</strong></div>
                <div>Publish Date: <strong style={{ color: 'var(--text-main)', display: 'block' }}>{activeLog.date}</strong></div>
              </div>

              {/* Delivery rates meter chart (custom styling sliders) */}
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  📈 Channel Dispatch Delivery Success Rate
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  
                  {activeLog.channels.includes('Email') && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Mail size={13} className="text-[#3b82f6]" /> SMTP Email Server Delivery</span>
                        <strong>{activeLog.delivery.email}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${activeLog.delivery.email}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  )}

                  {activeLog.channels.includes('SMS') && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><MessageSquare size={13} className="text-[#10b981]" /> SMS Gateway Delivery</span>
                        <strong>{activeLog.delivery.sms}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${activeLog.delivery.sms}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  )}

                  {activeLog.channels.includes('Push') && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Bell size={13} className="text-[#6366F1]" /> Web Push Notification Dispatch</span>
                        <strong>{activeLog.delivery.push}%</strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${activeLog.delivery.push}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Delivery propagation workflow path (real timeline) */}
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                  🔄 Real-Time Notification Workflow Status
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.5rem', position: 'relative' }}>
                  
                  {/* Visual timeline bar */}
                  <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '15px', width: '2px', background: 'var(--border-color)' }}></div>
                  
                  <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>1</div>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>Notice Form Created</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Created by Principal ({userName}) and dispatched with {activeLog.priority} priority.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>2</div>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>Audience Targeting Scoped</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scoped to: {activeLog.audience} (Dept: {activeLog.department}). Security boundary confirmed.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>3</div>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>Transmitting Channels Dispatched</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Broadcast sent through active gateways: {activeLog.channels.join(', ')}.</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: activeLog.status === 'Scheduled' ? 'var(--border-color)' : '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>4</div>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', display: 'block' }}>Receivers Feeds Populated</strong>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {activeLog.status === 'Scheduled' ? 'Awaiting target schedule time trigger...' : `Notice board feed active. ${activeLog.audience} dashboard alerts populated.`}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button type="button" className="btn-primary w-full" onClick={() => setIsDetailsOpen(false)} style={{ background: 'var(--primary)' }}>
                Close Details Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IT Admin Clearance Safeguard Blocker dialog modal */}
      {showClearanceBlock && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1300 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '480px', margin: '0 1rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--danger)' }}>
            <ShieldAlert size={48} className="text-[#ef4444]" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Access Denied (Clearance Violation)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You attempted to perform: <strong style={{ color: 'var(--text-main)' }}>{blockedActionName}</strong>.<br />
              Principal administrative authorization is limited to institutional communication, broadcasting, and reporting feeds. Super Admin server console credentials are required.
            </p>

            <button 
              onClick={() => setShowClearanceBlock(false)} 
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
