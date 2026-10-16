import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Shield, User, Building2, FileCheck, CheckCircle2,
  AlertCircle, Lock, ArrowRight, ArrowLeft, Copy, Check, Loader2, X
} from 'lucide-react';
import { submitReferral, getPublicReferralFormConfig } from '../../api/index';
import DynamicFieldRenderer from './DynamicFieldRenderer';
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
  const [formConfig, setFormConfig] = useState(null);
  const [customFields, setCustomFields] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Applicant Details
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    city: '',

    // Step 2: Credit Card Details
    cardCategory: 'Cashback & Rewards',
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

  // Verified Bank Options & Approved Product Categories (Default Fallback)
  const defaultBankProductCatalog = {
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
    ],
    'Kotak Mahindra Bank': [
      'Kotak League Platinum Card',
      'Kotak Mojo Platinum Card',
      'Kotak 811 #DreamDifferent Card',
      'Kotak White Credit Card'
    ]
  };

  const cardCategories = [
    'Cashback & Rewards',
    'Travel & Premium Lounge',
    'Fuel & Utilities',
    'Student & Lifetime Free',
    'Business / Commercial'
  ];

  const referralSources = [
    'Direct Recommendation',
    'Campus Drive',
    'Alumni Referral',
    'Staff Reference',
    'Student Network',
    'Other'
  ];

  const [bankProductCatalog, setBankProductCatalog] = useState(defaultBankProductCatalog);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await getPublicReferralFormConfig('Credit Card');
        if (res?.data?.success && res.data.data) {
          setFormConfig(res.data.data);
          if (res.data.data.partners) {
            const liveCatalog = {};
            res.data.data.partners.forEach((p) => {
              if (p.isActive !== false) {
                const activeProds = (p.products || [])
                  .filter((prod) => prod.isActive !== false)
                  .map((prod) => prod.name);
                liveCatalog[p.name] = activeProds.length > 0 ? activeProds : ['Standard Variant'];
              }
            });
            if (Object.keys(liveCatalog).length > 0) {
              setBankProductCatalog(liveCatalog);
              setConfigLoaded(true);
            }
          }
        }
      } catch (e) {
        console.warn('Using default credit card catalog:', e.message);
      }
    };

    if (isOpen) {
      fetchConfig();
      setCurrentStep(1);
      setError(null);
      setFieldErrors({});
      setCustomFields({});
      setSuccessReferral(null);
      setCopiedCode(false);

      const targetBank = defaultBank || 'HDFC Bank';
      const availableProducts = bankProductCatalog[targetBank] || Object.values(bankProductCatalog)[0] || ['Millennia Cashback Credit Card'];

      setFormData({
        applicantName: '',
        applicantPhone: '',
        applicantEmail: '',
        city: '',
        cardCategory: 'Cashback & Rewards',
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

  useEffect(() => {
    if (configLoaded && Object.keys(bankProductCatalog).length > 0) {
      setFormData(prev => {
        const currentBankValid = Boolean(bankProductCatalog[prev.bankName]);
        const activeBank = currentBankValid ? prev.bankName : Object.keys(bankProductCatalog)[0];
        const prods = bankProductCatalog[activeBank] || ['Standard Variant'];
        const currentProdValid = prods.includes(prev.cardProduct);
        return {
          ...prev,
          bankName: activeBank,
          cardProduct: currentProdValid ? prev.cardProduct : prods[0]
        };
      });
    }
  }, [configLoaded, bankProductCatalog]);

  if (!isOpen) return null;

  const handleBankChange = (newBank) => {
    const products = bankProductCatalog[newBank] || ['Standard Variant'];
    setFormData(prev => ({
      ...prev,
      bankName: newBank,
      cardProduct: products[0]
    }));
  };

  const handleCustomFieldChange = (fieldKey, value) => {
    setCustomFields(prev => ({ ...prev, [fieldKey]: value }));
    if (fieldErrors[fieldKey]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };

      if (name === 'bankName') {
        const prods = bankProductCatalog[value] || ['Standard Variant'];
        updated.cardProduct = prods[0];
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

      // Dynamic custom fields validation for Step 1
      const step1Custom = (formConfig?.fieldsConfig || []).filter(f => !f.isSystem && (!f.step || f.step === 1) && !['applicantName', 'applicantEmail', 'applicantPhone', 'city', 'email', 'phone', 'location'].includes(f.fieldKey) && !['email address', 'city / campus location'].includes((f.label || '').toLowerCase().trim()));
      step1Custom.forEach(f => {
        let val = customFields[f.fieldKey];
        const keyLower = (f.fieldKey || '').toLowerCase();
        const labelLower = (f.label || '').toLowerCase();

        if (val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '')) {
          if (keyLower.includes('city') || keyLower.includes('location') || labelLower.includes('city') || labelLower.includes('location')) {
            val = formData.city ? formData.city.trim() : '';
          } else if (keyLower.includes('name') || labelLower.includes('name')) {
            val = formData.applicantName ? formData.applicantName.trim() : '';
          } else if (keyLower.includes('phone') || keyLower.includes('mobile') || labelLower.includes('phone') || labelLower.includes('mobile')) {
            val = formData.applicantPhone ? formData.applicantPhone.trim() : '';
          } else if (keyLower.includes('email') || labelLower.includes('email')) {
            val = formData.applicantEmail ? formData.applicantEmail.trim() : '';
          }
        }

        if (f.isRequired && (val === undefined || val === null || val === '' || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0))) {
          errors[f.fieldKey] = f.errorMessage || `${f.label} is required.`;
        }
      });
    }

    if (stepNumber === 2) {
      if (!formData.bankName) {
        errors.bankName = 'Select a verified partner bank.';
      }
      if (!formData.cardProduct) {
        errors.cardProduct = 'Select an approved card offering.';
      }

      // Dynamic custom fields validation for Step 2
      const step2Custom = (formConfig?.fieldsConfig || []).filter(f => 
        !f.isSystem && 
        f.step === 2 && 
        !['bankname', 'cardproduct', 'partnerreferencenumber', 'notes'].includes((f.fieldKey || '').toLowerCase())
      );
      step2Custom.forEach(f => {
        let val = customFields[f.fieldKey];
        const keyLower = (f.fieldKey || '').toLowerCase();
        if (keyLower.includes('source') || keyLower.includes('channel')) {
          val = val || 'Campus Drive';
        } else if (keyLower.includes('partner') || keyLower.includes('ref')) {
          val = formData.partnerReferenceNumber || 'optional';
        } else if (keyLower.includes('note') || keyLower.includes('remark')) {
          val = formData.notes || 'optional';
        }

        if (f.isRequired && (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0))) {
          errors[f.fieldKey] = f.errorMessage || `${f.label} is required.`;
        }
      });
    }

    if (stepNumber === 3) {
      if (!formData.consentGiven) {
        errors.consentGiven = 'Explicit consent is mandatory under RBI and DPDP guidelines.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setError(null);
      if (currentStep === 3 && !formData.consentTimestamp) {
        setFormData(prev => ({ ...prev, consentTimestamp: new Date().toISOString() }));
      }
      setCurrentStep(prev => prev + 1);
    } else {
      setError('Please fill in all required fields marked with * before continuing.');
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

      const cleanPhone = (formData.applicantPhone || '').replace(/\D/g, '');

      const summaryText = `${formData.applicantName.trim()} - ${formData.bankName} (${formData.cardProduct})`;

      const payload = {
        category: 'Credit Card',
        formVersion: formConfig?.version || 1,
        partnerName: formData.bankName,
        productName: formData.cardProduct,
        notes: formData.notes ? formData.notes.trim() : '',
        summary: summaryText,
        customFields: {
          summary: summaryText,
          ...customFields
        },
        formData: {
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: formData.applicantEmail ? formData.applicantEmail.trim() : '',
          city: formData.city.trim(),
          cardCategory: formData.cardCategory,
          bankName: formData.bankName,
          cardProduct: formData.cardProduct,
          referralSource: formData.referralSource,
          partnerReferenceNumber: formData.partnerReferenceNumber ? formData.partnerReferenceNumber.trim() : '',
          summary: summaryText,
          ...customFields
        },
        creditCardDetails: {
          bankName: formData.bankName,
          cardProduct: formData.cardProduct,
          cardCategory: formData.cardCategory,
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: formData.applicantEmail ? formData.applicantEmail.trim() : '',
          city: formData.city.trim(),
          referralSource: formData.referralSource,
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
      console.error('Error submitting credit card referral:', err);
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
        <div className="cc-modal-header" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}>
          <div className="cc-header-left">
            <div className="cc-header-icon" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
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
              <div className="cc-success-badge" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
                Credit Card Referral Successfully Recorded!
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.88rem' }}>
                The referral has been securely saved to the database with verified applicant consent.
              </p>

              {/* Unique Referral Reference Code Display */}
              <div className="cc-code-card" style={{ borderColor: '#bfdbfe' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    Unique Referral Reference
                  </span>
                  <span className="cc-code-text" style={{ color: '#2563eb' }}>{successReferral.referralCode}</span>
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
                  <div><span style={{ color: '#64748b' }}>Applicant:</span> <strong>{successReferral.creditCardDetails?.applicantName || successReferral.formData?.applicantName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Partner Bank:</span> <strong>{successReferral.creditCardDetails?.bankName || successReferral.partnerName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Card Offering:</span> <strong>{successReferral.creditCardDetails?.cardProduct || successReferral.productName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: '#2563eb' }}>Submitted</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Referral Channel:</span> <strong>{successReferral.creditCardDetails?.referralSource || 'Direct Recommendation'}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Consent Notice:</span> <strong style={{ fontFamily: 'monospace' }}>{successReferral.creditCardDetails?.consentNoticeVersion || 'v2.4-FIC-CC-CONSENT'}</strong></div>
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
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
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
            {/* 4-Step Progress Indicator (Identical to Insurance Stepper Style) */}
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
                    <span className="cc-step-title">Card Details</span>
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

              {/* Draft Status Banner */}
              {formConfig && formConfig.status === 'draft' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>Notice: This Credit Card Referral Form is currently in Draft status. Submissions are paused.</span>
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
                      placeholder="e.g. Rohan Sharma"
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

                  {/* Dynamic Step 1 Custom Fields (Excludes duplicate base fields) */}
                  {(formConfig?.fieldsConfig || [])
                    .filter(f => !f.isSystem && (!f.step || f.step === 1) && !['applicantName', 'applicantEmail', 'applicantPhone', 'city', 'email', 'phone', 'location'].includes(f.fieldKey) && !['email address', 'city / campus location'].includes((f.label || '').toLowerCase().trim()))
                    .map(f => (
                      <DynamicFieldRenderer
                        key={f.fieldKey}
                        field={f}
                        value={customFields[f.fieldKey]}
                        onChange={handleCustomFieldChange}
                        error={fieldErrors[f.fieldKey]}
                      />
                    ))}
                </div>
              )}

              {/* ── STEP 2: CREDIT CARD DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Card Category <span className="req">*</span>
                      </label>
                      <select
                        name="cardCategory"
                        className="cc-select"
                        value={formData.cardCategory}
                        onChange={handleChange}
                      >
                        {cardCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Approved Partner Bank <span className="req">*</span>
                      </label>
                      <select
                        name="bankName"
                        className="cc-select"
                        value={formData.bankName}
                        onChange={handleChange}
                      >
                        {Object.keys(bankProductCatalog).map(bank => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Selected Approved Card Offering <span className="req">*</span>
                    </label>
                    <select
                      name="cardProduct"
                      className="cc-select"
                      value={formData.cardProduct}
                      onChange={handleChange}
                    >
                      {(bankProductCatalog[formData.bankName] || ['Standard Variant']).map(offering => (
                        <option key={offering} value={offering}>{offering}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Referral Channel / Source <span className="req">*</span>
                      </label>
                      <select
                        name="referralSource"
                        className="cc-select"
                        value={formData.referralSource}
                        onChange={handleChange}
                      >
                        {referralSources.map(source => (
                          <option key={source} value={source}>{source}</option>
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
                        placeholder="e.g. CRD-REF-901"
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
                      placeholder="e.g. Preferred language, best time to call, branch preference."
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Dynamic Step 2 Custom Fields */}
                  {(formConfig?.fieldsConfig || [])
                    .filter(f => 
                      !f.isSystem && 
                      f.step === 2 && 
                      !['bankname', 'cardproduct', 'partnerreferencenumber', 'notes'].includes((f.fieldKey || '').toLowerCase())
                    )
                    .map(f => (
                      <DynamicFieldRenderer
                        key={f.fieldKey}
                        field={f}
                        value={customFields[f.fieldKey]}
                        onChange={handleCustomFieldChange}
                        error={fieldErrors[f.fieldKey]}
                      />
                    ))}

                  <div className="cc-privacy-callout">
                    <Shield size={20} className="cc-privacy-icon" />
                    <div>
                      <div className="cc-privacy-title">RBI Banking Underwriting Boundary</div>
                      <div className="cc-privacy-desc">
                        Do NOT record bank passwords, PINs, OTPs, CVVs, full card numbers, or upload financial paperwork in this referral form.
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
                      <span>Statutory Banking Privacy Notice</span>
                      <span className="cc-consent-ver">{formData.consentNoticeVersion}</span>
                    </div>
                    {formConfig?.generalSettings?.consentText ? (
                      <p style={{ margin: '8px 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                        {formConfig.generalSettings.consentText}
                      </p>
                    ) : (
                      <ul className="cc-consent-points">
                        <li><strong>Purpose of Processing:</strong> Contact information is collected strictly to enable authorized partner banks ({formData.bankName}) to provide card advisory and application facilitation for {formData.cardProduct}.</li>
                        <li><strong>Zero Sensitive Financial Data:</strong> No passwords, PINs, OTPs, CVVs, or full card numbers are collected or stored in this ERP system.</li>
                        <li><strong>Referrer Verification:</strong> Institutional incentive eligibility is calculated strictly upon genuine card issuance and verified milestones.</li>
                      </ul>
                    )}
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
                      I confirm that the applicant has explicitly consented to share their name, contact details, and card interest with {formData.bankName} for institutional credit card assistance.
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

                  {/* Review Credit Card Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <CreditCard size={15} className="text-blue-600" />
                        <span>Credit Card Details</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(2)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span>Category</span>
                        <strong>{formData.cardCategory}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Partner Bank</span>
                        <strong>{formData.bankName}</strong>
                      </div>
                      <div className="cc-review-item" style={{ gridColumn: 'span 2' }}>
                        <span>Selected Offering</span>
                        <strong>{formData.cardProduct}</strong>
                      </div>
                      <div className="cc-review-item">
                        <span>Referral Source</span>
                        <strong>{formData.referralSource}</strong>
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

                  {/* Dynamic Custom Details Review */}
                  {Object.keys(customFields).length > 0 && (
                    <div className="cc-review-card">
                      <div className="cc-review-header">
                        <div className="cc-review-title">
                          <FileCheck size={15} className="text-purple-600" />
                          <span>Additional Custom Details</span>
                        </div>
                      </div>
                      <div className="cc-review-grid">
                        {(formConfig?.fieldsConfig || [])
                          .filter(f => !f.isSystem && customFields[f.fieldKey] !== undefined && customFields[f.fieldKey] !== '')
                          .map(f => (
                            <div key={f.fieldKey} className="cc-review-item">
                              <span>{f.label}</span>
                              <strong>{Array.isArray(customFields[f.fieldKey]) ? customFields[f.fieldKey].join(', ') : String(customFields[f.fieldKey])}</strong>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
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
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
                  onClick={handleNext}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#2563eb', borderColor: '#2563eb' }}
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
                      <span>Submit Credit Card Referral</span>
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
