import express from 'express';
import ClassAdvisor from '../models/ClassAdvisor.js';
import Staff from '../models/Staff.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all Class Advisors (Admin)
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const filter = { collegeId: req.collegeId };
    
    // Optional filtering
    if (req.query.department) filter.department = req.query.department;
    if (req.query.semester) filter.semester = req.query.semester;
    
    const advisors = await ClassAdvisor.find(filter)
      .populate('staffId', 'name email designation phone')
      .sort({ department: 1, semester: 1, section: 1 });
      
    res.json(advisors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching class advisors' });
  }
});

// Get My Class (For Staff)
router.get('/my-class', protect, collegeScope, async (req, res) => {
  try {
    // Find staff document first based on req.user.email
    const staff = await Staff.findOne({ 
      collegeId: req.collegeId, 
      email: req.user.email 
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff profile not found' });
    }

    const advisor = await ClassAdvisor.findOne({
      collegeId: req.collegeId,
      staffId: staff._id,
      isActive: true
    }).populate('staffId', 'name email designation phone');

    if (!advisor) {
      return res.status(200).json({ data: null, isAdvisor: false });
    }

    res.json({ data: advisor, isAdvisor: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error checking advisor status' });
  }
});

// Get Class Advisor info (For Student/Parent)
router.get('/class/:department/:semester/:section', protect, collegeScope, async (req, res) => {
  try {
    const { department, semester, section } = req.params;
    
    const advisor = await ClassAdvisor.findOne({
      collegeId: req.collegeId,
      department,
      semester,
      section,
      isActive: true
    }).populate('staffId', 'name email phone cabin room');

    res.json(advisor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching advisor info' });
  }
});

// Create or update Class Advisor (Admin)
router.post('/', protect, authorize('Admin', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const { department, semester, section, staffId, academicYear } = req.body;

    if (!department || !semester || !section || !staffId) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if staff exists
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Upsert logic (only one advisor per class)
    const updatedAdvisor = await ClassAdvisor.findOneAndUpdate(
      { 
        collegeId: req.collegeId,
        department,
        semester,
        section
      },
      { 
        staffId,
        academicYear: academicYear || '2026-2027',
        isActive: true,
        createdBy: req.user.name
      },
      { new: true, upsert: true } // Create if doesn't exist, update if it does
    ).populate('staffId', 'name email');

    res.status(201).json(updatedAdvisor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error assigning class advisor' });
  }
});

// Delete Class Advisor
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const advisor = await ClassAdvisor.findOne({ _id: req.params.id, collegeId: req.collegeId });
    if (!advisor) {
      return res.status(404).json({ message: 'Class Advisor allocation not found' });
    }

    await advisor.deleteOne();
    res.json({ message: 'Class Advisor allocation removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error removing class advisor' });
  }
});

export default router;
