import mongoose from 'mongoose';

const facultyAllocationSchema = new mongoose.Schema({
  collegeId: { type: String, required: false },
  department: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  regulationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Regulation' },
  assignedBy: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent assigning the same subject to the same section twice
facultyAllocationSchema.index({ collegeId: 1, department: 1, semester: 1, section: 1, subjectId: 1 }, { unique: true });

export default mongoose.model('FacultyAllocation', facultyAllocationSchema);
