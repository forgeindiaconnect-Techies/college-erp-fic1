import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Filter, X,
  User, BookOpen, Hash, Percent, DollarSign,
  Phone, Mail, ChevronUp, ChevronDown, CheckCircle, Download
} from 'lucide-react';
import { getStudents, createStudent, updateStudent, getDepartments } from '../../api/index';
import '../../pages/students/StudentManagement.css';

const SEMESTERS  = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const FEE_STATUS = ['Paid', 'Pending', 'Partial', 'Waived'];

const EMPTY_FORM = {
  name:'', email:'', password:'', phone:'', dept:'', sem:'',
  cgpa:'', attendance:'', status:'Active', feeStatus:'Pending',
};

const getInitials   = (name) => name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
const AVATAR_COLORS = ['bg-av-blue','bg-av-purple','bg-av-green','bg-av-orange','bg-av-pink','bg-av-teal'];

/* ── helpers ── */
const getCgpaColor  = (c) => +c >= 9 ? '#10b981' : +c < 7.5 ? '#ef4444' : '#f59e0b';
const getAttColor   = (a) => +a >= 90 ? 'var(--success)' : +a < 75 ? 'var(--danger)' : 'var(--warning)';
const getFeeClass   = (f) => ({ Paid:'fee-paid', Pending:'fee-pending', Partial:'fee-partial', Waived:'fee-waived' }[f] || '');
const makeSortIcon  = (key, sortKey, sortAsc) => {
  if (sortKey !== key) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
  return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
};

/* ── Auto-generate Register No ── */
const generateRegNo = (dept, existingCount) => {
  const codes = {
    'Computer Science Engineering': 'CSE',
    'Information Technology': 'IT',
    'Electronics & Communication Engineering': 'ECE',
    'Electrical & Electronics Engineering': 'EEE',
    'Mechanical Engineering': 'MECH',
    'Civil Engineering': 'CIVIL',
    'Artificial Intelligence & Data Science': 'AIDS',
    'Artificial Intelligence & Machine Learning': 'AIML',
    'Cyber Security': 'CYBER',
    'Biomedical Engineering': 'BME',
    'Aeronautical Engineering': 'AERO',
    'Automobile Engineering': 'AUTO',
    'Robotics Engineering': 'ROBOTICS',
    'Chemical Engineering': 'CHEM',
    'Biotechnology Engineering': 'BIOTECH'
  };
  const code = codes[dept] || dept?.substring(0, 3).toUpperCase() || 'ST';
  const year = new Date().getFullYear();
  return `${code}${year}${String(existingCount + 1).padStart(3,'0')}`;
};

