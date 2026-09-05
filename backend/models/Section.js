import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
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

    semesterId: {
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

    classTeacherId: {
      type: String,
      default: null
    },

    roomNumber: {
      type: String,
      trim: true,
      default: ""
    },

    maximumStudents: {
      type: Number,
      default: 60,
      min: 1
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

sectionSchema.index(
  {
    collegeId: 1,
    courseId: 1,
    semesterId: 1,
    academicYearId: 1,
    name: 1
  },
  {
    unique: true
  }
);

const Section = mongoose.model("Section", sectionSchema);

export default Section;
