import mongoose from 'mongoose';

const placementSelectionSchema = new mongoose.Schema({
  selectionId: { type: String, required: true, unique: true },
  student: { type: String, required: true },
  regNo: { type: String, required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  ctc: { type: String, required: true },
  date: { type: Date, required: true }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('PlacementSelection', placementSelectionSchema);
