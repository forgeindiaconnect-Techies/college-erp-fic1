import express from 'express';
import bcrypt from 'bcryptjs';
import TransportRoute from '../models/TransportRoute.js';
import TransportDriver from '../models/TransportDriver.js';
import TransportStudent from '../models/TransportStudent.js';
import TransportVehicle from '../models/TransportVehicle.js';
import TransportVehicleMaintenance from '../models/TransportVehicleMaintenance.js';
import TransportComplaint from '../models/TransportComplaint.js';
import TransportTrip from '../models/TransportTrip.js';
import TransportDriverAttendance from '../models/TransportDriverAttendance.js';
import TransportNotification from '../models/TransportNotification.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

// ==========================================
// ROUTES (Bus Routes)
// ==========================================

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

// @desc    Create or update a transport route
// @route   POST /api/transport/routes
// @access  Private
router.post('/routes', protect, collegeScope, async (req, res) => {
  try {
    const { routeId, name, vehicle, driver, capacity, points } = req.body;
    let route = await TransportRoute.findOne({ routeId });
    if (route) {
      route.name = name || route.name;
      route.vehicle = vehicle || route.vehicle;
      route.driver = driver || route.driver;
      if (capacity !== undefined) route.capacity = capacity;
      if (points) route.points = points;
      await route.save();
    } else {
      route = await TransportRoute.create({
        routeId: routeId || `R-${Date.now().toString().slice(-4)}`,
        name,
        vehicle,
        driver,
        capacity: capacity || 50,
        occupied: 0,
        points: points || []
      });
    }
    res.status(201).json(route);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error creating route' });
  }
});

// @desc    Update a transport route
// @route   PUT /api/transport/routes/:id
// @access  Private
router.put('/routes/:id', protect, collegeScope, async (req, res) => {
  try {
    const route = await TransportRoute.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(route);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error updating route' });
  }
});

// @desc    Delete a transport route
// @route   DELETE /api/transport/routes/:id
// @access  Private
router.delete('/routes/:id', protect, collegeScope, async (req, res) => {
  try {
    await TransportRoute.findByIdAndDelete(req.params.id);
    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error deleting route' });
  }
});

// ==========================================
// DRIVERS
// ==========================================

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

