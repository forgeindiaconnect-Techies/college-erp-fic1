import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Megaphone, Calendar, Tag, User } from 'lucide-react';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept:'Computer Science', name:'HOD' }; }
  catch { return { dept:'Computer Science', name:'HOD' }; }
};

const DEFAULT_ANNOUNCEMENTS = [
  { id:'ANN_H01', title:'Mid-term Examination Schedule', content:'Mid-term exams for Sem 3 and Sem 4 are scheduled from May 28th. All students must carry ID cards.', target:'Students', date:'2026-05-22', author:'CSE HOD Office' },
  { id:'ANN_H02', title:'Staff Meeting — Friday 3 PM', content:'Mandatory departmental staff meeting to discuss curriculum updates and internal assessment schedules.', target:'Staff', date:'2026-05-21', author:'CSE HOD Office' },
];

const TARGETS = ['All','Students','Staff'];

const HodAnnouncements = () => {
  const hod = getHodSession();
  const DEPT = hod.dept;

  const [notices, setNotices] = useState([]);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title:'', content:'', target:'All', author:`${DEPT} HOD Office` });

  useEffect(() => {
    const saved = localStorage.getItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const all = saved ? JSON.parse(saved) : DEFAULT_ANNOUNCEMENTS;
    const deptNotices = all.filter(a => {
      const isMyDept = a.dept === DEPT || a.dept === undefined;
      const target = a.target || a.targetAudience || 'All';
      const isForMe = target === 'All' || target === 'All Roles' || target === 'All Departments' || target.includes('HOD');
      return isMyDept && isForMe;
    });
    setNotices(deptNotices.length ? deptNotices : DEFAULT_ANNOUNCEMENTS);
  }, [DEPT]);

  const saveAll = (list) => {
    setNotices(list);
    const saved = localStorage.getItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    const all = saved ? JSON.parse(saved) : [];
    // Merge: replace dept notices, keep others
    const others = all.filter(a => a.dept && a.dept!==DEPT);
    localStorage.setItem(`erp_announcements_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify([...others, ...list.map(a=>({...a,dept:DEPT}))]));
  };

  const openAdd = () => { setForm({ title:'', content:'', target:'All', author:`${DEPT} HOD Office` }); setEditId(null); setModal(true); };
  const openEdit = (a) => { setForm({ title:a.title, content:a.content, target:a.target, author:a.author }); setEditId(a.id); setModal(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    if (editId) {
      saveAll(notices.map(a => a.id===editId ? { ...a, ...form, date:today } : a));
    } else {
      const id = `ANN_H${String(notices.length+1).padStart(2,'0')}`;
      saveAll([{ id, ...form, date:today, dept:DEPT }, ...notices]);
    }
    setModal(false);
  };

  const handleDelete = (id) => { if(window.confirm('Delete this notice?')) saveAll(notices.filter(a=>a.id!==id)); };

  const TARGET_COLORS = { Students:'#3b82f6', Staff:'#6366F1', All:'#10b981' };

  // Normalize: admin uses 'targetAudience', hod uses 'target'
  const getTarget = (a) => a.target || a.targetAudience || 'All';

  const filtered = notices.filter(a => {
    const q = search.toLowerCase();
    const t = getTarget(a);
    const matchSearch = (a.title||'').toLowerCase().includes(q) || (a.content||'').toLowerCase().includes(q);
    const matchTarget = targetFilter==='All' || t===targetFilter;
    return matchSearch && matchTarget;
  });

  return (
    <div className="animate-fade-in" style={{ padding:'1.5rem' }}>
      <div className="page-header">
        <div><h1>Announcements — {DEPT}</h1><p className="text-muted">Publish official notices for department students and faculty.</p></div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={16}/> Publish Notice</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop:'1.5rem' }}>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Total Notices</span><span className="sm-summary-value">{notices.length}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Student Notices</span><span className="sm-summary-value text-success">{notices.filter(a=>{const t=getTarget(a);return t==='Students'||t==='All';}).length}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Staff Notices</span><span className="sm-summary-value gradient-text">{notices.filter(a=>{const t=getTarget(a);return t==='Staff'||t==='All';}).length}</span></div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop:'1.5rem' }}>
        <div className="filters-row">
          <div className="search-box"><Search size={16} className="text-muted"/><input placeholder="Search notices..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="filter-group">
            <select className="filter-select" value={targetFilter} onChange={e=>setTargetFilter(e.target.value)}>
              <option value="All">All Targets</option>
              {TARGETS.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Notice Title</th><th>Target</th><th>Author</th><th>Date</th><th>Content Preview</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={6} className="text-center text-muted" style={{padding:'2rem'}}>No announcements published.</td></tr>
              ) : filtered.map(a => {
                const target = getTarget(a);
                const tColor = TARGET_COLORS[target] || '#6366f1';
                return (
                  <tr key={a.id}>
                    <td><div style={{display:'flex',alignItems:'center',gap:6}}><Megaphone size={14} style={{color:'var(--primary)'}}/><span className="font-semibold">{a.title}</span></div></td>
                    <td>
                      <span style={{fontWeight:700,fontSize:'0.75rem',padding:'0.2rem 0.6rem',borderRadius:5,background:`${tColor}18`,color:tColor,border:`1px solid ${tColor}40`,display:'inline-block'}}>
                        {target}
                      </span>
                    </td>
                    <td><div style={{display:'flex',alignItems:'center',gap:5}}><User size={13} className="text-muted"/><span className="text-sm font-semibold">{a.author||'—'}</span></div></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:5}}><Calendar size={13} className="text-muted"/><span className="text-sm">{a.date||'—'}</span></div></td>
                    <td><div style={{maxWidth:240,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'0.78rem',color:'var(--text-muted)'}} title={a.content}>{a.content}</div></td>
                    <td><div className="action-buttons"><button className="btn-icon" onClick={()=>openEdit(a)}><Edit2 size={14}/></button><button className="btn-icon btn-icon-danger" onClick={()=>handleDelete(a.id)}><Trash2 size={14}/></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal-card glass-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>{editId?'Edit Notice':'Publish Notice'}</h2><button className="btn-icon" onClick={()=>setModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group" style={{gridColumn:'1/-1'}}><label><Megaphone size={12} style={{display:'inline',marginRight:4}}/>Notice Title *</label><input required placeholder="e.g. Mid-term Exam Schedule" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></div>
                <div className="form-group"><label><Tag size={12} style={{display:'inline',marginRight:4}}/>Target Audience</label><select value={form.target} onChange={e=>setForm({...form,target:e.target.value})}>{TARGETS.map(t=><option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label><User size={12} style={{display:'inline',marginRight:4}}/>Author / Office</label><input placeholder="e.g. CSE HOD Office" value={form.author} onChange={e=>setForm({...form,author:e.target.value})}/></div>
                <div className="form-group" style={{gridColumn:'1/-1'}}><label>Message Content *</label><textarea required rows={4} placeholder="Full notice details..." style={{resize:'vertical',width:'100%'}} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn-primary">{editId?'Update':'Publish'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodAnnouncements;
