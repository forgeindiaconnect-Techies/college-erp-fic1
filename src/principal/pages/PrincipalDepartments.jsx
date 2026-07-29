import React, { useState } from 'react';
import { 
  Building2, Users, GraduationCap, UserCheck, 
  Percent, FileText, CheckCircle, Briefcase, 
  ChevronRight, ArrowLeft, Download, ShieldAlert, 
  Clock, Calendar, AlertTriangle, Send, XCircle, Search, Award
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from 'recharts';
import '../../pages/Dashboard.css';

import { getDepartments } from '../../api/index';

export default function PrincipalDepartments() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, analytics, approvals, reports, permissions, detail
  const [selectedDept, setSelectedDept] = useState('');
  
  const [departmentsData, setDepartmentsData] = useState({});
  const [analyticsChartData, setAnalyticsChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await getDepartments();
        const depts = res.data || [];
        
        const newData = {};
        const newAnalytics = [];

        const deptCodes = {
          'Computer Science Engineering': 'CSE',
          'Information Technology': 'IT',
          'Electronics & Communication Engineering': 'ECE',
          'Electrical & Electronics Engineering': 'EEE',
          'Mechanical Engineering': 'MECH',
          'Civil Engineering': 'CIVIL',
          'Artificial Intelligence & Data Science': 'AIDS',
          'Artificial Intelligence & Machine Learning': 'AIML',
          'Cyber Security': 'CYBER',
          'Biomedical Engineering': 'BME',
          'Aeronautical Engineering': 'AERO',
          'Automobile Engineering': 'AUTO',
          'Robotics Engineering': 'ROBOTICS',
          'Chemical Engineering': 'CHEM',
          'Biotechnology Engineering': 'BIOTECH'
        };

        depts.forEach((d, idx) => {
          const code = d.code || deptCodes[d.name] || d.name.substring(0, 4).toUpperCase();
          const pseudoRand = d.name.length + idx;
          const mockStudents = d.students || (pseudoRand * 15 + 120);
          const mockAttendance = d.attendance || (85 + (pseudoRand % 12));
          const mockPassRate = d.passRate || (80 + (pseudoRand % 15));
          const mockStaffCount = Math.floor(mockStudents / 15);
          const mockHod = d.headOfDepartment || d.hod || `Dr. ${d.name.substring(0, 1).toUpperCase()}${d.name.substring(1, 4).toLowerCase()} Sharma`;
          const mockPlacement = 75 + (pseudoRand % 20);
          const mockStaffScore = 80 + (pseudoRand % 18);

          newData[code] = {
            code: code,
            name: d.name,
            hodName: mockHod,
            studentsCount: mockStudents,
            attendanceRate: mockAttendance,
            passRate: mockPassRate,
            staffCount: mockStaffCount,
            placementRate: mockPlacement,
            topStudents: [],
            lowAttendance: [],
            performanceTrend: [
              { term: 'Sem 1', gpa: 7.5 + (pseudoRand % 2) },
              { term: 'Sem 2', gpa: 7.8 + (pseudoRand % 2) },
              { term: 'Sem 3', gpa: 8.0 + (pseudoRand % 2) }
            ]
          };
          newAnalytics.push({
            name: code,
            Attendance: mockAttendance,
            PassRate: mockPassRate,
            Placements: mockPlacement,
            StaffScore: mockStaffScore
          });
        });

        setDepartmentsData(newData);
        setAnalyticsChartData(newAnalytics);
        if (depts.length > 0) {
          const firstCode = depts[0].code || depts[0].name.substring(0, 4).toUpperCase();
          setSelectedDept(firstCode);
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDepts();
  }, []);
  
  // Dynamic approvals lists stored in local React state
  const [approvals, setApprovals] = useState([]);

  // Form states for report exporting
  const [reportType, setReportType] = useState('Overview');
  const [reportDept, setReportDept] = useState('All');
  const [reportFormat, setReportFormat] = useState('PDF');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState('');

  // Restricted Access Shield Alert (Step 6)
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [attemptedAction, setAttemptedAction] = useState('');

  const handleActionClick = (actionName) => {
    setAttemptedAction(actionName);
    setShowRestrictionDialog(true);
  };

  const handleApprove = (id) => {
    setApprovals(prev => prev.map(app => app.id === id ? { ...app, status: 'Approved' } : app));
  };

  const handleReject = (id) => {
    setApprovals(prev => prev.map(app => app.id === id ? { ...app, status: 'Rejected' } : app));
  };

  const handleGenerateReport = (e) => {
    e.preventDefault();
    setIsExporting(true);
    setExportSuccess(false);

    setTimeout(() => {
      setIsExporting(false);
      setExportSuccess(true);
      setDownloadFileName(`${reportDept}_Department_${reportType}_Report.${reportFormat.toLowerCase()}`);
      
      // Auto dismiss success toast
      setTimeout(() => {
        setExportSuccess(false);
      }, 5000);
    }, 1500);
  };

  if (isLoading) {
    return <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h2>Loading Departments...</h2></div>;
  }

  return (
    <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 style={{ color: '#3730A5' }} size={28} /> Department Monitoring Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Review, evaluate, and coordinate operations across all institutional divisions.
          </p>
        </div>
        
        {/* Permission Profile Tag */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5' }}>
          <ShieldAlert size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>User Permission Profile</span>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>Principal (Executive Oversight)</strong>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex mb-6 flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('overview')} 
          className={`btn-primary ${activeTab === 'overview' || activeTab === 'detail' ? '' : 'btn-ghost'}`}
          style={{ background: activeTab === 'overview' || activeTab === 'detail' ? '#3730A5' : 'transparent', color: activeTab === 'overview' || activeTab === 'detail' ? '#fff' : 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', fontSize: '0.88rem', fontWeight: 600 }}
        >
          📁 Departments Grid
        </button>
        <button 
          onClick={() => setActiveTab('analytics')} 
          className={`btn-primary ${activeTab === 'analytics' ? '' : 'btn-ghost'}`}
          style={{ background: activeTab === 'analytics' ? '#3730A5' : 'transparent', color: activeTab === 'analytics' ? '#fff' : 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', fontSize: '0.88rem', fontWeight: 600 }}
        >
          📊 Academic Analytics
        </button>
        <button 
          onClick={() => { setActiveTab('approvals'); }} 
          className={`btn-primary ${activeTab === 'approvals' ? '' : 'btn-ghost'}`}
          style={{ background: activeTab === 'approvals' ? '#3730A5' : 'transparent', color: activeTab === 'approvals' ? '#fff' : 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', fontSize: '0.88rem', fontWeight: 600, position: 'relative' }}
        >
          🔔 Approvals System
          {approvals.filter(a => a.status === 'Pending').length > 0 && (
            <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
              {approvals.filter(a => a.status === 'Pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('reports')} 
          className={`btn-primary ${activeTab === 'reports' ? '' : 'btn-ghost'}`}
          style={{ background: activeTab === 'reports' ? '#3730A5' : 'transparent', color: activeTab === 'reports' ? '#fff' : 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', fontSize: '0.88rem', fontWeight: 600 }}
        >
          📥 Reports Exporter
        </button>
        <button 
          onClick={() => setActiveTab('permissions')} 
          className={`btn-primary ${activeTab === 'permissions' ? '' : 'btn-ghost'}`}
          style={{ background: activeTab === 'permissions' ? '#3730A5' : 'transparent', color: activeTab === 'permissions' ? '#fff' : 'var(--text-muted)', borderRadius: '8px', padding: '0.6rem 1.2rem', fontSize: '0.88rem', fontWeight: 600 }}
        >
          🛡️ Permissions Shield
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. OVERVIEW GRID (Step 1) */}
      {activeTab === 'overview' && (
        <>
          {Object.keys(departmentsData).length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', borderRadius: '16px' }}>
              <Building2 size={48} className="text-muted" style={{ margin: '0 auto 1rem' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>No Departments Configured</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Please ask the Admin to configure departments in the Admin Dashboard.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {Object.keys(departmentsData).map((key) => {
                const dept = departmentsData[key];
                return (
                  <div 
                    key={key} 
                    className="glass-card animate-fade-in" 
                    style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}
                  >
                    {/* Visual Accent Corner */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '4px', height: '100%', background: '#3730A5' }}></div>
                    
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="dept-code-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                          {dept.code}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Active Oversight
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>{dept.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
                        HOD: <strong style={{ color: 'var(--text-main)' }}>{dept.hodName}</strong>
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
                        <div style={{ background: 'var(--bg-primary)', padding: '0.6rem', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Students</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{dept.studentsCount.toLocaleString()}</strong>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', padding: '0.6rem', borderRadius: '10px' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Staff Count</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{dept.staffCount}</strong>
                        </div>
                      </div>

                      {/* Metrics Progress Rings/Bars */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                        <div>
                          <div className="flex justify-between" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><UserCheck size={14} /> Attendance</span>
                            <strong style={{ color: 'var(--text-main)' }}>{dept.attendanceRate}%</strong>
                          </div>
                          <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${dept.attendanceRate}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px' }}></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between" style={{ fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Percent size={14} /> Pass Percentage</span>
                            <strong style={{ color: 'var(--text-main)' }}>{dept.passRate}%</strong>
                          </div>
                          <div style={{ height: '6px', background: 'var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${dept.passRate}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => { setSelectedDept(dept.code); setActiveTab('detail'); }} 
                      className="btn-primary w-full hover-scale"
                      style={{ background: '#3730A5', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.2rem', padding: '0.65rem 0.5rem', borderRadius: '8px', fontSize: '0.85rem' }}
                    >
                      View {dept.code} Analytics <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 2. DETAIL VIEW (Step 2) */}
      {activeTab === 'detail' && (
        <div className="animate-fade-in">
          {/* Back Button */}
          

          {/* Department Selector Header */}
          <div className="glass-card mb-6" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderRadius: '16px' }}>
            <div>
              <span className="dept-code-badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}>
                {selectedDept} Division
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.3rem' }}>
                {departmentsData[selectedDept].name} Analytics
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                HOD In-Charge: <strong style={{ color: 'var(--text-main)' }}>{departmentsData[selectedDept].hodName}</strong>
              </p>
            </div>

            {/* Dropdown to switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>Monitor Another Division:</span>
              <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', fontWeight: 600 }}
              >
                {Object.keys(departmentsData).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Core Analytics Cards Grid */}
          <div className="stats-grid mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="stat-card">
              <div className="stat-icon-wrapper bg-gradient-blue text-white" style={{ background: 'var(--primary)' }}><Users size={20} /></div>
              <div className="stat-details">
                <h3>Student Strength</h3>
                <p className="stat-value">{departmentsData[selectedDept].studentsCount}</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered Students</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><GraduationCap size={20} /></div>
              <div className="stat-details">
                <h3>Staff Performance</h3>
                <p className="stat-value">9.2 / 10</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Peer & Student Review Score</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><UserCheck size={20} /></div>
              <div className="stat-details">
                <h3>Attendance Analytics</h3>
                <p className="stat-value">{departmentsData[selectedDept].attendanceRate}%</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Average Month Attendance</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper text-white" style={{ background: 'var(--primary)' }}><Percent size={20} /></div>
              <div className="stat-details">
                <h3>Exam Results</h3>
                <p className="stat-value">{departmentsData[selectedDept].passRate}%</p>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sem Pass Percentage</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Top Students Table */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minWidth: 0, overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award className="text-[#f59e0b]" size={20} /> Top Performers (Top Students)
              </h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student Name</th>
                      <th>GPA</th>
                      <th>Placement Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentsData[selectedDept].topStudents.map((stud, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stud.roll}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stud.name}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>{stud.gpa}</td>
                        <td>
                          <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {stud.placement}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low Attendance Alert Table */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minWidth: 0, overflowX: 'auto' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle className="text-[#ef4444]" size={20} /> Low Attendance Students
              </h3>
              {departmentsData[selectedDept].lowAttendance.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        <th>Attendance</th>
                        <th>Warning Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentsData[selectedDept].lowAttendance.map((stud, idx) => (
                        <tr key={idx}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{stud.roll}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{stud.name}</td>
                          <td style={{ color: stud.attendance < 70 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>
                            {stud.attendance}%
                          </td>
                          <td>
                            <span style={{ 
                              backgroundColor: stud.status === 'Critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                              color: stud.status === 'Critical' ? '#ef4444' : '#f59e0b', 
                              padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 
                            }}>
                              {stud.status}
                            </span>
                          </td>
                          <td>
                            <button 
                              onClick={() => handleActionClick(`Send Auto Attendance Warning to ${stud.name} (Parent notify)`)}
                              className="btn-primary" 
                              style={{ padding: '3px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Notify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                  <CheckCircle size={36} className="text-[#10b981]" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>All students satisfy the 75% attendance criteria.</p>
                </div>
              )}
            </div>
          </div>

          {/* Department-wise 6-sem GPA progression chart */}
          <div className="glass-card mb-6" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
              🔬 Average Academic Grade Progression Trend (GPA over Semesters)
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={departmentsData[selectedDept].performanceTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="term" stroke="var(--text-muted)" />
                  <YAxis domain={[6, 10]} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                  <Area type="monotone" dataKey="gpa" name="Average GPA" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 3. ANALYTICS Tab (Step 3) */}
      {activeTab === 'analytics' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* Chart 1: Department-wise Attendance */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
              📊 Department-wise Student Attendance Comparison (%)
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={analyticsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis domain={[70, 100]} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                  <Legend />
                  <Bar dataKey="Attendance" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {analyticsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : '#ec4899'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Pass Percentage */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
              📈 Semester Examination Pass Percentage Trend
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={analyticsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis domain={[60, 100]} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="PassRate" name="Pass Rate (%)" stroke="#10b981" fillOpacity={1} fill="url(#colorPass)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Placement Statistics */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
              💼 Dynamic Departmental Placement Statistics (%)
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <ComposedChart data={analyticsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis domain={[50, 100]} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                  <Legend />
                  <Bar dataKey="Placements" name="Placement Rate" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="Placements" stroke="#ec4899" strokeWidth={3} dot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Staff Performance */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
              👩‍🏫 Faculty & Staff Peer Evaluation Indexes
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={analyticsChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" />
                  <YAxis domain={[50, 100]} stroke="var(--text-muted)" />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                  <Legend />
                  <Bar dataKey="StaffScore" name="Faculty Quality Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* 4. APPROVALS SYSTEM (Step 4) */}
      {activeTab === 'approvals' && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              🔔 Centralized Institutional Approvals Inbox
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Pending Action: <strong style={{ color: 'var(--danger)' }}>{approvals.filter(a => a.status === 'Pending').length} requests</strong>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {approvals.map((req) => (
              <div 
                key={req.id} 
                className="glass-card animate-fade-in" 
                style={{ 
                  padding: '1.2rem', 
                  borderRadius: '12px', 
                  borderLeft: `4px solid ${req.status === 'Pending' ? 'var(--warning)' : req.status === 'Approved' ? 'var(--success)' : 'var(--danger)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ 
                      backgroundColor: req.type === 'Leave Request' ? 'rgba(59, 130, 246, 0.1)' : req.type === 'Department Event' ? 'rgba(79, 70, 229, 0.1)' : req.type === 'Special Announcement' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: req.type === 'Leave Request' ? '#3b82f6' : req.type === 'Department Event' ? '#4F46E5' : req.type === 'Special Announcement' ? '#f59e0b' : '#10b981',
                      padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                    }}>
                      {req.type}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Requester: <strong style={{ color: 'var(--text-main)' }}>{req.requester}</strong> ({req.department})
                    </span>
                  </div>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', fontWeight: 500 }}>{req.description}</p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem' }}>Submitted: {req.date}</span>
                </div>

                {/* Interactive Status & Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {req.status === 'Pending' ? (
                    <>
                      <button 
                        onClick={() => handleApprove(req.id)}
                        className="btn-primary" 
                        style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--success)' }}
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleReject(req.id)}
                        className="btn-primary" 
                        style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', background: 'var(--danger)' }}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span style={{ 
                      color: req.status === 'Approved' ? '#10b981' : '#ef4444', 
                      fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' 
                    }}>
                      {req.status === 'Approved' ? <CheckCircle size={16} /> : <XCircle size={16} />} {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. REPORTS SECTION (Step 5) */}
      {activeTab === 'reports' && (
        <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '650px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText className="text-[var(--primary)]" size={24} /> Academic Reports Downloader
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Generate and export custom performance sheets across all departments.
          </p>

          <form onSubmit={handleGenerateReport} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Select Report Subject
              </label>
              <select 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
              >
                <option value="Overview">Department Overview Report</option>
                <option value="Attendance">Attendance Reports</option>
                <option value="Performance">Performance Reports</option>
                <option value="Placement">Placement Reports</option>
                <option value="Fees">Fee Reports</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Target Department
                </label>
                <select 
                  value={reportDept} 
                  onChange={(e) => setReportDept(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                >
                  <option value="All">All Departments</option>
                  {Object.keys(departmentsData).map(key => (
                    <option key={key} value={key}>{key} Department</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Export Document Format
                </label>
                <select 
                  value={reportFormat} 
                  onChange={(e) => setReportFormat(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                >
                  <option value="PDF">Portable Document Format (.pdf)</option>
                  <option value="CSV">Comma Separated Values (.csv)</option>
                  <option value="XLSX">Excel Spreadsheet (.xlsx)</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isExporting}
              className="btn-primary w-full"
              style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.5rem' }}
            >
              {isExporting ? (
                <>⏳ Generating and packaging report...</>
              ) : (
                <><Download size={18} /> Compile & Download Report</>
              )}
            </button>
          </form>

          {/* Success Toast Notice */}
          {exportSuccess && (
            <div className="glass-card animate-fade-in" style={{ marginTop: '1.5rem', padding: '1rem', borderLeft: '4px solid var(--success)', display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(16, 185, 129, 0.08)' }}>
              <CheckCircle className="text-[#10b981]" size={24} />
              <div>
                <strong style={{ color: 'var(--text-main)', display: 'block', fontSize: '0.88rem' }}>Report Generated Successfully!</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  File download initiated: <strong style={{ color: 'var(--text-main)' }}>{downloadFileName}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. PERMISSIONS & SHIELD GUARD (Step 6) */}
      {activeTab === 'permissions' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          
          {/* Active Principal Authorizations */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle className="text-[#10b981]" size={20} /> Permitted Institutional Oversight
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '1.2rem', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              <li><strong>Academic Analytics Monitoring</strong>: Full read/write oversight across all 6 departments and statistical indices.</li>
              <li><strong>Approvals & Event Scheduling</strong>: Authorize leaves, student schedules, announcements, and events.</li>
              <li><strong>Export Performance Reports</strong>: Compile and export files on attendance, pass rates, placements, and financial collections.</li>
              <li><strong>Staff Performance Evaluation</strong>: Evaluate peer-review indexes and review department heads.</li>
            </ul>
          </div>

          {/* Access Shield Mock Restricted Operations */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle className="text-[#ef4444]" size={20} /> Restricted Administrative Actions
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              The following actions violate Principal clearance parameters. Clicking any will trigger the institutional security filter:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <button 
                onClick={() => handleActionClick('Delete Registered System User accounts')}
                className="glass-card w-full"
                style={{ padding: '0.8rem', borderRadius: '10px', textAlign: 'left', borderLeft: '3px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>❌ Delete System Users</span>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => handleActionClick('Change Institutional Security & Firewall Settings')}
                className="glass-card w-full"
                style={{ padding: '0.8rem', borderRadius: '10px', textAlign: 'left', borderLeft: '3px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>🛡️ Change Security & Role Access Levels</span>
                <ChevronRight size={16} />
              </button>

              <button 
                onClick={() => handleActionClick('Mutate, Alter, or Purge Database Servers')}
                className="glass-card w-full"
                style={{ padding: '0.8rem', borderRadius: '10px', textAlign: 'left', borderLeft: '3px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)' }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>💾 Manage Database / Server Configurations</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Restriction Glass Dialog Modal (Step 6 Protection) */}
      {showRestrictionDialog && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '480px', margin: '0 1rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--danger)' }}>
            <ShieldAlert size={48} className="text-[#ef4444]" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Access Denied (Clearance Violation)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You attempted to: <strong style={{ color: 'var(--text-main)' }}>{attemptedAction}</strong>.<br />
              Principal permissions do not include direct system architecture mutations. IT Server Administrator clearance is required.
            </p>

            <button 
              onClick={() => setShowRestrictionDialog(false)} 
              className="btn-primary"
              style={{ background: 'var(--danger)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
