import express from 'express';
import Salary from '../models/Salary.js';
import User from '../models/User.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Compute net salary before inserting/updating
const processPayload = (data) => {
  const basic = Number(data.basicPay) || 0;
  const hra = Number(data.hra) || 0;
  const medical = Number(data.medicalAllowance) || 0;
  const special = Number(data.specialAllowance) || 0;
  
  const working = Number(data.workingDays) || 30;
  const present = Number(data.presentDays) || 30;
  const deductions = Number(data.deductions) || 0;
  
  const attendanceDeduction = working > 0 ? (basic * ((working - present) / working)) : 0;
  const totalEarnings = basic + hra + medical + special;
  const totalDeductions = deductions + attendanceDeduction;
  
  return { 
    ...data, 
    basicPay: basic, 
    hra, 
    medicalAllowance: medical, 
    specialAllowance: special,
    workingDays: working, 
    presentDays: present, 
    deductions, 
    netSalary: Math.round(totalEarnings - totalDeductions) 
  };
};

const notifyStaffSalary = async (req, salaryRecord) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 'unassigned_college';
    let staffUser = await User.findOne({ referenceId: salaryRecord.staffId });
    if (!staffUser && salaryRecord.staffEmail) {
      staffUser = await User.findOne({ email: salaryRecord.staffEmail });
    }
    if (staffUser) {
      await sendNotification(req, {
        receiverId: staffUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'Salary Slip Processed',
        message: `Your salary for ${salaryRecord.month || 'the current period'} (Net: ₹${salaryRecord.netSalary}) is ${salaryRecord.status || 'Processed'}.`,
        category: 'system',
        type: 'Success'
      });
    }
  } catch (e) {
    console.error('Failed to notify staff about salary:', e);
  }
};

// GET all salaries — Admin, Principal, Accounts
router.get('/', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = {};
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [{ collegeId }, { tenantId: collegeId }];
    }
    const salaries = await Salary.find(filter).sort({ createdAt: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET salaries for a specific staff member
router.get('/staff/:staffId', protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { staffId: req.params.staffId };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$and = [{ $or: [{ collegeId }, { tenantId: collegeId }] }, { staffId: req.params.staffId }];
      delete filter.staffId;
    }
    const salaries = await Salary.find(filter).sort({ createdAt: -1 });
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — Create new payroll record
router.post('/', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'unassigned_college';
    if (Array.isArray(req.body)) {
      const docs = req.body.map(item => ({
        ...processPayload(item),
        collegeId,
        tenantId: collegeId
      }));
      const created = await Salary.insertMany(docs);
      for (const rec of created) {
        await notifyStaffSalary(req, rec);
      }
      req.app.get('io')?.emit('dataUpdated', { module: 'salaries', action: 'created' });
      return res.status(201).json(created);
    }
    const salary = new Salary({
      ...processPayload(req.body),
      collegeId,
      tenantId: collegeId
    });
    const saved = await salary.save();
    await notifyStaffSalary(req, saved);
    req.app.get('io')?.emit('dataUpdated', { module: 'salaries', action: 'created' });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT — Update salary record (e.g. Disburse)
router.put('/:id', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { _id: req.params.id };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [{ collegeId }, { tenantId: collegeId }];
    }
    const payload = processPayload(req.body);
    if (req.body.status === 'Disbursed' && !payload.paymentDate) {
      payload.paymentDate = new Date();
    }
    const updated = await Salary.findOneAndUpdate(filter, payload, { new: true });
    if (updated) {
      await notifyStaffSalary(req, updated);
    }
    req.app.get('io')?.emit('dataUpdated', { module: 'salaries', action: 'updated' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE — Remove payroll record
router.delete('/:id', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { _id: req.params.id };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$or = [{ collegeId }, { tenantId: collegeId }];
    }
    await Salary.findOneAndDelete(filter);
    req.app.get('io')?.emit('dataUpdated', { module: 'salaries', action: 'deleted' });
    res.json({ message: 'Salary record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
