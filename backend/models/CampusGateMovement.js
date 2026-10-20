import mongoose from 'mongoose';

const campusGateMovementSchema = new mongoose.Schema({
  movementId: {
    type: String,
    required: true,
    unique: true
  },
  personType: {
    type: String,
    required: true,
    enum: ['Student', 'Staff', 'HOD', 'Visitor', 'Contractor', 'Parent', 'Other', 'Guest'],
    default: 'Other'
  },
  personId: {
    type: String,
    required: true // Student Roll/Reg No, Staff Employee ID, or Person Pass ID
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: 'General'
  },
  semester: {
    type: String,
    default: ''
  },
  designation: {
    type: String,
    default: ''
  },
  direction: {
    type: String,
    required: true,
    default: 'In'
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  durationFormatted: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: 'Regular Campus Entry / Exit'
  },
  gatePassId: {
    type: String,
    default: ''
  },
  vehicleNumber: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  watchmanName: {
    type: String,
    default: 'Security Gate Staff'
  },
  remarks: {
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

export default mongoose.models.CampusGateMovement || mongoose.model('CampusGateMovement', campusGateMovementSchema);
