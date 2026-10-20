import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, UserCheck, CheckCircle2, QrCode, Printer, RotateCcw,
  Shield, Phone, Mail, Car, Building2, MapPin, AlertCircle, FileText,
  LogOut as ExitIcon, ExternalLink, ArrowRight
} from 'lucide-react';
import { recordVisitorEntry } from '../../api/index';
import '../watchman.css';

const PURPOSES = [
  'Admissions Enquiry',
  'Parent Meeting / Ward Visit',
  'Guest Lecture / Speaker',
  'Official Campus Meeting / Vendor',
  'Placement Interview / Recruiter',
  'Maintenance / Facility Service',
  'Document Submission / Attestation',
  'Hostel Resident Visit',
  'Other'
];

const ID_TYPES = [
  'Aadhaar Card',
  'Driving License',
  'Voter ID',
  'PAN Card',
  'College ID',
  'Passport',
  'Other Government ID'
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const INITIAL_FORM = {
  name: '',
  phone: '',
  email: '',
  purpose: PURPOSES[0],
  customPurpose: '',
  personToMeet: '',
  department: 'General',
  vehicleNumber: '',
  idProofType: ID_TYPES[0],
  idProofNumber: '',
  gate: GATES[0],
  notes: ''
};

const VisitorEntryPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [createdPass, setCreatedPass] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.personToMeet.trim()) {
      setError('Visitor full name, 10-digit mobile number, and person to meet are mandatory.');
      return;
    }

    const payload = {
      ...formData,
      purpose: formData.purpose === 'Other' && formData.customPurpose ? formData.customPurpose : formData.purpose
    };

    try {
      setSubmitting(true);
      setError('');
      const res = await recordVisitorEntry(payload);
      if (res.data?.success) {
        setCreatedPass(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to record visitor entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setCreatedPass(null);
  };

  return (
    <div className="wmn-page-container">
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <UserPlus size={24} style={{ color: '#2563eb' }} />
            <span>Visitor Entry & Pass Generation</span>
          </h2>
          <p>Register campus visitors, verify statutory identification, and generate official visitor passes</p>
        </div>

        {createdPass ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => navigate('/watchman/visitor-exit')}
              title="View all active visitors currently on campus"
            >
              <ExitIcon size={16} style={{ color: '#dc2626' }} />
              <span>Active Visitors Log</span>
            </button>
            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}`)}
              title="Test pass in Gate QR Scanner"
            >
              <QrCode size={16} style={{ color: '#2563eb' }} />
              <span>Gate QR Scanner</span>
            </button>
            <button type="button" className="wmn-btn-sec" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print Pass</span>
            </button>
            <button type="button" className="wmn-btn-primary" onClick={handleReset}>
              <RotateCcw size={16} />
              <span>Register Next Visitor</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => navigate('/watchman/register-person?type=Student')}
              style={{ color: '#059669', borderColor: '#a7f3d0', background: '#ecfdf5' }}
              title="Register permanent Students & Staff"
            >
              <UserCheck size={16} style={{ color: '#059669' }} />
              <span>Register Student / Staff</span>
            </button>
            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => navigate('/watchman/visitor-exit')}
              title="View active visitors currently on campus"
            >
              <ExitIcon size={16} style={{ color: '#dc2626' }} />
              <span>Active Visitors Inside</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 18px', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {createdPass ? (
        /* Printable Visitor Pass Card & Guidance */
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          {/* Storage & Lifecycle Info Banner */}
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #86efac',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(22, 101, 52, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#14532d', fontSize: '1.15rem', fontWeight: 800 }}>
                  Visitor Pass Issued & Logged Inside Campus!
                </h3>
                <span style={{ fontSize: '0.82rem', color: '#166534' }}>
                  Pass ID: <strong style={{ fontFamily: 'monospace' }}>{createdPass.passNumber}</strong> • Visitor: <strong>{createdPass.name}</strong>
                </span>
              </div>
            </div>

            {/* Where It Is Stored Breakdown */}
            <div style={{
              background: '#ffffff',
              borderRadius: '10px',
              padding: '14px',
              border: '1px solid #bbf7d0',
              marginTop: '10px'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📍 Where is this visitor record stored now?
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#334155', lineHeight: 1.6 }}>
                <li>
                  <strong>Active Visitors & Exit:</strong> Stored under <em>Active Visitors</em> (Status: <strong>Inside Campus</strong>). When the visitor leaves, the watchman checks them out there.
                </li>
                <li>
                  <strong>Campus In / Out Control:</strong> Recorded as an official campus <strong>Gate Entry (IN)</strong> movement with timestamp.
                </li>
                <li>
                  <strong>Visitor History Logs:</strong> Saved permanently in the security database for audits and admin reporting.
                </li>
              </ul>
            </div>

            {/* Guided Quick Navigation Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', marginTop: '14px' }}>
              <button
                type="button"
                className="wmn-btn-primary"
                style={{ background: '#dc2626', justifyContent: 'center', fontSize: '0.84rem', padding: '10px 14px' }}
                onClick={() => navigate('/watchman/visitor-exit')}
              >
                <ExitIcon size={16} />
                <span>Go to Active Visitors & Exit</span>
              </button>

              <button
                type="button"
                className="wmn-btn-primary"
                style={{ background: '#2563eb', justifyContent: 'center', fontSize: '0.84rem', padding: '10px 14px' }}
                onClick={() => navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}`)}
              >
                <QrCode size={16} />
                <span>Open Pass in Gate Scanner</span>
              </button>
            </div>
          </div>

          {/* Official Pass Voucher Card */}
          <div className="wmn-card" style={{ padding: '26px' }}>
            <div className="wmn-pass-card">
              <div className="wmn-pass-header">
                <div>
                  <div className="wmn-pass-org">CAMPUS VISITOR PASS</div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>SECURITY GATE ENTRY VOUCHER</span>
                </div>
                <div className="wmn-pass-badge">
                  PASS: {createdPass.passNumber}
                </div>
              </div>

              <div className="wmn-pass-details">
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Visitor Name</span>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '1rem' }}>{createdPass.name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Mobile #</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{createdPass.phone}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Person to Meet</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{createdPass.personToMeet}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Department</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{createdPass.department}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Purpose of Visit</span>
                  <strong style={{ display: 'block', color: '#2563eb' }}>{createdPass.purpose}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>ID Proof Verified</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{createdPass.idProofType}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Vehicle #</span>
                  <strong style={{ display: 'block', color: '#0f172a', fontFamily: 'monospace' }}>{createdPass.vehicleNumber || 'Pedestrian'}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Entry Timestamp</span>
                  <strong style={{ display: 'block', color: '#059669' }}>
                    {new Date(createdPass.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {new Date(createdPass.entryTime).toLocaleDateString()}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Entry Gate</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{createdPass.gate}</strong>
                </div>
              </div>

              {/* Real Scannable QR Barcode Box */}
              <div className="wmn-pass-qr-box" style={{ textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=6&data=${encodeURIComponent(
                    `${window.location.origin}/verify-gate-pass?code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}&type=visitor`
                  )}`}
                  alt={`QR Code for ${createdPass.passNumber}`}
                  style={{
                    width: '140px',
                    height: '140px',
                    margin: '0 auto 8px auto',
                    display: 'block',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    padding: '4px'
                  }}
                />
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>
                  {createdPass.passNumber}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '4px' }}>
                  <strong>How to scan:</strong> Point any smartphone camera or gate barcode reader at this QR to verify identity and check out at exit gate.
                </div>
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={() => navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}`)}
                  >
                    <span>Click here to test scan this pass in Gate Scanner</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="wmn-btn-primary" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Official Pass</span>
              </button>
              <button
                type="button"
                className="wmn-btn-sec"
                onClick={() => navigate('/watchman/visitor-exit')}
              >
                <ExitIcon size={16} />
                <span>Go to Active Visitors</span>
              </button>
              <button type="button" className="wmn-btn-sec" onClick={handleReset}>
                <RotateCcw size={16} />
                <span>Register Another Visitor</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Visitor Entry Form */
        <div className="wmn-card" style={{ maxWidth: '880px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Visitor Credentials & Meeting Details
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Fill in candidate details to generate official campus gate clearance voucher
              </p>
            </div>

            <div className="wmn-form-grid-2">
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Visitor Full Legal Name <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="wmn-form-input"
                  placeholder="e.g. Ananya Sundaram"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>

              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  10-Digit Mobile Number <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  maxLength={10}
                  className="wmn-form-input"
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="wmn-form-grid-2">
              <div className="wmn-form-group">
                <label className="wmn-form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  name="email"
                  className="wmn-form-input"
                  placeholder="e.g. visitor@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Purpose of Visit <span className="req">*</span>
                </label>
                <select
                  name="purpose"
                  className="wmn-form-select"
                  value={formData.purpose}
                  onChange={handleChange}
                >
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {formData.purpose === 'Other' && (
              <div className="wmn-form-group">
                <label className="wmn-form-label">Specify Custom Purpose <span className="req">*</span></label>
                <input
                  type="text"
                  name="customPurpose"
                  className="wmn-form-input"
                  placeholder="Explain purpose of visit..."
                  value={formData.customPurpose}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="wmn-form-grid-2">
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Person to Meet (Staff / Student / Admin) <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="personToMeet"
                  className="wmn-form-input"
                  placeholder="e.g. Dr. Agila (HOD IT) or Principal"
                  value={formData.personToMeet}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="wmn-form-group">
                <label className="wmn-form-label">Department / Office</label>
                <input
                  type="text"
                  name="department"
                  className="wmn-form-input"
                  placeholder="e.g. Computer Science, Admin Block, Admissions"
                  value={formData.department}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ marginTop: '10px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Identity Proof & Vehicle Verification
              </h4>

              <div className="wmn-form-grid-2">
                <div className="wmn-form-group">
                  <label className="wmn-form-label">
                    ID Proof Type <span className="req">*</span>
                  </label>
                  <select
                    name="idProofType"
                    className="wmn-form-select"
                    value={formData.idProofType}
                    onChange={handleChange}
                  >
                    {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">ID Document Number</label>
                  <input
                    type="text"
                    name="idProofNumber"
                    className="wmn-form-input"
                    placeholder="e.g. Aadhaar last 4 digits / DL number"
                    value={formData.idProofNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="wmn-form-grid-2">
                <div className="wmn-form-group">
                  <label className="wmn-form-label">Vehicle Registration # (Optional)</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    className="wmn-form-input"
                    placeholder="e.g. TN 09 AB 1234 (Leave blank if pedestrian)"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                  />
                </div>

                <div className="wmn-form-group">
                  <label className="wmn-form-label">
                    Entry Gate Post <span className="req">*</span>
                  </label>
                  <select
                    name="gate"
                    className="wmn-form-select"
                    value={formData.gate}
                    onChange={handleChange}
                  >
                    {GATES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="wmn-form-group">
                <label className="wmn-form-label">Gate Officer Remarks / Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  className="wmn-form-textarea"
                  placeholder="e.g. Laptop bag verified, visitor directed to Dean office"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="wmn-btn-sec"
                onClick={() => navigate('/watchman/dashboard')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="wmn-btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Generating Pass...' : 'Confirm Entry & Issue Pass'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VisitorEntryPage;
