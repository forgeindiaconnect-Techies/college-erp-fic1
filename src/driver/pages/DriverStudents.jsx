import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Search, MapPin, Phone, GraduationCap, ChevronRight, Check, X, 
  Compass, CheckCircle, Shield, ShieldCheck, AlertCircle, FileText, Lock, Edit3, 
  Calendar, Clock, Filter, Eye, Award, BarChart2, RefreshCw
} from 'lucide-react';
import { 
  getTransportStudents, 
  getTransportDrivers, 
  getTransportRoutes, 
  getStudentTransportAttendance, 
  markStudentTransportAttendance, 
  correctStudentTransportAttendance, 
  getStudentTransportAttendanceReport 
} from '../../api/index';
import './DriverDashboard.css';

const DriverStudents = () => {
  const [session, setSession] = useState({});
  const [students, setStudents] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  
  // URL Param checking for tab=report
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'report' ? 'report' : 'manifest';
  });
  
  // Sub-tab in Attendance Report: 'manifest' (daily stop manifest) vs 'history' (multi-day present vs absent days)
  const [reportSubTab, setReportSubTab] = useState('manifest');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  
  // Backend attendance state: map of studentId -> attendance record for selectedDate
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Correction Modal State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionStudent, setCorrectionStudent] = useState(null);
  const [correctionStatus, setCorrectionStatus] = useState('Present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // History Drill-down Modal State
  const [historyModalStudent, setHistoryModalStudent] = useState(null);

  // ── Bulk & Individual Attendance State ──
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // Sync draft from backend records
  useEffect(() => {
    if (!hasUnsavedChanges) {
      const initial = {};
      students.forEach(s => {
        if (attendanceRecords[s.studentId]) {
          initial[s.studentId] = attendanceRecords[s.studentId].status;
        }
      });
      setAttendanceDraft(initial);
    }
  }, [attendanceRecords, students, hasUnsavedChanges]);

  // Bulk: Mark All Present
  const handleMarkAllPresent = () => {
    const updated = {};
    students.forEach(s => {
      if (attendanceRecords[s.studentId]?.isLocked) {
        updated[s.studentId] = attendanceRecords[s.studentId].status;
      } else {
        updated[s.studentId] = 'Present';
      }
    });
    setAttendanceDraft(updated);
    setHasUnsavedChanges(true);
    setNotificationMsg({
      type: 'info',
      text: `Draft: All ${students.length} students marked Present. Customize any individual student below, then click "Save Attendance".`
    });
  };

  // Bulk: Mark All Absent
  const handleMarkAllAbsent = () => {
    const updated = {};
    students.forEach(s => {
      if (attendanceRecords[s.studentId]?.isLocked) {
        updated[s.studentId] = attendanceRecords[s.studentId].status;
      } else {
        updated[s.studentId] = 'Absent';
      }
    });
    setAttendanceDraft(updated);
    setHasUnsavedChanges(true);
    setNotificationMsg({
      type: 'info',
      text: `Draft: All ${students.length} students marked Absent. Customize any individual student below, then click "Save Attendance".`
    });
  };

  // Individual Student Status Change (Customize mode or direct click)
  const handleSetStudentDraft = (studentId, status) => {
    if (attendanceRecords[studentId]?.isLocked) {
      alert('Attendance for this student has already been saved and locked. Use the "Correct" action to request changes with an audit reason.');
      return;
    }
    setAttendanceDraft(prev => ({
      ...prev,
      [studentId]: status
    }));
    setHasUnsavedChanges(true);
  };

  // Save Bulk Attendance to Backend Database
  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setIsSavingBulk(true);
    try {
      const payload = {
        date: selectedDate,
        tripType: 'Pickup',
        routeId: routeInfo?.routeId || 'R-01',
        routeName: routeInfo?.name || 'East',
        vehicleNumber: routeInfo?.vehicle || 'TN 01 AB 1234',
        driverId: session.referenceId || session._id || 'DRV-0001',
        driverName: session.name || 'Viji',
        students: students.map(s => ({
          studentId: s.studentId,
          studentName: s.name,
          rollNo: s.rollNo || s.studentId,
          pickupPoint: s.pickupPoint || 'Campus Stop',
          status: attendanceDraft[s.studentId] || (attendanceRecords[s.studentId]?.status || 'Present')
        }))
      };

      const res = await markStudentTransportAttendance(payload);
      if (res && res.data) {
        const newRecords = { ...attendanceRecords };
        if (Array.isArray(res.data.records)) {
          res.data.records.forEach(r => {
            newRecords[r.studentId] = r;
          });
        }
        setAttendanceRecords(newRecords);
        setHasUnsavedChanges(false);
        setIsCustomizing(false);
        setNotificationMsg({
          type: 'success',
          text: res.data.message || `✓ Saved attendance for ${students.length} students to database.`
        });
        setTimeout(() => setNotificationMsg(null), 5000);
        fetchBackendAttendance(routeInfo?.routeId || 'R-01', selectedDate);
      }
    } catch (err) {
      console.error('Failed to save bulk attendance:', err);
      alert('Failed to save attendance: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSavingBulk(false);
    }
  };

  const fetchBackendAttendance = useCallback(async (routeId, targetDate = selectedDate) => {
    try {
      const activeRoute = routeId || routeInfo?.routeId || 'R-01';
      const dateToFetch = targetDate || todayStr;
      
      const [attRes, repRes] = await Promise.all([
        getStudentTransportAttendance({ date: dateToFetch, tripType: 'Pickup', routeId: activeRoute }).catch(() => ({ data: [] })),
        getStudentTransportAttendanceReport({ date: dateToFetch, tripType: 'Pickup', routeId: activeRoute }).catch(() => ({ data: null }))
      ]);

      if (attRes.data && Array.isArray(attRes.data)) {
        const map = {};
        attRes.data.forEach(item => {
          map[item.studentId] = item;
        });
        setAttendanceRecords(map);
      } else {
        setAttendanceRecords({});
      }

      if (repRes.data) {
        setAttendanceReport(repRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    }
  }, [routeInfo, selectedDate, todayStr]);

  // Handle Date changes
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    fetchBackendAttendance(routeInfo?.routeId || 'R-01', newDate);
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
        setSession(data);
        
        const driverId = data.referenceId || data._id;
        const tenantId = data.tenantId || 'mock_college_id';
        if (!driverId) { setLoading(false); return; }

        const scanLocalStorage = (keyPrefix) => {
          let items = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(keyPrefix)) {
              try {
                const parsed = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(parsed)) items.push(...parsed);
              } catch (e) {}
            }
          }
          return items;
        };

        const localDrivers = [
          ...JSON.parse(localStorage.getItem(`erp_transport_drivers_${tenantId}`) || '[]'),
          ...scanLocalStorage('erp_transport_drivers')
        ];
        const localRoutes  = [
          ...JSON.parse(localStorage.getItem(`erp_transport_routes_${tenantId}`)  || '[]'),
          ...scanLocalStorage('erp_transport_routes')
        ];
        const localStudents = [
          ...JSON.parse(localStorage.getItem(`erp_transport_students_${tenantId}`) || '[]'),
          ...scanLocalStorage('erp_transport_students')
        ];

        const [driversRes, routesRes, studentsRes] = await Promise.all([
          getTransportDrivers().catch(() => ({ data: [] })),
          getTransportRoutes().catch(() => ({ data: [] })),
          getTransportStudents().catch(() => ({ data: [] }))
        ]);

        const DEFAULT_ROUTES = [
          {
            _id: 'route_east_01',
            routeId: 'R-01',
            name: 'East',
            vehicle: 'TN 01 AB 1234',
            driver: 'Viji',
            capacity: 50,
            occupied: 0,
            points: ['Stop A', 'Stop B', 'Stop C', 'Stop D', 'College Campus']
          }
        ];

        const combinedRoutesRaw = [
          ...localRoutes,
          ...(routesRes.data || []),
          ...DEFAULT_ROUTES
        ];
        const allRoutes = Array.from(new Map(combinedRoutesRaw.map(r => [r.routeId || r._id || r.name, r])).values());

        const combinedDriversRaw = [
          ...localDrivers,
          ...(driversRes.data || []),
          { _id: 'drv_viji', driverId: 'DRV-001', name: 'Viji', vehicleNumber: 'TN 01 AB 1234', email: 'driver@college.edu', status: 'Active' }
        ];
        const allDrivers = Array.from(new Map(combinedDriversRaw.map(d => [d.driverId || d._id || d.name, d])).values());

        const allStudents = [
          ...localStudents,
          ...(studentsRes.data || []).filter(s => !localStudents.find(l => l.studentId === s.studentId))
        ];

        const cleanStr = (str) => (str || '').toString().trim().toLowerCase();
        const me = allDrivers.find(d => 
          (d.driverId && (cleanStr(d.driverId) === cleanStr(driverId) || cleanStr(d.driverId) === cleanStr(data.referenceId))) ||
          (d.email && cleanStr(d.email) === cleanStr(data.email)) ||
          (d.phone && cleanStr(d.phone).replace(/\s+/g, '') === cleanStr(driverId).replace(/\s+/g, '')) ||
          (d.name && (cleanStr(d.name) === cleanStr(data.name) || cleanStr(d.name) === cleanStr(driverId))) ||
          (d._id && (cleanStr(d._id) === cleanStr(driverId) || cleanStr(d._id) === cleanStr(data.referenceId)))
        );

        const meName = cleanStr(me?.name || data.name || data.driverName || 'viji');

        let myRoute = allRoutes.find(r => {
          const rDriver = cleanStr(r.driver);
          const nameMatch = meName && (rDriver === meName || rDriver.includes(meName) || meName.includes(rDriver));
          const idMatch = (data.referenceId && rDriver.includes(cleanStr(data.referenceId))) || (me?.driverId && rDriver.includes(cleanStr(me.driverId)));
          const routeMatch = me?.routeId && (cleanStr(r.routeId) === cleanStr(me.routeId) || cleanStr(r.name) === cleanStr(me.routeId));
          return nameMatch || idMatch || routeMatch;
        });

        if (!myRoute && allRoutes.length > 0) {
          myRoute = allRoutes.find(r => {
            const rDriver = cleanStr(r.driver);
            return rDriver && meName && (rDriver.includes(meName) || meName.includes(rDriver));
          }) || allRoutes[0];
        }
        setRouteInfo(myRoute);

        const meVehicle = cleanStr(me?.vehicleNumber || me?.assignedVehicle || data.vehicleNumber);
        const meRouteId = cleanStr(myRoute?.routeId || myRoute?.name || me?.routeId);

        const myStudents = allStudents.filter(s => {
          const sRoute = cleanStr(s.routeId);
          const sDriver = cleanStr(s.driverName);
          const sVehicle = cleanStr(s.vehicleNumber);

          if (meName && sDriver && (sDriver === meName || sDriver.includes(meName) || meName.includes(sDriver))) return true;
          if (meVehicle && sVehicle && (sVehicle === meVehicle || sVehicle.includes(meVehicle))) return true;
          if (meRouteId && sRoute && (sRoute === meRouteId || cleanStr(myRoute?.name) === sRoute)) return true;
          if (myRoute && (sRoute === cleanStr(myRoute.routeId) || sRoute === cleanStr(myRoute.name))) return true;

          return false;
        });

        const activeList = myStudents.length > 0 ? myStudents : allStudents;
        
        // Deduplicate students strictly by studentId to prevent duplicate rows in manifest and report
        const seen = new Set();
        const uniqueStudents = [];
        for (const s of activeList) {
          const key = (s.studentId || s._id || s.name || '').toString().trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            uniqueStudents.push(s);
          }
        }
        setStudents(uniqueStudents);

        // Fetch backend attendance records for selected date
        await fetchBackendAttendance(myRoute?.routeId || 'R-01', selectedDate);

      } catch (err) {
        console.error('Failed to load students', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [fetchBackendAttendance, selectedDate]);

  // Submit initial attendance: Present or Absent
  const handleMarkAttendance = async (student, status) => {
    const studentId = student.studentId;
    if (attendanceRecords[studentId]?.isLocked) {
      alert('Attendance for this student has already been saved and locked. Use the "Correct" action to request changes with an audit reason.');
      return;
    }

    setActionLoading(prev => ({ ...prev, [studentId]: true }));
    try {
      const payload = {
        studentId: student.studentId,
        studentName: student.name,
        pickupPoint: student.pickupPoint || 'Campus Stop',
        routeId: routeInfo?.routeId || 'R-01',
        tripType: 'Pickup',
        date: selectedDate,
        status: status, // 'Present' or 'Absent'
        boarded: status === 'Present'
      };

      const res = await markStudentTransportAttendance(payload);
      if (res && res.data) {
        setAttendanceRecords(prev => ({
          ...prev,
          [studentId]: res.data
        }));
        setNotificationMsg({
          type: 'success',
          text: `Marked ${student.name} as ${status} on ${selectedDate}. Record saved & locked.`
        });
        setTimeout(() => setNotificationMsg(null), 4000);
        // Refresh aggregate report
        fetchBackendAttendance(routeInfo?.routeId || 'R-01', selectedDate);
      }
    } catch (err) {
      console.error('Attendance mark error:', err);
      alert('Failed to mark attendance: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // Open correction modal
  const handleOpenCorrection = (student) => {
    const currentRec = attendanceRecords[student.studentId];
    setCorrectionStudent(student);
    setCorrectionStatus(currentRec?.status === 'Present' ? 'Absent' : 'Present');
    setCorrectionReason('');
    setShowCorrectionModal(true);
  };

  // Submit correction with reason
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      alert('Please enter a valid justification reason (at least 3 characters) for the audit trail.');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      const payload = {
        studentId: correctionStudent.studentId,
        date: selectedDate,
        tripType: 'Pickup',
        routeId: routeInfo?.routeId || 'R-01',
        status: correctionStatus,
        boarded: correctionStatus === 'Present',
        reason: correctionReason.trim()
      };

      const res = await correctStudentTransportAttendance(payload);
      if (res && res.data) {
        setAttendanceRecords(prev => ({
          ...prev,
          [correctionStudent.studentId]: res.data
        }));
        setShowCorrectionModal(false);
        setNotificationMsg({
          type: 'success',
          text: `Attendance corrected for ${correctionStudent.name} on ${selectedDate}. Audit history updated.`
        });
        setTimeout(() => setNotificationMsg(null), 4000);
        fetchBackendAttendance(routeInfo?.routeId || 'R-01', selectedDate);
      }
    } catch (err) {
      console.error('Correction submission error:', err);
      alert('Failed to submit correction: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // ── Dynamic Stop Breakdown Calculation (Guarantees Real Boarded Counts) ──
  const dynamicStopBreakdown = useMemo(() => {
    const stopSet = new Set();
    
    // Add points from registered students
    students.forEach(s => {
      if (s.pickupPoint && typeof s.pickupPoint === 'string' && s.pickupPoint.trim()) {
        stopSet.add(s.pickupPoint.trim());
      }
    });

    // Add points from backend report
    if (Array.isArray(attendanceReport?.stopBreakdown)) {
      attendanceReport.stopBreakdown.forEach(b => {
        if (b.stopName && typeof b.stopName === 'string' && b.stopName.trim()) {
          stopSet.add(b.stopName.trim());
        }
      });
    }

    // Add points from route
    if (Array.isArray(routeInfo?.points)) {
      routeInfo.points.forEach(p => {
        if (p && typeof p === 'string' && p.trim()) stopSet.add(p.trim());
      });
    }

    if (stopSet.size === 0) {
      stopSet.add('stop 1');
      stopSet.add('College Campus');
    }

    return Array.from(stopSet).map(stopName => {
      const cleanStop = stopName.trim().toLowerCase();

      // Find matching students for this stop
      const stopStudents = students.filter(s => {
        const p = (s.pickupPoint || '').trim().toLowerCase();
        return p === cleanStop || cleanStop.includes(p) || p.includes(cleanStop);
      });

      let boardedCount = 0;
      let absentCount = 0;

      stopStudents.forEach(s => {
        const rec = attendanceRecords[s.studentId];
        if (rec?.status === 'Present') {
          boardedCount++;
        } else if (rec?.status === 'Absent') {
          absentCount++;
        }
      });

      // Also merge backend counts if present
      const backendStop = (attendanceReport?.stopBreakdown || []).find(b => 
        (b.stopName || '').trim().toLowerCase() === cleanStop
      );

      const expectedCount = Math.max(stopStudents.length, backendStop?.expectedStudents || 0);
      const finalBoarded = Math.max(boardedCount, backendStop?.boardedCount || 0);
      const finalAbsent = Math.max(absentCount, backendStop?.absentCount || 0);
      const pendingCount = Math.max(0, expectedCount - (finalBoarded + finalAbsent));

      return {
        stopName,
        expectedStudents: expectedCount,
        boardedCount: finalBoarded,
        absentCount: finalAbsent,
        pendingCount,
        students: stopStudents
      };
    });
  }, [routeInfo, students, attendanceRecords, attendanceReport]);

  // ── Multi-Day Student Attendance History Aggregation (Days Present vs Absent) ──
  const combinedHistory = useMemo(() => {
    const historyMap = new Map();

    // From backend report
    if (Array.isArray(attendanceReport?.studentHistorySummary)) {
      attendanceReport.studentHistorySummary.forEach(item => {
        historyMap.set(String(item.studentId), { ...item });
      });
    }

    // Ensure all current students are included in history table
    students.forEach(s => {
      const sId = String(s.studentId);
      if (!historyMap.has(sId)) {
        historyMap.set(sId, {
          studentId: sId,
          name: s.name,
          pickupPoint: s.pickupPoint || 'Campus Stop',
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          attendancePercentage: 0,
          records: []
        });
      }
      
      // If current record exists in attendanceRecords and not in records array yet
      const cur = attendanceRecords[sId];
      if (cur) {
        const entry = historyMap.get(sId);
        const alreadyHasDate = entry.records.some(r => r.date === cur.date);
        if (!alreadyHasDate) {
          entry.totalDays++;
          if (cur.status === 'Present') entry.presentDays++;
          if (cur.status === 'Absent') entry.absentDays++;
          entry.attendancePercentage = entry.totalDays > 0 ? Math.round((entry.presentDays / entry.totalDays) * 100) : 0;
          entry.records.unshift({
            date: cur.date,
            status: cur.status,
            boarded: cur.boarded,
            boardedAt: cur.boardedAt,
            markedBy: cur.markedBy,
            tripType: cur.tripType
          });
        }
      }
    });

    return Array.from(historyMap.values());
  }, [attendanceReport, students, attendanceRecords]);

  // Active status helper
  const getActiveStatus = (sId) => {
    if (attendanceDraft[sId]) return attendanceDraft[sId];
    if (attendanceRecords[sId]) return attendanceRecords[sId].status;
    return 'PENDING';
  };

  // Overall KPI counts (Updates immediately in real time)
  const totalCount = students.length;
  const presentCount = students.filter(s => getActiveStatus(s.studentId) === 'Present').length;
  const absentCount = students.filter(s => getActiveStatus(s.studentId) === 'Absent').length;
  const pendingCount = Math.max(0, totalCount - (presentCount + absentCount));

  const filteredStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.pickupPoint && s.pickupPoint.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const status = getActiveStatus(s.studentId);
    const matchFilter = 
      selectedFilter === 'ALL' || 
      (selectedFilter === 'PRESENT' && status === 'Present') ||
      (selectedFilter === 'ABSENT' && status === 'Absent') ||
      (selectedFilter === 'PENDING' && status === 'PENDING');

    return matchSearch && matchFilter;
  });

  // Calculate Yesterday's date string
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  return (
    <div className="driver-page-container" style={{ maxWidth: '1440px', margin: '0 auto', fontFamily: 'Inter, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── Enterprise Real-Time Header Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Student Transit Operations Console
            </h1>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '20px', border: '1px solid #a7f3d0' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }}></span>
              LIVE ROSTER SYNC
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Transit Manifest • Route <strong>{routeInfo?.name || 'East'}</strong> ({routeInfo?.routeId || 'R-01'}) • Driver <strong>{session.name || 'Driver'}</strong> ({session.referenceId || 'DRV-0001'})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Main Top Tab Switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            <button 
              onClick={() => setActiveTab('manifest')}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'manifest' ? '#2563eb' : 'transparent',
                color: activeTab === 'manifest' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={15} /> Passenger Manifest
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === 'report' ? '#2563eb' : 'transparent',
                color: activeTab === 'report' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={15} /> Attendance Report & History
            </button>
          </div>

          <button 
            onClick={() => window.location.reload()}
            title="Refresh Roster Data"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Notification Banner ── */}
      {notificationMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          fontWeight: 600,
          background: notificationMsg.type === 'success' ? '#ecfdf5' : '#fee2e2',
          color: notificationMsg.type === 'success' ? '#047857' : '#b91c1c',
          border: notificationMsg.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={16} />
          {notificationMsg.text}
        </div>
      )}

      {/* ── Compact Transit KPI Bar (For Selected Date) ── */}
      <div className="driver-kpi-grid" style={{ marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div 
          onClick={() => setSelectedFilter('ALL')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Expected</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{totalCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>Assigned to Route</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('PRESENT')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'PRESENT' ? '2px solid #16a34a' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Present / Boarded</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a', marginTop: '0.2rem' }}>{presentCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '0.15rem' }}>Confirmed on {selectedDate}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('ABSENT')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'ABSENT' ? '2px solid #dc2626' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Reported Absent</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626', marginTop: '0.2rem' }}>{absentCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: '0.15rem' }}>Not Boarded</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('PENDING')}
          style={{ background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '8px', border: selectedFilter === 'PENDING' ? '2px solid #f59e0b' : '1px solid #e2e8f0', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Pending Check-in</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>{pendingCount}</div>
          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: '0.15rem' }}>Awaiting at Waypoints</div>
        </div>
      </div>

      {activeTab === 'report' ? (
        /* ── Driver Attendance Report & History Section ── */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          
          {/* Top Date & Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={18} style={{ color: '#2563eb' }} />
                Trip Attendance & Multi-Day Transit Report
              </h2>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                Active Date: <strong style={{ color: '#0f172a' }}>{selectedDate}</strong> {selectedDate === todayStr && <span style={{ color: '#16a34a', fontWeight: 700 }}>(Today)</span>}
                {' '}| Trip: <strong>Pickup Session</strong> | Route: <strong>{routeInfo?.name || 'East'} ({routeInfo?.routeId || 'R-01'})</strong>
              </div>
            </div>

            {/* Date Picker & Quick Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.2rem 0.5rem' }}>
                <Calendar size={14} style={{ color: '#64748b', marginRight: '0.4rem' }} />
                <input 
                  type="date" 
                  value={selectedDate}
                  max={todayStr}
                  onChange={(e) => handleDateChange(e.target.value)}
                  style={{ border: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
                />
              </div>

              <button 
                type="button"
                onClick={() => handleDateChange(todayStr)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: selectedDate === todayStr ? '#2563eb' : '#ffffff',
                  color: selectedDate === todayStr ? '#ffffff' : '#334155',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Today
              </button>

              <button 
                type="button"
                onClick={() => handleDateChange(yesterdayStr)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: selectedDate === yesterdayStr ? '#2563eb' : '#ffffff',
                  color: selectedDate === yesterdayStr ? '#ffffff' : '#334155',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Yesterday
              </button>

              <button 
                type="button"
                onClick={() => fetchBackendAttendance(routeInfo?.routeId || 'R-01', selectedDate)}
                style={{ padding: '0.35rem 0.75rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                title="Refresh Report Data"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Sub-Tab Navigation Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setReportSubTab('manifest')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                background: reportSubTab === 'manifest' ? '#eff6ff' : 'transparent',
                color: reportSubTab === 'manifest' ? '#1d4ed8' : '#64748b',
                fontWeight: 800,
                fontSize: '0.82rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderBottom: reportSubTab === 'manifest' ? '2px solid #2563eb' : 'none',
                marginBottom: '-0.6rem'
              }}
            >
              <Users size={15} /> 1. Waypoint Manifest ({selectedDate})
            </button>

            <button
              onClick={() => setReportSubTab('history')}
              style={{
                padding: '0.45rem 1rem',
                border: 'none',
                background: reportSubTab === 'history' ? '#eff6ff' : 'transparent',
                color: reportSubTab === 'history' ? '#1d4ed8' : '#64748b',
                fontWeight: 800,
                fontSize: '0.82rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderBottom: reportSubTab === 'history' ? '2px solid #2563eb' : 'none',
                marginBottom: '-0.6rem'
              }}
            >
              <BarChart2 size={15} /> 2. Multi-Day Attendance History (Present vs Absent Days)
            </button>
          </div>

          {/* Sub-Tab 1: Daily Waypoint Manifest */}
          {reportSubTab === 'manifest' && (
            <div>
              {/* Stop-wise summary grid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                  Waypoint Boarding Breakdown for {selectedDate}
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Live stop counts computed dynamically from student pickup points
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {dynamicStopBreakdown.map((s, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: s.boardedCount > 0 ? '1px solid #bbf7d0' : '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>{s.stopName}</span>
                      <span style={{ fontSize: '0.7rem', background: '#e2e8f0', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                        Stop #{idx + 1}
                      </span>
                    </div>

                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                      <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.boardedCount > 0 ? '#16a34a' : '#0f172a' }}>
                        {s.boardedCount}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        / {s.expectedStudents} boarded
                      </span>
                    </div>

                    <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', color: '#64748b', display: 'flex', gap: '0.75rem' }}>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>Absent: {s.absentCount}</span>
                      <span style={{ color: '#b45309', fontWeight: 600 }}>Pending: {s.pendingCount}</span>
                    </div>

                    {s.students && s.students.length > 0 && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.7rem', color: '#475569' }}>
                        👥 {s.students.map(st => st.name).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Detailed Passenger Status Manifest Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#334155', margin: 0 }}>
                  Detailed Attendance Records ({selectedDate})
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Showing {students.length} assigned students
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Date</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Roll ID</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Pickup Stop</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Attendance Status</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Boarding Status</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Boarded Time</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Lock Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, idx) => {
                      const rec = attendanceRecords[student.studentId];
                      const status = rec ? rec.status : 'Pending';
                      const boarded = rec ? rec.boarded : false;
                      const isLocked = rec ? rec.isLocked : false;
                      const boardedAt = rec?.boardedAt ? new Date(rec.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : rec?.updatedAt ? new Date(rec.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                            {selectedDate}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>{student.name}</td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>{student.studentId}</td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: '#334155' }}>
                              <MapPin size={12} color="#2563eb" /> {student.pickupPoint || 'Campus Stop'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              background: status === 'Present' ? '#dcfce7' : status === 'Absent' ? '#fee2e2' : '#fef3c7',
                              color: status === 'Present' ? '#15803d' : status === 'Absent' ? '#b91c1c' : '#b45309',
                              border: status === 'Present' ? '1px solid #bbf7d0' : status === 'Absent' ? '1px solid #fecaca' : '1px solid #fde68a'
                            }}>
                              {status}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            {boarded ? (
                              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.75rem' }}>✓ Boarded</span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Not Boarded</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontFamily: 'monospace', color: '#475569', fontSize: '0.75rem' }}>
                            {boardedAt}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            {isLocked ? (
                              <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                <Lock size={12} /> Locked
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Unlocked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Multi-Day Student Attendance History (Present vs Absent Days) */}
          {reportSubTab === 'history' && (
            <div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  📊 Multi-Day Attendance Summary (Days Present vs Days Absent)
                </h4>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  Comprehensive breakdown of how many days each student was Present vs Absent across all recorded transit trips for Route {routeInfo?.name || 'East'}.
                </p>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Roll ID</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Pickup Stop</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Total Days</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Days Present</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Days Absent</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Attendance Rate</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Recent Records</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>History Log</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedHistory.map((item, idx) => {
                      const total = item.totalDays || 0;
                      const present = item.presentDays || 0;
                      const absent = item.absentDays || 0;
                      const pct = item.attendancePercentage || (total > 0 ? Math.round((present / total) * 100) : 0);

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                            {item.name}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>
                            {item.studentId}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600, color: '#334155' }}>
                              <MapPin size={12} color="#2563eb" /> {item.pickupPoint || 'Campus Stop'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                            {total} {total === 1 ? 'day' : 'days'}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #bbf7d0' }}>
                              {present} {present === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: '0.75rem', border: '1px solid #fecaca' }}>
                              {absent} {absent === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                              <div style={{ width: '50px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: pct >= 75 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#dc2626' }}></div>
                              </div>
                              <span style={{ fontWeight: 800, fontSize: '0.75rem', color: pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {(item.records || []).slice(0, 3).map((r, rIdx) => (
                                <span 
                                  key={rIdx} 
                                  title={`${r.date}: ${r.status}`}
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px',
                                    background: r.status === 'Present' ? '#dcfce7' : '#fee2e2',
                                    color: r.status === 'Present' ? '#15803d' : '#b91c1c',
                                    border: r.status === 'Present' ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                  }}
                                >
                                  {r.date ? r.date.slice(5) : 'Date'}: {r.status === 'Present' ? 'P' : 'A'}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <button
                              onClick={() => setHistoryModalStudent(item)}
                              style={{
                                padding: '0.25rem 0.6rem',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Eye size={12} /> View Log
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* ── Passenger Manifest & Active Attendance ── */
        <div>
          {/* ── Bulk Attendance Action Bar ── */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginRight: '0.2rem' }}>
                ⚡ Bulk Actions:
              </span>
              <button
                type="button"
                onClick={handleMarkAllPresent}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #86efac',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Check size={14} /> Mark All Present
              </button>

              <button
                type="button"
                onClick={handleMarkAllAbsent}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #fca5a5',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <X size={14} /> Mark All Absent
              </button>

              <button
                type="button"
                onClick={() => setIsCustomizing(prev => !prev)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: isCustomizing ? '2px solid #2563eb' : '1px solid #bfdbfe',
                  background: isCustomizing ? '#eff6ff' : '#ffffff',
                  color: '#1d4ed8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Edit3 size={14} /> {isCustomizing ? 'Done Customizing' : 'Customize Attendance'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {hasUnsavedChanges && (
                <span style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: 700, background: '#fef3c7', padding: '0.25rem 0.6rem', borderRadius: '4px', border: '1px solid #fde68a' }}>
                  ⚠️ Unsaved Draft
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSavingBulk}
                style={{
                  padding: '0.45rem 1.15rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#047857',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: isSavingBulk ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 2px 4px rgba(4, 120, 87, 0.25)',
                  opacity: isSavingBulk ? 0.7 : 1
                }}
              >
                {isSavingBulk ? (
                  <>
                    <RefreshCw size={14} /> Saving to Database...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} /> Save Attendance
                  </>
                )}
              </button>
            </div>
          </div>

          {isCustomizing && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: '#1e40af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>✏️</span>
              <span><strong>Customize Mode Active:</strong> Click Present or Absent on any student below to modify their status without affecting other passengers. When finished, click <strong>Save Attendance</strong>.</span>
            </div>
          )}

          {/* ── Search & Filter Controls ── */}
          <div className="driver-search-filter-bar" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: '420px', width: '100%' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search student by name, roll #, or pickup stop..." 
                style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 2rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none', background: '#ffffff', color: '#0f172a' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'PRESENT', 'ABSENT', 'PENDING'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setSelectedFilter(mode)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid #cbd5e1',
                    background: selectedFilter === mode ? '#2563eb' : '#ffffff',
                    color: selectedFilter === mode ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* ── Passenger Manifest Table ── */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No students found matching your criteria.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Student Name</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Student / Roll ID</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Pickup Stop</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Parent Phone</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Current Status ({selectedDate})</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>Attendance Controls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, idx) => {
                      const phone = student.studentProfile?.user?.phone || 'N/A';
                      const rec = attendanceRecords[student.studentId];
                      const isLocked = rec ? rec.isLocked : false;
                      const status = getActiveStatus(student.studentId);
                      const isLoading = actionLoading[student.studentId];

                      return (
                        <tr key={student._id ? `${student._id}-${idx}` : `${student.studentId || 'st'}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                            {student.name}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', fontFamily: 'monospace', color: '#64748b' }}>
                            {student.studentId}
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#334155', fontWeight: 600 }}>
                              <MapPin size={13} style={{ color: '#2563eb' }} />
                              {student.pickupPoint || 'Campus Stop'}
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 1rem' }}>
                            {phone !== 'N/A' ? (
                              <a href={`tel:${phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#166534', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                <Phone size={11} /> {phone}
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Not Provided</span>
                            )}
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                status === 'Present' ? '#dcfce7' :
                                status === 'Absent' ? '#fee2e2' : '#fef3c7',
                              color:
                                status === 'Present' ? '#15803d' :
                                status === 'Absent' ? '#b91c1c' : '#b45309',
                              border:
                                status === 'Present' ? '1px solid #bbf7d0' :
                                status === 'Absent' ? '1px solid #fecaca' : '1px solid #fde68a'
                            }}>
                              {status === 'Present' ? '✓ Present (Boarded)' : status === 'Absent' ? '✕ Absent' : '⏳ Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                            {isLocked ? (
                              /* Locked State: Buttons Disabled, Provide Authorized Correction Action */
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  border: '1px solid #cbd5e1'
                                }}>
                                  <Lock size={11} /> Saved & Locked
                                </span>
                                <button
                                  onClick={() => handleOpenCorrection(student)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '4px',
                                    border: '1px solid #bfdbfe',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                  title="Authorized correction requires reason for audit history"
                                >
                                  <Edit3 size={11} /> Correct
                                </button>
                              </div>
                            ) : (
                              /* Draft / Customization Controls: Present / Absent Buttons */
                              <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleSetStudentDraft(student.studentId, 'Present')}
                                  style={{
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '4px',
                                    border: status === 'Present' ? '2px solid #15803d' : '1px solid #86efac',
                                    background: status === 'Present' ? '#16a34a' : '#f0fdf4',
                                    color: status === 'Present' ? '#ffffff' : '#15803d',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✓ Present
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetStudentDraft(student.studentId, 'Absent')}
                                  style={{
                                    padding: '0.25rem 0.65rem',
                                    borderRadius: '4px',
                                    border: status === 'Absent' ? '2px solid #b91c1c' : '1px solid #fca5a5',
                                    background: status === 'Absent' ? '#dc2626' : '#fef2f2',
                                    color: status === 'Absent' ? '#ffffff' : '#b91c1c',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✕ Absent
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Multi-Day Student Date History Modal ── */}
      {historyModalStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="#2563eb" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {historyModalStudent.name} — Transit Attendance Log
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Roll ID: <strong>{historyModalStudent.studentId}</strong> | Stop: <strong>{historyModalStudent.pickupPoint}</strong>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setHistoryModalStudent(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Attendance stats pills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>TOTAL DAYS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{historyModalStudent.totalDays || 0}</div>
              </div>
              <div style={{ background: '#ecfdf5', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #a7f3d0' }}>
                <div style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 700 }}>PRESENT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#047857' }}>{historyModalStudent.presentDays || 0}</div>
              </div>
              <div style={{ background: '#fee2e2', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: '0.68rem', color: '#b91c1c', fontWeight: 700 }}>ABSENT</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b91c1c' }}>{historyModalStudent.absentDays || 0}</div>
              </div>
              <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '6px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.68rem', color: '#1d4ed8', fontWeight: 700 }}>RATE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8' }}>{historyModalStudent.attendancePercentage || 0}%</div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
              Date-by-Date Attendance Records
            </h4>

            {(!historyModalStudent.records || historyModalStudent.records.length === 0) ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                No past attendance records found for this student.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Date</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Trip Session</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Boarded</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModalStudent.records.map((r, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: '#0f172a' }}>{r.date}</td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>{r.tripType || 'Pickup'}</td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          background: r.status === 'Present' ? '#dcfce7' : '#fee2e2',
                          color: r.status === 'Present' ? '#15803d' : '#b91c1c'
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                        {r.boarded ? <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: '#94a3b8' }}>No</span>}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        {r.boardedAt ? new Date(r.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recorded'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button 
                onClick={() => setHistoryModalStudent(null)}
                style={{ padding: '0.45rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Authorized Correction Modal ── */}
      {showCorrectionModal && correctionStudent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Shield size={20} color="#2563eb" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Authorized Attendance Correction
              </h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
              Correcting saved attendance for <strong>{correctionStudent.name}</strong> ({correctionStudent.studentId}) on <strong>{selectedDate}</strong>. Changes are logged with an audit trail.
            </p>

            <form onSubmit={handleSubmitCorrection}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  Target Status
                </label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="correctionStatus" 
                      value="Present" 
                      checked={correctionStatus === 'Present'} 
                      onChange={() => setCorrectionStatus('Present')}
                    />
                    Present (Boarded)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="correctionStatus" 
                      value="Absent" 
                      checked={correctionStatus === 'Absent'} 
                      onChange={() => setCorrectionStatus('Absent')}
                    />
                    Absent (Not Boarded)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                  Correction Reason / Justification (Required for Audit Trail)
                </label>
                <textarea 
                  rows="3"
                  required
                  placeholder="e.g. Student boarded at Stop A after initial roll check..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCorrectionModal(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingCorrection || !correctionReason.trim()}
                  style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: isSubmittingCorrection || !correctionReason.trim() ? 'not-allowed' : 'pointer' }}
                >
                  {isSubmittingCorrection ? 'Saving...' : 'Confirm Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverStudents;
