import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, X, Hash, Clock, Award, 
  User, Download, Layers, ShieldCheck, Filter, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { getSubjects, createSubject, updateSubject, deleteSubject, getRegulations, getStaff } from '../../api/index';
import './HodSubjects.css';

const getHodSession = () => {
  try { 
    return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science' }; 
  } catch { 
    return { dept: 'Computer Science' }; 
  }
};

const SEMESTERS = ['Semester 1','Semester 2','Semester 3','Semester 4','Semester 5','Semester 6','Semester 7','Semester 8'];

const HodSubjects = () => {
  const hod = getHodSession();
  const DEPT = hod.dept || hod.department || 'Computer Science';

  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ regulationId:'', code:'', name:'', sem:'Semester 1', teacher:'', credits:4, hours:4 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [DEPT]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regRes, staffRes, subRes] = await Promise.all([
        getRegulations().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getSubjects({ dept: DEPT }).catch(() => ({ data: [] }))
      ]);

      setRegulations(regRes.data || []);
      const allStaff = Array.isArray(staffRes.data) ? staffRes.data : [];
      const deptStaff = allStaff.filter(s => s.dept === DEPT || s.department === DEPT || !DEPT);
      setStaff(deptStaff.length > 0 ? deptStaff : allStaff);

      const rawSubjects = Array.isArray(subRes.data) ? subRes.data : [];
      const formatted = rawSubjects.map(s => ({
        id: s._id || s.id,
        regulationId: s.regulationId,
        code: s.subjectCode || s.code || 'CS101',
        name: s.subjectName || s.name,
        sem: s.semester || s.sem || 'Semester 1',
        teacher: s.teacher || s.instructor || '',
        credits: Number(s.credits) || 4,
        hours: Number(s.workload ?? s.hours ?? 4),
        dept: s.department || s.dept || DEPT
      }));
      setSubjects(formatted);
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => { 
    setForm({ regulationId: regulations[0]?._id || '', code:'', name:'', sem:'Semester 1', teacher:'', credits:4, hours:4 }); 
    setEditId(null); 
    setModalOpen(true); 
  };

  const openEdit = (s) => { 
    setForm({ regulationId: s.regulationId?._id || s.regulationId || '', code:s.code, name:s.name, sem:s.sem, teacher:s.teacher, credits:s.credits, hours:s.hours }); 
    setEditId(s.id); 
    setModalOpen(true); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      regulationId: form.regulationId || null,
      subjectCode: form.code,
      subjectName: form.name,
      department: DEPT,
      semester: form.sem,
      teacher: form.teacher,
      credits: Number(form.credits),
      workload: Number(form.hours)
    };
    
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
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await deleteSubject(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete subject');
      }
    }
  };

  const filtered = useMemo(() => {
    return subjects.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = (s.name || '').toLowerCase().includes(q) || 
                          (s.code || '').toLowerCase().includes(q) || 
                          (s.teacher || '').toLowerCase().includes(q);
      const matchSem = semFilter === 'All' || s.sem === semFilter;
      return matchSearch && matchSem;
    });
  }, [subjects, search, semFilter]);

  const totalCredits = useMemo(() => subjects.reduce((a, s) => a + s.credits, 0), [subjects]);
  const totalHours = useMemo(() => subjects.reduce((a, s) => a + s.hours, 0), [subjects]);
  const assignedSubjects = useMemo(() => subjects.filter(s => s.teacher && s.teacher.trim().length > 0).length, [subjects]);

  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += `DEPARTMENT OF ${DEPT.toUpperCase()} - COURSE CATALOGUE & SUBJECTS\n`;
    csv += `Generated On: ${new Date().toLocaleString('en-IN')}\n\n`;
    csv += 'Subject Code,Subject Name,Semester,Allocated Faculty,Credits,Weekly Hours\n';
    filtered.forEach(s => {
      csv += `"${s.code}","${s.name}","${s.sem}","${s.teacher || 'Unassigned'}",${s.credits},${s.hours}\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `${DEPT.replace(/\s+/g, '_')}_Subjects_Catalogue.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Course Catalog & Subjects — {DEPT}
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Manage curriculum syllabus, credit weightage, faculty allocations, and workload.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-card, #ffffff)', color: 'var(--text-main, #0f172a)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '10px', cursor: 'pointer' }}
          >
            <Download size={14} /> Export Catalogue (.CSV)
          </button>
          <button 
            type="button" 
            onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
          >
            <Plus size={16} /> + Add New Subject
          </button>
        </div>
      </div>

      {/* 4-Card Executive KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        
        {/* KPI 1 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bfdbfe', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Active Subjects</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginTop: '6px' }}>
            {subjects.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Curriculum Catalogue
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Total Credits</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(22,163,74,0.1)', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
            {totalCredits} Cr
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
            Academic Credit Load
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #ddd6fe', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Total Weekly Hours</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
            {totalHours}h / wk
          </div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
            Scheduled Lecture Load
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{ background: 'var(--bg-card, #ffffff)', padding: '18px 20px', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Faculty Assigned</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(217,119,6,0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={17} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
            {assignedSubjects} / {subjects.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '2px', fontWeight: 600 }}>
            {subjects.length > 0 ? Math.round((assignedSubjects / subjects.length) * 100) : 0}% Assigned
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Search */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-secondary, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          padding: '7px 14px',
          flex: 1,
          minWidth: '260px'
        }}>
          <Search size={15} color="var(--text-muted, #64748b)" />
          <input 
            type="text" 
            placeholder="Search by subject code, name, or allocated instructor..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-main, #0f172a)', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <select 
            value={semFilter} 
            onChange={e => setSemFilter(e.target.value)}
            style={{
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--text-main, #0f172a)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Subjects Data Table */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '14px',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Course Code</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Subject Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Semester</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Allocated Faculty</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Credits</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Hours / Wk</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted, #64748b)' }}>
                    No matching subjects found in {DEPT}.
                  </td>
                </tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        {s.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      {s.name}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'var(--bg-secondary, #f1f5f9)', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted, #475569)' }}>
                        {s.sem}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="var(--text-muted, #64748b)" />
                        <span style={{ fontWeight: 600, color: s.teacher ? 'var(--text-main, #0f172a)' : '#d97706' }}>
                          {s.teacher || 'Unallocated'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}>
                        {s.credits} Cr
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: '0.75rem' }}>
                        {s.hours}h
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => openEdit(s)}
                          style={{ padding: '5px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent', cursor: 'pointer', color: '#2563eb' }}
                          title="Edit Subject"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          onClick={() => handleDelete(s.id)}
                          style={{ padding: '5px', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent', cursor: 'pointer', color: '#e11d48' }}
                          title="Delete Subject"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', background: 'var(--bg-secondary, #f8fafc)' }}>
          Showing {filtered.length} of {subjects.length} course subjects in {DEPT}
        </div>
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card, #ffffff)', borderRadius: '16px', width: '100%', maxWidth: '580px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '14px', marginBottom: '18px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                {editId ? 'Edit Subject Details' : 'Add New Department Subject'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Course Code *</label>
                  <input required placeholder="e.g. CS401" value={form.code} onChange={e=>setForm({...form, code:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Semester</label>
                  <select value={form.sem} onChange={e=>setForm({...form, sem:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                    {SEMESTERS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Subject Name *</label>
                <input required placeholder="e.g. Database Management Systems" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Allocated Faculty / Instructor</label>
                <select value={form.teacher} onChange={e=>setForm({...form, teacher:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}>
                  <option value="">— Select Faculty Member —</option>
                  {staff.map((f, idx) => (
                    <option key={f._id || f.id || idx} value={f.name}>{f.name} {f.designation ? `(${f.designation})` : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Credits (1 - 6)</label>
                  <input type="number" min={1} max={6} value={form.credits} onChange={e=>setForm({...form, credits:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase' }}>Weekly Hours</label>
                  <input type="number" min={1} max={10} value={form.hours} onChange={e=>setForm({...form, hours:e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button type="button" onClick={()=>setModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}>{editId ? 'Save Changes' : 'Create Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default HodSubjects;
