import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, getStaffSupportRequests, getClassMonitoringDailyStatus, getPrincipalClassSummary, getPlacementJobs } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { 
  Building2, Users, GraduationCap, UserCheck, 
  Sparkles, Search, Filter, ChevronRight, Briefcase, LifeBuoy, CheckCircle2, Clock, Play, Calendar, BookOpen, AlertCircle, Activity,
  Zap, FileCheck, Award, CreditCard, Megaphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../../pages/Dashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';

export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Principal');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [allUsers, setAllUsers] = useState([]);
  const [placementJobs, setPlacementJobs] = useState([]);
  const [metrics, setMetrics] = useState({
    students: 0,
    staff: 0,
    hods: 0,
    depts: 0
  });
  const [departmentData, setDepartmentData] = useState({});
  const [selectedDept, setSelectedDept] = useState('All');
  const [academicSummary, setAcademicSummary] = useState({
    scheduled: 0,
    completed: 0,
    running: 0,
    pending: 0,
    attendanceSubmitted: 0,
    pendingAttendance: 0
  });

  // Fetch Users and Placement Data from Database
  const fetchData = useCallback(() => {
    getPrincipalClassSummary()
      .then(res => { if (res?.data) setAcademicSummary(res.data); })
      .catch(err => console.error(err));

    getPlacementJobs()
      .then(res => {
        let rawJobs = Array.isArray(res?.data) ? res.data : (res?.data?.jobs || []);
        const jobMap = new Map();
        rawJobs.forEach(j => jobMap.set(String(j._id || j.jobId || j.id), j));
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('erp_placement_jobs')) {
            try {
              const localItems = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(localItems)) {
                localItems.forEach(lj => {
                  const ljId = String(lj._id || lj.jobId || lj.id);
                  if (ljId && !jobMap.has(ljId)) jobMap.set(ljId, lj);
                });
              }
            } catch (err) {}
          }
        }
        setPlacementJobs(Array.from(jobMap.values()));
      })
      .catch(err => console.error(err));

    Promise.all([
      getUsers().catch(() => ({ data: [] })),
      import('../../api/index').then(m => m.getStudents().catch(() => ({ data: [] }))),
      import('../../api/index').then(m => m.getStaff().catch(() => ({ data: [] }))),
      import('../../api/index').then(m => m.getDepartments().catch(() => ({ data: [] })))
    ])
      .then(([usersRes, studentsRes, staffRes, deptsRes]) => {
        const users = Array.isArray(usersRes.data) ? usersRes.data : (Array.isArray(usersRes) ? usersRes : []);
        const sList = Array.isArray(studentsRes.data) ? studentsRes.data : (Array.isArray(studentsRes) ? studentsRes : []);
        const fList = Array.isArray(staffRes.data) ? staffRes.data : (Array.isArray(staffRes) ? staffRes : []);
        const dList = Array.isArray(deptsRes.data) ? deptsRes.data : (Array.isArray(deptsRes) ? deptsRes : []);

        setAllUsers(users);

        const students = [...users.filter(u => u.role === 'Student'), ...sList.filter(s => !users.find(u => u.referenceId === s.id || u._id === s._id))];
        const staff = [...users.filter(u => u.role === 'Staff'), ...fList.filter(f => f.role !== 'HOD' && f.designation !== 'HOD' && !users.find(u => u._id === f._id))];
        const hods = users.filter(u => u.role === 'HOD' || u.designation === 'HOD');

        // Group by department
        const grouped = {};
        users.forEach(user => {
          if (!user.department || user.department === 'None' || user.role === 'Admin' || user.role === 'Principal') return;
          if (!grouped[user.department]) {
            grouped[user.department] = { HOD: [], Staff: [], Student: [] };
          }
          if (grouped[user.department][user.role]) {
            grouped[user.department][user.role].push(user);
          }
        });

        dList.forEach(d => {
          const dName = d.name || d.departmentName;
          if (dName && !grouped[dName]) {
            grouped[dName] = { HOD: [], Staff: [], Student: [] };
          }
        });

        setDepartmentData(grouped);
        setMetrics({
          students: students.length,
          staff: staff.length,
          hods: hods.length,
          depts: Math.max(Object.keys(grouped).length, dList.length)
        });
      })
      .catch(err => {
        console.error('Failed to load institutional roster:', err);
        setMetrics({ students: 0, staff: 0, hods: 0, depts: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  useRealtimeSync(fetchData, ['users', 'students', 'staff', 'substitutions', 'timetable', 'class_started']);

  useEffect(() => {
    fetchData();
    const sessionData = sessionStorage.getItem('principal_session');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        setUserName(parsed.name || 'Principal');
      } catch (e) {
        console.error(e);
      }
    }

    const handlePlacementRefresh = () => {
      fetchData();
    };
    window.addEventListener('erp_placement_updated', handlePlacementRefresh);
    window.addEventListener('storage', handlePlacementRefresh);
    return () => {
      window.removeEventListener('erp_placement_updated', handlePlacementRefresh);
      window.removeEventListener('storage', handlePlacementRefresh);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <Sparkles size={40} className="animate-spin" style={{ color: '#6366F1', marginBottom: 12, opacity: 0.8 }} />
          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading Institutional Roster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container principal-dashboard animate-fade-in" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      
      {/* Welcome Header */}
      <div style={{
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Institution Overview
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Welcome back, {userName}. Real-time academic execution, faculty schedules, and student engagement.
          </p>
        </div>
      </div>

      {/* TODAY'S ACADEMIC SUMMARY */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-color)',
        transition: 'var(--transition)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '10px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={18} />
              </div>
              Today's Academic Summary
            </h2>
            <p style={{ margin: '4px 0 0 44px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              College-wide live class execution & attendance metrics.
            </p>
          </div>
          <span style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#4F46E5',
            background: 'rgba(79, 70, 229, 0.08)',
            border: '1px solid rgba(79, 70, 229, 0.18)',
            padding: '6px 14px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Calendar size={14} /> Today ({new Date().toISOString().split('T')[0]})
          </span>
        </div>

        {/* Principal Duty Attendance Card */}
        <div style={{ marginBottom: '1.25rem' }}>
          <EmployeeAttendanceCard />
        </div>

        {/* Principal Executive Quick Actions */}
        <div style={{
          background: 'var(--bg-primary, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  Principal Executive Quick Actions
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                  Institutional oversight, pending approvals, syllabus tracking, and college announcements.
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5' }}>
              Executive Shortcuts
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <button 
              type="button"
              onClick={() => navigate('/principal/approvals')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileCheck size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Approvals Hub</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Leave & proposals</div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/principal/attendance')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Activity size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Live Attendance</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Campus-wide analytics</div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/principal/faculty-performance')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(147, 51, 234, 0.12)', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <GraduationCap size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Faculty Radar</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Teaching & syllabus</div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/principal/fees')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Fees & Recovery</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Institutional revenue</div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/principal/exams')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Award size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Exams & Results</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Academic evaluation</div>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => navigate('/principal/announcements')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Megaphone size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Announcements</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Official circulars</div>
              </div>
            </button>
          </div>
        </div>

        {/* 6 Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem'
        }}>
          {/* Card 1: Classes Scheduled */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '14px',
            padding: '1.1rem',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid #3B82F6',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Classes Scheduled
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpen size={16} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {academicSummary.scheduled}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                All departments
              </span>
            </div>
          </div>

          {/* Card 2: Completed */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '14px',
            padding: '1.1rem',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid #10B981',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Completed
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {academicSummary.completed}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Sessions closed
              </span>
            </div>
          </div>

          {/* Card 3: Running Now */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '14px',
            padding: '1.1rem',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid #8B5CF6',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Running Now
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {academicSummary.running}
                {academicSummary.running > 0 && (
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#8B5CF6', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Live in progress
              </span>
            </div>
          </div>

          {/* Card 4: Pending */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '14px',
            padding: '1.1rem',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid #F59E0B',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {academicSummary.pending}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#F59E0B', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Upcoming periods
              </span>
            </div>
          </div>

          {/* Card 5: Attendance Submitted */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '14px',
            padding: '1.1rem',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid #14B8A6',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Attendance Done
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(20, 184, 166, 0.12)', color: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={16} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {academicSummary.attendanceSubmitted}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#14B8A6', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Recorded
              </span>
            </div>
          </div>

          {/* Card 6: Pending Attendance */}
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '14px',
            padding: '1.1rem',
            border: '1px solid var(--border-color)',
            borderTop: '3px solid #EF4444',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending Attendance
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={16} />
              </div>
            </div>
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {academicSummary.pendingAttendance}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                Awaiting submit
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #6366F1' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Departments</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.depts}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>HODs Appointed</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.hods}</h3>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Faculty / Staff</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.staff}</h3>
          </div>
        </div>

        <div className="glass-card" onClick={() => navigate('/principal/placement')} style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #2563EB', cursor: 'pointer' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Placement Drives</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{placementJobs.length}</h3>
          </div>
        </div>
      </div>

      {/* Institutional Campus Placements & Hiring Drives Showcase */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        borderRadius: '16px',
        border: '1px solid var(--border-color, #e2e8f0)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-card, 0 2px 10px rgba(0,0,0,0.02))',
        marginBottom: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.2)' }}>
              <Briefcase size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Institutional Campus Placements & Hiring Drives ({placementJobs.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
                College-wide corporate recruitment drives, CTC packages, eligibility thresholds, and campus hiring offers.
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => navigate('/principal/placement')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Institutional Placement Console ({placementJobs.length} Drives) →
          </button>
        </div>

        {placementJobs.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {placementJobs.slice(0, 3).map((job, idx) => (
              <div 
                key={job._id || job.jobId || idx}
                onClick={() => navigate('/principal/placement')}
                style={{
                  background: 'var(--bg-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                      {job.company || job.companyName || 'Corporate Recruiter'}
                    </h4>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                      {job.role || job.title || job.designation || 'Graduate Engineer / Associate'}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: job.status === 'Active' || job.status === 'Ongoing' || !job.status ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                    color: job.status === 'Active' || job.status === 'Ongoing' || !job.status ? '#059669' : '#64748b',
                    whiteSpace: 'nowrap'
                  }}>
                    {job.status || 'Active Drive'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted, #475569)', paddingTop: '8px', borderTop: '1px dashed var(--border-color, #e2e8f0)' }}>
                  <span>Package: <strong style={{ color: '#059669' }}>{job.package || job.ctc || job.salary || '4.5 - 8.0 LPA'}</strong></span>
                  <span>Min CGPA: <strong>{job.minCgpa || job.eligibilityCgpa || '6.0'}</strong></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg-primary, #f8fafc)', borderRadius: '10px', border: '1px dashed var(--border-color, #cbd5e1)' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>No active campus placement drives found.</p>
          </div>
        )}
      </div>

    </div>
  );
}
