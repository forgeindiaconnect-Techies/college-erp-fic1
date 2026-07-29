import React, { useState, useEffect } from 'react';
import { Search, Filter, Trophy, AlertTriangle, TrendingUp, Edit2, X, CheckCircle, Percent, Hash } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getStudents, updateStudent, getAllMarks } from '../../api/index';
import './HodMarks.css';

// Try to grab logged in HOD session
const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Electrical Engg.', deptCode: 'EE', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Electrical Engg.', deptCode: 'EE', role: 'HOD' };
  }
};

const MOCK_MARKS_FALLBACK = [
  { id: 'CS2021001', name: 'John Doe', dept: 'Computer Science', sem: 'Sem 6', internal: 42, external: 71, gpa: 8.5, cgpa: 8.3, arrears: 0, trend: [7.2, 7.5, 7.9, 8.1, 8.3, 8.5] },
  { id: 'EE2022001', name: 'Alice Smith', dept: 'Electrical Engg.', sem: 'Sem 4', internal: 48, external: 88, gpa: 9.1, cgpa: 9.0, arrears: 0, trend: [8.5, 8.8, 9.0, 9.1] },
  { id: 'ME2023001', name: 'Robert Johnson', dept: 'Mechanical Engg.', sem: 'Sem 2', internal: 35, external: 55, gpa: 6.8, cgpa: 7.1, arrears: 2, trend: [7.4, 6.8] },
  { id: 'CS2021004', name: 'Emily Davis', dept: 'Computer Science', sem: 'Sem 6', internal: 47, external: 85, gpa: 8.9, cgpa: 8.7, arrears: 0, trend: [7.9, 8.2, 8.4, 8.5, 8.6, 8.9] },
  { id: 'CE2020001', name: 'Michael Brown', dept: 'Civil Engg.', sem: 'Sem 8', internal: 30, external: 48, gpa: 6.1, cgpa: 6.9, arrears: 3, trend: [7.5, 7.2, 6.9, 6.5, 6.2, 6.3, 6.0, 6.1] },
  { id: 'EE2022002', name: 'Sarah Wilson', dept: 'Electrical Engg.', sem: 'Sem 4', internal: 49, external: 91, gpa: 9.5, cgpa: 9.3, arrears: 0, trend: [8.9, 9.1, 9.2, 9.5] },
  { id: 'CS2022001', name: 'David Lee', dept: 'Computer Science', sem: 'Sem 3', internal: 43, external: 76, gpa: 8.2, cgpa: 8.0, arrears: 0, trend: [7.6, 7.9, 8.2] },
  { id: 'EE2022003', name: 'Raj Kumar', dept: 'Electrical Engg.', sem: 'Sem 2', internal: 38, external: 64, gpa: 7.0, cgpa: 7.2, arrears: 1, trend: [7.4, 7.0] },
];

const CGPA_TREND_DATA_FALLBACK = [
  { sem: 'Sem 1', avg: 7.7 }, { sem: 'Sem 2', avg: 7.9 }, { sem: 'Sem 3', avg: 8.1 },
  { sem: 'Sem 4', avg: 8.4 }, { sem: 'Sem 5', avg: 8.5 }, { sem: 'Sem 6', avg: 8.7 },
];

const SEMESTERS = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const AVATAR_COLORS = ['bg-gradient-blue','bg-gradient-purple','bg-gradient-orange','bg-gradient-green','bg-gradient-teal','bg-gradient-pink'];

