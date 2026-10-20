import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScanLine, Search, Filter, RefreshCw, Calendar, Clock,
  User, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  Building2, QrCode, Shield, Download, Printer, Eye,
  BarChart2, Users, Check, AlertCircle, Copy, FileText,
  Activity, Radio, Car, Package, LogOut as ExitIcon,
  ShieldAlert, UserCheck, CalendarCheck, ArrowLeftRight, LogIn, LogOut,
  GraduationCap, Truck, Bus, AlertTriangle, ChevronRight, Phone,
  ShieldCheck, Sparkles, UserPlus
} from 'lucide-react';
import {
  getStudentTracking,
  getStudentDailyReport,
  getStudentQrDirectory,
  getWatchmanActivities,
  getWatchmanAttendance,
  getActiveVisitors,
  getVisitorHistory,
  getPreRegisteredVisitors,
  updateVisitorApproval,
  recordVisitorExit,
  admitPreRegisteredVisitor,
  getVehicles,
  getParcels,
  getSecurityIncidents,
  getCampusMovements,
  getCampusMovementStats,
  getWatchmanStats,
  getBusTrackingStats,
  getStaffMovements,
  recordStaffMovement,
  recordStudentCheckout,
  recordStudentCheckin,
  lookupStudentQr,
  verifyVisitorPass
} from '../../api/index';
import EmployeeAttendanceCard from '../../components/common/EmployeeAttendanceCard';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './AdminWatchmanTracking.css';

