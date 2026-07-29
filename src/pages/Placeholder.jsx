import React from 'react';

const Placeholder = ({ title }) => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>This module is currently under construction.</p>
    </div>
  );
};

export default Placeholder;
