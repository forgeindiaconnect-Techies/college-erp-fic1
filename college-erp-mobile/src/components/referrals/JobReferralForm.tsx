import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ModalSelect from './ModalSelect';
import DynamicFieldSection, { DynamicFieldDef } from './DynamicFieldSection';
import { apiPost, type MobileUser } from '../../services/api';

interface Props {
  user: MobileUser;
  formConfig?: any;
  defaultSector?: string;
  defaultCompany?: string;
  defaultRole?: string;
  onSuccess: (referral: any) => void;
  onCancel?: () => void;
}

const DEFAULT_CORPORATE_PARTNERS = [
  'Tata Consultancy Services (TCS)',
  'Infosys Limited',
  'Wipro Technologies',
  'Cognizant (CTS)',
  'HDFC Bank Ltd',
  'ICICI Bank Ltd',
  'Deloitte Consulting',
  'Larsen & Toubro (L&T)',
];

const DEFAULT_ROLES_BY_SECTOR: Record<string, { role: string; reqId: string }[]> = {
  'IT / Software': [
    { role: 'Associate Software Engineer', reqId: 'REQ-2026-IT01' },
    { role: 'Full Stack Web Developer', reqId: 'REQ-2026-IT02' },
    { role: 'Quality Assurance & Test Engineer', reqId: 'REQ-2026-IT03' },
    { role: 'Cloud Infrastructure / DevOps Associate', reqId: 'REQ-2026-IT04' },
  ],
  'Non-IT / Core Engineering': [
    { role: 'Graduate Engineer Trainee (GET)', reqId: 'REQ-2026-CORE01' },
    { role: 'Design & CAD Engineer', reqId: 'REQ-2026-CORE02' },
    { role: 'Quality Control & Production Supervisor', reqId: 'REQ-2026-CORE03' },
    { role: 'Site Operations Executive', reqId: 'REQ-2026-CORE04' },
  ],
  'Banking / Finance': [
    { role: 'Relationship Manager - Retail Banking', reqId: 'REQ-2026-BF01' },
    { role: 'Credit Risk Analyst', reqId: 'REQ-2026-BF02' },
    { role: 'Operations & Settlement Executive', reqId: 'REQ-2026-BF03' },
    { role: 'Wealth Management Associate', reqId: 'REQ-2026-BF04' },
  ],
  'EdTech / Education': [
    { role: 'Academic Counselor / Advisor', reqId: 'REQ-2026-ED01' },
    { role: 'Instructional Content Associate', reqId: 'REQ-2026-ED02' },
    { role: 'Student Experience Coordinator', reqId: 'REQ-2026-ED03' },
  ],
  'BPO / Operations': [
    { role: 'Process Executive - Customer Success', reqId: 'REQ-2026-OPS01' },
    { role: 'Technical Support Specialist', reqId: 'REQ-2026-OPS02' },
    { role: 'Data Operations Associate', reqId: 'REQ-2026-OPS03' },
  ],
  'Healthcare / Pharma': [
    { role: 'Medical Data Documentation Specialist', reqId: 'REQ-2026-HC01' },
    { role: 'Healthcare Operations Executive', reqId: 'REQ-2026-HC02' },
  ],
  'Other': [
    { role: 'Corporate Management Trainee', reqId: 'REQ-2026-GEN01' },
    { role: 'Executive Assistant - Business Operations', reqId: 'REQ-2026-GEN02' },
  ],
};

const QUALIFICATIONS = [
  'B.E. / B.Tech',
  'M.E. / M.Tech',
  'MCA / M.Sc CS',
  'B.Sc / BCA',
  'MBA / PGDM',
  'B.Com / BBA',
  'Diploma / Polytechnic',
  'Other Graduate',
];

const EXPERIENCE_LEVELS = [
  'Fresher (0-1 yr)',
  'Junior (1-3 yrs)',
  'Mid-level (3-5 yrs)',
  'Senior (5+ yrs)',
];

