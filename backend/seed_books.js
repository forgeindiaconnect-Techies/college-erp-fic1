import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/.env` });

import Book from './models/Book.js';

const seedBooks = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_erp';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const MOCK_BOOKS = [
      { bookId: 'B1', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', department: 'Artificial Intelligence & Data Science', isbn: '9780262033848', totalCopies: 5, availableCopies: 5, rackNumber: 'R1' },
      { bookId: 'B2', title: 'Clean Code', author: 'Robert C. Martin', category: 'Software Engineering', department: 'Artificial Intelligence & Data Science', isbn: '9780132350884', totalCopies: 3, availableCopies: 3, rackNumber: 'R2' },
      { bookId: 'B3', title: 'Artificial Intelligence: A Modern Approach', author: 'Stuart Russell', category: 'AI & Data Science', department: 'Artificial Intelligence & Data Science', isbn: '9780134610993', totalCopies: 2, availableCopies: 2, rackNumber: 'R1' },
      { bookId: 'B4', title: 'Design Patterns', author: 'Erich Gamma', category: 'Software Engineering', department: 'Computer Science Engineering', isbn: '9780201633610', totalCopies: 4, availableCopies: 4, rackNumber: 'R3' },
      { bookId: 'B5', title: 'Deep Learning', author: 'Ian Goodfellow', category: 'Machine Learning', department: 'Artificial Intelligence & Data Science', isbn: '9780262035613', totalCopies: 1, availableCopies: 1, rackNumber: 'R1' },
    ];

    await Book.deleteMany({});
    await Book.insertMany(MOCK_BOOKS);
    
    console.log('📚 Successfully seeded books!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding books:', error);
    process.exit(1);
  }
};

seedBooks();
