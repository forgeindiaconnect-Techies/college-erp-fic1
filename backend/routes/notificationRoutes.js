import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, collegeScope } from '../middleware/authMiddleware.js';
import { checkCollegeStatus } from '../middleware/checkCollegeStatus.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Helper to build strictly isolated query for user
const buildUserQuery = (req) => {
  const userRole = req.user.role;
  const userId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
  const tenantId = req.collegeId || req.user.tenantId || req.user.collegeId;

  // 1. Super Admin: full visibility, with optional college filter via query params
  if (userRole === 'Super Admin') {
    const filterTenant = req.query.tenantId || req.query.collegeId;
    if (filterTenant && filterTenant !== 'all' && filterTenant !== 'system') {
      return {
        $or: [{ collegeId: filterTenant }, { tenantId: filterTenant }]
      };
    }
    return {};
  }

  // 2. Exact role matches - strictly avoid leaking Admin circulars to non-admin roles
  const roleMatches = [userRole, userRole?.toLowerCase(), 'All', 'All Roles', 'Entire College'];
  if (userRole === 'Admin') {
    roleMatches.push('admin');
  }

  const roleOrUserFilter = {
    $or: [
      { recipient: userId },
      { receiverId: userId },
      { targetRoles: { $in: roleMatches } },
      { receiverRole: { $in: [userRole, userRole?.toLowerCase()] } }
    ]
  };

  // 3. Strict College Isolation: Regular users can NEVER access notifications from other colleges
  if (tenantId && tenantId !== 'system') {
    return {
      $and: [
        { $or: [{ collegeId: tenantId }, { tenantId }] },
        roleOrUserFilter
      ]
    };
  }

  // Fallback for unassigned user: only direct personal notifications
  return {
    $or: [
      { recipient: userId },
      { receiverId: userId }
    ]
  };
};

// @desc    Get user notifications (supports pagination & category filter)
// @route   GET /api/notifications
// @access  Private (College Deactivation Enforced)
router.get('/', protect, checkCollegeStatus, collegeScope, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    const category = req.query.category;

    const query = buildUserQuery(req);
    if (category && category !== 'all' && category !== 'All') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    const totalCount = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userIdStr = req.user._id ? req.user._id.toString() : req.user.id?.toString();

    const mapped = notifications.map(n => {
      const obj = n.toObject();
      obj.isRead = Array.isArray(obj.readBy) && obj.readBy.some(id => id.toString() === userIdStr);
      return obj;
    });

    const unreadCount = await Notification.countDocuments({
      ...query,
      readBy: { $ne: req.user._id }
    });

    res.json({
      notifications: mapped,
      totalCount,
      unreadCount,
      page,
      pages: Math.ceil(totalCount / limit) || 1
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server Error fetching notifications' });
  }
});

// @desc    Get only unread user notifications
// @route   GET /api/notifications/unread
// @access  Private
router.get('/unread', protect, checkCollegeStatus, collegeScope, async (req, res) => {
  try {
    const query = {
      ...buildUserQuery(req),
      readBy: { $ne: req.user._id }
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    const mapped = notifications.map(n => {
      const obj = n.toObject();
      obj.isRead = false;
      return obj;
    });

    res.json({
      unreadCount: mapped.length,
      notifications: mapped
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ message: 'Server Error fetching unread notifications' });
  }
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put('/:id/read', protect, checkCollegeStatus, collegeScope, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Server-side authorization check: prevent unauthorized or cross-college tampering
    if (req.user.role !== 'Super Admin') {
      const userTenant = req.collegeId || req.user.tenantId || req.user.collegeId;
      const notifTenant = notification.tenantId || notification.collegeId;
      if (userTenant && notifTenant && notifTenant !== 'system' && notifTenant !== userTenant) {
        return res.status(403).json({ message: 'Unauthorized: Cross-college notification access rejected' });
      }

      const userId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
      const userRole = req.user.role;
      const isDirect = (notification.recipient && notification.recipient.toString() === userId) ||
                       (notification.receiverId && notification.receiverId.toString() === userId);
      const isRoleTarget = notification.targetRoles && (
        notification.targetRoles.includes(userRole) ||
        notification.targetRoles.includes(userRole?.toLowerCase()) ||
        notification.targetRoles.includes('All') ||
        notification.targetRoles.includes('All Roles') ||
        notification.targetRoles.includes('Entire College') ||
        (userRole === 'Admin' && notification.targetRoles.includes('admin'))
      );
      const isReceiverRole = notification.receiverRole && (
        notification.receiverRole === userRole ||
        notification.receiverRole === userRole?.toLowerCase()
      );

      if (!isDirect && !isRoleTarget && !isReceiverRole && userRole !== 'Admin') {
        return res.status(403).json({ message: 'Unauthorized to mark this notification as read' });
      }
    }

    if (!notification.readBy) notification.readBy = [];
    const userIdStr = req.user._id.toString();
    if (!notification.readBy.some(id => id.toString() === userIdStr)) {
      notification.readBy.push(req.user._id);
      await notification.save();
    }

    const obj = notification.toObject();
    obj.isRead = true;
    res.json(obj);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server Error updating notification' });
  }
});

// @desc    Mark all notifications as read for current user
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, checkCollegeStatus, collegeScope, async (req, res) => {
  try {
    const query = buildUserQuery(req);
    await Notification.updateMany(query, { $addToSet: { readBy: req.user._id } });
    res.json({ message: 'All notifications marked as read successfully' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server Error updating notifications' });
  }
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private (Admin / Super Admin only)
router.delete('/:id', protect, checkCollegeStatus, collegeScope, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Enforce role permission & college isolation
    if (req.user.role !== 'Super Admin' && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to delete notifications' });
    }

    if (req.user.role !== 'Super Admin') {
      const userTenant = req.collegeId || req.user.tenantId || req.user.collegeId;
      const notifTenant = notification.tenantId || notification.collegeId;
      if (userTenant && notifTenant && notifTenant !== userTenant) {
        return res.status(403).json({ message: 'Unauthorized: Cross-college delete rejected' });
      }
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server Error deleting notification' });
  }
});

// @desc    Create a new notification / announcement (API dispatch)
// @route   POST /api/notifications
// @access  Private (Authorized users / admins)
router.post('/', protect, checkCollegeStatus, collegeScope, async (req, res) => {
  try {
    const { 
      receiverId, 
      recipient, 
      receiverRole, 
      targetRoles, 
      title, 
      message, 
      category, 
      type, 
      link, 
      email,
      eventType,
      entityId,
      entityType,
      priority
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required.' });
    }
    
    let finalReceiverId = receiverId || recipient || null;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        finalReceiverId = user._id.toString();
      }
    }

    // Validate college ownership on server; never trust unverified client-supplied college ID
    let finalTenantId = req.collegeId || req.user.tenantId || req.user.collegeId;
    let finalCollegeId = req.collegeId || req.user.tenantId || req.user.collegeId;

    if (req.user.role === 'Super Admin' && req.body.tenantId) {
      finalTenantId = req.body.tenantId;
      finalCollegeId = req.body.collegeId || req.body.tenantId;
    }

    const notification = await sendNotification(req, {
      receiverId: finalReceiverId,
      receiverRole,
      targetRoles: targetRoles || [],
      tenantId: finalTenantId,
      collegeId: finalCollegeId,
      title,
      message,
      category: category || 'announcement',
      type: type || 'Info',
      link,
      eventType,
      entityId,
      entityType,
      createdBy: req.user._id,
      priority: priority || 'Normal'
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server Error creating notification' });
  }
});

export default router;

