import express from 'express';
import Referral from '../models/Referral.js';
import IncentiveRule from '../models/IncentiveRule.js';
import IncentiveRecord from '../models/IncentiveRecord.js';
import PayoutRecord from '../models/PayoutRecord.js';
import ReferralAuditLog from '../models/ReferralAuditLog.js';
import College from '../models/College.js';
import User from '../models/User.js';
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
          tenantId,
        },
        {
          ruleCode: `RULE-CRD-${tenantId}-01`,
          ruleName: 'Credit Card Activation Incentive',
          category: 'Credit Card',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Activated',
          amountType: 'Fixed',
          amount: 1000,
          eligibilityConditions: 'Card approval confirmed and card activated by customer.',
          cancellationPolicy: 'Duplicate applications within 90 days are void.',
          tenantId,
        },
        {
          ruleCode: `RULE-BNK-${tenantId}-01`,
          ruleName: 'Savings & Salary Account Opening Incentive',
          category: 'Bank Account',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Account Opened',
          amountType: 'Fixed',
          amount: 500,
          eligibilityConditions: 'KYC verified and official account opened with branch confirmation.',
          cancellationPolicy: 'Requires customer initial funding verification.',
          tenantId,
        },
        {
          ruleCode: `RULE-JOB-${tenantId}-01`,
          ruleName: 'Candidate Verified Joining Incentive',
          category: 'Job',
          partnerName: 'All',
          productOrRole: 'All',
          milestone: 'Joined',
          amountType: 'Fixed',
          amount: 2500,
          eligibilityConditions: 'Candidate successfully joins partner company and completes 1st week.',
          cancellationPolicy: 'Void if candidate fails background check or no-shows on joining date.',
          tenantId,
        },
      ];
      await IncentiveRule.insertMany(defaultRules);
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
    } = req.body;

    if (!category || !['Insurance', 'Credit Card', 'Bank Account', 'Job'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid or missing referral category' });
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    await ensureDefaultRules(tenantId);

    // ── Duplicate Checks & Consent Validation ──
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
    }

    if (category === 'Credit Card') {
      const phone = creditCardDetails?.applicantPhone;
      const bank = creditCardDetails?.bankName;
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
      const phone = bankAccountDetails?.applicantPhone;
      const bank = bankAccountDetails?.bankName;
      if (phone && bank) {
        const existing = await Referral.findOne({
          category: 'Bank Account',
          tenantId,
          'bankAccountDetails.applicantPhone': phone,
          'bankAccountDetails.bankName': bank,
          status: { $nin: ['Rejected', 'Cancelled'] },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `A bank account lead for this customer with ${bank} already exists (Code: ${existing.referralCode}).`,
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
      status: 'Submitted',
      statusHistory: initialHistory,
      insuranceDetails: category === 'Insurance' ? insuranceDetails : undefined,
      creditCardDetails: category === 'Credit Card' ? creditCardDetails : undefined,
      bankAccountDetails: category === 'Bank Account' ? bankAccountDetails : undefined,
      jobDetails: category === 'Job' ? jobDetails : undefined,
    };

    const newReferral = await Referral.create(referralData);

    // Create Audit Log
    await ReferralAuditLog.create({
      referralId: newReferral._id,
      referralCode: newReferral.referralCode,
      action: 'CREATED',
      performedBy: req.user._id,
      performedByName: req.user.name || 'User',
      performedByRole: req.user.role || 'User',
      toStatus: 'Submitted',
      details: `New ${category} referral created by ${req.user.name} (${req.user.role})`,
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

// ── 4. ADMIN & SUPER ADMIN LIST ALL REFERRALS (SCOPED) ────────────────────────
router.get('/', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'), async (req, res) => {
  try {
    const isSuperAdmin = req.user.role === 'Super Admin';
    let tenantId = req.collegeId || req.user.tenantId;

    if (isSuperAdmin && req.query.collegeId && req.query.collegeId !== 'all') {
      tenantId = req.query.collegeId;
    }

    const { category, status, search, submitterRole, department } = req.query;

    const query = {};
    if (!isSuperAdmin || (req.query.collegeId && req.query.collegeId !== 'all')) {
      query.tenantId = tenantId;
    }

    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (submitterRole && submitterRole !== 'All') query.submitterRole = submitterRole;
    if (department && department !== 'All') query.submitterDepartment = department;

    if (search) {
      query.$or = [
        { referralCode: { $regex: search, $options: 'i' } },
        { submitterName: { $regex: search, $options: 'i' } },
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

// ── 5. GET SINGLE REFERRAL DETAILS WITH AUDIT LOGS ────────────────────────────
router.get('/:id', protect, collegeScope, async (req, res) => {
  try {
    const referral = await Referral.findById(req.params.id)
      .populate('submittedBy', 'name email role department')
      .populate('incentiveRecord');

    if (!referral) {
      return res.status(404).json({ success: false, message: 'Referral not found' });
    }

    // Privacy & permission check:
    const isPrivileged = ['Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'].includes(req.user.role);
    if (!isPrivileged && referral.submittedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own referrals.' });
    }

    // Fetch audit logs
    const auditLogs = await ReferralAuditLog.find({ referralId: referral._id }).sort({ timestamp: -1 });

    res.json({ success: true, data: referral, auditLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. ADMIN UPDATE STATUS & VERIFY MILESTONE (TRIGGERS INCENTIVE ENGINE) ─────
router.patch('/:id/status', protect, collegeScope, authorize('Admin', 'Super Admin', 'Sub Admin', 'Accounts'), async (req, res) => {
  try {
    const {
      status,
      remarks,
      reason,
      verifiedMilestoneName,
      policyNumber,
      applicationNumber,
      accountNumberMasked,
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

      // Look up applicable rule for this category & milestone
      const rule = await IncentiveRule.findOne({
        tenantId: referral.tenantId,
        category: referral.category,
        isActive: true,
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

        const newIncentive = await IncentiveRecord.create({
          incentiveCode: incCode,
          referralId: referral._id,
          referralCode: referral.referralCode,
          category: referral.category,
          earnedBy: referral.submittedBy,
          earnedByName: referral.submitterName,
          earnedByRole: referral.submitterRole,
          earnedByDepartment: referral.submitterDepartment,
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

// ── 7. INCENTIVE RULES CRUD ───────────────────────────────────────────────────
router.get('/rules', protect, collegeScope, async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    await ensureDefaultRules(tenantId);
    const rules = await IncentiveRule.find({ tenantId }).sort({ createdAt: -1 });
    res.json({ success: true, count: rules.length, data: rules });
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

    const incentives = await IncentiveRecord.find(query)
      .sort({ createdAt: -1 })
      .populate('referralId');

    res.json({ success: true, count: incentives.length, data: incentives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/incentives/:id/approve', protect, collegeScope, authorize('Admin', 'Super Admin', 'Accounts'), async (req, res) => {
  try {
    const { decision, remarks, reason } = req.body; // decision: 'Approved' | 'Rejected'
    if (!decision || !['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Decision must be Approved or Rejected' });
    }

    const incentive = await IncentiveRecord.findById(req.params.id);
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
router.post('/incentives/payout', protect, collegeScope, authorize('Admin', 'Super Admin', 'Accounts'), async (req, res) => {
  try {
    const { incentiveIds, paymentMode, transactionReference, notes } = req.body;

    if (!incentiveIds || !Array.isArray(incentiveIds) || incentiveIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one approved incentive for payout.' });
    }
    if (!transactionReference || !transactionReference.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction reference (UTR / Receipt No) is required.' });
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';

    const incentives = await IncentiveRecord.find({
      _id: { $in: incentiveIds },
      status: 'Approved',
      tenantId,
    });

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

    res.json({
      success: true,
      data: {
        totalReferrals: allReferrals.length,
        pendingCount: allReferrals.filter(r => r.status === 'Submitted').length,
        inProgressCount: allReferrals.filter(r =>
          ['Under Review', 'Contacted', 'Application in Progress', 'Verification', 'KYC Verification', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Technical Assessment', 'Selected'].includes(r.status)
        ).length,
        convertedCount: convertedReferrals.length,
        rejectedCount: allReferrals.filter(r => ['Rejected', 'Cancelled'].includes(r.status)).length,
        categoryCounts,
        categoryConversions,
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

// ── 13. EXPORT AUDIT REPORT (CSV FORMAT) ───────────────────────────────────────
router.get('/export/csv', protect, collegeScope, async (req, res) => {
  try {
    const isPrivileged = ['Admin', 'Super Admin', 'Sub Admin', 'Accounts', 'Principal'].includes(req.user.role);
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';

    const query = { tenantId };
    if (!isPrivileged) {
      query.submittedBy = req.user._id;
    }

    const referrals = await Referral.find(query).sort({ createdAt: -1 });

    const header = ['Referral Code', 'Category', 'Applicant/Candidate', 'Phone', 'Submitter Name', 'Role', 'Status', 'Incentive Eligible', 'Incentive Status', 'Incentive Amount', 'Submitted Date'];
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

      return [
        r.referralCode,
        r.category,
        `"${applicantName.replace(/"/g, '""')}"`,
        applicantPhone,
        `"${r.submitterName.replace(/"/g, '""')}"`,
        r.submitterRole,
        r.status,
        r.incentiveEligible ? 'Yes' : 'No',
        r.incentiveStatus,
        r.incentiveAmount || 0,
        new Date(r.createdAt).toLocaleDateString(),
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

export default router;
