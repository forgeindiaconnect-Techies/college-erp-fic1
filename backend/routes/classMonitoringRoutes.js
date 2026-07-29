import express from 'express';
import Timetable from '../models/Timetable.js';
import Attendance from '../models/Attendance.js';
import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get daily monitoring summary for HOD and Principal
router.get('/daily-status', protect, collegeScope, async (req, res) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    const todayStr = new Date().toISOString().split('T')[0];

    const filter = { collegeId: req.collegeId, day: todayName };
    if (req.query.department && req.query.department !== 'All') {
      filter.department = req.query.department;
    }

    const scheduledPeriods = await Timetable.find(filter)
      .populate('subjectId')
      .populate('facultyAllocationId');

    const attendanceFilter = { tenantId: req.collegeId };
    if (req.query.department && req.query.department !== 'All') {
      attendanceFilter.department = req.query.department;
    }

    const todayAttendance = await Attendance.find(attendanceFilter);

    // Group by period/subject to determine completed vs pending
    const statusList = scheduledPeriods.map(p => {
      const isMarked = todayAttendance.some(a => {
        const matchesDate = a.attendanceDate && new Date(a.attendanceDate).toISOString().split('T')[0] === todayStr;
        const matchesSubject = a.subjectId === p.subjectId?._id?.toString() || a.subjectId === p.subjectId?.subjectName;
        return matchesDate && matchesSubject;
      });

      return {
        id: p._id,
        period: p.period,
        startTime: p.startTime,
        endTime: p.endTime,
        department: p.department,
        semester: p.semester,
        section: p.section,
        subject: p.subjectId?.subjectName || 'Subject',
        faculty: p.facultyAllocationId?.staffId?.name || p.createdBy || 'Assigned Faculty',
        roomNo: p.roomNo || 'Room 101',
        status: isMarked ? 'Completed' : 'Pending'
      };
    });

    const totalScheduled = statusList.length;
    const completedCount = statusList.filter(s => s.status === 'Completed').length;
    const pendingCount = totalScheduled - completedCount;

    res.json({
      date: todayStr,
      day: todayName,
      summary: {
        totalScheduled,
        completedCount,
        pendingCount,
        attendanceSubmitted: completedCount,
        attendancePending: pendingCount
      },
      classes: statusList
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
