import express from 'express';
import PeriodMaster from '../models/PeriodMaster.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 'COL002-8379189';
    let periods = await PeriodMaster.find({
      $or: [
        { collegeId: collegeId },
        { collegeId: { $exists: false } },
        { collegeId: null }
      ]
    }).sort({ startTime: 1 });

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
