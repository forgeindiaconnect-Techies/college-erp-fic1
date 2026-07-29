import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-erp');

const db = mongoose.connection;
db.once('open', async () => {
  try {
    await db.collection('departments').dropIndexes();
    console.log('Indexes dropped for departments collection');
  } catch (err) {
    console.error('Error dropping indexes:', err.message);
  } finally {
    process.exit(0);
  }
});
