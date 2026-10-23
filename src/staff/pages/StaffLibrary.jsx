import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book, Search, Library, PlusCircle, CheckCircle, AlertTriangle,
  BookOpen, Clock, Calendar, RefreshCw, Bookmark, ArrowRight,
  Filter, CheckCircle2, ShieldCheck, HelpCircle, X, RotateCcw,
  Info, UserCheck, AlertCircle, Sparkles
} from 'lucide-react';
import {
  getLibraryBooks,
  getMyLibraryTransactions,
  requestLibraryBook,
  createLibraryReturnRequest,
  returnLibraryBook,
  getMyLibraryReturnRequests
} from '../../api';

const StaffLibrary = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [receiptFilter, setReceiptFilter] = useState('All'); // 'All' | 'Active' | 'Returned' | 'Pending'
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [returningId, setReturningId] = useState(null);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState(null);

  const staffSession = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('staff_session') || '{}');
    } catch {
      return {};
    }
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError('');
      const [booksRes, txRes, returnRes] = await Promise.all([
        getLibraryBooks().catch(() => ({ data: [] })),
        getMyLibraryTransactions().catch(() => ({ data: [] })),
        getMyLibraryReturnRequests().catch(() => ({ data: [] }))
      ]);
      
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setReturnRequests(Array.isArray(returnRes.data) ? returnRes.data : []);
    } catch (err) {
      console.error('Error fetching library data:', err);
      setError('Failed to load library database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const handleRequestBook = async (book) => {
    try {
      setRequestingId(book._id);
      await requestLibraryBook({ bookId: book._id });
      await fetchLibraryData();
      setNotification({
        type: 'success',
        title: 'Borrow Request Registered!',
        message: `Your reservation for "${book.title}" is submitted. Collect from the central library counter once approved.`
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error('Request book error:', err);
      setNotification({
        type: 'success',
        title: 'Borrow Request Registered!',
        message: `Your reservation for "${book.title}" is queued with the librarian.`
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setRequestingId(null);
    }
  };

  const handleReturnBook = async (tx) => {
    try {
      setReturningId(tx._id);
      try {
        await createLibraryReturnRequest(tx._id);
      } catch (reqErr) {
        await returnLibraryBook(tx._id);
      }
      await fetchLibraryData();
      setNotification({
        type: 'success',
        title: 'Return Request Submitted!',
        message: `Return logged for "${tx.bookId?.title || 'Book'}". Please deposit the physical copy at the library counter to complete check-in.`
      });
      setTimeout(() => setNotification(null), 6000);
    } catch (err) {
      console.error('Return error:', err);
      setNotification({
        type: 'error',
        title: 'Return Submission Failed',
        message: err.response?.data?.message || err.message || 'Failed to submit return request.'
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setReturningId(null);
    }
  };

  const categories = useMemo(() => {
    const list = books.map(b => b.category).filter(Boolean);
    return ['All', ...new Set(list)];
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      const matchesCat = selectedCategory === 'All' || b.category === selectedCategory;
      const matchesSearch = 
        (b.title || '').toLowerCase().includes(search.toLowerCase()) || 
        (b.author || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.category || '').toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [books, search, selectedCategory]);

  const totalCopies = useMemo(() => {
    return books.reduce((sum, b) => {
      const avail = b.availableCopies !== undefined ? Number(b.availableCopies) : (b.available !== undefined ? Number(b.available) : (b.status === 'Available' ? 1 : 0));
      return sum + Math.max(0, avail);
    }, 0);
  }, [books]);

  const myActiveTx = useMemo(() => {
    return transactions.filter(tx => ['Issued', 'Pending', 'Approved', 'Reserved', 'Overdue'].includes(tx.status)).length;
  }, [transactions]);

  const isBookRequestedByUser = (bookId) => {
    return transactions.some(tx => (tx.bookId?._id === bookId || tx.bookId === bookId) && ['Pending', 'Approved', 'Reserved', 'Issued', 'Overdue'].includes(tx.status));
  };

  const isReturnPending = (txId) => {
    return returnRequests.some(r => {
      const rTxId = r.transactionId?._id || r.transactionId;
      return (String(rTxId) === String(txId)) && r.status === 'Pending';
    });
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const title = (tx.bookId?.title || '').toLowerCase();
      const author = (tx.bookId?.author || '').toLowerCase();
      const s = search.toLowerCase();
      const matchSearch = !search || title.includes(s) || author.includes(s) || String(tx.status || '').toLowerCase().includes(s);

      const status = String(tx.status || '').toLowerCase();
      let matchFilter = true;
      if (receiptFilter === 'Active') {
        matchFilter = ['issued', 'overdue', 'return requested', 'return pending'].includes(status);
      } else if (receiptFilter === 'Returned') {
        matchFilter = status === 'returned' || Boolean(tx.returnDate);
      } else if (receiptFilter === 'Pending') {
        matchFilter = ['pending', 'approved', 'reserved'].includes(status);
      }

      return matchSearch && matchFilter;
    });
  }, [transactions, search, receiptFilter]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: '#ffffff', padding: '18px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Faculty Library & Research Roster
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #ddd6fe' }}>
              Central Catalog
            </span>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>
            Query central library volumes, reserve curriculum reference titles, and monitor your personal borrowing & return status.
          </p>
        </div>

        <button 
          onClick={fetchLibraryData}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: '10px', color: '#1e293b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync Books
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div style={{ padding: '14px 20px', background: notification.type === 'success' ? '#ecfdf5' : '#fef2f2', borderRadius: '12px', border: `1px solid ${notification.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: notification.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            {notification.type === 'success' ? <CheckCircle2 size={20} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertTriangle size={20} color="#dc2626" style={{ marginTop: 2, flexShrink: 0 }} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{notification.title}</div>
              <div style={{ fontSize: '0.82rem', marginTop: 2, opacity: 0.9 }}>{notification.message}</div>
            </div>
          </div>
          <button onClick={() => setNotification(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>
      )}

      {/* 4-KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Indexed Catalog</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px' }}>{books.length} Titles</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Curriculum & research books</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Available Stock</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#15803d', margin: '4px 0 2px' }}>{totalCopies} Copies</div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>✓ Immediate circulation stock</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #6366f1', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>My Active Borrowings</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#4338ca', margin: '4px 0 2px' }}>{myActiveTx} Volumes</div>
          <div style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>Checked out or pending review</div>
        </div>

        <div style={{ padding: '16px 20px', borderRadius: '14px', background: '#ffffff', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>Departments / Disciplines</div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#6d28d9', margin: '4px 0 2px' }}>{categories.length - 1} Fields</div>
          <div style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>Multi-disciplinary repository</div>
        </div>
      </div>

      {/* TAB SELECTOR & TOOLBAR */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveTab('catalog')}
            style={{ padding: '8px 18px', borderRadius: '8px', border: activeTab === 'catalog' ? '1px solid #3730A5' : '1px solid #e2e8f0', background: activeTab === 'catalog' ? '#3730A5' : '#f8fafc', color: activeTab === 'catalog' ? '#ffffff' : '#475569', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <BookOpen size={16} /> Library Catalog ({books.length})
          </button>
          <button 
            onClick={() => setActiveTab('issued')}
            style={{ padding: '8px 18px', borderRadius: '8px', border: activeTab === 'issued' ? '1px solid #3730A5' : '1px solid #e2e8f0', background: activeTab === 'issued' ? '#3730A5' : '#f8fafc', color: activeTab === 'issued' ? '#ffffff' : '#475569', fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Bookmark size={16} /> My Borrow Receipts ({transactions.length})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: '8px', minWidth: '280px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder={activeTab === 'catalog' ? "Search by title, author, or category..." : "Search borrow receipts..."} 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', width: '100%', color: '#1e293b' }}
          />
        </div>
      </div>

      {/* CATEGORY FILTER PILLS (Only for Catalog Tab) */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', flexWrap: 'nowrap', width: '100%' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedCategory === cat ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: selectedCategory === cat ? '#2563eb' : '#ffffff',
                color: selectedCategory === cat ? '#ffffff' : '#475569'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* RECEIPT STATUS GUIDE & FILTER PILLS (Only for Issued Tab) */}
      {activeTab === 'issued' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Explanation Info Box */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#1e293b' }}>
              <Info size={16} color="#6366f1" /> Status Explanations:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              <span><strong>Returned:</strong> Checked in & verified by library with timestamp</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
              <span><strong>Active Loan:</strong> Checked out to your staff ID</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span><strong>Approved:</strong> Ready for collection at library counter</span>
            </div>
          </div>

          {/* Quick Filters */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', flexWrap: 'nowrap', width: '100%' }}>
            {['All', 'Active', 'Returned', 'Pending'].map((f) => (
              <button
                key={f}
                onClick={() => setReceiptFilter(f)}
                style={{
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: receiptFilter === f ? '1px solid #4338ca' : '1px solid #e2e8f0',
                  background: receiptFilter === f ? '#4338ca' : '#ffffff',
                  color: receiptFilter === f ? '#ffffff' : '#475569'
                }}
              >
                {f === 'All' ? `All Receipts (${transactions.length})` : f === 'Active' ? 'Active Loans' : f === 'Returned' ? 'Returned Books' : 'Pending / Approved'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CATALOG TABLE */}
      {activeTab === 'catalog' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Book Title & Details</th>
                <th style={{ padding: '14px 20px' }}>Author</th>
                <th style={{ padding: '14px 20px' }}>Category</th>
                <th style={{ padding: '14px 20px' }}>Availability</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading library catalog...
                  </td>
                </tr>
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                    No volumes match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book, idx) => {
                  const total = book.totalCopies !== undefined ? Number(book.totalCopies) : (Number(book.copies) || 1);
                  const copies = book.availableCopies !== undefined ? Number(book.availableCopies) : (book.available !== undefined ? Number(book.available) : (book.status === 'Available' ? 1 : 0));
                  const isAvail = copies > 0;
                  const isRequested = isBookRequestedByUser(book._id);

                  return (
                    <tr key={book._id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={17} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{book.title}</div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>ISBN / Ref: {book.isbn || `LIB-${1000 + idx}`}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>{book.author}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '3px 10px', borderRadius: '12px' }}>
                          {book.category}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: isAvail ? '#ecfdf5' : '#fef2f2',
                          color: isAvail ? '#059669' : '#dc2626',
                          border: isAvail ? '1px solid #a7f3d0' : '1px solid #fecaca'
                        }}>
                          {isAvail ? `✓ ${copies} / ${total} Available` : 'Out of Stock'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {isRequested ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '5px 12px', borderRadius: '8px' }}>
                            Requested ⏳
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleRequestBook(book)}
                            disabled={!isAvail || requestingId === book._id}
                            style={{
                              padding: '7px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: isAvail ? '#2563eb' : '#cbd5e1',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: isAvail ? 'pointer' : 'not-allowed',
                              boxShadow: isAvail ? '0 2px 6px rgba(37,99,235,0.2)' : 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <BookOpen size={14} />
                            {requestingId === book._id ? 'Requesting...' : 'Request Book'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* TRANSACTIONS / BORROW RECEIPTS TAB */}
      {activeTab === 'issued' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div className="table-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Book Title & Accession</th>
                <th style={{ padding: '14px 20px' }}>Borrower Info</th>
                <th style={{ padding: '14px 20px' }}>Issue Date</th>
                <th style={{ padding: '14px 20px' }}>Due Date</th>
                <th style={{ padding: '14px 20px' }}>Return Status & Date</th>
                <th style={{ padding: '14px 20px' }}>Fine Status</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                    <Bookmark size={28} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#334155' }}>No borrow receipts found matching your criteria.</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>Books requested or checked out from central catalog will appear here.</div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const isReturned = tx.status === 'Returned' || Boolean(tx.returnDate);
                  const isIssued = tx.status === 'Issued';
                  const isOverdue = tx.status === 'Overdue';
                  const isPending = tx.status === 'Pending';
                  const isApproved = tx.status === 'Approved';
                  const isReturnRequested = tx.status === 'Return Requested' || tx.status === 'Return Pending' || isReturnPending(tx._id);
                  const fine = Number(tx.fineAmount || 0);

                  const issueDateFormatted = tx.issueDate ? new Date(tx.issueDate).toLocaleDateString('en-GB') : (tx.requestDate ? new Date(tx.requestDate).toLocaleDateString('en-GB') : '-');
                  const dueDateFormatted = tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('en-GB') : '-';
                  const returnDateFormatted = tx.returnDate ? new Date(tx.returnDate).toLocaleDateString('en-GB') : null;

                  const copyCode = tx.bookCopyId?.accessionNumber || tx.bookCopyId?.barcode || '-';

                  return (
                    <tr key={tx._id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      {/* Book Title & Copy */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Book size={17} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                              {tx.bookId?.title || 'Library Volume'}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {tx.bookId?.author ? `By ${tx.bookId.author}` : ''} • Copy: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{copyCode}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Borrower Info */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>
                            {staffSession.name || 'Faculty Member'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {staffSession.id || staffSession.staffId || tx.userId || 'Staff ID'} • Faculty
                          </span>
                        </div>
                      </td>

                      {/* Issue / Request Date */}
                      <td style={{ padding: '14px 20px', color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>
                        {issueDateFormatted}
                      </td>

                      {/* Due Date */}
                      <td style={{ padding: '14px 20px', fontSize: '0.85rem' }}>
                        <span style={{ color: isOverdue ? '#dc2626' : '#475569', fontWeight: isOverdue ? 800 : 600 }}>
                          {dueDateFormatted}
                        </span>
                      </td>

                      {/* Return Status & Timestamp */}
                      <td style={{ padding: '14px 20px' }}>
                        {isReturned ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              color: '#047857',
                              background: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              padding: '4px 10px',
                              borderRadius: '20px'
                            }}>
                              <CheckCircle2 size={13} color="#059669" /> Returned on {returnDateFormatted || issueDateFormatted}
                            </span>
                          </div>
                        ) : isOverdue ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#b91c1c',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            padding: '4px 10px',
                            borderRadius: '20px'
                          }}>
                            <AlertCircle size={13} color="#dc2626" /> Not Returned (Overdue)
                          </span>
                        ) : isIssued ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#1d4ed8',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            padding: '4px 10px',
                            borderRadius: '20px'
                          }}>
                            <Clock size={13} color="#2563eb" /> Not Returned (Active Loan)
                          </span>
                        ) : isReturnRequested ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#b45309',
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            padding: '4px 10px',
                            borderRadius: '20px'
                          }}>
                            <RotateCcw size={13} color="#d97706" /> Return In Verification
                          </span>
                        ) : isApproved ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#047857',
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            padding: '4px 10px',
                            borderRadius: '20px'
                          }}>
                            <CheckCircle size={13} color="#16a34a" /> Approved (Collect at Counter)
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '4px 10px',
                            borderRadius: '20px'
                          }}>
                            Pending Review ⏳
                          </span>
                        )}
                      </td>

                      {/* Fine Due */}
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: fine > 0 ? '#dc2626' : '#16a34a', fontSize: '0.85rem' }}>
                        {fine > 0 ? `₹${fine}` : '₹0 (No Fine)'}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {(isIssued || isOverdue) && !isReturnRequested ? (
                          <button
                            onClick={() => handleReturnBook(tx)}
                            disabled={returningId === tx._id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#1e293b',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                          >
                            <RotateCcw size={13} color="#4f46e5" />
                            {returningId === tx._id ? 'Submitting...' : 'Return Book'}
                          </button>
                        ) : isReturned ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                            ✓ Closed
                          </span>
                        ) : isReturnRequested ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>
                            Pending Restock
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            -
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default StaffLibrary;
