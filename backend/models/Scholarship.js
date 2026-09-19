import mongoose from "mongoose";

const ScholarshipSchema = new mongoose.Schema(
  {
    scholarshipName: {
      type: String,
      required: true,
      trim: true,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    scholarshipType: {
      type: String,
      enum: ["Percentage", "Fixed Amount"],
      required: true,
    },

    scholarshipValue: {
      type: Number,
      required: true,
      min: 0,
    },

    maximumAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    eligibility: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    collegeId: {
      type: mongoose.Schema.Types.Mixed,
      default: "COL001",
      index: true,
    },

    organization: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Scholarship =
  mongoose.models.Scholarship ||
  mongoose.model("Scholarship", ScholarshipSchema);

export default Scholarship;
