import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  defaultProduct?: string;
  onSuccess: (referral: any) => void;
  onCancel?: () => void;
}

const DEFAULT_BANK_PRODUCTS: Record<string, string[]> = {
  'HDFC Bank': [
    'Millennia Cashback Credit Card',
    'Regalia Gold Credit Card',
    'MoneyBack+ Credit Card',
    'Freedom RuPay Credit Card',
  ],
  'ICICI Bank': [
    'Coral Contactless Credit Card',
    'Amazon Pay ICICI Card',
    'Rubyx Dual Credit Card',
    'Platinum Chip Card',
  ],
  'State Bank of India': [
    'SimplyCLICK SBI Card',
    'SimplySAVE SBI Card',
    'SBI Card PRIME',
    'Pulse Health & Fitness Card',
  ],
  'Axis Bank': [
    'Neo Credit Card',
    'My Zone Credit Card',
    'Flipkart Axis Bank Card',
    'ACE Cashback Credit Card',
  ],
  'Kotak Mahindra Bank': [
    'Kotak League Platinum Card',
    'Kotak Mojo Platinum Card',
    'Kotak 811 #DreamDifferent Card',
    'Kotak White Credit Card',
  ],
};

const EMPLOYMENT_OPTIONS = ['Salaried', 'Self-Employed', 'Student', 'Professional', 'Other'];
const INCOME_OPTIONS = ['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'];
const CITY_OPTIONS = ['Chennai', 'Bangalore', 'Coimbatore', 'Hyderabad', 'Mumbai', 'Delhi NCR', 'Pune', 'Madurai', 'Other'];
const CARD_CATEGORIES = [
  'Cashback & Rewards',
  'Travel & Premium Lounge',
  'Fuel & Utilities',
  'Student & Lifetime Free',
  'Business / Commercial',
];
const REFERRAL_SOURCES = [
  'Direct Recommendation',
  'Campus Drive',
  'Alumni Referral',
  'Staff Reference',
  'Student Network',
  'Other',
];

