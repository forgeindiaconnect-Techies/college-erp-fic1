import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const checkKeerthana = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college-erp');
    const User = (await import('./models/User.js')).default;
    const keerthana = await User.findOne({ name: /KEERTHANA/i });
    console.log(keerthana);
    
    const Student = (await import('./models/Student.js')).default;
    const keerthanaStud = await Student.findOne({ name: /KEERTHANA/i });
    console.log(keerthanaStud);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
checkKeerthana();
