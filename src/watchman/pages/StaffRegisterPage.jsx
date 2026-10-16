import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  ArrowRightCircle,
  ArrowLeftCircle,
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Car,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getStaffMovements, recordStaffMovement } from '../../api';
import '../watchman.css';

const StaffRegisterPage = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    staffId: '',
    staffName: '',
    department: '',
    designation: '',
    movementType: 'In',
    vehicleNumber: '',
    remarks: ''
  });

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await getStaffMovements({ search, movementType });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setMovements(list);
    } catch (err) {
      console.error('Failed to load staff movements:', err);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, [movementType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMovements();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.staffName.trim() || !formData.staffId.trim()) {
      setError('Staff ID and Staff Name are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await recordStaffMovement(formData);
      setSuccess(`Staff ${formData.movementType === 'In' ? 'Entry' : 'Exit'} logged successfully!`);
      setShowModal(false);
      setFormData({
        staffId: '',
        staffName: '',
        department: '',
        designation: '',
        movementType: 'In',
        vehicleNumber: '',
        remarks: ''
      });
      fetchMovements();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to log staff movement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wm-page">
      <div className="wm-header">
        <div>
          <h1 className="wm-title">Staff Entry & Exit Register</h1>
          <p className="wm-subtitle">Monitor faculty and administrative staff gate arrivals and departures</p>
        </div>
        <div className="wm-header-actions">
          <button className="wm-btn wm-btn-primary" onClick={() => { setError(''); setShowModal(true); }}>
            <PlusCircle size={17} />
            Log Staff Entry / Exit
          </button>
        </div>
      </div>

      {success && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.9rem'
        }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="wm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="wm-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search staff name, employee ID, or vehicle number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="wm-btn wm-btn-secondary">
              Search
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Filter size={16} color="#64748b" />
            <select
              className="wm-select"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="">All Movements</option>
              <option value="In">Campus In</option>
              <option value="Out">Campus Out</option>
            </select>
            <button className="wm-btn wm-btn-secondary" onClick={fetchMovements} title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="wm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="wm-table-container">
          <table className="wm-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Employee Code</th>
                <th>Department & Designation</th>
                <th>Movement</th>
                <th>Vehicle No</th>
                <th>Time & Gate</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading staff movement records...</p>
                  </td>
                </tr>
              ) : (!Array.isArray(movements) || movements.length === 0) ? (
                <tr>
                  <td colSpan="7">
                    <div className="wm-empty">
                      <Briefcase size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div className="wm-empty-title">No staff movement records found</div>
                      <p className="wm-empty-desc">No entries match your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (Array.isArray(movements) ? movements : []).map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.staffName}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {item.staffId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{item.department || 'General'}</div>
                      {item.designation && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.designation}</div>
                      )}
                    </td>
                    <td>
                      {item.movementType === 'In' ? (
                        <span className="wm-badge wm-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ArrowLeftCircle size={13} />
                          Campus Entry (In)
                        </span>
                      ) : (
                        <span className="wm-badge wm-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ArrowRightCircle size={13} />
                          Campus Exit (Out)
                        </span>
                      )}
                    </td>
                    <td>
                      {item.vehicleNumber ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: '0.85rem', color: '#334155' }}>
                          <Car size={14} color="#64748b" />
                          {item.vehicleNumber}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Pedestrian</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(item.timestamp).toLocaleDateString()} • {item.gate}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.remarks || '—'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      {showModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 520 }}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Log Staff Movement</h2>
              <button className="wm-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px 24px' }}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: 8,
                  marginBottom: 16,
                  fontSize: '0.85rem',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center'
                }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Employee Code / ID *</label>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="e.g. EMP-1042"
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Staff Full Name *</label>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="e.g. Dr. Robert Vance"
                    value={formData.staffName}
                    onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Department</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. Mechanical Engg"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Designation</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. Associate Professor"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Movement Type *</label>
                  <select
                    className="wm-select"
                    value={formData.movementType}
                    onChange={(e) => setFormData({ ...formData, movementType: e.target.value })}
                  >
                    <option value="In">Campus In (Arrival)</option>
                    <option value="Out">Campus Out (Departure)</option>
                  </select>
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Vehicle Number (If any)</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. MH-12-AB-1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Remarks (Optional)</label>
                <input
                  type="text"
                  className="wm-input"
                  placeholder="Official duty, lunch break, etc."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn wm-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Logging...' : 'Log Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffRegisterPage;
