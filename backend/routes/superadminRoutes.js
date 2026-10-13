import express from 'express';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';
import Subscription from '../models/Subscription.js';
import College from '../models/College.js';
import Notification from '../models/Notification.js';
import { calculateSubscriptionStatus } from '../utils/subscriptionHelper.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Deactivate College
router.put('/college/:id/deactivate', protect, authorize('Super Admin'), async (req, res) => {
  try {
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    college.isActive = false;
    college.subscriptionStatus = 'Deactivated';
    await college.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal', 'Sub Admin', 'HOD', 'Staff', 'Student'],
      title: 'College Deactivated',
      message: `Your college (${college.name}) has been deactivated by Super Admin. Access is temporarily suspended.`,
      category: 'college',
      type: 'Error'
    });

    res.json({ success: true, message: `College ${college.name} deactivated successfully.`, college });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Activate College
router.put('/college/:id/activate', protect, authorize('Super Admin'), async (req, res) => {
  try {
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    college.isActive = true;
    college.subscriptionStatus = 'Active';
    await college.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal', 'Sub Admin', 'HOD', 'Staff', 'Student'],
      title: 'College Activated',
      message: `Your college (${college.name}) has been reactivated by Super Admin. Full system access is restored!`,
      category: 'college',
      type: 'Success'
    });

    res.json({ success: true, message: `College ${college.name} activated successfully.`, college });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update College Details
router.put('/college/:id', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const { name, collegeName, adminName, email, phone, principalName, principalEmail, subscriptionPlan, subscriptionStatus, subscriptionAmount, billingCycle } = req.body;
    const finalName = name || collegeName;

    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    if (finalName) college.name = finalName.trim();
    if (adminName) college.adminName = adminName.trim();
    if (email) college.email = email.trim().toLowerCase();
    if (phone) college.phone = phone.trim();
    if (principalName) college.principalName = principalName.trim();
    if (principalEmail) college.principalEmail = principalEmail.trim().toLowerCase();
    if (subscriptionPlan) college.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus) college.subscriptionStatus = subscriptionStatus;
    if (subscriptionAmount !== undefined && subscriptionAmount !== null && subscriptionAmount !== '') {
      college.subscriptionAmount = Number(subscriptionAmount);
    }
    if (billingCycle) college.billingCycle = billingCycle;

    await college.save();

    // Sync CollegeSettings for this specific tenant only
    if (finalName) {
      const CollegeSettings = (await import('../models/CollegeSettings.js')).default;
      await CollegeSettings.updateOne(
        { $or: [{ tenantId: college.tenantId }, { collegeId: college._id }] },
        { $set: { collegeName: finalName.trim() } }
      );
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'updated' });

    res.json({ success: true, message: `College '${college.name}' updated successfully.`, college });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete College (Super Admin only)
router.delete(['/college/:id', '/colleges/:id'], protect, authorize('Super Admin'), async (req, res) => {
  try {
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    const tenantId = college.tenantId;
    const collegeId = college._id;
    const collegeName = college.name;

    // Delete College Document
    await College.findByIdAndDelete(collegeId);

    // Delete associated User, Subscription, and Settings
    try {
      const User = (await import('../models/User.js')).default;
      const Subscription = (await import('../models/Subscription.js')).default;
      const CollegeSettings = (await import('../models/CollegeSettings.js')).default;

      await Promise.allSettled([
        User.deleteMany({ $or: [{ tenantId }, { collegeId }] }),
        Subscription.deleteMany({ $or: [{ tenantId }, { collegeId }] }),
        CollegeSettings.deleteMany({ $or: [{ tenantId }, { collegeId }] })
      ]);
    } catch (cleanupErr) {
      console.warn('Partial cleanup notice during college delete:', cleanupErr.message);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'deleted', collegeId, tenantId });

    res.json({ success: true, message: `College '${collegeName}' (${tenantId}) and its tenant records deleted successfully.` });
  } catch (error) {
    console.error('Failed to delete college:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all subscriptions
router.get('/subscriptions', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const colleges = await College.find().sort({ createdAt: -1 });
    const subscriptions = colleges.map(c => {
      const liveStatus = calculateSubscriptionStatus(c);
      const defaultAmount = liveStatus.planName === 'Elite' ? 35000 : (liveStatus.planName === 'Premium' ? 20000 : (liveStatus.planName === 'Basic' || liveStatus.planName === 'Starter' ? 10000 : 0));
      const amount = (c.subscriptionAmount !== undefined && c.subscriptionAmount !== null && c.subscriptionAmount > 0)
        ? c.subscriptionAmount
        : defaultAmount;
      return {
        _id: c._id,
        collegeId: c._id,
        tenantId: c.tenantId,
        collegeName: c.name,
        planName: liveStatus.planName,
        amount,
        billingCycle: c.billingCycle || 'Monthly',
        status: liveStatus.status,
        paymentStatus: c.paymentStatus || (liveStatus.status === 'Active' && !liveStatus.isTrial ? 'Paid' : 'Pending'),
        createdAt: c.createdAt,
        startDate: c.trialStartDate || c.createdAt,
        endDate: liveStatus.expiryDate,
        daysRemaining: liveStatus.daysRemaining,
        email: c.email,
        phone: c.phone,
        adminName: c.adminName
      };
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Approve College Subscription
router.put(['/subscriptions/:id/approve', '/college/:id/approve'], protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    college.subscriptionStatus = 'Active';
    college.paymentStatus = 'Paid';
    college.isActive = true;

    const now = new Date();
    if (!college.trialEndDate || new Date(college.trialEndDate) <= now) {
      const extensionMonths = college.billingCycle === 'Annually' ? 12 : (college.billingCycle === 'Quarterly' ? 3 : 1);
      const newEnd = new Date();
      newEnd.setMonth(newEnd.getMonth() + extensionMonths);
      college.trialEndDate = newEnd;
    }
    await college.save();

    await Subscription.updateMany(
      { collegeId: college._id },
      { $set: { status: 'Active', paymentStatus: 'Paid' } }
    );

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Subscription Approved',
      message: `Your college registration and ${college.subscriptionPlan} subscription have been approved and activated!`,
      type: 'Success'
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'subscriptions', action: 'updated', collegeId: college._id });
    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'updated', collegeId: college._id });

    res.json({ success: true, message: `Subscription for ${college.name} approved successfully.`, college });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Suspend College Subscription
router.put(['/subscriptions/:id/suspend', '/college/:id/suspend'], protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ tenantId: req.params.id });
    }
    if (!college) return res.status(404).json({ success: false, message: 'College not found' });

    college.subscriptionStatus = 'Suspended';
    college.isActive = false;
    await college.save();

    await Subscription.updateMany(
      { collegeId: college._id, status: 'Active' },
      { $set: { status: 'Suspended' } }
    );

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal', 'Sub Admin', 'HOD', 'Staff', 'Student'],
      title: 'Subscription Suspended',
      message: `Your college subscription has been suspended by Super Admin.`,
      type: 'Error'
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'subscriptions', action: 'updated', collegeId: college._id });
    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'updated', collegeId: college._id });

    res.json({ success: true, message: `Subscription for ${college.name} suspended.`, college });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a single subscription (by collegeId)
