import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

import express from 'express';
import mongoose from 'mongoose';
import './context.js';
import { context } from './context.js';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import http from 'http';
import { Server } from 'socket.io';

// Derive __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: `${__dirname}/.env` });
console.log('✅ Loaded JWT secret:', process.env.JWT_SECRET ? 'YES (loaded)' : '❌ MISSING!');

// Import Routes
import studentRoutes from './routes/studentRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import marksRoutes from './routes/marksRoutes.js';
import feesRoutes from './routes/feesRoutes.js';
import reportsRoutes from './routes/reportsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import libraryRoutes from './routes/libraryRoutes.js';
import transportRoutes from './routes/transportRoutes.js';
import hostelRoutes from './routes/hostelRoutes.js';
import placementRoutes from './routes/placementRoutes.js';

import settingsRoutes from './routes/settingsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import examRoutes from './routes/examRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import classAdvisorRoutes from './routes/classAdvisorRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import welfareRoutes from './routes/welfareRoutes.js';
import staffSupportRoutes from './routes/staffSupportRoutes.js';
import hodSupportRoutes from './routes/hodSupportRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import accountsOfficerRoutes from './routes/accountsOfficerRoutes.js';
import employeeAttendanceRoutes from './routes/employeeAttendanceRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import academicRoutes from './routes/academicRoutes.js';
import facultyAllocationRoutes from './routes/facultyAllocationRoutes.js';
import periodMasterRoutes from './routes/periodMasterRoutes.js';
import classMonitoringRoutes from './routes/classMonitoringRoutes.js';
import substitutionRoutes from './routes/substitutionRoutes.js';
import classSessionRoutes from './routes/classSessionRoutes.js';

// Import Cron Jobs
import { initCronJobs } from './cron/scheduler.js';

