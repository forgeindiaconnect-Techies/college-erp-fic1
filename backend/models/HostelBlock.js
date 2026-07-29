import mongoose from 'mongoose';

const hostelBlockSchema = new mongoose.Schema({
  blockId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  occupied: { type: Number, required: true, default: 0 },
  warden: { type: String, required: true }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('HostelBlock', hostelBlockSchema);
