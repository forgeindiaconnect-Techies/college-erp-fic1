const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/college_erp');
    const db = mongoose.connection.db;

    const staffs = await db.collection('staffs').find({ collegeId: { $exists: true, $ne: null } }).toArray();
    for (const s of staffs) {
      if (s.email && s.collegeId) {
        await db.collection('users').updateOne({ email: s.email }, { $set: { tenantId: s.collegeId } });
        console.log(`Updated Staff User: ${s.email} -> ${s.collegeId}`);
      }
    }

    const students = await db.collection('students').find({ collegeId: { $exists: true, $ne: null } }).toArray();
    for (const s of students) {
      if (s.email && s.collegeId) {
        await db.collection('users').updateOne({ email: s.email }, { $set: { tenantId: s.collegeId } });
        console.log(`Updated Student User: ${s.email} -> ${s.collegeId}`);
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
