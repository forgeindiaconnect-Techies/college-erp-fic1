import mongoose from 'mongoose';

const substitutionSchema = new mongoose.Schema({
  collegeId: { type: String, required: true },
  department: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  day: { type: String, required: true },   // e.g. "Monday"
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PeriodMaster', required: true },
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
  originalStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  substituteStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  reason: { type: String, default: 'Faculty on leave' },
  status: { type: String, enum: ['Active', 'Cancelled'], default: 'Active' },
  createdBy: { type: String }
}, { timestamps: true });

// Prevent duplicate substitution for the same timetable slot on the same date
substitutionSchema.index({ collegeId: 1, timetableId: 1, date: 1 }, { unique: true });

export default mongoose.model('Substitution', substitutionSchema);
