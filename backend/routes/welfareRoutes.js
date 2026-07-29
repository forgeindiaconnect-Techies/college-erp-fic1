import express from 'express';
import WelfareRecord from '../models/WelfareRecord.js';
import FeeStructure from '../models/FeeStructure.js';
import Fee from '../models/Fee.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(collegeScope);

router.get('/', async (req, res) => {
  try {
    const records = await WelfareRecord.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newRecord = new WelfareRecord(req.body);
    await newRecord.save();
    
    // Auto-update clients if io is available
    if (req.app.get('io')) {
      req.app.get('io').emit('welfareUpdated');
    }
    
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/approve-scholarship', async (req, res) => {
  try {
    const { amount, name, studentId } = req.body;
    
    // 1. Update Welfare Record
    const updated = await WelfareRecord.findByIdAndUpdate(req.params.id, {
      status: 'Approved',
      $push: { timeline: { date: new Date().toISOString().split('T')[0], text: `Scholarship "${name}" of ₹${amount} Approved by Principal` } }
    }, { new: true });

    // 2. Update Fee Structure
    // Find fee by studentId, or by studentName from the record
    const feeFilter = studentId ? { studentId } : { studentName: updated.studentName };
    
    await FeeStructure.findOneAndUpdate(
      studentId ? { studentId } : { studentId: 'CS2022001' }, // Fallback to CS2022001 for demo if no studentId is available
      { scholarshipAmount: amount, scholarshipName: name },
      { upsert: true, new: true }
    );
    
    // Update Fee pendingAmount if exists
    const fee = await Fee.findOne(feeFilter);
    if (fee) {
      // Decrease totalFees and pendingAmount
      fee.totalFees = fee.totalFees - amount;
      fee.pendingAmount = Math.max(0, fee.pendingAmount - amount);
      if (fee.pendingAmount === 0 && fee.paidAmount > 0) fee.status = 'Paid';
      await fee.save();
    } else if (!studentId) {
       // fallback for demo to affect John Doe's fee
       const fallbackFee = await Fee.findOne({ studentId: 'CS2022001' });
       if (fallbackFee) {
          fallbackFee.totalFees = fallbackFee.totalFees - amount;
          fallbackFee.pendingAmount = Math.max(0, fallbackFee.pendingAmount - amount);
          await fallbackFee.save();
       }
    }

    if (req.app.get('io')) req.app.get('io').emit('welfareUpdated');
    
    // Create Notifications
    try {
      const studentUser = await User.findOne({ name: updated.studentName, role: 'Student' });
      if (studentUser) {
        // Notify Student
        await new Notification({
          recipient: studentUser._id,
          title: 'Scholarship Approved',
          message: `Your scholarship "${name}" of ₹${amount} has been approved.`,
          type: 'Success',
          link: '/student/fees'
        }).save();

        // Notify Parent
        const parentUser = await User.findOne({ role: 'Parent', parentOf: studentUser.referenceId || studentUser.studentId });
        if (parentUser) {
          await new Notification({
            recipient: parentUser._id,
            title: 'Scholarship Approved',
            message: `A scholarship of ₹${amount} was approved for ${updated.studentName}.`,
            type: 'Success',
            link: '/parent/fees'
          }).save();
        }
      }
      
      // Notify Accounts (Global role notification)
      await new Notification({
        targetRoles: ['Accounts'],
        title: 'Fee Recalculation Needed',
        message: `Scholarship approved for ${updated.studentName}. Fee reduced by ₹${amount}.`,
        type: 'Info',
        link: '/accounts/fees'
      }).save();
    } catch(err) {
      console.error('Error sending notifications:', err);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await WelfareRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (req.app.get('io')) {
      req.app.get('io').emit('welfareUpdated');
    }

    // Try to trigger notifications based on what changed
    try {
      const studentUser = await User.findOne({ name: updated.studentName, role: 'Student' });
      const parentUser = studentUser ? await User.findOne({ role: 'Parent', parentOf: studentUser.referenceId || studentUser.studentId }) : null;

      const lastTimeline = updated.timeline && updated.timeline.length > 0 ? updated.timeline[updated.timeline.length - 1].text : '';

      if (updated.status === 'Resolved') {
        if (studentUser) await new Notification({ recipient: studentUser._id, title: 'Case Resolved', message: `Your case regarding ${updated.issueType} has been resolved.`, type: 'Success', link: '/student/welfare' }).save();
        if (parentUser) await new Notification({ recipient: parentUser._id, title: 'Case Resolved', message: `A welfare case for ${updated.studentName} has been resolved.`, type: 'Success' }).save();
      } else if (lastTimeline.includes('Principal Reply:')) {
        if (studentUser) await new Notification({ recipient: studentUser._id, title: 'New Message from Principal', message: `The Principal has replied to your ${updated.issueType} request.`, type: 'Info', link: '/student/welfare' }).save();
      } else if (lastTimeline.includes('Assigned counselor')) {
        if (studentUser) await new Notification({ recipient: studentUser._id, title: 'Counselor Assigned', message: `A counselor has been assigned to you.`, type: 'Info', link: '/student/welfare' }).save();
        if (parentUser) await new Notification({ recipient: parentUser._id, title: 'Counselor Assigned', message: `A counselor has been assigned for ${updated.studentName}.`, type: 'Info' }).save();
      } else if (lastTimeline.includes('Parent meeting scheduled')) {
        if (studentUser) await new Notification({ recipient: studentUser._id, title: 'Meeting Scheduled', message: `A parent meeting has been scheduled.`, type: 'Warning', link: '/student/welfare' }).save();
        if (parentUser) await new Notification({ recipient: parentUser._id, title: 'Meeting Scheduled', message: `You have an urgent meeting scheduled regarding ${updated.studentName}.`, type: 'Warning' }).save();
      } else if (lastTimeline.includes('warning dispatch')) {
        if (parentUser) await new Notification({ recipient: parentUser._id, title: 'Official Warning', message: `You have received an official disciplinary warning regarding ${updated.studentName}.`, type: 'Error' }).save();
      }

    } catch(err) {
      console.error('Error sending notifications:', err);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await WelfareRecord.findByIdAndDelete(req.params.id);
    if (req.app.get('io')) {
      req.app.get('io').emit('welfareUpdated');
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
