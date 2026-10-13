import React from 'react';
import { AlertCircle, HelpCircle, Upload, Check } from 'lucide-react';

export default function DynamicFormRenderer({ schema = [], formData = {}, onChange, errors = {} }) {
  if (!schema || schema.length === 0) {
    return (
      <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.9rem', textAlign: 'center' }}>
        No application fields configured for this opportunity.
      </div>
    );
  }

  const handleChange = (fieldName, value) => {
    onChange({
      ...formData,
      [fieldName]: value,
    });
  };

  return (
    <div className="dyn-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
      {schema.map((field) => {
        const error = errors[field.name];
        const val = formData[field.name] !== undefined ? formData[field.name] : (field.defaultValue !== undefined ? field.defaultValue : '');

        return (
          <div
            key={field.id || field.name}
            className="dyn-form-group"
            style={{
              gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{field.label}</span>
              {field.required && <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>}
              {field.helpText && (
                <span title={field.helpText} style={{ cursor: 'help', color: '#94a3b8' }}>
                  <HelpCircle size={14} />
                </span>
              )}
            </label>

            {/* Input types */}
            {field.type === 'text' && (
              <input
                type="text"
                value={val}
                placeholder={field.placeholder || `Enter ${field.label}`}
                onChange={(e) => handleChange(field.name, e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={val}
                placeholder={field.placeholder || `Enter ${field.label}`}
                onChange={(e) => handleChange(field.name, e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            )}

            {field.type === 'date' && (
              <input
                type="date"
                value={val}
                onChange={(e) => handleChange(field.name, e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              />
            )}

            {field.type === 'select' && (
              <select
                value={val}
                onChange={(e) => handleChange(field.name, e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="">-- Select an option --</option>
                {(field.options || []).map((opt, i) => (
                  <option key={i} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {field.type === 'radio' && (
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '6px 0' }}>
                {(field.options || []).map((opt, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer', color: '#334155' }}>
                    <input
                      type="radio"
                      name={field.name}
                      value={opt}
                      checked={val === opt}
                      onChange={() => handleChange(field.name, opt)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === 'checkbox' && (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: '#334155', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  style={{ marginTop: '3px', cursor: 'pointer' }}
                />
                <span>{field.placeholder || field.label}</span>
              </label>
            )}

            {field.type === 'textarea' && (
              <textarea
                rows={3}
                value={val}
                placeholder={field.placeholder || `Enter ${field.label}`}
                onChange={(e) => handleChange(field.name, e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  background: '#ffffff',
                }}
              />
            )}

            {field.type === 'file' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <input
                  type="text"
                  placeholder={field.placeholder || 'Enter document / cloud drive link or upload URL'}
                  value={val}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: error ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    background: '#ffffff',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Provide link (Google Drive, OneDrive, or document repository)</span>
              </div>
            )}

            {error && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} /> {error}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
