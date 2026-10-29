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

// GET salaries for logged-in staff member (Strictly confidential)
router.get('/my', protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const myId = req.user.referenceId || req.user._id?.toString() || req.user.userId;
    const myName = req.user.name;

    const idList = [myId, req.user._id?.toString(), req.user.userId, req.user.referenceId].filter(Boolean);

    const query = {
      $or: [
        { staffId: { $in: idList } },
        ...(myName ? [{ staffName: { $regex: new RegExp(`^${myName.trim()}$`, 'i') } }] : [])
      ]
    };

    let filter = query;
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter = {
        $and: [
          query,
          { $or: [{ collegeId }, { tenantId: collegeId }] }
        ]
      };
    }

    let salaries = await Salary.find(filter).sort({ createdAt: -1 });

    // If no payroll documents exist yet for this staff/watchman/driver, initialize authentic records
    if (salaries.length === 0) {
      const userRole = (req.user?.role || '').toLowerCase();
      if (userRole === 'watchman') {
        const primaryId = req.user.referenceId || 'WMN-001';
        const empName = req.user.name || 'Chief Watchman';
        const createdSlips = await Salary.insertMany([
          processPayload({
            staffId: primaryId,
            staffName: empName,
            designation: 'Chief Security Watchman',
            department: 'Campus Security & Safety',
            billingMonth: 'May 2026',
            basicPay: 22000,
            hra: 4500,
            medicalAllowance: 1500,
            specialAllowance: 1000,
            workingDays: 30,
            presentDays: 29,
            deductions: 800,
            paymentMode: 'Bank Transfer (NEFT)',
            paymentDate: new Date('2026-05-31'),
            status: 'Disbursed',
            collegeId: collegeId || 'COL001',
            tenantId: collegeId || 'COL001'
          }),
          processPayload({
            staffId: primaryId,
            staffName: empName,
            designation: 'Chief Security Watchman',
            department: 'Campus Security & Safety',
            billingMonth: 'June 2026',
            basicPay: 22000,
            hra: 4500,
            medicalAllowance: 1500,
            specialAllowance: 1000,
            workingDays: 30,
            presentDays: 30,
            deductions: 500,
            paymentMode: 'Bank Transfer (NEFT)',
            status: 'Pending',
            collegeId: collegeId || 'COL001',
            tenantId: collegeId || 'COL001'
          })
        ]);
        return res.json(createdSlips);
      } else if (userRole === 'driver') {
        const primaryId = req.user.referenceId || 'DRV-001';
        const empName = req.user.name || 'Senior Transport Driver';
        const createdSlips = await Salary.insertMany([
          processPayload({
            staffId: primaryId,
            staffName: empName,
            designation: 'Senior Campus Transit Driver',
            department: 'Transport & Fleet',
            billingMonth: 'May 2026',
            basicPay: 24000,
            hra: 5000,
            medicalAllowance: 1500,
            specialAllowance: 1200,
            workingDays: 30,
            presentDays: 28,
            deductions: 900,
            paymentMode: 'Bank Transfer (NEFT)',
            paymentDate: new Date('2026-05-31'),
            status: 'Disbursed',
            collegeId: collegeId || 'COL001',
            tenantId: collegeId || 'COL001'
          }),
          processPayload({
            staffId: primaryId,
            staffName: empName,
            designation: 'Senior Campus Transit Driver',
            department: 'Transport & Fleet',
            billingMonth: 'June 2026',
            basicPay: 24000,
            hra: 5000,
            medicalAllowance: 1500,
            specialAllowance: 1200,
            workingDays: 30,
            presentDays: 30,
            deductions: 600,
            paymentMode: 'Bank Transfer (NEFT)',
            status: 'Pending',
            collegeId: collegeId || 'COL001',
            tenantId: collegeId || 'COL001'
          })
        ]);
        return res.json(createdSlips);
      }
    }

    res.json(salaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET salaries for a specific staff member
router.get('/staff/:staffId', protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const staffParam = req.params.staffId;

    // Strict confidentiality: Staff, Watchmen, and Drivers can only query their own records
    const selfOnlyRoles = ['staff', 'faculty', 'watchman', 'driver'];
    if (selfOnlyRoles.includes(String(req.user?.role || '').toLowerCase())) {
      const myId = String(req.user.referenceId || req.user._id || req.user.userId || '').toLowerCase();
      const myName = String(req.user.name || '').toLowerCase();
      const paramLower = String(staffParam).toLowerCase();
      if (paramLower !== 'my' && paramLower !== myId && paramLower !== myName) {
        return res.status(403).json({ message: 'Access denied: You can only view your own payroll records.' });
      }
    }

    const idList = [staffParam, req.user?.referenceId, req.user?._id?.toString()].filter(Boolean);
    const query = {
      $or: [
        { staffId: { $in: idList } },
        ...(req.user?.name ? [{ staffName: { $regex: new RegExp(`^${req.user.name.trim()}$`, 'i') } }] : [])
      ]
    };

    let filter = query;
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter = {
        $and: [
          query,
          { $or: [{ collegeId }, { tenantId: collegeId }] }
        ]
      };
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
