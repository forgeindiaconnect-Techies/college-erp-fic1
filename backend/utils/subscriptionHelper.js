export const calculateSubscriptionStatus = (college) => {
  const fallback = {
    planName: 'N/A',
    status: 'N/A',
    expiryDate: null,
    daysRemaining: 0,
    isTrial: false,
    isGracePeriod: false
  };

  try {
    if (!college) return fallback;

    const planName = college.subscriptionPlan || 'N/A';
    let dbStatus = college.subscriptionStatus || 'Expired';
    const endDateStr = college.trialEndDate;

    if (!endDateStr) {
      return { ...fallback, planName, status: 'Expired' };
    }

    const endDate = new Date(endDateStr);
    if (isNaN(endDate.getTime())) {
      return { ...fallback, planName, status: 'Expired' };
    }

    // If DB explicitly marks Deactivated, Expired or Cancelled, preserve status immediately
    if (dbStatus === 'Deactivated') {
      return {
        planName,
        status: 'Deactivated',
        expiryDate: endDate ? endDate.toISOString() : null,
        daysRemaining: 0,
        isTrial: planName === 'Trial',
        isGracePeriod: false
      };
    }

    if (dbStatus === 'Expired' || dbStatus === 'Cancelled') {
      return {
        planName,
        status: 'Expired',
        expiryDate: endDate ? endDate.toISOString() : null,
        daysRemaining: 0,
        isTrial: planName === 'Trial',
        isGracePeriod: false
      };
    }

    const now = new Date();
    const diffMs = endDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    let finalStatus = 'Active';
    let daysRemaining = diffDays > 0 ? diffDays : 0;
    let isGracePeriod = false;
    const isTrial = planName === 'Trial';

    if (diffDays <= 0) {
      const expiredDays = Math.abs(diffDays);
      const GRACE_PERIOD_DAYS = 2;

      if (expiredDays <= GRACE_PERIOD_DAYS && !isTrial) {
        finalStatus = 'Grace Period';
        isGracePeriod = true;
        daysRemaining = GRACE_PERIOD_DAYS - expiredDays;
      } else {
        finalStatus = 'Expired';
        daysRemaining = 0;
      }
    }

    return {
      planName,
      status: finalStatus,
      expiryDate: endDate.toISOString(),
      daysRemaining,
      isTrial,
      isGracePeriod
    };
  } catch (err) {
    console.error('[subscriptionHelper] Error calculating status:', err.message);
    return fallback;
  }
};

