import express from 'express';
import College from '../models/College.js';
import Subscription from '../models/Subscription.js';
import { calculateSubscriptionStatus } from '../utils/subscriptionHelper.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get College Admin Subscription details
// @route   GET /api/admin/my-subscription
// @access  Private/Admin
router.get('/my-subscription', protect, authorize('Admin'), collegeScope, async (req, res) => {
  try {
    // Support tenantId stored in either field
    const tenantId = req.user.tenantId || req.user.collegeId || req.collegeId;
    if (!tenantId || tenantId === 'unassigned_college') {
      return res.status(400).json({ message: 'Tenant ID not found for this admin.' });
    }

    const college = await College.findOne({ tenantId });
    if (!college) {
      return res.status(404).json({ message: `College not found for tenant: ${tenantId}` });
    }

    const payments = await Subscription.find({ tenantId }).sort({ createdAt: -1 });
    const subscription = calculateSubscriptionStatus(college);

    res.json({ subscription: { ...subscription, collegeName: college.name }, payments });
  } catch (error) {
    console.error('[admin/my-subscription] Error:', error.message, error.stack);
    res.status(500).json({ message: 'Server Error fetching subscription.', detail: error.message });
  }
});

// @desc    Delete a payment record
// @route   DELETE /api/admin/payments/:id
// @access  Private/Admin
router.delete('/payments/:id', protect, authorize('Admin'), collegeScope, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const tenantId = req.user.tenantId || req.user.collegeId || req.collegeId;
    
    const payment = await Subscription.findOne({ _id: paymentId, tenantId });
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    await Subscription.findByIdAndDelete(paymentId);
    res.json({ message: 'Payment record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ message: 'Server error deleting payment' });
  }
});


export default router;
