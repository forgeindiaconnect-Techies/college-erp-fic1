import mongoose from 'mongoose';

const watchmanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  address: {
    type: String,
    default: '',
    trim: true
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Night'],
    default: 'Morning'
  },
  assignedGate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  emergencyContact: {
    name: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    relation: { type: String, default: '', trim: true }
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

watchmanSchema.pre('save', function() {
  if (this.email) this.email = this.email.trim().toLowerCase();
});

export default mongoose.models.Watchman || mongoose.model('Watchman', watchmanSchema);
