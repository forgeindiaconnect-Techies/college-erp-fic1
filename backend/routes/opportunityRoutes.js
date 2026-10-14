import express from 'express';
import Opportunity from '../models/Opportunity.js';
import OpportunityApplication from '../models/OpportunityApplication.js';
import IncentiveRecord from '../models/IncentiveRecord.js';
import ReferralAuditLog from '../models/ReferralAuditLog.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Helper to generate unique Opportunity Code
const generateOpportunityCode = (category) => {
  const prefixMap = {
    'Insurance': 'OPP-INS',
    'Credit Card': 'OPP-CRD',
    'Bank Account': 'OPP-BNK',
    'Job Referral': 'OPP-JOB',
  };
  const prefix = prefixMap[category] || 'OPP';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomSuffix}`;
};

// Helper to generate unique Application Code
const generateApplicationCode = (category) => {
  const prefixMap = {
    'Insurance': 'APP-INS',
    'Credit Card': 'APP-CRD',
    'Bank Account': 'APP-BNK',
    'Job Referral': 'APP-JOB',
  };
  const prefix = prefixMap[category] || 'APP';
  const timeSlice = Date.now().toString().slice(-4);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${timeSlice}-${randomSuffix}`;
};

// Default Form Builder Presets for each Product Type
export const getDefaultFormSchema = (category, subCategory = '') => {
  if (category === 'Insurance') {
    return [
      { id: 'f_name', name: 'applicantName', label: 'Insured Member Name', type: 'text', placeholder: 'Full Name as per Aadhaar', required: true },
      { id: 'f_phone', name: 'applicantPhone', label: 'Primary Contact Mobile', type: 'text', placeholder: '10-digit Mobile Number', required: true },
      { id: 'f_email', name: 'applicantEmail', label: 'Email Address', type: 'text', placeholder: 'name@example.com', required: true },
      { id: 'f_age', name: 'applicantAge', label: 'Applicant Age (Years)', type: 'number', placeholder: 'e.g. 24', required: true },
      { id: 'f_sum', name: 'sumInsured', label: 'Sum Insured Coverage', type: 'select', options: ['₹3,00,000', '₹5,00,000', '₹10,00,000', '₹25,00,000', '₹50,00,000', '₹1 Crore'], required: true },
      { id: 'f_city', name: 'city', label: 'Current Residential City', type: 'text', placeholder: 'e.g. Chennai', required: true },
      { id: 'f_pre_existing', name: 'hasPreExistingCondition', label: 'Any Pre-Existing Medical Condition?', type: 'radio', options: ['No', 'Yes'], required: true },
      { id: 'f_notes', name: 'additionalNotes', label: 'Special Instructions / Coverage Details', type: 'textarea', placeholder: 'Optional notes' },
    ];
  }
  if (category === 'Credit Card') {
    return [
      { id: 'f_name', name: 'applicantName', label: 'Cardholder Name (as on PAN)', type: 'text', placeholder: 'Full Legal Name', required: true },
      { id: 'f_phone', name: 'applicantPhone', label: 'Mobile Linked to Aadhaar', type: 'text', placeholder: '10-digit Mobile Number', required: true },
      { id: 'f_email', name: 'applicantEmail', label: 'Work / Personal Email', type: 'text', placeholder: 'name@example.com', required: true },
      { id: 'f_pan', name: 'panNumber', label: 'PAN Card Number', type: 'text', placeholder: 'e.g. ABCDE1234F', required: true },
      { id: 'f_emp', name: 'employmentType', label: 'Employment Status', type: 'select', options: ['Salaried Professional', 'Self-Employed / Business', 'College Faculty / Staff', 'Student with Add-on'], required: true },
      { id: 'f_income', name: 'monthlyIncome', label: 'Monthly Net Income', type: 'select', options: ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'], required: true },
      { id: 'f_city', name: 'city', label: 'Current Residential City', type: 'text', placeholder: 'e.g. Bangalore', required: true },
      { id: 'f_consent', name: 'creditConsent', label: 'I authorize bank representative to contact me for KYC and document collection', type: 'checkbox', required: true },
    ];
  }
  if (category === 'Bank Account') {
    return [
      { id: 'f_name', name: 'applicantName', label: 'Primary Account Holder Name', type: 'text', placeholder: 'Name as per Aadhaar / PAN', required: true },
      { id: 'f_phone', name: 'applicantPhone', label: 'Aadhaar-Linked Mobile Number', type: 'text', placeholder: '10-digit Mobile Number', required: true },
      { id: 'f_email', name: 'applicantEmail', label: 'Email Address', type: 'text', placeholder: 'name@example.com', required: true },
      { id: 'f_acc_type', name: 'accountCategory', label: 'Requested Account Type', type: 'select', options: ['Zero Balance Student Account', 'Regular Savings Account', 'Corporate Salary Account', 'Privilege Current Account'], required: true },
      { id: 'f_deposit', name: 'initialDeposit', label: 'Expected Initial Deposit (₹)', type: 'number', placeholder: 'e.g. 5000', required: false },
      { id: 'f_city', name: 'preferredBranchCity', label: 'Preferred Branch City / Town', type: 'text', placeholder: 'e.g. Coimbatore', required: true },
      { id: 'f_nominee', name: 'nomineeName', label: 'Nominee Name & Relationship', type: 'text', placeholder: 'e.g. S. Kumar (Father)', required: false },
    ];
  }
  // Job Referral default
  return [
    { id: 'f_cname', name: 'candidateName', label: 'Candidate Full Name', type: 'text', placeholder: 'Full Name', required: true },
    { id: 'f_cphone', name: 'candidatePhone', label: 'Candidate Contact Mobile', type: 'text', placeholder: '10-digit Phone', required: true },
    { id: 'f_cemail', name: 'candidateEmail', label: 'Candidate Email Address', type: 'text', placeholder: 'candidate@example.com', required: true },
    { id: 'f_qual', name: 'highestQualification', label: 'Highest Educational Qualification', type: 'select', options: ['B.Tech / B.E. (Computer Science / IT)', 'B.Tech / B.E. (Other Branches)', 'MCA / M.Sc Computer Science', 'MBA / Post Graduate', 'B.Sc / B.Com / BCA', 'Diploma'], required: true },
    { id: 'f_exp', name: 'experienceLevel', label: 'Total Years of Relevant Experience', type: 'select', options: ['Fresher (2025/2026 Batch)', '1 - 2 Years', '3 - 5 Years', '5+ Years'], required: true },
    { id: 'f_skills', name: 'primarySkills', label: 'Primary Technical / Professional Skills', type: 'text', placeholder: 'e.g. React, Node.js, Python, AWS', required: true },
    { id: 'f_ctc', name: 'expectedCtc', label: 'Expected CTC', type: 'text', placeholder: 'e.g. ₹6 - 8 LPA', required: true },
    { id: 'f_resume', name: 'resumeUrl', label: 'Resume / Portfolio Link (Google Drive, LinkedIn, etc.)', type: 'text', placeholder: 'https://...', required: true },
    { id: 'f_consent', name: 'candidateConsent', label: 'Candidate has explicitly consented to this referral for partner recruitment', type: 'checkbox', required: true },
  ];
};

// Clean up and purge seeded dummy opportunities across all categories
export const autoSeedOpportunitiesIfEmpty = async () => {
  try {
    await Opportunity.deleteMany({
      $or: [
        { opportunityCode: { $in: ['OPP-INS-2026-001', 'OPP-CRD-2026-001', 'OPP-BNK-2026-001', 'OPP-JOB-2026-001'] } },
        { title: 'Star Comprehensive Health Insurance Plan' },
        { title: 'HDFC Millennia Cashback Credit Card' },
        { title: 'ICICI Mine Student & Youth Zero-Balance Savings Account' },
        { title: 'TCS Software Engineer / Full Stack Developer Opening' }
      ]
    });
  } catch (err) {
    console.warn('Failed to clean dummy opportunities:', err.message);
  }
};

// ── 1. SUPER ADMIN: LIST ALL OPPORTUNITIES ────────────────────────────────────
router.get('/superadmin', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    await autoSeedOpportunitiesIfEmpty();
    const { category, status, search } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { providerName: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } },
        { opportunityCode: { $regex: search, $options: 'i' } },
      ];
    }

    const opportunities = await Opportunity.find(query).sort({ createdAt: -1 });

    // Calculate aggregated metrics
    const counts = {
      insurance: await Opportunity.countDocuments({ category: 'Insurance' }),
      creditCard: await Opportunity.countDocuments({ category: 'Credit Card' }),
      bankAccount: await Opportunity.countDocuments({ category: 'Bank Account' }),
      jobReferral: await Opportunity.countDocuments({ category: 'Job Referral' }),
      totalPublished: await Opportunity.countDocuments({ status: 'Published' }),
      totalDrafts: await Opportunity.countDocuments({ status: 'Draft' }),
    };

    res.json({
      success: true,
      counts,
      data: opportunities,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. SUPER ADMIN: CREATE A NEW OPPORTUNITY WITH FORM BUILDER ─────────────────
router.post('/superadmin', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      subCategory,
      providerName,
      benefits,
      eligibilityCriteria,
      requirements,
      keyHighlights,
      targetColleges,
      targetRoles,
      startDate,
      endDate,
      status,
      formSchema,
      incentiveConfig,
      bannerColor,
      iconName,
    } = req.body;

    if (!title || !category || !subCategory || !providerName) {
      return res.status(400).json({ success: false, message: 'Title, category, sub-category, and provider are required.' });
    }

    const opportunityCode = generateOpportunityCode(category);

    // If formSchema is not provided or empty, inject default presets for that category
    const finalFormSchema = (Array.isArray(formSchema) && formSchema.length > 0)
      ? formSchema
      : getDefaultFormSchema(category, subCategory);

    const safeStartDate = (startDate && !isNaN(new Date(startDate).getTime())) ? new Date(startDate) : new Date();
    const safeEndDate = (endDate && !isNaN(new Date(endDate).getTime())) ? new Date(endDate) : null;
    const userId = req.user?._id || 'system-admin';
    const userName = req.user?.name || req.user?.adminName || 'Super Admin';

    const opportunity = await Opportunity.create({
      opportunityCode,
      title: title.trim(),
      description: description?.trim() || '',
      category,
      subCategory: subCategory.trim(),
      providerName: providerName.trim(),
      benefits: Array.isArray(benefits) ? benefits : (benefits ? [benefits] : []),
      eligibilityCriteria: eligibilityCriteria || '',
      requirements: Array.isArray(requirements) ? requirements : (requirements ? [requirements] : []),
      keyHighlights: Array.isArray(keyHighlights) ? keyHighlights : (keyHighlights ? [keyHighlights] : []),
      targetColleges: targetColleges?.length ? targetColleges : ['ALL'],
      targetRoles: targetRoles?.length ? targetRoles : ['ALL'],
      startDate: safeStartDate,
      endDate: safeEndDate,
      status: status || 'Draft',
      formSchema: finalFormSchema,
      formVersion: 1,
      incentiveConfig: incentiveConfig || {
        milestone: category === 'Insurance' ? 'Policy Issued' : category === 'Credit Card' ? 'Card Activated' : category === 'Bank Account' ? 'Account Opened' : 'Joined',
        amountType: 'Fixed',
        amount: 500,
        terms: 'Incentive calculated and approved upon milestone verification.',
      },
      bannerColor: bannerColor || '#2563eb',
      iconName: iconName || 'Award',
      createdBy: userId,
      createdByName: userName,
      auditLogs: [
        {
          action: 'CREATED',
          performedBy: userId,
          performedByName: userName,
          notes: `Created initial opportunity as ${status || 'Draft'}`,
        },
      ],
    });

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'opportunities',
          action: 'created',
          data: opportunity,
          message: `New opportunity published: ${opportunity.title}`,
        });
      }
    } catch (ioErr) {}

    res.status(201).json({
      success: true,
      message: `Opportunity "${title}" created successfully!`,
      data: opportunity,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. SUPER ADMIN: UPDATE OPPORTUNITY & FORM BUILDER SCHEMA ──────────────────
router.put('/superadmin/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const {
      title,
      description,
      subCategory,
      providerName,
      benefits,
      eligibilityCriteria,
      requirements,
      keyHighlights,
      targetColleges,
      targetRoles,
      startDate,
      endDate,
      status,
      formSchema,
      incentiveConfig,
      bannerColor,
    } = req.body;

    if (title) opportunity.title = title.trim();
    if (description !== undefined) opportunity.description = description.trim();
    if (subCategory) opportunity.subCategory = subCategory.trim();
    if (providerName) opportunity.providerName = providerName.trim();
    if (benefits) opportunity.benefits = Array.isArray(benefits) ? benefits : [benefits];
    if (eligibilityCriteria !== undefined) opportunity.eligibilityCriteria = eligibilityCriteria;
    if (requirements) opportunity.requirements = Array.isArray(requirements) ? requirements : [requirements];
    if (keyHighlights) opportunity.keyHighlights = Array.isArray(keyHighlights) ? keyHighlights : [keyHighlights];
    if (targetColleges) opportunity.targetColleges = targetColleges;
    if (targetRoles) opportunity.targetRoles = targetRoles;
    if (startDate && !isNaN(new Date(startDate).getTime())) opportunity.startDate = new Date(startDate);
    if (endDate !== undefined) opportunity.endDate = (endDate && !isNaN(new Date(endDate).getTime())) ? new Date(endDate) : null;
    if (bannerColor) opportunity.bannerColor = bannerColor;
    if (incentiveConfig) opportunity.incentiveConfig = incentiveConfig;

    // Check if formSchema was updated -> increment versioning for immutable consistency
    if (formSchema && Array.isArray(formSchema)) {
      opportunity.formSchema = formSchema;
      opportunity.formVersion = (opportunity.formVersion || 1) + 1;
    }

    const userId = req.user?._id || 'system-admin';
    const userName = req.user?.name || req.user?.adminName || 'Super Admin';

    if (status && status !== opportunity.status) {
      opportunity.status = status;
      opportunity.auditLogs.push({
        action: `STATUS_CHANGED_TO_${status.toUpperCase()}`,
        performedBy: userId,
        performedByName: userName,
        notes: `Status changed from ${opportunity.status} to ${status}`,
      });
    }

    opportunity.auditLogs.push({
      action: 'EDITED',
      performedBy: userId,
      performedByName: userName,
      notes: 'Opportunity details updated',
    });

    await opportunity.save();

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'opportunities',
          action: 'updated',
          data: opportunity,
          message: `Opportunity "${opportunity.title}" updated`,
        });
      }
    } catch (ioErr) {}

    res.json({
      success: true,
      message: 'Opportunity updated successfully.',
      data: opportunity,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3B. SUPER ADMIN: DELETE OPPORTUNITY ─────────────────────────────────────────
router.delete('/superadmin/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'opportunities',
          action: 'deleted',
          id: req.params.id,
          message: `Opportunity "${opportunity.title}" deleted`,
        });
      }
    } catch (ioErr) {}

    res.json({ success: true, message: 'Opportunity deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. SUPER ADMIN: CHANGE STATUS (PUBLISH, PAUSE, CLOSE) ──────────────────────
router.patch('/superadmin/:id/status', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Draft', 'Published', 'Paused', 'Closed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const oldStatus = opportunity.status;
    opportunity.status = status;
    const userId = req.user?._id || 'system-admin';
    const userName = req.user?.name || req.user?.adminName || 'Super Admin';

    opportunity.auditLogs.push({
      action: `STATUS_${status.toUpperCase()}`,
      performedBy: userId,
      performedByName: userName,
      notes: `Transitioned status from ${oldStatus} to ${status}`,
    });

    await opportunity.save();

    // Real-time broadcast
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'opportunities',
          action: 'statusChanged',
          data: opportunity,
          message: `Opportunity "${opportunity.title}" is now ${status}`,
        });
      }
    } catch (ioErr) {}

    res.json({ success: true, message: `Opportunity status updated to ${status}.`, data: opportunity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. SUPER ADMIN: VIEW APPLICATIONS FOR AN OPPORTUNITY ───────────────────────
router.get('/superadmin/:id/applications', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { status, collegeId } = req.query;
    const query = { opportunityId: req.params.id };

    if (status && status !== 'All') query.status = status;
    if (collegeId && collegeId !== 'ALL' && collegeId !== 'all') query.tenantId = collegeId;

    const applications = await OpportunityApplication.find(query)
      .sort({ createdAt: -1 })
      .populate('applicantId', 'name email role department');

    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. USER-FACING: LIST PUBLISHED OPPORTUNITIES (ELIGIBLE FOR USER) ───────────
router.get('/published', protect, collegeScope, async (req, res) => {
  try {
    await autoSeedOpportunitiesIfEmpty();
    const userRole = req.user.role || 'Student';
    const tenantId = req.collegeId || req.user.tenantId || 'COL001';
    const { category, search } = req.query;

    const now = new Date();
    const query = {
      status: 'Published',
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    };

    // Tenant / College Targeting
    query.$and = [
      {
        $or: [
          { targetColleges: 'ALL' },
          { targetColleges: tenantId },
          { targetColleges: req.user.collegeId },
        ],
      },
      {
        $or: [
          { targetRoles: 'ALL' },
          { targetRoles: userRole },
        ],
      },
    ];

    if (category && category !== 'All') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { providerName: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } },
      ];
    }

    const opportunities = await Opportunity.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7. USER-FACING: GET SINGLE PUBLISHED OPPORTUNITY DETAILS ──────────────────
router.get('/published/:id', protect, collegeScope, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    // Check if user already applied
    const existingApplication = await OpportunityApplication.findOne({
      opportunityId: opportunity._id,
      applicantId: req.user._id,
    });

    res.json({
      success: true,
      data: opportunity,
      alreadyApplied: !!existingApplication,
      myApplication: existingApplication || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 8. USER-FACING: APPLY FOR AN OPPORTUNITY WITH PRODUCT-SPECIFIC FORM ────────
router.post('/apply/:id', protect, collegeScope, async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    if (opportunity.status !== 'Published') {
      return res.status(400).json({ success: false, message: 'This opportunity is not currently accepting applications.' });
    }

    // Check expiration
    if (opportunity.endDate && new Date(opportunity.endDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'The application deadline for this opportunity has passed.' });
    }

    const tenantId = req.collegeId || req.user.tenantId || 'COL001';

    // Duplicate check
    const existing = await OpportunityApplication.findOne({
      opportunityId: opportunity._id,
      applicantId: req.user._id,
      status: { $nin: ['Rejected', 'Closed'] },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You have already submitted an active application (${existing.applicationCode}) for this opportunity.`,
      });
    }

    const { formData } = req.body;
    if (!formData || typeof formData !== 'object') {
      return res.status(400).json({ success: false, message: 'Form data payload is required.' });
    }

    // Server-side validation against opportunity's formSchema
    for (const field of opportunity.formSchema || []) {
      if (field.required) {
        const val = formData[field.name];
        if (val === undefined || val === null || val === '' || val === false) {
          return res.status(400).json({
            success: false,
            message: `Field "${field.label}" is required.`,
          });
        }
      }
    }

    const applicationCode = generateApplicationCode(opportunity.category);

    const application = await OpportunityApplication.create({
      applicationCode,
      opportunityId: opportunity._id,
      opportunityCode: opportunity.opportunityCode,
      opportunityTitle: opportunity.title,
      category: opportunity.category,
      subCategory: opportunity.subCategory,
      providerName: opportunity.providerName,
      formVersion: opportunity.formVersion || 1,
      formData,
      applicantId: req.user._id,
      applicantName: req.user.name || 'Applicant',
      applicantEmail: req.user.email,
      applicantPhone: req.user.phone || formData.applicantPhone || formData.candidatePhone || '',
      applicantRole: req.user.role || 'Student',
      applicantDepartment: req.user.department || 'General',
      tenantId,
      collegeId: tenantId,
      status: 'Submitted',
      statusHistory: [
        {
          status: 'Submitted',
          updatedBy: req.user.name || 'User',
          updatedById: req.user._id,
          role: req.user.role || 'User',
          remarks: 'Application submitted successfully',
        },
      ],
      incentiveAmount: opportunity.incentiveConfig?.amount || 0,
      incentiveStatus: 'Pending Approval',
    });

    // Increment opportunity stats
    await Opportunity.findByIdAndUpdate(opportunity._id, {
      $inc: { 'stats.totalApplications': 1 },
    });

    // Notify Admins
    try {
      await sendNotification(req, {
        targetRoles: ['Admin', 'Super Admin'],
        tenantId,
        collegeId: tenantId,
        title: `New Opportunity Application: ${opportunity.title}`,
        message: `${req.user.name} applied for "${opportunity.title}" (App Code: ${applicationCode}).`,
        category: 'system',
        type: 'Info',
        link: '/superadmin/business-referrals',
      });
    } catch (e) {}

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'opportunity_applications',
          action: 'created',
          data: application,
          message: `New application submitted for ${opportunity.title} (${applicationCode})`,
        });
      }
    } catch (ioErr) {}

    res.status(201).json({
      success: true,
      message: `Your application for "${opportunity.title}" has been submitted successfully! Application Code: ${applicationCode}`,
      data: application,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 9. USER-FACING: GET MY SUBMITTED APPLICATIONS & PRIVATE INCENTIVES ─────────
router.get('/my-applications', protect, collegeScope, async (req, res) => {
  try {
    const { category, status } = req.query;
    const query = { applicantId: req.user._id };

    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;

    const applications = await OpportunityApplication.find(query)
      .sort({ createdAt: -1 })
      .populate('opportunityId');

    // Aggregate stats for user
    let totalIncentivesEarned = 0;
    let pendingIncentives = 0;
    applications.forEach(app => {
      if (app.incentiveStatus === 'Paid') {
        totalIncentivesEarned += (app.incentiveAmount || 0);
      } else if (['Pending Approval', 'Approved'].includes(app.incentiveStatus)) {
        pendingIncentives += (app.incentiveAmount || 0);
      }
    });

    res.json({
      success: true,
      count: applications.length,
      stats: {
        totalApplications: applications.length,
        totalIncentivesEarned,
        pendingIncentives,
      },
      data: applications,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 10. ADMIN & SUPER ADMIN: REVIEW APPLICATION STATUS & VERIFY MILESTONE ──────
router.patch('/applications/:appId/status', protect, collegeScope, authorize('Super Admin', 'Admin', 'Accounts'), async (req, res) => {
  try {
    const {
      status,
      remarks,
      providerApplicationRef,
      verifyMilestone,
      rejectionReason,
      correctionRemarks,
    } = req.body;

    const application = await OpportunityApplication.findById(req.params.appId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const previousStatus = application.status;
    if (status) application.status = status;
    if (providerApplicationRef) application.providerApplicationRef = providerApplicationRef;
    if (rejectionReason) application.rejectionReason = rejectionReason;
    if (correctionRemarks) application.correctionRemarks = correctionRemarks;

    let incentiveRecordCreated = null;

    // Milestone Verification & Incentive Trigger
    if (verifyMilestone || ['Approved', 'Milestone Verified'].includes(status)) {
      application.milestoneVerified = true;
      application.milestoneVerifiedAt = new Date();
      application.milestoneVerifiedBy = req.user.name || 'Admin';

      // Check if IncentiveRecord already exists to prevent duplicate awards
      const existingIncentive = await IncentiveRecord.findOne({
        referralCode: application.applicationCode,
      });

      if (!existingIncentive) {
        const opp = await Opportunity.findById(application.opportunityId);
        const rewardAmount = opp?.incentiveConfig?.amount || application.incentiveAmount || 500;

        const newIncentive = await IncentiveRecord.create({
          incentiveCode: `INC-OPP-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
          referralId: application._id,
          referralCode: application.applicationCode,
          ruleCode: opp?.opportunityCode || 'OPP-RULE',
          ruleName: `${application.category} Verified Milestone: ${opp?.incentiveConfig?.milestone || 'Completed'}`,
          category: application.category,
          partnerName: application.providerName,
          milestoneReached: opp?.incentiveConfig?.milestone || 'Completed',
          earnedBy: application.applicantId,
          earnedByName: application.applicantName,
          earnedByEmail: application.applicantEmail,
          earnedByRole: application.applicantRole,
          earnedByDepartment: application.applicantDepartment,
          tenantId: application.tenantId,
          collegeId: application.collegeId,
          amountType: 'Fixed',
          amount: rewardAmount,
          status: 'Pending Approval',
          calculatedAt: new Date(),
        });

        application.incentiveEligible = true;
        application.incentiveStatus = 'Pending Approval';
        application.incentiveAmount = rewardAmount;
        application.incentiveRecordId = newIncentive._id;
        incentiveRecordCreated = newIncentive;
      }
    }

    application.statusHistory.push({
      status: status || previousStatus,
      updatedBy: req.user.name || 'Admin',
      updatedById: req.user._id,
      role: req.user.role || 'Admin',
      remarks: remarks || `Status transitioned to ${status || previousStatus}`,
    });

    await application.save();

    // Notify Applicant
    try {
      await sendNotification(req, {
        receiverId: application.applicantId,
        tenantId: application.tenantId,
        collegeId: application.collegeId,
        title: `Opportunity Application Update: ${application.applicationCode}`,
        message: `Your application for "${application.opportunityTitle}" is now "${application.status}". ${remarks ? `Remarks: ${remarks}` : ''}`,
        category: 'system',
        type: status === 'Rejected' ? 'Warning' : 'Success',
        link: '/referrals/my-referrals',
      });
    } catch (e) {}

    // Real-Time Socket Emission
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('dataUpdated', {
          module: 'opportunity_applications',
          action: 'updated',
          data: application,
          message: `Application ${application.applicationCode} updated to ${application.status}`,
        });
        if (incentiveRecordCreated) {
          io.emit('dataUpdated', {
            module: 'incentives',
            action: 'created',
            data: incentiveRecordCreated,
            message: `Incentive reward of ₹${incentiveRecordCreated.amount} calculated for ${application.applicantName}`,
          });
        }
      }
    } catch (ioErr) {}

    res.json({
      success: true,
      message: `Application updated successfully.`,
      data: application,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 11. SUPER ADMIN: EXPORT APPLICATIONS CSV ───────────────────────────────────
router.get('/export/:id', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ success: false, message: 'Opportunity not found' });
    }

    const applications = await OpportunityApplication.find({ opportunityId: opportunity._id });

    let csv = 'Application Code,Opportunity Title,Category,Provider,Applicant Name,Applicant Role,Department,Tenant ID,Status,Provider Ref,Incentive Status,Incentive Amount,Applied At\n';

    applications.forEach(app => {
      const row = [
        app.applicationCode,
        `"${app.opportunityTitle.replace(/"/g, '""')}"`,
        app.category,
        `"${app.providerName.replace(/"/g, '""')}"`,
        `"${app.applicantName.replace(/"/g, '""')}"`,
        app.applicantRole,
        app.applicantDepartment,
        app.tenantId,
        app.status,
        app.providerApplicationRef || 'N/A',
        app.incentiveStatus,
        app.incentiveAmount || 0,
        new Date(app.createdAt).toISOString(),
      ];
      csv += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${opportunity.opportunityCode}_applications.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
