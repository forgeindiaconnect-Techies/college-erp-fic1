import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['Insurance', 'Credit Card', 'Bank Account', 'Job'],
      required: true,
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
      index: true,
      default: 'COL001',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submitterName: {
      type: String,
      required: true,
    },
    submitterEmail: {
      type: String,
      required: true,
    },
    submitterRole: {
      type: String,
      required: true,
      index: true,
    },
    submitterDepartment: {
      type: String,
      default: 'General',
    },
    submitterEmployeeId: {
      type: String,
      default: '',
      index: true,
    },
    applicationSubmissionDate: {
      type: Date,
      default: Date.now,
    },

    // ── Category A: Insurance Details ──
    insuranceDetails: {
      provider: { type: String, trim: true },
      insuranceCategory: {
        type: String,
        enum: ['Health', 'Motor', 'Life', 'Property', 'Travel', 'Other'],
        default: 'Health',
      },
      productType: {
        type: String,
        enum: ['Health', 'Term Life', 'Motor / Vehicle', 'Personal Accident', 'Travel', 'Property', 'Other'],
      },
      selectedOffering: { type: String, trim: true },
      sumInsuredTier: { type: String, trim: true },
      applicantName: { type: String, trim: true },
      applicantPhone: { type: String, trim: true },
      applicantEmail: { type: String, trim: true },
      applicantCity: { type: String, trim: true },
      partnerReferenceNumber: { type: String, trim: true },
      estimatedSumInsured: { type: Number, default: 0 },
      policyNumber: { type: String, trim: true },
      insurerVerified: { type: Boolean, default: false },
      applicantConsentGiven: { type: Boolean, default: true },
      consentTimestamp: { type: Date, default: Date.now },
      consentNoticeVersion: { type: String, default: 'v1.2-FIC-INS-CONSENT' },
      notes: { type: String, trim: true },
    },

    // ── Category B: Credit Card Details ──
    creditCardDetails: {
      bankName: { type: String, trim: true },
      cardProduct: { type: String, trim: true },
      applicantName: { type: String, trim: true },
      applicantPhone: { type: String, trim: true },
      applicantEmail: { type: String, trim: true },
      monthlyIncome: { type: String, trim: true },
      employmentType: {
        type: String,
        enum: ['Salaried', 'Self-Employed', 'Student', 'Professional', 'Other'],
        default: 'Salaried',
      },
      city: { type: String, trim: true },
      referralSource: { type: String, trim: true, default: 'Direct Recommendation' },
      partnerReferenceNumber: { type: String, trim: true },
      applicationNumber: { type: String, trim: true },
      cardIssued: { type: Boolean, default: false },
      cardActivated: { type: Boolean, default: false },
      applicantConsentGiven: { type: Boolean, default: true },
      consentTimestamp: { type: Date, default: Date.now },
      consentNoticeVersion: { type: String, default: 'v2.4-FIC-CC-CONSENT' },
      notes: { type: String, trim: true },
    },

    // ── Category C: Bank Account Details ──
    bankAccountDetails: {
      bankName: { type: String, trim: true },
      accountProduct: { type: String, trim: true },
      accountType: {
        type: String,
        enum: ['Savings Account', 'Student Zero-Balance', 'Salary Account', 'Current Account', 'Fixed Deposit Linked'],
        default: 'Savings Account',
      },
      applicantType: {
        type: String,
        enum: ['Student', 'Faculty / Staff', 'Research Scholar', 'Alumni', 'Campus Vendor', 'Other'],
        default: 'Student',
      },
      applicantName: { type: String, trim: true },
      applicantPhone: { type: String, trim: true },
      applicantEmail: { type: String, trim: true },
      city: { type: String, trim: true },
      branchCity: { type: String, trim: true },
      partnerReferenceNumber: { type: String, trim: true },
      kycStatus: {
        type: String,
        enum: ['Pending', 'Submitted', 'Verified', 'Rejected'],
        default: 'Pending',
      },
      accountNumberMasked: { type: String, trim: true }, // e.g. "XXXXXX4512" (Sensitive data protection)
      initialDeposit: { type: Number, default: 0 },
      accountActivated: { type: Boolean, default: false },
      applicantConsentGiven: { type: Boolean, default: true },
      consentTimestamp: { type: Date, default: Date.now },
      consentNoticeVersion: { type: String, default: 'v1.2-FIC-ACC-CONSENT' },
      notes: { type: String, trim: true },
    },

    // ── Category D: Job Referral Details ──
    jobDetails: {
      sector: {
        type: String,
        enum: ['IT / Software', 'Non-IT / Core Engineering', 'Banking / Finance', 'Healthcare / Pharma', 'EdTech / Education', 'BPO / Operations', 'Other'],
        default: 'IT / Software',
      },
      companyName: { type: String, trim: true },
      jobRole: { type: String, trim: true },
      jobReferenceId: { type: String, trim: true },
      jobLocation: { type: String, trim: true },
      candidateName: { type: String, trim: true },
      candidatePhone: { type: String, trim: true },
      candidateEmail: { type: String, trim: true },
      candidateCity: { type: String, trim: true },
      experienceLevel: { type: String, trim: true, default: 'Fresher (0-1 yr)' },
      referrerRelationship: {
        type: String,
        enum: ['Colleague', 'Alumni', 'Mentee', 'Academic Peer', 'Personal', 'Other'],
        default: 'Alumni',
      },
      experienceYears: { type: String, trim: true },
      skills: { type: String, trim: true },
      resumeUrl: { type: String, trim: true },
      expectedCtc: { type: String, trim: true },
      currentInterviewStage: {
        type: String,
        default: 'Screening',
      },
      candidateConsentGiven: {
        type: Boolean,
        required: true,
        default: true,
      },
      consentTimestamp: { type: Date, default: Date.now },
      consentNoticeVersion: { type: String, default: 'v1.2-FIC-JOB-CONSENT' },
      joiningDate: { type: Date },
      joiningVerified: { type: Boolean, default: false },
      notes: { type: String, trim: true },
    },

    // ── Status Workflow ──
    status: {
      type: String,
      required: true,
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
        reason: { type: String, default: '' },
        remarks: { type: String, default: '' },
      },
    ],

    // ── Milestones & Incentives ──
    milestoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedMilestoneName: {
      type: String,
      default: '',
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    returnReason: {
      type: String,
      default: '',
    },
    isReturnedForCorrection: {
      type: Boolean,
      default: false,
    },
    incentiveEligible: {
      type: Boolean,
      default: false,
      index: true,
    },
    incentiveStatus: {
      type: String,
      enum: ['None', 'Eligible', 'Pending Approval', 'Approved', 'Rejected', 'Processing', 'Paid', 'Reversed'],
      default: 'None',
      index: true,
    },
    incentiveAmount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    paymentReferenceNumber: {
      type: String,
      default: '',
      trim: true,
    },
    paymentDate: {
      type: Date,
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Pending', 'Partially Paid', 'Paid'],
      default: 'Pending',
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
    incentiveRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IncentiveRecord',
    },
    formVersion: {
      type: Number,
      default: 1,
    },
    customFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Composite indexes for performance & isolation
referralSchema.index({ tenantId: 1, category: 1, status: 1 });
referralSchema.index({ tenantId: 1, submittedBy: 1 });
referralSchema.index({ 'insuranceDetails.applicantPhone': 1, tenantId: 1 });
referralSchema.index({ 'creditCardDetails.applicantPhone': 1, tenantId: 1 });
referralSchema.index({ 'bankAccountDetails.applicantPhone': 1, tenantId: 1 });
referralSchema.index({ 'jobDetails.candidatePhone': 1, tenantId: 1 });

const Referral = mongoose.models.Referral || mongoose.model('Referral', referralSchema);
export default Referral;
