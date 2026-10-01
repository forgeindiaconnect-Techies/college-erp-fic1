import mongoose from 'mongoose';

const libraryClearanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },

    admissionNumber: {
      type: String,
      required: true,
      index: true
    },

    studentName: {
      type: String,
      required: true
    },

    department: {
      type: String,
      default: ''
    },

    academicYear: {
      type: String,
      default: ''
    },

    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },

    remarks: {
      type: String,
      default: ''
    },

    requestedAt: {
      type: Date,
      default: Date.now
    },

    approvedAt: {
      type: Date
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    collegeId: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

export default mongoose.model('LibraryClearance', libraryClearanceSchema);
