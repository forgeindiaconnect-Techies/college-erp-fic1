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
    enum: ['Active', 'Expired', 'Cancelled'],
    default: 'Active'
  },
  paymentStatus: {
    type: String,
    enum: ['Success', 'Pending', 'Failed'],
    default: 'Success'
  },
  transactionId: {
    type: String,
    required: true
  },
  razorpayOrderId: {
    type: String
  }
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
