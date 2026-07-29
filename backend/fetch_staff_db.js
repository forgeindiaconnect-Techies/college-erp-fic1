import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });
import Staff from './models/Staff.js';

async function fetchStaff() {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    
    const staffs = await Staff.find({});
    console.log(`Found ${staffs.length} staff members:`);
    staffs.forEach(s => {
      console.log(`- ID: ${s.id}, Name: ${s.name}, Dept: ${s.dept}, Email: ${s.email}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error fetching staff:', err);
    process.exit(1);
  }
}

fetchStaff();
