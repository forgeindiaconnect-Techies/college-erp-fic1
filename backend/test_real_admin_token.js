import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0';

async function test() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'admin@college.edu' });
  
  if (!user) {
    console.log('Admin user not found');
    process.exit(1);
  }
  
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '30d' });
  console.log('Real Token generated:', token.substring(0, 20) + '...');
  
  const options = {
    hostname: 'localhost',
    port: 5173, // Testing through Vite proxy!
    path: '/api/staff',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${body.substring(0, 300)}`);
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
  });

  req.end();
}

test();
