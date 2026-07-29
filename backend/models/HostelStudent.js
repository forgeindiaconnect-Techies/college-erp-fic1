import mongoose from 'mongoose';

const hostelStudentSchema = new mongoose.Schema({
  studentProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  studentId: { type: String, required: true, unique: true }, // Backwards compatibility
  name: { type: String, required: true }, // Backwards compatibility
  block: { type: String, required: true },
  room: { type: String, required: true },
  feeStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  amount: { type: Number, required: true }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('HostelStudent', hostelStudentSchema);
