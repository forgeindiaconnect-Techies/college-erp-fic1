import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  ArrowRightCircle,
  ArrowLeftCircle,
  Search,
  PlusCircle,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getStudentMovements, recordStudentMovement } from '../../api';
import '../watchman.css';

const StudentRegisterPage = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [movementType, setMovementType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    department: '',
    semester: '',
    movementType: 'Out',
    reason: '',
    gatePassNumber: '',
    remarks: ''
  });

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const res = await getStudentMovements({ search, movementType });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setMovements(list);
    } catch (err) {
      console.error('Failed to load student movements:', err);
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
    if (!formData.studentName.trim() || !formData.studentId.trim()) {
      setError('Student ID and Student Name are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await recordStudentMovement(formData);
      setSuccess(`Student ${formData.movementType === 'Out' ? 'Exit (Out)' : 'Entry (In)'} logged successfully!`);
      setShowModal(false);
      setFormData({
        studentId: '',
        studentName: '',
        department: '',
        semester: '',
        movementType: 'Out',
        reason: '',
        gatePassNumber: '',
        remarks: ''
      });
      fetchMovements();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to log student movement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wm-page">
      <div className="wm-header">
        <div>
          <h1 className="wm-title">Student In / Out Register</h1>
          <p className="wm-subtitle">Track student gate crossings, exit permissions, and campus return timings</p>
        </div>
        <div className="wm-header-actions">
          <button className="wm-btn wm-btn-primary" onClick={() => { setError(''); setShowModal(true); }}>
            <PlusCircle size={17} />
            Log Movement
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
                placeholder="Search by student name, roll number, or gate pass..."
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
              <option value="Out">Outgoing (Out)</option>
              <option value="In">Incoming (In)</option>
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
                <th>Student</th>
                <th>Roll No / ID</th>
                <th>Department</th>
                <th>Movement</th>
                <th>Reason / Pass</th>
                <th>Time & Gate</th>
                <th>Verified By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading student movement logs...</p>
                  </td>
                </tr>
              ) : (!Array.isArray(movements) || movements.length === 0) ? (
                <tr>
                  <td colSpan="7">
                    <div className="wm-empty">
                      <GraduationCap size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div className="wm-empty-title">No movement records found</div>
                      <p className="wm-empty-desc">No student entries or exits match your search criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (Array.isArray(movements) ? movements : []).map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.studentName}</div>
                      {item.semester && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Sem {item.semester}</span>}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                        {item.studentId}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#334155' }}>{item.department || 'General'}</span>
                    </td>
                    <td>
                      {item.movementType === 'Out' ? (
                        <span className="wm-badge wm-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ArrowRightCircle size={13} />
                          Campus Exit (Out)
                        </span>
                      ) : (
                        <span className="wm-badge wm-badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ArrowLeftCircle size={13} />
                          Campus Entry (In)
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#334155' }}>{item.reason || 'Regular Permission'}</div>
                      {item.gatePassNumber && (
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 500 }}>
                          Pass: {item.gatePassNumber}
                        </div>
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
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.recordedBy || 'Watchman'}</span>
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
              <h2 className="wm-modal-title">Log Student Movement</h2>
              <button className="wm-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

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

            <form onSubmit={handleCreate}>
              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Student ID / Roll No *</label>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="e.g. 21CS042"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="e.g. John Doe"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Department</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. Computer Science"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Movement Type *</label>
                  <select
                    className="wm-select"
                    value={formData.movementType}
                    onChange={(e) => setFormData({ ...formData, movementType: e.target.value })}
                  >
                    <option value="Out">Exit Campus (Out)</option>
                    <option value="In">Entry Campus (In)</option>
                  </select>
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Gate Pass No / Reference</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. GP-8849"
                    value={formData.gatePassNumber}
                    onChange={(e) => setFormData({ ...formData, gatePassNumber: e.target.value })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Reason for Movement</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. Medical, Official, Day Scholar Exit"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Remarks (Optional)</label>
                <input
                  type="text"
                  className="wm-input"
                  placeholder="Additional security notes..."
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
                  {submitting ? 'Recording...' : 'Record Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegisterPage;
