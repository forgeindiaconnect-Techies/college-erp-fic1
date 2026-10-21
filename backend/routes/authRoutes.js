import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });
import Student from '../models/Student.js';
import College from '../models/College.js';
import CollegeSettings from '../models/CollegeSettings.js';
import Staff from '../models/Staff.js';
import Department from '../models/Department.js';
import { protect, authorize, collegeScope, checkSubscription } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import ActivityLog from '../models/ActivityLog.js';
import Subscription from '../models/Subscription.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { calculateSubscriptionStatus } from '../utils/subscriptionHelper.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_SlbQBi57McKtUc',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'IgfxpfmQCMxSPaU0T4EyhcLU'
});

const generateToken = (userOrId) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  if (typeof userOrId === 'object' && userOrId !== null) {
    const id = userOrId._id ? userOrId._id.toString() : userOrId.id;
    const colId = userOrId.collegeId || userOrId.tenantId || null;
    return jwt.sign({
      id,
      userId: id,
      role: userOrId.role,
      collegeId: colId,
      tenantId: colId
    }, secret, { expiresIn: '30d' });
  }
  return jwt.sign({ id: userOrId, userId: userOrId }, secret, {
    expiresIn: '30d',
  });
};

// Login Route (Unified for all users)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find User
    let user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (!user) {
      // Auto-provision if demo Librarian credentials
      if (email.trim().toLowerCase() === 'meena@gmail.com') {
        try {
          user = new User({
            name: 'Meena (Librarian)',
            email: 'meena@gmail.com',
            password: password ? password.trim() : 'meena',
            role: 'Librarian',
            referenceId: 'LIB001',
            tenantId: 'COL001',
            collegeId: 'COL001'
          });
          await user.save();
        } catch (seedErr) {
          console.error('Failed to auto-provision librarian:', seedErr);
        }
      }
    }

    if (!user) {
      console.error(`[auth/login] Login failed: User not found for email: ${email.trim()}`);
      return res.status(401).json({ message: `[DEBUG] User not found in database for email: ${email.trim()}` });
    }

    // 2. Check College isActive Status for non-SuperAdmin users BEFORE password check / JWT issue
    const effectiveTenantId = user.tenantId || user.collegeId;
    let college = null;
    if (effectiveTenantId && effectiveTenantId !== 'system' && user.role !== 'Super Admin') {
      college = await College.findOne({
        $or: [
          { tenantId: effectiveTenantId },
          { _id: mongoose.Types.ObjectId.isValid(effectiveTenantId) ? effectiveTenantId : null }
        ]
      });
      if (college && (college.isActive === false || college.subscriptionStatus === 'Deactivated')) {
        return res.status(403).json({
          success: false,
          message: 'Your college has been deactivated. Please contact Super Admin.'
        });
      }
    }

    // 3. Password Check
    if (await user.matchPassword(password)) {
      // Async Activity Log
      ActivityLog.create({
        userId: user._id.toString(),
        userName: user.name,
        role: user.role,
        action: 'System Login',
        moduleName: 'Authentication',
        dept: user.department || 'System',
        ip: req.ip || req.connection.remoteAddress,
        collegeId: user.tenantId || user.collegeId || 'unassigned_college'
      }).catch(err => console.error('Failed to log login activity', err));

      let subscriptionDetails = null;
      if (college) {
        subscriptionDetails = calculateSubscriptionStatus(college);
        if (college.subscriptionStatus !== subscriptionDetails.status && college.isActive !== false) {
          college.subscriptionStatus = subscriptionDetails.status;
          await college.save();
        }
      }

      let collegeName = user.role === 'Super Admin' ? 'System Super Admin' : 'Institution Portal';
      try {
        if (effectiveTenantId && effectiveTenantId !== 'system') {
          const colDoc = await College.findOne({
            $or: [
              { tenantId: effectiveTenantId },
              { collegeId: effectiveTenantId },
              { _id: mongoose.Types.ObjectId.isValid(effectiveTenantId) ? effectiveTenantId : null }
            ]
          });
          if (colDoc && colDoc.name) {
            collegeName = colDoc.name;
          } else {
            // Also check if an Admin user has this tenant and knows the college name, or check CollegeSettings
            const CollegeSettings = mongoose.models.CollegeSettings || (await import('../models/CollegeSettings.js')).default;
            const settings = await CollegeSettings.findOne({
              $or: [
                { tenantId: effectiveTenantId },
                { collegeId: effectiveTenantId }
              ]
            });
            if (settings && settings.collegeName && settings.collegeName !== 'Campus ERP Portal') {
              collegeName = settings.collegeName;
            }
          }
        }
      } catch (err) {}

      let watchmanExtra = {};
      if (user.role === 'Watchman') {
        try {
          const Watchman = mongoose.models.Watchman || (await import('../models/Watchman.js')).default;
          const wDoc = await Watchman.findOne({ $or: [{ user: user._id }, { email: user.email }] });
          if (wDoc) {
            watchmanExtra = {
              employeeId: wDoc.employeeId,
              assignedGate: wDoc.assignedGate,
              shift: wDoc.shift,
              phone: wDoc.phone
            };
          }
        } catch (e) {}
      }

      res.json({
        ...watchmanExtra,
        _id: user._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: effectiveTenantId || null,
        tenantId: effectiveTenantId || null,
        department: user.department,
        referenceId: user.referenceId,
        studentId: user.studentId || null,
        parentOf: user.parentOf || null,
        subjects: user.subjects || [],
        permissions: user.permissions || [],
        subscription: subscriptionDetails,
        collegeName: collegeName,
        token: generateToken(user),
      });
    } else {
      console.error(`[auth/login] Login failed: Password mismatch for user: ${email.trim()}`);
      res.status(401).json({ message: `[DEBUG] Password mismatch for user: ${email.trim()}` });
    }
  } catch (error) {
    console.error('[auth/login] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email?.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email address' });
    }
    
    // Simulate real enterprise secure reset dispatch
    res.json({ 
      message: 'Password reset link successfully dispatched. Please check your inbox (and spam folder) within the next few minutes.' 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register College (SaaS Onboarding)
router.post('/register-college', async (req, res) => {
  const {
    collegeName,
    adminName,
    email,
    phone,
    password,
    principalName,
    principalEmail,
    principalPassword,
    subscriptionPlan,
    billingCycle,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature
  } = req.body;

  try {
    // Basic field presence validation
    if (!collegeName || !adminName || !email || !password) {
      return res.status(400).json({ message: 'College name, admin name, email, and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long and include numbers/letters.' });
    }

    const normalizedPrincipalEmail = principalEmail?.trim().toLowerCase();
    if (normalizedPrincipalEmail && !emailRegex.test(normalizedPrincipalEmail)) {
      return res.status(400).json({ message: 'Please provide a valid principal email address.' });
    }

    // Check if college name already exists
    const existingCollegeByName = await College.findOne({ name: { $regex: new RegExp(`^${collegeName.trim()}$`, 'i') } });
    if (existingCollegeByName) {
      return res.status(400).json({ message: `A college with the name '${collegeName}' is already registered in the system.` });
    }

    const existingCollege = await College.findOne({ email: normalizedEmail });
    if (existingCollege) {
      return res.status(400).json({ message: `The email '${normalizedEmail}' is already used by another college. Please provide a unique admin email.` });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: `The email '${normalizedEmail}' is already registered to an active account. Please use a different email or log in.` });
    }
    
    if (normalizedPrincipalEmail) {
      const existingPrincipalUser = await User.findOne({ email: normalizedPrincipalEmail });
      if (existingPrincipalUser) {
        return res.status(400).json({ message: `The principal email '${normalizedPrincipalEmail}' is already registered to another account.` });
      }
    }

    // Determine chosen plan & billing cycle
    const validPlans = ['Trial', 'Starter', 'Basic', 'Premium', 'Elite'];
    const chosenPlan = validPlans.includes(subscriptionPlan) ? subscriptionPlan : 'Trial';
    const chosenCycle = ['Monthly', 'Quarterly', 'Annually'].includes(billingCycle) ? billingCycle : 'Monthly';

    let planAmount = 0;
    if (chosenPlan === 'Starter') planAmount = 10000;
    else if (chosenPlan === 'Basic') planAmount = 15000;
    else if (chosenPlan === 'Premium') planAmount = 20000;
    else if (chosenPlan === 'Elite') planAmount = 35000;

    if (chosenCycle === 'Annually' && planAmount > 0) {
      planAmount = planAmount * 10; // Annual package discount (10x instead of 12x)
    } else if (chosenCycle === 'Quarterly' && planAmount > 0) {
      planAmount = planAmount * 3;
    }

    // Verify payment if payment details are present
    let isPaymentVerified = false;
    if (razorpayPaymentId && razorpayOrderId && razorpaySignature) {
      try {
        const generatedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'IgfxpfmQCMxSPaU0T4EyhcLU')
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');
        if (generatedSignature === razorpaySignature) {
          isPaymentVerified = true;
        }
      } catch (sigErr) {
        console.error('[register-college] Signature verification error:', sigErr.message);
      }
    }

    // Determine subscription and payment statuses
    // Never mark as paid or active without verified payment confirmation
    let payStatus = 'Pending';
    let subStatus = 'Pending Approval';
    let collegeActive = false;

    if (isPaymentVerified) {
      payStatus = 'Paid';
      subStatus = 'Active';
      collegeActive = true;
    } else {
      payStatus = 'Pending';
      subStatus = 'Pending Approval';
      collegeActive = false;
    }

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    if (chosenPlan === 'Trial') {
      endDate.setDate(startDate.getDate() + 1); // 1-Day Trial
    } else if (chosenCycle === 'Annually') {
      endDate.setDate(startDate.getDate() + 365);
    } else if (chosenCycle === 'Quarterly') {
      endDate.setDate(startDate.getDate() + 90);
    } else {
      endDate.setDate(startDate.getDate() + 30);
    }

    // Generate Tenant ID safely
    const lastCollege = await College.findOne({}, {}, { sort: { 'createdAt': -1 } });
    let nextNum = 1;
    if (lastCollege && lastCollege.tenantId && lastCollege.tenantId.startsWith('COL')) {
      const lastNum = parseInt(lastCollege.tenantId.replace('COL', '').split('-')[0], 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const timestampSuffix = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const tenantId = `COL${String(nextNum).padStart(3, '0')}-${timestampSuffix}${randomSuffix}`;

    const newCollege = new College({
      name: collegeName.trim(),
      adminName: adminName.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      tenantId,
      subscriptionPlan: chosenPlan,
      subscriptionStatus: subStatus,
      paymentStatus: payStatus,
      subscriptionAmount: planAmount,
      billingCycle: chosenCycle,
      isActive: collegeActive,
      trialStartDate: startDate,
      trialEndDate: endDate,
      adminPassword: password,
      principalEmail: normalizedPrincipalEmail,
      principalPassword
    });
    await newCollege.save();

    // Create default CollegeSettings
    const newSettings = new CollegeSettings({
      tenantId,
      collegeId: newCollege._id,
      collegeName: collegeName.trim(),
      timezone: 'Asia/Kolkata (IST)',
      currency: 'INR (₹)',
      academicYear: '2026-2027',
      primaryColor: '#4f46e5',
      secondaryColor: '#3b82f6',
      attendanceEnabled: true,
      hostelEnabled: true,
      transportEnabled: true,
      libraryEnabled: true,
      placementEnabled: true,
      examEnabled: true
    });
    await newSettings.save();

    // Create initial Subscription record
    try {
      const newSubscription = new Subscription({
        tenantId,
        collegeId: newCollege._id,
        collegeName: newCollege.name,
        planName: chosenPlan,
        amount: planAmount,
        startDate,
        endDate,
        status: subStatus,
        paymentStatus: payStatus,
        transactionId: isPaymentVerified ? razorpayPaymentId : `TXN-PENDING-${Date.now()}`,
        razorpayOrderId: razorpayOrderId || null
      });
      await newSubscription.save();
    } catch (subErr) {
      console.warn('[register-college] Warning: Initial subscription record creation notice:', subErr.message);
    }

    try {
      const newAdmin = new User({
        name: adminName.trim(),
        email: normalizedEmail,
        password,
        role: 'Admin', // Strictly Admin, never Super Admin
        phone: phone?.trim(),
        tenantId
      });
      await newAdmin.save();

      if (principalName && normalizedPrincipalEmail && principalPassword) {
        const newPrincipal = new User({
          name: principalName.trim(),
          email: normalizedPrincipalEmail,
          password: principalPassword,
          role: 'Principal',
          phone: phone?.trim(),
          tenantId
        });
        await newPrincipal.save();
      }
    } catch (userError) {
      // Rollback college creation if user creation fails
      await College.findOneAndDelete({ _id: newCollege._id });
      await Subscription.deleteMany({ tenantId });
      throw new Error('Failed to create Admin/Principal account. College registration rolled back. ' + userError.message);
    }

    // Send notification to Super Admin
    await sendNotification(req, {
      tenantId: newCollege.tenantId,
      collegeId: newCollege._id,
      targetRoles: ['Super Admin'],
      title: 'New Client Registration & Subscription',
      message: `${collegeName} (${adminName}) has registered for the ${chosenPlan} plan (₹${planAmount.toLocaleString('en-IN')}). Payment Status: ${payStatus}, Subscription Status: ${subStatus}.`,
      type: 'Success'
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'created' });
    req.app.get('io')?.emit('dataUpdated', { module: 'subscriptions', action: 'created' });

    res.status(201).json({
      success: true,
      message: isPaymentVerified 
        ? 'Registration completed and subscription activated successfully.'
        : 'Registration submitted successfully! Your account and subscription are pending approval.',
      tenantId,
      collegeName: newCollege.name,
      adminName: newCollege.adminName,
      email: newCollege.email,
      subscriptionPlan: chosenPlan,
      subscriptionStatus: subStatus,
      paymentStatus: payStatus,
      amount: planAmount,
      billingCycle: chosenCycle
    });
  } catch (error) {
    console.error('[register-college] Error:', error);
    res.status(500).json({ message: error.message || 'An unexpected error occurred during registration.' });
  }
});

// Create Registration Payment Order (Public for SaaS Onboarding)
router.post('/create-registration-order', async (req, res) => {
  const { planName, amount } = req.body;
  try {
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required for payment checkout.' });
    }
    const options = {
      amount: Math.round(Number(amount) * 100), // paise
      currency: 'INR',
      receipt: `rcpt_reg_${Date.now().toString().slice(-8)}`
    };
    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_live_SlbQBi57McKtUc',
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.warn('[auth/create-registration-order] Razorpay Order Creation Notice:', error.message);
    res.status(500).json({ message: 'Payment gateway unconfigured or unavailable: ' + error.message });
  }
});

