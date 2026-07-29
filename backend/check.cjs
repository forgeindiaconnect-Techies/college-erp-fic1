const mongoose = require('mongoose'); 
mongoose.connect('mongodb://localhost:27017/college_erp').then(async () => { 
  const db = mongoose.connection.db; 
  const pooja = await db.collection('users').findOne({name: 'Dr.POOJA'}); 
  console.log('POOJA tenantId:', pooja?.tenantId); 
  const college = await db.collection('colleges').findOne({tenantId: pooja?.tenantId}); 
  console.log('College:', college?.name); 
  const staffs = await db.collection('staffs').countDocuments({collegeId: pooja?.tenantId}); 
  console.log('Staff in staff:', staffs); 
  const userStaffs = await db.collection('users').countDocuments({tenantId: pooja?.tenantId}); 
  console.log('Users in users:', userStaffs); 
  const orphanedStaffs = await db.collection('staffs').find().toArray();
  console.log('Orphaned staffs:', orphanedStaffs.filter(s => !s.collegeId).length);
  process.exit(0); 
});
