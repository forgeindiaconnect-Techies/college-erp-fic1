import express from 'express';
import mongoose from 'mongoose';
import Book from '../models/Book.js';
import LibraryTransaction from '../models/LibraryTransaction.js';
import BookCopy from '../models/BookCopy.js';
import LibraryFinePayment from '../models/LibraryFinePayment.js';
import LibraryReservation from '../models/LibraryReservation.js';
import LibraryReturnRequest from '../models/LibraryReturnRequest.js';
import LibraryClearance from '../models/LibraryClearance.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import { sendNotification } from '../utils/notificationHelper.js';
import {
  protect,
  authorize,
  collegeScope
} from '../middleware/authMiddleware.js';

const router = express.Router();

const FINE_PER_DAY = 10;

const getUserId = (req) => {
  return req.user.referenceId || req.user.id || req.user._id;
};

const getUserType = (req) => {
  const r = String(req.user?.role || '').trim();
  if (r === 'HOD' || r.toLowerCase() === 'hod') return 'HOD';
  if (r === 'Staff' || r === 'Teacher' || r.toLowerCase() === 'staff') return 'Staff';
  if (r === 'Principal' || r === 'Admin' || r === 'Sub Admin') return r;
  return 'Student';
};

export const getAuthorizedCollegeId = (req) => {
  if (req.user?.role === 'Super Admin') {
    const requestedCid = req.query?.collegeId || req.headers['x-tenant-id'];
    return requestedCid && requestedCid !== 'system' ? String(requestedCid).trim() : 'system';
  }

  const cid = req.user?.collegeId || req.user?.tenantId || req.collegeId;
  if (!cid || cid === 'system' || cid === 'unassigned_college') {
    return null;
  }
  return String(cid).trim();
};

export const getTenantFilter = (req) => {
  const collegeId = getAuthorizedCollegeId(req);

  // Super Admin unrestricted system-wide access (unless scoped to a specific college)
  if (req.user?.role === 'Super Admin' && collegeId === 'system') {
    return {};
  }

  // Deny access if user has no authorized college
  if (!collegeId) {
    return { collegeId: '__BLOCKED_UNAUTHORIZED_NO_COLLEGE__' };
  }

  // Strict college isolation: records must match this college's collegeId or tenantId
  return {
    $or: [
      { collegeId: collegeId },
      { tenantId: collegeId }
    ]
  };
};

const calculateFine = (dueDate, date = new Date()) => {
  if (!dueDate || date <= dueDate) return 0;

  const diffTime = date.getTime() - new Date(dueDate).getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays * FINE_PER_DAY);
};

const updateOverdueStatus = (transaction) => {
  if (
    transaction.status === 'Issued' &&
    transaction.dueDate &&
    new Date() > new Date(transaction.dueDate)
  ) {
    transaction.status = 'Overdue';
    transaction.fineAmount = calculateFine(transaction.dueDate);
  }

  return transaction;
};

router.get(
  '/transactions/:id/fine-receipt',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      }).populate('bookId');

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college'
        });
      }

      const paidAmount = Number(transaction.finePaid || 0);

      if (paidAmount <= 0) {
        return res.status(404).json({
          message: 'No fine payment exists for this transaction'
        });
      }

      const collegeId = transaction.collegeId || getAuthorizedCollegeId(req);

      let payment = await LibraryFinePayment.findOne({
        transactionId: transaction._id,
        ...getTenantFilter(req)
      }).sort({ createdAt: -1 });

      if (!payment) {
        const paymentDate =
          transaction.finePaidDate ||
          transaction.updatedAt ||
          new Date();

        const year = new Date(paymentDate).getFullYear();

        const lastPayment = await LibraryFinePayment.findOne({
          ...getTenantFilter(req)
        }).sort({ createdAt: -1 });

        let sequence = 1;

        if (lastPayment?.receiptNumber) {
          const match =
            lastPayment.receiptNumber.match(/FR-\d{4}-(\d+)$/);

          if (match) {
            sequence = Number(match[1]) + 1;
          }
        }

        const receiptNumber =
          `FR-${year}-${String(sequence).padStart(4, '0')}`;

        try {
          payment = await LibraryFinePayment.create({
            transactionId: transaction._id,
            receiptNumber,
            collegeId,
            userId: transaction.userId,
            userType: transaction.userType || (req.user?.role === 'Student' ? 'Student' : 'Student'),
            bookId: transaction.bookId?._id || transaction.bookId,
            amount: paidAmount,
            paymentMethod: 'Cash',
            paymentDate,
            remarks: 'Receipt generated from existing fine payment'
          });
        } catch (createError) {
          console.error(
            'Receipt save warning:',
            createError.message
          );

          payment = {
            receiptNumber,
            collegeId,
            userId: transaction.userId,
            userType: transaction.userType || (req.user?.role === 'Student' ? 'Student' : 'Student'),
            bookId: transaction.bookId,
            amount: paidAmount,
            paymentMethod: 'Cash',
            paymentDate,
            remarks: 'Existing fine payment'
          };
        }
      }

      return res.json({
        transaction,
        payment
      });
    } catch (error) {
      console.error('Fine receipt error:', error);

      return res.status(500).json({
        message: 'Failed to load fine receipt'
      });
    }
  }
);

router.get(
  '/fine-payments',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const payments = await LibraryFinePayment.find({
        ...getTenantFilter(req),
        ...(req.user?.role === 'Student' || req.user?.role === 'Staff'
          ? {
              $or: [
                { userId: getUserId(req) },
                { userId: req.user?.rollNo },
                { userId: req.user?.admissionNumber },
                { userId: req.user?.referenceId },
                { userId: req.user?.name },
                { userId: req.user?.id },
                { userId: String(req.user?._id) }
              ].filter(f => f.userId)
            }
          : {})
      })
        .populate('bookId')
        .populate('transactionId')
        .sort({ paymentDate: -1 });

      res.json(payments);
    } catch (error) {
      console.error('Fine payments error:', error);

      res.status(500).json({
        message: 'Failed to load fine payment history'
      });
    }
  }
);

/* =========================================================
   LIBRARY RESERVATIONS
   ========================================================= */

router.post(
  '/reservations',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const { bookId } = req.body;

      if (!bookId) {
        return res.status(400).json({ message: 'Book ID is required' });
      }

      const book = await Book.findOne({
        _id: bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        return res.status(404).json({ message: 'Book not found in your college library catalog' });
      }

      const userId = getUserId(req);
      const userType = getUserType(req);
      const authCollegeId = getAuthorizedCollegeId(req);
      const tenantCollegeId = book.collegeId || authCollegeId;

      const existing = await LibraryReservation.findOne({
        bookId: book._id,
        userId,
        status: 'Pending',
        ...getTenantFilter(req)
      });

      if (existing) {
        return res.status(400).json({
          message: 'You already have a pending reservation for this book'
        });
      }

      const reservation = await LibraryReservation.create({
        bookId: book._id,
        userId,
        userType,
        status: 'Pending',
        requestDate: new Date(),
        collegeId: tenantCollegeId,
        tenantId: tenantCollegeId
      });

      // Also ensure matching LibraryTransaction exists
      try {
        await LibraryTransaction.findOneAndUpdate(
          {
            bookId: book._id,
            userId,
            status: 'Pending',
            ...getTenantFilter(req)
          },
          {
            bookId: book._id,
            userId,
            userType,
            status: 'Pending',
            collegeId: tenantCollegeId,
            tenantId: tenantCollegeId
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (txErr) {
        console.warn('Sync transaction creation failed', txErr);
      }

      const populated = await LibraryReservation.findOne({
        _id: reservation._id,
        ...getTenantFilter(req)
      }).populate('bookId');

      res.status(201).json({
        message: 'Book reserved successfully',
        reservation: populated
      });
    } catch (error) {
      console.error('Create reservation error:', error);
      res.status(500).json({
        message: 'Failed to create reservation'
      });
    }
  }
);

router.get(
  '/reservations',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const isStudent = req.user?.role === 'Student';
      const isStaff = req.user?.role === 'Staff' || req.user?.role === 'Teacher';

      let filter = {};

      if (isStudent || isStaff) {
        const possibleIds = new Set();
        if (req.user?._id) possibleIds.add(String(req.user._id));
        if (req.user?.id) possibleIds.add(String(req.user.id));
        if (req.user?.referenceId) possibleIds.add(String(req.user.referenceId));
        if (req.user?.studentId) possibleIds.add(String(req.user.studentId));
        if (req.user?.rollNo) possibleIds.add(String(req.user.rollNo));
        if (req.user?.email) possibleIds.add(String(req.user.email));
        if (req.user?.name) possibleIds.add(String(req.user.name));

        try {
          const studentDocs = await Student.find({
            $or: [
              { email: req.user?.email },
              { name: req.user?.name },
              { id: req.user?.referenceId },
              { referenceId: req.user?.referenceId },
              { rollNo: req.user?.referenceId }
            ]
          }).lean();

          for (const s of (studentDocs || [])) {
            if (s._id) possibleIds.add(String(s._id));
            if (s.id) possibleIds.add(String(s.id));
            if (s.referenceId) possibleIds.add(String(s.referenceId));
            if (s.studentId) possibleIds.add(String(s.studentId));
            if (s.rollNo) possibleIds.add(String(s.rollNo));
          }
        } catch (e) {
          console.warn('Reservation student lookup warning:', e.message);
        }

        const idList = Array.from(possibleIds).filter(Boolean);
        filter = {
          $or: [
            { userId: { $in: idList } },
            { userId: { $in: idList.map(id => new RegExp(`^${id}$`, 'i')) } }
          ]
        };
      }

      const tenantFilter = getTenantFilter(req);
      const combinedResFilter = (isStudent || isStaff)
        ? { ...filter, ...tenantFilter }
        : tenantFilter;

      let reservations = await LibraryReservation.find(combinedResFilter)
        .populate('bookId')
        .populate('bookCopyId')
        .sort({ createdAt: -1 })
        .lean();

      // Also get any pending / approved student book requests from LibraryTransaction within college
      const txFilter = (isStudent || isStaff)
        ? { ...filter, ...tenantFilter, status: { $in: ['Pending', 'Approved', 'Reserved'] } }
        : { ...tenantFilter, status: { $in: ['Pending', 'Approved', 'Reserved'] } };

      const pendingTransactions = await LibraryTransaction.find(txFilter)
        .populate('bookId')
        .populate('bookCopyId')
        .lean();

      const existingMap = new Set();
      reservations.forEach(r => {
        const bId = String(r.bookId?._id || r.bookId || '');
        existingMap.add(`${bId}_${r.userId}`);
      });

      for (const tx of pendingTransactions) {
        const bId = String(tx.bookId?._id || tx.bookId || '');
        const key = `${bId}_${tx.userId}`;
        if (!existingMap.has(key)) {
          existingMap.add(key);
          reservations.push({
            _id: tx._id,
            bookId: tx.bookId,
            bookCopyId: tx.bookCopyId,
            userId: tx.userId,
            userType: tx.userType || 'Student',
            status: tx.status || 'Pending',
            requestDate: tx.createdAt || new Date(),
            approvedDate: tx.approvedDate || null,
            createdAt: tx.createdAt || new Date(),
            isFromTransaction: true
          });
        }
      }

      // Pre-fetch staff, students and users for borrower info resolution strictly within this college
      let allStaffDocs = [];
      let allStudentDocs = [];
      let allUserDocs = [];
      try {
        allStaffDocs = await Staff.find(tenantFilter).lean();
        allStudentDocs = await Student.find(tenantFilter).lean();
        allUserDocs = await User.find(tenantFilter).select('name role department referenceId email').lean();
      } catch (e) {}

      // Ensure book details, approvedDate and borrower details are populated
      for (const r of reservations) {
        if (!r.approvedDate && (r.status === 'Approved' || r.status === 'Completed' || r.status === 'Issued')) {
          r.approvedDate = r.updatedAt || r.createdAt || new Date();
        }
        if (!r.bookId || typeof r.bookId === 'string' || !r.bookId.title) {
          const rawId = r.bookId?._id || r.bookId;
          if (rawId) {
            try {
              const b = await Book.findOne({ _id: rawId, ...tenantFilter }).lean();
              if (b) r.bookId = b;
            } catch (e) {}
          }
        }

        // Attach borrower details for seamless UI display
        const uId = String(r.userId || '').trim().toLowerCase();
        const uType = String(r.userType || '').trim();

        const matchedStaff = allStaffDocs.find(s =>
          String(s._id || '').toLowerCase() === uId ||
          String(s.id || '').toLowerCase() === uId ||
          String(s.staffId || '').toLowerCase() === uId ||
          String(s.referenceId || '').toLowerCase() === uId ||
          String(s.email || '').toLowerCase() === uId ||
          String(s.name || '').trim().toLowerCase() === uId
        );

        const matchedUser = allUserDocs.find(u =>
          String(u._id || '').toLowerCase() === uId ||
          String(u.id || '').toLowerCase() === uId ||
          String(u.referenceId || '').toLowerCase() === uId ||
          String(u.email || '').toLowerCase() === uId ||
          String(u.name || '').trim().toLowerCase() === uId
        );

        const matchedStudent = allStudentDocs.find(s =>
          String(s._id || '').toLowerCase() === uId ||
          String(s.id || '').toLowerCase() === uId ||
          String(s.studentId || '').toLowerCase() === uId ||
          String(s.rollNo || '').toLowerCase() === uId ||
          String(s.referenceId || '').toLowerCase() === uId ||
          String(s.email || '').toLowerCase() === uId ||
          String(s.name || '').trim().toLowerCase() === uId
        );

        if (uType === 'HOD' || matchedUser?.role === 'HOD' || matchedStaff?.designation === 'HOD' || matchedStaff?.role === 'HOD') {
          r.userType = 'HOD';
          r.borrowerName = matchedStaff?.name || matchedUser?.name || 'Department HOD';
          r.borrowerDept = matchedStaff?.dept || matchedStaff?.department || matchedUser?.department || 'Department';
          r.borrowerId = matchedStaff?.id || matchedStaff?.staffId || matchedUser?.referenceId || r.userId;
        } else if (uType === 'Staff' || uType === 'Teacher' || matchedStaff || matchedUser?.role === 'Staff') {
          r.userType = 'Staff';
          r.borrowerName = matchedStaff?.name || matchedUser?.name || 'Faculty Staff';
          r.borrowerDept = matchedStaff?.dept || matchedStaff?.department || matchedUser?.department || 'Faculty';
          r.borrowerId = matchedStaff?.id || matchedStaff?.staffId || matchedUser?.referenceId || r.userId;
        } else {
          r.userType = 'Student';
          r.borrowerName = matchedStudent?.name || matchedStudent?.fullName || matchedUser?.name || r.userId;
          r.borrowerDept = matchedStudent?.dept || matchedStudent?.department || matchedUser?.department || 'Student';
          r.borrowerId = matchedStudent?.rollNo || matchedStudent?.studentId || matchedStudent?.id || r.userId;
        }
      }

      res.json(reservations);
    } catch (error) {
      console.error('Get reservations error:', error);
      res.status(500).json({
        message: 'Failed to load reservations'
      });
    }
  }
);

