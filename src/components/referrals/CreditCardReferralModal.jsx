import React, { useState, useEffect, useMemo } from 'react';
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

    // Step 2: Credit Card & Employment Details
    cardCategory: 'Cashback & Rewards',
    bankName: 'HDFC Bank',
    cardProduct: 'Millennia Cashback Credit Card',
    employmentType: 'Salaried',
    monthlyIncome: '₹25,000 - ₹50,000',
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
        employmentType: 'Salaried',
        monthlyIncome: '₹25,000 - ₹50,000',
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
    if (configLoaded) {
      const bankField = (formConfig?.fieldsConfig || []).find(f => (f.fieldKey || '').toLowerCase() === 'bankname');
      const configuredBankOptions = Array.isArray(bankField?.options) && bankField.options.length > 0 ? bankField.options : null;
      const validBanks = configuredBankOptions || (Object.keys(bankProductCatalog).length > 0 ? Object.keys(bankProductCatalog) : partnerBanks);

      setFormData(prev => {
        const currentBankValid = validBanks.includes(prev.bankName);
        const activeBank = currentBankValid ? prev.bankName : (validBanks[0] || 'HDFC Bank');
        const prods = bankProductCatalog[activeBank] || ['Standard Variant'];
        const currentProdValid = prods.includes(prev.cardProduct);
        return {
          ...prev,
          bankName: activeBank,
          cardProduct: currentProdValid ? prev.cardProduct : prods[0]
        };
      });
    }
  }, [configLoaded, bankProductCatalog, formConfig]);

  const defaultCreditCardFields = useMemo(() => [
    { fieldKey: 'applicantName', label: 'Applicant Full Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, placeholder: 'e.g. Ramesh Kumar', sortOrder: 1 },
    { fieldKey: 'applicantPhone', label: 'Mobile Number', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, placeholder: '10-digit mobile number', validationRule: 'phone', sortOrder: 2 },
    { fieldKey: 'applicantEmail', label: 'Email Address', fieldType: 'email', step: 1, isRequired: false, isVisible: true, placeholder: 'name@example.com', validationRule: 'email', sortOrder: 3 },
    { fieldKey: 'city', label: 'City / Campus Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, placeholder: 'e.g. Bangalore, Chennai, Hyderabad', sortOrder: 4 },
    { fieldKey: 'employmentType', label: 'Employment Status', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, options: ['Salaried', 'Self-Employed', 'Student', 'Professional', 'Other'], sortOrder: 5 },
    { fieldKey: 'monthlyIncome', label: 'Monthly Income Range', fieldType: 'dropdown', step: 1, isRequired: false, isVisible: true, options: ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'], sortOrder: 6 },
    { fieldKey: 'bankName', label: 'Verified Partner Bank', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, sortOrder: 7 },
    { fieldKey: 'cardProduct', label: 'Approved Card / Product Variant', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, sortOrder: 8 },
    { fieldKey: 'cardCategory', label: 'Card Category', fieldType: 'dropdown', step: 2, isRequired: false, isVisible: true, options: cardCategories, sortOrder: 9 },
    { fieldKey: 'referralSource', label: 'Referral Channel / Source', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, options: referralSources, sortOrder: 10 },
    { fieldKey: 'partnerReferenceNumber', label: 'Partner Reference # (Optional)', fieldType: 'text', step: 2, isRequired: false, isVisible: true, placeholder: 'e.g. Lead ID, Branch Employee Code', sortOrder: 11 },
    { fieldKey: 'notes', label: 'Referral Notes / Branch Preference (Optional)', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, placeholder: 'Add any specific context or preferred branch for the applicant...', sortOrder: 12 }
  ], []);

  const allConfiguredFields = useMemo(() => {
    const rawList = (formConfig?.fieldsConfig && formConfig.fieldsConfig.length > 0)
      ? formConfig.fieldsConfig
      : defaultCreditCardFields;
    const seenKeys = new Set();
    const seenLabels = new Set();
    const uniqueList = [];
    for (const f of rawList) {
      const normKey = (f.fieldKey || '').trim().toLowerCase();
      const normLabel = (f.label || '').trim().toLowerCase();
      if (!normKey || seenKeys.has(normKey) || (normLabel && seenLabels.has(normLabel))) continue;
      seenKeys.add(normKey);
      if (normLabel) seenLabels.add(normLabel);
      uniqueList.push(f);
    }
    return uniqueList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [formConfig, defaultCreditCardFields]);

  const step1Fields = useMemo(() => {
    return allConfiguredFields.filter(f => (!f.step || f.step === 1) && f.isVisible !== false);
  }, [allConfiguredFields]);

  const step2Fields = useMemo(() => {
    return allConfiguredFields.filter(f => f.step === 2 && f.isVisible !== false);
  }, [allConfiguredFields]);

  const resolveField = (f) => {
    const key = (f.fieldKey || '').toLowerCase();
    let options = Array.isArray(f.options) && f.options.length > 0 ? f.options : null;

    if (key.includes('bank') || key === 'bankname') {
      if (!options || options.length === 0) {
        options = Object.keys(bankProductCatalog).length > 0 ? Object.keys(bankProductCatalog) : partnerBanks;
      }
    } else if (key.includes('cardproduct') || key.includes('product')) {
      const currentBank = formData.bankName || defaultBank || 'HDFC Bank';
      const availableProds = bankProductCatalog[currentBank] || Object.values(bankProductCatalog)[0] || ['Millennia Cashback Credit Card'];
      if (!options || options.length === 0) {
        options = availableProds;
      }
    } else if (key.includes('cardcategory') || key === 'cardcategory') {
      if (!options || options.length === 0) {
        options = formConfig?.categoriesList?.length > 0 ? formConfig.categoriesList : cardCategories;
      }
    } else if (key.includes('employment')) {
      if (!options || options.length === 0) {
        options = ['Salaried', 'Self-Employed', 'Student', 'Professional', 'Other'];
      }
    } else if (key.includes('income')) {
      if (!options || options.length === 0) {
        options = ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'];
      }
    } else if (key.includes('source') || key.includes('channel')) {
      if (!options || options.length === 0) {
        options = referralSources;
      }
    } else if (key.includes('city') || key === 'location') {
      if (!options || options.length === 0) {
        if (f.placeholder && f.placeholder.includes(',')) {
          options = f.placeholder.replace(/^e\.g\.?\s*/i, '').split(',').map(s => s.trim()).filter(Boolean);
        } else {
          options = ['Bangalore', 'Chennai', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Pune', 'Coimbatore', 'Kolkata', 'Other'];
        }
      }
    }

    if (f.fieldType === 'dropdown' && (!options || options.length === 0) && f.placeholder && f.placeholder.includes(',')) {
      options = f.placeholder.replace(/^e\.g\.?\s*/i, '').split(',').map(s => s.trim()).filter(Boolean);
    }

    return {
      ...f,
      options: options || []
    };
  };

  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => {
      const next = { ...prev, [fieldKey]: value };

      if (fieldKey === 'applicantName') next.name = value;
      if (fieldKey === 'applicantPhone') next.phone = value;
      if (fieldKey === 'applicantEmail') next.email = value;
      if (fieldKey === 'city') next.applicantCity = value;

      if (fieldKey === 'bankName') {
        const prods = bankProductCatalog[value] || ['Standard Variant'];
        if (prods.length > 0) {
          next.cardProduct = prods[0];
        }
      }
      return next;
    });

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
    handleFieldChange(name, value);
  };

  const handleCustomFieldChange = (fieldKey, value) => {
    handleFieldChange(fieldKey, value);
  };

  const validateStep = (stepNumber) => {
    const targetFields = stepNumber === 1 ? step1Fields : step2Fields;
    const errors = {};

    targetFields.forEach(f => {
      if (f.isVisible === false) return;
      const key = f.fieldKey;
      let val = formData[key];

      if (val === undefined || val === null || val === '') {
        if (key === 'applicantName') val = formData.name;
        else if (key === 'applicantPhone') val = formData.phone;
        else if (key === 'applicantEmail') val = formData.email;
        else if (key === 'city') val = formData.applicantCity;
      }

      const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);

      if (f.isRequired && isEmpty) {
        errors[key] = f.errorMessage || `${f.label} is required.`;
        return;
      }

      if (!isEmpty && typeof val === 'string' && val.trim()) {
        const trimmed = val.trim();
        const rule = f.validationRule || f.fieldType;
        if (rule === 'phone' || key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile')) {
          const cleaned = trimmed.replace(/\D/g, '');
          if (!/^[6-9]\d{9}$/.test(cleaned)) {
            errors[key] = f.errorMessage || 'Enter a valid 10-digit Indian mobile number.';
          }
        } else if (rule === 'email' || key.toLowerCase().includes('email')) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            errors[key] = f.errorMessage || 'Enter a valid email address.';
          }
        } else if (rule === 'pan') {
          if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(trimmed)) {
            errors[key] = f.errorMessage || 'Enter a valid PAN format (ABCDE1234F).';
          }
        } else if (rule === 'aadhaar') {
          if (!/^\d{12}$/.test(trimmed.replace(/\D/g, ''))) {
            errors[key] = f.errorMessage || 'Enter a valid 12-digit Aadhaar number.';
          }
        } else if (rule === 'pincode') {
          if (!/^\d{6}$/.test(trimmed.replace(/\D/g, ''))) {
            errors[key] = f.errorMessage || 'Enter a valid 6-digit PIN.';
          }
        }
      }
    });

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
          s: summaryText,
          employmentType: formData.employmentType,
          monthlyIncome: formData.monthlyIncome,
          referralSource: formData.referralSource,
          city: formData.city.trim(),
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
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
          employmentType: formData.employmentType,
          monthlyIncome: formData.monthlyIncome,
          referralSource: formData.referralSource,
          partnerReferenceNumber: formData.partnerReferenceNumber ? formData.partnerReferenceNumber.trim() : '',
          summary: summaryText,
          s: summaryText,
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
          employmentType: formData.employmentType,
          monthlyIncome: formData.monthlyIncome,
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

  if (!isOpen) return null;

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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {step1Fields.map(field => {
                      const resolvedField = resolveField(field);
                      return (
                        <DynamicFieldRenderer
                          key={field.fieldKey}
                          field={resolvedField}
                          value={formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : (customFields[field.fieldKey] || '')}
                          onChange={handleFieldChange}
                          error={fieldErrors[field.fieldKey]}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 2: CREDIT CARD DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {step2Fields.map(field => {
                      const resolvedField = resolveField(field);
                      return (
                        <DynamicFieldRenderer
                          key={field.fieldKey}
                          field={resolvedField}
                          value={formData[field.fieldKey] !== undefined ? formData[field.fieldKey] : (customFields[field.fieldKey] || '')}
                          onChange={handleFieldChange}
                          error={fieldErrors[field.fieldKey]}
                        />
                      );
                    })}
                  </div>

                  <div className="cc-privacy-callout" style={{ marginTop: '16px' }}>
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
