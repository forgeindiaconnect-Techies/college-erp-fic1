import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    departmentId: {
      type: String,
      required: true,
      trim: true
    },

    collegeId: {
      type: String,
      required: true,
      trim: true
    },

    degreeType: {
      type: String,
      enum: ["UG", "PG", "Diploma", "Certificate"],
      required: true
    },

    durationYears: {
      type: Number,
      required: true,
      min: 1,
      max: 6
    },

    totalSemesters: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true
  }
);

courseSchema.index(
  { collegeId: 1, code: 1 },
  { unique: true }
);

const Course = mongoose.model("Course", courseSchema);

export default Course;
