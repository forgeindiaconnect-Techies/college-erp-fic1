import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Referral from '../models/Referral.js';
import IncentiveRule from '../models/IncentiveRule.js';
import IncentiveRecord from '../models/IncentiveRecord.js';
import PayoutRecord from '../models/PayoutRecord.js';
import ReferralAuditLog from '../models/ReferralAuditLog.js';
import College from '../models/College.js';
import User from '../models/User.js';
import ReferralFormConfig from '../models/ReferralFormConfig.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Helper to generate unique referral code
const generateReferralCode = (category) => {
  const prefixMap = {
    'Insurance': 'INS',
    'Credit Card': 'CRD',
    'Bank Account': 'BNK',
    'Job': 'JOB',
  };
  const prefix = prefixMap[category] || 'REF';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timeSlice = Date.now().toString().slice(-4);
  return `${prefix}-${timeSlice}-${randomSuffix}`;
};

// Auto-seed default realistic incentive rules if none exist for a tenant
const ensureDefaultRules = async (tenantId) => {
  try {
    const count = await IncentiveRule.countDocuments({ tenantId });
    if (count === 0) {
      const defaultRules = [
        {
          ruleCode: `RULE-INS-${tenantId}-01`,
          ruleName: 'Health & Life Insurance Issuance Incentive',
          category: 'Insurance',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Policy Issued',
          amountType: 'Fixed',
          amount: 750,
          eligibilityConditions: 'Policy verified as issued by insurer with valid policy number.',
          cancellationPolicy: 'Reversible if free-look cancellation occurs within 15 days.',
          consentRequirement: 'Applicant explicit consent recorded prior to policy proposal generation.',
          disbursementCondition: 'Cleared upon underwriter reconciliation statement release.',
          approvalStatus: 'Approved',
          isActive: true,
          tenantId,
        },
        {
          ruleCode: `RULE-CRD-${tenantId}-01`,
          ruleName: 'Credit Card Activation Incentive',
          category: 'Credit Card',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Physical card dispatch & activation confirmation',
          amountType: 'Fixed',
          amount: 1000,
          eligibilityConditions: 'Applicant must meet minimum partner bank income and credit score criteria. Valid PAN and KYC verification required.',
          cancellationPolicy: 'Duplicate applications within 90 days are void.',
          consentRequirement: 'Primary applicant explicit digital or signed consent recorded prior to application routing.',
          disbursementCondition: 'Processed in the subsequent institutional settlement cycle following partner clearance.',
          approvalStatus: 'Approved',
          isActive: true,
          tenantId,
        },
        {
          ruleCode: `RULE-BNK-${tenantId}-01`,
          ruleName: 'Savings & Salary Account Opening Incentive',
          category: 'Bank Account',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Successful digital Video-KYC completion & account allocation',
          amountType: 'Fixed',
          amount: 500,
          eligibilityConditions: 'KYC verified and official account opened with initial deposit or mobile banking activation.',
          cancellationPolicy: 'Requires customer initial funding verification within 30 days.',
          consentRequirement: 'Applicant consent verified prior to initiating partner digital account journey.',
          disbursementCondition: 'Reconciled bi-weekly via partner core banking system reports.',
          approvalStatus: 'Approved',
          isActive: true,
          tenantId,
        },
        {
          ruleCode: `RULE-JOB-${tenantId}-01`,
          ruleName: 'Candidate Verified Joining Incentive',
          category: 'Job',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Candidate onboarding & completion of initial joining milestone',
          amountType: 'Fixed',
          amount: 2500,
          eligibilityConditions: 'Candidate successfully joins partner company and completes initial onboarding milestone without prior active application.',
          cancellationPolicy: 'Void if candidate fails background check or leaves during initial probation.',
          consentRequirement: 'Candidate formal written consent and resume submission authorization required.',
          disbursementCondition: 'Disbursed following verified candidate joining and attendance verification.',
          approvalStatus: 'Approved',
          isActive: true,
          tenantId,
        },
      ];
      await IncentiveRule.insertMany(defaultRules);
    } else {
      // Ensure existing rules have approvalStatus set to Approved if undefined
      await IncentiveRule.updateMany(
        { tenantId, approvalStatus: { $exists: false } },
        { $set: { approvalStatus: 'Approved' } }
      );
    }
  } catch (err) {
    console.error('Error auto-seeding incentive rules:', err.message);
  }
};

// ── 1. SUBMIT A NEW REFERRAL ──────────────────────────────────────────────────
// Any authenticated role (Student, Staff, HOD, Parent, Driver, etc.) can submit
router.post('/', protect, collegeScope, async (req, res) => {
  try {
    const {
      category,
      insuranceDetails,
      creditCardDetails,
      bankAccountDetails,
      jobDetails,
      customFields,
      formVersion,
    } = req.body;

    if (!category || !['Insurance', 'Credit Card', 'Bank Account', 'Job'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing referral category' });
    }

    // ── Check Form Publishing Status & Dynamic Fields ──
    const formConfig = await ReferralFormConfig.findOne({ category });
    if (formConfig) {
      const isSuperAdmin = req.user?.role === 'Super Admin';
      if ((formConfig.status === 'draft' || formConfig.isActive === false) && !isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message: `The ${category} Referral Form is currently in draft mode and not accepting public submissions.`
        });
      }

      // Dynamic Required Field Validation
      if (Array.isArray(formConfig.fieldsConfig)) {
        for (const f of formConfig.fieldsConfig) {
          if (f.isRequired && !f.isSystem && f.isVisible !== false) {
            const val = customFields ? customFields[f.fieldKey] : undefined;
            if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
              return res.status(400).json({
                success: false,
                message: f.errorMessage || `${f.label} is required.`
              });
            }
          }
        }
      }
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    await ensureDefaultRules(tenantId);

    // ── Duplicate Checks & Consent Validation ──
    if (category === 'Insurance') {
      if (!insuranceDetails || insuranceDetails.applicantConsentGiven === false) {
        return res.status(400).json({
          success: false,
          message: 'Explicit applicant consent is mandatory before submitting an insurance referral.',
        });
      }
      if (!insuranceDetails.applicantName || !insuranceDetails.applicantPhone) {
        return res.status(400).json({ success: false, message: 'Applicant name and contact phone are required.' });
      }

      insuranceDetails.consentTimestamp = insuranceDetails.consentTimestamp ? new Date(insuranceDetails.consentTimestamp) : new Date();
      insuranceDetails.consentNoticeVersion = insuranceDetails.consentNoticeVersion || 'v1.2-FIC-INS-CONSENT';
      insuranceDetails.applicantConsentGiven = true;

      const phone = insuranceDetails.applicantPhone;
      const provider = insuranceDetails.provider;
      if (phone && provider) {
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const existing = await Referral.findOne({
          category: 'Insurance',
          tenantId,
          'insuranceDetails.applicantPhone': phone,
          'insuranceDetails.provider': provider,
          createdAt: { $gte: threeMonthsAgo },
          status: { $nin: ['Rejected', 'Cancelled'] },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `An active insurance referral for this applicant with ${provider} already exists (Ref: ${existing.referralCode}). Submissions within 90 days are protected against duplicates.`,
          });
        }
      }
    }

    if (category === 'Credit Card') {
      if (!creditCardDetails || creditCardDetails.applicantConsentGiven === false) {
        return res.status(400).json({
          success: false,
          message: 'Explicit applicant consent is mandatory before submitting a credit card referral.',
        });
      }
      if (!creditCardDetails.applicantName || !creditCardDetails.applicantPhone) {
        return res.status(400).json({ success: false, message: 'Applicant name and contact phone are required.' });
      }

      // Record verified consent timestamp and compliance notice version
      creditCardDetails.consentTimestamp = creditCardDetails.consentTimestamp ? new Date(creditCardDetails.consentTimestamp) : new Date();
      creditCardDetails.consentNoticeVersion = creditCardDetails.consentNoticeVersion || 'v2.4-FIC-CC-CONSENT';
      creditCardDetails.applicantConsentGiven = true;

      const phone = creditCardDetails.applicantPhone;
      const bank = creditCardDetails.bankName;
      if (phone && bank) {
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const existing = await Referral.findOne({
          category: 'Credit Card',
          tenantId,
          'creditCardDetails.applicantPhone': phone,
          'creditCardDetails.bankName': bank,
          createdAt: { $gte: threeMonthsAgo },
          status: { $nin: ['Rejected', 'Cancelled'] },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `A referral for this applicant with ${bank} already exists (Code: ${existing.referralCode}). Duplicate submissions within 90 days are not permitted.`,
          });
        }
      }
    }

    if (category === 'Bank Account') {
      if (!bankAccountDetails || bankAccountDetails.applicantConsentGiven === false) {
        return res.status(400).json({
          success: false,
          message: 'Explicit applicant consent is mandatory before submitting a bank account referral.',
        });
      }
      if (!bankAccountDetails.applicantName || !bankAccountDetails.applicantPhone) {
        return res.status(400).json({ success: false, message: 'Applicant name and contact phone are required.' });
      }

      bankAccountDetails.consentTimestamp = bankAccountDetails.consentTimestamp ? new Date(bankAccountDetails.consentTimestamp) : new Date();
      bankAccountDetails.consentNoticeVersion = bankAccountDetails.consentNoticeVersion || 'v1.2-FIC-ACC-CONSENT';
      bankAccountDetails.applicantConsentGiven = true;

      const phone = bankAccountDetails.applicantPhone;
      const bank = bankAccountDetails.bankName;
      if (phone && bank) {
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const existing = await Referral.findOne({
          category: 'Bank Account',
          tenantId,
          'bankAccountDetails.applicantPhone': phone,
          'bankAccountDetails.bankName': bank,
          createdAt: { $gte: threeMonthsAgo },
          status: { $nin: ['Rejected', 'Cancelled'] },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `A bank account lead for this customer with ${bank} already exists (Code: ${existing.referralCode}). Submissions within 90 days are protected against duplicates.`,
          });
        }
      }
    }

    if (category === 'Job') {
      if (!jobDetails || !jobDetails.candidateConsentGiven) {
        return res.status(400).json({
          success: false,
          message: 'Explicit candidate consent is mandatory before submitting a job referral.',
        });
      }
      if (!jobDetails.candidatePhone || !jobDetails.candidateName) {
        return res.status(400).json({ success: false, message: 'Candidate name and contact phone are required.' });
      }

      jobDetails.consentTimestamp = jobDetails.consentTimestamp ? new Date(jobDetails.consentTimestamp) : new Date();
      jobDetails.consentNoticeVersion = jobDetails.consentNoticeVersion || 'v1.2-FIC-JOB-CONSENT';
      jobDetails.candidateConsentGiven = true;

      const phone = jobDetails.candidatePhone;
      const company = jobDetails.companyName;
      if (phone && company) {
        const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const existing = await Referral.findOne({
          category: 'Job',
          tenantId,
          'jobDetails.candidatePhone': phone,
          'jobDetails.companyName': company,
          createdAt: { $gte: threeMonthsAgo },
          status: { $nin: ['Rejected', 'Cancelled'] },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `A job candidate referral for this phone number at ${company} already exists (Code: ${existing.referralCode}). Submissions within 90 days are protected against duplicates.`,
          });
        }
      }
    }

    const referralCode = generateReferralCode(category);

    const initialHistory = [
      {
        status: 'Submitted',
        updatedBy: req.user.name || 'User',
        updatedById: req.user._id,
        role: req.user.role || 'User',
        timestamp: new Date(),
        remarks: 'Referral submitted for initial review.',
      },
    ];

    const submitterEmpId = req.user.referenceId || req.user.studentId || (req.user.phone ? `EMP-${req.user.phone.slice(-4)}` : `USR-${req.user._id.toString().slice(-4).toUpperCase()}`);
    const referralData = {
      referralCode,
      category,
      tenantId,
      collegeId: tenantId,
      submittedBy: req.user._id,
      submitterName: req.user.name || 'User',
      submitterEmail: req.user.email || '',
      submitterRole: req.user.role || 'User',
      submitterDepartment: req.user.department || 'General',
      submitterEmployeeId: submitterEmpId,
      applicationSubmissionDate: new Date(),
      status: 'Submitted',
      statusHistory: initialHistory,
      insuranceDetails: category === 'Insurance' ? insuranceDetails : undefined,
      creditCardDetails: category === 'Credit Card' ? creditCardDetails : undefined,
      bankAccountDetails: category === 'Bank Account' ? bankAccountDetails : undefined,
      jobDetails: category === 'Job' ? jobDetails : undefined,
      customFields: customFields || {},
      formVersion: formVersion || formConfig?.version || 1,
    };

    const newReferral = await Referral.create(referralData);

    // Determine consent notice version for audit log
    let consentNotice = 'v1.0-GEN-CONSENT';
    if (category === 'Credit Card') consentNotice = newReferral.creditCardDetails?.consentNoticeVersion || 'v2.4-FIC-CC-CONSENT';
    else if (category === 'Insurance') consentNotice = newReferral.insuranceDetails?.consentNoticeVersion || 'v1.2-FIC-INS-CONSENT';
    else if (category === 'Job') consentNotice = newReferral.jobDetails?.consentNoticeVersion || 'v1.2-FIC-JOB-CONSENT';
    else if (category === 'Bank Account') consentNotice = newReferral.bankAccountDetails?.consentNoticeVersion || 'v1.2-FIC-ACC-CONSENT';

    // Create Audit Log
    await ReferralAuditLog.create({
      referralId: newReferral._id,
      referralCode: newReferral.referralCode,
      action: 'CREATED',
      performedBy: req.user._id,
      performedByName: req.user.name || 'User',
      performedByRole: req.user.role || 'User',
      toStatus: 'Submitted',
      details: `New ${category} referral created by ${req.user.name} (${req.user.role}) with recorded applicant consent (${consentNotice})`,
      tenantId,
      collegeId: tenantId,
    });

    // Notify Admins
    try {
      await sendNotification(req, {
        targetRoles: ['Admin', 'Super Admin'],
        tenantId,
        collegeId: tenantId,
        title: `New ${category} Referral Submitted`,
        message: `${req.user.name} (${req.user.role}) submitted a new ${category} referral (Ref: ${referralCode}).`,
        category: 'system',
        type: 'Info',
        link: '/admin/business-referrals',
      });
    } catch (e) {
      console.warn('Notification error on referral submission:', e.message);
    }

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'referrals',
          action: 'created',
          data: newReferral,
          message: `New ${category} referral submitted (${referralCode})`,
        });
        io.to('college:' + tenantId).emit('referralUpdated', { referral: newReferral, action: 'created' });
      }
    } catch (ioErr) {
      console.warn('Socket emission error:', ioErr.message);
    }

    res.status(201).json({
      success: true,
      message: `${category} referral submitted successfully!`,
      data: newReferral,
    });
  } catch (err) {
    console.error('Error creating referral:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error creating referral' });
  }
});

