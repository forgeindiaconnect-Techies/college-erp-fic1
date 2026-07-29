import mongoose from 'mongoose';

const CollegeSchema = new mongoose.Schema({
  name: String,
  tenantId: String,
  subscriptionPlan: String,
  subscriptionStatus: String,
  trialEndDate: Date
});

const College = mongoose.model('College', CollegeSchema);

async function check() {
  const mongoUri = 'mongodb://127.0.0.1:27017/college_erp';
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to DB');
    const colleges = await College.find();
    console.log('Colleges count:', colleges.length);
    colleges.forEach(c => {
      console.log(`- ID: ${c._id}, Name: ${c.name}, Tenant: ${c.tenantId}, Plan: ${c.subscriptionPlan}, Status: ${c.subscriptionStatus}, EndDate: ${c.trialEndDate}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}
check();