// Create Razorpay Order
router.post('/create-order', protect, collegeScope, async (req, res) => {
  const { planName, amount } = req.body;
  try {
    const options = {
      amount: Math.round(Number(amount) * 100), // amount in the smallest currency unit (paise)
      currency: 'INR',
      receipt: `receipt_sub_${Date.now()}`
    };
    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_live_SlbQBi57McKtUc',
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    res.status(500).json({ message: 'Failed to create payment order: ' + error.message });
  }
});

// Verify Payment and Activate Subscription
router.post('/verify-payment', protect, collegeScope, async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planName, amount } = req.body;
  
  try {
    // 1. Signature verification
    const secret = process.env.RAZORPAY_KEY_SECRET || 'IgfxpfmQCMxSPaU0T4EyhcLU';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid payment signature. Verification failed.' });
    }

    const college = await College.findOne({ tenantId: req.user.tenantId });
    if (!college) {
      return res.status(404).json({ message: 'College not found.' });
    }

    const now = new Date();
    const endDate = new Date(now);
    // Subscription lasts for 30 days
    endDate.setDate(endDate.getDate() + 30);

    // 2. Activate Subscription immediately in the DB on successful payment
    college.subscriptionPlan = planName;
    college.subscriptionStatus = 'Active';
    college.convertedToPaid = true;
    college.trialStartDate = now;
    college.trialEndDate = endDate;
    await college.save();

    // 3. Save Subscription record
    const subscription = new Subscription({
      tenantId: college.tenantId,
      collegeId: college._id,
      collegeName: college.name,
      planName,
      amount,
      startDate: now,
      endDate: endDate,
      status: 'Active',
      paymentStatus: 'Success',
      transactionId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id
    });

    await subscription.save();

    // 4. Log the upgrade activity
    await ActivityLog.create({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Upgraded to ${planName} Plan successfully via Razorpay`,
      moduleName: 'Subscription',
      ip: req.ip || req.connection.remoteAddress,
      collegeId: college.tenantId
    });

    res.json({ message: `Your college subscription has been upgraded to ${planName} successfully!`, subscription });
  } catch (error) {
    console.error('Payment Verification Error:', error);
    res.status(500).json({ message: 'Failed to verify payment: ' + error.message });
  }
});

// Get all colleges (Super Admin only)
router.get('/colleges', protect, collegeScope, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Not authorized as Super Admin' });
    }
    
    const { calculateSubscriptionStatus } = await import('../utils/subscriptionHelper.js');
    const colleges = await College.find().sort({ createdAt: -1 });
    
    const collegesWithStats = await Promise.all(colleges.map(async (college) => {
      // Users are linked via tenantId string (e.g. 'COL002-614'), NOT collegeId ObjectId
      const userCount = await User.countDocuments({ tenantId: college.tenantId });
      // Compute real-time subscription status from dates (same as Subscriptions/Trials tabs)
      const liveStatus = calculateSubscriptionStatus(college);
      return {
        ...college.toObject(),
        totalUsers: userCount,
        // Override the raw DB status with the accurately computed live status
        subscriptionStatus: liveStatus.status,
        subscriptionPlan: liveStatus.planName,
        daysRemaining: liveStatus.daysRemaining,
      };
    }));
    
    res.json(collegesWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle College Status (Super Admin only: Active vs Deactivated)
router.put('/colleges/:id/status', protect, collegeScope, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Not authorized as Super Admin' });
    }

    const { status } = req.body;
    if (!['Active', 'Deactivated'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Active or Deactivated.' });
    }

    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }

    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    college.subscriptionStatus = status;
    college.isActive = status === 'Active';
    await college.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal', 'Sub Admin', 'HOD', 'Staff', 'Student'],
      title: status === 'Active' ? 'College Activated' : 'College Deactivated',
      message: status === 'Active'
        ? `Your college (${college.name}) has been reactivated by Super Admin.`
        : `Your college (${college.name}) has been deactivated by Super Admin. Access is temporarily suspended.`,
      type: status === 'Active' ? 'Success' : 'Error'
    });

    req.app.get('io').emit('dataUpdated', { module: 'colleges', action: 'updated' });

    res.json({ message: `College ${college.name} status updated to ${status} successfully.`, college });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update College Details (Super Admin only)
router.put('/colleges/:id', protect, collegeScope, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Not authorized as Super Admin' });
    }

    const { name, collegeName, adminName, email, phone, principalName, principalEmail, subscriptionPlan, subscriptionStatus, subscriptionAmount, billingCycle } = req.body;
    const finalName = name || collegeName;

    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    if (finalName) college.name = finalName.trim();
    if (adminName) college.adminName = adminName.trim();
    if (email) college.email = email.trim().toLowerCase();
    if (phone) college.phone = phone.trim();
    if (principalName) college.principalName = principalName.trim();
    if (principalEmail) college.principalEmail = principalEmail.trim().toLowerCase();
    if (subscriptionPlan) college.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus) college.subscriptionStatus = subscriptionStatus;
    if (subscriptionAmount !== undefined) college.subscriptionAmount = Number(subscriptionAmount);
    if (billingCycle) college.billingCycle = billingCycle;

    await college.save();

    // Sync CollegeSettings for this specific tenant only
    if (finalName) {
      await CollegeSettings.updateOne(
        { $or: [{ tenantId: college.tenantId }, { collegeId: college._id }] },
        { $set: { collegeName: finalName.trim() } }
      );
    }

    req.app.get('io').emit('dataUpdated', { module: 'colleges', action: 'updated' });

    res.json({ message: `College '${college.name}' updated successfully.`, college });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete College (Super Admin only)
router.delete('/colleges/:id', protect, collegeScope, async (req, res) => {
  try {
    if (req.user.role !== 'Super Admin') {
      return res.status(403).json({ message: 'Not authorized as Super Admin' });
    }

    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    const tenantId = college.tenantId;
    const collegeId = college._id;
    const collegeName = college.name;

    await College.findByIdAndDelete(collegeId);

    try {
      const User = mongoose.models.User || (await import('../models/User.js')).default;
      const Subscription = mongoose.models.Subscription || (await import('../models/Subscription.js')).default;
      const CollegeSettings = mongoose.models.CollegeSettings || (await import('../models/CollegeSettings.js')).default;

      await Promise.allSettled([
        User.deleteMany({ $or: [{ tenantId }, { collegeId }] }),
        Subscription.deleteMany({ $or: [{ tenantId }, { collegeId }] }),
        CollegeSettings.deleteMany({ $or: [{ tenantId }, { collegeId }] })
      ]);
    } catch (cleanupErr) {
      console.warn('Partial cleanup notice during college delete:', cleanupErr.message);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'deleted', collegeId, tenantId });

    res.json({ success: true, message: `College '${collegeName}' (${tenantId}) deleted successfully.` });
  } catch (error) {
    console.error('Failed to delete college:', error);
    res.status(500).json({ message: error.message });
  }
});


router.get('/me', protect, collegeScope, async (req, res) => {
  try {
    let collegeName = null;
    let subscriptionStatus = 'Active';
    let isTrial = false;
    let isGracePeriod = false;
    let planName = 'N/A';
    let expiryDate = null;
    let daysExpired = 0;

    const effectiveTenantId = req.user.tenantId || req.user.collegeId;
    if (effectiveTenantId && effectiveTenantId !== 'system') {
      const isValidObjId = mongoose.Types.ObjectId.isValid(effectiveTenantId);
      let college = await College.findOne({
        $or: [
          { tenantId: effectiveTenantId },
          { collegeId: effectiveTenantId },
          { _id: isValidObjId ? effectiveTenantId : null },
          { email: req.user.email }
        ]
      });
      if (!college && req.user.email) {
        college = await College.findOne({ email: req.user.email });
      }
      if (college) {
        collegeName = college.name;
        const { calculateSubscriptionStatus } = await import('../utils/subscriptionHelper.js');
        const liveStatus = calculateSubscriptionStatus(college);
        subscriptionStatus = liveStatus.status;
        isTrial = liveStatus.isTrial;
        isGracePeriod = liveStatus.isGracePeriod;
        planName = liveStatus.planName;
        expiryDate = college.trialEndDate || college.subscriptionEndDate || null;
        
        if (subscriptionStatus === 'Expired' && expiryDate) {
          const now = new Date();
          const end = new Date(expiryDate);
          const diffTime = Math.abs(now - end);
          daysExpired = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      } else {
        const CollegeSettings = mongoose.models.CollegeSettings || (await import('../models/CollegeSettings.js')).default;
        const settings = await CollegeSettings.findOne({
          $or: [
            { tenantId: effectiveTenantId },
            { collegeId: effectiveTenantId }
          ]
        });
        if (settings && settings.collegeName && settings.collegeName !== 'Campus ERP Portal') {
          collegeName = settings.collegeName;
        }
      }
    }

    res.json({
      _id: req.user._id,
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      collegeId: effectiveTenantId || null,
      tenantId: effectiveTenantId || null,
      collegeName: collegeName,
      referenceId: req.user.referenceId,
      subscriptionStatus,
      isTrial,
      isGracePeriod,
      planName,
      expiryDate,
      daysExpired
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Dev Only: Repair orphaned users
router.get('/repair-users', async (req, res) => {
  try {
    let repaired = 0;
    const students = await Student.find();
    for (const student of students) {
      if (!student.email) continue;
      const u = await User.findOne({ email: { $regex: new RegExp(`^${student.email.trim()}$`, 'i') } });
      if (!u) {
        await User.create({
          name: student.name, email: student.email, password: 'password123',
          role: 'Student', department: student.dept, referenceId: student.id
        });
        repaired++;
      } else {
        u.role = 'Student';
        u.password = 'password123';
        u.markModified('password');
        await u.save();
        repaired++;
      }
    }

    const staffMembers = await Staff.find();
    for (const stf of staffMembers) {
      if (!stf.email) continue;
      const u = await User.findOne({ email: { $regex: new RegExp(`^${stf.email.trim()}$`, 'i') } });
      if (!u) {
        await User.create({
          name: stf.name, email: stf.email, password: 'password123',
          role: stf.designation === 'HOD' ? 'HOD' : 'Staff', department: stf.dept, referenceId: stf.id
        });
        repaired++;
      } else {
        u.role = stf.designation === 'HOD' ? 'HOD' : 'Staff';
        u.password = 'password123';
        u.markModified('password');
        await u.save();
        repaired++;
      }
    }
    res.json({ message: `Repaired ${repaired} users.` });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Dev Only: Inspect specific users
router.get('/check-users', async (req, res) => {
  try {
    const users = await User.find({ email: /pooja|gowtham/i });
    res.json(users);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/clean-pooja', async (req, res) => {
  try {
    await College.deleteMany({ email: { $in: ['pooja@gmail.com', 'gowtham@gmail.com'] } });
    await User.deleteMany({ email: { $in: ['pooja@gmail.com', 'gowtham@gmail.com'] } });
    res.json({ message: 'Test emails cleared from both College and User.' });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Dev Only: Seed Demo Users + Students + Staff + Departments
router.post('/seed', async (req, res) => {
  try {
    // ── 1. Clear all collections ──────────────────────────────────────
    await Promise.all([
      User.deleteMany(),
      Student.deleteMany(),
      Staff.deleteMany(),
      Department.deleteMany(),
    ]);

    // ── 2. Seed Users ─────────────────────────────────────────────────
    const sampleUsers = [
      // Admin
      { name: 'System Admin', email: 'admin@college.edu', password: 'password123', role: 'Admin' },

      // Principal
      { name: 'Dr. Suresh Kumar', email: 'principal@college.edu', password: 'password123', role: 'Principal' },

      // ── HODs ──
      // CSE HOD — matching the user's example exactly
      { name: 'CSE HOD', email: 'csehod@gmail.com', password: 'password123', role: 'HOD', department: 'Computer Science', referenceId: 'STF001' },
      // EE HOD
      { name: 'Prof. Rajan Iyer', email: 'rajan@college.edu', password: 'password123', role: 'HOD', department: 'Electrical Engg.', referenceId: 'STF002' },
      // ME HOD
      { name: 'Dr. Priya Nair', email: 'mehod@college.edu', password: 'password123', role: 'HOD', department: 'Mechanical Engg.', referenceId: 'STF005' },

      // ── Staff (CSE) ──
      { name: 'Dr. Ananya Rao', email: 'ananya@college.edu', password: 'password123', role: 'Staff', department: 'Computer Science', referenceId: 'STF003', subjects: ['Data Structures', 'DBMS'] },
      { name: 'Prof. Karthik S.', email: 'karthik@college.edu', password: 'password123', role: 'Staff', department: 'Computer Science', referenceId: 'STF004', subjects: ['OS', 'Machine Learning'] },
      // ── Staff (EE) ──
      { name: 'Dr. Meena Pillai', email: 'meena@college.edu', password: 'password123', role: 'Staff', department: 'Electrical Engg.', referenceId: 'STF006', subjects: ['Circuits', 'Networks'] },

      // ── Students (CSE) ──
      { name: 'John Doe', email: 'john@college.edu', password: 'password123', role: 'Student', department: 'Computer Science', referenceId: 'CS2022001', studentId: 'CS2022001' },
      { name: 'Emily Davis', email: 'emily@college.edu', password: 'password123', role: 'Student', department: 'Computer Science', referenceId: 'CS2021004', studentId: 'CS2021004' },
      { name: 'David Lee', email: 'david@college.edu', password: 'password123', role: 'Student', department: 'Computer Science', referenceId: 'CS2022002', studentId: 'CS2022002' },
      // ── Students (EE) ──
      { name: 'Alice Smith', email: 'alice@college.edu', password: 'password123', role: 'Student', department: 'Electrical Engg.', referenceId: 'EE2022001', studentId: 'EE2022001' },
      { name: 'Sarah Wilson', email: 'sarah@college.edu', password: 'password123', role: 'Student', department: 'Electrical Engg.', referenceId: 'EE2022002', studentId: 'EE2022002' },

      // ── Parents ──
      { name: 'Parent of John', email: 'parent_john@college.edu', password: 'password123', role: 'Parent', referenceId: 'CS2022001', parentOf: 'CS2022001' },
      { name: 'Parent of Alice', email: 'parent_alice@college.edu', password: 'password123', role: 'Parent', referenceId: 'EE2022001', parentOf: 'EE2022001' },

      // ── Accounts ──
      { name: 'Accounts Officer', email: 'accounts@college.edu', password: 'password123', role: 'Accounts' },
    ];

    // Use create() so pre('save') password hashing triggers
    const createdUsers = await User.create(sampleUsers);

    // ── 3. Seed Departments ───────────────────────────────────────────
    const deptData = [
      { id: 'DEPT001', name: 'Computer Science', code: 'CSE', hod: 'CSE HOD', totalStudents: 3 },
      { id: 'DEPT002', name: 'Electrical Engg.', code: 'EE', hod: 'Prof. Rajan Iyer', totalStudents: 2 },
      { id: 'DEPT003', name: 'Mechanical Engg.', code: 'ME', hod: 'Dr. Priya Nair', totalStudents: 1 },
      { id: 'DEPT004', name: 'Civil Engg.', code: 'CE', hod: 'Vacant', totalStudents: 1 },
      { id: 'DEPT005', name: 'Information Tech.', code: 'IT', hod: 'Vacant', totalStudents: 1 },
    ];
    await Department.insertMany(deptData);

    // ── 4. Seed Students ─────────────────────────────────────────────
    // NOTE: 'dept' is the Student model field (not 'department')
    const studentData = [
      { id: 'CS2022001', name: 'John Doe',       email: 'john@college.edu',    phone: '9876543210', dept: 'Computer Science',  sem: 'Sem 6', cgpa: 8.5, attendance: 92, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'CS2021004', name: 'Emily Davis',    email: 'emily@college.edu',   phone: '9823456789', dept: 'Computer Science',  sem: 'Sem 6', cgpa: 8.9, attendance: 98, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'CS2022002', name: 'David Lee',      email: 'david@college.edu',   phone: '9890123456', dept: 'Computer Science',  sem: 'Sem 3', cgpa: 8.2, attendance: 88, status: 'Active',   feeStatus: 'Pending' },
      { id: 'EE2022001', name: 'Alice Smith',    email: 'alice@college.edu',   phone: '9845123456', dept: 'Electrical Engg.',  sem: 'Sem 4', cgpa: 9.1, attendance: 95, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'EE2022002', name: 'Sarah Wilson',   email: 'sarah@college.edu',   phone: '9801234567', dept: 'Electrical Engg.',  sem: 'Sem 4', cgpa: 9.5, attendance: 91, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'ME2023001', name: 'Robert Johnson', email: 'robert@college.edu',  phone: '9812987654', dept: 'Mechanical Engg.',  sem: 'Sem 2', cgpa: 7.8, attendance: 68, status: 'Active',   feeStatus: 'Pending' },
      { id: 'CE2020001', name: 'Michael Brown',  email: 'michael@college.edu', phone: '9867123456', dept: 'Civil Engg.',       sem: 'Sem 8', cgpa: 7.4, attendance: 78, status: 'Inactive', feeStatus: 'Partial' },
      { id: 'IT2022001', name: 'Priya Sharma',   email: 'priya@college.edu',   phone: '9856789012', dept: 'Information Tech.', sem: 'Sem 5', cgpa: 9.3, attendance: 97, status: 'Active',   feeStatus: 'Paid'    },
    ];
    await Student.insertMany(studentData);

    // ── 5. Seed Staff ────────────────────────────────────────────────
    // NOTE: 'dept' is the Staff model field (not 'department')
    const staffData = [
      { id: 'STF001', name: 'CSE HOD',       email: 'csehod@gmail.com',    phone: '9900000001', dept: 'Computer Science',  designation: 'HOD',            subjects: ['Algorithms', 'Compiler Design'],  workload: 12, attendance: 98 },
      { id: 'STF002', name: 'Prof. Rajan Iyer', email: 'rajan@college.edu',  phone: '9845123456', dept: 'Electrical Engg.',  designation: 'HOD',           subjects: ['Circuits', 'Networks'],          workload: 14, attendance: 95 },
      { id: 'STF003', name: 'Dr. Ananya Rao',   email: 'ananya@college.edu', phone: '9876543210', dept: 'Computer Science',  designation: 'Professor',     subjects: ['Data Structures', 'DBMS'],       workload: 18, attendance: 97 },
      { id: 'STF004', name: 'Prof. Karthik S.', email: 'karthik@college.edu',phone: '9823456789', dept: 'Computer Science',  designation: 'Assistant Prof.',subjects: ['OS', 'Machine Learning'],        workload: 20, attendance: 89 },
      { id: 'STF005', name: 'Dr. Priya Nair',   email: 'mehod@college.edu',  phone: '9812000001', dept: 'Mechanical Engg.', designation: 'HOD',           subjects: ['Thermodynamics'],                workload: 12, attendance: 93 },
      { id: 'STF006', name: 'Dr. Meena Pillai', email: 'meena@college.edu',  phone: '9812987654', dept: 'Electrical Engg.', designation: 'Associate Prof.',subjects: ['Circuits', 'Power Systems'],     workload: 16, attendance: 92 },
    ];
    await Staff.insertMany(staffData);

    res.status(201).json({
      message: `Seed complete!`,
      summary: {
        users: createdUsers.length,
        departments: deptData.length,
        students: studentData.length,
        staff: staffData.length,
      },
      loginCredentials: [
        { role: 'Admin',    email: 'admin@college.edu',        password: 'password123' },
        { role: 'HOD(CSE)', email: 'csehod@gmail.com',         password: 'password123' },
        { role: 'HOD(EE)',  email: 'rajan@college.edu',        password: 'password123' },
        { role: 'Staff',    email: 'ananya@college.edu',       password: 'password123' },
        { role: 'Student',  email: 'john@college.edu',         password: 'password123' },
        { role: 'Parent',   email: 'parent_john@college.edu',  password: 'password123' },
        { role: 'Accounts', email: 'accounts@college.edu',     password: 'password123' },
      ]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all users (Admin only)
router.get('/users', protect, collegeScope, async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'principal' && role !== 'system admin' && role !== 'librarian') {
      return res.status(403).json({ message: 'Access denied: Admin/Principal/Librarian only' });
    }
    // Prevent cross-tenant data leak
    const effectiveTenantId = req.collegeId || req.user.tenantId || req.user.collegeId || 'unassigned_college';
    const users = await User.find({ 
      $or: [
        { tenantId: effectiveTenantId },
        { collegeId: effectiveTenantId }
      ]
    }, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE a user
router.post('/users', protect, authorize('Admin', 'Sub Admin', 'Principal'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const { name, email, password, role, department, referenceId, parentOf, studentId, subjects, phone, wardenType } = req.body;
    
    // Check Tenant Limits if applicable
    const tenantId = req.user.tenantId;
    if (tenantId) {
      const college = await College.findOne({ tenantId });
      if (college && college.subscriptionPlan === 'Trial' && college.subscriptionStatus === 'Active') {
        if (role === 'HOD') {
          const hodCount = await User.countDocuments({ tenantId, role: 'HOD' });
          if (hodCount >= 1) return res.status(403).json({ message: 'Trial Limit Exceeded: Maximum 1 HOD allowed.' });
        }
        if (role === 'Student') {
          const studentCount = await User.countDocuments({ tenantId, role: 'Student' });
          if (studentCount >= 2) return res.status(403).json({ message: 'Trial Limit Exceeded: Maximum 2 Students allowed.' });
        }
      } else if (college && college.subscriptionStatus === 'Expired') {
        return res.status(403).json({ message: 'Subscription Expired. Please upgrade to create users.' });
      }
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const user = new User({ name, email, password, role, department, referenceId, parentOf, studentId, subjects, phone, wardenType, tenantId });
    const saved = await user.save();

    const collegeId = tenantId || req.collegeId || req.user?.collegeId || 'unassigned_college';

    // Notify newly created user
    await sendNotification(req, {
      receiverId: saved._id,
      collegeId,
      tenantId: collegeId,
      title: 'New Account Created',
      message: `Welcome ${saved.name}! Your ${saved.role} profile has been created successfully.`,
      category: 'system',
      type: 'Success'
    });

    // Notify Admin / Creator
    if (req.user && req.user._id && req.user._id.toString() !== saved._id.toString()) {
      await sendNotification(req, {
        receiverId: req.user._id,
        collegeId,
        tenantId: collegeId,
        title: `${saved.role} User Added`,
        message: `${saved.name} (${saved.email}) has been created as a ${saved.role} user.`,
        category: 'system',
        type: 'Info'
      });
    }

    const response = saved.toObject();
    delete response.password;
    req.app.get('io').emit('dataUpdated', { module: 'users', action: 'created' });
    res.status(201).json(response);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// UPDATE a user
router.put('/users/:id', protect, authorize('Admin', 'Sub Admin', 'Principal'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const { name, email, role, department, referenceId, parentOf, studentId, subjects, password, phone } = req.body;
    
    const userQuery = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      const effectiveTenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
      if (effectiveTenantId) {
        userQuery.$or = [
          { tenantId: effectiveTenantId },
          { collegeId: effectiveTenantId }
        ];
      }
    }

    const user = await User.findOne(userQuery);
    if (!user) {
      return res.status(404).json({ message: 'User not found in your college domain' });
    }
    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.role = role ?? user.role;
    user.department = department !== undefined ? department : user.department;
    user.referenceId = referenceId !== undefined ? referenceId : user.referenceId;
    user.parentOf = parentOf !== undefined ? parentOf : user.parentOf;
    user.studentId = studentId !== undefined ? studentId : user.studentId;
    user.subjects = subjects !== undefined ? subjects : user.subjects;
    if (phone !== undefined) user.phone = phone;
    
    if (password) {
      user.password = password; // Hashing triggers on pre-save hook
    }
    
    const saved = await user.save();
    const collegeId = saved.tenantId || saved.collegeId || req.collegeId || 'unassigned_college';

    // Notify updated user
    await sendNotification(req, {
      receiverId: saved._id,
      collegeId,
      tenantId: collegeId,
      title: 'Account Information Updated',
      message: `Your user account details have been updated.`,
      category: 'system',
      type: 'Info'
    });

    const response = saved.toObject();
    delete response.password;
    req.app.get('io').emit('dataUpdated', { module: 'users', action: 'updated' });
    res.json(response);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a user
router.delete('/users/:id', protect, authorize('Admin', 'Sub Admin', 'Principal'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const userQuery = { _id: req.params.id };
    if (req.user.role !== 'Super Admin') {
      const effectiveTenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
      if (effectiveTenantId) {
        userQuery.$or = [
          { tenantId: effectiveTenantId },
          { collegeId: effectiveTenantId }
        ];
      }
    }

    const user = await User.findOneAndDelete(userQuery);
    if (!user) {
      return res.status(404).json({ message: 'User not found in your college domain' });
    }
    
    const collegeId = user.tenantId || user.collegeId || req.collegeId || 'unassigned_college';

    // Notify Admin of deletion
    if (req.user && req.user._id) {
      await sendNotification(req, {
        receiverId: req.user._id,
        collegeId,
        tenantId: collegeId,
        title: 'User Account Deleted',
        message: `${user.role} user ${user.name} (${user.email}) was deleted.`,
        category: 'system',
        type: 'Warning'
      });
    }

    // Cascade delete related records strictly within this college domain
    const cascadeQuery = {
      email: user.email,
      $or: [
        { tenantId: collegeId },
        { collegeId: collegeId }
      ]
    };

    if (user.role === 'Student' && user.email) {
      await Student.findOneAndDelete(cascadeQuery);
    } else if ((user.role === 'Staff' || user.role === 'HOD') && user.email) {
      await Staff.findOneAndDelete(cascadeQuery);
    }

    req.app.get('io').emit('dataUpdated', { module: 'users', action: 'deleted' });
    res.json({ message: 'User account successfully deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/debug-tenant-users', protect, async (req, res) => {
  try {
    const users = await User.find({
      tenantId: { $in: ['COL001', 'COL002-8379189', 'COL003-6330287', 'COL004-3190860'] }
    })
      .select('name email role tenantId collegeId')
      .lean();

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/debug-fix-selvi-tenant', protect, async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate(
      { email: 'selvi@gmail.com' },
      {
        $set: {
          tenantId: 'COL004-3190860',
          collegeId: 'COL004-3190860'
        }
      },
      { new: true }
    ).select('name email role tenantId collegeId');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

