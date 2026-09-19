import Scholarship from "../models/Scholarship.js";

const getCollegeId = (req) => {
  return (
    req.collegeId ||
    req.user?.collegeId ||
    "COL001"
  );
};

// GET all scholarships
export const getScholarships = async (req, res) => {
  try {
    const collegeId = getCollegeId(req);

    const scholarships = await Scholarship.find({
      collegeId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: scholarships,
    });
  } catch (error) {
    console.error("Error fetching scholarships:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch scholarships",
      error: error.message,
    });
  }
};

// GET single scholarship
export const getScholarshipById = async (req, res) => {
  try {
    const scholarship = await Scholarship.findById(
      req.params.id
    );

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });
    }

    res.json({
      success: true,
      data: scholarship,
    });
  } catch (error) {
    console.error("Error fetching scholarship:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch scholarship",
      error: error.message,
    });
  }
};

// CREATE scholarship
export const createScholarship = async (req, res) => {
  try {
    const {
      scholarshipName,
      academicYear,
      scholarshipType,
      scholarshipValue,
      maximumAmount,
      eligibility,
      status,
    } = req.body;

    if (!scholarshipName || !academicYear) {
      return res.status(400).json({
        success: false,
        message:
          "Scholarship name and academic year are required",
      });
    }

    const value = Number(scholarshipValue || 0);

    if (value < 0) {
      return res.status(400).json({
        success: false,
        message: "Scholarship value cannot be negative",
      });
    }

    if (
      scholarshipType === "Percentage" &&
      value > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Percentage scholarship cannot exceed 100%",
      });
    }

    const scholarship =
      await Scholarship.create({
        scholarshipName:
          scholarshipName.trim(),

        academicYear:
          academicYear.trim(),

        scholarshipType:
          scholarshipType || "Fixed Amount",

        scholarshipValue: value,

        maximumAmount:
          Number(maximumAmount || 0),

        eligibility:
          eligibility || "",

        status:
          status || "active",

        collegeId:
          getCollegeId(req),

        organization:
          req.user?.organization || null,
      });

    res.status(201).json({
      success: true,
      message:
        "Scholarship created successfully",
      data: scholarship,
    });
  } catch (error) {
    console.error("Error creating scholarship:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create scholarship",
      error: error.message,
    });
  }
};

// UPDATE scholarship
export const updateScholarship = async (req, res) => {
  try {
    const scholarship =
      await Scholarship.findById(
        req.params.id
      );

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });
    }

    const {
      scholarshipName,
      academicYear,
      scholarshipType,
      scholarshipValue,
      maximumAmount,
      eligibility,
      status,
    } = req.body;

    const value =
      scholarshipValue !== undefined
        ? Number(scholarshipValue)
        : scholarship.scholarshipValue;

    if (
      scholarshipType === "Percentage" &&
      value > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Percentage scholarship cannot exceed 100%",
      });
    }

    scholarship.scholarshipName =
      scholarshipName ??
      scholarship.scholarshipName;

    scholarship.academicYear =
      academicYear ??
      scholarship.academicYear;

    scholarship.scholarshipType =
      scholarshipType ??
      scholarship.scholarshipType;

    scholarship.scholarshipValue =
      value;

    scholarship.maximumAmount =
      maximumAmount !== undefined
        ? Number(maximumAmount)
        : scholarship.maximumAmount;

    scholarship.eligibility =
      eligibility ??
      scholarship.eligibility;

    scholarship.status =
      status ??
      scholarship.status;

    await scholarship.save();

    res.json({
      success: true,
      message:
        "Scholarship updated successfully",
      data: scholarship,
    });
  } catch (error) {
    console.error("Error updating scholarship:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update scholarship",
      error: error.message,
    });
  }
};

// DELETE scholarship
export const deleteScholarship = async (req, res) => {
  try {
    const scholarship =
      await Scholarship.findByIdAndDelete(
        req.params.id
      );

    if (!scholarship) {
      return res.status(404).json({
        success: false,
        message: "Scholarship not found",
      });
    }

    res.json({
      success: true,
      message:
        "Scholarship deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting scholarship:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete scholarship",
      error: error.message,
    });
  }
};
