import mongoose from 'mongoose';

const libraryReservationSchema = new mongoose.Schema(
  {
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
      default: 'Student'
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    approvedDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed', 'Issued', 'Reserved'],
      default: 'Pending'
    },
    collegeId: {
      type: String,
      index: true
    },
    tenantId: {
      type: String,
      index: true
    }
  },
  { timestamps: true, strict: false }
);

libraryReservationSchema.index({
  collegeId: 1,
  bookId: 1,
  userId: 1,
  status: 1
});

const LibraryReservation = mongoose.model(
  'LibraryReservation',
  libraryReservationSchema
);

export default LibraryReservation;
