const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const db = mongoose.connection;
  const collections = ['students', 'staffs', 'departments', 'marks', 'exams', 'fees', 'timetables'];
  for (const c of collections) {
    try {
      const res = await db.collection(c).updateMany(
        { $or: [{ collegeId: { $exists: false } }, { collegeId: null }] },
        { $set: { collegeId: 'unassigned_college' } }
      );
      console.log('Migrated', c, res.modifiedCount);
    } catch(e) {}
  }
  process.exit(0);
});
