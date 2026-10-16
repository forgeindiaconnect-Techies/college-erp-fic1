import express from 'express';
import mongoose from 'mongoose';
import ParcelLog from '../models/ParcelLog.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import Notification from '../models/Notification.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to determine college tenant
const getTenant = (req) => {
  return req.collegeId || req.user?.tenantId || req.user?.collegeId || 'COL001';
};

// ── 1. GET STAFF DIRECTORY FOR WATCHMAN & ADMIN DROPDOWN ────────────────────
// Allows instant search & selection of staff by Name, Staff ID, or Department
router.get('/staff-directory', protect, async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const search = (req.query.q || '').trim();

    // Query User collection for Staff, Faculty, HODs, Principals
    let userQuery = {
      role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal'] }
    };

    if (req.user?.role !== 'Super Admin' && tenantId && tenantId !== 'system') {
      userQuery.$or = [
        { tenantId },
        { collegeId: tenantId },
        { tenantId: 'COL001' },
        { tenantId: 'unassigned_college' },
        { tenantId: null },
        { tenantId: { $exists: false } }
      ];
    }

    if (search) {
      const sRegex = { $regex: search, $options: 'i' };
      const searchMatch = [
        { name: sRegex },
        { email: sRegex },
        { referenceId: sRegex },
        { department: sRegex }
      ];
      if (userQuery.$or) {
        userQuery = { $and: [{ $or: userQuery.$or }, { $or: searchMatch }] };
      } else {
        userQuery.$or = searchMatch;
      }
    }

    const users = await User.find(userQuery)
      .select('_id name email role department referenceId phone')
      .limit(100)
      .lean();

    // Also check Staff collection for any additional records
    let staffQuery = {};
    if (search) {
      staffQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { dept: { $regex: search, $options: 'i' } }
      ];
    }
    const staffDocs = await Staff.find(staffQuery)
      .select('_id id name email dept phone designation')
      .limit(100)
      .lean();

    // Deduplicate by email and staffId
    const resultMap = new Map();

    users.forEach(u => {
      const staffKey = (u.referenceId || u.email || u._id.toString()).toLowerCase();
      resultMap.set(staffKey, {
        _id: u._id,
        staffId: u.referenceId || `STF-${u._id.toString().slice(-4).toUpperCase()}`,
        name: u.name,
        email: u.email,
        department: u.department || 'General',
        phone: u.phone || '',
        role: u.role
      });
    });

    staffDocs.forEach(s => {
      const staffKey = (s.id || s.email || s._id.toString()).toLowerCase();
      if (!resultMap.has(staffKey)) {
        resultMap.set(staffKey, {
          _id: s._id,
          staffId: s.id || `STF-${s._id.toString().slice(-4).toUpperCase()}`,
          name: s.name,
          email: s.email,
          department: s.dept || 'General',
          phone: s.phone || '',
          role: s.role || 'Staff'
        });
      }
    });

    const staffList = Array.from(resultMap.values());
    res.json({ success: true, count: staffList.length, data: staffList });
  } catch (err) {
    console.error('Error fetching staff directory for parcels:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff directory', error: err.message });
  }
});

