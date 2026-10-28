import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  PlusCircle,
  Filter,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  MapPin,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { getSecurityIncidents, reportSecurityIncident, updateSecurityIncident } from '../../api';
import '../watchman.css';

const IncidentReportsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Current session & administrative permissions
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(
        sessionStorage.getItem('user_session') ||
        sessionStorage.getItem('watchman_session') ||
        sessionStorage.getItem('admin_session') ||
        localStorage.getItem('erp_user') ||
        '{}'
      );
    } catch (_) {
      return {};
    }
  }, []);
  const canResolve = ['Admin', 'Super Admin', 'Principal', 'Sub Admin'].includes(currentUser?.role);

  // Resolution modal state
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Suspicious Activity',
    severity: 'Medium',
    location: '',
    gate: 'Main Gate 1',
    description: '',
    actionTaken: ''
  });

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await getSecurityIncidents({ status: statusFilter, severity: severityFilter });
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []);
      setIncidents(list);
    } catch (err) {
      console.error('Failed to load incidents:', err);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, severityFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.location.trim()) {
      setError('Title, Location, and Description are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await reportSecurityIncident(formData);
      setSuccess('Incident reported successfully and alert sent to security manager!');
      setShowModal(false);
      setFormData({
        title: '',
        category: 'Suspicious Activity',
        severity: 'Medium',
        location: '',
        gate: 'Main Gate 1',
        description: '',
        actionTaken: ''
      });
      fetchIncidents();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const serverErr = err?.response?.data?.error || err?.response?.data?.message;
      setError(serverErr || 'Failed to submit incident report. Please check required fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveTarget) return;
    try {
      setResolving(true);
      await updateSecurityIncident(resolveTarget._id, {
        status: 'Resolved',
        resolution: resolutionNote || 'Incident resolved and verified by security on duty.'
      });
      setSuccess('Incident marked as Resolved!');
      setResolveTarget(null);
      setResolutionNote('');
      fetchIncidents();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to update incident status.');
    } finally {
      setResolving(false);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'Critical':
        return <span className="wm-badge wm-badge-danger" style={{ fontWeight: 700 }}>CRITICAL</span>;
      case 'High':
        return <span className="wm-badge wm-badge-danger">HIGH</span>;
      case 'Medium':
        return <span className="wm-badge wm-badge-warning">MEDIUM</span>;
      default:
        return <span className="wm-badge wm-badge-secondary">LOW</span>;
    }
  };

  const formatIncidentDate = (inc) => {
    const raw = inc.reportedAt || inc.incidentTime || inc.createdAt || inc.timestamp;
    if (!raw) return { time: '—', date: '—' };
    const d = new Date(raw);
    if (isNaN(d.getTime())) return { time: '—', date: '—' };
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
    };
  };

  return (
    <div className="wm-page">
      <div className="wm-header">
        <div>
          <h1 className="wm-title">Emergency & Incident Reports</h1>
          <p className="wm-subtitle">Log security breaches, suspicious campus events, emergencies, and safety alerts</p>
        </div>
        <div className="wm-header-actions">
          <button
            className="wm-btn wm-btn-danger"
            onClick={() => { setError(''); setShowModal(true); }}
          >
            <ShieldAlert size={17} />
            Report Incident
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

      {/* Filter Bar */}
      <div className="wm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={16} color="#64748b" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Filters:</span>
            <select
              className="wm-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 150 }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              className="wm-select"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="">All Severities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <button className="wm-btn wm-btn-secondary" onClick={fetchIncidents} title="Refresh">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Incidents List */}
      <div className="wm-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="wm-table-container">
          <table className="wm-table" style={{ width: '100%', minWidth: '940px', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Incident Details</th>
                <th style={{ width: '15%' }}>Category</th>
                <th style={{ width: '11%' }}>Severity</th>
                <th style={{ width: '15%' }}>Location & Gate</th>
                <th style={{ width: '13%' }}>Reported At</th>
                <th style={{ width: '7%' }}>Status</th>
                <th style={{ width: '5%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <RefreshCw className="wm-spin" size={24} style={{ margin: '0 auto 8px' }} />
                    <p>Loading incident reports...</p>
                  </td>
                </tr>
              ) : (!Array.isArray(incidents) || incidents.length === 0) ? (
                <tr>
                  <td colSpan="7">
                    <div className="wm-empty">
                      <CheckCircle size={40} style={{ color: '#10b981', marginBottom: 12 }} />
                      <div className="wm-empty-title">All Clear! No Active Incidents</div>
                      <p className="wm-empty-desc">No security incidents match the selected filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                (Array.isArray(incidents) ? incidents : []).map((inc) => {
                  const dateTime = formatIncidentDate(inc);
                  const showGate = inc.gate && inc.location && inc.gate.trim().toLowerCase() !== inc.location.trim().toLowerCase();

                  return (
                    <tr key={inc._id}>
                      <td style={{ verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem', lineHeight: '1.35' }}>{inc.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, lineHeight: '1.45', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                          {inc.description}
                        </div>
                        {inc.actionTaken && (
                          <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 6, lineHeight: '1.35', wordBreak: 'break-word' }}>
                            <strong style={{ fontWeight: 600 }}>Action:</strong> {inc.actionTaken}
                          </div>
                        )}
                        {(inc.resolutionNotes || inc.resolution) && (
                          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4, lineHeight: '1.35', wordBreak: 'break-word' }}>
                            <strong style={{ fontWeight: 600 }}>Resolution:</strong> {inc.resolutionNotes || inc.resolution}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 14px', wordBreak: 'break-word' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#334155',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          lineHeight: '1.3'
                        }}>
                          {inc.category}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        {getSeverityBadge(inc.severity)}
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 14px', wordBreak: 'break-word' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: '0.83rem', color: '#1e293b', fontWeight: 500 }}>
                          <MapPin size={14} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{inc.location || 'Campus'}</span>
                        </div>
                        {showGate && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: 19, marginTop: 2 }}>
                            {inc.gate}
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#1e293b' }}>
                          {dateTime.time}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 2 }}>
                          {dateTime.date}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 14px' }}>
                        {inc.status === 'Resolved' ? (
                          <span className="wm-badge wm-badge-success">Resolved</span>
                        ) : inc.status === 'Under Investigation' ? (
                          <span className="wm-badge wm-badge-warning">Under Review</span>
                        ) : (
                          <span className="wm-badge wm-badge-danger">Open</span>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'top', padding: '12px 14px', textAlign: 'right' }}>
                        {inc.status === 'Resolved' || inc.status === 'Closed' ? (
                          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>✓ Resolved</span>
                        ) : canResolve ? (
                          <button
                            className="wm-btn wm-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#059669', borderColor: '#a7f3d0' }}
                            onClick={() => setResolveTarget(inc)}
                          >
                            Resolve
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Pending Admin</span>
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

      {/* Report Incident Modal */}
      {showModal && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 540 }}>
            <div className="wm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} color="#dc2626" />
                <h2 className="wm-modal-title">Report Security Incident</h2>
              </div>
              <button className="wm-close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px 24px' }}>
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
              <div className="wm-form-group">
                <label className="wm-label">Incident Title *</label>
                <input
                  type="text"
                  required
                  className="wm-input"
                  placeholder="e.g. Unauthorized entry attempt at Gate 2"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Category *</label>
                  <select
                    className="wm-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Suspicious Activity">Suspicious Activity</option>
                    <option value="Trespassing">Trespassing</option>
                    <option value="Unauthorized Vehicle">Unauthorized Vehicle</option>
                    <option value="Property Damage">Property Damage</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Fight / Disorder">Fight / Disorder</option>
                    <option value="Lost & Found">Lost & Found</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Severity Level *</label>
                  <select
                    className="wm-select"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  >
                    <option value="Low">Low - Minor Notice</option>
                    <option value="Medium">Medium - Attention Needed</option>
                    <option value="High">High - Urgent Action</option>
                    <option value="Critical">Critical - Immediate Emergency</option>
                  </select>
                </div>
              </div>

              <div className="wm-grid-2" style={{ gap: 12 }}>
                <div className="wm-form-group">
                  <label className="wm-label">Location in Campus *</label>
                  <input
                    type="text"
                    required
                    className="wm-input"
                    placeholder="e.g. Near Science Block Parking"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div className="wm-form-group">
                  <label className="wm-label">Gate / Post</label>
                  <input
                    type="text"
                    className="wm-input"
                    placeholder="e.g. Main Gate 1"
                    value={formData.gate}
                    onChange={(e) => setFormData({ ...formData, gate: e.target.value })}
                  />
                </div>
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Incident Description *</label>
                <textarea
                  required
                  rows="3"
                  className="wm-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Provide detailed description of what happened, persons involved, etc."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="wm-form-group">
                <label className="wm-label">Immediate Action Taken</label>
                <input
                  type="text"
                  className="wm-input"
                  placeholder="e.g. Detained suspect, informed Chief Warden"
                  value={formData.actionTaken}
                  onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
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
                  className="wm-btn"
                  style={{ background: '#dc2626', color: '#fff', fontWeight: 600 }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Incident Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Incident Modal */}
      {resolveTarget && (
        <div className="wm-modal-overlay">
          <div className="wm-modal-content" style={{ maxWidth: 440 }}>
            <div className="wm-modal-header">
              <h2 className="wm-modal-title">Resolve Incident</h2>
              <button className="wm-close-btn" onClick={() => setResolveTarget(null)}>×</button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: 16 }}>
              Mark <strong>"{resolveTarget.title}"</strong> as resolved.
            </p>
            <form onSubmit={handleResolve}>
              <div className="wm-form-group">
                <label className="wm-label">Resolution Notes *</label>
                <textarea
                  required
                  rows="3"
                  className="wm-input"
                  placeholder="Explain how the incident was handled or resolved..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="wm-btn wm-btn-secondary"
                  onClick={() => setResolveTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wm-btn wm-btn-success"
                  disabled={resolving}
                >
                  {resolving ? 'Updating...' : 'Mark as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentReportsPage;
