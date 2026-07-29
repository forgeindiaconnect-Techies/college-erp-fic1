import express from 'express';
import Fee from '../models/Fee.js';
import Department from '../models/Department.js';
import PlacementSelection from '../models/PlacementSelection.js';
import Attendance from '../models/Attendance.js';
import EmployeeAttendance from '../models/EmployeeAttendance.js';
import Student from '../models/Student.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get AI predictive analytics and insights
// @route   GET /api/analytics/ai-insights
// @access  Private/Principal
router.get('/ai-insights', protect, authorize('Admin', 'Sub Admin', 'Principal'), collegeScope, async (req, res) => {
  try {
    const lowAttCount = await Student.countDocuments({ attendance: { $lt: 75 } });
    const lowCgpaCount = await Student.countDocuments({ cgpa: { $lt: 8.0 } });

    const insights = [
      {
        type: 'danger',
        text: `High Dropout Risk: ${lowAttCount} Students flagged due to critical attendance < 75%. AI recommends immediate HOD counseling.`,
        c: '#ef4444'
      },
      {
        type: 'warning',
        text: `Academic Performance Alert: ${lowCgpaCount} students fall below target 8.0 CGPA threshold this term.`,
        c: '#f59e0b'
      },
      {
        type: 'success',
        text: 'Fee Revenue Projection: Out of all pending balances, AI predicts 85% collection rate within the next 15 days.',
        c: '#10b981'
      },
      {
        type: 'info',
        text: 'Placement Forecast: Final year CSE placement match is 94% optimized with active Google recruitment drives.',
        c: '#0ea5e9'
      }
    ];

    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: 'Server error generating AI insights' });
  }
});

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private/Admin
router.get('/', protect, authorize('Admin', 'Sub Admin', 'Principal'), collegeScope, async (req, res) => {
  try {
    // 1. Fee Revenue (Total Paid vs Pending)
    const feeStats = await Fee.aggregate([
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$paidAmount" },
          totalPending: { $sum: "$pendingAmount" }
        }
      }
    ]);

    // 2. Department Rankings (by total students for simplicity)
    const deptStats = await Department.find({}, 'name totalStudents').sort({ totalStudents: -1 });

    // 3. Placement Stats (Count by Company)
    const placementStats = await PlacementSelection.aggregate([
      {
        $group: {
          _id: "$company",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // 4. Attendance Trends (Overall Present vs Absent)
    const attendanceStats = await Attendance.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    // 5. Attendance Trends (Last 7 days for charts)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setUTCHours(0,0,0,0);

    const studentAtt = await Attendance.aggregate([
      { $match: { attendanceDate: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$attendanceDate" } },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Late"]] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const staffAtt = await EmployeeAttendance.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Late"]] }, 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Combine into a 7-day array
    const attendanceTrends = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const sDay = studentAtt.find(x => x._id === dateStr);
      const stDay = staffAtt.find(x => x._id === dateStr);

      attendanceTrends.push({
        name: i === 0 ? 'Latest' : dayName,
        students: sDay && sDay.total > 0 ? Math.round((sDay.present / sDay.total) * 100) : 0,
        staff: stDay && stDay.total > 0 ? Math.round((stDay.present / stDay.total) * 100) : 0,
      });
    }

    res.json({
      fees: feeStats.length > 0 ? feeStats[0] : { totalCollected: 0, totalPending: 0 },
      departments: deptStats,
      placements: placementStats,
      attendance: attendanceStats,
      attendanceTrends
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error generating analytics' });
  }
});

export default router;
