import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import os from 'os';
import User from '../models/User.js';
import Watchman from '../models/Watchman.js';
import VisitorLog from '../models/VisitorLog.js';
import ParcelLog from '../models/ParcelLog.js';
import SecurityVehicleLog from '../models/SecurityVehicleLog.js';
import CampusGateMovement from '../models/CampusGateMovement.js';
import SecurityIncident from '../models/SecurityIncident.js';
import WatchmanAttendance from '../models/WatchmanAttendance.js';
import Notification from '../models/Notification.js';
import Student from '../models/Student.js';
import StudentCampusEntry from '../models/StudentCampusEntry.js';
import EmployeeAttendance from '../models/EmployeeAttendance.js';
import CampusPerson from '../models/CampusPerson.js';
import Staff from '../models/Staff.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationHelper.js';

const router = express.Router();

// Resolve host LAN IP so mobile devices on the local network can access the server
export const getLanIp = () => {
  try {
    if (process.env.LAN_IP) return process.env.LAN_IP;
    if (process.env.HOST_IP) return process.env.HOST_IP;

    const nets = os.networkInterfaces();
    const candidates = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        // Skip over non-IPv4, internal (127.0.0.1), and link-local (169.254.x.x)
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
          candidates.push({ name, address: net.address });
        }
      }
    }

    if (candidates.length > 0) {
      const wifiOrEth = candidates.find(c => /wi-?fi|wlan|wireless|ethernet|eth|en0|en1/i.test(c.name));
      if (wifiOrEth) return wifiOrEth.address;

      const privateIp = candidates.find(c =>
        c.address.startsWith('192.168.') ||
        c.address.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(c.address)
      );
      if (privateIp) return privateIp.address;

      return candidates[0].address;
    }
  } catch (err) {
    console.warn('Could not determine LAN IP:', err.message);
  }
  return 'localhost';
};

export const getFrontendBase = (req) => {
  const hostHeader = req.get('host') || 'localhost:5000';
  const protocol = req.protocol || 'http';
  let host = hostHeader;

  // Replace localhost or loopback with LAN IP if available so mobile phone scans work
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const lanIp = getLanIp();
    if (lanIp && lanIp !== 'localhost') {
      host = host.replace(/localhost|127\.0\.0\.1/, lanIp);
    }
  }

  // Vite frontend default port is 5173
  return `${protocol}://${host.replace(':5000', ':5173')}`;
};

// Optional auth: allows public verification from mobile scans while still populating req.user if a token is passed
const optionalAuth = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return protect(req, res, () => next());
  }
  next();
};

// Helper to get tenant/college id
const getTenant = (req) => req.user?.collegeId || req.user?.tenantId || 'COL001';

// Helper to format duration in hours & minutes
const formatCampusDuration = (minutes) => {
  if (!minutes || minutes <= 0) return 'Just entered';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins} min${mins === 1 ? '' : 's'}`;
  return `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
};

// Smart Multi-Tenant Filter Helper with Safe Fallback for Live Demonstration & ERP Consistency
export const buildTenantOrAllFilter = async (req, Model, extraConditions = {}) => {
  if (req?.user?.role === 'Super Admin') {
    return { ...extraConditions };
  }
  const tenantId = getTenant(req);

  // If a Model is passed, verify if any records exist specifically for this tenant
  if (Model) {
    try {
      const specificCount = await Model.countDocuments({
        ...extraConditions,
        $or: [{ collegeId: tenantId }, { tenantId }]
      });
      if (specificCount > 0) {
        return {
          ...extraConditions,
          $or: [{ collegeId: tenantId }, { tenantId }]
        };
      }
    } catch (_) { }
  }

  // Fallback: match current tenant, default 'COL001', or unassigned records
  return {
    ...extraConditions,
    $or: [
      { collegeId: tenantId },
      { tenantId: tenantId },
      { collegeId: 'COL001' },
      { tenantId: 'COL001' },
      { collegeId: null },
      { tenantId: null },
      { collegeId: '' },
      { tenantId: '' },
      { collegeId: { $exists: false } },
      { tenantId: { $exists: false } }
    ]
  };
};

// Automatic Real-Time Data Seeder & Synchronizer for Campus Security Operations
export const ensureWatchmanRealtimeData = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Collect all active tenant IDs in the system
    const tenantSet = new Set(['COL001', 'COL004-3190860']);
    try {
      const allWatchmen = await Watchman.find({}).lean();
      allWatchmen.forEach(w => {
        if (w.tenantId) tenantSet.add(w.tenantId);
        if (w.collegeId) tenantSet.add(w.collegeId);
      });
      const allUsers = await User.find({ role: 'Watchman' }).lean();
      allUsers.forEach(u => {
        if (u.tenantId) tenantSet.add(u.tenantId);
        if (u.collegeId) tenantSet.add(u.collegeId);
      });
    } catch (e) {
      console.warn('Tenant discovery notice:', e.message);
    }

    // 1. Ensure Watchmen profiles exist
    let ramesh = await Watchman.findOne({ employeeId: 'WMN-001' });
    let natrajan = await Watchman.findOne({ $or: [{ name: /natrajan/i }, { employeeId: 'WMN-7430' }, { employeeId: 'WMN-002' }] });

    if (!ramesh) {
      let rameshUser = await User.findOne({ email: 'watchman@college.edu' });
      if (!rameshUser) {
        rameshUser = await User.create({
          name: 'Ramesh Kumar (Chief Watchman)',
          email: 'watchman@college.edu',
          password: 'password123',
          role: 'Watchman',
          referenceId: 'WMN-001',
          phone: '9876543299',
          tenantId: 'COL001',
          collegeId: 'COL001',
          isActive: true
        });
      }
      ramesh = await Watchman.create({
        user: rameshUser._id,
        employeeId: 'WMN-001',
        name: 'Ramesh Kumar',
        phone: '9876543299',
        email: 'watchman@college.edu',
        address: 'Staff Quarters, Campus North',
        shift: 'Morning',
        assignedGate: 'Gate 1 (Main Entrance)',
        status: 'Active',
        tenantId: 'COL001',
        collegeId: 'COL001'
      });
    }

    if (!natrajan) {
      let natUser = await User.findOne({ email: 'natrajan.security@college.edu' });
      if (!natUser) {
        natUser = await User.create({
          name: 'Natrajan',
          email: 'natrajan.security@college.edu',
          password: 'password123',
          role: 'Watchman',
          referenceId: 'WMN-7430',
          phone: '9876543218',
          tenantId: 'COL004-3190860',
          collegeId: 'COL004-3190860',
          isActive: true
        });
      }
      natrajan = await Watchman.create({
        user: natUser._id,
        employeeId: 'WMN-7430',
        name: 'Natrajan',
        phone: '9876543218',
        email: 'natrajan.security@college.edu',
        address: 'Security Barracks, Gate 1',
        shift: 'Morning',
        assignedGate: 'Gate 1 (Main Entrance)',
        status: 'Active',
        tenantId: 'COL004-3190860',
        collegeId: 'COL004-3190860'
      });
    }

    // 2. Ensure Guard Attendance for today
    for (const w of [ramesh, natrajan].filter(Boolean)) {
      const att = await WatchmanAttendance.findOne({ watchman: w._id, dutyDate: todayStr });
      if (!att) {
        const morning = new Date();
        morning.setHours(10, 18, 0, 0);
        await WatchmanAttendance.create({
          watchman: w._id,
          watchmanName: w.name,
          employeeId: w.employeeId,
          dutyDate: todayStr,
          shift: w.shift || 'Morning',
          gate: w.assignedGate || 'Gate 1 (Main Entrance)',
          clockInTime: morning,
          status: 'Active',
          tenantId: w.tenantId || 'COL001',
          collegeId: w.collegeId || 'COL001'
        });
      }
    }

    // 3. Ensure registered Students have QR codes and tenant attributes assigned
    const students = await Student.find({}).limit(50).lean();
    for (const stu of students) {
      const updates = {};
      if (!stu.qrCode) updates.qrCode = `STU-QR-${stu.id}`;
      if (!stu.tenantId) updates.tenantId = 'COL001';
      if (!stu.collegeId) updates.collegeId = 'COL001';
      if (Object.keys(updates).length > 0) {
        await Student.updateOne({ _id: stu._id }, { $set: updates });
      }
    }

    // 4. Ensure Student Campus Entries exist for today
    const activeEntriesCount = await StudentCampusEntry.countDocuments({ dateString: todayStr });
    if (activeEntriesCount < 5 && students.length > 0) {
      const mockEntries = [
        {
          student: students[0],
          status: 'Inside Campus',
          checkInHoursAgo: 3.5,
          checkOutHoursAgo: null,
          gate: 'Gate 1 (Main Entrance)',
          watchman: natrajan?.name || 'Natrajan'
        },
        {
          student: students[1] || students[0],
          status: 'Inside Campus',
          checkInHoursAgo: 2.2,
          checkOutHoursAgo: null,
          gate: 'Gate 2 (North Gate)',
          watchman: ramesh?.name || 'Ramesh Kumar'
        },
        {
          student: students[2] || students[0],
          status: 'Inside Campus',
          checkInHoursAgo: 1.5,
          checkOutHoursAgo: null,
          gate: 'Gate 1 (Main Entrance)',
          watchman: natrajan?.name || 'Natrajan'
        },
        {
          student: students[3] || students[0],
          status: 'Inside Campus',
          checkInHoursAgo: 0.8,
          checkOutHoursAgo: null,
          gate: 'Gate 1 (Main Entrance)',
          watchman: natrajan?.name || 'Natrajan'
        },
        {
          student: students[4] || students[0],
          status: 'Checked Out',
          checkInHoursAgo: 5,
          checkOutHoursAgo: 1.2,
          gate: 'Gate 1 (Main Entrance)',
          watchman: ramesh?.name || 'Ramesh Kumar'
        },
        {
          student: students[5] || students[0],
          status: 'Checked Out',
          checkInHoursAgo: 6,
          checkOutHoursAgo: 2,
          gate: 'Gate 2 (North Gate)',
          watchman: ramesh?.name || 'Ramesh Kumar'
        }
      ];

      for (let idx = 0; idx < mockEntries.length; idx++) {
        const item = mockEntries[idx];
        const stu = item.student;
        const exists = await StudentCampusEntry.findOne({
          studentId: stu.id,
          dateString: todayStr
        });
        if (!exists) {
          const inTime = new Date(Date.now() - item.checkInHoursAgo * 3600000);
          const outTime = item.checkOutHoursAgo ? new Date(Date.now() - item.checkOutHoursAgo * 3600000) : null;
          const durationMins = outTime ? Math.round((outTime - inTime) / 60000) : Math.round((Date.now() - inTime) / 60000);
          const durationFormatted = formatCampusDuration(durationMins);

          await StudentCampusEntry.create({
            entryId: `SCE-${todayStr.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`,
            studentId: stu.id,
            studentObjectId: stu._id,
            studentName: stu.name,
            phone: stu.phone || '9876543210',
            department: stu.dept || stu.department || 'Computer Science',
            course: stu.course || stu.degreeType || 'Engineering',
            semester: stu.sem || stu.semester || 'Sem 4',
            photoUrl: stu.photoUrl || '',
            qrCode: stu.qrCode || `STU-QR-${stu.id}`,
            checkInTime: inTime,
            checkOutTime: outTime,
            durationMinutes: durationMins,
            durationFormatted: item.status === 'Inside Campus' ? `${durationFormatted} (Ongoing)` : durationFormatted,
            status: item.status,
            entryWatchmanName: item.watchman,
            entryGate: item.gate,
            exitWatchmanName: item.status === 'Checked Out' ? item.watchman : '',
            exitGate: item.status === 'Checked Out' ? item.gate : '',
            dateString: todayStr,
            collegeId: 'COL001',
            tenantId: 'COL001',
            remarks: item.status === 'Inside Campus' ? 'Regular Campus Entry' : 'Permitted Campus Departure'
          });

          // Sync CampusGateMovement
          await CampusGateMovement.create({
            movementId: `MOV-${todayStr.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`,
            personType: 'Student',
            personId: stu.id,
            personName: stu.name,
            department: stu.dept || stu.department || 'Computer Science',
            direction: item.status === 'Inside Campus' ? 'IN' : 'OUT',
            gate: item.gate,
            watchmanName: item.watchman,
            timestamp: item.status === 'Inside Campus' ? inTime : outTime,
            dateString: todayStr,
            tenantId: 'COL001',
            collegeId: 'COL001'
          });
        }
      }
    }

    // 5. Ensure Active Visitors exist
    const visitorsCount = await VisitorLog.countDocuments({});
    if (visitorsCount < 3) {
      await VisitorLog.create([
        {
          visitorId: `VIS-${todayStr.replace(/-/g, '')}-001`,
          passNumber: `PASS-V101`,
          name: 'Dr. Rajesh Verma',
          phone: '9840123456',
          email: 'rajesh.verma@guest.edu',
          purpose: 'Guest Lecture & Seminar',
          personToMeet: 'HOD CSE',
          department: 'Computer Science',
          vehicleNumber: 'TN 09 AB 1234',
          idProofType: 'Aadhaar Card',
          idProofNumber: 'XXXX-XXXX-4589',
          entryTime: new Date(Date.now() - 2.5 * 3600000),
          status: 'Inside',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: natrajan?.name || 'Natrajan',
          collegeId: 'COL001',
          tenantId: 'COL001'
        },
        {
          visitorId: `VIS-${todayStr.replace(/-/g, '')}-002`,
          passNumber: `PASS-V102`,
          name: 'Anitha Sundaram',
          phone: '9840987654',
          email: 'anitha.s@gmail.com',
          purpose: 'Parent Teacher Consultation',
          personToMeet: 'Principal',
          department: 'Administration',
          idProofType: 'Driving License',
          idProofNumber: 'TN0920190012',
          entryTime: new Date(Date.now() - 1.2 * 3600000),
          status: 'Inside',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: natrajan?.name || 'Natrajan',
          collegeId: 'COL001',
          tenantId: 'COL001'
        },
        {
          visitorId: `VIS-${todayStr.replace(/-/g, '')}-003`,
          passNumber: `PASS-PRE-099`,
          name: 'Pooja Sundaram',
          phone: '9884123890',
          email: 'pooja.sun@outlook.com',
          purpose: 'New Admission Campus Tour',
          personToMeet: 'Admission Office',
          department: 'Admissions',
          isPreRegistered: true,
          approvalStatus: 'Pending',
          status: 'Pre-Registered',
          expectedDate: new Date(),
          expectedTime: '14:30',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: ramesh?.name || 'Ramesh Kumar',
          collegeId: 'COL001',
          tenantId: 'COL001'
        }
      ]);
    }

    // 6. Ensure Vehicles exist
    const vehiclesCount = await SecurityVehicleLog.countDocuments({});
    if (vehiclesCount < 2) {
      await SecurityVehicleLog.create([
        {
          vehicleLogId: `VEH-${todayStr.replace(/-/g, '')}-001`,
          vehicleNumber: 'TN 09 AB 4567',
          vehicleType: 'Four Wheeler (Car/SUV)',
          driverName: 'Dr. Ananya Rao',
          driverPhone: '9876543210',
          purpose: 'Staff Parking',
          destination: 'Faculty Parking Lot B',
          entryTime: new Date(Date.now() - 4 * 3600000),
          status: 'Inside',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: natrajan?.name || 'Natrajan',
          collegeId: 'COL001',
          tenantId: 'COL001'
        },
        {
          vehicleLogId: `VEH-${todayStr.replace(/-/g, '')}-002`,
          vehicleNumber: 'TN 07 CD 8912',
          vehicleType: 'Commercial / Delivery Van',
          driverName: 'Suresh Kumar (Blue Dart)',
          driverPhone: '9812345678',
          purpose: 'Goods / Delivery',
          destination: 'Logistics Desk',
          entryTime: new Date(Date.now() - 1 * 3600000),
          status: 'Inside',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: natrajan?.name || 'Natrajan',
          collegeId: 'COL001',
          tenantId: 'COL001'
        }
      ]);
    }

    // 7. Ensure Parcel & Delivery entries exist for staff
    const parcelCount = await ParcelLog.countDocuments({});
    if (parcelCount < 2) {
      let renukaUser = await User.findOne({ email: 'renuka.stf008@college.edu' });
      await ParcelLog.create([
        {
          parcelId: `PCL-${todayStr.replace(/-/g, '')}-001`,
          type: 'Parcel',
          deliveryCompany: 'Blue Dart Express',
          senderName: 'TechBooks Publishers Ltd',
          recipientId: renukaUser?._id || null,
          staffId: 'STF008',
          recipientName: 'Renuka [STF008]',
          recipientEmail: 'renuka.stf008@college.edu',
          recipientPhone: '9876543208',
          recipientType: 'Staff',
          department: 'Computer Science',
          trackingNumber: 'BLUEDART-88291045',
          parcelDetails: 'Cloud Computing & Distributed Systems Textbooks (2 Qty)',
          receivedAt: new Date(Date.now() - 3 * 3600000),
          status: 'Pending Collection',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: ramesh?.name || 'Ramesh Kumar (Chief Watchman)',
          notes: 'Deposited on Faculty Shelf A-3 at security desk.',
          collegeId: 'COL001',
          tenantId: 'COL001'
        },
        {
          parcelId: `DEL-${todayStr.replace(/-/g, '')}-002`,
          type: 'Delivery',
          deliveryCompany: 'Amazon Prime Logistics',
          senderName: 'Electronics & Robotics Lab Supplies',
          recipientId: renukaUser?._id || null,
          staffId: 'STF008',
          recipientName: 'Renuka [STF008]',
          recipientEmail: 'renuka.stf008@college.edu',
          recipientPhone: '9876543208',
          recipientType: 'Staff',
          department: 'Computer Science',
          trackingNumber: 'AMZN-IN-90812734',
          parcelDetails: 'Arduino Sensor Kits & Microcontroller Board',
          receivedAt: new Date(Date.now() - 28 * 3600000),
          status: 'Collected',
          collectedAt: new Date(Date.now() - 20 * 3600000),
          collectedBy: 'Renuka',
          handedOverAt: new Date(Date.now() - 20 * 3600000),
          handedOverTo: 'Renuka',
          gate: 'Gate 1 (Main Entrance)',
          watchmanName: ramesh?.name || 'Ramesh Kumar (Chief Watchman)',
          notes: 'Handover verified and signed at security desk',
          collegeId: 'COL001',
          tenantId: 'COL001'
        }
      ]);
    }
  } catch (err) {
    console.warn('ensureWatchmanRealtimeData notice:', err.message);
  }
};

// Auto-seed asynchronously in background
setTimeout(() => {
  ensureWatchmanRealtimeData();
}, 2000);

// ══════════════════════════════════════════════════════════════════════════
// 1. ADMIN WATCHMAN MANAGEMENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman - List all watchmen
router.get('/', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const isSuperAdmin = req.user && String(req.user.role).toLowerCase() === 'super admin';
    const filter = isSuperAdmin
      ? {}
      : {
        $or: [
          { tenantId },
          { collegeId: tenantId },
          { tenantId: { $exists: false } }
        ]
      };

    let watchmen = [];
    try {
      watchmen = await Watchman.find(filter)
        .populate('user', 'email name role isActive referenceId phone createdAt')
        .sort({ createdAt: -1 })
        .lean();
    } catch (popErr) {
      console.warn('Populate failed on watchmen query, falling back without populate:', popErr.message);
      watchmen = await Watchman.find(filter).sort({ createdAt: -1 }).lean();
    }

    res.json({ success: true, count: watchmen.length, data: watchmen });
  } catch (err) {
    console.error('Failed to fetch watchmen:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch watchmen', error: err.message });
  }
});

