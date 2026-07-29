import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  collegeId: {
    type: String,
    required: false
  },
  regulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Regulation',
    required: false
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  subjectCode: {
    type: String,
    required: true
  },
  subjectName: {
    type: String,
    required: true
  },
  teacher: {
    type: String,
    default: ''
  },
  credits: {
    type: Number,
    default: 4
  },
  workload: {
    type: Number,
    default: 4
  },
  type: {
    type: String,
    enum: ['Theory', 'Lab'],
    default: 'Theory'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Prevent duplicate subject codes per college
subjectSchema.index({ collegeId: 1, subjectCode: 1 }, { unique: true });

export default mongoose.model('Subject', subjectSchema);
