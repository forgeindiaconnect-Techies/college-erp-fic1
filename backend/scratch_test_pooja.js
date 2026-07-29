import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false }));
  const FacultyAllocation = mongoose.model('FacultyAllocation', new mongoose.Schema({}, { strict: false }));
  const Staff = mongoose.model('Staff', new mongoose.Schema({}, { strict: false }));

  const reqUser = {
    _id: '6a61b148c21f8f00096248d9',
    referenceId: 'STF002',
    name: 'POOJA',
    email: 'pooja@gmail.com'
  };

  // 1. Find Staff docs
  const staffDocs = await Staff.find({
    $or: [
      { id: reqUser.referenceId },
      { staffId: reqUser.referenceId },
      { email: reqUser.email },
      { name: new RegExp('^' + reqUser.name + '$', 'i') }
    ]
  });

  const staffObjectIds = staffDocs.map(s => s._id);
  console.log('Found Staff ObjectIds:', staffObjectIds);

  // 2. Find FacultyAllocations
  const allocations = await FacultyAllocation.find({
    staffId: { $in: staffObjectIds }
  });
  const allocIds = allocations.map(a => a._id);
  console.log('Found Allocation ObjectIds:', allocIds);

  // 3. Find Timetables
  const timetables = await Timetable.find({
    facultyAllocationId: { $in: allocIds }
  });

  console.log('Found Timetables count:', timetables.length);
  console.log(JSON.stringify(timetables, null, 2));

  process.exit(0);
});
