import mongoose from 'mongoose';

const welfareRecordSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  department: { type: String, required: true },
  issueType: { type: String, required: true },
  reportedBy: { type: String, required: true },
  priority: { type: String, required: true, enum: ['Low', 'Medium', 'High'] },
  date: { type: String, required: true },
  status: { type: String, default: 'Investigating' },
  description: { type: String },
  timeline: [{
    date: { type: String },
    text: { type: String }
  }]
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('WelfareRecord', welfareRecordSchema);
