import express from 'express';
import Mark from '../models/Mark.js';
import Student from '../models/Student.js';
import Exam from '../models/Exam.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const calculateGradeAndGPA = (obtained, maximum, passed) => {
  const percentage = maximum > 0
    ? (obtained / maximum) * 100
    : 0;

  if (!passed) {
    return { grade: 'U', gpa: 0, status: 'Arrear' };
  }

  if (percentage >= 90) return { grade: 'O', gpa: 10, status: 'Pass' };
  if (percentage >= 80) return { grade: 'A+', gpa: 9, status: 'Pass' };
  if (percentage >= 70) return { grade: 'A', gpa: 8, status: 'Pass' };
  if (percentage >= 60) return { grade: 'B+', gpa: 7, status: 'Pass' };
  if (percentage >= 50) return { grade: 'B', gpa: 6, status: 'Pass' };

  return { grade: 'C', gpa: 5, status: 'Pass' };
};

const updateStudentCGPA = async (studentId, collegeId) => {
  try {
    const markQuery = {
      studentId,
      resultStatus: 'Published'
    };

    if (collegeId) {
      markQuery.collegeId = collegeId;
    }

    const allMarks = await Mark.find(markQuery);

    if (allMarks.length === 0) {
      return 0;
    }

    const examIds = allMarks
      .map(mark => mark.examId)
      .filter(Boolean);

    const exams = await Exam.find({
      _id: { $in: examIds }
    }).lean();

    const examMap = new Map(
      exams.map(exam => [String(exam._id), exam])
    );

    const subjectGroups = {};

    allMarks.forEach(mark => {
      const key = `${mark.semester}::${mark.subject}`;

      if (!subjectGroups[key]) {
        subjectGroups[key] = {
          internalPercentages: [],
          externalPercentages: []
        };
      }

      const exam = examMap.get(String(mark.examId));
      const examName = String(exam?.name || '').toLowerCase();

      const obtained = Number(
        mark.marksObtained ?? mark.totalMarks ?? 0
      );

      const maximum = Number(mark.maxMarks || exam?.maxMarks || 100);

      const percentage =
        maximum > 0 ? (obtained / maximum) * 100 : 0;

      const isExternal =
        examName.includes('end semester') ||
        examName.includes('university semester') ||
        examName.includes('external');

      if (isExternal) {
        subjectGroups[key].externalPercentages.push(percentage);
      } else {
        subjectGroups[key].internalPercentages.push(percentage);
      }
    });

    const completedSubjectGpas = [];

    Object.values(subjectGroups).forEach(group => {
      if (
        group.internalPercentages.length === 0 ||
        group.externalPercentages.length === 0
      ) {
        return;
      }

      const internalPercentage =
        group.internalPercentages.reduce(
          (sum, value) => sum + value,
          0
        ) / group.internalPercentages.length;

      const externalPercentage =
        group.externalPercentages.reduce(
          (sum, value) => sum + value,
          0
        ) / group.externalPercentages.length;

      const internalContribution =
        (internalPercentage / 100) * 40;

      const externalContribution =
        (externalPercentage / 100) * 60;

      const finalScore =
        internalContribution + externalContribution;

      const passed =
        internalPercentage >= 40 &&
        externalPercentage >= 40 &&
        finalScore >= 50;

      const result = calculateGradeAndGPA(
        finalScore,
        100,
        passed
      );

      completedSubjectGpas.push(result.gpa);
    });

    const cgpa = completedSubjectGpas.length
      ? Number(
          (
            completedSubjectGpas.reduce(
              (sum, gpa) => sum + gpa,
              0
            ) / completedSubjectGpas.length
          ).toFixed(2)
        )
      : 0;

    const studentQuery = { id: studentId };

    if (collegeId) {
      studentQuery.collegeId = collegeId;
    }

    await Student.findOneAndUpdate(studentQuery, { cgpa });

    await Mark.updateMany(markQuery, { cgpa });

    return cgpa;
  } catch (err) {
    console.error('Failed to update CGPA:', err);
    return 0;
  }
};

