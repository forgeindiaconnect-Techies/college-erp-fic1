import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark, User, Building2, Wallet, FileCheck, CheckCircle2,
  AlertCircle, Lock, ArrowRight, ArrowLeft, Copy, Check, Loader2, X, ShieldAlert
} from 'lucide-react';
import { submitReferral, getPublicReferralFormConfig } from '../../api/index';
import DynamicFieldRenderer from './DynamicFieldRenderer';
import './CreditCardReferralModal.css';

export default function AccountOpeningReferralModal({
  isOpen,
  onClose,
  defaultAccountType = 'Savings Account',
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
    applicantType: 'Student',

    // Step 2: Account Details
    bankName: 'HDFC Bank',
    accountProduct: 'Campus Zero-Balance Student Savings',
    accountType: 'Savings Account',
    partnerReferenceNumber: '',
    notes: '',

    // Step 3: Consent & Privacy
    consentGiven: false,
    consentNoticeVersion: 'v1.2-FIC-ACC-CONSENT',
    consentTimestamp: null,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // Participating Banks (Default Fallback)
  const defaultParticipatingBanks = [
    'HDFC Bank',
    'ICICI Bank',
    'State Bank of India',
    'Axis Bank'
  ];

  // Approved Institutional Products (Default Fallback)
  const defaultProductsByAccountType = {
    'Student Zero-Balance': [
      'Campus Zero-Balance Student Savings',
      'Smart Student Digital Account with UPI',
      'Scholar Digital Wallet Account'
    ],
    'Savings Account': [
      'Standard Institutional Savings Account',
      'High-Interest Regular Savings Variant',
      'Campus Scholar Flexi-Savings'
    ],
    'Salary Account': [
      'Campus Faculty & Staff Corporate Salary Account',
      'Executive Preferred Salary Account',
      'Institutional Employee Payroll Variant'
    ],
    'Current Account': [
      'Campus Vendor & Contractor Commercial Account',
      'SME Merchant Trade Current Account',
      'Institutional Trust / Society Current Variant'
    ]
  };

  const applicantTypes = [
    'Student',
    'Faculty / Staff',
    'Research Scholar',
    'Alumni',
    'Campus Vendor',
    'Other'
  ];

  const defaultAccountTypesList = [
    'Student Zero-Balance',
    'Savings Account',
    'Salary Account',
    'Current Account'
  ];

  const [participatingBanks, setParticipatingBanks] = useState(defaultParticipatingBanks);
  const [productsByAccountType, setProductsByAccountType] = useState(defaultProductsByAccountType);
  const [accountTypesList, setAccountTypesList] = useState(defaultAccountTypesList);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    const fetchAccountConfig = async () => {
      try {
        const res = await getPublicReferralFormConfig('Bank Account');
        if (res?.data?.success && res.data.data) {
          setFormConfig(res.data.data);
          if (res.data.data.partners) {
            const partners = res.data.data.partners.filter((p) => p.isActive !== false);
            if (partners.length > 0) {
              setParticipatingBanks(partners.map((p) => p.name));
            }

            if (res.data.data.categoriesList && res.data.data.categoriesList.length > 0) {
              setAccountTypesList(res.data.data.categoriesList);
            }

            const dynamicProducts = {};
            partners.forEach((p) => {
              (p.products || []).forEach((prod) => {
                if (prod.isActive !== false) {
                  const type = prod.productCategory || 'Savings Account';
                  if (!dynamicProducts[type]) dynamicProducts[type] = [];
                  dynamicProducts[type].push(prod.name);
                }
              });
            });

            // Ensure non-empty fallback for account types
            Object.keys(defaultProductsByAccountType).forEach((type) => {
              if (!dynamicProducts[type] || dynamicProducts[type].length === 0) {
                dynamicProducts[type] = defaultProductsByAccountType[type];
              }
            });

            setProductsByAccountType(dynamicProducts);
            setConfigLoaded(true);
          }
        }
      } catch (err) {
        console.warn('Using default banking catalog:', err.message);
      }
    };

    if (isOpen) {
      fetchAccountConfig();
      setCurrentStep(1);
      setError(null);
      setFieldErrors({});
      setCustomFields({});
      setSuccessReferral(null);
      setCopiedCode(false);

      let targetType = 'Savings Account';
      if (defaultAccountType) {
        const typeStr = String(defaultAccountType).toLowerCase();
        if (typeStr.includes('student') || typeStr.includes('zero')) targetType = 'Student Zero-Balance';
        else if (typeStr.includes('salary')) targetType = 'Salary Account';
        else if (typeStr.includes('current') || typeStr.includes('business')) targetType = 'Current Account';
        else if (typeStr.includes('saving')) targetType = 'Savings Account';
      }
      const availableProducts = productsByAccountType[targetType] || productsByAccountType['Savings Account'];

      setFormData({
        applicantName: '',
        applicantPhone: '',
        applicantEmail: '',
        city: '',
        applicantType: 'Student',
        bankName: defaultBank || 'HDFC Bank',
        accountType: targetType,
        accountProduct: availableProducts[0],
        partnerReferenceNumber: '',
        notes: '',
        consentGiven: false,
        consentNoticeVersion: 'v1.2-FIC-ACC-CONSENT',
        consentTimestamp: null,
      });
    }
  }, [isOpen, defaultAccountType, defaultBank]);

  if (!isOpen) return null;

  const step1CustomFields = (formConfig?.fieldsConfig || []).filter(f => !f.isSystem && (!f.step || f.step === 1));
  const step2CustomFields = (formConfig?.fieldsConfig || []).filter(f => 
    !f.isSystem && 
    f.step === 2 && 
    !['bankname', 'accounttype', 'accountproduct', 'partnerreferencenumber', 'notes'].includes((f.fieldKey || '').toLowerCase())
  );

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

      if (name === 'accountType') {
        const products = productsByAccountType[value] || productsByAccountType['Savings Account'];
        updated.accountProduct = products[0];
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
        errors.applicantName = 'Enter the applicant’s legal name as per Aadhaar/PAN (minimum 3 characters).';
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
        errors.city = 'Enter the applicant’s campus location or city.';
      }

      // Dynamic custom fields validation for Step 1
      const step1Custom = (formConfig?.fieldsConfig || []).filter(f => !f.isSystem && (!f.step || f.step === 1));
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
        errors.bankName = 'Select a participating partner bank.';
      }
      if (!formData.accountProduct) {
        errors.accountProduct = 'Select an approved account product.';
      }

      // Dynamic custom fields validation for Step 2
      const step2Custom = (formConfig?.fieldsConfig || []).filter(f => 
        !f.isSystem && 
        f.step === 2 && 
        !['bankname', 'accounttype', 'accountproduct', 'partnerreferencenumber', 'notes'].includes((f.fieldKey || '').toLowerCase())
      );
      step2Custom.forEach(f => {
        let val = customFields[f.fieldKey];
        const keyLower = (f.fieldKey || '').toLowerCase();
        if (keyLower.includes('source') || keyLower.includes('channel')) {
          val = val || 'Direct Recommendation';
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
        errors.consentGiven = 'Applicant consent is required prior to initiating bank account referral.';
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

      const payload = {
        category: 'Bank Account',
        formVersion: formConfig?.version || 1,
        partnerName: formData.bankName,
        productName: formData.accountProduct,
        notes: formData.notes ? formData.notes.trim() : '',
        customFields: customFields,
        formData: {
          applicantName: formData.applicantName.trim(),
          applicantPhone: formData.applicantPhone.trim().replace(/\D/g, ''),
          applicantEmail: formData.applicantEmail ? formData.applicantEmail.trim() : '',
          applicantType: formData.applicantType,
          city: formData.city.trim(),
          bankName: formData.bankName,
          accountType: formData.accountType,
          accountProduct: formData.accountProduct,
          referralSource: customFields.referralSource || 'Direct Recommendation',
          partnerReferenceNumber: formData.partnerReferenceNumber ? formData.partnerReferenceNumber.trim() : '',
          ...customFields
        },
        bankAccountDetails: {
          bankName: formData.bankName,
          accountProduct: formData.accountProduct,
          accountType: formData.accountType,
          referralSource: customFields.referralSource || 'Direct Recommendation',
          applicantName: formData.applicantName.trim(),
          applicantPhone: formData.applicantPhone.trim().replace(/\D/g, ''),
          applicantEmail: formData.applicantEmail ? formData.applicantEmail.trim() : '',
          applicantType: formData.applicantType,
          city: formData.city.trim(),
          branchCity: formData.city.trim(),
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
      console.error('Error submitting bank account referral:', err);
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
        <div className="cc-modal-header" style={{ background: 'linear-gradient(135deg, #6b21a8 0%, #581c87 100%)' }}>
          <div className="cc-header-left">
            <div className="cc-header-icon" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <Landmark size={24} />
            </div>
            <div>
              <h2 className="cc-header-title">Submit Bank Account Referral</h2>
              <p className="cc-header-sub">Verified Institutional Partner Bank Lead Facilitation</p>
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
              <div className="cc-success-badge" style={{ background: '#faf5ff', color: '#9333ea', borderColor: '#e9d5ff' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
                Bank Account Lead Successfully Recorded!
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.88rem' }}>
                The account referral has been stored with verified applicant consent.
              </p>

              {/* Unique Referral Reference Code Display */}
              <div className="cc-code-card" style={{ borderColor: '#e9d5ff' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    Unique Referral Reference
                  </span>
                  <span className="cc-code-text" style={{ color: '#7e22ce' }}>{successReferral.referralCode}</span>
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
                  <div><span style={{ color: '#64748b' }}>Applicant:</span> <strong>{successReferral.bankAccountDetails?.applicantName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Campus Type:</span> <strong>{successReferral.bankAccountDetails?.applicantType}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Partner Bank:</span> <strong>{successReferral.bankAccountDetails?.bankName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: '#9333ea' }}>Submitted</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Account Variant:</span> <strong>{successReferral.bankAccountDetails?.accountProduct}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span style={{ color: '#64748b' }}>Consent Notice:</span> <strong style={{ fontFamily: 'monospace' }}>{successReferral.bankAccountDetails?.consentNoticeVersion}</strong></div>
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
                  Submit Another Lead
                </button>
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
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
                    <span className="cc-step-title">Account Details</span>
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

              {formConfig?.status === 'draft' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={15} />
                  <span><strong>Draft Form Notice:</strong> This Bank Account Referral form is currently in draft mode. Submissions are restricted to administrators.</span>
                </div>
              )}

              {/* ── STEP 1: APPLICANT ── */}
              {currentStep === 1 && (
                <div>
                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Applicant Full Legal Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      name="applicantName"
                      className={`cc-input ${fieldErrors.applicantName ? 'error' : ''}`}
                      placeholder="e.g. Ananya Sundaram"
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
                        placeholder="ananya@campus.edu"
                        value={formData.applicantEmail}
                        onChange={handleChange}
                      />
                      {fieldErrors.applicantEmail && (
                        <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.applicantEmail}</div>
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
                        name="city"
                        className={`cc-input ${fieldErrors.city ? 'error' : ''}`}
                        placeholder="e.g. Chennai, Bangalore, Trichy"
                        value={formData.city}
                        onChange={handleChange}
                      />
                      {fieldErrors.city && (
                        <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.city}</div>
                      )}
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Applicant Campus Type <span className="req">*</span>
                      </label>
                      <select
                        name="applicantType"
                        className="cc-select"
                        value={formData.applicantType}
                        onChange={handleChange}
                      >
                        {applicantTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dynamic Custom Fields configured by Admin for Step 1 */}
                  {step1CustomFields.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                      <DynamicFieldRenderer
                        fields={step1CustomFields}
                        values={customFields}
                        errors={fieldErrors}
                        onChange={handleCustomFieldChange}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: ACCOUNT DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div className="cc-grid-2">
                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Participating Partner Bank <span className="req">*</span>
                      </label>
                      <select
                        name="bankName"
                        className="cc-select"
                        value={formData.bankName}
                        onChange={handleChange}
                      >
                        {participatingBanks.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div className="cc-form-group">
                      <label className="cc-form-label">
                        Account Category <span className="req">*</span>
                      </label>
                      <select
                        name="accountType"
                        className="cc-select"
                        value={formData.accountType}
                        onChange={handleChange}
                      >
                        {accountTypesList.map(at => (
                          <option key={at} value={at}>{at}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Approved Account Product <span className="req">*</span>
                    </label>
                    <select
                      name="accountProduct"
                      className="cc-select"
                      value={formData.accountProduct}
                      onChange={handleChange}
                    >
                      {(productsByAccountType[formData.accountType] || []).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Partner / Branch Lead Reference <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      name="partnerReferenceNumber"
                      className="cc-input"
                      placeholder="e.g. HDFC-CAMPUS-901"
                      value={formData.partnerReferenceNumber}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="cc-form-group">
                    <label className="cc-form-label">
                      Service Remarks / Special Instructions <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      className="cc-textarea"
                      placeholder="e.g. Hostel kit delivery requested, prefers morning KYC call."
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Dynamic Custom Fields configured by Admin for Step 2 */}
                  {step2CustomFields.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0', marginBottom: '16px' }}>
                      <DynamicFieldRenderer
                        fields={step2CustomFields}
                        values={customFields}
                        errors={fieldErrors}
                        onChange={handleCustomFieldChange}
                      />
                    </div>
                  )}

                  <div className="cc-privacy-callout">
                    <ShieldAlert size={20} className="cc-privacy-icon" style={{ color: '#7e22ce' }} />
                    <div>
                      <div className="cc-privacy-title" style={{ color: '#581c87' }}>Banking Security Mandate</div>
                      <div className="cc-privacy-desc" style={{ color: '#6b21a8' }}>
                        Never collect OTPs, passwords, debit card PINs, or cheque leaves. Official verification occurs strictly via regulated partner channels.
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
                      <span>RBI & DPDP Banking Referral Disclosure</span>
                      <span className="cc-consent-ver">{formData.consentNoticeVersion}</span>
                    </div>
                    <ul className="cc-consent-points">
                      <li><strong>Purpose of Sharing:</strong> Contact and institutional identity details are transmitted exclusively to {formData.bankName} to facilitate account onboarding and scheduling of digital/in-person KYC.</li>
                      <li><strong>Zero Financial Credentials:</strong> This platform NEVER collects, requests, or stores PINs, CVVs, net-banking passwords, or full account numbers.</li>
                      <li><strong>Institutional Milestone Terms:</strong> Incentive credit is calculated strictly upon genuine account activation according to approved campus rules.</li>
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
                      {formConfig?.generalSettings?.consentText
                        ? formConfig.generalSettings.consentText.replace('{partnerName}', formData.bankName || 'the partner bank')
                        : `I confirm that the applicant has explicitly consented to share their name, contact number, and campus association with ${formData.bankName} for official account opening assistance.`}
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
                        <span>Campus Classification</span>
                        <strong>{formData.applicantType} • {formData.city}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Review Account Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Landmark size={15} className="text-purple-600" />
                        <span>Banking Partner & Product</span>
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
                        <span>Category</span>
                        <strong>{formData.accountType}</strong>
                      </div>
                      <div className="cc-review-item" style={{ gridColumn: 'span 2' }}>
                        <span>Approved Product</span>
                        <strong>{formData.accountProduct}</strong>
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
                        <Lock size={15} className="text-emerald-600" />
                        <span>Consent & Security Record</span>
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

                  {/* Dynamic Custom Fields Review Card */}
                  {Object.keys(customFields).length > 0 && (
                    <div className="cc-review-card">
                      <div className="cc-review-header">
                        <div className="cc-review-title">
                          <Check size={15} className="text-indigo-600" />
                          <span>Additional Custom Details</span>
                        </div>
                      </div>
                      <div className="cc-review-grid">
                        {customFieldsConfig.map(fld => {
                          const val = customFields[fld.fieldName];
                          if (val === undefined || val === null || val === '') return null;
                          return (
                            <div key={fld.fieldName} className="cc-review-item">
                              <span>{fld.label}</span>
                              <strong>{Array.isArray(val) ? val.join(', ') : (typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val))}</strong>
                            </div>
                          );
                        })}
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
                  style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
                  onClick={handleNext}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#7e22ce', borderColor: '#7e22ce' }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="cc-spin" />
                      <span>Saving Lead...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Submit Account Lead</span>
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
