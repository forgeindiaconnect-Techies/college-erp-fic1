import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, authorize, checkSubscription } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Get all Librarian Users
router.get('/', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = { role: { $regex: new RegExp('^(librarian|library)$', 'i') } };
    if (req.user.role !== 'Super Admin') {
      filter.collegeId = req.user.collegeId || req.user.tenantId;
    }
    const librarians = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(librarians);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Create a Librarian User
router.post('/', protect, authorize('Admin', 'Super Admin'), checkSubscription, async (req, res) => {
  try {
    const { name, email, phone, password, employeeId, referenceId } = req.body;
    
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
      password: password.trim(), // Mongoose pre-save hooks will handle password hashing
      referenceId: employeeId || referenceId || `LIB-${Date.now().toString().slice(-4)}`,
      role: 'Librarian',
      collegeId,
      tenantId: collegeId
    });

    await newUser.save();

    // Send Notification to newly created Librarian
    await sendNotification(req, {
      receiverId: newUser._id,
      collegeId,
      tenantId: collegeId,
      title: 'Library Staff Account Created',
      message: `Welcome ${newUser.name}! Your Librarian login credentials have been generated successfully.`,
      category: 'system',
      type: 'Success'
    });

    // Send Notification to Admin / Creator
    if (req.user._id && req.user._id.toString() !== newUser._id.toString()) {
      await sendNotification(req, {
        receiverId: req.user._id,
        collegeId,
        tenantId: collegeId,
        title: 'Librarian User Added',
        message: `${newUser.name} (${newUser.email}) has been provisioned as a Librarian.`,
        category: 'system',
        type: 'Info'
      });
    }
    
    // Emit real-time event if socket.io is configured
    if (req.app.get('io')) {
      req.app.get('io').emit('dataUpdated', { module: 'librarian', action: 'created' });
    }

    res.status(201).json({ 
      message: 'Librarian created successfully', 
      user: { 
        id: newUser._id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role,
        referenceId: newUser.referenceId 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create librarian', error: err.message });
  }
});

// Update a Librarian User
router.put('/:id', protect, authorize('Admin', 'Super Admin'), checkSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Librarian not found' });
    }

    const { name, email, phone, password, employeeId, referenceId } = req.body;

    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (employeeId || referenceId) user.referenceId = employeeId || referenceId;
    
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('dataUpdated', { module: 'librarian', action: 'updated' });
    }

    res.json({ message: 'Librarian updated successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update librarian', error: err.message });
  }
});

// Delete a Librarian User
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), checkSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Librarian not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    if (req.app.get('io')) {
      req.app.get('io').emit('dataUpdated', { module: 'librarian', action: 'deleted' });
    }

    res.json({ message: 'Librarian account removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete librarian', error: err.message });
  }
});

export default router;
