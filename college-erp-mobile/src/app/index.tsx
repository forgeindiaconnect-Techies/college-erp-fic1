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
const SUPERADMIN_BG_IMAGE = require('../../assets/images/superadmin_bg_reference.jpg');

// Crop the top 54px of the reference mockup so the fake status bar (9:41, wifi, battery) is 100% removed
const STATUS_BAR_CROP = Math.round(SCREEN_WIDTH * (54 / 501));
// Height of the hero banner after cropping top status bar, showing full "Super Admin Panel" badge + organic wave
const HERO_BANNER_HEIGHT = Math.round(SCREEN_WIDTH * ((455 - 54) / 501));

// ── Sleek Minimal Vector Outline Icons (Exact Match to Reference Mockup) ──
function OutlineUserIcon({ focused }: { focused?: boolean }) {
  const strokeColor = focused ? '#1D4ED8' : '#2563EB';
  return (
    <View style={{ width: 22, height: 22, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 8.5, height: 8.5, borderRadius: 4.25, borderWidth: 1.6, borderColor: strokeColor, marginBottom: 1.5 }} />
      <View style={{ width: 16, height: 7, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.6, borderBottomWidth: 0, borderColor: strokeColor }} />
    </View>
  );
}

function OutlineLockIcon({ focused }: { focused?: boolean }) {
  const strokeColor = focused ? '#1D4ED8' : '#2563EB';
  return (
    <View style={{ width: 22, height: 22, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 9, height: 7, borderTopLeftRadius: 4.5, borderTopRightRadius: 4.5, borderWidth: 1.6, borderBottomWidth: 0, borderColor: strokeColor, marginBottom: -1 }} />
      <View style={{ width: 15, height: 11, borderRadius: 2.5, borderWidth: 1.6, borderColor: strokeColor, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <View style={{ width: 2, height: 3.5, backgroundColor: strokeColor, borderRadius: 1 }} />
      </View>
    </View>
  );
}

function OutlineEyeIcon({ active }: { active?: boolean }) {
  const strokeColor = '#94A3B8';
  return (
    <View style={{ width: 24, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 18, height: 12, borderRadius: 9, borderWidth: 1.6, borderColor: strokeColor, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: strokeColor }} />
      </View>
      {!active && <View style={{ position: 'absolute', width: 20, height: 1.6, backgroundColor: strokeColor, transform: [{ rotate: '-45deg' }] }} />}
    </View>
  );
}

function CircleArrowIcon() {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
      <Text style={{ color: '#1E5BF8', fontSize: 13, fontWeight: '900', marginTop: -1 }}>→</Text>
    </View>
  );
}

function WatermarkCrownShield() {
  return (
    <View style={styles.watermarkCrownShieldBox}>
      {/* 5 Tip Dots */}
      <View style={{ width: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <View style={{ width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: '#FFFFFF', marginTop: 4 }} />
        <View style={{ width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: '#FFFFFF', marginTop: 1 }} />
        <View style={{ width: 5.5, height: 5.5, borderRadius: 2.75, backgroundColor: '#FFFFFF', marginTop: -3 }} />
        <View style={{ width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: '#FFFFFF', marginTop: 1 }} />
        <View style={{ width: 4.5, height: 4.5, borderRadius: 2.25, backgroundColor: '#FFFFFF', marginTop: 4 }} />
      </View>
      {/* 5 Spikes */}
      <View style={{ width: 32, height: 13, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ width: 4, height: 8, backgroundColor: '#FFFFFF', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
        <View style={{ width: 4.5, height: 11, backgroundColor: '#FFFFFF', borderTopLeftRadius: 2.25, borderTopRightRadius: 2.25 }} />
        <View style={{ width: 5.5, height: 14, backgroundColor: '#FFFFFF', borderTopLeftRadius: 2.75, borderTopRightRadius: 2.75 }} />
        <View style={{ width: 4.5, height: 11, backgroundColor: '#FFFFFF', borderTopLeftRadius: 2.25, borderTopRightRadius: 2.25 }} />
        <View style={{ width: 4, height: 8, backgroundColor: '#FFFFFF', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      </View>
      {/* Crown base horizontal bar */}
      <View style={{ width: 34, height: 3.5, backgroundColor: '#FFFFFF', borderRadius: 2, marginTop: 2 }} />
    </View>
  );
}

function SleekShieldIcon() {
  return (
    <View style={styles.shieldPill}>
      <View style={styles.shieldVectorShape}>
        <Text style={styles.shieldCheckText}>✓</Text>
      </View>
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
      const user = await loginUser(trimmedEmail.toLowerCase(), trimmedPassword);

      // 2. Validate role returned by the trusted authenticated response
      if (!user.role) {
        throw new Error('Authenticated account does not have a designated campus role. Please contact administration.');
      }
      const MOBILE_ALLOWED_ROLES = ['Staff', 'Student', 'Driver', 'Watchman', 'Parent', 'Super Admin', 'Admin'];
      if (!MOBILE_ALLOWED_ROLES.map(r => r.toLowerCase()).includes(user.role.toLowerCase())) {
        await logoutUser();
        throw new Error(`Access Denied: The Mobile Application is strictly restricted to Staff, Student, Driver, Watchman, Parent, and Super Admin accounts. Your role (${user.role}) is not authorized on mobile. Please log in via the Web Portal.`);
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
      const msg = await requestPasswordReset(forgotEmail.trim().toLowerCase());
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

          // 5. Staff Dashboard (STRICTLY for Staff only)
          if (rawRole === 'staff') {
            return <StaffDashboard user={currentUser} onLogout={handleLogout} />;
          }

          // 6. Super Admin / Admin Console View
          if (rawRole === 'super admin' || rawRole === 'admin') {
            return (
              <ScrollView contentContainerStyle={styles.superAdminConsoleContainer}>
                <View style={styles.superAdminConsoleHeader}>
                  <View style={styles.superAdminCrownBox}>
                    <Text style={{ fontSize: 28 }}>👑</Text>
                  </View>
                  <Text style={styles.superAdminConsoleTitle}>Super Admin Console</Text>
                  <Text style={styles.superAdminConsoleSub}>
                    Enterprise Multi-Tenant Root • {currentUser.name || 'Administrator'}
                  </Text>
                </View>

                <View style={styles.superAdminKpiGrid}>
                  <View style={styles.superAdminKpiCard}>
                    <Text style={styles.superAdminKpiLabel}>Session Security</Text>
                    <Text style={[styles.superAdminKpiVal, { color: '#059669' }]}>Root Active</Text>
                    <Text style={styles.superAdminKpiHint}>256-Bit TLS End-to-End Encrypted</Text>
                  </View>

                  <View style={styles.superAdminKpiCard}>
                    <Text style={styles.superAdminKpiLabel}>Mobile Ecosystem</Text>
                    <Text style={[styles.superAdminKpiVal, { color: '#2563EB' }]}>5 Roles Live</Text>
                    <Text style={styles.superAdminKpiHint}>Staff, Student, Driver, Watchman, Parent</Text>
                  </View>
                </View>

                <View style={styles.superAdminInfoBox}>
                  <Text style={styles.superAdminInfoTitle}>🛡️ Enterprise Management Console</Text>
                  <Text style={styles.superAdminInfoText}>
                    Full college ERP institution provisioning, database migration, fee billing configurations, and academic syllabus setups can also be accessed via the Enterprise Web Portal.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={handleLogout}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryActionButtonText}>Sign Out Super Admin Session</Text>
                </TouchableOpacity>
              </ScrollView>
            );
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
                The College ERP Mobile Application is accessible strictly to Staff, Student, Driver, Watchman, and Parent accounts. Accounts belonging to Admin, Super Admin, Principal, Accounts Officer, HOD, Librarian, Placement Officer, or any other role must use the Web Portal.
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

  // ── Premium College ERP Super Admin Mobile App Login Screen ──
  return (
    <SafeAreaView style={styles.superAdminSafeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.superAdminScrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          {/* ── Top Hero Banner (Campus Architecture, Crest, and Super Admin Badge) ── */}
          <View style={[styles.superAdminHeroBanner, { height: HERO_BANNER_HEIGHT }]}>
            <Image
              source={SUPERADMIN_BG_IMAGE}
              style={{
                width: SCREEN_WIDTH,
                height: Math.round(SCREEN_WIDTH * (728 / 501)),
                position: 'absolute',
                top: -STATUS_BAR_CROP,
                left: 0,
              }}
              resizeMode="cover"
            />
          </View>

          {/* ── Floating White Login Card (All 4 Corners Rounded, Exact Image 1) ── */}
          <View style={styles.superAdminCardContainer}>
            {/* Soft Light-Blue Watermark Shield with 5-Point Crown (Top-Right) */}
            <WatermarkCrownShield />

            {/* Welcome Heading */}
            <View style={styles.welcomeBox}>
              <Text style={styles.welcomeHeading}>Welcome Back!</Text>
              <Text style={styles.welcomeSubheading}>
                Sign in to access the Super Admin Dashboard
              </Text>
            </View>

            {/* Error Alert Banner */}
            {errorMessage ? (
              <View style={styles.superAdminErrorAlert}>
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

            {/* ── Form Fields ── */}
            <View style={styles.superAdminFormFields}>
              {/* Field 1: Admin Email ID */}
              <View
                style={[
                  styles.superAdminInputWrapper,
                  emailFocused && styles.superAdminInputFocused,
                  !email && errorMessage ? styles.superAdminInputError : null,
                ]}
              >
                <OutlineUserIcon focused={emailFocused} />
                <TextInput
                  ref={emailInputRef}
                  style={styles.superAdminTextInput}
                  placeholder="Admin Email ID"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val.toLowerCase());
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
                  cursorColor="#1D4ED8"
                  selectionColor="#DBEAFE"
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

              {/* Field 2: Password */}
              <View
                style={[
                  styles.superAdminInputWrapper,
                  passwordFocused && styles.superAdminInputFocused,
                  !password && errorMessage ? styles.superAdminInputError : null,
                ]}
              >
                <OutlineLockIcon focused={passwordFocused} />
                <TextInput
                  ref={passwordInputRef}
                  style={[styles.superAdminTextInput, { paddingRight: 38 }]}
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
                  cursorColor="#1D4ED8"
                  selectionColor="#DBEAFE"
                />
                <TouchableOpacity
                  style={styles.superAdminEyeBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <OutlineEyeIcon active={showPassword} />
                </TouchableOpacity>
              </View>

              {/* Options Row: Remember Me & Forgot Password? */}
              <View style={styles.superAdminOptionsRow}>
                <TouchableOpacity
                  style={styles.superAdminCheckboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.superAdminCheckbox, rememberMe && styles.superAdminCheckboxActive]}>
                    {rememberMe && <Text style={styles.superAdminCheckmark}>✓</Text>}
                  </View>
                  <Text style={styles.superAdminRememberLabel}>Remember Me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setForgotEmail(email);
                    setForgotFeedback(null);
                    setShowForgotModal(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.superAdminForgotLink}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button with Circle Arrow */}
              <TouchableOpacity
                style={[
                  styles.superAdminSignInBtn,
                  isSubmitting && styles.superAdminSignInBtnDisabled,
                ]}
                onPress={handleLogin}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                {isSubmitting ? (
                  <View style={styles.superAdminBtnContentRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.superAdminSignInBtnText}>Signing in...</Text>
                  </View>
                ) : (
                  <View style={styles.superAdminBtnContentRow}>
                    <CircleArrowIcon />
                    <Text style={styles.superAdminSignInBtnText}>Sign In</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Secure Access Section ── */}
            <View style={styles.secureAccessContainer}>
              <View style={styles.secureAccessDividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Secure Access</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.secureAccessCard}>
                <SleekShieldIcon />
                <View style={{ flex: 1 }}>
                  <Text style={styles.secureCardTitle}>College ERP Platform</Text>
                  <Text style={styles.secureCardSubtitle}>Trusted • Secure • Scalable</Text>
                </View>
                <View style={styles.skylineGraphic}>
                  <View style={[styles.skylineBar, { height: 8 }]} />
                  <View style={[styles.skylineBar, { height: 15 }]} />
                  <View style={[styles.skylineBar, { height: 22, backgroundColor: '#60A5FA' }]} />
                  <View style={[styles.skylineBar, { height: 12 }]} />
                  <View style={[styles.skylineBar, { height: 18 }]} />
                  <View style={[styles.skylineBar, { height: 26, width: 3, backgroundColor: '#3B82F6' }]} />
                  <View style={[styles.skylineBar, { height: 14 }]} />
                </View>
              </View>
            </View>
          </View>

          {/* ── Bottom Layered Waves & Copyright (Outside Card, Exact Image 1) ── */}
          <View style={styles.bottomWavesSection}>
            <View style={styles.cyanWaveLeft} />
            <View style={styles.cyanWaveRight} />
            <View style={styles.waveLayerDeepBlue}>
              <Text style={styles.copyrightText}>
                © 2026 College ERP. All rights reserved.
              </Text>
            </View>
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
                    setForgotEmail(val.toLowerCase());
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

  /* ── Super Admin Login Screen Styles (Exact Match to Image 2) ── */
  superAdminSafeArea: {
    flex: 1,
    backgroundColor: '#072B6B',
  },
  superAdminScrollContainer: {
    flexGrow: 1,
    backgroundColor: '#072B6B',
  },
  superAdminHeroBanner: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#072B6B',
    position: 'relative',
  },

  /* Full Width White Card (Seamless Edge-to-Edge with Organic Curve, Exact Match to Image 1) */
  superAdminCardContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    marginTop: -8,
    shadowColor: '#072B6B',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  watermarkCrownShieldBox: {
    position: 'absolute',
    top: 14,
    right: 20,
    width: 68,
    height: 76,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    backgroundColor: '#E0EDFD',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.95,
    paddingTop: 4,
  },

  welcomeBox: {
    marginBottom: 18,
    paddingRight: 72,
  },
  welcomeHeading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F265C',
    letterSpacing: -0.4,
  },
  welcomeSubheading: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#5B6F88',
    marginTop: 4,
    lineHeight: 17,
  },
  superAdminErrorAlert: {
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

  /* Form Fields */
  superAdminFormFields: {
    gap: 14,
  },
  superAdminInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  superAdminInputFocused: {
    borderColor: '#2563EB',
    borderWidth: 1.6,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  superAdminInputError: {
    borderColor: '#DC2626',
  },
  superAdminTextInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#0F172A',
  },
  superAdminEyeBtn: {
    padding: 6,
  },
  superAdminOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  superAdminCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  superAdminCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.6,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  superAdminCheckboxActive: {
    backgroundColor: '#1E5BF8',
    borderColor: '#1E5BF8',
  },
  superAdminCheckmark: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 12,
  },
  superAdminRememberLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  superAdminForgotLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E5BF8',
  },

  /* Button */
  superAdminSignInBtn: {
    backgroundColor: '#1E5BF8',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E5BF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 6,
  },
  superAdminSignInBtnDisabled: {
    opacity: 0.7,
  },
  superAdminBtnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superAdminSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  /* Secure Access Section */
  secureAccessContainer: {
    marginTop: 18,
    marginBottom: 14,
  },
  secureAccessDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 10,
  },
  secureAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  shieldPill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldVectorShape: {
    width: 16,
    height: 18,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCheckText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    marginTop: -1,
  },
  secureCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F265C',
  },
  secureCardSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 1,
  },
  skylineGraphic: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    opacity: 0.35,
  },
  skylineBar: {
    width: 4,
    backgroundColor: '#93C5FD',
    borderRadius: 1,
  },

  /* Bottom Waves Section (Outside Card on Deep Blue Screen Background, Exact Image 1) */
  bottomWavesSection: {
    width: '100%',
    position: 'relative',
    marginTop: 14,
    overflow: 'hidden',
  },
  cyanWaveLeft: {
    position: 'absolute',
    top: -4,
    left: -20,
    width: 140,
    height: 40,
    backgroundColor: '#38BDF8',
    opacity: 0.88,
    borderTopRightRadius: 44,
    borderBottomRightRadius: 28,
    transform: [{ rotate: '-6deg' }],
  },
  cyanWaveRight: {
    position: 'absolute',
    top: -2,
    right: -20,
    width: 130,
    height: 38,
    backgroundColor: '#0284C7',
    opacity: 0.8,
    borderTopLeftRadius: 44,
    borderBottomLeftRadius: 28,
    transform: [{ rotate: '6deg' }],
  },
  waveLayerDeepBlue: {
    backgroundColor: '#072B6B',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyrightText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#BAE6FD',
    letterSpacing: 0.4,
  },

  /* Super Admin Console Dashboard View */
  superAdminConsoleContainer: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  superAdminConsoleHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  superAdminCrownBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  superAdminConsoleTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  superAdminConsoleSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  superAdminKpiGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  superAdminKpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  superAdminKpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  superAdminKpiVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginVertical: 4,
  },
  superAdminKpiHint: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  superAdminInfoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  superAdminInfoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 4,
  },
  superAdminInfoText: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 16,
  },
});
