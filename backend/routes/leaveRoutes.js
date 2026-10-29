import express from 'express';
import StaffSupportRecord from '../models/StaffSupportRecord.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import EmployeeAttendance from '../models/EmployeeAttendance.js';
import WatchmanAttendance from '../models/WatchmanAttendance.js';
import TransportDriverAttendance from '../models/TransportDriverAttendance.js';
import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(collegeScope);

const normalizeRole = (r) => (r || '').toLowerCase().trim();

const isDeptMatch = (leaveDept, userDept) => {
  if (!leaveDept || !userDept) return true;
  const l = leaveDept.toLowerCase().trim();
  const u = userDept.toLowerCase().trim();
  if (l === u) return true;
  if (l.includes(u) || u.includes(l)) return true;
  const norm = s => s.replace(/engineering|engg|\.|\s+/g, '');
  return norm(l).includes(norm(u)) || norm(u).includes(norm(l));
};

const formatLeave = (doc) => {
  const d = doc.toObject ? doc.toObject() : doc;
  let daysDiff = d.daysCount || 1;
  if (!d.daysCount && d.startDate && d.endDate) {
    try {
      const d1 = new Date(d.startDate);
      const d2 = new Date(d.endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {}
  }

  // Detect student name from studentName or if role is Parent/Student
  let sName = d.studentName || '';
  if (!sName && d.role === 'Student') sName = d.staffName;
  if (!sName && d.description) {
    const match = d.description.match(/Ward:\s*([^|(]+)/i);
    if (match && match[1]) sName = match[1].trim();
  }

  let pName = d.parentName || '';
  if (!pName && d.role === 'Parent') pName = d.staffName;

  return {
    id: d._id.toString(),
    _id: d._id,
    staffId: d.staffId || d.studentId || '',
    studentId: d.studentId || d.staffId || '',
    studentName: sName,
    parentName: pName,
    staffName: d.staffName,
    name: d.staffName,
    role: d.role || 'Staff',
    email: d.email || '',
    dept: d.department,
    department: d.department,
    type: d.subType || d.type || 'Casual Leave',
    leaveType: d.subType || d.type || 'Casual Leave',
    startDate: d.startDate || '',
    endDate: d.endDate || d.startDate || '',
    daysCount: daysDiff,
    days: daysDiff,
    reason: d.description || d.reason || '',
    description: d.description || d.reason || '',
    priority: d.priority || 'Medium',
    status: d.status || 'Pending',
    approvedBy: d.approvedBy || '',
    approvedAt: d.approvedAt || null,
    hodApprovedBy: d.hodApprovedBy || '',
    hodApprovedAt: d.hodApprovedAt || null,
    rejectedBy: d.rejectedBy || '',
    rejectionReason: d.rejectionReason || '',
    collegeId: d.collegeId,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : (d.startDate || new Date().toISOString().split('T')[0]),
    timeline: d.timeline || []
  };
};

const broadcastUpdate = (req, formattedData, action = 'updated') => {
  const io = req.app.get('io');
  if (io) {
    io.emit('dataUpdated', { module: 'leaves', action, data: formattedData });
    io.emit('dataUpdated', { module: 'staffSupportUpdated' });
    io.emit('leaveUpdated', formattedData);
  }
};

// 0. GET REAL-TIME ATTENDANCE AND ABSENCE SUMMARY (Calculated from actual DB records)
router.get('/attendance-summary', async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const roleFilter = (req.query.role || 'All').trim();

    // 1. Determine role filter for Users
    let targetRoles = [];
    if (roleFilter === 'Watchman') {
      targetRoles = ['Watchman'];
    } else if (roleFilter === 'Driver') {
      targetRoles = ['Driver'];
    } else if (roleFilter === 'Staff' || roleFilter === 'Faculty') {
      targetRoles = ['Staff', 'Faculty', 'Teacher'];
    } else if (roleFilter === 'HOD') {
      targetRoles = ['HOD'];
    } else {
      // 'All' or empty: all employees (Watchman, Driver, Staff, Faculty, HOD)
      targetRoles = ['Staff', 'Faculty', 'HOD', 'Watchman', 'Driver'];
    }

    // Tenant query for users
    const userTenantQuery = {
      role: { $in: targetRoles },
      $or: [
        { collegeId: tenantId },
        { collegeId: 'COL001' },
        { tenantId: tenantId },
        { tenantId: 'COL001' },
        { collegeId: 'unassigned_college' },
        { collegeId: { $exists: false } }
      ]
    };

    const employees = await User.find(userTenantQuery).lean();
    const totalEmployees = employees.length;

    // 2. Fetch approved leaves for the selected date
    // An approved leave has startDate <= selectedDate and endDate >= selectedDate, status: 'Approved'
    const leaveQuery = {
      requestType: 'Leave',
      status: 'Approved',
      startDate: { $lte: selectedDate },
      endDate: { $gte: selectedDate },
      role: { $in: targetRoles },
      $or: [
        { collegeId: tenantId },
        { collegeId: 'COL001' },
        { collegeId: 'unassigned_college' },
        { collegeId: { $exists: false } }
      ]
    };

    const approvedLeaves = await StaffSupportRecord.find(leaveQuery).lean();

    // Map approved leave employees
    const onLeaveEmpMap = new Map();
    for (const l of approvedLeaves) {
      if (l.staffId) onLeaveEmpMap.set(String(l.staffId).toLowerCase().trim(), l);
      if (l.staffName) onLeaveEmpMap.set(String(l.staffName).toLowerCase().trim(), l);
      if (l.email) onLeaveEmpMap.set(String(l.email).toLowerCase().trim(), l);
    }

    // 3. Fetch attendance records for selectedDate
    // For Staff / Faculty / HOD -> EmployeeAttendance
    // For Watchman -> WatchmanAttendance
    // For Driver -> TransportDriverAttendance
    const presentEmpMap = new Map();

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // a) EmployeeAttendance
    try {
      const empAtt = await EmployeeAttendance.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['Present', 'Checked In', 'On Duty', 'Half Day'] }
      }).lean();
      for (const a of empAtt) {
        if (a.employeeId) presentEmpMap.set(String(a.employeeId).toLowerCase(), a);
      }
    } catch (e) {
      console.warn('Error reading EmployeeAttendance:', e.message);
    }

    // b) WatchmanAttendance
    try {
      const wAtt = await WatchmanAttendance.find({
        date: selectedDate,
        status: { $in: ['On Duty', 'Completed', 'Present', 'Late', 'Half Day'] }
      }).lean();
      for (const a of wAtt) {
        if (a.watchmanId) presentEmpMap.set(String(a.watchmanId).toLowerCase(), a);
        if (a.employeeId) presentEmpMap.set(String(a.employeeId).toLowerCase(), a);
        if (a.watchmanName) presentEmpMap.set(String(a.watchmanName).toLowerCase(), a);
      }
    } catch (e) {
      console.warn('Error reading WatchmanAttendance:', e.message);
    }

    // c) TransportDriverAttendance
    try {
      const dAtt = await TransportDriverAttendance.find({
        date: selectedDate,
        status: 'Present'
      }).lean();
      for (const a of dAtt) {
        if (a.driverId) presentEmpMap.set(String(a.driverId).toLowerCase(), a);
        if (a.driverName) presentEmpMap.set(String(a.driverName).toLowerCase(), a);
      }
    } catch (e) {
      console.warn('Error reading TransportDriverAttendance:', e.message);
    }

    // 4. Evaluate each employee's status without double counting
    let presentCount = 0;
    let approvedLeaveCount = 0;
    let absentCount = 0;

    const roster = employees.map(emp => {
      const empId = String(emp._id || '').toLowerCase();
      const refId = String(emp.referenceId || '').toLowerCase();
      const empName = String(emp.name || '').toLowerCase();
      const empEmail = String(emp.email || '').toLowerCase();

      // Check if on approved leave
      const isApprovedLeave = onLeaveEmpMap.has(empId) ||
        (refId && onLeaveEmpMap.has(refId)) ||
        (empName && onLeaveEmpMap.has(empName)) ||
        (empEmail && onLeaveEmpMap.has(empEmail));

      // Check if marked present
      const isPresent = !isApprovedLeave && (
        presentEmpMap.has(empId) ||
        (refId && presentEmpMap.has(refId)) ||
        (empName && presentEmpMap.has(empName)) ||
        (empEmail && presentEmpMap.has(empEmail))
      );

      let status = 'Absent';
      if (isApprovedLeave) {
        status = 'On Approved Leave';
        approvedLeaveCount++;
      } else if (isPresent) {
        status = 'Present';
        presentCount++;
      } else {
        status = 'Absent';
        absentCount++;
      }

      return {
        id: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.department || (emp.role === 'Watchman' ? 'Security & Gate' : emp.role === 'Driver' ? 'Transport' : 'General'),
        employeeId: emp.referenceId || emp.userId || String(emp._id).slice(-6),
        status,
        date: selectedDate
      };
    });

    // 5. Query Pending & Rejected counts for Leave Requests
    const leaveStatsQuery = {
      requestType: 'Leave',
      $or: [
        { collegeId: tenantId },
        { collegeId: 'COL001' },
        { collegeId: 'unassigned_college' },
        { collegeId: { $exists: false } }
      ]
    };
    if (roleFilter !== 'All') {
      leaveStatsQuery.role = { $in: targetRoles };
    }

    const allLeaveRecords = await StaffSupportRecord.find(leaveStatsQuery).lean();
    const pendingCount = allLeaveRecords.filter(l => {
      const st = (l.status || '').toLowerCase();
      return st.includes('pending') && !st.includes('approved') && !st.includes('rejected');
    }).length;
    const rejectedCount = allLeaveRecords.filter(l => (l.status || '').toLowerCase() === 'rejected').length;

    res.json({
      success: true,
      selectedDate,
      roleFilter,
      totalEmployees,
      presentCount,
      absentCount,
      approvedLeaveCount,
      pendingCount,
      rejectedCount,
      roster
    });
  } catch (err) {
    console.error('Error calculating attendance summary:', err);
    res.status(500).json({ success: false, message: 'Failed to calculate attendance summary', error: err.message });
  }
});

