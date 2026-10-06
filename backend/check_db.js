import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/college-erp';
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const colleges = await mongoose.connection.db.collection('colleges').find({}).toArray();
    console.log('=== COLLEGES ===');
    colleges.forEach(c => console.log(JSON.stringify({ id: c._id, name: c.name, tenantId: c.tenantId, code: c.code })));

    const users = await mongoose.connection.db.collection('users').find({ role: { $in: ['Admin', 'Accounts', 'Super Admin'] } }).toArray();
    console.log('=== ADMIN / ACCOUNTS USERS ===');
    users.forEach(u => console.log(JSON.stringify({ name: u.name, email: u.email, role: u.role, tenantId: u.tenantId, collegeId: u.collegeId })));

    const fees = await mongoose.connection.db.collection('feestructures').find({}).toArray();
    console.log('=== FEE STRUCTURES ===');
    fees.forEach(f => console.log(JSON.stringify({ id: f._id, course: f.course, department: f.department, tuitionFee: f.tuitionFee, collegeId: f.collegeId, tenantId: f.tenantId })));

    const quotas = await mongoose.connection.db.collection('quotas').find({}).toArray();
    console.log('=== QUOTAS ===');
    quotas.forEach(q => console.log(JSON.stringify({ id: q._id, name: q.name, collegeId: q.collegeId, tenantId: q.tenantId })));

    const scholarships = await mongoose.connection.db.collection('scholarships').find({}).toArray();
    console.log('=== SCHOLARSHIPS ===');
    scholarships.forEach(s => console.log(JSON.stringify({ id: s._id, name: s.name, collegeId: s.collegeId, tenantId: s.tenantId })));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error in check script:', err);
  }
}
check();
