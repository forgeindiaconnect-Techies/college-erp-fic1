import express from "express";
import Section from "../models/Section.js";
import Semester from "../models/Semester.js";
import Course from "../models/Course.js";
import {
  protect,
  authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

const getCollegeId = (user) => {
  return user.tenantId || user.collegeId;
};

// Get sections
router.get("/", protect, async (req, res) => {
  try {
    const collegeId = getCollegeId(req.user);
    const filter = { collegeId };

    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    if (req.query.semesterId) {
      filter.semesterId = req.query.semesterId;
    }

    if (req.query.departmentId) {
      filter.departmentId = req.query.departmentId;
    }

    const sections = await Section.find(filter).sort({
      name: 1
    });

    res.status(200).json({
      success: true,
      count: sections.length,
      sections
    });
  } catch (error) {
    console.error("Get sections error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch sections"
    });
  }
});

// Create section
router.post(
  "/",
  protect,
  authorize("Super Admin", "Admin", "Principal", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const {
        name,
        courseId,
        departmentId,
        semesterId,
        academicYearId,
        classTeacherId,
        roomNumber,
        maximumStudents
      } = req.body;

      if (
        !name ||
        !courseId ||
        !departmentId ||
        !semesterId ||
        !academicYearId
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required section details"
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

      const semester = await Semester.findOne({
        id: semesterId,
        courseId,
        academicYearId,
        collegeId
      });

      if (!semester) {
        return res.status(404).json({
          success: false,
          message: "Semester not found"
        });
      }

      const existingSection = await Section.findOne({
        collegeId,
        courseId,
        semesterId,
        academicYearId,
        name: name.trim().toUpperCase()
      });

      if (existingSection) {
        return res.status(409).json({
          success: false,
          message: "Section already exists"
        });
      }

      const section = await Section.create({
        id: `SEC-${Date.now()}`,
        name: name.trim().toUpperCase(),
        courseId,
        departmentId,
        semesterId,
        academicYearId,
        collegeId,
        classTeacherId: classTeacherId || null,
        roomNumber: roomNumber || "",
        maximumStudents: Number(maximumStudents) || 60
      });

      res.status(201).json({
        success: true,
        message: "Section created successfully",
        section
      });
    } catch (error) {
      console.error("Create section error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create section"
      });
    }
  }
);

// Update section
router.put(
  "/:id",
  protect,
  authorize("Super Admin", "Admin", "Principal", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const section = await Section.findOneAndUpdate(
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

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Section updated successfully",
        section
      });
    } catch (error) {
      console.error("Update section error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update section"
      });
    }
  }
);

// Deactivate section
router.delete(
  "/:id",
  protect,
  authorize("Super Admin", "Admin", "Principal"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const section = await Section.findOneAndUpdate(
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

      if (!section) {
        return res.status(404).json({
          success: false,
          message: "Section not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "Section deactivated successfully",
        section
      });
    } catch (error) {
      console.error("Deactivate section error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to deactivate section"
      });
    }
  }
);

export default router;
