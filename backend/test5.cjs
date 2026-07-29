const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const Notification = mongoose.connection.collection('notifications');
  const notifs = await Notification.find({ title: 'Trial Expiring Soon' }).toArray();
  console.log(JSON.stringify(notifs, null, 2));
  process.exit(0);
});
