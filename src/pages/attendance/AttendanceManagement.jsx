import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  Filter, 
  Search, 
  Check, 
  X, 
  Users, 
  Save, 
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  getStudents,
  getAllAttendance,
  createAttendance,
  getDepartments,
  getCourses,
  getSemesters,
  getSections,
  getAcademicYears,
  getPeriodMasters,
  getFacultyAllocations
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './AttendanceManagement.css';

const DEPARTMENTS = ['All', 'Computer Science', 'Electrical Engg.', 'Mechanical Engg.', 'Civil Engg.', 'Information Tech.'];
const SEMESTERS = ['All', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];



const MONTHLY_ANALYTICS = [
  { name: 'Nov', CS: 92, EE: 88, ME: 85, CE: 89, IT: 94, average: 90 },
  { name: 'Dec', CS: 90, EE: 89, ME: 84, CE: 88, IT: 92, average: 89 },
  { name: 'Jan', CS: 94, EE: 91, ME: 88, CE: 90, IT: 95, average: 92 },
  { name: 'Feb', CS: 93, EE: 92, ME: 87, CE: 91, IT: 96, average: 93 },
  { name: 'Mar', CS: 91, EE: 89, ME: 85, CE: 87, IT: 93, average: 89 },
  { name: 'Apr', CS: 93, EE: 90, ME: 86, CE: 89, IT: 95, average: 91 },
];

