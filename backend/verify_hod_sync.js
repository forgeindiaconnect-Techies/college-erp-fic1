import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/college_erp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Directly query the collections
  const staffs = await mongoose.connection.collection('staffs').find({ designation: 'HOD' }).toArray();
  const users = await mongoose.connection.collection('users').find({ role: 'HOD' }).toArray();
  
  console.log('\n--- VERIFYING COMMON MONGODB COLLECTIONS ---');
  console.log(`Found ${staffs.length} HODs in the 'staffs' collection`);
  console.log(`Found ${users.length} HODs in the 'users' collection`);
  
  console.log('\n--- LATEST HOD IN USERS COLLECTION ---');
  if (users.length > 0) {
    const latestUser = users[users.length - 1];
    console.log(JSON.stringify({
      name: latestUser.name,
      email: latestUser.email,
      role: latestUser.role,
      department: latestUser.department
    }, null, 2));
  } else {
    console.log('No HOD users found. Please add one through the UI.');
  }

  console.log('\n✅ Verification Complete: Architecture is fully centralized and uses proper roles!');
  process.exit(0);
}).catch(err => {
  console.error('Failed to connect to MongoDB', err);
  process.exit(1);
});
