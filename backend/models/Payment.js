import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student"
    },
    admissionId: {
      type: String
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student"
    },
    studentId: {
      type: String
    },
    studentName: {
      type: String
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College"
    },
    collegeId: {
      type: String
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    paymentMode: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
        "Cheque",
        "Other"
      ],
      required: true,
      default: "Cash"
    },
    transactionReference: {
      type: String,
      trim: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    remarks: {
      type: String,
      trim: true
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    collectorName: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Payment", paymentSchema);
