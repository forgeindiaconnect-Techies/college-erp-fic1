import mongoose from 'mongoose';

const hostelRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  block: { type: String, required: true },
  type: { type: String, required: true },
  capacity: { type: Number, required: true },
  occupied: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['Available', 'Full', 'Maintenance'], default: 'Available' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('HostelRoom', hostelRoomSchema);
