import express from 'express';
import Exam from '../models/Exam.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// GET all exams (HOD/Staff scoped by departmentScope, Admin/Principal can view all or filter)
router.get('/', protect, authorize('Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent', 'Super Admin'), collegeScope, departmentScope, async (req, res) => {
  try {
    const {
      academicYearId,
      departmentId,
      courseId,
      semesterId,
      sectionId,
      subjectId,
      examType,
      status,
      invigilatorId,
      invigilator
    } = req.query;

    const dept = req.dept || req.query.dept;
    const targetCollegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;

    const query = {};
    if (req.user?.role !== 'Super Admin' && targetCollegeId && targetCollegeId !== 'system') {
      query.$or = [
        { collegeId: targetCollegeId },
        { tenantId: targetCollegeId },
        { collegeId: 'unassigned_college' },
        { tenantId: 'unassigned_college' },
        { collegeId: 'mock_college_id' },
        { collegeId: { $exists: false } },
        { collegeId: null }
      ];
    }

    if (dept && dept !== 'all' && dept !== 'All') query.dept = dept;
    if (academicYearId) query.academicYearId = academicYearId;
    if (departmentId) query.departmentId = departmentId;
    if (courseId) query.courseId = courseId;
    if (semesterId) query.semesterId = semesterId;
    if (sectionId) query.sectionId = sectionId;
    if (subjectId) query.subjectId = subjectId;
    if (examType) query.examType = examType;
    if (status) query.status = status;

    if (invigilatorId || invigilator) {
      const invigVal = invigilatorId || invigilator;
      const invigFilter = [
        { invigilatorId: invigVal },
        { invigilator: new RegExp(invigVal.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') },
        { invigilatorName: new RegExp(invigVal.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: invigFilter }];
        delete query.$or;
      } else {
        query.$or = invigFilter;
      }
    }

    const exams = await Exam.find(query)
      .populate('academicYearId', 'year')
      .populate('regulationId', 'name code')
      .populate('subjectId', 'subjectCode subjectName name code')
      .populate('invigilatorId', 'name email department employeeId')
      .sort({ date: 1, startTime: 1 });

    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET exam by ID
router.get('/:id', protect, collegeScope, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('academicYearId', 'year')
      .populate('regulationId', 'name code')
      .populate('subjectId', 'subjectCode subjectName name code')
      .populate('invigilatorId', 'name email department employeeId');
    if (!exam) return res.status(404).json({ message: 'Exam slot not found' });
    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new exam schedule
router.post('/', protect, authorize('Admin', 'HOD', 'Principal', 'Super Admin'), collegeScope, async (req, res) => {
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
      invigilator: req.body.invigilator || req.body.invigilatorName || '',
      invigilatorName: req.body.invigilatorName || req.body.invigilator || '',

      maxMarks: Number(req.body.maxMarks) || 100,
      passMarks: Number(req.body.passMarks) || 40,

      status: req.body.status || 'Scheduled',

      createdBy: req.user.name || 'Staff HOD',
      collegeId,
      tenantId: collegeId
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

    req.app.get('io')?.emit('dataUpdated', { module: 'exams', action: 'created' });
    res.status(201).json(newExam);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update exam schedule
router.put('/:id', protect, authorize('Admin', 'HOD', 'Principal', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      examType: req.body.examType || 'Internal',
      dept: req.body.dept,
      sem: req.body.sem,
      subject: req.body.subject,
      date: req.body.date,
      time: req.body.startTime || req.body.time,
      startTime: req.body.startTime || req.body.time,
      endTime: req.body.endTime || '',
      room: req.body.hallName || req.body.room,
      hallName: req.body.hallName || req.body.room,
      hallCapacity: Number(req.body.hallCapacity) || 0,
      invigilatorId: req.body.invigilatorId || null,
      invigilator: req.body.invigilator || req.body.invigilatorName || '',
      invigilatorName: req.body.invigilatorName || req.body.invigilator || '',
      maxMarks: Number(req.body.maxMarks) || 100,
      passMarks: Number(req.body.passMarks) || 40,
      status: req.body.status || 'Scheduled',
      section: req.body.section || '',
      sectionId: req.body.sectionId || '',
      courseId: req.body.courseId || '',
      departmentId: req.body.departmentId || '',
      semesterId: req.body.semesterId || '',
      academicYearId: req.body.academicYearId || null,
      regulationId: req.body.regulationId || null,
      subjectId: req.body.subjectId || null
    };

    const targetCollegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { _id: req.params.id };
    if (req.user?.role !== 'Super Admin' && targetCollegeId && targetCollegeId !== 'system') {
      filter.$or = [{ collegeId: targetCollegeId }, { tenantId: targetCollegeId }];
    }

    const updated = await Exam.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Exam slot not found' });
    
    const collegeId = updated.collegeId || targetCollegeId || 'unassigned_college';
    await sendNotification(req, {
      targetRoles: ['Student', 'Staff', 'Parent'],
      collegeId,
      tenantId: collegeId,
      title: 'Exam Schedule Updated',
      message: `Exam "${updated.subject}" schedule has been updated to ${updated.date} at ${updated.time}.`,
      category: 'system',
      type: 'Info'
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'exams', action: 'updated' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE exam schedule
router.delete('/:id', protect, authorize('Admin', 'HOD', 'Principal', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const targetCollegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = { _id: req.params.id };
    if (req.user?.role !== 'Super Admin' && targetCollegeId && targetCollegeId !== 'system') {
      filter.$or = [{ collegeId: targetCollegeId }, { tenantId: targetCollegeId }];
    }

    const deleted = await Exam.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'Exam slot not found' });
    req.app.get('io')?.emit('dataUpdated', { module: 'exams', action: 'deleted' });
    res.json({ message: 'Exam schedule deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
