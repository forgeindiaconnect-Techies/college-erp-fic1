import express from 'express';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import FeePlan from '../models/FeePlan.js';
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
    
    let totalPaid = 0;
    let hasPending = false;
    let hasPartial = false;

    for (const f of fees) {
      totalPaid += Number(f.paidAmount) || 0;
      if (f.status === 'Pending') hasPending = true;
      if (f.status === 'Partial') hasPartial = true;
    }
    
    let globalStatus = 'Paid';
    if (hasPending) globalStatus = 'Pending';
    else if (hasPartial) globalStatus = 'Partial';
    
    const student = await Student.findOne({ $or: [{ id: studentId }, { _id: studentId }] });
    if (student) {
      const studentTotalFee = Number(student.totalFee || student.totalAmount) || 0;
      const newPaid = totalPaid;
      const newBal = Math.max(0, studentTotalFee - newPaid);
      const computedStatus = (newBal === 0 && studentTotalFee > 0) ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending');

      await Student.findOneAndUpdate(
        { $or: [{ id: studentId }, { _id: studentId }] },
        { 
          feeStatus: computedStatus,
          amountPaid: newPaid,
          paidAmount: newPaid,
          balanceFee: newBal,
          remainingFee: newBal,
          paymentStatus: computedStatus
        }
      );
    } else {
      await Student.findOneAndUpdate({ id: studentId }, { feeStatus: globalStatus });
    }
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
// Get fee structures for college (combines FeeStructure & FeePlan)
router.get('/structures', protect, authorize('Admin', 'Principal', 'Accounts', 'HOD', 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'unassigned_college';
    const { academicYear, course, department, semester } = req.query;

    const collegeMatch = {
      $or: [
        { collegeId },
        { collegeId: 'COL002-8379189' },
        { collegeId: 'COL001' },
        { collegeId: 'mock_college_id' },
        { collegeId: 'unassigned_college' },
        { collegeId: null },
        { collegeId: { $exists: false } }
      ]
    };

    const filter = { ...collegeMatch };
    if (academicYear) filter.academicYear = academicYear;
    if (course) filter.course = new RegExp(`^${course.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
    if (department) filter.department = new RegExp(`^${department.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
    if (semester !== undefined && semester !== '') filter.semester = Number(semester);

    const [structures, plans] = await Promise.all([
      FeeStructure.find(filter).sort({ createdAt: -1 }),
      FeePlan.find(collegeMatch).sort({ createdAt: -1 })
    ]);

    const allStructuresMap = new Map();

    // 1. Process FeePlan records FIRST (highest fidelity from Admin)
    plans.forEach(p => {
      const courseStr = String(p.courseName || p.courseId || '').trim();
      const deptStr = String(p.departmentName || p.departmentId || '').trim();
      if (!courseStr && !deptStr) return; // Skip empty

      const semNum = typeof p.semester === 'number' ? p.semester : (parseInt(String(p.semester).replace(/\D/g, '')) || 1);
      const yearStr = p.academicYear || '2026-2027';
      const key = `${yearStr}__${deptStr.toLowerCase()}__${courseStr.toLowerCase()}__${semNum}`;

      const planFees = [
        { feeType: 'Tuition Fee', amount: Number(p.tuitionFee) || 0 },
        { feeType: 'Exam Fee', amount: Number(p.examFee) || 0 },
        { feeType: 'Lab Fee', amount: Number(p.labFee) || 0 },
        { feeType: 'Library Fee', amount: Number(p.libraryFee) || 0 },
        { feeType: 'Transport Fee', amount: Number(p.transportFee) || 0 },
        { feeType: 'Hostel Fee', amount: Number(p.hostelFee) || 0 }
      ].filter(f => f.amount > 0);

      const total = planFees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      allStructuresMap.set(key, {
        _id: p._id,
        collegeId: p.collegeId,
        academicYear: yearStr,
        course: courseStr,
        courseName: courseStr,
        department: deptStr,
        departmentName: deptStr,
        semester: semNum,
        fees: planFees,
        totalAmount: total,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      });
    });

    // 2. Process FeeStructure records
    structures.forEach(s => {
      const courseStr = String(s.course || s.courseName || '').trim();
      const deptStr = String(s.department || s.departmentName || '').trim();
      if (!courseStr && !deptStr) return; // Skip legacy/empty records

      const semNum = typeof s.semester === 'number' ? s.semester : (parseInt(String(s.semester).replace(/\D/g, '')) || 1);
      const yearStr = s.academicYear || '2026-2027';
      const key = `${yearStr}__${deptStr.toLowerCase()}__${courseStr.toLowerCase()}__${semNum}`;

      const validFees = Array.isArray(s.fees) && s.fees.length > 0
        ? s.fees.map(f => ({ feeType: f.feeType, amount: Number(f.amount) || 0 }))
        : [];
      const total = s.totalAmount || validFees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      // Only add if not already populated from FeePlan or if FeeStructure has more fees
      if (!allStructuresMap.has(key)) {
        allStructuresMap.set(key, {
          _id: s._id,
          collegeId: s.collegeId,
          academicYear: yearStr,
          course: courseStr,
          courseName: courseStr,
          department: deptStr,
          departmentName: deptStr,
          semester: semNum,
          fees: validFees,
          totalAmount: total,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        });
      }
    });

    const mergedList = Array.from(allStructuresMap.values());
    res.json(mergedList);
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
    const semNumber = Number(semester);

    const feeStructure = await FeeStructure.findOneAndUpdate(
      {
        collegeId,
        academicYear,
        course,
        department,
        semester: semNumber,
      },
      {
        collegeId,
        academicYear,
        course,
        department,
        semester: semNumber,
        fees: fees.map(f => ({ feeType: f.feeType, amount: Number(f.amount) || 0 })),
        totalAmount,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Also sync to FeePlan
    try {
      const tuitionItem = fees.find(f => (f.feeType || '').toLowerCase().includes('tuition'));
      const examItem = fees.find(f => (f.feeType || '').toLowerCase().includes('exam'));
      const labItem = fees.find(f => (f.feeType || '').toLowerCase().includes('lab'));
      const libItem = fees.find(f => (f.feeType || '').toLowerCase().includes('lib'));
      const transItem = fees.find(f => (f.feeType || '').toLowerCase().includes('transport'));
      const hostelItem = fees.find(f => (f.feeType || '').toLowerCase().includes('hostel'));

      await FeePlan.findOneAndUpdate(
        {
          collegeId,
          academicYear,
          courseName: course,
          departmentName: department,
          semester: `Sem ${semNumber}`
        },
        {
          collegeId,
          academicYear,
          courseId: course,
          courseName: course,
          departmentId: department,
          departmentName: department,
          semester: `Sem ${semNumber}`,
          tuitionFee: Number(tuitionItem?.amount) || 0,
          examFee: Number(examItem?.amount) || 0,
          labFee: Number(labItem?.amount) || 0,
          libraryFee: Number(libItem?.amount) || 0,
          transportFee: Number(transItem?.amount) || 0,
          hostelFee: Number(hostelItem?.amount) || 0
        },
        { upsert: true, new: true }
      );
    } catch (planErr) {
      console.error('Failed to sync to FeePlan:', planErr);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'saved' });
    req.app.get('io')?.emit('dataUpdated', { module: 'feePlans', action: 'saved' });
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
      // Try finding and deleting from FeePlan if id matches FeePlan
      const plan = await FeePlan.findOneAndDelete({ _id: req.params.id, collegeId });
      if (plan) {
        req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'deleted' });
        req.app.get('io')?.emit('dataUpdated', { module: 'feePlans', action: 'deleted' });
        return res.json({ message: 'Fee structure deleted successfully' });
      }
      return res.status(404).json({ message: 'Fee structure not found' });
    }
    
    // Also remove matching FeePlan
    await FeePlan.findOneAndDelete({
      collegeId,
      courseName: structure.course,
      departmentName: structure.department
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'deleted' });
    req.app.get('io')?.emit('dataUpdated', { module: 'feePlans', action: 'deleted' });
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
        // 2. Search configured FeeStructure OR FeePlan
        const deptName = student.department || student.dept || '';
        const courseName = student.course || '';
        const semNum = Number(student.semester) || 1;
        const collegeId = student.collegeId || req.collegeId;

        const [matchedStructure, matchedPlan] = await Promise.all([
          FeeStructure.findOne({
            collegeId,
            department: new RegExp(`^${deptName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i'),
            course: new RegExp(`^${courseName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
          }),
          FeePlan.findOne({
            collegeId,
            $or: [
              { departmentName: new RegExp(`^${deptName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
              { departmentId: deptName }
            ]
          })
        ]);

        if (matchedStructure && matchedStructure.fees && matchedStructure.fees.length > 0) {
          const mapped = {};
          matchedStructure.fees.forEach(f => {
            const fType = (f.feeType || '').toLowerCase();
            if (fType.includes('tuition')) mapped.tuitionFee = Number(f.amount) || 0;
            else if (fType.includes('admission')) mapped.admissionFee = Number(f.amount) || 0;
            else if (fType.includes('univ') || fType.includes('exam')) mapped.examFee = Number(f.amount) || 0;
            else if (fType.includes('lab') || fType.includes('computer')) mapped.computerLab = Number(f.amount) || 0;
            else if (fType.includes('lib')) mapped.libraryFee = Number(f.amount) || 0;
            else if (fType.includes('hostel')) mapped.hostelFee = Number(f.amount) || 0;
            else if (fType.includes('transport')) mapped.transportFee = Number(f.amount) || 0;
            else mapped.otherFee = (mapped.otherFee || 0) + (Number(f.amount) || 0);
          });
          structure = {
            studentId: student.id,
            ...mapped,
            totalAmount: matchedStructure.totalAmount || Object.values(mapped).reduce((a, b) => a + b, 0)
          };
        } else if (matchedPlan) {
          structure = {
            studentId: student.id,
            tuitionFee: Number(matchedPlan.tuitionFee) || 0,
            examFee: Number(matchedPlan.examFee) || 0,
            computerLab: Number(matchedPlan.labFee) || 0,
            libraryFee: Number(matchedPlan.libraryFee) || 0,
            transportFee: Number(matchedPlan.transportFee) || 0,
            hostelFee: Number(matchedPlan.hostelFee) || 0,
            totalAmount: (Number(matchedPlan.tuitionFee) || 0) +
                         (Number(matchedPlan.examFee) || 0) +
                         (Number(matchedPlan.labFee) || 0) +
                         (Number(matchedPlan.libraryFee) || 0) +
                         (Number(matchedPlan.transportFee) || 0) +
                         (Number(matchedPlan.hostelFee) || 0)
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
