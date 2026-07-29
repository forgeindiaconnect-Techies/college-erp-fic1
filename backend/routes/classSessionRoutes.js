import express from 'express';
import mongoose from 'mongoose';
import ClassSession from '../models/ClassSession.js';
import Timetable from '../models/Timetable.js';
import Substitution from '../models/Substitution.js';
import Staff from '../models/Staff.js';
import Student from '../models/Student.js';
import Notification from '../models/Notification.js';
import PeriodMaster from '../models/PeriodMaster.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const getTodayString = () => new Date().toISOString().split('T')[0];

const getDayName = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const d = new Date(dateStr);
  return days[d.getDay()];
};

// GET /api/class-sessions/staff-today - Staff Today's Classes with Live Statuses
router.get('/staff-today', protect, collegeScope, async (req, res) => {
  try {
    const todayDate = getTodayString();
    const dayName = getDayName(todayDate);

    // 1. Resolve Staff IDs for logged-in user
    const staffDocs = await Staff.find({
      $or: [
        { id: req.user.referenceId },
        { staffId: req.user.referenceId },
        { email: req.user.email },
        { name: new RegExp('^' + (req.user.name || '').trim() + '$', 'i') }
      ]
    });

    const targetStaffIds = staffDocs.map(s => s._id);
    if (req.user.referenceId && mongoose.Types.ObjectId.isValid(req.user.referenceId)) {
      targetStaffIds.push(new mongoose.Types.ObjectId(req.user.referenceId));
    }
    if (req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      targetStaffIds.push(new mongoose.Types.ObjectId(req.user._id));
    }

    // 2. Query today's regular timetables for dayName
    const regularSlots = await Timetable.find({
      collegeId: req.collegeId,
      day: dayName
    })
    .populate('periodId')
    .populate('subjectId')
    .populate({
      path: 'facultyAllocationId',
      populate: { path: 'staffId' }
    });

    // Filter slots assigned to target staff
    const staffSlots = regularSlots.filter(s => 
      s.facultyAllocationId && s.facultyAllocationId.staffId && 
      targetStaffIds.some(ts => ts.toString() === s.facultyAllocationId.staffId._id.toString())
    );

    // 3. Query active substitutions for today where staff is substitute
    const todaySubs = await Substitution.find({
      collegeId: req.collegeId,
      date: todayDate,
      substituteStaffId: { $in: targetStaffIds },
      status: 'Active'
    })
    .populate('periodId')
    .populate({
      path: 'timetableId',
      populate: ['subjectId']
    })
    .populate('originalStaffId')
    .populate('substituteStaffId');

    // 4. Merge schedule items
    const combinedSlots = staffSlots.map(s => s.toObject());

    for (const sub of todaySubs) {
      if (sub.timetableId) {
        const slotObj = sub.timetableId;
        const exists = combinedSlots.some(s => s._id.toString() === slotObj._id.toString());
        if (!exists) {
          combinedSlots.push({
            ...slotObj,
            isSubstitution: true,
            originalStaffName: sub.originalStaffId?.name,
            substituteStaffName: sub.substituteStaffId?.name
          });
        }
      }
    }

    // 5. Query existing ClassSession documents for today
    const sessionDocs = await ClassSession.find({
      collegeId: req.collegeId,
      date: todayDate
    });

    // Attach session status to each slot
    const resultSchedule = combinedSlots.map(slot => {
      const activeSession = sessionDocs.find(sess => sess.timetableId.toString() === slot._id.toString());
      return {
        ...slot,
        session: activeSession || null,
        status: activeSession ? activeSession.status : 'Pending',
        attendanceSubmitted: activeSession ? activeSession.attendanceSubmitted : false,
        notes: activeSession ? activeSession.notes : []
      };
    });

    res.json(resultSchedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/class-sessions/start - Start Live Class Session
router.post('/start', protect, collegeScope, async (req, res) => {
  try {
    const { timetableId } = req.body;
    if (!timetableId) {
      return res.status(400).json({ message: 'Timetable ID is required.' });
    }

    const todayDate = getTodayString();
    const slot = await Timetable.findById(timetableId)
      .populate('periodId')
      .populate('subjectId')
      .populate({ path: 'facultyAllocationId', populate: { path: 'staffId' } });

    if (!slot) {
      return res.status(404).json({ message: 'Timetable slot not found.' });
    }

    const facultyId = slot.facultyAllocationId?.staffId?._id || req.user._id;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let session = await ClassSession.findOne({
      collegeId: req.collegeId,
      timetableId,
      date: todayDate
    });

    if (!session) {
      session = await ClassSession.create({
        collegeId: req.collegeId,
        department: slot.department,
        semester: slot.semester,
        section: slot.section,
        day: slot.day,
        periodId: slot.periodId._id || slot.periodId,
        subjectId: slot.subjectId._id || slot.subjectId,
        facultyId,
        timetableId: slot._id,
        roomNo: slot.roomNo || 'Room 201',
        date: todayDate,
        startTime: nowTime,
        status: 'Live'
      });
    } else {
      session.status = 'Live';
      session.startTime = session.startTime || nowTime;
      await session.save();
    }

    const populatedSession = await ClassSession.findById(session._id)
      .populate('periodId')
      .populate('subjectId')
      .populate('facultyId');

    // Notify enrolled students in this department/semester/section
    const studentList = await Student.find({
      collegeId: req.collegeId,
      department: slot.department,
      semester: slot.semester
    });

    const subjectName = slot.subjectId?.subjectName || 'Subject';
    const facultyName = slot.facultyAllocationId?.staffId?.name || req.user.name;

    const notifDocs = studentList.map(st => ({
      userId: st._id,
      title: `🟢 Live Class Started: ${subjectName}`,
      message: `${facultyName} has started ${subjectName} in ${slot.roomNo || 'Room 201'} (${slot.periodId?.startTime || ''}).`,
      type: 'Academic',
      read: false
    }));

    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs).catch(() => {});
    }

    // Broadcast WebSocket event if io app is set
    const io = req.app.get('io');
    if (io) {
      io.emit('class_started', {
        department: slot.department,
        semester: slot.semester,
        section: slot.section,
        subject: subjectName,
        faculty: facultyName,
        roomNo: slot.roomNo,
        session: populatedSession
      });
    }

    res.status(201).json(populatedSession);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/class-sessions/end/:id - End Live Class Session
router.post('/end/:id', protect, collegeScope, async (req, res) => {
  try {
    const session = await ClassSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Class session not found.' });
    }

    const endTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    session.status = 'Completed';
    session.endTime = endTime;
    session.durationMinutes = 50; // Standard period duration
    await session.save();

    res.json({ message: 'Class session completed successfully.', session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/class-sessions/:id/notes - Upload Notes / Class Materials
router.post('/:id/notes', protect, collegeScope, async (req, res) => {
  try {
    const { title, fileUrl } = req.body;
    if (!title || !fileUrl) {
      return res.status(400).json({ message: 'Title and document link are required.' });
    }

    const session = await ClassSession.findById(req.params.id).populate('subjectId');
    if (!session) {
      return res.status(404).json({ message: 'Class session not found.' });
    }

    session.notes.push({ title, fileUrl, uploadedAt: new Date() });
    await session.save();

    // Notify students
    const studentList = await Student.find({
      collegeId: req.collegeId,
      department: session.department,
      semester: session.semester
    });

    const subjectName = session.subjectId?.subjectName || 'Subject';

    const notifDocs = studentList.map(st => ({
      userId: st._id,
      title: `📚 New Notes Uploaded: ${subjectName}`,
      message: `New class notes ("${title}") uploaded for ${subjectName}.`,
      type: 'Academic',
      read: false
    }));

    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs).catch(() => {});
    }

    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/class-sessions/student-live - Active Live Class & Notes for Enrolled Student
router.get('/student-live', protect, collegeScope, async (req, res) => {
  try {
    const todayDate = getTodayString();
    
    // Find live sessions for student's department & semester
    const liveSessions = await ClassSession.find({
      collegeId: req.collegeId,
      date: todayDate,
      status: 'Live'
    })
    .populate('periodId')
    .populate('subjectId')
    .populate('facultyId');

    // Also get all completed sessions for today to fetch uploaded notes
    const todaySessions = await ClassSession.find({
      collegeId: req.collegeId,
      date: todayDate
    })
    .populate('subjectId')
    .populate('facultyId');

    const todayMaterials = [];
    todaySessions.forEach(sess => {
      if (sess.notes && sess.notes.length > 0) {
        sess.notes.forEach(note => {
          todayMaterials.push({
            subjectName: sess.subjectId?.subjectName || 'Subject',
            facultyName: sess.facultyId?.name || 'Faculty',
            title: note.title,
            fileUrl: note.fileUrl,
            uploadedAt: note.uploadedAt
          });
        });
      }
    });

    res.json({
      activeLive: liveSessions.length > 0 ? liveSessions[0] : null,
      materials: todayMaterials
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/class-sessions/hod-monitoring - HOD Department Today's Execution Table
router.get('/hod-monitoring', protect, authorize('SuperAdmin', 'CollegeAdmin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const todayDate = getTodayString();
    const dayName = getDayName(todayDate);
    const department = req.query.department;

    const filter = { collegeId: req.collegeId, day: dayName };
    if (department) filter.department = department;

    const totalSlots = await Timetable.find(filter)
      .populate('periodId')
      .populate('subjectId')
      .populate({
        path: 'facultyAllocationId',
        populate: { path: 'staffId' }
      });

    const activeSessions = await ClassSession.find({
      collegeId: req.collegeId,
      date: todayDate
    });

    const activeSubstitutions = await Substitution.find({
      collegeId: req.collegeId,
      date: todayDate,
      status: 'Active'
    }).populate('substituteStaffId');

    const monitoringList = totalSlots.map(slot => {
      const sess = activeSessions.find(s => s.timetableId.toString() === slot._id.toString());
      const sub = activeSubstitutions.find(s => s.timetableId.toString() === slot._id.toString());

      return {
        _id: slot._id,
        periodName: formatPeriodName(slot.periodId),
        timeRange: slot.periodId ? `${slot.periodId.startTime} - ${slot.periodId.endTime}` : '09:00 - 09:50',
        subjectName: slot.subjectId?.subjectName || 'Subject',
        regularFaculty: slot.facultyAllocationId?.staffId?.name || 'Faculty',
        actualFaculty: sub ? sub.substituteStaffId?.name : (slot.facultyAllocationId?.staffId?.name || 'Faculty'),
        isSubstitution: !!sub,
        roomNo: slot.roomNo || 'Room 201',
        status: sess ? sess.status : 'Pending',
        attendanceSubmitted: sess ? sess.attendanceSubmitted : false
      };
    });

    res.json(monitoringList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/class-sessions/principal-summary - Executive Today Summary for Principal
router.get('/principal-summary', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Principal'), collegeScope, async (req, res) => {
  try {
    const todayDate = getTodayString();
    const dayName = getDayName(todayDate);

    const totalScheduled = await Timetable.countDocuments({ collegeId: req.collegeId, day: dayName });
    const todaySessions = await ClassSession.find({ collegeId: req.collegeId, date: todayDate });

    const completedCount = todaySessions.filter(s => s.status === 'Completed').length;
    const runningCount = todaySessions.filter(s => s.status === 'Live').length;
    const pendingCount = Math.max(0, totalScheduled - completedCount - runningCount);
    const attendanceSubmittedCount = todaySessions.filter(s => s.attendanceSubmitted).length;
    const pendingAttendanceCount = Math.max(0, totalScheduled - attendanceSubmittedCount);

    res.json({
      scheduled: totalScheduled,
      completed: completedCount,
      running: runningCount,
      pending: pendingCount,
      attendanceSubmitted: attendanceSubmittedCount,
      pendingAttendance: pendingAttendanceCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const formatPeriodName = (period) => {
  if (!period) return 'Period 1';
  const name = typeof period === 'string' ? period.trim() : (period.periodName || '').trim();
  if (period.isBreak || name.toLowerCase().includes('break') || name.toLowerCase().includes('lunch')) {
    return name;
  }
  return name.toLowerCase().includes('period') ? name : `Period ${name}`;
};

export default router;
