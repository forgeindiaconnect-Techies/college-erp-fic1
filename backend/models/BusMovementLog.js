import mongoose from 'mongoose';

const busMovementLogSchema = new mongoose.Schema({
  movementId: {
    type: String,
    required: true,
    unique: true
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CollegeBus',
    required: true
  },
  busNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  contactNumber: {
    type: String,
    default: '',
    trim: true
  },
  route: {
    type: String,
    required: true,
    trim: true
  },
  dateStr: {
    type: String,
    required: true // YYYY-MM-DD
  },
  status: {
    type: String,
    enum: ['Arrived', 'Departed'],
    required: true
  },
  entryTime: {
    type: Date,
    required: true
  },
  exitTime: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  durationFormatted: {
    type: String,
    default: 'Inside Campus'
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  entryWatchmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  entryWatchmanName: {
    type: String,
    default: 'Gate Security Staff'
  },
  exitWatchmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
}, {
  timestamps: true
});

busMovementLogSchema.index({ dateStr: 1, busNumber: 1 });
busMovementLogSchema.index({ collegeId: 1, dateStr: 1 });
busMovementLogSchema.index({ status: 1, entryTime: -1 });

const BusMovementLog = mongoose.models.BusMovementLog || mongoose.model('BusMovementLog', busMovementLogSchema);

export default BusMovementLog;
