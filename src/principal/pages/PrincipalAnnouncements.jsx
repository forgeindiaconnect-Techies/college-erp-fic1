import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Search, Edit2, Trash2, X, 
  Calendar, Tag, User, MessageSquare, AlertCircle, CheckCircle,
  Building2, GraduationCap, Users, CalendarCheck, ClipboardList, Briefcase
} from 'lucide-react';
import '../../pages/Dashboard.css';

const DEFAULT_ANNOUNCEMENTS = [
  { id: 'ANN001', title: 'End Semester Fees Schedule', content: 'All students are requested to clear their pending academic term fee dues on or before May 28th to generate hall tickets.', targetAudience: 'Students', date: '2026-05-22', author: 'College Accounts' },
  { id: 'ANN002', title: 'Semester Syllabus Freeze', content: 'Faculty staff must close active curriculum lectures and upload laboratory internals results by next Monday.', targetAudience: 'Staff', date: '2026-05-21', author: 'Academic Dean' },
  { id: 'ANN003', title: 'Summer Internship Drive 2026', content: 'Global tech corporations will host campus recruitment placement drives starting June 1st. Resume freeze date is May 25th.', targetAudience: 'All', date: '2026-05-20', author: 'Placement Cell' }
];

export default function PrincipalAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Principal');

  // Modal & Edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', targetAudience: 'All', author: 'Principal Office' });

  // Compile / Success notification toast
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Load Principal Name
    const sessionData = sessionStorage.getItem('principal_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        setUserName(parsed.name || 'Principal');
        setForm(prev => ({ ...prev, author: `Principal ${parsed.name || ''}` }));
      } catch (e) {
        console.error('Error parsing session data', e);
      }
    }
    fetchAnnouncements();
  }, []);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAnnouncements = () => {
    setLoading(true);
    const saved = localStorage.getItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (saved) {
      setAnnouncements(JSON.parse(saved));
    } else {
      localStorage.setItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
    }
    setLoading(false);
  };

  const saveAnnouncements = (newList) => {
    setAnnouncements(newList);
    localStorage.setItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(newList));
  };

  const openAdd = () => {
    setForm({ 
      title: '', 
      content: '', 
      targetAudience: 'All', 
      author: userName.includes('Principal') ? userName : `Principal ${userName}`
    });
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (ann) => {
    setForm({ title: ann.title, content: ann.content, targetAudience: ann.targetAudience, author: ann.author });
    setEditTarget(ann.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    if (editTarget) {
      const updated = announcements.map(ann => ann.id === editTarget ? { ...ann, ...form, date: today } : ann);
      saveAnnouncements(updated);
      showToast('✓ Announcement updated successfully on the notice board.');
    } else {
      const newId = `ANN${String(Date.now()).slice(-6)}`;
      const newAnn = { id: newId, ...form, date: today };
      saveAnnouncements([newAnn, ...announcements]);
      showToast('✓ Official broadcast successfully published across targeted divisions!');
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this announcement notice from the campus board?')) {
      const updated = announcements.filter(ann => ann.id !== id);
      saveAnnouncements(updated);
      showToast('🗑️ Announcement has been removed from the campus notice board.', 'info');
    }
  };

  const filtered = announcements.filter(ann => {
    const q = search.toLowerCase();
    const matchesSearch = 
      ann.title.toLowerCase().includes(q) || 
      ann.content.toLowerCase().includes(q) || 
      ann.author.toLowerCase().includes(q);
    const matchesFilter = targetFilter === 'All' || ann.targetAudience === targetFilter;
    return matchesSearch && matchesFilter;
  });

  // Category counts
  const totalNotices = announcements.length;
  const targetHODs = announcements.filter(a => a.targetAudience === 'HODs' || a.targetAudience === 'All').length;
  const targetStaff = announcements.filter(a => a.targetAudience === 'Staff' || a.targetAudience === 'All').length;
  const targetStudents = announcements.filter(a => a.targetAudience === 'Students' || a.targetAudience === 'All').length;
  const targetParents = announcements.filter(a => a.targetAudience === 'Parents' || a.targetAudience === 'All').length;
  const targetAccounts = announcements.filter(a => a.targetAudience === 'Accounts' || a.targetAudience === 'All').length;

  const getAudienceBadgeStyle = (audience) => {
    switch (audience) {
      case 'All': return { bg: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', label: 'All Roles' };
      case 'HODs': return { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', label: 'HODs Only' };
      case 'Staff': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', label: 'Staff Faculty' };
      case 'Students': return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Students' };
      case 'Parents': return { bg: 'rgba(249, 115, 22, 0.1)', color: '#f97316', label: 'Parents' };
      case 'Accounts': return { bg: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', label: 'Accounts Wing' };
      default: return { bg: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', label: audience };
    }
  };

  return (
    <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Megaphone style={{ color: '#3730A5' }} className="animate-pulse" size={28} /> Communication & Notice Board
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Broadcast institutional decisions, syllabus directives, and official announcements to target wings.
          </p>
        </div>

        <button 
          className="btn-primary shadow-glow animate-fade-in" 
          onClick={openAdd}
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            padding: '0.65rem 1.25rem', 
            borderRadius: '10px', 
            fontSize: '0.88rem', 
            background: 'linear-gradient(135deg, var(--primary), #4F46E5)',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            border: 'none',
            color: 'white',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Plus size={18} /> Broadcast New Notice
        </button>
      </div>

      {/* TOAST TOAST NOTIFICATIONS */}
      {notification && (
        <div className="animate-fade-in" style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: notification.type === 'success' ? '#10b981' : '#3b82f6',
          border: `1.5px solid ${notification.type === 'success' ? '#10b981' : '#3b82f6'}`,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 1200,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* TIMELINE METRIC GRID (6 cards) */}
      <div className="stats-grid mb-6 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'linear-gradient(135deg, var(--primary), #3b82f6)' }}><Megaphone size={18} /></div>
          <div className="stat-details">
            <h3>Active Broadcasts</h3>
            <p className="stat-value">{totalNotices}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cross-campus feeds</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'linear-gradient(135deg, #6366f1, var(--primary))' }}><Building2 size={18} /></div>
          <div className="stat-details">
            <h3>HOD Bulletins</h3>
            <p className="stat-value">{targetHODs}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Directives dispatched</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><GraduationCap size={18} /></div>
          <div className="stat-details">
            <h3>Staff Directives</h3>
            <p className="stat-value">{targetStaff}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Academic directives</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><Users size={18} /></div>
          <div className="stat-details">
            <h3>Student Notices</h3>
            <p className="stat-value">{targetStudents}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Campus board updates</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><CalendarCheck size={18} /></div>
          <div className="stat-details">
            <h3>Parent Feeds</h3>
            <p className="stat-value">{targetParents}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Progress / schedule logs</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><ClipboardList size={18} /></div>
          <div className="stat-details">
            <h3>Accounts Alerts</h3>
            <p className="stat-value">{targetAccounts}</p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Term fee circulars</span>
          </div>
        </div>

      </div>

      {/* NOTICE BOARD WORKSPACE */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        
        {/* Search & Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--bg-secondary)', 
            border: '1px solid var(--border-color)', 
            padding: '0.5rem 1rem', 
            borderRadius: '10px', 
            width: '100%', 
            maxWidth: '450px' 
          }}>
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search published notice titles, content snippets, or creators..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Audience:</label>
            <select 
              value={targetFilter} 
              onChange={e => setTargetFilter(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
            >
              <option value="All">All Audiences</option>
              <option value="HODs">HODs Only</option>
              <option value="Staff">Faculty Staff</option>
              <option value="Students">Students Only</option>
              <option value="Parents">Parents Only</option>
              <option value="Accounts">Accounts Division</option>
            </select>
          </div>

        </div>

        {/* FEED SECTION */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '12px', width: '100%' }}></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
            <Megaphone size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text-main)', fontWeight: 700 }}>No Notice Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>Modify your query terms or choose a different targeting filter audience.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filtered.map((ann, idx) => {
              const badge = getAudienceBadgeStyle(ann.targetAudience);
              return (
                <div 
                  key={ann.id} 
                  className="glass-card animate-fade-in" 
                  style={{ 
                    padding: '1.5rem', 
                    borderRadius: '14px', 
                    border: '1px solid var(--border-color)',
                    borderLeft: `5px solid ${badge.color}`,
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    position: 'relative'
                  }}
                >
                  
                  {/* Top segment */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        backgroundColor: badge.bg, 
                        color: badge.color, 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase' 
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={12} /> {ann.date}
                      </span>
                    </div>

                    {/* Quick CRUD actions for Principal */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button 
                        onClick={() => openEdit(ann)} 
                        title="Edit notice details"
                        style={{ padding: '5px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--primary)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDelete(ann.id)} 
                        title="Delete notice"
                        style={{ padding: '5px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Body Title & Text */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {ann.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                    {ann.content}
                  </p>

                  {/* Author / Signature Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <User size={13} className="text-primary" />
                      <span>Published by: <strong style={{ color: 'var(--text-main)' }}>{ann.author}</strong></span>
                    </div>
                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>ID: {ann.id}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* BROADCAST MODAL POPUP */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '1rem'
        }} onClick={closeModal}>
          
          <div 
            className="glass-card animate-fade-in" 
            style={{ 
              width: '100%', 
              maxWidth: '560px', 
              borderRadius: '16px', 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)',
              padding: '2rem',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            
            <button 
              onClick={closeModal} 
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Megaphone size={20} />
              {editTarget ? 'Edit Campus Notice' : 'Broadcast Official Notice'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Dispatch official circulars immediately across selected institutional dashboards.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Notice Title *
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. End Semester Fees Schedule" 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Target Audience
                  </label>
                  <select 
                    value={form.targetAudience} 
                    onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', fontWeight: 600 }}
                  >
                    <option value="All">All Roles / Public</option>
                    <option value="HODs">HODs Only</option>
                    <option value="Staff">Faculty Staff</option>
                    <option value="Students">Students Only</option>
                    <option value="Parents">Parents Only</option>
                    <option value="Accounts">Accounts Division</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Author Signature *
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Principal Office" 
                    value={form.author} 
                    onChange={e => setForm({ ...form, author: e.target.value })} 
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Notice Content Details *
                </label>
                <textarea 
                  required 
                  placeholder="Enter the official notification details to render on target feeds..." 
                  value={form.content} 
                  onChange={e => setForm({ ...form, content: e.target.value })} 
                  style={{ width: '100%', minHeight: '120px', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="btn-ghost"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ 
                    padding: '0.6rem 1.5rem', 
                    borderRadius: '8px', 
                    background: 'linear-gradient(135deg, var(--primary), #3b82f6)', 
                    border: 'none', 
                    color: 'white', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)' 
                  }}
                >
                  {editTarget ? 'Save Changes' : 'Broadcast Notice'}
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
