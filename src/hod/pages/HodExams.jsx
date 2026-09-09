import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Search, Edit2, Trash2, X, MapPin, Clock, BookOpen } from 'lucide-react';
import {
  getExams,
  getSubjects,
  getSections,
  getAcademicYears,
  getCourses,
  getSemesters,
  createExam,
  updateExam,
  deleteExam
} from '../../api/index';

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
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name:'Internal Assessment 1 (IA-1)', academicYearId:'', courseId:'', subjectId:'', subject:'', sem:'Sem 3', section:'A', date:'', time:'10:00 AM – 12:00 PM', room:'', maxMarks:100 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();

    const fetchLiveSubjects = async () => {
      try {
        const response = await getSubjects({
          dept: hod.dept,
          department: hod.dept
        });

        const data = response.data;
        const list = Array.isArray(data)
          ? data
          : data.subjects || data.data || [];

        setSubjects(
          list.map(subject => ({
            ...subject,
            id: subject._id || subject.id,
            name: subject.subjectName || subject.name,
            code: subject.subjectCode || subject.code
          }))
        );
      } catch (error) {
        console.error('Failed to load subjects:', error);
        setSubjects([]);
      }
    };

    const fetchLiveSections = async () => {
      try {
        const response = await getSections();
        const data = response.data;

        const list = Array.isArray(data)
          ? data
          : data.sections || data.data || [];

        setSections(
          list.filter(section => section.status !== 'Inactive')
        );
      } catch (error) {
        console.error('Failed to load sections:', error);
        setSections([]);
      }
    };

    const loadAcademicYears = async () => {
      try {
        const response = await getAcademicYears();
        const data = response.data;

        const yearList = Array.isArray(data)
          ? data
          : (data.academicYears || data.data || []);

        setAcademicYears(yearList);
      } catch (error) {
        console.error('Failed to load academic years:', error);
        setAcademicYears([]);
      }
    };

    const loadSemesters = async () => {
      try {
        const response = await getSemesters();
        const data = response.data;

        const semList = Array.isArray(data)
          ? data
          : (data.semesters || data.data || []);

        setSemesters(semList);
      } catch (error) {
        console.error('Failed to load semesters:', error);
        setSemesters([]);
      }
    };

    const loadCourses = async () => {
      try {
        const response = await getCourses();
        const data = response.data;

        const courseList = Array.isArray(data)
          ? data
          : (data.courses || data.data || []);

        setCourses(courseList);
      } catch (error) {
        console.error('Failed to load courses:', error);
        setCourses([]);
      }
    };

    fetchLiveSubjects();
    fetchLiveSections();
    loadAcademicYears();
    loadSemesters();
    loadCourses();
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

  const openAdd = () => { setForm({ name:'Internal Assessment 1 (IA-1)', academicYearId:'', courseId: '', subjectId: '', subject:subjects[0]?.name||'', sem:'Sem 3', section:'A', date:new Date().toISOString().split('T')[0], time:'10:00 AM – 12:00 PM', room:'', maxMarks:100 }); setEditId(null); setModal(true); };
  const openEdit = (ex) => { setForm({ name:ex.name, academicYearId: ex.academicYearId?._id || ex.academicYearId || '', courseId: ex.courseId?._id || ex.courseId || '', subjectId: ex.subjectId?._id || ex.subjectId || '', subject:ex.subject, sem:ex.sem || 'Sem 3', section:ex.section || 'A', date:ex.date, time:ex.time, room:ex.room, maxMarks:ex.maxMarks }); setEditId(ex._id || ex.id); setModal(true); };

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
    if (ex.subject?.toLowerCase() === 'general course 1') return false;
    const q = search.toLowerCase();
    return ex.name.toLowerCase().includes(q) || ex.subject.toLowerCase().includes(q) || ex.room.toLowerCase().includes(q);
  });

  const departmentCourses = courses.filter(course => {
    const currentCourseId = String(course.id || course._id);

    return subjects.some(subject => {
      const subjectCourse = subject.courseId;
      const subjectCourseId =
        typeof subjectCourse === 'object' && subjectCourse !== null
          ? subjectCourse.id || subjectCourse._id
          : subjectCourse;

      return [course.id, course._id]
        .filter(Boolean)
        .some(id => String(id) === String(subjectCourseId));
    });
  });

  const courseSemesters = semesters.filter(semester => {
    const semesterCourseId =
      semester.courseId?._id || semester.courseId;

    return (
      form.courseId &&
      String(semesterCourseId) === String(form.courseId)
    );
  });

  const selectedSemNum = (form.sem || '').replace(/\D/g, '');
  const semObj = courseSemesters.find(
    s => s.name === form.sem || String(s.semesterNumber) === selectedSemNum || s.id === form.sem || s._id === form.sem
  );
  const semId = semObj?._id || semObj?.id;
  const semesterIds = [
    semObj?._id,
    semObj?.id
  ]
    .filter(Boolean)
    .map(String);

  const filteredSubjects = subjects.filter(s => {
    const subjectCourseId =
      s.courseId?._id || s.courseId;

    if (
      form.courseId &&
      String(subjectCourseId) !== String(form.courseId)
    ) {
      return false;
    }

    if (!form.sem) return true;
    if (s.semester === form.sem) return true;
    if (s.semester && String(s.semester).toLowerCase() === form.sem.toLowerCase()) return true;
    if (s.semester && String(s.semester).replace(/\D/g, '') === selectedSemNum) return true;
    if (semId && (s.semesterId === semId || String(s.semesterId) === String(semId))) return true;
    return false;
  });

  const availableSubjects = filteredSubjects;

  const filteredSections = sections.filter(section => {
    const sectionSemesterId =
      section.semesterId?._id ||
      section.semesterId?.id ||
      section.semesterId;

    if (semesterIds.includes(String(sectionSemesterId))) {
      return true;
    }
    return false;
  });

  const sectionOptions = [
    ...new Set(
      filteredSections
        .map(section => section.name || section.sectionName)
        .filter(Boolean)
    )
  ];

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
          <div
            className="modal-card glass-card"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header"><h2>{editId?'Edit Exam':'Schedule Exam'}</h2><button className="btn-icon" onClick={()=>setModal(false)}><X size={18}/></button></div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Academic Year *</label>
                  <select
                    required
                    value={form.academicYearId}
                    onChange={e =>
                      setForm({ ...form, academicYearId: e.target.value })
                    }
                  >
                    <option value="">Select Academic Year</option>

                    {academicYears.map(year => (
                      <option key={year._id || year.id} value={year._id || year.id}>
                        {year.year || year.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group"><label>Exam Type</label><select value={form.name} onChange={e=>setForm({...form,name:e.target.value})}>
                  {EXAM_TYPES.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </optgroup>
                  ))}
                </select></div>
                <div className="form-group">
                  <label>Course *</label>
                  <select
                    required
                    value={form.courseId}
                    onChange={e =>
                      setForm({
                        ...form,
                        courseId: e.target.value,
                        sem: '',
                        section: '',
                        subject: ''
                      })
                    }
                  >
                    <option value="">Select Course</option>

                    {departmentCourses.map(course => (
                      <option
                        key={course.id || course._id}
                        value={course.id || course._id}
                      >
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Semester</label>
                  <select
                    required
                    value={form.sem}
                    disabled={!form.courseId}
                    onChange={e =>
                      setForm({
                        ...form,
                        sem: e.target.value,
                        section: '',
                        subject: ''
                      })
                    }
                  >
                    <option value="">Select Semester</option>

                    {courseSemesters.map(semester => {
                      const semesterName =
                        semester.name || `Semester ${semester.semesterNumber}`;

                      return (
                        <option
                          key={semester._id || semester.id}
                          value={semesterName}
                        >
                          {semesterName}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    required
                    value={form.subjectId}
                    disabled={!form.sem}
                    onChange={e => {
                      const selectedId = e.target.value;

                      const selectedSubject = availableSubjects.find(
                        subject =>
                          String(subject._id || subject.id) === String(selectedId)
                      );

                      setForm({
                        ...form,
                        subjectId: selectedId,
                        subject: selectedSubject?.name || ''
                      });
                    }}
                  >
                    <option value="">Select Subject</option>

                    {availableSubjects.map(subject => (
                      <option
                        key={subject._id || subject.id}
                        value={subject._id || subject.id}
                      >
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section *</label>
                  <select
                    required
                    value={form.section}
                    onChange={e => setForm({ ...form, section: e.target.value })}
                  >
                    <option value="">Select Section</option>
                    {sectionOptions.map(sectionName => (
                      <option key={sectionName} value={sectionName}>
                        Section {sectionName}
                      </option>
                    ))}
                  </select>
                </div>
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
