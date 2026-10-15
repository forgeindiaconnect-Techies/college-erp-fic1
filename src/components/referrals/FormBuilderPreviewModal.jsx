import React, { useState } from 'react';
import {
  X, Check, ArrowRight, ArrowLeft, Eye, Shield, Lock,
  Building2, User, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import DynamicFieldRenderer from './DynamicFieldRenderer';
import './CreditCardReferralModal.css';

export default function FormBuilderPreviewModal({
  isOpen,
  onClose,
  category,
  config
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  if (!isOpen || !config) return null;

  const fields = config.fieldsConfig || [];
  const step1Fields = fields.filter(f => (f.step === 1 || !f.step) && f.isVisible !== false);
  const step2Fields = fields.filter(f => f.step === 2 && f.isVisible !== false);
  const partners = (config.partners || []).filter(p => p.isActive !== false);

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateStep = (stepNumber) => {
    const targetFields = stepNumber === 1 ? step1Fields : step2Fields;
    const errors = {};
    targetFields.forEach(f => {
      if (f.isRequired) {
        const val = formData[f.fieldKey];
        if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
          errors[f.fieldKey] = f.errorMessage || `${f.label} is required.`;
        }
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep(1)) return;
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!validateStep(2)) return;
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!consentChecked) {
        setFieldErrors({ consent: 'Explicit consent acknowledgement is required to proceed.' });
        return;
      }
      setFieldErrors({});
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTestSubmit = () => {
    setTestSubmitted(true);
  };

  const handleResetPreview = () => {
    setCurrentStep(1);
    setFormData({});
    setConsentChecked(false);
    setFieldErrors({});
    setTestSubmitted(false);
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'Insurance': return 'Submit Insurance Referral';
      case 'Job': return 'Submit Job Referral';
      case 'Bank Account': return 'Submit Bank Account Referral';
      case 'Credit Card':
      default: return 'Submit Credit Card Referral';
    }
  };

  const getCategorySubtitle = () => {
    switch (category) {
      case 'Insurance': return 'IRDAI Licensed Underwriter Network';
      case 'Job': return 'Corporate Recruitment & Hiring Mandates';
      case 'Bank Account': return 'Scheduled Commercial Banking Network';
      case 'Credit Card':
      default: return 'Verified Institutional Banking Partner Program';
    }
  };

  return (
    <div className="cc-modal-overlay animate-fade-in" style={{ zIndex: 10000 }}>
      <div className="cc-modal-box" style={{ maxWidth: '780px', width: '95%' }}>
        {/* Preview Top Banner */}
        <div style={{
          background: 'linear-gradient(90deg, #1e293b, #0f172a)',
          color: '#38bdf8',
          padding: '8px 20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={14} />
            <span>SUPER ADMIN FORM BUILDER — LIVE PREVIEW MODE</span>
            <span style={{
              background: config.status === 'published' ? '#059669' : '#d97706',
              color: '#ffffff',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.68rem'
            }}>
              {config.status === 'published' ? `Published (v${config.version || 1})` : 'Draft Mode'}
            </span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
            Interactive 4-Step User Submission Simulation
          </span>
        </div>

        {/* Modal Header */}
        <div className="cc-modal-header">
          <div className="cc-header-info">
            <h2 className="cc-header-title">{getCategoryTitle()}</h2>
            <p className="cc-header-sub">{getCategorySubtitle()}</p>
          </div>
          <button
            type="button"
            className="cc-close-btn"
            onClick={onClose}
            title="Exit Preview"
          >
            <X size={18} />
          </button>
        </div>

        {testSubmitted ? (
          <div style={{ padding: '40px 30px', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#ecfdf5',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#059669',
              boxShadow: '0 0 0 8px rgba(16, 185, 129, 0.12)'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              Form Validation & Submission Test Successful!
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 24px' }}>
              In real production, this form generates reference ID <strong>CRD-2026-8492</strong>, creates audit logs, stores custom fields in MongoDB, and notifies administrators.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="mgmt-btn-secondary"
                onClick={handleResetPreview}
              >
                Reset & Test Again
              </button>
              <button
                type="button"
                className="mgmt-btn-primary"
                onClick={onClose}
              >
                Close Preview
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 4-Step Stepper */}
            <div className="cc-stepper-wrap">
              <div className="cc-stepper">
                <div className={`cc-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed clickable' : ''}`} onClick={() => setCurrentStep(1)}>
                  <div className="cc-step-bubble">{currentStep > 1 ? <Check size={14} /> : '1'}</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 1</span>
                    <span className="cc-step-title">Applicant</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 1 ? 'completed' : ''}`} />

                <div className={`cc-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed clickable' : ''}`} onClick={() => currentStep > 2 && setCurrentStep(2)}>
                  <div className="cc-step-bubble">{currentStep > 2 ? <Check size={14} /> : '2'}</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 2</span>
                    <span className="cc-step-title">Referral</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 2 ? 'completed' : ''}`} />

                <div className={`cc-step-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed clickable' : ''}`} onClick={() => currentStep > 3 && setCurrentStep(3)}>
                  <div className="cc-step-bubble">{currentStep > 3 ? <Check size={14} /> : '3'}</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 3</span>
                    <span className="cc-step-title">Consent</span>
                  </div>
                </div>

                <div className={`cc-step-divider ${currentStep > 3 ? 'completed' : ''}`} />

                <div className={`cc-step-item ${currentStep === 4 ? 'active' : ''}`}>
                  <div className="cc-step-bubble">4</div>
                  <div className="cc-step-text">
                    <span className="cc-step-label">Step 4</span>
                    <span className="cc-step-title">Review</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="cc-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {/* STEP 1: Applicant Information */}
              {currentStep === 1 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 1: Applicant Information
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Configure applicant contact details, location, and employment status.
                    </p>
                  </div>

                  {step1Fields.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      No fields configured for Step 1. Add fields in the Form Builder.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {step1Fields.map(f => (
                        <DynamicFieldRenderer
                          key={f.fieldKey}
                          field={f}
                          value={formData[f.fieldKey]}
                          onChange={handleFieldChange}
                          error={fieldErrors[f.fieldKey]}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Referral & Partner Details */}
              {currentStep === 2 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 2: Referral & Partner Details
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Choose verified partners, products, and additional required referral data.
                    </p>
                  </div>

                  {/* Configured Partners list preview */}
                  {partners.length > 0 && (
                    <div style={{ marginBottom: '16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '12px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Building2 size={14} /> Active Verified Partners ({partners.length}):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {partners.map(p => (
                          <span key={p.id} style={{ background: '#ffffff', border: '1px solid #7dd3fc', borderRadius: '6px', padding: '3px 10px', fontSize: '0.76rem', color: '#0284c7', fontWeight: 600 }}>
                            {p.name} ({p.products?.filter(pr => pr.isActive !== false).length || 0} Products)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {step2Fields.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#64748b' }}>
                      No fields configured for Step 2. Add fields in the Form Builder.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {step2Fields.map(f => (
                        <DynamicFieldRenderer
                          key={f.fieldKey}
                          field={f}
                          value={formData[f.fieldKey]}
                          onChange={handleFieldChange}
                          error={fieldErrors[f.fieldKey]}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Consent & DPDP Compliance */}
              {currentStep === 3 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 3: Applicant Consent & Compliance
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Review DPDP compliance notice and record explicit applicant consent.
                    </p>
                  </div>

                  <div className="cc-privacy-callout">
                    <Lock size={20} className="cc-privacy-icon" />
                    <div>
                      <h4 className="cc-privacy-title">Data Protection & Privacy Commitment</h4>
                      <p className="cc-privacy-desc">
                        Strictly adheres to the Digital Personal Data Protection (DPDP) Act and regulatory standards. Never collects passwords, PINs, OTPs, or sensitive credentials.
                      </p>
                    </div>
                  </div>

                  <div className="cc-consent-box">
                    <div className="cc-consent-notice-title">
                      <span>Institutional Referral Consent Notice</span>
                      <span className="cc-consent-ver">{config.generalSettings?.consentNoticeVersion || 'v2.4-FIC-CONSENT'}</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                      {config.generalSettings?.consentText ||
                        'I confirm that the applicant has explicitly consented to sharing their details with the selected partner for referral processing and evaluation.'}
                    </p>
                  </div>

                  <label className="cc-checkbox-label" style={{ marginTop: '16px' }}>
                    <input
                      type="checkbox"
                      className="cc-checkbox"
                      checked={consentChecked}
                      onChange={(e) => {
                        setConsentChecked(e.target.checked);
                        if (fieldErrors.consent) {
                          setFieldErrors(prev => {
                            const next = { ...prev };
                            delete next.consent;
                            return next;
                          });
                        }
                      }}
                    />
                    <span className="cc-checkbox-text">
                      I confirm and certify that explicit consent has been obtained from the applicant. <span style={{ color: '#ef4444' }}>*</span>
                    </span>
                  </label>
                  {fieldErrors.consent && (
                    <div style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {fieldErrors.consent}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Review and Submit */}
              {currentStep === 4 && (
                <div>
                  <div style={{ marginBottom: '18px' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>
                      Step 4: Review & Confirm Submission
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                      Verify all entered details. Click "Edit" on any section to make changes.
                    </p>
                  </div>

                  <div className="cc-review-card">
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <User size={15} style={{ color: '#2563eb' }} />
                        <span>Step 1: Applicant Information</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(1)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      {step1Fields.map(f => (
                        <div key={f.fieldKey} className="cc-review-item">
                          <span>{f.label}</span>
                          <strong>{formData[f.fieldKey] ? String(formData[f.fieldKey]) : <em style={{ color: '#94a3b8' }}>Not provided</em>}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cc-review-card" style={{ marginTop: '14px' }}>
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Building2 size={15} style={{ color: '#059669' }} />
                        <span>Step 2: Referral & Partner Details</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(2)}>
                        Edit
                      </button>
                    </div>
                    <div className="cc-review-grid">
                      {step2Fields.map(f => (
                        <div key={f.fieldKey} className="cc-review-item">
                          <span>{f.label}</span>
                          <strong>{formData[f.fieldKey] ? String(formData[f.fieldKey]) : <em style={{ color: '#94a3b8' }}>Not provided</em>}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cc-review-card" style={{ marginTop: '14px' }}>
                    <div className="cc-review-header">
                      <div className="cc-review-title">
                        <Shield size={15} style={{ color: '#0284c7' }} />
                        <span>Step 3: Consent & Privacy</span>
                      </div>
                      <button type="button" className="cc-edit-btn" onClick={() => setCurrentStep(3)}>
                        Edit
                      </button>
                    </div>
                    <div style={{ padding: '8px 12px', fontSize: '0.82rem', color: '#166534', background: '#f0fdf4', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Check size={14} /> Explicit applicant consent verified and timestamped.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="cc-modal-footer">
              <div>
                {currentStep > 1 && (
                  <button type="button" className="cc-btn-sec" onClick={handleBack}>
                    <ArrowLeft size={15} />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="cc-btn-sec" onClick={onClose}>
                  Exit Preview
                </button>

                {currentStep < 4 ? (
                  <button type="button" className="cc-btn-pri" onClick={handleNext}>
                    <span>Next Step</span>
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button type="button" className="cc-btn-pri" style={{ background: '#059669', borderColor: '#059669' }} onClick={handleTestSubmit}>
                    <Sparkles size={16} />
                    <span>Test Submit Referral</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
