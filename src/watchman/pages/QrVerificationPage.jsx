import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode, Search, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, Phone, MapPin, Building2, LogOut as ExitIcon,
  Shield, Check, ArrowRight, ArrowLeft, RefreshCw, Users,
  Sparkles, Camera, CameraOff, AlertCircle
} from 'lucide-react';
import {
  lookupStudentQr,
  recordStudentCheckin,
  recordStudentCheckout,
  getStudentTodayScans,
  verifyVisitorPass,
  recordVisitorExit,
  admitPreRegisteredVisitor
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const QrVerificationPage = () => {
  // Main Mode: 'student_qr' (default) | 'visitor_pass'
  const [activeMode, setActiveMode] = useState('student_qr');

  // Selected Gate
  const [gate, setGate] = useState('Gate 1 (Main Entrance)');

  // ══════════════════════════════════════════════════════════
  // STUDENT QR VERIFICATION STATE
  // ══════════════════════════════════════════════════════════
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [studentSearchMode, setStudentSearchMode] = useState('mobile'); // 'mobile' | 'qr'
  const [lookingUpStudent, setLookingUpStudent] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [studentRecord, setStudentRecord] = useState(null);
  const [studentStatus, setStudentStatus] = useState(''); // 'Inside Campus' | 'Checked Out'
  const [activeEntry, setActiveEntry] = useState(null);
  const [todayScans, setTodayScans] = useState([]);
  const [loadingTodayScans, setLoadingTodayScans] = useState(false);

  // Success / Error alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ══════════════════════════════════════════════════════════
  // VISITOR PASS VERIFICATION STATE (Preserved)
  // ══════════════════════════════════════════════════════════
  const [passQuery, setPassQuery] = useState('');
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorResult, setVisitorResult] = useState(null);

  // Fetch today's student scans
  const fetchTodayScans = useCallback(async () => {
    try {
      setLoadingTodayScans(true);
      const res = await getStudentTodayScans();
      if (res.data?.success) {
        setTodayScans(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load today scans:', err);
    } finally {
      setLoadingTodayScans(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayScans();
  }, [fetchTodayScans]);

  // Auto-lookup if scanned via mobile camera / Google Lens with query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('id');
    const type = params.get('type');

    if (code) {
      if (type === 'visitor' || code.startsWith('PASS-') || code.startsWith('V-')) {
        setActiveMode('visitor_pass');
        setPassQuery(code);
        (async () => {
          try {
            setVisitorLoading(true);
            const res = await verifyVisitorPass(code.trim());
            setVisitorResult(res.data);
          } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Verification failed. Pass record not found.');
          } finally {
            setVisitorLoading(false);
          }
        })();
      } else {
        setActiveMode('student_qr');
        setStudentCodeInput(code);
        handleLookupStudent(code);
      }
    }
  }, []);

  // Real-time synchronization
  useRealtimeSync({
    modules: ['watchman', 'student_tracking'],
    onSync: () => {
      fetchTodayScans();
      // If currently inspecting a student, refresh their state
      if (studentRecord?.id) {
        handleLookupStudent(studentRecord.id, true);
      }
    }
  });

  // Lookup student by Registered Mobile Number, QR code, or Student ID
  const handleLookupStudent = async (codeToLookup, isSilent = false) => {
    const code = (codeToLookup || studentCodeInput).trim();
    if (!code) {
      setErrorMsg(studentSearchMode === 'mobile' ? 'Please enter a student mobile number' : 'Please scan a QR code or enter Student ID');
      return;
    }

    if (studentSearchMode === 'mobile') {
      const cleanDigits = code.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        setErrorMsg('Please enter a valid 10-digit registered mobile number.');
        return;
      }
    }

    try {
      if (!isSilent) setLookingUpStudent(true);
      setErrorMsg('');
      const res = await lookupStudentQr(code);
      if (res.data?.success) {
        setStudentRecord(res.data.student);
        setStudentStatus(res.data.currentStatus);
        setActiveEntry(res.data.activeEntry);
        if (!isSilent) {
          setSuccessMsg(`Student identified: ${res.data.student.name} (${res.data.student.id}) • Mobile: ${res.data.student.phone || 'N/A'}`);
          setTimeout(() => setSuccessMsg(''), 4000);
        }
      }
    } catch (err) {
      setStudentRecord(null);
      setActiveEntry(null);
      setErrorMsg(err.response?.data?.message || `No registered student found for "${code}"`);
    } finally {
      if (!isSilent) setLookingUpStudent(false);
    }
  };

  const handleStudentSearchSubmit = (e) => {
    e.preventDefault();
    handleLookupStudent(studentCodeInput);
  };

  // Confirm Check-in
  const handleConfirmCheckin = async () => {
    if (!studentRecord?.id) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await recordStudentCheckin({
        studentId: studentRecord.id,
        gate,
        remarks: 'QR Verified Check-in'
      });

      if (res.data?.success) {
        setSuccessMsg(`Entry Confirmed! ${studentRecord.name} (${studentRecord.id}) checked in successfully at ${new Date().toLocaleTimeString('en-IN')}.`);
        setStudentStatus('Inside Campus');
        setActiveEntry(res.data.data);
        fetchTodayScans();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete student check-in');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Check-out
  const handleConfirmCheckout = async () => {
    if (!studentRecord?.id) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await recordStudentCheckout({
        studentId: studentRecord.id,
        gate,
        remarks: 'QR Verified Check-out'
      });

      if (res.data?.success) {
        const durationStr = res.data.data?.durationFormatted || 'Calculated';
        setSuccessMsg(`Checkout Confirmed! ${studentRecord.name} departed campus. Total time spent on campus: ${durationStr}.`);
        setStudentStatus('Checked Out');
        setActiveEntry(null);
        fetchTodayScans();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete student checkout');
    } finally {
      setActionLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // VISITOR ACTIONS (Preserved)
  // ══════════════════════════════════════════════════════════
  const handleVerifyVisitor = async (e) => {
    if (e) e.preventDefault();
    if (!passQuery.trim()) {
      setErrorMsg('Please enter a Pass Number, Visitor ID, or mobile number to verify');
      return;
    }

    try {
      setVisitorLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await verifyVisitorPass(passQuery.trim());
      setVisitorResult(res.data);
    } catch (err) {
      setVisitorResult(null);
      setErrorMsg(err.response?.data?.message || 'Verification failed. Pass record not found.');
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleQuickCheckoutVisitor = async () => {
    if (!visitorResult?.data?._id) return;
    try {
      setVisitorLoading(true);
      const res = await recordVisitorExit(visitorResult.data._id);
      if (res.data?.success) {
        setSuccessMsg(`Visitor ${visitorResult.data.name} has been Checked Out.`);
        handleVerifyVisitor();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Checkout failed');
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleQuickAdmitVisitor = async () => {
    if (!visitorResult?.data?._id) return;
    try {
      setVisitorLoading(true);
      const res = await admitPreRegisteredVisitor(visitorResult.data._id);
      if (res.data?.success) {
        setSuccessMsg(`Pre-registered visitor ${visitorResult.data.name} admitted successfully.`);
        handleVerifyVisitor();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Admission failed');
    } finally {
      setVisitorLoading(false);
    }
  };

  const visitor = visitorResult?.data;

  return (
    <div className="wmn-page-container">
      {/* Page Header */}
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <QrCode size={24} style={{ color: '#2563eb' }} />
            <span>Gate Scanner & Attendance Control</span>
          </h2>
          <p>Scan student campus QR cards or visitor passes for automated check-in, check-out, and duration logging</p>
        </div>

        {/* Gate Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Current Gate:</span>
          <select
            className="wmn-form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={gate}
            onChange={(e) => setGate(e.target.value)}
          >
            {GATES.map((g, i) => (
              <option key={i} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className="wmn-btn"
          style={{
            background: activeMode === 'student_qr' ? '#2563eb' : '#ffffff',
            color: activeMode === 'student_qr' ? '#ffffff' : '#475569',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            padding: '8px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => {
            setActiveMode('student_qr');
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          <Users size={18} />
          <span>Student QR Scanner & Attendance</span>
        </button>

        <button
          type="button"
          className="wmn-btn"
          style={{
            background: activeMode === 'visitor_pass' ? '#2563eb' : '#ffffff',
            color: activeMode === 'visitor_pass' ? '#ffffff' : '#475569',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            padding: '8px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => {
            setActiveMode('visitor_pass');
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          <QrCode size={18} />
          <span>Visitor Gate Pass Verification</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #bbf7d0',
          color: '#166534',
          padding: '14px 18px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '14px 18px',
          borderRadius: '10px',
          fontSize: '0.9rem',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600
        }}>
          <XCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ──────────────── MODE 1: STUDENT QR SCANNER ──────────────── */}
      {activeMode === 'student_qr' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Left: Input & Scanner Interface */}
            <div className="wmn-card">
              <div className="wmn-card-header">
                <div className="wmn-card-title">
                  <QrCode size={18} style={{ color: '#2563eb' }} />
                  <h3>Student Gate Verification</h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                  System Ready
                </span>
              </div>

              {/* Mode Selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: studentSearchMode === 'mobile' ? '#2563eb' : 'transparent',
                    color: studentSearchMode === 'mobile' ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => {
                    setStudentSearchMode('mobile');
                    setStudentCodeInput('');
                    setErrorMsg('');
                  }}
                >
                  <Phone size={14} />
                  <span>Search by Mobile #</span>
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: studentSearchMode === 'qr' ? '#2563eb' : 'transparent',
                    color: studentSearchMode === 'qr' ? '#ffffff' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => {
                    setStudentSearchMode('qr');
                    setStudentCodeInput('');
                    setErrorMsg('');
                  }}
                >
                  <QrCode size={14} />
                  <span>Scan QR Code / ID</span>
                </button>
              </div>

              <form onSubmit={handleStudentSearchSubmit}>
                <div className="wmn-form-group">
                  <label className="wmn-form-label">
                    {studentSearchMode === 'mobile'
                      ? 'Enter 10-Digit Registered Student Mobile Number'
                      : 'Scan Student QR Code or Enter Student Roll / ID'}
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type={studentSearchMode === 'mobile' ? 'tel' : 'text'}
                      className="wmn-form-input"
                      placeholder={
                        studentSearchMode === 'mobile'
                          ? 'e.g. 9840123456 or +91 9840123456'
                          : 'e.g. CS2022001, STU-QR-CS2022001, or 2024CS101'
                      }
                      value={studentCodeInput}
                      onChange={(e) => setStudentCodeInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="wmn-btn-primary"
                      disabled={lookingUpStudent}
                    >
                      <Search size={16} />
                      <span>{lookingUpStudent ? 'Searching...' : studentSearchMode === 'mobile' ? 'Search' : 'Scan / Verify'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Optical / Scanner Visual Simulation */}
              <div className="wmn-scanner-box" style={{ marginTop: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
                  <QrCode size={30} />
                </div>
                <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Barcode / Optical Scanner Active</h4>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Hardware barcode / QR laser scanners automatically trigger verification on scan.
                </p>

                {/* Real-time Student Quick Test Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' }}>
                  {studentSearchMode === 'mobile' ? (
                    <>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                        onClick={() => {
                          setStudentCodeInput('9876543210');
                          handleLookupStudent('9876543210');
                        }}
                      >
                        John Doe (9876543210)
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                        onClick={() => {
                          setStudentCodeInput('9823456789');
                          handleLookupStudent('9823456789');
                        }}
                      >
                        Emily Davis (9823456789)
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                        onClick={() => {
                          setStudentCodeInput('9845123456');
                          handleLookupStudent('9845123456');
                        }}
                      >
                        Alice Smith (9845123456)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                        onClick={() => {
                          setStudentCodeInput('CS2022001');
                          handleLookupStudent('CS2022001');
                        }}
                      >
                        CS2022001 (John Doe)
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                        onClick={() => {
                          setStudentCodeInput('CS2021004');
                          handleLookupStudent('CS2021004');
                        }}
                      >
                        CS2021004 (Emily Davis)
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.76rem', padding: '5px 10px' }}
                        onClick={() => {
                          setStudentCodeInput('EE2022001');
                          handleLookupStudent('EE2022001');
                        }}
                      >
                        EE2022001 (Alice Smith)
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Scanned Student Verification Inspector */}
            <div>
              {studentRecord ? (
                <div className="wmn-card" style={{
                  border: studentStatus === 'Inside Campus' ? '2px solid #3b82f6' : '2px solid #10b981'
                }}>
                  {/* Status Banner */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: studentStatus === 'Inside Campus' ? '#eff6ff' : '#dcfce7',
                    color: studentStatus === 'Inside Campus' ? '#1e40af' : '#166534'
                  }}>
                    {studentStatus === 'Inside Campus' ? (
                      <Clock size={24} />
                    ) : (
                      <CheckCircle2 size={24} />
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                        {studentStatus === 'Inside Campus' ? 'STUDENT IS CURRENTLY INSIDE CAMPUS' : 'STUDENT IS READY FOR CAMPUS ENTRY'}
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        {studentStatus === 'Inside Campus'
                          ? `Checked in at ${new Date(activeEntry?.checkInTime).toLocaleTimeString('en-IN')} (${activeEntry?.durationSoFar || 'Ongoing'})`
                          : 'Valid student ID verified. Click Check-in to record campus entry.'}
                      </div>
                    </div>
                  </div>

                  {/* Student Details Card */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px' }}>
                    {studentRecord.photoUrl ? (
                      <img
                        src={studentRecord.photoUrl}
                        alt={studentRecord.name}
                        style={{ width: '68px', height: '68px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                      />
                    ) : (
                      <div style={{ width: '68px', height: '68px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 800 }}>
                        {studentRecord.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        {studentRecord.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                          ID: {studentRecord.id}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {studentRecord.department} • {studentRecord.course}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Field Grid */}
                  <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.84rem' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Semester</span>
                      <strong style={{ display: 'block', color: '#0f172a' }}>Semester {studentRecord.semester || '1'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Batch</span>
                      <strong style={{ display: 'block', color: '#0f172a' }}>{studentRecord.batch || 'Current'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Registered Mobile</span>
                      <strong style={{ display: 'block', color: '#1d4ed8', fontWeight: 800 }}>{studentRecord.phone || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Permanent QR Token</span>
                      <code style={{ display: 'block', color: '#0f172a', fontSize: '0.75rem', background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {studentRecord.qrCode || `STU-QR-${studentRecord.id}`}
                      </code>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Active Gate</span>
                      <strong style={{ display: 'block', color: '#2563eb' }}>{gate}</strong>
                    </div>
                    {activeEntry && (
                      <>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Entry Timestamp</span>
                          <strong style={{ display: 'block', color: '#16a34a' }}>
                            {new Date(activeEntry.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase' }}>Time on Campus</span>
                          <strong style={{ display: 'block', color: '#2563eb' }}>
                            {activeEntry.durationSoFar || 'Just entered'}
                          </strong>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions: Check-in / Check-out Buttons */}
                  <div style={{ marginTop: '18px', display: 'flex', gap: '12px' }}>
                    {studentStatus !== 'Inside Campus' ? (
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{
                          background: '#16a34a',
                          flex: 1,
                          padding: '12px',
                          fontSize: '0.95rem',
                          justifyContent: 'center'
                        }}
                        onClick={handleConfirmCheckin}
                        disabled={actionLoading}
                      >
                        <CheckCircle2 size={18} />
                        <span>{actionLoading ? 'Recording Check-in...' : 'Confirm Student Check-in (Entry)'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{
                          background: '#dc2626',
                          flex: 1,
                          padding: '12px',
                          fontSize: '0.95rem',
                          justifyContent: 'center'
                        }}
                        onClick={handleConfirmCheckout}
                        disabled={actionLoading}
                      >
                        <ExitIcon size={18} />
                        <span>{actionLoading ? 'Recording Check-out...' : 'Confirm Student Check-out (Exit)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="wmn-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                  <Shield size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                  <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Student Scanned Yet</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem' }}>
                    Scan a student QR pass or enter their Student ID to verify details and record gate entry/exit.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Today's Scanned Students History Table */}
          <div className="wmn-card">
            <div className="wmn-card-header">
              <div className="wmn-card-title">
                <Clock size={18} style={{ color: '#2563eb' }} />
                <h3>Today's Student Gate Movements ({todayScans.length})</h3>
              </div>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                onClick={fetchTodayScans}
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="wmn-table">
                <thead>
                  <tr>
                    <th>Student Name & ID</th>
                    <th>Department</th>
                    <th>Check-in Time</th>
                    <th>Check-out Time</th>
                    <th>Time on Campus</th>
                    <th>Status</th>
                    <th>Gate & Guard</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTodayScans ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        Loading scans...
                      </td>
                    </tr>
                  ) : todayScans.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No students scanned today yet.
                      </td>
                    </tr>
                  ) : (
                    todayScans.map((scan) => (
                      <tr key={scan._id || scan.entryId}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{scan.studentName}</div>
                          <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: '#64748b' }}>{scan.studentId}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{scan.department}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{scan.course}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#16a34a' }}>
                            {scan.checkInTime ? new Date(scan.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: scan.checkOutTime ? '#2563eb' : '#64748b' }}>
                            {scan.checkOutTime ? new Date(scan.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Inside Campus'}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: scan.status === 'Inside Campus' ? '#16a34a' : '#0f172a' }}>
                            {scan.durationFormatted || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`wmn-status-pill status-${scan.status === 'Inside Campus' ? 'active' : 'inactive'}`}>
                            {scan.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{scan.entryGate}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>By: {scan.entryWatchmanName}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ──────────────── MODE 2: VISITOR GATE PASS VERIFICATION ──────────────── */}
      {activeMode === 'visitor_pass' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Input & Lookup */}
          <div className="wmn-card">
            <div className="wmn-card-header">
              <div className="wmn-card-title">
                <QrCode size={18} style={{ color: '#2563eb' }} />
                <h3>Visitor Pass Scanner</h3>
              </div>
            </div>

            <form onSubmit={handleVerifyVisitor}>
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Pass Number / QR String / Visitor Mobile #
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="e.g. PASS-892341 or 9840123456"
                    value={passQuery}
                    onChange={(e) => setPassQuery(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="wmn-btn-primary"
                    disabled={visitorLoading}
                  >
                    <Search size={16} />
                    <span>{visitorLoading ? 'Checking...' : 'Verify'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right: Visitor Verification Result */}
          <div>
            {visitorResult ? (() => {
              const visitor = visitorResult.data || visitorResult.visitor || visitorResult;
              const isValid = visitorResult.valid ?? (visitor?.approvalStatus === 'Approved' && visitor?.status !== 'Checked Out');

              return (
                <div className="wmn-card" style={{
                  border: isValid ? '2px solid #10b981' : '2px solid #ef4444',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isValid ? '#dcfce7' : '#fee2e2',
                    color: isValid ? '#166534' : '#991b1b'
                  }}>
                    {isValid ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    <div>
                      <div style={{ fontWeight: 800 }}>
                        {isValid ? 'OFFICIAL VALID VISITOR PASS' : 'PASS INACTIVE / EXPIRED'}
                      </div>
                      <div style={{ fontSize: '0.78rem' }}>{visitorResult.statusMessage || (isValid ? 'Verified against security database.' : 'This pass cannot be used for gate admission.')}</div>
                    </div>
                  </div>

                  {visitor && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{visitor.name}</h3>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>📞 {visitor.phone || 'No phone provided'}</span>
                        </div>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.88rem',
                          background: '#f1f5f9',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          color: '#7c3aed'
                        }}>
                          {visitor.passNumber || visitor.visitorId}
                        </span>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '14px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        fontSize: '0.82rem',
                        marginBottom: '16px'
                      }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Person to Meet</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.personToMeet || '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Department</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.department || 'General'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Purpose</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.purpose || 'Official Visit'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Vehicle #</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.vehicleNumber || 'Pedestrian / None'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Gate</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.gate || 'Gate 1 (Main Entrance)'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Current Status</span>
                          <span style={{
                            display: 'inline-block',
                            marginTop: '2px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            background: visitor.status === 'Inside' ? '#ecfdf5' : '#eff6ff',
                            color: visitor.status === 'Inside' ? '#059669' : '#2563eb'
                          }}>
                            {visitor.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                        {visitor.status === 'Inside' && (
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{ background: '#dc2626', flex: 1, justifyContent: 'center' }}
                            onClick={handleQuickCheckoutVisitor}
                            disabled={visitorLoading}
                          >
                            <ExitIcon size={16} />
                            <span>Confirm Visitor Exit</span>
                          </button>
                        )}

                        {visitor.status === 'Pre-Registered' && visitor.approvalStatus === 'Approved' && (
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{ background: '#059669', flex: 1, justifyContent: 'center' }}
                            onClick={handleQuickAdmitVisitor}
                            disabled={visitorLoading}
                          >
                            <Check size={16} />
                            <span>Admit Pre-Registered Visitor</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="wmn-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Shield size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Visitor Pass Loaded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Enter a pass voucher code or scan a visitor's QR badge.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QrVerificationPage;
