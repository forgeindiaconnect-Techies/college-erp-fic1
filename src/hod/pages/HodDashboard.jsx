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
import { getStudents, getStaff, getClassMonitoringDailyStatus, getHodClassMonitoring, getAllAttendance } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import './HodDashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard';

const DEFAULT_SESSION = {
  name: 'Prof. Rajan Iyer',
  dept: 'Computer Science Engineering',
  deptCode: 'CSE',
  role: 'HOD'
};

const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal', 'bg-gradient-pink'];

const HodDashboard = () => {
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [hodSession, setHodSession] = useState(DEFAULT_SESSION);
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [liveMonitoring, setLiveMonitoring] = useState([]);
  const [loadingMonitoring, setLoadingMonitoring] = useState(true);

  const fetchLiveData = useCallback(async () => {
    try {
      const deptName = hodSession.dept || hodSession.department || 'Computer Science Engineering';
      const [studRes, staffRes, monRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getHodClassMonitoring(deptName).catch(() => ({ data: [] }))
      ]);

      if (studRes?.data) setStudents(studRes.data);
      if (staffRes?.data) setStaff(staffRes.data);
      if (monRes?.data) setLiveMonitoring(monRes.data);
      setLoadingMonitoring(false);
    } catch (err) {
      console.warn('Dashboard API load failed:', err.message);
      setLoadingMonitoring(false);
    }
  }, [hodSession.dept, hodSession.department]);

  useEffect(() => {
    const session = sessionStorage.getItem('hod_session');
    if (session) {
      setHodSession(JSON.parse(session));
    } else {
      navigate('/login');
      return;
    }
    fetchLiveData();
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, [navigate, fetchLiveData]);

  useRealtimeSync(fetchLiveData, ['students', 'staff', 'substitutions', 'timetable', 'class_started']);

  const deptName = hodSession.dept || 'Computer Science Engineering';

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
