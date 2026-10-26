import express from 'express';
import StaffSupportRecord from '../models/StaffSupportRecord.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(collegeScope);

const formatLeave = (doc) => {
  const d = doc.toObject ? doc.toObject() : doc;
  let daysDiff = d.daysCount || 1;
  if (!d.daysCount && d.startDate && d.endDate) {
    try {
      const d1 = new Date(d.startDate);
      const d2 = new Date(d.endDate);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch {}
  }

  return {
    id: d._id.toString(),
    _id: d._id,
    staffId: d.staffId || d.studentId || '',
    studentId: d.studentId || d.staffId || '',
    staffName: d.staffName,
    name: d.staffName,
    role: d.role || 'Staff',
    email: d.email || '',
    dept: d.department,
    department: d.department,
    type: d.subType || d.type || 'Casual Leave',
    leaveType: d.subType || d.type || 'Casual Leave',
    startDate: d.startDate || '',
    endDate: d.endDate || d.startDate || '',
    daysCount: daysDiff,
    days: daysDiff,
    reason: d.description || d.reason || '',
    description: d.description || d.reason || '',
    priority: d.priority || 'Medium',
    status: d.status || 'Pending',
    collegeId: d.collegeId,
    createdAt: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : (d.startDate || new Date().toISOString().split('T')[0]),
    timeline: d.timeline || []
  };
};

// 1. GET ALL LEAVES (with role-based filtering)
router.get('/', async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const role = (req.user?.role || '').toLowerCase();
    const query = {
      requestType: 'Leave',
      $or: [
        { collegeId: tenantId },
        { collegeId: 'COL001' },
        { collegeId: 'unassigned_college' },
        { collegeId: { $exists: false } }
      ]
    };

    // Role-based filtering
    if (role === 'staff' || role === 'faculty' || role === 'teacher') {
      const staffFilter = [{ staffName: req.user.name }];
      if (req.user.referenceId) staffFilter.push({ staffId: req.user.referenceId });
      if (req.user.email) staffFilter.push({ email: req.user.email });
      query.$and = [{ $or: query.$or }, { $or: staffFilter }];
      delete query.$or;
    } else if (role === 'student') {
      const studentFilter = [{ staffName: req.user.name }];
      if (req.user.referenceId) studentFilter.push({ studentId: req.user.referenceId });
      if (req.user.email) studentFilter.push({ email: req.user.email });
      query.$and = [{ $or: query.$or }, { $or: studentFilter }];
      delete query.$or;
    } else if (role === 'parent') {
      const childId = req.user.referenceId || req.user.parentOf || req.user.studentId;
      if (childId) {
        query.$and = [{ $or: query.$or }, { $or: [{ studentId: childId }, { staffId: childId }] }];
        delete query.$or;
      }
    } else if (role === 'hod' && req.user.department) {
      query.$and = [{ $or: query.$or }, { department: req.user.department }];
      delete query.$or;
    }

    const records = await StaffSupportRecord.find(query).sort({ createdAt: -1 });
    res.json(records.map(formatLeave));
  } catch (err) {
    console.error('Error fetching leaves:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch leaves', error: err.message });
  }
});

