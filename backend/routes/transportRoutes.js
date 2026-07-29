import express from 'express';
import TransportRoute from '../models/TransportRoute.js';
import TransportDriver from '../models/TransportDriver.js';
import TransportStudent from '../models/TransportStudent.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all transport routes
// @route   GET /api/transport/routes
// @access  Private
router.get('/routes', protect, collegeScope, async (req, res) => {
  try {
    const routes = await TransportRoute.find({});
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching routes' });
  }
});

// @desc    Get all transport drivers
// @route   GET /api/transport/drivers
// @access  Private
router.get('/drivers', protect, collegeScope, async (req, res) => {
  try {
    const drivers = await TransportDriver.find({});
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching drivers' });
  }
});

// @desc    Get all transport students
// @route   GET /api/transport/students
// @access  Private
router.get('/students', protect, collegeScope, async (req, res) => {
  try {
    const students = await TransportStudent.find({})
      .populate({
        path: 'studentProfile',
        populate: { path: 'user', select: 'name email phone' }
      });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching students' });
  }
});

export default router;
