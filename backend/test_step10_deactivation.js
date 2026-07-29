import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import College from './models/College.js';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

function postLogin(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runStep10Test() {
  await mongoose.connect(MONGO_URI);
  console.log('--- STEP 10 DEACTIVATION TEST ---');

  const college = await College.findOne({ name: { $regex: /MARUDHAR/i } });
  if (!college) {
    console.error('College not found!');
    mongoose.disconnect();
    return;
  }

  // 1. Deactivate college
  college.isActive = false;
  college.subscriptionStatus = 'Deactivated';
  await college.save();
  console.log(`1. Set ${college.name} (tenantId: ${college.tenantId}) to isActive: false`);

  // 2. Attempt login with vaidee@gmail.com / vaidee
  const res1 = await postLogin('vaidee@gmail.com', 'vaidee');
  console.log('2. Login response for vaidee@gmail.com while deactivated:');
  console.log('   HTTP Status:', res1.status);
  console.log('   Body:', res1.body);

  // 3. Reactivate college
  college.isActive = true;
  college.subscriptionStatus = 'Active';
  await college.save();
  console.log(`\n3. Reactivated ${college.name} to isActive: true`);

  // 4. Attempt login again
  const res2 = await postLogin('vaidee@gmail.com', 'vaidee');
  console.log('4. Login response for vaidee@gmail.com after reactivation:');
  console.log('   HTTP Status:', res2.status);
  console.log('   Body Name:', res2.body.name || res2.body);

  mongoose.disconnect();
}

runStep10Test();
