import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  status: { type: String, required: true, enum: ['Paid', 'Pending'] },
  collegeId: { type: String, default: 'unassigned_college' },
  tenantId: { type: String, default: 'unassigned_college' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Expense', expenseSchema);
