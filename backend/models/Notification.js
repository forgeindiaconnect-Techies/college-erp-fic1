import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  tenantId: { type: String }, // Target college tenantId
  collegeId: { type: String }, // College ObjectId or tenantId
  recipient: { type: String, ref: 'User' },
  receiverId: { type: String, ref: 'User' },
  receiverRole: { type: String },
  targetRoles: { type: [String], default: [] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['college', 'subscription', 'student', 'staff', 'transport', 'hostel', 'system'], 
    default: 'system' 
  },
  type: { 
    type: String, 
    enum: ['Info', 'Warning', 'Success', 'Error'], 
    default: 'Info' 
  },
  readBy: [{ type: String, ref: 'User' }],
  link: { type: String, default: null }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
