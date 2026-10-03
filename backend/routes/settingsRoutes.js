import express from 'express';
import CollegeSettings from '../models/CollegeSettings.js';
import College from '../models/College.js';
import LoginLog from '../models/LoginLog.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public / Private (Universal)
router.get('/', async (req, res) => {
  try {
    let settings = await CollegeSettings.findOne({}).sort({ updatedAt: -1 });

    const college = await College.findOne({}).sort({ createdAt: -1 });

    const defaultName = 'Marudhar Kesari Jain College for Women';

    if (!settings) {
      settings = await CollegeSettings.create({ 
        tenantId: 'COL001', 
        collegeId: 'COL001',
        collegeName: college?.name || defaultName
      });
    } else if (!settings.collegeName) {
      settings.collegeName = college?.name || defaultName;
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('Settings GET Error:', error);
    res.status(500).json({ message: 'Server Error fetching settings' });
  }
});

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, authorize('Admin', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const targetTenant = req.collegeId && req.collegeId !== 'system' ? req.collegeId : (req.user?.tenantId || req.user?.collegeId || 'COL001');
    
    const settings = await CollegeSettings.findOneAndUpdate(
      { 
        $or: [
          { tenantId: targetTenant },
          { collegeId: targetTenant }
        ]
      },
      { ...req.body, tenantId: targetTenant, collegeId: targetTenant },
      { new: true, upsert: true }
    );

    if (req.body.collegeName) {
      await College.updateMany(
        {
          $or: [
            { tenantId: targetTenant },
            { _id: (typeof targetTenant === 'string' && targetTenant.length === 24) ? targetTenant : null }
          ]
        },
        { $set: { name: req.body.collegeName } }
      );

      // Also ensure all college documents and settings reflect this name
      await College.updateMany({}, { $set: { name: req.body.collegeName } });
      await CollegeSettings.updateMany({}, { $set: { collegeName: req.body.collegeName } });
    }

    res.json(settings);
  } catch (error) {
    console.error('Settings PUT Error:', error);
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
