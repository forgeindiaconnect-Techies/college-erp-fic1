import Notification from '../models/Notification.js';

/**
 * Service to handle saving notifications to MongoDB and emitting real-time Socket.IO events.
 * Strictly enforces college-scoped real-time delivery and deduplication.
 * 
 * @param {Object} req Express request object (optional, used to access req.app.get('io') and req.user)
 * @param {Object} params Notification parameters
 * @param {String} params.receiverId Specific recipient User ID
 * @param {String} params.recipient Specific recipient User ID (alias)
 * @param {String} params.receiverRole Target role string
 * @param {Array<String>} params.targetRoles Array of target roles
 * @param {String} params.tenantId College tenant ID
 * @param {String} params.collegeId College ID
 * @param {String} params.title Notification title
 * @param {String} params.message Notification message body
 * @param {String} params.category Category: 'college' | 'subscription' | 'student' | 'staff' | 'transport' | 'hostel' | 'system' | 'academic' | 'exam' | 'fees' | 'library' | 'security' | 'announcement'
 * @param {String} params.type Severity type: 'Info' | 'Warning' | 'Success' | 'Error'
 * @param {String} params.link Optional deep link URL
 * @param {String} params.eventType Event identifier (e.g. 'FEE_PAYMENT', 'EXAM_TIMETABLE', 'LIBRARY_DUE', 'COLLEGE_STATUS')
 * @param {String} params.entityId Referenced record ID
 * @param {String} params.entityType Referenced model name
 * @param {String} params.createdBy User ID who triggered the notification
 * @param {String} params.priority 'Low' | 'Normal' | 'High' | 'Urgent'
 * @param {Date} params.expiresAt Expiration date
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
  link = null,
  eventType = null,
  entityId = null,
  entityType = null,
  createdBy = null,
  priority = 'Normal',
  expiresAt = null
}) => {
  try {
    const finalRecipient = receiverId || recipient || null;
    let rolesArray = targetRoles ? (Array.isArray(targetRoles) ? [...targetRoles] : [targetRoles]) : [];
    if (receiverRole && !rolesArray.includes(receiverRole)) {
      rolesArray.push(receiverRole);
    }

    const finalTenantId = tenantId || collegeId || (req?.user?.tenantId) || 'system';
    const finalCollegeId = collegeId || tenantId || (req?.user?.collegeId) || 'system';
    const finalCreatedBy = createdBy || (req?.user?._id ? req.user._id.toString() : null);

    // 1. Deduplication / Idempotency Check:
    // Prevent duplicated notifications if retried within 5 minutes with identical scope
    if (finalTenantId && title) {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      const dedupeQuery = {
        tenantId: finalTenantId,
        title,
        createdAt: { $gte: fiveMinsAgo }
      };
      if (finalRecipient) dedupeQuery.recipient = finalRecipient;
      if (eventType) dedupeQuery.eventType = eventType;
      if (entityId) dedupeQuery.entityId = entityId;

      const existingNotif = await Notification.findOne(dedupeQuery);
      if (existingNotif) {
        return existingNotif;
      }
    }

    // 2. Persist notification to MongoDB
    const notification = await Notification.create({
      tenantId: finalTenantId,
      collegeId: finalCollegeId,
      recipient: finalRecipient,
      receiverId: finalRecipient,
      receiverRole: receiverRole || (rolesArray.length > 0 ? rolesArray[0] : null),
      targetRoles: rolesArray,
      title,
      message,
      category,
      type,
      link,
      eventType,
      entityId,
      entityType,
      createdBy: finalCreatedBy,
      priority,
      expiresAt,
      readBy: []
    });

    // 3. Handle Scoped Socket.IO Real-Time Emission
    let io = null;
    if (req && req.app && typeof req.app.get === 'function') {
      io = req.app.get('io');
    }

    if (io) {
      const payload = notification.toObject ? notification.toObject() : notification;
      payload.isRead = false;

      // 3.1 Emit directly to specific recipient user room
      if (finalRecipient) {
        io.to(finalRecipient.toString()).emit('newNotification', payload);
      }

      // 3.2 Emit strictly within college tenant boundary
      if (finalTenantId && finalTenantId !== 'system') {
        const tStr = finalTenantId.toString();
        const cStr = finalCollegeId ? finalCollegeId.toString() : tStr;

        const hasBroadAudience = rolesArray.some(r => {
          const lower = (r || '').toLowerCase().trim();
          return lower === 'all' || lower === 'all roles' || lower === 'entire college';
        });

        if (hasBroadAudience || (rolesArray.length === 0 && !finalRecipient)) {
          // Broad broadcast strictly to authorized users of THIS college
          io.to(`college:${tStr}`).emit('newNotification', payload);
          io.to(tStr).emit('newNotification', payload);
          if (cStr !== tStr) {
            io.to(`college:${cStr}`).emit('newNotification', payload);
            io.to(cStr).emit('newNotification', payload);
          }
        }

        // Target specific roles ONLY within this college (never globally across other colleges)
        rolesArray.forEach(role => {
          const r = (role || '').trim();
          const lower = r.toLowerCase();
          if (lower !== 'all' && lower !== 'all roles' && lower !== 'entire college') {
            io.to(`college:${tStr}:role:${r}`).emit('newNotification', payload);
            io.to(`college:${tStr}:role:${lower}`).emit('newNotification', payload);
            if (cStr !== tStr) {
              io.to(`college:${cStr}:role:${r}`).emit('newNotification', payload);
              io.to(`college:${cStr}:role:${lower}`).emit('newNotification', payload);
            }
          }
        });
      } else if (finalTenantId === 'system') {
        // System-level Super Admin announcements
        if (rolesArray.length > 0) {
          rolesArray.forEach(role => {
            io.to(`role:${role}`).emit('newNotification', payload);
            io.to(`role:${role.toLowerCase()}`).emit('newNotification', payload);
          });
        } else if (!finalRecipient) {
          io.emit('newNotification', payload);
        }
      }

      // 3.3 Super Admin always receives cross-college real-time notifications
      io.to('role:Super Admin').emit('newNotification', payload);
      io.to('role:superadmin').emit('newNotification', payload);
    }

    return notification;
  } catch (err) {
    console.error('❌ Error in notificationService.sendNotification:', err.message);
  }
};

export default {
  sendNotification
};

