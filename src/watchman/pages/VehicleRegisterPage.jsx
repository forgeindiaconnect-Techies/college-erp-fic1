import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Car, Plus, Search, CheckCircle2, Clock, MapPin,
  Phone, User, RefreshCw, X, AlertCircle, LogOut as ExitIcon
} from 'lucide-react';
import { getVehicles, recordVehicleEntry, recordVehicleExit } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const VEHICLE_TYPES = [
  'Two Wheeler',
  'Four Wheeler (Car/SUV)',
  'College Bus',
  'Commercial / Delivery Van',
  'Heavy Vehicle / Truck',
  'Auto Rickshaw',
  'Other'
];

const PURPOSES = [
  'Staff Parking',
  'Visitor Entry',
  'Student Commute',
  'Goods / Delivery',
  'Maintenance / Contractor',
  'VIP / Official Guest',
  'Other'
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const VehicleRegisterPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Inside');
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    vehicleNumber: '',
    vehicleType: VEHICLE_TYPES[1],
    driverName: '',
    driverPhone: '',
    purpose: PURPOSES[0],
    destination: 'Campus Parking',
    gate: GATES[0],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVehicles({ status: statusFilter });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useRealtimeSync(fetchVehicles, ['vehicle']);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    if (!form.vehicleNumber.trim() || !form.driverName.trim()) {
      showToast('Vehicle registration number and driver name are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await recordVehicleEntry(form);
      if (res.data?.success) {
        showToast(`Vehicle ${form.vehicleNumber.toUpperCase()} entry recorded!`);
        setModalOpen(false);
        setForm({
          vehicleNumber: '',
          vehicleType: VEHICLE_TYPES[1],
          driverName: '',
          driverPhone: '',
          purpose: PURPOSES[0],
          destination: 'Campus Parking',
          gate: GATES[0],
          notes: ''
        });
        fetchVehicles();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExitVehicle = async (veh) => {
    if (!window.confirm(`Record exit for vehicle ${veh.vehicleNumber}?`)) return;

    try {
      const res = await recordVehicleExit(veh._id);
      if (res.data?.success) {
        showToast(`Vehicle ${veh.vehicleNumber} marked as Exited!`);
        fetchVehicles();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to record exit', 'error');
    }
  };

  const filtered = (Array.isArray(vehicles) ? vehicles : []).filter(v =>
    v.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
    v.driverName?.toLowerCase().includes(search.toLowerCase()) ||
    v.purpose?.toLowerCase().includes(search.toLowerCase())
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
            <Car size={24} style={{ color: '#0891b2' }} />
            <span>Vehicle Gate Entry & Exit Register</span>
          </h2>
          <p>Monitor two-wheelers, cars, campus buses, commercial delivery trucks, and parking authorization</p>
        </div>

        <button
          type="button"
          className="wmn-btn-primary"
          style={{ background: '#0891b2' }}
          onClick={() => setModalOpen(true)}
        >
          <Plus size={16} />
          <span>Record Vehicle Entry</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="wmn-controls-card">
        <div className="wmn-search-wrap">
          <Search size={18} style={{ color: '#64748b' }} />
          <input
            type="text"
            className="wmn-search-input"
            placeholder="Search by vehicle reg number (e.g. TN 09...), driver name..."
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
            <option value="Inside">Vehicles Inside Campus</option>
            <option value="Exited">Exited Vehicles Log</option>
            <option value="All">All Vehicle Movements</option>
          </select>

          <button
            type="button"
            className="wmn-btn-sec"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={fetchVehicles}
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
                <th>Vehicle #</th>
                <th>Vehicle Type</th>
                <th>Driver Name & Phone</th>
                <th>Purpose</th>
                <th>Destination</th>
                <th>Entry Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#0891b2' }} />
                    <p style={{ margin: 0, color: '#64748b' }}>Loading vehicle movements...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <Car size={36} style={{ color: '#cbd5e1', margin: '0 auto 10px auto' }} />
                    <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>No Vehicles Found</h4>
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      {statusFilter === 'Inside' ? 'No vehicles currently inside campus under this filter.' : 'No vehicle movements logged.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(v => (
                  <tr key={v._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0891b2', background: '#ecfeff', padding: '4px 8px', borderRadius: '4px', fontSize: '0.88rem' }}>
                        {v.vehicleNumber}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#1e293b' }}>{v.vehicleType}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{v.driverName}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{v.driverPhone || '—'}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#334155' }}>{v.purpose}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: '#475569' }}>{v.destination}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#334155' }}>
                        <Clock size={12} style={{ color: '#64748b' }} />
                        <span>{new Date(v.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {new Date(v.entryTime).toLocaleDateString()}</span>
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
                        background: v.status === 'Inside' ? '#dcfce7' : '#f1f5f9',
                        color: v.status === 'Inside' ? '#166534' : '#64748b'
                      }}>
                        {v.status === 'Inside' ? <CheckCircle2 size={12} /> : <ExitIcon size={12} />}
                        <span>{v.status}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {v.status === 'Inside' ? (
                        <button
                          type="button"
                          className="wmn-btn-primary"
                          style={{
                            background: '#dc2626',
                            boxShadow: 'none',
                            padding: '6px 12px',
                            fontSize: '0.78rem'
                          }}
                          onClick={() => handleExitVehicle(v)}
                        >
                          <ExitIcon size={14} />
                          <span>Record Exit</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          Exited: {new Date(v.exitTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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

      {/* Entry Modal */}
      {modalOpen && (
        <div className="wmn-modal-overlay">
          <div className="wmn-modal-card" style={{ maxWidth: '520px' }}>
            <div className="wmn-modal-header">
              <div className="wmn-modal-title">
                <Car size={20} style={{ color: '#0891b2' }} />
                <h3>Record Vehicle Campus Entry</h3>
              </div>
              <button
                type="button"
                className="wmn-modal-close-btn"
                onClick={() => setModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEntrySubmit}>
              <div className="wmn-modal-body">
                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Vehicle Registration # <span className="req">*</span></label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. TN 09 AB 1234"
                      value={form.vehicleNumber}
                      onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value.toUpperCase() })}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Vehicle Type <span className="req">*</span></label>
                    <select
                      className="wmn-form-select"
                      value={form.vehicleType}
                      onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    >
                      {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Driver Name <span className="req">*</span></label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Ramesh Kumar"
                      value={form.driverName}
                      onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Driver Phone #</label>
                    <input
                      type="tel"
                      className="wmn-form-input"
                      placeholder="10-digit mobile"
                      value={form.driverPhone}
                      onChange={(e) => setForm({ ...form, driverPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wmn-form-grid-2">
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Entry Purpose <span className="req">*</span></label>
                    <select
                      className="wmn-form-select"
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                    >
                      {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Destination on Campus</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Faculty Parking Lot A"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    />
                  </div>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">Entry Gate</label>
                  <select
                    className="wmn-form-select"
                    value={form.gate}
                    onChange={(e) => setForm({ ...form, gate: e.target.value })}
                  >
                    {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="wmn-modal-footer">
                <button
                  type="button"
                  className="wmn-btn-sec"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  style={{ background: '#0891b2' }}
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : 'Record Vehicle Clearance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleRegisterPage;