// 2. GET STUDENT SPECIFIC LEAVES
router.get('/student/:studentId', async (req, res) => {
  try {
    const targetId = req.params.studentId;
    const query = {
      requestType: 'Leave',
      $or: [
        { studentId: targetId },
        { staffId: targetId },
        { staffName: new RegExp(`^${targetId}$`, 'i') }
      ]
    };
    const records = await StaffSupportRecord.find(query).sort({ createdAt: -1 });
    res.json(records.map(formatLeave));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. POST NEW LEAVE APPLICATION
router.post('/', async (req, res) => {
  try {
    const tenantId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'COL001';
    const {
      staffName,
      name,
      staffId,
      studentId,
      role,
      email,
      department,
      dept,
      type,
      leaveType,
      subType,
      startDate,
      endDate,
      daysCount,
      reason,
      description,
      priority
    } = req.body;

    const applicantName = staffName || name || req.user?.name || 'Applicant';
    const applicantDept = department || dept || req.user?.department || 'General';
    const leaveCategory = type || leaveType || subType || 'Casual Leave';
    const desc = reason || description || 'Leave Application';
    const sDate = startDate || new Date().toISOString().split('T')[0];
    const eDate = endDate || sDate;

    let calculatedDays = Number(daysCount) || 1;
    if (!daysCount && sDate && eDate) {
      try {
        const d1 = new Date(sDate);
        const d2 = new Date(eDate);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      } catch {}
    }

    const newLeave = new StaffSupportRecord({
      staffName: applicantName,
      staffId: staffId || req.user?.referenceId,
      studentId: studentId || (req.user?.role === 'Student' ? req.user?.referenceId : undefined),
      role: role || req.user?.role || 'Staff',
      email: email || req.user?.email,
      department: applicantDept,
      requestType: 'Leave',
      subType: leaveCategory,
      type: leaveCategory,
      startDate: sDate,
      endDate: eDate,
      daysCount: calculatedDays,
      description: desc,
      reason: desc,
      priority: priority || 'Medium',
      status: 'Pending',
      collegeId: tenantId,
      timeline: [
        { date: new Date().toISOString().split('T')[0], text: `Leave application submitted (${leaveCategory})` }
      ]
    });

    const saved = await newLeave.save();
    const formatted = formatLeave(saved);

    // Notify approver
    try {
      const targetRole = req.user?.role === 'Student' ? 'Class Advisor' : 'HOD';
      await new Notification({
        targetRoles: [targetRole, 'Principal', 'Admin'],
        title: 'New Leave Application',
        message: `${applicantName} (${applicantDept}) applied for ${leaveCategory} (${sDate} to ${eDate}).`,
        type: 'Info',
        link: '/leaves',
        collegeId: tenantId,
        tenantId: tenantId
      }).save();
    } catch {}

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'leaves', action: 'created', data: formatted });
      io.emit('dataUpdated', { module: 'staffSupportUpdated' });
      io.emit('leaveUpdated', formatted);
    }

    res.status(201).json(formatted);
  } catch (err) {
    console.error('Error creating leave:', err);
    res.status(400).json({ success: false, message: 'Failed to create leave', error: err.message });
  }
});

// 4. PATCH / PUT UPDATE LEAVE STATUS (Approve, Reject, Cancel)
const handleStatusUpdate = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const leave = await StaffSupportRecord.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    const validStatuses = ['Approved', 'Rejected', 'Pending', 'In Progress', 'Under Review', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const reviewerName = req.user?.name || req.user?.role || 'Authority';
    const note = remarks || `Status marked as ${status} by ${reviewerName}`;

    leave.status = status || leave.status;
    leave.timeline = leave.timeline || [];
    leave.timeline.push({ date: todayStr, text: note });

    const updated = await leave.save();
    const formatted = formatLeave(updated);

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'leaves', action: 'updated', data: formatted });
      io.emit('dataUpdated', { module: 'staffSupportUpdated' });
      io.emit('leaveUpdated', formatted);
    }

    res.json(formatted);
  } catch (err) {
    console.error('Error updating leave status:', err);
    res.status(400).json({ success: false, message: 'Failed to update leave', error: err.message });
  }
};

router.patch('/:id', handleStatusUpdate);
router.put('/:id', handleStatusUpdate);

// 5. DELETE / CANCEL LEAVE
router.delete('/:id', async (req, res) => {
  try {
    const leave = await StaffSupportRecord.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    await StaffSupportRecord.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'leaves', action: 'deleted', id: req.params.id });
      io.emit('dataUpdated', { module: 'staffSupportUpdated' });
      io.emit('leaveUpdated', { id: req.params.id, status: 'Cancelled' });
    }

    res.json({ success: true, message: 'Leave application cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel leave', error: err.message });
  }
});

export default router;
