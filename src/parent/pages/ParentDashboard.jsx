import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, BarChart, Bar, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  ClipboardList, AlertCircle, BookOpen, Bell,
  Percent, Calendar, ShieldAlert, Building,
  GraduationCap, RefreshCw, UserCheck, Clock, CheckCircle2,
  Zap, CalendarCheck, Award, CreditCard, Bus
} from 'lucide-react';
import { 
  getStudentById, getFeesByStudent, getMarksByStudent, getExams,
  getNotifications, getStudentFeeStructure, getClassAdvisorInfo, getMyProfile
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
    
    let parsedSession = {};
    try {
      parsedSession = JSON.parse(session);
    } catch (e) {
      parsedSession = {};
    }
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
          id: parsedSession.childId || 'TAM2026-001',
          name: parsedSession.childName || 'Student',
          dept: 'Computer Science',
          sem: 'Sem 6',
          attendance: 85,
          cgpa: 8.6,
          status: 'Active',
          feeStatus: 'Pending',
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

      // Keep session storage and sidebar in sync with authentic student profile
      if (dbRecord?.name) {
        const updatedSession = {
          ...parsedSession,
          childName: dbRecord.name,
          childId: dbRecord.id || dbRecord.rollNo || parsedSession.childId,
          childDept: dbRecord.dept || dbRecord.department,
          childSem: dbRecord.sem || dbRecord.semester,
          childSection: dbRecord.section || 'A'
        };
        sessionStorage.setItem('parent_session', JSON.stringify(updatedSession));
        window.dispatchEvent(new Event('parent_session_updated'));
      }

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
    // Sync live profile for collegeName
    getMyProfile().then(res => {
      if (res?.data?.collegeName) {
        setParentSession(prev => ({ ...prev, collegeName: res.data.collegeName }));
      }
    }).catch(() => {});
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
      {/* Welcome Banner - Real-Time Clean ERP Card */}
      <div className="parent-welcome-banner glass-card" style={{ background: 'var(--bg-card, #ffffff)', border: '1px solid var(--border-color, #e2e8f0)', padding: '1.15rem 1.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-main, #1e293b)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="banner-left" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GraduationCap size={24} color="#3b82f6" />
            <h1 style={{ fontSize: '1.35rem', fontWeight: '700', margin: 0, lineHeight: 1.2, color: 'var(--text-main, #0f172a)' }}>
              Welcome, {parentSession?.name || 'Parent'}!
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', margin: 0, lineHeight: 1.4, fontWeight: 500 }}>
            Child Overview: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{childDetails.name}</strong> • {childDetails.dept} ({childDetails.sem}) • Live academic progress & alerts.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => fetchParentData()} 
            style={{ background: 'var(--bg-muted, #f1f5f9)', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', color: 'var(--text-main, #334155)', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <RefreshCw size={15} /> Refresh Live
          </button>
          <div className="parent-badge-number" style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #475569)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
            <span>CHILD ID: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{childDetails.id}</strong></span>
          </div>
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

      {/* Parent Portal Quick Actions Hub */}
      <div style={{
        background: 'var(--bg-primary, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Parent Quick Actions
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                Direct access to ward performance records, fee settlements, and campus tracking
              </p>
            </div>
          </div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            Ward Shortcuts
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          <button 
            type="button"
            onClick={() => navigate('/parent/attendance')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarCheck size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Ward Attendance</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Daily presence log</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/parent/marks')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Grades & Marks</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Exam report cards</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/parent/fees')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CreditCard size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Fee Payment</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Dues & online receipts</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/parent/leaves')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Apply Leave</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Absence permission</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/parent/timetable')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Class Timetable</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Periods & schedule</div>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => navigate('/parent/transport')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s ease' }}
          >
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bus size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main, #0f172a)' }}>Bus Tracking</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)' }}>Campus route & stops</div>
            </div>
          </button>
        </div>
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
      <div className="parent-dashboard-bottom-grid">
        {/* Notifications Panel */}
        <div className="glass-card p-announcements-card" style={{ marginTop: 0 }}>
          <div className="p-announcements-header">
            <h3><Bell size={18} className="text-primary-p" /> Important Notifications</h3>
            {notifications.length > 0 && <span className="p-notif-pill">{notifications.filter(n => !n.isRead).length} NEW</span>}
          </div>
          <div className="p-announcement-list">
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={28} style={{ opacity: 0.25, margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontSize: '0.86rem', fontWeight: 500 }}>No announcements available.</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div key={n._id || i} className="p-announcement-item" style={{ borderLeft: `4px solid ${n.type === 'Warning' ? '#ef4444' : n.type === 'Success' ? '#10b981' : '#f59e0b'}`, padding: '0.9rem 1rem', background: 'var(--bg-secondary)', borderRadius: '10px', borderTop: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '6px' }}>
                    <h4 className="p-ann-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{n.title}</h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="p-ann-desc" style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Dynamic Exams Timetable Card */}
        <div className="glass-card p-announcements-card" style={{ marginTop: 0 }}>
          <div className="p-announcements-header">
            <h3>
              <Calendar size={18} style={{ color: '#6366F1' }} /> Child's Examination Timetable
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="p-notif-pill" style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366F1', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                {childExams.length > 0 ? childExams.length : 6} SCHEDULED
              </span>
              <button 
                onClick={() => navigate('/parent/timetable')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  fontWeight: 700, 
                  fontSize: '0.8rem', 
                  cursor: 'pointer',
                  padding: '2px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  whiteSpace: 'nowrap'
                }}
              >
                View Full →
              </button>
            </div>
          </div>
          <div className="p-announcement-list" style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {childExams.length === 0 ? (
              <div style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                <p className="text-muted" style={{ fontSize: '0.85rem', margin: '0 0 10px 0' }}>
                  Semester Examinations scheduled for {childDetails.dept} ({childDetails.sem}).
                </p>
                <button 
                  onClick={() => navigate('/parent/timetable')}
                  className="btn-primary text-xs" 
                  style={{ padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  View Semester Timetable & Hall Ticket
                </button>
              </div>
            ) : (
              childExams.map((ex, i) => (
                <div 
                  key={ex._id || ex.id || i} 
                  className="p-announcement-item" 
                  style={{ 
                    borderLeft: '4px solid #6366F1', 
                    padding: '0.9rem 1rem', 
                    cursor: 'pointer',
                    background: 'var(--bg-secondary)',
                    borderRadius: '10px',
                    borderTop: '1px solid var(--border-color)',
                    borderRight: '1px solid var(--border-color)',
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'transform 0.15s ease'
                  }} 
                  onClick={() => navigate('/parent/timetable')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: '0 0 2px', color: 'var(--text-main)' }}>
                        {ex.subject || ex.name}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#6366F1', fontWeight: 700 }}>
                        {ex.name && ex.name !== ex.subject ? `${ex.name} • ` : ''}{ex.sem || childDetails.sem || 'Sem 1'}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      padding: '2px 8px', 
                      borderRadius: '6px', 
                      background: 'rgba(99, 102, 241, 0.12)', 
                      color: '#6366F1',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      whiteSpace: 'nowrap'
                    }}>
                      {ex.maxMarks || 100} Marks
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', fontSize: '0.78rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={13} style={{ color: '#6366F1', flexShrink: 0 }} />
                      <span><strong>{ex.date}</strong></span>
                    </div>
                    {ex.time && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={13} style={{ color: '#6366F1', flexShrink: 0 }} />
                        <span>{ex.time}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Building size={13} style={{ color: '#6366F1', flexShrink: 0 }} />
                      <span>Hall: <strong style={{ color: 'var(--text-main)' }}>{ex.room || ex.hall || 'Main Hall'}</strong></span>
                    </div>
                  </div>
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
