import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import PlacementSidebar from './PlacementSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const PlacementGuard = ({ children }) => {
  const session = sessionStorage.getItem('placement_session') || sessionStorage.getItem('admin_session') || sessionStorage.getItem('superadmin_session');
  if (session) return children;
  return <Navigate to="/login" replace />;
};

const PlacementLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <PlacementSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Placement Officer" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export { PlacementGuard };
export default PlacementLayout;
