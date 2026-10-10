import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Megaphone, Calendar, Tag, User, MessageSquare, Clock, CheckCircle2, ShieldCheck } from 'lucide-react';
import './AnnouncementsManagement.css';

const DEFAULT_ANNOUNCEMENTS = [
  { id: 'ANN001', title: 'End Semester Fees Schedule & Hall Ticket Gate', content: 'All students are requested to clear their pending academic term fee dues on or before May 28th to generate hall tickets for the upcoming semester examinations.', targetAudience: 'Students', date: '2026-10-08', author: 'College Accounts Office', priority: 'High', category: 'Examinations' },
  { id: 'ANN002', title: 'Semester Curriculum & Laboratory Syllabus Freeze', content: 'Faculty staff must close active curriculum lectures and upload laboratory internals results by next Monday to the ERP portal before the academic audit.', targetAudience: 'Staff', date: '2026-10-05', author: 'Academic Dean', priority: 'Urgent', category: 'Academic' },
  { id: 'ANN003', title: 'Summer Campus Placement Drive 2026', content: 'Global tech corporations will host campus recruitment placement drives starting June 1st. Resume freeze date and eligibility verification deadline is May 25th.', targetAudience: 'All', date: '2026-10-02', author: 'Career & Placement Cell', priority: 'General', category: 'Placement' },
  { id: 'ANN004', title: 'HOD Academic Review & Department Curriculum Directives', content: 'All Department Heads are instructed to submit the final faculty workload distribution matrix and lab infrastructure readiness reports.', targetAudience: 'HODs', date: '2026-09-28', author: 'Principal Office', priority: 'High', category: 'Curriculum' }
];

const AnnouncementsManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', targetAudience: 'All', author: 'Super Admin' });

  useEffect(() => {
    fetchAnnouncements();
    window.addEventListener('storage', fetchAnnouncements);
    window.addEventListener('erp_announcement_updated', fetchAnnouncements);
    return () => {
      window.removeEventListener('storage', fetchAnnouncements);
      window.removeEventListener('erp_announcement_updated', fetchAnnouncements);
    };
  }, []);

  const fetchAnnouncements = () => {
    setLoading(true);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_announcements_${tenantId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnnouncements(parsed.length > 0 ? parsed : DEFAULT_ANNOUNCEMENTS);
      } catch (e) {
        setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      }
    } else {
      localStorage.setItem(`erp_announcements_${tenantId}`, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
    }
    setLoading(false);
  };

  const saveAnnouncements = (newList) => {
    setAnnouncements(newList);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    localStorage.setItem(`erp_announcements_${tenantId}`, JSON.stringify(newList));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('erp_announcement_updated'));
  };

  const openAdd = () => {
    setForm({ title: '', content: '', targetAudience: 'All', author: 'Super Admin' });
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (ann) => {
    setForm({ title: ann.title, content: ann.content, targetAudience: ann.targetAudience || 'All', author: ann.author || 'Admin Office' });
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
    } else {
      const newId = `ANN${String(Date.now()).slice(-5)}`;
      const newAnn = { id: newId, ...form, date: today };
      saveAnnouncements([newAnn, ...announcements]);
    }
    closeModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this announcement notice from the campus board?')) {
      const updated = announcements.filter(ann => ann.id !== id);
      saveAnnouncements(updated);
    }
  };

  const filtered = announcements.filter(ann => {
    const q = search.toLowerCase();
    const matchesSearch = (ann.title || '').toLowerCase().includes(q) || (ann.content || '').toLowerCase().includes(q) || (ann.author || '').toLowerCase().includes(q);
    const target = ann.targetAudience || ann.target || 'All';
    const matchesFilter = targetFilter === 'All' || target === targetFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="announcements-management animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Campus Notice Board & Circulars
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Central HRMS Admin
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Broadcast official notifications, academic directives, and institutional news across all portals in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Live Real-Time Sync Active
          </span>
          <button
            onClick={openAdd}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
            }}
          >
            <Plus size={17} /> Publish Notice
          </button>
        </div>
      </div>

      {/* 4 Interactive KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Active Circulars</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {announcements.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Bulletins</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Total published campus notices</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Student Feeds</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {announcements.filter(a => (a.targetAudience || a.target || 'All') === 'Students' || (a.targetAudience || a.target || 'All') === 'All').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Notices</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Visible on student board</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Faculty Directives</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>
            {announcements.filter(a => (a.targetAudience || a.target || 'All') === 'Staff' || (a.targetAudience || a.target || 'All') === 'All').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>Notices</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Routed to staff members</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>HOD Circulars</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>
            {announcements.filter(a => (a.targetAudience || a.target || 'All') === 'HODs' || (a.targetAudience || a.target || 'All') === 'All').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d97706' }}>Notices</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Department head directives</div>
        </div>
      </div>

      {/* Main Container: Search & Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Filter controls row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '320px' }}>
            <Search size={16} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by title, content snippet, or author..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem', color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Audience Scope:</label>
            <select
              value={targetFilter}
              onChange={e => setTargetFilter(e.target.value)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}
            >
              <option value="All">All Audiences</option>
              <option value="Students">Students Only</option>
              <option value="Staff">Faculty Staff Only</option>
              <option value="HODs">HODs Only</option>
            </select>
          </div>
        </div>

        {/* Real-time ERP Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Notice Title</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Target Audience</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Author / Division</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Publish Date</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Content Preview</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '12px' }}><div className="skeleton" style={{ height: '32px', borderRadius: '8px' }}></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Megaphone size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No announcements found</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Published circulars will appear here across all targeted feeds.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((ann) => {
                  const target = ann.targetAudience || ann.target || 'All';
                  return (
                    <tr key={ann.id} style={{ background: '#f8fafc', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Megaphone size={16} color="#2563eb" />
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{ann.title}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: target === 'Students' ? '#dbeafe' : (target === 'Staff' ? '#e0e7ff' : (target === 'HODs' ? '#f3e8ff' : '#ecfdf5')),
                          color: target === 'Students' ? '#1e40af' : (target === 'Staff' ? '#3730a3' : (target === 'HODs' ? '#6b21a8' : '#047857')),
                          border: `1px solid ${target === 'Students' ? '#bfdbfe' : (target === 'Staff' ? '#c7d2fe' : (target === 'HODs' ? '#e9d5ff' : '#a7f3d0'))}`
                        }}>
                          {target}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={13} color="#64748b" />
                          <span>{ann.author}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#64748b' }}>
                          <Calendar size={13} color="#64748b" />
                          <span>{ann.date}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', maxWidth: '260px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ann.content}>
                          <MessageSquare size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {ann.content}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => openEdit(ann)}
                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                            title="Edit Notice"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(ann.id)}
                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer' }}
                            title="Delete Notice"
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

      {/* Modern High-End ERP Glassmorphism Modal for Publishing Notice */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '540px', borderRadius: '18px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#2563eb" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {editTarget ? 'Edit Campus Notice' : 'Publish New Circular'}
                </h2>
              </div>
              <button onClick={closeModal} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              Broadcast official circulars across student, faculty, and HOD dashboards in real time.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Notice Headline *</label>
                <input
                  required
                  placeholder="e.g. End Semester Fees Schedule & Hall Ticket Gate"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Target Audience</label>
                  <select
                    value={form.targetAudience}
                    onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', background: '#ffffff', color: '#0f172a' }}
                  >
                    <option value="All">All Roles / Public</option>
                    <option value="Students">Students Only</option>
                    <option value="Staff">Faculty Staff Only</option>
                    <option value="HODs">HODs Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Author / Office *</label>
                  <input
                    required
                    placeholder="e.g. College Accounts Office"
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Notice Details *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Enter full notice statement, details, and deadlines..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                  {editTarget ? 'Publish Update' : 'Broadcast Notice'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsManagement;
