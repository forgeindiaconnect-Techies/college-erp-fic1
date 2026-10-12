import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft, Clock, Hammer, ShieldAlert } from 'lucide-react';
import './HodComingSoon.css';

const HodComingSoon = ({ moduleName }) => {
  const navigate = useNavigate();

  return (
    <div className="hod-coming-soon-container animate-fade-in">
      <div className="hod-coming-soon-card glass-card">
        <div className="coming-soon-badge">
          <Construction size={16} /> Under Construction
        </div>
        
        <div className="coming-soon-illustration">
          <div className="pulse-circle">
            <Hammer size={48} className="bouncing-icon" />
          </div>
          <div className="glow-bar"></div>
        </div>

        <h1 className="coming-soon-title">{moduleName || 'Module'} Component</h1>
        <p className="coming-soon-subtitle">
          The <strong>{moduleName || 'requested'}</strong> module is currently being built and integrated.
          Our engineers are preparing dynamic analytics tables, administrative flows, and data hooks.
        </p>

        <div className="coming-soon-meta">
          <div className="meta-item">
            <Clock size={15} />
            <span>Target: Phase 2 Seeding</span>
          </div>
          <div className="meta-item">
            <ShieldAlert size={15} />
            <span>Scope: HOD Verified Only</span>
          </div>
        </div>

        <div className="coming-soon-actions">
          <button 
            type="button"
            onClick={() => navigate(-1)} 
            className="btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3730A5', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default HodComingSoon;
