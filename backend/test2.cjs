const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const User = mongoose.connection.collection('users');
  const admin = await User.findOne({ name: 'SURESHKUMAR' });
  console.log('Admin:', admin);
  process.exit(0);
});
