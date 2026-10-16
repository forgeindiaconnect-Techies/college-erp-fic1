import mongoose from 'mongoose';

const securityVehicleLogSchema = new mongoose.Schema({
  vehicleLogId: {
    type: String,
    required: true,
    unique: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['Two Wheeler', 'Four Wheeler (Car/SUV)', 'College Bus', 'Commercial / Delivery Van', 'Heavy Vehicle / Truck', 'Auto Rickshaw', 'Other']
  },
  driverName: {
    type: String,
    required: true
  },
  driverPhone: {
    type: String,
    default: ''
  },
  purpose: {
    type: String,
    required: true,
    enum: ['Staff Parking', 'Visitor Entry', 'Student Commute', 'Goods / Delivery', 'Maintenance / Contractor', 'VIP / Official Guest', 'Other']
  },
  destination: {
    type: String,
    default: 'Campus Parking'
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
    enum: ['Inside', 'Exited'],
    default: 'Inside'
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  watchmanName: {
    type: String,
    default: 'Security Gate Staff'
  },
  exitWatchmanName: {
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

export default mongoose.models.SecurityVehicleLog || mongoose.model('SecurityVehicleLog', securityVehicleLogSchema);
