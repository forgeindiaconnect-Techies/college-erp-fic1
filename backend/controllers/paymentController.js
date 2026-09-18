import Payment from '../models/Payment.js';
import Student from '../models/Student.js';
import Fee from '../models/Fee.js';
import mongoose from 'mongoose';

// Helper function to generate receipt number
export const generateReceiptNumber = async () => {
  const count = await Payment.countDocuments();
  const nextNumber = count + 1;
  return `RCPT-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`;
};

// Step 57.5: Create the Add Payment Controller
export const createPayment = async (req, res) => {
  try {
    const {
      admissionId,
      amount,
      paymentMode,
      transactionReference,
      paymentDate,
      remarks
    } = req.body;

    if (!admissionId || !amount || !paymentMode) {
      return res.status(400).json({
        success: false,
        message: "Admission, amount, and payment mode are required"
      });
    }

    const paymentAmount = Number(amount);

    if (paymentAmount <= 0 || isNaN(paymentAmount)) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero"
      });
    }

    let query = { id: admissionId };
    if (mongoose.Types.ObjectId.isValid(admissionId)) {
      query = { $or: [{ _id: admissionId }, { id: admissionId }] };
    }

    const admission = await Student.findOne(query);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found"
      });
    }

    const finalFee =
      admission.finalFee !== undefined
        ? Number(admission.finalFee)
        : Number(admission.totalFee || 0);

    const currentPaidAmount =
      admission.paidAmount !== undefined
        ? Number(admission.paidAmount)
        : Number(admission.amountPaid || 0);

    const currentRemainingFee =
      admission.remainingFee !== undefined
        ? Number(admission.remainingFee)
        : Math.max(finalFee - currentPaidAmount, 0);

    if (paymentAmount > currentRemainingFee && currentRemainingFee > 0) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot exceed the remaining balance of ₹${currentRemainingFee.toLocaleString('en-IN')}`
      });
    }

    const receiptNumber = await generateReceiptNumber();

    const payment = await Payment.create({
      admission: admission._id,
      admissionId: admission.id || admission.admissionNumber || String(admission._id),
      student: admission._id,
      studentId: admission.id || admission.admissionNumber,
      studentName: admission.name || admission.studentName || 'Student',
      organization: req.user?.organization || req.user?.collegeId || admission.collegeId || null,
      collegeId: req.user?.collegeId || req.user?.tenantId || admission.collegeId || 'unassigned_college',
      receiptNumber,
      amount: paymentAmount,
      paymentMode: paymentMode || "Cash",
      transactionReference: transactionReference || "",
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      remarks: remarks || "",
      collectedBy: req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : null,
      collectorName: req.user?.name || req.user?.email || "Accounts Staff"
    });

    const newPaidAmount = currentPaidAmount + paymentAmount;
    const newRemainingFee = Math.max(finalFee - newPaidAmount, 0);

    let paymentStatus = "Pending";

    if (newPaidAmount === 0) {
      paymentStatus = "Pending";
    } else if (newRemainingFee === 0) {
      paymentStatus = "Paid";
    } else {
      paymentStatus = "Partial";
    }

    admission.paidAmount = newPaidAmount;
    admission.amountPaid = newPaidAmount;
    admission.remainingFee = newRemainingFee;
    admission.balanceFee = newRemainingFee;
    admission.paymentStatus = paymentStatus;
    admission.feeStatus = paymentStatus;
    admission.receiptNumber = receiptNumber;

    if (!admission.paymentHistory) {
      admission.paymentHistory = [];
    }
    admission.paymentHistory.push({
      amount: paymentAmount,
      paymentMethod: paymentMode || "Cash",
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      receiptNo: receiptNumber,
      receiptNumber: receiptNumber,
      transactionReference: transactionReference || ""
    });

    await admission.save();

    // Also persist in Fee collection for unified reports
    try {
      await Fee.create({
        studentId: admission.id || admission._id,
        studentName: admission.name || admission.studentName,
        department: admission.dept || admission.department || admission.course || 'General',
        semester: admission.sem || admission.semester || 'Sem 1',
        feeType: 'Tuition Fee / Admission Fee',
        totalFees: finalFee,
        paidAmount: paymentAmount,
        paymentMode: paymentMode || 'Cash',
        receiptNo: receiptNumber,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        collegeId: admission.collegeId || req.collegeId || req.user?.collegeId || 'unassigned_college'
      });
    } catch (e) {
      console.warn("Fee collection sync note:", e.message);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'admissions', action: 'payment_recorded', admissionId: admission._id });
    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'payment_recorded', studentId: admission.id });

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment,
        admission
      }
    });
  } catch (error) {
    console.error("Create payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record payment",
      error: error.message
    });
  }
};

// Step 57.6: Create Payment History Controller
export const getPaymentHistory = async (req, res) => {
  try {
    const { admissionId } = req.params;

    let query = { id: admissionId };
    if (mongoose.Types.ObjectId.isValid(admissionId)) {
      query = { $or: [{ _id: admissionId }, { id: admissionId }] };
    }

    const admission = await Student.findOne(query);

    if (!admission) {
      return res.status(404).json({
        success: false,
        message: "Admission record not found"
      });
    }

    // Look for payments in Payment collection
    const paymentQuery = {
      $or: [
        { admission: admission._id },
        { student: admission._id },
        { admissionId: admission.id || admission.admissionNumber },
        { studentId: admission.id || admission.admissionNumber }
      ]
    };

    let payments = await Payment.find(paymentQuery)
      .populate("collectedBy", "name email")
      .sort({ paymentDate: -1 });

    // Fallback: If no standalone Payment records yet, convert admission.paymentHistory
    if (payments.length === 0 && admission.paymentHistory && admission.paymentHistory.length > 0) {
      payments = admission.paymentHistory.map((p, index) => ({
        _id: p._id || `hist-${index}`,
        receiptNumber: p.receiptNumber || p.receiptNo || `REC-${index + 1}`,
        amount: Number(p.amount || p.paidAmount || 0),
        paymentMode: p.paymentMethod || p.paymentMode || "Cash",
        transactionReference: p.transactionReference || p.transactionRef || "-",
        paymentDate: p.paymentDate || admission.createdAt || new Date(),
        collectedBy: { name: "Accounts Staff" }
      }));
    }

    return res.status(200).json({
      success: true,
      data: payments,
      admission: {
        _id: admission._id,
        id: admission.id,
        studentName: admission.name || admission.studentName,
        admissionNumber: admission.admissionNumber || admission.id,
        department: admission.department || admission.dept || admission.course,
        quotaName: admission.quotaName || admission.admissionQuota || "General Quota",
        normalFee: admission.normalFee ?? admission.totalFee ?? 0,
        discountAmount: admission.discountAmount ?? 0,
        finalFee: admission.finalFee ?? admission.totalFee ?? 0,
        paidAmount: admission.paidAmount ?? admission.amountPaid ?? 0,
        remainingFee: admission.remainingFee ?? 0,
        paymentStatus: admission.paymentStatus || admission.feeStatus || "Pending"
      }
    });
  } catch (error) {
    console.error("Get payment history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: error.message
    });
  }
};
