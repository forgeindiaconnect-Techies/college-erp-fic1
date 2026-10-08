import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, authorize, checkSubscription } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Get all Placement Officers
router.get('/', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = { role: { $regex: new RegExp('^(placement|placement officer|placement cell)$', 'i') } };
    if (req.user.role !== 'Super Admin') {
      filter.collegeId = req.user.collegeId || req.user.tenantId;
    }
    const officers = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(officers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a Placement Officer User
router.post('/', protect, authorize('Admin', 'Super Admin'), checkSubscription, async (req, res) => {
  try {
    const { name, email, phone, password, employeeId, referenceId, designation } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    let userExists = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const collegeId = req.user.collegeId || req.user.tenantId || 'unassigned_college';

    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : null,
      password: password.trim(),
      referenceId: employeeId || referenceId || `PLC-${Date.now().toString().slice(-4)}`,
      role: 'Placement',
      department: designation || 'Training & Placement Cell',
      collegeId,
      tenantId: collegeId
    });

    await newUser.save();

    // Send Notification to newly created Placement Officer
    await sendNotification(req, {
      receiverId: newUser._id,
      collegeId,
      tenantId: collegeId,
      title: 'Placement Officer Account Created',
      message: `Welcome ${newUser.name}! Your Placement Cell login credentials have been created successfully.`,
      category: 'system',
      type: 'Success'
    });

    // Send Notification to Admin / Creator
    if (req.user._id && req.user._id.toString() !== newUser._id.toString()) {
      await sendNotification(req, {
        receiverId: req.user._id,
        collegeId,
        tenantId: collegeId,
        title: 'Placement Officer Added',
        message: `${newUser.name} (${newUser.email}) has been provisioned as a Placement Officer.`,
        category: 'system',
        type: 'Info'
      });
    }
    
    // Emit real-time event if socket.io is configured
    if (req.app.get('io')) {
      req.app.get('io').emit('dataUpdated', { module: 'placement_officer', action: 'created' });
    }

    res.status(201).json({ 
      message: 'Placement officer created successfully', 
      user: { 
        id: newUser._id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role,
        referenceId: newUser.referenceId 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create placement officer', error: err.message });
  }
});

// Update a Placement Officer User
router.put('/:id', protect, authorize('Admin', 'Super Admin'), checkSubscription, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      filter.collegeId = req.user.collegeId || req.user.tenantId;
    }
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ message: 'Placement officer not found or unauthorized' });
    }

    const { name, email, phone, employeeId, password, designation, status } = req.body;

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (phone !== undefined) user.phone = phone ? phone.trim() : null;
    if (employeeId) user.referenceId = employeeId.trim();
    if (designation) user.department = designation.trim();
    if (status) user.status = status;
    if (password && password.trim().length > 0) {
      user.password = password.trim();
    }

    await user.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('dataUpdated', { module: 'placement_officer', action: 'updated' });
    }

    res.json({ message: 'Placement officer updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update placement officer', error: err.message });
  }
});

// Delete a Placement Officer User
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), checkSubscription, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      filter.collegeId = req.user.collegeId || req.user.tenantId;
    }
    const user = await User.findOne(filter);
    if (!user) {
      return res.status(404).json({ message: 'Placement officer not found or unauthorized' });
    }

    await User.findByIdAndDelete(req.params.id);

    if (req.app.get('io')) {
      req.app.get('io').emit('dataUpdated', { module: 'placement_officer', action: 'deleted' });
    }

    res.json({ message: 'Placement officer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete placement officer', error: err.message });
  }
});

export default router;
