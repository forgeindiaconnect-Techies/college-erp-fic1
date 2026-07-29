import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import College from './models/College.js';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

async function testDeactivation() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const college = await College.findOne({ tenantId: 'COL001' });
    console.log('Current COL001 College status:', {
      name: college.name,
      isActive: college.isActive,
      subscriptionStatus: college.subscriptionStatus
    });

    // Deactivate
    college.isActive = false;
    college.subscriptionStatus = 'Deactivated';
    await college.save();
    console.log('Updated COL001 to isActive: false');

    const checkCollege = await College.findOne({ tenantId: 'COL001' });
    console.log('COL001 in DB after update:', {
      name: checkCollege.name,
      isActive: checkCollege.isActive,
      subscriptionStatus: checkCollege.subscriptionStatus
    });

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

testDeactivation();
