import React, { useState, useEffect } from 'react';
import {
  BookOpen, Search, Filter, BookDown, CheckCircle, 
  AlertCircle, X, Eye, FileText, Download, QrCode, 
  Library, Clock, ArrowRightLeft, Bell, TrendingUp
} from 'lucide-react';
import { getLibraryBooks, getAllLibraryTransactions, returnLibraryBook, issueLibraryBook, manualIssueLibraryBook, rejectLibraryRequest, getStudents } from '../../api/index';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';
import CustomSelect from '../../components/CustomSelect';
import './LibraryManagement.css';

// MOCK Data for static tabs
const MOCK_DIGITAL = [
  { id: 'D001', title: 'Data Structures Lecture Notes', author: 'Prof. Davis', type: 'PDF', size: '2.4 MB', downloads: 342 },
  { id: 'D002', title: 'Thermodynamics Formula Sheet', author: 'Prof. Wilson', type: 'PDF', size: '1.1 MB', downloads: 156 },
  { id: 'D003', title: 'Basic Electronics Lab Manual', author: 'Dept. of ECE', type: 'PDF', size: '5.6 MB', downloads: 890 },
];

const MOCK_RESERVATIONS = [
  { resId: 'RES-001', studentName: 'John Doe', regNo: 'CS2021001', bookTitle: 'The C Programming Language', reqDate: '2024-03-20', status: 'Pending' },
  { resId: 'RES-002', studentName: 'Emily Davis', regNo: 'CS2021004', bookTitle: 'Introduction to Algorithms', reqDate: '2024-03-21', status: 'Approved' },
  { resId: 'RES-003', studentName: 'Robert Johnson', regNo: 'ME2023001', bookTitle: 'Engineering Mechanics', reqDate: '2024-03-19', status: 'Pending' }
];

const MOCK_CHART_DATA = [
  { month: 'Aug', issued: 420 }, { month: 'Sep', issued: 380 },
  { month: 'Oct', issued: 590 }, { month: 'Nov', issued: 610 },
  { month: 'Dec', issued: 280 }, { month: 'Jan', issued: 450 },
];

const CATEGORIES = ['All Categories', 'Computer Science', 'Mechanical', 'Electrical', 'Civil', 'Mathematics', 'Software Engg'];

