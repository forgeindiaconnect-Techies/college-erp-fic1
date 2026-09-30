import mongoose from 'mongoose';

const libraryReturnRequestSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryTransaction',
      required: true,
      index: true
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },
    bookCopyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookCopy'
    },
    userId: {
      type: String,
      required: true
    },
    userType: {
      type: String,
      enum: ['Student', 'Staff'],
      required: true
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    processedDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
      default: 'Pending'
    },
    remarks: {
      type: String,
      trim: true
    },
    collegeId: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
);

libraryReturnRequestSchema.index({
  collegeId: 1,
  transactionId: 1,
  status: 1
});

const LibraryReturnRequest = mongoose.model(
  'LibraryReturnRequest',
  libraryReturnRequestSchema
);

export default LibraryReturnRequest;
