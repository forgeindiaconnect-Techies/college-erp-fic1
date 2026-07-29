import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Search, Clock, AlertTriangle, BookOpen, CheckCircle, Calendar, RefreshCw } from 'lucide-react';
import { getLibraryBooks, getMyLibraryTransactions, requestLibraryBook } from '../../api';

const StudentLibrary = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('catalog');
  const [search, setSearch] = useState('');
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [error, setError] = useState('');

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError('');
      const [booksRes, txRes] = await Promise.all([
        getLibraryBooks(),
        getMyLibraryTransactions()
      ]);
      setBooks(booksRes.data || []);
      setTransactions(txRes.data || []);
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

  const handleRequestBook = async (bookId) => {
    try {
      setRequestingId(bookId);
      await requestLibraryBook({ bookId });
      // Refresh data
      await fetchLibraryData();
      alert('Book requested successfully!');
    } catch (err) {
      console.error('Request book error:', err);
      alert(err.response?.data?.message || err.message || 'Error requesting book');
    } finally {
      setRequestingId(null);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title?.toLowerCase().includes(search.toLowerCase()) || 
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Available': return <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Available</span>;
      case 'Out of Stock': return <span className="bg-red-500/10 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/> Out of Stock</span>;
      default: return null;
    }
  };

  const getTxStatusBadge = (status) => {
    switch(status) {
      case 'Issued': return <span className="bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><BookOpen size={12}/> Issued</span>;
      case 'Overdue': return <span className="bg-red-500/10 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/> Overdue</span>;
      case 'Pending': return <span className="bg-orange-500/10 text-orange-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><Clock size={12}/> Pending</span>;
      case 'Returned': return <span className="bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle size={12}/> Returned</span>;
      case 'Rejected': return <span className="bg-red-500/10 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><AlertTriangle size={12}/> Rejected</span>;
      default: return null;
    }
  };

  const isBookRequestedByUser = (bookId) => {
    return transactions.some(tx => tx.bookId?._id === bookId && ['Pending', 'Issued', 'Overdue'].includes(tx.status));
  };

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <BookOpen className="text-teal-500" size={32} /> Central Library
          </h1>
          <p className="text-[var(--text-muted)] mt-2">Search the catalog, request books, and track due dates.</p>
        </div>
        <button 
          onClick={fetchLibraryData}
          className="p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
          title="Refresh"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-4 border-b border-[var(--border-color)] mb-8">
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'catalog' ? 'border-teal-500 text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          onClick={() => setActiveTab('catalog')}
        >
          Library Catalog
        </button>
        <button 
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'issued' ? 'border-teal-500 text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          onClick={() => setActiveTab('issued')}
        >
          My Transactions
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <RefreshCw size={32} className="animate-spin text-teal-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-2">
          <AlertTriangle size={20} />
          <p>{error}</p>
        </div>
      )}

      {!loading && activeTab === 'catalog' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2 max-w-2xl">
            <div className="flex items-center px-3 text-[var(--text-muted)]">
              <Search size={20} />
            </div>
            <input 
              type="text" 
              placeholder="Search by book title, author, or category..." 
              className="bg-transparent border-none outline-none w-full text-[var(--text-main)] p-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                  <th className="p-4 font-semibold">Book Title</th>
                  <th className="p-4 font-semibold">Author</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Availability</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors">
                    <td className="p-4 font-medium text-[var(--text-main)]">
                      <div className="flex items-center gap-3">
                        <BookOpen size={16} className="text-teal-500" /> {book.title}
                      </div>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">{book.author}</td>
                    <td className="p-4 text-[var(--text-muted)]">{book.category}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${book.availableCopies > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                        {book.availableCopies > 0 ? `${book.availableCopies} Available` : 'Out of Stock'}
                      </span>
                    </td>
                    <td className="p-4">
                      {isBookRequestedByUser(book._id) ? (
                        <button disabled className="btn-secondary text-xs opacity-50 cursor-not-allowed">
                          Requested
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleRequestBook(book._id)}
                          disabled={book.availableCopies === 0 || requestingId === book._id}
                          className={`btn-primary text-xs flex items-center gap-2 ${book.availableCopies === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {requestingId === book._id ? <RefreshCw size={14} className="animate-spin" /> : 'Request'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBooks.length === 0 && (
              <div className="col-span-full py-12 text-center text-[var(--text-muted)]">
                No books found matching your search.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && activeTab === 'issued' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                  <th className="p-4 font-semibold">Book Title</th>
                  <th className="p-4 font-semibold">Request Date</th>
                  <th className="p-4 font-semibold">Due Date</th>
                  <th className="p-4 font-semibold">Fine Amount</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors">
                    <td className="p-4 font-medium text-[var(--text-main)]">
                      <div className="flex items-center gap-3">
                        <BookOpen size={16} className="text-teal-500" /> {tx.bookId?.title || 'Unknown Book'}
                      </div>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} /> {new Date(tx.requestDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-[var(--text-muted)]">
                      {tx.dueDate ? new Date(tx.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4 font-semibold text-red-500">
                      {tx.fineAmount > 0 ? `₹${tx.fineAmount}` : '₹0'}
                    </td>
                    <td className="p-4">
                      {getTxStatusBadge(tx.status)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">You have no book transactions.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLibrary;
