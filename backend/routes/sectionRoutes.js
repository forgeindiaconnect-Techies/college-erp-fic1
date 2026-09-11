import express from "express";
import Section from "../models/Section.js";
import Semester from "../models/Semester.js";
import Course from "../models/Course.js";
import Staff from "../models/Staff.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import {
  protect,
  authorize
} from "../middleware/authMiddleware.js";

const router = express.Router();

const getCollegeId = (user) => {
  return user.tenantId || user.collegeId;
};

const validateHodDepartment = async ({
  user,
  departmentId,
  collegeId
}) => {
  if (String(user?.role || '').toLowerCase() !== 'hod') {
    return {
      valid: true
    };
  }

  const department = await Department.findOne({
    id: departmentId,
    collegeId,
    status: 'Active'
  });

  if (!department) {
    return {
      valid: false,
      status: 404,
      message: 'Active department not found'
    };
  }

  const hodDepartment = String(
    user.department || user.dept || ''
  )
    .trim()
    .toLowerCase();

  const sameDepartment =
    String(department.name || '').trim().toLowerCase() ===
      hodDepartment ||
    String(department.code || '').trim().toLowerCase() ===
      hodDepartment;

  if (!sameDepartment) {
    return {
      valid: false,
      status: 403,
      message:
        'HOD can manage sections only within their assigned department'
    };
  }

  return {
    valid: true
  };
};

const validateClassTeacher = async ({
  classTeacherId,
  departmentId,
  collegeId
}) => {
  if (!classTeacherId) {
    return {
      valid: true,
      teacher: null
    };
  }

  const department = await Department.findOne({
    id: departmentId,
    collegeId,
    status: "Active"
  });

  if (!department) {
    return {
      valid: false,
      status: 404,
      message: "Active department not found"
    };
  }

  const teacher = await Staff.findOne({
    id: classTeacherId,
    collegeId,
    status: "Active",
    $or: [
      { dept: department.name },
      { deptCode: department.code }
    ]
  });

  if (!teacher) {
    return {
      valid: false,
      status: 400,
      message:
        "Selected class teacher must be an active staff member from the same department"
    };
  }

  return {
    valid: true,
    teacher
  };
};

// Get sections
router.get("/", protect, async (req, res) => {
  try {
    const collegeId = getCollegeId(req.user);
    const filter = { collegeId };

    const isHod =
      String(req.user?.role || "").toLowerCase() === "hod";

    if (isHod) {
      const hodValue = String(
        req.user.department || req.user.dept || ""
      ).trim().toLowerCase();

      const departments = await Department.find({
        collegeId,
        status: "Active"
      });

      const hodDepartment = departments.find(department =>
        String(department.name || "").trim().toLowerCase() === hodValue ||
        String(department.code || "").trim().toLowerCase() === hodValue
      );

      if (!hodDepartment) {
        return res.status(403).json({
          success: false,
          message: "HOD department not found"
        });
      }

      filter.departmentId = hodDepartment.id;
    }

    if (req.query.courseId) {
      filter.courseId = req.query.courseId;
    }

    if (req.query.semesterId) {
      filter.semesterId = req.query.semesterId;
    }

    if (!isHod && req.query.departmentId) {
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

// Get sections and students assigned to the logged-in class teacher
router.get(
  "/my-class",
  protect,
  authorize("Staff", "HOD"),
  async (req, res) => {
    try {
      const collegeId = getCollegeId(req.user);

      const staffId =
        req.user.referenceId ||
        req.user.staffId;

      if (!staffId) {
        return res.status(400).json({
          success: false,
          message:
            "Staff reference ID is not available for this user"
        });
      }

      const sections = await Section.find({
        collegeId,
        classTeacherId: staffId,
        status: "Active"
      }).sort({
        name: 1
      });

      const sectionIds = sections.map(
        section => section.id
      );

      const students =
        sectionIds.length > 0
          ? await Student.find({
              collegeId,
              sectionId: {
                $in: sectionIds
              }
            }).sort({
              name: 1
            })
          : [];

      res.status(200).json({
        success: true,
        count: sections.length,
        studentCount: students.length,
        sections,
        students
      });
    } catch (error) {
      console.error("Get my class error:", error);

      res.status(500).json({
        success: false,
        message:
          "Unable to fetch assigned class details"
      });
    }
  }
);

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

      const hodDepartmentValidation =
        await validateHodDepartment({
          user: req.user,
          departmentId,
          collegeId
        });

      if (!hodDepartmentValidation.valid) {
        return res
          .status(hodDepartmentValidation.status)
          .json({
            success: false,
            message: hodDepartmentValidation.message
          });
      }

      const teacherValidation = await validateClassTeacher({
        classTeacherId,
        departmentId,
        collegeId
      });

      if (!teacherValidation.valid) {
        return res
          .status(teacherValidation.status)
          .json({
            success: false,
            message: teacherValidation.message
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

      req.app.get("io").emit("dataUpdated", {
        module: "sections",
        action: "created"
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

      const existingSection = await Section.findOne({
        id: req.params.id,
        collegeId
      });

      if (!existingSection) {
        return res.status(404).json({
          success: false,
          message: "Section not found"
        });
      }

      const hodDepartmentValidation =
        await validateHodDepartment({
          user: req.user,
          departmentId: existingSection.departmentId,
          collegeId
        });

      if (!hodDepartmentValidation.valid) {
        return res
          .status(hodDepartmentValidation.status)
          .json({
            success: false,
            message: hodDepartmentValidation.message
          });
      }

      const classTeacherId =
        req.body.classTeacherId !== undefined
          ? req.body.classTeacherId
          : existingSection.classTeacherId;

      const teacherValidation = await validateClassTeacher({
        classTeacherId,
        departmentId: existingSection.departmentId,
        collegeId
      });

      if (!teacherValidation.valid) {
        return res
          .status(teacherValidation.status)
          .json({
            success: false,
            message: teacherValidation.message
          });
      }

      const allowedUpdates = {};

      if (req.body.name !== undefined) {
        allowedUpdates.name = String(req.body.name)
          .trim()
          .toUpperCase();
      }

      if (req.body.classTeacherId !== undefined) {
        allowedUpdates.classTeacherId =
          req.body.classTeacherId || null;
      }

      if (req.body.roomNumber !== undefined) {
        allowedUpdates.roomNumber =
          String(req.body.roomNumber).trim();
      }

      if (req.body.maximumStudents !== undefined) {
        allowedUpdates.maximumStudents =
          Number(req.body.maximumStudents);
      }

      if (req.body.status !== undefined) {
        allowedUpdates.status = req.body.status;
      }

      const section = await Section.findOneAndUpdate(
        {
          id: req.params.id,
          collegeId
        },
        {
          $set: allowedUpdates
        },
        {
          new: true,
          runValidators: true
        }
      );

      req.app.get("io").emit("dataUpdated", {
        module: "sections",
        action: "updated"
      });

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

      req.app.get("io").emit("dataUpdated", {
        module: "sections",
        action: "deleted"
      });

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
