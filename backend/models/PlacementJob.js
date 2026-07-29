import mongoose from 'mongoose';

const placementJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  ctc: { type: String, required: true },
  eligibility: { type: String, required: true },
  minCgpa: { type: Number, default: 0 },
  maxArrears: { type: Number, default: 0 }, // Maximum allowed arrears
  eligibleDepartments: { type: [String], default: [] },
  driveDate: { type: Date }, // Drive Date
  deadline: { type: Date, required: true }, // Last Date to Apply
  applicants: { type: Number, required: true, default: 0 }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('PlacementJob', placementJobSchema);
