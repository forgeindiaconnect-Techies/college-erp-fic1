import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function fix() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_erp');
  const users = await User.find({ role: { $in: ['Student', 'Staff', 'HOD'] } });
  let count = 0;
  for (const user of users) {
    user.password = 'password123';
    await user.save();
    count++;
  }
  console.log(`Reset password to password123 for ${count} users.`);
  process.exit(0);
}

fix().catch(console.error);
