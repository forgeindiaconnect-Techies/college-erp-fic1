import React, { useState, useEffect } from 'react';
import {
  Shield, ShieldCheck, CheckCircle2, Clock, XCircle, AlertTriangle,
  AlertCircle, User, Phone, MapPin, Building2, Car, QrCode, LogIn,
  LogOut, Printer, Download, Copy, Check, ArrowLeft, RefreshCw,
  GraduationCap, UserCheck, Search, ExternalLink, Calendar, FileText,
  Sparkles, CheckCheck
} from 'lucide-react';
import { getGatePassUrl, getQrCodeImageUrl } from '../../utils/qrPassHelper';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const DigitalSecurityPassCard = ({
  person,
  visitor,
  loading,
  error,
  success,
  gate = 'Gate 1 (Main Entrance)',
  onGateChange,
  remarks = '',
  onRemarksChange,
  onRecordIn,
  onRecordOut,
  actionLoading = false,
  movements = [],
  onManualSearch,
  onSwitchToDashboard,
  onClear,
  searchedCode = ''
}) => {
  const [copied, setCopied] = useState(false);
  const [manualInput, setManualInput] = useState(searchedCode);
  const [qrCdnIndex, setQrCdnIndex] = useState(0);

  // Normalize nested data payloads safely
  const visitorData = visitor?.data || visitor?.visitor || visitor || null;
  const personData = person?.data || person?.person || person || null;

  const isMember = Boolean(personData && !visitorData);
  const isVisitor = Boolean(visitorData);

  // Extract common pass fields with robust fallbacks
  const passId = isMember
    ? (personData?.personId || personData?._id || searchedCode || 'MBR-0001')
    : (visitorData?.passNumber || visitorData?.visitorId || visitorData?._id || searchedCode || 'PASS-0001');

  const personType = isMember ? (personData?.personType || 'Staff') : 'Visitor';

  const name = isMember
    ? (personData?.name || personData?.fullName || 'Campus Member')
    : (visitorData?.name || visitorData?.visitorName || 'Registered Visitor');

  const phone = isMember ? personData?.phone : visitorData?.phone;
  const vehicle = isMember ? personData?.vehicleNumber : visitorData?.vehicleNumber;
  const department = isMember ? (personData?.department || 'General') : (visitorData?.department || 'General');
  const purpose = visitorData?.purpose || 'Official Campus Visit';
  const personToMeet = visitorData?.personToMeet || 'Department Office';
  const collegeName = (isMember ? personData?.collegeName : visitorData?.collegeName) || 'ARIGNAR ANNA COLLEGE';

  // Status computation for Member
  const isMemberInside = isMember && personData?.currentStatus === 'Inside Campus';

  // Status computation for Visitor
  const visitorStatus = visitorData?.status || 'Registered';
  const isVisitorInside = visitorStatus === 'Inside' || visitorStatus === 'Inside Campus';
  const isVisitorExited = visitorStatus === 'Exited' || visitorStatus === 'Checked Out';
  const isVisitorPreReg = visitorStatus === 'Pre-Registered';
  const isVisitorApproved = visitorData?.approvalStatus === 'Approved' || visitorStatus === 'Registered' || isVisitorInside;
  const isVisitorPending = isVisitorPreReg && visitorData?.approvalStatus !== 'Approved';
  const isVisitorRejected = visitorData?.approvalStatus === 'Rejected' || visitorStatus === 'Rejected';

  // Determine verification pass URL
  const verifyPassUrl = getGatePassUrl(passId, isMember ? personType.toLowerCase() : 'visitor') ||
    `http://192.168.1.36:5173/verify-gate-pass?code=${encodeURIComponent(passId)}&type=${isMember ? personType.toLowerCase() : 'visitor'}`;

  // Multi-CDN QR code sources for 100% reliable loading
  const qrCdnSources = [
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(verifyPassUrl)}`,
    `https://chart.googleapis.com/chart?chs=260x260&cht=qr&chl=${encodeURIComponent(verifyPassUrl)}`,
    `https://quickchart.io/qr?text=${encodeURIComponent(verifyPassUrl)}&size=260&margin=2`
  ];

  const currentQrUrl = qrCdnSources[qrCdnIndex] || qrCdnSources[0];

  // Handle QR image error by trying the next CDN fallback
  const handleQrError = () => {
    if (qrCdnIndex < qrCdnSources.length - 1) {
      setQrCdnIndex(prev => prev + 1);
    }
  };

  // Reset CDN index if passId changes
  useEffect(() => {
    setQrCdnIndex(0);
  }, [passId]);

  // Copy link handler
  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(verifyPassUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Download pass image
  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = currentQrUrl;
    a.download = `Gate_Pass_${passId || 'Verified'}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '720px',
      margin: '0 auto',
      padding: '20px 14px 60px 14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* ── Institution Header Ribbon ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px 20px 0 0',
        padding: '20px 24px',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.35)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            flexShrink: 0
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.08rem', fontWeight: 900, letterSpacing: '0.02em', color: '#f8fafc' }}>
              {collegeName}
            </div>
            <div style={{
              fontSize: '0.74rem',
              color: '#94a3b8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '2px'
            }}>
              <span>Digital Security Clearance & Gate Pass</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.68rem',
                fontWeight: 700
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                VERIFIED
              </span>
            </div>
          </div>
        </div>

        {onSwitchToDashboard && (
          <button
            type="button"
            onClick={onSwitchToDashboard}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s ease'
            }}
          >
            <span>Gate Console</span>
            <ExternalLink size={13} />
          </button>
        )}
      </div>

      {/* ── Main Pass Container ── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '0 0 20px 20px',
        border: '1px solid #e2e8f0',
        borderTop: 'none',
        boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.08)',
        padding: '24px'
      }}>
        {/* Loading Spinner */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <RefreshCw size={40} className="wmn-spin" style={{ color: '#2563eb', margin: '0 auto 16px auto' }} />
            <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.15rem', fontWeight: 900 }}>
              Authenticating Security Pass...
            </h4>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
              Verifying digital credentials against the real-time Campus Security Registry...
            </p>
          </div>
        )}

        {/* Success Alert Banner */}
        {success && (
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            border: '1.5px solid #6ee7b7',
            color: '#065f46',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.1)'
          }}>
            <CheckCircle2 size={22} style={{ color: '#059669', flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '1.5px solid #fca5a5',
            color: '#991b1b',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
          }}>
            <AlertCircle size={22} style={{ color: '#dc2626', flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Pass Not Found State */}
        {!loading && !personData && !visitorData && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              boxShadow: '0 6px 16px rgba(220, 38, 38, 0.15)'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a', fontWeight: 900 }}>
              Pass Identifier Not Found
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              The scanned barcode or pass number <strong>"{searchedCode || 'Pass'}"</strong> was not found in the live campus security database.
            </p>

            {/* Quick Manual Entry Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (onManualSearch && manualInput.trim()) {
                  onManualSearch(manualInput.trim());
                }
              }}
              style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', gap: '10px' }}
            >
              <input
                type="text"
                className="wmn-form-input"
                placeholder="Enter Roll #, Staff ID or Pass #"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '0.92rem' }}
              />
              <button
                type="submit"
                className="wmn-btn-primary"
                style={{ background: '#2563eb', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Search size={16} />
                <span>Verify</span>
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* IDENTIFIED PASS CARD CONTENT (MEMBER OR VISITOR)           */}
        {/* ══════════════════════════════════════════════════════════ */}
        {!loading && (personData || visitorData) && (
          <div>
            {/* ── Status Clearance Ribbon ── */}
            <div style={{
              padding: '16px 20px',
              borderRadius: '14px',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: isMember
                ? (isMemberInside ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)' : 'linear-gradient(135deg, #eff6ff, #dbeafe)')
                : (isVisitorInside
                    ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
                    : isVisitorApproved
                      ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                      : isVisitorPending
                        ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                        : 'linear-gradient(135deg, #f8fafc, #f1f5f9)'),
              border: `2px solid ${
                isMember
                  ? (isMemberInside ? '#34d399' : '#60a5fa')
                  : (isVisitorInside
                      ? '#34d399'
                      : isVisitorApproved
                        ? '#60a5fa'
                        : isVisitorPending
                          ? '#fbbf24'
                          : '#cbd5e1')
              }`,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)'
            }}>
              {isMember ? (
                isMemberInside ? (
                  <CheckCircle2 size={30} style={{ color: '#059669', flexShrink: 0 }} />
                ) : (
                  <Clock size={30} style={{ color: '#2563eb', flexShrink: 0 }} />
                )
              ) : isVisitorInside ? (
                <CheckCircle2 size={30} style={{ color: '#059669', flexShrink: 0 }} />
              ) : isVisitorApproved ? (
                <CheckCircle2 size={30} style={{ color: '#2563eb', flexShrink: 0 }} />
              ) : isVisitorPending ? (
                <Clock size={30} style={{ color: '#d97706', flexShrink: 0 }} />
              ) : (
                <XCircle size={30} style={{ color: '#64748b', flexShrink: 0 }} />
              )}

              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 900,
                  fontSize: '1.02rem',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: isMember
                    ? (isMemberInside ? '#065f46' : '#1e40af')
                    : (isVisitorInside
                        ? '#065f46'
                        : isVisitorApproved
                          ? '#1e40af'
                          : isVisitorPending
                            ? '#92400e'
                            : '#334155')
                }}>
                  {isMember ? (
                    isMemberInside
                      ? '✓ MEMBER CURRENTLY LOGGED IN (INSIDE CAMPUS)'
                      : '✓ MEMBER CURRENTLY LOGGED OUT (OUTSIDE CAMPUS)'
                  ) : isVisitorInside ? (
                    '✓ VISITOR CURRENTLY LOGGED IN (INSIDE CAMPUS)'
                  ) : isVisitorApproved ? (
                    '✓ OFFICIAL APPROVED VISITOR PASS'
                  ) : isVisitorPending ? (
                    '⏳ PRE-REGISTERED PASS • PENDING ADMIN APPROVAL'
                  ) : isVisitorExited ? (
                    'VISIT CONCLUDED & CHECKED OUT'
                  ) : (
                    'VISITOR PASS INACTIVE'
                  )}
                </div>
                <div style={{ fontSize: '0.84rem', marginTop: '4px', opacity: 0.95, color: '#334155' }}>
                  {isMember ? (
                    isMemberInside
                      ? `Inside campus since ${personData?.lastEntryTime ? new Date(personData.lastEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}. Ready for departure checkout.`
                      : 'Outside campus. Security clearance active. Ready for gate entry.'
                  ) : isVisitorInside ? (
                    `Inside campus since ${visitorData?.entryTime ? new Date(visitorData.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}. Ready for departure checkout.`
                  ) : isVisitorApproved ? (
                    `Authorized by host department (${visitorData?.department || 'Administration'})${visitorData?.approvedBy ? ` • Approved by ${visitorData.approvedBy}` : ''}. Ready for campus admission.`
                  ) : isVisitorPending ? (
                    'Pre-registered appointment awaiting administrator review before gate entry is permitted.'
                  ) : isVisitorExited ? (
                    `Visitor completed campus visit and exited on ${visitorData?.exitTime ? new Date(visitorData.exitTime).toLocaleString('en-IN') : 'earlier today'}.`
                  ) : (
                    'Pass cannot be used for campus entry.'
                  )}
                </div>
              </div>
            </div>

            {/* ── Official Scannable Pass Card ── */}
            <div style={{
              background: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '18px',
              padding: '24px',
              marginBottom: '24px',
              position: 'relative',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
            }}>
              {/* Profile Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                borderBottom: '1.5px solid #e2e8f0',
                paddingBottom: '18px',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Role Icon Avatar */}
                  <div style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    background: isMember
                      ? (personType === 'HOD' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : personType === 'Staff' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'linear-gradient(135deg, #059669, #047857)')
                      : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    boxShadow: '0 6px 14px rgba(0, 0, 0, 0.12)',
                    flexShrink: 0
                  }}>
                    {isMember
                      ? (personType === 'HOD' ? <Building2 size={30} /> : personType === 'Staff' ? <UserCheck size={30} /> : <GraduationCap size={30} />)
                      : <User size={30} />}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        {name}
                      </h2>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: isMember
                          ? (personType === 'HOD' ? '#fef3c7' : personType === 'Staff' ? '#eff6ff' : '#ecfdf5')
                          : '#f3e8ff',
                        color: isMember
                          ? (personType === 'HOD' ? '#92400e' : personType === 'Staff' ? '#1e40af' : '#065f46')
                          : '#6b21a8',
                        border: `1.5px solid ${
                          isMember
                            ? (personType === 'HOD' ? '#fde68a' : personType === 'Staff' ? '#bfdbfe' : '#a7f3d0')
                            : '#d8b4fe'
                        }`
                      }}>
                        {personType}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                      {department} {isMember && personData?.designation ? `• ${personData.designation}` : ''}
                    </div>
                  </div>
                </div>

                {/* Pass ID Pill with 1-Click Copy */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  gap: '8px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
                }}>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: '#1e293b', letterSpacing: '0.03em' }}>
                    {passId}
                  </strong>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      background: copied ? '#ecfdf5' : '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      color: copied ? '#059669' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}
                    title="Copy Pass Number"
                  >
                    {copied ? <Check size={13} style={{ color: '#059669' }} /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* ── Key Details Grid ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px',
                fontSize: '0.86rem',
                marginBottom: '22px'
              }}>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Contact Phone
                  </span>
                  {phone ? (
                    <a href={`tel:${phone}`} style={{ color: '#2563eb', fontWeight: 800, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={14} />
                      <span>{phone}</span>
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>—</span>
                  )}
                </div>

                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Vehicle Registration
                  </span>
                  <div style={{ color: vehicle ? '#2563eb' : '#334155', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Car size={15} />
                    <span>{vehicle || 'Pedestrian (No Vehicle)'}</span>
                  </div>
                </div>

                {isMember ? (
                  <>
                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Last Gate Entry
                      </span>
                      <strong style={{ color: '#0f172a' }}>
                        {personData?.lastEntryTime ? new Date(personData.lastEntryTime).toLocaleString('en-IN') : 'None recorded'}
                      </strong>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Last Gate Exit
                      </span>
                      <strong style={{ color: '#0f172a' }}>
                        {personData?.lastExitTime ? new Date(personData.lastExitTime).toLocaleString('en-IN') : 'None recorded'}
                      </strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Host Person & Department
                      </span>
                      <strong style={{ color: '#0f172a' }}>
                        {personToMeet} ({department})
                      </strong>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Purpose of Visit
                      </span>
                      <strong style={{ color: '#2563eb' }}>
                        {purpose}
                      </strong>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Visit Schedule
                      </span>
                      <strong style={{ color: '#0f172a' }}>
                        {visitorData?.expectedDate ? new Date(visitorData.expectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                        {' '}• {visitorData?.expectedTime || '10:00 AM'}
                      </strong>
                    </div>

                    <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                        Permitted Gate
                      </span>
                      <strong style={{ color: '#0f172a' }}>
                        {visitorData?.gate || gate || 'Gate 1 (Main Entrance)'}
                      </strong>
                    </div>
                  </>
                )}
              </div>

              {/* ── Official Scannable QR Pass Centerpiece ── */}
              <div style={{
                textAlign: 'center',
                padding: '24px 18px',
                background: '#ffffff',
                border: '2px solid #cbd5e1',
                borderRadius: '16px',
                marginBottom: '24px',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}>
                <div style={{
                  display: 'inline-block',
                  padding: '10px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                  border: '1.5px solid #e2e8f0'
                }}>
                  <img
                    src={currentQrUrl}
                    onError={handleQrError}
                    alt={`Official QR Gate Pass - ${passId}`}
                    style={{
                      width: '200px',
                      height: '200px',
                      margin: '0 auto',
                      display: 'block',
                      borderRadius: '8px'
                    }}
                  />
                </div>

                <div style={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  color: '#0f172a',
                  letterSpacing: '0.05em',
                  marginTop: '12px'
                }}>
                  {passId}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                  Official Digital Security Pass • Scannable by any mobile camera or gate scanner
                </div>
              </div>

              {/* ── Security Clearance Gate Action Controls ── */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '18px 20px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.04em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={15} style={{ color: '#2563eb' }} />
                  <span>Security Gate Check-In & Departure Actions</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                      Active Gate
                    </label>
                    <select
                      className="wmn-form-select"
                      value={gate}
                      onChange={(e) => onGateChange && onGateChange(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#f8fafc', fontWeight: 600 }}
                    >
                      {GATES.map((g, i) => (
                        <option key={i} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                      Movement Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Host verified, Lab visit, Gate clearance..."
                      value={remarks}
                      onChange={(e) => onRemarksChange && onRemarksChange(e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#f8fafc' }}
                    />
                  </div>
                </div>

                {/* 1-Click Tactile Gate Action Buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '14px'
                }}>
                  {/* BUTTON 1: LOGIN / CAMPUS IN */}
                  <button
                    type="button"
                    style={{
                      background: (isMember ? !isMemberInside : (!isVisitorInside && isVisitorApproved)) ? '#059669' : '#f1f5f9',
                      color: (isMember ? !isMemberInside : (!isVisitorInside && isVisitorApproved)) ? '#ffffff' : '#94a3b8',
                      border: `1.5px solid ${(isMember ? !isMemberInside : (!isVisitorInside && isVisitorApproved)) ? '#047857' : '#cbd5e1'}`,
                      padding: '14px 16px',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '0.96rem',
                      cursor: (isMember ? !isMemberInside : (!isVisitorInside && isVisitorApproved)) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: (isMember ? !isMemberInside : (!isVisitorInside && isVisitorApproved)) ? '0 6px 16px rgba(5,150,105,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => onRecordIn && onRecordIn()}
                    disabled={actionLoading || (isMember ? isMemberInside : (isVisitorInside || !isVisitorApproved))}
                  >
                    <LogIn size={20} />
                    <span>
                      {actionLoading ? 'Processing...' : (isMember ? 'Admit Member / Campus In' : 'Admit Visitor / Campus In')}
                    </span>
                  </button>

                  {/* BUTTON 2: LOGOUT / CAMPUS OUT */}
                  <button
                    type="button"
                    style={{
                      background: (isMember ? isMemberInside : isVisitorInside) ? '#dc2626' : '#f1f5f9',
                      color: (isMember ? isMemberInside : isVisitorInside) ? '#ffffff' : '#94a3b8',
                      border: `1.5px solid ${(isMember ? isMemberInside : isVisitorInside) ? '#b91c1c' : '#cbd5e1'}`,
                      padding: '14px 16px',
                      borderRadius: '12px',
                      fontWeight: 900,
                      fontSize: '0.96rem',
                      cursor: (isMember ? isMemberInside : isVisitorInside) ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: (isMember ? isMemberInside : isVisitorInside) ? '0 6px 16px rgba(220,38,38,0.3)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => onRecordOut && onRecordOut()}
                    disabled={actionLoading || (isMember ? !isMemberInside : !isVisitorInside)}
                  >
                    <LogOut size={20} />
                    <span>
                      {actionLoading ? 'Processing...' : 'Logout / Campus Out'}
                    </span>
                  </button>
                </div>

                {/* Pending Visitor Guidance Note */}
                {isVisitor && isVisitorPending && (
                  <div style={{
                    background: '#fef3c7',
                    border: '1.5px solid #fde68a',
                    color: '#92400e',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    marginTop: '14px'
                  }}>
                    ⏳ This visitor pass is currently pending Administrator review. Once approved, gate check-in will automatically unlock.
                  </div>
                )}
              </div>

              {/* ── Utility Actions (Print, Download, Copy, Clear) ── */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                flexWrap: 'wrap',
                borderTop: '1.5px solid #e2e8f0',
                paddingTop: '18px'
              }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={16} />
                  <span>Print Pass</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    color: '#334155',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={16} />
                  <span>Download Pass</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    color: '#1e40af',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copied ? <Check size={16} style={{ color: '#059669' }} /> : <Copy size={16} />}
                  <span>{copied ? 'Pass Link Copied!' : 'Copy Link'}</span>
                </button>

                {onClear && (
                  <button
                    type="button"
                    onClick={onClear}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      color: '#64748b',
                      fontSize: '0.86rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Clear / Scan Next</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Movement History (if any) ── */}
            {movements && movements.length > 0 && (
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '14px',
                padding: '18px 20px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                  Recent Gate Movements ({movements.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                  {movements.map((m, idx) => (
                    <div
                      key={m.movementId || m._id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        background: m.direction === 'In' ? '#ecfdf5' : '#f8fafc',
                        border: `1px solid ${m.direction === 'In' ? '#a7f3d0' : '#e2e8f0'}`,
                        borderRadius: '10px',
                        fontSize: '0.84rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: m.direction === 'In' ? '#059669' : '#64748b',
                          color: '#ffffff'
                        }}>
                          {m.direction === 'In' ? 'IN' : 'OUT'}
                        </span>
                        <span style={{ fontWeight: 600 }}>{m.gate || 'Gate 1'} • {m.remarks || m.reason || 'Gate Movement'}</span>
                      </div>
                      <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalSecurityPassCard;
