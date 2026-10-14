import { useState, useEffect, useCallback } from 'react';

// Default configuration for all referral categories
export const DEFAULT_CATEGORY_CONFIGS = {
  'credit-card': {
    id: 'credit-card',
    categoryKey: 'Credit Card',
    title: 'Credit Card Referral',
    subtitle: 'Leading Banking & Card Partners',
    badge: 'High Commission',
    badgeColor: 'blue',
    accentColor: '#2563eb',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    description: 'Refer students, staff, and network alumni for pre-approved credit cards from top private and public banks with instant cash rewards on card dispatch.',
    highlights: [
      'Partnerships with HDFC, ICICI, SBI & Axis Bank',
      'Lifetime free (LTF) and cashback card variants',
      'Zero paperwork digital onboarding links',
      'Incentives credited upon card approval & activation'
    ],
    metrics: {
      earningPotential: '₹1,200 - ₹3,000 / card',
      turnaround: 'Instant card tracking',
      status: 'Active'
    },
    tags: ['HDFC Bank', 'ICICI Bank', 'SBI Cards', 'Axis Bank']
  },
  'insurance': {
    id: 'insurance',
    categoryKey: 'Insurance',
    title: 'Insurance Referral',
    subtitle: 'Health, Life & Motor Protection',
    badge: 'Verified Partners',
    badgeColor: 'emerald',
    accentColor: '#059669',
    gradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    description: 'Comprehensive health cover, term life plans, and motor policies from IRDAI-regulated insurers tailored for campus staff, students, and families.',
    highlights: [
      'Star Health, HDFC ERGO, Care Insurance partnerships',
      'Comprehensive family floater & student cover plans',
      'Instant policy issuance with automated milestone check',
      'Dedicated campus insurance advisory support'
    ],
    metrics: {
      earningPotential: '15% - 25% of premium',
      turnaround: 'Same-day issuance',
      status: 'Active'
    },
    tags: ['Health Insurance', 'Term Life', 'Family Cover', 'Star Health']
  },
  'job-referral': {
    id: 'job-referral',
    categoryKey: 'Job',
    title: 'Job Referral',
    subtitle: 'Campus Hiring & Corporate Placement',
    badge: 'Corporate Network',
    badgeColor: 'indigo',
    accentColor: '#6366f1',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    description: 'Connect graduating talent, alumni, and qualified candidates with premium tech and corporate recruitment pipelines for exclusive joining referral bonuses.',
    highlights: [
      'Direct tech & non-tech roles at Tier-1 companies',
      'Priority resume screening with hiring managers',
      'Candidate consent validation & status updates',
      'Substantial referral bonuses paid on candidate onboarding'
    ],
    metrics: {
      earningPotential: '₹5,000 - ₹25,000 / joiner',
      turnaround: 'Offer letter milestone',
      status: 'Active'
    },
    tags: ['Software Engineering', 'Corporate Roles', 'Internships', 'Alumni Network']
  },
  'account-opening': {
    id: 'account-opening',
    categoryKey: 'Bank Account',
    title: 'Account Opening Referral',
    subtitle: 'Digital Savings & Salary Accounts',
    badge: 'Instant Processing',
    badgeColor: 'purple',
    accentColor: '#9333ea',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
    description: 'Fast-track zero balance savings accounts and student salary accounts with instant Video-KYC from leading nationalized and private banking networks.',
    highlights: [
      'Kotak 811, HDFC DigiSave, AU Small Finance Bank',
      '100% paperless video KYC verification in 5 minutes',
      'Free virtual debit cards and net banking access',
      'Referral incentives verified upon first deposit or activation'
    ],
    metrics: {
      earningPotential: '₹350 - ₹800 / account',
      turnaround: '5-min Video KYC',
      status: 'Active'
    },
    tags: ['Zero Balance', 'Student Salary', 'Video KYC', 'Instant Debit']
  },
  'incentives': {
    id: 'incentives',
    categoryKey: 'Incentives',
    title: 'Incentives',
    subtitle: 'Approved Institutional Rates & Milestones',
    badge: 'Approved Rates',
    badgeColor: 'amber',
    accentColor: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    description: 'Comprehensive milestone rules, reward calculation methods, and settlement governance across verified referrals, strictly governed by approved institutional rate cards.',
    highlights: [
      'Approved category rate cards loaded from institutional database',
      'Milestones verified directly against underwriter confirmations',
      'Disbursements subject to tenant finance audit and UTR verification',
      'Mandatory candidate explicit consent prior to referral logging'
    ],
    metrics: {
      earningPotential: 'Calculated per rate card',
      turnaround: 'Institutional settlement cycle',
      status: 'Active'
    },
    tags: ['Approved Milestones', 'Rate Cards', 'Audit Log']
  }
};

