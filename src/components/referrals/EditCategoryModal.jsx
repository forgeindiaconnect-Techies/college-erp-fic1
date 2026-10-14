import React, { useState, useEffect } from 'react';
import { Edit, X, Save, RotateCcw, Sparkles, CheckCircle2, Info } from 'lucide-react';
import { getCategoryConfig, saveCategoryConfig, resetCategoryConfig } from '../../utils/categoryConfig';

export default function EditCategoryModal({
  isOpen,
  onClose,
  categoryId = 'credit-card',
  onSaved
}) {
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    badge: '',
    description: '',
    earningPotential: '',
    turnaround: '',
    highlights: '',
    tags: '',
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && categoryId) {
      const cfg = getCategoryConfig(categoryId);
      // Clean up any repeated description text if present
      let cleanDesc = cfg.description || '';
      const halfLen = Math.floor(cleanDesc.length / 2);
      if (halfLen > 20) {
        const firstHalf = cleanDesc.slice(0, halfLen).trim();
        const secondHalf = cleanDesc.slice(halfLen).trim();
        if (firstHalf === secondHalf) {
          cleanDesc = firstHalf;
        }
      }

      setForm({
        title: cfg.title || '',
        subtitle: cfg.subtitle || '',
        badge: cfg.badge || '',
        description: cleanDesc,
        earningPotential: cfg.metrics?.earningPotential || '',
        turnaround: cfg.metrics?.turnaround || '',
        highlights: Array.isArray(cfg.highlights) ? cfg.highlights.join('\n') : '',
        tags: Array.isArray(cfg.tags) ? cfg.tags.join(', ') : '',
      });
      setSavedSuccess(false);
    }
  }, [isOpen, categoryId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);

    const success = saveCategoryConfig(categoryId, form);
    setSaving(false);

    if (success) {
      setSavedSuccess(true);
      if (onSaved) onSaved(form);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset this category back to the official institutional default configuration?')) {
      resetCategoryConfig(categoryId);
      const def = getCategoryConfig(categoryId);
      setForm({
        title: def.title || '',
        subtitle: def.subtitle || '',
        badge: def.badge || '',
        description: def.description || '',
        earningPotential: def.metrics?.earningPotential || '',
        turnaround: def.metrics?.turnaround || '',
        highlights: Array.isArray(def.highlights) ? def.highlights.join('\n') : '',
        tags: Array.isArray(def.tags) ? def.tags.join(', ') : '',
      });
      if (onSaved) onSaved(def);
    }
  };

  return (
    <div
      className="bus-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="bus-modal-dialog"
        style={{
          maxWidth: '680px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#ffffff',
            borderTop: '4px solid #2563eb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Edit Category Details
                </h3>
                <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                  Super Admin
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Configure live program content, reward displays, and partner descriptions across the entire ERP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px', borderRadius: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Guide notice explaining where this reflects */}
            <div
              style={{
                padding: '12px 14px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <Info size={18} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.45 }}>
                <strong>Live Global Synchronization:</strong> When you save, this category's title, descriptions, reward figures, turnaround, and highlights will update immediately on the <strong>All Categories</strong> dashboard, the dedicated <strong>Category Page</strong>, and employee referral submission forms.
              </div>
            </div>

            {/* Title & Badge */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Category Title *
                </label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Badge Text
                </label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder="e.g. High Commission"
                />
              </div>
            </div>

            {/* Subtitle */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Partner Subtitle / Headline *
              </label>
              <input
                type="text"
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="e.g. Leading Banking & Card Partners"
              />
            </div>

            {/* Reward Potential & Turnaround Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Reward Potential Display *
                </label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  value={form.earningPotential}
                  onChange={(e) => setForm({ ...form, earningPotential: e.target.value })}
                  placeholder="e.g. ₹1,200 - ₹3,000 / card"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Turnaround Time *
                </label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  value={form.turnaround}
                  onChange={(e) => setForm({ ...form, turnaround: e.target.value })}
                  placeholder="e.g. Instant card tracking"
                />
              </div>
            </div>

            {/* Category Description */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Category Description *
              </label>
              <textarea
                rows={3}
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe this referral category and eligibility criteria..."
              />
            </div>

            {/* Key Highlights */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Key Highlights (One bullet point per line)
              </label>
              <textarea
                rows={4}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                value={form.highlights}
                onChange={(e) => setForm({ ...form, highlights: e.target.value })}
                placeholder="Enter highlights, one per line..."
              />
            </div>

            {/* Partner Tags */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Accredited Partner Tags (Comma-separated)
              </label>
              <input
                type="text"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. HDFC Bank, ICICI Bank, SBI Cards, Axis Bank"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}
          >
            <button
              type="button"
              onClick={handleReset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              <span>Reset Default</span>
            </button>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: savedSuccess ? '#10b981' : '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)'
                }}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