const HodMarks = () => {
  const hodSession = getHodSession();
  const HOD_DEPT = hodSession.dept;

  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [search, setSearch] = useState('');
  const [semFilter, setSemFilter] = useState('All');

  /* Edit Modal states */
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ id:'', name:'', internal: 0, external: 0, cgpa: 0, arrears: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchMarksData();
  }, []);

  const fetchMarksData = async () => {
    try {
      const [studRes, marksRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] }))
      ]);
      
      let backendMarks = marksRes?.data || [];
      const localMarks = JSON.parse(localStorage.getItem(`erp_marks_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const allMarks = [...backendMarks];
      localMarks.forEach(lm => {
        const idx = allMarks.findIndex(m => m.studentId === lm.studentId && m.subject === lm.subject);
        if (idx >= 0) allMarks[idx] = lm;
        else allMarks.push(lm);
      });

      // Backend auto-scopes to HOD's dept. Map Student model data to marks display format.
      const mapped = studRes.data.map(s => {
        const sId = s.id || s._id;
        const studentMarks = allMarks.filter(m => 
          m.studentId === sId || m.studentId === s.id || m.studentId === s._id || 
          (m.studentName && s.name && m.studentName.toLowerCase().trim() === s.name.toLowerCase().trim())
        );
        
        let avgInternal = 0;
        let avgExternal = 0;
        if (studentMarks.length > 0) {
          const totalInternal = studentMarks.reduce((sum, m) => sum + (m.internalMarks != null ? m.internalMarks : (m.internal || 0)), 0);
          const totalExternal = studentMarks.reduce((sum, m) => sum + (m.semesterMarks != null ? m.semesterMarks : (m.external || 0)), 0);
          avgInternal = Math.round(totalInternal / studentMarks.length);
          avgExternal = Math.round(totalExternal / studentMarks.length);
        }

        const totalScore = avgInternal + avgExternal;
        const computedGpa = totalScore > 0 ? Number((totalScore / 10).toFixed(1)) : (s.cgpa != null ? s.cgpa : 0);
        const lastMarkSem = studentMarks.length > 0 ? studentMarks[studentMarks.length - 1].semester : null;

        return {
          id: s.id || s._id,
          name: s.name,
          dept: s.dept || HOD_DEPT,
          sem: lastMarkSem || s.sem || 'Semester 3',
          internal: avgInternal,
          external: avgExternal,
          gpa: computedGpa,
          cgpa: computedGpa,
          arrears: (avgInternal < 20 || avgExternal < 30) ? 1 : (s.arrears || 0),
          trend: [computedGpa]
        };
      });
      setMarks(mapped.length > 0 ? mapped : MOCK_MARKS_FALLBACK.filter(m => m.dept === HOD_DEPT));
      setLoading(false);
    } catch (err) {
      console.warn('Backend unavailable, using fallback data:', err.message);
      const savedData = localStorage.getItem('erp_marks');
      const base = savedData ? JSON.parse(savedData) : MOCK_MARKS_FALLBACK;
      setMarks(base.filter(m => m.dept === HOD_DEPT));
      setLoading(false);
    }
  };

  /* Scoped to department */
  const deptMarks = marks.filter(m => m.dept === HOD_DEPT);
  
  const filtered = deptMarks.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchSem = semFilter === 'All' || m.sem === semFilter;
    return matchSearch && matchSem;
  });

  const topStudents = [...deptMarks].sort((a, b) => b.cgpa - a.cgpa).slice(0, 3);
  const withArrears = deptMarks.filter(m => m.arrears > 0);
  const avgCgpa = deptMarks.length ? (deptMarks.reduce((a, b) => a + b.cgpa, 0) / deptMarks.length).toFixed(2) : 0;

  const getCgpaColor = (c) => c >= 9 ? 'var(--success)' : c < 7 ? 'var(--danger)' : 'var(--warning)';
  const getGrade = (c) => c >= 9 ? 'O' : c >= 8 ? 'A+' : c >= 7 ? 'A' : c >= 6 ? 'B+' : 'B';

  const openEdit = (m) => {
    setForm({
      id: m.id,
      name: m.name,
      internal: m.internal,
      external: m.external,
      cgpa: m.cgpa,
      arrears: m.arrears
    });
    setEditTarget(m.id);
    setSaved(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleFormChange = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    // Calculate GPA from marks
    const newGpa = Math.min(10, +((+form.internal * 0.1) + (+form.external * 0.05)).toFixed(2));

    // Optimistically update UI
    const updated = marks.map(m => {
      if (m.id === editTarget) {
        const updatedTrend = [...m.trend];
        updatedTrend[updatedTrend.length - 1] = +form.cgpa;
        return { ...m, internal: +form.internal, external: +form.external, gpa: newGpa, cgpa: +form.cgpa, arrears: +form.arrears, trend: updatedTrend };
      }
      return m;
    });
    setMarks(updated);

    try {
      // Save CGPA update to Student record via API
      await updateStudent(editTarget, { cgpa: +form.cgpa });
    } catch (err) {
      console.warn('API save failed, persisting locally:', err.message);
      // Also sync with erp_marks localStorage for fallback
      const studentsSaved = localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      if (studentsSaved) {
        const parsedStud = JSON.parse(studentsSaved);
        const updatedStud = parsedStud.map(s => s.id === editTarget ? { ...s, cgpa: +form.cgpa } : s);
        localStorage.setItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updatedStud));
      }
    }

    setSaved(true);
    setTimeout(() => { closeModal(); setSaved(false); }, 800);
  };

  return (
    <div className="cgpa-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Marks & CGPA</h1>
          <p className="text-muted">Manage academic grades, GPAs, and arrears for students in <strong>{HOD_DEPT}</strong>.</p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="sm-summary-row four-col">
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Average CGPA</span>
          <span className="sm-summary-value gradient-text">{avgCgpa}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <Trophy size={18} style={{ color: 'var(--warning)' }} />
          <span className="sm-summary-label">Department Top CGPA</span>
          <span className="sm-summary-value text-success">{deptMarks.length ? Math.max(...deptMarks.map(m => m.cgpa)) : '—'}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Arrear Students</span>
          <span className="sm-summary-value text-danger">{withArrears.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <TrendingUp size={18} style={{ color: 'var(--success)' }} />
          <span className="sm-summary-label">Department Pass Rate</span>
          <span className="sm-summary-value text-success">{deptMarks.length ? ((deptMarks.filter(m => m.cgpa >= 5).length / deptMarks.length) * 100).toFixed(0) + '%' : '—'}</span>
        </div>
      </div>

      <div className="cgpa-grid">
        {/* CGPA Trend Chart */}
        <div className="glass-card chart-box col-span-2">
          <h3>Semester Performance Trend</h3>
          <div style={{ height: '230px', marginTop: '1.25rem' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CGPA_TREND_DATA_FALLBACK}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="sem" stroke="var(--text-muted)" />
                <YAxis domain={[6, 10]} stroke="var(--text-muted)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)' }} />
                <Line type="monotone" dataKey="avg" name="Avg CGPA" stroke="var(--primary)" strokeWidth={3} dot={{ r: 5, fill: 'var(--primary)', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Students */}
        <div className="glass-card chart-box">
          <h3><Trophy size={16} style={{ display: 'inline', color: 'var(--warning)', marginRight: '6px' }} />Department Toppers</h3>
          <div className="top-students-list">
            {topStudents.map((s, idx) => (
              <div key={s.id} className="top-student-item">
                <div className={`rank-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : 'bronze'}`}>{idx + 1}</div>
                <div className={`avatar-sm ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{s.name[0]}</div>
                <div className="top-student-info">
                  <p className="top-student-name">{s.name}</p>
                  <p className="top-student-dept">{s.sem}</p>
                </div>
                <span className="top-student-cgpa" style={{ color: getCgpaColor(s.cgpa) }}>{s.cgpa}</span>
              </div>
            ))}
          </div>

          {withArrears.length > 0 && (
            <div className="arrear-alert" style={{ marginTop: '1rem' }}>
              <AlertTriangle size={16} />
              <span><strong>{withArrears.length} students</strong> have arrears.</span>
              <div className="arrear-list">
                {withArrears.map(s => (
                  <div key={s.id} className="arrear-item">
                    <span>{s.name} ({s.sem})</span>
                    <span className="arrear-count">{s.arrears} Arrear{s.arrears > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Table */}
        <div className="glass-card col-span-3">
          <div className="table-filters-row">
            <h3>Student Academic Records</h3>
            <div className="filter-group">
              <div className="search-box">
                <Search size={16} className="text-muted" />
                <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="filter-select-wrapper">
                <select className="filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
                  <option value="All">All Semesters</option>
                  {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Register No</th><th>Name</th><th>Sem</th>
                  <th>Internal (40)</th><th>External (60)</th><th>GPA</th><th>CGPA</th>
                  <th>Grade</th><th>Arrears</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 11 }).map((_, j) => <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>)}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={11} className="no-data">No students matching query.</td></tr>
                ) : filtered.map((m, idx) => (
                  <tr key={m.id}>
                    <td className="text-muted">{idx + 1}</td>
                    <td><span className="roll-no">{m.id}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`avatar-xs ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{m.name[0]}</div>
                        <span className="font-semibold">{m.name}</span>
                      </div>
                    </td>
                    <td><span className="badge-outline">{m.sem}</span></td>
                    <td><span className={m.internal < 20 ? 'text-danger font-semibold' : 'font-semibold'}>{m.internal}</span></td>
                    <td><span className={m.external < 30 ? 'text-danger font-semibold' : 'font-semibold'}>{m.external}</span></td>
                    <td><span style={{ color: getCgpaColor(m.gpa), fontWeight: 600 }}>{m.gpa}</span></td>
                    <td>
                      <div className="cgpa-cell">
                        <span style={{ color: getCgpaColor(m.cgpa), fontWeight: 700 }}>{m.cgpa}</span>
                        <div className="cgpa-bar-bg">
                          <div className="cgpa-bar-fill" style={{ width: `${(m.cgpa / 10) * 100}%`, background: getCgpaColor(m.cgpa) }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="grade-badge" style={{ background: getCgpaColor(m.cgpa) + '20', color: getCgpaColor(m.cgpa), border: `1px solid ${getCgpaColor(m.cgpa)}40` }}>
                        {getGrade(m.cgpa)}
                      </span>
                    </td>
                    <td>
                      {m.arrears === 0
                        ? <span className="text-success font-semibold">✓ Clear</span>
                        : <span className="text-danger font-semibold">⚠ {m.arrears}</span>
                      }
                    </td>
                    <td>
                      <button className="btn-icon" title="Log/Update Marks" onClick={() => openEdit(m)}>
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MARKS MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Update Academic Marks</h2>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '2px'}}>Log internals and semester scores for {form.name}.</p>
              </div>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            {saved && (
              <div className="modal-success-flash" style={{display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.75rem', background: 'rgba(16,185,129,0.1)', color: '#059669', fontSize: '0.9rem', fontWeight: 600, borderBottom: '1px solid rgba(16,185,129,0.2)'}}>
                <CheckCircle size={18} /> Student marks updated successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Student Name</label>
                  <input disabled value={form.name} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label>Register No</label>
                  <input disabled value={form.id} style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                  <label><Percent size={13} /> Internal Marks (Max 50)</label>
                  <input type="number" min="0" max="50" required value={form.internal} onChange={e => handleFormChange('internal', e.target.value)} />
                </div>
                <div className="form-group">
                  <label><Percent size={13} /> External Marks (Max 100)</label>
                  <input type="number" min="0" max="100" required value={form.external} onChange={e => handleFormChange('external', e.target.value)} />
                </div>
                <div className="form-group">
                  <label><Hash size={13} /> Cumulative CGPA (0.0 - 10.0)</label>
                  <input type="number" step="0.01" min="0" max="10" required value={form.cgpa} onChange={e => handleFormChange('cgpa', e.target.value)} />
                </div>
                <div className="form-group">
                  <label><AlertTriangle size={13} /> Active Arrears</label>
                  <input type="number" min="0" max="10" required value={form.arrears} onChange={e => handleFormChange('arrears', e.target.value)} />
                </div>
              </div>

              <div className="modal-actions" style={{display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem'}}>
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">Update Scores</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodMarks;
