import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Search, 
  Filter, Download, RefreshCw, Save, Check, Users, Briefcase, 
  GraduationCap, Truck, ArrowLeft, ChevronLeft, ChevronRight,
  ShieldCheck, FileSpreadsheet, UserCheck, CalendarDays, Sparkles,
  FileBarChart, Edit3, Award, Layers
} from 'lucide-react';
import { 
  getEmployeeAttendanceReports, 
  markStaffAttendance, 
  getDepartments,
  getTransportDrivers
} from '../../api';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './DailyAttendance.css';

const getEmployeeClassification = (item) => {
  if (!item) return { category: 'Teaching', designation: 'Faculty' };

  const emp = item.employeeId || {};
  const role = String(item.role || emp.role || '').toLowerCase();
  const des = String(item.designation || emp.designation || '').toLowerCase();
  const dept = String(item.department || emp.department || item.dept || emp.dept || '').toLowerCase();
  const name = String(item.name || emp.name || '').toLowerCase();
  const email = String(item.email || emp.email || '').toLowerCase();
  const explicitCat = String(item.category || emp.category || '').toLowerCase();
  const refId = String(item.referenceId || emp.referenceId || item.id || '').toUpperCase();

  // 1. Check Driver
  if (role === 'driver' || explicitCat === 'driver' || des.includes('driver') || dept.includes('transport') || name.includes('driver') || email.includes('driver') || refId.startsWith('DRV')) {
    return { category: 'Driver', designation: 'Driver' };
  }

  // 2. Check Non-Teaching keywords & roles
  const nonTeachingRoles = ['admin', 'accounts', 'accountant', 'librarian', 'hostel', 'warden', 'clerk', 'office staff', 'sub admin', 'subadmin', 'super admin', 'superadmin', 'watchman', 'security'];
  const nonTeachingKeywords = [
    'account', 'admin', 'librar', 'hostel', 'warden', 'clerk', 'office',
    'security', 'watchman', 'guard', 'peon', 'attender', 'technician', 'electrician', 'plumber',
    'mechanic', 'gardener', 'sweeper', 'non-teaching', 'non teaching', 'lab assistant',
    'placement', 'selvi', 'sundar'
  ];

  const isExplicitNonTeaching = explicitCat === 'non-teaching' || explicitCat === 'nonteaching';
  const hasNonTeachingRole = nonTeachingRoles.includes(role);
  const hasNonTeachingWord = nonTeachingKeywords.some(w => des.includes(w) || role.includes(w) || dept.includes(w) || name.includes(w) || email.includes(w));

  if (isExplicitNonTeaching || hasNonTeachingRole || hasNonTeachingWord) {
    let designation = emp.designation || item.designation;
    if (!designation || designation === 'Faculty' || designation === 'Professor' || designation === 'Staff') {
      if (role === 'watchman' || role === 'security' || name.includes('watchman') || name.includes('security') || name.includes('natrajan') || name.includes('ramesh')) designation = 'Security Officer';
      else if (role === 'accounts' || name.includes('account') || email.includes('account') || name.includes('selvi')) designation = 'Accounts Officer';
      else if (role === 'admin' || name.includes('dhanush')) designation = 'System Admin';
      else if (name.includes('hostel') || email.includes('hostel') || role === 'hostel') designation = 'Hostel Warden';
      else if (name.includes('sundar') || email.includes('sundar') || role === 'librarian') designation = 'Librarian';
      else designation = 'Administrative Staff';
    }
    return { category: 'Non-Teaching', designation };
  }

  // 3. Teaching Staff / HOD
  const isHod = role === 'hod' || des.includes('hod') || name.includes('hod') || email.includes('hod') || refId.startsWith('HOD');
  return {
    category: 'Teaching',
    designation: isHod ? 'Head of Department' : (emp.designation && emp.designation !== 'Staff' ? emp.designation : 'Faculty')
  };
};

const getMonthRegisterKey = (dateStr) => {
  const m = (dateStr || new Date().toISOString().split('T')[0]).slice(0, 7);
  return `erp_monthly_duty_register_${m}`;
};

