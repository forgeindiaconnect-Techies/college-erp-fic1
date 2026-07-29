import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://college:college1@cluster0.y8so5pd.mongodb.net/college_erp?appName=Cluster0';

async function checkAtlas() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB Atlas!');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections count:', collections.length);
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`- Collection '${col.name}': ${count} documents`);
    }
  } catch (err) {
    console.error('Error connecting:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkAtlas();
