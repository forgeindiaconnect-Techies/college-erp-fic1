import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck, Search, CheckCircle2, Clock, MapPin,
  AlertTriangle, XCircle, RefreshCw, UserCheck, Phone, X
} from 'lucide-react';
import { getPreRegisteredVisitors, admitPreRegisteredVisitor } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const PreRegisteredVisitorsPage = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [admitForm, setAdmitForm] = useState({ vehicleNumber: '', gate: 'Gate 1 (Main Entrance)', idProofNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchPreRegistered = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPreRegisteredVisitors();
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setVisitors(list);
    } catch (err) {
      console.error('Failed to load pre-registered visitors:', err);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeSync(fetchPreRegistered, ['visitor']);

  useEffect(() => {
    fetchPreRegistered();
  }, [fetchPreRegistered]);

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisitor) return;

    try {
      setSubmitting(true);
      const res = await admitPreRegisteredVisitor(selectedVisitor._id, admitForm);
      if (res.data?.success) {
        showToast(`Visitor ${selectedVisitor.name} has been admitted and logged inside.`);
        setSelectedVisitor(null);
        fetchPreRegistered();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Admission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (Array.isArray(visitors) ? visitors : []).filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.toLowerCase().includes(search.toLowerCase()) ||
    v.passNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.personToMeet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="wmn-page-container">
      {/* Toast Alert */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : '#10b981',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          fontWeight: 700,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}

      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <CalendarCheck size={24} style={{ color: '#7c3aed' }} />
            <span>Pre-Registered & Scheduled Visitors</span>
          </h2>
          <p>Verify appointments, check statutory host approvals, and record scheduled arrival clearance</p>
        </div>

        <button
          type="button"
          className="wmn-btn-sec"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={fetchPreRegistered}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="wmn-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            className="wmn-search-input"
            placeholder="Search scheduled arrivals by visitor name, mobile #, or host..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', fontSize: '0.9rem' }}
          />
          {search && (
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              onClick={() => setSearch('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div className="wmn-table-card">
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Expected Pre-Registered Arrivals ({filtered.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Only pre-approved appointments may be admitted through gate control
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="wmn-table">
            <thead>
              <tr>
                <th>Pass Reference</th>
                <th>Visitor Details</th>
                <th>Host / Department</th>
                <th>Scheduled Time</th>
                <th>Approval Status</th>
                <th style={{ textAlign: 'right' }}>Arrival Clearance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#7c3aed' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading expected visitors...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <CalendarCheck size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>No Expected Visitors</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      {search ? 'No visitor matches your active search.' : 'There are no pending pre-registered appointments for today.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(v => {
                  const isApproved = v.approvalStatus === 'Approved' || v.approvalStatus === 'Not Required';
                  return (
                    <tr key={v._id}>
                      <td>
                        <strong style={{ fontFamily: 'monospace', color: '#7c3aed', background: '#f5f3ff', padding: '4px 8px', borderRadius: '6px' }}>
                          {v.passNumber}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{v.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{v.personToMeet}</div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.department}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155' }}>
                          <Clock size={13} style={{ color: '#64748b' }} />
                          <span>{v.expectedTime || 'General Working Hours'}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isApproved ? '#dcfce7' : (v.approvalStatus === 'Rejected' ? '#fee2e2' : '#fef3c7'),
                          color: isApproved ? '#166534' : (v.approvalStatus === 'Rejected' ? '#991b1b' : '#92400e')
                        }}>
                          {isApproved ? <CheckCircle2 size={12} /> : (v.approvalStatus === 'Rejected' ? <XCircle size={12} /> : <AlertTriangle size={12} />)}
                          <span>{v.approvalStatus}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isApproved ? (
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{
                              background: '#059669',
                              boxShadow: 'none',
                              padding: '6px 12px',
                              fontSize: '0.8rem'
                            }}
                            onClick={() => {
                              setSelectedVisitor(v);
                              setAdmitForm({ vehicleNumber: v.vehicleNumber || '', gate: 'Gate 1 (Main Entrance)', idProofNumber: v.idProofNumber || '' });
                            }}
                          >
                            <UserCheck size={14} />
                            <span>Admit Visitor</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Approval Required
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

      {/* Admission Modal */}
      {selectedVisitor && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '480px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <UserCheck size={20} style={{ color: '#059669' }} />
                <h3>Admit Pre-Registered Visitor</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setSelectedVisitor(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdmitSubmit}>
              <div className="wmn-modal-body">
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{selectedVisitor.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '3px' }}>
                    Purpose: <strong>{selectedVisitor.purpose}</strong> • Meeting: <strong>{selectedVisitor.personToMeet}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#166534', marginTop: '3px', fontWeight: 600 }}>
                    Status: Approved by Department Host
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Vehicle Registration # (if entered by vehicle)</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="e.g. TN 02 BC 3344"
                    value={admitForm.vehicleNumber}
                    onChange={(e) => setAdmitForm({ ...admitForm, vehicleNumber: e.target.value })}
                  />
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">ID Proof Reference # (Verified at Gate)</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="e.g. Aadhaar / DL number verified"
                    value={admitForm.idProofNumber}
                    onChange={(e) => setAdmitForm({ ...admitForm, idProofNumber: e.target.value })}
                  />
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Entry Gate</label>
                  <select
                    className="wmn-form-select"
                    value={admitForm.gate}
                    onChange={(e) => setAdmitForm({ ...admitForm, gate: e.target.value })}
                  >
                    <option value="Gate 1 (Main Entrance)">Gate 1 (Main Entrance)</option>
                    <option value="Gate 2 (North Gate)">Gate 2 (North Gate)</option>
                    <option value="Gate 3 (Hostel Gate)">Gate 3 (Hostel Gate)</option>
                  </select>
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setSelectedVisitor(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  style={{ background: '#059669' }}
                  disabled={submitting}
                >
                  {submitting ? 'Admitting...' : 'Confirm Arrival & Admit Inside'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreRegisteredVisitorsPage;
