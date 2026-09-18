import Quota from "../models/Quota.js";
import Department from "../models/Department.js";

// Helper to broadcast websocket update
const emitUpdate = (req, action, data) => {
  try {
    const io = req.app.get("io");
    if (io) {
      io.emit("dataUpdated", { module: "quotas", action, data });
    }
  } catch (err) {
    console.warn("Socket broadcast error:", err.message);
  }
};

// @desc    Get all quotas
// @route   GET /api/quotas
// @access  Private
export const getQuotas = async (req, res) => {
  try {
    const { department, academicYear, status, search, course } = req.query;
    const collegeId = req.collegeId || req.user?.collegeId || "COL001";
    const organization = req.user?.organization || collegeId;

    const query = {};
    if (collegeId && collegeId !== "all") {
      query.$or = [
        { collegeId: collegeId },
        { collegeId: { $exists: false } },
        { organization: organization }
      ];
    }

    if (department && department !== "All" && department !== "all") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { department: department },
          { departmentName: new RegExp(`^${department}$`, "i") }
        ]
      });
    }

    if (course && course !== "All" && course !== "all") {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { course: course },
          { courseName: new RegExp(`^${course}$`, "i") }
        ]
      });
    }

    if (academicYear && academicYear !== "All" && academicYear !== "all") {
      query.academicYear = academicYear;
    }

    if (status && status !== "All" && status !== "all") {
      query.status = status.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { quotaName: searchRegex },
          { departmentName: searchRegex },
          { courseName: searchRegex },
          { academicYear: searchRegex }
        ]
      });
    }

    const quotas = await Quota.find(query)
      .populate("department", "name departmentName code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotas.length,
      quotas,
      data: quotas
    });
  } catch (error) {
    console.error("Get quotas error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotas",
      error: error.message,
    });
  }
};

// @desc    Get single quota
// @route   GET /api/quotas/:id
// @access  Private
export const getQuotaById = async (req, res) => {
  try {
    const quota = await Quota.findById(req.params.id).populate("department", "name departmentName code");
    if (!quota) {
      return res.status(404).json({ success: false, message: "Quota not found" });
    }
    return res.status(200).json({ success: true, quota, data: quota });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new quota
// @route   POST /api/quotas
// @access  Private
export const createQuota = async (req, res) => {
  try {
    const {
      quotaName,
      department,
      departmentName,
      course,
      courseName,
      feeType,
      normalFee,
      discountType,
      discountValue,
      discountAmount,
      finalFee,
      academicYear,
      status,
    } = req.body;

    if (
      !quotaName ||
      !department ||
      normalFee === undefined ||
      !discountType ||
      discountValue === undefined ||
      !academicYear
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const numNormalFee = Number(normalFee);
    const numDiscountValue = Number(discountValue);

    if (numNormalFee < 0 || numDiscountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Fee and discount values cannot be negative",
      });
    }

    if (discountType === "percentage" && numDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100%",
      });
    }

    let calculatedDiscount = 0;
    if (discountType === "fixed") {
      calculatedDiscount = numDiscountValue;
    } else if (discountType === "percentage") {
      calculatedDiscount = (numNormalFee * numDiscountValue) / 100;
    }

    if (discountAmount !== undefined && !isNaN(Number(discountAmount))) {
      calculatedDiscount = Number(discountAmount);
    }

    if (calculatedDiscount > numNormalFee) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot exceed normal fee",
      });
    }

    let calculatedFinal = Math.max(0, numNormalFee - calculatedDiscount);
    if (finalFee !== undefined && !isNaN(Number(finalFee))) {
      calculatedFinal = Number(finalFee);
    }

    if (calculatedFinal < 0) {
      return res.status(400).json({
        success: false,
        message: "Final fee cannot be negative",
      });
    }

    // Resolve department name if needed
    let resolvedDeptName = departmentName || "";
    if (!resolvedDeptName && department) {
      const deptDoc = await Department.findOne({
        $or: [{ _id: department }, { id: department }, { code: department }, { name: department }]
      });
      if (deptDoc) resolvedDeptName = deptDoc.name;
      else resolvedDeptName = String(department);
    }

    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || "COL001";
    const organization = req.user?.organization || collegeId;

    const quota = await Quota.create({
      quotaName: quotaName.trim(),
      department,
      departmentName: resolvedDeptName,
      course: course || "",
      courseName: courseName || "",
      feeType: feeType || "Tuition Fee / Course Fee",
      normalFee: numNormalFee,
      discountType,
      discountValue: numDiscountValue,
      discountAmount: calculatedDiscount,
      finalFee: calculatedFinal,
      academicYear: academicYear.trim(),
      status: status || "active",
      collegeId,
      organization,
    });

    emitUpdate(req, "created", quota);

    return res.status(201).json({
      success: true,
      message: "Quota created successfully",
      quota,
      data: quota,
    });
  } catch (error) {
    console.error("Create quota error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create quota",
      error: error.message,
    });
  }
};

