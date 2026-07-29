import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const Application = mongoose.model('PlacementApplication', new mongoose.Schema({}, { strict: false }));
  await Application.updateOne(
    { regNo: 'CYBER2026-004', company: 'Google' },
    { $set: { 
      applicationId: 'APP123456789',
      studentId: '6a1fc896736d9fa1caeb6573',
      student: 'Nishapavan',
      regNo: 'CYBER2026-004',
      dept: 'Cyber Security',
      cgpa: 9.6,
      company: 'Google',
      role: 'SWE',
      status: 'Selected'
    } },
    { upsert: true }
  );
  console.log('Fixed data mismatch!');
  process.exit(0);
});
