import express from 'express';
import EmployeeAttendance from '../models/EmployeeAttendance.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import TransportDriver from '../models/TransportDriver.js';
import TransportDriverAttendance from '../models/TransportDriverAttendance.js';
import Watchman from '../models/Watchman.js';
import WatchmanAttendance from '../models/WatchmanAttendance.js';
import { protect, collegeScope, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

const getEmployeeClassification = (item) => {
  if (!item) return { category: 'Teaching', designation: 'Faculty' };

  const role = String(item.role || '').toLowerCase();
  const des = String(item.designation || '').toLowerCase();
  const dept = String(item.dept || item.department || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  const email = String(item.email || '').toLowerCase();
  const explicitCat = String(item.category || '').toLowerCase();
  const refId = String(item.referenceId || item.id || '').toUpperCase();

  // 1. Check Driver
  if (role === 'driver' || explicitCat === 'driver' || des.includes('driver') || dept.includes('transport') || name.includes('driver') || email.includes('driver') || refId.startsWith('DRV')) {
    return { category: 'Driver', designation: 'Driver' };
  }

  // 2. Check Non-Teaching keywords & roles (includes Security & Watchman)
  const nonTeachingRoles = ['admin', 'accounts', 'accountant', 'librarian', 'hostel', 'warden', 'clerk', 'office staff', 'sub admin', 'subadmin', 'super admin', 'superadmin', 'watchman', 'security'];
  const nonTeachingKeywords = [
    'account', 'admin', 'librar', 'hostel', 'warden', 'clerk', 'office',
    'security', 'watchman', 'guard', 'peon', 'attender', 'technician', 'electrician', 'plumber',
    'mechanic', 'gardener', 'sweeper', 'non-teaching', 'non teaching', 'lab assistant',
    'placement', 'selvi', 'sundar', 'natrajan'
  ];

  const isExplicitNonTeaching = explicitCat === 'non-teaching' || explicitCat === 'nonteaching';
  const hasNonTeachingRole = nonTeachingRoles.includes(role);
  const hasNonTeachingWord = nonTeachingKeywords.some(w => des.includes(w) || role.includes(w) || dept.includes(w) || name.includes(w) || email.includes(w));

  if (isExplicitNonTeaching || hasNonTeachingRole || hasNonTeachingWord) {
    let designation = item.designation;
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
    designation: isHod ? 'Head of Department' : (item.designation && item.designation !== 'Staff' ? item.designation : 'Faculty')
  };
};

const isTeachingStaff = (staff) => {
  const { category } = getEmployeeClassification(staff);
  return category === 'Teaching';
};

// GET /api/employee-attendance/today
// Fetch today's attendance for the logged-in user
router.get('/today', protect, collegeScope, async (req, res) => {
  try {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setUTCHours(23, 59, 59, 999);

    const record = await EmployeeAttendance.findOne({
      employeeId: req.user._id,
      date: { $gte: dayStart, $lte: dayEnd }
    }).sort({ updatedAt: -1, _id: -1 });

    if (!record) {
      return res.status(200).json({ status: 'Not Marked', checkIn: null, checkOut: null });
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/employee-attendance/checkin
// Check in for today (Marks Present directly without any 9:00 AM clock blocks)
router.post('/checkin', protect, collegeScope, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const targetStatus = req.body?.status || 'Present';
    const checkInTime = new Date();

    const existingRecord = await EmployeeAttendance.findOne({
      employeeId: req.user._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    let updatedOrNewRecord;

    if (existingRecord) {
      existingRecord.checkIn = existingRecord.checkIn || checkInTime;
      existingRecord.status = targetStatus;
      existingRecord.remarks = req.body?.remarks || 'Duty Check-In (Present)';
      await existingRecord.save();
      updatedOrNewRecord = existingRecord;
    } else {
      updatedOrNewRecord = new EmployeeAttendance({
        tenantId: req.collegeId || req.user.tenantId || 'unassigned_college',
        collegeId: req.collegeId || req.user.collegeId || 'unassigned_college',
        employeeId: req.user._id,
        role: req.user.role,
        date: today,
        checkIn: checkInTime,
        status: targetStatus,
        remarks: req.body?.remarks || 'Duty Check-In (Present)'
      });
      await updatedOrNewRecord.save();
    }

    // Also sync TransportDriverAttendance if driver
    if (req.user.role === 'Driver') {
      try {
        const driverDoc = await TransportDriver.findOne({
          $or: [{ userId: req.user._id }, { email: req.user.email }]
        });
        if (driverDoc) {
          await TransportDriverAttendance.findOneAndUpdate(
            {
              driverId: driverDoc._id,
              date: today
            },
            {
              tenantId: req.collegeId || req.user.tenantId || 'unassigned_college',
              collegeId: req.collegeId || req.user.collegeId || 'unassigned_college',
              driverId: driverDoc._id,
              date: today,
              status: 'Present',
              inTime: checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              remarks: `Duty Check-In at ${checkInTime.toLocaleTimeString()}`
            },
            { upsert: true, new: true }
          );
        }
      } catch (err) {
        console.error('Driver attendance sync on checkin error:', err);
      }
    }

    // Also sync WatchmanAttendance if watchman
    if (req.user.role === 'Watchman') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const watchman = await Watchman.findOne({ $or: [{ user: req.user._id }, { name: req.user.name }] });
        const shift = req.body?.shift || watchman?.shift || 'Morning';
        const gate = req.body?.gate || watchman?.assignedGate || 'Gate 1 (Main Entrance)';

        await WatchmanAttendance.findOneAndUpdate(
          {
            $or: [
              { watchmanId: req.user._id, date: todayStr },
              { watchman: watchman?._id, dutyDate: todayStr }
            ]
          },
          {
            watchman: watchman?._id,
            watchmanId: req.user._id,
            watchmanName: req.user.name,
            employeeId: req.user.referenceId || watchman?.employeeId || 'WMN-7430',
            date: todayStr,
            dutyDate: todayStr,
            shift,
            gate,
            clockInTime: checkInTime,
            status: 'Active',
            notes: req.body?.remarks || 'Duty Check-In (Present)',
            collegeId: req.collegeId || req.user.collegeId || 'COL001',
            tenantId: req.collegeId || req.user.tenantId || 'COL001'
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Watchman attendance sync on checkin error:', err);
      }
    }

    // Emit real-time synchronization update to all portals
    req.app.get('io')?.emit('dataUpdated', {
      module: 'employee-attendance',
      action: 'checkin',
      employeeId: req.user._id,
      status: targetStatus
    });
    req.app.get('io')?.emit('dataUpdated', {
      module: 'transport-attendance',
      action: 'checkin',
      employeeId: req.user._id
    });
    req.app.get('io')?.emit('dataUpdated', {
      module: 'watchman',
      action: 'clock_in',
      employeeId: req.user._id
    });

    res.status(200).json(updatedOrNewRecord);
  } catch (error) {
    if (error.code === 11000) {
      // On duplicate key collision, fetch and return the active record
      try {
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date();
        dayEnd.setUTCHours(23, 59, 59, 999);

        const record = await EmployeeAttendance.findOne({
          employeeId: req.user._id,
          date: { $gte: dayStart, $lte: dayEnd }
        });
        if (record) {
          record.status = req.body?.status || 'Present';
          record.checkIn = record.checkIn || new Date();
          await record.save();

          req.app.get('io')?.emit('dataUpdated', {
            module: 'employee-attendance',
            action: 'checkin',
            employeeId: req.user._id
          });

          return res.status(200).json(record);
        }
      } catch (e) {}
    }
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/employee-attendance/checkout & POST /api/employee-attendance/checkout
// Check out for today
const handleEmployeeCheckout = async (req, res) => {
  try {
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setUTCHours(23, 59, 59, 999);

    const record = await EmployeeAttendance.findOne({
      employeeId: req.user._id,
      date: { $gte: dayStart, $lte: dayEnd }
    });

    if (!record) {
      return res.status(404).json({ message: 'No check-in found for today.' });
    }

    if (record.checkOut) {
      return res.status(400).json({ message: 'Already checked out today.' });
    }

    record.checkOut = new Date();
    await record.save();

    // Also sync WatchmanAttendance if watchman
    if (req.user.role === 'Watchman') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const clockOutTime = record.checkOut || new Date();
        await WatchmanAttendance.updateMany(
          {
            $or: [
              { watchmanId: req.user._id, date: todayStr },
              { employeeId: req.user.referenceId, dutyDate: todayStr }
            ]
          },
          {
            $set: {
              clockOutTime,
              status: 'Completed'
            }
          }
        );
      } catch (err) {
        console.error('Watchman attendance sync on checkout error:', err);
      }
    }

    req.app.get('io')?.emit('dataUpdated', {
      module: 'employee-attendance',
      action: 'checkout',
      employeeId: req.user._id
    });
    req.app.get('io')?.emit('dataUpdated', {
      module: 'transport-attendance',
      action: 'checkout',
      employeeId: req.user._id
    });
    req.app.get('io')?.emit('dataUpdated', {
      module: 'watchman',
      action: 'clock_out',
      employeeId: req.user._id
    });

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.put('/checkout', protect, collegeScope, handleEmployeeCheckout);
router.post('/checkout', protect, collegeScope, handleEmployeeCheckout);

// GET /api/employee-attendance/history
// Fetch history for the logged-in user
router.get('/history', protect, collegeScope, async (req, res) => {
  try {
    const history = await EmployeeAttendance.find({
      employeeId: req.user._id
    }).sort({ date: -1 });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin, Principal & Accounts bulk staff and driver attendance
router.post(
  '/admin/mark',
  protect,
  authorize('Admin', 'Principal', 'Sub Admin', 'Accounts'),
  collegeScope,
  async (req, res) => {
    try {
      const { date, records } = req.body;

      if (!date || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          message: 'Date and attendance records are required.'
        });
      }

      const attendanceDate = new Date(date);
      attendanceDate.setUTCHours(0, 0, 0, 0);
      const dateStr = String(date).split('T')[0];

      const allowedStatuses = [
        'Present',
        'Absent',
        'Late',
        'Leave',
        'On Leave',
        'Half Day',
        'LOP'
      ];

      const invalidRecord = records.find(
        record =>
          !record.employeeId ||
          !allowedStatuses.includes(record.status)
      );

      if (invalidRecord) {
        return res.status(400).json({
          message: 'Every employee requires a valid attendance status.'
        });
      }

      const collegeId =
        req.collegeId ||
        req.user.collegeId ||
        req.user.tenantId ||
        'unassigned_college';

      const operations = records.map(record => {
        const isWorking =
          record.status === 'Present' ||
          record.status === 'Late' ||
          record.status === 'Half Day';

        return {
          updateOne: {
            filter: {
              employeeId: record.employeeId,
              date: attendanceDate
            },
            update: {
              $set: {
                tenantId: collegeId,
                collegeId,
                employeeId: record.employeeId,
                role: record.role || 'Staff',
                date: attendanceDate,
                status: record.status,
                remarks: record.remarks || '',
                checkIn: isWorking
                  ? record.checkIn || new Date()
                  : null,
                checkOut: record.checkOut || null
              }
            },
            upsert: true
          }
        };
      });

      await EmployeeAttendance.bulkWrite(operations);

      // Synchronize driver attendance with TransportDriverAttendance collection
      const driverRecords = records.filter(r => r.role === 'Driver' || r.category === 'Driver' || r.driverId);
      if (driverRecords.length > 0) {
        for (const drv of driverRecords) {
          const drvId = drv.driverId || drv.referenceId || drv.employeeId;
          const drvStatus = drv.status === 'Leave' ? 'On Leave' : (drv.status === 'LOP' ? 'Absent' : drv.status);
          await TransportDriverAttendance.findOneAndUpdate(
            { driverId: drvId, date: dateStr },
            {
              $set: {
                driverId: drvId,
                driverName: drv.driverName || drv.name,
                date: dateStr,
                status: drvStatus || 'Present',
                remarks: drv.remarks || '',
                checkInTime: drv.checkInTime || (drv.status === 'Present' ? '08:30 AM' : undefined),
                collegeId
              }
            },
            { upsert: true }
          ).catch(() => {});
        }
      }

      req.app.get('io')?.emit('dataUpdated', {
        module: 'employee-attendance',
        action: 'bulk-marked',
        date: dateStr
      });
      req.app.get('io')?.emit('dataUpdated', {
        module: 'transport-attendance',
        action: 'bulk-marked',
        date: dateStr
      });

      res.status(200).json({
        message: 'Attendance saved successfully.',
        count: operations.length
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Admin / Accounts checkout for a selected employee
router.put(
  '/admin/checkout/:employeeId',
  protect,
  authorize('Admin', 'Principal', 'Sub Admin', 'Accounts'),
  collegeScope,
  async (req, res) => {
    try {
      const attendanceDate = new Date(
        req.body.date || new Date()
      );

      attendanceDate.setUTCHours(0, 0, 0, 0);

      const collegeId =
        req.collegeId ||
        req.user.collegeId ||
        req.user.tenantId;

      const record = await EmployeeAttendance.findOne({
        employeeId: req.params.employeeId,
        date: attendanceDate,
        $or: [
          { tenantId: collegeId },
          { collegeId }
        ]
      });

      if (!record) {
        return res.status(404).json({
          message: 'No employee check-in found for this date.'
        });
      }

      if (!record.checkIn) {
        return res.status(400).json({
          message: 'The employee has not checked in.'
        });
      }

      if (record.checkOut) {
        return res.status(400).json({
          message: 'The employee has already checked out.'
        });
      }

      record.checkOut = new Date();
      await record.save();

      req.app.get('io')?.emit('dataUpdated', {
        module: 'employee-attendance',
        action: 'checkout'
      });

      res.status(200).json({
        message: 'Employee checked out successfully.',
        record
      });
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
);

// GET /api/employee-attendance/admin/reports
// Admin, Principal, HOD, and Accounts report for all employees (Teaching, Non-Teaching, Drivers)
router.get('/admin/reports', protect, authorize('Admin', 'Principal', 'Sub Admin', 'HOD', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const { date, role, department, category } = req.query;
    
    const tenantValues = [
      req.collegeId,
      'unassigned_college',
      'mock_college_id'
    ];

    let filter = {
      $or: [
        { tenantId: { $in: tenantValues } },
        { collegeId: { $in: tenantValues } }
      ]
    };

    let userFilter = {
      $or: [
        { tenantId: { $in: tenantValues } },
        { collegeId: { $in: tenantValues } }
      ]
    };

    let queryDateStr = '';
    if (date && date !== 'all') {
      const queryDate = new Date(date);
      const dayStart = new Date(queryDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(queryDate);
      dayEnd.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: dayStart, $lte: dayEnd };
      queryDateStr = String(date).split('T')[0];
    } else if (!date) {
      const today = new Date();
      const dayStart = new Date(today);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(today);
      dayEnd.setUTCHours(23, 59, 59, 999);
      filter.date = { $gte: dayStart, $lte: dayEnd };
      queryDateStr = today.toISOString().split('T')[0];
    }
    
    if (role) {
      filter.role = role;
      userFilter.role = role;
    } else {
      userFilter.role = { $nin: ['Student', 'student', 'Parent', 'parent', 'Super Admin', 'superadmin'] };
    }

    if (department) {
      userFilter.department = department;
    }

    const collegeScopeFilter = req.collegeId ? { $or: [{ collegeId: req.collegeId }, { tenantId: req.collegeId }] } : {};

    // 1. Fetch Staff, Drivers, and Watchmen from college
    const [staffRecords, driverRecords, watchmanRecords] = await Promise.all([
      Staff.find(collegeScopeFilter).lean().catch(() => []),
      TransportDriver.find(collegeScopeFilter).lean().catch(() => []),
      Watchman.find(collegeScopeFilter).lean().catch(() => [])
    ]);

    // 2. Synchronize Staff to User login accounts
    if (staffRecords.length > 0) {
      await User.bulkWrite(
        staffRecords.map(staffMember => {
          const teaching = isTeachingStaff(staffMember);
          return {
            updateOne: {
              filter: {
                $or: [
                  { referenceId: staffMember.id },
                  { email: staffMember.email }
                ]
              },
              update: {
                $set: {
                  name: staffMember.name,
                  department: staffMember.dept || 'General',
                  designation: staffMember.designation || (teaching ? 'Professor' : 'Office Staff'),
                  referenceId: staffMember.id,
                  category: teaching ? 'Teaching' : 'Non-Teaching',
                  role: staffMember.designation === 'HOD' ? 'HOD' : 'Staff',
                  tenantId: req.collegeId || 'mock_college_id',
                  collegeId: req.collegeId || 'mock_college_id'
                }
              },
              upsert: true
            }
          };
        })
      ).catch(() => {});
    }

    // 3. Synchronize Drivers to User collection
    if (driverRecords.length > 0) {
      await User.bulkWrite(
        driverRecords.map(driver => ({
          updateOne: {
            filter: {
              $or: [
                { referenceId: driver.driverId },
                { email: driver.email || `driver_${driver.driverId.toLowerCase()}@college.edu` }
              ]
            },
            update: {
              $set: {
                name: driver.name,
                department: 'Transport',
                designation: 'Driver',
                referenceId: driver.driverId,
                category: 'Driver',
                role: 'Driver',
                tenantId: req.collegeId || 'mock_college_id',
                collegeId: req.collegeId || 'mock_college_id'
              }
            },
            upsert: true
          }
        }))
      ).catch(() => {});
    }

    // 3B. Synchronize Watchmen to User collection for Accounts & HR attendance
    if (watchmanRecords.length > 0) {
      await User.bulkWrite(
        watchmanRecords.map(w => ({
          updateOne: {
            filter: {
              $or: [
                { referenceId: w.employeeId },
                { email: w.email || `watchman_${w.employeeId.toLowerCase()}@college.edu` }
              ]
            },
            update: {
              $set: {
                name: w.name,
                department: 'Campus Security',
                designation: 'Security Officer',
                referenceId: w.employeeId,
                category: 'Non-Teaching',
                role: 'Watchman',
                tenantId: w.tenantId || req.collegeId || 'COL001',
                collegeId: w.collegeId || req.collegeId || 'COL001'
              }
            },
            upsert: true
          }
        }))
      ).catch(() => {});
    }

    // 4. Fetch Users, EmployeeAttendance, and TransportDriverAttendance
    const users = await User.find(userFilter).lean();
    const userIds = users.map(u => u._id);
    const attQuery = {
      date: filter.date,
      $or: [
        filter,
        { employeeId: { $in: userIds } }
      ]
    };

    // Calculate Month bounds for the requested date (e.g. 2026-10-01 to 2026-10-31)
    const refDate = queryDateStr ? new Date(`${queryDateStr}T12:00:00Z`) : new Date();
    const yearNum = refDate.getUTCFullYear();
    const monthNum = refDate.getUTCMonth() + 1; // 1-12
    const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate(); // 30 or 31 days
    const monthStart = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));
    const monthPrefix = `${yearNum}-${String(monthNum).padStart(2, '0')}`;

    const baseTenantFilter = {
      $or: [
        { tenantId: { $in: tenantValues } },
        { collegeId: { $in: tenantValues } }
      ]
    };

    const [attendanceRecords, driverAttendanceRecords, monthlyRecords, driverMonthlyRecords] = await Promise.all([
      EmployeeAttendance.find(attQuery).populate('employeeId', 'name email department designation referenceId role category').lean(),
      queryDateStr ? TransportDriverAttendance.find({ date: queryDateStr, ...collegeScopeFilter }).lean().catch(() => []) : [],
      EmployeeAttendance.find({
        date: { $gte: monthStart, $lte: monthEnd },
        $or: [baseTenantFilter, { employeeId: { $in: userIds } }]
      }).populate('employeeId', 'name email department designation referenceId role category').lean().catch(() => []),
      TransportDriverAttendance.find({
        date: { $regex: `^${monthPrefix}` },
        ...collegeScopeFilter
      }).lean().catch(() => [])
    ]);

    // Build map of monthly attendance counts per employee with multi-key indexing
    const monthlyStatsMap = new Map();

    const addToMonthlyStats = (key, status, checkIn, dateStr) => {
      if (!key) return;
      const k = String(key).trim();
      if (!monthlyStatsMap.has(k)) {
        monthlyStatsMap.set(k, {
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          lop: 0,
          totalMarked: 0,
          datesTracked: new Set()
        });
      }
      const st = monthlyStatsMap.get(k);
      const dateKey = String(dateStr || '').split('T')[0];
      if (dateKey && st.datesTracked.has(dateKey)) {
        return; // already counted for this date
      }
      if (dateKey) st.datesTracked.add(dateKey);

      st.totalMarked += 1;
      const s = String(status || '').toLowerCase();
      if (s === 'present' || s === 'late' || s === 'half day' || checkIn) {
        st.present += 1;
      }
      if (s === 'absent') st.absent += 1;
      if (s === 'late') st.late += 1;
      if (s === 'leave' || s === 'on leave') st.leave += 1;
      if (s === 'lop') st.lop += 1;
    };

    monthlyRecords.forEach(r => {
      const emp = r.employeeId || {};
      const empId = emp._id ? emp._id.toString() : (r.employeeId ? r.employeeId.toString() : null);
      const email = emp.email ? String(emp.email).toLowerCase() : null;
      const refId = emp.referenceId ? String(emp.referenceId).toUpperCase() : null;
      const name = emp.name ? String(emp.name).toLowerCase() : null;
      const dStr = r.date ? new Date(r.date).toISOString().split('T')[0] : '';

      [empId, email, refId, name].filter(Boolean).forEach(k => {
        addToMonthlyStats(k, r.status, r.checkIn, dStr);
      });
    });

    driverMonthlyRecords.forEach(dr => {
      const drvId = dr.driverId ? String(dr.driverId).toUpperCase() : null;
      const drvName = dr.driverName ? String(dr.driverName).toLowerCase() : null;
      const dStr = dr.date ? String(dr.date).split('T')[0] : '';

      [drvId, drvName].filter(Boolean).forEach(k => {
        addToMonthlyStats(k, dr.status, dr.checkInTime, dStr);
      });
    });

    const getMonthlyAttendancePayload = (userOrEmp) => {
      let m = null;
      if (userOrEmp) {
        const id = userOrEmp._id ? userOrEmp._id.toString() : (typeof userOrEmp === 'string' ? userOrEmp : '');
        const email = userOrEmp.email ? String(userOrEmp.email).toLowerCase() : '';
        const refId = userOrEmp.referenceId ? String(userOrEmp.referenceId).toUpperCase() : '';
        const name = userOrEmp.name ? String(userOrEmp.name).toLowerCase() : '';

        m = monthlyStatsMap.get(id) || monthlyStatsMap.get(email) || monthlyStatsMap.get(refId) || monthlyStatsMap.get(name);
      }
      m = m || { present: 0, absent: 0, late: 0, leave: 0, lop: 0, totalMarked: 0 };
      const presentCount = m.present;
      return {
        presentDays: presentCount,
        absentDays: m.absent,
        leaveDays: m.leave,
        lateDays: m.late,
        lopDays: m.lop,
        totalMarkedDays: m.totalMarked,
        totalDaysInMonth: 30,
        percentage: Number(((presentCount / 30) * 100).toFixed(1)),
        monthName: refDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      };
    };
    
    const attendanceMap = new Map();
    const handledAttendanceIds = new Set();

    attendanceRecords.forEach(record => {
      if (record.employeeId) {
        const empKey = record.employeeId._id ? record.employeeId._id.toString() : record.employeeId.toString();
        attendanceMap.set(empKey, record);
        if (record.employeeId.email) attendanceMap.set(String(record.employeeId.email).trim().toLowerCase(), record);
        if (record.employeeId.referenceId) attendanceMap.set(String(record.employeeId.referenceId).trim(), record);
      }
    });

    const driverAttendanceMap = new Map();
    driverAttendanceRecords.forEach(record => {
      if (record.driverId) {
        driverAttendanceMap.set(String(record.driverId).trim(), record);
      }
      if (record.driverName) {
        driverAttendanceMap.set(String(record.driverName).trim().toLowerCase(), record);
      }
    });

    let fullReports = users.map(user => {
      const record = attendanceMap.get(user._id.toString())
        || (user.email ? attendanceMap.get(String(user.email).trim().toLowerCase()) : null)
        || (user.referenceId ? attendanceMap.get(String(user.referenceId).trim()) : null);

      if (record && record._id) {
        handledAttendanceIds.add(record._id.toString());
      }

      const driverRecord = user.role === 'Driver' || user.category === 'Driver'
        ? (driverAttendanceMap.get(String(user.referenceId || '').trim()) || driverAttendanceMap.get(String(user.name || '').trim().toLowerCase()))
        : null;

      const { category: employeeCategory, designation: employeeDesignation } = getEmployeeClassification(user);
      const monthlyAttendance = getMonthlyAttendancePayload(user);

      if (record) {
        return {
          ...record,
          category: employeeCategory,
          role: user.role,
          monthlyAttendance,
          employeeId: {
            _id: user._id,
            name: user.name,
            email: user.email,
            department: user.department || 'Not Assigned',
            designation: employeeDesignation,
            referenceId: user.referenceId || user._id.toString().slice(-6).toUpperCase(),
            category: employeeCategory
          }
        };
      }

      if (driverRecord) {
        return {
          _id: driverRecord._id || `drv_att_${user._id}`,
          employeeId: {
            _id: user._id,
            name: user.name,
            email: user.email,
            department: 'Transport',
            designation: 'Driver',
            referenceId: user.referenceId || driverRecord.driverId || 'DRV-001',
            category: 'Driver'
          },
          role: 'Driver',
          category: 'Driver',
          date: filter.date || new Date(),
          checkIn: driverRecord.checkInTime ? new Date(`${queryDateStr || new Date().toISOString().split('T')[0]}T${driverRecord.checkInTime}`) : null,
          checkOut: driverRecord.checkOutTime ? new Date(`${queryDateStr || new Date().toISOString().split('T')[0]}T${driverRecord.checkOutTime}`) : null,
          status: driverRecord.status || 'Present',
          remarks: driverRecord.remarks || '',
          monthlyAttendance
        };
      }

      return {
        _id: `unmarked_${user._id}`,
        employeeId: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department || 'Not Assigned',
          designation: employeeDesignation,
          referenceId: user.referenceId || user._id.toString().slice(-6).toUpperCase(),
          category: employeeCategory
        },
        role: user.role,
        category: employeeCategory,
        monthlyAttendance,
        date: filter.date || new Date(),
        checkIn: null,
        checkOut: null,
        status: 'Not Marked'
      };
    });

    // Append any attendance records that were marked today but not matched to the fetched users array
    attendanceRecords.forEach(record => {
      const recId = record._id ? record._id.toString() : null;
      if (recId && !handledAttendanceIds.has(recId)) {
        const empObj = typeof record.employeeId === 'object' && record.employeeId !== null ? record.employeeId : {};
        const { category: empCat, designation: empDes } = getEmployeeClassification(empObj);
        const empId = empObj._id || record.employeeId;
        fullReports.push({
          ...record,
          category: empCat,
          role: record.role || empObj.role,
          monthlyAttendance: getMonthlyAttendancePayload(empObj._id ? empObj : record),
          employeeId: {
            _id: empObj._id || record.employeeId || recId,
            name: empObj.name || record.name || 'Employee',
            email: empObj.email || record.email || '',
            department: empObj.department || 'Not Assigned',
            designation: empDes,
            referenceId: empObj.referenceId || String(empObj._id || recId).slice(-6).toUpperCase(),
            category: empCat
          }
        });
      }
    });

    // Intelligent Multi-Key Deduplication: merges duplicates sharing ID, email, or referenceId
    const deduplicatedMap = new Map();
    const keyToPrimary = new Map();

    fullReports.forEach(item => {
      const emp = item.employeeId || {};
      const refKey = emp.referenceId ? `ref_${String(emp.referenceId).trim().toUpperCase()}` : null;
      const emailKey = emp.email ? `email_${String(emp.email).trim().toLowerCase()}` : null;
      const idKey = emp._id ? `id_${String(emp._id)}` : `item_${item._id}`;

      // Check if this record matches an existing group
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

      // Link all identifiers to the primary key
      if (refKey) keyToPrimary.set(refKey, primaryKey);
      if (emailKey) keyToPrimary.set(emailKey, primaryKey);
      if (idKey) keyToPrimary.set(idKey, primaryKey);

      const existing = deduplicatedMap.get(primaryKey);
      if (!existing) {
        deduplicatedMap.set(primaryKey, item);
      } else {
        // Priority: Present / Active check-in beats LOP / Unmarked
        const hasCheckIn = item.checkIn || item.status === 'Present' || item.status === 'Late';
        const existingHasCheckIn = existing.checkIn || existing.status === 'Present' || existing.status === 'Late';

        if (hasCheckIn && !existingHasCheckIn) {
          deduplicatedMap.set(primaryKey, item);
        } else if (hasCheckIn && existingHasCheckIn) {
          // If both have check-ins, keep the latest one
          const itemTime = item.checkIn ? new Date(item.checkIn).getTime() : 0;
          const existingTime = existing.checkIn ? new Date(existing.checkIn).getTime() : 0;
          if (itemTime >= existingTime) {
            deduplicatedMap.set(primaryKey, item);
          }
        }
      }
    });

    let finalReports = Array.from(deduplicatedMap.values());

    if (category && category !== 'ALL') {
      finalReports = finalReports.filter(r => String(r.category || '').toLowerCase() === category.toLowerCase());
    }

    res.status(200).json(finalReports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/employee-attendance/stats
// Return aggregated attendance statistics per employee
router.get('/stats', protect, authorize('Admin', 'Principal', 'Sub Admin', 'HOD', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const tenantValues = [
      req.collegeId,
      req.user?.tenantId,
      req.user?.collegeId,
      'unassigned_college',
      'mock_college_id'
    ].filter(Boolean);

    const { month } = req.query;
    let queryDate = new Date();
    let yearNumber = queryDate.getFullYear();
    let monthNumber = queryDate.getMonth() + 1;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const parts = month.split('-').map(Number);
      yearNumber = parts[0];
      monthNumber = parts[1];
    }

    const startDate = new Date(Date.UTC(yearNumber, monthNumber - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(yearNumber, monthNumber, 0, 23, 59, 59, 999));
    const totalDaysInMonth = new Date(yearNumber, monthNumber, 0).getDate(); // 30 or 31

    const userFilter = {
      $or: [
        { tenantId: { $in: tenantValues } },
        { collegeId: { $in: tenantValues } }
      ]
    };
    const collegeUsers = await User.find(userFilter).select('_id referenceId email name role').lean();
    const userIds = collegeUsers.map(u => u._id);

    const records = await EmployeeAttendance.find({
      date: { $gte: startDate, $lte: endDate },
      $or: [
        { tenantId: { $in: tenantValues } },
        { collegeId: { $in: tenantValues } },
        { employeeId: { $in: userIds } }
      ]
    }).lean();

    const statsByEmployee = {};

    // Initialize all users so even employees with 0 attendance have correct structure
    collegeUsers.forEach(u => {
      const uId = u._id.toString();
      statsByEmployee[uId] = {
        employeeId: uId,
        name: u.name,
        role: u.role,
        total: 0,
        present: 0,
        presentDays: 0,
        absent: 0,
        absentDays: 0,
        late: 0,
        leave: 0,
        leaveDays: 0,
        lop: 0,
        totalDaysInMonth,
        percentage: 0
      };
    });

    records.forEach(r => {
      const empId = r.employeeId ? r.employeeId.toString() : null;
      if (!empId) return;

      if (!statsByEmployee[empId]) {
        statsByEmployee[empId] = {
          employeeId: empId,
          total: 0,
          present: 0,
          presentDays: 0,
          absent: 0,
          absentDays: 0,
          late: 0,
          leave: 0,
          leaveDays: 0,
          lop: 0,
          totalDaysInMonth,
          percentage: 0
        };
      }

      const status = String(r.status || '').toLowerCase();
      const stat = statsByEmployee[empId];

      stat.total += 1;

      if (status === 'present' || status === 'late' || status === 'half day' || r.checkIn) {
        stat.present += 1;
        stat.presentDays += 1;
      }
      if (status === 'absent') { stat.absent += 1; stat.absentDays += 1; }
      if (status === 'late') stat.late += 1;
      if (status === 'leave' || status === 'on leave') { stat.leave += 1; stat.leaveDays += 1; }
      if (status === 'lop') stat.lop += 1;
    });

    // Compute percentages
    Object.values(statsByEmployee).forEach(st => {
      st.totalDaysInMonth = totalDaysInMonth;
      st.percentage = totalDaysInMonth > 0 ? Number(((st.present / totalDaysInMonth) * 100).toFixed(1)) : 0;
    });

    collegeUsers.forEach(user => {
      const uId = user._id.toString();
      const baseStat = statsByEmployee[uId];
      if (baseStat) {
        if (user.referenceId) {
          statsByEmployee[user.referenceId] = baseStat;
        }
        if (user.email) {
          statsByEmployee[user.email.toLowerCase()] = baseStat;
        }
      }
    });

    res.status(200).json(statsByEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