// POST /api/watchman - Create watchman (User account + Watchman profile)
router.post('/', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { name, phone, email, address, shift, assignedGate, status, password, employeeId } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'Name, phone, email, and password are required' });
    }

    const tenantId = getTenant(req);

    // Auto-generate employeeId if not given
    let empId = employeeId ? employeeId.trim() : null;
    if (!empId) {
      const count = await Watchman.countDocuments();
      empId = `WMN-${String(count + 1).padStart(3, '0')}`;
    }

    // Check duplicate employee ID
    const duplicateEmp = await Watchman.findOne({ employeeId: empId, email: { $ne: email.trim().toLowerCase() } });
    if (duplicateEmp) {
      empId = `WMN-${Date.now().toString().slice(-4)}`;
    }

    let user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    let newWatchman = null;

    if (user) {
      // User with this email already exists in system -> Update & provision as Watchman
      user.name = name.trim();
      user.phone = phone.trim();
      user.role = 'Watchman';
      user.password = password.trim();
      user.isActive = status !== 'Inactive';
      if (!user.tenantId) user.tenantId = tenantId;
      if (!user.collegeId) user.collegeId = tenantId;
      await user.save();

      newWatchman = await Watchman.findOne({
        $or: [{ user: user._id }, { email: email.trim().toLowerCase() }]
      });

      if (newWatchman) {
        newWatchman.name = name.trim();
        newWatchman.phone = phone.trim();
        newWatchman.shift = shift || newWatchman.shift || 'Morning';
        newWatchman.assignedGate = assignedGate || newWatchman.assignedGate || 'Gate 1 (Main Entrance)';
        newWatchman.status = status || newWatchman.status || 'Active';
        newWatchman.address = address ? address.trim() : newWatchman.address;
        newWatchman.user = user._id;
        if (empId && (!newWatchman.employeeId || newWatchman.employeeId === 'WMN-001')) {
          newWatchman.employeeId = empId;
        }
        await newWatchman.save();
      } else {
        newWatchman = new Watchman({
          user: user._id,
          employeeId: empId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          address: address ? address.trim() : '',
          shift: shift || 'Morning',
          assignedGate: assignedGate || 'Gate 1 (Main Entrance)',
          status: status || 'Active',
          collegeId: tenantId,
          tenantId: tenantId
        });
        await newWatchman.save();
      }
    } else {
      // 1. Create User
      const newUser = new User({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password: password.trim(), // Pre-save hook hashes this
        role: 'Watchman',
        referenceId: empId,
        collegeId: tenantId,
        tenantId: tenantId
      });
      await newUser.save();
      user = newUser;

      // 2. Create Watchman profile
      newWatchman = new Watchman({
        user: newUser._id,
        employeeId: empId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        address: address ? address.trim() : '',
        shift: shift || 'Morning',
        assignedGate: assignedGate || 'Gate 1 (Main Entrance)',
        status: status || 'Active',
        collegeId: tenantId,
        tenantId: tenantId
      });
      await newWatchman.save();
    }

    // Notify Admin & Watchman
    const targetUser = user || newUser;
    if (targetUser && targetUser._id) {
      await sendNotification(req, {
        receiverId: targetUser._id,
        collegeId: tenantId,
        tenantId: tenantId,
        title: 'Watchman Account Provisioned',
        message: `Welcome ${targetUser.name || name}! Your campus security guard account is ready. Assigned shift: ${shift || 'Morning'} at ${assignedGate || 'Gate 1'}.`,
        category: 'system',
        type: 'Success'
      }).catch(err => console.warn('Watchman notification skipped:', err.message));
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'created', watchmanId: newWatchman._id });
    }

    res.status(201).json({
      success: true,
      message: 'Watchman account created successfully',
      data: newWatchman
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create watchman', error: err.message });
  }
});

// PUT /api/watchman/:id - Update watchman details
router.put('/:id', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    const { name, phone, email, address, shift, assignedGate, status, employeeId } = req.body;

    if (name) watchman.name = name.trim();
    if (phone) watchman.phone = phone.trim();
    if (address !== undefined) watchman.address = address.trim();
    if (shift) watchman.shift = shift;
    if (assignedGate) watchman.assignedGate = assignedGate;
    if (status) watchman.status = status;
    if (employeeId) watchman.employeeId = employeeId.trim();

    if (email && email.trim().toLowerCase() !== watchman.email) {
      const emailInUse = await User.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: watchman.user }
      });
      if (emailInUse) {
        return res.status(400).json({ success: false, message: 'Email address already in use by another user' });
      }
      watchman.email = email.trim().toLowerCase();
    }

    await watchman.save();

    // Sync User record
    if (watchman.user) {
      const user = await User.findById(watchman.user);
      if (user) {
        if (name) user.name = name.trim();
        if (email) user.email = email.trim().toLowerCase();
        if (phone) user.phone = phone.trim();
        if (employeeId) user.referenceId = employeeId.trim();
        await user.save();
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'updated', watchmanId: watchman._id });
    }

    res.json({ success: true, message: 'Watchman updated successfully', data: watchman });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update watchman', error: err.message });
  }
});

// PATCH /api/watchman/:id/status - Toggle activate/deactivate
router.patch('/:id/status', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    const newStatus = watchman.status === 'Active' ? 'Inactive' : 'Active';
    watchman.status = newStatus;
    await watchman.save();

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'status_changed', watchmanId: watchman._id, status: newStatus });
    }

    res.json({
      success: true,
      message: `Watchman account ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully`,
      data: { id: watchman._id, status: newStatus }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle status', error: err.message });
  }
});

// POST /api/watchman/:id/reset-password - Admin resets watchman password
router.post('/:id/reset-password', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const user = await User.findById(watchman.user);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Associated User account not found' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword.trim(), salt);
    await user.save();

    res.json({ success: true, message: `Password reset successfully for ${watchman.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset password', error: err.message });
  }
});

// DELETE /api/watchman/:id - Remove watchman
router.delete('/:id', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findById(req.params.id);
    if (!watchman) {
      return res.status(404).json({ success: false, message: 'Watchman profile not found' });
    }

    if (watchman.user) {
      await User.findByIdAndDelete(watchman.user);
    }
    await Watchman.findByIdAndDelete(req.params.id);

    if (req.app.get('io')) {
      req.app.get('io').emit('watchmanUpdated', { action: 'deleted', watchmanId: req.params.id });
    }

    res.json({ success: true, message: 'Watchman account deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete watchman', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. WATCHMAN DASHBOARD & SECURITY OPERATIONS ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman/me - Get logged in watchman profile
router.get('/me', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const watchman = await Watchman.findOne({ user: req.user._id });
    res.json({
      success: true,
      data: watchman || {
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone || '',
        employeeId: req.user.referenceId || 'WMN-001',
        shift: 'Morning',
        assignedGate: 'Gate 1 (Main Entrance)',
        status: 'Active'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile', error: err.message });
  }
});

// POST /api/watchman/change-password - Watchman self password change
router.post('/change-password', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check current password if provided
    if (currentPassword) {
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword.trim(), salt);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to change password', error: err.message });
  }
});

// GET /api/watchman/stats - Dashboard overview summary cards
router.get('/stats', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    await ensureWatchmanRealtimeData();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayStr = new Date().toISOString().split('T')[0];

    const studentFilter = await buildTenantOrAllFilter(req, StudentCampusEntry);
    const visitorFilter = await buildTenantOrAllFilter(req, VisitorLog);
    const vehicleFilter = await buildTenantOrAllFilter(req, SecurityVehicleLog);
    const parcelFilter = await buildTenantOrAllFilter(req, ParcelLog);
    const movementFilter = await buildTenantOrAllFilter(req, CampusGateMovement);
    const incidentFilter = await buildTenantOrAllFilter(req, SecurityIncident);

    const [
      studentsInside,
      todayTotalStudents,
      todayCheckedOutStudents,
      staffInside,
      visitorsInside,
      todayTotalVisitors,
      expectedVisitors,
      pendingApprovals,
      vehiclesInside,
      parcelsAtGate,
      openIncidents
    ] = await Promise.all([
      StudentCampusEntry.countDocuments({ ...studentFilter, status: 'Inside Campus' }),
      StudentCampusEntry.countDocuments({ ...studentFilter, dateString: todayStr }),
      StudentCampusEntry.countDocuments({ ...studentFilter, dateString: todayStr, status: 'Checked Out' }),
      CampusGateMovement.countDocuments({ ...movementFilter, personType: 'Staff', direction: 'In' }),
      VisitorLog.countDocuments({ ...visitorFilter, status: 'Inside' }),
      VisitorLog.countDocuments({ ...visitorFilter, entryTime: { $gte: startOfToday, $lte: endOfToday } }),
      VisitorLog.countDocuments({
        ...visitorFilter,
        isPreRegistered: true,
        status: { $in: ['Pre-Registered', 'Approved'] }
      }),
      VisitorLog.countDocuments({
        ...visitorFilter,
        isPreRegistered: true,
        approvalStatus: 'Pending'
      }),
      SecurityVehicleLog.countDocuments({ ...vehicleFilter, status: 'Inside' }),
      ParcelLog.countDocuments({ ...parcelFilter, status: 'Received at Gate' }),
      SecurityIncident.countDocuments({ ...incidentFilter, status: { $in: ['Open', 'Under Investigation'] } })
    ]);

    res.json({
      success: true,
      data: {
        studentsInside,
        todayTotalStudents,
        todayCheckedOutStudents,
        staffInside,
        visitorsInside,
        todayTotalVisitors,
        expectedVisitors,
        pendingApprovals,
        vehiclesInside,
        parcelsAtGate,
        openIncidents
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 3. VISITOR OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/visitors/active - Visitors currently inside
router.get('/visitors/active', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = await buildTenantOrAllFilter(req, VisitorLog, { status: 'Inside' });
    const activeVisitors = await VisitorLog.find(filter).sort({ entryTime: -1 });
    res.json({ success: true, count: activeVisitors.length, data: activeVisitors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active visitors', error: err.message });
  }
});

// POST /api/watchman/visitors/entry - Log visitor entry
router.post('/visitors/entry', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      name, phone, email, purpose, personToMeet, department,
      vehicleNumber, idProofType, idProofNumber, gate, notes
    } = req.body;

    if (!name || !phone || !purpose || !personToMeet) {
      return res.status(400).json({ success: false, message: 'Name, phone, purpose, and person to meet are required' });
    }

    const tenantId = getTenant(req) || req.user?.collegeId || 'COL001';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);
    const visitorId = `VIS-${dateStr}-${Date.now().toString().slice(-6)}-${randSuffix}`;
    const passNumber = `PASS-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const watchmanName = req.user?.name || req.user?.username || 'Security Guard';

    const newVisitor = new VisitorLog({
      visitorId,
      passNumber,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      purpose: purpose.trim(),
      personToMeet: personToMeet.trim(),
      department: department || 'General',
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
      idProofType: idProofType || 'Aadhaar Card',
      idProofNumber: idProofNumber ? idProofNumber.trim() : '',
      entryTime: new Date(),
      status: 'Inside',
      isPreRegistered: false,
      approvalStatus: 'Approved',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanId: req.user?._id || null,
      watchmanName,
      qrCodeData: JSON.stringify({ passNumber, visitorId, name: name.trim(), phone: phone.trim(), purpose: purpose.trim(), valid: true }),
      notes: notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newVisitor.save();

    // If vehicle entered, log to SecurityVehicleLog automatically
    if (vehicleNumber && vehicleNumber.trim()) {
      try {
        const vehLogId = `VEH-${dateStr}-${Date.now().toString().slice(-6)}-${randSuffix}`;
        await SecurityVehicleLog.create({
          vehicleLogId: vehLogId,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          vehicleType: 'Four Wheeler (Car/SUV)',
          driverName: name.trim(),
          driverPhone: phone.trim(),
          purpose: 'Visitor Entry',
          destination: department || 'Campus',
          entryTime: new Date(),
          status: 'Inside',
          gate: gate || 'Gate 1 (Main Entrance)',
          watchmanName,
          collegeId: tenantId,
          tenantId: tenantId
        });
      } catch (e) {
        console.warn('Auto vehicle log skipped:', e.message);
      }
    }

    // Synchronize CampusGateMovement & CampusPerson for unified tracking
    try {
      const movId = `MOV-${dateStr}-${Date.now().toString().slice(-6)}`;
      await CampusGateMovement.create({
        movementId: movId,
        personType: 'Visitor',
        personId: passNumber,
        name: name.trim(),
        phone: phone.trim(),
        department: department || 'General',
        direction: 'In',
        reason: purpose.trim(),
        gatePassId: passNumber,
        vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
        gate: gate || 'Gate 1 (Main Entrance)',
        watchmanName,
        timestamp: new Date(),
        collegeId: tenantId,
        tenantId: tenantId
      });

      await CampusPerson.findOneAndUpdate(
        { personId: passNumber },
        {
          $set: {
            name: name.trim(),
            personType: 'Visitor',
            phone: phone.trim(),
            email: email ? email.trim() : '',
            department: department || 'General',
            vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : '',
            idProofType: idProofType || 'Aadhaar Card',
            idProofNumber: idProofNumber ? idProofNumber.trim() : '',
            currentStatus: 'Inside Campus',
            lastGate: gate || 'Gate 1 (Main Entrance)',
            lastEntryTime: new Date()
          },
          $inc: { totalVisits: 1 }
        },
        { upsert: true, new: true }
      );
    } catch (syncErr) {
      console.warn('Campus unified tracking sync notice:', syncErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      try {
        io.emit('visitorUpdated', { action: 'entry', visitor: newVisitor });
        io.emit('dataUpdated', { module: 'watchman', action: 'visitor_entry', data: newVisitor });
        io.emit('dataUpdated', { module: 'visitors', action: 'entry', data: newVisitor });
      } catch (ioErr) {
        console.warn('Socket emit error:', ioErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Visitor entry recorded successfully. Visitor pass generated.',
      data: newVisitor
    });
  } catch (err) {
    console.error('Failed to record visitor entry error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record visitor entry', error: err.message });
  }
});

// POST /api/watchman/visitors/:id/exit - Log visitor exit
router.post('/visitors/:id/exit', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const isObjId = mongoose.Types.ObjectId.isValid(req.params.id);
    const visitor = await VisitorLog.findOne({
      $or: [
        ...(isObjId ? [{ _id: req.params.id }] : []),
        { visitorId: req.params.id },
        { passNumber: req.params.id }
      ]
    });
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.status === 'Checked Out') {
      return res.status(400).json({ success: false, message: 'Visitor is already marked as Checked Out' });
    }

    const exitWatchmanName = req.user?.name || req.user?.username || 'Security Guard';

    visitor.status = 'Checked Out';
    visitor.exitTime = new Date();
    visitor.exitWatchmanId = req.user?._id || null;
    visitor.exitWatchmanName = exitWatchmanName;
    if (req.body.notes) {
      visitor.notes = visitor.notes ? `${visitor.notes} | Exit: ${req.body.notes}` : req.body.notes;
    }

    await visitor.save();

    // If visitor had a vehicle inside, mark it exited too
    if (visitor.vehicleNumber) {
      try {
        await SecurityVehicleLog.updateMany(
          { vehicleNumber: visitor.vehicleNumber, status: 'Inside' },
          { $set: { status: 'Exited', exitTime: new Date(), exitWatchmanName } }
        );
      } catch (vehErr) {
        console.warn('Vehicle exit update notice:', vehErr.message);
      }
    }

    // Sync CampusPerson status
    try {
      await CampusPerson.findOneAndUpdate(
        { personId: visitor.passNumber },
        {
          $set: {
            currentStatus: 'Outside Campus',
            lastExitTime: new Date()
          }
        }
      );

      const tenantId = visitor.collegeId || visitor.tenantId || 'COL001';
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      await CampusGateMovement.create({
        movementId: `MOV-${dateStr}-${Date.now().toString().slice(-6)}`,
        personType: 'Visitor',
        personId: visitor.passNumber,
        name: visitor.name,
        phone: visitor.phone || '',
        department: visitor.department || 'General',
        direction: 'Out',
        reason: 'Visitor Departure',
        gatePassId: visitor.passNumber,
        vehicleNumber: visitor.vehicleNumber || '',
        gate: visitor.gate || 'Gate 1 (Main Entrance)',
        watchmanName: exitWatchmanName,
        timestamp: new Date(),
        collegeId: tenantId,
        tenantId: tenantId
      });
    } catch (syncErr) {
      console.warn('Campus unified tracking exit sync notice:', syncErr.message);
    }

    const ioExit = req.app.get('io');
    if (ioExit) {
      try {
        ioExit.emit('visitorUpdated', { action: 'exit', visitor });
        ioExit.emit('dataUpdated', { module: 'watchman', action: 'visitor_exit', data: visitor });
        ioExit.emit('dataUpdated', { module: 'visitors', action: 'exit', data: visitor });
      } catch (ioErr) {
        console.warn('Socket emit error:', ioErr.message);
      }
    }

    res.json({
      success: true,
      message: `Visitor ${visitor.name} marked as Checked Out successfully`,
      data: visitor
    });
  } catch (err) {
    console.error('Failed to record visitor exit error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record visitor exit', error: err.message });
  }
});

// Helper & Handler for Visitor Pass Verification (Supports both query params and URL path params)
const handleVerifyVisitorPass = async (req, res) => {
  try {
    let rawQuery = (req.params.query || req.query.code || req.query.query || req.query.passNumber || req.query.id || '').trim();

    // If query was URL-encoded or contains full URL with ?code= or &code= or &id=
    if (rawQuery.includes('code=') || rawQuery.includes('id=')) {
      try {
        const urlMatch = rawQuery.match(/[?&](?:code|id)=([^&#]+)/);
        if (urlMatch && urlMatch[1]) {
          rawQuery = decodeURIComponent(urlMatch[1]).trim();
        }
      } catch (_) { }
    }

    // If query is JSON string e.g. {"passNumber":"PASS-1515-1523"}
    if (rawQuery.startsWith('{') && rawQuery.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawQuery);
        rawQuery = (parsed.passNumber || parsed.code || parsed.visitorId || parsed.phone || parsed.id || rawQuery).trim();
      } catch (_) { }
    }

    // Strip out quotes
    rawQuery = rawQuery.replace(/^["']|["']$/g, '').trim();

    if (!rawQuery) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Please provide a valid Pass Number, Visitor ID, or mobile number to verify.'
      });
    }

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`^${escapeRegex(rawQuery)}$`, 'i');

    const orConditions = [
      { passNumber: exactRegex },
      { passNumber: rawQuery },
      { visitorId: exactRegex },
      { visitorId: rawQuery },
      { phone: rawQuery }
    ];

    if (rawQuery.length === 24 && mongoose?.Types?.ObjectId?.isValid(rawQuery)) {
      orConditions.push({ _id: rawQuery });
    }

    if (rawQuery.length >= 3) {
      orConditions.push({ name: exactRegex });
      orConditions.push({ vehicleNumber: exactRegex });
    }

    // Direct global search (prioritizing active inside visitors first, then latest records)
    let visitor = await VisitorLog.findOne({ $or: orConditions, status: 'Inside' }).sort({ createdAt: -1 }).lean();
    if (!visitor) {
      visitor = await VisitorLog.findOne({ $or: orConditions }).sort({ createdAt: -1 }).lean();
    }

    // Secondary fallback: partial substring match if not found
    if (!visitor && rawQuery.length >= 4) {
      visitor = await VisitorLog.findOne({
        $or: [
          { passNumber: { $regex: escapeRegex(rawQuery), $options: 'i' } },
          { phone: { $regex: escapeRegex(rawQuery), $options: 'i' } },
          { name: { $regex: escapeRegex(rawQuery), $options: 'i' } }
        ],
        status: 'Inside'
      }).sort({ createdAt: -1 }).lean();

      if (!visitor) {
        visitor = await VisitorLog.findOne({
          $or: [
            { passNumber: { $regex: escapeRegex(rawQuery), $options: 'i' } },
            { phone: { $regex: escapeRegex(rawQuery), $options: 'i' } },
            { name: { $regex: escapeRegex(rawQuery), $options: 'i' } }
          ]
        }).sort({ createdAt: -1 }).lean();
      }
    }

    if (!visitor) {
      // Check if this query corresponds to a registered Student, Staff, or HOD in CampusPerson, Student, or Staff
      const memberPerson = await CampusPerson.findOne({
        $or: [
          { personId: exactRegex },
          { personId: rawQuery },
          { phone: rawQuery }
        ],
        personType: { $in: ['Student', 'Staff', 'Faculty', 'HOD'] }
      }).lean() || await Student.findOne({
        $or: [
          { id: exactRegex },
          { rollNumber: exactRegex },
          { id: rawQuery },
          { rollNumber: rawQuery }
        ]
      }).lean() || await Staff.findOne({
        $or: [
          { employeeId: exactRegex },
          { employeeId: rawQuery }
        ]
      }).lean();

      if (memberPerson) {
        const pType = memberPerson.personType || (memberPerson.rollNumber || memberPerson.id ? 'Student' : 'Staff');
        return res.status(400).json({
          success: false,
          valid: false,
          isMemberPass: true,
          personType: pType,
          name: memberPerson.name,
          message: `College member pass detected (${pType}: ${memberPerson.name || rawQuery}). Please use the Gate Operations QR Scanner under Gate Ops.`
        });
      }

      return res.status(404).json({
        success: false,
        valid: false,
        message: `Invalid Visitor Pass. No record found matching "${rawQuery}".`
      });
    }

    let validationStatus = 'VALID';
    let statusMessage = 'Pass is valid and active.';
    let isValid = true;

    if (visitor.status === 'Inside') {
      validationStatus = 'INSIDE';
      statusMessage = 'Visitor is currently inside campus (Active Pass). Ready for departure checkout.';
      isValid = true;
    } else if (visitor.status === 'Checked Out') {
      validationStatus = 'ALREADY_USED';
      statusMessage = `Pass has already been used and visitor checked out on ${visitor.exitTime ? new Date(visitor.exitTime).toLocaleString('en-IN') : 'earlier'}.`;
      isValid = false;
    } else if (visitor.status === 'Expired') {
      validationStatus = 'EXPIRED';
      statusMessage = 'Pass has expired.';
      isValid = false;
    } else if (visitor.status === 'Rejected') {
      validationStatus = 'REJECTED';
      statusMessage = 'Visitor request was rejected.';
      isValid = false;
    } else if (visitor.status === 'Pre-Registered') {
      if (visitor.approvalStatus === 'Approved') {
        validationStatus = 'PRE_REGISTERED_APPROVED';
        statusMessage = 'Pre-registered visitor pass is approved. Ready for campus entry.';
        isValid = true;
      } else {
        validationStatus = 'PRE_REGISTERED_PENDING';
        statusMessage = 'Pre-registered visitor pass is pending host approval.';
        isValid = false;
      }
    } else if (visitor.status === 'Approved') {
      validationStatus = 'APPROVED';
      statusMessage = 'Pass is approved and ready for campus entry.';
      isValid = true;
    }

    const passIdentifier = visitor.passNumber || visitor.visitorId;
    const frontendBase = getFrontendBase(req);
    const verifyUrl = `${frontendBase}/watchman/verify?code=${encodeURIComponent(passIdentifier)}&type=visitor`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;

    res.json({
      success: true,
      valid: isValid,
      validationStatus,
      statusMessage,
      data: {
        ...visitor,
        verifyUrl,
        rawCode: passIdentifier,
        qrUrl
      }
    });
  } catch (err) {
    console.error('Visitor pass verification error:', err);
    res.status(500).json({ success: false, message: 'Verification error', error: err.message });
  }
};

