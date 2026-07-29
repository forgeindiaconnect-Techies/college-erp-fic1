import express from 'express';
import Student from '../models/Student.js';
import Mark from '../models/Mark.js';
import Attendance from '../models/Attendance.js';
import Fee from '../models/Fee.js';
import Department from '../models/Department.js';
import ActivityLog from '../models/ActivityLog.js';
import { protect, authorize, requirePermission, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// All reports limited to Admin, Sub Admin, Principal, HOD roles
router.use(protect);
router.use(authorize('Admin', 'Sub Admin', 'Principal', 'HOD'));
router.use(collegeScope);
// Adding a general permission check for Sub Admin; other roles bypass this check in the middleware
router.use(requirePermission('view_reports'));

// Helper: Returns a Student query object scoped to the user's department if HOD.
// Student model uses 'dept'; User model stores department in 'department'.
const getStudentDeptQuery = (user) =>
  user.role === 'HOD' && user.department ? { dept: user.department } : {};

// Helper: Returns a query scoped to the user's department if HOD.
// Attendance/Mark/Fee models use 'department'.
const getDeptQuery = (user) =>
  user.role === 'HOD' && user.department ? { department: user.department } : {};

// Attendance Report (scoped for HOD)
router.get('/attendance', async (req, res) => {
  try {
    const query = getStudentDeptQuery(req.user);
    const students = await Student.find(query, 'name id dept sem attendance').sort({ attendance: -1 });
    const averageAttendance = students.length > 0
      ? students.reduce((sum, s) => sum + (s.attendance || 0), 0) / students.length
      : 0;

    res.json({
      averageAttendance: averageAttendance.toFixed(2),
      totalStudents: students.length,
      data: students
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Low Attendance Report (< 75%) — scoped for HOD
router.get('/low-attendance', async (req, res) => {
  try {
    const deptFilter = getStudentDeptQuery(req.user);
    const students = await Student.find(
      { ...deptFilter, attendance: { $lt: 75 } },
      'name id dept sem attendance phone email'
    );
    res.json({
      totalLowAttendance: students.length,
      data: students
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CGPA / Marks Report — scoped for HOD
router.get('/cgpa', async (req, res) => {
  try {
    const query = getStudentDeptQuery(req.user);
    const students = await Student.find(query, 'name id dept sem cgpa').sort({ cgpa: -1 });
    const averageCgpa = students.length > 0
      ? students.reduce((sum, s) => sum + (s.cgpa || 0), 0) / students.length
      : 0;

    res.json({
      averageCgpa: averageCgpa.toFixed(2),
      totalStudents: students.length,
      data: students
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fees Report — HODs are NOT allowed to see fee data (Accounts/Admin only)
// This route remains accessible to Admin/Principal; HODs get an empty response
router.get('/fees', async (req, res) => {
  try {
    if (req.user.role === 'HOD') {
      return res.status(403).json({ message: 'HODs are not authorized to view fees reports' });
    }
    const fees = await Fee.find().sort({ createdAt: -1 });
    const totalCollected = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
    const totalPending = fees.reduce((sum, f) => sum + (f.pendingAmount || 0), 0);

    res.json({
      totalCollected,
      totalPending,
      totalTransactions: fees.length,
      data: fees
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Pending Fees Report — HODs blocked
router.get('/pending-fees', async (req, res) => {
  try {
    if (req.user.role === 'HOD') {
      return res.status(403).json({ message: 'HODs are not authorized to view fees reports' });
    }
    const pendingFees = await Fee.find({ pendingAmount: { $gt: 0 } }).sort({ pendingAmount: -1 });
    const totalPending = pendingFees.reduce((sum, f) => sum + (f.pendingAmount || 0), 0);

    res.json({
      totalPending,
      totalDefaulters: pendingFees.length,
      data: pendingFees
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Department Report — HOD sees only their own department
router.get('/departments', async (req, res) => {
  try {
    let departments;

    if (req.user.role === 'HOD' && req.user.department) {
      // HOD sees only their own department
      departments = await Department.find({ name: req.user.department });
    } else {
      departments = await Department.find();
    }

    // Enrich with actual student counts and average CGPA/Attendance
    const reportData = await Promise.all(departments.map(async (dept) => {
      const students = await Student.find({ dept: dept.name });
      const avgAtt = students.length > 0
        ? students.reduce((s, x) => s + (x.attendance || 0), 0) / students.length
        : 0;
      const avgCgpa = students.length > 0
        ? students.reduce((s, x) => s + (x.cgpa || 0), 0) / students.length
        : 0;

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        totalStudents: students.length,
        averageAttendance: avgAtt.toFixed(2),
        averageCgpa: avgCgpa.toFixed(2),
        hod: dept.hod
      };
    }));

    res.json(reportData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Activity Logs Report — scoped for HOD (department only), Sub Admin (no System Settings), Admin (all)
router.get('/activity-logs', async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'HOD') {
      query = { $or: [{ dept: req.user.department }, { role: 'HOD', userName: req.user.name }] };
    } else if (req.user.role === 'Sub Admin') {
      query = { role: { $ne: 'Super Admin' }, moduleName: { $ne: 'System Settings' } };
    }
    
    const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
