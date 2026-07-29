import mongoose from 'mongoose';

const transportTripSchema = new mongoose.Schema({
  tripId: { type: String, required: true, unique: true },
  driverId: { type: String, required: true },
  vehicleId: { type: String, required: true },
  routeId: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String },
  endTime: { type: String },
  status: { type: String, enum: ['Scheduled', 'Started', 'Completed', 'Delayed'], default: 'Scheduled' },
  studentTracking: [{
    studentId: String,
    pickupPoint: String,
    boarded: { type: Boolean, default: false },
    dropped: { type: Boolean, default: false },
    time: String
  }],
  notes: { type: String }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportTrip', transportTripSchema);
