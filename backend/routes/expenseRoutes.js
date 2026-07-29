import express from 'express';
import Expense from '../models/Expense.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all expenses
router.get('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new expense
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    // Generate an ID like EXP-001
    const count = await Expense.countDocuments();
    const newId = `EXP-${String(count + 1).padStart(3, '0')}`;
    
    const expense = new Expense({
      id: newId,
      title: req.body.title,
      category: req.body.category,
      amount: req.body.amount,
      date: req.body.date,
      status: req.body.status
    });
    
    const savedExpense = await expense.save();
    req.app.get('io').emit('dataUpdated', { module: 'expenses', action: 'created' });
    res.status(201).json(savedExpense);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update expense (e.g. mark as paid/pending)
router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const updated = await Expense.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Expense not found' });
    req.app.get('io').emit('dataUpdated', { module: 'expenses', action: 'updated' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete expense
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    await Expense.findOneAndDelete({ id: req.params.id });
    req.app.get('io').emit('dataUpdated', { module: 'expenses', action: 'deleted' });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
