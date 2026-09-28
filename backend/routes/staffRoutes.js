import express from 'express';
import Staff from '../models/Staff.js';
import { protect, authorize, departmentScope, requirePermission, collegeScope, checkSubscription } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import TransportDriver from '../models/TransportDriver.js';
import HostelBlock from '../models/HostelBlock.js';
import Approval from '../models/Approval.js';
import Notification from '../models/Notification.js';
import bcrypt from 'bcryptjs';
import ActivityLog from '../models/ActivityLog.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Get all staff
router.get('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), requirePermission('manage_staff'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = { collegeId: req.collegeId || 'unassigned_college' };
    if (dept) {
      query.$or = [{ dept: dept }, { department: dept }];
    }
    const staff = await Staff.find(query);
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get staff for payroll (Comprehensive Personnel Roster: HOD, Staff, Drivers, Hostel, Accounts)
router.get('/payroll-list', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || 'unassigned_college';
    const flexCollegeFilter = { 
      $or: [{ collegeId }, { collegeId: { $exists: false } }, { collegeId: null }, { collegeId: '' }] 
    };
    
    // 1. Fetch from Staff collection
    const staffList = await Staff.find(flexCollegeFilter).lean();
    
    // 2. Fetch from TransportDriver collection
    const driverList = await TransportDriver.find(flexCollegeFilter).lean();

    // 3. Fetch from HostelBlock collection (Wardens)
    const hostelList = await HostelBlock.find(flexCollegeFilter).lean();

    // 4. Fetch from User collection (HOD, Staff, Driver, Hostel, Accounts, Principal, Sub Admin, Watchman)
    const userList = await User.find({
      ...flexCollegeFilter,
      role: { $in: ['HOD', 'Staff', 'Driver', 'Hostel', 'Accounts', 'Sub Admin', 'Watchman', 'Principal'] }
    }).select('-password').lean();

    const unifiedMap = new Map();

    // Add Staff records
    staffList.forEach(s => {
      const id = s.id || s.staffId || s._id.toString();
      unifiedMap.set(id, {
        _id: s._id,
        id: id,
        staffId: id,
        name: s.name,
        staffName: s.name,
        designation: s.designation || 'Faculty',
        department: s.department || s.dept || 'Academic Faculty',
        category: (s.designation === 'HOD' || (s.role && s.role.toLowerCase() === 'hod')) ? 'HOD' : 'Staff',
        email: s.email || '',
        phone: s.phone || '',
        joinDate: s.joinDate || s.createdAt
      });
    });

    // Add Drivers
    driverList.forEach(d => {
      const id = d.driverId || d.employeeId || `DRV-${d._id.toString().slice(-4)}`;
      if (!unifiedMap.has(id)) {
        unifiedMap.set(id, {
          _id: d._id,
          id: id,
          staffId: id,
          name: d.name,
          staffName: d.name,
          designation: 'Transport Driver',
          department: 'Transport',
          category: 'Driver',
          email: d.email || '',
          phone: d.phone || '',
          joinDate: d.joiningDate || d.createdAt
        });
      }
    });

    // Add Hostel Wardens from HostelBlock
    hostelList.forEach((h, idx) => {
      if (h.warden) {
        const id = `HST-${h.blockId || ('00' + (idx + 1))}`;
        if (!unifiedMap.has(id)) {
          unifiedMap.set(id, {
            _id: h._id,
            id: id,
            staffId: id,
            name: h.warden,
            staffName: h.warden,
            designation: `Hostel Warden (${h.name || 'Block'})`,
            department: 'Hostel Administration',
            category: 'Hostel',
            email: `${h.warden.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.edu`,
            phone: '9876543210',
            joinDate: h.createdAt || new Date()
          });
        }
      }
    });

    // Add Users (Hostel Wardens, Accounts Officers, HODs, etc.)
    userList.forEach(u => {
      const id = u.referenceId || `USR-${u._id.toString().slice(-4)}`;
      const existingByEmail = Array.from(unifiedMap.values()).find(item => item.email && u.email && item.email.toLowerCase() === u.email.toLowerCase());
      
      if (!unifiedMap.has(id) && !existingByEmail) {
        let desig = u.role;
        let dept = u.department || 'General Administration';
        let cat = u.role;

        if (u.role === 'Hostel') {
          desig = u.wardenType || 'Hostel Warden / Staff';
          dept = 'Hostel Administration';
          cat = 'Hostel';
        } else if (u.role === 'Accounts') {
          desig = 'Accounts Officer';
          dept = 'Finance & Accounts';
          cat = 'Accounts';
        } else if (u.role === 'Driver') {
          desig = 'Transport Driver';
          dept = 'Transport';
          cat = 'Driver';
        } else if (u.role === 'HOD') {
          desig = 'Head of Department (HOD)';
          dept = u.department || 'Academic Department';
          cat = 'HOD';
        } else if (u.role === 'Principal') {
          desig = 'Principal';
          dept = 'Executive Leadership';
          cat = 'Administration';
        }

        unifiedMap.set(id, {
          _id: u._id,
          id: id,
          staffId: id,
          name: u.name,
          staffName: u.name,
          designation: desig,
          department: dept,
          category: cat,
          email: u.email || '',
          phone: u.phone || '',
          joinDate: u.createdAt
        });
      }
    });

    const result = Array.from(unifiedMap.values());
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new staff
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), requirePermission('manage_staff'), collegeScope, checkSubscription, async (req, res) => {
  const staffData = req.body;
  const isHOD = req.user.role && req.user.role.toLowerCase() === 'hod';
  const collegeId = req.collegeId || req.user.collegeId || req.user.tenantId || 'unassigned_college';
  
  if (!staffData.collegeId && req.collegeId) {
    staffData.collegeId = req.collegeId;
  }

  if (isHOD) {
    staffData.status = 'Pending Approval';
  }

  const staff = new Staff(staffData);
  try {
    const newStaff = await staff.save();
    let staffUser = null;
    
    // Create a User account for login with default password
    try {
      let existingUser = await User.findOne({ email: newStaff.email });
      if (!existingUser) {
        staffUser = new User({
          name: newStaff.name,
          email: newStaff.email,
          password: req.body.password || 'password123',
          role: newStaff.designation === 'HOD' ? 'HOD' : 'Staff',
          department: newStaff.dept,
          referenceId: newStaff.id,
          tenantId: collegeId,
          collegeId: collegeId
        });
        await staffUser.save();
      } else {
        existingUser.name = newStaff.name;
        existingUser.role =
          newStaff.designation === 'HOD' ? 'HOD' : 'Staff';
        existingUser.department = newStaff.dept;
        existingUser.referenceId = newStaff.id;
        existingUser.tenantId = collegeId;
        existingUser.collegeId = collegeId;

        await existingUser.save();
        staffUser = existingUser;
      }
    } catch (userErr) {
      console.error('Failed to create User account for Staff:', userErr);
    }

    // Send welcome notification to newly created Staff User
    if (staffUser && staffUser._id) {
      await sendNotification(req, {
        receiverId: staffUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'Welcome to ERP System',
        message: `Welcome ${newStaff.name}! Your staff profile (${newStaff.id}) has been created successfully.`,
        category: 'staff',
        type: 'Success'
      });
    }

    // Send confirmation notification to Creator
    if (req.user && req.user._id) {
      await sendNotification(req, {
        receiverId: req.user._id,
        collegeId,
        tenantId: collegeId,
        title: 'Staff Member Added',
        message: `Staff member ${newStaff.name} (${newStaff.id}) was successfully created.`,
        category: 'staff',
        type: 'Info'
      });
    }

    if (isHOD) {
      try {
        const approval = new Approval({
          type: 'Staff Onboarding',
          department: newStaff.dept,
          requestedBy: req.user.name,
          date: new Date().toLocaleDateString('en-GB'),
          priority: 'High',
          status: 'Pending',
          details: `HOD requested to add new staff member: ${newStaff.name} (${newStaff.id}) to ${newStaff.dept}`,
          remarks: `ID: ${newStaff.id}`
        });
        await approval.save();

        await sendNotification(req, {
          targetRoles: ['Admin', 'Principal'],
          collegeId,
          tenantId: collegeId,
          title: 'New Staff Approval Required',
          message: `${req.user.name} added new staff: ${newStaff.name} in ${newStaff.dept} awaiting approval.`,
          category: 'staff',
          type: 'Info'
        });
        
        req.app.get('io').emit('staffUpdated', { action: 'pending', staff: newStaff });
      } catch (logErr) {
        console.error('Failed to create approval log:', logErr);
      }
    } else {
       req.app.get('io').emit('staffUpdated', { action: 'added', staff: newStaff });
    }

    req.app.get('io').emit('dataUpdated', { module: 'staff', action: 'created' });

    // Activity Log
    ActivityLog.create({
      userId: req.user._id,
      userName: req.user.name,
      role: req.user.role,
      action: `Added new staff: ${newStaff.name} (${newStaff.id})`,
      moduleName: 'Staff Management',
      dept: req.user.department || 'System',
      ip: req.ip || req.connection.remoteAddress
    }).catch(e => console.error(e));

    res.status(201).json(newStaff);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `A staff member with this ${field} already exists. Please use a different one.` });
    }
    res.status(400).json({ message: err.message });
  }
});

