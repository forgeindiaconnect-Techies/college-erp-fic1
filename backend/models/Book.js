import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  bookId: {
    type: String,
    required: true
  },

  isbn: {
    type: String,
    trim: true
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  author: {
    type: String,
    required: true,
    trim: true
  },

  publisher: {
    type: String,
    trim: true
  },

  edition: {
    type: String,
    trim: true
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  department: {
    type: String,
    required: true,
    trim: true
  },

  subject: {
    type: String,
    trim: true
  },

  totalCopies: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },

  availableCopies: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },

  rackNumber: {
    type: String,
    trim: true
  },

  shelfNumber: {
    type: String,
    trim: true
  },

  coverImage: {
    type: String
  },

  status: {
    type: String,
    enum: ['Available', 'Out of Stock'],
    default: 'Available'
  },

  collegeId: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

bookSchema.index({ collegeId: 1, bookId: 1 }, { unique: true });
bookSchema.index({ collegeId: 1, title: 1 });
bookSchema.index({ collegeId: 1, isbn: 1 });

const Book = mongoose.model('Book', bookSchema);

export default Book;
