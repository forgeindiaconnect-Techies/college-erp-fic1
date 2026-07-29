import mongoose from 'mongoose';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import College from './models/College.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

function fetchStudents(token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/students',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.end();
  });
}

function loginUser(email, password) {
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

async function runStep15Test() {
  await mongoose.connect(MONGO_URI);
  console.log('--- STEP 15 MIDDLEWARE ENFORCEMENT TEST ---');

  // 1. Ensure college is ACTIVE and get valid JWT token for admin@college.edu
  const college = await College.findOne({ tenantId: 'COL001' });
  college.isActive = true;
  college.subscriptionStatus = 'Active';
  await college.save();

  const loginRes = await loginUser('admin@college.edu', 'admin123');
  const token = loginRes.body.token;
  console.log('1. Admin logged in while Active. Token obtained successfully.');

  // 2. Make API call GET /api/students while active -> 200 OK
  const apiRes1 = await fetchStudents(token);
  console.log('2. GET /api/students while Active: Status =', apiRes1.status);

  // 3. Super Admin deactivates college in DB
  college.isActive = false;
  college.subscriptionStatus = 'Deactivated';
  await college.save();
  console.log('\n3. Super Admin deactivated college COL001 (isActive = false)');

  // 4. Try making GET /api/students with old JWT token -> 403 Forbidden!
  const apiRes2 = await fetchStudents(token);
  console.log('4. GET /api/students with old token while Deactivated:');
  console.log('   HTTP Status:', apiRes2.status);
  console.log('   Body:', apiRes2.body);

  // 5. Restore college to Active for normal operation
  college.isActive = true;
  college.subscriptionStatus = 'Active';
  await college.save();
  console.log('\n5. Restored COL001 to isActive: true');

  mongoose.disconnect();
}

runStep15Test();
