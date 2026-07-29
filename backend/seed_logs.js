import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ActivityLog from './models/ActivityLog.js';

dotenv.config();

const seedLogs = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Clear old
    await ActivityLog.deleteMany({});
    
    const logs = [
      { userId: 'ADM001', userName: 'Admin', role: 'Super Admin', action: 'Assigned HOD to IT', moduleName: 'System Settings', dept: 'System', ip: '192.168.1.10' },
      { userId: 'SA001', userName: 'Ramesh K.', role: 'Sub Admin', action: 'Added new student', moduleName: 'Student Management', dept: 'System', ip: '192.168.1.14' },
      { userId: 'HOD001', userName: 'Dr. Ananya', role: 'HOD', action: 'Updated attendance', moduleName: 'Attendance', dept: 'CSE', ip: '192.168.1.22' },
      { userId: 'FAC001', userName: 'Prof. Karthik', role: 'Staff', action: 'Posted New Assignment', moduleName: 'Assignments', dept: 'CSE', ip: '192.168.1.35' },
      { userId: 'ADM001', userName: 'Admin', role: 'Super Admin', action: 'Generated fees report', moduleName: 'Reports', dept: 'System', ip: '192.168.1.10' },
    ];
    
    await ActivityLog.insertMany(logs);
    console.log('Seeded Activity Logs');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seedLogs();
