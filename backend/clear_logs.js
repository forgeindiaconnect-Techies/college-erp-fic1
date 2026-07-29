import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ActivityLog from './models/ActivityLog.js';

dotenv.config();

const clearLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await ActivityLog.deleteMany({});
    console.log('Activity Logs cleared successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

clearLogs();
