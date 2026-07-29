import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Filter, X,
  User, BookOpen, Hash, Percent, DollarSign,
  Phone, Mail, ChevronUp, ChevronDown, CheckCircle, Building
} from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentManagement.css';

const DEPARTMENTS = [
  'Computer Science Engineering', 'Information Technology', 'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Artificial Intelligence & Data Science', 'Artificial Intelligence & Machine Learning',
  'Cyber Security', 'Biomedical Engineering', 'Aeronautical Engineering', 'Automobile Engineering',
  'Robotics Engineering', 'Chemical Engineering', 'Biotechnology Engineering'
];
const SEMESTERS  = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7','Sem 8'];
const FEE_STATUS = ['Paid', 'Pending', 'Partial', 'Waived'];



const EMPTY_FORM = {
  name:'', email:'', password:'', phone:'', dept:'', sem:'',
  cgpa:'', attendance:'', status:'Active', feeStatus:'Pending',
  idNumber: '', dob: '', academicYear: '', section: '', batch: '',
  admissionDate: '', hostelRequired: '', roomNumber: '',
  hostelName: '', blockWing: '', bedNumber: '', wardenName: '',
  wardenContact: '', hostelFeeAmount: '', hostelFeeStatus: '',
  transportRequired: '', busRoute: '', pickupPoint: '',
  transportFeeAmount: '', transportFeeStatus: ''
};

