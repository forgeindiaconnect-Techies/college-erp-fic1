const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0').then(async () => {
  const Notification = mongoose.connection.collection('notifications');
  const User = mongoose.connection.collection('users');
  const admin = await User.findOne({ role: 'Admin' });
  console.log('Admin:', admin.email, admin.tenantId);
  const notifs = await Notification.find({
    $and: [
      { $or: [{ collegeId: admin.tenantId }, { tenantId: admin.tenantId }] },
      { $or: [
        { recipient: admin._id },
        { targetRoles: { $in: ['Admin', 'admin'] } }
      ]}
    ]
  }).toArray();
  console.log('Notifications found with query:', notifs.length);

  const allNotifs = await Notification.find({ tenantId: admin.tenantId }).toArray();
  console.log('Total notifications for tenant:', allNotifs.length);
  if(allNotifs.length > 0) {
    console.log('Latest notification:', JSON.stringify(allNotifs[allNotifs.length - 1], null, 2));
  }
  process.exit(0);
});
