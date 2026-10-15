import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Watchman from '../models/Watchman.js';
import VisitorLog from '../models/VisitorLog.js';
import ParcelLog from '../models/ParcelLog.js';
import SecurityVehicleLog from '../models/SecurityVehicleLog.js';
import CampusGateMovement from '../models/CampusGateMovement.js';
import SecurityIncident from '../models/SecurityIncident.js';
import WatchmanAttendance from '../models/WatchmanAttendance.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Helper to get tenant/college id
const getTenant = (req) => req.user?.collegeId || req.user?.tenantId || 'COL001';

// ══════════════════════════════════════════════════════════════════════════
// 1. ADMIN WATCHMAN MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman - List all watchmen
router.get('/', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const isSuperAdmin = req.user && String(req.user.role).toLowerCase() === 'super admin';
    const filter = isSuperAdmin 
      ? {} 
      : { 
          $or: [
            { tenantId }, 
            { collegeId: tenantId },
            { tenantId: { $exists: false } }
          ] 
        };

    let watchmen = [];
    try {
      watchmen = await Watchman.find(filter)
        .populate('user', 'email name role isActive referenceId phone createdAt')
        .sort({ createdAt: -1 })
        .lean();
    } catch (popErr) {
      console.warn('Populate failed on watchmen query, falling back without populate:', popErr.message);
      watchmen = await Watchman.find(filter).sort({ createdAt: -1 }).lean();
    }

    res.json({ success: true, count: watchmen.length, data: watchmen });
  } catch (err) {
    console.error('Failed to fetch watchmen:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch watchmen', error: err.message });
  }
});

// POST /api/watchman - Create watchman (User account + Watchman profile)
router.post('/', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { name, phone, email, address, shift, assignedGate, status, password, employeeId } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Name, phone, email, and password are required' });
    }

    const tenantId = getTenant(req);

    // Auto-generate employeeId if not given
    let empId = employeeId ? employeeId.trim() : null;
    if (!empId) {
      const count = await Watchman.countDocuments();
      empId = `WMN-${String(count + 1).padStart(3, '0')}`;
    }

    // Check duplicate employee ID
    const duplicateEmp = await Watchman.findOne({ employeeId: empId, email: { $ne: email.trim().toLowerCase() } });
    if (duplicateEmp) {
      empId = `WMN-${Date.now().toString().slice(-4)}`;
    }

    let user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    let newWatchman = null;

    if (user) {
      // User with this email already exists in system -> Update & provision as Watchman
      user.name = name.trim();
      user.phone = phone.trim();
      user.role = 'Watchman';
      user.password = password.trim();
      user.isActive = status !== 'Inactive';
      if (!user.tenantId) user.tenantId = tenantId;
      if (!user.collegeId) user.collegeId = tenantId;
      await user.save();

      newWatchman = await Watchman.findOne({
        $or: [{ user: user._id }, { email: email.trim().toLowerCase() }]
      });

      if (newWatchman) {
        newWatchman.name = name.trim();
        newWatchman.phone = phone.trim();
        newWatchman.shift = shift || newWatchman.shift || 'Morning';
        newWatchman.assignedGate = assignedGate || newWatchman.assignedGate || 'Gate 1 (Main Entrance)';
        newWatchman.status = status || newWatchman.status || 'Active';
        newWatchman.address = address ? address.trim() : newWatchman.address;
        newWatchman.user = user._id;
        if (empId && (!newWatchman.employeeId || newWatchman.employeeId === 'WMN-001')) {
          newWatchman.employeeId = empId;
        }
        await newWatchman.save();
      } else {
        newWatchman = new Watchman({
          user: user._id,
          employeeId: empId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          address: address ? address.trim() : '',
          shift: shift || 'Morning',
          assignedGate: assignedGate || 'Gate 1 (Main Entrance)',
          status: status || 'Active',
          collegeId: tenantId,
          tenantId: tenantId
        });
        await newWatchman.save();
      }
    } else {
      // 1. Create User
      const newUser = new User({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim(), // Pre-save hook hashes this
        role: 'Watchman',
        referenceId: empId,
        collegeId: tenantId,
        tenantId: tenantId
      });
      await newUser.save();
      user = newUser;

      // 2. Create Watchman profile
      newWatchman = new Watchman({
        user: newUser._id,
        employeeId: empId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address ? address.trim() : '',
        shift: shift || 'Morning',
        assignedGate: assignedGate || 'Gate 1 (Main Entrance)',
        status: status || 'Active',
        collegeId: tenantId,
        tenantId: tenantId
      });
      await newWatchman.save();
    }

    // Notify Admin & Watchman
    const targetUser = user || newUser;
    if (targetUser && targetUser._id) {
      await sendNotification(req, {
        receiverId: targetUser._id,
        collegeId: tenantId,
        tenantId: tenantId,
        title: 'Watchman Account Provisioned',
        message: `Welcome ${targetUser.name || name}! Your campus security guard account is ready. Assigned shift: ${shift || 'Morning'} at ${assignedGate || 'Gate 1'}.`,
        category: 'system',
        type: 'Success'
      }).catch(err => console.warn('Watchman notification skipped:', err.message));
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'created', watchmanId: newWatchman._id });
    }

    res.status(201).json({
      success: true,
      message: 'Watchman account created successfully',
      data: newWatchman
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create watchman', error: err.message });
  }
});

