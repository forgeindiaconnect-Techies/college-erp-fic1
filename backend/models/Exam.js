import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sem: {
    type: String,
    required: true,
    default: 'Sem 3'
  },
  dept: {
    type: String,
    required: true
  },
  subject: {
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
  room: {
    type: String,
    required: true
  },
  maxMarks: {
    type: Number,
    required: true,
    default: 100
  },
  createdBy: {
    type: String,
    default: 'System'
  },
  collegeId: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Exam', examSchema);
