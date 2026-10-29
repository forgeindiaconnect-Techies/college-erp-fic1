import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck, Search, CheckCircle2, Clock, MapPin,
  AlertTriangle, XCircle, RefreshCw, UserCheck, Phone, X,
  Plus, UserPlus, Mail, Building, Car, Shield, FileText, QrCode
} from 'lucide-react';
import { getPreRegisteredVisitors, admitPreRegisteredVisitor, preRegisterVisitor } from '../../api/index';
import { getGatePassUrl, getQrCodeImageUrl } from '../../utils/qrPassHelper';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const INITIAL_PREBOOK_FORM = {
  name: '',
  phone: '',
  email: '',
  purpose: 'Official Meeting',
  personToMeet: '',
  department: 'Administration',
  expectedDate: new Date().toISOString().split('T')[0],
  expectedTime: '10:00 AM',
  vehicleNumber: '',
  idProofType: 'Aadhaar Card',
  idProofNumber: '',
  gate: 'Gate 1 (Main Entrance)',
  notes: ''
};

const PreRegisteredVisitorsPage = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [admitForm, setAdmitForm] = useState({ vehicleNumber: '', gate: 'Gate 1 (Main Entrance)', idProofNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Pre-Book Visitor State
  const [showPreBookModal, setShowPreBookModal] = useState(false);
  const [preBookForm, setPreBookForm] = useState(INITIAL_PREBOOK_FORM);
  const [preBookLoading, setPreBookLoading] = useState(false);
  const [createdPassModal, setCreatedPassModal] = useState(null);
  const [passQrMode, setPassQrMode] = useState('raw'); // 'raw' | 'url'

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

  const handlePreBookSubmit = async (e) => {
    e.preventDefault();
    if (!preBookForm.name || !preBookForm.phone || !preBookForm.personToMeet) {
      showToast('Please provide visitor name, phone number, and host to meet.', 'error');
      return;
    }

    try {
      setPreBookLoading(true);
      const res = await preRegisterVisitor(preBookForm);
      if (res.data?.success) {
        showToast('Visitor appointment registered! Awaiting Admin approval before gate pass is active.', 'success');
        setCreatedPassModal(null);
        setShowPreBookModal(false);
        setPreBookForm(INITIAL_PREBOOK_FORM);
        fetchPreRegistered();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to pre-register visitor', 'error');
    } finally {
      setPreBookLoading(false);
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="wmn-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              padding: '9px 18px',
              borderRadius: '9px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
            }}
            onClick={() => setShowPreBookModal(true)}
          >
            <Plus size={16} />
            <span>Pre-Book Visitor</span>
          </button>

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
                <th>QR Gate Pass</th>
                <th style={{ textAlign: 'right' }}>Arrival Clearance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#7c3aed' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading expected visitors...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '44px 16px', color: '#64748b' }}>
                    <CalendarCheck size={40} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>No Expected Visitors</h4>
                    <p style={{ margin: '0 auto 16px', fontSize: '0.84rem', maxWidth: '380px', color: '#64748b' }}>
                      {search ? 'No visitor matches your active search.' : 'There are no scheduled pre-registered appointments for today.'}
                    </p>
                    {!search && (
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                          padding: '8px 18px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          borderRadius: '8px'
                        }}
                        onClick={() => setShowPreBookModal(true)}
                      >
                        <Plus size={15} />
                        <span>Pre-Book Visitor Now</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map(v => {
                  const isApproved = v.approvalStatus === 'Approved' || v.approvalStatus === 'Not Required';
                  const isPending = v.approvalStatus === 'Pending';
                  const isRejected = v.approvalStatus === 'Rejected';

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
                          background: isApproved ? '#dcfce7' : (isRejected ? '#fee2e2' : '#fef3c7'),
                          color: isApproved ? '#166534' : (isRejected ? '#991b1b' : '#92400e'),
                          border: `1px solid ${isApproved ? '#bbf7d0' : (isRejected ? '#fca5a5' : '#fde68a')}`
                        }}>
                          {isApproved ? <CheckCircle2 size={12} /> : (isRejected ? <XCircle size={12} /> : <AlertTriangle size={12} />)}
                          <span>{v.approvalStatus || 'Pending'}</span>
                        </span>
                        {v.approvedBy && isApproved && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            By: {v.approvedBy}
                          </div>
                        )}
                      </td>
                      <td>
                        {isApproved ? (
                          <button
                            type="button"
                            className="wmn-btn-sec"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            onClick={() => setCreatedPassModal(v)}
                            title="Click to view and print official QR Gate Pass"
                          >
                            <QrCode size={13} style={{ color: '#7c3aed' }} />
                            <span>View QR Pass</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            {isPending ? '🔒 Locked (Awaiting Approval)' : '✕ Inactive'}
                          </span>
                        )}
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
                        ) : isPending ? (
                          <span style={{
                            display: 'inline-block',
                            background: '#fef3c7',
                            color: '#92400e',
                            border: '1px solid #fde68a',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700
                          }}>
                            ⏳ Awaiting Admin Approval
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-block',
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 700
                          }}>
                            ✕ Entry Denied
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
      {/* ── Pre-Book Visitor Modal ── */}
      {showPreBookModal && (
        <div className="wmn-modal-backdrop" onClick={() => !preBookLoading && setShowPreBookModal(false)}>
          <div className="wmn-modal-card" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="wmn-modal-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarCheck size={20} />
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.05rem', fontWeight: 800 }}>
                  Pre-Book Visitor Appointment
                </h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close"
                style={{ color: '#ffffff' }}
                onClick={() => !preBookLoading && setShowPreBookModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePreBookSubmit}>
              <div className="wmn-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px' }}>
                <div className="wmn-form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Visitor Full Name *</label>
                    <input
                      type="text"
                      required
                      className="wmn-form-input"
                      placeholder="e.g. Ramesh Kumar"
                      value={preBookForm.name}
                      onChange={(e) => setPreBookForm({ ...preBookForm, name: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      className="wmn-form-input"
                      placeholder="10-digit mobile number"
                      value={preBookForm.phone}
                      onChange={(e) => setPreBookForm({ ...preBookForm, phone: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Email Address (Optional)</label>
                    <input
                      type="email"
                      className="wmn-form-input"
                      placeholder="visitor@example.com"
                      value={preBookForm.email}
                      onChange={(e) => setPreBookForm({ ...preBookForm, email: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Host / Person to Meet *</label>
                    <input
                      type="text"
                      required
                      className="wmn-form-input"
                      placeholder="e.g. Principal / Dr. Sundaram"
                      value={preBookForm.personToMeet}
                      onChange={(e) => setPreBookForm({ ...preBookForm, personToMeet: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Host Department *</label>
                    <select
                      className="wmn-form-select"
                      value={preBookForm.department}
                      onChange={(e) => setPreBookForm({ ...preBookForm, department: e.target.value })}
                    >
                      <option value="Administration">Administration</option>
                      <option value="Principal Office">Principal Office</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Accounts Department">Accounts Department</option>
                      <option value="Placement Cell">Placement Cell</option>
                      <option value="Examinations Office">Examinations Office</option>
                    </select>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Purpose of Visit *</label>
                    <select
                      className="wmn-form-select"
                      value={preBookForm.purpose}
                      onChange={(e) => setPreBookForm({ ...preBookForm, purpose: e.target.value })}
                    >
                      <option value="Official Meeting">Official Meeting</option>
                      <option value="Admissions Enquiry">Admissions Enquiry</option>
                      <option value="Guest Lecture / Seminar">Guest Lecture / Seminar</option>
                      <option value="Vendor / Maintenance">Vendor / Maintenance</option>
                      <option value="Parent Meeting">Parent Meeting</option>
                      <option value="Campus Interview / Placement">Campus Interview / Placement</option>
                      <option value="Inspection / Statutory">Inspection / Statutory</option>
                    </select>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Scheduled Date *</label>
                    <input
                      type="date"
                      required
                      className="wmn-form-input"
                      value={preBookForm.expectedDate}
                      onChange={(e) => setPreBookForm({ ...preBookForm, expectedDate: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Scheduled Time *</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. 10:30 AM"
                      value={preBookForm.expectedTime}
                      onChange={(e) => setPreBookForm({ ...preBookForm, expectedTime: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Vehicle Registration (Optional)</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. TN-24-AX-1234"
                      value={preBookForm.vehicleNumber}
                      onChange={(e) => setPreBookForm({ ...preBookForm, vehicleNumber: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Designated Entry Gate</label>
                    <select
                      className="wmn-form-select"
                      value={preBookForm.gate}
                      onChange={(e) => setPreBookForm({ ...preBookForm, gate: e.target.value })}
                    >
                      <option value="Gate 1 (Main Entrance)">Gate 1 (Main Entrance)</option>
                      <option value="Gate 2 (North Gate)">Gate 2 (North Gate)</option>
                      <option value="Gate 3 (Hostel Gate)">Gate 3 (Hostel Gate)</option>
                      <option value="Gate 4 (Sports Complex Gate)">Gate 4 (Sports Complex Gate)</option>
                    </select>
                  </div>
                </div>

                <div className="wmn-form-group" style={{ marginTop: '14px' }}>
                  <label className="wmn-form-label">Security Clearance / Notes (Optional)</label>
                  <textarea
                    rows={2}
                    className="wmn-form-input"
                    placeholder="Any special host approval instructions or security notes..."
                    value={preBookForm.notes}
                    onChange={(e) => setPreBookForm({ ...preBookForm, notes: e.target.value })}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setShowPreBookModal(false)}
                  disabled={preBookLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                  disabled={preBookLoading}
                >
                  {preBookLoading ? 'Scheduling...' : 'Confirm & Generate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Generated Pass Confirmation Modal ── */}
      {createdPassModal && (
        <div className="wmn-modal-backdrop" onClick={() => setCreatedPassModal(null)}>
          <div className="wmn-modal-card" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="wmn-modal-header" style={{ background: '#059669', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} />
                <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontWeight: 800 }}>
                  Visitor Pass Pre-Registered!
                </h3>
              </div>
              <button type="button" className="wmn-modal-close" style={{ color: '#ffffff' }} onClick={() => setCreatedPassModal(null)}>✕</button>
            </div>

            <div style={{ padding: '24px 20px' }}>
              {(() => {
                const passUrl = getGatePassUrl(createdPassModal.passNumber, 'visitor');
                const activeQr = getQrCodeImageUrl(passUrl, 260);

                return (
                  <div>
                    <div style={{ display: 'inline-block', padding: '14px', background: '#ffffff', border: '2px dashed #10b981', borderRadius: '14px', marginBottom: '14px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                      <img src={activeQr} alt="Pass QR" style={{ width: 190, height: 190, display: 'block', margin: '0 auto' }} />
                      <strong style={{ display: 'block', marginTop: '8px', fontFamily: 'monospace', color: '#059669', fontSize: '1.05rem', fontWeight: 800 }}>
                        {createdPassModal.passNumber}
                      </strong>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                        Scan via Phone Camera / Google Lens
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                      <a
                        href={passUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          background: '#ecfdf5',
                          color: '#065f46',
                          border: '1px solid #a7f3d0',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>🔗 Open Digital Pass Preview</span>
                      </a>
                      <button
                        type="button"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                        onClick={() => {
                          navigator.clipboard?.writeText(passUrl);
                          alert('Digital Pass Link copied to clipboard!\n' + passUrl);
                        }}
                      >
                        📋 Copy Link
                      </button>
                    </div>
                  </div>
                );
              })()}

              <h4 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>{createdPassModal.name}</h4>
              <p style={{ margin: '0 0 10px', fontSize: '0.84rem', color: '#64748b' }}>
                📞 {createdPassModal.phone} • Meeting <strong>{createdPassModal.personToMeet}</strong> ({createdPassModal.department})
              </p>

              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                📅 Scheduled for {new Date(createdPassModal.expectedDate).toLocaleDateString()} at {createdPassModal.expectedTime}
              </div>
            </div>

            <div className="wmn-modal-footer" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="wmn-btn-primary"
                style={{ background: '#059669', width: '100%', padding: '10px 0', fontSize: '0.9rem', fontWeight: 800 }}
                onClick={() => setCreatedPassModal(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreRegisteredVisitorsPage;
