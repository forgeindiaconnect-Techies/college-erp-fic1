import express from 'express';
import CollegeSettings from '../models/CollegeSettings.js';
import College from '../models/College.js';
import LoginLog from '../models/LoginLog.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private/Admin
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    let settings = await CollegeSettings.findOne({ tenantId: req.collegeId });
    if (!settings) {
      const college = await College.findOne({ tenantId: req.collegeId });
      settings = await CollegeSettings.create({ 
        tenantId: req.collegeId, 
        collegeId: req.collegeId,
        collegeName: college ? college.name : 'Unknown College'
      });
    } else if (!settings.collegeName) {
      const college = await College.findOne({ tenantId: req.collegeId });
      if (college) {
        settings.collegeName = college.name;
        await settings.save();
      }
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching settings' });
  }
});

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, authorize('Admin'), collegeScope, async (req, res) => {
  try {
    const settings = await CollegeSettings.findOneAndUpdate(
      { tenantId: req.collegeId },
      req.body,
      { new: true, upsert: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating settings' });
  }
});

// @desc    Get login logs
// @route   GET /api/settings/logs
// @access  Private/Admin
router.get('/logs', protect, authorize('Admin', 'Sub Admin'), collegeScope, async (req, res) => {
  try {
    const logs = await LoginLog.find({}).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching login logs' });
  }
});

export default router;
