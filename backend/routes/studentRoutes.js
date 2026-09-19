import express from 'express';
import Student from '../models/Student.js';
import mongoose from 'mongoose';
import Section from '../models/Section.js';
import { protect, authorize, departmentScope, requirePermission, collegeScope, checkSubscription } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import FeeStructure from '../models/FeeStructure.js';
import StudentFee from '../models/StudentFee.js';
import { sendNotification } from '../utils/notificationHelper.js';
import { recordAdmissionPayment, updateAdmissionPayment, deleteAdmissionPayment } from '../controllers/admissionController.js';


const router = express.Router();

// Payment routes for Students / Admissions
router.put('/:id/payment', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, recordAdmissionPayment);
router.post('/:id/payment', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, recordAdmissionPayment);
router.put('/:id/payment/:paymentId', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, updateAdmissionPayment);
router.delete('/:id/payment/:paymentId', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, deleteAdmissionPayment);


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

// Purge all student records
router.all('/purge-all', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const students = await Student.find({});
    const emails = students.map(s => s.email).filter(Boolean);
    const ids = students.map(s => s.id).filter(Boolean);

    await Student.deleteMany({});
    if (emails.length > 0) {
      await User.deleteMany({ email: { $in: emails }, role: 'Student' });
    }
    if (ids.length > 0) {
      try {
        await FeeStructure.deleteMany({ studentId: { $in: ids } });
        await StudentFee.deleteMany({ admissionNo: { $in: ids } });
      } catch (fErr) {
        console.warn('Fee bulk cleanup note:', fErr.message);
      }
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'purged' });
    res.json({ message: `Purged ${students.length} student records successfully` });
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

