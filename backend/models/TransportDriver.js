import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  documentType: { type: String, required: true },
  documentNumber: { type: String },
  issueDate: { type: Date },
  expiryDate: { type: Date },
  fileUrl: { type: String },
  verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' }
});

const transportDriverSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true }, // Auto-generated DRV-0001
  status: { type: String, enum: ['Active', 'Inactive', 'Suspended', 'On Leave'], default: 'Active' },
  collegeId: { type: String },
  
  // 1. Profile
  name: { type: String, required: true },
  photoUrl: { type: String },
  dob: { type: Date },
  gender: { type: String },
  bloodGroup: { type: String },
  employeeId: { type: String },
  employmentType: { type: String },
  joiningDate: { type: Date },

  // 2. Contact Information
  phone: { type: String, required: true }, // mobile
  alternateMobile: { type: String },
  email: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pinCode: { type: String },
  emergencyContactName: { type: String },
  emergencyContactNumber: { type: String },
  relationship: { type: String },

  // 3. Driving Licence
  license: { type: String, required: true }, // number
  licenseClass: { type: String }, // LMV, HMV
  licenseIssueDate: { type: Date },
  licenseExpiryDate: { type: Date },
  rto: { type: String },
  issuingState: { type: String },
  licenseVerificationStatus: { type: String, default: 'Pending' },
  licenseVerifiedDate: { type: Date },
  licenseVerifiedBy: { type: String },

  // 4. Experience
  experience: { type: String, required: true }, // total
  heavyVehicleExperience: { type: String },
  previousEmployer: { type: String },
  previousEmploymentDuration: { type: String },
  accidentHistory: { type: String },

  // 5. Documents
  documents: [documentSchema],

  // 6, 7, 8. Assignment
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportVehicle' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
  shift: { type: String },
  effectiveFrom: { type: Date },
  reportingManager: { type: String },
  branch: { type: String },

  // 12. Training
  defensiveDrivingTraining: { type: Boolean, default: false },
  roadSafetyTraining: { type: Boolean, default: false },
  firstAidTraining: { type: Boolean, default: false },
  fireSafetyTraining: { type: Boolean, default: false },
  trainingDate: { type: Date },
  nextTrainingDue: { type: Date },

  // HR Links (Placeholders for 9, 10, 11)
  attendanceRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  payrollRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Payroll' },

}, { timestamps: true });

export default mongoose.models.TransportDriver || mongoose.model('TransportDriver', transportDriverSchema);
