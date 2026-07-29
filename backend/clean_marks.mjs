import mongoose from 'mongoose';
import dotenv from 'dotenv';

const run = async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/erp_db');
  const Mark = mongoose.model('Mark', new mongoose.Schema({ studentId: String }));
  const Student = mongoose.model('Student', new mongoose.Schema({ id: String }));
  
  const students = await Student.find({}, 'id');
  const studentIds = students.map(s => s.id);
  
  const res = await Mark.deleteMany({ studentId: { $nin: studentIds } });
  console.log('Deleted orphan marks:', res.deletedCount);
  
  // Also, let's fix any students with random CGPAs but no marks
  const allStudents = await Student.find({});
  for (const s of allStudents) {
    const marks = await Mark.find({ studentId: s.id });
    if (marks.length === 0 && s.cgpa !== 0) {
      // If the student has NO marks, their CGPA should probably be 0
      // wait, what if the admin typed a CGPA manually?
      // For now, let's just log it.
      console.log(`Student ${s.id} has CGPA ${s.cgpa} but no marks.`);
    }
  }

  await mongoose.disconnect();
};
run();
