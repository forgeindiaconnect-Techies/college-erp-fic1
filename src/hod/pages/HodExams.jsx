import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, Plus, Search, Edit2, Trash2, X, MapPin, Clock, BookOpen, 
  UserCheck, Users, ShieldAlert, FileText, Printer, Eye, CheckCircle2, Award
} from 'lucide-react';
import {
  getExams,
  getSubjects,
  getSections,
  getAcademicYears,
  getCourses,
  getSemesters,
  getStaff,
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

const getExamType = examName => {
  const name = String(examName || '').toLowerCase();

  if (name.includes('ia-1')) return 'CIA 1';
  if (name.includes('ia-2')) return 'CIA 2';
  if (name.includes('ia-3')) return 'CIA 3';

  if (name.includes('mid-semester')) {
    return 'Model';
  }

  if (
    name.includes('end semester') ||
    name.includes('university semester')
  ) {
    return 'Semester';
  }

  if (
    name.includes('lab') ||
    name.includes('practical') ||
    name.includes('viva')
  ) {
    return 'Practical';
  }

  return 'Internal';
};

const HodExams = () => {
  const hod = getHodSession();
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' or 'reappear-apps'
  const [arrearApplications, setArrearApplications] = useState([]);
  const [viewSlipModal, setViewSlipModal] = useState(null);

  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: 'Internal Assessment 1 (IA-1)',
    academicYearId: '',
    courseId: '',
    subjectId: '',
    subject: '',
    sem: 'Sem 3',
    section: 'A',
    date: '',
    time: '10:00 AM – 12:00 PM',
    room: '',
    maxMarks: 100,
    invigilatorId: '',
    invigilatorName: ''
  });
  const [loading, setLoading] = useState(true);

  const loadArrearApplications = () => {
    try {
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const raw = localStorage.getItem(`erp_arrear_applications_${tenantId}`) || localStorage.getItem('erp_arrear_applications');
      if (raw) {
        const all = JSON.parse(raw);
        setArrearApplications(all);
      } else {
        setArrearApplications([]);
      }
    } catch (e) {
      setArrearApplications([]);
    }
  };

  useEffect(() => {
    loadArrearApplications();
    const handleUpdate = () => loadArrearApplications();
    window.addEventListener('erp_arrear_applied', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('erp_arrear_applied', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  useEffect(() => {
    fetchExams();

    const fetchLiveStaff = async () => {
      try {
        const res = await getStaff();
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        setStaffMembers(list);
      } catch (err) {
        console.error('Failed to load staff list for invigilation:', err);
      }
    };
    fetchLiveStaff();

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

  const openAdd = () => {
    setForm({
      name: 'Internal Assessment 1 (IA-1)',
      academicYearId: '',
      courseId: '',
      subjectId: '',
      subject: subjects[0]?.name || '',
      sem: 'Sem 3',
      section: 'A',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM – 12:00 PM',
      room: '',
      maxMarks: 100,
      invigilatorId: '',
      invigilatorName: ''
    });
    setEditId(null);
    setModal(true);
  };

  const openEdit = (ex) => {
    setForm({
      name: ex.name,
      academicYearId: ex.academicYearId?._id || ex.academicYearId || '',
      courseId: ex.courseId?._id || ex.courseId || '',
      subjectId: ex.subjectId?._id || ex.subjectId || '',
      subject: ex.subject,
      sem: ex.sem || 'Sem 3',
      section: ex.section || 'A',
      date: ex.date,
      time: ex.time,
      room: ex.room || ex.hallName || '',
      maxMarks: ex.maxMarks || 100,
      invigilatorId: ex.invigilatorId || '',
      invigilatorName: ex.invigilatorName || ex.invigilator || ''
    });
    setEditId(ex._id || ex.id);
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      examType: getExamType(form.name),
      dept: hod.dept,
      maxMarks: Number(form.maxMarks),
      invigilator: form.invigilatorName,
      invigilatorName: form.invigilatorName,
      invigilatorId: form.invigilatorId,
      hallName: form.room
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

  const deptArrears = useMemo(() => {
    const d = (hod.dept || '').toLowerCase();
    return arrearApplications.filter(a => {
      if (!d || d === 'general' || d.includes('all')) return true;
      const appDept = (a.department || '').toLowerCase();
      return appDept.includes(d) || d.includes(appDept) || (a.code || '').toLowerCase().includes(d);
    });
  }, [arrearApplications, hod.dept]);

  const filteredArrears = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return deptArrears;
    return deptArrears.filter(a => {
      const name = (a.studentName || '').toLowerCase();
      const reg = (a.registerNo || '').toLowerCase();
      const code = (a.code || '').toLowerCase();
      const sub = (a.name || '').toLowerCase();
      const app = (a.appId || '').toLowerCase();
      return name.includes(q) || reg.includes(q) || code.includes(q) || sub.includes(q) || app.includes(q);
    });
  }, [deptArrears, search]);

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
        <div><h1>Exam Duty Center & Timetable — {hod.dept}</h1><p className="text-muted">Schedule semester examinations, invigilation duties, hall assignments, and internal test rosters.</p></div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={16}/> Schedule Exam</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop:'1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Scheduled Exams</span><span className="sm-summary-value">{exams.length}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Unique Venues</span><span className="sm-summary-value text-success">{new Set(exams.map(e=>e.room || e.hallName).filter(Boolean)).size}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Duty Staff Assigned</span><span className="sm-summary-value text-primary">{exams.filter(e => e.invigilatorName || e.invigilator).length}</span></div>
        <div className="sm-summary-card glass-card"><span className="sm-summary-label">Upcoming (Next 7d)</span><span className="sm-summary-value gradient-text">{exams.filter(e=>{const d=new Date(e.date);const n=new Date();return d>=n && d<=new Date(n.getTime()+7*86400000);}).length}</span></div>
        <div 
          className="sm-summary-card glass-card"
          onClick={() => setActiveTab('reappear-apps')}
          style={{ cursor: 'pointer', border: activeTab === 'reappear-apps' ? '1px solid #dc2626' : undefined, background: activeTab === 'reappear-apps' ? 'rgba(239, 68, 68, 0.08)' : undefined }}
        >
          <span className="sm-summary-label">Re-Appear Registrations</span>
          <span className="sm-summary-value" style={{ color: '#dc2626' }}>{deptArrears.length}</span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop:'1.5rem', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveTab('schedules')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'schedules' ? '#4f46e5' : 'var(--bg-primary)',
                color: activeTab === 'schedules' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.2s'
              }}
            >
              <Calendar size={16} /> Department Exam Timetable ({exams.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reappear-apps')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: activeTab === 'reappear-apps' ? '#dc2626' : 'var(--bg-primary)',
                color: activeTab === 'reappear-apps' ? '#ffffff' : 'var(--text-main)',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'reappear-apps' ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none'
              }}
            >
              <FileText size={16} /> Student Re-Appearance Applications ({deptArrears.length})
            </button>
          </div>

          <div className="search-box" style={{ minWidth: '260px' }}>
            <Search size={16} className="text-muted"/>
            <input 
              placeholder={activeTab === 'reappear-apps' ? "Search student, register no, or course..." : "Search by exam, subject, invigilator or room..."} 
              value={search} 
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-container" style={{ overflowX: 'auto' }}>
          {activeTab === 'reappear-apps' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>App ID</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Student Candidate</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Register Number</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Department</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Course Code & Title</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>Original Sem</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>CIA Retained</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Action Type</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Slip Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredArrears.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '3rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <FileText size={40} color="#94a3b8" />
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                          No Student Re-Appearance Applications Found
                        </div>
                        <p className="text-muted" style={{ margin: 0, fontSize: '0.85rem', maxWidth: '400px' }}>
                          When students from your department register to re-appear for supplementary examinations, their details will display here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredArrears.map((app, idx) => (
                    <tr key={app.appId || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }}>
                        {app.appId}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {app.studentName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
                          {app.registerNo}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {app.department}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{app.name}</div>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#dc2626', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                          {app.code}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 600 }}>
                        {app.semester}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                        {app.ciaRetained || '15 / 25'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: app.type?.includes('Revaluation') ? '#7c3aed' : '#dc2626' }}>
                          {app.type}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fee: ₹{app.fee}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                          ✓ Confirmed
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setViewSlipModal(app)}
                          style={{
                            padding: '6px 14px',
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={13} /> View Slip
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>Exam Type</th><th>Subject</th><th>Semester</th><th>Date</th><th>Time</th><th>Venue</th><th>Invigilator / Duty Officer</th><th>Marks</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length===0 ? (
                  <tr><td colSpan={9} className="text-center text-muted" style={{padding:'2rem'}}>No exams scheduled yet.</td></tr>
                ) : filtered.map(ex => (
                  <tr key={ex._id || ex.id}>
                    <td className="font-semibold">{ex.name}</td>
                    <td><div style={{display:'flex',alignItems:'center',gap:5}}><BookOpen size={13} className="text-muted"/><span>{ex.subject}</span></div></td>
                    <td><span className="badge-outline">{ex.sem}</span></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:5}}><Calendar size={13} className="text-muted"/><span className="text-sm">{ex.date}</span></div></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:5}}><Clock size={13} className="text-muted"/><span className="text-sm font-semibold">{ex.time}</span></div></td>
                    <td><div style={{display:'flex',alignItems:'center',gap:5}}><MapPin size={13} className="text-muted"/><span style={{background:'rgba(59,130,246,0.1)',color:'#3b82f6',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.room || ex.hallName}</span></div></td>
                    <td>
                      {ex.invigilatorName || ex.invigilator ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700 }}>
                          <UserCheck size={13} /> {ex.invigilatorName || ex.invigilator}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td><span style={{background:'rgba(236,72,153,0.1)',color:'#ec4899',padding:'0.15rem 0.45rem',borderRadius:4,fontSize:'0.78rem',fontWeight:700}}>{ex.maxMarks} Marks</span></td>
                    <td><div className="action-buttons"><button className="btn-icon" onClick={()=>openEdit(ex)}><Edit2 size={14}/></button><button className="btn-icon btn-icon-danger" onClick={()=>handleDelete(ex._id || ex.id)}><Trash2 size={14}/></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Assigned Invigilator / Duty Staff</label>
                  <select
                    value={form.invigilatorId || ''}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const staffObj = staffMembers.find(s => String(s._id || s.id) === String(selectedId));
                      const name = staffObj ? (staffObj.name + (staffObj.designation ? ` — ${staffObj.designation}` : '')) : '';
                      setForm({
                        ...form,
                        invigilatorId: selectedId,
                        invigilatorName: name,
                        invigilator: name
                      });
                    }}
                  >
                    <option value="">Select Faculty for Invigilation</option>
                    {staffMembers.map(st => {
                      const sId = st._id || st.id;
                      const sName = st.name || st.facultyName;
                      const sDesig = st.designation || st.role || 'Faculty';
                      return (
                        <option key={sId} value={sId}>
                          {sName} ({sDesig})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div className="modal-actions"><button type="button" className="btn-ghost" onClick={()=>setModal(false)}>Cancel</button><button type="submit" className="btn-primary">{editId?'Save Changes':'Schedule'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ── ARREAR RE-APPEARANCE SLIP MODAL (PORTAL) ── */}
      {viewSlipModal && typeof document !== 'undefined' && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100vw', 
            height: '100vh', 
            background: 'rgba(15, 23, 42, 0.72)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999, 
            padding: '16px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewSlipModal(null);
          }}
        >
          <div 
            style={{ 
              background: '#ffffff', 
              borderRadius: '16px', 
              width: '100%', 
              maxWidth: '640px', 
              padding: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              boxSizing: 'border-box',
              position: 'relative',
              color: '#0f172a'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <button 
                type="button" 
                onClick={() => setViewSlipModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#64748b' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div id="reappear-exam-slip-content" style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', background: '#fafbfc', boxSizing: 'border-box' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Arignar Anna College (Autonomous)
                </div>
                <h2 style={{ margin: '4px 0 2px', fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                  OFFICE OF CONTROLLER OF EXAMINATIONS
                </h2>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                  Arrear Re-Appearance & Supplementary Examination Slip
                </div>
                <div style={{ display: 'inline-block', marginTop: '6px', padding: '3px 12px', background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', borderRadius: '14px', fontSize: '0.74rem', fontWeight: 800 }}>
                  ✓ REGISTRATION CONFIRMED • {viewSlipModal.appId}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.82rem', marginBottom: '16px' }}>
                <div><span style={{ color: '#64748b' }}>Candidate Name: </span><strong>{viewSlipModal.studentName}</strong></div>
                <div><span style={{ color: '#64748b' }}>Register Number: </span><strong style={{ fontFamily: 'monospace' }}>{viewSlipModal.registerNo}</strong></div>
                <div><span style={{ color: '#64748b' }}>Department: </span><strong>{viewSlipModal.department}</strong></div>
                <div><span style={{ color: '#64748b' }}>Program: </span><strong>{viewSlipModal.degree}</strong></div>
                <div><span style={{ color: '#64748b' }}>Registered Session: </span><strong style={{ color: '#dc2626' }}>{viewSlipModal.examSession}</strong></div>
                <div><span style={{ color: '#64748b' }}>Application Date: </span><strong>{new Date(viewSlipModal.appliedAt).toLocaleDateString()}</strong></div>
              </div>

              <div style={{ overflowX: 'auto', width: '100%', marginBottom: '16px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', minWidth: '460px', borderCollapse: 'collapse', fontSize: '0.8rem', background: '#ffffff' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 10px' }}>Course Code</th>
                      <th style={{ padding: '8px 10px' }}>Course Title</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Original Sem</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Action Type</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Fee Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 800, color: '#dc2626' }}>{viewSlipModal.code}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>{viewSlipModal.name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{viewSlipModal.semester}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '0.74rem' }}>{viewSlipModal.type}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>₹{viewSlipModal.fee}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <strong>Important Instructions:</strong>
                <div>1. Retain this acknowledgment slip for all academic queries and hall ticket generation.</div>
                <div>2. Candidate hall ticket is scheduled for release 1 week prior to the examination date.</div>
                <div>3. Continuous Internal Assessment (CIA) marks ({viewSlipModal.ciaRetained}) are retained as per autonomous regulations.</div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => window.print()}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} /> Print Slip
              </button>
              <button 
                type="button" 
                onClick={() => setViewSlipModal(null)}
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HodExams;
