import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Filter, X,
  User, Hash, Percent, Phone, Mail, ChevronUp, ChevronDown, CheckCircle, GraduationCap, DollarSign, BookOpen, Layers
} from 'lucide-react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../../api/index';
import './HodStudents.css';

// Dynamic HOD session loader
const getHodSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('hod_session')) || {
      name: 'Prof. Rajan Iyer', dept: 'Computer Science', deptCode: 'CSE', role: 'HOD'
    };
  } catch (e) {
    return { name: 'Prof. Rajan Iyer', dept: 'Computer Science', deptCode: 'CSE', role: 'HOD' };
  }
};

const DEPT_CODE_MAP = {
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
  'Biotechnology Engineering': 'BIOTECH',
  'Computer Science': 'CSE',
  'Electronics & Comm.': 'ECE',
  'Electrical Engg.': 'EE',
  'Mechanical Engg.': 'MECH',
  'Bachelor of Computer App.': 'BCA',
  'Master of Business Admin.': 'MBA'
};

const MOCK_STUDENTS_FALLBACK = [
  // CSE Students
  { id: "CSE001", name: "Arun", rollNo: "CSE001", sem: "Sem 1", year: "1st Year", section: "A", attendance: "92%", cgpa: 8.5, feeStatus: "Paid", status: "Active", deptCode: "CSE", dept: "Computer Science", email: "arun@college.edu", phone: "9876543201" },
  { id: "CSE002", name: "Divya", rollNo: "CSE002", sem: "Sem 3", year: "2nd Year", section: "A", attendance: "88%", cgpa: 8.8, feeStatus: "Paid", status: "Active", deptCode: "CSE", dept: "Computer Science", email: "divya@college.edu", phone: "9876543202" },
  { id: "CSE003", name: "Suresh Kumar", rollNo: "CSE003", sem: "Sem 5", year: "3rd Year", section: "B", attendance: "95%", cgpa: 9.0, feeStatus: "Paid", status: "Active", deptCode: "CSE", dept: "Computer Science", email: "suresh@college.edu", phone: "9876543203" },
  { id: "CSE004", name: "Priya Dharshini", rollNo: "CSE004", sem: "Sem 7", year: "4th Year", section: "A", attendance: "76%", cgpa: 7.9, feeStatus: "Paid", status: "Active", deptCode: "CSE", dept: "Computer Science", email: "priya@college.edu", phone: "9876543204" },
  { id: "CSE005", name: "Rahul Sharma", rollNo: "CSE005", sem: "Sem 3", year: "2nd Year", section: "B", attendance: "68%", cgpa: 6.5, feeStatus: "Pending", status: "Inactive", deptCode: "CSE", dept: "Computer Science", email: "rahul@college.edu", phone: "9876543205" },

  // ECE Students
  { id: "ECE001", name: "Adithya", rollNo: "ECE001", sem: "Sem 1", year: "1st Year", section: "A", attendance: "91%", cgpa: 8.4, feeStatus: "Paid", status: "Active", deptCode: "ECE", dept: "Electronics & Comm.", email: "adithya@college.edu", phone: "9876543206" },
  { id: "ECE002", name: "Anitha", rollNo: "ECE002", sem: "Sem 3", year: "2nd Year", section: "B", attendance: "89%", cgpa: 8.9, feeStatus: "Paid", status: "Active", deptCode: "ECE", dept: "Electronics & Comm.", email: "anitha@college.edu", phone: "9876543207" },
  { id: "ECE003", name: "Ganesh", rollNo: "ECE003", sem: "Sem 5", year: "3rd Year", section: "A", attendance: "94%", cgpa: 9.2, feeStatus: "Paid", status: "Active", deptCode: "ECE", dept: "Electronics & Comm.", email: "ganesh@college.edu", phone: "9876543208" },

  // MECH Students
  { id: "MECH001", name: "Manoj", rollNo: "MECH001", sem: "Sem 1", year: "1st Year", section: "A", attendance: "85%", cgpa: 7.5, feeStatus: "Paid", status: "Active", deptCode: "MECH", dept: "Mechanical Engg.", email: "manoj@college.edu", phone: "9876543209" },
  { id: "MECH002", name: "Vikram", rollNo: "MECH002", sem: "Sem 5", year: "3rd Year", section: "B", attendance: "82%", cgpa: 8.1, feeStatus: "Paid", status: "Active", deptCode: "MECH", dept: "Mechanical Engg.", email: "vikram@college.edu", phone: "9876543210" },
  { id: "MECH003", name: "Karthik", rollNo: "MECH003", sem: "Sem 3", year: "2nd Year", section: "A", attendance: "78%", cgpa: 7.9, feeStatus: "Paid", status: "Active", deptCode: "MECH", dept: "Mechanical Engg.", email: "karthik@college.edu", phone: "9876543211" }
];

