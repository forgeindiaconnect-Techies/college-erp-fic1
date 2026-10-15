import React, { useState, useEffect } from 'react';
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
      setError(err?.response?.data?.message || 'Failed to submit incident report.');
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
          <table className="wm-table">
            <thead>
              <tr>
                <th>Incident Details</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Location & Gate</th>
                <th>Reported At</th>
                <th>Status</th>
                <th>Action</th>
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
                (Array.isArray(incidents) ? incidents : []).map((inc) => (
                  <tr key={inc._id}>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{inc.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{inc.description}</div>
                      {inc.actionTaken && (
                        <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 4 }}>
                          Action: {inc.actionTaken}
                        </div>
                      )}
                      {inc.resolution && (
                        <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: 4 }}>
                          Resolution: {inc.resolution}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#334155' }}>
                        {inc.category}
                      </span>
                    </td>
                    <td>{getSeverityBadge(inc.severity)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', color: '#1e293b' }}>
                        <MapPin size={13} color="#64748b" />
                        {inc.location}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: 17 }}>
                        {inc.gate || 'Campus Area'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b' }}>
                        {new Date(inc.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(inc.reportedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      {inc.status === 'Resolved' ? (
                        <span className="wm-badge wm-badge-success">Resolved</span>
                      ) : inc.status === 'Under Investigation' ? (
                        <span className="wm-badge wm-badge-warning">Under Review</span>
                      ) : (
                        <span className="wm-badge wm-badge-danger">Open</span>
                      )}
                    </td>
                    <td>
                      {inc.status !== 'Resolved' ? (
                        <button
                          className="wm-btn wm-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#059669' }}
                          onClick={() => setResolveTarget(inc)}
                        >
                          Resolve
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Closed</span>
                      )}
                    </td>
                  </tr>
                ))
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

            <form onSubmit={handleCreate}>
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
