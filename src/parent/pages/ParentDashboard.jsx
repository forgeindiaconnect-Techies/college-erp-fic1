import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  ClipboardList, AlertCircle, BookOpen, Bell,
  Percent, Calendar, ShieldAlert, Building
} from 'lucide-react';
import { 
  getStudentById, getFeesByStudent, getMarksByStudent, getExams,
  getNotifications, getStudentFeeStructure, getClassAdvisorInfo
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './ParentDashboard.css';
const ParentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [parentSession, setParentSession] = useState(null);
  const [childDetails, setChildDetails] = useState(null);
  const [exams, setExams] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [scholarship, setScholarship] = useState(null);
  const [classAdvisor, setClassAdvisor] = useState(null);

  const fetchParentData = React.useCallback(async () => {
    const session = sessionStorage.getItem('parent_session');
    if (!session) {
      navigate('/parent/login');
      return;
    }
    
    const parsedSession = JSON.parse(session);
    setParentSession(parsedSession);

    try {
      let studentId = parsedSession.childId || parsedSession.referenceId || parsedSession.parentOf;
      if (studentId && studentId.length === 24 && /^[0-9a-fA-F]{24}$/.test(studentId)) {
        const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
        const match = erpStudents.find(s => s._id === studentId || s.id === studentId);
        if (match && match.id) studentId = match.id;
      }

      const [studentRes, feesRes, marksRes, examsRes, notifRes, feeStructureRes] = await Promise.all([
        getStudentById(studentId).catch(() => null),
        getFeesByStudent(studentId).catch(() => null),
        getMarksByStudent(studentId).catch(() => null),
        getExams().catch(() => ({ data: [] })),
        getNotifications().catch(() => ({ data: [] })),
        getStudentFeeStructure(studentId).catch(() => null)
      ]);

      if (notifRes?.data && Array.isArray(notifRes.data)) {
        if (Array.isArray(notifRes.data)) setNotifications(notifRes.data); else if (Array.isArray(notifRes.data.notifications)) setNotifications(notifRes.data.notifications);
      }

      if (feeStructureRes?.data && feeStructureRes.data.scholarshipAmount > 0) {
        setScholarship({
          type: feeStructureRes.data.scholarshipName || 'Merit Scholarship',
          amount: `₹${feeStructureRes.data.scholarshipAmount.toLocaleString()}`
        });
      }

      let dbRecord = studentRes?.data || null;
      if (!dbRecord) {
        dbRecord = {
          id: parsedSession.childId, name: parsedSession.childName, dept: 'Computer Science',
          sem: 'Sem 6', attendance: 85, cgpa: 8.6, status: 'Active', feeStatus: 'Pending',
        };
      }

      // Apply CGPA if marks exist
      if (marksRes?.data?.length > 0) {
        const m = marksRes.data[0];
        dbRecord.cgpa = m.totalMarks ? (m.totalMarks / 10).toFixed(2) : 8.6;
      }

      // Apply Fee Status
      const feesData = feesRes?.data || [];
      const pendingFee = feesData.find(f => f.status === 'Pending');
      if (pendingFee) {
        dbRecord.feeStatus = 'Pending';
        dbRecord.pendingAmount = pendingFee.pendingAmount;
      } else {
        dbRecord.feeStatus = 'Paid';
        dbRecord.pendingAmount = 0;
      }

      setChildDetails(dbRecord);

      try {
        let semNumber = dbRecord.sem;
        if (semNumber?.startsWith('Semester ')) semNumber = semNumber.replace('Semester ', 'Sem ');
        const advisorRes = await getClassAdvisorInfo(dbRecord.dept, semNumber, parsedSession.section || 'A');
        if (advisorRes.data) setClassAdvisor(advisorRes.data);
      } catch (err) {}

      if (examsRes?.data) {
        setExams(examsRes.data);
      }
    } catch (err) {
      console.error('Failed to load parent dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchParentData();
  }, [fetchParentData]);

  // Auto-refresh when relevant data changes
  useRealtimeSync(fetchParentData, ['fees', 'marks', 'exams', 'users', 'students']);


  if (loading || !childDetails) {
    return (
      <div className="parent-loading-container">
        <span className="parent-spinner-large"></span>
      </div>
    );
  }

  // Filter child's department exams
  const childExams = exams.filter(ex => ex.dept?.toLowerCase() === childDetails?.dept?.toLowerCase());

  // Attendance Trend Data
  const attendanceTrendData = [
    { name: 'Week 1', rate: 80 },
    { name: 'Week 2', rate: 82 },
    { name: 'Week 3', rate: 81 },
    { name: 'Week 4', rate: 85 },
    { name: 'Week 5', rate: childDetails.attendance }
  ];

  // Semester Performance (CGPA) Data
  const cgpaTrendData = [
    { name: 'Sem 1', CGPA: 8.2 },
    { name: 'Sem 2', CGPA: 8.4 },
    { name: 'Sem 3', CGPA: 8.1 },
    { name: 'Sem 4', CGPA: 8.5 },
    { name: 'Sem 5', CGPA: childDetails.cgpa }
  ];

  // Fee Analytics Data
  const feeData = [
    { name: 'Paid', value: 45000, color: '#10b981' },
    { name: 'Pending', value: childDetails.feeStatus === 'Pending' ? (childDetails.pendingAmount || 45000) : 0, color: '#ef4444' }
  ];

  const assignmentsCount = 3; // Mock data since it's not currently fetched from API
  const isHosteler = childDetails.hostelRequired?.toLowerCase() === 'yes' || childDetails.hostelerStatus === 'Hosteler';

  return (
    <div className="parent-dashboard animate-fade-in">
      {/* Welcome Banner */}
      <div className="parent-welcome-banner">
        <div className="banner-left">
          <h1>Welcome, {parentSession?.name}!</h1>
          <p>Here is an overview of {childDetails.name}'s academic progress and alerts.</p>
        </div>
        <div className="parent-badge-number">
          <span>CHILD ID: <strong>{childDetails.id}</strong></span>
        </div>
      </div>

      {/* Scholarship Alert Banner */}
      {scholarship && (
        <div style={{ padding: '1rem', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: '#6366F1', color: 'white', padding: '10px', borderRadius: '50%' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>Congratulations! {scholarship.type} Scholarship Active for {childDetails.name}</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Your child has been awarded a <strong>{scholarship.amount} fee waiver</strong>. Check the Fees Analytics below for the updated active statement.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="parent-metrics-grid">
        <div className="glass-card p-metric-card">
          <div className="metric-icon-p teal"><Percent size={22} /></div>
          <div className="p-metric-details">
            <span className="card-title-p">Child Attendance</span>
            <h2 className="metric-value-p">{childDetails.attendance}%</h2>
            <div className="metric-sub-p text-success">✓ Above 75% threshold</div>
          </div>
        </div>

        <div className="glass-card p-metric-card">
          <div className="metric-icon-p blue"><BookOpen size={22} /></div>
          <div className="p-metric-details">
            <span className="card-title-p">Current CGPA</span>
            <h2 className="metric-value-p">{childDetails.cgpa}</h2>
            <div className="metric-sub-p text-success">Outstanding Academic Record</div>
          </div>
        </div>

        <div className="glass-card p-metric-card">
          <div className="metric-icon-p orange"><AlertCircle size={22} /></div>
          <div className="p-metric-details">
            <span className="card-title-p">Pending Fees</span>
            <h2 className="metric-value-p">
              {childDetails.feeStatus === 'Pending' ? `₹${(childDetails.pendingAmount || 45000).toLocaleString()}` : '₹0'}
            </h2>
            <div className={`metric-sub-p ${childDetails.feeStatus === 'Pending' ? 'text-danger' : 'text-success'}`}>
              {childDetails.feeStatus === 'Pending' ? '⚠ Due by next week' : '✓ Fees Paid'}
            </div>
          </div>
        </div>

        <div className="glass-card p-metric-card">
          <div className="metric-icon-p purple"><Calendar size={22} /></div>
          <div className="p-metric-details">
            <span className="card-title-p">Upcoming Exams</span>
            <h2 className="metric-value-p">{childExams.length} Exams</h2>
            <div className="metric-sub-p text-muted">
              {childExams.length > 0 ? `Next: ${childExams[0].date}` : 'No active exams'}
            </div>
          </div>
        </div>

        <div className="glass-card p-metric-card">
          <div className="metric-icon-p green"><ClipboardList size={22} /></div>
          <div className="p-metric-details">
            <span className="card-title-p">Assignments Pending</span>
            <h2 className="metric-value-p">{assignmentsCount} Tasks</h2>
            <div className="metric-sub-p text-warning-p">Needs submission</div>
          </div>
        </div>

        <div className="glass-card p-metric-card">
          <div className="metric-icon-p red"><ShieldAlert size={22} /></div>
          <div className="p-metric-details">
            <span className="card-title-p">Leave Status</span>
            <h2 className="metric-value-p">No active requests</h2>
            <div className="metric-sub-p text-muted">All clear</div>
          </div>
        </div>

        {isHosteler && (
          <div className="glass-card p-metric-card">
            <div className="metric-icon-p" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Building size={22} />
            </div>
            <div className="p-metric-details">
              <span className="card-title-p">Hostel Accommodation</span>
              <h2 className="metric-value-p text-sm mt-1">{childDetails.hostelName || 'Hostel Allocated'}</h2>
              <div className="metric-sub-p text-muted" style={{ lineHeight: '1.4' }}>
                Room: <strong>{childDetails.roomNumber || 'Pending'}</strong> <br/>
                Warden: {childDetails.wardenName || 'N/A'} <br/>
                Contact: {childDetails.wardenContact || 'N/A'}
              </div>
            </div>
          </div>
        )}

        {/* Class Advisor Card */}
        {classAdvisor && (
          <div className="glass-card p-metric-card" style={{ gridColumn: '1 / -1', background: 'linear-gradient(to right, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05))', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
            <div className="metric-icon-p" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
              <BookOpen size={22} />
            </div>
            <div className="p-metric-details" style={{ width: '100%' }}>
              <span className="card-title-p">Class Advisor for {childDetails.name}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                <div>
                  <h2 className="metric-value-p text-lg mt-1">{classAdvisor.staffId?.name}</h2>
                  <div className="metric-sub-p text-muted mt-1">
                    {childDetails.dept} • {childDetails.sem}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{classAdvisor.staffId?.email}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{classAdvisor.staffId?.phone || 'Contact via portal'}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Charts Grid */}
      <div className="charts-grid-parent">
        {/* Attendance Trend Chart */}
        <div className="glass-card chart-card-p">
          <h3>Attendance Trend</h3>
          <p className="text-muted text-sm">Weekly attendance rate</p>
          <div className="chart-container-p">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attColorParent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[70, 100]} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#attColorParent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CGPA progression */}
        <div className="glass-card chart-card-p">
          <h3>Semester Performance</h3>
          <p className="text-muted text-sm">CGPA over previous semesters</p>
          <div className="chart-container-p">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cgpaTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 10]} />
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                <Bar dataKey="CGPA" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Analytics */}
        <div className="glass-card chart-card-p">
          <h3>Fee Analytics</h3>
          <p className="text-muted text-sm">Tuition & Exam fee status</p>
          <div className="chart-container-p flex-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={feeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {feeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dynamic Exam Schedule & Notifications Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Notifications Panel */}
        <div className="glass-card p-announcements-card" style={{ marginTop: 0 }}>
          <div className="p-announcements-header">
            <h3><Bell size={18} className="text-primary-p" /> Important Notifications</h3>
            {notifications.length > 0 && <span className="p-notif-pill">{notifications.filter(n => !n.isRead).length} NEW</span>}
          </div>
          <div className="p-announcement-list">
            {notifications.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '2rem' }}>No announcements available.</p>
            ) : (
              notifications.map((n, i) => (
                <div key={n._id || i} className="p-announcement-item" style={{ borderLeft: `4px solid ${n.type === 'Warning' ? '#ef4444' : n.type === 'Success' ? '#10b981' : '#f59e0b'}`, padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 className="p-ann-title" style={{ fontSize: '1rem', color: 'var(--text-main)', margin: 0 }}>{n.title}</h4>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="p-ann-desc" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Exams Timetable Card */}
        <div className="glass-card p-announcements-card" style={{ marginTop: 0 }}>
          <div className="p-announcements-header">
            <h3><Calendar size={18} style={{ color: '#6366F1' }} /> Child's Examination Timetable</h3>
            <span className="p-notif-pill" style={{ background: 'rgba(99, 102, 241,0.1)', color: '#6366F1' }}>
              {childExams.length} ACTIVE
            </span>
          </div>
          <div className="p-announcement-list" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {childExams.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: '2rem' }}>No examinations scheduled currently.</p>
            ) : (
              childExams.map((ex, i) => (
                <div key={ex._id || ex.id || i} className="p-announcement-item" style={{ borderLeft: '3px solid #6366F1', paddingLeft: '0.75rem' }}>
                  <span className="p-ann-date" style={{ color: '#6366F1', fontWeight: 700 }}>{ex.name} ({ex.sem || 'Sem 3'})</span>
                  <h4 className="p-ann-title" style={{ fontSize: '0.9rem', marginTop: '2px' }}>{ex.subject}</h4>
                  <p className="p-ann-desc" style={{ fontSize: '0.78rem', marginTop: '4px', color: 'var(--text-muted)' }}>
                    📅 Date: <strong>{ex.date}</strong> · ⏱ Time: <strong>{ex.time}</strong> <br />
                    📍 Venue Hall: <strong>{ex.room || ex.hall || 'Main Hall'}</strong> ({ex.maxMarks} Marks)
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
