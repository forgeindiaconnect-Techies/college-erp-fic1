import mongoose from 'mongoose';

const markSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String },
  registerNo: { type: String },
  department: { type: String },
  semester: { type: String, required: true },
  subject: { type: String, required: true },
  internalMarks: { type: Number, required: true },
  semesterMarks: { type: Number, required: true },
  totalMarks: { type: Number },
  grade: { type: String },
  gpa: { type: Number },
  cgpa: { type: Number },
  arrearStatus: { type: String }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('Mark', markSchema);
