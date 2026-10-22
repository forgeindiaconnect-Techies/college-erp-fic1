import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  role?: string;
  roleId?: string;
  roleColor?: string;
  onBack?: () => void;
};

/**
 * Legacy LoginPanel placeholder.
 * All authentication and dashboard routing is handled natively in `src/app/index.tsx`.
 */
export default function LoginPanel({ role = 'User', onBack }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{role} Portal</Text>
      <Text style={styles.subtitle}>Please use the main native login screen.</Text>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>‹ Return to Login</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  backText: {
    color: '#2563EB',
    fontWeight: '700',
    fontSize: 13,
  },
});
