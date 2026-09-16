import express from 'express';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import User from '../models/User.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

const processFeePayload = (data) => {
  const total = Number(data.totalFees) || 0;
  const paid = Number(data.paidAmount) || 0;
  const pending = total - paid;
  
  let status = 'Pending';
  if (paid >= total && total > 0) status = 'Paid';
  else if (paid > 0 && paid < total) status = 'Partial';
  
  return {
    ...data,
    totalFees: total,
    paidAmount: paid,
    pendingAmount: pending,
    status
  };
};

const updateStudentFeeStatus = async (studentId) => {
  try {
    const fees = await Fee.find({ studentId });
    if (fees.length === 0) return;
    
    // Calculate global status for student based on all their fees
    let globalStatus = 'Paid'; // assume paid unless pending/partial found
    for (const f of fees) {
      if (f.status === 'Pending') {
        globalStatus = 'Pending';
        break; // Pending takes highest severity
      }
      if (f.status === 'Partial') {
        globalStatus = 'Partial';
      }
    }
    
    await Student.findOneAndUpdate({ id: studentId }, { feeStatus: globalStatus });
  } catch (err) {
    console.error('Failed to update student fee status:', err);
  }
};

// Helper to notify student & parent of fee updates
const notifyFeeUpdate = async (req, feeRecord) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || 'unassigned_college';
    const studentUser = await User.findOne({ referenceId: feeRecord.studentId });
    if (studentUser) {
      await sendNotification(req, {
        receiverId: studentUser._id,
        collegeId,
        tenantId: collegeId,
        title: 'Fee Transaction Update',
        message: `Fee payment update recorded: ₹${feeRecord.paidAmount || 0} paid (${feeRecord.status}). Pending: ₹${feeRecord.pendingAmount || 0}.`,
        category: 'system',
        type: feeRecord.status === 'Paid' ? 'Success' : 'Info'
      });
    }
  } catch (e) {
    console.error('Failed to send fee notification:', e);
  }
};

