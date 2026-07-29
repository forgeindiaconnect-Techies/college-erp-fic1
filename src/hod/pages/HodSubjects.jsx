import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Edit2, Trash2, X, Hash, Clock, Award, User } from 'lucide-react';
import { getSubjects, createSubject, updateSubject, deleteSubject, getRegulations, getStaff } from '../../api/index';
import './HodSubjects.css';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science' }; }
  catch { return { dept: 'Computer Science' }; }
};

const SEMESTERS = ['Semester 1','Semester 2','Semester 3','Semester 4','Semester 5','Semester 6','Semester 7','Semester 8'];

const HodSubjects = () => {
  const hod = getHodSession();
  const DEPT = hod.dept;

  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ regulationId:'', code:'', name:'', sem:'Semester 1', teacher:'', credits:4, hours:4 });

  useEffect(() => {
    fetchData();
  }, [DEPT]);

  const fetchData = async () => {
    try {
      const [regRes, staffRes, subRes] = await Promise.all([
        getRegulations().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getSubjects({ dept: DEPT }).catch(() => ({ data: [] }))
      ]);

      setRegulations(regRes.data || []);
      const deptStaff = (staffRes.data || []).filter(s => s.dept === DEPT || s.department === DEPT || !DEPT);
      setStaff(deptStaff.length > 0 ? deptStaff : staffRes.data || []);

      const formatted = (subRes.data || []).map(s => ({
        id: s._id,
        regulationId: s.regulationId,
        code: s.subjectCode,
        name: s.subjectName,
        sem: s.semester,
        teacher: s.teacher,
        credits: s.credits,
        hours: s.workload,
        dept: s.department
      }));
      setSubjects(formatted);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const openAdd = () => { setForm({ regulationId: regulations[0]?._id || '', code:'', name:'', sem:'Semester 1', teacher:'', credits:4, hours:4 }); setEditId(null); setModalOpen(true); };
  const openEdit = (s) => { setForm({ regulationId: s.regulationId?._id || s.regulationId || '', code:s.code, name:s.name, sem:s.sem, teacher:s.teacher, credits:s.credits, hours:s.hours }); setEditId(s.id); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      subjectCode: form.code,
      subjectName: form.name,
      department: DEPT,
      semester: form.sem,
      teacher: form.teacher,
      credits: Number(form.credits),
      workload: Number(form.hours)
    };
    if (form.regulationId) {
      payload.regulationId = form.regulationId;
    }
    
    try {
      if (editId) {
        await updateSubject(editId, payload);
      } else {
        await createSubject(payload);
      }
      fetchData();
      setModalOpen(false);
    } catch (err) {
      console.error('Save subject failed:', err);
      alert(err.response?.data?.message || 'Failed to save subject. Please check inputs.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this subject?')) {
      try {
        await deleteSubject(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete subject');
      }
    }
  };

  const filtered = subjects.filter(s => {
    const q = search.toLowerCase();
    return (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.teacher.toLowerCase().includes(q))
      && (semFilter === 'All' || s.sem === semFilter);
  });

  return (
    <div className="hod-subjects-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Subjects — {DEPT}</h1>
          <p className="text-muted">Manage department course catalogue, credits, and faculty allocation.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={16}/> Add Subject</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop:'1.5rem' }}>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Total Courses</span><span className="sm-summary-value">{subjects.length}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Total Credits</span><span className="sm-summary-value text-success">{subjects.reduce((a,s)=>a+s.credits,0)}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Weekly Hours</span><span className="sm-summary-value gradient-text">{subjects.reduce((a,s)=>a+s.hours,0)}h</span></div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop:'1.5rem' }}>
        <div className="filters-row">
          <div className="search-box"><Search size={16} className="text-muted"/><input placeholder="Search by code, name or instructor..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="filter-group">
            <select className="filter-select" value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
              <option value="All">All Semesters</option>
              {SEMESTERS.map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Code</th><th>Subject Name</th><th>Semester</th><th>Instructor</th><th>Credits</th><th>Hrs/Wk</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length===0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{padding:'2rem'}}>No subjects found.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  <td><span className="subject-code-pill">{s.code}</span></td>
                  <td className="font-semibold">{s.name}</td>
                  <td><span className="badge-outline">{s.sem}</span></td>
                  <td><div style={{display:'flex',alignItems:'center',gap:6}}><User size={13} className="text-muted"/><span className="text-sm font-semibold">{s.teacher||'Unassigned'}</span></div></td>
                  <td><span className="credit-badge">{s.credits} Cr</span></td>
                  <td><span className="hours-badge">{s.hours}h</span></td>
                  <td><div className="action-buttons"><button className="btn-icon" onClick={()=>openEdit(s)}><Edit2 size={14}/></button><button className="btn-icon btn-icon-danger" onClick={()=>handleDelete(s.id)}><Trash2 size={14}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer">Showing {filtered.length} of {subjects.length} subjects</div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal-card glass-card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><h2>{editId?'Edit Subject':'Add Subject'}</h2><button className="btn-icon" onClick={()=>setModalOpen(false)}><X size={18}/></button></div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-grid">

                <div className="form-group"><label><Hash size={12} style={{display:'inline',marginRight:4}}/>Course Code *</label><input required placeholder="e.g. CS301" value={form.code} onChange={e=>setForm({...form,code:e.target.value})}/></div>
                <div className="form-group"><label><BookOpen size={12} style={{display:'inline',marginRight:4}}/>Subject Name *</label><input required placeholder="e.g. Data Structures" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
                <div className="form-group"><label>Semester</label><select value={form.sem} onChange={e=>setForm({...form,sem:e.target.value})}>{SEMESTERS.map(s=><option key={s}>{s}</option>)}</select></div>
                <div className="form-group">
                  <label><User size={12} style={{display:'inline',marginRight:4}}/>Instructor</label>
                  <select value={form.teacher} onChange={e=>setForm({...form,teacher:e.target.value})}>
                    <option value="">— Select Faculty —</option>
                    {staff.map((f, idx) => (
                      <option key={f._id || f.id || idx} value={f.name}>{f.name}{f.designation ? ` (${f.designation})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label><Award size={12} style={{display:'inline',marginRight:4}}/>Credits</label><input type="number" min={1} max={6} value={form.credits} onChange={e=>setForm({...form,credits:e.target.value})}/></div>
                <div className="form-group"><label><Clock size={12} style={{display:'inline',marginRight:4}}/>Weekly Hours</label><input type="number" min={1} max={10} value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})}/></div>
              </div>
              <div className="modal-actions"><button type="button" className="btn-ghost" onClick={()=>setModalOpen(false)}>Cancel</button><button type="submit" className="btn-primary">{editId?'Save Changes':'Add Subject'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodSubjects;
