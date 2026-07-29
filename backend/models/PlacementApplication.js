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
  status: { type: String, enum: ['Applied', 'Shortlisted', 'Waitlisted', 'Rejected'], default: 'Applied' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('PlacementApplication', placementApplicationSchema);
