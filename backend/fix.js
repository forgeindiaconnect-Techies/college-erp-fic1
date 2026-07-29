import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const ramesh = await User.findOne({ name: /Ramesh/i, role: 'Admin' });
  if (ramesh) {
    const sandhiyaTenantId = ramesh.tenantId;
    await User.updateOne(
      { name: /POOJA/i, role: 'Principal' },
      { $set: { tenantId: sandhiyaTenantId } }
    );
    console.log('Successfully updated Dr. POOJA to belong to Sandhiya College Institution!');
  }
  process.exit();
});
