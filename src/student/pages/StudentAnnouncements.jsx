import React, { useState, useEffect, useMemo } from 'react';
import { Megaphone, Calendar, User, Search, Tag, MessageSquare, ArrowRight, X, Clock, CheckCircle2 } from 'lucide-react';
import '../../pages/announcements/AnnouncementsManagement.css';

const DEFAULT_ANNOUNCEMENTS = [
  { id: 'ANN001', title: 'End Semester Fees Schedule & Hall Ticket Gate', content: 'All students are requested to clear their pending academic term fee dues on or before May 28th to generate hall tickets for the upcoming semester examinations.', targetAudience: 'Students', date: '2026-10-08', author: 'College Accounts Office', priority: 'High', category: 'Examinations' },
  { id: 'ANN002', title: 'Semester Curriculum & Laboratory Syllabus Freeze', content: 'Faculty staff must close active curriculum lectures and upload laboratory internals results by next Monday to the ERP portal before the academic audit.', targetAudience: 'All', date: '2026-10-05', author: 'Academic Dean', priority: 'Urgent', category: 'Academic' },
  { id: 'ANN003', title: 'Summer Campus Placement Drive 2026', content: 'Global tech corporations will host campus recruitment placement drives starting June 1st. Resume freeze date and eligibility verification deadline is May 25th.', targetAudience: 'All', date: '2026-10-02', author: 'Career & Placement Cell', priority: 'General', category: 'Placement' }
];

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [loading, setLoading] = useState(true);

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
    let allAnns = saved ? JSON.parse(saved) : DEFAULT_ANNOUNCEMENTS;
    
    // Filter for Students: 'All', 'All Roles', 'All Departments', and 'Students'
    const studentAnns = allAnns.filter(a => {
      const target = a.targetAudience || a.target || 'All';
      return (
        target === 'All' || 
        target === 'All Roles' || 
        target === 'All Departments' || 
        target.toLowerCase().includes('student')
      );
    });
    
    setAnnouncements(studentAnns.length > 0 ? studentAnns : DEFAULT_ANNOUNCEMENTS);
    setLoading(false);
  };

  const categories = ['All', 'Academic', 'Examinations', 'Placement', 'Curriculum'];

  const filtered = useMemo(() => {
    return announcements.filter(ann => {
      const cat = ann.category || 'Academic';
      const matchesCategory = selectedCategory === 'All' || cat === selectedCategory;
      const q = search.toLowerCase();
      const matchesSearch = 
        (ann.title || '').toLowerCase().includes(q) || 
        (ann.content || '').toLowerCase().includes(q) || 
        (ann.author || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [announcements, search, selectedCategory]);

  return (
    <div className="student-announcements animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Student Notice Board & Circulars
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Student Self-Service
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Stay informed with official campus notices, exam hall ticket alerts, and career placement news in real time.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Academic Session 2026-27 Active
          </span>
        </div>
      </div>

      {/* 4 Interactive KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Active Circulars</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {announcements.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Notices</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Campus-wide broadcasts</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Exam Directives</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {announcements.filter(a => (a.category || '').includes('Exam') || (a.title || '').includes('Exam') || (a.title || '').includes('Fee')).length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Alerts</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Syllabus & hall tickets</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Placement Drives</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>
            {announcements.filter(a => (a.category || '').includes('Placement') || (a.title || '').includes('Placement')).length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>Drives</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Campus recruitment feeds</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Real-Time Sync</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b45309', margin: '4px 0 2px' }}>Live</div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Updated by Admin & HODs</div>
        </div>
      </div>

      {/* FILTER CONTROLS & SEARCH */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        
        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedCategory === cat ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: selectedCategory === cat ? '#2563eb' : '#f8fafc',
                color: selectedCategory === cat ? '#ffffff' : '#475569'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', minWidth: '260px' }}>
          <Search size={15} color="#64748b" />
          <input
            type="text"
            placeholder="Search circulars..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', width: '100%', color: '#0f172a' }}
          />
        </div>
      </div>

      {/* CARDS GRID VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '180px', borderRadius: '16px' }}></div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
            <Megaphone size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No announcements found</div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Check back soon for new campus circulars.</p>
          </div>
        ) : (
          filtered.map((ann, idx) => {
            const cat = ann.category || 'Academic';
            return (
              <div
                key={ann.id || idx}
                onClick={() => setSelectedNotice(ann)}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    {cat}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {ann.date}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                    {ann.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ann.content}
                  </p>
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                    By {ann.author || 'College Office'}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Read Full Circular <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* NOTICE READER MODAL */}
      {selectedNotice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedNotice(null)}>
          <div style={{ background: '#ffffff', borderRadius: '18px', width: '100%', maxWidth: '560px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                  {selectedNotice.category || 'Academic'}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px' }}>
                  {selectedNotice.title}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Published on {selectedNotice.date} • By <strong>{selectedNotice.author || 'College Administration'}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedNotice(null)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', fontSize: '0.9rem', lineHeight: 1.6, color: '#334155', marginBottom: '20px' }}>
              {selectedNotice.content}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedNotice(null)}
                style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 800, cursor: 'pointer', fontSize: '0.86rem', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
              >
                Close Circular
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentAnnouncements;