router.get('/subscriptions/:id', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });
    const liveStatus = calculateSubscriptionStatus(college);
    const defaultAmount = liveStatus.planName === 'Elite' ? 35000 : (liveStatus.planName === 'Premium' ? 20000 : (liveStatus.planName === 'Basic' || liveStatus.planName === 'Starter' ? 10000 : 0));
    const amount = (college.subscriptionAmount !== undefined && college.subscriptionAmount !== null && college.subscriptionAmount > 0)
      ? college.subscriptionAmount
      : defaultAmount;
    res.json({
      _id: college._id,
      collegeId: college._id,
      collegeName: college.name,
      planName: liveStatus.planName,
      amount,
      billingCycle: college.billingCycle || 'Monthly',
      status: liveStatus.status,
      endDate: liveStatus.expiryDate,
      daysRemaining: liveStatus.daysRemaining,
      email: college.email,
      phone: college.phone,
      adminName: college.adminName
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upgrade / Change Subscription Plan & Amount
router.put('/subscriptions/:id/upgrade', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const { planName, amount, billingCycle, durationMonths, customExpiryDate } = req.body || {};
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      college = await College.findById(req.params.id);
    }
    if (!college) {
      college = await College.findOne({ $or: [{ tenantId: req.params.id }, { name: req.params.id }] });
    }
    if (!college) return res.status(404).json({ message: 'College not found' });

    const finalPlan = planName || college.subscriptionPlan || 'Premium';
    let defaultAmount = finalPlan === 'Elite' ? 35000 : (finalPlan === 'Premium' ? 20000 : 10000);
    const finalAmount = (amount !== undefined && amount !== null && amount !== '') ? Number(amount) : defaultAmount;
    const months = durationMonths ? Number(durationMonths) : (billingCycle === 'Annually' ? 12 : (billingCycle === 'Quarterly' ? 3 : 1));

    college.subscriptionPlan = finalPlan;
    college.subscriptionStatus = 'Active';
    college.isActive = true;
    college.subscriptionAmount = finalAmount;
    college.billingCycle = billingCycle || (months === 12 ? 'Annually' : 'Monthly');
    college.convertedToPaid = true;

    // Calculate new expiration date
    let newEnd;
    if (customExpiryDate) {
      newEnd = new Date(customExpiryDate);
    } else {
      const baseDate = new Date();
      baseDate.setMonth(baseDate.getMonth() + months);
      newEnd = baseDate;
    }
    college.trialEndDate = newEnd;
    await college.save();

    // Create or update subscription record
    const subscription = new Subscription({
      tenantId: college.tenantId,
      collegeId: college._id,
      collegeName: college.name,
      planName: finalPlan,
      amount: finalAmount,
      startDate: new Date(),
      endDate: newEnd,
      status: 'Active',
      paymentStatus: 'Success',
      transactionId: `TXN-PLAN-${Date.now()}`
    });
    await subscription.save();

    try {
      await sendNotification(req, {
        tenantId: college.tenantId,
        collegeId: college._id,
        targetRoles: ['Admin', 'Principal'],
        title: 'Plan Updated',
        message: `Your subscription plan for ${college.name} has been set to ${finalPlan} (₹${finalAmount.toLocaleString('en-IN')}).`,
        type: 'Success'
      });
    } catch (notifErr) {
      console.error('[superadminRoutes] Notification send failed:', notifErr.message);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'subscriptions', action: 'updated', collegeId: college._id, planName: finalPlan });
    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'updated', collegeId: college._id, planName: finalPlan });
    req.app.get('io')?.emit('dataUpdated', { module: 'trials', action: 'updated', collegeId: college._id, planName: finalPlan });

    res.json({ message: 'Subscription plan and amount updated successfully', subscription, college });
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Renew Subscription
router.put('/subscriptions/:id/renew', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });

    const currentEnd = college.trialEndDate ? new Date(college.trialEndDate) : new Date();
    const newEnd = new Date(currentEnd.setDate(currentEnd.getDate() + 30));
    
    college.subscriptionStatus = 'Active';
    college.trialEndDate = newEnd;
    await college.save();

    // Create a new subscription record for the renewal
    const subscription = new Subscription({
      tenantId: college.tenantId,
      collegeId: college._id,
      collegeName: college.name,
      planName: college.subscriptionPlan || 'Trial',
      amount: 0, // Placeholder
      startDate: new Date(),
      endDate: newEnd,
      status: 'Active',
      paymentStatus: 'Success',
      transactionId: `TXN-REN-${Date.now()}`
    });
    await subscription.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Subscription Renewed',
      message: `Your subscription for ${college.name} has been successfully renewed.`,
      type: 'Success'
    });

    res.json({ message: 'Subscription renewed successfully', college });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel Subscription
