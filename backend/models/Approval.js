import mongoose from 'mongoose';

const approvalSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Budget Request', 'Leave Request', 'Department Event', 'Exam Approval', 'Placement Drive', 'Student Request', 'Announcements', 'Staff Requests', 'Staff Onboarding']
  },
  department: {
    type: String,
    required: true
  },
  requestedBy: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  details: {
    type: String,
    required: true
  },
  aiRecommendation: {
    type: String,
    default: 'Safe to Approve. Budget is within quarterly department allocations.'
  },
  aiScore: {
    type: Number,
    default: 95
  },
  remarks: {
    type: String,
    default: ''
  }
, collegeId: { type: String } }, { timestamps: true });

const Approval = mongoose.model('Approval', approvalSchema);
export default Approval;
