import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || 'mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0';

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({ email: 'principal@college.edu' }).toArray();
    console.log(`Users with principal@college.edu:`);
    console.dir(users);
    
    const allRoles = await db.collection('users').distinct('role');
    console.log(`All roles in DB: ${allRoles}`);
    
    process.exit(0);
  })
  .catch(console.error);
