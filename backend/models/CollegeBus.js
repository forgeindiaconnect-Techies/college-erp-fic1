import mongoose from 'mongoose';

const collegeBusSchema = new mongoose.Schema({
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
    required: true,
    trim: true
  },
  route: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    default: 50
  },
  collegeId: {
    type: String,
    default: 'COL001'
  },
  collegeName: {
    type: String,
    default: ''
  },
  tenantId: {
    type: String,
    default: 'COL001'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Maintenance'],
    default: 'Active'
  },
  currentStatus: {
    type: String,
    enum: ['Not Arrived', 'Arrived', 'Departed'],
    default: 'Not Arrived'
  },
  lastEntryTime: {
    type: Date,
    default: null
  },
  lastExitTime: {
    type: Date,
    default: null
  },
  lastMovementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusMovementLog',
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for multi-tenant and fast lookup
collegeBusSchema.index({ collegeId: 1, busNumber: 1 });
collegeBusSchema.index({ tenantId: 1, currentStatus: 1 });

const CollegeBus = mongoose.models.CollegeBus || mongoose.model('CollegeBus', collegeBusSchema);

export default CollegeBus;
