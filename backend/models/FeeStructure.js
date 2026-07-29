import mongoose from 'mongoose';

const feeStructureSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  tuitionFee: { type: Number, default: 60000 },
  examFee: { type: Number, default: 2500 },
  libraryFee: { type: Number, default: 0 },
  hostelFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  scholarshipAmount: { type: Number, default: 0 },
  scholarshipName: { type: String, default: '' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('FeeStructure', feeStructureSchema);
