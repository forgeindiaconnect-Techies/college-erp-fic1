import mongoose from 'mongoose';

const incentiveRecordSchema = new mongoose.Schema(
  {
    incentiveCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    referralId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Referral',
      required: true,
      index: true,
    },
    referralCode: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Insurance', 'Credit Card', 'Bank Account', 'Job'],
      required: true,
      index: true,
    },
    earnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    earnedByName: {
      type: String,
      required: true,
    },
    earnedByRole: {
      type: String,
      required: true,
      index: true,
    },
    earnedByDepartment: {
      type: String,
      default: 'General',
    },
    earnedByEmployeeId: {
      type: String,
      default: '',
      index: true,
    },
    candidateName: {
      type: String,
      default: '',
      trim: true,
    },
    candidateApplicationId: {
      type: String,
      default: '',
      trim: true,
    },
    referralDate: {
      type: Date,
      default: Date.now,
    },
    approvalDate: {
      type: Date,
    },
    incentiveRate: {
      type: Number,
      default: 0,
    },
    eligibleCount: {
      type: Number,
      default: 1,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      default: 'COL001',
    },
    collegeId: {
      type: String,
      default: 'COL001',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Calculated', 'Pending Approval', 'Approved', 'Rejected', 'Processing', 'Partially Paid', 'Paid', 'Reversed'],
      default: 'Pending Approval',
      index: true,
    },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        paymentDate: { type: Date, default: Date.now },
        transactionReference: { type: String, default: '' },
        paymentMode: { type: String, default: 'Bank Transfer' },
        paidBy: { type: String, default: 'Admin' },
        notes: { type: String, default: '' },
      },
    ],

    // ── Immutable Snapshot of the Applied Rule ──
    ruleSnapshot: {
      ruleCode: { type: String, default: '' },
      ruleName: { type: String, default: '' },
      milestone: { type: String, default: '' },
      amountType: { type: String, default: 'Fixed' },
      configuredAmount: { type: Number, default: 0 },
      appliedRate: { type: Number, default: 0 },
      eligibilityConditions: { type: String, default: '' },
      cancellationPolicy: { type: String, default: '' },
      partnerName: { type: String, default: '' },
    },

    // ── Approval Details ──
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedByName: {
      type: String,
      default: '',
    },
    approvedAt: {
      type: Date,
    },
    approvalRemarks: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },

    // ── Reversal Details ──
    reversalReason: {
      type: String,
      default: '',
    },
    reversedBy: {
      type: String,
      default: '',
    },
    reversedAt: {
      type: Date,
    },

    // ── Payout Details ──
    payoutRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayoutRecord',
    },
    payoutRef: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
    },
    paymentMode: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

incentiveRecordSchema.index({ tenantId: 1, earnedBy: 1, status: 1 });
incentiveRecordSchema.index({ tenantId: 1, category: 1, status: 1 });

const IncentiveRecord = mongoose.model('IncentiveRecord', incentiveRecordSchema);
export default IncentiveRecord;
