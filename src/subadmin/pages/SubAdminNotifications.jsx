import React, { useState, useEffect } from 'react';
import { Plus, Search, Bell, Mail, MessageSquare, Smartphone, AlertTriangle, CheckCircle, Clock, Calendar, Send, X } from 'lucide-react';
import './SubAdminNotifications.css';

const NOTIFICATION_MODULES = [
  'Exam Alerts', 'Attendance Alerts', 'Fee Due Alerts', 
  'Leave Approval Alerts', 'Result Published Alerts', 
  'Holiday Announcements', 'Placement Notifications'
];

const TARGET_AUDIENCES = [
  'Entire College', 'Students', 'Staff', 'HODs', 'Parents', 
  'Only CSE Dept', 'Only ECE Dept', 'Only Mech Dept'
];

const MOCK_HISTORY = [
  { id: 'NOTIF001', title: 'End Semester Exam Schedule Released', module: 'Exam Alerts', target: 'Students', type: 'Standard', methods: ['email', 'app'], status: 'Sent', date: '2026-05-25 10:00 AM' },
  { id: 'NOTIF002', title: 'Campus Closed due to Heavy Rain', module: 'Holiday Announcements', target: 'Entire College', type: 'Emergency', methods: ['email', 'sms', 'app'], status: 'Sent', date: '2026-05-24 06:30 AM' },
  { id: 'NOTIF003', title: 'Pending Fee Reminder (Final Notice)', module: 'Fee Due Alerts', target: 'Parents', type: 'Standard', methods: ['email', 'sms'], status: 'Sent', date: '2026-05-20 02:15 PM' },
  { id: 'NOTIF004', title: 'Google Campus Placement Drive', module: 'Placement Notifications', target: 'Only CSE Dept', type: 'Standard', methods: ['email', 'app'], status: 'Scheduled', date: '2026-06-01 09:00 AM' },
];

const SubAdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    module: 'Exam Alerts',
    target: 'Entire College',
    isEmergency: false,
    sendMethod: 'instant',
    scheduleDate: '',
    methods: { email: true, sms: false, app: true }
  });

  useEffect(() => {
    // Simulate fetch
    setTimeout(() => {
      setNotifications([]);
      setLoading(false);
    }, 400);
  }, []);

  const handleCheckbox = (key) => {
    setForm(prev => ({ ...prev, methods: { ...prev.methods, [key]: !prev.methods[key] } }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.methods.email && !form.methods.sms && !form.methods.app) {
      alert("Please select at least one delivery method (Email, SMS, or In-App).");
      return;
    }

    const now = new Date();
    let dateStr = now.toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    
    let finalStatus = 'Sent';
    if (form.sendMethod === 'schedule') {
      if (!form.scheduleDate) { alert("Please select a schedule date & time."); return; }
      finalStatus = 'Scheduled';
      dateStr = new Date(form.scheduleDate).toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    }

    const selectedMethods = Object.keys(form.methods).filter(k => form.methods[k]);

    const newNotif = {
      id: `NOTIF00${notifications.length + 5}`,
      title: form.title,
      module: form.module,
      target: form.target,
      type: form.isEmergency ? 'Emergency' : 'Standard',
      methods: selectedMethods,
      status: finalStatus,
      date: dateStr
    };

    setNotifications([newNotif, ...notifications]);
    setModalOpen(false);
  };

  const filtered = notifications.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.module.toLowerCase().includes(search.toLowerCase())
  );

  const getStats = () => {
    const sent = notifications.filter(n => n.status === 'Sent').length;
    const sched = notifications.filter(n => n.status === 'Scheduled').length;
    const fail = notifications.filter(n => n.status === 'Failed').length;
    const today = notifications.filter(n => n.date.includes(new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'2-digit', year:'numeric'}))).length;
    const dept = notifications.filter(n => n.target.includes('Dept')).length;
    return { sent, sched, fail, today, dept };
  };
  const stats = getStats();

  return (
    <div className="notifications-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Advanced Notifications System</h1>
          <p className="text-muted">Broadcast instant or scheduled alerts via Email, SMS, and In-App channels.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={() => {
          setForm({ title: '', message: '', module: 'Exam Alerts', target: 'Entire College', isEmergency: false, sendMethod: 'instant', scheduleDate: '', methods: { email: true, sms: false, app: true } });
          setModalOpen(true);
        }}>
          <Send size={18} /> Send Notification
        </button>
      </div>

      {/* Summary Cards */}
      <div className="notif-summary-row">
        <div className="notif-summary-card glass-card blue">
          <span className="notif-label">Total Sent</span>
          <span className="notif-value">{stats.sent}</span>
        </div>
        <div className="notif-summary-card glass-card yellow">
          <span className="notif-label">Scheduled / Pending</span>
          <span className="notif-value">{stats.sched}</span>
        </div>
        <div className="notif-summary-card glass-card red">
          <span className="notif-label">Failed Deliveries</span>
          <span className="notif-value">{stats.fail}</span>
        </div>
        <div className="notif-summary-card glass-card green">
          <span className="notif-label">Today's Alerts</span>
          <span className="notif-value">{stats.today}</span>
        </div>
        <div className="notif-summary-card glass-card purple">
          <span className="notif-label">Dept-wise Alerts</span>
          <span className="notif-value">{stats.dept}</span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '0.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input type="text" placeholder="Search notification history..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Notification Title</th>
                <th>Module & Target</th>
                <th>Priority</th>
                <th>Channels</th>
                <th>Status</th>
                <th>Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>)}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>No notifications found in history.</td>
                </tr>
              ) : (
                filtered.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <div className="font-semibold">{n.title}</div>
                      <div className="text-xs text-muted">ID: {n.id}</div>
                    </td>
                    <td>
                      <div className="text-sm font-semibold">{n.module}</div>
                      <div className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Users size={12} /> {n.target}
                      </div>
                    </td>
                    <td>
                      <span className={`notif-badge ${n.type === 'Emergency' ? 'emergency' : 'standard'}`}>
                        {n.type === 'Emergency' ? <><AlertTriangle size={12} style={{ display: 'inline', marginRight: '4px' }}/> Emergency</> : 'Standard'}
                      </span>
                    </td>
                    <td>
                      <div className="delivery-methods">
                        <div className={`delivery-icon ${n.methods.includes('email') ? 'active-email' : ''}`} title="Email"><Mail size={12}/></div>
                        <div className={`delivery-icon ${n.methods.includes('sms') ? 'active-sms' : ''}`} title="SMS"><Smartphone size={12}/></div>
                        <div className={`delivery-icon ${n.methods.includes('app') ? 'active-app' : ''}`} title="In-App"><Bell size={12}/></div>
                      </div>
                    </td>
                    <td>
                      <div className={`status-${n.status.toLowerCase()}`} style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        <span className="status-dot"></span>{n.status}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                        {n.status === 'Scheduled' ? <Clock size={13} className="text-muted"/> : <Calendar size={13} className="text-muted"/>}
                        {n.date}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW NOTIFICATION MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2>Broadcast Notification</h2>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label>Notification Subject / Title *</label>
                  <input required placeholder="e.g. Mandatory Hall Ticket Download" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                
                <div className="form-group">
                  <label>Module Type</label>
                  <select value={form.module} onChange={e => setForm({...form, module: e.target.value})}>
                    {NOTIFICATION_MODULES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Audience</label>
                  <select value={form.target} onChange={e => setForm({...form, target: e.target.value})}>
                    {TARGET_AUDIENCES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="form-group col-span-2">
                  <label>Message Content *</label>
                  <textarea required placeholder="Enter the exact message to be delivered..." style={{ minHeight: '80px', resize: 'vertical' }} value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
                </div>

                <div className="form-group col-span-2">
                  <label style={{ marginBottom: '8px' }}>Delivery Channels (Select at least one)</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label"><input type="checkbox" checked={form.methods.email} onChange={()=>handleCheckbox('email')} /> <Mail size={16}/> Email Notification</label>
                    <label className="checkbox-label"><input type="checkbox" checked={form.methods.sms} onChange={()=>handleCheckbox('sms')} /> <Smartphone size={16}/> SMS Alert</label>
                    <label className="checkbox-label"><input type="checkbox" checked={form.methods.app} onChange={()=>handleCheckbox('app')} /> <Bell size={16}/> In-App Push</label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Priority Level</label>
                  <label className="emergency-toggle">
                    <input type="checkbox" checked={form.isEmergency} onChange={e => setForm({...form, isEmergency: e.target.checked})} />
                    <AlertTriangle size={16} /> Mark as Emergency Alert
                  </label>
                </div>

                <div className="form-group">
                  <label>Sending Option</label>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer' }}>
                      <input type="radio" name="sendMethod" checked={form.sendMethod === 'instant'} onChange={() => setForm({...form, sendMethod: 'instant'})} />
                      Instant
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:'0.4rem', cursor:'pointer' }}>
                      <input type="radio" name="sendMethod" checked={form.sendMethod === 'schedule'} onChange={() => setForm({...form, sendMethod: 'schedule'})} />
                      Schedule Later
                    </label>
                  </div>
                  {form.sendMethod === 'schedule' && (
                    <input type="datetime-local" required className="mt-2" value={form.scheduleDate} onChange={e => setForm({...form, scheduleDate: e.target.value})} style={{ marginTop: '0.5rem' }}/>
                  )}
                </div>
              </div>
              
              <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className={`btn-primary ${form.isEmergency ? 'bg-danger' : ''}`} style={form.isEmergency ? {background: '#ef4444', borderColor: '#ef4444'} : {}}>
                  {form.sendMethod === 'schedule' ? <><Clock size={16}/> Schedule Alert</> : <><Send size={16}/> Send Now</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple User Icon fallback since it wasn't explicitly imported
const Users = ({ size, style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

export default SubAdminNotifications;