const SEMESTERS = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
const FEE_STATUS = ['Paid', 'Pending', 'Partial', 'Waived'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const EMPTY_FORM = {
  name: '', rollNo: '', section: 'A', email: '', phone: '', sem: 'Sem 1', cgpa: '', attendance: '', feeStatus: 'Pending', status: 'Active',
  idNumber: '', dob: '', academicYear: '', batch: '', admissionDate: '', hostelRequired: '', roomNumber: '', busRoute: '', pickupPoint: '', transportFeeStatus: ''
};

// Map semester directly to year
const deriveYearFromSem = (sem) => {
  if (!sem) return '1st Year';
  const num = parseInt(String(sem).replace(/[^0-9]/g, '')) || 1;
  if (num <= 2) return '1st Year';
  if (num <= 4) return '2nd Year';
  if (num <= 6) return '3rd Year';
  return '4th Year';
};

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = ['bg-av-blue', 'bg-av-purple', 'bg-av-green', 'bg-av-orange', 'bg-av-pink', 'bg-av-teal'];

const getAttColor = (a) => {
  const val = parseFloat(a);
  if (val >= 90) return 'var(--success)';
  if (val < 75) return 'var(--danger)';
  return 'var(--warning)';
};

const makeSortIcon = (key, sortKey, sortAsc) => {
  if (sortKey !== key) return <ChevronUp size={12} style={{ opacity: 0.25 }} />;
  return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
};

/* ── Auto-generate Register No ── */
const generateRegNo = (deptCode, existingCount) => {
  const year = new Date().getFullYear();
  return `${deptCode}${year}${String(existingCount + 1).padStart(3, '0')}`;
};

const HodStudents = () => {
  const hodSession = getHodSession();
  const HOD_DEPT = hodSession.dept;
  const deptCode = DEPT_CODE_MAP[HOD_DEPT] || hodSession.deptCode || 'CSE';

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formErrors, setFormErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [HOD_DEPT]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getStudents();
      const mapped = (res.data || []).map(s => {
        const semVal = s.sem || 'Sem 1';
        return {
          id: s.id || s._id,
          name: s.name,
          rollNo: s.rollNo || s.id || `${deptCode}${String(Math.floor(Math.random() * 900) + 100)}`,
          sem: semVal,
          year: s.year || deriveYearFromSem(semVal),
          section: s.section || 'A',
          attendance: (s.attendance !== undefined && s.attendance !== null && s.attendance !== '') ? (String(s.attendance).includes('%') ? s.attendance : `${s.attendance}%`) : '0%',
          cgpa: s.cgpa != null ? s.cgpa : 0,
          feeStatus: s.feeStatus || 'Paid',
          status: s.status || 'Active',
          deptCode: DEPT_CODE_MAP[s.dept || s.department] || s.deptCode || 'CSE',
          dept: s.dept || s.department || HOD_DEPT,
          email: s.email || '',
          phone: s.phone || '',
          idNumber: s.idNumber || '',
          dob: s.dob || '',
          academicYear: s.academicYear || '',
          batch: s.batch || '',
          admissionDate: s.admissionDate || '',
          hostelRequired: s.hostelRequired || 'No',
          roomNumber: s.roomNumber || '',
          busRoute: s.busRoute || '',
          pickupPoint: s.pickupPoint || '',
          transportFeeStatus: s.transportFeeStatus || 'Pending'
        };
      });

      setStudents(mapped);
    } catch (err) {
      console.warn('Backend connection unavailable, loading localized students list:', err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const myStudents = students.filter(s => s.deptCode === deptCode);

  const filtered = myStudents
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
      const matchYear = yearFilter === 'All' || s.year === yearFilter;
      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchSearch && matchYear && matchStatus;
    })
    .sort((a, b) => {
      const va = a[sortKey] ?? '', vb = b[sortKey] ?? '';
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const openAdd = () => {
    const nextNum = myStudents.length + 1;
    const defaultRoll = `${deptCode}${String(nextNum).padStart(3, '0')}`;
    setForm({
      ...EMPTY_FORM,
      rollNo: defaultRoll
    });
    setEditTarget(null);
    setFormErrors({});
    setSaved(false);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setForm({ ...s });
    setEditTarget(s.rollNo);
    setFormErrors({});
    setSaved(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Student Name is required';
    if (!form.section) e.section = 'Section is required';
    if (!form.email.trim()) e.email = 'Email Address is required';
    if (!form.hostelRequired) e.hostelRequired = 'Hostel requirement is required';
    if (!form.busRoute) e.busRoute = 'Bus Route is required (or N/A)';
    if (!form.transportFeeStatus) e.transportFeeStatus = 'Transport Fee status is required';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    const numAtt = parseInt(form.attendance, 10);
    
    // For new students, generate the ID if rollNo is empty
    const finalRollNo = editTarget ? form.rollNo : generateRegNo(deptCode, students.length);

    const payload = {
      ...form,
      id: finalRollNo,
      rollNo: finalRollNo,
      year: deriveYearFromSem(form.sem),
      attendance: isNaN(numAtt) ? 0 : numAtt,
      cgpa: parseFloat(form.cgpa) || 0,
      deptCode: deptCode,
      dept: HOD_DEPT
    };

    try {
      if (editTarget) {
        await updateStudent(editTarget, payload);
        setStudents(students.map(s => s.rollNo === editTarget ? payload : s));
      } else {
        const res = await createStudent(payload);
        // Fallback to payload if the server doesn't return the full created object immediately
        const createdStudent = res.data && res.data.id ? res.data : payload; 
        setStudents([createdStudent, ...students]);
      }
      setSaved(true);
      setTimeout(() => { closeModal(); setSaved(false); }, 800);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Failed to save student. Ensure backend is running and valid data was provided.');
    }
  };

  const handleDelete = async (rollNo) => {
    if (window.confirm('Delete this student record? This cannot be undone.')) {
      const updated = students.filter(s => s.rollNo !== rollNo);
      setStudents(updated);
      try {
        await deleteStudent(rollNo).catch(() => null);
      } catch (err) {}
    }
  };

  const field = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className="student-management animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Students Portal</h1>
          <p className="text-muted">Manage students under <strong>{deptCode} ({HOD_DEPT})</strong> department.</p>
        </div>
        <button 
          id="add-student-btn" 
          className="btn-primary" 
          style={{ background: '#3730A5', border: 'none', boxShadow: '0 4px 15px -5px rgba(55, 48, 165, 0.4)' }}
          onClick={openAdd}
        >
          <Plus size={18} /> Register Student
        </button>
      </div>

      {/* Summary Row */}
      <div className="sm-summary-row">
        {[
          { label: 'Total Scoped Students', value: myStudents.length, cls: '' },
          { label: 'Active Status', value: myStudents.filter(s => !s.status || s.status.toLowerCase() === 'active').length, cls: 'text-success' },
          { label: 'High Attendance (≥90%)', value: myStudents.filter(s => parseFloat(s.attendance) >= 90).length, cls: 'gradient-text' },
          { label: 'Low Attendance (<75%)', value: myStudents.filter(s => parseFloat(s.attendance) < 75).length, cls: 'text-danger' },
        ].map((c, i) => (
          <div key={i} className="sm-summary-card glass-card">
            <span className="sm-summary-label">{c.label}</span>
            <span className={`sm-summary-value ${c.cls}`}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Table Wrapper */}
      <div className="glass-card table-wrapper">
        {/* Filters */}
        <div className="filters-row">
          <div className="search-box">
            <Search size={17} className="text-muted" />
            <input
              type="text" placeholder="Search by student name, roll no..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="clear-btn" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
          <div className="filter-group">
            <div className="filter-select-wrapper">
              <Filter size={13} className="text-muted" />
              <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                <option value="All">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="filter-select-wrapper">
              <GraduationCap size={13} className="text-muted" />
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table exactly as requested */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th className="sortable-th" onClick={() => handleSort('name')}>
                  Student Name {makeSortIcon('name', sortKey, sortAsc)}
                </th>
                <th className="sortable-th" onClick={() => handleSort('rollNo')}>
                  Roll No {makeSortIcon('rollNo', sortKey, sortAsc)}
                </th>
                <th className="sortable-th" onClick={() => handleSort('year')}>
                  Year {makeSortIcon('year', sortKey, sortAsc)}
                </th>
                <th className="sortable-th" onClick={() => handleSort('section')}>
                  Section {makeSortIcon('section', sortKey, sortAsc)}
                </th>
                <th className="sortable-th" onClick={() => handleSort('attendance')}>
                  Attendance {makeSortIcon('attendance', sortKey, sortAsc)}
                </th>
                <th className="sortable-th" onClick={() => handleSort('status')}>
                  Status {makeSortIcon('status', sortKey, sortAsc)}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 15, borderRadius: 4, width: j === 1 ? 140 : 65 }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-data">No students found matching filters in {deptCode} department.</td>
                </tr>
              ) : (
                filtered.map((s, idx) => (
                  <tr key={s.rollNo}>
                    <td className="cell-num">{idx + 1}</td>
                    <td>
                      <div className="name-cell">
                        <div className={`av ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>{getInitials(s.name)}</div>
                        <div>
                          <p className="name-primary">{s.name}</p>
                          <p className="name-sub">{s.email || `${s.name.toLowerCase().replace(' ', '')}@college.edu`}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="reg-no">{s.rollNo}</span></td>
                    <td><span className="badge-outline">{s.year}</span></td>
                    <td><span className="badge-outline font-semibold">{s.section}</span></td>
                    <td>
                      <div className="att-cell">
                        <span style={{ color: getAttColor(s.attendance), fontWeight: 700, minWidth: 38 }}>{s.attendance}</span>
                        <div className="bar-bg">
                          <div className="bar-fill" style={{ width: s.attendance, background: getAttColor(s.attendance) }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${s.status === 'Active' ? 'status-active' : 'status-inactive'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="act-btn" title="Edit" onClick={() => openEdit(s)}><Edit2 size={15} /></button>
                        <button className="act-btn act-delete" title="Delete" onClick={() => handleDelete(s.rollNo)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="table-footer">
            Showing <strong>{filtered.length}</strong> students scoped under <strong>{deptCode} Department</strong>
          </div>
        )}
      </div>

      {/* REGISTER / EDIT MODAL EXACTLY MATCHING USER SCREENSHOT + ADDED ROLL NUMBER & SECTION */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div>
                <h2>{editTarget ? 'Edit Student Details' : 'Register New Student'}</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  Add a student under your department.
                </p>
              </div>
              <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {saved && (
              <div className="modal-success-flash">
                <CheckCircle size={18} /> Student saved successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="modal-body" style={{ overflowY: 'auto' }}>
                <div className="form-grid">
                  <div className="sm-form-section-title">Personal Information</div>

                  {/* Student Name */}
                  <div className={`fld ${formErrors.name ? 'fld-error' : ''}`}>
                    <label><User size={13}/> Student Name <span className="req">*</span></label>
                    <input placeholder="e.g. John Doe" {...field('name')} />
                    {formErrors.name && <span className="err-msg">{formErrors.name}</span>}
                  </div>

                  {/* Register Number / Roll No - Only show on Edit */}
                  {editTarget && (
                    <div className={`fld ${formErrors.rollNo ? 'fld-error' : ''}`}>
                      <label><Hash size={13}/> Register Number <span className="req">*</span></label>
                      <input
                        placeholder="e.g. CSE006"
                        {...field('rollNo')}
                        disabled={true}
                        style={{opacity: 0.6, cursor:'not-allowed'}}
                      />
                    </div>
                  )}

                  {/* Email Address */}
                  <div className={`fld ${formErrors.email ? 'fld-error' : ''}`}>
                    <label><Mail size={13}/> Email Address <span className="req">*</span></label>
                    <input type="email" placeholder="student@college.edu" {...field('email')} />
                    {formErrors.email && <span className="err-msg">{formErrors.email}</span>}
                  </div>

                  {/* Phone Number */}
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

                  {/* Department (Locked) */}
                  <div className="fld">
                    <label><BookOpen size={13} /> Department (Locked)</label>
                    <input value={HOD_DEPT} disabled style={{ opacity: 0.6, cursor: 'not-allowed', backgroundColor: 'var(--bg-secondary)' }} />
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
                    <input type="number" step="0.1" min="0" max="10" placeholder="0.0 - 10.0" {...field('cgpa')} />
                    {formErrors.cgpa && <span className="err-msg">{formErrors.cgpa}</span>}
                  </div>

                  {/* Attendance */}
                  <div className={`fld ${formErrors.attendance ? 'fld-error' : ''}`}>
                    <label><Percent size={13}/> Attendance %</label>
                    <input type="text" placeholder="0 - 100" {...field('attendance')} />
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
                    <label>Section <span className="req">*</span></label>
                    <select {...field('section')}>
                      {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  </div>

                  {/* Batch */}
                  <div className="fld">
                    <label>Batch</label>
                    <input type="text" placeholder="e.g. 2024" {...field('batch')} />
                  </div>

                  {/* Admission Date */}
                  <div className="fld">
                    <label>Admission Date</label>
                    <input type="date" {...field('admissionDate')} />
                  </div>

                  {/* Status */}
                  <div className="fld">
                    <label><CheckCircle size={13}/> Student Status</label>
                    <div className="status-toggle-row" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      {['Active', 'Inactive'].map(opt => (
                        <button
                          key={opt} type="button"
                          className={`status-toggle-opt ${form.status === opt ? 'selected' : ''}`}
                          onClick={() => setForm(f => ({ ...f, status: opt }))}
                          style={{
                            flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid',
                            borderColor: form.status === opt ? 'var(--primary)' : '#e5e7eb',
                            backgroundColor: form.status === opt ? 'var(--primary-light)' : 'transparent',
                            color: form.status === opt ? 'var(--primary)' : '#6b7280',
                            fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '0.75rem'
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm-form-section-title">Transport & Hostel</div>

                  {/* Hostel & Transport Required Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className={`fld ${formErrors.hostelRequired ? 'fld-error' : ''}`}>
                      <label>Hostel Required? <span className="req">*</span></label>
                      <select {...field('hostelRequired')}>
                        <option value="">— Select —</option>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      {formErrors.hostelRequired && <span className="err-msg">{formErrors.hostelRequired}</span>}
                    </div>

                    <div className={`fld ${formErrors.transportRequired ? 'fld-error' : ''}`}>
                      <label>Transport Required? <span className="req">*</span></label>
                      <select {...field('transportRequired')}>
                        <option value="">— Select —</option>
                        <option value="No">No</option>
                        <option value="Yes">Yes</option>
                      </select>
                      {formErrors.transportRequired && <span className="err-msg">{formErrors.transportRequired}</span>}
                    </div>
                  </div>

                  {/* Hostel Details */}
                  {form.hostelRequired === 'Yes' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Transport Details */}
                  {form.transportRequired === 'Yes' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                        {formErrors.transportFeeStatus && <span className="err-msg">{formErrors.transportFeeStatus}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-ft">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" id="save-student-btn" className="btn-primary" style={{ background: '#3730A5', border: 'none', boxShadow: '0 4px 15px -5px rgba(55, 48, 165, 0.4)' }}>Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HodStudents;
