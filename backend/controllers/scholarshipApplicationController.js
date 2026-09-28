import mongoose from "mongoose";
import ScholarshipApplication from "../models/ScholarshipApplication.js";
import Scholarship from "../models/Scholarship.js";
import Student from "../models/Student.js";
import Fee from "../models/Fee.js";

const getCollegeId = (req) => {
  return req.collegeId || req.user?.collegeId || req.headers?.['x-college-id'] || "COL001";
};

// GET all scholarship applications
export const getScholarshipApplications = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    let query = {};
    if (collegeId && collegeId !== "all") {
      query.$or = [{ collegeId }, { collegeId: { $exists: false } }, { collegeId: null }, { collegeId: "" }, { collegeId: "COL001" }];
    }

    const applications = await ScholarshipApplication.find(query)
      .populate("scholarship")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error("Error fetching scholarship applications:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch scholarship applications",
      error: error.message
    });
  }
};

// CREATE scholarship application for an existing student
export const createScholarshipApplication = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    const { studentId, scholarshipId } = req.body;

    if (!studentId || !scholarshipId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Scholarship ID are required"
      });
    }

    // Find existing student by ObjectId or string ID
    let student = null;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      student = await Student.findById(studentId);
    }
    if (!student) {
      student = await Student.findOne({
        $or: [
          { id: String(studentId) },
          { admissionNo: String(studentId) },
          { rollNo: String(studentId) },
          { previousAdmissionNo: String(studentId) }
        ]
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Find active scholarship master by ObjectId or ID/Name
    let scholarship = null;
    if (mongoose.Types.ObjectId.isValid(scholarshipId)) {
      scholarship = await Scholarship.findById(scholarshipId);
    }
    if (!scholarship) {
      scholarship = await Scholarship.findOne({
        $or: [
          { _id: scholarshipId },
          { scholarshipName: scholarshipId }
        ]
      });
    }

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: "Active scholarship not found"
      });
    }

    // Prevent duplicate application
    const existing = await ScholarshipApplication.findOne({
      student: student._id,
      scholarship: scholarship._id,
      academicYear: scholarship.academicYear,
      collegeId,
      status: { $in: ["Pending", "Approved", "Applied"] }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This scholarship is already applied for this student",
        data: existing
      });
    }

    // Find student's current fee record
    const fee = await Fee.findOne({
      $or: [
        { studentId: student.id },
        { studentId: String(student._id) },
        { registerNo: student.id }
      ],
      collegeId
    }).sort({ createdAt: -1 });

    // Use existing fee after quota discount
    const originalFee = Number(
      fee?.finalFee ??
      student.finalFee ??
      student.totalFee ??
      fee?.totalFees ??
      0
    );

    let discountAmount = 0;

    if (scholarship.scholarshipType === "Percentage") {
      discountAmount =
        originalFee * (Number(scholarship.scholarshipValue) / 100);
    } else {
      discountAmount = Number(scholarship.scholarshipValue) || 0;
    }

    // Apply maximum scholarship cap
    if (Number(scholarship.maximumAmount) > 0) {
      discountAmount = Math.min(
        discountAmount,
        Number(scholarship.maximumAmount)
      );
    }

    discountAmount = Math.min(
      Math.max(0, discountAmount),
      Math.max(0, originalFee)
    );

    discountAmount = Math.round(discountAmount * 100) / 100;

    const finalFee = Math.max(
      0,
      originalFee - discountAmount
    );

    const application = await ScholarshipApplication.create({
      student: student._id,
      studentId: student.id,
      studentName: student.name,
      scholarship: scholarship._id,
      scholarshipName: scholarship.scholarshipName,
      academicYear: scholarship.academicYear,
      scholarshipType: scholarship.scholarshipType,
      scholarshipValue: scholarship.scholarshipValue,
      maximumAmount: scholarship.maximumAmount,
      originalFee,
      discountAmount,
      finalFee,
      status: "Approved",
      collegeId
    });

    // Update student with scholarship info
    try {
      const studentPaid = Number(student.paidAmount !== undefined ? student.paidAmount : (student.amountPaid || 0));
      const studentRemaining = Math.max(0, finalFee - studentPaid);

      student.scholarship = scholarship.scholarshipName;
      student.scholarshipAmount = discountAmount;
      student.scholarshipDiscount = discountAmount;
      student.finalFee = finalFee;
      student.totalFee = finalFee;
      student.remainingFee = studentRemaining;
      student.balanceFee = studentRemaining;
      student.feeStatus = (studentRemaining === 0 && finalFee > 0) ? "Paid" : (studentPaid > 0 ? "Partial" : "Pending");
      student.paymentStatus = student.feeStatus;
      student.scholarshipDetails = {
        scholarshipId: scholarship._id,
        scholarshipName: scholarship.scholarshipName,
        scholarshipType: scholarship.scholarshipType,
        scholarshipValue: scholarship.scholarshipValue,
        discountAmount,
        finalFee,
        appliedAt: new Date()
      };
      await student.save();
    } catch (stdErr) {
      console.warn("Could not update student scholarship fields:", stdErr.message);
    }

    // Update fee record if exists
    try {
      if (fee) {
        const feePaid = Number(fee.paidAmount || 0);
        const feePending = Math.max(0, finalFee - feePaid);
        fee.scholarshipAmount = discountAmount;
        fee.scholarshipDiscount = discountAmount;
        fee.finalFee = finalFee;
        fee.pendingAmount = feePending;
        fee.remainingFee = feePending;
        fee.status = (feePending === 0 && finalFee > 0) ? "Paid" : (feePaid > 0 ? "Partial" : "Pending");
        await fee.save();
      }
    } catch (feeErr) {
      console.warn("Could not update fee scholarship fields:", feeErr.message);
    }

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('erp:data-update', {
        modules: ['students', 'fees', 'scholarships', 'admissions'],
        action: 'scholarship-applied',
        data: {
          studentId: student.id || student._id,
          scholarshipName: scholarship.scholarshipName,
          discountAmount,
          finalFee
        }
      });
    }

    res.status(201).json({
      success: true,
      message: "Scholarship applied and approved successfully",
      data: application
    });
  } catch (error) {
    console.error("Error creating scholarship application:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create scholarship application",
      error: error.message
    });
  }
};


