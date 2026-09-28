import Student from '../models/Student.js';
import Fee from '../models/Fee.js';
import ScholarshipApplication from '../models/ScholarshipApplication.js';
import mongoose from 'mongoose';

// Step 32.2: Create the Controller Function
export const recordAdmissionPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      amount,
      paymentMethod,
      paymentDate,
    } = req.body;

    // Support lookup by MongoDB _id, id string, or admissionNumber
    let query = { id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { id }] };
    }

    const admission = await Student.findOne(query);

    if (!admission) {
      return res.status(404).json({
        message: "Admission record not found",
      });
    }

    const paymentAmount = Number(amount);
    const payableFee = admission.finalFee !== undefined ? Number(admission.finalFee) : Number(admission.totalFee || 0);
    const normalFee = Number(admission.normalFee !== undefined ? admission.normalFee : (admission.totalFee || payableFee));
    const oldPaidAmount = Number(admission.paidAmount || admission.amountPaid || 0);

    const oldRemainingFee =
      admission.remainingFee !== undefined
        ? Number(admission.remainingFee)
        : Math.max(0, payableFee - oldPaidAmount);

    if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount)) {
      return res.status(400).json({
        message: "Payment amount must be greater than zero",
      });
    }

    if (paymentAmount > oldRemainingFee && oldRemainingFee > 0) {
      return res.status(400).json({
        message: "Payment cannot exceed remaining balance",
      });
    }

    const updatedPaidAmount =
      oldPaidAmount + paymentAmount;

    const updatedRemainingFee =
      payableFee - updatedPaidAmount;

    let paymentStatus = "Pending";

    if (updatedRemainingFee <= 0) {
      paymentStatus = "Paid";
    } else if (updatedPaidAmount > 0) {
      paymentStatus = "Partial";
    }

    admission.paidAmount = updatedPaidAmount;
    admission.amountPaid = updatedPaidAmount;
    admission.remainingFee = Math.max(
      updatedRemainingFee,
      0
    );
    admission.balanceFee = Math.max(
      updatedRemainingFee,
      0
    );
    admission.paymentStatus = paymentStatus;
    admission.feeStatus = paymentStatus;
    admission.paymentMode = paymentMethod || "Cash";
    admission.paymentDate = paymentDate
      ? new Date(paymentDate)
      : new Date();

    const receiptNo = `REC-${Date.now()}`;
    admission.receiptNumber = receiptNo;

    // Add payment history if the field exists
    if (!admission.paymentHistory) {
      admission.paymentHistory = [];
    }

    admission.paymentHistory.push({
      amount: paymentAmount,
      paymentMethod: paymentMethod || "Cash",
      paymentDate: paymentDate
        ? new Date(paymentDate)
        : new Date(),
      receiptNo,
      receiptNumber: receiptNo
    });

    await admission.save();

    // Also persist in Fee collection for unified ledger / receipts / reports
    try {
      const studentIdentifier = admission.studentId || admission.id || String(admission._id);
      const existingFee = await Fee.findOne({
        studentId: studentIdentifier,
        ...(admission.collegeId || req.collegeId || req.user?.collegeId
          ? { collegeId: admission.collegeId || req.collegeId || req.user?.collegeId }
          : {}),
      }) || await Fee.findOne({
        studentId: studentIdentifier,
      });

      if (existingFee) {
        const newPaidAmount =
          Number(admission.amountPaid || 0) ||
          (Number(existingFee.paidAmount || 0) + Number(paymentAmount || 0));

        const finalFee =
          Number(
            admission.finalFee ||
            existingFee.finalFee ||
            admission.totalFee ||
            0
          );

        const remainingFee = Math.max(
          0,
          finalFee - newPaidAmount
        );

        const status =
          newPaidAmount <= 0
            ? "Pending"
            : newPaidAmount >= finalFee
              ? "Paid"
              : "Partial";

        existingFee.paidAmount = newPaidAmount;
        existingFee.finalFee = finalFee;
        existingFee.remainingFee = remainingFee;
        existingFee.pendingAmount = remainingFee;
        existingFee.normalFee = Number(admission.normalFee || existingFee.normalFee || finalFee);
        existingFee.discountAmount = Number(admission.discountAmount || existingFee.discountAmount || 0);
        existingFee.status = status;

        existingFee.quota =
          admission.quota ||
          existingFee.quota;

        existingFee.quotaName =
          admission.quotaName ||
          admission.admissionQuota ||
          existingFee.quotaName;

        const currentPayment = Number(paymentAmount || admission.amountPaid || 0);

        if (currentPayment > 0) {
          existingFee.payments = [
            ...(existingFee.payments || []),
            {
              amount: currentPayment,
              paymentMode: admission.paymentMode || paymentMethod || "Cash",
              paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
              receiptNo:
                admission.receiptNumber ||
                existingFee.receiptNo ||
                receiptNo ||
                "",
            },
          ];
        }

        existingFee.receiptNo =
          admission.receiptNumber ||
          existingFee.receiptNo ||
          receiptNo ||
          "";

        await existingFee.save();

        req.app.get('io')?.emit('dataUpdated', { module: 'fees', action: 'updated', studentId: admission.id });
        req.app.get('io')?.emit('dataUpdated', { module: 'admissions', action: 'payment_recorded', admissionId: admission._id });
        req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'payment_recorded', studentId: admission.id });

        return res.status(200).json({
          success: true,
          message: "Payment updated successfully",
          data: existingFee,
          admission,
        });
      }

      await Fee.create({
        studentId: admission.id || admission._id || admission.studentId,
        studentName: admission.name || admission.studentName,
        department: admission.dept || admission.department || admission.course || 'General',
        semester: admission.sem || admission.semester || 'Sem 1',
        feeType: 'Tuition Fee / Admission Fee',
        totalFees: payableFee,
        paidAmount: Number(admission.amountPaid || 0),
        paymentMode: paymentMethod || 'Cash',
        receiptNo: receiptNo,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        collegeId: admission.collegeId || req.collegeId || req.user?.collegeId || 'unassigned_college',
        quota: admission.quota || null,
        quotaName:
          admission.quotaName ||
          admission.admissionQuota ||
          "General Quota",
        normalFee:
          Number(admission.normalFee || 0),
        discountAmount:
          Number(admission.discountAmount || 0),
        finalFee:
          Number(
            admission.finalFee ||
            admission.totalFee ||
            0
          ),
        remainingFee:
          Math.max(
            0,
            Number(
              admission.finalFee ||
              admission.totalFee ||
              0
            ) -
              Number(admission.amountPaid || 0)
          ),
        pendingAmount:
          Math.max(
            0,
            Number(
              admission.finalFee ||
              admission.totalFee ||
              0
            ) -
              Number(admission.amountPaid || 0)
          ),
        status:
          Number(admission.amountPaid || 0) <= 0
            ? "Pending"
            : Number(admission.amountPaid || 0) >=
              Number(
                admission.finalFee ||
                admission.totalFee ||
                0
              )
              ? "Paid"
              : "Partial",
      });
    } catch (feeErr) {
      console.warn('Sync to Fee collection note:', feeErr.message);
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'fees', action: 'created', studentId: admission.id });
    req.app.get('io')?.emit('dataUpdated', { module: 'admissions', action: 'payment_recorded', admissionId: admission._id });
    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'payment_recorded', studentId: admission.id });

    return res.status(200).json({
      message: "Payment recorded successfully",
      admission,
    });
  } catch (error) {
    console.error("Record payment error:", error);

    return res.status(500).json({
      message: "Failed to record payment",
      error: error.message,
    });
  }
};

