import mongoose from 'mongoose';

const transportStudentSchema = new mongoose.Schema({
  studentProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
  studentId: { type: String, required: true, unique: true }, // Keeping for backwards compatibility
  name: { type: String, required: true }, // Keeping for backwards compatibility
  routeId: { type: String, required: true },
  pickupPoint: { type: String, required: true },
  feeStatus: { type: String, enum: ['Paid', 'Pending'], default: 'Pending' },
  amount: { type: Number, required: true }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportStudent', transportStudentSchema);
