import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  hod: { type: String },
  students: { type: Number, default: 0 },
  staff: { type: Number, default: 0 },
  established: { type: Number },
  status: { type: String, default: 'Active' },
  collegeId: { type: String, required: true }
}, { timestamps: true });

// Optional: compound index if you want uniqueness per college
departmentSchema.index({ code: 1, collegeId: 1 }, { unique: true });

export default mongoose.model('Department', departmentSchema);
