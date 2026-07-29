import mongoose from 'mongoose';

const classSessionSchema = new mongoose.Schema({
  collegeId: { type: String, required: true },
  department: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  day: { type: String, required: true },
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PeriodMaster', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', required: true },
  roomNo: { type: String, default: 'Room 201' },
  date: { type: String, required: true }, // YYYY-MM-DD
  startTime: { type: String }, // e.g. "09:02 AM"
  endTime: { type: String },   // e.g. "09:50 AM"
  durationMinutes: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Live', 'Completed'], default: 'Pending' },
  attendanceSubmitted: { type: Boolean, default: false },
  notes: [{
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignmentsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }]
}, { timestamps: true });

// Prevent duplicate class session for same timetable slot on same date
classSessionSchema.index({ collegeId: 1, timetableId: 1, date: 1 }, { unique: true });

export default mongoose.model('ClassSession', classSessionSchema);
