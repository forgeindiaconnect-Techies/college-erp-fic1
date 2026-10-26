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
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const filter = {
      $or: [
        { collegeId: tenantId },
        { collegeId: 'COL001' },
        { collegeId: 'unassigned_college' },
        { collegeId: { $exists: false } }
      ]
    };
    const records = await StaffSupportRecord.find(filter).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new request
router.post('/', async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const newRecord = new StaffSupportRecord({
      ...req.body,
      collegeId: tenantId,
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
    else if (req.body.requestType === 'Complaint') targetRole = 'Principal';

    try {
      await new Notification({
        targetRoles: [targetRole],
        title: `New ${req.body.requestType} Request`,
        message: `Staff ${req.body.staffName || req.user?.name} has submitted a new ${req.body.requestType} request.`,
        type: 'Info',
        link: '/support',
        collegeId: tenantId,
        tenantId: tenantId
      }).save();
    } catch(err) {
      console.error('Failed to send target notification:', err);
    }
    
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const ensureStaffSupportRecords = async () => {
  try {
    const count = await StaffSupportRecord.countDocuments({});
    if (count === 0) {
      await StaffSupportRecord.insertMany([
        {
          staffName: 'Renuka',
          department: 'Computer Science',
          requestType: 'IT Support',
          subType: 'Lab 2 Ceiling Projector HDMI Outage',
          description: 'Projector signal in Computer Lab 2 flickers intermittently during lectures.',
          priority: 'High',
          status: 'In Progress',
          collegeId: 'COL001',
          timeline: [
            { date: '2026-10-25', text: 'Ticket registered with campus IT Desk' },
            { date: '2026-10-26', text: 'Hardware engineer assigned for cable inspection' }
          ]
        },
        {
          staffName: 'Renuka',
          department: 'Computer Science',
          requestType: 'Complaint',
          subType: 'Wi-Fi Signal Drop in Faculty Room 3B',
          description: 'Institutional staff Wi-Fi access point in 3rd floor CSE block disconnects repeatedly during duty hours.',
          priority: 'Medium',
          status: 'Pending',
          collegeId: 'COL001',
          timeline: [
            { date: '2026-10-26', text: 'Complaint logged to Campus Network Admin' }
          ]
        },
        {
          staffName: 'Renuka',
          department: 'Computer Science',
          requestType: 'Leave',
          subType: 'Casual Leave',
          startDate: '2026-10-28',
          endDate: '2026-10-29',
          description: 'Attending National AI Conference as institutional delegate.',
          priority: 'Low',
          status: 'Approved',
          collegeId: 'COL001',
          timeline: [
            { date: '2026-10-24', text: 'Leave application submitted' },
            { date: '2026-10-25', text: 'Approved by HOD' }
          ]
        }
      ]);
    }
  } catch (e) {
    console.warn('ensureStaffSupportRecords notice:', e.message);
  }
};
setTimeout(ensureStaffSupportRecords, 2000);

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
