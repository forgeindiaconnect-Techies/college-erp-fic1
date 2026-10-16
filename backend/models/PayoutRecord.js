import mongoose from 'mongoose';

const payoutRecordSchema = new mongoose.Schema(
  {
    payoutRef: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    recipientEmail: {
      type: String,
      required: true,
    },
    recipientRole: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    incentiveCount: {
      type: Number,
      default: 1,
    },
    incentiveRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IncentiveRecord',
      },
    ],
    paymentMode: {
      type: String,
      enum: ['Bank Transfer', 'NEFT', 'IMPS', 'UPI', 'Cheque', 'Cash'],
      default: 'Bank Transfer',
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
      trim: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    processedByName: {
      type: String,
      default: 'Admin',
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Processing', 'Completed', 'Failed', 'Cancelled'],
      default: 'Completed',
      index: true,
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
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

payoutRecordSchema.index({ tenantId: 1, recipient: 1, status: 1 });

const PayoutRecord = mongoose.models.PayoutRecord || mongoose.model('PayoutRecord', payoutRecordSchema);
export default PayoutRecord;
