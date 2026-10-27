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
  defaultBank?: string;
  defaultType?: string;
  defaultProduct?: string;
  onSuccess: (referral: any) => void;
  onCancel?: () => void;
}

const DEFAULT_PARTICIPATING_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
];

const DEFAULT_PRODUCTS_BY_ACCOUNT_TYPE: Record<string, string[]> = {
  'Student Zero-Balance': [
    'Campus Zero-Balance Student Savings',
    'Smart Student Digital Account with UPI',
    'Scholar Digital Wallet Account',
  ],
  'Savings Account': [
    'Standard Institutional Savings Account',
    'High-Interest Regular Savings Variant',
    'Campus Scholar Flexi-Savings',
  ],
  'Salary Account': [
    'Campus Faculty & Staff Corporate Salary Account',
    'Executive Preferred Salary Account',
    'Institutional Employee Payroll Variant',
  ],
  'Current Account': [
    'Campus Vendor & Contractor Commercial Account',
    'SME Merchant Trade Current Account',
    'Institutional Trust / Society Current Variant',
  ],
};

const APPLICANT_TYPES = [
  'Student',
  'Faculty / Staff',
  'Research Scholar',
  'Alumni',
  'Campus Vendor',
  'Other',
];

const ACCOUNT_TYPES = [
  'Student Zero-Balance',
  'Savings Account',
  'Salary Account',
  'Current Account',
];

