import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book,
  Search,
  Library,
  TrendingUp,
  Users,
  BookOpen,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Calendar,
  Layers,
  Barcode,
  RotateCcw,
  IndianRupee,
  MapPin,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  GraduationCap,
  Filter,
  Eye,
  FileCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  getLibraryBooks,
  getAllLibraryTransactions,
  issueLibraryBook,
  rejectLibraryRequest,
  getStudents,
  getLibraryBorrowers,
  getLibraryReturnRequests,
  approveLibraryReturnRequest,
  rejectLibraryReturnRequest,
  getLibraryReservations,
  approveLibraryReservation,
  rejectLibraryReservation,
  getLibraryClearanceRequests
} from '../../api';
import './HodLibrary.css';

const DEFAULT_TREND = [
  { month: 'Jan', borrows: 12 },
  { month: 'Feb', borrows: 19 },
  { month: 'Mar', borrows: 28 },
  { month: 'Apr', borrows: 35 },
  { month: 'May', borrows: 31 },
  { month: 'Jun', borrows: 42 }
];

const matchesDepartment = (dept1, dept2) => {
  if (!dept1 || !dept2) return false;
  if (dept1 === 'All' || dept2 === 'All') return true;
  const d1 = String(dept1).trim().toLowerCase();
  const d2 = String(dept2).trim().toLowerCase();
  if (d1 === d2 || d1.includes(d2) || d2.includes(d1)) return true;

  const ALIAS_GROUPS = [
    ['computer science', 'cse', 'cs', 'computer science engineering', 'computer science & engineering'],
    ['information technology', 'it', 'infotech'],
    ['electronics & comm.', 'electronics & communication engineering', 'electronics', 'ece', 'ec'],
    ['electrical & electronics', 'electrical & electronics engineering', 'electrical engg.', 'electrical', 'eee', 'ee'],
    ['mechanical engg.', 'mechanical engineering', 'mechanical', 'mech', 'me'],
    ['civil engineering', 'civil engg.', 'civil', 'civ'],
    ['artificial intelligence & data science', 'artificial intelligence', 'ai & ds', 'aids', 'data science'],
    ['artificial intelligence & machine learning', 'aiml', 'machine learning'],
    ['cyber security', 'cyber', 'cybersecurity'],
    ['biomedical engineering', 'biomedical', 'bme'],
    ['bachelor of computer app.', 'bca', 'computer application', 'computer applications'],
    ['master of business admin.', 'mba', 'business administration', 'management']
  ];

  for (const group of ALIAS_GROUPS) {
    const m1 = group.some(alias => d1 === alias || d1.includes(alias) || alias.includes(d1));
    const m2 = group.some(alias => d2 === alias || d2.includes(alias) || alias.includes(d2));
    if (m1 && m2) return true;
  }

  return false;
};

