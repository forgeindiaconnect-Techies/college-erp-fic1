import mongoose from "mongoose";

const feeItemSchema = new mongoose.Schema(
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
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const studentFeeSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "College",
      required: true,
      index: true,
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    admissionNo: {
      type: String,
      required: true,
      trim: true,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
    },

    semester: {
      type: Number,
      default: 1,
    },

    feeItems: {
      type: [feeItemSchema],
      default: [],
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    balanceAmount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["PENDING", "PARTIALLY_PAID", "PAID"],
      default: "PENDING",
    },

    quota: {
      type: String,
      default: "General / Merit",
    },

    normalAmount: {
      type: Number,
      default: 0,
    },

    concessionAmount: {
      type: Number,
      default: 0,
    },

    finalAmount: {
      type: Number,
      default: 0,
    },

    paymentMode: {
      type: String,
      default: "Cash",
    },

    receiptNo: {
      type: String,
      default: "",
    },

    lastPaymentDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

studentFeeSchema.index(
  { collegeId: 1, studentId: 1, academicYear: 1 },
  { unique: true }
);

export default mongoose.model("StudentFee", studentFeeSchema);
