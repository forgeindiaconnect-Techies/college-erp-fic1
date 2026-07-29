import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ value, onChange, options, placeholder = "Select an option", icon: Icon, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="custom-select-container" ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Hidden native select for form validation if required */}
      {required && (
        <select 
          value={value} 
          onChange={() => {}} 
          required={required} 
          style={{ opacity: 0, position: 'absolute', zIndex: -1, width: '100%', height: '100%', left: 0, top: 0, pointerEvents: 'none' }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      )}

      <div 
        className="custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.65rem 0.9rem', background: 'var(--bg-primary)', 
          border: '1px solid var(--border-color)', borderRadius: '8px',
          cursor: 'pointer', color: value ? 'var(--text-main)' : 'var(--text-muted)',
          transition: 'all 0.2s ease', width: '100%',
          boxShadow: isOpen ? '0 0 0 3px rgba(79,70,229,0.1)' : 'none',
          borderColor: isOpen ? 'var(--primary)' : 'var(--border-color)',
          minHeight: '42px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          {Icon && <Icon size={18} className="text-muted" />}
          <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: value ? 'inherit' : 'var(--text-muted)' }}>
            {selectedOption ? selectedOption.label : (value || placeholder)}
          </span>
        </div>
        <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div 
          className="custom-select-dropdown"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, minWidth: '100%', whiteSpace: 'nowrap',
            background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
            borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 9999, maxHeight: '250px', overflowY: 'auto',
            animation: 'fadeInDown 0.2s ease forwards'
          }}
        >
          {options.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No options available</div>
          ) : (
            <div style={{ padding: '0.5rem' }}>
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '0.7rem 1rem', fontSize: '0.9rem', cursor: 'pointer', borderRadius: '8px',
                    color: value === opt.value ? 'var(--primary)' : 'var(--text-main)',
                    background: value === opt.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center',
                    fontWeight: value === opt.value ? 600 : 500,
                    marginBottom: '2px'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== opt.value) e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (value !== opt.value) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CustomSelect;
