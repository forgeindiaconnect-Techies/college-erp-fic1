import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });
import Staff from './models/Staff.js';

async function cleanupStaff() {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Looking for corrupted staff records (missing ID)...');
    
    // Find staff where id is null, undefined, or missing
    const corrupted = await Staff.find({ $or: [{ id: null }, { id: undefined }, { id: { $exists: false } }] });
    
    console.log(`Found ${corrupted.length} corrupted records to delete.`);
    
    for (const staff of corrupted) {
      console.log(`Deleting: ${staff.name} (${staff.email})`);
      await Staff.findByIdAndDelete(staff._id);
    }

    console.log('Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error cleaning up staff:', err);
    process.exit(1);
  }
}

cleanupStaff();
