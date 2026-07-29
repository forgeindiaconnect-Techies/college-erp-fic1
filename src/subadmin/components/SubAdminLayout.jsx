import React, { useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import SubAdminSidebar from './SubAdminSidebar';
import { ThemeContext } from '../../App';
import '../../components/layout/Layout.css';

const SubAdminLayout = () => {
  const { theme } = useContext(ThemeContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth > 768);

  return (
    <div className={`layout-container ${theme}`}>
      <SubAdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`main-wrapper ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Navbar role="Sub Admin" onMenuToggle={() => setSidebarOpen(o => !o)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SubAdminLayout;

