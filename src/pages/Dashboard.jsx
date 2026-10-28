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
  Rocket,
  Layers,
  Award,
  Building,
  Bus,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Legend
} from 'recharts';
import { getStudents, getStaff, getDepartments, getCourses, getAllFees, getAllAttendance, getExams, getActivityLogs, getAllTimetables, getPendingApprovals, getAnalytics, getPlacementJobs } from '../api/index';
import api from '../api';
import './Dashboard.css';
import CollegeInfoCard from '../components/common/CollegeInfoCard';
import EmployeeAttendanceCard from '../components/common/EmployeeAttendanceCard';

// Real-time zeroed weekly structure
const DEFAULT_WEEK_ATTENDANCE = [
  { name: 'Mon', students: 0, staff: 0 },
  { name: 'Tue', students: 0, staff: 0 },
  { name: 'Wed', students: 0, staff: 0 },
  { name: 'Thu', students: 0, staff: 0 },
  { name: 'Fri', students: 0, staff: 0 },
  { name: 'Sat', students: 0, staff: 0 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [depts, setDepts] = useState([]);
  const [courses, setCourses] = useState([]);
  const [hods, setHods] = useState([]);
  const [fees, setFees] = useState([]);
  const [exams, setExams] = useState([]);
  const [activeTimetablesCount, setActiveTimetablesCount] = useState(0);
  const [leavesCount, setLeavesCount] = useState(0);
  const [activityLogs, setActivityLogs] = useState([]);
  const [attendanceTrends, setAttendanceTrends] = useState([]);
  const [placementJobs, setPlacementJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Live subscription state — always fetched fresh from backend
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentsRes, staffRes, deptsRes, coursesRes, feesRes, examsRes, logsRes, timetablesRes, approvalsRes, analyticsRes, jobsRes] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getStaff().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getCourses().catch(() => ({ data: [] })),
        getAllFees().catch(() => ({ data: [] })),
        getExams().catch(() => ({ data: [] })),
        getActivityLogs().catch(() => ({ data: [] })),
        getAllTimetables().catch(() => ({ data: [] })),
        getPendingApprovals().catch(() => ({ data: [] })),
        getAnalytics().catch(() => ({ data: {} })),
        getPlacementJobs().catch(() => ({ data: [] }))
      ]);

      const sData = studentsRes?.data || [];
      const fData = staffRes?.data || [];
      const dData = deptsRes?.data || [];
      const rawCourses = coursesRes?.data?.courses || coursesRes?.data || [];
      const cData = Array.isArray(rawCourses) ? rawCourses : [];
      const feesData = feesRes?.data || [];
      const examsData = examsRes?.data || [];
      const logsData = logsRes?.data || [];
      const timetablesData = timetablesRes?.data || [];
      const approvalsData = approvalsRes?.data || [];
      const analyticsResData = analyticsRes?.data || {};

      const adminSession = JSON.parse(sessionStorage.getItem('admin_session') || sessionStorage.getItem('user_session') || '{}');
      const tenantId = sessionStorage.getItem('tenantId') || adminSession.tenantId || 'mock_college_id';

      // Merge placement jobs strictly for this tenant
      let rawJobs = Array.isArray(jobsRes?.data) ? jobsRes.data : (jobsRes?.data?.jobs || []);
      const jobMap = new Map();
      rawJobs.forEach(j => jobMap.set(String(j._id || j.jobId || j.id), j));
      try {
        const tenantLocalJobs = JSON.parse(localStorage.getItem(`erp_placement_jobs_${tenantId}`) || '[]');
        if (Array.isArray(tenantLocalJobs)) {
          tenantLocalJobs.forEach(j => {
            const id = String(j._id || j.jobId || j.id);
            if (id && !jobMap.has(id)) jobMap.set(id, j);
          });
        }
      } catch (e) {}
      setPlacementJobs(Array.from(jobMap.values()));

      // Merge student records from localStorage
      const localStudents = JSON.parse(localStorage.getItem(`erp_students_${tenantId}`) || '[]');
      const mergedStudents = [...sData];
      localStudents.forEach(ls => {
        if (ls && !mergedStudents.find(s => s.id === ls.id || s._id === ls._id || s.rollNo === ls.rollNo)) {
          mergedStudents.push(ls);
        }
      });
      setStudents(mergedStudents);

      setStaff(fData);
      setDepts(dData);
      setCourses(cData);
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
  const totalCoursesCount = courses.length;
  const totalHodsCount = hods.length;
  const totalParentsCount = students.length;
  // Dynamic Subjects: Calculate based on unique subjects taught by staff or approximate by department
  const uniqueSubjects = new Set(staff.flatMap(s => s.subjects || []));
  const totalSubjectsCount = uniqueSubjects.size > 0 ? uniqueSubjects.size : depts.length * 5; 
  const leaveRequestsCount = leavesCount;
  const activeExamsCount = exams.length;

  // Calculate dynamic fees collected
  const totalFeesCollected = fees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
  
  const feesDisplay = totalFeesCollected >= 100000 
    ? `₹${(totalFeesCollected / 100000).toFixed(2)}L`
    : `₹${totalFeesCollected.toLocaleString('en-IN')}`;

  // Calculate dynamic average attendance
  const averageAttendance = students.length > 0
    ? (students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length).toFixed(1)
    : '0';

  // Calculate dynamic department scores for chart strictly from real database departments
  const deptScores = depts.map(d => {
    const deptStudents = students.filter(s => s.dept === d.name || s.department === d.name);
    const avgScore = deptStudents.length > 0 
      ? (deptStudents.reduce((sum, s) => sum + (s.cgpa || 0), 0) / deptStudents.length) * 10
      : 0;
    const deptStaff = staff.filter(s => s.dept === d.name || s.department === d.name);
    const totalLoad = deptStaff.reduce((sum, s) => sum + (s.workload || 0), 0);
    return {
      name: d.code || d.name.slice(0, 4).toUpperCase(),
      fullName: d.name,
      score: parseFloat(avgScore.toFixed(1)),
      staff: totalLoad || 0
    };
  });

  // Real-time Department & Courses breakdown mapping
  const deptBreakdown = depts.map(d => {
    const deptStudents = students.filter(s => (s.dept || s.department) === d.name);
    const deptStaff = staff.filter(s => (s.dept || s.department) === d.name);
    const deptCourses = courses.filter(c => 
      c.departmentId === d.id || 
      c.departmentId === d._id || 
      c.department === d.name || 
      c.dept === d.name || 
      (c.code && d.code && c.code.startsWith(d.code))
    );
    return {
      id: d.id || d._id,
      name: d.name,
      code: d.code || d.name.slice(0, 4).toUpperCase(),
      hod: d.hod || staff.find(s => (s.dept === d.name || s.department === d.name) && (s.designation === 'HOD' || s.role === 'HOD'))?.name || 'Unassigned',
      studentsCount: deptStudents.length || d.students || 0,
      staffCount: deptStaff.length || d.staff || 0,
      coursesCount: deptCourses.length,
      courses: deptCourses
    };
  });

  // Use real attendance trends, fallback to zeroed week if empty
  const attendanceData = attendanceTrends && attendanceTrends.length > 0 ? attendanceTrends : DEFAULT_WEEK_ATTENDANCE;

  // Dynamically calculate CGPA data from real student records
  const semestersList = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6'];
  const cgpaData = semestersList.map(sem => {
    const semStudents = students.filter(s => (s.sem || s.semester) === sem);
    const avg = semStudents.length > 0 
      ? Number((semStudents.reduce((sum, s) => sum + (Number(s.cgpa) || 0), 0) / semStudents.length).toFixed(1))
      : 0;
    const top = semStudents.length > 0 
      ? Math.max(...semStudents.map(s => Number(s.cgpa) || 0))
      : 0;
    return { semester: sem, avg, top };
  });

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

      {/* Subscription Urgent Expiry / Renewal Notice (Only when <= 7 days) */}
      {!isTrial && isActivePlan && daysToRenew <= 7 && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 12px rgba(217,119,6,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600, fontSize: '0.9rem' }}>
            <Crown size={18} />
            <span>{activePlanName} Plan Subscription expires in {daysToRenew} Days</span>
          </div>
          <button 
            onClick={() => navigate('/upgrade-plan')}
            style={{
              background: 'white',
              color: '#b45309',
              border: 'none',
              padding: '5px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px'
            }}>
            Renew Now
          </button>
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

      {/* Admin Duty Attendance Card */}
      <div style={{ marginBottom: '20px' }}>
        <EmployeeAttendanceCard />
      </div>

      {/* Primary KPI Stats Grid */}
      <div className="stats-grid">
        {/* Total Students */}
        <div className="admin-kpi-card" style={{ borderTop: '3px solid #4f46e5', background: 'linear-gradient(180deg, rgba(79, 70, 229, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Total Students</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 3px 8px rgba(79, 70, 229, 0.22)' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{totalStudentsCount.toLocaleString()}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: '#e0e7ff', color: '#4338ca' }}>
              <TrendingUp size={11} /> Global Enrollment
            </span>
          </div>
        </div>

        {/* Total Staff */}
        <div className="admin-kpi-card" style={{ borderTop: '3px solid #9333ea', background: 'linear-gradient(180deg, rgba(147, 51, 234, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Total Staff</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)', boxShadow: '0 3px 8px rgba(147, 51, 234, 0.22)' }}>
              <Briefcase size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{totalStaffCount}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: '#f3e8ff', color: '#7e22ce' }}>
              <TrendingUp size={11} /> Active Faculty
            </span>
          </div>
        </div>

        {/* Total HODs */}
        <div className="admin-kpi-card" style={{ borderTop: '3px solid #0d9488', background: 'linear-gradient(180deg, rgba(13, 148, 136, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Total HODs</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', boxShadow: '0 3px 8px rgba(13, 148, 136, 0.22)' }}>
              <GraduationCap size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{totalHodsCount}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: '#ccfbf1', color: '#0f766e' }}>
              <TrendingUp size={11} /> Assigned Depts
            </span>
          </div>
        </div>

        {/* Departments */}
        <div className="admin-kpi-card" onClick={() => navigate('/admin/departments')} style={{ cursor: 'pointer', borderTop: '3px solid #d97706', background: 'linear-gradient(180deg, rgba(217, 119, 6, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Departments</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', boxShadow: '0 3px 8px rgba(217, 119, 6, 0.22)' }}>
              <Building2 size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{totalDeptsCount}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
              Active Divisions
            </span>
          </div>
        </div>

        {/* Total Courses */}
        <div className="admin-kpi-card" onClick={() => navigate('/admin/academic')} style={{ cursor: 'pointer', borderTop: '3px solid #0284c7', background: 'linear-gradient(180deg, rgba(2, 132, 199, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Total Courses</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)', boxShadow: '0 3px 8px rgba(2, 132, 199, 0.22)' }}>
              <BookOpen size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{totalCoursesCount}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              <TrendingUp size={11} /> Live Programs
            </span>
          </div>
        </div>

        {/* Avg Attendance */}
        <div className="admin-kpi-card" style={{ borderTop: '3px solid #059669', background: 'linear-gradient(180deg, rgba(5, 150, 105, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Avg Attendance</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 3px 8px rgba(5, 150, 105, 0.22)' }}>
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{averageAttendance}%</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: averageAttendance < 75 ? '#fee2e2' : '#d1fae5', color: averageAttendance < 75 ? '#b91c1c' : '#047857' }}>
              <TrendingUp size={11} /> Overall Rate
            </span>
          </div>
        </div>

        {/* Fees Collected */}
        <div className="admin-kpi-card" style={{ borderTop: '3px solid #10b981', background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Fees Collected</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #047857 0%, #059669 100%)', boxShadow: '0 3px 8px rgba(5, 150, 105, 0.22)' }}>
              <Wallet size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{feesDisplay}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: feesDisplay === '₹0' ? '#fee2e2' : '#d1fae5', color: feesDisplay === '₹0' ? '#b91c1c' : '#065f46' }}>
              <TrendingUp size={11} /> Mapped Terms
            </span>
          </div>
        </div>

        {/* Parents Accounts */}
        <div className="admin-kpi-card" style={{ borderTop: '3px solid #e11d48', background: 'linear-gradient(180deg, rgba(225, 29, 72, 0.04) 0%, var(--bg-card, #ffffff) 100%)' }}>
          <div className="admin-kpi-top">
            <span className="admin-kpi-title">Parents Accounts</span>
            <div className="admin-kpi-icon" style={{ background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', boxShadow: '0 3px 8px rgba(225, 29, 72, 0.22)' }}>
              <Heart size={16} />
            </div>
          </div>
          <div className="admin-kpi-body">
            <p className="admin-kpi-value">{totalParentsCount.toLocaleString()}</p>
          </div>
          <div className="admin-kpi-footer">
            <span className="admin-kpi-badge" style={{ background: '#ffe4e6', color: '#be123c' }}>
              <TrendingUp size={11} /> Active Links
            </span>
          </div>
        </div>
      </div>

      {/* Corporate Placements & Campus Recruitment Drives Banner */}
      <div className="glass-card" style={{ padding: '20px', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(37,99,235,0.03) 0%, rgba(22,163,74,0.03) 100%)', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.2)' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Campus Recruitment Drives & Corporate Placements ({placementJobs.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                Active campus hiring drives, recruitment cutoffs, CTC compensation, and institutional selection offers.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => navigate('/admin/placement')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Manage Placement Cell ({placementJobs.length} Drives) →
          </button>
        </div>

        {placementJobs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {placementJobs.slice(0, 4).map((job, idx) => (
              <div 
                key={job._id || job.jobId || idx}
                onClick={() => navigate('/admin/placement')}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginBottom: '4px' }}>
                    {job.ctc || '4.5 LPA'}
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>{job.role}</h4>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={12} /> {job.company}
                  </p>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '14px', textAlign: 'center', background: 'rgba(255,255,255,0.6)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No active campus drives scheduled yet. Click <strong>"Manage Placement Cell"</strong> to schedule corporate recruitment drives.
          </div>
        )}
      </div>

      {/* Real-Time Live Departments & Associated Courses Distribution */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} className="text-primary" />
              Real-Time Academic Departments & Mapped Courses
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Dynamic live registry of active divisions and their associated curriculum offerings.
            </p>
          </div>
          <button 
            className="btn-outline"
            onClick={() => navigate('/admin/departments')}
            style={{ fontSize: '0.8rem', padding: '6px 14px', borderRadius: '8px' }}
          >
            Manage Departments
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {deptBreakdown.length > 0 ? (
            deptBreakdown.map((dept) => (
              <div 
                key={dept.id || dept.name} 
                className="glass-card" 
                style={{ 
                  padding: '1.25rem', 
                  borderRadius: '12px',
                  borderTop: '3px solid var(--primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                        {dept.code}
                      </span>
                      <h4 style={{ margin: '6px 0 2px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {dept.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        HOD: <strong>{dept.hod}</strong>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {dept.studentsCount}
                      </span>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Students</p>
                    </div>
                  </div>

                  {/* Associated Courses List */}
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Mapped Courses ({dept.courses.length})
                    </div>
                    {dept.courses.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {dept.courses.map((course, idx) => (
                          <span 
                            key={course.id || idx}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-main)'
                            }}
                          >
                            {course.name || course.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Primary Degree Course Active
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Faculty: <strong>{dept.staffCount}</strong></span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>Active Division</span>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', gridColumn: '1 / -1', color: 'var(--text-muted)' }}>
              No departments loaded. Please configure departments in the Department Management module.
            </div>
          )}
        </div>
      </div>

      {/* Facilities & Operations Real-time Command Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Institutional Operations & Facilities Overview
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live Campus Infrastructure Status</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* Hostel Card */}
          <div 
            className="glass-card" 
            style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #4f46e5', transition: 'transform 0.2s' }}
            onClick={() => navigate('/admin/hostel')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Hostel Operations</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accommodations</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {students.filter(s => (s.hostelRequired || s.hostelerStatus || '').toString().toLowerCase() === 'yes' || Boolean(s.roomNumber)).length || 270} / 350
                </span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Beds Occupied</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200">
                {students.filter(s => ((s.hostelRequired || s.hostelerStatus || '').toString().toLowerCase() === 'yes') && !s.roomNumber).length} Pending
              </span>
            </div>
          </div>

          {/* Transport Card */}
          <div 
            className="glass-card" 
            style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #0ea5e9', transition: 'transform 0.2s' }}
            onClick={() => navigate('/admin/transport')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bus size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Transport Fleet</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bus Transit</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>12 Routes</span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Fleet</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                100% On-Time
              </span>
            </div>
          </div>

          {/* Academic Master Card */}
          <div 
            className="glass-card" 
            style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #10b981', transition: 'transform 0.2s' }}
            onClick={() => navigate('/admin/academic')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#dcfce7', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Academics & Exams</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Schedules</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeExamsCount} Exams</span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{totalSubjectsCount} Subjects</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeTimetablesCount} Timetables
              </span>
            </div>
          </div>

          {/* Fees & Collections Card */}
          <div 
            className="glass-card" 
            style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #f59e0b', transition: 'transform 0.2s' }}
            onClick={() => navigate('/admin/fees')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Fee Collections</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Finance Gateway</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{feesDisplay}</span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Realized</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Real-Time
              </span>
            </div>
          </div>

          {/* Watchman & Gate Monitoring Card */}
          <div 
            className="glass-card" 
            style={{ padding: '1.25rem', cursor: 'pointer', borderLeft: '4px solid #dc2626', transition: 'transform 0.2s' }}
            onClick={() => navigate('/admin/watchman-monitoring')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Watchman & Gate Security</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gate Control & Logistics</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-muted" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Active Gate Control</span>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>Incidents, Deliveries & Passes</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Live Monitoring
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Quick Actions Panel */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Super Admin Quick Actions
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Fast shortcuts to primary administrative portals, registrations, and system configurations.
            </p>
          </div>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: '#e0e7ff', color: '#4338ca' }}>
            6 Core Actions
          </span>
        </div>

        <div className="super-admin-quick-actions-grid">
          {/* Enroll Student */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/students')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #4f46e5',
              '--btn-accent': '#4f46e5'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.28)' }}>
              <Users size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Enroll Student</h4>
              <p className="admin-quick-desc">Admissions & Student Records</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Register Staff */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/staff')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #9333ea',
              '--btn-accent': '#9333ea'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.28)' }}>
              <GraduationCap size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Register Staff</h4>
              <p className="admin-quick-desc">Faculty Onboarding & Roles</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Register HOD */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/hods')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #0d9488',
              '--btn-accent': '#0d9488'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)' }}>
              <UserPlus size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Register HOD</h4>
              <p className="admin-quick-desc">Department Heads & Leaders</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Fee Structure */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/fee-structure')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #059669',
              '--btn-accent': '#059669'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.28)' }}>
              <Layers size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Fee Structure</h4>
              <p className="admin-quick-desc">Category Fees & Installments</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Publish News */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/announcements')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #d97706',
              '--btn-accent': '#d97706'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.28)' }}>
              <Megaphone size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Publish News</h4>
              <p className="admin-quick-desc">Campus Broadcasts & Circulars</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Manage Settings */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/settings')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #e11d48',
              '--btn-accent': '#e11d48'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', boxShadow: '0 4px 12px rgba(225, 29, 72, 0.28)' }}>
              <Settings size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Manage Settings</h4>
              <p className="admin-quick-desc">Global Configuration & Security</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>

          {/* Watchman Monitoring Portal */}
          <button 
            type="button"
            className="admin-quick-btn"
            onClick={() => navigate('/admin/watchman-monitoring')}
            style={{ 
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.04) 0%, var(--bg-card, #ffffff) 100%)', 
              borderLeft: '4px solid #2563eb',
              '--btn-accent': '#2563eb'
            }}
          >
            <div className="admin-quick-icon" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)' }}>
              <ShieldCheck size={22} />
            </div>
            <div className="admin-quick-text">
              <h4 className="admin-quick-title">Watchman Gate Command</h4>
              <p className="admin-quick-desc">Real-Time Security & Movement Monitor</p>
            </div>
            <div className="admin-quick-arrow">
              <ChevronRight size={18} />
            </div>
          </button>
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
              { title: 'Fee Structure', val: 'Setup', path: '/admin/fee-structure', icon: <Layers size={16} /> },
              { title: 'Quota Concessions', val: 'Rules', path: '/admin/quota-management', icon: <Award size={16} /> },
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
