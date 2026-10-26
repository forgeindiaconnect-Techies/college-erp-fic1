import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut as ExitIcon, Search, CheckCircle2, Clock, MapPin,
  Phone, User, Car, AlertTriangle, RefreshCw, X, QrCode, UserPlus,
  Printer, ExternalLink, ShieldCheck
} from 'lucide-react';
import { getActiveVisitors, recordVisitorExit } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const VisitorExitPage = () => {
  const navigate = useNavigate();
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [qrModalVisitor, setQrModalVisitor] = useState(null);
  const [exitNotes, setExitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchActive = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getActiveVisitors();
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setActiveVisitors(list);
    } catch (err) {
      console.error('Failed to load active visitors:', err);
      setActiveVisitors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeSync(fetchActive, ['visitor']);

  useEffect(() => {
    fetchActive();
  }, [fetchActive]);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisitor) return;

    try {
      setSubmitting(true);
      const res = await recordVisitorExit(selectedVisitor._id, { notes: exitNotes });
      if (res.data?.success) {
        showToast(`Visitor ${selectedVisitor.name} has checked out successfully!`);
        setSelectedVisitor(null);
        setExitNotes('');
        fetchActive();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCheckout = async (visitor) => {
    if (!visitor) return;
    try {
      setSubmitting(true);
      const res = await recordVisitorExit(visitor._id, { notes: 'Scanned exit departure checkout' });
      if (res.data?.success) {
        showToast(`Visitor ${visitor.name} (${visitor.passNumber}) checked out successfully!`);
        setQrModalVisitor(null);
        fetchActive();
      } else {
        showToast(res.data?.message || 'Checkout failed', 'error');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (Array.isArray(activeVisitors) ? activeVisitors : []).filter(v =>
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone?.toLowerCase().includes(search.toLowerCase()) ||
    v.passNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.personToMeet?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicleNumber?.toLowerCase().includes(search.toLowerCase())
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
            <ExitIcon size={24} style={{ color: '#dc2626' }} />
            <span>Visitor Exit & Checkout Processing</span>
          </h2>
          <p>Locate active campus visitors and register official exit departure timestamp</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/watchman/qr-verification?type=visitor')}
            title="Scan QR pass with camera or barcode gun"
          >
            <QrCode size={15} style={{ color: '#2563eb' }} />
            <span>Open Pass Scanner</span>
          </button>
          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => navigate('/watchman/visitor-entry')}
            title="Register a new visitor"
          >
            <UserPlus size={15} style={{ color: '#059669' }} />
            <span>New Visitor Entry</span>
          </button>
          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={fetchActive}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="wmn-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            className="wmn-search-input"
            placeholder="Search visitor by name, pass #, mobile number, vehicle #, or person met..."
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

      {/* Active Table Card */}
      <div className="wmn-card" style={{ padding: 0 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            Active Visitors Currently Inside ({filtered.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Click "Record Exit" to complete visitor checkout
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="wmn-table">
            <thead>
              <tr>
                <th>Pass #</th>
                <th>Visitor Name & Phone</th>
                <th>Purpose of Visit</th>
                <th>Host Met</th>
                <th>Vehicle #</th>
                <th>Entry Time</th>
                <th style={{ textAlign: 'right' }}>Checkout Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563eb' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading active visitors...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 10px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>No Active Visitors Inside</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      {search ? 'No visitor matches your active search.' : 'All registered visitors have departed.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(v => (
                  <tr key={v._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px' }}>
                        {v.passNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{v.phone}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#1e293b' }}>{v.purpose}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{v.personToMeet}</div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.department}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{v.vehicleNumber || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155' }}>
                        <Clock size={13} style={{ color: '#64748b' }} />
                        <span>{new Date(v.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="wmn-btn-sec"
                          style={{
                            padding: '6px 10px',
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onClick={() => setQrModalVisitor(v)}
                          title={`Scan & verify pass for ${v.name}`}
                        >
                          <QrCode size={13} style={{ color: '#2563eb' }} />
                          <span>Scan</span>
                        </button>
                        <button
                          type="button"
                          className="wmn-btn-primary"
                          style={{
                            background: '#dc2626',
                            boxShadow: 'none',
                            padding: '6px 12px',
                            fontSize: '0.8rem'
                          }}
                          onClick={() => {
                            setSelectedVisitor(v);
                            setExitNotes('');
                          }}
                        >
                          <ExitIcon size={14} />
                          <span>Record Exit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedVisitor && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '460px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <ExitIcon size={20} style={{ color: '#dc2626' }} />
                <h3>Confirm Visitor Checkout</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setSelectedVisitor(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit}>
              <div className="wmn-modal-body">
                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{selectedVisitor.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                    Pass: <strong>{selectedVisitor.passNumber}</strong> • Host: <strong>{selectedVisitor.personToMeet}</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#059669', marginTop: '4px' }}>
                    Entered: {new Date(selectedVisitor.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Exit Remarks / Security Check (Optional)</label>
                  <textarea
                    className="wmn-form-textarea"
                    rows={2}
                    placeholder="e.g. Visitor pass badge returned in good condition"
                    value={exitNotes}
                    onChange={(e) => setExitNotes(e.target.value)}
                  />
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
                  style={{ background: '#dc2626' }}
                  disabled={submitting}
                >
                  {submitting ? 'Checking Out...' : 'Confirm Checkout & Exit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visitor Pass QR Code Badge & Scanner Modal */}
      {qrModalVisitor && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '520px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <QrCode size={20} style={{ color: '#2563eb' }} />
                <h3>Visitor Gate Pass & QR Clearance</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setQrModalVisitor(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="wmn-modal-body">
              {/* Pass Header Badge */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: '#eff6ff',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                marginBottom: '16px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase' }}>Official Gate Pass</span>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800, color: '#1e40af' }}>
                    {qrModalVisitor.passNumber}
                  </div>
                </div>
                <div style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #86efac',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                  <span>Currently Inside Campus</span>
                </div>
              </div>

              {/* QR Code and Visitor Summary Card */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '170px 1fr',
                gap: '16px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                alignItems: 'center'
              }}>
                {/* Real-time QR Code generated specifically for this visitor's pass */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    padding: '8px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    display: 'inline-block',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                  }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrModalVisitor.passNumber)}`}
                      alt={`QR for ${qrModalVisitor.name}`}
                      style={{ width: '136px', height: '136px', display: 'block' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
                    Scan with barcode gun or mobile
                  </div>
                </div>

                {/* Visitor Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      {qrModalVisitor.name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} />
                      <span>{qrModalVisitor.phone}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Host: </span>
                    <strong>{qrModalVisitor.personToMeet}</strong> {qrModalVisitor.department ? `(${qrModalVisitor.department})` : ''}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Purpose: </span>
                    <span>{qrModalVisitor.purpose}</span>
                  </div>

                  {qrModalVisitor.vehicleNumber && (
                    <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Vehicle: </span>
                      <strong style={{ fontFamily: 'monospace' }}>{qrModalVisitor.vehicleNumber}</strong>
                    </div>
                  )}

                  <div style={{ fontSize: '0.82rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} style={{ color: '#64748b' }} />
                    <span style={{ color: '#64748b' }}>Entry: </span>
                    <span>{new Date(qrModalVisitor.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="wmn-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ fontSize: '0.82rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  const pNum = qrModalVisitor.passNumber;
                  setQrModalVisitor(null);
                  navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(pNum)}`);
                }}
                title="Open this pass directly in Gate Camera Scanner"
              >
                <ExternalLink size={14} style={{ color: '#2563eb' }} />
                <span>Open in Gate Scanner</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setQrModalVisitor(null)}
                  disabled={submitting}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="wmn-btn-primary"
                  style={{ background: '#dc2626' }}
                  onClick={() => handleQuickCheckout(qrModalVisitor)}
                  disabled={submitting}
                >
                  <ExitIcon size={14} />
                  <span>{submitting ? 'Checking Out...' : 'Record Exit & Checkout'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorExitPage;
