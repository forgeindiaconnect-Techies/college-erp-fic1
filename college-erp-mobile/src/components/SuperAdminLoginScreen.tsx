import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  onSuccess?: (token: string, user: any) => void;
  onBack?: () => void;
};

export default function SuperAdminLoginScreen({ onSuccess, onBack }: Props) {
  const [email, setEmail] = useState('superadmin@collegeerp.edu');
  const [password, setPassword] = useState('Admin@College2026');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    setErrorMsg(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid official administrative email ID.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // Simulated Super Admin Authentication handshake
      await new Promise((resolve) => setTimeout(resolve, 1200));

      Alert.alert(
        'Super Admin Authentication',
        `Access Granted for ${trimmedEmail}\nRole: Super Administrator (Enterprise Root)`,
        [
          {
            text: 'Proceed to Dashboard',
            onPress: () => {
              if (onSuccess) {
                onSuccess('superadmin-session-token', {
                  email: trimmedEmail,
                  role: 'Super Admin',
                  name: 'Root Administrator',
                });
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Super Admin Recovery',
      `Enterprise credential recovery instructions have been dispatched to ${email || 'your registered security email'}.`
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── TOP HERO BANNER: Royal Blue Palette & University Crest ── */}
          <View style={styles.heroBanner}>
            {/* Ambient Background Circles */}
            <View style={styles.glowTopRight} />
            <View style={styles.glowTopLeft} />

            {/* Back Button (if provided) */}
            {onBack && (
              <TouchableOpacity style={styles.backButton} onPress={onBack}>
                <Text style={styles.backButtonText}>‹ Back</Text>
              </TouchableOpacity>
            )}

            {/* University Crest Icon */}
            <View style={styles.crestWrapper}>
              <View style={styles.crestBox}>
                <Text style={styles.crestStar}>★</Text>
                <View style={styles.crestPediment} />
                <View style={styles.columnsRow}>
                  <View style={styles.columnBar} />
                  <View style={styles.columnBar} />
                  <View style={styles.columnBar} />
                  <View style={styles.columnBar} />
                </View>
                <View style={styles.crestBase} />
                <View style={styles.openBookBase}>
                  <Text style={styles.bookSymbol}>📖</Text>
                </View>
              </View>
            </View>

            {/* Main Branding */}
            <View style={styles.brandingBox}>
              <View style={styles.brandTitleRow}>
                <Text style={styles.brandTitleWhite}>College </Text>
                <Text style={styles.brandTitleCyan}>ERP</Text>
              </View>
              <Text style={styles.brandTagline}>Smart Education. Better Tomorrow.</Text>
            </View>

            {/* Super Admin Panel Floating Glassmorphism Badge */}
            <View style={styles.superAdminBadge}>
              <View style={styles.badgeLeft}>
                <View style={styles.crownShieldBox}>
                  <Text style={styles.crownIcon}>👑</Text>
                </View>
                <View>
                  <View style={styles.badgeHeaderRow}>
                    <Text style={styles.badgeTitle}>Super Admin Panel</Text>
                    <View style={styles.rootPill}>
                      <Text style={styles.rootPillText}>ROOT</Text>
                    </View>
                  </View>
                  <Text style={styles.badgeSubtitle}>Manage • Monitor • Control</Text>
                </View>
              </View>

              <View style={styles.isolatedPill}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.isolatedText}>Isolated</Text>
              </View>
            </View>
          </View>

          {/* ── BOTTOM WHITE LOGIN CARD: Sweeping Curve ── */}
          <View style={styles.cardContainer}>
            {/* Pull Bar */}
            <View style={styles.cardPullBar} />

            {/* Watermark Crest Background */}
            <View style={styles.watermarkContainer}>
              <Text style={styles.watermarkIcon}>🛡️</Text>
            </View>

            {/* Welcome Heading */}
            <View style={styles.welcomeBox}>
              <View style={styles.tenantPill}>
                <Text style={styles.tenantPillText}>🛡️ Enterprise Multi-Tenant</Text>
              </View>
              <Text style={styles.welcomeHeading}>Welcome Back!</Text>
              <Text style={styles.welcomeSubheading}>
                Sign in to access the Super Admin Dashboard
              </Text>
            </View>

            {/* Error / Alert Notice */}
            {errorMsg && (
              <View style={styles.alertNoticeBox}>
                <Text style={styles.alertNoticeIcon}>⚠️</Text>
                <Text style={styles.alertNoticeText}>{errorMsg}</Text>
              </View>
            )}

            {/* ── Input Fields ── */}
            <View style={styles.formContainer}>
              {/* Field 1: Admin Email ID */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Admin Email ID <Text style={styles.asterisk}>*</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputFieldIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="admin@institution.edu"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  {email.length > 0 && (
                    <TouchableOpacity onPress={() => setEmail('')} style={styles.clearIconBtn}>
                      <Text style={styles.clearIconText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Field 2: Password */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordLabelRow}>
                  <Text style={styles.inputLabel}>
                    Password <Text style={styles.asterisk}>*</Text>
                  </Text>
                  <TouchableOpacity onPress={handleForgotPassword}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputFieldIcon}>🔒</Text>
                  <TextInput
                    style={[styles.textInput, { paddingRight: 40 }]}
                    placeholder="••••••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!isPasswordVisible}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeToggleBtn}
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Text style={styles.eyeToggleIcon}>
                      {isPasswordVisible ? '👁️' : '🙈'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me Checkbox */}
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.customCheckbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={styles.checkmarkIcon}>✓</Text>}
                  </View>
                  <Text style={styles.rememberLabel}>Remember this device</Text>
                </TouchableOpacity>

                <Text style={styles.sessionDurationText}>Session: 30 days</Text>
              </View>

              {/* ── Large Blue Gradient Sign In Button ── */}
              <TouchableOpacity
                style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.signInButtonText}>Verifying Credentials...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonLoadingRow}>
                    <Text style={styles.signInButtonText}>Sign In to Super Admin</Text>
                    <Text style={styles.buttonArrow}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Footer: Secure Access & Role Disclaimer ── */}
            <View style={styles.footerContainer}>
              <View style={styles.sslBadge}>
                <Text style={styles.sslShieldIcon}>🛡️</Text>
                <Text style={styles.sslBadgeText}>
                  End-to-End Encrypted • 256-Bit TLS Security
                </Text>
              </View>

              <Text style={styles.disclaimerText}>
                Authorized Super Administrative Personnel Only
              </Text>

              {/* Home Indicator */}
              <View style={styles.homeIndicatorBar} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#072B6B',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  /* ── Hero Banner Styles ── */
  heroBanner: {
    backgroundColor: '#072B6B',
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#38BDF8',
    opacity: 0.25,
  },
  glowTopLeft: {
    position: 'absolute',
    top: 60,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E40AF',
    opacity: 0.35,
  },
  backButton: {
    position: 'absolute',
    top: 14,
    left: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Crest */
  crestWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  crestBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  crestStar: {
    color: '#FBBF24',
    fontSize: 10,
    lineHeight: 11,
  },
  crestPediment: {
    width: 32,
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    marginBottom: 2,
  },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 28,
    marginVertical: 1,
  },
  columnBar: {
    width: 3,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  crestBase: {
    width: 34,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  openBookBase: {
    marginTop: 1,
  },
  bookSymbol: {
    fontSize: 10,
  },

  /* Branding */
  brandingBox: {
    alignItems: 'center',
    marginBottom: 14,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitleWhite: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  brandTitleCyan: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E0F2FE',
    letterSpacing: 0.3,
    marginTop: 2,
  },

  /* Super Admin Panel Badge */
  superAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crownShieldBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  crownIcon: {
    fontSize: 18,
  },
  badgeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rootPill: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  rootPillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.5,
  },
  badgeSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#BAE6FD',
    marginTop: 1,
  },
  isolatedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(6, 78, 59, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  greenPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
  },
  isolatedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6EE7B7',
  },

  /* ── White Curved Card ── */
  cardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    marginTop: -20,
    shadowColor: '#072B6B',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    justifyContent: 'space-between',
  },
  cardPullBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  watermarkContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    opacity: 0.08,
  },
  watermarkIcon: {
    fontSize: 48,
  },

  welcomeBox: {
    marginBottom: 16,
  },
  tenantPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  tenantPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
  welcomeHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  welcomeSubheading: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },

  /* Alert Notice */
  alertNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  alertNoticeIcon: {
    fontSize: 14,
  },
  alertNoticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
  },

  /* Form */
  formContainer: {
    gap: 12,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  asterisk: {
    color: '#2563EB',
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputFieldIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  clearIconBtn: {
    padding: 4,
  },
  clearIconText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
  },
  eyeToggleBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  eyeToggleIcon: {
    fontSize: 14,
  },

  /* Remember Row */
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmarkIcon: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 12,
  },
  rememberLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  sessionDurationText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },

  /* Sign In Button */
  signInButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 6,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  /* Footer */
  footerContainer: {
    alignItems: 'center',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  sslBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  sslShieldIcon: {
    fontSize: 11,
  },
  sslBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  homeIndicatorBar: {
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginTop: 12,
  },
});

