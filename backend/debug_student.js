import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: `${__dirname}/.env` });

import User from './models/User.js';
import Book from './models/Book.js';
import LibraryTransaction from './models/LibraryTransaction.js';

const debug = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_erp');
  
  // Find Savitha
  const user = await User.findOne({ name: 'SAVITHA' });
  console.log('User:', user);
  
  const book = await Book.findOne();
  console.log('Book:', book);
  
  if (user && book) {
    const userId = user.referenceId || user.id || user._id;
    console.log('Using userId:', userId);
    
    // Simulate transaction creation
    try {
      const transaction = new LibraryTransaction({
        bookId: book._id,
        userId: userId,
        userType: user.role === 'Staff' ? 'Staff' : 'Student',
        status: 'Pending'
      });
      await transaction.save();
      console.log('Transaction saved!');
    } catch (err) {
      console.error('Save error:', err);
    }
  }
  process.exit();
};

debug();