// 1. GET ALL LEAVES (with role-based filtering)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const role = normalizeRole(req.user?.role);
    const query = {
      requestType: 'Leave',
      $or: [
        { collegeId: tenantId },
        { collegeId: 'COL001' },
        { collegeId: 'unassigned_college' },
        { collegeId: { $exists: false } }
      ]
    };

    // Role-based filtering
    if (role === 'staff' || role === 'faculty' || role === 'teacher') {
      const staffFilter = [];
      if (req.user?.name) staffFilter.push({ staffName: { $regex: new RegExp(`^${req.user.name.trim()}$`, 'i') } });
      if (req.user?.referenceId) staffFilter.push({ staffId: req.user.referenceId });
      if (req.user?._id) staffFilter.push({ staffId: req.user._id.toString() });
      if (req.user?.email) staffFilter.push({ email: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') } });

      query.$and = [{ $or: query.$or }, { $or: staffFilter.length > 0 ? staffFilter : [{ staffName: req.user.name }] }];
      delete query.$or;
    } else if (role === 'watchman' || role === 'driver') {
      const empFilter = [];
      if (req.user?.name) empFilter.push({ staffName: { $regex: new RegExp(`^${req.user.name.trim()}$`, 'i') } });
      if (req.user?.referenceId) empFilter.push({ staffId: req.user.referenceId });
      if (req.user?._id) empFilter.push({ staffId: req.user._id.toString() });
      if (req.user?.email) empFilter.push({ email: { $regex: new RegExp(`^${req.user.email.trim()}$`, 'i') } });

      query.$and = [{ $or: query.$or }, { $or: empFilter.length > 0 ? empFilter : [{ staffName: req.user.name }] }];
      delete query.$or;
    } else if (role === 'student') {
      const studentFilter = [{ staffName: req.user.name }];
      if (req.user.referenceId) studentFilter.push({ studentId: req.user.referenceId }, { staffId: req.user.referenceId });
      if (req.user.email) studentFilter.push({ email: req.user.email });
      query.$and = [{ $or: query.$or }, { $or: studentFilter }];
      delete query.$or;
    } else if (role === 'parent') {
      const childId = req.user.referenceId || req.user.parentOf || req.user.studentId;
      const parentName = req.user.name;
      const parentFilter = [];
      if (childId) {
        parentFilter.push({ studentId: childId }, { staffId: childId });
      }
      if (parentName) {
        parentFilter.push({ staffName: parentName }, { parentName: parentName });
      }
      if (req.user.parentOf) {
        parentFilter.push({ studentName: req.user.parentOf });
      }
      if (parentFilter.length > 0) {
        query.$and = [{ $or: query.$or }, { $or: parentFilter }];
        delete query.$or;
      }
    } else if (role === 'hod' && req.user.department) {
      const deptPattern = new RegExp(req.user.department.trim(), 'i');
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { department: deptPattern },
            { dept: deptPattern },
            { staffName: req.user.name },
            { role: 'HOD' }
          ]
        }
      ];
      delete query.$or;
    }

    const records = await StaffSupportRecord.find(query).sort({ createdAt: -1 });
    res.json(records.map(formatLeave));
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: err.message });
  }
});