const processMarkPayload = (data) => {
  const internalMarks = Number(data.internalMarks) || 0;
  const semesterMarks = Number(data.semesterMarks) || 0;

  const isExamBased =
    data.marksObtained !== undefined &&
    data.marksObtained !== '';

  const marksObtained = isExamBased
    ? Number(data.marksObtained)
    : internalMarks + semesterMarks;

  const maxMarks = isExamBased
    ? Number(data.maxMarks) || 100
    : 150;

  const passMarks = isExamBased
    ? Number(data.passMarks) || Math.ceil(maxMarks * 0.4)
    : 55;

  const passed = isExamBased
    ? marksObtained >= passMarks
    : internalMarks >= 20 && semesterMarks >= 35;

  const calculated = calculateGradeAndGPA(
    marksObtained,
    maxMarks,
    passed
  );

  return {
    ...data,
    internalMarks,
    semesterMarks,
    marksObtained,
    totalMarks: marksObtained,
    maxMarks,
    passMarks,
    grade: calculated.grade,
    gpa: calculated.gpa,
    arrearStatus: calculated.status
  };
};

// Get all marks
router.get('/', protect, authorize('Admin', 'Principal', 'HOD', 'Staff'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = { collegeId: req.collegeId };
    if (dept) query.department = dept;

    const marks = await Mark.find(query)
      .populate('examId')
      .sort({ semester: 1, subject: 1 });
    res.json(marks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get marks for a specific student
router.get('/student/:studentId', protect, collegeScope, async (req, res) => {
  try {
    if ((req.user.role === 'Student' || req.user.role === 'Parent') && req.user.referenceId !== req.params.studentId) {
      return res.status(403).json({ message: 'Unauthorized to view this record' });
    }
    const records = await Mark.find({
      studentId: req.params.studentId,
      collegeId: req.collegeId,
      resultStatus: 'Published'
    })
      .populate('examId')
      .sort({ semester: 1, subject: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record new mark (Single or Bulk)
router.post('/', protect, authorize('Admin', 'Principal', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      const processed = req.body.map(processMarkPayload);
      
      const bulkOps = processed.map(record => {
        const collegeIdToSave = req.collegeId || 'unassigned_college';
        record.collegeId = collegeIdToSave;
        return {
          updateOne: {
            filter: record.examId
              ? {
                  studentId: record.studentId,
                  examId: record.examId,
                  collegeId: collegeIdToSave
                }
              : {
                  studentId: record.studentId,
                  semester: record.semester,
                  subject: record.subject,
                  collegeId: collegeIdToSave
                },
            update: { $set: record },
            upsert: true
          }
        };
      });
      
      await Mark.bulkWrite(bulkOps);
      
      const studentIds = [...new Set(processed.map(r => r.studentId))];
      for (const id of studentIds) {
        await updateStudentCGPA(id, req.collegeId);
      }
      req.app.get('io').emit('dataUpdated', { module: 'marks', action: 'created' });
      return res.status(201).json({ message: 'Bulk marks saved' });
    } else {
      const mark = new Mark(processMarkPayload(req.body));
      const newRecord = await mark.save();
      await updateStudentCGPA(newRecord.studentId, req.collegeId);
      req.app.get('io').emit('dataUpdated', { module: 'marks', action: 'created' });
      return res.status(201).json(newRecord);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update mark
router.put('/:id', protect, authorize('Admin', 'Principal', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    const updatedRecord = await Mark.findByIdAndUpdate(
      req.params.id, 
      processMarkPayload(req.body), 
      { new: true }
    );
    if (updatedRecord) {
      await updateStudentCGPA(updatedRecord.studentId, req.collegeId);
    }
    req.app.get('io').emit('dataUpdated', { module: 'marks', action: 'updated' });
    res.json(updatedRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete mark
router.delete('/:id', protect, authorize('Admin', 'Principal', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    const record = await Mark.findById(req.params.id);
    if (record) {
      await Mark.findByIdAndDelete(req.params.id);
      await updateStudentCGPA(record.studentId, req.collegeId);
    }
    req.app.get('io').emit('dataUpdated', { module: 'marks', action: 'deleted' });
    res.json({ message: 'Mark deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
