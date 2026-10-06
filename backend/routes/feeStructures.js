import express from "express";
import FeeStructure from "../models/FeeStructure.js";
import Course from "../models/Course.js";
import { protect, authorize, collegeScope } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add Fee Structure
router.post("/", protect, collegeScope, async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || "unassigned_college";
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
    } = req.body;

    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Course is required to create a fee structure.",
      });
    }

    // Check if fee structure already exists for this course (and quota/year if provided) within this college
    const duplicateQuery = {
      $and: [
        {
          $or: [
            { collegeId: collegeId },
            { tenantId: collegeId }
          ]
        },
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

    if (semester) {
      duplicateQuery.$and.push({ semester: Number(semester) || 1 });
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
        message: "A fee structure already exists for this course and semester in your college. Please edit the existing fee structure instead.",
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
      collegeId: collegeId,
    });

    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'created' });

    res.status(201).json({
      success: true,
      message: "Fee structure created successfully",
      data: feeStructure,
    });
  } catch (error) {
    if (error.code === 11000) {
      try {
        const feeCol = FeeStructure.collection;
        const indexes = await feeCol.indexes();
        for (const idx of indexes) {
          if (idx.name && idx.name !== '_id_') {
            await feeCol.dropIndex(idx.name).catch(() => {});
          }
        }
        const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || "unassigned_college";
        const calculatedTotal = Number(req.body.totalFee || req.body.totalAmount) || (Number(req.body.tuitionFee || 0) + Number(req.body.otherFees || 0));
        const feeStructure = await FeeStructure.create({
          academicYear: req.body.academicYear,
          department: req.body.department || "",
          course: req.body.course,
          semester: Number(req.body.semester) || 1,
          quota: req.body.quota || "General / Merit",
          tuitionFee: Number(req.body.tuitionFee) || 0,
          otherFees: Number(req.body.otherFees) || 0,
          fees: Array.isArray(req.body.fees) ? req.body.fees : [],
          totalFee: calculatedTotal,
          totalAmount: calculatedTotal,
          collegeId: collegeId,
        });
        req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'created' });
        return res.status(201).json({
          success: true,
          message: "Fee structure created successfully",
          data: feeStructure,
        });
      } catch (retryErr) {
        console.error("Auto-recovery retry failed:", retryErr);
      }
    }
    console.error("Failed to create fee structure:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create fee structure",
      error: error.message,
    });
  }
});

// Get Fee Structures strictly isolated by college
router.get("/", protect, collegeScope, async (req, res) => {
  try {
    const { academicYear, course, department, quota } = req.query;
    const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
    const filter = {};

    if (req.user?.role !== 'Super Admin') {
      const targetCollegeId = collegeId && collegeId !== 'system' ? collegeId : 'unassigned_college';
      filter.$or = [
        { collegeId: targetCollegeId },
        { tenantId: targetCollegeId }
      ];
    }

    if (academicYear) filter.academicYear = academicYear;
    if (quota) filter.quota = new RegExp(`^${quota.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i');
    if (department) filter.department = new RegExp(department.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
    if (course) {
      const courseFilter = [
        { course: course },
        { course: new RegExp(course.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: courseFilter }];
        delete filter.$or;
      } else {
        filter.$or = courseFilter;
      }
    }

    let feeStructures = await FeeStructure.find(filter)
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
router.put("/:id", protect, collegeScope, async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId || "unassigned_college";
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
    } = req.body;

    if (!course) {
      return res.status(400).json({
        success: false,
        message: "Course is required.",
      });
    }

    const calculatedTotal = Number(totalFee || totalAmount) || (Number(tuitionFee || 0) + Number(otherFees || 0));

    const updateQuery = { _id: id };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      updateQuery.$or = [{ collegeId }, { tenantId: collegeId }];
    }

    const updated = await FeeStructure.findOneAndUpdate(
      updateQuery,
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
        collegeId: collegeId,
        tenantId: collegeId,
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found or access denied.",
      });
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'updated' });

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

// Delete Fee Structure
router.delete("/:id", protect, collegeScope, async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId || "unassigned_college";
    
    const deleteQuery = { _id: id };
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      deleteQuery.$or = [{ collegeId }, { tenantId: collegeId }];
    }

    const deleted = await FeeStructure.findOneAndDelete(deleteQuery);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Fee structure not found or access denied.",
      });
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'feeStructure', action: 'deleted' });
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

