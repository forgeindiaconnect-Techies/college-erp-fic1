import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, apiPost, type MobileUser } from '../../services/api';

type Props = {
  user: MobileUser;
};

type ReferralSubTab = 'overview' | 'categories' | 'submissions' | 'rules';

type ReferralCategory = 'Credit Card' | 'Insurance' | 'Bank Account' | 'Job';

type ReferralItem = {
  _id: string;
  referralCode: string;
  category: ReferralCategory;
  status: string;
  createdAt: string;
  creditCardDetails?: { applicantName?: string; bankName?: string; cardName?: string };
  insuranceDetails?: { applicantName?: string; provider?: string; insuranceType?: string };
  bankAccountDetails?: { applicantName?: string; bankName?: string; accountType?: string };
  jobDetails?: { candidateName?: string; companyName?: string; jobRole?: string };
  incentiveAmount?: number;
};

export default function ReferralHub({ user }: Props) {
  const [activeTab, setActiveTab] = useState<ReferralSubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live Stats from Backend
  const [stats, setStats] = useState({
    totalReferrals: 0,
    submittedCount: 0,
    inProgressCount: 0,
    successfulCount: 0,
    rejectedCount: 0,
    totalIncentives: 0,
  });

  // Live Submissions List
  const [submissions, setSubmissions] = useState<ReferralItem[]>([]);

  // Submission Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState<ReferralCategory>('Credit Card');
  const [partner, setPartner] = useState('HDFC Bank');
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantCity, setApplicantCity] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);

  const partnersByCategory: Record<ReferralCategory, string[]> = {
    'Credit Card': ['HDFC Bank', 'ICICI Bank', 'SBI Card', 'Axis Bank', 'Kotak Mahindra Bank'],
    'Insurance': ['Star Health Insurance', 'HDFC ERGO', 'ICICI Lombard', 'Care Health', 'Tata AIG'],
    'Bank Account': ['HDFC Digital Account', 'ICICI Student Savings', 'SBI Yuva Savings', 'Kotak 811'],
    'Job': ['Tata Consultancy Services (TCS)', 'Zoho Corporation', 'Cognizant', 'Infosys', 'Wipro'],
  };

  const loadReferralData = useCallback(async () => {
    try {
      setLoading(true);

      const [statsRes, listRes] = await Promise.all([
        apiGet<any>('referrals/my-stats').catch(() => null),
        apiGet<any>('referrals/my-referrals').catch(() => null),
      ]);

      if (statsRes?.data) {
        const d = statsRes.data;
        setStats({
          totalReferrals: d.totalReferrals || 0,
          submittedCount: d.submittedCount || 0,
          inProgressCount: d.inProgressCount || 0,
          successfulCount: d.successfulCount || 0,
          rejectedCount: d.rejectedCount || 0,
          totalIncentives: (d.incentives?.totalPaid || 0) + (d.incentives?.totalApprovedUnpaid || 0),
        });
      }

      const rawList = Array.isArray(listRes?.data)
        ? listRes.data
        : Array.isArray(listRes)
        ? listRes
        : [];
      setSubmissions(rawList);
    } catch (err) {
      console.warn('Referrals load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReferralData();
  }, [loadReferralData]);

  const handleOpenSubmit = (cat?: ReferralCategory) => {
    const targetCat = cat || 'Credit Card';
    setCategory(targetCat);
    setPartner(partnersByCategory[targetCat][0]);
    setApplicantName('');
    setApplicantPhone('');
    setApplicantEmail('');
    setApplicantCity('');
    setConsentGiven(true);
    setModalVisible(true);
  };

  const handleSubmitReferral = async () => {
    if (!applicantName.trim()) {
      Alert.alert('Required Field', 'Please enter the applicant or candidate full name.');
      return;
    }

    const cleanPhone = applicantPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please provide a valid 10-digit mobile number.');
      return;
    }

    if (!consentGiven) {
      Alert.alert('Consent Required', 'Explicit applicant authorization is required by institutional compliance.');
      return;
    }

    try {
      setSubmitting(true);

      let payload: any = {
        category,
        formData: {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone.slice(-10),
          applicantEmail: applicantEmail.trim() || undefined,
          city: applicantCity.trim() || 'Tamil Nadu',
          partnerName: partner,
          referralSource: 'Native Mobile App',
          consentGiven: true,
        },
      };

      if (category === 'Credit Card') {
        payload.creditCardDetails = {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone.slice(-10),
          applicantEmail: applicantEmail.trim() || undefined,
          applicantCity: applicantCity.trim() || 'Chennai',
          bankName: partner,
          cardName: 'Standard Cashback Card',
          employmentType: 'Salaried',
          monthlyIncome: '₹25,000 - ₹50,000',
          referralSource: 'Native Mobile App',
          consentGiven: true,
        };
      } else if (category === 'Insurance') {
        payload.insuranceDetails = {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone.slice(-10),
          applicantEmail: applicantEmail.trim() || undefined,
          applicantCity: applicantCity.trim() || 'Chennai',
          insuranceType: 'Comprehensive Health Cover',
          provider: partner,
          sumInsuredTier: '₹5,00,000 (5 Lakhs)',
          referralSource: 'Native Mobile App',
          consentGiven: true,
        };
      } else if (category === 'Bank Account') {
        payload.bankAccountDetails = {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone.slice(-10),
          applicantEmail: applicantEmail.trim() || undefined,
          city: applicantCity.trim() || 'Chennai',
          bankName: partner,
          accountType: 'Savings Account',
          applicantType: 'Student',
          referralSource: 'Native Mobile App',
          consentGiven: true,
        };
      } else if (category === 'Job') {
        payload.jobDetails = {
          candidateName: applicantName.trim(),
          candidatePhone: cleanPhone.slice(-10),
          candidateEmail: applicantEmail.trim() || undefined,
          currentLocation: applicantCity.trim() || 'Chennai',
          companyName: partner,
          jobRole: 'Software Engineer / Graduate Trainee',
          highestQualification: 'B.E. / B.Tech',
          experienceLevel: 'Fresher (0-1 yr)',
          sector: 'IT / Software',
          referralSource: 'Native Mobile App',
          consentGiven: true,
        };
      }

      const res = await apiPost<any>('referrals', payload);

      setModalVisible(false);
      Alert.alert(
        'Referral Submitted!',
        `Your ${category} lead has been registered successfully with Reference Code: ${res?.referralCode || res?.data?.referralCode || 'REF-CONFIRMED'}. Track progress in My Submissions.`
      );

      loadReferralData();
    } catch (err: any) {
      Alert.alert(
        'Submission Notice',
        err?.message || 'Unable to submit referral. Please check connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getApplicantDisplay = (item: ReferralItem) => {
    return (
      item.creditCardDetails?.applicantName ||
      item.insuranceDetails?.applicantName ||
      item.bankAccountDetails?.applicantName ||
      item.jobDetails?.candidateName ||
      'Applicant Scholar'
    );
  };

  const getPartnerDisplay = (item: ReferralItem) => {
    return (
      item.creditCardDetails?.bankName ||
      item.insuranceDetails?.provider ||
      item.bankAccountDetails?.bankName ||
      item.jobDetails?.companyName ||
      item.category
    );
  };

  const getStatusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('approved') || s.includes('issued') || s.includes('paid') || s.includes('joined')) {
      return { bg: '#ECFDF5', text: '#059669' };
    }
    if (s.includes('reject') || s.includes('cancel')) {
      return { bg: '#FEF2F2', text: '#DC2626' };
    }
    return { bg: '#EFF6FF', text: '#2563EB' };
  };

  return (
    <View style={styles.container}>
      {/* Sub-navigation Segment Switcher */}
      <View style={styles.segmentBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'categories', label: 'Categories' },
            { id: 'submissions', label: `My Leads (${submissions.length})` },
            { id: 'rules', label: 'Incentives & Rules' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.segmentBtn, activeTab === tab.id && styles.segmentBtnActive]}
              onPress={() => setActiveTab(tab.id as ReferralSubTab)}
            >
              <Text style={[styles.segmentBtnText, activeTab === tab.id && styles.segmentBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadReferralData();
            }}
          />
        }
      >
        {/* ==================== 1. OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Incentive Banner */}
            <View style={styles.rewardBanner}>
              <View>
                <Text style={styles.rewardBannerSub}>VERIFIED CAMPUS INCENTIVES</Text>
                <Text style={styles.rewardBannerAmount}>₹{stats.totalIncentives.toLocaleString()}</Text>
                <Text style={styles.rewardBannerHint}>Total earned from successful leads</Text>
              </View>
              <TouchableOpacity style={styles.submitLeadHeaderBtn} onPress={() => handleOpenSubmit()}>
                <Text style={styles.submitLeadHeaderBtnText}>+ New Lead</Text>
              </TouchableOpacity>
            </View>

            {/* Metrics Grid */}
            <View style={styles.kpiGrid}>
              <View style={[styles.kpiCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.kpiLabel}>Total Submitted</Text>
                <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{stats.totalReferrals}</Text>
                <Text style={styles.kpiSub}>Registered Leads</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.kpiLabel}>In Progress</Text>
                <Text style={[styles.kpiValue, { color: '#D97706' }]}>{stats.inProgressCount}</Text>
                <Text style={styles.kpiSub}>Under Partner Review</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.kpiLabel}>Successful</Text>
                <Text style={[styles.kpiValue, { color: '#059669' }]}>{stats.successfulCount}</Text>
                <Text style={styles.kpiSub}>Verified & Converted</Text>
              </View>

              <View style={[styles.kpiCard, { borderLeftColor: '#8B5CF6' }]}>
                <Text style={styles.kpiLabel}>Active Categories</Text>
                <Text style={[styles.kpiValue, { color: '#7C3AED' }]}>4</Text>
                <Text style={styles.kpiSub}>Institutional Partners</Text>
              </View>
            </View>

            {/* Category Quick Navigator */}
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>💼 Available Referral Categories</Text>
              <Text style={styles.sectionSubtitle}>
                Select an institutional partner category to refer candidates or family members.
              </Text>

              {[
                { cat: 'Credit Card' as ReferralCategory, title: 'Credit Cards', icon: '💳', reward: 'Up to ₹1,200', desc: 'Pre-approved corporate & alumni bank credit cards.' },
                { cat: 'Insurance' as ReferralCategory, title: 'Health & Life Insurance', icon: '🛡️', reward: 'Up to ₹2,000', desc: 'Institutional group & family medical insurance policies.' },
                { cat: 'Bank Account' as ReferralCategory, title: 'Digital Bank Accounts', icon: '🏦', reward: 'Up to ₹500', desc: 'Zero-balance student digital savings accounts.' },
                { cat: 'Job' as ReferralCategory, title: 'Corporate Career Openings', icon: '💼', reward: 'Up to ₹5,000', desc: 'Refer eligible peers and alumni for corporate hiring drives.' },
              ].map((item, idx) => (
                <View key={idx} style={styles.categoryCardRow}>
                  <View style={styles.categoryIconCircle}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.categoryTitleRow}>
                      <Text style={styles.categoryTitle}>{item.title}</Text>
                      <View style={styles.rewardPill}>
                        <Text style={styles.rewardPillText}>{item.reward}</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryDesc}>{item.desc}</Text>
                    <TouchableOpacity
                      style={styles.categoryActionBtn}
                      onPress={() => handleOpenSubmit(item.cat)}
                    >
                      <Text style={styles.categoryActionBtnText}>Refer Applicant →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ==================== 2. CATEGORIES DEDICATED ==================== */}
        {activeTab === 'categories' && (
          <View style={styles.tabContent}>
            {[
              {
                cat: 'Credit Card' as ReferralCategory,
                title: '💳 Partner Credit Cards',
                partners: 'HDFC Bank • ICICI Bank • SBI Card • Axis Bank',
                eligibility: 'Min ₹25,000 monthly income or student co-applicant. Age 21+.',
                incentive: '₹800 - ₹1,200 per approved card',
              },
              {
                cat: 'Insurance' as ReferralCategory,
                title: '🛡️ Health & Life Insurance',
                partners: 'Star Health • HDFC ERGO • ICICI Lombard • Care Health',
                eligibility: 'All students, staff, and family relatives eligible for policies.',
                incentive: '₹1,000 - ₹2,000 per active policy issued',
              },
              {
                cat: 'Bank Account' as ReferralCategory,
                title: '🏦 Zero-Balance Bank Accounts',
                partners: 'HDFC Digital • ICICI Student Savings • SBI Yuva',
                eligibility: 'Instant digital KYC with Aadhaar & PAN verification.',
                incentive: '₹300 - ₹500 per activated account',
              },
              {
                cat: 'Job' as ReferralCategory,
                title: '💼 Campus Corporate Referrals',
                partners: 'TCS • Zoho • Cognizant • Infosys • Wipro',
                eligibility: 'Engineering / Arts graduates matching corporate requisitions.',
                incentive: '₹2,000 - ₹5,000 upon successful joining',
              },
            ].map((catItem, idx) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.cardHeaderTitle}>{catItem.title}</Text>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Partner Institutions:</Text>
                  <Text style={styles.specValue}>{catItem.partners}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Eligibility:</Text>
                  <Text style={styles.specValue}>{catItem.eligibility}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Reward Value:</Text>
                  <Text style={[styles.specValue, { color: '#059669', fontWeight: '800' }]}>{catItem.incentive}</Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => handleOpenSubmit(catItem.cat)}
                >
                  <Text style={styles.primaryBtnText}>Submit Lead for {catItem.cat}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ==================== 3. MY SUBMISSIONS ==================== */}
        {activeTab === 'submissions' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardHeaderTitle}>📋 My Referral History</Text>
                <TouchableOpacity style={styles.applyLeavePill} onPress={() => handleOpenSubmit()}>
                  <Text style={styles.applyLeavePillText}>+ Submit Lead</Text>
                </TouchableOpacity>
              </View>

              {submissions.length === 0 ? (
                <View style={styles.emptyStateBox}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginBottom: 4 }}>
                    No Referral Submissions Yet
                  </Text>
                  <Text style={styles.emptyStateText}>
                    You haven't submitted any candidate or applicant leads yet. Tap "+ Submit Lead" above to earn institutional rewards.
                  </Text>
                </View>
              ) : (
                submissions.map((item) => {
                  const statusStyling = getStatusColor(item.status);
                  return (
                    <View key={item._id} style={styles.submissionCard}>
                      <View style={styles.submissionTop}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.category}</Text>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: statusStyling.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusStyling.text }]}>
                            {item.status || 'Submitted'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.submissionName}>{getApplicantDisplay(item)}</Text>
                      <Text style={styles.submissionMeta}>
                        Partner: <Text style={{ fontWeight: '700' }}>{getPartnerDisplay(item)}</Text>
                      </Text>
                      <View style={styles.submissionFooter}>
                        <Text style={styles.submissionCode}>Ref: {item.referralCode}</Text>
                        <Text style={styles.submissionDate}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'Recent'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ==================== 4. INCENTIVES & RULES ==================== */}
        {activeTab === 'rules' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>📜 Institutional Policy & Verification Rules</Text>
              <Text style={styles.sectionSubtitle}>
                Please review institutional terms governing corporate business referrals and cash incentives.
              </Text>

              {[
                { title: '1. Explicit Applicant Consent', desc: 'Direct applicant authorization is mandatory. Unsolicited leads or fake contact submissions will result in immediate lead cancellation and portal restriction.' },
                { title: '2. 90-Day Duplicate Protection', desc: 'The referral system automatically protects leads for 90 days. If an applicant has already been submitted to the same partner within 90 days, duplicate submissions are rejected.' },
                { title: '3. Partner Verification Milestones', desc: 'Incentives are unlocked once the institutional partner confirms completion (Card activation, Account opening, First premium payment, or Candidate joining).' },
                { title: '4. Direct Bank / Institutional Credit', desc: 'Earned rewards are directly disbursed to your registered institutional account or adjusted towards semester fee dues per your preference.' },
              ].map((r, idx) => (
                <View key={idx} style={styles.ruleItem}>
                  <Text style={styles.ruleTitle}>{r.title}</Text>
                  <Text style={styles.ruleDesc}>{r.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Referral Submission Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit Business Referral Lead</Text>
            <Text style={styles.modalSubtitle}>
              Earn verified institutional incentives upon successful partner onboarding.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category Selector */}
              <Text style={styles.inputLabel}>Referral Category</Text>
              <View style={styles.categorySelectorRow}>
                {(['Credit Card', 'Insurance', 'Bank Account', 'Job'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, category === cat && styles.catChipActive]}
                    onPress={() => {
                      setCategory(cat);
                      setPartner(partnersByCategory[cat][0]);
                    }}
                  >
                    <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Partner Dropdown / Chips */}
              <Text style={styles.inputLabel}>Selected Partner / Institution</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {partnersByCategory[category].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.partnerChip, partner === p && styles.partnerChipActive]}
                    onPress={() => setPartner(p)}
                  >
                    <Text style={[styles.partnerChipText, partner === p && styles.partnerChipTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Applicant Name */}
              <Text style={styles.inputLabel}>Applicant Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Ramesh Kumar"
                value={applicantName}
                onChangeText={setApplicantName}
              />

              {/* Mobile Number */}
              <Text style={styles.inputLabel}>10-Digit Mobile Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 9840212345"
                keyboardType="phone-pad"
                maxLength={10}
                value={applicantPhone}
                onChangeText={setApplicantPhone}
              />

              {/* Email */}
              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. ramesh@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={applicantEmail}
                onChangeText={setApplicantEmail}
              />

              {/* City / Location */}
              <Text style={styles.inputLabel}>City / Location</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Chennai / Coimbatore"
                value={applicantCity}
                onChangeText={setApplicantCity}
              />

              {/* Consent Toggle */}
              <TouchableOpacity
                style={styles.consentRow}
                onPress={() => setConsentGiven(!consentGiven)}
              >
                <View style={[styles.checkbox, consentGiven && styles.checkboxActive]}>
                  {consentGiven ? <Text style={styles.checkboxCheck}>✓</Text> : null}
                </View>
                <Text style={styles.consentText}>
                  I confirm that I have obtained express consent from the applicant to share their contact details for this inquiry.
                </Text>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmit, submitting && styles.btnDisabled]}
                  onPress={handleSubmitReferral}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit Verified Lead</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  segmentBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  segmentScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  segmentBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  segmentBtnActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  tabContent: {
    gap: 14,
  },
  rewardBanner: {
    backgroundColor: '#1E3A8A',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rewardBannerSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  rewardBannerAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 2,
  },
  rewardBannerHint: {
    fontSize: 11,
    color: '#BFDBFE',
  },
  submitLeadHeaderBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  submitLeadHeaderBtnText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 18,
  },
  categoryCardRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rewardPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rewardPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  categoryDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  categoryActionBtn: {
    alignSelf: 'flex-start',
  },
  categoryActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: '60%',
    textAlign: 'right',
  },
  primaryBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  applyLeavePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  applyLeavePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  submissionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submissionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  submissionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  submissionMeta: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  submissionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  submissionCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  submissionDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  ruleItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  ruleDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  emptyStateBox: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginVertical: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  categorySelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  catChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  partnerChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  partnerChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  partnerChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  partnerChipTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  consentText: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmit: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#1E3A8A',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