// Import Models for auto-seeding
import College from './models/College.js';
import Approval from './models/Approval.js';
import Exam from './models/Exam.js';
import User from './models/User.js';
import Student from './models/Student.js';
import Staff from './models/Staff.js';
import Department from './models/Department.js';
import Attendance from './models/Attendance.js';
import Fee from './models/Fee.js';
import Mark from './models/Mark.js';
import Book from './models/Book.js';
import IssueRecord from './models/IssueRecord.js';
import TransportRoute from './models/TransportRoute.js';
import TransportDriver from './models/TransportDriver.js';
import TransportStudent from './models/TransportStudent.js';
import HostelBlock from './models/HostelBlock.js';
import HostelRoom from './models/HostelRoom.js';
import HostelStudent from './models/HostelStudent.js';
import HostelComplaint from './models/HostelComplaint.js';
import PlacementCompany from './models/PlacementCompany.js';
import PlacementJob from './models/PlacementJob.js';
import PlacementApplication from './models/PlacementApplication.js';
import PlacementInterview from './models/PlacementInterview.js';
import PlacementSelection from './models/PlacementSelection.js';
import SystemSetting from './models/SystemSetting.js';
import LoginLog from './models/LoginLog.js';
import StudentProfile from './models/StudentProfile.js';
import Notification from './models/Notification.js';
import Salary from './models/Salary.js';
import WelfareRecord from './models/WelfareRecord.js';
import StaffSupportRecord from './models/StaffSupportRecord.js';
import HodSupportRecord from './models/HodSupportRecord.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Socket.io setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Make io accessible to routes
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('join', (userData) => {
    if (!userData) return;
    if (typeof userData === 'string') {
      socket.join(userData);
      console.log(`🔌 Socket ${socket.id} joined room: ${userData}`);
    } else {
      if (userData.userId) {
        socket.join(userData.userId.toString());
        console.log(`🔌 Socket ${socket.id} joined user room: ${userData.userId}`);
      }
      if (userData.tenantId) {
        socket.join(userData.tenantId.toString());
        console.log(`🔌 Socket ${socket.id} joined tenant room: ${userData.tenantId}`);
      }
      if (userData.collegeId) {
        socket.join(userData.collegeId.toString());
        console.log(`🔌 Socket ${socket.id} joined college room: ${userData.collegeId}`);
      }
      if (userData.role) {
        socket.join(`role:${userData.role}`);
        socket.join(`role:${userData.role.toLowerCase()}`);
        console.log(`🔌 Socket ${socket.id} joined role room: role:${userData.role}`);
      }
    }
  });

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`🔌 Socket ${socket.id} joined room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow all Vercel previews, production Vercel URLs, localhost, and render
    const allowedPatterns = [
      /\.vercel\.app$/,
      /\.onrender\.com$/,
      /^http:\/\/localhost/,
      /^http:\/\/127\.0\.0\.1/
    ];
    if (!origin || allowedPatterns.some(p => p.test(origin))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (open CORS)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires']
}));
app.use(express.json());

// Context Middleware for Multi-Tenancy
app.use((req, res, next) => {
  context.run(new Map(), () => {
    next();
  });
});

// ── Auto-seed helper ──────────────────────────────────────────────────────────
// Only seeds when the DB is truly empty — does NOT wipe data on every restart
const autoSeedIfEmpty = async () => {
  try {
    // Seed Demo Colleges if missing (for Super Admin dashboard)
    const collegeCount = await College.countDocuments();
    if (collegeCount === 0) {
      console.log('🌱 Patching database: missing Colleges detected. Injecting demo colleges now...');
      const now = new Date();
      const nextYear = new Date(now);
      nextYear.setFullYear(now.getFullYear() + 1);

      await College.insertMany([
        {
          tenantId: 'COL001',
          name: 'FIC Engineering College',
          adminName: 'Vaideeswari Admin',
          email: 'vaidee@gmail.com',
          phone: '9876543210',
          subscriptionPlan: 'Elite',
          subscriptionStatus: 'Active',
          trialStartDate: now,
          trialEndDate: nextYear,
          isActive: true
        },
        {
          tenantId: 'COL002',
          name: 'St. Xavier Technology Institute',
          adminName: 'Suresh Kumar',
          email: 'admin@stxavier.edu',
          phone: '9876543211',
          subscriptionPlan: 'Premium',
          subscriptionStatus: 'Active',
          trialStartDate: now,
          trialEndDate: nextYear,
          isActive: true
        },
        {
          tenantId: 'COL003',
          name: 'National College of Arts & Science',
          adminName: 'Ramesh Patel',
          email: 'admin@nationalartscollege.edu',
          phone: '9876543212',
          subscriptionPlan: 'Starter',
          subscriptionStatus: 'Active',
          trialStartDate: now,
          trialEndDate: nextYear,
          isActive: true
        },
        {
          tenantId: 'COL004',
          name: 'Global University of Technology',
          adminName: 'Anitha Sharma',
          email: 'admin@globaltech.edu',
          phone: '9876543213',
          subscriptionPlan: 'Trial',
          subscriptionStatus: 'Active',
          trialStartDate: now,
          trialEndDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      ]);
      console.log('✅ Demo Colleges seeded successfully for Super Admin.');
    }

    const existingUserCount = await User.countDocuments();
    if (existingUserCount > 0) {
      console.log(`✅ Database already has ${existingUserCount} users.`);

      // Ensure user's exact requested custom credentials are always present
      const customCredentials = [
        { name: 'Global Super Admin', email: 'superadmin@erpsaas.com', password: 'superadmin123', role: 'Super Admin' },
        { name: 'Vaideeswari (Admin)', email: 'vaidee@gmail.com', password: 'vaidee', role: 'Admin' },
        { name: 'Vaideeswari (Admin)', email: 'vaideeswari@gmail.com', password: 'password123', role: 'Admin' },
        { name: 'Sree (Principal)', email: 'sree@gmail.com', password: 'sree123', role: 'Principal' },
        { name: 'Dr. Agila (HOD)', email: 'agila@gmail.com', password: 'agila', role: 'HOD', department: 'Information Technology', referenceId: 'HOD001' },
        { name: 'Pooja (Staff)', email: 'pooja@gmail.com', password: 'pooja', role: 'Staff', department: 'Computer Science', referenceId: 'STF008', subjects: ['Data Structures'] },
      ];

      for (const cred of customCredentials) {
        const u = await User.findOne({ email: cred.email });
        if (!u) {
          await User.create(cred);
          console.log(`✅ Created custom user: ${cred.email}`);
        } else {
          u.role = cred.role;
          u.password = cred.password;
          u.markModified('password');
          await u.save();
          console.log(`✅ Updated custom user password for: ${cred.email}`);
        }
      }

      // Incremental patch: inject Principal if missing by checking email
      const existingPrincipal = await User.findOne({
        email: "principal@college.edu",
      });

      if (!existingPrincipal) {
        await User.create({
          name: "Principal",
          email: "principal@college.edu",
          password: "123456",
          role: "principal",
        });
        console.log("✅ Principal created");
      } else {
        console.log("✅ Principal already exists");
      }

      // Incremental patch for missing demo users (HODs & Staff)
      const hodCount = await User.countDocuments({ role: 'HOD' });
      if (hodCount === 0) {
        console.log('🌱 Patching database: missing HOD and Staff demo users detected. Injecting them now...');
        await User.create([
          { name: 'CSE HOD',          email: 'csehod@gmail.com',         password: 'password123', role: 'HOD', department: 'Computer Science', referenceId: 'STF001' },
          { name: 'ECE HOD',          email: 'ecehod@gmail.com',         password: 'password123', role: 'HOD', department: 'Electronics & Comm.', referenceId: 'STF002' },
          { name: 'EEE HOD',          email: 'eeehod@gmail.com',         password: 'password123', role: 'HOD', department: 'Electrical & Electronics', referenceId: 'STF003' },
          { name: 'MECH HOD',         email: 'mechhod@gmail.com',        password: 'password123', role: 'HOD', department: 'Mechanical Engg.', referenceId: 'STF004' },
          { name: 'BCA HOD',          email: 'bcahod@gmail.com',         password: 'password123', role: 'HOD', department: 'Bachelor of Computer App.', referenceId: 'STF005' },
          { name: 'MBA HOD',          email: 'mbahod@gmail.com',         password: 'password123', role: 'HOD', department: 'Master of Business Admin.', referenceId: 'STF006' },
          { name: 'Dr.Agila',         email: 'agila@gmail.com',          password: 'agila', role: 'HOD', department: 'Information Technology', referenceId: 'HOD001' },
          { name: 'Prof. Karthik S.', email: 'karthik@college.edu',      password: 'password123', role: 'Staff', department: 'Computer Science', referenceId: 'STF007', subjects: ['OS', 'Machine Learning'] }
        ]);
        console.log('✅ Missing HOD/Staff demo users injected successfully.');
      } else {
        console.log(`✅ Database has HOD users — skipping seed.`);
      }

      // Incremental patch for missing approvals
      const approvalCount = await Approval.countDocuments();
      if (approvalCount === 0) {
        console.log('🌱 Patching database: missing Approvals detected. Injecting them now...');
        await Approval.insertMany([
          {
            type: 'Budget Request',
            department: 'Computer Science',
            requestedBy: 'CSE HOD',
            date: 'May 24, 2026',
            priority: 'High',
            status: 'Pending',
            details: 'Requesting ₹1,50,000 for CSE department cloud infrastructure laboratory upgrade (AWS credits and server maintenance).',
            aiRecommendation: 'Safe to Approve. Within CS quarterly allocation budget limit of ₹2,00,000.',
            aiScore: 92
          },
          {
            type: 'Leave Request',
            department: 'Electronics & Comm.',
            requestedBy: 'ECE HOD',
            date: 'May 26, 2026',
            priority: 'Medium',
            status: 'Pending',
            details: 'Casual leave request for ECE HOD from May 28 to May 30 due to family wedding.',
            aiRecommendation: 'Safe to Approve. Staff backup assigned: Dr. Meena Pillai.',
            aiScore: 97
          },
          {
            type: 'Department Event',
            department: 'Electrical & Electronics',
            requestedBy: 'EEE HOD',
            date: 'May 25, 2026',
            priority: 'Low',
            status: 'Pending',
            details: 'Approval requested to host annual National Energy Conservation Workshop on June 12 in seminar hall.',
            aiRecommendation: 'Highly Recommended. Fosters college industry exposure and has high placement conversion correlation.',
            aiScore: 99
          },
          {
            type: 'Placement Drive',
            department: 'Computer Science',
            requestedBy: 'CSE HOD',
            date: 'May 24, 2026',
            priority: 'High',
            status: 'Approved',
            details: 'Microsoft campus hiring drive logistics approval for CSE and ECE students on June 18.',
            aiRecommendation: 'Approved. Essential institutional driver.',
            aiScore: 98,
            remarks: 'Approved. Ensure auditorium is prepared.'
          }
        ]);
        console.log('✅ Approvals seeded successfully.');
      }

      // Incremental patch for missing Departments
      const deptCount = await Department.countDocuments();
      if (deptCount === 0) {
        console.log('🌱 Patching database: missing Departments detected. Injecting them now...');
        await Department.insertMany([
          { id: 'DEPT001', name: 'Computer Science',          code: 'CSE',  hod: 'CSE HOD',          totalStudents: 3 },
          { id: 'DEPT002', name: 'Electronics & Comm.',       code: 'ECE',  hod: 'ECE HOD',          totalStudents: 2 },
          { id: 'DEPT003', name: 'Electrical & Electronics',  code: 'EEE',  hod: 'EEE HOD',          totalStudents: 2 },
          { id: 'DEPT004', name: 'Mechanical Engg.',          code: 'MECH', hod: 'MECH HOD',         totalStudents: 1 },
          { id: 'DEPT005', name: 'Bachelor of Computer App.', code: 'BCA',  hod: 'BCA HOD',          totalStudents: 1 },
          { id: 'DEPT006', name: 'Master of Business Admin.', code: 'MBA',  hod: 'MBA HOD',          totalStudents: 1 },
        ]);
        console.log('✅ Departments seeded successfully.');
      }

      // Incremental patch for missing Staff (HODs)
      const staffCount = await Staff.countDocuments();
      if (staffCount === 0) {
        console.log('🌱 Patching database: missing Staff detected. Injecting them now...');
        await Staff.insertMany([
          { id: 'STF001', name: 'CSE HOD',          email: 'csehod@gmail.com',    phone: '9900000001', dept: 'Computer Science',          designation: 'HOD',             subjects: ['Algorithms', 'Compiler Design'], workload: 12, attendance: 98 },
          { id: 'STF002', name: 'ECE HOD',          email: 'ecehod@gmail.com',    phone: '9900000002', dept: 'Electronics & Comm.',       designation: 'HOD',             subjects: ['Signals & Systems'],            workload: 10, attendance: 96 },
          { id: 'STF003', name: 'EEE HOD',          email: 'eeehod@gmail.com',    phone: '9900000003', dept: 'Electrical & Electronics',  designation: 'HOD',             subjects: ['Circuits', 'Networks'],         workload: 14, attendance: 95 },
          { id: 'STF004', name: 'MECH HOD',         email: 'mechhod@gmail.com',   phone: '9900000004', dept: 'Mechanical Engg.',          designation: 'HOD',             subjects: ['Thermodynamics'],               workload: 12, attendance: 93 },
          { id: 'STF005', name: 'BCA HOD',          email: 'bcahod@gmail.com',    phone: '9900000005', dept: 'Bachelor of Computer App.', designation: 'HOD',             subjects: ['Java Programming'],             workload: 12, attendance: 97 },
          { id: 'STF006', name: 'MBA HOD',          email: 'mbahod@gmail.com',    phone: '9900000006', dept: 'Master of Business Admin.', designation: 'HOD',             subjects: ['Strategic Management'],         workload: 10, attendance: 94 },
          
          { id: 'STF007', name: 'Prof. Karthik S.', email: 'karthik@college.edu', phone: '9823456789', dept: 'Computer Science',          designation: 'Assistant Prof.', subjects: ['OS', 'Machine Learning'],       workload: 20, attendance: 89 },
          { id: 'STF008', name: 'Dr. Ananya Rao',   email: 'ananya@college.edu',  phone: '9876543210', dept: 'Computer Science',          designation: 'Professor',       subjects: ['Data Structures', 'DBMS'],      workload: 18, attendance: 97 },
          { id: 'STF009', name: 'Dr. Meena Pillai', email: 'meena@college.edu',   phone: '9812987654', dept: 'Electronics & Comm.',       designation: 'Associate Prof.', subjects: ['Microprocessors'],              workload: 16, attendance: 92 },
        ]);
        console.log('✅ Staff seeded successfully.');
      }

      // Incremental patch for missing Students
      const studentCount = await Student.countDocuments();
      if (studentCount === 0) {
        console.log('🌱 Patching database: missing Students detected. Injecting them now...');
        await Student.insertMany([
          { id: 'CS2022001', name: 'John Doe',       email: 'john@college.edu',    phone: '9876543210', dept: 'Computer Science',          sem: 'Sem 6', cgpa: 8.6, attendance: 85, status: 'Active',   feeStatus: 'Paid'    },
          { id: 'CS2021004', name: 'Emily Davis',    email: 'emily@college.edu',   phone: '9823456789', dept: 'Computer Science',          sem: 'Sem 6', cgpa: 8.9, attendance: 98, status: 'Active',   feeStatus: 'Paid'    },
          { id: 'CS2022002', name: 'David Lee',      email: 'david@college.edu',   phone: '9890123456', dept: 'Computer Science',          sem: 'Sem 3', cgpa: 8.2, attendance: 88, status: 'Active',   feeStatus: 'Partial' },
          { id: 'EE2022001', name: 'Alice Smith',    email: 'alice@college.edu',   phone: '9845123456', dept: 'Electrical & Electronics',  sem: 'Sem 4', cgpa: 9.1, attendance: 95, status: 'Active',   feeStatus: 'Paid'    },
          { id: 'EE2022002', name: 'Sarah Wilson',   email: 'sarah@college.edu',   phone: '9801234567', dept: 'Electrical & Electronics',  sem: 'Sem 4', cgpa: 9.5, attendance: 91, status: 'Active',   feeStatus: 'Paid'    },
          { id: 'EC2022001', name: 'Vikram Seth',    email: 'vikram@college.edu',  phone: '9811122233', dept: 'Electronics & Comm.',       sem: 'Sem 6', cgpa: 8.8, attendance: 90, status: 'Active',   feeStatus: 'Paid'    },
          { id: 'EC2022002', name: 'Neha Gupta',     email: 'neha@college.edu',    phone: '9822233344', dept: 'Electronics & Comm.',       sem: 'Sem 6', cgpa: 8.5, attendance: 75, status: 'Active',   feeStatus: 'Pending' },
          { id: 'ME2023001', name: 'Robert Johnson', email: 'robert@college.edu',  phone: '9812987654', dept: 'Mechanical Engg.',          sem: 'Sem 2', cgpa: 7.8, attendance: 68, status: 'Active',   feeStatus: 'Partial' },
          { id: 'BC2022001', name: 'Karan Malhotra', email: 'karan@college.edu',   phone: '9856789012', dept: 'Bachelor of Computer App.', sem: 'Sem 5', cgpa: 8.7, attendance: 94, status: 'Active',   feeStatus: 'Paid'    },
          { id: 'MB2022001', name: 'Ritu Sen',       email: 'ritu@college.edu',    phone: '9867123456', dept: 'Master of Business Admin.', sem: 'Sem 4', cgpa: 9.2, attendance: 96, status: 'Active',   feeStatus: 'Paid'    },
        ]);
        console.log('✅ Students seeded successfully.');
      }

      // Incremental patch for missing WelfareRecords
      const welfareCount = await WelfareRecord.countDocuments();
      if (welfareCount === 0) {
        console.log('🌱 Patching database: missing WelfareRecords detected. Injecting them now...');
        await WelfareRecord.insertMany([
          { studentName: 'Rohan Sharma', department: 'Computer Science', issueType: 'Disciplinary', reportedBy: 'HOD CSE', priority: 'High', date: '2026-05-24', status: 'Counselor Assigned', description: 'Caught proxying attendance in lab.', timeline: [{date: '2026-05-24', text: 'Misconduct incident reported by HOD CSE'}, {date: '2026-05-26', text: 'Counselor assigned for behavioral counseling assessment'}] },
          { studentName: 'Ananya Sen', department: 'Electronics & Comm.', issueType: 'Scholarship', reportedBy: 'Accounts Board', priority: 'Medium', date: '2026-05-20', status: 'Resolved', description: 'Requires Principal approval for 20% fee waiver.', timeline: [{date: '2026-05-20', text: 'Scholarship application compiled by registrar'}, {date: '2026-05-23', text: 'Annual fee waiver disbursement successfully cleared'}] },
          { studentName: 'Karan Malhotra', department: 'Mechanical Engg.', issueType: 'Anti-Ragging', reportedBy: 'Student Welfare', priority: 'High', date: '2026-05-25', status: 'Under Investigation', description: 'Reported bullying in hostel premises.', timeline: [{date: '2026-05-25', text: 'Hostel warden submitted report to Welfare Board'}, {date: '2026-05-26', text: 'Anti-ragging cell mobilized for campus security footage inspection'}] },
          { studentName: 'Sneha Patil', department: 'Computer Science', issueType: 'Counseling', reportedBy: 'Self-referred', priority: 'Low', date: '2026-05-26', status: 'Scheduled', description: 'Requested professional guidance regarding high academic stress levels.', timeline: [{date: '2026-05-26', text: 'Mental health assessment request submitted'}, {date: '2026-05-27', text: 'Weekly session scheduled with Dr. Asha Roy'}] },
          { studentName: 'Vikram Joshi', department: 'Electrical & Electronics', issueType: 'Complaint', reportedBy: 'Junior Student', priority: 'High', date: '2026-05-26', status: 'Pending', description: 'Altercation in college cafeteria.', timeline: [{date: '2026-05-26', text: 'Complaint registered'}] }
        ]);
        console.log('✅ WelfareRecords seeded successfully.');
      }

      return;
    }
    console.log('🌱 Empty database detected – seeding fresh demo data...');
    console.log('🌱 Auto-seeding fresh demo data across all 6 roles & departments...');

    // 1. Users (bcrypt hash triggers via pre-save hook)
    const userDocs = await User.create([
      { name: 'Global Super Admin', email: 'superadmin@erpsaas.com',     password: 'superadmin123', role: 'Super Admin' },
      { name: 'System Admin',     email: 'admin@college.edu',        password: 'password123', role: 'Admin' },
      { name: 'Dr. Suresh Kumar', email: 'principal@college.edu',    password: 'password123', role: 'Principal' },
      
      // Custom credentials requested by user
      { name: 'Vaideeswari (Admin)', email: 'vaidee@gmail.com',     password: 'vaidee', role: 'Admin' },
      { name: 'Vaideeswari (Admin)', email: 'vaideeswari@gmail.com', password: 'password123', role: 'Admin' },
      { name: 'Sree (Principal)', email: 'sree@gmail.com',         password: 'sree123', role: 'Principal' },
      { name: 'Pooja (Staff)',    email: 'pooja@gmail.com',        password: 'pooja', role: 'Staff', department: 'Computer Science', referenceId: 'STF008', subjects: ['Data Structures'] },
      
      { name: 'Sub Admin',        email: 'subadmin@college.edu',     password: 'password123', role: 'Sub Admin', permissions: [
        "view_departments",
        "manage_students",
        "manage_staff",
        "view_attendance",
        "create_announcements",
        "view_reports"
      ] },
      
      { name: 'John Doe',         email: 'john@college.edu',         password: 'password123', role: 'Student', department: 'Computer Science', referenceId: 'CS2022001', studentId: 'CS2022001' },
      { name: 'Emily Davis',      email: 'emily@college.edu',        password: 'password123', role: 'Student', department: 'Computer Science', referenceId: 'CS2021004', studentId: 'CS2021004' },
      { name: 'David Lee',        email: 'david@college.edu',        password: 'password123', role: 'Student', department: 'Computer Science', referenceId: 'CS2022002', studentId: 'CS2022002' },
      { name: 'Alice Smith',      email: 'alice@college.edu',        password: 'password123', role: 'Student', department: 'Electrical & Electronics', referenceId: 'EE2022001', studentId: 'EE2022001' },
      { name: 'Sarah Wilson',     email: 'sarah@college.edu',        password: 'password123', role: 'Student', department: 'Electrical & Electronics', referenceId: 'EE2022002', studentId: 'EE2022002' },
      { name: 'Vikram Seth',      email: 'vikram@college.edu',       password: 'password123', role: 'Student', department: 'Electronics & Comm.', referenceId: 'EC2022001', studentId: 'EC2022001' },
      { name: 'Neha Gupta',       email: 'neha@college.edu',         password: 'password123', role: 'Student', department: 'Electronics & Comm.', referenceId: 'EC2022002', studentId: 'EC2022002' },
      { name: 'Robert Johnson',   email: 'robert@college.edu',       password: 'password123', role: 'Student', department: 'Mechanical Engg.', referenceId: 'ME2023001', studentId: 'ME2023001' },
      { name: 'Karan Malhotra',   email: 'karan@college.edu',        password: 'password123', role: 'Student', department: 'Bachelor of Computer App.', referenceId: 'BC2022001', studentId: 'BC2022001' },
      { name: 'Ritu Sen',         email: 'ritu@college.edu',         password: 'password123', role: 'Student', department: 'Master of Business Admin.', referenceId: 'MB2022001', studentId: 'MB2022001' },

      // Parents
      { name: 'Parent of John',   email: 'parent_john@college.edu',  password: 'password123', role: 'Parent',  referenceId: 'CS2022001', parentOf: 'CS2022001' },
      { name: 'Parent of Alice',  email: 'parent_alice@college.edu', password: 'password123', role: 'Parent',  referenceId: 'EE2022001', parentOf: 'EE2022001' },
      
      // Accounts
      { name: 'Accounts Officer', email: 'accounts@college.edu',     password: 'password123', role: 'Accounts' },

      // HODs
      { name: 'CSE HOD',          email: 'csehod@gmail.com',         password: 'password123', role: 'HOD', department: 'Computer Science', referenceId: 'STF001' },
      { name: 'ECE HOD',          email: 'ecehod@gmail.com',         password: 'password123', role: 'HOD', department: 'Electronics & Comm.', referenceId: 'STF002' },
      { name: 'EEE HOD',          email: 'eeehod@gmail.com',         password: 'password123', role: 'HOD', department: 'Electrical & Electronics', referenceId: 'STF003' },
      { name: 'MECH HOD',         email: 'mechhod@gmail.com',        password: 'password123', role: 'HOD', department: 'Mechanical Engg.', referenceId: 'STF004' },
      { name: 'BCA HOD',          email: 'bcahod@gmail.com',         password: 'password123', role: 'HOD', department: 'Bachelor of Computer App.', referenceId: 'STF005' },
      { name: 'MBA HOD',          email: 'mbahod@gmail.com',         password: 'password123', role: 'HOD', department: 'Master of Business Admin.', referenceId: 'STF006' },
      { name: 'Dr.Agila',         email: 'agila@gmail.com',          password: 'agila', role: 'HOD', department: 'Information Technology', referenceId: 'HOD001' },

      // Staff
      { name: 'Prof. Karthik S.', email: 'karthik@college.edu',      password: 'password123', role: 'Staff', department: 'Computer Science', referenceId: 'STF007', subjects: ['OS', 'Machine Learning'] },
    ]);

    // 2. Departments
    if ((await Department.countDocuments()) === 0) {
      await Department.insertMany([
        { id: 'DEPT001', name: 'Computer Science',          code: 'CSE',  hod: 'CSE HOD',          totalStudents: 3 },
        { id: 'DEPT002', name: 'Electronics & Comm.',       code: 'ECE',  hod: 'ECE HOD',          totalStudents: 2 },
        { id: 'DEPT003', name: 'Electrical & Electronics',  code: 'EEE',  hod: 'EEE HOD',          totalStudents: 2 },
        { id: 'DEPT004', name: 'Mechanical Engg.',          code: 'MECH', hod: 'MECH HOD',         totalStudents: 1 },
        { id: 'DEPT005', name: 'Bachelor of Computer App.', code: 'BCA',  hod: 'BCA HOD',          totalStudents: 1 },
        { id: 'DEPT006', name: 'Master of Business Admin.', code: 'MBA',  hod: 'MBA HOD',          totalStudents: 1 },
      ]);
    }

    // 3. Students
    await Student.insertMany([
      { id: 'CS2022001', name: 'John Doe',       email: 'john@college.edu',    phone: '9876543210', dept: 'Computer Science',          sem: 'Sem 6', cgpa: 8.6, attendance: 85, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'CS2021004', name: 'Emily Davis',    email: 'emily@college.edu',   phone: '9823456789', dept: 'Computer Science',          sem: 'Sem 6', cgpa: 8.9, attendance: 98, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'CS2022002', name: 'David Lee',      email: 'david@college.edu',   phone: '9890123456', dept: 'Computer Science',          sem: 'Sem 3', cgpa: 8.2, attendance: 88, status: 'Active',   feeStatus: 'Partial' },
      { id: 'EE2022001', name: 'Alice Smith',    email: 'alice@college.edu',   phone: '9845123456', dept: 'Electrical & Electronics',  sem: 'Sem 4', cgpa: 9.1, attendance: 95, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'EE2022002', name: 'Sarah Wilson',   email: 'sarah@college.edu',   phone: '9801234567', dept: 'Electrical & Electronics',  sem: 'Sem 4', cgpa: 9.5, attendance: 91, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'EC2022001', name: 'Vikram Seth',    email: 'vikram@college.edu',  phone: '9811122233', dept: 'Electronics & Comm.',       sem: 'Sem 6', cgpa: 8.8, attendance: 90, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'EC2022002', name: 'Neha Gupta',     email: 'neha@college.edu',    phone: '9822233344', dept: 'Electronics & Comm.',       sem: 'Sem 6', cgpa: 8.5, attendance: 75, status: 'Active',   feeStatus: 'Pending' },
      { id: 'ME2023001', name: 'Robert Johnson', email: 'robert@college.edu',  phone: '9812987654', dept: 'Mechanical Engg.',          sem: 'Sem 2', cgpa: 7.8, attendance: 68, status: 'Active',   feeStatus: 'Partial' },
      { id: 'BC2022001', name: 'Karan Malhotra', email: 'karan@college.edu',   phone: '9856789012', dept: 'Bachelor of Computer App.', sem: 'Sem 5', cgpa: 8.7, attendance: 94, status: 'Active',   feeStatus: 'Paid'    },
      { id: 'MB2022001', name: 'Ritu Sen',       email: 'ritu@college.edu',    phone: '9867123456', dept: 'Master of Business Admin.', sem: 'Sem 4', cgpa: 9.2, attendance: 96, status: 'Active',   feeStatus: 'Paid'    },
    ]);

    // Create Student Profiles for matching user documents
    const studentUsers = userDocs.filter(u => u.role === 'Student');
    const studentProfiles = [];
    for (const s of studentUsers) {
      const semester = s.referenceId.startsWith('ME') ? 2 : s.referenceId.startsWith('CS2022002') ? 3 : s.referenceId.startsWith('EE') ? 4 : s.referenceId.startsWith('BC') ? 5 : 6;
      const cgpa = s.referenceId === 'CS2022001' ? 8.6 : s.referenceId === 'CS2021004' ? 8.9 : s.referenceId === 'CS2022002' ? 8.2 : s.referenceId === 'EE2022001' ? 9.1 : s.referenceId === 'EE2022002' ? 9.5 : s.referenceId === 'EC2022001' ? 8.8 : s.referenceId === 'EC2022002' ? 8.5 : s.referenceId === 'ME2023001' ? 7.8 : s.referenceId === 'BC2022001' ? 8.7 : 9.2;
      
      const profile = await StudentProfile.create({
        user: s._id,
        regNo: s.referenceId,
        department: s.department,
        semester: semester,
        section: 'A',
        cgpa: cgpa
      });
      studentProfiles.push(profile);
    }
    const studentProfilesMap = {};
    studentProfiles.forEach(p => {
      studentProfilesMap[p.regNo] = p;
    });

    // 4. Staff
    await Staff.insertMany([
      { id: 'STF001', name: 'CSE HOD',          email: 'csehod@gmail.com',    phone: '9900000001', dept: 'Computer Science',          designation: 'HOD',             subjects: ['Algorithms', 'Compiler Design'], workload: 12, attendance: 98 },
      { id: 'STF002', name: 'ECE HOD',          email: 'ecehod@gmail.com',    phone: '9900000002', dept: 'Electronics & Comm.',       designation: 'HOD',             subjects: ['Signals & Systems'],            workload: 10, attendance: 96 },
      { id: 'STF003', name: 'EEE HOD',          email: 'eeehod@gmail.com',    phone: '9900000003', dept: 'Electrical & Electronics',  designation: 'HOD',             subjects: ['Circuits', 'Networks'],         workload: 14, attendance: 95 },
      { id: 'STF004', name: 'MECH HOD',         email: 'mechhod@gmail.com',   phone: '9900000004', dept: 'Mechanical Engg.',          designation: 'HOD',             subjects: ['Thermodynamics'],               workload: 12, attendance: 93 },
      { id: 'STF005', name: 'BCA HOD',          email: 'bcahod@gmail.com',    phone: '9900000005', dept: 'Bachelor of Computer App.', designation: 'HOD',             subjects: ['Java Programming'],             workload: 12, attendance: 97 },
      { id: 'STF006', name: 'MBA HOD',          email: 'mbahod@gmail.com',    phone: '9900000006', dept: 'Master of Business Admin.', designation: 'HOD',             subjects: ['Strategic Management'],         workload: 10, attendance: 94 },
      
      { id: 'STF007', name: 'Prof. Karthik S.', email: 'karthik@college.edu', phone: '9823456789', dept: 'Computer Science',          designation: 'Assistant Prof.', subjects: ['OS', 'Machine Learning'],       workload: 20, attendance: 89 },
      { id: 'STF008', name: 'Dr. Ananya Rao',   email: 'ananya@college.edu',  phone: '9876543210', dept: 'Computer Science',          designation: 'Professor',       subjects: ['Data Structures', 'DBMS'],      workload: 18, attendance: 97 },
      { id: 'STF009', name: 'Dr. Meena Pillai', email: 'meena@college.edu',   phone: '9812987654', dept: 'Electronics & Comm.',       designation: 'Associate Prof.', subjects: ['Microprocessors'],              workload: 16, attendance: 92 },
    ]);

    // 5. Attendance
    await Attendance.insertMany([
      { tenantId: 'unassigned_college', studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', date: new Date('2026-05-20'), attendanceDate: new Date('2026-05-20'), status: 'Present', subject: 'Data Structures', markedBy: 'Dr. Ananya Rao' },
      { tenantId: 'unassigned_college', studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', date: new Date('2026-05-21'), attendanceDate: new Date('2026-05-21'), status: 'Present', subject: 'DBMS', markedBy: 'Dr. Ananya Rao' },
      { tenantId: 'unassigned_college', studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', date: new Date('2026-05-22'), attendanceDate: new Date('2026-05-22'), status: 'Present', subject: 'OS', markedBy: 'Prof. Karthik S.' },
      
      { tenantId: 'unassigned_college', studentId: 'CS2021004', studentName: 'Emily Davis', registerNo: 'CS2021004', department: 'Computer Science', semester: 'Sem 6', date: new Date('2026-05-20'), attendanceDate: new Date('2026-05-20'), status: 'Present', subject: 'Data Structures', markedBy: 'Dr. Ananya Rao' },
      { tenantId: 'unassigned_college', studentId: 'CS2021004', studentName: 'Emily Davis', registerNo: 'CS2021004', department: 'Computer Science', semester: 'Sem 6', date: new Date('2026-05-21'), attendanceDate: new Date('2026-05-21'), status: 'Present', subject: 'DBMS', markedBy: 'Dr. Ananya Rao' },
      { tenantId: 'unassigned_college', studentId: 'CS2021004', studentName: 'Emily Davis', registerNo: 'CS2021004', department: 'Computer Science', semester: 'Sem 6', date: new Date('2026-05-22'), attendanceDate: new Date('2026-05-22'), status: 'Present', subject: 'OS', markedBy: 'Prof. Karthik S.' },

      { tenantId: 'unassigned_college', studentId: 'CS2022002', studentName: 'David Lee', registerNo: 'CS2022002', department: 'Computer Science', semester: 'Sem 3', date: new Date('2026-05-20'), attendanceDate: new Date('2026-05-20'), status: 'Present', subject: 'Data Structures', markedBy: 'Dr. Ananya Rao' },
      { tenantId: 'unassigned_college', studentId: 'CS2022002', studentName: 'David Lee', registerNo: 'CS2022002', department: 'Computer Science', semester: 'Sem 3', date: new Date('2026-05-21'), attendanceDate: new Date('2026-05-21'), status: 'Absent', subject: 'DBMS', markedBy: 'Dr. Ananya Rao' },
      { tenantId: 'unassigned_college', studentId: 'CS2022002', studentName: 'David Lee', registerNo: 'CS2022002', department: 'Computer Science', semester: 'Sem 3', date: new Date('2026-05-22'), attendanceDate: new Date('2026-05-22'), status: 'Present', subject: 'OS', markedBy: 'Prof. Karthik S.' },
    ]);

    // 6. Marks
    await Mark.insertMany([
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', subject: 'Data Structures', internalMarks: 42, semesterMarks: 85, totalMarks: 127, grade: 'O', gpa: 9.0, cgpa: 8.6, arrearStatus: 'Clear' },
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', subject: 'Database Management Systems', internalMarks: 40, semesterMarks: 87, totalMarks: 127, grade: 'A+', gpa: 8.9, cgpa: 8.6, arrearStatus: 'Clear' },
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', subject: 'Operating Systems', internalMarks: 44, semesterMarks: 78, totalMarks: 122, grade: 'A+', gpa: 8.2, cgpa: 8.6, arrearStatus: 'Clear' },
      
      { studentId: 'CS2021004', studentName: 'Emily Davis', registerNo: 'CS2021004', department: 'Computer Science', semester: 'Sem 6', subject: 'Database Management Systems', internalMarks: 45, semesterMarks: 90, totalMarks: 135, grade: 'O', gpa: 9.5, cgpa: 8.9, arrearStatus: 'Clear' },
      { studentId: 'CS2021004', studentName: 'Emily Davis', registerNo: 'CS2021004', department: 'Computer Science', semester: 'Sem 6', subject: 'Operating Systems', internalMarks: 46, semesterMarks: 92, totalMarks: 138, grade: 'O', gpa: 9.6, cgpa: 8.9, arrearStatus: 'Clear' },

      { studentId: 'CS2022002', studentName: 'David Lee', registerNo: 'CS2022002', department: 'Computer Science', semester: 'Sem 3', subject: 'Data Structures', internalMarks: 38, semesterMarks: 72, totalMarks: 110, grade: 'A', gpa: 8.0, cgpa: 8.2, arrearStatus: 'Clear' },
      
      { studentId: 'EE2022001', studentName: 'Alice Smith', registerNo: 'EE2022001', department: 'Electrical & Electronics', semester: 'Sem 4', subject: 'Circuits', internalMarks: 45, semesterMarks: 88, totalMarks: 133, grade: 'A+', gpa: 9.1, cgpa: 9.1, arrearStatus: 'Clear' },
      { studentId: 'EE2022002', studentName: 'Sarah Wilson', registerNo: 'EE2022002', department: 'Electrical & Electronics', semester: 'Sem 4', subject: 'Networks', internalMarks: 47, semesterMarks: 91, totalMarks: 138, grade: 'O', gpa: 9.5, cgpa: 9.5, arrearStatus: 'Clear' },
      
      { studentId: 'EC2022001', studentName: 'Vikram Seth', registerNo: 'EC2022001', department: 'Electronics & Comm.', semester: 'Sem 6', subject: 'Microprocessors', internalMarks: 43, semesterMarks: 82, totalMarks: 125, grade: 'A+', gpa: 8.8, cgpa: 8.8, arrearStatus: 'Clear' },
      { studentId: 'EC2022002', studentName: 'Neha Gupta', registerNo: 'EC2022002', department: 'Electronics & Comm.', semester: 'Sem 6', subject: 'Signals & Systems', internalMarks: 42, semesterMarks: 80, totalMarks: 122, grade: 'A+', gpa: 8.5, cgpa: 8.5, arrearStatus: 'Clear' },
      
      { studentId: 'ME2023001', studentName: 'Robert Johnson', registerNo: 'ME2023001', department: 'Mechanical Engg.', semester: 'Sem 2', subject: 'Thermodynamics', internalMarks: 36, semesterMarks: 65, totalMarks: 101, grade: 'B+', gpa: 7.8, cgpa: 7.8, arrearStatus: 'Clear' },
      { studentId: 'BC2022001', studentName: 'Karan Malhotra', registerNo: 'BC2022001', department: 'Bachelor of Computer App.', semester: 'Sem 5', subject: 'Web Programming', internalMarks: 41, semesterMarks: 83, totalMarks: 124, grade: 'A+', gpa: 8.7, cgpa: 8.7, arrearStatus: 'Clear' },
      { studentId: 'MB2022001', studentName: 'Ritu Sen', registerNo: 'MB2022001', department: 'Master of Business Admin.', semester: 'Sem 4', subject: 'Financial Accounting', internalMarks: 44, semesterMarks: 89, totalMarks: 133, grade: 'O', gpa: 9.2, cgpa: 9.2, arrearStatus: 'Clear' }
    ]);

    // 7. Fees
    await Fee.insertMany([
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', totalFees: 850000, paidAmount: 850000, pendingAmount: 0, paymentDate: new Date('2026-05-15'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-001' },
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', totalFees: 120000, paidAmount: 120000, pendingAmount: 0, paymentDate: new Date('2026-05-15'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-002' },
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', totalFees: 340000, paidAmount: 340000, pendingAmount: 0, paymentDate: new Date('2026-05-16'), paymentMode: 'Net Banking', status: 'Paid', receiptNo: 'REC-003' },
      { studentId: 'CS2022001', studentName: 'John Doe', registerNo: 'CS2022001', department: 'Computer Science', semester: 'Sem 6', totalFees: 180000, paidAmount: 180000, pendingAmount: 0, paymentDate: new Date('2026-05-16'), paymentMode: 'UPI', status: 'Paid', receiptNo: 'REC-004' },
      
      { studentId: 'CS2021004', studentName: 'Emily Davis', registerNo: 'CS2021004', department: 'Computer Science', semester: 'Sem 6', totalFees: 850000, paidAmount: 850000, pendingAmount: 0, paymentDate: new Date('2026-05-10'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-005' },
      { studentId: 'CS2022002', studentName: 'David Lee', registerNo: 'CS2022002', department: 'Computer Science', semester: 'Sem 3', totalFees: 150000, paidAmount: 50000, pendingAmount: 100000, paymentDate: new Date('2026-05-18'), paymentMode: 'Cash', status: 'Partial', receiptNo: 'REC-006' },
      
      { studentId: 'EE2022001', studentName: 'Alice Smith', registerNo: 'EE2022001', department: 'Electrical & Electronics', semester: 'Sem 4', totalFees: 150000, paidAmount: 150000, pendingAmount: 0, paymentDate: new Date('2026-05-12'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-007' },
      { studentId: 'EE2022002', studentName: 'Sarah Wilson', registerNo: 'EE2022002', department: 'Electrical & Electronics', semester: 'Sem 4', totalFees: 150000, paidAmount: 150000, pendingAmount: 0, paymentDate: new Date('2026-05-12'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-008' },
      
      { studentId: 'EC2022001', studentName: 'Vikram Seth', registerNo: 'EC2022001', department: 'Electronics & Comm.', semester: 'Sem 6', totalFees: 120000, paidAmount: 120000, pendingAmount: 0, paymentDate: new Date('2026-05-11'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-009' },
      { studentId: 'EC2022002', studentName: 'Neha Gupta', registerNo: 'EC2022002', department: 'Electronics & Comm.', semester: 'Sem 6', totalFees: 120000, paidAmount: 0, pendingAmount: 120000, status: 'Pending' },
      
      { studentId: 'ME2023001', studentName: 'Robert Johnson', registerNo: 'ME2023001', department: 'Mechanical Engg.', semester: 'Sem 2', totalFees: 160000, paidAmount: 80000, pendingAmount: 80000, paymentDate: new Date('2026-05-14'), paymentMode: 'Online', status: 'Partial', receiptNo: 'REC-010' },
      { studentId: 'BC2022001', studentName: 'Karan Malhotra', registerNo: 'BC2022001', department: 'Bachelor of Computer App.', semester: 'Sem 5', totalFees: 140000, paidAmount: 140000, pendingAmount: 0, paymentDate: new Date('2026-05-13'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-011' },
      { studentId: 'MB2022001', studentName: 'Ritu Sen', registerNo: 'MB2022001', department: 'Master of Business Admin.', semester: 'Sem 4', totalFees: 250000, paidAmount: 250000, pendingAmount: 0, paymentDate: new Date('2026-05-09'), paymentMode: 'Online', status: 'Paid', receiptNo: 'REC-012' }
    ]);

    // 8. Library Books & Issues
    const bookDocs = await Book.insertMany([
      { bookId: 'B001', isbn: '978-0131103627', title: 'The C Programming Language', author: 'Brian W. Kernighan', category: 'Computer Science', department: 'Computer Science', totalCopies: 15, availableCopies: 12, copies: 15, available: 12 },
      { bookId: 'B002', isbn: '978-0201835953', title: 'The Mythical Man-Month', author: 'Frederick P. Brooks Jr.', category: 'Software Engg', department: 'Computer Science', totalCopies: 5, availableCopies: 1, copies: 5, available: 1 },
      { bookId: 'B003', isbn: '978-0262033848', title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', category: 'Computer Science', department: 'Computer Science', totalCopies: 10, availableCopies: 5, copies: 10, available: 5 },
      { bookId: 'B004', isbn: '978-1118531648', title: 'Engineering Mechanics', author: 'J.L. Meriam', category: 'Mechanical', department: 'Mechanical Engg.', totalCopies: 8, availableCopies: 0, copies: 8, available: 0 },
      { bookId: 'B005', isbn: '978-0073380490', title: 'Power System Analysis', author: 'John Grainger', category: 'Electrical', department: 'Electrical & Electronics', totalCopies: 12, availableCopies: 8, copies: 12, available: 8 },
    ]);

    await IssueRecord.insertMany([
      { issueId: 'IS-101', bookId: bookDocs[2]._id, bookTitle: bookDocs[2].title, studentName: 'John Doe', regNo: 'CS2022001', issueDate: new Date('2026-05-01'), dueDate: new Date('2026-05-15'), status: 'Overdue', fine: 150 },
      { issueId: 'IS-102', bookId: bookDocs[3]._id, bookTitle: bookDocs[3].title, studentName: 'Robert Johnson', regNo: 'ME2023001', issueDate: new Date('2026-05-15'), dueDate: new Date('2026-05-30'), status: 'Issued', fine: 0 },
      { issueId: 'IS-103', bookId: bookDocs[1]._id, bookTitle: bookDocs[1].title, studentName: 'Alice Smith', regNo: 'EE2022001', issueDate: new Date('2026-05-10'), dueDate: new Date('2026-05-24'), status: 'Issued', fine: 0 },
    ]);

    // 9. Transport
    await TransportRoute.insertMany([
      { routeId: 'R001', name: 'City Center Express', vehicle: 'TN-01-AB-1234', driver: 'Rajesh Kumar', capacity: 40, occupied: 35, points: ['College', 'Main Junction', 'City Mall', 'Central Station'] },
      { routeId: 'R002', name: 'North Suburb Route', vehicle: 'TN-02-XY-9876', driver: 'Suresh Singh', capacity: 40, occupied: 40, points: ['College', 'North Gate', 'Tech Park', 'Airport Road'] },
      { routeId: 'R003', name: 'South Colony Direct', vehicle: 'TN-05-MN-5566', driver: 'Murugan T.', capacity: 30, occupied: 12, points: ['College', 'South Avenue', 'Beach Road'] },
    ]);

    await TransportDriver.insertMany([
      { driverId: 'D001', name: 'Rajesh Kumar', license: 'DL-123456', experience: '8 Years', phone: '9876543210', status: 'Active' },
      { driverId: 'D002', name: 'Suresh Singh', license: 'DL-987654', experience: '5 Years', phone: '9988776655', status: 'Active' },
      { driverId: 'D003', name: 'Murugan T.', license: 'DL-456123', experience: '12 Years', phone: '9123456780', status: 'On Leave' },
    ]);

    await TransportStudent.insertMany([
      { studentProfile: studentProfilesMap['CS2022001']._id, studentId: 'CS2022001', name: 'John Doe', routeId: 'R001', pickupPoint: 'City Mall', feeStatus: 'Paid', amount: 15000 },
      { studentProfile: studentProfilesMap['EE2022001']._id, studentId: 'EE2022001', name: 'Alice Smith', routeId: 'R002', pickupPoint: 'Tech Park', feeStatus: 'Pending', amount: 18000 },
      { studentProfile: studentProfilesMap['EC2022001']._id, studentId: 'EC2022001', name: 'Vikram Seth', routeId: 'R001', pickupPoint: 'Main Junction', feeStatus: 'Paid', amount: 12000 },
    ]);

    // 10. Hostel
    await HostelBlock.insertMany([
      { blockId: 'B-Boys-01', name: 'Boys Block A', capacity: 100, occupied: 90, warden: 'Mr. Ramesh' },
      { blockId: 'B-Girls-01', name: 'Girls Block A', capacity: 80, occupied: 76, warden: 'Mrs. Sita' },
    ]);

    await HostelRoom.insertMany([
      { roomId: 'R-101', block: 'Boys Block A', capacity: 2, occupied: 2, type: 'Non-AC' },
      { roomId: 'R-102', block: 'Boys Block A', capacity: 2, occupied: 1, type: 'AC' },
      { roomId: 'R-G-201', block: 'Girls Block A', capacity: 3, occupied: 3, type: 'Non-AC' },
    ]);

    await HostelStudent.insertMany([
      { studentProfile: studentProfilesMap['CS2022001']._id, studentId: 'CS2022001', name: 'John Doe', block: 'Boys Block A', room: 'R-101', feeStatus: 'Paid', amount: 45000 },
      { studentProfile: studentProfilesMap['EE2022001']._id, studentId: 'EE2022001', name: 'Alice Smith', block: 'Girls Block A', room: 'R-G-201', feeStatus: 'Pending', amount: 45000 },
      { studentProfile: studentProfilesMap['ME2023001']._id, studentId: 'ME2023001', name: 'Robert Johnson', block: 'Boys Block A', room: 'R-102', feeStatus: 'Paid', amount: 60000 },
    ]);

    await HostelComplaint.insertMany([
      { complaintId: 'C001', studentId: 'CS2022001', studentName: 'John Doe', room: '101', category: 'Maintenance', description: 'Fan not working', status: 'Pending Review', date: new Date('2026-05-25') },
      { complaintId: 'C002', studentId: 'EE2022001', studentName: 'Alice Smith', room: 'G-101', category: 'Plumbing', description: 'Water leakage', status: 'Resolved', date: new Date('2026-05-20') },
    ]);

    // 11. Placement
    await PlacementCompany.insertMany([
      { companyId: 'C001', name: 'Google', sector: 'IT / Software', location: 'Bangalore', drives: 2, status: 'Active' },
      { companyId: 'C002', name: 'Microsoft', sector: 'IT / Software', location: 'Hyderabad', drives: 1, status: 'Active' },
      { companyId: 'C003', name: 'TCS', sector: 'IT Services', location: 'Chennai', drives: 4, status: 'Active' },
    ]);

    await PlacementJob.insertMany([
      { jobId: 'J001', company: 'Microsoft', role: 'SDE', ctc: '22 LPA', eligibility: '8.0 CGPA', deadline: new Date('2026-06-10') },
      { jobId: 'J002', company: 'TCS', role: 'System Engineer', ctc: '7 LPA', eligibility: '6.5 CGPA', deadline: new Date('2026-06-15') },
    ]);

    await PlacementApplication.insertMany([
      { applicationId: 'APP001', studentProfile: studentProfilesMap['CS2022001']._id, student: 'John Doe', regNo: 'CS2022001', company: 'Microsoft', role: 'SDE', status: 'Applied' },
      { applicationId: 'APP002', studentProfile: studentProfilesMap['CS2021004']._id, student: 'Emily Davis', regNo: 'CS2021004', company: 'Microsoft', role: 'SDE', status: 'Shortlisted' },
      { applicationId: 'APP003', studentProfile: studentProfilesMap['EE2022001']._id, student: 'Alice Smith', regNo: 'EE2022001', company: 'TCS', role: 'System Engineer', status: 'Applied' },
    ]);

    await PlacementInterview.insertMany([
      { interviewId: 'I001', company: 'Google', role: 'Software Engineer', round: 'Technical 1', date: new Date('2026-06-18'), time: '10:00 AM', mode: 'Online', candidates: 45 },
    ]);

    await PlacementSelection.insertMany([
      { selectionId: 'S001', student: 'Vikram Seth', regNo: 'CS2022045', company: 'Microsoft', role: 'SDE', ctc: '22 LPA', date: new Date('2026-05-20') },
    ]);

    // 12. Settings & Logs
    await SystemSetting.create({ key: 'global_config' }); // Uses default values
    await LoginLog.insertMany([
      { user: 'Admin (admin@college.edu)', role: 'Admin', ip: '192.168.1.45', browser: 'Chrome / Windows', time: '2026-05-26 10:15 AM', status: 'Success' },
      { user: 'csehod@college.edu', role: 'HOD', ip: '192.168.1.102', browser: 'Safari / macOS', time: '2026-05-26 09:30 AM', status: 'Success' },
      { user: 'Unknown', role: 'Unknown', ip: '45.22.11.9', browser: 'Firefox / Linux', time: '2026-05-26 02:15 AM', status: 'Failed (Bad Password)' },
      { user: 'john@college.edu', role: 'Student', ip: '10.0.0.15', browser: 'Chrome / Android', time: '2026-05-25 08:45 PM', status: 'Success' },
    ]);

    // 13. Notifications
    const adminUser = await User.findOne({ role: 'Admin' });
    await Notification.insertMany([
      { recipient: adminUser._id, title: 'Low Attendance Alert', message: '3 students in CSE have attendance below 75%.', type: 'Warning', link: '/admin/attendance' },
      { recipient: adminUser._id, title: 'Fee Collection Update', message: '₹4,50,000 collected today.', type: 'Success', link: '/admin/fees' },
      { recipient: adminUser._id, title: 'New Leave Request', message: 'Dr. Ananya Rao requested leave for 2 days.', type: 'Info', link: '/admin/leaves' }
    ]);

    // 14. Approvals
    await Approval.deleteMany();
    await Approval.insertMany([
      {
        type: 'Budget Request',
        department: 'Computer Science',
        requestedBy: 'CSE HOD',
        date: 'May 24, 2026',
        priority: 'High',
        status: 'Pending',
        details: 'Requesting ₹1,50,000 for CSE department cloud infrastructure laboratory upgrade (AWS credits and server maintenance).',
        aiRecommendation: 'Safe to Approve. Within CS quarterly allocation budget limit of ₹2,00,000.',
        aiScore: 92
      },
      {
        type: 'Leave Request',
        department: 'Electronics & Comm.',
        requestedBy: 'ECE HOD',
        date: 'May 26, 2026',
        priority: 'Medium',
        status: 'Pending',
        details: 'Casual leave request for ECE HOD from May 28 to May 30 due to family wedding.',
        aiRecommendation: 'Safe to Approve. Staff backup assigned: Dr. Meena Pillai.',
        aiScore: 97
      },
      {
        type: 'Department Event',
        department: 'Electrical & Electronics',
        requestedBy: 'EEE HOD',
        date: 'May 25, 2026',
        priority: 'Low',
        status: 'Pending',
        details: 'Approval requested to host annual National Energy Conservation Workshop on June 12 in seminar hall.',
        aiRecommendation: 'Highly Recommended. Fosters college industry exposure and has high placement conversion correlation.',
        aiScore: 99
      },
      {
        type: 'Placement Drive',
        department: 'Computer Science',
        requestedBy: 'CSE HOD',
        date: 'May 24, 2026',
        priority: 'High',
        status: 'Approved',
        details: 'Microsoft campus hiring drive logistics approval for CSE and ECE students on June 18.',
        aiRecommendation: 'Approved. Essential institutional driver.',
        aiScore: 98,
        remarks: 'Approved. Ensure auditorium is prepared.'
      }
    ]);

    // 15. Exams Timetable
    await Exam.deleteMany();
    await Exam.insertMany([
      { name: 'Mid Term Test', dept: 'Computer Science', subject: 'Data Structures', date: '2026-05-28', time: '10:00 AM - 12:00 PM', room: 'Block A, Room 301', maxMarks: 50, createdBy: 'System' },
      { name: 'End Sem Theory', dept: 'Computer Science', subject: 'DBMS', date: '2026-06-02', time: '10:00 AM - 01:00 PM', room: 'Main Examination Hall', maxMarks: 100, createdBy: 'System' },
      { name: 'Semester Lab Exam', dept: 'Electrical Engg.', subject: 'Circuits & Networks', date: '2026-05-30', time: '01:30 PM - 04:30 PM', room: 'EE Core Lab 2', maxMarks: 100, createdBy: 'System' },
      { name: 'Mid Term Test', dept: 'Mechanical Engg.', subject: 'Thermodynamics', date: '2026-06-12', time: '10:00 AM - 12:00 PM', room: 'Block C, Hall 1', maxMarks: 50, createdBy: 'System' }
    ]);

    // 16. Salary / Payroll Seed
    await Salary.insertMany([
      { staffId: 'STF001', staffName: 'CSE HOD',          designation: 'HOD',             department: 'Computer Science',          billingMonth: 'May 2026', basicPay: 85000, allowances: 15000, deductions: 5000, netSalary: 95000, status: 'Disbursed', paymentDate: new Date('2026-05-25'), paymentMode: 'Bank Transfer' },
      { staffId: 'STF002', staffName: 'ECE HOD',          designation: 'HOD',             department: 'Electronics & Comm.',       billingMonth: 'May 2026', basicPay: 85000, allowances: 15000, deductions: 5000, netSalary: 95000, status: 'Disbursed', paymentDate: new Date('2026-05-25'), paymentMode: 'Bank Transfer' },
      { staffId: 'STF003', staffName: 'EEE HOD',          designation: 'HOD',             department: 'Electrical & Electronics',  billingMonth: 'May 2026', basicPay: 85000, allowances: 15000, deductions: 5000, netSalary: 95000, status: 'Disbursed', paymentDate: new Date('2026-05-25'), paymentMode: 'Bank Transfer' },
      { staffId: 'STF004', staffName: 'MECH HOD',         designation: 'HOD',             department: 'Mechanical Engg.',          billingMonth: 'May 2026', basicPay: 85000, allowances: 15000, deductions: 5000, netSalary: 95000, status: 'Pending',   paymentMode: 'Bank Transfer' },
      { staffId: 'STF007', staffName: 'Prof. Karthik S.', designation: 'Assistant Prof.', department: 'Computer Science',          billingMonth: 'May 2026', basicPay: 65000, allowances: 10000, deductions: 3000, netSalary: 72000, status: 'Pending',   paymentMode: 'Bank Transfer' },
      { staffId: 'STF008', staffName: 'Dr. Ananya Rao',   designation: 'Professor',       department: 'Computer Science',          billingMonth: 'May 2026', basicPay: 90000, allowances: 20000, deductions: 8000, netSalary: 102000, status: 'Disbursed', paymentDate: new Date('2026-05-25'), paymentMode: 'Bank Transfer' },
      { staffId: 'STF009', staffName: 'Dr. Meena Pillai', designation: 'Associate Prof.', department: 'Electronics & Comm.',       billingMonth: 'May 2026', basicPay: 75000, allowances: 12000, deductions: 4000, netSalary: 83000, status: 'Pending',   paymentMode: 'Bank Transfer' },
    ]);

    // 17. Welfare Records Seed
    await WelfareRecord.deleteMany();
    await WelfareRecord.insertMany([
      { studentName: 'Rohan Sharma', department: 'Computer Science', issueType: 'Disciplinary', reportedBy: 'HOD CSE', priority: 'High', date: '2026-05-24', status: 'Counselor Assigned', description: 'Caught proxying attendance in lab.', timeline: [{date: '2026-05-24', text: 'Misconduct incident reported by HOD CSE'}, {date: '2026-05-26', text: 'Counselor assigned for behavioral counseling assessment'}] },
      { studentName: 'Ananya Sen', department: 'Electronics & Comm.', issueType: 'Scholarship', reportedBy: 'Accounts Board', priority: 'Medium', date: '2026-05-20', status: 'Resolved', description: 'Requires Principal approval for 20% fee waiver.', timeline: [{date: '2026-05-20', text: 'Scholarship application compiled by registrar'}, {date: '2026-05-23', text: 'Annual fee waiver disbursement successfully cleared'}] },
      { studentName: 'Karan Malhotra', department: 'Mechanical Engg.', issueType: 'Anti-Ragging', reportedBy: 'Student Welfare', priority: 'High', date: '2026-05-25', status: 'Under Investigation', description: 'Reported bullying in hostel premises.', timeline: [{date: '2026-05-25', text: 'Hostel warden submitted report to Welfare Board'}, {date: '2026-05-26', text: 'Anti-ragging cell mobilized for campus security footage inspection'}] },
      { studentName: 'Sneha Patil', department: 'Computer Science', issueType: 'Counseling', reportedBy: 'Self-referred', priority: 'Low', date: '2026-05-26', status: 'Scheduled', description: 'Requested professional guidance regarding high academic stress levels.', timeline: [{date: '2026-05-26', text: 'Mental health assessment request submitted'}, {date: '2026-05-27', text: 'Weekly session scheduled with Dr. Asha Roy'}] },
      { studentName: 'Vikram Joshi', department: 'Electrical & Electronics', issueType: 'Complaint', reportedBy: 'Junior Student', priority: 'High', date: '2026-05-26', status: 'Pending', description: 'Altercation in college cafeteria.', timeline: [{date: '2026-05-26', text: 'Complaint registered'}] }
    ]);

    console.log('✅ Auto-seed successfully pre-populated! 22 users | 6 departments | 10 students | 9 staff | 9 attendance entries | 13 mark transcripts | 12 fee invoices | 5 books | 3 issues | Transport Setup | Hostel Setup | Placement Setup | Settings Setup | Notifications Setup | Approvals Setup | Exams Seeded | Salary Payroll Seeded | Welfare Records');
    console.log('   🔑 CSE HOD login: csehod@gmail.com / password123');
    console.log('   🔑 Student login: john@college.edu / password123');
  } catch (err) {
    console.error('❌ Auto-seed failed:', err.message);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/results', marksRoutes);
app.use('/api/salaries', salaryRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/class-advisor', classAdvisorRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/welfare', welfareRoutes);
app.use('/api/staff-support', staffSupportRoutes);
app.use('/api/hod-support', hodSupportRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accounts-officer', accountsOfficerRoutes);
app.use('/api/employee-attendance', employeeAttendanceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/faculty-allocation', facultyAllocationRoutes);
app.use('/api/period-master', periodMasterRoutes);
app.use('/api/class-monitoring', classMonitoringRoutes);
app.use('/api/substitutions', substitutionRoutes);
app.use('/api/class-sessions', classSessionRoutes);

app.get('/', (req, res) => {
  res.send('College ERP API is running...');
});

// ── Database Connection + Server Start ────────────────────────────────────────
const startServer = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college_erp';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB Database');
  } catch (err) {
    console.log('⚠️ MongoDB connection failed. Falling back to In-Memory Database...', err.message);
    const mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '4.4.29'
      }
    });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('✅ Connected to In-Memory MongoDB (Zero-Config Mode)');
  }

  // Auto-seed the 15 Professional Departments if missing
  const seedDepartments = async () => {
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      console.log('🌱 Seeding 15 Professional Departments...');
      await Department.insertMany([
        { id: 'DEPT01', name: 'Computer Science Engineering', code: 'CSE', status: 'Active', students: 420, staff: 25 },
        { id: 'DEPT02', name: 'Information Technology', code: 'IT', status: 'Active', students: 380, staff: 22 },
        { id: 'DEPT03', name: 'Electronics & Communication Engineering', code: 'ECE', status: 'Active', students: 350, staff: 20 },
        { id: 'DEPT04', name: 'Electrical & Electronics Engineering', code: 'EEE', status: 'Active', students: 300, staff: 18 },
        { id: 'DEPT05', name: 'Mechanical Engineering', code: 'MECH', status: 'Active', students: 280, staff: 16 },
        { id: 'DEPT06', name: 'Civil Engineering', code: 'CIVIL', status: 'Active', students: 250, staff: 15 },
        { id: 'DEPT07', name: 'Artificial Intelligence & Data Science', code: 'AIDS', status: 'Active', students: 180, staff: 10 },
        { id: 'DEPT08', name: 'Artificial Intelligence & Machine Learning', code: 'AIML', status: 'Active', students: 150, staff: 8 },
        { id: 'DEPT09', name: 'Cyber Security', code: 'CYBER', status: 'Active', students: 120, staff: 6 },
        { id: 'DEPT10', name: 'Biomedical Engineering', code: 'BME', status: 'Active', students: 90, staff: 5 },
        { id: 'DEPT11', name: 'Aeronautical Engineering', code: 'AERO', status: 'Active', students: 80, staff: 5 },
        { id: 'DEPT12', name: 'Automobile Engineering', code: 'AUTO', status: 'Active', students: 60, staff: 4 },
        { id: 'DEPT13', name: 'Robotics Engineering', code: 'ROBOTICS', status: 'Active', students: 70, staff: 4 },
        { id: 'DEPT14', name: 'Chemical Engineering', code: 'CHEM', status: 'Active', students: 50, staff: 3 },
        { id: 'DEPT15', name: 'Biotechnology Engineering', code: 'BIOTECH', status: 'Active', students: 40, staff: 3 },
      ]);
      console.log('✅ Professional Departments Seeded.');
    }
  };

  await seedDepartments();
  await autoSeedIfEmpty();

  const listenOnPort = (portToTry) => {
    const srv = server.listen(portToTry, () => {
      console.log(`🚀 Server is running on port ${portToTry}`);
      console.log(`🌐 API ready at http://localhost:${portToTry}`);
      console.log(`⚡ WebSocket server is active`);
      initCronJobs();
    });

    srv.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${portToTry} in use, automatically trying port ${portToTry + 1}...`);
        listenOnPort(portToTry + 1);
      } else {
        console.error('Server listen error:', err);
      }
    });
  };

  listenOnPort(Number(PORT));
};

startServer();
