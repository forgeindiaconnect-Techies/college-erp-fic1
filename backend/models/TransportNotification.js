import mongoose from 'mongoose';

const transportNotificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  targetRole: { type: String, default: 'All' }, // All, Student, Parent, Staff, HOD
  routeId: { type: String, default: 'All' }, // All or specific route ID
  status: { type: String, default: 'Sent' }, // Pending, Sent
  type: { type: String, default: 'Info' } // Info, Warning, Emergency
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportNotification', transportNotificationSchema);
