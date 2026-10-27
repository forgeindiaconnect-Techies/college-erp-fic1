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
  defaultCategory?: string;
  defaultProvider?: string;
  defaultPlan?: string;
  onSuccess: (referral: any) => void;
  onCancel?: () => void;
}

const DEFAULT_INSURERS = [
  'Star Health & Allied Insurance',
  'HDFC ERGO General Insurance',
  'ICICI Lombard General Insurance',
  'Tata AIG General Insurance',
  'Care Health Insurance',
];

const DEFAULT_OFFERINGS: Record<string, string[]> = {
  Health: [
    'Comprehensive Family Floater Plan',
    'Optima Secure Hospitalization Shield',
    'Senior Citizen Red Carpet Health Plan',
    'Campus Student Group Mediclaim',
  ],
  Motor: [
    'Comprehensive Car Protect (Zero-Depreciation)',
    'Two-Wheeler Comprehensive Safety Cover',
    'DriveSmart Commercial & Fleet Cover',
    'Third-Party + Own Damage Hybrid',
  ],
  Life: [
    'Click 2 Protect Super (Term Life)',
    'iSelect Smart Life Pure Term Plan',
    'Institutional Campus Life Protection Plan',
    'Guaranteed Income & Life Shield',
  ],
  Property: [
    'Bharat Griha Raksha (Residential Home Protection)',
    'Educational Campus Property Shield',
    'Commercial Property & Office Asset Cover',
    'Standard Fire & Special Perils Cover',
  ],
};

const SUM_INSURED_TIERS = [
  '₹3,00,000 (3 Lakhs)',
  '₹5,00,000 (5 Lakhs)',
  '₹10,00,000 (10 Lakhs)',
  '₹25,00,000 (25 Lakhs)',
  '₹50,00,000 (50 Lakhs)',
  '₹1,00,00,000 (1 Crore)',
];

