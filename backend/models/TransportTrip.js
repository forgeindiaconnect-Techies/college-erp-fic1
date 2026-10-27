import mongoose from 'mongoose';

const transportTripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true, default: () => 'TRIP-' + Math.floor(100000 + Math.random() * 900000) },
  driverId: { type: String, default: 'DRV-0001' },
  driver: { type: String },
  vehicleId: { type: String, default: 'TN 01 AB 1234' },
  vehicle: { type: String },
  routeId: { type: String, default: 'R-01' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }, // YYYY-MM-DD
  startTime: { type: String },
  endTime: { type: String },
  tripType: { type: String, default: 'Morning' },
  startOdometer: { type: Number },
  endOdometer: { type: Number },
  status: { 
    type: String, 
    enum: ['Scheduled', 'Started', 'In Progress', 'Arrived', 'Completed', 'Delayed', 'Cancelled'], 
    default: 'Scheduled' 
  },
  stops: [{
    id: String,
    name: String,
    time: String,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  studentTracking: [{
    studentId: String,
    pickupPoint: String,
    boarded: { type: Boolean, default: false },
    dropped: { type: Boolean, default: false },
    time: String
  }],
  remarks: { type: String },
  notes: { type: String }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportTrip', transportTripSchema);
