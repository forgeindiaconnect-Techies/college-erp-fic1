import mongoose from 'mongoose';

const periodMasterSchema = new mongoose.Schema({
  collegeId: { type: String, required: false },
  periodName: { type: String, required: true }, // '1', '2', 'Break', 'Lunch'
  startTime: { type: String, required: true }, // '09:00'
  endTime: { type: String, required: true },   // '09:50'
  isBreak: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('PeriodMaster', periodMasterSchema);
