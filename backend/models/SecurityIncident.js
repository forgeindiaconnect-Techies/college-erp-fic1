import mongoose from 'mongoose';

const securityIncidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Unauthorized Entry',
      'Theft / Missing Property',
      'Disciplinary / Altercation',
      'Traffic / Speeding Violation',
      'Property Damage / Vandalism',
      'Medical Emergency',
      'Fire / Electrical Hazard',
      'Suspicious Activity / Loitering',
      'Other'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  incidentTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Open', 'Under Investigation', 'Resolved', 'Closed'],
    default: 'Open'
  },
  reportedBy: {
    type: String,
    required: true
  },
  reportedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actionTaken: {
    type: String,
    default: ''
  },
  resolutionNotes: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: ''
  },
  gate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
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

export default mongoose.models.SecurityIncident || mongoose.model('SecurityIncident', securityIncidentSchema);
