import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from './models/User.js';
import College from './models/College.js';
import Department from './models/Department.js';
import Student from './models/Student.js';
import Staff from './models/Staff.js';
import SystemSetting from './models/SystemSetting.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

async function resetFresh() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database successfully!');

    // 1. Clear all collections completely
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      console.log(`Clearing collection: ${col.name}...`);
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }

    console.log('\n--- All existing database records wiped clean ---');

    // 2. Create Default Primary College
    const now = new Date();
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const mainCollege = await College.create({
      name: 'FIC College of Engineering',
      adminName: 'System Admin',
      email: 'admin@college.edu',
      phone: '9876543210',
      tenantId: 'COL001',
      subscriptionPlan: 'Premium',
      subscriptionStatus: 'Active',
      trialStartDate: now,
      trialEndDate: oneYearLater,
      convertedToPaid: true
    });
    console.log('Created Primary College: FIC College of Engineering (COL001)');

    // 3. Create Default Department
    await Department.create({
      id: 'DEP001',
      name: 'Computer Science & Engineering',
      code: 'CSE',
      hod: 'CSE HOD',
      students: 1,
      staff: 1,
      collegeId: 'COL001'
    });
    console.log('Created Default Department: Computer Science & Engineering (CSE)');

    // 4. Create Clean Default Users for all portals
    const defaultUsers = [
      {
        name: 'System Super Admin',
        email: 'superadmin@erpsaas.com',
        password: 'superadmin123',
        role: 'Super Admin',
        tenantId: 'SYSTEM'
      },
      {
        name: 'System Admin',
        email: 'admin@college.edu',
        password: 'admin123',
        role: 'Admin',
        tenantId: 'COL001',
        collegeId: mainCollege._id.toString()
      },
      {
        name: 'Dr. Suresh Kumar',
        email: 'principal@college.edu',
        password: 'principal123',
        role: 'Principal',
        tenantId: 'COL001',
        collegeId: mainCollege._id.toString()
      },
      {
        name: 'CSE HOD',
        email: 'hod@college.edu',
        password: 'hod123',
        role: 'HOD',
        tenantId: 'COL001',
        department: 'Computer Science',
        referenceId: 'HOD001'
      },
      {
        name: 'Prof. Karthik S.',
        email: 'staff@college.edu',
        password: 'staff123',
        role: 'Staff',
        tenantId: 'COL001',
        department: 'Computer Science',
        referenceId: 'STF001'
      },
      {
        name: 'John Doe',
        email: 'student@college.edu',
        password: 'student123',
        role: 'Student',
        tenantId: 'COL001',
        department: 'Computer Science',
        referenceId: 'CS2026001',
        studentId: 'CS2026001'
      },
      {
        name: 'Parent of John',
        email: 'parent@college.edu',
        password: 'parent123',
        role: 'Parent',
        tenantId: 'COL001',
        parentOf: 'CS2026001',
        referenceId: 'CS2026001'
      },
      {
        name: 'Accounts Officer',
        email: 'accounts@college.edu',
        password: 'accounts123',
        role: 'Accounts',
        tenantId: 'COL001'
      }
    ];

    for (const u of defaultUsers) {
      await User.create(u);
      console.log(`Created User [${u.role}]: ${u.email}`);
    }

    // 5. Create Default Student Record
    await Student.create({
      id: 'CS2026001',
      name: 'John Doe',
      email: 'student@college.edu',
      dept: 'Computer Science',
      sem: 'Sem 3',
      collegeId: 'COL001'
    });
    console.log('Created Default Student: John Doe (CS2026001)');

    // 6. Create Default Staff Record
    await Staff.create({
      id: 'STF001',
      name: 'Prof. Karthik S.',
      email: 'staff@college.edu',
      dept: 'Computer Science',
      designation: 'Assistant Professor',
      collegeId: 'COL001'
    });
    console.log('Created Default Staff: Prof. Karthik S. (STF001)');

    // 7. System Setting
    await SystemSetting.create({
      institutionName: 'FIC College of Engineering',
      academicYear: '2025-2026',
      tenantId: 'COL001'
    });

    console.log('\n========================================');
    console.log('SUCCESS! Database is now 100% clean & fresh!');
    console.log('Clean Login Credentials:');
    console.log('- Super Admin: superadmin@erpsaas.com / superadmin123');
    console.log('- Admin:       admin@college.edu / admin123');
    console.log('- Principal:   principal@college.edu / principal123');
    console.log('- HOD:         hod@college.edu / hod123');
    console.log('- Staff:       staff@college.edu / staff123');
    console.log('- Student:     student@college.edu / student123');
    console.log('- Parent:      parent@college.edu / parent123');
    console.log('- Accounts:    accounts@college.edu / accounts123');
    console.log('========================================\n');

    process.exit(0);
  } catch (err) {
    console.error('Error resetting database:', err);
    process.exit(1);
  }
}

resetFresh();
