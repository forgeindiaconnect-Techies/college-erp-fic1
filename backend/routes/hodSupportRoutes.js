import express from 'express';
import HodSupportRecord from '../models/HodSupportRecord.js';
import Notification from '../models/Notification.js';

import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(collegeScope);

// Get all requests
router.get('/', async (req, res) => {
  try {
    const records = await HodSupportRecord.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new request
router.post('/', async (req, res) => {
  try {
    const newRecord = new HodSupportRecord({
      ...req.body,
      timeline: [{ date: new Date().toISOString().split('T')[0], text: 'Request submitted successfully' }]
    });
    await newRecord.save();
    
    if (req.app.get('io')) {
      req.app.get('io').emit('hodSupportUpdated');
    }

    // Try to notify the appropriate role
    let targetRole = 'Principal';
    if (req.body.requestType === 'Resource Requests') targetRole = 'Admin';
    else if (req.body.requestType === 'Budget & Finance') targetRole = 'Accounts';

    try {
      await new Notification({
        targetRoles: [targetRole],
        title: `New HOD ${req.body.requestType}`,
        message: `HOD ${req.body.hodName} (${req.body.department}) submitted a request.`,
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
    const updated = await HodSupportRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (req.app.get('io')) {
      req.app.get('io').emit('hodSupportUpdated');
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a request
router.delete('/:id', async (req, res) => {
  try {
    await HodSupportRecord.findByIdAndDelete(req.params.id);
    if (req.app.get('io')) {
      req.app.get('io').emit('hodSupportUpdated');
    }
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