export default function CreditCardReferralForm({
  user,
  formConfig,
  defaultBank = 'HDFC Bank',
  defaultProduct = '',
  onSuccess,
  onCancel,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Form State
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [city, setCity] = useState('Chennai');
  const [employmentType, setEmploymentType] = useState('Salaried');
  const [monthlyIncome, setMonthlyIncome] = useState('₹25,000 - ₹50,000');

  // Step 2 State
  const [bankName, setBankName] = useState(defaultBank);
  const [cardProduct, setCardProduct] = useState(defaultProduct);
  const [cardCategory, setCardCategory] = useState(CARD_CATEGORIES[0]);
  const [referralSource, setReferralSource] = useState(REFERRAL_SOURCES[0]);
  const [partnerRefNumber, setPartnerRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Step 3 State: Consent
  const [consentGiven, setConsentGiven] = useState(false);

  // Dynamic Custom Fields State
  const [customFields, setCustomFields] = useState<Record<string, any>>({});

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const standardKeys = useMemo(
    () =>
      new Set([
        'applicantname',
        'applicantphone',
        'applicantemail',
        'city',
        'employmenttype',
        'monthlyincome',
        'bankname',
        'cardproduct',
        'cardcategory',
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

  // Resolve dynamic bank/product catalog from formConfig if available
  const bankOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners) && formConfig.partners.length > 0) {
      const active = formConfig.partners.filter((p: any) => p.isActive !== false).map((p: any) => p.name);
      if (active.length > 0) return active;
    }
    return Object.keys(DEFAULT_BANK_PRODUCTS);
  }, [formConfig]);

  const productOptions = useMemo(() => {
    if (formConfig?.partners && Array.isArray(formConfig.partners)) {
      const targetPartner = formConfig.partners.find((p: any) => p.name === bankName);
      if (targetPartner && Array.isArray(targetPartner.products)) {
        const prods = targetPartner.products.filter((p: any) => p.isActive !== false).map((p: any) => p.name);
        if (prods.length > 0) return prods;
      }
    }
    return DEFAULT_BANK_PRODUCTS[bankName] || ['Standard Variant'];
  }, [formConfig, bankName]);

  // Adjust cardProduct when bank changes
  useEffect(() => {
    if (!productOptions.includes(cardProduct)) {
      setCardProduct(productOptions[0] || 'Standard Variant');
    }
  }, [bankName, productOptions]);

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
    if (!employmentType) {
      errs.employmentType = 'Employment status is required.';
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
    if (!cardProduct.trim()) errs.cardProduct = 'Card product variant is required.';
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
      const summaryText = `${applicantName.trim()} - ${bankName} (${cardProduct})`;
      const consentTimestamp = new Date().toISOString();
      const consentNoticeVersion = formConfig?.generalSettings?.consentNoticeVersion || 'v2.4-FIC-CC-CONSENT';

      const payload = {
        category: 'Credit Card',
        formVersion: formConfig?.version || 1,
        partnerName: bankName,
        productName: cardProduct,
        notes: notes.trim(),
        summary: summaryText,
        customFields: {
          summary: summaryText,
          s: summaryText,
          city: city.trim(),
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          employmentType,
          monthlyIncome,
          referralSource,
          ...customFields,
        },
        formData: {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim(),
          city: city.trim(),
          cardCategory,
          bankName,
          cardProduct,
          employmentType,
          monthlyIncome,
          referralSource,
          partnerReferenceNumber: partnerRefNumber.trim(),
          summary: summaryText,
          s: summaryText,
          consentGiven: true,
          applicantConsentGiven: true,
          consentTimestamp,
          ...customFields,
        },
        creditCardDetails: {
          bankName,
          cardProduct,
          cardCategory,
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim(),
          city: city.trim(),
          employmentType,
          monthlyIncome,
          referralSource,
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
      console.error('Credit card referral error:', err);
      setGeneralError(err?.message || 'Failed to submit referral. Please try again.');
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
            <Text style={{ fontSize: 24 }}>💳</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Credit Card Referral</Text>
            <Text style={styles.headerSubtitle}>Authorized Institutional Banking Partner Program</Text>
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
              { num: 2, label: 'Card' },
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
          <Text style={styles.cardTitle}>Step 1: Applicant Details</Text>
          <Text style={styles.cardSubtitle}>Enter basic KYC contact details of the applicant</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Applicant Full Name <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.applicantName ? styles.inputError : null]}
              placeholder="e.g. Ramesh Kumar"
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
              placeholder="name@example.com"
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

          <ModalSelect
            label="Employment Status"
            value={employmentType}
            options={EMPLOYMENT_OPTIONS}
            required
            onSelect={(v) => {
              setEmploymentType(v);
              if (errors.employmentType) setErrors({ ...errors, employmentType: '' });
            }}
            error={errors.employmentType}
          />

          <ModalSelect
            label="Monthly Net Income Range"
            value={monthlyIncome}
            options={INCOME_OPTIONS}
            onSelect={setMonthlyIncome}
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

      {/* STEP 2: CARD DETAILS */}
      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Step 2: Card & Bank Details</Text>
          <Text style={styles.cardSubtitle}>Select verified institutional bank and card offering</Text>

          <ModalSelect
            label="Verified Partner Bank"
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
            label="Approved Card Product"
            value={cardProduct}
            options={productOptions}
            required
            onSelect={(v) => {
              setCardProduct(v);
              if (errors.cardProduct) setErrors({ ...errors, cardProduct: '' });
            }}
            error={errors.cardProduct}
          />

          <ModalSelect
            label="Card Category"
            value={cardCategory}
            options={CARD_CATEGORIES}
            onSelect={setCardCategory}
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
              placeholder="e.g. Lead ID, Branch Employee Code"
              placeholderTextColor="#94A3B8"
              value={partnerRefNumber}
              onChangeText={setPartnerRefNumber}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Referral Notes / Branch Preference (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add specific branch or special instructions..."
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
          <Text style={styles.cardTitle}>Step 3: Consent & Compliance</Text>
          <Text style={styles.cardSubtitle}>Mandatory regulatory verification under RBI & DPDP guidelines</Text>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeHeader}>🛡️ Regulatory Compliance Notice</Text>
            <Text style={styles.noticeBody}>
              Pursuant to the Reserve Bank of India (RBI) Fair Practices Code and Digital Personal Data Protection (DPDP) Act, explicit applicant authorization must be obtained prior to submitting personal and financial data to financial partners.
            </Text>
            <Text style={[styles.noticeBody, { marginTop: 8, fontStyle: 'italic', fontSize: 11 }]}>
              Compliance Spec: v2.4-FIC-CC-CONSENT • Authorized Partner Underwriting
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
              I hereby confirm that I have obtained explicit, verifiable consent from the applicant to share their contact and employment details with <Text style={{ fontWeight: '700' }}>{bankName}</Text> for credit card verification and onboarding.
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
          <Text style={styles.cardSubtitle}>Confirm details before submitting to the partner bank</Text>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionHeader}>Applicant Profile</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Full Name</Text>
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
              <Text style={styles.reviewKey}>Location</Text>
              <Text style={styles.reviewVal}>{city}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Employment</Text>
              <Text style={styles.reviewVal}>{employmentType} • {monthlyIncome}</Text>
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
            <Text style={styles.reviewSectionHeader}>Card & Banking Product</Text>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Bank</Text>
              <Text style={[styles.reviewVal, { color: '#2563EB', fontWeight: '800' }]}>{bankName}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Card Product</Text>
              <Text style={styles.reviewVal}>{cardProduct}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewKey}>Channel</Text>
              <Text style={styles.reviewVal}>{referralSource}</Text>
            </View>
            {partnerRefNumber ? (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewKey}>Partner Ref #</Text>
                <Text style={styles.reviewVal}>{partnerRefNumber}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.consentBadge}>
            <Text style={{ fontSize: 13, color: '#16A34A', fontWeight: '700' }}>
              ✓ Verified Applicant Consent Recorded (v2.4-FIC-CC-CONSENT)
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
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#2563EB',
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
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  noticeHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
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
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
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
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
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
