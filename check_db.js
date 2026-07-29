import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  dept: String,
  designation: String
});

const Staff = mongoose.model('Staff', staffSchema);

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/college-erp');
  const staff = await Staff.find();
  console.log('Total staff:', staff.length);
  console.log(staff.slice(-3));
  mongoose.disconnect();
}
check();
