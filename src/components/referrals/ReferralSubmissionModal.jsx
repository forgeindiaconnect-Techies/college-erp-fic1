import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, CreditCard, Landmark, Briefcase, X, Check,
  AlertCircle, CheckCircle2, Copy, Lock, Loader2, ArrowRight
} from 'lucide-react';
import { submitReferral } from '../../api/index';
import CreditCardReferralModal from './CreditCardReferralModal';
import InsuranceReferralModal from './InsuranceReferralModal';
import JobReferralModal from './JobReferralModal';
import AccountOpeningReferralModal from './AccountOpeningReferralModal';
import './ReferralSubmissionModal.css';

export default function ReferralSubmissionModal({
  isOpen,
  onClose,
  defaultCategory = 'Insurance',
  defaultProductOrProvider = '',
  onSuccess = null,
  rootRole = 'admin'
}) {
  const navigate = useNavigate();
  const [category, setCategory] = useState(defaultCategory);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successReferral, setSuccessReferral] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    // Common / Applicant
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    city: '',
    notes: '',
    consentGiven: false,

    // Insurance
    provider: 'Star Health',
    productType: 'Health',
    estimatedSumInsured: 500000,

    // Credit Card
    bankName: 'HDFC Bank',
    cardProduct: 'Millennia Cashback',
    employmentType: 'Salaried',

    // Bank Account
    accountBankName: 'HDFC Bank',
    accountType: 'Savings Account',

    // Job
    sector: 'IT / Software',
    companyName: 'TCS',
    jobRole: 'Software Engineer',
    experienceYears: '1-3 Years',
    skills: '',
    resumeUrl: ''
  });

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setSuccessReferral(null);
      setError(null);
      setCopiedCode(false);

      // Prepopulate if provider/product specified
      if (defaultProductOrProvider) {
        if (defaultCategory === 'Insurance') {
          setFormData(prev => ({ ...prev, productType: defaultProductOrProvider, provider: 'Star Health', consentGiven: false }));
        } else if (defaultCategory === 'Credit Card') {
          setFormData(prev => ({ ...prev, bankName: defaultProductOrProvider, consentGiven: false }));
        } else if (defaultCategory === 'Bank Account') {
          setFormData(prev => ({ ...prev, accountType: defaultProductOrProvider, consentGiven: false }));
        } else if (defaultCategory === 'Job') {
          setFormData(prev => ({ ...prev, sector: defaultProductOrProvider, consentGiven: false }));
        }
      } else {
        setFormData(prev => ({ ...prev, consentGiven: false }));
      }
    }
  }, [isOpen, defaultCategory, defaultProductOrProvider]);

  if (!isOpen) return null;

  if (category === 'Credit Card') {
    return (
      <CreditCardReferralModal
        isOpen={isOpen}
        onClose={onClose}
        defaultBank={formData.bankName || defaultProductOrProvider || 'HDFC Bank'}
        onSuccess={onSuccess}
        rootRole={rootRole}
      />
    );
  }

  if (category === 'Insurance') {
    return (
      <InsuranceReferralModal
        isOpen={isOpen}
        onClose={onClose}
        defaultCategory={formData.productType || 'Health'}
        defaultProvider={formData.provider || 'Star Health & Allied Insurance'}
        onSuccess={onSuccess}
        rootRole={rootRole}
      />
    );
  }

  if (category === 'Job') {
    return (
      <JobReferralModal
        isOpen={isOpen}
        onClose={onClose}
        defaultSector={formData.sector || 'IT / Software'}
        defaultCompany={formData.companyName || ''}
        onSuccess={onSuccess}
        rootRole={rootRole}
      />
    );
  }

  if (category === 'Bank Account') {
    return (
      <AccountOpeningReferralModal
        isOpen={isOpen}
        onClose={onClose}
        defaultAccountType={formData.accountType || 'Savings Account'}
        defaultBank={formData.accountBankName || 'HDFC Bank'}
        onSuccess={onSuccess}
        rootRole={rootRole}
      />
    );
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleCopyCode = (code) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    const name = category === 'Job' ? formData.applicantName : formData.applicantName;
    const phone = formData.applicantPhone?.trim();

    if (!name || name.trim().length < 2) {
      setError('Please enter a valid applicant name.');
      return;
    }

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).');
      return;
    }

    if (!formData.consentGiven) {
      setError('Explicit applicant / candidate consent is mandatory before submitting a referral.');
      return;
    }

    setSubmitting(true);

    try {
      let payload = { category };

      if (category === 'Insurance') {
        payload.insuranceDetails = {
          provider: formData.provider || 'Star Health',
          productType: formData.productType || 'Health',
          applicantName: formData.applicantName.trim(),
          applicantPhone: phone,
          applicantEmail: formData.applicantEmail.trim(),
          applicantCity: formData.city.trim(),
          estimatedSumInsured: Number(formData.estimatedSumInsured) || 0,
          applicantConsentGiven: true,
          notes: formData.notes.trim()
        };
      } else if (category === 'Credit Card') {
        payload.creditCardDetails = {
          bankName: formData.bankName || 'HDFC Bank',
          cardProduct: formData.cardProduct || 'Standard Variant',
          applicantName: formData.applicantName.trim(),
          applicantPhone: phone,
          applicantEmail: formData.applicantEmail.trim(),
          city: formData.city.trim(),
          employmentType: formData.employmentType || 'Salaried',
          applicantConsentGiven: true,
          notes: formData.notes.trim()
        };
      } else if (category === 'Bank Account') {
        payload.bankAccountDetails = {
          bankName: formData.accountBankName || 'HDFC Bank',
          accountType: formData.accountType || 'Savings Account',
          applicantName: formData.applicantName.trim(),
          applicantPhone: phone,
          applicantEmail: formData.applicantEmail.trim(),
          branchCity: formData.city.trim(),
          applicantConsentGiven: true,
          notes: formData.notes.trim()
        };
      } else if (category === 'Job') {
        payload.jobDetails = {
          sector: formData.sector || 'IT / Software',
          companyName: formData.companyName || 'Corporate Partner',
          jobRole: formData.jobRole || 'Professional',
          candidateName: formData.applicantName.trim(),
          candidatePhone: phone,
          candidateEmail: formData.applicantEmail.trim(),
          experienceYears: formData.experienceYears || 'Fresher',
          skills: formData.skills.trim(),
          resumeUrl: formData.resumeUrl.trim(),
          candidateConsentGiven: true,
          notes: formData.notes.trim()
        };
      }

      const res = await submitReferral(payload);

      if (res && res.data && res.data.success && res.data.data) {
        setSuccessReferral(res.data.data);
        if (onSuccess) onSuccess(res.data.data);
      } else {
        throw new Error(res.data?.message || 'Failed to record referral in database.');
      }
    } catch (err) {
      console.error('Referral submission error:', err);
      setError(err.response?.data?.message || err.message || 'Error saving referral to database. Please check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const getConsentText = () => {
    switch (category) {
      case 'Insurance':
        return 'I confirm that the applicant has granted explicit consent to be contacted regarding this insurance inquiry, and has authorized institutional referral routing in compliance with IRDAI & data protection norms.';
      case 'Credit Card':
        return 'I verify that the applicant has provided explicit digital or signed consent to be contacted by the designated partner bank for credit card processing in compliance with banking regulations.';
      case 'Bank Account':
        return 'I confirm that the applicant has given explicit consent to initiate the digital Video-KYC account opening process with the designated partner bank.';
      case 'Job':
        return 'I confirm that the candidate has reviewed the job role details and granted formal consent to submit their profile and contact details for recruitment consideration.';
      default:
        return 'I confirm that the applicant has granted explicit consent for this referral submission.';
    }
  };

  return (
    <div className="ref-sub-overlay" onClick={onClose}>
      <div className="ref-sub-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ref-sub-header">
          <div className="ref-sub-title-group">
            <div className={`ref-sub-icon-badge cat-${category.toLowerCase().replace(/\s+/g, '-')}`}>
              {category === 'Insurance' && <Shield size={20} />}
              {category === 'Credit Card' && <CreditCard size={20} />}
              {category === 'Bank Account' && <Landmark size={20} />}
              {category === 'Job' && <Briefcase size={20} />}
            </div>
            <div>
              <h3 className="ref-sub-title">Submit {category} Referral</h3>
              <p className="ref-sub-subtitle">Recorded directly in institutional database with authenticated audit logging</p>
            </div>
          </div>
          <button type="button" className="ref-sub-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* If Success State */}
        {successReferral ? (
          <div className="ref-sub-body ref-sub-success-wrap">
            <div className="ref-success-icon-ring">
              <CheckCircle2 size={48} className="text-emerald" />
            </div>
            <h3 className="ref-success-title">Referral Saved in Database!</h3>
            <p className="ref-success-desc">
              Your <strong>{category}</strong> referral has been successfully saved to the institutional database.
              A unique reference code has been generated:
            </p>

            <div className="ref-success-code-box">
              <div className="ref-code-label">OFFICIAL REFERRAL REFERENCE CODE</div>
              <div className="ref-code-value">{successReferral.referralCode}</div>
              <button
                type="button"
                className={`ref-copy-badge ${copiedCode ? 'copied' : ''}`}
                onClick={() => handleCopyCode(successReferral.referralCode)}
              >
                <Copy size={13} />
                <span>{copiedCode ? 'Copied to Clipboard! ✓' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="ref-success-meta-row">
              <div className="ref-meta-item">
                <span className="ref-meta-label">Status</span>
                <span className="ref-meta-val badge-submitted">{successReferral.status || 'Submitted'}</span>
              </div>
              <div className="ref-meta-item">
                <span className="ref-meta-label">Milestone Trigger</span>
                <span className="ref-meta-val">Pending Verification</span>
              </div>
              <div className="ref-meta-item">
                <span className="ref-meta-label">Disbursement</span>
                <span className="ref-meta-val">Settlement Cycle</span>
              </div>
            </div>

            <div className="ref-success-notice">
              <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                The referral is now routed for authorized administrative and partner review. You can monitor the real-time progress, verification milestone, and approved incentive clearance in your tracking portal.
              </span>
            </div>

            <div className="ref-sub-footer" style={{ borderTop: 'none', padding: '10px 0 0 0' }}>
              <button
                type="button"
                className="ref-btn-sec"
                onClick={() => {
                  setSuccessReferral(null);
                  setFormData(prev => ({ ...prev, applicantName: '', applicantPhone: '', applicantEmail: '', consentGiven: false }));
                }}
              >
                Submit Another Referral
              </button>
              <button
                type="button"
                className="ref-btn-pri"
                onClick={() => {
                  onClose();
                  navigate(`/${rootRole}/referrals`);
                }}
              >
                <span>Track in My Referrals</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="ref-sub-form">
            <div className="ref-sub-body">
              {/* Category Switcher Tabs */}
              <div className="ref-cat-switcher">
                {[
                  { id: 'Insurance', icon: <Shield size={14} />, label: 'Insurance' },
                  { id: 'Credit Card', icon: <CreditCard size={14} />, label: 'Credit Card' },
                  { id: 'Bank Account', icon: <Landmark size={14} />, label: 'Bank Account' },
                  { id: 'Job', icon: <Briefcase size={14} />, label: 'Job Referral' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`ref-cat-switch-btn ${category === cat.id ? 'active' : ''}`}
                    onClick={() => {
                      setCategory(cat.id);
                      setError(null);
                    }}
                  >
                    {cat.icon}
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Data Privacy Callout */}
              <div className="ref-privacy-callout">
                <Lock size={15} style={{ flexShrink: 0, color: '#059669' }} />
                <span>
                  <strong>Data Protection & Privacy Notice:</strong> Collect only necessary contact details. Never request passwords, OTPs, CVVs, or confidential health histories.
                </span>
              </div>

              {error && (
                <div className="ref-error-banner">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Category-Specific Fields */}
              <div className="ref-form-grid">
                {/* 1. Insurance Fields */}
                {category === 'Insurance' && (
                  <>
                    <div className="ref-form-field">
                      <label className="ref-label">Insurance Provider *</label>
                      <select
                        className="ref-input"
                        value={formData.provider}
                        onChange={(e) => handleChange('provider', e.target.value)}
                      >
                        <option value="Star Health">Star Health & Allied Insurance</option>
                        <option value="HDFC ERGO">HDFC ERGO General Insurance</option>
                        <option value="Care Health">Care Health Insurance</option>
                        <option value="ICICI Lombard">ICICI Lombard</option>
                        <option value="Bajaj Allianz">Bajaj Allianz</option>
                        <option value="Other Regulated Insurer">Other IRDAI-Regulated Insurer</option>
                      </select>
                    </div>

                    <div className="ref-form-field">
                      <label className="ref-label">Policy Type *</label>
                      <select
                        className="ref-input"
                        value={formData.productType}
                        onChange={(e) => handleChange('productType', e.target.value)}
                      >
                        <option value="Health">Health Insurance / Floater</option>
                        <option value="Term Life">Term Life Protection</option>
                        <option value="Motor / Vehicle">Motor / Vehicle Protection</option>
                        <option value="Personal Accident">Personal Accident Cover</option>
                        <option value="Travel">Travel Insurance</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 2. Credit Card Fields */}
                {category === 'Credit Card' && (
                  <>
                    <div className="ref-form-field">
                      <label className="ref-label">Partner Bank *</label>
                      <select
                        className="ref-input"
                        value={formData.bankName}
                        onChange={(e) => handleChange('bankName', e.target.value)}
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="SBI Cards">SBI Cards</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                        <option value="AU Small Finance Bank">AU Small Finance Bank</option>
                      </select>
                    </div>

                    <div className="ref-form-field">
                      <label className="ref-label">Employment Type</label>
                      <select
                        className="ref-input"
                        value={formData.employmentType}
                        onChange={(e) => handleChange('employmentType', e.target.value)}
                      >
                        <option value="Salaried">Salaried (Corporate / Campus)</option>
                        <option value="Self-Employed">Self-Employed / Business</option>
                        <option value="Student">Student (Scholar / Intern)</option>
                        <option value="Professional">Professional (Doctor, CA, Consultant)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 3. Bank Account Fields */}
                {category === 'Bank Account' && (
                  <>
                    <div className="ref-form-field">
                      <label className="ref-label">Target Bank *</label>
                      <select
                        className="ref-input"
                        value={formData.accountBankName}
                        onChange={(e) => handleChange('accountBankName', e.target.value)}
                      >
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="Kotak Mahindra Bank">Kotak Mahindra Bank (811 Digital)</option>
                        <option value="AU Small Finance Bank">AU Small Finance Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="State Bank of India">State Bank of India</option>
                      </select>
                    </div>

                    <div className="ref-form-field">
                      <label className="ref-label">Account Variant *</label>
                      <select
                        className="ref-input"
                        value={formData.accountType}
                        onChange={(e) => handleChange('accountType', e.target.value)}
                      >
                        <option value="Savings Account">Standard Savings Account</option>
                        <option value="Student Zero-Balance">Student Zero-Balance Digital Account</option>
                        <option value="Salary Account">Corporate Salary Account</option>
                        <option value="Current Account">Current / Trade Account</option>
                      </select>
                    </div>
                  </>
                )}

                {/* 4. Job Referral Fields */}
                {category === 'Job' && (
                  <>
                    <div className="ref-form-field">
                      <label className="ref-label">Hiring Sector *</label>
                      <select
                        className="ref-input"
                        value={formData.sector}
                        onChange={(e) => handleChange('sector', e.target.value)}
                      >
                        <option value="IT / Software">IT / Software Engineering</option>
                        <option value="Non-IT / Core Engineering">Core Engineering / Non-IT</option>
                        <option value="Banking / Finance">Banking / Finance / Fintech</option>
                        <option value="Healthcare / Pharma">Healthcare / Pharma</option>
                        <option value="EdTech / Education">EdTech / Education</option>
                        <option value="BPO / Operations">Operations & Customer Support</option>
                      </select>
                    </div>

                    <div className="ref-form-field">
                      <label className="ref-label">Target Company / Partner *</label>
                      <input
                        type="text"
                        className="ref-input"
                        placeholder="e.g. TCS, Infosys, Wipro, Tech Mahindra"
                        value={formData.companyName}
                        onChange={(e) => handleChange('companyName', e.target.value)}
                        required
                      >
                      </input>
                    </div>

                    <div className="ref-form-field">
                      <label className="ref-label">Job Role Title *</label>
                      <input
                        type="text"
                        className="ref-input"
                        placeholder="e.g. Software Engineer, Business Analyst"
                        value={formData.jobRole}
                        onChange={(e) => handleChange('jobRole', e.target.value)}
                        required
                      >
                      </input>
                    </div>

                    <div className="ref-form-field">
                      <label className="ref-label">Experience Level</label>
                      <select
                        className="ref-input"
                        value={formData.experienceYears}
                        onChange={(e) => handleChange('experienceYears', e.target.value)}
                      >
                        <option value="Fresher / Entry Level">Fresher / Entry Level</option>
                        <option value="1-3 Years">1 - 3 Years</option>
                        <option value="3-5 Years">3 - 5 Years</option>
                        <option value="5+ Years">5+ Years (Senior)</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Common Applicant Fields */}
                <div className="ref-form-field">
                  <label className="ref-label">{category === 'Job' ? 'Candidate Full Name *' : 'Applicant Full Name *'}</label>
                  <input
                    type="text"
                    className="ref-input"
                    placeholder="Enter official name"
                    value={formData.applicantName}
                    onChange={(e) => handleChange('applicantName', e.target.value)}
                    required
                  />
                </div>

                <div className="ref-form-field">
                  <label className="ref-label">Mobile Phone (10 digits) *</label>
                  <input
                    type="tel"
                    className="ref-input"
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    value={formData.applicantPhone}
                    onChange={(e) => handleChange('applicantPhone', e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <div className="ref-form-field">
                  <label className="ref-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="ref-input"
                    placeholder="name@example.com"
                    value={formData.applicantEmail}
                    onChange={(e) => handleChange('applicantEmail', e.target.value)}
                  />
                </div>

                <div className="ref-form-field">
                  <label className="ref-label">City / Campus Location</label>
                  <input
                    type="text"
                    className="ref-input"
                    placeholder="e.g. Chennai, Bangalore, Coimbatore"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                  />
                </div>

                {category === 'Job' && (
                  <div className="ref-form-field full-width">
                    <label className="ref-label">Candidate Key Skills & Technologies</label>
                    <input
                      type="text"
                      className="ref-input"
                      placeholder="e.g. React, Node.js, Python, SQL, Communication"
                      value={formData.skills}
                      onChange={(e) => handleChange('skills', e.target.value)}
                    />
                  </div>
                )}

                <div className="ref-form-field full-width">
                  <label className="ref-label">Referral Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    className="ref-input"
                    placeholder="Additional context or timing preference"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                  />
                </div>
              </div>

              {/* Mandatory Explicit Consent Checkbox */}
              <div className="ref-consent-card">
                <label className="ref-consent-label">
                  <input
                    type="checkbox"
                    className="ref-consent-checkbox"
                    checked={formData.consentGiven}
                    onChange={(e) => handleChange('consentGiven', e.target.checked)}
                    required
                  />
                  <span className="ref-consent-text">
                    <strong>Mandatory Applicant Consent:</strong> {getConsentText()}
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="ref-sub-footer">
              <button
                type="button"
                className="ref-btn-sec"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ref-btn-pri"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="ref-spinner" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <span>Submit {category} Referral</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
