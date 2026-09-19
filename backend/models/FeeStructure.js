import mongoose from "mongoose";

const feeStructureSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    quota: {
      type: String,
      required: false,
    },

    tuitionFee: {
      type: Number,
      required: true,
      default: 0,
    },

    otherFees: {
      type: Number,
      default: 0,
    },

    totalFee: {
      type: Number,
      required: true,
    },

    // Multitenancy & legacy compatibility support
    collegeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "College",
      default: "COL001",
      index: true,
    },
    department: {
      type: String,
    },
    semester: {
      type: Number,
    },
    fees: [
      {
        feeType: { type: String, trim: true },
        amount: { type: Number, min: 0 },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for quota-wise structures
feeStructureSchema.index(
  { academicYear: 1, course: 1, quota: 1 },
  { unique: false }
);

const FeeStructure = mongoose.model("FeeStructure", feeStructureSchema);

export default FeeStructure;
