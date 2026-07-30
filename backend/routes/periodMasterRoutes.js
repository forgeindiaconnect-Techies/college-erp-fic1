import express from 'express';
import PeriodMaster from '../models/PeriodMaster.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  timeStr = timeStr.trim();
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = timeStr.match(/^(\d+):(\d+)$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }
  return 0;
};

router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 'COL002-8379189';
    let periods = await PeriodMaster.find({
      $or: [
        { collegeId: collegeId },
        { collegeId: { $exists: false } },
        { collegeId: null }
      ]
    });

    if (!periods || periods.length === 0) {
      const defaultPeriods = [
        { periodName: 'Period 1', startTime: '09:00 AM', endTime: '09:50 AM', isBreak: false, isActive: true, collegeId },
        { periodName: 'Period 2', startTime: '10:00 AM', endTime: '10:50 AM', isBreak: false, isActive: true, collegeId },
        { periodName: 'Period 3', startTime: '11:00 AM', endTime: '11:50 AM', isBreak: false, isActive: true, collegeId },
        { periodName: 'Lunch Break', startTime: '11:50 AM', endTime: '12:50 PM', isBreak: true, isActive: true, collegeId },
        { periodName: 'Period 4', startTime: '12:50 PM', endTime: '01:40 PM', isBreak: false, isActive: true, collegeId },
        { periodName: 'Period 5', startTime: '01:45 PM', endTime: '02:35 PM', isBreak: false, isActive: true, collegeId },
        { periodName: 'Period 6', startTime: '02:40 PM', endTime: '03:30 PM', isBreak: false, isActive: true, collegeId }
      ];
      periods = await PeriodMaster.insertMany(defaultPeriods);
    }

    periods = periods.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
    res.json(periods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, authorize('Admin', 'Super Admin', 'SuperAdmin', 'CollegeAdmin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 'COL002-8379189';
    const period = await PeriodMaster.create({ ...req.body, collegeId });
    res.status(201).json(period);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('Admin', 'Super Admin', 'SuperAdmin', 'CollegeAdmin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const period = await PeriodMaster.findOneAndDelete({ _id: req.params.id });
    if (!period) return res.status(404).json({ message: 'Period not found' });
    res.json({ message: 'Period removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
