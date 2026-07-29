import mongoose from 'mongoose';

const transportDriverSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  license: { type: String, required: true },
  experience: { type: String, required: true },
  phone: { type: String, required: true },
  status: { type: String, enum: ['Active', 'On Leave', 'Inactive'], default: 'Active' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('TransportDriver', transportDriverSchema);
