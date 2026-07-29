import mongoose from 'mongoose';

const libraryTransactionSchema = new mongoose.Schema({
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  userId: { type: String, required: true }, // referenceId for student/staff
  userType: { type: String, enum: ['Student', 'Staff'], required: true },
  requestDate: { type: Date, default: Date.now },
  issueDate: { type: Date },
  dueDate: { type: Date },
  returnDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Issued', 'Returned', 'Overdue', 'Rejected'], default: 'Pending' }
, collegeId: { type: String } }, { timestamps: true });

const LibraryTransaction = mongoose.model('LibraryTransaction', libraryTransactionSchema);

export default LibraryTransaction;
