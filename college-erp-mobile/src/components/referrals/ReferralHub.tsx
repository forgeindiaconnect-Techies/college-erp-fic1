import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, apiPost, type MobileUser } from '../../services/api';
import { Colors, Shadows, Spacing, Radius, Typography } from '../../constants/designSystem';

export type ReferralCategory = 'Credit Card' | 'Insurance' | 'Bank Account' | 'Job';

type ActiveScreen = 'home' | 'category' | 'submissions' | 'rules';
type CategoryTab = 'overview' | 'offers' | 'refer';

type Props = {
  user: MobileUser;
  initialCategory?: ReferralCategory;
  initialScreen?: ActiveScreen;
  onBack?: () => void;
};

type ReferralItem = {
  _id: string;
  referralCode: string;
  category: ReferralCategory;
  status: string;
  createdAt: string;
  submitterName?: string;
  submitterRole?: string;
  creditCardDetails?: {
    applicantName?: string;
    applicantPhone?: string;
    applicantEmail?: string;
    applicantCity?: string;
    bankName?: string;
    cardName?: string;
    cardCategory?: string;
    employmentType?: string;
    monthlyIncome?: string;
    notes?: string;
  };
  insuranceDetails?: {
    applicantName?: string;
    applicantPhone?: string;
    applicantEmail?: string;
    applicantCity?: string;
    provider?: string;
    insuranceType?: string;
    selectedOffering?: string;
    sumInsuredTier?: string;
    notes?: string;
  };
  bankAccountDetails?: {
    applicantName?: string;
    applicantPhone?: string;
    applicantEmail?: string;
    city?: string;
    bankName?: string;
    accountType?: string;
    accountProduct?: string;
    applicantType?: string;
    notes?: string;
  };
  jobDetails?: {
    candidateName?: string;
    candidatePhone?: string;
    candidateEmail?: string;
    candidateCity?: string;
    companyName?: string;
    jobRole?: string;
    jobReferenceId?: string;
    highestQualification?: string;
    experienceLevel?: string;
    sector?: string;
    expectedCtc?: string;
    notes?: string;
  };
  incentiveAmount?: number;
  incentiveStatus?: string;
  incentiveRecord?: {
    amount?: number;
    status?: string;
    payoutStatus?: string;
  };
};

type IncentiveRuleItem = {
  _id?: string;
  category: string;
  ruleCode?: string;
  rewardType?: string;
  baseAmount?: number;
  maxAmount?: number;
  qualifyingMilestone?: string;
  terms?: string;
  eligibilityConditions?: string;
  payoutTimeline?: string;
};

type OfferProduct = {
  id: string;
  partnerName: string;
  title: string;
  categoryTag: string;
  reward: string;
  turnaround: string;
  annualFee?: string;
  perks: string;
  eligibility: string;
  requiredDocuments?: string[];
};

