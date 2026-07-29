import mongoose from 'mongoose';

const vehicleIssueSchema = new mongoose.Schema({
  issueId: { type: String, required: true, unique: true },
  vehicleId: { type: String, required: true },
  driverId: { type: String, required: true },
  issueType: { type: String, required: true }, // Engine Problem, Tyre Damage, Brake Issue, AC Problem, Other Issues
  description: { type: String },
  status: { type: String, required: true, default: 'Pending' }, // Pending, In Progress, Resolved
}, {
  timestamps: true,
});

const VehicleIssue = mongoose.models.VehicleIssue || mongoose.model('VehicleIssue', vehicleIssueSchema);

export default VehicleIssue;
