import('dotenv/config').then(() => {
import('mongoose').then(async (mongoose) => {
  await mongoose.default.connect(process.env.MONGO_URI);
  import('./backend/models/Timetable.js').then(async (Timetable) => {
    try {
      const res = await Timetable.default.findOneAndUpdate(
        { department: 'Information Technology', semester: 'Semester 1' },
        { $set: { schedule: [['', '', '', 'Lunch', '']] } },
        { new: true, upsert: true, runValidators: true }
      );
      console.log('Success:', res);
    } catch (e) {
      console.error('Error:', e);
    }
    process.exit(0);
  });
});
});
