import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema({
  collegeId: { type: String, required: false },
  year: { type: String, required: true }, // e.g., '2026-2027'
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate years per college
academicYearSchema.index({ collegeId: 1, year: 1 }, { unique: true });

export default mongoose.model('AcademicYear', academicYearSchema);
