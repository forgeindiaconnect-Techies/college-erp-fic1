import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import PrincipalSidebar from './PrincipalSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const PrincipalLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  const toggleSidebar = () => {
    setSidebarOpen(!isSidebarOpen);
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

