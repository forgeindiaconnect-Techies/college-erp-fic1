import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ActivityLog from './models/ActivityLog.js';
import Staff from './models/Staff.js';
import Assignment from './models/Assignment.js';
import Student from './models/Student.js';

dotenv.config();

const backfillLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const logsToInsert = [];
    
    // Get latest 3 assignments
    const recentAssignments = await Assignment.find().sort({ createdAt: -1 }).limit(3);
    for (const assignment of recentAssignments) {
      logsToInsert.push({
        userId: assignment.faculty,
        userName: assignment.faculty,
        role: 'Staff',
        action: `Posted new assignment: ${assignment.title}`,
        moduleName: 'Assignments',
        dept: assignment.department || 'General',
        ip: '192.168.1.35',
        createdAt: assignment.createdAt || new Date()
      });
    }

    // Get latest 3 staff
    const recentStaff = await Staff.find().sort({ createdAt: -1 }).limit(3);
    for (const staff of recentStaff) {
      logsToInsert.push({
        userId: 'Admin',
        userName: 'System Admin',
        role: 'Admin',
        action: `Added new staff: ${staff.name} (${staff.id})`,
        moduleName: 'Staff Management',
        dept: staff.dept,
        ip: '192.168.1.10',
        createdAt: staff.createdAt || new Date()
      });
    }

    // Get latest 3 students
    const recentStudents = await Student.find().sort({ createdAt: -1 }).limit(3);
    for (const student of recentStudents) {
      logsToInsert.push({
        userId: 'Admin',
        userName: 'System Admin',
        role: 'Admin',
        action: `Admitted new student: ${student.name}`,
        moduleName: 'Student Management',
        dept: student.dept,
        ip: '192.168.1.14',
        createdAt: student.createdAt || new Date()
      });
    }

    // Sort by createdAt descending
    logsToInsert.sort((a, b) => b.createdAt - a.createdAt);

    if (logsToInsert.length > 0) {
      await ActivityLog.insertMany(logsToInsert);
      console.log(`Backfilled ${logsToInsert.length} actual system actions into Activity Logs.`);
    } else {
      console.log('No existing records found to backfill.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

backfillLogs();
