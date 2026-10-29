import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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

// ── Screen and Image Scale Calculations for Exact 1:1 Reference ──
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOGIN_REF_IMAGE = require('../../assets/images/login_reference.jpg');
const loginAsset = Image.resolveAssetSource(LOGIN_REF_IMAGE);
const IMG_RATIO =
  loginAsset && loginAsset.width && loginAsset.height
    ? loginAsset.height / loginAsset.width
    : 844 / 390;
const SCALED_IMG_HEIGHT = SCREEN_WIDTH * IMG_RATIO;
const TOP_BANNER_HEIGHT = Math.round(SCALED_IMG_HEIGHT * 0.282);
const TOP_OFFSET = Math.round(SCALED_IMG_HEIGHT * 0.042);
const BOTTOM_IMG_OFFSET =
  Platform.OS === 'android'
    ? Math.round(SCALED_IMG_HEIGHT * 0.018)
    : Math.round(SCALED_IMG_HEIGHT * 0.012);
const BOTTOM_SECTION_HEIGHT = Math.round(SCALED_IMG_HEIGHT * 0.245);

// ── Sleek Minimal Vector Outline Icons (Exact Match to Reference Mockup) ──
function OutlineMailIcon({ focused }: { focused?: boolean }) {
  const strokeColor = focused ? '#2878E5' : '#64748B';
  return (
    <View style={iconStyles.envelopeBox}>
      <View style={[iconStyles.envelopeBody, { borderColor: strokeColor }]} />
      <View style={[iconStyles.envelopeFlap, { borderColor: strokeColor }]} />
    </View>
  );
}

function OutlineLockIcon({ focused }: { focused?: boolean }) {
  const strokeColor = focused ? '#2878E5' : '#64748B';
  return (
    <View style={iconStyles.lockContainer}>
      <View style={[iconStyles.lockShackle, { borderColor: strokeColor }]} />
      <View style={[iconStyles.lockBody, { borderColor: strokeColor }]}>
        <View style={[iconStyles.lockKeyhole, { backgroundColor: strokeColor }]} />
      </View>
    </View>
  );
}

