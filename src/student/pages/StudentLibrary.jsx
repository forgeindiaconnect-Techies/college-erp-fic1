import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Barcode,
  RotateCcw,
  IndianRupee,
  Book,
  Bookmark,
  Layers,
  MapPin,
  Filter,
  Grid,
  List,
  Sparkles,
  Info,
  XCircle,
  CreditCard,
  QrCode,
  ShieldCheck,
  ShieldAlert,
  Copy,
  FileText,
  Download,
  User,
  GraduationCap,
  Printer,
  Receipt,
  Trash2,
  X
} from 'lucide-react';
import {
  getLibraryBooks,
  getMyLibraryTransactions,
  requestLibraryBook,
  getLibraryReservations,
  createLibraryReservation,
  createLibraryReturnRequest,
  getMyLibraryReturnRequests,
  getDepartments,
  getCourses,
  payLibraryFine,
  getMyLibraryClearance,
  requestLibraryClearance,
  getLibraryFineReceipt,
  getLibraryFinePayments,
  deleteLibraryTransaction
} from '../../api';
import LibraryNoDueCertificateModal from '../../components/LibraryNoDueCertificateModal';
import './StudentLibrary.css';

const NoDueCertificate = ({ clearance, studentSession }) => {
  const item = clearance || {};
  const studentName = item.studentName || studentSession?.name || 'Student';
  const admissionNumber = item.admissionNumber || studentSession?.admissionNumber || studentSession?.rollNo || studentSession?.studentId || '—';
  const department = item.department || studentSession?.department || studentSession?.dept || 'General';
  const clearedDate = item.approvedAt
    ? new Date(item.approvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));

  const certRef = item.certificateRef || `ERP/LIB-NDC/${new Date().getFullYear()}/${(item._id || item.id || 'C00131').toString().slice(-6).toUpperCase()}`;

  return (
    <div id="print-no-due-certificate" style={{ padding: '28px', background: '#ffffff', color: '#0f172a', textAlign: 'center', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', maxWidth: '620px', margin: '0 auto' }}>
      <div style={{ border: '3px double #0d9488', padding: '24px', borderRadius: '8px', background: '#fcfdfd' }}>
        
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0d9488', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
          Central Library & Information Division
        </div>
        
        <h2 style={{ margin: '6px 0 4px', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          MARUDHAR KESARI JAIN COLLEGE FOR WOMEN
        </h2>
        
        <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '18px' }}>
          Autonomous Institution • Accredited with 'A' Grade
        </div>

        <div style={{ display: 'inline-block', padding: '5px 18px', background: 'rgba(16,185,129,0.12)', border: '1px solid #10b981', color: '#047857', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem', marginBottom: '22px', letterSpacing: '0.5px' }}>
          NO DUES & LIBRARY CLEARANCE CERTIFICATE
        </div>

        <p style={{ fontSize: '0.92rem', lineHeight: '1.65', color: '#334155', margin: '0 0 20px', textAlign: 'justify', fontFamily: 'sans-serif' }}>
          This is to certify that <strong>{studentName}</strong> (Registration No: <strong>{admissionNumber}</strong>), Department of <strong>{department}</strong>, has returned all borrowed library materials, books, and reference volumes. There are <strong>no outstanding dues, book loans, or unpaid overdue fines</strong> against the student's library card account.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '14px', padding: '12px 16px', background: '#f1f5f9', borderRadius: '8px', textAlign: 'left', fontSize: '0.82rem', fontFamily: 'sans-serif', marginBottom: '24px' }}>
          <div>
            <span style={{ color: '#64748b' }}>Certificate Ref: </span>
            <strong style={{ color: '#0f172a' }}>{certRef}</strong>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Cleared Date: </span>
            <strong style={{ color: '#0f172a' }}>{clearedDate}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 800 }}>✓ DIGITALLY VERIFIED BY ERP</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Valid for Exam Hall Ticket & Final Clearance</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Librarian / Authority Signature</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Central Library Division</div>
          </div>
        </div>

      </div>
    </div>
  );
};

const StudentLibrary = () => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [returnRequestingId, setReturnRequestingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [reservingId, setReservingId] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [payModalTx, setPayModalTx] = useState(null);
  const [payMethod, setPayMethod] = useState('UPI');
  const [payAmount, setPayAmount] = useState(0);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccessReceipt, setPaySuccessReceipt] = useState(null);
  const [finePayments, setFinePayments] = useState([]);
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [clearance, setClearance] = useState(null);
  const [clearanceLoading, setClearanceLoading] = useState(false);
  const [clearanceRequesting, setClearanceRequesting] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const studentSession = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('student_session') || '{}');
    } catch {
      return {};
    }
  }, []);
  const myDept = studentSession.department || studentSession.dept || '';

  const issuedTransactions = useMemo(() => {
    return transactions.filter(tx => tx.status !== 'Pending');
  }, [transactions]);

  const pendingTransactions = useMemo(() => {
    return transactions.filter(tx => tx.status === 'Pending' || tx.status === 'Rejected');
  }, [transactions]);

  const clearanceIssuedCount = transactions.filter(
    tx => tx.status === 'Issued'
  ).length;

  const clearanceOverdueCount = transactions.filter(
    tx => tx.status === 'Overdue'
  ).length;

  const clearancePendingRequests = transactions.filter(
    tx => tx.status === 'Pending'
  ).length;

  const clearancePendingReturns = returnRequests.filter(
    rr => rr.status === 'Pending'
  ).length;

  const clearanceOutstandingFine = transactions.reduce(
    (total, tx) =>
      total + Math.max(
        Number(tx.fineAmount || 0) - Number(tx.finePaid || 0),
        0
      ),
    0
  );

  const clearanceEligible =
    clearanceIssuedCount === 0 &&
    clearanceOverdueCount === 0 &&
    clearancePendingRequests === 0 &&
    clearancePendingReturns === 0 &&
    clearanceOutstandingFine === 0;

  const categories = useMemo(() => {
    const list = new Set(['All Categories']);
    
    if (myDept) {
      list.add(myDept);
    }

    // Add all distinct book categories and departments available in the central catalog
    books.forEach(b => {
      if (b.category) list.add(b.category);
      if (b.department) list.add(b.department);
    });

    return Array.from(list);
  }, [books, myDept]);

  const fetchLibraryData = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError('');

      const [
        booksRes,
        txRes,
        resRes,
        returnRes,
        deptsRes,
        coursesRes,
        clearanceRes,
        finePaymentsRes
      ] = await Promise.all([
        getLibraryBooks().catch(() => ({ data: [] })),
        getMyLibraryTransactions().catch(() => ({ data: [] })),
        getLibraryReservations().catch(() => ({ data: [] })),
        getMyLibraryReturnRequests().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getCourses().catch(() => ({ data: [] })),
        getMyLibraryClearance().catch(() => ({ data: null })),
        getLibraryFinePayments().catch(() => ({ data: [] }))
      ]);

      const rawCourses = coursesRes?.data?.courses || coursesRes?.data || [];
      const rawPayments = Array.isArray(finePaymentsRes?.data)
        ? finePaymentsRes.data
        : Array.isArray(finePaymentsRes?.data?.payments)
        ? finePaymentsRes.data.payments
        : [];

      setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setReservations(Array.isArray(resRes.data) ? resRes.data : []);
      setReturnRequests(Array.isArray(returnRes.data) ? returnRes.data : []);
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
      setCourses(Array.isArray(rawCourses) ? rawCourses : []);
      setClearance(clearanceRes?.data || null);
      setFinePayments(rawPayments);
    } catch (err) {
      console.error('Error fetching library data:', err);
      setError('Failed to load library data. Please try again.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchLibraryData(true);
    const interval = setInterval(() => {
      fetchLibraryData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLibraryClearanceRequest = async () => {
    try {
      setClearanceRequesting(true);
      setError('');
      setSuccessMsg('');

      const res = await requestLibraryClearance();

      setClearance(res?.data?.clearance || null);
      setSuccessMsg(
        res?.data?.message || 'Library clearance request submitted successfully.'
      );

      await fetchLibraryData();
    } catch (err) {
      console.error('Library clearance request error:', err);

      setError(
        err?.response?.data?.message ||
        'Unable to submit library clearance request.'
      );

      if (err?.response?.data?.details) {
        console.log('Clearance details:', err.response.data.details);
      }
    } finally {
      setClearanceRequesting(false);
    }
  };

  const handleReturnRequest = async (transactionId) => {
    try {
      setReturnRequestingId(transactionId);
      setError('');
      setSuccessMsg('');

      await createLibraryReturnRequest(transactionId);

      setSuccessMsg('Return request submitted successfully.');

      await fetchLibraryData();
    } catch (err) {
      console.error('Error creating return request:', err);

      setError(
        err?.response?.data?.message ||
        'Failed to submit return request. Please try again.'
      );
    } finally {
      setReturnRequestingId(null);
    }
  };
  const handleRequestBook = async (bookId) => {
    try {
      setRequestingId(bookId);
      setError('');
      setSuccessMsg('');

      await requestLibraryBook({ bookId });

      setSuccessMsg(
        'Book requested successfully! The librarian will review and allocate your copy.'
      );

      await fetchLibraryData();
    } catch (err) {
      console.error('Request book error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Error requesting book';
      setError(msg);
    } finally {
      setRequestingId(null);
    }
  };

  const handleReserveBook = async (bookId) => {
    try {
      setReservingId(bookId);
      setError('');
      setSuccessMsg('');

      await createLibraryReservation(bookId);

      setSuccessMsg(
        'Book reservation placed successfully! You will be notified when a copy becomes available.'
      );

      await fetchLibraryData();
    } catch (err) {
      console.error('Reserve book error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Error reserving book';
      setError(msg);
    } finally {
      setReservingId(null);
    }
  };

  const handleCancelRequest = async (transactionId) => {
    try {
      setCancellingId(transactionId);
      setError('');
      setSuccessMsg('');

      // Optimistic local state update so it disappears immediately without lag
      setTransactions((prev) => prev.filter((t) => String(t._id) !== String(transactionId)));
      setReservations((prev) => prev.filter((r) => String(r._id) !== String(transactionId)));

      await deleteLibraryTransaction(transactionId);

      setSuccessMsg('Book request cancelled and removed successfully.');
      await fetchLibraryData(false);
    } catch (err) {
      console.error('Cancel request error:', err);
      await fetchLibraryData(false);
      setError(
        err?.response?.data?.message ||
        'Failed to cancel book request. Please try again.'
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenPayModal = (tx) => {
    const fine = Number(tx.fineAmount || 0);
    const paid = Number(tx.finePaid || 0);
    const balance = Math.max(0, fine - paid);
    setPayModalTx(tx);
    setPayAmount(balance > 0 ? balance : (fine > 0 ? fine : 10));
    setPayMethod('UPI');
    setPaySuccessReceipt(null);
  };

  const handleOpenPayForTotal = () => {
    const txWithFine = transactions.find((t) => {
      const fine = Number(t.fineAmount || 0);
      const paid = Number(t.finePaid || 0);
      return fine - paid > 0;
    });
    if (txWithFine) {
      handleOpenPayModal(txWithFine);
    } else if (transactions.length > 0) {
      handleOpenPayModal(transactions[0]);
    }
  };

  const numberToWords = (num) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const n = Math.floor(Number(num) || 0);
    if (n === 0) return 'Zero';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numberToWords(n % 100) : '');
    if (n < 100000) return numberToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numberToWords(n % 1000) : '');
    return `${n}`;
  };

  const handleOpenReceipt = async (item) => {
    try {
      setReceiptLoading(true);
      setError('');
      const txId = item?.transactionId?._id || item?.transactionId || (item?.bookId && item?._id ? item._id : null);
      let receiptData = null;

      if (txId) {
        try {
          const res = await getLibraryFineReceipt(txId);
          if (res?.data) {
            const tx = res.data.transaction || item;
            const pay = res.data.payment || {};
            receiptData = {
              receiptNumber: pay.receiptNumber || item?.receiptNumber || `FR-${new Date().getFullYear()}-0001`,
              paymentDate: pay.paymentDate || pay.createdAt || tx.finePaidDate || new Date(),
              amount: Number(pay.amount || tx.finePaid || item?.amount || tx.fineAmount || 0),
              paymentMethod: pay.paymentMethod || item?.paymentMethod || 'Online / UPI (Verified)',
              remarks: pay.remarks || item?.remarks || 'Central Library Fine Clearance',
              bookTitle: tx.bookId?.title || item?.bookId?.title || (typeof tx.bookTitle === 'string' ? tx.bookTitle : 'Issued Library Book'),
              author: tx.bookId?.author || item?.bookId?.author || 'N/A',
              accessionNo: tx.bookCopyId?.accessionNumber || tx.bookId?.accessionNumber || tx.bookId?.barcode || item?.bookId?.accessionNumber || 'ACC-LIB-001',
              issueDate: tx.issueDate || item?.issueDate,
              dueDate: tx.dueDate || item?.dueDate,
              returnDate: tx.returnDate || tx.finePaidDate || item?.returnDate,
              studentName: studentSession.name || studentSession.fullName || studentSession.studentName || 'Priya Kumar R',
              admissionNo: studentSession.admissionNo || studentSession.regNo || studentSession.rollNo || 'HAA2026-001',
              department: studentSession.department || studentSession.dept || 'History and Arts',
              academicYear: '2026-2027',
              collegeName: 'MARUDHAR KESARI JAIN COLLEGE FOR WOMEN',
              collegeAddress: 'Vaniyambadi, Tirupattur District, Tamil Nadu 635751'
            };
          }
        } catch (apiErr) {
          console.warn('API fine receipt lookup fallback:', apiErr);
        }
      }

      if (!receiptData) {
        const bookObj = item?.bookId || {};
        receiptData = {
          receiptNumber: item?.receiptNumber || `FR-${new Date().getFullYear()}-0001`,
          paymentDate: item?.paymentDate || item?.finePaidDate || item?.createdAt || new Date(),
          amount: Number(item?.amount || item?.finePaid || item?.fineAmount || 0),
          paymentMethod: item?.paymentMethod || 'Online / UPI (Verified)',
          remarks: item?.remarks || 'Central Library Overdue Clearance',
          bookTitle: bookObj.title || item?.bookTitle || 'General Library Issue',
          author: bookObj.author || 'N/A',
          accessionNo: bookObj.accessionNumber || bookObj.barcode || item?.accessionNo || 'ACC-LIB-001',
          issueDate: item?.issueDate,
          dueDate: item?.dueDate,
          returnDate: item?.returnDate || item?.finePaidDate,
          studentName: studentSession.name || studentSession.fullName || studentSession.studentName || 'Priya Kumar R',
          admissionNo: studentSession.admissionNo || studentSession.regNo || studentSession.rollNo || 'HAA2026-001',
          department: studentSession.department || studentSession.dept || 'History and Arts',
          academicYear: '2026-2027',
          collegeName: 'MARUDHAR KESARI JAIN COLLEGE FOR WOMEN',
          collegeAddress: 'Vaniyambadi, Tirupattur District, Tamil Nadu 635751'
        };
      }

      setReceiptModalData(receiptData);
    } catch (err) {
      console.error('Error opening receipt:', err);
      setError('Unable to load receipt details.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleProcessFinePayment = async (e) => {
    if (e) e.preventDefault();
    if (!payModalTx) return;
    try {
      setPaySubmitting(true);
      setError('');

      const res = await payLibraryFine(
        payModalTx._id,
        payAmount,
        payMethod,
        `Student Online Payment via ${payMethod}`
      );

      const receiptNum =
        res.data?.receiptNumber ||
        res.data?.payment?.receiptNumber ||
        `FR-${new Date().getFullYear()}-0001`;

      const completedReceipt = {
        receiptNumber: receiptNum,
        paymentDate: new Date(),
        amount: payAmount,
        paymentMethod: `${payMethod} (Online Verified)`,
        remarks: `Student Online Fine Clearance via ${payMethod}`,
        bookTitle: payModalTx.bookId?.title || 'Library Catalog Book',
        author: payModalTx.bookId?.author || 'N/A',
        accessionNo: payModalTx.bookCopyId?.accessionNumber || payModalTx.bookId?.accessionNumber || payModalTx.bookId?.barcode || 'ACC-LIB-001',
        issueDate: payModalTx.issueDate,
        dueDate: payModalTx.dueDate,
        returnDate: new Date(),
        studentName: studentSession.name || studentSession.fullName || studentSession.studentName || 'Priya Kumar R',
        admissionNo: studentSession.admissionNo || studentSession.regNo || studentSession.rollNo || 'HAA2026-001',
        department: studentSession.department || studentSession.dept || 'History and Arts',
        academicYear: '2026-2027',
        collegeName: 'MARUDHAR KESARI JAIN COLLEGE FOR WOMEN',
        collegeAddress: 'Vaniyambadi, Tirupattur District, Tamil Nadu 635751'
      };

      setPaySuccessReceipt(completedReceipt);
      setSuccessMsg(`Fine payment of ₹${payAmount} processed successfully! Receipt: ${receiptNum}`);

      await fetchLibraryData(false);
    } catch (err) {
      console.error('Fine payment error:', err);
      setError(
        err?.response?.data?.message ||
        'Failed to process fine payment. Please try again.'
      );
    } finally {
      setPaySubmitting(false);
    }
  };

  const isBookRequestedByUser = (bookId) => {
    return transactions.some((tx) => {
      const txBookId = tx.bookId?._id || tx.bookId;
      return (
        String(txBookId) === String(bookId) &&
        tx.status === 'Pending'
      );
    });
  };

  const isBookReservedByUser = (bookId) => {
    return reservations.some((r) => {
      const rBookId = r.bookId?._id || r.bookId;
      return (
        String(rBookId) === String(bookId) &&
        ['Pending', 'Approved'].includes(r.status)
      );
    });
  };

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const query = search.toLowerCase();
      const matchesSearch =
        !search ||
        b.title?.toLowerCase().includes(query) ||
        b.author?.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query) ||
        b.department?.toLowerCase().includes(query) ||
        b.bookId?.toLowerCase().includes(query) ||
        b.isbn?.toLowerCase().includes(query);

      const matchesCat =
        selectedCategory === 'All Categories' ||
        b.category?.toLowerCase() === selectedCategory.toLowerCase() ||
        b.department?.toLowerCase() === selectedCategory.toLowerCase();

      const availCopies =
        b.availableCopies !== undefined
          ? Number(b.availableCopies)
          : b.available !== undefined
            ? Number(b.available)
            : Number(b.totalCopies) || 1;

      const matchesAvail = !onlyAvailable || availCopies > 0;

      return matchesSearch && matchesCat && matchesAvail;
    });
  }, [books, search, selectedCategory, onlyAvailable]);

  const getDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getOverdueDays = (tx) => {
    if (!tx.dueDate) return 0;
    if (tx.status !== 'Overdue' && tx.status !== 'Issued') return 0;

    const due = new Date(tx.dueDate);
    const endDate = tx.returnDate ? new Date(tx.returnDate) : new Date();
    const diff = endDate.getTime() - due.getTime();

    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getFinePaid = (tx) => {
    const paid = Number(tx.finePaid || 0);
    const fine = Number(tx.fineAmount || 0);
    return Math.min(paid, fine);
  };

  const getFineBalance = (tx) => {
    const fine = Number(tx.fineAmount || 0);
    const paid = getFinePaid(tx);
    return Math.max(fine - paid, 0);
  };

  const activeBooks = transactions.filter(
    (tx) => tx.status === 'Issued' || tx.status === 'Overdue'
  );

  const pendingBooks = transactions.filter((tx) => tx.status === 'Pending');

  const overdueBooks = transactions.filter((tx) => tx.status === 'Overdue');

  const outstandingFine = transactions.reduce(
    (total, tx) => total + getFineBalance(tx),
    0
  );

  return (
    <div className="student-library-page">
      {/* HEADER BANNER */}
      <div className="library-header-banner">
        <div className="banner-content-left">
          <div className="banner-icon-box">
            <BookOpen size={28} />
          </div>

          <div className="banner-title-group">
            <h1>Central Library Portal</h1>
            <p>
              Explore the academic catalog, request reference books, and manage your active borrowings & fines.
            </p>
          </div>
        </div>

        <div className="banner-actions">
          <button
            onClick={fetchLibraryData}
            className="btn-library-refresh"
            title="Refresh Library Records"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SUCCESS BANNER */}
      {successMsg && (
        <div className="library-alert-banner success">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="alert-dismiss-btn"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {error && (
        <div className="library-alert-banner error">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="alert-dismiss-btn"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI METRICS GRID */}
      <div className="library-metrics-grid">
        <div className="library-kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Active Borrowings</span>
            <span className="kpi-value">{activeBooks.length}</span>
            <span className="kpi-subtext">Issued reference books</span>
          </div>
          <div className="kpi-icon-wrap blue">
            <BookOpen size={22} />
          </div>
        </div>

        <div className="library-kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Pending Requests</span>
            <span className="kpi-value">
              {pendingBooks.length + reservations.filter(r => r.status === 'Pending').length}
            </span>
            <span className="kpi-subtext">Awaiting librarian issue</span>
          </div>
          <div className="kpi-icon-wrap amber">
            <Clock size={22} />
          </div>
        </div>

        <div
          className={`library-kpi-card ${
            overdueBooks.length > 0 ? 'alert-active' : ''
          }`}
        >
          <div className="kpi-info">
            <span className="kpi-label">Overdue Items</span>
            <span className="kpi-value">{overdueBooks.length}</span>
            <span className="kpi-subtext">₹10/day overdue rate</span>
          </div>
          <div className="kpi-icon-wrap red">
            <AlertTriangle size={22} />
          </div>
        </div>

        <div
          className={`library-kpi-card ${
            outstandingFine > 0 ? 'alert-active' : ''
          }`}
          style={
            outstandingFine > 0
              ? {
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)'
                }
              : {}
          }
        >
          <div className="kpi-info">
            <span className="kpi-label">Fine Balance</span>
            <span
              className="kpi-value"
              style={outstandingFine > 0 ? { color: '#dc2626' } : {}}
            >
              ₹{outstandingFine}
            </span>
            {outstandingFine > 0 ? (
              <button
                type="button"
                onClick={handleOpenPayForTotal}
                className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
              >
                <CreditCard size={12} />
                <span>Pay Fine Online</span>
              </button>
            ) : (
              <span className="kpi-subtext">No pending dues</span>
            )}
          </div>
          <div
            className={`kpi-icon-wrap ${
              outstandingFine > 0 ? 'red' : 'emerald'
            }`}
          >
            <IndianRupee size={22} />
          </div>
        </div>
      </div>

      {/* MODERN ERP TABS NAVIGATION CARD */}
      <div className="library-tabs-container">
        <div className="library-tabs-list">
          <button
            className={`library-tab-btn ${
              activeTab === 'catalog' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('catalog')}
          >
            <BookOpen size={16} />
            <span>Library Catalog</span>
            <span className="tab-badge">{books.length}</span>
          </button>

          <button
            className={`library-tab-btn ${
              activeTab === 'issued' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('issued')}
          >
            <Layers size={16} />
            <span>My Issued Books</span>
            <span className="tab-badge">{issuedTransactions.length}</span>
          </button>

          <button
            className={`library-tab-btn ${
              activeTab === 'reservations' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('reservations')}
          >
            <Bookmark size={16} />
            <span>Requests & Reservations</span>
            <span className="tab-badge">
              {pendingTransactions.length + reservations.length}
            </span>
          </button>

          <button
            className={`library-tab-btn ${
              activeTab === 'clearance' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('clearance')}
          >
            <ShieldCheck size={16} />
            <span>Clearance / No Due</span>
            <span
              className="tab-clearance-pill"
            >
              {clearance?.status === 'Approved'
                ? '✓ Cleared'
                : clearance?.status === 'Pending'
                ? '⏳ Pending'
                : clearanceEligible
                ? 'Eligible'
                : 'Blocked'}
            </span>
          </button>
        </div>

        <div className="library-tabs-actions">
          <span className="erp-sync-chip">
            <span className="erp-sync-dot"></span>
            <span>LIVE SYNC</span>
          </span>

          <button
            onClick={() => fetchLibraryData(true)}
            disabled={loading}
            className="btn-tab-refresh"
            title="Refresh Library Records from Central Server"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-teal-600' : 'text-slate-600'} />
            <span>Refresh</span>
          </button>

          {activeTab === 'catalog' && (
            <div className="view-mode-toggle">
              <button
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <List size={15} />
              </button>
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Card Grid View"
              >
                <Grid size={15} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB: CLEARANCE / NO DUE */}
      {activeTab === 'clearance' && (
        <div className="clearance-view-wrapper">

          {/* 1. EXECUTIVE ERP CLEARANCE HEADER & IDENTITY BANNER */}
          <div className="clearance-master-header">
            <div className="clearance-identity-side">
              <div className="clearance-avatar-box">
                <span>{(clearance?.studentName || studentSession.name || studentSession.studentName || 'ST').slice(0, 2).toUpperCase()}</span>
              </div>

              <div className="clearance-identity-details">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="clearance-candidate-name">
                    {clearance?.studentName || studentSession.name || studentSession.studentName || 'Student Candidate'}
                  </h3>
                  <span className="rfid-status-pill">
                    <span className="rfid-dot"></span>
                    <span>RFID #LIB-{String(clearance?.admissionNumber || studentSession?.admissionNumber || studentSession?.rollNo || '9042').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '9042'}</span>
                  </span>
                </div>

                <div className="clearance-identity-meta-row">
                  <span className="meta-item">
                    <strong className="text-slate-500">Reg No:</strong>{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {clearance?.admissionNumber || studentSession.admissionNumber || studentSession.rollNo || studentSession.referenceId || 'HAA2026-001'}
                    </span>
                  </span>
                  <span className="meta-sep">•</span>
                  <span className="meta-item">
                    <strong className="text-slate-500">Dept:</strong>{' '}
                    <span className="font-semibold text-slate-800">
                      {clearance?.department || myDept || 'History and Arts'}
                    </span>
                  </span>
                  <span className="meta-sep">•</span>
                  <span className="meta-item">
                    <strong className="text-slate-500">Session:</strong>{' '}
                    <span className="font-semibold text-slate-800">
                      {clearance?.academicYear || studentSession.academicYear || studentSession.batch || '2026 - 2027'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* HEADER STATUS & QUICK ACTIONS */}
            <div className="clearance-header-actions">
              <div
                className={`clearance-master-status-badge ${
                  clearance?.status === 'Approved'
                    ? 'approved'
                    : clearance?.status === 'Pending'
                    ? 'pending'
                    : clearance?.status === 'Rejected'
                    ? 'rejected'
                    : clearanceEligible
                    ? 'eligible'
                    : 'blocked'
                }`}
              >
                <span className={`pulse-dot ${
                  clearance?.status === 'Approved' || clearanceEligible
                    ? 'emerald'
                    : clearance?.status === 'Pending'
                    ? 'amber'
                    : 'red'
                }`}></span>
                <span>
                  {clearance?.status === 'Approved'
                    ? '✓ Institutional Clearance Certified'
                    : clearance?.status === 'Pending'
                    ? '⏳ Under Librarian Desk Review'
                    : clearance?.status === 'Rejected'
                    ? '❌ Request Rejected'
                    : clearanceEligible
                    ? '✓ 100% Eligible for Clearance'
                    : '⚠️ Outstanding Items Pending'}
                </span>
              </div>

              {clearance?.status === 'Approved' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="btn-clearance-secondary"
                  >
                    <FileText size={14} />
                    <span>View Certificate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-clearance-primary"
                  >
                    <Printer size={14} />
                    <span>Print Slip</span>
                  </button>
                </div>
              )}

              {clearanceEligible && !clearance?.status && (
                <button
                  type="button"
                  onClick={handleLibraryClearanceRequest}
                  disabled={clearanceRequesting}
                  className="btn-clearance-primary"
                >
                  <ShieldCheck size={16} />
                  <span>{clearanceRequesting ? 'Submitting...' : 'Submit Clearance Request'}</span>
                </button>
              )}
            </div>
          </div>


          {/* 2. 5-POINT VERIFICATION MATRIX STRIP */}
          <div className="clearance-audit-section">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600" />
                <span className="font-bold text-sm text-slate-800">5-Point Real-Time Institutional Audit Scanner</span>
              </div>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${clearanceEligible ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {clearanceEligible ? '● ALL 5 METRICS CLEARED' : '● ATTENTION REQUIRED'}
              </span>
            </div>

            <div className="clearance-audit-grid">
              {/* 1. Issued Books */}
              <div className={`audit-card ${clearanceIssuedCount === 0 ? 'clear' : 'dues'}`}>
                <div className="audit-card-top">
                  <div className="audit-icon-box">
                    <BookOpen size={18} />
                  </div>
                  <span className="audit-status-badge">
                    {clearanceIssuedCount === 0 ? '✓ 0 Held' : 'Return'}
                  </span>
                </div>
                <div className="audit-card-body">
                  <p className="audit-metric-title">Issued Books</p>
                  <p className="audit-metric-number">{clearanceIssuedCount}</p>
                </div>
                <div className="audit-card-foot flex items-center justify-between">
                  <span>{clearanceIssuedCount === 0 ? 'No active loans' : `${clearanceIssuedCount} book held`}</span>
                  {clearanceIssuedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('issued')}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Return →
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Overdue Books */}
              <div className={`audit-card ${clearanceOverdueCount === 0 ? 'clear' : 'dues'}`}>
                <div className="audit-card-top">
                  <div className="audit-icon-box">
                    <AlertTriangle size={18} />
                  </div>
                  <span className="audit-status-badge">
                    {clearanceOverdueCount === 0 ? '✓ No Overdue' : 'Overdue'}
                  </span>
                </div>
                <div className="audit-card-body">
                  <p className="audit-metric-title">Overdue Items</p>
                  <p className="audit-metric-number">{clearanceOverdueCount}</p>
                </div>
                <div className="audit-card-foot flex items-center justify-between">
                  <span>{clearanceOverdueCount === 0 ? 'On schedule' : `${clearanceOverdueCount} overdue`}</span>
                  {clearanceOverdueCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('issued')}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Resolve →
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Pending Book Requests */}
              <div className={`audit-card ${clearancePendingRequests === 0 ? 'clear' : 'dues'}`}>
                <div className="audit-card-top">
                  <div className="audit-icon-box">
                    <Clock size={18} />
                  </div>
                  <span className="audit-status-badge">
                    {clearancePendingRequests === 0 ? '✓ 0 Pending' : 'Queue'}
                  </span>
                </div>
                <div className="audit-card-body">
                  <p className="audit-metric-title">Book Requests</p>
                  <p className="audit-metric-number">{clearancePendingRequests}</p>
                </div>
                <div className="audit-card-foot flex items-center justify-between">
                  <span>{clearancePendingRequests === 0 ? 'No open requests' : `${clearancePendingRequests} queued`}</span>
                  {clearancePendingRequests > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('reservations')}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      View →
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Pending Returns */}
              <div className={`audit-card ${clearancePendingReturns === 0 ? 'clear' : 'dues'}`}>
                <div className="audit-card-top">
                  <div className="audit-icon-box">
                    <RotateCcw size={18} />
                  </div>
                  <span className="audit-status-badge">
                    {clearancePendingReturns === 0 ? '✓ 0 Pending' : 'Checking'}
                  </span>
                </div>
                <div className="audit-card-body">
                  <p className="audit-metric-title">Pending Returns</p>
                  <p className="audit-metric-number">{clearancePendingReturns}</p>
                </div>
                <div className="audit-card-foot flex items-center justify-between">
                  <span>{clearancePendingReturns === 0 ? 'No return queue' : `${clearancePendingReturns} checking`}</span>
                  {clearancePendingReturns > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('issued')}
                      className="text-xs text-amber-600 font-bold hover:underline"
                    >
                      Status →
                    </button>
                  )}
                </div>
              </div>

              {/* 5. Unpaid Fine */}
              <div className={`audit-card ${clearanceOutstandingFine === 0 ? 'clear' : 'dues'}`}>
                <div className="audit-card-top">
                  <div className="audit-icon-box">
                    <IndianRupee size={18} />
                  </div>
                  <span className="audit-status-badge">
                    {clearanceOutstandingFine === 0 ? '✓ ₹0 Settled' : 'Due'}
                  </span>
                </div>
                <div className="audit-card-body">
                  <p className="audit-metric-title">Unpaid Fine</p>
                  <p className="audit-metric-number">₹{clearanceOutstandingFine}</p>
                </div>
                <div className="audit-card-foot flex items-center justify-between">
                  <span>{clearanceOutstandingFine === 0 ? 'Zero balance' : `₹${clearanceOutstandingFine} unpaid`}</span>
                  {clearanceOutstandingFine > 0 ? (
                    <button
                      type="button"
                      onClick={handleOpenPayForTotal}
                      className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <CreditCard size={11} /> Pay Now
                    </button>
                  ) : (
                    (finePayments.length > 0 || transactions.some(t => Number(t.finePaid || 0) > 0)) && (
                      <button
                        type="button"
                        onClick={() => {
                          const latestPayment = finePayments[0] || transactions.find(t => Number(t.finePaid || 0) > 0);
                          handleOpenReceipt(latestPayment);
                        }}
                        className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        title="View Official Fine Payment E-Receipt"
                      >
                        <Receipt size={12} /> Receipt →
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. INSTITUTIONAL CERTIFICATE & ENDORSEMENT SHOWCASE */}
          {clearance?.status === 'Approved' ? (
            <div className="clearance-cert-showcase">
              <div className="cert-showcase-header">
                <div className="flex items-center gap-2.5">
                  <div className="cert-shield-badge">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="cert-showcase-title">Institutional Library No-Due Clearance Certificate</h4>
                    <p className="cert-showcase-sub">
                      Official NAAC A+ Institutional Verification • Registered Reference: <span className="font-mono font-bold text-slate-800">ERP/LIB-NDC/{new Date().getFullYear()}/{(clearance?._id || '004921').slice(-6).toUpperCase()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCertificateModal(true)}
                    className="btn-clearance-secondary"
                  >
                    <FileText size={14} />
                    <span>Expand Modal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-clearance-primary"
                  >
                    <Printer size={14} />
                    <span>Print Certificate</span>
                  </button>
                </div>
              </div>

              {/* Hidden printable certificate container */}
              <div className="library-clearance-print-certificate">
                <NoDueCertificate clearance={clearance} studentSession={studentSession} />
              </div>

              {/* On-page live preview frame */}
              <div className="cert-preview-frame">
                <NoDueCertificate clearance={clearance} studentSession={studentSession} />
              </div>
            </div>
          ) : clearance?.status === 'Pending' ? (
            <div className="clearance-pending-box">
              <div className="flex items-center gap-3">
                <div className="pending-icon-circle">
                  <Clock size={22} className="text-amber-600 animate-spin" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Clearance Petition Under Circulation Desk Review</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Your request was lodged on {clearance.createdAt ? new Date(clearance.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'today'}. The Head Librarian is performing the physical ledger audit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchLibraryData(true)}
                disabled={loading}
                className="btn-clearance-secondary"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                <span>Sync Status</span>
              </button>
            </div>
          ) : clearance?.status === 'Rejected' ? (
            <div className="clearance-rejected-box">
              <div className="flex items-center gap-3">
                <div className="rejected-icon-circle">
                  <XCircle size={22} className="text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">Clearance Request Rejected by Library Authority</h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    {clearance.remarks || 'Please verify with the central library circulation desk for unresolved physical holdings.'}
                  </p>
                </div>
              </div>
              {clearanceEligible && (
                <button
                  type="button"
                  onClick={handleLibraryClearanceRequest}
                  disabled={clearanceRequesting}
                  className="btn-clearance-primary"
                >
                  <ShieldCheck size={15} />
                  <span>{clearanceRequesting ? 'Submitting...' : 'Re-apply'}</span>
                </button>
              )}
            </div>
          ) : !clearanceEligible ? (
            <div className="clearance-action-required-box">
              <div className="flex items-start gap-3">
                <div className="alert-icon-circle">
                  <AlertTriangle size={20} className="text-rose-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Clearance Blocked — Action Items Required</h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Resolve the following checklist before applying for library clearance:
                  </p>
                  <ul className="mt-2 text-xs font-semibold text-rose-700 space-y-1 list-disc list-inside">
                    {clearanceIssuedCount > 0 && <li>Return {clearanceIssuedCount} issued book(s) to circulation desk.</li>}
                    {clearanceOverdueCount > 0 && <li>Return {clearanceOverdueCount} overdue item(s) to prevent fine growth.</li>}
                    {clearancePendingReturns > 0 && <li>Wait for {clearancePendingReturns} pending return(s) to be checked in.</li>}
                    {clearancePendingRequests > 0 && <li>Cancel or wait for {clearancePendingRequests} open book request(s).</li>}
                    {clearanceOutstandingFine > 0 && <li>Pay the outstanding fine balance of ₹{clearanceOutstandingFine}.</li>}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {clearanceOutstandingFine > 0 && (
                  <button
                    type="button"
                    onClick={handleOpenPayForTotal}
                    className="btn-clearance-primary"
                    style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
                  >
                    <CreditCard size={14} />
                    <span>Pay Fine (₹{clearanceOutstandingFine})</span>
                  </button>
                )}
                {clearanceIssuedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('issued')}
                    className="btn-clearance-secondary"
                  >
                    <BookOpen size={14} />
                    <span>Return Books</span>
                  </button>
                )}
              </div>
            </div>
          ) : null}

        </div>
      )}

      {/* TAB 1: CATALOG */}
      {activeTab === 'catalog' && (
        <>
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="library-toolbar">
            <div className="search-box-wrapper">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search by title, author, category, ISBN, book ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="filter-controls-group">
              <select
                className="filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-muted select-none">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span>Available Only</span>
              </label>
            </div>
          </div>

          {/* CATEGORY CHIPS */}
          <div className="category-chips-bar">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`chip-btn ${
                  selectedCategory === cat ? 'active' : ''
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* LOADING STATE */}
          {loading ? (
            <div className="library-loading-state">
              <RefreshCw size={32} className="animate-spin text-teal-500" />
              <p>Fetching central library catalog...</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="library-table-card">
              <div className="library-empty-state">
                <div className="empty-icon-wrap">
                  <BookOpen size={30} />
                </div>
                <h3>No Books Found</h3>
                <p>
                  No titles match your current search and filter criteria. Try adjusting your query.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('All Categories');
                    setOnlyAvailable(false);
                  }}
                  className="btn-request-action secondary"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <div className="library-table-card">
              <div className="table-wrapper">
                <table className="library-erp-table">
                  <thead>
                    <tr>
                      <th>Book Information</th>
                      <th>Category / Dept</th>
                      <th>Location</th>
                      <th>Stock Availability</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBooks.map((book) => {
                      const isRequested = isBookRequestedByUser(book._id);
                      const isReserved = isBookReservedByUser(book._id);

                      const totalCopies = Number(book.totalCopies) || 1;
                      const availCopies =
                        book.availableCopies !== undefined
                          ? Number(book.availableCopies)
                          : book.available !== undefined
                            ? Number(book.available)
                            : totalCopies;

                      const isAvail = availCopies > 0;

                      return (
                        <tr key={book._id}>
                          <td style={{ minWidth: '260px' }}>
                            <div className="book-cell-group">
                              <div className="book-cell-icon">
                                <BookOpen size={18} />
                              </div>
                              <div className="book-cell-details">
                                <span className="book-title-text">
                                  {book.title}
                                </span>
                                <span className="book-author-text">
                                  by {book.author || 'Author not specified'}
                                </span>
                                {book.bookId && (
                                  <span className="book-id-badge">
                                    ID: {book.bookId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="flex flex-col gap-1 items-start">
                              <span className="category-badge-pill">
                                {book.category || 'General'}
                              </span>
                              {book.department && (
                                <span className="text-xs text-muted">
                                  Dept: {book.department}
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="shelf-location-tag">
                              <MapPin size={13} className="text-teal-600" />
                              <span>
                                Rack {book.rackNumber || '-'} · Shelf {book.shelfNumber || '-'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`avail-status-pill ${
                                isAvail ? 'available' : 'out-of-stock'
                              }`}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isAvail ? '#059669' : '#d97706'
                                }}
                              />
                              {isAvail
                                ? `${availCopies} of ${totalCopies} Available`
                                : 'Out of Stock'}
                            </span>
                          </td>

                          <td style={{ textAlign: 'right' }}>
                            {isRequested ? (
                              <span className="badge-requested-pill">
                                <CheckCircle2 size={13} />
                                Requested
                              </span>
                            ) : isReserved ? (
                              <span className="badge-requested-pill">
                                <Bookmark size={13} />
                                Reserved
                              </span>
                            ) : isAvail ? (
                              <button
                                onClick={() => handleRequestBook(book._id)}
                                disabled={requestingId === book._id}
                                className="btn-request-action primary"
                              >
                                {requestingId === book._id ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <>
                                    <BookOpen size={14} />
                                    <span>Request Book</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleReserveBook(book._id)}
                                disabled={reservingId === book._id}
                                className="btn-request-action secondary"
                              >
                                {reservingId === book._id ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <>
                                    <Bookmark size={14} />
                                    <span>Reserve</span>
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CARD GRID VIEW */
            <div className="library-books-grid">
              {filteredBooks.map((book) => {
                const isRequested = isBookRequestedByUser(book._id);
                const isReserved = isBookReservedByUser(book._id);

                const totalCopies = Number(book.totalCopies) || 1;
                const availCopies =
                  book.availableCopies !== undefined
                    ? Number(book.availableCopies)
                    : book.available !== undefined
                      ? Number(book.available)
                      : totalCopies;

                const isAvail = availCopies > 0;

                return (
                  <div key={book._id} className="book-card-item">
                    <div className="book-card-top">
                      <div className="book-cell-icon">
                        <BookOpen size={20} />
                      </div>
                      <div className="book-card-body">
                        <h3>{book.title}</h3>
                        <p>by {book.author || 'Unknown'}</p>
                      </div>
                    </div>

                    <div className="book-card-meta">
                      <div className="meta-row">
                        <span className="text-muted">Category</span>
                        <span className="category-badge-pill">
                          {book.category || 'General'}
                        </span>
                      </div>

                      <div className="meta-row">
                        <span className="text-muted">Rack / Shelf</span>
                        <span className="shelf-location-tag">
                          Rack {book.rackNumber || '-'} · Shelf {book.shelfNumber || '-'}
                        </span>
                      </div>

                      <div className="meta-row">
                        <span className="text-muted">Stock</span>
                        <span
                          className={`avail-status-pill ${
                            isAvail ? 'available' : 'out-of-stock'
                          }`}
                        >
                          {isAvail
                            ? `${availCopies} Available`
                            : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    <div className="book-card-footer">
                      {isRequested ? (
                        <span className="badge-requested-pill w-full justify-center">
                          <CheckCircle2 size={13} />
                          Requested
                        </span>
                      ) : isReserved ? (
                        <span className="badge-requested-pill w-full justify-center">
                          <Bookmark size={13} />
                          Reserved
                        </span>
                      ) : isAvail ? (
                        <button
                          onClick={() => handleRequestBook(book._id)}
                          disabled={requestingId === book._id}
                          className="btn-request-action primary w-full justify-center"
                        >
                          {requestingId === book._id ? (
                            <RefreshCw
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <>
                              <BookOpen size={14} />
                              <span>Request Book</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReserveBook(book._id)}
                          disabled={reservingId === book._id}
                          className="btn-request-action secondary w-full justify-center"
                        >
                          {reservingId === book._id ? (
                            <RefreshCw
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <>
                              <Bookmark size={14} />
                              <span>Reserve</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: MY ISSUED BOOKS & HISTORY */}
      {activeTab === 'issued' && (
        <div className="library-table-card">
          <div className="table-wrapper">
            <table className="library-erp-table">
              <thead>
                <tr>
                  <th>Book Details</th>
                  <th>Allocated Copy</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Fine / Overdue</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Desk Action</th>
                </tr>
              </thead>
              <tbody>
                {issuedTransactions.map((tx) => {
                  const copy = tx.bookCopyId;
                  const overdueDays = getOverdueDays(tx);
                  const fine = Number(tx.fineAmount || 0);
                  const paid = getFinePaid(tx);
                  const balance = getFineBalance(tx);

                  const returnRequest = returnRequests.find((r) => {
                    const reqTxId = r.transactionId?._id
                      ? String(r.transactionId._id)
                      : r.transactionId
                        ? String(r.transactionId)
                        : null;
                    if (reqTxId) {
                      return reqTxId === String(tx._id);
                    }
                    return false;
                  });

                  const statusClass =
                    tx.status === 'Issued'
                      ? 'issued'
                      : tx.status === 'Approved'
                        ? 'approved'
                        : tx.status === 'Overdue'
                          ? 'overdue'
                          : tx.status === 'Returned'
                            ? 'returned'
                            : tx.status === 'Rejected'
                              ? 'rejected'
                              : 'pending';

                  return (
                    <tr key={tx._id}>
                      {/* BOOK */}
                      <td style={{ minWidth: '220px' }}>
                        <div className="book-cell-group">
                          <div className="book-cell-icon">
                            <BookOpen size={16} />
                          </div>
                          <div className="book-cell-details">
                            <span className="book-title-text">
                              {tx.bookId?.title || 'Library Catalog Book'}
                            </span>
                            <span className="book-author-text">
                              by {tx.bookId?.author || 'Unknown Author'}
                            </span>
                            {tx.bookId?.bookId && (
                              <span className="book-id-badge">
                                ID: {tx.bookId.bookId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* PHYSICAL COPY */}
                      <td style={{ minWidth: '170px' }}>
                        {copy ? (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-main)]">
                              <Barcode size={14} className="text-teal-600" />
                              <span>
                                {copy.accessionNumber || copy.barcode || `ACC-${tx.bookId?.bookId || 'LIB'}-001`}
                              </span>
                            </div>
                            <div className="text-xs text-muted">
                              Rack {copy.rackNumber || tx.bookId?.rackNumber || 'R01'} · Shelf {copy.shelfNumber || tx.bookId?.shelfNumber || 'S01'}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text-main)]">
                              <Barcode size={14} className="text-teal-600" />
                              <span>
                                {`ACC-${tx.bookId?.bookId || 'LIB'}-001`}
                              </span>
                            </div>
                            <div className="text-xs text-muted">
                              Rack {tx.bookId?.rackNumber || 'R01'} · Shelf {tx.bookId?.shelfNumber || 'S01'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* ISSUE DATE */}
                      <td className="whitespace-nowrap text-sm text-muted">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          <span>{getDate(tx.issueDate)}</span>
                        </div>
                      </td>

                      {/* DUE DATE */}
                      <td className="whitespace-nowrap text-sm">
                        <div
                          className={`flex items-center gap-1.5 font-semibold ${
                            tx.status === 'Overdue'
                              ? 'text-red-500'
                              : 'text-muted'
                          }`}
                        >
                          <Clock size={14} />
                          <span>{getDate(tx.dueDate)}</span>
                        </div>
                      </td>

                      {/* OVERDUE & FINE */}
                      <td style={{ minWidth: '140px' }}>
                        {fine > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs font-bold text-red-500">
                              Fine: ₹{fine}
                            </span>
                            {balance > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenPayModal(tx)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[11px] hover:bg-rose-100 transition shadow-sm"
                                title="Click to pay fine online"
                              >
                                <CreditCard size={11} />
                                <span>Pay ₹{balance}</span>
                              </button>
                            ) : (
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="text-[11px] font-bold text-emerald-600 inline-flex items-center gap-0.5">
                                  <CheckCircle2 size={11} /> Fully Paid
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReceipt(tx)}
                                  className="text-[10px] font-bold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  title="View Fine E-Receipt"
                                >
                                  <Receipt size={10} /> View Receipt
                                </button>
                              </div>
                            )}
                          </div>
                        ) : overdueDays > 0 ? (
                          <span className="tx-status-pill overdue">
                            <AlertTriangle size={12} />
                            {overdueDays}d overdue
                          </span>
                        ) : tx.status === 'Returned' ? (
                          <span className="text-xs text-emerald-600 font-semibold">
                            Returned
                          </span>
                        ) : tx.status === 'Issued' ? (
                          <span className="text-xs text-emerald-600 font-semibold">
                            On schedule
                          </span>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td style={{ minWidth: '130px' }}>
                        <span className={`tx-status-pill ${statusClass}`}>
                          {tx.status === 'Issued' && <BookOpen size={12} />}
                          {tx.status === 'Approved' && <CheckCircle2 size={12} />}
                          {tx.status === 'Overdue' && <AlertTriangle size={12} />}
                          {tx.status === 'Returned' && <CheckCircle2 size={12} />}
                          {tx.status === 'Rejected' && <XCircle size={12} />}
                          {tx.status === 'Approved'
                            ? 'Approved'
                            : tx.status === 'Rejected'
                              ? 'Rejected'
                              : tx.status}
                        </span>
                      </td>

                      {/* ACTION (RIGHT-ALIGNED) */}
                      <td style={{ minWidth: '180px', textAlign: 'right' }}>
                        {tx.status === 'Approved' ? (
                          <span className="desk-ready-pill" title="Collect at library desk with Student ID">
                            <CheckCircle2 size={12} />
                            <span>Ready for Pickup</span>
                          </span>
                        ) : tx.status === 'Returned' ? (
                          <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Returned to Library</span>
                          </span>
                        ) : tx.status === 'Rejected' ? (
                          <span className="text-xs text-rose-600 font-medium">Request Declined</span>
                        ) : returnRequest?.status === 'Pending' ? (
                          <span className="return-pending-badge">
                            <Clock size={12} className="animate-spin" />
                            <span>Return in Review</span>
                          </span>
                        ) : returnRequest?.status === 'Rejected' ? (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleReturnRequest(tx._id)}
                              disabled={returnRequestingId === tx._id}
                              className="btn-retry-return"
                              title={returnRequest.remarks ? `Declined: ${returnRequest.remarks}` : 'Return declined at desk'}
                            >
                              <AlertTriangle size={12} />
                              <span>
                                {returnRequestingId === tx._id ? 'Submitting...' : 'Declined · Retry Return'}
                              </span>
                            </button>
                            {returnRequest.remarks && (
                              <span
                                className="text-[11px] text-rose-600 font-medium max-w-[170px] truncate"
                                title={returnRequest.remarks}
                              >
                                "{returnRequest.remarks}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReturnRequest(tx._id)}
                            disabled={returnRequestingId === tx._id}
                            className="btn-table-action"
                          >
                            <RotateCcw size={12} />
                            <span>
                              {returnRequestingId === tx._id ? 'Requesting...' : 'Request Return'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {issuedTransactions.length === 0 && (
            <div className="library-empty-state">
              <div className="empty-icon-wrap">
                <Layers size={30} />
              </div>
              <h3>No Active Borrowing Records</h3>
              <p>
                You have no active issued or overdue books currently checked out from the central library.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="btn-request-action primary"
              >
                Explore Catalog
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REQUESTS & RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div className="flex flex-col gap-6">
          {/* PENDING BOOK ISSUE REQUESTS */}
          {pendingTransactions.length > 0 && (
            <div className="library-table-card">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800 m-0">
                    Pending Book Issue Requests ({pendingTransactions.length})
                  </h3>
                </div>
                <span className="text-xs text-muted">Awaiting circulation desk allocation</span>
              </div>
              <div className="table-wrapper">
                <table className="library-erp-table">
                  <thead>
                    <tr>
                      <th>Requested Book</th>
                      <th>Category / Author</th>
                      <th>Request Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTransactions.map((tx) => (
                      <tr key={tx._id}>
                        <td style={{ minWidth: '220px' }}>
                          <div className="book-cell-group">
                            <div className="book-cell-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                              <BookOpen size={16} />
                            </div>
                            <div className="book-cell-details">
                              <span className="book-title-text font-bold text-slate-900">
                                {tx.bookId?.title || 'Book Title'}
                              </span>
                              <span className="book-author-text">
                                by {tx.bookId?.author || 'Unknown Author'}
                              </span>
                              {tx.bookId?.bookId && (
                                <span className="book-id-badge">
                                  ID: {tx.bookId.bookId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="category-badge-pill">
                            {tx.bookId?.category || 'General'}
                          </span>
                        </td>

                        <td className="whitespace-nowrap text-sm text-muted">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>{getDate(tx.createdAt || tx.requestDate)}</span>
                          </div>
                        </td>

                        <td>
                          <span className="tx-status-pill pending">
                            <Clock size={12} />
                            <span>{tx.status === 'Rejected' ? 'Declined' : 'Pending Allocation'}</span>
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(tx._id)}
                            disabled={cancellingId === tx._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition shadow-sm cursor-pointer"
                            title="Cancel this book request"
                          >
                            {cancellingId === tx._id ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Cancelling...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 size={13} />
                                <span>Cancel Request</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* RESERVATIONS TABLE */}
          <div className="library-table-card">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Bookmark size={18} className="text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 m-0">
                  Book Reservations ({reservations.length})
                </h3>
              </div>
              <span className="text-xs text-muted">Waitlist queue for out-of-stock titles</span>
            </div>
            <div className="table-wrapper">
              <table className="library-erp-table">
                <thead>
                  <tr>
                    <th>Reserved Book</th>
                    <th>Author / Category</th>
                    <th>Request Date</th>
                    <th>Approved Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((res) => {
                    const statusClass =
                      res.status === 'Approved'
                        ? 'approved'
                        : res.status === 'Completed'
                          ? 'completed'
                          : res.status === 'Pending'
                            ? 'pending'
                            : 'rejected';

                    return (
                      <tr key={res._id}>
                        <td style={{ minWidth: '240px' }}>
                          <div className="book-cell-group">
                            <div className="book-cell-icon">
                              <Bookmark size={18} />
                            </div>
                            <div className="book-cell-details">
                              <span className="book-title-text">
                                {res.bookId?.title || 'Book Title'}
                              </span>
                              {res.bookId?.bookId && (
                                <span className="book-id-badge">
                                  ID: {res.bookId.bookId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {res.bookId?.author || 'Unknown'}
                            </span>
                            <span className="category-badge-pill">
                              {res.bookId?.category || 'General'}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap text-sm text-muted">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>{getDate(res.requestDate || res.createdAt)}</span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap text-sm text-muted">
                          {res.approvedDate ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                              <CheckCircle2 size={14} />
                              <span>{getDate(res.approvedDate)}</span>
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                        </td>

                        <td>
                          <span className={`tx-status-pill ${statusClass}`}>
                            {res.status === 'Pending' && <Clock size={12} />}
                            {res.status === 'Approved' && <CheckCircle2 size={12} />}
                            {res.status === 'Completed' && <BookOpen size={12} />}
                            {res.status === 'Rejected' && <AlertTriangle size={12} />}
                            {res.status}
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          {res.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(res._id)}
                              disabled={cancellingId === res._id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs transition shadow-sm cursor-pointer"
                              title="Cancel this reservation"
                            >
                              {cancellingId === res._id ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>Cancelling...</span>
                                </>
                              ) : (
                                <>
                                  <Trash2 size={13} />
                                  <span>Cancel</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pendingTransactions.length === 0 && reservations.length === 0 && (
              <div className="library-empty-state">
                <div className="empty-icon-wrap">
                  <Bookmark size={30} />
                </div>
                <h3>No Pending Requests or Reservations</h3>
                <p>
                  You have no pending book issue requests or active reservations.
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="btn-request-action primary"
                >
                  Browse Catalog
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REAL-TIME UNIVERSITY ERP FINE SETTLEMENT MODAL */}
      {payModalTx && (
        <div className="fine-modal-backdrop" onClick={() => setPayModalTx(null)}>
          <div className="fine-modal-card" onClick={e => e.stopPropagation()}>
            {/* Top Accent Header */}
            <div className="fine-modal-header">
              <div className="fine-modal-header-left">
                <div className="fine-modal-icon-badge">
                  <CreditCard size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="fine-modal-title">
                      Library Fine Clearance Desk
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/30 text-teal-300 border border-teal-400/30 uppercase tracking-wider">
                      E-Challan
                    </span>
                  </div>
                  <p className="fine-modal-subtitle">
                    Central Library • Instant Ledger Settlement
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayModalTx(null);
                  setPaySuccessReceipt(null);
                }}
                className="fine-modal-close-btn"
                title="Close Window"
              >
                <XCircle size={22} />
              </button>
            </div>

            {paySuccessReceipt ? (
              /* E-RECEIPT SUCCESS VOUCHER */
              <div className="fine-modal-body text-center">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">
                    Fine Settled Successfully
                  </h4>
                  <p className="text-xs text-slate-600 max-w-sm">
                    Your payment of <strong>₹{paySuccessReceipt.amount || payAmount}.00</strong> has been recorded in the central library ledger. No further dues remain for this item.
                  </p>
                </div>

                {/* Formal Receipt Card */}
                <div className="fine-receipt-card font-mono text-xs text-left">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-slate-500 font-sans font-semibold">Receipt Number</span>
                    <span className="font-bold text-teal-700 text-sm font-mono">
                      {paySuccessReceipt.receiptNumber || paySuccessReceipt}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Book Reference</span>
                    <span className="font-semibold text-slate-800 font-sans truncate max-w-[200px]">
                      {paySuccessReceipt.bookTitle || payModalTx.bookId?.title || 'Library Catalog Book'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Payment Method</span>
                    <span className="font-semibold text-emerald-700 font-sans">
                      {paySuccessReceipt.paymentMethod || payMethod}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Transaction Time</span>
                    <span className="text-slate-700">
                      {new Date(paySuccessReceipt.paymentDate || new Date()).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-sm font-bold">
                    <span className="text-slate-700 font-sans">Amount Paid</span>
                    <span className="text-emerald-600">
                      ₹{paySuccessReceipt.amount || payAmount}.00
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 w-full mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const recData = typeof paySuccessReceipt === 'object' ? paySuccessReceipt : {
                        receiptNumber: paySuccessReceipt,
                        amount: payAmount,
                        paymentMethod: `${payMethod} (Online Verified)`,
                        remarks: `Student Online Fine Clearance via ${payMethod}`,
                        bookTitle: payModalTx.bookId?.title || 'Library Book',
                        author: payModalTx.bookId?.author || 'Author',
                        accessionNo: payModalTx.bookCopyId?.accessionNumber || 'ACC-LIB-001',
                        issueDate: payModalTx.issueDate,
                        dueDate: payModalTx.dueDate,
                        returnDate: new Date(),
                        studentName: studentSession.name || studentSession.fullName || studentSession.studentName || 'Priya Kumar R',
                        admissionNo: studentSession.admissionNo || studentSession.regNo || studentSession.rollNo || 'HAA2026-001',
                        department: studentSession.department || studentSession.dept || 'History and Arts',
                        academicYear: '2026-2027',
                        paymentDate: new Date()
                      };
                      setReceiptModalData(recData);
                      setPayModalTx(null);
                      setPaySuccessReceipt(null);
                    }}
                    className="btn-fine-submit flex-1"
                    style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}
                  >
                    <Printer size={16} />
                    <span>View & Print Official Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayModalTx(null);
                      setPaySuccessReceipt(null);
                    }}
                    className="btn-fine-cancel flex-1"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* PAYMENT FORM */
              <form onSubmit={handleProcessFinePayment} className="fine-modal-body">
                {/* Book & Fine Ledger Summary */}
                <div className="fine-ledger-summary">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-muted font-bold uppercase tracking-wider">
                        Overdue Item Details
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        {payModalTx.bookId?.title || 'Library Book'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        by {payModalTx.bookId?.author || 'Author'} · Due Date: {getDate(payModalTx.dueDate)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-xs font-bold whitespace-nowrap">
                      Overdue Fine
                    </span>
                  </div>

                  <div className="fine-ledger-row border-t border-slate-200 pt-2">
                    <span>Total Calculated Fine</span>
                    <strong>₹{Number(payModalTx.fineAmount || 0)}.00</strong>
                  </div>
                  <div className="fine-ledger-row">
                    <span>Already Paid</span>
                    <span className="font-semibold text-emerald-600">₹{Number(payModalTx.finePaid || 0)}.00</span>
                  </div>
                  <div className="fine-ledger-row total-row">
                    <span>Net Outstanding Payable</span>
                    <span className="amount-highlight">₹{payAmount}.00</span>
                  </div>
                </div>

                {/* Amount to Settle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Settlement Amount (₹)
                  </label>
                  <div className="fine-input-wrapper">
                    <span className="text-slate-500 font-bold text-base mr-2">₹</span>
                    <input
                      type="number"
                      min="1"
                      max={Math.max(1, Number(payModalTx.fineAmount || 0) - Number(payModalTx.finePaid || 0))}
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className="fine-input-field"
                      required
                    />
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Payment Gateway
                  </label>
                  <div className="fine-gateway-selector">
                    {[
                      { id: 'UPI', label: 'UPI / QR App', icon: QrCode, sub: 'Instant (GPay/PhonePe)' },
                      { id: 'Card', label: 'Debit / Card', icon: CreditCard, sub: 'Visa / RuPay / MC' },
                      { id: 'Net Banking', label: 'Net Banking', icon: Sparkles, sub: 'All Major Banks' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id)}
                        className={`fine-gateway-card ${payMethod === m.id ? 'active' : ''}`}
                      >
                        <m.icon size={18} className={payMethod === m.id ? 'text-teal-600' : 'text-slate-400'} />
                        <span className="gw-label">{m.label}</span>
                        <span className="gw-sub">{m.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gateway Detail Preview */}
                {payMethod === 'UPI' && (
                  <div className="fine-gateway-preview-box">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                        UPI
                      </div>
                      <div>
                        <div className="text-xs font-bold text-teal-950 font-mono">
                          fic-library@okaxis
                        </div>
                        <div className="text-[11px] text-teal-700 font-medium">
                          College Central Library Account
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Verified
                    </span>
                  </div>
                )}

                {payMethod === 'Card' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                    <div className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 flex justify-between">
                      <span>4532 •••• •••• 8819</span>
                      <span className="text-slate-400">MM/YY</span>
                    </div>
                    <p className="text-[11px] text-slate-500 m-0">
                      Simulated secure campus card payment gateway
                    </p>
                  </div>
                )}

                {payMethod === 'Net Banking' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="font-semibold text-slate-800">
                      University Associated Partner Banks:
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      State Bank of India · HDFC · ICICI · Axis Bank
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="fine-action-row">
                  <button
                    type="button"
                    onClick={() => setPayModalTx(null)}
                    className="btn-fine-cancel"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={paySubmitting || payAmount <= 0}
                    className="btn-fine-submit"
                  >
                    {paySubmitting ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Processing Settlement...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Confirm & Pay ₹{payAmount}.00</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          OFFICIAL INSTITUTIONAL PRINTABLE FINE RECEIPT MODAL
          ========================================================= */}
      {receiptModalData && (
        <div className="receipt-modal-backdrop" onClick={() => setReceiptModalData(null)}>
          <div className="receipt-modal-container" onClick={e => e.stopPropagation()}>
            {/* Top Toolbar */}
            <div className="receipt-modal-topbar">
              <div className="receipt-modal-topbar-left">
                <div className="receipt-topbar-badge">
                  <Receipt size={13} />
                  <span>Official E-Challan</span>
                </div>
                <span className="text-xs text-slate-300 font-mono">
                  {receiptModalData.receiptNumber}
                </span>
              </div>
              <div className="receipt-topbar-actions">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-receipt-print"
                  title="Print official receipt or save as PDF"
                >
                  <Printer size={15} />
                  <span>Print Receipt / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModalData(null)}
                  className="btn-receipt-close"
                  title="Close receipt window"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Receipt Sheet Body */}
            <div className="receipt-scroll-body">
              <div className="receipt-paper" id="library-fine-printable-receipt">
                {/* Institutional College Header */}
                <div className="receipt-paper-header">
                  <div className="receipt-college-logo-wrap">
                    <div className="receipt-emblem-badge">
                      MK
                    </div>
                    <div>
                      <h2 className="receipt-college-title">
                        {receiptModalData.collegeName || 'MARUDHAR KESARI JAIN COLLEGE FOR WOMEN'}
                      </h2>
                    </div>
                  </div>
                  <p className="receipt-college-subtitle">
                    Approved by Govt. of Tamil Nadu • Permanently Affiliated to Thiruvalluvar University • Re-Accredited with 'A' Grade by NAAC
                  </p>
                  <p className="receipt-college-address">
                    {receiptModalData.collegeAddress || 'Marudhar Nagar, Chinnakallupalli, Vaniyambadi, Tirupattur - 635 751, Tamil Nadu'}
                  </p>
                  <div className="receipt-document-badge">
                    CENTRAL LIBRARY — OVERDUE FINE E-RECEIPT / CHALLAN
                  </div>
                </div>

                {/* Key Metadata Grid */}
                <div className="receipt-meta-grid">
                  <div className="receipt-meta-item">
                    <span className="receipt-meta-label">Receipt Number</span>
                    <span className="receipt-meta-val highlight">
                      {receiptModalData.receiptNumber}
                    </span>
                  </div>
                  <div className="receipt-meta-item">
                    <span className="receipt-meta-label">Payment Date & Time</span>
                    <span className="receipt-meta-val">
                      {new Date(receiptModalData.paymentDate || new Date()).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>
                  <div className="receipt-meta-item">
                    <span className="receipt-meta-label">Academic Year</span>
                    <span className="receipt-meta-val">
                      {receiptModalData.academicYear || '2026-2027'}
                    </span>
                  </div>
                  <div className="receipt-meta-item">
                    <span className="receipt-meta-label">Clearance Verification</span>
                    <span className="receipt-meta-val text-emerald-600 font-bold">
                      ✓ SETTLED & CLEARED
                    </span>
                  </div>
                </div>

                {/* Student & Book Details Two-Column Box */}
                <div className="receipt-parties-grid">
                  <div className="receipt-info-box">
                    <div className="receipt-info-box-title">
                      <User size={13} className="text-teal-600" />
                      <span>Student Information</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Student Name:</span>
                      <span className="detail-val">{receiptModalData.studentName}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Admission / Reg No:</span>
                      <span className="detail-val font-mono">{receiptModalData.admissionNo}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Department:</span>
                      <span className="detail-val">{receiptModalData.department}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Student Role:</span>
                      <span className="detail-val">Student (UG/PG)</span>
                    </div>
                  </div>

                  <div className="receipt-info-box">
                    <div className="receipt-info-box-title">
                      <BookOpen size={13} className="text-teal-600" />
                      <span>Book Issue Assessment</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Book Title:</span>
                      <span className="detail-val font-semibold">{receiptModalData.bookTitle}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Author:</span>
                      <span className="detail-val">{receiptModalData.author}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Accession / Barcode:</span>
                      <span className="detail-val font-mono">{receiptModalData.accessionNo}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="detail-key">Due Date:</span>
                      <span className="detail-val">{receiptModalData.dueDate ? getDate(receiptModalData.dueDate) : 'Overdue Period'}</span>
                    </div>
                  </div>
                </div>

                {/* Ledger & Particulars Table */}
                <div className="receipt-table-wrap">
                  <table className="receipt-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>S.No</th>
                        <th>Particulars / Description</th>
                        <th>Payment Mode</th>
                        <th style={{ textAlign: 'right', width: '130px' }}>Amount Paid (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>01</td>
                        <td>
                          <div className="font-bold text-slate-900">
                            Central Library Overdue Fine Settlement
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {receiptModalData.remarks || 'Electronic Ledger Reconciliation for Library Circulation Due'}
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            {receiptModalData.paymentMethod || 'Online UPI'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '0.95rem' }}>
                          ₹{Number(receiptModalData.amount || 0)}.00
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-900">
                        <td colSpan="3" style={{ textAlign: 'right', textTransform: 'uppercase', fontSize: '0.78rem' }}>
                          Total Amount Paid:
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '1.05rem', color: '#0d9488' }}>
                          ₹{Number(receiptModalData.amount || 0)}.00
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Amount in Words Bar */}
                <div className="receipt-words-bar">
                  <div>
                    <span className="font-bold text-[11px] uppercase tracking-wider text-teal-900 block">
                      Amount in Words:
                    </span>
                    <span className="font-semibold text-xs">
                      Rupees {numberToWords(receiptModalData.amount)} Only
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-teal-800 font-bold uppercase tracking-wider block">
                      Transaction Mode:
                    </span>
                    <span className="text-xs font-bold text-teal-950 font-mono">
                      {receiptModalData.paymentMethod}
                    </span>
                  </div>
                </div>

                {/* Footer Seal & Authorized Signature Section */}
                <div className="receipt-footer-section">
                  <div className="receipt-seal-box">
                    <div className="receipt-seal-icon">
                      <ShieldCheck size={22} />
                    </div>
                    <div className="receipt-seal-text">
                      <h5>DIGITALLY VERIFIED</h5>
                      <p>CENTRAL LIBRARY • COLLEGE ERP</p>
                    </div>
                  </div>

                  <div className="receipt-sign-box">
                    <div className="receipt-sign-line" />
                    <span className="receipt-sign-label">Librarian / Circulation Desk</span>
                    <span className="receipt-sign-sub">Marudhar Kesari Jain College</span>
                  </div>
                </div>

                <p className="receipt-disclaimer-note">
                  This is a computer-generated institutional receipt issued via the Central College ERP Library System. No physical signature is required.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Official No-Due Certificate Preview Modal ── */}
      <LibraryNoDueCertificateModal
        isOpen={showCertificateModal && clearance?.status === 'Approved'}
        onClose={() => setShowCertificateModal(false)}
        clearance={clearance}
        student={studentSession}
      />
    </div>
  );
};

export default StudentLibrary;