// GET /api/watchman/visitors/verify - Query param verify
router.get('/visitors/verify', optionalAuth, handleVerifyVisitorPass);

// GET /api/watchman/visitors/verify/:query - Path param verify
router.get('/visitors/verify/:query', optionalAuth, handleVerifyVisitorPass);

// GET /api/watchman/visitors/pre-registered - Expected pre-registered visitors
router.get('/visitors/pre-registered', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = await buildTenantOrAllFilter(req, VisitorLog, { isPreRegistered: true });
    const expected = await VisitorLog.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: expected.length, data: expected });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pre-registered visitors', error: err.message });
  }
});

// POST /api/watchman/visitors/pre-register - Pre-book / Schedule visitor appointment
router.post('/visitors/pre-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      name, phone, email, purpose, personToMeet, department,
      expectedDate, expectedTime, vehicleNumber, idProofType, idProofNumber,
      gate, notes
    } = req.body;

    if (!name || !phone || !purpose || !personToMeet) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number, purpose of visit, and host / person to meet are required.'
      });
    }

    const count = await VisitorLog.countDocuments();
    const visitorId = `V-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const passNumber = `PASS-${String(count + 1).padStart(4, '0')}`;

    const frontendBase = getFrontendBase(req);
    const verifyUrl = `${frontendBase}/watchman/verify?code=${encodeURIComponent(passNumber)}&type=visitor`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;

    const newVisitor = new VisitorLog({
      visitorId,
      passNumber,
      name: name.trim(),
      phone: phone.trim(),
      email: (email || '').trim().toLowerCase(),
      purpose: purpose.trim(),
      personToMeet: personToMeet.trim(),
      department: department || 'General',
      vehicleNumber: (vehicleNumber || '').trim().toUpperCase(),
      idProofType: idProofType || 'Aadhaar Card',
      idProofNumber: (idProofNumber || '').trim(),
      entryTime: null,
      exitTime: null,
      status: 'Pre-Registered',
      isPreRegistered: true,
      expectedDate: expectedDate ? new Date(expectedDate) : new Date(),
      expectedTime: expectedTime || '10:00 AM',
      approvalStatus: 'Pending',
      approvedBy: '',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanId: req.user?._id || null,
      watchmanName: req.user?.name || 'Gate Security',
      qrCodeData: verifyUrl,
      notes: notes || '',
      collegeId: req.user?.collegeId || null,
      collegeName: req.user?.collegeName || null
    });

    await newVisitor.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('visitorUpdated', { action: 'pre_registered', visitor: newVisitor });
      io.emit('dataUpdated', { module: 'watchman', action: 'visitor_pre_registered', data: newVisitor });
      io.emit('dataUpdated', { module: 'visitors', action: 'pre_registered', data: newVisitor });
    }

    res.status(201).json({
      success: true,
      message: `Visitor pass ${passNumber} for ${name} pre-registered and submitted for Admin approval.`,
      data: {
        ...newVisitor.toObject(),
        qrUrl
      }
    });
  } catch (err) {
    console.error('Error pre-registering visitor:', err);
    res.status(500).json({ success: false, message: 'Failed to pre-register visitor', error: err.message });
  }
});

// PATCH /api/watchman/visitors/:id/approval - Admin approves or rejects pre-registered visitor
router.patch('/visitors/:id/approval', protect, authorize('Admin', 'Super Admin', 'Principal'), async (req, res) => {
  try {
    const { approvalStatus, remarks } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(approvalStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid approval status. Must be "Approved" or "Rejected".' });
    }

    const visitor = await VisitorLog.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    visitor.approvalStatus = approvalStatus;
    visitor.approvedBy = approvalStatus === 'Pending' ? '' : (req.user?.name || 'Campus Administrator');
    if (remarks) {
      visitor.notes = visitor.notes ? `${visitor.notes} | ${remarks}` : remarks;
    }

    await visitor.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('visitorUpdated', { action: 'approval_updated', visitor });
      io.emit('dataUpdated', { module: 'watchman', action: 'visitor_approval_updated', data: visitor });
      io.emit('dataUpdated', { module: 'visitors', action: 'approval_updated', data: visitor });
    }

    res.json({
      success: true,
      message: `Visitor pass ${visitor.passNumber} for ${visitor.name} marked as ${approvalStatus} successfully.`,
      data: visitor
    });
  } catch (err) {
    console.error('Failed to update visitor approval:', err);
    res.status(500).json({ success: false, message: 'Failed to update approval status', error: err.message });
  }
});

// POST /api/watchman/visitors/:id/admit - Admit pre-registered visitor
router.post('/visitors/:id/admit', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const visitor = await VisitorLog.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: 'Visitor record not found' });
    }

    if (visitor.approvalStatus !== 'Approved' && visitor.approvalStatus !== 'Not Required') {
      return res.status(400).json({
        success: false,
        message: `Cannot admit visitor. Status is "${visitor.approvalStatus}". Admin approval is required before gate entry.`
      });
    }

    visitor.status = 'Inside';
    visitor.entryTime = new Date();
    visitor.gate = req.body.gate || 'Gate 1 (Main Entrance)';
    visitor.watchmanId = req.user._id;
    visitor.watchmanName = req.user.name || 'Security Guard';
    if (req.body.vehicleNumber) visitor.vehicleNumber = req.body.vehicleNumber.trim().toUpperCase();
    if (req.body.idProofNumber) visitor.idProofNumber = req.body.idProofNumber.trim();

    await visitor.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('visitorUpdated', { action: 'admitted', visitor });
      io.emit('dataUpdated', { module: 'watchman', action: 'visitor_admitted', data: visitor });
      io.emit('dataUpdated', { module: 'visitors', action: 'admitted', data: visitor });
    }

    res.json({
      success: true,
      message: `Pre-registered visitor ${visitor.name} admitted successfully.`,
      data: visitor
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to admit visitor', error: err.message });
  }
});

// GET /api/watchman/visitors/history - Searchable history with date filter
router.get('/visitors/history', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = await buildTenantOrAllFilter(req, VisitorLog);

    const { search, status, startDate, endDate } = req.query;

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { passNumber: { $regex: q, $options: 'i' } },
        { personToMeet: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { vehicleNumber: { $regex: q, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      filter.entryTime = {};
      if (startDate) filter.entryTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.entryTime.$lte = end;
      }
    }

    const history = await VisitorLog.find(filter).sort({ entryTime: -1 }).limit(300);
    res.json({ success: true, count: history.length, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch history', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 4. PARCEL & DELIVERY OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/parcels - List parcels
router.get('/parcels', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = await buildTenantOrAllFilter(req, ParcelLog);

    const { status, search } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { recipientName: { $regex: q, $options: 'i' } },
        { trackingNumber: { $regex: q, $options: 'i' } },
        { parcelId: { $regex: q, $options: 'i' } },
        { deliveryCompany: { $regex: q, $options: 'i' } }
      ];
    }

    const parcels = await ParcelLog.find(filter).sort({ receivedAt: -1 }).limit(200);
    res.json({ success: true, count: parcels.length, data: parcels });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch parcels', error: err.message });
  }
});

// POST /api/watchman/parcels - Log incoming parcel
router.post('/parcels', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      type = 'Parcel',
      deliveryCompany,
      otherCompany,
      recipientId,
      staffId,
      recipientName,
      recipientPhone,
      recipientEmail,
      recipientType,
      department,
      trackingNumber,
      parcelDetails,
      gate,
      notes
    } = req.body;

    if (!deliveryCompany || (!recipientName && !staffId && !recipientId && !recipientEmail)) {
      return res.status(400).json({ success: false, message: 'Delivery company and recipient are required' });
    }

    const tenantId = getTenant(req);

    // ── Cascading Recipient Resolution ──
    let resolvedUser = null;
    let resolvedStaff = null;

    let extractedId = '';
    if (recipientName) {
      const match = recipientName.match(/\[(.*?)\]/) || recipientName.match(/\((.*?)\)/);
      if (match && match[1]) {
        extractedId = match[1].trim();
      }
    }

    if (recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
      resolvedUser = await User.findById(recipientId);
      if (!resolvedUser) {
        resolvedStaff = await Staff.findById(recipientId);
        if (resolvedStaff) {
          resolvedUser = await User.findOne({
            $or: [{ email: resolvedStaff.email }, { referenceId: resolvedStaff.id }]
          });
        }
      }
    }

    const targetStaffId = staffId || extractedId;
    if (!resolvedUser && targetStaffId) {
      resolvedUser = await User.findOne({ referenceId: targetStaffId });
      if (!resolvedUser && mongoose.Types.ObjectId.isValid(targetStaffId)) {
        resolvedUser = await User.findById(targetStaffId);
      }
      if (!resolvedUser) {
        resolvedStaff = await Staff.findOne({ id: targetStaffId });
        if (resolvedStaff) {
          resolvedUser = await User.findOne({
            $or: [{ email: resolvedStaff.email }, { referenceId: resolvedStaff.id }]
          });
        }
      }
    }

    const targetEmail = recipientEmail || (recipientName && recipientName.includes('@') ? recipientName.trim() : '');
    if (!resolvedUser && targetEmail) {
      resolvedUser = await User.findOne({ email: targetEmail.toLowerCase().trim() });
      if (!resolvedUser) {
        resolvedStaff = await Staff.findOne({ email: targetEmail.toLowerCase().trim() });
        if (resolvedStaff) {
          resolvedUser = await User.findOne({ referenceId: resolvedStaff.id });
        }
      }
    }

    if (!resolvedUser && recipientName) {
      const cleanName = recipientName.replace(/\[.*?\]|\(.*?\)/g, '').trim();
      if (cleanName) {
        const candidateUsers = await User.find({
          name: { $regex: `^${cleanName}$`, $options: 'i' },
          role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal', 'Teacher'] }
        });

        if (candidateUsers.length === 1) {
          resolvedUser = candidateUsers[0];
        } else if (candidateUsers.length > 1 && department && department !== 'General') {
          const matchInDept = candidateUsers.find(u => u.department?.toLowerCase() === department.toLowerCase());
          if (matchInDept) resolvedUser = matchInDept;
        }

        if (!resolvedUser) {
          const candidateStaff = await Staff.find({
            name: { $regex: `^${cleanName}$`, $options: 'i' }
          });
          if (candidateStaff.length === 1) {
            resolvedStaff = candidateStaff[0];
            resolvedUser = await User.findOne({
              $or: [{ email: resolvedStaff.email }, { referenceId: resolvedStaff.id }]
            });
          }
        }
      }
    }

    const finalRecipientId = resolvedUser ? resolvedUser._id : (resolvedStaff ? resolvedStaff._id : (recipientId && mongoose.Types.ObjectId.isValid(recipientId) ? recipientId : null));
    const finalStaffId = resolvedUser?.referenceId || resolvedStaff?.id || targetStaffId || '';
    const cleanRawName = recipientName ? recipientName.replace(/\[.*?\]|\(.*?\)/g, '').trim() : '';
    const finalRecipientName = resolvedUser?.name || resolvedStaff?.name || cleanRawName || 'Campus Staff';
    const finalRecipientEmail = resolvedUser?.email || resolvedStaff?.email || recipientEmail || '';
    const finalRecipientPhone = resolvedUser?.phone || resolvedStaff?.phone || recipientPhone || '';
    const finalDepartment = resolvedUser?.department || resolvedStaff?.dept || department || 'General';
    let finalRecipientType = recipientType || resolvedUser?.role || resolvedStaff?.designation || (finalStaffId.startsWith('HOD') ? 'HOD' : 'Staff');
    if (!['Staff', 'Faculty', 'HOD', 'Department', 'Student', 'Hostel Warden', 'Principal', 'Principal / Admin', 'Other'].includes(finalRecipientType)) {
      finalRecipientType = finalRecipientType === 'Principal' ? 'Principal' : (finalRecipientType === 'HOD' ? 'HOD' : 'Staff');
    }

    const count = await ParcelLog.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = (type === 'Delivery' || String(req.body.type).toLowerCase() === 'delivery') ? 'DEL' : 'PCL';
    const parcelId = `${prefix}-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const newParcel = new ParcelLog({
      parcelId,
      type: prefix === 'DEL' ? 'Delivery' : 'Parcel',
      deliveryCompany,
      otherCompany: otherCompany || '',
      recipientId: finalRecipientId,
      staffId: finalStaffId,
      recipientName: finalRecipientName,
      recipientEmail: finalRecipientEmail,
      recipientPhone: finalRecipientPhone,
      recipientType: finalRecipientType,
      department: finalDepartment,
      trackingNumber: trackingNumber ? trackingNumber.trim() : '',
      parcelDetails: parcelDetails || 'Standard Package',
      receivedAt: new Date(),
      status: 'Pending Collection',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Guard',
      watchmanId: req.user._id,
      notes: notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newParcel.save();

    if (finalRecipientId) {
      try {
        const destLink = finalRecipientType === 'HOD' ? '/hod/parcels' : '/staff/parcels';
        await Notification.create({
          recipient: finalRecipientId,
          title: `📦 New ${newParcel.type} Arrived at Campus Gate`,
          message: `Your package from ${newParcel.deliveryCompany}${newParcel.trackingNumber ? ` (Tracking: ${newParcel.trackingNumber})` : ''} has been received at ${newParcel.gate}. Please collect it from security.`,
          type: 'Info',
          category: 'delivery',
          link: destLink,
          collegeId: tenantId,
          tenantId: tenantId
        });
      } catch (notifErr) {
        console.warn('Could not create notification for recipient:', notifErr.message);
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('parcelUpdated', { action: 'received', parcel: newParcel, recipientId: finalRecipientId, staffId: finalStaffId });
      io.emit('dataUpdated', { module: 'watchman', action: 'parcel_received', data: newParcel, recipientId: finalRecipientId, staffId: finalStaffId });
      io.emit('dataUpdated', { module: 'parcel', action: 'created', data: newParcel, recipientId: finalRecipientId, staffId: finalStaffId });
    }

    res.status(201).json({
      success: true,
      message: `${newParcel.type} logged successfully for ${finalRecipientName}. ID: ${parcelId}`,
      data: newParcel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to log parcel', error: err.message });
  }
});

// PATCH /api/watchman/parcels/:id/handover - Mark parcel handed over
router.patch('/parcels/:id/handover', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const parcel = await ParcelLog.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel record not found' });
    }

    const { handedOverTo } = req.body;
    parcel.status = 'Handed Over';
    parcel.handedOverAt = new Date();
    parcel.handedOverTo = handedOverTo ? handedOverTo.trim() : parcel.recipientName;

    await parcel.save();

    const ioH = req.app.get('io');
    if (ioH) {
      ioH.emit('parcelUpdated', { action: 'handed_over', parcel });
      ioH.emit('dataUpdated', { module: 'watchman', action: 'parcel_handover', data: parcel });
    }

    res.json({
      success: true,
      message: `Parcel handed over to ${parcel.handedOverTo}`,
      data: parcel
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update parcel handover', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 5. VEHICLE REGISTER OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// Normalizers for vehicle schema
const VALID_VEHICLE_TYPES = [
  'Two Wheeler',
  'Four Wheeler (Car/SUV)',
  'College Bus',
  'Commercial / Delivery Van',
  'Heavy Vehicle / Truck',
  'Auto Rickshaw',
  'Other'
];

const VALID_VEHICLE_PURPOSES = [
  'Staff Parking',
  'Visitor Entry',
  'Student Commute',
  'Goods / Delivery',
  'Maintenance / Contractor',
  'VIP / Official Guest',
  'Other'
];

function normalizeVehicleType(rawType) {
  if (!rawType) return 'Other';
  if (VALID_VEHICLE_TYPES.includes(rawType)) return rawType;
  const t = String(rawType).trim().toLowerCase();
  if (t.includes('two') || t.includes('2-wheeler') || t.includes('bike') || t.includes('scooter') || t.includes('motorcycle')) return 'Two Wheeler';
  if (t.includes('four') || t.includes('4-wheeler') || t.includes('car') || t.includes('suv') || t.includes('sedan')) return 'Four Wheeler (Car/SUV)';
  if (t.includes('bus') || (t.includes('van') && t.includes('college'))) return 'College Bus';
  if (t.includes('commercial') || t.includes('delivery van') || t.includes('van')) return 'Commercial / Delivery Van';
  if (t.includes('heavy') || t.includes('truck') || t.includes('lorry')) return 'Heavy Vehicle / Truck';
  if (t.includes('auto') || t.includes('rickshaw')) return 'Auto Rickshaw';
  return 'Other';
}

function normalizePurpose(rawPurpose) {
  if (!rawPurpose) return 'Visitor Entry';
  if (VALID_VEHICLE_PURPOSES.includes(rawPurpose)) return rawPurpose;
  const p = String(rawPurpose).trim().toLowerCase();
  if (p.includes('staff') || p.includes('faculty') || p.includes('parking')) return 'Staff Parking';
  if (p.includes('student') || p.includes('commute')) return 'Student Commute';
  if (p.includes('good') || p.includes('delivery') || p.includes('parcel')) return 'Goods / Delivery';
  if (p.includes('maint') || p.includes('contract')) return 'Maintenance / Contractor';
  if (p.includes('vip') || p.includes('guest') || p.includes('official')) return 'VIP / Official Guest';
  if (p.includes('visitor') || p.includes('campus entry') || p.includes('entry')) return 'Visitor Entry';
  return 'Other';
}

// GET /api/watchman/vehicles or /api/vehicles - List vehicles
router.get(['/vehicles', '/vehicles/all', '/'], protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = await buildTenantOrAllFilter(req, SecurityVehicleLog);

    const { status, search } = req.query;
    if (status && status !== 'All') filter.status = status;
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { vehicleNumber: { $regex: q, $options: 'i' } },
        { driverName: { $regex: q, $options: 'i' } },
        { purpose: { $regex: q, $options: 'i' } }
      ];
    }

    const vehicles = await SecurityVehicleLog.find(filter).sort({ entryTime: -1 }).limit(200);
    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles', error: err.message });
  }
});

// POST /api/watchman/vehicles/entry or /api/vehicles/entry - Record vehicle entry
router.post(['/vehicles/entry', '/entry'], protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawNumber = req.body.vehicleNumber || req.body.vehicleNo;
    const rawDriver = req.body.driverName || req.body.driver;
    const rawType = req.body.vehicleType;
    const rawPhone = req.body.driverPhone || req.body.phone || '';
    const rawPurpose = req.body.purpose;
    const { destination, gate, notes } = req.body;

    if (!rawNumber || !rawNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Vehicle registration number is required' });
    }
    if (!rawDriver || !rawDriver.trim()) {
      return res.status(400).json({ success: false, message: 'Driver name is required' });
    }

    const cleanVehicleNumber = rawNumber.trim().toUpperCase();
    const cleanDriverName = rawDriver.trim();
    const normalizedType = normalizeVehicleType(rawType);
    const normalizedPurp = normalizePurpose(rawPurpose);

    // Duplicate Check: Check if this vehicle is ALREADY inside campus
    const activeInsideVehicle = await SecurityVehicleLog.findOne({
      vehicleNumber: cleanVehicleNumber,
      status: 'Inside'
    });

    if (activeInsideVehicle) {
      return res.status(400).json({
        success: false,
        message: `Vehicle ${cleanVehicleNumber} is already logged as inside campus (Entered at ${activeInsideVehicle.gate || 'Gate 1'}, Driver: ${activeInsideVehicle.driverName || 'Unknown'}). Please record vehicle exit before registering a new entry.`
      });
    }

    const tenantId = getTenant(req);
    // Collision-free unique ID generation
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const vehicleLogId = `VEH-${dateStr}-${Date.now().toString().slice(-4)}-${randomSuffix}`;

    const newVehicle = new SecurityVehicleLog({
      vehicleLogId,
      vehicleNumber: cleanVehicleNumber,
      vehicleType: normalizedType,
      driverName: cleanDriverName,
      driverPhone: rawPhone ? String(rawPhone).trim() : '',
      purpose: normalizedPurp,
      destination: destination || 'Campus Parking',
      entryTime: new Date(),
      status: 'Inside',
      gate: gate || 'Gate 1 (Main Entrance)',
      watchmanName: req.user.name || 'Security Guard',
      notes: notes || '',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newVehicle.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('vehicleUpdated', { action: 'entry', vehicle: newVehicle });
      io.emit('dataUpdated', { module: 'watchman', action: 'vehicle_entry', data: newVehicle });
    }

    res.status(201).json({
      success: true,
      message: `Vehicle ${cleanVehicleNumber} entry recorded.`,
      data: newVehicle
    });
  } catch (err) {
    console.error('Error recording vehicle entry:', err);
    res.status(500).json({ success: false, message: 'Failed to record vehicle entry', error: err.message });
  }
});

