import mongoose from 'mongoose';

const feePlanSchema = new mongoose.Schema(
  {
    departmentId: { type: String, required: true },
    departmentName: { type: String, required: true },

    courseId: { type: String, required: true },
    courseName: { type: String, required: true },

    semester: { type: String, required: true },
    academicYear: { type: String, default: '' },

    tuitionFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    labFee: { type: Number, default: 0 },
    libraryFee: { type: Number, default: 0 },

    transportFee: { type: Number, default: 0 },
    hostelFee: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active'
    },

    collegeId: { type: String, required: true }
  },
  { timestamps: true }
);

feePlanSchema.index(
  {
    collegeId: 1,
    departmentId: 1,
    courseId: 1,
    semester: 1,
    academicYear: 1
  },
  { unique: true }
);

export default mongoose.model('FeePlan', feePlanSchema);
