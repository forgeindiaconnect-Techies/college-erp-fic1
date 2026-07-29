import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  role: { type: String, required: true },
  ip: { type: String, required: true },
  browser: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['Success', 'Failed (Bad Password)'], default: 'Success' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('LoginLog', loginLogSchema);