function OutlineEyeIcon({ active }: { active?: boolean }) {
  const strokeColor = '#64748B';
  return (
    <View style={iconStyles.eyeContainer}>
      <View style={[iconStyles.eyeOutline, { borderColor: strokeColor }]}>
        <View style={[iconStyles.eyePupil, { backgroundColor: strokeColor }]} />
      </View>
      {!active && <View style={[iconStyles.eyeSlash, { backgroundColor: strokeColor }]} />}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  envelopeBox: {
    width: 22,
    height: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  envelopeBody: {
    width: 20,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  envelopeFlap: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  lockContainer: {
    width: 22,
    height: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lockShackle: {
    width: 11,
    height: 8,
    borderTopLeftRadius: 5.5,
    borderTopRightRadius: 5.5,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    marginBottom: -1,
  },
  lockBody: {
    width: 18,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockKeyhole: {
    width: 2.2,
    height: 4.5,
    borderRadius: 1,
  },
  eyeContainer: {
    width: 24,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeOutline: {
    width: 20,
    height: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyePupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyeSlash: {
    position: 'absolute',
    width: 22,
    height: 1.6,
    transform: [{ rotate: '-40deg' }],
  },
});

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
        <Text style={styles.splashTitle}>Campus ERP Portal</Text>
        <Text style={styles.splashSubtitle}>Verifying secure institutional session...</Text>
        <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 28 }} />
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

  // ── Premium College ERP Mobile App Login Screen ──
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
          style={{ flex: 1 }}
          contentContainerStyle={styles.loginScrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* ── Top Branding Section (Exact 1:1 Reference Mockup Header) ── */}
          <View style={[styles.topHeaderContainer, { height: TOP_BANNER_HEIGHT }]}>
            <Image
              source={LOGIN_REF_IMAGE}
              style={{
                width: SCREEN_WIDTH,
                height: SCALED_IMG_HEIGHT,
                position: 'absolute',
                top: -TOP_OFFSET,
                left: 0,
              }}
              resizeMode="cover"
            />
          </View>

          <Animated.View style={{ opacity: fadeAnim, width: '100%', flex: 1, justifyContent: 'center' }}>
            {/* ── Login Form Section (Dominant & Centered) ── */}
            <View style={styles.formContainer}>
              <Text style={styles.formHeading}>Welcome Back!</Text>
              <Text style={styles.formSubtitle}>Sign in to your college account</Text>

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

              {/* Input 1: Email ID */}
              <View
                style={[
                  styles.roundedInputContainer,
                  emailFocused && styles.roundedInputFocused,
                  !email && errorMessage && styles.roundedInputError,
                ]}
              >
                <OutlineMailIcon focused={emailFocused} />
                <TextInput
                  ref={emailInputRef}
                  style={styles.roundedTextInput}
                  placeholder="Email ID"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  blurOnSubmit={false}
                  cursorColor="#123B70"
                  selectionColor="#D0E4FF"
                />
                {email.length > 0 && !isSubmitting && (
                  <TouchableOpacity
                    onPress={() => setEmail('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.clearIconText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Input 2: Password */}
              <View
                style={[
                  styles.roundedInputContainer,
                  { marginTop: 16 },
                  passwordFocused && styles.roundedInputFocused,
                  !password && errorMessage && styles.roundedInputError,
                ]}
              >
                <OutlineLockIcon focused={passwordFocused} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.roundedTextInput}
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
                  cursorColor="#123B70"
                  selectionColor="#D0E4FF"
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <OutlineEyeIcon active={showPassword} />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Right-Aligned Link */}
              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotFeedback(null);
                    setShowForgotModal(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.forgotPasswordLinkText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Royal Blue Full-Width Login Button */}
              <TouchableOpacity
                style={[
                  styles.primaryLoginBtn,
                  isSubmitting && styles.primaryLoginBtnDisabled,
                ]}
                onPress={handleLogin}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <View style={styles.loginLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryLoginBtnText}>Signing in...</Text>
                  </View>
                ) : (
                  <View style={styles.loginBtnContentRow}>
                    <Text style={styles.primaryLoginBtnText}>Login</Text>
                    <Text style={styles.loginBtnArrowIcon}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Bottom Educational Illustration (Exact 1:1 Reference Mockup Bottom) ── */}
          <View style={[styles.bottomIllustrationContainer, { height: BOTTOM_SECTION_HEIGHT }]}>
            <Image
              source={LOGIN_REF_IMAGE}
              style={{
                width: SCREEN_WIDTH,
                height: SCALED_IMG_HEIGHT,
                position: 'absolute',
                bottom: BOTTOM_IMG_OFFSET,
                left: 0,
              }}
              resizeMode="cover"
            />
          </View>
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
              <Text style={styles.modalInputLabel}>
                Registered Email
              </Text>
              <View style={styles.modalInputContainer}>
                <Text style={styles.modalInputIcon}>✉️</Text>
                <TextInput
                  style={styles.modalTextInput}
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
                  cursorColor="#111827"
                  selectionColor="#E5E7EB"
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#F3F4F6', flex: 1, borderWidth: 1, borderColor: '#E5E7EB' }]}
                onPress={() => setShowForgotModal(false)}
                disabled={isSubmittingForgot}
              >
                <Text style={[styles.modalBtnText, { color: '#374151' }]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#111827', flex: 2 }]}
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
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  brandIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  brandIconText: {
    fontSize: 36,
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  splashSubtitle: {
    fontSize: 13,
    color: '#0284C7',
  },

  // ── Scroll Layout ──
  loginScrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  // ── Top Header Container (Exact Crop of Reference Mockup) ──
  topHeaderContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#F0F7FF',
    position: 'relative',
  },

  // ── Form Container (Compact & Professional Mobile Layout) ──
  formContainer: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  formHeading: {
    fontSize: 23,
    fontWeight: '800',
    color: '#123B70',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginBottom: 20,
    fontWeight: '400',
  },

  // ── Error Alert ──
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    gap: 8,
  },
  errorAlertIcon: {
    fontSize: 14,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    lineHeight: 16,
  },
  errorDismissText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '700',
    paddingHorizontal: 4,
  },

  // ── Rounded Input Fields (Standard 48px) ──
  roundedInputContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#2878E5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  roundedInputFocused: {
    borderColor: '#2878E5',
    borderWidth: 1.5,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  roundedInputError: {
    borderColor: '#DC2626',
  },
  inputPrefixIcon: {
    fontSize: 15,
    color: '#64748B',
    marginRight: 10,
  },
  inputPrefixIconActive: {
    color: '#2878E5',
  },
  roundedTextInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#123B70',
    fontWeight: '500',
    height: '100%',
  },
  clearIconText: {
    fontSize: 13,
    color: '#94A3B8',
    padding: 6,
  },
  eyeToggleBtn: {
    padding: 6,
  },
  eyeToggleIcon: {
    fontSize: 16,
    color: '#64748B',
  },

  // ── Forgot Password ──
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  forgotPasswordLinkText: {
    fontSize: 13.5,
    color: '#2878E5',
    fontWeight: '600',
  },

  // ── Royal Blue Button (Standard 48px) ──
  primaryLoginBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2878E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2878E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryLoginBtnDisabled: {
    opacity: 0.65,
  },
  primaryLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  loginBtnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginBtnArrowIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  // ── Bottom Educational Illustration Container ──
  bottomIllustrationContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#EBF5FF',
    position: 'relative',
  },

  // ── Unsupported Role Gate ──
  unsupportedRoleContainer: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unsupportedIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unsupportedIcon: {
    fontSize: 32,
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  unsupportedText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 10,
  },
  unsupportedBadge: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 14,
  },
  unsupportedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  unsupportedSubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 320,
  },
  primaryActionButton: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#111827',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  forgotModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  forgotModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  forgotModalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  forgotModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 2,
  },
  forgotFeedbackBanner: {
    padding: 10,
    borderRadius: 6,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalInputIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  modalTextInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },
});
