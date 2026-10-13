import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  adminName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    required: true,
    unique: true
  },
  subscriptionPlan: {
    type: String,
    default: 'Trial'
  },
  subscriptionAmount: {
    type: Number,
    default: 0
  },
  billingCycle: {
    type: String,
    default: 'Monthly'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled', 'Grace Period', 'Deactivated', 'Pending Approval', 'Suspended'],
    default: 'Active'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  trialStartDate: {
    type: Date,
    required: true
  },
  trialEndDate: {
    type: Date,
    required: true
  },
  convertedToPaid: {
    type: Boolean,
    default: false
  },
  adminPassword: { 
    type: String,
    default: null
  },
  principalEmail: {
    type: String,
    default: null
  },
  principalPassword: {
    type: String,
    default: null
  },
  collegeId: { type: String } 
}, { timestamps: true });

export default mongoose.model('College', collegeSchema);
