import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema({
  staffId:       { type: String, required: true },
  staffName:     { type: String },
  designation:   { type: String },
  department:    { type: String },
  billingMonth:  { type: String, required: true },
  
  // Earnings
  basicPay:         { type: Number, required: true, default: 0 },
  hra:              { type: Number, default: 0 },
  medicalAllowance: { type: Number, default: 0 },
  specialAllowance: { type: Number, default: 0 },
  
  // Deductions & Attendance
  workingDays:   { type: Number, default: 30 },
  presentDays:   { type: Number, default: 30 },
  deductions:    { type: Number, default: 0 }, // Generic other deductions
  
  netSalary:     { type: Number },
  paymentDate:   { type: Date },
  paymentMode:   { type: String, default: 'Bank Transfer' },
  status:        { type: String, enum: ['Pending', 'Disbursed'], default: 'Pending' }, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('Salary', salarySchema);
