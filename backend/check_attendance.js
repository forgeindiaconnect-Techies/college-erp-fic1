import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const checkAttendance = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college-erp');
    const Attendance = (await import('./models/Attendance.js')).default;
    const records = await Attendance.find({});
    console.log(records);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
checkAttendance();
