import express from 'express';
import mongoose from 'mongoose';
import Fee from '../models/Fee.js';
import Student from '../models/Student.js';
import FeeStructure from '../models/FeeStructure.js';
import FeePlan from '../models/FeePlan.js';
import User from '../models/User.js';
import { protect, authorize, departmentScope, collegeScope } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

const processFeePayload = (data) => {
  const total = Number(data.totalFees !== undefined ? data.totalFees : (data.totalAmount || data.amount || 0)) || 0;
  const paid = Number(data.paidAmount !== undefined ? data.paidAmount : (data.amount || 0)) || 0;
  const pending = Math.max(0, total - paid);
  
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

const updateStudentFeeStatus = async (studentId, collegeId = null) => {
  try {
    if (!studentId) return;
    const isValidObjId = mongoose.Types.ObjectId.isValid(studentId);
    
    // Query all fee transactions for this student
    const feeFilter = [
      { studentId: studentId },
      { studentId: String(studentId) },
      { registerNo: studentId }
    ];
    if (isValidObjId) {
      feeFilter.push({ studentId: new mongoose.Types.ObjectId(studentId) });
    }

    let feeQuery = { $or: feeFilter };
    if (collegeId && collegeId !== 'system') {
      feeQuery = {
        $and: [
          { $or: feeFilter },
          { $or: [{ collegeId }, { tenantId: collegeId }] }
        ]
      };
    }

    const fees = await Fee.find(feeQuery);
    
    let totalPaidFromReceipts = 0;
    for (const f of fees) {
      totalPaidFromReceipts += Number(f.paidAmount !== undefined ? f.paidAmount : (f.amount || 0)) || 0;
    }
    
    const studentFilter = [
      { id: studentId },
      { admissionNo: studentId }
    ];
    if (isValidObjId) {
      studentFilter.push({ _id: studentId });
    }

    let studentQuery = { $or: studentFilter };
    if (collegeId && collegeId !== 'system') {
      studentQuery = {
        $and: [
          { $or: studentFilter },
          { $or: [{ collegeId }, { tenantId: collegeId }] }
        ]
      };
    }

    const student = await Student.findOne(studentQuery);
    if (student) {
      const studentTotalFee = Number(
        student.finalFee !== undefined && Number(student.finalFee) > 0
          ? student.finalFee
          : (student.totalFee || student.totalAmount || 0)
      );
      
      const newPaid = totalPaidFromReceipts > 0 ? totalPaidFromReceipts : Number(student.paidAmount || student.amountPaid || 0);
      const newBal = Math.max(0, studentTotalFee - newPaid);
      const computedStatus = (newBal === 0 && studentTotalFee > 0) ? 'Paid' : (newPaid > 0 ? 'Partial' : 'Pending');

      await Student.updateOne(
        { _id: student._id },
        { 
          feeStatus: computedStatus,
          amountPaid: newPaid,
          paidAmount: newPaid,
          balanceFee: newBal,
          remainingFee: newBal,
          paymentStatus: computedStatus
        }
      );
    }
  } catch (err) {
    console.error('Failed to update student fee status:', err);
  }
};

// Helper to notify student & parent of fee updates
const notifyFeeUpdate = async (req, feeRecord) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'unassigned_college';

    const userQuery = {
      referenceId: feeRecord.studentId
    };

    if (collegeId && collegeId !== 'system') {
      userQuery.$or = [
        { collegeId },
        { tenantId: collegeId }
      ];
    }

    const studentUser = await User.findOne(userQuery);

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
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const { academicYear, course, department, semester } = req.query;

    const collegeMatch = {};
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      collegeMatch.$or = [
        { collegeId },
        { tenantId: collegeId }
      ];
    }

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
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const query = {};
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      query.$or = [{ collegeId }, { tenantId: collegeId }];
    }
    if (dept) {
      const deptFilter = { department: dept };
      if (query.$or) query.$and = [{ $or: query.$or }, deptFilter];
      else query.department = dept;
    }
    const fees = await Fee.find(query).sort({ createdAt: -1 });
    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get fees for a specific student
