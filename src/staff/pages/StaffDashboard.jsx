import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Users, CalendarCheck, BookOpenCheck,
  ClipboardList, Calendar, FileText, CheckCircle, Clock,
  ArrowRight, Activity, Plus, AlertCircle, GraduationCap, Play, Square, CheckCircle2, UserCheck
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getStudents, getAllMarks, getAllAttendance, getExams, getNotifications, getMyAdvisingClass, getStaffTodaySchedule, startClassSession } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import LiveClassModal from '../components/LiveClassModal';
import './StaffDashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard';

// Fallback session
const DEFAULT_SESSION = {
  id: 'STF001',
  name: 'Dr. Ananya Rao',
  dept: 'Computer Science Engineering',
  deptCode: 'CS',
  role: 'Staff',
  email: 'ananya@college.edu',
  subjects: ['Data Structures', 'DBMS']
};

const MOCK_LEAVES = [];
const MOCK_ASSIGNMENTS = [];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatPeriodName = (period) => {
  if (!period) return 'Period 1';
  const name = typeof period === 'string' ? period.trim() : (period.periodName || '').trim();
  if (period.isBreak || name.toLowerCase().includes('break') || name.toLowerCase().includes('lunch')) {
    return name;
  }
  return name.toLowerCase().includes('period') ? name : `Period ${name}`;
};

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [staffSession, setStaffSession] = useState(DEFAULT_SESSION);

  // States for DB
  const [students, setStudents] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [marks, setMarks] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [exams, setExams] = useState([]);

  // Live Class Modal State
  const [activeClassSlot, setActiveClassSlot] = useState(null);

  // Leave Form State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
  const [leaveSuccess, setLeaveSuccess] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [advisingClass, setAdvisingClass] = useState(null);

  const loadDashboardData = useCallback(async () => {
    try {
      const [studRes, marksRes, attRes, examsRes, notifRes, advisorRes, scheduleRes] = await Promise.all([
        getStudents(),
        getAllMarks(),
        getAllAttendance(),
        getExams().catch(() => ({ data: [] })),
        getNotifications().catch(() => ({ data: [] })),
        getMyAdvisingClass().catch(() => ({ data: { isAdvisor: false } })),
        getStaffTodaySchedule().catch(() => ({ data: [] }))
      ]);

      if (notifRes?.data && Array.isArray(notifRes.data)) setNotifications(notifRes.data);
      if (advisorRes?.data?.isAdvisor && advisorRes?.data?.data) {
        setAdvisingClass(advisorRes.data.data);
      } else {
        setAdvisingClass(null);
      }
      if (studRes?.data) setStudents(studRes.data);
      if (examsRes?.data) setExams(examsRes.data);
      if (scheduleRes?.data) setTodaySchedule(scheduleRes.data);
      setLoadingSchedule(false);

      if (marksRes?.data) {
        const mappedMarks = marksRes.data.map(m => ({
          id: m.studentId,
          name: m.studentName,
          dept: m.department,
          sem: m.semester,
          internal: m.internalMarks,
          external: m.semesterMarks,
          arrears: m.arrearStatus === 'Arrear' ? 1 : 0
        }));
        setMarks(mappedMarks);
      }
      if (attRes?.data) {
        const dailyMap = {};
        attRes.data.forEach(record => {
          const dateStr = new Date(record.date).toLocaleDateString('en-CA');
          if (!dailyMap[dateStr]) {
            dailyMap[dateStr] = {};
          }
          dailyMap[dateStr][record.studentId] = record.status?.toLowerCase() || 'present';
        });
        setAttendanceLogs(dailyMap);
      }
    } catch (err) {
      console.error('Failed to load live staff dashboard data:', err);
      setLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    const session = sessionStorage.getItem('staff_session');
    let activeStaff = DEFAULT_SESSION;
    if (session) {
      activeStaff = JSON.parse(session);
      setStaffSession(activeStaff);
    } else {
      navigate('/staff/login');
      return;
    }

    loadDashboardData();

    // Assignments Setup
    const assignRaw = localStorage.getItem(`erp_assignments_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (assignRaw) {
      setAssignments(JSON.parse(assignRaw));
    } else {
      localStorage.setItem(`erp_assignments_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(MOCK_ASSIGNMENTS));
      setAssignments([]);
    }

    // Leaves Setup
    const leaveRaw = localStorage.getItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    if (leaveRaw) {
      setLeaves(JSON.parse(leaveRaw));
    } else {
      localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(MOCK_LEAVES));
      setLeaves([]);
    }

    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, [loadDashboardData, navigate]);

  useRealtimeSync(loadDashboardData, ['timetable', 'attendance', 'substitutions']);

  const staffName = staffSession.name || 'Faculty Member';
  const staffDept = staffSession.dept || staffSession.department || 'Computer Science Engineering';

  // Derived Stats
  const mySubjects = staffSession.subjects || ['Programming in C', 'DBMS'];
  const myClasses = todaySchedule.length > 0 ? todaySchedule : [
    { department: staffDept, semester: 'Semester 1', section: 'A', subject: 'Programming in C', periodId: { startTime: '09:00 AM', endTime: '09:50 AM' }, roomNo: 'C101' }
  ];

  const studentsAssignedCount = students.filter(s => (s.dept === staffDept || s.department === staffDept)).length || 45;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const attendancePending = !attendanceLogs[todayStr] || Object.keys(attendanceLogs[todayStr]).length === 0;

  const myLeaves = leaves.filter(l => l.staffName === staffName || l.email === staffSession.email);

  const handleLeaveSubmit = (e) => {
    e.preventDefault();
    const newLeave = {
      id: Date.now(),
      staffName,
      email: staffSession.email,
      dept: staffDept,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason,
      status: 'Pending'
    };
    const updatedLeaves = [...leaves, newLeave];
    setLeaves(updatedLeaves);
    localStorage.setItem(`erp_leave_requests_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updatedLeaves));
    setLeaveSuccess(true);
    setTimeout(() => {
      setLeaveModalOpen(false);
      setLeaveForm({ type: 'Casual Leave', startDate: '', endDate: '', reason: '' });
      setLeaveSuccess(false);
    }, 1000);
  };

  const chartData = mySubjects.length > 0 ? mySubjects.map((sub) => ({
    name: sub.length > 15 ? sub.substring(0, 15) + '...' : sub,
    Performance: 70 + Math.floor(Math.random() * 20),
    PassRate: 80 + Math.floor(Math.random() * 15)
  })) : [
    { name: 'General', Performance: 85, PassRate: 90 },
    { name: 'Elective 1', Performance: 75, PassRate: 82 }
  ];

  const handleStartClass = async (cls) => {
    try {
      if (cls.status !== 'Live' && cls.status !== 'Completed') {
        const res = await startClassSession(cls._id);
        if (res.data) {
          cls.session = res.data;
          cls.status = 'Live';
        }
      }
      setActiveClassSlot(cls);
    } catch (err) {
      console.error('Failed to start session', err);
      alert('Failed to start class session.');
    }
  };

  return (
    <div className={`staff-dashboard ${animate ? 'animate-fade-in' : ''}`}>
      
      {/* Header Banner */}
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
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Faculty Overview
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem', fontWeight: 500 }}>
            Department of <strong>{staffDept}</strong> • Classroom Instructor
          </p>
        </div>
      </div>

      {/* Class Advisor Banner */}
      {advisingClass && (
        <div style={{ background: '#2563eb', color: 'white', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 12px rgba(37,99,235, 0.25)' }}>
          <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '50%' }}>
            <GraduationCap size={28} color="white" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Class Advisor for {advisingClass.department}</h2>
            <p style={{ margin: '0.2rem 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>{advisingClass.semester} · Section {advisingClass.section}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button className="btn-secondary" style={{ background: 'white', color: '#2563eb', border: 'none', fontWeight: 700 }} onClick={() => navigate('/staff/attendance')}>View Attendance</button>
          </div>
        </div>
      )}

      {/* TODAY'S LIVE CLASS EXECUTION FEED */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="text-blue-600" size={20} /> Today's Teaching Schedule
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Start live class session, record attendance, and upload study notes.</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
            {DAYS[new Date().getDay()]}, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loadingSchedule ? (
            <div className="col-span-full p-8 text-center text-gray-400 text-xs font-medium">Loading today's schedule...</div>
          ) : todaySchedule.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-400 text-xs font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No classes scheduled for today.
            </div>
          ) : (
            todaySchedule.map((cls, idx) => {
              const subjectName = cls.subjectId?.subjectName || cls.subject || 'Subject';
              const classText = `${cls.department || staffDept} • ${cls.semester || 'Semester 1'} Sec ${cls.section || 'A'}`;
              const timeRange = cls.periodId ? `${cls.periodId.startTime} - ${cls.periodId.endTime}` : '09:00 AM - 09:50 AM';
              const periodName = formatPeriodName(cls.periodId);
              const room = cls.roomNo || 'Room 201';
              const isLive = cls.status === 'Live';
              const isCompleted = cls.status === 'Completed';

              return (
                <div 
                  key={cls._id || idx}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    transition: 'all 0.3s ease',
                    background: isLive ? 'linear-gradient(to bottom right, #f0fdf4, #f0fdfa)' : isCompleted ? '#f9fafb' : '#ffffff',
                    border: isLive ? '1px solid #a7f3d0' : '1px solid #e5e7eb',
                    boxShadow: isLive ? '0 4px 6px -1px rgba(16, 185, 129, 0.1), 0 0 0 1px rgba(16, 185, 129, 0.2)' : (isCompleted ? 'none' : '0 1px 3px 0 rgba(0, 0, 0, 0.1)'),
                    opacity: isCompleted ? 0.8 : 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#ffffff', border: '1px solid #f3f4f6', padding: '0.25rem 0.6rem', borderRadius: '6px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                      {periodName} ({timeRange})
                    </span>

                    {isLive ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.65rem', fontWeight: 800, color: '#047857', background: '#d1fae5', padding: '0.25rem 0.6rem', borderRadius: '9999px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}></span> LIVE
                      </span>
                    ) : isCompleted ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.65rem', fontWeight: 700, color: '#4b5563', background: '#e5e7eb', padding: '0.25rem 0.6rem', borderRadius: '9999px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        <CheckCircle2 size={12} color="#6b7280" /> Completed
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #dbeafe', padding: '0.25rem 0.6rem', borderRadius: '9999px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                        Upcoming
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', lineHeight: 1.3, margin: '0 0 0.25rem 0' }}>
                    {subjectName}
                  </h3>

                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', margin: '0 0 0.75rem 0' }}>
                    {classText}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#f9fafb', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}></span> {room}
                    </span>

                    {isLive ? (
                      <button
                        onClick={() => handleStartClass(cls)}
                        style={{ padding: '0.5rem 0.875rem', background: '#059669', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      >
                        <Play size={14} color="#ffffff" fill="#ffffff" /> Resume
                      </button>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleStartClass(cls)}
                        style={{ padding: '0.5rem 0.875rem', background: '#f3f4f6', color: '#374151', fontWeight: 700, fontSize: '0.75rem', borderRadius: '12px', border: '1px solid #e5e7eb', cursor: 'pointer' }}
                      >
                        Details
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartClass(cls)}
                        style={{ padding: '0.5rem 0.875rem', background: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.75rem', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      >
                        <Play size={14} color="#ffffff" fill="#ffffff" /> Start
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #6366F1' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Students Assigned</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{studentsAssignedCount}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${attendancePending ? '#F59E0B' : '#10B981'}` }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: attendancePending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: attendancePending ? '#F59E0B' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarCheck size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attendance Status</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.25rem', fontWeight: 800, color: attendancePending ? '#F59E0B' : '#10B981' }}>{attendancePending ? 'Pending Today' : 'Marked ✅'}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3B82F6' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Subjects Taught</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{mySubjects.length}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assignments</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{assignments.length}</h3>
          </div>
        </div>
      </div>

      {/* LIVE CLASS MODAL CONTROL PANEL */}
      {activeClassSlot && (
        <LiveClassModal 
          slot={activeClassSlot} 
          onClose={() => setActiveClassSlot(null)}
          onSessionUpdated={loadDashboardData}
        />
      )}

    </div>
  );
};

export default StaffDashboard;
