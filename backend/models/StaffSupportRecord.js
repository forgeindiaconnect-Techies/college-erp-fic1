import mongoose from 'mongoose';

const staffSupportSchema = new mongoose.Schema({
  staffName: { type: String, required: true },
  staffId: { type: String },
  studentId: { type: String },
  role: { type: String, default: 'Staff' },
  email: { type: String },
  department: { type: String, required: true },
  requestType: { type: String, required: true }, // e.g. 'Leave', 'IT Support', 'Salary', 'Complaint', 'Counseling', 'Training'
  subType: { type: String }, // e.g. 'Sick Leave', 'Projector Issue', etc.
  type: { type: String },
  description: { type: String, required: true },
  reason: { type: String },
  daysCount: { type: Number, default: 1 },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Under Review', 'Resolved', 'Approved', 'Rejected'], default: 'Pending' },
  startDate: { type: String }, // for Leave or Training
  endDate: { type: String },   // for Leave or Training
  timeline: [{
    date: { type: String },
    text: { type: String }
  }],
  collegeId: { type: String }
}, { timestamps: true });

export default mongoose.model('StaffSupportRecord', staffSupportSchema);
