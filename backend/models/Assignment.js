import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  class: { // Target Semester (e.g. "Sem 6")
    type: String,
    required: true
  },
  description: {
    type: String
  },
  dueDate: {
    type: Date,
    required: true
  },
  faculty: {
    type: String,
    required: true
  },
  submissionsCount: {
    type: Number,
    default: 0
  }
, collegeId: { type: String } }, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
