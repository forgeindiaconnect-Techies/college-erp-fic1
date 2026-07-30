import express from 'express';
import Subject from '../models/Subject.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all subjects (optionally filtered by department and semester)
router.get('/', protect, collegeScope, async (req, res) => {
  const { dept, sem } = req.query;
  const filter = {};
  
  if (req.collegeId) filter.collegeId = req.collegeId;
  if (dept) filter.department = dept;
  if (sem) filter.semester = sem;

  try {
    const subjects = await Subject.find(filter);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new subject
router.post('/', protect, authorize('Admin', 'Super Admin', 'HOD', 'Principal', 'Sub Admin'), collegeScope, async (req, res) => {
  try {
    const bodyData = { ...req.body };
    if (bodyData.regulationId === '') {
      bodyData.regulationId = null;
    }
    const newSubject = new Subject({ ...bodyData, collegeId: req.collegeId });
    const savedSubject = await newSubject.save();
    res.status(201).json(savedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a subject
router.put('/:id', protect, authorize('Admin', 'Super Admin', 'HOD', 'Principal', 'Sub Admin'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.collegeId) filter.collegeId = req.collegeId;

    const bodyData = { ...req.body };
    if (bodyData.regulationId === '') {
      bodyData.regulationId = null;
    }

    const updatedSubject = await Subject.findOneAndUpdate(
      filter,
      bodyData,
      { new: true, runValidators: true }
    );
    if (!updatedSubject) return res.status(404).json({ message: 'Subject not found' });
    res.json(updatedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a subject
router.delete('/:id', protect, authorize('Admin', 'Super Admin', 'HOD', 'Principal', 'Sub Admin'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.collegeId) filter.collegeId = req.collegeId;

    const deletedSubject = await Subject.findOneAndDelete(filter);
    if (!deletedSubject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
