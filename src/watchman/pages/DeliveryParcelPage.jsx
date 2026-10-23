import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Plus, Search, CheckCircle2, Clock, Truck,
  User, Check, RefreshCw, X, AlertCircle, ShieldCheck
} from 'lucide-react';
import { getParcels, logParcel, handoverParcel, getStaffDirectory } from '../../api/index';
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

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Security Checkpost'
];

const DeliveryParcelPage = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Staff directory for verified DB lookup
  const [staffList, setStaffList] = useState([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [handedOverTo, setHandedOverTo] = useState('');

  // Form
  const [form, setForm] = useState({
    type: 'Parcel', // Delivery or Parcel
    recipientId: '',
    staffId: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    recipientType: 'Staff',
    department: '',
    deliveryCompany: COMPANIES[0],
    senderName: '',
    trackingNumber: '',
    parcelDetails: 'Standard package / envelope',
    gate: GATES[0],
    receivedAt: new Date().toISOString().slice(0, 16),
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Fetch staff directory from DB
  const loadStaffDirectory = async () => {
    try {
      const res = await getStaffDirectory();
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      setStaffList(list);
    } catch (err) {
      console.error('Failed to load staff directory:', err);
    }
  };

  const fetchParcels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getParcels({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        type: typeFilter !== 'All' ? typeFilter : undefined
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setParcels(list);
    } catch (err) {
      console.error('Failed to load parcels:', err);
      setParcels([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useRealtimeSync(fetchParcels, ['parcel']);

  useEffect(() => {
    fetchParcels();
    loadStaffDirectory();
  }, [fetchParcels]);

  // Filter staff by query
  const filteredStaff = useMemo(() => {
    if (!staffSearchQuery.trim()) return staffList.slice(0, 8);
    const q = staffSearchQuery.toLowerCase();
    return staffList.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      s.staffId?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [staffList, staffSearchQuery]);

  const selectStaff = (staff) => {
    setForm(prev => ({
      ...prev,
      recipientId: staff._id,
      staffId: staff.staffId || '',
      recipientName: staff.name,
      recipientEmail: staff.email || '',
      recipientPhone: staff.phone || prev.recipientPhone,
      department: staff.department || prev.department,
      recipientType: staff.role || 'Staff'
    }));
    setStaffSearchQuery(`${staff.name} (${staff.staffId || staff.email})`);
    setShowStaffDropdown(false);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    let submissionForm = { ...form };

    // If recipientId is not set yet but user typed in staffSearchQuery, auto-match from staffList
    if (!submissionForm.recipientId && staffSearchQuery.trim()) {
      const q = staffSearchQuery.trim().toLowerCase();
      const bracketMatch = staffSearchQuery.match(/\[(.*?)\]/) || staffSearchQuery.match(/\((.*?)\)/);
      const extractedId = bracketMatch ? bracketMatch[1].trim().toLowerCase() : '';

      const matched = staffList.find(s =>
        (extractedId && (s.staffId?.toLowerCase() === extractedId || s._id?.toString() === extractedId)) ||
        s.staffId?.toLowerCase() === q ||
        s.email?.toLowerCase() === q ||
        s.name?.toLowerCase() === q ||
        `${s.name} (${s.staffId || s.email})`.toLowerCase() === q ||
        `${s.name} [${s.staffId}]`.toLowerCase() === q
      );

      if (matched) {
        submissionForm = {
          ...submissionForm,
          recipientId: matched._id,
          staffId: matched.staffId || '',
          recipientName: matched.name,
          recipientEmail: matched.email || '',
          recipientPhone: matched.phone || submissionForm.recipientPhone,
          department: matched.department || submissionForm.department,
          recipientType: matched.role || 'Staff'
        };
      } else {
        submissionForm.recipientName = staffSearchQuery.trim();
      }
    }

    if (!submissionForm.recipientName.trim()) {
      showToast('Recipient name is required. Please select a staff member.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...submissionForm,
        receivedAt: new Date(submissionForm.receivedAt).toISOString()
      };
      const res = await logParcel(payload);
      if (res.data?.success) {
        showToast(`${submissionForm.type} logged successfully for ${submissionForm.recipientName}!`);
        setLogModalOpen(false);
        setForm({
          type: 'Parcel',
          recipientId: '',
          staffId: '',
          recipientName: '',
          recipientEmail: '',
          recipientPhone: '',
          recipientType: 'Staff',
          department: '',
          deliveryCompany: COMPANIES[0],
          senderName: '',
          trackingNumber: '',
          parcelDetails: 'Standard package / envelope',
          gate: GATES[0],
          receivedAt: new Date().toISOString().slice(0, 16),
          notes: ''
        });
        setStaffSearchQuery('');
        setShowStaffDropdown(false);
        fetchParcels();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to log parcel/delivery', 'error');
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
        showToast(`Item marked as Handed Over to ${handedOverTo || selectedParcel.recipientName}!`);
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

  const filtered = (Array.isArray(parcels) ? parcels : []).filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || (
      p.recipientName?.toLowerCase().includes(q) ||
      p.staffId?.toLowerCase().includes(q) ||
      p.trackingNumber?.toLowerCase().includes(q) ||
      p.parcelId?.toLowerCase().includes(q) ||
      p.deliveryCompany?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q)
    );
    return matchSearch;
  });

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
          <p>Register incoming staff packages, track gate custody, and record recipient handover acknowledgements</p>
        </div>

        <button
          type="button"
          className="wmn-btn-primary"
          style={{ background: '#d97706' }}
          onClick={() => {
            setStaffSearchQuery('');
            setShowStaffDropdown(false);
            setLogModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Log Incoming Item</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="wmn-controls-card">
        <div className="wmn-search-wrap">
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            className="wmn-search-input"
            placeholder="Search by recipient name, staff ID, tracking #, courier company..."
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Delivery">Delivery Only</option>
            <option value="Parcel">Parcel Only</option>
          </select>

          <select
            className="wmn-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Received at Gate">Pending Collection</option>
            <option value="Handed Over">Handed Over / Collected</option>
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
                <th>ID & Type</th>
                <th>Staff Recipient</th>
                <th>Courier / Sender</th>
                <th>Tracking #</th>
                <th>Received Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Handover Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#d97706' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading records...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <Package size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>No Deliveries or Parcels Found</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      {search ? 'No item matches your active search.' : 'There are no records under this filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const isPending = p.status === 'Pending Collection' || p.status === 'Received at Gate' || p.status === 'Received';
                  const isDelivery = p.type === 'Delivery';

                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                            {p.parcelId || '—'}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            width: 'fit-content',
                            background: isDelivery ? '#eff6ff' : '#fef3c7',
                            color: isDelivery ? '#1d4ed8' : '#b45309'
                          }}>
                            {p.type || 'Parcel'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.recipientName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', gap: '6px' }}>
                          {p.staffId && <span style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px', fontWeight: 600 }}>ID: {p.staffId}</span>}
                          {p.department && <span>{p.department}</span>}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{p.deliveryCompany}</div>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.parcelDetails || 'Standard Package'}</span>
                      </td>

                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: '#f8fafc', padding: '2px 5px', borderRadius: '4px' }}>
                          {p.trackingNumber || '—'}
                        </span>
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
                          background: !isPending ? '#dcfce7' : '#fef3c7',
                          color: !isPending ? '#166534' : '#92400e'
                        }}>
                          {!isPending ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          <span>{p.status}</span>
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {isPending ? (
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
                            Handed to: <strong>{p.handedOverTo || p.collectedBy || p.recipientName}</strong>
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

      {/* Modal 1: Log Parcel / Delivery */}
      {logModalOpen && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '540px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Package size={20} style={{ color: '#d97706' }} />
                <h3>Log Incoming Delivery or Parcel</h3>
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
                {/* Type toggle */}
                <div className="wmn-form-group" style={{ marginBottom: '12px' }}>
                  <label className="wmn-form-label">Type <span className="req">*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: form.type === 'Parcel' ? '2px solid #d97706' : '1px solid #cbd5e1',
                        background: form.type === 'Parcel' ? '#fffbeb' : '#ffffff',
                        color: form.type === 'Parcel' ? '#92400e' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => setForm({ ...form, type: 'Parcel' })}
                    >
                      <Package size={16} />
                      <span>Parcel</span>
                    </button>
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: form.type === 'Delivery' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: form.type === 'Delivery' ? '#eff6ff' : '#ffffff',
                        color: form.type === 'Delivery' ? '#1d4ed8' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => setForm({ ...form, type: 'Delivery' })}
                    >
                      <Truck size={16} />
                      <span>Delivery</span>
                    </button>
                  </div>
                </div>

                {/* Staff Database Lookup */}
                <div className="wmn-form-group" style={{ position: 'relative', marginBottom: '12px' }}>
                  <label className="wmn-form-label">
                    Select Staff Member from Database <span className="req">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="Type staff name or staff ID to search..."
                      value={staffSearchQuery}
                      onChange={(e) => {
                        setStaffSearchQuery(e.target.value);
                        setShowStaffDropdown(true);
                      }}
                      onFocus={() => setShowStaffDropdown(true)}
                      required
                    />
                  </div>

                  {showStaffDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {filteredStaff.length === 0 ? (
                        <div style={{ padding: '10px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                          No staff member matches "{staffSearchQuery}"
                        </div>
                      ) : (
                        filteredStaff.map(s => (
                          <div
                            key={s._id}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #f1f5f9',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fef3c7'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                            onClick={() => selectStaff(s)}
                          >
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                              {s.name} {s.staffId && <span style={{ color: '#d97706', fontSize: '0.78rem' }}>[{s.staffId}]</span>}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {s.department || 'Staff'} • {s.email}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {form.recipientId && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '6px',
                      padding: '5px 8px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: '#065f46'
                    }}>
                      <ShieldCheck size={14} />
                      <span>Linked Staff: <strong>{form.recipientName}</strong> (ID: {form.staffId || 'Verified'})</span>
                    </div>
                  )}
                </div>

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
                    <label className="wmn-form-label">Sender Name (Optional)</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Oxford Press"
                      value={form.senderName}
                      onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Campus Gate Post</label>
                    <select
                      className="wmn-form-select"
                      value={form.gate}
                      onChange={(e) => setForm({ ...form, gate: e.target.value })}
                    >
                      {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Package Description</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="e.g. Cardboard box, envelope, books"
                    value={form.parcelDetails}
                    onChange={(e) => setForm({ ...form, parcelDetails: e.target.value })}
                  />
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Received Date & Time</label>
                  <input
                    type="datetime-local"
                    className="wmn-form-input"
                    value={form.receivedAt}
                    onChange={(e) => setForm({ ...form, receivedAt: e.target.value })}
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
                  {submitting ? 'Logging...' : 'Confirm Item Receipt'}
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
                <h3>Acknowledge Item Handover</h3>
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
                  Confirming handover of {selectedParcel.type || 'parcel'} <strong>{selectedParcel.parcelId}</strong> ({selectedParcel.deliveryCompany}) to recipient <strong>{selectedParcel.recipientName}</strong>
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
