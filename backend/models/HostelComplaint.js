import mongoose from 'mongoose';

const hostelComplaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  studentName: { type: String },
  room: { type: String },
  category: { type: String, required: true },
  title: { type: String },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['Pending Review', 'In Progress', 'Resolved', 'Rejected'], default: 'Pending Review' },
  resolutionRemarks: { type: String },
  date: { type: Date, required: true, default: Date.now },
  closedDate: { type: Date }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('HostelComplaint', hostelComplaintSchema);
