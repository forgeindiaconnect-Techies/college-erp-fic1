import mongoose from 'mongoose';

const libraryReservationSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
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
    approvedDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed'],
      default: 'Pending'
    },
    collegeId: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
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
