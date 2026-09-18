import express from "express";
import FeeStructure from "../models/FeeStructure.js";
import Course from "../models/Course.js";

const router = express.Router();

// Add Fee Structure
router.post("/", async (req, res) => {
  try {
    const {
      academicYear,
      department,
      course,
      semester,
      quota,
      tuitionFee,
      otherFees,
      fees,
      totalFee,
      totalAmount,
      collegeId,
    } = req.body;

    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Course is required to create a fee structure.",
      });
    }

    // Check if fee structure already exists for this course (and quota/year if provided)
    const duplicateQuery = {
      $and: [
        {
          $or: [
            { course: course },
            { course: new RegExp(`^${String(course).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
          ]
        }
      ]
    };

    if (department) {
      duplicateQuery.$and.push({
        $or: [
          { department: department },
          { department: new RegExp(`^${String(department).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
          { department: "" },
          { department: null },
          { department: { $exists: false } }
        ]
      });
    }

    if (quota) {
      duplicateQuery.$and.push({
        quota: new RegExp(`^${String(quota).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
      });
    }

    if (academicYear) {
      duplicateQuery.$and.push({ academicYear });
    }

    const existingFee = await FeeStructure.findOne(duplicateQuery);
    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: "A fee structure already exists for this course. Please edit the existing fee structure instead.",
      });
    }

    const calculatedTotal = Number(totalFee || totalAmount) || (Number(tuitionFee || 0) + Number(otherFees || 0));

    const feeStructure = await FeeStructure.create({
      academicYear,
      department: department || "",
      course,
      semester: Number(semester) || 1,
      quota: quota || "General / Merit",
      tuitionFee: Number(tuitionFee) || 0,
      otherFees: Number(otherFees) || 0,
      fees: Array.isArray(fees) ? fees : [],
      totalFee: calculatedTotal,
      totalAmount: calculatedTotal,
      collegeId: collegeId || "COL001",
    });

    res.status(201).json({
      success: true,
      message: "Fee structure created successfully",
      data: feeStructure,
    });
  } catch (error) {
    console.error("Failed to create fee structure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create fee structure",
      error: error.message,
    });
  }
});

// Get Fee Structures
router.get("/", async (req, res) => {
  try {
    const { academicYear, course, department, quota } = req.query;
    const filter = {};

    if (academicYear) filter.academicYear = academicYear;
    if (quota) filter.quota = new RegExp(`^${quota.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
    if (department) filter.department = new RegExp(department.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    if (course) {
      filter.$or = [
        { course: course },
        { course: new RegExp(course.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }
      ];
    }

    let feeStructures = await FeeStructure.find(filter)
      .populate("course")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: feeStructures,
    });
  } catch (error) {
    console.error("Failed to fetch fee structures:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fee structures",
      error: error.message,
    });
  }
});

// Update Fee Structure
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      academicYear,
      department,
      course,
      semester,
      quota,
      tuitionFee,
      otherFees,
      fees,
      totalFee,
      totalAmount,
      collegeId,
    } = req.body;

    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Course is required.",
      });
    }

    // Check for duplicate fee structure excluding current record
    const duplicateQuery = {
      _id: { $ne: id },
      $and: [
        {
          $or: [
            { course: course },
            { course: new RegExp(`^${String(course).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
          ]
        }
      ]
    };

    if (department) {
      duplicateQuery.$and.push({
        $or: [
          { department: department },
          { department: new RegExp(`^${String(department).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
          { department: "" },
          { department: null },
          { department: { $exists: false } }
        ]
      });
    }

    if (quota) {
      duplicateQuery.$and.push({
        quota: new RegExp(`^${String(quota).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
      });
    }

    if (academicYear) {
      duplicateQuery.$and.push({ academicYear });
    }

    const existingFee = await FeeStructure.findOne(duplicateQuery);
    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: "A fee structure already exists for this course. Please edit the existing fee structure instead.",
      });
    }

    const calculatedTotal = Number(totalFee || totalAmount) || (Number(tuitionFee || 0) + Number(otherFees || 0));

    const updated = await FeeStructure.findByIdAndUpdate(
      id,
      {
        academicYear,
        department: department || "",
        course,
        semester: Number(semester) || 1,
        quota: quota || "General / Merit",
        tuitionFee: Number(tuitionFee) || 0,
        otherFees: Number(otherFees) || 0,
        fees: Array.isArray(fees) ? fees : [],
        totalFee: calculatedTotal,
        totalAmount: calculatedTotal,
        collegeId: collegeId || "COL001",
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found",
      });
    }

    res.json({
      success: true,
      message: "Fee structure updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Failed to update fee structure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update fee structure",
      error: error.message,
    });
  }
});

// Delete Fee Structure (Helper endpoint for management)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await FeeStructure.findByIdAndDelete(id);
    res.json({
      success: true,
      message: "Fee structure deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete fee structure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete fee structure",
    });
  }
});

export default router;

