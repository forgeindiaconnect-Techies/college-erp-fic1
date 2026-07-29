import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, X, MapPin, Clock, BookOpen } from 'lucide-react';
import { getExams, createExam, updateExam, deleteExam } from '../../api/index';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science' }; }
  catch { return { dept: 'Computer Science' }; }
};

const SEMS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const EXAM_TYPES = [
  {
    category: 'Internal Exams',
    options: [
      'Internal Assessment 1 (IA-1)',
      'Internal Assessment 2 (IA-2)',
      'Internal Assessment 3 (IA-3)',
      'Unit Tests',
      'Class Tests'
    ]
  },
  {
    category: 'Semester Exams',
    options: [
      'Mid-Semester Examination',
      'End Semester Examination (ESE)',
      'University Semester Examination'
    ]
  },
  {
    category: 'Practical Exams',
    options: [
      'Lab Internal Exam',
      'Lab Practical Examination',
      'Project Viva'
    ]
  }
];

const HodExams = () => {
  const hod = getHodSession();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'Internal Assessment 1 (IA-1)', subject:'', sem:'Sem 3', date:'', time:'10:00 AM – 12:00 PM', room:'', maxMarks:100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();

    const savedSubs = localStorage.getItem(`erp_subjects_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (savedSubs) {
      const deptSubs = JSON.parse(savedSubs).filter(s => s.dept === hod.dept);
      setSubjects(deptSubs);
    }
  }, [hod.dept]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await getExams();
      if (res?.data) {
        // filter by hod's department name
        const filtered = res.data.filter(e => e.dept?.toLowerCase() === hod.dept?.toLowerCase());
        setExams(filtered);
      }
    } catch (err) {
      console.warn('API error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { setForm({ name:'Internal Assessment 1 (IA-1)', subject:subjects[0]?.name||'', sem:'Sem 3', date:new Date().toISOString().split('T')[0], time:'10:00 AM – 12:00 PM', room:'', maxMarks:100 }); setEditId(null); setModal(true); };
  const openEdit = (ex) => { setForm({ name:ex.name, subject:ex.subject, sem:ex.sem || 'Sem 3', date:ex.date, time:ex.time, room:ex.room, maxMarks:ex.maxMarks }); setEditId(ex._id || ex.id); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      dept: hod.dept,
      maxMarks: Number(form.maxMarks)
    };
    try {
      if (editId) {
        await updateExam(editId, payload);
      } else {
        await createExam(payload);
      }
      fetchExams();
    } catch (err) {
      console.error('Error saving exam schedule:', err);
    }
    setModal(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this exam slot?')) {
      try {
        await deleteExam(id);
        fetchExams();
      } catch (err) {
        console.error('Error deleting exam slot:', err);
      }
    }
  };

  const filtered = exams.filter(ex => {
    const q = search.toLowerCase();
    return ex.name.toLowerCase().includes(q) || ex.subject.toLowerCase().includes(q) || ex.room.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in" style={{ padding:'1.5rem' }}>
      <div className="page-header">
        <div><h1>Exam Timetable (Semester & Internal Exams) — {hod.dept}</h1><p className="text-muted">Schedule semester examination dates, time slots, exam halls, and internal tests.</p></div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={16}/> Schedule Exam</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop:'1.5rem' }}>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Scheduled Exams</span><span className="sm-summary-value">{exams.length}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Unique Venues</span><span className="sm-summary-value text-success">{new Set(exams.map(e=>e.room).filter(Boolean)).size}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Upcoming (Next 7d)</span><span className="sm-summary-value gradient-text">{exams.filter(e=>{const d=new Date(e.date);const n=new Date();return d>=n && d<=new Date(n.getTime()+7*86400000);}).length}</span></div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop:'1.5rem' }}>
        <div className="filters-row">
          <div className="search-box"><Search size={16} className="text-muted"/><input placeholder="Search by exam, subject or room..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Exam Type</th><th>Subject</th><th>Semester</th><th>Date</th><th>Time</th><th>Venue</th><th>Marks</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={8} className="text-center text-muted" style={{padding:'2rem'}}>No exams scheduled yet.</td></tr>
              ) : filtered.map(ex => (
                <tr key={ex._id || ex.id}>
                  <td className="font-semibold">{ex.name}</td>
                  <td><div style={{display:'flex',alignItems:'center',gap:5}}><BookOpen size={13} className="text-muted"/><span>{ex.subject}</span></div></td>
                  <td><span className="badge-outline">{ex.sem}</span></td>
                  <td><div style={{display:'flex',alignItems:'center',gap:5}}><Calendar size={13} className="text-muted"/><span className="text-sm">{ex.date}</span></div></td>
                  <td><div style={{display:'flex',alignItems:'center',gap:5}}><Clock size={13} className="text-muted"/><span className="text-sm font-semibold">{ex.time}</span></div></td>
                  <td><div style={{display:'flex',alignItems:'center',gap:5}}><MapPin size={13} className="text-muted"/><span style={{background:'rgba(59,130,246,0.1)',color:'#3b82f6',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.room}</span></div></td>
                  <td><span style={{background:'rgba(236,72,153,0.1)',color:'#ec4899',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.maxMarks} Marks</span></td>
                  <td><div className="action-buttons"><button className="btn-icon" onClick={()=>openEdit(ex)}><Edit2 size={14}/></button><button className="btn-icon btn-icon-danger" onClick={()=>handleDelete(ex._id || ex.id)}><Trash2 size={14}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={()=>setModal(false)}>
          <div className="modal-card glass-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>{editId?'Edit Exam':'Schedule Exam'}</h2><button className="btn-icon" onClick={()=>setModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group"><label>Exam Type</label><select value={form.name} onChange={e=>setForm({...form,name:e.target.value})}>
                  {EXAM_TYPES.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </optgroup>
                  ))}
                </select></div>
                <div className="form-group"><label>Subject *</label>
                  {subjects.length>0 ? (
                    <select value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}><option value="">– Select –</option>{subjects.map(s=><option key={s.id} value={s.name}>{s.name} ({s.code})</option>)}</select>
                  ) : (
                    <input required placeholder="e.g. Data Structures" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/>
                  )}
                </div>
                <div className="form-group"><label>Semester</label><select value={form.sem} onChange={e=>setForm({...form,sem:e.target.value})}>{SEMS.map(s=><option key={s}>{s}</option>)}</select></div>
                <div className="form-group"><label>Date *</label><input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
                <div className="form-group"><label>Time Window *</label><input required placeholder="10:00 AM – 01:00 PM" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></div>
                <div className="form-group"><label>Venue / Hall *</label><input required placeholder="e.g. Block A – 301" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div>
                <div className="form-group"><label>Max Marks</label><input type="number" min={10} max={100} value={form.maxMarks} onChange={e=>setForm({...form,maxMarks:e.target.value})}/></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn-primary">{editId?'Save Changes':'Schedule'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodExams;
