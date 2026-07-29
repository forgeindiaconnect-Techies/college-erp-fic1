import mongoose from 'mongoose';

const feeSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String },
  registerNo: { type: String },
  department: { type: String },
  semester: { type: String, required: true },
  totalFees: { type: Number, required: true },
  paidAmount: { type: Number, required: true },
  pendingAmount: { type: Number },
  paymentDate: { type: Date },
  paymentMode: { type: String },
  feeType: { type: String, default: 'Tuition Fee' },
  status: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Pending' },
  receiptNo: { type: String },
  payments: { type: Array, default: [] }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('Fee', feeSchema);
