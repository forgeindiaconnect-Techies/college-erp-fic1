import express from 'express';
import Book from '../models/Book.js';
import LibraryTransaction from '../models/LibraryTransaction.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all books with optional department filtering
router.get('/books', protect, collegeScope, async (req, res) => {
  try {
    const { department } = req.query;
    const query = department ? { department } : {};
    const books = await Book.find(query);
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new book (Admin/HOD/Librarian)
router.post('/books', protect, authorize('Admin', 'Sub Admin', 'HOD', 'Principal'), collegeScope, async (req, res) => {
  try {
    const { bookId, title, author, category, department, isbn, totalCopies, rackNumber } = req.body;
    
    // Check if bookId already exists
    const existingBook = await Book.findOne({ bookId });
    if (existingBook) {
      return res.status(400).json({ message: 'Book ID already exists' });
    }

    const newBook = new Book({
      bookId, title, author, category, department, isbn, 
      totalCopies, availableCopies: totalCopies, rackNumber
    });
    const savedBook = await newBook.save();
    res.status(201).json(savedBook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request a book
router.post('/request', protect, collegeScope, async (req, res) => {
  try {
    const { bookId } = req.body; // ObjectId of the Book
    const userId = req.user.referenceId || req.user.id || req.user._id;
    const userType = req.user.role === 'Staff' ? 'Staff' : 'Student';

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available currently' });
    }

    // Check if user already requested or issued this book
    const existingTransaction = await LibraryTransaction.findOne({
      bookId,
      userId,
      status: { $in: ['Pending', 'Issued', 'Overdue'] }
    });

    if (existingTransaction) {
      return res.status(400).json({ message: 'You already have an active request or issue for this book' });
    }

    const transaction = new LibraryTransaction({
      bookId,
      userId,
      userType,
      status: 'Pending'
    });

    const savedTransaction = await transaction.save();
    
    // Decrement available copies
    book.availableCopies -= 1;
    if (book.availableCopies === 0) {
      book.status = 'Out of Stock';
    }
    await book.save();

    res.status(201).json(savedTransaction);
  } catch (err) {
    console.error('Error in /request:', err);
    res.status(500).json({ message: err.message });
  }
});

// Get user's active/past transactions
router.get('/my-transactions', protect, collegeScope, async (req, res) => {
  try {
    const userId = req.user.referenceId || req.user.id || req.user._id;
    
    const transactions = await LibraryTransaction.find({ userId })
      .populate('bookId')
      .sort({ createdAt: -1 });

    const today = new Date();
    const updatedTransactions = transactions.map(issue => {
      if (issue.status === 'Issued' && issue.dueDate && today > issue.dueDate) {
        issue.status = 'Overdue';
        const diffTime = Math.abs(today - issue.dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        issue.fineAmount = diffDays * 10; // ₹10 per day fine
      }
      return issue;
    });
      
    res.json(updatedTransactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Issue a book (Admin/HOD/Staff)
router.put('/transactions/:id/issue', protect, authorize('Admin', 'Sub Admin', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    const transaction = await LibraryTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'Pending') return res.status(400).json({ message: 'Only pending requests can be issued' });

    const issueDate = new Date();
    // Default: Staff gets 30 days, Student gets 14 days
    const daysToAdd = transaction.userType === 'Staff' ? 30 : 14;
    const dueDate = new Date();
    dueDate.setDate(issueDate.getDate() + daysToAdd);

    transaction.status = 'Issued';
    transaction.issueDate = issueDate;
    transaction.dueDate = dueDate;

    const savedTransaction = await transaction.save();
    res.json(savedTransaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Return a book (Admin/HOD/Staff)
router.put('/transactions/:id/return', protect, authorize('Admin', 'Sub Admin', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    const transaction = await LibraryTransaction.findById(req.params.id).populate('bookId');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'Issued' && transaction.status !== 'Overdue') {
      return res.status(400).json({ message: 'Book is not currently issued' });
    }

    const returnDate = new Date();
    let fineAmount = 0;
    
    // Calculate fine if overdue (e.g., 10 rupees per day)
    if (returnDate > transaction.dueDate) {
      const diffTime = Math.abs(returnDate - transaction.dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      fineAmount = diffDays * 10;
    }

    transaction.status = 'Returned';
    transaction.returnDate = returnDate;
    transaction.fineAmount = fineAmount;

    await transaction.save();

    // Increment available copies
    const book = await Book.findById(transaction.bookId._id);
    if (book) {
      book.availableCopies += 1;
      book.status = 'Available';
      await book.save();
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reject a book request (Admin/HOD/Staff)
router.put('/transactions/:id/reject', protect, authorize('Admin', 'Sub Admin', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    const transaction = await LibraryTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'Pending') return res.status(400).json({ message: 'Only pending requests can be rejected' });

    transaction.status = 'Rejected';
    await transaction.save();

    // Increment available copies
    const book = await Book.findById(transaction.bookId);
    if (book) {
      book.availableCopies += 1;
      book.status = 'Available';
      await book.save();
    }

    res.json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all transactions for Admin/HOD
router.get('/transactions', protect, authorize('Admin', 'Sub Admin', 'HOD', 'Staff'), collegeScope, async (req, res) => {
  try {
    const { department } = req.query;
    
    // We can populate bookId and optionally filter by department
    let query = {};
    const transactions = await LibraryTransaction.find(query)
      .populate('bookId')
      .sort({ createdAt: -1 });

    // Filter by department if passed or if user is HOD/Staff
    let filterDept = department;
    if (req.user.role === 'HOD' || req.user.role === 'Staff') {
      filterDept = req.user.department;
    }
    const filtered = filterDept ? transactions.filter(t => t.bookId?.department === filterDept) : transactions;
    
    // Auto-calculate fine before sending if Overdue
    const today = new Date();
    const updatedTransactions = filtered.map(issue => {
      if (issue.status === 'Issued' && today > issue.dueDate) {
        issue.status = 'Overdue';
        const diffTime = Math.abs(today - issue.dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        issue.fineAmount = diffDays * 10; // ₹10 per day fine
      }
      return issue;
    });

    res.json(updatedTransactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manual Issue by Admin
router.post('/transactions/manual-issue', protect, authorize('Admin', 'Sub Admin', 'HOD', 'Librarian'), collegeScope, async (req, res) => {
  try {
    const { bookId, userId, userType, dueDate } = req.body;
    
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.availableCopies <= 0) return res.status(400).json({ message: 'No copies available' });

    const transaction = new LibraryTransaction({
      bookId,
      userId, // e.g. student regNo or staff ID
      userType, // 'Student' or 'Staff'
      status: 'Issued',
      issueDate: new Date(),
      dueDate: new Date(dueDate)
    });

    await transaction.save();

    book.availableCopies -= 1;
    if (book.availableCopies === 0) {
      book.status = 'Out of Stock';
    }
    await book.save();

    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
