import mongoose from 'mongoose';
import User from './models/User.js';

const MONGO_URI = 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

async function listUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    const users = await User.find({}, { name: 1, email: 1, role: 1, tenantId: 1, department: 1, referenceId: 1 });
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- Role: [${u.role}] | Email: ${u.email} | Name: ${u.name} | Tenant: ${u.tenantId}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers();
