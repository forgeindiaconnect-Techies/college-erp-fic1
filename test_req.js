
import('dotenv/config').then(() => {
import('mongoose').then(async (mongoose) => {
  await mongoose.default.connect(process.env.MONGO_URI);
  import('./models/Timetable.js').then(async (Timetable) => {
    try {
      const doc = new Timetable.default({
        department: 'Test Dept',
        semester: 'Semester 1',
        times: ['09:00 - 10:00'],
        schedule: [['Math']]
      });
      await doc.save();
      console.log('Saved successfully!');
    } catch (e) {
      console.error('Validation Error:', e.errors || e.message);
    }
    process.exit(0);
  });
});
});
