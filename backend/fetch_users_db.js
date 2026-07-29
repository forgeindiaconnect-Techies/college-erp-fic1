import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });
import User from './models/User.js';

async function fetchUsers() {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    
    const users = await User.find({});
    console.log(`Found ${users.length} users in the database:`);
    users.forEach(u => {
      console.log(`- Role: ${u.role}, Name: ${u.name}, Email: ${u.email}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error fetching users:', err);
    process.exit(1);
  }
}

fetchUsers();