const getInitials   = (name) => (name || 'S').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
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
const generateRegNo = (dept, studentsList) => {
  const codes = { 
    'Computer Science Engineering':'CSE', 'Information Technology':'IT',
    'Electronics & Communication Engineering':'ECE', 'Electrical & Electronics Engineering':'EEE',
    'Mechanical Engineering':'MECH', 'Civil Engineering':'CIVIL',
    'Artificial Intelligence & Data Science':'AIDS', 'Artificial Intelligence & Machine Learning':'AIML',
    'Cyber Security':'CYBER', 'Biomedical Engineering':'BME',
    'Aeronautical Engineering':'AERO', 'Automobile Engineering':'AUTO',
    'Robotics Engineering':'ROBOTICS', 'Chemical Engineering':'CHEM', 'Biotechnology Engineering':'BIOTECH'
  };
  const code = codes[dept] || 'ST';
  const year = new Date().getFullYear();
  const deptStudents = studentsList.filter(s => s.dept === dept && s.id && s.id.startsWith(`${code}${year}`));
  let maxSeq = 0;
  deptStudents.forEach(s => {
    const parts = s.id.split('-');
    if (parts.length > 1) {
      const seq = parseInt(parts[1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  return `${code}${year}-${String(maxSeq + 1).padStart(3,'0')}`;
};

/* ══════════════════════════════════════════════════════════════ */
const StudentManagement = () => {
  const [loading,   setLoading]   = useState(true);
  const [students,  setStudents]  = useState([]);
  const [search,    setSearch]    = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter,  setSemFilter]  = useState('All');
  const [feeFilter,  setFeeFilter]  = useState('All');
  const [hostelFilter, setHostelFilter] = useState('All');
  const [sortKey,  setSortKey]   = useState('name');
  const [sortAsc,  setSortAsc]   = useState(true);

  /* Modal state */
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);  // null = add mode
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [saved,       setSaved]       = useState(false); // success flash

  useEffect(() => {
    fetchStudents();
  }, []);

  // Auto-refresh when student data changes anywhere
  useRealtimeSync(useCallback(() => { fetchStudents(); }, []), 'students');

  // Auto-generate batch code
  useEffect(() => {
    if (form.dept && !editTarget) {
      const codes = { 
        'Computer Science':'CSE', 'Electronics & Comm.':'ECE', 'Electrical Engg.':'EEE', 
        'Mechanical Engg.':'MECH', 'Civil Engg.':'CE', 'Information Tech.':'IT',
        'Bachelor of Computer App.':'BCA', 'Master of Business Admin.':'MBA'
      };
      const code = codes[form.dept] || '';
      if (code) {
        let yearStr = new Date().getFullYear() + 4;
        if (form.academicYear) {
          const match = form.academicYear.match(/\d{4}-(\d{4})/);
          if (match) yearStr = match[1];
        }
        setForm(f => ({ ...f, batch: `${code}${yearStr}` }));
      }
    }
  }, [form.dept, form.academicYear, editTarget]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getStudents();
      let allStudents = res.data || [];
      
      // Removed localStorage mock data to prevent stale/random data from polluting the dashboard
      setStudents(allStudents);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      const local = localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      setStudents(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  /* ── Filter + Sort ── */
  const filtered = students
    .filter(s => {
      const q = (search || '').toLowerCase();
      return (
        ((s.name?.toLowerCase() || '').includes(q) || (s.id?.toLowerCase() || '').includes(q) || (s.email?.toLowerCase() || '').includes(q)) &&
        (deptFilter === 'All' || s.dept === deptFilter) &&
        (semFilter  === 'All' || s.sem  === semFilter)  &&
        (feeFilter  === 'All' || s.feeStatus === feeFilter) &&
        (hostelFilter === 'All' || 
         (hostelFilter === 'Hostel Requested' && s.hostelRequired?.toLowerCase() === 'yes' && !s.roomNumber) ||
         (hostelFilter === 'Hostel Allocated' && s.hostelRequired?.toLowerCase() === 'yes' && s.roomNumber) ||
         (hostelFilter === 'Non-Hostellers' && s.hostelRequired?.toLowerCase() !== 'yes')
        )
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
    if (!form.name || !form.name.trim())       e.name       = 'Name is required';
    if (!form.email || !form.email.trim())      e.email      = 'Email is required';
    if (!form.dept)              e.dept       = 'Select a department';
    if (!form.sem)               e.sem        = 'Select a semester';
    if (form.cgpa && (isNaN(form.cgpa) || +form.cgpa < 0 || +form.cgpa > 10))
                                 e.cgpa       = 'Enter valid CGPA (0–10)';
    if (form.attendance && (isNaN(form.attendance) || +form.attendance < 0 || +form.attendance > 100))
                                 e.attendance = 'Enter valid % (0–100)';
    if (!form.hostelRequired)    e.hostelRequired = 'Required';
    if (!form.transportRequired) e.transportRequired = 'Required';
    if (form.transportRequired === 'yes') {
      if (!form.busRoute || !form.busRoute.trim())   e.busRoute = 'Required';
      if (!form.transportFeeStatus) e.transportFeeStatus = 'Required';
    }
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
        const newId = generateRegNo(form.dept, students);
        const payload = { id: newId, ...form, cgpa: +form.cgpa, attendance: +form.attendance };
        const res = await createStudent(payload);
        setStudents(prev => [res.data, ...prev]);
      }
      setSaved(true);
      setTimeout(() => { closeModal(); setSaved(false); }, 800);
    } catch (err) {
      console.error('Save failed:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save student. Ensure backend is running.';
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this student record? This cannot be undone.')) {
      try {
        await deleteStudent(id);
        setStudents(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete student.');
      }
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  /* ══════════════════════════════════════════════════════════════ */
  return (
    <div className="student-management animate-fade-in">

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1>Student Management</h1>
          <p className="text-muted">Manage all student records, CGPA, attendance, and fee status.</p>
        </div>
        <button id="add-student-btn" className="btn-primary shadow-glow" onClick={openAdd}>
          <Plus size={18} /> Add Student
        </button>
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
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
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
            <div className="filter-select-wrapper">
              <Building size={13} className="text-muted" />
              <select className="filter-select" value={hostelFilter} onChange={e => setHostelFilter(e.target.value)}>
                <option value="All">All Students</option>
                <option value="Hostel Requested">Hostel Requested</option>
                <option value="Hostel Allocated">Hostel Allocated</option>
                <option value="Non-Hostellers">Non-Hostellers</option>
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
                  ['hostelRequired','Hostel Req'], ['transportRequired','Transport Req'],
                  ['sem','Semester'], ['feeStatus','Fee Status'], ['status','Status'],
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
                        <td>
                          <span className={`badge-outline ${s.hostelRequired?.toLowerCase() === 'yes' ? 'bg-primary-light text-primary' : 'bg-gray-100 text-muted'}`}>
                            {s.hostelRequired?.toLowerCase() === 'yes' ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-outline ${s.transportRequired?.toLowerCase() === 'yes' ? 'bg-primary-light text-primary' : 'bg-gray-100 text-muted'}`}>
                            {s.transportRequired?.toLowerCase() === 'yes' ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td><span className="badge-outline">{s.sem}</span></td>
                        <td><span className={`fee-badge ${getFeeClass(s.feeStatus)}`}>{s.feeStatus}</span></td>
                        <td><span className={`status-badge ${s.status === 'Active' ? 'status-active' : 'status-inactive'}`}>{s.status}</span></td>
                        <td>
                          <div className="action-btns">
                            <button className="act-btn" title="Edit" onClick={() => openEdit(s)}><Edit2 size={15}/></button>
                            <button className="act-btn act-delete" title="Delete" onClick={() => handleDelete(s.id)}><Trash2 size={15}/></button>
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
            {(deptFilter !== 'All' || semFilter !== 'All' || feeFilter !== 'All' || hostelFilter !== 'All' || search) && (
              <button className="clear-filters-link" onClick={() => { setSearch(''); setDeptFilter('All'); setSemFilter('All'); setFeeFilter('All'); setHostelFilter('All'); }}>
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
                  <div className="sm-form-section-title">Personal Information</div>

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

                  {/* Aadhar/ID Number */}
                  <div className="fld">
                    <label>Aadhar/ID Number</label>
                    <input type="text" placeholder="ID Number" {...field('idNumber')} />
                  </div>

                  {/* Date of Birth */}
                  <div className="fld">
                    <label>Date of Birth</label>
                    <input type="date" {...field('dob')} />
                  </div>

                  <div className="sm-form-section-title">Academic Information</div>

                  {/* Department */}
                  <div className={`fld ${formErrors.dept ? 'fld-error' : ''}`}>
                    <label><BookOpen size={13}/> Department <span className="req">*</span></label>
                    <select {...field('dept')}>
                      <option value="">— Select Department —</option>
                      {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    {formErrors.dept && <span className="err-msg">{formErrors.dept}</span>}
                  </div>

                  {/* Semester */}
                  <div className={`fld ${formErrors.sem ? 'fld-error' : ''}`}>
                    <label>Semester</label>
                    <select {...field('sem')}>
                      <option value="">— Select Semester —</option>
                      {SEMESTERS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {formErrors.sem && <span className="err-msg">{formErrors.sem}</span>}
                  </div>

                  {/* CGPA */}
                  <div className={`fld ${formErrors.cgpa ? 'fld-error' : ''}`}>
                    <label><Hash size={13}/> CGPA</label>
                    <input type="number" step="0.1" min="0" max="10" placeholder="0.0 – 10.0" {...field('cgpa')} />
                    {formErrors.cgpa && <span className="err-msg">{formErrors.cgpa}</span>}
                  </div>

                  {/* Attendance */}
                  <div className={`fld ${formErrors.attendance ? 'fld-error' : ''}`}>
                    <label><Percent size={13}/> Attendance %</label>
                    <input type="number" min="0" max="100" placeholder="0 – 100" {...field('attendance')} />
                    {formErrors.attendance && <span className="err-msg">{formErrors.attendance}</span>}
                  </div>

                  {/* Fee Status */}
                  <div className="fld">
                    <label><DollarSign size={13}/> Fee Status</label>
                    <select {...field('feeStatus')}>
                      {FEE_STATUS.map(f => <option key={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* Academic Year */}
                  <div className="fld">
                    <label>Academic Year</label>
                    <input type="text" placeholder="e.g. 2023-2027" {...field('academicYear')} />
                  </div>

                  {/* Section */}
                  <div className="fld">
                    <label>Section</label>
                    <input type="text" placeholder="e.g. A" {...field('section')} />
                  </div>

                  {/* Batch */}
                  <div className="fld">
                    <label>Batch</label>
                    <input type="text" placeholder="Auto-generated" {...field('batch')} readOnly style={{ opacity: 0.8, cursor: 'not-allowed', backgroundColor: 'var(--bg-secondary)' }} />
                  </div>

                  {/* Admission Date */}
                  <div className="fld">
                    <label>Admission Date</label>
                    <input type="date" {...field('admissionDate')} />
                  </div>

                  {/* Status */}
                  <div className="fld">
                    <label><CheckCircle size={13}/> Student Status</label>
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

                  <div className="sm-form-section-title" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>Transport & Hostel</div>

                  {/* Hostel & Transport Required Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', gridColumn: '1 / -1' }}>
                    <div className={`fld ${formErrors.hostelRequired ? 'fld-error' : ''}`}>
                      <label>Hostel Required? <span className="req">*</span></label>
                      <select {...field('hostelRequired')}>
                        <option value="">— Select —</option>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      {formErrors.hostelRequired && <span className="err-msg">{formErrors.hostelRequired}</span>}
                    </div>

                    <div className={`fld ${formErrors.transportRequired ? 'fld-error' : ''}`}>
                      <label>Transport Required? <span className="req">*</span></label>
                      <select {...field('transportRequired')}>
                        <option value="">— Select —</option>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                      {formErrors.transportRequired && <span className="err-msg">{formErrors.transportRequired}</span>}
                    </div>
                  </div>

                  {/* Hostel Details */}
                  {form.hostelRequired === 'yes' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', gridColumn: '1 / -1' }}>
                      <div className="fld">
                        <label>Hostel Name</label>
                        <input type="text" placeholder="e.g. Boys Hostel A" {...field('hostelName')} />
                      </div>
                      <div className="fld">
                        <label>Room Number</label>
                        <input type="text" placeholder="e.g. A-102" {...field('roomNumber')} />
                      </div>
                      <div className="fld">
                        <label>Hostel Fee Amount (₹) <span className="req">*</span></label>
                        <input type="number" placeholder="e.g. 25000" {...field('hostelFeeAmount')} />
                      </div>
                      <div className="fld">
                        <label>Hostel Fee Status <span className="req">*</span></label>
                        <select {...field('hostelFeeStatus')}>
                          <option value="">— Select —</option>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Transport Details */}
                  {form.transportRequired === 'yes' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', gridColumn: '1 / -1' }}>
                      <div className={`fld ${formErrors.busRoute ? 'fld-error' : ''}`}>
                        <label>Bus Route <span className="req">*</span></label>
                        <input type="text" placeholder="e.g. ROUTE-5" {...field('busRoute')} />
                        {formErrors.busRoute && <span className="err-msg">{formErrors.busRoute}</span>}
                      </div>
                      <div className="fld">
                        <label>Pickup Point</label>
                        <input type="text" placeholder="e.g. BARGUR" {...field('pickupPoint')} />
                      </div>
                      <div className="fld">
                        <label>Transport Fee Amount (₹) <span className="req">*</span></label>
                        <input type="number" placeholder="e.g. 15000" {...field('transportFeeAmount')} />
                      </div>
                      <div className={`fld ${formErrors.transportFeeStatus ? 'fld-error' : ''}`}>
                        <label>Transport Fee Status <span className="req">*</span></label>
                        <select {...field('transportFeeStatus')}>
                          <option value="">— Select —</option>
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                        </select>
                        {formErrors.transportFeeStatus && <span className="err-msg">{formErrors.transportFeeStatus}</span>}
                      </div>
                    </div>
                  )}



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

export default StudentManagement;
