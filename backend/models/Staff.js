import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  dept: { type: String, required: true },
  deptCode: { type: String, default: '' },
  role: { type: String },
  designation: { type: String },
  subjects: { type: [String], default: [] },
  workload: { type: Number, default: 0 },
  attendance: { type: Number, default: 0 },
  qualification: { type: String, default: '' },
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

staffSchema.pre('save', function() {
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.phone) {
    const d = String(this.phone).trim().replace(/\D/g, '');
    this.phone = (d.length === 12 && d.startsWith('91')) ? d.slice(2) : ((d.length === 11 && d.startsWith('0')) ? d.slice(1) : d);
  }
});

// Compound unique index: same staff ID / email is allowed across different colleges
staffSchema.index({ id: 1, collegeId: 1 }, { unique: true });
staffSchema.index({ email: 1, collegeId: 1 }, { unique: true });

export default mongoose.model('Staff', staffSchema);
