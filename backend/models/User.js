import mongoose from 'mongoose';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Super Admin', 'Admin', 'Sub Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent', 'Accounts', 'Driver'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  tenantId: {
    type: String,
    default: null // Will link users to a specific College (e.g. 'COL123')
  },
  collegeId: {
    type: String,
    default: null
  },
  phone: {
    type: String,
    default: null
  },
  department: {
    type: String,
    default: null  // For HOD/Staff: their assigned department (e.g. 'Computer Science')
  },
  referenceId: {
    type: String,
    default: null  // For Staff: their Staff ID (e.g. 'STF001'). For Student: their Reg No.
  },
  studentId: {
    type: String,
    default: null  // For Student users: their own student registration number
  },
  parentOf: {
    type: String,
    default: null  // For Parent users: the student ID of their child (e.g. 'CS2022001')
  },
  subjects: {
    type: [String],
    default: []    // For Staff users: array of subjects they teach
  },
  permissions: {
    type: [String],
    default: []    // For Sub Admin: array of accessible modules (e.g., 'students', 'staff', 'attendance')
  }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
