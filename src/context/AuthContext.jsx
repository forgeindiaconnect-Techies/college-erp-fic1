import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

const SESSION_KEYS = [
  'driver_session', 'staff_session', 'student_session', 'parent_session',
  'librarian_session', 'watchman_session', 'hostel_session', 'placement_session',
  'hod_session', 'accounts_session', 'principal_session', 'admin_session',
  'subadmin_session', 'superadmin_session'
];

const TOKEN_KEYS = [
  'driver_token', 'staff_token', 'student_token', 'parent_token',
  'librarian_token', 'watchman_token', 'hostel_token', 'placement_token',
  'hod_token', 'accounts_token', 'principal_token', 'admin_token',
  'subadmin_token', 'superadmin_token'
];

const getActiveUser = () => {
  const activeRole = sessionStorage.getItem('active_role');
  if (activeRole) {
    const roleKey = activeRole.toLowerCase().replace(/\s+/g, '');
    const raw = sessionStorage.getItem(`${roleKey}_session`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = sessionStorage.getItem(`${roleKey}_token`);
        return { ...parsed, token };
      } catch (e) {}
    }
  }

  for (let i = 0; i < SESSION_KEYS.length; i++) {
    const raw = sessionStorage.getItem(SESSION_KEYS[i]);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Attach token to user object for API calls
        const token = sessionStorage.getItem(TOKEN_KEYS[i]);
        return { ...parsed, token };
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getActiveUser());

  // Re-read from sessionStorage if storage changes (e.g., after login)
  useEffect(() => {
    const handleStorage = () => {
      setUser(getActiveUser());
    };
    window.addEventListener('storage', handleStorage);
    // Also poll every 2 seconds for same-tab login/logout
    const interval = setInterval(() => {
      const current = getActiveUser();
      setUser(prev => {
        // Only update if changed
        if (JSON.stringify(prev) !== JSON.stringify(current)) return current;
        return prev;
      });
    }, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const logout = () => {
    SESSION_KEYS.forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
    TOKEN_KEYS.forEach(k => {
      sessionStorage.removeItem(k);
      localStorage.removeItem(k);
    });
    sessionStorage.removeItem('active_role');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('tenantId');
    localStorage.removeItem('active_role');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('tenantId');
    
    // Clear mock localStorage to prevent cross-tenant data leaks during demo testing
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('erp_') || key.startsWith('principal_') || key.endsWith('_token') || key.endsWith('_session'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
