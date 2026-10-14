import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Heart, Car, UserCheck, Building2, User, FileCheck, CheckCircle2,
  AlertCircle, Lock, ArrowRight, ArrowLeft, Copy, Check, Loader2, X
} from 'lucide-react';
import { submitReferral } from '../../api/index';
import './CreditCardReferralModal.css';

export default function InsuranceReferralModal({
  isOpen,
  onClose,
  defaultCategory = 'Health',
  defaultProvider = 'Star Health & Allied Insurance',
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

    // Step 2: Insurance Details
    insuranceCategory: 'Health',
    provider: 'Star Health & Allied Insurance',
    selectedOffering: 'Comprehensive Family Floater Plan',
    sumInsuredTier: '₹5,00,000 (5 Lakhs)',
    partnerReferenceNumber: '',
    notes: '',

    // Step 3: Consent & Privacy
    consentGiven: false,
    consentNoticeVersion: 'v1.2-FIC-INS-CONSENT',
    consentTimestamp: null,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // Approved Underwriters / Insurers
  const approvedInsurers = [
    'Star Health & Allied Insurance',
    'HDFC ERGO General Insurance',
    'ICICI Lombard General Insurance',
    'Tata AIG General Insurance',
    'Care Health Insurance'
  ];

  // Approved Offerings by Category
  const offeringsByCategory = {
    Health: [
      'Comprehensive Family Floater Plan',
      'Optima Secure Hospitalization Shield',
      'Senior Citizen Red Carpet Health Plan',
      'Campus Student Group Mediclaim'
    ],
    Motor: [
      'Comprehensive Car Protect (Zero-Depreciation)',
      'Two-Wheeler Comprehensive Safety Cover',
      'DriveSmart Commercial & Fleet Cover',
      'Third-Party + Own Damage Hybrid'
    ],
    Life: [
      'Click 2 Protect Super (Term Life)',
      'iSelect Smart Life Pure Term Plan',
      'Institutional Campus Life Protection Plan',
      'Guaranteed Income & Life Shield'
    ],
    Property: [
      'Bharat Griha Raksha (Residential Home Protection)',
      'Educational Campus Property Shield',
      'Commercial Property & Office Asset Cover',
      'Standard Fire & Special Perils Cover'
    ]
  };

  const sumInsuredTiers = [
    '₹3,00,000 (3 Lakhs)',
    '₹5,00,000 (5 Lakhs)',
    '₹10,00,000 (10 Lakhs)',
    '₹25,00,000 (25 Lakhs)',
    '₹50,00,000 (50 Lakhs)',
    '₹1,00,00,000 (1 Crore)'
  ];

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError(null);
      setFieldErrors({});
      setSuccessReferral(null);
      setCopiedCode(false);

      let targetCat = 'Health';
      if (defaultCategory) {
        const catStr = String(defaultCategory).toLowerCase();
        if (catStr.includes('motor')) targetCat = 'Motor';
        else if (catStr.includes('life')) targetCat = 'Life';
        else if (catStr.includes('property')) targetCat = 'Property';
        else if (catStr.includes('health')) targetCat = 'Health';
      }
      const availableOfferings = offeringsByCategory[targetCat] || offeringsByCategory.Health;

      setFormData({
        applicantName: '',
        applicantPhone: '',
        applicantEmail: '',
        city: '',
        insuranceCategory: targetCat,
        provider: defaultProvider || 'Star Health & Allied Insurance',
        selectedOffering: availableOfferings[0],
        sumInsuredTier: '₹5,00,000 (5 Lakhs)',
        partnerReferenceNumber: '',
        notes: '',
        consentGiven: false,
        consentNoticeVersion: 'v1.2-FIC-INS-CONSENT',
        consentTimestamp: null,
      });
    }
  }, [isOpen, defaultCategory, defaultProvider]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'insuranceCategory') {
        const offerings = offeringsByCategory[value] || offeringsByCategory.Health;
        updated.selectedOffering = offerings[0];
      }

      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (stepNumber) => {
    const errors = {};

    if (stepNumber === 1) {
      if (!formData.applicantName || formData.applicantName.trim().length < 3) {
        errors.applicantName = 'Enter the applicant’s legal full name (minimum 3 characters).';
      }

      const phoneRegex = /^[6-9]\d{9}$/;
      const cleanedPhone = (formData.applicantPhone || '').replace(/\D/g, '');
      if (!phoneRegex.test(cleanedPhone)) {
        errors.applicantPhone = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
      }

      if (formData.applicantEmail && formData.applicantEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.applicantEmail.trim())) {
          errors.applicantEmail = 'Enter a valid email address or leave it blank.';
        }
      }

      if (!formData.city || formData.city.trim().length < 2) {
        errors.city = 'Enter the applicant’s residential city or campus location.';
      }
    }

    if (stepNumber === 2) {
      if (!formData.provider) {
        errors.provider = 'Select an approved partner insurer.';
      }
      if (!formData.selectedOffering) {
        errors.selectedOffering = 'Select an approved insurance offering.';
      }
    }

    if (stepNumber === 3) {
      if (!formData.consentGiven) {
        errors.consentGiven = 'Explicit consent is mandatory under IRDAI and DPDP guidelines.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3 && !formData.consentTimestamp) {
        setFormData(prev => ({ ...prev, consentTimestamp: new Date().toISOString() }));
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setError('Please resolve all validation errors before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const numericTier = parseInt((formData.sumInsuredTier || '').replace(/\D/g, ''), 10) || 500000;

      const payload = {
        category: 'Insurance',
        insuranceDetails: {
          provider: formData.provider,
          insuranceCategory: formData.insuranceCategory,
          productType: formData.insuranceCategory === 'Motor' ? 'Motor / Vehicle' : formData.insuranceCategory === 'Life' ? 'Term Life' : formData.insuranceCategory,
          selectedOffering: formData.selectedOffering,
          sumInsuredTier: formData.sumInsuredTier,
          estimatedSumInsured: numericTier,
          applicantName: formData.applicantName.trim(),
          applicantPhone: formData.applicantPhone.trim().replace(/\D/g, ''),
          applicantEmail: formData.applicantEmail ? formData.applicantEmail.trim() : '',
          applicantCity: formData.city.trim(),
          partnerReferenceNumber: formData.partnerReferenceNumber ? formData.partnerReferenceNumber.trim() : '',
          applicantConsentGiven: true,
          consentTimestamp: formData.consentTimestamp || new Date().toISOString(),
          consentNoticeVersion: formData.consentNoticeVersion,
          notes: formData.notes ? formData.notes.trim() : '',
        }
      };

      const res = await submitReferral(payload);

      if (res && res.data && res.data.success) {
        setSuccessReferral(res.data.data);
        if (onSuccess) onSuccess(res.data.data);
      } else {
        throw new Error(res?.data?.message || 'Referral submission failed. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting insurance referral:', err);
      setError(err?.response?.data?.message || err.message || 'Server error occurred while submitting referral.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = (code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="cc-modal-overlay" onClick={onClose}>
      <div className="cc-modal-dialog" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="cc-modal-header" style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)' }}>
          <div className="cc-header-left">
            <div className="cc-header-icon" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <Shield size={24} />
            </div>
            <div>
              <h2 className="cc-header-title">Submit Insurance Referral</h2>
              <p className="cc-header-sub">Verified Institutional Underwriter Policy Facilitation</p>
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
              <div className="cc-success-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
                Insurance Referral Successfully Recorded!
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.88rem' }}>
                The referral has been securely saved to the database with verified applicant consent.
              </p>

              {/* Unique Referral Reference Code Display */}
              <div className="cc-code-card" style={{ borderColor: '#a7f3d0' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    Unique Referral Reference
                  </span>
                  <span className="cc-code-text" style={{ color: '#047857' }}>{successReferral.referralCode}</span>
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

              {/* Summary Details */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', textAlign: 'left', margin: '20px auto', maxWidth: '520px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><span style={{ color: '#64748b' }}>Applicant:</span> <strong>{successReferral.insuranceDetails?.applicantName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Category:</span> <strong>{successReferral.insuranceDetails?.insuranceCategory} Insurance</strong></div>
                  <div><span style={{ color: '#64748b' }}>Partner Insurer:</span> <strong>{successReferral.insuranceDetails?.provider}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: '#059669' }}>Submitted</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Offering:</span> <strong>{successReferral.insuranceDetails?.selectedOffering}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Consent Notice:</span> <strong style={{ fontFamily: 'monospace' }}>{successReferral.insuranceDetails?.consentNoticeVersion}</strong></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  className="cc-btn-sec"
                  onClick={() => {
                    setSuccessReferral(null);
                    setCurrentStep(1);
                  }}
                >
                  Submit Another Referral
                </button>
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  onClick={() => {
                    onClose();
                    navigate(`/${rootRole}/referrals`);
                  }}
                >
                  <span>View in My Referrals →</span>
                </button>
              </div>
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
                  onClick={() => currentStep > 1 && setCurrentStep(1)}
                >
                  <div className="cc-step-bubble">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 1</span>
                    <span className="cc-step-title">Applicant</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 1 ? 'completed' : ''}`} />

                {/* Step 2 */}
                <div
                  className={`cc-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed clickable' : ''}`}
                  onClick={() => currentStep > 2 && setCurrentStep(2)}
                >
                  <div className="cc-step-bubble">{currentStep > 2 ? <Check size={14} /> : '2'}</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 2</span>
                    <span className="cc-step-title">Insurance Details</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 2 ? 'completed' : ''}`} />

                {/* Step 3 */}
                <div
                  className={`cc-step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed clickable' : ''}`}
                  onClick={() => currentStep > 3 && setCurrentStep(3)}
                >
                  <div className="cc-step-bubble">{currentStep > 3 ? <Check size={14} /> : '3'}</div>
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
                    <span className="cc-step-title">Review & Submit</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="cc-modal-body">
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* ── STEP 1: APPLICANT ── */}
              {currentStep === 1 && (
                <div>
                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Applicant Legal Full Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      name="applicantName"
                      className={`cc-input ${fieldErrors.applicantName ? 'error' : ''}`}
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.applicantName}
                      onChange={handleChange}
                      autoFocus
                    />
                    {fieldErrors.applicantName && (
                      <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.applicantName}</div>
                    )}
                  </div>

                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        10-Digit Mobile Number <span className="req">*</span>
                      </label>
                      <div className="cc-phone-input-wrap">
                        <span className="cc-phone-prefix">+91</span>
                        <input
                          type="tel"
                          name="applicantPhone"
                          maxLength={10}
                          className="cc-phone-input"
                          placeholder="9876543210"
                          value={formData.applicantPhone}
                          onChange={handleChange}
                        />
                      </div>
                      {fieldErrors.applicantPhone && (
                        <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.applicantPhone}</div>
                      )}
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Email Address <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <input
                        type="email"
                        name="applicantEmail"
                        className={`cc-input ${fieldErrors.applicantEmail ? 'error' : ''}`}
                        placeholder="applicant@example.com"
                        value={formData.applicantEmail}
                        onChange={handleChange}
                      />
                      {fieldErrors.applicantEmail && (
                        <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.applicantEmail}</div>
                      )}
                    </div>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      City / Campus Location <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      className={`cc-input ${fieldErrors.city ? 'error' : ''}`}
                      placeholder="e.g. Chennai, Bangalore, Coimbatore"
                      value={formData.city}
                      onChange={handleChange}
                    />
                    {fieldErrors.city && (
                      <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.city}</div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 2: INSURANCE DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Insurance Category <span className="req">*</span>
                      </label>
                      <select
                        name="insuranceCategory"
                        className="cc-select"
                        value={formData.insuranceCategory}
                        onChange={handleChange}
                      >
                        <option value="Health">Health Insurance</option>
                        <option value="Motor">Motor Insurance</option>
                        <option value="Life">Life Insurance</option>
                        <option value="Property">Property Insurance</option>
                      </select>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Approved Partner Insurer <span className="req">*</span>
                      </label>
                      <select
                        name="provider"
                        className="cc-select"
                        value={formData.provider}
                        onChange={handleChange}
                      >
                        {approvedInsurers.map(ins => (
                          <option key={ins} value={ins}>{ins}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Selected Approved Offering <span className="req">*</span>
                    </label>
                    <select
                      name="selectedOffering"
                      className="cc-select"
                      value={formData.selectedOffering}
                      onChange={handleChange}
                    >
                      {(offeringsByCategory[formData.insuranceCategory] || []).map(off => (
                        <option key={off} value={off}>{off}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Coverage Tier / Sum Insured
                      </label>
                      <select
                        name="sumInsuredTier"
                        className="cc-select"
                        value={formData.sumInsuredTier}
                        onChange={handleChange}
                      >
                        {sumInsuredTiers.map(tier => (
                          <option key={tier} value={tier}>{tier}</option>
                        ))}
                      </select>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Partner Reference # <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        name="partnerReferenceNumber"
                        className="cc-input"
                        placeholder="e.g. INS-REF-901"
                        value={formData.partnerReferenceNumber}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Non-Sensitive Advisory Remarks <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="cc-textarea"
                      placeholder="e.g. Preferred language Tamil/English, best time to call."
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="cc-privacy-callout">
                    <Shield size={20} className="cc-privacy-icon" />
                    <div>
                      <div className="cc-privacy-title">IRDAI Underwriting Boundary</div>
                      <div className="cc-privacy-desc">
                        Do NOT record medical histories, diagnostic paperwork, or policy scan uploads in this referral form.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: CONSENT & PRIVACY ── */}
              {currentStep === 3 && (
                <div>
                  <div className="cc-consent-box">
                    <div className="cc-consent-notice-title">
                      <span>Statutory Insurance Privacy Notice</span>
                      <span className="cc-consent-ver">{formData.consentNoticeVersion}</span>
                    </div>
                    <ul className="cc-consent-points">
                      <li><strong>Purpose of Processing:</strong> Contact information is collected strictly to enable authorized underwriters ({formData.provider}) to provide insurance advisory and quotation for {formData.selectedOffering}.</li>
                      <li><strong>Zero Sensitive Health Data:</strong> No medical records, diagnostic tests, or payment passwords are collected or stored in this ERP system.</li>
                      <li><strong>Referrer Verification:</strong> Institutional incentive eligibility is calculated strictly upon genuine policy verification and approved milestones.</li>
                    </ul>
                  </div>

                  <label className="cc-checkbox-label">
                    <input
                      type="checkbox"
                      name="consentGiven"
                      className="cc-checkbox"
                      checked={formData.consentGiven}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          consentGiven: e.target.checked,
                          consentTimestamp: e.target.checked ? new Date().toISOString() : null
                        }));
                        if (fieldErrors.consentGiven) {
                          setFieldErrors(prev => ({ ...prev, consentGiven: null }));
                        }
                      }}
                    />
                    <span className="cc-checkbox-text">
                      I confirm that the applicant has explicitly consented to share their name, contact details, and policy interest with {formData.provider} for institutional insurance assistance.
                    </span>
                  </label>
                  {fieldErrors.consentGiven && (
                    <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.consentGiven}</div>
                  )}

                  {formData.consentTimestamp && (
                    <div style={{ marginTop: '10px', fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Check size={14} />
                      <span>Consent timestamp recorded: {new Date(formData.consentTimestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: REVIEW & SUBMIT ── */}
              {currentStep === 4 && (
                <div>
                  {/* Review Applicant */}
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
                        <span>Legal Name</span>
                        <strong>{formData.applicantName}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Contact Mobile</span>
                        <strong>+91 {formData.applicantPhone}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Email</span>
                        <strong>{formData.applicantEmail || '—'}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>City / Campus</span>
                        <strong>{formData.city}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Review Insurance Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Shield size={15} className="text-emerald-600" />
                        <span>Insurance Details</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(2)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span>Category</span>
                        <strong>{formData.insuranceCategory} Insurance</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Partner Insurer</span>
                        <strong>{formData.provider}</strong>
                      </div>
                      <div className="cc-review-item" style={{ gridColumn: 'span 2' }}>
                        <span>Selected Offering</span>
                        <strong>{formData.selectedOffering}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Sum Insured Tier</span>
                        <strong>{formData.sumInsuredTier}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Partner Reference</span>
                        <strong style={{ fontFamily: 'monospace' }}>{formData.partnerReferenceNumber || '—'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Review Consent */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Lock size={15} className="text-purple-600" />
                        <span>Applicant Consent Record</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(3)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span>Consent Status</span>
                        <strong style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Explicit Consent Recorded
                        </strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Notice Version</span>
                        <strong style={{ fontFamily: 'monospace' }}>{formData.consentNoticeVersion}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="cc-modal-footer">
              {currentStep > 1 ? (
                <button
                  type="button"
                  className="cc-btn-sec"
                  onClick={handleBack}
                  disabled={submitting}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  className="cc-btn-sec"
                  onClick={onClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  onClick={handleNext}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#059669', borderColor: '#059669' }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="cc-spin" />
                      <span>Saving Referral...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Submit Insurance Referral</span>
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
