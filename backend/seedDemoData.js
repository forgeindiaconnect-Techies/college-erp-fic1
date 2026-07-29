import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import College from './models/College.js';
import User from './models/User.js';

dotenv.config();

const seedDemoData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('password123', 10);

    console.log('🧹 Cleaning up old demo data...');
    await College.deleteMany({ name: { $in: ['Demo College A', 'Demo College B'] } });
    await User.deleteMany({ email: { $regex: '@democollege' } });

    // 1. Create College A (Premium)
    console.log('🏢 Creating College A (Premium SaaS Plan)...');
    const collegeA = await College.create({
      tenantId: 'TENANT-DEMO-A',
      name: 'Demo College A',
      adminName: 'Admin Demo A',
      email: 'admin@democollegea.edu',
      phone: '9999999991',
      address: 'Tech Park, New York',
      subscriptionPlan: 'Premium',
      subscriptionStatus: 'Active',
      trialStartDate: new Date(new Date().setDate(new Date().getDate() - 30)), // 30 days ago
      trialEndDate: new Date(new Date().setDate(new Date().getDate() + 365)) // 1 year
    });

    // 2. Create College B (Trial)
    console.log('🏢 Creating College B (Trial SaaS Plan)...');
    const collegeB = await College.create({
      tenantId: 'TENANT-DEMO-B',
      name: 'Demo College B',
      adminName: 'Admin Demo B',
      email: 'admin@democollegeb.edu',
      phone: '9999999992',
      address: 'Innovation Hub, San Francisco',
      subscriptionPlan: 'Trial',
      subscriptionStatus: 'Active',
      trialStartDate: new Date(),
      trialEndDate: new Date(new Date().setDate(new Date().getDate() + 14)), // 14 days
      convertedToPaid: false
    });

    // 3. Create Users for College A
    console.log('👥 Creating Demo Roles for College A...');
    const roles = ['Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent', 'Accounts', 'Driver'];
    
    for (const role of roles) {
      await User.create({
        name: `${role} Demo A`,
        email: `${role.toLowerCase()}@democollegea.edu`,
        password: hashedPassword,
        role: role,
        collegeId: collegeA._id
      });
      console.log(`   👉 Created: ${role.toLowerCase()}@democollegea.edu (pw: password123)`);
    }

    // 4. Create Users for College B
    console.log('👥 Creating Demo Roles for College B...');
    const rolesB = ['Admin', 'Principal', 'Student'];
    for (const role of rolesB) {
      await User.create({
        name: `${role} Demo B`,
        email: `${role.toLowerCase()}@democollegeb.edu`,
        password: hashedPassword,
        role: role,
        collegeId: collegeB._id
      });
      console.log(`   👉 Created: ${role.toLowerCase()}@democollegeb.edu (pw: password123)`);
    }

    console.log('\n🎉 Demo Data Seeded Successfully!');
    console.log('You can now log in to test Tenant Isolation between College A and College B.');
    console.log('Run Super Admin test using your existing super admin credential.');
    process.exit();
  } catch (error) {
    console.error('❌ Seeding Failed:', error);
    process.exit(1);
  }
};

seedDemoData();
