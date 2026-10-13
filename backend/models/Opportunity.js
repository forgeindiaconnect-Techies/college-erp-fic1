import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema(
  {
    opportunityCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Insurance', 'Credit Card', 'Bank Account', 'Job Referral'],
      required: true,
      index: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
      // e.g., 'Health Insurance', 'Life Insurance', 'Rewards Credit Card', 'Savings Account', 'IT / Software'
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
      // e.g., 'Star Health', 'HDFC Bank', 'ICICI Lombard', 'TCS'
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    eligibilityCriteria: {
      type: String,
      default: '',
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    keyHighlights: [
      {
        type: String,
        trim: true,
      },
    ],
    // Targeting: 'ALL' or specific IDs/Roles
    targetColleges: {
      type: [String],
      default: ['ALL'],
      index: true,
    },
    targetRoles: {
      type: [String],
      default: ['ALL'],
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Paused', 'Closed'],
      default: 'Draft',
      index: true,
    },
    // Dynamic Form Builder Schema
    formSchema: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        label: { type: String, required: true },
        type: {
          type: String,
          enum: ['text', 'number', 'date', 'select', 'radio', 'checkbox', 'textarea', 'file'],
          default: 'text',
        },
        placeholder: { type: String, default: '' },
        required: { type: Boolean, default: false },
        options: [{ type: String }],
        helpText: { type: String, default: '' },
        defaultValue: { type: mongoose.Schema.Types.Mixed },
      },
    ],
    formVersion: {
      type: Number,
      default: 1,
    },
    // Incentive rule details
    incentiveConfig: {
      milestone: {
        type: String,
        required: true,
        default: 'Policy Issued',
        // e.g. 'Policy Issued', 'Card Activated', 'Account Opened', 'Joined'
      },
      amountType: {
        type: String,
        enum: ['Fixed', 'Percentage'],
        default: 'Fixed',
      },
      amount: {
        type: Number,
        required: true,
        default: 500,
      },
      terms: {
        type: String,
        default: 'Incentive calculated and approved upon official provider milestone verification.',
      },
      cancellationPolicy: {
        type: String,
        default: 'Subject to reversal if cancelled within trial / free-look period.',
      },
    },
    bannerColor: {
      type: String,
      default: '#2563eb',
    },
    iconName: {
      type: String,
      default: 'Award',
    },
    createdBy: {
      type: mongoose.Schema.Types.Mixed,
    },
    createdByName: {
      type: String,
      default: 'Super Admin',
    },
    auditLogs: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.Mixed },
        performedByName: { type: String, default: 'Admin' },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
      },
    ],
    stats: {
      totalApplications: { type: Number, default: 0 },
      approvedApplications: { type: Number, default: 0 },
      totalIncentiveDisbursed: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

opportunitySchema.index({ category: 1, status: 1 });
opportunitySchema.index({ startDate: 1, endDate: 1 });

const Opportunity = mongoose.model('Opportunity', opportunitySchema);
export default Opportunity;
