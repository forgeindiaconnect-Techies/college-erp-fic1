import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ModalSelect from './ModalSelect';

export interface DynamicFieldDef {
  fieldKey: string;
  label: string;
  description?: string;
  fieldType?: string;
  step?: number;
  isRequired?: boolean;
  isVisible?: boolean;
  isSystem?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  errorMessage?: string;
}

interface Props {
  fields: DynamicFieldDef[];
  values: Record<string, any>;
  errors: Record<string, string>;
  onChange: (fieldKey: string, val: any) => void;
  step?: number;
  currentStep?: number;
}

export default function DynamicFieldSection({
  fields,
  values,
  errors,
  onChange,
  step,
  currentStep,
}: Props) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) return null;

  const activeStep = step !== undefined ? step : currentStep !== undefined ? currentStep : 1;

  // Filter fields for this step that are not handled by default hardcoded controls
  const stepFields = fields.filter((f) => {
    if (f.isVisible === false) return false;
    const fStep = f.step || 1;
    return fStep === activeStep;
  });

  if (stepFields.length === 0) return null;

  return (
    <View style={styles.container}>
      {stepFields.map((f) => {
        const key = f.fieldKey;
        const val = values[key] !== undefined && values[key] !== null ? String(values[key]) : '';
        const err = errors[key];
        const isDropdown = f.fieldType === 'dropdown' || f.fieldType === 'select';
        const isTextArea = f.fieldType === 'textarea';
        const isNumeric = f.fieldType === 'number';
        const isPhone = f.fieldType === 'phone';
        const isEmail = f.fieldType === 'email';

        if (isDropdown) {
          return (
            <ModalSelect
              key={key}
              label={f.label || key}
              value={val}
              options={f.options || []}
              required={Boolean(f.isRequired)}
              placeholder={f.placeholder || `-- Select ${f.label} --`}
              error={err}
              helperText={f.description || f.helpText}
              onSelect={(selectedVal) => onChange(key, selectedVal)}
            />
          );
        }

        return (
          <View key={key} style={styles.inputGroup}>
            <Text style={styles.label}>
              {f.label || key} {f.isRequired && <Text style={styles.req}>*</Text>}
            </Text>
            {f.description ? (
              <Text style={styles.desc}>{f.description}</Text>
            ) : null}

            <TextInput
              style={[
                styles.input,
                isTextArea && styles.textArea,
                err ? styles.inputError : null,
              ]}
              placeholder={f.placeholder || `Enter ${f.label || key}`}
              placeholderTextColor="#94A3B8"
              value={val}
              onChangeText={(t) => onChange(key, t)}
              keyboardType={
                isNumeric
                  ? 'numeric'
                  : isPhone
                  ? 'phone-pad'
                  : isEmail
                  ? 'email-address'
                  : 'default'
              }
              autoCapitalize={isEmail ? 'none' : 'sentences'}
              multiline={isTextArea}
              numberOfLines={isTextArea ? 3 : 1}
            />

            {err ? <Text style={styles.errorText}>⚠ {err}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  req: {
    color: '#EF4444',
  },
  desc: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 4,
  },
});
