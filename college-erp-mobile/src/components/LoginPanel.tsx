import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, loginUser, logoutUser, type MobileUser } from '../services/api';

type Props = {
  role: string;
  roleId: string;
  roleColor?: string;
  onBack: () => void;
};

type Tile = { title: string; value: string; description: string };

const DEMO_CREDENTIALS: Record<string, { email: string; pass: string; label: string }> = {
  'super-admin': { email: 'superadmin@erpsaas.com', pass: 'superadmin123', label: 'Super Admin' },
  'admin': { email: 'admin@college.edu', pass: 'password123', label: 'System Admin' },
  'principal': { email: 'principal@college.edu', pass: 'password123', label: 'Principal' },
  'hod': { email: 'csehod@gmail.com', pass: 'password123', label: 'CSE HOD' },
  'staff': { email: 'pooja@gmail.com', pass: 'pooja', label: 'Prof. Pooja' },
  'student': { email: 'john@college.edu', pass: 'password123', label: 'John Doe (CS)' },
  'parent': { email: 'parent_john@college.edu', pass: 'password123', label: 'Parent of John' },
  'driver': { email: 'admin@college.edu', pass: 'password123', label: 'Transport Admin' },
  'library': { email: 'meena@gmail.com', pass: 'meena', label: 'Meena (Librarian)' },
  'accounts': { email: 'accounts@college.edu', pass: 'password123', label: 'Accounts Officer' },
  'hostel': { email: 'admin@college.edu', pass: 'password123', label: 'Hostel Incharge' },
};

function records(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && 'data' in value) {
    const data = (value as { data: unknown }).data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && 'data' in data) {
      const nested = (data as { data: unknown }).data;
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

function MobileDashboard({ user, onLogout }: { user: MobileUser; onLogout: () => void }) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      const studentId = user.studentId || user.referenceId || user.userId || user._id;
      const isStudent = (user.role || '').toLowerCase().includes('student');

      const requests: { title: string; description: string; path: string }[] = isStudent
        ? [
            { title: 'Attendance', description: 'Academic attendance', path: `/attendance/student/${encodeURIComponent(studentId)}` },
            { title: 'Marks', description: 'Transcript records', path: `/marks/student/${encodeURIComponent(studentId)}` },
            { title: 'Fees', description: 'Fee invoices & dues', path: `/fees/student/${encodeURIComponent(studentId)}` },
            { title: 'Library', description: 'Issued book records', path: '/library/my-transactions' },
            { title: 'Assignments', description: 'Course assignments', path: '/assignments' },
            { title: 'Placements', description: 'Active job openings', path: '/placement/jobs' },
          ]
        : [
            { title: 'Students', description: 'Registered students', path: '/students' },
            { title: 'Faculty & Staff', description: 'Teaching staff', path: '/staff' },
            { title: 'Departments', description: 'Active departments', path: '/departments' },
            { title: 'Notifications', description: 'System alerts', path: '/notifications' },
          ];

      const results = await Promise.all(
        requests.map(async (item) => {
          if (!item.path) return { ...item, value: 'Active' };
          try {
            const response = await apiGet<unknown>(item.path);
            const list = records(response);
            return { ...item, value: `${list.length}` };
          } catch {
            return { ...item, value: 'Active' };
          }
        }),
      );

      if (active) {
        setTiles(
          results.map((item) => ({
            title: item.title,
            value: item.value,
            description: item.description,
          })),
        );
        setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [user]);

  async function handleLogout() {
    await logoutUser();
    onLogout();
    Alert.alert('Signed out', 'Session cleared successfully.');
  }

  return (
    <View style={styles.card}>
      <View style={styles.dashboardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.name || 'U').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeRole}>{user.role.toUpperCase()} PORTAL</Text>
          <Text style={styles.welcomeName}>{user.name}</Text>
          <Text style={styles.welcomeSub}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.collegeBadge}>
        <Text style={styles.collegeBadgeText}>
          🏛️ {user.collegeName || 'Marudhar Kesari Jain College for Women'}
        </Text>
      </View>

      <Text style={styles.sectionHeader}>Overview & Metrics</Text>
      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ margin: 25 }} />
      ) : (
        <View style={styles.tilesGrid}>
          {tiles.map((tile) => (
            <View key={tile.title} style={styles.metricTile}>
              <Text style={styles.metricTitle}>{tile.title}</Text>
              <Text style={styles.metricValue}>{tile.value}</Text>
              <Text style={styles.metricDesc}>{tile.description}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out of Mobile Session</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LoginPanel({ role, roleId, roleColor = '#2563EB', onBack }: Props) {
  const demo = DEMO_CREDENTIALS[roleId] || DEMO_CREDENTIALS['student'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<MobileUser | null>(null);

  function handleAutoFillDemo() {
    setEmail(demo.email);
    setPassword(demo.pass);
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing Details', 'Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      const loggedInUser = await loginUser(email.trim(), password);
      setUser(loggedInUser);
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error
          ? error.message
          : 'Unable to connect to ERP server. Make sure the backend server is running.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return <MobileDashboard user={user} onLogout={() => setUser(null)} />;
  }

  return (
    <View style={[styles.card, { borderColor: roleColor + '40' }]}>
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Text style={[styles.backText, { color: roleColor }]}>‹ Back to All Portals</Text>
      </TouchableOpacity>

      <View style={styles.loginHeader}>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>
            {role.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.loginTitle}>{role} Sign In</Text>
        <Text style={styles.loginSub}>
          Access your {role.toLowerCase()} dashboard with your college credentials.
        </Text>
      </View>

      {/* Quick Demo Pre-fill Button */}
      <TouchableOpacity
        style={[styles.demoFillBtn, { borderColor: roleColor }]}
        onPress={handleAutoFillDemo}
      >
        <Text style={[styles.demoFillBtnText, { color: roleColor }]}>
          ⚡ Auto-Fill Demo: {demo.label}
        </Text>
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Email Address</Text>
      <TextInput
        style={styles.inputField}
        placeholder={demo.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        style={styles.inputField}
        placeholder="••••••••"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      <TouchableOpacity
        style={[styles.loginSubmitBtn, { backgroundColor: roleColor }]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.loginSubmitText}>Sign In to {role} Portal →</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.securityFooter}>
        🔒 Encrypted & Multi-Tenant Verified Campus Authentication
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  backRow: {
    paddingVertical: 6,
    marginBottom: 10,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  loginHeader: {
    marginBottom: 16,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  loginSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
  demoFillBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  demoFillBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  inputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 8,
  },
  loginSubmitBtn: {
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loginSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  securityFooter: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 16,
  },
  // Dashboard Styles
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  welcomeRole: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  welcomeSub: {
    fontSize: 12,
    color: '#64748B',
  },
  collegeBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  collegeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricTile: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 4,
  },
  metricDesc: {
    fontSize: 10,
    color: '#94A3B8',
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
