import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Heart, Car, UserCheck, Building2, User, FileCheck, CheckCircle2,
  AlertCircle, Lock, ArrowRight, ArrowLeft, Copy, Check, Loader2, X
} from 'lucide-react';
import { submitReferral, getPublicReferralFormConfig } from '../../api/index';
import DynamicFieldRenderer from './DynamicFieldRenderer';
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
  const [formConfig, setFormConfig] = useState(null);
  const [customFields, setCustomFields] = useState({});

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
    referralSource: 'Direct Staff Reference',
    partnerReferenceNumber: '',
    notes: '',

    // Step 3: Consent & Privacy
    consentGiven: false,
    consentNoticeVersion: 'v1.2-FIC-INS-CONSENT',
    consentTimestamp: null,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // Approved Underwriters / Insurers (Default Fallback)
  const defaultApprovedInsurers = [
    'Star Health & Allied Insurance',
    'HDFC ERGO General Insurance',
    'ICICI Lombard General Insurance',
    'Tata AIG General Insurance',
    'Care Health Insurance'
  ];

  // Approved Offerings by Category (Default Fallback)
  const defaultOfferingsByCategory = {
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

  const [approvedInsurers, setApprovedInsurers] = useState(defaultApprovedInsurers);
  const [offeringsByCategory, setOfferingsByCategory] = useState(defaultOfferingsByCategory);
  const [configLoaded, setConfigLoaded] = useState(false);

  const sumInsuredTiers = [
    '₹3,00,000 (3 Lakhs)',
    '₹5,00,000 (5 Lakhs)',
    '₹10,00,000 (10 Lakhs)',
    '₹25,00,000 (25 Lakhs)',
    '₹50,00,000 (50 Lakhs)',
    '₹1,00,00,000 (1 Crore)'
  ];

  useEffect(() => {
    const fetchInsuranceConfig = async () => {
      try {
        const res = await getPublicReferralFormConfig('Insurance');
        if (res?.data?.success && res.data.data) {
          setFormConfig(res.data.data);
          if (res.data.data.partners) {
            const partners = res.data.data.partners.filter((p) => p.isActive !== false);
            if (partners.length > 0) {
              setApprovedInsurers(partners.map((p) => p.name));
            }

            const dynamicOfferings = { Health: [], Motor: [], Life: [], Property: [] };
            partners.forEach((p) => {
              (p.products || []).forEach((prod) => {
                if (prod.isActive !== false) {
                  const cat = prod.productCategory || 'Health';
                  if (dynamicOfferings[cat]) {
                    dynamicOfferings[cat].push(prod.name);
                  } else {
                    dynamicOfferings[cat] = [prod.name];
                  }
                }
              });
            });

            // Ensure non-empty fallback for categories
            Object.keys(defaultOfferingsByCategory).forEach((cat) => {
              if (!dynamicOfferings[cat] || dynamicOfferings[cat].length === 0) {
                dynamicOfferings[cat] = defaultOfferingsByCategory[cat];
              }
            });

            setOfferingsByCategory(dynamicOfferings);
            setConfigLoaded(true);
          }
        }
      } catch (err) {
        console.warn('Using default insurance catalog:', err.message);
      }
    };

    if (isOpen) {
      fetchInsuranceConfig();
      setCurrentStep(1);
      setError(null);
      setFieldErrors({});
      setCustomFields({});
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
        referralSource: 'Direct Staff Reference',
        partnerReferenceNumber: '',
        notes: '',
        consentGiven: false,
        consentNoticeVersion: 'v1.2-FIC-INS-CONSENT',
        consentTimestamp: null,
      });
    }
  }, [isOpen, defaultCategory, defaultProvider]);

  const defaultInsuranceFields = useMemo(() => [
    { fieldKey: 'applicantName', label: 'Applicant / Policyholder Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, placeholder: 'Full Name as per PAN', sortOrder: 1 },
    { fieldKey: 'applicantPhone', label: 'Mobile Number', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, placeholder: '10-digit mobile number', validationRule: 'phone', sortOrder: 2 },
    { fieldKey: 'applicantEmail', label: 'Email Address', fieldType: 'email', step: 1, isRequired: false, isVisible: true, placeholder: 'name@example.com', validationRule: 'email', sortOrder: 3 },
    { fieldKey: 'city', label: 'City / Residential Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, placeholder: 'e.g. Mumbai, Pune', sortOrder: 4 },
    { fieldKey: 'insuranceCategory', label: 'Insurance Product Category', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, options: ['Health', 'Motor', 'Life', 'Property'], sortOrder: 5 },
    { fieldKey: 'insurerName', label: 'Preferred Underwriter / Insurer', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, sortOrder: 6 },
    { fieldKey: 'productName', label: 'Insurance Policy Plan', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, sortOrder: 7 },
    { fieldKey: 'sumInsured', label: 'Requested Sum Insured Tier', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, options: sumInsuredTiers, sortOrder: 8 },
    { fieldKey: 'referralSource', label: 'Referral Channel', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, options: ['Direct Staff Reference', 'Campus Drive', 'Alumni Network', 'Student Inquiry', 'Other'], sortOrder: 9 },
    { fieldKey: 'partnerReferenceNumber', label: 'Partner Reference # (Optional)', fieldType: 'text', step: 2, isRequired: false, isVisible: true, placeholder: 'e.g. INS-REF-901', sortOrder: 10 },
    { fieldKey: 'notes', label: 'Advisory Notes / Coverage Details', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, placeholder: 'Add family details, vehicle number, or special coverage notes...', sortOrder: 11 }
  ], []);

  const allConfiguredFields = useMemo(() => {
    const rawList = (formConfig?.fieldsConfig && formConfig.fieldsConfig.length > 0)
      ? formConfig.fieldsConfig
      : defaultInsuranceFields;
    const seenKeys = new Set();
    const uniqueList = [];
    for (const f of rawList) {
      const normKey = (f.fieldKey || f.name || '').trim().toLowerCase();
      if (!normKey || seenKeys.has(normKey)) continue;
      seenKeys.add(normKey);
      uniqueList.push(f);
    }
    return uniqueList.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [formConfig, defaultInsuranceFields]);

  const step1Fields = useMemo(() => {
    return allConfiguredFields.filter(f => (!f.step || f.step === 1) && f.isVisible !== false);
  }, [allConfiguredFields]);

  const step2Fields = useMemo(() => {
    return allConfiguredFields.filter(f => f.step === 2 && f.isVisible !== false);
  }, [allConfiguredFields]);

  const step3Fields = useMemo(() => {
    return allConfiguredFields.filter(f => f.step === 3 && f.isVisible !== false);
  }, [allConfiguredFields]);

  const resolveField = (f) => {
    const key = (f.fieldKey || '').toLowerCase();
    let options = Array.isArray(f.options) && f.options.length > 0 ? f.options : null;

    if (key.includes('category') || key === 'insurancecategory') {
      if (!options || options.length === 0) {
        options = formConfig?.categoriesList?.length > 0 ? formConfig.categoriesList : ['Health', 'Motor', 'Life', 'Property'];
      }
    } else if (key.includes('insurer') || key === 'provider') {
      if (!options || options.length === 0) {
        options = approvedInsurers;
      }
    } else if (key.includes('product') || key === 'offering') {
      const currentCat = formData.insuranceCategory || 'Health';
      const availableOfferings = offeringsByCategory[currentCat] || offeringsByCategory.Health || [];
      if (!options || options.length === 0) {
        options = availableOfferings;
      }
    } else if (key.includes('sum') || key.includes('tier')) {
      if (!options || options.length === 0) {
        options = sumInsuredTiers;
      }
    } else if (key.includes('source') || key.includes('channel')) {
      if (!options || options.length === 0) {
        options = ['Direct Staff Reference', 'Campus Drive', 'Alumni Network', 'Student Inquiry', 'Other'];
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
      if (fieldKey === 'insurerName') next.provider = value;
      if (fieldKey === 'provider') next.insurerName = value;
      if (fieldKey === 'productName') next.selectedOffering = value;
      if (fieldKey === 'selectedOffering') next.productName = value;
      if (fieldKey === 'sumInsured') next.sumInsuredTier = value;
      if (fieldKey === 'sumInsuredTier') next.sumInsured = value;

      if (fieldKey === 'insuranceCategory') {
        const prods = offeringsByCategory[value] || offeringsByCategory.Health || [];
        if (prods.length > 0) {
          next.productName = prods[0];
          next.selectedOffering = prods[0];
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
    const targetFields = stepNumber === 1
      ? step1Fields
      : (stepNumber === 2 ? step2Fields : (stepNumber === 3 ? step3Fields : []));
    const errors = {};

    targetFields.forEach(f => {
      if (f.isVisible === false) return;
      const key = f.fieldKey;
      let val = formData[key] !== undefined && formData[key] !== null ? formData[key] : customFields[key];

      if (val === undefined || val === null || val === '') {
        if (key === 'applicantName') val = formData.name;
        else if (key === 'applicantPhone') val = formData.phone;
        else if (key === 'applicantEmail') val = formData.email;
        else if (key === 'city') val = formData.applicantCity;
        else if (key === 'insurerName') val = formData.provider;
        else if (key === 'provider') val = formData.insurerName;
        else if (key === 'productName') val = formData.selectedOffering;
        else if (key === 'selectedOffering') val = formData.productName;
        else if (key === 'sumInsured') val = formData.sumInsuredTier;
        else if (key === 'sumInsuredTier') val = formData.sumInsured;
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
        errors.consentGiven = 'Explicit consent is mandatory under IRDAI and DPDP guidelines.';
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

      const numericTier = parseInt((formData.sumInsuredTier || '').replace(/\D/g, ''), 10) || 500000;
      const cleanPhone = (formData.applicantPhone || '').replace(/\D/g, '');
      const summaryText = `${formData.applicantName.trim()} - ${formData.provider} (${formData.selectedOffering})`;

      const payload = {
        category: 'Insurance',
        formVersion: formConfig?.version || 1,
        partnerName: formData.provider,
        productName: formData.selectedOffering,
        notes: formData.notes ? formData.notes.trim() : '',
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          sumInsured: formData.sumInsuredTier,
          sumInsuredTier: formData.sumInsuredTier,
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
          provider: formData.provider,
          insuranceCategory: formData.insuranceCategory,
          selectedOffering: formData.selectedOffering,
          sumInsuredTier: formData.sumInsuredTier,
          sumInsured: formData.sumInsuredTier,
          referralSource: formData.referralSource,
          partnerReferenceNumber: formData.partnerReferenceNumber ? formData.partnerReferenceNumber.trim() : '',
          summary: summaryText,
          s: summaryText,
          ...customFields
        },
        insuranceDetails: {
          provider: formData.provider,
          insuranceCategory: formData.insuranceCategory,
          productType: formData.insuranceCategory === 'Motor' ? 'Motor / Vehicle' : formData.insuranceCategory === 'Life' ? 'Term Life' : formData.insuranceCategory,
          selectedOffering: formData.selectedOffering,
          sumInsuredTier: formData.sumInsuredTier,
          sumInsured: formData.sumInsuredTier,
          referralSource: formData.referralSource,
          estimatedSumInsured: numericTier,
          applicantName: formData.applicantName.trim(),
          applicantPhone: cleanPhone,
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

  if (!isOpen) return null;

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

              {/* Draft Status Banner */}
              {formConfig && formConfig.status === 'draft' && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '12px 16px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>Notice: This Insurance Referral Form is currently in Draft status. Submissions are paused.</span>
                </div>
              )}

              {/* ── STEP 1: APPLICANT INFORMATION ── */}
              {currentStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {step1Fields.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      No fields configured for Step 1.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {step1Fields.map(f => {
                        const resolvedField = resolveField(f);
                        const fieldVal = formData[f.fieldKey] !== undefined ? formData[f.fieldKey] : (f.defaultValue ?? '');
                        return (
                          <DynamicFieldRenderer
                            key={f.fieldKey}
                            field={resolvedField}
                            value={fieldVal}
                            onChange={handleFieldChange}
                            error={fieldErrors[f.fieldKey]}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: INSURANCE DETAILS ── */}
              {currentStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {step2Fields.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      No fields configured for Step 2.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {step2Fields.map(f => {
                        const resolvedField = resolveField(f);
                        const fieldVal = formData[f.fieldKey] !== undefined ? formData[f.fieldKey] : (f.defaultValue ?? '');
                        return (
                          <DynamicFieldRenderer
                            key={f.fieldKey}
                            field={resolvedField}
                            value={fieldVal}
                            onChange={handleFieldChange}
                            error={fieldErrors[f.fieldKey]}
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="cc-privacy-callout" style={{ marginTop: '8px' }}>
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

              {/* ── STEP 3: CONSENT & PRIVACY & ADDITIONAL FIELDS ── */}
              {currentStep === 3 && (
                <div>
                  {step3Fields.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                      {step3Fields.map(field => {
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
                  )}

                  <div className="cc-consent-box">
                    <div className="cc-consent-notice-title">
                      <span>Statutory Insurance Privacy Notice</span>
                      <span className="cc-consent-ver">{formData.consentNoticeVersion}</span>
                    </div>
                    {formConfig?.generalSettings?.consentText ? (
                      <p style={{ margin: '8px 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                        {formConfig.generalSettings.consentText}
                      </p>
                    ) : (
                      <ul className="cc-consent-points">
                        <li><strong>Purpose of Processing:</strong> Contact information is collected strictly to enable authorized underwriters ({formData.provider}) to provide insurance advisory and quotation for {formData.selectedOffering}.</li>
                        <li><strong>Zero Sensitive Health Data:</strong> No medical records, diagnostic tests, or payment passwords are collected or stored in this ERP system.</li>
                        <li><strong>Referrer Verification:</strong> Institutional incentive eligibility is calculated strictly upon genuine policy verification and approved milestones.</li>
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
                        <span>Step 1: Applicant Information</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(1)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      {step1Fields.map(f => {
                        const val = formData[f.fieldKey] !== undefined ? formData[f.fieldKey] : customFields[f.fieldKey];
                        if (val === undefined || val === null || val === '') return null;
                        return (
                          <div key={f.fieldKey} className="cc-review-item">
                            <span>{f.label}</span>
                            <strong>
                              {Array.isArray(val) ? val.join(', ') : (typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val))}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Insurance Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Shield size={15} className="text-emerald-600" />
                        <span>Step 2: Insurance Details</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(2)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      {step2Fields.map(f => {
                        const val = formData[f.fieldKey] !== undefined ? formData[f.fieldKey] : customFields[f.fieldKey];
                        if (val === undefined || val === null || val === '') return null;
                        return (
                          <div key={f.fieldKey} className="cc-review-item">
                            <span>{f.label}</span>
                            <strong>
                              {Array.isArray(val) ? val.join(', ') : (typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val))}
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Additional Details */}
                  {step3Fields.length > 0 && (
                    <div className="cc-review-card">
                      <div className="cc-review-header">
                        <div className="cc-review-title">
                          <CheckCircle2 size={15} className="text-blue-600" />
                          <span>Step 3: Additional Information</span>
                        </div>
                        <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(3)}>
                          Edit
                        </button>
                      </div>
                      <div className="cc-review-grid">
                        {step3Fields.map(f => {
                          const val = formData[f.fieldKey] !== undefined ? formData[f.fieldKey] : customFields[f.fieldKey];
                          if (val === undefined || val === null || val === '') return null;
                          return (
                            <div key={f.fieldKey} className="cc-review-item">
                              <span>{f.label}</span>
                              <strong>
                                {Array.isArray(val) ? val.join(', ') : (typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val))}
                              </strong>
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