const loadMonthlyRegisterFromStorage = (dateStr) => {
  try {
    const raw = localStorage.getItem(getMonthRegisterKey(dateStr));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

const saveMonthlyRegisterToStorage = (dateStr, reg) => {
  try {
    localStorage.setItem(getMonthRegisterKey(dateStr), JSON.stringify(reg));
  } catch (e) {}
};

const getEmployeeLookupKeys = (item) => {
  if (!item) return [];
  const emp = item.employeeId || {};
  const keys = [];
  if (emp._id) keys.push(`id_${emp._id}`);
  if (item._id && !String(item._id).startsWith('unmarked_')) keys.push(`id_${item._id}`);
  if (emp.referenceId) keys.push(`ref_${String(emp.referenceId).trim().toUpperCase()}`);
  if (item.referenceId) keys.push(`ref_${String(item.referenceId).trim().toUpperCase()}`);
  if (item.driverId) keys.push(`ref_${String(item.driverId).trim().toUpperCase()}`);
  if (emp.email) keys.push(`email_${String(emp.email).trim().toLowerCase()}`);
  if (item.email) keys.push(`email_${String(item.email).trim().toLowerCase()}`);
  if (emp.name) keys.push(`name_${String(emp.name).trim().toLowerCase()}`);
  if (item.name) keys.push(`name_${String(item.name).trim().toLowerCase()}`);
  return Array.from(new Set(keys));
};

const DailyAttendance = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get('tab') === 'monthly' ? 'monthly' : 'daily';

  const [activeMainTab, setActiveMainTab] = useState(initialTab); // 'daily' | 'monthly'

  useEffect(() => {
    const currentTab = new URLSearchParams(location.search).get('tab');
    if (currentTab === 'monthly') setActiveMainTab('monthly');
    else if (currentTab === 'daily') setActiveMainTab('daily');
  }, [location.search]);

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeCategory, setActiveCategory] = useState('ALL'); // 'ALL' | 'Teaching' | 'Non-Teaching' | 'Driver'
  const [reports, setReports] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Local changes pending save
  const [modifiedRecords, setModifiedRecords] = useState({});
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Persistent Monthly Attendance Register
  const [monthlyRegister, setMonthlyRegister] = useState(() => loadMonthlyRegisterFromStorage(selectedDate));
  const [adjustingModal, setAdjustingModal] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, deptRes, allDatesRes] = await Promise.all([
        getEmployeeAttendanceReports({ date: selectedDate }).catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getEmployeeAttendanceReports({ date: 'all' }).catch(() => ({ data: [] }))
      ]);

      const rawReports = Array.isArray(attRes.data) ? attRes.data : [];
      const allReports = Array.isArray(allDatesRes.data) ? allDatesRes.data : [];

      // 1. Reclassify each report item accurately
      const classified = rawReports.map(item => {
        const { category, designation } = getEmployeeClassification(item);
        return {
          ...item,
          category,
          employeeId: {
            ...(item.employeeId || {}),
            category,
            designation: (item.employeeId?.designation && item.employeeId?.designation !== 'Faculty' && item.employeeId?.designation !== 'Staff')
              ? item.employeeId.designation
              : designation
          }
        };
      });

      // 2. Multi-Key Deduplication
      const deduplicatedMap = new Map();
      const keyToPrimary = new Map();

      classified.forEach(item => {
        const emp = item.employeeId || {};
        const refKey = emp.referenceId ? `ref_${String(emp.referenceId).trim().toUpperCase()}` : null;
        const emailKey = emp.email ? `email_${String(emp.email).trim().toLowerCase()}` : null;
        const idKey = emp._id ? `id_${String(emp._id)}` : `item_${item._id}`;

        let primaryKey = null;
        if (refKey && keyToPrimary.has(refKey)) {
          primaryKey = keyToPrimary.get(refKey);
        } else if (emailKey && keyToPrimary.has(emailKey)) {
          primaryKey = keyToPrimary.get(emailKey);
        } else if (idKey && keyToPrimary.has(idKey)) {
          primaryKey = keyToPrimary.get(idKey);
        } else {
          primaryKey = refKey || emailKey || idKey;
        }

        if (refKey) keyToPrimary.set(refKey, primaryKey);
        if (emailKey) keyToPrimary.set(emailKey, primaryKey);
        if (idKey) keyToPrimary.set(idKey, primaryKey);

        const existing = deduplicatedMap.get(primaryKey);
        if (!existing) {
          deduplicatedMap.set(primaryKey, item);
        } else {
          const hasCheckIn = item.checkIn || item.status === 'Present' || item.status === 'Late';
          const existingHasCheckIn = existing.checkIn || existing.status === 'Present' || existing.status === 'Late';

          if (hasCheckIn && !existingHasCheckIn) {
            deduplicatedMap.set(primaryKey, item);
          } else if (hasCheckIn && existingHasCheckIn) {
            const itemTime = item.checkIn ? new Date(item.checkIn).getTime() : 0;
            const existingTime = existing.checkIn ? new Date(existing.checkIn).getTime() : 0;
            if (itemTime >= existingTime) {
              deduplicatedMap.set(primaryKey, item);
            }
          }
        }
      });

      const finalReports = Array.from(deduplicatedMap.values());
      setReports(finalReports);

      // Ingest all marked dates into the Monthly Attendance Register for this month
      const currentMonthKey = selectedDate.slice(0, 7);
      setMonthlyRegister(prevReg => {
        const nextReg = { ...(loadMonthlyRegisterFromStorage(selectedDate) || {}), ...prevReg };

        // Process all marked reports in database
        allReports.forEach(rec => {
          if (!rec.date) return;
          const recDateStr = String(rec.date).split('T')[0];
          if (!recDateStr.startsWith(currentMonthKey)) return;
          const st = rec.status;
          if (!st || st === 'Not Marked') return;

          const keys = getEmployeeLookupKeys(rec);
          keys.forEach(k => {
            if (!nextReg[k]) nextReg[k] = { dates: {} };
            nextReg[k].dates = { ...(nextReg[k].dates || {}), [recDateStr]: st };
          });
        });

        // Also record today's statuses if present
        finalReports.forEach(rec => {
          const st = rec.status;
          if (!st || st === 'Not Marked') return;
          const keys = getEmployeeLookupKeys(rec);
          keys.forEach(k => {
            if (!nextReg[k]) nextReg[k] = { dates: {} };
            nextReg[k].dates = { ...(nextReg[k].dates || {}), [selectedDate]: st };
          });
        });

        saveMonthlyRegisterToStorage(selectedDate, nextReg);
        return nextReg;
      });

      const depts = Array.isArray(deptRes.data) 
        ? deptRes.data 
        : (deptRes.data?.departments || deptRes.data?.data || []);
      setDepartments(depts);
      setModifiedRecords({});
    } catch (err) {
      console.error('Failed to load daily attendance records:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization
  useRealtimeSync(loadData, ['employee-attendance', 'transport-attendance', 'staff', 'transport-driver-attendance']);

  // Date handlers
  const handleDateChange = (newDateStr) => {
    if (Object.keys(modifiedRecords).length > 0) {
      if (!window.confirm('You have unsaved attendance changes for this date. Proceed without saving?')) {
        return;
      }
    }
    setSelectedDate(newDateStr);
    setMonthlyRegister(loadMonthlyRegisterFromStorage(newDateStr));
  };

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    handleDateChange(d.toISOString().split('T')[0]);
  };

  const setDateToToday = () => {
    handleDateChange(new Date().toISOString().split('T')[0]);
  };

  // Helper to get effective attendance status for an employee
  const getEffectiveRecord = (item) => {
    const empId = item.employeeId?._id || item.employeeId;
    const modified = modifiedRecords[empId];
    if (modified) {
      return {
        ...item,
        status: modified.status !== undefined ? modified.status : item.status,
        remarks: modified.remarks !== undefined ? modified.remarks : (item.remarks || '')
      };
    }
    return item;
  };

  // Compute aggregated monthly record for an employee using persistent register + backend data
  const computeMonthlyRecord = useCallback((item) => {
    const emp = item.employeeId || {};
    const effectiveStatus = item.status || 'Not Marked';
    const monthKey = selectedDate.slice(0, 7);
    const totalDaysInMonth = 30; // standard 30 days display

    const keys = getEmployeeLookupKeys(item);
    let regEntry = null;
    for (const k of keys) {
      if (monthlyRegister[k]) {
        regEntry = monthlyRegister[k];
        break;
      }
    }

    const datesMap = { ...(regEntry?.dates || {}) };
    if (effectiveStatus && effectiveStatus !== 'Not Marked') {
      datesMap[selectedDate] = effectiveStatus;
    }

    let localPresent = 0;
    let localAbsent = 0;
    let localLeave = 0;
    let localLate = 0;
    let localHalfDay = 0;

    Object.entries(datesMap).forEach(([dStr, st]) => {
      if (dStr.startsWith(monthKey)) {
        if (st === 'Present' || st === 'Late' || st === 'Half Day') localPresent++;
        if (st === 'Absent' || st === 'LOP') localAbsent++;
        if (st === 'Leave' || st === 'On Leave') localLeave++;
        if (st === 'Late') localLate++;
        if (st === 'Half Day') localHalfDay++;
      }
    });

    const beMon = item.monthlyAttendance || {};
    const bePresent = Number(beMon.presentDays || 0);

    let presentDays = regEntry?.manualPresent != null
      ? Number(regEntry.manualPresent)
      : Math.max(localPresent, bePresent);

    if (presentDays === 0 && (effectiveStatus === 'Present' || effectiveStatus === 'Late' || effectiveStatus === 'Half Day')) {
      presentDays = 1;
    }

    const absentDays = Math.max(localAbsent, Number(beMon.absentDays || 0));
    const leaveDays = Math.max(localLeave, Number(beMon.leaveDays || 0));
    const percentage = Number(((presentDays / totalDaysInMonth) * 100).toFixed(1));

    const [yr, mo] = monthKey.split('-').map(Number);
    const monthName = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      presentDays,
      absentDays,
      leaveDays,
      lateDays: localLate,
      halfDayDays: localHalfDay,
      totalDaysInMonth,
      percentage,
      monthName,
      markedDates: datesMap,
      manualPresent: regEntry?.manualPresent
    };
  }, [monthlyRegister, selectedDate]);

  // Mark single employee status
  const handleMarkStatus = (empId, status, currentItem) => {
    setModifiedRecords(prev => {
      const existing = prev[empId] || {};
      return {
        ...prev,
        [empId]: {
          ...existing,
          employeeId: empId,
          role: currentItem.role || (currentItem.category === 'Driver' ? 'Driver' : 'Staff'),
          category: currentItem.category,
          driverId: currentItem.employeeId?.referenceId || currentItem.employeeId?.driverId,
          name: currentItem.employeeId?.name,
          status,
          remarks: existing.remarks !== undefined ? existing.remarks : (currentItem.remarks || '')
        }
      };
    });

    // Immediately update monthly attendance register
    const lookupKeys = getEmployeeLookupKeys(currentItem);
    setMonthlyRegister(prev => {
      const nextReg = { ...prev };
      lookupKeys.forEach(k => {
        if (!nextReg[k]) nextReg[k] = { dates: {} };
        nextReg[k] = {
          ...nextReg[k],
          dates: { ...(nextReg[k].dates || {}), [selectedDate]: status }
        };
      });
      saveMonthlyRegisterToStorage(selectedDate, nextReg);
      return nextReg;
    });
  };

  // Edit remarks
  const handleRemarksChange = (empId, remarks, currentItem) => {
    setModifiedRecords(prev => {
      const existing = prev[empId] || {};
      return {
        ...prev,
        [empId]: {
          ...existing,
          employeeId: empId,
          role: currentItem.role || (currentItem.category === 'Driver' ? 'Driver' : 'Staff'),
          category: currentItem.category,
          driverId: currentItem.employeeId?.referenceId || currentItem.employeeId?.driverId,
          name: currentItem.employeeId?.name,
          status: existing.status || currentItem.status || 'Present',
          remarks
        }
      };
    });
  };

  // Bulk marking
  const handleBulkMark = (targetStatus) => {
    const updated = { ...modifiedRecords };
    filteredList.forEach(item => {
      const empId = item.employeeId?._id || item.employeeId;
      if (!empId) return;
      updated[empId] = {
        ...(updated[empId] || {}),
        employeeId: empId,
        role: item.role || (item.category === 'Driver' ? 'Driver' : 'Staff'),
        category: item.category,
        driverId: item.employeeId?.referenceId || item.employeeId?.driverId,
        name: item.employeeId?.name,
        status: targetStatus,
        remarks: updated[empId]?.remarks !== undefined ? updated[empId].remarks : (item.remarks || '')
      };
    });
    setModifiedRecords(updated);

    // Update monthly register for all filtered items
    setMonthlyRegister(prev => {
      const nextReg = { ...prev };
      filteredList.forEach(item => {
        const lookupKeys = getEmployeeLookupKeys(item);
        lookupKeys.forEach(k => {
          if (!nextReg[k]) nextReg[k] = { dates: {} };
          nextReg[k] = {
            ...nextReg[k],
            dates: { ...(nextReg[k].dates || {}), [selectedDate]: targetStatus }
          };
        });
      });
      saveMonthlyRegisterToStorage(selectedDate, nextReg);
      return nextReg;
    });
  };

  const handleMarkUnmarkedPresent = () => {
    const updated = { ...modifiedRecords };
    const affected = [];
    filteredList.forEach(item => {
      const effective = getEffectiveRecord(item);
      if (effective.status === 'Not Marked' || effective.status === 'LOP' || !effective.status) {
        const empId = item.employeeId?._id || item.employeeId;
        if (!empId) return;
        affected.push(item);
        updated[empId] = {
          ...(updated[empId] || {}),
          employeeId: empId,
          role: item.role || (item.category === 'Driver' ? 'Driver' : 'Staff'),
          category: item.category,
          driverId: item.employeeId?.referenceId || item.employeeId?.driverId,
          name: item.employeeId?.name,
          status: 'Present',
          remarks: updated[empId]?.remarks !== undefined ? updated[empId].remarks : (item.remarks || '')
        };
      }
    });
    setModifiedRecords(updated);

    if (affected.length > 0) {
      setMonthlyRegister(prev => {
        const nextReg = { ...prev };
        affected.forEach(item => {
          const lookupKeys = getEmployeeLookupKeys(item);
          lookupKeys.forEach(k => {
            if (!nextReg[k]) nextReg[k] = { dates: {} };
            nextReg[k] = {
              ...nextReg[k],
              dates: { ...(nextReg[k].dates || {}), [selectedDate]: 'Present' }
            };
          });
        });
        saveMonthlyRegisterToStorage(selectedDate, nextReg);
        return nextReg;
      });
    }
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    const pendingList = Object.values(modifiedRecords);
    if (pendingList.length === 0) {
      showToast('ℹ No unsaved attendance changes to record.');
      return;
    }

    setSaving(true);
    try {
      await markStaffAttendance({
        date: selectedDate,
        records: pendingList
      });

      // Synchronize to monthly register and save to storage
      setMonthlyRegister(prev => {
        const nextReg = { ...prev };
        pendingList.forEach(rec => {
          const lookupKeys = getEmployeeLookupKeys(rec);
          lookupKeys.forEach(k => {
            if (!nextReg[k]) nextReg[k] = { dates: {} };
            nextReg[k] = {
              ...nextReg[k],
              dates: { ...(nextReg[k].dates || {}), [selectedDate]: rec.status }
            };
          });
        });
        saveMonthlyRegisterToStorage(selectedDate, nextReg);
        return nextReg;
      });

      showToast(`✓ Successfully synchronized attendance for ${pendingList.length} employee(s)!`);
      await loadData();
    } catch (err) {
      console.error('Error saving attendance:', err);
      showToast('❌ Failed to save attendance: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Filter and Category segmentation
  const segmentedList = useMemo(() => {
    return reports.map(getEffectiveRecord);
  }, [reports, modifiedRecords]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: 0, Teaching: 0, 'Non-Teaching': 0, Driver: 0 };
    segmentedList.forEach(item => {
      counts.ALL++;
      const cat = item.category || 'Teaching';
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts['Non-Teaching']++;
      }
    });
    return counts;
  }, [segmentedList]);

  const filteredList = useMemo(() => {
    return segmentedList.filter(item => {
      // 1. Category Filter
      if (activeCategory !== 'ALL') {
        const itemCat = item.category || 'Teaching';
        if (itemCat !== activeCategory) return false;
      }

      // 2. Department Filter
      if (deptFilter !== 'ALL') {
        const itemDept = item.employeeId?.department || '';
        if (itemDept.toLowerCase() !== deptFilter.toLowerCase()) return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Unmarked') {
          if (item.status && item.status !== 'Not Marked' && item.status !== 'LOP') return false;
        } else if (statusFilter === 'Leave') {
          if (item.status !== 'Leave' && item.status !== 'On Leave') return false;
        } else {
          if (item.status !== statusFilter) return false;
        }
      }

      // 4. Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const name = String(item.employeeId?.name || '').toLowerCase();
        const refId = String(item.employeeId?.referenceId || item.employeeId?._id || '').toLowerCase();
        const dept = String(item.employeeId?.department || '').toLowerCase();
        const desig = String(item.employeeId?.designation || '').toLowerCase();
        if (!name.includes(q) && !refId.includes(q) && !dept.includes(q) && !desig.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [segmentedList, activeCategory, deptFilter, statusFilter, search]);

  // Metric Computations on Segmented (Active Category) List
  const categoryActiveList = useMemo(() => {
    if (activeCategory === 'ALL') return segmentedList;
    return segmentedList.filter(item => (item.category || 'Teaching') === activeCategory);
  }, [segmentedList, activeCategory]);

  const metrics = useMemo(() => {
    const total = categoryActiveList.length;
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;
    let halfDay = 0;
    let unmarked = 0;

    let totalMonPercentSum = 0;
    let monCount = 0;
    let totalMonDays = 30;

    categoryActiveList.forEach(item => {
      const st = item.status;
      if (st === 'Present') present++;
      else if (st === 'Absent' || st === 'LOP') absent++;
      else if (st === 'Leave' || st === 'On Leave') leave++;
      else if (st === 'Late') late++;
      else if (st === 'Half Day') halfDay++;
      else unmarked++;

      const mon = computeMonthlyRecord(item);
      if (mon) {
        totalMonDays = mon.totalDaysInMonth || 30;
        totalMonPercentSum += Number(mon.percentage || 0);
        monCount++;
      }
    });

    const presentRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
    const monthlyAvgPct = monCount > 0 ? (totalMonPercentSum / monCount).toFixed(1) : '0.0';
    const monthName = categoryActiveList[0] ? (computeMonthlyRecord(categoryActiveList[0])?.monthName || 'Current Month') : 'Current Month';

    return { total, present, absent, leave, late, halfDay, unmarked, presentRate, totalMonDays, monthlyAvgPct, monthName };
  }, [categoryActiveList]);

  // Unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    reports.forEach(r => {
      if (r.employeeId?.department) set.add(r.employeeId.department);
    });
    return Array.from(set);
  }, [reports]);

  const escapeXml = (str) => {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const formatDateDisplay = (dStr) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) {
      return dStr;
    }
  };

  const formatTimeDisplay = (tStr) => {
    if (!tStr) return '-';
    try {
      const d = new Date(tStr);
      return isNaN(d.getTime()) ? tStr : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
      return tStr;
    }
  };

  // Export Formatted Excel Spreadsheet (.xls)
  const handleExportExcel = () => {
    const formattedDate = formatDateDisplay(selectedDate);
    const categoryTitle = activeCategory === 'ALL' ? 'All Personnel' : `${activeCategory} Staff`;

    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Campus ERP Accounts Department</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="MetaStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1D4ED8"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1D4ED8"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1D4ED8"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1D4ED8"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusPresent">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#15803D"/>
   <Interior ss:Color="#DCFCE7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#86EFAC"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusAbsent">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
   </Borders>
  </Style>
  <Style ss:ID="StatusLeave">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FDE68A"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Daily Attendance">
  <Table>
   <Column ss:Width="40"/>
   <Column ss:Width="160"/>
   <Column ss:Width="100"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="105"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="200"/>

   <!-- Title Rows -->
   <Row ss:Height="24">
    <Cell ss:MergeAcross="10" ss:StyleID="TitleStyle">
     <Data ss:Type="String">Centralized Daily Attendance Report – ${escapeXml(categoryTitle)}</Data>
    </Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:MergeAcross="10" ss:StyleID="MetaStyle">
     <Data ss:Type="String">Date: ${escapeXml(formattedDate)} | Total Roster: ${filteredList.length} | Exported: ${new Date().toLocaleString()}</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"></Row>

   <!-- Header Row -->
   <Row ss:Height="26">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Employee Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Department / Unit</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Designation / Role</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Duty Status</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Check-In</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Check-Out</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Monthly Attendance</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Duty Notes / Remarks</Data></Cell>
   </Row>`;

    filteredList.forEach((item, index) => {
      const emp = item.employeeId || {};
      const status = item.status || 'Not Marked';
      const checkInFormatted = formatTimeDisplay(item.checkIn);
      const checkOutFormatted = formatTimeDisplay(item.checkOut);
      const mon = computeMonthlyRecord(item);
      const statusStyle = 
        status === 'Present' ? 'StatusPresent' : 
        (status === 'Absent' || status === 'LOP') ? 'StatusAbsent' : 
        (status === 'Leave' || status === 'On Leave' || status === 'Late' || status === 'Half Day') ? 'StatusLeave' : 'DataCellCenter';

      xml += `
   <Row ss:Height="22">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(emp.name || 'Employee')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(emp.referenceId || emp._id || 'N/A')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(item.category || 'Staff')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(emp.department || 'General')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(emp.designation || item.role || 'Staff')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escapeXml(status)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(checkInFormatted)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(checkOutFormatted)}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(mon.presentDays)} / ${escapeXml(mon.totalDaysInMonth)} Days (${escapeXml(mon.percentage)}%)</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(item.remarks || '')}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_Attendance_${activeCategory}_${selectedDate}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('✓ Professional Excel attendance report exported successfully!');
  };

  const handleExportMonthlyExcel = () => {
    const monthKey = selectedDate.slice(0, 7);
    const [yr, mo] = monthKey.split('-').map(Number);
    const monthName = new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const categoryTitle = activeCategory === 'ALL' ? 'All Personnel' : `${activeCategory} Staff`;

    let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Campus ERP Accounts Department</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#1E3A8A"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DataCellCenter">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
  <Style ss:ID="DataCell">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Monthly Register">
  <Table>
   <Row ss:Height="24">
    <Cell ss:MergeAcross="9" ss:StyleID="TitleStyle">
     <Data ss:Type="String">Monthly Attendance Master Register – ${escapeXml(monthName)} (${escapeXml(categoryTitle)})</Data>
    </Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Employee Name</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Employee ID</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Category</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Department</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Designation</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Total Days</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Present Days</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Absent Days</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Leave Days</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Attendance %</Data></Cell>
   </Row>`;

    filteredList.forEach((item, index) => {
      const emp = item.employeeId || {};
      const mon = computeMonthlyRecord(item);
      xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${index + 1}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(emp.name || 'Employee')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(emp.referenceId || emp._id || 'N/A')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${escapeXml(item.category || 'Staff')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(emp.department || 'General')}</Data></Cell>
    <Cell ss:StyleID="DataCell"><Data ss:Type="String">${escapeXml(emp.designation || item.role || 'Staff')}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${mon.totalDaysInMonth}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${mon.presentDays}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${mon.absentDays}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="Number">${mon.leaveDays}</Data></Cell>
    <Cell ss:StyleID="DataCellCenter"><Data ss:Type="String">${mon.percentage}%</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Monthly_Attendance_Register_${activeCategory}_${monthKey}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Monthly Attendance Master Register exported to Excel successfully!');
  };

  const modifiedCount = Object.keys(modifiedRecords).length;

  return (
    <div className="daily-att-container">
      {/* Toast Alert */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toastMsg.startsWith('✓') ? '#15803d' : toastMsg.startsWith('❌') ? '#b91c1c' : '#1e293b',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.88rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {toastMsg}
        </div>
      )}

      {/* ── 0. TOP SUB-TAB MODE SWITCHER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '0.65rem 0.85rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveMainTab('daily')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeMainTab === 'daily' ? '#2563eb' : '#f1f5f9',
              color: activeMainTab === 'daily' ? '#ffffff' : '#475569',
              boxShadow: activeMainTab === 'daily' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <CalendarDays size={16} /> Daily Attendance Marking
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('monthly')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.5rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 800,
              cursor: 'pointer',
              background: activeMainTab === 'monthly' ? '#2563eb' : '#f1f5f9',
              color: activeMainTab === 'monthly' ? '#ffffff' : '#475569',
              boxShadow: activeMainTab === 'monthly' ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <FileBarChart size={16} /> Monthly Attendance Record
          </button>
        </div>

        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={14} color="#2563eb" />
          <span>Accounts Financial Operations & Roster Audit</span>
        </div>
      </div>

      {/* ── 1. DAILY ATTENDANCE MARKING CONSOLE TAB ── */}
      {activeMainTab === 'daily' && (
        <>
          {/* Header Card */}
          <div className="daily-att-header">
            <div className="daily-att-title-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}>
                    <CalendarDays size={22} />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                      Centralized Daily Attendance Console
                    </h1>
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Live daily attendance marking roster for Teaching Staff, Non-Teaching Staff, and Transport Drivers.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Date Navigation Widget */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '3px' }}>
                  <button
                    type="button"
                    onClick={() => shiftDate(-1)}
                    style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                    title="Previous Day"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => handleDateChange(e.target.value)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => shiftDate(1)}
                    style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                    title="Next Day"
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={setDateToToday}
                    style={{
                      padding: '4px 10px',
                      marginLeft: '4px',
                      background: selectedDate === new Date().toISOString().split('T')[0] ? '#2563eb' : '#ffffff',
                      color: selectedDate === new Date().toISOString().split('T')[0] ? '#ffffff' : '#2563eb',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                      cursor: 'pointer'
                    }}
                  >
                    Today
                  </button>
                </div>

                {/* Action Buttons */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <FileSpreadsheet size={16} color="#16a34a" /> Export Daily (.xls)
                </button>

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={modifiedCount === 0 || saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    background: modifiedCount > 0 ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: modifiedCount > 0 && !saving ? 'pointer' : 'not-allowed',
                    boxShadow: modifiedCount > 0 ? '0 4px 12px rgba(22, 163, 74, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Save size={15} /> {saving ? 'Saving...' : `Save Changes (${modifiedCount})`}
                </button>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="daily-att-kpi-grid">
              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <span className="daily-att-kpi-label">Total Personnel</span>
                <div className="daily-att-kpi-val">{metrics.total}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{activeCategory === 'ALL' ? 'College-wide Roster' : `${activeCategory} Roster`}</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
                <span className="daily-att-kpi-label" style={{ color: '#15803d' }}>Present ({metrics.presentRate}%)</span>
                <div className="daily-att-kpi-val" style={{ color: '#16a34a' }}>{metrics.present}</div>
                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Active On-Duty</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
                <span className="daily-att-kpi-label" style={{ color: '#b91c1c' }}>Absent / LOP</span>
                <div className="daily-att-kpi-val" style={{ color: '#dc2626' }}>{metrics.absent}</div>
                <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>Not Reported</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #d97706' }}>
                <span className="daily-att-kpi-label" style={{ color: '#b45309' }}>On Leave</span>
                <div className="daily-att-kpi-val" style={{ color: '#d97706' }}>{metrics.leave}</div>
                <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 600 }}>Approved Absences</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
                <span className="daily-att-kpi-label" style={{ color: '#c2410c' }}>Late / Half Day</span>
                <div className="daily-att-kpi-val" style={{ color: '#ea580c' }}>{metrics.late + metrics.halfDay}</div>
                <span style={{ fontSize: '0.72rem', color: '#c2410c', fontWeight: 600 }}>{metrics.late} Late • {metrics.halfDay} Half Day</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #64748b' }}>
                <span className="daily-att-kpi-label">Unmarked</span>
                <div className="daily-att-kpi-val" style={{ color: '#64748b' }}>{metrics.unmarked}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Pending Evaluation</span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="daily-att-tabs-bar">
              {[
                { id: 'ALL', label: 'All Personnel', icon: <Users size={16} />, count: categoryCounts.ALL },
                { id: 'Teaching', label: 'Teaching Staff', icon: <GraduationCap size={16} />, count: categoryCounts.Teaching },
                { id: 'Non-Teaching', label: 'Non-Teaching Staff', icon: <Briefcase size={16} />, count: categoryCounts['Non-Teaching'] },
                { id: 'Driver', label: 'Transport Drivers', icon: <Truck size={16} />, count: categoryCounts.Driver }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`daily-att-tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: activeCategory === tab.id ? '#2563eb' : '#e2e8f0',
                    color: activeCategory === tab.id ? '#ffffff' : '#475569'
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter & Batch Action Bar */}
          <div className="daily-att-filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              <div className="daily-att-search-box">
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by employee name, ID, role..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b' }}>Dept:</span>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b' }}>Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Present">Present (P)</option>
                  <option value="Absent">Absent (A)</option>
                  <option value="Leave">On Leave (L)</option>
                  <option value="Late">Late (LT)</option>
                  <option value="Half Day">Half Day (HD)</option>
                  <option value="Unmarked">Unmarked / Pending</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>Batch:</span>
              <button
                type="button"
                onClick={() => handleBulkMark('Present')}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleBulkMark('Absent')}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Mark All Absent
              </button>
              <button
                type="button"
                onClick={handleMarkUnmarkedPresent}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Mark Unmarked as Present
              </button>
            </div>
          </div>

          {/* Daily Table (Cleaned up, no crammed monthly column) */}
          <div className="daily-att-table-wrapper">
            <table className="daily-att-table">
              <thead>
                <tr>
                  <th className="daily-att-sticky-num">#</th>
                  <th className="daily-att-sticky-name">Employee Details</th>
                  <th>Category & Role</th>
                  <th>Department / Unit</th>
                  <th style={{ textAlign: 'center' }}>Duty Timings</th>
                  <th style={{ textAlign: 'center' }}>Mark Attendance</th>
                  <th>Duty Notes / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const emp = item.employeeId || {};
                  const empId = emp._id || item.employeeId;
                  const effectiveStatus = item.status || 'Not Marked';
                  const isModified = Boolean(modifiedRecords[empId]);

                  const categoryBadgeColor = 
                    item.category === 'Teaching' ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' } :
                    item.category === 'Driver' ? { bg: '#fef3c7', text: '#b45309', border: '#fde68a' } :
                    { bg: '#f3e8ff', text: '#6d28d9', border: '#e9d5ff' };

                  return (
                    <tr key={empId || idx} className={isModified ? 'is-modified' : ''} style={{ background: isModified ? '#fffbeb' : 'transparent' }}>
                      <td className="daily-att-sticky-num" style={{ fontWeight: 700, color: '#94a3b8' }}>
                        {idx + 1}
                      </td>

                      <td className="daily-att-sticky-name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}>
                            {(emp.name || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{emp.name || 'Employee'}</span>
                              {isModified && (
                                <span style={{ fontSize: '0.65rem', background: '#d97706', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>
                                  Modified
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                              ID: {emp.referenceId || emp._id || 'N/A'} • {emp.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: categoryBadgeColor.bg,
                            color: categoryBadgeColor.text,
                            border: `1px solid ${categoryBadgeColor.border}`
                          }}>
                            {item.category || 'Staff'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                            {emp.designation || item.role || 'Staff Member'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                          {emp.department || 'General'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                          In: {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Out: {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div className="daily-att-btn-group">
                          <button
                            type="button"
                            className={`daily-att-status-btn present ${effectiveStatus === 'Present' ? 'active' : ''}`}
                            onClick={() => handleMarkStatus(empId, 'Present', item)}
                            title="Present"
                          >
                            P
                          </button>
                          <button
                            type="button"
                            className={`daily-att-status-btn absent ${(effectiveStatus === 'Absent' || effectiveStatus === 'LOP') ? 'active' : ''}`}
                            onClick={() => handleMarkStatus(empId, 'Absent', item)}
                            title="Absent / LOP"
                          >
                            A
                          </button>
                          <button
                            type="button"
                            className={`daily-att-status-btn leave ${(effectiveStatus === 'Leave' || effectiveStatus === 'On Leave') ? 'active' : ''}`}
                            onClick={() => handleMarkStatus(empId, 'Leave', item)}
                            title="On Leave"
                          >
                            L
                          </button>
                          <button
                            type="button"
                            className={`daily-att-status-btn late ${effectiveStatus === 'Late' ? 'active' : ''}`}
                            onClick={() => handleMarkStatus(empId, 'Late', item)}
                            title="Late Arrival"
                          >
                            LT
                          </button>
                          <button
                            type="button"
                            className={`daily-att-status-btn halfday ${effectiveStatus === 'Half Day' ? 'active' : ''}`}
                            onClick={() => handleMarkStatus(empId, 'Half Day', item)}
                            title="Half Day"
                          >
                            HD
                          </button>
                        </div>
                      </td>

                      <td>
                        <input
                          type="text"
                          placeholder="Add note / on duty / approval..."
                          value={item.remarks || ''}
                          onChange={e => handleRemarksChange(empId, e.target.value, item)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            background: isModified ? '#ffffff' : '#f8fafc',
                            color: '#0f172a',
                            outline: 'none'
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                      {loading ? 'Loading centralized daily attendance records...' : 'No employee attendance records found matching your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── 2. SEPARATE DEDICATED MONTHLY ATTENDANCE RECORD TAB ── */}
      {activeMainTab === 'monthly' && (
        <>
          {/* Header Card */}
          <div className="daily-att-header">
            <div className="daily-att-title-row">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)' }}>
                    <FileBarChart size={22} />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                      Monthly Attendance Register & Master Summary
                    </h1>
                    <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Dedicated monthly attendance record, total present days, leave history, percentage audit, and manual overrides.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Month Picker / Navigator */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '3px' }}>
                  <button
                    type="button"
                    onClick={() => shiftDate(-30)}
                    style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <input
                    type="month"
                    value={selectedDate.slice(0, 7)}
                    onChange={e => handleDateChange(`${e.target.value}-01`)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 8px',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: '#0f172a',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => shiftDate(30)}
                    style={{ padding: '6px 10px', background: 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#475569' }}
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportMonthlyExcel}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <FileSpreadsheet size={16} /> Export Monthly Register (.xls)
                </button>
              </div>
            </div>

            {/* Monthly KPI Strip */}
            <div className="daily-att-kpi-grid">
              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <span className="daily-att-kpi-label">Active Roster</span>
                <div className="daily-att-kpi-val">{metrics.total}</div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Personnel in Register</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <span className="daily-att-kpi-label" style={{ color: '#7c3aed' }}>Average Attendance %</span>
                <div className="daily-att-kpi-val" style={{ color: '#7c3aed' }}>{metrics.monthlyAvgPct}%</div>
                <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>{metrics.monthName}</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
                <span className="daily-att-kpi-label" style={{ color: '#15803d' }}>Full Attendance (&ge;75%)</span>
                <div className="daily-att-kpi-val" style={{ color: '#16a34a' }}>
                  {filteredList.filter(item => Number(computeMonthlyRecord(item).percentage) >= 75).length}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Payroll Compliant</span>
              </div>

              <div className="daily-att-kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
                <span className="daily-att-kpi-label" style={{ color: '#b91c1c' }}>Low Attendance (&lt;75%)</span>
                <div className="daily-att-kpi-val" style={{ color: '#dc2626' }}>
                  {filteredList.filter(item => Number(computeMonthlyRecord(item).percentage) < 75).length}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>Requires Audit Review</span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="daily-att-tabs-bar">
              {[
                { id: 'ALL', label: 'All Personnel', icon: <Users size={16} />, count: categoryCounts.ALL },
                { id: 'Teaching', label: 'Teaching Staff', icon: <GraduationCap size={16} />, count: categoryCounts.Teaching },
                { id: 'Non-Teaching', label: 'Non-Teaching Staff', icon: <Briefcase size={16} />, count: categoryCounts['Non-Teaching'] },
                { id: 'Driver', label: 'Transport Drivers', icon: <Truck size={16} />, count: categoryCounts.Driver }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`daily-att-tab-btn ${activeCategory === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveCategory(tab.id)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: activeCategory === tab.id ? '#2563eb' : '#e2e8f0',
                    color: activeCategory === tab.id ? '#ffffff' : '#475569'
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="daily-att-filter-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
              <div className="daily-att-search-box">
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search monthly record by employee name, ID, role..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#64748b' }}>Dept:</span>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Departments</option>
                  {uniqueDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              Showing <strong style={{ color: '#0f172a' }}>{filteredList.length}</strong> employee monthly registers for {metrics.monthName}
            </div>
          </div>

          {/* Dedicated Monthly Attendance Register Table */}
          <div className="daily-att-table-wrapper">
            <table className="daily-att-table">
              <thead>
                <tr>
                  <th className="daily-att-sticky-num">#</th>
                  <th className="daily-att-sticky-name">Employee Details</th>
                  <th>Category & Role</th>
                  <th>Department / Unit</th>
                  <th style={{ textAlign: 'center' }}>Total Month Days</th>
                  <th style={{ textAlign: 'center' }}>Present Days</th>
                  <th style={{ textAlign: 'center' }}>Absent Days</th>
                  <th style={{ textAlign: 'center' }}>Leave Days</th>
                  <th style={{ textAlign: 'center' }}>Attendance %</th>
                  <th style={{ textAlign: 'center' }}>Action & Override</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const emp = item.employeeId || {};
                  const empId = emp._id || item.employeeId;
                  const mon = computeMonthlyRecord(item);
                  const pct = Number(mon.percentage || 0);
                  const isHigh = pct >= 75;
                  const isMid = pct >= 50 && pct < 75;

                  const categoryBadgeColor = 
                    item.category === 'Teaching' ? { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' } :
                    item.category === 'Driver' ? { bg: '#fef3c7', text: '#b45309', border: '#fde68a' } :
                    { bg: '#f3e8ff', text: '#6d28d9', border: '#e9d5ff' };

                  return (
                    <tr key={empId || idx}>
                      <td className="daily-att-sticky-num" style={{ fontWeight: 700, color: '#94a3b8' }}>
                        {idx + 1}
                      </td>

                      <td className="daily-att-sticky-name">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.85rem'
                          }}>
                            {(emp.name || 'E').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                              {emp.name || 'Employee'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                              ID: {emp.referenceId || emp._id || 'N/A'} • {emp.email || 'No email'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: categoryBadgeColor.bg,
                            color: categoryBadgeColor.text,
                            border: `1px solid ${categoryBadgeColor.border}`
                          }}>
                            {item.category || 'Staff'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>
                            {emp.designation || item.role || 'Staff Member'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                          {emp.department || 'General'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#475569' }}>
                        {mon.totalDaysInMonth} Days
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac'
                        }}>
                          {mon.presentDays} Days
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: '1px solid #fca5a5'
                        }}>
                          {mon.absentDays} Days
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          background: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a'
                        }}>
                          {mon.leaveDays} Days
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 900,
                          background: isHigh ? '#16a34a' : (isMid ? '#2563eb' : '#dc2626'),
                          color: '#ffffff'
                        }}>
                          {pct}%
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setAdjustingModal({ item })}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#1d4ed8',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit3 size={12} /> Adjust / Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#64748b' }}>
                      No monthly attendance records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── STICKY FLOATING SAVE BAR FOR DAILY MARKING ── */}
      {activeMainTab === 'daily' && modifiedCount > 0 && (
        <div className="daily-att-floating-save">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#38bdf8' }} />
            <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>
              {modifiedCount} unsaved attendance updates for {new Date(selectedDate).toLocaleDateString()}
            </span>
          </div>
          
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              background: '#22c55e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
            }}
          >
            <Check size={16} /> {saving ? 'Syncing...' : 'Save & Sync Now'}
          </button>
        </div>
      )}
      {/* ── MODAL: MONTHLY ATTENDANCE ADJUSTMENT & DATES BREAKDOWN ── */}
      {adjustingModal && (() => {
        const { item } = adjustingModal;
        const emp = item.employeeId || {};
        const mon = computeMonthlyRecord(item);
        const markedList = Object.entries(mon.markedDates || {})
          .filter(([d]) => d.startsWith(selectedDate.slice(0, 7)))
          .sort(([a], [b]) => b.localeCompare(a));

        const handleSaveCustomDays = (customDays) => {
          const val = Math.max(0, Math.min(mon.totalDaysInMonth, Number(customDays)));
          const lookupKeys = getEmployeeLookupKeys(item);
          setMonthlyRegister(prev => {
            const nextReg = { ...prev };
            lookupKeys.forEach(k => {
              if (!nextReg[k]) nextReg[k] = { dates: {} };
              nextReg[k] = {
                ...nextReg[k],
                manualPresent: val
              };
            });
            saveMonthlyRegisterToStorage(selectedDate, nextReg);
            return nextReg;
          });
          showToast(`✓ Updated monthly record for ${emp.name || 'employee'} to ${val} / ${mon.totalDaysInMonth} Days`);
          setAdjustingModal(null);
        };

        const handleResetToAuto = () => {
          const lookupKeys = getEmployeeLookupKeys(item);
          setMonthlyRegister(prev => {
            const nextReg = { ...prev };
            lookupKeys.forEach(k => {
              if (nextReg[k]) {
                delete nextReg[k].manualPresent;
              }
            });
            saveMonthlyRegisterToStorage(selectedDate, nextReg);
            return nextReg;
          });
          showToast(`✓ Reset ${emp.name || 'employee'} to automatic accumulated count`);
          setAdjustingModal(null);
        };

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}>
              {/* Modal Header */}
              <div style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#ffffff',
                padding: '18px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                    Monthly Attendance Detail
                  </h3>
                  <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '2px' }}>
                    {emp.name || 'Employee'} • ID: {emp.referenceId || emp._id || 'N/A'} • {item.category || 'Staff'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAdjustingModal(null)}
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '24px', overflowY: 'auto' }}>
                {/* Current Stats Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        {mon.monthName} Monthly Total
                      </div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                        {mon.presentDays} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/ {mon.totalDaysInMonth} Days</span>
                      </div>
                    </div>
                    <div style={{
                      background: mon.percentage >= 75 ? '#dcfce7' : (mon.percentage >= 50 ? '#eff6ff' : '#fee2e2'),
                      color: mon.percentage >= 75 ? '#15803d' : (mon.percentage >= 50 ? '#1d4ed8' : '#b91c1c'),
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '1.2rem'
                    }}>
                      {mon.percentage}%
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '0.82rem', fontWeight: 700 }}>
                    <span style={{ color: '#16a34a' }}>Present: {mon.presentDays} Days</span>
                    <span style={{ color: '#dc2626' }}>Absent: {mon.absentDays} Days</span>
                    <span style={{ color: '#d97706' }}>Leave: {mon.leaveDays} Days</span>
                  </div>
                </div>

                {/* Adjust Days Counter */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                    Set Custom Total Days Present (e.g. 20 Days):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = mon.presentDays;
                        if (cur > 0) handleSaveCustomDays(cur - 1);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f1f5f9',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        cursor: 'pointer'
                      }}
                    >
                      -1
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={mon.totalDaysInMonth}
                      defaultValue={mon.presentDays}
                      id="customDaysInput"
                      style={{
                        width: '80px',
                        textAlign: 'center',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '2px solid #2563eb',
                        fontSize: '1.1rem',
                        fontWeight: 800
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cur = mon.presentDays;
                        if (cur < mon.totalDaysInMonth) handleSaveCustomDays(cur + 1);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#f1f5f9',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        cursor: 'pointer'
                      }}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('customDaysInput');
                        if (input) handleSaveCustomDays(Number(input.value));
                      }}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.86rem',
                        cursor: 'pointer'
                      }}
                    >
                      Set Days
                    </button>
                  </div>
                  {mon.manualPresent != null && (
                    <button
                      type="button"
                      onClick={handleResetToAuto}
                      style={{
                        marginTop: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Reset to automatic date count
                    </button>
                  )}
                </div>

                {/* Marked Dates History in this month */}
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                    Marked Dates in {mon.monthName} ({markedList.length} recorded):
                  </div>
                  {markedList.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      No marked dates recorded yet for this month.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {markedList.map(([d, st]) => (
                        <div
                          key={d}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            fontSize: '0.78rem'
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#334155' }}>{d}</span>
                          <span style={{
                            fontWeight: 800,
                            padding: '1px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            background: st === 'Present' ? '#dcfce7' : (st === 'Absent' ? '#fee2e2' : '#fef3c7'),
                            color: st === 'Present' ? '#15803d' : (st === 'Absent' ? '#b91c1c' : '#b45309')
                          }}>
                            {st}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setAdjustingModal(null)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default DailyAttendance;
