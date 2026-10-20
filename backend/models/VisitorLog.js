import mongoose from 'mongoose';

const visitorLogSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    unique: true
  },
  passNumber: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  purpose: {
    type: String,
    required: true
  },
  personToMeet: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'General'
  },
  vehicleNumber: {
    type: String,
    default: ''
  },
  idProofType: {
    type: String,
    default: 'Aadhaar Card'
  },
  idProofNumber: {
    type: String,
    default: ''
  },
  entryTime: {
    type: Date,
    default: Date.now
  },
  exitTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Inside', 'Checked Out', 'Pre-Registered', 'Approved', 'Rejected', 'Expired'],
    default: 'Inside'
  },
  isPreRegistered: {
    type: Boolean,
    default: false
  },
  expectedDate: {
    type: Date,
    default: null
  },
  expectedTime: {
    type: String,
    default: ''
  },
  approvalStatus: {
    type: String,
    enum: ['Approved', 'Pending', 'Not Required', 'Rejected'],
    default: 'Not Required'
  },
  approvedBy: {
    type: String,
    default: ''
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  watchmanId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  watchmanName: {
    type: String,
    default: 'Security Gate Staff'
  },
  exitWatchmanId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  exitWatchmanName: {
    type: String,
    default: ''
  },
  qrCodeData: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  collegeId: {
    type: String,
    default: 'COL001'
  },
  tenantId: {
    type: String,
    default: 'COL001'
  }
}, { timestamps: true });

export default mongoose.models.VisitorLog || mongoose.model('VisitorLog', visitorLogSchema);
