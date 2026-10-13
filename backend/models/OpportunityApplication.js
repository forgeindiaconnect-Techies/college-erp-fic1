import mongoose from 'mongoose';

const opportunityApplicationSchema = new mongoose.Schema(
  {
    applicationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
      index: true,
    },
    opportunityCode: {
      type: String,
      required: true,
    },
    opportunityTitle: {
      type: String,
      required: true,
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
    },
    providerName: {
      type: String,
      required: true,
    },
    formVersion: {
      type: Number,
      default: 1,
    },
    // Dynamic form payload
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    // Applicant details
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    applicantName: {
      type: String,
      required: true,
    },
    applicantEmail: {
      type: String,
      required: true,
    },
    applicantPhone: {
      type: String,
      default: '',
    },
    applicantRole: {
      type: String,
      required: true,
      index: true,
    },
    applicantDepartment: {
      type: String,
      default: 'General',
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
      default: 'COL001',
    },
    collegeId: {
      type: String,
      index: true,
      default: 'COL001',
    },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Under Review',
        'KYC Verification',
        'Provider Processing',
        'Approved',
        'Milestone Verified',
        'Rejected',
        'Returned for Correction',
        'Closed',
      ],
      default: 'Submitted',
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedBy: { type: String, required: true },
        updatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String, default: '' },
      },
    ],
    // Provider Verification Reference (e.g. Policy Number, Application Number, Employee ID)
    providerApplicationRef: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    correctionRemarks: {
      type: String,
      default: '',
    },
    milestoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    milestoneVerifiedAt: {
      type: Date,
    },
    milestoneVerifiedBy: {
      type: String,
      default: '',
    },
    // Incentive Tracking
    incentiveEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    incentiveStatus: {
      type: String,
      enum: ['None', 'Eligible', 'Pending Approval', 'Approved', 'Paid', 'Reversed', 'Rejected'],
      default: 'None',
      index: true,
    },
    incentiveAmount: {
      type: Number,
      default: 0,
    },
    incentiveRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IncentiveRecord',
    },
    payoutRef: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for isolation & query speed
opportunityApplicationSchema.index({ tenantId: 1, opportunityId: 1, applicantId: 1 });
opportunityApplicationSchema.index({ tenantId: 1, category: 1, status: 1 });
opportunityApplicationSchema.index({ applicantId: 1, createdAt: -1 });

const OpportunityApplication = mongoose.model('OpportunityApplication', opportunityApplicationSchema);
export default OpportunityApplication;
