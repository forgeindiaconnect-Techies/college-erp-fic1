import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  Eye,
  RefreshCw,
  User,
  Phone,
  Building,
  CheckCircle,
  FileSpreadsheet,
  QrCode,
  X
} from 'lucide-react';
import { getVisitorHistory } from '../../api';
import '../watchman.css';

const VisitorHistoryPage = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getVisitorHistory({ search, status, startDate, endDate });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setVisitors(list);
    } catch (err) {
      console.error('Failed to load visitor history:', err);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [status]);

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    fetchHistory();
  };

  // Immediate reactive search filter on loaded records
  const filteredVisitors = useMemo(() => {
    if (!Array.isArray(visitors)) return [];
    if (!search.trim()) return visitors;
    const q = search.trim().toLowerCase();
    return visitors.filter((v) => {
      const name = (v.name || v.visitorName || '').toLowerCase();
      const phone = (v.phone || v.phoneNumber || '');
      const pass = (v.passNumber || v.visitorId || '').toLowerCase();
      const host = (v.personToMeet || '').toLowerCase();
      const dept = (v.department || '').toLowerCase();
      const purpose = (v.purpose || '').toLowerCase();
      const vehicle = (v.vehicleNumber || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || pass.includes(q) || host.includes(q) || dept.includes(q) || purpose.includes(q) || vehicle.includes(q);
    });
  }, [visitors, search]);

  const handleExportCSV = () => {
    if (!filteredVisitors.length) return;
    const headers = ['Pass ID', 'Name', 'Phone', 'Purpose', 'Person to Meet', 'Department', 'Entry Time', 'Exit Time', 'Status'];
    const rows = filteredVisitors.map((v) => [
      `"${v.passNumber || v.visitorId || ''}"`,
      `"${v.name || v.visitorName || ''}"`,
      `"${v.phone || v.phoneNumber || ''}"`,
      `"${v.purpose || ''}"`,
      `"${v.personToMeet || ''}"`,
      `"${v.department || ''}"`,
      `"${v.entryTime ? new Date(v.entryTime).toLocaleString() : ''}"`,
      `"${v.exitTime ? new Date(v.exitTime).toLocaleString() : ''}"`,
      `"${v.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `visitor_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="wm-page">
      <div className="wm-header">
        <div>
          <h1 className="wm-title">Visitor History & Records</h1>
          <p className="wm-subtitle">Complete chronological archive of all campus guest entries, passes, and exits</p>
        </div>
        <div className="wm-header-actions">
          <button className="wm-btn wm-btn-secondary" onClick={handleExportCSV} disabled={filteredVisitors.length === 0}>
            <FileSpreadsheet size={16} color="#059669" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="wm-card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="wm-input"
                style={{ paddingLeft: 38, width: '100%' }}
                placeholder="Search visitor, phone, pass number, host..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="wm-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="">All Statuses</option>
                <option value="Inside">Inside Campus</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Pre-Registered">Pre-Registered</option>
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>From:</span>
                <input
                  type="date"
                  className="wm-input"
                  style={{ width: 140, padding: '7px 10px' }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>To:</span>
                <input
                  type="date"
                  className="wm-input"
                  style={{ width: 140, padding: '7px 10px' }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <button type="submit" className="wm-btn wm-btn-primary">
                Filter
              </button>
              <button
                type="button"
                className="wm-btn wm-btn-secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setStartDate('');
                  setEndDate('');
                  getVisitorHistory().then(res => {
                    const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
                    setVisitors(list);
                  });
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Main Records Table */}
      <div className="wm-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
            Archived Visits ({filteredVisitors.length})
          </h3>
          <button className="wm-btn wm-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={fetchHistory}>
            <RefreshCw size={14} className={loading ? 'wm-spin' : ''} />
            Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="wm-table">
            <thead>
              <tr>
                <th>Pass #</th>
                <th>Visitor</th>
                <th>Host & Dept</th>
                <th>Purpose</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading historical records...</p>
                  </td>
                </tr>
              ) : filteredVisitors.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="wm-empty">
                      <History size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div className="wm-empty-title">No visitor records found</div>
                      <p className="wm-empty-desc">No visits match the selected search or date range filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVisitors.map((item) => {
                  const passNum = item.passNumber || item.visitorId || 'PASS';
                  const visitorName = item.name || item.visitorName || 'Visitor';
                  const phoneNumber = item.phone || item.phoneNumber || '—';

                  return (
                    <tr key={item._id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                          {passNum}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{visitorName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{phoneNumber}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>{item.personToMeet}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.department}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#334155' }}>{item.purpose}</span>
                      </td>
                      <td>
                        {item.entryTime ? (
                          <>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                              {new Date(item.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {new Date(item.entryTime).toLocaleDateString()}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td>
                        {item.exitTime ? (
                          <>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                              {new Date(item.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {new Date(item.exitTime).toLocaleDateString()}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>Inside Campus</span>
                        )}
                      </td>
                      <td>
                        {item.status === 'Inside' ? (
                          <span className="wm-badge wm-badge-success">● Inside</span>
                        ) : item.status === 'Checked Out' ? (
                          <span className="wm-badge wm-badge-secondary">Checked Out</span>
                        ) : (
                          <span className="wm-badge wm-badge-warning">{item.status || 'Pre-Registered'}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="wm-btn wm-btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', gap: 4 }}
                          onClick={() => setSelectedVisitor(item)}
                        >
                          <Eye size={13} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="wm-modal-overlay" onClick={() => setSelectedVisitor(null)} style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, position: 'fixed', inset: 0, padding: '16px' }}>
          <div className="wm-modal-content" style={{ maxWidth: 560, width: '100%', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', overflow: 'hidden', border: '1px solid #cbd5e1', animation: 'fadeIn 0.2s ease-out', position: 'relative', zIndex: 10001 }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Visitor Record Details
                </h3>
              </div>
              <button
                type="button"
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
                onClick={() => setSelectedVisitor(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '22px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
              {/* Profile Card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)' }}>
                  {(selectedVisitor.name || selectedVisitor.visitorName || 'V')[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800 }}>
                      {selectedVisitor.name || selectedVisitor.visitorName || 'Visitor'}
                    </h4>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', padding: '2px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                      {selectedVisitor.passNumber || selectedVisitor.visitorId || 'PASS'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: selectedVisitor.status === 'Inside' ? '#ecfdf5' : '#f1f5f9', color: selectedVisitor.status === 'Inside' ? '#059669' : '#475569', border: '1px solid', borderColor: selectedVisitor.status === 'Inside' ? '#a7f3d0' : '#cbd5e1' }}>
                      {selectedVisitor.status || 'Archived'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📞 Phone:</span>
                    <strong style={{ color: '#0f172a' }}>{selectedVisitor.phone || selectedVisitor.phoneNumber || 'Not Provided'}</strong>
                  </div>
                </div>
              </div>

              {/* Grid 1: Visit Specifications */}
              <div style={{ marginBottom: '18px' }}>
                <h5 style={{ margin: '0 0 10px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 800 }}>
                  Visit Details & Authorization
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Person to Meet</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedVisitor.personToMeet || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Department</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedVisitor.department || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Purpose</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedVisitor.purpose || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>ID Proof Type</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      {selectedVisitor.idProofType || 'Standard ID'} ({selectedVisitor.idProofNumber || 'Verified'})
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Vehicle Number</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedVisitor.vehicleNumber || 'None (Pedestrian)'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Gate Post</span>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{selectedVisitor.gate || 'Gate 1 (Main Entrance)'}</strong>
                  </div>
                </div>
              </div>

              {/* Grid 2: Timeline Breakdown */}
              <div>
                <h5 style={{ margin: '0 0 10px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 800 }}>
                  Gate Movement Timeline
                </h5>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Entry Clearance Timestamp:</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      {selectedVisitor.entryTime ? new Date(selectedVisitor.entryTime).toLocaleString() : '—'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Exit Clearance Timestamp:</span>
                    <strong style={{ fontSize: '0.85rem', color: selectedVisitor.exitTime ? '#0f172a' : '#059669' }}>
                      {selectedVisitor.exitTime ? new Date(selectedVisitor.exitTime).toLocaleString() : 'Currently Inside Campus'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 22px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <button
                type="button"
                className="wm-btn wm-btn-secondary"
                style={{ padding: '8px 22px', fontWeight: 700, borderRadius: '8px' }}
                onClick={() => setSelectedVisitor(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorHistoryPage;
