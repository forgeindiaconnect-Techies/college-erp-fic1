import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AccountsSidebar from './AccountsSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const AccountsLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="layout-container">
      <AccountsSidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      {isSidebarOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
      <div className={`main-wrapper ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Accounts" onMenuToggle={toggleSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AccountsLayout;

