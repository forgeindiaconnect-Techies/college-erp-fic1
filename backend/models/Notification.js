import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: { type: String, index: true }, // Target college tenantId
  collegeId: { type: String, index: true }, // College ObjectId or tenantId
  recipient: { type: String, ref: 'User', index: true },
  receiverId: { type: String, ref: 'User', index: true },
  receiverRole: { type: String },
  targetRoles: { type: [String], default: [] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { 
    type: String, 
    default: 'system',
    index: true
  },
  type: { 
    type: String, 
    enum: ['Info', 'Warning', 'Success', 'Error', 'info', 'warning', 'success', 'error'], 
    default: 'Info',
    set: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : 'Info'
  },
  eventType: { type: String, default: null, index: true },
  entityId: { type: String, default: null },
  entityType: { type: String, default: null },
  createdBy: { type: String, ref: 'User', default: null },
  priority: { 
    type: String, 
    enum: ['Low', 'Normal', 'High', 'Urgent'], 
    default: 'Normal' 
  },
  expiresAt: { type: Date, default: null },
  readBy: [{ type: String, ref: 'User' }],
  link: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);

