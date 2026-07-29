import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  bookId: { type: String, required: true, unique: true },
  isbn: { type: String },
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  department: { type: String, required: true },
  totalCopies: { type: Number, required: true, default: 1 },
  availableCopies: { type: Number, required: true, default: 1 },
  rackNumber: { type: String },
  status: { type: String, enum: ['Available', 'Out of Stock'], default: 'Available' }
, collegeId: { type: String } }, { timestamps: true });

const Book = mongoose.model('Book', bookSchema);

export default Book;
