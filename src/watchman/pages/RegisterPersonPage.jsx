import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserPlus, GraduationCap, UserCheck, ShieldCheck, User,
  CheckCircle2, AlertCircle, QrCode, Printer, Download, Eye,
  ArrowRight, RotateCcw, Building2, Phone, Mail, Car, CreditCard,
  Sparkles, ExternalLink, Shield, Check
} from 'lucide-react';
import { registerCampusPerson, recordCampusIn } from '../../api';
import { getGatePassUrl, getQrCodeImageUrl } from '../../utils/qrPassHelper';
import '../watchman.css';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Electrical & Electronics Engineering',
  'Civil Engineering',
  'Electronics & Communication Engineering',
  'Management Studies / MBA',
  'Science & Humanities',
  'Administration & General'
];

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const RegisterPersonPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get('type');
  const validTypes = ['Student', 'Staff', 'HOD', 'Visitor'];
  const initialType = validTypes.includes(typeParam) ? typeParam : 'Student';

  // Active Person Type tab: 'Student' | 'Staff' | 'HOD' | 'Visitor'
  const [personType, setPersonType] = useState(initialType);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    personId: '',
    phone: '',
    email: '',
    department: 'Computer Science & Engineering',
    designation: '',
    batch: '2026',
    semester: '1',
    vehicleNumber: '',
    idProofType: 'College ID Card',
    idProofNumber: '',
    gate: 'Gate 1 (Main Entrance)',
    purpose: '',
    personToMeet: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registeredPerson, setRegisteredPerson] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (error) setError('');
  };

  const handleTypeChange = (type) => {
    setPersonType(type);
    setError('');
    // Auto-fill sensible defaults for designation / ID proof
    if (type === 'Student') {
      setFormData(prev => ({ ...prev, designation: 'Student', idProofType: 'College ID Card' }));
    } else if (type === 'Staff') {
      setFormData(prev => ({ ...prev, designation: 'Assistant Professor', idProofType: 'Staff Employee ID' }));
    } else if (type === 'HOD') {
      setFormData(prev => ({ ...prev, designation: 'Head of Department (HOD)', idProofType: 'Staff Employee ID' }));
    } else {
      setFormData(prev => ({ ...prev, designation: 'Campus Visitor', idProofType: 'Aadhaar Card' }));
    }
  };

  useEffect(() => {
    if (typeParam && validTypes.includes(typeParam) && typeParam !== personType) {
      handleTypeChange(typeParam);
    }
  }, [typeParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please provide the full name.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide a contact mobile number.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const payload = {
        name: formData.name.trim(),
        personType,
        personId: formData.personId.trim() || undefined,
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        department: formData.department,
        designation: formData.designation.trim() || (personType === 'HOD' ? 'Head of Department' : personType === 'Staff' ? 'Faculty' : personType === 'Student' ? 'Student' : 'Visitor'),
        batch: formData.batch,
        semester: formData.semester,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        idProofType: formData.idProofType,
        idProofNumber: formData.idProofNumber.trim(),
        notes: personType === 'Visitor' ? `Purpose: ${formData.purpose || 'Official Visit'} | Meet: ${formData.personToMeet || 'Department'}` : formData.notes
      };

      const res = await registerCampusPerson(payload);
        const personData = res.data.data;
        const verifyUrl = getGatePassUrl(personData.personId, personData.personType || personType);
        personData.qrCodeUrl = getQrCodeImageUrl(verifyUrl, 300);
        personData.verifyUrl = verifyUrl;
        setRegisteredPerson(personData);
        setSuccess(res.data.message || `${personType} registered successfully.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register person. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Immediate Campus In (Login) Action
  const handleImmediateCampusIn = async () => {
    if (!registeredPerson) return;
    try {
      setCheckingIn(true);
      setError('');
      const res = await recordCampusIn({
        personId: registeredPerson.personId,
        gate: formData.gate,
        remarks: 'Direct Entry upon Registration'
      });
      if (res.data?.success) {
        setSuccess(`Campus Entry Recorded! ${registeredPerson.name} (${registeredPerson.personId}) is now marked INSIDE CAMPUS.`);
        setRegisteredPerson(prev => ({ ...prev, currentStatus: 'Inside Campus' }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record entry');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleDownloadQr = () => {
    if (!registeredPerson?.qrCodeUrl) return;
    const a = document.createElement('a');
    a.href = registeredPerson.qrCodeUrl;
    a.download = `QR-${registeredPerson.personId}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setRegisteredPerson(null);
    setFormData({
      name: '',
      personId: '',
      phone: '',
      email: '',
      department: 'Computer Science & Engineering',
      designation: personType === 'HOD' ? 'Head of Department (HOD)' : personType === 'Staff' ? 'Assistant Professor' : personType === 'Student' ? 'Student' : 'Campus Visitor',
      batch: '2026',
      semester: '1',
      vehicleNumber: '',
      idProofType: 'College ID Card',
      idProofNumber: '',
      gate: 'Gate 1 (Main Entrance)',
      purpose: '',
      personToMeet: '',
      notes: ''
    });
    setError('');
    setSuccess('');
  };

  return (
    <div className="wmn-page-container">
      {/* Page Header */}
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <UserCheck size={24} style={{ color: '#059669' }} />
            <span>Register Student / Staff & Generate Gate QR Pass</span>
          </h2>
          <p>Statutory registration for Students, Faculty, Staff, and HODs with instant Gate QR Code generation</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="wmn-btn-sec"
            onClick={() => navigate('/watchman/visitor-entry')}
            style={{ color: '#6d28d9', borderColor: '#ddd6fe', background: '#f5f3ff' }}
            title="Switch to New Visitor Entry Pass"
          >
            <UserPlus size={16} style={{ color: '#7c3aed' }} />
            <span>New Visitor Entry</span>
          </button>
          <button
            type="button"
            className="wmn-btn-sec"
            onClick={() => navigate('/watchman/qr-verification')}
          >
            <QrCode size={16} style={{ color: '#2563eb' }} />
            <span>Open QR Scanner</span>
          </button>
          <button
            type="button"
            className="wmn-btn-sec"
            onClick={() => navigate('/watchman/campus-in-out')}
          >
            <ShieldCheck size={16} style={{ color: '#059669' }} />
            <span>Campus Directory</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {success && (
        <div style={{
          padding: '12px 16px',
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          color: '#065f46',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* IF REGISTERED: SHOW OFFICIAL QR PASS CARD */}
      {registeredPerson ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'start' }}>
          {/* Card Left: Official ID / Gate Pass */}
          <div className="wmn-card" style={{ border: '2px solid #2563eb', padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px dashed #e2e8f0',
              paddingBottom: '16px',
              marginBottom: '18px'
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  background: '#eff6ff',
                  color: '#1e40af',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}>
                  Official Campus Access Pass
                </span>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>{registeredPerson.name}</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {registeredPerson.personType} • {registeredPerson.department}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  color: '#2563eb',
                  display: 'block'
                }}>
                  {registeredPerson.personId}
                </span>
                <span style={{
                  display: 'inline-block',
                  marginTop: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: registeredPerson.currentStatus === 'Inside Campus' ? '#ecfdf5' : '#f1f5f9',
                  color: registeredPerson.currentStatus === 'Inside Campus' ? '#059669' : '#64748b'
                }}>
                  {registeredPerson.currentStatus === 'Inside Campus' ? '🟢 Inside Campus' : '⚪ Outside Campus'}
                </span>
              </div>
            </div>

            {/* Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '14px',
              fontSize: '0.84rem',
              marginBottom: '20px'
            }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Designation / Year</span>
                <strong style={{ color: '#0f172a' }}>{registeredPerson.designation || 'General'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Contact Phone</span>
                <strong style={{ color: '#0f172a' }}>📞 {registeredPerson.phone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Vehicle Number</span>
                <strong style={{ color: '#0f172a' }}>🚗 {registeredPerson.vehicleNumber || 'Pedestrian'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>ID Proof</span>
                <strong style={{ color: '#0f172a' }}>{registeredPerson.idProofType} {registeredPerson.idProofNumber ? `(${registeredPerson.idProofNumber})` : ''}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {registeredPerson.currentStatus !== 'Inside Campus' && (
                <button
                  type="button"
                  className="wmn-btn-primary"
                  style={{ background: '#059669', flex: 1, justifyContent: 'center' }}
                  onClick={handleImmediateCampusIn}
                  disabled={checkingIn}
                >
                  <Check size={18} />
                  <span>{checkingIn ? 'Recording...' : 'Record Campus In (Login)'}</span>
                </button>
              )}

              <button
                type="button"
                className="wmn-btn-sec"
                onClick={() => navigate(`/watchman/qr-verification?code=${encodeURIComponent(registeredPerson.personId)}`)}
              >
                <QrCode size={16} style={{ color: '#2563eb' }} />
                <span>Test in Scanner</span>
              </button>

              <button type="button" className="wmn-btn-sec" onClick={handlePrint}>
                <Printer size={16} />
                <span>Print Pass Card</span>
              </button>

              <button type="button" className="wmn-btn-sec" onClick={handleReset}>
                <RotateCcw size={16} />
                <span>Register Next</span>
              </button>
            </div>
          </div>

          {/* Card Right: Generated Unique QR Code */}
          <div className="wmn-card" style={{ textAlign: 'center', padding: '24px' }}>
            <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Official QR Access Code</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b' }}>
              Linked to ID: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>{registeredPerson.personId}</span>
            </p>

            <div style={{
              background: '#ffffff',
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid #e2e8f0',
              display: 'inline-block',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}>
              <img
                src={registeredPerson.qrCodeUrl}
                alt={`QR code for ${registeredPerson.name}`}
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                onClick={() => setShowQrModal(true)}
              >
                <Eye size={14} />
                <span>Enlarge</span>
              </button>
              <button
                type="button"
                className="wmn-btn-primary"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                onClick={handleDownloadQr}
              >
                <Download size={14} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* REGISTRATION FORM */
        <div className="wmn-card" style={{ maxWidth: '960px', margin: '0 auto' }}>
          {/* Person Type Switcher */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '24px',
            padding: '6px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { type: 'Student', icon: <GraduationCap size={18} />, label: 'Student' },
              { type: 'Staff', icon: <UserCheck size={18} />, label: 'Faculty / Staff' },
              { type: 'HOD', icon: <Building2 size={18} />, label: 'HOD' },
              { type: 'Visitor', icon: <UserPlus size={18} />, label: 'Visitor / Guest' }
            ].map(tab => (
              <button
                key={tab.type}
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: personType === tab.type ? '#2563eb' : 'transparent',
                  color: personType === tab.type ? '#ffffff' : '#64748b',
                  boxShadow: personType === tab.type ? '0 2px 8px rgba(37,99,235,0.25)' : 'none'
                }}
                onClick={() => handleTypeChange(tab.type)}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {personType === 'Visitor' && (
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6d28d9', fontSize: '0.85rem' }}>
                <UserPlus size={18} />
                <span>
                  Registering a daily visitor / guest? You can also use the dedicated <strong>Visitor Entry & Pass</strong> form.
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/watchman/visitor-entry')}
                style={{
                  background: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Go to Visitor Entry →
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Full Name */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="wmn-form-input"
                  placeholder={personType === 'Student' ? 'e.g. Rahul Sharma' : personType === 'HOD' ? 'e.g. Dr. K. Meenakshi' : 'e.g. S. Natarajan'}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Unique Person ID / Roll Number */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  {personType === 'Student' ? 'Roll No / Student ID' : personType === 'HOD' || personType === 'Staff' ? 'Staff / Employee ID' : 'Pass / Reference ID'}
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>(Leave blank to auto-generate)</span>
                </label>
                <input
                  type="text"
                  className="wmn-form-input"
                  placeholder={personType === 'Student' ? 'e.g. 21CS045 or STU-2026-001' : personType === 'HOD' ? 'e.g. HOD-CS-01' : 'e.g. STF-8921'}
                  value={formData.personId}
                  onChange={(e) => handleInputChange('personId', e.target.value)}
                />
              </div>

              {/* Official Designation for Staff / HOD only */}
              {personType !== 'Student' && (
                <div className="wmn-form-group">
                  <label className="wmn-form-label">Official Designation</label>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder={personType === 'HOD' ? 'Head of Department' : personType === 'Staff' ? 'e.g. Associate Professor' : 'e.g. Guest Speaker / Contractor'}
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                  />
                </div>
              )}

              {/* Phone */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Contact Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="tel"
                  className="wmn-form-input"
                  placeholder="e.g. 9840123456"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />
              </div>

              {/* Email */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">Email Address (Optional)</label>
                <input
                  type="email"
                  className="wmn-form-input"
                  placeholder="e.g. student@college.edu"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>

              {/* Vehicle Number */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">Vehicle Registration # (Optional)</label>
                <input
                  type="text"
                  className="wmn-form-input"
                  placeholder="e.g. TN 09 BK 4521 (or leave blank if pedestrian)"
                  value={formData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                />
              </div>

              {/* Entry Gate */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">Default Gate Location</label>
                <select
                  className="wmn-form-select"
                  value={formData.gate}
                  onChange={(e) => handleInputChange('gate', e.target.value)}
                >
                  {GATES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              {/* Statutory ID Proof Type & Number */}
              <div className="wmn-form-group">
                <label className="wmn-form-label">Identification Proof Type</label>
                <select
                  className="wmn-form-select"
                  value={formData.idProofType}
                  onChange={(e) => handleInputChange('idProofType', e.target.value)}
                >
                  <option value="College ID Card">College ID Card</option>
                  <option value="Staff Employee ID">Staff Employee ID</option>
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>

              <div className="wmn-form-group">
                <label className="wmn-form-label">ID Proof Document Number</label>
                <input
                  type="text"
                  className="wmn-form-input"
                  placeholder="e.g. ID card bar-number or Govt ID digits"
                  value={formData.idProofNumber}
                  onChange={(e) => handleInputChange('idProofNumber', e.target.value)}
                />
              </div>

              {/* Extra Visitor Fields */}
              {personType === 'Visitor' && (
                <>
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Purpose of Visit</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Official Meeting, Admissions Enquiry, Campus Placement"
                      value={formData.purpose}
                      onChange={(e) => handleInputChange('purpose', e.target.value)}
                    />
                  </div>
                  <div className="wmn-form-group">
                    <label className="wmn-form-label">Person to Meet / Host</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Principal, Dean, HOD CS, Accounts Section"
                      value={formData.personToMeet}
                      onChange={(e) => handleInputChange('personToMeet', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
              <button
                type="button"
                className="wmn-btn-sec"
                onClick={handleReset}
              >
                Reset Form
              </button>
              <button
                type="submit"
                className="wmn-btn-primary"
                disabled={loading}
                style={{ padding: '10px 24px', fontSize: '0.92rem', fontWeight: 700 }}
              >
                <Sparkles size={16} />
                <span>{loading ? 'Registering & Generating QR...' : `Register ${personType} & Generate QR Pass`}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR ENLARGE MODAL */}
      {showQrModal && registeredPerson && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '380px',
            width: '100%',
            padding: '24px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>{registeredPerson.name}</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#64748b' }}>
              {registeredPerson.personType} • <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>{registeredPerson.personId}</span>
            </p>

            <img
              src={registeredPerson.qrCodeUrl}
              alt="Official QR"
              style={{ width: '260px', height: '260px', margin: '0 auto', display: 'block', borderRadius: '8px' }}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                className="wmn-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleDownloadQr}
              >
                <Download size={16} />
                <span>Download</span>
              </button>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setShowQrModal(false)}
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

export default RegisterPersonPage;
