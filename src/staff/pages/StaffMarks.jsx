import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Edit2, X, CheckCircle, Percent,
  AlertTriangle, ArrowLeft, GraduationCap, Save
} from 'lucide-react';
import { getStudents, getAllMarks, createMark, getMyFacultyAllocations } from '../../api/index';
import CustomSelect from '../../components/CustomSelect';
import './StaffMarks.css';

// Fallback session
const DEFAULT_SESSION = {
  name: 'Dr. Ananya Rao',
  dept: 'Computer Science',
  deptCode: 'CS',
  role: 'Staff'
};

const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal'];

const SEMESTER_SUBJECT_MAP = {
  'Semester 1': ['Programming in C', 'Engineering Mathematics I', 'Engineering Physics', 'Technical English'],
  'Semester 2': ['Data Structures', 'Engineering Mathematics II', 'Digital Electronics', 'Python Programming'],
  'Semester 3': ['Java Programming', 'Database Management Systems', 'Operating Systems', 'Computer Networks'],
  'Semester 4': ['Design & Analysis of Algorithms', 'Software Engineering', 'Theory of Computation', 'Object Oriented Analysis'],
  'Semester 5': ['Web Technology', 'Compiler Design', 'Computer Architecture', 'Artificial Intelligence'],
  'Semester 6': ['Machine Learning', 'Cloud Computing', 'Cyber Security', 'Mobile Application Development'],
  'Semester 7': ['Big Data Analytics', 'Internet of Things (IoT)', 'Blockchain Technology', 'Elective I'],
  'Semester 8': ['Deep Learning', 'Project Work & Viva', 'Elective II', 'Industrial Internship']
};

