import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    default: 'General Subject',
    trim: true
  },
  department: {
    type: String,
    default: 'General',
    trim: true
  },
  class: { // Target Semester (e.g. "Sem 1", "Semester 1")
    type: String,
    default: 'Semester 1',
    trim: true
  },
  semester: {
    type: String,
    default: 'Semester 1',
    trim: true
  },
  course: {
    type: String,
    default: '',
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  dueDate: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  faculty: {
    type: String,
    default: 'Faculty',
    trim: true
  },
  facultyId: {
    type: String,
    default: null
  },
  departmentId: {
    type: String,
    default: null
  },
  courseId: {
    type: String,
    default: null
  },
  semesterId: {
    type: String,
    default: null
  },
  section: {
    type: String,
    default: 'All'
  },
  sectionId: {
    type: String,
    default: null
  },
  submissionsCount: {
    type: Number,
    default: 0
  },
  collegeId: {
    type: String,
    default: 'unassigned_college'
  },
  tenantId: {
    type: String,
    default: 'unassigned_college'
  }
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
