import mongoose from 'mongoose';

async function fix() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/college-erp');
    const fees = mongoose.connection.collection('fees');
    
    // Find all fees with paidAmount >= totalFees or paidAmount > 0 but status is Pending
    const brokenFees = await fees.find({ status: 'Pending', paidAmount: { $gt: 0 } }).toArray();
    console.log('Found broken fees:', brokenFees.length);
    
    for (const f of brokenFees) {
      const payAmt = f.paidAmount || 45000;
      await fees.updateOne(
        { _id: f._id },
        { $set: { status: 'Paid', totalFees: payAmt, pendingAmount: 0 } }
      );
    }
    
    console.log('Fixed fees.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fix();
