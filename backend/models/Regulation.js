import mongoose from 'mongoose';

const regulationSchema = new mongoose.Schema({
  collegeId: { type: String, required: false },
  regulationName: { type: String, required: true }, // e.g., 'R2023'
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Prevent duplicate regulations per college
regulationSchema.index({ collegeId: 1, regulationName: 1 }, { unique: true });

export default mongoose.model('Regulation', regulationSchema);
