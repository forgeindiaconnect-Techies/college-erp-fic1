import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import WatchmanSidebar from './WatchmanSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';
import '../watchman.css';

const WatchmanLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <WatchmanSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Watchman" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WatchmanLayout;
