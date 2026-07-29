import express from 'express';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Helper to build base query for user
const buildUserQuery = (req) => {
  if (req.user.role === 'Super Admin') {
    return {};
  }

  const userRole = req.user.role;
  const userId = req.user._id;
  const tenantId = req.collegeId || req.user.tenantId || req.user.collegeId;

  const roleOrUserFilter = {
    $or: [
      { recipient: userId },
      { receiverId: userId },
      { targetRoles: { $in: [userRole, userRole?.toLowerCase(), 'Admin', 'admin', 'All', 'All Roles'] } },
      { receiverRole: userRole }
    ]
  };

  if (tenantId && tenantId !== 'system') {
    return {
      $and: [
        { $or: [{ collegeId: tenantId }, { tenantId }] },
        roleOrUserFilter
      ]
    };
  }

  return roleOrUserFilter;
};

// @desc    Get user notifications (supports pagination & category filter)
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;

    const query = buildUserQuery(req);
    if (category) {
      query.category = category;
    }

    const totalCount = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const mapped = notifications.map(n => {
      const obj = n.toObject();
      obj.isRead = Array.isArray(obj.readBy) && obj.readBy.some(id => id.toString() === req.user._id.toString());
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
router.get('/unread', protect, collegeScope, async (req, res) => {
  try {
    const query = {
      ...buildUserQuery(req),
      readBy: { $ne: req.user._id }
    };

    const notifications = await Notification.find(query).sort({ createdAt: -1 });
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
router.put('/:id/read', protect, collegeScope, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    if (!notification.readBy) notification.readBy = [];
    if (!notification.readBy.some(id => id.toString() === req.user._id.toString())) {
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

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
router.put('/read-all', protect, collegeScope, async (req, res) => {
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
// @access  Private
router.delete('/:id', protect, collegeScope, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server Error deleting notification' });
  }
});

// @desc    Create a new notification (API dispatch)
// @route   POST /api/notifications
// @access  Private
router.post('/', protect, collegeScope, async (req, res) => {
  try {
    const { receiverId, recipient, receiverRole, targetRoles, title, message, category, type, link, email } = req.body;
    
    let finalReceiverId = receiverId || recipient;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        finalReceiverId = user._id.toString();
      }
    }

    const notification = await sendNotification(req, {
      receiverId: finalReceiverId,
      receiverRole,
      targetRoles,
      tenantId: req.collegeId || req.user.tenantId || 'unassigned_college',
      collegeId: req.collegeId || req.user.tenantId || 'unassigned_college',
      title,
      message,
      category: category || 'system',
      type: type || 'Info',
      link
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server Error creating notification' });
  }
});

export default router;
