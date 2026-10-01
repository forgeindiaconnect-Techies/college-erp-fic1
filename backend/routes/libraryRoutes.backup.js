import express from 'express';
import Book from '../models/Book.js';
import LibraryTransaction from '../models/LibraryTransaction.js';
import BookCopy from '../models/BookCopy.js';
import LibraryFinePayment from '../models/LibraryFinePayment.js';
import LibraryReservation from '../models/LibraryReservation.js';
import LibraryReturnRequest from '../models/LibraryReturnRequest.js';
import LibraryClearance from '../models/LibraryClearance.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
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
  return req.user.role === 'Staff' ? 'Staff' : 'Student';
};

  const getTenantFilter = (req) => {
    if (req.user?.role === 'Super Admin') {
      return {};
    }

    const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;

    if (!collegeId) {
      return {};
    }

    return {
      $or: [
        { collegeId: collegeId },
        { collegeId: { $exists: false } },
        { collegeId: null }
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
  authorize('Admin', 'Sub Admin', 'Principal', 'Librarian'),
  collegeScope,
  async (req, res) => {
    try {
      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      }).populate('bookId');

      if (!transaction) {
        transaction = await LibraryTransaction.findById(
          req.params.id
        ).populate('bookId');
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
        });
      }

      const paidAmount = Number(transaction.finePaid || 0);

      if (paidAmount <= 0) {
        return res.status(404).json({
          message: 'No fine payment exists for this transaction'
        });
      }

      const collegeId =
        transaction.collegeId ||
        req.collegeId ||
        req.user?.tenantId ||
        req.user?.collegeId ||
        'unassigned_college';

      let payment = await LibraryFinePayment.findOne({
        transactionId: transaction._id
      }).sort({ createdAt: -1 });

      if (!payment) {
        const paymentDate =
          transaction.finePaidDate ||
          transaction.updatedAt ||
          new Date();

        const year = new Date(paymentDate).getFullYear();

        const lastPayment = await LibraryFinePayment.findOne({
          collegeId
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
  authorize(
    'Admin',
    'Sub Admin',
    'Principal',
    'Librarian',
    'Library'
  ),
  collegeScope,
  async (req, res) => {
    try {
      const payments = await LibraryFinePayment.find({
        ...getTenantFilter(req)
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
   GET ALL BOOKS
   ========================================================= */

/* =========================================================
   LIBRARY RESERVATIONS
   ========================================================= */

router.post(
  '/reservations',
  protect,
  authorize('Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library', 'Student', 'Staff'),
  collegeScope,
  async (req, res) => {
    try {
      const { bookId } = req.body;

      if (!bookId) {
        return res.status(400).json({ message: 'Book ID is required' });
      }

      let book = await Book.findOne({
        _id: bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        book = await Book.findById(bookId);
      }

      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }

      const userId = getUserId(req);
      const userType = getUserType(req);
      const tenantCollegeId = book.collegeId || req.collegeId || req.user?.tenantId || req.user?.collegeId || 'COL001';

      const existing = await LibraryReservation.findOne({
        bookId: book._id,
        userId,
        status: 'Pending'
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
        collegeId: tenantCollegeId
      });

      // Also ensure matching LibraryTransaction exists
      try {
        await LibraryTransaction.findOneAndUpdate(
          {
            bookId: book._id,
            userId,
            status: 'Pending'
          },
          {
            bookId: book._id,
            userId,
            userType,
            status: 'Pending',
            collegeId: tenantCollegeId
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (txErr) {
        console.warn('Sync transaction creation failed', txErr);
      }

      const populated = await LibraryReservation.findById(
        reservation._id
      ).populate('bookId');

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
  authorize('Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library', 'HOD', 'Staff', 'Student'),
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

      let reservations = await LibraryReservation.find(filter)
        .populate('bookId')
        .populate('bookCopyId')
        .sort({ createdAt: -1 })
        .lean();

      // Also get any pending / approved student book requests from LibraryTransaction
      const txFilter = isStudent || isStaff ? {
        ...filter,
        status: { $in: ['Pending', 'Approved', 'Reserved'] }
      } : {
        status: { $in: ['Pending', 'Approved', 'Reserved'] }
      };

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

      if (!isStudent && !isStaff) {
        const allRes = await LibraryReservation.find({})
          .populate('bookId')
          .populate('bookCopyId')
          .sort({ createdAt: -1 })
          .lean();
        const allTx = await LibraryTransaction.find({
          status: { $in: ['Pending', 'Approved', 'Reserved'] }
        })
          .populate('bookId')
          .populate('bookCopyId')
          .lean();

        for (const r of (allRes || [])) {
          const bId = String(r.bookId?._id || r.bookId || '');
          const key = `${bId}_${r.userId}`;
          if (!existingMap.has(key)) {
            existingMap.add(key);
            reservations.push(r);
          }
        }

        for (const tx of (allTx || [])) {
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
      }

      // Ensure book details are populated even if populate missed
      for (const r of reservations) {
        if (!r.bookId || typeof r.bookId === 'string' || !r.bookId.title) {
          const rawId = r.bookId?._id || r.bookId;
          if (rawId) {
            try {
              const b = await Book.findById(rawId).lean();
              if (b) r.bookId = b;
            } catch (e) {}
          }
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
  authorize('Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library', 'HOD'),
  collegeScope,
  async (req, res) => {
    try {
      const now = new Date();
      let reservation = await LibraryReservation.findById(req.params.id);

      if (!reservation) {
        // If it's a pending transaction ID
        const tx = await LibraryTransaction.findById(req.params.id);
        if (tx) {
          tx.status = 'Approved';
          tx.approvedDate = now;
          await tx.save();

          reservation = await LibraryReservation.findOneAndUpdate(
            { bookId: tx.bookId, userId: tx.userId },
            {
              bookId: tx.bookId,
              userId: tx.userId,
              userType: tx.userType || 'Student',
              status: 'Approved',
              approvedDate: now,
              collegeId: tx.collegeId || req.collegeId || 'COL001'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }
      } else {
        reservation.status = 'Approved';
        reservation.approvedDate = now;
        await reservation.save();

        await LibraryTransaction.updateMany(
          { bookId: reservation.bookId, userId: reservation.userId, status: { $in: ['Pending', 'Reserved'] } },
          { status: 'Approved', approvedDate: now }
        );
      }

      if (!reservation) {
        return res.status(404).json({
          message: 'Reservation or request not found'
        });
      }

      res.json({
        message: 'Reservation approved successfully',
        reservation
      });
    } catch (error) {
      console.error('Approve reservation error:', error);
      res.status(500).json({
        message: 'Failed to approve reservation'
      });
    }
  }
);

router.put(
  '/reservations/:id/reject',
  protect,
  authorize('Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library'),
  collegeScope,
  async (req, res) => {
    try {
      let reservation = await LibraryReservation.findById(req.params.id);

      if (reservation) {
        reservation.status = 'Rejected';
        await reservation.save();

        await LibraryTransaction.updateMany(
          { bookId: reservation.bookId, userId: reservation.userId, status: { $in: ['Pending', 'Approved'] } },
          { status: 'Rejected' }
        );
      } else {
        await LibraryTransaction.findByIdAndUpdate(req.params.id, { status: 'Rejected' });
      }

      res.json({
        message: 'Reservation rejected successfully'
      });
    } catch (error) {
      console.error('Reject reservation error:', error);
      res.status(500).json({
        message: 'Failed to reject reservation'
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

      let reservation = await LibraryReservation.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      });

      if (!reservation) {
        reservation = await LibraryReservation.findById(req.params.id);
      }

      if (!reservation) {
        return res.status(404).json({
          message: 'Reservation not found'
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

      let book = await Book.findOne({
        _id: reservation.bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        book = await Book.findById(reservation.bookId);
      }

      if (!book) {
        return res.status(404).json({
          message: 'Book not found'
        });
      }

      const tenantId =
        reservation.collegeId ||
        book.collegeId ||
        req.collegeId ||
        req.user?.tenantId ||
        req.user?.collegeId ||
        'COL001';

      let selectedCopy = null;
      if (bookCopyId) {
        selectedCopy = await BookCopy.findOne({
          _id: bookCopyId,
          bookId: book._id,
          collegeId: tenantId
        });

        if (!selectedCopy) {
          selectedCopy = await BookCopy.findById(bookCopyId);
        }

        if (!selectedCopy) {
          return res.status(404).json({
            message: 'Selected physical copy not found'
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
          collegeId: tenantId,
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
              (reservation.userType === 'Staff' ? 30 : 14) *
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
          issueDate,
          dueDate: finalDueDate,
          fineAmount: 0,
          collegeId: tenantId
        });

        const savedTransaction = await transaction.save();

        reservation.status = 'Completed';
        await reservation.save();

        book.availableCopies = Math.max(0, currentAvail - 1);
        book.status =
          book.availableCopies > 0 ? 'Available' : 'Out of Stock';
        await book.save();

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

      // Ensure all library catalog books across college records are discoverable
      const allBooks = await Book.find({}).setOptions({ skipTenant: true }).sort({ title: 1 }).lean();
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

      const collegeId =
        req.collegeId ||
        (req.user?.role === 'Super Admin' ? req.body.collegeId : null);

      if (!collegeId) {
        return res.status(400).json({
          message: 'College ID is required'
        });
      }

      const existingBook = await Book.findOne({
        collegeId,
        bookId
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
        collegeId
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
            collegeId
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

      let book = await Book.findOne({
        _id: bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        book = await Book.findById(bookId);
      }

      if (!book) {
        return res.status(404).json({
          message: 'Book not found'
        });
      }

      const existingTransaction = await LibraryTransaction.findOne({
        bookId: book._id,
        $or: [
          { userId: userId },
          { userId: req.user?.referenceId },
          { userId: String(req.user?._id) }
        ],
        status: { $in: ['Pending', 'Issued', 'Overdue'] }
      });

      if (existingTransaction) {
        return res.status(400).json({
          message:
            'You already have an active request or issue for this book'
        });
      }

      const transaction = new LibraryTransaction({
        bookId: book._id,
        userId,
        userType,
        status: 'Pending',
        collegeId: book.collegeId || req.collegeId || req.user?.tenantId || req.user?.collegeId || 'COL001'
      });

      const savedTransaction = await transaction.save();

      // Automatically sync as a LibraryReservation record so it appears in Reservations tab
      try {
        await LibraryReservation.findOneAndUpdate(
          {
            bookId: book._id,
            userId,
            status: { $in: ['Pending', 'Approved'] }
          },
          {
            bookId: book._id,
            userId,
            userType,
            status: 'Pending',
            requestDate: new Date(),
            collegeId: book.collegeId || req.collegeId || req.user?.tenantId || req.user?.collegeId || 'COL001'
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

      // Also check Student collection for this user's email, name, or referenceId
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

      const idList = Array.from(possibleIds).filter(Boolean);

      let transactions = await LibraryTransaction.find({
        $or: [
          { userId: { $in: idList } },
          { userId: { $in: idList.map(id => new RegExp(`^${id}$`, 'i')) } }
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
            let copy = await BookCopy.findOne({ bookId: bId, status: 'Issued' });
            if (!copy) {
              copy = await BookCopy.findOne({ bookId: bId });
            }
            if (!copy) {
              const bookDoc = typeof tx.bookId === 'object' ? tx.bookId : await Book.findById(bId);
              if (bookDoc) {
                copy = await BookCopy.create({
                  bookId: bId,
                  copyNumber: 1,
                  barcode: `${bookDoc.bookId || 'LIB'}-C001`,
                  accessionNumber: `ACC-${bookDoc.bookId || 'LIB'}-001`,
                  status: 'Issued',
                  condition: 'Good',
                  rackNumber: bookDoc.rackNumber || 'R01',
                  shelfNumber: bookDoc.shelfNumber || 'S01',
                  collegeId: tx.collegeId || 'COL001'
                });
              }
            }
            if (copy) {
              tx.bookCopyId = copy;
              await LibraryTransaction.findByIdAndUpdate(tx._id, { bookCopyId: copy._id });
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
      const now = new Date();
      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      });

      if (!transaction) {
        transaction = await LibraryTransaction.findById(req.params.id);
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
        });
      }

      transaction.status = 'Approved';
      transaction.approvedDate = now;
      const savedTransaction = await transaction.save();

      // Sync reservation
      await LibraryReservation.findOneAndUpdate(
        { bookId: transaction.bookId, userId: transaction.userId },
        {
          bookId: transaction.bookId,
          userId: transaction.userId,
          userType: transaction.userType || 'Student',
          status: 'Approved',
          approvedDate: now,
          collegeId: transaction.collegeId || req.collegeId || 'COL001'
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
      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      });

      if (!transaction) {
        transaction = await LibraryTransaction.findById(req.params.id);
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
        });
      }

      if (!['Pending', 'Approved', 'Reserved'].includes(transaction.status)) {
        return res.status(400).json({
          message: `Cannot issue request with status '${transaction.status}'`
        });
      }

      let book = await Book.findOne({
        _id: transaction.bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        book = await Book.findById(transaction.bookId);
      }

      if (!book) {
        return res.status(404).json({
          message: 'Book not found'
        });
      }

      const issueDate = new Date();
      const daysToAdd = transaction.userType === 'Staff' ? 30 : 14;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + daysToAdd);

      // Resolve physical copy
      let selectedCopy = null;
      if (transaction.bookCopyId) {
        selectedCopy = await BookCopy.findOne({
          _id: transaction.bookCopyId,
          ...getTenantFilter(req)
        });
        if (!selectedCopy) {
          selectedCopy = await BookCopy.findById(transaction.bookCopyId);
        }
      }

      // If no copy assigned yet, auto-select first available copy
      if (!selectedCopy || selectedCopy.status !== 'Available') {
        const availableCopy = await BookCopy.findOne({
          bookId: book._id,
          status: 'Available',
          ...getTenantFilter(req)
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
            status: { $in: ['Pending', 'Approved', 'Reserved'] }
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
        await sendNotification(req, {
          title: 'Book Request Approved! 📚',
          message: `Your request for "${book.title}" has been approved. Due Date: ${dueDate.toLocaleDateString()}. You can now collect your book.`,
          type: 'success',
          link: '/student/library',
          recipient: transaction.userId,
          roles: ['Student']
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
      let transaction =
        await LibraryTransaction.findOne({
          _id: req.params.id,
          ...getTenantFilter(req)
        }).populate('bookId');

      if (!transaction) {
        transaction = await LibraryTransaction.findById(req.params.id).populate('bookId');
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
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
          ...getTenantFilter(req)
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
        ...getTenantFilter(req)
      });

      if (!book) {
        book = await Book.findById(bookId);
      }

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
        await sendNotification(req, {
          title: 'Book Return Settled ✅',
          message: `"${book?.title || 'Book'}" has been successfully returned and restocked in library records.`,
          type: 'success',
          link: '/student/library',
          recipient: transaction.userId,
          roles: ['Student']
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
      let transaction =
        await LibraryTransaction.findOne({
          _id: req.params.id,
          ...getTenantFilter(req)
        });

      if (!transaction) {
        transaction = await LibraryTransaction.findById(req.params.id);
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
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
            status: { $in: ['Pending', 'Approved', 'Reserved'] }
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

      if (
        req.user.role === 'HOD' ||
        req.user.role === 'Staff'
      ) {
        filterDept = req.user.department;
      }

      const filtered = filterDept
        ? transactions.filter(
            (transaction) =>
              transaction.bookId?.department ===
              filterDept
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

      const transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      });

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
        });
      }

      const copy = await BookCopy.findOne({
        _id: bookCopyId,
        bookId: transaction.bookId,
        ...getTenantFilter(req)
      });

      if (!copy) {
        return res.status(404).json({
          message: 'Physical book copy not found'
        });
      }

      transaction.bookCopyId = copy._id;
      await transaction.save();

      copy.status = 'Issued';
      await copy.save();

      const updatedTransaction =
        await LibraryTransaction.findById(transaction._id)
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

      let book = await Book.findOne({
        _id: bookId,
        ...getTenantFilter(req)
      });

      if (!book) {
        book = await Book.findById(bookId);
      }

      if (!book) {
        return res.status(404).json({
          message: 'Book not found'
        });
      }

      const tenantId =
        book.collegeId ||
        req.collegeId ||
        req.user?.tenantId ||
        req.user?.collegeId ||
        'COL001';

      let selectedCopy = null;

      if (bookCopyId) {
        selectedCopy = await BookCopy.findOne({
          _id: bookCopyId,
          bookId: book._id,
          collegeId: tenantId
        });

        if (!selectedCopy) {
          return res.status(404).json({
            message: 'Selected physical book copy not found'
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
          collegeId: tenantId,
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
          userType: ['Student', 'Staff'].includes(userType)
            ? userType
            : 'Student',
          status: 'Issued',
          issueDate: new Date(),
          dueDate: new Date(dueDate),
          fineAmount: 0,
          collegeId: tenantId
        });

        const savedTransaction = await transaction.save();

        book.availableCopies = Math.max(0, currentAvail - 1);
        book.status =
          book.availableCopies > 0
            ? 'Available'
            : 'Out of Stock';

        await book.save();

        try {
          await sendNotification(req, {
            title: 'New Book Issued to You 📖',
            message: `"${book.title}" has been issued to your library account. Due Date: ${new Date(dueDate).toLocaleDateString()}.`,
            type: 'info',
            link: '/student/library',
            recipient: userId,
            roles: ['Student']
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
  authorize('Admin', 'Sub Admin', 'Principal', 'Librarian', 'Library', 'Student', 'Staff', 'HOD', 'Super Admin'),
  collegeScope,
  async (req, res) => {
    try {
      let transaction = await LibraryTransaction.findOne({
        _id: req.params.id,
        ...getTenantFilter(req)
      }).populate('bookId');

      if (!transaction) {
        transaction = await LibraryTransaction.findById(
          req.params.id
        ).populate('bookId');
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Transaction not found'
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

      const collegeId =
        transaction.collegeId ||
        req.collegeId ||
        req.user?.tenantId ||
        req.user?.collegeId ||
        'COL001';

      const lastPayment = await LibraryFinePayment.findOne({
        collegeId
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

      const book = await Book.findOne({
        _id: req.params.bookId,
        ...tenantFilter
      });

      if (!book) {
        return res.status(404).json({
          message: 'Book not found'
        });
      }

      const existingCopy =
        await BookCopy.findOne({
          collegeId: req.collegeId,
          accessionNumber
        });

      if (existingCopy) {
        return res.status(400).json({
          message:
            'Accession number already exists'
        });
      }

      if (barcode) {
        const existingBarcode =
          await BookCopy.findOne({
            collegeId: req.collegeId,
            barcode
          });

        if (existingBarcode) {
          return res.status(400).json({
            message:
              'Barcode already exists'
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
        collegeId: req.collegeId
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

      res.json({
        currentUser: {
          id: req.user?._id,
          name: req.user?.name,
          role: req.user?.role,
          tenantId: req.user?.tenantId,
          collegeId: req.user?.collegeId,
          requestCollegeId: req.collegeId
        },
        counts: {
          books: allBooks.length,
          transactions: allTransactions.length,
          copies: allCopies.length
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
      const targetCollegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
      
      const studentFilter = targetCollegeId ? { collegeId: targetCollegeId } : { collegeId: '__NO_COLLEGE__' };

      let students = await Student.find(studentFilter).lean();

      const studentUserFilter = targetCollegeId ? {
        role: { $regex: /^student$/i },
        $or: [
          { collegeId: targetCollegeId },
          { tenantId: targetCollegeId }
        ]
      } : {
        role: { $regex: /^student$/i },
        collegeId: '__NO_COLLEGE__'
      };

      let studentUsers = await User.find(studentUserFilter)
        .select('-password')
        .lean();

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
            rollNo: s.rollNo || id
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
            rollNo: u.rollNo || id
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

      let transaction = await LibraryTransaction.findById(transactionId);
      if (!transaction) {
        transaction = await LibraryTransaction.findOne({ _id: transactionId });
      }

      // If not in LibraryTransaction, check if it's in LibraryReservation
      if (!transaction) {
        const resv = await LibraryReservation.findById(transactionId);
        if (resv) {
          transaction = await LibraryTransaction.findOne({
            bookId: resv.bookId,
            userId: resv.userId
          });
        }
      }

      if (!transaction) {
        return res.status(404).json({
          message: 'Library transaction not found'
        });
      }

      const existingRequest = await LibraryReturnRequest.findOne({
        $or: [
          { transactionId: transaction._id },
          { bookId: transaction.bookId, userId: transaction.userId, status: 'Pending' }
        ],
        status: 'Pending'
      });

      if (existingRequest) {
        return res.status(200).json({
          message: 'Return request already submitted',
          request: existingRequest
        });
      }

      const collegeId =
        req.collegeId ||
        req.user?.tenantId ||
        req.user?.collegeId ||
        transaction.collegeId ||
        'COL001';

      const returnRequest = await LibraryReturnRequest.create({
        transactionId: transaction._id,
        bookId: transaction.bookId?._id || transaction.bookId,
        bookCopyId: transaction.bookCopyId || null,
        userId: transaction.userId || req.user?._id || req.user?.id,
        userType: transaction.userType || 'Student',
        status: 'Pending',
        collegeId
      });

      const populatedRequest =
        await LibraryReturnRequest.findById(returnRequest._id)
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
        console.warn('Return requests my student ID lookup failed:', e.message);
      }

      const idList = Array.from(possibleIds).filter(Boolean);

      let txIds = [];
      try {
        const userTransactions = await LibraryTransaction.find({
          $or: [
            { userId: { $in: idList } },
            { userId: { $in: idList.map(id => new RegExp(`^${id}$`, 'i')) } }
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
        $or: orConditions
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
      const requests = await LibraryReturnRequest.find({})
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
      const request = await LibraryReturnRequest.findById(req.params.id);

      if (!request) {
        return res.status(404).json({
          message: 'Return request not found'
        });
      }

      if (request.status !== 'Pending') {
        return res.status(400).json({
          message: `Return request is already ${request.status}`
        });
      }

      const transaction = await LibraryTransaction.findById(request.transactionId);

      if (!transaction) {
        return res.status(404).json({
          message: 'Library transaction not found'
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
        const copy = await BookCopy.findById(transaction.bookCopyId);

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
        bookId: transaction.bookId
      }).lean();

      const totalCopies = copies.length;

      const availableCopies = copies.filter(
        copy => copy.status === 'Available'
      ).length;

      await Book.findOneAndUpdate(
        {
          _id: transaction.bookId
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
        await LibraryReturnRequest.findById(request._id)
          .populate('bookId')
          .populate('bookCopyId')
          .populate('transactionId');

      try {
        await sendNotification(req, {
          title: 'Return Request Approved ✅',
          message: `Your return of "${populatedRequest?.bookId?.title || 'the book'}" has been approved and checked in.`,
          type: 'success',
          link: '/student/library',
          recipient: transaction.userId,
          roles: ['Student']
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
      const request = await LibraryReturnRequest.findById(req.params.id);

      if (!request) {
        return res.status(404).json({
          message: 'Return request not found'
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
        const tx = await LibraryTransaction.findById(request.transactionId);
        if (tx?.userId) {
          const book = await Book.findById(request.bookId);
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
      const student = await Student.findOne({
        $or: [
          { email: req.user?.email },
          { id: req.user?.referenceId },
          { referenceId: req.user?.referenceId },
          { rollNo: req.user?.rollNo },
          { _id: req.user?._id }
        ]
      }).lean();

      const clearance = await LibraryClearance.findOne({
        $or: [
          ...(student ? [{ studentId: student._id }] : []),
          { admissionNumber: req.user?.referenceId || req.user?.rollNo || req.user?.id },
          { studentName: req.user?.name }
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
      const student = await Student.findOne({
        $or: [
          { email: req.user?.email },
          { id: req.user?.referenceId },
          { referenceId: req.user?.referenceId },
          { rollNo: req.user?.rollNo },
          { _id: req.user?._id }
        ]
      }).lean();

      const collegeId =
        req.collegeId ||
        req.user?.tenantId ||
        req.user?.collegeId ||
        student?.collegeId ||
        'COL001';

      const admissionNumber =
        student?.admissionNumber ||
        student?.rollNo ||
        student?.referenceId ||
        req.user?.referenceId ||
        req.user?.rollNo ||
        'STU-001';

      const studentName = student?.name || req.user?.name || 'Student';
      const department = student?.department || student?.dept || req.user?.department || '';
      const academicYear = student?.academicYear || student?.batch || '2026-2027';

      const existing = await LibraryClearance.findOne({
        $or: [
          ...(student ? [{ studentId: student._id }] : []),
          { admissionNumber }
        ],
        status: { $in: ['Pending', 'Approved'] }
      });

      if (existing) {
        return res.status(200).json({
          message: `Clearance request is already ${existing.status}`,
          clearance: existing
        });
      }

      const clearance = await LibraryClearance.create({
        studentId: student?._id || req.user?._id,
        admissionNumber,
        studentName,
        department,
        academicYear,
        status: 'Pending',
        collegeId
      });

      res.status(201).json({
        message: 'No-dues clearance request submitted successfully',
        clearance
      });
    } catch (err) {
      console.error('POST /library/clearance/request:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

router.get(
  '/clearance',
  protect,
  authorize('Admin', 'Sub Admin', 'Super Admin', 'Librarian', 'Library', 'Principal'),
  collegeScope,
  async (req, res) => {
    try {
      const list = await LibraryClearance.find({})
        .populate('studentId')
        .sort({ createdAt: -1 });
      res.json(list);
    } catch (err) {
      console.error('GET /library/clearance:', err);
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
      const clearance = await LibraryClearance.findById(req.params.id);
      if (!clearance) {
        return res.status(404).json({ message: 'Clearance request not found' });
      }

      clearance.status = 'Approved';
      clearance.approvedAt = new Date();
      clearance.approvedBy = req.user?._id;
      clearance.remarks = req.body?.remarks || 'All library books returned and dues cleared.';
      await clearance.save();

      res.json({ message: 'Clearance approved successfully', clearance });
    } catch (err) {
      console.error('PUT /library/clearance/:id/approve:', err);
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
      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }

      await BookCopy.deleteMany({ bookId: book._id });
      await LibraryTransaction.deleteMany({ bookId: book._id });
      await LibraryReservation.deleteMany({ bookId: book._id });
      await LibraryReturnRequest.deleteMany({ bookId: book._id });
      await Book.findByIdAndDelete(book._id);

      res.json({ message: 'Book and associated records deleted successfully' });
    } catch (err) {
      console.error('DELETE /library/books/:id:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/*
 * Delete transaction
 */
router.delete(
  '/transactions/:id',
  protect,
  authorize('Admin', 'Sub Admin', 'HOD', 'Principal', 'Librarian'),
  collegeScope,
  async (req, res) => {
    try {
      const tx = await LibraryTransaction.findById(req.params.id);
      if (!tx) {
        return res.status(404).json({ message: 'Transaction not found' });
      }

      if (tx.bookCopyId && (tx.status === 'Issued' || tx.status === 'Overdue')) {
        await BookCopy.findByIdAndUpdate(tx.bookCopyId, { status: 'Available' });
        if (tx.bookId) {
          await Book.findByIdAndUpdate(tx.bookId, { $inc: { availableCopies: 1 } });
        }
      }

      await LibraryReturnRequest.deleteMany({ transactionId: tx._id });
      await LibraryFinePayment.deleteMany({ transactionId: tx._id });
      await LibraryTransaction.findByIdAndDelete(tx._id);

      res.json({ message: 'Transaction record deleted successfully' });
    } catch (err) {
      console.error('DELETE /library/transactions/:id:', err);
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
      const dummyRegex = /asdf|test|dummy|junk|sample/i;
      const dummyBooks = await Book.find({
        $or: [
          { title: dummyRegex },
          { author: dummyRegex },
          { bookId: dummyRegex }
        ]
      });

      const dummyBookIds = dummyBooks.map(b => b._id);

      await BookCopy.deleteMany({ bookId: { $in: dummyBookIds } });
      await LibraryTransaction.deleteMany({ bookId: { $in: dummyBookIds } });
      await LibraryReservation.deleteMany({ bookId: { $in: dummyBookIds } });
      await LibraryReturnRequest.deleteMany({ bookId: { $in: dummyBookIds } });
      await Book.deleteMany({ _id: { $in: dummyBookIds } });

      const allBookIds = (await Book.find({}, '_id')).map(b => b._id);
      await BookCopy.deleteMany({ bookId: { $nin: allBookIds } });
      await LibraryTransaction.deleteMany({ bookId: { $nin: allBookIds } });
      await LibraryReservation.deleteMany({ bookId: { $nin: allBookIds } });
      await LibraryReturnRequest.deleteMany({ bookId: { $nin: allBookIds } });

      if (req.body.clearAllTransactions) {
        await LibraryTransaction.deleteMany({});
        await LibraryReservation.deleteMany({});
        await LibraryReturnRequest.deleteMany({});
        await BookCopy.updateMany({}, { status: 'Available' });
        const books = await Book.find({});
        for (const b of books) {
          const total = Number(b.totalCopies) || 1;
          b.availableCopies = total;
          b.status = 'Available';
          await b.save();
        }
      }

      res.json({ message: 'Dummy library data cleaned up successfully' });
    } catch (err) {
      console.error('POST /library/clear-dummy-data:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;