// DEPT_SUBJECTS removed as it is fetched from MongoDB
const StaffMarks = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);

  // Database states
  const [rawMarksList, setRawMarksList] = useState([]);
  const [students, setStudents] = useState([]);

  const [targetSem, setTargetSem] = useState('Semester 3');
  const [targetSection, setTargetSection] = useState('A');
  const [search, setSearch] = useState('');
  
  const [subjectsList, setSubjectsList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Modal edit states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ id: '', name: '', sem: '', subjects: [] });
  const [saved, setSaved] = useState(false);

  const normalizeSem = (semStr) => {
    if (!semStr) return 'Semester 3';
    const num = semStr.replace(/[^0-9]/g, '');
    return num ? `Semester ${num}` : semStr;
  };

  const loadData = async (activeSem = targetSem) => {
    try {
      const [studRes, marksRes, allocRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getAllMarks().catch(() => ({ data: [] })),
        getMyFacultyAllocations().catch(() => ({ data: [] }))
      ]);

      let backendStudents = studRes?.data || [];
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedStudents = [...backendStudents];
      erpStudents.forEach(ls => {
        if (!combinedStudents.find(cs => cs.id === ls.id || cs.rollNo === ls.rollNo)) {
          combinedStudents.push(ls);
        }
      });

      setStudents(combinedStudents);

      let backendMarks = marksRes?.data || [];
      const localMarks = JSON.parse(localStorage.getItem(`erp_marks_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const combinedMarks = [...backendMarks];
      localMarks.forEach(lm => {
        const existingIdx = combinedMarks.findIndex(cm => cm.studentId === lm.studentId && cm.subject === lm.subject);
        if (existingIdx >= 0) {
          combinedMarks[existingIdx] = lm;
        } else {
          combinedMarks.push(lm);
        }
      });
      setRawMarksList(combinedMarks);

      const allocations = allocRes?.data || [];
      let currentSem = activeSem || targetSem || 'Semester 3';

      const dynSubjects = [];
      const dynSections = [];
      allocations.forEach(alloc => {
        const normAllocSem = normalizeSem(alloc.semester);
        if ((normAllocSem === currentSem || normAllocSem === normalizeSem(currentSem)) && alloc.subjectId) {
          if (!dynSubjects.includes(alloc.subjectId.subjectName)) dynSubjects.push(alloc.subjectId.subjectName);
          if (!dynSections.includes(alloc.section)) dynSections.push(alloc.section);
        }
      });

      // Fallback subjects for current semester if no specific DB allocation record found
      if (dynSubjects.length === 0) {
        const normSemKey = normalizeSem(currentSem);
        const mapSubs = SEMESTER_SUBJECT_MAP[normSemKey] || ['Java Programming', 'Database Management Systems'];
        dynSubjects.push(...mapSubs);
      }
      if (dynSections.length === 0) dynSections.push('A');
      
      setSubjectsList(dynSubjects);
      setSectionsList(dynSections);
      if (!dynSubjects.includes(selectedSubject)) setSelectedSubject(dynSubjects[0]);
      if (!dynSections.includes(targetSection)) setTargetSection(dynSections[0]);
    } catch (err) {
      console.error('Failed to load marks page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Session check
    const session = sessionStorage.getItem('staff_session');
    let activeStaff = DEFAULT_SESSION;
    if (session) {
      activeStaff = JSON.parse(session);
      setStaffSession(activeStaff);
    } else {
      navigate('/staff/login');
      return;
    }
    loadData();
  }, [navigate]);

  const staffDept = staffSession?.dept || 'Computer Science Engineering';
  const [inlineMarks, setInlineMarks] = useState({});
  const [inlineSaving, setInlineSaving] = useState({});

  useEffect(() => {
    // Populate inlineMarks map for current selectedSubject
    const map = {};
    students.forEach(s => {
      const sId = s.id || s._id;
      const existing = rawMarksList.find(m => 
        (m.studentId === sId || m.studentId === s.id || m.studentId === s._id || m.studentName === s.name) &&
        (m.subject === selectedSubject || 
         (m.subject && selectedSubject && m.subject.toLowerCase().trim() === selectedSubject.toLowerCase().trim()) ||
         (m.subject && selectedSubject && (m.subject.toLowerCase().includes(selectedSubject.toLowerCase()) || selectedSubject.toLowerCase().includes(m.subject.toLowerCase()))))
      );
      map[sId] = {
        internal: existing ? (existing.internalMarks != null ? existing.internalMarks : '') : '',
        external: existing ? (existing.semesterMarks != null ? existing.semesterMarks : '') : ''
      };
    });
    setInlineMarks(map);
  }, [students, rawMarksList, selectedSubject, targetSem]);

  const handleInlineChange = (studentId, field, val) => {
    setInlineMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: val
      }
    }));
  };

  const saveToLocalStorageMarks = (newMarks) => {
    try {
      const tenantKey = `erp_marks_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
      const existing = JSON.parse(localStorage.getItem(tenantKey) || '[]');
      const updated = [...existing];
      newMarks.forEach(nm => {
        const idx = updated.findIndex(m => m.studentId === nm.studentId && m.subject === nm.subject);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...nm };
        } else {
          updated.push({ _id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4), ...nm });
        }
      });
      localStorage.setItem(tenantKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to sync marks to localStorage:', e);
    }
  };

  const handleSaveSingleStudent = async (student) => {
    const sId = student.id || student._id;
    const entry = inlineMarks[sId] || {};
    const payload = [{
      studentId: sId,
      studentName: student.name,
      department: staffDept,
      semester: targetSem,
      subject: selectedSubject || 'Java Programming',
      internalMarks: Number(entry.internal || 0),
      semesterMarks: Number(entry.external || 0)
    }];

    try {
      setInlineSaving(prev => ({ ...prev, [sId]: true }));
      saveToLocalStorageMarks(payload);
      await createMark(payload).catch(() => null);
      await loadData();
      alert('✅ Marks saved successfully for ' + student.name);
    } catch (err) {
      alert('Failed to save marks: ' + err.message);
    } finally {
      setInlineSaving(prev => ({ ...prev, [sId]: false }));
    }
  };

  const handleSaveAllInline = async () => {
    const payloadArray = filteredStudents.map(student => {
      const sId = student.id || student._id;
      const entry = inlineMarks[sId] || {};
      return {
        studentId: sId,
        studentName: student.name,
        department: staffDept,
        semester: targetSem,
        subject: selectedSubject || 'Java Programming',
        internalMarks: Number(entry.internal || 0),
        semesterMarks: Number(entry.external || 0)
      };
    });

    try {
      setInlineSaving({ all: true });
      saveToLocalStorageMarks(payloadArray);
      await createMark(payloadArray).catch(() => null);
      await loadData();
      alert('✅ All student marks saved successfully!');
    } catch (err) {
      alert('Failed to save marks: ' + err.message);
    } finally {
      setInlineSaving({});
    }
  };

  // Filter students to current department and class semester
  let myClassStudents = students.filter(s => {
    const isDeptMatch = !s.dept || s.dept === staffDept || s.dept === 'Computer Science' || s.dept === 'Computer Science Engineering';
    const isSemMatch = !s.sem || normalizeSem(s.sem) === normalizeSem(targetSem);
    const isSecMatch = !s.section || s.section === targetSection;
    return isDeptMatch && isSemMatch && isSecMatch;
  });

  if (myClassStudents.length === 0) {
    myClassStudents = students.filter(s => !s.dept || s.dept === staffDept || s.dept === 'Computer Science' || s.dept === 'Computer Science Engineering');
  }
  
  const filteredStudents = myClassStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())
  );

  const getCgpaColor = (c) => c >= 9 ? 'var(--success)' : c < 7 ? 'var(--danger)' : 'var(--warning)';

  const openEdit = async (s) => {
    // Filter by department, semester and target section!
    // Since this is Staff marks entry, only allow editing subjects assigned to them via faculty allocation
    availableSubjects = subjectsList.filter(s => s !== 'No Subjects Assigned');
    
    // If no subjects defined for this semester yet, give an empty array
    if (availableSubjects.length === 0) {
      console.warn('No subjects found for', staffDept, s.sem);
    }

    // Prepare default rows for each allocated subject in this semester
    const studentSubjects = availableSubjects.map(subName => {
      const existingMark = rawMarksList.find(m => m.studentId === s.id && m.subject === subName);
      return {
        subject: subName,
        internal: existingMark?.internalMarks || 0,
        external: existingMark?.semesterMarks || 0
      };
    });

    setForm({
      id: s.id,
      name: s.name,
      sem: s.sem,
      availableSubjects,
      subjects: studentSubjects.length > 0 ? studentSubjects : [{ subject: '', internal: 0, external: 0 }]
    });
    setEditTarget(s.id);
    setSaved(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSubjectChange = (idx, field, value) => {
    const updatedSubjects = [...form.subjects];
    updatedSubjects[idx][field] = value;
    setForm({ ...form, subjects: updatedSubjects });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      // Filter out empty subjects
      const validSubjects = form.subjects.filter(sub => sub.subject && sub.subject.trim() !== '');
      if (validSubjects.length === 0) {
        alert('Please enter at least one subject name.');
        return;
      }

      const payloadArray = validSubjects.map(sub => ({
        studentId: form.id,
        studentName: form.name,
        department: staffDept,
        semester: form.sem,
        subject: sub.subject,
        internalMarks: Number(sub.internal),
        semesterMarks: Number(sub.external)
      }));

      // Bulk POST to save all marks at once
      const res = await createMark(payloadArray);

      if (res?.status === 200 || res?.status === 201) {
        setSaved(true);
        await loadData();
        setTimeout(() => {
          closeModal();
          setSaved(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to bulk update student marks:', err);
    }
  };

  return (
    <div className="marks-management-staff animate-fade-in">
      <div className="page-header-staff">
        <div className="header-left">
          
          <div>
            <h1>Upload Marks</h1>
            <p className="text-muted">Enter internals and semester scores for all subjects simultaneously.</p>
          </div>
        </div>
      </div>

      {/* Marks Directory Table */}
      <div className="glass-card table-section-card" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div className="table-filters-bar" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Student Marks Roster</h3>
            <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.82rem' }}>Department of {staffDept}</p>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Semester</label>
              <select 
                value={targetSem} 
                onChange={e => {
                  setTargetSem(e.target.value);
                  loadData(e.target.value);
                }} 
                style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
              >
                {['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            

            
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Subject</label>
              <select 
                value={selectedSubject} 
                onChange={e => setSelectedSubject(e.target.value)} 
                style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
              >
                {subjectsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Search</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', pointerEvents: 'none' }} size={16} />
                <input 
                  type="text"
                  placeholder="Search students..." 
                  style={{ padding: '0.5rem 0.8rem 0.5rem 2.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.88rem', outline: 'none' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0.75rem 1.5rem', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Subject: <strong style={{ color: 'var(--primary)' }}>{selectedSubject || 'Java Programming'}</strong> ({filteredStudents.length} Students)
          </span>
          <button 
            className="btn-primary" 
            onClick={handleSaveAllInline}
            disabled={inlineSaving.all}
            style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={15} /> {inlineSaving.all ? 'Saving All...' : 'Save All Marks'}
          </button>
        </div>

        <div className="table-container-attendance">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Register No</th>
                <th>Student Name</th>
                <th>Internal (Max 40)</th>
                <th>External (Max 60)</th>
                <th>Total (100)</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <div className="skeleton" style={{ height: '20px', borderRadius: '4px' }}></div>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-students">No student academic records found.</td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const sId = s.id || s._id;
                  const currentMarks = inlineMarks[sId] || { internal: '', external: '' };
                  const total = (Number(currentMarks.internal) || 0) + (Number(currentMarks.external) || 0);

                  return (
                    <tr key={sId}>
                      <td className="text-muted">{idx + 1}</td>
                      <td><span className="register-no-badge">{s.id}</span></td>
                      <td>
                        <div className="student-profile-cell">
                          <div className={`student-avatar-cell ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                            {s.name[0]}
                          </div>
                          <span className="font-semibold">{s.name}</span>
                        </div>
                      </td>
                      <td>
                        <input 
                          type="number"
                          min="0"
                          max="40"
                          placeholder="e.g. 32"
                          value={currentMarks.internal}
                          onChange={e => handleInlineChange(sId, 'internal', e.target.value)}
                          style={{ width: '110px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontWeight: 600, outline: 'none' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number"
                          min="0"
                          max="60"
                          placeholder="e.g. 48"
                          value={currentMarks.external}
                          onChange={e => handleInlineChange(sId, 'external', e.target.value)}
                          style={{ width: '110px', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontWeight: 600, outline: 'none' }}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: total >= 50 ? 'var(--success)' : total > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {total} / 100
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-primary" 
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onClick={() => handleSaveSingleStudent(s)}
                          disabled={inlineSaving[sId]}
                        >
                          <Save size={13} /> {inlineSaving[sId] ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2>{form.name} - Marks Entry</h2>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                  Register No: {form.id} | Class: {form.sem}
                </p>
              </div>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>

            {saved && (
              <div className="modal-success-flash" style={{ marginBottom: '1rem' }}>
                <CheckCircle size={18} /> All semester marks successfully saved!
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="table-container-attendance" style={{ margin: '0', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ minWidth: '100%', marginBottom: '1rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ backgroundColor: 'var(--surface-color)' }}>Subject</th>
                      <th style={{ backgroundColor: 'var(--surface-color)' }}>Internal (Max 50)</th>
                      <th style={{ backgroundColor: 'var(--surface-color)' }}>External (Max 100)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.subjects.map((sub, idx) => (
                      <tr key={idx}>
                        <td>
                          {form.availableSubjects && form.availableSubjects.length > 0 ? (
                            <div style={{ fontWeight: 600, color: 'var(--text-main)', padding: '0.4rem 0' }}>
                              {sub.subject || 'Unknown Subject'}
                            </div>
                          ) : (
                            <div style={{ color: 'var(--danger)', fontStyle: 'italic', padding: '0.4rem 0' }}>
                              No master subjects defined
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            required
                            disabled={!(form.availableSubjects && form.availableSubjects.length > 0)}
                            style={{ width: '80px', padding: '0.4rem' }}
                            value={sub.internal}
                            onChange={e => handleSubjectChange(idx, 'internal', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            required
                            disabled={!(form.availableSubjects && form.availableSubjects.length > 0)}
                            style={{ width: '80px', padding: '0.4rem' }}
                            value={sub.external}
                            onChange={e => handleSubjectChange(idx, 'external', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary"><Save size={16} /> Save All Marks</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffMarks;
