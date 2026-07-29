import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const updateKeerthana = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/college-erp');
    const Student = (await import('./models/Student.js')).default;
    const result = await Student.updateMany({ name: /KEERTHANA/i }, { $set: { attendance: 0 } });
    console.log('Updated:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
updateKeerthana();
