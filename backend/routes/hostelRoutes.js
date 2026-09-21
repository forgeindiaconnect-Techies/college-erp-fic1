import express from 'express';
import mongoose from 'mongoose';
import HostelBlock from '../models/HostelBlock.js';
import HostelRoom from '../models/HostelRoom.js';
import HostelStudent from '../models/HostelStudent.js';
import HostelComplaint from '../models/HostelComplaint.js';
import Student from '../models/Student.js';
import HostelRequest from '../models/HostelRequest.js';
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

// @desc    Get all hostel requests
// @route   GET /api/hostel/requests
// @access  Private
router.get('/requests', protect, collegeScope, async (req, res) => {
  try {
    const requests = await HostelRequest.find({
      collegeId: req.collegeId || req.user?.collegeId
    }).sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching hostel requests:', error);
    res.status(500).json({ message: 'Server Error fetching hostel requests' });
  }
});

// @desc    Create a hostel request for an existing student
// @route   POST /api/hostel/requests
// @access  Private
router.post('/requests', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts', 'HOD', 'Hostel'), collegeScope, async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    if (!student) {
      student = await Student.findOne({ id: studentId });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || '';

    const existingRequest = await HostelRequest.findOne({
      student: student._id,
      collegeId
    });

    if (existingRequest) {
      return res.status(409).json({
        message: 'Hostel request already exists for this student',
        request: existingRequest
      });
    }

    const hostelRequest = await HostelRequest.create({
      student: student._id,
      studentId: student.id,
      studentName: student.name,
      department: student.department || student.dept || '',
      course: student.course || '',
      semester: String(student.semester || student.sem || ''),
      academicYear: student.academicYear || '',
      quotaName: student.quotaName || 'General Quota',
      hostelRequired: true,
      hostelFee: Number(student.hostelFee || student.hostelFeeAmount || 0),
      hostelFeeStatus: student.hostelFeeStatus || 'Pending',
      status: 'Pending',
      collegeId
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'hostel', action: 'request_created' });

    res.status(201).json(hostelRequest);
  } catch (error) {
    console.error('Error creating hostel request:', error);
    res.status(500).json({ message: 'Server Error creating hostel request' });
  }
});

// @desc    Approve and allocate room for a hostel request
// @route   PUT /api/hostel/requests/:id/allocate
// @access  Private
router.put('/requests/:id/allocate', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts', 'HOD', 'Hostel'), collegeScope, async (req, res) => {
  try {
    const { block, blockWing, hostelName, room, roomNumber, bed, bedNumber, wardenName, wardenContact, hostelFeeAmount, hostelFeeStatus } = req.body;
    const reqId = req.params.id;

    const assignedBlock = hostelName || block || blockWing || 'Boys Hostel A';
    const assignedRoom = room || roomNumber || '';
    const assignedBed = bed || bedNumber || '1';
    const assignedWarden = wardenName || 'Mr. Ramesh Kumar';

    let hostelReq = null;
    if (mongoose.Types.ObjectId.isValid(reqId)) {
      hostelReq = await HostelRequest.findById(reqId);
    }
    if (!hostelReq) {
      hostelReq = await HostelRequest.findOne({
        $or: [{ studentId: reqId }, { student: mongoose.Types.ObjectId.isValid(reqId) ? reqId : null }]
      });
    }

    if (hostelReq) {
      hostelReq.block = assignedBlock;
      hostelReq.room = assignedRoom;
      hostelReq.bed = assignedBed;
      hostelReq.wardenName = assignedWarden;
      if (hostelFeeAmount !== undefined) hostelReq.hostelFee = Number(hostelFeeAmount);
      if (hostelFeeStatus) hostelReq.hostelFeeStatus = hostelFeeStatus === 'paid' ? 'Paid' : 'Pending';
      hostelReq.status = 'Allocated';
      await hostelReq.save();
    }

    // Also update Student document
    let student = null;
    if (hostelReq?.student) {
      student = await Student.findById(hostelReq.student);
    }
    if (!student && mongoose.Types.ObjectId.isValid(reqId)) {
      student = await Student.findById(reqId);
    }
    if (!student) {
      student = await Student.findOne({ id: reqId });
    }

    if (student) {
      student.hostelRequired = 'yes';
      student.hostelerStatus = 'Hosteler';
      student.hostelName = assignedBlock;
      student.blockWing = assignedBlock;
      student.roomNumber = assignedRoom;
      student.bedNumber = assignedBed;
      student.wardenName = assignedWarden;
      if (wardenContact) student.wardenContact = wardenContact;
      if (hostelFeeAmount !== undefined) student.hostelFee = Number(hostelFeeAmount);
      if (hostelFeeStatus) student.hostelFeeStatus = hostelFeeStatus;
      await student.save();
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'hostel', action: 'allocated' });
    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'updated' });

    res.json({ message: 'Room allocated successfully', request: hostelReq, student });
  } catch (error) {
    console.error('Error allocating hostel room:', error);
    res.status(500).json({ message: 'Server Error allocating hostel room' });
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



