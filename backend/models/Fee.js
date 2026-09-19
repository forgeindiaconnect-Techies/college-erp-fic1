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
  payments: { type: Array, default: [] },
  collegeId: { type: String },
  quota: { type: mongoose.Schema.Types.Mixed, default: null },
  quotaName: { type: String, default: 'General Quota' },
  normalFee: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  finalFee: { type: Number, default: 0 },
  remainingFee: { type: Number, default: 0 },
  scholarshipAmount: { type: Number, default: 0 },
  scholarshipName: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Fee', feeSchema);

