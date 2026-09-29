import mongoose from 'mongoose';

const libraryFinePaymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryTransaction',
      required: true,
      index: true
    },

    receiptNumber: {
      type: String,
      required: true,
      trim: true
    },

    collegeId: {
      type: String,
      required: true,
      index: true
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

    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'],
      default: 'Cash'
    },

    paymentDate: {
      type: Date,
      default: Date.now
    },

    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    remarks: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

libraryFinePaymentSchema.index(
  { collegeId: 1, receiptNumber: 1 },
  { unique: true }
);

const LibraryFinePayment = mongoose.model(
  'LibraryFinePayment',
  libraryFinePaymentSchema
);

export default LibraryFinePayment;
