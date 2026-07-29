import mongoose from 'mongoose';
import College from '../models/College.js';

export const checkCollegeStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, user missing' });
    }

    // Super Admin is exempt from college deactivation checks
    if (req.user.role === 'Super Admin') {
      return next();
    }

    const tenantId = req.user.tenantId || req.user.collegeId;
    if (tenantId && tenantId !== 'system') {
      const college = await College.findOne({
        $or: [
          { tenantId: tenantId },
          { _id: (typeof tenantId === 'string' && tenantId.length === 24) ? tenantId : null }
        ]
      });

      if (college && (college.isActive === false || college.subscriptionStatus === 'Deactivated')) {
        return res.status(403).json({
          success: false,
          isDeactivated: true,
          message: 'Your college has been deactivated by Super Admin.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Error in checkCollegeStatus middleware:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
