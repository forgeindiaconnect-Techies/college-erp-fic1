import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid
} from 'recharts';
import {
  ClipboardList, BookOpen, AlertCircle, FileText,
  Percent, Calendar, ShieldAlert, Clock, MapPin, Play, CheckCircle2, Download, ExternalLink,
  GraduationCap, CreditCard, Sparkles, RefreshCw, ChevronRight, Award, UserCheck, Inbox
} from 'lucide-react';
import { 
  getStudentById, getAttendanceByStudent, 
  getMarksByStudent, getFeesByStudent, getExams,
  getTimetable, getNotifications, getMyLibraryTransactions, getSubjects,
  getClassAdvisorInfo, getStudentLiveClass, getAssignments
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const studentIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  // Student specific dynamic data
  const [studentSession, setStudentSession] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentMarks, setStudentMarks] = useState(null);
  const [gpaTrend, setGpaTrend] = useState([]);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [registeredSubjects, setRegisteredSubjects] = useState([]);
  const [scholarship, setScholarship] = useState(null);
  const [hasOverdueBooks, setHasOverdueBooks] = useState(false);
  const [overdueFines, setOverdueFines] = useState(0);
  const [borrowedBooksCount, setBorrowedBooksCount] = useState(0);
  const [classAdvisor, setClassAdvisor] = useState(null);

  // Live Class State
  const [liveClassSession, setLiveClassSession] = useState(null);
  const [todayMaterials, setTodayMaterials] = useState([]);

  const loadLiveSession = useCallback(async () => {
    try {
      const res = await getStudentLiveClass().catch(() => ({ data: { activeLive: null, materials: [] } }));
      if (res.data) {
        setLiveClassSession(res.data.activeLive || null);
        setTodayMaterials(res.data.materials || []);
      }
    } catch (err) {
      console.error('Error fetching live class session:', err);
    }
  }, []);

  const fetchOriginalStudentData = useCallback(async (isManual = false) => {
    const rawSession = sessionStorage.getItem('student_session');
    if (!rawSession) {
      navigate('/login');
      return;
    }

    let activeStud = {};
    try {
      activeStud = JSON.parse(rawSession);
    } catch (e) {
      activeStud = {};
    }
    setStudentSession(activeStud);

    const targetStudentId = activeStud.id || activeStud.rollNo || activeStud.referenceId || activeStud._id;
    studentIdRef.current = targetStudentId;

    const targetDept = activeStud.department || activeStud.dept || 'General';
    const targetSem = activeStud.semester || activeStud.sem || 'Semester 1';
    const targetSec = activeStud.section || 'A';

    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [
        studRes, attendanceRes, marksRes, feesRes, 
        libraryRes, advisorRes, assignRes, subjectsRes, ttRes
      ] = await Promise.all([
        getStudentById(targetStudentId).catch(() => null),
        getAttendanceByStudent(targetStudentId).catch(() => null),
        getMarksByStudent(targetStudentId).catch(() => null),
        getFeesByStudent(targetStudentId).catch(() => null),
        getMyLibraryTransactions().catch(() => null),
        getClassAdvisorInfo().catch(() => null),
        getAssignments({ department: targetDept, class: targetSem }).catch(() => null),
        getSubjects({ department: targetDept }).catch(() => null),
        getTimetable(targetDept, targetSem, targetSec).catch(() => null)
      ]);

      loadLiveSession();
      setLastSynced(new Date());

      // 1. Resolve Student Profile Record
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      const localStudents = JSON.parse(localStorage.getItem(`erp_students_${tenantId}`) || '[]');
      const localMatch = localStudents.find(s => s.id === targetStudentId || s.rollNo === targetStudentId || s._id === targetStudentId);

      const dbStudent = studRes?.data || localMatch || {};
      const resolvedStudent = {
        id: targetStudentId || dbStudent.id || dbStudent.rollNo || 'N/A',
        name: dbStudent.name || activeStud.name || 'Student',
        dept: dbStudent.department || dbStudent.dept || targetDept,
        sem: dbStudent.semester || dbStudent.sem || targetSem,
        section: dbStudent.section || targetSec,
        email: dbStudent.email || activeStud.email || '',
        phone: dbStudent.phone || dbStudent.mobile || '',
        attendance: 0,
        cgpa: dbStudent.cgpa || null,
        feeStatus: 'Paid'
      };

      if (dbStudent.scholarshipDetails?.status === 'Approved' || Number(dbStudent.scholarshipAmount) > 0 || dbStudent.scholarship) {
        setScholarship(dbStudent.scholarshipDetails || {
          scholarshipName: dbStudent.scholarship || 'Scholarship Scheme',
          discountAmount: Number(dbStudent.scholarshipAmount || 0),
          status: 'Approved'
        });
      } else {
        setScholarship(null);
      }

      // 2. Class Advisor
      if (advisorRes?.data?.advisor) {
        setClassAdvisor(advisorRes.data.advisor);
      } else if (dbStudent.advisor || dbStudent.classAdvisor) {
        setClassAdvisor({ name: dbStudent.advisor || dbStudent.classAdvisor });
      } else {
        setClassAdvisor(null);
      }

      // 3. Original Attendance Calculation
      const localAttendance = JSON.parse(localStorage.getItem(`erp_attendance_${tenantId}`) || '[]');
      const localStudentAtt = localAttendance.filter(r => r.studentId === targetStudentId || (r.studentName && r.studentName.toLowerCase() === resolvedStudent.name.toLowerCase()));
      const apiAtt = Array.isArray(attendanceRes?.data) ? attendanceRes.data : [];
      const combinedAttRecords = [...apiAtt, ...localStudentAtt];

      if (combinedAttRecords.length > 0) {
        const presentCount = combinedAttRecords.filter(r => (r.status || '').toLowerCase() === 'present').length;
        resolvedStudent.attendance = Math.round((presentCount / combinedAttRecords.length) * 100);
      } else if (dbStudent.attendance !== undefined && dbStudent.attendance !== null) {
        const parsed = parseInt(String(dbStudent.attendance).replace('%', '').trim());
        resolvedStudent.attendance = isNaN(parsed) ? 0 : parsed;
      } else {
        resolvedStudent.attendance = 0;
      }

      // 4. Uniform Fee Calculation
      const normal = Number(dbStudent.normalFee !== undefined && dbStudent.normalFee !== null && dbStudent.normalFee !== "" ? dbStudent.normalFee : (dbStudent.totalFee || 0));
      const quotaDisc = Number(dbStudent.discountAmount || dbStudent.concession || 0);
      const scholarDisc = Number(dbStudent.scholarshipAmount || dbStudent.scholarshipDiscount || (dbStudent.scholarshipDetails?.discountAmount || 0));
      const totalDisc = quotaDisc + scholarDisc;
      const netPayable = dbStudent.finalFee !== undefined && dbStudent.finalFee !== null && Number(dbStudent.finalFee) > 0
        ? Number(dbStudent.finalFee)
        : (normal > 0 ? Math.max(0, normal - totalDisc) : Number(dbStudent.totalFee || 0));
      const paid = Number(dbStudent.paidAmount !== undefined ? dbStudent.paidAmount : (dbStudent.amountPaid || 0));
      const bal = Math.max(0, netPayable - paid);

      resolvedStudent.totalFee = netPayable;
      resolvedStudent.paidAmount = paid;
      resolvedStudent.pendingFeeAmount = bal;
      resolvedStudent.feeStatus = (bal === 0 && netPayable > 0) ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');


      setStudentDetails(resolvedStudent);

      // 5. Original Assignments Count
      if (assignRes?.data && Array.isArray(assignRes.data)) {
        setAssignmentsCount(assignRes.data.length);
      } else {
        const localAssigns = JSON.parse(localStorage.getItem(`erp_assignments_${tenantId}`) || '[]');
        const deptAssigns = localAssigns.filter(a => (a.dept || a.department || '').toLowerCase() === resolvedStudent.dept.toLowerCase());
        setAssignmentsCount(deptAssigns.length);
      }

      // 6. Original Library Data
      if (libraryRes?.data && Array.isArray(libraryRes.data)) {
        const issued = libraryRes.data.filter(t => t.status === 'Issued');
        setBorrowedBooksCount(issued.length);
        const overdue = issued.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
        if (overdue.length > 0) {
          setHasOverdueBooks(true);
          const totalFine = overdue.reduce((sum, item) => {
            const diffDays = Math.ceil((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24));
            return sum + (diffDays * 5);
          }, 0);
          setOverdueFines(totalFine);
        } else {
          setHasOverdueBooks(false);
          setOverdueFines(0);
        }
      }

      // 7. Original Marks, CGPA & GPA Trend
      const rawMarks = Array.isArray(marksRes?.data) ? marksRes.data : [];
      if (rawMarks.length > 0) {
        const semMap = {};
        rawMarks.forEach(m => {
          const sem = m.semester || 'Semester 1';
          if (!semMap[sem]) semMap[sem] = [];
          if (m.gradePoint) semMap[sem].push(Number(m.gradePoint));
          else if (m.totalMarks) semMap[sem].push((Number(m.totalMarks) / 10));
        });

        const trendList = [];
        let runningTotal = 0;
        let runningCount = 0;
        Object.keys(semMap).sort().forEach(sem => {
          const semAvg = semMap[sem].reduce((a, b) => a + b, 0) / (semMap[sem].length || 1);
          runningTotal += semAvg;
          runningCount++;
          trendList.push({ semester: sem, gpa: Number((runningTotal / runningCount).toFixed(2)) });
        });

        setGpaTrend(trendList);
        setStudentMarks({
          internal: rawMarks[0]?.internalMarks !== undefined ? rawMarks[0].internalMarks : null,
          external: rawMarks[0]?.semesterMarks !== undefined ? rawMarks[0].semesterMarks : null,
          cgpa: trendList.length > 0 ? trendList[trendList.length - 1].gpa : resolvedStudent.cgpa
        });
      } else {
        setGpaTrend([]);
        setStudentMarks({
          internal: null,
          external: null,
          cgpa: resolvedStudent.cgpa
        });
      }

      // 8. Original Subjects for Student's Department
      const backendSubjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : (subjectsRes?.data?.subjects || []);
      const localSubjects = JSON.parse(localStorage.getItem(`erp_subjects_${tenantId}`) || '[]');
      const allSubsMerged = [...backendSubjects, ...localSubjects];
      const deptSubjects = allSubsMerged.filter(s => 
        (s.department || s.dept || '').toLowerCase() === resolvedStudent.dept.toLowerCase() ||
        (s.deptId?.name || '').toLowerCase() === resolvedStudent.dept.toLowerCase()
      );

      // Deduplicate subjects by code or name
      const uniqueSubs = [];
      const seenCodes = new Set();
      deptSubjects.forEach(s => {
        const code = s.code || s.subjectCode || s.name || s.subjectName;
        if (code && !seenCodes.has(code.toLowerCase())) {
          seenCodes.add(code.toLowerCase());
          uniqueSubs.push({
            code: s.code || s.subjectCode || 'SUB',
            name: s.name || s.subjectName || 'Subject',
            faculty: s.faculty || s.staffName || 'Allocated Faculty',
            credits: s.credits || 3,
            attendance: resolvedStudent.attendance > 0 ? resolvedStudent.attendance : 0
          });
        }
      });
      setRegisteredSubjects(uniqueSubs);

      // 9. Original Today's Timetable for Student's Department & Semester
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDayName = dayNames[new Date().getDay()];

      const rawTimetable = Array.isArray(ttRes?.data) ? ttRes.data : [];
      const localTimetables = JSON.parse(localStorage.getItem(`erp_timetable_${tenantId}`) || '[]');
      const combinedTT = [...rawTimetable, ...localTimetables].filter(t => 
        (t.department || t.dept || '').toLowerCase() === resolvedStudent.dept.toLowerCase()
      );

      const todayClasses = combinedTT.filter(t => (t.day || '').toLowerCase() === todayDayName.toLowerCase());
      
      const mappedSchedule = todayClasses.map((slot, idx) => ({
        period: slot.periodName || slot.periodId?.periodName || `Period ${idx + 1}`,
        time: slot.timeRange || (slot.periodId ? `${slot.periodId.startTime} - ${slot.periodId.endTime}` : '09:00 AM - 10:00 AM'),
        subject: slot.subjectId?.subjectName || slot.subjectName || slot.subject || 'Lecture',
        code: slot.subjectId?.code || slot.subjectCode || '',
        faculty: slot.facultyAllocationId?.staffId?.name || slot.facultyName || slot.staffName || 'Faculty In-Charge',
        room: slot.roomNo || slot.room || 'Classroom',
        status: idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Upcoming'
      }));

      setTodaySchedule(mappedSchedule);

    } catch (err) {
      console.error('Failed to load original student data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadLiveSession, navigate]);

  useEffect(() => {
    fetchOriginalStudentData();
  }, [fetchOriginalStudentData]);

  useRealtimeSync(fetchOriginalStudentData, ['timetable', 'substitutions', 'class_started', 'fees', 'scholarships', 'attendance', 'marks']);

  if (loading || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = dayNames[new Date().getDay()];

  return (
    <div className="student-dashboard animate-fade-in" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Real-Time Original Student Header Card ── */}
      <div 
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #4f46e5, #06b6d4, #10b981)' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '0.5rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              <span>Real-Time Academic Sync Active</span>
            </div>
            <h1 style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 0.35rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GraduationCap size={28} className="text-indigo-600" />
              {studentDetails.name} — Student Portal
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              <strong>{studentDetails.dept}</strong> • {studentDetails.sem} (Section {studentDetails.section || 'A'})
              {classAdvisor?.name && <span> • Class Advisor: <strong>{classAdvisor.name}</strong></span>}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', padding: '6px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>REG NO:</span>
              <strong style={{ letterSpacing: '0.04em' }}>{studentDetails.id}</strong>
            </div>

            <button 
              type="button" 
              onClick={() => fetchOriginalStudentData(true)} 
              className="btn-secondary" 
              style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Sync
            </button>
          </div>
        </div>
      </div>

      {/* Library Fine Warning */}
      {hasOverdueBooks && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldAlert size={22} className="shrink-0" />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700 }}>Library Clearance Alert: Overdue Books</h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem' }}>You have overdue library books. Outstanding fine: <strong>₹{overdueFines}</strong>. Return books to avoid exam hall ticket blockage.</p>
          </div>
          <button className="btn-secondary" style={{ fontSize: '0.78rem', padding: '4px 10px' }} onClick={() => navigate('/student/library')}>
            View Library
          </button>
        </div>
      )}

      {/* Live Class Stream Banner */}
      {liveClassSession && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'linear-gradient(90deg, #065f46, #047857)',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          border: '1px solid #34d399'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} fill="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, background: 'rgba(0,0,0,0.3)', color: '#a7f3d0', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🟢 LIVE NOW
                </span>
                <span style={{ fontSize: '0.76rem', color: '#d1fae5', fontWeight: 600 }}>{liveClassSession.roomNo || 'Lecture Hall'}</span>
              </div>
              <h3 style={{ margin: '2px 0 0', fontSize: '1rem', fontWeight: 800 }}>{liveClassSession.subjectId?.subjectName || 'Current Lecture'}</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.9 }}>Faculty: <strong>{liveClassSession.facultyId?.name || 'Faculty In-Charge'}</strong></p>
            </div>
          </div>

          <button style={{ background: '#ffffff', color: '#065f46', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
            Join Classroom Stream <ExternalLink size={14} />
          </button>
        </div>
      )}

      {/* ── 6-KPI Original Academic Metric Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        
        {/* Metric 1: Attendance */}
        <div className="hostel-kpi-card" onClick={() => navigate('/student/attendance')} style={{ cursor: 'pointer', padding: '16px' }}>
          <div className="hostel-kpi-top">
            <div className="hostel-kpi-icon" style={{ background: studentDetails.attendance >= 75 ? '#dcfce7' : studentDetails.attendance > 0 ? '#fef3c7' : '#f1f5f9', color: studentDetails.attendance >= 75 ? '#16a34a' : studentDetails.attendance > 0 ? '#d97706' : '#64748b' }}>
              <Percent size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: studentDetails.attendance >= 75 ? '#dcfce7' : studentDetails.attendance > 0 ? '#fee2e2' : '#f1f5f9', color: studentDetails.attendance >= 75 ? '#15803d' : studentDetails.attendance > 0 ? '#dc2626' : '#64748b' }}>
              {studentDetails.attendance >= 75 ? 'Exam Eligible' : studentDetails.attendance > 0 ? 'Shortage (<75%)' : 'No Records'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Rate</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: studentDetails.attendance >= 75 ? '#16a34a' : studentDetails.attendance > 0 ? '#dc2626' : 'var(--text-main)' }}>
              {studentDetails.attendance}%
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {studentDetails.attendance > 0 ? 'Calculated from live roll call' : 'Awaiting attendance logging'}
            </p>
          </div>
        </div>

        {/* Metric 2: CGPA */}
        <div className="hostel-kpi-card" onClick={() => navigate('/student/marks')} style={{ cursor: 'pointer', padding: '16px' }}>
          <div className="hostel-kpi-top">
            <div className="hostel-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
              <Award size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca' }}>
              {studentMarks?.cgpa ? 'Graded' : 'Awaiting Exams'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cumulative CGPA</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: 'var(--text-main)' }}>
              {studentMarks?.cgpa || studentDetails.cgpa || 'N/A'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {studentMarks?.cgpa ? 'Official Academic Grade' : 'Semester results pending'}
            </p>
          </div>
        </div>

        {/* Metric 3: Internal CIA */}
        <div className="hostel-kpi-card" onClick={() => navigate('/student/marks')} style={{ cursor: 'pointer', padding: '16px' }}>
          <div className="hostel-kpi-top">
            <div className="hostel-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <FileText size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#fef3c7', color: '#b45309' }}>
              {studentMarks?.internal !== null ? 'Recorded' : 'Pending CIA'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Internal CIA Score</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: '#d97706' }}>
              {studentMarks?.internal !== null ? `${studentMarks.internal} / 50` : '-- / 50'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {studentMarks?.internal !== null ? 'Continuous Assessment' : 'Internal marks not entered'}
            </p>
          </div>
        </div>

        {/* Metric 4: Fee Status */}
        <div className="hostel-kpi-card" onClick={() => navigate('/student/fees')} style={{ cursor: 'pointer', padding: '16px' }}>
          <div className="hostel-kpi-top">
            <div className="hostel-kpi-icon" style={{ background: studentDetails.feeStatus === 'Paid' ? '#dcfce7' : '#fee2e2', color: studentDetails.feeStatus === 'Paid' ? '#16a34a' : '#dc2626' }}>
              <CreditCard size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: studentDetails.feeStatus === 'Paid' ? '#dcfce7' : '#fee2e2', color: studentDetails.feeStatus === 'Paid' ? '#15803d' : '#dc2626' }}>
              {studentDetails.feeStatus === 'Paid' ? 'All Cleared' : (studentDetails.pendingFeeAmount > 0 ? `Due ₹${studentDetails.pendingFeeAmount.toLocaleString()}` : 'Payment Due')}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fee Clearance</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: studentDetails.feeStatus === 'Paid' ? '#16a34a' : '#dc2626' }}>
              {studentDetails.feeStatus}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {studentDetails.feeStatus === 'Paid' ? 'Zero outstanding balance' : 'Tuition / Hostel fee balance'}
            </p>
          </div>
        </div>

        {/* Metric 5: Assignments */}
        <div className="hostel-kpi-card" onClick={() => navigate('/student/assignments')} style={{ cursor: 'pointer', padding: '16px' }}>
          <div className="hostel-kpi-top">
            <div className="hostel-kpi-icon" style={{ background: '#f3e8ff', color: '#9333ea' }}>
              <ClipboardList size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#f3e8ff', color: '#7e22ce' }}>
              {assignmentsCount > 0 ? 'Active' : 'Completed'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Course Assignments</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: '#9333ea' }}>
              {assignmentsCount} Active
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {assignmentsCount > 0 ? 'Submissions open' : 'No pending submissions'}
            </p>
          </div>
        </div>

        {/* Metric 6: Library */}
        <div className="hostel-kpi-card" onClick={() => navigate('/student/library')} style={{ cursor: 'pointer', padding: '16px' }}>
          <div className="hostel-kpi-top">
            <div className="hostel-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
              <BookOpen size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1' }}>
              {borrowedBooksCount > 0 ? 'Issued' : 'Clear'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Library Resources</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0', color: '#0284c7' }}>
              {borrowedBooksCount} Books
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {hasOverdueBooks ? `Fine: ₹${overdueFines}` : 'Zero overdue fines'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Operations Action Bar ── */}
      <div className="glass-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Student ERP Quick Actions</h4>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>Direct access to timetable, assignments, fee clearance, and exam marks.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => navigate('/student/timetable')}>
            <Calendar size={14} /> Timetable
          </button>
          <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => navigate('/student/assignments')}>
            <ClipboardList size={14} /> Assignments
          </button>
          <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => navigate('/student/fees')}>
            <CreditCard size={14} /> Fee Portal
          </button>
          <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => navigate('/student/hostel')}>
            <MapPin size={14} /> Hostel & Passes
          </button>
          <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => navigate('/student/marks')}>
            <Award size={14} /> Marks
          </button>
        </div>
      </div>

      {/* ── Today's Academic Schedule Timeline ── */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} className="text-indigo-600" /> Today's Lecture & Lab Schedule
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0 0' }}>
              Daily structured period timetable for {studentDetails.dept} ({studentDetails.sem}).
            </p>
          </div>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '4px 12px', borderRadius: '8px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {todaySchedule.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border-color, #e2e8f0)' }}>
            <Calendar size={32} className="text-gray-400 mx-auto mb-2" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
              No classes scheduled for {todayDayName}
            </h4>
            <p style={{ margin: '4px 0 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              There are no lecture periods or lab sessions configured for {studentDetails.dept} today.
            </p>
            <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => navigate('/student/timetable')}>
              View Full Weekly Timetable →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todaySchedule.map((slot, idx) => (
              <div 
                key={idx} 
                style={{ 
                  padding: '14px 16px', 
                  background: slot.status === 'In Progress' ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-secondary, #f8fafc)', 
                  border: slot.status === 'In Progress' ? '1.5px solid #6366f1' : '1px solid var(--border-color, #e2e8f0)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '10px', 
                    background: slot.status === 'In Progress' ? '#6366f1' : 'var(--bg-card, #ffffff)', 
                    color: slot.status === 'In Progress' ? '#ffffff' : 'var(--text-main)', 
                    border: '1px solid var(--border-color, #e2e8f0)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.78rem'
                  }}>
                    <span>{slot.period.replace(/period\s*/i, 'P')}</span>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>{slot.subject}</h4>
                      {slot.code && <span style={{ fontSize: '0.68rem', fontWeight: 700, background: 'var(--border-color, #e2e8f0)', padding: '1px 6px', borderRadius: '4px' }}>{slot.code}</span>}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'var(--text-muted, #64748b)' }}>
                      Faculty: <strong>{slot.faculty}</strong> • Hall: <strong>{slot.room}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '4px 10px', borderRadius: '6px' }}>
                    {slot.time}
                  </div>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: slot.status === 'In Progress' ? '#dbeafe' : slot.status === 'Completed' ? '#dcfce7' : '#f1f5f9',
                    color: slot.status === 'In Progress' ? '#1d4ed8' : slot.status === 'Completed' ? '#15803d' : '#64748b'
                  }}>
                    {slot.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 2-Column Performance & Subject Readiness Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        
        {/* GPA Progression Trend Chart */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>Academic CGPA & Semester Trend</h2>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca' }}>Official Records</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '0 0 16px 0' }}>Cumulative grade progression across academic semesters.</p>
          </div>

          {gpaTrend.length > 0 ? (
            <div style={{ height: '220px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gpaTrend} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="semester" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card, #ffffff)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="gpa" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border-color, #e2e8f0)', margin: '10px 0' }}>
              <Award size={32} className="text-gray-400 mx-auto mb-2" />
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>Awaiting Semester Examination Results</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Your GPA trend curve will populate automatically as examination results are published for {studentDetails.dept}.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '12px', marginTop: '8px', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            <span>Registered Department: <strong>{studentDetails.dept}</strong></span>
            <button style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.76rem' }} onClick={() => navigate('/student/marks')}>
              Marksheet & Exams →
            </button>
          </div>
        </div>

        {/* Subject-Wise Registered Curriculum */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>Registered Subjects ({registeredSubjects.length})</h2>
              <button style={{ fontSize: '0.76rem', color: '#4f46e5', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/student/attendance')}>
                Attendance Roster →
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '0 0 14px 0' }}>
              Curriculum courses for {studentDetails.dept} ({studentDetails.sem}).
            </p>
          </div>

          {registeredSubjects.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border-color, #e2e8f0)', margin: '10px 0' }}>
              <BookOpen size={32} className="text-gray-400 mx-auto mb-2" />
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>No Registered Subjects Found</h4>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                No subjects are currently assigned to {studentDetails.dept} in the academic structure.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {registeredSubjects.map((sub, idx) => (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{sub.name}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '6px' }}>({sub.code})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 800, color: sub.attendance >= 75 ? '#16a34a' : sub.attendance > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                        {sub.attendance > 0 ? `${sub.attendance}%` : '--'}
                      </span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: sub.attendance >= 75 ? '#dcfce7' : '#f1f5f9', color: sub.attendance >= 75 ? '#15803d' : '#64748b' }}>
                        {sub.credits} Credits
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--border-color, #e2e8f0)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(4, sub.attendance)}%`, background: sub.attendance >= 75 ? 'linear-gradient(90deg, #10b981, #059669)' : sub.attendance > 0 ? '#ef4444' : '#cbd5e1', borderRadius: '10px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '10px', marginTop: '12px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>Branch: <strong>{studentDetails.dept}</strong></span>
            <span style={{ color: studentDetails.attendance >= 75 ? '#16a34a' : 'var(--text-muted)', fontWeight: 700 }}>
              {studentDetails.attendance >= 75 ? '● Eligible for End-Sem' : '● Threshold: Min 75%'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default StudentDashboard;
