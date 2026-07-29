const mongoose = require('mongoose');
require('dotenv').config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp');
  const db = mongoose.connection.db;
  const records = await db.collection('attendances').find({}).toArray();
  console.log(JSON.stringify(records, null, 2));
  process.exit(0);
};

run().catch(console.error);
