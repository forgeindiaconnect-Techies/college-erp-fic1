import express from 'express';
import Subject from '../models/Subject.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all subjects (optionally filtered by department and semester)
router.get('/', protect, collegeScope, async (req, res) => {
  const { dept, sem, department, semester } = req.query;
  const filter = {};
  
  const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
  if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
    filter.$or = [{ collegeId }, { tenantId: collegeId }];
  }
  
  const targetDept = dept || department;
  if (targetDept) {
    const deptRegex = new RegExp(`^${String(targetDept).trim()}$`, 'i');
    const deptFilter = { $or: [{ department: deptRegex }, { dept: deptRegex }] };
    if (filter.$or) filter.$and = [{ $or: filter.$or }, deptFilter];
    else Object.assign(filter, deptFilter);
  }
  
  const targetSem = sem || semester;
  if (targetSem) {
    filter.semester = targetSem;
  }

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
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'unassigned_college';
    const bodyData = { ...req.body };
    if (bodyData.regulationId === '') {
      bodyData.regulationId = null;
    }
    const newSubject = new Subject({
      ...bodyData,
      collegeId,
      tenantId: collegeId
    });
    const savedSubject = await newSubject.save();
    req.app.get('io')?.emit('dataUpdated', { module: 'subjects', action: 'created' });
    res.status(201).json(savedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a subject
router.put('/:id', protect, authorize('Admin', 'Super Admin', 'HOD', 'Principal', 'Sub Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { _id: req.params.id };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [{ collegeId }, { tenantId: collegeId }];
    }

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
    req.app.get('io')?.emit('dataUpdated', { module: 'subjects', action: 'updated' });
    res.json(updatedSubject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a subject
router.delete('/:id', protect, authorize('Admin', 'Super Admin', 'HOD', 'Principal', 'Sub Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { _id: req.params.id };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [{ collegeId }, { tenantId: collegeId }];
    }

    const deletedSubject = await Subject.findOneAndDelete(filter);
    if (!deletedSubject) return res.status(404).json({ message: 'Subject not found' });
    req.app.get('io')?.emit('dataUpdated', { module: 'subjects', action: 'deleted' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
