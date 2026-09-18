import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  photoUrl: { type: String, default: '' },
  dept: { type: String, required: true },
  sem: { type: String, required: true },
  attendance: { type: Number, default: 0 },
  cgpa: { type: Number, default: 0 },
  status: { type: String, default: 'Active' },
  admissionStatus: {
    type: String,
    enum: ['Applied', 'Under Review', 'Approved', 'Rejected', 'Confirmed'],
    default: 'Applied'
  },
  feeStatus: { type: String, default: 'Pending' },
  amountPaid: {
    type: Number,
    default: 0
  },
  balanceFee: {
    type: Number,
    default: 0
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Card'],
    default: 'Cash'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partial', 'Paid'],
    default: 'Pending'
  },
  receiptNumber: {
    type: String,
    default: ''
  },
  paymentDate: {
    type: Date,
    default: null
  },
  idNumber: { type: String },
  dob: { type: String },
  academicYear: { type: String },
  regulationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Regulation'
  },

  // Academic structure allocation
  departmentId: { type: String, default: null },
  courseId: { type: String, default: null },
  semesterId: { type: String, default: null },
  sectionId: { type: String, default: null },
  academicYearId: { type: String, default: null },

  // Human-readable values retained for existing pages
  section: { type: String },
  batch: { type: String },
  admissionDate: { type: String },
  hostelRequired: { type: String },
  roomNumber: { type: String },
  hostelFeeAmount: { type: Number },
  hostelFeeStatus: { type: String },
  hostelName: { type: String },
  blockWing: { type: String },
  bedNumber: { type: String },
  wardenName: { type: String },
  wardenContact: { type: String },
  transportRequired: { type: String },
  busRoute: { type: String },
  pickupPoint: { type: String },
  transportFeeAmount: { type: Number },
  transportFeeStatus: { type: String },
  
  // ERP Admission fields
  previousAdmissionNo: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  gender: { type: String },
  fatherName: { type: String },
  motherName: { type: String },
  fatherOccupation: { type: String },
  yearlyIncome: { type: String },
  fatherPhone: { type: String },
  fatherEmail: { type: String },
  guardianName: { type: String },
  guardianPhone: { type: String },
  guardianEmail: { type: String },
  guardianAddress: { type: String },
  community: { type: String },
  caste: { type: String },
  religion: { type: String },
  nationality: { type: String },
  bloodGroup: { type: String },
  motherTongue: { type: String },
  handicapped: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  pincode: { type: String },
  degreeType: { type: String },
  course: { type: String },
  department: { type: String },
  semester: { type: mongoose.Schema.Types.Mixed },
  qualifications: [{
    study: String,
    institute: String,
    board: String,
    percentage: String,
    passYear: String,
    marksheetNo: String
  }],
  feeBreakdown: { type: mongoose.Schema.Types.Mixed },
  feeType: { type: String, default: 'all' },
  quota: { type: mongoose.Schema.Types.Mixed, ref: 'Quota', default: null },
  quotaName: { type: String, default: 'General Quota' },
  normalFee: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  finalFee: { type: Number, default: 0 },
  tuitionFee: { type: Number, default: 0 },
  hostelFee: { type: Number, default: 0 },
  transportFee: { type: Number, default: 0 },
  otherFee: { type: Number, default: 0 },
  totalFee: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingFee: { type: Number, default: 0 },

  paymentHistory: [
    {
      amount: {
        type: Number,
        required: true,
      },
      paymentMethod: {
        type: String,
        default: "Cash",
      },
      paymentDate: {
        type: Date,
        default: Date.now,
      },
      receiptNo: {
        type: String,
      },
      receiptNumber: {
        type: String,
      }
    },
  ],

  academicHistory: [{
    semester: String,
    promotedDate: { type: Date, default: Date.now },
    promotedTo: String,
    status: { type: String, default: 'Passed' }
  }],
  collegeId: { type: String }
}, { timestamps: true, strict: false });

export default mongoose.model('Student', studentSchema);

