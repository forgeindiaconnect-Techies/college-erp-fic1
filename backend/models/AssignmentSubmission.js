import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema({
  collegeId: {
    type: String,
    required: true
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  studentId: { // referenceId like 'STU001' or actual ObjectId
    type: String,
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Submitted'
  }
}, { timestamps: true });

assignmentSubmissionSchema.index(
  {
    collegeId: 1,
    assignmentId: 1,
    studentId: 1
  },
  {
    unique: true
  }
);

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
export default AssignmentSubmission;
