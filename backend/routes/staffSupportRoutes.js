import express from 'express';
import StaffSupportRecord from '../models/StaffSupportRecord.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(collegeScope);

// Get all requests
router.get('/', async (req, res) => {
  try {
    const records = await StaffSupportRecord.find({ collegeId: req.collegeId || 'unassigned_college' }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new request
router.post('/', async (req, res) => {
  try {
    const newRecord = new StaffSupportRecord({
      ...req.body,
      collegeId: req.collegeId || 'unassigned_college',
      timeline: [{ date: new Date().toISOString().split('T')[0], text: 'Request submitted successfully' }]
    });
    await newRecord.save();
    
    if (req.app.get('io')) {
      req.app.get('io').emit('staffSupportUpdated');
    }

    // Try to notify the appropriate role
    let targetRole = 'Principal';
    if (req.body.requestType === 'Leave') targetRole = 'HOD';
    else if (req.body.requestType === 'IT Support') targetRole = 'Admin';
    else if (req.body.requestType === 'Salary Query') targetRole = 'Accounts';

    try {
      await new Notification({
        targetRoles: [targetRole],
        title: `New ${req.body.requestType} Request`,
        message: `Staff ${req.body.staffName} has submitted a new ${req.body.requestType} request.`,
        type: 'Info',
        link: '/support' // Dummy link for now
      }).save();
    } catch(err) {
      console.error('Failed to send target notification:', err);
    }
    
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a request
router.put('/:id', async (req, res) => {
  try {
    const updated = await StaffSupportRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (req.app.get('io')) {
      req.app.get('io').emit('staffSupportUpdated');
    }

    // Notify the staff member if status changed or timeline added
    try {
      const staffUser = await User.findOne({ name: updated.staffName, role: 'Staff' });
      if (staffUser && req.body.status) {
        await new Notification({
          recipient: staffUser._id,
          title: `${updated.requestType} Update`,
          message: `Your ${updated.requestType} request status is now ${req.body.status}.`,
          type: req.body.status === 'Resolved' || req.body.status === 'Approved' ? 'Success' : 'Info',
          link: '/staff/support'
        }).save();
      }
    } catch(err) {
      console.error('Failed to send staff notification:', err);
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a request
router.delete('/:id', async (req, res) => {
  try {
    await StaffSupportRecord.findByIdAndDelete(req.params.id);
    if (req.app.get('io')) {
      req.app.get('io').emit('staffSupportUpdated');
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