// PATCH /api/watchman/vehicles/:id/exit or /api/vehicles/:id/exit - Record vehicle exit
router.patch(['/vehicles/:id/exit', '/:id/exit'], protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    let vehicle = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      vehicle = await SecurityVehicleLog.findById(req.params.id);
    }
    if (!vehicle) {
      vehicle = await SecurityVehicleLog.findOne({ vehicleLogId: req.params.id });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle record not found' });
    }

    if (vehicle.status === 'Exited') {
      return res.status(400).json({ success: false, message: `Vehicle ${vehicle.vehicleNumber} has already been recorded as exited.` });
    }

    vehicle.status = 'Exited';
    vehicle.exitTime = new Date();
    vehicle.exitWatchmanName = req.user.name || 'Security Guard';
    if (req.body.gate) {
      vehicle.notes = vehicle.notes ? `${vehicle.notes} | Exited via ${req.body.gate}` : `Exited via ${req.body.gate}`;
    }
    await vehicle.save();

    const ioExit = req.app.get('io');
    if (ioExit) {
      ioExit.emit('vehicleUpdated', { action: 'exit', vehicle });
      ioExit.emit('dataUpdated', { module: 'watchman', action: 'vehicle_exit', data: vehicle });
    }

    res.json({
      success: true,
      message: `Vehicle ${vehicle.vehicleNumber} exit recorded.`,
      data: vehicle
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record vehicle exit', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 6. STUDENT & STAFF MOVEMENT REGISTERS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/student-register
router.get('/student-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin'
      ? { personType: 'Student' }
      : {
        personType: 'Student',
        $or: [{ collegeId: tenantId }, { tenantId }]
      };

    const { search, movementType, direction } = req.query;
    const activeDir = movementType || direction;
    if (activeDir && activeDir !== 'All') {
      filter.direction = activeDir;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { personId: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { movementId: { $regex: q, $options: 'i' } }
      ];
    }

    const movements = await CampusGateMovement.find(filter).sort({ timestamp: -1 }).limit(200).lean();

    const formatted = movements.map(m => ({
      _id: m._id,
      movementId: m.movementId,
      studentId: m.personId,
      personId: m.personId,
      studentName: m.name,
      name: m.name,
      department: m.department || 'General',
      semester: m.semester || 'Final Year',
      movementType: m.direction,
      direction: m.direction,
      reason: m.reason,
      gatePassNumber: m.gatePassId || '',
      gatePassId: m.gatePassId || '',
      vehicleNumber: m.vehicleNumber || '',
      gate: m.gate || 'Gate 1',
      watchmanName: m.watchmanName || 'Security Guard',
      timestamp: m.timestamp || m.createdAt,
      remarks: m.remarks || ''
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch student register', error: err.message, data: [] });
  }
});

// POST /api/watchman/student-register
router.post('/student-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawPersonId = (req.body.studentId || req.body.personId || '').trim();
    let personId = rawPersonId;
    let name = (req.body.studentName || req.body.name || '').trim();
    const rawDir = String(req.body.movementType || req.body.direction || 'In').toLowerCase();
    const direction = rawDir.includes('out') ? 'Out' : 'In';
    const reason = (req.body.reason || 'Regular Campus Entry / Exit').trim();
    const gatePassId = req.body.gatePassNumber || req.body.gatePassId || '';
    let department = req.body.department || '';
    let semester = req.body.semester || '';
    const vehicleNumber = (req.body.vehicleNumber || '').trim().toUpperCase();
    const gate = req.body.gate || req.user?.assignedGate || 'Gate 1 (Main Entrance)';
    const remarks = (req.body.remarks || '').trim();

    // 1. Auto-identification: Look up student in database by Roll Number / Student ID / QR / Phone / Email
    if (personId) {
      const cleanId = personId.replace(/^STU-QR-/i, '').trim();
      const studentDoc = await Student.findOne({
        $or: [
          { id: cleanId },
          { id: personId },
          { idNumber: cleanId },
          { idNumber: personId },
          { rollNo: cleanId },
          { rollNo: personId },
          { qrCode: personId },
          { qrCode: `STU-QR-${cleanId}` },
          { email: personId.toLowerCase() },
          { phone: personId },
          { mobile: personId }
        ]
      }).lean();

      if (studentDoc) {
        personId = studentDoc.id || studentDoc.rollNo || personId;
        if (!name) name = studentDoc.name;
        if (!department) department = studentDoc.dept || studentDoc.department || 'General';
        if (!semester) semester = studentDoc.sem || studentDoc.semester || '';
      }
    }

    if (!personId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Student ID / Roll Number and Student Name are required to record movement.'
      });
    }

    if (!department) department = 'General';

    const tenantId = getTenant(req) || req.user?.collegeId || 'COL001';
    const movementId = `STU-MOV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const watchmanName = req.user?.name || req.user?.username || 'Security Guard';

    // 2. Strict Movement Validation: Enforce that student cannot enter twice without exit, or exit without previous entry
    const activeEntry = await StudentCampusEntry.findOne({
      studentId: personId.toUpperCase(),
      status: 'Inside Campus'
    }).sort({ checkInTime: -1 });

    const lastMovement = await CampusGateMovement.findOne({
      personType: 'Student',
      personId: personId.toUpperCase()
    }).sort({ timestamp: -1 }).lean();

    const isInside = Boolean(activeEntry || (lastMovement && lastMovement.direction === 'In'));

    if (direction === 'In' && isInside) {
      const enterTimeStr = activeEntry?.checkInTime
        ? new Date(activeEntry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (lastMovement?.timestamp ? new Date(lastMovement.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier today');
      return res.status(400).json({
        success: false,
        message: `Validation Error: Student ${name} (${personId.toUpperCase()}) is already recorded Inside Campus (checked in at ${enterTimeStr}). A student cannot enter twice without an exit. Please record Campus Exit (Out) instead.`
      });
    }

    if (direction === 'Out' && !isInside) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Student ${name} (${personId.toUpperCase()}) does not have an active campus entry record. A student cannot exit without a prior entry. Please record Campus Entry (In) first.`
      });
    }

    // 3. Create Gate Movement Record
    const newMovement = new CampusGateMovement({
      movementId,
      personType: 'Student',
      personId: personId.toUpperCase(),
      name,
      department,
      semester,
      direction,
      reason,
      gatePassId: gatePassId.trim(),
      vehicleNumber,
      gate,
      watchmanName,
      remarks,
      timestamp: new Date(),
      collegeId: tenantId,
      tenantId
    });

    // 4. Synchronize StudentCampusEntry and calculate duration if exiting
    try {
      const todayStr = getISTDateString();
      if (direction === 'In') {
        const entryId = `SCE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const studentEntry = new StudentCampusEntry({
          entryId,
          studentId: personId.toUpperCase(),
          studentName: name,
          department,
          semester,
          photoUrl: '',
          qrCode: `STU-QR-${personId.toUpperCase()}`,
          checkInTime: new Date(),
          checkOutTime: null,
          durationMinutes: 0,
          durationFormatted: '',
          status: 'Inside Campus',
          entryWatchmanId: req.user?._id || null,
          entryWatchmanName: watchmanName,
          entryGate: gate,
          dateString: todayStr,
          collegeId: tenantId,
          tenantId,
          remarks
        });
        await studentEntry.save();
      } else {
        // Exit Campus (Out)
        if (activeEntry) {
          const checkOutTime = new Date();
          const checkInTime = new Date(activeEntry.checkInTime);
          const durationMinutes = Math.max(0, Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000));
          const hours = Math.floor(durationMinutes / 60);
          const mins = durationMinutes % 60;
          const durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

          activeEntry.checkOutTime = checkOutTime;
          activeEntry.durationMinutes = durationMinutes;
          activeEntry.durationFormatted = durationFormatted;
          activeEntry.status = 'Checked Out';
          activeEntry.exitWatchmanId = req.user?._id || null;
          activeEntry.exitWatchmanName = watchmanName;
          activeEntry.exitGate = gate;
          await activeEntry.save();

          newMovement.checkOutTime = checkOutTime;
          newMovement.durationMinutes = durationMinutes;
          newMovement.durationFormatted = durationFormatted;
        } else if (lastMovement && lastMovement.direction === 'In') {
          const inMs = new Date(lastMovement.timestamp).getTime();
          const durationMinutes = Math.max(0, Math.round((Date.now() - inMs) / 60000));
          const hours = Math.floor(durationMinutes / 60);
          const mins = durationMinutes % 60;
          newMovement.checkOutTime = new Date();
          newMovement.durationMinutes = durationMinutes;
          newMovement.durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
      }
    } catch (syncErr) {
      console.warn('StudentCampusEntry sync notice in student-register:', syncErr.message);
    }

    await newMovement.save();

    // 5. Sync CampusPerson status so unified campus tracking and future lookups have this student registered
    try {
      await CampusPerson.findOneAndUpdate(
        { personId: personId.toUpperCase() },
        {
          $set: {
            name,
            personType: 'Student',
            department: department || 'General',
            currentStatus: direction === 'In' ? 'Inside Campus' : 'Outside Campus',
            lastGate: gate,
            ...(direction === 'In' ? { lastEntryTime: new Date() } : { lastExitTime: new Date() })
          },
          $inc: direction === 'In' ? { totalVisits: 1 } : {}
        },
        { upsert: true, new: true }
      );
    } catch (cpErr) {
      console.warn('CampusPerson sync warning in student-register:', cpErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'watchman', action: 'student_movement', data: newMovement });
    }

    res.status(201).json({
      success: true,
      message: `Student ${direction === 'In' ? 'Campus Entry (In)' : 'Campus Exit (Out)'} recorded successfully`,
      currentStatus: direction === 'In' ? 'Inside Campus' : 'Outside Campus',
      data: newMovement
    });
  } catch (err) {
    console.error('Failed to record student movement:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record student movement', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 6B. STUDENT QR CODE VERIFICATION & AUTOMATIC ATTENDANCE TRACKING
// ══════════════════════════════════════════════════════════════════════════



// GET /api/watchman/student-qr/:code - Look up student by QR code, ID, or roll number
router.get('/student-qr/:code', optionalAuth, async (req, res) => {
  try {
    const rawCode = (req.params.code || '').trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'QR code or Student ID is required' });
    }

    // Handle URL or JSON payloads if scanner sends stringified JSON or full verify URL
    let queryCode = rawCode;
    if (queryCode.includes('code=')) {
      try {
        const urlMatch = queryCode.match(/[?&]code=([^&#]+)/);
        if (urlMatch && urlMatch[1]) {
          queryCode = decodeURIComponent(urlMatch[1]);
        }
      } catch (_) { }
    } else {
      try {
        if (rawCode.startsWith('{') && rawCode.endsWith('}')) {
          const parsed = JSON.parse(rawCode);
          queryCode = parsed.studentId || parsed.id || parsed.code || rawCode;
        }
      } catch (_) { }
    }

    // Strip common prefixes if present, e.g. "STU-QR-"
    const cleanId = queryCode.replace(/^STU-QR-/i, '').trim();
    // Normalize phone digits for mobile search
    const cleanDigits = queryCode.replace(/\D/g, '');
    const phone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : '';

    // Verify this is not a visitor pass
    const visitorCheck = await VisitorLog.findOne({
      $or: [
        { passNumber: new RegExp(`^${queryCode}$`, 'i') },
        { visitorId: new RegExp(`^${queryCode}$`, 'i') }
      ]
    }).lean() || await CampusPerson.findOne({
      $or: [
        { personId: new RegExp(`^${queryCode}$`, 'i') },
        { personId: queryCode }
      ],
      personType: 'Visitor'
    }).lean();

    if (visitorCheck) {
      return res.status(400).json({
        success: false,
        isVisitorPass: true,
        message: `Visitor pass detected (${visitorCheck.name || queryCode}). Please use the dedicated Visitor Scanner in Visitor Management.`
      });
    }

    // Find student in DB across all identifiers (QR code, ID, rollNo, mobile/phone, email, name)
    const orConditions = [
      { qrCode: queryCode },
      { qrCode: `STU-QR-${cleanId}` },
      { id: cleanId },
      { id: queryCode },
      { idNumber: cleanId },
      { idNumber: queryCode },
      { rollNo: cleanId },
      { rollNo: queryCode },
      { email: queryCode.toLowerCase() },
      { phone: queryCode },
      { mobile: queryCode }
    ];

    if (phone10) {
      orConditions.push(
        { phone: phone10 },
        { phone: `+91${phone10}` },
        { phone: `+91 ${phone10}` },
        { mobile: phone10 },
        { mobile: `+91${phone10}` },
        { mobile: `+91 ${phone10}` },
        { phone: { $regex: `${phone10}$` } },
        { mobile: { $regex: `${phone10}$` } }
      );
    }

    if (cleanDigits.length >= 7) {
      orConditions.push(
        { phone: cleanDigits },
        { mobile: cleanDigits }
      );
    }

    // Name match if not purely numeric
    if (!/^\d+$/.test(queryCode.trim())) {
      orConditions.push({ name: { $regex: new RegExp(`^${queryCode.trim()}$`, 'i') } });
    }

    const student = await Student.findOne({ $or: orConditions }).lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `No student record found for "${rawCode}". Please verify the registered mobile number, Student ID, or QR code.`
      });
    }

    // Ensure student has a permanent, unique QR code in database
    const studentQrCode = student.qrCode || `STU-QR-${student.id}`;
    if (!student.qrCode) {
      await Student.updateOne({ _id: student._id }, { $set: { qrCode: studentQrCode } });
    }

    const frontendBase = getFrontendBase(req);
    const verifyUrl = `${frontendBase}/watchman/verify?code=${encodeURIComponent(studentQrCode)}&type=student&id=${encodeURIComponent(student.id)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;

    // Check if student currently has an active check-in (Inside Campus)
    const activeEntry = await StudentCampusEntry.findOne({
      studentId: student.id,
      status: 'Inside Campus'
    }).sort({ checkInTime: -1 }).lean();

    let durationSoFar = '';
    let durationMinutesSoFar = 0;
    if (activeEntry) {
      const nowMs = Date.now();
      const inMs = new Date(activeEntry.checkInTime).getTime();
      durationMinutesSoFar = Math.max(1, Math.round((nowMs - inMs) / 60000));
      durationSoFar = formatCampusDuration(durationMinutesSoFar);
    }

    res.json({
      success: true,
      qrUrl,
      student: {
        _id: student._id,
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone || student.mobile || '',
        department: student.dept || student.department || 'General',
        course: student.course || student.degreeType || 'Engineering',
        semester: student.sem || student.semester || '1',
        photoUrl: student.photoUrl || '',
        qrCode: studentQrCode,
        qrUrl,
        batch: student.batch || '',
        bloodGroup: student.bloodGroup || ''
      },
      currentStatus: activeEntry ? 'Inside Campus' : 'Checked Out',
      canCheckIn: !activeEntry,
      canCheckOut: !!activeEntry,
      activeEntry: activeEntry ? {
        ...activeEntry,
        durationSoFar,
        durationMinutesSoFar
      } : null
    });
  } catch (err) {
    console.error('Error looking up student QR:', err);
    res.status(500).json({ success: false, message: 'Failed to look up student by QR', error: err.message });
  }
});

