import mongoose from "mongoose";

const quotaSchema = new mongoose.Schema(
  {
    quotaName: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Department",
      required: true,
    },

    departmentName: {
      type: String,
      trim: true,
      default: "",
    },

    course: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Course",
    },

    courseName: {
      type: String,
      trim: true,
      default: "",
    },

    feeType: {
      type: String,
      default: "Tuition Fee / Course Fee",
      trim: true,
    },

    normalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discountType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
      default: "fixed",
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    academicYear: {
      type: String,
      required: true,
      default: "2026-2027",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    collegeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "College",
      default: "COL001",
      index: true,
    },

    organization: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Organization",
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index for fast department & college filtering
quotaSchema.index({ department: 1, academicYear: 1, status: 1, collegeId: 1 });

export default mongoose.model("Quota", quotaSchema);
