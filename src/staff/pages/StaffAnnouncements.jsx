import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, Calendar, User, Search, Tag, MessageSquare,
  Plus, Filter, Bell, AlertCircle, Bookmark, CheckCircle2,
  FileText, ArrowRight, Eye, X, Send, Sparkles
} from 'lucide-react';
import { getNotifications, createNotification } from '../../api/index';
import './StaffDashboard.css';

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'ANN001',
    title: 'Mid-Semester Continuous Assessment (CIA-2) Schedule',
    content: 'All faculty members are requested to complete CIA-2 evaluations and finalize internal marks uploads on the ERP portal before the upcoming academic audit.',
    targetAudience: 'Only Staff',
    category: 'Academic',
    priority: 'Urgent',
    date: '2026-10-02',
    author: 'Dean of Academics'
  },
  {
    id: 'ANN002',
    title: 'Semester Curriculum & Laboratory Syllabus Freeze',
    content: 'The end-term curriculum coverage review meeting is scheduled for next Monday in the Senate Hall. All department course coordinators must attend with lesson completion reports.',
    targetAudience: 'All Departments',
    category: 'Curriculum',
    priority: 'High',
    date: '2026-10-01',
    author: 'Principal Office'
  },
  {
    id: 'ANN003',
    title: 'Campus Placement Drive & Resume Verification',
    content: 'Tier-1 technology corporations will initiate pre-placement talks and campus coding rounds starting next week. Faculty mentors are requested to verify student eligibility credentials.',
    targetAudience: 'All Departments',
    category: 'Placement',
    priority: 'General',
    date: '2026-09-29',
    author: 'Career Guidance & Placement Cell'
  },
  {
    id: 'ANN004',
    title: 'Central Library National Research Journals Access',
    content: 'Subscription to IEEE, ACM, and Elsevier digital repositories has been renewed for the current academic session. Faculty can access international papers via their institutional email.',
    targetAudience: 'Only Staff',
    category: 'Research',
    priority: 'General',
    date: '2026-09-28',
    author: 'Chief Librarian'
  }
];

const StaffAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', targetAudience: 'All Departments', category: 'Academic', priority: 'General' });
  const [createSuccess, setCreateSuccess] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await getNotifications().catch(() => ({ data: [] }));
      const backendNotifs = Array.isArray(res?.data) ? res.data : [];

      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const saved = localStorage.getItem(`erp_announcements_${tenantId}`);
      let localList = saved ? JSON.parse(saved) : [];

      // Merge backend, local, and defaults
      const merged = [...backendNotifs, ...localList, ...DEFAULT_ANNOUNCEMENTS];
      const unique = [];
      const seenTitles = new Set();
      merged.forEach(item => {
        if (item && item.title && !seenTitles.has(item.title.trim())) {
          seenTitles.add(item.title.trim());
          unique.push({
            id: item._id || item.id || `ann_${unique.length}`,
            title: item.title,
            content: item.content || item.message || item.description,
            targetAudience: item.targetAudience || 'All Departments',
            category: item.category || 'Academic',
            priority: item.priority || 'General',
            date: item.date || item.createdAt ? new Date(item.date || item.createdAt).toLocaleDateString('en-CA') : '2026-10-02',
            author: item.author || item.sender || 'Academic Administration'
          });
        }
      });

      setAnnouncements(unique);
    } catch (err) {
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const categories = useMemo(() => {
    return ['All', 'Academic', 'Curriculum', 'Placement', 'Research', 'Examinations'];
  }, []);

  const filtered = useMemo(() => {
    return announcements.filter(ann => {
      const matchesCategory = selectedCategory === 'All' || ann.category === selectedCategory;
      const q = search.toLowerCase();
      const matchesSearch = 
        ann.title.toLowerCase().includes(q) || 
        ann.content.toLowerCase().includes(q) || 
        ann.author.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [announcements, search, selectedCategory]);

  const metrics = useMemo(() => {
    const total = announcements.length;
    const urgentCount = announcements.filter(a => a.priority === 'Urgent' || a.priority === 'High').length;
    const academicCount = announcements.filter(a => a.category === 'Academic' || a.category === 'Curriculum').length;
    return { total, urgentCount, academicCount };
  }, [announcements]);

  const handleCreateNotice = (e) => {
    e.preventDefault();
    const newNotice = {
      id: `ann_${Date.now()}`,
      title: createForm.title,
      content: createForm.content,
      targetAudience: createForm.targetAudience,
      category: createForm.category,
      priority: createForm.priority,
      date: new Date().toLocaleDateString('en-CA'),
      author: 'Faculty Member'
    };

    const updated = [newNotice, ...announcements];
    setAnnouncements(updated);

    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    localStorage.setItem(`erp_announcements_${tenantId}`, JSON.stringify(updated));

    setCreateSuccess(true);
    setTimeout(() => {
      setCreateModalOpen(false);
      setCreateForm({ title: '', content: '', targetAudience: 'All Departments', category: 'Academic', priority: 'General' });
      setCreateSuccess(false);
    }, 1200);
  };

  return (
    <div className="announcements-management animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Official Notice Board & Circulars
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Broadcast Hub
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Inspect institution circulars, academic notifications, exam schedules, and department bulletins.
          </p>
        </div>

        <button 
          onClick={() => setCreateModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3730A5', color: '#ffffff', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(55,48,165,0.25)' }}
        >
          <Plus size={17} /> Post Department Notice
        </button>
      </div>

      {/* 4 Interactive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Circulars</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>{metrics.total} Bulletins</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Published across all departments</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Priority Alerts</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#b91c1c', margin: '4px 0 2px' }}>{metrics.urgentCount} Urgent / High</div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>Action required notices</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Academic Directives</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>{metrics.academicCount} Notices</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Syllabus & lecture guidelines</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Department Scope</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6d28d9', margin: '4px 0 2px' }}>Faculty Portal</div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>Synchronized with admin desk</div>
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

        {/* Search and View Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '8px', minWidth: '240px' }}>
            <Search size={15} color="#64748b" />
            <input
              type="text"
              placeholder="Search circulars..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.82rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: viewMode === 'cards' ? '#fff' : 'transparent', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', color: '#1e293b' }}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', background: viewMode === 'table' ? '#fff' : 'transparent', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', color: '#1e293b' }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* NOTICES LIST (CARDS VIEW) */}
      {viewMode === 'cards' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map((ann, idx) => {
            const isUrgent = ann.priority === 'Urgent' || ann.priority === 'High';

            return (
              <div
                key={ann.id || idx}
                onClick={() => setSelectedNotice(ann)}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: isUrgent ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: isUrgent ? '0 4px 12px rgba(239,68,68,0.08)' : '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '3px 10px', borderRadius: '6px' }}>
                    {ann.category}
                  </span>
                  {isUrgent ? (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '3px 10px', borderRadius: '20px', border: '1px solid #fca5a5' }}>
                      ⚡ {ann.priority}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                      {ann.date}
                    </span>
                  )}
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
                    By {ann.author}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    Read Notice <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Notice Title</th>
                <th style={{ padding: '14px 20px' }}>Category</th>
                <th style={{ padding: '14px 20px' }}>Publishing Authority</th>
                <th style={{ padding: '14px 20px' }}>Date</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ann, idx) => (
                <tr key={ann.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{ann.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ann.content.substring(0, 80)}...</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '3px 8px', borderRadius: '6px' }}>
                      {ann.category}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', color: '#334155', fontSize: '0.84rem', fontWeight: 600 }}>{ann.author}</td>
                  <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.84rem' }}>{ann.date}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => setSelectedNotice(ann)}
                      style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#1e293b', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NOTICE READER MODAL */}
      {selectedNotice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setSelectedNotice(null)}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', background: '#e0e7ff', padding: '3px 10px', borderRadius: '6px' }}>
                  {selectedNotice.category}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 4px' }}>
                  {selectedNotice.title}
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Published on {selectedNotice.date} • By <strong>{selectedNotice.author}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', fontSize: '0.9rem', lineHeight: 1.6, color: '#334155', marginBottom: '20px' }}>
              {selectedNotice.content}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedNotice(null)}
                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NOTICE MODAL */}
      {createModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '520px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Publish Department Notice</h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>Broadcast official circulars to scholars and faculty.</p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            {createSuccess ? (
              <div style={{ padding: '16px', textAlign: 'center', background: '#ecfdf5', borderRadius: '10px', color: '#047857', fontWeight: 700 }}>
                ✓ Notice published to all portal boards successfully!
              </div>
            ) : (
              <form onSubmit={handleCreateNotice} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Notice Headline</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Schedule for Lab Record Submission & VIVA"
                    value={createForm.title}
                    onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Category</label>
                    <select
                      value={createForm.category}
                      onChange={e => setCreateForm({ ...createForm, category: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="Academic">Academic</option>
                      <option value="Curriculum">Curriculum</option>
                      <option value="Examinations">Examinations</option>
                      <option value="Placement">Placement</option>
                      <option value="Research">Research</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Priority Level</label>
                    <select
                      value={createForm.priority}
                      onChange={e => setCreateForm({ ...createForm, priority: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="General">General Notice</option>
                      <option value="High">High Priority</option>
                      <option value="Urgent">Urgent Action</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Circular Content / Statement</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Full notice statement, instructions, and dates..."
                    value={createForm.content}
                    onChange={e => setCreateForm({ ...createForm, content: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button type="button" onClick={() => setCreateModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#3730A5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Publish Notice</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffAnnouncements;
