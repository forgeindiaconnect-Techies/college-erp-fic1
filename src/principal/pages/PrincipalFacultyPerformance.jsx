import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  AlertTriangle,
  FileText,
  Mail,
  UserCheck,
  Search,
  BookOpen,
  CalendarCheck,
  Percent,
  Download,
  Info,
  Clock,
  Send,
  X,
  Cpu,
  BarChart2,
  Sparkles,
  ShieldAlert,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import '../../pages/Dashboard.css';
import { getStaff } from '../../api/index.js';
import { io } from 'socket.io-client';

// Seed data representing faculty and HODs
const initialFaculty = [
  {
    id: 1,
    name: 'Dr. Amit Verma',
    role: 'HOD',
    department: 'CSE Department',
    subjects: 'Advanced OS, Distributed Systems',
    attendance: 96,
    score: 9.4,
    feedback: 4.8,
    workload: 18, // hours per week
    status: 'Outstanding',
    syllabusCompletion: 92,
    publications: 5,
    joinedDate: '2016-06-15'
  },
  {
    id: 2,
    name: 'Dr. Priya Nair',
    role: 'HOD',
    department: 'ECE Department',
    subjects: 'Microprocessors, VLSI Design',
    attendance: 94,
    score: 9.1,
    feedback: 4.6,
    workload: 20,
    status: 'Outstanding',
    syllabusCompletion: 88,
    publications: 4,
    joinedDate: '2018-07-22'
  },
  {
    id: 3,
    name: 'Prof. Rajesh Patel',
    role: 'Staff',
    department: 'CSE Department',
    subjects: 'Database Management, Data Structures',
    attendance: 92,
    score: 8.8,
    feedback: 4.4,
    workload: 26, // high workload
    status: 'Active',
    syllabusCompletion: 85,
    publications: 2,
    joinedDate: '2020-01-10'
  },
  {
    id: 4,
    name: 'Dr. V. K. Malhotra',
    role: 'HOD',
    department: 'MECH Department',
    subjects: 'Thermodynamics, CAD/CAM',
    attendance: 91,
    score: 8.5,
    feedback: 4.2,
    workload: 16,
    status: 'Active',
    syllabusCompletion: 90,
    publications: 3,
    joinedDate: '2015-08-01'
  },
  {
    id: 5,
    name: 'Prof. Sneha Reddy',
    role: 'Staff',
    department: 'ECE Department',
    subjects: 'Signal Processing, Digital Design',
    attendance: 78, // low attendance
    score: 7.4,
    feedback: 3.5, // low feedback
    workload: 14,
    status: 'Needs Review',
    syllabusCompletion: 70,
    publications: 1,
    joinedDate: '2022-09-05'
  },
  {
    id: 6,
    name: 'Prof. Vikram Singh',
    role: 'Staff',
    department: 'EEE Department',
    subjects: 'Power Electronics, Control Systems',
    attendance: 82,
    score: 6.9, // low score
    feedback: 3.1, // low feedback
    workload: 12,
    status: 'On Probation',
    syllabusCompletion: 64,
    publications: 0,
    joinedDate: '2023-06-12'
  }
];

// Student feedback logs for sentiment analysis demo
const initialFeedbackLogs = [
  { id: 1, staffName: 'Dr. Amit Verma', comment: 'Excellent delivery and very engaging discussions.', rating: 5, sentiment: 'Positive' },
  { id: 2, staffName: 'Prof. Sneha Reddy', comment: 'Class pace is extremely fast, and assignments are overloaded.', rating: 3, sentiment: 'Negative' },
  { id: 3, staffName: 'Prof. Rajesh Patel', comment: 'Explains complex queries very logically. Highly helpful.', rating: 4, sentiment: 'Positive' },
  { id: 4, staffName: 'Prof. Vikram Singh', comment: 'Syllabus coverage is lagging behind. Needs more lab demos.', rating: 2, sentiment: 'Negative' },
  { id: 5, staffName: 'Dr. Priya Nair', comment: 'Systematic lecture design and clear lab manuals.', rating: 5, sentiment: 'Positive' },
  { id: 6, staffName: 'Prof. Sneha Reddy', comment: 'Struggled to explain VLSI routing. Lectures are theoretical.', rating: 3, sentiment: 'Neutral' }
];

