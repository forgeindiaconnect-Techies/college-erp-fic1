import mongoose from 'mongoose';

const transportStudentAttendanceSchema = new mongoose.Schema({
  attendanceId: { 
    type: String, 
    unique: true, 
    default: () => 'TSA-' + Date.now().toString().slice(-6) 
  },
  tripId: { type: String },
  driverId: { type: String, required: true },
  driverName: { type: String, default: 'Driver' },
  routeId: { type: String, required: true },
  routeName: { type: String, default: 'East' },
  vehicleNumber: { type: String, default: 'TN 01 AB 1234' },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  rollNo: { type: String },
  pickupPoint: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  tripType: { 
    type: String, 
    enum: ['Pickup', 'Drop', 'Morning', 'Evening', 'General', 'Return'], 
    default: 'Pickup' 
  },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  boarded: { type: Boolean, default: false },
  boardedAt: { type: Date },
  isLocked: { type: Boolean, default: true },
  markedBy: { type: String, default: 'Driver' },
  correctionHistory: [{
    previousStatus: { type: String },
    newStatus: { type: String },
    reason: { type: String },
    correctedBy: { type: String },
    correctedAt: { type: Date, default: Date.now }
  }],
  collegeId: { type: String, default: 'mock_college_id' }
}, { timestamps: true });

// Prevent duplicate attendance per student, date, tripType and route
transportStudentAttendanceSchema.index(
  { studentId: 1, date: 1, tripType: 1, routeId: 1 }, 
  { unique: true }
);

export default mongoose.model('TransportStudentAttendance', transportStudentAttendanceSchema);