const STORAGE_KEY = 'erp_superadmin_custom_categories';
const EVENT_NAME = 'erp_category_config_updated';

// Read all custom overrides from localStorage
export const getCustomCategoryOverrides = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (err) {
    console.warn('Failed to parse category overrides from localStorage:', err);
    return {};
  }
};

// Get merged configuration for a specific category id
export const getCategoryConfig = (categoryId) => {
  const defaultCfg = DEFAULT_CATEGORY_CONFIGS[categoryId] || DEFAULT_CATEGORY_CONFIGS['credit-card'];
  const overrides = getCustomCategoryOverrides();
  const catOverride = overrides[categoryId];

  if (!catOverride) return defaultCfg;

  return {
    ...defaultCfg,
    ...catOverride,
    metrics: {
      ...defaultCfg.metrics,
      ...(catOverride.metrics || {})
    },
    highlights: (catOverride.highlights && catOverride.highlights.length > 0)
      ? catOverride.highlights
      : defaultCfg.highlights,
    tags: (catOverride.tags && catOverride.tags.length > 0)
      ? catOverride.tags
      : defaultCfg.tags
  };
};

// Save custom override for a category and notify all listening pages
export const saveCategoryConfig = (categoryId, updatedData) => {
  try {
    const overrides = getCustomCategoryOverrides();
    const cleanHighlights = Array.isArray(updatedData.highlights)
      ? updatedData.highlights
      : (typeof updatedData.highlights === 'string'
        ? updatedData.highlights.split('\n').map(s => s.trim()).filter(Boolean)
        : []);

    const cleanTags = Array.isArray(updatedData.tags)
      ? updatedData.tags
      : (typeof updatedData.tags === 'string'
        ? updatedData.tags.split(',').map(s => s.trim()).filter(Boolean)
        : []);

    overrides[categoryId] = {
      title: (updatedData.title || '').trim(),
      subtitle: (updatedData.subtitle || '').trim(),
      badge: (updatedData.badge || '').trim(),
      description: (updatedData.description || '').trim(),
      highlights: cleanHighlights,
      tags: cleanTags,
      metrics: {
        earningPotential: (updatedData.earningPotential || updatedData.metrics?.earningPotential || '').trim(),
        turnaround: (updatedData.turnaround || updatedData.metrics?.turnaround || '').trim(),
        status: 'Active'
      }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { categoryId, overrides } }));
    return true;
  } catch (err) {
    console.error('Failed to save category config:', err);
    return false;
  }
};

// Reset a category back to default configuration
export const resetCategoryConfig = (categoryId) => {
  try {
    const overrides = getCustomCategoryOverrides();
    delete overrides[categoryId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { categoryId, overrides } }));
    return true;
  } catch (err) {
    console.error('Failed to reset category config:', err);
    return false;
  }
};

// React hook to access and automatically re-render when category configuration changes
export const useCategoryConfig = (categoryId) => {
  const [config, setConfig] = useState(() => getCategoryConfig(categoryId));

  const refreshConfig = useCallback(() => {
    setConfig(getCategoryConfig(categoryId));
  }, [categoryId]);

  useEffect(() => {
    refreshConfig();

    const handleUpdate = (e) => {
      if (!e.detail?.categoryId || e.detail.categoryId === categoryId) {
        refreshConfig();
      }
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', refreshConfig);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', refreshConfig);
    };
  }, [categoryId, refreshConfig]);

  return {
    config,
    updateConfig: (newData) => saveCategoryConfig(categoryId, newData),
    resetConfig: () => resetCategoryConfig(categoryId),
    refreshConfig
  };
};