export default function ReferralHub({ user, initialCategory, initialScreen = 'home', onBack }: Props) {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(initialCategory ? 'category' : initialScreen);
  const [selectedCategory, setSelectedCategory] = useState<ReferralCategory>(initialCategory || 'Credit Card');
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('overview');

  // Loading & Refreshing
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Real Stats from Backend
  const [stats, setStats] = useState({
    totalReferrals: 0,
    submittedCount: 0,
    inProgressCount: 0,
    successfulCount: 0,
    rejectedCount: 0,
    totalIncentives: 0,
  });

  // Real Submissions & Rules
  const [submissions, setSubmissions] = useState<ReferralItem[]>([]);
  const [rules, setRules] = useState<IncentiveRuleItem[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ReferralItem | null>(null);

  // Filter states
  const [offerFilterPartner, setOfferFilterPartner] = useState('All');
  const [offerFilterTag, setOfferFilterTag] = useState('All');
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('All');
  const [subStatusFilter, setSubStatusFilter] = useState('All');

  // Multi-step Form State
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedReferral, setLastSubmittedReferral] = useState<ReferralItem | null>(null);

  // Form Field Values: Step 1 (Applicant Info)
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantCity, setApplicantCity] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(true);

  // Step 2: Category-Specific Fields
  // Credit Card
  const [ccBank, setCcBank] = useState('HDFC Bank');
  const [ccProduct, setCcProduct] = useState('Millennia Cashback Credit Card');
  const [ccEmployment, setCcEmployment] = useState('Salaried');
  const [ccIncome, setCcIncome] = useState('₹25,000 - ₹50,000');
  const [ccNotes, setCcNotes] = useState('');

  // Insurance
  const [insType, setInsType] = useState('Health');
  const [insProvider, setInsProvider] = useState('Star Health & Allied Insurance');
  const [insPlan, setInsPlan] = useState('Comprehensive Family Floater Plan');
  const [insSumTier, setInsSumTier] = useState('₹5,00,000 (5 Lakhs)');
  const [insNotes, setInsNotes] = useState('');

  // Bank Account
  const [baBank, setBaBank] = useState('HDFC Bank');
  const [baAccountType, setBaAccountType] = useState('Student Zero-Balance');
  const [baProduct, setBaProduct] = useState('Campus Zero-Balance Student Savings');
  const [baApplicantType, setBaApplicantType] = useState('Student');
  const [baNotes, setBaNotes] = useState('');

  // Job Referral
  const [jobCompany, setJobCompany] = useState('Tata Consultancy Services (TCS)');
  const [jobRole, setJobRole] = useState('Associate Software Engineer');
  const [jobSector, setJobSector] = useState('IT / Software');
  const [jobReqId, setJobReqId] = useState('REQ-2026-IT01');
  const [jobLocation, setJobLocation] = useState('Chennai');
  const [jobQualification, setJobQualification] = useState('B.E. / B.Tech');
  const [jobExperience, setJobExperience] = useState('Fresher (0-1 yr)');
  const [jobExpectedCtc, setJobExpectedCtc] = useState('₹4.5 - ₹6 LPA');
  const [jobNotes, setJobNotes] = useState('');

  // --------------------------------------------------------------------------
  // Static / Fallback Product Catalogs matching Web App configuration
  // --------------------------------------------------------------------------
  const creditCardOffers: OfferProduct[] = useMemo(() => [
    {
      id: 'cc-hdfc-millennia',
      partnerName: 'HDFC Bank',
      title: 'Millennia Cashback Credit Card',
      categoryTag: 'Cashback & Rewards',
      reward: '₹1,200',
      turnaround: '2-3 Business Days',
      annualFee: '₹1,000 (Waived on ₹1L spend)',
      perks: '5% Cashback on Amazon, Flipkart, Swiggy, Zomato; 1% on all other spends.',
      eligibility: 'Min monthly income ₹25,000 (Salaried) or ₹6 LPA ITR. Age 21-60.',
      requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Last 3 Months Salary Slips'],
    },
    {
      id: 'cc-icici-amazon',
      partnerName: 'ICICI Bank',
      title: 'Amazon Pay ICICI Credit Card',
      categoryTag: 'Cashback & Rewards',
      reward: '₹1,000',
      turnaround: 'Instant Video KYC',
      annualFee: 'Lifetime Free (Zero Annual Fee)',
      perks: '5% Unlimited cashback for Amazon Prime members; 3% for non-prime; 2% on recharges & dining.',
      eligibility: 'Salaried or Self-Employed. Valid PAN and Aadhaar linked with mobile.',
      requiredDocuments: ['PAN Card', 'Aadhaar Card'],
    },
    {
      id: 'cc-sbi-simplyclick',
      partnerName: 'State Bank of India',
      title: 'SimplyCLICK SBI Card',
      categoryTag: 'Online Shopping',
      reward: '₹900',
      turnaround: '3-4 Business Days',
      annualFee: '₹499 (Reversible on ₹1L spend)',
      perks: '10X Reward points on exclusive online partner merchants (Cleartrip, BookMyShow, Netmeds).',
      eligibility: 'Min monthly income ₹20,000. Age 21-65.',
      requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Income Proof'],
    },
    {
      id: 'cc-axis-ace',
      partnerName: 'Axis Bank',
      title: 'ACE Credit Card',
      categoryTag: 'Utility & Bill Pay',
      reward: '₹1,200',
      turnaround: '2-4 Business Days',
      annualFee: '₹499 (Waived on ₹2L spend)',
      perks: '5% Cashback on bill payments via Google Pay; 4% on Swiggy and Zomato; 2% flat on all other spends.',
      eligibility: 'Salaried professional or college faculty member. Age 21-60.',
      requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Bank Statement'],
    },
    {
      id: 'cc-kotak-dream',
      partnerName: 'Kotak Mahindra Bank',
      title: 'Kotak 811 #DreamDifferent Card',
      categoryTag: 'Student & Zero Credit',
      reward: '₹750',
      turnaround: '2 Business Days',
      annualFee: 'Zero Joining / Annual Fee',
      perks: 'Fixed Deposit-backed credit card. No CIBIL score required. 2X reward points on online spends.',
      eligibility: 'College students and first-time job seekers with min ₹10,000 fixed deposit. Age 18+.',
      requiredDocuments: ['College Student ID', 'PAN Card', 'Aadhaar Card'],
    },
    {
      id: 'cc-hdfc-regalia',
      partnerName: 'HDFC Bank',
      title: 'Regalia Gold Credit Card',
      categoryTag: 'Travel & Premium Lounge',
      reward: '₹1,500',
      turnaround: '3-5 Business Days',
      annualFee: '₹2,500 (Waived on ₹4L spend)',
      perks: '12 Complimentary airport lounge visits/year across India; 6 International lounge visits.',
      eligibility: 'Min monthly income ₹1,00,000 (Salaried) or ₹12 LPA ITR. Age 21-65.',
      requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Form 16 / ITR V'],
    },
  ], []);

  const insuranceOffers: OfferProduct[] = useMemo(() => [
    {
      id: 'ins-star-family',
      partnerName: 'Star Health & Allied Insurance',
      title: 'Comprehensive Family Floater Plan',
      categoryTag: 'Health / Mediclaim',
      reward: '₹2,000',
      turnaround: 'Instant Digital Policy',
      annualFee: 'Annual Premiums from ₹8,500',
      perks: 'Zero room-rent capping, 14,000+ network cashless hospitals, maternity & neonatal care covered.',
      eligibility: 'Age 18 to 65. Self, spouse, and dependent children up to 25 years.',
      requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Self-Declaration Form'],
    },
    {
      id: 'ins-ergo-optima',
      partnerName: 'HDFC ERGO General Insurance',
      title: 'Optima Secure Hospitalization Shield',
      categoryTag: 'Health / Super Top-up',
      reward: '₹2,500',
      turnaround: 'Instant Digital Issuance',
      annualFee: 'Tiered Premium Rates',
      perks: '4X Coverage multiplier benefit automatically after 2 claim-free years; Restore benefit included.',
      eligibility: 'Resident Indian. Entry age 18-65 years with lifetime renewability.',
      requiredDocuments: ['Aadhaar Card', 'PAN Card'],
    },
    {
      id: 'ins-icici-student',
      partnerName: 'ICICI Lombard General Insurance',
      title: 'Campus Student Group Mediclaim',
      categoryTag: 'Student Group Safety',
      reward: '₹1,000',
      turnaround: '1 Business Day',
      annualFee: 'Subsidized Campus Rate',
      perks: 'Institutional annual health insurance covering accident, sports injury, and hospitalization.',
      eligibility: 'All actively enrolled undergraduate and postgraduate students.',
      requiredDocuments: ['College Student ID', 'Aadhaar Copy'],
    },
    {
      id: 'ins-tata-motor',
      partnerName: 'Tata AIG General Insurance',
      title: 'AutoSecure Zero-Depreciation Motor Shield',
      categoryTag: 'Motor Vehicle',
      reward: '₹1,200',
      turnaround: 'Instant Video Inspection',
      annualFee: 'Calculated via Vehicle IDV',
      perks: 'Bumper-to-bumper 100% reimbursement without depreciation deduction; 24/7 roadside assistance.',
      eligibility: 'Private two-wheelers and four-wheelers with valid registration.',
      requiredDocuments: ['Vehicle RC Book', 'Previous Policy Copy'],
    },
    {
      id: 'ins-hdfc-life',
      partnerName: 'HDFC Life Insurance',
      title: 'Click 2 Protect Super Term Plan',
      categoryTag: 'Life Protection',
      reward: '₹2,000',
      turnaround: '3-5 Business Days',
      annualFee: 'Annual / Monthly Mode',
      perks: 'Pure risk financial protection with terminal illness benefit and waiver of premium rider.',
      eligibility: 'Salaried or self-employed individuals with min annual income ₹3 LPA. Age 18-65.',
      requiredDocuments: ['Income Proof', 'Identity Proof', 'Medical Tele-MER'],
    },
  ], []);

  const bankAccountOffers: OfferProduct[] = useMemo(() => [
    {
      id: 'ba-hdfc-campus',
      partnerName: 'HDFC Bank',
      title: 'Campus Zero-Balance Student Savings',
      categoryTag: 'Student Zero-Balance',
      reward: '₹400',
      turnaround: 'Instant Video KYC',
      annualFee: 'Lifetime Free (Zero MAB)',
      perks: 'Zero minimum balance forever. Free Platinum RuPay Debit card, unlimited UPI transfers, free netbanking.',
      eligibility: 'B.E./B.Tech, Arts, Science & Polytechnic college students. Age 17-25.',
      requiredDocuments: ['College ID Card', 'Aadhaar Card', 'PAN Card (or Form 60)'],
    },
    {
      id: 'ba-icici-smart',
      partnerName: 'ICICI Bank',
      title: 'Smart Student Digital Account with UPI',
      categoryTag: 'Student Digital',
      reward: '₹450',
      turnaround: '5-Minute Instant Setup',
      annualFee: 'Zero Maintenance Charge',
      perks: 'Instant virtual debit card on iMobile Pay, zero minimum balance requirement, free NEFT/IMPS.',
      eligibility: 'All students enrolled in recognized higher education institutions. Age 18+.',
      requiredDocuments: ['Aadhaar Card (linked to active mobile for OTP)', 'PAN Card'],
    },
    {
      id: 'ba-sbi-yuva',
      partnerName: 'State Bank of India',
      title: 'SBI Yuva Institutional Savings',
      categoryTag: 'Savings Account',
      reward: '₹350',
      turnaround: '1 Business Day',
      annualFee: 'Zero MAB in Rural / Semi-Urban',
      perks: 'YONO SBI Digital access, auto-sweep facility converting idle funds into high-interest flexi-FDs.',
      eligibility: 'Resident Indian individuals. Age 18 and above.',
      requiredDocuments: ['PAN Card', 'Aadhaar Card'],
    },
    {
      id: 'ba-axis-salary',
      partnerName: 'Axis Bank',
      title: 'Campus Faculty & Staff Corporate Salary',
      categoryTag: 'Corporate Salary',
      reward: '₹500',
      turnaround: 'Same Day Activation',
      annualFee: 'Zero Minimum Balance',
      perks: 'Complimentary ₹30 Lakh personal accident insurance cover, unlimited ATM withdrawals nationwide.',
      eligibility: 'Permanent and contract staff members drawing monthly salary through institutional payroll.',
      requiredDocuments: ['Staff Employee ID Card', 'PAN Card', 'Salary Slip'],
    },
    {
      id: 'ba-kotak-811',
      partnerName: 'Kotak Mahindra Bank',
      title: 'Kotak 811 Digital Zero-Balance Account',
      categoryTag: 'Digital Zero-Balance',
      reward: '₹400',
      turnaround: 'Instant VKYC',
      annualFee: 'Zero Lifetime Fee',
      perks: 'Up to 4.0% p.a. interest rate on savings balance, instant virtual debit card, zero balance forever.',
      eligibility: 'Indian residents age 18 and above with Aadhaar and PAN.',
      requiredDocuments: ['Aadhaar Card', 'PAN Card'],
    },
  ], []);

  const jobOffers: OfferProduct[] = useMemo(() => [
    {
      id: 'jb-tcs-ase',
      partnerName: 'Tata Consultancy Services (TCS)',
      title: 'Associate Software Engineer (Java / Cloud)',
      categoryTag: 'IT / Software',
      reward: '₹3,500',
      turnaround: 'Screening within 3 Days',
      annualFee: 'Full-time Permanent Employment',
      perks: 'Comprehensive corporate training, international onsite opportunities, full health coverage.',
      eligibility: 'B.E. / B.Tech / MCA (CSE, IT, ECE, EEE). Min 60% aggregate without standing arrears.',
      requiredDocuments: ['College Marksheets', 'Updated Resume', 'Government Photo ID'],
    },
    {
      id: 'jb-cts-web',
      partnerName: 'Cognizant (CTS)',
      title: 'Full Stack Web Developer (React & Node)',
      categoryTag: 'IT / Software',
      reward: '₹4,000',
      turnaround: 'Screening within 48 Hours',
      annualFee: 'Direct Placement Offer',
      perks: 'Modern hybrid work policy, annual learning allowance, competitive performance incentives.',
      eligibility: 'B.E. / B.Tech / M.Sc Computer Science. Good hands-on proficiency in JavaScript.',
      requiredDocuments: ['Resume with GitHub Links', 'Degree Certificate / Provisional'],
    },
    {
      id: 'jb-lt-get',
      partnerName: 'Larsen & Toubro (L&T)',
      title: 'Graduate Engineer Trainee (GET)',
      categoryTag: 'Core Engineering',
      reward: '₹3,500',
      turnaround: 'Assessment in 1 Week',
      annualFee: 'Permanent Core Role',
      perks: 'Structured 12-month engineering development program, campus accommodation at project sites.',
      eligibility: 'B.E. / B.Tech in Mechanical, Civil, Electrical Engineering. Min 65% aggregate.',
      requiredDocuments: ['Resume', 'Semester Marksheets', 'Aadhaar Card'],
    },
    {
      id: 'jb-hdfc-rm',
      partnerName: 'HDFC Bank Ltd',
      title: 'Relationship Manager - Retail Banking',
      categoryTag: 'Banking & Financial Services',
      reward: '₹2,500',
      turnaround: 'Interview in 3 Days',
      annualFee: 'Branch Banking Role',
      perks: 'Monthly performance bonus, banking career progression path, subsidized staff credit products.',
      eligibility: 'Any Graduate / B.Com / BBA / MBA with strong verbal communication skills.',
      requiredDocuments: ['Resume', 'Degree Marksheet', 'PAN Card'],
    },
    {
      id: 'jb-zoho-ops',
      partnerName: 'Zoho Corporation',
      title: 'Technical Support & Operations Specialist',
      categoryTag: 'Product & SaaS',
      reward: '₹3,000',
      turnaround: 'Fast-Track Technical Round',
      annualFee: 'Full-time Campus Role',
      perks: 'World-class campus facilities, free nutritious meals, robust product engineering culture.',
      eligibility: 'Any Degree Graduate with strong analytical reasoning and customer-centric mindset.',
      requiredDocuments: ['Resume', 'Photo ID'],
    },
  ], []);

  // --------------------------------------------------------------------------
  // Data Loader
  // --------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [statsRes, listRes, rulesRes] = await Promise.all([
        apiGet<any>('referrals/my-stats').catch(() => null),
        apiGet<any>('referrals/my-referrals').catch(() => null),
        apiGet<any>('referrals/rules').catch(() => null),
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

      const rawRules = Array.isArray(rulesRes?.data)
        ? rulesRes.data
        : Array.isArray(rulesRes)
        ? rulesRes
        : [];
      setRules(rawRules);
    } catch (err) {
      console.warn('Referrals load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Opening Category Form from Offer
  const handleSelectOfferToRefer = (offer: OfferProduct) => {
    // Pre-fill form based on offer
    if (selectedCategory === 'Credit Card') {
      setCcBank(offer.partnerName);
      setCcProduct(offer.title);
    } else if (selectedCategory === 'Insurance') {
      setInsProvider(offer.partnerName);
      setInsPlan(offer.title);
    } else if (selectedCategory === 'Bank Account') {
      setBaBank(offer.partnerName);
      setBaProduct(offer.title);
    } else if (selectedCategory === 'Job') {
      setJobCompany(offer.partnerName);
      setJobRole(offer.title);
    }
    setFormStep(1);
    setCategoryTab('refer');
  };

  // Reset form inputs
  const resetForm = () => {
    setFormStep(1);
    setApplicantName('');
    setApplicantPhone('');
    setApplicantEmail('');
    setApplicantCity('');
    setConsentConfirmed(true);
    setCcNotes('');
    setInsNotes('');
    setBaNotes('');
    setJobNotes('');
  };

  // Validate Step 1
  const handleNextStep = () => {
    if (formStep === 1) {
      if (!applicantName.trim()) {
        Alert.alert('Required Field', 'Please enter applicant / candidate full name.');
        return;
      }
      const cleanDigits = applicantPhone.replace(/\D/g, '');
      if (cleanDigits.length < 10) {
        Alert.alert('Valid Phone Required', 'Please provide a 10-digit Indian mobile number for applicant contact.');
        return;
      }
      if (!consentConfirmed) {
        Alert.alert('Consent Required', 'Please verify that you have obtained consent from the applicant to submit their contact info.');
        return;
      }
      setFormStep(2);
    } else if (formStep === 2) {
      setFormStep(3);
    }
  };

  // Submit Referral Payload to Backend
  const handleSubmitReferral = async () => {
    try {
      setSubmitting(true);
      const cleanPhone = applicantPhone.replace(/\D/g, '').slice(-10);

      const baseFormData = {
        applicantName: applicantName.trim(),
        applicantPhone: cleanPhone,
        applicantEmail: applicantEmail.trim() || undefined,
        city: applicantCity.trim() || 'Tamil Nadu',
        referralSource: 'College ERP Mobile App',
        consentGiven: true,
        applicantConsentGiven: true,
        candidateConsentGiven: true,
        consentTimestamp: new Date().toISOString(),
      };

      const payload: any = {
        category: selectedCategory,
        formData: baseFormData,
      };

      if (selectedCategory === 'Credit Card') {
        payload.creditCardDetails = {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim() || undefined,
          applicantCity: applicantCity.trim() || 'Tamil Nadu',
          bankName: ccBank,
          cardName: ccProduct,
          employmentType: ccEmployment,
          monthlyIncome: ccIncome,
          referralSource: 'College ERP Mobile App',
          notes: ccNotes.trim() || undefined,
          consentGiven: true,
          applicantConsentGiven: true,
          consentTimestamp: new Date().toISOString(),
          consentNoticeVersion: 'v2.4-FIC-CC-CONSENT',
        };
      } else if (selectedCategory === 'Insurance') {
        payload.insuranceDetails = {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim() || undefined,
          applicantCity: applicantCity.trim() || 'Tamil Nadu',
          insuranceType: insType,
          provider: insProvider,
          selectedOffering: insPlan,
          sumInsuredTier: insSumTier,
          referralSource: 'College ERP Mobile App',
          notes: insNotes.trim() || undefined,
          consentGiven: true,
          applicantConsentGiven: true,
          consentTimestamp: new Date().toISOString(),
          consentNoticeVersion: 'v1.2-FIC-INS-CONSENT',
        };
      } else if (selectedCategory === 'Bank Account') {
        payload.bankAccountDetails = {
          applicantName: applicantName.trim(),
          applicantPhone: cleanPhone,
          applicantEmail: applicantEmail.trim() || undefined,
          city: applicantCity.trim() || 'Tamil Nadu',
          bankName: baBank,
          accountType: baAccountType,
          accountProduct: baProduct,
          applicantType: baApplicantType,
          referralSource: 'College ERP Mobile App',
          notes: baNotes.trim() || undefined,
          consentGiven: true,
          applicantConsentGiven: true,
          consentTimestamp: new Date().toISOString(),
          consentNoticeVersion: 'v1.2-FIC-ACC-CONSENT',
        };
      } else if (selectedCategory === 'Job') {
        payload.jobDetails = {
          candidateName: applicantName.trim(),
          candidatePhone: cleanPhone,
          candidateEmail: applicantEmail.trim() || undefined,
          candidateCity: applicantCity.trim() || jobLocation,
          companyName: jobCompany,
          jobRole: jobRole,
          jobReferenceId: jobReqId,
          highestQualification: jobQualification,
          experienceLevel: jobExperience,
          sector: jobSector,
          expectedCtc: jobExpectedCtc,
          referralSource: 'College ERP Mobile App',
          notes: jobNotes.trim() || undefined,
          consentGiven: true,
          candidateConsentGiven: true,
          consentTimestamp: new Date().toISOString(),
          consentNoticeVersion: 'v1.2-FIC-JOB-CONSENT',
        };
      }

      const res = await apiPost<any>('referrals', payload);
      const createdItem = res?.data || res;
      setLastSubmittedReferral(createdItem);

      await loadData();
      resetForm();
    } catch (err: any) {
      Alert.alert('Submission Error', err?.message || 'Could not submit referral to database.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for Status Badge Styling
  const getStatusBadgeStyle = (statusStr: string) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('approved') || s.includes('issued') || s.includes('joined') || s.includes('paid') || s.includes('success')) {
      return { bg: Colors.successBg, text: Colors.successText, border: Colors.successBorder };
    }
    if (s.includes('reject') || s.includes('cancel')) {
      return { bg: Colors.dangerBg, text: Colors.dangerText, border: Colors.dangerBorder };
    }
    if (s.includes('progress') || s.includes('review') || s.includes('kyc') || s.includes('verif') || s.includes('interview')) {
      return { bg: Colors.warningBg, text: Colors.warningText, border: Colors.warningBorder };
    }
    return { bg: Colors.primaryLight, text: Colors.primaryAccent, border: Colors.primaryBorder };
  };

  // Filtered Submissions List
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      // Category filter
      if (subCategoryFilter !== 'All' && item.category !== subCategoryFilter) {
        return false;
      }
      // Status filter
      if (subStatusFilter !== 'All') {
        const s = (item.status || '').toLowerCase();
        if (subStatusFilter === 'Submitted' && !s.includes('submitted')) return false;
        if (subStatusFilter === 'In Progress' && (s.includes('submitted') || s.includes('reject') || s.includes('approved') || s.includes('issued') || s.includes('paid'))) return false;
        if (subStatusFilter === 'Successful' && !(s.includes('approved') || s.includes('issued') || s.includes('joined') || s.includes('paid'))) return false;
        if (subStatusFilter === 'Rejected' && !(s.includes('reject') || s.includes('cancel'))) return false;
      }
      // Search query
      if (subSearchQuery.trim()) {
        const q = subSearchQuery.toLowerCase().trim();
        const code = (item.referralCode || '').toLowerCase();
        const name = (
          item.creditCardDetails?.applicantName ||
          item.insuranceDetails?.applicantName ||
          item.bankAccountDetails?.applicantName ||
          item.jobDetails?.candidateName ||
          ''
        ).toLowerCase();
        const partner = (
          item.creditCardDetails?.bankName ||
          item.insuranceDetails?.provider ||
          item.bankAccountDetails?.bankName ||
          item.jobDetails?.companyName ||
          ''
        ).toLowerCase();
        return code.includes(q) || name.includes(q) || partner.includes(q);
      }
      return true;
    });
  }, [submissions, subCategoryFilter, subStatusFilter, subSearchQuery]);

  // Current category offer pool
  const currentOffers = useMemo(() => {
    let pool: OfferProduct[] = [];
    if (selectedCategory === 'Credit Card') pool = creditCardOffers;
    else if (selectedCategory === 'Insurance') pool = insuranceOffers;
    else if (selectedCategory === 'Bank Account') pool = bankAccountOffers;
    else if (selectedCategory === 'Job') pool = jobOffers;

    return pool.filter((item) => {
      const matchPartner = offerFilterPartner === 'All' || item.partnerName.toLowerCase().includes(offerFilterPartner.toLowerCase());
      const matchTag = offerFilterTag === 'All' || item.categoryTag.toLowerCase().includes(offerFilterTag.toLowerCase());
      return matchPartner && matchTag;
    });
  }, [selectedCategory, creditCardOffers, insuranceOffers, bankAccountOffers, jobOffers, offerFilterPartner, offerFilterTag]);

  // --------------------------------------------------------------------------
  // SCREEN 1: BUSINESS REFERRAL HOME
  // --------------------------------------------------------------------------
  const renderHomeScreen = () => {
    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroEyebrow}>INSTITUTIONAL BUSINESS REFERRALS</Text>
              <Text style={styles.heroTitle}>Referral & Incentives Hub</Text>
              <Text style={styles.heroSubtitle}>
                Connect scholars, staff, and families to authorized banking, insurance, career, and credit services.
              </Text>
            </View>
            <View style={styles.heroIconBadge}>
              <Text style={styles.heroIconEmoji}>🤝</Text>
            </View>
          </View>

          {/* Quick Metrics KPI Bar */}
          <View style={styles.kpiBar}>
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>TOTAL LEADS</Text>
              <Text style={styles.kpiValue}>{stats.totalReferrals}</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>IN PROGRESS</Text>
              <Text style={[styles.kpiValue, { color: Colors.warning }]}>{stats.inProgressCount}</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>SUCCESSFUL</Text>
              <Text style={[styles.kpiValue, { color: Colors.success }]}>{stats.successfulCount}</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiCol}>
              <Text style={styles.kpiLabel}>EARNED (₹)</Text>
              <Text style={[styles.kpiValue, { color: '#60A5FA' }]}>₹{stats.totalIncentives.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Referral Categories</Text>
            <Text style={styles.sectionDesc}>Select a category to explore offers or submit a referral</Text>
          </View>
        </View>

        {/* 4 Large Service Cards */}
        <View style={{ gap: 14 }}>
          {/* Card 1: Credit Cards */}
          <TouchableOpacity
            style={styles.categoryCard}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedCategory('Credit Card');
              setCategoryTab('overview');
              setCurrentScreen('category');
            }}
          >
            <View style={styles.categoryCardTop}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.categoryIconEmoji}>💳</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.categoryCardTitle}>Credit Cards</Text>
                  <View style={styles.rewardPill}>
                    <Text style={styles.rewardPillText}>Up to ₹1,500</Text>
                  </View>
                </View>
                <Text style={styles.categoryCardDesc}>
                  Pre-approved cashback, fuel, travel & lifetime-free cards from verified partner banks.
                </Text>
              </View>
            </View>
            <View style={styles.categoryCardFooter}>
              <Text style={styles.partnerListText} numberOfLines={1}>Partners: HDFC • ICICI • SBI • Axis • Kotak</Text>
              <Text style={styles.categoryCardActionText}>Explore Program →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Insurance */}
          <TouchableOpacity
            style={styles.categoryCard}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedCategory('Insurance');
              setCategoryTab('overview');
              setCurrentScreen('category');
            }}
          >
            <View style={styles.categoryCardTop}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Text style={styles.categoryIconEmoji}>🛡️</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.categoryCardTitle}>Insurance Policies</Text>
                  <View style={[styles.rewardPill, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.rewardPillText, { color: '#15803D' }]}>Up to ₹2,500</Text>
                  </View>
                </View>
                <Text style={styles.categoryCardDesc}>
                  Comprehensive family hospitalization, campus student mediclaim & motor vehicle coverage.
                </Text>
              </View>
            </View>
            <View style={styles.categoryCardFooter}>
              <Text style={styles.partnerListText} numberOfLines={1}>Partners: Star Health • HDFC ERGO • ICICI Lombard • Tata AIG</Text>
              <Text style={styles.categoryCardActionText}>Explore Program →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Job Openings */}
          <TouchableOpacity
            style={styles.categoryCard}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedCategory('Job');
              setCategoryTab('overview');
              setCurrentScreen('category');
            }}
          >
            <View style={styles.categoryCardTop}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Text style={styles.categoryIconEmoji}>💼</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.categoryCardTitle}>Job Openings & Careers</Text>
                  <View style={[styles.rewardPill, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[styles.rewardPillText, { color: '#6D28D9' }]}>Up to ₹4,000</Text>
                  </View>
                </View>
                <Text style={styles.categoryCardDesc}>
                  Campus placement drives, corporate internships & experienced industry engineering roles.
                </Text>
              </View>
            </View>
            <View style={styles.categoryCardFooter}>
              <Text style={styles.partnerListText} numberOfLines={1}>Companies: TCS • Cognizant • L&T • Infosys • HDFC • Zoho</Text>
              <Text style={styles.categoryCardActionText}>Explore Jobs →</Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Bank Accounts */}
          <TouchableOpacity
            style={styles.categoryCard}
            activeOpacity={0.85}
            onPress={() => {
              setSelectedCategory('Bank Account');
              setCategoryTab('overview');
              setCurrentScreen('category');
            }}
          >
            <View style={styles.categoryCardTop}>
              <View style={[styles.categoryIconCircle, { backgroundColor: '#FFFBEB' }]}>
                <Text style={styles.categoryIconEmoji}>🏦</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.categoryCardTitle}>Bank Accounts</Text>
                  <View style={[styles.rewardPill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.rewardPillText, { color: '#B45309' }]}>Up to ₹600</Text>
                  </View>
                </View>
                <Text style={styles.categoryCardDesc}>
                  Zero-balance student accounts, institutional staff salary accounts & instant UPI digital accounts.
                </Text>
              </View>
            </View>
            <View style={styles.categoryCardFooter}>
              <Text style={styles.partnerListText} numberOfLines={1}>Banks: HDFC • ICICI • SBI • Axis • Kotak 811</Text>
              <Text style={styles.categoryCardActionText}>Explore Accounts →</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 2 Clear Shortcuts: Incentives & Rules and My Submissions */}
        <View style={styles.shortcutsBox}>
          <Text style={styles.shortcutsHeader}>Quick Shortcuts</Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {/* Shortcut 1: Incentives & Rules */}
            <TouchableOpacity
              style={styles.shortcutCard}
              activeOpacity={0.8}
              onPress={() => setCurrentScreen('rules')}
            >
              <View style={styles.shortcutIconCircle}>
                <Text style={styles.shortcutEmoji}>📜</Text>
              </View>
              <Text style={styles.shortcutTitle}>Incentives & Rules</Text>
              <Text style={styles.shortcutSubtitle}>Rate cards, milestones & payout policies</Text>
              <Text style={styles.shortcutLink}>View Rules →</Text>
            </TouchableOpacity>

            {/* Shortcut 2: My Submissions */}
            <TouchableOpacity
              style={styles.shortcutCard}
              activeOpacity={0.8}
              onPress={() => setCurrentScreen('submissions')}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.shortcutEmoji}>📋</Text>
              </View>
              <Text style={styles.shortcutTitle}>My Submissions</Text>
              <Text style={styles.shortcutSubtitle}>
                {submissions.length} total referrals tracked in real-time
              </Text>
              <Text style={styles.shortcutLink}>Track Leads →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Anti-Fraud & Compliance Notice */}
        <View style={styles.complianceNoticeCard}>
          <Text style={styles.complianceEmoji}>🛡️</Text>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={styles.complianceTitle}>Institutional Governance & Privacy</Text>
            <Text style={styles.complianceText}>
              All referrals require explicit consent from applicants. Leads are automatically protected with a 90-day duplicate prevention rule across partner networks.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 2: DEDICATED CATEGORY PAGES
  // --------------------------------------------------------------------------
  const renderCategoryScreen = () => {
    const categoryIcons: Record<ReferralCategory, string> = {
      'Credit Card': '💳',
      'Insurance': '🛡️',
      'Job': '💼',
      'Bank Account': '🏦',
    };

    const categorySubtitles: Record<ReferralCategory, string> = {
      'Credit Card': 'Pre-approved cashback, fuel, travel & student credit cards',
      'Insurance': 'Health hospitalization, campus mediclaim, life & motor policies',
      'Job': 'Campus placement drives, corporate internships & experienced roles',
      'Bank Account': 'Zero-balance student accounts, corporate salary & digital accounts',
    };

    return (
      <View style={{ flex: 1 }}>
        {/* Category Top Bar with Back Navigation */}
        <View style={styles.categoryTopBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (onBack && currentScreen === 'category' && initialCategory) {
                onBack();
              } else {
                setCurrentScreen('home');
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back to Hub</Text>
          </TouchableOpacity>

          <View style={styles.categoryTitleRow}>
            <View style={styles.categoryBadgeIcon}>
              <Text style={{ fontSize: 22 }}>{categoryIcons[selectedCategory]}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={styles.categoryPageTitle}>{selectedCategory} Referral</Text>
              <Text style={styles.categoryPageSubtitle}>{categorySubtitles[selectedCategory]}</Text>
            </View>
          </View>

          {/* 3 Clearly Labelled Category Actions (Overview | Explore Offers | Refer Someone) */}
          <View style={styles.categoryTabsBar}>
            <TouchableOpacity
              style={[styles.categoryTabBtn, categoryTab === 'overview' && styles.categoryTabBtnActive]}
              onPress={() => setCategoryTab('overview')}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryTabBtnText, categoryTab === 'overview' && styles.categoryTabBtnTextActive]} numberOfLines={1}>
                📌 Overview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTabBtn, categoryTab === 'offers' && styles.categoryTabBtnActive]}
              onPress={() => setCategoryTab('offers')}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryTabBtnText, categoryTab === 'offers' && styles.categoryTabBtnTextActive]} numberOfLines={1}>
                🔍 Offers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTabBtn, categoryTab === 'refer' && styles.categoryTabBtnActive]}
              onPress={() => {
                resetForm();
                setCategoryTab('refer');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.categoryTabBtnText, categoryTab === 'refer' && styles.categoryTabBtnTextActive]} numberOfLines={1}>
                📝 Refer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TAB CONTENT */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* 1. OVERVIEW TAB */}
          {categoryTab === 'overview' && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Program Introduction Card */}
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Program Details & Overview</Text>
                <Text style={styles.cardHeaderSubtitle}>
                  Verified commercial partnership program between our institution and leading national service providers.
                </Text>

                <View style={styles.infoRowGrid}>
                  <View style={styles.infoRowItem}>
                    <Text style={styles.infoRowLabel}>CATEGORY</Text>
                    <Text style={styles.infoRowVal}>{selectedCategory}</Text>
                  </View>
                  <View style={styles.infoRowItem}>
                    <Text style={styles.infoRowLabel}>AUTHORIZED ROLES</Text>
                    <Text style={styles.infoRowVal}>Students, Staff, Parents, Drivers</Text>
                  </View>
                  <View style={styles.infoRowItem}>
                    <Text style={styles.infoRowLabel}>DUPLICATE CHECK</Text>
                    <Text style={styles.infoRowVal}>90-Day Cooling Period</Text>
                  </View>
                  <View style={styles.infoRowItem}>
                    <Text style={styles.infoRowLabel}>DISBURSEMENT</Text>
                    <Text style={styles.infoRowVal}>Institutional Settlement Cycle</Text>
                  </View>
                </View>
              </View>

              {/* 4-Step Milestone Journey */}
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>How It Works</Text>
                <Text style={styles.cardHeaderSubtitle}>Simple 4-stage lifecycle from submission to verified reward</Text>

                <View style={{ gap: 12, marginTop: 6 }}>
                  <View style={styles.stepTimelineItem}>
                    <View style={styles.stepNumCircle}><Text style={styles.stepNumText}>1</Text></View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.stepTitle}>Submit Applicant Information</Text>
                      <Text style={styles.stepDesc}>Enter applicant name, mobile number, and select the desired partner program with confirmed applicant consent.</Text>
                    </View>
                  </View>

                  <View style={styles.stepTimelineItem}>
                    <View style={[styles.stepNumCircle, { backgroundColor: '#F1F5F9' }]}><Text style={[styles.stepNumText, { color: '#475569' }]}>2</Text></View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.stepTitle}>Partner Verification & Processing</Text>
                      <Text style={styles.stepDesc}>Official partner representative reaches out to the applicant to complete digital KYC, verification, or interviews.</Text>
                    </View>
                  </View>

                  <View style={styles.stepTimelineItem}>
                    <View style={[styles.stepNumCircle, { backgroundColor: '#F1F5F9' }]}><Text style={[styles.stepNumText, { color: '#475569' }]}>3</Text></View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.stepTitle}>Milestone Qualification</Text>
                      <Text style={styles.stepDesc}>Applicant achieves qualifying event: Card dispatch, policy issuance, candidate joining, or account activation.</Text>
                    </View>
                  </View>

                  <View style={styles.stepTimelineItem}>
                    <View style={[styles.stepNumCircle, { backgroundColor: '#DCFCE7' }]}><Text style={[styles.stepNumText, { color: '#15803D' }]}>4</Text></View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.stepTitle}>Incentive Credit</Text>
                      <Text style={styles.stepDesc}>Reward approved and settled directly to your institutional fee ledger or verified staff account.</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Eligibility & Guidelines Card */}
              <View style={styles.card}>
                <Text style={styles.cardHeaderTitle}>Eligibility Guidelines</Text>
                <Text style={styles.cardHeaderSubtitle}>Key requirements for applicants in this category</Text>

                <View style={styles.guidelineBulletList}>
                  {selectedCategory === 'Credit Card' && (
                    <>
                      <Text style={styles.bulletItem}>• Applicant must be an Indian resident aged 21 to 65 years.</Text>
                      <Text style={styles.bulletItem}>• Salaried individuals: Min monthly net income ₹20,000 to ₹25,000.</Text>
                      <Text style={styles.bulletItem}>• College students: Eligible for FD-backed or parent-addon credit cards with zero minimum credit score.</Text>
                      <Text style={styles.bulletItem}>• Active mobile number linked to Aadhaar is required for instant Video KYC.</Text>
                    </>
                  )}
                  {selectedCategory === 'Insurance' && (
                    <>
                      <Text style={styles.bulletItem}>• Health policies available for age 18 to 65 with lifelong renewability.</Text>
                      <Text style={styles.bulletItem}>• Pre-existing medical conditions must be truthfully declared.</Text>
                      <Text style={styles.bulletItem}>• Motor policies require valid registration certificate (RC Book) copy.</Text>
                      <Text style={styles.bulletItem}>• Student mediclaim covers emergency hospitalization at all partner network hospitals.</Text>
                    </>
                  )}
                  {selectedCategory === 'Job' && (
                    <>
                      <Text style={styles.bulletItem}>• Open to both fresh campus graduates and experienced alumni / professionals.</Text>
                      <Text style={styles.bulletItem}>• Candidate qualification must match the specified role requisition.</Text>
                      <Text style={styles.bulletItem}>• Candidate must not have interviewed with the target employer in the past 6 months.</Text>
                      <Text style={styles.bulletItem}>• Reward qualifies upon successful candidate joining and completion of initial probation.</Text>
                    </>
                  )}
                  {selectedCategory === 'Bank Account' && (
                    <>
                      <Text style={styles.bulletItem}>• Student Zero-Balance savings available with valid college student ID.</Text>
                      <Text style={styles.bulletItem}>• Corporate Salary accounts open to all verified faculty and institutional staff.</Text>
                      <Text style={styles.bulletItem}>• Instant digital account number generated upon biometric or OTP Aadhaar authentication.</Text>
                      <Text style={styles.bulletItem}>• Zero minimum balance penalty on all verified student accounts.</Text>
                    </>
                  )}
                </View>

                {/* Direct Action Button */}
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  activeOpacity={0.8}
                  onPress={() => {
                    resetForm();
                    setCategoryTab('refer');
                  }}
                >
                  <Text style={styles.primaryActionButtonText}>+ Refer an Applicant Now</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* 2. EXPLORE OFFERS TAB */}
          {categoryTab === 'offers' && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.offersHeaderBox}>
                <Text style={styles.offersHeaderTitle}>Available Programs & Offers</Text>
                <Text style={styles.offersHeaderDesc}>
                  Select an offer below to review eligibility and initiate a referral with pre-filled product details.
                </Text>
              </View>

              {/* Offer Cards List */}
              <View style={{ gap: 12 }}>
                {currentOffers.map((offer) => (
                  <View key={offer.id} style={styles.offerCard}>
                    {/* Top Row: Partner + Title + Reward Badge */}
                    <View style={styles.offerCardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offerPartnerName}>{offer.partnerName}</Text>
                        <Text style={styles.offerTitle}>{offer.title}</Text>
                      </View>
                      <View style={styles.offerRewardBadge}>
                        <Text style={styles.offerRewardText}>{offer.reward}</Text>
                        <Text style={styles.offerRewardSub}>Incentive</Text>
                      </View>
                    </View>

                    {/* Meta badges */}
                    <View style={styles.offerMetaPillsRow}>
                      <View style={styles.offerMetaPill}>
                        <Text style={styles.offerMetaPillText}>🏷️ {offer.categoryTag}</Text>
                      </View>
                      <View style={styles.offerMetaPill}>
                        <Text style={styles.offerMetaPillText}>⚡ {offer.turnaround}</Text>
                      </View>
                      {offer.annualFee && (
                        <View style={styles.offerMetaPill}>
                          <Text style={styles.offerMetaPillText}>💵 {offer.annualFee}</Text>
                        </View>
                      )}
                    </View>

                    {/* Perks & Features */}
                    <View style={styles.offerPerksBox}>
                      <Text style={styles.offerPerksLabel}>Key Benefits:</Text>
                      <Text style={styles.offerPerksText}>{offer.perks}</Text>
                    </View>

                    {/* Eligibility */}
                    <Text style={styles.offerEligibilityText}>
                      <Text style={{ fontWeight: '700', color: Colors.textSecondary }}>Eligibility: </Text>
                      {offer.eligibility}
                    </Text>

                    {/* Required Documents */}
                    {offer.requiredDocuments && (
                      <Text style={styles.offerDocsText}>
                        <Text style={{ fontWeight: '700', color: Colors.textSecondary }}>Documents: </Text>
                        {offer.requiredDocuments.join(', ')}
                      </Text>
                    )}

                    {/* Refer Button for this specific offer */}
                    <TouchableOpacity
                      style={styles.referOfferButton}
                      activeOpacity={0.8}
                      onPress={() => handleSelectOfferToRefer(offer)}
                    >
                      <Text style={styles.referOfferButtonText}>Refer Someone for this Offer →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}

          {/* 3. REFER SOMEONE TAB (MULTI-STEP FORM) */}
          {categoryTab === 'refer' && (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Multi-Step Progress Indicator */}
              <View style={styles.stepperContainer}>
                <View style={styles.stepperRow}>
                  <View style={[styles.stepperCircle, formStep >= 1 && styles.stepperCircleActive]}>
                    <Text style={[styles.stepperCircleText, formStep >= 1 && styles.stepperCircleTextActive]}>1</Text>
                  </View>
                  <View style={[styles.stepperLine, formStep >= 2 && styles.stepperLineActive]} />
                  <View style={[styles.stepperCircle, formStep >= 2 && styles.stepperCircleActive]}>
                    <Text style={[styles.stepperCircleText, formStep >= 2 && styles.stepperCircleTextActive]}>2</Text>
                  </View>
                  <View style={[styles.stepperLine, formStep >= 3 && styles.stepperLineActive]} />
                  <View style={[styles.stepperCircle, formStep >= 3 && styles.stepperCircleActive]}>
                    <Text style={[styles.stepperCircleText, formStep >= 3 && styles.stepperCircleTextActive]}>3</Text>
                  </View>
                </View>

                <View style={styles.stepperLabelsRow}>
                  <Text style={[styles.stepperLabel, formStep === 1 && styles.stepperLabelActive]}>Applicant Info</Text>
                  <Text style={[styles.stepperLabel, formStep === 2 && styles.stepperLabelActive]}>Product Details</Text>
                  <Text style={[styles.stepperLabel, formStep === 3 && styles.stepperLabelActive]}>Review & Submit</Text>
                </View>
              </View>

              {/* STEP 1: APPLICANT INFORMATION */}
              {formStep === 1 && (
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>Step 1: Applicant Details</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Provide the basic contact info of the individual you are referring
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Applicant / Candidate Full Name *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. S. Vignesh Kumar"
                      placeholderTextColor={Colors.textLight}
                      value={applicantName}
                      onChangeText={setApplicantName}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>10-Digit Mobile Number *</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. 9876543210"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={applicantPhone}
                      onChangeText={setApplicantPhone}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. vignesh@gmail.com"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={applicantEmail}
                      onChangeText={setApplicantEmail}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.fieldLabel}>Current City / Location</Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="e.g. Chennai, Bangalore, Coimbatore"
                      placeholderTextColor={Colors.textLight}
                      value={applicantCity}
                      onChangeText={setApplicantCity}
                    />
                  </View>

                  {/* Explicit Consent Requirement */}
                  <TouchableOpacity
                    style={styles.consentRow}
                    activeOpacity={0.8}
                    onPress={() => setConsentConfirmed(!consentConfirmed)}
                  >
                    <View style={[styles.checkboxSquare, consentConfirmed && styles.checkboxSquareActive]}>
                      {consentConfirmed && <Text style={styles.checkboxCheckText}>✓</Text>}
                    </View>
                    <Text style={styles.consentText}>
                      I confirm that I have obtained explicit consent from the applicant to share their contact details for official partner verification and KYC processing.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryActionButton}
                    activeOpacity={0.8}
                    onPress={handleNextStep}
                  >
                    <Text style={styles.primaryActionButtonText}>Continue to Product Details →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: CATEGORY SPECIFIC FIELDS */}
              {formStep === 2 && (
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>Step 2: {selectedCategory} Details</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Customize the specific offer or role for this applicant
                  </Text>

                  {/* CREDIT CARD FIELDS */}
                  {selectedCategory === 'Credit Card' && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Partner Bank *</Text>
                        <View style={styles.optionPillRow}>
                          {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'].map((b) => (
                            <TouchableOpacity
                              key={b}
                              style={[styles.selectorPill, ccBank === b && styles.selectorPillActive]}
                              onPress={() => setCcBank(b)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, ccBank === b && styles.selectorPillTextActive]}>{b}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Selected Card Product *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={ccProduct}
                          onChangeText={setCcProduct}
                          placeholder="e.g. Millennia Cashback Credit Card"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Employment Type *</Text>
                        <View style={styles.optionPillRow}>
                          {['Salaried', 'Self-Employed', 'College Faculty', 'Student (Add-on/FD)'].map((emp) => (
                            <TouchableOpacity
                              key={emp}
                              style={[styles.selectorPill, ccEmployment === emp && styles.selectorPillActive]}
                              onPress={() => setCcEmployment(emp)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, ccEmployment === emp && styles.selectorPillTextActive]}>{emp}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Monthly Net Income Bracket</Text>
                        <View style={styles.optionPillRow}>
                          {['Under ₹25,000', '₹25,000 - ₹50,000', '₹50,000 - ₹1,00,000', 'Above ₹1,00,000'].map((inc) => (
                            <TouchableOpacity
                              key={inc}
                              style={[styles.selectorPill, ccIncome === inc && styles.selectorPillActive]}
                              onPress={() => setCcIncome(inc)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, ccIncome === inc && styles.selectorPillTextActive]}>{inc}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Special Notes / Instructions (Optional)</Text>
                        <TextInput
                          style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]}
                          multiline
                          placeholder="Applicant preferred contact timing or credit card preferences..."
                          placeholderTextColor={Colors.textLight}
                          value={ccNotes}
                          onChangeText={setCcNotes}
                        />
                      </View>
                    </>
                  )}

                  {/* INSURANCE FIELDS */}
                  {selectedCategory === 'Insurance' && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Insurance Policy Type *</Text>
                        <View style={styles.optionPillRow}>
                          {['Health', 'Student Mediclaim', 'Motor', 'Life', 'Property'].map((t) => (
                            <TouchableOpacity
                              key={t}
                              style={[styles.selectorPill, insType === t && styles.selectorPillActive]}
                              onPress={() => setInsType(t)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, insType === t && styles.selectorPillTextActive]}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Insurance Provider *</Text>
                        <View style={styles.optionPillRow}>
                          {['Star Health & Allied Insurance', 'HDFC ERGO General Insurance', 'ICICI Lombard General Insurance', 'Tata AIG General Insurance'].map((p) => (
                            <TouchableOpacity
                              key={p}
                              style={[styles.selectorPill, insProvider === p && styles.selectorPillActive]}
                              onPress={() => setInsProvider(p)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, insProvider === p && styles.selectorPillTextActive]}>{p}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Policy Plan Name *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={insPlan}
                          onChangeText={setInsPlan}
                          placeholder="e.g. Comprehensive Family Floater Plan"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Sum Insured Coverage Tier *</Text>
                        <View style={styles.optionPillRow}>
                          {['₹3,00,000', '₹5,00,000 (5 Lakhs)', '₹10,00,000 (10 Lakhs)', '₹25,00,000', '₹50,00,000', '₹1 Crore'].map((sum) => (
                            <TouchableOpacity
                              key={sum}
                              style={[styles.selectorPill, insSumTier === sum && styles.selectorPillActive]}
                              onPress={() => setInsSumTier(sum)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, insSumTier === sum && styles.selectorPillTextActive]}>{sum}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Additional Coverage Notes</Text>
                        <TextInput
                          style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]}
                          multiline
                          placeholder="Pre-existing illnesses, vehicle registration number, or family member details..."
                          placeholderTextColor={Colors.textLight}
                          value={insNotes}
                          onChangeText={setInsNotes}
                        />
                      </View>
                    </>
                  )}

                  {/* BANK ACCOUNT FIELDS */}
                  {selectedCategory === 'Bank Account' && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Partner Bank *</Text>
                        <View style={styles.optionPillRow}>
                          {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'].map((b) => (
                            <TouchableOpacity
                              key={b}
                              style={[styles.selectorPill, baBank === b && styles.selectorPillActive]}
                              onPress={() => setBaBank(b)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, baBank === b && styles.selectorPillTextActive]}>{b}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Account Type *</Text>
                        <View style={styles.optionPillRow}>
                          {['Student Zero-Balance', 'Savings Account', 'Salary Account', 'Current Account'].map((t) => (
                            <TouchableOpacity
                              key={t}
                              style={[styles.selectorPill, baAccountType === t && styles.selectorPillActive]}
                              onPress={() => setBaAccountType(t)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, baAccountType === t && styles.selectorPillTextActive]}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Account Product Name *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={baProduct}
                          onChangeText={setBaProduct}
                          placeholder="e.g. Campus Zero-Balance Student Savings"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Applicant Category</Text>
                        <View style={styles.optionPillRow}>
                          {['Student', 'Faculty / Staff', 'Alumni', 'Parent', 'Campus Vendor'].map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              style={[styles.selectorPill, baApplicantType === cat && styles.selectorPillActive]}
                              onPress={() => setBaApplicantType(cat)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, baApplicantType === cat && styles.selectorPillTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Branch Location or Account Notes</Text>
                        <TextInput
                          style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]}
                          multiline
                          placeholder="Preferred branch address or initial deposit preferences..."
                          placeholderTextColor={Colors.textLight}
                          value={baNotes}
                          onChangeText={setBaNotes}
                        />
                      </View>
                    </>
                  )}

                  {/* JOB FIELDS */}
                  {selectedCategory === 'Job' && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Hiring Company Name *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={jobCompany}
                          onChangeText={setJobCompany}
                          placeholder="e.g. Tata Consultancy Services (TCS)"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Job Role / Designation *</Text>
                        <TextInput
                          style={styles.inputField}
                          value={jobRole}
                          onChangeText={setJobRole}
                          placeholder="e.g. Associate Software Engineer"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Industry Sector</Text>
                        <View style={styles.optionPillRow}>
                          {['IT / Software', 'Core Engineering', 'Banking / Finance', 'EdTech', 'Operations'].map((sec) => (
                            <TouchableOpacity
                              key={sec}
                              style={[styles.selectorPill, jobSector === sec && styles.selectorPillActive]}
                              onPress={() => setJobSector(sec)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, jobSector === sec && styles.selectorPillTextActive]}>{sec}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Candidate Highest Qualification</Text>
                        <View style={styles.optionPillRow}>
                          {['B.E. / B.Tech', 'MBA', 'MCA', 'B.Sc / M.Sc', 'Any Graduate'].map((q) => (
                            <TouchableOpacity
                              key={q}
                              style={[styles.selectorPill, jobQualification === q && styles.selectorPillActive]}
                              onPress={() => setJobQualification(q)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, jobQualification === q && styles.selectorPillTextActive]}>{q}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Experience Level</Text>
                        <View style={styles.optionPillRow}>
                          {['Fresher (0-1 yr)', '1 - 3 Years', '3 - 5 Years', '5+ Years'].map((exp) => (
                            <TouchableOpacity
                              key={exp}
                              style={[styles.selectorPill, jobExperience === exp && styles.selectorPillActive]}
                              onPress={() => setJobExperience(exp)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.selectorPillText, jobExperience === exp && styles.selectorPillTextActive]}>{exp}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Preferred Work Location</Text>
                        <TextInput
                          style={styles.inputField}
                          value={jobLocation}
                          onChangeText={setJobLocation}
                          placeholder="e.g. Chennai, Bangalore, Hyderabad"
                          placeholderTextColor={Colors.textLight}
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Candidate Notes & Portfolio Links</Text>
                        <TextInput
                          style={[styles.inputField, { height: 70, textAlignVertical: 'top' }]}
                          multiline
                          placeholder="GitHub portfolio, LinkedIn link, notice period details..."
                          placeholderTextColor={Colors.textLight}
                          value={jobNotes}
                          onChangeText={setJobNotes}
                        />
                      </View>
                    </>
                  )}

                  {/* Form Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={styles.secondaryActionButton}
                      onPress={() => setFormStep(1)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryActionButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryActionButton, { flex: 1 }]}
                      onPress={handleNextStep}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.primaryActionButtonText}>Review Submission →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 3: REVIEW & SUBMIT */}
              {formStep === 3 && (
                <View style={styles.card}>
                  <Text style={styles.cardHeaderTitle}>Step 3: Review & Submit</Text>
                  <Text style={styles.cardHeaderSubtitle}>
                    Please double-check the referral details before sending to central verification ledger
                  </Text>

                  {/* Summary Box */}
                  <View style={styles.reviewSummaryBox}>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Category:</Text>
                      <Text style={styles.reviewValue}>{selectedCategory}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Applicant Name:</Text>
                      <Text style={styles.reviewValue}>{applicantName}</Text>
                    </View>
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Mobile Number:</Text>
                      <Text style={styles.reviewValue}>+91 {applicantPhone}</Text>
                    </View>
                    {applicantEmail ? (
                      <View style={styles.reviewRow}>
                        <Text style={styles.reviewLabel}>Email:</Text>
                        <Text style={styles.reviewValue}>{applicantEmail}</Text>
                      </View>
                    ) : null}
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Location:</Text>
                      <Text style={styles.reviewValue}>{applicantCity || 'Not specified'}</Text>
                    </View>

                    {/* Specific details summary */}
                    {selectedCategory === 'Credit Card' && (
                      <>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Bank / Partner:</Text>
                          <Text style={styles.reviewValue}>{ccBank}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Card Product:</Text>
                          <Text style={styles.reviewValue}>{ccProduct}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Employment:</Text>
                          <Text style={styles.reviewValue}>{ccEmployment}</Text>
                        </View>
                      </>
                    )}

                    {selectedCategory === 'Insurance' && (
                      <>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Provider:</Text>
                          <Text style={styles.reviewValue}>{insProvider}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Plan / Type:</Text>
                          <Text style={styles.reviewValue}>{insPlan} ({insType})</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Sum Insured:</Text>
                          <Text style={styles.reviewValue}>{insSumTier}</Text>
                        </View>
                      </>
                    )}

                    {selectedCategory === 'Bank Account' && (
                      <>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Bank:</Text>
                          <Text style={styles.reviewValue}>{baBank}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Account Type:</Text>
                          <Text style={styles.reviewValue}>{baAccountType}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Product:</Text>
                          <Text style={styles.reviewValue}>{baProduct}</Text>
                        </View>
                      </>
                    )}

                    {selectedCategory === 'Job' && (
                      <>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Company:</Text>
                          <Text style={styles.reviewValue}>{jobCompany}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Role:</Text>
                          <Text style={styles.reviewValue}>{jobRole}</Text>
                        </View>
                        <View style={styles.reviewRow}>
                          <Text style={styles.reviewLabel}>Qualification:</Text>
                          <Text style={styles.reviewValue}>{jobQualification}</Text>
                        </View>
                      </>
                    )}

                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewLabel}>Consent Status:</Text>
                      <Text style={[styles.reviewValue, { color: Colors.successText }]}>✓ Explicit Consent Confirmed</Text>
                    </View>
                  </View>

                  {/* Previous / Submit Buttons */}
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                    <TouchableOpacity
                      style={styles.secondaryActionButton}
                      onPress={() => setFormStep(2)}
                      disabled={submitting}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryActionButtonText}>← Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryActionButton, { flex: 1 }]}
                      onPress={handleSubmitReferral}
                      disabled={submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator color={Colors.textWhite} size="small" />
                      ) : (
                        <Text style={styles.primaryActionButtonText}>Submit Referral Lead 🚀</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 3: MY SUBMISSIONS & TRACKING
  // --------------------------------------------------------------------------
  const renderSubmissionsScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.categoryTopBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back to Referral Hub</Text>
          </TouchableOpacity>
          <Text style={styles.categoryPageTitle}>My Referral Submissions</Text>
          <Text style={styles.categoryPageSubtitle}>
            Track real-time KYC, underwriter verification, and approved incentive payouts.
          </Text>

          {/* Search Box */}
          <View style={styles.searchBarContainer}>
            <Text style={styles.searchIconEmoji}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by candidate name, code, or bank..."
              placeholderTextColor={Colors.textLight}
              value={subSearchQuery}
              onChangeText={setSubSearchQuery}
            />
            {subSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSubSearchQuery('')}>
                <Text style={{ color: Colors.textMuted, fontSize: 13, paddingHorizontal: 4 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillRow}>
            {['All', 'Credit Card', 'Insurance', 'Job', 'Bank Account'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.filterChip, subCategoryFilter === c && styles.filterChipActive]}
                onPress={() => setSubCategoryFilter(c)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, subCategoryFilter === c && styles.filterChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Status Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filterPillRow, { marginTop: 6 }]}>
            {['All', 'Submitted', 'In Progress', 'Successful', 'Rejected'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, subStatusFilter === s && styles.filterChipActive]}
                onPress={() => setSubStatusFilter(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, subStatusFilter === s && styles.filterChipTextActive]}>
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submissions List */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {filteredSubmissions.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateEmoji}>📋</Text>
              <Text style={styles.emptyStateTitle}>No Referrals Found</Text>
              <Text style={styles.emptyStateSubtitle}>
                {subSearchQuery || subCategoryFilter !== 'All' || subStatusFilter !== 'All'
                  ? 'No submissions match your active filter criteria.'
                  : 'You have not submitted any referrals yet. Select a category from the Hub to begin!'}
              </Text>
              <TouchableOpacity
                style={[styles.primaryActionButton, { marginTop: 14 }]}
                onPress={() => setCurrentScreen('home')}
              >
                <Text style={styles.primaryActionButtonText}>Explore Referral Categories</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredSubmissions.map((item) => {
                const statusStyle = getStatusBadgeStyle(item.status);
                const applicant =
                  item.creditCardDetails?.applicantName ||
                  item.insuranceDetails?.applicantName ||
                  item.bankAccountDetails?.applicantName ||
                  item.jobDetails?.candidateName ||
                  'Applicant';
                const partner =
                  item.creditCardDetails?.bankName ||
                  item.insuranceDetails?.provider ||
                  item.bankAccountDetails?.bankName ||
                  item.jobDetails?.companyName ||
                  item.category;
                const product =
                  item.creditCardDetails?.cardName ||
                  item.insuranceDetails?.selectedOffering ||
                  item.bankAccountDetails?.accountProduct ||
                  item.jobDetails?.jobRole ||
                  'Referral Lead';

                const incentiveAmt = item.incentiveAmount || item.incentiveRecord?.amount || 0;
                const incStatus = item.incentiveStatus || item.incentiveRecord?.status || 'Pending Verification';

                return (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.submissionCard}
                    activeOpacity={0.85}
                    onPress={() => setSelectedSubmission(item)}
                  >
                    {/* Top Row: Code + Category Pill + Status */}
                    <View style={styles.subCardTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.subRefCode}>{item.referralCode}</Text>
                        <View style={styles.subCatPill}>
                          <Text style={styles.subCatPillText}>{item.category}</Text>
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Middle Details: Applicant & Partner */}
                    <Text style={styles.subApplicantName}>{applicant}</Text>
                    <Text style={styles.subPartnerLine}>{partner} • {product}</Text>

                    {/* Bottom Row: Date + Incentive Tag + Details Action */}
                    <View style={styles.subCardBottomRow}>
                      <Text style={styles.subDateText}>
                        📅 {new Date(item.createdAt).toLocaleDateString('en-GB')}
                      </Text>
                      <View style={styles.incentiveTag}>
                        <Text style={styles.incentiveTagText}>
                          {incentiveAmt > 0 ? `₹${incentiveAmt} (${incStatus})` : `Incentive: ${incStatus}`}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // SCREEN 4: INCENTIVES & RULES
  // --------------------------------------------------------------------------
  const renderRulesScreen = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Header Bar */}
        <View style={styles.categoryTopBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('home')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>← Back to Referral Hub</Text>
          </TouchableOpacity>
          <Text style={styles.categoryPageTitle}>Incentives & Rules Policy</Text>
          <Text style={styles.categoryPageSubtitle}>
            Approved institutional rate cards, qualifying milestones, and disbursement timelines.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {/* Rate Cards by Category */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Approved Incentive Rate Cards</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Rewards are disbursed following partner reconciliation and verified milestone completion.
            </Text>

            <View style={{ gap: 10, marginTop: 6 }}>
              {[
                { cat: 'Credit Card', reward: 'Up to ₹1,500', milestone: 'Physical Card Dispatch & First Transaction within 30 days', icon: '💳' },
                { cat: 'Insurance', reward: 'Up to ₹2,500', milestone: 'Policy Issuance & Free-Look Period Completion', icon: '🛡️' },
                { cat: 'Job Referral', reward: 'Up to ₹4,000', milestone: 'Candidate Joining & 30-Day Retention Verification', icon: '💼' },
                { cat: 'Bank Account', reward: 'Up to ₹600', milestone: 'Account Opening & Initial Funding / Active UPI Setup', icon: '🏦' },
              ].map((rc) => (
                <View key={rc.cat} style={styles.rateCardRow}>
                  <View style={styles.rateCardIconBox}>
                    <Text style={{ fontSize: 20 }}>{rc.icon}</Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.rateCardTitle}>{rc.cat}</Text>
                      <Text style={styles.rateCardAmount}>{rc.reward}</Text>
                    </View>
                    <Text style={styles.rateCardMilestone}>Milestone: {rc.milestone}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Dynamic Backend Rules Table (if seeded/configured in DB) */}
          {rules.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardHeaderTitle}>Institutional Policy Directives</Text>
              <Text style={styles.cardHeaderSubtitle}>Central rules fetched directly from college database</Text>

              <View style={{ gap: 8, marginTop: 8 }}>
                {rules.map((r, idx) => (
                  <View key={idx} style={styles.ruleItemBox}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.ruleCodeTitle}>{r.category} ({r.ruleCode || 'POLICY'})</Text>
                      <Text style={styles.ruleAmountBadge}>
                        {r.baseAmount ? `₹${r.baseAmount}` : (r.rewardType || 'Approved Rate')}
                      </Text>
                    </View>
                    <Text style={styles.ruleDescText}>{r.terms || r.eligibilityConditions || 'Applicable to authorized campus members.'}</Text>
                    {r.payoutTimeline && (
                      <Text style={styles.ruleTimelineText}>⏱️ Settlement: {r.payoutTimeline}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* General Compliance Rules */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>Important Terms & Anti-Fraud Rules</Text>
            <View style={styles.guidelineBulletList}>
              <Text style={styles.bulletItem}>
                <Text style={{ fontWeight: '700' }}>1. 90-Day Duplicate Block: </Text>
                Referrals for the same applicant and same partner bank/institution within a 90-day window are blocked to prevent fraudulent multiple submissions.
              </Text>
              <Text style={styles.bulletItem}>
                <Text style={{ fontWeight: '700' }}>2. Explicit Consent: </Text>
                The referrer must obtain consent from the applicant before sharing their contact details. Telemarketing spam or unauthorized leads will result in account suspension.
              </Text>
              <Text style={styles.bulletItem}>
                <Text style={{ fontWeight: '700' }}>3. Payout Processing: </Text>
                Incentives are verified by the institutional accounts committee and credited directly to student fee ledgers or staff bank accounts during monthly settlement cycles.
              </Text>
              <Text style={styles.bulletItem}>
                <Text style={{ fontWeight: '700' }}>4. Underwriter Discretion: </Text>
                Final approval of credit cards, insurance underwriting, employment, and bank accounts rests solely with partner institutions based on credit and KYC criteria.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // --------------------------------------------------------------------------
  // MODALS: SUBMISSION SUCCESS & DETAIL VIEW
  // --------------------------------------------------------------------------
  return (
    <View style={styles.mainContainer}>
      {/* Active Screen Render */}
      {currentScreen === 'home' && renderHomeScreen()}
      {currentScreen === 'category' && renderCategoryScreen()}
      {currentScreen === 'submissions' && renderSubmissionsScreen()}
      {currentScreen === 'rules' && renderRulesScreen()}

      {/* 1. SUCCESS CONFIRMATION MODAL */}
      <Modal
        visible={Boolean(lastSubmittedReferral)}
        transparent
        animationType="fade"
        onRequestClose={() => setLastSubmittedReferral(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successModalCard}>
            <View style={styles.successEmojiCircle}>
              <Text style={{ fontSize: 36 }}>🎉</Text>
            </View>
            <Text style={styles.successModalTitle}>Lead Successfully Registered!</Text>
            <Text style={styles.successModalSubtitle}>
              Your {lastSubmittedReferral?.category} referral has been recorded in the central ERP verification ledger.
            </Text>

            <View style={styles.refCodeBadgeBox}>
              <Text style={styles.refCodeBadgeLabel}>UNIQUE TRACKING CODE</Text>
              <Text style={styles.refCodeBadgeValue}>{lastSubmittedReferral?.referralCode || 'REF-CONFIRMED'}</Text>
            </View>

            <Text style={styles.successExplanation}>
              Our institutional verification committee and authorized partner representative will review this submission. You can track progress in real-time under My Submissions.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.secondaryActionButton, { flex: 1 }]}
                onPress={() => setLastSubmittedReferral(null)}
              >
                <Text style={styles.secondaryActionButtonText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionButton, { flex: 1 }]}
                onPress={() => {
                  setLastSubmittedReferral(null);
                  setCurrentScreen('submissions');
                }}
              >
                <Text style={styles.primaryActionButtonText}>View Submissions →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. SUBMISSION DETAIL VIEW MODAL */}
      <Modal
        visible={Boolean(selectedSubmission)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSubmission(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModalCard}>
            {selectedSubmission && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.detailModalHeader}>
                  <View>
                    <Text style={styles.detailModalTitle}>Referral Details</Text>
                    <Text style={styles.detailModalCode}>{selectedSubmission.referralCode}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedSubmission(null)} style={styles.detailCloseBtn}>
                    <Text style={styles.detailCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Status Badge Row */}
                <View style={styles.detailStatusRow}>
                  {(() => {
                    const st = getStatusBadgeStyle(selectedSubmission.status);
                    return (
                      <View style={[styles.statusBadge, { backgroundColor: st.bg, borderColor: st.border }]}>
                        <Text style={[styles.statusBadgeText, { color: st.text }]}>{selectedSubmission.status}</Text>
                      </View>
                    );
                  })()}
                  <Text style={styles.detailDateText}>
                    Submitted on {new Date(selectedSubmission.createdAt).toLocaleDateString('en-GB')}
                  </Text>
                </View>

                {/* Section 1: Applicant Information */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionHeader}>Applicant Information</Text>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Full Name:</Text>
                    <Text style={styles.detailGridVal}>
                      {selectedSubmission.creditCardDetails?.applicantName ||
                        selectedSubmission.insuranceDetails?.applicantName ||
                        selectedSubmission.bankAccountDetails?.applicantName ||
                        selectedSubmission.jobDetails?.candidateName ||
                        'Applicant'}
                    </Text>
                  </View>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Phone:</Text>
                    <Text style={styles.detailGridVal}>
                      {selectedSubmission.creditCardDetails?.applicantPhone ||
                        selectedSubmission.insuranceDetails?.applicantPhone ||
                        selectedSubmission.bankAccountDetails?.applicantPhone ||
                        selectedSubmission.jobDetails?.candidatePhone ||
                        'Confidential'}
                    </Text>
                  </View>
                  {(selectedSubmission.creditCardDetails?.applicantEmail ||
                    selectedSubmission.insuranceDetails?.applicantEmail ||
                    selectedSubmission.bankAccountDetails?.applicantEmail ||
                    selectedSubmission.jobDetails?.candidateEmail) && (
                    <View style={styles.detailGridRow}>
                      <Text style={styles.detailGridLabel}>Email:</Text>
                      <Text style={styles.detailGridVal}>
                        {selectedSubmission.creditCardDetails?.applicantEmail ||
                          selectedSubmission.insuranceDetails?.applicantEmail ||
                          selectedSubmission.bankAccountDetails?.applicantEmail ||
                          selectedSubmission.jobDetails?.candidateEmail}
                      </Text>
                    </View>
                  )}
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>City / Location:</Text>
                    <Text style={styles.detailGridVal}>
                      {selectedSubmission.creditCardDetails?.applicantCity ||
                        selectedSubmission.insuranceDetails?.applicantCity ||
                        selectedSubmission.bankAccountDetails?.city ||
                        selectedSubmission.jobDetails?.candidateCity ||
                        'Tamil Nadu'}
                    </Text>
                  </View>
                </View>

                {/* Section 2: Program & Product Specifications */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionHeader}>Program Specifications</Text>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Category:</Text>
                    <Text style={styles.detailGridVal}>{selectedSubmission.category}</Text>
                  </View>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Partner / Bank:</Text>
                    <Text style={styles.detailGridVal}>
                      {selectedSubmission.creditCardDetails?.bankName ||
                        selectedSubmission.insuranceDetails?.provider ||
                        selectedSubmission.bankAccountDetails?.bankName ||
                        selectedSubmission.jobDetails?.companyName ||
                        selectedSubmission.category}
                    </Text>
                  </View>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Selected Product:</Text>
                    <Text style={styles.detailGridVal}>
                      {selectedSubmission.creditCardDetails?.cardName ||
                        selectedSubmission.insuranceDetails?.selectedOffering ||
                        selectedSubmission.bankAccountDetails?.accountProduct ||
                        selectedSubmission.jobDetails?.jobRole ||
                        'Standard Offering'}
                    </Text>
                  </View>
                </View>

                {/* Section 3: Incentive Tracking */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionHeader}>Incentive Audit</Text>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Reward Amount:</Text>
                    <Text style={[styles.detailGridVal, { color: Colors.successText, fontWeight: '800' }]}>
                      {selectedSubmission.incentiveAmount ? `₹${selectedSubmission.incentiveAmount}` : 'Calculated upon milestone qualification'}
                    </Text>
                  </View>
                  <View style={styles.detailGridRow}>
                    <Text style={styles.detailGridLabel}>Payout Status:</Text>
                    <Text style={styles.detailGridVal}>
                      {selectedSubmission.incentiveStatus || selectedSubmission.incentiveRecord?.status || 'Pending Verification'}
                    </Text>
                  </View>
                </View>

                {/* Close Button */}
                <TouchableOpacity
                  style={[styles.primaryActionButton, { marginTop: 14 }]}
                  onPress={() => setSelectedSubmission(null)}
                >
                  <Text style={styles.primaryActionButtonText}>Close Details</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Hero Card
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroEyebrow: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
    color: '#93C5FD',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: Typography.sizes.titleLarge,
    fontWeight: Typography.weights.heavy,
    color: Colors.textWhite,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: Typography.sizes.caption,
    color: '#E0E7FF',
    lineHeight: 18,
  },
  heroIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  heroIconEmoji: {
    fontSize: 24,
  },

  // KPI Bar
  kpiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: '#BFDBFE',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: Typography.weights.heavy,
    color: Colors.textWhite,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.titleMedium,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  sectionDesc: {
    fontSize: Typography.sizes.caption,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // 4 Category Cards
  categoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  categoryCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconEmoji: {
    fontSize: 24,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  rewardPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  rewardPillText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
  },
  categoryCardDesc: {
    fontSize: Typography.sizes.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  categoryCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  partnerListText: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
    flex: 1,
    marginRight: 8,
  },
  categoryCardActionText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
    flexShrink: 0,
  },

  // 2 Shortcuts
  shortcutsBox: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  shortcutsHeader: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  shortcutIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutEmoji: {
    fontSize: 18,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  shortcutSubtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
    marginVertical: 4,
  },
  shortcutLink: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
    marginTop: 2,
  },

  // Compliance Notice
  complianceNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: Spacing.xs,
  },
  complianceEmoji: {
    fontSize: 20,
  },
  complianceTitle: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  complianceText: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
    marginTop: 1,
  },

  // Category Top Bar
  categoryTopBar: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 6,
    paddingVertical: 2,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPageTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  categoryPageSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // 3 Category Tabs Bar
  categoryTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    padding: 3,
    marginTop: 4,
    marginBottom: 6,
  },
  categoryTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  categoryTabBtnActive: {
    backgroundColor: Colors.surface,
    ...Shadows.sm,
  },
  categoryTabBtnText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  categoryTabBtnTextActive: {
    color: Colors.primaryAccent,
    fontWeight: Typography.weights.heavy,
  },

  // Generic Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 10,
  },

  // Info Row Grid
  infoRowGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  infoRowItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRowLabel: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  infoRowVal: {
    fontSize: 11,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginTop: 2,
  },

  // Step Timeline
  stepTimelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  stepDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 1,
  },

  // Guidelines Bullet List
  guidelineBulletList: {
    gap: 6,
    marginVertical: 6,
  },
  bulletItem: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Action Buttons
  primaryActionButton: {
    backgroundColor: Colors.primaryAccent,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryActionButtonText: {
    color: Colors.textWhite,
    fontSize: 13,
    fontWeight: Typography.weights.heavy,
  },
  secondaryActionButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  secondaryActionButtonText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: Typography.weights.bold,
  },

  // Offers Tab
  offersHeaderBox: {
    marginBottom: Spacing.sm,
  },
  offersHeaderTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  offersHeaderDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  offerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  offerCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offerPartnerName: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
    textTransform: 'uppercase',
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  offerRewardBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  offerRewardText: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: '#15803D',
  },
  offerRewardSub: {
    fontSize: 8,
    fontWeight: Typography.weights.bold,
    color: '#16A34A',
  },
  offerMetaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  offerMetaPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  offerMetaPillText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  offerPerksBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: Radius.sm,
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  offerPerksLabel: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#1E40AF',
    marginBottom: 2,
  },
  offerPerksText: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
  offerEligibilityText: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 6,
  },
  offerDocsText: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  referOfferButton: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  referOfferButtonText: {
    color: Colors.primaryAccent,
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
  },

  // Multi-Step Form Stepper
  stepperContainer: {
    marginBottom: Spacing.sm,
    paddingHorizontal: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCircleActive: {
    backgroundColor: Colors.primaryAccent,
  },
  stepperCircleText: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: '#64748B',
  },
  stepperCircleTextActive: {
    color: Colors.textWhite,
  },
  stepperLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  stepperLineActive: {
    backgroundColor: Colors.primaryAccent,
  },
  stepperLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepperLabel: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  stepperLabelActive: {
    color: Colors.primaryAccent,
    fontWeight: Typography.weights.heavy,
  },

  // Form Inputs
  formGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  optionPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  selectorPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorPillActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryAccent,
  },
  selectorPillText: {
    fontSize: 11,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
  },
  selectorPillTextActive: {
    color: Colors.primaryAccent,
    fontWeight: Typography.weights.heavy,
  },

  // Consent Row
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    backgroundColor: Colors.surface,
  },
  checkboxSquareActive: {
    backgroundColor: Colors.primaryAccent,
    borderColor: Colors.primaryAccent,
  },
  checkboxCheckText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '900',
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },

  // Review Summary
  reviewSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reviewLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  reviewValue: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },

  // Submissions Screen
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    height: 38,
    marginTop: 8,
  },
  searchIconEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  filterPillRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.primaryAccent,
    borderColor: Colors.primaryAccent,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textWhite,
  },

  // Submission Card
  submissionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    ...Shadows.sm,
  },
  subCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subRefCode: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
  },
  subCatPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subCatPillText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.heavy,
  },
  subApplicantName: {
    fontSize: 15,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  subPartnerLine: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  subCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subDateText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  incentiveTag: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  incentiveTagText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: '#16A34A',
  },

  // Empty State
  emptyStateBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  // Rates & Rules
  rateCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rateCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateCardTitle: {
    fontSize: 13,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  rateCardAmount: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: '#15803D',
  },
  rateCardMilestone: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
    marginTop: 1,
  },
  ruleItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ruleCodeTitle: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  ruleAmountBadge: {
    fontSize: 11,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
  },
  ruleDescText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  ruleTimelineText: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.lg,
  },
  successEmojiCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  successModalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  refCodeBadgeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 14,
    width: '100%',
  },
  refCodeBadgeLabel: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  refCodeBadgeValue: {
    fontSize: 18,
    fontWeight: Typography.weights.heavy,
    color: Colors.primaryAccent,
    marginTop: 2,
  },
  successExplanation: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Detail Modal
  detailModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.lg,
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailModalTitle: {
    fontSize: 16,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
  },
  detailModalCode: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryAccent,
    marginTop: 1,
  },
  detailCloseBtn: {
    padding: 6,
  },
  detailCloseBtnText: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '800',
  },
  detailStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 10,
  },
  detailDateText: {
    fontSize: 11,
    color: Colors.textLight,
  },
  detailSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailSectionHeader: {
    fontSize: 12,
    fontWeight: Typography.weights.heavy,
    color: Colors.textPrimary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  detailGridLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  detailGridVal: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
});
