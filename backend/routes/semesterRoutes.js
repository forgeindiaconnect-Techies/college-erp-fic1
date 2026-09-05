import express from "express";
import Semester from "../models/Semester.js";
import Course from "../models/Course.js";
import AcademicYear from "../models/AcademicYear.js";
import {
  protect,
  authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

const getCollegeId = (user) => {
  return user.tenantId || user.collegeId;
};

// Get semesters
router.get("/", protect, async (req, res) => {
  try {
    const collegeId = getCollegeId(req.user);
    const filter = { collegeId };

    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    if (req.query.academicYearId) {
      filter.academicYearId = req.query.academicYearId;
    }

    const semesters = await Semester.find(filter).sort({
      semesterNumber: 1
    });

    res.status(200).json({
      success: true,
      count: semesters.length,
      semesters
    });
  } catch (error) {
    console.error("Get semesters error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch semesters"
    });
  }
});

// Create semester
router.post(
  "/",
  protect,
  authorize("Super Admin", "Admin", "Principal", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const {
        name,
        semesterNumber,
        courseId,
        departmentId,
        academicYearId,
        startDate,
        endDate,
        status
      } = req.body;

      if (
        !name ||
        !semesterNumber ||
        !courseId ||
        !departmentId ||
        !academicYearId
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required semester details"
        });
      }

      const course = await Course.findOne({
        id: courseId,
        departmentId,
        collegeId,
        status: "Active"
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Active course not found"
        });
      }

      const academicYear = await AcademicYear.findOne({
        _id: academicYearId,
        collegeId
      });

      if (!academicYear) {
        return res.status(404).json({
          success: false,
          message: "Academic year not found"
        });
      }

      const existingSemester = await Semester.findOne({
        collegeId,
        courseId,
        academicYearId,
        semesterNumber: Number(semesterNumber)
      });

      if (existingSemester) {
        return res.status(409).json({
          success: false,
          message: "Semester already exists"
        });
      }

      const semester = await Semester.create({
        id: `SEM-${Date.now()}`,
        name: name.trim(),
        semesterNumber: Number(semesterNumber),
        courseId,
        departmentId,
        academicYearId,
        collegeId,
        startDate,
        endDate,
        status: status || "Upcoming"
      });

      res.status(201).json({
        success: true,
        message: "Semester created successfully",
        semester
      });
    } catch (error) {
      console.error("Create semester error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create semester"
      });
    }
  }
);

// Update semester
router.put(
  "/:id",
  protect,
  authorize("Super Admin", "Admin", "Principal", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const semester = await Semester.findOneAndUpdate(
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

      if (!semester) {
        return res.status(404).json({
          success: false,
          message: "Semester not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Semester updated successfully",
        semester
      });
    } catch (error) {
      console.error("Update semester error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update semester"
      });
    }
  }
);

// Deactivate semester
router.delete(
  "/:id",
  protect,
  authorize("Super Admin", "Admin", "Principal"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const semester = await Semester.findOneAndUpdate(
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

      if (!semester) {
        return res.status(404).json({
          success: false,
          message: "Semester not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Semester deactivated successfully",
        semester
      });
    } catch (error) {
      console.error("Deactivate semester error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to deactivate semester"
      });
    }
  }
);

export default router;
