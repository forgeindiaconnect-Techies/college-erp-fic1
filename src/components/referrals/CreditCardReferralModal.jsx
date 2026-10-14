import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Shield, User, Building2, FileCheck, CheckCircle2,
  AlertCircle, Lock, ArrowRight, ArrowLeft, Copy, Check, Loader2, X
} from 'lucide-react';
import { submitReferral } from '../../api/index';
import './CreditCardReferralModal.css';

export default function CreditCardReferralModal({
  isOpen,
  onClose,
  defaultBank = 'HDFC Bank',
  onSuccess = null,
  rootRole = 'admin'
}) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successReferral, setSuccessReferral] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Applicant Details
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    city: '',
    employmentType: 'Salaried',

    // Step 2: Referral Details
    bankName: 'HDFC Bank',
    cardProduct: 'Millennia Cashback Credit Card',
    referralSource: 'Direct Recommendation',
    partnerReferenceNumber: '',
    notes: '',

    // Step 3: Consent & Privacy
    consentGiven: false,
    consentNoticeVersion: 'v2.4-FIC-CC-CONSENT',
    consentTimestamp: null,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // Verified Bank Options & Approved Product Categories
  const bankProductCatalog = {
    'HDFC Bank': [
      'Millennia Cashback Credit Card',
      'Regalia Gold Credit Card',
      'MoneyBack+ Credit Card',
      'Freedom RuPay Credit Card'
    ],
    'ICICI Bank': [
      'Coral Contactless Credit Card',
      'Amazon Pay ICICI Card',
      'Rubyx Dual Credit Card',
      'Platinum Chip Card'
    ],
    'State Bank of India': [
      'SimplyCLICK SBI Card',
      'SimplySAVE SBI Card',
      'SBI Card PRIME',
      'Pulse Health & Fitness Card'
    ],
    'Axis Bank': [
      'Neo Credit Card',
      'My Zone Credit Card',
      'Flipkart Axis Bank Card',
      'ACE Cashback Credit Card'
    ]
  };

  const referralSources = [
    'Campus Drive',
    'Alumni Referral',
    'Staff Reference',
    'Student Network',
    'Direct Recommendation',
    'Other'
  ];

  const employmentOptions = [
    'Salaried',
    'Self-Employed',
    'Student',
    'Professional',
    'Other'
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
      setFieldErrors({});
      setSuccessReferral(null);
      setCopiedCode(false);

      const targetBank = defaultBank || 'HDFC Bank';
      const availableProducts = bankProductCatalog[targetBank] || bankProductCatalog['HDFC Bank'];

      setFormData({
        applicantName: '',
        applicantPhone: '',
        applicantEmail: '',
        city: '',
        employmentType: 'Salaried',
        bankName: targetBank,
        cardProduct: availableProducts[0],
        referralSource: 'Direct Recommendation',
        partnerReferenceNumber: '',
        notes: '',
        consentGiven: false,
        consentNoticeVersion: 'v2.4-FIC-CC-CONSENT',
        consentTimestamp: null,
      });
    }
  }, [isOpen, defaultBank]);

  if (!isOpen) return null;

  const handleBankChange = (newBank) => {
    const products = bankProductCatalog[newBank] || ['Standard Variant'];
    setFormData(prev => ({
      ...prev,
      bankName: newBank,
      cardProduct: products[0]
    }));
  };

  const validateStep1 = () => {
    const errors = {};
    if (!formData.applicantName.trim()) {
      errors.applicantName = 'Applicant full name is required.';
    } else if (formData.applicantName.trim().length < 2) {
      errors.applicantName = 'Name must be at least 2 characters.';
    }

    const cleanPhone = formData.applicantPhone.replace(/\D/g, '');
    if (!cleanPhone) {
      errors.applicantPhone = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errors.applicantPhone = 'Enter a valid 10-digit Indian mobile number (e.g. 9876543210).';
    }

    if (formData.applicantEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.applicantEmail.trim())) {
      errors.applicantEmail = 'Enter a valid email address or leave blank.';
    }

    if (!formData.city.trim()) {
      errors.city = 'City or campus location is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!formData.bankName) {
      errors.bankName = 'Select a verified partner bank.';
    }
    if (!formData.cardProduct) {
      errors.cardProduct = 'Select an approved card variant.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    if (!formData.consentGiven) {
      setError('Explicit applicant consent is required before proceeding to submission.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setFormData(prev => ({ ...prev, consentTimestamp: new Date().toISOString() }));
        setCurrentStep(4);
      }
    }
  };

  const handlePrev = () => {
    setError(null);
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleJumpToStep = (stepNumber) => {
    if (stepNumber < currentStep) {
      setError(null);
      setCurrentStep(stepNumber);
    }
  };

  const handleCopyCode = (code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const cleanPhone = formData.applicantPhone.replace(/\D/g, '');

      const payload = {
        category: 'Credit Card',
        creditCardDetails: {
          bankName: formData.bankName,
          cardProduct: formData.cardProduct,
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: formData.applicantEmail.trim(),
          city: formData.city.trim(),
          employmentType: formData.employmentType,
          referralSource: formData.referralSource,
          partnerReferenceNumber: formData.partnerReferenceNumber.trim(),
          notes: formData.notes.trim(),
          applicantConsentGiven: true,
          consentNoticeVersion: formData.consentNoticeVersion,
          consentTimestamp: formData.consentTimestamp || new Date().toISOString()
        }
      };

      const res = await submitReferral(payload);

      if (res && res.data && res.data.success && res.data.data) {
        setSuccessReferral(res.data.data);
        if (onSuccess) onSuccess(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Failed to save referral to database.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || err.message || 'Error saving referral. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cc-modal-overlay" onClick={onClose}>
      <div className="cc-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cc-modal-header">
          <div className="cc-header-left">
            <div className="cc-header-icon">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="cc-header-title">Submit Credit Card Referral</h2>
              <p className="cc-header-sub">Verified Institutional Banking Partner Program</p>
            </div>
          </div>
          <button type="button" className="cc-modal-close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
        {successReferral ? (
          <div className="cc-modal-body">
            <div className="cc-success-box">
              <div className="cc-success-badge">
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
                Referral Successfully Recorded!
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.88rem' }}>
                Your referral has been persisted to the database and queued for partner verification.
              </p>

              {/* Unique Referral Reference Code Display */}
              <div className="cc-code-card">
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    Unique Referral Reference
                  </span>
                  <span className="cc-code-text">{successReferral.referralCode}</span>
                </div>
                <button
                  type="button"
                  className={`ref-copy-btn ${copiedCode ? 'copied' : ''}`}
                  onClick={() => handleCopyCode(successReferral.referralCode)}
                >
                  <Copy size={13} />
                  <span>{copiedCode ? 'Copied! ✓' : 'Copy'}</span>
                </button>
              </div>

              {/* Processing Pipeline Next Steps */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', textAlign: 'left', margin: '20px auto', maxWidth: '520px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#1e293b', fontWeight: 800 }}>
                  What happens next?
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                    <span><strong>Under Review:</strong> Verified by the institutional referral desk and routed to {successReferral.creditCardDetails?.bankName}.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                    <span><strong>Bank KYC Contact:</strong> Bank representative connects directly with applicant for documentation.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>3</span>
                    <span><strong>Milestone Verification:</strong> Card issuance/activation milestone recorded in institutional ledger.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>4</span>
                    <span><strong>Incentive Settlement:</strong> Eligible rewards processed under approved institutional rules.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cc-modal-footer">
              <button
                type="button"
                className="cc-btn-sec"
                onClick={() => {
                  setSuccessReferral(null);
                  setCurrentStep(1);
                  setFormData(prev => ({
                    ...prev,
                    applicantName: '',
                    applicantPhone: '',
                    applicantEmail: '',
                    city: '',
                    notes: '',
                    consentGiven: false
                  }));
                }}
              >
                Submit Another Referral
              </button>
              <button
                type="button"
                className="cc-btn-pri"
                onClick={() => {
                  onClose();
                  navigate(`/${rootRole}/referrals`);
                }}
              >
                <span>View in My Referrals →</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 4-Step Progress Indicator */}
            <div className="cc-stepper-wrap">
              <div className="cc-stepper">
                {/* Step 1 */}
                <div
                  className={`cc-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed clickable' : ''}`}
                  onClick={() => handleJumpToStep(1)}
                >
                  <div className="cc-step-bubble">
                    {currentStep > 1 ? <Check size={14} /> : '1'}
                  </div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 1</span>
                    <span className="cc-step-title">Applicant</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 1 ? 'completed' : ''}`} />

                {/* Step 2 */}
                <div
                  className={`cc-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed clickable' : ''}`}
                  onClick={() => handleJumpToStep(2)}
                >
                  <div className="cc-step-bubble">
                    {currentStep > 2 ? <Check size={14} /> : '2'}
                  </div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 2</span>
                    <span className="cc-step-title">Referral</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 2 ? 'completed' : ''}`} />

                {/* Step 3 */}
                <div
                  className={`cc-step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed clickable' : ''}`}
                  onClick={() => handleJumpToStep(3)}
                >
                  <div className="cc-step-bubble">
                    {currentStep > 3 ? <Check size={14} /> : '3'}
                  </div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 3</span>
                    <span className="cc-step-title">Consent</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 3 ? 'completed' : ''}`} />

                {/* Step 4 */}
                <div className={`cc-step-item ${currentStep === 4 ? 'active' : ''}`}>
                  <div className="cc-step-bubble">4</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 4</span>
                    <span className="cc-step-title">Review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div style={{ margin: '14px 24px 0 24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Body: Active Step */}
            <div className="cc-modal-body">
              {/* ── STEP 1: APPLICANT DETAILS ── */}
              {currentStep === 1 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 1: Applicant Information
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Provide basic contact details of the individual being referred for the card.
                    </p>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Full Legal Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className={`cc-input ${fieldErrors.applicantName ? 'error' : ''}`}
                      placeholder="e.g. Rohan Sharma (as per official ID)"
                      value={formData.applicantName}
                      onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    />
                    {fieldErrors.applicantName && (
                      <div className="cc-field-error">
                        <AlertCircle size={12} /> {fieldErrors.applicantName}
                      </div>
                    )}
                  </div>

                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        10-Digit Mobile Number <span className="req">*</span>
                      </label>
                      <div className={`cc-phone-input-wrap ${fieldErrors.applicantPhone ? 'error' : ''}`}>
                        <span className="cc-phone-prefix">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          className="cc-phone-input"
                          placeholder="9876543210"
                          value={formData.applicantPhone}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setFormData({ ...formData, applicantPhone: val });
                          }}
                        />
                      </div>
                      {fieldErrors.applicantPhone && (
                        <div className="cc-field-error">
                          <AlertCircle size={12} /> {fieldErrors.applicantPhone}
                        </div>
                      )}
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Email Address <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <input
                        type="email"
                        className={`cc-input ${fieldErrors.applicantEmail ? 'error' : ''}`}
                        placeholder="applicant@example.com"
                        value={formData.applicantEmail}
                        onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
                      />
                      {fieldErrors.applicantEmail && (
                        <div className="cc-field-error">
                          <AlertCircle size={12} /> {fieldErrors.applicantEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        City / Campus Location <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        className={`cc-input ${fieldErrors.city ? 'error' : ''}`}
                        placeholder="e.g. Bangalore / Main Campus"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                      {fieldErrors.city && (
                        <div className="cc-field-error">
                          <AlertCircle size={12} /> {fieldErrors.city}
                        </div>
                      )}
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Employment Type <span className="req">*</span>
                      </label>
                      <select
                        className="cc-input"
                        value={formData.employmentType}
                        onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                      >
                        {employmentOptions.map(emp => (
                          <option key={emp} value={emp}>{emp}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: REFERRAL DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 2: Referral & Partner Bank Details
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Select the verified partner bank and approved card variant for this referral.
                    </p>
                  </div>

                  {/* Partner Bank Selector */}
                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Verified Partner Bank <span className="req">*</span>
                    </label>
                    <div className="cc-pills-grid">
                      {Object.keys(bankProductCatalog).map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          className={`cc-pill-btn ${formData.bankName === bank ? 'active' : ''}`}
                          onClick={() => handleBankChange(bank)}
                        >
                          <Building2 size={14} style={{ marginRight: '6px' }} />
                          <span>{bank}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Product Variant */}
                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Approved Card / Product Category <span className="req">*</span>
                    </label>
                    <select
                      className="cc-input"
                      value={formData.cardProduct}
                      onChange={(e) => setFormData({ ...formData, cardProduct: e.target.value })}
                    >
                      {(bankProductCatalog[formData.bankName] || []).map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cc-grid-2">
                    {/* Referral Source */}
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Referral Channel / Source <span className="req">*</span>
                      </label>
                      <select
                        className="cc-input"
                        value={formData.referralSource}
                        onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                      >
                        {referralSources.map((src) => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                      </select>
                    </div>

                    {/* Optional Partner Reference Number */}
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Partner Reference # <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="cc-input"
                        placeholder="e.g. Lead ID, Branch Employee Code"
                        value={formData.partnerReferenceNumber}
                        onChange={(e) => setFormData({ ...formData, partnerReferenceNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Notes / Special Remarks */}
                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Referral Notes / Branch Preference <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      className="cc-input"
                      placeholder="Add any specific context or preferred branch for the applicant..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  {/* Partner Verification Safeguard Note */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                    <Shield size={16} style={{ color: '#0284c7', flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>Verified Institutional Partnership:</strong> Only approved partner banks are displayed. Card underwriting, credit limit, and issuance decisions remain solely with the issuing bank under RBI regulations.
                    </span>
                  </div>
                </div>
              )}

              {/* ── STEP 3: CONSENT & PRIVACY ── */}
              {currentStep === 3 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 3: Applicant Consent & Privacy Safeguards
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Review DPDP compliance and record explicit applicant consent before submission.
                    </p>
                  </div>

                  {/* Privacy & Non-Sensitive Data Assurance Banner */}
                  <div className="cc-privacy-callout">
                    <Lock size={20} className="cc-privacy-icon" />
                    <div>
                      <h4 className="cc-privacy-title">Data Protection & Privacy Commitment</h4>
                      <p className="cc-privacy-desc">
                        College ERP strictly adheres to the Digital Personal Data Protection (DPDP) Act and RBI banking privacy norms. We <strong>never collect, store, or solicit</strong> passwords, PINs, OTPs, CVVs, full card numbers, or sensitive financial credentials.
                      </p>
                    </div>
                  </div>

                  {/* Formal Consent Notice */}
                  <div className="cc-consent-box">
                    <div className="cc-consent-notice-title">
                      <span>Institutional Referral Consent Notice</span>
                      <span className="cc-consent-ver">{formData.consentNoticeVersion}</span>
                    </div>
                    <ul className="cc-consent-points">
                      <li>
                        The applicant has been fully informed about the {formData.bankName} credit card program and has authorized this referral.
                      </li>
                      <li>
                        The applicant explicitly consents to receive authorized communications from {formData.bankName} regarding this application.
                      </li>
                      <li>
                        No sensitive financial credentials have been requested or documented in this system.
                      </li>
                      <li>
                        This referral will be timestamped and attributed to your verified institution account for accountability.
                      </li>
                    </ul>
                  </div>

                  {/* Mandatory Explicit Consent Checkbox */}
                  <label className="cc-checkbox-label">
                    <input
                      type="checkbox"
                      className="cc-checkbox"
                      checked={formData.consentGiven}
                      onChange={(e) => setFormData({ ...formData, consentGiven: e.target.checked })}
                    />
                    <span className="cc-checkbox-text">
                      I confirm and certify that I have explained the terms to the applicant, and they have provided explicit consent to be contacted by {formData.bankName} for credit card evaluation. <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  </label>
                </div>
              )}

              {/* ── STEP 4: REVIEW & SUBMIT ── */}
              {currentStep === 4 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 4: Review Details & Confirm Submission
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Verify all information below. You can click "Edit" on any section to make corrections.
                    </p>
                  </div>

                  {/* Card 1: Applicant Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <User size={15} className="text-blue-600" />
                        <span>Applicant Information</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(1)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span>Full Legal Name</span>
                        <strong>{formData.applicantName}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Mobile Phone</span>
                        <strong>+91 {formData.applicantPhone}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Email Address</span>
                        <strong>{formData.applicantEmail || 'Not Provided'}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>City / Campus</span>
                        <strong>{formData.city}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Employment Type</span>
                        <strong>{formData.employmentType}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Referral Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <CreditCard size={15} className="text-indigo-600" />
                        <span>Referral & Product Specifications</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(2)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span>Partner Bank</span>
                        <strong>{formData.bankName}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Card Variant / Tier</span>
                        <strong>{formData.cardProduct}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Referral Source</span>
                        <strong>{formData.referralSource}</strong>
                      </div>
                      {formData.partnerReferenceNumber && (
                        <div className="cc-review-item">
                          <span>Partner Ref #</span>
                          <strong>{formData.partnerReferenceNumber}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Consent & Authorization */}
                  <div className="cc-review-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <div className="cc-review-header" style={{ borderColor: '#dcfce7' }}>
                      <div className="cc-review-title" style={{ color: '#166534' }}>
                        <FileCheck size={15} style={{ color: '#16a34a' }} />
                        <span>Consent & Compliance Status</span>
                      </div>
                      <button type="button" className="cc-edit-btn" style={{ color: '#16a34a' }} onClick={() => setCurrentStep(3)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span style={{ color: '#166534' }}>Consent Verification</span>
                        <strong style={{ color: '#14532d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} style={{ color: '#16a34a' }} /> Explicitly Recorded
                        </strong>
                      </div>
                      <div className="cc-review-item">
                        <span style={{ color: '#166534' }}>Notice Version</span>
                        <strong style={{ color: '#14532d' }}>{formData.consentNoticeVersion}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span style={{ color: '#166534' }}>Timestamp Recorded</span>
                        <strong style={{ color: '#14532d' }}>
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, Today
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Navigation Footer */}
            <div className="cc-modal-footer">
              {currentStep === 1 ? (
                <button type="button" className="cc-btn-sec" onClick={onClose}>
                  Cancel
                </button>
              ) : (
                <button type="button" className="cc-btn-sec" onClick={handlePrev} disabled={submitting}>
                  <ArrowLeft size={15} style={{ marginRight: '4px' }} />
                  Back
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  className="cc-btn-pri"
                  onClick={handleNext}
                  disabled={currentStep === 3 && !formData.consentGiven}
                >
                  <span>Continue</span>
                  <ArrowRight size={15} style={{ marginLeft: '4px' }} />
                </button>
              ) : (
                <button
                  type="button"
                  className="cc-btn-pri"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Saving Referral...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Confirm & Submit Referral</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