// @desc    Update existing quota
// @route   PUT /api/quotas/:id
// @access  Private
export const updateQuota = async (req, res) => {
  try {
    const quota = await Quota.findById(req.params.id);
    if (!quota) {
      return res.status(404).json({ success: false, message: "Quota not found" });
    }

    const {
      quotaName,
      department,
      departmentName,
      course,
      courseName,
      feeType,
      normalFee,
      discountType,
      discountValue,
      discountAmount,
      finalFee,
      academicYear,
      status,
    } = req.body;

    const targetNormal = normalFee !== undefined ? Number(normalFee) : quota.normalFee;
    const targetDiscType = discountType || quota.discountType;
    const targetDiscVal = discountValue !== undefined ? Number(discountValue) : quota.discountValue;

    if (targetNormal < 0 || targetDiscVal < 0) {
      return res.status(400).json({
        success: false,
        message: "Fee and discount values cannot be negative",
      });
    }

    if (targetDiscType === "percentage" && targetDiscVal > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100%",
      });
    }

    let calculatedDiscount = 0;
    if (targetDiscType === "fixed") {
      calculatedDiscount = targetDiscVal;
    } else if (targetDiscType === "percentage") {
      calculatedDiscount = (targetNormal * targetDiscVal) / 100;
    }

    if (discountAmount !== undefined && !isNaN(Number(discountAmount))) {
      calculatedDiscount = Number(discountAmount);
    }

    if (calculatedDiscount > targetNormal) {
      return res.status(400).json({
        success: false,
        message: "Discount cannot exceed normal fee",
      });
    }

    let calculatedFinal = Math.max(0, targetNormal - calculatedDiscount);
    if (finalFee !== undefined && !isNaN(Number(finalFee))) {
      calculatedFinal = Number(finalFee);
    }

    quota.quotaName = quotaName !== undefined ? quotaName.trim() : quota.quotaName;
    quota.department = department !== undefined ? department : quota.department;
    quota.departmentName = departmentName !== undefined ? departmentName : quota.departmentName;
    quota.course = course !== undefined ? course : quota.course;
    quota.courseName = courseName !== undefined ? courseName : quota.courseName;
    quota.feeType = feeType !== undefined ? feeType : quota.feeType;
    quota.normalFee = targetNormal;
    quota.discountType = targetDiscType;
    quota.discountValue = targetDiscVal;
    quota.discountAmount = calculatedDiscount;
    quota.finalFee = calculatedFinal;
    quota.academicYear = academicYear !== undefined ? academicYear.trim() : quota.academicYear;
    quota.status = status !== undefined ? status : quota.status;

    await quota.save();

    emitUpdate(req, "updated", quota);

    return res.status(200).json({
      success: true,
      message: "Quota updated successfully",
      quota,
      data: quota,
    });
  } catch (error) {
    console.error("Update quota error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update quota",
      error: error.message,
    });
  }
};

// @desc    Delete quota
// @route   DELETE /api/quotas/:id
// @access  Private
export const deleteQuota = async (req, res) => {
  try {
    const quota = await Quota.findById(req.params.id);
    if (!quota) {
      return res.status(404).json({ success: false, message: "Quota not found" });
    }

    await Quota.findByIdAndDelete(req.params.id);

    emitUpdate(req, "deleted", { id: req.params.id });

    return res.status(200).json({
      success: true,
      message: "Quota removed successfully",
    });
  } catch (error) {
    console.error("Delete quota error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete quota",
      error: error.message,
    });
  }
};
