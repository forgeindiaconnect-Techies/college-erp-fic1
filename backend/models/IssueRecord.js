import mongoose from 'mongoose';

const issueRecordSchema = new mongoose.Schema({
  issueId: { type: String, required: true, unique: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  bookTitle: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  studentName: { type: String, required: true },
  regNo: { type: String, required: true },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date },
  status: { type: String, enum: ['Issued', 'Overdue', 'Returned'], default: 'Issued' },
  fine: { type: Number, default: 0 },
  conditionOnReturn: { type: String, enum: ['Good', 'Damaged', 'Lost', 'Pending'], default: 'Pending' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('IssueRecord', issueRecordSchema);