router.put(
  '/reservations/:id/approve',
  protect,
  authorize('Admin', 'Super Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library', 'HOD', 'Staff'),
  collegeScope,
  async (req, res) => {
    try {
      const now = new Date();
      const rawId = req.params.id;
      let reservation = null;
      let tx = null;

      if (mongoose.isValidObjectId(rawId)) {
        reservation = await LibraryReservation.findOne({
          _id: rawId,
          ...getTenantFilter(req)
        });
        if (!reservation) {
          tx = await LibraryTransaction.findOne({
            _id: rawId,
            ...getTenantFilter(req)
          });
        }
      }

      if (!reservation && !tx) {
        reservation = await LibraryReservation.findOne({
          $or: [
            { userId: rawId },
            { _id: rawId }
          ],
          ...getTenantFilter(req)
        }).sort({ createdAt: -1 });
      }

      if (!reservation && !tx) {
        tx = await LibraryTransaction.findOne({
          $or: [
            { userId: rawId },
            { _id: rawId }
          ],
          ...getTenantFilter(req)
        }).sort({ createdAt: -1 });
      }

      if (!reservation && !tx) {
        return res.status(404).json({
          message: 'Reservation or request not found in your college'
        });
      }

      if (tx) {
        tx.status = 'Approved';
        tx.approvedDate = now;
        await tx.save();

        const bId = tx.bookId?._id || tx.bookId;
        const uId = String(tx.userId);
        const collegeId = tx.collegeId || getAuthorizedCollegeId(req);

        reservation = await LibraryReservation.findOneAndUpdate(
          { bookId: bId, userId: uId, ...getTenantFilter(req) },
          {
            bookId: bId,
            userId: uId,
            userType: tx.userType || 'Student',
            status: 'Approved',
            approvedDate: now,
            collegeId,
            tenantId: collegeId
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } else if (reservation) {
        reservation.status = 'Approved';
        reservation.approvedDate = now;
        await reservation.save();

        const bId = reservation.bookId?._id || reservation.bookId;
        const uId = String(reservation.userId);

        await LibraryTransaction.updateMany(
          { bookId: bId, userId: uId, status: { $in: ['Pending', 'Reserved'] }, ...getTenantFilter(req) },
          { status: 'Approved', approvedDate: now }
        );
      }

      try {
        if (reservation && reservation.bookId) {
          await reservation.populate('bookId');
        }
      } catch (e) {}

      res.json({
        message: 'Reservation approved successfully',
        reservation: reservation || tx
      });
    } catch (error) {
      console.error('Approve reservation error:', error);
      res.status(500).json({
        message: error.message || 'Failed to approve reservation'
      });
    }
  }
);

router.put(
  '/reservations/:id/reject',
  protect,
  authorize('Admin', 'Super Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library', 'HOD', 'Staff'),
  collegeScope,
  async (req, res) => {
    try {
      const rawId = req.params.id;
      let reservation = null;
      let tx = null;

      if (mongoose.isValidObjectId(rawId)) {
        reservation = await LibraryReservation.findOne({
          _id: rawId,
          ...getTenantFilter(req)
        });
        if (!reservation) {
          tx = await LibraryTransaction.findOne({
            _id: rawId,
            ...getTenantFilter(req)
          });
        }
      }

      if (!reservation && !tx) {
        reservation = await LibraryReservation.findOne({
          $or: [
            { userId: rawId },
            { _id: rawId }
          ],
          ...getTenantFilter(req)
        }).sort({ createdAt: -1 });
      }

      if (!reservation && !tx) {
        tx = await LibraryTransaction.findOne({
          $or: [
            { userId: rawId },
            { _id: rawId }
          ],
          ...getTenantFilter(req)
        }).sort({ createdAt: -1 });
      }

      if (reservation) {
        reservation.status = 'Rejected';
        await reservation.save();

        const bId = reservation.bookId?._id || reservation.bookId;
        const uId = String(reservation.userId);

        await LibraryTransaction.updateMany(
          { bookId: bId, userId: uId, status: { $in: ['Pending', 'Approved', 'Reserved'] }, ...getTenantFilter(req) },
          { status: 'Rejected' }
        );
      } else if (tx) {
        tx.status = 'Rejected';
        await tx.save();

        const bId = tx.bookId?._id || tx.bookId;
        const uId = String(tx.userId);

        await LibraryReservation.updateMany(
          { bookId: bId, userId: uId, status: { $in: ['Pending', 'Approved', 'Reserved'] }, ...getTenantFilter(req) },
          { status: 'Rejected' }
        );
      } else {
        return res.status(404).json({
          message: 'Reservation or request not found in your college'
        });
      }

      res.json({
        message: 'Reservation rejected successfully'
      });
    } catch (error) {
      console.error('Reject reservation error:', error);
      res.status(500).json({
        message: error.message || 'Failed to reject reservation'
      });
    }
  }
);

router.put(
  '/reservations/:id/issue',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'Principal',
    'Librarian',
    'Library',
    'Staff',
    'HOD'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const { bookCopyId, dueDate } = req.body;
      const rawId = req.params.id;

      let reservation = null;
      if (mongoose.isValidObjectId(rawId)) {
        reservation = await LibraryReservation.findOne({
          _id: rawId,
          ...getTenantFilter(req)
        });
      }

      if (!reservation && mongoose.isValidObjectId(rawId)) {
        const tx = await LibraryTransaction.findOne({
          _id: rawId,
          ...getTenantFilter(req)
        });
        if (tx) {
          reservation = await LibraryReservation.findOneAndUpdate(
            { bookId: tx.bookId, userId: tx.userId, ...getTenantFilter(req) },
            {
              bookId: tx.bookId,
              userId: tx.userId,
              userType: tx.userType || 'Student',
              status: tx.status === 'Approved' ? 'Approved' : 'Pending',
              collegeId: tx.collegeId || getAuthorizedCollegeId(req),
              tenantId: tx.tenantId || tx.collegeId || getAuthorizedCollegeId(req)
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      }

      if (!reservation) {
        return res.status(404).json({
          message: 'Reservation not found in your college'
        });
      }

      if (
        reservation.status !== 'Approved' &&
        reservation.status !== 'Pending'
      ) {
        return res.status(400).json({
          message: `Cannot issue reservation with status '${reservation.status}'`
        });
      }

      const book = await Book.findOne({
        _id: reservation.bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found in your college library catalog'
        });
      }

      const authCollegeId = getAuthorizedCollegeId(req);
      const tenantId =
        reservation.collegeId ||
        book.collegeId ||
        authCollegeId;

      let selectedCopy = null;
      if (bookCopyId) {
        selectedCopy = await BookCopy.findOne({
          _id: bookCopyId,
          bookId: book._id,
          ...getTenantFilter(req)
        });

        if (!selectedCopy) {
          return res.status(404).json({
            message: 'Selected physical copy not found in your college library'
          });
        }

        if (selectedCopy.status !== 'Available') {
          return res.status(400).json({
            message: `Selected physical copy is currently ${selectedCopy.status}`
          });
        }
      } else {
        selectedCopy = await BookCopy.findOne({
          bookId: book._id,
          ...getTenantFilter(req),
          status: 'Available'
        }).sort({ createdAt: 1 });
      }

      const currentAvail =
        book.availableCopies !== undefined
          ? Number(book.availableCopies)
          : (
              book.available !== undefined
                ? Number(book.available)
                : Number(book.totalCopies) || 1
            );

      if (currentAvail <= 0) {
        return res.status(400).json({
          message: 'No available copies for this book'
        });
      }

      const issueDate = new Date();

      if (!selectedCopy) {
        return res.status(400).json({
          message: 'No available physical copy found for this book'
        });
      }
      const finalDueDate = dueDate
        ? new Date(dueDate)
        : new Date(
            Date.now() +
              ((reservation.userType === 'Staff' || reservation.userType === 'HOD') ? 30 : 14) *
                24 *
                60 *
                60 *
                1000
          );

      let previousCopyStatus = null;
      if (selectedCopy) {
        previousCopyStatus = selectedCopy.status;
        selectedCopy.status = 'Issued';
        await selectedCopy.save();
      }

      const previousAvailableCopies = book.availableCopies;

      try {
        const transaction = new LibraryTransaction({
          bookId: book._id,
          bookCopyId: selectedCopy ? selectedCopy._id : undefined,
          userId: reservation.userId,
          userType: reservation.userType || 'Student',
          status: 'Issued',
          approvedDate: reservation.approvedDate || issueDate,
          issueDate,
          dueDate: finalDueDate,
          fineAmount: 0,
          collegeId: tenantId,
          tenantId: tenantId
        });

        const savedTransaction = await transaction.save();

        reservation.status = 'Completed';
        if (!reservation.approvedDate) {
          reservation.approvedDate = issueDate;
        }
        await reservation.save();

        book.availableCopies = Math.max(0, currentAvail - 1);
        book.status =
          book.availableCopies > 0 ? 'Available' : 'Out of Stock';
        await book.save();

        try {
          const targetRole = reservation.userType === 'HOD' ? 'HOD' : (reservation.userType === 'Staff' ? 'Staff' : 'Student');
          const targetLink = reservation.userType === 'HOD' ? '/hod/library' : (reservation.userType === 'Staff' ? '/staff/library' : '/student/library');
          await sendNotification(req, {
            title: 'Reserved Book Issued 📚',
            message: `"${book.title}" has been issued to you. Due Date: ${finalDueDate.toLocaleDateString()}.`,
            type: 'success',
            link: targetLink,
            recipient: reservation.userId,
            roles: [targetRole]
          });
        } catch (notifErr) {
          console.warn('Issue reservation notification warning:', notifErr.message);
        }

        res.json({
          message: 'Reserved book issued successfully',
          reservation,
          transaction: savedTransaction,
          bookCopy: selectedCopy
        });
      } catch (issueErr) {
        if (selectedCopy && previousCopyStatus) {
          selectedCopy.status = previousCopyStatus;
          await selectedCopy.save();
        }
        book.availableCopies = previousAvailableCopies;
        await book.save();
        throw issueErr;
      }
    } catch (error) {
      console.error('Issue reservation error:', error);
      res.status(500).json({
        message: error.message || 'Failed to issue reserved book'
      });
    }
  }
);

router.get(
  '/books',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const { department, category, search } = req.query;
      const tenantFilter = getTenantFilter(req);

      const allBooks = await Book.find(tenantFilter).sort({ title: 1 }).lean();
      let mergedBooks = allBooks || [];

      if (department && department !== 'All Departments') {
        mergedBooks = mergedBooks.filter(b => (b.department || '').toLowerCase() === department.toLowerCase());
      }
      if (category && category !== 'All Categories') {
        mergedBooks = mergedBooks.filter(b => (b.category || '').toLowerCase() === category.toLowerCase());
      }
      if (search) {
        const s = search.toLowerCase();
        mergedBooks = mergedBooks.filter(b =>
          (b.title || '').toLowerCase().includes(s) ||
          (b.author || '').toLowerCase().includes(s) ||
          (b.bookId || '').toLowerCase().includes(s) ||
          (b.isbn || '').toLowerCase().includes(s)
        );
      }

      const formattedBooks = mergedBooks.map(b => {
        const total = Number(b.totalCopies ?? b.copies ?? 1);
        const avail = b.availableCopies !== undefined ? Number(b.availableCopies) : (b.available !== undefined ? Number(b.available) : total);
        return {
          ...b,
          totalCopies: total,
          availableCopies: Math.max(0, avail),
          status: avail > 0 ? 'Available' : 'Out of Stock'
        };
      });

      res.json(formattedBooks);
    } catch (err) {
      console.error('GET /library/books:', err);
      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   CREATE BOOK
   ========================================================= */

router.post(
  '/books',
  protect,
  authorize('Admin', 'Sub Admin', 'HOD', 'Principal', 'Librarian'),
  collegeScope,
  async (req, res) => {
    try {
      const {
        bookId,
        title,
        author,
        publisher,
        edition,
        category,
        department,
        subject,
        isbn,
        totalCopies,
        rackNumber,
        shelfNumber,
        coverImage
      } = req.body;

      if (!bookId || !title || !author || !category || !department) {
        return res.status(400).json({
          message:
            'Book ID, title, author, category and department are required'
        });
      }

      const copies = Number(totalCopies);

      if (!Number.isInteger(copies) || copies < 1) {
        return res.status(400).json({
          message: 'Total copies must be at least 1'
        });
      }

      const authCollegeId = getAuthorizedCollegeId(req);
      const collegeId = (req.user?.role === 'Super Admin' && req.body.collegeId)
        ? String(req.body.collegeId).trim()
        : authCollegeId;

      if (!collegeId || collegeId === 'system') {
        return res.status(400).json({
          message: 'Authorized college ID is required to create a book'
        });
      }

      const existingBook = await Book.findOne({
        $or: [
          { collegeId, bookId },
          { tenantId: collegeId, bookId }
        ]
      });

      if (existingBook) {
        return res.status(400).json({
          message: 'Book ID already exists in this college'
        });
      }

      const newBook = new Book({
        bookId,
        title,
        author,
        publisher,
        edition,
        category,
        department,
        subject,
        isbn,
        totalCopies: copies,
        availableCopies: copies,
        rackNumber,
        shelfNumber,
        coverImage,
        status: 'Available',
        collegeId,
        tenantId: collegeId
      });

      const savedBook = await newBook.save();

      // Automatically generate initial physical BookCopy items
      try {
        const copyDocs = [];
        for (let i = 1; i <= copies; i++) {
          copyDocs.push({
            bookId: savedBook._id,
            copyNumber: i,
            barcode: `${savedBook.bookId}-C${String(i).padStart(3, '0')}`,
            accessionNumber: `ACC-${savedBook.bookId}-${String(i).padStart(3, '0')}`,
            status: 'Available',
            condition: 'New',
            rackNumber: rackNumber || 'Rack-1',
            shelfNumber: shelfNumber || 'Shelf-1',
            collegeId,
            tenantId: collegeId
          });
        }
        if (copyDocs.length > 0) {
          await BookCopy.insertMany(copyDocs);
        }
      } catch (copyErr) {
        console.warn('Auto-create book copies warning:', copyErr.message);
      }

      res.status(201).json(savedBook);
    } catch (err) {
      console.error('POST /library/books:', err);
      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   REQUEST BOOK
   ========================================================= */

router.post(
  '/request',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const { bookId } = req.body;

      const userId = getUserId(req);
      const userType = getUserType(req);

      if (!bookId) {
        return res.status(400).json({
          message: 'Book ID is required'
        });
      }

      const book = await Book.findOne({
        _id: bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found in your college library catalog'
        });
      }

      const possibleUserIds = Array.from(new Set([
        userId,
        req.user?.referenceId,
        req.user?.id,
        req.user?._id ? String(req.user._id) : null,
        req.user?.email,
        req.user?.name
      ].filter(Boolean)));

      const existingTransaction = await LibraryTransaction.findOne({
        bookId: book._id,
        userId: { $in: possibleUserIds },
        status: { $in: ['Pending', 'Approved', 'Reserved', 'Issued', 'Overdue'] },
        ...getTenantFilter(req)
      });

      const authCollegeId = getAuthorizedCollegeId(req);
      const tenantVal = book.collegeId || authCollegeId;

      if (existingTransaction) {
        // Guarantee reservation is synced so it appears in Librarian Reservations tab
        try {
          await LibraryReservation.findOneAndUpdate(
            { bookId: book._id, userId: existingTransaction.userId, ...getTenantFilter(req) },
            {
              bookId: book._id,
              userId: existingTransaction.userId,
              userType,
              status: ['Issued', 'Overdue'].includes(existingTransaction.status) ? 'Completed' : (existingTransaction.status || 'Pending'),
              requestDate: existingTransaction.requestDate || existingTransaction.createdAt || new Date(),
              collegeId: tenantVal,
              tenantId: tenantVal
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (syncErr) {
          console.warn('Sync reservation on existing tx error:', syncErr);
        }

        if (['Pending', 'Approved', 'Reserved'].includes(existingTransaction.status)) {
          return res.status(200).json({
            message: 'Your request for this book has already been submitted and is pending librarian approval.',
            transaction: existingTransaction
          });
        }

        return res.status(400).json({
          message: 'You currently have an active borrowed loan for this book.'
        });
      }

      const transaction = new LibraryTransaction({
        bookId: book._id,
        userId,
        userType,
        status: 'Pending',
        collegeId: tenantVal,
        tenantId: tenantVal
      });

      const savedTransaction = await transaction.save();

      // Automatically sync as a LibraryReservation record so it appears in Reservations tab
      try {
        await LibraryReservation.findOneAndUpdate(
          {
            bookId: book._id,
            userId,
            ...getTenantFilter(req)
          },
          {
            bookId: book._id,
            userId,
            userType,
            status: 'Pending',
            requestDate: new Date(),
            collegeId: tenantVal,
            tenantId: tenantVal
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (syncErr) {
        console.warn('Auto-create reservation on request error:', syncErr);
      }

      try {
        await sendNotification(req, {
          title: 'New Book Loan Request 📖',
          message: `${req.user?.name || userId} requested "${book.title}".`,
          type: 'info',
          link: '/librarian/issued',
          roles: ['Librarian', 'Admin', 'Super Admin']
        });
      } catch (e) {
        console.warn('Library request notification failed', e);
      }

      res.status(201).json(savedTransaction);
    } catch (err) {
      console.error('POST /library/request:', err);
      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   MY TRANSACTIONS
   ========================================================= */

router.get(
  '/my-transactions',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const possibleIds = new Set();
      if (req.user?._id) possibleIds.add(String(req.user._id));
      if (req.user?.id) possibleIds.add(String(req.user.id));
      if (req.user?.referenceId) possibleIds.add(String(req.user.referenceId));
      if (req.user?.studentId) possibleIds.add(String(req.user.studentId));
      if (req.user?.rollNo) possibleIds.add(String(req.user.rollNo));
      if (req.user?.email) possibleIds.add(String(req.user.email));

      const isStudent = req.user?.role === 'Student';
      const isStaff = req.user?.role === 'Staff' || req.user?.role === 'Teacher';
      const isHod = req.user?.role === 'HOD' || String(req.user?.role).toLowerCase() === 'hod';

      if (isStudent) {
        try {
          const studentQueries = [];
          if (req.user?.email) studentQueries.push({ email: req.user.email });
          if (req.user?.name) studentQueries.push({ name: { $regex: new RegExp(`^${req.user.name.trim()}$`, 'i') } });
          if (req.user?.referenceId) {
            studentQueries.push({ id: req.user.referenceId });
            studentQueries.push({ referenceId: req.user.referenceId });
            studentQueries.push({ rollNo: req.user.referenceId });
          }
          if (req.user?.studentId) {
            studentQueries.push({ id: req.user.studentId });
            studentQueries.push({ studentId: req.user.studentId });
          }

          if (studentQueries.length > 0) {
            const studentDocs = await Student.find({ $or: studentQueries }).lean();
            for (const studentDoc of studentDocs) {
              if (studentDoc._id) possibleIds.add(String(studentDoc._id));
              if (studentDoc.id) possibleIds.add(String(studentDoc.id));
              if (studentDoc.referenceId) possibleIds.add(String(studentDoc.referenceId));
              if (studentDoc.studentId) possibleIds.add(String(studentDoc.studentId));
              if (studentDoc.rollNo) possibleIds.add(String(studentDoc.rollNo));
              if (studentDoc.name) possibleIds.add(String(studentDoc.name));
              if (studentDoc.email) possibleIds.add(String(studentDoc.email));
            }
          }
        } catch (e) {
          console.warn('my-transactions student resolution error:', e);
        }
      } else if (isStaff || isHod) {
        try {
          const staffQueries = [];
          if (req.user?.email) staffQueries.push({ email: req.user.email });
          if (req.user?.name) staffQueries.push({ name: { $regex: new RegExp(`^${req.user.name.trim()}$`, 'i') } });
          if (req.user?.referenceId) {
            staffQueries.push({ id: req.user.referenceId });
            staffQueries.push({ staffId: req.user.referenceId });
          }

          if (staffQueries.length > 0) {
            const staffDocs = await Staff.find({ $or: staffQueries }).lean();
            for (const s of staffDocs) {
              if (s._id) possibleIds.add(String(s._id));
              if (s.id) possibleIds.add(String(s.id));
              if (s.staffId) possibleIds.add(String(s.staffId));
              if (s.name) possibleIds.add(String(s.name));
              if (s.email) possibleIds.add(String(s.email));
            }
            const userDocs = await User.find({ $or: staffQueries }).lean();
            for (const u of userDocs) {
              if (u._id) possibleIds.add(String(u._id));
              if (u.id) possibleIds.add(String(u.id));
              if (u.referenceId) possibleIds.add(String(u.referenceId));
              if (u.name) possibleIds.add(String(u.name));
              if (u.email) possibleIds.add(String(u.email));
            }
          }
        } catch (e) {
          console.warn('my-transactions staff/hod resolution error:', e);
        }
      }

      const idList = Array.from(possibleIds).filter(Boolean);
      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      let transactions = await LibraryTransaction.find({
        $and: [
          tenantFilter,
          {
            $or: [
              { userId: { $in: idList } },
              { userId: { $in: idList.map(id => new RegExp(`^${id}$`, 'i')) } }
            ]
          }
        ]
      })
        .populate('bookId')
        .populate('bookCopyId')
        .sort({ createdAt: -1 });

      // Auto-assign physical copies for issued/overdue transactions if copy is unlinked
      for (const tx of transactions) {
        if (!tx.bookCopyId && (tx.status === 'Issued' || tx.status === 'Overdue') && tx.bookId) {
          try {
            const bId = tx.bookId._id || tx.bookId;
            let copy = await BookCopy.findOne({ bookId: bId, status: 'Issued', ...tenantFilter });
            if (!copy) {
              copy = await BookCopy.findOne({ bookId: bId, ...tenantFilter });
            }
            if (!copy) {
              const bookDoc = typeof tx.bookId === 'object' ? tx.bookId : await Book.findOne({ _id: bId, ...tenantFilter });
              if (bookDoc) {
                const assignedCollege = tx.collegeId || authCollegeId || bookDoc.collegeId;
                copy = await BookCopy.create({
                  bookId: bId,
                  copyNumber: 1,
                  barcode: `${bookDoc.bookId || 'LIB'}-C001`,
                  accessionNumber: `ACC-${bookDoc.bookId || 'LIB'}-001`,
                  status: 'Issued',
                  condition: 'Good',
                  rackNumber: bookDoc.rackNumber || 'R01',
                  shelfNumber: bookDoc.shelfNumber || 'S01',
                  collegeId: assignedCollege,
                  tenantId: assignedCollege
                });
              }
            }
            if (copy) {
              tx.bookCopyId = copy;
              await LibraryTransaction.findOneAndUpdate(
                { _id: tx._id, ...tenantFilter },
                { bookCopyId: copy._id }
              );
            }
          } catch (copyErr) {
            console.warn('Auto-link copy warning:', copyErr.message);
          }
        }
      }

      const updatedTransactions = transactions.map(
        updateOverdueStatus
      );

      res.json(updatedTransactions);
    } catch (err) {
      console.error('GET /library/my-transactions:', err);
      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   ISSUE BOOK
   ========================================================= */

router.put(
  '/transactions/:id/approve',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Staff',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);
      const now = new Date();
      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...tenantFilter
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college library records'
        });
      }

      transaction.status = 'Approved';
      transaction.approvedDate = now;
      const savedTransaction = await transaction.save();

      // Sync reservation
      const txCollege = transaction.collegeId || authCollegeId;
      await LibraryReservation.findOneAndUpdate(
        { bookId: transaction.bookId, userId: transaction.userId, ...tenantFilter },
        {
          bookId: transaction.bookId,
          userId: transaction.userId,
          userType: transaction.userType || 'Student',
          status: 'Approved',
          approvedDate: now,
          collegeId: txCollege,
          tenantId: txCollege
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json(savedTransaction);
    } catch (err) {
      console.error('PUT /library/transactions/:id/approve:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.put(
  '/transactions/:id/issue',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Staff',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...tenantFilter
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college library records'
        });
      }

      if (!['Pending', 'Approved', 'Reserved'].includes(transaction.status)) {
        return res.status(400).json({
          message: `Cannot issue request with status '${transaction.status}'`
        });
      }

      let book = await Book.findOne({
        _id: transaction.bookId,
        ...tenantFilter
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found in your college catalog'
        });
      }

      const issueDate = new Date();
      const daysToAdd = (transaction.userType === 'Staff' || transaction.userType === 'HOD') ? 30 : 14;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      // Resolve physical copy
      let selectedCopy = null;
      if (transaction.bookCopyId) {
        selectedCopy = await BookCopy.findOne({
          _id: transaction.bookCopyId,
          ...tenantFilter
        });
      }

      // If no copy assigned yet, auto-select first available copy
      if (!selectedCopy || selectedCopy.status !== 'Available') {
        const availableCopy = await BookCopy.findOne({
          bookId: book._id,
          status: 'Available',
          ...tenantFilter
        }).sort({ createdAt: 1 });

        if (availableCopy) {
          selectedCopy = availableCopy;
          transaction.bookCopyId = availableCopy._id;
        }
      }

      if (selectedCopy && selectedCopy.status === 'Available') {
        selectedCopy.status = 'Issued';
        await selectedCopy.save();
      }

      transaction.status = 'Issued';
      transaction.issueDate = issueDate;
      transaction.dueDate = dueDate;
      transaction.fineAmount = 0;

      const savedTransaction = await transaction.save();

      // Inventory decreases upon actual issuance
      const currentAvail = book.availableCopies !== undefined ? Number(book.availableCopies) : (book.available !== undefined ? Number(book.available) : (Number(book.totalCopies) || 1));
      book.availableCopies = Math.max(0, currentAvail - 1);
      book.status = book.availableCopies > 0 ? 'Available' : 'Out of Stock';
      await book.save();

      // Synchronize matching LibraryReservation to Completed
      try {
        await LibraryReservation.updateMany(
          {
            bookId: book._id,
            userId: transaction.userId,
            status: { $in: ['Pending', 'Approved', 'Reserved'] },
            ...tenantFilter
          },
          {
            status: 'Completed',
            approvedDate: transaction.approvedDate || issueDate
          }
        );
      } catch (resSyncErr) {
        console.warn('Sync reservation to completed error:', resSyncErr);
      }

      try {
        const targetRole = transaction.userType === 'HOD' ? 'HOD' : (transaction.userType === 'Staff' ? 'Staff' : 'Student');
        const targetLink = transaction.userType === 'HOD' ? '/hod/library' : (transaction.userType === 'Staff' ? '/staff/library' : '/student/library');
        await sendNotification(req, {
          title: 'Book Request Approved! 📚',
          message: `Your request for "${book.title}" has been approved. Due Date: ${dueDate.toLocaleDateString()}. You can now collect your book.`,
          type: 'success',
          link: targetLink,
          recipient: transaction.userId,
          roles: [targetRole]
        });
      } catch (e) {
        console.warn('Library issue approval notification failed', e);
      }

      res.json(savedTransaction);
    } catch (err) {
      console.error(
        'PUT /library/transactions/:id/issue:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   RETURN BOOK
   ========================================================= */

router.put(
  '/transactions/:id/return',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Staff',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let transaction =
        await LibraryTransaction.findOne({
          _id: req.params.id,
          ...tenantFilter
        }).populate('bookId');

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college library records'
        });
      }

      if (
        transaction.status !== 'Issued' &&
        transaction.status !== 'Overdue'
      ) {
        return res.status(400).json({
          message: 'Book is not currently issued'
        });
      }

      const returnDate = new Date();

      const fineAmount = calculateFine(
        transaction.dueDate,
        returnDate
      );

      transaction.status = 'Returned';
      transaction.returnDate = returnDate;
      transaction.fineAmount = fineAmount;

      // Mark the physical copy as available again
      if (transaction.bookCopyId) {
        const copy = await BookCopy.findOne({
          _id: transaction.bookCopyId,
          ...tenantFilter
        });

        if (copy) {
          copy.status = 'Available';
          await copy.save();
        }
      }

      await transaction.save();

      const bookId = transaction.bookId?._id || transaction.bookId;
      let book = await Book.findOne({
        _id: bookId,
        ...tenantFilter
      });

      if (book) {
        const maxCopies = Number(book.totalCopies || 1);
        const currentAvail = Number(book.availableCopies || 0);

        book.availableCopies = Math.min(
          maxCopies,
          currentAvail + 1
        );

        book.status =
          book.availableCopies > 0
            ? 'Available'
            : 'Out of Stock';

        await book.save();
      }

      try {
        const targetRole = transaction.userType === 'HOD' ? 'HOD' : (transaction.userType === 'Staff' ? 'Staff' : 'Student');
        const targetLink = transaction.userType === 'HOD' ? '/hod/library' : (transaction.userType === 'Staff' ? '/staff/library' : '/student/library');
        await sendNotification(req, {
          title: 'Book Return Settled ✅',
          message: `"${book?.title || 'Book'}" has been successfully returned and restocked in library records.`,
          type: 'success',
          link: targetLink,
          recipient: transaction.userId,
          roles: [targetRole]
        });
      } catch (e) {
        console.warn('Library return notification failed', e);
      }

      res.json(transaction);
    } catch (err) {
      console.error(
        'PUT /library/transactions/:id/return:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   REJECT REQUEST
   ========================================================= */

router.put(
  '/transactions/:id/reject',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Staff',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let transaction =
        await LibraryTransaction.findOne({
          _id: req.params.id,
          ...tenantFilter
        });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college library records'
        });
      }

      if (!['Pending', 'Approved', 'Reserved'].includes(transaction.status)) {
        return res.status(400).json({
          message: `Cannot reject request with status '${transaction.status}'`
        });
      }

      transaction.status = 'Rejected';
      const savedTransaction = await transaction.save();

      try {
        await LibraryReservation.updateMany(
          {
            bookId: transaction.bookId,
            userId: transaction.userId,
            status: { $in: ['Pending', 'Approved', 'Reserved'] },
            ...tenantFilter
          },
          { status: 'Rejected' }
        );
      } catch (rErr) {
        console.warn('Sync reservation to rejected error:', rErr);
      }

      res.json(savedTransaction);
    } catch (err) {
      console.error(
        'PUT /library/transactions/:id/reject:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   ALL TRANSACTIONS
   ========================================================= */

router.get(
  '/transactions',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Staff',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const { department } = req.query;

      const transactions =
        await LibraryTransaction.find({
          ...getTenantFilter(req)
        })
          .populate('bookId')
          .populate('bookCopyId')
          .sort({ createdAt: -1 });

      let filterDept = department;

      const filtered = filterDept
        ? transactions.filter(
            (transaction) => {
              const bDept = (transaction.bookId?.department || transaction.bookId?.category || '').toLowerCase();
              const target = filterDept.toLowerCase();
              return bDept.includes(target) || target.includes(bDept);
            }
          )
        : transactions;

      const updatedTransactions = await Promise.all(
        filtered.map(async (transaction) => {
          const beforeFine = Number(transaction.fineAmount || 0);

          updateOverdueStatus(transaction);

          const fine = Number(transaction.fineAmount || 0);
          const paid = Number(transaction.finePaid || 0);

          transaction.finePaid = paid;
          transaction.fineStatus =
            fine <= 0
              ? 'No Fine'
              : paid >= fine
                ? 'Paid'
                : 'Pending';

          if (
            transaction.status === 'Overdue' &&
            fine > 0 &&
            fine !== beforeFine
          ) {
            await transaction.save();
          }

          return transaction;
        })
      );

      res.json(updatedTransactions);
    } catch (err) {
      console.error(
        'GET /library/transactions:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   REPAIR TRANSACTION PHYSICAL COPY
   ========================================================= */

router.put(
  '/transactions/:id/attach-copy',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const { bookCopyId } = req.body;

      if (!bookCopyId) {
        return res.status(400).json({
          message: 'Book copy ID is required'
        });
      }

      const tenantFilter = getTenantFilter(req);

      const transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...tenantFilter
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college library records'
        });
      }

      const copy = await BookCopy.findOne({
        _id: bookCopyId,
        bookId: transaction.bookId,
        ...tenantFilter
      });

      if (!copy) {
        return res.status(404).json({
          message: 'Physical book copy not found in your college catalog'
        });
      }

      transaction.bookCopyId = copy._id;
      await transaction.save();

      copy.status = 'Issued';
      await copy.save();

      const updatedTransaction =
        await LibraryTransaction.findOne({
          _id: transaction._id,
          ...tenantFilter
        })
          .populate('bookId')
          .populate('bookCopyId');

      res.json({
        message: 'Physical book copy attached successfully',
        transaction: updatedTransaction
      });
    } catch (err) {
      console.error(
        'PUT /library/transactions/:id/attach-copy:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   MANUAL ISSUE
   ========================================================= */

router.post(
  '/transactions/manual-issue',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const {
        bookId,
        bookCopyId,
        userId,
        userType,
        dueDate
      } = req.body;

      if (
        !bookId ||
        !userId ||
        !userType ||
        !dueDate
      ) {
        return res.status(400).json({
          message:
            'Book, user, user type and due date are required'
        });
      }

      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      let book = await Book.findOne({
        _id: bookId,
        ...tenantFilter
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found in your college catalog'
        });
      }

      const tenantId = authCollegeId || book.collegeId;

      let selectedCopy = null;

      if (bookCopyId) {
        selectedCopy = await BookCopy.findOne({
          _id: bookCopyId,
          bookId: book._id,
          ...tenantFilter
        });

        if (!selectedCopy) {
          return res.status(404).json({
            message: 'Selected physical book copy not found in your college inventory'
          });
        }

        if (selectedCopy.status !== 'Available') {
          return res.status(400).json({
            message: `Selected book copy is currently ${selectedCopy.status}`
          });
        }
      } else {
        selectedCopy = await BookCopy.findOne({
          bookId: book._id,
          status: 'Available',
          ...tenantFilter
        }).sort({ createdAt: 1 });
      }

      const currentAvail =
        book.availableCopies !== undefined
          ? Number(book.availableCopies)
          : (
              book.available !== undefined
                ? Number(book.available)
                : Number(book.totalCopies) || 1
            );

      if (currentAvail <= 0) {
        return res.status(400).json({
          message: 'No available copies for this book'
        });
      }

      let previousCopyStatus = null;
      if (selectedCopy) {
        previousCopyStatus = selectedCopy.status;
        selectedCopy.status = 'Issued';
        await selectedCopy.save();
      }

      const previousAvailableCopies = book.availableCopies;

      try {
        const transaction = new LibraryTransaction({
          bookId: book._id,
          bookCopyId: selectedCopy ? selectedCopy._id : undefined,
          userId,
          userType: ['Student', 'Staff', 'HOD'].includes(userType)
            ? userType
            : 'Student',
          status: 'Issued',
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          fineAmount: 0,
          collegeId: tenantId,
          tenantId: tenantId
        });

        const savedTransaction = await transaction.save();

        book.availableCopies = Math.max(0, currentAvail - 1);
        book.status =
          book.availableCopies > 0
            ? 'Available'
            : 'Out of Stock';

        await book.save();

        try {
          const targetRole = userType === 'HOD' ? 'HOD' : (userType === 'Staff' ? 'Staff' : 'Student');
          const targetLink = userType === 'HOD' ? '/hod/library' : (userType === 'Staff' ? '/staff/library' : '/student/library');
          await sendNotification(req, {
            title: 'New Book Issued to You 📖',
            message: `"${book.title}" has been issued to your library account. Due Date: ${new Date(dueDate).toLocaleDateString()}.`,
            type: 'info',
            link: targetLink,
            recipient: userId,
            roles: [targetRole]
          });
        } catch (e) {
          console.warn('Manual issue notification failed', e);
        }

        res.status(201).json({
          message: 'Book issued successfully',
          transaction: savedTransaction,
          bookCopy: selectedCopy
        });
      } catch (transactionError) {
        if (selectedCopy && previousCopyStatus) {
          selectedCopy.status = previousCopyStatus;
          await selectedCopy.save();
        }

        book.availableCopies = previousAvailableCopies;
        await book.save();

        throw transactionError;
      }
    } catch (err) {
      console.error(
        'POST /library/transactions/manual-issue:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

router.put(
  '/transactions/:id/pay-fine',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...tenantFilter
      }).populate('bookId');

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found in your college library records'
        });
      }

      const fineAmount = Number(transaction.fineAmount || 0);
      const alreadyPaid = Number(transaction.finePaid || 0);
      const balance = Math.max(0, fineAmount - alreadyPaid);
      const amount = Number(req.body.amount || balance);

      const methods = [
        'Cash',
        'UPI',
        'Card',
        'Net Banking',
        'Bank Transfer',
        'Other'
      ];

      const paymentMethod = methods.includes(req.body.paymentMethod)
        ? req.body.paymentMethod
        : (req.user?.role === 'Student' ? 'UPI' : 'Cash');

      const remarks = String(req.body.remarks || '').trim() || (req.user?.role === 'Student' ? 'Online Fine Settlement' : 'Library Desk Collection');

      if (balance <= 0) {
        return res.status(400).json({
          message: 'Fine is already fully settled'
        });
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({
          message: 'Enter a valid payment amount'
        });
      }

      if (amount > balance) {
        return res.status(400).json({
          message: `Payment cannot exceed outstanding fine ₹${balance}`
        });
      }

      const year = new Date().getFullYear();

      const collegeId = transaction.collegeId || authCollegeId;

      const lastPayment = await LibraryFinePayment.findOne({
        ...tenantFilter
      }).sort({ createdAt: -1 });

      let sequence = 1;

      if (lastPayment?.receiptNumber) {
        const match = lastPayment.receiptNumber.match(
          /FR-\d{4}-(\d+)$/
        );

        if (match) {
          sequence = Number(match[1]) + 1;
        }
      }

      const receiptNumber =
        `FR-${year}-${String(sequence).padStart(4, '0')}`;

      transaction.finePaid = alreadyPaid + amount;

      transaction.fineStatus =
        transaction.finePaid >= fineAmount
          ? 'Paid'
          : 'Pending';

      transaction.finePaidDate = new Date();

      await transaction.save();

      const payment = await LibraryFinePayment.create({
        transactionId: transaction._id,
        receiptNumber,
        collegeId,
        tenantId: collegeId,
        userId: transaction.userId,
        userType: transaction.userType || (req.user?.role === 'Student' ? 'Student' : 'Student'),
        bookId: transaction.bookId?._id || transaction.bookId,
        amount,
        paymentMethod,
        paymentDate: new Date(),
        collectedBy: req.user?._id,
        remarks
      });

      try {
        await sendNotification(req, {
          title: 'Fine Payment Successful 🧾',
          message: `₹${amount} paid for "${transaction.bookId?.title || 'Library Book'}". Receipt: ${receiptNumber}`,
          type: 'success',
          link: '/student/library',
          recipient: transaction.userId,
          roles: ['Student']
        });
      } catch (notifErr) {
        console.warn('Fine payment notification warning:', notifErr.message);
      }

      res.json({
        message: 'Fine payment completed successfully',
        transaction,
        payment,
        receiptNumber
      });
    } catch (error) {
      console.error('Pay fine error:', error);

      res.status(500).json({
        message: 'Failed to record fine payment'
      });
    }
  }
);

/* =========================================================
   BOOK COPY MANAGEMENT
   ========================================================= */

/*
 * Get copies for a book
 */
router.get(
  '/books/:bookId/copies',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);

      const book = await Book.findOne({
        _id: req.params.bookId,
        ...tenantFilter
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found'
        });
      }

      const copies = await BookCopy.find({
        bookId: book._id,
        ...tenantFilter
      }).sort({
        accessionNumber: 1
      });

      res.json(copies);
    } catch (err) {
      console.error(
        'GET /library/books/:bookId/copies:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/*
 * Create one physical copy
 */
router.post(
  '/books/:bookId/copies',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'HOD',
    'Principal',
    'Librarian'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const {
        accessionNumber,
        barcode,
        rackNumber,
        shelfNumber,
        condition,
        purchaseDate,
        price
      } = req.body;

      if (!accessionNumber) {
        return res.status(400).json({
          message: 'Accession number is required'
        });
      }

      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      const book = await Book.findOne({
        _id: req.params.bookId,
        ...tenantFilter
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found in your college catalog'
        });
      }

      const copyCollegeId = book.collegeId || authCollegeId;

      const existingCopy =
        await BookCopy.findOne({
          collegeId: copyCollegeId,
          accessionNumber
        });

      if (existingCopy) {
        return res.status(400).json({
          message:
            'Accession number already exists in your college library'
        });
      }

      if (barcode) {
        const existingBarcode =
          await BookCopy.findOne({
            collegeId: copyCollegeId,
            barcode
          });

        if (existingBarcode) {
          return res.status(400).json({
            message:
              'Barcode already exists in your college library'
          });
        }
      }

      const copy = new BookCopy({
        bookId: book._id,
        accessionNumber,
        barcode,
        rackNumber:
          rackNumber || book.rackNumber,
        shelfNumber:
          shelfNumber || book.shelfNumber,
        condition:
          condition || 'Good',
        purchaseDate,
        price: Number(price || 0),
        status: 'Available',
        collegeId: copyCollegeId,
        tenantId: copyCollegeId
      });

      const savedCopy = await copy.save();

      /*
       * Keep existing Book counters synchronized.
       */
      book.totalCopies += 1;
      book.availableCopies += 1;
      book.status = 'Available';

      await book.save();

      res.status(201).json(savedCopy);
    } catch (err) {
      console.error(
        'POST /library/books/:bookId/copies:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/*
 * Update physical copy
 */
router.put(
  '/copies/:id',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'HOD',
    'Principal',
    'Librarian'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const copy = await BookCopy.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      });

      if (!copy) {
        return res.status(404).json({
          message: 'Book copy not found'
        });
      }

      const allowedFields = [
        'barcode',
        'rackNumber',
        'shelfNumber',
        'condition',
        'status',
        'purchaseDate',
        'price'
      ];

      allowedFields.forEach((field) => {
        if (
          req.body[field] !== undefined
        ) {
          copy[field] = req.body[field];
        }
      });

      const updatedCopy =
        await copy.save();

      /*
       * Synchronize parent Book availability.
       */
      const allCopies =
        await BookCopy.find({
          bookId: copy.bookId,
          ...getTenantFilter(req)
        }).lean();

      const totalCopies =
        allCopies.length;

      const availableCopies =
        allCopies.filter(
          (item) =>
            item.status === 'Available'
        ).length;

      await Book.findOneAndUpdate(
        {
          _id: copy.bookId,
          ...getTenantFilter(req)
        },
        {
          totalCopies,
          availableCopies,
          status:
            availableCopies > 0
              ? 'Available'
              : 'Out of Stock'
        }
      );

      res.json(updatedCopy);
    } catch (err) {
      console.error(
        'PUT /library/copies/:id:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/*
 * Delete physical copy
 */
router.delete(
  '/copies/:id',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'HOD',
    'Principal',
    'Librarian'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const copy = await BookCopy.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      });

      if (!copy) {
        return res.status(404).json({
          message: 'Book copy not found'
        });
      }

      if (copy.status === 'Issued') {
        return res.status(400).json({
          message:
            'Issued book copy cannot be deleted'
        });
      }

      const bookId = copy.bookId;

      await BookCopy.deleteOne({
        _id: copy._id
      });

      const remainingCopies =
        await BookCopy.find({
          bookId,
          ...getTenantFilter(req)
        }).lean();

      const totalCopies =
        remainingCopies.length;

      const availableCopies =
        remainingCopies.filter(
          (item) =>
            item.status === 'Available'
        ).length;

      await Book.findOneAndUpdate(
        {
          _id: bookId,
          ...getTenantFilter(req)
        },
        {
          totalCopies,
          availableCopies,
          status:
            availableCopies > 0
              ? 'Available'
              : 'Out of Stock'
        }
      );

      res.json({
        message:
          'Book copy deleted successfully'
      });
    } catch (err) {
      console.error(
        'DELETE /library/copies/:id:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   DIAGNOSTIC ROUTE
   ========================================================= */

router.get(
  '/__diagnostic',
  protect,
  authorize('Admin', 'Super Admin', 'Librarian'),
  async (req, res) => {
    try {
      const allBooks = await Book.find({}).lean();
      const allTransactions = await LibraryTransaction.find({}).lean();
      const allCopies = await BookCopy.find({}).lean();
      const unassignedBooks = allBooks.filter(b => !b.collegeId || b.collegeId === 'unassigned_college');
      const unassignedTx = allTransactions.filter(t => !t.collegeId || t.collegeId === 'unassigned_college');
      const unassignedCopies = allCopies.filter(c => !c.collegeId || c.collegeId === 'unassigned_college');

      res.json({
        currentUser: {
          id: req.user?._id,
          name: req.user?.name,
          role: req.user?.role,
          tenantId: req.user?.tenantId,
          collegeId: req.user?.collegeId,
          requestCollegeId: req.collegeId,
          authorizedCollegeId: getAuthorizedCollegeId(req),
          tenantFilter: getTenantFilter(req)
        },
        counts: {
          books: allBooks.length,
          transactions: allTransactions.length,
          copies: allCopies.length,
          unassignedLegacy: {
            books: unassignedBooks.length,
            transactions: unassignedTx.length,
            copies: unassignedCopies.length
          }
        },
        books: allBooks,
        transactions: allTransactions,
        copies: allCopies,
        indexes: await Book.collection.indexes()
      });
    } catch (error) {
      console.error('Library diagnostic error:', error);
      res.status(500).json({
        message: error.message
      });
    }
  }
);

/* =========================================================
   GET ALL BORROWERS (STUDENTS & STAFF)
   ========================================================= */

router.get(
  '/borrowers',
  protect,
  authorize('Admin', 'Super Admin', 'Sub Admin', 'Principal', 'HOD', 'Librarian', 'Library', 'Staff'),
  collegeScope,
  async (req, res) => {
    try {
      const authCollegeId = getAuthorizedCollegeId(req);
      const isSuperAdmin = req.user?.role === 'Super Admin';

      if (!isSuperAdmin && !authCollegeId) {
        return res.json([]);
      }

      const collegeFilter = (!isSuperAdmin || authCollegeId !== 'system')
        ? { $or: [{ collegeId: authCollegeId }, { tenantId: authCollegeId }] }
        : {};

      let students = await Student.find(collegeFilter).lean();

      const studentUserFilter = {
        role: { $regex: /^student$/i },
        ...collegeFilter
      };

      let studentUsers = await User.find(studentUserFilter)
        .select('-password')
        .lean();

      // Fetch Staff Members
      let staffMembers = await Staff.find(collegeFilter).lean();

      // Fetch Staff / HOD Users
      const staffUserFilter = {
        role: { $in: ['Staff', 'HOD', 'Teacher', 'staff', 'hod'] },
        ...collegeFilter
      };
      let staffUsers = await User.find(staffUserFilter).select('-password').lean();

      const map = new Map();
      (students || []).forEach(s => {
        const id = s.id || s.referenceId || s.studentId || s.rollNo || (s._id ? String(s._id) : null);
        if (id) {
          map.set(String(id), {
            _id: s._id,
            id: id,
            referenceId: id,
            studentId: id,
            name: s.name || s.fullName || 'Student',
            email: s.email || '',
            dept: s.dept || s.department || 'General',
            department: s.dept || s.department || 'General',
            sem: s.sem || s.semester || 'Sem 1',
            rollNo: s.rollNo || id,
            role: 'Student',
            userType: 'Student'
          });
        }
      });

      (studentUsers || []).forEach(u => {
        const id = u.referenceId || u.studentId || u.id || u.rollNo || (u._id ? String(u._id) : null);
        if (id && !map.has(String(id))) {
          map.set(String(id), {
            _id: u._id,
            id: id,
            referenceId: id,
            studentId: id,
            name: u.name || u.fullName || 'Student',
            email: u.email || '',
            dept: u.department || u.dept || 'General',
            department: u.department || u.dept || 'General',
            sem: u.semester || u.sem || 'Sem 1',
            rollNo: u.rollNo || id,
            role: 'Student',
            userType: 'Student'
          });
        }
      });

      (staffMembers || []).forEach(stf => {
        const id = stf.id || stf.referenceId || (stf._id ? String(stf._id) : null);
        const isHod = stf.designation === 'HOD' || stf.role === 'HOD';
        const role = isHod ? 'HOD' : 'Staff';
        if (id) {
          map.set(String(id), {
            _id: stf._id,
            id: id,
            referenceId: id,
            staffId: id,
            name: stf.name || 'Faculty Staff',
            email: stf.email || '',
            dept: stf.dept || stf.department || 'General',
            department: stf.dept || stf.department || 'General',
            role: role,
            userType: role,
            designation: stf.designation || (isHod ? 'HOD' : 'Faculty')
          });
        }
      });

      (staffUsers || []).forEach(u => {
        const id = u.referenceId || u.id || (u._id ? String(u._id) : null);
        const isHod = String(u.role).toUpperCase() === 'HOD';
        const role = isHod ? 'HOD' : 'Staff';
        if (id && !map.has(String(id))) {
          map.set(String(id), {
            _id: u._id,
            id: id,
            referenceId: id,
            staffId: id,
            name: u.name || 'Faculty Staff',
            email: u.email || '',
            dept: u.department || u.dept || 'General',
            department: u.department || u.dept || 'General',
            role: role,
            userType: role,
            designation: u.role || (isHod ? 'HOD' : 'Faculty')
          });
        }
      });

      res.json(Array.from(map.values()));
    } catch (err) {
      console.error('GET /library/borrowers:', err);
      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   STUDENT / STAFF RETURN REQUEST
   ========================================================= */

router.post(
  '/return-requests',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const transactionId = req.body?.transactionId;

      if (!transactionId) {
        return res.status(400).json({
          message: 'Transaction ID is required'
        });
      }

      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      let transaction = await LibraryTransaction.findOne({
        _id: transactionId,
        ...tenantFilter
      });

      // If not in LibraryTransaction, check if it's in LibraryReservation
      if (!transaction) {
        const resv = await LibraryReservation.findOne({
          _id: transactionId,
          ...tenantFilter
        });
        if (resv) {
          transaction = await LibraryTransaction.findOne({
            bookId: resv.bookId,
            userId: resv.userId,
            ...tenantFilter
          });
        }
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Library transaction not found in your college records'
        });
      }

      const existingRequest = await LibraryReturnRequest.findOne({
        $or: [
          { transactionId: transaction._id },
          { bookId: transaction.bookId, userId: transaction.userId, status: 'Pending' }
        ],
        status: 'Pending',
        ...tenantFilter
      });

      if (existingRequest) {
        return res.status(200).json({
          message: 'Return request already submitted',
          request: existingRequest
        });
      }

      const collegeId = transaction.collegeId || authCollegeId;

      const returnRequest = await LibraryReturnRequest.create({
        transactionId: transaction._id,
        bookId: transaction.bookId?._id || transaction.bookId,
        bookCopyId: transaction.bookCopyId || null,
        userId: transaction.userId || req.user?._id || req.user?.id,
        userType: transaction.userType || 'Student',
        status: 'Pending',
        collegeId,
        tenantId: collegeId
      });

      const populatedRequest =
        await LibraryReturnRequest.findOne({ _id: returnRequest._id, ...tenantFilter })
          .populate('bookId')
          .populate('bookCopyId')
          .populate('transactionId');

      try {
        await sendNotification(req, {
          title: 'Book Return Requested 🔄',
          message: `${req.user?.name || 'A student'} requested to return book copy.`,
          type: 'info',
          link: '/librarian/issued',
          roles: ['Librarian', 'Admin', 'Super Admin']
        });
      } catch (notifErr) {
        console.warn('Return request notification warning:', notifErr.message);
      }

      res.status(201).json({
        message: 'Return request submitted successfully',
        request: populatedRequest
      });
    } catch (err) {
      console.error(
        'POST /library/return-requests:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   MY RETURN REQUESTS
   ========================================================= */

router.get(
  '/return-requests/my',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const possibleIds = new Set();

      if (req.user?._id) possibleIds.add(String(req.user._id));
      if (req.user?.id) possibleIds.add(String(req.user.id));
      if (req.user?.referenceId) possibleIds.add(String(req.user.referenceId));
      if (req.user?.studentId) possibleIds.add(String(req.user.studentId));
      if (req.user?.rollNo) possibleIds.add(String(req.user.rollNo));
      if (req.user?.email) possibleIds.add(String(req.user.email));
      if (req.user?.name) possibleIds.add(String(req.user.name));

      if (req.user?.staffId) possibleIds.add(String(req.user.staffId));
      if (req.user?.employeeId) possibleIds.add(String(req.user.employeeId));

      try {
        const studentDocs = await Student.find({
          $and: [
            tenantFilter,
            {
              $or: [
                { email: req.user?.email },
                { name: req.user?.name },
                { id: req.user?.referenceId },
                { referenceId: req.user?.referenceId },
                { rollNo: req.user?.referenceId }
              ]
            }
          ]
        }).lean();

        for (const s of (studentDocs || [])) {
          if (s._id) possibleIds.add(String(s._id));
          if (s.id) possibleIds.add(String(s.id));
          if (s.referenceId) possibleIds.add(String(s.referenceId));
          if (s.studentId) possibleIds.add(String(s.studentId));
          if (s.rollNo) possibleIds.add(String(s.rollNo));
        }
      } catch (e) {
        console.warn('Return requests my student ID lookup failed:', e.message);
      }

      try {
        const staffQueries = [];
        if (req.user?.email) staffQueries.push({ email: req.user.email });
        if (req.user?.name) staffQueries.push({ name: { $regex: new RegExp(`^${req.user.name.trim()}$`, 'i') } });
        if (req.user?.referenceId) {
          staffQueries.push({ id: req.user.referenceId });
          staffQueries.push({ staffId: req.user.referenceId });
        }
        if (req.user?.staffId) staffQueries.push({ staffId: req.user.staffId });

        if (staffQueries.length > 0) {
          const staffDocs = await Staff.find({
            $and: [
              tenantFilter,
              { $or: staffQueries }
            ]
          }).lean();
          for (const s of (staffDocs || [])) {
            if (s._id) possibleIds.add(String(s._id));
            if (s.id) possibleIds.add(String(s.id));
            if (s.staffId) possibleIds.add(String(s.staffId));
            if (s.name) possibleIds.add(String(s.name));
            if (s.email) possibleIds.add(String(s.email));
          }
          const userDocs = await User.find({
            $and: [
              tenantFilter,
              { $or: staffQueries }
            ]
          }).lean();
          for (const u of (userDocs || [])) {
            if (u._id) possibleIds.add(String(u._id));
            if (u.id) possibleIds.add(String(u.id));
            if (u.referenceId) possibleIds.add(String(u.referenceId));
            if (u.name) possibleIds.add(String(u.name));
            if (u.email) possibleIds.add(String(u.email));
          }
        }
      } catch (e) {
        console.warn('Return requests my staff/hod ID lookup failed:', e.message);
      }

      const idList = Array.from(possibleIds).filter(Boolean);

      let txIds = [];
      try {
        const userTransactions = await LibraryTransaction.find({
          $and: [
            tenantFilter,
            {
              $or: [
                { userId: { $in: idList } },
                { userId: { $in: idList.map(id => new RegExp(`^${id}$`, 'i')) } }
              ]
            }
          ]
        }).select('_id').lean();
        txIds = userTransactions.map(t => t._id);
      } catch (e) {}

      const orConditions = [
        { userId: { $in: idList } },
        { userId: { $in: idList.map(id => new RegExp(`^${id}$`, 'i')) } }
      ];
      if (txIds.length > 0) {
        orConditions.push({ transactionId: { $in: txIds } });
      }

      const requests = await LibraryReturnRequest.find({
        $and: [
          tenantFilter,
          { $or: orConditions }
        ]
      })
        .populate('bookId')
        .populate('bookCopyId')
        .populate('transactionId')
        .sort({ createdAt: -1 });

      res.json(requests);
    } catch (err) {
      console.error(
        'GET /library/return-requests/my:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   LIBRARIAN / HOD RETURN REQUEST MANAGEMENT
   ========================================================= */

router.get(
  '/return-requests',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const requests = await LibraryReturnRequest.find(tenantFilter)
        .populate('bookId')
        .populate('bookCopyId')
        .populate('transactionId')
        .sort({ createdAt: -1 });

      res.json(requests);
    } catch (err) {
      console.error(
        'GET /library/return-requests:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/*
 * Approve return request
 */
router.put(
  '/return-requests/:id/approve',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);

      const request = await LibraryReturnRequest.findOne({
        _id: req.params.id,
        ...tenantFilter
      });

      if (!request) {
        return res.status(404).json({
          message: 'Return request not found in your college records'
        });
      }

      if (request.status !== 'Pending') {
        return res.status(400).json({
          message: `Return request is already ${request.status}`
        });
      }

      const transaction = await LibraryTransaction.findOne({
        _id: request.transactionId,
        ...tenantFilter
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Library transaction not found in your college records'
        });
      }

      const now = new Date();

      /*
       * Calculate final fine at the time of return.
       */
      const fineAmount = calculateFine(
        transaction.dueDate,
        now
      );

      transaction.returnDate = now;
      transaction.status = 'Returned';
      transaction.fineAmount = fineAmount;

      const finePaid = Number(transaction.finePaid || 0);

      if (fineAmount <= 0) {
        transaction.fineStatus = 'No Fine';
      } else if (finePaid >= fineAmount) {
        transaction.fineStatus = 'Paid';
      } else {
        transaction.fineStatus = 'Pending';
      }

      await transaction.save();

      /*
       * Mark physical copy as available.
       */
      if (transaction.bookCopyId) {
        const copy = await BookCopy.findOne({
          _id: transaction.bookCopyId,
          ...tenantFilter
        });

        if (copy) {
          copy.status = 'Available';

          if (copy.condition === 'Lost') {
            copy.condition = 'Good';
          }

          await copy.save();
        }
      }

      /*
       * Recalculate Book counters from physical copies.
       */
      const copies = await BookCopy.find({
        bookId: transaction.bookId,
        ...tenantFilter
      }).lean();

      const totalCopies = copies.length;

      const availableCopies = copies.filter(
        copy => copy.status === 'Available'
      ).length;

      await Book.findOneAndUpdate(
        {
          _id: transaction.bookId,
          ...tenantFilter
        },
        {
          ...(totalCopies > 0 ? { totalCopies, availableCopies } : { $inc: { availableCopies: 1 } }),
          status: 'Available'
        }
      );

      request.status = 'Completed';
      request.processedDate = now;
      request.remarks =
        String(req.body?.remarks || '').trim() ||
        'Return approved & restocked';

      await request.save();

      const populatedRequest =
        await LibraryReturnRequest.findOne({ _id: request._id, ...tenantFilter })
          .populate('bookId')
          .populate('bookCopyId')
          .populate('transactionId');

      try {
        const targetRole = request.userType === 'HOD' ? 'HOD' : (request.userType === 'Staff' ? 'Staff' : 'Student');
        const targetLink = request.userType === 'HOD' ? '/hod/library' : (request.userType === 'Staff' ? '/staff/library' : '/student/library');
        await sendNotification(req, {
          title: 'Return Request Approved ✅',
          message: `Your return of "${populatedRequest?.bookId?.title || 'the book'}" has been approved and checked in.`,
          type: 'success',
          link: targetLink,
          recipient: transaction.userId,
          roles: [targetRole]
        });
      } catch (notifErr) {
        console.warn('Return approval notification warning:', notifErr.message);
      }

      res.json({
        message: 'Book return approved successfully',
        request: populatedRequest,
        transaction
      });
    } catch (err) {
      console.error(
        'PUT /library/return-requests/:id/approve:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/*
 * Reject return request
 */
router.put(
  '/return-requests/:id/reject',
  protect,
  authorize(
    'Admin',
    'Sub Admin',
    'Super Admin',
    'HOD',
    'Librarian',
    'Library',
    'Principal'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);

      const request = await LibraryReturnRequest.findOne({
        _id: req.params.id,
        ...tenantFilter
      });

      if (!request) {
        return res.status(404).json({
          message: 'Return request not found in your college records'
        });
      }

      if (request.status !== 'Pending') {
        return res.status(400).json({
          message: `Return request is already ${request.status}`
        });
      }

      request.status = 'Rejected';
      request.processedDate = new Date();
      request.remarks =
        String(req.body?.remarks || '').trim() ||
        'Condition unacceptable / rejected at desk';

      await request.save();

      try {
        const tx = await LibraryTransaction.findOne({
          _id: request.transactionId,
          ...tenantFilter
        });
        if (tx?.userId) {
          const book = await Book.findOne({
            _id: request.bookId,
            ...tenantFilter
          });
          await sendNotification(req, {
            title: 'Return Request Declined ⚠️',
            message: `Your return request for "${book?.title || 'the book'}" was declined. Reason: ${request.remarks}`,
            type: 'error',
            link: '/student/library',
            recipient: tx.userId,
            roles: ['Student']
          });
        }
      } catch (notifErr) {
        console.warn('Return rejection notification warning:', notifErr.message);
      }

      res.json({
        message: 'Return request rejected successfully',
        request
      });
    } catch (err) {
      console.error(
        'PUT /library/return-requests/:id/reject:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

/* =========================================================
   LIBRARY NO-DUES CLEARANCE (STUDENT & LIBRARIAN)
   ========================================================= */

router.get(
  '/clearance/my',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);

      const student = await Student.findOne({
        $and: [
          tenantFilter,
          {
            $or: [
              { email: req.user?.email },
              { id: req.user?.referenceId },
              { referenceId: req.user?.referenceId },
              { rollNo: req.user?.rollNo },
              { _id: req.user?._id }
            ].filter(Boolean)
          }
        ]
      }).lean();

      const possibleIds = new Set();
      if (student?._id) possibleIds.add(String(student._id));
      if (student?.id) possibleIds.add(String(student.id));
      if (student?.referenceId) possibleIds.add(String(student.referenceId));
      if (student?.rollNo) possibleIds.add(String(student.rollNo));
      if (req.user?.referenceId) possibleIds.add(String(req.user.referenceId));
      if (req.user?.rollNo) possibleIds.add(String(req.user.rollNo));
      if (req.user?.id) possibleIds.add(String(req.user.id));
      if (req.user?._id) possibleIds.add(String(req.user._id));

      const idList = Array.from(possibleIds).filter(Boolean);

      // Check if student has active book loans or pending returns
      const activeTransactionsCount = await LibraryTransaction.countDocuments({
        $and: [
          tenantFilter,
          {
            userId: { $in: idList },
            status: { $in: ['Issued', 'Overdue', 'Pending'] }
          }
        ]
      });

      const pendingReturnsCount = await LibraryReturnRequest.countDocuments({
        $and: [
          tenantFilter,
          {
            userId: { $in: idList },
            status: 'Pending'
          }
        ]
      });

      if (activeTransactionsCount > 0 || pendingReturnsCount > 0) {
        return res.json(null);
      }

      const matchQueries = [];
      if (student?._id) matchQueries.push({ studentId: student._id });
      if (idList.length > 0) matchQueries.push({ admissionNumber: { $in: idList } });
      if (req.user?.name) matchQueries.push({ studentName: req.user.name });

      if (matchQueries.length === 0) {
        return res.json(null);
      }

      const clearance = await LibraryClearance.findOne({
        $and: [
          tenantFilter,
          { $or: matchQueries }
        ]
      }).sort({ createdAt: -1 });

      res.json(clearance || null);
    } catch (err) {
      console.error('GET /library/clearance/my:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/clearance/request',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      if (!authCollegeId || authCollegeId === 'system') {
        return res.status(400).json({
          message: 'Valid College ID is required to request library clearance'
        });
      }

      /*
       * Find the logged-in student in their college.
       */
      let student = await Student.findOne({
        $and: [
          tenantFilter,
          {
            $or: [
              { email: req.user?.email },
              { id: req.user?.referenceId },
              { referenceId: req.user?.referenceId },
              { rollNo: req.user?.rollNo },
              { admissionNumber: req.user?.referenceId },
              { _id: req.user?._id }
            ].filter(Boolean)
          }
        ]
      }).lean();

      if (!student) {
        student = {
          _id: req.user?._id,
          id: req.user?.referenceId || req.user?._id,
          name: req.user?.name || 'Student',
          admissionNumber: req.user?.referenceId || req.user?.rollNo || 'HAA2026-001',
          department: req.user?.department || 'General',
          academicYear: '2026-2027',
          collegeId: authCollegeId
        };
      }

      /*
       * Build all possible student reference IDs.
       */
      const studentIds = [
        student.id,
        student.referenceId,
        student.studentId,
        student.rollNo,
        student.admissionNumber,
        req.user?.referenceId,
        req.user?.rollNo,
        req.user?.id
      ]
        .filter(Boolean)
        .map(String);

      const uniqueStudentIds = [
        ...new Set(studentIds)
      ];

      /*
       * 1. Pending / requested books
       */
      const pendingBooks =
        await LibraryTransaction.countDocuments({
          ...tenantFilter,
          userId: { $in: uniqueStudentIds },
          status: 'Pending'
        });

      /*
       * 2. Currently issued books
       */
      const issuedBooks =
        await LibraryTransaction.countDocuments({
          ...tenantFilter,
          userId: { $in: uniqueStudentIds },
          status: 'Issued'
        });

      /*
       * 3. Overdue books
       */
      const overdueBooks =
        await LibraryTransaction.countDocuments({
          ...tenantFilter,
          userId: { $in: uniqueStudentIds },
          status: 'Overdue'
        });

      /*
       * 4. Pending return requests
       */
      const pendingReturns =
        await LibraryReturnRequest.countDocuments({
          ...tenantFilter,
          userId: { $in: uniqueStudentIds },
          status: 'Pending'
        });

      /*
       * 5. Calculate outstanding fine.
       */
      const transactions =
        await LibraryTransaction.find({
          ...tenantFilter,
          userId: { $in: uniqueStudentIds }
        })
          .select('fineAmount finePaid fineStatus')
          .lean();

      const outstandingFine = transactions.reduce(
        (total, transaction) => {
          const fine =
            Number(transaction.fineAmount || 0);

          const paid =
            Number(transaction.finePaid || 0);

          return total + Math.max(fine - paid, 0);
        },
        0
      );

      /*
       * Clearance is allowed ONLY when
       * everything is completely clear.
       */
      if (
        pendingBooks > 0 ||
        issuedBooks > 0 ||
        overdueBooks > 0 ||
        pendingReturns > 0 ||
        outstandingFine > 0
      ) {
        const reasons = [];

        if (pendingBooks > 0) {
          reasons.push(
            `${pendingBooks} pending book request${pendingBooks > 1 ? 's' : ''}`
          );
        }

        if (issuedBooks > 0) {
          reasons.push(
            `${issuedBooks} issued book${issuedBooks > 1 ? 's' : ''}`
          );
        }

        if (overdueBooks > 0) {
          reasons.push(
            `${overdueBooks} overdue book${overdueBooks > 1 ? 's' : ''}`
          );
        }

        if (pendingReturns > 0) {
          reasons.push(
            `${pendingReturns} pending return request${pendingReturns > 1 ? 's' : ''}`
          );
        }

        if (outstandingFine > 0) {
          reasons.push(
            `Outstanding fine ₹${outstandingFine}`
          );
        }

        return res.status(400).json({
          message:
            'Library Clearance cannot be requested.',
          reason: reasons.join(', '),
          details: {
            pendingBooks,
            issuedBooks,
            overdueBooks,
            pendingReturns,
            outstandingFine
          }
        });
      }

      /*
       * Prevent duplicate active clearance requests.
       */
      const admissionNumber =
        student.admissionNumber ||
        student.rollNo ||
        student.referenceId ||
        student.id;

      const existing =
        await LibraryClearance.findOne({
          ...tenantFilter,
          $or: [
            ...(student._id ? [{ studentId: student._id }] : []),
            ...(admissionNumber ? [{ admissionNumber }] : []),
            { studentName: student.name || req.user?.name }
          ],
          status: {
            $in: ['Pending', 'Approved']
          }
        }).sort({ createdAt: -1 });

      if (existing) {
        return res.status(200).json({
          message:
            `Clearance request is already ${existing.status}`,
          clearance: existing
        });
      }

      /*
       * Create clearance request.
       */
      const clearance =
        await LibraryClearance.create({
          studentId: student._id,
          admissionNumber,
          studentName:
            student.name ||
            student.fullName ||
            req.user?.name ||
            'Student',
          department:
            student.department ||
            student.dept ||
            '',
          academicYear:
            student.academicYear ||
            student.batch ||
            '2026-2027',
          status: 'Pending',
          collegeId: authCollegeId,
          tenantId: authCollegeId
        });

      res.status(201).json({
        message:
          'Library clearance request submitted successfully.',
        clearance,
        details: {
          pendingBooks: 0,
          issuedBooks: 0,
          overdueBooks: 0,
          pendingReturns: 0,
          outstandingFine: 0
        }
      });
    } catch (err) {
      console.error(
        'POST /library/clearance/request:',
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  }
);

router.post(
  '/clearance/direct-issue',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Librarian', 'Library', 'Principal', 'Accounts', 'Accountant'),
  collegeScope,
  async (req, res) => {
    try {
      const { studentId, admissionNumber, studentName, department, academicYear, remarks } = req.body;
      const tenantFilter = getTenantFilter(req);
      const authCollegeId = getAuthorizedCollegeId(req);

      const targetIdStr = String(admissionNumber || studentId || '').trim();
      let validStudentObjectId = null;
      let foundStudent = null;

      if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
        validStudentObjectId = studentId;
      }

      if (targetIdStr) {
        foundStudent = await Student.findOne({
          $and: [
            tenantFilter,
            {
              $or: [
                ...(mongoose.Types.ObjectId.isValid(targetIdStr) ? [{ _id: targetIdStr }] : []),
                { registerNo: targetIdStr },
                { admissionNo: targetIdStr },
                { rollNo: targetIdStr },
                { id: targetIdStr }
              ]
            }
          ]
        }).lean();

        if (foundStudent) {
          validStudentObjectId = foundStudent._id;
        }
      }

      const orConditions = [];
      if (admissionNumber) orConditions.push({ admissionNumber });
      if (targetIdStr) orConditions.push({ admissionNumber: targetIdStr });
      if (validStudentObjectId) orConditions.push({ studentId: validStudentObjectId });
      if (studentName) orConditions.push({ studentName });

      let clearance = null;
      if (orConditions.length > 0) {
        clearance = await LibraryClearance.findOne({
          $and: [
            tenantFilter,
            { $or: orConditions }
          ]
        });
      }

      if (!clearance) {
        clearance = new LibraryClearance({
          studentId: validStudentObjectId || undefined,
          admissionNumber: admissionNumber || foundStudent?.registerNo || foundStudent?.admissionNo || targetIdStr || 'N/A',
          studentName: studentName || foundStudent?.name || foundStudent?.fullName || 'Student',
          department: department || foundStudent?.department || foundStudent?.dept || '',
          academicYear: academicYear || foundStudent?.academicYear || '2026-2027',
          collegeId: authCollegeId,
          tenantId: authCollegeId
        });
      }

      clearance.status = 'Approved';
      clearance.approvedAt = new Date();
      clearance.approvedBy = req.user?._id;
      clearance.remarks = remarks || 'All library materials verified. Official No-Due Clearance Issued.';
      await clearance.save();

      res.status(200).json({
        message: 'Library clearance certificate issued successfully.',
        clearance
      });
    } catch (err) {
      console.error('POST /library/clearance/direct-issue:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.get(
  '/clearance',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Librarian', 'Library', 'Principal', 'Accounts', 'Accountant', 'HOD', 'Staff'),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const list = await LibraryClearance.find(tenantFilter)
        .populate('studentId')
        .sort({ createdAt: -1 });

      res.json(list || []);
    } catch (err) {
      console.error('GET /library/clearance:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.get(
  '/clearance/student/:studentId',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Librarian', 'Library', 'Principal', 'Accounts', 'Accountant', 'Staff', 'HOD'),
  collegeScope,
  async (req, res) => {
    try {
      const q = req.params.studentId;
      const tenantFilter = getTenantFilter(req);
      let clearance = await LibraryClearance.findOne({
        $and: [
          tenantFilter,
          {
            $or: [
              { admissionNumber: q },
              { admissionNumber: { $regex: new RegExp(`^${q}$`, 'i') } },
              ...(mongoose.Types.ObjectId.isValid(q) ? [{ studentId: q }, { _id: q }] : [])
            ]
          }
        ]
      }).sort({ createdAt: -1 });

      res.json(clearance || null);
    } catch (err) {
      console.error('GET /library/clearance/student/:studentId:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.put(
  '/clearance/:id/approve',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Librarian', 'Library', 'Principal'),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let clearance = await LibraryClearance.findOne({
        _id: req.params.id,
        ...tenantFilter
      });
      if (!clearance) {
        return res.status(404).json({ message: 'Clearance request not found in your college records' });
      }

      clearance.status = 'Approved';
      clearance.approvedAt = new Date();
      clearance.approvedBy = req.user?._id;
      clearance.remarks = req.body?.remarks || 'All library books returned and dues cleared. No-Due Certificate issued.';
      await clearance.save();

      try {
        if (clearance.studentId) {
          await sendNotification({
            userId: clearance.studentId,
            title: 'Library Clearance Approved',
            message: 'Your library clearance request has been verified and approved by the Librarian. You can now download your digital No-Due certificate.',
            type: 'LIBRARY_CLEARANCE_APPROVED',
            link: '/student/library'
          });
        }
      } catch (notifErr) {
        console.warn('Failed to send clearance notification:', notifErr.message);
      }

      res.json({ message: 'Clearance approved successfully', clearance });
    } catch (err) {
      console.error('PUT /library/clearance/:id/approve:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.put(
  '/clearance/:id/reject',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Librarian', 'Library', 'Principal'),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let clearance = await LibraryClearance.findOne({
        _id: req.params.id,
        ...tenantFilter
      });
      if (!clearance) {
        return res.status(404).json({ message: 'Clearance request not found in your college records' });
      }

      clearance.status = 'Rejected';
      clearance.remarks = req.body?.remarks || 'Library clearance request rejected after verification.';
      await clearance.save();

      try {
        if (clearance.studentId) {
          await sendNotification({
            userId: clearance.studentId,
            title: 'Library Clearance Rejected',
            message: `Your library clearance request was rejected. Reason: ${clearance.remarks}`,
            type: 'LIBRARY_CLEARANCE_REJECTED',
            link: '/student/library'
          });
        }
      } catch (notifErr) {
        console.warn('Failed to send rejection notification:', notifErr.message);
      }

      res.json({ message: 'Library clearance rejected successfully', clearance });
    } catch (err) {
      console.error('PUT /library/clearance/:id/reject:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/*
 * Delete book
 */
router.delete(
  '/books/:id',
  protect,
  authorize('Admin', 'Sub Admin', 'HOD', 'Principal', 'Librarian'),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const book = await Book.findOne({ _id: req.params.id, ...tenantFilter });
      if (!book) {
        return res.status(404).json({ message: 'Book not found in your college catalog' });
      }

      await BookCopy.deleteMany({ bookId: book._id, ...tenantFilter });
      await LibraryTransaction.deleteMany({ bookId: book._id, ...tenantFilter });
      await LibraryReservation.deleteMany({ bookId: book._id, ...tenantFilter });
      await LibraryReturnRequest.deleteMany({ bookId: book._id, ...tenantFilter });
      await Book.deleteOne({ _id: book._id, ...tenantFilter });

      res.json({ message: 'Book and associated records deleted successfully' });
    } catch (err) {
      console.error('DELETE /library/books/:id:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/*
 * Clear dummy/test data
 */
router.post(
  '/clear-dummy-data',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Principal', 'Librarian'),
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      const dummyRegex = /asdf|test|dummy|junk|sample/i;
      const dummyBooks = await Book.find({
        $and: [
          tenantFilter,
          {
            $or: [
              { title: dummyRegex },
              { author: dummyRegex },
              { bookId: dummyRegex }
            ]
          }
        ]
      });

      const dummyBookIds = dummyBooks.map(b => b._id);

      await BookCopy.deleteMany({ bookId: { $in: dummyBookIds }, ...tenantFilter });
      await LibraryTransaction.deleteMany({ bookId: { $in: dummyBookIds }, ...tenantFilter });
      await LibraryReservation.deleteMany({ bookId: { $in: dummyBookIds }, ...tenantFilter });
      await LibraryReturnRequest.deleteMany({ bookId: { $in: dummyBookIds }, ...tenantFilter });
      await Book.deleteMany({ _id: { $in: dummyBookIds }, ...tenantFilter });

      const allCollegeBookIds = (await Book.find(tenantFilter, '_id')).map(b => b._id);
      await BookCopy.deleteMany({ bookId: { $nin: allCollegeBookIds }, ...tenantFilter });
      await LibraryTransaction.deleteMany({ bookId: { $nin: allCollegeBookIds }, ...tenantFilter });
      await LibraryReservation.deleteMany({ bookId: { $nin: allCollegeBookIds }, ...tenantFilter });
      await LibraryReturnRequest.deleteMany({ bookId: { $nin: allCollegeBookIds }, ...tenantFilter });

      if (req.body.clearAllTransactions) {
        await LibraryTransaction.deleteMany(tenantFilter);
        await LibraryReservation.deleteMany(tenantFilter);
        await LibraryReturnRequest.deleteMany(tenantFilter);
        await BookCopy.updateMany(tenantFilter, { status: 'Available' });
        const books = await Book.find(tenantFilter);
        for (const b of books) {
          const total = Number(b.totalCopies) || 1;
          b.availableCopies = total;
          b.status = 'Available';
          await b.save();
        }
      }

      res.json({ message: 'Dummy library data cleaned up successfully for your college' });
    } catch (err) {
      console.error('POST /library/clear-dummy-data:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/*
 * Cancel / Delete book request or transaction (Students, Staff, Admins)
 */
router.delete(
  '/transactions/:id',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let transaction = await LibraryTransaction.findOne({ _id: req.params.id, ...tenantFilter });

      if (!transaction) {
        // Also check if id refers to a reservation
        const reservation = await LibraryReservation.findOne({ _id: req.params.id, ...tenantFilter });
        if (reservation) {
          await LibraryTransaction.deleteMany({
            bookId: reservation.bookId,
            userId: reservation.userId,
            status: { $in: ['Pending', 'Rejected'] },
            ...tenantFilter
          });
          await LibraryReservation.deleteOne({ _id: req.params.id, ...tenantFilter });
          return res.json({ message: 'Request cancelled successfully' });
        }
        return res.status(404).json({
          message: 'Transaction not found in your college records'
        });
      }

      const isStudent = req.user?.role?.toLowerCase() === 'student';
      if (isStudent && (transaction.status === 'Issued' || transaction.status === 'Overdue')) {
        return res.status(400).json({
          message: 'Active issued or overdue books cannot be cancelled. Please return the book to the library.'
        });
      }

      if (transaction.bookCopyId && (transaction.status === 'Issued' || transaction.status === 'Overdue')) {
        await BookCopy.findOneAndUpdate({ _id: transaction.bookCopyId, ...tenantFilter }, { status: 'Available' });
        if (transaction.bookId) {
          await Book.findOneAndUpdate({ _id: transaction.bookId, ...tenantFilter }, { $inc: { availableCopies: 1 } });
        }
      }

      await LibraryReturnRequest.deleteMany({ transactionId: transaction._id, ...tenantFilter });
      await LibraryFinePayment.deleteMany({ transactionId: transaction._id, ...tenantFilter });
      await LibraryReservation.deleteMany({
        bookId: transaction.bookId,
        userId: transaction.userId,
        status: { $in: ['Pending', 'Rejected'] },
        ...tenantFilter
      });

      await LibraryTransaction.deleteOne({ _id: transaction._id, ...tenantFilter });

      res.json({
        message: 'Book request cancelled and removed successfully'
      });
    } catch (err) {
      console.error('DELETE /library/transactions/:id:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/transactions/:id/cancel',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let transaction = await LibraryTransaction.findOne({ _id: req.params.id, ...tenantFilter });

      if (!transaction) {
        const reservation = await LibraryReservation.findOne({ _id: req.params.id, ...tenantFilter });
        if (reservation) {
          await LibraryTransaction.deleteMany({
            bookId: reservation.bookId,
            userId: reservation.userId,
            status: { $in: ['Pending', 'Rejected'] },
            ...tenantFilter
          });
          await LibraryReservation.deleteOne({ _id: req.params.id, ...tenantFilter });
          return res.json({ message: 'Request cancelled successfully' });
        }
        return res.status(404).json({
          message: 'Transaction not found in your college records'
        });
      }

      const isStudent = req.user?.role?.toLowerCase() === 'student';
      if (isStudent && (transaction.status === 'Issued' || transaction.status === 'Overdue')) {
        return res.status(400).json({
          message: 'Active issued or overdue books cannot be cancelled. Please return the book to the library.'
        });
      }

      if (transaction.bookCopyId && (transaction.status === 'Issued' || transaction.status === 'Overdue')) {
        await BookCopy.findOneAndUpdate({ _id: transaction.bookCopyId, ...tenantFilter }, { status: 'Available' });
        if (transaction.bookId) {
          await Book.findOneAndUpdate({ _id: transaction.bookId, ...tenantFilter }, { $inc: { availableCopies: 1 } });
        }
      }

      await LibraryReturnRequest.deleteMany({ transactionId: transaction._id, ...tenantFilter });
      await LibraryFinePayment.deleteMany({ transactionId: transaction._id, ...tenantFilter });
      await LibraryReservation.deleteMany({
        bookId: transaction.bookId,
        userId: transaction.userId,
        status: { $in: ['Pending', 'Rejected'] },
        ...tenantFilter
      });

      await LibraryTransaction.deleteOne({ _id: transaction._id, ...tenantFilter });

      res.json({
        message: 'Book request cancelled and removed successfully'
      });
    } catch (err) {
      console.error('POST /library/transactions/:id/cancel:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.delete(
  '/reservations/:id',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let reservation = await LibraryReservation.findOne({ _id: req.params.id, ...tenantFilter });

      if (!reservation) {
        const tx = await LibraryTransaction.findOne({ _id: req.params.id, ...tenantFilter });
        if (tx) {
          await LibraryReservation.deleteMany({
            bookId: tx.bookId,
            userId: tx.userId,
            status: { $in: ['Pending', 'Rejected'] },
            ...tenantFilter
          });
          await LibraryTransaction.deleteOne({ _id: tx._id, ...tenantFilter });
          return res.json({
            message: 'Reservation cancelled successfully'
          });
        }
        return res.status(404).json({
          message: 'Reservation not found in your college records'
        });
      }

      await LibraryTransaction.deleteMany({
        bookId: reservation.bookId,
        userId: reservation.userId,
        status: { $in: ['Pending', 'Rejected'] },
        ...tenantFilter
      });

      await LibraryReservation.deleteOne({ _id: reservation._id, ...tenantFilter });

      res.json({
        message: 'Reservation cancelled successfully'
      });
    } catch (err) {
      console.error('DELETE /library/reservations/:id:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.post(
  '/reservations/:id/cancel',
  protect,
  collegeScope,
  async (req, res) => {
    try {
      const tenantFilter = getTenantFilter(req);
      let reservation = await LibraryReservation.findOne({ _id: req.params.id, ...tenantFilter });

      if (!reservation) {
        const tx = await LibraryTransaction.findOne({ _id: req.params.id, ...tenantFilter });
        if (tx) {
          await LibraryReservation.deleteMany({
            bookId: tx.bookId,
            userId: tx.userId,
            status: { $in: ['Pending', 'Rejected'] },
            ...tenantFilter
          });
          await LibraryTransaction.deleteOne({ _id: tx._id, ...tenantFilter });
          return res.json({
            message: 'Reservation cancelled successfully'
          });
        }
        return res.status(404).json({
          message: 'Reservation not found in your college records'
        });
      }

      await LibraryTransaction.deleteMany({
        bookId: reservation.bookId,
        userId: reservation.userId,
        status: { $in: ['Pending', 'Rejected'] },
        ...tenantFilter
      });

      await LibraryReservation.deleteOne({ _id: reservation._id, ...tenantFilter });

      res.json({
        message: 'Reservation cancelled successfully'
      });
    } catch (err) {
      console.error('POST /library/reservations/:id/cancel:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/* =========================================================
   LEGACY UNASSIGNED RECORDS MANAGEMENT (SUPER ADMIN ONLY)
   ========================================================= */

router.post(
  '/assign-legacy-records',
  protect,
  authorize('Super Admin'),
  async (req, res) => {
    try {
      const { targetCollegeId, reassignFrom = [null, '', 'unassigned_college'] } = req.body;

      if (!targetCollegeId || targetCollegeId === 'system') {
        return res.status(400).json({ message: 'A valid target collegeId is required.' });
      }

      const unassignedFilter = {
        $or: [
          { collegeId: { $in: reassignFrom } },
          { collegeId: { $exists: false } },
          { tenantId: { $in: reassignFrom } },
          { tenantId: { $exists: false } }
        ]
      };

      const [booksUpdated, copiesUpdated, txUpdated, resUpdated, retUpdated, clrUpdated] = await Promise.all([
        Book.updateMany(unassignedFilter, { collegeId: targetCollegeId, tenantId: targetCollegeId }),
        BookCopy.updateMany(unassignedFilter, { collegeId: targetCollegeId, tenantId: targetCollegeId }),
        LibraryTransaction.updateMany(unassignedFilter, { collegeId: targetCollegeId, tenantId: targetCollegeId }),
        LibraryReservation.updateMany(unassignedFilter, { collegeId: targetCollegeId, tenantId: targetCollegeId }),
        LibraryReturnRequest.updateMany(unassignedFilter, { collegeId: targetCollegeId, tenantId: targetCollegeId }),
        LibraryClearance.updateMany(unassignedFilter, { collegeId: targetCollegeId, tenantId: targetCollegeId })
      ]);

      res.json({
        message: `Successfully reassigned legacy unassigned records to college ${targetCollegeId}`,
        reassigned: {
          books: booksUpdated.modifiedCount,
          copies: copiesUpdated.modifiedCount,
          transactions: txUpdated.modifiedCount,
          reservations: resUpdated.modifiedCount,
          returnRequests: retUpdated.modifiedCount,
          clearances: clrUpdated.modifiedCount
        }
      });
    } catch (err) {
      console.error('POST /library/assign-legacy-records:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
