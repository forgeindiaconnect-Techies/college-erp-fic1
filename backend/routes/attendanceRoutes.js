import express from 'express';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import { protect, authorize, departmentScope, requirePermission, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

const updateStudentAttendancePercentage = async (studentId, req) => {
  try {
    const records = await Attendance.find({ 
      tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] },
      studentId: studentId
    });
    if (records.length === 0) return;
    const presentDays = records.filter(r => r.status === 'Present').length;
    const percentage = Math.round((presentDays / records.length) * 100);
    await Student.findOneAndUpdate(
      { $or: [{ id: studentId }, { _id: studentId }] },
      { attendance: percentage }
    );
  } catch (err) {
    console.error('Failed to update student attendance percentage:', err);
  }
};

// Get all attendance records
router.get('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff'), requirePermission('view_attendance'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = dept ? { department: dept } : {}; if (req.collegeId) query.tenantId = req.collegeId;
    const records = await Attendance.find(query).sort({ attendanceDate: -1, date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get attendance for a specific student
router.get('/student/:studentId', protect, collegeScope, async (req, res) => {
  try {
    console.log(`[GET /student/:studentId] Request for: ${req.params.studentId}. User role: ${req.user.role}, Ref ID: ${req.user.referenceId}`);
    
    let studentData = null;
    let queryCondition = [{ id: req.user.referenceId }];
    if (req.user.referenceId && req.user.referenceId.length === 24 && /^[0-9a-fA-F]{24}$/.test(req.user.referenceId)) {
      queryCondition.push({ _id: req.user.referenceId });
    }
    
    studentData = await Student.findOne({ $or: queryCondition });

    // If student/parent, verify they are requesting their own record
    if (req.user.role === 'Student' || req.user.role === 'Parent') {
      const isDirectMatch = req.user.referenceId === req.params.studentId;
      const isRollNoMatch = studentData && (studentData.id === req.params.studentId || studentData._id.toString() === req.params.studentId);
      
      if (!isDirectMatch && !isRollNoMatch) {
        console.log('=> 403 Forbidden: Unauthorized');
        return res.status(403).json({ message: 'Unauthorized to view this record' });
      }
    }
    
    const searchIds = [req.params.studentId];
    if (studentData && studentData.id) searchIds.push(studentData.id);
    if (studentData && studentData._id) searchIds.push(studentData._id.toString());
    
    const records = await Attendance.find({ 
      studentId: { $in: searchIds }, 
      tenantId: { $in: [req.collegeId, 'unassigned_college', 'mock_college_id'] } 
    }).sort({ attendanceDate: -1, date: -1 });
    console.log(`=> Found ${records.length} records`);
    res.json(records);
  } catch (err) {
    console.log(`=> 500 Error: ${err.message}`);
    res.status(500).json({ message: err.message });
  }
});

// Record new attendance (Single or Bulk)
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff'), requirePermission('view_attendance'), collegeScope, async (req, res) => {
  try {
    console.log(`[POST /attendance] Received payload:`, JSON.stringify(req.body));
    if (Array.isArray(req.body)) {
      if (req.body.length === 0) return res.status(400).json({ message: 'Empty payload' });

      const bulkOps = req.body.map(record => {
        const exactDate = new Date(record.attendanceDate || record.date);
        exactDate.setUTCHours(0, 0, 0, 0);
        record.attendanceDate = exactDate;
        record.tenantId = req.collegeId || 'unassigned_college';
        
        return {
          updateOne: {
            filter: {
              tenantId: record.tenantId,
              studentId: record.studentId,
              attendanceDate: exactDate,
              subjectId: record.subjectId || record.subject,
              periodId: record.periodId || record.period
            },
            update: { $set: record },
            upsert: true
          }
        };
      });

      await Attendance.bulkWrite(bulkOps);
      console.log(`=> Upserted ${bulkOps.length} attendance records`);
      
      // Update student percentages (get unique student IDs)
      const studentIds = [...new Set(req.body.map(r => r.studentId))];
      for (const id of studentIds) {
        await updateStudentAttendancePercentage(id, req);
      }

      // Dispatch Notifications for Absentees
      const absentees = req.body.filter(r => r.status && r.status.toLowerCase() !== 'present');
      for (const record of absentees) {
        const exactDate = new Date(record.attendanceDate || record.date).toLocaleDateString('en-GB');
        const subject = record.subjectId || record.subject || 'class';
        const msg = `You were marked ${record.status} for ${subject} on ${exactDate}.`;
        
        await sendNotification(req, {
          recipient: record.studentId, // Targets the student via referenceId mapping if handled in frontend/backend logic. Wait, Notification handles referenceIds? Let's check sendNotification mapping. Assuming it relies on the referenceId/receiverId.
          receiverId: record.studentId,
          receiverRole: 'Student',
          title: `Attendance Alert: ${record.status}`,
          message: msg,
          category: 'student',
          type: 'Warning',
          tenantId: req.collegeId || 'unassigned_college'
        });
      }

      req.app.get('io').emit('dataUpdated', { module: 'attendance', action: 'created' });
      return res.status(201).json({ message: 'Attendance records saved successfully' });
    } else {
      // Single insert
      const exactDate = new Date(req.body.attendanceDate || req.body.date);
      exactDate.setUTCHours(0, 0, 0, 0);
      req.body.attendanceDate = exactDate;
      req.body.tenantId = req.collegeId || 'unassigned_college'; // Explicitly inject tenantId

      const existingCount = await Attendance.countDocuments({
        studentId: req.body.studentId,
        subjectId: req.body.subjectId || req.body.subject,
        periodId: req.body.periodId || req.body.period,
        attendanceDate: exactDate,
        tenantId: req.body.tenantId
      });

      if (existingCount > 0) {
        return res.status(409).json({ message: `Attendance already submitted for this subject and date.` });
      }

      const attendance = new Attendance(req.body);
      const newRecord = await attendance.save();
      await updateStudentAttendancePercentage(newRecord.studentId, req);

      if (newRecord.status && newRecord.status.toLowerCase() !== 'present') {
        const exactDate = new Date(newRecord.attendanceDate).toLocaleDateString('en-GB');
        const subject = newRecord.subjectId || newRecord.subject || 'class';
        const msg = `You were marked ${newRecord.status} for ${subject} on ${exactDate}.`;
        
        await sendNotification(req, {
          recipient: newRecord.studentId,
          receiverId: newRecord.studentId,
          receiverRole: 'Student',
          title: `Attendance Alert: ${newRecord.status}`,
          message: msg,
          category: 'student',
          type: 'Warning',
          tenantId: req.collegeId || 'unassigned_college'
        });
      }

      req.app.get('io').emit('dataUpdated', { module: 'attendance', action: 'created' });
      return res.status(201).json(newRecord);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update attendance record
router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff'), requirePermission('view_attendance'), collegeScope, async (req, res) => {
  try {
    const updatedRecord = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (updatedRecord) {
      await updateStudentAttendancePercentage(updatedRecord.studentId, req);
    }
    req.app.get('io').emit('dataUpdated', { module: 'attendance', action: 'updated' });
    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete attendance record
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff'), requirePermission('view_attendance'), collegeScope, async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (record) {
      await Attendance.findByIdAndDelete(req.params.id);
      await updateStudentAttendancePercentage(record.studentId, req);
    }
    req.app.get('io').emit('dataUpdated', { module: 'attendance', action: 'deleted' });
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
