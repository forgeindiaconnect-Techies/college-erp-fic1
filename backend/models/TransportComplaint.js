import mongoose from 'mongoose';

const transportComplaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  name: { type: String, required: true },
  busNumber: { type: String },
  routeId: { type: String },
  complaintType: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, default: 'Pending' }, // Pending, In Progress, Resolved
  assignedTo: { type: String }, // Staff/Admin assigned to resolve
  department: { type: String }, // Assigned Department based on category
  resolutionNote: { type: String }, // Note left by staff upon resolution
  resolvedAt: { type: Date },
  reporterType: { type: String, default: 'Student' }, // Student, Parent, Driver
  replies: [{
    sender: { type: String },
    role: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  timeline: [{
    action: { type: String },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportComplaint', transportComplaintSchema);
