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
  examType: {
    type: String,
    enum: [
      'Internal',
      'CIA 1',
      'CIA 2',
      'CIA 3',
      'Model',
      'Assignment',
      'Practical',
      'Semester',
      'Supplementary'
    ],
    default: 'CIA 1'
  },

  academicYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear'
  },

  regulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Regulation'
  },

  departmentId: {
    type: String
  },

  courseId: {
    type: String
  },

  semesterId: {
    type: String
  },

  sectionId: {
    type: String
  },

  section: {
    type: String
  },

  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject'
  },

  startTime: {
    type: String
  },

  endTime: {
    type: String
  },

  hallName: {
    type: String
  },

  hallCapacity: {
    type: Number,
    default: 0
  },

  invigilatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },

  passMarks: {
    type: Number,
    default: 40
  },

  status: {
    type: String,
    enum: [
      'Draft',
      'Scheduled',
      'Ongoing',
      'Completed',
      'Published',
      'Cancelled'
    ],
    default: 'Draft'
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
