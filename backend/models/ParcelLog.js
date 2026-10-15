import mongoose from 'mongoose';

const parcelLogSchema = new mongoose.Schema({
  parcelId: {
    type: String,
    required: true,
    unique: true
  },
  deliveryCompany: {
    type: String,
    required: true,
    enum: ['Amazon', 'Flipkart', 'Blue Dart', 'DTDC', 'India Post / Speed Post', 'Delhivery', 'FedEx', 'Swiggy / Zomato', 'Courier', 'Other']
  },
  otherCompany: {
    type: String,
    default: ''
  },
  recipientName: {
    type: String,
    required: true
  },
  recipientPhone: {
    type: String,
    default: ''
  },
  recipientType: {
    type: String,
    enum: ['Student', 'Faculty', 'Staff', 'Department', 'Hostel Warden', 'Principal / Admin', 'Other'],
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
    enum: ['Received at Gate', 'Handed Over', 'Returned / Dispatched'],
    default: 'Received at Gate'
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

export default mongoose.models.ParcelLog || mongoose.model('ParcelLog', parcelLogSchema);
