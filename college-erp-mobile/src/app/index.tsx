import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
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
  requestPasswordReset,
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
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field validation focus states
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Input refs for keyboard navigation
  const emailInputRef = useRef<any>(null);
  const passwordInputRef = useRef<any>(null);
  const scrollViewRef = useRef<any>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [forgotFeedback, setForgotFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ── Entrance & Breathing Animations ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Run initial entrance animations on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    // Subtle gentle breathing pulse on the college emblem
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [fadeAnim, pulseAnim]);

  // Check saved session on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await getApiBaseUrl();
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

  // ── Unified Automatic Role-Based Login ──
  const handleLogin = async () => {
    if (isSubmitting) return;

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail && !trimmedPassword) {
      setErrorMessage('Please enter your College Email or ID, and your Password.');
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage('Please enter your College Email Address or Employee/Student ID.');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // 1. Authenticate with trusted backend API
      const user = await loginUser(trimmedEmail, trimmedPassword);

      // 2. Validate role returned by the trusted authenticated response
      if (!user.role) {
        throw new Error('Authenticated account does not have a designated campus role. Please contact administration.');
      }

      // 3. Set authenticated state (triggers automatic role-based navigation)
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
      'Are you sure you want to sign out of your College ERP mobile account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            setCurrentUser(null);
            setPassword('');
            setErrorMessage(null);
          },
        },
      ]
    );
  }, []);

  // Handle Forgot Password Dispatch
  const handleForgotPasswordSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotFeedback({ type: 'error', message: 'Please enter your registered college email.' });
      return;
    }

    try {
      setIsSubmittingForgot(true);
      setForgotFeedback(null);
      const msg = await requestPasswordReset(forgotEmail.trim());
      setForgotFeedback({ type: 'success', message: msg });
    } catch (err: any) {
      setForgotFeedback({
        type: 'error',
        message: err.message || 'Unable to submit reset request. Please check the email address.',
      });
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // ── Initializing / Splash Screen ──
  if (isInitializing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <View style={styles.brandIconCircle}>
          <Text style={styles.brandIconText}>🎓</Text>
        </View>
        <Text style={styles.splashTitle}>Arignar Anna College ERP</Text>
        <Text style={styles.splashSubtitle}>Verifying secure institutional session...</Text>
        <ActivityIndicator size="large" color="#1E3A8A" style={{ marginTop: 28 }} />
      </SafeAreaView>
    );
  }

  // ── Automatic Role-Based Dashboard Routing ──
  // Reads role strictly from the trusted authenticated backend response
  if (currentUser) {
    const rawRole = (currentUser.role || '').toLowerCase().trim();

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {(() => {
          // 1. Student Dashboard
          if (rawRole === 'student') {
            return <StudentDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // 2. Parent Dashboard
          if (rawRole === 'parent') {
            return <ParentDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // 3. Driver Dashboard
          if (rawRole === 'driver') {
            return <DriverDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // 4. Watchman & Security Dashboard
          if (rawRole === 'watchman' || rawRole === 'security') {
            return <WatchmanDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // 5. Staff, Faculty, HOD, Principal, Admin & Associated Roles Dashboard
          if (
            rawRole === 'staff' ||
            rawRole === 'faculty' ||
            rawRole === 'teacher' ||
            rawRole === 'hod' ||
            rawRole === 'principal' ||
            rawRole === 'admin' ||
            rawRole === 'superadmin' ||
            rawRole === 'super admin' ||
            rawRole === 'sub admin' ||
            rawRole === 'librarian' ||
            rawRole === 'library' ||
            rawRole === 'accounts' ||
            rawRole === 'hostel' ||
            rawRole === 'placement' ||
            rawRole === 'placement officer' ||
            rawRole === 'placement cell'
          ) {
            return <StaffDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // Unassigned / Unrecognized Role Security Safeguard
          return (
            <ScrollView contentContainerStyle={styles.unsupportedRoleContainer}>
              <View style={styles.unsupportedIconWrapper}>
                <Text style={styles.unsupportedIcon}>🔒</Text>
              </View>
              <Text style={styles.unsupportedTitle}>Restricted Role Access</Text>
              <Text style={styles.unsupportedText}>
                Logged in as <Text style={{ fontWeight: '800', color: '#0F172A' }}>{currentUser.name}</Text>
              </Text>
              <View style={styles.unsupportedBadge}>
                <Text style={styles.unsupportedBadgeText}>Detected Role: {currentUser.role}</Text>
              </View>
              <Text style={styles.unsupportedSubtext}>
                No native mobile dashboard module is configured for this specific security role. Please log in using an authorized student, parent, staff, watchman, or driver account.
              </Text>

              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={handleLogout}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionButtonText}>Sign Out & Switch Account</Text>
              </TouchableOpacity>
            </ScrollView>
          );
        })()}
      </SafeAreaView>
    );
  }

  // ── Exact Reference College ERP Login Screen ──
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.loginScrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              width: '100%',
              maxWidth: 460,
              alignSelf: 'center',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            {/* ── Top Header Brand ── */}
            <View style={styles.topBrandRow}>
              <View style={styles.brandBadge}>
                <Text style={{ fontSize: 20 }}>🎓</Text>
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.brandTitle}>College ERP</Text>
                <Text style={styles.brandSubtitle}>Connect • Manage • Grow</Text>
              </View>
            </View>

            {/* ── Hero Split Section: Welcome & Badges (Left) + Student Mascot (Right) ── */}
            <View style={styles.heroSplitSection}>
              {/* Left Column */}
              <View style={styles.heroLeftCol}>
                <Text style={styles.heroHeadline}>
                  Welcome <Text style={styles.heroHeadlineHighlight}>Back!</Text>
                </Text>
                <Text style={styles.heroSubtext}>
                  Sign in to your College ERP and stay connected with your campus life.
                </Text>

                {/* 4 Feature Badges */}
                <View style={styles.featuresRow}>
                  <View style={styles.featureItem}>
                    <View style={[styles.featureCircle, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={{ fontSize: 16 }}>🎓</Text>
                    </View>
                    <Text style={styles.featureLabel}>Academics</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureCircle, { backgroundColor: '#EDE9FE' }]}>
                      <Text style={{ fontSize: 16 }}>👥</Text>
                    </View>
                    <Text style={styles.featureLabel}>Campus Life</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureCircle, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={{ fontSize: 16 }}>💼</Text>
                    </View>
                    <Text style={styles.featureLabel}>Career</Text>
                  </View>

                  <View style={styles.featureItem}>
                    <View style={[styles.featureCircle, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={{ fontSize: 16 }}>🌐</Text>
                    </View>
                    <Text style={styles.featureLabel}>More</Text>
                  </View>
                </View>
              </View>

              {/* Right Column: 3D Student Mascot Image */}
              <View style={styles.heroRightCol}>
                <View style={styles.mascotImageWrapper}>
                  <Image
                    source={require('../../assets/images/student_hero_mascot.jpg')}
                    style={styles.mascotImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            {/* ── Main Form Card ("Login to Your Account") ── */}
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Login to Your Account</Text>
              <Text style={styles.formCardSubtitle}>Enter your credentials to continue</Text>

              {/* Error Alert Banner */}
              {errorMessage ? (
                <View style={styles.errorAlert}>
                  <Text style={styles.errorAlertIcon}>⚠️</Text>
                  <Text style={styles.errorAlertText}>{errorMessage}</Text>
                  <TouchableOpacity
                    onPress={() => setErrorMessage(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.errorDismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Input 1: Student / Staff / Parent ID */}
              <View
                style={[
                  styles.modernInputContainer,
                  emailFocused && styles.modernInputFocused,
                  !email && errorMessage && styles.modernInputError,
                ]}
              >
                <Text
                  style={styles.modernInputIcon}
                  onPress={() => emailInputRef.current?.focus()}
                >
                  👤
                </Text>
                <TextInput
                  ref={emailInputRef}
                  style={styles.modernTextInput}
                  placeholder="Student / Staff / Parent ID"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="default"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  cursorColor="#2563EB"
                  selectionColor="#BFDBFE"
                  
                />
                {email.length > 0 && !isSubmitting && (
                  <TouchableOpacity
                    onPress={() => setEmail('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.inputClearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Input 2: Password */}
              <View
                style={[
                  styles.modernInputContainer,
                  passwordFocused && styles.modernInputFocused,
                  !password && errorMessage && styles.modernInputError,
                ]}
              >
                <Text
                  style={styles.modernInputIcon}
                  onPress={() => passwordInputRef.current?.focus()}
                >
                  🔒
                </Text>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.modernTextInput}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  cursorColor="#2563EB"
                  selectionColor="#BFDBFE"
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Text style={styles.eyeToggleIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>

              {/* Utility Row: Remember Me & Forgot Password */}
              <View style={styles.utilityRow}>
                <TouchableOpacity
                  style={styles.rememberMeBtn}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotFeedback(null);
                    setShowForgotModal(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.modernSubmitBtn,
                  isSubmitting && styles.modernSubmitBtnDisabled,
                ]}
                onPress={handleLogin}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <View style={styles.submitLoadingContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.modernSubmitBtnText}>Signing In...</Text>
                  </View>
                ) : (
                  <View style={styles.submitBtnContent}>
                    <Text style={styles.modernSubmitBtnArrow}>➔</Text>
                    <Text style={styles.modernSubmitBtnText}>Login</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Divider & Security Badge */}
              <View style={styles.securityDividerRow}>
                <View style={styles.dividerLine} />
                <View style={styles.securityPill}>
                  <Text style={styles.securityPillIcon}>🛡️</Text>
                  <Text style={styles.securityPillText}>Secure & Trusted</Text>
                </View>
                <View style={styles.dividerLine} />
              </View>
            </View>

            {/* ── Slogan & Doodle Footer ── */}
            <View style={styles.brandFooter}>
              <Text style={styles.sloganText}>Better Education, Brighter Future</Text>
              <Text style={styles.subSloganText}>✈️ Arignar Anna College Campus ERP</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.forgotModalContent}>
            <View style={styles.forgotModalHeader}>
              <View style={styles.forgotModalIconCircle}>
                <Text style={{ fontSize: 22 }}>🔑</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.forgotModalTitle}>Reset Password</Text>
                <Text style={styles.forgotModalSubtitle}>
                  Enter your registered college email to receive reset instructions
                </Text>
              </View>
            </View>

            {forgotFeedback && (
              <View
                style={[
                  styles.forgotFeedbackBanner,
                  forgotFeedback.type === 'success'
                    ? styles.forgotFeedbackSuccess
                    : styles.forgotFeedbackError,
                ]}
              >
                <Text
                  style={[
                    styles.forgotFeedbackText,
                    forgotFeedback.type === 'success' ? { color: '#065F46' } : { color: '#991B1B' },
                  ]}
                >
                  {forgotFeedback.type === 'success' ? '✓ ' : '⚠️ '}
                  {forgotFeedback.message}
                </Text>
              </View>
            )}

            <View style={{ marginVertical: 14 }}>
              <Text style={[styles.formCardSubtitle, { marginBottom: 6, fontWeight: '700', color: '#1E293B' }]}>
                Registered Email
              </Text>
              <View style={styles.modernInputContainer}>
                <Text style={styles.modernInputIcon}>✉️</Text>
                <TextInput
                  style={styles.modernTextInput}
                  placeholder="e.g. user@college.edu"
                  placeholderTextColor="#94A3B8"
                  value={forgotEmail}
                  onChangeText={(val) => {
                    setForgotEmail(val);
                    setForgotFeedback(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  editable={!isSubmittingForgot}
                  cursorColor="#2563EB"
                  selectionColor="#BFDBFE"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#F1F5F9', flex: 1 }]}
                onPress={() => setShowForgotModal(false)}
                disabled={isSubmittingForgot}
              >
                <Text style={[styles.modalBtnText, { color: '#475569' }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#2563EB', flex: 2 }]}
                onPress={handleForgotPasswordSubmit}
                disabled={isSubmittingForgot}
              >
                {isSubmittingForgot ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Send Reset Link</Text>
                )}
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
    backgroundColor: '#EEF5FF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  brandIconText: {
    fontSize: 38,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },

  // ── Scroll Layout ──
  loginScrollContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 10,
    paddingBottom: 20,
    flexGrow: 1,
  },

  // ── Top Brand Row ──
  topBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },

  // ── Split Hero Section ──
  heroSplitSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  heroLeftCol: {
    flex: 1.15,
    paddingRight: 8,
  },
  heroHeadline: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  heroHeadlineHighlight: {
    color: '#2563EB',
  },
  heroSubtext: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16.5,
    marginTop: 4,
    marginBottom: 12,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  featureLabel: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  heroRightCol: {
    flex: 0.85,
    alignItems: 'flex-end',
  },
  mascotImageWrapper: {
    width: 135,
    height: 155,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#DBEAFE',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },

  // ── Main Form Card ──
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  formCardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  formCardSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
    marginBottom: 16,
  },

  // ── Error Alert ──
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorAlertIcon: {
    fontSize: 15,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12.5,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 17,
  },
  errorDismissText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '800',
    paddingHorizontal: 4,
  },

  // ── Modern Inputs ──
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  modernInputFocused: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  modernInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  modernInputIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#94A3B8',
    paddingVertical: 10,
  },
  modernTextInput: {
    flex: 1,
    height: '100%',
    minHeight: 48,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
    paddingVertical: 0,
  },
  inputClearIcon: {
    fontSize: 13,
    color: '#94A3B8',
    padding: 4,
  },
  eyeToggleBtn: {
    padding: 6,
  },
  eyeToggleIcon: {
    fontSize: 16,
  },

  // ── Utility Row ──
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 18,
  },
  rememberMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  rememberMeText: {
    fontSize: 12.5,
    color: '#475569',
    fontWeight: '500',
  },
  forgotPasswordText: {
    fontSize: 12.5,
    color: '#2563EB',
    fontWeight: '700',
  },

  // ── Submit Button ──
  modernSubmitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  modernSubmitBtnDisabled: {
    opacity: 0.65,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modernSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modernSubmitBtnArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // ── Divider & Security Badge ──
  securityDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 5,
  },
  securityPillIcon: {
    fontSize: 12,
  },
  securityPillText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Slogan & Doodle Footer ──
  brandFooter: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  sloganText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },
  subSloganText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '500',
  },

  // ── Unsupported Role Gate ──
  unsupportedRoleContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsupportedIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unsupportedIcon: {
    fontSize: 38,
  },
  unsupportedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  unsupportedText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginBottom: 10,
  },
  unsupportedBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 14,
  },
  unsupportedBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  unsupportedSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
    maxWidth: 340,
  },
  primaryActionButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1E3A8A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },

  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  forgotModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  forgotModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  forgotModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  forgotModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  forgotFeedbackBanner: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  forgotFeedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  forgotFeedbackError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  forgotFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  modalBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