// Step 34.9: Backend Update Payment Logic
export const updateAdmissionPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;
    const { amount, paymentMethod, paymentDate } = req.body;

    const newAmount = Number(amount);
    if (!newAmount || newAmount <= 0 || isNaN(newAmount)) {
      return res.status(400).json({ message: "Enter a valid payment amount" });
    }

    let query = { id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { id }] };
    }

    const admission = await Student.findOne(query);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    if (!admission.paymentHistory) {
      admission.paymentHistory = [];
    }

    // Find the payment inside paymentHistory
    const paymentIndex = admission.paymentHistory.findIndex(
      p => String(p._id) === String(paymentId) || String(p.id) === String(paymentId) || String(p.receiptNo) === String(paymentId)
    );

    if (paymentIndex !== -1) {
      admission.paymentHistory[paymentIndex].amount = newAmount;
      if (paymentMethod) admission.paymentHistory[paymentIndex].paymentMethod = paymentMethod;
      if (paymentDate) admission.paymentHistory[paymentIndex].paymentDate = new Date(paymentDate);
    } else {
      // If not found by ID, push as an updated entry
      admission.paymentHistory.push({
        amount: newAmount,
        paymentMethod: paymentMethod || "Cash",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        receiptNo: `REC-${Math.floor(100000 + Math.random() * 900000)}`
      });
    }

    // Recalculate total paid, remaining fee, and payment status
    const totalPaid = admission.paymentHistory.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const payableFee = admission.finalFee !== undefined ? Number(admission.finalFee) : Number(admission.totalFee || 0);

    admission.paidAmount = totalPaid;
    admission.amountPaid = totalPaid;
    admission.remainingFee = Math.max(payableFee - totalPaid, 0);
    admission.balanceFee = Math.max(payableFee - totalPaid, 0);

    if (admission.remainingFee === 0 && payableFee > 0) {
      admission.paymentStatus = "Paid";
      admission.feeStatus = "Paid";
    } else if (admission.paidAmount > 0) {
      admission.paymentStatus = "Partial";
      admission.feeStatus = "Partial";
    } else {
      admission.paymentStatus = "Pending";
      admission.feeStatus = "Pending";
    }

    await admission.save();

    // Also update matching Fee document if exists
    if (mongoose.Types.ObjectId.isValid(paymentId)) {
      await Fee.findByIdAndUpdate(paymentId, {
        paidAmount: newAmount,
        paymentMode: paymentMethod || "Cash",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date()
      }).catch(() => {});
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'admissions', action: 'payment_updated', admissionId: admission._id });
    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'payment_updated', studentId: admission.id });

    return res.status(200).json({
      message: "Payment updated successfully",
      admission,
    });
  } catch (error) {
    console.error("Update payment error:", error);
    return res.status(500).json({ message: "Failed to update payment", error: error.message });
  }
};