const LibraryManagement = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedBookToIssue, setSelectedBookToIssue] = useState(null);
  const [issueFormData, setIssueFormData] = useState({ studentName: '', regNo: '', dueDate: '' });
  const [books, setBooks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const categoryOptions = CATEGORIES.map(c => ({ value: c, label: c }));

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      const [booksRes, txRes, studentsRes] = await Promise.all([
        getLibraryBooks(),
        getAllLibraryTransactions(),
        getStudents()
      ]);
      setBooks(booksRes.data);
      setIssues(txRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (error) {
      console.error('Failed to load library data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (issueId, studentName) => {
    try {
      await returnLibraryBook(issueId, { condition: 'Good' });
      alert(`Successfully approved return for ${studentName}!`);
      fetchLibraryData(); // Refresh data
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to return book');
    }
  };

  const handleOpenIssueModal = (book) => {
    setSelectedBookToIssue(book);
    setIssueFormData({ bookId: book ? book._id : '', studentName: '', regNo: '', dueDate: '' });
    setShowIssueModal(true);
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    try {
      await manualIssueLibraryBook({
        bookId: issueFormData.bookId || selectedBookToIssue?._id,
        userId: issueFormData.regNo,
        userType: 'Student', // hardcode or add to form if needed
        dueDate: issueFormData.dueDate
      });
      alert('Successfully issued book directly!');
      setShowIssueModal(false);
      fetchLibraryData();
      setActiveTab('Issue & Return');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue book');
    }
  };

  const handleIssueRequest = async (transactionId) => {
    try {
      await issueLibraryBook(transactionId);
      alert('Successfully issued book!');
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to issue book');
    }
  };

  const handleRejectRequest = async (transactionId) => {
    try {
      await rejectLibraryRequest(transactionId);
      alert('Request rejected.');
      fetchLibraryData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  };

  const TABS = ['Dashboard', 'Books Catalog', 'Issue & Return', 'Reservations', 'Digital Library', 'Reports'];

  const filteredBooks = books.filter(b => 
    (b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())) &&
    (categoryFilter === 'All Categories' || b.category === categoryFilter)
  );

  const totalBooks = books.reduce((acc, curr) => acc + curr.copies, 0);
  const totalAvailable = books.reduce((acc, curr) => acc + curr.available, 0);
  const totalIssued = issues.filter(i => i.status !== 'Returned').length;
  const totalOverdue = issues.filter(i => i.status === 'Overdue').length;

  // Real-time Analytics Calculations
  const totalFineCollected = issues.filter(i => i.status === 'Returned' && i.fineAmount).reduce((acc, curr) => acc + curr.fineAmount, 0);
  
  const deptCounts = {};
  issues.forEach(issue => {
    if (issue.bookId?.department) {
      deptCounts[issue.bookId.department] = (deptCounts[issue.bookId.department] || 0) + 1;
    }
  });
  let mostActiveDept = 'N/A';
  let maxCount = 0;
  Object.keys(deptCounts).forEach(dept => {
    if (deptCounts[dept] > maxCount) {
      maxCount = deptCounts[dept];
      mostActiveDept = dept;
    }
  });

  const returnedTransactions = issues.filter(i => i.status === 'Returned').sort((a,b) => new Date(b.returnDate || b.updatedAt) - new Date(a.returnDate || a.updatedAt));

  if (loading) return <div className="p-8 text-center text-muted">Loading Library Database...</div>;

  return (
    <div className="library-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Advanced Library Management 📚</h1>
          <p className="text-muted">Manage books, issues, digital resources, and auto-calculate fines.</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary shadow-glow" onClick={() => alert('Opening barcode scanner...')}>
            <QrCode size={16}/> Scan Barcode
          </button>
        </div>
      </div>

      <div className="lib-tabs-container">
        {TABS.map(tab => (
          <button key={tab} className={`lib-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'Dashboard' && <Library size={16} />}
            {tab === 'Books Catalog' && <BookOpen size={16} />}
            {tab === 'Issue & Return' && <ArrowRightLeft size={16} />}
            {tab === 'Reservations' && <Clock size={16} />}
            {tab === 'Digital Library' && <FileText size={16} />}
            {tab === 'Reports' && <BarChart size={16} />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div className="lib-tab-content animate-fade-in">
          <div className="lib-kpi-grid">
            <div className="glass-card p-5 relative overflow-hidden">
              <BookOpen size={24} className="text-blue-500 mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Total Books</h3>
              <p className="text-2xl font-bold mt-1">{totalBooks}</p>
            </div>
            <div className="glass-card p-5 relative overflow-hidden">
              <ArrowRightLeft size={24} className="text-purple-500 mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Currently Issued</h3>
              <p className="text-2xl font-bold mt-1">{totalIssued}</p>
            </div>
            <div className="glass-card p-5 relative overflow-hidden">
              <CheckCircle size={24} className="text-success mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Available</h3>
              <p className="text-2xl font-bold mt-1">{totalAvailable}</p>
            </div>
            <div className="glass-card p-5 relative overflow-hidden">
              <AlertCircle size={24} className="text-danger mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Overdue Books</h3>
              <p className="text-2xl font-bold text-danger mt-1">{totalOverdue}</p>
            </div>
          </div>

          <div className="lib-charts-row mt-4">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp size={18}/> Monthly Issue Trends</h3>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={MOCK_CHART_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)"/>
                    <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false}/>
                    <YAxis stroke="var(--text-muted)" tickLine={false}/>
                    <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'none', borderRadius:'8px', color:'var(--text-main)'}}/>
                    <Line type="monotone" dataKey="issued" stroke="#3730A5" strokeWidth={3} dot={{r: 4, fill: '#3730A5'}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
              <BookDown size={48} className="text-primary mb-4 opacity-50"/>
              <h3 className="text-lg font-bold mb-2">Most Borrowed Book</h3>
              <p className="text-xl text-primary font-bold">Introduction to Algorithms</p>
              <p className="text-muted mt-2">Issued 145 times this semester</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Books Catalog' && (
        <div className="lib-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-4">
              <div className="search-box">
                <Search size={16} className="text-muted"/>
                <input type="text" placeholder="Search by title, author, or ISBN..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <div style={{ width: '220px' }}>
                <CustomSelect 
                  options={categoryOptions}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  icon={Filter}
                />
              </div>
            </div>
            <button className="btn-primary shadow-glow" onClick={() => setShowAddModal(true)}>+ Add Book</button>
          </div>

          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Book Info</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th>Availability</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-lg text-primary">
                            <BookOpen size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[var(--text-main)]">{b.title}</span>
                            <span className="text-xs text-[var(--text-muted)]">{b.author}</span>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-sm text-[var(--text-muted)]">{b.id || 'N/A'}</td>
                      <td className="text-sm font-medium text-[var(--text-muted)]">{b.category}</td>
                      <td>
                        <span className={`status-badge ${b.availableCopies > 0 ? 'status-available' : 'status-issued'}`}>
                          {b.availableCopies > 0 ? `${b.availableCopies} Available` : 'Out of Stock'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn-primary text-xs py-1.5 px-3" disabled={b.availableCopies === 0} onClick={()=>handleOpenIssueModal(b)}>Issue</button>
                          <button className="btn-secondary text-xs py-1.5 px-3">Edit</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBooks.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center p-8 text-[var(--text-muted)]">No books found in catalog.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {showAddModal && (
            <div className="modal-overlay" onClick={()=>setShowAddModal(false)}>
              <div className="modal-card" onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Add New Book</h2>
                  <button className="modal-close-btn" onClick={()=>setShowAddModal(false)}><X size={20}/></button>
                </div>
                <div className="modal-form space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1"><label className="text-sm font-bold text-muted">Title</label><input type="text" className="p-2 rounded border bg-transparent"/></div>
                    <div className="flex flex-col gap-1"><label className="text-sm font-bold text-muted">Author</label><input type="text" className="p-2 rounded border bg-transparent"/></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1"><label className="text-sm font-bold text-muted">ISBN</label><input type="text" className="p-2 rounded border bg-transparent"/></div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-muted">Category</label>
                      <select className="p-2 rounded border bg-transparent">
                        {CATEGORIES.slice(1).map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1"><label className="text-sm font-bold text-muted">Total Copies</label><input type="number" className="p-2 rounded border bg-transparent"/></div>
                    <div className="flex flex-col gap-1"><label className="text-sm font-bold text-muted">Shelf Location</label><input type="text" className="p-2 rounded border bg-transparent"/></div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={()=>setShowAddModal(false)}>Cancel</button>
                  <button className="btn-primary shadow-glow" onClick={()=>{alert('Book Added!');setShowAddModal(false)}}>Save Book</button>
                </div>
              </div>
            </div>
          )}

          {showIssueModal && selectedBookToIssue && (
            <div className="modal-overlay" onClick={()=>setShowIssueModal(false)}>
              <div className="modal-card" onClick={e=>e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Issue Book Form</h2>
                  <button className="modal-close-btn" onClick={()=>setShowIssueModal(false)}><X size={20}/></button>
                </div>
                <form className="modal-form space-y-4" onSubmit={handleIssueSubmit}>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-muted">Select Book</label>
                    <select 
                      required 
                      className="p-2 rounded border bg-transparent" 
                      value={issueFormData.bookId || (selectedBookToIssue ? selectedBookToIssue._id : '')} 
                      onChange={e => setIssueFormData({ ...issueFormData, bookId: e.target.value })}
                    >
                      <option value="">-- Choose a Book --</option>
                      {books.filter(b => b.availableCopies > 0).map(b => (
                        <option key={b._id} value={b._id}>
                          {b.title} (Available: {b.availableCopies})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-muted">Select Student</label>
                      <select 
                        required 
                        className="p-2 rounded border bg-transparent" 
                        value={issueFormData.regNo} 
                        onChange={e => {
                          const selected = students.find(s => s.id === e.target.value || s.referenceId === e.target.value || s._id === e.target.value);
                          setIssueFormData({
                            ...issueFormData, 
                            regNo: e.target.value,
                            studentName: selected ? selected.name : ''
                          });
                        }}
                      >
                        <option value="">-- Choose a Student --</option>
                        {students.map(s => {
                          const idToUse = s.id || s.referenceId || s.studentId || s._id;
                          return (
                            <option key={s._id} value={idToUse}>
                              {s.name} ({idToUse}) - {s.dept || s.department || 'No Dept'}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-muted">Register Number</label>
                      <input type="text" className="p-2 rounded border bg-[var(--bg-main)] text-[var(--text-muted)]" value={issueFormData.regNo} readOnly placeholder="Auto-filled"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-muted">Issue Date</label>
                      <input type="date" className="p-2 rounded border bg-[var(--bg-main)] text-[var(--text-muted)]" value={new Date().toISOString().split('T')[0]} readOnly />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-bold text-muted">Return Date</label>
                      <input type="date" required className="p-2 rounded border bg-transparent text-[var(--text-main)]" value={issueFormData.dueDate} onChange={e=>setIssueFormData({...issueFormData, dueDate: e.target.value})} />
                    </div>
                  </div>
                </form>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={()=>setShowIssueModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary shadow-glow flex items-center gap-2" onClick={handleIssueSubmit}><CheckCircle size={16}/> Confirm Issue</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Issue & Return' && (
        <div className="lib-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2>Live Circulation Desk</h2>
            <div className="search-box" style={{maxWidth: '300px'}}>
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search Issue ID or Student..." />
            </div>
          </div>
          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Book Title</th>
                    <th>Student Info</th>
                    <th>Issue Date</th>
                    <th>Due Date</th>
                    <th>Status / Fine</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.filter(i => ['Issued', 'Overdue', 'Returned'].includes(i.status)).map(issue => (
                    <tr key={issue._id} className={issue.status === 'Overdue' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                      <td className="font-mono text-sm">{issue._id.substring(issue._id.length - 6)}</td>
                      <td className="font-medium">{issue.bookId?.title}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === issue.userId || s.referenceId === issue.userId)?.name || issue.userId}
                          </span>
                          <span className="text-xs text-muted">{issue.userId} • {issue.userType}</span>
                        </div>
                      </td>
                      <td>{issue.issueDate ? new Date(issue.issueDate).toLocaleDateString() : '-'}</td>
                      <td className={issue.status === 'Overdue' ? 'text-danger font-bold' : ''}>{issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '-'}</td>
                      <td>
                        {issue.status === 'Overdue' ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-danger font-bold text-xs uppercase px-2 py-1 bg-red-100 rounded inline-block w-max">Overdue</span>
                            <span className="text-sm font-semibold">Fine: ₹{issue.fineAmount}</span>
                          </div>
                        ) : issue.status === 'Returned' ? (
                          <span className="text-gray-500 font-bold text-xs uppercase px-2 py-1 bg-gray-100 rounded inline-block w-max">Returned</span>
                        ) : (
                          <span className="text-success font-bold text-xs uppercase px-2 py-1 bg-green-100 rounded inline-block w-max">Issued</span>
                        )}
                      </td>
                      <td>
                        {issue.status !== 'Returned' ? (
                          <button className="btn-primary text-xs py-1 px-3" onClick={() => handleReturn(issue._id, issue.userId)}>
                            Approve Return
                          </button>
                        ) : (
                          <span className="text-xs text-muted font-bold">Clear</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Digital Library' && (
        <div className="lib-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2>E-Books & Lecture Notes</h2>
              <p className="text-sm text-muted">Upload and manage digital resources for students.</p>
            </div>
            <button className="btn-primary">+ Upload PDF</button>
          </div>
          <div className="digital-grid">
            {MOCK_DIGITAL.map(d => (
              <div key={d.id} className="glass-card digital-card">
                <div className="pdf-icon-wrapper">
                  <FileText size={30}/>
                </div>
                <div>
                  <h3 className="digital-title">{d.title}</h3>
                  <p className="text-xs text-muted mt-1">{d.author}</p>
                </div>
                <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between items-center text-xs text-muted">
                  <span>{d.size}</span>
                  <span>{d.downloads} Downloads</span>
                </div>
                <button className="w-full btn-secondary text-sm mt-2"><Download size={14} className="inline mr-2"/> Download</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Reservations' && (
        <div className="lib-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2>Book Reservations</h2>
            <div className="search-box" style={{maxWidth: '300px'}}>
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search Request ID or Student..." />
            </div>
          </div>
          <div className="table-wrapper">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Student Info</th>
                    <th>Book Requested</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.filter(i => i.status === 'Pending').map(res => (
                    <tr key={res._id}>
                      <td className="font-mono text-sm">{res._id.substring(res._id.length - 6)}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === res.userId || s.referenceId === res.userId)?.name || res.userId}
                          </span>
                          <span className="text-xs text-muted">{res.userId} • {res.userType}</span>
                        </div>
                      </td>
                      <td className="font-medium">{res.bookId?.title}</td>
                      <td>{new Date(res.requestDate).toLocaleDateString()}</td>
                      <td>
                        {res.status === 'Pending' ? (
                          <span className="text-warning font-bold text-xs uppercase px-2 py-1 bg-yellow-100 rounded inline-block w-max">Pending</span>
                        ) : (
                          <span className="text-success font-bold text-xs uppercase px-2 py-1 bg-green-100 rounded inline-block w-max">Approved</span>
                        )}
                      </td>
                      <td>
                        {res.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button className="btn-primary text-xs py-1 px-3" onClick={() => handleIssueRequest(res._id)}>Approve</button>
                            <button className="btn-secondary text-xs py-1 px-3 text-danger" onClick={() => handleRejectRequest(res._id)}>Deny</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {issues.filter(i => i.status === 'Pending').length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-muted">No pending book requests</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Reports' && (
        <div className="lib-tab-content animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2>Library Analytics & Reports</h2>
              <p className="text-sm text-muted">Generate full library circulation history.</p>
            </div>
            <button className="btn-primary flex items-center gap-2"><Download size={16}/> Export Excel</button>
                   <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="glass-card p-5">
              <h3 className="text-sm text-muted uppercase font-bold mb-1">Total Fine Collected</h3>
              <p className="text-2xl font-bold text-success">₹{totalFineCollected.toLocaleString()}</p>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm text-muted uppercase font-bold mb-1">Most Active Dept</h3>
              <p className="text-2xl font-bold text-primary">{mostActiveDept}</p>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm text-muted uppercase font-bold mb-1">Books Lost/Damaged</h3>
              <p className="text-2xl font-bold text-danger">0</p>
            </div>
          </div>

          <div className="table-wrapper">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
              <h3 className="font-bold">Recent Completed Returns</h3>
              <div className="flex gap-2">
                <select className="p-1 rounded border bg-white dark:bg-gray-800 text-sm">
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                  <option>This Semester</option>
                </select>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Issue ID</th>
                    <th>Book Title</th>
                    <th>Borrower Info</th>
                    <th>Returned On</th>
                    <th>Condition</th>
                    <th>Fine Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {returnedTransactions.map(rt => (
                    <tr key={rt._id}>
                      <td className="font-mono text-sm">{rt._id.substring(rt._id.length - 6)}</td>
                      <td className="font-medium">{rt.bookId?.title}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 dark:text-white">
                            {students.find(s => s.id === rt.userId || s.referenceId === rt.userId)?.name || rt.userId}
                          </span>
                          <span className="text-xs text-muted">{rt.userId} • {rt.userType}</span>
                        </div>
                      </td>
                      <td>{new Date(rt.returnDate || rt.updatedAt).toLocaleDateString()}</td>
                      <td><span className="text-success text-xs font-bold uppercase">Good</span></td>
                      <td>₹{rt.fineAmount || 0}</td>
                    </tr>
                  ))}
                  {returnedTransactions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-muted">No completed returns yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryManagement;
