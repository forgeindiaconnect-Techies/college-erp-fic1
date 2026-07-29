import mongoose from 'mongoose';

const transportDriverAttendanceSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  status: { type: String, enum: ['Present', 'Absent', 'On Leave'], required: true },
  checkInTime: { type: String },
  checkOutTime: { type: String },
  remarks: { type: String }, // Can be used for "Substitute: Mr. X"
  substituteDriver: { type: String }
, collegeId: { type: String } }, { timestamps: true });

// Ensure one attendance record per driver per day
transportDriverAttendanceSchema.index({ driverId: 1, date: 1 }, { unique: true });

export default mongoose.model('TransportDriverAttendance', transportDriverAttendanceSchema);
