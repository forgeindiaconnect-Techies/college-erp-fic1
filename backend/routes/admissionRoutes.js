import express from 'express';
import Student from '../models/Student.js';
import { recordAdmissionPayment, updateAdmissionPayment, deleteAdmissionPayment, getFeeCollectionRecords } from '../controllers/admissionController.js';
import { protect, authorize, departmentScope, requirePermission, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Step 44.4: Add Backend Route for Fee Collection Pagination and Search
router.get('/fee-collection', protect, collegeScope, getFeeCollectionRecords);

// Step 32.1: Payment Route for Admissions
router.put('/:id/payment', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, recordAdmissionPayment);
router.post('/:id/payment', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, recordAdmissionPayment);

// Step 34.7 & 34.8: Edit and Delete Payment Routes
router.put('/:id/payment/:paymentId', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, updateAdmissionPayment);
router.delete('/:id/payment/:paymentId', protect, authorize('Admin', 'Sub Admin', 'Principal', 'HOD', 'Accounts'), collegeScope, deleteAdmissionPayment);


// Get all admissions
router.get('/', protect, collegeScope, async (req, res) => {
  try {
    const admissions = await Student.find({});
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get admission by ID
router.get('/:id', protect, collegeScope, async (req, res) => {
  try {
    const admission = await Student.findOne({
      $or: [{ id: req.params.id }, { _id: req.params.id }]
    });
    if (!admission) return res.status(404).json({ message: 'Admission record not found' });
    res.json(admission);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
