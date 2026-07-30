import express from 'express';
import TransportRoute from '../models/TransportRoute.js';
import TransportDriver from '../models/TransportDriver.js';
import TransportStudent from '../models/TransportStudent.js';
import TransportVehicleMaintenance from '../models/TransportVehicleMaintenance.js';
import TransportComplaint from '../models/TransportComplaint.js';
import TransportTrip from '../models/TransportTrip.js';
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

// @desc    Get all maintenance tasks
// @route   GET /api/transport/maintenance
// @access  Private
router.get('/maintenance', protect, collegeScope, async (req, res) => {
  try {
    const tasks = await TransportVehicleMaintenance.find({});
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching maintenance tasks' });
  }
});

// @desc    Create a maintenance task
// @route   POST /api/transport/maintenance
// @access  Private
router.post('/maintenance', protect, collegeScope, async (req, res) => {
  try {
    const newTask = await TransportVehicleMaintenance.create(req.body);
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating maintenance task' });
  }
});

// @desc    Update a maintenance task
// @route   PUT /api/transport/maintenance/:id
// @access  Private
router.put('/maintenance/:id', protect, collegeScope, async (req, res) => {
  try {
    const updated = await TransportVehicleMaintenance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating maintenance task' });
  }
});

// @desc    Get all complaints
// @route   GET /api/transport/complaints
// @access  Private
router.get('/complaints', protect, collegeScope, async (req, res) => {
  try {
    const complaints = await TransportComplaint.find({});
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching complaints' });
  }
});

// @desc    Create a complaint
// @route   POST /api/transport/complaints
// @access  Private
router.post('/complaints', protect, collegeScope, async (req, res) => {
  try {
    const newComplaint = await TransportComplaint.create({
      complaintId: req.body.complaintId || `COMP-${Date.now().toString().slice(-6)}`,
      ...req.body
    });
    res.status(201).json(newComplaint);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating complaint' });
  }
});

// @desc    Update a complaint
// @route   PUT /api/transport/complaints/:id
// @access  Private
router.put('/complaints/:id', protect, collegeScope, async (req, res) => {
  try {
    const updated = await TransportComplaint.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating complaint' });
  }
});

// @desc    Get all trips
// @route   GET /api/transport/trips
// @access  Private
router.get('/trips', protect, collegeScope, async (req, res) => {
  try {
    const trips = await TransportTrip.find({});
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching trips' });
  }
});

// @desc    Create a trip
// @route   POST /api/transport/trips
// @access  Private
router.post('/trips', protect, collegeScope, async (req, res) => {
  try {
    const newTrip = await TransportTrip.create(req.body);
    res.status(201).json(newTrip);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating trip' });
  }
});

// @desc    Update a trip
// @route   PUT /api/transport/trips/:id
// @access  Private
router.put('/trips/:id', protect, collegeScope, async (req, res) => {
  try {
    const updated = await TransportTrip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating trip' });
  }
});

export default router;
