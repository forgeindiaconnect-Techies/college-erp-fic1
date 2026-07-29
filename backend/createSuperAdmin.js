import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';
    await mongoose.connect(uri);
    
    // Delete existing mistakenly double-hashed superadmin
    await User.deleteOne({ email: 'superadmin@erpsaas.com' });
    
    // Create new one with plain text password (pre-save hook will hash it once)
    await User.create({
      name: 'System Super Admin',
      email: 'superadmin@erpsaas.com',
      password: 'superadmin123',
      role: 'Super Admin',
      tenantId: 'SYSTEM'
    });
    
    console.log('Super admin created successfully!');
    console.log('Email: superadmin@erpsaas.com');
    console.log('Password: superadmin123');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