const AVATAR_COLORS = ['#3b82f6', '#6366F1', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'];
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const getTodayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const r = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${r}`;
};

const initDailyLogs = (students) => {
  const logs = {};
  const today = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() === 0) continue; // skip Sunday
    const dateStr = d.toLocaleDateString('en-CA');
    logs[dateStr] = {};
    students.forEach(s => {
      // mark present or absent based on historical student attendance percentage
      const isPresent = Math.random() * 100 < s.attendance;
      logs[dateStr][s.id] = isPresent ? 'present' : 'absent';
    });
  }
  localStorage.setItem('erp_attendance_daily', JSON.stringify(logs));
  return logs;
};

const AttendanceManagement = () => {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [dailyLogs, setDailyLogs] = useState({});
  const [stats, setStats] = useState({});
  const [dbDepartments, setDbDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [facultyAllocations, setFacultyAllocations] = useState([]);
  
  const [deptFilter, setDeptFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [mode, setMode] = useState('view'); // 'view' | 'mark'
  const [markingState, setMarkingState] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh when attendance or student data changes
  useRealtimeSync(useCallback(() => { fetchData(); }, []), ['attendance', 'students']);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Students & Departments
      const [
        studentsRes,
        deptsRes,
        coursesRes,
        semestersRes,
        sectionsRes,
        yearsRes,
        periodsRes,
        allocationsRes
      ] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getCourses().catch(() => ({ data: [] })),
        getSemesters().catch(() => ({ data: [] })),
        getSections().catch(() => ({ data: [] })),
        getAcademicYears().catch(() => ({ data: [] })),
        getPeriodMasters().catch(() => ({ data: [] })),
        getFacultyAllocations({}).catch(() => ({ data: [] }))
      ]);
      const studentList = Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.students || studentsRes.data?.data || []);
      setStudents(studentList);
      setDbDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.departments || deptsRes.data?.data || []));

      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : (coursesRes.data?.courses || coursesRes.data?.data || []));
      setSemesters(Array.isArray(semestersRes.data) ? semestersRes.data : (semestersRes.data?.semesters || semestersRes.data?.data || []));
      setSections(Array.isArray(sectionsRes.data) ? sectionsRes.data : (sectionsRes.data?.sections || sectionsRes.data?.data || []));
      setAcademicYears(Array.isArray(yearsRes.data) ? yearsRes.data : (yearsRes.data?.academicYears || yearsRes.data?.data || []));

      const rawPeriods = Array.isArray(periodsRes.data) ? periodsRes.data : (periodsRes.data?.periods || periodsRes.data?.data || []);
      setPeriods(
        rawPeriods.filter((period) => period.isActive && !period.isBreak)
      );

      setFacultyAllocations(Array.isArray(allocationsRes.data) ? allocationsRes.data : (allocationsRes.data?.allocations || allocationsRes.data?.data || []));

      // 2. Fetch Attendance Records
      let dailyLogData = {};
      let statsData = {};
      
      try {
        const attRes = await getAllAttendance();
        const records = attRes.data;
        
        // Group by date
        records.forEach(r => {
          const dateStr = new Date(
            r.attendanceDate || r.date
          ).toLocaleDateString('en-CA');
          if (!dailyLogData[dateStr]) dailyLogData[dateStr] = {};
          dailyLogData[dateStr][r.studentId] = r.status.toLowerCase();
        });
      } catch (attErr) {
        console.warn('Failed to fetch live attendance, falling back to local init', attErr);
        dailyLogData = initDailyLogs(studentList);
      }
      
      setDailyLogs(dailyLogData);

      // 3. Initialize baseline stats
      studentList.forEach(s => {
        statsData[s.id] = {
          basePresent: 0,
          baseAbsent: 0
        };
      });
      setStats(statsData);

    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sync marking state with selected date when in mark mode
  useEffect(() => {
    if (mode === 'mark') {
      const existing = dailyLogs[selectedDate] || {};
      const initialMarking = {};
      students.forEach(s => {
        initialMarking[s.id] = existing[s.id] || '';
      });
      setMarkingState(initialMarking);
    }
  }, [selectedDate, mode, dailyLogs, students]);

  // Aggregate stats dynamically
  const getStudentRecords = () => {
    return students.map(s => {
      const studentStats = stats[s.id] || { basePresent: 0, baseAbsent: 0 };
      let dailyPresent = 0;
      let dailyAbsent = 0;

      Object.keys(dailyLogs).forEach(date => {
        const mark = dailyLogs[date][s.id];
        if (mark === 'present') dailyPresent++;
        else if (mark === 'absent') dailyAbsent++;
      });

      const presentDays = studentStats.basePresent + dailyPresent;
      const absentDays = studentStats.baseAbsent + dailyAbsent;
      const totalDays = presentDays + absentDays;
      const percent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

      return {
        ...s,
        presentDays,
        absentDays,
        percent,
        status: percent >= 90 ? 'Good' : percent >= 75 ? 'Low' : 'Critical'
      };
    });
  };

  const safeDbDepartments = Array.isArray(dbDepartments) ? dbDepartments : [];
  const safeSemesters = Array.isArray(semesters) ? semesters : [];
  const safeSections = Array.isArray(sections) ? sections : [];
  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeFacultyAllocations = Array.isArray(facultyAllocations) ? facultyAllocations : [];

  const selectedDepartment = safeDbDepartments.find(
    (department) =>
      (department.id || department._id) === departmentId
  );

  const selectedSemester = safeSemesters.find(
    (semester) =>
      (semester.id || semester._id) === semesterId
  );

  const selectedSection = safeSections.find(
    (section) => (section.id || section._id) === sectionId
  );

  const filteredCourses = safeCourses.filter(
    (course) => course.departmentId === departmentId
  );

  const filteredSemesters = safeSemesters.filter(
    (semester) => semester.courseId === courseId
  );

  const filteredSections = safeSections.filter(
    (section) =>
      section.semesterId === semesterId &&
      section.status !== 'Inactive'
  );

  const filteredSubjects = safeFacultyAllocations.filter(
    (allocation) => {
      const departmentMatches =
        allocation.departmentId === departmentId ||
        allocation.department === selectedDepartment?.name;

      const semesterMatches =
        allocation.semesterId === semesterId ||
        allocation.semester === selectedSemester?.name;

      const sectionMatches =
        allocation.sectionId === sectionId ||
        allocation.section === selectedSection?.name ||
        allocation.section ===
          `Section ${selectedSection?.name}`;

      return (
        departmentMatches &&
        semesterMatches &&
        sectionMatches &&
        allocation.isActive !== false
      );
    }
  );

  useEffect(() => {
    if (filteredSubjects.length === 1 && !subjectId) {
      const subject = filteredSubjects[0].subjectId;
      const selectedSubjectId = subject?._id || subject;

      if (selectedSubjectId) {
        setSubjectId(String(selectedSubjectId));
      }
    }
  }, [filteredSubjects, subjectId]);

  const records = getStudentRecords();

  // Apply filters
  const filteredRecords = records.filter((record) => {
    const matchDepartment =
      !departmentId ||
      record.departmentId === departmentId ||
      record.dept === selectedDepartment?.name;

    const matchCourse =
      !courseId ||
      record.courseId === courseId;

    const matchSemester =
      !semesterId ||
      record.semesterId === semesterId ||
      record.sem === selectedSemester?.name;

    const matchSection =
      !sectionId ||
      record.sectionId === sectionId ||
      record.section === selectedSection?.name ||
      record.section === `Section ${selectedSection?.name}`;

    const searchValue = search.toLowerCase();

    const matchSearch =
      String(record.name || '').toLowerCase().includes(searchValue) ||
      String(record.id || '').toLowerCase().includes(searchValue);

    return (
      matchDepartment &&
      matchCourse &&
      matchSemester &&
      matchSection &&
      matchSearch
    );
  });

  // Calculate totals for summary cards
  const lowAttendance = filteredRecords.filter(r => r.percent < 75);
  const avgAttendance = filteredRecords.length ? (filteredRecords.reduce((a, b) => a + b.percent, 0) / filteredRecords.length).toFixed(1) : 0;
  const criticalCount = filteredRecords.filter(r => r.percent < 75).length;
  const goodCount = filteredRecords.filter(r => r.percent >= 90).length;
  const normalCount = filteredRecords.filter(r => r.percent >= 75 && r.percent < 90).length;

  const getColor = (p) => p >= 90 ? 'var(--success)' : p >= 75 ? 'var(--warning)' : 'var(--danger)';
  const getStatusClass = (p) => p >= 90 ? 'status-active' : p >= 75 ? 'status-low' : 'status-inactive';

  // Mark all filtered students as present or absent
  const handleBulkMark = (status) => {
    const updated = { ...markingState };
    filteredRecords.forEach(r => {
      updated[r.id || r._id] = status;
    });
    setMarkingState(updated);
  };

  const handleMarkStudent = (studentId, status) => {
    setMarkingState(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  // Save the marked attendance
  const handleSaveAttendance = async () => {
    try {
      const missingFields = [];

      if (!academicYearId) missingFields.push('Academic Year');
      if (!departmentId) missingFields.push('Department');
      if (!courseId) missingFields.push('Course');
      if (!semesterId) missingFields.push('Semester');
      if (!sectionId) missingFields.push('Section');
      if (!periodId) missingFields.push('Period');
      if (!subjectId) missingFields.push('Subject');

      if (missingFields.length > 0) {
        alert(`Please select: ${missingFields.join(', ')}`);
        return;
      }

      if (Object.keys(markingState).length === 0) {
        alert('Please mark at least one student as Present or Absent.');
        return;
      }

      const selectedAcademicYear = (Array.isArray(academicYears) ? academicYears : []).find(
        year => String(year._id || year.id) === String(academicYearId)
      );

      const selectedAllocation = safeFacultyAllocations.find(allocation => {
        const allocationId = allocation._id || allocation.id;
        const allocatedSubjectId =
          allocation.subjectId?._id || allocation.subjectId;

        return (
          String(allocationId) === String(subjectId) ||
          String(allocatedSubjectId) === String(subjectId)
        );
      });

      const allocatedSubject = selectedAllocation?.subjectId;

      const actualSubjectId =
        allocatedSubject?._id ||
        allocatedSubject ||
        subjectId;

      const subjectName =
        allocatedSubject?.subjectName ||
        allocatedSubject?.name ||
        selectedAllocation?.subjectName ||
        'Subject';

      const bulkRecords = filteredRecords
        .filter(student => markingState[student.id || student._id])
        .map(student => {
          const studentKey = student.id || student._id;
          const mark = markingState[studentKey];

          return {
            studentId: student.id,
            studentName: student.name,
            registerNo: student.idNumber || student.id,

            academicYearId,
            academicYear: selectedAcademicYear?.year || '',

            departmentId,
            department: selectedDepartment?.name || student.dept,

            courseId,

            semesterId,
            semester:
              selectedSemester?.name ||
              `Semester ${selectedSemester?.semesterNumber || ''}`,

            sectionId,
            section:
              selectedSection?.name ||
              student.section ||
              '',

            periodId,

            subjectId: actualSubjectId,
            subjectName,
            subject: subjectName,

            attendanceDate: new Date(selectedDate),
            date: new Date(selectedDate),

            status:
              mark.charAt(0).toUpperCase() + mark.slice(1)
          };
        });

      if (bulkRecords.length > 0) {
        await createAttendance(bulkRecords);
      }

      setSaveSuccess(true);
      
      // Re-fetch data to automatically update the stats and UI
      await fetchData();

      setTimeout(() => {
        setSaveSuccess(false);
        setMode('view');
      }, 1000);
      
    } catch (err) {
      console.error('Failed to save attendance:', err);
      alert('Failed to save attendance. Please ensure backend is running.');
    }
  };

  // Dynamic Weekly Chart Calculations
  const getWeeklyData = () => {
    const today = new Date();
    const data = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let count = 0;
    let offset = 0;
    while (count < 6) {
      const d = new Date(today);
      d.setDate(today.getDate() - offset);
      offset++;
      if (d.getDay() === 0) continue; // Skip Sunday
      
      const dateStr = d.toLocaleDateString('en-CA');
      const dayName = days[d.getDay()];
      
      let rate = 90;
      const dayMarks = dailyLogs[dateStr];
      if (dayMarks) {
        let present = 0;
        let total = 0;
        Object.values(dayMarks).forEach(status => {
          if (status === 'present') present++;
          if (status === 'present' || status === 'absent') total++;
        });
        if (total > 0) rate = Math.round((present / total) * 100);
      } else {
        const seedRates = [93, 89, 96, 92, 87, 94];
        rate = seedRates[count % seedRates.length];
      }
      
      data.unshift({ day: dayName, rate });
      count++;
    }
    return data;
  };

  const weeklyData = getWeeklyData();

  return (
    <div className="attendance-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Attendance Management</h1>
          <p className="text-muted">Perform daily marking, track percentage counts, and review class performance metrics.</p>
        </div>

        <div className="header-actions">
          {/* Mode Switcher */}
          <div className="mode-toggle-group">
            <button 
              className={`mode-btn ${mode === 'view' ? 'active' : ''}`} 
              onClick={() => setMode('view')}
            >
              <Users size={16} /> Directory View
            </button>
            <button 
              className={`mode-btn ${mode === 'mark' ? 'active' : ''}`} 
              onClick={() => setMode('mark')}
            >
              <UserCheck size={16} /> Mark Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="sm-summary-row four-col">
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Average Attendance</span>
          <span className="sm-summary-value gradient-text">{avgAttendance}%</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Good Standing (≥ 90%)</span>
          <span className="sm-summary-value text-success">{goodCount} students</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Low Standings (75-89%)</span>
          <span className="sm-summary-value text-warning-cgpa">{normalCount} students</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Critical Status (&lt; 75%)</span>
          <span className="sm-summary-value text-danger">{criticalCount} students</span>
        </div>
      </div>

      {/* Alert Banner for Low Attendance */}
      {lowAttendance.length > 0 && (
        <div className="alert-banner">
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>
            <span><strong>Low Attendance Alert:</strong> {lowAttendance.length} students currently fall below the required 75% attendance threshold.</span>
            <div className="alert-names">
              {lowAttendance.map(s => (
                <span key={s.id} className="alert-name-tag">
                  {s.name} ({s.percent}%)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FILTERS PANEL */}
      <div className="glass-card">
        <div className="filters-row" style={{ borderBottom: 'none' }}>
          <div className="search-box">
            <Search size={17} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search student or register no..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="filter-group">
            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
              >
                <option value="">Academic Year</option>
                {(Array.isArray(academicYears) ? academicYears : []).map((year) => (
                  <option key={year._id} value={year._id}>
                    {year.year}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={departmentId}
                onChange={(e) => {
                  const selected = (Array.isArray(dbDepartments) ? dbDepartments : []).find(
                    (d) => (d.id || d._id) === e.target.value
                  );

                  setDepartmentId(e.target.value);
                  setDeptFilter(selected?.name || 'All');
                  setCourseId('');
                  setSemesterId('');
                  setSemFilter('All');
                  setSectionId('');
                  setPeriodId('');
                  setSubjectId('');
                }}
              >
                <option value="">Department</option>
                {(Array.isArray(dbDepartments) ? dbDepartments : []).map((department) => (
                  <option
                    key={department.id || department._id}
                    value={department.id || department._id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={courseId}
                disabled={!departmentId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setSemesterId('');
                  setSectionId('');
                  setSubjectId('');
                }}
              >
                <option value="">Course</option>
                {filteredCourses.map((course) => (
                  <option
                    key={course.id || course._id}
                    value={course.id || course._id}
                  >
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={semesterId}
                disabled={!courseId}
                onChange={(e) => {
                  const selected = (Array.isArray(semesters) ? semesters : []).find(
                    (semester) =>
                      (semester.id || semester._id) === e.target.value
                  );

                  setSemesterId(e.target.value);
                  setSemFilter(
                    selected?.name ||
                      `Semester ${selected?.semesterNumber || ''}`
                  );
                  setSectionId('');
                  setSubjectId('');
                }}
              >
                <option value="">Semester</option>
                {filteredSemesters.map((semester) => (
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

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={sectionId}
                disabled={!semesterId}
                onChange={(e) => {
                  setSectionId(e.target.value);
                  setSubjectId('');
                }}
              >
                <option value="">Section</option>
                {filteredSections.map((section) => (
                  <option
                    key={section.id || section._id}
                    value={section.id || section._id}
                  >
                    Section {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">Period</option>
                {(Array.isArray(periods) ? periods : []).map((period) => (
                  <option key={period._id} value={period._id}>
                    {period.periodName} ({period.startTime} - {period.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={subjectId}
                disabled={!sectionId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Subject</option>
                {filteredSubjects.map((allocation) => {
                  const subject = allocation.subjectId;
                  const value = subject?._id || subject;

                  return (
                    <option key={allocation._id} value={value}>
                      {subject?.subjectCode || ''} -{' '}
                      {subject?.subjectName || 'Subject'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Date Picker (always visible, critical in Mark Mode) */}
            <div className="date-picker-wrapper">
              <Calendar size={14} className="text-muted" />
              <input 
                type="date" 
                className="date-input" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {mode === 'view' ? (
        /* ──────────────── DIRECTORY / ANALYTICS MODE ──────────────── */
        <div className="attendance-grid">
          
          {/* Low Attendance Card Widget */}
          <div className="glass-card chart-section col-span-3">
            <h3><AlertTriangle size={18} style={{ color: 'var(--danger)' }} /> Critical Standings (&lt; 75%)</h3>
            <div className="absent-list" style={{ marginTop: '1rem' }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="absent-item">
                    <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: '14px', width: '70%', marginBottom: '6px' }}></div>
                      <div className="skeleton" style={{ height: '10px', width: '40%' }}></div>
                    </div>
                  </div>
                ))
              ) : lowAttendance.length === 0 ? (
                <div className="no-data" style={{ padding: '2rem 1rem', fontSize: '0.88rem' }}>
                  No students in critical standing. Excellent!
                </div>
              ) : (
                lowAttendance.map((s, idx) => (
                  <div key={s.id} className="absent-item">
                    <div 
                      className="absent-avatar" 
                      style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                    >
                      {getInitials(s.name)}
                    </div>
                    <div className="absent-info">
                      <p className="absent-name">{s.name}</p>
                      <p className="absent-dept">{s.dept} · {s.sem}</p>
                    </div>
                    <span className="absent-pct" style={{ color: 'var(--danger)' }}>{s.percent}%</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Records Table */}
          <div className="glass-card col-span-3">
            <div className="table-header-row">
              <h3>Student Attendance Directory</h3>
              <div className="legend-row">
                <span className="legend-item"><span className="dot bg-success"></span>≥ 90% Good</span>
                <span className="legend-item"><span className="dot bg-warning"></span>75–89% Low</span>
                <span className="legend-item"><span className="dot bg-danger"></span>&lt; 75% Critical</span>
              </div>
            </div>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Student Name</th>
                    <th>Register No</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Present Days</th>
                    <th>Absent Days</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <td key={j}>
                            <div className="skeleton" style={{ height: '16px', borderRadius: '4px', width: j === 1 ? '160px' : '50px' }}></div>
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="no-data">
                        No student records match the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, idx) => (
                      <tr key={r.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div 
                              style={{ 
                                width: '30px', 
                                height: '30px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'white', 
                                fontWeight: 700, 
                                fontSize: '0.78rem',
                                backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] 
                              }}
                            >
                              {getInitials(r.name)}
                            </div>
                            <span className="font-semibold">{r.name}</span>
                          </div>
                        </td>
                        <td><span className="roll-no">{r.id}</span></td>
                        <td>{r.dept}</td>
                        <td><span className="badge-outline">{r.sem}</span></td>
                        <td className="text-success font-semibold">{r.presentDays}</td>
                        <td className="text-danger font-semibold">{r.absentDays}</td>
                        <td>
                          <div className="att-bar-cell">
                            <span style={{ color: getColor(r.percent), fontWeight: 600, minWidth: '40px' }}>{r.percent}%</span>
                            <div className="att-bar-bg">
                              <div className="att-bar-fill" style={{ width: `${r.percent}%`, background: getColor(r.percent) }}></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(r.percent)}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && (
              <div className="table-footer">
                <div>
                  Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> students
                </div>
                {(deptFilter !== 'All' || semFilter !== 'All' || search) && (
                  <button 
                    className="clear-filters-link" 
                    onClick={() => { setDeptFilter('All'); setSemFilter('All'); setSearch(''); }}
                  >
                    Reset filters ×
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ──────────────── DAILY ATTENDANCE MARKING MODE ──────────────── */
        <div className="glass-card col-span-3">
          
          <div className="table-header-row">
            <div>
              <h3>Daily Roll Call</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                Mark students present/absent for <strong>{new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
              </p>
            </div>

            {saveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>
                <CheckCircle size={18} /> Daily attendance logged successfully!
              </div>
            )}
          </div>

          {/* Bulk Marking Control Panel */}
          <div className="bulk-action-panel animate-fade-in">
            <span className="bulk-action-text">
              Bulk actions for <strong>{filteredRecords.length}</strong> filtered students:
            </span>
            <div className="bulk-buttons">
              <button 
                type="button" 
                className="mark-btn btn-present" 
                onClick={() => handleBulkMark('present')}
              >
                Mark All Present
              </button>
              <button 
                type="button" 
                className="mark-btn btn-absent" 
                onClick={() => handleBulkMark('absent')}
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {/* Marking Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Current %</th>
                  <th style={{ width: '200px', textAlign: 'center' }}>Mark Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="no-data">
                      No student records match the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => {
                    const studentKey = r.id || r._id;
                    const status = markingState[studentKey];
                    return (
                      <tr key={studentKey}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div 
                              style={{ 
                                width: '30px', 
                                height: '30px', 
                                borderRadius: '50%', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'white', 
                                fontWeight: 700, 
                                fontSize: '0.78rem',
                                backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] 
                              }}
                            >
                              {getInitials(r.name)}
                            </div>
                            <span className="font-semibold">{r.name}</span>
                          </div>
                        </td>
                        <td><span className="roll-no">{r.id}</span></td>
                        <td>{r.dept}</td>
                        <td><span className="badge-outline">{r.sem}</span></td>
                        <td>
                          <span style={{ color: getColor(r.percent), fontWeight: 700 }}>
                            {r.percent}%
                          </span>
                        </td>
                        <td>
                          <div className="marking-btn-group" style={{ justifyContent: 'center' }}>
                            <button
                              type="button"
                              className={`mark-btn btn-present ${status === 'present' ? 'active' : ''}`}
                              onClick={() => handleMarkStudent(studentKey, 'present')}
                            >
                              <Check size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Present
                            </button>
                            <button
                              type="button"
                              className={`mark-btn btn-absent ${status === 'absent' ? 'active' : ''}`}
                              onClick={() => handleMarkStudent(studentKey, 'absent')}
                            >
                              <X size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Submit Actions */}
          <div className="save-section">
            <button 
              type="button" 
              className="btn-save-attendance"
              onClick={handleSaveAttendance}
              disabled={filteredRecords.length === 0}
              style={{ opacity: filteredRecords.length === 0 ? 0.6 : 1, cursor: filteredRecords.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <Save size={16} /> Save Roll Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;

