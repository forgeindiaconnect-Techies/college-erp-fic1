import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Can be referenceId or user ID
  userName: { type: String, required: true },
  role: { type: String, required: true },
  action: { type: String, required: true }, // e.g., 'Created Assignment'
  moduleName: { type: String, required: true }, // e.g., 'Assignments'
  dept: { type: String }, // User's department
  ip: { type: String, default: '127.0.0.1' },
  status: { type: String, enum: ['Success', 'Failed'], default: 'Success' }, collegeId: { type: String } }, { timestamps: true });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
