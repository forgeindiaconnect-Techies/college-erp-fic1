import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
  },
  collegeName: {
    type: String,
    required: true
  },
  planName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Cancelled', 'Pending Approval', 'Suspended'],
    default: 'Pending Approval'
  },
  paymentStatus: {
    type: String,
    enum: ['Success', 'Paid', 'Pending', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  transactionId: {
    type: String
  },
  razorpayOrderId: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
