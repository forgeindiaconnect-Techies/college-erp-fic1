import React, { useState } from 'react';
import {
  QrCode, Search, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, Phone, MapPin, Building2, LogOut as ExitIcon,
  Shield, Check, ArrowRight
} from 'lucide-react';
import { verifyVisitorPass, recordVisitorExit, admitPreRegisteredVisitor } from '../../api/index';
import '../watchman.css';

const QrVerificationPage = () => {
  const [passQuery, setPassQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!passQuery.trim()) {
      setError('Please enter a Pass Number, Visitor ID, or mobile number to verify');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setActionSuccess('');
      const res = await verifyVisitorPass(passQuery.trim());
      setVerificationResult(res.data);
    } catch (err) {
      setVerificationResult(null);
      setError(err.response?.data?.message || 'Verification failed. Pass record not found.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckout = async () => {
    if (!verificationResult?.data?._id) return;
    try {
      setLoading(true);
      const res = await recordVisitorExit(verificationResult.data._id);
      if (res.data?.success) {
        setActionSuccess(`Visitor ${verificationResult.data.name} has been Checked Out.`);
        // Re-verify
        handleVerify();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmit = async () => {
    if (!verificationResult?.data?._id) return;
    try {
      setLoading(true);
      const res = await admitPreRegisteredVisitor(verificationResult.data._id);
      if (res.data?.success) {
        setActionSuccess(`Pre-registered visitor ${verificationResult.data.name} admitted successfully.`);
        handleVerify();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Admission failed');
    } finally {
      setLoading(false);
    }
  };

  const visitor = verificationResult?.data;

  return (
    <div className="wmn-page-container">
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <QrCode size={24} style={{ color: '#2563eb' }} />
            <span>Visitor Pass & QR Code Verification</span>
          </h2>
          <p>Scan visitor QR vouchers or enter pass numbers to validate gate clearance and access authorization</p>
        </div>
      </div>

      {actionSuccess && (
        <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 18px', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 18px', borderRadius: '10px', fontSize: '0.86rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Input & Scanner */}
        <div className="wmn-card">
          <div className="wmn-card-header">
            <div className="wmn-card-title">
              <QrCode size={18} style={{ color: '#2563eb' }} />
              <h3>Pass Scanner & Lookup</h3>
            </div>
          </div>

          <form onSubmit={handleVerify}>
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
                  autoFocus
                />
                <button
                  type="submit"
                  className="wmn-btn-primary"
                  disabled={loading}
                >
                  <Search size={16} />
                  <span>{loading ? 'Checking...' : 'Verify'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Simulated Scanner Visual */}
          <div className="wmn-scanner-box" style={{ marginTop: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <QrCode size={32} />
            </div>
            <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Barcode / Optical Scanner Active</h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#64748b' }}>
              Laser scanners or camera barcode readers will auto-populate the input above and trigger real-time verification.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                onClick={() => {
                  setPassQuery('PASS-892341');
                  setError('');
                }}
              >
                Try Demo Pass #1
              </button>
              <button
                type="button"
                className="wmn-btn-sec"
                style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                onClick={() => {
                  setPassQuery('PASS-310492');
                  setError('');
                }}
              >
                Try Checked Out Pass
              </button>
            </div>
          </div>
        </div>

        {/* Right: Verification Inspector Result */}
        <div>
          {verificationResult ? (
            <div className="wmn-card" style={{
              border: verificationResult.valid
                ? '2px solid #10b981'
                : (verificationResult.validationStatus === 'ALREADY_USED' ? '2px solid #f59e0b' : '2px solid #ef4444')
            }}>
              {/* Status Header Banner */}
              <div style={{
                padding: '14px 18px',
                borderRadius: '10px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: verificationResult.valid
                  ? '#dcfce7'
                  : (verificationResult.validationStatus === 'ALREADY_USED' ? '#fef3c7' : '#fee2e2'),
                color: verificationResult.valid
                  ? '#166534'
                  : (verificationResult.validationStatus === 'ALREADY_USED' ? '#92400e' : '#991b1b')
              }}>
                {verificationResult.valid ? (
                  <CheckCircle2 size={24} />
                ) : verificationResult.validationStatus === 'ALREADY_USED' ? (
                  <AlertTriangle size={24} />
                ) : (
                  <XCircle size={24} />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                    {verificationResult.valid ? 'VALID VISITOR PASS' : `PASS REJECTED (${verificationResult.validationStatus})`}
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>{verificationResult.statusMessage}</div>
                </div>
              </div>

              {/* Visitor Details Card */}
              {visitor && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{visitor.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Pass #{visitor.passNumber} • ID: {visitor.visitorId}</span>
                    </div>
                    <span className={`wmn-status-pill status-${visitor.status === 'Inside' ? 'active' : 'inactive'}`}>
                      {visitor.status}
                    </span>
                  </div>

                  <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.84rem' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Phone</span>
                      <strong style={{ display: 'block', color: '#0f172a' }}>{visitor.phone}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Host / Met</span>
                      <strong style={{ display: 'block', color: '#0f172a' }}>{visitor.personToMeet}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Purpose of Visit</span>
                      <strong style={{ display: 'block', color: '#2563eb' }}>{visitor.purpose}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Vehicle #</span>
                      <strong style={{ display: 'block', color: '#0f172a', fontFamily: 'monospace' }}>{visitor.vehicleNumber || 'Pedestrian'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Entry Gate</span>
                      <strong style={{ display: 'block', color: '#0f172a' }}>{visitor.gate}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Entry Timestamp</span>
                      <strong style={{ display: 'block', color: '#059669' }}>
                        {new Date(visitor.entryTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', textTransform: 'uppercase' }}>Exit Timestamp</span>
                      <strong style={{ display: 'block', color: visitor.exitTime ? '#dc2626' : '#64748b' }}>
                        {visitor.exitTime ? new Date(visitor.exitTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Still Inside'}
                      </strong>
                    </div>
                  </div>

                  {/* Actions inside inspector */}
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    {visitor.status === 'Inside' && (
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{ background: '#dc2626', flex: 1, justifyContent: 'center' }}
                        onClick={handleQuickCheckout}
                        disabled={loading}
                      >
                        <ExitIcon size={16} />
                        <span>Checkout Visitor Now</span>
                      </button>
                    )}

                    {visitor.status === 'Pre-Registered' && visitor.approvalStatus === 'Approved' && (
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{ background: '#059669', flex: 1, justifyContent: 'center' }}
                        onClick={handleQuickAdmit}
                        disabled={loading}
                      >
                        <Check size={16} />
                        <span>Admit Pre-Registered Visitor</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="wmn-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <Shield size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Pass Loaded</h4>
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Enter a pass voucher code or scan a visitor's QR badge to inspect clearance parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrVerificationPage;