router.put('/subscriptions/:id/cancel', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });

    college.subscriptionStatus = 'Cancelled';
    await college.save();

    // Update any active subscription records
    await Subscription.updateMany(
      { collegeId: college._id, status: 'Active' },
      { $set: { status: 'Cancelled' } }
    );

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Subscription Cancelled',
      message: `Your subscription for ${college.name} was cancelled by Super Admin.`,
      type: 'Warning'
    });

    res.json({ message: 'Subscription cancelled successfully', college });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// TRIALS MODULE
// ==========================================

// Get all trial colleges
router.get('/trials', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const trialColleges = await College.find({ subscriptionPlan: 'Trial' }).sort({ createdAt: -1 });
    const trialsWithStatus = trialColleges.map(c => {
      const liveStatus = calculateSubscriptionStatus(c);
      return {
        ...c.toObject(),
        subscriptionStatus: liveStatus.status,
        daysRemaining: liveStatus.daysRemaining
      };
    });
    res.json(trialsWithStatus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single trial college
router.get('/trials/:collegeId', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.collegeId);
    if (!college) return res.status(404).json({ message: 'College not found' });
    const liveStatus = calculateSubscriptionStatus(college);
    res.json({
      ...college.toObject(),
      subscriptionStatus: liveStatus.status,
      daysRemaining: liveStatus.daysRemaining
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Extend Trial
router.put('/trials/:collegeId/extend', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.collegeId);
    if (!college) return res.status(404).json({ message: 'College not found' });

    // Add 14 days to trial
    const currentEnd = college.trialEndDate ? new Date(college.trialEndDate) : new Date();
    college.trialEndDate = new Date(currentEnd.setDate(currentEnd.getDate() + 14));
    college.subscriptionStatus = 'Active';
    await college.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Trial Extended',
      message: 'Your college trial has been extended by 14 days.',
      type: 'Info'
    });

    res.json({ message: 'Trial extended successfully by 14 days', college });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Expire Trial
router.put('/trials/:collegeId/expire', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.collegeId);
    if (!college) return res.status(404).json({ message: 'College not found' });

    college.trialEndDate = new Date(); // set to now
    college.subscriptionStatus = 'Expired';
    await college.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Trial Expired',
      message: 'Your college trial has expired. Access may be restricted. Please upgrade your plan.',
      type: 'Error'
    });

    res.json({ message: 'Trial expired successfully', college });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Convert Trial to Paid
router.put('/trials/:collegeId/convert-to-paid', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const { planName, amount, billingCycle, durationMonths, customExpiryDate } = req.body || {};
    let college = null;
    if (mongoose.Types.ObjectId.isValid(req.params.collegeId)) {
      college = await College.findById(req.params.collegeId);
    }
    if (!college) {
      college = await College.findOne({ $or: [{ tenantId: req.params.collegeId }, { name: req.params.collegeId }] });
    }
    if (!college) return res.status(404).json({ message: 'College not found' });

    const finalPlan = planName || 'Premium';
    const defaultAmount = finalPlan === 'Elite' ? 35000 : (finalPlan === 'Premium' ? 20000 : 10000);
    const finalAmount = (amount !== undefined && amount !== null && amount !== '') ? Number(amount) : defaultAmount;
    const months = durationMonths ? Number(durationMonths) : (billingCycle === 'Annually' ? 12 : (billingCycle === 'Quarterly' ? 3 : 1));

    college.subscriptionPlan = finalPlan;
    college.subscriptionStatus = 'Active';
    college.isActive = true;
    college.subscriptionAmount = finalAmount;
    college.billingCycle = billingCycle || (months === 12 ? 'Annually' : 'Monthly');
    college.convertedToPaid = true;
    
    let newEnd;
    if (customExpiryDate) {
      newEnd = new Date(customExpiryDate);
    } else {
      const currentStart = new Date();
      currentStart.setMonth(currentStart.getMonth() + months);
      newEnd = currentStart;
    }
    college.trialEndDate = newEnd;
    await college.save();

    const subscription = new Subscription({
      tenantId: college.tenantId,
      collegeId: college._id,
      collegeName: college.name,
      planName: finalPlan,
      amount: finalAmount,
      startDate: new Date(),
      endDate: newEnd,
      status: 'Active',
      paymentStatus: 'Success',
      transactionId: `TXN-CONV-${Date.now()}`
    });
    await subscription.save();

    try {
      await sendNotification(req, {
        tenantId: college.tenantId,
        collegeId: college._id,
        targetRoles: ['Admin', 'Principal'],
        title: 'Subscription Activated',
        message: `Your college trial has been successfully converted to ${finalPlan} plan (₹${finalAmount.toLocaleString('en-IN')}).`,
        type: 'Success'
      });
    } catch (notifErr) {
      console.error('[superadminRoutes] Notification send failed:', notifErr.message);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'subscriptions', action: 'updated', collegeId: college._id, planName: finalPlan });
    req.app.get('io')?.emit('dataUpdated', { module: 'colleges', action: 'updated', collegeId: college._id, planName: finalPlan });
    req.app.get('io')?.emit('dataUpdated', { module: 'trials', action: 'updated', collegeId: college._id, planName: finalPlan });

    res.json({ message: 'Trial converted to Paid successfully', college, subscription });
  } catch (error) {
    console.error('Convert trial error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Send Trial Reminder
router.post('/trials/:collegeId/remind', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.collegeId);
    if (!college) return res.status(404).json({ message: 'College not found' });

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Trial Expiring Soon',
      message: 'Your free trial expires soon. Please upgrade your plan to continue using the services.',
      type: 'Warning'
    });

    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// PAYMENTS MODULE
