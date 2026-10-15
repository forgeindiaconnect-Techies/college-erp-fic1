import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Plus, Search, CheckCircle2, Clock, Truck,
  User, Check, RefreshCw, X, AlertCircle
} from 'lucide-react';
import { getParcels, logParcel, handoverParcel } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const COMPANIES = [
  'Amazon',
  'Flipkart',
  'Blue Dart',
  'DTDC',
  'India Post / Speed Post',
  'Delhivery',
  'FedEx',
  'Swiggy / Zomato',
  'Courier',
  'Other'
];

const RECIPIENT_TYPES = ['Faculty', 'Student', 'Staff', 'Department', 'Hostel Warden', 'Principal / Admin', 'Other'];

const DeliveryParcelPage = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [handedOverTo, setHandedOverTo] = useState('');

  // Form
  const [form, setForm] = useState({
    deliveryCompany: COMPANIES[0],
    recipientName: '',
    recipientPhone: '',
    recipientType: RECIPIENT_TYPES[0],
    department: 'General',
    trackingNumber: '',
    parcelDetails: 'Standard Package',
    gate: 'Gate 1 (Main Entrance)',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getParcels({ status: statusFilter });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setParcels(list);
    } catch (err) {
      console.error('Failed to load parcels:', err);
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useRealtimeSync(fetchParcels, ['parcel']);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!form.recipientName.trim()) {
      showToast('Recipient name is required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await logParcel(form);
      if (res.data?.success) {
        showToast('Parcel logged successfully at gate post!');
        setLogModalOpen(false);
        setForm({
          deliveryCompany: COMPANIES[0],
          recipientName: '',
          recipientPhone: '',
          recipientType: RECIPIENT_TYPES[0],
          department: 'General',
          trackingNumber: '',
          parcelDetails: 'Standard Package',
          gate: 'Gate 1 (Main Entrance)',
          notes: ''
        });
        fetchParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log parcel', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHandoverSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParcel) return;

    try {
      setSubmitting(true);
      const res = await handoverParcel(selectedParcel._id, { handedOverTo });
      if (res.data?.success) {
        showToast(`Parcel marked as Handed Over to ${handedOverTo || selectedParcel.recipientName}!`);
        setHandoverModalOpen(false);
        setSelectedParcel(null);
        fetchParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Handover update failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = (Array.isArray(parcels) ? parcels : []).filter(p =>
    p.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.trackingNumber?.toLowerCase().includes(search.toLowerCase()) ||
    p.parcelId?.toLowerCase().includes(search.toLowerCase()) ||
    p.deliveryCompany?.toLowerCase().includes(search.toLowerCase())
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
            <Package size={24} style={{ color: '#d97706' }} />
            <span>Delivery & Campus Parcel Register</span>
          </h2>
          <p>Log received courier parcels, track gate custody, and record recipient handover acknowledgements</p>
        </div>

        <button
          type="button"
          className="wmn-btn-primary"
          style={{ background: '#d97706' }}
          onClick={() => setLogModalOpen(true)}
        >
          <Plus size={16} />
          <span>Log Incoming Parcel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="wmn-controls-card">
        <div className="wmn-search-wrap">
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            className="wmn-search-input"
            placeholder="Search by recipient name, tracking #, courier company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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

        <div className="wmn-filter-group">
          <select
            className="wmn-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Received at Gate">Received at Gate (Pending Handover)</option>
            <option value="Handed Over">Handed Over (Completed)</option>
          </select>

          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={fetchParcels}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="wmn-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="wmn-table">
            <thead>
              <tr>
                <th>Parcel ID</th>
                <th>Courier / Company</th>
                <th>Recipient Name & Type</th>
                <th>Department / Unit</th>
                <th>Tracking #</th>
                <th>Received Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Handover Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#d97706' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading parcel logs...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <Package size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>No Parcels Found</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      {search ? 'No parcel matches your active search.' : 'There are no parcel records under this filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '3px 8px', borderRadius: '4px' }}>
                        {p.parcelId}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.deliveryCompany}</div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.parcelDetails}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.recipientName}</div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Role: {p.recipientType}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#334155' }}>{p.department}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{p.trackingNumber || '—'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155' }}>
                        <Clock size={12} style={{ color: '#64748b' }} />
                        <span>{new Date(p.receivedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {new Date(p.receivedAt).toLocaleDateString()}</span>
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
                        background: p.status === 'Handed Over' ? '#dcfce7' : '#fef3c7',
                        color: p.status === 'Handed Over' ? '#166534' : '#92400e'
                      }}>
                        {p.status === 'Handed Over' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                        <span>{p.status}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.status === 'Received at Gate' ? (
                        <button
                          type="button"
                          className="wmn-btn-primary"
                          style={{
                            background: '#059669',
                            boxShadow: 'none',
                            padding: '6px 12px',
                            fontSize: '0.78rem'
                          }}
                          onClick={() => {
                            setSelectedParcel(p);
                            setHandedOverTo(p.recipientName);
                            setHandoverModalOpen(true);
                          }}
                        >
                          <Check size={14} />
                          <span>Hand Over</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Handed to: <strong>{p.handedOverTo || p.recipientName}</strong>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Log Parcel */}
      {logModalOpen && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '520px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Package size={20} style={{ color: '#d97706' }} />
                <h3>Log Incoming Campus Parcel</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setLogModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogSubmit}>
              <div className="wmn-modal-body">
                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Delivery Company <span className="req">*</span></label>
                    <select
                      className="wmn-form-select"
                      value={form.deliveryCompany}
                      onChange={(e) => setForm({ ...form, deliveryCompany: e.target.value })}
                    >
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Tracking / AWB #</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. AMZ-902184"
                      value={form.trackingNumber}
                      onChange={(e) => setForm({ ...form, trackingNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Recipient Name <span className="req">*</span></label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Dr. Ananya Rao"
                      value={form.recipientName}
                      onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Recipient Category</label>
                    <select
                      className="wmn-form-select"
                      value={form.recipientType}
                      onChange={(e) => setForm({ ...form, recipientType: e.target.value })}
                    >
                      {RECIPIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Department / Hostel Block</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Computer Science / Girls Block A"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Recipient Phone #</label>
                    <input
                      type="tel"
                      className="wmn-form-input"
                      placeholder="10-digit mobile"
                      value={form.recipientPhone}
                      onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Package Description</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="e.g. Cardboard box, envelope, lab equipment"
                    value={form.parcelDetails}
                    onChange={(e) => setForm({ ...form, parcelDetails: e.target.value })}
                  />
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setLogModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  style={{ background: '#d97706' }}
                  disabled={submitting}
                >
                  {submitting ? 'Logging...' : 'Confirm Parcel Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Handover Parcel */}
      {handoverModalOpen && selectedParcel && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '440px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <CheckCircle2 size={20} style={{ color: '#059669' }} />
                <h3>Acknowledge Parcel Handover</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setHandoverModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleHandoverSubmit}>
              <div className="wmn-modal-body">
                <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: '#64748b' }}>
                  Confirming handover of parcel <strong>{selectedParcel.parcelId}</strong> ({selectedParcel.deliveryCompany})
                </p>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Collected By (Full Name) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    value={handedOverTo}
                    onChange={(e) => setHandedOverTo(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setHandoverModalOpen(false)}
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
                  {submitting ? 'Updating...' : 'Confirm Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryParcelPage;
