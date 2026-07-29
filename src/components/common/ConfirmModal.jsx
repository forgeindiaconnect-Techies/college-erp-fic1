import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, type = 'warning', confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning': return <AlertCircle size={48} color="#f59e0b" />;
      case 'danger': return <AlertCircle size={48} color="#ef4444" />;
      case 'success': return <CheckCircle2 size={48} color="#10b981" />;
      case 'info':
      default: return <Info size={48} color="#3b82f6" />;
    }
  };

  const getConfirmColor = () => {
    switch (type) {
      case 'warning': return '#f59e0b';
      case 'danger': return '#ef4444';
      case 'success': return '#10b981';
      case 'info':
      default: return '#3b82f6';
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="animate-fade-in" style={{
        background: 'var(--bg-primary, #ffffff)', borderRadius: '16px',
        padding: '32px', width: '90%', maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <div style={{ marginBottom: '16px' }}>
          {getIcon()}
        </div>
        
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main, #111827)', marginBottom: '8px' }}>
          {title}
        </h2>
        
        <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5', wordBreak: 'break-word' }}>
          {message}
        </p>

        {onConfirm ? (
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <button 
              onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.05)', color: 'var(--text-main, #111827)', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              {cancelText}
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', background: getConfirmColor(), color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              {confirmText}
            </button>
          </div>
        ) : (
          <button 
            onClick={onClose}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: getConfirmColor(), color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfirmModal;
