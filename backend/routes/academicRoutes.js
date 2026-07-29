import express from 'express';
import AcademicYear from '../models/AcademicYear.js';
import Regulation from '../models/Regulation.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all Academic Years
router.get('/years', protect, collegeScope, async (req, res) => {
  try {
    const years = await AcademicYear.find({ collegeId: req.collegeId }).sort({ year: -1 });
    res.json(years);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Academic Year
router.post('/years', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin'), collegeScope, async (req, res) => {
  try {
    const { year, isActive } = req.body;
    const newYear = await AcademicYear.create({
      collegeId: req.collegeId,
      year,
      isActive
    });
    res.status(201).json(newYear);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all Regulations
router.get('/regulations', protect, collegeScope, async (req, res) => {
  try {
    const filter = { collegeId: req.collegeId };
    if (req.query.academicYearId) filter.academicYearId = req.query.academicYearId;
    
    const regulations = await Regulation.find(filter).populate('academicYearId').sort({ regulationName: -1 });
    res.json(regulations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Regulation
router.post('/regulations', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin'), collegeScope, async (req, res) => {
  try {
    const { regulationName, academicYearId, isActive } = req.body;
    const newReg = await Regulation.create({
      collegeId: req.collegeId,
      regulationName,
      academicYearId,
      isActive
    });
    const populated = await newReg.populate('academicYearId');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
