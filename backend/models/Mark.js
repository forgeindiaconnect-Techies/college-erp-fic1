import mongoose from 'mongoose';

const markSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam'
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },

  academicYearId: { type: String },
  courseId: { type: String },
  semesterId: { type: String },
  sectionId: { type: String },
  section: { type: String },

  studentId: { type: String, required: true },
  studentName: { type: String },
  registerNo: { type: String },
  department: { type: String },
  semester: { type: String, required: true },
  subject: { type: String, required: true },

  internalMarks: { type: Number, default: 0 },
  semesterMarks: { type: Number, default: 0 },
  marksObtained: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  maxMarks: { type: Number, default: 100 },
  passMarks: { type: Number, default: 40 },

  grade: { type: String },
  gpa: { type: Number, default: 0 },
  cgpa: { type: Number, default: 0 },
  arrearStatus: { type: String, default: 'Clear' },

  resultStatus: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft'
  },
  publishedAt: { type: Date },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  collegeId: { type: String, index: true }
}, { timestamps: true });

export default mongoose.model('Mark', markSchema);
