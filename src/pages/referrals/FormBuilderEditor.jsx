import React, { useState } from 'react';
import { Plus, Trash2, GripVertical, Check, Eye, HelpCircle } from 'lucide-react';
import DynamicFormRenderer from './DynamicFormRenderer';

export default function FormBuilderEditor({ schema = [], onChange }) {
  const [previewMode, setPreviewMode] = useState(false);
  const [dummyFormData, setDummyFormData] = useState({});

  const addField = () => {
    const id = 'f_' + Date.now().toString().slice(-5);
    const newField = {
      id,
      name: `customField_${schema.length + 1}`,
      label: `Field #${schema.length + 1}`,
      type: 'text',
      placeholder: '',
      required: false,
      options: ['Option 1', 'Option 2'],
      helpText: '',
    };
    onChange([...schema, newField]);
  };

  const removeField = (index) => {
    const updated = schema.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateField = (index, updates) => {
    const updated = schema.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange(updated);
  };

  const handleOptionsChange = (index, rawStr) => {
    const opts = rawStr.split(',').map((s) => s.trim()).filter(Boolean);
    updateField(index, { options: opts });
  };

  return (
    <div className="form-builder-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', background: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
            Application Form Builder ({schema.length} fields configured)
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
            Configure fields that applicants must provide when applying for this specific product.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: '1px solid #cbd5e1',
              background: previewMode ? '#2563eb' : '#ffffff',
              color: previewMode ? '#ffffff' : '#334155',
            }}
          >
            <Eye size={14} /> {previewMode ? 'Exit Preview' : 'Live Preview'}
          </button>
          {!previewMode && (
            <button
              type="button"
              onClick={addField}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: '#10b981',
                color: '#ffffff',
              }}
            >
              <Plus size={14} /> Add Form Field
            </button>
          )}
        </div>
      </div>

      {previewMode ? (
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px dashed #3b82f6' }}>
          <div style={{ marginBottom: '10px', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700 }}>
            👀 Live Applicant Form Preview:
          </div>
          <DynamicFormRenderer schema={schema} formData={dummyFormData} onChange={setDummyFormData} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {schema.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
              No fields configured yet. Click "+ Add Form Field" to add one.
            </div>
          ) : (
            schema.map((field, idx) => (
              <div
                key={field.id || idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        const autoName = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        updateField(idx, { label: newLabel, name: field.name.startsWith('custom') ? autoName : field.name });
                      }}
                      placeholder="Field Label (e.g. Applicant Name)"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        flex: 1,
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Field Type */}
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value })}
                      style={{
                        fontSize: '0.82rem',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#f8fafc',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <option value="text">Short Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Dropdown</option>
                      <option value="radio">Radio Options</option>
                      <option value="checkbox">Checkbox</option>
                      <option value="textarea">Multi-line Text</option>
                      <option value="file">File / Link</option>
                    </select>

                    {/* Required Toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!field.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                      />
                      <span>Required</span>
                    </label>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                      title="Remove field"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Sub details: placeholder / options */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(idx, { placeholder: e.target.value })}
                    placeholder="Placeholder / Hint text..."
                    style={{
                      flex: 1,
                      minWidth: '180px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem',
                    }}
                  />

                  {['select', 'radio'].includes(field.type) && (
                    <input
                      type="text"
                      value={(field.options || []).join(', ')}
                      onChange={(e) => handleOptionsChange(idx, e.target.value)}
                      placeholder="Options separated by comma (e.g. Yes, No, Maybe)"
                      style={{
                        flex: 1.5,
                        minWidth: '220px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        background: '#eff6ff',
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
