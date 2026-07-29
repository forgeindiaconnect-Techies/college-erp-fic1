import express from 'express';
import Department from '../models/Department.js';
import { protect, authorize, requirePermission, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all departments
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const departments = await Department.find({ collegeId: req.collegeId || 'unassigned_college' });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new department
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal'), requirePermission('view_departments'), collegeScope, async (req, res) => {
  const department = new Department({
    ...req.body,
    collegeId: req.collegeId || req.user.tenantId
  });
  try {
    const newDepartment = await department.save();
    req.app.get('io').emit('dataUpdated', { module: 'departments', action: 'created' });
    res.status(201).json(newDepartment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update department
router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal'), requirePermission('view_departments'), collegeScope, async (req, res) => {
  try {
    const updatedDepartment = await Department.findOneAndUpdate(
      { id: req.params.id, collegeId: req.collegeId || req.user.tenantId },
      req.body,
      { new: true }
    );
    req.app.get('io').emit('dataUpdated', { module: 'departments', action: 'updated' });
    res.json(updatedDepartment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete department
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal'), requirePermission('view_departments'), collegeScope, async (req, res) => {
  try {
    await Department.findOneAndDelete({ id: req.params.id, collegeId: req.collegeId || req.user.tenantId });
    req.app.get('io').emit('dataUpdated', { module: 'departments', action: 'deleted' });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
