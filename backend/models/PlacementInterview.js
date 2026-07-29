import mongoose from 'mongoose';

const placementInterviewSchema = new mongoose.Schema({
  interviewId: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  round: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  mode: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
  venue: { type: String }, // Venue / Meeting Link
  panel: { type: String }, // Panel Details
  candidates: { type: Number, required: true }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('PlacementInterview', placementInterviewSchema);
