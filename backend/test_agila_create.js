import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0';

async function test() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'agila@gmail.com' });
  
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '30d' });
  
  const payload = JSON.stringify({
    id: 'STF999',
    name: 'User Added Staff',
    email: 'useradded@college.edu',
    phone: '9999999999',
    dept: 'Information Technology',
    designation: 'Assistant Prof.',
    subjects: [],
    workload: 16,
    attendance: 100
  });

  const options = {
    hostname: 'localhost',
    port: 5000, // Hit backend directly to avoid Vite proxy 502s
    path: '/api/staff',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length,
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${body}`);
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

test();
