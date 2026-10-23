import mongoose from 'mongoose';

const parcelLogSchema = new mongoose.Schema({
  parcelId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['Delivery', 'Parcel'],
    default: 'Parcel'
  },
  deliveryCompany: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    default: ''
  },
  otherCompany: {
    type: String,
    default: ''
  },
  // Unique staff database reference
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  staffId: {
    type: String,
    default: ''
  },
  recipientName: {
    type: String,
    required: true
  },
  recipientEmail: {
    type: String,
    default: ''
  },
  recipientPhone: {
    type: String,
    default: ''
  },
  recipientType: {
    type: String,
    enum: ['Staff', 'Faculty', 'HOD', 'Department', 'Student', 'Hostel Warden', 'Principal', 'Principal / Admin', 'Other'],
    default: 'Staff'
  },
  department: {
    type: String,
    default: 'General'
  },
  trackingNumber: {
    type: String,
    default: ''
  },
  parcelDetails: {
    type: String,
    default: 'Standard Package'
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Received', 'Pending Collection', 'Collected', 'Received at Gate', 'Handed Over', 'Returned / Dispatched'],
    default: 'Received'
  },
  collectedAt: {
    type: Date,
    default: null
  },
  collectedBy: {
    type: String,
    default: ''
  },
  collectedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  handedOverAt: {
    type: Date,
    default: null
  },
  handedOverTo: {
    type: String,
    default: ''
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  watchmanName: {
    type: String,
    default: 'Security Gate Staff'
  },
  watchmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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

// Ensure fast lookup by recipient and status
parcelLogSchema.index({ recipientId: 1, status: 1 });
parcelLogSchema.index({ staffId: 1, status: 1 });
parcelLogSchema.index({ tenantId: 1, receivedAt: -1 });

export default mongoose.models.ParcelLog || mongoose.model('ParcelLog', parcelLogSchema);
