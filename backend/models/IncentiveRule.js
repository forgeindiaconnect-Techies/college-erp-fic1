import mongoose from 'mongoose';

const incentiveRuleSchema = new mongoose.Schema(
  {
    ruleCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Insurance', 'Credit Card', 'Bank Account', 'Job'],
      required: true,
      index: true,
    },
    partnerName: {
      type: String,
      default: 'All', // e.g. "Star Health", "HDFC Bank", "All"
    },
    productOrRole: {
      type: String,
      default: 'All', // e.g. "Health", "Platinum", "SDE", "All"
    },
    milestone: {
      type: String,
      required: true,
      // e.g. "Policy Issued", "Approved", "Activated", "Account Opened", "Joined"
    },
    amountType: {
      type: String,
      enum: ['Fixed', 'Percentage'],
      default: 'Fixed',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    maxLimit: {
      type: Number,
      default: 0, // 0 = no limit
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveTo: {
      type: Date,
    },
    eligibilityConditions: {
      type: String,
      default: 'Requires partner verification of business outcome.',
    },
    cancellationPolicy: {
      type: String,
      default: 'Incentive subject to reversal if customer cancels within 30 days.',
    },
    approvalStatus: {
      type: String,
      enum: ['Approved', 'Draft', 'Pending Approval', 'Archived'],
      default: 'Approved',
      index: true,
    },
    consentRequirement: {
      type: String,
      default: 'Explicit applicant consent recorded prior to application routing.',
    },
    disbursementCondition: {
      type: String,
      default: 'Processed in the institutional settlement cycle following partner clearance.',
    },
    isActive: {
      type: Boolean,
      default: true,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdByName: {
      type: String,
      default: 'Admin',
    },
  },
  {
    timestamps: true,
  }
);

incentiveRuleSchema.index({ tenantId: 1, category: 1, isActive: 1 });

const IncentiveRule = mongoose.models.IncentiveRule || mongoose.model('IncentiveRule', incentiveRuleSchema);
export default IncentiveRule;
