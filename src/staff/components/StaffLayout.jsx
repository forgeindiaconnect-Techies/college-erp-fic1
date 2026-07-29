import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StaffSidebar from './StaffSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const StaffLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <StaffSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Staff" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StaffLayout;

