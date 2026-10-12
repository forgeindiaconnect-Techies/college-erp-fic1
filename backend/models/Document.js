import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  collegeId: { type: String, required: true, index: true },
  personId: { type: String, required: true },
  personName: { type: String, required: true },
  category: { type: String, enum: ['Student', 'Staff', 'HOD'], required: true },
  department: { type: String, default: '' },
  documentType: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending Submission', 'Submitted', 'Verified', 'Rejected'],
    default: 'Submitted'
  },
  storedFileName: { type: String, default: '' },
  originalFileName: { type: String, default: '' },
  cloudinaryUrl: { type: String, default: '' },
  cloudinaryPublicId: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: { type: String, default: '' },
  verifiedAt: { type: Date, default: null },
  remarks: { type: String, default: '' }
}, { timestamps: true });

documentSchema.index({ collegeId: 1, personId: 1, documentType: 1 });

export default mongoose.model('Document', documentSchema);
