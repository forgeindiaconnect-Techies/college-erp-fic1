import express from 'express';
import Student from '../models/Student.js';
import { protect, authorize, departmentScope, requirePermission, collegeScope, checkSubscription } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import FeeStructure from '../models/FeeStructure.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Get all students
router.get('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff', 'Accounts'), requirePermission('manage_students'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = { collegeId: req.collegeId || 'unassigned_college' };
    if (dept) {
      query.$or = [{ dept: dept }, { department: dept }];
    }
    const students = await Student.find(query);
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get student by ID
router.get('/:id', protect, collegeScope, async (req, res) => {
  try {
    // If Student or Parent, they can only view their own record
    if ((req.user.role === 'Student' || req.user.role === 'Parent') && req.user.referenceId !== req.params.id) {
      return res.status(403).json({ message: 'Unauthorized to view this record' });
    }
    
    const student = await Student.findOne({ id: req.params.id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // If HOD/Staff, ensure they can only view students in their dept
    // Student model uses field 'dept', User model uses 'department'
    if ((req.user.role === 'HOD' || req.user.role === 'Staff') && student.dept !== req.user.department) {
      return res.status(403).json({ message: 'Student is outside your department scope' });
    }
    
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new student
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), requirePermission('manage_students'), collegeScope, checkSubscription, async (req, res) => {
  const student = new Student(req.body);
  try {
    const newStudent = await student.save();
    let studentUser = null;
    const collegeId = req.collegeId || req.user.collegeId || req.user.tenantId || 'unassigned_college';
    
    // Create a User account for login with default password
    try {
      let existingUser = await User.findOne({ email: newStudent.email });
      if (!existingUser) {
        studentUser = new User({
          name: newStudent.name,
          email: newStudent.email,
          password: req.body.password || 'password123',
          role: 'Student',
          department: newStudent.dept,
          referenceId: newStudent.id,
          tenantId: collegeId,
          collegeId: collegeId
        });
        await studentUser.save();
      } else {
        existingUser.referenceId = newStudent.id;
        existingUser.department = newStudent.dept;
        existingUser.tenantId = collegeId;
        existingUser.collegeId = collegeId;
        await existingUser.save();
        studentUser = existingUser;
      }
    } catch (userErr) {
      console.error('Failed to create User account for Student:', userErr);
    }
    
    // Create a FeeStructure for the student
    try {
      const feeStructure = new FeeStructure({
        studentId: newStudent.id,
        tuitionFee: req.body.tuitionFee || 60000,
        examFee: req.body.examFee || 2500,
        libraryFee: req.body.libraryFee || 0,
        hostelFee: (req.body.hostelRequired === 'yes' || req.body.hostelRequired === true) ? (req.body.hostelFeeAmount || 40000) : 0,
        transportFee: (req.body.transportRequired === 'yes' || req.body.transportRequired === true) ? (req.body.transportFeeAmount || 15000) : 0
      });
      await feeStructure.save();
    } catch (feeErr) {
      console.error('Failed to create FeeStructure for Student:', feeErr);
    }

    // Send Notification to newly created Student User
    if (studentUser && studentUser._id) {
      await sendNotification(req, {
        receiverId: studentUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'New Student Profile Created',
        message: `Welcome ${newStudent.name}! Your student profile (${newStudent.id}) has been created successfully.`,
        category: 'student',
        type: 'Success'
      });
    }

    // Send Notification to Creator
    if (req.user && req.user._id) {
      await sendNotification(req, {
        receiverId: req.user._id,
        collegeId,
        tenantId: collegeId,
        title: 'Student Created',
        message: `Student ${newStudent.name} (${newStudent.id}) was successfully added to ${newStudent.dept || 'department'}.`,
        category: 'student',
        type: 'Info'
      });
    }

    req.app.get('io').emit('dataUpdated', { module: 'students', action: 'created' });
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update student
router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), requirePermission('manage_students'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const updatedStudent = await Student.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    
    if (updatedStudent) {
      const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';
      const studentUser = await User.findOne({ referenceId: updatedStudent.id });
      if (studentUser) {
        await sendNotification(req, {
          receiverId: studentUser._id,
          collegeId,
          tenantId: collegeId,
          title: 'Profile Updated',
          message: `Your student profile information has been updated.`,
          category: 'student',
          type: 'Info'
        });
      }
    }

    req.app.get('io').emit('dataUpdated', { module: 'students', action: 'updated' });
    res.json(updatedStudent);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete student
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), requirePermission('manage_students'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const studentId = req.params.id;
    const deletedStudent = await Student.findOneAndDelete({ id: studentId });
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';

    if (deletedStudent && deletedStudent.email) {
      const user = await User.findOneAndDelete({ email: deletedStudent.email });
      if (user && req.user._id) {
        await sendNotification(req, {
          receiverId: req.user._id,
          collegeId,
          tenantId: collegeId,
          title: 'Student Record Deleted',
          message: `Student record for ${deletedStudent.name} (${studentId}) was deleted.`,
          category: 'student',
          type: 'Warning'
        });
      }
    }

    try {
      const Mark = (await import('../models/Mark.js')).default;
      await Mark.deleteMany({ studentId });
    } catch(err) {
      console.warn('Failed to delete marks for student:', err.message);
    }
    
    req.app.get('io').emit('dataUpdated', { module: 'students', action: 'deleted' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk Promote / Graduate Students
router.post('/promote', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD'), collegeScope, checkSubscription, async (req, res) => {
  try {
    const { studentIds, currentSem, nextSem, isGraduation } = req.body;
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'No student IDs provided for promotion' });
    }

    const updatedStudents = [];
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';

    for (const id of studentIds) {
      const student = await Student.findOne({ id });
      if (student) {
        const historyEntry = {
          semester: currentSem || student.sem,
          promotedDate: new Date(),
          promotedTo: isGraduation ? 'Graduated' : nextSem,
          status: 'Passed'
        };

        if (!student.academicHistory) student.academicHistory = [];
        student.academicHistory.push(historyEntry);

        if (isGraduation) {
          student.status = 'Graduated';
        } else if (nextSem) {
          student.sem = nextSem;
        }

        await student.save();
        updatedStudents.push(student);

        // Send real-time notification
        const studentUser = await User.findOne({ referenceId: student.id });
        if (studentUser) {
          await sendNotification(req, {
            receiverId: studentUser._id,
            collegeId,
            tenantId: collegeId,
            title: isGraduation ? 'Academic Status: Graduated 🎉' : `Promoted to ${nextSem}!`,
            message: isGraduation ? 'Congratulations! You have completed all requirements and graduated.' : `You have been successfully promoted from ${currentSem} to ${nextSem}.`,
            category: 'student',
            type: 'Success'
          });
        }
      }
    }

    req.app.get('io').emit('dataUpdated', { module: 'students', action: 'promoted' });
    res.json({ message: `Successfully processed promotion for ${updatedStudents.length} students`, students: updatedStudents });
  } catch (err) {
    console.error('Error promoting students:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
