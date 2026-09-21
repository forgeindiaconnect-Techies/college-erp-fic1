import mongoose from 'mongoose';

const hostelRequestSchema = new mongoose.Schema({
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

  department: {
    type: String,
    default: ''
  },

  course: {
    type: String,
    default: ''
  },

  semester: {
    type: String,
    default: ''
  },

  academicYear: {
    type: String,
    default: ''
  },

  quotaName: {
    type: String,
    default: 'General Quota'
  },

  hostelRequired: {
    type: Boolean,
    default: true
  },

  hostelFee: {
    type: Number,
    default: 0
  },

  hostelFeeStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending'
  },

  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Allocated'],
    default: 'Pending'
  },

  block: {
    type: String,
    default: ''
  },

  room: {
    type: String,
    default: ''
  },

  bed: {
    type: String,
    default: ''
  },

  wardenName: {
    type: String,
    default: ''
  },

  collegeId: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('HostelRequest', hostelRequestSchema);
