import mongoose from 'mongoose';
import Fee from './models/Fee.js';

await mongoose.connect('mongodb://127.0.0.1:27017/college-erp');

const fees = await Fee.find({
  $or: [
    { studentName: /Priya Kumar R/i },
    { registerNo: /HAA2026-001/i }
  ]
}).lean();

console.log('FOUND FEES:', fees.length);
console.log(JSON.stringify(fees, null, 2));

await mongoose.disconnect();
