import mongoose from 'mongoose';

const referralAuditLogSchema = new mongoose.Schema(
  {
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
    action: {
      type: String,
      required: true,
      index: true,
      // e.g. "CREATED", "STATUS_UPDATED", "MILESTONE_VERIFIED", "INCENTIVE_CALCULATED",
      // "INCENTIVE_APPROVED", "INCENTIVE_REJECTED", "PAYOUT_PROCESSED", "REVERSED", "RETURNED_FOR_CORRECTION"
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    performedByName: {
      type: String,
      required: true,
    },
    performedByRole: {
      type: String,
      required: true,
    },
    fromStatus: {
      type: String,
      default: '',
    },
    toStatus: {
      type: String,
      default: '',
    },
    details: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
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
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

referralAuditLogSchema.index({ referralId: 1, timestamp: -1 });
referralAuditLogSchema.index({ tenantId: 1, action: 1 });

const ReferralAuditLog = mongoose.models.ReferralAuditLog || mongoose.model('ReferralAuditLog', referralAuditLogSchema);
export default ReferralAuditLog;
