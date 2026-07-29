import React from 'react';

const PrincipalPlaceholder = ({ title }) => {
  return (
    <div className="dashboard-container animate-fade-in" style={{ padding: '2rem' }}>
      <div className="glass-card flex-center flex-col" style={{ padding: '4rem 2rem', textAlign: 'center', height: '60vh' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '1rem' }}>{title}</h1>
        <p className="text-muted">This module is currently under development for the Principal Dashboard.</p>
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span className="text-primary" style={{ fontWeight: 600 }}>Coming Soon!</span>
        </div>
      </div>
    </div>
  );
};

export default PrincipalPlaceholder;