const CITY_OPTIONS = ['Chennai', 'Bangalore', 'Coimbatore', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Pune', 'Madurai', 'Other'];
const REFERRAL_SOURCES = [
  'Direct Recommendation',
  'Campus Drive',
  'Alumni Referral',
  'Staff Reference',
  'Student Network',
  'Other',
];

export default function BankAccountReferralForm({
  user,
  formConfig,
  defaultBank = 'HDFC Bank',
  defaultType = 'Savings Account',
  defaultProduct = '',
  onSuccess,
  onCancel,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Step 1: Applicant Details
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [city, setCity] = useState('Chennai');
  const [applicantType, setApplicantType] = useState('Student');

  // Step 2: Account Details
  const [bankName, setBankName] = useState(defaultBank || DEFAULT_PARTICIPATING_BANKS[0]);
  const [accountType, setAccountType] = useState(defaultType || ACCOUNT_TYPES[1]);
  const [accountProduct, setAccountProduct] = useState(defaultProduct);
  const [referralSource, setReferralSource] = useState(REFERRAL_SOURCES[0]);
  const [partnerRefNumber, setPartnerRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3: Consent
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
        'branchcity',
        'applicanttype',
        'bankname',
        'accounttype',
        'accountproduct',
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

  // Dynamic banks from formConfig
  const bankOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners) && formConfig.partners.length > 0) {
      const active = formConfig.partners.filter((p: any) => p.isActive !== false).map((p: any) => p.name);
      if (active.length > 0) return active;
    }
    return DEFAULT_PARTICIPATING_BANKS;
  }, [formConfig]);

  const accountTypeOptions = useMemo(() => {
    if (formConfig?.categoriesList && Array.isArray(formConfig.categoriesList) && formConfig.categoriesList.length > 0) {
      return formConfig.categoriesList;
    }
    return ACCOUNT_TYPES;
  }, [formConfig]);

  const productOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners)) {
      const activeProds: string[] = [];
      formConfig.partners.forEach((p: any) => {
        if (p.isActive !== false && (!bankName || p.name === bankName)) {
          (p.products || []).forEach((prod: any) => {
            if (prod.isActive !== false) {
              const pType = prod.productCategory || 'Savings Account';
              if (pType.toLowerCase() === accountType.toLowerCase()) {
                activeProds.push(prod.name);
              }
            }
          });
        }
      });
      if (activeProds.length > 0) return activeProds;
    }
    return DEFAULT_PRODUCTS_BY_ACCOUNT_TYPE[accountType] || DEFAULT_PRODUCTS_BY_ACCOUNT_TYPE['Savings Account'];
  }, [formConfig, bankName, accountType]);

  useEffect(() => {
    if (!productOptions.includes(accountProduct)) {
      setAccountProduct(productOptions[0] || 'Standard Account Variant');
    }
  }, [accountType, productOptions]);

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
      errs.city = 'City or branch location is required.';
    }
    if (!applicantType) {
      errs.applicantType = 'Campus applicant category is required.';
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
    if (!bankName) errs.bankName = 'Partner bank selection is required.';
    if (!accountType) errs.accountType = 'Account type is required.';
    if (!accountProduct.trim()) errs.accountProduct = 'Account product variant is required.';
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
      errs.consentGiven = 'Explicit consent is mandatory under RBI & DPDP guidelines.';
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
      const summaryText = `${applicantName.trim()} - ${bankName} (${accountProduct})`;
      const consentTimestamp = new Date().toISOString();
      const consentNoticeVersion = formConfig?.generalSettings?.consentNoticeVersion || 'v1.2-FIC-ACC-CONSENT';

      const payload = {
        category: 'Bank Account',
        formVersion: formConfig?.version || 1,
        partnerName: bankName,
        productName: accountProduct,
        notes: notes.trim(),
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          city: city.trim(),
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantType,
          accountType,
          bankName,
          referralSource,
          ...customFields,
        },
        formData: {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim(),
          applicantType,
          city: city.trim(),
          branchCity: city.trim(),
          bankName,
          accountType,
          accountProduct,
          referralSource,
          partnerReferenceNumber: partnerRefNumber.trim(),
          summary: summaryText,
          s: summaryText,
          consentGiven: true,
          applicantConsentGiven: true,
          consentTimestamp,
          ...customFields,
        },
        bankAccountDetails: {
          bankName,
          accountProduct,
          accountType,
          referralSource,
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim(),
          applicantType,
          city: city.trim(),
          branchCity: city.trim(),
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
      console.error('Bank account referral error:', err);
      setGeneralError(err?.message || 'Failed to submit bank account referral. Please try again.');
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
            <Text style={{ fontSize: 24 }}>🏛️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Bank Account Referral</Text>
            <Text style={styles.headerSubtitle}>Verified Partner Bank Lead Facilitation & Onboarding</Text>
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
              { num: 2, label: 'Account' },
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
          <Text style={styles.cardTitle}>Step 1: Applicant Profile</Text>
          <Text style={styles.cardSubtitle}>Provide contact info and campus applicant category</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Applicant Full Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.applicantName ? styles.inputError : null]}
              placeholder="e.g. S. Karthik Raja"
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
              placeholder="karthik@example.com"
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
            label="City / Preferred Branch Location"
            value={city}
            options={CITY_OPTIONS}
            required
            onSelect={(v) => {
              setCity(v);
              if (errors.city) setErrors({ ...errors, city: '' });
            }}
            error={errors.city}
          />

          <ModalSelect
            label="Applicant Category / Campus Type"
            value={applicantType}
            options={APPLICANT_TYPES}
            required
            onSelect={(v) => {
              setApplicantType(v);
              if (errors.applicantType) setErrors({ ...errors, applicantType: '' });
            }}
            error={errors.applicantType}
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

      {/* STEP 2: ACCOUNT OPENING DETAILS */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 2: Bank & Account Details</Text>
          <Text style={styles.cardSubtitle}>Select partner bank, account tier, and variant</Text>

          <ModalSelect
            label="Participating Partner Bank"
            value={bankName}
            options={bankOptions}
            required
            onSelect={(v) => {
              setBankName(v);
              if (errors.bankName) setErrors({ ...errors, bankName: '' });
            }}
            error={errors.bankName}
          />

          <ModalSelect
            label="Account Classification / Type"
            value={accountType}
            options={accountTypeOptions}
            required
            onSelect={setAccountType}
          />

          <ModalSelect
            label="Approved Account Variant / Product"
            value={accountProduct}
            options={productOptions}
            required
            onSelect={(v) => {
              setAccountProduct(v);
              if (errors.accountProduct) setErrors({ ...errors, accountProduct: '' });
            }}
            error={errors.accountProduct}
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
              placeholder="e.g. Campus Onboarding ID or Branch Code"
              placeholderTextColor="#94A3B8"
              value={partnerRefNumber}
              onChangeText={setPartnerRefNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Special Instructions / Branch Preference (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Schedule biometric KYC at college admissions office..."
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

      {/* STEP 3: CONSENT & KYC ACKNOWLEDGEMENT */}
      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 3: Consent & KYC Acknowledgement</Text>
          <Text style={styles.cardSubtitle}>RBI Master Direction & DPDP regulatory compliance</Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeHeader}>🛡️ Banking KYC & Data Protection Notice</Text>
            <Text style={styles.noticeBody}>
              Pursuant to Reserve Bank of India (RBI) Master Directions on Know Your Customer (KYC) and Digital Data Protection guidelines, explicit applicant consent is required for institutional lead facilitation and account opening support.
            </Text>
            <Text style={[styles.noticeBody, { marginTop: 8, fontStyle: 'italic', fontSize: 11 }]}>
              Compliance Spec: v1.2-FIC-ACC-CONSENT • No Spam & Bank Security Assured
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
              I confirm that the applicant has granted explicit consent to submit their contact info and account opening request to <Text style={{ fontWeight: '700' }}>{bankName}</Text> for official KYC verification and onboarding.
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
          <Text style={styles.cardSubtitle}>Review details prior to submitting to partner bank</Text>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionHeader}>Applicant Profile</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Name</Text>
              <Text style={styles.reviewVal}>{applicantName}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Contact</Text>
              <Text style={styles.reviewVal}>{applicantPhone}</Text>
            </View>
            {applicantEmail ? (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Email</Text>
                <Text style={styles.reviewVal}>{applicantEmail}</Text>
              </View>
            ) : null}
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Category</Text>
              <Text style={styles.reviewVal}>{applicantType}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Location</Text>
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
            <Text style={styles.reviewSectionHeader}>Target Account Specification</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Bank</Text>
              <Text style={[styles.reviewVal, { color: '#0284C7', fontWeight: '800' }]}>{bankName}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Account Type</Text>
              <Text style={styles.reviewVal}>{accountType}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Variant</Text>
              <Text style={styles.reviewVal}>{accountProduct}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Channel</Text>
              <Text style={styles.reviewVal}>{referralSource}</Text>
            </View>
          </View>

          <View style={styles.consentBadge}>
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
              ✓ Verified Customer Consent Recorded (v1.2-FIC-ACC-CONSENT)
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
    backgroundColor: '#F0F9FF',
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
    backgroundColor: '#0284C7',
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
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
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
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
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
    backgroundColor: '#F0F9FF',
    borderColor: '#0284C7',
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
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
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
