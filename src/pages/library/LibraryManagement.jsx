import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen, Search, Filter, BookDown, CheckCircle, 
  AlertCircle, X, Eye, FileText, Download, QrCode, 
  LayoutDashboard, Clock, ArrowRightLeft, Bell, TrendingUp,
  Layers, Plus, Trash2, Edit3, CheckCircle2, Tag, BookMarked,
  BookmarkCheck, Bookmark, Hash, ShieldAlert, Users, IndianRupee,
  BarChart3, RefreshCw, ChevronRight, UserCheck, AlertTriangle,
  FileCheck2, Check, BookPlus, Sparkles, Building, Calendar,
  GraduationCap, Printer, Receipt, CreditCard, User, XCircle
} from 'lucide-react';
import { 
  getLibraryBooks, 
  createLibraryBook, 
  getAllLibraryTransactions, 
  returnLibraryBook, 
  issueLibraryBook, 
  manualIssueLibraryBook, 
  rejectLibraryRequest, 
  getStudents,
  getBookCopies,
  createBookCopy,
  updateBookCopy,
  deleteBookCopy,
  payLibraryFine,
  getLibraryFineReceipt,
  getLibraryFinePayments,
  createLibraryReservation,
  getLibraryReservations,
  approveLibraryReservation,
  rejectLibraryReservation,
  issueLibraryReservation,
  getDepartments,
  getCourses,
  getLibraryBorrowers,
  getLibraryReturnRequests,
  approveLibraryReturnRequest,
  rejectLibraryReturnRequest,
  deleteLibraryBook,
  deleteLibraryTransaction,
  clearLibraryDummyData
} from '../../api/index';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import CustomSelect from '../../components/CustomSelect';
import './LibraryManagement.css';

// Default Fallback Categories if no courses exist yet
const FALLBACK_CATEGORIES = ['Computer Science', 'Information Technology', 'Mechanical Engineering', 'Electronics & Communication', 'Electrical Engineering', 'Civil Engineering', 'Mathematics', 'Physics', 'Chemistry', 'Management Studies'];
const FALLBACK_DEPARTMENTS = ['Computer Science and Engineering', 'Information Technology', 'Mechanical Engineering', 'Electronics and Communication', 'Electrical and Electronics', 'Civil Engineering', 'Management Studies'];

const MOCK_DIGITAL = [
  { id: 'D001', title: 'Data Structures & Algorithms Lecture Notes', author: 'Prof. Cormen & Dept. CSE', type: 'PDF', size: '4.2 MB', downloads: 342, dept: 'Computer Science' },
  { id: 'D002', title: 'Database Management Systems Handbook', author: 'Prof. Korth & Dept. CSE', type: 'PDF', size: '3.1 MB', downloads: 285, dept: 'Computer Science' },
  { id: 'D003', title: 'Thermodynamics & Fluid Mechanics Notes', author: 'Dept. of Mechanical Engg.', type: 'PDF', size: '5.6 MB', downloads: 156, dept: 'Mechanical Engg.' },
  { id: 'D004', title: 'Digital Signal Processing Lab Manual', author: 'Dept. of ECE', type: 'PDF', size: '2.8 MB', downloads: 412, dept: 'Electronics & Comm.' },
  { id: 'D005', title: 'Engineering Mathematics Formula Book', author: 'Dept. of Mathematics', type: 'PDF', size: '1.9 MB', downloads: 680, dept: 'General' },
];

const TABS = [
  'Dashboard', 
  'Book Inventory', 
  'Issued Books',
  'Returned Books',
    'Return Requests',
  'Reservations', 
  'Student Members', 
  'Fines & Analytics', 
  'Digital Library'
];

const normalizeTab = (tab) => {
  if (!tab) return 'Dashboard';
  const t = tab.toLowerCase();
  if (t.includes('returned') || t.includes('return history') || t.includes('returns-history') || t.includes('returned-books')) return 'Returned Books';
  if (t === 'returns' || t.includes('return request') || t.includes('requests')) return 'Return Requests';
  if (t.includes('inventory') || t.includes('catalog') || t === 'books' || t.includes('book inventory')) return 'Book Inventory';
  if (t.includes('issue') || t.includes('circulation')) return 'Issued Books';
  if (t.includes('reserv')) return 'Reservations';
  if (t.includes('member') || t.includes('student')) return 'Student Members';
  if (t.includes('fine') || t.includes('report') || t.includes('analytic')) return 'Fines & Analytics';
  if (t.includes('digit')) return 'Digital Library';
  return 'Dashboard';
};

