import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college-erp');
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    
    // 1. Patch missing User collegeId/tenantId
    const colleges = await db.collection('colleges').find().toArray();
    let updatedCount = 0;
    
    for (const college of colleges) {
      if (college.tenantId === 'TENANT-DEMO-A') {
        const result = await db.collection('users').updateMany(
          { email: { $regex: '@democollegea.edu$' } },
          { $set: { collegeId: String(college._id), tenantId: college.tenantId } }
        );
        updatedCount += result.modifiedCount;
      }
      if (college.tenantId === 'TENANT-DEMO-B') {
        const result = await db.collection('users').updateMany(
          { email: { $regex: '@democollegeb.edu$' } },
          { $set: { collegeId: String(college._id), tenantId: college.tenantId } }
        );
        updatedCount += result.modifiedCount;
      }
    }
    console.log('Fixed users: ' + updatedCount);

    // 2. Clear old leaked notifications/exams that have unassigned_college
    const examsDel = await db.collection('exams').deleteMany({ collegeId: 'unassigned_college' });
    console.log('Cleared leaked exams: ' + examsDel.deletedCount);

    const notifsDel = await db.collection('notifications').deleteMany({ 
      $or: [
        { collegeId: 'unassigned_college' },
        { collegeId: null },
        { collegeId: { $exists: false } }
      ]
    });
    console.log('Cleared leaked notifs: ' + notifsDel.deletedCount);

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
};
run();
