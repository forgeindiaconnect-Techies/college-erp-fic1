import mongoose from 'mongoose';

const employeeAttendanceSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  collegeId: {
    type: String,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    default: 'Present'
  },
  remarks: {
    type: String
  }
}, { timestamps: true });

// Ensure only one attendance record per employee per day
employeeAttendanceSchema.index({ tenantId: 1, employeeId: 1, date: 1 }, { unique: true });

const EmployeeAttendance = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);

export default EmployeeAttendance;