// @desc    Create a new transport driver
// @route   POST /api/transport/drivers
// @access  Private
router.post('/drivers', protect, collegeScope, async (req, res) => {
  try {
    let { driverId, ...driverData } = req.body;

    if (!driverId) {
      const count = await TransportDriver.countDocuments();
      driverId = `DRV-${(count + 1).toString().padStart(4, '0')}`;
    }

    let driver = await TransportDriver.findOne({ 
      $or: [
        { driverId },
        ...(driverData.email ? [{ email: driverData.email.trim() }] : [])
      ]
    });

    if (driver) {
      // Update existing driver record
      driver = await TransportDriver.findByIdAndUpdate(
        driver._id,
        { driverId, ...driverData, status: driverData.status || 'Active' },
        { new: true }
      );
    } else {
      driver = await TransportDriver.create({
        driverId,
        ...driverData,
        status: driverData.status || 'Active',
        collegeId: req.user.tenantId || req.user.collegeId
      });
    }

    // Generate/sync system credentials (User) if email and password are provided
    if (driverData.email) {
      const trimmedEmail = driverData.email.trim();
      const trimmedPassword = driverData.password ? driverData.password.trim() : 'driver123';
      let existingUser = await User.findOne({ email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') } });
      if (!existingUser) {
        await User.create({
          name: driverData.name || 'Driver',
          email: trimmedEmail,
          password: trimmedPassword,
          role: 'Driver',
          referenceId: driverId,
          tenantId: req.user.tenantId || req.user.collegeId,
          collegeId: req.user.tenantId || req.user.collegeId
        });
      } else {
        // If user exists, ensure they have Driver role and updated password
        if (driverData.password) {
          existingUser.password = trimmedPassword;
        }
        existingUser.name = driverData.name || existingUser.name;
        existingUser.role = 'Driver';
        existingUser.referenceId = driverId;
        existingUser.tenantId = req.user.tenantId || req.user.collegeId || existingUser.tenantId;
        existingUser.collegeId = req.user.collegeId || req.user.tenantId || existingUser.collegeId;
        await existingUser.save();
      }
    }

    res.status(201).json(driver);
  } catch (error) {
    console.error('Error creating/updating driver [Detailed]:', error);
    res.status(500).json({ message: `Server Error creating driver: ${error.message}` });
  }
});

// @desc    Update a transport driver
// @route   PUT /api/transport/drivers/:id
// @access  Private
router.put('/drivers/:id', protect, collegeScope, async (req, res) => {
  try {
    const driver = await TransportDriver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (driver && req.body.email) {
      const trimmedEmail = req.body.email.trim();
      let existingUser = await User.findOne({ email: { $regex: new RegExp(`^${trimmedEmail}$`, 'i') } });
      if (existingUser) {
        if (req.body.password) existingUser.password = req.body.password.trim();
        if (req.body.name) existingUser.name = req.body.name;
        existingUser.role = 'Driver';
        existingUser.referenceId = driver.driverId;
        await existingUser.save();
      } else if (req.body.password) {
        await User.create({
          name: driver.name || 'Driver',
          email: trimmedEmail,
          password: req.body.password.trim(),
          role: 'Driver',
          referenceId: driver.driverId,
          tenantId: req.user.tenantId || req.user.collegeId,
          collegeId: req.user.collegeId || req.user.tenantId
        });
      }
    }

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error updating driver' });
  }
});

// @desc    Delete a transport driver
// @route   DELETE /api/transport/drivers/:id
// @access  Private
router.delete('/drivers/:id', protect, collegeScope, async (req, res) => {
  try {
    const driver = await TransportDriver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    if (driver.email) {
      await User.deleteOne({ email: driver.email.trim().toLowerCase() });
    }
    await TransportDriver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error deleting driver' });
  }
});

// ==========================================
// STUDENTS (Transport Allocation)
// ==========================================

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

// @desc    Create or allocate a transport student
// @route   POST /api/transport/students
// @access  Private
router.post('/students', protect, collegeScope, async (req, res) => {
  try {
    const { studentId, name, routeId, pickupPoint, feeStatus, amount } = req.body;
    let student = await TransportStudent.findOne({ studentId });
    if (student) {
      student.name = name || student.name;
      student.routeId = routeId || student.routeId;
      student.pickupPoint = pickupPoint || student.pickupPoint;
      if (feeStatus) student.feeStatus = feeStatus;
      if (amount !== undefined) student.amount = amount;
      await student.save();
    } else {
      student = await TransportStudent.create({
        studentId,
        name: name || 'Student',
        routeId,
        pickupPoint: pickupPoint || 'Campus Gate',
        feeStatus: feeStatus || 'Pending',
        amount: amount || 0
      });
    }
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error allocating student' });
  }
});

// @desc    Update a transport student allocation
// @route   PUT /api/transport/students/:id
// @access  Private
router.put('/students/:id', protect, collegeScope, async (req, res) => {
  try {
    const student = await TransportStudent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error updating student' });
  }
});

// @desc    Delete a transport student allocation
// @route   DELETE /api/transport/students/:id
// @access  Private
router.delete('/students/:id', protect, collegeScope, async (req, res) => {
  try {
    await TransportStudent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student removed from transport successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error deleting student' });
  }
});

// ==========================================
// VEHICLES
// ==========================================

// @desc    Get all transport vehicles
// @route   GET /api/transport/vehicles
// @access  Private
router.get('/vehicles', protect, collegeScope, async (req, res) => {
  try {
    const vehicles = await TransportVehicle.find({}).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching vehicles' });
  }
});

// @desc    Create a transport vehicle
// @route   POST /api/transport/vehicles
// @access  Private
router.post('/vehicles', protect, collegeScope, async (req, res) => {
  try {
    const vehicle = await TransportVehicle.create(req.body);
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error creating vehicle' });
  }
});

// @desc    Update a transport vehicle
// @route   PUT /api/transport/vehicles/:id
// @access  Private
router.put('/vehicles/:id', protect, collegeScope, async (req, res) => {
  try {
    const vehicle = await TransportVehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(vehicle);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error updating vehicle' });
  }
});

// @desc    Delete a transport vehicle
// @route   DELETE /api/transport/vehicles/:id
// @access  Private
router.delete('/vehicles/:id', protect, collegeScope, async (req, res) => {
  try {
    await TransportVehicle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error deleting vehicle' });
  }
});

// ==========================================
// ATTENDANCE (Driver Daily Attendance)
// ==========================================

// @desc    Get driver attendance
// @route   GET /api/transport/attendance
// @access  Private
router.get('/attendance', protect, collegeScope, async (req, res) => {
  try {
    const filter = {};
    if (req.query.driverId) filter.driverId = req.query.driverId;
    if (req.query.date) filter.date = req.query.date;
    const records = await TransportDriverAttendance.find(filter).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching driver attendance' });
  }
});

// @desc    Mark driver attendance
// @route   POST /api/transport/attendance
// @access  Private
router.post('/attendance', protect, collegeScope, async (req, res) => {
  try {
    const { driverId, date, status, checkInTime, checkOutTime, remarks } = req.body;
    let record = await TransportDriverAttendance.findOne({ driverId, date });
    if (record) {
      if (status) record.status = status;
      if (checkInTime) record.checkInTime = checkInTime;
      if (checkOutTime) record.checkOutTime = checkOutTime;
      if (remarks) record.remarks = remarks;
      await record.save();
    } else {
      record = await TransportDriverAttendance.create({
        driverId,
        date: date || new Date().toISOString().split('T')[0],
        status: status || 'Present',
        checkInTime: checkInTime || new Date().toLocaleTimeString(),
        checkOutTime,
        remarks
      });
    }
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error marking attendance' });
  }
});

// ==========================================
// MAINTENANCE
// ==========================================

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

// ==========================================
// COMPLAINTS & DRIVER TASKS
// ==========================================

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

// ==========================================
// TRIPS
// ==========================================

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

// ==========================================
// NOTIFICATIONS
// ==========================================

// @desc    Get all transport notifications
// @route   GET /api/transport/notifications
// @access  Private
router.get('/notifications', protect, collegeScope, async (req, res) => {
  try {
    const notifs = await TransportNotification.find({}).sort({ createdAt: -1 });
    res.json(notifs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching notifications' });
  }
});

export default router;
