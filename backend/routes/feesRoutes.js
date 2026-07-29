import express from 'express';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import User from '../models/User.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

const processFeePayload = (data) => {
  const total = Number(data.totalFees) || 0;
  const paid = Number(data.paidAmount) || 0;
  const pending = total - paid;
  
  let status = 'Pending';
  if (paid >= total && total > 0) status = 'Paid';
  else if (paid > 0 && paid < total) status = 'Partial';
  
  return {
    ...data,
    totalFees: total,
    paidAmount: paid,
    pendingAmount: pending,
    status
  };
};

const updateStudentFeeStatus = async (studentId) => {
  try {
    const fees = await Fee.find({ studentId });
    if (fees.length === 0) return;
    
    // Calculate global status for student based on all their fees
    let globalStatus = 'Paid'; // assume paid unless pending/partial found
    for (const f of fees) {
      if (f.status === 'Pending') {
        globalStatus = 'Pending';
        break; // Pending takes highest severity
      }
      if (f.status === 'Partial') {
        globalStatus = 'Partial';
      }
    }
    
    await Student.findOneAndUpdate({ id: studentId }, { feeStatus: globalStatus });
  } catch (err) {
    console.error('Failed to update student fee status:', err);
  }
};

// Helper to notify student & parent of fee updates
const notifyFeeUpdate = async (req, feeRecord) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 'unassigned_college';
    const studentUser = await User.findOne({ referenceId: feeRecord.studentId });
    if (studentUser) {
      await sendNotification(req, {
        receiverId: studentUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'Fee Transaction Update',
        message: `Fee payment update recorded: ₹${feeRecord.paidAmount || 0} paid (${feeRecord.status}). Pending: ₹${feeRecord.pendingAmount || 0}.`,
        category: 'system',
        type: feeRecord.status === 'Paid' ? 'Success' : 'Info'
      });
    }
  } catch (e) {
    console.error('Failed to send fee notification:', e);
  }
};

// Get all fees
router.get('/', protect, authorize('Admin', 'Principal', 'Accounts', 'HOD'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = dept ? { department: dept } : {};
    const fees = await Fee.find(query).sort({ createdAt: -1 });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get fees for a specific student
router.get('/student/:studentId', protect, collegeScope, async (req, res) => {
  try {
    if ((req.user.role === 'Student' || req.user.role === 'Parent') && req.user.referenceId !== req.params.studentId) {
      return res.status(403).json({ message: 'Unauthorized to view this record' });
    }
    const fees = await Fee.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get fee structure for a specific student
router.get('/structure/:studentId', protect, collegeScope, async (req, res) => {
  try {
    let structure = await FeeStructure.findOne({ studentId: req.params.studentId });
    // If not found, return default structure based on student preferences
    if (!structure) {
      const student = await Student.findOne({ id: req.params.studentId });
      structure = {
        studentId: req.params.studentId,
        tuitionFee: 60000,
        examFee: 2500,
        libraryFee: 0,
        hostelFee: student && (student.hostelRequired === 'yes' || student.hostelRequired === true) ? 40000 : 0,
        transportFee: student && (student.transportRequired === 'yes' || student.transportRequired === true) ? 15000 : 0
      };
    }
    res.json(structure);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record new fee transaction
router.post('/', protect, authorize('Admin', 'Principal', 'Accounts', 'Student'), collegeScope, async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      const processed = req.body.map(processFeePayload);
      const newRecords = await Fee.insertMany(processed);
      
      const studentIds = [...new Set(newRecords.map(r => r.studentId))];
      for (const id of studentIds) {
        await updateStudentFeeStatus(id);
      }
      for (const record of newRecords) {
        await notifyFeeUpdate(req, record);
      }
      req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'created' });
      return res.status(201).json(newRecords);
    } else {
      const fee = new Fee(processFeePayload(req.body));
      const newRecord = await fee.save();
      await updateStudentFeeStatus(newRecord.studentId);
      await notifyFeeUpdate(req, newRecord);
      req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'created' });
      return res.status(201).json(newRecord);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update fee status (e.g. Pending -> Paid)
router.put('/:id', protect, authorize('Admin', 'Principal', 'Accounts', 'Student'), collegeScope, async (req, res) => {
  try {
    const updatedFee = await Fee.findByIdAndUpdate(
      req.params.id, 
      processFeePayload(req.body), 
      { new: true }
    );
    if (updatedFee) {
      await updateStudentFeeStatus(updatedFee.studentId);
      await notifyFeeUpdate(req, updatedFee);
    }
    req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'updated' });
    res.json(updatedFee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete fee record
router.delete('/:id', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const record = await Fee.findById(req.params.id);
    if (record) {
      await Fee.findByIdAndDelete(req.params.id);
      await updateStudentFeeStatus(record.studentId);
    }
    req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'deleted' });
    res.json({ message: 'Fee record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
