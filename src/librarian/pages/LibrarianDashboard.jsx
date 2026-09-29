import React from 'react';
import LibraryManagement from '../../pages/library/LibraryManagement';

const LibrarianDashboard = ({ defaultTab = 'Dashboard' }) => {
  return <LibraryManagement defaultTab={defaultTab} />;
};

export default LibrarianDashboard;
