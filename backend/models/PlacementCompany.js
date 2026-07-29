import mongoose from 'mongoose';

const placementCompanySchema = new mongoose.Schema({
  companyId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  logo: { type: String }, // optional logo URL
  sector: { type: String, required: true }, // Industry Type
  location: { type: String, required: true },
  website: { type: String },
  hrName: { type: String },
  hrEmail: { type: String },
  hrContact: { type: String },
  drives: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
, collegeId: { type: String } }, { timestamps: true });

export default mongoose.model('PlacementCompany', placementCompanySchema);
