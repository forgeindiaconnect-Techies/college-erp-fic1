import mongoose from 'mongoose';

const campusPersonSchema = new mongoose.Schema({
  personId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  personType: {
    type: String,
    enum: ['Student', 'Staff', 'HOD', 'Visitor', 'Contractor', 'Parent', 'Other', 'Guest'],
    default: 'Visitor',
    index: true
  },
  phone: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  email: {
    type: String,
    default: '',
    trim: true
  },
  department: {
    type: String,
    default: 'General'
  },
  designation: {
    type: String,
    default: ''
  },
  vehicleNumber: {
    type: String,
    default: '',
    trim: true
  },
  idProofType: {
    type: String,
    default: 'College ID / Govt ID'
  },
  idProofNumber: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  // Real-time campus presence state
  currentStatus: {
    type: String,
    enum: ['Inside Campus', 'Outside Campus'],
    default: 'Outside Campus',
    index: true
  },
  lastEntryTime: {
    type: Date,
    default: null
  },
  lastExitTime: {
    type: Date,
    default: null
  },
  lastGate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  totalVisits: {
    type: Number,
    default: 0
  },
  collegeId: {
    type: String,
    index: true
  },
  tenantId: {
    type: String,
    index: true
  }
}, { timestamps: true });

export default mongoose.models.CampusPerson || mongoose.model('CampusPerson', campusPersonSchema);