// PUT /api/watchman/:id - Update watchman details
router.put('/:id', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    const { name, phone, email, address, shift, assignedGate, status, employeeId } = req.body;

    if (name) watchman.name = name.trim();
    if (phone) watchman.phone = phone.trim();
    if (address !== undefined) watchman.address = address.trim();
    if (shift) watchman.shift = shift;
    if (assignedGate) watchman.assignedGate = assignedGate;
    if (status) watchman.status = status;
    if (employeeId) watchman.employeeId = employeeId.trim();

    if (email && email.trim().toLowerCase() !== watchman.email) {
      const emailInUse = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: watchman.user }
      });
      if (emailInUse) {
        return res.status(400).json({ success: false, message: 'Email address already in use by another user' });
      }
      watchman.email = email.trim().toLowerCase();
    }

    await watchman.save();

    // Sync User record
    if (watchman.user) {
      const user = await User.findById(watchman.user);
      if (user) {
        if (name) user.name = name.trim();
        if (email) user.email = email.trim().toLowerCase();
        if (phone) user.phone = phone.trim();
        if (employeeId) user.referenceId = employeeId.trim();
        await user.save();
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'updated', watchmanId: watchman._id });
    }

    res.json({ success: true, message: 'Watchman updated successfully', data: watchman });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update watchman', error: err.message });
  }
});

// PATCH /api/watchman/:id/status - Toggle activate/deactivate
router.patch('/:id/status', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    const newStatus = watchman.status === 'Active' ? 'Inactive' : 'Active';
    watchman.status = newStatus;
    await watchman.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'status_changed', watchmanId: watchman._id, status: newStatus });
    }

    res.json({
      success: true,
      message: `Watchman account ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: { id: watchman._id, status: newStatus }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle status', error: err.message });
  }
});

// POST /api/watchman/:id/reset-password - Admin resets watchman password
router.post('/:id/reset-password', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findById(watchman.user);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated User account not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword.trim(), salt);
    await user.save();

    res.json({ success: true, message: `Password reset successfully for ${watchman.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset password', error: err.message });
  }
});

// DELETE /api/watchman/:id - Remove watchman
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    if (watchman.user) {
      await User.findByIdAndDelete(watchman.user);
    }
    await Watchman.findByIdAndDelete(req.params.id);

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'deleted', watchmanId: req.params.id });
    }

    res.json({ success: true, message: 'Watchman account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete watchman', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. WATCHMAN DASHBOARD & SECURITY OPERATIONS ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman/me - Get logged in watchman profile
router.get('/me', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findOne({ user: req.user._id });
    res.json({
      success: true,
      data: watchman || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        employeeId: req.user.referenceId || 'WMN-001',
        shift: 'Morning',
        assignedGate: 'Gate 1 (Main Entrance)',
        status: 'Active'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: err.message });
  }
});

// POST /api/watchman/change-password - Watchman self password change
router.post('/change-password', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check current password if provided
    if (currentPassword) {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword.trim(), salt);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password', error: err.message });
  }
});