// Create a new student / Admission
router.post('/', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), requirePermission('manage_students'), collegeScope, checkSubscription, async (req, res) => {
  const paidAmount = Number(req.body.paidAmount !== undefined ? req.body.paidAmount : (req.body.amountPaid !== undefined ? req.body.amountPaid : 0));
  const remainingFee = Number(req.body.remainingFee !== undefined ? req.body.remainingFee : (req.body.balanceFee !== undefined ? req.body.balanceFee : 0));
  const paymentStatus = req.body.paymentStatus || (paidAmount > 0 && remainingFee === 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending');

  const fb = req.body.feeBreakdown || {};
  const isHostel = Boolean(req.body.hostelRequired === 'yes' || req.body.hostelRequired === true || req.body.hostel === 'Yes' || req.body.dormFacility);
  const isTransport = Boolean(req.body.transportRequired === 'yes' || req.body.transportRequired === true || req.body.transport === 'Yes' || req.body.busFacility);

  const tuitionFee = Number(req.body.tuitionFee !== undefined ? req.body.tuitionFee : (fb.tuitionFee || 0));
  const hostelFee = isHostel ? Number(req.body.hostelFee !== undefined ? req.body.hostelFee : (req.body.hostelFeeAmount || fb.hostelFee || 0)) : 0;
  const transportFee = isTransport ? Number(req.body.transportFee !== undefined ? req.body.transportFee : (req.body.transportFeeAmount || fb.transportFee || 0)) : 0;
  const otherFee = Number(req.body.otherFee !== undefined ? req.body.otherFee : (fb.otherFee || fb.otherFees || 0));

  const verifiedTotal = Number(req.body.totalFee) || (tuitionFee + hostelFee + transportFee + otherFee);
  let normalFee = Number(req.body.normalFee !== undefined ? req.body.normalFee : (req.body.totalFee || tuitionFee || 0));
  let discountAmount = Number(req.body.discountAmount || 0);
  let quota = req.body.quota || null;
  let quotaName = req.body.quotaName || req.body.admissionQuota || 'General Quota';

  // Step 54.12: Backend quota recalculation & verification
  if (quota && quota !== 'general' && quota !== 'General Quota') {
    try {
      const matchedQuota = await Quota.findOne({
        $or: [{ _id: mongoose.Types.ObjectId.isValid(quota) ? quota : null }, { quotaName: quotaName }],
        status: 'active'
      });
      if (matchedQuota) {
        quota = matchedQuota._id;
        quotaName = matchedQuota.quotaName;
        if (matchedQuota.normalFee > 0 && normalFee === 0) {
          normalFee = matchedQuota.normalFee;
        }
        if (matchedQuota.discountType === 'fixed') {
          discountAmount = matchedQuota.discountValue;
        } else if (matchedQuota.discountType === 'percentage') {
          discountAmount = (normalFee * matchedQuota.discountValue) / 100;
        }
        if (discountAmount > normalFee) {
          discountAmount = normalFee;
        }
      }
    } catch (qErr) {
      console.warn('Backend quota verification note:', qErr.message);
    }
  }

  // Step 49.14 & Step 54.12: Add Backend Validation
  if (normalFee < 0) {
    return res.status(400).json({ message: "Normal fee cannot be negative" });
  }
  if (discountAmount < 0) {
    return res.status(400).json({ message: "Discount cannot be negative" });
  }
  if (normalFee > 0 && discountAmount > normalFee) {
    return res.status(400).json({ message: "Discount cannot exceed the normal fee" });
  }

  const calculatedFinalFee = Math.max(0, normalFee - discountAmount);
  const finalFee = req.body.finalFee !== undefined ? Number(req.body.finalFee) : (discountAmount > 0 ? (calculatedFinalFee + hostelFee + transportFee + otherFee) : verifiedTotal);

  if (finalFee > 0 && paidAmount > finalFee) {
    return res.status(400).json({ message: "Paid amount cannot exceed final fee" });
  }
  if (remainingFee < 0) {
    return res.status(400).json({ message: "Remaining fee cannot be negative" });
  }

  const student = new Student({
    ...req.body,
    course: req.body.course || '',
    feeType: req.body.feeType || 'all',
    quota,
    quotaName,
    normalFee,
    discountAmount,
    finalFee,
    hostelRequired: isHostel ? 'yes' : 'no',
    transportRequired: isTransport ? 'yes' : 'no',
    tuitionFee,
    hostelFee,
    transportFee,
    otherFee,
    totalFee: finalFee || verifiedTotal,
    paidAmount,
    amountPaid: paidAmount,
    remainingFee,
    balanceFee: remainingFee,
    paymentStatus
  });
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
      const fb = req.body.feeBreakdown || {};
      const feeStructure = new FeeStructure({
        collegeId: newStudent.collegeId || collegeId,
        studentId: newStudent.id,
        academicYear: newStudent.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        course: newStudent.course || 'General',
        department: newStudent.dept || newStudent.department || 'General',
        semester: Number(newStudent.semester || 1),
        tuitionFee: Number(fb.tuitionFee) || Number(req.body.tuitionFee) || 15000,
        admissionFee: Number(fb.admissionFee) || 2500,
        universityFee: Number(fb.universityFee) || 1500,
        marksheetVerification: Number(fb.marksheetVerification) || 500,
        specialFee: Number(fb.specialFee) || 2000,
        englishLabNssId: Number(fb.englishLabNssId) || 1000,
        computerLab: Number(fb.computerLab) || 1000,
        stationary: Number(fb.stationary) || 1000,
        pta: Number(fb.pta) || 500,
        examFee: Number(fb.examFee) || 1500,
        libraryFee: Number(fb.libraryFee) || 1000,
        hostelFee: (req.body.hostelRequired === 'yes' || req.body.hostel === 'Yes') ? (Number(req.body.hostelFeeAmount) || 40000) : 0,
        transportFee: (req.body.transportRequired === 'yes' || req.body.transport === 'Yes') ? (Number(req.body.transportFeeAmount) || 15000) : 0,
        totalAmount: Number(req.body.totalFee) || 26000
      });
      await feeStructure.save();
    } catch (feeErr) {
      console.error('Failed to create FeeStructure for Student:', feeErr);
    }

    // Create or Update StudentFee account record
    try {
      let semNumber = 1;
      if (typeof newStudent.sem === 'number') {
        semNumber = newStudent.sem;
      } else if (typeof newStudent.sem === 'string') {
        const match = newStudent.sem.match(/\d+/);
        if (match) semNumber = parseInt(match[0], 10);
      }

      const existingStudentFee = await StudentFee.findOne({
        collegeId: newStudent.collegeId || collegeId,
        studentId: newStudent._id,
        academicYear:
          newStudent.academicYear ||
          `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      });

      if (existingStudentFee) {
        const paymentAmount =
          Number(req.body.amountPaid || 0);

        const currentPaid =
          Number(existingStudentFee.paidAmount || 0);

        const finalAmount =
          Number(
            existingStudentFee.finalAmount ||
            req.body.finalAssessedFee ||
            req.body.totalFee ||
            0
          );

        const newPaidAmount =
          currentPaid + paymentAmount;

        const newBalance =
          Math.max(
            0,
            finalAmount - newPaidAmount
          );

        const newStatus =
          newPaidAmount <= 0
            ? "PENDING"
            : newPaidAmount >= finalAmount
              ? "PAID"
              : "PARTIALLY_PAID";

        existingStudentFee.paidAmount =
          newPaidAmount;

        existingStudentFee.balanceAmount =
          newBalance;

        existingStudentFee.status =
          newStatus;

        existingStudentFee.paymentMode =
          req.body.paymentMode || "Cash";

        existingStudentFee.receiptNo =
          req.body.receiptNumber ||
          existingStudentFee.receiptNo ||
          "";

        existingStudentFee.lastPaymentDate =
          paymentAmount > 0
            ? new Date()
            : existingStudentFee.lastPaymentDate;

        if (paymentAmount > 0) {
          existingStudentFee.payments =
            existingStudentFee.payments || [];

          existingStudentFee.payments.push({
            amount: paymentAmount,
            paymentMode:
              req.body.paymentMode || "Cash",
            receiptNo:
              req.body.receiptNumber || "",
            paymentDate: new Date(),
          });
        }

        await existingStudentFee.save();
      } else {
        await StudentFee.create({
          collegeId: newStudent.collegeId || collegeId,

          studentId: newStudent._id,

          admissionNo: newStudent.id || "ST-TEMP",

          academicYear:
            newStudent.academicYear ||
            `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,

          course:
            newStudent.courseId ||
            newStudent.course ||
            "",

          department:
            newStudent.dept ||
            newStudent.department ||
            "",

          semester:
            Number(newStudent.semester) || 1,

          quota:
            req.body.quota ||
            "General / Merit",

          feeItems: [
            {
              feeType: "Admission & Processing Fee",
              amount: Number(
                req.body.feeBreakdown?.admissionFee || 0
              ),
            },

            {
              feeType: "Tuition Fee (Semester 1)",
              amount: Number(
                req.body.feeBreakdown?.tuitionFee || 0
              ),
            },

            {
              feeType: "University / Exam Affiliation Fee",
              amount: Number(
                req.body.feeBreakdown?.universityFee || 0
              ),
            },

            {
              feeType: "Marksheet & Document Verification",
              amount: Number(
                req.body.feeBreakdown?.marksheetVerification || 0
              ),
            },

            {
              feeType: "Special / Lab Equipment Fee",
              amount: Number(
                req.body.feeBreakdown?.specialFee || 0
              ),
            },

            {
              feeType: "Computer & Software Lab Access",
              amount: Number(
                req.body.feeBreakdown?.computerLab || 0
              ),
            },

            {
              feeType: "English Language Lab & NSS / ID Card",
              amount: Number(
                req.body.feeBreakdown?.englishLabNssId || 0
              ),
            },

            {
              feeType: "Stationery & Syllabus Kit",
              amount: Number(
                req.body.feeBreakdown?.stationary || 0
              ),
            },

            {
              feeType: "Parent Teacher Association (PTA)",
              amount: Number(
                req.body.feeBreakdown?.pta || 0
              ),
            },

            {
              feeType: "Other Institutional Amenities",
              amount: Number(
                req.body.feeBreakdown?.otherFee || 0
              ),
            },
          ],

          normalAmount:
            Number(
              req.body.normalFee ||
              req.body.totalFee ||
              0
            ),

          concessionAmount:
            Number(
              req.body.quotaConcession || 0
            ),

          finalAmount:
            Number(
              req.body.finalAssessedFee ||
              req.body.totalFee ||
              0
            ),

          totalAmount:
            Number(
              req.body.finalAssessedFee ||
              req.body.totalFee ||
              0
            ),

          paidAmount:
            Number(req.body.amountPaid || 0),

          balanceAmount: Math.max(
            0,
            Number(
              req.body.finalAssessedFee ||
              req.body.totalFee ||
              0
            ) -
              Number(req.body.amountPaid || 0)
          ),

          status:
            Number(req.body.amountPaid || 0) <= 0
              ? "PENDING"
              : Number(req.body.amountPaid || 0) >=
                Number(
                  req.body.finalAssessedFee ||
                  req.body.totalFee ||
                  0
                )
                ? "PAID"
                : "PARTIALLY_PAID",

          paymentMode:
            req.body.paymentMode || "Cash",

          receiptNo:
            req.body.receiptNumber || "",

          lastPaymentDate:
            Number(req.body.amountPaid || 0) > 0
              ? new Date()
              : null,

          payments:
            Number(req.body.amountPaid || 0) > 0
              ? [
                  {
                    amount: Number(
                      req.body.amountPaid || 0
                    ),
                    paymentMode:
                      req.body.paymentMode || "Cash",
                    receiptNo:
                      req.body.receiptNumber || "",
                    paymentDate: new Date(),
                  },
                ]
              : [],
        });
      }
    } catch (studentFeeErr) {
      console.error('Failed to create StudentFee record for Student:', studentFeeErr);
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

// Allocate multiple students to an academic section
router.put(
  '/allocate-section',
  protect,
  authorize('Admin', 'Sub Admin', 'Principal', 'HOD'),
  requirePermission('manage_students'),
  collegeScope,
  checkSubscription,
  async (req, res) => {
    try {
      const {
        studentIds,
        departmentId,
        departmentName,
        courseId,
        semesterId,
        semesterName,
        sectionId,
        sectionName,
        academicYearId
      } = req.body;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({
          message: 'Select at least one student'
        });
      }

      if (
        !departmentId ||
        !courseId ||
        !semesterId ||
        !sectionId
      ) {
        return res.status(400).json({
          message:
            'Department, course, semester and section are required'
        });
      }

      const collegeId =
        req.collegeId ||
        req.user.collegeId ||
        req.user.tenantId;

      const sectionIdentifiers = [{ id: sectionId }];

      if (mongoose.Types.ObjectId.isValid(sectionId)) {
        sectionIdentifiers.push({ _id: sectionId });
      }

      const section = await Section.findOne({
        collegeId,
        $or: sectionIdentifiers
      });

      if (!section) {
        return res.status(404).json({
          message: 'Section not found for this college'
        });
      }

      const objectIds = studentIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );

      const studentFilter = {
        collegeId,
        $or: [
          { id: { $in: studentIds } },
          { _id: { $in: objectIds } }
        ]
      };

      const result = await Student.updateMany(studentFilter, {
        $set: {
          departmentId,
          dept: departmentName,
          courseId,
          semesterId,
          sem: semesterName,
          sectionId,
          section: sectionName || section.name,
          academicYearId: academicYearId || null
        }
      });

      req.app.get('io')?.emit('dataUpdated', {
        module: 'students',
        action: 'section-allocated',
        sectionId
      });

      res.json({
        message: `${result.modifiedCount} student(s) allocated successfully`,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  }
);

// Step 32: Record payment for student / admission
router.put('/:id/payment', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, recordAdmissionPayment);
router.post('/:id/payment', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, recordAdmissionPayment);

// Step 34.7 & 34.8: Edit and delete payment endpoints
router.put('/:id/payment/:paymentId', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, updateAdmissionPayment);
router.delete('/:id/payment/:paymentId', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, deleteAdmissionPayment);

// Update student

router.put('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), requirePermission('manage_students'), collegeScope, checkSubscription, async (req, res) => {
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
router.delete('/:id', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const studentId = req.params.id;
    let query = { id: studentId };
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      query = { $or: [{ id: studentId }, { _id: studentId }] };
    }
    const deletedStudent = await Student.findOneAndDelete(query);
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';

    if (deletedStudent && deletedStudent.email) {
      await User.findOneAndDelete({ email: deletedStudent.email });
      try {
        await FeeStructure.deleteMany({ studentId: deletedStudent.id });
        await StudentFee.deleteMany({ admissionNo: deletedStudent.id });
      } catch (fErr) {
        console.warn('Fee cleanup note:', fErr.message);
      }
    }

    try {
      const Mark = (await import('../models/Mark.js')).default;
      await Mark.deleteMany({ studentId });
    } catch(err) {
      console.warn('Failed to delete marks for student:', err.message);
    }
    
    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'deleted' });
    res.json({ message: 'Student deleted successfully', id: studentId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Purge all student records
router.post('/purge-all', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user.collegeId || 'unassigned_college';
    const students = await Student.find({});
    const emails = students.map(s => s.email).filter(Boolean);
    const ids = students.map(s => s.id).filter(Boolean);

    await Student.deleteMany({});
    if (emails.length > 0) {
      await User.deleteMany({ email: { $in: emails }, role: 'Student' });
    }
    if (ids.length > 0) {
      try {
        await FeeStructure.deleteMany({ studentId: { $in: ids } });
        await StudentFee.deleteMany({ admissionNo: { $in: ids } });
      } catch (fErr) {
        console.warn('Fee bulk cleanup note:', fErr.message);
      }
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'purged' });
    res.json({ message: `Purged ${students.length} student records successfully` });
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