// ==========================================

// Get all payments
router.get('/payments', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const payments = await Subscription.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single payment
router.get('/payments/:paymentId', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const payment = await Subscription.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Verify Payment
router.post('/payments/verify', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const { paymentId } = req.body;
    const payment = await Subscription.findById(paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    payment.paymentStatus = 'Success';
    await payment.save();

    // Automatically update the College subscription so their dashboard unlocks
    const college = await College.findById(payment.collegeId);
    if (college) {
      college.subscriptionStatus = 'Active';
      college.subscriptionPlan = payment.planName;
      college.trialEndDate = payment.endDate || new Date(new Date().setDate(new Date().getDate() + 30));
      college.convertedToPaid = true;
      await college.save();

      // Notify the Admin that their dashboard is unlocked
      await sendNotification(req, {
        tenantId: college.tenantId,
        collegeId: college._id,
        targetRoles: ['Admin', 'Principal'],
        title: 'Payment Verified & Plan Activated',
        message: `Your payment for the ${payment.planName} plan has been verified. Your dashboard access is fully restored.`,
        type: 'Success'
      });
    }

    res.json({ message: 'Payment verified and plan activated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate Invoice (Mock for now)
router.get('/payments/invoice/:paymentId', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const payment = await Subscription.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    res.json({ message: 'Invoice URL generated', invoiceUrl: `/invoices/INV-${payment.transactionId}.pdf` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// REPORTS MODULE
// ==========================================

router.get('/reports/overview', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const totalColleges = await College.countDocuments();
    const activeSubscriptions = await College.countDocuments({ subscriptionStatus: 'Active', subscriptionPlan: { $ne: 'Trial' } });
    const expiredSubscriptions = await College.countDocuments({ subscriptionStatus: 'Expired' });
    const collegesOnTrial = await College.countDocuments({ subscriptionPlan: 'Trial' });
    
    // Calculate total revenue from successful payments
    const successfulPayments = await Subscription.find({ paymentStatus: 'Success' });
    const totalRevenue = successfulPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    res.json({
      totalColleges,
      activeSubscriptions,
      expiredSubscriptions,
      collegesOnTrial,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reports/revenue', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    // Mock monthly revenue for the chart
    res.json([
      { month: 'Jan', revenue: 15000 },
      { month: 'Feb', revenue: 22000 },
      { month: 'Mar', revenue: 18000 },
      { month: 'Apr', revenue: 29000 },
      { month: 'May', revenue: 35000 },
      { month: 'Jun', revenue: 42000 }
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reports/subscriptions', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const starter = await College.countDocuments({ subscriptionPlan: 'Starter' });
    const premium = await College.countDocuments({ subscriptionPlan: 'Premium' });
    const elite = await College.countDocuments({ subscriptionPlan: 'Elite' });
    const trial = await College.countDocuments({ subscriptionPlan: 'Trial' });

    res.json([
      { name: 'Starter', value: starter },
      { name: 'Premium', value: premium },
      { name: 'Elite', value: elite },
      { name: 'Trial', value: trial }
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reports/trials', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const totalTrials = await College.countDocuments({ subscriptionPlan: 'Trial' });
    const converted = await College.countDocuments({ convertedToPaid: true });
    
    res.json({
      totalTrials,
      converted,
      conversionRate: totalTrials > 0 ? ((converted / (totalTrials + converted)) * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reports/export', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const format = req.query.format || 'pdf';
    res.json({ message: `Report generated successfully`, downloadUrl: `/exports/report-${Date.now()}.${format}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// SETTINGS MODULE
// ==========================================

import SystemSetting from '../models/SystemSetting.js';

router.get('/settings', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    let settings = await SystemSetting.findOne({ key: 'global_config' });
    if (!settings) {
      settings = await SystemSetting.create({ key: 'global_config' });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/settings', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    let settings = await SystemSetting.findOne({ key: 'global_config' });
    if (!settings) {
      settings = new SystemSetting({ key: 'global_config' });
    }
    
    // Update all fields provided
    Object.assign(settings, req.body);
    await settings.save();
    
    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