// Full date-time helper
const formatDateTime = (timestamp) => {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTimeOnly = (timestamp) => {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const date = new Date(timestamp);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return 'Just now';
  if (diffSec < 90) return '1 min ago';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 7200) return '1 hr ago';
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const AdminWatchmanTracking = () => {
  const navigate = useNavigate();

  // Navigation Tabs:
  // 'dashboard' | 'student_tracking' | 'staff_movements' | 'campus_movements' | 'visitors_logistics' | 'attendance' | 'live_feed' | 'daily_report' | 'student_qr_directory'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logisticsSubtab, setLogisticsSubtab] = useState('visitors'); // 'visitors' | 'vehicles' | 'parcels' | 'pre_registered'

  // General Filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // 0. Dashboard KPI Stats (Unified Watchman Command Metrics)
  const [watchmanStats, setWatchmanStats] = useState({
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

  const [busStats, setBusStats] = useState({
    totalRegistered: 0,
    insideCampus: 0,
    departedToday: 0,
    notArrivedToday: 0
  });

  // Dashboard Tab Personnel Switcher ('students' | 'staff' | 'visitors' | 'campus_in_out')
  const [dashPersonnelTab, setDashPersonnelTab] = useState('students');
  const [dashPersonnelSearch, setDashPersonnelSearch] = useState('');

  // 1. Student Tracking State
  const [trackingData, setTrackingData] = useState([]);
  const [stats, setStats] = useState({
    totalScansToday: 0,
    insideCampus: 0,
    checkedOutToday: 0,
    averageDurationFormatted: '0 mins'
  });
  const [loadingTracking, setLoadingTracking] = useState(true);

  // 2. Real-Time Activity Feed State
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityCategory, setActivityCategory] = useState('All');
  const [activitySearch, setActivitySearch] = useState('');

  // 3. Guard Attendance State
  const [attendanceList, setAttendanceList] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // 4. Visitors & Logistics State
  const [visitorsList, setVisitorsList] = useState([]);
  const [preRegList, setPreRegList] = useState([]);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [parcelsList, setParcelsList] = useState([]);
  const [loadingLogistics, setLoadingLogistics] = useState(false);
  const [approvalLoadingId, setApprovalLoadingId] = useState(null);

  // 5. Daily Report State
  const [dailyReport, setDailyReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // 6. Student QR Directory State
  const [qrDirectory, setQrDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // 7. Campus In & Out Movements State
  const [campusMovements, setCampusMovements] = useState([]);
  const [loadingCampusMovements, setLoadingCampusMovements] = useState(false);
  const [campusMovementStats, setCampusMovementStats] = useState({
    totalRegistered: 0,
    currentlyInside: 0,
    currentlyOutside: 0,
    todayEntries: 0,
    todayExits: 0
  });
  const [campusMovementSearch, setCampusMovementSearch] = useState('');
  const [campusMovementDirection, setCampusMovementDirection] = useState('All');
  const [campusMovementRole, setCampusMovementRole] = useState('All');

  // 8. Staff Gate Register State
  const [staffMovements, setStaffMovements] = useState([]);
  const [loadingStaffMovements, setLoadingStaffMovements] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const [staffDirectionFilter, setStaffDirectionFilter] = useState('All');
  const [staffDeptFilter, setStaffDeptFilter] = useState('All');

  // Quick Scanner / Gate Pass Lookup Modal
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  const [scanSearching, setScanSearching] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');

  // Action Loading ID
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal State
  const [selectedStudentForQr, setSelectedStudentForQr] = useState(null);
  const [copiedQr, setCopiedQr] = useState(false);

  // ─── DATA FETCHING FUNCTIONS ───

  // 1. Student Tracking
  const fetchTracking = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoadingTracking(true);
      const res = await getStudentTracking({
        search,
        date: selectedDate,
        status: statusFilter,
        department: deptFilter
      });
      if (res.data?.success) {
        setTrackingData(res.data.data || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load student tracking data:', err);
    } finally {
      if (showLoader) setLoadingTracking(false);
    }
  }, [search, selectedDate, statusFilter, deptFilter]);

  // 2. Activities Feed
  const fetchActivities = useCallback(async () => {
    try {
      setLoadingActivities(true);
      const res = await getWatchmanActivities({
        category: activityCategory,
        search: activitySearch,
        limit: 100
      });
      if (res.data?.success) {
        setActivities(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  }, [activityCategory, activitySearch]);

  // 3. Guard Attendance
  const fetchAttendance = useCallback(async () => {
    try {
      setLoadingAttendance(true);
      const res = await getWatchmanAttendance();
      if (res.data?.success) {
        setAttendanceList(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load guard attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  // 4. Logistics (Visitors, Vehicles, Parcels)
  const fetchLogistics = useCallback(async () => {
    try {
      setLoadingLogistics(true);
      const [visRes, vehRes, parRes, preRes] = await Promise.all([
        getVisitorHistory({ limit: 50 }),
        getVehicles({ limit: 50 }),
        getParcels({ limit: 50 }),
        getPreRegisteredVisitors()
      ]);
      setVisitorsList(visRes.data?.data || []);
      setVehiclesList(vehRes.data?.data || []);
      setParcelsList(parRes.data?.data || []);
      setPreRegList(preRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load gate logistics:', err);
    } finally {
      setLoadingLogistics(false);
    }
  }, []);

  // Admin Visitor Approval / Rejection Handler
  const handleApprovalAction = async (visitorId, approvalStatus) => {
    try {
      setApprovalLoadingId(visitorId);
      const res = await updateVisitorApproval(visitorId, { approvalStatus });
      if (res.data?.success) {
        setPreRegList(prev => prev.map(p => p._id === visitorId ? { ...p, approvalStatus, approvedBy: 'Administrator' } : p));
        fetchLogistics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update visitor approval');
    } finally {
      setApprovalLoadingId(null);
    }
  };

  // 5. Daily Report
  const fetchReport = useCallback(async () => {
    try {
      setLoadingReport(true);
      const res = await getStudentDailyReport({ date: selectedDate });
      if (res.data?.success) {
        setDailyReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily report:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedDate]);

  // 6. Student QR Directory
  const fetchDirectory = useCallback(async () => {
    try {
      setLoadingDirectory(true);
      const res = await getStudentQrDirectory({ search: directorySearch, department: deptFilter });
      if (res.data?.success) {
        setQrDirectory(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load QR directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  }, [directorySearch, deptFilter]);

  // 7. Campus In & Out Movements
  const fetchCampusMovementsData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoadingCampusMovements(true);
      const [movRes, statsRes] = await Promise.allSettled([
        getCampusMovements({
          search: campusMovementSearch,
          date: selectedDate,
          direction: campusMovementDirection,
          personType: campusMovementRole
        }),
        getCampusMovementStats()
      ]);
      if (movRes.status === 'fulfilled' && movRes.value?.data?.data) {
        setCampusMovements(movRes.value.data.data);
      }
      if (statsRes.status === 'fulfilled' && statsRes.value?.data?.data) {
        setCampusMovementStats(statsRes.value.data.data);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load campus movements:', err);
    } finally {
      setLoadingCampusMovements(false);
    }
  }, [campusMovementSearch, selectedDate, campusMovementDirection, campusMovementRole]);

  // 0. Fetch Real-time Dashboard KPI stats
  const fetchWatchmanStats = useCallback(async () => {
    try {
      const res = await getWatchmanStats();
      if (res.data?.success && res.data?.data) {
        setWatchmanStats(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch watchman KPI stats:', err);
    }
  }, []);

  // Fetch Bus tracking stats
  const fetchBusStats = useCallback(async () => {
    try {
      const res = await getBusTrackingStats();
      if (res.data?.success && res.data?.data) {
        setBusStats(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch bus tracking stats:', err);
    }
  }, []);

  // Fetch Staff Movements
  const fetchStaffMovements = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoadingStaffMovements(true);
      const res = await getStaffMovements({
        search: staffSearch,
        direction: staffDirectionFilter !== 'All' ? staffDirectionFilter : undefined,
        movementType: staffDirectionFilter !== 'All' ? staffDirectionFilter : undefined
      });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setStaffMovements(list);
    } catch (err) {
      console.error('Failed to load staff movements:', err);
      setStaffMovements([]);
    } finally {
      if (showLoader) setLoadingStaffMovements(false);
    }
  }, [staffSearch, staffDirectionFilter]);

  // Handle Quick Student Checkout from Admin
  const handleQuickStudentCheckout = async (student) => {
    const sId = student.studentId || student.id;
    const name = student.studentName || student.name;
    if (!window.confirm(`Confirm gate exit for Student: ${name} (ID: ${sId})?`)) return;
    try {
      setActionLoadingId(student._id || sId);
      const res = await recordStudentCheckout({
        studentId: sId,
        gate: 'Gate 1 (Main Entrance)',
        remarks: 'Admin Gate Exit Confirmation'
      });
      if (res.data?.success) {
        setScanSuccessMsg(`Checkout confirmed for ${name}!`);
        fetchTracking(false);
        fetchWatchmanStats();
        fetchActivities();
        if (scanResult) setScanResult(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Student checkout failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Student Check-in from Admin
  const handleQuickStudentCheckin = async (student) => {
    const sId = student.studentId || student.id;
    const name = student.studentName || student.name;
    try {
      setActionLoadingId(student._id || sId);
      const res = await recordStudentCheckin({
        studentId: sId,
        gate: 'Gate 1 (Main Entrance)',
        remarks: 'Admin Gate Entry Confirmation'
      });
      if (res.data?.success) {
        setScanSuccessMsg(`Check-in confirmed for ${name}!`);
        fetchTracking(false);
        fetchWatchmanStats();
        fetchActivities();
        if (scanResult) setScanResult(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Student check-in failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Staff Exit from Admin
  const handleQuickStaffExit = async (staffItem) => {
    const name = staffItem.staffName || staffItem.name;
    const id = staffItem.staffId || staffItem.personId;
    if (!window.confirm(`Confirm campus departure for Staff: ${name} (${id})?`)) return;
    try {
      setActionLoadingId(staffItem._id);
      const res = await recordStaffMovement({
        personId: id,
        name: name,
        department: staffItem.department,
        designation: staffItem.designation || 'Staff',
        movementType: 'Out',
        reason: 'Shift Completion / Campus Departure',
        gate: staffItem.gate || 'Gate 1'
      });
      if (res.data?.success) {
        fetchStaffMovements(false);
        fetchWatchmanStats();
        fetchActivities();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Staff departure logging failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Visitor Checkout from Admin
  const handleQuickVisitorCheckout = async (visitor) => {
    if (!window.confirm(`Confirm departure checkout for Visitor: ${visitor.name} (Pass #${visitor.passNumber || 'PASS'})?`)) return;
    try {
      setActionLoadingId(visitor._id);
      const res = await recordVisitorExit(visitor._id);
      if (res.data?.success) {
        fetchLogistics();
        fetchWatchmanStats();
        fetchActivities();
        if (scanResult) setScanResult(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Visitor checkout failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Visitor Admit from Admin
  const handleQuickVisitorAdmit = async (visitor) => {
    try {
      setActionLoadingId(visitor._id);
      const res = await admitPreRegisteredVisitor(visitor._id, { gate: 'Gate 1' });
      if (res.data?.success) {
        fetchLogistics();
        fetchWatchmanStats();
        fetchActivities();
        if (scanResult) setScanResult(null);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Visitor admission failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Scan / Lookup
  const handleScanLookup = async (e) => {
    if (e) e.preventDefault();
    if (!scanQuery.trim()) return;
    setScanSearching(true);
    setScanError('');
    setScanSuccessMsg('');
    setScanResult(null);

    const q = scanQuery.trim();
    try {
      // 1. Try student lookup
      const stuRes = await lookupStudentQr(q).catch(() => null);
      if (stuRes?.data?.success && stuRes.data.data) {
        setScanResult({ type: 'student', data: stuRes.data.data });
        return;
      }

      // 2. Try visitor pass lookup
      const visRes = await verifyVisitorPass(q).catch(() => null);
      if (visRes?.data?.success && visRes.data.data) {
        setScanResult({ type: 'visitor', data: visRes.data.data });
        return;
      }

      // 3. Match from local student tracking / directory
      const localStu = qrDirectory.find(s =>
        (s.id && s.id.toLowerCase() === q.toLowerCase()) ||
        (s.qrCode && s.qrCode.toLowerCase() === q.toLowerCase())
      ) || trackingData.find(t =>
        (t.studentId && t.studentId.toLowerCase() === q.toLowerCase())
      );
      if (localStu) {
        const isInside = localStu.status === 'Inside Campus' || trackingData.some(t => t.studentId === localStu.id && t.status === 'Inside Campus');
        setScanResult({
          type: 'student',
          data: {
            id: localStu.id || localStu.studentId,
            name: localStu.name || localStu.studentName,
            department: localStu.department,
            course: localStu.course,
            photoUrl: localStu.photoUrl,
            isInside
          }
        });
        return;
      }

      setScanError(`No student or visitor record found matching "${q}"`);
    } catch (err) {
      setScanError(err.response?.data?.message || 'Lookup failed');
    } finally {
      setScanSearching(false);
    }
  };

  // Eagerly load all tabs on initial mount so all badges immediately show live data
  useEffect(() => {
    fetchWatchmanStats();
    fetchBusStats();
    fetchStaffMovements();
    fetchTracking(true);
    fetchActivities();
    fetchAttendance();
    fetchLogistics();
    fetchReport();
    fetchDirectory();
    fetchCampusMovementsData();
  }, []);

  // Reload data when switching active tab
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchWatchmanStats();
      fetchBusStats();
      fetchTracking(false);
      fetchStaffMovements(false);
      fetchLogistics();
      fetchActivities();
      fetchCampusMovementsData(false);
    } else if (activeTab === 'student_tracking') fetchTracking(true);
    else if (activeTab === 'staff_movements') fetchStaffMovements(true);
    else if (activeTab === 'live_feed') fetchActivities();
    else if (activeTab === 'attendance') fetchAttendance();
    else if (activeTab === 'visitors_logistics') fetchLogistics();
    else if (activeTab === 'daily_report') fetchReport();
    else if (activeTab === 'student_qr_directory') fetchDirectory();
    else if (activeTab === 'campus_movements') fetchCampusMovementsData(true);
  }, [activeTab, fetchWatchmanStats, fetchBusStats, fetchStaffMovements, fetchTracking, fetchActivities, fetchAttendance, fetchLogistics, fetchReport, fetchDirectory, fetchCampusMovementsData]);

  // Real-time synchronization via WebSockets
  useRealtimeSync({
    modules: ['watchman', 'student_tracking', 'campus_gate', 'campus_movement', 'campus_people', 'buses', 'employee-attendance', 'visitor', 'parcel'],
    onSync: () => {
      if (autoRefresh) {
        fetchWatchmanStats();
        fetchBusStats();
        if (activeTab === 'dashboard') {
          fetchTracking(false);
          fetchStaffMovements(false);
          fetchLogistics();
          fetchActivities();
        } else if (activeTab === 'student_tracking') fetchTracking(false);
        else if (activeTab === 'staff_movements') fetchStaffMovements(false);
        else if (activeTab === 'live_feed') fetchActivities();
        else if (activeTab === 'attendance') fetchAttendance();
        else if (activeTab === 'visitors_logistics') fetchLogistics();
        else if (activeTab === 'daily_report') fetchReport();
        else if (activeTab === 'student_qr_directory') fetchDirectory();
        else if (activeTab === 'campus_movements') fetchCampusMovementsData(false);
      }
    }
  });

  // Polling fallback
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchWatchmanStats();
      if (activeTab === 'dashboard' || activeTab === 'student_tracking') fetchTracking(false);
      if (activeTab === 'dashboard' || activeTab === 'live_feed') fetchActivities();
      if (activeTab === 'dashboard' || activeTab === 'staff_movements') fetchStaffMovements(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, activeTab, fetchWatchmanStats, fetchTracking, fetchActivities, fetchStaffMovements]);

  // Copy QR helper
  const handleCopyQr = (qrString) => {
    if (!qrString) return;
    navigator.clipboard.writeText(qrString);
    setCopiedQr(true);
    setTimeout(() => setCopiedQr(false), 2000);
  };

  // Export Staff CSV
  const handleExportStaffCsv = () => {
    if (!staffMovements.length) {
      alert('No staff movement data to export.');
      return;
    }
    const headers = ['Movement ID', 'Staff ID', 'Staff Name', 'Department', 'Designation', 'Direction', 'Gate', 'Watchman', 'Timestamp', 'Reason'];
    const rows = staffMovements.map(s => [
      `"${s.movementId || ''}"`,
      `"${s.staffId || s.personId || ''}"`,
      `"${s.staffName || s.name || ''}"`,
      `"${s.department || ''}"`,
      `"${s.designation || ''}"`,
      `"${s.movementType || s.direction || ''}"`,
      `"${s.gate || ''}"`,
      `"${s.watchmanName || ''}"`,
      `"${s.timestamp ? new Date(s.timestamp).toLocaleString('en-IN') : ''}"`,
      `"${s.reason || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `staff_gate_movements_${selectedDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!trackingData.length) {
      alert('No data to export.');
      return;
    }
    const headers = ['Entry ID', 'Student ID', 'Student Name', 'Department', 'Course', 'Status', 'Check In Time', 'Entry Gate', 'Check Out Time', 'Exit Gate', 'Duration', 'Watchman'];
    const rows = trackingData.map(d => [
      `"${d.entryId}"`,
      `"${d.studentId}"`,
      `"${d.studentName}"`,
      `"${d.department || ''}"`,
      `"${d.course || ''}"`,
      `"${d.status}"`,
      `"${d.checkInTime ? new Date(d.checkInTime).toLocaleString('en-IN') : ''}"`,
      `"${d.entryGate || ''}"`,
      `"${d.checkOutTime ? new Date(d.checkOutTime).toLocaleString('en-IN') : 'Inside Campus'}"`,
      `"${d.exitGate || ''}"`,
      `"${d.durationFormatted || ''}"`,
      `"${d.entryWatchmanName || ''}${d.exitWatchmanName ? ' / ' + d.exitWatchmanName : ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_watchman_tracking_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="awt-container">
      {/* Top Header Banner */}
      <div className="awt-header">
        <div className="awt-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <ShieldCheck size={26} style={{ color: '#2563eb' }} />
            <span>Campus Gate Security & Access Monitoring</span>
            <div className="awt-live-pill" style={{ marginLeft: '4px' }}>
              <span className="awt-pulse-dot" />
              <span>ADMIN OVERSIGHT</span>
            </div>
          </h1>
          <p>Real-time oversight of campus gate entries, student/staff presence, visitor logs, and guard activity</p>
        </div>

        <div className="awt-header-actions">
          <button
            type="button"
            className="awt-btn"
            style={{ background: '#059669', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setActiveTab('campus_movements')}
            title="1-Click Campus Entry & Exit Register"
          >
            <ArrowLeftRight size={15} />
            <span>Campus In & Out Gate</span>
          </button>

          <button
            type="button"
            className="awt-btn awt-btn-primary"
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setScanModalOpen(true); setScanResult(null); setScanError(''); setScanSuccessMsg(''); }}
            title="Scan or Verify Student QR & Visitor Gate Pass"
          >
            <QrCode size={15} />
            <span>Scan / Verify Gate QR</span>
          </button>

          <button
            type="button"
            className="awt-btn awt-btn-secondary"
            onClick={() => navigate('/watchman/register-person')}
            title="Register new student, staff, or visitor person"
          >
            <UserPlus size={15} />
            <span>Register Person</span>
          </button>

          <button
            type="button"
            className="awt-btn awt-btn-secondary"
            onClick={() => {
              fetchWatchmanStats();
              fetchBusStats();
              fetchStaffMovements(true);
              fetchTracking(true);
              fetchActivities();
              fetchAttendance();
              fetchLogistics();
              fetchReport();
              fetchDirectory();
              fetchCampusMovementsData(true);
            }}
            title="Refresh all real-time registers"
          >
            <RefreshCw size={15} />
            <span>Refresh All</span>
          </button>

          <button
            type="button"
            className="awt-btn awt-btn-secondary"
            onClick={handleExportCsv}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Modern ERP Segmented Controls */}
      <div className="awt-tabs">
        <button
          type="button"
          className={`awt-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <BarChart2 size={16} />
          <span>Dashboard</span>
          <span className="awt-tab-badge">Overview</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'student_tracking' ? 'active' : ''}`}
          onClick={() => setActiveTab('student_tracking')}
        >
          <ScanLine size={16} />
          <span>Campus QR Tracking</span>
          <span className="awt-tab-badge">{(watchmanStats.studentsInside || stats.insideCampus || 0)} Inside</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'staff_movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff_movements')}
        >
          <UserCheck size={16} />
          <span>Staff Gate Register</span>
          <span className="awt-tab-badge">{(watchmanStats.staffInside || staffMovements.filter(s => s.direction === 'In' || s.movementType === 'In').length || 0)} On Campus</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'campus_movements' ? 'active' : ''}`}
          onClick={() => setActiveTab('campus_movements')}
        >
          <ArrowLeftRight size={16} />
          <span>Campus In / Out Log</span>
          <span className="awt-tab-badge">{campusMovements.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'visitors_logistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('visitors_logistics')}
        >
          <Car size={16} />
          <span>Visitors & Logistics</span>
          <span className="awt-tab-badge">{visitorsList.length + vehiclesList.length + parcelsList.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <Clock size={16} />
          <span>Guard Attendance</span>
          <span className="awt-tab-badge">{attendanceList.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'live_feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_feed')}
        >
          <Activity size={16} />
          <span>Live Security Feed</span>
          <span className="awt-tab-badge">{activities.length}</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'daily_report' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily_report')}
        >
          <BarChart2 size={16} />
          <span>Daily Movement Reports</span>
        </button>

        <button
          type="button"
          className={`awt-tab ${activeTab === 'student_qr_directory' ? 'active' : ''}`}
          onClick={() => setActiveTab('student_qr_directory')}
        >
          <QrCode size={16} />
          <span>Student QR Directory</span>
          <span className="awt-tab-badge">{qrDirectory.length}</span>
        </button>
      </div>

      {/* ──────────────── TAB 0: UNIFIED DASHBOARD OVERVIEW ──────────────── */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 8 Real-Time Stat KPI Cards */}
          <div className="awt-kpi-grid">
            {/* 1. Students on Campus */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#2563eb' }} onClick={() => setActiveTab('student_tracking')}>
              <div className="awt-kpi-info">
                <h5>Students on Campus</h5>
                <div className="val" style={{ color: '#2563eb' }}>{watchmanStats.studentsInside || stats.insideCampus || 0}</div>
                <div className="sub">{qrDirectory.length || watchmanStats.todayTotalStudents || 0} total registered students</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <GraduationCap size={24} />
              </div>
            </div>

            {/* 2. Staff on Campus */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#059669' }} onClick={() => setActiveTab('staff_movements')}>
              <div className="awt-kpi-info">
                <h5>Staff on Campus</h5>
                <div className="val" style={{ color: '#059669' }}>{watchmanStats.staffInside || staffMovements.filter(s => s.direction === 'In' || s.movementType === 'In').length || 0}</div>
                <div className="sub">Faculty & staff present</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
                <UserCheck size={24} />
              </div>
            </div>

            {/* 3. Visitors Inside */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#7c3aed' }} onClick={() => setActiveTab('visitors_logistics')}>
              <div className="awt-kpi-info">
                <h5>Visitors Inside</h5>
                <div className="val" style={{ color: '#7c3aed' }}>{watchmanStats.visitorsInside || visitorsList.filter(v => v.status === 'Inside').length || 0}</div>
                <div className="sub">{watchmanStats.expectedVisitors || preRegList.length || 0} pre-registered</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                <Users size={24} />
              </div>
            </div>

            {/* 4. Vehicles Parked */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#0891b2' }} onClick={() => { setActiveTab('visitors_logistics'); setLogisticsSubtab('vehicles'); }}>
              <div className="awt-kpi-info">
                <h5>Vehicles Parked</h5>
                <div className="val" style={{ color: '#0891b2' }}>{watchmanStats.vehiclesInside || vehiclesList.filter(v => v.status === 'Inside').length || 0}</div>
                <div className="sub">Campus bays monitored</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
                <Car size={24} />
              </div>
            </div>

            {/* 5. Parcels at Gate */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#d97706' }} onClick={() => { setActiveTab('visitors_logistics'); setLogisticsSubtab('parcels'); }}>
              <div className="awt-kpi-info">
                <h5>Parcels at Gate</h5>
                <div className="val" style={{ color: '#d97706' }}>{watchmanStats.parcelsAtGate || parcelsList.filter(p => p.status === 'Received at Gate').length || 0}</div>
                <div className="sub">Awaiting recipient pickup</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                <Package size={24} />
              </div>
            </div>

            {/* 6. Active Security Alerts */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#dc2626' }} onClick={() => setActiveTab('live_feed')}>
              <div className="awt-kpi-info">
                <h5>Security Alerts</h5>
                <div className="val" style={{ color: watchmanStats.openIncidents > 0 ? '#dc2626' : '#16a34a' }}>
                  {watchmanStats.openIncidents || 0}
                </div>
                <div className="sub">{watchmanStats.openIncidents > 0 ? 'Review incident reporter' : 'Campus post secure'}</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: watchmanStats.openIncidents > 0 ? '#fef2f2' : '#f0fdf4', color: watchmanStats.openIncidents > 0 ? '#dc2626' : '#16a34a' }}>
                <ShieldAlert size={24} />
              </div>
            </div>

            {/* 7. Buses on Campus */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#0284c7' }} onClick={() => navigate('/admin/bus-gate-tracking')}>
              <div className="awt-kpi-info">
                <h5>Buses on Campus</h5>
                <div className="val" style={{ color: '#0284c7' }}>{busStats.insideCampus || 0}</div>
                <div className="sub">{busStats.totalRegistered || 0} total fleet registered</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
                <Bus size={24} />
              </div>
            </div>

            {/* 8. Active Guards on Duty */}
            <div className="awt-kpi-card" style={{ '--accent-bar': '#4f46e5' }} onClick={() => setActiveTab('attendance')}>
              <div className="awt-kpi-info">
                <h5>Guards on Duty</h5>
                <div className="val" style={{ color: '#4f46e5' }}>
                  {attendanceList.filter(a => a.status === 'Active' || a.status === 'On Duty' || !a.clockOutTime).length || 1}
                </div>
                <div className="sub">Active gate shifts</div>
              </div>
              <div className="awt-kpi-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                <ShieldCheck size={24} />
              </div>
            </div>
          </div>

          {/* Quick Action Banners Grid (matching Watchman Command Center) */}
          <div className="awt-action-grid">
            {/* Action 1: Campus In & Out Gate */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => setActiveTab('campus_movements')}
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 2px 6px rgba(5,150,105,0.25)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><ArrowLeftRight size={22} /></div>
                <div>
                  <div className="title">Campus In & Out Gate</div>
                  <div className="desc">1-Click entry & exit for registered people</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Action 2: Register New Person */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => navigate('/watchman/register-person')}
              style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6)', boxShadow: '0 2px 6px rgba(20,184,166,0.25)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><UserPlus size={22} /></div>
                <div>
                  <div className="title">Register New Person</div>
                  <div className="desc">Students, Staff, HODs & Guests + QR Pass</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Action 3: Gate QR Scanner */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => { setScanModalOpen(true); setScanResult(null); setScanError(''); setScanSuccessMsg(''); }}
              style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 2px 6px rgba(37,99,235,0.2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><QrCode size={22} /></div>
                <div>
                  <div className="title">Gate QR Scanner</div>
                  <div className="desc">Webcam scan • Campus In & Out</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Action 4: Log Student Movement */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => setActiveTab('student_tracking')}
              style={{ background: 'linear-gradient(135deg, #4338ca, #3b82f6)', boxShadow: '0 2px 6px rgba(59,130,246,0.25)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><GraduationCap size={22} /></div>
                <div>
                  <div className="title">Log Student Movement</div>
                  <div className="desc">Identify by Roll No & track In/Out</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Action 5: Staff Gate Register */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => setActiveTab('staff_movements')}
              style={{ background: 'linear-gradient(135deg, #047857, #059669)', boxShadow: '0 2px 6px rgba(5,150,105,0.2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><UserCheck size={22} /></div>
                <div>
                  <div className="title">Staff Gate Register</div>
                  <div className="desc">Log faculty & staff movements</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Action 6: New Visitor Entry */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => navigate('/watchman/visitor-entry')}
              style={{ background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', boxShadow: '0 2px 6px rgba(124,58,237,0.2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><Users size={22} /></div>
                <div>
                  <div className="title">New Visitor Entry</div>
                  <div className="desc">Issue QR badge & verify pass</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>

            {/* Action 7: Bus Entry Tracking */}
            <button
              type="button"
              className="awt-action-card"
              onClick={() => navigate('/admin/bus-gate-tracking')}
              style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', boxShadow: '0 2px 6px rgba(14,165,233,0.25)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="icon-box"><Bus size={22} /></div>
                <div>
                  <div className="title">Bus Entry Tracking</div>
                  <div className="desc">{busStats.insideCampus > 0 ? `${busStats.insideCampus} Buses Inside Campus` : 'Log Arrival & Departure'}</div>
                </div>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Interactive Live Gate Personnel Switcher (Students, Staff, Visitors, Campus Movements) */}
          <div className="awt-switcher-card">
            <div className="awt-switcher-header">
              <div className="awt-role-tabs">
                <button
                  type="button"
                  className={`awt-role-tab ${dashPersonnelTab === 'students' ? 'active' : ''}`}
                  onClick={() => setDashPersonnelTab('students')}
                >
                  <GraduationCap size={16} />
                  <span>Students ({trackingData.filter(t => t.status === 'Inside Campus').length})</span>
                </button>

                <button
                  type="button"
                  className={`awt-role-tab ${dashPersonnelTab === 'staff' ? 'active' : ''}`}
                  onClick={() => setDashPersonnelTab('staff')}
                >
                  <UserCheck size={16} />
                  <span>Staff ({staffMovements.filter(s => s.direction === 'In' || s.movementType === 'In').length})</span>
                </button>

                <button
                  type="button"
                  className={`awt-role-tab ${dashPersonnelTab === 'visitors' ? 'active' : ''}`}
                  onClick={() => setDashPersonnelTab('visitors')}
                >
                  <Users size={16} />
                  <span>Visitors ({visitorsList.filter(v => v.status === 'Inside').length})</span>
                </button>

                <button
                  type="button"
                  className={`awt-role-tab ${dashPersonnelTab === 'campus_in_out' ? 'active' : ''}`}
                  onClick={() => setDashPersonnelTab('campus_in_out')}
                >
                  <ArrowLeftRight size={16} />
                  <span>Campus In / Out ({campusMovements.length})</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="awt-search-wrap" style={{ minWidth: '260px' }}>
                  <Search size={15} />
                  <input
                    type="text"
                    className="awt-search-input"
                    placeholder="Search active personnel by name, ID, role..."
                    value={dashPersonnelSearch}
                    onChange={(e) => setDashPersonnelSearch(e.target.value)}
                  />
                </div>
                {dashPersonnelTab === 'students' && (
                  <button type="button" className="awt-btn awt-btn-secondary" onClick={() => setActiveTab('student_tracking')}>
                    View Full Student Log →
                  </button>
                )}
                {dashPersonnelTab === 'staff' && (
                  <button type="button" className="awt-btn awt-btn-secondary" onClick={() => setActiveTab('staff_movements')}>
                    View Full Staff Log →
                  </button>
                )}
                {dashPersonnelTab === 'visitors' && (
                  <button type="button" className="awt-btn awt-btn-secondary" onClick={() => setActiveTab('visitors_logistics')}>
                    View Full Visitor Log →
                  </button>
                )}
                {dashPersonnelTab === 'campus_in_out' && (
                  <button type="button" className="awt-btn awt-btn-secondary" onClick={() => setActiveTab('campus_movements')}>
                    View Full Campus Movements →
                  </button>
                )}
              </div>
            </div>

            {/* Personnel View: Students Tab */}
            {dashPersonnelTab === 'students' && (
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Department & Course</th>
                      <th>Check In Time</th>
                      <th>Entry Gate</th>
                      <th>Status</th>
                      <th>Gate Pass</th>
                      <th>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trackingData
                      .filter(s => {
                        const q = dashPersonnelSearch.toLowerCase();
                        if (q && !(
                          (s.studentName && s.studentName.toLowerCase().includes(q)) ||
                          (s.studentId && s.studentId.toLowerCase().includes(q)) ||
                          (s.department && s.department.toLowerCase().includes(q))
                        )) return false;
                        return true;
                      })
                      .slice(0, 8)
                      .map(s => (
                        <tr key={s._id || s.entryId}>
                          <td>
                            <div className="awt-student-cell">
                              {s.photoUrl ? (
                                <img src={s.photoUrl} alt={s.studentName} className="awt-student-avatar" />
                              ) : (
                                <div className="awt-student-avatar">{s.studentName?.charAt(0)?.toUpperCase() || 'S'}</div>
                              )}
                              <div>
                                <div className="awt-student-name">{s.studentName}</div>
                                <span className="awt-student-id">{s.studentId}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.department || 'General'}</div>
                            <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{s.course || 'Degree'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{formatTimeOnly(s.checkInTime)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDateTime(s.checkInTime)}</div>
                          </td>
                          <td>{s.entryGate || 'Main Gate'}</td>
                          <td>
                            <span className={`awt-badge ${s.status === 'Inside Campus' ? 'inside' : 'checked-out'}`}>
                              {s.status === 'Inside Campus' && <span className="awt-pulse-dot" style={{ width: '6px', height: '6px' }} />}
                              {s.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="awt-qr-btn"
                              onClick={() => setSelectedStudentForQr({
                                id: s.studentId,
                                name: s.studentName,
                                department: s.department,
                                course: s.course,
                                photoUrl: s.photoUrl,
                                qrCode: s.qrCode || `STU-QR-${s.studentId}`
                              })}
                            >
                              <QrCode size={13} />
                              <span>View Pass</span>
                            </button>
                          </td>
                          <td>
                            {s.status === 'Inside Campus' ? (
                              <button
                                type="button"
                                className="awt-btn"
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                                disabled={actionLoadingId === (s._id || s.studentId)}
                                onClick={() => handleQuickStudentCheckout(s)}
                              >
                                <ExitIcon size={13} />
                                <span>Check Out</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {trackingData.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No student records recorded today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Personnel View: Staff Tab */}
            {dashPersonnelTab === 'staff' && (
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Staff Member</th>
                      <th>Department & Role</th>
                      <th>Direction</th>
                      <th>Gate Post</th>
                      <th>Timestamp</th>
                      <th>Watchman</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMovements
                      .filter(s => {
                        const q = dashPersonnelSearch.toLowerCase();
                        if (q && !(
                          (s.staffName && s.staffName.toLowerCase().includes(q)) ||
                          (s.staffId && s.staffId.toLowerCase().includes(q)) ||
                          (s.department && s.department.toLowerCase().includes(q))
                        )) return false;
                        return true;
                      })
                      .slice(0, 8)
                      .map(s => {
                        const isIn = s.movementType === 'In' || s.direction === 'In';
                        return (
                          <tr key={s._id || s.movementId}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{s.staffName || s.name}</div>
                              <span className="awt-student-id">{s.staffId || s.personId}</span>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{s.department || 'General'}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{s.designation || 'Staff'}</div>
                            </td>
                            <td>
                              <span className={`awt-badge ${isIn ? 'inside' : 'checked-out'}`}>
                                {isIn ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                                {isIn ? 'Campus In' : 'Campus Out'}
                              </span>
                            </td>
                            <td>{s.gate || 'Gate 1'}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{formatTimeOnly(s.timestamp)}</div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{formatDateTime(s.timestamp)}</div>
                            </td>
                            <td>{s.watchmanName || 'Security'}</td>
                            <td>
                              {isIn ? (
                                <button
                                  type="button"
                                  className="awt-btn"
                                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                                  disabled={actionLoadingId === s._id}
                                  onClick={() => handleQuickStaffExit(s)}
                                >
                                  <ExitIcon size={13} />
                                  <span>Log Exit</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Completed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {staffMovements.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No staff movements recorded today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Personnel View: Visitors Tab */}
            {dashPersonnelTab === 'visitors' && (
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Pass #</th>
                      <th>Visitor Details</th>
                      <th>Host / Person to Meet</th>
                      <th>Purpose</th>
                      <th>Entry Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorsList
                      .filter(v => {
                        const q = dashPersonnelSearch.toLowerCase();
                        if (q && !(
                          (v.name && v.name.toLowerCase().includes(q)) ||
                          (v.phone && v.phone.includes(q)) ||
                          (v.personToMeet && v.personToMeet.toLowerCase().includes(q))
                        )) return false;
                        return true;
                      })
                      .slice(0, 8)
                      .map(v => {
                        const isInside = v.status === 'Inside';
                        return (
                          <tr key={v._id}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{v.passNumber || 'PASS'}</strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.phone}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{v.personToMeet}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.department}</div>
                            </td>
                            <td>{v.purpose}</td>
                            <td>{formatDateTime(v.entryTime)}</td>
                            <td>
                              <span className={`awt-badge ${isInside ? 'inside' : 'checked-out'}`}>
                                {v.status}
                              </span>
                            </td>
                            <td>
                              {isInside ? (
                                <button
                                  type="button"
                                  className="awt-btn"
                                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                                  disabled={actionLoadingId === v._id}
                                  onClick={() => handleQuickVisitorCheckout(v)}
                                >
                                  <ExitIcon size={13} />
                                  <span>Check Out</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Checked Out</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {visitorsList.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No visitor records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Personnel View: Campus Movements Tab */}
            {dashPersonnelTab === 'campus_in_out' && (
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Movement ID</th>
                      <th>Person Details</th>
                      <th>Role & Dept</th>
                      <th>Direction</th>
                      <th>Time</th>
                      <th>Gate</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campusMovements
                      .filter(m => {
                        const q = dashPersonnelSearch.toLowerCase();
                        if (q && !(
                          (m.name && m.name.toLowerCase().includes(q)) ||
                          (m.personId && m.personId.toLowerCase().includes(q))
                        )) return false;
                        return true;
                      })
                      .slice(0, 8)
                      .map(m => {
                        const isIn = m.direction === 'In' || m.movementType === 'In';
                        return (
                          <tr key={m._id || m.movementId}>
                            <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{m.movementId}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{m.name}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>ID: {m.personId}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: m.personType === 'Student' ? '#eff6ff' : '#ecfdf5', color: m.personType === 'Student' ? '#1d4ed8' : '#047857' }}>
                                {m.personType}
                              </span>
                              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>{m.department}</div>
                            </td>
                            <td>
                              <span className={`awt-badge ${isIn ? 'inside' : 'checked-out'}`}>
                                {isIn ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
                                {isIn ? 'Campus In' : 'Campus Out'}
                              </span>
                            </td>
                            <td>{formatDateTime(m.timestamp)}</td>
                            <td>{m.gate || 'Gate 1'}</td>
                            <td>{m.remarks || m.reason || 'Normal'}</td>
                          </tr>
                        );
                      })}
                    {campusMovements.length === 0 && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No campus movements logged yet today.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Two Column Spotlight Layout: Left = Parcels & Vehicles; Right = Live Security Feed */}
          <div className="awt-spotlight-grid">
            {/* Spotlight Left: Active Logistics */}
            <div className="awt-spotlight-card">
              <div className="awt-spotlight-title">
                <h3><Package size={18} style={{ color: '#d97706' }} /> Gate Parcels & Logistics</h3>
                <button type="button" className="awt-btn awt-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setActiveTab('visitors_logistics'); setLogisticsSubtab('parcels'); }}>
                  View All Parcels ({parcelsList.length}) →
                </button>
              </div>

              {parcelsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No active parcels awaiting delivery at gate.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {parcelsList.slice(0, 4).map(p => (
                    <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.recipientName} ({p.department})</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Courier: {p.courierCompany} • Tracking: #{p.trackingNumber || p.parcelId}</div>
                        </div>
                      </div>
                      <span className={`awt-badge ${p.status === 'Received at Gate' ? 'inside' : 'checked-out'}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Spotlight Right: Security Activity Feed */}
            <div className="awt-spotlight-card">
              <div className="awt-spotlight-title">
                <h3><Activity size={18} style={{ color: '#2563eb' }} /> Live Security Activity Stream</h3>
                <button type="button" className="awt-btn awt-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setActiveTab('live_feed')}>
                  Full Audit Log ({activities.length}) →
                </button>
              </div>

              {activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No real-time security events logged yet today.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activities.slice(0, 4).map((act, i) => (
                    <div key={act._id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Shield size={18} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{act.title || act.action || 'Gate Event'}</div>
                          <div style={{ fontSize: '0.74rem', color: '#475569' }}>{act.description}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 1: STUDENT QR & CAMPUS TRACKING ──────────────── */}
      {activeTab === 'student_tracking' && (
        <>
          {/* Stat Cards */}
          <div className="awt-stats-grid">
            <div className="awt-stat-card">
              <div className="awt-stat-icon green">
                <Users size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Inside Campus</h3>
                <div className="val" style={{ color: '#059669' }}>{stats.insideCampus || 0}</div>
                <div className="sub">Currently on campus grounds</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon blue">
                <ArrowRight size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Total Check-ins Today</h3>
                <div className="val">{stats.totalScansToday || 0}</div>
                <div className="sub">Gate scans logged</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon purple">
                <ArrowLeft size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Checked Out Today</h3>
                <div className="val">{stats.checkedOutToday || 0}</div>
                <div className="sub">Departed campus</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon amber">
                <Clock size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Avg Time on Campus</h3>
                <div className="val" style={{ fontSize: '1.25rem' }}>{stats.averageDurationFormatted || '0 mins'}</div>
                <div className="sub">Completed visits today</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search by student name, ID, mobile number, department, or guard name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="awt-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter by Entry Date"
              />
              {selectedDate ? (
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedDate('')}
                  title="View all recorded dates"
                >
                  All Dates
                </button>
              ) : (
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedDate(todayStr)}
                  title="Filter by Today"
                >
                  Today
                </button>
              )}
            </div>

            <select
              className="awt-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Inside Campus">Inside Campus Only</option>
              <option value="Checked Out">Checked Out Only</option>
            </select>

            <select
              className="awt-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronics">Electronics</option>
              <option value="Information Technology">Information Technology</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={() => {
                setSearch('');
                setSelectedDate(todayStr);
                setStatusFilter('All');
                setDeptFilter('All');
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Table */}
          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <Users size={18} style={{ color: '#2563eb' }} />
                <span>Student Entry & Exit Records ({trackingData.length})</span>
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Department & Course</th>
                    <th>QR Pass</th>
                    <th>Check-in (Entry)</th>
                    <th>Check-out (Exit)</th>
                    <th>Duration on Campus</th>
                    <th>Status</th>
                    <th>Watchman / Guard</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTracking ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563eb' }} />
                        Loading student gate records...
                      </td>
                    </tr>
                  ) : trackingData.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No student check-in / check-out records found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    trackingData.map((item) => (
                      <tr key={item._id || item.entryId}>
                        <td>
                          <div className="awt-student-cell">
                            {item.photoUrl ? (
                              <img src={item.photoUrl} alt={item.studentName} className="awt-student-avatar" />
                            ) : (
                              <div className="awt-student-avatar">
                                {item.studentName?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                            )}
                            <div>
                              <div className="awt-student-name">{item.studentName}</div>
                              <span className="awt-student-id">{item.studentId}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{item.department || 'General'}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{item.course || 'Degree'}{item.semester ? ` • Sem ${item.semester}` : ''}</div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="awt-qr-btn"
                            onClick={() => setSelectedStudentForQr({
                              id: item.studentId,
                              name: item.studentName,
                              department: item.department,
                              course: item.course,
                              photoUrl: item.photoUrl,
                              qrCode: item.qrCode || `STU-QR-${item.studentId}`
                            })}
                          >
                            <QrCode size={14} />
                            <span>View QR</span>
                          </button>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {formatTimeOnly(item.checkInTime)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {item.entryGate || 'Main Gate'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            {formatDateTime(item.checkInTime)}
                          </div>
                        </td>

                        <td>
                          {item.checkOutTime ? (
                            <>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                {formatTimeOnly(item.checkOutTime)}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {item.exitGate || 'Main Gate'}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                {formatDateTime(item.checkOutTime)}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.82rem' }}>
                              Inside Campus (Active)
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, color: item.status === 'Inside Campus' ? '#059669' : '#1e293b' }}>
                            {item.durationFormatted || (item.status === 'Inside Campus' ? 'Ongoing' : '—')}
                          </div>
                        </td>

                        <td>
                          {item.status === 'Inside Campus' ? (
                            <span className="awt-badge inside">
                              <span className="awt-pulse-dot" style={{ width: '6px', height: '6px' }} />
                              Inside Campus
                            </span>
                          ) : (
                            <span className="awt-badge checked-out">
                              <CheckCircle2 size={12} />
                              Checked Out
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {item.entryWatchmanName || 'Security'}
                          </div>
                          {item.exitWatchmanName && item.exitWatchmanName !== item.entryWatchmanName && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              Exit: {item.exitWatchmanName}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──────────────── TAB: STAFF GATE REGISTER ──────────────── */}
      {activeTab === 'staff_movements' && (
        <>
          {/* Stat Cards for Staff Movements */}
          <div className="awt-stats-grid">
            <div className="awt-stat-card">
              <div className="awt-stat-icon green">
                <UserCheck size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Staff on Campus</h3>
                <div className="val" style={{ color: '#059669' }}>
                  {watchmanStats.staffInside || staffMovements.filter(s => s.direction === 'In' || s.movementType === 'In').length || 0}
                </div>
                <div className="sub">Faculty & staff present inside</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon blue">
                <ArrowRight size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Today Staff Entries</h3>
                <div className="val">
                  {staffMovements.filter(s => s.direction === 'In' || s.movementType === 'In').length}
                </div>
                <div className="sub">Campus arrivals logged</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon purple">
                <ArrowLeft size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Staff Departures</h3>
                <div className="val">
                  {staffMovements.filter(s => s.direction === 'Out' || s.movementType === 'Out').length}
                </div>
                <div className="sub">Campus exits recorded</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon amber">
                <Users size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Total Movements</h3>
                <div className="val" style={{ color: '#d97706' }}>{staffMovements.length}</div>
                <div className="sub">Gate records tracked</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search staff movements by name, staff ID, department, or guard..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
              />
            </div>

            <select
              className="awt-select"
              value={staffDirectionFilter}
              onChange={(e) => setStaffDirectionFilter(e.target.value)}
            >
              <option value="All">All Directions (In & Out)</option>
              <option value="In">Campus In (Arrivals)</option>
              <option value="Out">Campus Out (Departures)</option>
            </select>

            <select
              className="awt-select"
              value={staffDeptFilter}
              onChange={(e) => setStaffDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronics">Electronics</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Administration">Administration</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={() => {
                setStaffSearch('');
                setStaffDirectionFilter('All');
                setStaffDeptFilter('All');
                fetchStaffMovements(true);
              }}
            >
              Reset Filters
            </button>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={handleExportStaffCsv}
            >
              <Download size={15} />
              <span>Export Staff CSV</span>
            </button>
          </div>

          {/* Staff Movements Table */}
          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <UserCheck size={18} style={{ color: '#059669' }} />
                <span>Faculty & Staff Gate Movement Register ({staffMovements.length})</span>
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Department & Designation</th>
                    <th>Movement Direction</th>
                    <th>Gate Post</th>
                    <th>Timestamp</th>
                    <th>Reason / Shift Details</th>
                    <th>Watchman / Guard</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStaffMovements ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#059669' }} />
                        Loading faculty & staff gate records...
                      </td>
                    </tr>
                  ) : staffMovements.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No staff movement logs found for the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    staffMovements
                      .filter(s => {
                        if (staffDeptFilter !== 'All' && s.department !== staffDeptFilter) return false;
                        return true;
                      })
                      .map((s) => {
                        const isIn = s.movementType === 'In' || s.direction === 'In';
                        return (
                          <tr key={s._id || s.movementId}>
                            <td>
                              <div className="awt-student-cell">
                                <div className="awt-student-avatar" style={{ background: '#ecfdf5', color: '#059669' }}>
                                  {s.staffName?.charAt(0)?.toUpperCase() || s.name?.charAt(0)?.toUpperCase() || 'S'}
                                </div>
                                <div>
                                  <div className="awt-student-name">{s.staffName || s.name}</div>
                                  <span className="awt-student-id">{s.staffId || s.personId}</span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div style={{ fontWeight: 600 }}>{s.department || 'General'}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.designation || 'Staff'}</div>
                            </td>

                            <td>
                              <span className={`awt-badge ${isIn ? 'inside' : 'checked-out'}`}>
                                {isIn ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
                                {isIn ? 'Campus In' : 'Campus Out'}
                              </span>
                            </td>

                            <td>
                              <div style={{ fontWeight: 600 }}>{s.gate || 'Gate 1 (Main Entrance)'}</div>
                              {s.vehicleNumber && (
                                <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>🚗 {s.vehicleNumber}</div>
                              )}
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatTimeOnly(s.timestamp)}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatDateTime(s.timestamp)}</div>
                            </td>

                            <td>
                              <div style={{ fontSize: '0.82rem', color: '#334155' }}>{s.reason || 'Official College Duty'}</div>
                              {s.remarks && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.remarks}</div>}
                            </td>

                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{s.watchmanName || 'Security'}</div>
                            </td>

                            <td>
                              {isIn ? (
                                <button
                                  type="button"
                                  className="awt-btn"
                                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}
                                  disabled={actionLoadingId === s._id}
                                  onClick={() => handleQuickStaffExit(s)}
                                >
                                  <ExitIcon size={13} />
                                  <span>Log Exit</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Completed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──────────────── TAB 2: LIVE ACTIVITY FEED ──────────────── */}
      {activeTab === 'live_feed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search live activities by description, person, or gate..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
            </div>

            <select
              className="awt-select"
              value={activityCategory}
              onChange={(e) => setActivityCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Student Entry">Student Gate Movements</option>
              <option value="Visitor Entry">Visitor Passes</option>
              <option value="Vehicle Entry">Vehicle Logs</option>
              <option value="Delivery / Parcel">Parcel Deliveries</option>
              <option value="Attendance Clock In">Guard Duty Shifts</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-primary"
              onClick={fetchActivities}
            >
              <RefreshCw size={15} />
              <span>Update Stream</span>
            </button>
          </div>

          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <Activity size={18} style={{ color: '#2563eb' }} />
                <span>Live Security Gate Operations Feed ({activities.length})</span>
              </h2>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {loadingActivities ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563eb' }} />
                  Loading activity timeline...
                </div>
              ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No security activities logged yet for this category.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activities.map((act, i) => (
                    <div
                      key={act._id || i}
                      style={{
                        padding: '14px 16px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Shield size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                            {act.title || act.action || 'Security Gate Event'}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                            {act.description}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                            Guard: <strong>{act.watchmanName || 'Security Guard'}</strong> • Gate: <strong>{act.gate || 'Main Gate'}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>
                          {formatRelativeTime(act.timestamp)}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                          {formatDateTime(act.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: GUARD ATTENDANCE & SHIFTS ──────────────── */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <Clock size={18} style={{ color: '#2563eb' }} />
                <span>Watchman Daily Attendance & Duty Shifts ({attendanceList.length})</span>
              </h2>
              <button
                type="button"
                className="awt-btn awt-btn-secondary"
                onClick={fetchAttendance}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Guard Name</th>
                    <th>Employee ID</th>
                    <th>Duty Date</th>
                    <th>Shift</th>
                    <th>Gate Post</th>
                    <th>Clock In Time</th>
                    <th>Clock Out Time</th>
                    <th>Duty Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingAttendance ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        Loading guard attendance...
                      </td>
                    </tr>
                  ) : attendanceList.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No guard attendance records logged yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceList.map((a) => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 700 }}>{a.watchmanName}</td>
                        <td><span className="awt-student-id">{a.employeeId}</span></td>
                        <td>{a.dutyDate}</td>
                        <td>
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {a.shift}
                          </span>
                        </td>
                        <td>{a.gate}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatTimeOnly(a.clockInTime)}</td>
                        <td>{a.clockOutTime ? formatTimeOnly(a.clockOutTime) : <span style={{ color: '#16a34a', fontWeight: 700 }}>On Duty Now</span>}</td>
                        <td>{a.durationFormatted || (a.clockOutTime ? 'Completed' : 'Ongoing')}</td>
                        <td>
                          <span className={`awt-badge ${a.status === 'Active' || a.status === 'On Duty' ? 'inside' : 'checked-out'}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 4: VISITORS & GATE LOGISTICS ──────────────── */}
      {activeTab === 'visitors_logistics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Subtab Selector */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'pre_registered' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('pre_registered')}
              style={{ position: 'relative' }}
            >
              <CalendarCheck size={16} />
              <span>Pre-Registered Approvals</span>
              {preRegList.filter(p => p.approvalStatus === 'Pending').length > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  marginLeft: '4px'
                }}>
                  {preRegList.filter(p => p.approvalStatus === 'Pending').length} Pending
                </span>
              )}
            </button>

            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'visitors' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('visitors')}
            >
              <Users size={16} />
              <span>Visitor Passes ({visitorsList.length})</span>
            </button>

            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'vehicles' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('vehicles')}
            >
              <Car size={16} />
              <span>Vehicle Logs ({vehiclesList.length})</span>
            </button>

            <button
              type="button"
              className={`awt-btn ${logisticsSubtab === 'parcels' ? 'awt-btn-primary' : 'awt-btn-secondary'}`}
              onClick={() => setLogisticsSubtab('parcels')}
            >
              <Package size={16} />
              <span>Parcels & Deliveries ({parcelsList.length})</span>
            </button>
          </div>

          {/* Subtab Content: Pre-Registered Appointments & Admin Approvals */}
          {logisticsSubtab === 'pre_registered' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2>
                  <CalendarCheck size={18} style={{ color: '#2563eb' }} />
                  <span>Pre-Registered Visitors & Gate Pass Approvals ({preRegList.length})</span>
                </h2>
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  onClick={fetchLogistics}
                  disabled={loadingLogistics}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Pass #</th>
                      <th>Visitor Details</th>
                      <th>Host / Person to Meet</th>
                      <th>Purpose & Vehicle</th>
                      <th>Scheduled Date & Time</th>
                      <th>Approval Status</th>
                      <th style={{ textAlign: 'right' }}>Admin Approval Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preRegList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                          No pre-registered appointments recorded yet.
                        </td>
                      </tr>
                    ) : (
                      preRegList.map(p => {
                        const isPending = p.approvalStatus === 'Pending';
                        const isApproved = p.approvalStatus === 'Approved';
                        const isRejected = p.approvalStatus === 'Rejected';

                        return (
                          <tr key={p._id}>
                            <td>
                              <strong style={{ fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: '5px' }}>
                                {p.passNumber}
                              </strong>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.name}</div>
                              <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{p.phone}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{p.personToMeet}</div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.department}</div>
                            </td>
                            <td>
                              <div>{p.purpose}</div>
                              {p.vehicleNumber && (
                                <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>🚗 {p.vehicleNumber}</div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                                {p.expectedDate ? new Date(p.expectedDate).toLocaleDateString() : 'Today'}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                {p.expectedTime || '10:00 AM'}
                              </div>
                            </td>
                            <td>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: isApproved ? '#dcfce7' : (isRejected ? '#fee2e2' : '#fef3c7'),
                                color: isApproved ? '#166534' : (isRejected ? '#991b1b' : '#92400e'),
                                border: `1px solid ${isApproved ? '#bbf7d0' : (isRejected ? '#fca5a5' : '#fde68a')}`
                              }}>
                                {isApproved ? <CheckCircle2 size={12} /> : (isRejected ? <XCircle size={12} /> : <Clock size={12} />)}
                                <span>{p.approvalStatus || 'Pending'}</span>
                              </span>
                              {p.approvedBy && isApproved && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                                  By: {p.approvedBy}
                                </div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {isPending ? (
                                  <>
                                    <button
                                      type="button"
                                      className="awt-btn"
                                      style={{
                                        background: '#059669',
                                        color: '#ffffff',
                                        padding: '5px 12px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                      }}
                                      disabled={approvalLoadingId === p._id}
                                      onClick={() => handleApprovalAction(p._id, 'Approved')}
                                    >
                                      <Check size={13} />
                                      <span>{approvalLoadingId === p._id ? 'Approving...' : 'Approve Pass'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="awt-btn"
                                      style={{
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        padding: '5px 10px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        borderRadius: '6px',
                                        border: '1px solid #fca5a5',
                                        cursor: 'pointer'
                                      }}
                                      disabled={approvalLoadingId === p._id}
                                      onClick={() => handleApprovalAction(p._id, 'Rejected')}
                                    >
                                      <span>Reject</span>
                                    </button>
                                  </>
                                ) : isApproved ? (
                                  <button
                                    type="button"
                                    className="awt-btn"
                                    style={{
                                      background: '#f8fafc',
                                      color: '#dc2626',
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      cursor: 'pointer'
                                    }}
                                    disabled={approvalLoadingId === p._id}
                                    onClick={() => handleApprovalAction(p._id, 'Rejected')}
                                  >
                                    <span>Revoke</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="awt-btn"
                                    style={{
                                      background: '#059669',
                                      color: '#ffffff',
                                      padding: '4px 10px',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      border: 'none',
                                      cursor: 'pointer'
                                    }}
                                    disabled={approvalLoadingId === p._id}
                                    onClick={() => handleApprovalAction(p._id, 'Approved')}
                                  >
                                    <span>Re-Approve</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: Visitors */}
          {logisticsSubtab === 'visitors' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2><span>Campus Visitor Logs</span></h2>
              </div>
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Visitor Name</th>
                      <th>Phone</th>
                      <th>Person to Meet</th>
                      <th>Purpose</th>
                      <th>Entry Time</th>
                      <th>Exit Time</th>
                      <th>Status</th>
                      <th>Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorsList.length === 0 ? (
                      <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No visitor records found.</td></tr>
                    ) : (
                      visitorsList.map(v => (
                        <tr key={v._id}>
                          <td style={{ fontWeight: 700 }}>{v.name}</td>
                          <td>{v.phone}</td>
                          <td>{v.personToMeet}</td>
                          <td>{v.purpose}</td>
                          <td>{formatDateTime(v.entryTime)}</td>
                          <td>{v.exitTime ? formatDateTime(v.exitTime) : 'Still Inside'}</td>
                          <td>
                            <span className={`awt-badge ${v.status === 'Inside' ? 'inside' : 'checked-out'}`}>
                              {v.status}
                            </span>
                          </td>
                          <td>{v.gate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: Vehicles */}
          {logisticsSubtab === 'vehicles' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2><span>Vehicle Gate Movements</span></h2>
              </div>
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Vehicle Number</th>
                      <th>Driver Name</th>
                      <th>Vehicle Type</th>
                      <th>Purpose</th>
                      <th>Entry Time</th>
                      <th>Exit Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehiclesList.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No vehicle logs found.</td></tr>
                    ) : (
                      vehiclesList.map(veh => (
                        <tr key={veh._id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{veh.vehicleNumber}</td>
                          <td>{veh.driverName}</td>
                          <td>{veh.vehicleType}</td>
                          <td>{veh.purpose}</td>
                          <td>{formatDateTime(veh.entryTime)}</td>
                          <td>{veh.exitTime ? formatDateTime(veh.exitTime) : 'Inside Campus'}</td>
                          <td>
                            <span className={`awt-badge ${veh.status === 'Inside' ? 'inside' : 'checked-out'}`}>
                              {veh.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab Content: Parcels */}
          {logisticsSubtab === 'parcels' && (
            <div className="awt-table-card">
              <div className="awt-table-header">
                <h2><span>Delivery & Parcel Management</span></h2>
              </div>
              <div className="awt-table-responsive">
                <table className="awt-table">
                  <thead>
                    <tr>
                      <th>Tracking / ID</th>
                      <th>Recipient</th>
                      <th>Courier Provider</th>
                      <th>Received At</th>
                      <th>Status</th>
                      <th>Gate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parcelsList.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No parcels logged.</td></tr>
                    ) : (
                      parcelsList.map(p => (
                        <tr key={p._id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{p.trackingNumber || p.parcelId}</td>
                          <td>{p.recipientName} ({p.department || 'Campus'})</td>
                          <td>{p.courierCompany}</td>
                          <td>{formatDateTime(p.receivedAt)}</td>
                          <td>
                            <span className={`awt-badge ${p.status === 'Received at Gate' ? 'inside' : 'checked-out'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>{p.gate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 5: DAILY REPORT ──────────────── */}
      {activeTab === 'daily_report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="awt-filter-card" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Select Report Date:</span>
              <input
                type="date"
                className="awt-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <button
                type="button"
                className="awt-btn awt-btn-primary"
                onClick={fetchReport}
              >
                <RefreshCw size={15} />
                <span>Generate Report</span>
              </button>
            </div>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span>Print Report</span>
            </button>
          </div>

          {loadingReport ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: '#ffffff', borderRadius: '12px' }}>
              <RefreshCw size={28} className="awt-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#2563eb' }} />
              <p style={{ color: '#64748b', fontWeight: 600 }}>Compiling campus entry and exit metrics...</p>
            </div>
          ) : dailyReport ? (
            <>
              <div className="awt-stats-grid">
                <div className="awt-stat-card">
                  <div className="awt-stat-icon blue"><ScanLine size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Total Movements</h3>
                    <div className="val">{dailyReport.summary?.totalScans || 0}</div>
                    <div className="sub">Date: {dailyReport.reportDate}</div>
                  </div>
                </div>

                <div className="awt-stat-card">
                  <div className="awt-stat-icon green"><Users size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Currently Inside</h3>
                    <div className="val" style={{ color: '#059669' }}>{dailyReport.summary?.currentlyInside || 0}</div>
                    <div className="sub">Present on campus</div>
                  </div>
                </div>

                <div className="awt-stat-card">
                  <div className="awt-stat-icon purple"><ArrowLeft size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Completed Visits</h3>
                    <div className="val">{dailyReport.summary?.checkedOut || 0}</div>
                    <div className="sub">Checked out students</div>
                  </div>
                </div>

                <div className="awt-stat-card">
                  <div className="awt-stat-icon amber"><Clock size={24} /></div>
                  <div className="awt-stat-content">
                    <h3>Average Stay</h3>
                    <div className="val" style={{ fontSize: '1.25rem' }}>{dailyReport.summary?.averageDurationFormatted || '0 mins'}</div>
                    <div className="sub">Campus duration avg</div>
                  </div>
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="awt-table-card">
                <div className="awt-table-header">
                  <h2><Building2 size={18} style={{ color: '#2563eb' }} /><span>Department Turnout Breakdown</span></h2>
                </div>
                <div className="awt-table-responsive">
                  <table className="awt-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Total Students Scanned</th>
                        <th>Currently Inside</th>
                        <th>Checked Out</th>
                        <th>Turnout Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReport.departmentBreakdown?.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No student movements for this date.</td></tr>
                      ) : (
                        dailyReport.departmentBreakdown?.map((dept, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 700 }}>{dept.department}</td>
                            <td>{dept.total}</td>
                            <td style={{ color: '#059669', fontWeight: 600 }}>{dept.inside}</td>
                            <td>{dept.checkedOut}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      width: `${dailyReport.summary?.totalScans ? Math.min(100, Math.round((dept.total / dailyReport.summary.totalScans) * 100)) : 0}%`,
                                      height: '100%',
                                      background: '#2563eb'
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                                  {dailyReport.summary?.totalScans ? Math.round((dept.total / dailyReport.summary.totalScans) * 100) : 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hourly Traffic Distribution with Visual Analytics */}
              <div className="awt-table-card">
                <div className="awt-table-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <h2><Clock size={18} style={{ color: '#2563eb' }} /><span>Hourly Traffic Distribution ({dailyReport.reportDate})</span></h2>
                  
                  {dailyReport.summary?.peakHour && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                        🔥 Peak Slot: {dailyReport.summary.peakHour} ({dailyReport.summary.peakMovements || 0} movements)
                      </span>
                      <span style={{ background: '#f8fafc', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                        Morning: {dailyReport.summary.morningVolume || 0} | Afternoon: {dailyReport.summary.afternoonVolume || 0}
                      </span>
                    </div>
                  )}
                </div>
                <div className="awt-table-responsive">
                  <table className="awt-table">
                    <thead>
                      <tr>
                        <th>Hour Slot</th>
                        <th>Check-ins (Arrivals)</th>
                        <th>Check-outs (Departures)</th>
                        <th>Total Movements</th>
                        <th style={{ minWidth: '160px' }}>Traffic Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyReport.hourlyBreakdown?.map((h, i) => {
                        const totalMoves = (h.checkIns || 0) + (h.checkOuts || 0);
                        const isHighlight = totalMoves > 0;
                        const maxMoves = dailyReport.summary?.peakMovements || 1;
                        const pct = Math.min(100, Math.round((totalMoves / maxMoves) * 100));

                        return (
                          <tr key={i} className={isHighlight ? 'awt-hour-row-highlight' : ''}>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', color: isHighlight ? '#1d4ed8' : 'inherit' }}>
                              {h.hour}
                            </td>
                            <td>
                              <span style={{
                                color: h.checkIns > 0 ? '#16a34a' : '#94a3b8',
                                fontWeight: h.checkIns > 0 ? 800 : 500,
                                background: h.checkIns > 0 ? '#dcfce7' : 'transparent',
                                padding: h.checkIns > 0 ? '2px 8px' : '0',
                                borderRadius: '6px'
                              }}>
                                {h.checkIns > 0 ? `+${h.checkIns}` : 0}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                color: h.checkOuts > 0 ? '#2563eb' : '#94a3b8',
                                fontWeight: h.checkOuts > 0 ? 800 : 500,
                                background: h.checkOuts > 0 ? '#dbeafe' : 'transparent',
                                padding: h.checkOuts > 0 ? '2px 8px' : '0',
                                borderRadius: '6px'
                              }}>
                                {h.checkOuts > 0 ? `-${h.checkOuts}` : 0}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                fontWeight: isHighlight ? 800 : 500,
                                color: isHighlight ? '#0f172a' : '#94a3b8'
                              }}>
                                {totalMoves}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="awt-traffic-bar-bg">
                                  <div
                                    className="awt-traffic-bar-fill"
                                    style={{ width: `${totalMoves > 0 ? Math.max(15, pct) : 0}%` }}
                                  />
                                </div>
                                <span style={{ fontSize: '0.74rem', color: isHighlight ? '#0f172a' : '#94a3b8', fontWeight: 700 }}>
                                  {totalMoves > 0 ? `${totalMoves} moves` : 'Idle'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ──────────────── TAB 6: STUDENT QR DIRECTORY ──────────────── */}
      {activeTab === 'student_qr_directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="awt-filter-card">
            <div className="awt-search-wrap">
              <Search size={16} />
              <input
                type="text"
                className="awt-search-input"
                placeholder="Search students by name, roll no, mobile number, department, or QR..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
              />
            </div>

            <select
              className="awt-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
              <option value="Electrical">Electrical</option>
              <option value="Electronics">Electronics</option>
              <option value="Information Technology">Information Technology</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-primary"
              onClick={fetchDirectory}
            >
              <RefreshCw size={15} />
              <span>Search Students</span>
            </button>
          </div>

          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <QrCode size={18} style={{ color: '#2563eb' }} />
                <span>Registered Students & Permanent QR Passes ({qrDirectory.length})</span>
              </h2>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Student Details</th>
                    <th>Department & Course</th>
                    <th>Contact</th>
                    <th>Live Campus Status</th>
                    <th>Unique QR Code String</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDirectory ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#2563eb' }} />
                        Loading student QR directory...
                      </td>
                    </tr>
                  ) : qrDirectory.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No registered students found.
                      </td>
                    </tr>
                  ) : (
                    qrDirectory.map((st) => (
                      <tr key={st._id || st.id}>
                        <td>
                          <div className="awt-student-cell">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt={st.name} className="awt-student-avatar" />
                            ) : (
                              <div className="awt-student-avatar">
                                {st.name?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                            )}
                            <div>
                              <div className="awt-student-name">{st.name}</div>
                              <span className="awt-student-id">{st.id}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{st.department}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{st.course} • Sem {st.semester}</div>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.85rem' }}>{st.email}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{st.phone || '—'}</div>
                        </td>

                        <td>
                          {st.currentStatus === 'Inside Campus' ? (
                            <span className="awt-badge inside">
                              <span className="awt-pulse-dot" style={{ width: '6px', height: '6px' }} />
                              Inside Campus
                            </span>
                          ) : (
                            <span className="awt-badge checked-out">
                              Outside Campus
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', display: 'inline-block' }}>
                            {st.qrCode}
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="awt-qr-btn"
                            onClick={() => setSelectedStudentForQr(st)}
                          >
                            <QrCode size={14} />
                            <span>View / Print Pass</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 7: CAMPUS IN & OUT MOVEMENTS ──────────────── */}
      {activeTab === 'campus_movements' && (
        <>
          {/* Stat Cards */}
          <div className="awt-stats-grid">
            <div className="awt-stat-card">
              <div className="awt-stat-icon green">
                <LogIn size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Currently Inside Campus</h3>
                <div className="val" style={{ color: '#059669' }}>{campusMovementStats.currentlyInside || 0}</div>
                <div className="sub">Active personnel on campus grounds</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon blue">
                <ArrowRight size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Today's Campus In</h3>
                <div className="val">{campusMovementStats.todayEntries || 0}</div>
                <div className="sub">Gate entries recorded today</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon purple">
                <ArrowLeft size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Today's Campus Out</h3>
                <div className="val">{campusMovementStats.todayExits || 0}</div>
                <div className="sub">Gate exits recorded today</div>
              </div>
            </div>

            <div className="awt-stat-card">
              <div className="awt-stat-icon orange">
                <Users size={24} />
              </div>
              <div className="awt-stat-content">
                <h3>Total Registered Directory</h3>
                <div className="val" style={{ color: '#d97706' }}>{campusMovementStats.totalRegistered || 0}</div>
                <div className="sub">Registered students, staff & visitors</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="awt-filter-bar">
            <div className="awt-search-wrap">
              <Search size={16} className="awt-search-icon" />
              <input
                type="text"
                placeholder="Search person name, ID, phone, department..."
                value={campusMovementSearch}
                onChange={(e) => setCampusMovementSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                className="awt-date-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                title="Filter by Movement Date"
              />
              {selectedDate ? (
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedDate('')}
                  title="View all recorded dates"
                >
                  All Dates
                </button>
              ) : (
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                  onClick={() => setSelectedDate(todayStr)}
                  title="Filter by Today"
                >
                  Today
                </button>
              )}
            </div>

            <select
              className="awt-select"
              value={campusMovementDirection}
              onChange={(e) => setCampusMovementDirection(e.target.value)}
            >
              <option value="All">All Directions</option>
              <option value="In">Campus In Only</option>
              <option value="Out">Campus Out Only</option>
            </select>

            <select
              className="awt-select"
              value={campusMovementRole}
              onChange={(e) => setCampusMovementRole(e.target.value)}
            >
              <option value="All">All Person Types</option>
              <option value="Student">Students</option>
              <option value="Staff">Staff / Faculty</option>
              <option value="Visitor">Visitors</option>
              <option value="Contractor">Contractors</option>
            </select>

            <button
              type="button"
              className="awt-btn awt-btn-secondary"
              onClick={() => {
                setCampusMovementSearch('');
                setSelectedDate(todayStr);
                setCampusMovementDirection('All');
                setCampusMovementRole('All');
              }}
            >
              Clear Filters
            </button>
          </div>

          {/* Table */}
          <div className="awt-table-card">
            <div className="awt-table-header">
              <h2>
                <ArrowLeftRight size={18} style={{ color: '#2563eb' }} />
                <span>Campus Entry & Exit Records ({campusMovements.length})</span>
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>

            <div className="awt-table-responsive">
              <table className="awt-table">
                <thead>
                  <tr>
                    <th>Movement ID</th>
                    <th>Person Details</th>
                    <th>Role & Dept</th>
                    <th>Direction</th>
                    <th>Timestamp</th>
                    <th>Gate & Watchman</th>
                    <th>Time on Campus</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCampusMovements ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        <RefreshCw size={24} className="awt-spin" style={{ margin: '0 auto 0.5rem' }} />
                        <div>Loading campus movements...</div>
                      </td>
                    </tr>
                  ) : campusMovements.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 700, color: '#334155' }}>No Campus Movements Found</div>
                        <div style={{ fontSize: '0.82rem', marginTop: 4 }}>No entry or exit logs match current filter criteria.</div>
                      </td>
                    </tr>
                  ) : (
                    campusMovements.map((m) => {
                      const isIn = m.direction === 'In';
                      return (
                        <tr key={m._id}>
                          <td>
                            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>{m.movementId}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{m.name}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              ID: {m.personId} {m.phone ? `• ${m.phone}` : ''}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.74rem',
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontWeight: 700,
                              background: m.personType === 'Student' ? '#eff6ff' : m.personType === 'Staff' ? '#ecfdf5' : '#fef3c7',
                              color: m.personType === 'Student' ? '#1d4ed8' : m.personType === 'Staff' ? '#047857' : '#b45309'
                            }}>
                              {m.personType || 'Personnel'}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{m.department || 'General'}</div>
                          </td>
                          <td>
                            {isIn ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 12,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0'
                              }}>
                                <ArrowRight size={13} />
                                Campus In
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '3px 9px',
                                borderRadius: 12,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#fffbeb',
                                color: '#d97706',
                                border: '1px solid #fde68a'
                              }}>
                                <ArrowLeft size={13} />
                                Campus Out
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatTimeOnly(m.timestamp)}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{formatDateTime(m.timestamp)}</div>
                          </td>
                          <td>
                            <div style={{ color: '#334155' }}>{m.gate || 'Gate 1'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Watchman: {m.watchmanName || 'Staff'}</div>
                          </td>
                          <td>
                            {m.durationFormatted ? (
                              <span style={{
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: '#2563eb',
                                background: '#eff6ff',
                                padding: '2px 8px',
                                borderRadius: 8
                              }}>
                                {m.durationFormatted}
                              </span>
                            ) : isIn ? (
                              <span style={{ fontSize: '0.74rem', color: '#059669', fontStyle: 'italic' }}>Inside Campus</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {m.vehicleNumber && (
                              <div style={{ fontSize: '0.74rem', color: '#1d4ed8', fontWeight: 600 }}>
                                Veh: {m.vehicleNumber}
                              </div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.remarks || 'Normal'}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──────────────── MODAL: QUICK SCANNER & GATE PASS VERIFICATION ──────────────── */}
      {scanModalOpen && (
        <div className="awt-modal-overlay" onClick={() => { setScanModalOpen(false); setScanResult(null); }}>
          <div className="awt-modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="awt-modal-header" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#ffffff' }}>
              <h3 style={{ color: '#ffffff' }}>
                <QrCode size={20} />
                <span>Gate Pass & QR Verification Terminal</span>
              </h3>
              <button
                type="button"
                className="awt-modal-close"
                style={{ color: '#ffffff' }}
                onClick={() => { setScanModalOpen(false); setScanResult(null); }}
              >
                ✕
              </button>
            </div>

            <div className="awt-modal-body" style={{ padding: '1.5rem', textAlign: 'left' }}>
              <form onSubmit={handleScanLookup} style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Enter Student Roll No / ID, Visitor Pass #, or Scan Barcode:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="awt-search-input"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.92rem', borderRadius: '8px' }}
                    placeholder="e.g. STU-1001, PASS-2026, or paste QR code..."
                    value={scanQuery}
                    onChange={(e) => setScanQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="awt-btn awt-btn-primary"
                    disabled={scanSearching || !scanQuery.trim()}
                    style={{ padding: '0 18px', whiteSpace: 'nowrap' }}
                  >
                    {scanSearching ? 'Checking...' : 'Lookup / Verify'}
                  </button>
                </div>
              </form>

              {scanSuccessMsg && (
                <div style={{ padding: '10px 14px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', border: '1px solid #a7f3d0', fontSize: '0.84rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} />
                  <span>{scanSuccessMsg}</span>
                </div>
              )}

              {scanError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '0.84rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} />
                  <span>{scanError}</span>
                </div>
              )}

              {scanResult && (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc', marginBottom: '16px' }}>
                  {scanResult.type === 'student' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', border: '2px solid #bfdbfe' }}>
                          {scanResult.data.name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{scanResult.data.name}</div>
                          <div style={{ fontSize: '0.82rem', color: '#475569' }}>Student ID: <strong>{scanResult.data.id || scanResult.data.studentId}</strong></div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{scanResult.data.department} • {scanResult.data.course}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Current Campus Status:</span>
                        <span className={`awt-badge ${scanResult.data.isInside ? 'inside' : 'checked-out'}`}>
                          {scanResult.data.isInside ? 'Inside Campus' : 'Outside Campus'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {scanResult.data.isInside ? (
                          <button
                            type="button"
                            className="awt-btn"
                            style={{ flex: 1, background: '#dc2626', color: '#ffffff', justifyContent: 'center', padding: '10px' }}
                            onClick={() => handleQuickStudentCheckout(scanResult.data)}
                          >
                            <ExitIcon size={15} />
                            <span>Confirm Student Gate Exit</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="awt-btn"
                            style={{ flex: 1, background: '#059669', color: '#ffffff', justifyContent: 'center', padding: '10px' }}
                            onClick={() => handleQuickStudentCheckin(scanResult.data)}
                          >
                            <Check size={15} />
                            <span>Confirm Student Gate Entry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {scanResult.type === 'visitor' && (
                    <div>
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{scanResult.data.name}</div>
                        <div style={{ fontSize: '0.82rem', color: '#475569' }}>Pass #{scanResult.data.passNumber} • Phone: {scanResult.data.phone}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Host: {scanResult.data.personToMeet} ({scanResult.data.department})</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Purpose: {scanResult.data.purpose}</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {scanResult.data.status === 'Inside' ? (
                          <button
                            type="button"
                            className="awt-btn"
                            style={{ flex: 1, background: '#dc2626', color: '#ffffff', justifyContent: 'center', padding: '10px' }}
                            onClick={() => handleQuickVisitorCheckout(scanResult.data)}
                          >
                            <ExitIcon size={15} />
                            <span>Confirm Visitor Exit</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="awt-btn"
                            style={{ flex: 1, background: '#7c3aed', color: '#ffffff', justifyContent: 'center', padding: '10px' }}
                            onClick={() => handleQuickVisitorAdmit(scanResult.data)}
                          >
                            <Check size={15} />
                            <span>Admit Visitor at Gate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  onClick={() => { setScanModalOpen(false); setScanResult(null); }}
                >
                  Close Terminal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: STUDENT QR CODE PASS ──────────────── */}
      {selectedStudentForQr && (
        <div className="awt-modal-overlay" onClick={() => setSelectedStudentForQr(null)}>
          <div className="awt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="awt-modal-header">
              <h3>
                <QrCode size={20} style={{ color: '#2563eb' }} />
                <span>Student Digital Campus Pass</span>
              </h3>
              <button
                type="button"
                className="awt-modal-close"
                onClick={() => setSelectedStudentForQr(null)}
              >
                ✕
              </button>
            </div>

            <div className="awt-modal-body">
              <div className="awt-qr-card-preview" id="printable-qr-card">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.08em', marginBottom: '8px' }}>
                  Institutional Security Gate Pass
                </div>

                <div style={{ margin: '0 auto 12px auto', width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #2563eb', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selectedStudentForQr.photoUrl ? (
                    <img src={selectedStudentForQr.photoUrl} alt={selectedStudentForQr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>
                      {selectedStudentForQr.name?.charAt(0)?.toUpperCase()}
                    </span>
                  )}
                </div>

                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#0f172a' }}>
                  {selectedStudentForQr.name}
                </h3>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#475569', fontSize: '0.9rem', marginBottom: '8px' }}>
                  {selectedStudentForQr.id}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '14px' }}>
                  {selectedStudentForQr.department} • {selectedStudentForQr.course}
                </div>

                <div className="awt-qr-image-wrap">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(selectedStudentForQr.qrCode || `STU-QR-${selectedStudentForQr.id}`)}`}
                    alt={`QR Code for ${selectedStudentForQr.name}`}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Scan at any college security checkpoint for automated check-in & check-out
                </div>

                <div className="awt-qr-payload-box">
                  <span>{selectedStudentForQr.qrCode || `STU-QR-${selectedStudentForQr.id}`}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}
                    onClick={() => handleCopyQr(selectedStudentForQr.qrCode || `STU-QR-${selectedStudentForQr.id}`)}
                  >
                    {copiedQr ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    <span>{copiedQr ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="awt-btn awt-btn-primary"
                  onClick={() => window.print()}
                >
                  <Printer size={16} />
                  <span>Print Pass</span>
                </button>
                <button
                  type="button"
                  className="awt-btn awt-btn-secondary"
                  onClick={() => setSelectedStudentForQr(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWatchmanTracking;