// Step 34.8 & 34.9: Backend Delete Payment Logic
export const deleteAdmissionPayment = async (req, res) => {
  try {
    const { id, paymentId } = req.params;

    let query = { id };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { id }] };
    }

    const admission = await Student.findOne(query);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    if (admission.paymentHistory && admission.paymentHistory.length > 0) {
      admission.paymentHistory = admission.paymentHistory.filter(
        p => String(p._id) !== String(paymentId) && String(p.id) !== String(paymentId) && String(p.receiptNo) !== String(paymentId)
      );
    }

    // Recalculate total paid, remaining fee, and payment status
    const totalPaid = (admission.paymentHistory || []).reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0
    );
    const payableFee = admission.finalFee !== undefined ? Number(admission.finalFee) : Number(admission.totalFee || 0);

    admission.paidAmount = totalPaid;
    admission.amountPaid = totalPaid;
    admission.remainingFee = Math.max(payableFee - totalPaid, 0);
    admission.balanceFee = Math.max(payableFee - totalPaid, 0);

    if (admission.remainingFee === 0 && payableFee > 0) {
      admission.paymentStatus = "Paid";
      admission.feeStatus = "Paid";
    } else if (admission.paidAmount > 0) {
      admission.paymentStatus = "Partial";
      admission.feeStatus = "Partial";
    } else {
      admission.paymentStatus = "Pending";
      admission.feeStatus = "Pending";
    }

    await admission.save();

    // Also delete matching Fee document if present
    if (mongoose.Types.ObjectId.isValid(paymentId)) {
      await Fee.findByIdAndDelete(paymentId).catch(() => {});
    }

    req.app.get('io')?.emit('dataUpdated', { module: 'admissions', action: 'payment_deleted', admissionId: admission._id });
    req.app.get('io')?.emit('dataUpdated', { module: 'students', action: 'payment_deleted', studentId: admission.id });

    return res.status(200).json({
      message: "Payment deleted successfully",
      admission,
    });
  } catch (error) {
    console.error("Delete payment error:", error);
    return res.status(500).json({ message: "Failed to delete payment", error: error.message });
  }
};

