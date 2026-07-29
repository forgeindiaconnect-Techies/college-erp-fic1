import Notification from '../models/Notification.js';

/**
 * Service to handle saving notifications to MongoDB and emitting real-time Socket.IO events.
 * 
 * @param {Object} req Express request object (optional, used to access req.app.get('io'))
 * @param {Object} params Notification parameters
 * @param {String} params.receiverId Specific recipient User ID
 * @param {String} params.recipient Specific recipient User ID (alias)
 * @param {String} params.receiverRole Target role string
 * @param {Array<String>} params.targetRoles Array of target roles
 * @param {String} params.tenantId College tenant ID
 * @param {String} params.collegeId College ID
 * @param {String} params.title Notification title
 * @param {String} params.message Notification message body
 * @param {String} params.category Category: 'college' | 'subscription' | 'student' | 'staff' | 'transport' | 'hostel' | 'system'
 * @param {String} params.type Severity type: 'Info' | 'Warning' | 'Success' | 'Error'
 * @param {String} params.link Optional deep link URL
 */
export const sendNotification = async (req, {
  receiverId,
  recipient,
  receiverRole,
  targetRoles,
  tenantId,
  collegeId,
  title,
  message,
  category = 'system',
  type = 'Info',
  link = null
}) => {
  try {
    const finalRecipient = receiverId || recipient || null;
    let rolesArray = targetRoles ? (Array.isArray(targetRoles) ? targetRoles : [targetRoles]) : [];
    if (receiverRole && !rolesArray.includes(receiverRole)) {
      rolesArray.push(receiverRole);
    }

    const notification = await Notification.create({
      tenantId: tenantId || collegeId || 'system',
      collegeId: collegeId || tenantId || 'system',
      recipient: finalRecipient,
      receiverId: finalRecipient,
      receiverRole: receiverRole || (rolesArray.length > 0 ? rolesArray[0] : null),
      targetRoles: rolesArray,
      title,
      message,
      category,
      type,
      link
    });

    // Handle Socket.IO Real-Time Emission
    let io = null;
    if (req && req.app && typeof req.app.get === 'function') {
      io = req.app.get('io');
    }

    if (io) {
      const payload = notification.toObject ? notification.toObject() : notification;
      payload.isRead = false;

      // 1. Emit to specific recipient user room
      if (finalRecipient) {
        io.to(finalRecipient.toString()).emit('newNotification', payload);
      }

      // 2. Emit to tenantId / collegeId room
      if (tenantId) {
        io.to(tenantId.toString()).emit('newNotification', payload);
      }
      if (collegeId && collegeId !== tenantId) {
        io.to(collegeId.toString()).emit('newNotification', payload);
      }

      // 3. Emit to target roles rooms
      if (rolesArray.length > 0) {
        rolesArray.forEach(role => {
          io.to(`role:${role}`).emit('newNotification', payload);
          io.to(`role:${role.toLowerCase()}`).emit('newNotification', payload);
        });
      }

      // 4. Always emit to Super Admin room
      io.to('role:Super Admin').emit('newNotification', payload);
      io.to('role:superadmin').emit('newNotification', payload);

      // 5. General broadcast fallback
      if (!finalRecipient && !tenantId && rolesArray.length === 0) {
        io.emit('newNotification', payload);
      }
    }

    return notification;
  } catch (err) {
    console.error('❌ Error in notificationService.sendNotification:', err.message);
  }
};

export default {
  sendNotification
};
