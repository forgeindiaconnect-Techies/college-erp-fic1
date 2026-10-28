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
      role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal', 'Teacher'] }
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
      .select('_id id name email dept phone designation role')
      .limit(100)
      .lean();

    // Deduplicate by email and staffId, prioritizing User record _id
    const resultMap = new Map();

    users.forEach(u => {
      const staffKey = (u.referenceId || u.email || u._id.toString()).toLowerCase();
      resultMap.set(staffKey, {
        _id: u._id,
        userId: u._id,
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
        // Link to matching User by email, referenceId/id, or exact name
        const matchedUser = users.find(u => 
          (s.email && u.email && u.email.toLowerCase() === s.email.toLowerCase()) ||
          (s.id && u.referenceId && (
            u.referenceId.toLowerCase() === s.id.toLowerCase() ||
            u.referenceId.replace(/[-_\s]/g, '').toLowerCase() === s.id.replace(/[-_\s]/g, '').toLowerCase()
          )) ||
          (s.name && u.name && u.name.trim().toLowerCase() === s.name.trim().toLowerCase())
        );

        const assignedStaffId = s.id || (matchedUser?.referenceId) || `STF-${s._id.toString().slice(-4).toUpperCase()}`;

        resultMap.set(staffKey, {
          _id: matchedUser ? matchedUser._id : s._id,
          userId: matchedUser ? matchedUser._id : null,
          staffId: assignedStaffId,
          name: s.name,
          email: s.email || matchedUser?.email || '',
          department: s.dept || matchedUser?.department || 'General',
          phone: s.phone || matchedUser?.phone || '',
          role: s.role || s.designation || matchedUser?.role || 'Staff'
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
    const isPersonalRecipient = ['Staff', 'Faculty', 'HOD', 'Teacher'].includes(req.user.role);
    const isAdmin = ['Admin', 'Super Admin', 'Sub Admin', 'Principal'].includes(req.user.role);
    const isWatchman = ['Watchman', 'Security', 'Guard'].includes(req.user.role);

    // If an Admin/Principal explicitly requests personal parcels or if user is personal recipient:
    const isSelfView = isPersonalRecipient || (req.query.my === 'true');

    const { status, type, search, staffId, recipientId, startDate, endDate } = req.query;
    let query = {};

    // ── STRICT ACCESS CONTROL FOR RECIPIENTS ──
    // Recipients can ONLY ever access parcels assigned to them (by unique DB ID, staffId, or email)
    if (isSelfView) {
      // Find all linked Staff records by email, referenceId/id, and name
      const staffMatches = await Staff.find({
        $or: [
          ...(req.user.email ? [{ email: req.user.email.toLowerCase().trim() }] : []),
          ...(req.user.referenceId ? [
            { id: req.user.referenceId },
            { id: req.user.referenceId.replace(/[-_\s]/g, '') },
            { id: req.user.referenceId.replace(/^(STF)(.*)$/i, '$1-$2') }
          ] : []),
          ...(req.user.name ? [{ name: { $regex: `^${req.user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : [])
        ]
      }).select('_id id email name').lean().catch(() => []);

      const staffOrConditions = [
        { recipientId: req.user._id }
      ];

      if (req.user.referenceId) {
        staffOrConditions.push({ staffId: req.user.referenceId });
        staffOrConditions.push({ staffId: req.user.referenceId.replace(/[-_\s]/g, '') });
        staffOrConditions.push({ staffId: req.user.referenceId.replace(/^(STF)(.*)$/i, '$1-$2') });
      }
      if (req.user.email) {
        staffOrConditions.push({ recipientEmail: req.user.email.toLowerCase().trim() });
      }

      staffMatches.forEach(s => {
        if (s._id) staffOrConditions.push({ recipientId: s._id });
        if (s.id) {
          staffOrConditions.push({ staffId: s.id });
          staffOrConditions.push({ staffId: s.id.replace(/[-_\s]/g, '') });
          staffOrConditions.push({ staffId: s.id.replace(/^(STF)(.*)$/i, '$1-$2') });
        }
        if (s.email) staffOrConditions.push({ recipientEmail: s.email.toLowerCase().trim() });
      });

      if (req.user.name) {
        staffOrConditions.push({
          recipientName: { $regex: `^${req.user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });
      }

      const tenantId = getTenant(req);
      const collegeFilter = {
        $or: [
          { collegeId: tenantId },
          { tenantId: tenantId },
          { collegeId: 'COL001' },
          { tenantId: 'COL001' },
          { collegeId: null },
          { tenantId: null },
          { collegeId: '' },
          { tenantId: '' },
          { collegeId: { $exists: false } },
          { tenantId: { $exists: false } }
        ]
      };

      query.$and = [
        { $or: staffOrConditions },
        collegeFilter
      ];
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
            { staffId: staffId.replace(/[-_\s]/g, '') },
            { staffId: staffId.replace(/^(STF)(.*)$/i, '$1-$2') },
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
      if (status === 'Received' || status === 'Pending Collection' || status === 'Pending' || status === 'Received at Gate') {
        const statusCond = { status: { $in: ['Pending Collection', 'Received', 'Received at Gate'] } };
        if (query.$and) query.$and.push(statusCond);
        else query.status = statusCond.status;
      } else if (status === 'Collected' || status === 'Handed Over') {
        const statusCond = { status: { $in: ['Collected', 'Handed Over'] } };
        if (query.$and) query.$and.push(statusCond);
        else query.status = statusCond.status;
      } else {
        if (query.$and) query.$and.push({ status });
        else query.status = status;
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

    // Strict security check for Staff / HOD
    const isPersonalRecipient = ['Staff', 'Faculty', 'HOD', 'Teacher'].includes(req.user.role);
    const isAdmin = ['Admin', 'Super Admin', 'Sub Admin', 'Principal'].includes(req.user.role);
    const isWatchman = ['Watchman', 'Security', 'Guard'].includes(req.user.role);

    if (isPersonalRecipient && !isAdmin && !isWatchman) {
      const linkedStaff = await Staff.findOne({
        $or: [
          { email: req.user.email },
          ...(req.user.referenceId ? [{ id: req.user.referenceId }] : [])
        ]
      }).select('_id id email').lean().catch(() => null);

      const isOwner = (parcel.recipientId && (
          parcel.recipientId._id?.toString() === req.user._id.toString() ||
          parcel.recipientId.toString() === req.user._id.toString() ||
          (linkedStaff && parcel.recipientId.toString() === linkedStaff._id.toString())
        )) ||
        (req.user.referenceId && parcel.staffId === req.user.referenceId) ||
        (linkedStaff?.id && parcel.staffId === linkedStaff.id) ||
        (req.user.email && parcel.recipientEmail?.toLowerCase() === req.user.email.toLowerCase()) ||
        (linkedStaff?.email && parcel.recipientEmail?.toLowerCase() === linkedStaff.email.toLowerCase());

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
      recipientType,
      department,
      trackingNumber,
      parcelDetails,
      receivedAt,
      gate,
      notes
    } = req.body;

    const effectiveCompany = deliveryCompany || req.body.courier || req.body.company || senderName || '';
    const effectiveSender = senderName || deliveryCompany || req.body.courier || '';
    const effectiveTracking = (trackingNumber || req.body.awb || req.body.tracking || '').trim();

    if (!recipientName && !staffId && !recipientId && !recipientEmail) {
      return res.status(400).json({ success: false, message: 'Please select or specify a recipient staff member.' });
    }
    if (!effectiveCompany && !effectiveSender) {
      return res.status(400).json({ success: false, message: 'Courier or Delivery company name is required.' });
    }

    // ── Duplicate Check on Tracking / AWB Number (If provided) ──
    if (effectiveTracking) {
      const existingActiveParcel = await ParcelLog.findOne({
        trackingNumber: { $regex: new RegExp(`^${effectiveTracking.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        status: { $in: ['Received', 'Received at Gate', 'Pending Collection'] }
      });
      if (existingActiveParcel) {
        return res.status(400).json({
          success: false,
          message: `A delivery/parcel with Tracking / AWB number "${effectiveTracking}" is already registered at the gate and awaiting collection (ID: ${existingActiveParcel.parcelId}, Recipient: ${existingActiveParcel.recipientName}).`
        });
      }
    }

    const tenantId = getTenant(req);

    // ── Robust Cascading Recipient Resolution ──
    let resolvedUser = null;
    let resolvedStaff = null;

    // Check for bracketed ID in recipientName, e.g. "Ananya [HOD001]" or "Dr. Ramoorthy [STF-0182]"
    let extractedId = '';
    if (recipientName) {
      const match = recipientName.match(/\[(.*?)\]/) || recipientName.match(/\((.*?)\)/);
      if (match && match[1]) {
        extractedId = match[1].trim();
      }
    }

    const targetStaffId = (staffId || extractedId || '').trim();
    const cleanName = recipientName ? recipientName.replace(/\[.*?\]|\(.*?\)/g, '').trim() : '';
    const targetEmail = (recipientEmail || (recipientName && recipientName.includes('@') ? recipientName.trim() : '')).toLowerCase().trim();

    // 1. Try recipientId in User collection or Staff collection
    if (recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
      resolvedUser = await User.findById(recipientId);
      if (!resolvedUser) {
        resolvedStaff = await Staff.findById(recipientId);
      }
    }

    // 2. Try targetStaffId across User & Staff with hyphen tolerance
    if (targetStaffId) {
      const idVariants = [
        targetStaffId,
        targetStaffId.replace(/[-_\s]/g, ''),
        targetStaffId.replace(/^(STF)(.*)$/i, '$1-$2')
      ];
      if (!resolvedUser) {
        resolvedUser = await User.findOne({ referenceId: { $in: idVariants } });
      }
      if (!resolvedStaff) {
        resolvedStaff = await Staff.findOne({ id: { $in: idVariants } });
      }
    }

    // 3. Try targetEmail
    if (targetEmail) {
      if (!resolvedUser) resolvedUser = await User.findOne({ email: targetEmail });
      if (!resolvedStaff) resolvedStaff = await Staff.findOne({ email: targetEmail });
    }

    // 4. Try exact recipientName
    if (cleanName) {
      if (!resolvedUser) {
        resolvedUser = await User.findOne({
          name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
          role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal', 'Teacher'] }
        });
      }
      if (!resolvedStaff) {
        resolvedStaff = await Staff.findOne({
          name: { $regex: `^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
        });
      }
    }

    // Cross-link User and Staff
    if (resolvedStaff && !resolvedUser) {
      resolvedUser = await User.findOne({
        $or: [
          ...(resolvedStaff.email ? [{ email: resolvedStaff.email.toLowerCase().trim() }] : []),
          ...(resolvedStaff.id ? [
            { referenceId: resolvedStaff.id },
            { referenceId: resolvedStaff.id.replace(/[-_\s]/g, '') },
            { referenceId: resolvedStaff.id.replace(/^(STF)(.*)$/i, '$1-$2') }
          ] : []),
          ...(resolvedStaff.name ? [{ name: { $regex: `^${resolvedStaff.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : [])
        ]
      });
    } else if (resolvedUser && !resolvedStaff) {
      resolvedStaff = await Staff.findOne({
        $or: [
          ...(resolvedUser.email ? [{ email: resolvedUser.email.toLowerCase().trim() }] : []),
          ...(resolvedUser.referenceId ? [
            { id: resolvedUser.referenceId },
            { id: resolvedUser.referenceId.replace(/[-_\s]/g, '') },
            { id: resolvedUser.referenceId.replace(/^(STF)(.*)$/i, '$1-$2') }
          ] : []),
          ...(resolvedUser.name ? [{ name: { $regex: `^${resolvedUser.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : [])
        ]
      });
    }

    // Extract finalized recipient values preserving unique staffId and recipientId
    const finalStaffId = targetStaffId || resolvedStaff?.id || resolvedUser?.referenceId || '';
    const finalRecipientId = resolvedUser ? resolvedUser._id : (resolvedStaff ? resolvedStaff._id : (recipientId && mongoose.Types.ObjectId.isValid(recipientId) ? recipientId : null));
    const finalRecipientName = resolvedUser?.name || resolvedStaff?.name || cleanName || 'Campus Staff';
    const finalRecipientEmail = resolvedUser?.email || resolvedStaff?.email || targetEmail || '';
    const finalRecipientPhone = resolvedUser?.phone || resolvedStaff?.phone || recipientPhone || '';
    const finalDepartment = resolvedUser?.department || resolvedStaff?.dept || department || 'General';
    let finalRecipientType = recipientType || resolvedUser?.role || resolvedStaff?.designation || (finalStaffId.startsWith('HOD') ? 'HOD' : 'Staff');
    if (!['Staff', 'Faculty', 'HOD', 'Department', 'Student', 'Hostel Warden', 'Principal', 'Principal / Admin', 'Other'].includes(finalRecipientType)) {
      finalRecipientType = finalRecipientType === 'Principal' ? 'Principal' : (finalRecipientType === 'HOD' ? 'HOD' : 'Staff');
    }

    // Sync referenceId onto User record if it was empty
    if (resolvedUser && finalStaffId && (!resolvedUser.referenceId || resolvedUser.referenceId !== finalStaffId)) {
      try {
        await User.findByIdAndUpdate(resolvedUser._id, { referenceId: finalStaffId });
      } catch (_) {}
    }

    const collegeId = resolvedUser?.collegeId || resolvedUser?.tenantId || tenantId;

    // Generate collision-free unique Parcel ID
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = type === 'Delivery' ? 'DEL' : 'PCL';
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const parcelId = `${prefix}-${dateStr}-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const newParcel = new ParcelLog({
      parcelId,
      type: type === 'Delivery' ? 'Delivery' : 'Parcel',
      deliveryCompany: effectiveCompany,
      senderName: effectiveSender,
      otherCompany: otherCompany || '',
      recipientId: finalRecipientId,
      staffId: finalStaffId,
      recipientName: finalRecipientName,
      recipientEmail: finalRecipientEmail,
      recipientPhone: finalRecipientPhone,
      recipientType: finalRecipientType,
      department: finalDepartment,
      trackingNumber: effectiveTracking,
      parcelDetails: parcelDetails ? parcelDetails.trim() : (type === 'Delivery' ? 'Food / Important Delivery' : 'Standard Courier Parcel'),
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      status: 'Pending Collection',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Staff',
      watchmanId: req.user._id,
      notes: notes ? notes.trim() : '',
      collegeId: collegeId,
      tenantId: collegeId
    });

    await newParcel.save();

    // ── Create in-app Notification strictly for the recipient ──
    if (finalRecipientId) {
      try {
        const destLink = finalRecipientType === 'HOD' ? '/hod/parcels' : '/staff/parcels';
        await Notification.create({
          recipient: finalRecipientId,
          title: `📦 New ${type} Arrived at Campus Gate`,
          message: `Your ${type.toLowerCase()} from ${newParcel.deliveryCompany}${newParcel.trackingNumber ? ` (Tracking: ${newParcel.trackingNumber})` : ''} has been received at ${newParcel.gate}. Please collect it from security.`,
          type: 'Info',
          category: 'delivery',
          link: destLink,
          collegeId: collegeId,
          tenantId: collegeId
        });
      } catch (notifErr) {
        console.warn('Could not create notification for staff recipient:', notifErr.message);
      }
    }

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'created', parcel: newParcel, recipientId: finalRecipientId, staffId: finalStaffId });
      io.emit('dataUpdated', { module: 'parcel', action: 'created', data: newParcel, recipientId: finalRecipientId, staffId: finalStaffId });
      io.emit('dataUpdated', { module: 'watchman', action: 'parcel_received', data: newParcel, recipientId: finalRecipientId, staffId: finalStaffId });
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
// Both Recipients (confirming self-collection) and Watchman/Admin (confirming gate handover) use this
router.patch('/:id/collect', protect, async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Delivery / Parcel record not found' });
    }

    const isPersonalRecipient = ['Staff', 'Faculty', 'HOD', 'Teacher'].includes(req.user.role);
    const isAdmin = ['Admin', 'Super Admin', 'Sub Admin', 'Principal'].includes(req.user.role);
    const isWatchman = ['Watchman', 'Security', 'Guard'].includes(req.user.role);

    // If Recipient is confirming collection, verify it is strictly their own parcel
    if (isPersonalRecipient && !isAdmin && !isWatchman) {
      const staffMatches = await Staff.find({
        $or: [
          ...(req.user.email ? [{ email: req.user.email.toLowerCase().trim() }] : []),
          ...(req.user.referenceId ? [
            { id: req.user.referenceId },
            { id: req.user.referenceId.replace(/[-_\s]/g, '') },
            { id: req.user.referenceId.replace(/^(STF)(.*)$/i, '$1-$2') }
          ] : []),
          ...(req.user.name ? [{ name: { $regex: `^${req.user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }] : [])
        ]
      }).select('_id id email name').lean().catch(() => []);

      const validRecipientIds = [req.user._id.toString(), ...staffMatches.map(s => s._id.toString())];
      const validStaffIds = [
        req.user.referenceId,
        req.user.referenceId?.replace(/[-_\s]/g, ''),
        req.user.referenceId?.replace(/^(STF)(.*)$/i, '$1-$2'),
        ...staffMatches.flatMap(s => [s.id, s.id?.replace(/[-_\s]/g, ''), s.id?.replace(/^(STF)(.*)$/i, '$1-$2')])
      ].filter(Boolean).map(x => x.toLowerCase());

      const validEmails = [
        req.user.email?.toLowerCase().trim(),
        ...staffMatches.map(s => s.email?.toLowerCase().trim())
      ].filter(Boolean);

      const isOwner =
        (parcel.recipientId && validRecipientIds.includes(parcel.recipientId.toString())) ||
        (parcel.staffId && validStaffIds.includes(parcel.staffId.toLowerCase())) ||
        (parcel.recipientEmail && validEmails.includes(parcel.recipientEmail.toLowerCase())) ||
        (parcel.recipientName && req.user.name && parcel.recipientName.trim().toLowerCase() === req.user.name.trim().toLowerCase());

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
      io.emit('dataUpdated', { module: 'watchman', action: 'parcel_collected', data: parcel });
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