// ── 2. GET ALL DELIVERIES & PARCELS (WITH STRICT ROLE-BASED ACCESS CONTROL) ──
router.get('/', protect, async (req, res) => {
  try {
    const isStaff = req.user.role === 'Staff' || req.user.role === 'Faculty';
    const isAdmin = ['Admin', 'Super Admin', 'Sub Admin', 'Principal'].includes(req.user.role);
    const isWatchman = ['Watchman', 'Security', 'Guard'].includes(req.user.role);

    const { status, type, search, staffId, recipientId, startDate, endDate } = req.query;
    let query = {};

    // ── STRICT ACCESS CONTROL FOR STAFF ──
    // Staff members can ONLY ever access parcels assigned to them
    if (isStaff) {
      const staffOrConditions = [
        { recipientId: req.user._id }
      ];

      if (req.user.referenceId) {
        staffOrConditions.push({ staffId: req.user.referenceId });
      }
      if (req.user.email) {
        staffOrConditions.push({ recipientEmail: req.user.email.toLowerCase().trim() });
      }
      if (req.user.name) {
        staffOrConditions.push({ recipientName: { $regex: `^${req.user.name.trim()}$`, $options: 'i' } });
      }

      query.$or = staffOrConditions;
    } else if (isAdmin || isWatchman) {
      // Admin and Watchman see all parcels for their institution
      const tenantId = getTenant(req);
      if (req.user.role !== 'Super Admin' && tenantId && tenantId !== 'system') {
        const allowedTenants = [tenantId, 'COL001', 'mock_college_id', 'unassigned_college', null];
        query.$or = [
          { tenantId: { $in: allowedTenants } },
          { collegeId: { $in: allowedTenants } },
          { tenantId: { $exists: false } }
        ];
      }

      // Filter by specific staff ID if requested by Admin
      if (staffId && staffId !== 'All') {
        const staffFilter = {
          $or: [
            { staffId: staffId },
            { recipientId: mongoose.Types.ObjectId.isValid(staffId) ? staffId : null }
          ]
        };
        if (query.$or) {
          query.$and = [{ $or: query.$or }, staffFilter];
          delete query.$or;
        } else {
          query.$or = staffFilter.$or;
        }
      }
    } else {
      return res.status(403).json({ success: false, message: 'Access denied to Delivery & Parcel registers.' });
    }

    // Filter by Delivery Type (Delivery or Parcel)
    if (type && type !== 'All') {
      query.type = type;
    }

    // Filter by Status (normalize 'Pending Collection' and legacy statuses)
    if (status && status !== 'All') {
      if (status === 'Received') {
        query.status = { $in: ['Received', 'Received at Gate'] };
      } else if (status === 'Pending Collection') {
        query.status = { $in: ['Pending Collection', 'Received', 'Received at Gate'] };
      } else if (status === 'Collected') {
        query.status = { $in: ['Collected', 'Handed Over'] };
      } else {
        query.status = status;
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.receivedAt = {};
      if (startDate) query.receivedAt.$gte = new Date(startDate);
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        query.receivedAt.$lte = endD;
      }
    }

    // Search filter
    if (search && search.trim()) {
      const q = search.trim();
      const sConditions = [
        { parcelId: { $regex: q, $options: 'i' } },
        { trackingNumber: { $regex: q, $options: 'i' } },
        { recipientName: { $regex: q, $options: 'i' } },
        { staffId: { $regex: q, $options: 'i' } },
        { deliveryCompany: { $regex: q, $options: 'i' } },
        { senderName: { $regex: q, $options: 'i' } },
        { parcelDetails: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } }
      ];

      if (query.$and) {
        query.$and.push({ $or: sConditions });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: sConditions }];
        delete query.$or;
      } else {
        query.$or = sConditions;
      }
    }

    const parcels = await ParcelLog.find(query)
      .sort({ receivedAt: -1 })
      .limit(300)
      .populate('recipientId', 'name email department referenceId phone')
      .populate('collectedById', 'name email role')
      .lean();

    // Map/normalize status for consistent frontend display
    const formattedParcels = parcels.map(p => {
      let normalizedStatus = p.status;
      if (p.status === 'Handed Over') normalizedStatus = 'Collected';
      else if (p.status === 'Received at Gate') normalizedStatus = 'Pending Collection';

      return {
        ...p,
        normalizedStatus,
        type: p.type || 'Parcel',
        senderOrCourier: p.senderName || p.deliveryCompany || 'Courier Service'
      };
    });

    res.json({
      success: true,
      count: formattedParcels.length,
      data: formattedParcels
    });
  } catch (err) {
    console.error('Error in GET /api/parcels:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve deliveries & parcels', error: err.message });
  }
});

// ── 3. GET SINGLE PARCEL BY ID (STRICT ACCESS CHECK) ────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id)
      .populate('recipientId', 'name email department referenceId phone')
      .populate('collectedById', 'name email role')
      .lean();

    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Delivery / Parcel record not found' });
    }

    // Strict security check for Staff
    const isStaff = req.user.role === 'Staff' || req.user.role === 'Faculty';
    if (isStaff) {
      const isOwner = (parcel.recipientId && parcel.recipientId._id?.toString() === req.user._id.toString()) ||
        (parcel.recipientId && parcel.recipientId.toString() === req.user._id.toString()) ||
        (req.user.referenceId && parcel.staffId === req.user.referenceId) ||
        (req.user.email && parcel.recipientEmail?.toLowerCase() === req.user.email.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You are not authorized to view this delivery/parcel.'
        });
      }
    }

    res.json({ success: true, data: parcel });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching parcel', error: err.message });
  }
});

