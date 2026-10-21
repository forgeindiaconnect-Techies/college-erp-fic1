import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Principal – HOD Review Meeting'
  },
  type: {
    type: String,
    default: 'HOD Review'
  },
  collegeId: {
    type: String,
    default: null
  },
  tenantId: {
    type: String,
    default: null
  },
  organizer: {
    name: { type: String, default: 'Dr. Ramoorthy (Principal)' },
    role: { type: String, default: 'Principal' },
    email: { type: String, default: 'principal@college.edu' },
    id: { type: String, default: null }
  },
  hodId: {
    type: String,
    required: true,
    index: true
  },
  hodUserId: {
    type: String,
    default: null,
    index: true
  },
  hodName: {
    type: String,
    required: true
  },
  hodEmail: {
    type: String,
    required: true,
    index: true
  },
  hodDept: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  dateTime: {
    type: Date,
    default: null
  },
  agenda: {
    type: String,
    required: true
  },
  venue: {
    type: String,
    default: 'Principal Office / Executive Conference Room'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled'],
    default: 'Scheduled',
    index: true
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.models.Meeting || mongoose.model('Meeting', meetingSchema);
