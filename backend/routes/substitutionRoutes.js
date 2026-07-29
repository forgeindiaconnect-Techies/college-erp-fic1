import express from 'express';
import mongoose from 'mongoose';
import Substitution from '../models/Substitution.js';
import Timetable from '../models/Timetable.js';
import Staff from '../models/Staff.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/substitutions - Create a faculty substitution
router.post('/', protect, authorize('SuperAdmin', 'CollegeAdmin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const { timetableId, substituteStaffId, date, reason } = req.body;

    if (!timetableId || !substituteStaffId || !date) {
      return res.status(400).json({ message: 'Timetable slot, substitute faculty, and date are required.' });
    }

    const slot = await Timetable.findById(timetableId).populate('facultyAllocationId');
    if (!slot) {
      return res.status(404).json({ message: 'Timetable slot not found.' });
    }

    const originalStaffId = slot.facultyAllocationId?.staffId;
    if (!originalStaffId) {
      return res.status(400).json({ message: 'Original allocated faculty not found on this slot.' });
    }

    if (originalStaffId.toString() === substituteStaffId.toString()) {
      return res.status(400).json({ message: 'Substitute faculty cannot be the same as original faculty.' });
    }

    // Determine day of week from date
    const dateObj = new Date(date);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateObj.getDay()];

    // Conflict Check 1: Check if substitute staff is ALREADY substituting elsewhere at this date/period
    const existingSub = await Substitution.findOne({
      collegeId: req.collegeId,
      date,
      periodId: slot.periodId,
      substituteStaffId,
      status: 'Active'
    });

    if (existingSub) {
      return res.status(400).json({ message: 'Substitute faculty is already assigned to another substitution during this period.' });
    }

    // Conflict Check 2: Check if substitute staff has their OWN regular class scheduled at this period & day
    const regularClasses = await Timetable.find({
      collegeId: req.collegeId,
      day: slot.day || dayName,
      periodId: slot.periodId
    }).populate('facultyAllocationId');

    const hasRegularClass = regularClasses.some(c => 
      c.facultyAllocationId && c.facultyAllocationId.staffId.toString() === substituteStaffId.toString()
    );

    if (hasRegularClass) {
      return res.status(400).json({ message: 'Substitute faculty already has a regular class scheduled during this period.' });
    }

    // Upsert substitution
    const substitution = await Substitution.findOneAndUpdate(
      { collegeId: req.collegeId, timetableId, date },
      {
        collegeId: req.collegeId,
        department: slot.department,
        date,
        day: slot.day || dayName,
        periodId: slot.periodId,
        timetableId: slot._id,
        originalStaffId,
        substituteStaffId,
        reason: reason || 'Faculty on Leave',
        status: 'Active',
        createdBy: req.user.name
      },
      { upsert: true, new: true }
    )
    .populate('periodId')
    .populate('timetableId')
    .populate('originalStaffId')
    .populate('substituteStaffId');

    res.status(201).json(substitution);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/substitutions - List active substitutions
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const filter = { collegeId: req.collegeId, status: 'Active' };
    if (req.query.department) filter.department = req.query.department;
    if (req.query.date) filter.date = req.query.date;

    const substitutions = await Substitution.find(filter)
      .populate('periodId')
      .populate({
        path: 'timetableId',
        populate: ['subjectId']
      })
      .populate('originalStaffId')
      .populate('substituteStaffId')
      .sort({ date: -1 });

    res.json(substitutions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/substitutions/:id - Cancel substitution
router.delete('/:id', protect, authorize('SuperAdmin', 'CollegeAdmin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const sub = await Substitution.findOneAndDelete({ _id: req.params.id, collegeId: req.collegeId });
    if (!sub) {
      return res.status(404).json({ message: 'Substitution not found.' });
    }
    res.json({ message: 'Substitution cancelled.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
