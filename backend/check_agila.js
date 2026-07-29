import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_erp');
  const user = await User.findOne({ email: 'agila@gmail.com' });
  console.log("User:", user);
  process.exit(0);
}

check().catch(console.error);
