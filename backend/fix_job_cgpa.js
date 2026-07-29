import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const Job = mongoose.model('PlacementJob', new mongoose.Schema({}, { strict: false }));
  await Job.updateOne({ company: 'Fic' }, { $set: { minCgpa: 7.0 } });
  console.log('Fixed Fic minCgpa to 7.0');
  process.exit(0);
});
