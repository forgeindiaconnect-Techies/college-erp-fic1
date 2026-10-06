import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import CollegeSettings from '../models/CollegeSettings.js';
import College from '../models/College.js';
import User from '../models/User.js';
import LoginLog from '../models/LoginLog.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get system settings (multi-tenant aware)
// @route   GET /api/settings
// @access  Public / Private (Universal)
router.get('/', async (req, res) => {
  try {
    let targetTenant = req.headers['x-tenant-id'] || req.query.tenantId || null;

    // Check if Authorization header has a valid token to resolve tenant
    if (!targetTenant && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        if (token && !token.startsWith('mock-')) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
          if (decoded && decoded.id) {
            const user = await User.findById(decoded.id).select('tenantId collegeId');
            if (user) {
              targetTenant = user.tenantId || user.collegeId;
            }
          }
        }
      } catch (tokenErr) {
        // Continue with default/fallback if token fails
      }
    }

    if (targetTenant && targetTenant !== 'system' && targetTenant !== 'mock_college_id') {
      const isValidObjId = mongoose.Types.ObjectId.isValid(targetTenant);
      let college = await College.findOne({
        $or: [
          { tenantId: targetTenant },
          { _id: isValidObjId ? targetTenant : null }
        ]
      });

      let settings = await CollegeSettings.findOne({
        $or: [
          { tenantId: targetTenant },
          { collegeId: targetTenant },
          { collegeId: isValidObjId ? targetTenant : null }
        ]
      });

      const resolvedName = college?.name || 'Institution Portal';

      if (!settings) {
        settings = await CollegeSettings.create({
          tenantId: targetTenant,
          collegeId: college?._id || targetTenant,
          collegeName: resolvedName,
          primaryColor: '#0d9488',
          secondaryColor: '#059669'
        });
      } else if (college?.name && settings.collegeName !== college.name) {
        settings.collegeName = college.name;
        await settings.save();
      }

      return res.json(settings);
    }

    // Default public settings if no tenant specified
    let defaultSettings = await CollegeSettings.findOne({ tenantId: 'COL001' });
    if (!defaultSettings) {
      defaultSettings = {
        collegeName: 'Campus ERP Portal',
        primaryColor: '#0d9488',
        secondaryColor: '#059669',
        academicYear: '2026-2027',
        timezone: 'Asia/Kolkata (IST)',
        currency: 'INR (₹)'
      };
    }
    res.json(defaultSettings);
  } catch (error) {
    console.error('Settings GET Error:', error);
    res.status(500).json({ message: 'Server Error fetching settings' });
  }
});

// @desc    Update system settings (tenant-scoped)
// @route   PUT /api/settings
// @access  Private/Admin
router.put('/', protect, authorize('Admin', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const targetTenant = req.collegeId && req.collegeId !== 'system' ? req.collegeId : (req.user?.tenantId || req.user?.collegeId || 'COL001');
    const isValidObjId = mongoose.Types.ObjectId.isValid(targetTenant);

    const settings = await CollegeSettings.findOneAndUpdate(
      { 
        $or: [
          { tenantId: targetTenant },
          { collegeId: targetTenant },
          { collegeId: isValidObjId ? targetTenant : null }
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
            { _id: isValidObjId ? targetTenant : null }
          ]
        },
        { $set: { name: req.body.collegeName } }
      );
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
