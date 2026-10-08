import mongoose from 'mongoose';

const placementApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' }, // Link to Student model
  student: { type: String, required: true }, // Name
  regNo: { type: String, required: true },
  dept: { type: String }, // Department
  cgpa: { type: Number }, // CGPA
  company: { type: String, required: true },
  role: { type: String, required: true },
  status: { type: String, default: 'Applied' },
  currentRound: { type: Number, default: 1 },
  roundEvaluations: { type: mongoose.Schema.Types.Mixed, default: {} }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('PlacementApplication', placementApplicationSchema);
