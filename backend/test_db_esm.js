import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/erp_db').then(async () => {
  try {
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, {strict: false}), 'attendances');
    const attAll = await Attendance.find().sort({_id: -1}).limit(5);
    console.log('Recent Attendances:');
    attAll.forEach(a => console.log(a.studentId, a.studentName, a.date, a.status));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
});