const RELATIONSHIPS = [
  'Alumni',
  'Colleague',
  'Mentee',
  'Academic Peer',
  'Personal',
  'Other',
];

const LOCATIONS = [
  'Chennai',
  'Bangalore',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Delhi NCR',
  'Coimbatore',
  'Remote / Hybrid',
];

export default function JobReferralForm({
  user,
  formConfig,
  defaultSector = 'IT / Software',
  defaultCompany = '',
  defaultRole = '',
  onSuccess,
  onCancel,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Step 1 State: Candidate
  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateCity, setCandidateCity] = useState('Chennai');
  const [highestQualification, setHighestQualification] = useState(QUALIFICATIONS[0]);
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_LEVELS[0]);

  // Step 2 State: Job & Vacancy
  const [sector, setSector] = useState(defaultSector || 'IT / Software');
  const [companyName, setCompanyName] = useState(defaultCompany || DEFAULT_CORPORATE_PARTNERS[0]);
  const [jobRole, setJobRole] = useState(defaultRole || 'Associate Software Engineer');
  const [jobReferenceId, setJobReferenceId] = useState('REQ-2026-IT01');
  const [jobLocation, setJobLocation] = useState(LOCATIONS[0]);
  const [referrerRelationship, setReferrerRelationship] = useState(RELATIONSHIPS[0]);
  const [expectedCtc, setExpectedCtc] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3 State: Consent
  const [candidateConsentGiven, setCandidateConsentGiven] = useState(false);

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const standardKeys = useMemo(
    () =>
      new Set([
        'candidatename',
        'candidatephone',
        'candidateemail',
        'candidatecity',
        'currentlocation',
        'highestqualification',
        'experiencelevel',
        'totalexperience',
        'sector',
        'jobcategory',
        'companyname',
        'targetcompany',
        'jobrole',
        'jobreferenceid',
        'joblocation',
        'referrerrelationship',
        'expectedctc',
        'resumeurl',
        'notes',
        'summary',
        's',
        'applicantname',
        'applicantphone',
        'applicantemail',
        'city',
      ]),
    []
  );

  const customFieldDefs: DynamicFieldDef[] = useMemo(() => {
    if (!formConfig?.fieldsConfig || !Array.isArray(formConfig.fieldsConfig)) return [];
    return formConfig.fieldsConfig.filter((f: any) => {
      const k = String(f.fieldKey || '').toLowerCase().trim();
      return !standardKeys.has(k) && !f.isSystem && f.isVisible !== false;
    });
  }, [formConfig, standardKeys]);

  const handleCustomFieldChange = (key: string, val: any) => {
    setCustomFields((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  // Dynamic Corporate Partners from Config
  const partnerOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners) && formConfig.partners.length > 0) {
      const active = formConfig.partners.filter((p: any) => p.isActive !== false).map((p: any) => p.name);
      if (active.length > 0) return active;
    }
    return DEFAULT_CORPORATE_PARTNERS;
  }, [formConfig]);

  const roleOptions = useMemo(() => {
    const list = DEFAULT_ROLES_BY_SECTOR[sector] || DEFAULT_ROLES_BY_SECTOR['IT / Software'];
    return list.map((r) => r.role);
  }, [sector]);

  // Auto-fill Requisition ID when role changes
  useEffect(() => {
    const list = DEFAULT_ROLES_BY_SECTOR[sector] || [];
    const match = list.find((r) => r.role === jobRole);
    if (match) {
      setJobReferenceId(match.reqId);
    }
  }, [sector, jobRole]);

  useEffect(() => {
    if (!roleOptions.includes(jobRole)) {
      setJobRole(roleOptions[0] || 'Associate Software Engineer');
    }
  }, [sector, roleOptions]);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!candidateName.trim()) {
      errs.candidateName = 'Candidate full name is required.';
    }
    const cleanDigits = candidatePhone.replace(/\D/g, '');
    if (!cleanDigits) {
      errs.candidatePhone = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      errs.candidatePhone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (!candidateEmail.trim()) {
      errs.candidateEmail = 'Candidate email is required for interview scheduling.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail.trim())) {
      errs.candidateEmail = 'Enter a valid email address.';
    }
    if (!candidateCity.trim()) {
      errs.candidateCity = 'Candidate current city is required.';
    }
    if (!highestQualification) {
      errs.highestQualification = 'Highest qualification is required.';
    }

    customFieldDefs.forEach((f) => {
      if ((f.step || 1) === 1 && f.isRequired) {
        const val = customFields[f.fieldKey];
        if (!val || !String(val).trim()) {
          errs[f.fieldKey] = f.errorMessage || `${f.label} is required.`;
        }
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!sector) errs.sector = 'Industry sector is required.';
    if (!companyName) errs.companyName = 'Hiring corporate partner is required.';
    if (!jobRole.trim()) errs.jobRole = 'Job role / designation is required.';
    if (!jobReferenceId.trim()) errs.jobReferenceId = 'Job requisition ID is required.';
    if (!jobLocation) errs.jobLocation = 'Preferred job location is required.';
    if (!referrerRelationship) errs.referrerRelationship = 'Relationship is required.';

    customFieldDefs.forEach((f) => {
      if ((f.step || 1) === 2 && f.isRequired) {
        const val = customFields[f.fieldKey];
        if (!val || !String(val).trim()) {
          errs[f.fieldKey] = f.errorMessage || `${f.label} is required.`;
        }
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!candidateConsentGiven) {
      errs.candidateConsentGiven = 'Candidate authorization is mandatory under DPDP guidelines.';
    }

    customFieldDefs.forEach((f) => {
      if ((f.step || 1) === 3 && f.isRequired) {
        const val = customFields[f.fieldKey];
        if (!val || !String(val).trim()) {
          errs[f.fieldKey] = f.errorMessage || `${f.label} is required.`;
        }
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setGeneralError(null);
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) setStep(3);
    } else if (step === 3) {
      if (validateStep3()) setStep(4);
    }
  };

  const handleBack = () => {
    setGeneralError(null);
    if (step > 1) setStep((step - 1) as any);
    else if (onCancel) onCancel();
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      setGeneralError('Please resolve all validation errors before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setGeneralError(null);

      const cleanPhone = candidatePhone.replace(/\D/g, '').slice(-10);
      const summaryText = `${candidateName.trim()} - ${companyName} (${jobRole})`;
      const consentTimestamp = new Date().toISOString();
      const consentNoticeVersion = formConfig?.generalSettings?.consentNoticeVersion || 'v1.2-FIC-JOB-CONSENT';

      const payload = {
        category: 'Job',
        formVersion: formConfig?.version || 1,
        partnerName: companyName,
        productName: jobRole,
        notes: notes.trim(),
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          city: candidateCity.trim(),
          currentLocation: candidateCity.trim(),
          applicantName: candidateName.trim(),
          candidateName: candidateName.trim(),
          applicantPhone: cleanPhone,
          candidatePhone: cleanPhone,
          highestQualification,
          experienceLevel,
          totalExperience: experienceLevel,
          companyName,
          targetCompany: companyName,
          sector,
          jobCategory: sector,
          jobRole,
          ...customFields,
        },
        formData: {
          applicantName: candidateName.trim(),
          candidateName: candidateName.trim(),
          applicantPhone: cleanPhone,
          candidatePhone: cleanPhone,
          applicantEmail: candidateEmail.trim(),
          candidateEmail: candidateEmail.trim(),
          city: candidateCity.trim(),
          currentLocation: candidateCity.trim(),
          highestQualification,
          experienceLevel,
          totalExperience: experienceLevel,
          companyName,
          targetCompany: companyName,
          jobRole,
          sector,
          jobCategory: sector,
          jobLocation,
          jobReferenceId: jobReferenceId.trim(),
          referrerRelationship,
          expectedCtc: expectedCtc.trim(),
          summary: summaryText,
          s: summaryText,
          consentGiven: true,
          candidateConsentGiven: true,
          consentTimestamp,
          ...customFields,
        },
        jobDetails: {
          sector,
          companyName,
          jobRole,
          jobReferenceId: jobReferenceId.trim(),
          jobLocation,
          candidateName: candidateName.trim(),
          candidatePhone: cleanPhone,
          candidateEmail: candidateEmail.trim(),
          candidateCity: candidateCity.trim(),
          highestQualification,
          experienceLevel,
          experienceYears: experienceLevel,
          referrerRelationship,
          expectedCtc: expectedCtc.trim(),
          candidateConsentGiven: true,
          consentTimestamp,
          consentNoticeVersion,
          notes: notes.trim(),
          ...customFields,
        },
      };

      const res: any = await apiPost('referrals', payload);
      const createdItem = res?.data || res;
      onSuccess(createdItem);
    } catch (err: any) {
      console.error('Job referral error:', err);
      setGeneralError(err?.message || 'Failed to submit candidate referral. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
      {/* Category Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconContainer}>
            <Text style={{ fontSize: 24 }}>💼</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Job Candidate Referral</Text>
            <Text style={styles.headerSubtitle}>Authorized Institutional Campus & Corporate Hiring</Text>
          </View>
        </View>

        {/* 4-Step Progress Indicator */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepTrack}>
            <View
              style={[
                styles.stepTrackFilled,
                { width: step === 1 ? '12%' : step === 2 ? '45%' : step === 3 ? '78%' : '100%' },
              ]}
            />
          </View>

          <View style={styles.stepsRow}>
            {[
              { num: 1, label: 'Candidate' },
              { num: 2, label: 'Vacancy' },
              { num: 3, label: 'Consent' },
              { num: 4, label: 'Review' },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <View key={s.num} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepCircle,
                      isActive && styles.stepCircleActive,
                      isDone && styles.stepCircleDone,
                    ]}
                  >
                    <Text
                      style={[
                        styles.stepNumText,
                        isActive && styles.stepNumTextActive,
                        isDone && styles.stepNumTextDone,
                      ]}
                    >
                      {isDone ? '✓' : s.num}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabelText, (isActive || isDone) && styles.stepLabelTextActive]}>
                    {s.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* General Error Banner */}
      {generalError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠ {generalError}</Text>
        </View>
      ) : null}

      {/* STEP 1: CANDIDATE PROFILE */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 1: Candidate Profile</Text>
          <Text style={styles.cardSubtitle}>Provide contact info and academic qualifications of candidate</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Candidate Full Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.candidateName ? styles.inputError : null]}
              placeholder="e.g. Anandhi Natarajan"
              placeholderTextColor="#94A3B8"
              value={candidateName}
              onChangeText={(t) => {
                setCandidateName(t);
                if (errors.candidateName) setErrors({ ...errors, candidateName: '' });
              }}
            />
            {errors.candidateName ? <Text style={styles.fieldError}>⚠ {errors.candidateName}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Number <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.candidatePhone ? styles.inputError : null]}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              maxLength={10}
              value={candidatePhone}
              onChangeText={(t) => {
                setCandidatePhone(t);
                if (errors.candidatePhone) setErrors({ ...errors, candidatePhone: '' });
              }}
            />
            {errors.candidatePhone ? <Text style={styles.fieldError}>⚠ {errors.candidatePhone}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.candidateEmail ? styles.inputError : null]}
              placeholder="anandhi@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={candidateEmail}
              onChangeText={(t) => {
                setCandidateEmail(t);
                if (errors.candidateEmail) setErrors({ ...errors, candidateEmail: '' });
              }}
            />
            {errors.candidateEmail ? <Text style={styles.fieldError}>⚠ {errors.candidateEmail}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Current City / Location <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.candidateCity ? styles.inputError : null]}
              placeholder="e.g. Chennai, Bangalore, Coimbatore"
              placeholderTextColor="#94A3B8"
              value={candidateCity}
              onChangeText={(t) => {
                setCandidateCity(t);
                if (errors.candidateCity) setErrors({ ...errors, candidateCity: '' });
              }}
            />
            {errors.candidateCity ? <Text style={styles.fieldError}>⚠ {errors.candidateCity}</Text> : null}
          </View>

          <ModalSelect
            label="Highest Qualification"
            value={highestQualification}
            options={QUALIFICATIONS}
            required
            onSelect={(v) => {
              setHighestQualification(v);
              if (errors.highestQualification) setErrors({ ...errors, highestQualification: '' });
            }}
            error={errors.highestQualification}
          />

          <ModalSelect
            label="Total Experience Level"
            value={experienceLevel}
            options={EXPERIENCE_LEVELS}
            required
            onSelect={setExperienceLevel}
          />

          <DynamicFieldSection
            step={1}
            fields={customFieldDefs}
            values={customFields}
            errors={errors}
            onChange={handleCustomFieldChange}
          />
        </View>
      )}

      {/* STEP 2: JOB & VACANCY DETAILS */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 2: Position & Opportunity Details</Text>
          <Text style={styles.cardSubtitle}>Select corporate partner, opening, and relation</Text>

          <ModalSelect
            label="Industry Sector"
            value={sector}
            options={Object.keys(DEFAULT_ROLES_BY_SECTOR)}
            required
            onSelect={setSector}
          />

          <ModalSelect
            label="Hiring Corporate Partner"
            value={companyName}
            options={partnerOptions}
            required
            onSelect={(v) => {
              setCompanyName(v);
              if (errors.companyName) setErrors({ ...errors, companyName: '' });
            }}
            error={errors.companyName}
          />

          <ModalSelect
            label="Job Role / Designation"
            value={jobRole}
            options={roleOptions}
            required
            onSelect={(v) => {
              setJobRole(v);
              if (errors.jobRole) setErrors({ ...errors, jobRole: '' });
            }}
            error={errors.jobRole}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Job Requisition ID <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.jobReferenceId ? styles.inputError : null]}
              placeholder="e.g. REQ-2026-IT01"
              placeholderTextColor="#94A3B8"
              value={jobReferenceId}
              onChangeText={(t) => {
                setJobReferenceId(t);
                if (errors.jobReferenceId) setErrors({ ...errors, jobReferenceId: '' });
              }}
            />
            {errors.jobReferenceId ? <Text style={styles.fieldError}>⚠ {errors.jobReferenceId}</Text> : null}
          </View>

          <ModalSelect
            label="Preferred Job Location"
            value={jobLocation}
            options={LOCATIONS}
            required
            onSelect={setJobLocation}
          />

          <ModalSelect
            label="Referrer Relationship"
            value={referrerRelationship}
            options={RELATIONSHIPS}
            required
            onSelect={setReferrerRelationship}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expected CTC (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 6.5 LPA"
              placeholderTextColor="#94A3B8"
              value={expectedCtc}
              onChangeText={setExpectedCtc}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Candidate Key Skills & Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. React, Node.js, AWS, Java, Strong Problem Solving..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <DynamicFieldSection
            step={2}
            fields={customFieldDefs}
            values={customFields}
            errors={errors}
            onChange={handleCustomFieldChange}
          />
        </View>
      )}

      {/* STEP 3: CANDIDATE CONSENT & AUTHORIZATION */}
      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 3: Candidate Consent</Text>
          <Text style={styles.cardSubtitle}>Mandatory talent authorization under privacy regulations</Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeHeader}>🛡️ Institutional Talent Acquisition Notice</Text>
            <Text style={styles.noticeBody}>
              Under institutional privacy standards and Digital Data Protection guidelines, candidate authorization is mandatory before transmitting personal credentials, resume details, and phone contacts to corporate recruitment partners.
            </Text>
            <Text style={[styles.noticeBody, { marginTop: 8, fontStyle: 'italic', fontSize: 11 }]}>
              Authorization Protocol: v1.2-FIC-JOB-CONSENT • No Third-Party Spam
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.consentCard, candidateConsentGiven && styles.consentCardActive]}
            activeOpacity={0.8}
            onPress={() => {
              setCandidateConsentGiven(!candidateConsentGiven);
              if (errors.candidateConsentGiven) setErrors({ ...errors, candidateConsentGiven: '' });
            }}
          >
            <View style={[styles.checkbox, candidateConsentGiven && styles.checkboxActive]}>
              {candidateConsentGiven && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I confirm that the candidate has explicitly authorized me to submit their profile for this vacancy at <Text style={{ fontWeight: '700' }}>{companyName}</Text> and agrees to be contacted by recruitment representatives.
            </Text>
          </TouchableOpacity>
          {errors.candidateConsentGiven ? <Text style={styles.fieldError}>⚠ {errors.candidateConsentGiven}</Text> : null}

          <DynamicFieldSection
            step={3}
            fields={customFieldDefs}
            values={customFields}
            errors={errors}
            onChange={handleCustomFieldChange}
          />
        </View>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {step === 4 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 4: Review & Submit</Text>
          <Text style={styles.cardSubtitle}>Confirm candidate profile and job vacancy details</Text>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionHeader}>Candidate Credentials</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Name</Text>
              <Text style={styles.reviewVal}>{candidateName}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Contact</Text>
              <Text style={styles.reviewVal}>{candidatePhone}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Email</Text>
              <Text style={styles.reviewVal}>{candidateEmail}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Location</Text>
              <Text style={styles.reviewVal}>{candidateCity}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Qualification</Text>
              <Text style={styles.reviewVal}>{highestQualification} • {experienceLevel}</Text>
            </View>
            {customFieldDefs.map((f) => {
              const val = customFields[f.fieldKey];
              if (!val) return null;
              return (
                <View key={f.fieldKey} style={styles.reviewRow}>
                  <Text style={styles.reviewKey}>{f.label}</Text>
                  <Text style={styles.reviewVal}>{String(val)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionHeader}>Target Opportunity</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Company</Text>
              <Text style={[styles.reviewVal, { color: '#7C3AED', fontWeight: '800' }]}>{companyName}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Role</Text>
              <Text style={styles.reviewVal}>{jobRole}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Requisition ID</Text>
              <Text style={[styles.reviewVal, { color: '#2563EB', fontWeight: '700' }]}>{jobReferenceId}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Location</Text>
              <Text style={styles.reviewVal}>{jobLocation}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Relationship</Text>
              <Text style={styles.reviewVal}>{referrerRelationship}</Text>
            </View>
          </View>

          <View style={styles.consentBadge}>
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
              ✓ Explicit Candidate Authorization Verified (v1.2-FIC-JOB-CONSENT)
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={handleBack}
          disabled={submitting}
        >
          <Text style={styles.backBtnText}>{step === 1 ? 'Cancel' : '← Back'}</Text>
        </TouchableOpacity>

        {step < 4 ? (
          <TouchableOpacity
            style={styles.nextBtn}
            activeOpacity={0.8}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Referral ✓</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  stepperContainer: {
    marginTop: 4,
  },
  stepTrack: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  stepTrackFilled: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumTextActive: {
    color: '#FFFFFF',
  },
  stepNumTextDone: {
    color: '#FFFFFF',
  },
  stepLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepLabelTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  req: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  fieldError: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  noticeBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B21A8',
    marginBottom: 4,
  },
  noticeBody: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  consentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  consentCardActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#7C3AED',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
  },
  reviewSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  reviewSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  reviewKey: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '65%',
    textAlign: 'right',
  },
  consentBadge: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  nextBtn: {
    flex: 2,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  nextBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
