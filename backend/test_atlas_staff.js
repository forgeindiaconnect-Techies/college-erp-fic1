import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0';

mongoose.connect(uri)
  .then(async () => {
    console.log('Connected to Atlas');
    const db = mongoose.connection.db;
    const staff = await db.collection('staffs').find().toArray();
    console.log(`Found ${staff.length} staff members.`);
    staff.forEach(s => {
      console.log(`- ${s.id} | ${s.name} | ${s.dept} | ${s.designation} | ${s.role || 'no role'}`);
    });
    process.exit(0);
  })
  .catch(console.error);
