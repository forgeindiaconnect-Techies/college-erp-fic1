import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import College from './models/College.js';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

async function inspectDb() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findOne({ email: 'admin@college.edu' });
  console.log('User admin@college.edu:', {
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    collegeId: user.collegeId
  });

  const colleges = await College.find();
  console.log('All Colleges in DB:', colleges.map(c => ({
    _id: c._id,
    name: c.name,
    tenantId: c.tenantId,
    isActive: c.isActive,
    subscriptionStatus: c.subscriptionStatus
  })));

  const search1 = await College.findOne({ tenantId: user.tenantId });
  console.log('College search by tenantId:', search1 ? search1.name : 'NOT FOUND');

  mongoose.disconnect();
}

inspectDb();
