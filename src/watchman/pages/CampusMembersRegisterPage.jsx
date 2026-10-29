import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  GraduationCap,
  Building2,
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Clock,
  Car,
  CheckCircle,
  AlertCircle,
  LogIn,
  LogOut,
  MapPin,
  Calendar,
  User,
  Check,
  ChevronDown,
  X,
  Phone,
  Briefcase,
  ArrowRightCircle,
  ArrowLeftCircle,
  ShieldCheck,
  Sparkles,
  QrCode,
  ArrowLeftRight,
  BarChart3,
  FileText,
  Printer,
  Download,
  AlertTriangle,
  UserX,
  CheckCircle2
} from 'lucide-react';
import {
  getStaffMovements,
  recordStaffMovement,
  getStudentMovements,
  recordStudentMovement,
  lookupStaffMember,
  getStaffWatchmanDirectory,
  getStudentQrDirectory,
  lookupStudentQr,
  getCampusMovementStats,
  getCampusPeople,
  recordCampusIn,
  recordCampusOut
} from '../../api';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const CampusMembersRegisterPage = ({ defaultTab }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialRoleParam = queryParams.get('tab') || queryParams.get('role') || defaultTab || 'all';

  // Active Role Tab: 'all' | 'staff' | 'student' | 'hod' | 'report'
  const [activeRoleTab, setActiveRoleTab] = useState(
    initialRoleParam === 'report' || initialRoleParam === 'attendance'
      ? 'report'
      : initialRoleParam === 'student' || initialRoleParam === 'students'
        ? 'student'
        : initialRoleParam === 'staff'
          ? 'staff'
          : initialRoleParam === 'hod' || initialRoleParam === 'hods'
            ? 'hod'
            : 'all'
  );

  // Sync tab with URL if user navigates or parameters change
  useEffect(() => {
    const tabParam = queryParams.get('tab') || queryParams.get('role') || defaultTab;
    if (tabParam) {
      const lower = tabParam.toLowerCase();
      if (lower.startsWith('rep') || lower.startsWith('att')) setActiveRoleTab('report');
      else if (lower.startsWith('stud')) setActiveRoleTab('student');
      else if (lower.startsWith('staf')) setActiveRoleTab('staff');
      else if (lower.startsWith('hod')) setActiveRoleTab('hod');
    }
  }, [location.search, defaultTab]);

  // Daily Attendance & Timing Report Section State
  const [cutoffTime, setCutoffTime] = useState('09:15'); // Standard 9:15 AM cutoff for Late Entry
  const [reportRoleFilter, setReportRoleFilter] = useState('all'); // 'all' | 'staff' | 'student' | 'hod'
  const [reportStatusFilter, setReportStatusFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'late' | 'inside' | 'outside'

  // Main Movement & Directory State
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Registered Directories
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [studentDirectory, setStudentDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Live Stats
  const [stats, setStats] = useState({
    totalRegistered: 0,
    currentlyInside: 0,
    currentlyOutside: 0,
    todayEntries: 0,
    todayExits: 0,
    studentsInside: 0,
    staffInside: 0,
    hodsInside: 0
  });

  // Filters
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState('All'); // 'All' | 'In' | 'Out'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Inside' | 'Outside'
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Modals & Action State
  const [showLogModal, setShowLogModal] = useState(false);
  const [submittingMovement, setSubmittingMovement] = useState(false);
  const [modalRole, setModalRole] = useState(activeRoleTab === 'all' ? 'staff' : activeRoleTab);
  const [idInput, setIdInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [identifiedPerson, setIdentifiedPerson] = useState(null);
  const [personStatus, setPersonStatus] = useState('Outside Campus');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Data for Manual Logging
  const [formData, setFormData] = useState({
    personId: '',
    name: '',
    role: 'Staff',
    department: '',
    designation: '',
    movementType: 'In', // 'In' or 'Out'
    gate: 'Gate 1 (Main Entrance)',
    reason: 'Official College Duty',
    passNumber: '',
    vehicleNumber: '',
    remarks: ''
  });

  // 1. Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getCampusMovementStats();
      if (res?.data?.success && res.data?.data) {
        setStats(prev => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err) {
      console.warn('Stats fetch notice:', err.message);
    }
  }, []);

  // 2. Fetch Movements (Supports Staff, Student, HOD)
  const fetchMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);

      const [staffRes, studentRes] = await Promise.allSettled([
        getStaffMovements({ search, movementType: directionFilter !== 'All' ? directionFilter : '' }),
        getStudentMovements({ search, movementType: directionFilter !== 'All' ? directionFilter : '' })
      ]);

      const staffList = staffRes.status === 'fulfilled' && Array.isArray(staffRes.value?.data?.data)
        ? staffRes.value.data.data
        : (Array.isArray(staffRes.value?.data) ? staffRes.value.data : []);

      const studentList = studentRes.status === 'fulfilled' && Array.isArray(studentRes.value?.data?.data)
        ? studentRes.value.data.data
        : (Array.isArray(studentRes.value?.data) ? studentRes.value.data : []);

      // Standardize Student items
      const formattedStudents = studentList.map(m => ({
        ...m,
        role: 'Student',
        personType: 'Student',
        personId: m.studentId || m.personId || m.rollNo,
        name: m.studentName || m.name,
        department: m.department || m.dept || 'General',
        designation: m.semester ? `Student (${m.semester})` : 'Student',
        direction: m.movementType || m.direction || 'In',
        gatePassId: m.gatePassNumber || m.gatePassId || '',
        timestamp: m.timestamp || m.entryTime || m.createdAt
      }));

      // Standardize Staff & HOD items
      const formattedStaff = staffList.map(m => {
        const isHod = m.personType === 'HOD' || m.designation === 'HOD' || /hod|head/i.test(m.designation || '') || /hod/i.test(m.staffId || m.personId || '');
        return {
          ...m,
          role: isHod ? 'HOD' : 'Staff',
          personType: isHod ? 'HOD' : 'Staff',
          personId: m.staffId || m.personId,
          name: m.staffName || m.name,
          department: m.department || m.dept || 'General',
          designation: m.designation || (isHod ? 'Head of Department' : 'Faculty / Staff'),
          direction: m.movementType || m.direction || 'In',
          gatePassId: m.passNumber || m.gatePassId || '',
          timestamp: m.timestamp || m.createdAt
        };
      });

      // Combine and sort by newest timestamp
      const allMovements = [...formattedStaff, ...formattedStudents].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setMovements(allMovements);
    } catch (err) {
      console.error('Failed to load campus movements:', err);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [search, directionFilter]);

  // 3. Fetch Registered Staff & Student Directories
  const fetchDirectories = useCallback(async () => {
    try {
      setLoadingDirectory(true);
      const [staffDirRes, studentDirRes] = await Promise.allSettled([
        getStaffWatchmanDirectory({ limit: 400 }),
        getStudentQrDirectory({ limit: 400 })
      ]);

      if (staffDirRes.status === 'fulfilled') {
        const sList = Array.isArray(staffDirRes.value?.data?.data)
          ? staffDirRes.value.data.data
          : (Array.isArray(staffDirRes.value?.data) ? staffDirRes.value.data : []);
        setStaffDirectory(sList);
      }

      if (studentDirRes.status === 'fulfilled') {
        const stList = Array.isArray(studentDirRes.value?.data?.data)
          ? studentDirRes.value.data.data
          : (Array.isArray(studentDirRes.value?.data) ? studentDirRes.value.data : []);
        setStudentDirectory(stList);
      }
    } catch (err) {
      console.warn('Directories fetch notice:', err.message);
    } finally {
      setLoadingDirectory(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMovements();
    fetchDirectories();
  }, [fetchStats, fetchMovements, fetchDirectories]);

  // Real-time synchronization
  useRealtimeSync(() => {
    fetchStats();
    fetchMovements();
    fetchDirectories();
  });

  // Calculate live presence counts
  const liveStats = useMemo(() => {
    let studInside = 0;
    let staffInside = 0;
    let hodInside = 0;

    studentDirectory.forEach(s => {
      if (s.currentStatus === 'Inside Campus') studInside++;
    });

    staffDirectory.forEach(s => {
      const isHod = s.role === 'HOD' || s.designation === 'HOD' || /hod|head/i.test(s.designation || '') || /hod/i.test(s.id || s.staffId || '');
      if (s.currentStatus === 'Inside Campus') {
        if (isHod) hodInside++;
        else staffInside++;
      }
    });

    return {
      studentsTotal: studentDirectory.length,
      staffTotal: staffDirectory.filter(s => !(s.role === 'HOD' || s.designation === 'HOD' || /hod|head/i.test(s.designation || ''))).length,
      hodsTotal: staffDirectory.filter(s => s.role === 'HOD' || s.designation === 'HOD' || /hod|head/i.test(s.designation || '')).length,
      studentsInside: studInside,
      staffInside: staffInside,
      hodsInside: hodInside,
      totalInside: studInside + staffInside + hodInside
    };
  }, [studentDirectory, staffDirectory]);

  // Available unique departments
  const availableDepartments = useMemo(() => {
    const depts = new Set();
    movements.forEach(m => {
      if (m.department && typeof m.department === 'string') depts.add(m.department.trim());
    });
    staffDirectory.forEach(s => {
      if (s.department) depts.add(s.department.trim());
    });
    studentDirectory.forEach(s => {
      if (s.department || s.dept) depts.add((s.department || s.dept).trim());
    });
    return Array.from(depts).filter(Boolean).sort();
  }, [movements, staffDirectory, studentDirectory]);

  // Filtered movements based on active tab and filters
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      // 1. Role Filter
      if (activeRoleTab === 'student' && m.role !== 'Student') return false;
      if (activeRoleTab === 'staff' && (m.role !== 'Staff' || m.personType === 'HOD')) return false;
      if (activeRoleTab === 'hod' && m.role !== 'HOD' && m.personType !== 'HOD') return false;

      // 2. Department Filter
      if (departmentFilter !== 'All' && m.department !== departmentFilter) return false;

      // 3. Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = (m.name || '').toLowerCase().includes(q);
        const idMatch = (m.personId || '').toLowerCase().includes(q);
        const deptMatch = (m.department || '').toLowerCase().includes(q);
        const vehicleMatch = (m.vehicleNumber || '').toLowerCase().includes(q);
        const desigMatch = (m.designation || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch && !vehicleMatch && !desigMatch) return false;
      }

      return true;
    });
  }, [movements, activeRoleTab, departmentFilter, search]);

  // ══════════════════════════════════════════════════════════════════════
  // DAILY ATTENDANCE & TIMING REPORT COMPUTATIONS (Present, Absent, Login/Logout, Late)
  // ══════════════════════════════════════════════════════════════════════
  const dailyReportData = useMemo(() => {
    const combinedMembers = [];
    const memberMap = new Map();

    const [cutoffH, cutoffM] = cutoffTime.split(':').map(Number);
    const cutoffMinutes = (cutoffH || 9) * 60 + (cutoffM || 15);

    // Group movements by personId and name
    const movementsByPerson = new Map();
    const movementsByName = new Map();
    movements.forEach(m => {
      const pId = (m.personId || m.studentId || m.staffId || '').toString().trim().toUpperCase();
      const pName = (m.name || m.studentName || m.staffName || '').toString().trim().toLowerCase();
      if (pId) {
        if (!movementsByPerson.has(pId)) movementsByPerson.set(pId, []);
        movementsByPerson.get(pId).push(m);
      }
      if (pName) {
        if (!movementsByName.has(pName)) movementsByName.set(pName, []);
        movementsByName.get(pName).push(m);
      }
    });

    // 1. Add Faculty, Staff & HODs from Directory
    staffDirectory.forEach(st => {
      const sId = (st.id || st.staffId || st._id || '').toString().trim().toUpperCase();
      const sName = st.name || st.staffName || 'Staff Member';
      const isHod = st.role === 'HOD' || st.designation === 'HOD' || /hod|head/i.test(st.designation || '') || /hod/i.test(sId);
      const role = isHod ? 'HOD' : 'Staff';

      if (sId && !memberMap.has(sId)) {
        memberMap.set(sId, true);
        combinedMembers.push({
          id: sId,
          name: sName,
          role,
          personType: role,
          department: st.department || st.dept || 'General',
          designation: isHod ? 'Head of Department' : (st.designation || 'Faculty / Staff'),
          phone: st.phone || '',
          email: st.email || '',
          photoUrl: st.photoUrl || ''
        });
      }
    });

    // 2. Add Students from Directory
    studentDirectory.forEach(stu => {
      const sId = (stu.id || stu.studentId || stu.rollNo || stu._id || '').toString().trim().toUpperCase();
      const sName = stu.name || stu.studentName || 'Student';

      if (sId && !memberMap.has(sId)) {
        memberMap.set(sId, true);
        combinedMembers.push({
          id: sId,
          name: sName,
          role: 'Student',
          personType: 'Student',
          department: stu.department || stu.dept || 'General',
          designation: stu.semester ? `Student (${stu.semester})` : 'Student',
          phone: stu.phone || stu.mobile || '',
          email: stu.email || '',
          photoUrl: stu.photoUrl || ''
        });
      }
    });

    // 3. Fallback: Include any member logged in today who might not be in the direct directories
    movements.forEach(m => {
      const pId = (m.personId || m.studentId || m.staffId || '').toString().trim().toUpperCase();
      if (pId && !memberMap.has(pId)) {
        memberMap.set(pId, true);
        const isHod = m.role === 'HOD' || m.personType === 'HOD' || /hod/i.test(m.designation || '');
        const role = m.role === 'Student' ? 'Student' : isHod ? 'HOD' : 'Staff';
        combinedMembers.push({
          id: pId,
          name: m.name || m.studentName || m.staffName || 'Campus Member',
          role,
          personType: role,
          department: m.department || 'General',
          designation: m.designation || role,
          phone: m.phone || '',
          email: '',
          photoUrl: ''
        });
      }
    });

    // Calculate daily metrics per member
    const reportList = combinedMembers.map(member => {
      const pId = member.id.toUpperCase();
      const pName = (member.name || '').toLowerCase();
      const personMovs = movementsByPerson.get(pId) || movementsByName.get(pName) || [];

      // Sort chronological: oldest first for First Login, newest last for Logout
      const sortedMovs = [...personMovs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const inMovements = sortedMovs.filter(m => (m.direction || m.movementType) === 'In');
      const outMovements = sortedMovs.filter(m => (m.direction || m.movementType) === 'Out');

      const isPresent = sortedMovs.length > 0;
      const latestMov = sortedMovs.length > 0 ? sortedMovs[sortedMovs.length - 1] : null;
      const isInside = isPresent && ((latestMov?.direction || latestMov?.movementType) === 'In');

      // Login Time (First Entry In)
      const firstIn = inMovements.length > 0 ? inMovements[0] : null;
      const loginTime = firstIn?.timestamp ? new Date(firstIn.timestamp) : null;
      const loginTimeFormatted = loginTime
        ? loginTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : '—';
      const loginGate = firstIn?.gate || '—';

      // Logout Time (Last Departure Out)
      const lastOut = outMovements.length > 0 ? outMovements[outMovements.length - 1] : null;
      const logoutTime = lastOut?.timestamp ? new Date(lastOut.timestamp) : null;
      const logoutTimeFormatted = logoutTime
        ? logoutTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
        : (isInside ? 'Still on Campus' : '—');
      const logoutGate = lastOut?.gate || '—';

      // Late Login Calculation against Cutoff Time
      let isLate = false;
      let lateMinutes = 0;
      if (loginTime) {
        const loginMinutes = loginTime.getHours() * 60 + loginTime.getMinutes();
        if (loginMinutes > cutoffMinutes) {
          isLate = true;
          lateMinutes = loginMinutes - cutoffMinutes;
        }
      }

      // Total Campus Duration
      let durationMinutes = 0;
      if (loginTime) {
        const endTime = isInside ? new Date() : (logoutTime || loginTime);
        const diffMs = endTime.getTime() - loginTime.getTime();
        durationMinutes = Math.max(0, Math.floor(diffMs / 60000));
      }
      const durHours = Math.floor(durationMinutes / 60);
      const durRemMins = durationMinutes % 60;
      const durationFormatted = loginTime ? `${durHours}h ${durRemMins}m` : '—';

      return {
        ...member,
        isPresent,
        isInside,
        status: !isPresent ? 'Absent' : (isInside ? 'Present (Inside)' : 'Present (Logged Out)'),
        loginTime,
        loginTimeFormatted,
        loginGate,
        logoutTime,
        logoutTimeFormatted,
        logoutGate,
        isLate,
        lateMinutes,
        durationFormatted,
        movementsCount: sortedMovs.length
      };
    });

    return reportList;
  }, [movements, staffDirectory, studentDirectory, cutoffTime]);

  // Filtered Report Data based on UI controls
  const filteredReportData = useMemo(() => {
    return dailyReportData.filter(r => {
      // 1. Role Filter
      if (reportRoleFilter === 'staff' && r.role !== 'Staff') return false;
      if (reportRoleFilter === 'student' && r.role !== 'Student') return false;
      if (reportRoleFilter === 'hod' && r.role !== 'HOD') return false;

      // 2. Status Filter
      if (reportStatusFilter === 'present' && !r.isPresent) return false;
      if (reportStatusFilter === 'absent' && r.isPresent) return false;
      if (reportStatusFilter === 'late' && !r.isLate) return false;
      if (reportStatusFilter === 'inside' && !r.isInside) return false;
      if (reportStatusFilter === 'outside' && (!r.isPresent || r.isInside)) return false;

      // 3. Department Filter
      if (departmentFilter !== 'All' && r.department !== departmentFilter) return false;

      // 4. Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const nameMatch = (r.name || '').toLowerCase().includes(q);
        const idMatch = (r.id || '').toLowerCase().includes(q);
        const deptMatch = (r.department || '').toLowerCase().includes(q);
        const desigMatch = (r.designation || '').toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !deptMatch && !desigMatch) return false;
      }

      return true;
    });
  }, [dailyReportData, reportRoleFilter, reportStatusFilter, departmentFilter, search]);

  // Overall Report Summary KPIs
  const dailyReportSummary = useMemo(() => {
    const totalRegistered = dailyReportData.length;
    const presentTotal = dailyReportData.filter(r => r.isPresent).length;
    const absentTotal = dailyReportData.filter(r => !r.isPresent).length;
    const lateTotal = dailyReportData.filter(r => r.isLate).length;
    const insideTotal = dailyReportData.filter(r => r.isInside).length;
    const exitedTotal = dailyReportData.filter(r => r.isPresent && !r.isInside).length;

    const staffMembers = dailyReportData.filter(r => r.role === 'Staff');
    const studentMembers = dailyReportData.filter(r => r.role === 'Student');
    const hodMembers = dailyReportData.filter(r => r.role === 'HOD');

    return {
      totalRegistered,
      presentTotal,
      absentTotal,
      lateTotal,
      insideTotal,
      exitedTotal,
      staffTotal: staffMembers.length,
      staffPresent: staffMembers.filter(r => r.isPresent).length,
      staffAbsent: staffMembers.filter(r => !r.isPresent).length,
      staffLate: staffMembers.filter(r => r.isLate).length,
      studentTotal: studentMembers.length,
      studentPresent: studentMembers.filter(r => r.isPresent).length,
      studentAbsent: studentMembers.filter(r => !r.isPresent).length,
      studentLate: studentMembers.filter(r => r.isLate).length,
      hodTotal: hodMembers.length,
      hodPresent: hodMembers.filter(r => r.isPresent).length,
      hodAbsent: hodMembers.filter(r => !r.isPresent).length,
      hodLate: hodMembers.filter(r => r.isLate).length
    };
  }, [dailyReportData]);

  // 1-Click Export Report to CSV
  const handleExportCsv = () => {
    if (!filteredReportData || filteredReportData.length === 0) {
      alert('No attendance report records to export.');
      return;
    }

    const headers = [
      'Member Name',
      'Member ID / Roll No',
      'Role & Category',
      'Department',
      'Designation',
      'Today Status',
      'Login Time (First In)',
      'Entry Gate',
      'Logout Time (Last Out)',
      'Exit Gate',
      'Late Status',
      'Late Minutes',
      'Duration on Campus'
    ];

    const rows = filteredReportData.map(r => [
      `"${r.name || ''}"`,
      `"${r.id || ''}"`,
      `"${r.role || ''}"`,
      `"${r.department || ''}"`,
      `"${r.designation || ''}"`,
      `"${r.status || ''}"`,
      `"${r.loginTimeFormatted || '—'}"`,
      `"${r.loginGate || '—'}"`,
      `"${r.logoutTimeFormatted || '—'}"`,
      `"${r.logoutGate || '—'}"`,
      `"${r.isLate ? `Late by ${r.lateMinutes}m` : (r.isPresent ? 'On Time' : 'Absent')}"`,
      r.lateMinutes || 0,
      `"${r.durationFormatted || '—'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Campus_Daily_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick 1-Click In / Out Gate Action directly from Report Row
  const handleQuickReportAction = async (reportItem, targetDirection) => {
    try {
      const pId = reportItem.id;
      const isStudent = reportItem.role === 'Student';
      const isHod = reportItem.role === 'HOD';

      if (targetDirection === 'In') {
        const payload = isStudent
          ? { studentId: pId, studentName: reportItem.name, department: reportItem.department, direction: 'In', gate: 'Gate 1 (Main Entrance)', reason: 'Daily Campus Entry' }
          : { personId: pId, name: reportItem.name, department: reportItem.department, designation: reportItem.designation, role: isHod ? 'HOD' : 'Staff', personType: isHod ? 'HOD' : 'Staff', movementType: 'In', gate: 'Gate 1 (Main Entrance)', reason: 'Daily Campus Entry' };

        if (isStudent) await recordStudentMovement(payload);
        else await recordStaffMovement(payload);
        setSuccess(`Gate Entry logged successfully for ${reportItem.name}!`);
      } else {
        const payload = isStudent
          ? { studentId: pId, studentName: reportItem.name, department: reportItem.department, direction: 'Out', gate: 'Gate 1 (Main Entrance)', reason: 'Campus Departure' }
          : { personId: pId, name: reportItem.name, department: reportItem.department, designation: reportItem.designation, role: isHod ? 'HOD' : 'Staff', personType: isHod ? 'HOD' : 'Staff', movementType: 'Out', gate: 'Gate 1 (Main Entrance)', reason: 'Campus Departure' };

        if (isStudent) await recordStudentMovement(payload);
        else await recordStaffMovement(payload);
        setSuccess(`Gate Exit logged successfully for ${reportItem.name}!`);
      }
      fetchMovements();
      fetchDirectories();
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record gate movement');
    }
  };

  // Open Log Modal for specific role
  const handleOpenLogModal = (role = activeRoleTab) => {
    const targetRole = role === 'all' ? 'staff' : role;
    setModalRole(targetRole);
    setIdInput('');
    setIdentifiedPerson(null);
    setPersonStatus('Outside Campus');
    setError('');
    setSuccess('');
    setFormData({
      personId: '',
      name: '',
      role: targetRole === 'student' ? 'Student' : targetRole === 'hod' ? 'HOD' : 'Staff',
      department: '',
      designation: targetRole === 'student' ? 'Student' : targetRole === 'hod' ? 'Head of Department' : 'Faculty / Staff',
      movementType: 'In',
      gate: 'Gate 1 (Main Entrance)',
      reason: targetRole === 'student' ? 'Regular Daily Class / Lab' : 'Official College Duty',
      passNumber: '',
      vehicleNumber: '',
      remarks: ''
    });
    setShowLogModal(true);
  };

  // Autocomplete ID search in modal
  const handleIdSearchChange = (val) => {
    setIdInput(val);
    setShowDropdown(Boolean(val.trim()));
    if (!val.trim()) {
      setIdentifiedPerson(null);
    }
  };

  // Select item from autocomplete
  const handleSelectFromDirectory = (item) => {
    if (!item) return;
    const isStudent = modalRole === 'student';
    const isHod = modalRole === 'hod' || item.role === 'HOD' || /hod/i.test(item.designation || '');
    const pId = item.id || item.studentId || item.staffId || item.rollNo || item.referenceId;
    const pName = item.name || item.studentName || item.staffName;
    const pDept = item.department || item.dept || 'General';
    const pDesig = isStudent
      ? (item.semester ? `Student (${item.semester})` : 'Student')
      : isHod
        ? 'Head of Department'
        : (item.designation || 'Faculty / Staff');

    setIdInput(pId);
    setIdentifiedPerson(item);
    setPersonStatus(item.currentStatus || 'Outside Campus');

    // Auto toggle movement type based on current status
    const recommendedDir = item.currentStatus === 'Inside Campus' ? 'Out' : 'In';

    setFormData(prev => ({
      ...prev,
      personId: pId,
      name: pName,
      department: pDept,
      designation: pDesig,
      movementType: recommendedDir,
      vehicleNumber: item.vehicleNumber || prev.vehicleNumber || ''
    }));

    setShowDropdown(false);
  };

  // Submit manual movement form
  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    if (!formData.personId.trim() || !formData.name.trim()) {
      setError('Please provide a valid ID/Roll Number and Full Name.');
      return;
    }

    try {
      setSubmittingMovement(true);
      setError('');
      setSuccess('');

      const isStudent = formData.role === 'Student' || modalRole === 'student';
      let res;

      if (isStudent) {
        res = await recordStudentMovement({
          studentId: formData.personId.trim(),
          studentName: formData.name.trim(),
          department: formData.department.trim() || 'General',
          movementType: formData.movementType,
          gate: formData.gate,
          reason: formData.reason,
          gatePassNumber: formData.passNumber.trim(),
          vehicleNumber: formData.vehicleNumber.trim(),
          remarks: formData.remarks.trim()
        });
      } else {
        res = await recordStaffMovement({
          staffId: formData.personId.trim(),
          staffName: formData.name.trim(),
          personType: formData.role === 'HOD' ? 'HOD' : 'Staff',
          department: formData.department.trim() || 'General',
          designation: formData.designation.trim() || (formData.role === 'HOD' ? 'Head of Department' : 'Faculty'),
          movementType: formData.movementType,
          gate: formData.gate,
          reason: formData.reason,
          passNumber: formData.passNumber.trim(),
          vehicleNumber: formData.vehicleNumber.trim(),
          remarks: formData.remarks.trim()
        });
      }

      if (res.data?.success) {
        setSuccess(`Movement successfully recorded for ${formData.name} (${formData.movementType.toUpperCase()})!`);
        setShowLogModal(false);
        fetchStats();
        fetchMovements();
        fetchDirectories();
        setTimeout(() => setSuccess(''), 4500);
      } else {
        setError(res.data?.message || 'Failed to record movement.');
      }
    } catch (err) {
      console.error('Movement record error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to record movement');
    } finally {
      setSubmittingMovement(false);
    }
  };

  // Autocomplete filtered list for modal
  const modalAutocompleteList = useMemo(() => {
    if (!idInput.trim()) return [];
    const q = idInput.trim().toLowerCase();
    if (modalRole === 'student') {
      return studentDirectory.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
      ).slice(0, 8);
    } else if (modalRole === 'hod') {
      return staffDirectory.filter(s => {
        const isHod = s.role === 'HOD' || s.designation === 'HOD' || /hod|head/i.test(s.designation || '') || /hod/i.test(s.id || s.staffId || '');
        if (!isHod) return false;
        return (s.name && s.name.toLowerCase().includes(q)) ||
               (s.id && s.id.toLowerCase().includes(q)) ||
               (s.department && s.department.toLowerCase().includes(q));
      }).slice(0, 8);
    } else {
      return staffDirectory.filter(s => {
        const isHod = s.role === 'HOD' || s.designation === 'HOD' || /hod|head/i.test(s.designation || '');
        if (isHod) return false;
        return (s.name && s.name.toLowerCase().includes(q)) ||
               (s.id && s.id.toLowerCase().includes(q)) ||
               (s.department && s.department.toLowerCase().includes(q));
      }).slice(0, 8);
    }
  }, [idInput, modalRole, studentDirectory, staffDirectory]);

  return (
    <div className="wmn-page-container">
      {/* ── Page Header ── */}
      <div className="wmn-header-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              flexShrink: 0
            }}>
              <Users size={26} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>
                Staff, Student & HOD Movement Register
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                Unified institutional gate monitoring • Track and record movements for Faculty, Students & Department Heads
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => { fetchStats(); fetchMovements(); fetchDirectories(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={loadingMovements ? 'wmn-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => navigate('/watchman/qr-verification?type=members')}
              style={{ background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <QrCode size={15} />
              <span>Member QR Scanner</span>
            </button>

            <button
              type="button"
              className="wmn-btn-primary"
              onClick={() => handleOpenLogModal()}
              style={{ background: '#059669', color: '#ffffff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            >
              <PlusCircle size={16} />
              <span>Log Movement (In / Out)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Success & Error Alerts ── */}
      {success && (
        <div style={{
          background: '#ecfdf5',
          border: '1.5px solid #6ee7b7',
          color: '#065f46',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '1.2rem',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle size={20} style={{ color: '#059669', flexShrink: 0 }} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1.5px solid #fca5a5',
          color: '#991b1b',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '1.2rem',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── 4 KPI Stats Cards (Student, Staff, HOD, Total) ── */}
      <div className="wmn-ov-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Students */}
        <div
          className="wmn-ov-card"
          style={{
            '--accent-bar': '#2563eb',
            cursor: 'pointer',
            border: activeRoleTab === 'student' ? '2px solid #2563eb' : '1px solid #e2e8f0',
            background: activeRoleTab === 'student' ? '#f0f7ff' : '#ffffff'
          }}
          onClick={() => setActiveRoleTab('student')}
        >
          <div className="wmn-ov-info">
            <h5>Students on Campus</h5>
            <span className="count" style={{ color: '#2563eb' }}>{liveStats.studentsInside}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{liveStats.studentsTotal} registered students</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <GraduationCap size={26} />
          </div>
        </div>

        {/* Card 2: Staff */}
        <div
          className="wmn-ov-card"
          style={{
            '--accent-bar': '#059669',
            cursor: 'pointer',
            border: activeRoleTab === 'staff' ? '2px solid #059669' : '1px solid #e2e8f0',
            background: activeRoleTab === 'staff' ? '#f0fdf4' : '#ffffff'
          }}
          onClick={() => setActiveRoleTab('staff')}
        >
          <div className="wmn-ov-info">
            <h5>Faculty & Staff on Campus</h5>
            <span className="count" style={{ color: '#059669' }}>{liveStats.staffInside}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{liveStats.staffTotal} registered faculty & staff</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <UserCheck size={26} />
          </div>
        </div>

        {/* Card 3: HOD (Department Heads) */}
        <div
          className="wmn-ov-card"
          style={{
            '--accent-bar': '#d97706',
            cursor: 'pointer',
            border: activeRoleTab === 'hod' ? '2px solid #d97706' : '1px solid #e2e8f0',
            background: activeRoleTab === 'hod' ? '#fffbeb' : '#ffffff'
          }}
          onClick={() => setActiveRoleTab('hod')}
        >
          <div className="wmn-ov-info">
            <h5>HODs on Campus</h5>
            <span className="count" style={{ color: '#d97706' }}>{liveStats.hodsInside}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{liveStats.hodsTotal} Heads of Department</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Building2 size={26} />
          </div>
        </div>

        {/* Card 4: Total Movement Volume */}
        <div
          className="wmn-ov-card"
          style={{
            '--accent-bar': '#7c3aed',
            cursor: 'pointer',
            border: activeRoleTab === 'all' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
            background: activeRoleTab === 'all' ? '#faf5ff' : '#ffffff'
          }}
          onClick={() => setActiveRoleTab('all')}
        >
          <div className="wmn-ov-info">
            <h5>Total Today's Movements</h5>
            <span className="count" style={{ color: '#7c3aed' }}>{movements.length}</span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{liveStats.totalInside} total members currently inside</span>
          </div>
          <div className="wmn-ov-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <ArrowLeftRight size={26} />
          </div>
        </div>
      </div>

      {/* ── Unified Role Tabs Switcher: Staff, Student, HOD ── */}
      <div className="wmn-card" style={{ padding: '16px 20px', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1.5px solid #e2e8f0',
          paddingBottom: '14px',
          marginBottom: '16px'
        }}>
          {/* THE 3 UNIFIED ROLE TABS + ALL */}
          <div style={{
            display: 'inline-flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            gap: '6px',
            flexWrap: 'wrap'
          }}>
            {/* Tab 1: All Members */}
            <button
              type="button"
              onClick={() => setActiveRoleTab('all')}
              style={{
                border: 'none',
                background: activeRoleTab === 'all' ? '#ffffff' : 'transparent',
                color: activeRoleTab === 'all' ? '#0f172a' : '#64748b',
                fontWeight: activeRoleTab === 'all' ? 800 : 600,
                fontSize: '0.86rem',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeRoleTab === 'all' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={16} />
              <span>All Members ({movements.length})</span>
            </button>

            {/* Tab 2: Staff */}
            <button
              type="button"
              onClick={() => setActiveRoleTab('staff')}
              style={{
                border: 'none',
                background: activeRoleTab === 'staff' ? '#ffffff' : 'transparent',
                color: activeRoleTab === 'staff' ? '#059669' : '#64748b',
                fontWeight: activeRoleTab === 'staff' ? 800 : 600,
                fontSize: '0.86rem',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeRoleTab === 'staff' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <UserCheck size={16} />
              <span>Faculty & Staff ({movements.filter(m => m.role === 'Staff' && m.personType !== 'HOD').length})</span>
            </button>

            {/* Tab 3: Student */}
            <button
              type="button"
              onClick={() => setActiveRoleTab('student')}
              style={{
                border: 'none',
                background: activeRoleTab === 'student' ? '#ffffff' : 'transparent',
                color: activeRoleTab === 'student' ? '#2563eb' : '#64748b',
                fontWeight: activeRoleTab === 'student' ? 800 : 600,
                fontSize: '0.86rem',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeRoleTab === 'student' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <GraduationCap size={16} />
              <span>Students ({movements.filter(m => m.role === 'Student').length})</span>
            </button>

            {/* Tab 4: HOD (Head of Department) */}
            <button
              type="button"
              onClick={() => setActiveRoleTab('hod')}
              style={{
                border: 'none',
                background: activeRoleTab === 'hod' ? '#ffffff' : 'transparent',
                color: activeRoleTab === 'hod' ? '#d97706' : '#64748b',
                fontWeight: activeRoleTab === 'hod' ? 800 : 600,
                fontSize: '0.86rem',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeRoleTab === 'hod' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={16} />
              <span>HODs ({movements.filter(m => m.role === 'HOD' || m.personType === 'HOD').length})</span>
            </button>

            {/* Tab 5: Daily Attendance & Timing Report */}
            <button
              type="button"
              onClick={() => setActiveRoleTab('report')}
              style={{
                border: 'none',
                background: activeRoleTab === 'report' ? '#4f46e5' : 'transparent',
                color: activeRoleTab === 'report' ? '#ffffff' : '#4338ca',
                fontWeight: activeRoleTab === 'report' ? 800 : 700,
                fontSize: '0.86rem',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeRoleTab === 'report' ? '0 2px 8px rgba(79, 70, 229, 0.35)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <BarChart3 size={16} />
              <span>Daily Attendance & Timing Report</span>
              <span style={{
                fontSize: '0.74rem',
                padding: '2px 8px',
                borderRadius: '12px',
                background: activeRoleTab === 'report' ? 'rgba(255,255,255,0.25)' : '#e0e7ff',
                color: activeRoleTab === 'report' ? '#ffffff' : '#3730a3',
                fontWeight: 800
              }}>
                {dailyReportSummary.presentTotal}/{dailyReportSummary.totalRegistered} Present
              </span>
            </button>
          </div>

          {/* Quick Log Action for Current Selected Role */}
          <button
            type="button"
            className="wmn-btn-primary"
            onClick={() => handleOpenLogModal(activeRoleTab)}
            style={{
              background: activeRoleTab === 'student' ? '#2563eb' : activeRoleTab === 'hod' ? '#d97706' : '#059669',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <PlusCircle size={15} />
            <span>
              Log {activeRoleTab === 'student' ? 'Student' : activeRoleTab === 'hod' ? 'HOD' : activeRoleTab === 'staff' ? 'Staff' : 'Member'} Movement
            </span>
          </button>
        </div>

        {/* ── Search & Filter Controls: Regular Movements vs Daily Attendance Report ── */}
        {activeRoleTab !== 'report' ? (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1, minWidth: '280px' }}>
              {/* Search Input */}
              <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '380px' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="wmn-form-input"
                  style={{ paddingLeft: '36px', height: '40px', fontSize: '0.88rem' }}
                  placeholder={`Search ${activeRoleTab === 'all' ? 'any member' : activeRoleTab} by Name, ID, Dept, Vehicle...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Direction Filter */}
              <select
                className="wmn-form-select"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                style={{ height: '40px', width: '150px', fontSize: '0.84rem', fontWeight: 600 }}
              >
                <option value="All">All Directions</option>
                <option value="In">🟢 Entry (In) Only</option>
                <option value="Out">🔴 Exit (Out) Only</option>
              </select>

              {/* Department Filter */}
              <select
                className="wmn-form-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{ height: '40px', width: '180px', fontSize: '0.84rem' }}
              >
                <option value="All">All Departments</option>
                {availableDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#64748b', fontWeight: 600 }}>
              Showing <strong>{filteredMovements.length}</strong> recorded movements
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              {/* Role Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Filter Category:</span>
                <button
                  type="button"
                  onClick={() => setReportRoleFilter('all')}
                  style={{
                    border: '1px solid',
                    borderColor: reportRoleFilter === 'all' ? '#4f46e5' : '#cbd5e1',
                    background: reportRoleFilter === 'all' ? '#4f46e5' : '#ffffff',
                    color: reportRoleFilter === 'all' ? '#ffffff' : '#334155',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  All ({dailyReportSummary.totalRegistered})
                </button>
                <button
                  type="button"
                  onClick={() => setReportRoleFilter('staff')}
                  style={{
                    border: '1px solid',
                    borderColor: reportRoleFilter === 'staff' ? '#059669' : '#cbd5e1',
                    background: reportRoleFilter === 'staff' ? '#059669' : '#ffffff',
                    color: reportRoleFilter === 'staff' ? '#ffffff' : '#334155',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Faculty & Staff ({dailyReportSummary.staffTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setReportRoleFilter('student')}
                  style={{
                    border: '1px solid',
                    borderColor: reportRoleFilter === 'student' ? '#2563eb' : '#cbd5e1',
                    background: reportRoleFilter === 'student' ? '#2563eb' : '#ffffff',
                    color: reportRoleFilter === 'student' ? '#ffffff' : '#334155',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Students ({dailyReportSummary.studentTotal})
                </button>
                <button
                  type="button"
                  onClick={() => setReportRoleFilter('hod')}
                  style={{
                    border: '1px solid',
                    borderColor: reportRoleFilter === 'hod' ? '#d97706' : '#cbd5e1',
                    background: reportRoleFilter === 'hod' ? '#d97706' : '#ffffff',
                    color: reportRoleFilter === 'hod' ? '#ffffff' : '#334155',
                    padding: '5px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  HODs ({dailyReportSummary.hodTotal})
                </button>
              </div>

              {/* Action Buttons: Export CSV & Print */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={handleExportCsv}
                  style={{ fontSize: '0.82rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  title="Export Attendance Report as CSV"
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => window.print()}
                  style={{ fontSize: '0.82rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  title="Print Daily Attendance Report"
                >
                  <Printer size={14} />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

            {/* Sub-Filters: Status, Cutoff Time, Department & Search */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              alignItems: 'center',
              background: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              {/* Search Box */}
              <div style={{ position: 'relative', flex: 1, minWidth: '220px', maxWidth: '340px' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94a3b8' }} />
                <input
                  type="text"
                  className="wmn-form-input"
                  style={{ paddingLeft: '32px', height: '36px', fontSize: '0.84rem' }}
                  placeholder="Search by Name, Roll #, ID, Dept..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                className="wmn-form-select"
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                style={{ height: '36px', width: '160px', fontSize: '0.82rem', fontWeight: 600 }}
              >
                <option value="all">All Statuses ({dailyReportSummary.totalRegistered})</option>
                <option value="present">🟢 Present Today ({dailyReportSummary.presentTotal})</option>
                <option value="absent">🔴 Absent Today ({dailyReportSummary.absentTotal})</option>
                <option value="late">⚠️ Late Logins ({dailyReportSummary.lateTotal})</option>
                <option value="inside">🔵 Inside Campus ({dailyReportSummary.insideTotal})</option>
                <option value="outside">⚪ Logged Out ({dailyReportSummary.exitedTotal})</option>
              </select>

              {/* Standard Cutoff Time Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} style={{ color: '#d97706' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Cutoff:</span>
                <select
                  className="wmn-form-select"
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                  style={{ height: '36px', width: '135px', fontSize: '0.82rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', borderColor: '#fde68a' }}
                >
                  <option value="08:30">08:30 AM</option>
                  <option value="08:45">08:45 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="09:15">09:15 AM (Default)</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:00">10:00 AM</option>
                </select>
              </div>

              {/* Department Filter */}
              <select
                className="wmn-form-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                style={{ height: '36px', width: '160px', fontSize: '0.82rem' }}
              >
                <option value="All">All Departments</option>
                {availableDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                Showing <strong>{filteredReportData.length}</strong> of {dailyReportData.length} members
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Standard Movements Table (when not in Report tab) ── */}
      {activeRoleTab !== 'report' && (
        <div className="wmn-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="wmn-table">
              <thead>
                <tr>
                  <th>Person Details</th>
                  <th>Role & Category</th>
                  <th>Department & Designation</th>
                  <th>Direction</th>
                  <th>Gate & Time</th>
                  <th>Vehicle & Gate Pass</th>
                  <th>Reason & Remarks</th>
                </tr>
              </thead>
              <tbody>
                {loadingMovements ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <RefreshCw size={26} className="wmn-spin" style={{ color: '#2563eb', margin: '0 auto 10px auto' }} />
                      <div style={{ fontWeight: 700, color: '#475569' }}>Loading movements...</div>
                    </td>
                  </tr>
                ) : filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
                      <h4 style={{ margin: '0 0 6px', color: '#1e293b', fontWeight: 800 }}>No movements recorded</h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>
                        {search || directionFilter !== 'All' || departmentFilter !== 'All'
                          ? 'No gate movements matched your current search and filter settings.'
                          : `No ${activeRoleTab === 'all' ? 'member' : activeRoleTab} movements have been logged today.`}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map(m => {
                    const isIn = m.direction === 'In';
                    const isStudent = m.role === 'Student';
                    const isHod = m.role === 'HOD' || m.personType === 'HOD';

                    return (
                      <tr key={m.movementId || m._id}>
                        {/* Person Details */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              background: isStudent
                                ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                : isHod
                                  ? 'linear-gradient(135deg, #d97706, #b45309)'
                                  : 'linear-gradient(135deg, #059669, #047857)',
                              flexShrink: 0
                            }}>
                              {isStudent ? <GraduationCap size={18} /> : isHod ? <Building2 size={18} /> : <UserCheck size={18} />}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                                {m.name || 'Member'}
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b', marginTop: '1px' }}>
                                {m.personId || '—'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Category Badge */}
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: isStudent ? '#eff6ff' : isHod ? '#fef3c7' : '#ecfdf5',
                            color: isStudent ? '#1d4ed8' : isHod ? '#92400e' : '#065f46',
                            border: `1px solid ${isStudent ? '#bfdbfe' : isHod ? '#fde68a' : '#a7f3d0'}`
                          }}>
                            {isStudent ? 'STUDENT' : isHod ? 'HOD' : 'STAFF'}
                          </span>
                        </td>

                        {/* Department & Designation */}
                        <td>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                            {m.department || 'General'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                            {m.designation || 'Staff'}
                          </div>
                        </td>

                        {/* Direction */}
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.76rem',
                            fontWeight: 800,
                            background: isIn ? '#dcfce7' : '#fee2e2',
                            color: isIn ? '#166534' : '#991b1b',
                            border: `1px solid ${isIn ? '#bbf7d0' : '#fca5a5'}`
                          }}>
                            {isIn ? <LogIn size={13} /> : <LogOut size={13} />}
                            <span>{isIn ? 'CAMPUS IN' : 'CAMPUS OUT'}</span>
                          </span>
                        </td>

                        {/* Gate & Time */}
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.86rem' }}>
                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <MapPin size={12} />
                            <span>{m.gate || 'Gate 1'}</span>
                          </div>
                        </td>

                        {/* Vehicle & Pass */}
                        <td>
                          {m.vehicleNumber ? (
                            <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Car size={13} />
                              <span>{m.vehicleNumber}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pedestrian</span>
                          )}
                          {m.gatePassId && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                              Pass: {m.gatePassId}
                            </div>
                          )}
                        </td>

                        {/* Reason & Remarks */}
                        <td>
                          <div style={{ fontSize: '0.82rem', color: '#334155', fontWeight: 600 }}>
                            {m.reason || 'Regular College Duty'}
                          </div>
                          {m.remarks && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                              {m.remarks}
                            </div>
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
      )}

      {/* ── DAILY ATTENDANCE & TIMING REPORT VIEW (when in Report tab) ── */}
      {activeRoleTab === 'report' && (
        <div id="attendance-report-container">
          {/* Printable Report Header (visible only during print) */}
          <div className="report-print-header" style={{ display: 'none', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: '#0f172a' }}>College Gate Security — Daily Attendance & Movement Report</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Date: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | Generated at: {new Date().toLocaleTimeString('en-IN')} | Cutoff: {cutoffTime}
            </p>
          </div>

          {/* Top 4 KPI Metric Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '16px'
          }}>
            {/* Card 1: Present Today */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #bbf7d0',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.04em' }}>
                  Present Today
                </span>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserCheck size={18} />
                </span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#14532d', lineHeight: 1 }}>
                  {dailyReportSummary.presentTotal}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 600, marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Staff: <strong>{dailyReportSummary.staffPresent}</strong></span>
                  <span>•</span>
                  <span>Students: <strong>{dailyReportSummary.studentsPresent}</strong></span>
                  <span>•</span>
                  <span>HODs: <strong>{dailyReportSummary.hodPresent}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Absent Today */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #fecaca',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.04em' }}>
                  Absent Today
                </span>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserX size={18} />
                </span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#7f1d1d', lineHeight: 1 }}>
                  {dailyReportSummary.absentTotal}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#b91c1c', fontWeight: 600, marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Staff: <strong>{dailyReportSummary.staffAbsent}</strong></span>
                  <span>•</span>
                  <span>Students: <strong>{dailyReportSummary.studentsAbsent}</strong></span>
                  <span>•</span>
                  <span>HODs: <strong>{dailyReportSummary.hodAbsent}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 3: Late Login Time */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #fde68a',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#92400e', letterSpacing: '0.04em' }}>
                  Late Logins (&gt; {cutoffTime})
                </span>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={18} />
                </span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#78350f', lineHeight: 1 }}>
                  {dailyReportSummary.lateTotal}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#b45309', fontWeight: 600, marginTop: '6px' }}>
                  Logged in past cutoff time ({cutoffTime} AM)
                </div>
              </div>
            </div>

            {/* Card 4: Inside Campus Now */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #bfdbfe',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e40af', letterSpacing: '0.04em' }}>
                  Currently Inside
                </span>
                <span style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <LogIn size={18} />
                </span>
              </div>
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
                  {dailyReportSummary.insideTotal}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600, marginTop: '6px' }}>
                  Exited: <strong>{dailyReportSummary.exitedTotal}</strong> logged out today
                </div>
              </div>
            </div>
          </div>

          {/* Report Table */}
          <div className="wmn-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="wmn-table">
                <thead>
                  <tr>
                    <th>Member Details</th>
                    <th>Role & Category</th>
                    <th>Department & Designation</th>
                    <th>Today's Status</th>
                    <th>Login Time (First In)</th>
                    <th>Logout Time (Last Out)</th>
                    <th>Late Arrival Status</th>
                    <th>Duration On Campus</th>
                    <th>Gate Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMovements || loadingStaff || loadingStudents ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <RefreshCw size={26} className="wmn-spin" style={{ color: '#2563eb', margin: '0 auto 10px auto' }} />
                        <div style={{ fontWeight: 700, color: '#475569' }}>Compiling Attendance & Timing Report...</div>
                      </td>
                    </tr>
                  ) : filteredReportData.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
                        <h4 style={{ margin: '0 0 6px', color: '#1e293b', fontWeight: 800 }}>No members matched filter criteria</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.84rem' }}>
                          Try clearing the search or changing role and status filters.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReportData.map(item => {
                      const isStudent = item.role === 'Student';
                      const isHod = item.role === 'HOD';

                      return (
                        <tr key={item.key || item.id}>
                          {/* Member Details */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                background: isStudent
                                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                  : isHod
                                    ? 'linear-gradient(135deg, #d97706, #b45309)'
                                    : 'linear-gradient(135deg, #059669, #047857)',
                                flexShrink: 0
                              }}>
                                {isStudent ? <GraduationCap size={18} /> : isHod ? <Building2 size={18} /> : <UserCheck size={18} />}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                                  {item.name}
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: '#64748b', marginTop: '1px' }}>
                                  {item.id}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role & Category */}
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              background: isStudent ? '#eff6ff' : isHod ? '#fef3c7' : '#ecfdf5',
                              color: isStudent ? '#1d4ed8' : isHod ? '#92400e' : '#065f46',
                              border: `1px solid ${isStudent ? '#bfdbfe' : isHod ? '#fde68a' : '#a7f3d0'}`
                            }}>
                              {item.role}
                            </span>
                          </td>

                          {/* Department & Designation */}
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                              {item.department || 'General'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                              {item.designation || (isStudent ? 'Student' : 'Staff')}
                            </div>
                          </td>

                          {/* Today's Status */}
                          <td>
                            {item.isPresent ? (
                              item.isInside ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: '20px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: '#dcfce7',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0'
                                }}>
                                  <LogIn size={13} />
                                  <span>Present (Inside)</span>
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '4px 9px',
                                  borderRadius: '20px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe'
                                }}>
                                  <LogOut size={13} />
                                  <span>Present (Logged Out)</span>
                                </span>
                              )
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 9px',
                                borderRadius: '20px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: '1px solid #fca5a5'
                              }}>
                                <UserX size={13} />
                                <span>Absent Today</span>
                              </span>
                            )}
                          </td>

                          {/* Login Time (First In) */}
                          <td>
                            {item.loginTimeFormatted ? (
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                  {item.loginTimeFormatted}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <MapPin size={11} />
                                  <span>{item.loginGate || 'Gate 1'}</span>
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>— Not Logged In</span>
                            )}
                          </td>

                          {/* Logout Time (Last Out) */}
                          <td>
                            {item.logoutTimeFormatted ? (
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                                  {item.logoutTimeFormatted}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <MapPin size={11} />
                                  <span>{item.logoutGate || 'Gate 1'}</span>
                                </div>
                              </div>
                            ) : item.isPresent && item.isInside ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                color: '#16a34a',
                                background: '#f0fdf4',
                                padding: '3px 7px',
                                borderRadius: '6px'
                              }}>
                                <Clock size={12} /> Still On Campus
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>— No Exit Logged</span>
                            )}
                          </td>

                          {/* Late Arrival Status */}
                          <td>
                            {item.isPresent ? (
                              item.isLate ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a'
                                }}>
                                  <AlertTriangle size={13} style={{ color: '#d97706' }} />
                                  <span>Late by {item.lateMinutes}m</span>
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.76rem',
                                  fontWeight: 800,
                                  background: '#f0fdf4',
                                  color: '#15803d',
                                  border: '1px solid #bbf7d0'
                                }}>
                                  <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                                  <span>On Time</span>
                                </span>
                              )
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                            )}
                          </td>

                          {/* Duration on Campus */}
                          <td>
                            <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.84rem' }}>
                              {item.durationFormatted}
                            </div>
                            {item.movementCount > 0 && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                {item.movementCount} movement{item.movementCount > 1 ? 's' : ''}
                              </div>
                            )}
                          </td>

                          {/* Gate Action */}
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setModalRole(item.role.toLowerCase());
                                setLogFormData({
                                  personId: item.id,
                                  name: item.name,
                                  role: item.role,
                                  personType: item.role,
                                  department: item.department || '',
                                  direction: item.isInside ? 'Out' : 'In',
                                  reason: item.isInside ? 'Campus Departure' : 'Regular Campus Entry',
                                  gate: currentGate || 'Gate 1 (Main Entrance)',
                                  vehicleType: 'None',
                                  vehicleNumber: '',
                                  remarks: ''
                                });
                                setShowLogModal(true);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                border: 'none',
                                background: item.isInside ? '#fee2e2' : '#dcfce7',
                                color: item.isInside ? '#991b1b' : '#166534',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {item.isInside ? <LogOut size={13} /> : <LogIn size={13} />}
                              <span>{item.isInside ? 'Log Out' : 'Log In'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: LOG MOVEMENT (STAFF, STUDENT, HOD) ── */}
      {showLogModal && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: modalRole === 'student' ? '#eff6ff' : modalRole === 'hod' ? '#fef3c7' : '#ecfdf5',
                  color: modalRole === 'student' ? '#2563eb' : modalRole === 'hod' ? '#d97706' : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {modalRole === 'student' ? <GraduationCap size={20} /> : modalRole === 'hod' ? <Building2 size={20} /> : <UserCheck size={20} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Record {modalRole === 'student' ? 'Student' : modalRole === 'hod' ? 'HOD' : 'Staff'} Gate Movement
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                    Log campus entrance or departure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitMovement} style={{ padding: '20px' }}>
              {/* Role Switcher in Modal */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  Member Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setModalRole('staff');
                      setFormData(prev => ({ ...prev, role: 'Staff', designation: 'Faculty / Staff', reason: 'Official College Duty' }));
                      setIdInput('');
                      setIdentifiedPerson(null);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1.5px solid ${modalRole === 'staff' ? '#059669' : '#cbd5e1'}`,
                      background: modalRole === 'staff' ? '#ecfdf5' : '#ffffff',
                      color: modalRole === 'staff' ? '#059669' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <UserCheck size={15} />
                    <span>Staff</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalRole('student');
                      setFormData(prev => ({ ...prev, role: 'Student', designation: 'Student', reason: 'Regular Daily Class / Lab' }));
                      setIdInput('');
                      setIdentifiedPerson(null);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1.5px solid ${modalRole === 'student' ? '#2563eb' : '#cbd5e1'}`,
                      background: modalRole === 'student' ? '#eff6ff' : '#ffffff',
                      color: modalRole === 'student' ? '#2563eb' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <GraduationCap size={15} />
                    <span>Student</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalRole('hod');
                      setFormData(prev => ({ ...prev, role: 'HOD', designation: 'Head of Department', reason: 'Official College Duty' }));
                      setIdInput('');
                      setIdentifiedPerson(null);
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1.5px solid ${modalRole === 'hod' ? '#d97706' : '#cbd5e1'}`,
                      background: modalRole === 'hod' ? '#fef3c7' : '#ffffff',
                      color: modalRole === 'hod' ? '#d97706' : '#475569',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Building2 size={15} />
                    <span>HOD</span>
                  </button>
                </div>
              </div>

              {/* ID / Code Autocomplete Lookup */}
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  {modalRole === 'student' ? 'Student Roll No / ID *' : modalRole === 'hod' ? 'HOD Staff Code / Name *' : 'Staff Employee ID / Code *'}
                </label>
                <input
                  type="text"
                  className="wmn-form-input"
                  placeholder={`Type ${modalRole === 'student' ? 'Roll No or Name' : 'Employee ID or Name'} to search...`}
                  value={idInput}
                  onChange={(e) => handleIdSearchChange(e.target.value)}
                  onFocus={() => setShowDropdown(Boolean(idInput.trim()))}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  required
                />

                {/* Autocomplete Dropdown */}
                {showDropdown && modalAutocompleteList.length > 0 && (
                  <div
                    ref={dropdownRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      background: '#ffffff',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '4px'
                    }}
                  >
                    {modalAutocompleteList.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectFromDirectory(item)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.84rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <div>
                          <strong>{item.name || item.studentName || item.staffName}</strong>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {item.id || item.studentId || item.staffId || item.rollNo} • {item.department || item.dept || 'General'}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: item.currentStatus === 'Inside Campus' ? '#dcfce7' : '#f1f5f9',
                          color: item.currentStatus === 'Inside Campus' ? '#166534' : '#64748b'
                        }}>
                          {item.currentStatus || 'Outside'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Name & Department Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Member full name"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              {/* Movement Type & Gate Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Direction *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, movementType: 'In' })}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${formData.movementType === 'In' ? '#059669' : '#cbd5e1'}`,
                        background: formData.movementType === 'In' ? '#ecfdf5' : '#ffffff',
                        color: formData.movementType === 'In' ? '#059669' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <LogIn size={16} />
                      <span>Entry (In)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, movementType: 'Out' })}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1.5px solid ${formData.movementType === 'Out' ? '#dc2626' : '#cbd5e1'}`,
                        background: formData.movementType === 'Out' ? '#fef2f2' : '#ffffff',
                        color: formData.movementType === 'Out' ? '#dc2626' : '#64748b',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <LogOut size={16} />
                      <span>Exit (Out)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Active Gate
                  </label>
                  <select
                    className="wmn-form-select"
                    value={formData.gate}
                    onChange={(e) => setFormData({ ...formData, gate: e.target.value })}
                  >
                    {GATES.map((g, i) => (
                      <option key={i} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vehicle & Pass Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Vehicle Number (Optional)
                  </label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. TN 09 AB 1234"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                    Gate Pass # (If any)
                  </label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={formData.passNumber}
                    onChange={(e) => setFormData({ ...formData, passNumber: e.target.value })}
                    placeholder="e.g. PASS-0042"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  Movement Reason / Remarks
                </label>
                <input
                  type="text"
                  className="wmn-form-input"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Regular college duty, Lab visit, Gate clearance..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setShowLogModal(false)}
                  disabled={submittingMovement}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  style={{
                    background: formData.movementType === 'In' ? '#059669' : '#dc2626',
                    border: 'none',
                    fontWeight: 800,
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  disabled={submittingMovement}
                >
                  <Check size={16} />
                  <span>
                    {submittingMovement ? 'Recording...' : `Record ${formData.movementType === 'In' ? 'Campus In' : 'Campus Out'}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampusMembersRegisterPage;
