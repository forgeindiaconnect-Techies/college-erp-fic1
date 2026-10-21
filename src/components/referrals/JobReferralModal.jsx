import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, User, Building2, MapPin, FileCheck, CheckCircle2,
  AlertCircle, Lock, ArrowRight, ArrowLeft, Copy, Check, Loader2, X, Users
} from 'lucide-react';
import { submitReferral, getPublicReferralFormConfig } from '../../api/index';
import DynamicFieldRenderer from './DynamicFieldRenderer';
import './CreditCardReferralModal.css';

export default function JobReferralModal({
  isOpen,
  onClose,
  defaultSector = 'IT / Software',
  defaultCompany = '',
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
    // Step 1: Candidate Details
    candidateName: '',
    candidatePhone: '',
    candidateEmail: '',
    candidateCity: '',
    highestQualification: 'B.E. / B.Tech',
    experienceLevel: 'Fresher (0-1 yr)',

    // Step 2: Job Details
    sector: 'IT / Software',
    companyName: 'Tata Consultancy Services (TCS)',
    jobRole: 'Associate Software Engineer',
    jobReferenceId: 'REQ-2026-IT01',
    jobLocation: 'Chennai',
    referrerRelationship: 'Alumni',
    expectedCtc: '',
    notes: '',

    // Step 3: Consent & Notice
    candidateConsentGiven: false,
    consentNoticeVersion: 'v1.2-FIC-JOB-CONSENT',
    consentTimestamp: null,
  });

  const [fieldErrors, setFieldErrors] = useState({});

  // Verified Corporate Hiring Partners & Standard Role Catalog (Default Fallback)
  const defaultCorporatePartners = [
    'Tata Consultancy Services (TCS)',
    'Infosys Limited',
    'Wipro Technologies',
    'Cognizant (CTS)',
    'HDFC Bank Ltd',
    'ICICI Bank Ltd',
    'Deloitte Consulting',
    'Larsen & Toubro (L&T)'
  ];

  const defaultRolesBySector = {
    'IT / Software': [
      { role: 'Associate Software Engineer', reqId: 'REQ-2026-IT01' },
      { role: 'Full Stack Web Developer', reqId: 'REQ-2026-IT02' },
      { role: 'Quality Assurance & Test Engineer', reqId: 'REQ-2026-IT03' },
      { role: 'Cloud Infrastructure / DevOps Associate', reqId: 'REQ-2026-IT04' }
    ],
    'Non-IT / Core Engineering': [
      { role: 'Graduate Engineer Trainee (GET)', reqId: 'REQ-2026-CORE01' },
      { role: 'Design & CAD Engineer', reqId: 'REQ-2026-CORE02' },
      { role: 'Quality Control & Production Supervisor', reqId: 'REQ-2026-CORE03' },
      { role: 'Site Operations Executive', reqId: 'REQ-2026-CORE04' }
    ],
    'Banking / Finance': [
      { role: 'Relationship Manager - Retail Banking', reqId: 'REQ-2026-BF01' },
      { role: 'Credit Risk Analyst', reqId: 'REQ-2026-BF02' },
      { role: 'Operations & Settlement Executive', reqId: 'REQ-2026-BF03' },
      { role: 'Wealth Management Associate', reqId: 'REQ-2026-BF04' }
    ],
    'EdTech / Education': [
      { role: 'Academic Counselor / Advisor', reqId: 'REQ-2026-ED01' },
      { role: 'Instructional Content Associate', reqId: 'REQ-2026-ED02' },
      { role: 'Student Experience Coordinator', reqId: 'REQ-2026-ED03' }
    ],
    'BPO / Operations': [
      { role: 'Process Executive - Customer Success', reqId: 'REQ-2026-OPS01' },
      { role: 'Technical Support Specialist', reqId: 'REQ-2026-OPS02' },
      { role: 'Data Operations Associate', reqId: 'REQ-2026-OPS03' }
    ],
    'Healthcare / Pharma': [
      { role: 'Medical Data Documentation Specialist', reqId: 'REQ-2026-HC01' },
      { role: 'Healthcare Operations Executive', reqId: 'REQ-2026-HC02' }
    ],
    'Other': [
      { role: 'Corporate Management Trainee', reqId: 'REQ-2026-GEN01' },
      { role: 'Executive Assistant - Business Operations', reqId: 'REQ-2026-GEN02' }
    ]
  };

  const [corporatePartners, setCorporatePartners] = useState(defaultCorporatePartners);
  const [rolesBySector, setRolesBySector] = useState(defaultRolesBySector);
  const [configLoaded, setConfigLoaded] = useState(false);

  const experienceLevels = [
    'Fresher (0-1 yr)',
    'Junior (1-3 yrs)',
    'Mid-level (3-5 yrs)',
    'Senior (5+ yrs)'
  ];

  const qualificationList = [
    'B.E. / B.Tech',
    'M.E. / M.Tech',
    'MCA / M.Sc CS',
    'B.Sc / BCA',
    'MBA / PGDM',
    'B.Com / BBA',
    'Diploma / Polytechnic',
    'Other Graduate'
  ];

  const relationshipTypes = [
    'Alumni',
    'Colleague',
    'Mentee',
    'Academic Peer',
    'Personal',
    'Other'
  ];

  const locationsList = [
    'Chennai',
    'Bangalore',
    'Hyderabad',
    'Pune',
    'Mumbai',
    'Delhi NCR',
    'Coimbatore',
    'Remote / Hybrid'
  ];

  useEffect(() => {
    const fetchJobConfig = async () => {
      try {
        const res = await getPublicReferralFormConfig('Job');
        if (res?.data?.success && res.data.data) {
          setFormConfig(res.data.data);
          if (res.data.data.partners) {
            const partners = res.data.data.partners.filter((p) => p.isActive !== false);
            if (partners.length > 0) {
              setCorporatePartners(partners.map((p) => p.name));
            }

            const dynamicRoles = {};
            partners.forEach((p) => {
              (p.products || []).forEach((prod) => {
                if (prod.isActive !== false) {
                  const sector = prod.productCategory || 'IT / Software';
                  if (!dynamicRoles[sector]) dynamicRoles[sector] = [];
                  dynamicRoles[sector].push({
                    role: prod.name,
                    reqId: `REQ-${p.code || 'CORP'}-${prod.id.slice(-4)}`
                  });
                }
              });
            });

            // Fallback to default roles for empty sectors
            Object.keys(defaultRolesBySector).forEach((sector) => {
              if (!dynamicRoles[sector] || dynamicRoles[sector].length === 0) {
                dynamicRoles[sector] = defaultRolesBySector[sector];
              }
            });

            setRolesBySector(dynamicRoles);
            setConfigLoaded(true);
          }
        }
      } catch (err) {
        console.warn('Using default job catalog:', err.message);
      }
    };

    if (isOpen) {
      fetchJobConfig();
      setCurrentStep(1);
      setError(null);
      setFieldErrors({});
      setCustomFields({});
      setSuccessReferral(null);
      setCopiedCode(false);

      let sec = 'IT / Software';
      if (defaultSector) {
        const secStr = String(defaultSector).toLowerCase();
        if (secStr.includes('non-it') || secStr.includes('core')) sec = 'Non-IT / Core Engineering';
        else if (secStr.includes('banking') || secStr.includes('finance')) sec = 'Banking / Finance';
        else if (secStr.includes('edtech') || secStr.includes('education')) sec = 'EdTech / Education';
        else if (secStr.includes('bpo') || secStr.includes('operations')) sec = 'BPO / Operations';
        else if (secStr.includes('health') || secStr.includes('pharma')) sec = 'Healthcare / Pharma';
        else if (secStr.includes('it') || secStr.includes('software')) sec = 'IT / Software';
      }
      const initialRoles = rolesBySector[sec] || rolesBySector['IT / Software'];

      setFormData({
        candidateName: '',
        candidatePhone: '',
        candidateEmail: '',
        candidateCity: '',
        highestQualification: 'B.E. / B.Tech',
        experienceLevel: 'Fresher (0-1 yr)',
        sector: sec,
        companyName: defaultCompany || corporatePartners[0],
        jobRole: initialRoles[0]?.role || 'Associate Software Engineer',
        jobReferenceId: initialRoles[0]?.reqId || 'REQ-2026-IT01',
        jobLocation: 'Chennai',
        referrerRelationship: 'Alumni',
        expectedCtc: '',
        notes: '',
        candidateConsentGiven: false,
        consentNoticeVersion: 'v1.2-FIC-JOB-CONSENT',
        consentTimestamp: null,
      });
    }
  }, [isOpen, defaultSector, defaultCompany]);

  const defaultJobFields = [
    { fieldKey: 'candidateName', label: 'Candidate Full Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'e.g. Priya Sharma' },
    { fieldKey: 'candidatePhone', label: 'Candidate Mobile Number', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: '10-digit mobile number' },
    { fieldKey: 'candidateEmail', label: 'Candidate Email Address', fieldType: 'email', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'candidate@domain.com' },
    { fieldKey: 'candidateCity', label: 'Current City / Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: false, placeholder: 'e.g. Bangalore' },
    { fieldKey: 'highestQualification', label: 'Highest Qualification', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['B.E. / B.Tech', 'M.E. / M.Tech', 'MCA / M.Sc CS', 'B.Sc / BCA', 'MBA / PGDM', 'B.Com / BBA', 'Diploma / Polytechnic', 'Other Graduate'] },
    { fieldKey: 'experienceLevel', label: 'Experience Level', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['Fresher (0-1 yr)', 'Junior (1-3 yrs)', 'Mid-level (3-5 yrs)', 'Senior (5+ yrs)'] },
    { fieldKey: 'companyName', label: 'Corporate Hiring Partner', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
    { fieldKey: 'sector', label: 'Job Sector / Department', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true, options: ['IT / Software', 'Non-IT / Core Engineering', 'Banking / Finance', 'EdTech / Education', 'BPO / Operations', 'Healthcare / Pharma', 'Other'] },
    { fieldKey: 'jobRole', label: 'Target Job Role / Opportunity', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
    { fieldKey: 'jobReferenceId', label: 'Job Requisition / Ref ID', fieldType: 'text', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'e.g. REQ-2026-IT01' },
    { fieldKey: 'jobLocation', label: 'Work Location / Base', fieldType: 'dropdown', step: 2, isRequired: false, isVisible: true, isSystem: false, options: ['Chennai', 'Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Coimbatore', 'Remote / Hybrid'] },
    { fieldKey: 'referrerRelationship', label: 'Referrer Relationship', fieldType: 'dropdown', step: 2, isRequired: false, isVisible: true, isSystem: false, options: ['Alumni', 'Colleague', 'Mentee', 'Academic Peer', 'Personal', 'Other'] },
    { fieldKey: 'expectedCtc', label: 'Expected CTC', fieldType: 'text', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'e.g. 6.5 LPA' },
    { fieldKey: 'notes', label: 'Referrer Recommendation & Skills Summary', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'Key strengths, certifications, notice period, or college credentials...' }
  ];

  const allConfiguredFields = useMemo(() => {
    const rawList = (formConfig?.fieldsConfig && formConfig.fieldsConfig.length > 0)
      ? formConfig.fieldsConfig
      : defaultJobFields;
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
  }, [formConfig]);

  const step1Fields = allConfiguredFields.filter(f => f.isVisible !== false && (!f.step || f.step === 1));
  const step2Fields = allConfiguredFields.filter(f => f.isVisible !== false && f.step === 2);

  const resolveField = (key) => allConfiguredFields.find(f => f.fieldKey === key) || null;

  const mapFieldKeyToStateKey = (fieldKey) => {
    if (fieldKey === 'currentLocation') return 'candidateCity';
    if (fieldKey === 'targetCompany') return 'companyName';
    if (fieldKey === 'jobCategory') return 'sector';
    if (fieldKey === 'totalExperience') return 'experienceLevel';
    return fieldKey;
  };

  const getFieldValue = (fieldKey) => {
    const stateKey = mapFieldKeyToStateKey(fieldKey);
    if (formData[stateKey] !== undefined) return formData[stateKey];
    if (customFields[fieldKey] !== undefined) return customFields[fieldKey];
    return '';
  };

  const handleCustomFieldChange = (fieldKey, value) => {
    handleFieldChange(fieldKey, value);
  };

  const handleFieldChange = (fieldKey, value) => {
    const stateKey = mapFieldKeyToStateKey(fieldKey);
    if (Object.prototype.hasOwnProperty.call(formData, stateKey)) {
      setFormData(prev => {
        const next = { ...prev, [stateKey]: value };
        if (stateKey === 'sector') {
          const available = rolesBySector[value] || rolesBySector['IT / Software'] || [];
          if (available.length > 0) {
            next.jobRole = available[0]?.role || '';
            next.jobReferenceId = available[0]?.reqId || '';
          }
        }
        if (stateKey === 'jobRole') {
          const roles = rolesBySector[prev.sector] || [];
          const matched = roles.find(r => r.role === value);
          if (matched) next.jobReferenceId = matched.reqId;
        }
        return next;
      });
    } else {
      setCustomFields(prev => ({ ...prev, [fieldKey]: value }));
    }
    if (fieldErrors[fieldKey] || fieldErrors[stateKey]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldKey];
        delete next[stateKey];
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
    const fieldsToValidate = stepNumber === 1 ? step1Fields : (stepNumber === 2 ? step2Fields : []);

    fieldsToValidate.forEach(field => {
      const val = getFieldValue(field.fieldKey);
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
            errors[field.fieldKey] = 'Enter a valid candidate email address.';
          }
        }
      }
    });

    if (stepNumber === 3) {
      if (!formData.candidateConsentGiven) {
        errors.candidateConsentGiven = 'Candidate consent is mandatory before sharing profile details with hiring teams.';
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
      setError(null);
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

      const cleanPhone = (formData.candidatePhone || '').replace(/\D/g, '');
      const summaryText = `${formData.candidateName.trim()} - ${formData.companyName} (${formData.jobRole})`;

      const payload = {
        category: 'Job',
        formVersion: formConfig?.version || 1,
        partnerName: formData.companyName,
        productName: formData.jobRole,
        notes: formData.notes ? formData.notes.trim() : '',
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          highestQualification: formData.highestQualification || 'B.E. / B.Tech',
          experienceLevel: formData.experienceLevel,
          sector: formData.sector,
          companyName: formData.companyName,
          jobRole: formData.jobRole,
          city: formData.candidateCity.trim(),
          applicantName: formData.candidateName.trim(),
          applicantPhone: cleanPhone,
          ...customFields
        },
        formData: {
          applicantName: formData.candidateName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: formData.candidateEmail.trim(),
          city: formData.candidateCity.trim(),
          highestQualification: formData.highestQualification || 'B.E. / B.Tech',
          experienceLevel: formData.experienceLevel,
          companyName: formData.companyName,
          jobRole: formData.jobRole,
          sector: formData.sector,
          jobLocation: formData.jobLocation,
          jobReferenceId: formData.jobReferenceId.trim(),
          referrerRelationship: formData.referrerRelationship,
          expectedCtc: formData.expectedCtc ? formData.expectedCtc.trim() : '',
          summary: summaryText,
          s: summaryText,
          ...customFields
        },
        jobDetails: {
          sector: formData.sector,
          companyName: formData.companyName,
          jobRole: formData.jobRole,
          jobReferenceId: formData.jobReferenceId.trim(),
          jobLocation: formData.jobLocation,
          candidateName: formData.candidateName.trim(),
          candidatePhone: cleanPhone,
          candidateEmail: formData.candidateEmail.trim(),
          candidateCity: formData.candidateCity.trim(),
          highestQualification: formData.highestQualification || 'B.E. / B.Tech',
          experienceLevel: formData.experienceLevel,
          experienceYears: formData.experienceLevel,
          referrerRelationship: formData.referrerRelationship,
          expectedCtc: formData.expectedCtc ? formData.expectedCtc.trim() : '',
          candidateConsentGiven: true,
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
      console.error('Error submitting job referral:', err);
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
        <div className="cc-modal-header" style={{ background: 'linear-gradient(135deg, #3730a3 0%, #312e81 100%)' }}>
          <div className="cc-header-left">
            <div className="cc-header-icon" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="cc-header-title">Submit Job Referral</h2>
              <p className="cc-header-sub">Verified Institutional Corporate Hiring Referral Program</p>
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
              <div className="cc-success-badge" style={{ background: '#eef2ff', color: '#4f46e5', borderColor: '#c7d2fe' }}>
                <CheckCircle2 size={36} />
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#0f172a', fontWeight: 800 }}>
                Candidate Referral Successfully Recorded!
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '0.88rem' }}>
                The profile has been saved to the institutional recruitment referral database.
              </p>

              {/* Unique Referral Reference Code Display */}
              <div className="cc-code-card" style={{ borderColor: '#c7d2fe' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    Unique Referral Reference
                  </span>
                  <span className="cc-code-text" style={{ color: '#4338ca' }}>{successReferral.referralCode}</span>
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
                  <div><span style={{ color: '#64748b' }}>Candidate:</span> <strong>{successReferral.jobDetails?.candidateName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Company:</span> <strong>{successReferral.jobDetails?.companyName}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Role:</span> <strong>{successReferral.jobDetails?.jobRole}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Req ID:</span> <strong>{successReferral.jobDetails?.jobReferenceId}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Status:</span> <strong style={{ color: '#4f46e5' }}>Submitted</strong></div>
                  <div><span style={{ color: '#64748b' }}>Consent Notice:</span> <strong style={{ fontFamily: 'monospace' }}>{successReferral.jobDetails?.consentNoticeVersion}</strong></div>
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
                  Submit Another Candidate
                </button>
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#4338ca', borderColor: '#4338ca' }}
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
                    <span className="cc-step-title">Candidate</span>
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
                    <span className="cc-step-title">Job Details</span>
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
                  <span>Notice: This Job Referral Form is currently in Draft status. Submissions are paused.</span>
                </div>
              )}

              {/* ── STEP 1: CANDIDATE ── */}
              {currentStep === 1 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {step1Fields.map(field => {
                      let computedField = field;
                      if ((field.fieldKey === 'highestQualification' || field.fieldKey === 'qualification') && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: qualificationList };
                      } else if ((field.fieldKey === 'experienceLevel' || field.fieldKey === 'totalExperience') && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: experienceLevels };
                      }
                      return (
                        <DynamicFieldRenderer
                          key={field.fieldKey}
                          field={computedField}
                          value={getFieldValue(field.fieldKey)}
                          onChange={handleFieldChange}
                          error={fieldErrors[field.fieldKey] || fieldErrors[mapFieldKeyToStateKey(field.fieldKey)]}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 2: JOB DETAILS ── */}
              {currentStep === 2 && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {step2Fields.map(field => {
                      let computedField = field;
                      if ((field.fieldKey === 'companyName' || field.fieldKey === 'targetCompany') && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: corporatePartners };
                      } else if ((field.fieldKey === 'sector' || field.fieldKey === 'jobCategory') && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: Object.keys(rolesBySector) };
                      } else if (field.fieldKey === 'jobRole' && (!field.options || field.options.length === 0)) {
                        computedField = {
                          ...field,
                          options: (rolesBySector[formData.sector] || []).map(r => r.role)
                        };
                      } else if (field.fieldKey === 'jobLocation' && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: locationsList };
                      } else if (field.fieldKey === 'referrerRelationship' && (!field.options || field.options.length === 0)) {
                        computedField = { ...field, options: relationshipTypes };
                      }
                      return (
                        <DynamicFieldRenderer
                          key={field.fieldKey}
                          field={computedField}
                          value={getFieldValue(field.fieldKey)}
                          onChange={handleFieldChange}
                          error={fieldErrors[field.fieldKey] || fieldErrors[mapFieldKeyToStateKey(field.fieldKey)]}
                        />
                      );
                    })}
                  </div>

                  <div className="cc-privacy-callout" style={{ marginTop: '16px' }}>
                    <Briefcase size={20} className="cc-privacy-icon" />
                    <div>
                      <div className="cc-privacy-title">Mandate Integrity</div>
                      <div className="cc-privacy-desc">
                        Roles correspond to pre-approved corporate talent acquisitions. Inventing vacancies is prohibited.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: CANDIDATE CONSENT ── */}
              {currentStep === 3 && (
                <div>
                  <div className="cc-consent-box">
                    <div className="cc-consent-notice-title">
                      <span>Recruitment Referral Privacy Notice</span>
                      <span className="cc-consent-ver">{formData.consentNoticeVersion}</span>
                    </div>
                    {formConfig?.generalSettings?.consentText ? (
                      <p style={{ margin: '8px 0', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                        {formConfig.generalSettings.consentText}
                      </p>
                    ) : (
                      <ul className="cc-consent-points">
                        <li><strong>Purpose of Sharing:</strong> Candidate profile details are shared exclusively with {formData.companyName} talent acquisition teams for evaluation against {formData.jobRole} ({formData.jobReferenceId}).</li>
                        <li><strong>Zero Candidate Fees:</strong> No applicant is ever charged any recruitment, exam, or placement fees under institutional ethics guidelines.</li>
                        <li><strong>Institutional Accountability:</strong> Submissions must be verified candidates with genuine academic/professional ties to the referrer ({formData.referrerRelationship}).</li>
                      </ul>
                    )}
                  </div>

                  <label className="cc-checkbox-label">
                    <input
                      type="checkbox"
                      name="candidateConsentGiven"
                      className="cc-checkbox"
                      checked={formData.candidateConsentGiven}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          candidateConsentGiven: e.target.checked,
                          consentTimestamp: e.target.checked ? new Date().toISOString() : null
                        }));
                        if (fieldErrors.candidateConsentGiven) {
                          setFieldErrors(prev => ({ ...prev, candidateConsentGiven: null }));
                        }
                      }}
                    />
                    <span className="cc-checkbox-text">
                      I confirm that the candidate has explicitly reviewed the role opening and granted permission to share their contact information and profile with {formData.companyName} for recruitment consideration.
                    </span>
                  </label>
                  {fieldErrors.candidateConsentGiven && (
                    <div className="cc-field-error"><AlertCircle size={13} /> {fieldErrors.candidateConsentGiven}</div>
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
                  {/* Review Candidate */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <User size={15} className="text-blue-600" />
                        <span>Candidate Information</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(1)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      {step1Fields.map(field => {
                        const val = getFieldValue(field.fieldKey);
                        return (
                          <div key={field.fieldKey} className="cc-review-item">
                            <span>{field.label}</span>
                            <strong>{String(val || '—')}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Review Job Details */}
                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Briefcase size={15} className="text-indigo-600" />
                        <span>Job Opening Details</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(2)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      {step2Fields.map(field => {
                        const val = getFieldValue(field.fieldKey);
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
                        <span>Candidate Consent Record</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(3)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      <div className="cc-review-item">
                        <span>Consent Status</span>
                        <strong style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Explicit Candidate Consent Confirmed
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
                  style={{ background: '#4338ca', borderColor: '#4338ca' }}
                  onClick={handleNext}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  className="cc-btn-pri"
                  style={{ background: '#4338ca', borderColor: '#4338ca' }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="cc-spin" />
                      <span>Saving Candidate...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Submit Job Referral</span>
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
