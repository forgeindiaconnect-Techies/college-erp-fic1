import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import DriverSidebar from './DriverSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const DriverGuard = ({ children }) => {
  const session = sessionStorage.getItem('driver_session');
  if (session) return children;
  return <Navigate to="/login" replace />;
};

const DriverLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <DriverSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Driver" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DriverLayout;

