import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ParentSidebar from './ParentSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const ParentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <ParentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Parent" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ParentLayout;

