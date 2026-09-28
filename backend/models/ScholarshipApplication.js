import mongoose from 'mongoose';

const scholarshipApplicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  scholarship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scholarship',
    required: true
  },
  scholarshipName: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  scholarshipType: {
    type: String,
    enum: ['Fixed Amount', 'Percentage'],
    required: true
  },
  scholarshipValue: {
    type: Number,
    default: 0
  },
  maximumAmount: {
    type: Number,
    default: 0
  },
  originalFee: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  finalFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Applied'],
    default: 'Pending'
  },
  collegeId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('ScholarshipApplication', scholarshipApplicationSchema);