export default function PrincipalFacultyPerformance() {
  const [facultyList, setFacultyList] = useState([]);

  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        const res = await getStaff();
        const staffData = res.data || [];
        
        const formattedFaculty = staffData.map(s => ({
          id: s.id || s._id,
          name: s.name,
          role: s.designation === 'HOD' ? 'HOD' : 'Staff',
          department: s.dept || 'Unknown',
          subjects: Array.isArray(s.subjects) && s.subjects.length > 0 ? s.subjects.join(', ') : (typeof s.subjects === 'string' ? s.subjects : 'Not Assigned'),
          attendance: s.attendance || 90,
          score: s.rating || 8.0,
          feedback: s.rating ? s.rating / 2 : 4.0,
          workload: s.workload || 15,
          status: s.status === 'Active' ? (s.rating >= 9.0 ? 'Outstanding' : (s.rating < 7.5 ? 'Needs Review' : 'Active')) : s.status,
          syllabusCompletion: s.passRate ?? 0,
          publications: s.publications ?? 0,
          joinedDate: s.joinDate ? new Date(s.joinDate).toISOString().split('T')[0] : '2023-01-01'
        }));
        
        setFacultyList(formattedFaculty);
      } catch (err) {
        console.warn('Failed to fetch faculty from backend, using fallback', err);
        setFacultyList(initialFaculty);
      }
    };
    
    fetchFacultyData();
    
    // Auto-refresh when staff is updated elsewhere
    const socket = io('http://localhost:5000');
    socket.on('staffUpdated', () => {
      fetchFacultyData();
    });
    
    return () => socket.disconnect();
  }, []);

  // Tab State
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking', 'hod-review', 'ai-insights'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Modal states
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  // Forms
  const [warningData, setWarningData] = useState({
    staffName: '',
    email: '',
    subject: '',
    message: ''
  });

  const [meetingData, setMeetingData] = useState({
    staffName: '',
    date: '2026-06-02',
    time: '14:30',
    venue: 'Principal Conference Room',
    agenda: ''
  });

  // AI insights variables
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiOptimized, setAiOptimized] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Boundary safety alert state
  const [restrictedAction, setRestrictedAction] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Activity logs
  const [activityLogs, setActivityLogs] = useState([
    { time: '11:20', msg: 'Principal inspected CSE performance records.' },
    { time: '09:15', msg: 'Student feedback survey compiled for spring semester.' },
    { time: '08:45', msg: 'AI audit flagged Prof. Rajesh Patel for high weekly workload.' }
  ]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setActivityLogs(prev => [{ time, msg }, ...prev]);
  };

  // Metrics
  const avgAttendance = Math.round(facultyList.reduce((acc, curr) => acc + curr.attendance, 0) / facultyList.length);
  const avgSyllabus = Math.round(facultyList.reduce((acc, curr) => acc + curr.syllabusCompletion, 0) / facultyList.length);
  const topStaff = facultyList.filter(f => f.score >= 9.0).length;
  const reviewCount = facultyList.filter(f => f.score < 7.5 || f.attendance < 80).length;

  // Filter list
  const filteredFaculty = facultyList.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.subjects.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'All' || f.department.includes(selectedDept);
    
    if (activeTab === 'hod-review') {
      return matchesSearch && matchesDept && f.role === 'HOD';
    }
    return matchesSearch && matchesDept;
  });

  // Recharts payload formatting
  const workloadChartData = facultyList.map(f => ({
    name: f.name.split(' ')[1] || f.name,
    workload: f.workload,
    status: f.workload > 24 ? 'Overloaded' : f.workload < 14 ? 'Underutilized' : 'Optimal'
  }));

  const ratingChartData = facultyList.map(f => ({
    name: f.name.split(' ')[1] || f.name,
    score: f.score,
    feedback: Math.round(f.feedback * 2) // scale up for comparative display
  }));

  // Actions trigger
  const handleOpenWarning = (staff) => {
    setWarningData({
      staffName: staff.name,
      email: `${staff.name.toLowerCase().replace(/\s+/g, '')}@college.edu`,
      subject: `Official Notice: Academic Performance & Attendance Review`,
      message: `Dear ${staff.name},\n\nWe have reviewed the institutional reports for the current semester and noticed that your attendance percentage (${staff.attendance}%) and student satisfaction score (${staff.feedback}/5) do not meet our benchmark standards.\n\nPlease arrange to submit a detailed syllabus catch-up plan and arrange a meeting with your HOD.\n\nBest regards,\nOffice of the Principal`
    });
    setShowWarningModal(true);
  };

  const dispatchWarning = (e) => {
    e.preventDefault();
    addLog(`Principal dispatched academic warning notice to ${warningData.staffName}.`);
    setShowWarningModal(false);
    triggerToast(`✉️ Warning email successfully sent to ${warningData.staffName}!`);
  };

  const handleOpenMeeting = (staff) => {
    setMeetingData(prev => ({
      ...prev,
      staffName: staff.name,
      agenda: `Urgent performance optimization review regarding current teaching workload of ${staff.workload} hours/week and class results.`
    }));
    setShowMeetingModal(true);
  };

  const dispatchMeeting = (e) => {
    e.preventDefault();
    addLog(`Principal scheduled performance audit meeting with ${meetingData.staffName} for ${meetingData.date}.`);
    setShowMeetingModal(false);
    triggerToast(`📅 Review meeting scheduled successfully! Invitations pushed.`);
  };

  // AI Sentiment & Workload Audit Simulation
  const handleAIAudit = () => {
    setAiAnalyzing(true);
    setTimeout(() => {
      setAiOptimized(true);
      setAiAnalyzing(false);
      addLog('AI Audit processed student feedback logs and workload distribution.');
      triggerToast('🤖 AI Performance insights audit updated!');
    }, 1800);
  };

  const triggerRestriction = (action) => {
    setRestrictedAction(action);
    setShowRestrictionModal(true);
  };

  return (
    <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      
      {/* Toast Alert popups */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)',
          padding: '1rem 1.5rem', borderRadius: '10px', boxShadow: 'var(--shadow-lg)',
          zIndex: 99999, display: 'flex', alignItems: 'center', gap: '8px',
          borderLeft: '4px solid var(--success)', animation: 'fadeIn 0.3s ease-out'
        }}>
          <Sparkles size={18} className="text-[#10b981]" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* Embedded Animations CSS style tag */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.8); }
          100% { box-shadow: 0 0 5px rgba(99, 102, 241, 0.4); }
        }
        .ai-pulse-btn {
          animation: pulseGlow 2.5s infinite ease-in-out;
        }
        .appraisal-box {
          border: 2px double var(--border-color);
          background: #fff;
          color: #1f2937;
          font-family: 'Times New Roman', Times, serif;
          padding: 3rem;
          margin: 0 auto;
          max-width: 650px;
          box-shadow: var(--shadow-md);
        }
        .appraisal-seal {
          border: 2px solid #b91c1c;
          color: #b91c1c;
          padding: 8px;
          display: inline-block;
          font-weight: bold;
          text-transform: uppercase;
          transform: rotate(-5deg);
        }
      `}} />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <UserCheck style={{ color: '#3730A5' }} size={28} /> Faculty & HOD Performance Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Monitor teaching workloads, analyze student feedback sentiment logs, review HOD ratings, and audit faculty efficiency parameters.
          </p>
        </div>

        {/* Oversight Bounds Info */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5' }}>
          <Users size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Scope clearance</span>
            <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Principal Account - Academic Monitor</strong>
          </div>
        </div>
      </div>

      {/* VIEW TABS SELECTOR */}
      <div className="glass-card mb-6" style={{ padding: '0.4rem', borderRadius: '12px', display: 'inline-flex', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('tracking')}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeTab === 'tracking' ? '#3730A5' : 'transparent',
            color: activeTab === 'tracking' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
          }}
        >
          👨‍🏫 Faculty Performance Tracking
        </button>
        <button
          onClick={() => setActiveTab('hod-review')}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeTab === 'hod-review' ? '#3730A5' : 'transparent',
            color: activeTab === 'hod-review' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
          }}
        >
          🎖️ HOD Performance Review
        </button>
        <button
          onClick={() => setActiveTab('ai-insights')}
          className="ai-pulse-btn"
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeTab === 'ai-insights' ? '#3730A5' : 'transparent',
            color: activeTab === 'ai-insights' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          <Cpu size={14} /> AI Performance Analytics
        </button>
      </div>

      {/* --- DASHBOARD STATS CARDS --- */}
      <div className="stats-grid mb-6 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#E1F5EE', color: 'var(--success)' }}><Award size={18} /></div>
          <div className="stat-details">
            <h3>Top Performing Staff</h3>
            <p className="stat-value">{topStaff}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Score &gt;= 9.0 out of 10</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FCEBEB', color: 'var(--danger)' }}><AlertTriangle size={18} /></div>
          <div className="stat-details">
            <h3>Low Performance Staff</h3>
            <p className="stat-value">{reviewCount}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>Score &lt; 7.5 or low attendance</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><BookOpen size={18} /></div>
          <div className="stat-details">
            <h3>Subject Completion %</h3>
            <p className="stat-value">{avgSyllabus}%</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Average syllabus completed</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><CalendarCheck size={18} /></div>
          <div className="stat-details">
            <h3>Average Attendance</h3>
            <p className="stat-value">{avgAttendance}%</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Faculty attendance average</span>
          </div>
        </div>

        {/* Pending review tasks card */}
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FAEEDA', color: 'var(--warning)' }}><FileText size={18} /></div>
          <div className="stat-details">
            <h3>Pending Appraisal Reviews</h3>
            <p className="stat-value">2</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Spring reviews awaiting seal</span>
          </div>
        </div>

      </div>

      {/* --- RENDER VIEW: FACULTY & HOD TRACKING TAB --- */}
      {(activeTab === 'tracking' || activeTab === 'hod-review') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7.5fr) minmax(0, 2.5fr)', gap: '1.5rem' }}>
          
          {/* Main Datagrid */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            
            {/* Header filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="flex gap-2">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    style={{
                      padding: '0.55rem 2rem 0.55rem 2.6rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      appearance: 'none',
                      cursor: 'pointer',
                      minWidth: '240px'
                    }}
                  >
                    {[
                      'All Departments',
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
                    ].map(dept => (
                      <option key={dept} value={dept === 'All Departments' ? 'All' : dept}>{dept}</option>
                    ))}
                  </select>
                  <Layers size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                  <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', fontSize: '0.85rem',
                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)',
                    width: '180px'
                  }}
                />
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Table */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Department</th>
                    <th>Subjects</th>
                    <th>Attendance %</th>
                    <th>Performance Score</th>
                    <th>Student Feedback</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFaculty.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No records match the active parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredFaculty.map(staff => (
                      <tr key={staff.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedStaff(staff)}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{staff.name}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>{staff.role}</span>
                        </td>
                        <td>
                          <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                            {staff.department.replace(' Department', '')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {staff.subjects}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ color: staff.attendance < 80 ? 'var(--danger)' : 'var(--text-main)' }}>
                            {staff.attendance}%
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          <span style={{ color: staff.score >= 9.0 ? 'var(--success)' : staff.score < 7.5 ? 'var(--warning)' : 'var(--text-main)' }}>
                            ⭐ {staff.score} / 10
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          🎓 {staff.feedback} / 5.0
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: staff.status === 'Outstanding' ? 'rgba(16, 185, 129, 0.12)' : staff.status === 'Needs Review' || staff.status === 'On Probation' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: staff.status === 'Outstanding' ? 'var(--success)' : staff.status === 'Needs Review' || staff.status === 'On Probation' ? 'var(--danger)' : 'var(--warning)',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                          }}>
                            {staff.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { setSelectedStaff(staff); setShowPerformanceModal(true); }}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                              title="View performance analysis metrics"
                            >
                              Analyze
                            </button>
                            <button
                              onClick={() => { setSelectedStaff(staff); setShowAppraisalModal(true); }}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Appraisal
                            </button>
                            {staff.score < 8.0 && (
                              <button
                                onClick={() => handleOpenWarning(staff)}
                                style={{ padding: '4px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: 'none', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Warn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right info details pane */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Quick Staff Details View */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '260px' }}>
              {selectedStaff ? (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(99, 102, 241, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {selectedStaff.role}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                        {selectedStaff.name}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedStaff(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                    <div><strong>Department:</strong> {selectedStaff.department}</div>
                    <div><strong>Subjects Taught:</strong> {selectedStaff.subjects}</div>
                    <div><strong>Weekly Workload:</strong> {selectedStaff.workload} hours</div>
                    <div><strong>Syllabus Completed:</strong> {selectedStaff.syllabusCompletion}%</div>
                    <div><strong>Publications:</strong> {selectedStaff.publications} journals</div>
                    <div><strong>Joined Date:</strong> {selectedStaff.joinedDate}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenMeeting(selectedStaff)}
                      style={{ padding: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                    >
                      <Calendar size={12} /> Assign Meeting
                    </button>
                    <button
                      onClick={() => { setShowAppraisalModal(true); }}
                      style={{ padding: '0.5rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                    >
                      <Download size={12} /> Download Appraisal
                    </button>
                  </div>

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <UserCheck size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>No Staff Selected</h4>
                  <p style={{ fontSize: '0.75rem', maxWidth: '180px', margin: '4px auto 0' }}>Select any faculty row to check statistics, assign urgent review meetings, or generate appraisal scorecards.</p>
                </div>
              )}
            </div>

            {/* Role Clearance Bounds safeguards card */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', borderLeft: '3px solid var(--danger)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🛡️ Role Clearance Boundaries
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.8rem' }}>
                Principal clearance settings prevent modifying administration database roles:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button 
                  onClick={() => triggerRestriction('Modify database structures and servers')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  ❌ Manage Server/Database
                </button>
                <button 
                  onClick={() => triggerRestriction('Altering administration security configurations')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔑 Change Admin Security Settings
                </button>
                <button 
                  onClick={() => triggerRestriction('Deleting registered administration accounts')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🗑️ Delete Admin Users
                </button>
              </div>
            </div>

            {/* Small activity logs */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                ⚡ Faculty Activity Logs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '160px', overflowY: 'auto' }}>
                {activityLogs.slice(0, 4).map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '6px' }}>[{log.time}]</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- RENDER VIEW: AI PERFORMANCE ANALYTICS TAB --- */}
      {activeTab === 'ai-insights' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '1.5rem' }}>
          
          {/* AI Audits & Alerts */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={18} className="text-[#6366F1]" /> AI Performance Engine
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
              Run sentiment analysis audit over student reviews and map teaching workloads against performance benchmarks.
            </p>

            <button
              onClick={handleAIAudit}
              disabled={aiAnalyzing}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.6rem', borderRadius: '8px' }}
            >
              {aiAnalyzing ? 'Running Sentiment Analysis Audit...' : 'Run AI Sentiment & Workload Audit'}
            </button>

            {/* AI suggestions */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                ⚠️ Automated Performance Alerts
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.06)', borderLeft: '3px solid var(--danger)', padding: '8px', borderRadius: '4px' }}>
                  <AlertTriangle size={16} className="text-[#ef4444] shrink-0" />
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Prof. Sneha Reddy (ECE)</strong>
                    <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>Low Student Feedback rating (3.5) & declining attendance rate (78%). Suggest warning or workload reduction.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.06)', borderLeft: '3px solid var(--warning)', padding: '8px', borderRadius: '4px' }}>
                  <AlertTriangle size={16} className="text-[#f59e0b] shrink-0" />
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Prof. Rajesh Patel (CSE)</strong>
                    <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>High teaching workload (26 hrs/wk). Workload exceeds standard limit. Suggest workload balancing.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* AI optimized graphs & results */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
              AI Workload & Performance Distribution Charts
            </h3>

            {aiOptimized ? (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'col', gap: '1.5rem' }}>
                
                {/* Workload allocations */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Teaching Hours Allocation vs Benchmark (Max 24 hrs)
                  </h4>
                  <div style={{ width: '100%', height: '200px' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={workloadChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Hours/Wk', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Bar dataKey="workload" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Rating Comparatives */}
                <div style={{ marginTop: '1.2rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    Performance Score (out of 10) vs Student Feedback (scaled *2)
                  </h4>
                  <div style={{ width: '100%', height: '200px' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ratingChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="score" fill="#10b981" name="Appraisal Score" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="feedback" fill="#3b82f6" name="Student Feedback Rating" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '380px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <Cpu size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>AI Audit Pending</h4>
                <p style={{ fontSize: '0.75rem', maxWidth: '240px', margin: '4px auto 0' }}>Click the Audit button on the left to run AI Sentiment classifications and workload comparative graphs.</p>
              </div>
            )}

          </div>

        </div>
      )}


      {/* MODAL 1: VIEW DETAILED PERFORMANCE ANALYSIS */}
      {showPerformanceModal && selectedStaff && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 className="text-[#6366F1]" size={20} /> Performance Analytics: {selectedStaff.name}
              </h3>
              <button onClick={() => setShowPerformanceModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              
              {/* Score grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Appraisal Index</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{selectedStaff.score} / 10</strong>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Syllabus Covered</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{selectedStaff.syllabusCompletion}%</strong>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>Feedback Average</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{selectedStaff.feedback} / 5.0</strong>
                </div>
              </div>

              {/* Workload Indicator bar */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Teaching Workload Load Status</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: selectedStaff.workload > 24 ? 'var(--danger)' : 'var(--text-muted)' }}>{selectedStaff.workload} Hours / Week</span>
                </div>
                <div style={{ height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((selectedStaff.workload / 30) * 100, 100)}%`,
                    backgroundColor: selectedStaff.workload > 24 ? 'var(--danger)' : selectedStaff.workload < 14 ? 'var(--warning)' : 'var(--success)'
                  }} />
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  * Standard institutional teaching workload benchmark is 14 - 24 hours per week.
                </span>
              </div>

              {/* Feedbacks list */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Recent Student Surveys & Sentiment Logs
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {initialFeedbackLogs.filter(f => f.staffName === selectedStaff.name).map(feed => (
                    <div key={feed.id} style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                      <div className="flex justify-between items-center mb-1">
                        <strong style={{ color: 'var(--text-main)' }}>Rating: ⭐ {feed.rating}/5</strong>
                        <span style={{
                          backgroundColor: feed.sentiment === 'Positive' ? 'rgba(16,185,129,0.12)' : feed.sentiment === 'Negative' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                          color: feed.sentiment === 'Positive' ? 'var(--success)' : feed.sentiment === 'Negative' ? 'var(--danger)' : 'var(--warning)',
                          padding: '2px 5px', borderRadius: '4px', fontWeight: 700, fontSize: '0.65rem'
                        }}>
                          {feed.sentiment}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-muted)' }}>"{feed.comment}"</p>
                    </div>
                  ))}
                  {initialFeedbackLogs.filter(f => f.staffName === selectedStaff.name).length === 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No direct feedback submissions mapped to this faculty.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1.2rem', borderRadius: '8px' }}
                >
                  Close Analysis
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* MODAL 2: GENERATE APPRAISAL REVIEW CERTIFICATE */}
      {showAppraisalModal && selectedStaff && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '700px', maxHeight: '95vh', overflowY: 'auto', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={18} className="text-[#10b981]" /> Faculty Performance Appraisal Form
              </h3>
              <button onClick={() => setShowAppraisalModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Certificate Style Box */}
            <div className="appraisal-box">
              <div style={{ textAlign: 'center', borderBottom: '2px solid #1f2937', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#111827', margin: 0, fontFamily: 'Times New Roman' }}>LAKESIDE INSTITUTE OF TECHNOLOGY</h2>
                <span style={{ fontSize: '0.78rem', color: '#4b5563', letterSpacing: '2px' }}>OFFICE OF THE PRINCIPAL · APPRAISAL BOARD</span>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: '#b91c1c', margin: '0 0 10px', textDecoration: 'underline' }}>ANNUAL FACULTY PERFORMANCE CERTIFICATE</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                  This is to officially certify that the academic administration board has evaluated the teaching, publications, student surveys, and syllabus coverage index for:
                </p>
                <h4 style={{ fontSize: '1.4rem', color: '#111827', margin: '10px 0', fontWeight: 'bold' }}>{selectedStaff.name}</h4>
                <p style={{ fontSize: '0.85rem', color: '#4b5563' }}>Role: {selectedStaff.role} | Department: {selectedStaff.department}</p>
              </div>

              {/* Table Metrics */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1.5px solid #1f2937' }}>
                    <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #d1d5db' }}>Evaluation Parameter</th>
                    <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db' }}>Actual Score</th>
                    <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db' }}>Rating Level</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>Teaching Appraisal Index</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{selectedStaff.score} / 10</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db' }}>{selectedStaff.score >= 9.0 ? 'Outstanding' : selectedStaff.score >= 8.0 ? 'Exceeds Benchmark' : 'Satisfactory'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>Student Satisfaction Survey</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{selectedStaff.feedback} / 5.0</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db' }}>{selectedStaff.feedback >= 4.5 ? 'Excellent' : selectedStaff.feedback >= 3.8 ? 'Good' : 'Needs Optimization'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>Classroom Lecture Attendance</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{selectedStaff.attendance}%</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db' }}>{selectedStaff.attendance >= 90 ? 'High Regularity' : 'Irregular'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', border: '1px solid #d1d5db' }}>Journal Research Publications</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db', fontWeight: 'bold' }}>{selectedStaff.publications} Papers</td>
                    <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #d1d5db' }}>{selectedStaff.publications >= 3 ? 'Active Scholar' : 'Minimal'}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2rem' }}>
                <div>
                  <div className="appraisal-seal">APPROVED SEAL</div>
                </div>
                <div style={{ textAlign: 'center', borderTop: '1px solid #1f2937', width: '180px', paddingTop: '5px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#111827' }}>Dr. R. K. Sharma</span>
                  <span style={{ fontSize: '0.68rem', display: 'block', color: '#4b5563' }}>Office of the Principal</span>
                </div>
              </div>

            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button 
                onClick={() => setShowAppraisalModal(false)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  triggerToast(`📥 Compilation complete! Appraisal record for ${selectedStaff.name} prepared for download.`);
                  setShowAppraisalModal(false);
                }}
                className="btn-primary"
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Download size={14} /> Download PDF Appraisal
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL 3: DISPATCH EMAIL WARNING MESSAGE */}
      {showWarningModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail className="text-[#ef4444]" size={20} /> Dispatch Academic Performance Notice
              </h3>
              <button onClick={() => setShowWarningModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={dispatchWarning} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Recipient Email
                </label>
                <input 
                  type="email" required
                  value={warningData.email}
                  onChange={(e) => setWarningData(prev => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Subject Line
                </label>
                <input 
                  type="text" required
                  value={warningData.subject}
                  onChange={(e) => setWarningData(prev => ({ ...prev, subject: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Notice Content
                </label>
                <textarea 
                  rows="9" required
                  value={warningData.message}
                  onChange={(e) => setWarningData(prev => ({ ...prev, message: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" onClick={() => setShowWarningModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'var(--danger)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Send size={14} /> Send Official Warning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 4: ASSIGN PERFORMANCE REVIEW MEETING */}
      {showMeetingModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarCheck className="text-[#3b82f6]" size={20} /> Schedule Staff Audit Meeting
              </h3>
              <button onClick={() => setShowMeetingModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={dispatchMeeting} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Faculty Invitee
                </label>
                <input 
                  type="text" disabled
                  value={meetingData.staffName}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Meeting Date
                  </label>
                  <input 
                    type="date" required
                    value={meetingData.date}
                    onChange={(e) => setMeetingData(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Time Slot
                  </label>
                  <input 
                    type="time" required
                    value={meetingData.time}
                    onChange={(e) => setMeetingData(prev => ({ ...prev, time: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Venue / Virtual Link
                </label>
                <input 
                  type="text" required
                  value={meetingData.venue}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, venue: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Agenda Notes
                </label>
                <textarea 
                  rows="3" required
                  value={meetingData.agenda}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, agenda: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" onClick={() => setShowMeetingModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Schedule Review Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 5: ROLE CLEARANCE SECURITY BOUNDS WARNING */}
      {showRestrictionModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '460px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--danger)', transition: 'none' }}>
            <ShieldAlert size={48} className="text-[#ef4444]" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Clearance Violation (Access Denied)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You attempted to: <strong style={{ color: 'var(--text-main)' }}>{restrictedAction}</strong>.<br />
              Principal administrative clearances are restricted to faculty auditing, workload mapping, and feedback reviews. Database management, credentials modification, or system-wide admin user deletions must be completed via Super Admin console.
            </p>

            <button 
              onClick={() => setShowRestrictionModal(false)} 
              className="btn-primary"
              style={{ background: 'var(--danger)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Acknowledge Boundaries
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
