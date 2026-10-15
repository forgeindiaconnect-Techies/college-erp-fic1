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
    enum: ['Student', 'Staff']
  },
  personId: {
    type: String,
    required: true // Student Roll/Reg No or Staff Employee ID
  },
  name: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'General'
  },
  direction: {
    type: String,
    required: true,
    enum: ['In', 'Out']
  },
  reason: {
    type: String,
    required: true,
    enum: ['Regular Campus Entry / Exit', 'Hostel Gate Pass / Outing', 'Official College Duty', 'Medical / Emergency', 'Day Scholar Departure', 'Special Permission']
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
