import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import HostelSidebar from './HostelSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const HostelLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <HostelSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Hostel" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default HostelLayout;