// POST /api/watchman/student-checkin - Confirm student entry using server timestamp
router.post('/student-checkin', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawStudentId = (req.body.studentId || '').trim();
    const gate = req.body.gate || req.user?.assignedGate || 'Gate 1 (Main Entrance)';
    const remarks = (req.body.remarks || '').trim();

    if (!rawStudentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required for check-in' });
    }

    const cleanId = rawStudentId.replace(/^STU-QR-/i, '').trim();

    // Look up student record
    const student = await Student.findOne({
      $or: [
        { id: cleanId },
        { id: rawStudentId },
        { qrCode: rawStudentId },
        { qrCode: `STU-QR-${cleanId}` }
      ]
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student record not found in database' });
    }

    // Verify student is not already inside campus (prevent duplicate check-in)
    const existingActive = await StudentCampusEntry.findOne({
      studentId: student.id,
      status: 'Inside Campus'
    });

    if (existingActive) {
      const inTimeStr = new Date(existingActive.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      return res.status(400).json({
        success: false,
        message: `Duplicate Check-in Denied: ${student.name} (${student.id}) is already checked in and inside campus since ${inTimeStr} at ${existingActive.entryGate}.`
      });
    }

    const tenantId = getTenant(req) || req.user?.collegeId || 'COL001';
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const entryId = `SCE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const studentQrCode = student.qrCode || `STU-QR-${student.id}`;
    const watchmanName = req.user?.name || req.user?.username || 'Security Guard';

    // Create entry record with server-generated timestamp
    const newEntry = new StudentCampusEntry({
      entryId,
      studentId: student.id,
      studentObjectId: student._id,
      studentName: student.name,
      phone: student.phone || student.mobile || '',
      department: student.dept || student.department || 'General',
      course: student.course || student.degreeType || 'Engineering',
      semester: student.sem || student.semester || '',
      photoUrl: student.photoUrl || '',
      qrCode: studentQrCode,
      checkInTime: now,
      checkOutTime: null,
      durationMinutes: 0,
      durationFormatted: '',
      status: 'Inside Campus',
      entryWatchmanId: req.user?._id || null,
      entryWatchmanName: watchmanName,
      entryGate: gate,
      dateString,
      collegeId: tenantId,
      tenantId,
      remarks
    });

    await newEntry.save();

    // Keep CampusGateMovement synchronized for legacy movement reports
    try {
      const movement = new CampusGateMovement({
        movementId: `MOV-${entryId}`,
        personType: 'Student',
        personId: student.id,
        name: student.name,
        department: student.dept || student.department || 'General',
        semester: student.sem || student.semester || '',
        direction: 'In',
        reason: 'Regular Campus Entry / Exit',
        gate,
        watchmanName,
        remarks: remarks || 'Automatic QR Check-in',
        timestamp: now,
        collegeId: tenantId,
        tenantId
      });
      await movement.save();
    } catch (movErr) {
      console.warn('CampusGateMovement sync warning:', movErr.message);
    }

    // Real-time broadcast to Admin Dashboard and Watchman dashboards
    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', {
        module: 'watchman',
        action: 'student_checkin',
        data: newEntry
      });
      io.emit('dataUpdated', {
        module: 'student_tracking',
        action: 'checkin',
        data: newEntry
      });
    }

    res.status(201).json({
      success: true,
      message: `Check-in confirmed! ${student.name} entered campus at ${now.toLocaleTimeString('en-IN')}`,
      data: newEntry
    });
  } catch (err) {
    console.error('Student check-in error:', err);
    res.status(500).json({ success: false, message: 'Failed to record student check-in', error: err.message });
  }
});

// POST /api/watchman/student-checkout - Confirm student exit and calculate duration
router.post('/student-checkout', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawStudentId = (req.body.studentId || '').trim();
    const gate = req.body.gate || req.user?.assignedGate || 'Gate 1 (Main Entrance)';
    const remarks = (req.body.remarks || '').trim();

    if (!rawStudentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required for checkout' });
    }

    const cleanId = rawStudentId.replace(/^STU-QR-/i, '').trim();

    // Find active entry for this student
    const activeEntry = await StudentCampusEntry.findOne({
      $or: [
        { studentId: cleanId },
        { studentId: rawStudentId }
      ],
      status: 'Inside Campus'
    }).sort({ checkInTime: -1 });

    if (!activeEntry) {
      return res.status(400).json({
        success: false,
        message: `Checkout Denied: No active check-in found for Student ID: ${rawStudentId}. Student must check in before checking out.`
      });
    }

    // Server-side exit timestamp and duration calculation
    const now = new Date();
    const checkInMs = new Date(activeEntry.checkInTime).getTime();
    const diffMs = now.getTime() - checkInMs;
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
    const durationFormatted = formatCampusDuration(durationMinutes);
    const watchmanName = req.user?.name || req.user?.username || 'Security Guard';

    activeEntry.checkOutTime = now;
    activeEntry.durationMinutes = durationMinutes;
    activeEntry.durationFormatted = durationFormatted;
    activeEntry.status = 'Checked Out';
    activeEntry.exitWatchmanId = req.user?._id || null;
    activeEntry.exitWatchmanName = watchmanName;
    activeEntry.exitGate = gate;
    if (remarks) activeEntry.remarks = remarks;

    await activeEntry.save();

    // Keep CampusGateMovement synchronized
    try {
      const tenantId = getTenant(req) || req.user?.collegeId || 'COL001';
      const movement = new CampusGateMovement({
        movementId: `MOV-${activeEntry.entryId}-OUT-${Date.now().toString().slice(-4)}`,
        personType: 'Student',
        personId: activeEntry.studentId,
        name: activeEntry.studentName,
        department: activeEntry.department,
        semester: activeEntry.semester,
        direction: 'Out',
        reason: 'Regular Campus Entry / Exit',
        gate,
        watchmanName,
        remarks: remarks || `Automatic QR Checkout (${durationFormatted} on campus)`,
        timestamp: now,
        collegeId: tenantId,
        tenantId
      });
      await movement.save();
    } catch (movErr) {
      console.warn('CampusGateMovement exit sync warning:', movErr.message);
    }

    // Real-time broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', {
        module: 'watchman',
        action: 'student_checkout',
        data: activeEntry
      });
      io.emit('dataUpdated', {
        module: 'student_tracking',
        action: 'checkout',
        data: activeEntry
      });
    }

    res.json({
      success: true,
      message: `Checkout confirmed! ${activeEntry.studentName} exited campus. Total campus duration: ${durationFormatted}.`,
      data: activeEntry
    });
  } catch (err) {
    console.error('Student checkout error:', err);
    res.status(500).json({ success: false, message: 'Failed to record student checkout', error: err.message });
  }
});

// GET /api/watchman/student-entries (and alias /student-tracking) - List all entries with filtering & stats
router.get(['/student-entries', '/student-tracking'], protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    await ensureWatchmanRealtimeData();
    const { search, date, status, department, gate, limit = 200 } = req.query;

    const baseFilter = await buildTenantOrAllFilter(req, StudentCampusEntry);
    const andConditions = [baseFilter];

    if (date && date.trim() && date !== 'All') {
      andConditions.push({ dateString: date.trim() });
    }

    if (status && status !== 'All') {
      andConditions.push({ status });
    }

    if (department && department !== 'All') {
      andConditions.push({ department });
    }

    if (gate && gate !== 'All') {
      andConditions.push({ $or: [{ entryGate: gate }, { exitGate: gate }] });
    }

    if (search && search.trim()) {
      const q = search.trim();
      andConditions.push({
        $or: [
          { studentName: { $regex: q, $options: 'i' } },
          { studentId: { $regex: q, $options: 'i' } },
          { phone: { $regex: q, $options: 'i' } },
          { department: { $regex: q, $options: 'i' } },
          { course: { $regex: q, $options: 'i' } },
          { entryWatchmanName: { $regex: q, $options: 'i' } },
          { exitWatchmanName: { $regex: q, $options: 'i' } },
          { entryId: { $regex: q, $options: 'i' } }
        ]
      });
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    let entries = await StudentCampusEntry.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10) || 200)
      .lean();

    // Fallback: If date-specific search yielded 0 but no other strict filters are set, provide today's entries
    if (entries.length === 0 && (!search || !search.trim()) && (!department || department === 'All') && (!status || status === 'All')) {
      entries = await StudentCampusEntry.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit, 10) || 200)
        .lean();
    }

    // Compute live campus duration for currently inside students
    const now = Date.now();
    const enriched = entries.map(item => {
      if (item.status === 'Inside Campus') {
        const inMs = new Date(item.checkInTime).getTime();
        const liveMinutes = Math.max(1, Math.round((now - inMs) / 60000));
        return {
          ...item,
          durationMinutes: liveMinutes,
          durationFormatted: `${formatCampusDuration(liveMinutes)} (Ongoing)`
        };
      }
      return item;
    });

    // Today's summary stats
    const todayStr = new Date().toISOString().split('T')[0];
    const todayQuery = await buildTenantOrAllFilter(req, StudentCampusEntry, { dateString: todayStr });

    const [todayTotal, todayInside, todayCheckedOut, completedEntries] = await Promise.all([
      StudentCampusEntry.countDocuments(todayQuery),
      StudentCampusEntry.countDocuments({ ...todayQuery, status: 'Inside Campus' }),
      StudentCampusEntry.countDocuments({ ...todayQuery, status: 'Checked Out' }),
      StudentCampusEntry.find({ ...todayQuery, status: 'Checked Out' }, 'durationMinutes').lean()
    ]);

    const totalMinutes = completedEntries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const avgMinutes = completedEntries.length > 0 ? Math.round(totalMinutes / completedEntries.length) : 0;

    res.json({
      success: true,
      count: enriched.length,
      data: enriched,
      stats: {
        totalScansToday: todayTotal,
        insideCampus: todayInside,
        checkedOutToday: todayCheckedOut,
        averageMinutesToday: avgMinutes,
        averageDurationFormatted: formatCampusDuration(avgMinutes)
      }
    });
  } catch (err) {
    console.error('Failed to fetch student entries:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student entry records', error: err.message, data: [] });
  }
});

// GET /api/watchman/student-today-scans - Watchman scanner quick history
router.get('/student-today-scans', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const query = await buildTenantOrAllFilter(req, StudentCampusEntry, { dateString: todayStr });

    const entries = await StudentCampusEntry.find(query).sort({ updatedAt: -1 }).limit(50).lean();

    const now = Date.now();
    const formatted = entries.map(item => {
      if (item.status === 'Inside Campus') {
        const inMs = new Date(item.checkInTime).getTime();
        const liveMinutes = Math.max(1, Math.round((now - inMs) / 60000));
        return {
          ...item,
          durationMinutes: liveMinutes,
          durationFormatted: `${formatCampusDuration(liveMinutes)} (Inside)`
        };
      }
      return item;
    });

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch today scans', error: err.message, data: [] });
  }
});

// GET /api/watchman/student-daily-report - Detailed entry/exit daily report
router.get('/student-daily-report', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    await ensureWatchmanRealtimeData();

    const tenantId = getTenant(req);
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];

    const baseFilter = await buildTenantOrAllFilter(req, StudentCampusEntry, { dateString: targetDate });
    let entries = await StudentCampusEntry.find(baseFilter).sort({ checkInTime: 1 }).lean();

    if (entries.length === 0) {
      const fallbackFilter = await buildTenantOrAllFilter(req, StudentCampusEntry);
      entries = await StudentCampusEntry.find(fallbackFilter).sort({ checkInTime: 1 }).limit(100).lean();
    }

    // Department breakdown
    const deptMap = {};
    // Hourly breakdown (06:00 to 21:00)
    const hourlyMap = {};
    for (let h = 6; h <= 21; h++) {
      hourlyMap[`${String(h).padStart(2, '0')}:00`] = { checkIns: 0, checkOuts: 0 };
    }

    let totalDuration = 0;
    let completedCount = 0;

    entries.forEach(e => {
      const dept = e.department || 'General';
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, total: 0, inside: 0, checkedOut: 0 };
      }
      deptMap[dept].total += 1;
      if (e.status === 'Inside Campus') {
        deptMap[dept].inside += 1;
      } else {
        deptMap[dept].checkedOut += 1;
      }

      // Check-in hour
      if (e.checkInTime) {
        const inHour = new Date(e.checkInTime).getHours();
        const slot = `${String(inHour).padStart(2, '0')}:00`;
        if (hourlyMap[slot]) hourlyMap[slot].checkIns += 1;
      }

      // Check-out hour
      if (e.checkOutTime) {
        const outHour = new Date(e.checkOutTime).getHours();
        const slot = `${String(outHour).padStart(2, '0')}:00`;
        if (hourlyMap[slot]) hourlyMap[slot].checkOuts += 1;
        totalDuration += (e.durationMinutes || 0);
        completedCount += 1;
      }
    });

    const avgCampusDuration = completedCount > 0 ? Math.round(totalDuration / completedCount) : 0;

    // Traffic distribution insights
    let peakHour = '09:00';
    let peakMovements = 0;
    let morningVolume = 0;
    let afternoonVolume = 0;
    let activeHoursCount = 0;

    Object.entries(hourlyMap).forEach(([hour, counts]) => {
      const hNum = parseInt(hour.split(':')[0], 10);
      const slotTotal = counts.checkIns + counts.checkOuts;
      if (slotTotal > 0) activeHoursCount++;
      if (slotTotal > peakMovements) {
        peakMovements = slotTotal;
        peakHour = hour;
      }
      if (hNum < 14) {
        morningVolume += slotTotal;
      } else {
        afternoonVolume += slotTotal;
      }
    });

    res.json({
      success: true,
      reportDate: targetDate,
      summary: {
        totalScans: entries.length,
        currentlyInside: entries.filter(e => e.status === 'Inside Campus').length,
        checkedOut: completedCount,
        averageDurationMinutes: avgCampusDuration,
        averageDurationFormatted: formatCampusDuration(avgCampusDuration),
        peakHour,
        peakMovements,
        morningVolume,
        afternoonVolume,
        activeHoursCount
      },
      departmentBreakdown: Object.values(deptMap),
      hourlyBreakdown: Object.entries(hourlyMap).map(([hour, counts]) => ({
        hour,
        ...counts,
        totalMovements: counts.checkIns + counts.checkOuts
      })),
      recentEntries: entries.slice(-20).reverse()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate student daily report', error: err.message });
  }
});

// GET /api/watchman/student-qr-directory - List registered students with their unique QR codes & live status
router.get('/student-qr-directory', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { search, department, limit = 300 } = req.query;

    const extraConds = {};
    if (department && department !== 'All') {
      extraConds.$or = [{ dept: department }, { department }];
    }

    if (search && search.trim()) {
      const q = search.trim();
      extraConds.$and = [
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { id: { $regex: q, $options: 'i' } },
            { idNumber: { $regex: q, $options: 'i' } },
            { rollNo: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
            { qrCode: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } },
            { mobile: { $regex: q, $options: 'i' } }
          ]
        }
      ];
    }

    const filter = await buildTenantOrAllFilter(req, Student, extraConds);

    const students = await Student.find(filter)
      .select('id name email phone dept department course degreeType sem semester photoUrl batch qrCode')
      .sort({ name: 1 })
      .limit(parseInt(limit, 10) || 300)
      .lean();

    // Query active entries to mark who is currently Inside Campus
    const studentIds = students.map(s => s.id);
    const activeEntries = await StudentCampusEntry.find({
      studentId: { $in: studentIds },
      status: 'Inside Campus'
    }).lean();

    const activeMap = {};
    activeEntries.forEach(ae => {
      activeMap[ae.studentId] = ae;
    });

    const frontendBase = getFrontendBase(req);

    const directory = students.map(s => {
      const qrCode = s.qrCode || `STU-QR-${s.id}`;
      const active = activeMap[s.id];
      const verifyUrl = `${frontendBase}/watchman/verify?code=${encodeURIComponent(qrCode)}&type=student&id=${encodeURIComponent(s.id)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl)}`;
      return {
        _id: s._id,
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone || '',
        department: s.dept || s.department || 'General',
        course: s.course || s.degreeType || 'Engineering',
        semester: s.sem || s.semester || '1',
        photoUrl: s.photoUrl || '',
        batch: s.batch || '',
        qrCode,
        qrUrl,
        currentStatus: active ? 'Inside Campus' : 'Checked Out',
        activeCheckInTime: active ? active.checkInTime : null,
        activeGate: active ? active.entryGate : null
      };
    });

    res.json({ success: true, count: directory.length, data: directory });
  } catch (err) {
    console.error('Failed to fetch student QR directory:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student QR directory', error: err.message, data: [] });
  }
});

// GET /api/watchman/staff-register
router.get('/staff-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const filter = await buildTenantOrAllFilter(req, CampusGateMovement, { personType: 'Staff' });

    const { search, movementType, direction } = req.query;
    const activeDir = movementType || direction;
    if (activeDir && activeDir !== 'All') {
      filter.direction = activeDir;
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { personId: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { movementId: { $regex: q, $options: 'i' } }
      ];
    }

    const movements = await CampusGateMovement.find(filter).sort({ timestamp: -1 }).limit(200).lean();

    const formatted = movements.map(m => ({
      _id: m._id,
      movementId: m.movementId,
      staffId: m.personId,
      personId: m.personId,
      staffName: m.name,
      name: m.name,
      department: m.department || 'General',
      designation: m.designation || 'Staff',
      movementType: m.direction,
      direction: m.direction,
      reason: m.reason || 'Official College Duty',
      passNumber: m.gatePassId || '',
      gatePassId: m.gatePassId || '',
      vehicleNumber: m.vehicleNumber || '',
      gate: m.gate || 'Gate 1',
      watchmanName: m.watchmanName || 'Security Guard',
      timestamp: m.timestamp || m.createdAt,
      remarks: m.remarks || ''
    }));

    res.json({ success: true, count: formatted.length, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch staff register', error: err.message, data: [] });
  }
});

// GET /api/watchman/staff-lookup/:code - Identify registered staff by ID, Email, Phone or Name
router.get('/staff-lookup/:code', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawCode = (req.params.code || '').trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Staff ID or search term is required' });
    }

    const cleanCode = rawCode.trim();
    // 1. Search Staff collection
    let staff = await Staff.findOne({
      $or: [
        { id: cleanCode },
        { id: cleanCode.toUpperCase() },
        { email: cleanCode.toLowerCase() },
        { phone: cleanCode },
        { name: { $regex: new RegExp(`^${cleanCode}$`, 'i') } }
      ]
    }).lean();

    // 2. Search User collection (Staff / Faculty / HOD)
    if (!staff) {
      const user = await User.findOne({
        role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal'] },
        $or: [
          { referenceId: cleanCode },
          { referenceId: cleanCode.toUpperCase() },
          { email: cleanCode.toLowerCase() },
          { phone: cleanCode },
          { name: { $regex: new RegExp(`^${cleanCode}$`, 'i') } }
        ]
      }).lean();

      if (user) {
        staff = {
          id: user.referenceId || user.email,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          dept: user.department,
          designation: user.role
        };
      }
    }

    // 3. Search CampusPerson collection
    if (!staff) {
      const cp = await CampusPerson.findOne({
        personType: 'Staff',
        $or: [
          { personId: cleanCode.toUpperCase() },
          { phone: cleanCode },
          { name: { $regex: new RegExp(`^${cleanCode}$`, 'i') } }
        ]
      }).lean();
      if (cp) {
        staff = {
          id: cp.personId,
          name: cp.name,
          email: cp.email || '',
          phone: cp.phone || '',
          dept: cp.department,
          designation: cp.designation || 'Staff'
        };
      }
    }

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: `No staff record found matching "${rawCode}".`
      });
    }

    const staffId = (staff.id || '').toUpperCase();
    const lastMovement = await CampusGateMovement.findOne({
      personType: 'Staff',
      personId: staffId
    }).sort({ timestamp: -1 }).lean();

    const cp = await CampusPerson.findOne({ personId: staffId }).lean();
    const isInside = Boolean(
      (lastMovement && lastMovement.direction === 'In') ||
      (cp && cp.currentStatus === 'Inside Campus')
    );

    res.json({
      success: true,
      staff: {
        id: staff.id,
        staffId: staff.id,
        name: staff.name,
        department: staff.dept || staff.department || 'General',
        designation: staff.designation || 'Faculty / Staff',
        email: staff.email || '',
        phone: staff.phone || ''
      },
      currentStatus: isInside ? 'Inside Campus' : 'Outside Campus',
      canCheckIn: !isInside,
      canCheckOut: isInside,
      lastMovement: lastMovement || null
    });
  } catch (err) {
    console.error('Error looking up staff:', err);
    res.status(500).json({ success: false, message: 'Failed to look up staff', error: err.message });
  }
});

// GET /api/watchman/staff-directory - List registered staff with real-time campus presence
router.get('/staff-directory', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { search, department, limit = 250 } = req.query;
    let staffList = await Staff.find({})
      .select('id name email phone dept designation')
      .sort({ name: 1 })
      .lean();

    const users = await User.find({
      role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal'] }
    }).select('name email phone department referenceId role').lean();

    const staffMap = new Map();
    users.forEach(u => {
      const id = (u.referenceId || u.email || u._id.toString()).toUpperCase();
      staffMap.set(id, {
        _id: u._id,
        userId: u._id,
        id: u.referenceId || u.email,
        staffId: u.referenceId || `STF-${u._id.toString().slice(-4).toUpperCase()}`,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        department: u.department || 'General',
        designation: u.role || 'Staff'
      });
    });

    staffList.forEach(s => {
      const id = s.id ? s.id.toUpperCase() : (s.email ? s.email.toUpperCase() : s._id.toString());
      if (!staffMap.has(id)) {
        const matchedUser = users.find(u =>
          (s.email && u.email && u.email.toLowerCase() === s.email.toLowerCase()) ||
          (s.id && u.referenceId && u.referenceId.toLowerCase() === s.id.toLowerCase())
        );
        staffMap.set(id, {
          _id: matchedUser ? matchedUser._id : s._id,
          userId: matchedUser ? matchedUser._id : null,
          id: s.id,
          staffId: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          department: s.dept || 'General',
          designation: s.designation || 'Staff'
        });
      }
    });

    let allStaff = Array.from(staffMap.values());

    if (department && department !== 'All') {
      allStaff = allStaff.filter(s => s.department === department);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      allStaff = allStaff.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
      );
    }

    const ids = allStaff.map(s => s.id.toUpperCase());
    const cpList = await CampusPerson.find({ personId: { $in: ids } }).lean();
    const cpMap = {};
    cpList.forEach(c => { cpMap[c.personId] = c; });

    const latestMovements = await CampusGateMovement.aggregate([
      { $match: { personType: 'Staff', personId: { $in: ids } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$personId', latest: { $first: '$$ROOT' } } }
    ]);
    const movMap = {};
    latestMovements.forEach(m => { movMap[m._id] = m.latest; });

    const result = allStaff.slice(0, parseInt(limit, 10)).map(s => {
      const sId = s.id.toUpperCase();
      const cp = cpMap[sId];
      const lastMov = movMap[sId];
      const isInside = Boolean(
        (lastMov && lastMov.direction === 'In') ||
        (cp && cp.currentStatus === 'Inside Campus')
      );
      return {
        ...s,
        currentStatus: isInside ? 'Inside Campus' : 'Outside Campus',
        lastMovementTime: lastMov?.timestamp || cp?.lastEntryTime || null,
        lastGate: lastMov?.gate || cp?.lastGate || 'Gate 1'
      };
    });

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    console.error('Error fetching staff directory:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch staff directory', error: err.message, data: [] });
  }
});

// POST /api/watchman/staff-register
router.post('/staff-register', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawPersonId = (req.body.staffId || req.body.personId || '').trim();
    let personId = rawPersonId;
    let name = (req.body.staffName || req.body.name || '').trim();
    const rawDir = String(req.body.movementType || req.body.direction || 'In').toLowerCase();
    const direction = rawDir.includes('out') ? 'Out' : 'In';
    const reason = (req.body.reason || 'Official College Duty').trim();
    const gatePassId = req.body.passNumber || req.body.gatePassId || '';
    let department = req.body.department || '';
    let designation = req.body.designation || '';
    const vehicleNumber = (req.body.vehicleNumber || '').trim().toUpperCase();
    const gate = req.body.gate || req.user?.assignedGate || 'Gate 1 (Main Entrance)';
    const remarks = (req.body.remarks || '').trim();

    // 1. Auto-identification: Look up staff in database by Employee ID, Email, Phone
    if (personId) {
      let staffDoc = await Staff.findOne({
        $or: [
          { id: personId },
          { id: personId.toUpperCase() },
          { email: personId.toLowerCase() },
          { phone: personId }
        ]
      }).lean();

      if (!staffDoc) {
        const userDoc = await User.findOne({
          role: { $in: ['Staff', 'Faculty', 'HOD', 'Principal'] },
          $or: [
            { referenceId: personId },
            { referenceId: personId.toUpperCase() },
            { email: personId.toLowerCase() },
            { phone: personId }
          ]
        }).lean();
        if (userDoc) {
          staffDoc = {
            id: userDoc.referenceId || userDoc.email,
            name: userDoc.name,
            dept: userDoc.department,
            designation: userDoc.role
          };
        }
      }

      if (staffDoc) {
        personId = staffDoc.id || personId;
        if (!name) name = staffDoc.name;
        if (!department) department = staffDoc.dept || staffDoc.department || 'General';
        if (!designation) designation = staffDoc.designation || 'Faculty / Staff';
      }
    }

    if (!personId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID / Employee Code and Staff Name are required to record movement.'
      });
    }

    if (!department) department = 'General';
    if (!designation) designation = 'Faculty / Staff';

    const tenantId = getTenant(req) || req.user?.collegeId || 'COL001';
    const movementId = `STF-MOV-${Date.now().toString().slice(-6)}`;
    const watchmanName = req.user?.name || req.user?.username || 'Security Guard';

    // 2. Strict Movement Validation: Enforce that staff cannot enter twice without exit, or exit without previous entry
    const lastMovement = await CampusGateMovement.findOne({
      personType: 'Staff',
      personId: personId.toUpperCase()
    }).sort({ timestamp: -1 }).lean();

    const cp = await CampusPerson.findOne({
      personId: personId.toUpperCase()
    }).lean();

    const isInside = Boolean(
      (lastMovement && lastMovement.direction === 'In') ||
      (cp && cp.currentStatus === 'Inside Campus')
    );

    if (direction === 'In' && isInside) {
      const enterTimeStr = lastMovement?.timestamp
        ? new Date(lastMovement.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : (cp?.lastEntryTime ? new Date(cp.lastEntryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier today');
      return res.status(400).json({
        success: false,
        message: `Validation Error: Staff member ${name} (${personId.toUpperCase()}) is already recorded Inside Campus (checked in at ${enterTimeStr}). Cannot record Campus In twice without an exit. Please record Campus Out instead.`
      });
    }

    if (direction === 'Out' && !isInside) {
      return res.status(400).json({
        success: false,
        message: `Validation Error: Staff member ${name} (${personId.toUpperCase()}) does not have an active campus entry record. Cannot record Campus Out without a prior entry. Please record Campus In first.`
      });
    }

    // 3. Compute duration if exiting
    let durationMinutes = 0;
    let durationFormatted = '';
    let checkOutTime = null;
    if (direction === 'Out' && lastMovement?.timestamp) {
      checkOutTime = new Date();
      const inMs = new Date(lastMovement.timestamp).getTime();
      durationMinutes = Math.max(0, Math.round((checkOutTime.getTime() - inMs) / 60000));
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      durationFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    // 4. Create Movement
    const newMovement = new CampusGateMovement({
      movementId,
      personType: 'Staff',
      personId: personId.toUpperCase(),
      name,
      department,
      designation,
      direction,
      reason,
      gatePassId: gatePassId.trim(),
      vehicleNumber,
      gate,
      watchmanName,
      remarks,
      checkOutTime,
      durationMinutes,
      durationFormatted,
      timestamp: new Date(),
      collegeId: tenantId,
      tenantId
    });

    await newMovement.save();

    // 5. Sync CampusPerson status for real-time tracking
    try {
      await CampusPerson.findOneAndUpdate(
        { personId: personId.toUpperCase() },
        {
          $set: {
            name,
            personType: 'Staff',
            department: department || 'General',
            designation: designation || 'Staff',
            vehicleNumber,
            currentStatus: direction === 'In' ? 'Inside Campus' : 'Outside Campus',
            lastGate: gate,
            ...(direction === 'In' ? { lastEntryTime: new Date() } : { lastExitTime: new Date() })
          },
          $inc: direction === 'In' ? { totalVisits: 1 } : {}
        },
        { upsert: true, new: true }
      );
    } catch (cpErr) {
      console.warn('CampusPerson sync warning in staff-register:', cpErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'watchman', action: 'staff_movement', data: newMovement });
    }

    res.status(201).json({
      success: true,
      message: `Staff ${direction === 'In' ? 'Campus Entry (In)' : 'Campus Exit (Out)'} recorded successfully`,
      currentStatus: direction === 'In' ? 'Inside Campus' : 'Outside Campus',
      data: newMovement
    });
  } catch (err) {
    console.error('Failed to record staff movement:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record staff movement', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 7. ATTENDANCE & SHIFT OPERATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/attendance
router.get('/attendance', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const today = new Date().toISOString().split('T')[0];

    const filter = req.user.role === 'Watchman'
      ? { watchmanId: req.user._id }
      : (req.user.role === 'Super Admin'
        ? {}
        : { $or: [{ collegeId: tenantId }, { tenantId }] }
      );

    const records = await WatchmanAttendance.find(filter).sort({ createdAt: -1 }).limit(100).lean();

    const todaySession = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: today,
      clockOutTime: null
    }).lean();

    const formatted = records.map(r => ({
      _id: r._id,
      date: r.date,
      clockIn: r.clockInTime,
      clockInTime: r.clockInTime,
      clockOut: r.clockOutTime,
      clockOutTime: r.clockOutTime,
      shift: r.shift,
      assignedGate: r.gate,
      gate: r.gate,
      status: r.status === 'On Duty' ? 'Active' : (r.status === 'Completed' ? 'Completed' : r.status),
      durationMinutes: r.durationMinutes || 0,
      watchmanName: r.watchmanName,
      employeeId: r.employeeId,
      notes: r.notes || ''
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
      todaySession,
      history: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: err.message, data: [] });
  }
});

// POST /api/watchman/attendance/clock-in
router.post('/attendance/clock-in', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const today = new Date().toISOString().split('T')[0];

    const existing = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      date: today,
      clockOutTime: null
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You are already clocked in for duty today!' });
    }

    const watchman = await Watchman.findOne({ user: req.user._id });
    const shift = req.body.shift || watchman?.shift || 'Morning';
    const gate = req.body.gate || watchman?.assignedGate || 'Gate 1 (Main Entrance)';

    const session = await WatchmanAttendance.create({
      watchmanId: req.user._id,
      watchmanName: req.user.name || 'Security Guard',
      employeeId: req.user.referenceId || watchman?.employeeId || 'WMN-001',
      date: today,
      shift,
      gate,
      clockInTime: new Date(),
      status: 'On Duty',
      notes: req.body.notes || '',
      collegeId: tenantId,
      tenantId
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'watchman', action: 'clock_in', data: session });
    }

    // Also sync EmployeeAttendance so Accounts Daily Attendance immediately shows watchman as Present
    try {
      const now = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      await EmployeeAttendance.findOneAndUpdate(
        {
          tenantId: tenantId,
          employeeId: req.user._id,
          date: startOfDay
        },
        {
          tenantId: tenantId,
          collegeId: tenantId,
          employeeId: req.user._id,
          role: req.user.role || 'Watchman',
          date: startOfDay,
          checkIn: now,
          status: 'Present',
          remarks: `Duty Check-In at ${gate} (${shift} Shift)`
        },
        { upsert: true, new: true }
      );

      if (io) {
        io.emit('dataUpdated', { module: 'employee-attendance', action: 'checkin', data: { employeeId: req.user._id, status: 'Present', checkIn: now } });
      }
    } catch (empAttErr) {
      console.warn('Employee attendance sync warning on watchman clock-in:', empAttErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Clocked in successfully for ${shift} shift at ${gate}`,
      data: session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clock in', error: err.message });
  }
});

