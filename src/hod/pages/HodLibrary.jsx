import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Search, Library, TrendingUp, Users, BookOpen, Clock, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getLibraryBooks, getAllLibraryTransactions, issueLibraryBook, rejectLibraryRequest, getStudents } from '../../api';

const TREND_DATA = [
  { month: 'Jan', borrows: 120 },
  { month: 'Feb', borrows: 150 },
  { month: 'Mar', borrows: 180 },
  { month: 'Apr', borrows: 210 },
  { month: 'May', borrows: 190 },
  { month: 'Jun', borrows: 240 }
];

const HodLibrary = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Department Catalog');
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      const [booksRes, txRes, stdRes] = await Promise.all([
        getLibraryBooks(),
        getAllLibraryTransactions(),
        getStudents()
      ]);
      setBooks(booksRes.data || []);
      setTransactions(txRes.data || []);
      setStudents(stdRes.data || []);
    } catch (err) {
      console.error('Failed to load library data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueRequest = async (id) => {
    try {
      await issueLibraryBook(id);
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await rejectLibraryRequest(id);
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title?.toLowerCase().includes(search.toLowerCase()) || 
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
            <Library className="text-indigo-500" size={32} /> Department Library
          </h1>
          <p className="text-[var(--text-muted)] mt-2">Monitor department library usage, view popular books, and manage catalog.</p>
        </div>
      </div>

      <div className="hod-stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="hod-stat-icon" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>
            <Book size={20} />
          </div>
          <div className="hod-stat-details">
            <p className="hod-stat-label">Total Books</p>
            <p className="hod-stat-value">1,245</p>
            <p className="hod-stat-sub text-muted">Library inventory</p>
          </div>
        </div>
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="hod-stat-icon" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>
            <BookOpen size={20} />
          </div>
          <div className="hod-stat-details">
            <p className="hod-stat-label">Currently Issued</p>
            <p className="hod-stat-value">342</p>
            <p className="hod-stat-sub text-muted">Books with students</p>
          </div>
        </div>
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="hod-stat-icon" style={{ background: '#FAEEDA', color: 'var(--warning)' }}>
            <Clock size={20} />
          </div>
          <div className="hod-stat-details">
            <p className="hod-stat-label">Overdue Returns</p>
            <p className="hod-stat-value" style={{ color: '#f59e0b' }}>28</p>
            <p className="hod-stat-sub text-muted">Requires action</p>
          </div>
        </div>
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="hod-stat-icon" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>
            <Users size={20} />
          </div>
          <div className="hod-stat-details">
            <p className="hod-stat-label">Active Readers</p>
            <p className="hod-stat-value">890</p>
            <p className="hod-stat-sub text-muted">Unique borrowers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500"/> Borrowing Trend (6 Months)
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={TREND_DATA}>
                <defs>
                  <linearGradient id="colorBorrows" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="borrows" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorBorrows)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Top Books Issued</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-lg">
              <div>
                <p className="font-semibold text-sm">Clean Code</p>
                <p className="text-xs text-[var(--text-muted)]">Rob Martin</p>
              </div>
              <span className="text-xs font-bold bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded">45 Borrows</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-lg">
              <div>
                <p className="font-semibold text-sm">Design Patterns</p>
                <p className="text-xs text-[var(--text-muted)]">Erich Gamma</p>
              </div>
              <span className="text-xs font-bold bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded">38 Borrows</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-lg">
              <div>
                <p className="font-semibold text-sm">Intro to Algorithms</p>
                <p className="text-xs text-[var(--text-muted)]">Thomas H.</p>
              </div>
              <span className="text-xs font-bold bg-indigo-500/10 text-indigo-600 px-2 py-1 rounded">32 Borrows</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-[var(--border-color)] mb-6 gap-6">
        {['Department Catalog', 'Live Circulation', 'Reservations'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold transition-colors border-b-2 ${activeTab === tab ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            {tab}
            {tab === 'Reservations' && transactions.filter(t => t.status === 'Pending').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {transactions.filter(t => t.status === 'Pending').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'Department Catalog' && (
          <div className="animate-fade-in">
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-4">Department Catalog</h3>
            <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2 max-w-2xl mb-4">
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
                    <th className="p-4 font-semibold">Total Copies</th>
                    <th className="p-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">Loading books...</td>
                    </tr>
                  ) : (
                    filteredBooks.map((book) => (
                      <tr key={book._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors">
                        <td className="p-4 font-medium text-[var(--text-main)] flex items-center gap-3">
                          <BookOpen size={16} className="text-indigo-500" /> {book.title}
                        </td>
                        <td className="p-4 text-[var(--text-muted)]">{book.author}</td>
                        <td className="p-4 text-[var(--text-muted)]">{book.category}</td>
                        <td className="p-4 font-semibold">{book.totalCopies}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${book.availableCopies > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            {book.availableCopies > 0 ? 'Available' : 'Issued'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">No books match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Live Circulation' && (
          <div className="animate-fade-in">
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-4">Live Circulation</h3>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                    <th className="p-4 font-semibold">Issue ID</th>
                    <th className="p-4 font-semibold">Book Title</th>
                    <th className="p-4 font-semibold">Borrower Info</th>
                    <th className="p-4 font-semibold">Issue Date</th>
                    <th className="p-4 font-semibold">Due Date</th>
                    <th className="p-4 font-semibold">Status / Fine</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => ['Issued', 'Overdue', 'Returned'].includes(t.status)).map(issue => (
                    <tr key={issue._id} className={`border-b border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors ${issue.status === 'Overdue' ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="p-4 font-mono text-sm">{issue._id.substring(issue._id.length - 6)}</td>
                      <td className="p-4 font-medium">{issue.bookId?.title}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === issue.userId || s.referenceId === issue.userId)?.name || issue.userId}
                          </span>
                          <span className="text-xs text-muted">{issue.userId} • {issue.userType}</span>
                        </div>
                      </td>
                      <td className="p-4">{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '-'}</td>
                      <td className={`p-4 ${issue.status === 'Overdue' ? 'text-red-500 font-bold' : ''}`}>
                        {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-4">
                        {issue.status === 'Overdue' ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-red-600 font-bold text-xs uppercase px-2 py-1 bg-red-100 rounded inline-block w-max">Overdue</span>
                            <span className="text-sm font-semibold">Fine: ₹{issue.fineAmount}</span>
                          </div>
                        ) : (
                          <span className={`px-2 py-1 text-xs font-bold rounded uppercase inline-block w-max ${issue.status === 'Returned' ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            {issue.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {transactions.filter(t => ['Issued', 'Overdue', 'Returned'].includes(t.status)).length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-[var(--text-muted)]">No active circulation records</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'Reservations' && (
          <div className="animate-fade-in">
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-4">Pending Reservations</h3>
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)] text-[var(--text-muted)] text-sm">
                    <th className="p-4 font-semibold">Req ID</th>
                    <th className="p-4 font-semibold">Borrower Info</th>
                    <th className="p-4 font-semibold">Book Requested</th>
                    <th className="p-4 font-semibold">Request Date</th>
                    <th className="p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(t => t.status === 'Pending').map(res => (
                    <tr key={res._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)] transition-colors">
                      <td className="p-4 font-mono text-sm">{res._id.substring(res._id.length - 6)}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === res.userId || s.referenceId === res.userId)?.name || res.userId}
                          </span>
                          <span className="text-xs text-muted">{res.userId} • {res.userType}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{res.bookId?.title}</td>
                      <td className="p-4">{new Date(res.requestDate).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button 
                            className="btn-primary text-xs py-1 px-3" 
                            onClick={() => handleIssueRequest(res._id)}
                          >
                            Approve
                          </button>
                          <button 
                            className="btn-secondary text-xs py-1 px-3 text-danger" 
                            onClick={() => handleRejectRequest(res._id)}
                          >
                            Deny
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.filter(t => t.status === 'Pending').length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-[var(--text-muted)]">No pending book requests</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HodLibrary;
