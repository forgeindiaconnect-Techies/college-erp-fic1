import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  tenantId: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String },
  registerNo: { type: String },
  department: { type: String },
  semester: { type: String },
  attendanceDate: { type: Date, required: true },
  periodId: { type: String },
  status: { type: String, enum: ['Present', 'Absent', 'On Leave', 'Medical Leave', 'Leave'], required: true },
  subjectId: { type: String },
  subjectName: { type: String },
  subject: { type: String },
  markedBy: { type: String }
}, { timestamps: true });

// Prevent duplicate attendance records
attendanceSchema.index({ tenantId: 1, studentId: 1, subjectId: 1, periodId: 1, attendanceDate: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