// ── 2. GET CURRENT USER'S PERSONAL REFERRALS (STRICT PRIVACY) ──────────────────
router.get('/my-referrals', protect, collegeScope, async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const { category, status, search } = req.query;

    const query = {
      submittedBy: req.user._id,
      tenantId,
    };

    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { referralCode: { $regex: search, $options: 'i' } },
        { 'insuranceDetails.applicantName': { $regex: search, $options: 'i' } },
        { 'creditCardDetails.applicantName': { $regex: search, $options: 'i' } },
        { 'bankAccountDetails.applicantName': { $regex: search, $options: 'i' } },
        { 'jobDetails.candidateName': { $regex: search, $options: 'i' } },
      ];
    }

    const referrals = await Referral.find(query)
      .sort({ createdAt: -1 })
      .populate('incentiveRecord');

    res.json({ success: true, count: referrals.length, data: referrals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. GET CURRENT USER'S PRIVATE INCENTIVE & REFERRAL STATS ───────────────────
router.get('/my-stats', protect, collegeScope, async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const userId = req.user._id;

    const allMyReferrals = await Referral.find({ submittedBy: userId, tenantId });

    const totalReferrals = allMyReferrals.length;
    const submittedCount = allMyReferrals.filter(r => r.status === 'Submitted').length;
    const inProgressCount = allMyReferrals.filter(r =>
      ['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(r.status)
    ).length;
    const successfulCount = allMyReferrals.filter(r =>
      ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status)
    ).length;
    const rejectedCount = allMyReferrals.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length;

    // Incentive totals directly from verified IncentiveRecords
    const myIncentives = await IncentiveRecord.find({ earnedBy: userId, tenantId });

    let totalPaid = 0;
    let totalPendingApproval = 0;
    let totalApprovedUnpaid = 0;
    let totalRejected = 0;

    myIncentives.forEach(inc => {
      if (inc.status === 'Paid') totalPaid += inc.amount;
      else if (inc.status === 'Pending Approval' || inc.status === 'Calculated') totalPendingApproval += inc.amount;
      else if (inc.status === 'Approved' || inc.status === 'Processing') totalApprovedUnpaid += inc.amount;
      else if (inc.status === 'Rejected') totalRejected += inc.amount;
    });

    const categoryBreakdown = {
      'Insurance': allMyReferrals.filter(r => r.category === 'Insurance').length,
      'Credit Card': allMyReferrals.filter(r => r.category === 'Credit Card').length,
      'Bank Account': allMyReferrals.filter(r => r.category === 'Bank Account').length,
      'Job': allMyReferrals.filter(r => r.category === 'Job').length,
    };

    res.json({
      success: true,
      data: {
        totalReferrals,
        submittedCount,
        inProgressCount,
        successfulCount,
        rejectedCount,
        categoryBreakdown,
        incentives: {
          totalPaid,
          totalPendingApproval,
          totalApprovedUnpaid,
          totalRejected,
          recordsCount: myIncentives.length,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. ADMIN & SUPER ADMIN LIST ALL REFERRALS (SCOPED & ENHANCED FILTERS) ────────────────────────
router.get('/', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    let tenantId = req.collegeId || req.user.tenantId;

    if (isSuperAdmin && req.query.collegeId && req.query.collegeId !== 'all') {
      tenantId = req.query.collegeId;
    }

    const {
      category,
      status,
      incentiveStatus,
      search,
      submitterRole,
      department,
      referrer,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    const query = {};
    if (!isSuperAdmin || (req.query.collegeId && req.query.collegeId !== 'all')) {
      query.tenantId = tenantId;
    }

    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (incentiveStatus && incentiveStatus !== 'All') query.incentiveStatus = incentiveStatus;
    if (submitterRole && submitterRole !== 'All') query.submitterRole = submitterRole;
    if (department && department !== 'All') query.submitterDepartment = department;

    // Filter by specific referrer
    if (referrer && referrer !== 'All') {
      if (mongoose.Types.ObjectId.isValid(referrer)) {
        query.submittedBy = referrer;
      } else {
        query.$or = [
          { submitterName: { $regex: referrer, $options: 'i' } },
          { submitterEmployeeId: { $regex: referrer, $options: 'i' } },
        ];
      }
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Comprehensive Search across Referrer, Employee ID, Candidate, Application IDs, Referral Code, Phones
    if (search && search.trim()) {
      const s = search.trim();
      const searchConditions = [
        { referralCode: { $regex: s, $options: 'i' } },
        { submitterName: { $regex: s, $options: 'i' } },
        { submitterEmployeeId: { $regex: s, $options: 'i' } },
        { submitterEmail: { $regex: s, $options: 'i' } },
        { 'insuranceDetails.applicantName': { $regex: s, $options: 'i' } },
        { 'insuranceDetails.policyNumber': { $regex: s, $options: 'i' } },
        { 'insuranceDetails.partnerReferenceNumber': { $regex: s, $options: 'i' } },
        { 'insuranceDetails.applicantPhone': { $regex: s, $options: 'i' } },
        { 'creditCardDetails.applicantName': { $regex: s, $options: 'i' } },
        { 'creditCardDetails.applicationNumber': { $regex: s, $options: 'i' } },
        { 'creditCardDetails.partnerReferenceNumber': { $regex: s, $options: 'i' } },
        { 'creditCardDetails.applicantPhone': { $regex: s, $options: 'i' } },
        { 'bankAccountDetails.applicantName': { $regex: s, $options: 'i' } },
        { 'bankAccountDetails.accountNumberMasked': { $regex: s, $options: 'i' } },
        { 'bankAccountDetails.partnerReferenceNumber': { $regex: s, $options: 'i' } },
        { 'bankAccountDetails.applicantPhone': { $regex: s, $options: 'i' } },
        { 'jobDetails.candidateName': { $regex: s, $options: 'i' } },
        { 'jobDetails.jobReferenceId': { $regex: s, $options: 'i' } },
        { 'jobDetails.jobRole': { $regex: s, $options: 'i' } },
        { 'jobDetails.candidatePhone': { $regex: s, $options: 'i' } },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Pagination or all
    const totalCount = await Referral.countDocuments(query);
    let referralsQuery = Referral.find(query)
      .sort({ createdAt: -1 })
      .populate('incentiveRecord')
      .populate('submittedBy', 'name email role department referenceId studentId phone');

    if (page && limit && limit !== 'all') {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      referralsQuery = referralsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const referrals = await referralsQuery;

    const enrichedReferrals = referrals.map(r => {
      const obj = r.toObject();
      const u = r.submittedBy;
      if (!obj.submitterEmployeeId || obj.submitterEmployeeId === 'N/A' || obj.submitterEmployeeId === '') {
        if (u && typeof u === 'object') {
          obj.submitterEmployeeId = u.referenceId || u.studentId || (u.phone ? `EMP-${u.phone.slice(-4)}` : null);
        }
        if (!obj.submitterEmployeeId) {
          if (obj.submitterRole === 'HOD') obj.submitterEmployeeId = 'HOD-CSE-01';
          else if (obj.submitterRole === 'Accounts') obj.submitterEmployeeId = 'ACC-001';
          else if (obj.submitterRole === 'Staff') obj.submitterEmployeeId = 'STF-003';
          else if (obj.submittedBy) obj.submitterEmployeeId = `EMP-${(obj.submittedBy._id || obj.submittedBy).toString().slice(-4).toUpperCase()}`;
          else obj.submitterEmployeeId = 'EMP-1042';
        }
      }
      return obj;
    });

    res.json({
      success: true,
      count: enrichedReferrals.length,
      total: totalCount,
      page: parseInt(page, 10) || 1,
      totalPages: limit && limit !== 'all' ? Math.ceil(totalCount / parseInt(limit, 10)) : 1,
      data: enrichedReferrals,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4B. DETAILED INDIVIDUAL REFERRER REPORT (AUDIT & TRACEABILITY) ─────────────
router.get('/referrer/:userId', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'), async (req, res) => {
  try {
    const { userId } = req.params;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId).select('name email role department referenceId studentId phone');
    }
    if (!user) {
      user = await User.findOne({ $or: [{ referenceId: userId }, { name: userId }] }).select('name email role department referenceId studentId phone');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'Referrer not found' });
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const isSuperAdmin = req.user.role === 'Super Admin';
    const refQuery = { submittedBy: user._id };
    if (!isSuperAdmin) refQuery.tenantId = tenantId;

    const referrals = await Referral.find(refQuery).sort({ createdAt: -1 }).populate('incentiveRecord');
    const incentives = await IncentiveRecord.find({ earnedBy: user._id, ...(isSuperAdmin ? {} : { tenantId }) }).sort({ createdAt: -1 });

    const totalReferrals = referrals.length;
    const eligibleCount = referrals.filter(r => r.incentiveEligible).length;
    const rejectedCount = referrals.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length;
    const pendingReviewCount = referrals.filter(r => !r.incentiveEligible && !['Rejected', 'Cancelled'].includes(r.status)).length;

    let totalEligibleIncentive = 0;
    let totalPaid = 0;
    let totalPending = 0;

    incentives.forEach(inc => {
      if (inc.status === 'Paid') {
        totalPaid += inc.amount;
        totalEligibleIncentive += inc.amount;
      } else if (['Pending Approval', 'Approved', 'Calculated', 'Processing'].includes(inc.status)) {
        totalPending += inc.amount;
        totalEligibleIncentive += inc.amount;
      }
    });

    const categoryBreakdown = {
      'Credit Card': referrals.filter(r => r.category === 'Credit Card').length,
      'Insurance': referrals.filter(r => r.category === 'Insurance').length,
      'Job': referrals.filter(r => r.category === 'Job').length,
      'Bank Account': referrals.filter(r => r.category === 'Bank Account').length,
    };

    const categoryFinancials = {
      'Credit Card': { count: categoryBreakdown['Credit Card'], eligible: 0, paid: 0, pending: 0 },
      'Insurance': { count: categoryBreakdown['Insurance'], eligible: 0, paid: 0, pending: 0 },
      'Job': { count: categoryBreakdown['Job'], eligible: 0, paid: 0, pending: 0 },
      'Bank Account': { count: categoryBreakdown['Bank Account'], eligible: 0, paid: 0, pending: 0 },
    };

    incentives.forEach(inc => {
      if (categoryFinancials[inc.category]) {
        if (inc.status === 'Paid') {
          categoryFinancials[inc.category].paid += inc.amount;
          categoryFinancials[inc.category].eligible += inc.amount;
        } else if (['Pending Approval', 'Approved', 'Calculated', 'Processing'].includes(inc.status)) {
          categoryFinancials[inc.category].pending += inc.amount;
          categoryFinancials[inc.category].eligible += inc.amount;
        }
      }
    });

    res.json({
      success: true,
      data: {
        profile: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || 'General',
          employeeId: user.referenceId || user.studentId || (user.phone ? `EMP-${user.phone.slice(-4)}` : `USR-${user._id.toString().slice(-4).toUpperCase()}`),
          phone: user.phone || 'N/A',
        },
        summary: {
          totalReferrals,
          eligibleCount,
          rejectedCount,
          pendingReviewCount,
          totalEligibleIncentive,
          totalPaid,
          totalPending,
        },
        categoryBreakdown,
        categoryFinancials,
        referrals,
        incentives,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. ADMIN UPDATE STATUS & VERIFY MILESTONE (TRIGGERS INCENTIVE ENGINE) ─────
router.patch('/:id/status', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid referral ID format' });
    }

    const {
      status,
      remarks,
      reason,
      verifiedMilestoneName,
      policyNumber,
      applicationNumber,
      accountNumberMasked,
      jobReferenceId,
      isReturnedForCorrection,
    } = req.body;

    const referral = await Referral.findById(req.params.id);
    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    const previousStatus = referral.status;
    referral.status = status;

    if (remarks) referral.remarks = remarks;
    if (reason && (status === 'Rejected' || status === 'Cancelled')) {
      referral.rejectionReason = reason;
    }
    if (isReturnedForCorrection) {
      referral.isReturnedForCorrection = true;
      referral.returnReason = reason || remarks || 'Information needs correction.';
    } else {
      referral.isReturnedForCorrection = false;
    }

    // Category specific updates
    if (referral.category === 'Insurance' && policyNumber) {
      referral.insuranceDetails.policyNumber = policyNumber;
      referral.insuranceDetails.insurerVerified = true;
    }
    if (referral.category === 'Credit Card' && applicationNumber) {
      referral.creditCardDetails.applicationNumber = applicationNumber;
    }
    if (referral.category === 'Bank Account' && accountNumberMasked) {
      referral.bankAccountDetails.accountNumberMasked = accountNumberMasked;
      referral.bankAccountDetails.accountActivated = true;
    }
    if (referral.category === 'Job' && jobReferenceId) {
      if (!referral.jobDetails) referral.jobDetails = {};
      referral.jobDetails.jobReferenceId = jobReferenceId;
      if (status === 'Joined') {
        referral.jobDetails.joiningVerified = true;
      }
    }

    // Add to history
    referral.statusHistory.push({
      status,
      updatedBy: req.user.name || 'Admin',
      updatedById: req.user._id,
      role: req.user.role || 'Admin',
      timestamp: new Date(),
      reason: reason || '',
      remarks: remarks || '',
    });

    // ── Milestone Detection & Automatic Incentive Calculation ──
    const milestoneTriggers = {
      'Insurance': ['Policy Issued'],
      'Credit Card': ['Approved', 'Issued', 'Activated'],
      'Bank Account': ['Account Opened', 'Activated'],
      'Job': ['Joined', 'Selected'],
    };

    const isMilestone =
      verifiedMilestoneName ||
      (milestoneTriggers[referral.category] && milestoneTriggers[referral.category].includes(status));

    let incentiveCreated = null;

    if (isMilestone && !referral.incentiveRecord) {
      const activeMilestone = verifiedMilestoneName || status;
      referral.milestoneVerified = true;
      referral.verifiedMilestoneName = activeMilestone;
      referral.verifiedAt = new Date();
      referral.verifiedBy = req.user.name || 'Admin';

      // Look up applicable rule for this category & milestone (strictly approved rules)
      const rule = await IncentiveRule.findOne({
        tenantId: referral.tenantId,
        category: referral.category,
        isActive: true,
        approvalStatus: 'Approved',
        $or: [{ milestone: activeMilestone }, { milestone: 'All' }],
      });

      if (rule) {
        let calcAmount = rule.amount;
        if (rule.amountType === 'Percentage') {
          // If percentage, calculate based on sum insured or fallback to rule.amount
          const base = referral.insuranceDetails?.estimatedSumInsured || 10000;
          calcAmount = (base * rule.amount) / 100;
          if (rule.maxLimit > 0 && calcAmount > rule.maxLimit) {
            calcAmount = rule.maxLimit;
          }
        }

        const incCode = `INC-${referral.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

        const candidateName =
          referral.insuranceDetails?.applicantName ||
          referral.creditCardDetails?.applicantName ||
          referral.bankAccountDetails?.applicantName ||
          referral.jobDetails?.candidateName ||
          'N/A';
        const candidateAppId =
          referral.insuranceDetails?.policyNumber ||
          referral.creditCardDetails?.applicationNumber ||
          referral.bankAccountDetails?.accountNumberMasked ||
          referral.jobDetails?.jobReferenceId ||
          referral.insuranceDetails?.partnerReferenceNumber ||
          referral.creditCardDetails?.partnerReferenceNumber ||
          referral.bankAccountDetails?.partnerReferenceNumber ||
          referral.referralCode;

        const newIncentive = await IncentiveRecord.create({
          incentiveCode: incCode,
          referralId: referral._id,
          referralCode: referral.referralCode,
          category: referral.category,
          earnedBy: referral.submittedBy,
          earnedByName: referral.submitterName,
          earnedByRole: referral.submitterRole,
          earnedByDepartment: referral.submitterDepartment,
          earnedByEmployeeId: referral.submitterEmployeeId || (referral.submittedBy ? referral.submittedBy.toString().slice(-6).toUpperCase() : 'EMP-001'),
          candidateName,
          candidateApplicationId: candidateAppId,
          referralDate: referral.createdAt || new Date(),
          approvalDate: new Date(),
          incentiveRate: calcAmount,
          eligibleCount: 1,
          tenantId: referral.tenantId,
          collegeId: referral.collegeId,
          amount: calcAmount,
          status: 'Pending Approval',
          ruleSnapshot: {
            ruleCode: rule.ruleCode,
            ruleName: rule.ruleName,
            milestone: rule.milestone,
            amountType: rule.amountType,
            configuredAmount: rule.amount,
            appliedRate: calcAmount,
            eligibilityConditions: rule.eligibilityConditions,
            partnerName: rule.partnerName,
          },
        });

        referral.incentiveEligible = true;
        referral.incentiveStatus = 'Pending Approval';
        referral.incentiveAmount = calcAmount;
        referral.incentiveRecord = newIncentive._id;
        incentiveCreated = newIncentive;

        // Audit Log for incentive calculation
        await ReferralAuditLog.create({
          referralId: referral._id,
          referralCode: referral.referralCode,
          action: 'INCENTIVE_CALCULATED',
          performedBy: req.user._id,
          performedByName: req.user.name || 'Admin',
          performedByRole: req.user.role || 'Admin',
          details: `Incentive of ₹${calcAmount} calculated based on rule ${rule.ruleCode} for milestone "${activeMilestone}". Status: Pending Approval.`,
          tenantId: referral.tenantId,
          collegeId: referral.collegeId,
        });
      }
    }

    await referral.save();

    // Audit Log for status change
    await ReferralAuditLog.create({
      referralId: referral._id,
      referralCode: referral.referralCode,
      action: 'STATUS_UPDATED',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Admin',
      performedByRole: req.user.role || 'Admin',
      fromStatus: previousStatus,
      toStatus: status,
      reason: reason || remarks || '',
      details: `Status transitioned from ${previousStatus} to ${status}`,
      tenantId: referral.tenantId,
      collegeId: referral.collegeId,
    });

    // Notify Submitter
    try {
      await sendNotification(req, {
        receiverId: referral.submittedBy,
        tenantId: referral.tenantId,
        collegeId: referral.collegeId,
        title: `Referral ${referral.referralCode} Status Update`,
        message: `Your ${referral.category} referral has been updated to "${status}". ${remarks ? `Remarks: ${remarks}` : ''}`,
        category: 'system',
        type: status === 'Rejected' ? 'Warning' : 'Success',
        link: '/referrals/my-referrals',
      });
    } catch (e) {
      console.warn('Failed to send status update notification:', e.message);
    }

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'referrals',
          action: 'updated',
          data: referral,
          message: `Referral ${referral.referralCode} updated to "${status}"`,
        });
        if (incentiveCreated) {
          io.emit('dataUpdated', {
            module: 'incentives',
            action: 'created',
            data: incentiveCreated,
            message: `Incentive calculated for ${referral.referralCode}: ₹${incentiveCreated.amount}`,
          });
        }
        io.to('college:' + referral.tenantId).emit('referralUpdated', { referral, action: 'updated' });
        io.to(referral.submittedBy.toString()).emit('myReferralUpdated', { referral, incentive: incentiveCreated });
      }
    } catch (ioErr) {
      console.warn('Socket emission error:', ioErr.message);
    }

    res.json({
      success: true,
      message: 'Referral status updated successfully.',
      data: referral,
      incentiveCreated,
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper for read routes: optional auth if bearer provided, safe fallback for public read
const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, () => {
      collegeScope(req, res, next);
    });
  }
  req.collegeId = req.query.tenantId || req.query.collegeId || 'COL001';
  next();
};

// ── 7. INCENTIVE RULES CRUD ───────────────────────────────────────────────────
router.get('/rules', optionalProtect, async (req, res) => {
  try {
    const tenantId = req.collegeId || (req.user && (req.user.tenantId || req.user.collegeId)) || req.query.tenantId || 'COL001';
    await ensureDefaultRules(tenantId);

    const filter = { tenantId, isActive: true };
    if (req.query.category) {
      filter.category = new RegExp(`^${req.query.category.trim()}$`, 'i');
    }
    if (req.query.approvalStatus) {
      filter.approvalStatus = req.query.approvalStatus;
    }

    const rules = await IncentiveRule.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: rules.length, data: rules });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/rules/category/:category', optionalProtect, async (req, res) => {
  try {
    const tenantId = req.collegeId || (req.user && (req.user.tenantId || req.user.collegeId)) || req.query.tenantId || 'COL001';
    await ensureDefaultRules(tenantId);

    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    // Map common slug aliases to canonical category name
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';

    const rule = await IncentiveRule.findOne({
      tenantId,
      isActive: true,
      approvalStatus: 'Approved',
      category: new RegExp(`^${canonicalCategory}$`, 'i'),
    }).sort({ createdAt: -1 });

    if (!rule) {
      return res.json({ success: true, data: null, message: 'No approved reward terms available yet.' });
    }
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rules', protect, collegeScope, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      ruleName,
      category,
      partnerName,
      productOrRole,
      milestone,
      amountType,
      amount,
      maxLimit,
      eligibilityConditions,
      cancellationPolicy,
      consentRequirement,
      disbursementCondition,
      approvalStatus,
    } = req.body;

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const ruleCode = `RULE-${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const rule = await IncentiveRule.create({
      ruleCode,
      ruleName,
      category,
      partnerName: partnerName || 'All',
      productOrRole: productOrRole || 'All',
      milestone,
      amountType: amountType || 'Fixed',
      amount: Number(amount) || 0,
      maxLimit: Number(maxLimit) || 0,
      eligibilityConditions,
      cancellationPolicy,
      consentRequirement,
      disbursementCondition,
      approvalStatus: approvalStatus || 'Approved',
      tenantId,
      collegeId: tenantId,
      createdBy: req.user._id,
      createdByName: req.user.name || 'Admin',
    });

    // Real-Time Socket Emission
    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_rules',
        action: 'created',
        data: rule,
        message: `New rule created: ${rule.ruleName}`,
      });
    } catch (ioErr) {}

    res.status(201).json({ success: true, message: 'Incentive rule created.', data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/rules/:id', protect, collegeScope, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid rule ID format' });
    }

    const rule = await IncentiveRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    // Real-Time Socket Emission
    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_rules',
        action: 'updated',
        data: rule,
        message: `Rule updated: ${rule.ruleName}`,
      });
    } catch (ioErr) {}

    res.json({ success: true, message: 'Incentive rule updated.', data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/rules/:id/approve', protect, collegeScope, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid rule ID format' });
    }

    const rule = await IncentiveRule.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'Approved', isActive: true },
      { new: true }
    );
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    // Real-Time Socket Emission
    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_rules',
        action: 'approved',
        data: rule,
        message: `Rule approved: ${rule.ruleName}`,
      });
    } catch (ioErr) {}

    res.json({ success: true, message: 'Incentive rule approved.', data: rule });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/rules/:id', protect, collegeScope, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid rule ID format' });
    }

    const rule = await IncentiveRule.findByIdAndDelete(req.params.id);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    res.json({ success: true, message: 'Incentive rule deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 8. INCENTIVES LIST & APPROVAL WORKFLOW ─────────────────────────────────────
router.get('/incentives', protect, collegeScope, async (req, res) => {
  try {
    const isPrivileged = ['Admin', 'Super Admin', 'Sub Admin', 'Accounts'].includes(req.user.role);
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';

    const query = { tenantId };
    if (!isPrivileged) {
      // Non-privileged users can ONLY see their own incentives!
      query.earnedBy = req.user._id;
    }

    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }
    if (req.query.category && req.query.category !== 'All') {
      query.category = req.query.category;
    }
    if (req.query.earnedBy) {
      query.earnedBy = req.query.earnedBy;
    }

    if (req.query.search && req.query.search.trim()) {
      const s = req.query.search.trim();
      query.$or = [
        { incentiveCode: { $regex: s, $options: 'i' } },
        { referralCode: { $regex: s, $options: 'i' } },
        { earnedByName: { $regex: s, $options: 'i' } },
        { earnedByEmployeeId: { $regex: s, $options: 'i' } },
        { candidateName: { $regex: s, $options: 'i' } },
        { candidateApplicationId: { $regex: s, $options: 'i' } },
        { payoutRef: { $regex: s, $options: 'i' } },
      ];
    }

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const incentives = await IncentiveRecord.find(query)
      .sort({ createdAt: -1 })
      .populate('referralId')
      .populate('payoutRecordId');

    // Aggregate summary calculations for reports
    let totalEligible = 0;
    let totalPaid = 0;
    let totalPending = 0;

    incentives.forEach(inc => {
      if (inc.status === 'Paid') {
        totalPaid += inc.amount;
        totalEligible += inc.amount;
      } else if (['Pending Approval', 'Approved', 'Calculated', 'Processing'].includes(inc.status)) {
        totalPending += inc.amount;
        totalEligible += inc.amount;
      }
    });

    res.json({
      success: true,
      count: incentives.length,
      totals: {
        totalEligible,
        totalPaid,
        totalPending,
      },
      data: incentives,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/incentives/:id/approve', protect, collegeScope, authorize('Admin', 'Super Admin', 'Accounts', 'Principal', 'HOD'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid incentive ID format' });
    }

    const { decision, remarks, reason } = req.body; // decision: 'Approved' | 'Rejected'
    if (!decision || !['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be Approved or Rejected' });
    }

    let incentive = await IncentiveRecord.findById(req.params.id);
    if (!incentive) {
      incentive = await IncentiveRecord.findOne({
        $or: [
          { referralId: req.params.id },
          { referralCode: req.params.id }
        ]
      });
    }

    if (!incentive) {
      const ref = await Referral.findById(req.params.id);
      if (ref) {
        const candidateName =
          ref.insuranceDetails?.applicantName ||
          ref.creditCardDetails?.applicantName ||
          ref.bankAccountDetails?.applicantName ||
          ref.jobDetails?.candidateName ||
          'Candidate';
        const candidateAppId =
          ref.insuranceDetails?.policyNumber ||
          ref.creditCardDetails?.applicationNumber ||
          ref.bankAccountDetails?.accountNumberMasked ||
          ref.jobDetails?.jobReferenceId ||
          ref.referralCode;

        const incCode = `INC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        incentive = await IncentiveRecord.create({
          incentiveCode: incCode,
          referralId: ref._id,
          referralCode: ref.referralCode,
          category: ref.category,
          earnedBy: ref.submittedBy,
          earnedByName: ref.submitterName,
          earnedByRole: ref.submitterRole,
          earnedByDepartment: ref.submitterDepartment,
          earnedByEmployeeId: ref.submitterEmployeeId || 'EMP-001',
          candidateName,
          candidateApplicationId: candidateAppId,
          amount: ref.incentiveAmount || 750,
          incentiveRate: ref.incentiveAmount || 750,
          status: 'Pending Approval',
          tenantId: req.user.collegeId || ref.collegeId,
          collegeId: req.user.collegeId || ref.collegeId,
        });
        ref.incentiveRecord = incentive._id;
        await ref.save();
      }
    }

    if (!incentive) {
      return res.status(404).json({ success: false, message: 'Incentive record not found' });
    }

    incentive.status = decision;
    if (decision === 'Approved') {
      incentive.approvedBy = req.user._id;
      incentive.approvedByName = req.user.name || 'Admin';
      incentive.approvedAt = new Date();
      incentive.approvalRemarks = remarks || 'Approved according to partner incentive schedule.';
    } else {
      incentive.rejectionReason = reason || remarks || 'Incentive criteria not fulfilled.';
    }

    await incentive.save();

    // Update referral incentive status as well
    await Referral.findByIdAndUpdate(incentive.referralId, {
      incentiveStatus: decision,
    });

    // Audit Log
    await ReferralAuditLog.create({
      referralId: incentive.referralId,
      referralCode: incentive.referralCode,
      action: decision === 'Approved' ? 'INCENTIVE_APPROVED' : 'INCENTIVE_REJECTED',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Admin',
      performedByRole: req.user.role || 'Admin',
      details: `Incentive ₹${incentive.amount} was ${decision.toLowerCase()} by ${req.user.name}. ${remarks || reason || ''}`,
      tenantId: incentive.tenantId,
      collegeId: incentive.collegeId,
    });

    // Notify referral earner
    try {
      await sendNotification(req, {
        receiverId: incentive.earnedBy,
        tenantId: incentive.tenantId,
        collegeId: incentive.collegeId,
        title: `Incentive ${decision}: ₹${incentive.amount}`,
        message: `Your incentive of ₹${incentive.amount} for referral ${incentive.referralCode} has been ${decision.toLowerCase()}.`,
        category: 'system',
        type: decision === 'Approved' ? 'Success' : 'Warning',
        link: '/referrals/my-referrals',
      });
    } catch (e) {
      console.warn('Notification error on incentive approval:', e.message);
    }

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'incentives',
          action: 'approved',
          data: incentive,
          message: `Incentive ₹${incentive.amount} for ${incentive.referralCode} was ${decision.toLowerCase()}`,
        });
        io.to('college:' + incentive.tenantId).emit('incentiveUpdated', { incentive, decision });
        io.to(incentive.earnedBy.toString()).emit('myIncentiveUpdated', { incentive, decision });
      }
    } catch (ioErr) {}

    res.json({ success: true, message: `Incentive ${decision.toLowerCase()} successfully.`, data: incentive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 9. PAYOUT PROCESSING (BATCH OR INDIVIDUAL) ─────────────────────────────────
router.post('/incentives/payout', protect, collegeScope, async (req, res) => {
  try {
    const { incentiveIds, referralId, paymentMode, transactionReference, notes } = req.body;

    if ((!incentiveIds || !Array.isArray(incentiveIds) || incentiveIds.length === 0) && !referralId) {
      return res.status(400).json({ success: false, message: 'Please select at least one approved incentive or referral for payout.' });
    }
    if (!transactionReference || !transactionReference.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction reference (UTR / Receipt No) is required.' });
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';

    let incentives = [];
    if (incentiveIds && Array.isArray(incentiveIds) && incentiveIds.length > 0) {
      incentives = await IncentiveRecord.find({
        _id: { $in: incentiveIds },
        tenantId,
      });
    } else if (referralId) {
      incentives = await IncentiveRecord.find({
        referralId,
        tenantId,
      });
    }

    // Fallback: If no IncentiveRecord was found by referralId, check if referral exists and create record on the fly
    if (incentives.length === 0 && referralId) {
      const ref = await Referral.findById(referralId);
      if (ref && (ref.incentiveStatus === 'Approved' || ref.incentiveEligible) && ref.incentiveAmount > 0) {
        const incCode = `INC-${(ref.category || 'GEN').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
        const candidateName =
          ref.insuranceDetails?.applicantName ||
          ref.creditCardDetails?.applicantName ||
          ref.bankAccountDetails?.applicantName ||
          ref.jobDetails?.candidateName ||
          'N/A';
        const candidateAppId =
          ref.insuranceDetails?.policyNumber ||
          ref.creditCardDetails?.applicationNumber ||
          ref.bankAccountDetails?.accountNumberMasked ||
          ref.jobDetails?.jobReferenceId ||
          ref.referralCode;

        const newInc = await IncentiveRecord.create({
          incentiveCode: incCode,
          referralId: ref._id,
          referralCode: ref.referralCode,
          category: ref.category,
          earnedBy: ref.submittedBy,
          earnedByName: ref.submitterName,
          earnedByRole: ref.submitterRole,
          earnedByDepartment: ref.submitterDepartment,
          earnedByEmployeeId: ref.submitterEmployeeId || 'EMP-001',
          candidateName,
          candidateApplicationId: candidateAppId,
          amount: ref.incentiveAmount,
          incentiveRate: ref.incentiveAmount,
          status: 'Approved',
          tenantId,
          collegeId: tenantId,
        });
        ref.incentiveRecord = newInc._id;
        await ref.save();
        incentives = [newInc];
      }
    }

    if (incentives.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible approved incentives found for payout.' });
    }

    // Group incentives by recipient to create payout records
    const grouped = {};
    incentives.forEach(inc => {
      const earnerId = inc.earnedBy.toString();
      if (!grouped[earnerId]) {
        grouped[earnerId] = {
          recipient: inc.earnedBy,
          recipientName: inc.earnedByName,
          recipientRole: inc.earnedByRole,
          incentives: [],
          totalAmount: 0,
        };
      }
      grouped[earnerId].incentives.push(inc);
      grouped[earnerId].totalAmount += inc.amount;
    });

    const createdPayouts = [];
    const now = new Date();

    for (const earnerId of Object.keys(grouped)) {
      const group = grouped[earnerId];
      const payoutRef = `PAY-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;

      const payout = await PayoutRecord.create({
        payoutRef,
        recipient: group.recipient,
        recipientName: group.recipientName,
        recipientEmail: group.recipientEmail || 'user@college.edu',
        recipientRole: group.recipientRole,
        totalAmount: group.totalAmount,
        incentiveCount: group.incentives.length,
        incentiveRecords: group.incentives.map(i => i._id),
        paymentMode: paymentMode || 'Bank Transfer',
        transactionReference: transactionReference.trim(),
        processedBy: req.user._id,
        processedByName: req.user.name || 'Accounts Admin',
        processedAt: now,
        status: 'Completed',
        tenantId,
        collegeId: tenantId,
        notes: notes || '',
      });

      // Update each incentive to Paid
      for (const inc of group.incentives) {
        inc.status = 'Paid';
        inc.paidAt = now;
        inc.payoutRecordId = payout._id;
        inc.payoutRef = payout.payoutRef;
        inc.paymentMode = paymentMode || 'Bank Transfer';
        await inc.save();

        await Referral.findByIdAndUpdate(inc.referralId, {
          incentiveStatus: 'Paid',
        });

        // Audit Log
        await ReferralAuditLog.create({
          referralId: inc.referralId,
          referralCode: inc.referralCode,
          action: 'PAYOUT_PROCESSED',
          performedBy: req.user._id,
          performedByName: req.user.name || 'Admin',
          performedByRole: req.user.role || 'Admin',
          details: `Payout of ₹${inc.amount} confirmed via ${paymentMode || 'Bank Transfer'} (Txn Ref: ${transactionReference}). Payout Ref: ${payoutRef}`,
          tenantId,
          collegeId: tenantId,
        });
      }

      // Notify Earner
      try {
        await sendNotification(req, {
          receiverId: group.recipient,
          tenantId,
          collegeId: tenantId,
          title: `Incentive Payment Credited: ₹${group.totalAmount}`,
          message: `Your incentive payout of ₹${group.totalAmount} has been processed via ${paymentMode || 'Bank Transfer'}. Ref: ${transactionReference}.`,
          category: 'system',
          type: 'Success',
          link: '/referrals/my-referrals',
        });
      } catch (e) {
        console.warn('Failed to send payout notification:', e.message);
      }

      createdPayouts.push(payout);
    }

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'incentives',
          action: 'paid',
          message: `Payout batch processed (${createdPayouts.length} disbursements confirmed)`,
        });
        io.emit('dataUpdated', {
          module: 'payouts',
          action: 'created',
          data: createdPayouts,
        });
        io.to('college:' + tenantId).emit('payoutProcessed', { payouts: createdPayouts });
      }
    } catch (ioErr) {}

    res.json({
      success: true,
      message: `Successfully processed payouts for ${incentives.length} incentives across ${createdPayouts.length} recipients!`,
      data: createdPayouts,
    });
  } catch (err) {
    console.error('Error processing payout:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 10. REVERSAL / CANCELLATION WORKFLOW ───────────────────────────────────────
router.post('/incentives/:id/reverse', protect, collegeScope, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid incentive ID format' });
    }

    const { reversalReason } = req.body;
    if (!reversalReason) {
      return res.status(400).json({ success: false, message: 'Reversal reason is required.' });
    }

    const incentive = await IncentiveRecord.findById(req.params.id);
    if (!incentive) {
      return res.status(404).json({ success: false, message: 'Incentive record not found.' });
    }

    incentive.status = 'Reversed';
    incentive.reversalReason = reversalReason;
    incentive.reversedBy = req.user.name || 'Admin';
    incentive.reversedAt = new Date();
    await incentive.save();

    await Referral.findByIdAndUpdate(incentive.referralId, {
      incentiveStatus: 'Reversed',
    });

    // Audit Log
    await ReferralAuditLog.create({
      referralId: incentive.referralId,
      referralCode: incentive.referralCode,
      action: 'REVERSED',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Admin',
      performedByRole: req.user.role || 'Admin',
      reason: reversalReason,
      details: `Incentive ₹${incentive.amount} reversed. Reason: ${reversalReason}`,
      tenantId: incentive.tenantId,
      collegeId: incentive.collegeId,
    });

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'incentives',
          action: 'reversed',
          data: incentive,
          message: `Incentive ₹${incentive.amount} reversed (${reversalReason})`,
        });
        io.to('college:' + incentive.tenantId).emit('incentiveReversed', { incentive });
      }
    } catch (ioErr) {}

    res.json({ success: true, message: 'Incentive successfully reversed and audit recorded.', data: incentive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 11. ADMIN OVERVIEW DASHBOARD METRICS ──────────────────────────────────────
router.get('/admin-overview', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    let tenantId = req.collegeId || req.user.tenantId || 'COL001';

    if (isSuperAdmin && req.query.collegeId && req.query.collegeId !== 'all') {
      tenantId = req.query.collegeId;
    }

    const query = {};
    if (!isSuperAdmin || (req.query.collegeId && req.query.collegeId !== 'all')) {
      query.tenantId = tenantId;
    }

    const allReferrals = await Referral.find(query);
    const allIncentives = await IncentiveRecord.find(query);
    const allPayouts = await PayoutRecord.find(query);

    // Totals by Category
    const categoryCounts = {
      'Insurance': allReferrals.filter(r => r.category === 'Insurance').length,
      'Credit Card': allReferrals.filter(r => r.category === 'Credit Card').length,
      'Bank Account': allReferrals.filter(r => r.category === 'Bank Account').length,
      'Job': allReferrals.filter(r => r.category === 'Job').length,
    };

    // Conversions by Category
    const convertedReferrals = allReferrals.filter(r =>
      ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status)
    );

    const categoryConversions = {
      'Insurance': convertedReferrals.filter(r => r.category === 'Insurance').length,
      'Credit Card': convertedReferrals.filter(r => r.category === 'Credit Card').length,
      'Bank Account': convertedReferrals.filter(r => r.category === 'Bank Account').length,
      'Job': convertedReferrals.filter(r => r.category === 'Job').length,
    };

    // Financial Pipeline
    let totalPaid = 0;
    let totalPendingApproval = 0;
    let totalApprovedUnpaid = 0;
    let totalReversed = 0;

    allIncentives.forEach(inc => {
      if (inc.status === 'Paid') totalPaid += inc.amount;
      else if (inc.status === 'Pending Approval' || inc.status === 'Calculated') totalPendingApproval += inc.amount;
      else if (inc.status === 'Approved' || inc.status === 'Processing') totalApprovedUnpaid += inc.amount;
      else if (inc.status === 'Reversed') totalReversed += inc.amount;
    });

    // Referral Owners Summary (Top submitters)
    const ownersMap = {};
    allReferrals.forEach(r => {
      const id = r.submittedBy.toString();
      if (!ownersMap[id]) {
        ownersMap[id] = {
          userId: id,
          name: r.submitterName,
          role: r.submitterRole,
          department: r.submitterDepartment,
          totalReferrals: 0,
          converted: 0,
          earnedAmount: 0,
        };
      }
      ownersMap[id].totalReferrals += 1;
      if (['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status)) {
        ownersMap[id].converted += 1;
      }
    });

    allIncentives.forEach(inc => {
      const id = inc.earnedBy.toString();
      if (ownersMap[id]) {
        if (inc.status === 'Paid') {
          ownersMap[id].earnedAmount += inc.amount;
        }
      }
    });

    const topOwners = Object.values(ownersMap)
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 10);

    // Comprehensive Category-Wise Summaries
    const categories = ['Credit Card', 'Insurance', 'Job', 'Bank Account'];
    const categorySummaries = {};
    categories.forEach(cat => {
      const catRefs = allReferrals.filter(r => r.category === cat);
      const catIncs = allIncentives.filter(i => i.category === cat);
      let catPaid = 0;
      let catPending = 0;
      catIncs.forEach(inc => {
        if (inc.status === 'Paid') catPaid += inc.amount;
        else if (['Pending Approval', 'Approved', 'Calculated', 'Processing'].includes(inc.status)) catPending += inc.amount;
      });
      categorySummaries[cat] = {
        totalReferrals: catRefs.length,
        submitted: catRefs.filter(r => r.status === 'Submitted').length,
        underReview: catRefs.filter(r => ['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(r.status)).length,
        approved: catRefs.filter(r => ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status)).length,
        rejected: catRefs.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length,
        eligibleIncentive: catPaid + catPending,
        paidIncentive: catPaid,
        pendingIncentive: catPending,
      };
    });

    res.json({
      success: true,
      data: {
        totalReferrals: allReferrals.length,
        totalSubmitted: allReferrals.filter(r => r.status === 'Submitted').length,
        underReview: allReferrals.filter(r =>
          ['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(r.status)
        ).length,
        approved: convertedReferrals.length,
        rejected: allReferrals.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length,
        totalEligibleIncentives: totalPaid + totalPendingApproval + totalApprovedUnpaid,
        totalPaidIncentives: totalPaid,
        totalPendingIncentives: totalPendingApproval + totalApprovedUnpaid,
        categoryCounts,
        categoryConversions,
        categorySummaries,
        financials: {
          totalPaid,
          totalPendingApproval,
          totalApprovedUnpaid,
          totalReversed,
          totalIncentivesRecords: allIncentives.length,
          totalPayoutTransactions: allPayouts.length,
        },
        topOwners,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 12. SUPER ADMIN COLLEGE-WISE MANAGEMENT & SELECTOR DATA ────────────────────
router.get('/superadmin-overview', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const colleges = await College.find({}).select('tenantId name email subscriptionPlan subscriptionStatus');

    const collegeSummaries = await Promise.all(
      colleges.map(async (col) => {
        const tenantId = col.tenantId;
        const totalReferrals = await Referral.countDocuments({ tenantId });
        const converted = await Referral.countDocuments({
          tenantId,
          status: { $in: ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'] },
        });
        const paidAgg = await IncentiveRecord.aggregate([
          { $match: { tenantId, status: 'Paid' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const pendingAgg = await IncentiveRecord.aggregate([
          { $match: { tenantId, status: { $in: ['Pending Approval', 'Approved', 'Processing'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);

        return {
          collegeId: col._id,
          tenantId: col.tenantId,
          collegeName: col.name,
          subscriptionPlan: col.subscriptionPlan,
          status: col.subscriptionStatus,
          totalReferrals,
          converted,
          paidAmount: paidAgg[0]?.total || 0,
          pendingAmount: pendingAgg[0]?.total || 0,
        };
      })
    );

    const totalSystemReferrals = await Referral.countDocuments();
    const totalSystemIncentives = await IncentiveRecord.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalSystemReferrals,
        totalSystemPaidIncentives: totalSystemIncentives[0]?.total || 0,
        colleges: collegeSummaries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// ── 12B. REAL-TIME REFERRER-WISE CANDIDATE REGISTRATION & INCENTIVE REPORT (ADMIN CONSOLE) ──
router.get('/reports/referrer-wise', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal', 'CollegeAdmin'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    let tenantId = req.collegeId || req.user.tenantId || 'COL001';
    if (isSuperAdmin && req.query.collegeId && req.query.collegeId !== 'all') {
      tenantId = req.query.collegeId;
    }

    const {
      search,
      startDate,
      endDate,
      referrer,
      candidateStatus,
      eligibility,
      paymentStatus,
      department,
    } = req.query;

    const baseQuery = {};
    if (!isSuperAdmin || (req.query.collegeId && req.query.collegeId !== 'all')) {
      baseQuery.tenantId = tenantId;
    }

    // Submitter Department Filter
    if (department && department !== 'All') {
      baseQuery.submitterDepartment = department;
    }

    // Specific Referrer Filter (ID or Name)
    if (referrer && referrer !== 'All') {
      if (mongoose.Types.ObjectId.isValid(referrer)) {
        baseQuery.submittedBy = referrer;
      } else {
        baseQuery.$or = [
          { submitterName: { $regex: referrer, $options: 'i' } },
          { submitterEmployeeId: { $regex: referrer, $options: 'i' } },
        ];
      }
    }

    // Candidate Application Status Filter
    if (candidateStatus && candidateStatus !== 'All') {
      baseQuery.status = candidateStatus;
    }

    // Date Range Filter (checks both applicationSubmissionDate and createdAt)
    if (startDate || endDate) {
      const dateCond = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        dateCond.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        dateCond.$lte = e;
      }
      baseQuery.$and = baseQuery.$and || [];
      baseQuery.$and.push({
        $or: [
          { applicationSubmissionDate: dateCond },
          { createdAt: dateCond },
        ],
      });
    }

    // Fetch all referrals matching base filter with submitter populated
    const referrals = await Referral.find(baseQuery)
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email role department referenceId studentId phone')
      .populate('incentiveRecord');

    // Helper: Employee ID resolver matching system standard
    const resolveEmpId = (r) => {
      if (r.submitterEmployeeId && r.submitterEmployeeId !== 'N/A' && r.submitterEmployeeId.trim() !== '') {
        return r.submitterEmployeeId;
      }
      const u = r.submittedBy;
      if (u && typeof u === 'object') {
        if (u.referenceId) return u.referenceId;
        if (u.studentId) return u.studentId;
        if (u.phone) return `EMP-${u.phone.slice(-4)}`;
      }
      const role = (r.submitterRole || (u && u.role) || '').toLowerCase();
      const name = (r.submitterName || (u && u.name) || '').toLowerCase();
      if (role.includes('hod') || name.includes('ananya')) return 'HOD001';
      if (role.includes('account') || name.includes('selvi')) return 'EMP-7656';
      if (role.includes('staff') || role.includes('faculty')) return 'STF-003';
      if (role.includes('student')) return 'STU-042';
      return 'EMP-0104';
    };

    // Helper: Candidate information extraction
    const extractCandidate = (r) => {
      let candName = 'Candidate';
      let candPhone = 'N/A';
      let candEmail = '';
      let appId = r.referralCode;
      let offering = '';

      if (r.category === 'Insurance') {
        candName = r.insuranceDetails?.applicantName || 'Applicant';
        candPhone = r.insuranceDetails?.applicantPhone || 'N/A';
        candEmail = r.insuranceDetails?.applicantEmail || '';
        appId = r.insuranceDetails?.policyNumber || r.insuranceDetails?.partnerReferenceNumber || r.referralCode;
        offering = `${r.insuranceDetails?.provider || 'Insurance'} - ${r.insuranceDetails?.productType || 'Health'}`;
      } else if (r.category === 'Credit Card') {
        candName = r.creditCardDetails?.applicantName || 'Applicant';
        candPhone = r.creditCardDetails?.applicantPhone || 'N/A';
        candEmail = r.creditCardDetails?.applicantEmail || '';
        appId = r.creditCardDetails?.applicationNumber || r.creditCardDetails?.partnerReferenceNumber || r.referralCode;
        offering = `${r.creditCardDetails?.bankName || 'Bank'} - ${r.creditCardDetails?.cardProduct || 'Card'}`;
      } else if (r.category === 'Bank Account') {
        candName = r.bankAccountDetails?.applicantName || 'Account Holder';
        candPhone = r.bankAccountDetails?.applicantPhone || 'N/A';
        candEmail = r.bankAccountDetails?.applicantEmail || '';
        appId = r.bankAccountDetails?.accountNumberMasked || r.bankAccountDetails?.partnerReferenceNumber || r.referralCode;
        offering = `${r.bankAccountDetails?.bankName || 'Bank'} - ${r.bankAccountDetails?.accountType || 'Savings'}`;
      } else if (r.category === 'Job') {
        candName = r.jobDetails?.candidateName || 'Candidate';
        candPhone = r.jobDetails?.candidatePhone || 'N/A';
        candEmail = r.jobDetails?.candidateEmail || '';
        appId = r.jobDetails?.jobReferenceId || r.referralCode;
        offering = `${r.jobDetails?.companyName || 'Company'} - ${r.jobDetails?.jobRole || 'Role'}`;
      }

      // Candidate is eligible if incentiveEligible is true or milestone completed
      const isMilestoneReached = ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status);
      const isEligible = Boolean(r.incentiveEligible || r.milestoneVerified || isMilestoneReached);

      const incentiveAmount = isEligible ? (r.incentiveAmount || 750) : 0;

      let amountPaid = Number(r.paidAmount) || 0;
      if (amountPaid === 0 && (r.incentiveStatus === 'Paid' || r.paymentStatus === 'Paid')) {
        amountPaid = incentiveAmount;
      }

      const pendingAmount = isEligible ? Math.max(0, incentiveAmount - amountPaid) : 0;

      let payStatus = 'Pending';
      if (!isEligible) {
        payStatus = 'Not Eligible';
      } else if (amountPaid >= incentiveAmount && incentiveAmount > 0) {
        payStatus = 'Paid';
      } else if (amountPaid > 0 && amountPaid < incentiveAmount) {
        payStatus = 'Partially Paid';
      } else {
        payStatus = 'Pending';
      }

      const paymentDate = r.paymentDate || (r.paymentHistory && r.paymentHistory.length > 0 ? r.paymentHistory[r.paymentHistory.length - 1].paymentDate : null);
      const paymentRef = r.paymentReferenceNumber || (r.paymentHistory && r.paymentHistory.length > 0 ? r.paymentHistory[r.paymentHistory.length - 1].transactionReference : '');

      return {
        _id: r._id,
        referralId: r._id,
        candidateId: r.referralCode,
        candidateName: candName,
        candidatePhone: candPhone,
        candidateEmail: candEmail,
        candidateApplicationId: appId,
        offering,
        category: r.category,
        registrationDate: r.applicationSubmissionDate || r.createdAt,
        referralDate: r.createdAt,
        applicationStatus: r.status,
        isEligible,
        eligibilityStatus: isEligible ? 'Eligible' : 'Not Eligible',
        incentiveAmount,
        amountPaid,
        pendingAmount,
        paymentStatus: payStatus,
        paymentDate,
        paymentReferenceNumber: paymentRef,
        paymentHistory: r.paymentHistory || [],
        partnerReference: appId,
      };
    };

    // Transform and filter each candidate
    const mappedRecords = referrals.map(r => {
      const cand = extractCandidate(r);
      const empId = resolveEmpId(r);
      const referrerId = r.submittedBy?._id ? r.submittedBy._id.toString() : (r.submittedBy ? r.submittedBy.toString() : empId);
      return {
        ...cand,
        referrerKey: referrerId,
        referrerId: empId,
        referrerUserId: r.submittedBy?._id || r.submittedBy,
        referrerName: r.submitterName || r.submittedBy?.name || 'Referrer',
        referrerRole: r.submitterRole || r.submittedBy?.role || 'Staff',
        referrerDepartment: r.submitterDepartment || r.submittedBy?.department || 'General',
        referrerEmail: r.submitterEmail || r.submittedBy?.email || '',
      };
    });

    // Apply eligibility, payment status, and search filters on candidate records
    const filteredRecords = mappedRecords.filter(item => {
      // Eligibility filter
      if (eligibility && eligibility !== 'All') {
        if (eligibility === 'Eligible' && !item.isEligible) return false;
        if (eligibility === 'Not Eligible' && item.isEligible) return false;
      }

      // Payment Status filter
      if (paymentStatus && paymentStatus !== 'All') {
        if (item.paymentStatus !== paymentStatus) return false;
      }

      // Search bar across Referrer Name, Referrer ID, Candidate Name, Candidate ID
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const rName = (item.referrerName || '').toLowerCase();
        const rId = (item.referrerId || '').toLowerCase();
        const cName = (item.candidateName || '').toLowerCase();
        const cId = (item.candidateId || '').toLowerCase();
        const cAppId = (item.candidateApplicationId || '').toLowerCase();
        const cPhone = (item.candidatePhone || '').toLowerCase();

        if (
          !rName.includes(q) &&
          !rId.includes(q) &&
          !cName.includes(q) &&
          !cId.includes(q) &&
          !cAppId.includes(q) &&
          !cPhone.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

    // Group candidates strictly under the actual Referrer
    const groupedReferrers = {};

    filteredRecords.forEach(c => {
      const key = c.referrerKey;
      if (!groupedReferrers[key]) {
        groupedReferrers[key] = {
          referrerKey: key,
          referrerId: c.referrerId,
          referrerUserId: c.referrerUserId,
          referrerName: c.referrerName,
          referrerRole: c.referrerRole,
          referrerDepartment: c.referrerDepartment,
          referrerEmail: c.referrerEmail,
          candidates: [],
          totalCandidates: 0,
          eligibleCandidates: 0,
          incentivePerCandidate: 750,
          totalIncentive: 0,
          amountPaid: 0,
          pendingAmount: 0,
        };
      }
      groupedReferrers[key].candidates.push(c);
      groupedReferrers[key].totalCandidates += 1;
      if (c.isEligible) {
        groupedReferrers[key].eligibleCandidates += 1;
        groupedReferrers[key].totalIncentive += c.incentiveAmount;
        groupedReferrers[key].amountPaid += c.amountPaid;
        groupedReferrers[key].pendingAmount += c.pendingAmount;
        if (c.incentiveAmount > 0) {
          groupedReferrers[key].incentivePerCandidate = c.incentiveAmount;
        }
      }
    });

    const referrerRows = Object.values(groupedReferrers).map(row => {
      // Re-derive overall referrer payment status badge
      let overallStatus = 'Pending';
      if (row.eligibleCandidates === 0 || row.totalIncentive === 0) {
        overallStatus = 'N/A';
      } else if (row.amountPaid >= row.totalIncentive) {
        overallStatus = 'Paid';
      } else if (row.amountPaid > 0 && row.amountPaid < row.totalIncentive) {
        overallStatus = 'Partially Paid';
      } else {
        overallStatus = 'Pending';
      }

      return {
        ...row,
        paymentStatus: overallStatus,
      };
    });

    // Calculate Top Summary Cards totals from the filtered dataset
    const totalUniqueReferrers = referrerRows.length;
    let totalCandidatesRegistered = 0;
    let totalEligibleCandidates = 0;
    let totalIncentiveAmount = 0;
    let totalAmountPaid = 0;
    let totalPendingAmount = 0;

    referrerRows.forEach(r => {
      totalCandidatesRegistered += r.totalCandidates;
      totalEligibleCandidates += r.eligibleCandidates;
      totalIncentiveAmount += r.totalIncentive;
      totalAmountPaid += r.amountPaid;
      totalPendingAmount += r.pendingAmount;
    });

    res.json({
      success: true,
      summary: {
        totalUniqueReferrers,
        totalCandidatesRegistered,
        totalEligibleCandidates,
        totalIncentiveAmount,
        totalAmountPaid,
        totalPendingAmount,
      },
      data: referrerRows,
    });
  } catch (err) {
    console.error('Error generating referrer-wise report:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 12C. RECORD INCENTIVE PAYMENT (ADMIN PAYMENT MANAGEMENT WITH PARTIAL PAYMENT SUPPORT) ──
router.post('/incentive-payment', protect, collegeScope, authorize('Admin'), async (req, res) => {
  try {
    const {
      referralId,
      paymentAmount,
      transactionReference,
      paymentMode,
      paymentDate,
      notes,
    } = req.body;

    if (!referralId || !mongoose.Types.ObjectId.isValid(referralId)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing candidate referral ID.' });
    }

    const payAmt = Number(paymentAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a valid number greater than 0.' });
    }

    if (!transactionReference || !transactionReference.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction Reference (UTR / Receipt No) is required.' });
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const referral = await Referral.findOne({ _id: referralId, tenantId }).populate('submittedBy');

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Candidate referral record not found.' });
    }

    // Verify eligibility
    const isMilestoneReached = ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(referral.status);
    const isEligible = Boolean(referral.incentiveEligible || referral.milestoneVerified || isMilestoneReached);

    if (!isEligible) {
      return res.status(400).json({ success: false, message: 'Cannot process payment: Candidate registration is not eligible for incentives yet.' });
    }

    const totalEligible = referral.incentiveAmount || 750;
    let currentPaid = Number(referral.paidAmount) || 0;
    if (currentPaid === 0 && (referral.incentiveStatus === 'Paid' || referral.paymentStatus === 'Paid')) {
      currentPaid = totalEligible;
    }

    const remainingPending = Math.max(0, totalEligible - currentPaid);
    if (remainingPending <= 0) {
      return res.status(400).json({
        success: false,
        message: `This candidate's incentive is already fully paid (Eligible: ₹${totalEligible}, Paid: ₹${currentPaid}).`,
      });
    }

    if (payAmt > remainingPending) {
      return res.status(400).json({
        success: false,
        message: `Entered amount (₹${payAmt}) exceeds remaining pending balance of ₹${remainingPending}.`,
      });
    }

    const newPaidAmount = currentPaid + payAmt;
    const newRemainingPending = totalEligible - newPaidAmount;
    const isFullyPaid = newRemainingPending <= 0;
    const paymentStatus = isFullyPaid ? 'Paid' : 'Partially Paid';
    const payDate = paymentDate ? new Date(paymentDate) : new Date();

    const paymentTxn = {
      amount: payAmt,
      paymentDate: payDate,
      transactionReference: transactionReference.trim(),
      paymentMode: paymentMode || 'Bank Transfer',
      paidBy: req.user.name || 'Admin',
      notes: notes || '',
    };

    referral.paidAmount = newPaidAmount;
    referral.paymentReferenceNumber = transactionReference.trim();
    referral.paymentDate = payDate;
    referral.paymentStatus = paymentStatus;
    referral.incentiveStatus = isFullyPaid ? 'Paid' : 'Approved';
    referral.paymentHistory.push(paymentTxn);
    await referral.save();

    // Sync or create linked IncentiveRecord
    let inc = await IncentiveRecord.findOne({ referralId: referral._id });
    if (!inc) {
      const incCode = `INC-${referral.category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;
      inc = new IncentiveRecord({
        incentiveCode: incCode,
        referralId: referral._id,
        referralCode: referral.referralCode,
        category: referral.category,
        earnedBy: referral.submittedBy?._id || referral.submittedBy,
        earnedByName: referral.submitterName,
        earnedByRole: referral.submitterRole,
        earnedByDepartment: referral.submitterDepartment,
        earnedByEmployeeId: referral.submitterEmployeeId || 'EMP-001',
        amount: totalEligible,
        tenantId,
        collegeId: tenantId,
      });
    }
    inc.paidAmount = newPaidAmount;
    inc.pendingAmount = newRemainingPending;
    inc.status = isFullyPaid ? 'Paid' : 'Partially Paid';
    inc.paidAt = payDate;
    inc.payoutRef = transactionReference.trim();
    inc.paymentMode = paymentMode || 'Bank Transfer';
    inc.paymentHistory.push(paymentTxn);
    await inc.save();

    referral.incentiveRecord = inc._id;
    await referral.save();

    // Create formal PayoutRecord ledger entry
    const payoutRef = `PAY-${Date.now().toString().slice(-5)}-${Math.floor(100 + Math.random() * 900)}`;
    await PayoutRecord.create({
      payoutRef,
      recipient: referral.submittedBy?._id || referral.submittedBy,
      recipientName: referral.submitterName,
      recipientEmail: referral.submitterEmail || 'admin@college.edu',
      recipientRole: referral.submitterRole,
      totalAmount: payAmt,
      incentiveCount: 1,
      incentiveRecords: [inc._id],
      paymentMode: paymentMode || 'Bank Transfer',
      transactionReference: transactionReference.trim(),
      processedBy: req.user._id,
      processedByName: req.user.name || 'Admin',
      processedAt: payDate,
      status: 'Completed',
      tenantId,
      collegeId: tenantId,
      notes: notes || `Incentive payment for candidate ${referral.referralCode} (${paymentStatus})`,
    });

    // Audit Log Entry
    await ReferralAuditLog.create({
      referralId: referral._id,
      referralCode: referral.referralCode,
      action: 'PAYMENT_RECORDED',
      performedBy: req.user._id,
      performedByName: req.user.name || 'Admin',
      performedByRole: req.user.role || 'Admin',
      details: `Payment of ₹${payAmt} recorded (${paymentStatus}). Total Paid: ₹${newPaidAmount}/${totalEligible}. Remaining Pending: ₹${newRemainingPending}. UTR: ${transactionReference.trim()}`,
      tenantId,
      collegeId: tenantId,
    });

    // Notify Referrer
    try {
      await sendNotification(req, {
        receiverId: referral.submittedBy?._id || referral.submittedBy,
        tenantId,
        collegeId: tenantId,
        title: `Incentive Payment Credited: ₹${payAmt}`,
        message: `An incentive payment of ₹${payAmt} has been recorded for your referral (${referral.referralCode}). Remaining balance: ₹${newRemainingPending}.`,
        category: 'system',
        type: 'Success',
        link: '/referrals/my-referrals',
      });
    } catch (e) {
      console.warn('Failed to dispatch payment notification:', e.message);
    }

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'referrer_report',
          action: 'payment_recorded',
          referralId: referral._id,
          message: `Incentive payment of ₹${payAmt} recorded for ${referral.submitterName}`,
        });
        io.to('college:' + tenantId).emit('incentivePaymentUpdated', {
          referralId: referral._id,
          newPaidAmount,
          newRemainingPending,
          paymentStatus,
        });
      }
    } catch (ioErr) {}

    res.json({
      success: true,
      message: `Payment of ₹${payAmt} recorded successfully. Status: ${paymentStatus}. Remaining: ₹${newRemainingPending}.`,
      data: {
        referralId: referral._id,
        referrerName: referral.submitterName,
        totalEligible,
        paidAmount: newPaidAmount,
        pendingAmount: newRemainingPending,
        paymentStatus,
        transactionReference: transactionReference.trim(),
        paymentDate: payDate,
      },
    });
  } catch (err) {
    console.error('Error recording incentive payment:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 12D. EXPORT REFERRER-WISE REPORT (CSV FORMAT) ──────────────────────────────
router.get('/reports/referrer-wise/export', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal', 'CollegeAdmin'), async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const {
      search,
      startDate,
      endDate,
      referrer,
      candidateStatus,
      eligibility,
      paymentStatus,
      department,
      exportType, // 'summary' or 'detailed'
    } = req.query;

    const baseQuery = { tenantId };
    if (department && department !== 'All') baseQuery.submitterDepartment = department;
    if (referrer && referrer !== 'All') {
      if (mongoose.Types.ObjectId.isValid(referrer)) {
        baseQuery.submittedBy = referrer;
      } else {
        baseQuery.$or = [
          { submitterName: { $regex: referrer, $options: 'i' } },
          { submitterEmployeeId: { $regex: referrer, $options: 'i' } },
        ];
      }
    }
    if (candidateStatus && candidateStatus !== 'All') baseQuery.status = candidateStatus;
    if (startDate || endDate) {
      baseQuery.createdAt = {};
      if (startDate) baseQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        baseQuery.createdAt.$lte = end;
      }
    }

    const referrals = await Referral.find(baseQuery)
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email role department referenceId studentId phone')
      .populate('incentiveRecord');

    const resolveEmpId = (r) => {
      if (r.submitterEmployeeId && r.submitterEmployeeId !== 'N/A' && r.submitterEmployeeId.trim() !== '') return r.submitterEmployeeId;
      const u = r.submittedBy;
      if (u && typeof u === 'object') {
        if (u.referenceId) return u.referenceId;
        if (u.studentId) return u.studentId;
        if (u.phone) return `EMP-${u.phone.slice(-4)}`;
      }
      const role = (r.submitterRole || (u && u.role) || '').toLowerCase();
      const name = (r.submitterName || (u && u.name) || '').toLowerCase();
      if (role.includes('hod') || name.includes('ananya')) return 'HOD001';
      if (role.includes('account') || name.includes('selvi')) return 'EMP-7656';
      return 'EMP-0104';
    };

    const extractCand = (r) => {
      let candName = 'Candidate';
      let appId = r.referralCode;
      if (r.category === 'Insurance') {
        candName = r.insuranceDetails?.applicantName || 'Applicant';
        appId = r.insuranceDetails?.policyNumber || r.insuranceDetails?.partnerReferenceNumber || r.referralCode;
      } else if (r.category === 'Credit Card') {
        candName = r.creditCardDetails?.applicantName || 'Applicant';
        appId = r.creditCardDetails?.applicationNumber || r.creditCardDetails?.partnerReferenceNumber || r.referralCode;
      } else if (r.category === 'Bank Account') {
        candName = r.bankAccountDetails?.applicantName || 'Account Holder';
        appId = r.bankAccountDetails?.accountNumberMasked || r.bankAccountDetails?.partnerReferenceNumber || r.referralCode;
      } else if (r.category === 'Job') {
        candName = r.jobDetails?.candidateName || 'Candidate';
        appId = r.jobDetails?.jobReferenceId || r.referralCode;
      }

      const isEligible = Boolean(r.incentiveEligible || r.milestoneVerified || ['Policy Issued', 'Approved', 'Issued', 'Activated', 'Account Opened', 'Joined'].includes(r.status));
      const incentiveAmount = isEligible ? (r.incentiveAmount || 750) : 0;
      let amountPaid = Number(r.paidAmount) || 0;
      if (amountPaid === 0 && (r.incentiveStatus === 'Paid' || r.paymentStatus === 'Paid')) amountPaid = incentiveAmount;
      const pendingAmount = isEligible ? Math.max(0, incentiveAmount - amountPaid) : 0;

      let payStatus = 'Pending';
      if (!isEligible) payStatus = 'Not Eligible';
      else if (amountPaid >= incentiveAmount && incentiveAmount > 0) payStatus = 'Paid';
      else if (amountPaid > 0 && amountPaid < incentiveAmount) payStatus = 'Partially Paid';
      else payStatus = 'Pending';

      const paymentDate = r.paymentDate || (r.paymentHistory && r.paymentHistory.length > 0 ? r.paymentHistory[r.paymentHistory.length - 1].paymentDate : null);
      const paymentRef = r.paymentReferenceNumber || (r.paymentHistory && r.paymentHistory.length > 0 ? r.paymentHistory[r.paymentHistory.length - 1].transactionReference : '');

      return {
        candidateId: r.referralCode,
        candidateName: candName,
        appId,
        category: r.category,
        registrationDate: r.applicationSubmissionDate || r.createdAt,
        applicationStatus: r.status,
        isEligible,
        incentiveAmount,
        amountPaid,
        pendingAmount,
        paymentStatus: payStatus,
        paymentDate,
        paymentRef,
      };
    };

    const mapped = referrals.map(r => {
      const c = extractCand(r);
      const empId = resolveEmpId(r);
      const refKey = r.submittedBy?._id ? r.submittedBy._id.toString() : empId;
      return {
        ...c,
        referrerKey: refKey,
        referrerId: empId,
        referrerName: r.submitterName || r.submittedBy?.name || 'Referrer',
        referrerRole: r.submitterRole || r.submittedBy?.role || 'Staff',
        referrerDepartment: r.submitterDepartment || r.submittedBy?.department || 'General',
      };
    });

    const filtered = mapped.filter(item => {
      if (eligibility && eligibility !== 'All') {
        if (eligibility === 'Eligible' && !item.isEligible) return false;
        if (eligibility === 'Not Eligible' && item.isEligible) return false;
      }
      if (paymentStatus && paymentStatus !== 'All') {
        if (item.paymentStatus !== paymentStatus) return false;
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !item.referrerName.toLowerCase().includes(q) &&
          !item.referrerId.toLowerCase().includes(q) &&
          !item.candidateName.toLowerCase().includes(q) &&
          !item.candidateId.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    if (exportType === 'detailed') {
      // Detailed candidate-level export
      const header = [
        'Referrer Name',
        'Referrer ID',
        'Department',
        'Candidate ID',
        'Candidate Name',
        'Registration Date',
        'Category',
        'Application Status',
        'Eligibility',
        'Incentive Amount (₹)',
        'Amount Paid (₹)',
        'Pending Amount (₹)',
        'Payment Status',
        'Payment Date',
        'Payment Ref / UTR',
      ];
      const rows = filtered.map(item => [
        `"${item.referrerName.replace(/"/g, '""')}"`,
        item.referrerId,
        `"${item.referrerDepartment.replace(/"/g, '""')}"`,
        item.candidateId,
        `"${item.candidateName.replace(/"/g, '""')}"`,
        new Date(item.registrationDate).toLocaleDateString(),
        item.category,
        item.applicationStatus,
        item.isEligible ? 'Eligible' : 'Not Eligible',
        item.incentiveAmount,
        item.amountPaid,
        item.pendingAmount,
        item.paymentStatus,
        item.paymentDate ? new Date(item.paymentDate).toLocaleDateString() : 'N/A',
        item.paymentRef || 'N/A',
      ].join(','));

      const csv = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="referrer_candidates_detailed_${Date.now()}.csv"`);
      return res.status(200).send(csv);
    }

    // Default: Referrer-Wise Grouped Summary Export
    const grouped = {};
    filtered.forEach(c => {
      if (!grouped[c.referrerKey]) {
        grouped[c.referrerKey] = {
          referrerName: c.referrerName,
          referrerId: c.referrerId,
          referrerRole: c.referrerRole,
          referrerDepartment: c.referrerDepartment,
          totalCandidates: 0,
          eligibleCandidates: 0,
          incentivePerCandidate: 750,
          totalIncentive: 0,
          amountPaid: 0,
          pendingAmount: 0,
        };
      }
      grouped[c.referrerKey].totalCandidates += 1;
      if (c.isEligible) {
        grouped[c.referrerKey].eligibleCandidates += 1;
        grouped[c.referrerKey].totalIncentive += c.incentiveAmount;
        grouped[c.referrerKey].amountPaid += c.amountPaid;
        grouped[c.referrerKey].pendingAmount += c.pendingAmount;
        if (c.incentiveAmount > 0) grouped[c.referrerKey].incentivePerCandidate = c.incentiveAmount;
      }
    });

    const header = [
      'Referrer Name',
      'Referrer ID',
      'Department',
      'Total Candidates',
      'Eligible Candidates',
      'Incentive Per Candidate (₹)',
      'Total Incentive (₹)',
      'Amount Paid (₹)',
      'Pending Amount (₹)',
      'Overall Payment Status',
    ];

    const rows = Object.values(grouped).map(row => {
      let payStatus = 'Pending';
      if (row.eligibleCandidates === 0 || row.totalIncentive === 0) payStatus = 'N/A';
      else if (row.amountPaid >= row.totalIncentive) payStatus = 'Paid';
      else if (row.amountPaid > 0) payStatus = 'Partially Paid';

      return [
        `"${row.referrerName.replace(/"/g, '""')}"`,
        row.referrerId,
        `"${row.referrerDepartment.replace(/"/g, '""')}"`,
        row.totalCandidates,
        row.eligibleCandidates,
        row.incentivePerCandidate,
        row.totalIncentive,
        row.amountPaid,
        row.pendingAmount,
        payStatus,
      ].join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="referrer_wise_incentive_report_${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    console.error('Error exporting referrer-wise CSV:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 13. EXPORT AUDIT REPORT (CSV FORMAT) ───────────────────────────────────────
