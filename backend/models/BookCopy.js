import mongoose from 'mongoose';

const bookCopySchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true
    },

    accessionNumber: {
      type: String,
      required: true,
      trim: true
    },

    barcode: {
      type: String,
      trim: true
    },

    rackNumber: {
      type: String,
      trim: true
    },

    shelfNumber: {
      type: String,
      trim: true
    },

    condition: {
      type: String,
      enum: [
        'New',
        'Good',
        'Fair',
        'Damaged',
        'Lost'
      ],
      default: 'Good'
    },

    status: {
      type: String,
      enum: [
        'Available',
        'Issued',
        'Reserved',
        'Damaged',
        'Lost',
        'Maintenance'
      ],
      default: 'Available'
    },

    purchaseDate: {
      type: Date
    },

    price: {
      type: Number,
      default: 0
    },

    collegeId: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

bookCopySchema.index(
  {
    collegeId: 1,
    accessionNumber: 1
  },
  {
    unique: true
  }
);

bookCopySchema.index(
  {
    collegeId: 1,
    barcode: 1
  },
  {
    unique: true,
    sparse: true
  }
);

const BookCopy = mongoose.model(
  'BookCopy',
  bookCopySchema
);

export default BookCopy;