const CITY_OPTIONS = ['Chennai', 'Bangalore', 'Coimbatore', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Pune', 'Madurai', 'Other'];
const REFERRAL_SOURCES = [
  'Direct Staff Reference',
  'Campus Mediclaim Advisory',
  'Alumni Referral',
  'Direct Recommendation',
  'Other',
];

export default function InsuranceReferralForm({
  user,
  formConfig,
  defaultCategory = 'Health',
  defaultProvider = 'Star Health & Allied Insurance',
  defaultPlan = '',
  onSuccess,
  onCancel,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Form State: Step 1
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [city, setCity] = useState('Chennai');

  // Step 2 State
  const [insuranceCategory, setInsuranceCategory] = useState(defaultCategory || 'Health');
  const [provider, setProvider] = useState(defaultProvider || DEFAULT_INSURERS[0]);
  const [selectedOffering, setSelectedOffering] = useState(defaultPlan);
  const [sumInsuredTier, setSumInsuredTier] = useState(SUM_INSURED_TIERS[1]);
  const [referralSource, setReferralSource] = useState(REFERRAL_SOURCES[0]);
  const [partnerRefNumber, setPartnerRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3 State
  const [consentGiven, setConsentGiven] = useState(false);

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const standardKeys = useMemo(
    () =>
      new Set([
        'applicantname',
        'applicantphone',
        'applicantemail',
        'city',
        'provider',
        'insurername',
        'insurancecategory',
        'selectedoffering',
        'productname',
        'suminsuredtier',
        'estimatedsuminsured',
        'suminsured',
        'referralsource',
        'partnerreferencenumber',
        'notes',
        'summary',
        's',
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

  // Dynamic Insurers & Plans
  const insurerOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners) && formConfig.partners.length > 0) {
      const active = formConfig.partners.filter((p: any) => p.isActive !== false).map((p: any) => p.name);
      if (active.length > 0) return active;
    }
    return DEFAULT_INSURERS;
  }, [formConfig]);

  const planOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners)) {
      const activePlans: string[] = [];
      formConfig.partners.forEach((p: any) => {
        if (p.isActive !== false && (!provider || p.name === provider)) {
          (p.products || []).forEach((prod: any) => {
            if (prod.isActive !== false) {
              const pCat = prod.productCategory || 'Health';
              if (pCat.toLowerCase() === insuranceCategory.toLowerCase()) {
                activePlans.push(prod.name);
              }
            }
          });
        }
      });
      if (activePlans.length > 0) return activePlans;
    }
    return DEFAULT_OFFERINGS[insuranceCategory] || DEFAULT_OFFERINGS['Health'];
  }, [formConfig, provider, insuranceCategory]);

  useEffect(() => {
    if (!planOptions.includes(selectedOffering)) {
      setSelectedOffering(planOptions[0] || 'Comprehensive Plan');
    }
  }, [insuranceCategory, planOptions]);

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!applicantName.trim()) {
      errs.applicantName = 'Applicant full name is required.';
    }
    const cleanDigits = applicantPhone.replace(/\D/g, '');
    if (!cleanDigits) {
      errs.applicantPhone = 'Mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      errs.applicantPhone = 'Enter a valid 10-digit Indian mobile number.';
    }
    if (applicantEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail.trim())) {
      errs.applicantEmail = 'Enter a valid email address.';
    }
    if (!city.trim()) {
      errs.city = 'City or campus location is required.';
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
    if (!provider) errs.provider = 'Insurance underwriter selection is required.';
    if (!selectedOffering.trim()) errs.selectedOffering = 'Insurance policy plan is required.';
    if (!sumInsuredTier) errs.sumInsuredTier = 'Sum insured tier is required.';
    if (!referralSource) errs.referralSource = 'Referral channel is required.';

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
    if (!consentGiven) {
      errs.consentGiven = 'Explicit applicant consent is mandatory under IRDAI & DPDP regulations.';
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

      const cleanPhone = applicantPhone.replace(/\D/g, '').slice(-10);
      const summaryText = `${applicantName.trim()} - ${provider} (${selectedOffering})`;
      const consentTimestamp = new Date().toISOString();
      const consentNoticeVersion = formConfig?.generalSettings?.consentNoticeVersion || 'v1.2-FIC-INS-CONSENT';

      // Parse approximate numeric tier for backend
      const numericMatch = sumInsuredTier.replace(/,/g, '').match(/\d+/);
      const numericTier = numericMatch ? parseInt(numericMatch[0], 10) : 500000;

      const payload = {
        category: 'Insurance',
        formVersion: formConfig?.version || 1,
        partnerName: provider,
        productName: selectedOffering,
        notes: notes.trim(),
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          city: city.trim(),
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          provider,
          insurerName: provider,
          selectedOffering,
          productName: selectedOffering,
          sumInsured: sumInsuredTier,
          sumInsuredTier,
          referralSource,
          ...customFields,
        },
        formData: {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim(),
          city: city.trim(),
          provider,
          insurerName: provider,
          insuranceCategory,
          selectedOffering,
          productName: selectedOffering,
          sumInsuredTier,
          sumInsured: sumInsuredTier,
          referralSource,
          partnerReferenceNumber: partnerRefNumber.trim(),
          summary: summaryText,
          s: summaryText,
          consentGiven: true,
          applicantConsentGiven: true,
          consentTimestamp,
          ...customFields,
        },
        insuranceDetails: {
          provider,
          insuranceCategory,
          productType:
            insuranceCategory === 'Motor'
              ? 'Motor / Vehicle'
              : insuranceCategory === 'Life'
              ? 'Term Life'
              : insuranceCategory,
          selectedOffering,
          sumInsuredTier,
          sumInsured: sumInsuredTier,
          estimatedSumInsured: numericTier,
          referralSource,
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim(),
          applicantCity: city.trim(),
          partnerReferenceNumber: partnerRefNumber.trim(),
          applicantConsentGiven: true,
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
      console.error('Insurance referral error:', err);
      setGeneralError(err?.message || 'Failed to submit insurance referral. Please try again.');
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
            <Text style={{ fontSize: 24 }}>🛡️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Insurance Referral</Text>
            <Text style={styles.headerSubtitle}>Verified Institutional Health, Life & Motor Coverage</Text>
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
              { num: 1, label: 'Applicant' },
              { num: 2, label: 'Policy' },
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

      {/* STEP 1: APPLICANT DETAILS */}
      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 1: Applicant Information</Text>
          <Text style={styles.cardSubtitle}>Provide primary contact info of the insured candidate</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Applicant Full Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.applicantName ? styles.inputError : null]}
              placeholder="e.g. Meenakshi Sundaram"
              placeholderTextColor="#94A3B8"
              value={applicantName}
              onChangeText={(t) => {
                setApplicantName(t);
                if (errors.applicantName) setErrors({ ...errors, applicantName: '' });
              }}
            />
            {errors.applicantName ? <Text style={styles.fieldError}>⚠ {errors.applicantName}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mobile Number <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.applicantPhone ? styles.inputError : null]}
              placeholder="10-digit mobile number"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
              maxLength={10}
              value={applicantPhone}
              onChangeText={(t) => {
                setApplicantPhone(t);
                if (errors.applicantPhone) setErrors({ ...errors, applicantPhone: '' });
              }}
            />
            {errors.applicantPhone ? <Text style={styles.fieldError}>⚠ {errors.applicantPhone}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Address (Optional)</Text>
            <TextInput
              style={[styles.input, errors.applicantEmail ? styles.inputError : null]}
              placeholder="applicant@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={applicantEmail}
              onChangeText={(t) => {
                setApplicantEmail(t);
                if (errors.applicantEmail) setErrors({ ...errors, applicantEmail: '' });
              }}
            />
            {errors.applicantEmail ? <Text style={styles.fieldError}>⚠ {errors.applicantEmail}</Text> : null}
          </View>

          <ModalSelect
            label="City / Campus Location"
            value={city}
            options={CITY_OPTIONS}
            required
            onSelect={(v) => {
              setCity(v);
              if (errors.city) setErrors({ ...errors, city: '' });
            }}
            error={errors.city}
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

      {/* STEP 2: POLICY & COVERAGE DETAILS */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 2: Policy & Underwriter Details</Text>
          <Text style={styles.cardSubtitle}>Select insurance domain, partner underwriter, and tier</Text>

          <ModalSelect
            label="Insurance Category"
            value={insuranceCategory}
            options={['Health', 'Motor', 'Life', 'Property']}
            required
            onSelect={setInsuranceCategory}
          />

          <ModalSelect
            label="Approved Partner Insurer"
            value={provider}
            options={insurerOptions}
            required
            onSelect={(v) => {
              setProvider(v);
              if (errors.provider) setErrors({ ...errors, provider: '' });
            }}
            error={errors.provider}
          />

          <ModalSelect
            label="Approved Insurance Offering / Plan"
            value={selectedOffering}
            options={planOptions}
            required
            onSelect={(v) => {
              setSelectedOffering(v);
              if (errors.selectedOffering) setErrors({ ...errors, selectedOffering: '' });
            }}
            error={errors.selectedOffering}
          />

          <ModalSelect
            label="Sum Insured Tier"
            value={sumInsuredTier}
            options={SUM_INSURED_TIERS}
            required
            onSelect={(v) => {
              setSumInsuredTier(v);
              if (errors.sumInsuredTier) setErrors({ ...errors, sumInsuredTier: '' });
            }}
            error={errors.sumInsuredTier}
          />

          <ModalSelect
            label="Referral Channel / Source"
            value={referralSource}
            options={REFERRAL_SOURCES}
            required
            onSelect={(v) => {
              setReferralSource(v);
              if (errors.referralSource) setErrors({ ...errors, referralSource: '' });
            }}
            error={errors.referralSource}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Partner Reference # (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Insurer Agent Code, Branch UID"
              placeholderTextColor="#94A3B8"
              value={partnerRefNumber}
              onChangeText={setPartnerRefNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Policy Notes / Pre-existing Medical Conditions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add family member counts or specific coverage needs..."
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

      {/* STEP 3: CONSENT & COMPLIANCE */}
      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 3: Consent & Authorization</Text>
          <Text style={styles.cardSubtitle}>IRDAI regulatory compliance and applicant acknowledgment</Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeHeader}>🛡️ IRDAI Compliance Declaration</Text>
            <Text style={styles.noticeBody}>
              Under the Insurance Regulatory and Development Authority of India (IRDAI) regulations and Digital Personal Data Protection Act, client authorization is strictly mandatory before transferring contact credentials to authorized insurance intermediaries.
            </Text>
            <Text style={[styles.noticeBody, { marginTop: 8, fontStyle: 'italic', fontSize: 11 }]}>
              Standard Protocol: v1.2-FIC-INS-CONSENT • No Spam & Secure Advisory Assurance
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.consentCard, consentGiven && styles.consentCardActive]}
            activeOpacity={0.8}
            onPress={() => {
              setConsentGiven(!consentGiven);
              if (errors.consentGiven) setErrors({ ...errors, consentGiven: '' });
            }}
          >
            <View style={[styles.checkbox, consentGiven && styles.checkboxActive]}>
              {consentGiven && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I verify that I have obtained explicit consent from the applicant to share their contact information and coverage requirements with <Text style={{ fontWeight: '700' }}>{provider}</Text> for policy consultation and underwriting.
            </Text>
          </TouchableOpacity>
          {errors.consentGiven ? <Text style={styles.fieldError}>⚠ {errors.consentGiven}</Text> : null}

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
          <Text style={styles.cardSubtitle}>Double-check applicant and policy details before transmission</Text>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionHeader}>Applicant Profile</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Name</Text>
              <Text style={styles.reviewVal}>{applicantName}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Mobile</Text>
              <Text style={styles.reviewVal}>{applicantPhone}</Text>
            </View>
            {applicantEmail ? (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Email</Text>
                <Text style={styles.reviewVal}>{applicantEmail}</Text>
              </View>
            ) : null}
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>City</Text>
              <Text style={styles.reviewVal}>{city}</Text>
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
            <Text style={styles.reviewSectionHeader}>Insurance Policy Specification</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Insurer</Text>
              <Text style={[styles.reviewVal, { color: '#059669', fontWeight: '800' }]}>{provider}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Category</Text>
              <Text style={styles.reviewVal}>{insuranceCategory} Insurance</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Plan</Text>
              <Text style={styles.reviewVal}>{selectedOffering}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Sum Insured</Text>
              <Text style={[styles.reviewVal, { color: '#2563EB', fontWeight: '800' }]}>{sumInsuredTier}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Channel</Text>
              <Text style={styles.reviewVal}>{referralSource}</Text>
            </View>
          </View>

          <View style={styles.consentBadge}>
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
              ✓ Explicit IRDAI & DPDP Consent Verified (v1.2-FIC-INS-CONSENT)
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
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
    backgroundColor: '#ECFDF5',
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
    backgroundColor: '#059669',
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
    backgroundColor: '#059669',
    borderColor: '#059669',
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
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
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
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
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
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
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