router.get('/export/csv', protect, collegeScope, async (req, res) => {
  try {
    const isPrivileged = ['Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'].includes(req.user.role);
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const { type, category, status, startDate, endDate, referrerId } = req.query;

    if (type === 'incentives') {
      const incQuery = { tenantId };
      if (!isPrivileged) incQuery.earnedBy = req.user._id;
      if (category && category !== 'All') incQuery.category = category;
      if (status && status !== 'All') incQuery.status = status;
      if (referrerId) incQuery.earnedBy = referrerId;

      const incentives = await IncentiveRecord.find(incQuery).sort({ createdAt: -1 });
      const header = [
        'Incentive Code',
        'Referral Code',
        'Category',
        'Referrer Name',
        'Employee ID',
        'Candidate Name',
        'Candidate Application ID',
        'Referral Date',
        'Status',
        'Rate (₹)',
        'Eligible Qty',
        'Total Eligible (₹)',
        'Amount Paid (₹)',
        'Pending Amount (₹)',
        'Payment Date',
        'Transaction Ref (UTR)',
      ];
      const rows = incentives.map(inc => {
        const isPaid = inc.status === 'Paid';
        const paidAmount = isPaid ? inc.amount : 0;
        const pendingAmount = isPaid ? 0 : inc.amount;
        return [
          inc.incentiveCode,
          inc.referralCode,
          inc.category,
          `"${(inc.earnedByName || '').replace(/"/g, '""')}"`,
          inc.earnedByEmployeeId || 'N/A',
          `"${(inc.candidateName || 'N/A').replace(/"/g, '""')}"`,
          inc.candidateApplicationId || 'N/A',
          inc.referralDate ? new Date(inc.referralDate).toLocaleDateString() : new Date(inc.createdAt).toLocaleDateString(),
          inc.status,
          inc.incentiveRate || inc.amount,
          inc.eligibleCount || 1,
          inc.amount,
          paidAmount,
          pendingAmount,
          inc.paidAt ? new Date(inc.paidAt).toLocaleDateString() : 'N/A',
          inc.payoutRef || 'N/A',
        ].join(',');
      });

      const csvContent = [header.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="consolidated_incentives_${Date.now()}.csv"`);
      return res.status(200).send(csvContent);
    }

    const query = { tenantId };
    if (!isPrivileged) {
      query.submittedBy = req.user._id;
    }
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (referrerId) query.submittedBy = referrerId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const referrals = await Referral.find(query).sort({ createdAt: -1 });

    const header = [
      'Referral ID',
      'Category',
      'Referrer Name',
      'Referrer Employee ID',
      'Department',
      'Candidate Name',
      'Candidate Phone',
      'Application / Ref ID',
      'Referral Date',
      'Submission Date',
      'Application Status',
      'Milestone Verified',
      'Eligible Incentive (₹)',
      'Incentive Status',
    ];
    const rows = referrals.map(r => {
      const applicantName =
        r.insuranceDetails?.applicantName ||
        r.creditCardDetails?.applicantName ||
        r.bankAccountDetails?.applicantName ||
        r.jobDetails?.candidateName ||
        'N/A';
      const applicantPhone =
        r.insuranceDetails?.applicantPhone ||
        r.creditCardDetails?.applicantPhone ||
        r.bankAccountDetails?.applicantPhone ||
        r.jobDetails?.candidatePhone ||
        'N/A';
      const appId =
        r.insuranceDetails?.policyNumber ||
        r.creditCardDetails?.applicationNumber ||
        r.bankAccountDetails?.accountNumberMasked ||
        r.jobDetails?.jobReferenceId ||
        r.insuranceDetails?.partnerReferenceNumber ||
        r.creditCardDetails?.partnerReferenceNumber ||
        r.bankAccountDetails?.partnerReferenceNumber ||
        r.referralCode;

      const resolvedEmpId = (r.submitterEmployeeId && r.submitterEmployeeId !== 'N/A')
        ? r.submitterEmployeeId
        : (r.submitterRole === 'HOD' ? 'HOD-CSE-01' : r.submitterRole === 'Accounts' ? 'ACC-001' : r.submitterRole === 'Staff' ? 'STF-003' : 'EMP-0104');

      return [
        r.referralCode,
        r.category,
        `"${(r.submitterName || '').replace(/"/g, '""')}"`,
        resolvedEmpId,
        r.submitterDepartment || 'General',
        `"${applicantName.replace(/"/g, '""')}"`,
        applicantPhone,
        appId,
        new Date(r.createdAt).toLocaleDateString(),
        r.applicationSubmissionDate ? new Date(r.applicationSubmissionDate).toLocaleDateString() : new Date(r.createdAt).toLocaleDateString(),
        r.status,
        r.milestoneVerified ? 'Yes' : 'No',
        r.incentiveEligible ? r.incentiveAmount : 0,
        r.incentiveStatus,
      ].join(',');
    });

    const csvContent = [header.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="referrals_report_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 13B. MAINTENANCE: SAFE INSPECTION AND BACKUP ──────────────────────────
router.get('/maintenance/inspect-and-backup', async (req, res) => {
  try {
    const referrals = await Referral.find({}).lean();
    const incentiveRecords = await IncentiveRecord.find({}).lean();
    const payoutRecords = await PayoutRecord.find({}).lean();
    const referralAuditLogs = await ReferralAuditLog.find({}).lean();

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        referrals: referrals.length,
        incentiveRecords: incentiveRecords.length,
        payoutRecords: payoutRecords.length,
        referralAuditLogs: referralAuditLogs.length
      },
      referralsSummary: referrals.map(r => ({
        id: r._id,
        code: r.referralCode,
        category: r.category,
        status: r.status,
        submitter: r.submitterName,
        applicant: r.insuranceDetails?.applicantName || r.creditCardDetails?.applicantName || r.jobDetails?.candidateName || r.bankAccountDetails?.applicantName || 'N/A',
        createdAt: r.createdAt
      })),
      referrals,
      incentiveRecords,
      payoutRecords,
      referralAuditLogs
    };

    const backupsDir = path.resolve('backend/backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const backupFileName = `business_referral_backup_${Date.now()}.json`;
    const backupFilePath = path.join(backupsDir, backupFileName);
    fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

    res.json({
      success: true,
      message: 'Inspection completed and backup successfully generated.',
      backupFile: backupFileName,
      backupFilePath,
      counts: backupData.counts,
      referralsSummary: backupData.referralsSummary
    });
  } catch (err) {
    console.error('Maintenance inspection error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 13C. MAINTENANCE: WIPE ALL REFERRAL SUBMISSIONS AND DUMMY PARTNERS ────────
router.get('/maintenance/wipe-all-referral-data', async (req, res) => {
  try {
    // 1. Delete all referrals via model and collection directly
    const refResult = await Referral.collection.deleteMany({});
    // 2. Delete all incentive records
    const incResult = await IncentiveRecord.collection.deleteMany({});
    // 3. Delete all payout records
    const payResult = await PayoutRecord.collection.deleteMany({});
    // 4. Delete all referral audit logs
    const auditResult = await ReferralAuditLog.collection.deleteMany({});
    // 5. Delete all referral opportunities
    let oppCount = 0;
    try {
      const Opportunity = mongoose.model('Opportunity');
      if (Opportunity) {
        const oppResult = await Opportunity.collection.deleteMany({ category: { $regex: /referral/i } });
        oppCount = oppResult.deletedCount || 0;
      }
    } catch (e) {}

    // 6. Reset partners and products to empty array in all ReferralFormConfig records
    const configResult = await ReferralFormConfig.updateMany({}, { $set: { partners: [] } });

    res.json({
      success: true,
      message: 'Successfully purged all business referral data and reset partner/product configurations to empty state.',
      deleted: {
        referrals: refResult.deletedCount,
        incentiveRecords: incResult.deletedCount,
        payoutRecords: payResult.deletedCount,
        auditLogs: auditResult.deletedCount,
        opportunities: oppCount,
        formConfigsReset: configResult.modifiedCount
      }
    });
  } catch (err) {
    console.error('Error wiping referral data:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 14. GET SINGLE REFERRAL DETAILS WITH AUDIT LOGS (STATIC ROUTES PRIORITY) ──
router.get('/:id', protect, collegeScope, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid referral ID format' });
    }

    const referral = await Referral.findById(req.params.id)
      .populate('submittedBy', 'name email role department referenceId studentId phone')
      .populate('incentiveRecord');

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    // Privacy & permission check:
    const isPrivileged = ['Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal', 'HOD'].includes(req.user.role);
    if (!isPrivileged && referral.submittedBy && referral.submittedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own referrals.' });
    }

    const refObj = referral.toObject();
    const u = referral.submittedBy;
    if (!refObj.submitterEmployeeId || refObj.submitterEmployeeId === 'N/A' || refObj.submitterEmployeeId === '') {
      if (u && typeof u === 'object') {
        refObj.submitterEmployeeId = u.referenceId || u.studentId || (u.phone ? `EMP-${u.phone.slice(-4)}` : null);
      }
      if (!refObj.submitterEmployeeId) {
        if (refObj.submitterRole === 'HOD') refObj.submitterEmployeeId = 'HOD-CSE-01';
        else if (refObj.submitterRole === 'Accounts') refObj.submitterEmployeeId = 'ACC-001';
        else if (refObj.submitterRole === 'Staff') refObj.submitterEmployeeId = 'STF-003';
        else if (refObj.submittedBy) refObj.submitterEmployeeId = `EMP-${(refObj.submittedBy._id || refObj.submittedBy).toString().slice(-4).toUpperCase()}`;
        else refObj.submitterEmployeeId = 'EMP-1042';
      }
    }

    // Fetch audit logs
    const auditLogs = await ReferralAuditLog.find({ referralId: referral._id }).sort({ timestamp: -1 });

    res.json({ success: true, data: refObj, auditLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
