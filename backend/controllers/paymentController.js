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

    const sIds = [
      String(admission._id),
      admission.id,
      admission.admissionNumber,
      admission.admissionNo
    ].filter(Boolean);

    // 1. Fetch from Payment collection
    const pmntRecords = await Payment.find({
      $or: [
        { admission: admission._id },
        { student: admission._id },
        { admissionId: { $in: sIds } },
        { studentId: { $in: sIds } }
      ]
    }).populate("collectedBy", "name email").lean();

    // 2. Fetch from Fee collection
    const feeRecords = await Fee.find({
      $or: [
        { studentId: { $in: sIds } },
        { registerNo: { $in: sIds } }
      ]
    }).lean();

    // 3. Embedded paymentHistory
    const embeddedRecords = Array.isArray(admission.paymentHistory) ? admission.paymentHistory : [];

    const combinedPayments = [];
    const seenReceipts = new Set();

    pmntRecords.forEach(p => {
      const receiptNo = p.receiptNumber || p.receiptNo || `RCPT-${p._id}`;
      if (!seenReceipts.has(receiptNo)) {
        seenReceipts.add(receiptNo);
        combinedPayments.push({
          _id: p._id,
          receiptNumber: receiptNo,
          amount: Number(p.amount || p.paidAmount || 0),
          paymentMode: p.paymentMode || p.paymentMethod || 'Cash',
          transactionReference: p.transactionReference || p.transactionRef || '-',
          paymentDate: p.paymentDate || p.createdAt || new Date(),
          collectedBy: p.collectedBy ? (typeof p.collectedBy === 'object' ? p.collectedBy : { name: "Accounts Staff" }) : { name: "Accounts Staff" }
        });
      }
    });

    feeRecords.forEach((f, idx) => {
      const receiptNo = f.receiptNo || f.receiptNumber || `REC-FEE-${idx + 1}`;
      if (!seenReceipts.has(receiptNo)) {
        seenReceipts.add(receiptNo);
        combinedPayments.push({
          _id: f._id,
          receiptNumber: receiptNo,
          amount: Number(f.paidAmount || f.amount || 0),
          paymentMode: f.paymentMode || f.paymentMethod || 'Cash',
          transactionReference: f.transactionRef || f.transactionReference || '-',
          paymentDate: f.paymentDate || f.createdAt || new Date(),
          collectedBy: { name: f.collectedByName || "Accounts Staff" }
        });
      }
    });

    embeddedRecords.forEach((p, idx) => {
      const receiptNo = p.receiptNumber || p.receiptNo || `REC-EMB-${idx + 1}`;
      if (!seenReceipts.has(receiptNo)) {
        seenReceipts.add(receiptNo);
        combinedPayments.push({
          _id: p._id || `emb-${idx}`,
          receiptNumber: receiptNo,
          amount: Number(p.amount || p.paidAmount || 0),
          paymentMode: p.paymentMethod || p.paymentMode || 'Cash',
          transactionReference: p.transactionReference || p.transactionRef || '-',
          paymentDate: p.paymentDate || admission.createdAt || new Date(),
          collectedBy: { name: "Accounts Staff" }
        });
      }
    });

    const totalPaidSum = combinedPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const actualPaidOnStudent = Number(admission.paidAmount !== undefined ? admission.paidAmount : (admission.amountPaid || 0));

    if (combinedPayments.length === 0 && actualPaidOnStudent > 0) {
      combinedPayments.push({
        _id: `init-${admission._id}`,
        receiptNumber: admission.receiptNumber || 'REC-INITIAL',
        amount: actualPaidOnStudent,
        paymentMode: admission.paymentMode || 'Bank Transfer (NEFT/RTGS)',
        transactionReference: admission.transactionRef || '-',
        paymentDate: admission.paymentDate || admission.createdAt || new Date(),
        collectedBy: { name: "Accounts Staff" }
      });
    }

    combinedPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    const finalPaidAmount = Math.max(totalPaidSum, actualPaidOnStudent);
    const finalFee = Number(admission.finalFee !== undefined && Number(admission.finalFee) > 0 ? admission.finalFee : (admission.totalFee || 0));
    const remainingFee = Math.max(0, finalFee - finalPaidAmount);
    const paymentStatus = (remainingFee === 0 && finalFee > 0) ? "Paid" : (finalPaidAmount > 0 ? "Partial" : "Pending");

    return res.status(200).json({
      success: true,
      data: combinedPayments,
      admission: {
        _id: admission._id,
        id: admission.id,
        studentName: admission.name || admission.studentName,
        admissionNumber: admission.admissionNumber || admission.id,
        department: admission.department || admission.dept || admission.course,
        quotaName: admission.quotaName || admission.admissionQuota || "General Quota",
        normalFee: admission.normalFee ?? admission.totalFee ?? 0,
        discountAmount: admission.discountAmount ?? 0,
        finalFee,
        paidAmount: finalPaidAmount,
        remainingFee,
        paymentStatus
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
