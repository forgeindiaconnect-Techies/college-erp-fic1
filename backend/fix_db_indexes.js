import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    
    // Check staffs collection
    console.log('Checking indexes in "staffs" collection...');
    const staffsIndexes = await db.collection('staffs').indexes();
    console.log('Current staffs indexes:', staffsIndexes.map(i => i.name));
    
    // Drop staffId_1 if it exists
    if (staffsIndexes.find(i => i.name === 'staffId_1')) {
      console.log('Dropping obsolete staffId_1 index...');
      await db.collection('staffs').dropIndex('staffId_1');
      console.log('Index dropped successfully.');
    } else {
      console.log('No staffId_1 index found.');
    }

    console.log('Database index cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error fixing indexes:', err);
    process.exit(1);
  }
}

fixIndexes();