// ── 4. REGISTER NEW DELIVERY OR PARCEL (ADMIN & WATCHMAN) ───────────────────
router.post('/', protect, authorize('Watchman', 'Admin', 'Super Admin', 'Sub Admin', 'Security', 'Guard'), async (req, res) => {
  try {
    const {
      type = 'Parcel',
      deliveryCompany,
      senderName,
      otherCompany,
      recipientId,
      staffId,
      recipientName,
      recipientPhone,
      recipientEmail,
      department,
      trackingNumber,
      parcelDetails,
      receivedAt,
      gate,
      notes
    } = req.body;

    if (!recipientName && !staffId && !recipientId) {
      return res.status(400).json({ success: false, message: 'Please select or specify a recipient staff member.' });
    }
    if (!deliveryCompany && !senderName) {
      return res.status(400).json({ success: false, message: 'Courier or Sender name is required.' });
    }

    const tenantId = getTenant(req);

    // ── Resolve Staff Member's Unique Database Reference ──
    let resolvedUser = null;
    let finalStaffId = staffId || '';
    let finalRecipientName = recipientName ? recipientName.trim() : '';
    let finalRecipientEmail = recipientEmail ? recipientEmail.trim() : '';
    let finalRecipientPhone = recipientPhone ? recipientPhone.trim() : '';
    let finalDepartment = department || 'General';
    let finalRecipientId = null;

    if (recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
      resolvedUser = await User.findById(recipientId);
    } else if (staffId) {
      resolvedUser = await User.findOne({
        $or: [{ referenceId: staffId }, { _id: mongoose.Types.ObjectId.isValid(staffId) ? staffId : null }]
      });
      if (!resolvedUser) {
        const staffRecord = await Staff.findOne({ id: staffId });
        if (staffRecord) {
          finalStaffId = staffRecord.id;
          finalRecipientName = staffRecord.name;
          finalRecipientEmail = staffRecord.email;
          finalRecipientPhone = staffRecord.phone || '';
          finalDepartment = staffRecord.dept || 'General';
          finalRecipientId = staffRecord._id;
        }
      }
    } else if (recipientName) {
      resolvedUser = await User.findOne({
        name: { $regex: `^${recipientName.trim()}$`, $options: 'i' },
        role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal'] }
      });
    }

    if (resolvedUser) {
      finalRecipientId = resolvedUser._id;
      finalStaffId = resolvedUser.referenceId || finalStaffId || `STF-${resolvedUser._id.toString().slice(-4).toUpperCase()}`;
      finalRecipientName = resolvedUser.name;
      finalRecipientEmail = resolvedUser.email;
      finalRecipientPhone = resolvedUser.phone || finalRecipientPhone;
      finalDepartment = resolvedUser.department || finalDepartment;
    }

    // Generate unique Parcel ID
    const count = await ParcelLog.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = type === 'Delivery' ? 'DEL' : 'PCL';
    const parcelId = `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const newParcel = new ParcelLog({
      parcelId,
      type: type === 'Delivery' ? 'Delivery' : 'Parcel',
      deliveryCompany: deliveryCompany || senderName || 'Courier',
      senderName: senderName || deliveryCompany || '',
      otherCompany: otherCompany || '',
      recipientId: finalRecipientId,
      staffId: finalStaffId,
      recipientName: finalRecipientName,
      recipientEmail: finalRecipientEmail,
      recipientPhone: finalRecipientPhone,
      recipientType: 'Staff',
      department: finalDepartment,
      trackingNumber: trackingNumber ? trackingNumber.trim() : '',
      parcelDetails: parcelDetails ? parcelDetails.trim() : (type === 'Delivery' ? 'Food / Important Delivery' : 'Standard Courier Parcel'),
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      status: 'Pending Collection',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Staff',
      watchmanId: req.user._id,
      notes: notes ? notes.trim() : '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newParcel.save();

    // ── Create in-app Notification for the recipient staff ──
    if (finalRecipientId) {
      try {
        await Notification.create({
          recipient: finalRecipientId,
          title: `📦 New ${type} Arrived at Campus Gate`,
          message: `Your ${type.toLowerCase()} from ${newParcel.deliveryCompany}${newParcel.trackingNumber ? ` (Tracking: ${newParcel.trackingNumber})` : ''} has been received at ${newParcel.gate}. Please collect it from security.`,
          type: 'Info',
          category: 'delivery',
          link: '/staff/parcels',
          collegeId: tenantId,
          tenantId: tenantId
        });
      } catch (notifErr) {
        console.warn('Could not create notification for staff recipient:', notifErr.message);
      }
    }

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'created', parcel: newParcel });
      io.emit('dataUpdated', { module: 'parcel', action: 'created', data: newParcel });
    }

    res.status(201).json({
      success: true,
      message: `${type} registered successfully for ${finalRecipientName} (ID: ${parcelId})`,
      data: newParcel
    });
  } catch (err) {
    console.error('Error creating parcel/delivery:', err);
    res.status(500).json({ success: false, message: 'Failed to register delivery/parcel', error: err.message });
  }
});

// ── 5. CONFIRM COLLECTION / HANDOVER (STAFF OR ADMIN/WATCHMAN) ─────────────
// Both Staff (confirming self-collection) and Watchman/Admin (confirming gate handover) use this
router.patch('/:id/collect', protect, async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Delivery / Parcel record not found' });
    }

    const isStaff = req.user.role === 'Staff' || req.user.role === 'Faculty';
    const isAdmin = ['Admin', 'Super Admin', 'Sub Admin', 'Principal'].includes(req.user.role);
    const isWatchman = ['Watchman', 'Security', 'Guard'].includes(req.user.role);

    // If Staff is confirming collection, verify it is their own parcel
    if (isStaff) {
      const isOwner = (parcel.recipientId && parcel.recipientId.toString() === req.user._id.toString()) ||
        (req.user.referenceId && parcel.staffId === req.user.referenceId) ||
        (req.user.email && parcel.recipientEmail?.toLowerCase() === req.user.email.toLowerCase()) ||
        (parcel.recipientName?.toLowerCase() === req.user.name?.toLowerCase());

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You cannot collect or confirm another staff member’s delivery.'
        });
      }
    }

    const { collectedBy, notes } = req.body;
    const now = new Date();

    parcel.status = 'Collected';
    parcel.collectedAt = now;
    parcel.collectedBy = collectedBy ? collectedBy.trim() : req.user.name;
    parcel.collectedById = req.user._id;
    parcel.handedOverAt = now;
    parcel.handedOverTo = parcel.collectedBy;

    if (notes) {
      parcel.notes = parcel.notes ? `${parcel.notes}\n[Collection Note]: ${notes}` : `[Collection Note]: ${notes}`;
    }

    await parcel.save();

    // Broadcast live update
    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'collected', parcel });
      io.emit('dataUpdated', { module: 'parcel', action: 'collected', data: parcel });
    }

    res.json({
      success: true,
      message: `Delivery / Parcel marked as Collected by ${parcel.collectedBy}`,
      data: parcel
    });
  } catch (err) {
    console.error('Error confirming parcel collection:', err);
    res.status(500).json({ success: false, message: 'Failed to update collection status', error: err.message });
  }
});

// Legacy endpoint support for watchman handover
router.patch('/:id/handover', protect, authorize('Watchman', 'Admin', 'Super Admin', 'Security', 'Guard'), async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel record not found' });
    }

    const { handedOverTo, notes } = req.body;
    const now = new Date();

    parcel.status = 'Collected';
    parcel.handedOverAt = now;
    parcel.handedOverTo = handedOverTo ? handedOverTo.trim() : parcel.recipientName;
    parcel.collectedAt = now;
    parcel.collectedBy = parcel.handedOverTo;
    parcel.collectedById = req.user._id;

    if (notes) {
      parcel.notes = parcel.notes ? `${parcel.notes} | ${notes}` : notes;
    }

    await parcel.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'collected', parcel });
      io.emit('dataUpdated', { module: 'parcel', action: 'collected', data: parcel });
    }

    res.json({
      success: true,
      message: `Parcel handed over to ${parcel.handedOverTo}`,
      data: parcel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to handover parcel', error: err.message });
  }
});

// ── 6. UPDATE PARCEL DETAILS (ADMIN / WATCHMAN) ──────────────────────────────
router.patch('/:id', protect, authorize('Admin', 'Super Admin', 'Sub Admin', 'Watchman'), async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Delivery / Parcel record not found' });
    }

    const {
      type, deliveryCompany, senderName, trackingNumber,
      parcelDetails, status, notes, gate
    } = req.body;

    if (type) parcel.type = type;
    if (deliveryCompany) parcel.deliveryCompany = deliveryCompany;
    if (senderName !== undefined) parcel.senderName = senderName;
    if (trackingNumber !== undefined) parcel.trackingNumber = trackingNumber;
    if (parcelDetails !== undefined) parcel.parcelDetails = parcelDetails;
    if (gate) parcel.gate = gate;
    if (notes !== undefined) parcel.notes = notes;

    if (status) {
      parcel.status = status;
      if (status === 'Collected' && !parcel.collectedAt) {
        parcel.collectedAt = new Date();
        parcel.collectedBy = req.user.name;
        parcel.collectedById = req.user._id;
        parcel.handedOverAt = parcel.collectedAt;
        parcel.handedOverTo = parcel.collectedBy;
      }
    }

    await parcel.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'updated', parcel });
      io.emit('dataUpdated', { module: 'parcel', action: 'updated', data: parcel });
    }

    res.json({
      success: true,
      message: 'Delivery / Parcel updated successfully',
      data: parcel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update record', error: err.message });
  }
});

// ── 7. DELETE RECORD (ADMIN ONLY) ───────────────────────────────────────────
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const parcel = await ParcelLog.findByIdAndDelete(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'deleted', id: req.params.id });
      io.emit('dataUpdated', { module: 'parcel', action: 'deleted', id: req.params.id });
    }

    res.json({ success: true, message: 'Delivery / Parcel record removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete record', error: err.message });
  }
});

export default router;
