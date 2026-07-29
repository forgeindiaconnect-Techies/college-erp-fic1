import mongoose from 'mongoose';

const ClassAdvisorSchema = new mongoose.Schema({
  collegeId: {
    type: String,
    required: true,
  },
  academicYear: {
    type: String,
    required: true,
    default: '2026-2027'
  },
  department: {
    type: String,
    required: true,
  },
  semester: {
    type: String,
    required: true,
  },
  section: {
    type: String,
    required: true,
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
  },
}, { timestamps: true });

// Ensure only one advisor per class section
ClassAdvisorSchema.index({ collegeId: 1, department: 1, semester: 1, section: 1 }, { unique: true });

const ClassAdvisor = mongoose.model('ClassAdvisor', ClassAdvisorSchema);
export default ClassAdvisor;
