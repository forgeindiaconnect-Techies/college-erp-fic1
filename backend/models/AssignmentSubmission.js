import mongoose from 'mongoose';

const assignmentSubmissionSchema = new mongoose.Schema({
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
, collegeId: { type: String } }, { timestamps: true });

const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
export default AssignmentSubmission;