// 2. GET STUDENT SPECIFIC LEAVES
router.get('/student/:studentId', async (req, res) => {
  try {
    const targetId = req.params.studentId;
    const query = {
      requestType: 'Leave',
      $or: [
        { studentId: targetId },
        { staffId: targetId },
        { staffName: new RegExp(`^${targetId}$`, 'i') },
        { studentName: new RegExp(`^${targetId}$`, 'i') }
      ]
    };
    const records = await StaffSupportRecord.find(query).sort({ createdAt: -1 });
    res.json(records.map(formatLeave));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST NEW LEAVE APPLICATION (Enforcing initial workflow status per role)
router.post('/', async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const {
      staffName,
      name,
      staffId,
      studentId,
      studentName,
      parentName,
      role,
      email,
      department,
      dept,
      type,
      leaveType,
      subType,
      startDate,
      endDate,
      daysCount,
      reason,
      description,
      priority
    } = req.body;

    const applicantRole = role || req.user?.role || 'Staff';
    const applicantName = staffName || name || req.user?.name || (applicantRole === 'Parent' ? 'Parent' : 'Applicant');
    const applicantDept = department || dept || req.user?.department || 'General';
    const leaveCategory = type || leaveType || subType || 'Casual Leave';
    const desc = reason || description || 'Leave Application';
    const sDate = startDate || new Date().toISOString().split('T')[0];
    const eDate = endDate || sDate;

    let targetStudentId = studentId;
    if (!targetStudentId) {
      if (applicantRole === 'Student') targetStudentId = req.user?.referenceId;
      else if (applicantRole === 'Parent') targetStudentId = staffId || req.user?.referenceId || req.user?.parentOf;
    }

    let targetStudentName = studentName;
    if (!targetStudentName) {
      if (applicantRole === 'Student') targetStudentName = applicantName;
      else if (applicantRole === 'Parent' && desc) {
        const match = desc.match(/Ward:\s*([^|(]+)/i);
        if (match && match[1]) targetStudentName = match[1].trim();
      }
    }

    let calculatedDays = Number(daysCount) || 1;
    if (!daysCount && sDate && eDate) {
      try {
        const d1 = new Date(sDate);
        const d2 = new Date(eDate);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } catch {}
    }

    // Prevent duplicate pending leave requests for the same applicant on overlapping dates
    const duplicateQuery = {
      requestType: 'Leave',
      startDate: sDate,
      endDate: eDate,
      status: { $in: ['Pending', 'Pending HOD Approval', 'Pending Admin Approval', 'HOD Approved – Pending Admin Approval'] },
      $or: [
        { staffName: applicantName },
        ...(req.user?.referenceId ? [{ staffId: req.user.referenceId }] : []),
        ...(req.user?._id ? [{ staffId: req.user._id.toString() }] : [])
      ]
    };
    const duplicate = await StaffSupportRecord.findOne(duplicateQuery);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `A pending leave request already exists for ${applicantName} for the period ${sDate} to ${eDate}.`
      });
    }

    // Role-based Initial Status & Audit Trail
    // Staff & Student -> 'Pending HOD Approval'
    // HOD, Parent, Watchman & Driver -> 'Pending Admin Approval'
    const normRole = normalizeRole(applicantRole);
    let initialStatus = 'Pending HOD Approval';
    let initialNote = `Leave application submitted (${leaveCategory}). Awaiting HOD review.`;

    if (normRole === 'parent' || !!parentName) {
      initialStatus = 'Pending Admin Approval';
      initialNote = `Parent leave application submitted for ward (${targetStudentName || 'Student'}). Awaiting Central Admin approval.`;
    } else if (normRole === 'hod') {
      initialStatus = 'Pending Admin Approval';
      initialNote = `HOD leave application submitted (${leaveCategory}). Forwarded directly to Admin for approval.`;
    } else if (normRole === 'watchman' || normRole === 'driver') {
      initialStatus = 'Pending Admin Approval';
      initialNote = `${applicantRole} leave application submitted (${leaveCategory}). Awaiting Central Admin approval.`;
    } else if (normRole === 'student') {
      initialStatus = 'Pending HOD Approval';
      initialNote = `Student leave application submitted (${leaveCategory}). Awaiting Department HOD review.`;
    } else {
      initialStatus = 'Pending HOD Approval';
      initialNote = `Staff leave application submitted (${leaveCategory}). Awaiting Department HOD review.`;
    }

    const newLeave = new StaffSupportRecord({
      staffName: applicantName,
      staffId: staffId || req.user?.referenceId,
      studentId: targetStudentId,
      studentName: targetStudentName,
      parentName: parentName || (applicantRole === 'Parent' ? applicantName : undefined),
      role: applicantRole,
      email: email || req.user?.email,
      department: applicantDept,
      requestType: 'Leave',
      subType: leaveCategory,
      type: leaveCategory,
      startDate: sDate,
      endDate: eDate,
      daysCount: calculatedDays,
      description: desc,
      reason: desc,
      priority: priority || 'Medium',
      status: initialStatus,
      collegeId: tenantId,
      timeline: [
        { date: new Date().toISOString().split('T')[0], text: initialNote }
      ]
    });

    const saved = await newLeave.save();
    const formatted = formatLeave(saved);

    // Notification routing:
    // If Staff or Student -> Notify HOD
    // If HOD or Parent -> Notify Admin
    try {
      let targetRoles = ['HOD'];
      if (initialStatus === 'Pending Admin Approval') {
        targetRoles = ['Admin', 'Principal', 'Superadmin'];
      }
      await new Notification({
        targetRoles,
        title: initialStatus === 'Pending Admin Approval' ? 'New Leave (Admin Action Required)' : 'New Leave (HOD Action Required)',
        message: `${applicantName} (${applicantDept}) applied for ${leaveCategory} (${sDate} to ${eDate}). Status: ${initialStatus}.`,
        type: 'Info',
        link: initialStatus === 'Pending Admin Approval' ? '/admin/leaves' : '/hod/leaves',
        collegeId: tenantId,
        tenantId: tenantId
      }).save();
    } catch {}

    broadcastUpdate(req, formatted, 'created');
    res.status(201).json(formatted);
  } catch (err) {
    console.error('Error creating leave:', err);
    res.status(400).json({ success: false, message: 'Failed to create leave', error: err.message });
  }
});

