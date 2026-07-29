import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import {
  ClipboardList, BookOpen, AlertCircle, FileText, Bell,
  Percent, Calendar, ShieldAlert, Clock, MapPin, User, Briefcase, Play, CheckCircle2, Download, ExternalLink
} from 'lucide-react';
import { 
  getStudentById, getAttendanceByStudent, 
  getMarksByStudent, getFeesByStudent, getExams,
  getTimetable, getNotifications, getMyLibraryTransactions, getSubjects,
  getClassAdvisorInfo, getStudentLiveClass, getAssignments
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentDashboard.css';

const DEFAULT_STUDENT = {
  id: 'CS2022001',
  name: 'John Doe',
  dept: 'Cyber Security',
  sem: 'Semester 6',
  email: 'john@college.edu'
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const studentIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [studentSession, setStudentSession] = useState(DEFAULT_STUDENT);

  // Student specific data
  const [studentDetails, setStudentDetails] = useState(null);
  const [studentMarks, setStudentMarks] = useState(null);
  const [assignmentsCount, setAssignmentsCount] = useState(0);
  const [exams, setExams] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [scholarship, setScholarship] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [hasOverdueBooks, setHasOverdueBooks] = useState(false);
  const [overdueFines, setOverdueFines] = useState(0);
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
      console.error('Error fetching live class session for student:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const session = sessionStorage.getItem('student_session');
      let activeStud = DEFAULT_STUDENT;
      if (session) {
        activeStud = JSON.parse(session);
        setStudentSession(activeStud);
      } else {
        navigate('/student/login');
        return;
      }

      studentIdRef.current = activeStud.id;

      try {
        const [
          studRes, attendanceRes, marksRes, feesRes, 
          examsRes, notifRes, libraryRes, advisorRes, assignRes
        ] = await Promise.all([
          getStudentById(activeStud.id).catch(() => null),
          getAttendanceByStudent(activeStud.id).catch(() => null),
          getMarksByStudent(activeStud.id).catch(() => null),
          getFeesByStudent(activeStud.id).catch(() => null),
          getExams().catch(() => null),
          getNotifications().catch(() => null),
          getMyLibraryTransactions().catch(() => null),
          getClassAdvisorInfo().catch(() => null),
          getAssignments({ department: activeStud.dept, class: activeStud.sem }).catch(() => null)
        ]);

        loadLiveSession();
        
        if (assignRes?.data) {
          setAssignmentsCount(assignRes.data.length);
        }

        if (advisorRes?.data?.isAdvisor !== undefined && advisorRes?.data?.advisor) {
          setClassAdvisor(advisorRes.data.advisor);
        }

        if (libraryRes?.data && Array.isArray(libraryRes.data)) {
          const overdue = libraryRes.data.filter(t => t.status === 'Issued' && t.dueDate && new Date(t.dueDate) < new Date());
          if (overdue.length > 0) {
            setHasOverdueBooks(true);
            const totalFine = overdue.reduce((sum, item) => {
              const diffDays = Math.ceil((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24));
              return sum + (diffDays * 5);
            }, 0);
            setOverdueFines(totalFine);
          }
        }

        if (notifRes?.data) {
          setNotifications(notifRes.data);
        }

        let dbRecord = null;

        if (studRes && studRes.data) {
          dbRecord = studRes.data;
          if (dbRecord.scholarshipDetails?.status === 'Approved') {
            setScholarship(dbRecord.scholarshipDetails);
          }
        } else {
          const allStudentsRaw = localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
          const localStudents = allStudentsRaw ? JSON.parse(allStudentsRaw) : [];
          const localMatch = localStudents.find(s => s.id === activeStud.id);
          
          let localAtt = 85;
          if (localMatch && localMatch.attendance) {
            const parsed = parseInt(String(localMatch.attendance).replace('%', '').trim());
            if (!isNaN(parsed)) localAtt = parsed;
          }

          dbRecord = {
            id: activeStud.id, name: activeStud.name, dept: activeStud.dept, sem: activeStud.sem,
            attendance: localAtt, cgpa: 8.6, status: 'Active', feeStatus: 'Pending', email: activeStud.email
          };
        }

        if (attendanceRes?.data && attendanceRes.data.length > 0) {
          const presentDays = attendanceRes.data.filter(r => r.status.toLowerCase() === 'present').length;
          dbRecord.attendance = Math.round((presentDays / attendanceRes.data.length) * 100);
          
          const todayStr = new Date().toISOString().split('T')[0];
          const todayRecord = attendanceRes.data.find(r => r.date && r.date.toString().startsWith(todayStr));
          dbRecord.todayStatus = todayRecord ? (todayRecord.status.toLowerCase() === 'present' ? 'Present' : 'Absent') : 'Not Marked';
        } else {
          dbRecord.todayStatus = 'Not Marked';
        }
        
        setStudentDetails(dbRecord);

        if (examsRes?.data) {
          setExams(examsRes.data);
        }

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = dayNames[new Date().getDay()];
        try {
          const targetSem = activeStud.sem || dbRecord.sem || 'Semester 1';
          let querySem = targetSem;
          if (querySem && querySem.startsWith('Sem ')) {
            querySem = querySem.replace('Sem ', 'Semester ');
          }

          dbRecord.sem = targetSem;

          const targetDept = activeStud.dept || dbRecord.dept || 'Computer Science Engineering';
          dbRecord.dept = targetDept;
          
          setStudentDetails(dbRecord);
          const updatedSession = {...activeStud, sem: targetSem, dept: targetDept};
          setStudentSession(updatedSession);
          sessionStorage.setItem('student_session', JSON.stringify(updatedSession));
          
          const ttRes = await getTimetable(targetDept, querySem, activeStud.section || 'A');
          let todayClasses = [];
          if (ttRes.data) {
            todayClasses = ttRes.data.filter(s => s.day?.toLowerCase() === todayName.toLowerCase());
          }
          setTodaySchedule(todayClasses);
        } catch (err) {
          console.warn('Timetable API error:', err.message);
        }

        if (marksRes && marksRes.data && marksRes.data.length > 0) {
          const marksData = marksRes.data;
          const semMap = {};
          marksData.forEach(m => {
            if (!semMap[m.semester]) semMap[m.semester] = [];
            semMap[m.semester].push(m.gpa || 0);
          });
          
          let cumulativeGPA = 0;
          let semCount = 0;
          let cgpaTrend = [];
          Object.keys(semMap).sort().forEach(sem => {
            const semAvg = semMap[sem].reduce((a, b) => a + b, 0) / semMap[sem].length;
            cumulativeGPA += semAvg;
            semCount++;
            cgpaTrend.push(Number((cumulativeGPA / semCount).toFixed(2)));
          });

          setStudentMarks({ 
            internal: marksData[0].internalMarks || 0, 
            external: marksData[0].semesterMarks || 0, 
            trend: cgpaTrend,
            rawMarks: marksData
          });
        }
        
        const feesData = feesRes?.data || [];
        const pendingFee = feesData.find(f => f.status === 'Pending');
        setStudentDetails(prev => prev ? { ...prev, feeStatus: pendingFee ? 'Pending' : 'Paid' } : prev);

      } catch (err) {
        console.error('Error fetching student dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate, loadLiveSession]);

  useRealtimeSync(loadLiveSession, ['timetable', 'substitutions', 'class_started']);

  if (loading || !studentDetails) {
    return (
      <div className="student-loading-container">
        <span className="student-spinner-large"></span>
      </div>
    );
  }

  const studDept = studentDetails?.department || studentDetails?.dept || studentSession?.department || studentSession?.dept || 'Computer Science Engineering';
  const studSem = studentDetails?.sem || studentDetails?.semester || studentSession?.sem || studentSession?.semester || 'Semester 1';

  return (
    <div className="student-dashboard animate-fade-in">
      {hasOverdueBooks && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 p-5 rounded-2xl mb-8 flex items-start gap-4 shadow-sm">
          <ShieldAlert size={28} className="shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-lg mb-1 text-red-700 dark:text-red-300">WARNING: Overdue Library Books</h3>
            <p className="text-sm opacity-90 leading-relaxed">
              You currently have one or more overdue library books. Your accumulated fine is <strong>₹{overdueFines}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* CURRENT LIVE CLASS BANNER (Step 3) */}
      {liveClassSession && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '16px',
          background: 'linear-gradient(to right, #059669, #0f766e)',
          color: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          border: '1px solid #10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '12px' }}>
              <Play size={24} color="#ffffff" fill="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.625rem', fontWeight: 800, background: 'rgba(2, 44, 34, 0.4)', color: '#a7f3d0', padding: '0.125rem 0.5rem', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  🟢 LIVE NOW
                </span>
                <span style={{ fontSize: '0.75rem', color: '#d1fae5', fontWeight: 600 }}>{liveClassSession.roomNo || 'Room C101'}</span>
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', margin: '0.125rem 0 0 0' }}>
                {liveClassSession.subjectId?.subjectName || 'Programming in C'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#d1fae5', fontWeight: 500, margin: '0.125rem 0 0 0' }}>
                Faculty: <strong>{liveClassSession.facultyId?.name || 'Arun Kumar'}</strong> • {liveClassSession.periodId?.startTime || '09:00 AM'} - {liveClassSession.periodId?.endTime || '09:50 AM'}
              </p>
            </div>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.2)', fontSize: '0.75rem', fontWeight: 700, color: '#ffffff' }}>
            Class in Progress
          </div>
        </div>
      )}

      {/* TODAY'S STUDY MATERIALS / NOTES (Step 5) */}
      {todayMaterials.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 0.75rem 0' }}>
            <BookOpen color="#2563eb" size={18} /> Today's Class Materials & Notes
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
            {todayMaterials.map((mat, idx) => (
              <div key={idx} style={{ padding: '0.75rem', background: 'rgba(239, 246, 255, 0.6)', border: '1px solid #bfdbfe', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#1e3a8a' }}>{mat.title}</div>
                  <div style={{ fontSize: '0.625rem', color: '#64748b', fontWeight: 500, margin: '0.25rem 0 0 0' }}>
                    {mat.subjectName} • Faculty: {mat.facultyName}
                  </div>
                </div>
                <a 
                  href={mat.fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#ffffff', background: '#2563eb', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                >
                  <Download size={14} /> View File
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div style={{
        background: 'var(--primary)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            My Academics
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem', fontWeight: 500 }}>
            Overview of your academic stats, schedule, and study materials for {studSem}.
          </p>
        </div>
        <div style={{ background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '0.35rem 0.8rem', borderRadius: '30px', fontSize: '0.8rem', color: '#ffffff', fontWeight: 600 }}>
          <span>REG NO: <strong>{studentDetails.id}</strong></span>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #6366F1' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Percent size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{studentDetails.attendance || 0}%</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CGPA</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{studentDetails.cgpa || 'N/A'}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Internals</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{studentMarks ? studentMarks.internal : '--'}/50</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${studentDetails.feeStatus === 'Pending' ? '#EF4444' : '#10B981'}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: studentDetails.feeStatus === 'Pending' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: studentDetails.feeStatus === 'Pending' ? '#EF4444' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fee Status</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: studentDetails.feeStatus === 'Pending' ? '#EF4444' : '#10B981' }}>{studentDetails.feeStatus}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #8B5CF6' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assignments</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{assignmentsCount}</h3>
          </div>
        </div>
      </div>

      {/* Today's Schedule Feed */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-blue-600" size={20} /> Today's Schedule
          </h2>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
        
        <div className="flex flex-col gap-3">
          {todaySchedule.length === 0 ? (
             <div className="p-6 text-center text-gray-400 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
               No classes scheduled for today. Enjoy your day!
             </div>
          ) : (
            todaySchedule.map((slot, idx) => (
              <div key={idx} className="p-4 bg-gray-50/50 hover:bg-blue-50/30 border border-gray-100 rounded-xl transition-colors flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex flex-col justify-center items-center shadow-sm">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{slot.periodId?.periodName || slot.periodName || `P${idx+1}`}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-sm m-0">{slot.subjectId?.subjectName || slot.subjectName || slot.subject || 'Subject'}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-1 m-0">Faculty: {slot.facultyAllocationId?.staffId?.name || slot.facultyName || 'TBA'} • Room: {slot.roomNo || 'TBA'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm inline-block">
                    {slot.timeRange || (slot.periodId ? `${slot.periodId.startTime} - ${slot.periodId.endTime}` : 'Time N/A')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Scholarship Alert Banner */}
      {scholarship && (
        <div style={{ padding: '1rem', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: '#6366F1', color: 'white', padding: '10px', borderRadius: '50%' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>Congratulations! {scholarship.type} Scholarship Active</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              You have been awarded a <strong>{scholarship.amount} fee waiver</strong>.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
