import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, BookOpen, Star, FileText, Activity, Clock, ShieldAlert, HeartPulse, UserMinus, Target, ExternalLink, User, Calendar, Mail, Phone, MapPin, CheckCircle, ChevronDown, Bell, SlidersHorizontal, X } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { getStaff, getStudents, getSubjects, createNotification } from '../../api/index';
import '../../pages/Dashboard.css';

// EMPTY INITIAL STATE
const initialStaff = [];
const deptData = [];
const trendData = [];

const FULL_DEPARTMENTS = [
  'Computer Science Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Artificial Intelligence & Machine Learning',
  'Cyber Security',
  'Biomedical Engineering',
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Robotics Engineering',
  'Chemical Engineering',
  'Biotechnology Engineering'
];

// DEPT_SUBJECTS removed as it is fetched from MongoDB

export default function PrincipalStaffOverview() {
  const [staffList, setStaffList] = useState(initialStaff);
  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterPerformance, setFilterPerformance] = useState('All');
  const [filterExperience, setFilterExperience] = useState('All');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalType, setModalType] = useState(null); // 'profile' | 'classes' | 'report' | 'notify' | 'meeting'
  
  // Custom modals fields
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [notificationMsg, setNotificationMsg] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // API Call implementation with fallback
  useEffect(() => {
    const fetchPrincipalStaff = async () => {
      try {
        const [res, subRes, studentsRes] = await Promise.all([
          getStaff().catch(() => ({ data: [] })),
          getSubjects().catch(() => ({ data: [] })),
          getStudents().catch(() => ({ data: [] }))
        ]);
        
        const allSubjects = subRes.data || [];
        const studentsData = Array.isArray(studentsRes?.data) ? studentsRes.data : [];
        setAllStudents(studentsData);

        if (res.data && Array.isArray(res.data)) {
          const regularStaff = res.data.filter(s => s.role !== 'HOD' && s.designation !== 'HOD');
          const formatted = regularStaff.map((s, i) => {
            let staffDept = s.dept || s.department || 'N/A';
            if (staffDept === 'Computer Science') staffDept = 'Computer Science Engineering';
            else if (staffDept === 'Electronics & Comm.') staffDept = 'Electronics & Communication Engineering';
            else if (staffDept === 'Electrical Engg.') staffDept = 'Electrical & Electronics Engineering';
            else if (staffDept === 'Mechanical Engg.') staffDept = 'Mechanical Engineering';
            else if (staffDept === 'Civil Engg.') staffDept = 'Civil Engineering';
            else if (staffDept === 'Information Tech.') staffDept = 'Information Technology';

            const realStudentCount = studentsData.filter(st => {
              let stDept = st.dept || st.department;
              if (stDept === 'Computer Science') stDept = 'Computer Science Engineering';
              else if (stDept === 'Electronics & Comm.') stDept = 'Electronics & Communication Engineering';
              else if (stDept === 'Electrical Engg.') stDept = 'Electrical & Electronics Engineering';
              else if (stDept === 'Mechanical Engg.') stDept = 'Mechanical Engineering';
              else if (stDept === 'Civil Engg.') stDept = 'Civil Engineering';
              else if (stDept === 'Information Tech.') stDept = 'Information Technology';
              return stDept === staffDept;
            }).length;
            
            return {
              id: s.id || s._id || i + 1,
              name: s.name,
              dept: staffDept,
              designation: s.designation || 'Staff',
              subjects: s.subjects && s.subjects.length > 0 ? s.subjects : ['General Engineering'],
              attendance: s.attendance ?? 0,
              performance: s.performance ?? 0,
              students: realStudentCount,
              experience: s.experience ?? 0,
              email: s.email || 'staff@college.edu',
              phone: s.phone || 'N/A',
              status: s.status || 'Active',
              publications: s.publications ?? 0,
              rating: s.rating ?? 0,
              bio: s.bio || ''
            };
          });
          
          setStaffList(formatted.map(s => {
            if (!s.subjects || s.subjects.length === 0 || s.subjects[0] === 'General Engineering') {
              const deptSubs = allSubjects.filter(sub => sub.department === s.dept).map(sub => sub.subjectName);
              if (deptSubs.length > 0) s.subjects = deptSubs;
            }
            return s;
          }));
          setLoading(false);
        }
      } catch (err) {
        console.warn('API getStaff offline.', err);
        setStaffList([]);
        setLoading(false);
      }
    };
    fetchPrincipalStaff();
  }, []);

  // Compute metrics dynamically from staffList
  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter(s => s.status === 'Active').length;
  const topPerformingCount = staffList.filter(s => s.performance >= 90).length;
  const lowAttendanceCount = staffList.filter(s => s.attendance < 92).length;
  const avgRating = (staffList.reduce((a, s) => a + s.rating, 0) / staffList.length).toFixed(1);

  // Department counts
  const deptCounts = staffList.reduce((acc, s) => {
    acc[s.dept] = (acc[s.dept] || 0) + 1;
    return acc;
  }, {});

  // Generate chart data dynamically
  const derivedDeptData = Object.keys(deptCounts).map(dept => {
    const dStaff = staffList.filter(s => s.dept === dept);
    const avgPerf = dStaff.reduce((a, b) => a + b.performance, 0) / dStaff.length || 0;
    const avgAtt = dStaff.reduce((a, b) => a + b.attendance, 0) / dStaff.length || 0;
    
    let shortName = dept.replace(' Engineering', '').replace('Technology', 'Tech').replace('Artificial Intelligence &', 'AI &');
    
    return {
      dept: shortName,
      staff: dStaff.length,
      avgPerf: Math.round(avgPerf),
      avgAtt: Math.round(avgAtt)
    };
  });

  const derivedTrendData = [
    { month: 'Jan', performance: 88, attendance: 92 },
    { month: 'Feb', performance: 89, attendance: 94 },
    { month: 'Mar', performance: 87, attendance: 90 },
    { month: 'Apr', performance: 91, attendance: 95 },
    { month: 'May', performance: 92, attendance: 96 }
  ];

  // Extract all distinct departments and subjects
  const departments = ['All', ...FULL_DEPARTMENTS];
  const allSubjects = ['All', ...new Set(staffList.flatMap(s => s.subjects))];

  // Filtering System logic
  const filtered = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.dept.toLowerCase().includes(search.toLowerCase()) ||
                          s.subjects.some(sub => sub.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = filterDept === 'All' || s.dept === filterDept;

    const matchesSubject = filterSubject === 'All' || s.subjects.includes(filterSubject);

    let matchesPerformance = true;
    if (filterPerformance === 'Outstanding') matchesPerformance = s.performance >= 92;
    else if (filterPerformance === 'Good') matchesPerformance = s.performance >= 85 && s.performance < 92;
    else if (filterPerformance === 'NeedsImprovement') matchesPerformance = s.performance < 85;

    let matchesExperience = true;
    if (filterExperience === 'Senior') matchesExperience = s.experience > 10;
    else if (filterExperience === 'Mid') matchesExperience = s.experience >= 5 && s.experience <= 10;
    else if (filterExperience === 'Junior') matchesExperience = s.experience < 5;

    return matchesSearch && matchesDept && matchesSubject && matchesPerformance && matchesExperience;
  });

  const handleAction = (staff, type) => {
    setSelectedStaff(staff);
    setModalType(type);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await createNotification({
        receiverId: selectedStaff.id,
        email: selectedStaff.email,
        targetName: selectedStaff.name,
        targetRoles: [], // Avoid broadcasting to everyone
        title: 'Message from Principal',
        message: notificationMsg,
        type: 'Warning'
      });
      showToast(`Notification sent successfully to ${selectedStaff.name}!`);
      setNotificationMsg('');
      setModalType(null);
    } catch (error) {
      console.error('Error sending notification:', error);
      showToast(`Failed to send notification to ${selectedStaff.name}.`);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      await createNotification({
        receiverId: selectedStaff.id,
        email: selectedStaff.email,
        targetName: selectedStaff.name,
        targetRoles: [], // Avoid broadcasting to everyone
        title: 'Meeting Scheduled by Principal',
        message: `A meeting has been scheduled for you on ${meetingDate} at ${meetingTime}. Please be available.`,
        type: 'Warning'
      });
      showToast(`Meeting scheduled with ${selectedStaff.name} on ${meetingDate} at ${meetingTime}`);
      setMeetingDate('');
      setMeetingTime('');
      setModalType(null);
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      showToast(`Failed to schedule meeting with ${selectedStaff.name}.`);
    }
  };

  return (
    <div className="main-content" style={{ padding: '2rem', background: 'var(--bg-primary)', minHeight: 'calc(100vh - 70px)' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: 'var(--sidebar-bg)', color: 'var(--sidebar-text)', padding: '1rem 1.5rem', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 99999, borderLeft: '4px solid #10b981', fontWeight: 600 }}>✅ {toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen style={{ color: '#3730A5' }} size={28} /> Staff Performance & Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time faculty auditing, rating distributions, and custom notification systems.</p>
      </div>

      {/* 6 Top Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Faculty', value: staffList.length, icon: <Users size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'All departments' },
          { label: 'On Leave', value: 0, icon: <UserMinus size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'No absences' },
          { label: 'Avg Attendance', value: staffList.length ? `${(staffList.reduce((acc, curr) => acc + curr.attendance, 0) / staffList.length).toFixed(1)}%` : '0%', icon: <Calendar size={18} />, bgTint: '#E1F5EE', iconColor: '#047857', sub: 'Above target', subColor: '#047857' },
          { label: 'Avg Rating', value: staffList.length ? (staffList.reduce((acc, curr) => acc + curr.rating, 0) / staffList.length).toFixed(1) : '0', icon: <Star size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'Out of 5.0' },
          { label: 'Departments', value: Object.keys(deptCounts).length, icon: <BookOpen size={18} />, bgTint: '#EEEDFE', iconColor: '#3C3489', sub: 'Active divisions' },
        ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ padding: '1.25rem', background: '#FFFFFF', border: '1px solid #E3E5EC', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.bgTint, color: s.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{s.label}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: '1.1' }}>{s.value}</span>
              <span style={{ fontSize: '0.75rem', color: s.subColor || 'var(--text-muted)', fontWeight: s.subColor ? 600 : 400 }}>{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters & Search System */}
      <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.8rem', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
          <SlidersHorizontal size={14} style={{ color: '#6366F1' }} /> Filters & Institutional Auditing
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}>
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search Name, Subject..." 
              style={{ padding: '0.5rem 0.8rem 0.5rem 2rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem', width: '100%' }} 
            />
          </div>

          {/* Department Filter */}
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)} 
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem' }}
          >
            <option value="All">All Departments</option>
            {departments.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Subject Filter */}
          <select 
            value={filterSubject} 
            onChange={e => setFilterSubject(e.target.value)} 
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem' }}
          >
            <option value="All">All Subjects</option>
            {allSubjects.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Performance Filter */}
          <select 
            value={filterPerformance} 
            onChange={e => setFilterPerformance(e.target.value)} 
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem' }}
          >
            <option value="All">All Performance Ranges</option>
            <option value="Outstanding">Outstanding (≥92%)</option>
            <option value="Good">Good (85-91%)</option>
            <option value="NeedsImprovement">Needs Improvement (&lt;85%)</option>
          </select>

          {/* Experience Filter */}
          <select 
            value={filterExperience} 
            onChange={e => setFilterExperience(e.target.value)} 
            style={{ padding: '0.5rem 0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.8rem' }}
          >
            <option value="All">All Experience Ranges</option>
            <option value="Senior">Senior Faculty (&gt;10 yrs)</option>
            <option value="Mid">Mid-level (5-10 yrs)</option>
            <option value="Junior">Junior Faculty (&lt;5 yrs)</option>
          </select>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.2rem', marginBottom: '1.5rem' }}>
        {/* Performance Chart */}
        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>Faculty Performance vs Attendance</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={derivedDeptData} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="avgPerf" fill="#6366F1" name="Performance Score" radius={[3, 3, 0, 0]} />
              <Bar dataKey="avgAtt" fill="#10b981" name="Attendance %" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Staff count by department */}
        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>Department-wise Staff Count</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={derivedDeptData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="staff" fill="#0ea5e9" name="Staff Count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend */}
        <div className="glass-card" style={{ padding: '1.2rem', borderRadius: 16 }}>
          <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', marginBottom: '0.8rem' }}>Monthly Performance Trend</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={derivedTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="performance" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} name="Performance" />
              <Line type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Attendance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Advanced Staff Table */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16 }}>
        <h4 style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1rem', marginBottom: '1rem' }}>Faculty Auditing Registry</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Department</th>
                <th>Subject(s)</th>
                <th>Experience</th>
                <th>Attendance</th>
                <th>Performance</th>
                <th>Feedback Rating</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No staff match the selected filters.</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  {/* Name & Designation */}
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.designation}</span>
                  </td>

                  {/* Department */}
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.dept}</td>

                  {/* Subjects */}
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {s.subjects.map(sub => (
                        <span key={sub} style={{ background: 'rgba(99, 102, 241,0.1)', color: '#6366F1', padding: '2px 6px', borderRadius: 5, fontSize: '0.7rem', fontWeight: 600 }}>{sub}</span>
                      ))}
                    </div>
                  </td>

                  {/* Experience */}
                  <td style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.experience} Years</td>

                  {/* Attendance */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                        <div style={{ width: `${s.attendance}%`, height: '100%', background: s.attendance >= 95 ? '#10b981' : s.attendance >= 90 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: s.attendance < 92 ? '#ef4444' : 'var(--text-main)' }}>{s.attendance}%</span>
                    </div>
                  </td>

                  {/* Performance Score */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--bg-secondary)', borderRadius: 3 }}>
                        <div style={{ width: `${s.performance}%`, height: '100%', background: s.performance >= 90 ? '#6366F1' : s.performance >= 85 ? '#6366f1' : '#f59e0b', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6366F1' }}>{s.performance}%</span>
                    </div>
                  </td>

                  {/* Student Feedback Rating */}
                  <td>
                    <span style={{ background: 'rgba(245,158,11,0.09)', color: '#f59e0b', padding: '3px 8px', borderRadius: 6, fontSize: '0.76rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      ★ {s.rating}
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <span style={{ background: s.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: s.status === 'Active' ? '#10b981' : '#f59e0b', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>{s.status}</span>
                  </td>

                  {/* Action items */}
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleAction(s, 'profile')} 
                        style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        title="View Full Profile"
                      >
                        Profile
                      </button>
                      <button 
                        onClick={() => handleAction(s, 'classes')} 
                        style={{ padding: '4px 8px', background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        title="View Teaching Classes"
                      >
                        Classes
                      </button>
                      <button 
                        onClick={() => handleAction(s, 'report')} 
                        style={{ padding: '4px 8px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Generate Performance Report"
                      >
                        Report
                      </button>
                      <button 
                        onClick={() => handleAction(s, 'notify')} 
                        style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Send Notification"
                      >
                        Notify
                      </button>
                      <button 
                        onClick={() => handleAction(s, 'meeting')} 
                        style={{ padding: '4px 8px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: 5, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                        title="Schedule Staff Meeting"
                      >
                        Meeting
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLY INTERACTIVE MODAL OVERLAYS */}
      {selectedStaff && modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: 16, width: '100%', maxWidth: '520px', position: 'relative', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            
            {/* Close button */}
            <button 
              onClick={() => { setSelectedStaff(null); setModalType(null); }} 
              style={{ position: 'absolute', right: 20, top: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Profile Modal */}
            {modalType === 'profile' && (
              <div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: '1.2rem' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '1.3rem' }}>{selectedStaff.name.charAt(0)}</div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>{selectedStaff.name}</h3>
                    <p style={{ fontSize: '0.8rem', color: '#6366F1', fontWeight: 700, margin: 0 }}>{selectedStaff.designation} · {selectedStaff.dept}</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: '1.45', marginBottom: '1.2rem' }}>{selectedStaff.bio}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg-primary)', padding: '1rem', borderRadius: 10, marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Mail size={14} style={{ color: '#6366F1' }} /> {selectedStaff.email}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Phone size={14} style={{ color: '#6366F1' }} /> {selectedStaff.phone}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <BookOpen size={14} style={{ color: '#6366F1' }} /> Experience: {selectedStaff.experience} Years
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Star size={14} style={{ color: '#f59e0b' }} /> Rating: {selectedStaff.rating} / 5.0
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModalType('notify')} style={{ flex: 1, padding: '0.6rem', background: '#6366F1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Send Alert</button>
                  <button onClick={() => setModalType('meeting')} style={{ flex: 1, padding: '0.6rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Schedule Meeting</button>
                </div>
              </div>
            )}

            {/* Classes Modal */}
            {modalType === 'classes' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={18} style={{ color: '#0ea5e9' }} /> Teaching Schedule — {selectedStaff.name}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedStaff.subjects.map((s, idx) => (
                    <div key={idx} style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>{s}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Dept Students: {selectedStaff.students}</div>
                      </div>
                      <span style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', padding: '3px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700 }}>Active Class</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Report Modal */}
            {modalType === 'report' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={18} style={{ color: '#10b981' }} /> Performance Breakdown — {selectedStaff.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>Detailed competencies derived from student feedback, attendance, and administrative audits.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Teaching Quality', score: selectedStaff.performance, color: '#6366F1' },
                    { label: 'Punctuality & Attendance', score: selectedStaff.attendance, color: '#10b981' },
                    { label: 'Research & Publications', score: Math.min(100, selectedStaff.publications * 8), color: '#6366f1' },
                    { label: 'Syllabus Coverage', score: 98, color: '#0ea5e9' },
                    { label: 'Student Engagement', score: Math.round(selectedStaff.rating * 20), color: '#f59e0b' }
                  ].map((c, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                        <span>{c.label}</span>
                        <span style={{ color: c.color }}>{c.score}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4 }}>
                        <div style={{ width: `${c.score}%`, height: '100%', background: c.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notify Modal */}
            {modalType === 'notify' && (
              <form onSubmit={handleSendNotification}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={18} style={{ color: '#ef4444' }} /> Broadcast Notice to {selectedStaff.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>The message will be instantly delivered via College SMS gateway and email.</p>
                <textarea 
                  required
                  value={notificationMsg}
                  onChange={e => setNotificationMsg(e.target.value)}
                  placeholder="Enter notice content (e.g. Please update syllabus audits for the current semester)..."
                  rows={4}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.82rem', resize: 'none', marginBottom: '1.2rem' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setModalType('profile')} style={{ flex: 1, padding: '0.6rem', background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Back</button>
                  <button type="submit" style={{ flex: 2, padding: '0.6rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Send Broadcast</button>
                </div>
              </form>
            )}

            {/* Meeting Modal */}
            {modalType === 'meeting' && (
              <form onSubmit={handleScheduleMeeting}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={18} style={{ color: '#f59e0b' }} /> Book Principal-Staff Meeting
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>Book a personal performance audit or review session.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.2rem' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Date</label>
                    <input 
                      type="date" 
                      required
                      value={meetingDate} 
                      onChange={e => setMeetingDate(e.target.value)} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.82rem' }} 
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Select Time</label>
                    <input 
                      type="time" 
                      required
                      value={meetingTime} 
                      onChange={e => setMeetingTime(e.target.value)} 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.82rem' }} 
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setModalType('profile')} style={{ flex: 1, padding: '0.6rem', background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Back</button>
                  <button type="submit" style={{ flex: 2, padding: '0.6rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Confirm Booking</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
