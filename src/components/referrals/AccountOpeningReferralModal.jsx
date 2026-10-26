import React, { useState, useEffect, useMemo } from 'react';
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
    referralSource: 'Direct Recommendation',
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
        referralSource: 'Direct Recommendation',
        partnerReferenceNumber: '',
        notes: '',
        consentGiven: false,
        consentNoticeVersion: 'v1.2-FIC-ACC-CONSENT',
        consentTimestamp: null,
      });
    }
  }, [isOpen, defaultAccountType, defaultBank]);

  const defaultAccountOpeningFields = [
    { fieldKey: 'applicantName', label: 'Applicant Legal Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'Name exactly as printed on PAN' },
    { fieldKey: 'applicantPhone', label: 'Mobile Number (Linked with Aadhaar)', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: '10-digit mobile number' },
    { fieldKey: 'applicantEmail', label: 'Email Address', fieldType: 'email', step: 1, isRequired: false, isVisible: true, isSystem: false, placeholder: 'name@example.com' },
    { fieldKey: 'city', label: 'City / Campus Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: false, placeholder: 'e.g. Pune, Delhi' },
    { fieldKey: 'applicantType', label: 'Applicant Category', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['Student', 'Faculty / Staff', 'Research Scholar', 'Alumni', 'Campus Vendor', 'Other'] },
    { fieldKey: 'bankName', label: 'Partner Bank', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
    { fieldKey: 'accountType', label: 'Account Type', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true, options: ['Student Zero-Balance', 'Savings Account', 'Salary Account', 'Current Account'] },
    { fieldKey: 'accountProduct', label: 'Specific Account Offering', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
    { fieldKey: 'referralSource', label: 'Referral Channel', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: false, options: ['Direct Recommendation', 'Campus Orientation', 'Alumni Network', 'Staff Advisory', 'Other'] },
    { fieldKey: 'partnerReferenceNumber', label: 'Partner Reference #', fieldType: 'text', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'e.g. HDFC-CAMPUS-901' },
    { fieldKey: 'notes', label: 'Advisory Notes / Instructions', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'e.g. Hostel kit delivery requested, prefers morning KYC call.' }
  ];

  const allConfiguredFields = useMemo(() => {
    const rawList = (formConfig?.fieldsConfig && formConfig.fieldsConfig.length > 0)
      ? formConfig.fieldsConfig
      : defaultAccountOpeningFields;
    const seenKeys = new Set();
    const uniqueList = [];
    for (const f of rawList) {
      const normKey = (f.fieldKey || f.name || '').trim().toLowerCase();
      if (!normKey || seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);
      uniqueList.push(f);
    }
    return uniqueList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [formConfig]);

  const step1Fields = allConfiguredFields.filter(f => f.isVisible !== false && (!f.step || f.step === 1));
  const step2Fields = allConfiguredFields.filter(f => f.isVisible !== false && f.step === 2);
  const step3Fields = allConfiguredFields.filter(f => f.isVisible !== false && f.step === 3);

  const resolveField = (key) => allConfiguredFields.find(f => f.fieldKey === key) || null;

  const handleCustomFieldChange = (fieldKey, value) => {
    handleFieldChange(fieldKey, value);
  };

  const handleFieldChange = (fieldKey, value) => {
    if (Object.prototype.hasOwnProperty.call(formData, fieldKey)) {
      setFormData(prev => {
        const next = { ...prev, [fieldKey]: value };
        if (fieldKey === 'accountType') {
          const prods = productsByAccountType[value] || productsByAccountType['Savings Account'] || [];
          if (prods.length > 0) next.accountProduct = prods[0];
        }
        return next;
      });
    } else {
      setCustomFields(prev => ({ ...prev, [fieldKey]: value }));
    }
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
    handleFieldChange(name, value);
  };

  const validateStep = (stepNumber) => {
    const errors = {};
    const fieldsToValidate = stepNumber === 1
      ? step1Fields
      : (stepNumber === 2 ? step2Fields : (stepNumber === 3 ? step3Fields : []));

    fieldsToValidate.forEach(field => {
      const val = formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : customFields[field.fieldKey];
      const strVal = val !== undefined && val !== null ? String(val).trim() : '';

      if (field.isRequired) {
        if (!val || strVal === '' || (Array.isArray(val) && val.length === 0)) {
          errors[field.fieldKey] = field.errorMessage || `${field.label} is required.`;
          return;
        }
      }

      if (strVal !== '') {
        if (field.fieldType === 'phone' || field.fieldKey.toLowerCase().includes('phone') || field.fieldKey.toLowerCase().includes('mobile')) {
          const clean = strVal.replace(/\D/g, '');
          if (!/^[6-9]\d{9}$/.test(clean)) {
            errors[field.fieldKey] = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
          }
        } else if (field.fieldType === 'email' || field.fieldKey.toLowerCase().includes('email')) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
            errors[field.fieldKey] = 'Enter a valid email address.';
          }
        }
      }
    });

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

      const cleanPhone = (formData.applicantPhone || '').replace(/\D/g, '');
      const summaryText = `${formData.applicantName.trim()} - ${formData.bankName} (${formData.accountProduct})`;

      const payload = {
        category: 'Bank Account',
        formVersion: formConfig?.version || 1,
        partnerName: formData.bankName,
        productName: formData.accountProduct,
        notes: formData.notes ? formData.notes.trim() : '',
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          applicantType: formData.applicantType,
          referralSource: formData.referralSource || 'Direct Recommendation',
          city: formData.city.trim(),
          branchCity: formData.city.trim(),
          accountType: formData.accountType,
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
          ...customFields
        },
        formData: {
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: formData.applicantEmail ? formData.applicantEmail.trim() : '',
          applicantType: formData.applicantType,
          city: formData.city.trim(),
          branchCity: formData.city.trim(),
          bankName: formData.bankName,
          accountType: formData.accountType,
          accountProduct: formData.accountProduct,
          referralSource: formData.referralSource || 'Direct Recommendation',
          partnerReferenceNumber: formData.partnerReferenceNumber ? formData.partnerReferenceNumber.trim() : '',
          summary: summaryText,
          s: summaryText,
          ...customFields
        },
        bankAccountDetails: {
          bankName: formData.bankName,
          accountProduct: formData.accountProduct,
          accountType: formData.accountType,
          referralSource: formData.referralSource || 'Direct Recommendation',
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
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

  if (!isOpen) return null;

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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {step1Fields.map(field => {
                      let computedField = field;
                      if (field.fieldKey === 'applicantType' && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: applicantTypes };
                      }
                      return (
                        <DynamicFieldRenderer
                          key={field.fieldKey}
                          field={computedField}
                          value={formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : (customFields[field.fieldKey] || '')}
                          onChange={handleFieldChange}
                          error={fieldErrors[field.fieldKey]}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 2: ACCOUNT DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {step2Fields.map(field => {
                      let computedField = field;
                      if (field.fieldKey === 'bankName' && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: participatingBanks };
                      } else if (field.fieldKey === 'accountType' && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: accountTypesList };
                      } else if (field.fieldKey === 'accountProduct' && (!field.options || field.options.length === 0)) {
                        computedField = {
                          ...field,
                          options: productsByAccountType[formData.accountType] || ['Standard Savings Account']
                        };
                      }
                      return (
                        <DynamicFieldRenderer
                          key={field.fieldKey}
                          field={computedField}
                          value={formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : (customFields[field.fieldKey] || '')}
                          onChange={handleFieldChange}
                          error={fieldErrors[field.fieldKey]}
                        />
                      );
                    })}
                  </div>

                  <div className="cc-privacy-callout" style={{ marginTop: '16px' }}>
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
                  {step3Fields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      {step3Fields.map(field => {
                        const computedField = {
                          ...field,
                          required: field.required !== undefined ? field.required : false
                        };
                        return (
                          <DynamicFieldRenderer
                            key={field.fieldKey}
                            field={computedField}
                            value={formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : (customFields[field.fieldKey] || '')}
                            onChange={handleFieldChange}
                            error={fieldErrors[field.fieldKey]}
                          />
                        );
                      })}
                    </div>
                  )}

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
                      {step1Fields.map(field => {
                        const val = formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : customFields[field.fieldKey];
                        return (
                          <div key={field.fieldKey} className="cc-review-item">
                            <span>{field.label}</span>
                            <strong>{String(val || '—')}</strong>
                          </div>
                        );
                      })}
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
                      {step2Fields.map(field => {
                        const val = formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : customFields[field.fieldKey];
                        return (
                          <div key={field.fieldKey} className="cc-review-item">
                            <span>{field.label}</span>
                            <strong>{String(val || '—')}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Additional / Step 3 Details */}
                  {step3Fields.length > 0 && (
                    <div className="cc-review-card">
                      <div className="cc-review-header">
                        <div className="cc-review-title">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>Additional Information</span>
                        </div>
                        <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(3)}>
                          Edit
                        </button>
                      </div>
                      <div className="cc-review-grid">
                        {step3Fields.map(field => {
                          const val = formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : customFields[field.fieldKey];
                          return (
                            <div key={field.fieldKey} className="cc-review-item">
                              <span>{field.label}</span>
                              <strong>{String(val || '—')}</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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
                        {(formConfig?.fieldsConfig || []).filter(f => !f.isSystem).map(fld => {
                          const val = customFields[fld.fieldKey || fld.fieldName];
                          if (val === undefined || val === null || val === '') return null;
                          return (
                            <div key={fld.fieldKey || fld.fieldName} className="cc-review-item">
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
