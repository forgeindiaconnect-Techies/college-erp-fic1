import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import College from './models/College.js';
import CollegeSettings from './models/CollegeSettings.js';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

async function updateCollegeName() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database successfully!');

    const collegeName = 'Marudhar Kesari Jain College for Women';

    // 1. Update only default tenant COL001
    const collegeRes = await College.updateMany({ tenantId: 'COL001' }, { $set: { name: collegeName } });
    console.log(`Updated COL001 College documents: ${collegeRes.modifiedCount}`);

    // If no college exists, create one
    const count = await College.countDocuments();
    if (count === 0) {
      await College.create({
        name: collegeName,
        adminName: 'System Admin',
        email: 'admin@college.edu',
        tenantId: 'COL001',
        subscriptionPlan: 'Premium',
        subscriptionStatus: 'Active'
      });
      console.log('Created primary College document');
    }

    // 2. Update only COL001 CollegeSettings
    const settingsRes = await CollegeSettings.updateMany({ tenantId: 'COL001' }, { $set: { collegeName } });
    console.log(`Updated COL001 CollegeSettings documents: ${settingsRes.modifiedCount}`);

    // If no settings exist, create one
    const settingsCount = await CollegeSettings.countDocuments();
    if (settingsCount === 0) {
      await CollegeSettings.create({
        collegeName,
        tenantId: 'COL001',
        collegeId: 'COL001',
        primaryColor: '#0d9488',
        secondaryColor: '#059669'
      });
      console.log('Created primary CollegeSettings document');
    }

    console.log(`\n🎉 Successfully unified College Name to: "${collegeName}" across the entire database!`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error updating college name:', error);
    process.exit(1);
  }
}

updateCollegeName();
