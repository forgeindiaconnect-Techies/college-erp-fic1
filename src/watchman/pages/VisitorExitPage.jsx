import React, { useState, useEffect, useCallback } from 'react';
import {
  LogOut as ExitIcon, Search, CheckCircle2, Clock, MapPin,
  Phone, User, Car, AlertTriangle, RefreshCw, X
} from 'lucide-react';
import { getActiveVisitors, recordVisitorExit } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const VisitorExitPage = () => {
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
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
    </div>
  );
};

export default VisitorExitPage;
