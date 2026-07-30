import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { context } from '../context.js';
import College from '../models/College.js';
import { calculateSubscriptionStatus } from '../utils/subscriptionHelper.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // Accept frontend mock tokens to prevent 401 redirect loops in demo mode
      if (token.startsWith('mock-')) {
        let role = 'Student';
        if (token.includes('-superadmin')) role = 'Super Admin';
        else if (token.includes('-subadmin')) role = 'Sub Admin';
        else if (token.includes('-admin')) role = 'Admin';
        else if (token.includes('-principal')) role = 'Principal';
        else if (token.includes('-hod')) role = 'HOD';
        else if (token.includes('-staff')) role = 'Staff';
        else if (token.includes('-parent')) role = 'Parent';
        else if (token.includes('-accounts')) role = 'Accounts';
        else if (token.includes('-driver')) role = 'Driver';
        
        let referenceId = null;
        if (token.includes('-dynamic-')) {
          referenceId = token.split('-dynamic-')[1];
        } else if (role === 'Student' || role === 'Parent') {
          // Default mock student ID used in pre-seeded database
          referenceId = 'CS2022001';
        }
        
        let tenantId = 'mock_college_id';
        if (token.includes('-tenant-')) {
          tenantId = token.split('-tenant-')[1];
        }
        
        const permissions = role === 'Sub Admin' ? ['manage_students', 'manage_staff', 'manage_attendance'] : undefined;
        
        req.user = { role, _id: 'mock-id', department: 'Computer Science Engineering', referenceId, permissions, tenantId, collegeId: tenantId };
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      // Check college.isActive on every protected API call
      if (req.user.role !== 'Super Admin') {
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
              message: 'College is deactivated. Please contact Super Admin.'
            });
          }
        }
      }

      return next();
    } catch (err) {
      console.error(err);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles) => {
  const lowerRoles = roles.map(r => r.toLowerCase());
  return (req, res, next) => {
    if (!req.user || !lowerRoles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ message: `User role ${req.user?.role} is not authorized` });
    }
    next();
  };
};

export const departmentScope = (req, res, next) => {
  // Admin, Principal, and Accounts have unrestricted global access, never filter query
  const role = req.user?.role?.toLowerCase() || '';
  if (req.user && role !== 'admin' && role !== 'principal' && role !== 'sub admin' && role !== 'accounts') {
    // If it's a mock token, bypass strict backend department scoping 
    // since the frontend handles scoping and the mock department is hardcoded
    if (req.user._id !== 'mock-id' && req.user.department) {
      req.dept = req.user.department;
    }
  }
  next();
};

export const requirePermission = (moduleName) => {
  return (req, res, next) => {
    const role = req.user?.role?.toLowerCase() || '';
    // Admin has access to all modules implicitly
    if (req.user && role === 'admin') {
      return next();
    }
    
    // For Sub Admin, check if they have the specific permission
    if (req.user && role === 'sub admin') {
      if (!req.user.permissions || !req.user.permissions.includes(moduleName)) {
        return res.status(403).json({ message: `Sub Admin is not authorized to access module: ${moduleName}` });
      }
    }
    
    // Other roles bypass this specific permission check (they should be blocked by authorize() if not allowed)
    next();
  };
};

export const collegeScope = (req, res, next) => {
  if (req.user && req.user.role !== 'Super Admin') {
    req.collegeId = req.user.tenantId || req.user.collegeId || 'unassigned_college';
    
    // Store in global context for Mongoose plugin to access
    const store = context.getStore();
    if (store) {
      store.set('collegeId', req.collegeId);
    }
  }
  next();
};

export const checkSubscription = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || req.collegeId;
    if (tenantId && tenantId !== 'system' && tenantId !== 'mock_college_id') {
      const college = await College.findOne({ tenantId });
      if (college) {
        const subscription = calculateSubscriptionStatus(college);
        if (subscription.status === 'Expired') {
          return res.status(403).json({ message: 'Subscription Expired. Access restricted. Please renew/upgrade.' });
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

export { checkCollegeStatus } from './checkCollegeStatus.js';

