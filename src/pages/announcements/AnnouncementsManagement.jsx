import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Megaphone, Calendar, Tag, User, MessageSquare } from 'lucide-react';
import './AnnouncementsManagement.css';

const DEFAULT_ANNOUNCEMENTS = [];

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
  }, []);

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
    setForm({ title: '', content: '', targetAudience: 'All', author: 'Super Admin' });
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
    } else {
      const newId = `ANN${String(announcements.length + 1).padStart(3, '0')}`;
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
    const matchesSearch = ann.title.toLowerCase().includes(q) || ann.content.toLowerCase().includes(q) || ann.author.toLowerCase().includes(q);
    const matchesFilter = targetFilter === 'All' || ann.targetAudience === targetFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="announcements-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Campus Notice Board</h1>
          <p className="text-muted">Broadcast official notifications, calendar changes, and academic updates to targeted audiences.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Publish Notice</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Active Notices</span>
          <span className="sm-summary-value">{announcements.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Target Students</span>
          <span className="sm-summary-value text-success">
            {announcements.filter(a => a.targetAudience === 'Students' || a.targetAudience === 'All').length} Notice(s)
          </span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Target Faculty</span>
          <span className="sm-summary-value text-success">
            {announcements.filter(a => a.targetAudience === 'Staff' || a.targetAudience === 'All').length} Notice(s)
          </span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search published news, titles or descriptions..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <select className="filter-select" value={targetFilter} onChange={e => setTargetFilter(e.target.value)}>
              <option value="All">All Audiences</option>
              <option value="Students">Students Only</option>
              <option value="Staff">Faculty Staff Only</option>
              <option value="HODs">HODs Only</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Notice Title</th>
                <th>Target Audience</th>
                <th>Author</th>
                <th>Publish Date</th>
                <th>Content Snippet</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No announcements published on the dashboard noticeboard.
                  </td>
                </tr>
              ) : (
                filtered.map((ann) => (
                  <tr key={ann.id}>
                    <td className="font-semibold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Megaphone size={14} className="text-primary" />
                        <span>{ann.title}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`notice-badge ${(ann.targetAudience || 'All Departments').toLowerCase()}`}>
                        {ann.targetAudience || 'All Departments'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} className="text-muted" />
                        <span className="text-sm font-semibold">{ann.author}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} className="text-muted" />
                        <span>{ann.date}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ann.content}>
                        <MessageSquare size={13} className="text-muted" style={{ flexShrink: 0 }} />
                        <span className="text-xs text-muted">{ann.content}</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openEdit(ann)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(ann.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Announcement' : 'Publish New Notice'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group col-span-2">
                  <label><Megaphone size={13} style={{ display: 'inline', marginRight: '4px' }} /> Notice Title *</label>
                  <input required placeholder="e.g. End Semester Fees Schedule" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                
                <div className="form-group">
                  <label><Tag size={13} style={{ display: 'inline', marginRight: '4px' }} /> Target Audience</label>
                  <select value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })}>
                    <option value="All">All Roles</option>
                    <option value="Students">Students Only</option>
                    <option value="Staff">Faculty Staff Only</option>
                    <option value="HODs">HODs Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label><User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Author / Department *</label>
                  <input required placeholder="e.g. Dean Academics" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
                </div>

                <div className="form-group col-span-2">
                  <label>Message Content *</label>
                  <textarea 
                    required 
                    placeholder="Enter the official details to display on the board..." 
                    style={{ minHeight: '120px', resize: 'vertical', width: '100%' }}
                    value={form.content} 
                    onChange={e => setForm({ ...form, content: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Publish Update' : 'Publish Notice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsManagement;
