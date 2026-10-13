import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PrincipalSidebar from './PrincipalSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';
import '../PrincipalResponsive.css';

const PrincipalLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 768);
  const location = useLocation();

  // Close sidebar on route change when in mobile/tablet view
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Adjust sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <div className="layout-container">
      <PrincipalSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
      
      <div className={`main-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Principal" onMenuToggle={toggleSidebar} />
        <main className="main-content">
          <div className="page-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrincipalLayout;

