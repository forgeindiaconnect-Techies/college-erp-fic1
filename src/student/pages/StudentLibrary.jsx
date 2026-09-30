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
  Info
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
  getCourses
} from '../../api';
import './StudentLibrary.css';


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
  const studentSession = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('student_session') || '{}');
    } catch {
      return {};
    }
  }, []);
  const myDept = studentSession.department || studentSession.dept || '';

  const categories = useMemo(() => {
    const list = new Set(['All Categories']);
    
    if (myDept) {
      list.add(myDept);
    }

    // Set of other college departments to prevent showing other departments to the student
    const otherDeptNames = new Set(
      departments
        .map(d => d.name || d.departmentName || d)
        .filter(name => name && (!myDept || name.toLowerCase() !== myDept.toLowerCase()))
    );

    // Add only courses relevant to the student's department
    courses.forEach(c => {
      const cDept = c.department || c.dept || (typeof c.departmentId === 'object' ? c.departmentId?.name : '');
      if (!myDept || !cDept || cDept.toLowerCase() === myDept.toLowerCase()) {
        if (c.name && !otherDeptNames.has(c.name)) {
          list.add(c.name);
        }
      }
    });

    // Add book categories (excluding other college departments)
    books.forEach(b => {
      if (b.category && !otherDeptNames.has(b.category)) {
        list.add(b.category);
      }
    });

    return Array.from(list);
  }, [departments, courses, books, myDept]);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError('');

      const [booksRes, txRes, resRes, returnRes, deptsRes, coursesRes] = await Promise.all([
        getLibraryBooks().catch(() => ({ data: [] })),
        getMyLibraryTransactions().catch(() => ({ data: [] })),
        getLibraryReservations().catch(() => ({ data: [] })),
        getMyLibraryReturnRequests().catch(() => ({ data: [] })),
        getDepartments().catch(() => ({ data: [] })),
        getCourses().catch(() => ({ data: [] }))
      ]);

      const rawCourses = coursesRes?.data?.courses || coursesRes?.data || [];
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setReservations(Array.isArray(resRes.data) ? resRes.data : []);
      setReturnRequests(Array.isArray(returnRes.data) ? returnRes.data : []);
      setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : []);
      setCourses(Array.isArray(rawCourses) ? rawCourses : []);
    } catch (err) {
      console.error('Error fetching library data:', err);
      setError('Failed to load library data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

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
            <span className="kpi-value">{pendingBooks.length}</span>
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

        <div className="library-kpi-card">
          <div className="kpi-info">
            <span className="kpi-label">Fine Balance</span>
            <span className="kpi-value">₹{outstandingFine}</span>
            <span className="kpi-subtext">
              {outstandingFine === 0 ? 'No pending dues' : 'Payable at library counter'}
            </span>
          </div>
          <div className="kpi-icon-wrap emerald">
            <IndianRupee size={22} />
          </div>
        </div>
      </div>

      {/* TABS CONTAINER */}
      <div className="library-tabs-container">
        <div className="library-tabs-list">
          <button
            className={`library-tab-btn ${
              activeTab === 'catalog' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('catalog')}
          >
            <BookOpen size={17} />
            <span>Library Catalog</span>
            <span className="tab-badge">{books.length}</span>
          </button>

          <button
            className={`library-tab-btn ${
              activeTab === 'issued' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('issued')}
          >
            <Layers size={17} />
            <span>My Issued Books</span>
            <span className="tab-badge">{transactions.length}</span>
          </button>

          <button
            className={`library-tab-btn ${
              activeTab === 'reservations' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('reservations')}
          >
            <Bookmark size={17} />
            <span>My Reservations</span>
            <span className="tab-badge">{reservations.length}</span>
          </button>
        </div>

        {activeTab === 'catalog' && (
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <Grid size={16} />
            </button>
          </div>
        )}
      </div>

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
                  <th>Return Date</th>
                  <th>Overdue Track</th>
                  <th>Fine / Penalty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const copy = tx.bookCopyId;
                  const overdueDays = getOverdueDays(tx);
                  const fine = Number(tx.fineAmount || 0);
                  const paid = getFinePaid(tx);
                  const balance = getFineBalance(tx);

                  const returnRequest = returnRequests.find(
                    (request) =>
                      String(request.transactionId?._id || request.transactionId) ===
                      String(tx._id)
                  );

                  const statusClass =
                    tx.status === 'Issued'
                      ? 'issued'
                      : tx.status === 'Overdue'
                        ? 'overdue'
                        : tx.status === 'Pending'
                          ? 'pending'
                          : tx.status === 'Returned'
                            ? 'returned'
                            : 'rejected';

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
                              {tx.bookId?.author || 'Unknown Author'}
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
                                {copy.accessionNumber || copy.barcode || copy._id}
                              </span>
                            </div>
                            <div className="text-xs text-muted">
                              Rack {copy.rackNumber || '-'} · Shelf {copy.shelfNumber || '-'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">
                            {tx.status === 'Pending'
                              ? 'Pending allocation'
                              : 'Copy unlinked'}
                          </span>
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

                      {/* RETURN DATE */}
                      <td className="whitespace-nowrap text-sm text-muted">
                        {tx.returnDate ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                            <RotateCcw size={14} />
                            <span>{getDate(tx.returnDate)}</span>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>

                      {/* OVERDUE */}
                      <td className="whitespace-nowrap">
                        {overdueDays > 0 ? (
                          <span className="tx-status-pill overdue">
                            <AlertTriangle size={12} />
                            {overdueDays} day{overdueDays > 1 ? 's' : ''}
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

                      {/* FINE */}
                      <td style={{ minWidth: '120px' }}>
                        {fine > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-red-500">
                              Fine: ₹{fine}
                            </span>
                            {paid > 0 && (
                              <span className="text-[11px] text-emerald-600">
                                Paid: ₹{paid}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-[var(--text-main)]">
                              Due: ₹{balance}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-600">
                            ₹0.00
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td style={{ minWidth: '160px' }}>
                        <div className="flex flex-col gap-2">
                          <span className={`tx-status-pill ${statusClass}`}>
                            {tx.status === 'Issued' && <BookOpen size={12} />}
                            {tx.status === 'Overdue' && <AlertTriangle size={12} />}
                            {tx.status === 'Pending' && <Clock size={12} />}
                            {tx.status === 'Returned' && <CheckCircle2 size={12} />}
                            {tx.status}
                          </span>

                          {(tx.status === 'Issued' || tx.status === 'Overdue') && (
                            returnRequest?.status === 'Pending' ? (
                              <span className="text-xs font-semibold text-amber-600">
                                Return Requested
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReturnRequest(tx._id)}
                                disabled={returnRequestingId === tx._id}
                                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60"
                              >
                                <RotateCcw size={13} />
                                {returnRequestingId === tx._id
                                  ? 'Requesting...'
                                  : 'Request Return'}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="library-empty-state">
              <div className="empty-icon-wrap">
                <Layers size={30} />
              </div>
              <h3>No Borrowing Records</h3>
              <p>
                You have not requested or borrowed any library books yet. Browse the catalog to place a request.
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

      {/* TAB 3: RESERVATIONS */}
      {activeTab === 'reservations' && (
        <div className="library-table-card">
          <div className="table-wrapper">
            <table className="library-erp-table">
              <thead>
                <tr>
                  <th>Reserved Book</th>
                  <th>Author / Category</th>
                  <th>Request Date</th>
                  <th>Approved Date</th>
                  <th>Status</th>
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {reservations.length === 0 && (
            <div className="library-empty-state">
              <div className="empty-icon-wrap">
                <Bookmark size={30} />
              </div>
              <h3>No Active Reservations</h3>
              <p>
                When a book you want is out of stock, you can reserve it from the catalog to be allocated first.
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
      )}
    </div>
  );
};

export default StudentLibrary;