// Fee Structure routes for College Multi-tenancy
// Get fee structures for college
router.get('/structures', protect, authorize('Admin', 'Principal', 'Accounts', 'HOD', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    if (!collegeId) {
      return res.status(400).json({ message: 'College ID is required' });
    }
    const { academicYear, course, department, semester } = req.query;
    const filter = { collegeId };
    if (academicYear) filter.academicYear = academicYear;
    if (course) filter.course = course;
    if (department) filter.department = department;
    if (semester !== undefined && semester !== '') filter.semester = Number(semester);

    const structures = await FeeStructure.find(filter).sort({ createdAt: -1 });
    res.json(structures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create or update (upsert) fee structure
router.post('/structures', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    if (!collegeId) {
      return res.status(400).json({ message: 'College ID is required' });
    }
    const { academicYear, course, department, semester, fees } = req.body;

    if (!academicYear || !course || !department || semester === undefined || !fees || !Array.isArray(fees)) {
      return res.status(400).json({ message: 'All fields (academicYear, course, department, semester, fees) are required.' });
    }

    const totalAmount = fees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const feeStructure = await FeeStructure.findOneAndUpdate(
      {
        collegeId,
        academicYear,
        course,
        department,
        semester: Number(semester),
      },
      {
        collegeId,
        academicYear,
        course,
        department,
        semester: Number(semester),
        fees: fees.map(f => ({ feeType: f.feeType, amount: Number(f.amount) || 0 })),
        totalAmount,
      },
      { upsert: true, new: true, runValidators: true }
    );

    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'saved' });
    res.status(200).json(feeStructure);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete fee structure
router.delete('/structures/:id', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const structure = await FeeStructure.findOneAndDelete({ _id: req.params.id, collegeId });
    if (!structure) {
      return res.status(404).json({ message: 'Fee structure not found' });
    }
    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'deleted' });
    res.json({ message: 'Fee structure deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all fees
router.get('/', protect, authorize('Admin', 'Principal', 'Accounts', 'HOD'), departmentScope, collegeScope, async (req, res) => {
  try {
    const dept = req.dept || req.query.dept;
    const query = dept ? { department: dept } : {};
    const fees = await Fee.find(query).sort({ createdAt: -1 });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get fees for a specific student
router.get('/student/:studentId', protect, collegeScope, async (req, res) => {
  try {
    if ((req.user.role === 'Student' || req.user.role === 'Parent') && req.user.referenceId !== req.params.studentId) {
      return res.status(403).json({ message: 'Unauthorized to view this record' });
    }
    const fees = await Fee.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get fee structure for a specific student
router.get('/structure/:studentId', protect, collegeScope, async (req, res) => {
  try {
    const student = await Student.findOne({ id: req.params.studentId }) || await Student.findById(req.params.studentId);
    let structure = null;

    if (student) {
      // 1. If student already has stored feeBreakdown from admission registration
      if (student.feeBreakdown && Object.keys(student.feeBreakdown).length > 0) {
        structure = {
          studentId: student.id || student._id,
          tuitionFee: Number(student.feeBreakdown.tuitionFee) || 0,
          admissionFee: Number(student.feeBreakdown.admissionFee) || 0,
          universityFee: Number(student.feeBreakdown.universityFee) || 0,
          marksheetVerification: Number(student.feeBreakdown.marksheetVerification) || 0,
          specialFee: Number(student.feeBreakdown.specialFee) || 0,
          englishLabNssId: Number(student.feeBreakdown.englishLabNssId) || 0,
          computerLab: Number(student.feeBreakdown.computerLab) || 0,
          stationary: Number(student.feeBreakdown.stationary) || 0,
          pta: Number(student.feeBreakdown.pta) || 0,
          examFee: Number(student.feeBreakdown.examFee) || 0,
          libraryFee: Number(student.feeBreakdown.libraryFee) || 0,
          otherFee: Number(student.feeBreakdown.otherFee) || 0,
          hostelFee: student.hostelFeeAmount || (student.hostelRequired === 'yes' || student.hostelRequired === 'Yes' || student.dormFacility ? 40000 : 0),
          transportFee: student.transportFeeAmount || (student.transportRequired === 'yes' || student.transportRequired === 'Yes' || student.busFacility ? 15000 : 0),
          totalAmount: Number(student.totalFee) || 0
        };
      } else {
        // 2. Search configured FeeStructure
        const deptName = student.department || student.dept || '';
        const courseName = student.course || '';
        const semNum = Number(student.semester) || 1;
        const matched = await FeeStructure.findOne({
          collegeId: student.collegeId || req.collegeId,
          department: new RegExp(`^${deptName}$`, 'i'),
          course: new RegExp(`^${courseName}$`, 'i')
        });

        if (matched && matched.fees && matched.fees.length > 0) {
          const mapped = {};
          matched.fees.forEach(f => {
            const fType = (f.feeType || '').toLowerCase();
            if (fType.includes('tuition')) mapped.tuitionFee = Number(f.amount) || 0;
            else if (fType.includes('admission')) mapped.admissionFee = Number(f.amount) || 0;
            else if (fType.includes('univ') || fType.includes('exam')) mapped.universityFee = Number(f.amount) || 0;
            else if (fType.includes('hostel')) mapped.hostelFee = Number(f.amount) || 0;
            else if (fType.includes('transport')) mapped.transportFee = Number(f.amount) || 0;
            else mapped.otherFee = (mapped.otherFee || 0) + (Number(f.amount) || 0);
          });
          structure = {
            studentId: student.id,
            ...mapped,
            totalAmount: matched.totalAmount || Object.values(mapped).reduce((a, b) => a + b, 0)
          };
        } else {
          // 3. Fallback based on real Department
          const dLower = String(deptName).toLowerCase();
          if (dLower.includes('computer') || dLower.includes('cse') || dLower.includes('tech') || dLower.includes('engineering')) {
            structure = {
              studentId: student.id,
              tuitionFee: 35000,
              admissionFee: 5000,
              universityFee: 2500,
              specialFee: 5000,
              computerLab: 4000,
              stationary: 1500,
              pta: 1000,
              otherFee: 1500
            };
          } else if (dLower.includes('food') || dLower.includes('nutrition') || dLower.includes('science') || dLower.includes('math')) {
            structure = {
              studentId: student.id,
              tuitionFee: 22000,
              admissionFee: 3500,
              universityFee: 2000,
              specialFee: 3500,
              computerLab: 3000,
              stationary: 1000,
              pta: 1000,
              otherFee: 1000
            };
          } else {
            // Arts / History / Tamil / General
            structure = {
              studentId: student.id,
              tuitionFee: 15000,
              admissionFee: 2500,
              universityFee: 1500,
              specialFee: 2000,
              computerLab: 1000,
              stationary: 1000,
              pta: 500,
              otherFee: 1000
            };
          }
        }
      }
    }

    res.json(structure || { tuitionFee: 15000, admissionFee: 2500, universityFee: 1500 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record new fee transaction
router.post('/', protect, authorize('Admin', 'Principal', 'Accounts', 'Student'), collegeScope, async (req, res) => {
  try {
    if (Array.isArray(req.body)) {
      const processed = req.body.map(processFeePayload);
      const newRecords = await Fee.insertMany(processed);
      
      const studentIds = [...new Set(newRecords.map(r => r.studentId))];
      for (const id of studentIds) {
        await updateStudentFeeStatus(id);
      }
      for (const record of newRecords) {
        await notifyFeeUpdate(req, record);
      }
      req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'created' });
      return res.status(201).json(newRecords);
    } else {
      const fee = new Fee(processFeePayload(req.body));
      const newRecord = await fee.save();
      await updateStudentFeeStatus(newRecord.studentId);
      await notifyFeeUpdate(req, newRecord);
      req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'created' });
      return res.status(201).json(newRecord);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update fee status (e.g. Pending -> Paid)
router.put('/:id', protect, authorize('Admin', 'Principal', 'Accounts', 'Student'), collegeScope, async (req, res) => {
  try {
    const updatedFee = await Fee.findByIdAndUpdate(
      req.params.id, 
      processFeePayload(req.body), 
      { new: true }
    );
    if (updatedFee) {
      await updateStudentFeeStatus(updatedFee.studentId);
      await notifyFeeUpdate(req, updatedFee);
    }
    req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'updated' });
    res.json(updatedFee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete fee record
router.delete('/:id', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const record = await Fee.findById(req.params.id);
    if (record) {
      await Fee.findByIdAndDelete(req.params.id);
      await updateStudentFeeStatus(record.studentId);
    }
    req.app.get('io').emit('dataUpdated', { module: 'fees', action: 'deleted' });
    res.json({ message: 'Fee record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
