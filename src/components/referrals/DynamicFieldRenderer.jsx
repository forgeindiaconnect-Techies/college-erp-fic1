import React from 'react';
import { AlertCircle, Calendar, Hash, Mail, Phone, Type, AlignLeft, CheckSquare, CircleDot, ChevronDown } from 'lucide-react';
import './DynamicFieldRenderer.css';

export default function DynamicFieldRenderer({
  field,
  value,
  onChange,
  error = null,
  disabled = false
}) {
  if (!field || field.isVisible === false) return null;

  const {
    fieldKey,
    label,
    description,
    fieldType = 'text',
    isRequired = false,
    placeholder = '',
    helpText = '',
    options = []
  } = field;

  const handleChange = (e) => {
    onChange(fieldKey, e.target.value);
  };

  const handleCheckboxMultiChange = (optValue, checked) => {
    const current = Array.isArray(value) ? [...value] : (value ? [value] : []);
    let updated;
    if (checked) {
      updated = [...current, optValue];
    } else {
      updated = current.filter(item => item !== optValue);
    }
    onChange(fieldKey, updated);
  };

  const renderInput = () => {
    switch (fieldType) {
      case 'number':
        return (
          <input
            type="number"
            id={`field-${fieldKey}`}
            className={`dfr-input ${error ? 'dfr-error' : ''}`}
            placeholder={placeholder || 'Enter number'}
            value={value !== undefined && value !== null ? value : ''}
            onChange={handleChange}
            disabled={disabled}
          />
        );

      case 'email':
        return (
          <input
            type="email"
            id={`field-${fieldKey}`}
            className={`dfr-input ${error ? 'dfr-error' : ''}`}
            placeholder={placeholder || 'name@example.com'}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
          />
        );

      case 'phone':
        return (
          <div className={`dfr-phone-wrap ${error ? 'dfr-error' : ''}`}>
            <span className="dfr-phone-prefix">+91</span>
            <input
              type="tel"
              id={`field-${fieldKey}`}
              maxLength={10}
              className="dfr-phone-input"
              placeholder={placeholder || '10-digit mobile number'}
              value={value || ''}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                onChange(fieldKey, val);
              }}
              disabled={disabled}
            />
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={`field-${fieldKey}`}
            className={`dfr-input ${error ? 'dfr-error' : ''}`}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={`field-${fieldKey}`}
            rows={3}
            className={`dfr-input dfr-textarea ${error ? 'dfr-error' : ''}`}
            placeholder={placeholder || 'Enter details...'}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
          />
        );

      case 'dropdown':
        return (
          <div className="dfr-select-wrap">
            <select
              id={`field-${fieldKey}`}
              className={`dfr-select ${error ? 'dfr-error' : ''}`}
              value={value || ''}
              onChange={handleChange}
              disabled={disabled}
            >
              <option value="">{placeholder || `-- Select ${label} --`}</option>
              {options.map((opt, idx) => (
                <option key={idx} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );

      case 'radio':
        return (
          <div className="dfr-radio-group">
            {options.map((opt, idx) => (
              <label key={idx} className="dfr-radio-label">
                <input
                  type="radio"
                  name={`radio-${fieldKey}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => onChange(fieldKey, opt)}
                  disabled={disabled}
                />
                <span className="dfr-radio-text">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        if (options && options.length > 0) {
          const selected = Array.isArray(value) ? value : (value ? [value] : []);
          return (
            <div className="dfr-checkbox-group">
              {options.map((opt, idx) => (
                <label key={idx} className="dfr-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={(e) => handleCheckboxMultiChange(opt, e.target.checked)}
                    disabled={disabled}
                  />
                  <span className="dfr-checkbox-text">{opt}</span>
                </label>
              ))}
            </div>
          );
        }
        return (
          <label className="dfr-checkbox-label single">
            <input
              type="checkbox"
              id={`field-${fieldKey}`}
              checked={Boolean(value)}
              onChange={(e) => onChange(fieldKey, e.target.checked)}
              disabled={disabled}
            />
            <span className="dfr-checkbox-text">{placeholder || label}</span>
          </label>
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            id={`field-${fieldKey}`}
            className={`dfr-input ${error ? 'dfr-error' : ''}`}
            placeholder={placeholder || `Enter ${label}`}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="dfr-field-group">
      {fieldType !== 'checkbox' || (options && options.length > 0) ? (
        <label htmlFor={`field-${fieldKey}`} className="dfr-label">
          <span>{label}</span>
          {isRequired && <span className="dfr-req">*</span>}
        </label>
      ) : null}

      {description && <p className="dfr-description">{description}</p>}

      {renderInput()}

      {helpText && !error && <span className="dfr-help">{helpText}</span>}

      {error && (
        <div className="dfr-error-msg">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
