import express from 'express';
import HostelBlock from '../models/HostelBlock.js';
import HostelRoom from '../models/HostelRoom.js';
import HostelStudent from '../models/HostelStudent.js';
import HostelComplaint from '../models/HostelComplaint.js';
import User from '../models/User.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// @desc    Get all hostel blocks
// @route   GET /api/hostel/blocks
// @access  Private
router.get('/blocks', protect, collegeScope, async (req, res) => {
  try {
    const blocks = await HostelBlock.find({});
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching blocks' });
  }
});

// @desc    Get all hostel rooms
// @route   GET /api/hostel/rooms
// @access  Private
router.get('/rooms', protect, collegeScope, async (req, res) => {
  try {
    const rooms = await HostelRoom.find({});
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching rooms' });
  }
});

// @desc    Get all hostel students
// @route   GET /api/hostel/students
// @access  Private
router.get('/students', protect, collegeScope, async (req, res) => {
  try {
    const students = await HostelStudent.find({})
      .populate({
        path: 'studentProfile',
        populate: { path: 'user', select: 'name email phone' }
      });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching students' });
  }
});

// @desc    Get all hostel complaints
// @route   GET /api/hostel/complaints
// @access  Private
router.get('/complaints', protect, collegeScope, async (req, res) => {
  try {
    const { studentId } = req.query;
    const filter = studentId ? { studentId } : {};
    const complaints = await HostelComplaint.find(filter).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching complaints' });
  }
});

// @desc    Create a new hostel complaint
// @route   POST /api/hostel/complaints
// @access  Private
router.post('/complaints', protect, collegeScope, async (req, res) => {
  try {
    const { studentId, studentName, room, category, title, description, priority } = req.body;
    
    // Generate a unique ID like HC001
    const count = await HostelComplaint.countDocuments();
    const complaintId = `HC${String(count + 1).padStart(3, '0')}`;

    const newComplaint = new HostelComplaint({
      complaintId,
      studentId,
      studentName: studentName || 'Unknown Student',
      room: room || 'Not Assigned',
      category,
      title: title || category,
      description,
      priority: priority || 'Medium',
      status: 'Pending Review'
    });

    const savedComplaint = await newComplaint.save();
    const collegeId = req.collegeId || req.user?.collegeId || 'unassigned_college';

    await sendNotification(req, {
      targetRoles: ['Admin', 'Principal'],
      collegeId,
      tenantId: collegeId,
      title: 'New Hostel Maintenance Complaint',
      message: `${savedComplaint.studentName} (Room ${savedComplaint.room}) logged a hostel issue: ${savedComplaint.title}`,
      category: 'hostel',
      type: 'Warning'
    });

    res.status(201).json(savedComplaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Server Error creating complaint' });
  }
});

// @desc    Update a hostel complaint status
// @route   PUT /api/hostel/complaints/:id
// @access  Private
router.put('/complaints/:id', protect, collegeScope, async (req, res) => {
  try {
    const { status, resolutionRemarks } = req.body;
    
    const complaint = await HostelComplaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (status) complaint.status = status;
    if (resolutionRemarks !== undefined) complaint.resolutionRemarks = resolutionRemarks;
    
    if (status === 'Resolved' || status === 'Rejected') {
      complaint.closedDate = Date.now();
    }

    const updatedComplaint = await complaint.save();
    const collegeId = req.collegeId || req.user?.collegeId || 'unassigned_college';

    const studentUser = await User.findOne({ referenceId: updatedComplaint.studentId });
    if (studentUser) {
      await sendNotification(req, {
        receiverId: studentUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'Hostel Complaint Status Updated',
        message: `Your hostel complaint (${updatedComplaint.complaintId}) status is now: ${updatedComplaint.status}`,
        category: 'hostel',
        type: updatedComplaint.status === 'Resolved' ? 'Success' : 'Info'
      });
    }

    res.json(updatedComplaint);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Server Error updating complaint' });
  }
});

export default router;