// GET /api/watchman/stats - Dashboard overview summary cards
router.get('/stats', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? {} : { tenantId };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      visitorsInside,
      todayTotalVisitors,
      expectedVisitors,
      pendingApprovals,
      vehiclesInside,
      openIncidents
    ] = await Promise.all([
      VisitorLog.countDocuments({ ...filter, status: 'Inside' }),
      VisitorLog.countDocuments({ ...filter, entryTime: { $gte: startOfToday, $lte: endOfToday } }),
      VisitorLog.countDocuments({
        ...filter,
        isPreRegistered: true,
        status: { $in: ['Pre-Registered', 'Approved'] }
      }),
      VisitorLog.countDocuments({
        ...filter,
        isPreRegistered: true,
        approvalStatus: 'Pending'
      }),
      SecurityVehicleLog.countDocuments({ ...filter, status: 'Inside' }),
      SecurityIncident.countDocuments({ ...filter, status: { $in: ['Open', 'Under Investigation'] } })
    ]);

    res.json({
      success: true,
      data: {
        visitorsInside,
        todayTotalVisitors,
        expectedVisitors,
        pendingApprovals,
        vehiclesInside,
        openIncidents
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 3. VISITOR OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/visitors/active - Visitors currently inside
router.get('/visitors/active', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? { status: 'Inside' } : { tenantId, status: 'Inside' };

    const activeVisitors = await VisitorLog.find(filter).sort({ entryTime: -1 });
    res.json({ success: true, count: activeVisitors.length, data: activeVisitors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active visitors', error: err.message });
  }
});

// POST /api/watchman/visitors/entry - Log visitor entry
router.post('/visitors/entry', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      name, phone, email, purpose, personToMeet, department,
      vehicleNumber, idProofType, idProofNumber, gate, notes
    } = req.body;

    if (!name || !phone || !purpose || !personToMeet) {
      return res.status(400).json({ success: false, message: 'Name, phone, purpose, and person to meet are required' });
    }

    const tenantId = getTenant(req);
    const count = await VisitorLog.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const visitorId = `VIS-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    const passNumber = `PASS-${Math.floor(100000 + Math.random() * 900000)}`;

    const newVisitor = new VisitorLog({
      visitorId,
      passNumber,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      purpose: purpose.trim(),
      personToMeet: personToMeet.trim(),
      department: department || 'General',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
      idProofType: idProofType || 'Aadhaar Card',
      idProofNumber: idProofNumber ? idProofNumber.trim() : '',
      entryTime: new Date(),
      status: 'Inside',
      isPreRegistered: false,
      approvalStatus: 'Approved',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanId: req.user._id,
      watchmanName: req.user.name || 'Security Guard',
      qrCodeData: JSON.stringify({ passNumber, visitorId, name, phone, purpose, valid: true }),
      notes: notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newVisitor.save();

    // If vehicle entered, log to SecurityVehicleLog automatically
    if (vehicleNumber && vehicleNumber.trim()) {
      try {
        const vehCount = await SecurityVehicleLog.countDocuments();
        await SecurityVehicleLog.create({
          vehicleLogId: `VEH-${dateStr}-${String(vehCount + 1).padStart(3, '0')}`,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          vehicleType: 'Four Wheeler (Car/SUV)',
          driverName: name.trim(),
          driverPhone: phone.trim(),
          purpose: 'Visitor Entry',
          destination: department || 'Campus',
          entryTime: new Date(),
          status: 'Inside',
          gate: gate || 'Gate 1 (Main Entrance)',
          watchmanName: req.user.name || 'Security Guard',
          collegeId: tenantId,
          tenantId: tenantId
        });
      } catch (e) {
        console.warn('Auto vehicle log skipped:', e.message);
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('visitorUpdated', { action: 'entry', visitor: newVisitor });
    }

    res.status(201).json({
      success: true,
      message: 'Visitor entry recorded successfully. Visitor pass generated.',
      data: newVisitor
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record visitor entry', error: err.message });
  }
});

// POST /api/watchman/visitors/:id/exit - Log visitor exit
router.post('/visitors/:id/exit', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const visitor = await VisitorLog.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.status === 'Checked Out') {
      return res.status(400).json({ success: false, message: 'Visitor is already marked as Checked Out' });
    }

    visitor.status = 'Checked Out';
    visitor.exitTime = new Date();
    visitor.exitWatchmanId = req.user._id;
    visitor.exitWatchmanName = req.user.name || 'Security Guard';
    if (req.body.notes) {
      visitor.notes = visitor.notes ? `${visitor.notes} | Exit: ${req.body.notes}` : req.body.notes;
    }

    await visitor.save();

    // If visitor had a vehicle inside, mark it exited too
    if (visitor.vehicleNumber) {
      await SecurityVehicleLog.updateMany(
        { vehicleNumber: visitor.vehicleNumber, status: 'Inside' },
        { $set: { status: 'Exited', exitTime: new Date() } }
      );
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('visitorUpdated', { action: 'exit', visitor });
    }

    res.json({
      success: true,
      message: `Visitor ${visitor.name} marked as Checked Out successfully`,
      data: visitor
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record visitor exit', error: err.message });
  }
});

// GET /api/watchman/visitors/verify/:query - Verify visitor pass or QR data
router.get('/visitors/verify/:query', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const query = req.params.query.trim();
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? {} : { tenantId };

    const visitor = await VisitorLog.findOne({
      ...filter,
      $or: [
        { passNumber: query },
        { visitorId: query },
        { phone: query }
      ]
    });

    if (!visitor) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Invalid Visitor Pass. No record found matching this pass number or QR code.'
      });
    }

    let validationStatus = 'VALID';
    let statusMessage = 'Pass is valid and active.';

    if (visitor.status === 'Checked Out') {
      validationStatus = 'ALREADY_USED';
      statusMessage = `Pass has already been used and checked out on ${new Date(visitor.exitTime).toLocaleString('en-IN')}.`;
    } else if (visitor.status === 'Expired') {
      validationStatus = 'EXPIRED';
      statusMessage = 'Pass has expired.';
    } else if (visitor.status === 'Rejected') {
      validationStatus = 'REJECTED';
      statusMessage = 'Visitor request was rejected.';
    }

    res.json({
      success: true,
      valid: validationStatus === 'VALID',
      validationStatus,
      statusMessage,
      data: visitor
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification error', error: err.message });
  }
});

// GET /api/watchman/visitors/pre-registered - Expected pre-registered visitors
router.get('/visitors/pre-registered', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin'
      ? { isPreRegistered: true }
      : { tenantId, isPreRegistered: true };

    const expected = await VisitorLog.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: expected.length, data: expected });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pre-registered visitors', error: err.message });
  }
});

// POST /api/watchman/visitors/:id/admit - Admit pre-registered visitor
router.post('/visitors/:id/admit', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const visitor = await VisitorLog.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.approvalStatus === 'Rejected') {
      return res.status(400).json({ success: false, message: 'Cannot admit visitor. Approval status is Rejected.' });
    }

    visitor.status = 'Inside';
    visitor.entryTime = new Date();
    visitor.gate = req.body.gate || 'Gate 1 (Main Entrance)';
    visitor.watchmanId = req.user._id;
    visitor.watchmanName = req.user.name || 'Security Guard';
    if (req.body.vehicleNumber) visitor.vehicleNumber = req.body.vehicleNumber.trim().toUpperCase();
    if (req.body.idProofNumber) visitor.idProofNumber = req.body.idProofNumber.trim();

    await visitor.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('visitorUpdated', { action: 'admitted', visitor });
    }

    res.json({
      success: true,
      message: `Pre-registered visitor ${visitor.name} admitted successfully.`,
      data: visitor
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to admit visitor', error: err.message });
  }
});

// GET /api/watchman/visitors/history - Searchable history with date filter
router.get('/visitors/history', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? {} : { tenantId };

    const { search, status, startDate, endDate } = req.query;

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { passNumber: { $regex: q, $options: 'i' } },
        { personToMeet: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { vehicleNumber: { $regex: q, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.entryTime = {};
      if (startDate) filter.entryTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.entryTime.$lte = end;
      }
    }

    const history = await VisitorLog.find(filter).sort({ entryTime: -1 }).limit(300);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 4. PARCEL & DELIVERY OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/parcels - List parcels
router.get('/parcels', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? {} : { tenantId };

    const { status, search } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { recipientName: { $regex: q, $options: 'i' } },
        { trackingNumber: { $regex: q, $options: 'i' } },
        { parcelId: { $regex: q, $options: 'i' } },
        { deliveryCompany: { $regex: q, $options: 'i' } }
      ];
    }

    const parcels = await ParcelLog.find(filter).sort({ receivedAt: -1 }).limit(200);
    res.json({ success: true, count: parcels.length, data: parcels });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch parcels', error: err.message });
  }
});

// POST /api/watchman/parcels - Log incoming parcel
router.post('/parcels', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      deliveryCompany, otherCompany, recipientName, recipientPhone,
      recipientType, department, trackingNumber, parcelDetails, gate, notes
    } = req.body;

    if (!deliveryCompany || !recipientName) {
      return res.status(400).json({ success: false, message: 'Delivery company and recipient name are required' });
    }

    const tenantId = getTenant(req);
    const count = await ParcelLog.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const parcelId = `PCL-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const newParcel = new ParcelLog({
      parcelId,
      deliveryCompany,
      otherCompany: otherCompany || '',
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone ? recipientPhone.trim() : '',
      recipientType: recipientType || 'Staff',
      department: department || 'General',
      trackingNumber: trackingNumber ? trackingNumber.trim() : '',
      parcelDetails: parcelDetails || 'Standard Package',
      receivedAt: new Date(),
      status: 'Received at Gate',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Guard',
      notes: notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newParcel.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('parcelUpdated', { action: 'received', parcel: newParcel });
    }

    res.status(201).json({
      success: true,
      message: `Parcel logged successfully. ID: ${parcelId}`,
      data: newParcel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log parcel', error: err.message });
  }
});

// PATCH /api/watchman/parcels/:id/handover - Mark parcel handed over
router.patch('/parcels/:id/handover', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel record not found' });
    }

    const { handedOverTo } = req.body;
    parcel.status = 'Handed Over';
    parcel.handedOverAt = new Date();
    parcel.handedOverTo = handedOverTo ? handedOverTo.trim() : parcel.recipientName;

    await parcel.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('parcelUpdated', { action: 'handed_over', parcel });
    }

    res.json({
      success: true,
      message: `Parcel handed over to ${parcel.handedOverTo}`,
      data: parcel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update parcel handover', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 5. VEHICLE REGISTER OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/vehicles - List vehicles
router.get('/vehicles', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? {} : { tenantId };

    const { status, search } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { vehicleNumber: { $regex: q, $options: 'i' } },
        { driverName: { $regex: q, $options: 'i' } },
        { purpose: { $regex: q, $options: 'i' } }
      ];
    }

    const vehicles = await SecurityVehicleLog.find(filter).sort({ entryTime: -1 }).limit(200);
    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles', error: err.message });
  }
});

