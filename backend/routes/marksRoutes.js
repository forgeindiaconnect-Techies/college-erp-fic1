import express from 'express';
import Mark from '../models/Mark.js';
import Student from '../models/Student.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const calculateGradeAndGPA = (internal, external) => {
  const pct = ((internal + external) / 150) * 100;
  
  if (internal < 20 || external < 35) return { grade: 'U', gpa: 0, status: 'Arrear' };

  if (pct >= 90) return { grade: 'O', gpa: 10, status: 'Pass' };
  if (pct >= 80) return { grade: 'A+', gpa: 9, status: 'Pass' };
  if (pct >= 70) return { grade: 'A', gpa: 8, status: 'Pass' };
  if (pct >= 60) return { grade: 'B+', gpa: 7, status: 'Pass' };
  if (pct >= 50) return { grade: 'B', gpa: 6, status: 'Pass' };
  return { grade: 'U', gpa: 0, status: 'Arrear' };
};

const updateStudentCGPA = async (studentId) => {
  try {
    const allMarks = await Mark.find({ studentId });
    if (allMarks.length === 0) return 0;
    
    let totalGpa = 0;
    allMarks.forEach(m => totalGpa += (m.gpa || 0));
    const cgpa = Number((totalGpa / allMarks.length).toFixed(2));
    
    // Update student's global CGPA
    await Student.findOneAndUpdate({ id: studentId }, { cgpa });
    
    // Update cgpa snapshot on all their marks
    await Mark.updateMany({ studentId }, { cgpa });
    
    return cgpa;
  } catch (err) {
    console.error('Failed to update CGPA:', err);
    return 0;
  }
};

const processMarkPayload = (data) => {
  const internal = Number(data.internalMarks) || 0;
  const semester = Number(data.semesterMarks) || 0;
  const totalMarks = internal + semester;
  const calculated = calculateGradeAndGPA(internal, semester);
  
  const grade = calculated.grade;
  const gpa = calculated.gpa;
  const arrearStatus = calculated.status;
  
  return {
    ...data,
    internalMarks: internal,
    semesterMarks: semester,
    totalMarks,
    grade,
    gpa,
    arrearStatus
  };
};

// Get all marks
router.get('/', protect, authorize('Admin', 'Principal', 'HOD', 'Staff'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = dept ? { department: dept } : {};
    const marks = await Mark.find(query).sort({ semester: 1 });
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
    const records = await Mark.find({ studentId: req.params.studentId }).sort({ semester: 1 });
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
            filter: {
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
        await updateStudentCGPA(id);
      }
      req.app.get('io').emit('dataUpdated', { module: 'marks', action: 'created' });
      return res.status(201).json({ message: 'Bulk marks saved' });
    } else {
      const mark = new Mark(processMarkPayload(req.body));
      const newRecord = await mark.save();
      await updateStudentCGPA(newRecord.studentId);
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
      await updateStudentCGPA(updatedRecord.studentId);
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
      await updateStudentCGPA(record.studentId);
    }
    req.app.get('io').emit('dataUpdated', { module: 'marks', action: 'deleted' });
    res.json({ message: 'Mark deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