const LibraryManagement = ({ defaultTab = 'Dashboard' }) => {
  const [activeTab, setActiveTab] = useState(normalizeTab(defaultTab));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All');
  const [issuedSubFilter, setIssuedSubFilter] = useState('All');
  const [returnSearch, setReturnSearch] = useState('');
  const [returnStatusSubFilter, setReturnStatusSubFilter] = useState('All');
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationStatusFilter, setReservationStatusFilter] = useState('All');

  // Real-time Academic Structure State
  const [departmentsList, setDepartmentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);

  // Member search state
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberForDetails, setSelectedMemberForDetails] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const tabRouteMap = {
    'Dashboard': '/librarian/dashboard',
    'Book Inventory': '/librarian/books',
    'Issued Books': '/librarian/issued',
    'Returned Books': '/librarian/returned-books',
    'Issue & Returns': '/librarian/circulation',
    'Return Requests': '/librarian/returns',
    'Reservations': '/librarian/reservations',
    'Digital Library': '/librarian/digital',
    'Student Members': '/librarian/members',
    'Fines & Analytics': '/librarian/reports'
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (location.pathname.startsWith('/librarian')) {
      const targetRoute = tabRouteMap[tab];
      if (targetRoute && location.pathname !== targetRoute) {
        navigate(targetRoute);
      }
    }
  };

  // Sync tab if defaultTab prop updates
  useEffect(() => {
    setActiveTab(normalizeTab(defaultTab));
  }, [defaultTab]);

  // Main Add Book Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBookForm, setAddBookForm] = useState({
    bookId: '',
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    edition: '1st Edition',
    category: '',
    department: '',
    subject: '',
    totalCopies: 1,
    rackNumber: 'R01',
    shelfNumber: 'S01'
  });

  // Physical Book Copies State & Modal
  const [showCopiesModal, setShowCopiesModal] = useState(false);
  const [selectedBookForCopies, setSelectedBookForCopies] = useState(null);
  const [bookCopies, setBookCopies] = useState([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [newCopyForm, setNewCopyForm] = useState({
    accessionNumber: '',
    barcode: '',
    rackNumber: '',
    shelfNumber: '',
    condition: 'Good',
    price: ''
  });

  // Issue Book Modal State
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBookToIssue, setSelectedBookToIssue] = useState(null);
  const [issueFormData, setIssueFormData] = useState({
    bookId: '',
    bookCopyId: '',
    regNo: '',
    studentName: '',
    userType: 'Student',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // Digital Resource Upload Modal State
  const [showUploadDigitalModal, setShowUploadDigitalModal] = useState(false);
  const [digitalList, setDigitalList] = useState(MOCK_DIGITAL);
  const [digitalSearch, setDigitalSearch] = useState('');
  const [digitalDeptFilter, setDigitalDeptFilter] = useState('All Departments');
  const [digitalTypeFilter, setDigitalTypeFilter] = useState('All Types');
  const [digitalForm, setDigitalForm] = useState({ title: '', author: '', dept: '', type: 'PDF' });

  // Fine Payment & Receipt Modals
  const [receiptModal, setReceiptModal] = useState({
    isOpen: false,
    loading: false,
    receipt: null,
    error: null
  });

  const [collectFineModal, setCollectFineModal] = useState({
    isOpen: false,
    issueId: '',
    studentName: '',
    studentId: '',
    bookTitle: '',
    fineAmount: 0,
    paidAmount: 0,
    balance: 0,
    amount: '',
    paymentMethod: 'Cash',
    remarks: '',
    isSubmitting: false,
    error: null
  });

  // Core Data
  const [books, setBooks] = useState([]);
  const [reservationLoading, setReservationLoading] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [issues, setIssues] = useState([]);
  const [finePayments, setFinePayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [returnProcessingId, setReturnProcessingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      let bData = [];
      let tData = [];
      let sData = [];
      let dData = [];
      let cData = [];
      let rData = [];
      let rrData = [];

      try {
        const booksRes = await getLibraryBooks();
        bData = Array.isArray(booksRes.data) ? booksRes.data : [];
      } catch (e) {
        console.warn('getLibraryBooks fallback', e);
      }
      try {
        const txRes = await getAllLibraryTransactions();
        tData = Array.isArray(txRes.data) ? txRes.data : (Array.isArray(txRes.data?.transactions) ? txRes.data.transactions : []);
        console.log('LIBRARY TRANSACTIONS:', tData);
      } catch (e) {
        console.warn('getAllLibraryTransactions fallback', e);
      }
      try {
        let studentsRes = await getLibraryBorrowers().catch(() => null);
        if (!studentsRes || !studentsRes.data || studentsRes.data.length === 0) {
          studentsRes = await getStudents().catch(() => ({ data: [] }));
        }
        sData = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      } catch (e) {
        console.warn('getLibraryBorrowers fallback', e);
      }
      try {
        const reservationsRes = await getLibraryReservations();
        rData = Array.isArray(reservationsRes.data) ? reservationsRes.data : [];
        const resKeys = new Set(rData.map(r => `${r.bookId?._id || r.bookId}_${r.userId}`));
        (Array.isArray(tData) ? tData : []).forEach(t => {
          if (['Pending', 'Approved', 'Reserved'].includes(t.status)) {
            const key = `${t.bookId?._id || t.bookId}_${t.userId}`;
            if (!resKeys.has(key)) {
              resKeys.add(key);
              rData.push({
                _id: t._id,
                bookId: t.bookId,
                bookCopyId: t.bookCopyId,
                userId: t.userId,
                userType: t.userType || 'Student',
                status: t.status || 'Pending',
                requestDate: t.createdAt || new Date(),
                createdAt: t.createdAt || new Date(),
                isFromTransaction: true
              });
            }
          }
        });
      } catch (e) {
        console.warn('getLibraryReservations fallback', e);
      }
      try {
        const returnRequestsRes = await getLibraryReturnRequests();
        rrData = Array.isArray(returnRequestsRes.data) ? returnRequestsRes.data : [];
      } catch (e) {
        console.warn('getLibraryReturnRequests fallback', e);
      }
      try {
        const deptsRes = await getDepartments();
        dData = Array.isArray(deptsRes.data) ? deptsRes.data : [];
      } catch (e) {
        console.warn('getDepartments fallback', e);
      }
      try {
        const coursesRes = await getCourses();
        const rawCourses = coursesRes.data?.courses || coursesRes.data || [];
        cData = Array.isArray(rawCourses) ? rawCourses : [];
      } catch (e) {
        console.warn('getCourses fallback', e);
      }

      setBooks(bData);
      setIssues(tData);
      setReservations(rData);
      setReturnRequests(rrData);

      try {
        const paymentRes = await getLibraryFinePayments();
        setFinePayments(Array.isArray(paymentRes.data) ? paymentRes.data : []);
      } catch (paymentError) {
        console.error('Fine payment history error:', paymentError);
        setFinePayments([]);
      }
      setStudents(sData);
      setDepartmentsList(dData);
      setCoursesList(cData);
    } catch (error) {
      console.error('Failed to load library data', error);
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  };

  // Strictly Real Database Departments & Courses
  const realDeptNames = departmentsList.map(d => d.name || d.code).filter(Boolean);
  const realCourseNames = coursesList.map(c => c.name || c.code).filter(Boolean);

  const deptOptions = [
    { value: 'All Departments', label: 'All Departments' },
    ...departmentsList.map(d => ({
      value: d.name || d.code,
      label: d.code ? `${d.name} (${d.code})` : (d.name || d.code)
    }))
  ];

  const categoryOptions = [
    { value: 'All Categories', label: 'All Categories' },
    ...coursesList.map(c => ({
      value: c.name || c.code,
      label: c.code ? `${c.name} [${c.code}]` : (c.name || c.code)
    }))
  ];

  // Helper to get real courses for a chosen department from DB
  const getCoursesForDepartment = (deptName) => {
    if (!deptName) return coursesList;
    const selectedDeptObj = departmentsList.find(
      d => (d.name && d.name.toLowerCase() === deptName.toLowerCase()) || 
           (d.code && d.code.toLowerCase() === deptName.toLowerCase()) ||
           (d.id && d.id === deptName)
    );
    if (!selectedDeptObj) return coursesList;
    const deptId = selectedDeptObj.id || selectedDeptObj._id;
    const filtered = coursesList.filter(c => c.departmentId === deptId || c.department === deptName || c.department === selectedDeptObj.name);
    return filtered.length > 0 ? filtered : coursesList;
  };

  const handleApproveReturnRequest = async (id) => {
    try {
      setReturnProcessingId(id);
      await approveLibraryReturnRequest(id);
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to approve return request.');
    } finally {
      setReturnProcessingId(null);
    }
  };

  const handleRejectReturnRequest = async (id) => {
    try {
      setReturnProcessingId(id);
      await rejectLibraryReturnRequest(id);
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to reject return request.');
    } finally {
      setReturnProcessingId(null);
    }
  };

  const handleApproveIssueRequest = async (id) => {
    try {
      await issueLibraryBook(id);
      alert('Student request approved! The book is now actively issued.');
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to approve and issue book.');
    }
  };

  const handleRejectIssueRequest = async (id) => {
    try {
      await rejectLibraryRequest(id);
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to reject book request.');
    }
  };

  const handleDeleteBook = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title || 'this book'}" and all its physical copies?`)) return;
    try {
      await deleteLibraryBook(id);
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete book.');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to remove this transaction record?')) return;
    try {
      await deleteLibraryTransaction(id);
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  const handleCleanDummyData = async () => {
    if (!window.confirm('Are you sure you want to remove all test/dummy books (e.g. asdfghjk, test titles) and clean the library?')) return;
    try {
      await clearLibraryDummyData({ clearAllTransactions: false });
      alert('Dummy library data cleaned up successfully!');
      await fetchLibraryData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to clean dummy data.');
    }
  };
  const handleViewFineReceipt = async (issueId) => {
    try {
      setReceiptModal({ isOpen: true, loading: true, receipt: null, error: null });
      const response = await getLibraryFineReceipt(issueId);
      const payment = response?.data?.payment;
      const transaction = response?.data?.transaction;

      if (!payment) {
        setReceiptModal({
          isOpen: true,
          loading: false,
          receipt: null,
          error: 'Fine receipt record not found.'
        });
        return;
      }

      const bookTitle = transaction?.bookId?.title || 'Unknown Book';
      const studentId = payment.userId || transaction?.userId || 'N/A';
      const userType = payment.userType || transaction?.userType || 'Student';

      setReceiptModal({
        isOpen: true,
        loading: false,
        receipt: {
          receiptNumber: payment.receiptNumber || 'N/A',
          userId: studentId,
          userType: userType,
          bookTitle: bookTitle,
          amount: payment.amount || 0,
          paymentMethod: payment.paymentMethod || 'Cash',
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toLocaleString() : 'N/A',
          remarks: payment.remarks || 'Receipt generated from fine payment'
        },
        error: null
      });
    } catch (error) {
      console.error('Fine receipt error:', error);
      setReceiptModal({
        isOpen: true,
        loading: false,
        receipt: null,
        error: error?.response?.data?.message || 'Failed to load fine receipt.'
      });
    }
  };
  const handleOpenCollectFine = (issue) => {
    const fine = Number(issue.fineAmount || 0);
    const paid = Number(issue.finePaidAmount || 0);
    const balance = Math.max(0, fine - paid);

    const studentName = typeof issue.userId === 'object' && issue.userId ? (issue.userId.name || issue.userId.studentId || 'Student') : (issue.userId || 'Student');
    const studentId = typeof issue.userId === 'object' && issue.userId ? (issue.userId.studentId || issue.userId.id || issue.userId._id || 'N/A') : (issue.userId || 'N/A');
    const bookTitle = typeof issue.bookId === 'object' && issue.bookId ? (issue.bookId.title || 'Book') : 'Book';

    setCollectFineModal({
      isOpen: true,
      issueId: issue._id,
      studentName: studentName,
      studentId: studentId,
      bookTitle: bookTitle,
      fineAmount: fine,
      paidAmount: paid,
      balance: balance,
      amount: String(balance),
      paymentMethod: 'Cash',
      remarks: '',
      isSubmitting: false,
      error: null
    });
  };

  const handleCollectFineSubmit = async (e) => {
    e.preventDefault();
    const payment = Number(collectFineModal.amount);
    if (!Number.isFinite(payment) || payment <= 0) {
      setCollectFineModal(prev => ({ ...prev, error: 'Please enter a valid payment amount.' }));
      return;
    }
    if (payment > collectFineModal.balance) {
      setCollectFineModal(prev => ({ ...prev, error: `Payment cannot exceed outstanding fine balance of ₹${collectFineModal.balance}.` }));
      return;
    }

    try {
      setCollectFineModal(prev => ({ ...prev, isSubmitting: true, error: null }));
      const response = await payLibraryFine(
        collectFineModal.issueId,
        payment,
        collectFineModal.paymentMethod,
        collectFineModal.remarks
      );

      const paymentData = response?.data?.payment;
      const transactionData = response?.data?.transaction;

      // Close collect fine modal
      setCollectFineModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));

      // Refresh library transactions & KPIs
      fetchLibraryData();

      // Show receipt modal with generated receipt
      if (paymentData) {
        setReceiptModal({
          isOpen: true,
          loading: false,
          receipt: {
            receiptNumber: paymentData.receiptNumber || 'N/A',
            userId: paymentData.userId || transactionData?.userId || collectFineModal.studentId,
            userType: paymentData.userType || transactionData?.userType || 'Student',
            bookTitle: transactionData?.bookId?.title || collectFineModal.bookTitle,
            amount: paymentData.amount || payment,
            paymentMethod: paymentData.paymentMethod || collectFineModal.paymentMethod,
            paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate).toLocaleString() : new Date().toLocaleString(),
            remarks: paymentData.remarks || collectFineModal.remarks || 'Receipt generated from fine payment'
          },
          error: null
        });
      }
    } catch (error) {
      console.error('Pay fine error:', error);
      setCollectFineModal(prev => ({
        ...prev,
        isSubmitting: false,
        error: error?.response?.data?.message || 'Failed to record fine payment.'
      }));
    }
  };

























  const handleReturn = async (issueId, studentName) => {
    try {
      await returnLibraryBook(issueId, { condition: 'Good' });
      alert(`Book successfully returned and restocked to library!`);
      fetchLibraryData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to return book');
    }
  };

  const handleOpenIssueModal = (book = null) => {
    setSelectedBookToIssue(book);
    setIssueFormData({
      bookId: book ? book._id : (books[0]?._id || ''),
      bookCopyId: '',
      regNo: '',
      studentName: '',
      userType: 'Student',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setShowIssueModal(true);
  };

  const handleIssueSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!issueFormData.bookId) {
      alert('Please select a book to issue.');
      return;
    }
    if (!issueFormData.regNo) {
      alert('Please select a borrower (student / staff).');
      return;
    }
    try {
      await manualIssueLibraryBook({
        bookId: issueFormData.bookId,
        bookCopyId: issueFormData.bookCopyId || undefined,
        userId: issueFormData.regNo,
        userType: issueFormData.userType || 'Student',
        dueDate: issueFormData.dueDate
      });
      alert('Book issued successfully!');
      setShowIssueModal(false);
      fetchLibraryData();
      handleTabChange('Issued Books');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue book');
    }
  };

  const handleIssueRequest = async (transactionId) => {
    try {
      await issueLibraryBook(transactionId);
      alert('Successfully issued reserved book!');
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue book');
    }
  };

  const handleRejectRequest = async (transactionId) => {
    try {
      await rejectLibraryRequest(transactionId);
      alert('Reservation request rejected.');
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const handleAddBookSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!addBookForm.bookId || !addBookForm.title || !addBookForm.author || !addBookForm.category || !addBookForm.department) {
      alert('Please fill all required fields: Book ID, Title, Author, Category/Course, and Department.');
      return;
    }
    try {
      await createLibraryBook(addBookForm);
      alert(`Book "${addBookForm.title}" registered in catalog successfully!`);
      setShowAddModal(false);
      setAddBookForm({
        bookId: '',
        isbn: '',
        title: '',
        author: '',
        publisher: '',
        edition: '1st Edition',
        category: realCourseNames[0] || 'Computer Science',
        department: realDeptNames[0] || 'Computer Science and Engineering',
        subject: '',
        totalCopies: 1,
        rackNumber: 'R01',
        shelfNumber: 'S01'
      });
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add book to catalog');
    }
  };

  const handleOpenCopiesModal = async (book) => {
    setSelectedBookForCopies(book);
    setShowCopiesModal(true);
    setLoadingCopies(true);
    const existingCount = (book.totalCopies || 0);
    setNewCopyForm({
      accessionNumber: `ACC-${String(existingCount + 1).padStart(5, '0')}`,
      barcode: `BC-${Date.now().toString().slice(-6)}`,
      rackNumber: book.rackNumber || 'R01',
      shelfNumber: book.shelfNumber || 'S01',
      condition: 'Good',
      price: ''
    });
    try {
      const res = await getBookCopies(book._id);
      setBookCopies(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load copies', e);
      setBookCopies([]);
    } finally {
      setLoadingCopies(false);
    }
  };

  const handleAddCopySubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCopyForm.accessionNumber) {
      alert('Accession Number is required');
      return;
    }
    try {
      await createBookCopy(selectedBookForCopies._id, newCopyForm);
      alert(`Physical Copy "${newCopyForm.accessionNumber}" registered successfully!`);
      const res = await getBookCopies(selectedBookForCopies._id);
      setBookCopies(Array.isArray(res.data) ? res.data : []);
      fetchLibraryData();
      setNewCopyForm(prev => ({
        ...prev,
        accessionNumber: `ACC-${String(bookCopies.length + 2).padStart(5, '0')}`,
        barcode: `BC-${Date.now().toString().slice(-6)}`,
        price: ''
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add physical copy');
    }
  };

  const handleUpdateCopyStatus = async (copyId, updates) => {
    try {
      await updateBookCopy(copyId, updates);
      const res = await getBookCopies(selectedBookForCopies._id);
      setBookCopies(Array.isArray(res.data) ? res.data : []);
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update copy status');
    }
  };

  const handleDeleteCopy = async (copyId) => {
    if (!window.confirm('Are you sure you want to remove this physical copy?')) return;
    try {
      await deleteBookCopy(copyId);
      const res = await getBookCopies(selectedBookForCopies._id);
      setBookCopies(Array.isArray(res.data) ? res.data : []);
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete copy');
    }
  };

  // Filtered Books List
  const handleApproveReservation = async (id) => {
    try {
      await approveLibraryReservation(id);
      alert('Reservation approved successfully.');
      await fetchLibraryData();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to approve reservation.');
    }
  };

  const handleIssueReservation = async (reservation) => {
    try {
      const bookId = reservation?.bookId?._id || reservation?.bookId;

      if (!bookId) {
        alert('Book information not found for this reservation.');
        return;
      }

      const copiesRes = await getBookCopies(bookId);
      const copies = Array.isArray(copiesRes.data)
        ? copiesRes.data
        : Array.isArray(copiesRes.data?.copies)
          ? copiesRes.data.copies
          : [];

      const availableCopies = copies.filter(
        copy => copy.status === 'Available'
      );

      if (availableCopies.length === 0) {
        alert('No available physical copies for this book.');
        return;
      }

      const copyList = availableCopies
        .map((copy, index) =>
          `${index + 1}. ${copy.accessionNumber || copy.barcode || copy._id} - Rack ${copy.rackNumber || '-'} / Shelf ${copy.shelfNumber || '-'}`
        )
        .join('\n');

      const selected = window.prompt(
        `Available Physical Copies:\n\n${copyList}\n\nEnter copy number:`
      );

      if (!selected) return;

      const index = Number(selected) - 1;

      if (
        !Number.isInteger(index) ||
        index < 0 ||
        index >= availableCopies.length
      ) {
        alert('Invalid physical copy selection.');
        return;
      }

      const defaultDueDate = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0];

      const dueDate = window.prompt(
        'Enter due date (YYYY-MM-DD):',
        defaultDueDate
      );

      if (!dueDate) return;

      await issueLibraryReservation(
        reservation._id,
        availableCopies[index]._id,
        dueDate
      );

      alert('Reserved book issued successfully.');
      await fetchLibraryData();
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        'Failed to issue reserved book.'
      );
    }
  };
  const handleRejectReservation = async (id) => {
    try {
      await rejectLibraryReservation(id);
      alert('Reservation rejected successfully.');
      await fetchLibraryData();
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to reject reservation.');
    }
  };

  const handleReserveBook = async (bookId) => {
    try {
      setReservationLoading(bookId);

      await createLibraryReservation(bookId);

      alert('Book reservation submitted successfully.');
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        'Failed to reserve book.'
      );
    } finally {
      setReservationLoading(null);
    }
  };
  const filteredBooks = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = 
      (b.title || '').toLowerCase().includes(q) || 
      (b.author || '').toLowerCase().includes(q) ||
      (b.bookId || '').toLowerCase().includes(q) ||
      (b.isbn || '').toLowerCase().includes(q) ||
      (b.department || '').toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q) ||
      (b.subject || '').toLowerCase().includes(q);

    const matchCategory = categoryFilter === 'All Categories' || b.category === categoryFilter;
    const matchDept = deptFilter === 'All Departments' || b.department === deptFilter;
    const matchStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'Available' && ((b.availableCopies !== undefined ? b.availableCopies : b.available) > 0)) ||
      (statusFilter === 'Out of Stock' && ((b.availableCopies !== undefined ? b.availableCopies : b.available) === 0));

    return matchSearch && matchCategory && matchDept && matchStatus;
  });

  // Real-time Calculations
  const totalBookTitles = books.length;
  const totalPhysicalCopies = books.reduce((acc, curr) => acc + (Number(curr.totalCopies) || Number(curr.copies) || 1), 0);
  const totalAvailableCopies = books.reduce((acc, curr) => acc + (curr.availableCopies !== undefined ? Number(curr.availableCopies) : (Number(curr.available) || 1)), 0);
  const totalIssuedBooks = issues.filter(i => ['Issued', 'Overdue'].includes(i.status)).length;
  const totalOverdueBooks = issues.filter(i => i.status === 'Overdue').length;
  const totalReservedBooks = issues.filter(i => i.status === 'Pending').length;

  // Active student members (borrowers)
  const activeBorrowerIds = new Set(issues.filter(i => ['Issued', 'Overdue'].includes(i.status)).map(i => i.userId));
  const activeMembersCount = activeBorrowerIds.size;

  // Outstanding Fines & Collected Fines
  const totalOutstandingFines = issues
    .reduce((acc, curr) => {
      const fine = Number(curr.fineAmount || 0);
      const paid = Number(curr.finePaid || 0);
      return acc + Math.max(0, fine - paid);
    }, 0);

  const totalFineCollected = issues
    .reduce((acc, curr) => {
      return acc + Number(curr.finePaid || 0);
    }, 0);

  const overdueTransactions = issues.filter(i => i.status === 'Overdue');
  const recentlyAddedBooks = [...books].slice(-5).reverse();

  // Department circulation map
  const deptCounts = {};
  issues.forEach(issue => {
    const dept = issue.bookId?.department || 'General';
    deptCounts[dept] = (deptCounts[dept] || 0) + 1;
  });
  const deptCirculationData = Object.keys(deptCounts).map(dept => ({
    name: dept,
    count: deptCounts[dept]
  }));

  // Dynamic Most Popular Book Calculation from live issues and books
  const bookBorrowMap = {};
  issues.forEach(i => {
    const bId = i.bookId?._id || (typeof i.bookId === 'string' ? i.bookId : null);
    const bTitle = i.bookId?.title;
    const key = bId || bTitle;
    if (key) {
      bookBorrowMap[key] = (bookBorrowMap[key] || 0) + 1;
    }
  });

  let popularBook = null;
  let maxBorrowCount = 0;

  Object.entries(bookBorrowMap).forEach(([key, count]) => {
    if (count > maxBorrowCount) {
      maxBorrowCount = count;
      popularBook = books.find(b => b._id === key || b.bookId === key || b.title === key) || 
                    issues.find(i => (i.bookId?._id === key || i.bookId?.title === key))?.bookId;
    }
  });

  if (!popularBook && books.length > 0) {
    popularBook = books[0];
    maxBorrowCount = issues.filter(i => {
      const bId = i.bookId?._id || i.bookId;
      return bId === popularBook._id || i.bookId?.title === popularBook.title;
    }).length;
  }

  const handleAddDigitalSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!digitalForm.title || !digitalForm.author) {
      alert('Please fill all required fields: Resource Title and Author / Faculty.');
      return;
    }
    const newResource = {
      id: `D${String(Date.now()).slice(-4)}`,
      title: digitalForm.title,
      author: digitalForm.author,
      dept: digitalForm.dept || realDeptNames[0] || 'Computer Science and Engineering',
      type: digitalForm.type || 'PDF',
      size: `${(Math.random() * 3 + 1.5).toFixed(1)} MB`,
      downloads: 0
    };
    setDigitalList([newResource, ...digitalList]);
    setShowUploadDigitalModal(false);
    setDigitalForm({ title: '', author: '', dept: '', type: 'PDF' });
    alert(`Resource "${newResource.title}" uploaded to Digital Library successfully!`);
  };

  // Student members list
  const filteredStudents = students.filter(s => {
    const q = memberSearch.toLowerCase();
    const idToUse = s.id || s.referenceId || s.studentId || s.rollNo || '';
    return (
      (s.name || '').toLowerCase().includes(q) ||
      idToUse.toLowerCase().includes(q) ||
      (s.dept || s.department || '').toLowerCase().includes(q)
    );
  });

  // Digital Library filtering & calculations
  const filteredDigitalList = digitalList.filter(d => {
    const q = digitalSearch.toLowerCase();
    const matchSearch = !digitalSearch || 
      (d.title || '').toLowerCase().includes(q) || 
      (d.author || '').toLowerCase().includes(q) || 
      (d.dept || '').toLowerCase().includes(q);
    const matchDept = digitalDeptFilter === 'All Departments' || d.dept === digitalDeptFilter;
    const matchType = digitalTypeFilter === 'All Types' || d.type === digitalTypeFilter;
    return matchSearch && matchDept && matchType;
  });

  const totalDigitalDownloads = digitalList.reduce((acc, curr) => acc + (Number(curr.downloads) || 0), 0);
  const totalDigitalDepts = new Set(digitalList.map(d => d.dept)).size;

  if (isInitialLoading && books.length === 0 && issues.length === 0) {
    return (
      <div className="p-12 text-center text-muted animate-fade-in flex flex-col items-center justify-center gap-3">
        <RefreshCw size={32} className="animate-spin text-primary" />
        <p className="font-semibold text-base">Loading Library Records & Central ERP Inventory...</p>
      </div>
    );
  }

  return (
    <div className="library-page animate-fade-in">
      {/* Header */}
      <div className="lib-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: '0.85rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: '700px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main, #1e293b)' }}>
              {activeTab === 'Dashboard' && <LayoutDashboard className="text-primary" size={22} />}
              {activeTab === 'Book Inventory' && <BookOpen className="text-primary" size={22} />}
              {activeTab === 'Issued Books' && <BookDown className="text-primary" size={22} />}
              {activeTab === 'Returned Books' && <CheckCircle2 className="text-primary" size={22} />}
              {activeTab === 'Issue & Returns' && <ArrowRightLeft className="text-primary" size={22} />}
              {activeTab === 'Reservations' && <BookmarkCheck className="text-primary" size={22} />}
              {activeTab === 'Student Members' && <Users className="text-primary" size={22} />}
              {activeTab === 'Fines & Analytics' && <BarChart3 className="text-primary" size={22} />}
              {activeTab === 'Digital Library' && <FileText className="text-primary" size={22} />}
              {activeTab === 'Dashboard' ? 'Library Dashboard' : activeTab}
            </h1>
            <div className="erp-live-sync-pill">
              <span className="erp-live-pulse-dot"></span>
              <span>Live ERP Catalog Synced</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '9999px', background: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', border: '1px solid rgba(79, 70, 229, 0.2)' }}>
              {activeTab}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
            {activeTab === 'Dashboard' && 'Comprehensive overview of catalog inventory, circulation desk operations, active borrower trends, and overdue fine metrics.'}
            {activeTab === 'Book Inventory' && 'Central book titles catalog, physical copies accession registry, barcodes, and real-time shelf allocations.'}
            {activeTab === 'Issued Books' && 'Active circulation counter, student & staff loan tracking, due date monitoring, and return processing.'}
            {activeTab === 'Returned Books' && 'Historical audit log of completed book returns, settlement status, condition ratings, and fine receipts.'}
            {activeTab === 'Issue & Returns' && 'Circulation counter for manual or barcode issuance, return processing, and overdue tracking.'}
            {activeTab === 'Reservations' && 'Student online book requests, approval workflow, and 24-hour reservation hold allocations.'}
            {activeTab === 'Student Members' && 'Directory of registered student library accounts and individual loan histories.'}
            {activeTab === 'Fines & Analytics' && 'Fine assessment, payment collection receipts, and department circulation analytics.'}
            {activeTab === 'Digital Library' && 'Digital e-books, lecture PDFs, and previous question paper repository.'}
          </p>
        </div>

        {/* Global Quick Action Header Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary shadow-glow flex items-center gap-1.5 text-xs py-2 px-3.5"
            onClick={() => handleOpenIssueModal()}
          >
            <BookDown size={15} /> Issue Book
          </button>
          <button 
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5"
            onClick={() => handleTabChange('Issue & Returns')}
          >
            <ArrowRightLeft size={15} /> Process Return
          </button>
          <button 
            className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5 border-primary/30 text-primary"
            onClick={() => {
              const initialDept = realDeptNames[0] || 'Computer Science and Engineering';
              const availableCourses = getCoursesForDepartment(initialDept);
              const initialCourse = (availableCourses[0]?.name || availableCourses[0]?.code || realCourseNames[0] || 'Computer Science');
              setAddBookForm({
                bookId: `LIB-${Date.now().toString().slice(-4)}`,
                isbn: '',
                title: '',
                author: '',
                publisher: '',
                edition: '1st Edition',
                category: initialCourse,
                department: initialDept,
                subject: '',
                totalCopies: 1,
                rackNumber: 'R01',
                shelfNumber: 'S01'
              });
              setShowAddModal(true);
            }}
          >
            <Plus size={15} /> Add Book
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Displayed only when not in dedicated sidebar sub-routes) */}
      {!location.pathname.startsWith('/librarian') && (
        <div className="lib-tabs-container">
          {TABS.map(tab => {
            const pendingReservationsCount = issues.filter(i => i.status === 'Pending').length;
            return (
              <button 
                key={tab} 
                className={`lib-tab ${activeTab === tab ? 'active' : ''}`} 
                onClick={() => handleTabChange(tab)}
              >
                {tab === 'Dashboard' && <LayoutDashboard size={16} />}
                {tab === 'Book Inventory' && <BookOpen size={16} />}
                {tab === 'Issued Books' && <BookDown size={16} />}
                {tab === 'Returned Books' && <CheckCircle2 size={16} />}
                {tab === 'Return Requests' && <Clock size={16} />}
                {tab === 'Issue & Returns' && <ArrowRightLeft size={16} />}
                {tab === 'Reservations' && <BookmarkCheck size={16} />}
                {tab === 'Student Members' && <Users size={16} />}
                {tab === 'Fines & Analytics' && <BarChart3 size={16} />}
                {tab === 'Digital Library' && <FileText size={16} />}
                <span>{tab}</span>
                {tab === 'Reservations' && pendingReservationsCount > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                    {pendingReservationsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* =========================================================
          TAB 1: LIBRARY DASHBOARD
          ========================================================= */}
      {activeTab === 'Dashboard' && (
        <div className="lib-tab-content animate-fade-in space-y-6">

          {/* 8 Real-Time KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%' }}>
            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between text-blue-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Books</span>
                <BookOpen size={20} />
              </div>
              <p className="text-2xl font-black">{totalBookTitles}</p>
              <span className="text-[11px] text-muted">Unique Catalog Titles</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Available Books</span>
                <CheckCircle size={20} />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalAvailableCopies}</p>
              <span className="text-[11px] text-muted">Copies Ready on Shelf</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between text-indigo-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Copies</span>
                <Layers size={20} />
              </div>
              <p className="text-2xl font-black">{totalPhysicalCopies}</p>
              <span className="text-[11px] text-muted">Physical Barcoded Books</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between text-purple-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Issued Books</span>
                <ArrowRightLeft size={20} />
              </div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalIssuedBooks}</p>
              <span className="text-[11px] text-muted">Active Student Loans</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-rose-500 bg-rose-500/5">
              <div className="flex items-center justify-between text-rose-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Overdue Books</span>
                <AlertCircle size={20} />
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalOverdueBooks}</p>
              <span className="text-[11px] text-rose-600 font-semibold">Requires Follow-up</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between text-amber-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Reserved Books</span>
                <BookmarkCheck size={20} />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalReservedBooks}</p>
              <span className="text-[11px] text-muted">Pending Student Requests</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-teal-500">
              <div className="flex items-center justify-between text-teal-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Active Members</span>
                <Users size={20} />
              </div>
              <p className="text-2xl font-black">{activeMembersCount}</p>
              <span className="text-[11px] text-muted">Students with Active Loans</span>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between text-orange-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Outstanding Fines</span>
                <IndianRupee size={20} />
              </div>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">₹{totalOutstandingFines}</p>
              <span className="text-[11px] text-muted">Accrued Fine Balance</span>
            </div>
          </div>

          {/* Operational Dashboard Grid */}
          <div className="lib-dashboard-layout">
            
            {/* Left Column (2/3 width): Circulation Alerts & Recent Inventory */}
            <div className="lib-dashboard-col">
              
              {/* Overdue Circulation Alert Table */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold flex items-center gap-2 text-rose-600">
                    <AlertTriangle size={18} /> Overdue Books Alert ({overdueTransactions.length})
                  </h3>
                  <button 
                    className="text-xs text-primary hover:underline font-semibold"
                    onClick={() => setActiveTab('Issue & Returns')}
                  >
                    View All Circulation →
                  </button>
                </div>
                <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="p-2.5 text-left">Book Title</th>
                        <th className="p-2.5 text-left">Borrower</th>
                        <th className="p-2.5 text-left">Due Date</th>
                        <th className="p-2.5 text-right">Fine</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueTransactions.slice(0, 5).map(ot => (
                        <tr key={ot._id} className="border-b border-[var(--border-color)]/50 hover:bg-rose-500/5">
                          <td className="p-2.5 font-semibold text-[var(--text-main)] truncate max-w-[180px]" title={ot.bookId?.title}>
                            {ot.bookId?.title || 'Unknown Book'}
                          </td>
                          <td className="p-2.5 text-muted font-mono">{ot.userId}</td>
                          <td className="p-2.5 text-rose-600 font-bold">{new Date(ot.dueDate).toLocaleDateString()}</td>
                          <td className="p-2.5 text-right font-bold text-orange-600">₹{ot.fineAmount || 0}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenCollectFine(ot)}
                              className="btn-primary text-[11px] py-1 px-2.5 shadow-sm"
                            >
                              Collect Fine
                            </button>
                          </td>
                        </tr>
                      ))}
                      {overdueTransactions.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-6 text-center text-muted">
                            <CheckCircle2 size={22} className="inline mr-1 text-emerald-500" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">All books returned on schedule.</span> No overdue fines currently pending!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recently Added Books */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <BookPlus size={18} className="text-primary" /> Recently Added Catalog Titles
                  </h3>
                  <button 
                    className="text-xs text-primary hover:underline font-semibold"
                    onClick={() => setActiveTab('Book Inventory')}
                  >
                    Open Inventory →
                  </button>
                </div>
                <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                      <tr>
                        <th className="p-2.5 text-left">Accession ID</th>
                        <th className="p-2.5 text-left">Book Title & Author</th>
                        <th className="p-2.5 text-left">Department</th>
                        <th className="p-2.5 text-center">Available</th>
                        <th className="p-2.5 text-right">Copies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentlyAddedBooks.slice(0, 5).map(b => (
                        <tr key={b._id || b.id} className="border-b border-[var(--border-color)]/50 hover:bg-primary/5 cursor-pointer" onClick={() => handleOpenCopiesModal(b)}>
                          <td className="p-2.5 font-mono font-bold text-primary">{b.bookId || b.id}</td>
                          <td className="p-2.5">
                            <div className="font-semibold text-[var(--text-main)] truncate max-w-[200px]" title={b.title}>{b.title}</div>
                            <div className="text-[11px] text-muted truncate max-w-[200px]">{b.author || 'Author N/A'}</div>
                          </td>
                          <td className="p-2.5 text-muted">{b.department || 'CSE'}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${((b.availableCopies !== undefined ? b.availableCopies : b.available) > 0) ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                              {b.availableCopies !== undefined ? b.availableCopies : (b.available || 0)} Ready
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold">{b.totalCopies || b.copies || 1}</td>
                        </tr>
                      ))}
                      {recentlyAddedBooks.length === 0 && (
                        <tr>
                          <td colSpan="5" className="p-6 text-center text-muted">
                            No books added to inventory yet. Click "+ Add Book" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column (1/3 width): Circulation Spotlight & Quick Actions */}
            <div className="lib-dashboard-col">

              {/* Circulation Spotlight */}
              <div className="glass-card p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                    <BookMarked size={18} className="text-primary"/> Circulation Spotlight
                  </h3>
                  {popularBook ? (
                    <div className="lib-spotlight-box mb-3">
                      <div className="flex items-center justify-between">
                        <span className="lib-badge-spotlight">
                          {maxBorrowCount > 0 ? 'Top Borrowed' : 'Featured'}
                        </span>
                        <span className="lib-spotlight-issues">
                          {maxBorrowCount} {maxBorrowCount === 1 ? 'Issue' : 'Issues'}
                        </span>
                      </div>
                      <div>
                        <h4 className="lib-spotlight-title truncate" title={popularBook.title || 'Untitled Book'}>
                          {popularBook.title || 'Untitled Book'}
                        </h4>
                        <p className="lib-spotlight-author truncate">
                          By {popularBook.author || 'Author N/A'}
                        </p>
                        <p className="lib-spotlight-dept truncate">
                          Dept: <strong style={{ color: '#1e293b' }}>{popularBook.department || popularBook.category || 'General'}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5 shadow-sm"
                        style={{ marginTop: '0.25rem' }}
                        onClick={() => handleOpenIssueModal(popularBook)}
                      >
                        <BookDown size={14} /> Issue Book
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-[var(--border-color)] mb-3 text-center text-muted">
                      <BookOpen size={28} className="mx-auto mb-2 text-muted opacity-50" />
                      <p className="text-xs font-semibold">No books in catalog yet.</p>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-xs text-muted flex items-center justify-between">
                  <span>Catalog Strength:</span>
                  <span className="font-bold text-[var(--text-main)]">{books.length} Unique Titles</span>
                </div>
              </div>

              {/* Fast Circulation Desk Shortcuts */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--text-main)]">
                  <Sparkles size={16} className="text-primary" /> Circulation Shortcuts
                </h3>
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleOpenIssueModal()}
                    className="lib-shortcut-btn group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <BookDown size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)] group-hover:text-primary">Issue Book Counter</div>
                        <div className="text-[10px] text-muted">Direct loan assignment</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted group-hover:text-primary shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('Returned Books')}
                    className="lib-shortcut-btn group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowRightLeft size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)] group-hover:text-emerald-600">Process Returns & Fines</div>
                        <div className="text-[10px] text-muted">Barcode return scan & fine receipt</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted group-hover:text-emerald-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange('Reservations')}
                    className="lib-shortcut-btn group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <BookmarkCheck size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)] group-hover:text-amber-600 flex items-center gap-1.5">
                          Pending Reservations
                          {issues.filter(i => i.status === 'Pending').length > 0 && (
                            <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                              {issues.filter(i => i.status === 'Pending').length}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted">Review student hold requests</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted group-hover:text-amber-600 shrink-0" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: BOOK INVENTORY ⭐ (MAIN INVENTORY PAGE)
          ========================================================= */}
      {activeTab === 'Book Inventory' && (
        <div className="lib-tab-content animate-fade-in space-y-4">
          {/* Action Bar & Search with Real-time Depts and Courses */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="search-box" style={{ minWidth: '280px', maxWidth: '380px' }}>
                <Search size={16} className="text-muted"/>
                <input 
                  type="text" 
                  placeholder="Search books by title, author, ID, ISBN, dept, course..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div style={{ width: '200px' }}>
                <CustomSelect 
                  options={deptOptions}
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  icon={Building}
                />
              </div>

              <div style={{ width: '200px' }}>
                <CustomSelect 
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  icon={GraduationCap}
                />
              </div>

              <select 
                className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-medium"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available Only</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            <button 
              className="btn-primary shadow-glow flex items-center gap-2 text-sm py-2 px-4"
              onClick={() => {
                const initialDept = realDeptNames[0] || 'Computer Science and Engineering';
                const availableCourses = getCoursesForDepartment(initialDept);
                const initialCourse = (availableCourses[0]?.name || availableCourses[0]?.code || realCourseNames[0] || 'Computer Science');
                setAddBookForm({
                  bookId: `LIB-${Date.now().toString().slice(-4)}`,
                  isbn: '',
                  title: '',
                  author: '',
                  publisher: '',
                  edition: '1st Edition',
                  category: initialCourse,
                  department: initialDept,
                  subject: '',
                  totalCopies: 1,
                  rackNumber: 'R01',
                  shelfNumber: 'S01'
                });
                setShowAddModal(true);
              }}
            >
              <Plus size={16} /> + Add Book
            </button>
          </div>

          {/* Book Catalog Table */}
          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Book ID</th>
                    <th>Book Information</th>
                    <th>Author</th>
                    <th>Department & Course</th>
                    <th>Total Copies</th>
                    <th>Available</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map(b => {
                    const total = b.totalCopies !== undefined ? b.totalCopies : (b.copies || 1);
                    const avail = b.availableCopies !== undefined ? b.availableCopies : (b.available !== undefined ? b.available : total);
                    const isAvailable = avail > 0;

                    return (
                      <tr 
                        key={b._id || b.id} 
                        className="hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={() => handleOpenCopiesModal(b)}
                      >
                        <td className="font-mono text-sm font-bold text-primary">
                          {b.bookId || b.id || 'N/A'}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                              <BookOpen size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[var(--text-main)] hover:text-primary transition-colors">
                                {b.title}
                              </span>
                              <span className="text-xs text-[var(--text-muted)]">
                                {b.isbn ? `ISBN: ${b.isbn}` : ''} {b.publisher ? `• ${b.publisher}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm font-medium">{b.author}</span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{b.department || 'General'}</span>
                            <span className="text-xs text-[var(--text-muted)]">{b.category}</span>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm font-bold">{total}</span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className={`text-sm font-bold ${isAvailable ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {avail} / {total}
                            </span>
                            <div className="w-20 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, (avail / total) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${isAvailable ? 'status-available' : 'status-issued'}`}>
                            {isAvailable ? 'Available' : 'Out of Stock'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                              onClick={() => handleOpenCopiesModal(b)}
                              title="Inspect book details and physical copies"
                            >
                              <Layers size={14} /> Copies ({total})
                            </button>
                            <button 
                              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                              disabled={!isAvailable}
                              onClick={() => handleOpenIssueModal(b)}
                            >
                              <BookDown size={14} /> Issue
                            </button>
                            <button
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                              disabled={reservationLoading === (b._id || b.id)}
                              onClick={() => handleReserveBook(b._id || b.id)}
                              title="Reserve this book"
                            >
                              <Bookmark size={14} /> {reservationLoading === (b._id || b.id) ? "Reserving..." : "Reserve"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-[var(--text-muted)]">
                        No matching books found in inventory catalog.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* =========================================================
              BOOK DETAILS & PHYSICAL COPIES MANAGEMENT MODAL
              ========================================================= */}
          {showCopiesModal && selectedBookForCopies && (
            <div className="lib-modal-overlay" onClick={() => setShowCopiesModal(false)}>
              <div 
                className="lib-modal-card animate-fade-in" 
                style={{ maxWidth: '900px', width: '92%' }} 
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="text-primary" size={22} />
                      {selectedBookForCopies.title}
                    </h2>
                    <p className="text-xs text-muted mt-0.5">
                      Book ID: <span className="font-mono font-bold text-primary">{selectedBookForCopies.bookId}</span> • 
                      Author: <span className="font-medium">{selectedBookForCopies.author}</span>
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowCopiesModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-5 max-h-[75vh] overflow-y-auto">
                  {/* Book Information Section */}
                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                      <FileCheck2 size={16} className="text-primary" /> Book Information
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted block">ISBN:</span>
                        <span className="font-mono font-bold">{selectedBookForCopies.isbn || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Publisher:</span>
                        <span className="font-semibold">{selectedBookForCopies.publisher || 'MIT Press'}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Edition:</span>
                        <span className="font-semibold">{selectedBookForCopies.edition || '1st Edition'}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Department:</span>
                        <span className="font-semibold">{selectedBookForCopies.department || 'CSE'}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Category / Course:</span>
                        <span className="font-semibold">{selectedBookForCopies.category || 'General'}</span>
                      </div>
                      <div>
                        <span className="text-muted block">Rack / Shelf:</span>
                        <span className="font-mono font-semibold">
                          Rack {selectedBookForCopies.rackNumber || 'R01'} • Shelf {selectedBookForCopies.shelfNumber || 'S01'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted block">Total Copies:</span>
                        <span className="font-bold text-sm">{selectedBookForCopies.totalCopies || 1} Copies</span>
                      </div>
                      <div>
                        <span className="text-muted block">Available Copies:</span>
                        <span className="font-bold text-sm text-emerald-600">
                          {selectedBookForCopies.availableCopies !== undefined ? selectedBookForCopies.availableCopies : 1} Copies
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Physical Copies Section */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold flex items-center gap-1.5">
                        <Layers size={16} className="text-primary" /> Physical Copies ({bookCopies.length})
                      </h4>
                      {loadingCopies && <span className="text-xs text-muted">Loading copies...</span>}
                    </div>

                    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden mb-4">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="p-2.5 text-left">Accession No</th>
                            <th className="p-2.5 text-left">Barcode</th>
                            <th className="p-2.5 text-left">Rack</th>
                            <th className="p-2.5 text-left">Shelf</th>
                            <th className="p-2.5 text-left">Condition</th>
                            <th className="p-2.5 text-left">Status</th>
                            <th className="p-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookCopies.map((copy, idx) => (
                            <tr key={copy._id || idx} className="border-b border-[var(--border-color)]/50 hover:bg-primary/5">
                              <td className="p-2.5 font-mono font-bold text-primary">
                                {copy.accessionNumber}
                              </td>
                              <td className="p-2.5 font-mono text-muted">
                                {copy.barcode || '—'}
                              </td>
                              <td className="p-2.5 font-mono font-semibold">
                                {copy.rackNumber || selectedBookForCopies.rackNumber || 'R01'}
                              </td>
                              <td className="p-2.5 font-mono font-semibold">
                                {copy.shelfNumber || selectedBookForCopies.shelfNumber || 'S01'}
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  copy.condition === 'New' || copy.condition === 'Good' 
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : copy.condition === 'Fair'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                }`}>
                                  {copy.condition}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  copy.status === 'Available'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : copy.status === 'Issued'
                                    ? 'bg-blue-500/10 text-blue-600'
                                    : copy.status === 'Reserved'
                                    ? 'bg-amber-500/10 text-amber-600'
                                    : 'bg-rose-500/10 text-rose-600'
                                }`}>
                                  {copy.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <select 
                                    className="text-[11px] p-1 rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                                    value={copy.status}
                                    onChange={e => handleUpdateCopyStatus(copy._id, { status: e.target.value })}
                                  >
                                    <option value="Available">Available</option>
                                    <option value="Issued">Issued</option>
                                    <option value="Reserved">Reserved</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Lost">Lost</option>
                                    <option value="Maintenance">Maintenance</option>
                                  </select>
                                  <button 
                                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    onClick={() => handleDeleteCopy(copy._id)}
                                    title="Delete physical copy"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {bookCopies.length === 0 && !loadingCopies && (
                            <tr>
                              <td colSpan="7" className="text-center p-6 text-muted">
                                No physical copies registered yet. Use the form below to add individual physical copies.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Inline Form: [ + Add Copy ] */}
                    <form 
                      onSubmit={handleAddCopySubmit}
                      className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3"
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                        <Plus size={16} /> + Add Copy
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                        <div className="col-span-2">
                          <label className="text-[11px] font-bold text-muted block mb-1">Accession No *</label>
                          <input 
                            type="text" 
                            required 
                            className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)] font-mono"
                            placeholder="e.g. ACC-00001"
                            value={newCopyForm.accessionNumber}
                            onChange={e => setNewCopyForm({ ...newCopyForm, accessionNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted block mb-1">Barcode</label>
                          <input 
                            type="text" 
                            className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)] font-mono"
                            placeholder="e.g. BC-01"
                            value={newCopyForm.barcode}
                            onChange={e => setNewCopyForm({ ...newCopyForm, barcode: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted block mb-1">Rack</label>
                          <input 
                            type="text" 
                            className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                            placeholder="e.g. R01"
                            value={newCopyForm.rackNumber}
                            onChange={e => setNewCopyForm({ ...newCopyForm, rackNumber: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-muted block mb-1">Shelf</label>
                          <input 
                            type="text" 
                            className="w-full p-2 text-xs rounded border border-[var(--border-color)] bg-[var(--bg-card)]"
                            placeholder="e.g. S03"
                            value={newCopyForm.shelfNumber}
                            onChange={e => setNewCopyForm({ ...newCopyForm, shelfNumber: e.target.value })}
                          />
                        </div>
                        <div className="flex items-end">
                          <button 
                            type="submit" 
                            className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1 shadow-glow"
                          >
                            <Plus size={14} /> Add Copy
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="lib-modal-actions border-t border-[var(--border-color)] pt-3">
                  <button className="btn-secondary text-sm" onClick={() => setShowCopiesModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              ADD NEW BOOK MODAL WITH REAL-TIME DEPT & COURSE SELECTORS
              ========================================================= */}
          {showAddModal && (
            <div className="lib-modal-overlay" onClick={() => setShowAddModal(false)}>
              <div className="lib-modal-card animate-fade-in" style={{ maxWidth: '650px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <BookPlus className="text-primary" size={22} /> Add Book to Catalog
                    </h2>
                    <p className="text-xs text-muted">Register a new title linked with real ERP academic departments and courses.</p>
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                    <X size={20}/>
                  </button>
                </div>
                <form onSubmit={handleAddBookSubmit} className="lib-modal-form space-y-4">
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Book ID / Code *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. LIB001" 
                        value={addBookForm.bookId}
                        onChange={e => setAddBookForm({ ...addBookForm, bookId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Book Title *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Data Structures & Algorithms" 
                        value={addBookForm.title}
                        onChange={e => setAddBookForm({ ...addBookForm, title: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Author(s) *</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g. Thomas H. Cormen" 
                        value={addBookForm.author}
                        onChange={e => setAddBookForm({ ...addBookForm, author: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Publisher</label>
                      <input 
                        type="text" 
                        placeholder="e.g. MIT Press / Pearson" 
                        value={addBookForm.publisher}
                        onChange={e => setAddBookForm({ ...addBookForm, publisher: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* REAL TIME DEPARTMENT & COURSE / CATEGORY SELECTION */}
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted flex items-center gap-1">
                        <Building size={14} className="text-primary" /> Department *
                      </label>
                      <select 
                        required 
                        value={addBookForm.department}
                        onChange={e => {
                          const newDept = e.target.value;
                          const availCourses = getCoursesForDepartment(newDept);
                          const firstCourse = availCourses[0]?.name || availCourses[0]?.code || realCourseNames[0] || 'General';
                          setAddBookForm({ 
                            ...addBookForm, 
                            department: newDept,
                            category: firstCourse
                          });
                        }}
                      >
                        {realDeptNames.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="text-xs font-bold text-muted flex items-center gap-1">
                        <GraduationCap size={14} className="text-primary" /> Course / Category *
                      </label>
                      <select 
                        required 
                        value={addBookForm.category}
                        onChange={e => setAddBookForm({ ...addBookForm, category: e.target.value })}
                      >
                        {Array.from(new Set([
                          ...getCoursesForDepartment(addBookForm.department).map(c => c.name || c.code || c),
                          ...realCourseNames
                        ])).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">ISBN</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 978-0262033848" 
                        value={addBookForm.isbn}
                        onChange={e => setAddBookForm({ ...addBookForm, isbn: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Initial Total Copies *</label>
                      <input 
                        type="number" 
                        min="1" 
                        required 
                        value={addBookForm.totalCopies}
                        onChange={e => setAddBookForm({ ...addBookForm, totalCopies: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Rack Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g. R01" 
                        value={addBookForm.rackNumber}
                        onChange={e => setAddBookForm({ ...addBookForm, rackNumber: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="text-xs font-bold text-muted">Shelf Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g. S03" 
                        value={addBookForm.shelfNumber}
                        onChange={e => setAddBookForm({ ...addBookForm, shelfNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="lib-modal-actions border-t border-[var(--border-color)] pt-4">
                    <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary shadow-glow">
                      Save & Register Book
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: ISSUE & RETURNS (DAILY CIRCULATION DESK)
          ========================================================= */}
      {(activeTab === 'Issued Books' || activeTab === 'Issue & Returns') && (
        <div className="lib-tab-content animate-fade-in space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BookDown className="text-primary" size={20} /> Active Issued Books
              </h2>
              <p className="text-xs text-muted">Issue books, approve returns, track condition, and settle overdue fines.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="btn-primary shadow-glow flex items-center gap-1.5 text-sm py-2 px-4"
                onClick={() => handleOpenIssueModal()}
              >
                <BookDown size={16} /> Issue Book
              </button>
            </div>
          </div>

          {/* Active Status Sub-Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: 'All', label: 'All Circulations', count: issues.filter(i => ['Pending', 'Issued', 'Overdue'].includes(i.status)).length },
              { key: 'Pending', label: 'Pending Requests', count: issues.filter(i => i.status === 'Pending').length, alert: true },
              { key: 'Issued', label: 'Active Issued', count: issues.filter(i => i.status === 'Issued').length },
              { key: 'Overdue', label: 'Overdue', count: issues.filter(i => i.status === 'Overdue').length, danger: true }
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setIssuedSubFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  issuedSubFilter === f.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  issuedSubFilter === f.key
                    ? 'bg-white/20 text-white'
                    : f.alert && f.count > 0
                    ? 'bg-amber-500 text-white animate-pulse'
                    : f.danger && f.count > 0
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Book Title</th>
                    <th>Physical Copy</th>
                    <th>Borrower Student / Staff</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status / Fine</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.filter(i => ['Pending', 'Issued', 'Overdue'].includes(i.status)).filter(i => issuedSubFilter === 'All' ? true : i.status === issuedSubFilter).map(issue => (
                    <tr key={issue._id} className={issue.status === 'Overdue' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <td className="font-mono text-sm font-bold text-primary">{issue._id.substring(issue._id.length - 6)}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-main)]">{issue.bookId?.title}</span>
                          <span className="text-xs text-muted">ID: {issue.bookId?.bookId}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {issue.bookCopyId?.accessionNumber || issue.bookCopyId?.barcode || 'Copy unlinked'}
                          </span>
                          {issue.bookCopyId?.rackNumber && (
                            <span className="text-[11px] text-muted">
                              Rack: {issue.bookCopyId.rackNumber} / Shelf: {issue.bookCopyId.shelfNumber || '-'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === issue.userId || s.referenceId === issue.userId)?.name || issue.userId}
                          </span>
                          <span className="text-xs text-muted">{issue.userId} • {issue.userType}</span>
                        </div>
                      </td>
                      <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '-'}</td>
                      <td className={issue.status === 'Overdue' ? 'text-danger font-bold' : ''}>
                        {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        {issue.status === 'Overdue' ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-danger font-bold text-xs uppercase px-2 py-0.5 bg-red-100 dark:bg-red-950/40 rounded inline-block w-max">Overdue</span>
                            <span className="text-xs font-semibold text-rose-600">Fine: ₹{issue.fineAmount}</span>
                          </div>
                        ) : issue.status === 'Returned' ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-500 font-bold text-xs uppercase px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded inline-block w-max">
                              Returned
                            </span>
                            {issue.returnDate && (
                              <span className="text-xs text-muted">
                                Returned: {new Date(issue.returnDate).toLocaleDateString()}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-emerald-600">
                              Fine: ₹{Number(issue.fineAmount || 0)}
                            </span>
                          </div>

                        ) : issue.status === 'Pending' ? (
                          <span className="text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 font-bold text-xs uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Clock size={12} /> Pending Approval
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-xs uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                            <Check size={12} /> Active Loan
                          </span>
                        )}

                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {issue.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              onClick={() => handleApproveIssueRequest(issue._id)}
                              title="Approve book request & allocate to student"
                            >
                              Approve Issue
                            </button>
                            <button
                              className="btn-secondary text-xs py-1.5 px-2 text-rose-600 hover:bg-rose-50 border-rose-200"
                              onClick={() => handleRejectIssueRequest(issue._id)}
                              title="Reject student request"
                            >
                              Reject
                            </button>
                          </div>
                        ) : issue.status !== 'Returned' ? (
                          <button className="btn-primary text-xs py-1.5 px-3" onClick={() => handleReturn(issue._id, issue.userId)}>
                            {issue.status === 'Overdue' ? 'Collect Fine & Return' : 'Receive Return'}
                          </button>
                        ) : (
                          <span className="text-xs text-muted font-semibold flex items-center justify-end gap-1">
                            <CheckCircle2 size={14} className="text-emerald-500" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {issues.filter(i => ['Pending', 'Issued', 'Overdue'].includes(i.status)).filter(i => issuedSubFilter === 'All' ? true : i.status === issuedSubFilter).length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-muted">
                        {issuedSubFilter === 'Pending' ? 'No pending book issue requests from students.' : issuedSubFilter === 'Overdue' ? 'No overdue books found.' : 'No active books currently issued.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB: RETURNED BOOKS (RETURN AUDIT & HISTORY)
          ========================================================= */}
      {activeTab === 'Returned Books' && (
        <div className="lib-tab-content animate-fade-in space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={20} /> Returned Books Log
              </h2>
              <p className="text-xs text-muted">Complete audit log of returned books, return timestamps, and settled fine collections.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={fetchLibraryData} className="btn-secondary flex items-center gap-2 text-xs py-2 px-3">
                <RefreshCw size={14} /> Refresh Log
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Return / Issue ID</th>
                    <th>Book Title</th>
                    <th>Borrower Student / Staff</th>
                    <th>Issue Date</th>
                    <th>Returned On</th>
                    <th>Fine Status</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.filter(i => i.status === 'Returned').map(issue => (
                    <tr key={issue._id}>
                      <td className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400">{issue._id.substring(issue._id.length - 6)}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-main)]">{issue.bookId?.title}</span>
                          <span className="text-xs text-muted">ID: {issue.bookId?.bookId}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === issue.userId || s.referenceId === issue.userId)?.name || issue.userId}
                          </span>
                          <span className="text-xs text-muted">{issue.userId} • {issue.userType}</span>
                        </div>
                      </td>
                      <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {issue.returnDate ? new Date(issue.returnDate).toLocaleDateString() : '-'}
                          </span>
                          {issue.dueDate && (
                            <span className="text-[11px] text-muted">Due: {new Date(issue.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded inline-block ${Number(issue.fineAmount || 0) > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                          Fine: ₹{Number(issue.fineAmount || 0)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={13} className="text-emerald-500" /> Settled & Returned
                        </span>
                      </td>
                    </tr>
                  ))}
                  {issues.filter(i => i.status === 'Returned').length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center p-8 text-muted">
                        No returned books recorded in history yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: RETURN REQUESTS (REAL-TIME VERIFICATION & RESTOCK DESK)
          ========================================================= */}
      {activeTab === 'Return Requests' && (
        <div className="lib-tab-content animate-fade-in space-y-5">
          {/* Header Bar */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ArrowRightLeft className="text-primary" size={22} />
                  Return Requests & Physical Verification Desk
                </h2>
                <span className="erp-live-sync-pill">
                  <span className="erp-live-pulse-dot" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-muted">
                Audit student book return submissions, inspect physical item condition, settle overdue penalties, and restock to inventory.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchLibraryData}
                className="btn-secondary flex items-center gap-2 text-xs py-2 px-3.5"
                title="Synchronize live return requests"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh Desk
              </button>
            </div>
          </div>

          {/* ERP KPI Metric Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%' }}>
            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pending Inspections</p>
                  <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
                    {returnRequests.filter(r => r.status === 'Pending').length}
                  </p>
                  <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-1 font-medium">Awaiting physical check-in</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                  <Clock size={22} />
                </div>
              </div>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Restocked Copies</p>
                  <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
                    {returnRequests.filter(r => r.status === 'Completed' || r.status === 'Approved').length}
                  </p>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1 font-medium">Approved & released to shelf</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 size={22} />
                </div>
              </div>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-rose-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Rejected Requests</p>
                  <p className="text-2xl font-extrabold text-rose-900 dark:text-rose-200 mt-1">
                    {returnRequests.filter(r => r.status === 'Rejected').length}
                  </p>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400/70 mt-1 font-medium">Declined condition / mismatch</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 dark:bg-rose-400/10 border border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                  <XCircle size={22} />
                </div>
              </div>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Return Flow</p>
                  <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-200 mt-1">
                    {returnRequests.length}
                  </p>
                  <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/70 mt-1 font-medium">Cumulative student submissions</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <ArrowRightLeft size={22} />
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Filters and Fast Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              {[
                { key: 'All', label: 'All Requests', count: returnRequests.length },
                { key: 'Pending', label: 'Pending Verification', count: returnRequests.filter(r => r.status === 'Pending').length, alert: true },
                { key: 'Completed', label: 'Approved & Restocked', count: returnRequests.filter(r => r.status === 'Completed' || r.status === 'Approved').length },
                { key: 'Rejected', label: 'Rejected', count: returnRequests.filter(r => r.status === 'Rejected').length, danger: true }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setReturnStatusSubFilter(f.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border whitespace-nowrap ${
                    returnStatusSubFilter === f.key
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    returnStatusSubFilter === f.key
                      ? 'bg-white/20 text-white'
                      : f.alert && f.count > 0
                      ? 'bg-amber-500 text-white animate-pulse'
                      : f.danger && f.count > 0
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 min-w-[280px] flex-1 max-w-md ml-auto">
              <div className="relative w-full">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student, book, copy, or notes..."
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
                {returnSearch && (
                  <button
                    type="button"
                    onClick={() => setReturnSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Borrower</th>
                    <th>Book Details</th>
                    <th>Allocated Copy</th>
                    <th>Loan Timeline</th>
                    <th>Submission Info</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Desk Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = returnRequests.filter(req => {
                      const q = returnSearch.toLowerCase().trim();
                      const tx = req.transactionId || {};
                      const bk = req.bookId || tx.bookId || {};
                      const cp = req.bookCopyId || tx.bookCopyId || {};
                      const student = students.find(s => s.id === req.userId || s.referenceId === req.userId || s._id === req.userId || s.studentId === req.userId || s.rollNo === req.userId || s.name === req.userId);
                      const studentName = student?.name || req.userId || '';

                      const matchSearch = !q || 
                        (req.userId || '').toLowerCase().includes(q) ||
                        studentName.toLowerCase().includes(q) ||
                        (bk.title || tx.bookTitle || '').toLowerCase().includes(q) ||
                        (bk.author || '').toLowerCase().includes(q) ||
                        (cp.accessionNumber || '').toLowerCase().includes(q) ||
                        (cp.barcode || '').toLowerCase().includes(q) ||
                        (req.remarks || '').toLowerCase().includes(q);

                      const matchStatus = returnStatusSubFilter === 'All'
                        ? true
                        : returnStatusSubFilter === 'Pending'
                          ? req.status === 'Pending'
                          : returnStatusSubFilter === 'Completed'
                            ? (req.status === 'Completed' || req.status === 'Approved')
                            : req.status === returnStatusSubFilter;

                      return matchSearch && matchStatus;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="text-center py-12 text-muted">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <ArrowRightLeft size={36} className="text-slate-300 dark:text-slate-600 mb-1" />
                              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                {returnStatusSubFilter === 'Pending' 
                                  ? 'No pending return requests from students.' 
                                  : returnSearch 
                                  ? 'No return requests matched your search criteria.' 
                                  : 'No return requests logged in the system.'}
                              </p>
                              <p className="text-xs text-muted max-w-md">
                                When students submit a return request from their student portal, it will appear here for librarian physical verification and restocking.
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(request => {
                      const transaction = request.transactionId || {};
                      const book = request.bookId || transaction.bookId || {};
                      const copy = request.bookCopyId || transaction.bookCopyId || {};
                      const student = students.find(s => s.id === request.userId || s.referenceId === request.userId || s._id === request.userId || s.studentId === request.userId || s.rollNo === request.userId || s.name === request.userId);
                      const studentName = student?.name || request.userId || 'Student';
                      const initials = studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'ST';

                      const isOverdue = transaction.dueDate && new Date() > new Date(transaction.dueDate);
                      const overdueDays = isOverdue ? Math.ceil((new Date() - new Date(transaction.dueDate)) / (1000 * 60 * 60 * 24)) : 0;
                      const fineAmt = Number(transaction.fineAmount || (overdueDays * 10) || 0);

                      return (
                        <tr key={request._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          {/* Student */}
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 dark:text-white text-xs">
                                  {studentName}
                                </span>
                                <span className="text-[11px] text-muted flex items-center gap-1">
                                  <span className="font-mono">{request.userId}</span>
                                  {student?.department && <span>• {student.department}</span>}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Book */}
                          <td>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                                <BookOpen size={13} className="text-primary flex-shrink-0" />
                                {book.title || transaction.bookTitle || 'Library Book'}
                              </span>
                              <span className="text-[11px] text-muted ml-4">
                                {book.author ? `by ${book.author}` : ''} {book.bookId ? `• ID: ${book.bookId}` : ''}
                              </span>
                            </div>
                          </td>

                          {/* Copy */}
                          <td>
                            <div className="flex flex-col gap-0.5">
                              {copy.accessionNumber || copy.barcode ? (
                                <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 w-max">
                                  {copy.accessionNumber || copy.barcode}
                                </span>
                              ) : (
                                <span className="text-xs text-muted">Copy unlinked</span>
                              )}
                              {(copy.rackNumber || copy.shelfNumber) && (
                                <span className="text-[10px] text-muted">
                                  Rack {copy.rackNumber || '-'} • Shelf {copy.shelfNumber || '-'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Loan Timeline */}
                          <td>
                            <div className="flex flex-col text-xs">
                              <span>
                                Issued: {transaction.issueDate ? new Date(transaction.issueDate).toLocaleDateString() : '—'}
                              </span>
                              <span className={isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600 dark:text-slate-400'}>
                                Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : '—'}
                              </span>
                              {isOverdue && (
                                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 w-max mt-0.5">
                                  Overdue ({overdueDays}d) • Fine: ₹{fineAmt}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Submission Info */}
                          <td>
                            <div className="flex flex-col text-xs">
                              <span className="text-slate-700 dark:text-slate-300">
                                {request.requestDate ? new Date(request.requestDate).toLocaleDateString() : new Date(request.createdAt).toLocaleDateString()}
                              </span>
                              {request.remarks ? (
                                <span className="text-[11px] text-slate-500 italic max-w-[150px] truncate" title={request.remarks}>
                                  "{request.remarks}"
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted">No notes</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            {request.status === 'Pending' ? (
                              <span className="text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 font-bold text-xs uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                                <Clock size={11} className="animate-spin text-amber-600" /> Pending Check
                              </span>
                            ) : request.status === 'Completed' || request.status === 'Approved' ? (
                              <span className="text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-xs uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Restocked
                              </span>
                            ) : (
                              <span className="text-rose-700 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-xs uppercase px-2.5 py-1 rounded-full inline-flex items-center gap-1 border border-rose-200 dark:border-rose-800">
                                <XCircle size={12} className="text-rose-600" /> Rejected
                              </span>
                            )}
                          </td>

                          {/* Desk Action */}
                          <td style={{ textAlign: 'right' }}>
                            {request.status === 'Pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={returnProcessingId === request._id}
                                  onClick={() => handleApproveReturnRequest(request._id)}
                                  className="btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
                                  title="Inspect condition and restock copy to available inventory"
                                >
                                  {returnProcessingId === request._id ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Check size={12} />
                                  )}
                                  Approve & Restock
                                </button>
                                <button
                                  type="button"
                                  disabled={returnProcessingId === request._id}
                                  onClick={() => handleRejectReturnRequest(request._id)}
                                  className="btn-secondary text-xs py-1.5 px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 dark:text-rose-400 font-semibold flex items-center gap-1 disabled:opacity-50"
                                  title="Reject return submission"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            ) : request.status === 'Completed' || request.status === 'Approved' ? (
                              <span className="text-xs text-muted font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                Restocked {request.processedDate ? new Date(request.processedDate).toLocaleDateString() : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-rose-500 font-semibold flex items-center justify-end gap-1">
                                <XCircle size={13} className="text-rose-500" />
                                Declined
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'Reservations' && (
        <div className="lib-tab-content animate-fade-in space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BookmarkCheck className="text-primary" size={20} /> Student Book Reservations
              </h2>
              <p className="text-xs text-muted">Review hold requests placed by students from student portal.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchLibraryData()}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Refresh Requests
              </button>
            </div>
          </div>

          {/* KPI Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', width: '100%' }}>
            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-blue-500">
              <div>
                <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Total Requests</p>
                <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-200 mt-1">{reservations.length}</p>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400/70 mt-1 font-medium">All student hold submissions</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner">
                <Bookmark size={22} />
              </div>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-amber-500">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Pending Review
                </p>
                <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mt-1">
                  {reservations.filter(r => r.status === 'Pending' || !r.status).length}
                </p>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-1 font-medium">Awaiting librarian approval</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                <Clock size={22} />
              </div>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-emerald-500">
              <div>
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Approved / Ready</p>
                <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-1">
                  {reservations.filter(r => r.status === 'Approved').length}
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1 font-medium">Ready for copy allocation</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="glass-card p-4 relative overflow-hidden border-l-4 border-l-purple-500">
              <div>
                <p className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Completed / Issued</p>
                <p className="text-2xl font-extrabold text-purple-900 dark:text-purple-200 mt-1">
                  {reservations.filter(r => r.status === 'Completed' || r.status === 'Issued').length}
                </p>
                <p className="text-[11px] text-purple-600/80 dark:text-purple-400/70 mt-1 font-medium">Physical books handed over</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 dark:bg-purple-400/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-inner">
                <BookOpen size={22} />
              </div>
            </div>
          </div>

          {/* Sub-Filters & Live Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { key: 'All', label: 'All Requests', count: reservations.length },
                { key: 'Pending', label: 'Pending Action', count: reservations.filter(r => r.status === 'Pending' || !r.status).length, alert: true },
                { key: 'Approved', label: 'Approved', count: reservations.filter(r => r.status === 'Approved').length },
                { key: 'Completed', label: 'Completed', count: reservations.filter(r => r.status === 'Completed' || r.status === 'Issued').length },
                { key: 'Rejected', label: 'Rejected', count: reservations.filter(r => r.status === 'Rejected').length }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setReservationStatusFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    reservationStatusFilter === f.key
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--border-color)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    reservationStatusFilter === f.key
                      ? 'bg-white/20 text-white'
                      : f.alert && f.count > 0
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="search-box" style={{ maxWidth: '320px', width: '100%' }}>
              <Search size={15} className="text-muted" />
              <input
                type="text"
                placeholder="Search student name, roll no, book title..."
                value={reservationSearch}
                onChange={e => setReservationSearch(e.target.value)}
              />
              {reservationSearch && (
                <button onClick={() => setReservationSearch('')} className="text-xs text-muted hover:text-rose-500">
                  ✕
                </button>
              )}
            </div>

          </div>

          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Borrower Student</th>
                    <th>Book Requested</th>
                    <th>Department / Cat</th>
                    <th>Date Requested</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Workflow Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = reservations
                      .filter(r => {
                        if (reservationStatusFilter === 'All') return true;
                        if (reservationStatusFilter === 'Pending') return r.status === 'Pending' || !r.status;
                        if (reservationStatusFilter === 'Completed') return r.status === 'Completed' || r.status === 'Issued';
                        return r.status === reservationStatusFilter;
                      })
                      .filter(r => {
                        if (!reservationSearch.trim()) return true;
                        const query = reservationSearch.toLowerCase();
                        const studentObj = students.find(s =>
                          s.id === r.userId ||
                          s.referenceId === r.userId ||
                          s.studentId === r.userId ||
                          s.rollNo === r.userId ||
                          s.registerNumber === r.userId ||
                          String(s._id) === String(r.userId)
                        );
                        const sName = (studentObj?.name || r.userId || '').toLowerCase();
                        const sRoll = (studentObj?.rollNo || studentObj?.registerNumber || studentObj?.studentId || '').toLowerCase();
                        const bTitle = (r.bookId?.title || '').toLowerCase();
                        const bAuthor = (r.bookId?.author || '').toLowerCase();
                        const reqId = (r._id || '').toLowerCase();
                        return sName.includes(query) || sRoll.includes(query) || bTitle.includes(query) || bAuthor.includes(query) || reqId.includes(query);
                      });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="text-center p-12">
                            <div className="flex flex-col items-center justify-center gap-2.5 text-muted">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                <BookmarkCheck size={26} />
                              </div>
                              <p className="text-sm font-bold text-slate-800 dark:text-white">
                                {reservationStatusFilter === 'Pending' ? 'No pending student book reservations' : 'No book reservation records found'}
                              </p>
                              <p className="text-xs text-muted max-w-sm">
                                {reservationSearch ? `No requests match "${reservationSearch}". Try clearing your search.` : 'When students request books from the Student Portal catalog, their hold requests will appear here for one-click approval and physical copy issuance.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(res => {
                      const studentObj = students.find(s =>
                        s.id === res.userId ||
                        s.referenceId === res.userId ||
                        s.studentId === res.userId ||
                        s.rollNo === res.userId ||
                        s.registerNumber === res.userId ||
                        String(s._id) === String(res.userId)
                      );
                      const studentName = studentObj?.name || res.userName || res.userId;
                      const studentRoll = studentObj?.rollNo || studentObj?.registerNumber || studentObj?.studentId || res.userId;
                      const studentDept = studentObj?.department || studentObj?.course || res.userType;
                      const bookTitle = res.bookId?.title || 'Book Title N/A';
                      const bookAuthor = res.bookId?.author || 'Author N/A';
                      const bookCategory = res.bookId?.category || res.bookId?.department || 'General';

                      return (
                        <tr key={res._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              REQ-{(res._id || '').slice(-6).toUpperCase()}
                            </span>
                          </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {studentName}
                          </span>
                          <span className="text-xs text-muted">{studentRoll} • {studentDept} • {res.userType}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-[var(--text-main)]">{bookTitle}</span>
                          <span className="text-xs text-muted">by {bookAuthor}</span>
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                          {bookCategory}
                        </span>
                      </td>
                      <td>{new Date(res.requestDate || res.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`font-bold text-xs uppercase px-2 py-0.5 rounded inline-block ${
                          res.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          res.status === 'Rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          {res.status || 'Pending'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-2">
                          {(res.status === 'Pending' || !res.status) ? (
                            <>
                              <button className="btn-primary text-xs py-1.5 px-3" onClick={() => handleApproveReservation(res._id)}>
                                Approve
                              </button>
                              <button className="btn-secondary text-xs py-1.5 px-3 text-danger" onClick={() => handleRejectReservation(res._id)}>
                                Reject
                              </button>
                            </>
                          ) : res.status === 'Approved' ? (
                            <button
                              className="btn-primary text-xs py-1.5 px-3"
                              onClick={() => handleIssueReservation(res)}
                            >
                              Issue Book
                            </button>
                          ) : (
                            <span className="text-xs text-muted font-semibold">
                              {res.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                      );
                    });
                  })()}







                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 5: STUDENT MEMBERS (AUTOMATIC ERP STUDENTS)
          ========================================================= */}
      {activeTab === 'Student Members' && (
        <div className="lib-tab-content animate-fade-in space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="text-primary" size={20} /> Student Library Members
              </h2>
              <p className="text-xs text-muted">Automatically synced with ERP student registry with active loan counts and fine records.</p>
            </div>
            <div className="search-box" style={{ maxWidth: '320px' }}>
              <Search size={16} className="text-muted" />
              <input 
                type="text" 
                placeholder="Search by student name, register no, dept..." 
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Register No</th>
                    <th>Department</th>
                    <th>Books Borrowed</th>
                    <th>Outstanding Fine</th>
                    <th>Clearance Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => {
                    const studentId = student.id || student.referenceId || student.studentId || student.rollNo || student._id;
                    const studentLoans = issues.filter(i => i.userId === studentId && ['Issued', 'Overdue'].includes(i.status));
                    const studentFines = studentLoans.reduce((acc, curr) => acc + (curr.fineAmount || 0), 0);
                    const isCleared = studentLoans.length === 0 && studentFines === 0;

                    return (
                      <tr key={student._id || studentId} className="hover:bg-primary/5 transition-colors">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[var(--text-main)]">{student.name}</span>
                              <span className="text-xs text-muted">{student.email || 'student@fic.edu'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="font-mono text-sm font-semibold">{studentId}</td>
                        <td>
                          <span className="text-sm">{student.dept || student.department || 'CSE'}</span>
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${studentLoans.length > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {studentLoans.length} Books
                          </span>
                        </td>
                        <td>
                          <span className={`text-sm font-bold ${studentFines > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₹{studentFines}
                          </span>
                        </td>
                        <td>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isCleared ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                            {isCleared ? 'Cleared' : 'Pending Return/Fine'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn-secondary text-xs py-1.5 px-3"
                            onClick={() => setSelectedMemberForDetails({ student, loans: studentLoans, fines: studentFines })}
                          >
                            View Library Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Member Library Card Detail Modal */}
          {selectedMemberForDetails && (
            <div className="lib-modal-overlay" onClick={() => setSelectedMemberForDetails(null)}>
              <div className="lib-modal-card animate-fade-in" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <Users className="text-primary" size={20} /> Student Library History
                    </h2>
                    <p className="text-xs text-muted">
                      {selectedMemberForDetails.student.name} • {selectedMemberForDetails.student.id || selectedMemberForDetails.student.rollNo}
                    </p>
                  </div>
                  <button className="modal-close-btn" onClick={() => setSelectedMemberForDetails(null)}><X size={20}/></button>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-xs">
                    <div>
                      <span className="text-muted block">Department:</span>
                      <span className="font-bold">{selectedMemberForDetails.student.dept || selectedMemberForDetails.student.department || 'CSE'}</span>
                    </div>
                    <div>
                      <span className="text-muted block">Outstanding Fine:</span>
                      <span className="font-bold text-rose-600">₹{selectedMemberForDetails.fines}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Currently Borrowed Books</h4>
                    <div className="border border-[var(--border-color)] rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
                          <tr>
                            <th className="p-2 text-left">Book</th>
                            <th className="p-2 text-left">Due Date</th>
                            <th className="p-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMemberForDetails.loans.map(l => (
                            <tr key={l._id} className="border-b border-[var(--border-color)]/50">
                              <td className="p-2 font-semibold">{l.bookId?.title}</td>
                              <td className="p-2">{new Date(l.dueDate).toLocaleDateString()}</td>
                              <td className="p-2 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'Overdue' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {selectedMemberForDetails.loans.length === 0 && (
                            <tr>
                              <td colSpan="3" className="p-4 text-center text-muted">No books currently borrowed.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="lib-modal-actions border-t border-[var(--border-color)] pt-3">
                  <button className="btn-secondary" onClick={() => setSelectedMemberForDetails(null)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 6: FINES & ANALYTICS
          ========================================================= */}
      {activeTab === 'Fines & Analytics' && (
        <div className="lib-tab-content animate-fade-in space-y-6">
          
          {/* 4 Financial & Circulation KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', width: '100%' }}>
            <div className="glass-card p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Fine Collected</span>
                <IndianRupee size={20} />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{totalFineCollected}</p>
              <span className="text-[11px] text-muted">Cleared Receipts Total</span>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-rose-500 bg-rose-500/5">
              <div className="flex items-center justify-between text-rose-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Outstanding Fines</span>
                <AlertTriangle size={20} />
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">₹{totalOutstandingFines}</p>
              <span className="text-[11px] text-rose-600 font-semibold">Pending Collection</span>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between text-indigo-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Most Active Dept</span>
                <Building size={20} />
              </div>
              <p className="text-2xl font-black text-primary truncate">{deptCirculationData[0]?.name || (realDeptNames[0] || '—')}</p>
              <span className="text-[11px] text-muted">Highest Circulation Volume</span>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between text-amber-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Overdue Borrowers</span>
                <Users size={20} />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {issues.filter(i => Number(i.fineAmount || 0) > Number(i.finePaid || 0)).length}
              </p>
              <span className="text-[11px] text-muted">Students with Balances</span>
            </div>
          </div>

          {/* Main Fine Collection & Audit Ledger Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-secondary)]/40">
              <div>
                <h3 className="font-bold text-base text-[var(--text-main)] flex items-center gap-2">
                  <Receipt className="text-primary" size={18} /> Fine Collection & Audit Ledger
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Track and collect outstanding student library fines and view generated counter receipts.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {issues.filter(i => Number(i.fineAmount || 0) > 0).length} Fine Records
                </span>
                <button 
                  type="button" 
                  onClick={() => alert('Exporting Fine Ledger Report...')}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Download size={14}/> Export Report
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-left">
                    <th className="p-3">Borrower (Student / Staff)</th>
                    <th className="p-3">Book Information</th>
                    <th className="p-3 text-right">Total Fine</th>
                    <th className="p-3 text-right">Paid</th>
                    <th className="p-3 text-right">Balance</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Receipt</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {issues
                    .filter(i => Number(i.fineAmount || 0) > 0)
                    .map(issue => {
                      const fine = Number(issue.fineAmount || 0);
                      const paid = Number(issue.finePaid || 0);
                      const balance = Math.max(0, fine - paid);

                      return (
                        <tr
                          key={issue._id}
                          className="border-b border-[var(--border-color)]/60 hover:bg-primary/5 transition-colors"
                        >
                          <td className="p-3">
                            <div className="font-bold font-mono text-[var(--text-main)]">
                              {issue.userId}
                            </div>
                            <div className="text-[11px] text-muted">
                              {issue.userType || 'Student'}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-semibold text-[var(--text-main)]">
                              {issue.bookId?.title || 'Unknown Book'}
                            </div>
                            <div className="text-[11px] text-muted">
                              ID: {issue.bookId?.bookId || '—'}
                            </div>
                          </td>

                          <td className="p-3 text-right font-bold text-orange-600">
                            ₹{fine}
                          </td>

                          <td className="p-3 text-right font-bold text-emerald-600">
                            ₹{paid}
                          </td>

                          <td className="p-3 text-right font-bold text-rose-600">
                            ₹{balance}
                          </td>

                          <td className="p-3 text-center">
                            {balance <= 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-[11px] font-bold border border-orange-300 dark:border-orange-800">
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {paid > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleViewFineReceipt(issue._id)}
                                className="text-primary font-bold text-xs hover:underline flex items-center gap-1 mx-auto"
                              >
                                <Receipt size={13} /> View Receipt
                              </button>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            {balance > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCollectFine(issue)}
                                className="btn-primary text-xs px-3 py-1.5 shadow-sm"
                              >
                                Collect Fine
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-emerald-600">
                                ✓ Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {issues.filter(i => Number(i.fineAmount || 0) > 0).length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-muted">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                        <span className="font-semibold text-emerald-600">No overdue fines recorded.</span> All accounts are settled!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 7: DIGITAL LIBRARY
          ========================================================= */}
      {activeTab === 'Digital Library' && (
        <div className="lib-tab-content animate-fade-in space-y-6">
          
          {/* 4 Digital Repository KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', width: '100%' }}>
            <div className="glass-card p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between text-blue-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Total E-Resources</span>
                <FileText size={20} />
              </div>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{digitalList.length}</p>
              <span className="text-[11px] text-muted">Archived PDF Notes & Manuals</span>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Downloads</span>
                <Download size={20} />
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalDigitalDownloads}</p>
              <span className="text-[11px] text-muted">Student Access Velocity</span>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between text-indigo-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Department Branches</span>
                <Building size={20} />
              </div>
              <p className="text-2xl font-black text-primary">{totalDigitalDepts}</p>
              <span className="text-[11px] text-muted">Academic Departments Covered</span>
            </div>

            <div className="glass-card p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between text-purple-500 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Repository Access</span>
                <Sparkles size={20} />
              </div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">Open 24/7</p>
              <span className="text-[11px] text-muted">Direct Student PDF Access</span>
            </div>
          </div>

          {/* Search, Filter, and Upload Action Bar */}
          <div className="flex flex-wrap justify-between items-center gap-3 bg-[var(--bg-secondary)]/50 p-4 rounded-xl border border-[var(--border-color)]">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="search-box" style={{ minWidth: '260px', maxWidth: '360px' }}>
                <Search size={16} className="text-muted"/>
                <input 
                  type="text" 
                  placeholder="Search notes, handbook, faculty..." 
                  value={digitalSearch} 
                  onChange={e => setDigitalSearch(e.target.value)}
                />
              </div>

              <div style={{ width: '200px' }}>
                <CustomSelect 
                  options={deptOptions}
                  value={digitalDeptFilter}
                  onChange={(e) => setDigitalDeptFilter(e.target.value)}
                  icon={Building}
                />
              </div>

              <select 
                className="p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold"
                value={digitalTypeFilter}
                onChange={e => setDigitalTypeFilter(e.target.value)}
              >
                <option value="All Types">All Formats</option>
                <option value="PDF">PDF Documents</option>
                <option value="Lecture Notes">Lecture Notes</option>
                <option value="Lab Manual">Lab Manuals</option>
                <option value="Formula Book">Formula Books</option>
              </select>
            </div>

            <button 
              className="btn-primary shadow-glow flex items-center gap-2 text-xs py-2.5 px-4"
              onClick={() => setShowUploadDigitalModal(true)}
            >
              <Plus size={15} /> Upload Digital Resource
            </button>
          </div>

          {/* Digital Resources Cards Grid */}
          <div className="digital-grid">
            {filteredDigitalList.map(d => (
              <div key={d.id} className="digital-card">
                <div>
                  <div className="digital-card-top">
                    <div className="digital-icon-box">
                      <FileText size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="digital-tag">{d.type || 'PDF'}</span>
                        <span className="text-[11px] font-bold text-muted">{d.size}</span>
                      </div>
                      <h3 className="font-bold text-sm text-[var(--text-main)] mt-1.5 line-clamp-2" title={d.title}>
                        {d.title}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1">
                    <p className="text-xs text-muted font-medium truncate">
                      Faculty: <strong className="text-[var(--text-main)]">{d.author}</strong>
                    </p>
                    <p className="text-[11px] text-muted truncate">
                      Dept: <span className="font-semibold text-primary">{d.dept}</span>
                    </p>
                  </div>
                </div>

                <div className="digital-footer">
                  <span className="font-medium text-muted">{d.downloads || 0} Downloads</span>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-sm"
                      onClick={() => alert(`Downloading ${d.title} (${d.size})...`)}
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredDigitalList.length === 0 && (
            <div className="glass-card p-12 text-center text-muted animate-fade-in">
              <FileText size={40} className="mx-auto mb-3 text-muted opacity-40" />
              <h3 className="font-bold text-base text-[var(--text-main)]">No Digital Resources Found</h3>
              <p className="text-xs text-muted mt-1">Try adjusting your search query or department filter.</p>
            </div>
          )}

          {/* Upload Digital Resource Modal */}
          {showUploadDigitalModal && (
            <div className="lib-modal-overlay" onClick={() => setShowUploadDigitalModal(false)}>
              <div className="lib-modal-card animate-fade-in" style={{ maxWidth: '520px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      <FileText className="text-primary" size={18} /> Upload Digital Resource
                    </h2>
                    <p className="text-xs text-muted">Publish lecture notes, handbooks, and course PDFs to student repository.</p>
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowUploadDigitalModal(false)}><X size={20}/></button>
                </div>
                <form onSubmit={handleAddDigitalSubmit} className="lib-modal-form space-y-4">
                  <div className="form-group">
                    <label className="text-xs font-bold text-muted">Resource Title *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Operating Systems Complete Lecture Notes"
                      value={digitalForm.title}
                      onChange={e => setDigitalForm({ ...digitalForm, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-muted">Author / Faculty *</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Prof. Abraham Silberschatz & CSE Dept"
                      value={digitalForm.author}
                      onChange={e => setDigitalForm({ ...digitalForm, author: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-bold text-muted">Department</label>
                    <select 
                      value={digitalForm.dept}
                      onChange={e => setDigitalForm({ ...digitalForm, dept: e.target.value })}
                    >
                      {realDeptNames.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="lib-modal-actions border-t border-[var(--border-color)] pt-3">
                    <button type="button" className="btn-secondary" onClick={() => setShowUploadDigitalModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary shadow-glow">Publish Resource</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          ISSUE BOOK MODAL (UNIVERSAL)
          ========================================================= */}
      {showIssueModal && (
        <div className="lib-modal-overlay" onClick={() => setShowIssueModal(false)}>
          <div className="lib-modal-card animate-fade-in" style={{ maxWidth: '550px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="lib-modal-header border-b border-[var(--border-color)] pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <BookDown className="text-primary" size={20} /> Issue Book to Borrower
                </h2>
                <p className="text-xs text-muted">Record loan and compute due date for auto-fine tracking.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowIssueModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleIssueSubmit} className="lib-modal-form space-y-4">
              <div className="form-group">
                <label className="text-xs font-bold text-muted">Select Catalog Book *</label>
                <select 
                  required 
                  value={issueFormData.bookId}
                  onChange={e => setIssueFormData({ ...issueFormData, bookId: e.target.value })}
                >
                  <option value="">-- Choose Book --</option>
                  {books.map(b => (
                    <option key={b._id} value={b._id}>
                      {b.title} (ID: {b.bookId || b.id}) - Avail: {b.availableCopies !== undefined ? b.availableCopies : b.available}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold text-muted">Select Borrower Student *</label>
                <select 
                  required 
                  value={issueFormData.regNo}
                  onChange={e => {
                    const sel = students.find(s => (s.id || s.referenceId || s.studentId || s._id) === e.target.value);
                    setIssueFormData({
                      ...issueFormData,
                      regNo: e.target.value,
                      studentName: sel ? sel.name : ''
                    });
                  }}
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => {
                    const sid = s.id || s.referenceId || s.studentId || s._id;
                    return (
                      <option key={s._id || sid} value={sid}>
                        {s.name} ({sid}) - {s.dept || s.department || 'CSE'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="text-xs font-bold text-muted">Issue Date</label>
                  <input type="date" value={issueFormData.issueDate} readOnly className="opacity-75" />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold text-muted">Due Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={issueFormData.dueDate}
                    onChange={e => setIssueFormData({ ...issueFormData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="lib-modal-actions border-t border-[var(--border-color)] pt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary shadow-glow flex items-center gap-1.5">
                  <CheckCircle size={16} /> Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =========================================================
          FINE RECEIPT MODAL (IN-APP POPUP)
          ========================================================= */}
      {receiptModal.isOpen && (
        <div className="lib-modal-overlay animate-fade-in" onClick={() => setReceiptModal({ isOpen: false, loading: false, receipt: null, error: null })}>
          <div className="lib-modal-card animate-scale-up" style={{ maxWidth: '520px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="lib-modal-header border-b border-[var(--border-color)] pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-main)]">Library Fine Receipt</h2>
                  <p className="text-xs text-muted">Official Payment Confirmation</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setReceiptModal({ isOpen: false, loading: false, receipt: null, error: null })}>
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {receiptModal.loading && (
                <div className="p-8 text-center text-muted">
                  <RefreshCw className="animate-spin mx-auto mb-2 text-primary" size={28} />
                  <p className="text-sm font-medium">Loading receipt details...</p>
                </div>
              )}

              {receiptModal.error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 text-sm flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>{receiptModal.error}</span>
                </div>
              )}

              {receiptModal.receipt && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 space-y-3.5 shadow-inner">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Receipt Number</span>
                      <p className="text-sm font-mono font-bold text-primary">{receiptModal.receipt.receiptNumber}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 size={13} /> PAID & VERIFIED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted block text-[11px]">Student / User ID</span>
                      <span className="font-semibold text-[var(--text-main)]">{receiptModal.receipt.userId}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">User Type</span>
                      <span className="font-semibold text-[var(--text-main)]">{receiptModal.receipt.userType}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted block text-[11px]">Book Title</span>
                      <span className="font-semibold text-[var(--text-main)]">{receiptModal.receipt.bookTitle}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Payment Method</span>
                      <span className="font-semibold text-[var(--text-main)]">{receiptModal.receipt.paymentMethod}</span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px]">Payment Date</span>
                      <span className="font-semibold text-[var(--text-main)]">{receiptModal.receipt.paymentDate}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between bg-emerald-500/5 -mx-4 -mb-3.5 p-3.5 rounded-b-xl">
                    <span className="text-xs font-bold uppercase text-muted">Amount Paid</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{receiptModal.receipt.amount}</span>
                  </div>

                  {receiptModal.receipt.remarks && (
                    <p className="text-[11px] text-muted italic pt-1">
                      Remarks: {receiptModal.receipt.remarks}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="lib-modal-actions border-t border-[var(--border-color)] p-4 flex justify-between items-center">
              <button
                type="button"
                className="btn-secondary text-xs flex items-center gap-1.5"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                type="button"
                className="btn-primary text-xs px-5 py-2 shadow-glow"
                onClick={() => setReceiptModal({ isOpen: false, loading: false, receipt: null, error: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          COLLECT FINE MODAL (IN-APP POPUP)
          ========================================================= */}
      {collectFineModal.isOpen && (
        <div className="lib-modal-overlay animate-fade-in" onClick={() => setCollectFineModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="lib-modal-card animate-scale-up" style={{ maxWidth: '480px', width: '92%' }} onClick={e => e.stopPropagation()}>
            <div className="lib-modal-header border-b border-[var(--border-color)] pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <CreditCard size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-main)]">Collect Library Fine</h2>
                  <p className="text-xs text-muted">Process payment and issue official receipt</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setCollectFineModal(prev => ({ ...prev, isOpen: false }))}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCollectFineSubmit} className="lib-modal-form space-y-4 p-5">
              {collectFineModal.error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{collectFineModal.error}</span>
                </div>
              )}

              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Borrower / Student</span>
                  <span className="font-bold text-[var(--text-main)]">{collectFineModal.studentName} ({collectFineModal.studentId})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Book</span>
                  <span className="font-semibold text-[var(--text-main)]">{collectFineModal.bookTitle}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                  <span className="font-bold text-muted">Outstanding Fine Balance</span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400">₹{collectFineModal.balance}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold text-muted block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  min="1"
                  max={collectFineModal.balance}
                  required
                  value={collectFineModal.amount}
                  onChange={e => setCollectFineModal(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-bold text-[var(--text-main)]"
                />
                <span className="text-[11px] text-muted mt-1 block">Maximum payable: ₹{collectFineModal.balance}</span>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold text-muted block mb-1">Payment Method *</label>
                <select
                  value={collectFineModal.paymentMethod}
                  onChange={e => setCollectFineModal(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-main)]"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer / Net Banking</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold text-muted block mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid at library counter"
                  value={collectFineModal.remarks}
                  onChange={e => setCollectFineModal(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm text-[var(--text-main)]"
                />
              </div>

              <div className="lib-modal-actions border-t border-[var(--border-color)] pt-4 mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs px-4 py-2"
                  onClick={() => setCollectFineModal(prev => ({ ...prev, isOpen: false }))}
                  disabled={collectFineModal.isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs shadow-glow px-4 py-2 flex items-center gap-1.5"
                  disabled={collectFineModal.isSubmitting}
                >
                  {collectFineModal.isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} /> Confirm & Generate Receipt
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryManagement;

















