// Step 44.5: Create Backend Controller for Fee Collection Pagination and Search
export const getFeeCollectionRecords = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const search = req.query.search?.trim() || "";
    const course = req.query.course || "";
    const paymentStatus = req.query.paymentStatus || "";

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { studentName: { $regex: search, $options: "i" } },
        { admissionNumber: { $regex: search, $options: "i" } },
        { id: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { aadhar: { $regex: search, $options: "i" } },
      ];
    }

    if (course && course !== "All") {
      const courseFilter = [
        { course: course },
        { courseName: course },
        { dept: course },
        { department: course },
      ];
      if (mongoose.Types.ObjectId.isValid(course)) {
        courseFilter.push({ course: new mongoose.Types.ObjectId(course) });
      }
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: courseFilter }];
        delete query.$or;
      } else {
        query.$or = courseFilter;
      }
    }

    if (paymentStatus && paymentStatus !== "All") {
      const statusFilter = [
        { paymentStatus: paymentStatus },
        { feeStatus: paymentStatus },
      ];
      if (query.$and) {
        query.$and.push({ $or: statusFilter });
      } else if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: statusFilter }];
        delete query.$or;
      } else {
        query.$or = statusFilter;
      }
    }

    if (req.collegeId && req.collegeId !== 'all') {
      query.collegeId = req.collegeId;
    }

    const totalRecords = await Student.countDocuments(query);

    const rawRecords = await Student.find(query)
      .populate("course")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const studentIds = [];
    rawRecords.forEach(doc => {
      if (doc._id) studentIds.push(String(doc._id));
      if (doc.id) studentIds.push(String(doc.id));
      if (doc.admissionNumber) studentIds.push(String(doc.admissionNumber));
      if (doc.admissionNo) studentIds.push(String(doc.admissionNo));
    });

    const studentObjectIds = rawRecords.map(doc => doc._id).filter(Boolean);
    const scholarshipApps = await ScholarshipApplication.find({
      $or: [
        { student: { $in: studentObjectIds } },
        { studentId: { $in: studentIds } }
      ],
      status: { $in: ['Approved', 'Pending', 'Applied'] }
    }).sort({ createdAt: -1 }).lean();

    const schByStudent = new Map();
    scholarshipApps.forEach(sch => {
      const keys = [
        sch.student ? String(sch.student) : null,
        sch.studentId ? String(sch.studentId) : null
      ].filter(Boolean);
      keys.forEach(k => {
        if (!schByStudent.has(k)) schByStudent.set(k, sch);
      });
    });

    const feeRecords = await Fee.find({ studentId: { $in: studentIds } }).sort({ createdAt: -1 }).lean();
    const feeByStudent = new Map();
    feeRecords.forEach(fee => {
      const key = String(fee.studentId);
      if (!feeByStudent.has(key)) feeByStudent.set(key, fee);
    });

    const records = rawRecords.map((doc) => {
      const item = doc.toObject();
      const normalFee = Number(item.normalFee !== undefined && item.normalFee !== null && item.normalFee !== "" ? item.normalFee : (item.totalFee || 0));
      const discountAmount = Number(item.discountAmount || item.quotaConcession || 0);
      const feeRecord = feeByStudent.get(String(item._id)) || feeByStudent.get(String(item.id)) || feeByStudent.get(String(item.admissionNumber)) || feeByStudent.get(String(item.admissionNo));
      const schRecord = schByStudent.get(String(item._id)) || schByStudent.get(String(item.id)) || schByStudent.get(String(item.admissionNumber)) || schByStudent.get(String(item.admissionNo));
      
      const scholarshipAmount = Number(
        item.scholarshipAmount ||
        item.scholarshipDiscount ||
        (item.scholarshipDetails?.discountAmount || 0) ||
        schRecord?.discountAmount ||
        feeRecord?.scholarshipAmount ||
        feeRecord?.scholarshipDiscount ||
        0
      );
      const scholarshipName = item.scholarship || item.scholarshipName || schRecord?.scholarshipName || feeRecord?.scholarshipName || item.scholarshipDetails?.scholarshipName || (scholarshipAmount > 0 ? "Scholarship Concession" : "");
      const totalDiscount = discountAmount + scholarshipAmount;
      
      const finalFee = (normalFee > 0 && totalDiscount > 0)
        ? Math.max(0, normalFee - totalDiscount)
        : (item.finalFee !== undefined && item.finalFee !== null && Number(item.finalFee) > 0 && Number(item.finalFee) < normalFee
            ? Number(item.finalFee)
            : Math.max(0, normalFee - totalDiscount));
            
      const totalFee = finalFee;
      const paidAmount = Number(item.paidAmount !== undefined ? item.paidAmount : (item.amountPaid !== undefined ? item.amountPaid : (feeRecord?.paidAmount || 0)));
      const remainingFee = Math.max(0, finalFee - paidAmount);
      const paymentStatusCalculated =
        (remainingFee === 0 && finalFee > 0) ? "Paid" : (paidAmount > 0 ? "Partial" : "Pending");

      const hostelFee = Number(item.hostelFee !== undefined ? item.hostelFee : (item.hostelFeeAmount || item.feeBreakdown?.hostelFee || 0));
      const transportFee = Number(item.transportFee !== undefined ? item.transportFee : (item.transportFeeAmount || item.feeBreakdown?.transportFee || 0));
      const tuitionFee = Number(item.tuitionFee !== undefined ? item.tuitionFee : (item.feeBreakdown?.tuitionFee || (normalFee > 0 ? Math.max(0, normalFee - hostelFee - transportFee - Number(item.otherFee || 0)) : 0)));
      const otherFee = Number(item.otherFee !== undefined ? item.otherFee : (item.feeBreakdown?.otherFee || item.feeBreakdown?.otherFees || 0));

      return {
        ...item,
        studentName: item.studentName || item.name || "Student",
        admissionNumber: item.admissionNumber || item.admissionNo || item.id || "—",
        department: item.department || item.dept || "General",
        courseName: item.course?.name || item.course?.courseName || item.course || item.dept || item.department || "General",
        quota: item.quota || null,
        quotaName: item.quotaName || item.admissionQuota || "General Quota",
        normalFee,
        discountAmount,
        scholarship: scholarshipName,
        scholarshipName,
        scholarshipAmount,
        scholarshipDiscount: scholarshipAmount,
        scholarshipDetails: item.scholarshipDetails || (scholarshipAmount > 0 ? { scholarshipName, discountAmount: scholarshipAmount, status: "Approved" } : null),
        tuitionFee,
        hostelFee,
        transportFee,
        otherFee,
        finalFee,
        totalFee,
        paidAmount,
        remainingFee,
        paymentStatus: paymentStatusCalculated,
      };
    });

    res.status(200).json({
      success: true,
      records,
      data: records,
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
    });
  } catch (error) {
    console.error("Get fee collection records error:", error);

    res.status(500).json({
      message: "Failed to fetch fee collection records",
      error: error.message,
    });
  }
};








