import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  const Referral = mongoose.model('Referral', new mongoose.Schema({}, { strict: false }));
  
  const ref = await Referral.findOne({ referralCode: 'CRD-5642-6631' });
  console.log('CRD-5642-6631:', JSON.stringify(ref, null, 2));

  const allCreditCards = await Referral.find({ category: 'Credit Card' }).sort({ createdAt: -1 }).limit(10);
  console.log('Recent Credit Cards:');
  allCreditCards.forEach(c => {
    console.log({
      code: c.referralCode,
      tenantId: c.tenantId,
      submittedBy: c.submittedBy,
      submitterName: c.submitterName,
      createdAt: c.createdAt,
      phone: c.creditCardDetails?.applicantPhone,
      email: c.creditCardDetails?.applicantEmail,
      name: c.creditCardDetails?.applicantName,
      bank: c.creditCardDetails?.bankName,
    });
  });

  await mongoose.disconnect();
}

inspect().catch(console.error);