const HodLibrary = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [circulationSearch, setCirculationSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Department Catalog');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [circulationStatus, setCirculationStatus] = useState('All');
  const [catalogScope, setCatalogScope] = useState('department'); // 'department' | 'all'

  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [students, setStudents] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [clearances, setClearances] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const hodSession = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('hod_session') || '{}');
    } catch {
      return {};
    }
  }, []);
  const hodDept = hodSession.department || hodSession.dept || '';

  const fetchLibraryData = async () => {
    try {
      setLoading(true);

      const [booksRes, txRes, resRes, stdRes, borrowersRes, returnRes, clearanceRes] = await Promise.all([
        getLibraryBooks().catch(() => ({ data: [] })),
        getAllLibraryTransactions().catch(() => ({ data: [] })),
        getLibraryReservations().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] })),
        getLibraryBorrowers().catch(() => ({ data: [] })),
        getLibraryReturnRequests().catch(() => ({ data: [] })),
        getLibraryClearanceRequests().catch(() => ({ data: [] }))
      ]);

      const rawBooks = Array.isArray(booksRes.data) ? booksRes.data : [];
      const rawTx = Array.isArray(txRes.data) ? txRes.data : [];
      const rawRes = Array.isArray(resRes.data) ? resRes.data : [];
      const rawStd = Array.isArray(stdRes.data)
        ? stdRes.data
        : Array.isArray(stdRes.data?.students)
        ? stdRes.data.students
        : [];
      const rawBorrowers = Array.isArray(borrowersRes.data) ? borrowersRes.data : [];
      const rawReturn = Array.isArray(returnRes.data) ? returnRes.data : [];
      const rawClearance = Array.isArray(clearanceRes.data) ? clearanceRes.data : [];

      // Combine student registries deduplicating by ID/rollNo
      const studentMap = new Map();
      rawBorrowers.forEach((b) => {
        const id = b.id || b.studentId || b.referenceId || b.rollNo || (b._id ? String(b._id) : null);
        if (id) studentMap.set(String(id), { ...b, id });
      });
      rawStd.forEach((s) => {
        const id = s.id || s.studentId || s.referenceId || s.rollNo || (s._id ? String(s._id) : null);
        if (id) {
          const existing = studentMap.get(String(id)) || {};
          studentMap.set(String(id), { ...existing, ...s, id });
        }
      });
      const combinedStudents = Array.from(studentMap.values());

      setBooks(rawBooks);
      setTransactions(rawTx);
      setReservations(rawRes);
      setStudents(combinedStudents);
      setReturnRequests(rawReturn);
      setClearances(rawClearance);
    } catch (err) {
      console.error('Failed to load library data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const handleApproveRequest = async (item) => {
    try {
      setProcessingId(item._id);
      await approveLibraryReservation(item._id);
      setFeedbackMsg({ type: 'success', text: 'Book request approved successfully.' });
      await fetchLibraryData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to approve request'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleIssueRequest = async (id) => {
    try {
      setProcessingId(id);
      await issueLibraryBook(id);
      setFeedbackMsg({ type: 'success', text: 'Book issued successfully.' });
      await fetchLibraryData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to issue book'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      setProcessingId(id);
      try {
        await rejectLibraryReservation(id);
      } catch {
        await rejectLibraryRequest(id);
      }
      setFeedbackMsg({ type: 'success', text: 'Book request rejected.' });
      await fetchLibraryData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to reject request'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveReturn = async (id) => {
    try {
      setProcessingId(id);
      await approveLibraryReturnRequest(id);
      setFeedbackMsg({ type: 'success', text: 'Book return approved and stock restored.' });
      await fetchLibraryData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to approve return'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReturn = async (id) => {
    try {
      setProcessingId(id);
      await rejectLibraryReturnRequest(id, 'Return rejected by Department HOD');
      setFeedbackMsg({ type: 'success', text: 'Return request rejected.' });
      await fetchLibraryData();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to reject return'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStudentObj = (userId) => {
    if (!userId) return null;
    const uidStr = String(userId).trim().toLowerCase();
    return students.find((s) => {
      const sId = String(s.id || '').trim().toLowerCase();
      const sRef = String(s.referenceId || '').trim().toLowerCase();
      const sStd = String(s.studentId || '').trim().toLowerCase();
      const sRoll = String(s.rollNo || '').trim().toLowerCase();
      const sMongo = String(s._id || '').trim().toLowerCase();
      const sEmail = String(s.email || '').trim().toLowerCase();
      return (
        (sId && sId === uidStr) ||
        (sRef && sRef === uidStr) ||
        (sStd && sStd === uidStr) ||
        (sRoll && sRoll === uidStr) ||
        (sMongo && sMongo === uidStr) ||
        (sEmail && sEmail === uidStr)
      );
    });
  };

  const getStudentDisplay = (userId) => {
    const student = getStudentObj(userId);
    return {
      name: student?.name || student?.fullName || userId,
      details: `${student?.rollNo || student?.studentId || userId} • ${student?.dept || student?.department || 'Student'}`
    };
  };

  /* Filtered Books for HOD Department with graceful scope */
  const departmentBooks = useMemo(() => {
    return books.filter((b) => {
      if (catalogScope === 'all') return true;
      if (!hodDept || hodDept === 'All') return true;
      const bDept = b.department || b.category || '';
      return matchesDepartment(bDept, hodDept) || !b.department;
    });
  }, [books, hodDept, catalogScope]);

  /* Combined and Filtered Issue Requests / Reservations */
  const pendingIssueRequests = useMemo(() => {
    const map = new Map();

    // Add from reservations
    reservations.forEach((r) => {
      if (['Pending', 'Approved', 'Reserved'].includes(r.status)) {
        const student = getStudentObj(r.userId);
        const stdDept = student?.department || student?.dept || '';
        const bkDept = r.bookId?.department || r.bookId?.category || '';

        const matchDept =
          !hodDept ||
          hodDept === 'All' ||
          matchesDepartment(stdDept, hodDept) ||
          matchesDepartment(bkDept, hodDept);

        if (matchDept) {
          const key = `${r.bookId?._id || r.bookId}_${r.userId}`;
          map.set(key, {
            ...r,
            sourceType: 'reservation'
          });
        }
      }
    });

    // Add from transactions
    transactions.forEach((t) => {
      if (['Pending', 'Approved', 'Reserved'].includes(t.status)) {
        const student = getStudentObj(t.userId);
        const stdDept = student?.department || student?.dept || '';
        const bkDept = t.bookId?.department || t.bookId?.category || '';

        const matchDept =
          !hodDept ||
          hodDept === 'All' ||
          matchesDepartment(stdDept, hodDept) ||
          matchesDepartment(bkDept, hodDept);

        if (matchDept) {
          const key = `${t.bookId?._id || t.bookId}_${t.userId}`;
          if (!map.has(key)) {
            map.set(key, {
              ...t,
              sourceType: 'transaction'
            });
          }
        }
      }
    });

    return Array.from(map.values());
  }, [reservations, transactions, students, hodDept]);

  /* Filtered Return Requests */
  const pendingReturnRequests = useMemo(() => {
    return returnRequests.filter((r) => {
      const student = getStudentObj(r.userId);
      const stdDept = student?.department || student?.dept || '';
      const bkDept = r.bookId?.department || r.bookId?.category || '';

      const matchDept =
        !hodDept ||
        hodDept === 'All' ||
        matchesDepartment(stdDept, hodDept) ||
        matchesDepartment(bkDept, hodDept);

      return matchDept;
    });
  }, [returnRequests, students, hodDept]);

  /* Dynamic KPI Metrics */
  const totalBookCopies = useMemo(() => {
    const list = departmentBooks.length > 0 ? departmentBooks : books;
    return list.reduce((acc, b) => acc + (Number(b.totalCopies) || Number(b.copies) || 1), 0);
  }, [departmentBooks, books]);

  const currentlyIssuedCount = useMemo(() => {
    return transactions.filter((t) => {
      const s = String(t.status || '').toLowerCase();
      if (!['issued', 'overdue', 'return requested', 'return pending', 'active', 'borrowed'].includes(s)) return false;
      const student = getStudentObj(t.userId);
      const stdDept = student?.department || student?.dept || '';
      const bkDept = t.bookId?.department || t.bookId?.category || '';
      return !hodDept || hodDept === 'All' || matchesDepartment(stdDept, hodDept) || matchesDepartment(bkDept, hodDept);
    }).length;
  }, [transactions, students, hodDept]);

  const overdueCount = useMemo(() => {
    return transactions.filter((t) => {
      const s = String(t.status || '').toLowerCase();
      if (s !== 'overdue') return false;
      const student = getStudentObj(t.userId);
      const stdDept = student?.department || student?.dept || '';
      const bkDept = t.bookId?.department || t.bookId?.category || '';
      return !hodDept || hodDept === 'All' || matchesDepartment(stdDept, hodDept) || matchesDepartment(bkDept, hodDept);
    }).length;
  }, [transactions, students, hodDept]);

  const activeReadersCount = useMemo(() => {
    const uniqueBorrowers = new Set(
      transactions
        .filter((t) => {
          const student = getStudentObj(t.userId);
          const stdDept = student?.department || student?.dept || '';
          const bkDept = t.bookId?.department || t.bookId?.category || '';
          return !hodDept || hodDept === 'All' || matchesDepartment(stdDept, hodDept) || matchesDepartment(bkDept, hodDept);
        })
        .map((t) => t.userId)
    );
    return uniqueBorrowers.size;
  }, [transactions, students, hodDept]);

  /* Dynamic Top Books */
  const topBooks = useMemo(() => {
    const counts = {};
    transactions.forEach((t) => {
      const title = t.bookId?.title || 'Unknown Title';
      const author = t.bookId?.author || 'Department Catalog';
      if (!counts[title]) {
        counts[title] = { title, author, count: 0 };
      }
      counts[title].count += 1;
    });

    const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
    if (sorted.length > 0) return sorted.slice(0, 3);

    const fallbackList = departmentBooks.length > 0 ? departmentBooks : books;
    return fallbackList.slice(0, 3).map((b) => ({
      title: b.title,
      author: b.author,
      count: 0
    }));
  }, [transactions, departmentBooks, books]);

  /* Dynamic 6-Month Trend */
  const monthlyTrend = useMemo(() => {
    if (transactions.length === 0) return DEFAULT_TREND;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6 = [];

    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonth - i + 12) % 12;
      last6.push({
        month: monthNames[mIdx],
        monthIdx: mIdx,
        borrows: 0
      });
    }

    transactions.forEach((tx) => {
      if (tx.issueDate || tx.createdAt) {
        const d = new Date(tx.issueDate || tx.createdAt);
        const m = d.getMonth();
        const found = last6.find((item) => item.monthIdx === m);
        if (found) found.borrows += 1;
      }
    });

    return last6;
  }, [transactions]);

  /* Filtered Catalog Books */
  const categoriesList = useMemo(() => {
    const cats = new Set(['All']);
    const list = departmentBooks.length > 0 ? departmentBooks : books;
    list.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats);
  }, [departmentBooks, books]);

  const displayBooksList = departmentBooks.length > 0 || catalogScope === 'department' ? departmentBooks : books;

  const filteredBooks = useMemo(() => {
    return displayBooksList.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.bookId?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q);

      const matchCat =
        selectedCategory === 'All' || b.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [displayBooksList, search, selectedCategory]);

  const [circulationScope, setCirculationScope] = useState('department'); // 'department' | 'all'

  /* Filtered Live Circulation */
  const filteredCirculation = useMemo(() => {
    const activeStatuses = [
      'issued', 'overdue', 'returned', 'return requested', 
      'return pending', 'active', 'borrowed', 'approved'
    ];

    return transactions
      .filter((t) => {
        const s = String(t.status || '').trim().toLowerCase();
        return activeStatuses.includes(s) || s.includes('issue') || s.includes('return') || s.includes('overdue');
      })
      .filter((t) => {
        if (circulationScope === 'all' || !hodDept || hodDept === 'All') return true;

        const student = getStudentObj(t.userId);
        const stdDept = student?.department || student?.dept || '';
        const bkDept = t.bookId?.department || t.bookId?.category || '';

        const matchDept =
          matchesDepartment(stdDept, hodDept) ||
          matchesDepartment(bkDept, hodDept);

        // If department match found keep it; otherwise allow if scope is all
        return matchDept;
      })
      .filter((t) => {
        const student = getStudentObj(t.userId);
        const name = (student?.name || student?.fullName || String(t.userId || '')).toLowerCase();
        const title = (t.bookId?.title || '').toLowerCase();
        const q = circulationSearch.toLowerCase();

        const matchSearch =
          !circulationSearch ||
          name.includes(q) ||
          title.includes(q) ||
          String(t.userId || '').toLowerCase().includes(q) ||
          String(t.bookCopyId?.barcode || '').toLowerCase().includes(q) ||
          String(t.bookCopyId?.accessionNumber || '').toLowerCase().includes(q);

        const tStatus = String(t.status || '').toLowerCase();
        const matchStatus =
          circulationStatus === 'All' ||
          tStatus === circulationStatus.toLowerCase() ||
          (circulationStatus === 'Return Requested' && (tStatus.includes('return') && !tStatus.includes('returned')));

        return matchSearch && matchStatus;
      });
  }, [transactions, students, hodDept, circulationSearch, circulationStatus, circulationScope]);

  /* Department Students Library Roster */
  const departmentStudentsRoster = useMemo(() => {
    return students
      .filter((s) => {
        if (!hodDept || hodDept === 'All') return true;
        const sDept = s.department || s.dept || '';
        return matchesDepartment(sDept, hodDept);
      })
      .map((s) => {
        const sId = String(s.id || s.studentId || s.referenceId || s.rollNo || s._id || '');
        const sRoll = String(s.rollNo || s.referenceId || s.studentId || '');

        const studentTx = transactions.filter((t) => {
          const tid = String(t.userId || '');
          return tid && (tid === sId || tid === sRoll || tid === String(s._id));
        });

        const activeHeld = studentTx.filter((t) => t.status === 'Issued');
        const overdueHeld = studentTx.filter((t) => t.status === 'Overdue');
        const pendingReqs = reservations.filter((r) => {
          const rid = String(r.userId || '');
          return rid && (rid === sId || rid === sRoll || rid === String(s._id)) && ['Pending', 'Reserved'].includes(r.status);
        });

        const totalFine = studentTx.reduce((sum, t) => {
          const fine = Number(t.fineAmount || 0);
          const paid = Number(t.finePaid || 0);
          return sum + Math.max(0, fine - paid);
        }, 0);

        const clearance = clearances.find((c) => {
          const cid = String(c.studentId || c.userId || '');
          return cid && (cid === sId || cid === sRoll || cid === String(s._id));
        });

        return {
          ...s,
          rollNo: s.rollNo || s.studentId || s.referenceId || s.id || 'N/A',
          name: s.name || s.fullName || 'Student',
          sem: s.sem || s.semester || 'Sem 1',
          activeHeldCount: activeHeld.length,
          overdueCount: overdueHeld.length,
          pendingReqCount: pendingReqs.length,
          totalFine,
          clearanceStatus: clearance?.status || (activeHeld.length === 0 && overdueHeld.length === 0 && totalFine === 0 ? 'Eligible' : 'Dues Pending')
        };
      })
      .filter((s) => {
        if (!studentSearch) return true;
        const q = studentSearch.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.rollNo.toLowerCase().includes(q) ||
          String(s.sem).toLowerCase().includes(q)
        );
      });
  }, [students, hodDept, transactions, reservations, clearances, studentSearch]);

  return (
    <div className="hod-library-container">
      {/* HEADER */}
      <div className="hod-library-header">
        <div className="hod-library-title">
          <h1>
            <Library className="text-indigo-600" size={28} />
            Department Library Operations
          </h1>
          <p>
            Monitor department catalog inventory, active circulations, and process student book requests & returns.
          </p>
        </div>

        <div className="hod-header-actions">
          <button
            onClick={fetchLibraryData}
            className="btn-hod-refresh"
            title="Refresh Live Data"
          >
            <RefreshCw
              size={15}
              className={loading ? 'animate-spin' : ''}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-semibold ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-xs underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="hod-library-kpi-grid">
        <div className="hod-kpi-box">
          <div className="hod-kpi-info">
            <span className="hod-kpi-label">Total Books</span>
            <span className="hod-kpi-value">{totalBookCopies}</span>
            <span className="hod-kpi-sub">{books.length} Unique Titles</span>
          </div>
          <div className="hod-kpi-icon indigo">
            <Book size={22} />
          </div>
        </div>

        <div className="hod-kpi-box">
          <div className="hod-kpi-info">
            <span className="hod-kpi-label">Currently Issued</span>
            <span className="hod-kpi-value">{currentlyIssuedCount}</span>
            <span className="hod-kpi-sub">In circulation with students</span>
          </div>
          <div className="hod-kpi-icon teal">
            <BookOpen size={22} />
          </div>
        </div>

        <div
          className={`hod-kpi-box ${
            overdueCount > 0 ? 'warning-card' : ''
          }`}
        >
          <div className="hod-kpi-info">
            <span className="hod-kpi-label">Overdue Returns</span>
            <span
              className="hod-kpi-value"
              style={{ color: overdueCount > 0 ? '#d97706' : 'inherit' }}
            >
              {overdueCount}
            </span>
            <span className="hod-kpi-sub">
              {overdueCount > 0 ? 'Requires follow-up' : 'All returns on time'}
            </span>
          </div>
          <div className="hod-kpi-icon amber">
            <Clock size={22} />
          </div>
        </div>

        <div className="hod-kpi-box">
          <div className="hod-kpi-info">
            <span className="hod-kpi-label">Active Readers</span>
            <span className="hod-kpi-value">{activeReadersCount}</span>
            <span className="hod-kpi-sub">Unique department borrowers</span>
          </div>
          <div className="hod-kpi-icon indigo">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* ANALYTICS & TOP BOOKS */}
      <div className="hod-analytics-grid">
        <div className="hod-chart-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <TrendingUp size={18} className="text-indigo-600" />
              Borrowing Trend (6 Months)
            </h3>
            <span className="text-xs font-semibold text-muted">
              Live Transactions
            </span>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorBorrows" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border-color)"
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-main)',
                    borderColor: 'var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="borrows"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorBorrows)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hod-chart-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <Bookmark size={18} className="text-indigo-600" />
              Top Books Issued
            </h3>
            <span className="text-xs font-semibold text-muted">Popular</span>
          </div>

          <div className="top-books-list">
            {topBooks.map((b, idx) => (
              <div key={idx} className="top-book-item">
                <div className="top-book-meta">
                  <h4>{b.title}</h4>
                  <p>{b.author}</p>
                </div>
                <span className="top-book-pill">
                  {b.count} {b.count === 1 ? 'Borrow' : 'Borrows'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TABS BAR */}
      <div className="hod-tabs-bar">
        {[
          { key: 'Department Catalog', label: 'Department Catalog', count: displayBooksList.length },
          { key: 'Live Circulation', label: 'Live Circulation', count: filteredCirculation.length },
          { key: 'Reservations', label: 'Issue Requests', count: pendingIssueRequests.length, alert: pendingIssueRequests.length > 0 },
          { key: 'Return Requests', label: 'Return Requests', count: pendingReturnRequests.length, alertAmber: pendingReturnRequests.length > 0 },
          { key: 'Department Students', label: 'Department Students', count: departmentStudentsRoster.length }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`hod-tab-item ${
              activeTab === tab.key ? 'active' : ''
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`badge-counter ${
                tab.alert
                  ? 'alert-red'
                  : tab.alertAmber
                    ? 'alert-amber'
                    : ''
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="space-y-4">
        {/* TAB 1: CATALOG */}
        {activeTab === 'Department Catalog' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="hod-table-toolbar">
              <div className="hod-search-box">
                <Search size={18} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search by title, author, category, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Scope Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCatalogScope('department')}
                    className={`px-3 py-1.5 rounded-md transition-all ${catalogScope === 'department' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'}`}
                  >
                    Department Books ({departmentBooks.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogScope('all')}
                    className={`px-3 py-1.5 rounded-md transition-all ${catalogScope === 'all' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'}`}
                  >
                    All College Catalog ({books.length})
                  </button>
                </div>

                <select
                  className="hod-select-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="hod-table-card">
              <div className="overflow-x-auto">
                <table className="hod-erp-table">
                  <thead>
                    <tr>
                      <th>Book Information</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Copies in Stock</th>
                      <th>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-muted">
                          Loading library catalog...
                        </td>
                      </tr>
                    ) : filteredBooks.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-muted">
                          <BookOpen size={28} className="mx-auto text-slate-400 mb-2" />
                          <p className="font-semibold text-slate-700">No books found matching search criteria.</p>
                          {catalogScope === 'department' && (
                            <button
                              type="button"
                              onClick={() => setCatalogScope('all')}
                              className="mt-2 text-xs font-bold text-indigo-600 underline"
                            >
                              Switch to All College Catalog
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredBooks.map((book) => {
                        const total = Number(book.totalCopies) || Number(book.copies) || 1;
                        const avail =
                          book.availableCopies !== undefined
                            ? Number(book.availableCopies)
                            : (book.available !== undefined ? Number(book.available) : total);
                        const isAvail = avail > 0;

                        return (
                          <tr key={book._id}>
                            <td style={{ minWidth: '220px' }}>
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                                  <BookOpen size={16} />
                                </div>
                                <div>
                                  <span className="font-bold text-[var(--text-main)] block">
                                    {book.title}
                                  </span>
                                  {book.bookId && (
                                    <span className="text-[11px] font-mono text-muted">
                                      ID: {book.bookId}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="text-muted">{book.author || '-'}</td>

                            <td>
                              <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs font-semibold text-muted">
                                {book.category || 'General'}
                              </span>
                            </td>

                            <td>
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
                                {book.department || 'All Departments'}
                              </span>
                            </td>

                            <td>
                              <span className="text-xs text-muted">
                                Rack {book.rackNumber || '-'} · Shelf {book.shelfNumber || '-'}
                              </span>
                            </td>

                            <td className="font-bold">
                              {avail} / {total}
                            </td>

                            <td>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                  isAvail
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-red-500/10 text-red-600'
                                  }`}
                              >
                                {isAvail ? 'Available' : 'Out of Stock'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE CIRCULATION */}
        {activeTab === 'Live Circulation' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="hod-table-toolbar">
              <div className="hod-search-box">
                <Search size={18} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search by student name, roll number, book title, barcode..."
                  value={circulationSearch}
                  onChange={(e) => setCirculationSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Circulation Scope Switcher */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCirculationScope('department')}
                    className={`px-3 py-1.5 rounded-md transition-all ${circulationScope === 'department' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'}`}
                  >
                    Department Circulation
                  </button>
                  <button
                    type="button"
                    onClick={() => setCirculationScope('all')}
                    className={`px-3 py-1.5 rounded-md transition-all ${circulationScope === 'all' ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'}`}
                  >
                    All College Circulation ({transactions.length})
                  </button>
                </div>

                <select
                  className="hod-select-filter"
                  value={circulationStatus}
                  onChange={(e) => setCirculationStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Issued">Issued</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Return Requested">Return Requested</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>
            </div>

            <div className="hod-table-card">
              <div className="overflow-x-auto">
                <table className="hod-erp-table">
                  <thead>
                    <tr>
                      <th>Borrower Info</th>
                      <th>Book Title</th>
                      <th>Physical Copy</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Fine Status</th>
                      <th>Circulation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCirculation.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-muted">
                          <BookOpen size={28} className="mx-auto text-slate-400 mb-2" />
                          <p className="font-semibold text-slate-700">No circulation records matching the filter.</p>
                          {circulationScope === 'department' && transactions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCirculationScope('all')}
                              className="mt-2 text-xs font-bold text-indigo-600 underline"
                            >
                              Switch to All College Circulation ({transactions.length} Records)
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredCirculation.map((issue) => {
                        const borrower = getStudentDisplay(issue.userId);
                        const isOverdue = issue.status === 'Overdue';
                        const fine = Number(issue.fineAmount || 0);

                        return (
                          <tr key={issue._id}>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text-main)]">
                                  {borrower.name}
                                </span>
                                <span className="text-xs text-muted">
                                  {borrower.details}
                                </span>
                              </div>
                            </td>

                            <td style={{ minWidth: '200px' }}>
                              <span className="font-semibold text-[var(--text-main)]">
                                {issue.bookId?.title || 'Catalog Book'}
                              </span>
                            </td>

                            <td>
                              <span className="text-xs font-mono text-muted">
                                {issue.bookCopyId?.accessionNumber || issue.bookCopyId?.barcode || '-'}
                              </span>
                            </td>

                            <td className="text-sm text-muted">
                              {issue.issueDate
                                ? new Date(issue.issueDate).toLocaleDateString()
                                : '-'}
                            </td>

                            <td className="text-sm">
                              <span
                                className={
                                  isOverdue
                                    ? 'text-red-600 font-bold'
                                    : 'text-muted'
                                }
                              >
                                {issue.dueDate
                                  ? new Date(issue.dueDate).toLocaleDateString()
                                  : '-'}
                              </span>
                            </td>

                            <td>
                              {fine > 0 ? (
                                <span className="text-xs font-bold text-red-600">
                                  ₹{fine}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-emerald-600">
                                  ₹0
                                </span>
                              )}
                            </td>

                            <td>
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  isOverdue
                                    ? 'bg-red-500/10 text-red-600'
                                    : issue.status === 'Returned'
                                      ? 'bg-emerald-500/10 text-emerald-600'
                                      : 'bg-indigo-500/10 text-indigo-600'
                                }`}
                              >
                                {issue.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ISSUE REQUESTS (RESERVATIONS) */}
        {activeTab === 'Reservations' && (
          <div className="animate-fade-in">
            <div className="hod-table-card">
              <div className="overflow-x-auto">
                <table className="hod-erp-table">
                  <thead>
                    <tr>
                      <th>Borrower Info</th>
                      <th>Book Requested</th>
                      <th>Department</th>
                      <th>Request Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingIssueRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-10 text-center text-muted">
                          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                          <p className="font-bold text-[var(--text-main)]">No Pending Issue Requests</p>
                          <p className="text-xs text-muted mt-1">All student book requests have been processed.</p>
                        </td>
                      </tr>
                    ) : (
                      pendingIssueRequests.map((req) => {
                        const borrower = getStudentDisplay(req.userId);
                        const isApproved = req.status === 'Approved';

                        return (
                          <tr key={req._id}>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text-main)]">
                                  {borrower.name}
                                </span>
                                <span className="text-xs text-muted">
                                  {borrower.details}
                                </span>
                              </div>
                            </td>

                            <td style={{ minWidth: '220px' }}>
                              <div className="flex items-center gap-2">
                                <BookOpen size={16} className="text-indigo-600" />
                                <span className="font-semibold text-[var(--text-main)]">
                                  {req.bookId?.title || 'Book Title'}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-semibold text-muted">
                                {req.bookId?.department || req.bookId?.category || 'General'}
                              </span>
                            </td>

                            <td className="text-sm text-muted">
                              {req.requestDate
                                ? new Date(req.requestDate).toLocaleDateString()
                                : '-'}
                            </td>

                            <td>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${
                                  isApproved
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}
                              >
                                {req.status || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RETURN REQUESTS */}
        {activeTab === 'Return Requests' && (
          <div className="animate-fade-in">
            <div className="hod-table-card">
              <div className="overflow-x-auto">
                <table className="hod-erp-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Book & Allocated Copy</th>
                      <th>Issue / Due Date</th>
                      <th>Fine Amount</th>
                      <th>Request Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingReturnRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-10 text-center text-muted">
                          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                          <p className="font-bold text-[var(--text-main)]">No Pending Return Requests</p>
                          <p className="text-xs text-muted mt-1">All physical return requests have been acknowledged.</p>
                        </td>
                      </tr>
                    ) : (
                      pendingReturnRequests.map((request) => {
                        const borrower = getStudentDisplay(request.userId);
                        const transaction = request.transactionId || {};
                        const fine = Number(transaction.fineAmount || 0);

                        return (
                          <tr key={request._id}>
                            <td>
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text-main)]">
                                  {borrower.name}
                                </span>
                                <span className="text-xs text-muted">
                                  {borrower.details}
                                </span>
                              </div>
                            </td>

                            <td style={{ minWidth: '220px' }}>
                              <div className="flex flex-col">
                                <span className="font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                                  <BookOpen size={14} className="text-indigo-600" />
                                  {request.bookId?.title || 'Unknown Book'}
                                </span>
                                <span className="text-xs font-mono text-muted mt-0.5">
                                  Copy: {request.bookCopyId?.accessionNumber || request.bookCopyId?.barcode || '-'}
                                </span>
                              </div>
                            </td>

                            <td>
                              <div className="flex flex-col text-xs text-muted">
                                <span>
                                  Issued: {transaction.issueDate ? new Date(transaction.issueDate).toLocaleDateString() : '-'}
                                </span>
                                <span>
                                  Due: {transaction.dueDate ? new Date(transaction.dueDate).toLocaleDateString() : '-'}
                                </span>
                              </div>
                            </td>

                            <td>
                              <span className={fine > 0 ? 'font-bold text-red-600 text-sm' : 'font-semibold text-emerald-600 text-sm'}>
                                ₹{fine.toFixed(2)}
                              </span>
                            </td>

                            <td className="text-sm text-muted">
                              {request.requestDate
                                ? new Date(request.requestDate).toLocaleDateString()
                                : '-'}
                            </td>

                            <td>
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {request.status || 'Return Requested'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: DEPARTMENT STUDENTS LIBRARY ROSTER */}
        {activeTab === 'Department Students' && (
          <div className="animate-fade-in flex flex-col gap-4">
            <div className="hod-table-toolbar">
              <div className="hod-search-box">
                <Search size={18} className="text-muted" />
                <input
                  type="text"
                  placeholder="Search students by name, roll number, semester..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <GraduationCap size={16} className="text-indigo-600" />
                <span>Department: {hodDept || 'All'}</span>
                <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold ml-1">
                  {departmentStudentsRoster.length} Enrolled
                </span>
              </div>
            </div>

            <div className="hod-table-card">
              <div className="overflow-x-auto">
                <table className="hod-erp-table">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Semester</th>
                      <th>Books Held</th>
                      <th>Overdue</th>
                      <th>Pending Requests</th>
                      <th>Total Dues</th>
                      <th>Clearance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentStudentsRoster.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-muted">
                          <Users size={32} className="mx-auto text-slate-400 mb-2" />
                          <p className="font-bold text-slate-700">No students found for this department.</p>
                          <p className="text-xs text-muted mt-1">Make sure department names match or sync student registrations.</p>
                        </td>
                      </tr>
                    ) : (
                      departmentStudentsRoster.map((student) => (
                        <tr key={student.id || student._id || student.rollNo}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 font-bold text-xs flex items-center justify-center">
                                {student.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--text-main)]">
                                  {student.name}
                                </span>
                                <span className="text-xs text-muted font-mono">
                                  {student.rollNo}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {student.sem}
                            </span>
                          </td>

                          <td>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${student.activeHeldCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500'}`}>
                              {student.activeHeldCount} {student.activeHeldCount === 1 ? 'Book' : 'Books'}
                            </span>
                          </td>

                          <td>
                            {student.overdueCount > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {student.overdueCount} Overdue
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600">
                                0 Overdue
                              </span>
                            )}
                          </td>

                          <td>
                            {student.pendingReqCount > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {student.pendingReqCount} Request
                              </span>
                            ) : (
                              <span className="text-xs text-muted">0</span>
                            )}
                          </td>

                          <td>
                            {student.totalFine > 0 ? (
                              <span className="text-xs font-bold text-red-600">
                                ₹{student.totalFine.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-emerald-600">
                                ₹0.00
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                student.clearanceStatus === 'Approved' || student.clearanceStatus === 'Eligible'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : student.clearanceStatus === 'Pending'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {student.clearanceStatus === 'Approved' ? (
                                <>
                                  <ShieldCheck size={12} />
                                  <span>Certified</span>
                                </>
                              ) : student.clearanceStatus === 'Eligible' ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>Eligible</span>
                                </>
                              ) : student.clearanceStatus === 'Pending' ? (
                                <>
                                  <Clock size={12} />
                                  <span>In Review</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle size={12} />
                                  <span>Dues Pending</span>
                                </>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HodLibrary;
