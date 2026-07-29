import mongoose from 'mongoose';
import College from './models/College.js';
import User from './models/User.js';

const run = async () => {
  try {
    await mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0');
    console.log('Connected to DB');

    const lastCollege = await College.findOne({}, {}, { sort: { 'createdAt': -1 } });
    console.log('Last college:', lastCollege);

    const email = `test${Date.now()}@gmail.com`;

    let nextNum = 1;
    if (lastCollege && lastCollege.tenantId && lastCollege.tenantId.startsWith('COL')) {
      const lastNum = parseInt(lastCollege.tenantId.replace('COL', ''), 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const tenantId = `COL${String(nextNum).padStart(3, '0')}-${randomSuffix}`;
    console.log('Generated tenantId:', tenantId);

    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + 1);

    const newCollege = new College({
      name: 'Test College',
      adminName: 'Admin',
      email: email,
      phone: '1234567890',
      tenantId,
      subscriptionPlan: 'Trial',
      subscriptionStatus: 'Active',
      trialStartDate,
      trialEndDate
    });

    const savedCollege = await newCollege.save();
    console.log('Saved college', savedCollege);

    const newAdmin = new User({
      name: 'Admin',
      email: email,
      password: 'password123',
      role: 'Admin',
      phone: '1234567890',
      tenantId
    });
    const savedAdmin = await newAdmin.save();
    console.log('Saved admin', savedAdmin);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
};
run();
