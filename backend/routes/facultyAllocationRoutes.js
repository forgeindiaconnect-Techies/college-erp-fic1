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
router.get(
  '/my-allocations',
  protect,
  authorize('Staff', 'HOD'),
  collegeScope,
  async (req, res) => {
    try {
      const collegeId = req.collegeId;
      const identityFilters = [];

      if (req.user?.email) {
        identityFilters.push({
          email: req.user.email
        });
      }

      if (req.user?.referenceId) {
        identityFilters.push({
          id: req.user.referenceId
        });
      }

      if (identityFilters.length === 0) {
        return res.status(400).json({
          message: 'Staff identity is not available'
        });
      }

      const staffDoc = await Staff.findOne({
        collegeId,
        $or: identityFilters
      });

      if (!staffDoc) {
        return res.status(404).json({
          message: 'Staff record not found'
        });
      }

      const allocations = await FacultyAllocation.find({
        collegeId,
        staffId: staffDoc._id,
        isActive: true
      })
        .populate('subjectId')
        .populate('academicYearId')
        .populate('regulationId');

      res.json(allocations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);



// Create an allocation
router.post('/', protect, authorize('SuperAdmin', 'CollegeAdmin', 'Admin', 'HOD'), collegeScope, async (req, res) => {
  try {
    const { department, semester, section, subjectId, staffId, academicYearId, regulationId, isActive, departmentId, courseId, semesterId, sectionId } = req.body;
    
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
      departmentId: departmentId || null,
      courseId: courseId || null,
      semesterId: semesterId || null,
      sectionId: sectionId || null,
      subjectId,
      staffId,
      academicYearId: academicYearId || null,
      regulationId: regulationId || null,
      isActive,
      assignedBy: req.user?.name || 'Admin'
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
