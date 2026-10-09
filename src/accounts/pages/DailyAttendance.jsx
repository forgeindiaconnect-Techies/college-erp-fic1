import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, CheckCircle2, XCircle, Clock, AlertCircle, Search, 
  Filter, Download, RefreshCw, Save, Check, Users, Briefcase, 
  GraduationCap, Truck, ArrowLeft, ChevronLeft, ChevronRight,
  ShieldCheck, FileSpreadsheet, UserCheck, CalendarDays, Sparkles
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
  const nonTeachingRoles = ['admin', 'accounts', 'accountant', 'librarian', 'hostel', 'warden', 'clerk', 'office staff', 'sub admin', 'subadmin', 'super admin', 'superadmin'];
  const nonTeachingKeywords = [
    'account', 'admin', 'librar', 'hostel', 'warden', 'clerk', 'office',
    'security', 'peon', 'attender', 'technician', 'electrician', 'plumber',
    'mechanic', 'gardener', 'sweeper', 'non-teaching', 'non teaching', 'lab assistant',
    'placement', 'selvi', 'sundar'
  ];

  const isExplicitNonTeaching = explicitCat === 'non-teaching' || explicitCat === 'nonteaching';
  const hasNonTeachingRole = nonTeachingRoles.includes(role);
  const hasNonTeachingWord = nonTeachingKeywords.some(w => des.includes(w) || role.includes(w) || dept.includes(w) || name.includes(w) || email.includes(w));

  if (isExplicitNonTeaching || hasNonTeachingRole || hasNonTeachingWord) {
    let designation = emp.designation || item.designation;
    if (!designation || designation === 'Faculty' || designation === 'Professor' || designation === 'Staff') {
      if (role === 'accounts' || name.includes('account') || email.includes('account') || name.includes('selvi')) designation = 'Accounts Officer';
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

const DailyAttendance = () => {
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

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, deptRes] = await Promise.all([
        getEmployeeAttendanceReports({ date: selectedDate }).catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] }))
      ]);

      const rawReports = Array.isArray(attRes.data) ? attRes.data : [];

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
  };

  const handleMarkUnmarkedPresent = () => {
    const updated = { ...modifiedRecords };
    filteredList.forEach(item => {
      const effective = getEffectiveRecord(item);
      if (effective.status === 'Not Marked' || effective.status === 'LOP' || !effective.status) {
        const empId = item.employeeId?._id || item.employeeId;
        if (!empId) return;
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

    categoryActiveList.forEach(item => {
      const st = item.status;
      if (st === 'Present') present++;
      else if (st === 'Absent' || st === 'LOP') absent++;
      else if (st === 'Leave' || st === 'On Leave') leave++;
      else if (st === 'Late') late++;
      else if (st === 'Half Day') halfDay++;
      else unmarked++;
    });

    const presentRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';

    return { total, present, absent, leave, late, halfDay, unmarked, presentRate };
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
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Duty Notes / Remarks</Data></Cell>
   </Row>`;

    filteredList.forEach((item, index) => {
      const emp = item.employeeId || {};
      const status = item.status || 'Not Marked';
      const checkInFormatted = formatTimeDisplay(item.checkIn);
      const checkOutFormatted = formatTimeDisplay(item.checkOut);
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

      {/* ── HEADER CARD WITH DATE SELECTOR & EXPORT ── */}
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
                  Live consolidated attendance roster for Teaching Staff, Non-Teaching Staff, and Transport Drivers.
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
              <FileSpreadsheet size={16} color="#16a34a" /> Export Excel (.xls)
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

        {/* ── KPI METRICS CARDS ── */}
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

        {/* ── 4 CATEGORY SEGMENTATION TABS ── */}
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

      {/* ── FILTER & BATCH ACTION BAR ── */}
      <div className="daily-att-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div className="daily-att-search-box">
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by employee name, ID, role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Department Filter */}
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

          {/* Status Filter */}
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

        {/* Quick Bulk Marking Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b' }}>Batch:</span>
          
          <button
            type="button"
            onClick={() => handleBulkMark('Present')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              background: '#f0fdf4',
              color: '#15803d',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Mark All Present
          </button>

          <button
            type="button"
            onClick={() => handleBulkMark('Absent')}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Mark All Absent
          </button>

          <button
            type="button"
            onClick={handleMarkUnmarkedPresent}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer'
            }}
          >
            Mark Unmarked as Present
          </button>
        </div>
      </div>

      {/* ── DAILY ATTENDANCE ROSTER TABLE ── */}
      <div className="daily-att-table-wrapper">
        <table className="daily-att-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Employee Details</th>
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
                <tr key={empId || idx} style={{ background: isModified ? '#fffbeb' : 'transparent' }}>
                  {/* Serial */}
                  <td style={{ fontWeight: 700, color: '#94a3b8' }}>
                    {idx + 1}
                  </td>

                  {/* Employee Details */}
                  <td>
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

                  {/* Category & Role */}
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

                  {/* Department */}
                  <td>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                      {emp.department || 'General'}
                    </span>
                  </td>

                  {/* Duty Timings */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      In: {item.checkIn ? new Date(item.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Out: {item.checkOut ? new Date(item.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </td>

                  {/* Interactive Status Marking Buttons */}
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

                  {/* Remarks Input */}
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

      {/* ── STICKY FLOATING SAVE BAR ── */}
      {modifiedCount > 0 && (
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
    </div>
  );
};

export default DailyAttendance;
