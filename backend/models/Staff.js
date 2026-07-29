import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  dept: { type: String, required: true },
  deptCode: { type: String, default: '' },
  role: { type: String },
  designation: { type: String },
  subjects: { type: [String], default: [] },
  workload: { type: Number, default: 0 },
  attendance: { type: Number, default: 0 },
  experience: { type: String, default: '' },
  passRate: { type: Number, default: 0 },
  publications: { type: Number, default: 0 },
  faculty: { type: Number, default: 0 },
  students: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  joinDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Active' },
  collegeId: { type: String }
}, { timestamps: true });

// Compound unique index: same staff ID / email is allowed across different colleges
staffSchema.index({ id: 1, collegeId: 1 }, { unique: true });
staffSchema.index({ email: 1, collegeId: 1 }, { unique: true });

export default mongoose.model('Staff', staffSchema);
