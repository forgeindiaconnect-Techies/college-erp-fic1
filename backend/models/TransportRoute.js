import mongoose from 'mongoose';

const transportRouteSchema = new mongoose.Schema({
  routeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  vehicle: { type: String, required: true },
  driver: { type: String, required: true },
  capacity: { type: Number, required: true, default: 40 },
  occupied: { type: Number, default: 0 },
  points: [{ type: String }]
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportRoute', transportRouteSchema);