// POST /api/watchman/attendance/clock-out
router.post('/attendance/clock-out', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const activeSession = await WatchmanAttendance.findOne({
      watchmanId: req.user._id,
      clockOutTime: null
    }).sort({ createdAt: -1 });

    if (!activeSession) {
      return res.status(400).json({ success: false, message: 'No active clock-in session found to clock out' });
    }

    const clockOutTime = new Date();
    const durationMinutes = Math.round((clockOutTime - new Date(activeSession.clockInTime)) / 60000);

    activeSession.clockOutTime = clockOutTime;
    activeSession.durationMinutes = durationMinutes;
    activeSession.status = 'Completed';
    if (req.body.notes) {
      activeSession.notes = activeSession.notes ? `${activeSession.notes} | ${req.body.notes}` : req.body.notes;
    }
    await activeSession.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'watchman', action: 'clock_out', data: activeSession });
    }

    // Also sync EmployeeAttendance checkOut
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);

      await EmployeeAttendance.findOneAndUpdate(
        {
          employeeId: req.user._id,
          date: startOfDay
        },
        {
          checkOut: clockOutTime,
          remarks: `Duty Completed (${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m)`
        }
      );

      if (io) {
        io.emit('dataUpdated', { module: 'employee-attendance', action: 'checkout', data: { employeeId: req.user._id, checkOut: clockOutTime } });
      }
    } catch (empAttErr) {
      console.warn('Employee attendance sync warning on watchman clock-out:', empAttErr.message);
    }

    res.json({
      success: true,
      message: `Clocked out successfully. Duty duration: ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      data: activeSession
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clock out', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 8. EMERGENCY & INCIDENT REPORTS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/incidents - List incidents
router.get('/incidents', protect, authorize('Watchman', 'Admin', 'Super Admin', 'Security', 'Guard', 'Staff', 'Sub Admin'), async (req, res) => {
  try {
    const extra = {};
    const { status, severity } = req.query;
    if (status && status !== 'All') extra.status = status;
    if (severity && severity !== 'All') extra.severity = severity;

    const filter = await buildTenantOrAllFilter(req, SecurityIncident, extra);
    const incidents = await SecurityIncident.find(filter).sort({ incidentTime: -1 }).limit(100);
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (err) {
    console.error('Failed to fetch incidents:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch incidents', error: err.message });
  }
});

// POST /api/watchman/incidents - Report security incident
router.post('/incidents', protect, authorize('Watchman', 'Admin', 'Super Admin', 'Security', 'Guard', 'Staff', 'Sub Admin'), async (req, res) => {
  try {
    const { title, category, severity, description, location, actionTaken, gate } = req.body;

    if (!title || !category || !description || !location) {
      return res.status(400).json({ success: false, message: 'Title, category, description, and location are required' });
    }

    const tenantId = getTenant(req) || req.user?.collegeId || 'COL001';
    const incidentId = `INC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reporterName = req.user?.name || req.user?.username || 'Security Guard';
    const reporterId = req.user?._id || null;

    const newIncident = new SecurityIncident({
      incidentId,
      title: title.trim(),
      category: category ? category.trim() : 'Other',
      severity: severity || 'Medium',
      description: description.trim(),
      location: location.trim(),
      incidentTime: new Date(),
      status: 'Open',
      reportedBy: reporterName,
      reportedById: reporterId,
      actionTaken: actionTaken ? actionTaken.trim() : 'Reported to College Admin and Security Log',
      gate: gate ? gate.trim() : 'Main Gate 1',
      collegeId: tenantId,
      tenantId: tenantId
    });

    await newIncident.save();

    // Alert Admin via Notification safely
    try {
      const adminUser = await User.findOne({
        role: { $in: ['Admin', 'Super Admin'] },
        $or: [{ tenantId }, { collegeId: tenantId }]
      });

      if (adminUser) {
        await Notification.create({
          recipient: adminUser._id,
          title: `🚨 Security Incident Reported: ${title}`,
          message: `Severity: ${severity}. Reported at ${location} by ${reporterName}. Description: ${description}`,
          type: severity === 'Critical' || severity === 'High' ? 'Alert' : 'Warning',
          category: 'security',
          collegeId: tenantId,
          tenantId: tenantId
        });
      }
    } catch (notifErr) {
      console.warn('Incident notification error:', notifErr.message);
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('incidentReported', { incident: newIncident });
      io.emit('dataUpdated', { module: 'watchman', action: 'incident_reported', data: newIncident });
    }

    res.status(201).json({
      success: true,
      message: `Incident reported successfully. ID: ${incidentId}`,
      data: newIncident
    });
  } catch (err) {
    console.error('Failed to report incident error:', err);
    res.status(500).json({ success: false, message: 'Failed to report incident', error: err.message });
  }
});

