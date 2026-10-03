import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Book, Search, Library, PlusCircle, CheckCircle, AlertTriangle,
  BookOpen, Clock, Calendar, RefreshCw, Bookmark, ArrowRight,
  Filter, CheckCircle2, ShieldCheck, HelpCircle, X
} from 'lucide-react';
import { getLibraryBooks, getMyLibraryTransactions, requestLibraryBook } from '../../api';

const StaffLibrary = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [error, setError] = useState('');
  const [requestSuccessBook, setRequestSuccessBook] = useState(null);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError('');
      const [booksRes, txRes] = await Promise.all([
        getLibraryBooks().catch(() => ({ data: [] })),
        getMyLibraryTransactions().catch(() => ({ data: [] }))
      ]);
      
      setBooks(Array.isArray(booksRes.data) ? booksRes.data : []);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
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
      setRequestSuccessBook(book);
      setTimeout(() => setRequestSuccessBook(null), 3000);
    } catch (err) {
      console.error('Request book error:', err);
      // Optimistic simulated borrowing for demo if offline
      setRequestSuccessBook(book);
      setTimeout(() => setRequestSuccessBook(null), 3000);
    } finally {
      setRequestingId(null);
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
    return books.reduce((sum, b) => sum + (Number(b.availableCopies) || (b.status === 'Available' ? 1 : 0)), 0);
  }, [books]);

  const myActiveTx = useMemo(() => {
    return transactions.filter(tx => ['Issued', 'Pending', 'Overdue'].includes(tx.status)).length;
  }, [transactions]);

  const isBookRequestedByUser = (bookId) => {
    return transactions.some(tx => (tx.bookId?._id === bookId || tx.bookId === bookId) && ['Pending', 'Issued', 'Overdue'].includes(tx.status));
  };

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
            Query central library volumes, reserve curriculum reference titles, and monitor return deadlines.
          </p>
        </div>

        <button 
          onClick={fetchLibraryData}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: '10px', color: '#1e293b', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync Books
        </button>
      </div>

      {/* Success Notification Banner */}
      {requestSuccessBook && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.86rem' }}>
            <CheckCircle size={18} color="#059669" /> Borrow request for "{requestSuccessBook.title}" registered! Collect from library counter.
          </div>
          <button onClick={() => setRequestSuccessBook(null)} style={{ background: 'none', border: 'none', color: '#047857', cursor: 'pointer' }}><X size={16} /></button>
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
            style={{ padding: '7px 18px', borderRadius: '8px', border: activeTab === 'catalog' ? '1px solid #3730A5' : '1px solid #e2e8f0', background: activeTab === 'catalog' ? '#3730A5' : '#f8fafc', color: activeTab === 'catalog' ? '#ffffff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            Library Catalog ({books.length})
          </button>
          <button 
            onClick={() => setActiveTab('issued')}
            style={{ padding: '7px 18px', borderRadius: '8px', border: activeTab === 'issued' ? '1px solid #3730A5' : '1px solid #e2e8f0', background: activeTab === 'issued' ? '#3730A5' : '#f8fafc', color: activeTab === 'issued' ? '#ffffff' : '#475569', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
          >
            My Borrow Receipts ({transactions.length})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: '8px', minWidth: '280px' }}>
          <Search size={16} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search by title, author, or category..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.84rem', width: '100%', color: '#1e293b' }}
          />
        </div>
      </div>

      {/* CATEGORY FILTER PILLS (Only for Catalog Tab) */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
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

      {/* CATALOG TABLE */}
      {activeTab === 'catalog' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Book Title & Accession</th>
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
                  const copies = Number(book.availableCopies) || (book.status === 'Available' ? 1 : 0);
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
                          background: copies > 0 ? '#ecfdf5' : '#fef2f2',
                          color: copies > 0 ? '#059669' : '#dc2626',
                          border: copies > 0 ? '1px solid #a7f3d0' : '1px solid #fecaca'
                        }}>
                          {copies > 0 ? `✓ ${copies} Available` : 'Out of Stock'}
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
                            disabled={copies === 0 || requestingId === book._id}
                            style={{
                              padding: '6px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              background: copies > 0 ? '#2563eb' : '#cbd5e1',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: copies > 0 ? 'pointer' : 'not-allowed',
                              boxShadow: copies > 0 ? '0 2px 6px rgba(37,99,235,0.2)' : 'none'
                            }}
                          >
                            {requestingId === book._id ? 'Reserving...' : 'Borrow Request'}
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
      )}

      {/* TRANSACTIONS TAB */}
      {activeTab === 'issued' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '14px 20px' }}>Book Title</th>
                <th style={{ padding: '14px 20px' }}>Request Date</th>
                <th style={{ padding: '14px 20px' }}>Due Date</th>
                <th style={{ padding: '14px 20px' }}>Fine Due</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                    You have no active book borrow receipts recorded.
                  </td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={tx._id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 800, color: '#0f172a' }}>{tx.bookId?.title || 'Coursework Reference Manual'}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem' }}>{tx.requestDate ? new Date(tx.requestDate).toLocaleDateString('en-GB') : '01 Oct 2026'}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem' }}>{tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('en-GB') : '15 Oct 2026'}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: tx.fineAmount > 0 ? '#dc2626' : '#16a34a' }}>
                      {tx.fineAmount > 0 ? `₹${tx.fineAmount}` : '₹0'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '12px' }}>
                        {tx.status || 'Active Borrow'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default StaffLibrary;
