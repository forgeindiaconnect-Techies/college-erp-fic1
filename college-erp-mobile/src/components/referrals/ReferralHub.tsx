import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, type MobileUser } from '../../services/api';
import CreditCardReferralForm from './CreditCardReferralForm';
import InsuranceReferralForm from './InsuranceReferralForm';
import JobReferralForm from './JobReferralForm';
import BankAccountReferralForm from './BankAccountReferralForm';
import ReferralSuccessModal from './ReferralSuccessModal';
import ReferralDetailModal from './ReferralDetailModal';
import IncentivePayoutModal from './IncentivePayoutModal';

export type ReferralCategory = 'Credit Card' | 'Insurance' | 'Bank Account' | 'Job';
type ActiveScreen = 'home' | 'category' | 'submissions' | 'rules' | 'leaderboard';
type CategoryTab = 'overview' | 'offers' | 'refer';

interface Props {
  user: MobileUser;
  initialCategory?: ReferralCategory;
  initialScreen?: ActiveScreen;
  onBack?: () => void;
}

export default function ReferralHub({ user, initialCategory, initialScreen = 'home', onBack }: Props) {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(initialCategory ? 'category' : initialScreen);
  const [selectedCategory, setSelectedCategory] = useState<ReferralCategory>(initialCategory || 'Credit Card');
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('overview');

  // Pre-fill parameters when user taps "Refer" on an offer
  const [selectedOfferBank, setSelectedOfferBank] = useState<string>('');
  const [selectedOfferProduct, setSelectedOfferProduct] = useState<string>('');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalReferrals: 0,
    submittedCount: 0,
    inProgressCount: 0,
    successfulCount: 0,
    rejectedCount: 0,
    totalIncentives: 0,
  });

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [adminAllSubmissions, setAdminAllSubmissions] = useState<any[]>([]);
  const [showAdminAll, setShowAdminAll] = useState(false);
  const [rules, setRules] = useState<any[]>([]);
  const [formConfigs, setFormConfigs] = useState<Record<string, any>>({});
  const [publishedOpportunities, setPublishedOpportunities] = useState<any[]>([]);

  // Top Performers State
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [topPerformersStats, setTopPerformersStats] = useState({
    totalPerformers: 0,
    totalVerifiedReferrals: 0,
    totalEarnedIncentives: 0,
  });
  const [perfSearchQuery, setPerfSearchQuery] = useState('');

  // Modals
  const [lastSubmittedReferral, setLastSubmittedReferral] = useState<any | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [payoutModalItem, setPayoutModalItem] = useState<any | null>(null);

  // Filters
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('All');
  const [subStatusFilter, setSubStatusFilter] = useState('All');
  const [offerSearchQuery, setOfferSearchQuery] = useState('');

  const isAdminRole = [
    'admin',
    'super admin',
    'sub admin',
    'principal',
    'accounts',
  ].includes((user.role || '').toLowerCase().trim());

  // --------------------------------------------------------------------------
  // Data Loader
  // --------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const fetchPromises: Promise<any>[] = [
        apiGet<any>('referrals/my-stats').catch(() => null),
        apiGet<any>('referrals/my-referrals').catch(() => null),
        apiGet<any>('referrals/rules').catch(() => null),
        apiGet<any>('referrals/config/public/Credit Card').catch(() => null),
        apiGet<any>('referrals/config/public/Insurance').catch(() => null),
        apiGet<any>('referrals/config/public/Bank Account').catch(() => null),
        apiGet<any>('referrals/config/public/Job').catch(() => null),
        apiGet<any>('opportunities/published').catch(() => null),
        apiGet<any>('referrals/top-performers').catch(() => null),
      ];

      if (isAdminRole) {
        fetchPromises.push(apiGet<any>('referrals').catch(() => null));
      }

      const results = await Promise.all(fetchPromises);
      const [
        statsRes,
        listRes,
        rulesRes,
        ccConfigRes,
        insConfigRes,
        baConfigRes,
        jobConfigRes,
        oppsRes,
        topPerformersRes,
        adminListRes,
      ] = results;

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

      if (adminListRes) {
        const rawAdminList = Array.isArray(adminListRes?.data)
          ? adminListRes.data
          : Array.isArray(adminListRes)
          ? adminListRes
          : [];
        setAdminAllSubmissions(rawAdminList);
      }

      const rawRules = Array.isArray(rulesRes?.data)
        ? rulesRes.data
        : Array.isArray(rulesRes)
        ? rulesRes
        : [];
      setRules(rawRules);

      const configsMap: Record<string, any> = {};
      if (ccConfigRes?.data) configsMap['Credit Card'] = ccConfigRes.data;
      if (insConfigRes?.data) configsMap['Insurance'] = insConfigRes.data;
      if (baConfigRes?.data) configsMap['Bank Account'] = baConfigRes.data;
      if (jobConfigRes?.data) configsMap['Job'] = jobConfigRes.data;
      setFormConfigs(configsMap);

      const rawOpps = Array.isArray(oppsRes?.data)
        ? oppsRes.data
        : Array.isArray(oppsRes)
        ? oppsRes
        : [];
      setPublishedOpportunities(rawOpps);

      if (topPerformersRes) {
        const d = topPerformersRes.data;
        const pList = Array.isArray(d?.data)
          ? d.data
          : Array.isArray(d)
          ? d
          : Array.isArray(topPerformersRes)
          ? topPerformersRes
          : [];
        setTopPerformers(pList);
        if (d?.stats) {
          setTopPerformersStats(d.stats);
        } else if (topPerformersRes.stats) {
          setTopPerformersStats(topPerformersRes.stats);
        }
      }
    } catch (err) {
      console.warn('Referrals load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdminRole]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Handler when referral form succeeds
  const handleReferralSuccess = (createdReferral: any) => {
    setLastSubmittedReferral(createdReferral);
    loadData();
  };

  const handleOpenCategory = (cat: ReferralCategory, tab: CategoryTab = 'overview') => {
    setSelectedCategory(cat);
    setCategoryTab(tab);
    setCurrentScreen('category');
    setSelectedOfferBank('');
    setSelectedOfferProduct('');
  };

  const handleSelectOfferToRefer = (partner: string, product: string, cat: ReferralCategory) => {
    setSelectedCategory(cat);
    setSelectedOfferBank(partner);
    setSelectedOfferProduct(product);
    setCategoryTab('refer');
    setCurrentScreen('category');
  };

  // Filter Submissions
  const activeSubmissionsList = showAdminAll && isAdminRole ? adminAllSubmissions : submissions;

  const filteredSubmissions = useMemo(() => {
    return activeSubmissionsList.filter((item) => {
      if (subCategoryFilter !== 'All' && item.category !== subCategoryFilter) return false;
      if (subStatusFilter !== 'All') {
        const s = (item.status || '').toLowerCase();
        const f = subStatusFilter.toLowerCase();
        if (f === 'approved' && !s.includes('approved') && !s.includes('issued') && !s.includes('joined') && !s.includes('activated')) return false;
        if (f === 'in progress' && !s.includes('review') && !s.includes('progress') && !s.includes('interview') && !s.includes('kyc')) return false;
        if (f === 'rejected' && !s.includes('reject') && !s.includes('cancel')) return false;
        if (f === 'submitted' && s !== 'submitted') return false;
      }
      if (subSearchQuery.trim()) {
        const q = subSearchQuery.toLowerCase();
        const code = (item.referralCode || '').toLowerCase();
        const name = (
          item.creditCardDetails?.applicantName ||
          item.insuranceDetails?.applicantName ||
          item.bankAccountDetails?.applicantName ||
          item.jobDetails?.candidateName ||
          item.formData?.applicantName ||
          ''
        ).toLowerCase();
        const partner = (
          item.creditCardDetails?.bankName ||
          item.insuranceDetails?.provider ||
          item.bankAccountDetails?.bankName ||
          item.jobDetails?.companyName ||
          item.partnerName ||
          ''
        ).toLowerCase();
        return code.includes(q) || name.includes(q) || partner.includes(q);
      }
      return true;
    });
  }, [activeSubmissionsList, subCategoryFilter, subStatusFilter, subSearchQuery]);

  const getStatusBadgeStyle = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('approved') || s.includes('issued') || s.includes('joined') || s.includes('activated') || s.includes('success')) {
      return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
    }
    if (s.includes('reject') || s.includes('cancel')) {
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
    }
    if (s.includes('review') || s.includes('progress') || s.includes('interview') || s.includes('kyc')) {
      return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
    }
    return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
  };

  const getInitials = (name?: string) => {
    if (!name) return 'RP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const filteredPerformers = useMemo(() => {
    return topPerformers.filter((p) => {
      if (!perfSearchQuery.trim()) return true;
      const q = perfSearchQuery.toLowerCase().trim();
      const name = (p.name || '').toLowerCase();
      const role = (p.role || '').toLowerCase();
      const dept = (p.department || '').toLowerCase();
      return name.includes(q) || role.includes(q) || dept.includes(q);
    });
  }, [topPerformers, perfSearchQuery]);

  // --------------------------------------------------------------------------
  // Default Catalog Offerings
  // --------------------------------------------------------------------------
  const categoryOffers = useMemo(() => {
    if (selectedCategory === 'Credit Card') {
      return [
        {
          id: 'cc-1',
          partnerName: 'HDFC Bank',
          title: 'Millennia Cashback Credit Card',
          categoryTag: 'Cashback & Digital Spends',
          reward: '₹2,500',
          turnaround: '2-3 Business Days',
          annualFee: '₹1,000 (Waived on ₹1L Spend)',
          perks: '5% Amazon & Flipkart Cashback, 1% All Offline Spends, 8 Complimentary Airport Lounge Visits/yr.',
          eligibility: 'Salaried individuals with ₹25,000+ monthly net salary or self-employed with valid ITR.',
        },
        {
          id: 'cc-2',
          partnerName: 'ICICI Bank',
          title: 'Amazon Pay ICICI Credit Card',
          categoryTag: 'Lifetime Free',
          reward: '₹2,000',
          turnaround: 'Instant Video KYC',
          annualFee: 'Lifetime Free (Zero Annual Fee)',
          perks: '5% Unlimited Amazon Pay Cashback, 2% Bill Payments & Recharge, Zero joining fee.',
          eligibility: 'Students with existing savings account or salaried professionals.',
        },
        {
          id: 'cc-3',
          partnerName: 'State Bank of India',
          title: 'SimplyCLICK SBI Card',
          categoryTag: 'Online Shopping',
          reward: '₹1,800',
          turnaround: '3-4 Business Days',
          annualFee: '₹499 (Waived on ₹1L Spend)',
          perks: '10X Reward Points on partner merchants (Cleartrip, BookMyShow), 1% Fuel Surcharge Waiver.',
          eligibility: 'Salaried employees & faculty members aged 21-60.',
        },
        {
          id: 'cc-4',
          partnerName: 'Axis Bank',
          title: 'ACE Cashback Credit Card',
          categoryTag: 'Utility & Bill Payments',
          reward: '₹2,200',
          turnaround: '2-4 Business Days',
          annualFee: '₹499 (Waived on ₹2L Spend)',
          perks: '5% Cashback on Google Pay bill payments, 4% Swiggy & Zomato, 2% unlimited all spends.',
          eligibility: 'Salaried/Self-employed with regular monthly income.',
        },
      ];
    } else if (selectedCategory === 'Insurance') {
      return [
        {
          id: 'ins-1',
          partnerName: 'Star Health & Allied Insurance',
          title: 'Comprehensive Family Floater Plan',
          categoryTag: 'Health & Hospitalization',
          reward: '₹5,000',
          turnaround: 'Same-Day Digital Issuance',
          annualFee: 'Annual Renewable Policy',
          perks: 'No Room Rent Capping, Hospital Cash benefit, Air Ambulance cover, Day 1 newborn coverage.',
          eligibility: 'Individuals and families aged 18 to 65 years. Medical test waived up to 50 years.',
        },
        {
          id: 'ins-2',
          partnerName: 'HDFC ERGO General Insurance',
          title: 'Optima Secure Hospitalization Shield',
          categoryTag: 'Comprehensive Health',
          reward: '₹4,500',
          turnaround: 'Instant Policy PDF',
          annualFee: 'Annual / Multi-Year Cover',
          perks: '4X Coverage multiplier from Day 1, Zero deductions on non-medical items, cashless at 13,000+ hospitals.',
          eligibility: 'Campus students, faculty, and immediate families with cashless digital claim support.',
        },
        {
          id: 'ins-3',
          partnerName: 'ICICI Lombard General Insurance',
          title: 'Comprehensive Car Protect (Zero-Dep)',
          categoryTag: 'Motor & Vehicle',
          reward: '₹1,500',
          turnaround: 'Instant Online Policy',
          annualFee: 'Annual Vehicle Insurance',
          perks: 'Zero Depreciation bumper-to-bumper cover, 24x7 Roadside Assistance, engine protect add-on.',
          eligibility: 'Valid RC & driving license for private two-wheelers and four-wheelers.',
        },
        {
          id: 'ins-4',
          partnerName: 'Tata AIG General Insurance',
          title: 'Click 2 Protect Super (Term Life)',
          categoryTag: 'Pure Term Protection',
          reward: '₹4,000',
          turnaround: '3-5 Days Underwriting',
          annualFee: 'Long-term Annual Premium',
          perks: '₹1 Crore Life Cover from ₹650/month, Critical Illness acceleration rider, terminal illness payout.',
          eligibility: 'Age 18-65 with verified income documents and PAN card.',
        },
      ];
    } else if (selectedCategory === 'Job') {
      return [
        {
          id: 'job-1',
          partnerName: 'Tata Consultancy Services (TCS)',
          title: 'Associate Software Engineer',
          categoryTag: 'IT / Software',
          reward: '₹5,000',
          turnaround: 'Direct Interview Call',
          annualFee: 'Permanent Full-time Role',
          perks: 'Global career mobility, TCS digital certification incentive, comprehensive health cover for family.',
          eligibility: 'B.E./B.Tech, MCA, or M.Sc Computer Science with minimum 60% aggregate and strong CS fundamentals.',
        },
        {
          id: 'job-2',
          partnerName: 'Infosys Limited',
          title: 'Full Stack Web Developer',
          categoryTag: 'Cloud & Modern Web',
          reward: '₹6,000',
          turnaround: 'Technical Round in 3 Days',
          annualFee: 'Full-time Tech Track',
          perks: 'Hybrid work options, annual performance appraisal, world-class Mysore training campus.',
          eligibility: '0-3 years hands-on experience in React, Node.js, Python, or Java enterprise architecture.',
        },
        {
          id: 'job-3',
          partnerName: 'HDFC Bank Ltd',
          title: 'Relationship Manager - Retail Banking',
          categoryTag: 'Banking & Financial Services',
          reward: '₹4,000',
          turnaround: 'Branch Interview in 4 Days',
          annualFee: 'Permanent Banking Career',
          perks: 'Quarterly sales incentives, subsidized corporate staff loans, comprehensive mediclaim.',
          eligibility: 'MBA / PGDM, B.Com, or BBA with excellent communication skills and customer acquisition drive.',
        },
        {
          id: 'job-4',
          partnerName: 'Larsen & Toubro (L&T)',
          title: 'Graduate Engineer Trainee (GET)',
          categoryTag: 'Core Engineering',
          reward: '₹5,000',
          turnaround: 'Fast-Track Technical Review',
          annualFee: 'Permanent Core Track',
          perks: 'Prestigious infrastructure mega-projects exposure, sponsored higher education programs.',
          eligibility: 'Civil, Mechanical, or Electrical Engineering graduates with high academic standing.',
        },
      ];
    } else {
      return [
        {
          id: 'ba-1',
          partnerName: 'HDFC Bank',
          title: 'Campus Zero-Balance Student Savings',
          categoryTag: 'Student Digital Banking',
          reward: '₹750',
          turnaround: '10-Minute Video KYC',
          annualFee: 'Zero Maintenance Balance',
          perks: 'Free International Platinum Debit Card, ₹1 Lakh accident insurance, zero minimum balance penalty forever.',
          eligibility: 'Bonafide college students with valid student ID card and Aadhaar linked to mobile.',
        },
        {
          id: 'ba-2',
          partnerName: 'ICICI Bank',
          title: 'Campus Faculty & Staff Salary Account',
          categoryTag: 'Institutional Payroll',
          reward: '₹1,000',
          turnaround: 'Instant Account Activation',
          annualFee: 'Lifetime Free Salary Suite',
          perks: 'Preferential personal loan rates, complimentary ₹30 Lakh air accident cover, zero fee demand drafts.',
          eligibility: 'Campus teaching, administrative, and operations personnel with direct monthly salary credits.',
        },
        {
          id: 'ba-3',
          partnerName: 'State Bank of India',
          title: 'Standard Institutional Savings Account',
          categoryTag: 'National Banking',
          reward: '₹500',
          turnaround: 'Instant YONO Account',
          annualFee: 'Zero Service Charges',
          perks: 'Nationwide branch accessibility, YONO instant UPI and digital investments, high safety assurance.',
          eligibility: 'Any individual aged 18+ with valid Aadhaar and PAN card.',
        },
        {
          id: 'ba-4',
          partnerName: 'Axis Bank',
          title: 'Campus Vendor & Contractor Commercial Account',
          categoryTag: 'Current & Merchant',
          reward: '₹1,200',
          turnaround: 'Doorstep Documentation',
          annualFee: 'Low Average Balance Tier',
          perks: 'Free digital cash management (CMS), zero fee NEFT/RTGS, Soundbox POS integration.',
          eligibility: 'Campus canteen operators, transport fleet operators, stationery & book store vendors.',
        },
      ];
    }
  }, [selectedCategory]);

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {currentScreen !== 'home' ? (
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => {
                if (currentScreen === 'category' && categoryTab !== 'overview') {
                  setCategoryTab('overview');
                } else {
                  setCurrentScreen('home');
                }
              }}
            >
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          ) : onBack ? (
            <TouchableOpacity style={styles.backButton} activeOpacity={0.7} onPress={onBack}>
              <Text style={styles.backButtonText}>← Exit</Text>
            </TouchableOpacity>
          ) : null}

          <View>
            <Text style={styles.topBarTitle}>Business Referral Hub</Text>
            <Text style={styles.topBarSubtitle}>
              {currentScreen === 'home'
                ? 'Authorized Institutional Partner Program'
                : currentScreen === 'category'
                ? selectedCategory
                : currentScreen === 'submissions'
                ? 'Referral Tracking & Audit'
                : currentScreen === 'leaderboard'
                ? 'Campus Referral Leaderboard'
                : 'Program Guidelines & Rewards'}
            </Text>
          </View>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{user.role || 'Member'}</Text>
        </View>
      </View>

      {/* Main Tab Navigation */}
      <View style={styles.mainTabBar}>
        <TouchableOpacity
          style={[styles.mainTabBtn, currentScreen === 'home' && styles.mainTabBtnActive]}
          activeOpacity={0.7}
          onPress={() => setCurrentScreen('home')}
        >
          <Text style={[styles.mainTabBtnText, currentScreen === 'home' && styles.mainTabBtnTextActive]}>
            🏢 Categories
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, currentScreen === 'submissions' && styles.mainTabBtnActive]}
          activeOpacity={0.7}
          onPress={() => setCurrentScreen('submissions')}
        >
          <Text style={[styles.mainTabBtnText, currentScreen === 'submissions' && styles.mainTabBtnTextActive]}>
            📋 Submissions
          </Text>
          {submissions.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{submissions.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, currentScreen === 'rules' && styles.mainTabBtnActive]}
          activeOpacity={0.7}
          onPress={() => setCurrentScreen('rules')}
        >
          <Text style={[styles.mainTabBtnText, currentScreen === 'rules' && styles.mainTabBtnTextActive]}>
            📜 Incentives
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, currentScreen === 'leaderboard' && styles.mainTabBtnActive]}
          activeOpacity={0.7}
          onPress={() => setCurrentScreen('leaderboard')}
        >
          <Text style={[styles.mainTabBtnText, currentScreen === 'leaderboard' && styles.mainTabBtnTextActive]}>
            🏆 Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          SCREEN 1: CATEGORIES OVERVIEW (HUB HOME)
      ========================================================================= */}
      {currentScreen === 'home' && (
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Hero Banner */}
          <View style={styles.heroCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTag}>VERIFIED INSTITUTIONAL PARTNERSHIPS</Text>
              <Text style={styles.heroTitle}>Refer & Unlock Cash Rewards</Text>
              <Text style={styles.heroDesc}>
                Connect scholars, staff, and family members to accredited banking, insurance, career, and credit services with end-to-end DPDP consent security.
              </Text>
            </View>
          </View>

          {/* Metric Highlights */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>{stats.totalReferrals}</Text>
              <Text style={styles.metricLabel}>Total Submitted</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#15803D' }]}>{stats.successfulCount}</Text>
              <Text style={styles.metricLabel}>Approved</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>₹{stats.totalIncentives.toLocaleString('en-IN')}</Text>
              <Text style={styles.metricLabel}>Verified Payouts</Text>
            </View>
          </View>

          <Text style={styles.sectionHeaderTitle}>Select Referral Category</Text>
          <Text style={styles.sectionHeaderSub}>Each category features a dedicated workflow, fields, and rewards</Text>

          {/* 4 Category Cards */}
          {[
            {
              cat: 'Credit Card' as ReferralCategory,
              title: 'Credit Cards',
              desc: 'Pre-approved lifetime-free cards, fuel & travel cards from top banks',
              icon: '💳',
              badge: 'Up to ₹2,500',
              bgColor: '#EFF6FF',
              borderColor: '#BFDBFE',
              partners: 'HDFC, ICICI, SBI, Axis, Kotak',
            },
            {
              cat: 'Insurance' as ReferralCategory,
              title: 'Insurance Policies',
              desc: 'Comprehensive campus mediclaim, family health & motor coverage',
              icon: '🛡️',
              badge: 'Up to ₹5,000',
              bgColor: '#ECFDF5',
              borderColor: '#A7F3D0',
              partners: 'Star Health, HDFC ERGO, ICICI Lombard, Tata AIG',
            },
            {
              cat: 'Job' as ReferralCategory,
              title: 'Job Candidate Referrals',
              desc: 'Corporate hiring, tech engineering & campus placement roles',
              icon: '💼',
              badge: 'Placement Bonus',
              bgColor: '#F5F3FF',
              borderColor: '#DDD6FE',
              partners: 'TCS, Infosys, Wipro, CTS, Deloitte, L&T',
            },
            {
              cat: 'Bank Account' as ReferralCategory,
              title: 'Bank Accounts',
              desc: 'Zero-balance student accounts & corporate faculty salary suites',
              icon: '🏛️',
              badge: 'Up to ₹750',
              bgColor: '#FFFBEB',
              borderColor: '#FDE68A',
              partners: 'HDFC Bank, ICICI Bank, SBI, Axis Bank',
            },
          ].map((item) => (
            <TouchableOpacity
              key={item.cat}
              style={[styles.categoryCard, { backgroundColor: item.bgColor, borderColor: item.borderColor }]}
              activeOpacity={0.8}
              onPress={() => handleOpenCategory(item.cat, 'overview')}
            >
              <View style={styles.categoryCardTop}>
                <View style={styles.categoryIconCircle}>
                  <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.categoryCardTitle}>{item.title}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.categoryCardDesc}>{item.desc}</Text>
                  <Text style={styles.categoryPartnerText}>Partners: {item.partners}</Text>
                </View>
              </View>

              <View style={styles.categoryCardFooter}>
                <Text style={styles.categoryCardActionText}>Open Category Hub →</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Top Referral Performers Section (Mobile Native Spotlight) */}
          <View style={styles.perfSectionContainer}>
            <View style={styles.perfSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🏆</Text>
                <View>
                  <Text style={styles.perfSectionTitle}>Top Referral Performers</Text>
                  <Text style={styles.perfSectionSub}>Campus ranking based on verified milestones</Text>
                </View>
              </View>
              {topPerformers.length > 0 && (
                <TouchableOpacity
                  onPress={() => setCurrentScreen('leaderboard')}
                  style={styles.perfViewAllBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.perfViewAllBtnText}>Leaderboard →</Text>
                </TouchableOpacity>
              )}
            </View>

            {topPerformers.length === 0 ? (
              <View style={styles.perfEmptyCard}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>🌟</Text>
                <Text style={styles.perfEmptyTitle}>No Verified Performers Yet</Text>
                <Text style={styles.perfEmptySub}>Submit approved referrals across banking, cards & insurance to claim the #1 rank!</Text>
              </View>
            ) : (
              topPerformers.slice(0, 3).map((performer, idx) => {
                const rankNum = performer.rank || idx + 1;
                const isFirst = rankNum === 1;
                const isSecond = rankNum === 2;
                const isThird = rankNum === 3;
                const medal = isFirst ? '🥇 #1' : isSecond ? '🥈 #2' : isThird ? '🥉 #3' : `#${rankNum}`;

                const badgeBg = isFirst ? '#FEF3C7' : isSecond ? '#F1F5F9' : isThird ? '#FFEDD5' : '#EFF6FF';
                const badgeBorder = isFirst ? '#FCD34D' : isSecond ? '#CBD5E1' : isThird ? '#FDBA74' : '#BFDBFE';
                const badgeText = isFirst ? '#B45309' : isSecond ? '#475569' : isThird ? '#C2410C' : '#1D4ED8';

                const avatarBg = isFirst ? '#D97706' : isSecond ? '#475569' : isThird ? '#EA580C' : '#2563EB';

                return (
                  <View key={performer.userId || idx} style={styles.perfCard}>
                    {/* Top Row: Rank & Success Badge */}
                    <View style={styles.perfCardHeader}>
                      <View style={[styles.perfRankBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                        <Text style={[styles.perfRankBadgeText, { color: badgeText }]}>{medal}</Text>
                      </View>
                      <View style={styles.perfVerifiedBadge}>
                        <Text style={styles.perfVerifiedBadgeText}>✓ {performer.successfulReferrals} Verified</Text>
                      </View>
                    </View>

                    {/* Middle Row: Avatar & Name */}
                    <View style={styles.perfCardProfileRow}>
                      <View style={[styles.perfAvatar, { backgroundColor: avatarBg }]}>
                        <Text style={styles.perfAvatarText}>{getInitials(performer.name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.perfNameText}>{performer.name}</Text>
                        <Text style={styles.perfRoleText}>
                          {performer.role || 'Member'} • {performer.department || 'Campus'}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Row: Metrics Strip */}
                    <View style={styles.perfMetricsStrip}>
                      <View>
                        <Text style={styles.perfMetricSub}>EARNED INCENTIVE</Text>
                        <Text style={styles.perfMetricVal}>₹{Number(performer.earnedIncentive || 0).toLocaleString('en-IN')}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.perfMetricSub}>STATUS</Text>
                        <Text style={[styles.perfMetricStatus, { color: performer.paidIncentive > 0 ? '#1D4ED8' : '#D97706' }]}>
                          {performer.paidIncentive > 0 ? `Paid: ₹${performer.paidIncentive}` : 'Verified & Queued'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* =========================================================================
          SCREEN 2: CATEGORY DETAIL & SPECIFIC FORM
      ========================================================================= */}
      {currentScreen === 'category' && (
        <View style={{ flex: 1 }}>
          {/* Category Switcher Tabs */}
          <View style={styles.subCategoryTabBar}>
            {(['Credit Card', 'Insurance', 'Job', 'Bank Account'] as ReferralCategory[]).map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.subCategoryTabBtn, isSelected && styles.subCategoryTabBtnActive]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setCategoryTab('overview');
                  }}
                >
                  <Text style={[styles.subCategoryTabBtnText, isSelected && styles.subCategoryTabBtnTextActive]}>
                    {cat === 'Credit Card' ? '💳 Cards' : cat === 'Insurance' ? '🛡️ Insurance' : cat === 'Job' ? '💼 Jobs' : '🏛️ Banking'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sub-Tabs: Overview | Offers | Refer */}
          <View style={styles.categoryViewTabBar}>
            <TouchableOpacity
              style={[styles.categoryViewTabBtn, categoryTab === 'overview' && styles.categoryViewTabBtnActive]}
              activeOpacity={0.7}
              onPress={() => setCategoryTab('overview')}
            >
              <Text style={[styles.categoryViewTabBtnText, categoryTab === 'overview' && styles.categoryViewTabBtnTextActive]}>
                📌 Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryViewTabBtn, categoryTab === 'offers' && styles.categoryViewTabBtnActive]}
              activeOpacity={0.7}
              onPress={() => setCategoryTab('offers')}
            >
              <Text style={[styles.categoryViewTabBtnText, categoryTab === 'offers' && styles.categoryViewTabBtnTextActive]}>
                🔍 Offers ({categoryOffers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryViewTabBtn, categoryTab === 'refer' && styles.categoryViewTabBtnActive]}
              activeOpacity={0.7}
              onPress={() => setCategoryTab('refer')}
            >
              <Text style={[styles.categoryViewTabBtnText, categoryTab === 'refer' && styles.categoryViewTabBtnTextActive]}>
                ✍️ Refer Now
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB CONTENT: 1. OVERVIEW */}
          {categoryTab === 'overview' && (
            <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <View style={styles.programCard}>
                <Text style={styles.programHeader}>{selectedCategory} Program Overview</Text>
                <Text style={styles.programSubtitle}>
                  Institutional referral facilitation with approved underwriters & banking partners
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ELIGIBLE REFERRERS</Text>
                  <Text style={styles.infoValue}>Staff, Faculty, Students, Alumni, Registered Parents & Drivers</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>VERIFICATION SPEED</Text>
                  <Text style={styles.infoValue}>2 - 4 business days upon document verification</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>DATA PRIVACY</Text>
                  <Text style={styles.infoValue}>Full DPDP & institutional regulatory compliance with explicit consent</Text>
                </View>

                <TouchableOpacity
                  style={styles.applyNowBtn}
                  activeOpacity={0.8}
                  onPress={() => setCategoryTab('refer')}
                >
                  <Text style={styles.applyNowBtnText}>✍️ Apply / Refer Someone Now →</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Perks Section */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Why Refer via Campus ERP?</Text>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>Higher approval rates via institutional corporate partner desks</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>Direct milestone-based cash reward credits to your bank account</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>Zero duplicate lead collisions with 90-day anti-tamper lock</Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* TAB CONTENT: 2. OFFERS */}
          {categoryTab === 'offers' && (
            <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
              <Text style={styles.sectionHeaderTitle}>Approved Products Directory</Text>
              <Text style={styles.sectionHeaderSub}>Select any offer to auto-populate the referral form</Text>

              {categoryOffers.map((item) => (
                <View key={item.id} style={styles.offerCard}>
                  <View style={styles.offerCardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.offerPartner}>{item.partnerName}</Text>
                      <Text style={styles.offerTitle}>{item.title}</Text>
                    </View>
                    <View style={styles.offerRewardBadge}>
                      <Text style={styles.offerRewardText}>{item.reward}</Text>
                      <Text style={styles.offerRewardSub}>Reward</Text>
                    </View>
                  </View>

                  <View style={styles.offerPillRow}>
                    <View style={styles.offerPill}>
                      <Text style={styles.offerPillText}>{item.categoryTag}</Text>
                    </View>
                    <View style={styles.offerPill}>
                      <Text style={styles.offerPillText}>⚡ {item.turnaround}</Text>
                    </View>
                  </View>

                  <Text style={styles.offerPerksText}>{item.perks}</Text>

                  <TouchableOpacity
                    style={styles.offerActionBtn}
                    activeOpacity={0.8}
                    onPress={() => handleSelectOfferToRefer(item.partnerName, item.title, selectedCategory)}
                  >
                    <Text style={styles.offerActionBtnText}>Refer This Product →</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* TAB CONTENT: 3. DEDICATED SEPARATE FORMS */}
          {categoryTab === 'refer' && (
            <View style={{ flex: 1 }}>
              {selectedCategory === 'Credit Card' && (
                <CreditCardReferralForm
                  user={user}
                  formConfig={formConfigs['Credit Card']}
                  defaultBank={selectedOfferBank || 'HDFC Bank'}
                  defaultProduct={selectedOfferProduct}
                  onSuccess={handleReferralSuccess}
                  onCancel={() => setCategoryTab('overview')}
                />
              )}

              {selectedCategory === 'Insurance' && (
                <InsuranceReferralForm
                  user={user}
                  formConfig={formConfigs['Insurance']}
                  defaultProvider={selectedOfferBank || 'Star Health & Allied Insurance'}
                  defaultPlan={selectedOfferProduct}
                  onSuccess={handleReferralSuccess}
                  onCancel={() => setCategoryTab('overview')}
                />
              )}

              {selectedCategory === 'Job' && (
                <JobReferralForm
                  user={user}
                  formConfig={formConfigs['Job']}
                  defaultCompany={selectedOfferBank}
                  defaultRole={selectedOfferProduct}
                  onSuccess={handleReferralSuccess}
                  onCancel={() => setCategoryTab('overview')}
                />
              )}

              {selectedCategory === 'Bank Account' && (
                <BankAccountReferralForm
                  user={user}
                  formConfig={formConfigs['Bank Account']}
                  defaultBank={selectedOfferBank || 'HDFC Bank'}
                  defaultProduct={selectedOfferProduct}
                  onSuccess={handleReferralSuccess}
                  onCancel={() => setCategoryTab('overview')}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* =========================================================================
          SCREEN 3: MY SUBMISSIONS (LIVE BACKEND REGISTRY)
      ========================================================================= */}
      {currentScreen === 'submissions' && (
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Admin Switcher Toggle (If Admin) */}
          {isAdminRole && (
            <View style={styles.adminToggleBox}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.adminToggleTitle}>Admin Review Workflow</Text>
                <Text style={styles.adminToggleSubtitle}>
                  {showAdminAll ? 'Viewing all institutional submissions' : 'Viewing personal submissions'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.adminToggleBtn, showAdminAll && styles.adminToggleBtnActive]}
                activeOpacity={0.7}
                onPress={() => setShowAdminAll(!showAdminAll)}
              >
                <Text style={[styles.adminToggleBtnText, showAdminAll && styles.adminToggleBtnTextActive]}>
                  {showAdminAll ? 'All Submissions' : 'My Referrals'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Text style={{ fontSize: 16, marginRight: 8, color: '#64748B' }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Reference Code, Applicant, Partner..."
              placeholderTextColor="#94A3B8"
              value={subSearchQuery}
              onChangeText={setSubSearchQuery}
            />
            {subSearchQuery ? (
              <TouchableOpacity onPress={() => setSubSearchQuery('')}>
                <Text style={{ fontSize: 14, color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Category Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {['All', 'Credit Card', 'Insurance', 'Job', 'Bank Account'].map((c) => {
              const active = subCategoryFilter === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSubCategoryFilter(c)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Status Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {['All', 'Submitted', 'In Progress', 'Approved', 'Rejected'].map((s) => {
              const active = subStatusFilter === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChipSmall, active && styles.filterChipSmallActive]}
                  onPress={() => setSubStatusFilter(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipSmallText, active && styles.filterChipSmallTextActive]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List of Submissions */}
          {loading && !refreshing ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator color="#2563EB" size="large" />
              <Text style={{ marginTop: 12, fontSize: 13, color: '#64748B' }}>Loading submissions...</Text>
            </View>
          ) : filteredSubmissions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
              <Text style={styles.emptyTitle}>No Submissions Found</Text>
              <Text style={styles.emptySubtitle}>
                {subSearchQuery || subCategoryFilter !== 'All'
                  ? 'No referrals match your current filters.'
                  : 'You have not submitted any referrals yet. Select a category to begin!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCurrentScreen('home')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyActionBtnText}>Browse Categories →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredSubmissions.map((item) => {
              const statusStyle = getStatusBadgeStyle(item.status);
              const applicantName =
                item.creditCardDetails?.applicantName ||
                item.insuranceDetails?.applicantName ||
                item.bankAccountDetails?.applicantName ||
                item.jobDetails?.candidateName ||
                item.formData?.applicantName ||
                'Applicant';

              const partner =
                item.creditCardDetails?.bankName ||
                item.insuranceDetails?.provider ||
                item.bankAccountDetails?.bankName ||
                item.jobDetails?.companyName ||
                item.partnerName ||
                'Partner';

              const product =
                item.creditCardDetails?.cardProduct ||
                item.insuranceDetails?.selectedOffering ||
                item.bankAccountDetails?.accountProduct ||
                item.jobDetails?.jobRole ||
                item.productName ||
                '';

              const catIcon =
                item.category === 'Credit Card'
                  ? '💳'
                  : item.category === 'Insurance'
                  ? '🛡️'
                  : item.category === 'Job'
                  ? '💼'
                  : '🏛️';

              const isApprovedIncentive =
                item.incentiveStatus === 'Approved' ||
                (item.incentiveAmount > 0 &&
                  ['Approved', 'Account Opened', 'Policy Issued', 'Joined', 'Completed', 'Card Issued', 'Activated'].includes(item.status) &&
                  item.incentiveStatus !== 'Paid') ||
                item.status === 'Account Opened' ||
                item.status === 'Policy Issued' ||
                item.status === 'Card Issued' ||
                item.status === 'Joined';

              const isPaidIncentive = item.incentiveStatus === 'Paid';
              const rewardAmount = item.incentiveAmount || 500;

              return (
                <View
                  key={item._id || item.referralCode}
                  style={styles.submissionCard}
                >
                  <View style={styles.submissionCardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>{catIcon}</Text>
                      <View>
                        <Text style={styles.subRefCode}>{item.referralCode}</Text>
                        <Text style={styles.subDate}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }) : 'Recent'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status || 'Submitted'}</Text>
                    </View>
                  </View>

                  <View style={styles.subCardBody}>
                    <View style={styles.subDetailRow}>
                      <Text style={styles.subDetailLabel}>Applicant:</Text>
                      <Text style={styles.subDetailVal}>{applicantName}</Text>
                    </View>
                    <View style={styles.subDetailRow}>
                      <Text style={styles.subDetailLabel}>Partner:</Text>
                      <Text style={styles.subDetailVal} numberOfLines={1}>
                        {partner}{product ? ` • ${product}` : ''}
                      </Text>
                    </View>

                    {/* Incentive Reward Display */}
                    {(isApprovedIncentive || isPaidIncentive || item.incentiveAmount > 0) && (
                      <View style={styles.subDetailRow}>
                        <Text style={styles.subDetailLabel}>Incentive Reward:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.subDetailVal, { color: isPaidIncentive ? '#059669' : '#15803D', fontWeight: '800' }]}>
                            ₹{rewardAmount}
                          </Text>
                          <View style={[styles.rewardMiniPill, isPaidIncentive ? styles.rewardMiniPillPaid : styles.rewardMiniPillApproved]}>
                            <Text style={[styles.rewardMiniPillText, isPaidIncentive ? styles.rewardTextPaid : styles.rewardTextApproved]}>
                              {isPaidIncentive ? 'Paid' : 'Approved'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Dual Action Footer: Audit Details & Pay Button */}
                  <View style={styles.subCardFooter}>
                    <View style={styles.subCardFooterRow}>
                      <TouchableOpacity
                        style={styles.auditBtn}
                        onPress={() => setSelectedSubmission(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.auditBtnText}>Tap to view full audit details →</Text>
                      </TouchableOpacity>

                      {isApprovedIncentive && !isPaidIncentive && (
                        <TouchableOpacity
                          style={styles.payNowBtn}
                          onPress={() => setPayoutModalItem(item)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.payNowBtnText}>💵 Pay ₹{rewardAmount}</Text>
                        </TouchableOpacity>
                      )}

                      {isPaidIncentive && (
                        <View style={styles.paidBadge}>
                          <Text style={styles.paidBadgeText}>✓ Settled</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* =========================================================================
          SCREEN 4: INCENTIVES & RULES
      ========================================================================= */}
      {currentScreen === 'rules' && (
        <ScrollView style={styles.screenScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.programCard}>
            <Text style={styles.programHeader}>Institutional Reward Guidelines</Text>
            <Text style={styles.programSubtitle}>
              Transparent payout rules, qualifying milestones, and anti-fraud verification
            </Text>
          </View>

          {[
            {
              cat: 'Credit Card',
              reward: 'Up to ₹2,500',
              milestone: 'Card Activation & First Spend within 30 days',
              icon: '💳',
              policy: 'Partner bank verifies KYC and delivers credit card to applicant.',
            },
            {
              cat: 'Insurance',
              reward: 'Up to ₹5,000',
              milestone: 'Policy Issuance & Free-Look Period (15 Days) Completion',
              icon: '🛡️',
              policy: 'Underwriter approves medical underwriting and delivers policy certificate.',
            },
            {
              cat: 'Job Referral',
              reward: 'Up to ₹6,000',
              milestone: 'Candidate Joining & 30-Day Probation Clearance',
              icon: '💼',
              policy: 'Hiring partner confirms official joining date and candidate credentials.',
            },
            {
              cat: 'Bank Account',
              reward: 'Up to ₹750',
              milestone: 'Account Opening & Initial Deposit / First Debit Spend',
              icon: '🏛️',
              policy: 'Partner bank successfully verifies Aadhaar biometric KYC and creates account.',
            },
          ].map((r) => (
            <View key={r.cat} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{r.icon}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>{r.cat}</Text>
                </View>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#15803D' }}>{r.reward}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>QUALIFYING MILESTONE</Text>
                <Text style={styles.infoValue}>{r.milestone}</Text>
              </View>

              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 6, lineHeight: 17 }}>
                {r.policy}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* =========================================================================
          SCREEN 5: TOP REFERRAL PERFORMERS LEADERBOARD
      ========================================================================= */}
      {currentScreen === 'leaderboard' && (
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header Banner */}
          <View style={styles.heroCard}>
            <Text style={styles.heroTag}>CAMPUS RECOGNITION & REWARDS</Text>
            <Text style={styles.heroTitle}>🏆 Top Referral Performers</Text>
            <Text style={styles.heroDesc}>
              Celebrating faculty, staff, drivers, and students leading verified partner referrals and approved institutional incentives.
            </Text>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricVal}>{topPerformersStats.totalPerformers || topPerformers.length}</Text>
              <Text style={styles.metricLabel}>Top Referrers</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#15803D' }]}>{topPerformersStats.totalVerifiedReferrals || 0}</Text>
              <Text style={styles.metricLabel}>Verified Leads</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>₹{(topPerformersStats.totalEarnedIncentives || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.metricLabel}>Total Rewards</Text>
            </View>
          </View>

          {/* Search Box */}
          <View style={styles.perfSearchCard}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={styles.perfSearchInput}
              placeholder="Search by name, role, or department..."
              placeholderTextColor="#94A3B8"
              value={perfSearchQuery}
              onChangeText={setPerfSearchQuery}
            />
            {perfSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setPerfSearchQuery('')} style={{ padding: 4 }}>
                <Text style={{ color: '#94A3B8', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List of Performers */}
          {filteredPerformers.length === 0 ? (
            <View style={styles.perfEmptyCard}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🏅</Text>
              <Text style={styles.perfEmptyTitle}>No Performers Found</Text>
              <Text style={styles.perfEmptySub}>
                {perfSearchQuery
                  ? `No referral performer matched "${perfSearchQuery}".`
                  : 'Verified referrals will automatically appear here once approved by institutional partners.'}
              </Text>
            </View>
          ) : (
            filteredPerformers.map((performer, idx) => {
              const rankNum = performer.rank || idx + 1;
              const isFirst = rankNum === 1;
              const isSecond = rankNum === 2;
              const isThird = rankNum === 3;
              const medal = isFirst ? '🥇 #1 Champion' : isSecond ? '🥈 #2 Runner-Up' : isThird ? '🥉 #3 Performer' : `Rank #${rankNum}`;

              const badgeBg = isFirst ? '#FEF3C7' : isSecond ? '#F1F5F9' : isThird ? '#FFEDD5' : '#EFF6FF';
              const badgeBorder = isFirst ? '#FCD34D' : isSecond ? '#CBD5E1' : isThird ? '#FDBA74' : '#BFDBFE';
              const badgeText = isFirst ? '#B45309' : isSecond ? '#475569' : isThird ? '#C2410C' : '#1D4ED8';

              const avatarBg = isFirst ? '#D97706' : isSecond ? '#475569' : isThird ? '#EA580C' : '#2563EB';

              const categoriesList = Array.isArray(performer.categories)
                ? performer.categories
                : (typeof performer.categories === 'object' && performer.categories !== null)
                  ? Object.keys(performer.categories)
                  : [];

              return (
                <View key={performer.userId || idx} style={styles.perfCard}>
                  {/* Top Bar: Rank & Verified Badge */}
                  <View style={styles.perfCardHeader}>
                    <View style={[styles.perfRankBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
                      <Text style={[styles.perfRankBadgeText, { color: badgeText }]}>{medal}</Text>
                    </View>
                    <View style={styles.perfVerifiedBadge}>
                      <Text style={styles.perfVerifiedBadgeText}>✓ {performer.successfulReferrals} Approved</Text>
                    </View>
                  </View>

                  {/* Profile Row: Avatar & Name */}
                  <View style={styles.perfCardProfileRow}>
                    <View style={[styles.perfAvatar, { backgroundColor: avatarBg }]}>
                      <Text style={styles.perfAvatarText}>{getInitials(performer.name)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perfNameText}>{performer.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                        <Text style={styles.perfRoleBadgeText}>{performer.role || 'Member'}</Text>
                        <Text style={styles.perfRoleText}> • {performer.department || 'Campus'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Metrics Strip */}
                  <View style={styles.perfMetricsStrip}>
                    <View>
                      <Text style={styles.perfMetricSub}>ACTUAL INCENTIVE EARNED</Text>
                      <Text style={styles.perfMetricVal}>₹{Number(performer.earnedIncentive || 0).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.perfMetricSub}>SETTLEMENT STATUS</Text>
                      {performer.paidIncentive > 0 ? (
                        <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#15803D' }}>
                            Paid: ₹{Number(performer.paidIncentive).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                            Pending Clearance
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Active Streams Chips */}
                  {categoriesList.length > 0 && (
                    <View style={styles.perfStreamsRow}>
                      <Text style={styles.perfStreamsLabel}>Streams: </Text>
                      {categoriesList.map((catName: string, cIdx: number) => (
                        <View key={cIdx} style={styles.perfStreamPill}>
                          <Text style={styles.perfStreamPillText}>{catName}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Success Modal */}
      <ReferralSuccessModal
        visible={Boolean(lastSubmittedReferral)}
        referral={lastSubmittedReferral}
        onClose={() => setLastSubmittedReferral(null)}
        onViewSubmissions={() => {
          setLastSubmittedReferral(null);
          setCurrentScreen('submissions');
        }}
        onNewReferral={() => {
          setLastSubmittedReferral(null);
          setCategoryTab('refer');
        }}
      />

      {/* Detail / Admin Review Modal */}
      <ReferralDetailModal
        visible={Boolean(selectedSubmission)}
        item={selectedSubmission}
        user={user}
        onClose={() => setSelectedSubmission(null)}
        onOpenPayout={(itm) => setPayoutModalItem(itm)}
        onStatusUpdated={() => {
          loadData();
          setSelectedSubmission(null);
        }}
      />

      {/* Incentive Payout Modal */}
      <IncentivePayoutModal
        visible={Boolean(payoutModalItem)}
        item={payoutModalItem}
        onClose={() => setPayoutModalItem(null)}
        onSuccess={(updated) => {
          loadData();
          if (updated) {
            setSubmissions((prev) =>
              prev.map((s) => (s._id === updated._id || s.referralCode === updated.referralCode ? { ...s, ...updated } : s))
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  topBarSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  mainTabBtn: {
    paddingVertical: 12,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainTabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  mainTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  mainTabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  subCategoryTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  subCategoryTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subCategoryTabBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  subCategoryTabBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  subCategoryTabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  categoryViewTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  categoryViewTabBtn: {
    paddingVertical: 10,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryViewTabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  categoryViewTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryViewTabBtnTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  screenScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 12,
    color: '#DBEAFE',
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    marginTop: 2,
  },
  categoryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  categoryCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  categoryBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  categoryCardDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 16,
  },
  categoryPartnerText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  categoryCardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    alignItems: 'flex-end',
  },
  categoryCardActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  programCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  programHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  programSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  infoRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  applyNowBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  applyNowBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: '#2563EB',
    marginRight: 8,
    fontWeight: '800',
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  offerPartner: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.4,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  offerRewardBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  offerRewardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  offerRewardSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#166534',
  },
  offerPillRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 8,
  },
  offerPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offerPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  offerPerksText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 12,
  },
  offerActionBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    alignItems: 'center',
  },
  offerActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  adminToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  adminToggleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  adminToggleSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
  },
  adminToggleBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminToggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  adminToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  adminToggleBtnTextActive: {
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterChipSmallActive: {
    backgroundColor: '#0F172A',
  },
  filterChipSmallText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipSmallTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  submissionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  subRefCode: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  subDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subCardBody: {
    gap: 4,
  },
  subDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subDetailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  subDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: '70%',
    textAlign: 'right',
  },
  subCardFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  tapToViewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  auditBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingRight: 6,
  },
  auditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  payNowBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  payNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rewardMiniPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rewardMiniPillApproved: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  rewardMiniPillPaid: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rewardMiniPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rewardTextApproved: {
    color: '#15803D',
  },
  rewardTextPaid: {
    color: '#1D4ED8',
  },
  paidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  paidBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  // ── TOP REFERRAL PERFORMERS MOBILE STYLES ──
  perfSectionContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  perfSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  perfSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  perfSectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  perfViewAllBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  perfViewAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  perfCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  perfCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  perfRankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  perfRankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  perfVerifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  perfVerifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  perfCardProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  perfAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  perfAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  perfNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  perfRoleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  perfRoleText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  perfMetricsStrip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  perfMetricSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  perfMetricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  perfMetricStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  perfStreamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 6,
  },
  perfStreamsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  perfStreamPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  perfStreamPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  perfSearchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  perfSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 2,
  },
  perfEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  perfEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  perfEmptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
});
