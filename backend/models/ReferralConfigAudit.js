import mongoose from 'mongoose';

const referralConfigAuditSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['Credit Card', 'Insurance', 'Job', 'Bank Account', 'Partner', 'Field', 'Incentive', 'General'],
      index: true
    },
    action: {
      type: String,
      required: true // e.g., 'PARTNER_ADDED', 'PARTNER_TOGGLED', 'PARTNER_UPDATED', 'PRODUCT_ADDED', 'PRODUCT_TOGGLED', 'FIELD_UPDATED', 'RULE_SAVED', 'CONFIG_RESET'
    },
    title: {
      type: String,
      required: true
    },
    details: {
      type: String,
      default: ''
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed
    },
    performedBy: {
      type: String,
      default: 'Super Admin'
    },
    performedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

export const ReferralConfigAudit = mongoose.models.ReferralConfigAudit || mongoose.model('ReferralConfigAudit', referralConfigAuditSchema);
export default ReferralConfigAudit;