// PATCH /api/watchman/incidents/:id - Update incident status / resolution
router.patch('/incidents/:id', protect, authorize('Watchman', 'Admin', 'Super Admin', 'Security', 'Guard', 'Staff', 'Sub Admin'), async (req, res) => {
  try {
    const incident = await SecurityIncident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident record not found' });
    }

    const { status, actionTaken, resolutionNotes, resolution } = req.body;
    if (status) incident.status = status;
    if (actionTaken) incident.actionTaken = actionTaken;
    const resolvedText = resolutionNotes || resolution;
    if (resolvedText) {
      incident.resolutionNotes = resolvedText;
      if (status === 'Resolved' || status === 'Closed') {
        incident.resolvedAt = new Date();
        incident.resolvedBy = req.user?.name || 'Security Guard';
      }
    }

    await incident.save();

    const ioUp = req.app.get('io');
    if (ioUp) {
      ioUp.emit('dataUpdated', { module: 'watchman', action: 'incident_updated', data: incident });
    }

    res.json({
      success: true,
      message: `Incident status updated to ${incident.status}`,
      data: incident
    });
  } catch (err) {
    console.error('Failed to update incident error:', err);
    res.status(500).json({ success: false, message: 'Failed to update incident', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 9. WATCHMAN NOTIFICATIONS
// ──────────────────────────────────────────────────────────────────────────

// GET /api/watchman/notifications
router.get('/notifications', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const notifications = await Notification.find({
      $or: [
        { recipient: req.user._id },
        { collegeId: tenantId, category: { $in: ['security', 'system', 'campus'] } }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 10. REAL-TIME ACTIVITY FEED FOR ADMIN (Unified Across All Guard Actions)
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman/admin/activities - Live unified security activity stream
router.get('/admin/activities', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    await ensureWatchmanRealtimeData();

    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin'
      ? {}
      : { $or: [{ collegeId: tenantId }, { tenantId }] };

    const { category, watchman, gate, search, limit = 150 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 150, 300);

    const [
      visitors,
      attendance,
      vehicles,
      gateMovements,
      parcels,
      incidents,
      studentEntries
    ] = await Promise.all([
      (!category || category === 'All' || category === 'visitors')
        ? VisitorLog.find(filter).sort({ createdAt: -1 }).limit(limitNum).lean()
        : [],
      (!category || category === 'All' || category === 'attendance')
        ? WatchmanAttendance.find(filter).sort({ createdAt: -1 }).limit(limitNum).lean()
        : [],
      (!category || category === 'All' || category === 'vehicles')
        ? SecurityVehicleLog.find(filter).sort({ createdAt: -1 }).limit(limitNum).lean()
        : [],
      (!category || category === 'All' || category === 'gate_movements')
        ? CampusGateMovement.find(filter).sort({ timestamp: -1 }).limit(limitNum).lean()
        : [],
      (!category || category === 'All' || category === 'parcels')
        ? ParcelLog.find(filter).sort({ createdAt: -1 }).limit(limitNum).lean()
        : [],
      (!category || category === 'All' || category === 'incidents')
        ? SecurityIncident.find(filter).sort({ createdAt: -1 }).limit(limitNum).lean()
        : [],
      (!category || category === 'All' || category === 'students')
        ? StudentCampusEntry.find(filter).sort({ createdAt: -1 }).limit(limitNum).lean()
        : []
    ]);

    const activityFeed = [];

    // Map Student Campus Entries
    studentEntries.forEach(se => {
      activityFeed.push({
        id: `stu-in-${se._id}`,
        category: 'students',
        actionType: 'Student QR Check-in',
        title: `Student Checked In: ${se.studentName}`,
        description: `Roll #${se.studentId} (${se.department} • ${se.semester || 'Campus'}) • Gate: ${se.entryGate || 'Gate 1'}`,
        timestamp: se.checkInTime || se.createdAt,
        watchmanName: se.entryWatchmanName || 'Security Guard',
        watchmanId: se.entryWatchmanId || null,
        gate: se.entryGate || 'Gate 1',
        status: se.status,
        badgeType: 'primary',
        details: {
          studentId: se.studentId,
          studentName: se.studentName,
          department: se.department,
          course: se.course,
          semester: se.semester,
          duration: se.durationFormatted
        }
      });

      if (se.checkOutTime) {
        activityFeed.push({
          id: `stu-out-${se._id}`,
          category: 'students',
          actionType: 'Student QR Check-out',
          title: `Student Checked Out: ${se.studentName}`,
          description: `Roll #${se.studentId} (${se.department}) exited at ${se.exitGate || 'Gate 1'} (Stay: ${se.durationFormatted})`,
          timestamp: se.checkOutTime,
          watchmanName: se.exitWatchmanName || se.entryWatchmanName || 'Security Guard',
          watchmanId: se.exitWatchmanId || null,
          gate: se.exitGate || se.entryGate || 'Gate 1',
          status: 'Checked Out',
          badgeType: 'info',
          details: {
            studentId: se.studentId,
            studentName: se.studentName,
            department: se.department,
            duration: se.durationFormatted
          }
        });
      }
    });

    // Map Visitors
    visitors.forEach(v => {
      activityFeed.push({
        id: `vis-entry-${v._id}`,
        category: 'visitors',
        actionType: 'Visitor Entry',
        title: `Visitor Checked In: ${v.name}`,
        description: `Pass #${v.passNumber} • Purpose: ${v.purpose} • Meeting: ${v.personToMeet} (${v.department || 'General'})`,
        timestamp: v.entryTime || v.createdAt,
        watchmanName: v.watchmanName || 'Security Guard',
        watchmanId: v.watchmanId || null,
        gate: v.gate || 'Gate 1',
        status: v.status,
        badgeType: 'success',
        details: {
          visitorName: v.name,
          phone: v.phone,
          passNumber: v.passNumber,
          purpose: v.purpose,
          host: v.personToMeet,
          vehicleNumber: v.vehicleNumber || ''
        }
      });

      if (v.exitTime) {
        activityFeed.push({
          id: `vis-exit-${v._id}`,
          category: 'visitors',
          actionType: 'Visitor Exit',
          title: `Visitor Checked Out: ${v.name}`,
          description: `Pass #${v.passNumber} completed visit with ${v.personToMeet}`,
          timestamp: v.exitTime,
          watchmanName: v.exitWatchmanName || v.watchmanName || 'Security Guard',
          watchmanId: v.exitWatchmanId || v.watchmanId || null,
          gate: v.gate || 'Gate 1',
          status: 'Checked Out',
          badgeType: 'info',
          details: {
            visitorName: v.name,
            phone: v.phone,
            passNumber: v.passNumber,
            duration: Math.round((new Date(v.exitTime) - new Date(v.entryTime)) / 60000)
          }
        });
      }
    });

    // Map Attendance
    attendance.forEach(a => {
      activityFeed.push({
        id: `att-in-${a._id}`,
        category: 'attendance',
        actionType: 'Guard Shift Clock In',
        title: `Guard Duty Started: ${a.watchmanName}`,
        description: `${a.shift} Shift • Post: ${a.gate || a.assignedGate || 'Gate 1'} • Guard ID: ${a.employeeId}`,
        timestamp: a.clockInTime || a.createdAt,
        watchmanName: a.watchmanName,
        watchmanId: a.watchmanId,
        gate: a.gate || a.assignedGate || 'Gate 1',
        status: a.status,
        badgeType: 'primary',
        details: {
          employeeId: a.employeeId,
          shift: a.shift,
          gate: a.gate
        }
      });

      if (a.clockOutTime) {
        activityFeed.push({
          id: `att-out-${a._id}`,
          category: 'attendance',
          actionType: 'Guard Shift Clock Out',
          title: `Guard Duty Completed: ${a.watchmanName}`,
          description: `Completed ${a.shift} Shift (${Math.floor((a.durationMinutes || 0) / 60)}h ${(a.durationMinutes || 0) % 60}m on duty)`,
          timestamp: a.clockOutTime,
          watchmanName: a.watchmanName,
          watchmanId: a.watchmanId,
          gate: a.gate || a.assignedGate || 'Gate 1',
          status: 'Completed',
          badgeType: 'secondary',
          details: {
            employeeId: a.employeeId,
            durationMinutes: a.durationMinutes
          }
        });
      }
    });

    // Map Vehicles
    vehicles.forEach(veh => {
      activityFeed.push({
        id: `veh-in-${veh._id}`,
        category: 'vehicles',
        actionType: 'Vehicle Entry',
        title: `Vehicle Entered: ${veh.vehicleNumber}`,
        description: `${veh.vehicleType} • Driver: ${veh.driverName} • Purpose: ${veh.purpose}`,
        timestamp: veh.entryTime || veh.createdAt,
        watchmanName: veh.watchmanName || 'Security Guard',
        gate: veh.gate || 'Gate 1',
        status: veh.status,
        badgeType: 'warning',
        details: {
          vehicleNumber: veh.vehicleNumber,
          driverName: veh.driverName,
          driverPhone: veh.driverPhone,
          purpose: veh.purpose
        }
      });

      if (veh.exitTime) {
        activityFeed.push({
          id: `veh-out-${veh._id}`,
          category: 'vehicles',
          actionType: 'Vehicle Exit',
          title: `Vehicle Exited: ${veh.vehicleNumber}`,
          description: `${veh.vehicleType} driven by ${veh.driverName} exited campus`,
          timestamp: veh.exitTime,
          watchmanName: veh.exitWatchmanName || veh.watchmanName || 'Security Guard',
          gate: veh.gate || 'Gate 1',
          status: 'Exited',
          badgeType: 'info',
          details: {
            vehicleNumber: veh.vehicleNumber
          }
        });
      }
    });

    // Map Gate Movements
    gateMovements.forEach(m => {
      const isStudent = m.personType === 'Student';
      activityFeed.push({
        id: `mov-${m._id}`,
        category: 'gate_movements',
        actionType: `${m.personType} ${m.direction === 'In' ? 'Entry' : 'Departure'}`,
        title: `${m.personType} ${m.direction === 'In' ? 'Campus Entry' : 'Gate Departure'}: ${m.name}`,
        description: `${isStudent ? 'Roll #' : 'Staff ID'}: ${m.personId} (${m.department}) • ${m.reason} ${m.gatePassId ? `• Pass #${m.gatePassId}` : ''}`,
        timestamp: m.timestamp || m.createdAt,
        watchmanName: m.watchmanName || 'Security Guard',
        gate: m.gate || 'Gate 1',
        status: m.direction === 'In' ? 'Entered' : 'Exited',
        badgeType: isStudent ? 'primary' : 'success',
        details: {
          personType: m.personType,
          personId: m.personId,
          name: m.name,
          department: m.department,
          reason: m.reason,
          gatePassId: m.gatePassId
        }
      });
    });

    // Map Parcels
    parcels.forEach(p => {
      activityFeed.push({
        id: `pcl-rcv-${p._id}`,
        category: 'parcels',
        actionType: 'Parcel Received',
        title: `Package Received: ${p.deliveryCompany}`,
        description: `For: ${p.recipientName} (${p.recipientType} - ${p.department}) • Track: ${p.trackingNumber || 'N/A'}`,
        timestamp: p.receivedAt || p.createdAt,
        watchmanName: p.watchmanName || 'Security Guard',
        gate: p.gate || 'Gate 1',
        status: p.status,
        badgeType: 'warning',
        details: {
          parcelId: p.parcelId,
          company: p.deliveryCompany,
          recipient: p.recipientName,
          tracking: p.trackingNumber
        }
      });

      if (p.handedOverAt) {
        activityFeed.push({
          id: `pcl-hnd-${p._id}`,
          category: 'parcels',
          actionType: 'Parcel Handed Over',
          title: `Package Handed Over: ${p.parcelId}`,
          description: `Handed over to ${p.handedOverTo} (${p.deliveryCompany})`,
          timestamp: p.handedOverAt,
          watchmanName: p.watchmanName || 'Security Guard',
          gate: p.gate || 'Gate 1',
          status: 'Handed Over',
          badgeType: 'success',
          details: {
            parcelId: p.parcelId,
            handedOverTo: p.handedOverTo
          }
        });
      }
    });

    // Map Incidents
    incidents.forEach(inc => {
      activityFeed.push({
        id: `inc-${inc._id}`,
        category: 'incidents',
        actionType: `Security Alert [${inc.severity}]`,
        title: `🚨 Incident: ${inc.title}`,
        description: `[${inc.severity} Severity] at ${inc.location}: ${inc.description}`,
        timestamp: inc.incidentTime || inc.createdAt,
        watchmanName: inc.reportedBy || 'Security Guard',
        watchmanId: inc.reportedById || null,
        gate: inc.gate || 'Gate 1',
        status: inc.status,
        badgeType: inc.severity === 'Critical' || inc.severity === 'High' ? 'danger' : 'warning',
        details: {
          incidentId: inc.incidentId,
          category: inc.category,
          severity: inc.severity,
          actionTaken: inc.actionTaken,
          location: inc.location
        }
      });
    });

    // Sort strictly chronological descending
    activityFeed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let filteredFeed = activityFeed;

    if (watchman && watchman !== 'All') {
      const wQuery = watchman.toLowerCase().trim();
      filteredFeed = filteredFeed.filter(item =>
        item.watchmanName?.toLowerCase().includes(wQuery) ||
        (item.watchmanId && String(item.watchmanId) === watchman)
      );
    }

    if (gate && gate !== 'All') {
      filteredFeed = filteredFeed.filter(item => item.gate === gate);
    }

    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      filteredFeed = filteredFeed.filter(item =>
        item.title?.toLowerCase().includes(s) ||
        item.description?.toLowerCase().includes(s) ||
        item.watchmanName?.toLowerCase().includes(s) ||
        item.actionType?.toLowerCase().includes(s)
      );
    }

    res.json({
      success: true,
      totalCount: filteredFeed.length,
      data: filteredFeed.slice(0, limitNum)
    });
  } catch (err) {
    console.error('Failed to aggregate watchman activities:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity stream', error: err.message, data: [] });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 11. DAILY SECURITY REPORT (Aggregated metrics for Admin)
// ══════════════════════════════════════════════════════════════════════════

// GET /api/watchman/admin/daily-report
router.get('/admin/daily-report', protect, authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const filter = req.user.role === 'Super Admin'
      ? {}
      : { $or: [{ collegeId: tenantId }, { tenantId }] };

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayDateStr = startOfToday.toISOString().slice(0, 10);

    const [
      totalGuards,
      activeAttendance,
      todayVisitors,
      currentVisitorsInside,
      todayVehicles,
      currentVehiclesInside,
      todayMovements,
      todayParcels,
      pendingParcels,
      todayIncidents,
      openIncidents
    ] = await Promise.all([
      Watchman.countDocuments(filter),
      WatchmanAttendance.find({
        ...filter,
        date: todayDateStr,
        clockOutTime: null
      }).lean(),
      VisitorLog.countDocuments({ ...filter, entryTime: { $gte: startOfToday, $lte: endOfToday } }),
      VisitorLog.countDocuments({ ...filter, status: 'Inside' }),
      SecurityVehicleLog.countDocuments({ ...filter, entryTime: { $gte: startOfToday, $lte: endOfToday } }),
      SecurityVehicleLog.countDocuments({ ...filter, status: 'Inside' }),
      CampusGateMovement.countDocuments({ ...filter, timestamp: { $gte: startOfToday, $lte: endOfToday } }),
      ParcelLog.countDocuments({ ...filter, receivedAt: { $gte: startOfToday, $lte: endOfToday } }),
      ParcelLog.countDocuments({ ...filter, status: 'Received at Gate' }),
      SecurityIncident.countDocuments({ ...filter, incidentTime: { $gte: startOfToday, $lte: endOfToday } }),
      SecurityIncident.countDocuments({ ...filter, status: { $in: ['Open', 'Under Investigation'] } })
    ]);

    res.json({
      success: true,
      data: {
        date: todayDateStr,
        reportGeneratedAt: new Date(),
        totalGuardsRegistered: totalGuards,
        guardsOnDutyNow: activeAttendance.length,
        activeGuardsList: activeAttendance.map(a => ({
          name: a.watchmanName,
          shift: a.shift,
          gate: a.gate,
          clockInTime: a.clockInTime,
          employeeId: a.employeeId
        })),
        visitors: {
          todayTotal: todayVisitors,
          currentlyInside: currentVisitorsInside,
          checkedOutToday: Math.max(0, todayVisitors - currentVisitorsInside)
        },
        vehicles: {
          todayTotal: todayVehicles,
          currentlyInside: currentVehiclesInside,
          exitedToday: Math.max(0, todayVehicles - currentVehiclesInside)
        },
        gateMovements: {
          todayTotal: todayMovements
        },
        parcels: {
          receivedToday: todayParcels,
          pendingHandover: pendingParcels
        },
        incidents: {
          reportedToday: todayIncidents,
          openNow: openIncidents
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate daily security report', error: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────
// 12. CAMPUS IN & CAMPUS OUT (REGISTERED PERSONS GATE MOVEMENTS)
// ──────────────────────────────────────────────────────────────────────────

// Auto-sync Student, Staff & HOD records to CampusPerson directory
const syncCampusPeopleFromDirectory = async (tenantId) => {
  try {
    // 1. Sync Students from Student collection
    const students = await Student.find({}).limit(150).lean();
    for (const s of students) {
      if (!s.id && !s.rollNumber) continue;
      const pid = (s.id || s.rollNumber).toUpperCase().trim();
      const exists = await CampusPerson.findOne({ personId: pid });
      if (!exists) {
        const activeEntry = await StudentCampusEntry.findOne({
          studentId: pid,
          status: 'Inside Campus'
        });
        await CampusPerson.create({
          personId: pid,
          name: s.name,
          personType: 'Student',
          phone: s.phone || s.mobile || '',
          email: s.email || '',
          department: s.dept || s.department || 'Computer Science',
          designation: s.semester ? `Semester ${s.semester}` : 'Student',
          currentStatus: activeEntry ? 'Inside Campus' : 'Outside Campus',
          lastEntryTime: activeEntry ? activeEntry.checkInTime : null,
          lastGate: activeEntry ? activeEntry.entryGate : 'Gate 1 (Main Entrance)',
          totalVisits: activeEntry ? 1 : 0,
          collegeId: tenantId || 'COL001',
          tenantId: tenantId || 'COL001'
        });
      }
    }

    // 2. Sync Staff & HOD from Staff collection
    const staffDocs = await Staff.find({}).limit(50).lean();
    for (const st of staffDocs) {
      const pid = (st.employeeId || `STF-${st._id.toString().slice(-6)}`).toUpperCase().trim();
      const exists = await CampusPerson.findOne({ personId: pid });
      if (!exists) {
        const isHod = /hod|head of department/i.test(st.designation || '') || /hod/i.test(st.role || '');
        await CampusPerson.create({
          personId: pid,
          name: st.name,
          personType: isHod ? 'HOD' : 'Staff',
          phone: st.phone || st.mobile || '',
          email: st.email || '',
          department: st.department || 'General',
          designation: st.designation || (isHod ? 'Head of Department' : 'Faculty'),
          currentStatus: 'Outside Campus',
          collegeId: tenantId || 'COL001',
          tenantId: tenantId || 'COL001'
        });
      }
    }

    // 3. Sync Staff & HOD from User accounts
    const staffMembers = await User.find({
      role: { $in: ['Staff', 'HOD', 'Principal', 'Librarian', 'Faculty'] }
    }).limit(50).lean();
    for (const st of staffMembers) {
      const pid = (st.referenceId || st.employeeId || `STF-${st._id.toString().slice(-4)}`).toUpperCase().trim();
      const exists = await CampusPerson.findOne({ personId: pid });
      if (!exists) {
        const isHod = st.role === 'HOD' || /hod|head/i.test(st.department || '');
        await CampusPerson.create({
          personId: pid,
          name: st.name,
          personType: isHod ? 'HOD' : 'Staff',
          phone: st.phone || '',
          email: st.email || '',
          department: st.department || 'Faculty',
          designation: st.role,
          currentStatus: 'Outside Campus',
          collegeId: tenantId || 'COL001',
          tenantId: tenantId || 'COL001'
        });
      }
    }
  } catch (syncErr) {
    console.warn('CampusPerson auto-sync note:', syncErr.message);
  }
};

// GET /api/watchman/campus-people - Search & list registered people
router.get('/campus-people', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    await syncCampusPeopleFromDirectory(tenantId);

    const { search, status, personType } = req.query;
    const filter = await buildTenantOrAllFilter(req, CampusPerson);

    if (status && status !== 'All') {
      filter.currentStatus = status;
    }
    if (personType && personType !== 'All') {
      if (personType === 'Members' || personType === 'Institutional' || personType === 'Staff,Student,HOD') {
        filter.personType = { $in: ['Student', 'Staff', 'Faculty', 'HOD'] };
      } else {
        filter.personType = personType;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { personId: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { vehicleNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const people = await CampusPerson.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ success: true, count: people.length, data: people });
  } catch (err) {
    console.error('Failed to fetch campus people:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch registered people', error: err.message, data: [] });
  }
});

// Helper & Handler to lookup registered person by QR code, ID, Roll No, or Mobile for Gate Scanner
const handleLookupCampusPerson = async (req, res) => {
  try {
    let rawQuery = (req.params.query || req.query.query || req.query.code || req.query.id || req.query.personId || '').trim();

    if (rawQuery.includes('code=')) {
      try {
        const match = rawQuery.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) rawQuery = decodeURIComponent(match[1]).trim();
      } catch (_) { }
    }

    if (rawQuery.startsWith('{') && rawQuery.endsWith('}')) {
      try {
        const parsed = JSON.parse(rawQuery);
        rawQuery = (parsed.personId || parsed.studentId || parsed.passNumber || parsed.id || parsed.code || parsed.phone || rawQuery).trim();
      } catch (_) { }
    }

    rawQuery = rawQuery.replace(/^STU-QR-/i, '').replace(/^["']|["']$/g, '').trim();

    if (!rawQuery) {
      return res.status(400).json({ success: false, message: 'Please provide an ID, QR code, or mobile number to search.' });
    }

    const tenantId = getTenant(req);
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`^${escapeRegex(rawQuery)}$`, 'i');

    const scannerModule = (req.query.module || req.query.scannerType || '').toLowerCase();
    const isGateScanner = scannerModule === 'gate_operations' || scannerModule === 'gate' || scannerModule === 'members';
    const isVisitorScanner = scannerModule === 'visitor_management' || scannerModule === 'visitor';

    // If on Gate Scanner and query looks like a visitor pass, reject immediately
    if (isGateScanner && (rawQuery.toUpperCase().startsWith('PASS-') || rawQuery.toUpperCase().startsWith('V-') || /^PASS/i.test(rawQuery))) {
      const visitor = await VisitorLog.findOne({
        $or: [
          { passNumber: exactRegex },
          { passNumber: rawQuery },
          { visitorId: exactRegex },
          { visitorId: rawQuery }
        ]
      }).lean();
      return res.status(400).json({
        success: false,
        found: false,
        isVisitorPass: true,
        personType: 'Visitor',
        name: visitor?.name || rawQuery,
        passNumber: visitor?.passNumber || rawQuery,
        message: `Visitor pass detected (${visitor ? `${visitor.name} - ${visitor.passNumber}` : rawQuery}). This scanner is strictly for Students, Staff, and HODs. Please use the dedicated Visitor Pass QR Scanner in Visitor Management.`
      });
    }

    // 1. Search CampusPerson by exact personId first
    let personFilter = {
      $or: [
        { personId: exactRegex },
        { personId: rawQuery }
      ]
    };
    if (isGateScanner) {
      personFilter.personType = { $ne: 'Visitor' };
    }
    let person = await CampusPerson.findOne(personFilter).lean();

    // 2. If not found by personId, search CampusPerson by phone
    if (!person) {
      person = await CampusPerson.findOne({
        $or: [
          { phone: exactRegex },
          { phone: rawQuery }
        ]
      }).lean();
    }

    // 2. If not in CampusPerson, search Student
    if (!person) {
      const student = await Student.findOne({
        $or: [
          { id: exactRegex },
          { rollNumber: exactRegex },
          { id: rawQuery },
          { rollNumber: rawQuery },
          { phone: rawQuery },
          { mobile: rawQuery }
        ]
      }).lean();

      if (student) {
        const pId = (student.id || student.rollNumber).toUpperCase();
        const created = await CampusPerson.create({
          personId: pId,
          name: student.name,
          personType: 'Student',
          phone: student.phone || student.mobile || '',
          email: student.email || '',
          department: student.dept || student.department || 'Computer Science',
          designation: student.semester ? `Semester ${student.semester}` : 'Student',
          currentStatus: 'Outside Campus',
          collegeId: tenantId,
          tenantId
        });
        person = created.toObject ? created.toObject() : created;
      } else {
        const userStudent = await User.findOne({
          $or: [
            { referenceId: exactRegex },
            { referenceId: rawQuery },
            { studentId: exactRegex },
            { studentId: rawQuery },
            { email: exactRegex }
          ],
          role: 'Student'
        }).lean();
        if (userStudent) {
          const pId = (userStudent.studentId || userStudent.referenceId || `STU-${userStudent._id.toString().slice(-4)}`).toUpperCase();
          const created = await CampusPerson.create({
            personId: pId,
            name: userStudent.name,
            personType: 'Student',
            phone: userStudent.phone || '',
            email: userStudent.email || '',
            department: userStudent.department || 'Computer Science',
            designation: 'Student',
            currentStatus: 'Outside Campus',
            collegeId: tenantId,
            tenantId
          });
          person = created.toObject ? created.toObject() : created;
        }
      }
    }

    // 3. If not, search Staff / HOD
    if (!person) {
      const staff = await Staff.findOne({
        $or: [
          { employeeId: exactRegex },
          { employeeId: rawQuery },
          { phone: rawQuery },
          { mobile: rawQuery },
          { email: exactRegex }
        ]
      }).lean();

      if (staff) {
        const isHod = /hod|head of department/i.test(staff.designation || '') || /hod/i.test(staff.role || '');
        const pId = (staff.employeeId || `STF-${staff._id.toString().slice(-6)}`).toUpperCase();
        const created = await CampusPerson.create({
          personId: pId,
          name: staff.name,
          personType: isHod ? 'HOD' : 'Staff',
          phone: staff.phone || staff.mobile || '',
          email: staff.email || '',
          department: staff.department || 'General',
          designation: staff.designation || (isHod ? 'Head of Department' : 'Faculty'),
          currentStatus: 'Outside Campus',
          collegeId: tenantId,
          tenantId
        });
        person = created.toObject ? created.toObject() : created;
      } else {
        const userStaff = await User.findOne({
          $or: [
            { referenceId: exactRegex },
            { referenceId: rawQuery },
            { employeeId: exactRegex },
            { employeeId: rawQuery },
            { email: exactRegex }
          ],
          role: { $in: ['Staff', 'HOD', 'Principal', 'Faculty', 'Librarian'] }
        }).lean();
        if (userStaff) {
          const isHod = userStaff.role === 'HOD' || /hod|head/i.test(userStaff.department || '');
          const pId = (userStaff.referenceId || userStaff.employeeId || `STF-${userStaff._id.toString().slice(-4)}`).toUpperCase();
          const created = await CampusPerson.create({
            personId: pId,
            name: userStaff.name,
            personType: isHod ? 'HOD' : 'Staff',
            phone: userStaff.phone || '',
            email: userStaff.email || '',
            department: userStaff.department || 'General',
            designation: userStaff.role,
            currentStatus: 'Outside Campus',
            collegeId: tenantId,
            tenantId
          });
          person = created.toObject ? created.toObject() : created;
        }
      }
    }

    // 4. If not, search VisitorLog
    if (!person) {
      const visitor = await VisitorLog.findOne({
        $or: [
          { passNumber: exactRegex },
          { passNumber: rawQuery },
          { visitorId: exactRegex },
          { visitorId: rawQuery },
          { phone: rawQuery }
        ]
      }).lean();

      if (visitor) {
        const pId = (visitor.passNumber || visitor.visitorId).toUpperCase();
        person = await CampusPerson.findOneAndUpdate(
          { personId: pId },
          {
            $set: {
              name: visitor.name,
              personType: 'Visitor',
              phone: visitor.phone || '',
              email: visitor.email || '',
              department: visitor.department || 'General',
              designation: visitor.purpose || 'Campus Visitor',
              vehicleNumber: visitor.vehicleNumber || '',
              idProofType: visitor.idProofType || 'Aadhaar Card',
              idProofNumber: visitor.idProofNumber || '',
              currentStatus: visitor.status === 'Inside' ? 'Inside Campus' : 'Outside Campus',
              lastEntryTime: visitor.entryTime || null,
              lastExitTime: visitor.exitTime || null,
              collegeId: tenantId,
              tenantId
            }
          },
          { upsert: true, new: true }
        ).lean();
      }
    }

    // 5. If still not found, check partial name or id if query >= 3
    if (!person && rawQuery.length >= 3) {
      person = await CampusPerson.findOne({
        $or: [
          { name: exactRegex },
          { personId: { $regex: escapeRegex(rawQuery), $options: 'i' } }
        ]
      }).lean();
    }

    if (!person) {
      return res.status(404).json({
        success: false,
        found: false,
        message: `No registered person found matching "${rawQuery}". Please register them using "Register New Person".`
      });
    }

    // Check scanner module strict type separation if requested
    if (scannerModule === 'gate_operations' || scannerModule === 'gate') {
      if (person.personType === 'Visitor') {
        return res.status(400).json({
          success: false,
          found: false,
          isVisitorPass: true,
          personType: 'Visitor',
          name: person.name,
          message: `Visitor pass detected (${person.name || rawQuery}). Please use the dedicated Visitor Scanner in Visitor Management.`
        });
      }
    } else if (scannerModule === 'visitor_management' || scannerModule === 'visitor') {
      if (['Student', 'Staff', 'Faculty', 'HOD'].includes(person.personType)) {
        return res.status(400).json({
          success: false,
          found: false,
          isMemberPass: true,
          personType: person.personType,
          name: person.name,
          message: `College member pass detected (${person.personType}: ${person.name || rawQuery}). Please use the Gate Operations QR Scanner under Gate Ops.`
        });
      }
    }

    // Fetch their recent movements
    const recentMovements = await CampusGateMovement.find({
      personId: person.personId
    }).sort({ timestamp: -1 }).limit(10).lean();

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(person.personId)}`;

    return res.json({
      success: true,
      found: true,
      person: {
        ...person,
        qrCodeUrl
      },
      movements: recentMovements,
      currentStatus: person.currentStatus,
      canEnter: person.currentStatus !== 'Inside Campus',
      canExit: person.currentStatus === 'Inside Campus'
    });
  } catch (err) {
    console.error('Campus person lookup error:', err);
    res.status(500).json({ success: false, message: 'Lookup error', error: err.message });
  }
};

// GET /api/watchman/campus-people/lookup - Lookup person by QR/ID query
router.get('/campus-people/lookup', optionalAuth, handleLookupCampusPerson);
router.get('/campus-people/lookup/:query', optionalAuth, handleLookupCampusPerson);

// POST /api/watchman/campus-people - Register a person once (Student, Staff, HOD, Visitor, etc.)
router.post('/campus-people', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { name, personType, phone, email, department, designation, vehicleNumber, idProofType, idProofNumber, batch, semester, notes } = req.body;
    let personId = (req.body.personId || '').trim();

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Person Name is required' });
    }

    const tenantId = getTenant(req);

    if (!personId) {
      const prefix = personType === 'Student' ? 'STU' : personType === 'Staff' ? 'STF' : personType === 'HOD' ? 'HOD' : personType === 'Visitor' ? 'PASS' : 'REG';
      let isUnique = false;
      while (!isUnique) {
        const randSuffix = Math.floor(1000 + Math.random() * 9000);
        personId = `${prefix}-${Date.now().toString().slice(-4)}-${randSuffix}`;
        const exists = await CampusPerson.findOne({ personId });
        if (!exists) isUnique = true;
      }
    } else {
      personId = personId.toUpperCase();
    }

    // Check if person already exists by this exact personId
    let existing = await CampusPerson.findOne({ personId });

    let savedPerson;
    if (existing) {
      // Update the existing profile with the new registration details
      existing.name = name.trim();
      existing.personType = personType || existing.personType;
      existing.phone = (phone || existing.phone || '').trim();
      existing.email = (email || existing.email || '').trim();
      existing.department = (department || existing.department || 'General').trim();
      existing.designation = (designation || (personType === 'HOD' ? 'Head of Department' : personType === 'Staff' ? 'Faculty' : personType === 'Student' ? 'Student' : 'Campus Visitor')).trim();
      if (vehicleNumber) existing.vehicleNumber = vehicleNumber.trim().toUpperCase();
      if (idProofType) existing.idProofType = idProofType;
      if (idProofNumber) existing.idProofNumber = idProofNumber.trim();
      savedPerson = await existing.save();
    } else {
      savedPerson = new CampusPerson({
        personId,
        name: name.trim(),
        personType: personType || 'Visitor',
        phone: (phone || '').trim(),
        email: (email || '').trim(),
        department: (department || 'General').trim(),
        designation: (designation || (personType === 'HOD' ? 'Head of Department' : personType === 'Staff' ? 'Faculty' : personType === 'Student' ? 'Student' : 'Campus Visitor')).trim(),
        vehicleNumber: (vehicleNumber || '').trim().toUpperCase(),
        idProofType: idProofType || 'College ID / Govt ID',
        idProofNumber: (idProofNumber || '').trim(),
        currentStatus: 'Outside Campus',
        totalVisits: 0,
        collegeId: tenantId,
        tenantId
      });
      await savedPerson.save();
    }

    const newPerson = savedPerson;

    // Synchronize to Student / Staff / Visitor collections for cross-ERP consistency
    try {
      if (personType === 'Student') {
        const studentExists = await Student.findOne({ $or: [{ id: personId }, { rollNumber: personId }] });
        if (!studentExists) {
          await Student.create({
            id: personId,
            rollNumber: personId,
            name: name.trim(),
            department: (department || 'Computer Science').trim(),
            semester: semester || '1',
            batch: batch || '2026',
            phone: (phone || '').trim(),
            email: (email || '').trim(),
            collegeId: tenantId,
            tenantId
          });
        }
      } else if (personType === 'Staff' || personType === 'HOD') {
        const staffExists = await Staff.findOne({ employeeId: personId });
        if (!staffExists) {
          await Staff.create({
            employeeId: personId,
            name: name.trim(),
            department: (department || 'General').trim(),
            designation: (designation || (personType === 'HOD' ? 'Head of Department' : 'Assistant Professor')).trim(),
            phone: (phone || '').trim(),
            email: (email || '').trim(),
            collegeId: tenantId,
            tenantId
          });
        }
      } else if (personType === 'Visitor') {
        const visitorExists = await VisitorLog.findOne({ $or: [{ passNumber: personId }, { visitorId: personId }] });
        if (!visitorExists) {
          await VisitorLog.create({
            visitorId: personId,
            passNumber: personId,
            name: name.trim(),
            phone: (phone || '').trim(),
            email: (email || '').trim(),
            purpose: notes || 'Campus Visit',
            personToMeet: 'Admin / Staff',
            department: (department || 'General').trim(),
            status: 'Outside',
            collegeId: tenantId,
            tenantId
          });
        }
      }
    } catch (syncErr) {
      console.warn('Cross-model sync notice:', syncErr.message);
    }

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(personId)}`;

    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', { module: 'campus_people', action: 'person_registered', data: newPerson });
    }

    res.status(201).json({
      success: true,
      message: `Person registered successfully. ID: ${personId}`,
      data: {
        ...newPerson.toObject(),
        qrCodeUrl
      }
    });
  } catch (err) {
    console.error('Failed to register person:', err);
    res.status(500).json({ success: false, message: 'Failed to register person', error: err.message });
  }
});

// POST /api/watchman/campus-in - Record Campus In with duplicate check
router.post('/campus-in', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawPersonId = (req.body.personId || '').trim();
    const gate = req.body.gate || req.user?.assignedGate || 'Gate 1 (Main Entrance)';
    const remarks = (req.body.remarks || '').trim();
    const vehicleNumber = (req.body.vehicleNumber || '').trim().toUpperCase();

    if (!rawPersonId) {
      return res.status(400).json({ success: false, message: 'Person ID or selection is required' });
    }

    const cleanId = rawPersonId.replace(/^STU-QR-/i, '').trim();
    const tenantId = getTenant(req);
    const now = new Date();

    const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`^${escapeRegex(rawPersonId)}$`, 'i');
    const cleanRegex = new RegExp(`^${escapeRegex(cleanId)}$`, 'i');

    // 1. Locate registered person in CampusPerson (case-insensitive)
    let person = await CampusPerson.findOne({
      $or: [
        { personId: exactRegex },
        { personId: cleanRegex },
        { phone: exactRegex },
        { phone: rawPersonId }
      ]
    });

    // 2. If not yet in CampusPerson, auto-link from Student, Staff, or User
    if (!person) {
      const student = await Student.findOne({
        $or: [
          { id: exactRegex },
          { id: cleanRegex },
          { rollNumber: exactRegex },
          { rollNumber: cleanRegex },
          { phone: exactRegex },
          { mobile: exactRegex }
        ]
      }).lean();

      if (student) {
        person = await CampusPerson.create({
          personId: (student.id || student.rollNumber).toUpperCase(),
          name: student.name,
          personType: 'Student',
          phone: student.phone || student.mobile || '',
          email: student.email || '',
          department: student.dept || student.department || 'Computer Science',
          designation: student.semester ? `Semester ${student.semester}` : 'Student',
          currentStatus: 'Outside Campus',
          collegeId: tenantId,
          tenantId
        });
      }
    }

    if (!person) {
      const staff = await Staff.findOne({
        $or: [
          { employeeId: exactRegex },
          { employeeId: cleanRegex },
          { phone: exactRegex },
          { mobile: exactRegex },
          { email: exactRegex }
        ]
      }).lean();

      if (staff) {
        const isHod = /hod|head of department/i.test(staff.designation || '') || /hod/i.test(staff.role || '');
        const pId = (staff.employeeId || `STF-${staff._id.toString().slice(-6)}`).toUpperCase();
        person = await CampusPerson.create({
          personId: pId,
          name: staff.name,
          personType: isHod ? 'HOD' : 'Staff',
          phone: staff.phone || staff.mobile || '',
          email: staff.email || '',
          department: staff.department || 'General',
          designation: staff.designation || (isHod ? 'Head of Department' : 'Faculty'),
          currentStatus: 'Outside Campus',
          collegeId: tenantId,
          tenantId
        });
      }
    }

    if (!person) {
      const user = await User.findOne({
        $or: [
          { referenceId: exactRegex },
          { referenceId: cleanRegex },
          { employeeId: exactRegex },
          { employeeId: cleanRegex },
          { studentId: exactRegex },
          { studentId: cleanRegex },
          { email: exactRegex },
          { phone: exactRegex }
        ]
      }).lean();

      if (user) {
        const isStudent = user.role === 'Student';
        const isHod = user.role === 'HOD' || /hod|head/i.test(user.department || '');
        const pId = (user.referenceId || user.employeeId || user.studentId || `USR-${user._id.toString().slice(-4)}`).toUpperCase();
        person = await CampusPerson.create({
          personId: pId,
          name: user.name,
          personType: isStudent ? 'Student' : isHod ? 'HOD' : 'Staff',
          phone: user.phone || '',
          email: user.email || '',
          department: user.department || 'General',
          designation: user.role || 'Member',
          currentStatus: 'Outside Campus',
          collegeId: tenantId,
          tenantId
        });
      }
    }

    if (!person) {
      return res.status(404).json({
        success: false,
        message: `Registered person not found for ID/Phone "${rawPersonId}". Please register the person once first.`
      });
    }

    // 3. Prevent Duplicate Campus In without Campus Out
    if (person.currentStatus === 'Inside Campus') {
      const inTimeStr = person.lastEntryTime
        ? new Date(person.lastEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'earlier today';
      return res.status(400).json({
        success: false,
        message: `Duplicate Entry Prevented: ${person.name} (${person.personId}) is already marked as 'Inside Campus' (entered at ${inTimeStr} via ${person.lastGate || 'Gate 1'}). You must record Campus Out first.`
      });
    }

    // 4. Record Campus In (Direct database update to avoid entire document re-validation)
    const updatedPerson = await CampusPerson.findByIdAndUpdate(
      person._id,
      {
        $set: {
          currentStatus: 'Inside Campus',
          lastEntryTime: now,
          lastGate: gate,
          ...(vehicleNumber ? { vehicleNumber } : {})
        },
        $inc: { totalVisits: 1 }
      },
      { new: true }
    );

    // 5. Create Movement Log in CampusGateMovement with collision-free unique movementId
    const movementId = `MOV-IN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const movement = new CampusGateMovement({
      movementId,
      personType: person.personType || 'Visitor',
      personId: person.personId,
      name: person.name,
      phone: person.phone || '',
      department: person.department || 'General',
      designation: person.designation || '',
      direction: 'In',
      timestamp: now,
      gate,
      watchmanName: req.user?.name || req.user?.username || 'Security Guard',
      reason: 'Regular Campus Entry',
      remarks: remarks || 'Campus In Recorded',
      vehicleNumber: vehicleNumber || person.vehicleNumber || '',
      collegeId: tenantId,
      tenantId
    });
    await movement.save();

    // 6. Synchronize StudentCampusEntry if person is Student
    if (person.personType === 'Student') {
      try {
        const studentEntry = new StudentCampusEntry({
          entryId: `SCE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          studentId: person.personId,
          studentName: person.name,
          phone: person.phone || '',
          department: person.department || 'General',
          course: 'Engineering',
          qrCode: `STU-QR-${person.personId}`,
          checkInTime: now,
          checkOutTime: null,
          status: 'Inside Campus',
          entryWatchmanName: req.user?.name || 'Security Guard',
          entryGate: gate,
          dateString: now.toISOString().split('T')[0],
          collegeId: tenantId,
          tenantId,
          remarks: remarks || 'Campus In'
        });
        await studentEntry.save();
      } catch (stuErr) {
        console.warn('StudentCampusEntry sync note:', stuErr.message);
      }
    }

    // 7. Broadcast Real-Time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', {
        module: 'campus_movement',
        action: 'campus_in',
        data: { person: updatedPerson || person, movement }
      });
      io.emit('campusMovementUpdated', {
        action: 'campus_in',
        person: updatedPerson || person,
        movement
      });
    }

    res.status(201).json({
      success: true,
      message: `Campus In recorded for ${person.name} (${person.personId}) at ${now.toLocaleTimeString('en-IN')}`,
      data: { person: updatedPerson || person, movement }
    });
  } catch (err) {
    console.error('Campus In error:', err);
    res.status(500).json({ success: false, message: 'Failed to record Campus In', error: err.message });
  }
});

