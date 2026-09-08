import express from 'express';
import EmployeeAttendance from '../models/EmployeeAttendance.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { protect, collegeScope, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/employee-attendance/today
// Fetch today's attendance for the logged-in user
router.get('/today', protect, collegeScope, async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await EmployeeAttendance.findOne({
      tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] },
      employeeId: req.user._id,
      date: today
    });

    if (!record) {
      return res.status(200).json({ status: 'Not Marked', checkIn: null, checkOut: null });
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/employee-attendance/checkin
// Check in for today
router.post('/checkin', protect, collegeScope, async (req, res) => {
  try {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    if (hours > 9 || (hours === 9 && minutes > 0)) {
      return res.status(403).json({ message: 'Check-in is closed after 9:00 AM. You are marked as LOP for today.' });
    }

    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);

    const existingRecord = await EmployeeAttendance.findOne({
      tenantId: req.collegeId || 'unassigned_college',
      employeeId: req.user._id,
      date: today
    });

    if (existingRecord) {
      return res.status(400).json({ message: 'Attendance already marked today.' });
    }

    const checkInTime = new Date();
    const newRecord = new EmployeeAttendance({
      tenantId: req.collegeId || 'unassigned_college',
      collegeId: req.collegeId || 'unassigned_college',
      employeeId: req.user._id,
      role: req.user.role,
      date: today,
      checkIn: checkInTime,
      status: 'Present' // Default to present, we can add logic for late later
    });

    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked today.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/employee-attendance/checkout
// Check out for today
router.put('/checkout', protect, collegeScope, async (req, res) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await EmployeeAttendance.findOne({
      tenantId: req.collegeId || 'unassigned_college',
      employeeId: req.user._id,
      date: today
    });

    if (!record) {
      return res.status(404).json({ message: 'No check-in found for today.' });
    }

    if (record.checkOut) {
      return res.status(400).json({ message: 'Already checked out today.' });
    }

    record.checkOut = new Date();
    await record.save();

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/employee-attendance/history
// Fetch history for the logged-in user
router.get('/history', protect, collegeScope, async (req, res) => {
  try {
    const history = await EmployeeAttendance.find({
      tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] },
      employeeId: req.user._id
    }).sort({ date: -1 });

    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin bulk staff attendance
router.post(
  '/admin/mark',
  protect,
  authorize('Admin', 'Principal', 'Sub Admin'),
  collegeScope,
  async (req, res) => {
    try {
      const { date, records } = req.body;

      if (!date || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
          message: 'Date and staff attendance records are required.'
        });
      }

      const attendanceDate = new Date(date);
      attendanceDate.setUTCHours(0, 0, 0, 0);

      const allowedStatuses = [
        'Present',
        'Absent',
        'Late',
        'Leave',
        'LOP'
      ];

      const invalidRecord = records.find(
        record =>
          !record.employeeId ||
          !allowedStatuses.includes(record.status)
      );

      if (invalidRecord) {
        return res.status(400).json({
          message: 'Every staff member requires a valid attendance status.'
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
          record.status === 'Late';

        return {
          updateOne: {
            filter: {
              collegeId,
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

      req.app.get('io')?.emit('dataUpdated', {
        module: 'employee-attendance',
        action: 'bulk-marked'
      });

      res.status(200).json({
        message: 'Staff attendance saved successfully.',
        count: operations.length
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Admin checkout for a selected employee
router.put(
  '/admin/checkout/:employeeId',
  protect,
  authorize('Admin', 'Principal', 'Sub Admin'),
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
          message: 'No staff check-in found for this date.'
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
        message: 'Staff checked out successfully.',
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
// Admin & HOD report for all employees
router.get('/admin/reports', protect, authorize('Admin', 'Principal', 'Sub Admin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const { date, role, department } = req.query;
    
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

    if (date && date !== 'all') {
      const queryDate = new Date(date);
      queryDate.setUTCHours(0, 0, 0, 0);
      filter.date = queryDate;
    } else if (!date) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      filter.date = today;
    }
    
    if (role) {
      filter.role = role;
      userFilter.role = role;
    } else {
      userFilter.role = { $in: ['Staff', 'HOD', 'Principal', 'Accounts', 'Driver'] };
    }

    if (department) {
      userFilter.department = department;
    }

    // Synchronize existing Staff records with their User login accounts
    const staffRecords = await Staff.find({
      collegeId: req.collegeId
    });

    if (staffRecords.length > 0) {
      await User.bulkWrite(
        staffRecords.map(staffMember => ({
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
                department: staffMember.dept,
                referenceId: staffMember.id,
                role:
                  staffMember.designation === 'HOD'
                    ? 'HOD'
                    : 'Staff',
                tenantId: req.collegeId,
                collegeId: req.collegeId
              }
            }
          }
        }))
      );
    }

    const users = await User.find(userFilter);
    const attendanceRecords = await EmployeeAttendance.find(filter).populate('employeeId', 'name email department');
    
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      if (record.employeeId) {
        attendanceMap.set(record.employeeId._id.toString(), record);
      }
    });

    const fullReports = users.map(user => {
      const record = attendanceMap.get(user._id.toString());
      if (record) return record;
      return {
        _id: `lop_${user._id}`,
        employeeId: {
          _id: user._id,
          name: user.name,
          email: user.email,
          department: user.department || 'Not Assigned'
        },
        role: user.role,
        date: filter.date || new Date(),
        checkIn: null,
        checkOut: null,
        status: 'LOP'
      };
    });

    res.status(200).json(fullReports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/employee-attendance/stats
// Return aggregated attendance statistics per employee
router.get('/stats', protect, authorize('Admin', 'Principal', 'Sub Admin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const query = {
      tenantId: {
        $in: [req.collegeId, 'unassigned_college', 'mock_college_id']
      }
    };

    const { month } = req.query;

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNumber] = month.split('-').map(Number);
      const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
      const endDate = new Date(Date.UTC(year, monthNumber, 1));

      query.date = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const records = await EmployeeAttendance.find(query);

    const statsByEmployee = {};
    records.forEach(r => {
      const empId = r.employeeId ? r.employeeId.toString() : null;
      if (!empId) return;

      if (!statsByEmployee[empId]) {
        statsByEmployee[empId] = {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          lop: 0
        };
      }

      const status = String(r.status || '').toLowerCase();
      const stat = statsByEmployee[empId];

      stat.total += 1;

      if (status === 'present' || status === 'late' || r.checkIn) {
        stat.present += 1;
      }
      if (status === 'absent') stat.absent += 1;
      if (status === 'late') stat.late += 1;
      if (status === 'leave') stat.leave += 1;
      if (status === 'lop') stat.lop += 1;
    });

    const employeeIds = Object.keys(statsByEmployee);

    const users = await User.find({
      _id: { $in: employeeIds }
    }).select('_id referenceId email');

    users.forEach(user => {
      if (user.referenceId) {
        statsByEmployee[user.referenceId] =
          statsByEmployee[user._id.toString()];
      }
      if (user.email) {
        statsByEmployee[user.email.toLowerCase()] =
          statsByEmployee[user._id.toString()];
      }
    });

    res.status(200).json(statsByEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
