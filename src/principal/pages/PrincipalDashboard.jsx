import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, getStaffSupportRequests, getClassMonitoringDailyStatus, getPrincipalClassSummary } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { 
  Building2, Users, GraduationCap, UserCheck, 
  Sparkles, Search, Filter, ChevronRight, Briefcase, LifeBuoy, CheckCircle2, Clock, Play, Calendar, BookOpen, AlertCircle, Activity
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

  // Fetch Users from Database
  const fetchData = useCallback(() => {
    getPrincipalClassSummary()
      .then(res => { if (res?.data) setAcademicSummary(res.data); })
      .catch(err => console.error(err));

    getUsers()
      .then(res => {
        const users = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        setAllUsers(users);

        const students = users.filter(u => u.role === 'Student');
        const staff = users.filter(u => u.role === 'Staff');
        const hods = users.filter(u => u.role === 'HOD');

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

        setDepartmentData(grouped);
        setMetrics({
          students: students.length,
          staff: staff.length,
          hods: hods.length,
          depts: Object.keys(grouped).length
        });
      })
      .catch(err => console.error(err))
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
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      
      {/* Welcome Banner */}
      <div style={{
        background: '#3730A5',
        borderRadius: '12px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Institution Overview
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.85rem', fontWeight: 500 }}>
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

        <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #EC4899' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(236, 72, 153, 0.1)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Students</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{metrics.students}</h3>
          </div>
        </div>
      </div>

    </div>
  );
}
