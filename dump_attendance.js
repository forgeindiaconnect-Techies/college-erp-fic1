import mongoose from 'mongoose';
import Attendance from './backend/models/Attendance.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp');
  const records = await Attendance.find();
  console.log(JSON.stringify(records, null, 2));
  process.exit(0);
};

run().catch(console.error);
