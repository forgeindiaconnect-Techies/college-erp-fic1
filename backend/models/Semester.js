import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
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

    semesterNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },

    courseId: {
      type: String,
      required: true,
      trim: true
    },

    departmentId: {
      type: String,
      required: true,
      trim: true
    },

    academicYearId: {
      type: String,
      required: true,
      trim: true
    },

    collegeId: {
      type: String,
      required: true,
      trim: true
    },

    startDate: {
      type: Date
    },

    endDate: {
      type: Date
    },

    status: {
      type: String,
      enum: ["Upcoming", "Active", "Completed", "Inactive"],
      default: "Upcoming"
    }
  },
  {
    timestamps: true
  }
);

semesterSchema.index(
  { collegeId: 1, courseId: 1, academicYearId: 1, semesterNumber: 1 },
  { unique: true }
);

const Semester = mongoose.model("Semester", semesterSchema);

export default Semester;
