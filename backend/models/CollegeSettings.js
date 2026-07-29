import mongoose from 'mongoose';

const collegeSettingsSchema = new mongoose.Schema({
  collegeId: { 
    type: String, 
    required: true 
  },
  tenantId: {
    type: String,
    required: true
  },
  collegeLogo: { type: String, default: '' },
  collegeName: { type: String, default: 'My College' },
  primaryColor: { type: String, default: '#4f46e5' },
  secondaryColor: { type: String, default: '#3b82f6' },
  timezone: { type: String, default: 'Asia/Kolkata (IST)' },
  currency: { type: String, default: 'INR (₹)' },
  academicYear: { type: String, default: '2026-2027' },
  attendanceEnabled: { type: Boolean, default: true },
  hostelEnabled: { type: Boolean, default: true },
  transportEnabled: { type: Boolean, default: true },
  libraryEnabled: { type: Boolean, default: true },
  placementEnabled: { type: Boolean, default: true },
  examEnabled: { type: Boolean, default: true }
}, { timestamps: true });

// Note: since this is NOT excluded in context.js, it will automatically be filtered
// and assigned a collegeId on creation. We use String for collegeId as it matches
// the system's global multi-tenant implementation format.

export default mongoose.model('CollegeSettings', collegeSettingsSchema);
