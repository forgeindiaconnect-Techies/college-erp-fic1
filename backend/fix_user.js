import mongoose from 'mongoose';

(async () => {
  try {
    await mongoose.connect('mongodb+srv://Erp:erp123@cluster0.8frensh.mongodb.net/college_erp?appName=Cluster0');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const result = await User.updateOne(
      { email: 'nishapavan@gmail.com' }, 
      { $set: { referenceId: 'CYBER2026-004' } }
    );
    console.log('Update result:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
