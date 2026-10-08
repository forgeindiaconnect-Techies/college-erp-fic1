import express from 'express';
import mongoose from 'mongoose';
import Timetable from '../models/Timetable.js';
import FacultyAllocation from '../models/FacultyAllocation.js';
import Staff from '../models/Staff.js';
import Substitution from '../models/Substitution.js';
import ClassSession from '../models/ClassSession.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-schedule', protect, collegeScope, async (req, res) => {
  try {
    // 1. Find matching Staff documents for logged-in user
    const orConditions = [];
    if (req.user.referenceId) {
      orConditions.push({ id: req.user.referenceId });
      orConditions.push({ staffId: req.user.referenceId });
    }
    if (req.user.email) {
      orConditions.push({ email: req.user.email });
    }
    if (req.user.name && req.user.name.trim()) {
      orConditions.push({ name: new RegExp('^' + req.user.name.trim() + '$', 'i') });
    }

    let staffDocs = [];
    if (orConditions.length > 0) {
      staffDocs = await Staff.find({
        collegeId: req.collegeId,
        $or: orConditions
      });
    }

    const targetStaffIds = staffDocs.map(s => s._id);
    if (req.user.referenceId && mongoose.Types.ObjectId.isValid(req.user.referenceId)) {
      targetStaffIds.push(new mongoose.Types.ObjectId(req.user.referenceId));
    }
    if (req.user._id && mongoose.Types.ObjectId.isValid(req.user._id)) {
      targetStaffIds.push(new mongoose.Types.ObjectId(req.user._id));
    }

    if (targetStaffIds.length === 0) {
      return res.json([]);
    }

    // 2. Find Faculty Allocations
    const allocations = await FacultyAllocation.find({
      staffId: { $in: targetStaffIds }
    });

    const allocIds = allocations.map(a => a._id);
    if (allocIds.length === 0) {
      // Check for active substitutions before returning
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySubstitutions = await Substitution.find({
        collegeId: req.collegeId,
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

      const todaySessions = await ClassSession.find({
        collegeId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] },
        date: todayStr
      });

      const subArray = todaySubstitutions
        .filter(sub => sub.timetableId)
        .map(sub => {
          const sess = todaySessions.find(s => s.timetableId?.toString() === sub.timetableId._id?.toString());
          return {
            ...sub.timetableId.toObject(),
            isSubstitution: true,
            originalStaffName: sub.originalStaffId?.name,
            substituteStaffName: sub.substituteStaffId?.name,
            substitutionReason: sub.reason,
            session: sess ? {
              _id: sess._id,
              status: sess.status,
              startTime: sess.startTime,
              endTime: sess.endTime,
              attendanceSubmitted: sess.attendanceSubmitted || false
            } : null,
            status: sess ? sess.status : 'Pending'
          };
        });

      return res.json(subArray);
    }

    // 3. Find Regular Timetable slots
    let schedule = await Timetable.find({ 
      collegeId: req.collegeId, 
      facultyAllocationId: { $in: allocIds }
    })
    .populate('periodId')
    .populate('subjectId')
    .populate({
      path: 'facultyAllocationId',
      populate: [
        { path: 'staffId' },
        { path: 'subjectId' }
      ]
    })
    .sort({ day: 1 });

    // 4. Check for active substitutions where user is substitute staff TODAY
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySubstitutions = await Substitution.find({
      collegeId: req.collegeId,
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

    // Attach substituted slots to schedule if not already present
    const scheduleArray = schedule.map(s => s.toObject());

    for (const sub of todaySubstitutions) {
      if (sub.timetableId) {
        const slotObj = sub.timetableId;
        const exists = scheduleArray.some(s => s._id.toString() === slotObj._id.toString());
        if (!exists) {
          scheduleArray.push({
            ...slotObj,
            isSubstitution: true,
            originalStaffName: sub.originalStaffId?.name,
            substituteStaffName: sub.substituteStaffId?.name,
            substitutionReason: sub.reason
          });
        }
      }
    }

    // Attach real-time session status for today
    const todaySessions = await ClassSession.find({
      collegeId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] },
      date: todayStr
    });

    const enrichedSchedule = scheduleArray.map(slot => {
      const sess = todaySessions.find(s => s.timetableId?.toString() === slot._id.toString());
      return {
        ...slot,
        session: sess ? {
          _id: sess._id,
          status: sess.status,
          startTime: sess.startTime,
          endTime: sess.endTime,
          attendanceSubmitted: sess.attendanceSubmitted || false
        } : null,
        status: sess ? sess.status : 'Pending'
      };
    });
    
    res.json(enrichedSchedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const filter = { collegeId: req.collegeId };
    if (req.query.department && req.query.department !== 'All') {
      filter.department = new RegExp('^' + req.query.department.trim() + '$', 'i');
    }
    if (req.query.semester && req.query.semester !== 'All') filter.semester = req.query.semester;
    if (req.query.section && req.query.section !== 'All') filter.section = req.query.section;
    if (req.query.day && req.query.day !== 'All') filter.day = req.query.day;

    const timetables = await Timetable.find(filter)
      .populate('periodId')
      .populate('subjectId')
      .populate({
        path: 'facultyAllocationId',
        populate: [
          { path: 'staffId' },
          { path: 'subjectId' }
        ]
      })
      .sort({ day: 1 });

    const todayStr = new Date().toISOString().split('T')[0];
    const todaySessions = await ClassSession.find({
      collegeId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] },
      date: todayStr
    });

    const enrichedTimetables = timetables.map(t => {
      const tObj = t.toObject();
      const sess = todaySessions.find(s => s.timetableId?.toString() === tObj._id.toString());
      return {
        ...tObj,
        session: sess ? {
          _id: sess._id,
          status: sess.status,
          startTime: sess.startTime,
          endTime: sess.endTime,
          attendanceSubmitted: sess.attendanceSubmitted || false
        } : null,
        status: sess ? sess.status : 'Pending'
      };
    });
      
    res.json(enrichedTimetables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin', 'Sub Admin', 'Principal', 'HOD'), collegeScope, async (req, res) => {
  try {
    const { department, semester, section, day, periodId, subjectId, facultyAllocationId, roomNo } = req.body;

    // Auto-resolve Faculty Allocation
    let allocation = null;
    if (facultyAllocationId) {
      allocation = await FacultyAllocation.findById(facultyAllocationId);
    }

    if (!allocation) {
      allocation = await FacultyAllocation.findOne({
        $or: [
          { collegeId: req.collegeId },
          { collegeId: { $exists: false } },
          { collegeId: null }
        ],
        department,
        semester,
        section,
        subjectId
      });
    }

    if (!allocation) {
      allocation = await FacultyAllocation.findOne({
        department,
        semester,
        subjectId
      });
    }

    if (!allocation) {
      return res.status(400).json({ message: 'No faculty is allocated for this subject in the specified section/semester.' });
    }

    // Validation 1: Room Conflict (Same day, period, room)
    const roomConflict = await Timetable.findOne({
      collegeId: req.collegeId,
      day,
      periodId,
      roomNo
    });

    if (roomConflict) {
      return res.status(400).json({ message: `Room ${roomNo} is already occupied during this period on ${day}.` });
    }

    // Validation 2: Duplicate Section Period (Same dept, sem, sec, day, period)
    const sectionConflict = await Timetable.findOne({
      collegeId: req.collegeId,
      department,
      semester,
      section,
      day,
      periodId
    });

    if (sectionConflict) {
      return res.status(400).json({ message: `This section already has a class scheduled for this period on ${day}.` });
    }

    // Validation 3: Faculty Conflict (Same faculty teaching elsewhere)
    const concurrentClasses = await Timetable.find({
      collegeId: req.collegeId,
      day,
      periodId
    }).populate('facultyAllocationId');

    const facultyConflict = concurrentClasses.find(c => 
      c.facultyAllocationId && c.facultyAllocationId.staffId.toString() === allocation.staffId.toString()
    );

    if (facultyConflict) {
      return res.status(400).json({ message: 'The allocated faculty member is already teaching another class during this period.' });
    }

    const timetable = await Timetable.create({
      collegeId: req.collegeId,
      department: allocation.department,
      semester: allocation.semester,
      section: allocation.section,
      day,
      periodId,
      subjectId: allocation.subjectId,
      facultyAllocationId: allocation._id,
      roomNo,
      createdBy: req.user.name
    });

    const populated = await Timetable.findById(timetable._id)
      .populate('periodId')
      .populate('subjectId')
      .populate({
        path: 'facultyAllocationId',
        populate: [
          { path: 'staffId' },
          { path: 'subjectId' }
        ]
      });

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      try {
        await Timetable.collection.dropIndex('department_1_semester_1_collegeId_1');
      } catch (dropErr) {
        // index already dropped
      }
      return res.status(400).json({ message: 'A timetable slot already exists for this period. Please select a different period or day.' });
    }
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin', 'Sub Admin', 'Principal', 'HOD'), collegeScope, async (req, res) => {
  try {
    const timetable = await Timetable.findOneAndDelete({ _id: req.params.id, collegeId: req.collegeId });
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable slot not found' });
    }
    res.json({ message: 'Timetable slot removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
