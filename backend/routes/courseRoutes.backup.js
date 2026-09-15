import express from "express";
import Course from "../models/Course.js";
import Department from "../models/Department.js";
import {
  protect,
  authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

const getCollegeId = (user) => {
  return user.tenantId || user.collegeId;
};

// Get courses belonging to the logged-in college
router.get("/", protect, async (req, res) => {
  try {
    const collegeId = getCollegeId(req.user);

    const filter = { collegeId };

    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    const courses = await Course.find(filter).sort({
      createdAt: -1
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error("Get courses error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch courses"
    });
  }
});

// Create a course
router.post(
  "/",
  protect,
  authorize("Super Admin", "Admin", "Principal", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const {
        name,
        code,
        departmentId,
        degreeType,
        durationYears,
        totalSemesters
      } = req.body;

      if (
        !name ||
        !code ||
        !departmentId ||
        !degreeType ||
        !durationYears ||
        !totalSemesters
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required course details"
        });
      }

      const department = await Department.findOne({
        id: departmentId,
        collegeId
      });

      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found in your college"
        });
      }

      const existingCourse = await Course.findOne({
        collegeId,
        code: code.trim().toUpperCase()
      });

      if (existingCourse) {
        return res.status(409).json({
          success: false,
          message: "Course code already exists"
        });
      }

      const course = await Course.create({
        id: `CRS-${Date.now()}`,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        departmentId,
        collegeId,
        degreeType,
        durationYears: Number(durationYears),
        totalSemesters: Number(totalSemesters)
      });

      res.status(201).json({
        success: true,
        message: "Course created successfully",
        course
      });
    } catch (error) {
      console.error("Create course error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create course"
      });
    }
  }
);

// Update a course
router.put(
  "/:id",
  protect,
  authorize("Super Admin", "Admin", "Principal", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const course = await Course.findOneAndUpdate(
        {
          id: req.params.id,
          collegeId
        },
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Course updated successfully",
        course
      });
    } catch (error) {
      console.error("Update course error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update course"
      });
    }
  }
);

// Deactivate a course
router.delete(
  "/:id",
  protect,
  authorize("Super Admin", "Admin", "Principal"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const course = await Course.findOneAndUpdate(
        {
          id: req.params.id,
          collegeId
        },
        {
          status: "Inactive"
        },
        {
          new: true
        }
      );

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Course deactivated successfully",
        course
      });
    } catch (error) {
      console.error("Deactivate course error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to deactivate course"
      });
    }
  }
);

export default router;
