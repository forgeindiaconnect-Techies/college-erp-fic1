import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, CalendarCheck, TrendingUp, BookOpenCheck,
  AlertTriangle, ArrowRight, Trophy, Activity, Briefcase, Clock,
  Calendar, MapPin, User, ChevronRight, BookOpen, Inbox, FileText, ClipboardList, Megaphone, CheckCircle, Play, CheckCircle2, UserCheck
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getStudents,
  getStaff,
  getSubjects,
  getExams,
  getHodClassMonitoring,
  getAllAttendance
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import './HodDashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard';

const getStoredHodSession = () => {
  try {
    const storedSession =
      sessionStorage.getItem('hod_session');

    return storedSession
      ? JSON.parse(storedSession)
      : null;
  } catch {
    return null;
  }
};

const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal', 'bg-gradient-pink'];

const HodDashboard = () => {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [hodSession] = useState(getStoredHodSession);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [loadingMonitoring, setLoadingMonitoring] = useState(true);

  const fetchLiveData = useCallback(async () => {
    if (!hodSession?.dept && !hodSession?.department) {
      return;
    }

    try {
      const deptName =
        hodSession.dept || hodSession.department;

      const [
        studentResponse,
        staffResponse,
        subjectResponse,
        examResponse,
        attendanceResponse,
        monitoringResponse
      ] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getSubjects().catch(() => ({ data: [] })),
        getExams().catch(() => ({ data: [] })),
        getAllAttendance().catch(() => ({ data: [] })),
        getHodClassMonitoring(deptName).catch(() => ({
          data: []
        }))
      ]);

      const readArray = (response, key) => {
        const data = response?.data;

        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.[key])) return data[key];
        if (Array.isArray(data?.data)) return data.data;

        return [];
      };

      setStudents(readArray(studentResponse, 'students'));
      setStaff(readArray(staffResponse, 'staff'));
      setSubjects(readArray(subjectResponse, 'subjects'));
      setExams(readArray(examResponse, 'exams'));
      setAttendance(
        readArray(attendanceResponse, 'attendance')
      );
      setLiveMonitoring(
        readArray(monitoringResponse, 'monitoring')
      );

      setLoadingMonitoring(false);
    } catch (err) {
      console.warn('Dashboard API load failed:', err.message);
      setLoadingMonitoring(false);
    }
  }, [hodSession?.dept, hodSession?.department]);

  useEffect(() => {
    if (!hodSession) {
      navigate('/login');
      return;
    }

    fetchLiveData();

    const timer = setTimeout(
      () => setAnimate(true),
      100
    );

    return () => clearTimeout(timer);
  }, [navigate, fetchLiveData, hodSession]);

  useRealtimeSync(fetchLiveData, ['students', 'staff', 'substitutions', 'timetable', 'class_started']);

  const deptName =
    hodSession?.dept ||
    hodSession?.department ||
    'Department';

  const matchesDepartment = value =>
    String(value || '').trim().toLowerCase() ===
    String(deptName || '').trim().toLowerCase();

  const departmentStudents = students.filter(student =>
    matchesDepartment(student.dept || student.department)
  );

  const departmentStaff = staff.filter(member =>
    matchesDepartment(member.dept || member.department)
  );

  const departmentSubjects = subjects.filter(subject =>
    matchesDepartment(subject.department || subject.dept)
  );

  const departmentExams = exams.filter(exam =>
    matchesDepartment(exam.dept || exam.department)
  );

  const departmentAttendance = attendance.filter(record =>
    matchesDepartment(record.department || record.dept)
  );

  const attendedRecords = departmentAttendance.filter(record =>
    ['Present', 'Late'].includes(record.status)
  ).length;

  const attendancePercentage =
    departmentAttendance.length > 0
      ? Math.round(
          (attendedRecords / departmentAttendance.length) * 100
        )
      : 0;

  const today = new Date().toISOString().split('T')[0];

  const upcomingExams = departmentExams.filter(
    exam =>
      exam.date >= today &&
      exam.status !== 'Cancelled'
  ).length;

  return (
    <div className={`hod-dashboard ${animate ? 'animate-fade-in' : ''}`}>
      
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
            Department Overview
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem', fontWeight: 500 }}>
            HOD Dashboard • Department of <strong>{deptName}</strong>
          </p>
        </div>
      </div>

      <div className="hod-realtime-summary">
        <button
          type="button"
          onClick={() => navigate('/hod/students')}
          className="hod-summary-card"
        >
          <Users size={22} />
          <span>Total Students</span>
          <strong>{departmentStudents.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/staff')}
          className="hod-summary-card"
        >
          <GraduationCap size={22} />
          <span>Department Staff</span>
          <strong>{departmentStaff.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/subjects')}
          className="hod-summary-card"
        >
          <BookOpen size={22} />
          <span>Total Subjects</span>
          <strong>{departmentSubjects.length}</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/attendance')}
          className="hod-summary-card"
        >
          <CalendarCheck size={22} />
          <span>Attendance</span>
          <strong>{attendancePercentage}%</strong>
        </button>

        <button
          type="button"
          onClick={() => navigate('/hod/exams')}
          className="hod-summary-card"
        >
          <ClipboardList size={22} />
          <span>Upcoming Exams</span>
          <strong>{upcomingExams}</strong>
        </button>
      </div>

      {/* TODAY'S LIVE CLASS EXECUTION MONITORING TABLE (Step 8) */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} /> Today's Live Class Execution Monitoring
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time status of today's scheduled classes and attendance submissions.</p>
          </div>
          <button 
            onClick={() => navigate('/hod/substitution')}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
          >
            <UserCheck size={14} /> Faculty Substitution
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase tracking-wider border-b border-gray-200">
                <th className="p-3 font-bold">Faculty Member</th>
                <th className="p-3 font-bold">Subject</th>
                <th className="p-3 font-bold">Period / Time</th>
                <th className="p-3 font-bold">Room Venue</th>
                <th className="p-3 font-bold">Class Status</th>
                <th className="p-3 font-bold text-right">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonitoring ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 font-medium">Loading live class execution data...</td>
                </tr>
              ) : liveMonitoring.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400 font-medium">No classes scheduled for today in {deptName}.</td>
                </tr>
              ) : (
                liveMonitoring.map((slot, idx) => {
                  const isRunning = slot.status === 'Running' || slot.status === 'Live';
                  const isCompleted = slot.status === 'Completed';

                  return (
                    <tr key={slot._id || idx} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 font-bold text-gray-800">
                        {slot.actualFaculty}
                        {slot.isSubstitution && (
                          <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                            Substituted (Reg: {slot.regularFaculty})
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-semibold text-blue-900">
                        {slot.subjectName}
                      </td>

                      <td className="p-3 text-gray-600 font-medium">
                        {slot.periodName} ({slot.timeRange})
                      </td>

                      <td className="p-3 font-semibold text-gray-600">
                        <span className="bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-[11px]">
                          {slot.roomNo}
                        </span>
                      </td>

                      <td className="p-3 font-bold">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-extrabold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Running 🟢
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                            <CheckCircle2 size={12} className="text-emerald-600" /> Completed ✅
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                            Pending ⏳
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        {slot.attendanceSubmitted ? (
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            Submitted ✅
                          </span>
                        ) : (
                          <span className="text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                            Pending ⚠️
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default HodDashboard;
