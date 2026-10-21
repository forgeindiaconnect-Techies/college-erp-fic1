import express from 'express';
import Meeting from '../models/Meeting.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { protect, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Schedule a meeting (Principal / Admin)
// @route   POST /api/meetings
// @access  Private (Principal, Admin, Super Admin)
router.post('/', protect, collegeScope, async (req, res) => {
  try {
    const {
      title,
      type = 'HOD Review',
      hodId,
      hodUserId: inputHodUserId,
      hodName,
      hodEmail,
      hodDept,
      date,
      time,
      agenda,
      venue = 'Principal Office / Executive Conference Room',
      status = 'Scheduled',
      notes = ''
    } = req.body;

    if (!hodName || !date || !time || !agenda) {
      return res.status(400).json({ message: 'Meeting date, time, agenda, and HOD name are required.' });
    }

    const tenantId = req.collegeId || req.user?.tenantId || req.user?.collegeId || 'COL001';

    // 1. Resolve exact HOD User for strict recipient mapping
    let resolvedHodUser = null;
    if (inputHodUserId) {
      resolvedHodUser = await User.findById(inputHodUserId).select('_id name email role department');
    }
    if (!resolvedHodUser && hodEmail) {
      resolvedHodUser = await User.findOne({ email: hodEmail.toLowerCase() }).select('_id name email role department');
    }
    if (!resolvedHodUser && hodId) {
      resolvedHodUser = await User.findOne({
        $or: [
          { _id: hodId.match(/^[0-9a-fA-F]{24}$/) ? hodId : null },
          { referenceId: hodId },
          { email: hodId }
        ]
      }).select('_id name email role department');
    }
    if (!resolvedHodUser && hodName) {
      resolvedHodUser = await User.findOne({
        name: new RegExp(`^${hodName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        role: 'HOD'
      }).select('_id name email role department');
    }

    const finalHodUserId = resolvedHodUser ? resolvedHodUser._id.toString() : (inputHodUserId || hodId || null);
    const finalHodEmail = (resolvedHodUser?.email || hodEmail || '').toLowerCase();
    const finalHodName = resolvedHodUser?.name || hodName;
    const finalHodDept = resolvedHodUser?.department || hodDept || 'General';

    // 2. Create the Meeting document
    const meeting = new Meeting({
      title: title || `Principal – ${finalHodName} Review`,
      type,
      tenantId,
      collegeId: tenantId,
      organizer: {
        name: req.user?.name || 'Dr. Ramoorthy (Principal)',
        role: req.user?.role || 'Principal',
        email: req.user?.email || 'principal@college.edu',
        id: req.user?._id ? req.user._id.toString() : null
      },
      hodId: hodId || finalHodUserId || 'HOD',
      hodUserId: finalHodUserId,
      hodName: finalHodName,
      hodEmail: finalHodEmail,
      hodDept: finalHodDept,
      date,
      time,
      agenda,
      venue,
      status,
      notes
    });

    const savedMeeting = await meeting.save();

    // 3. Create persistent Notification for the selected HOD
    try {
      const recipientId = finalHodUserId || (resolvedHodUser ? resolvedHodUser._id.toString() : null);
      if (recipientId) {
        const notif = new Notification({
          tenantId,
          collegeId: tenantId,
          recipient: recipientId,
          receiverId: recipientId,
          receiverRole: 'HOD',
          title: '📅 Principal Meeting Scheduled',
          message: `Executive HOD review scheduled by Principal on ${date} at ${time}. Agenda: ${agenda}`,
          category: 'staff',
          type: 'Warning',
          link: '/hod'
        });
        await notif.save();
      }
    } catch (notifErr) {
      console.warn('Meeting notification save warning:', notifErr.message);
    }

    // 4. Real-time Socket.io Broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('meetingCreated', savedMeeting);
      io.emit('dataUpdated', { module: 'meetings', action: 'created', data: savedMeeting });
      io.emit('dataUpdated', { module: 'notifications', action: 'created' });
      if (finalHodUserId) {
        io.to(finalHodUserId).emit('newMeeting', savedMeeting);
      }
    }

    res.status(201).json(savedMeeting);
  } catch (err) {
    console.error('Error creating meeting:', err);
    res.status(500).json({ message: err.message || 'Failed to schedule meeting' });
  }
});

// @desc    Get meetings with role-based isolation
// @route   GET /api/meetings
// @access  Private
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();
    const userEmail = (req.user?.email || '').toLowerCase();
    const userId = req.user?._id ? req.user._id.toString() : null;
    const tenantId = req.collegeId || req.user?.tenantId || req.user?.collegeId;

    let filter = {};

    // Strict tenant isolation (except Super Admin)
    if (req.user?.role !== 'Super Admin' && tenantId && tenantId !== 'system') {
      filter.$or = [{ collegeId: tenantId }, { tenantId }];
    }

    // If logged-in user is an HOD, strictly enforce that they ONLY see their own meetings
    if (userRole === 'hod') {
      const hodSpecificFilter = {
        $or: [
          { hodEmail: userEmail },
          { hodUserId: userId },
          { hodId: userId }
        ]
      };

      if (filter.$or) {
        filter = { $and: [filter, hodSpecificFilter] };
      } else {
        filter = hodSpecificFilter;
      }
    } else {
      // Principal, Admin, Super Admin can optionally filter by specific HOD or status
      const { hodEmail, hodId, status } = req.query;
      const additionalFilters = [];

      if (hodEmail) {
        additionalFilters.push({ hodEmail: hodEmail.toLowerCase() });
      }
      if (hodId) {
        additionalFilters.push({
          $or: [{ hodId }, { hodUserId: hodId }]
        });
      }
      if (status && status !== 'All') {
        additionalFilters.push({ status });
      }

      if (additionalFilters.length > 0) {
        if (filter.$or) {
          filter = { $and: [filter, ...additionalFilters] };
        } else {
          filter = additionalFilters.length === 1 ? additionalFilters[0] : { $and: additionalFilters };
        }
      }
    }

    const meetings = await Meeting.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(meetings);
  } catch (err) {
    console.error('Error fetching meetings:', err);
    res.status(500).json({ message: err.message || 'Failed to fetch meetings' });
  }
});

// @desc    Update meeting status or details
// @route   PATCH /api/meetings/:id
// @access  Private
router.patch('/:id', protect, collegeScope, async (req, res) => {
  try {
    const { status, notes, date, time, agenda, venue } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (status) meeting.status = status;
    if (notes !== undefined) meeting.notes = notes;
    if (date) meeting.date = date;
    if (time) meeting.time = time;
    if (agenda) meeting.agenda = agenda;
    if (venue) meeting.venue = venue;

    const updated = await meeting.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'meetings', action: 'updated', data: updated });
      io.emit('meetingUpdated', updated);
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating meeting:', err);
    res.status(500).json({ message: err.message || 'Failed to update meeting' });
  }
});

// @desc    Delete / Cancel a meeting
// @route   DELETE /api/meetings/:id
// @access  Private (Principal, Admin)
router.delete('/:id', protect, collegeScope, async (req, res) => {
  try {
    const meeting = await Meeting.findByIdAndDelete(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'meetings', action: 'deleted', id: req.params.id });
      io.emit('meetingDeleted', { id: req.params.id });
    }

    res.json({ message: 'Meeting removed successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting meeting:', err);
    res.status(500).json({ message: err.message || 'Failed to delete meeting' });
  }
});

export default router;
