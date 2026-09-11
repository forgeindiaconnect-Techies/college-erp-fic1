import express from 'express';
import Exam from '../models/Exam.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// GET all exams (HOD/Staff scoped by departmentScope, Admin/Principal can view all or filter)
router.get('/', protect, authorize('Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent'), collegeScope, departmentScope, async (req, res) => {
  try {
    const {
      academicYearId,
      departmentId,
      courseId,
      semesterId,
      sectionId,
      subjectId,
      examType,
      status
    } = req.query;

    const dept = req.dept || req.query.dept;

    const query = {
      collegeId: req.collegeId
    };

    if (dept) query.dept = dept;
    if (academicYearId) query.academicYearId = academicYearId;
    if (departmentId) query.departmentId = departmentId;
    if (courseId) query.courseId = courseId;
    if (semesterId) query.semesterId = semesterId;
    if (sectionId) query.sectionId = sectionId;
    if (subjectId) query.subjectId = subjectId;
    if (examType) query.examType = examType;
    if (status) query.status = status;

    const exams = await Exam.find(query)
      .populate('academicYearId', 'year')
      .populate('regulationId', 'name code')
      .populate('subjectId', 'subjectCode subjectName')
      .populate('invigilatorId', 'name email department')
      .sort({ date: 1, startTime: 1 });

    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET exam by ID
router.get('/:id', protect, collegeScope, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam slot not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new exam schedule
router.post('/', protect, authorize('Admin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user.tenantId || req.user.collegeId || 'unassigned_college';
    const exam = new Exam({
      ...req.body,

      name: req.body.name,
      examType: req.body.examType || 'Internal',

      academicYearId: req.body.academicYearId || null,
      regulationId: req.body.regulationId || null,

      departmentId: req.body.departmentId || '',
      dept: req.body.dept,

      courseId: req.body.courseId || '',

      semesterId: req.body.semesterId || '',
      sem: req.body.sem,

      sectionId: req.body.sectionId || '',
      section: req.body.section || '',

      subjectId: req.body.subjectId || null,
      subject: req.body.subject,

      date: req.body.date,

      startTime: req.body.startTime || req.body.time,
      endTime: req.body.endTime || '',
      time: req.body.startTime || req.body.time,

      hallName: req.body.hallName || req.body.room,
      room: req.body.hallName || req.body.room,
      hallCapacity: Number(req.body.hallCapacity) || 0,

      invigilatorId: req.body.invigilatorId || null,

      maxMarks: Number(req.body.maxMarks) || 100,
      passMarks: Number(req.body.passMarks) || 40,

      status: req.body.status || 'Scheduled',

      createdBy: req.user.name || 'Staff HOD',
      collegeId
    });
    
    const newExam = await exam.save();

    // Broadcast exam notification to Students, Staff, and Parents
    await sendNotification(req, {
      targetRoles: ['Student', 'Staff', 'Parent'],
      collegeId,
      tenantId: collegeId,
      title: 'New Exam Schedule Published',
      message: `Exam "${newExam.subject}" (${newExam.name}) for ${newExam.dept || 'department'} is scheduled for ${newExam.date} at ${newExam.time} in Room ${newExam.room}.`,
      category: 'system',
      type: 'Info'
    });

    req.app.get('io').emit('dataUpdated', { module: 'exams', action: 'created' });
    res.status(201).json(newExam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update exam schedule
router.put('/:id', protect, authorize('Admin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const updated = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        examType: req.body.examType || 'Internal',
        dept: req.body.dept,
        sem: req.body.sem,
        subject: req.body.subject,
        date: req.body.date,
        time: req.body.time,
        room: req.body.room,
        maxMarks: Number(req.body.maxMarks) || 100
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Exam slot not found' });
    
    const collegeId = updated.collegeId || req.collegeId || 'unassigned_college';
    await sendNotification(req, {
      targetRoles: ['Student', 'Staff', 'Parent'],
      collegeId,
      tenantId: collegeId,
      title: 'Exam Schedule Updated',
      message: `Exam "${updated.subject}" schedule has been updated to ${updated.date} at ${updated.time}.`,
      category: 'system',
      type: 'Info'
    });

    req.app.get('io').emit('dataUpdated', { module: 'exams', action: 'updated' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE exam schedule
router.delete('/:id', protect, authorize('Admin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const deleted = await Exam.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Exam slot not found' });
    req.app.get('io').emit('dataUpdated', { module: 'exams', action: 'deleted' });
    res.json({ message: 'Exam schedule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