const SubAdminStudents = () => {
  const [loading,   setLoading]   = useState(true);
  const [students,  setStudents]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter,  setSemFilter]  = useState('All');
  const [feeFilter,  setFeeFilter]  = useState('All');
  const [sortKey,  setSortKey]   = useState('name');
  const [sortAsc,  setSortAsc]   = useState(true);

  /* Modal state */
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);  // null = add mode
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [saved,       setSaved]       = useState(false); // success flash
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await getDepartments();
      const names = (res.data || []).map(d => d.name);
      setDepartmentsList(names);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getStudents();
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Filter + Sort ── */
  const filtered = students
    .filter(s => {
      const q = search.toLowerCase();
      return (
        (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) &&
        (deptFilter === 'All' || s.dept === deptFilter) &&
        (semFilter  === 'All' || s.sem  === semFilter)  &&
        (feeFilter  === 'All' || s.feeStatus === feeFilter)
      );
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });

  const handleSort = (key) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } };

  /* ── Modal helpers ── */
  const openAdd  = ()  => { setForm(EMPTY_FORM); setEditTarget(null); setFormErrors({}); setSaved(false); setModalOpen(true); };
  const openEdit = (s) => { setForm({ ...s });   setEditTarget(s.id); setFormErrors({}); setSaved(false); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name       = 'Name is required';
    if (!form.email.trim())      e.email      = 'Email is required';
    if (!form.dept)              e.dept       = 'Select a department';
    if (!form.sem)               e.sem        = 'Select a semester';
    if (form.cgpa === '' || isNaN(form.cgpa) || +form.cgpa < 0 || +form.cgpa > 10)
                                 e.cgpa       = 'Enter valid CGPA (0–10)';
    if (form.attendance === '' || isNaN(form.attendance) || +form.attendance < 0 || +form.attendance > 100)
                                 e.attendance = 'Enter valid % (0–100)';
    return e;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    try {
      if (editTarget) {
        const payload = { ...form, cgpa: +form.cgpa, attendance: +form.attendance };
        await updateStudent(editTarget, payload);
        setStudents(prev => prev.map(s => s.id === editTarget ? { ...s, ...payload } : s));
      } else {
        const newId = generateRegNo(form.dept, students.length);
        const payload = { id: newId, ...form, cgpa: +form.cgpa, attendance: +form.attendance };
        const res = await createStudent(payload);
        setStudents(prev => [res.data, ...prev]);
      }
      setSaved(true);
      setTimeout(() => { closeModal(); setSaved(false); }, 800);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save student. Ensure backend is running.');
    }
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Name,Register No,Department,Semester,Attendance,CGPA,Fee Status,Status\n"
      + filtered.map(s => `${s.name},${s.id},${s.dept},${s.sem},${s.attendance},${s.cgpa},${s.feeStatus},${s.status}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="student-management animate-fade-in">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1>Sub Admin Students Management</h1>
          <p className="text-muted">Manage all student records, view CGPA, attendance, and export reports.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline shadow-glow" onClick={handleExport}>
            <Download size={18} /> Export Report
          </button>
          <button id="add-student-btn" className="btn-primary shadow-glow" onClick={openAdd}>
            <Plus size={18} /> Add Student
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="sm-summary-row">
        {[
          { label:'Total Students',  value: students.length,                              cls:'' },
          { label:'Active',          value: students.filter(s => s.status === 'Active').length,  cls:'text-success' },
          { label:'Avg CGPA',        value: students.length ? (students.reduce((a,b) => a + b.cgpa, 0)/students.length).toFixed(2) : '—', cls:'gradient-text' },
          { label:'Fee Pending',     value: students.filter(s => s.feeStatus === 'Pending').length, cls:'text-danger' },
          { label:'Low Attendance',  value: students.filter(s => s.attendance < 75).length, cls:'text-warning-c' },
        ].map((c, i) => (
          <div key={i} className="sm-summary-card glass-card">
            <span className="sm-summary-label">{c.label}</span>
            <span className={`sm-summary-value ${c.cls}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="glass-card table-wrapper">

        {/* Filters row */}
        <div className="filters-row">
          <div className="search-box">
            <Search size={17} className="text-muted" />
            <input
              type="text" placeholder="Search by name, register no, or email..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="clear-btn" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <div className="filter-group">
            <div className="filter-select-wrapper">
              <Filter size={13} className="text-muted" />
              <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="All">All Departments</option>
                {departmentsList.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="filter-select-wrapper">
              <select className="filter-select" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
                <option value="All">All Semesters</option>
                {SEMESTERS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-select-wrapper">
              <DollarSign size={13} className="text-muted" />
              <select className="filter-select" value={feeFilter} onChange={e => setFeeFilter(e.target.value)}>
                <option value="All">Fee Status</option>
                {FEE_STATUS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{width:40}}>#</th>
                {[
                  ['name','Student Name'], ['id','Register No'], ['dept','Department'],
                  ['sem','Semester'], ['attendance','Attendance %'], ['cgpa','CGPA'],
                  ['feeStatus','Fee Status'], ['status','Status'],
                ].map(([k, label]) => (
                  <th key={k} className="sortable-th" onClick={() => handleSort(k)}>
                    {label} {makeSortIcon(k, sortKey, sortAsc)}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({length:6}).map((_,i) => (
                    <tr key={i}>{Array.from({length:10}).map((_,j) => (
                      <td key={j}><div className="skeleton" style={{height:15,borderRadius:4,width: j===1?140:j===3?110:65}}></div></td>
                    ))}</tr>
                  ))
                : filtered.length === 0
                  ? <tr><td colSpan={10} className="no-data">No students found matching your filters.</td></tr>
                  : filtered.map((s, idx) => (
                      <tr key={s.id}>
                        <td className="cell-num">{idx + 1}</td>
                        <td>
                          <div className="name-cell">
                            <div className={`av ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{getInitials(s.name)}</div>
                            <div>
                              <p className="name-primary">{s.name}</p>
                              <p className="name-sub">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td><span className="reg-no">{s.id}</span></td>
                        <td className="cell-muted">{s.dept}</td>
                        <td><span className="badge-outline">{s.sem}</span></td>
                        <td>
                          <div className="att-cell">
                            <span style={{color: getAttColor(s.attendance), fontWeight:700, minWidth:38}}>{s.attendance}%</span>
                            <div className="bar-bg"><div className="bar-fill" style={{width:`${s.attendance}%`, background: getAttColor(s.attendance)}}></div></div>
                          </div>
                        </td>
                        <td>
                          <div className="att-cell">
                            <span style={{color: getCgpaColor(s.cgpa), fontWeight:700, minWidth:30}}>{s.cgpa}</span>
                            <div className="bar-bg"><div className="bar-fill" style={{width:`${(s.cgpa/10)*100}%`, background: getCgpaColor(s.cgpa)}}></div></div>
                          </div>
                        </td>
                        <td><span className={`fee-badge ${getFeeClass(s.feeStatus)}`}>{s.feeStatus}</span></td>
                        <td><span className={`status-badge ${s.status === 'Active' ? 'status-active' : 'status-inactive'}`}>{s.status}</span></td>
                        <td>
                          <div className="action-btns">
                            <button className="act-btn" title="Edit" onClick={() => openEdit(s)}><Edit2 size={15}/></button>
                            {/* Delete button removed for Sub Admin */}
                          </div>
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="table-footer">
            Showing <strong>{filtered.length}</strong> of <strong>{students.length}</strong> students
            {(deptFilter !== 'All' || semFilter !== 'All' || feeFilter !== 'All' || search) && (
              <button className="clear-filters-link" onClick={() => { setSearch(''); setDeptFilter('All'); setSemFilter('All'); setFeeFilter('All'); }}>
                Clear all filters ×
              </button>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ ADD / EDIT MODAL ═══════════════ */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box glass-card" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-hd">
              <div>
                <h2>{editTarget ? 'Edit Student' : 'Add New Student'}</h2>
                <p className="text-muted" style={{fontSize:'0.85rem', marginTop:'2px'}}>
                  {editTarget ? 'Update the student record below.' : 'Fill in the details to register a new student.'}
                </p>
              </div>
              <button className="modal-close-btn" onClick={closeModal}><X size={20}/></button>
            </div>

            {/* Success flash */}
            {saved && (
              <div className="modal-success-flash">
                <CheckCircle size={18}/> Student {editTarget ? 'updated' : 'added'} successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-body">
                <div className="form-grid">

                  {/* Student Name */}
                  <div className={`fld ${formErrors.name ? 'fld-error' : ''}`}>
                    <label><User size={13}/> Student Name <span className="req">*</span></label>
                    <input placeholder="e.g. John Doe" {...field('name')} />
                    {formErrors.name && <span className="err-msg">{formErrors.name}</span>}
                  </div>

                  {/* Register Number — auto in add mode */}
                  <div className="fld">
                    <label><Hash size={13}/> Register Number</label>
                    <input
                      placeholder={editTarget ? form.id : 'Auto-generated on save'}
                      value={editTarget ? form.id : ''}
                      disabled
                      style={{opacity: 0.6, cursor:'not-allowed'}}
                    />
                    <span className="field-hint">Generated from Department + Year + Sequence</span>
                  </div>

                  {/* Email */}
                  <div className={`fld ${formErrors.email ? 'fld-error' : ''}`}>
                    <label><Mail size={13}/> Email Address <span className="req">*</span></label>
                    <input type="email" placeholder="student@college.edu" {...field('email')} />
                    {formErrors.email && <span className="err-msg">{formErrors.email}</span>}
                  </div>

                  {/* Password */}
                  <div className="fld">
                    <label>🔑 Login Password <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. securePass123" {...field('password')} />
                    <span className="field-hint">Used for student dashboard login</span>
                  </div>

                  {/* Phone */}
                  <div className="fld">
                    <label><Phone size={13}/> Phone Number</label>
                    <input type="tel" placeholder="10-digit mobile number" maxLength={10} {...field('phone')} />
                  </div>

                  {/* Department */}
                  <div className={`fld ${formErrors.dept ? 'fld-error' : ''}`}>
                    <label><BookOpen size={13}/> Department <span className="req">*</span></label>
                    <select {...field('dept')}>
                      <option value="">— Select Department —</option>
                      {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {formErrors.dept && <span className="err-msg">{formErrors.dept}</span>}
                  </div>

                  {/* Semester */}
                  <div className={`fld ${formErrors.sem ? 'fld-error' : ''}`}>
                    <label>Semester <span className="req">*</span></label>
                    <select {...field('sem')}>
                      <option value="">— Select Semester —</option>
                      {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {formErrors.sem && <span className="err-msg">{formErrors.sem}</span>}
                  </div>

                  {/* CGPA */}
                  <div className={`fld ${formErrors.cgpa ? 'fld-error' : ''}`}>
                    <label><Hash size={13}/> CGPA <span className="req">*</span></label>
                    <input type="number" step="0.1" min="0" max="10" placeholder="0.0 – 10.0" {...field('cgpa')} />
                    {formErrors.cgpa && <span className="err-msg">{formErrors.cgpa}</span>}
                  </div>

                  {/* Attendance */}
                  <div className={`fld ${formErrors.attendance ? 'fld-error' : ''}`}>
                    <label><Percent size={13}/> Attendance % <span className="req">*</span></label>
                    <input type="number" min="0" max="100" placeholder="0 – 100" {...field('attendance')} />
                    {formErrors.attendance && <span className="err-msg">{formErrors.attendance}</span>}
                  </div>

                  {/* Fee Status */}
                  <div className="fld">
                    <label><DollarSign size={13}/> Fee Status</label>
                    <select {...field('feeStatus')}>
                      {FEE_STATUS.map(f => <option key={f}>{f}</option>)}
                    </select>
                    <div className="fee-preview">
                      <span className={`fee-badge ${getFeeClass(form.feeStatus)}`}>{form.feeStatus || 'Pending'}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="fld">
                    <label>Student Status</label>
                    <div className="status-toggle-row">
                      {['Active', 'Inactive'].map(opt => (
                        <label key={opt} className={`status-toggle-opt ${form.status === opt ? 'selected' : ''}`}>
                          <input type="radio" name="status" value={opt} checked={form.status === opt}
                            onChange={() => setForm(f => ({...f, status: opt}))} style={{display:'none'}} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer buttons */}
              <div className="modal-ft">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" id="save-student-btn" className={`btn-primary ${saved ? 'btn-success' : ''}`}>
                  {saved ? <><CheckCircle size={17}/> Saved!</> : <>{editTarget ? 'Save Changes' : 'Save Student'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminStudents;
