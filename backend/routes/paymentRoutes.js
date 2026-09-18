import express from 'express';
import {
  createPayment,
  getPaymentHistory
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createPayment);
router.get('/history/:admissionId', protect, getPaymentHistory);

export default router;
