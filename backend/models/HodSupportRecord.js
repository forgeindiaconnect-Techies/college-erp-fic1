import mongoose from 'mongoose';

const hodSupportSchema = new mongoose.Schema({
  hodName: { type: String, required: true },
  department: { type: String, required: true },
  requestType: { type: String, required: true }, // 'Faculty Support', 'Student Escalations', 'Resource Requests', 'Exam Support', 'Budget & Finance', 'Placement Coordination', 'Academic Planning'
  subType: { type: String }, 
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status: { type: String, enum: ['Draft', 'Submitted', 'Under Review', 'Pending', 'Approved', 'Rejected', 'Completed'], default: 'Submitted' },
  timeline: [{
    date: { type: String },
    text: { type: String }
  }]
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('HodSupportRecord', hodSupportSchema);
