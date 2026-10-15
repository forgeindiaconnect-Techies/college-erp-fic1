import mongoose from 'mongoose';

const watchmanAttendanceSchema = new mongoose.Schema({
  watchmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  watchmanName: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true // YYYY-MM-DD
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Night'],
    required: true
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  clockInTime: {
    type: Date,
    default: Date.now
  },
  clockOutTime: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['On Duty', 'Completed', 'Late', 'Half Day'],
    default: 'On Duty'
  },
  notes: {
    type: String,
    default: ''
  },
  collegeId: {
    type: String,
    default: 'COL001'
  },
  tenantId: {
    type: String,
    default: 'COL001'
  }
}, { timestamps: true });

export default mongoose.models.WatchmanAttendance || mongoose.model('WatchmanAttendance', watchmanAttendanceSchema);
