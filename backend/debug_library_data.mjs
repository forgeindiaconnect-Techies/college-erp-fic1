import 'dotenv/config';
import mongoose from 'mongoose';
import LibraryTransaction from './models/LibraryTransaction.js';
import Book from './models/Book.js';

await mongoose.connect(process.env.MONGO_URI);

const books = await Book.find({
  $or: [
    { title: /data/i },
    { name: /data/i }
  ]
}).lean();

console.log('\n=== DATA BOOKS ===');
console.log(JSON.stringify(books.map(b => ({
  _id: b._id,
  title: b.title,
  name: b.name,
  bookCode: b.bookCode,
  id: b.id
})), null, 2));

const bookIds = books.map(b => b._id);

const transactions = await LibraryTransaction.find({
  bookId: { $in: bookIds }
}).sort({ createdAt: -1 }).lean();

console.log('\n=== DATA TRANSACTIONS ===');
console.log(JSON.stringify(transactions.map(t => ({
  _id: t._id,
  bookId: t.bookId,
  bookCopyId: t.bookCopyId,
  userId: t.userId,
  userType: t.userType,
  status: t.status,
  issueDate: t.issueDate,
  dueDate: t.dueDate,
  returnDate: t.returnDate,
  collegeId: t.collegeId,
  createdAt: t.createdAt
})), null, 2));

await mongoose.disconnect();
