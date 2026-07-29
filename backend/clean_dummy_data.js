import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const Job = mongoose.model('PlacementJob', new mongoose.Schema({}, { strict: false }));
  await Job.deleteMany({ company: { $in: ['Infosys', 'Amazon', 'Google'] } });
  
  const Application = mongoose.model('PlacementApplication', new mongoose.Schema({}, { strict: false }));
  await Application.deleteMany({ company: { $in: ['Infosys', 'Amazon', 'Google'] } });
  
  const Selection = mongoose.model('PlacementSelection', new mongoose.Schema({}, { strict: false }));
  await Selection.deleteMany({});
  
  console.log('Cleaned up mock data!');
  process.exit(0);
});
