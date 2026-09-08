import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Calendar, Clock, MapPin, ClipboardList, BookOpen, AlertTriangle } from 'lucide-react';
import {
  getDepartments,
  getCourses,
  getSemesters,
  getSections,
  getAcademicYears,
  getRegulations,
  getSubjects,
  getStaff,
  getExams,
  createExam,
  updateExam,
  deleteExam
} from '../../api/index';
import './ExamsManagement.css';

const DEPARTMENTS = [
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
  'Biotechnology Engineering'
];

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

const ExamsManagement = () => {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    examType: 'Internal',
    academicYearId: '',
    regulationId: '',
    departmentId: '',
    dept: '',
    courseId: '',
    semesterId: '',
    sem: '',
    sectionId: '',
    section: '',
    subjectId: '',
    subject: '',
    date: '',
    startTime: '10:00',
    endTime: '12:00',
    hallName: '',
    hallCapacity: 60,
    invigilatorId: '',
    maxMarks: 100,
    passMarks: 40,
    status: 'Scheduled'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const safeRequest = request =>
        request.catch(() => ({ data: [] }));

      const [
        examResponse,
        departmentResponse,
        courseResponse,
        semesterResponse,
        sectionResponse,
        yearResponse,
        regulationResponse,
        subjectResponse,
        staffResponse
      ] = await Promise.all([
        safeRequest(getExams()),
        safeRequest(getDepartments()),
        safeRequest(getCourses()),
        safeRequest(getSemesters()),
        safeRequest(getSections()),
        safeRequest(getAcademicYears()),
        safeRequest(getRegulations()),
        safeRequest(getSubjects()),
        safeRequest(getStaff())
      ]);

      const getArray = (response, key) => {
        const data = response?.data;

        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.[key])) return data[key];
        if (Array.isArray(data?.data)) return data.data;

        return [];
      };

      setExams(getArray(examResponse, 'exams'));
      setDepartments(
        getArray(departmentResponse, 'departments')
      );
      setCourses(getArray(courseResponse, 'courses'));
      setSemesters(
        getArray(semesterResponse, 'semesters')
      );
      setSections(getArray(sectionResponse, 'sections'));
      setAcademicYears(
        getArray(yearResponse, 'academicYears')
      );
      setRegulations(
        getArray(regulationResponse, 'regulations')
      );
      setSubjects(getArray(subjectResponse, 'subjects'));
      setStaff(getArray(staffResponse, 'staff'));
    } catch (error) {
      console.error(
        'Unable to load exam management data:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    const activeYear =
      academicYears.find(year => year.isActive) ||
      academicYears[0];

    setForm({
      name: '',
      examType: 'Internal',

      academicYearId:
        activeYear?._id || activeYear?.id || '',

      regulationId:
        regulations[0]?._id || regulations[0]?.id || '',

      departmentId: '',
      dept: '',

      courseId: '',

      semesterId: '',
      sem: '',

      sectionId: '',
      section: '',

      subjectId: '',
      subject: '',

      date: '',
      startTime: '10:00',
      endTime: '12:00',

      hallName: '',
      hallCapacity: 60,

      invigilatorId: '',

      maxMarks: 100,
      passMarks: 40,
      status: 'Scheduled'
    });

    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = exam => {
    setForm({
      name: exam.name || '',
      examType: exam.examType || 'Internal',

      academicYearId:
        exam.academicYearId?._id ||
        exam.academicYearId ||
        '',

      regulationId:
        exam.regulationId?._id ||
        exam.regulationId ||
        '',

      departmentId: exam.departmentId || '',
      dept: exam.dept || '',

      courseId: exam.courseId || '',

      semesterId: exam.semesterId || '',
      sem: exam.sem || '',

      sectionId: exam.sectionId || '',
      section: exam.section || '',

      subjectId:
        exam.subjectId?._id ||
        exam.subjectId ||
        '',

      subject:
        exam.subjectId?.subjectName ||
        exam.subject ||
        '',

      date: exam.date || '',
      startTime: exam.startTime || exam.time || '',
      endTime: exam.endTime || '',

      hallName: exam.hallName || exam.room || '',
      hallCapacity: exam.hallCapacity || 60,

      invigilatorId:
        exam.invigilatorId?._id ||
        exam.invigilatorId ||
        '',

      maxMarks: exam.maxMarks || 100,
      passMarks: exam.passMarks || 40,
      status: exam.status || 'Scheduled'
    });

    setEditTarget(exam._id || exam.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = async event => {
    event.preventDefault();

    const selectedCourse = courses.find(
      course =>
        String(course.id || course._id) ===
        String(form.courseId)
    );

    const selectedSection = sections.find(
      section =>
        String(section.id || section._id) ===
        String(form.sectionId)
    );

    const selectedSubject = subjects.find(
      subject =>
        String(subject._id || subject.id) ===
        String(form.subjectId)
    );

    if (
      !form.name ||
      !form.academicYearId ||
      !form.departmentId ||
      !form.courseId ||
      !form.semesterId ||
      !form.sectionId ||
      !form.subjectId ||
      !form.date ||
      !form.startTime ||
      !form.endTime ||
      !form.hallName ||
      !form.invigilatorId
    ) {
      alert('Please complete all required exam schedule fields.');
      return;
    }

    const payload = {
      ...form,

      dept: selectedDepartment?.name || form.dept,
      courseName: selectedCourse?.name || '',

      sem:
        selectedSemester?.name ||
        `Semester ${selectedSemester?.semesterNumber || ''}`,

      section:
        selectedSection?.name || form.section,

      subject:
        selectedSubject?.subjectName ||
        selectedSubject?.name ||
        form.subject,

      time: form.startTime,
      room: form.hallName,

      maxMarks: Number(form.maxMarks),
      passMarks: Number(form.passMarks),
      hallCapacity: Number(form.hallCapacity)
    };

    try {
      if (editTarget) {
        await updateExam(editTarget, payload);
      } else {
        await createExam(payload);
      }

      await fetchData();
      closeModal();
      alert(
        editTarget
          ? 'Exam schedule updated successfully.'
          : 'Exam scheduled successfully.'
      );
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        'Unable to save the exam schedule.'
      );
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this exam schedule slot?')) {
      try {
        await deleteExam(id);
        fetchData();
      } catch (err) {
        console.error('Error deleting exam in Admin console:', err);
      }
    }
  };

  // Get active subjects for the selected department in the form
  const getDeptSubjects = (deptName) => {
    return subjects.filter(s => {
      let sDept = s.dept;
      if (sDept === 'Computer Science') sDept = 'Computer Science Engineering';
      else if (sDept === 'Electronics & Comm.') sDept = 'Electronics & Communication Engineering';
      else if (sDept === 'Electrical Engg.') sDept = 'Electrical & Electronics Engineering';
      else if (sDept === 'Mechanical Engg.') sDept = 'Mechanical Engineering';
      else if (sDept === 'Civil Engg.') sDept = 'Civil Engineering';
      else if (sDept === 'Information Tech.') sDept = 'Information Technology';
      return sDept === deptName;
    });
  };

  const filtered = exams.filter(ex => {
    const q = search.toLowerCase();
    const matchesSearch = ex.name.toLowerCase().includes(q) || ex.subject.toLowerCase().includes(q) || ex.room.toLowerCase().includes(q);
    
    let exDept = ex.dept;
    if (exDept === 'Computer Science') exDept = 'Computer Science Engineering';
    else if (exDept === 'Electronics & Comm.') exDept = 'Electronics & Communication Engineering';
    else if (exDept === 'Electrical Engg.') exDept = 'Electrical & Electronics Engineering';
    else if (exDept === 'Mechanical Engg.') exDept = 'Mechanical Engineering';
    else if (exDept === 'Civil Engg.') exDept = 'Civil Engineering';
    else if (exDept === 'Information Tech.') exDept = 'Information Technology';

    const matchesDept = deptFilter === 'All' || exDept === deptFilter;
    return matchesSearch && matchesDept;
  });

  const selectedDepartment = departments.find(
    department =>
      String(department.id || department._id) ===
      String(form.departmentId)
  );

  const selectedSemester = semesters.find(
    semester =>
      String(semester.id || semester._id) ===
      String(form.semesterId)
  );

  const examCourses = courses.filter(
    course =>
      String(course.departmentId) ===
      String(form.departmentId)
  );

  const examSemesters = semesters.filter(
    semester =>
      String(semester.courseId) ===
      String(form.courseId)
  );

  const examSections = sections.filter(
    section =>
      String(section.semesterId) ===
        String(form.semesterId) &&
      section.status !== 'Inactive'
  );

  const examSubjects = subjects.filter(subject => {
    const departmentMatches =
      String(subject.departmentId) ===
        String(form.departmentId) ||
      subject.department === selectedDepartment?.name;

    const semesterMatches =
      String(subject.semesterId) ===
        String(form.semesterId) ||
      subject.semester === selectedSemester?.name ||
      subject.semester ===
        `Semester ${selectedSemester?.semesterNumber}`;

    const sectionMatches =
      !Array.isArray(subject.sectionIds) ||
      subject.sectionIds.length === 0 ||
      subject.sectionIds.some(
        sectionId =>
          String(sectionId) === String(form.sectionId)
      );

    return (
      departmentMatches &&
      semesterMatches &&
      sectionMatches
    );
  });

  const examInvigilators = staff.filter(
    member =>
      member.status !== 'Inactive' &&
      (
        member.dept === selectedDepartment?.name ||
        member.department === selectedDepartment?.name ||
        member.deptCode === selectedDepartment?.code
      )
  );

  return (
    <div className="exams-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Exam Timetable (Semester & Internal Exams)</h1>
          <p className="text-muted">Coordinate upcoming internal assessments, semester exams, room allocations, and exam timetables globally.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Schedule Exam</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Scheduled</span>
          <span className="sm-summary-value">{exams.length} Slots</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Active Venues</span>
          <span className="sm-summary-value text-success">{new Set(exams.map(e => e.room)).size} Venues</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Collisions Detected</span>
          <span className="sm-summary-value text-success">0 Alerts</span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by test name, course, or venue room..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="All">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Exam Category</th>
                <th>Course / Subject</th>
                <th>Semester</th>
                <th>Department</th>
                <th>Date Schedule</th>
                <th>Time Window</th>
                <th>Allocated Room</th>
                <th>Marks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No exam timetables registered.
                  </td>
                </tr>
              ) : (
                filtered.map((ex) => (
                  <tr key={ex._id || ex.id}>
                    <td className="font-semibold">{ex.name}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={13} className="text-muted" />
                        <span className="font-semibold">{ex.subject}</span>
                      </div>
                    </td>
                    <td><span className="badge-outline">{ex.sem || 'Sem 3'}</span></td>
                    <td>
                      <span className="text-muted">
                        {(() => {
                          let d = ex.dept;
                          if (d === 'Computer Science') d = 'Computer Science Engineering';
                          else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                          else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                          else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                          else if (d === 'Civil Engg.') d = 'Civil Engineering';
                          else if (d === 'Information Tech.') d = 'Information Technology';
                          return d;
                        })()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} className="text-muted" />
                        <span>{ex.date}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} className="text-muted" />
                        <span className="text-sm font-semibold">{ex.time}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} className="text-muted" />
                        <span className="exam-hall-badge">{ex.room}</span>
                      </div>
                    </td>
                    <td><span className="exam-marks-badge">{ex.maxMarks} Marks</span></td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openEdit(ex)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(ex._id || ex.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <div className="table-footer">Showing {filtered.length} of {exams.length} examinations</div>}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Scheduled Exam' : 'Schedule New Exam'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Exam Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Internal Assessment 1"
                    value={form.name}
                    onChange={event =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Exam Type *</label>
                  <select
                    value={form.examType}
                    onChange={event =>
                      setForm({ ...form, examType: event.target.value })
                    }
                  >
                    <option value="Internal">Internal</option>
                    <option value="Model">Model</option>
                    <option value="Practical">Practical</option>
                    <option value="Semester">Semester</option>
                    <option value="Supplementary">Supplementary</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Academic Year *</label>
                  <select
                    required
                    value={form.academicYearId}
                    onChange={event =>
                      setForm({
                        ...form,
                        academicYearId: event.target.value
                      })
                    }
                  >
                    <option value="">Select Academic Year</option>

                    {academicYears.map(year => (
                      <option
                        key={year._id || year.id}
                        value={year._id || year.id}
                      >
                        {year.year}
                        {year.isActive ? ' (Active)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Regulation</label>
                  <select
                    value={form.regulationId}
                    onChange={event =>
                      setForm({
                        ...form,
                        regulationId: event.target.value
                      })
                    }
                  >
                    <option value="">Default Regulation</option>

                    {regulations.map(regulation => (
                      <option
                        key={regulation._id || regulation.id}
                        value={regulation._id || regulation.id}
                      >
                        {regulation.regulationName || regulation.code || regulation.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department *</label>
                  <select
                    required
                    value={form.departmentId}
                    onChange={event => {
                      const departmentId = event.target.value;

                      const department = departments.find(
                        item =>
                          String(item.id || item._id) ===
                          String(departmentId)
                      );

                      setForm({
                        ...form,
                        departmentId,
                        dept: department?.name || '',
                        courseId: '',
                        semesterId: '',
                        sem: '',
                        sectionId: '',
                        section: '',
                        subjectId: '',
                        subject: '',
                        invigilatorId: ''
                      });
                    }}
                  >
                    <option value="">Select Department</option>

                    {departments.map(department => (
                      <option
                        key={department.id || department._id}
                        value={department.id || department._id}
                      >
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Course *</label>
                  <select
                    required
                    disabled={!form.departmentId}
                    value={form.courseId}
                    onChange={event =>
                      setForm({
                        ...form,
                        courseId: event.target.value,
                        semesterId: '',
                        sem: '',
                        sectionId: '',
                        section: '',
                        subjectId: '',
                        subject: ''
                      })
                    }
                  >
                    <option value="">Select Course</option>

                    {examCourses.map(course => (
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
                  <label>Semester *</label>
                  <select
                    required
                    disabled={!form.courseId}
                    value={form.semesterId}
                    onChange={event => {
                      const semesterId = event.target.value;

                      const semester = semesters.find(
                        item =>
                          String(item.id || item._id) ===
                          String(semesterId)
                      );

                      setForm({
                        ...form,
                        semesterId,
                        sem:
                          semester?.name ||
                          `Semester ${semester?.semesterNumber || ''}`,
                        sectionId: '',
                        section: '',
                        subjectId: '',
                        subject: ''
                      });
                    }}
                  >
                    <option value="">Select Semester</option>

                    {examSemesters.map(semester => (
                      <option
                        key={semester.id || semester._id}
                        value={semester.id || semester._id}
                      >
                        {semester.name ||
                          `Semester ${semester.semesterNumber}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Section *</label>
                  <select
                    required
                    disabled={!form.semesterId}
                    value={form.sectionId}
                    onChange={event => {
                      const sectionId = event.target.value;

                      const section = sections.find(
                        item =>
                          String(item.id || item._id) ===
                          String(sectionId)
                      );

                      setForm({
                        ...form,
                        sectionId,
                        section: section?.name || '',
                        subjectId: '',
                        subject: ''
                      });
                    }}
                  >
                    <option value="">Select Section</option>

                    {examSections.map(section => (
                      <option
                        key={section.id || section._id}
                        value={section.id || section._id}
                      >
                        Section {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Subject *</label>
                  <select
                    required
                    disabled={!form.sectionId}
                    value={form.subjectId}
                    onChange={event => {
                      const subjectId = event.target.value;

                      const subject = subjects.find(
                        item =>
                          String(item._id || item.id) ===
                          String(subjectId)
                      );

                      setForm({
                        ...form,
                        subjectId,
                        subject:
                          subject?.subjectName ||
                          subject?.name ||
                          ''
                      });
                    }}
                  >
                    <option value="">Select Subject</option>

                    {examSubjects.map(subject => (
                      <option
                        key={subject._id || subject.id}
                        value={subject._id || subject.id}
                      >
                        {subject.subjectCode || subject.code} —{' '}
                        {subject.subjectName || subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label><Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Scheduled Date *</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={event =>
                      setForm({
                        ...form,
                        startTime: event.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={event =>
                      setForm({
                        ...form,
                        endTime: event.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Exam Hall *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Exam Hall"
                    value={form.hallName}
                    onChange={event =>
                      setForm({
                        ...form,
                        hallName: event.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Hall Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.hallCapacity}
                    onChange={event =>
                      setForm({
                        ...form,
                        hallCapacity: event.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label><ClipboardList size={13} style={{ display: 'inline', marginRight: '4px' }} /> Maximum Marks</label>
                  <input type="number" min="10" max="100" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Invigilator *</label>
                  <select
                    required
                    disabled={!form.departmentId}
                    value={form.invigilatorId}
                    onChange={event =>
                      setForm({
                        ...form,
                        invigilatorId: event.target.value
                      })
                    }
                  >
                    <option value="">Select Invigilator</option>

                    {examInvigilators.map(member => (
                      <option
                        key={member._id}
                        value={member._id}
                      >
                        {member.name} — {member.designation || 'Faculty'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Pass Marks *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={form.maxMarks}
                    value={form.passMarks}
                    onChange={event =>
                      setForm({
                        ...form,
                        passMarks: event.target.value
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Schedule Status *</label>
                  <select
                    value={form.status}
                    onChange={event =>
                      setForm({
                        ...form,
                        status: event.target.value
                      })
                    }
                  >
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Published">Published</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Update Exam' : 'Schedule Exam'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamsManagement;
