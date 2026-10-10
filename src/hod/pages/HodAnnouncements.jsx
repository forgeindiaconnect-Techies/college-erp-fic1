import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Megaphone, Calendar, Tag, User, MessageSquare, Clock } from 'lucide-react';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science', name: 'HOD' }; }
  catch { return { dept: 'Computer Science', name: 'HOD' }; }
};

const DEFAULT_ANNOUNCEMENTS = [
  { id: 'ANN_H01', title: 'Mid-term Examination Schedule & Hall Tickets', content: 'Mid-term examinations for Sem 3 and Sem 5 are scheduled from May 28th. All students must clear lab records and obtain ID cards.', targetAudience: 'Students', date: '2026-10-06', author: 'Computer Science HOD Office' },
  { id: 'ANN_H02', title: 'Department Faculty Meeting — Friday Syllabus Review', content: 'Mandatory departmental staff meeting to discuss curriculum completion, lab marks upload, and internal audit readiness.', targetAudience: 'Staff', date: '2026-10-04', author: 'Computer Science HOD Office' },
];

const TARGETS = ['All', 'Students', 'Staff'];

const HodAnnouncements = () => {
  const hod = getHodSession();
  const DEPT = hod.dept;

  const [notices, setNotices] = useState([]);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', targetAudience: 'All', author: `${DEPT} HOD Office` });

  useEffect(() => {
    loadAnnouncements();
    window.addEventListener('storage', loadAnnouncements);
    window.addEventListener('erp_announcement_updated', loadAnnouncements);
    return () => {
      window.removeEventListener('storage', loadAnnouncements);
      window.removeEventListener('erp_announcement_updated', loadAnnouncements);
    };
  }, [DEPT]);

  const loadAnnouncements = () => {
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_announcements_${tenantId}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_ANNOUNCEMENTS;
    const deptNotices = all.filter(a => {
      const isMyDept = a.dept === DEPT || a.dept === undefined;
      const target = a.targetAudience || a.target || 'All';
      const isForMe = target === 'All' || target === 'All Roles' || target === 'All Departments' || target.includes('HOD') || target === 'Students' || target === 'Staff';
      return isMyDept && isForMe;
    });
    setNotices(deptNotices.length ? deptNotices : DEFAULT_ANNOUNCEMENTS);
  };

  const saveAll = (list) => {
    setNotices(list);
    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
    const saved = localStorage.getItem(`erp_announcements_${tenantId}`);
    const all = saved ? JSON.parse(saved) : [];
    const others = all.filter(a => a.dept && a.dept !== DEPT);
    const updatedAll = [...others, ...list.map(a => ({ ...a, dept: DEPT }))];
    localStorage.setItem(`erp_announcements_${tenantId}`, JSON.stringify(updatedAll));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('erp_announcement_updated'));
  };

  const openAdd = () => {
    setForm({ title: '', content: '', targetAudience: 'All', author: `${DEPT} HOD Office` });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (a) => {
    setForm({ title: a.title, content: a.content, targetAudience: a.targetAudience || a.target || 'All', author: a.author || `${DEPT} HOD Office` });
    setEditId(a.id);
    setModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    if (editId) {
      saveAll(notices.map(a => a.id === editId ? { ...a, ...form, date: today } : a));
    } else {
      const id = `ANN_H${String(Date.now()).slice(-5)}`;
      saveAll([{ id, ...form, date: today, dept: DEPT }, ...notices]);
    }
    setModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this department notice from the campus board?')) {
      saveAll(notices.filter(a => a.id !== id));
    }
  };

  const getTarget = (a) => a.targetAudience || a.target || 'All';

  const filtered = notices.filter(a => {
    const q = search.toLowerCase();
    const t = getTarget(a);
    const matchSearch = (a.title || '').toLowerCase().includes(q) || (a.content || '').toLowerCase().includes(q);
    const matchTarget = targetFilter === 'All' || t === targetFilter;
    return matchSearch && matchTarget;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Department Circulars & Bulletins
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              {DEPT} Department
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Broadcast department notifications, exam guidelines, and staff meeting circulars.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '6px 14px', borderRadius: '10px', border: '1px solid #a7f3d0' }}>
            Academic Session 2026-27 Active
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
            <Plus size={17} /> Publish Department Notice
          </button>
        </div>
      </div>

      {/* 4 Interactive KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Department Notices</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>
            {notices.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>Notices</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Total published in department</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Student Bulletins</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>
            {notices.filter(a => getTarget(a) === 'Students' || getTarget(a) === 'All').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>Bulletins</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>Routed to student feeds</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Faculty Directives</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>
            {notices.filter(a => getTarget(a) === 'Staff' || getTarget(a) === 'All').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4f46e5' }}>Directives</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Targeted to department staff</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Real-Time Sync</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6d28d9', margin: '4px 0 2px' }}>Active</div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>Cross-portal live updates</div>
        </div>
      </div>

      {/* Main Container: Search & Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        
        {/* Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 12px', minWidth: '300px' }}>
            <Search size={16} color="#64748b" />
            <input
              placeholder="Search notice titles or content..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.84rem', color: '#0f172a' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Filter Target:</label>
            <select
              value={targetFilter}
              onChange={e => setTargetFilter(e.target.value)}
              style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}
            >
              <option value="All">All Targets</option>
              {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Notice Title</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Target Audience</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Author / Office</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Publish Date</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 800 }}>Content Snippet</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 800 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '12px', color: '#94a3b8' }}>
                    <Megaphone size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No announcements found</div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem' }}>Notices published for this department will appear here.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const target = getTarget(a);
                  return (
                    <tr key={a.id} style={{ background: '#f8fafc', borderRadius: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <td style={{ padding: '12px 14px', borderRadius: '10px 0 0 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Megaphone size={16} color="#2563eb" />
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{a.title}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.72rem',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: target === 'Students' ? '#dbeafe' : (target === 'Staff' ? '#e0e7ff' : '#ecfdf5'),
                          color: target === 'Students' ? '#1e40af' : (target === 'Staff' ? '#3730a3' : '#047857'),
                          border: `1px solid ${target === 'Students' ? '#bfdbfe' : (target === 'Staff' ? '#c7d2fe' : '#a7f3d0')}`
                        }}>
                          {target}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', fontSize: '0.84rem', color: '#475569', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={13} color="#64748b" />
                          <span>{a.author || `${DEPT} HOD Office`}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#64748b' }}>
                          <Calendar size={13} color="#64748b" />
                          <span>{a.date || 'Today'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', maxWidth: '260px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.content}>
                          <MessageSquare size={13} color="#64748b" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {a.content}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px', borderRadius: '0 10px 10px 0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => openEdit(a)}
                            style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', cursor: 'pointer' }}
                            title="Edit Notice"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
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

      {/* Modern High-End ERP Glassmorphism Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '540px', borderRadius: '18px', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#2563eb" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {editId ? 'Edit Department Notice' : 'Publish Department Notice'}
                </h2>
              </div>
              <button onClick={() => setModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Notice Title *</label>
                <input
                  required
                  placeholder="e.g. Mid-term Examination Schedule & Hall Tickets"
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
                    <option value="All">All Roles</option>
                    <option value="Students">Students Only</option>
                    <option value="Staff">Faculty Staff Only</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Author / Office</label>
                  <input
                    placeholder="e.g. CSE HOD Office"
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', color: '#0f172a' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>Notice Content Details *</label>
                <textarea
                  required
                  rows="4"
                  placeholder="Full notice statement, instructions, and deadlines..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontFamily: 'inherit', color: '#0f172a' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setModal(false)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}>
                  {editId ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
};

export default HodAnnouncements;
