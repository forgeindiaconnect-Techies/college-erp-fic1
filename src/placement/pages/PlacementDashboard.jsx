import React from 'react';
import PlacementManagement from '../../pages/placement/PlacementManagement';

const PlacementDashboard = ({ defaultTab = 'Dashboard' }) => {
  return (
    <div className="placement-officer-dashboard animate-fade-in">
      <PlacementManagement defaultTab={defaultTab} />
    </div>
  );
};

export default PlacementDashboard;