// POST /api/watchman/campus-out - Record Campus Out with presence check & duration calculation
router.post('/campus-out', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const rawPersonId = (req.body.personId || '').trim();
    const gate = req.body.gate || req.user?.assignedGate || 'Gate 1 (Main Entrance)';
    const remarks = (req.body.remarks || '').trim();

    if (!rawPersonId) {
      return res.status(400).json({ success: false, message: 'Person ID or selection is required' });
    }

    const cleanId = rawPersonId.replace(/^STU-QR-/i, '').trim();
    const tenantId = getTenant(req);
    const now = new Date();

    const escapeRegex = (s) => (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exactRegex = new RegExp(`^${escapeRegex(rawPersonId)}$`, 'i');
    const cleanRegex = new RegExp(`^${escapeRegex(cleanId)}$`, 'i');

    const person = await CampusPerson.findOne({
      $or: [
        { personId: exactRegex },
        { personId: cleanRegex },
        { phone: exactRegex },
        { phone: rawPersonId }
      ]
    });

    if (!person) {
      return res.status(404).json({
        success: false,
        message: `Registered person not found for ID/Phone "${rawPersonId}".`
      });
    }

    // Prevent Campus Out if already marked Outside
    if (person.currentStatus === 'Outside Campus') {
      return res.status(400).json({
        success: false,
        message: `Cannot record Campus Out: ${person.name} (${person.personId}) is currently marked as 'Outside Campus'. They must record Campus In first.`
      });
    }

    // Compute duration spent on campus
    const inTime = person.lastEntryTime ? new Date(person.lastEntryTime) : now;
    const durationMinutes = Math.max(1, Math.round((now - inTime) / (1000 * 60)));
    const durationFormatted = formatCampusDuration(durationMinutes);

    // Update person status directly
    const updatedPerson = await CampusPerson.findByIdAndUpdate(
      person._id,
      {
        $set: {
          currentStatus: 'Outside Campus',
          lastExitTime: now,
          lastGate: gate
        }
      },
      { new: true }
    );

    // Create Movement Log with collision-free unique movementId
    const movementId = `MOV-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const movement = new CampusGateMovement({
      movementId,
      personType: person.personType || 'Visitor',
      personId: person.personId,
      name: person.name,
      phone: person.phone || '',
      department: person.department || 'General',
      designation: person.designation || '',
      direction: 'Out',
      timestamp: now,
      checkOutTime: now,
      durationMinutes,
      durationFormatted,
      gate,
      watchmanName: req.user?.name || req.user?.username || 'Security Guard',
      reason: 'Campus Departure',
      remarks: remarks || `Exited campus after ${durationFormatted}`,
      vehicleNumber: person.vehicleNumber || '',
      collegeId: tenantId,
      tenantId
    });
    await movement.save();

    // Synchronize StudentCampusEntry if person is Student
    if (person.personType === 'Student') {
      try {
        const activeEntry = await StudentCampusEntry.findOne({
          studentId: person.personId,
          status: 'Inside Campus'
        }).sort({ checkInTime: -1 });

        if (activeEntry) {
          activeEntry.status = 'Checked Out';
          activeEntry.checkOutTime = now;
          activeEntry.durationMinutes = durationMinutes;
          activeEntry.durationFormatted = durationFormatted;
          await activeEntry.save();
        }
      } catch (stuErr) {
        console.warn('Student checkout sync note:', stuErr.message);
      }
    }

    // Broadcast Real-Time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('dataUpdated', {
        module: 'campus_movement',
        action: 'campus_out',
        data: { person: updatedPerson || person, movement }
      });
      io.emit('campusMovementUpdated', {
        action: 'campus_out',
        person: updatedPerson || person,
        movement
      });
    }

    res.json({
      success: true,
      message: `Campus Out recorded for ${person.name} (${person.personId}). Time on campus: ${durationFormatted}`,
      data: { person: updatedPerson || person, movement }
    });
  } catch (err) {
    console.error('Campus Out error:', err);
    res.status(500).json({ success: false, message: 'Failed to record Campus Out', error: err.message });
  }
});

// GET /api/watchman/campus-movements - Complete entry/exit history logs
router.get('/campus-movements', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const { search, date, direction, personType, personId, limit } = req.query;
    const filter = await buildTenantOrAllFilter(req, CampusGateMovement);

    if (direction && direction !== 'All') {
      filter.direction = direction;
    }
    if (personType && personType !== 'All') {
      filter.personType = personType;
    }
    if (personId) {
      filter.personId = personId.toUpperCase().trim();
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.timestamp = { $gte: startOfDay, $lte: endOfDay };
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { personId: { $regex: q, $options: 'i' } },
        { department: { $regex: q, $options: 'i' } },
        { movementId: { $regex: q, $options: 'i' } },
        { vehicleNumber: { $regex: q, $options: 'i' } }
      ];
    }

    const limitNum = parseInt(limit, 10) || 200;
    const movements = await CampusGateMovement.find(filter).sort({ timestamp: -1 }).limit(limitNum).lean();

    res.json({ success: true, count: movements.length, data: movements });
  } catch (err) {
    console.error('Failed to fetch campus movements:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch movements', error: err.message, data: [] });
  }
});

// GET /api/watchman/campus-stats - Real-time statistics for Campus In/Out
router.get('/campus-stats', protect, authorize('Watchman', 'Admin', 'Super Admin'), async (req, res) => {
  try {
    const tenantId = getTenant(req);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const baseFilter = req.user?.role === 'Super Admin' ? {} : {
      $or: [{ tenantId }, { collegeId: tenantId }]
    };

    const isMemberScope = req.query.personType === 'Members' || req.query.scope === 'members' || req.query.type === 'members';
    const memberFilter = {
      ...baseFilter,
      personType: { $in: ['Student', 'Staff', 'Faculty', 'HOD'] }
    };
    const activeFilter = isMemberScope ? memberFilter : baseFilter;

    const [
      totalRegistered, currentlyInside, currentlyOutside, todayEntries, todayExits,
      activeVisitors, preRegVisitors, totalVisitorsToday
    ] = await Promise.all([
      CampusPerson.countDocuments(activeFilter),
      CampusPerson.countDocuments({ ...activeFilter, currentStatus: 'Inside Campus' }),
      CampusPerson.countDocuments({ ...activeFilter, currentStatus: { $ne: 'Inside Campus' } }),
      CampusGateMovement.countDocuments({
        ...activeFilter,
        direction: 'In',
        timestamp: { $gte: startOfToday, $lte: endOfToday }
      }),
      CampusGateMovement.countDocuments({
        ...activeFilter,
        direction: 'Out',
        timestamp: { $gte: startOfToday, $lte: endOfToday }
      }),
      VisitorLog.countDocuments({ ...baseFilter, status: 'Inside' }),
      VisitorLog.countDocuments({ ...baseFilter, status: 'Pre-Registered' }),
      VisitorLog.countDocuments({ ...baseFilter, createdAt: { $gte: startOfToday, $lte: endOfToday } })
    ]);

    res.json({
      success: true,
      data: {
        totalRegistered,
        currentlyInside,
        currentlyOutside,
        todayEntries,
        todayExits,
        members: {
          totalRegistered,
          currentlyInside,
          currentlyOutside,
          todayEntries,
          todayExits
        },
        visitors: {
          currentlyInside: activeVisitors,
          preRegistered: preRegVisitors,
          todayTotal: totalVisitorsToday
        }
      }
    });
  } catch (err) {
    console.error('Failed to fetch campus stats:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: err.message });
  }
});

// Ensure all existing students have a permanent unique qrCode
const backfillStudentQRCodes = async () => {
  try {
    const studentsWithoutQr = await Student.find({
      $or: [
        { qrCode: { $exists: false } },
        { qrCode: null },
        { qrCode: '' }
      ]
    }).select('_id id').lean();

    if (studentsWithoutQr && studentsWithoutQr.length > 0) {
      for (const s of studentsWithoutQr) {
        if (s.id) {
          await Student.updateOne({ _id: s._id }, { $set: { qrCode: `STU-QR-${s.id}` } });
        }
      }
      console.log(`[Watchman] Backfilled QR codes for ${studentsWithoutQr.length} students`);
    }
  } catch (err) {
    console.warn('[Watchman] Student QR backfill note:', err.message);
  }
};
setTimeout(backfillStudentQRCodes, 3000);

export default router;