// Approve staff
router.put('/:id/approve', protect, authorize('Admin', 'Principal'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const updatedStaff = await Staff.findOneAndUpdate(
      { id: req.params.id },
      { status: 'Active' },
      { new: true }
    );
    
    if (!updatedStaff) return res.status(404).json({ message: 'Staff not found' });
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';

    // Update approval document if exists
    await Approval.findOneAndUpdate(
      { type: 'Staff Onboarding', remarks: `ID: ${req.params.id}`, status: 'Pending' },
      { status: 'Approved' }
    );

    // Send notification to approved staff member
    const staffUser = await User.findOne({ email: updatedStaff.email });
    if (staffUser) {
      await sendNotification(req, {
        receiverId: staffUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'Staff Profile Approved',
        message: `Your staff profile onboarding (${updatedStaff.name}) has been approved and activated.`,
        category: 'staff',
        type: 'Success'
      });
    }

    req.app.get('io').emit('staffUpdated', { action: 'approved', staff: updatedStaff });
    req.app.get('io').emit('dataUpdated', { module: 'staff', action: 'updated' });

    res.json({ message: 'Staff approved successfully', staff: updatedStaff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update staff
router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), requirePermission('manage_staff'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const updatedStaff = await Staff.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';

    if (updatedStaff && updatedStaff.email) {
      const user = await User.findOne({ referenceId: updatedStaff.id });
      if (user) {
        if (req.body.email) user.email = req.body.email;
        if (req.body.password) user.password = req.body.password;
        if (req.body.email || req.body.password) {
          await user.save();
        }
        await sendNotification(req, {
          receiverId: user._id,
          collegeId,
          tenantId: collegeId,
          title: 'Staff Profile Updated',
          message: `Your staff profile details have been updated.`,
          category: 'staff',
          type: 'Info'
        });
      }
    }

    req.app.get('io').emit('staffUpdated', { action: 'updated', staff: updatedStaff });
    req.app.get('io').emit('dataUpdated', { module: 'staff', action: 'updated' });
    res.json(updatedStaff);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete staff
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), requirePermission('manage_staff'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const deletedStaff = await Staff.findOneAndDelete({ id: req.params.id });
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';

    if (deletedStaff && deletedStaff.email) {
      await User.findOneAndDelete({ email: deletedStaff.email });
      if (req.user && req.user._id) {
        await sendNotification(req, {
          receiverId: req.user._id,
          collegeId,
          tenantId: collegeId,
          title: 'Staff Member Deleted',
          message: `Staff member ${deletedStaff.name} (${req.params.id}) was removed from the system.`,
          category: 'staff',
          type: 'Warning'
        });
      }
    }
    req.app.get('io').emit('staffUpdated', { action: 'deleted', id: req.params.id });
    req.app.get('io').emit('dataUpdated', { module: 'staff', action: 'deleted' });
    res.json({ message: 'Staff deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
