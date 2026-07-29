import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import { getAccountsOfficers, createAccountsOfficer, deleteAccountsOfficer } from '../../api/index';

const AccountsOfficerManagement = () => {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const res = await getAccountsOfficers();
      if (res?.data) {
        setOfficers(res.data);
      }
    } catch (err) {
      console.error('Failed to load accounts officers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        role: 'accounts'
      };
      await createAccountsOfficer(payload);
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      fetchOfficers();
    } catch (err) {
      alert('Failed to create Accounts Officer: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this Accounts Officer?')) {
      try {
        await deleteAccountsOfficer(id);
        fetchOfficers();
      } catch (err) {
        alert('Failed to delete: ' + err.message);
      }
    }
  };

  const filtered = officers.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    o.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="title-block">
          <h1>Accounts Management</h1>
          <p className="text-muted">Manage Accounts Officers for your institution.</p>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '12px' }}>
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search officers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', width: '200px' }}
            />
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Add Accounts Officer
          </button>
        </div>
      </div>

      <div className="table-card glass-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-4">No Accounts Officers found</td></tr>
            ) : (
              filtered.map((officer) => (
                <tr key={officer._id || officer.id}>
                  <td>
                    <div className="user-cell" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', textTransform: 'uppercase', flexShrink: 0, fontSize: '16px' }}>
                        {officer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{officer.name}</div>
                        <div className="text-xs text-muted">Joined {new Date(officer.createdAt || Date.now()).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td>{officer.email}</td>
                  <td>{officer.phone || 'N/A'}</td>
                  <td><span className="status-badge active">Accounts Officer</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon danger" onClick={() => handleDelete(officer._id || officer.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Accounts Officer</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><XCircle size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Accounts Officer"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g. accounts@college.edu"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter temporary password"
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Officer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsOfficerManagement;
