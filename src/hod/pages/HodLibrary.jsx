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
  X
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
  getLibraryReturnRequests,
  approveLibraryReturnRequest,
  rejectLibraryReturnRequest
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

const HodLibrary = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [circulationSearch, setCirculationSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Department Catalog');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [circulationStatus, setCirculationStatus] = useState('All');

  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [processingId, setProcessingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);

      const [booksRes, txRes, stdRes, returnRes] = await Promise.all([
        getLibraryBooks().catch(() => ({ data: [] })),
        getAllLibraryTransactions().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] })),
        getLibraryReturnRequests().catch(() => ({ data: [] }))
      ]);

      setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setStudents(Array.isArray(stdRes.data) ? stdRes.data : []);
      setReturnRequests(Array.isArray(returnRes.data) ? returnRes.data : []);
    } catch (err) {
      console.error('Failed to load library data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

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
      await rejectLibraryRequest(id);
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

  /* Dynamic KPI Metrics */
  const totalBookCopies = useMemo(() => {
    return books.reduce((acc, b) => acc + (Number(b.totalCopies) || 1), 0);
  }, [books]);

  const currentlyIssuedCount = useMemo(() => {
    return transactions.filter((t) => t.status === 'Issued').length;
  }, [transactions]);

  const overdueCount = useMemo(() => {
    return transactions.filter((t) => t.status === 'Overdue').length;
  }, [transactions]);

  const activeReadersCount = useMemo(() => {
    const uniqueBorrowers = new Set(transactions.map((t) => t.userId));
    return uniqueBorrowers.size;
  }, [transactions]);

  const pendingIssueRequests = useMemo(() => {
    return transactions.filter((t) => t.status === 'Pending');
  }, [transactions]);

  const pendingReturnRequests = useMemo(() => {
    return returnRequests.filter((r) => r.status === 'Pending');
  }, [returnRequests]);

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

    return books.slice(0, 3).map((b) => ({
      title: b.title,
      author: b.author,
      count: 0
    }));
  }, [transactions, books]);

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
    books.forEach((b) => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats);
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q) ||
        b.bookId?.toLowerCase().includes(q);

      const matchCat =
        selectedCategory === 'All' || b.category === selectedCategory;

      return matchSearch && matchCat;
    });
  }, [books, search, selectedCategory]);

  /* Filtered Live Circulation */
  const filteredCirculation = useMemo(() => {
    return transactions
      .filter((t) => ['Issued', 'Overdue', 'Returned'].includes(t.status))
      .filter((t) => {
        const student = students.find(
          (s) =>
            s.id === t.userId ||
            s.referenceId === t.userId ||
            s.studentId === t.userId ||
            String(s._id) === String(t.userId)
        );
        const name = (student?.name || t.userId || '').toLowerCase();
        const title = (t.bookId?.title || '').toLowerCase();
        const q = circulationSearch.toLowerCase();

        const matchSearch = !circulationSearch || name.includes(q) || title.includes(q) || t.userId?.toLowerCase().includes(q);
        const matchStatus = circulationStatus === 'All' || t.status === circulationStatus;

        return matchSearch && matchStatus;
      });
  }, [transactions, students, circulationSearch, circulationStatus]);

  const getStudentDisplay = (userId) => {
    const student = students.find(
      (s) =>
        s.id === userId ||
        s.referenceId === userId ||
        s.studentId === userId ||
        String(s._id) === String(userId)
    );
    return {
      name: student?.name || student?.fullName || userId,
      details: `${userId} • ${student?.dept || student?.department || 'Student'}`
    };
  };

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
          { key: 'Department Catalog', label: 'Department Catalog', count: books.length },
          { key: 'Live Circulation', label: 'Live Circulation', count: transactions.filter(t => ['Issued', 'Overdue', 'Returned'].includes(t.status)).length },
          { key: 'Reservations', label: 'Issue Requests', count: pendingIssueRequests.length, alert: pendingIssueRequests.length > 0 },
          { key: 'Return Requests', label: 'Return Requests', count: pendingReturnRequests.length, alertAmber: pendingReturnRequests.length > 0 }
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

              <div className="flex items-center gap-3">
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
                      <th>Location</th>
                      <th>Copies in Stock</th>
                      <th>Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-muted">
                          Loading department catalog...
                        </td>
                      </tr>
                    ) : filteredBooks.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-muted">
                          No books found matching search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredBooks.map((book) => {
                        const total = Number(book.totalCopies) || 1;
                        const avail =
                          book.availableCopies !== undefined
                            ? Number(book.availableCopies)
                            : total;
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
                  placeholder="Search by student name, roll number, book title..."
                  value={circulationSearch}
                  onChange={(e) => setCirculationSearch(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  className="hod-select-filter"
                  value={circulationStatus}
                  onChange={(e) => setCirculationStatus(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  <option value="Issued">Issued</option>
                  <option value="Overdue">Overdue</option>
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
                          No circulation records matching the filter.
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
                      <th style={{ textAlign: 'right' }}>Actions</th>
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
                                {req.bookId?.department || 'General'}
                              </span>
                            </td>

                            <td className="text-sm text-muted">
                              {req.requestDate
                                ? new Date(req.requestDate).toLocaleDateString()
                                : '-'}
                            </td>

                            <td style={{ textAlign: 'right' }}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={processingId === req._id}
                                  onClick={() => handleIssueRequest(req._id)}
                                  className="btn-action-primary"
                                >
                                  {processingId === req._id ? (
                                    <RefreshCw size={13} className="animate-spin" />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                  <span>Issue</span>
                                </button>

                                <button
                                  disabled={processingId === req._id}
                                  onClick={() => handleRejectRequest(req._id)}
                                  className="btn-action-danger"
                                >
                                  Reject
                                </button>
                              </div>
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
                      <th style={{ textAlign: 'right' }}>Actions</th>
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

                            <td style={{ textAlign: 'right' }}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={processingId === request._id}
                                  onClick={() => handleApproveReturn(request._id)}
                                  className="btn-action-primary"
                                >
                                  {processingId === request._id ? (
                                    <RefreshCw size={13} className="animate-spin" />
                                  ) : (
                                    <Check size={13} />
                                  )}
                                  <span>Approve Return</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={processingId === request._id}
                                  onClick={() => handleRejectReturn(request._id)}
                                  className="btn-action-danger"
                                >
                                  Reject
                                </button>
                              </div>
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
      </div>
    </div>
  );
};

export default HodLibrary;
