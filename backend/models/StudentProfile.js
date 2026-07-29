import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  regNo: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  semester: { type: Number, default: 1 },
  section: { type: String, default: 'A' },
  cgpa: { type: Number, default: 0 },
  
  // Relationships to other modules
  transport: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportStudent', default: null },
  hostel: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelStudent', default: null },
  placements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PlacementApplication' }]
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('StudentProfile', studentProfileSchema);
