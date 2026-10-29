import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, UserCheck, CheckCircle2, QrCode, Printer, RotateCcw,
  Shield, Phone, Mail, Car, Building2, MapPin, AlertCircle, FileText,
  LogOut as ExitIcon, ExternalLink, ArrowRight, Download, LogIn
} from 'lucide-react';
import { recordVisitorEntry, recordVisitorCampusIn } from '../../api/index';
import { getGatePassUrl, getQrCodeImageUrl } from '../../utils/qrPassHelper';
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
  notes: '',
  immediateIn: false
};

const VisitorEntryPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [createdPass, setCreatedPass] = useState(null);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      setSuccessNotice('');
      const res = await recordVisitorEntry(payload);
      if (res.data?.success && res.data?.data) {
        setCreatedPass(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to record visitor entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickCampusIn = async () => {
    if (!createdPass?._id && !createdPass?.passNumber) return;
    try {
      setCheckingIn(true);
      setError('');
      const res = await recordVisitorCampusIn(createdPass._id || createdPass.passNumber, { gate: createdPass.gate || formData.gate });
      if (res.data?.success && res.data?.data) {
        setCreatedPass(res.data.data);
        setSuccessNotice(`Campus In recorded! Visitor ${res.data.data.name} is now Inside Campus.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record Campus In');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleDownloadQr = () => {
    if (!createdPass) return;
    const passCode = createdPass.passNumber || createdPass.visitorId;
    const verifyUrl = `${window.location.origin}/watchman/qr-verification?type=visitor&code=${encodeURIComponent(passCode)}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(verifyUrl)}`;

    fetch(qrImageUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitor_pass_${passCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open(qrImageUrl, '_blank');
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setCreatedPass(null);
    setError('');
    setSuccessNotice('');
  };

  return (
    <div className="wmn-page-container">
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <UserPlus size={24} style={{ color: '#2563eb' }} />
            <span>Visitor Entry & Individual QR Pass Generation</span>
          </h2>
          <p>Register campus visitors, generate individual QR passes, and manage entry/exit clearances</p>
        </div>

        {createdPass ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="wmn-btn-sec"
              onClick={() => navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}`)}
              title="Open pass in Visitor Pass Verification"
            >
              <QrCode size={16} style={{ color: '#2563eb' }} />
              <span>Verify Visitor Pass</span>
            </button>
            <button type="button" className="wmn-btn-sec" onClick={handleDownloadQr} title="Download pass QR image">
              <Download size={16} />
              <span>Download QR</span>
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
            background: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#f0fdf4' : '#eff6ff',
            border: `2px solid ${createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#86efac' : '#93c5fd'}`,
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#dcfce7' : '#dbeafe',
                color: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#166534' : '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, color: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#14532d' : '#1e3a8a', fontSize: '1.15rem', fontWeight: 800 }}>
                  {createdPass.status === 'Inside Campus' || createdPass.status === 'Inside'
                    ? 'Visitor Pass Issued & Logged Inside Campus!'
                    : 'Visitor Registered & Individual QR Pass Generated!'}
                </h3>
                <span style={{ fontSize: '0.82rem', color: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#166534' : '#1d4ed8' }}>
                  Pass ID: <strong style={{ fontFamily: 'monospace' }}>{createdPass.passNumber}</strong> • Visitor: <strong>{createdPass.name}</strong> • Status: <strong>{createdPass.status || 'Registered'}</strong>
                </span>
              </div>
            </div>

            {successNotice && (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 700 }}>
                ✓ {successNotice}
              </div>
            )}

            {/* Quick Action If Registered: 1-Click Login / Campus In */}
            {(createdPass.status === 'Registered' || (!createdPass.entryTime && createdPass.status !== 'Exited')) && (
              <div style={{
                background: '#ffffff',
                borderRadius: '10px',
                padding: '14px',
                border: '1.5px solid #bfdbfe',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.92rem' }}>
                    🟢 Ready for Campus In (Login)?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                    If the visitor is walking in now, record Campus In to mark them Inside Campus.
                  </div>
                </div>
                <button
                  type="button"
                  className="wmn-btn-primary"
                  style={{ background: '#059669', padding: '8px 16px', fontSize: '0.86rem', fontWeight: 800 }}
                  onClick={handleQuickCampusIn}
                  disabled={checkingIn}
                >
                  <LogIn size={16} />
                  <span>{checkingIn ? 'Recording In...' : 'Confirm Login / Campus In'}</span>
                </button>
              </div>
            )}

            {/* Guided Quick Navigation Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', marginTop: '14px' }}>
              <button
                type="button"
                className="wmn-btn-primary"
                style={{ background: '#2563eb', justifyContent: 'center', fontSize: '0.84rem', padding: '10px 14px' }}
                onClick={() => navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}`)}
              >
                <QrCode size={16} />
                <span>Verify Visitor Pass</span>
              </button>

              <button
                type="button"
                className="wmn-btn-sec"
                style={{ justifyContent: 'center', fontSize: '0.84rem', padding: '10px 14px' }}
                onClick={handleDownloadQr}
              >
                <Download size={16} />
                <span>Download Pass QR</span>
              </button>
            </div>
          </div>

          {/* Official Pass Voucher Card */}
          <div className="wmn-card" style={{ padding: '26px' }}>
            <div className="wmn-pass-card">
              <div className="wmn-pass-header">
                <div>
                  <div className="wmn-pass-org">CAMPUS VISITOR PASS</div>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>INDIVIDUAL SECURITY ENTRY VOUCHER</span>
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
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Current Status</span>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    fontWeight: 800,
                    fontSize: '0.76rem',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#dcfce7' : '#eff6ff',
                    color: createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#15803d' : '#1d4ed8',
                    border: `1px solid ${createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '#86efac' : '#bfdbfe'}`
                  }}>
                    {createdPass.status === 'Inside Campus' || createdPass.status === 'Inside' ? '🟢 Inside Campus' : '🔵 Registered (Pending Login)'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Entry Gate</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>{createdPass.gate}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Actual Entry Timestamp</span>
                  <strong style={{ display: 'block', color: createdPass.entryTime ? '#059669' : '#64748b' }}>
                    {createdPass.entryTime ? `${new Date(createdPass.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • ${new Date(createdPass.entryTime).toLocaleDateString()}` : 'Not yet entered (Pending Login)'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Registration Timestamp</span>
                  <strong style={{ display: 'block', color: '#0f172a' }}>
                    {createdPass.createdAt ? `${new Date(createdPass.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • ${new Date(createdPass.createdAt).toLocaleDateString()}` : 'Today'}
                  </strong>
                </div>
              </div>

              {/* Real Scannable Individual QR Pass Box */}
              <div className="wmn-pass-qr-box" style={{ textAlign: 'center', padding: '18px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                <img
                  src={getQrCodeImageUrl(getGatePassUrl(createdPass.passNumber || createdPass.visitorId, 'visitor'), 250)}
                  alt={`Unique QR Code for ${createdPass.passNumber}`}
                  style={{
                    width: '150px',
                    height: '150px',
                    margin: '0 auto 8px auto',
                    display: 'block',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    padding: '6px'
                  }}
                />
                <div style={{ fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', letterSpacing: '0.05em' }}>
                  {createdPass.passNumber}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '4px' }}>
                  <strong>Individual Visitor QR Pass:</strong> Linked specifically to {createdPass.name}. Scan or select in Visitor Pass Verification to record Campus In or Campus Out.
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                    onClick={handleDownloadQr}
                  >
                    <Download size={13} />
                    <span>Download QR</span>
                  </button>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.76rem', padding: '4px 10px', color: '#2563eb' }}
                    onClick={() => navigate(`/watchman/qr-verification?type=visitor&code=${encodeURIComponent(createdPass.passNumber || createdPass.visitorId)}`)}
                  >
                    <ExternalLink size={13} />
                    <span>Open in Verification Page</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(createdPass.status === 'Registered' || (!createdPass.entryTime && createdPass.status !== 'Exited')) && (
                <button
                  type="button"
                  className="wmn-btn-primary"
                  style={{ background: '#059669', borderColor: '#047857' }}
                  onClick={handleQuickCampusIn}
                  disabled={checkingIn}
                >
                  <LogIn size={16} />
                  <span>{checkingIn ? 'Recording In...' : 'Login / Campus In'}</span>
                </button>
              )}
              <button type="button" className="wmn-btn-sec" onClick={handleDownloadQr}>
                <Download size={16} />
                <span>Download QR Pass</span>
              </button>
              <button type="button" className="wmn-btn-sec" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Official Pass</span>
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
              {/* Optional Immediate Campus In */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <input
                  type="checkbox"
                  id="immediateIn"
                  name="immediateIn"
                  checked={formData.immediateIn}
                  onChange={handleChange}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="immediateIn" style={{ cursor: 'pointer', fontSize: '0.86rem', color: '#0f172a', fontWeight: 600 }}>
                  Immediately record Campus In / Login (Visitor is already at gate entering campus now)
                </label>
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
                {submitting ? 'Generating Pass...' : 'Register Visitor & Generate Individual QR Pass'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VisitorEntryPage;
