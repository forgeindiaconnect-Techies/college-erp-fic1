import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Trophy, AlertTriangle, TrendingUp, Edit2, X, CheckCircle, BookOpen } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getStudents, getAllMarks, updateMark } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './CgpaManagement.css';

const DEPARTMENTS = [
  'All',
  'Computer Science Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Artificial Intelligence & Machine Learning',
  'Cyber Security',
  'Biomedical Engineering',
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Robotics Engineering',
  'Chemical Engineering',
  'Biotechnology Engineering',
];
const SEMESTERS   = ['All','Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const AVATAR_COLORS = ['bg-gradient-blue','bg-gradient-purple','bg-gradient-orange','bg-gradient-green','bg-gradient-teal','bg-gradient-pink'];

/* ── GPA helpers ── */
const calcGpa = (internal, external) => {
  const tot = (internal || 0) + (external || 0);
  if (internal < 20 || external < 30) return 0;
  return Number((tot / 10).toFixed(1));
};
const getGrade = g => g >= 9 ? 'O' : g >= 8 ? 'A+' : g >= 7 ? 'A' : g >= 6 ? 'B+' : g >= 5 ? 'B' : 'F';
const getGpaColor = g => g >= 7.5 ? 'var(--success)' : g >= 5 ? 'var(--warning)' : 'var(--danger)';
const isPassing = (internal, external) => internal >= 20 && external >= 30;

const EMPTY_FORM = { internal: '', external: '', arrears: '0' };

const CGPA_TREND = [
  { sem: 'Sem 1', avg: 7.7 },
  { sem: 'Sem 2', avg: 7.9 },
  { sem: 'Sem 3', avg: 8.1 },
  { sem: 'Sem 4', avg: 8.4 },
  { sem: 'Sem 5', avg: 8.5 },
  { sem: 'Sem 6', avg: 8.7 },
];

const CgpaManagement = () => {
  const [loading,    setLoading]    = useState(true);
  const [marks,      setMarks]      = useState([]);
  const [search,     setSearch]     = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter,  setSemFilter]  = useState('All');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saved,      setSaved]      = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when marks data changes
  useRealtimeSync(useCallback(() => { fetchData(); }, []), 'marks');

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [studentsRes, marksRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] }))
      ]);
      
      const studentList = studentsRes.data || [];
      const backendMarks = marksRes.data || [];
      const localMarks = JSON.parse(localStorage.getItem(`erp_marks_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      
      const combinedMarks = [...backendMarks];
      localMarks.forEach(lm => {
        const idx = combinedMarks.findIndex(cm => (cm.studentId === lm.studentId || cm.studentName === lm.studentName) && cm.subject === lm.subject);
        if (idx >= 0) combinedMarks[idx] = lm;
        else combinedMarks.push(lm);
      });
      
      // Merge marks with student details
      const studentMap = Object.fromEntries(studentList.map(s => [s.id || s._id, s]));
      
      const mergedRecords = combinedMarks.map(m => {
        const s = studentMap[m.studentId] || studentList.find(st => st.name === m.studentName || st.id === m.studentId || st._id === m.studentId);
        return {
          ...m,
          name: m.studentName || s?.name || 'Student',
          dept: m.department || s?.dept || s?.department || 'Computer Science Engineering',
          sem: m.semester || s?.sem || 'Semester 3',
          subject: m.subject || 'Core Subject',
          internal: m.internalMarks != null ? m.internalMarks : (m.internal || 0),
          external: m.semesterMarks != null ? m.semesterMarks : (m.external || 0),
          id: m._id || m.id || `${m.studentId}_${m.subject}`,
          studentRegNo: s?.rollNo || s?.id || m.studentId || 'ST2026001'
        };
      });
      
      setMarks(mergedRecords);
    } catch (err) {
      console.error('Failed to fetch marks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!loading) localStorage.setItem('erp_marks', JSON.stringify(marks)); }, [marks, loading]);

  /* computed records */
  const records = marks.map(m => {
    const internal = m.internalMarks !== undefined ? m.internalMarks : (m.internal || 0);
    const external = m.semesterMarks !== undefined ? m.semesterMarks : (m.external || 0);
    const gpa = m.gpa !== undefined ? m.gpa : calcGpa(internal, external);
    const cgpa = m.cgpa !== undefined ? m.cgpa : gpa;
    const grade = m.grade || getGrade(gpa);
    
    let arrears = 0;
    if (m.arrearStatus !== undefined) {
      if (m.arrearStatus === 'Arrear') arrears = 1;
      else if (m.arrearStatus === 'Pass') arrears = 0;
      else if (!isNaN(m.arrearStatus)) arrears = Number(m.arrearStatus);
    } else {
      arrears = m.arrears || 0;
    }

    return { 
      ...m, 
      internal,
      external,
      gpa: parseFloat(gpa), 
      cgpa: parseFloat(cgpa), 
      grade, 
      pass: isPassing(internal, external),
      arrears
    };
  });

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    let rDept = r.dept;
    if (rDept === 'Computer Science') rDept = 'Computer Science Engineering';
    else if (rDept === 'Electronics & Comm.') rDept = 'Electronics & Communication Engineering';
    else if (rDept === 'Electrical Engg.') rDept = 'Electrical & Electronics Engineering';
    else if (rDept === 'Mechanical Engg.') rDept = 'Mechanical Engineering';
    else if (rDept === 'Civil Engg.') rDept = 'Civil Engineering';
    else if (rDept === 'Information Tech.') rDept = 'Information Technology';

    return (r.name.toLowerCase().includes(q) || (r.studentRegNo || r.id).toLowerCase().includes(q)) &&
           (deptFilter === 'All' || rDept === deptFilter) &&
           (semFilter  === 'All' || r.sem  === semFilter);
  });

  const topStudents  = [...records].sort((a,b)=>b.cgpa-a.cgpa).slice(0,3);
  const withArrears  = records.filter(r=>r.arrears>0);
  const avgCgpa      = records.length ? (records.reduce((a,b)=>a+b.cgpa,0)/records.length).toFixed(2) : '—';
  const topCgpa      = records.length ? Math.max(...records.map(r=>r.cgpa)) : '—';
  const passRate     = records.length ? ((records.filter(r=>r.pass).length/records.length)*100).toFixed(0)+'%' : '—';

  /* GPA distribution for bar chart */
  const gpaDist = [
    { range:'< 6',  count: records.filter(r=>r.gpa>0&&r.gpa<6).length,  fill:'#ef4444' },
    { range:'6–7',  count: records.filter(r=>r.gpa>=6&&r.gpa<7).length,  fill:'#f59e0b' },
    { range:'7–8',  count: records.filter(r=>r.gpa>=7&&r.gpa<8).length,  fill:'#3b82f6' },
    { range:'8–9',  count: records.filter(r=>r.gpa>=8&&r.gpa<9).length,  fill:'#6366F1' },
    { range:'9–10', count: records.filter(r=>r.gpa>=9).length,            fill:'#10b981' },
    { range:'Fail', count: records.filter(r=>r.gpa===0&&!r.pass).length,  fill:'#dc2626' },
  ];

  /* modal */
  const openEdit = r => {
    setForm({ internal: String(r.internal), external: String(r.external), arrears: String(r.arrears) });
    setEditTarget(r.id); setFormErrors({}); setSaved(false); setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); };

  const validate = () => {
    const e = {};
    const int = Number(form.internal), ext = Number(form.external), arr = Number(form.arrears);
    if (form.internal==='' || isNaN(int) || int<0||int>50) e.internal='Enter 0–50';
    if (form.external==='' || isNaN(ext) || ext<0||ext>100) e.external='Enter 0–100';
    if (form.arrears==='' || isNaN(arr) || arr<0) e.arrears='Enter 0 or more';
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    
    try {
      const markRecord = marks.find(m => m.id === editTarget);
      if (markRecord) {
        await updateMark(editTarget, {
          internalMarks: Number(form.internal),
          semesterMarks: Number(form.external),
          arrears: Number(form.arrears)
        });
        await fetchData(); // Refresh data from backend to get calculated cgpa/grades
      }
      setSaved(true);
      setTimeout(closeModal, 900);
    } catch (err) {
      console.error('Failed to save mark:', err);
      alert('Failed to save mark. Is the backend running?');
    }
  };

  const fld = k => ({ value: form[k], onChange: e => setForm(f => ({...f,[k]:e.target.value})) });
  const previewGpa  = calcGpa(Number(form.internal)||0, Number(form.external)||0);
  const previewGrade = getGrade(previewGpa);

  return (
    <div className="cgpa-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Marks / CGPA</h1>
          <p className="text-muted">Internal marks, semester marks, GPA/CGPA calculation, and arrear tracking.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row four-col">
        {[
          { label:'Overall Avg CGPA', value: avgCgpa, cls:'gradient-text' },
          { label:'Top CGPA',         value: topCgpa, cls:'text-success',  icon:<Trophy size={16} style={{color:'var(--warning)'}}/> },
          { label:'Arrear Students',  value: withArrears.length, cls:'text-danger', icon:<AlertTriangle size={16} style={{color:'var(--danger)'}}/> },
          { label:'Pass Rate',        value: passRate, cls:'text-success', icon:<TrendingUp size={16} style={{color:'var(--success)'}}/> },
        ].map((c,i)=>(
          <div key={i} className="sm-summary-card glass-card">
            {c.icon}
            <span className="sm-summary-label">{c.label}</span>
            <span className={`sm-summary-value ${c.cls}`}>{c.value}</span>
          </div>
        ))}
      </div>

      <div className="cgpa-grid">
        {/* CGPA Trend */}
        <div className="glass-card chart-box col-span-2">
          <h3><TrendingUp size={16} /> Average CGPA Trend (All Semesters)</h3>
          <div style={{height:230,marginTop:'1rem'}}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CGPA_TREND}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="sem" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis domain={[6,10]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{borderRadius:8,border:'none',background:'var(--bg-secondary)',color:'var(--text-main)',boxShadow:'var(--shadow-md)',fontSize:12}} />
                <Line type="monotone" dataKey="avg" name="Avg CGPA" stroke="var(--primary)" strokeWidth={2.5}
                  dot={{r:4,fill:'var(--primary)',stroke:'white',strokeWidth:2}} activeDot={{r:7}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers + Arrears */}
        <div className="glass-card chart-box">
          <h3><Trophy size={16} style={{color:'var(--warning)'}}/> Top Performers</h3>
          <div className="top-students-list">
            {topStudents.map((s,idx)=>(
              <div key={s.id} className="top-student-item">
                <div className={`rank-badge ${idx===0?'gold':idx===1?'silver':'bronze'}`}>{idx+1}</div>
                <div className={`avatar-sm ${AVATAR_COLORS[idx]}`}>{s.name[0]}</div>
                <div className="top-student-info">
                  <p className="top-student-name">{s.name}</p>
                  <p className="top-student-dept">
                    {(() => {
                      let d = s.dept;
                      if (d === 'Computer Science') d = 'Computer Science Engineering';
                      else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                      else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                      else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                      else if (d === 'Civil Engg.') d = 'Civil Engineering';
                      else if (d === 'Information Tech.') d = 'Information Technology';
                      return d;
                    })()}
                  </p>
                </div>
                <span className="top-student-cgpa" style={{color:getGpaColor(s.cgpa)}}>{s.cgpa}</span>
              </div>
            ))}
          </div>

          {withArrears.length > 0 && (
            <div className="arrear-alert">
              <div className="arrear-alert-header"><AlertTriangle size={14}/> {withArrears.length} students with arrears</div>
              <div className="arrear-list">
                {withArrears.map(s=>(
                  <div key={s.id} className="arrear-item">
                    <span style={{fontSize:'0.82rem'}}>{s.name}</span>
                    <span className="arrear-count">{s.arrears} arrear{s.arrears>1?'s':''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* Main Table */}
        <div className="glass-card col-span-3">
          <div className="table-filters-row">
            <h3>Student Marks &amp; CGPA</h3>
            <div className="filter-group">
              <div className="search-box">
                <Search size={15} className="text-muted"/>
                <input type="text" placeholder="Search name or ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
                {search && <button style={{border:'none',background:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex'}} onClick={()=>setSearch('')}><X size={14}/></button>}
              </div>
              <div className="filter-select-wrapper">
                <Filter size={13} className="text-muted"/>
                <select className="filter-select" value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}>
                  <option value="All">All Departments</option>
                  {DEPARTMENTS.slice(1).map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="filter-select-wrapper">
                <select className="filter-select" value={semFilter} onChange={e=>setSemFilter(e.target.value)}>
                  <option value="All">All Semesters</option>
                  {SEMESTERS.slice(1).map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Student Name</th><th>Register No</th><th>Department</th><th>Semester</th><th>Subject</th>
                  <th>Internal (40)</th><th>External (60)</th><th>Total (100)</th><th>GPA</th>
                  <th>Grade</th><th>Pass/Fail</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({length:6}).map((_,i)=>(
                  <tr key={i}>{Array.from({length:13}).map((_,j)=>(
                    <td key={j}><div className="skeleton" style={{height:14,borderRadius:4,width:j===1?120:j===2?80:50}}/></td>
                  ))}</tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={13} className="no-data-row">No records match the active filters.</td></tr>
                ) : filtered.map((r,idx)=>(
                  <tr key={r.id}>
                    <td className="text-muted">{idx+1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`avatar-xs ${AVATAR_COLORS[idx%AVATAR_COLORS.length]}`}>{r.name[0]}</div>
                        <span className="font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td><span className="roll-no">{r.studentRegNo || r.id}</span></td>
                    <td className="text-sm text-muted">
                      {(() => {
                        let d = r.dept;
                        if (d === 'Computer Science') d = 'Computer Science Engineering';
                        else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                        else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                        else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                        else if (d === 'Civil Engg.') d = 'Civil Engineering';
                        else if (d === 'Information Tech.') d = 'Information Technology';
                        return d;
                      })()}
                    </td>
                    <td><span className="badge-outline">{r.sem}</span></td>
                    <td><span className="font-semibold text-sm">{r.subject}</span></td>
                    <td>
                      <div className="marks-cell">
                        <span className={`marks-val ${r.internal < 20 ? 'fail-mark' : ''}`}>{r.internal}</span>
                        <span className="marks-max">Min: 20</span>
                      </div>
                    </td>
                    <td>
                      <div className="marks-cell">
                        <span className={`marks-val ${r.external < 30 ? 'fail-mark' : ''}`}>{r.external}</span>
                        <span className="marks-max">Min: 30</span>
                      </div>
                    </td>
                    <td><span className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>{r.internal + r.external} / 100</span></td>
                    <td><span style={{color:getGpaColor(r.gpa),fontWeight:700}}>{r.gpa.toFixed(1)}</span></td>
                    <td>
                      <div className="cgpa-cell">
                        <span style={{color:getGpaColor(r.cgpa),fontWeight:700}}>{r.cgpa}</span>
                        <div className="cgpa-bar-bg"><div className="cgpa-bar-fill" style={{width:`${(r.cgpa/10)*100}%`,background:getGpaColor(r.cgpa)}}/></div>
                      </div>
                    </td>
                    <td>
                      <span className="grade-badge" style={{background:getGpaColor(r.gpa)+'18',color:getGpaColor(r.gpa),border:`1px solid ${getGpaColor(r.gpa)}35`}}>{r.grade}</span>
                    </td>
                    <td>
                      {r.pass ? <span className="badge-pass">✓ Pass</span> : <span className="badge-fail">✗ Fail</span>}
                    </td>
                    <td>
                      {r.arrears === 0
                        ? <span className="badge-clear">✓ Clear</span>
                        : <span className="badge-arrear">⚠ {r.arrears} Arrear{r.arrears>1?'s':''}</span>}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="act-btn" title="Edit Marks" onClick={()=>openEdit(r)}><Edit2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div className="table-footer">
              <span>Showing <strong>{filtered.length}</strong> of <strong>{records.length}</strong> students</span>
              {(deptFilter!=='All'||semFilter!=='All'||search) &&
                <button className="clear-filters-link" onClick={()=>{setDeptFilter('All');setSemFilter('All');setSearch('');}}>Reset filters ×</button>}
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MARKS MODAL ── */}
      {modalOpen && (() => {
        const student = records.find(r=>r.id===editTarget);
        return (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-box glass-card" onClick={e=>e.stopPropagation()}>
              <div className="modal-hd">
                <div>
                  <h2>Edit Marks</h2>
                  <p className="text-muted" style={{fontSize:'0.83rem',marginTop:2}}>Update internal, semester marks and arrear count.</p>
                </div>
                <button className="modal-close-btn" onClick={closeModal}><X size={20}/></button>
              </div>

              {saved && (
                <div className="modal-success-flash"><CheckCircle size={16}/> Marks saved successfully!</div>
              )}

              <div className="modal-body">
                {student && (
                  <div className="modal-student-info">
                    <div className={`avatar-sm ${AVATAR_COLORS[0]}`}>{student.name[0]}</div>
                    <div>
                      <p className="modal-student-name">{student.name}</p>
                      <p className="modal-student-meta">
                        {student.studentRegNo || student.id} · {(() => {
                          let d = student.dept;
                          if (d === 'Computer Science') d = 'Computer Science Engineering';
                          else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                          else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                          else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                          else if (d === 'Civil Engg.') d = 'Civil Engineering';
                          else if (d === 'Information Tech.') d = 'Information Technology';
                          return d;
                        })()} · {student.sem}
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="marks-form-grid">
                    <div className={`fld ${formErrors.internal?'fld-error':''}`}>
                      <label>Internal Marks <span style={{color:'var(--danger)'}}>*</span></label>
                      <input type="number" min="0" max="50" placeholder="0–50" {...fld('internal')}/>
                      {formErrors.internal && <span className="err-msg">{formErrors.internal}</span>}
                      <span className="field-hint">Maximum: 50 | Minimum to pass: 20</span>
                    </div>
                    <div className={`fld ${formErrors.external?'fld-error':''}`}>
                      <label>Semester Marks <span style={{color:'var(--danger)'}}>*</span></label>
                      <input type="number" min="0" max="100" placeholder="0–100" {...fld('external')}/>
                      {formErrors.external && <span className="err-msg">{formErrors.external}</span>}
                      <span className="field-hint">Maximum: 100 | Minimum to pass: 35</span>
                    </div>
                    <div className={`fld ${formErrors.arrears?'fld-error':''}`}>
                      <label>Arrear Count</label>
                      <input type="number" min="0" placeholder="0" {...fld('arrears')}/>
                      {formErrors.arrears && <span className="err-msg">{formErrors.arrears}</span>}
                      <span className="field-hint">Number of subjects with arrears</span>
                    </div>

                    {/* Live GPA Preview */}
                    <div className="gpa-preview-row">
                      {[
                        { label:'Calculated GPA', value: previewGpa.toFixed(1), color: getGpaColor(previewGpa) },
                        { label:'Grade',          value: previewGrade,          color: getGpaColor(previewGpa) },
                        { label:'Status',
                          value: (Number(form.internal)||0)>=20&&(Number(form.external)||0)>=35 ? 'Pass' : 'Fail',
                          color: (Number(form.internal)||0)>=20&&(Number(form.external)||0)>=35 ? 'var(--success)' : 'var(--danger)' },
                      ].map((p,i)=>(
                        <div key={i} className="gpa-preview-card">
                          <span className="gpa-preview-label">{p.label}</span>
                          <span className="gpa-preview-value" style={{color:p.color}}>{p.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-ft">
                    <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                    <button type="submit" className={`btn-primary ${saved?'btn-success':''}`}>
                      {saved ? <><CheckCircle size={15}/> Saved!</> : 'Save Marks'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CgpaManagement;
