import mongoose from "mongoose";

const feeStructureSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "College",
      required: true,
      index: true,
    },

    academicYear: {
      type: String,
      required: true,
    },

    course: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    semester: {
      type: Number,
      required: true,
    },

    fees: [
      {
        feeType: {
          type: String,
          required: true,
          trim: true,
        },

        amount: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

feeStructureSchema.index(
  {
    collegeId: 1,
    academicYear: 1,
    course: 1,
    department: 1,
    semester: 1,
  },
  { unique: true }
);

export default mongoose.model("FeeStructure", feeStructureSchema);
