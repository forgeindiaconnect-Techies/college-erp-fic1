import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import Student from './models/Student.js';
import Staff from './models/Staff.js';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Syncing departments to User collection...');
  let updatedCount = 0;

  // Sync Students
  const students = await Student.find({});
  for (const student of students) {
    if (student.email) {
      const result = await User.updateOne(
        { email: { $regex: new RegExp(`^${student.email.trim()}$`, 'i') } },
        { $set: { department: student.dept, referenceId: student.id, role: 'Student' } }
      );
      if (result.modifiedCount > 0) updatedCount++;
    }
  }

  // Sync Staff
  const staffMembers = await Staff.find({});
  for (const staff of staffMembers) {
    if (staff.email) {
      const role = staff.designation === 'HOD' ? 'HOD' : 'Staff';
      const result = await User.updateOne(
        { email: { $regex: new RegExp(`^${staff.email.trim()}$`, 'i') } },
        { $set: { department: staff.dept, referenceId: staff.id, role: role } }
      );
      if (result.modifiedCount > 0) updatedCount++;
    }
  }

  console.log(`Successfully synced ${updatedCount} users.`);
  process.exit(0);
});
