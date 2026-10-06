import express from 'express';
import Expense from '../models/Expense.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const getCollegeId = (req) => {
  return (
    req.collegeId ||
    req.user?.tenantId ||
    req.user?.collegeId ||
    'unassigned_college'
  );
};

// Get all expenses
router.get('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const filter = {};
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [
        { collegeId: collegeId },
        { tenantId: collegeId }
      ];
    }
    const expenses = await Expense.find(filter).sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new expense
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const filter = {};
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [
        { collegeId: collegeId },
        { tenantId: collegeId }
      ];
    }
    const count = await Expense.countDocuments(filter);
    const newId = `EXP-${String(count + 1).padStart(3, '0')}`;
    
    const expense = new Expense({
      id: req.body.id || newId,
      title: req.body.title,
      category: req.body.category,
      amount: Number(req.body.amount) || 0,
      date: req.body.date,
      status: req.body.status || 'Pending',
      collegeId: collegeId,
      tenantId: collegeId
    });
    
    const savedExpense = await expense.save();
    req.app.get('io')?.emit('dataUpdated', { module: 'expenses', action: 'created' });
    res.status(201).json(savedExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update expense (e.g. mark as paid/pending)
router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const filter = {
      $or: [{ id: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$and = [
        { $or: [{ collegeId: collegeId }, { tenantId: collegeId }] }
      ];
    }

    const updateData = { ...req.body };
    if (collegeId && collegeId !== 'system') {
      updateData.collegeId = collegeId;
      updateData.tenantId = collegeId;
    }

    const updated = await Expense.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Expense not found' });
    req.app.get('io')?.emit('dataUpdated', { module: 'expenses', action: 'updated' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete expense
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = getCollegeId(req);
    const filter = {
      $or: [{ id: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }]
    };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$and = [
        { $or: [{ collegeId: collegeId }, { tenantId: collegeId }] }
      ];
    }

    const deleted = await Expense.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'Expense not found' });
    req.app.get('io')?.emit('dataUpdated', { module: 'expenses', action: 'deleted' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