// POST /api/watchman/vehicles/entry - Record vehicle entry
router.post('/vehicles/entry', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, driverName, driverPhone, purpose, destination, gate, notes } = req.body;

    if (!vehicleNumber || !vehicleType || !driverName) {
      return res.status(400).json({ success: false, message: 'Vehicle number, vehicle type, and driver name are required' });
    }

    const tenantId = getTenant(req);
    const count = await SecurityVehicleLog.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const vehicleLogId = `VEH-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const newVehicle = new SecurityVehicleLog({
      vehicleLogId,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      vehicleType,
      driverName: driverName.trim(),
      driverPhone: driverPhone ? driverPhone.trim() : '',
      purpose: purpose || 'Visitor Entry',
      destination: destination || 'Campus Parking',
      entryTime: new Date(),
      status: 'Inside',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Guard',
      notes: notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newVehicle.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicleUpdated', { action: 'entry', vehicle: newVehicle });
    }

    res.status(201).json({
      success: true,
      message: `Vehicle ${vehicleNumber.toUpperCase()} entry recorded.`,
      data: newVehicle
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record vehicle entry', error: err.message });
  }
});

// PATCH /api/watchman/vehicles/:id/exit - Record vehicle exit
router.patch('/vehicles/:id/exit', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const vehicle = await SecurityVehicleLog.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle record not found' });
    }

    vehicle.status = 'Exited';
    vehicle.exitTime = new Date();
    await vehicle.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('vehicleUpdated', { action: 'exit', vehicle });
    }

    res.json({
      success: true,
      message: `Vehicle ${vehicle.vehicleNumber} exit recorded.`,
      data: vehicle
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record vehicle exit', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 6. STUDENT & STAFF MOVEMENT REGISTERS
// ──────────────────────────────────────────────────────────────────────────

// GET & POST /api/watchman/student-register
router.get('/student-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? { personType: 'Student' } : { tenantId, personType: 'Student' };

    const { search, direction } = req.query;
    if (direction && direction !== 'All') filter.direction = direction;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { personId: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ];
    }

    const movements = await CampusGateMovement.find(filter).sort({ timestamp: -1 }).limit(200);
    res.json({ success: true, count: movements.length, data: movements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch student register', error: err.message });
  }
});

router.post('/student-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { personId, name, department, direction, reason, gatePassId, vehicleNumber, gate, remarks } = req.body;

    if (!personId || !name || !direction || !reason) {
      return res.status(400).json({ success: false, message: 'Roll number, student name, direction, and reason are required' });
    }

    const tenantId = getTenant(req);
    const count = await CampusGateMovement.countDocuments();
    const movementId = `STU-MOV-${Date.now().toString().slice(-6)}`;

    const newMovement = new CampusGateMovement({
      movementId,
      personType: 'Student',
      personId: personId.trim().toUpperCase(),
      name: name.trim(),
      department: department || 'General',
      direction,
      reason,
      gatePassId: gatePassId ? gatePassId.trim() : '',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Guard',
      remarks: remarks || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newMovement.save();

    res.status(201).json({
      success: true,
      message: `Student ${direction === 'In' ? 'entry' : 'departure'} recorded successfully`,
      data: newMovement
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record student movement', error: err.message });
  }
});

// GET & POST /api/watchman/staff-register
router.get('/staff-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? { personType: 'Staff' } : { tenantId, personType: 'Staff' };

    const { search, direction } = req.query;
    if (direction && direction !== 'All') filter.direction = direction;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { personId: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ];
    }

    const movements = await CampusGateMovement.find(filter).sort({ timestamp: -1 }).limit(200);
    res.json({ success: true, count: movements.length, data: movements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff register', error: err.message });
  }
});

router.post('/staff-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { personId, name, department, direction, reason, vehicleNumber, gate, remarks } = req.body;

    if (!personId || !name || !direction) {
      return res.status(400).json({ success: false, message: 'Staff ID, staff name, and direction are required' });
    }

    const tenantId = getTenant(req);
    const movementId = `STF-MOV-${Date.now().toString().slice(-6)}`;

    const newMovement = new CampusGateMovement({
      movementId,
      personType: 'Staff',
      personId: personId.trim().toUpperCase(),
      name: name.trim(),
      department: department || 'General',
      direction,
      reason: reason || 'Regular Campus Entry / Exit',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Guard',
      remarks: remarks || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newMovement.save();

    res.status(201).json({
      success: true,
      message: `Staff ${direction === 'In' ? 'entry' : 'exit'} recorded successfully`,
      data: newMovement
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record staff movement', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 7. ATTENDANCE & SHIFT OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/attendance - Get current watchman's attendance history
router.get('/attendance', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'Watchman'
      ? { watchmanId: req.user._id }
      : { collegeId: getTenant(req) };

    const records = await WatchmanAttendance.find(filter).sort({ createdAt: -1 }).limit(60);

    // Check today's active session
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySession = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: todayStr
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      todaySession,
      history: records
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: err.message });
  }
});

// POST /api/watchman/attendance/clock-in
router.post('/attendance/clock-in', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const watchman = await Watchman.findOne({ user: req.user._id });
    const shift = req.body.shift || watchman?.shift || 'Morning';
    const gate = req.body.gate || watchman?.assignedGate || 'Gate 1 (Main Entrance)';

    // Check if already clocked in today without clocking out
    const active = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: todayStr,
      clockOutTime: null
    });

    if (active) {
      return res.status(400).json({ success: false, message: 'You are already clocked in for duty today!' });
    }

    const tenantId = getTenant(req);
    const attendance = new WatchmanAttendance({
      watchmanId: req.user._id,
      watchmanName: req.user.name,
      employeeId: req.user.referenceId || 'WMN-001',
      date: todayStr,
      shift,
      gate,
      clockInTime: new Date(),
      status: 'On Duty',
      notes: req.body.notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: `Clocked in successfully for ${shift} shift at ${gate}`,
      data: attendance
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Clock in failed', error: err.message });
  }
});

// POST /api/watchman/attendance/clock-out
router.post('/attendance/clock-out', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const active = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: todayStr,
      clockOutTime: null
    }).sort({ createdAt: -1 });

    if (!active) {
      return res.status(400).json({ success: false, message: 'No active shift clock-in found to clock out from' });
    }

    const now = new Date();
    active.clockOutTime = now;
    const diffMs = now.getTime() - new Date(active.clockInTime).getTime();
    active.durationMinutes = Math.round(diffMs / (1000 * 60));
    active.status = 'Completed';
    if (req.body.notes) active.notes = active.notes ? `${active.notes} | ${req.body.notes}` : req.body.notes;

    await active.save();

    res.json({
      success: true,
      message: `Clocked out successfully. Total duty duration: ${Math.floor(active.durationMinutes / 60)}h ${active.durationMinutes % 60}m`,
      data: active
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Clock out failed', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 8. EMERGENCY & INCIDENT REPORTS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/incidents - List incidents
router.get('/incidents', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin' ? {} : { tenantId };

    const { status, severity } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (severity && severity !== 'All') filter.severity = severity;

    const incidents = await SecurityIncident.find(filter).sort({ incidentTime: -1 }).limit(100);
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch incidents', error: err.message });
  }
});

// POST /api/watchman/incidents - Report security incident
router.post('/incidents', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { title, category, severity, description, location, actionTaken, gate } = req.body;

    if (!title || !category || !description || !location) {
      return res.status(400).json({ success: false, message: 'Title, category, description, and location are required' });
    }

    const tenantId = getTenant(req);
    const count = await SecurityIncident.countDocuments();
    const incidentId = `INC-${Date.now().toString().slice(-6)}`;

    const newIncident = new SecurityIncident({
      incidentId,
      title: title.trim(),
      category,
      severity: severity || 'Medium',
      description: description.trim(),
      location: location.trim(),
      incidentTime: new Date(),
      status: 'Open',
      reportedBy: req.user.name || 'Security Guard',
      reportedById: req.user._id,
      actionTaken: actionTaken || 'Reported to College Admin and Security Log',
      gate: gate || 'Gate 1 (Main Entrance)',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newIncident.save();

    // Alert Admin via Notification
    const adminUser = await User.findOne({
      role: { $in: ['Admin', 'Super Admin'] },
      tenantId
    });

    if (adminUser) {
      await Notification.create({
        recipient: adminUser._id,
        title: `🚨 Security Incident Reported: ${title}`,
        message: `Severity: ${severity}. Reported at ${location} by ${req.user.name}. Description: ${description}`,
        type: severity === 'Critical' || severity === 'High' ? 'Alert' : 'Warning',
        category: 'security',
        collegeId: tenantId,
        tenantId: tenantId
      });
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('incidentReported', { incident: newIncident });
    }

    res.status(201).json({
      success: true,
      message: `Incident reported successfully. ID: ${incidentId}`,
      data: newIncident
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to report incident', error: err.message });
  }
});

// PATCH /api/watchman/incidents/:id - Update incident status / resolution
router.patch('/incidents/:id', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const incident = await SecurityIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident record not found' });
    }

    const { status, actionTaken, resolutionNotes } = req.body;
    if (status) incident.status = status;
    if (actionTaken) incident.actionTaken = actionTaken;
    if (resolutionNotes) {
      incident.resolutionNotes = resolutionNotes;
      if (status === 'Resolved' || status === 'Closed') {
        incident.resolvedAt = new Date();
        incident.resolvedBy = req.user.name;
      }
    }

    await incident.save();

    res.json({
      success: true,
      message: `Incident status updated to ${incident.status}`,
      data: incident
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update incident', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 9. WATCHMAN NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/notifications
router.get('/notifications', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const notifications = await Notification.find({
      $or: [
        { recipient: req.user._id },
        { collegeId: tenantId, category: { $in: ['security', 'system', 'campus'] } }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 10. WATCHMAN ATTENDANCE & SHIFT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman/attendance
router.get('/attendance', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const today = new Date().toISOString().split('T')[0];

    const records = await WatchmanAttendance.find({
      collegeId: tenantId
    }).sort({ createdAt: -1 }).limit(100).lean();

    const todaySession = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: today,
      clockOutTime: null
    }).lean();

    const formatted = records.map(r => ({
      _id: r._id,
      date: r.date,
      clockIn: r.clockInTime,
      clockOut: r.clockOutTime,
      shift: r.shift,
      assignedGate: r.gate,
      gate: r.gate,
      status: r.status === 'On Duty' ? 'Active' : (r.status === 'Completed' ? 'Completed' : r.status),
      durationMinutes: r.durationMinutes,
      watchmanName: r.watchmanName,
      employeeId: r.employeeId
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: err.message, data: [] });
  }
});

// POST /api/watchman/attendance/clock-in
router.post('/attendance/clock-in', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const today = new Date().toISOString().split('T')[0];

    const existing = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: today,
      clockOutTime: null
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Already clocked in for this shift' });
    }

    const watchman = await Watchman.findOne({ user: req.user._id });
    const shift = req.body.shift || watchman?.shift || 'Morning';
    const gate = req.body.gate || watchman?.assignedGate || 'Gate 1 (Main Entrance)';

    const session = await WatchmanAttendance.create({
      watchmanId: req.user._id,
      watchmanName: req.user.name,
      employeeId: req.user.referenceId || watchman?.employeeId || 'WMN-001',
      date: today,
      shift,
      gate,
      clockInTime: new Date(),
      status: 'On Duty',
      collegeId: tenantId,
      tenantId
    });

    res.status(201).json({ success: true, message: 'Clocked in successfully', data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clock in', error: err.message });
  }
});

// POST /api/watchman/attendance/clock-out
router.post('/attendance/clock-out', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const activeSession = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      clockOutTime: null
    }).sort({ createdAt: -1 });

    if (!activeSession) {
      return res.status(400).json({ success: false, message: 'No active clock-in session found to clock out' });
    }

    const clockOutTime = new Date();
    const durationMinutes = Math.round((clockOutTime - new Date(activeSession.clockInTime)) / 60000);

    activeSession.clockOutTime = clockOutTime;
    activeSession.durationMinutes = durationMinutes;
    activeSession.status = 'Completed';
    await activeSession.save();

    res.json({ success: true, message: 'Clocked out successfully', data: activeSession });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clock out', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 11. STUDENT & STAFF GATE REGISTERS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman/student-register
router.get('/student-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { search, movementType } = req.query;

    const query = {
      collegeId: tenantId,
      personType: 'Student'
    };

    if (movementType) {
      query.direction = movementType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { personId: { $regex: search, $options: 'i' } },
        { movementId: { $regex: search, $options: 'i' } }
      ];
    }

    const movements = await CampusGateMovement.find(query).sort({ timestamp: -1 }).limit(200).lean();

    const formatted = movements.map(m => ({
      _id: m._id,
      movementId: m.movementId,
      studentId: m.personId,
      studentName: m.name,
      department: m.department,
      semester: m.semester || 'Final Year',
      movementType: m.direction,
      reason: m.reason,
      gatePassNumber: m.gatePassId,
      timestamp: m.timestamp,
      remarks: m.remarks
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch student register', error: err.message });
  }
});

// POST /api/watchman/student-register
router.post('/student-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { studentId, studentName, department, semester, movementType, reason, gatePassNumber, remarks } = req.body;

    const movementId = `STU-MOV-${Date.now().toString().slice(-6)}`;

    const newMovement = await CampusGateMovement.create({
      movementId,
      personType: 'Student',
      personId: studentId.trim(),
      name: studentName.trim(),
      department: department || 'General',
      direction: movementType || 'Out',
      reason: reason || 'Day Scholar Departure',
      gatePassId: gatePassNumber || '',
      remarks: remarks || '',
      timestamp: new Date(),
      watchmanName: req.user.name,
      collegeId: tenantId,
      tenantId
    });

    res.status(201).json({ success: true, message: 'Student movement logged', data: newMovement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record student movement', error: err.message });
  }
});

// GET /api/watchman/staff-register
router.get('/staff-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { search, movementType } = req.query;

    const query = {
      collegeId: tenantId,
      personType: 'Staff'
    };

    if (movementType) {
      query.direction = movementType;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { personId: { $regex: search, $options: 'i' } },
        { movementId: { $regex: search, $options: 'i' } }
      ];
    }

    const movements = await CampusGateMovement.find(query).sort({ timestamp: -1 }).limit(200).lean();

    const formatted = movements.map(m => ({
      _id: m._id,
      movementId: m.movementId,
      staffId: m.personId,
      staffName: m.name,
      department: m.department,
      designation: m.designation || 'Faculty',
      movementType: m.direction,
      reason: m.reason,
      passNumber: m.gatePassId,
      timestamp: m.timestamp,
      remarks: m.remarks
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff register', error: err.message });
  }
});

// POST /api/watchman/staff-register
router.post('/staff-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const { staffId, staffName, department, designation, movementType, reason, passNumber, remarks } = req.body;

    const movementId = `STF-MOV-${Date.now().toString().slice(-6)}`;

    const newMovement = await CampusGateMovement.create({
      movementId,
      personType: 'Staff',
      personId: staffId.trim(),
      name: staffName.trim(),
      department: department || 'General',
      direction: movementType || 'In',
      reason: reason || 'Official College Duty',
      gatePassId: passNumber || '',
      remarks: remarks || '',
      timestamp: new Date(),
      watchmanName: req.user.name,
      collegeId: tenantId,
      tenantId
    });

    res.status(201).json({ success: true, message: 'Staff movement logged', data: newMovement });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record staff movement', error: err.message });
  }
});

export default router;