// 4. PATCH / PUT UPDATE LEAVE STATUS (Strict Role-Based Approval Workflow)
const handleStatusUpdate = async (req, res) => {
  try {
    const { status, action, remarks, reason } = req.body;
    const leave = await StaffSupportRecord.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const userRole = normalizeRole(req.user?.role);
    const isAdmin = ['admin', 'superadmin', 'super admin', 'sub admin', 'principal'].includes(userRole);
    const isHOD = userRole === 'hod';
    const reviewerName = req.user?.name || req.user?.role || 'Authority';
    const todayStr = new Date().toISOString().split('T')[0];

    const applicantRole = normalizeRole(leave.role);
    const isParentRequest = applicantRole === 'parent' || !!leave.parentName || (leave.description && leave.description.includes('Parent Request'));
    const isHodRequest = applicantRole === 'hod';
    const isStaffOrStudentRequest = !isParentRequest && !isHodRequest;

    // Detect desired decision intent
    let isApproving = false;
    let isRejecting = false;

    if (
      action === 'approve' ||
      status === 'Approved' ||
      status === 'HOD Approved – Pending Admin Approval' ||
      (status && String(status).toLowerCase().includes('approve'))
    ) {
      isApproving = true;
    } else if (
      action === 'reject' ||
      status === 'Rejected' ||
      (status && String(status).toLowerCase().includes('reject'))
    ) {
      isRejecting = true;
    } else if (status === 'Cancelled') {
      leave.status = 'Cancelled';
      leave.timeline = leave.timeline || [];
      leave.timeline.push({ date: todayStr, text: `Leave application cancelled by ${reviewerName}` });
      const updated = await leave.save();
      const formatted = formatLeave(updated);
      broadcastUpdate(req, formatted);
      return res.json(formatted);
    }

    if (!isApproving && !isRejecting) {
      return res.status(400).json({ success: false, message: 'Invalid action or status specified. Must be Approve or Reject.' });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. HOD PERMISSION RULES
    // ─────────────────────────────────────────────────────────────
    if (isHOD) {
      // Rule 4: HOD MUST NOT have approve or reject permissions for Parent-submitted leave requests
      if (isParentRequest) {
        return res.status(403).json({
          success: false,
          message: 'Permission Denied: HODs do not have approval permissions for Parent-submitted requests. Parent leave requests must be approved directly by Admin.'
        });
      }

      // Rule 2: HOD requests must go directly to Admin; HOD cannot approve HOD requests
      if (isHodRequest) {
        return res.status(403).json({
          success: false,
          message: 'Permission Denied: HOD leave requests cannot be approved by an HOD. HOD requests must be approved directly by Admin.'
        });
      }

      // Department Match Check
      if (req.user?.department && leave.department && !isDeptMatch(leave.department, req.user.department)) {
        return res.status(403).json({
          success: false,
          message: `Permission Denied: Leave belongs to ${leave.department} department, but you are assigned to ${req.user.department}.`
        });
      }

      // Rule 1 & 3: Staff & Student Leave Approval Workflow by HOD
      if (isApproving) {
        if (leave.status === 'Approved') {
          return res.status(400).json({ success: false, message: 'Leave request is already fully approved.' });
        }

        // HOD approval moves request to 'HOD Approved – Pending Admin Approval'
        leave.status = 'HOD Approved – Pending Admin Approval';
        leave.hodApprovedBy = reviewerName;
        leave.hodApprovedAt = new Date();
        const note = remarks || `Approved by Department HOD (${reviewerName}). Forwarded to Admin for final confirmation.`;
        leave.timeline = leave.timeline || [];
        leave.timeline.push({ date: todayStr, text: note });

        // Notify Admin for final review
        try {
          await new Notification({
            targetRoles: ['Admin', 'Principal', 'Superadmin'],
            title: 'Leave Pending Admin Confirmation',
            message: `HOD ${reviewerName} (${leave.department}) approved ${leave.staffName}'s leave. Final Admin authorization required.`,
            type: 'Info',
            link: '/admin/leaves',
            collegeId: leave.collegeId,
            tenantId: leave.collegeId
          }).save();
        } catch {}

        // Notify Requester
        try {
          await new Notification({
            targetUsers: [leave.staffId, leave.studentId].filter(Boolean),
            title: 'HOD Approved Leave',
            message: `Your leave request has been approved by your HOD (${reviewerName}) and forwarded to Admin for final review.`,
            type: 'Info',
            link: applicantRole === 'student' ? '/student/leaves' : '/staff/leaves',
            collegeId: leave.collegeId,
            tenantId: leave.collegeId
          }).save();
        } catch {}

      } else if (isRejecting) {
        leave.status = 'Rejected';
        leave.rejectedBy = reviewerName;
        leave.rejectionReason = remarks || reason || 'Declined by HOD';
        const note = remarks || `Rejected by Department HOD (${reviewerName}): ${leave.rejectionReason}`;
        leave.timeline = leave.timeline || [];
        leave.timeline.push({ date: todayStr, text: note });

        // Notify Requester
        try {
          await new Notification({
            targetUsers: [leave.staffId, leave.studentId].filter(Boolean),
            title: 'Leave Request Rejected by HOD',
            message: `Your leave request for ${leave.startDate} was rejected by your HOD (${reviewerName}). Reason: ${leave.rejectionReason}`,
            type: 'Warning',
            link: applicantRole === 'student' ? '/student/leaves' : '/staff/leaves',
            collegeId: leave.collegeId,
            tenantId: leave.collegeId
          }).save();
        } catch {}
      }

    // ─────────────────────────────────────────────────────────────
    // 2. ADMIN / PRINCIPAL PERMISSION RULES (Final Approver)
    // ─────────────────────────────────────────────────────────────
    } else if (isAdmin) {
      if (isApproving) {
        // Staff or Student leave: Only after Admin confirms approval should it receive final Approved status
        leave.status = 'Approved';
        leave.approvedBy = reviewerName || 'Admin Office';
        leave.approvedAt = new Date();
        const note = remarks || `Final approval confirmed by Admin Office (${reviewerName})`;
        leave.timeline = leave.timeline || [];
        leave.timeline.push({ date: todayStr, text: note });

        // Notify Requester & Parent
        try {
          const targetUsers = [leave.staffId, leave.studentId].filter(Boolean);
          await new Notification({
            targetUsers,
            title: 'Leave Application Approved! ✓',
            message: `Leave application for ${leave.staffName} (${leave.startDate} to ${leave.endDate}) has received final approval from Central Admin.`,
            type: 'Success',
            link: applicantRole === 'watchman' ? '/watchman/leaves' : (applicantRole === 'driver' ? '/driver/leaves' : (isParentRequest ? '/parent/leaves' : (applicantRole === 'student' ? '/student/leaves' : '/staff/leaves'))),
            collegeId: leave.collegeId,
            tenantId: leave.collegeId
          }).save();
        } catch {}

        // Notify HOD (informational)
        try {
          if (isStaffOrStudentRequest) {
            await new Notification({
              targetRoles: ['HOD'],
              title: 'Leave Finalized by Admin',
              message: `${leave.staffName}'s leave (${leave.startDate}) has been officially authorized by Central Admin.`,
              type: 'Info',
              link: '/hod/leaves',
              collegeId: leave.collegeId,
              tenantId: leave.collegeId
            }).save();
          }
        } catch {}

      } else if (isRejecting) {
        leave.status = 'Rejected';
        leave.rejectedBy = reviewerName || 'Admin Office';
        leave.rejectionReason = remarks || reason || 'Declined by Admin Office';
        const note = remarks || `Rejected by Admin Office (${reviewerName}): ${leave.rejectionReason}`;
        leave.timeline = leave.timeline || [];
        leave.timeline.push({ date: todayStr, text: note });

        // Notify Requester
        try {
          await new Notification({
            targetUsers: [leave.staffId, leave.studentId].filter(Boolean),
            title: 'Leave Request Rejected by Admin',
            message: `Leave application for ${leave.staffName} (${leave.startDate}) was declined by Central Admin. Reason: ${leave.rejectionReason}`,
            type: 'Warning',
            link: applicantRole === 'watchman' ? '/watchman/leaves' : (applicantRole === 'driver' ? '/driver/leaves' : (isParentRequest ? '/parent/leaves' : (applicantRole === 'student' ? '/student/leaves' : '/staff/leaves'))),
            collegeId: leave.collegeId,
            tenantId: leave.collegeId
          }).save();
        } catch {}
      }

    } else {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: You do not have authorization to approve or reject leave requests.'
      });
    }

    const updated = await leave.save();
    const formatted = formatLeave(updated);
    broadcastUpdate(req, formatted);

    res.json(formatted);
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(400).json({ success: false, message: 'Failed to update leave', error: err.message });
  }
};

router.patch('/:id', handleStatusUpdate);
router.put('/:id', handleStatusUpdate);

// 5. DELETE / CANCEL LEAVE
router.delete('/:id', async (req, res) => {
  try {
    const leave = await StaffSupportRecord.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    await StaffSupportRecord.findByIdAndDelete(req.params.id);

    broadcastUpdate(req, { id: req.params.id, status: 'Cancelled' }, 'deleted');
    res.json({ success: true, message: 'Leave application cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel leave', error: err.message });
  }
});

export default router;
