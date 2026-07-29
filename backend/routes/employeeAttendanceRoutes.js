import express from 'express';
import EmployeeAttendance from '../models/EmployeeAttendance.js';
import User from '../models/User.js';
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

// GET /api/employee-attendance/admin/reports
// Admin & HOD report for all employees
router.get('/admin/reports', protect, authorize('Admin', 'Principal', 'Sub Admin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const { date, role, department } = req.query;
    
    let filter = { tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] } };
    let userFilter = { tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] } };

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

    const users = await User.find(userFilter);
    const attendanceRecords = await EmployeeAttendance.find(filter).populate('employeeId', 'name email');
    
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
        employeeId: { _id: user._id, name: user.name, email: user.email },
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
    const records = await EmployeeAttendance.find({
      tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] }
    });

    const statsByEmployee = {};
    records.forEach(r => {
      const empId = r.employeeId ? r.employeeId.toString() : null;
      if (!empId) return;

      if (!statsByEmployee[empId]) {
        statsByEmployee[empId] = { total: 0, present: 0 };
      }
      statsByEmployee[empId].total += 1;
      if (r.status === 'Present' || r.checkIn) {
        statsByEmployee[empId].present += 1;
      }
    });

    res.status(200).json(statsByEmployee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
