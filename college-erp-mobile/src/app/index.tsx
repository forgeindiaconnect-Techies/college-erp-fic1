import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import {
  loginUser,
  getSavedUser,
  logoutUser,
  getApiBaseUrl,
  setCustomApiUrl,
  testApiConnection,
  type MobileUser,
} from '../services/api';

import StudentDashboard from '../components/dashboards/StudentDashboard';
import ParentDashboard from '../components/dashboards/ParentDashboard';
import DriverDashboard from '../components/dashboards/DriverDashboard';
import StaffDashboard from '../components/dashboards/StaffDashboard';
import WatchmanDashboard from '../components/dashboards/WatchmanDashboard';

export default function MobileApp() {
  const [currentUser, setCurrentUser] = useState<MobileUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRolePreset, setSelectedRolePreset] = useState<string>('parent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server Connection & Diagnostics
  const [activeServerUrl, setActiveServerUrl] = useState<string>('');
  const [serverStatus, setServerStatus] = useState<{ ok?: boolean; message?: string; latency?: number } | null>(null);
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [showServerModal, setShowServerModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Check saved session and active server on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const url = await getApiBaseUrl();
        if (isMounted) {
          setActiveServerUrl(url);
          setCustomUrlInput(url);
        }
        const saved = await getSavedUser();
        if (isMounted && saved) {
          setCurrentUser(saved);
        }
      } catch (err) {
        console.warn('Session load error:', err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTestConnection = async (urlToCheck?: string) => {
    setIsTestingServer(true);
    try {
      const result = await testApiConnection(urlToCheck || activeServerUrl);
      setServerStatus({ ok: result.ok, message: result.message, latency: result.latencyMs });
    } catch (e: any) {
      setServerStatus({ ok: false, message: e.message || 'Cannot reach server' });
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleSaveCustomServer = async () => {
    try {
      await setCustomApiUrl(customUrlInput.trim() ? customUrlInput.trim() : null);
      const newUrl = await getApiBaseUrl();
      setActiveServerUrl(newUrl);
      setShowServerModal(false);
      handleTestConnection(newUrl);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update server URL');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email/user ID and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const user = await loginUser(email, password);
      setCurrentUser(user);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to log out of your College ERP mobile account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            setCurrentUser(null);
            setEmail('');
            setPassword('');
          },
        },
      ]
    );
  }, []);

  const handleSelectRolePreset = (role: string) => {
    setSelectedRolePreset(role);
    setErrorMessage(null);
    if (role === 'staff') {
      setEmail('pooja@gmail.com');
      setPassword('pooja');
    } else if (role === 'student') {
      setEmail('john@college.edu');
      setPassword('password123');
    } else if (role === 'parent') {
      setEmail('parent_john@college.edu');
      setPassword('password123');
    } else if (role === 'driver') {
      setEmail('rajesh.driver@college.edu');
      setPassword('password123');
    } else if (role === 'watchman') {
      setEmail('watchman@college.edu');
      setPassword('password123');
    }
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <View style={styles.brandIconCircle}>
          <Text style={styles.brandIconText}>🎓</Text>
        </View>
        <Text style={styles.splashTitle}>College ERP</Text>
        <Text style={styles.splashSubtitle}>Loading native campus portal...</Text>
        <ActivityIndicator size="large" color="#1E3A8A" style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  // If user is authenticated, route directly to the 100% native role dashboard
  if (currentUser) {
    const normalizedRole = (currentUser.role || '').toLowerCase().trim();

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {/* 100% Pure Native Dashboard Routing */}
        {(() => {
          if (normalizedRole === 'student') {
            return <StudentDashboard user={currentUser} onLogout={handleLogout} />;
          }

          if (normalizedRole === 'parent') {
            return <ParentDashboard user={currentUser} onLogout={handleLogout} />;
          }

          if (normalizedRole === 'driver') {
            return <DriverDashboard user={currentUser} onLogout={handleLogout} />;
          }

          if (
            normalizedRole === 'staff' ||
            normalizedRole === 'faculty' ||
            normalizedRole === 'teacher' ||
            normalizedRole === 'hod' ||
            normalizedRole === 'principal' ||
            normalizedRole === 'admin' ||
            normalizedRole === 'superadmin'
          ) {
            return <StaffDashboard user={currentUser} onLogout={handleLogout} />;
          }

          if (
            normalizedRole === 'watchman' ||
            normalizedRole === 'security'
          ) {
            return <WatchmanDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // Unassigned / Custom Role Fallback
          return (
            <ScrollView contentContainerStyle={styles.unsupportedRoleContainer}>
              <Text style={styles.unsupportedIcon}>🔒</Text>
              <Text style={styles.unsupportedTitle}>Role Access</Text>
              <Text style={styles.unsupportedText}>
                Logged in as <Text style={{ fontWeight: '700' }}>{currentUser.name}</Text> (Role: {currentUser.role}).
              </Text>
              <Text style={styles.unsupportedSubtext}>
                No native mobile module configured for this role.
              </Text>

              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={handleLogout}
              >
                <Text style={styles.primaryActionButtonText}>Sign Out & Switch Account</Text>
              </TouchableOpacity>
            </ScrollView>
          );
        })()}
      </SafeAreaView>
    );
  }

  // 100% Native Login Screen
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.loginScrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Branding */}
          <View style={styles.loginHeader}>
            <View style={styles.loginBrandIconCircle}>
              <Text style={styles.loginBrandEmoji}>🎓</Text>
            </View>
            <Text style={styles.loginAppName}>College ERP</Text>
            <Text style={styles.loginTagline}>
              Integrated Mobile Campus Management System
            </Text>
          </View>

          {/* Role Presets Quick Selection */}
          <View style={styles.rolePresetsWrapper}>
            <Text style={styles.rolePresetLabel}>Select Your Portal Role</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roleChipsScroll}
            >
              {[
                { id: 'parent', label: '👨‍👩‍👧 Parent' },
                { id: 'student', label: '👨‍🎓 Student' },
                { id: 'staff', label: '👩‍🏫 Staff' },
                { id: 'driver', label: '🚌 Driver' },
                { id: 'watchman', label: '🛡️ Watchman' },
              ].map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleChip,
                    selectedRolePreset === role.id && styles.roleChipActive,
                  ]}
                  onPress={() => handleSelectRolePreset(role.id)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      selectedRolePreset === role.id && styles.roleChipTextActive,
                    ]}
                  >
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In to Continue</Text>
            <Text style={styles.formSubtitle}>
              Enter your college registered email and password
            </Text>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>⚠️ {errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address or User ID</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. user@college.edu or 21CS042"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your account password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeButtonIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  <Text style={styles.eyeButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Server Connection Status & Config Banner */}
            <View style={styles.serverConnectionBox}>
              <View style={styles.serverStatusRow}>
                <View style={[styles.serverStatusDot, { backgroundColor: serverStatus?.ok === false ? '#EF4444' : '#10B981' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.serverStatusTitle}>
                    Connected Server: {activeServerUrl.includes('localhost') || activeServerUrl.includes('192.168') || activeServerUrl.includes('10.0.2.2') ? '💻 Local Dev Server' : '☁️ Cloud Server'}
                  </Text>
                  <Text style={styles.serverStatusUrl} numberOfLines={1}>
                    {activeServerUrl || 'Detecting backend...'}
                  </Text>
                  {serverStatus?.latency !== undefined && (
                    <Text style={styles.serverLatencyText}>
                      {serverStatus.ok ? `✓ Online (${serverStatus.latency}ms)` : `⚠️ ${serverStatus.message}`}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.serverActionBtn}
                  onPress={() => handleTestConnection()}
                  disabled={isTestingServer}
                >
                  {isTestingServer ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Text style={styles.serverActionBtnText}>Ping</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.serverActionBtn, { backgroundColor: '#F1F5F9' }]}
                  onPress={() => setShowServerModal(true)}
                >
                  <Text style={[styles.serverActionBtnText, { color: '#0F172A' }]}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.loginFooter}>
            <Text style={styles.footerSecurityText}>
              🔒 Secure 256-bit Encrypted Campus ERP Access
            </Text>
            <Text style={styles.footerCopyText}>
              © {new Date().getFullYear()} College ERP • Fully Native Android Application
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Backend Server Configuration Modal */}
      <Modal
        visible={showServerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowServerModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.serverModalContent}>
            <Text style={styles.serverModalTitle}>🌐 Configure Backend Server</Text>
            <Text style={styles.serverModalSub}>
              Select or enter the ERP API base URL. Local dev matches the web application on port 5000.
            </Text>

            <View style={{ marginVertical: 14 }}>
              <Text style={styles.inputLabel}>Backend Server URL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. http://192.168.1.15:5000/api"
                placeholderTextColor="#94A3B8"
                value={customUrlInput}
                onChangeText={setCustomUrlInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Quick Choice Buttons */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={() => {
                  setCustomUrlInput('https://college-erp-software.onrender.com/api');
                }}
              >
                <Text style={styles.quickPresetBtnText}>☁️ Cloud Render</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickPresetBtn}
                onPress={async () => {
                  await setCustomApiUrl(null);
                  const def = await getApiBaseUrl();
                  setCustomUrlInput(def);
                }}
              >
                <Text style={styles.quickPresetBtnText}>🔄 Reset Auto Dev</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#E2E8F0' }]}
                onPress={() => setShowServerModal(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#334155' }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#2563EB', flex: 2 }]}
                onPress={handleSaveCustomServer}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Save & Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#C7D2FE',
  },
  brandIconText: {
    fontSize: 36,
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  globalHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoEmoji: {
    fontSize: 18,
  },
  headerCollegeName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRolePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  headerRolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    letterSpacing: 0.5,
  },
  unsupportedRoleContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsupportedIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  unsupportedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  unsupportedText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  unsupportedSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryActionButton: {
    width: '100%',
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginScrollContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loginBrandIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBrandEmoji: {
    fontSize: 32,
  },
  loginAppName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  loginTagline: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  rolePresetsWrapper: {
    marginBottom: 18,
  },
  rolePresetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleChipsScroll: {
    gap: 8,
  },
  roleChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleChipActive: {
    backgroundColor: '#1E3A8A',
    borderColor: '#1E3A8A',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  roleChipTextActive: {
    color: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorAlertText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eyeButtonIcon: {
    fontSize: 16,
  },
  eyeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  submitButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginFooter: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerSecurityText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  footerCopyText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  serverConnectionBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  serverStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serverStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  serverStatusTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  serverStatusUrl: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  serverLatencyText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  serverActionBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  serverActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  serverModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  serverModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  serverModalSub: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  quickPresetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  quickPresetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  modalBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
