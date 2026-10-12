import React, { useEffect, useState } from 'react';
import { Building, ShieldCheck, CreditCard, Activity } from 'lucide-react';

const CollegeInfoCard = () => {
  const [collegeData, setCollegeData] = useState({
    collegeName: 'Institution',
    tenantId: 'N/A',
    plan: 'N/A',
    status: 'N/A'
  });

  useEffect(() => {
    // Collect from various role sessions
    const path = window.location.pathname;
    let activeRole = 'admin';
    if (path.startsWith('/superadmin')) activeRole = 'superadmin';
    else if (path.startsWith('/admin')) activeRole = 'admin';
    else if (path.startsWith('/subadmin')) activeRole = 'subadmin';
    else if (path.startsWith('/principal')) activeRole = 'principal';
    else if (path.startsWith('/hod')) activeRole = 'hod';
    else if (path.startsWith('/staff')) activeRole = 'staff';
    else if (path.startsWith('/student')) activeRole = 'student';
    else if (path.startsWith('/parent')) activeRole = 'parent';
    else if (path.startsWith('/accounts')) activeRole = 'accounts';
    else if (path.startsWith('/driver')) activeRole = 'driver';

    let sessionData = null;
    const data = sessionStorage.getItem(`${activeRole}_session`);
    if (data) {
      try {
        sessionData = JSON.parse(data);
      } catch(e) {}
    }

    if (sessionData) {
      setCollegeData({
        collegeName: sessionData.collegeName || 'Unknown College',
        tenantId: sessionData.tenantId || 'system',
        plan: sessionData.subscription?.planName || sessionData.subscriptionPlan || 'Trial',
        status: sessionData.subscription?.status || sessionData.subscriptionStatus || 'Active'
      });
    }

    // Always fetch fresh data from backend to override stale sessionStorage
    if (activeRole !== 'superadmin') {
      import('../../api/index').then(({ getMyProfile }) => {
        getMyProfile().then(res => {
          if (res.data) {
            const freshPlan = res.data.planName || res.data.subscriptionPlan || (res.data.isTrial ? 'Trial' : 'Basic');
            const freshStatus = res.data.subscriptionStatus || 'Active';
            
            setCollegeData(prev => ({
              ...prev,
              collegeName: res.data.collegeName || prev.collegeName,
              tenantId: res.data.tenantId || prev.tenantId,
              plan: freshPlan,
              status: freshStatus
            }));
            
            // Quietly update session storage to fix caching globally
            if (sessionData) {
              sessionData.collegeName = res.data.collegeName || sessionData.collegeName;
              sessionData.subscriptionPlan = freshPlan;
              sessionData.subscriptionStatus = freshStatus;
              if (sessionData.subscription) {
                sessionData.subscription.planName = freshPlan;
                sessionData.subscription.status = freshStatus;
              }
              sessionStorage.setItem(`${activeRole}_session`, JSON.stringify(sessionData));
            }
          }
        }).catch(() => {});
      });
    }
  }, []);

  // Hide for Super Admin since they are global
  if (collegeData.tenantId === 'system' || !collegeData.tenantId) {
    return null;
  }

  return (
    <div className="college-info-card" style={{
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e2e8f0)',
      borderRadius: '12px',
      padding: '12px 18px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', 
          width: '38px', 
          height: '38px', 
          borderRadius: '9px', 
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 3px 8px rgba(37,99,235,0.25)'
        }}>
          <Building size={20} />
        </div>
        <div>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Institution Profile
          </span>
          <h3 style={{ margin: '1px 0 0', fontSize: '1.05rem', color: 'var(--text-main, #0f172a)', fontWeight: 800, letterSpacing: '-0.01em' }}>
            {collegeData.collegeName}
          </h3>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* College ID */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '5px 10px', 
          borderRadius: '8px', 
          background: 'var(--bg-secondary, #f8fafc)', 
          border: '1px solid var(--border-color, #e2e8f0)' 
        }}>
          <ShieldCheck size={15} color="#6366f1" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1 }}>College ID</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{collegeData.tenantId}</span>
          </div>
        </div>
        
        {/* Subscription Plan */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '5px 10px', 
          borderRadius: '8px', 
          background: 'var(--bg-secondary, #f8fafc)', 
          border: '1px solid var(--border-color, #e2e8f0)' 
        }}>
          <CreditCard size={15} color="#0284c7" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1 }}>Plan</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{collegeData.plan}</span>
          </div>
        </div>
        
        {/* Status */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          padding: '5px 10px', 
          borderRadius: '8px', 
          background: collegeData.status === 'Active' ? '#f0fdf4' : '#fef2f2', 
          border: collegeData.status === 'Active' ? '1px solid #bbf7d0' : '1px solid #fecaca' 
        }}>
          <span style={{ 
            width: '7px', 
            height: '7px', 
            borderRadius: '50%', 
            background: collegeData.status === 'Active' ? '#16a34a' : '#dc2626',
            boxShadow: collegeData.status === 'Active' ? '0 0 0 2px rgba(22, 163, 74, 0.2)' : 'none'
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.62rem', color: collegeData.status === 'Active' ? '#166534' : '#991b1b', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1 }}>Status</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: collegeData.status === 'Active' ? '#15803d' : '#b91c1c' }}>{collegeData.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeInfoCard;
