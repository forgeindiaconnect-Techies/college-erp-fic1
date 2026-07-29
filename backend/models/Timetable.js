import mongoose from 'mongoose';

const timetableSchema = new mongoose.Schema({
  collegeId: { type: String, required: false },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  regulationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Regulation' },
  department: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  day: { type: String, required: true },
  periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'PeriodMaster', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyAllocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'FacultyAllocation', required: true },
  roomNo: { type: String, required: true },
  createdBy: { type: String }
}, { timestamps: true });

// Prevent room conflict (same room, same day, same period)
timetableSchema.index({ collegeId: 1, day: 1, periodId: 1, roomNo: 1 }, { unique: true });

// Prevent duplicate section period (same department, semester, section, day, period)
timetableSchema.index({ collegeId: 1, department: 1, semester: 1, section: 1, day: 1, periodId: 1 }, { unique: true });

// Faculty conflict is handled by facultyAllocationId pointing to a Staff. 
// However, since facultyAllocationId is the ref, MongoDB can't index on the resolved StaffId easily.
// We will do faculty conflict validation in the API layer before saving.

export default mongoose.model('Timetable', timetableSchema);
