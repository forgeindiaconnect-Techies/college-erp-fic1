import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0';

async function fixRoles() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    // Find all staffs with designation HOD
    const hods = await db.collection('staffs').find({ designation: 'HOD' }).toArray();
    
    let updated = 0;
    for (const hod of hods) {
      // Find the corresponding user
      const result = await db.collection('users').updateOne(
        { email: hod.email },
        { $set: { role: 'HOD' } }
      );
      if (result.modifiedCount > 0) {
        updated++;
        console.log(`Updated role to HOD for ${hod.email}`);
      }
    }
    
    console.log(`Fixed ${updated} users.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fixRoles();
