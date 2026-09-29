import mongoose from 'mongoose';

const libraryTransactionSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  bookCopyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BookCopy',
    index: true
  },
  userId: { type: String, required: true }, // referenceId for student/staff
  userType: { type: String, enum: ['Student', 'Staff'], required: true },
  requestDate: { type: Date, default: Date.now },
  issueDate: { type: Date },
  dueDate: { type: Date },
  returnDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Number, default: 0 },
  fineStatus: { type: String, enum: ['No Fine', 'Pending', 'Paid'], default: 'No Fine' },
  finePaidDate: { type: Date },
  status: { type: String, enum: ['Pending', 'Issued', 'Returned', 'Overdue', 'Rejected'], default: 'Pending' },
  collegeId: { type: String, index: true }
}, { timestamps: true });

const LibraryTransaction = mongoose.model('LibraryTransaction', libraryTransactionSchema);

export default LibraryTransaction;

