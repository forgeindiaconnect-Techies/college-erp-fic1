import express from 'express';
import ReferralFormConfig from '../models/ReferralFormConfig.js';
import ReferralConfigAudit from '../models/ReferralConfigAudit.js';
import Opportunity from '../models/Opportunity.js';
import PlacementJob from '../models/PlacementJob.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── Default Seed Data Definitions ──────────────────────────────────────────
export const getDefaultSeedConfig = (category) => {
  switch (category) {
    case 'Credit Card':
      return {
        category: 'Credit Card',
        displayName: 'Credit Card Referral',
        description: 'Verified partner banks, credit card products, eligibility rules, and applicant details.',
        isActive: true,
        partners: [
          {
            id: 'bank-hdfc',
            name: 'HDFC Bank',
            code: 'HDFC',
            logo: 'Building2',
            website: 'https://www.hdfcbank.com',
            isActive: true,
            sortOrder: 1,
            products: [
              {
                id: 'prod-hdfc-millennia',
                name: 'Millennia Cashback Credit Card',
                productCategory: 'Cashback',
                eligibilityConditions: 'Min monthly income ₹25,000 (Salaried) or ₹6 LPA ITR. Age 21-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Latest 3 Months Salary Slip'],
                annualFee: '₹1,000 (Waived on ₹1L annual spend)',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-hdfc-regalia',
                name: 'Regalia Gold Credit Card',
                productCategory: 'Rewards & Travel',
                eligibilityConditions: 'Min monthly income ₹1,00,000 (Salaried) or ₹12 LPA ITR. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Income Tax Return / Salary Slip'],
                annualFee: '₹2,500 (Waived on ₹4L annual spend)',
                turnaroundTime: '3-5 business days',
                isActive: true,
                sortOrder: 2
              },
              {
                id: 'prod-hdfc-moneyback',
                name: 'MoneyBack+ Credit Card',
                productCategory: 'Everyday Rewards',
                eligibilityConditions: 'Min monthly income ₹20,000 (Salaried). Age 21-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: '₹500 (Waived on ₹50,000 annual spend)',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 3
              },
              {
                id: 'prod-hdfc-freedom',
                name: 'Freedom RuPay Credit Card',
                productCategory: 'UPI & Cashback',
                eligibilityConditions: 'Min monthly income ₹15,000. UPI enabled card. Age 21-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: '₹500 (Waived on ₹50,000 annual spend)',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 4
              }
            ]
          },
          {
            id: 'bank-icici',
            name: 'ICICI Bank',
            code: 'ICICI',
            logo: 'Building2',
            website: 'https://www.icicibank.com',
            isActive: true,
            sortOrder: 2,
            products: [
              {
                id: 'prod-icici-coral',
                name: 'Coral Contactless Credit Card',
                productCategory: 'Lifestyle',
                eligibilityConditions: 'Min monthly income ₹30,000. Age 21-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Salary Slip'],
                annualFee: '₹500 (Waived on ₹1.5L annual spend)',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-icici-amazon',
                name: 'Amazon Pay ICICI Card',
                productCategory: 'Cashback',
                eligibilityConditions: 'Active Amazon account + min income ₹20,000. Age 21-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: 'Lifetime Free (Zero joining & annual fee)',
                turnaroundTime: '1-2 business days',
                isActive: true,
                sortOrder: 2
              },
              {
                id: 'prod-icici-rubyx',
                name: 'Rubyx Dual Credit Card',
                productCategory: 'Premium Dual',
                eligibilityConditions: 'Min monthly income ₹50,000. Age 23-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Latest Form 16'],
                annualFee: '₹3,000 (Waived on ₹3L annual spend)',
                turnaroundTime: '3-4 business days',
                isActive: true,
                sortOrder: 3
              },
              {
                id: 'prod-icici-platinum',
                name: 'Platinum Chip Card',
                productCategory: 'Lifetime Free',
                eligibilityConditions: 'Min monthly income ₹20,000. Age 21-60.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: 'Lifetime Free',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 4
              }
            ]
          },
          {
            id: 'bank-sbi',
            name: 'State Bank of India',
            code: 'SBI',
            logo: 'Building2',
            website: 'https://www.sbicard.com',
            isActive: true,
            sortOrder: 3,
            products: [
              {
                id: 'prod-sbi-simplyclick',
                name: 'SimplyCLICK SBI Card',
                productCategory: 'Online Shopping',
                eligibilityConditions: 'Min monthly income ₹20,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Salary Slip'],
                annualFee: '₹499 (Waived on ₹1L annual spend)',
                turnaroundTime: '3-5 business days',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-sbi-simplysave',
                name: 'SimplySAVE SBI Card',
                productCategory: 'Dining & Movies',
                eligibilityConditions: 'Min monthly income ₹20,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'Bank Statement'],
                annualFee: '₹499 (Waived on ₹1L annual spend)',
                turnaroundTime: '3-5 business days',
                isActive: true,
                sortOrder: 2
              },
              {
                id: 'prod-sbi-prime',
                name: 'SBI Card PRIME',
                productCategory: 'Premium Rewards',
                eligibilityConditions: 'Min monthly income ₹60,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card', 'ITR / Salary Slip'],
                annualFee: '₹2,999 + GST',
                turnaroundTime: '3-5 business days',
                isActive: true,
                sortOrder: 3
              },
              {
                id: 'prod-sbi-pulse',
                name: 'Pulse Health & Fitness Card',
                productCategory: 'Wellness',
                eligibilityConditions: 'Min monthly income ₹35,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: '₹1,499 (Includes Fitpass membership)',
                turnaroundTime: '3-5 business days',
                isActive: true,
                sortOrder: 4
              }
            ]
          },
          {
            id: 'bank-axis',
            name: 'Axis Bank',
            code: 'AXIS',
            logo: 'Building2',
            website: 'https://www.axisbank.com',
            isActive: true,
            sortOrder: 4,
            products: [
              {
                id: 'prod-axis-neo',
                name: 'Neo Credit Card',
                productCategory: 'Shopping & Dining',
                eligibilityConditions: 'Min monthly income ₹20,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: '₹250 (Waived on ₹25,000 spend)',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-axis-myzone',
                name: 'My Zone Credit Card',
                productCategory: 'Entertainment & OTT',
                eligibilityConditions: 'Min monthly income ₹25,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Salary Slip'],
                annualFee: '₹500 (Free SonyLIV subscription)',
                turnaroundTime: '2-3 business days',
                isActive: true,
                sortOrder: 2
              },
              {
                id: 'prod-axis-flipkart',
                name: 'Flipkart Axis Bank Card',
                productCategory: 'Cashback',
                eligibilityConditions: 'Min monthly income ₹25,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Salary Slip'],
                annualFee: '₹500 (Waived on ₹3.5L annual spend)',
                turnaroundTime: '2-4 business days',
                isActive: true,
                sortOrder: 3
              },
              {
                id: 'prod-axis-ace',
                name: 'ACE Cashback Credit Card',
                productCategory: 'Utility & Bill Pay',
                eligibilityConditions: 'Min monthly income ₹25,000. Age 21-65.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: '₹499 (Waived on ₹2L annual spend)',
                turnaroundTime: '2-4 business days',
                isActive: true,
                sortOrder: 4
              }
            ]
          }
        ],
        categoriesList: ['Cashback', 'Rewards & Travel', 'Lifestyle', 'Shopping', 'Wellness', 'Lifetime Free'],
        status: 'published',
        version: 1,
        fieldsConfig: [
          { fieldKey: 'applicantName', label: 'Applicant Full Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'e.g. Ramesh Kumar', validationRule: 'minLength:2' },
          { fieldKey: 'applicantPhone', label: 'Mobile Number', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: '10-digit mobile number', validationRule: 'phone' },
          { fieldKey: 'applicantEmail', label: 'Email Address', fieldType: 'email', step: 1, isRequired: false, isVisible: true, isSystem: false, placeholder: 'name@example.com', validationRule: 'email' },
          { fieldKey: 'city', label: 'City / Campus Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: false, placeholder: 'e.g. Bangalore, Chennai, Hyderabad' },
          { fieldKey: 'employmentType', label: 'Employment Status', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['Salaried', 'Self-Employed', 'Student', 'Professional', 'Other'] },
          { fieldKey: 'bankName', label: 'Verified Partner Bank', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'cardProduct', label: 'Approved Card / Product Variant', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'referralSource', label: 'Referral Channel / Source', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: false, options: ['Campus Drive', 'Alumni Referral', 'Staff Reference', 'Student Network', 'Direct Recommendation', 'Other'] },
          { fieldKey: 'partnerReferenceNumber', label: 'Partner Reference # (Optional)', fieldType: 'text', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'e.g. Lead ID, Branch Employee Code' },
          { fieldKey: 'notes', label: 'Referral Notes / Branch Preference (Optional)', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'Add any specific context or preferred branch for the applicant...' }
        ],
        generalSettings: {
          allowPartnerReference: true,
          consentNoticeVersion: 'v2.4-FIC-CC-CONSENT',
          consentText: 'I confirm that the applicant has explicitly consented to sharing their details with the selected banking partner for credit card pre-screening and processing under RBI guidelines.',
          submissionNotice: 'Verified Institutional Banking Partner Program: Applications are routed securely to partner loan origination systems.',
          defaultPartner: 'HDFC Bank'
        }
      };

    case 'Insurance':
      return {
        category: 'Insurance',
        displayName: 'Insurance Referral',
        description: 'IRDAI-regulated insurance partners, product categories (Health, Motor, Life, Property), and policies.',
        isActive: true,
        partners: [
          {
            id: 'ins-star-health',
            name: 'Star Health & Allied Insurance',
            code: 'STAR',
            category: 'Health',
            website: 'https://www.starhealth.in',
            isActive: true,
            sortOrder: 1,
            products: [
              {
                id: 'prod-star-family-floater',
                name: 'Comprehensive Family Floater Plan',
                productCategory: 'Health',
                eligibilityConditions: 'Age 18-65 for adults, 91 days to 25 yrs for dependent children. Pre-medical checkup as per age band.',
                requiredDocuments: ['KYC (PAN & Aadhaar)', 'Existing Medical History Declaration'],
                annualFee: 'Premium based on age & sum insured',
                turnaroundTime: 'Same-day digital policy issuance',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-star-senior-red-carpet',
                name: 'Senior Citizen Red Carpet Health Plan',
                productCategory: 'Health',
                eligibilityConditions: 'Entry age 60-75 years. No pre-acceptance medical screening required.',
                requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Address Proof'],
                annualFee: 'Premium based on sum insured',
                turnaroundTime: '24 hours',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'ins-hdfc-ergo',
            name: 'HDFC ERGO General Insurance',
            code: 'HDFCERGO',
            category: 'Health / Motor',
            website: 'https://www.hdfcergo.com',
            isActive: true,
            sortOrder: 2,
            products: [
              {
                id: 'prod-ergo-optima-secure',
                name: 'Optima Secure Hospitalization Shield',
                productCategory: 'Health',
                eligibilityConditions: 'Age 18-65. 4X coverage benefit automatically after 2 years.',
                requiredDocuments: ['PAN Card', 'Aadhaar Card'],
                annualFee: 'Annual / Multi-year premium',
                turnaroundTime: 'Instant issuance',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-ergo-car-protect',
                name: 'Comprehensive Car Protect (Zero-Depreciation)',
                productCategory: 'Motor',
                eligibilityConditions: 'Valid RC book and active driver license.',
                requiredDocuments: ['Vehicle RC', 'Previous Policy Copy'],
                annualFee: 'Calculated via IDV',
                turnaroundTime: 'Instant issuance',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'ins-icici-lombard',
            name: 'ICICI Lombard General Insurance',
            code: 'ICICILOMBARD',
            category: 'Motor / Property',
            website: 'https://www.icicilombard.com',
            isActive: true,
            sortOrder: 3,
            products: [
              {
                id: 'prod-lombard-tw-safety',
                name: 'Two-Wheeler Comprehensive Safety Cover',
                productCategory: 'Motor',
                eligibilityConditions: 'Registered two-wheeler with valid engine/chassis number.',
                requiredDocuments: ['Vehicle RC Copy'],
                annualFee: 'Based on CC and age of vehicle',
                turnaroundTime: 'Instant digital policy',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-lombard-campus-property',
                name: 'Educational Campus Property Shield',
                productCategory: 'Property',
                eligibilityConditions: 'Campus buildings, laboratories, and hostel asset valuation.',
                requiredDocuments: ['Asset Register', 'Building Survey Report'],
                annualFee: 'Annual enterprise premium',
                turnaroundTime: '3-5 business days',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'ins-tata-aig',
            name: 'Tata AIG General Insurance',
            code: 'TATAAIG',
            category: 'Health / Motor',
            website: 'https://www.tataaig.com',
            isActive: true,
            sortOrder: 4,
            products: [
              {
                id: 'prod-tata-griha-raksha',
                name: 'Bharat Griha Raksha (Residential Home Protection)',
                productCategory: 'Property',
                eligibilityConditions: 'Home owners and tenant contents protection.',
                requiredDocuments: ['Property ownership / rental agreement'],
                annualFee: 'Standard IRDAI tariff',
                turnaroundTime: '24 hours',
                isActive: true,
                sortOrder: 1
              }
            ]
          },
          {
            id: 'ins-care-health',
            name: 'Care Health Insurance',
            code: 'CARE',
            category: 'Health',
            website: 'https://www.careinsurance.com',
            isActive: true,
            sortOrder: 5,
            products: [
              {
                id: 'prod-care-student-mediclaim',
                name: 'Campus Student Group Mediclaim',
                productCategory: 'Health',
                eligibilityConditions: 'Enrolled college students aged 16-28 years.',
                requiredDocuments: ['College Student ID', 'Aadhaar Card'],
                annualFee: 'Subsidized campus premium',
                turnaroundTime: 'Instant',
                isActive: true,
                sortOrder: 1
              }
            ]
          }
        ],
        categoriesList: ['Health', 'Motor', 'Life', 'Property'],
        status: 'published',
        version: 1,
        fieldsConfig: [
          { fieldKey: 'applicantName', label: 'Applicant / Policyholder Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'Full Name as per PAN' },
          { fieldKey: 'applicantPhone', label: 'Mobile Number', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: '10-digit mobile number' },
          { fieldKey: 'applicantEmail', label: 'Email Address', fieldType: 'email', step: 1, isRequired: false, isVisible: true, isSystem: false, placeholder: 'name@example.com' },
          { fieldKey: 'city', label: 'City / Residential Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: false, placeholder: 'e.g. Mumbai, Pune' },
          { fieldKey: 'insuranceCategory', label: 'Insurance Product Category', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true, options: ['Health', 'Motor', 'Life', 'Property'] },
          { fieldKey: 'insurerName', label: 'Preferred Underwriter / Insurer', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'productName', label: 'Insurance Policy Plan', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'sumInsured', label: 'Requested Sum Insured Tier', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: false, options: ['₹3,00,000 (3 Lakhs)', '₹5,00,000 (5 Lakhs)', '₹10,00,000 (10 Lakhs)', '₹25,00,000 (25 Lakhs)', '₹50,00,000 (50 Lakhs)', '₹1,00,00,000 (1 Crore)'] },
          { fieldKey: 'referralSource', label: 'Referral Channel', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: false, options: ['Direct Staff Reference', 'Campus Drive', 'Alumni Network', 'Student Inquiry', 'Other'] },
          { fieldKey: 'notes', label: 'Advisory Notes / Coverage Details', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'Add family details, vehicle number, or special coverage notes...' }
        ],
        generalSettings: {
          allowPartnerReference: true,
          consentNoticeVersion: 'v1.2-FIC-INS-CONSENT',
          consentText: 'I confirm that the applicant has agreed to be contacted by verified IRDAI-registered insurance advisory specialists.',
          submissionNotice: 'Insurance quotes are processed by IRDAI licensed underwriters and insurance aggregators.',
          defaultPartner: 'Star Health & Allied Insurance'
        }
      };

    case 'Job':
      return {
        category: 'Job',
        displayName: 'Job Referral',
        description: 'Corporate hiring partners, sectors, job roles, eligibility conditions, and recruitment pipelines.',
        isActive: true,
        partners: [
          {
            id: 'corp-tcs',
            name: 'Tata Consultancy Services (TCS)',
            code: 'TCS',
            category: 'IT / Software',
            website: 'https://www.tcs.com',
            isActive: true,
            sortOrder: 1,
            products: [
              {
                id: 'role-tcs-ase',
                name: 'Associate Software Engineer',
                productCategory: 'IT / Software',
                eligibilityConditions: 'B.E./B.Tech/MCA with min 60% aggregate and no active backlogs.',
                requiredDocuments: ['Updated Resume', 'Degree Certificate / Provisional', 'College ID'],
                annualFee: 'CTC: ₹3.6 LPA - ₹7.0 LPA',
                turnaroundTime: '1-2 weeks interview process',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'role-tcs-devops',
                name: 'Cloud Infrastructure / DevOps Associate',
                productCategory: 'IT / Software',
                eligibilityConditions: 'Knowledge of AWS/Azure, Docker, Linux. Min 65% aggregate.',
                requiredDocuments: ['Resume', 'Certifications (if any)'],
                annualFee: 'CTC: ₹4.5 LPA - ₹8.5 LPA',
                turnaroundTime: '2 weeks',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'corp-infosys',
            name: 'Infosys Limited',
            code: 'INFY',
            category: 'IT / Software',
            website: 'https://www.infosys.com',
            isActive: true,
            sortOrder: 2,
            products: [
              {
                id: 'role-infy-fsd',
                name: 'Full Stack Web Developer',
                productCategory: 'IT / Software',
                eligibilityConditions: 'Hands-on React, Node.js or Java Spring. 0-2 years experience.',
                requiredDocuments: ['Resume', 'GitHub Profile Link'],
                annualFee: 'CTC: ₹4.0 LPA - ₹9.0 LPA',
                turnaroundTime: '10 business days',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'role-infy-qa',
                name: 'Quality Assurance & Test Engineer',
                productCategory: 'IT / Software',
                eligibilityConditions: 'Selenium, API testing, Manual test cases. CS/IT graduates.',
                requiredDocuments: ['Resume'],
                annualFee: 'CTC: ₹3.5 LPA - ₹6.0 LPA',
                turnaroundTime: '2 weeks',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'corp-wipro',
            name: 'Wipro Technologies',
            code: 'WIPRO',
            category: 'IT / Software',
            website: 'https://www.wipro.com',
            isActive: true,
            sortOrder: 3,
            products: [
              {
                id: 'role-wipro-project-eng',
                name: 'Project Engineer - Enterprise Solutions',
                productCategory: 'IT / Software',
                eligibilityConditions: 'Graduate in Engineering or Technology. 60%+ in 10th, 12th & Graduation.',
                requiredDocuments: ['Resume', 'Marksheets'],
                annualFee: 'CTC: ₹3.5 LPA - ₹6.5 LPA',
                turnaroundTime: '14 days',
                isActive: true,
                sortOrder: 1
              }
            ]
          },
          {
            id: 'corp-lt',
            name: 'Larsen & Toubro (L&T)',
            code: 'LT',
            category: 'Non-IT / Core Engineering',
            website: 'https://www.larsentoubro.com',
            isActive: true,
            sortOrder: 4,
            products: [
              {
                id: 'role-lt-get',
                name: 'Graduate Engineer Trainee (GET)',
                productCategory: 'Non-IT / Core Engineering',
                eligibilityConditions: 'Civil, Mechanical, or Electrical Engineering graduate with 65%+ aggregate.',
                requiredDocuments: ['Updated Resume', 'Consolidated Marksheet'],
                annualFee: 'CTC: ₹5.5 LPA - ₹8.0 LPA',
                turnaroundTime: '3 weeks',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'role-lt-cad',
                name: 'Design & CAD Engineer',
                productCategory: 'Non-IT / Core Engineering',
                eligibilityConditions: 'Proficiency in AutoCAD, SolidWorks or Revit. 1-3 years experience.',
                requiredDocuments: ['Resume', 'Portfolio / Drawing Samples'],
                annualFee: 'CTC: ₹4.8 LPA - ₹7.5 LPA',
                turnaroundTime: '2 weeks',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'corp-hdfc-bank',
            name: 'HDFC Bank Ltd',
            code: 'HDFCBANK-CORP',
            category: 'Banking / Finance',
            website: 'https://www.hdfcbank.com',
            isActive: true,
            sortOrder: 5,
            products: [
              {
                id: 'role-hdfc-rm',
                name: 'Relationship Manager - Retail Banking',
                productCategory: 'Banking / Finance',
                eligibilityConditions: 'MBA / B.Com / BBA with good communication skills. 0-3 years experience.',
                requiredDocuments: ['Resume', 'Degree Certificate'],
                annualFee: 'CTC: ₹3.8 LPA - ₹6.5 LPA + Incentives',
                turnaroundTime: '10 days',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'role-hdfc-credit-analyst',
                name: 'Credit Risk Analyst',
                productCategory: 'Banking / Finance',
                eligibilityConditions: 'CA Inter / MBA Finance / M.Com. Strong financial modeling skills.',
                requiredDocuments: ['Resume', 'Scorecards'],
                annualFee: 'CTC: ₹5.0 LPA - ₹9.0 LPA',
                turnaroundTime: '2 weeks',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'corp-deloitte',
            name: 'Deloitte Consulting',
            code: 'DELOITTE',
            category: 'EdTech / Education',
            website: 'https://www.deloitte.com',
            isActive: true,
            sortOrder: 6,
            products: [
              {
                id: 'role-deloitte-analyst',
                name: 'Business Technology Analyst',
                productCategory: 'IT / Software',
                eligibilityConditions: 'Strong analytical reasoning, SQL, Python/Tableau knowledge.',
                requiredDocuments: ['Resume', 'Transcript'],
                annualFee: 'CTC: ₹6.0 LPA - ₹11.0 LPA',
                turnaroundTime: '2 weeks',
                isActive: true,
                sortOrder: 1
              }
            ]
          }
        ],
        categoriesList: ['IT / Software', 'Non-IT / Core Engineering', 'Banking / Finance', 'EdTech / Education', 'BPO / Operations', 'Healthcare / Pharma', 'Other'],
        status: 'published',
        version: 1,
        fieldsConfig: [
          { fieldKey: 'candidateName', label: 'Candidate Full Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'e.g. Priya Sharma' },
          { fieldKey: 'candidatePhone', label: 'Candidate Mobile Number', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: '10-digit mobile number' },
          { fieldKey: 'candidateEmail', label: 'Candidate Email Address', fieldType: 'email', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'candidate@domain.com' },
          { fieldKey: 'currentLocation', label: 'Current City / Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: false, placeholder: 'e.g. Bangalore' },
          { fieldKey: 'highestQualification', label: 'Highest Qualification', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['B.E. / B.Tech', 'M.E. / M.Tech', 'BCA / MCA', 'B.Sc / M.Sc', 'B.Com / M.Com', 'MBA', 'Diploma', 'Other'] },
          { fieldKey: 'totalExperience', label: 'Experience Level', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['Fresher (0-1 yr)', 'Junior (1-3 yrs)', 'Mid-level (3-5 yrs)', 'Senior (5+ yrs)'] },
          { fieldKey: 'targetCompany', label: 'Corporate Hiring Partner', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'jobCategory', label: 'Job Sector / Department', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true, options: ['IT / Software', 'Non-IT / Core Engineering', 'Banking / Finance', 'EdTech / Education', 'BPO / Operations', 'Healthcare / Pharma', 'Other'] },
          { fieldKey: 'jobRole', label: 'Target Job Role / Opportunity', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'resumeUrl', label: 'Resume / LinkedIn Profile Link', fieldType: 'text', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'https://linkedin.com/in/... or Google Drive URL' },
          { fieldKey: 'notes', label: 'Referrer Recommendation & Skills Summary', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'Key strengths, certifications, notice period, or college credentials...' }
        ],
        generalSettings: {
          allowPartnerReference: true,
          consentNoticeVersion: 'v1.2-FIC-JOB-CONSENT',
          consentText: 'I verify that the candidate has given permission to submit their profile for this recruitment opening.',
          submissionNotice: 'Profiles are routed directly to corporate talent acquisition teams and campus placement cells.',
          defaultPartner: 'Tata Consultancy Services (TCS)'
        }
      };

    case 'Bank Account':
      return {
        category: 'Bank Account',
        displayName: 'Account Opening / Banking Referral',
        description: 'Partner banks, savings/current/salary account categories, zero-balance student options, and Video-KYC settings.',
        isActive: true,
        partners: [
          {
            id: 'bank-acc-hdfc',
            name: 'HDFC Bank',
            code: 'HDFC',
            website: 'https://www.hdfcbank.com',
            isActive: true,
            sortOrder: 1,
            products: [
              {
                id: 'prod-acc-hdfc-digisave',
                name: 'Campus Zero-Balance Student Savings',
                productCategory: 'Student Zero-Balance',
                eligibilityConditions: 'Valid Student ID card + Aadhaar + PAN. Age 16-25.',
                requiredDocuments: ['Aadhaar Card', 'PAN Card', 'College Identity Card'],
                annualFee: 'Zero Balance (No MAB penalty)',
                turnaroundTime: '5-minute Video KYC',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-acc-hdfc-reg-savings',
                name: 'Standard Institutional Savings Account',
                productCategory: 'Savings Account',
                eligibilityConditions: 'Resident Indian. Min initial deposit ₹5,000.',
                requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Address Proof'],
                annualFee: 'MAB: ₹5,000 (Metro/Urban)',
                turnaroundTime: 'Same-day account number allocation',
                isActive: true,
                sortOrder: 2
              },
              {
                id: 'prod-acc-hdfc-corp-salary',
                name: 'Campus Faculty & Staff Corporate Salary Account',
                productCategory: 'Salary Account',
                eligibilityConditions: 'Employed with educational institution. Monthly salary credit required.',
                requiredDocuments: ['Staff ID', 'Offer Letter / Salary Slip', 'PAN & Aadhaar'],
                annualFee: 'Zero Balance Salary Account',
                turnaroundTime: 'Instant activation',
                isActive: true,
                sortOrder: 3
              },
              {
                id: 'prod-acc-hdfc-vendor-current',
                name: 'Campus Vendor & Contractor Commercial Account',
                productCategory: 'Current Account',
                eligibilityConditions: 'Registered business/vendor. GST registration or Udyam certificate.',
                requiredDocuments: ['GST Certificate', 'PAN', 'Entity Proof'],
                annualFee: 'MAB: ₹10,000',
                turnaroundTime: '1-2 business days',
                isActive: true,
                sortOrder: 4
              }
            ]
          },
          {
            id: 'bank-acc-icici',
            name: 'ICICI Bank',
            code: 'ICICI',
            website: 'https://www.icicibank.com',
            isActive: true,
            sortOrder: 2,
            products: [
              {
                id: 'prod-acc-icici-smart-student',
                name: 'Smart Student Digital Account with UPI',
                productCategory: 'Student Zero-Balance',
                eligibilityConditions: 'College enrolled student. Age 18+. Instant Virtual Debit Card.',
                requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Student ID'],
                annualFee: 'Zero Balance',
                turnaroundTime: 'Instant digital Video-KYC',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-acc-icici-high-interest',
                name: 'High-Interest Regular Savings Variant',
                productCategory: 'Savings Account',
                eligibilityConditions: 'Resident individual. Min deposit ₹10,000.',
                requiredDocuments: ['Aadhaar', 'PAN'],
                annualFee: 'MAB: ₹10,000',
                turnaroundTime: '24 hours',
                isActive: true,
                sortOrder: 2
              },
              {
                id: 'prod-acc-icici-exec-salary',
                name: 'Executive Preferred Salary Account',
                productCategory: 'Salary Account',
                eligibilityConditions: 'Monthly salary credit of ₹50,000+.',
                requiredDocuments: ['Employment Letter', 'Salary Slip', 'PAN & Aadhaar'],
                annualFee: 'Zero Balance + Premium Debit Card',
                turnaroundTime: 'Same day',
                isActive: true,
                sortOrder: 3
              }
            ]
          },
          {
            id: 'bank-acc-sbi',
            name: 'State Bank of India',
            code: 'SBI',
            website: 'https://www.onlinesbi.sbi',
            isActive: true,
            sortOrder: 3,
            products: [
              {
                id: 'prod-acc-sbi-scholar',
                name: 'Scholar Digital Wallet & Savings Account',
                productCategory: 'Student Zero-Balance',
                eligibilityConditions: 'College students. Aadhaar biometric or OTP verification.',
                requiredDocuments: ['Aadhaar Card', 'PAN Card'],
                annualFee: 'Zero Balance (No minimum balance requirement)',
                turnaroundTime: 'Instant account number generation',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-acc-sbi-flexi',
                name: 'Campus Scholar Flexi-Savings',
                productCategory: 'Savings Account',
                eligibilityConditions: 'All students & staff. Auto-sweep facility enabled.',
                requiredDocuments: ['PAN & Aadhaar'],
                annualFee: 'Zero MAB',
                turnaroundTime: '1 business day',
                isActive: true,
                sortOrder: 2
              }
            ]
          },
          {
            id: 'bank-acc-axis',
            name: 'Axis Bank',
            code: 'AXIS',
            website: 'https://www.axisbank.com',
            isActive: true,
            sortOrder: 4,
            products: [
              {
                id: 'prod-acc-axis-digi',
                name: 'Liberty Digital Savings Account',
                productCategory: 'Savings Account',
                eligibilityConditions: 'Resident Indian. Min spend ₹25,000/yr or MAB ₹15,000.',
                requiredDocuments: ['PAN & Aadhaar'],
                annualFee: 'Quarterly debit card fee',
                turnaroundTime: '5 minutes Video KYC',
                isActive: true,
                sortOrder: 1
              },
              {
                id: 'prod-acc-axis-sme',
                name: 'SME Merchant Trade Current Account',
                productCategory: 'Current Account',
                eligibilityConditions: 'Campus canteen/stationery merchants and campus suppliers.',
                requiredDocuments: ['Trade License / Udyam Certificate', 'PAN', 'Bank Statement'],
                annualFee: 'MAB: ₹25,000',
                turnaroundTime: '24-48 hours',
                isActive: true,
                sortOrder: 2
              }
            ]
          }
        ],
        categoriesList: ['Student Zero-Balance', 'Savings Account', 'Salary Account', 'Current Account'],
        status: 'published',
        version: 1,
        fieldsConfig: [
          { fieldKey: 'applicantName', label: 'Applicant Legal Name', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: 'Name exactly as printed on PAN' },
          { fieldKey: 'applicantPhone', label: 'Mobile Number (Linked with Aadhaar)', fieldType: 'phone', step: 1, isRequired: true, isVisible: true, isSystem: true, placeholder: '10-digit mobile number' },
          { fieldKey: 'applicantEmail', label: 'Email Address', fieldType: 'email', step: 1, isRequired: false, isVisible: true, isSystem: false, placeholder: 'name@example.com' },
          { fieldKey: 'city', label: 'City / Campus Location', fieldType: 'text', step: 1, isRequired: true, isVisible: true, isSystem: false, placeholder: 'e.g. Pune, Delhi' },
          { fieldKey: 'applicantType', label: 'Applicant Category', fieldType: 'dropdown', step: 1, isRequired: true, isVisible: true, isSystem: false, options: ['Student', 'Faculty / Staff', 'Research Scholar', 'Alumni', 'Campus Vendor', 'Other'] },
          { fieldKey: 'bankName', label: 'Partner Bank', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'accountType', label: 'Account Type', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true, options: ['Student Zero-Balance', 'Savings Account', 'Salary Account', 'Current Account'] },
          { fieldKey: 'accountProduct', label: 'Specific Account Offering', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: true },
          { fieldKey: 'referralSource', label: 'Referral Channel', fieldType: 'dropdown', step: 2, isRequired: true, isVisible: true, isSystem: false, options: ['Direct Recommendation', 'Campus Orientation', 'Alumni Network', 'Staff Advisory', 'Other'] },
          { fieldKey: 'notes', label: 'Referral Notes / Branch Code', fieldType: 'textarea', step: 2, isRequired: false, isVisible: true, isSystem: false, placeholder: 'Add local branch code or KYC preferences...' }
        ],
        generalSettings: {
          allowPartnerReference: true,
          consentNoticeVersion: 'v1.2-FIC-BNK-CONSENT',
          consentText: 'I confirm that the applicant has consented to open a bank account with the chosen partner bank via digital Video-KYC verification.',
          submissionNotice: 'Banking applications initiate official RBI-compliant digital Video-KYC onboarding links.',
          defaultPartner: 'HDFC Bank'
        }
      };

    default:
      return null;
  }
};

// Auto-seed helper
export const ensureAllDefaultConfigs = async () => {
  const categories = ['Credit Card', 'Insurance', 'Job', 'Bank Account'];
  for (const cat of categories) {
    let existing = await ReferralFormConfig.findOne({ category: cat });
    if (!existing) {
      const seedData = getDefaultSeedConfig(cat);
      if (seedData) {
        await ReferralFormConfig.create(seedData);
      }
    } else {
      // Migrate missing status/version or fieldTypes if needed
      let changed = false;
      if (!existing.status) {
        existing.status = 'published';
        changed = true;
      }
      if (!existing.version) {
        existing.version = 1;
        changed = true;
      }
      if (Array.isArray(existing.fieldsConfig)) {
        const seedData = getDefaultSeedConfig(cat);
        const seedFieldMap = {};
        seedData?.fieldsConfig?.forEach(f => { seedFieldMap[f.fieldKey] = f; });

        existing.fieldsConfig.forEach(f => {
          if (!f.fieldType) {
            f.fieldType = seedFieldMap[f.fieldKey]?.fieldType || (f.options?.length > 0 ? 'dropdown' : (f.fieldKey.toLowerCase().includes('phone') ? 'phone' : (f.fieldKey.toLowerCase().includes('email') ? 'email' : (f.fieldKey.toLowerCase().includes('notes') ? 'textarea' : 'text'))));
            changed = true;
          }
        });
      }
      if (changed) {
        await existing.save();
      }
    }
  }
};

// ── 1. PUBLIC ROUTE: Get Active Form Configuration for Referrers ─────────────
// Accessible to any authenticated user or applicant to display active banks & products
router.get('/public/:category', async (req, res) => {
  try {
    await ensureAllDefaultConfigs();
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    let config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      const defaultData = getDefaultSeedConfig(canonicalCategory);
      if (defaultData) {
        config = await ReferralFormConfig.create(defaultData);
      }
    }

    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found for category' });
    }

    const isPublished = (config.status || 'published') === 'published' && config.isActive !== false;

    // Filter only ACTIVE partners and ACTIVE products for live referral forms
    const activePartners = (config.partners || [])
      .filter((p) => p.isActive !== false)
      .map((p) => ({
        ...p.toObject ? p.toObject() : p,
        products: (p.products || []).filter((prod) => prod.isActive !== false)
      }));

    res.json({
      success: true,
      data: {
        category: config.category,
        displayName: config.displayName,
        description: config.description,
        status: config.status || 'published',
        version: config.version || 1,
        isPublished,
        isActive: config.isActive,
        publishedAt: config.publishedAt,
        partners: activePartners,
        categoriesList: config.categoriesList || [],
        fieldsConfig: (config.fieldsConfig || []).filter((f) => f.isVisible !== false),
        generalSettings: config.generalSettings || {}
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. SUPER ADMIN: Get All Configurations with All Inactive Items Included ───
router.get('/all', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    await ensureAllDefaultConfigs();
    const configs = await ReferralFormConfig.find().sort({ createdAt: 1 });
    
    // Also fetch available jobs from Opportunity / PlacementJob so Super Admin can cross-link
    let opportunities = [];
    try {
      opportunities = await Opportunity.find({ category: 'Job Referral', status: 'Published' }).select('opportunityCode title subCategory providerName');
    } catch (e) {}

    res.json({
      success: true,
      count: configs.length,
      data: configs,
      linkedOpportunities: opportunities
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. SUPER ADMIN: Get Single Category Configuration ────────────────────────
router.get('/category/:category', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    await ensureAllDefaultConfigs();
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found' });
    }
    res.json({ success: true, data: config });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4. SUPER ADMIN: Full Update of Category Config ───────────────────────────
router.put('/:category', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { displayName, description, isActive, status, version, partners, categoriesList, fieldsConfig, generalSettings } = req.body;

    // Validate duplicate partner names
    if (Array.isArray(partners)) {
      const partnerNames = new Set();
      for (const p of partners) {
        const norm = (p.name || '').trim().toLowerCase();
        if (norm && partnerNames.has(norm)) {
          return res.status(400).json({
            success: false,
            message: `Duplicate partner name detected: "${p.name}". Partner names must be unique.`
          });
        }
        if (norm) partnerNames.add(norm);

        // Check duplicate product names within partner
        if (Array.isArray(p.products)) {
          const productNames = new Set();
          for (const prod of p.products) {
            const pNorm = (prod.name || '').trim().toLowerCase();
            if (pNorm && productNames.has(pNorm)) {
              return res.status(400).json({
                success: false,
                message: `Duplicate product name "${prod.name}" under partner "${p.name}".`
              });
            }
            if (pNorm) productNames.add(pNorm);
          }
        }
      }
    }

    const updatePayload = {
      displayName: displayName || canonicalCategory,
      description: description || '',
      isActive: isActive !== undefined ? isActive : true,
      partners: partners || [],
      categoriesList: categoriesList || [],
      fieldsConfig: fieldsConfig || [],
      generalSettings: generalSettings || {},
      updatedBy: req.user?._id,
      updatedByName: req.user?.name || 'Super Admin'
    };
    if (status) updatePayload.status = status;
    if (version !== undefined) updatePayload.version = version;
    if (status === 'published') {
      updatePayload.publishedAt = new Date();
      updatePayload.publishedBy = req.user?._id;
      updatePayload.publishedByName = req.user?.name || 'Super Admin';
    }

    const updated = await ReferralFormConfig.findOneAndUpdate(
      { category: canonicalCategory },
      updatePayload,
      { new: true, upsert: true }
    );

    // Audit log
    await ReferralConfigAudit.create({
      category: canonicalCategory,
      action: status === 'draft' ? 'FORM_DRAFT_SAVED' : 'CONFIG_SAVED',
      title: `Saved ${canonicalCategory} Referral Form (${status || 'published'})`,
      details: `${fieldsConfig ? fieldsConfig.length : 0} fields, ${partners ? partners.length : 0} partners configured.`,
      performedBy: req.user?.name || 'Super Admin',
      performedById: req.user?._id
    });

    // Emit live WebSocket notification so clients update immediately
    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'updated',
        data: updated
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Configuration for ${canonicalCategory} saved successfully.`,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4B. SUPER ADMIN: Publish Referral Form ────────────────────────────────────
router.post('/:category/publish', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found.' });
    }

    config.status = 'published';
    config.isActive = true;
    config.version = (config.version || 1) + 1;
    config.publishedAt = new Date();
    config.publishedBy = req.user?._id;
    config.publishedByName = req.user?.name || 'Super Admin';
    await config.save();

    await ReferralConfigAudit.create({
      category: canonicalCategory,
      action: 'FORM_PUBLISHED',
      title: `Published ${canonicalCategory} Referral Form (v${config.version})`,
      details: `Form version ${config.version} published to live users by ${req.user?.name || 'Super Admin'}.`,
      performedBy: req.user?.name || 'Super Admin',
      performedById: req.user?._id
    });

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'published',
        data: config
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `${canonicalCategory} form published successfully (Version ${config.version}).`,
      data: config
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4C. SUPER ADMIN: Unpublish Referral Form (Draft Mode) ─────────────────────
router.post('/:category/unpublish', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found.' });
    }

    config.status = 'draft';
    await config.save();

    await ReferralConfigAudit.create({
      category: canonicalCategory,
      action: 'FORM_UNPUBLISHED',
      title: `Unpublished ${canonicalCategory} Referral Form`,
      details: `Form set to draft mode by ${req.user?.name || 'Super Admin'}. Public users will see maintenance status.`,
      performedBy: req.user?.name || 'Super Admin',
      performedById: req.user?._id
    });

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'unpublished',
        data: config
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `${canonicalCategory} form unpublished (now in draft mode).`,
      data: config
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4D. SUPER ADMIN: Save Form as Draft ───────────────────────────────────────
router.post('/:category/draft', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { displayName, description, partners, categoriesList, fieldsConfig, generalSettings } = req.body;

    const updated = await ReferralFormConfig.findOneAndUpdate(
      { category: canonicalCategory },
      {
        displayName: displayName || canonicalCategory,
        description: description || '',
        status: 'draft',
        partners: partners || [],
        categoriesList: categoriesList || [],
        fieldsConfig: fieldsConfig || [],
        generalSettings: generalSettings || {},
        updatedBy: req.user?._id,
        updatedByName: req.user?.name || 'Super Admin'
      },
      { new: true, upsert: true }
    );

    await ReferralConfigAudit.create({
      category: canonicalCategory,
      action: 'FORM_DRAFT_SAVED',
      title: `Saved ${canonicalCategory} Form as Draft`,
      details: `Form draft saved with ${fieldsConfig ? fieldsConfig.length : 0} fields by ${req.user?.name || 'Super Admin'}.`,
      performedBy: req.user?.name || 'Super Admin',
      performedById: req.user?._id
    });

    res.json({
      success: true,
      message: `${canonicalCategory} form saved as draft successfully.`,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. SUPER ADMIN: Add New Partner Bank / Insurer / Company ──────────────────
router.post('/:category/partner', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { name, code, logo, category: partnerCat, website, contactEmail, products } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Partner name is required.' });
    }

    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found.' });
    }

    // Check duplicate
    const exists = config.partners.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Partner with name "${name.trim()}" already exists. Prevent duplicate records.`
      });
    }

    const newPartner = {
      id: `partner-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      code: code ? code.trim() : '',
      logo: logo || '',
      category: partnerCat || '',
      website: website || '',
      contactEmail: contactEmail || '',
      isActive: true,
      sortOrder: (config.partners.length || 0) + 1,
      products: Array.isArray(products) ? products : []
    };

    config.partners.push(newPartner);
    config.updatedBy = req.user?._id;
    config.updatedByName = req.user?.name || 'Super Admin';
    await config.save();

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'partner_added',
        partner: newPartner
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: `Partner "${newPartner.name}" added successfully.`,
      data: newPartner,
      config
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 6. SUPER ADMIN: Toggle Partner Active/Inactive ────────────────────────────
router.patch('/:category/partner/:partnerId/toggle', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { partnerId } = req.params;
    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found.' });
    }

    const partner = config.partners.find((p) => p.id === partnerId || p._id?.toString() === partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner record not found.' });
    }

    partner.isActive = !partner.isActive;
    config.updatedBy = req.user?._id;
    config.updatedByName = req.user?.name || 'Super Admin';
    await config.save();

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'partner_toggled',
        partnerId,
        isActive: partner.isActive
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Partner "${partner.name}" is now ${partner.isActive ? 'Active' : 'Deactivated'}.`,
      isActive: partner.isActive,
      data: partner
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 7. SUPER ADMIN: Add Product to Partner / Category ────────────────────────
router.post('/:category/partner/:partnerId/product', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { partnerId } = req.params;
    const { name, productCategory, eligibilityConditions, requiredDocuments, annualFee, turnaroundTime } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Product name is required.' });
    }

    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found.' });
    }

    const partner = config.partners.find((p) => p.id === partnerId || p._id?.toString() === partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner record not found.' });
    }

    // Check duplicate product under same partner
    const exists = (partner.products || []).some((prod) => prod.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Product "${name.trim()}" already exists for partner "${partner.name}".`
      });
    }

    const newProduct = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      productCategory: productCategory || 'Standard',
      eligibilityConditions: eligibilityConditions || '',
      requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : (requiredDocuments ? [requiredDocuments] : []),
      annualFee: annualFee || 'Standard',
      turnaroundTime: turnaroundTime || '2-4 business days',
      isActive: true,
      sortOrder: (partner.products?.length || 0) + 1
    };

    partner.products.push(newProduct);
    config.updatedBy = req.user?._id;
    config.updatedByName = req.user?.name || 'Super Admin';
    await config.save();

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'product_added',
        partnerId,
        product: newProduct
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: `Product "${newProduct.name}" added successfully under "${partner.name}".`,
      data: newProduct,
      partner
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 8. SUPER ADMIN: Toggle Product Active/Inactive ───────────────────────────
router.patch('/:category/partner/:partnerId/product/:productId/toggle', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { partnerId, productId } = req.params;
    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration category not found.' });
    }

    const partner = config.partners.find((p) => p.id === partnerId || p._id?.toString() === partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: 'Partner record not found.' });
    }

    const product = partner.products.find((prod) => prod.id === productId || prod._id?.toString() === productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product record not found.' });
    }

    product.isActive = !product.isActive;
    config.updatedBy = req.user?._id;
    config.updatedByName = req.user?.name || 'Super Admin';
    await config.save();

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'product_toggled',
        partnerId,
        productId,
        isActive: product.isActive
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Product "${product.name}" is now ${product.isActive ? 'Active' : 'Deactivated'}.`,
      isActive: product.isActive,
      data: product
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 9. SUPER ADMIN: Reset Category to Default Template ───────────────────────
router.post('/:category/reset', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const defaultSeed = getDefaultSeedConfig(canonicalCategory);
    if (!defaultSeed) {
      return res.status(400).json({ success: false, message: 'No default seed available for this category' });
    }

    defaultSeed.updatedBy = req.user?._id;
    defaultSeed.updatedByName = req.user?.name || 'Super Admin';

    const resetConfig = await ReferralFormConfig.findOneAndUpdate(
      { category: canonicalCategory },
      defaultSeed,
      { new: true, upsert: true }
    );

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'reset',
        data: resetConfig
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Configuration for ${canonicalCategory} reset to verified default settings.`,
      data: resetConfig
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 10. SUPER ADMIN: Get Configuration Audit History ─────────────────────────
router.get('/history/logs', protect, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const logs = await ReferralConfigAudit.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 11. SUPER ADMIN: Update Form Field Configuration ─────────────────────────
router.put('/:category/fields', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { fieldsConfig } = req.body;
    if (!Array.isArray(fieldsConfig)) {
      return res.status(400).json({ success: false, message: 'fieldsConfig array required.' });
    }

    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Category configuration not found.' });
    }

    config.fieldsConfig = fieldsConfig;
    config.updatedBy = req.user?._id;
    config.updatedByName = req.user?.name || 'Super Admin';
    await config.save();

    await ReferralConfigAudit.create({
      category: canonicalCategory,
      action: 'FIELD_UPDATED',
      title: `Updated ${canonicalCategory} Form Field Configurations`,
      details: `${fieldsConfig.length} fields configured for ${canonicalCategory}.`,
      performedBy: req.user?.name || 'Super Admin',
      performedById: req.user?._id
    });

    try {
      req.app.get('io')?.emit('dataUpdated', {
        module: 'referral_config',
        category: canonicalCategory,
        action: 'fields_updated',
        data: config
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Form fields updated for ${canonicalCategory}.`,
      data: config
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── 12. SUPER ADMIN: Update Category Policy & General Settings ───────────────
router.put('/:category/policy', protect, authorize('Super Admin'), async (req, res) => {
  try {
    const rawCategory = req.params.category.replace(/-/g, ' ').trim();
    let canonicalCategory = rawCategory;
    if (/credit\s*card/i.test(rawCategory)) canonicalCategory = 'Credit Card';
    else if (/insurance/i.test(rawCategory)) canonicalCategory = 'Insurance';
    else if (/job/i.test(rawCategory)) canonicalCategory = 'Job';
    else if (/account|bank/i.test(rawCategory)) canonicalCategory = 'Bank Account';

    const { generalSettings, categoriesList } = req.body;
    const config = await ReferralFormConfig.findOne({ category: canonicalCategory });
    if (!config) {
      return res.status(404).json({ success: false, message: 'Category configuration not found.' });
    }

    if (generalSettings) config.generalSettings = { ...config.generalSettings, ...generalSettings };
    if (Array.isArray(categoriesList)) config.categoriesList = categoriesList;
    config.updatedBy = req.user?._id;
    config.updatedByName = req.user?.name || 'Super Admin';
    await config.save();

    await ReferralConfigAudit.create({
      category: canonicalCategory,
      action: 'POLICY_UPDATED',
      title: `Updated ${canonicalCategory} Rules & Policy`,
      details: `Consent text, notices, and categories refreshed.`,
      performedBy: req.user?.name || 'Super Admin',
      performedById: req.user?._id
    });

    res.json({
      success: true,
      message: `Policy and rules updated for ${canonicalCategory}.`,
      data: config
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
