const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const College = mongoose.connection.collection('colleges');
  const Notification = mongoose.connection.collection('notifications');
  const college = await College.findOne({ name: /GPT COLLEGE/i });
  console.log('College:', college);
  const notifs = await Notification.find({ tenantId: college.tenantId }).toArray();
  console.log('Notifications for college:', notifs);
  process.exit(0);
});
