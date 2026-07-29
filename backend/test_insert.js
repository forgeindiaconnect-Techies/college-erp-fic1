import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected');
    const Attendance = (await import('./models/Attendance.js')).default;
    
    try {
      await Attendance.create({
        tenantId: 'mock_college_id',
        studentId: 'STU123',
        attendanceDate: new Date(),
        periodId: '1',
        status: 'Present',
        subjectId: 'Math'
      });
      console.log('Inserted!');
    } catch (e) {
      console.error(e.message);
    }
    process.exit(0);
  });
