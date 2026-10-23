import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, LogOut as ExitIcon, QrCode, Truck, Bus,
  AlertTriangle, Clock, ShieldCheck, MapPin, CheckCircle2,
  Package, Search, RefreshCw, ChevronRight, Phone, Car,
  Shield, GraduationCap, ScanLine, ArrowRight, ArrowLeft,
  UserCheck, Briefcase, Eye, X, Check, Camera, Sparkles,
  Filter, ExternalLink, Printer, ArrowLeftRight, LogIn
} from 'lucide-react';
import {
  getWatchmanStats,
  getActiveVisitors,
  recordVisitorExit,
  getParcels,
  getWatchmanAttendance,
  getStudentTodayScans,
  recordStudentCheckout,
  getStaffMovements,
  recordStaffMovement,
  getStudentQrDirectory,
  lookupStudentQr,
  recordStudentCheckin,
  verifyVisitorPass,
  getPreRegisteredVisitors,
  admitPreRegisteredVisitor,
  getBusTrackingStats
} from '../../api/index';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import { SettingsContext } from '../../App';
import '../watchman.css';

const WatchmanDashboard = () => {
  const navigate = useNavigate();
  const { collegeSettings } = useContext(SettingsContext) || {};

  // Real-time KPI Stats
  const [stats, setStats] = useState({
    studentsInside: 0,
    todayTotalStudents: 0,
    todayCheckedOutStudents: 0,
    staffInside: 0,
    visitorsInside: 0,
    todayTotalVisitors: 0,
    expectedVisitors: 0,
    pendingApprovals: 0,
    vehiclesInside: 0,
    parcelsAtGate: 0,
    openIncidents: 0
  });

  // Main Live Data Lists (Separated by Role)
  const [studentsList, setStudentsList] = useState([]);
  const [studentDirectory, setStudentDirectory] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [preRegisteredVisitors, setPreRegisteredVisitors] = useState([]);
  const [recentParcels, setRecentParcels] = useState([]);
  const [todaySession, setTodaySession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active View Switcher: 'students' | 'staff' | 'visitors' | 'parcels'
  const [activeViewTab, setActiveViewTab] = useState('students');
  const [studentSubTab, setStudentSubTab] = useState('inside'); // 'inside' | 'all'
  const [visitorSubTab, setVisitorSubTab] = useState('inside'); // 'inside' | 'all'
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // QR Pass Modal state (to view scannable student or visitor QR card)
  const [qrPassModal, setQrPassModal] = useState(null); // { type: 'student' | 'visitor', data: ... }

  // Quick Scanner / Gate Pass Lookup Modal
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  const [scanSearching, setScanSearching] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');
  const [scanSearchMode, setScanSearchMode] = useState('mobile'); // 'mobile' | 'qr'
  const [busStats, setBusStats] = useState({ totalRegistered: 0, insideCampus: 0, departedToday: 0, notArrivedToday: 0 });

  const getWatchmanSession = () => {
    try {
      return JSON.parse(sessionStorage.getItem('watchman_session') || '{}');
    } catch (e) {
      return {};
    }
  };
  const session = getWatchmanSession();
  const displayCollegeName = session?.collegeName || collegeSettings?.collegeName || 'Campus ERP Portal';
  const watchmanName = session?.name || 'Security Officer';
  const assignedGate = session?.assignedGate || 'Gate 1 (Main Entrance)';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Dashboard Data from Backend
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, activeRes, parcelsRes, attRes, studentsRes, staffRes, dirRes, preRegRes, busStatsRes] = await Promise.allSettled([
        getWatchmanStats(),
        getActiveVisitors(),
        getParcels({ status: 'Received at Gate' }),
        getWatchmanAttendance(),
        getStudentTodayScans(),
        getStaffMovements({ direction: 'In' }),
        getStudentQrDirectory(),
        getPreRegisteredVisitors(),
        getBusTrackingStats()
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setStats(statsRes.value.data.data);
      }
      if (busStatsRes.status === 'fulfilled' && busStatsRes.value?.data?.data) {
        setBusStats(busStatsRes.value.data.data);
      }
      if (activeRes.status === 'fulfilled' && activeRes.value?.data?.data) {
        setActiveVisitors(activeRes.value.data.data);
      }
      if (parcelsRes.status === 'fulfilled' && parcelsRes.value?.data?.data) {
        setRecentParcels(parcelsRes.value.data.data);
      }
      if (attRes.status === 'fulfilled' && attRes.value?.data?.todaySession) {
        setTodaySession(attRes.value.data.todaySession);
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value?.data?.data) {
        setStudentsList(studentsRes.value.data.data);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value?.data?.data) {
        setStaffList(staffRes.value.data.data);
      }
      if (dirRes.status === 'fulfilled' && dirRes.value?.data?.data) {
        setStudentDirectory(dirRes.value.data.data);
      }
      if (preRegRes.status === 'fulfilled' && preRegRes.value?.data?.data) {
        setPreRegisteredVisitors(preRegRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load watchman dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync(fetchDashboardData, ['watchman', 'student_tracking', 'visitor', 'parcel', 'vehicle', 'incident', 'employee-attendance', 'buses', 'bus_tracking']);

  useEffect(() => {
    fetchDashboardData();
    const pollTimer = setInterval(fetchDashboardData, 12000);
    return () => clearInterval(pollTimer);
  }, [fetchDashboardData]);

  // Handle Quick Student Check-in
  const handleQuickStudentCheckin = async (student) => {
    const sId = student.studentId || student.id;
    try {
      setActionLoadingId(student._id || sId);
      const res = await recordStudentCheckin({
        studentId: sId,
        gate: assignedGate,
        remarks: 'Gate Entry confirmed via Watchman Dashboard'
      });
      if (res.data?.success) {
        setScanSuccessMsg(`Check-in confirmed for ${student.name || student.studentName}!`);
        fetchDashboardData();
        if (qrPassModal?.open) setQrPassModal(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Student check-in failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Student Checkout from Dashboard
  const handleQuickStudentCheckout = async (student) => {
    const sId = student.studentId || student.id;
    if (!window.confirm(`Confirm gate exit for Student: ${student.studentName || student.name} (ID: ${sId}) at ${assignedGate}?`)) return;
    try {
      setActionLoadingId(student._id || sId);
      const res = await recordStudentCheckout({
        studentId: sId,
        gate: assignedGate,
        remarks: 'Direct gate exit recorded from Watchman Dashboard'
      });
      if (res.data?.success) {
        setScanSuccessMsg(`Checkout confirmed for ${student.studentName || student.name}!`);
        fetchDashboardData();
        if (qrPassModal?.open) setQrPassModal(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Student checkout failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Staff Exit from Dashboard
  const handleQuickStaffExit = async (staffItem) => {
    const name = staffItem.staffName || staffItem.name;
    const id = staffItem.staffId || staffItem.personId;
    if (!window.confirm(`Confirm campus exit for Staff: ${name} (${id}) at ${assignedGate}?`)) return;
    try {
      setActionLoadingId(staffItem._id);
      const res = await recordStaffMovement({
        personId: id,
        name: name,
        department: staffItem.department,
        designation: staffItem.designation || 'Staff',
        movementType: 'Out',
        reason: 'Shift Completion / Campus Departure',
        gate: assignedGate
      });
      if (res.data?.success) {
        fetchDashboardData();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Staff movement logging failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Visitor Checkout from Dashboard
  const handleQuickVisitorCheckout = async (visitor) => {
    if (!window.confirm(`Confirm checkout for Visitor: ${visitor.name} (Pass #${visitor.passNumber})?`)) return;
    try {
      setActionLoadingId(visitor._id);
      const res = await recordVisitorExit(visitor._id);
      if (res.data?.success) {
        setScanSuccessMsg(`Visitor ${visitor.name} marked as Checked Out!`);
        fetchDashboardData();
        if (qrPassModal?.open) setQrPassModal(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Visitor checkout failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Visitor Admit
  const handleQuickVisitorAdmit = async (visitor) => {
    try {
      setActionLoadingId(visitor._id);
      const res = await admitPreRegisteredVisitor(visitor._id, { gate: assignedGate });
      if (res.data?.success) {
        setScanSuccessMsg(`Visitor ${visitor.name} admitted successfully!`);
        fetchDashboardData();
        if (qrPassModal?.open) setQrPassModal(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Visitor admit failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Instant Gate Pass / Mobile Number / QR Code Lookup
  const handleSearchScan = async (queryVal) => {
    const q = (queryVal || scanQuery || '').trim();
    if (!q) {
      setScanError(scanSearchMode === 'mobile' ? 'Please enter a student mobile number' : 'Please scan a QR code or enter Student ID');
      return;
    }

    if (scanSearchMode === 'mobile') {
      const cleanDigits = q.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setScanError('Please enter a valid 10-digit registered mobile number.');
        return;
      }
    }

    setScanSearching(true);
    setScanError('');
    setScanSuccessMsg('');
    setScanResult(null);

    try {
      // 1. Try student lookup first (matches QR code, Student ID, or Registered Mobile)
      try {
        const stuRes = await lookupStudentQr(q);
        if (stuRes.data?.success && stuRes.data?.student) {
          setScanResult({ type: 'student', data: stuRes.data });
          setScanSearching(false);
          return;
        }
      } catch (stuErr) {
        if (scanSearchMode === 'mobile') {
          setScanError(stuErr.response?.data?.message || `No registered student found with mobile number "${q}".`);
          setScanSearching(false);
          return;
        }
      }

      // 2. Try visitor pass lookup (if not in mobile-only mode)
      if (scanSearchMode !== 'mobile') {
        try {
          const visRes = await verifyVisitorPass(q);
          if (visRes.data?.success && visRes.data?.data) {
            setScanResult({ type: 'visitor', data: visRes.data });
            setScanSearching(false);
            return;
          }
        } catch (visErr) {
          // Fallback
        }
      }

      setScanError(`No registered student record found for "${q}". Please check the registered details.`);
    } catch (err) {
      setScanError(err.response?.data?.message || 'Lookup failed');
    } finally {
      setScanSearching(false);
    }
  };

  // 1. Filtered Students (Inside Campus vs All Registered)
  const insideStudents = studentsList.filter(s => s.status === 'Inside Campus');
  const baseStudents = studentSubTab === 'inside' ? insideStudents : studentDirectory;
  const filteredStudents = baseStudents.filter(s => {
    const sName = s.studentName || s.name || '';
    const sId = s.studentId || s.id || '';
    const sDept = s.department || s.dept || '';
    const sPhone = s.phone || s.mobile || '';
    const sQr = s.qrCode || '';
    const q = search.toLowerCase();
    return sName.toLowerCase().includes(q) ||
           sId.toLowerCase().includes(q) ||
           sDept.toLowerCase().includes(q) ||
           sPhone.toLowerCase().includes(q) ||
           sQr.toLowerCase().includes(q);
  });

  // 2. Filtered Staff
  const filteredStaff = staffList.filter(st =>
    (st.staffName || st.name)?.toLowerCase().includes(search.toLowerCase()) ||
    (st.staffId || st.personId)?.toLowerCase().includes(search.toLowerCase()) ||
    st.department?.toLowerCase().includes(search.toLowerCase())
  );

  // 3. Filtered Visitors (Inside Campus vs Pre-Registered & Today)
  const baseVisitors = visitorSubTab === 'inside'
    ? (Array.isArray(activeVisitors) ? activeVisitors : [])
    : (Array.isArray(preRegisteredVisitors) ? preRegisteredVisitors : []);
  const filteredVisitors = baseVisitors.filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.toLowerCase().includes(search.toLowerCase()) ||
    v.passNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.personToMeet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="wmn-page-container">
      {/* ── Executive ERP Header ── */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '14px',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--text-main, #0f172a)',
              letterSpacing: '-0.02em'
            }}>
              {displayCollegeName} – Security Command Center
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
                Officer on Duty: <strong style={{ color: '#0f172a' }}>{watchmanName}</strong>
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.85rem' }}>
                Assigned Post: <strong style={{ color: '#1d4ed8' }}>{assignedGate}</strong>
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Real-Time Live Sync
              </span>
            </div>
          </div>
        </div>

        {/* Live Clock & Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setScanModalOpen(true); setScanResult(null); setScanError(''); setScanSuccessMsg(''); }}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9px',
              padding: '8px 15px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <ScanLine size={16} />
            <span>Scan / Verify Gate QR</span>
          </button>

          <div style={{
            background: '#0f172a',
            color: '#38bdf8',
            fontFamily: 'monospace',
            fontWeight: 800,
            fontSize: '0.98rem',
            padding: '8px 14px',
            borderRadius: '9px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={16} style={{ color: '#38bdf8' }} />
            <span>{currentTime.toLocaleTimeString('en-US', { hour12: false })}</span>
          </div>

          <button
            type="button"
            onClick={fetchDashboardData}
            style={{
              background: 'var(--bg-muted, #f1f5f9)',
              border: '1px solid var(--border-color, #cbd5e1)',
              borderRadius: '8px',
              color: 'var(--text-main, #334155)',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>


      {/* ── 3 Distinct Quick Action Buttons Separated by Role ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px',
        marginBottom: '1.5rem'
      }}>
        {/* Action: Campus In & Out Gate */}
        <button
          type="button"
          onClick={() => navigate('/watchman/campus-in-out')}
          style={{
            background: 'linear-gradient(135deg, #059669, #0d9488)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(5,150,105,0.25)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <ArrowLeftRight size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Campus In & Out Gate</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>1-Click entry & exit for registered people</div>
            </div>
          </div>
          <ChevronRight size={18} />
          
        </button>

        {/* Action: Register Student / Staff */}
        <button
          type="button"
          onClick={() => navigate('/watchman/register-person?type=Student')}
          style={{
            background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(20,184,166,0.25)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <UserCheck size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Register Student / Staff</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Students, Faculty & Staff + QR ID Pass</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>

        {/* Action: Gate QR Scanner */}
        <button
          type="button"
          onClick={() => navigate('/watchman/qr-verification')}
          style={{
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(37,99,235,0.2)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <QrCode size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Gate QR Scanner</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Webcam scan • Campus In & Out</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>

        {/* Action: Log Student Movement */}
        <button
          type="button"
          onClick={() => navigate('/watchman/student-register')}
          style={{
            background: 'linear-gradient(135deg, #4338ca, #3b82f6)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <GraduationCap size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Log Student Movement</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Identify by Roll No & track In/Out</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>

        {/* Action 2: Staff Gate Register */}
        <button
          type="button"
          onClick={() => navigate('/watchman/staff-register')}
          style={{
            background: 'linear-gradient(135deg, #047857, #059669)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(5,150,105,0.2)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <UserCheck size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Staff Gate Register</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Log faculty & staff movements</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>

        {/* Action 3: New Visitor Pass */}
        <button
          type="button"
          onClick={() => navigate('/watchman/visitor-entry')}
          style={{
            background: 'linear-gradient(135deg, #6d28d9, #7c3aed)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(124,58,237,0.2)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <UserPlus size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>New Visitor Entry</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>Guest check-in, host meeting & Gate Pass</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>

        {/* Action 4: Bus Entry & Exit Tracking */}
        <button
          type="button"
          onClick={() => navigate('/watchman/bus-tracking')}
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(14,165,233,0.25)',
            transition: 'transform 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '8px' }}>
              <Bus size={22} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Bus Entry Tracking</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                {busStats.insideCampus > 0 ? `${busStats.insideCampus} Buses Inside Campus` : 'Log Arrival & Departure'}
              </div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── 6 Real-Time Stat KPI Cards (Role Separated) ── */}
      <div className="wmn-ov-grid" style={{ marginBottom: '1.5rem' }}>
        {/* 1. Students Inside Campus */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#2563eb' }}>
          <div className="wmn-ov-info">
            <h5>Students on Campus</h5>
            <span className="count" style={{ color: '#2563eb' }}>{stats.studentsInside || insideStudents.length || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{studentDirectory.length} total registered students</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <GraduationCap size={26} />
          </div>
        </div>

        {/* 2. Staff on Duty / Campus */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#059669' }}>
          <div className="wmn-ov-info">
            <h5>Staff on Campus</h5>
            <span className="count" style={{ color: '#059669' }}>{stats.staffInside || staffList.length || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Faculty & staff present</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <UserCheck size={24} />
          </div>
        </div>

        {/* 3. Visitors Currently Inside */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#7c3aed' }}>
          <div className="wmn-ov-info">
            <h5>Visitors Inside</h5>
            <span className="count" style={{ color: '#7c3aed' }}>{stats.visitorsInside || activeVisitors.length || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{preRegisteredVisitors.length} pre-registered</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Users size={24} />
          </div>
        </div>

        {/* 4. Vehicles on Campus */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#0891b2' }}>
          <div className="wmn-ov-info">
            <h5>Vehicles Parked</h5>
            <span className="count" style={{ color: '#0891b2' }}>{stats.vehiclesInside || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Campus bays monitored</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
            <Car size={24} />
          </div>
        </div>

        {/* 5. Parcels at Gate */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#d97706' }}>
          <div className="wmn-ov-info">
            <h5>Parcels at Gate</h5>
            <span className="count" style={{ color: '#d97706' }}>{stats.parcelsAtGate || recentParcels.length || 0}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Awaiting recipient pickup</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Package size={24} />
          </div>
        </div>

        {/* 6. Active Security Alerts */}
        <div className="wmn-ov-card" style={{ '--accent-bar': '#dc2626' }}>
          <div className="wmn-ov-info">
            <h5>Security Alerts</h5>
            <span className="count" style={{ color: stats.openIncidents > 0 ? '#dc2626' : '#16a34a' }}>
              {stats.openIncidents || 0}
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Gate post secure</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: stats.openIncidents > 0 ? '#fef2f2' : '#f0fdf4', color: stats.openIncidents > 0 ? '#dc2626' : '#16a34a' }}>
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* ── Main Dashboard 2-Column Split: Operations Table (Left) & Gate Side (Right) ── */}
      <div className="wmn-grid-2col">
        {/* Left Column: Live Personnel & Gate Registrars */}
        <div className="wmn-card" style={{ padding: '18px 20px', minHeight: '520px' }}>
          {/* Header Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            paddingBottom: '14px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '14px'
          }}>
            {/* Primary Role Tabs */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '10px',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              {/* Tab 1: Students */}
              <button
                type="button"
                onClick={() => { setActiveViewTab('students'); setSearch(''); }}
                style={{
                  border: 'none',
                  background: activeViewTab === 'students' ? '#ffffff' : 'transparent',
                  color: activeViewTab === 'students' ? '#1d4ed8' : '#64748b',
                  fontWeight: activeViewTab === 'students' ? 700 : 500,
                  fontSize: '0.84rem',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeViewTab === 'students' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <GraduationCap size={16} />
                <span>Students ({studentSubTab === 'inside' ? insideStudents.length : studentDirectory.length})</span>
              </button>

              {/* Tab 2: Staff */}
              <button
                type="button"
                onClick={() => { setActiveViewTab('staff'); setSearch(''); }}
                style={{
                  border: 'none',
                  background: activeViewTab === 'staff' ? '#ffffff' : 'transparent',
                  color: activeViewTab === 'staff' ? '#047857' : '#64748b',
                  fontWeight: activeViewTab === 'staff' ? 700 : 500,
                  fontSize: '0.84rem',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeViewTab === 'staff' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <UserCheck size={16} />
                <span>Staff ({staffList.length})</span>
              </button>

              {/* Tab 3: Visitors */}
              <button
                type="button"
                onClick={() => { setActiveViewTab('visitors'); setSearch(''); }}
                style={{
                  border: 'none',
                  background: activeViewTab === 'visitors' ? '#ffffff' : 'transparent',
                  color: activeViewTab === 'visitors' ? '#6d28d9' : '#64748b',
                  fontWeight: activeViewTab === 'visitors' ? 700 : 500,
                  fontSize: '0.84rem',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: activeViewTab === 'visitors' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <Users size={16} />
                <span>Visitors ({visitorSubTab === 'inside' ? activeVisitors.length : preRegisteredVisitors.length})</span>
              </button>

              {/* Tab 4: Campus In / Out */}
              <button
                type="button"
                onClick={() => navigate('/watchman/campus-in-out')}
                style={{
                  border: 'none',
                  background: '#ecfdf5',
                  color: '#059669',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #a7f3d0'
                }}
              >
                <ArrowLeftRight size={16} />
                <span>Campus In / Out Gate</span>
              </button>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder={
                    activeViewTab === 'students'
                      ? "Search student name, ID, roll #..."
                      : activeViewTab === 'staff'
                      ? "Search staff name, ID..."
                      : "Search visitor name, pass #..."
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: '6px 12px 6px 30px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    minWidth: '220px'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>
          </div>

          {/* Sub-Tabs Filter for Students */}
          {activeViewTab === 'students' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              padding: '6px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filter View:</span>
                <button
                  type="button"
                  onClick={() => setStudentSubTab('inside')}
                  style={{
                    background: studentSubTab === 'inside' ? '#2563eb' : '#ffffff',
                    color: studentSubTab === 'inside' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: studentSubTab === 'inside' ? '#2563eb' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Inside Campus ({insideStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentSubTab('all')}
                  style={{
                    background: studentSubTab === 'all' ? '#2563eb' : '#ffffff',
                    color: studentSubTab === 'all' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: studentSubTab === 'all' ? '#2563eb' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  All Registered Students & QR Passes ({studentDirectory.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setScanModalOpen(true); setScanResult(null); setScanError(''); setScanSuccessMsg(''); }}
                style={{
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <QrCode size={13} />
                <span>Gate Scan Student QR</span>
              </button>
            </div>
          )}

          {/* Sub-Tabs Filter for Visitors */}
          {activeViewTab === 'visitors' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              padding: '6px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Filter View:</span>
                <button
                  type="button"
                  onClick={() => setVisitorSubTab('inside')}
                  style={{
                    background: visitorSubTab === 'inside' ? '#7c3aed' : '#ffffff',
                    color: visitorSubTab === 'inside' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: visitorSubTab === 'inside' ? '#7c3aed' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Inside Campus ({activeVisitors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitorSubTab('all')}
                  style={{
                    background: visitorSubTab === 'all' ? '#7c3aed' : '#ffffff',
                    color: visitorSubTab === 'all' ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: visitorSubTab === 'all' ? '#7c3aed' : '#cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Pre-Registered & Registered Today ({preRegisteredVisitors.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate('/watchman/visitor-entry')}
                style={{
                  background: '#f5f3ff',
                  color: '#6d28d9',
                  border: '1px solid #ddd6fe',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <UserPlus size={13} />
                <span>Issue Visitor Pass</span>
              </button>
            </div>
          )}

          {/* ═════════ TAB 1: STUDENTS (ON CAMPUS OR ALL REGISTERED) ═════════ */}
          {activeViewTab === 'students' && (
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="wmn-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student ID / Roll #</th>
                    <th>QR Code Pass</th>
                    <th>Campus Status</th>
                    <th style={{ textAlign: 'right' }}>Gate Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                        <GraduationCap size={36} style={{ color: '#3b82f6', margin: '0 auto 8px auto' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                          {studentSubTab === 'inside' ? 'No students currently on campus' : 'No registered students found'}
                        </p>
                        <span style={{ fontSize: '0.8rem' }}>
                          {studentSubTab === 'inside'
                            ? 'Switch to "All Registered Students" tab or scan a student QR code to record entry.'
                            : 'Students registered in the college ERP will appear here.'}
                        </span>
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          {studentSubTab === 'inside' && (
                            <button
                              type="button"
                              className="wmn-btn-sec"
                              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                              onClick={() => setStudentSubTab('all')}
                            >
                              View All Registered Students ({studentDirectory.length})
                            </button>
                          )}
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                            onClick={() => { setScanModalOpen(true); setScanResult(null); }}
                          >
                            <QrCode size={15} />
                            <span>Scan Student QR Pass</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => {
                      const sName = s.studentName || s.name || 'Student';
                      const sId = s.studentId || s.id || 'STU';
                      const sDept = s.department || s.dept || 'General';
                      const sCourse = s.course || s.degreeType || 'Degree';
                      const isInside = s.status === 'Inside Campus' || s.currentStatus === 'Inside Campus';
                      const qrCodeStr = s.qrCode || `STU-QR-${sId}`;
                      const qrUrl = s.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeStr)}`;

                      return (
                        <tr key={s._id || sId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: '#eff6ff',
                                color: '#2563eb',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #bfdbfe',
                                overflow: 'hidden'
                              }}>
                                {s.photoUrl ? (
                                  <img src={s.photoUrl} alt={sName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  sName.slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{sName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.email || s.phone || 'Student'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#1d4ed8',
                              background: '#eff6ff',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #dbeafe',
                              fontSize: '0.82rem'
                            }}>
                              {sId}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setQrPassModal({
                                type: 'student',
                                data: {
                                  name: sName,
                                  id: sId,
                                  dept: sDept,
                                  course: sCourse,
                                  semester: s.semester || s.sem || '1',
                                  qrCode: qrCodeStr,
                                  qrUrl,
                                  isInside,
                                  photoUrl: s.photoUrl,
                                  checkInTime: s.checkInTime || s.activeCheckInTime
                                }
                              })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '7px',
                                padding: '4px 9px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                              title="Click to view full scannable QR Pass"
                            >
                              <img src={qrUrl} alt="QR Thumbnail" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                              <QrCode size={13} style={{ color: '#2563eb' }} />
                              <span>View QR Pass</span>
                            </button>
                          </td>
                          <td>
                            {isInside ? (
                              <span style={{
                                background: '#ecfdf5',
                                color: '#059669',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                border: '1px solid #a7f3d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                                {s.durationFormatted || 'Inside Campus'}
                              </span>
                            ) : (
                              <span style={{
                                background: '#f8fafc',
                                color: '#64748b',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                border: '1px solid #e2e8f0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                                Outside Campus
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isInside ? (
                              <button
                                type="button"
                                className="wmn-btn-sec"
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '0.76rem',
                                  color: '#dc2626',
                                  borderColor: '#fca5a5',
                                  fontWeight: 700
                                }}
                                disabled={actionLoadingId === (s._id || sId)}
                                onClick={() => handleQuickStudentCheckout(s)}
                              >
                                <ExitIcon size={12} />
                                <span>{actionLoadingId === (s._id || sId) ? 'Exiting...' : 'Log Exit'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="wmn-btn-sec"
                                style={{
                                  padding: '5px 12px',
                                  fontSize: '0.76rem',
                                  color: '#16a34a',
                                  borderColor: '#86efac',
                                  background: '#f0fdf4',
                                  fontWeight: 700
                                }}
                                disabled={actionLoadingId === (s._id || sId)}
                                onClick={() => handleQuickStudentCheckin(s)}
                              >
                                <Check size={12} />
                                <span>{actionLoadingId === (s._id || sId) ? 'Entering...' : 'Check-In'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ═════════ TAB 2: STAFF ON CAMPUS ═════════ */}
          {activeViewTab === 'staff' && (
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="wmn-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Staff ID / Code</th>
                    <th>Gate Entered</th>
                    <th>Entry Time</th>
                    <th style={{ textAlign: 'right' }}>Campus Exit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                        <UserCheck size={36} style={{ color: '#059669', margin: '0 auto 8px auto' }} />
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>No staff movements recorded yet today</p>
                        <span style={{ fontSize: '0.8rem' }}>Faculty and non-teaching staff entries will appear here.</span>
                        <div style={{ marginTop: '12px' }}>
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.82rem', margin: '0 auto', display: 'inline-flex', background: '#059669', borderColor: '#059669' }}
                            onClick={() => navigate('/watchman/staff-register')}
                          >
                            <UserCheck size={15} />
                            <span>Log Staff Entry</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(st => (
                      <tr key={st._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#ecfdf5',
                              color: '#059669',
                              fontWeight: 800,
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid #a7f3d0'
                            }}>
                              {(st.staffName || st.name)?.slice(0, 2).toUpperCase() || 'ST'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{st.staffName || st.name}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{st.designation || 'Faculty Member'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#059669',
                            background: '#ecfdf5',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #a7f3d0',
                            fontSize: '0.82rem'
                          }}>
                            {st.staffId || st.personId}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', color: '#475569' }}>{st.gate || 'Gate 1'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155' }}>
                            <Clock size={13} style={{ color: '#64748b' }} />
                            <span>{new Date(st.timestamp || st.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="wmn-btn-sec"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.78rem',
                              color: '#dc2626',
                              borderColor: '#fca5a5'
                            }}
                            disabled={actionLoadingId === st._id}
                            onClick={() => handleQuickStaffExit(st)}
                          >
                            <ExitIcon size={13} />
                            <span>{actionLoadingId === st._id ? 'Logging...' : 'Log Exit'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ═════════ TAB 3: VISITORS ON CAMPUS OR REGISTERED TODAY ═════════ */}
          {activeViewTab === 'visitors' && (
            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table className="wmn-table">
                <thead>
                  <tr>
                    <th>Pass #</th>
                    <th>Visitor Name & Phone</th>
                    <th>Person to Meet</th>
                    <th>QR Code Pass</th>
                    <th>Status / Entry Time</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                        <Users size={32} style={{ color: '#7c3aed', margin: '0 auto 8px auto' }} />
                        <p style={{ margin: 0, fontWeight: 700 }}>
                          {visitorSubTab === 'inside' ? 'No visitors currently inside campus' : 'No pre-registered visitors found'}
                        </p>
                        <span style={{ fontSize: '0.78rem' }}>
                          {visitorSubTab === 'inside' ? 'All active visitors have checked out.' : 'Click below to register a new visitor entry.'}
                        </span>
                        <div style={{ marginTop: '12px' }}>
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.82rem', margin: '0 auto', display: 'inline-flex', background: '#7c3aed', borderColor: '#7c3aed' }}
                            onClick={() => navigate('/watchman/visitor-entry')}
                          >
                            <UserPlus size={14} />
                            <span>Register New Visitor</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVisitors.map(v => {
                      const passNum = v.passNumber || v.visitorId || 'PASS';
                      const qrUrl = v.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(passNum)}`;
                      const isInside = v.status === 'Inside';

                      return (
                        <tr key={v._id}>
                          <td>
                            <strong style={{ fontFamily: 'monospace', color: '#7c3aed', fontSize: '0.86rem' }}>{passNum}</strong>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.phone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{v.personToMeet}</div>
                            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.department} • {v.purpose}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setQrPassModal({
                                type: 'visitor',
                                data: {
                                  name: v.name,
                                  phone: v.phone,
                                  passNumber: passNum,
                                  personToMeet: v.personToMeet,
                                  department: v.department,
                                  purpose: v.purpose,
                                  gate: v.gate,
                                  status: v.status,
                                  entryTime: v.entryTime,
                                  qrUrl,
                                  _id: v._id
                                }
                              })}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '7px',
                                padding: '4px 9px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: '#1e293b',
                                cursor: 'pointer',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                              }}
                              title="Click to view visitor pass QR badge"
                            >
                              <img src={qrUrl} alt="QR Thumbnail" style={{ width: '18px', height: '18px', borderRadius: '3px' }} />
                              <QrCode size={13} style={{ color: '#7c3aed' }} />
                              <span>View QR Pass</span>
                            </button>
                          </td>
                          <td>
                            {isInside ? (
                              <div>
                                <span style={{
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  border: '1px solid #a7f3d0'
                                }}>
                                  Inside Campus
                                </span>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                  In: {new Date(v.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <span style={{
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  border: '1px solid #fde68a'
                                }}>
                                  {v.status || 'Pre-Registered'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isInside ? (
                              <button
                                type="button"
                                className="wmn-btn-sec"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.76rem',
                                  color: '#dc2626',
                                  borderColor: '#fca5a5'
                                }}
                                disabled={actionLoadingId === v._id}
                                onClick={() => handleQuickVisitorCheckout(v)}
                              >
                                <ExitIcon size={12} />
                                <span>{actionLoadingId === v._id ? 'Exiting...' : 'Exit'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="wmn-btn-sec"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.76rem',
                                  color: '#059669',
                                  borderColor: '#86efac',
                                  background: '#ecfdf5'
                                }}
                                disabled={actionLoadingId === v._id}
                                onClick={() => handleQuickVisitorAdmit(v)}
                              >
                                <Check size={12} />
                                <span>{actionLoadingId === v._id ? 'Admitting...' : 'Admit'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Attendance Widget, Parcels & Logistics */}
        <div className="wmn-grid-col-side">
          {/* ═════════ DUTY ATTENDANCE CARD (DIRECTLY ON DASHBOARD) ═════════ */}
          <div style={{ marginBottom: '20px' }}>
            <EmployeeAttendanceCard layout="card" />
          </div>

          {/* Parcels Card */}
          <div className="wmn-card" style={{ marginBottom: '20px' }}>
            <div className="wmn-card-header">
              <div className="wmn-card-title">
                <Package size={18} style={{ color: '#d97706' }} />
                <h3>Parcels at Gate</h3>
                <span className="count-badge" style={{ background: '#fffbeb', color: '#d97706' }}>
                  {recentParcels.length}
                </span>
              </div>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                onClick={() => navigate('/watchman/parcels')}
              >
                View All
              </button>
            </div>

            {recentParcels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                <Package size={28} style={{ margin: '0 auto 6px auto' }} />
                <p style={{ margin: 0, fontSize: '0.82rem' }}>No pending parcels at gate</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentParcels.slice(0, 4).map(p => (
                  <div
                    key={p._id}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>{p.recipientName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {p.deliveryCompany || p.courierCompany} • {p.parcelDetails || p.trackingNumber}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      Gate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Gate Nav Shortcuts */}
          <div className="wmn-card" style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#0f172a', fontWeight: 700 }}>
              Gate Logistics Shortcuts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ justifyContent: 'space-between', padding: '8px 12px' }}
                onClick={() => navigate('/watchman/vehicles')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car size={16} style={{ color: '#0891b2' }} />
                  <span>Vehicle Gate Movements</span>
                </div>
                <ChevronRight size={14} color="#94a3b8" />
              </button>

              <button
                type="button"
                className="wmn-btn-sec"
                style={{ justifyContent: 'space-between', padding: '8px 12px' }}
                onClick={() => navigate('/watchman/attendance')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: '#16a34a' }} />
                  <span>Guard Shift Logs</span>
                </div>
                <ChevronRight size={14} color="#94a3b8" />
              </button>
            </div>
          </div>

          {/* Emergency Protocols Callout */}
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontWeight: 800, fontSize: '0.92rem', marginBottom: '8px' }}>
              <AlertTriangle size={18} />
              <span>Gate Emergency Protocols</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.5 }}>
              For unauthorized entries, medical emergencies, or trespassing, report immediately to command.
            </p>
            <button
              type="button"
              className="wmn-btn-sec"
              style={{ width: '100%', marginTop: '12px', justifyContent: 'center', color: '#991b1b', borderColor: '#fca5a5', background: '#ffffff' }}
              onClick={() => navigate('/watchman/incidents')}
            >
              Open Incident Reporter
            </button>
          </div>
        </div>
      </div>

      {/* ═════════ MODAL 1: SCANNABLE QR PASS MODAL (STUDENT / VISITOR) ═════════ */}
      {qrPassModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              background: qrPassModal.type === 'student' ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : 'linear-gradient(135deg, #6d28d9, #9333ea)',
              color: '#ffffff',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <QrCode size={22} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    {qrPassModal.type === 'student' ? 'Official Student Gate QR Pass' : 'Official Visitor Gate Pass'}
                  </h3>
                  <span style={{ fontSize: '0.74rem', opacity: 0.9 }}>
                    {displayCollegeName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrPassModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              {/* QR Mode Switcher Tabs */}
              <div style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                maxWidth: '380px',
                margin: '0 auto 16px auto',
                border: '1px solid #e2e8f0'
              }}>
                <button
                  type="button"
                  onClick={() => setQrDisplayMode('raw')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: '0.78rem',
                    fontWeight: qrDisplayMode === 'raw' ? 800 : 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: qrDisplayMode === 'raw' ? '#ffffff' : 'transparent',
                    color: qrDisplayMode === 'raw' ? '#0f172a' : '#64748b',
                    boxShadow: qrDisplayMode === 'raw' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Direct Code (Any Scanner)
                </button>
                <button
                  type="button"
                  onClick={() => setQrDisplayMode('url')}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    fontSize: '0.78rem',
                    fontWeight: qrDisplayMode === 'url' ? 800 : 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: qrDisplayMode === 'url' ? '#ffffff' : 'transparent',
                    color: qrDisplayMode === 'url' ? '#0f172a' : '#64748b',
                    boxShadow: qrDisplayMode === 'url' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Mobile Web Pass (Wi-Fi)
                </button>
              </div>

              {/* QR Image Box */}
              {(() => {
                const rawCode = qrPassModal.data.qrCode || qrPassModal.data.passNumber || qrPassModal.data.id;
                const rawQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(rawCode)}`;
                const activeQrUrl = qrDisplayMode === 'raw' ? rawQrUrl : (qrPassModal.data.qrUrl || rawQrUrl);

                return (
                  <div style={{
                    background: '#ffffff',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'inline-block',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                  }}>
                    <img
                      src={activeQrUrl}
                      alt="Scannable QR Code"
                      style={{ width: '210px', height: '210px', display: 'block', margin: '0 auto' }}
                    />
                    <span style={{
                      display: 'block',
                      marginTop: '8px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: qrPassModal.type === 'student' ? '#1d4ed8' : '#7c3aed'
                    }}>
                      {rawCode}
                    </span>
                    <div style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: qrDisplayMode === 'raw' ? '#f0fdf4' : '#eff6ff',
                      border: '1px solid',
                      borderColor: qrDisplayMode === 'raw' ? '#bbf7d0' : '#bfdbfe',
                      fontSize: '0.74rem',
                      color: qrDisplayMode === 'raw' ? '#166534' : '#1e40af',
                      maxWidth: '340px',
                      margin: '8px auto 0 auto',
                      textAlign: 'center'
                    }}>
                      {qrDisplayMode === 'raw' ? (
                        <span>✅ <strong>Universal Scanner Mode:</strong> Scans instantly as text in Google Lens, phone camera, or gate hardware barcode reader.</span>
                      ) : (
                        <span>📶 <strong>Mobile Browser Mode:</strong> Connect phone to the same Wi-Fi / Hotspot as this computer to load the pass directly.</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Verified Details Card */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '14px',
                textAlign: 'left',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                    {qrPassModal.data.name}
                  </h4>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: qrPassModal.data.isInside || qrPassModal.data.status === 'Inside' ? '#ecfdf5' : '#eff6ff',
                    color: qrPassModal.data.isInside || qrPassModal.data.status === 'Inside' ? '#059669' : '#2563eb',
                    border: '1px solid',
                    borderColor: qrPassModal.data.isInside || qrPassModal.data.status === 'Inside' ? '#a7f3d0' : '#bfdbfe'
                  }}>
                    {qrPassModal.data.isInside || qrPassModal.data.status === 'Inside' ? 'Inside Campus' : 'Outside'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.78rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>
                      {qrPassModal.type === 'student' ? 'Student ID:' : 'Pass #:'}
                    </span>
                    <strong style={{ display: 'block', color: '#1e293b' }}>
                      {qrPassModal.data.id || qrPassModal.data.passNumber}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>
                      {qrPassModal.type === 'student' ? 'Course & Dept:' : 'Department:'}
                    </span>
                    <strong style={{ display: 'block', color: '#1e293b' }}>
                      {qrPassModal.data.dept} {qrPassModal.data.course ? `• ${qrPassModal.data.course}` : ''}
                    </strong>
                  </div>
                  {qrPassModal.type === 'visitor' && (
                    <>
                      <div>
                        <span style={{ color: '#64748b' }}>Person to Meet:</span>
                        <strong style={{ display: 'block', color: '#1e293b' }}>{qrPassModal.data.personToMeet}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Purpose:</span>
                        <strong style={{ display: 'block', color: '#1e293b' }}>{qrPassModal.data.purpose}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {qrPassModal.type === 'student' ? (
                  qrPassModal.data.isInside ? (
                    <button
                      type="button"
                      className="wmn-btn-sec"
                      style={{ flex: 1, color: '#dc2626', borderColor: '#fca5a5', fontWeight: 700 }}
                      onClick={() => handleQuickStudentCheckout(qrPassModal.data)}
                    >
                      <ExitIcon size={14} />
                      <span>Confirm Gate Check-Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="wmn-btn-primary"
                      style={{ flex: 1, fontWeight: 700 }}
                      onClick={() => handleQuickStudentCheckin(qrPassModal.data)}
                    >
                      <Check size={14} />
                      <span>Confirm Gate Check-In</span>
                    </button>
                  )
                ) : (
                  qrPassModal.data.status === 'Inside' ? (
                    <button
                      type="button"
                      className="wmn-btn-sec"
                      style={{ flex: 1, color: '#dc2626', borderColor: '#fca5a5', fontWeight: 700 }}
                      onClick={() => handleQuickVisitorCheckout(qrPassModal.data)}
                    >
                      <ExitIcon size={14} />
                      <span>Confirm Visitor Exit</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="wmn-btn-primary"
                      style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
                      onClick={() => handleQuickVisitorAdmit(qrPassModal.data)}
                    >
                      <Check size={14} />
                      <span>Admit Visitor at Gate</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="wmn-btn-sec"
                  style={{ padding: '8px 14px' }}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════ MODAL 2: INTERACTIVE GATE QR SCANNER & PASS LOOKUP ═════════ */}
      {scanModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #312e81, #4338ca)',
              color: '#ffffff',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ScanLine size={24} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                    Gate QR Scanner & Pass Verification
                  </h3>
                  <span style={{ fontSize: '0.74rem', opacity: 0.85 }}>
                    Scan barcode / camera or enter Student ID or Visitor Pass #
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setScanModalOpen(false); setScanResult(null); }}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div style={{ padding: '16px 20px 0 20px' }}>
              <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => { setScanSearchMode('mobile'); setScanQuery(''); setScanError(''); setScanResult(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: scanSearchMode === 'mobile' ? '#ffffff' : 'transparent',
                    color: scanSearchMode === 'mobile' ? '#312e81' : '#64748b',
                    fontWeight: scanSearchMode === 'mobile' ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: scanSearchMode === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Phone size={15} />
                  <span>Search by Mobile #</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setScanSearchMode('qr'); setScanQuery(''); setScanError(''); setScanResult(null); }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: scanSearchMode === 'qr' ? '#ffffff' : 'transparent',
                    color: scanSearchMode === 'qr' ? '#312e81' : '#64748b',
                    fontWeight: scanSearchMode === 'qr' ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: scanSearchMode === 'qr' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <QrCode size={15} />
                  <span>Scan QR Code / ID</span>
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div style={{ padding: '16px 20px 20px 20px' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearchScan(scanQuery);
                }}
                style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}
              >
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type={scanSearchMode === 'mobile' ? 'tel' : 'text'}
                    autoFocus
                    placeholder={
                      scanSearchMode === 'mobile'
                        ? 'Enter 10-digit registered student mobile number...'
                        : 'Scan QR code or enter Student ID, Roll #, Pass #...'
                    }
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 36px',
                      borderRadius: '8px',
                      border: '1.5px solid #6366f1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {scanSearchMode === 'mobile' ? (
                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
                  ) : (
                    <Camera size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={scanSearching || !scanQuery.trim()}
                  style={{
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 18px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: scanSearching ? 'wait' : 'pointer'
                  }}
                >
                  {scanSearching ? 'Searching...' : scanSearchMode === 'mobile' ? 'Search Student' : 'Scan / Verify'}
                </button>
              </form>

              {/* Status & Feedback messages */}
              {scanError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '14px'
                }}>
                  {scanError}
                </div>
              )}

              {scanSuccessMsg && (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#15803d',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '14px'
                }}>
                  {scanSuccessMsg}
                </div>
              )}

              {/* Verified Result Card */}
              {scanResult && (
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  padding: '16px',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    {scanResult.type === 'student' && scanResult.data.student?.photoUrl ? (
                      <img
                        src={scanResult.data.student.photoUrl}
                        alt={scanResult.data.student.name}
                        style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #3b82f6' }}
                      />
                    ) : (
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: scanResult.type === 'student' ? '#eff6ff' : '#f5f3ff',
                        color: scanResult.type === 'student' ? '#2563eb' : '#7c3aed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1rem',
                        border: '1px solid #dbeafe'
                      }}>
                        {scanResult.type === 'student' ? <GraduationCap size={24} /> : <Users size={24} />}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                          {scanResult.type === 'student' ? scanResult.data.student?.name : scanResult.data.data?.name}
                        </h4>
                        <span style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          border: '1px solid #a7f3d0'
                        }}>
                          Verified Match
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                        {scanResult.type === 'student'
                          ? `Student ID: ${scanResult.data.student?.id} • Dept: ${scanResult.data.student?.department}`
                          : `Pass #: ${scanResult.data.data?.passNumber} • Phone: ${scanResult.data.data?.phone}`}
                      </div>
                    </div>
                  </div>

                  {/* QR Preview & Student Details */}
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                    <img
                      src={scanResult.data.qrUrl || (scanResult.data.data && scanResult.data.data.qrUrl)}
                      alt="Scanned QR"
                      style={{ width: '90px', height: '90px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', padding: '4px' }}
                    />
                    <div style={{ flex: 1, fontSize: '0.8rem', color: '#334155', lineHeight: 1.6 }}>
                      <div>
                        <strong>Current Status:</strong>{' '}
                        <span style={{ color: scanResult.data.currentStatus === 'Inside Campus' || scanResult.data.data?.status === 'Inside' ? '#059669' : '#d97706', fontWeight: 700 }}>
                          {scanResult.data.currentStatus || scanResult.data.data?.status || 'Active'}
                        </span>
                      </div>
                      {scanResult.type === 'student' ? (
                        <>
                          <div><strong>Registered Mobile:</strong> <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{scanResult.data.student?.phone || 'Not Registered'}</span></div>
                          <div><strong>Course:</strong> {scanResult.data.student?.course} (Sem {scanResult.data.student?.semester})</div>
                          <div><strong>QR Token:</strong> <code style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>{scanResult.data.student?.qrCode || 'STU-QR-' + scanResult.data.student?.id}</code></div>
                          {scanResult.data.activeEntry && (
                            <div><strong>Campus Stay:</strong> {scanResult.data.activeEntry?.durationSoFar}</div>
                          )}
                        </>
                      ) : (
                        <>
                          <div><strong>Meeting:</strong> {scanResult.data.data?.personToMeet} ({scanResult.data.data?.department})</div>
                          <div><strong>Purpose:</strong> {scanResult.data.data?.purpose}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Direct Actions */}
                  <div>
                    {scanResult.type === 'student' ? (
                      scanResult.data.canCheckIn ? (
                        <button
                          type="button"
                          className="wmn-btn-primary"
                          style={{ width: '100%', padding: '10px' }}
                          onClick={() => handleQuickStudentCheckin(scanResult.data.student)}
                        >
                          <Check size={16} />
                          <span>Confirm Gate Check-In (Enter Campus)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="wmn-btn-sec"
                          style={{ width: '100%', padding: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => handleQuickStudentCheckout({ studentId: scanResult.data.student?.id, studentName: scanResult.data.student?.name })}
                        >
                          <ExitIcon size={16} />
                          <span>Confirm Gate Check-Out (Campus Exit)</span>
                        </button>
                      )
                    ) : (
                      scanResult.data.data?.status === 'Inside' ? (
                        <button
                          type="button"
                          className="wmn-btn-sec"
                          style={{ width: '100%', padding: '10px', color: '#dc2626', borderColor: '#fca5a5' }}
                          onClick={() => handleQuickVisitorCheckout(scanResult.data.data)}
                        >
                          <ExitIcon size={16} />
                          <span>Confirm Visitor Exit</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="wmn-btn-primary"
                          style={{ width: '100%', padding: '10px', background: '#7c3aed', borderColor: '#7c3aed' }}
                          onClick={() => handleQuickVisitorAdmit(scanResult.data.data)}
                        >
                          <Check size={16} />
                          <span>Confirm Entry & Admit Visitor</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchmanDashboard;
