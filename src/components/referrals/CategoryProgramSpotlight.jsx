import React from 'react';
import {
  Award, Clock, Building2, CheckCircle2, Sparkles, Edit,
  HelpCircle, ArrowRight, ShieldCheck, Plus, ExternalLink
} from 'lucide-react';

export default function CategoryProgramSpotlight({
  config,
  rootRole = 'admin',
  onOpenEdit,
  onOpenSubmit,
  onOpenPublish
}) {
  if (!config) return null;

  const isSuperAdmin = rootRole === 'superadmin';

  return (
    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── Main Category Program Spotlight Card ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: config.gradient || 'linear-gradient(90deg, #2563eb, #10b981)'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div style={{ flex: '1 1 340px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe'
                }}
              >
                {config.badge || 'Official Program'}
              </span>
              <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                • {config.subtitle}
              </span>
            </div>

            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {config.title}
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.55 }}>
              {config.description}
            </p>
          </div>

          {/* Quick Actions in Spotlight */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isSuperAdmin && onOpenEdit && (
              <button
                type="button"
                onClick={onOpenEdit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#1e293b',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                title="Edit this category's title, rewards, turnaround, and highlights"
              >
                <Edit size={14} style={{ color: '#2563eb' }} />
                <span>Edit Category Details</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Configured Reward</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1d4ed8', marginTop: '2px' }}>
                {config.metrics?.earningPotential || 'Institutional Rates'}
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Turnaround Time</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
                {config.metrics?.turnaround || 'Direct Processing'}
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Accredited Partners</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {Array.isArray(config.tags) && config.tags.length > 0 ? config.tags.join(', ') : 'Verified Institutional Partners'}
              </div>
            </div>
          </div>
        </div>

        {/* Key Highlights List */}
        {Array.isArray(config.highlights) && config.highlights.length > 0 && (
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '8px' }}>
              Program Key Highlights
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
              {config.highlights.map((hl, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
                  <CheckCircle2 size={15} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Helpful Guided Instructions Bar ("What I Want to Do On This Page") ── */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <HelpCircle size={17} />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a' }}>
              How this Category Works:
            </span>
            <span style={{ fontSize: '0.82rem', color: '#475569', marginLeft: '6px' }}>
              {isSuperAdmin
                ? 'As Super Admin, you can configure category rates and descriptions using "Edit Category Details" above, publish specific opportunities in Publishing Central, or submit direct referrals.'
                : 'Review accredited partner terms above and submit candidate leads to earn approved institutional referral rewards.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
