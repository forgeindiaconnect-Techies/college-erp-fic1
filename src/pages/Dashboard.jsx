import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useRealtimeSync from '../hooks/useRealtimeSync';
import { 
  Users, 
  GraduationCap, 
  Wallet, 
  Building2,
  TrendingUp,
  UserPlus,
  FileText,
  Settings,
  Briefcase,
  BookOpen,
  Calendar,
  CalendarCheck,
  Megaphone,
  ShieldCheck,
  Clock,
  Activity,
  Heart,
  Inbox,
  Crown,
  ClipboardList,
  Rocket
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import { getStudents, getStaff, getDepartments, getAllFees, getAllAttendance, getExams, getActivityLogs, getAllTimetables, getPendingApprovals, getAnalytics } from '../api/index';
import api from '../api';
import './Dashboard.css';
import CollegeInfoCard from '../components/common/CollegeInfoCard';

const MOCK_ATTENDANCE = [
  { name: 'Mon', students: 95, staff: 98 },
  { name: 'Tue', students: 92, staff: 97 },
  { name: 'Wed', students: 96, staff: 99 },
  { name: 'Thu', students: 89, staff: 95 },
  { name: 'Fri', students: 98, staff: 100 },
  { name: 'Sat', students: 85, staff: 90 },
];

const MOCK_DEPT_SCORES = [
  { name: 'CSE', score: 92, staff: 94 },
  { name: 'ECE', score: 85, staff: 91 },
  { name: 'MECH', score: 78, staff: 86 },
  { name: 'EEE', score: 80, staff: 89 },
  { name: 'BCA', score: 88, staff: 92 },
  { name: 'MBA', score: 94, staff: 96 }
];

const MOCK_CGPA = [
  { semester: 'Sem 1', avg: 7.8, top: 9.5 },
  { semester: 'Sem 2', avg: 8.1, top: 9.6 },
  { semester: 'Sem 3', avg: 7.9, top: 9.4 },
  { semester: 'Sem 4', avg: 8.3, top: 9.8 },
  { semester: 'Sem 5', avg: 8.5, top: 9.9 },
  { semester: 'Sem 6', avg: 8.4, top: 9.7 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [depts, setDepts] = useState([]);
  const [hods, setHods] = useState([]);
  const [fees, setFees] = useState([]);
  const [exams, setExams] = useState([]);
  const [activeTimetablesCount, setActiveTimetablesCount] = useState(0);
  const [leavesCount, setLeavesCount] = useState(0);
  const [activityLogs, setActivityLogs] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live subscription state â€” always fetched fresh from backend
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, staffRes, deptsRes, feesRes, examsRes, logsRes, timetablesRes, approvalsRes, analyticsRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] })),
        getExams().catch(() => ({ data: [] })),
        getActivityLogs().catch(() => ({ data: [] })),
        getAllTimetables().catch(() => ({ data: [] })),
        getPendingApprovals().catch(() => ({ data: [] })),
        getAnalytics().catch(() => ({ data: {} }))
      ]);

      const sData = studentsRes?.data || [];
      const fData = staffRes?.data || [];
      const dData = deptsRes?.data || [];
      const feesData = feesRes?.data || [];
      const examsData = examsRes?.data || [];
      const logsData = logsRes?.data || [];
      const timetablesData = timetablesRes?.data || [];
      const approvalsData = approvalsRes?.data || [];
      const analyticsResData = analyticsRes?.data || {};

      setStudents(sData);
      setStaff(fData);
      setDepts(dData);
      setFees(feesData);
      setExams(examsData);
      setActivityLogs(logsData);
      setActiveTimetablesCount(timetablesData.length);
      setLeavesCount(approvalsData.filter(a => a.type === 'Leave Request').length);
      
      if (analyticsResData.attendanceTrends) {
        setAttendanceTrends(analyticsResData.attendanceTrends);
      }

      const hodsList = fData.filter(s => s.designation === 'HOD' || s.role === 'HOD' || s.email?.includes('hod'));
      setHods(hodsList.length > 0 ? hodsList : dData.filter(d => d.hod));
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time sync: re-fetch when Accounts / any module emits dataUpdated
  useRealtimeSync(fetchAllData, ['fees', 'salaries', 'students', 'staff', 'expenses', 'users']);

  useEffect(() => {
    const session = sessionStorage.getItem('admin_session');
    if (!session) { navigate('/login'); return; }
    fetchAllData();

    const fetchSub = () => {
      // Always fetch fresh subscription from backend (never trust stale sessionStorage)
      setSubLoading(true);
      api.get('/admin/my-subscription')
        .then(res => {
          if (res.data && res.data.subscription) {
            setSubscription(res.data.subscription);
          }
        })
        .catch(err => console.error('Failed to fetch subscription status:', err))
        .finally(() => setSubLoading(false));
    };

    fetchSub();

    const onFocus = () => {
      fetchAllData();
      fetchSub();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [navigate, fetchAllData]);

  // Aggregate Metrics Calculations
  const totalStudentsCount = students.length;
  const totalStaffCount = staff.filter(s => s.designation !== 'HOD' && s.role !== 'HOD' && !s.email?.includes('hod')).length;
  const totalDeptsCount = depts.length;
  const totalHodsCount = hods.length;
  const totalParentsCount = students.length;
  // Dynamic Subjects: Calculate based on unique subjects taught by staff or approximate by department
  const uniqueSubjects = new Set(staff.flatMap(s => s.subjects || []));
  const totalSubjectsCount = uniqueSubjects.size > 0 ? uniqueSubjects.size : depts.length * 5; 
  const leaveRequestsCount = leavesCount;
  const activeExamsCount = exams.length;

  // Calculate dynamic fees collected
  let totalFeesCollected = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
  if (totalFeesCollected === 0) {
    totalFeesCollected = 317000; // Fallback to MOCK_FEES sum for demonstration
  }
  
  const feesDisplay = totalFeesCollected >= 100000 
    ? `₹${(totalFeesCollected / 100000).toFixed(1)}L`
    : `₹${totalFeesCollected.toLocaleString()}`;

  // Calculate dynamic average attendance
  const averageAttendance = students.length > 0
    ? (students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length).toFixed(1)
    : '0';

  // Calculate dynamic department scores for chart
  const deptScores = depts.length > 0 ? depts.map(d => {
    const deptStudents = students.filter(s => s.dept === d.name);
    const avgScore = deptStudents.length > 0 
      ? (deptStudents.reduce((sum, s) => sum + (s.cgpa || 0), 0) / deptStudents.length) * 10
      : 0;
    const deptStaff = staff.filter(s => s.dept === d.name);
    const totalLoad = deptStaff.reduce((sum, s) => sum + (s.workload || 0), 0);
    return {
      name: d.code || d.name.slice(0, 4).toUpperCase(),
      score: parseFloat(avgScore.toFixed(1)),
      staff: totalLoad || 0
    };
  }) : [];

  // Use real attendance trends, fallback to MOCK if totally empty
  const attendanceData = attendanceTrends && attendanceTrends.length > 0 ? attendanceTrends : MOCK_ATTENDANCE;

  // Dynamically calculate CGPA data if students exist, else use MOCK data
  const cgpaData = students.length > 0 ? [
    ...MOCK_CGPA.slice(0, 5),
    { semester: 'Current', avg: Number((students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / students.length).toFixed(1)), top: Math.max(...students.map(s => s.cgpa || 0)) }
  ] : MOCK_CGPA;

  // For DeptScores, use MOCK_DEPT_SCORES if depts is empty
  const finalDeptScores = depts.length > 0 ? deptScores : MOCK_DEPT_SCORES;

  // Always use live subscription from backend API
  const isTrial = subscription?.isTrial ?? false;
  const isGracePeriod = subscription?.isGracePeriod ?? false;
  const isActivePlan = subscription?.status === 'Active';
  const isExpired = subscription?.status === 'Expired';
  const activePlanName = subscription?.planName ?? '';
  const daysToRenew = subscription?.daysRemaining ?? 0;

  // Derive session data for page-level checks only
  const sessionStr = sessionStorage.getItem('admin_session');
  let sessionData = null;
  try {
    if (sessionStr) sessionData = JSON.parse(sessionStr);
  } catch (e) { /* ignore */ }

  return (
    <div className="dashboard animate-fade-in">
      <CollegeInfoCard />
      {(isTrial && isActivePlan) && (
        <div style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(239,68,68,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600 }}>
            <Activity size={20} />
            <span>Trial Version</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            Expires in {daysToRenew} Days
          </div>
          <button 
            onClick={() => navigate('/upgrade-plan')}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: 'white', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.2s'
            }}>
            Upgrade Plan
          </button>
        </div>
      )}

      {isGracePeriod && (
        <div style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(239,68,68,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600 }}>
            <Activity size={20} />
            <span>{isTrial ? 'Trial Expired' : 'Plan Expired'}</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            Grace Period: {daysToRenew} Days Left
          </div>
          <button 
            onClick={() => navigate('/upgrade-plan')}
            style={{
              background: 'white', color: '#b91c1c', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', border: 'none'
            }}>
            Renew Now
          </button>
        </div>
      )}

      {isExpired && !isGracePeriod && (
        <div style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(153,27,27,0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600 }}>
            <Activity size={20} />
            <span>Subscription Expired</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            Your account has been restricted. Please renew to restore access.
          </div>
          <button 
            onClick={() => navigate('/upgrade-plan')}
            style={{
              background: 'white', color: '#7f1d1d', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', border: 'none'
            }}>
            Renew Now
          </button>
        </div>
      )}

      {!isTrial && isActivePlan && (
        <div style={{
          background: 'var(--primary)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600 }}>
            <Crown size={20} />
            <span>{activePlanName} Plan</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>
            Expires in {daysToRenew} Days
          </div>
          {daysToRenew <= 7 && (
            <button 
              onClick={() => navigate('/upgrade-plan')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.2s'
              }}>
              Renew Plan
            </button>
          )}
        </div>
      )}

      {/* Dashboard Welcome Header */}
      <div className="dashboard-header">
        <div>
          <h1>College Admin Console</h1>
          <p className="text-muted">Manage your institution, departments, and users.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 0 2px rgba(15, 110, 86, 0.2)', animation: 'pulse 2s infinite' }} />
            Live Sync
          </div>
          <button className="btn-primary" onClick={() => navigate('/admin/reports')}>
            <FileText size={18} />
            System Reports
          </button>
        </div>
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-primary" style={{ background: "#EEEDFE", color: "#3C3489" }}>
            <Users size={18} />
          </div>
          <div className="stat-details">
            <h3>Total Students</h3>
            <p className="stat-value">{totalStudentsCount.toLocaleString()}</p>
            <p className="stat-change positive">
              <TrendingUp size={12} /> Global Enrollment
            </p>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-primary" style={{ background: "#EEEDFE", color: "#3C3489" }}>
            <Briefcase size={18} />
          </div>
          <div className="stat-details">
            <h3>Total Staff</h3>
            <p className="stat-value">{totalStaffCount}</p>
            <p className="stat-change positive">
              <TrendingUp size={12} /> Active Faculty
            </p>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-primary" style={{ background: "#EEEDFE", color: "#3C3489" }}>
            <GraduationCap size={18} />
          </div>
          <div className="stat-details">
            <h3>Total HODs</h3>
            <p className="stat-value">{totalHodsCount}</p>
            <p className="stat-change positive">
              <TrendingUp size={12} /> Assigned departments
            </p>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-primary" style={{ background: "#EEEDFE", color: "#3C3489" }}>
            <Building2 size={18} />
          </div>
          <div className="stat-details">
            <h3>Departments</h3>
            <p className="stat-value">{totalDeptsCount}</p>
            <p className="stat-change text-muted">Active divisions</p>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-warning" style={{ background: averageAttendance < 75 ? "#FAEEDA" : "#E1F5EE", color: averageAttendance < 75 ? "#854F0B" : "#10B981" }}>
            <CalendarCheck size={18} />
          </div>
          <div className="stat-details">
            <h3>Avg Attendance</h3>
            <p className="stat-value">{averageAttendance}%</p>
            <p className="stat-change positive">
              <TrendingUp size={12} /> Overall rate
            </p>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-primary" style={{ background: feesDisplay === '₹0' ? "#FCEBEB" : "#E1F5EE", color: feesDisplay === '₹0' ? "#EF4444" : "#10B981" }}>
            <Wallet size={18} />
          </div>
          <div className="stat-details">
            <h3>Fees Collected</h3>
            <p className="stat-value">{feesDisplay}</p>
            <p className="stat-change positive">
              <TrendingUp size={12} /> Mapped terms
            </p>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrapper bg-icon-primary" style={{ background: "#EEEDFE", color: "#3C3489" }}>
            <Heart size={18} />
          </div>
          <div className="stat-details">
            <h3>Parents Accounts</h3>
            <p className="stat-value">{totalParentsCount.toLocaleString()}</p>
            <p className="stat-change positive">
              <TrendingUp size={12} /> Active links
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="chart-card glass-card col-span-2">
          <div className="card-header">
            <h3>Global Attendance Trends</h3>
          </div>
          <div className="chart-container" style={{ minHeight: '300px', height: '100%' }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={attendanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStaff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)' }} />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="students" name="Students Attendance" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorStudents)" />
                <Area type="monotone" dataKey="staff" name="Staff Attendance" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorStaff)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>



        <div className="chart-card glass-card col-span-2">
          <div className="card-header">
            <h3>College CGPA Academic Curve</h3>
          </div>
          <div className="chart-container" style={{ minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cgpaData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="semester" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis domain={[5, 10]} stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)' }} />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="avg" name="Average CGPA" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="top" name="Top CGPA" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="glass-card">
          <div className="card-header mb-4 px-6 pt-6">
            <h3>Super Admin Quick Actions</h3>
          </div>
          <div className="quick-actions-grid p-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <button className="quick-action-btn" onClick={() => navigate('/admin/hods')}>
              <div className="action-icon bg-icon-primary"><UserPlus size={20} /></div>
              <span>Register HOD</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/admin/staff')}>
              <div className="action-icon bg-icon-primary"><GraduationCap size={20} /></div>
              <span>Register Staff</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/admin/announcements')}>
              <div className="action-icon bg-icon-primary"><Megaphone size={20} /></div>
              <span>Publish News</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate('/admin/settings')}>
              <div className="action-icon bg-icon-primary"><Settings size={20} /></div>
              <span>Manage Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scoped Details Rows */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="bg-icon-primary" style={{ padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <ClipboardList size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em', textTransform: 'none' }}>Recent Global Operations Logs</h3>
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {activityLogs.length > 0 ? (
                activityLogs.slice(0, 5).map((log, i) => {
                  const logDate = new Date(log.createdAt);
                  const isToday = new Date().toDateString() === logDate.toDateString();
                  let timeStr = isToday ? logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : logDate.toLocaleDateString();
                  
                  return (
                    <li key={log._id || i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.82rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                      <span className="text-muted" style={{ fontWeight: 600, minWidth: '75px' }}>{timeStr}</span>
                      <span className="badge-outline" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', border: '1px solid var(--primary)', borderRadius: '4px', color: 'var(--primary)' }}>{log.role || 'System'}</span>
                      <span style={{ color: 'var(--text-main)', flex: 1 }}>{log.action}</span>
                    </li>
                  );
                })
              ) : (
                <li style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recent activities found.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div className="bg-icon-primary" style={{ padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Rocket size={20} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.02em', textTransform: 'none' }}>Secondary System Modules</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[
              { title: 'Subjects', val: totalSubjectsCount, path: '/admin/subjects', icon: <BookOpen size={16} /> },
              { title: 'Timetables', val: activeTimetablesCount, path: '/admin/timetable', icon: <Calendar size={16} /> },
              { title: 'Exams', val: activeExamsCount, path: '/admin/exams', icon: <FileText size={16} /> },
              { title: 'Leave Requests', val: leaveRequestsCount, path: '/admin/leaves', icon: <Inbox size={16} /> }
            ].map((mod, i) => (
              <div 
                key={i} 
                onClick={() => navigate(mod.path)} 
                style={{ 
                  padding: '1rem', 
                  backgroundColor: 'var(--bg-primary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'var(--transition)'
                }}
                className="hover-card-anim"
              >
                <div>{mod.icon}</div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{mod.title}</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{mod.val}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
