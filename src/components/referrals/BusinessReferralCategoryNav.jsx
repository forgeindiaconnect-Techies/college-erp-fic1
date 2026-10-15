import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CreditCard, ShieldCheck, Briefcase, Building2,
  Layers, Award, FileCheck, Sliders, ChevronRight
} from 'lucide-react';
import './BusinessReferralCategoryNav.css';

export default function BusinessReferralCategoryNav({ activeCategory }) {
  return null;

  const categoryTabs = [
    {
      id: 'credit-card',
      label: 'Credit Card Referral',
      icon: <CreditCard size={16} />,
      path: `/${rootRole}/business-referral/credit-card`,
      tag: 'Banking'
    },
    {
      id: 'insurance',
      label: 'Insurance Referral',
      icon: <ShieldCheck size={16} />,
      path: `/${rootRole}/business-referral/insurance`,
      tag: 'Coverage'
    },
    {
      id: 'job-referral',
      label: 'Job Referral',
      icon: <Briefcase size={16} />,
      path: `/${rootRole}/business-referral/job-referral`,
      tag: 'Corporate'
    },
    {
      id: 'account-opening',
      label: 'Bank Account Referral',
      icon: <Building2 size={16} />,
      path: `/${rootRole}/business-referral/account-opening`,
      tag: 'Accounts'
    }
  ];

  const utilityTabs = [
    {
      id: 'all',
      label: 'All Categories',
      icon: <Layers size={15} />,
      path: `/${rootRole}/business-referral`
    },
    {
      id: 'incentives',
      label: 'Incentives & Rules',
      icon: <Award size={15} />,
      path: `/${rootRole}/business-referral/incentives`
    },
    {
      id: 'submissions',
      label: 'My Submissions',
      icon: <FileCheck size={15} />,
      path: `/${rootRole}/referrals`
    }
  ];

  return (
    <div className="br-category-nav-container">
      <div className="br-category-tabs-scroll">
        {categoryTabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`br-cat-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
            >
              <span className="br-cat-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="br-cat-tab-tag">{tab.tag}</span>
            </button>
          );
        })}

        <div className="br-cat-nav-divider" />

        {utilityTabs.map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`br-cat-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => navigate(tab.path)}
              style={isActive ? { background: '#0284c7', borderColor: '#0284c7' } : {}}
            >
              <span className="br-cat-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}

        {rootRole === 'superadmin' && (
          <button
            type="button"
            className={`br-cat-tab-btn ${activeCategory === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('/superadmin/referral-settings')}
            style={{ marginLeft: 'auto', background: activeCategory === 'settings' ? '#4f46e5' : '#f8fafc', color: activeCategory === 'settings' ? '#ffffff' : '#4338ca', borderColor: '#c7d2fe', fontWeight: 700 }}
          >
            <Sliders size={15} />
            <span>Form Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
