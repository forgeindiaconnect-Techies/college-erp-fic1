import express from 'express';
import FacultyAllocation from '../models/FacultyAllocation.js';
import Subject from '../models/Subject.js';
import Staff from '../models/Staff.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all faculty allocations
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const filter = { collegeId: req.collegeId };
    if (req.query.department && req.query.department !== 'All') {
      filter.department = req.query.department;
    }
    if (req.query.staffId) {
      filter.staffId = req.query.staffId;
    }
    
    const allocations = await FacultyAllocation.find(filter)
      .populate('subjectId')
      .populate('staffId')
      .populate('academicYearId')
      .populate('regulationId')
      .sort({ createdAt: -1 });
      
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get staff's own allocations
router.get('/my-allocations', protect, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.tenantId;
    
    // Find the Staff document by email (most reliable method)
    let staffDoc = await Staff.findOne({ email: req.user.email });
    
    // Fallback: find by staffId field (string like STF002)
    if (!staffDoc && req.user.referenceId) {
      staffDoc = await Staff.findOne({ staffId: req.user.referenceId });
    }

    if (!staffDoc) {
      return res.status(404).json({ message: 'Staff record not found' });
    }

    const filter = { staffId: staffDoc._id, isActive: true };
    if (collegeId) filter.collegeId = collegeId;

    const allocations = await FacultyAllocation.find(filter)
      .populate('subjectId')
      .populate('academicYearId')
      .populate('regulationId');

    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Create an allocation
router.post('/', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const { department, semester, section, subjectId, staffId, academicYearId, regulationId, isActive } = req.body;
    
    // Check if subject/section is already assigned
    const existing = await FacultyAllocation.findOne({
      collegeId: req.collegeId,
      department,
      semester,
      section,
      subjectId
    });

    if (existing) {
      return res.status(400).json({ message: 'This subject is already assigned for this section and semester.' });
    }

    const allocation = await FacultyAllocation.create({
      collegeId: req.collegeId,
      department,
      semester,
      section,
      subjectId,
      staffId,
      academicYearId,
      regulationId,
      isActive,
      assignedBy: req.user.name
    });

    const populated = await FacultyAllocation.findById(allocation._id)
      .populate('subjectId')
      .populate('staffId');

    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete an allocation
router.delete('/:id', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin', 'HOD'), async (req, res) => {
  try {
    const allocation = await FacultyAllocation.findOneAndDelete({ _id: req.params.id, collegeId: req.collegeId });
    if (!allocation) {
      return res.status(404).json({ message: 'Allocation not found' });
    }
    res.json({ message: 'Allocation removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
