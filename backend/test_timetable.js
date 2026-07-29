import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import Timetable from './models/Timetable.js';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  try {
    const doc = await Timetable.findOneAndUpdate(
      { department: 'CSE', semester: '1', collegeId: 'unassigned_college' },
      { $set: { department: 'CSE', semester: '1', schedule: [], collegeId: 'unassigned_college' } },
      { new: true, upsert: true, runValidators: true }
    );
    console.log('Success:', doc);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.disconnect();
  }
});
