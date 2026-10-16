import mongoose from 'mongoose';

const studentCampusEntrySchema = new mongoose.Schema({
  entryId: {
    type: String,
    required: true,
    unique: true
  },
  studentId: {
    type: String,
    required: true,
    index: true
  },
  studentObjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  studentName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'General'
  },
  course: {
    type: String,
    default: ''
  },
  semester: {
    type: String,
    default: ''
  },
  photoUrl: {
    type: String,
    default: ''
  },
  qrCode: {
    type: String,
    index: true
  },
  phone: {
    type: String,
    default: '',
    index: true
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  durationFormatted: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Inside Campus', 'Checked Out'],
    default: 'Inside Campus',
    index: true
  },
  entryWatchmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Watchman'
  },
  entryWatchmanName: {
    type: String,
    default: 'Gate Security'
  },
  entryGate: {
    type: String,
    default: 'Gate 1 (Main Entrance)'
  },
  exitWatchmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Watchman'
  },
  exitWatchmanName: {
    type: String,
    default: ''
  },
  exitGate: {
    type: String,
    default: ''
  },
  dateString: {
    type: String,
    index: true
  },
  collegeId: {
    type: String,
    default: 'COL001',
    index: true
  },
  tenantId: {
    type: String,
    default: 'COL001'
  },
  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('StudentCampusEntry', studentCampusEntrySchema);
