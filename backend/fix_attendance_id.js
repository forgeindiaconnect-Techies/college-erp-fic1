import mongoose from 'mongoose';
mongoose.connect('mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));
  const result = await Attendance.updateMany({ studentId: 'CYBER2026-001' }, { $set: { studentId: 'CYBER2026-004' } });
  console.log('Fixed attendance records:', result);
  process.exit(0);
});
