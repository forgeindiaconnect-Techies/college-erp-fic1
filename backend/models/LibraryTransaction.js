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
  userType: { type: String, default: 'Student' },
  requestDate: { type: Date, default: Date.now },
  approvedDate: { type: Date },
  issueDate: { type: Date },
  dueDate: { type: Date },
  returnDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  finePaid: { type: Number, default: 0 },
  fineStatus: { type: String, enum: ['No Fine', 'Pending', 'Paid'], default: 'No Fine' },
  finePaidDate: { type: Date },
  status: { type: String, enum: ['Pending', 'Approved', 'Reserved', 'Issued', 'Returned', 'Overdue', 'Rejected', 'Cancelled', 'Completed'], default: 'Pending' },
  collegeId: { type: String, index: true },
  tenantId: { type: String, index: true }
}, { timestamps: true, strict: false });

const LibraryTransaction = mongoose.model('LibraryTransaction', libraryTransactionSchema);

export default LibraryTransaction;
