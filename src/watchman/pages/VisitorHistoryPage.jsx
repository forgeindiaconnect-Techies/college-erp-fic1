import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet
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
    e.preventDefault();
    fetchHistory();
  };

  const handleExportCSV = () => {
    if (!visitors.length) return;
    const headers = ['Pass ID', 'Name', 'Phone', 'Purpose', 'Person to Meet', 'Department', 'Entry Time', 'Exit Time', 'Status'];
    const rows = visitors.map((v) => [
      `"${v.passNumber || ''}"`,
      `"${v.visitorName || ''}"`,
      `"${v.phoneNumber || ''}"`,
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
          <button className="wm-btn wm-btn-secondary" onClick={handleExportCSV} disabled={visitors.length === 0}>
            <FileSpreadsheet size={16} color="#059669" />
            Export to CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="wm-card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: '1 1 260px' }}>
              <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                className="wm-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search visitor, phone, pass number, host..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
                  fetchHistory();
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="wm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
            Archived Visits ({visitors.length})
          </span>
          <button className="wm-btn wm-btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={fetchHistory}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="wm-table-container">
          <table className="wm-table">
            <thead>
              <tr>
                <th>Pass ID</th>
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
              ) : (!Array.isArray(visitors) || visitors.length === 0) ? (
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
                (Array.isArray(visitors) ? visitors : []).map((item) => (
                  <tr key={item._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                        {item.passNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.visitorName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.phoneNumber}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#1e293b' }}>{item.personToMeet}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.department}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#334155' }}>{item.purpose}</span>
                    </td>
                    <td>
                      {item.entryTime ? (
                        <>
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>
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
                          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>
                            {new Date(item.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(item.exitTime).toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontStyle: 'italic' }}>Inside Campus</span>
                      )}
                    </td>
                    <td>
                      {item.status === 'Inside' ? (
                        <span className="wm-badge wm-badge-success">● Inside</span>
                      ) : item.status === 'Checked Out' ? (
                        <span className="wm-badge wm-badge-secondary">Checked Out</span>
                      ) : (
                        <span className="wm-badge wm-badge-warning">Pre-Registered</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="wm-btn wm-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        onClick={() => setSelectedVisitor(item)}
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visitor Detail Modal */}
      {selectedVisitor && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 480 }}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Visitor Record Details</h2>
              <button className="wm-close-btn" onClick={() => setSelectedVisitor(null)}>×</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: '1.05rem' }}>
                  {selectedVisitor.passNumber}
                </span>
                <span className={`wm-badge ${selectedVisitor.status === 'Inside' ? 'wm-badge-success' : 'wm-badge-secondary'}`}>
                  {selectedVisitor.status}
                </span>
              </div>
              <h3 style={{ margin: '4px 0 0', color: '#0f172a', fontSize: '1.2rem' }}>
                {selectedVisitor.visitorName}
              </h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                Phone: {selectedVisitor.phoneNumber}
              </p>
            </div>

            <div className="wm-grid-2" style={{ gap: 12, marginBottom: 16, fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: '#64748b' }}>Person to Meet:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVisitor.personToMeet}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Department:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVisitor.department}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Purpose:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVisitor.purpose}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>ID Proof Type:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVisitor.idProofType} ({selectedVisitor.idProofNumber || 'Verified'})</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Vehicle Number:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVisitor.vehicleNumber || 'None'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Gate Post:</span>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>{selectedVisitor.gate}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Entry Timestamp:</span>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>
                  {selectedVisitor.entryTime ? new Date(selectedVisitor.entryTime).toLocaleString() : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Exit Timestamp:</span>
                <span style={{ fontWeight: 500, color: '#1e293b' }}>
                  {selectedVisitor.exitTime ? new Date(selectedVisitor.exitTime).toLocaleString() : 'Still On Campus'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="wm-btn wm-btn-secondary" onClick={() => setSelectedVisitor(null)}>
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
