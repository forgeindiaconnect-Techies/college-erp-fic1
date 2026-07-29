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
            setCollegeData(prev => ({
              ...prev,
              collegeName: res.data.collegeName || prev.collegeName,
              tenantId: res.data.tenantId || prev.tenantId
            }));
            
            // Quietly update session storage to fix caching globally
            if (sessionData) {
              sessionData.collegeName = res.data.collegeName || sessionData.collegeName;
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
    <div style={{
      background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))',
      border: '1px solid rgba(59,130,246,0.2)',
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(59,130,246,0.1)', padding: '12px', borderRadius: '10px', color: '#3b82f6' }}>
          <Building size={24} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>College Name</p>
          <h3 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', color: 'var(--text-main)', fontWeight: 700 }}>{collegeData.collegeName}</h3>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} color="var(--text-muted)" />
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>College ID</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{collegeData.tenantId}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={18} color="var(--text-muted)" />
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Plan</p>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>{collegeData.plan}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="var(--text-muted)" />
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: collegeData.status === 'Active' ? 'var(--success)' : 'var(--danger)' }}></span>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: collegeData.status === 'Active' ? 'var(--success)' : 'var(--danger)' }}>{collegeData.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeInfoCard;