router.get('/student/:studentId', protect, collegeScope, async (req, res) => {
  try {
    const sId = req.params.studentId;
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;

    const query = {
      $or: [
        { studentId: sId },
        { registerNo: sId },
        {
          studentName: new RegExp(
            `^${sId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`,
            'i'
          )
        }
      ]
    };

    // Strict college isolation
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      query.$and = [
        {
          $or: [
            { collegeId },
            { tenantId: collegeId }
          ]
        }
      ];
    }

    if (req.user?.name && (req.user.role === 'Student' || req.user.role === 'Parent')) {
      query.$or.push({ studentName: req.user.name });
    }

    const fees = await Fee.find(query).sort({ createdAt: -1 });

    res.json(fees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get fee structure for a specific student
router.get('/structure/:studentId', protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const sId = req.params.studentId;
    const isValidObjId = mongoose.Types.ObjectId.isValid(sId);

    let studentQuery = {
      $or: [
        { id: sId },
        { admissionNo: sId },
        ...(isValidObjId ? [{ _id: sId }] : [])
      ]
    };

    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      studentQuery = {
        $and: [
          { $or: studentQuery.$or },
          { $or: [{ collegeId }, { tenantId: collegeId }] }
        ]
      };
    }

    const student = await Student.findOne(studentQuery);

    if (!student) {
      return res.json(null);
    }

    const deptName = String(student.department || student.dept || '').trim();
    const courseName = String(student.course || '').trim();
    const semNum = Number(student.semester || student.sem || 1);

    const targetColId = student.collegeId || collegeId;

    const collegeFilter =
      req.user?.role !== 'Super Admin' &&
      targetColId &&
      targetColId !== 'system'
        ? { $or: [{ collegeId: targetColId }, { tenantId: targetColId }] }
        : {};

    const escapeRegex = (value) =>
      String(value || '').replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    /*
     * IMPORTANT:
     * Admin FeeStructure is the PRIMARY source of truth.
     * Old student.feeBreakdown must NOT override the Admin structure.
     */
    const structureQuery = {
      ...collegeFilter,
      department: new RegExp(`^${escapeRegex(deptName)}$`, 'i'),
      course: new RegExp(`^${escapeRegex(courseName)}$`, 'i'),
      semester: semNum
    };

    let matchedStructure = await FeeStructure.findOne(structureQuery)
      .sort({ updatedAt: -1 });

    /*
     * If semester-specific structure is not found, try the same
     * department/course without semester for older records.
     */
    if (!matchedStructure) {
      matchedStructure = await FeeStructure.findOne({
        ...collegeFilter,
        department: new RegExp(`^${escapeRegex(deptName)}$`, 'i'),
        course: new RegExp(`^${escapeRegex(courseName)}$`, 'i')
      }).sort({ updatedAt: -1 });
    }

    /*
     * Map Admin FeeStructure fees[] into the same field names
     * used by Accounts FeesCollection.jsx.
     */
    if (matchedStructure && Array.isArray(matchedStructure.fees) && matchedStructure.fees.length > 0) {
      const mapped = {
        studentId: student.id || student._id,
        tuitionFee: 0,
        admissionFee: 0,
        universityFee: 0,
        marksheetVerification: 0,
        specialFee: 0,
        englishLabNssId: 0,
        computerLab: 0,
        stationary: 0,
        pta: 0,
        examFee: 0,
        libraryFee: 0,
        hostelFee: 0,
        transportFee: 0,
        otherFee: 0
      };

      for (const item of matchedStructure.fees) {
        const type = String(item.feeType || '').toLowerCase();
        const amount = Number(item.amount) || 0;

        if (type.includes('tuition')) {
          mapped.tuitionFee += amount;
        } else if (type.includes('admission') || type.includes('processing')) {
          mapped.admissionFee += amount;
        } else if (type.includes('marksheet') || type.includes('verification')) {
          mapped.marksheetVerification += amount;
        } else if (type.includes('university') || type.includes('affiliation')) {
          mapped.universityFee += amount;
        } else if (type.includes('exam')) {
          mapped.examFee += amount;
        } else if (type.includes('computer')) {
          mapped.computerLab += amount;
        } else if (type.includes('english') || type.includes('nss') || type.includes('id')) {
          mapped.englishLabNssId += amount;
        } else if (type.includes('special') || type.includes('lab')) {
          mapped.specialFee += amount;
        } else if (type.includes('station') || type.includes('syllabus')) {
          mapped.stationary += amount;
        } else if (type.includes('pta')) {
          mapped.pta += amount;
        } else if (type.includes('library')) {
          mapped.libraryFee += amount;
        } else if (type.includes('hostel')) {
          mapped.hostelFee += amount;
        } else if (type.includes('transport')) {
          mapped.transportFee += amount;
        } else {
          mapped.otherFee += amount;
        }
      }

      const calculatedTotal = [
        mapped.tuitionFee,
        mapped.admissionFee,
        mapped.universityFee,
        mapped.marksheetVerification,
        mapped.specialFee,
        mapped.englishLabNssId,
        mapped.computerLab,
        mapped.stationary,
        mapped.pta,
        mapped.examFee,
        mapped.libraryFee,
        mapped.hostelFee,
        mapped.transportFee,
        mapped.otherFee
      ].reduce((sum, value) => sum + value, 0);

      mapped.totalAmount =
        Number(matchedStructure.totalAmount) || calculatedTotal;

      mapped.allFees = mapped.totalAmount;

      return res.json(mapped);
    }

    /*
     * SECONDARY SOURCE:
     * FeePlan created/synced by Admin.
     */
    const matchedPlan = await FeePlan.findOne({
      ...collegeFilter,
      $or: [
        {
          departmentName: new RegExp(`^${escapeRegex(deptName)}$`, 'i'),
          courseName: new RegExp(`^${escapeRegex(courseName)}$`, 'i')
        },
        { departmentId: deptName }
      ],
      semester: `Sem ${semNum}`
    }).sort({ updatedAt: -1 });

    if (matchedPlan) {
      const planTotal =
        (Number(matchedPlan.tuitionFee) || 0) +
        (Number(matchedPlan.examFee) || 0) +
        (Number(matchedPlan.labFee) || 0) +
        (Number(matchedPlan.libraryFee) || 0) +
        (Number(matchedPlan.transportFee) || 0) +
        (Number(matchedPlan.hostelFee) || 0);

      return res.json({
        studentId: student.id || student._id,
        tuitionFee: Number(matchedPlan.tuitionFee) || 0,
        examFee: Number(matchedPlan.examFee) || 0,
        computerLab: Number(matchedPlan.labFee) || 0,
        libraryFee: Number(matchedPlan.libraryFee) || 0,
        transportFee: Number(matchedPlan.transportFee) || 0,
        hostelFee: Number(matchedPlan.hostelFee) || 0,
        allFees: planTotal,
        totalAmount: planTotal
      });
    }

    /*
     * LAST FALLBACK:
     * Existing student feeBreakdown is used only when there is
     * no Admin FeeStructure and no FeePlan.
     */
    if (student.feeBreakdown && Object.keys(student.feeBreakdown).length > 0) {
      const fb = student.feeBreakdown;

      const fallback = {
        studentId: student.id || student._id,
        tuitionFee: Number(fb.tuitionFee) || 0,
        admissionFee: Number(fb.admissionFee) || 0,
        universityFee: Number(fb.universityFee) || 0,
        marksheetVerification: Number(fb.marksheetVerification) || 0,
        specialFee: Number(fb.specialFee) || 0,
        englishLabNssId: Number(fb.englishLabNssId) || 0,
        computerLab: Number(fb.computerLab) || 0,
        stationary: Number(fb.stationary) || 0,
        pta: Number(fb.pta) || 0,
        examFee: Number(fb.examFee) || 0,
        libraryFee: Number(fb.libraryFee) || 0,
        otherFee: Number(fb.otherFee) || 0,
        hostelFee: Number(student.hostelFeeAmount) || 0,
        transportFee: Number(student.transportFeeAmount) || 0
      };

      fallback.allFees =
        Number(student.totalFee) ||
        Object.values(fallback)
          .filter(v => typeof v === 'number')
          .reduce((sum, value) => sum + value, 0);

      fallback.totalAmount = fallback.allFees;

      return res.json(fallback);
    }

    /*
     * No configured fee exists.
     * Return zero instead of inventing a hardcoded fee.
     */
    return res.json({
      studentId: student.id || student._id,
      tuitionFee: 0,
      admissionFee: 0,
      universityFee: 0,
      marksheetVerification: 0,
      specialFee: 0,
      englishLabNssId: 0,
      computerLab: 0,
      stationary: 0,
      pta: 0,
      examFee: 0,
      libraryFee: 0,
      hostelFee: 0,
      transportFee: 0,
      otherFee: 0,
      allFees: 0,
      totalAmount: 0
    });

  } catch (err) {
    console.error('GET /fees/structure/:studentId error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Record new fee transaction
router.post('/', protect, authorize('Admin', 'Principal', 'Accounts', 'Student'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'unassigned_college';
    if (Array.isArray(req.body)) {
      const processed = req.body.map(item => ({
        ...processFeePayload(item),
        collegeId,
        tenantId: collegeId
      }));
      const newRecords = await Fee.insertMany(processed);
      
      const studentIds = [...new Set(newRecords.map(r => r.studentId))];
      for (const id of studentIds) {
        await updateStudentFeeStatus(id, collegeId);
      }
      for (const record of newRecords) {
        await notifyFeeUpdate(req, record);
      }
      req.app.get('io')?.emit('dataUpdated', { module: 'fees', action: 'created' });
      return res.status(201).json(newRecords);
    } else {
      const fee = new Fee({
        ...processFeePayload(req.body),
        collegeId,
        tenantId: collegeId
      });
      const newRecord = await fee.save();
      await updateStudentFeeStatus(newRecord.studentId, collegeId);
      await notifyFeeUpdate(req, newRecord);
      req.app.get('io')?.emit('dataUpdated', { module: 'fees', action: 'created', studentId: newRecord.studentId });
      return res.status(201).json(newRecord);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update fee status (e.g. Pending -> Paid)
router.put('/:id', protect, authorize('Admin', 'Principal', 'Accounts', 'Student'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = {
      $or: [
        ...(mongoose.Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : []),
        { id: req.params.id },
        { receiptNo: req.params.id }
      ]
    };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$and = [
        { $or: [{ collegeId }, { tenantId: collegeId }] }
      ];
    }

    const updatedFee = await Fee.findOneAndUpdate(
      filter, 
      processFeePayload(req.body), 
      { new: true }
    );
    if (!updatedFee) {
      return res.status(404).json({ message: 'Fee record not found' });
    }
    await updateStudentFeeStatus(updatedFee.studentId, collegeId);
    await notifyFeeUpdate(req, updatedFee);
    req.app.get('io')?.emit('dataUpdated', { module: 'fees', action: 'updated', studentId: updatedFee.studentId });
    res.json(updatedFee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete fee record
router.delete('/:id', protect, authorize('Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId;
    const filter = {
      $or: [
        ...(mongoose.Types.ObjectId.isValid(req.params.id) ? [{ _id: req.params.id }] : []),
        { id: req.params.id }
      ]
    };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      filter.$and = [
        { $or: [{ collegeId }, { tenantId: collegeId }] }
      ];
    }

    const record = await Fee.findOneAndDelete(filter);
    if (!record) {
      return res.status(404).json({ message: 'Fee record not found' });
    }
    await updateStudentFeeStatus(record.studentId, collegeId);
    req.app.get('io')?.emit('dataUpdated', { module: 'fees', action: 'deleted' });
    res.json({ message: 'Fee record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;


