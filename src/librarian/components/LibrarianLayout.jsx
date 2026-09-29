import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import LibrarianSidebar from './LibrarianSidebar';
import Navbar from '../../components/layout/Navbar';
import '../../components/layout/Layout.css';

const LibrarianGuard = ({ children }) => {
  const session = sessionStorage.getItem('librarian_session') || sessionStorage.getItem('admin_session');
  if (session) return children;
  return <Navigate to="/login" replace />;
};

const LibrarianLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  return (
    <div className="layout-container">
      <LibrarianSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Librarian" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export { LibrarianGuard };
export default LibrarianLayout;
