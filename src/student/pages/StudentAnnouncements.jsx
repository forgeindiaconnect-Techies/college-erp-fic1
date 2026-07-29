import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, User, Search, Tag, MessageSquare } from 'lucide-react';
import '../../pages/announcements/AnnouncementsManagement.css';

const DEFAULT_ANNOUNCEMENTS = [
  { id: 'ANN001', title: 'End Semester Fees Schedule', content: 'All students are requested to clear their pending academic term fee dues on or before May 28th to generate hall tickets.', targetAudience: 'Only Students', date: '2026-05-22', author: 'College Accounts' },
  { id: 'ANN002', title: 'Semester Syllabus Freeze', content: 'Faculty staff must close active curriculum lectures and upload laboratory internals results by next Monday.', targetAudience: 'Only Staff', date: '2026-05-21', author: 'Academic Dean' },
  { id: 'ANN003', title: 'Summer Internship Drive 2026', content: 'Global tech corporations will host campus recruitment placement drives starting June 1st. Resume freeze date is May 25th.', targetAudience: 'All Departments', date: '2026-05-20', author: 'Placement Cell' }
];

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = () => {
    setLoading(true);
    const saved = localStorage.getItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    let allAnns = saved ? JSON.parse(saved) : DEFAULT_ANNOUNCEMENTS;
    
    // Filter for Students: 'All', 'All Roles', 'All Departments', and 'Students'
    const studentAnns = allAnns
      .map(a => ({ ...a, targetAudience: a.targetAudience || 'All' }))
      .filter(a => 
        a.targetAudience === 'All' || 
        a.targetAudience === 'All Roles' || 
        a.targetAudience === 'All Departments' || 
        a.targetAudience.includes('Student')
      );
    
    setAnnouncements(studentAnns);
    setLoading(false);
  };

  const filtered = announcements.filter(ann => {
    const q = search.toLowerCase();
    return ann.title.toLowerCase().includes(q) || ann.content.toLowerCase().includes(q) || ann.author.toLowerCase().includes(q);
  });

  return (
    <div className="announcements-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Notice Board</h1>
          <p className="text-muted">Stay updated with official college announcements and circulars.</p>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>
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
                      <span className={`notice-badge`} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                        {ann.targetAudience}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '350px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ann.content}>
                        <MessageSquare size={13} className="text-muted" style={{ flexShrink: 0 }} />
                        <span className="text-xs text-muted">{ann.content}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentAnnouncements;
