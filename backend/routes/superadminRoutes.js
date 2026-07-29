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

// Get all subscriptions
router.get('/subscriptions', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const colleges = await College.find().sort({ createdAt: -1 });
    const subscriptions = colleges.map(c => {
      const liveStatus = calculateSubscriptionStatus(c);
      return {
        _id: c._id, // we use collegeId as the primary identifier for these actions
        collegeId: c._id,
        collegeName: c.name,
        planName: liveStatus.planName,
        status: liveStatus.status,
        endDate: liveStatus.expiryDate,
        daysRemaining: liveStatus.daysRemaining
      };
    });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single subscription (by collegeId)
router.get('/subscriptions/:id', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });
    const liveStatus = calculateSubscriptionStatus(college);
    res.json({
      _id: college._id,
      collegeId: college._id,
      collegeName: college.name,
      planName: liveStatus.planName,
      status: liveStatus.status,
      endDate: liveStatus.expiryDate,
      daysRemaining: liveStatus.daysRemaining
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upgrade Subscription
router.put('/subscriptions/:id/upgrade', protect, authorize('Super Admin'), collegeScope, async (req, res) => {
  try {
    const { planName } = req.body;
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });

    college.subscriptionPlan = planName;
    college.subscriptionStatus = 'Active';
    await college.save();

    // Create or update subscription record
    const subscription = new Subscription({
      tenantId: college.tenantId,
      collegeId: college._id,
      collegeName: college.name,
      planName: planName,
      amount: planName === 'Premium' ? 699 : (planName === 'Elite' ? 999 : 599),
      startDate: new Date(),
      endDate: college.trialEndDate,
      status: 'Active',
      paymentStatus: 'Success',
      transactionId: `TXN-UPG-${Date.now()}`
    });
    await subscription.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Plan Upgraded',
      message: `Your subscription plan for ${college.name} has been upgraded to ${planName}.`,
      type: 'Success'
    });

    res.json({ message: 'Subscription upgraded successfully', subscription });
  } catch (error) {
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
    const college = await College.findById(req.params.collegeId);
    if (!college) return res.status(404).json({ message: 'College not found' });

    college.subscriptionPlan = 'Premium'; // Defaulting to premium on quick convert
    college.subscriptionStatus = 'Active';
    college.convertedToPaid = true;
    
    // Add 1 year
    const currentEnd = new Date();
    college.trialEndDate = new Date(currentEnd.setFullYear(currentEnd.getFullYear() + 1));
    await college.save();

    const subscription = new Subscription({
      tenantId: college.tenantId,
      collegeId: college._id,
      collegeName: college.name,
      planName: 'Premium',
      amount: 699,
      startDate: new Date(),
      endDate: college.trialEndDate,
      status: 'Active',
      paymentStatus: 'Success',
      transactionId: `TXN-CONV-${Date.now()}`
    });
    await subscription.save();

    await sendNotification(req, {
      tenantId: college.tenantId,
      collegeId: college._id,
      targetRoles: ['Admin', 'Principal'],
      title: 'Subscription Upgraded',
      message: 'Your college trial has been successfully converted to a Premium Paid Subscription.',
      type: 'Success'
    });

    res.json({ message: 'Trial converted to Paid successfully', college });
  } catch (error) {
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
