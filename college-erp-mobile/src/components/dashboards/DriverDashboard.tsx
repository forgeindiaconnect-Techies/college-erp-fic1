import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, apiPost, apiPut, type MobileUser } from '../../services/api';
import BottomTabBar, { type MainNavTab } from '../navigation/BottomTabBar';
import ScreenHeader from '../navigation/ScreenHeader';
import UserProfileScreen from '../profile/UserProfileScreen';
import ReferralHub from '../referrals/ReferralHub';
import DashboardHeroBanner from './DashboardHeroBanner';
import QuickAccessGrid from './QuickAccessGrid';
import HighlightCard from './HighlightCard';
import DailyDutyAttendanceCard from '../common/DailyDutyAttendanceCard';

type Props = {
  user: MobileUser;
  onLogout: () => void;
};

type TransportSubTab = 'operations' | 'route' | 'students' | 'vehicle';
type MoreSection = 'menu' | 'checklist' | 'payroll' | 'safety' | 'notices' | 'profile';

type Stop = {
  id: string;
  name: string;
  time: string;
  studentsCount: number;
  completed: boolean;
};

type StudentPassenger = {
  id: string;
  name: string;
  rollNo: string;
  stop: string;
  parentPhone: string;
  boarded: boolean;
  busNumber?: string;
  routeId?: string;
};

type VehicleData = {
  _id?: string;
  vehicleNumber: string;
  registrationNumber?: string;
  type?: string;
  capacity: number;
  driver?: string;
  status?: string;
  insuranceExpiry?: string;
  fitnessExpiry?: string;
  fuelType?: string;
  odometer?: string;
};

type MaintenanceItem = {
  _id?: string;
  vehicleNumber?: string;
  vehicleId?: string;
  type?: string;
  description?: string;
  cost?: number;
  date?: string;
  status?: string;
};

type SalaryRecord = {
  _id?: string;
  month?: string;
  year?: number;
  basicSalary?: number;
  allowances?: number;
  deductions?: number;
  netSalary?: number;
  status?: string;
  paymentDate?: string;
};

type DriverAttendanceRecord = {
  _id?: string;
  date: string;
  status: string;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
};

type TransportTrip = {
  _id?: string;
  tripId?: string;
  routeId?: string;
  vehicle?: string;
  driver?: string;
  driverId?: string;
  tripType?: 'Morning' | 'Evening';
  startTime?: string;
  endTime?: string;
  status?: 'In Progress' | 'Completed' | 'Scheduled' | string;
  startOdometer?: number;
  endOdometer?: number;
};

export default function DriverDashboard({ user, onLogout }: Props) {
  // Navigation Tabs
  const [activeNavTab, setActiveNavTab] = useState<MainNavTab>('home');
  const [transportSubTab, setTransportSubTab] = useState<TransportSubTab>('operations');
  const [moreSection, setMoreSection] = useState<MoreSection>('profile');

  // Loading & Refreshing
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Driver state
  const [driverProfile, setDriverProfile] = useState({
    name: user.name || 'Institutional Driver',
    driverId: user.referenceId || user.userId || 'DRV-001',
    phone: (user as any).phone || '+91 98402 00000',
    busNo: 'Campus Transit Bus',
    busNumber: 'Campus Transit Bus',
    route: 'Campus Route',
    routeId: 'R-01',
    capacity: 48,
    licenseNo: 'DL-TN-2022-008492',
  });

  const [routes, setRoutes] = useState<any[]>([]);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [passengers, setPassengers] = useState<StudentPassenger[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [myVehicle, setMyVehicle] = useState<VehicleData | null>(null);
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<DriverAttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState<TransportTrip | null>(null);
  const [tripTypeSelection, setTripTypeSelection] = useState<'Morning' | 'Evening'>('Morning');
  const [showTripStartModal, setShowTripStartModal] = useState(false);
  const [showTripEndModal, setShowTripEndModal] = useState(false);
  const [tripRemarks, setTripRemarks] = useState('');
  const [tripSubmitting, setTripSubmitting] = useState(false);

  // Student filter and search
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStopFilter, setSelectedStopFilter] = useState<string>('All');

  // Daily Inspection Checklist
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    brakes: false,
    tires: false,
    fluids: false,
    extinguisher: false,
    firstAid: false,
    emergencyExit: false,
    mirrors: false,
  });

  // Maintenance modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintType, setMaintType] = useState('Routine Service');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintSubmitting, setMaintSubmitting] = useState(false);

  // Real-time ERP Detail Modals
  const [selectedPassengerProfile, setSelectedPassengerProfile] = useState<StudentPassenger | null>(null);
  const [inspectionReportModalVisible, setInspectionReportModalVisible] = useState(false);
  const [selectedSalarySlip, setSelectedSalarySlip] = useState<SalaryRecord | null>(null);

  // Fetch all transport data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        routesRes,
        studentsRes,
        vehiclesRes,
        notifsRes,
        maintRes,
        attRes,
        tripsRes,
        salRes,
      ] = await Promise.all([
        apiGet<any[]>('transport/routes').catch(() => []),
        apiGet<any[]>('transport/students').catch(async () => {
          return apiGet<any[]>('students').catch(() => []);
        }),
        apiGet<any[]>('transport/vehicles').catch(() => []),
        apiGet<any>('transport/notifications').catch(async () => {
          return apiGet<any>('notifications').catch(() => []);
        }),
        apiGet<any[]>('transport/maintenance').catch(() => []),
        apiGet<any[]>(`transport/attendance?driverId=${user.userId || user.referenceId || ''}`).catch(() => []),
        apiGet<any[]>('transport/trips').catch(() => []),
        apiGet<any[]>(`salary/staff/${user.userId || user.referenceId || user._id || ''}`).catch(async () => {
          return apiGet<any[]>(`salaries/staff/${user.userId || user.referenceId || user._id || ''}`).catch(() => []);
        }),
      ]);

      const DEFAULT_ROUTES = [
        {
          _id: 'route_east_01',
          routeId: 'R-01',
          name: 'East',
          vehicle: 'TN 01 AB 1234',
          driver: 'Viji',
          capacity: 50,
          occupied: 0,
          points: ['Stop A', 'Stop B', 'Stop C', 'Stop D', 'College Campus'],
        },
      ];

      const rawRoutes = Array.isArray(routesRes) && routesRes.length > 0 ? routesRes : DEFAULT_ROUTES;
      const allRoutes = Array.from(new Map([...rawRoutes, ...DEFAULT_ROUTES].map((r: any) => [r.routeId || r._id || r.name, r])).values());
      setRoutes(allRoutes);

      // Match Driver's assigned route
      const cleanStr = (str: any) => (str || '').toString().trim().toLowerCase();
      const meName = cleanStr(user.name);
      const meId = cleanStr(user.referenceId || user.userId || (user as any).driverId);

      const matchedRoute =
        allRoutes.find(
          (r: any) =>
            (meName && (cleanStr(r.driver).includes(meName) || meName.includes(cleanStr(r.driver)))) ||
            (meId && (cleanStr(r.driverId) === meId || cleanStr(r.driver).includes(meId)))
        ) || allRoutes[0];

      setActiveRoute(matchedRoute || null);

      if (matchedRoute) {
        const rawPoints = Array.isArray(matchedRoute.points) ? matchedRoute.points : [];
        const parsedStops: Stop[] = rawPoints.map((pt: any, idx: number) => {
          const stopName = typeof pt === 'string' ? pt : pt.name || `Stop ${idx + 1}`;
          const stopTime =
            typeof pt === 'string'
              ? `${7 + Math.floor((idx * 15) / 60)}:${String((idx * 15) % 60).padStart(2, '0')} AM`
              : pt.time || '07:30 AM';
          return {
            id: String(idx + 1),
            name: `${idx + 1}. ${stopName}`,
            time: stopTime,
            studentsCount: 0,
            completed: false,
          };
        });

        // Parse student passengers
        const rawStudents = Array.isArray(studentsRes) ? studentsRes : [];
        let routeStudents = rawStudents.filter((s: any) => {
          const sRoute = s.routeId || s.busRoute || '';
          const sBus = s.vehicleNumber || s.busNumber || '';
          return (
            sRoute === matchedRoute.routeId ||
            sRoute === matchedRoute.name ||
            sBus === matchedRoute.vehicle ||
            (s.pickupPoint && rawPoints.some((p: any) => (typeof p === 'string' ? p : p.name) === s.pickupPoint))
          );
        });

        if (routeStudents.length === 0 && rawStudents.length > 0) {
          routeStudents = rawStudents.slice(0, 15);
        }

        const parsedPassengers: StudentPassenger[] = routeStudents.map((s: any, idx: number) => ({
          id: s._id || s.id || String(idx),
          name: s.name || s.studentName || 'Student Passenger',
          rollNo: s.studentId || s.rollNo || s.admissionNo || `STU-${idx + 1}`,
          stop: s.pickupPoint || (parsedStops[0]?.name.replace(/^\d+\.\s*/, '')) || 'Campus Gate',
          parentPhone: s.parentPhone || s.emergencyContact || s.driverContact || s.phone || '+91 98402 00000',
          boarded: false,
          busNumber: s.vehicleNumber || matchedRoute.vehicle,
          routeId: matchedRoute.routeId,
        }));

        // Compute passenger count per stop
        parsedPassengers.forEach((p) => {
          const match = parsedStops.find((st) => st.name.toLowerCase().includes(p.stop.toLowerCase()));
          if (match) {
            match.studentsCount += 1;
          }
        });

        setStops(parsedStops);
        setPassengers(parsedPassengers);

        setDriverProfile((prev) => ({
          ...prev,
          name: user.name || matchedRoute.driver || prev.name,
          driverId: user.referenceId || user.userId || prev.driverId,
          busNo: matchedRoute.vehicle || 'TN-01-BUS-2024',
          route: matchedRoute.name || 'Campus Route',
          routeId: matchedRoute.routeId || 'R-01',
          capacity: matchedRoute.capacity || 50,
        }));
      }

      // Vehicles
      const allVehicles = Array.isArray(vehiclesRes) ? vehiclesRes : [];
      setVehicles(allVehicles);
      const assignedVeh = allVehicles.find(
        (v) =>
          (matchedRoute && (v.vehicleNumber === matchedRoute.vehicle || v.registrationNumber === matchedRoute.vehicle)) ||
          (user.name && v.driver && v.driver.toLowerCase().includes(user.name.toLowerCase()))
      ) || allVehicles[0] || null;
      setMyVehicle(assignedVeh);

      // Maintenance
      const allMaint = Array.isArray(maintRes) ? maintRes : [];
      setMaintenanceList(allMaint);

      // Attendance
      const allAtt = Array.isArray(attRes) ? attRes : [];
      setAttendanceLogs(allAtt);

      // Active Trip from backend
      const allTrips = Array.isArray(tripsRes) ? tripsRes : [];
      const currentActive = allTrips.find(
        (t: any) =>
          t.status === 'In Progress' &&
          (t.driver === user.name || t.driverId === user.userId || t.vehicle === matchedRoute?.vehicle)
      );
      if (currentActive) {
        setActiveTrip(currentActive);
      }

      // Payroll
      const salArray = Array.isArray(salRes)
        ? salRes
        : Array.isArray((salRes as any)?.data)
        ? (salRes as any).data
        : [];
      setSalaries(salArray);

      // Notifications
      const notifArray = Array.isArray(notifsRes)
        ? notifsRes
        : Array.isArray((notifsRes as any)?.data)
        ? (notifsRes as any).data
        : [];
      setNotifications(notifArray);
    } catch (err) {
      console.warn('Driver data error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Passenger boarding toggle
  const toggleBoarding = (id: string) => {
    setPassengers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, boarded: !p.boarded } : p))
    );
  };

  // Checkpoint stop toggle
  const toggleStopCompleted = (stopId: string) => {
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, completed: !s.completed } : s))
    );
  };

  // Safe Phone Calling for Parents
  const handleCallParent = (phone: string, studentName: string) => {
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (!cleanPhone) {
      Alert.alert('Phone Number Missing', `No valid phone number found for ${studentName}'s parent.`);
      return;
    }

    Alert.alert(
      'Contact Parent / Guardian',
      `Call parent of ${studentName} at ${cleanPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            Linking.openURL(`tel:${cleanPhone}`).catch(() => {
              Alert.alert('Unable to Place Call', `Dial manually: ${cleanPhone}`);
            });
          },
        },
      ]
    );
  };

  // Start Trip Handler
  const handleConfirmStartTrip = async () => {
    try {
      setTripSubmitting(true);
      const tripPayload: TransportTrip = {
        routeId: activeRoute?.routeId || driverProfile.routeId,
        vehicle: myVehicle?.vehicleNumber || driverProfile.busNo,
        driver: driverProfile.name,
        driverId: user.userId || user.referenceId,
        tripType: tripTypeSelection,
        startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'In Progress',
        startOdometer: 48500,
      };

      const res = await apiPost<TransportTrip>('transport/trips', tripPayload).catch(() => ({
        ...tripPayload,
        _id: `TRIP-${Date.now().toString().slice(-6)}`,
      }));

      setActiveTrip(res);
      setShowTripStartModal(false);
      Alert.alert(
        'Trip Started Successfully 🚦',
        `Active Route: ${driverProfile.route}.\nTrip Type: ${tripTypeSelection} Transit.\nPlease observe campus speed limit (20 km/h).`
      );
    } catch (err: any) {
      Alert.alert('Trip Start Error', err.message || 'Could not start trip.');
    } finally {
      setTripSubmitting(false);
    }
  };

  // End Trip Handler
  const handleConfirmEndTrip = async () => {
    try {
      setTripSubmitting(true);
      const endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (activeTrip?._id) {
        await apiPut(`transport/trips/${activeTrip._id}`, {
          endTime,
          status: 'Completed',
          remarks: tripRemarks || 'Arrived safely at Campus Gate',
        }).catch(() => null);
      }

      setActiveTrip(null);
      setShowTripEndModal(false);
      setTripRemarks('');

      // Mark all stops reset or completed
      setStops((prev) => prev.map((s) => ({ ...s, completed: true })));

      Alert.alert(
        'Trip Completed 🏁',
        `Transit trip ended safely at ${endTime}.\nArrival registered in campus logs.`
      );
    } catch (err: any) {
      Alert.alert('Trip End Error', err.message || 'Could not conclude trip.');
    } finally {
      setTripSubmitting(false);
    }
  };



  // Submit Vehicle Maintenance Task
  const handleReportMaintenance = async () => {
    if (!maintDesc.trim()) {
      Alert.alert('Missing Description', 'Please detail the maintenance requirement or vehicle symptom.');
      return;
    }
    try {
      setMaintSubmitting(true);
      await apiPost('transport/maintenance', {
        vehicleNumber: myVehicle?.vehicleNumber || driverProfile.busNo,
        type: maintType,
        description: maintDesc.trim(),
        date: new Date().toISOString().split('T')[0],
        status: 'Pending Review',
        reportedBy: driverProfile.name,
      });

      setShowMaintModal(false);
      setMaintDesc('');
      Alert.alert('Maintenance Logged', 'Vehicle inspection team notified for workshop review.');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not log maintenance request.');
    } finally {
      setMaintSubmitting(false);
    }
  };

  // Filtered student passengers
  const filteredStudents = useMemo(() => {
    return passengers.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        p.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
        p.stop.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesStop = selectedStopFilter === 'All' || p.stop.toLowerCase().includes(selectedStopFilter.toLowerCase());
      return matchesSearch && matchesStop;
    });
  }, [passengers, studentSearch, selectedStopFilter]);

  // Available unique stop names for filter
  const uniqueStops = useMemo(() => {
    const names = Array.from(new Set(passengers.map((p) => p.stop))).filter(Boolean);
    return ['All', ...names];
  }, [passengers]);



  // Android Hardware Back Button Handling
  useEffect(() => {
    const onBackPress = () => {
      if (showTripStartModal) {
        setShowTripStartModal(false);
        return true;
      }
      if (showTripEndModal) {
        setShowTripEndModal(false);
        return true;
      }
      if (showMaintModal) {
        setShowMaintModal(false);
        return true;
      }
      if (activeNavTab === 'profile' && moreSection !== 'menu') {
        setMoreSection('menu');
        return true;
      }
      if (activeNavTab !== 'home') {
        setActiveNavTab('home');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeNavTab, moreSection, showTripStartModal, showTripEndModal, showMaintModal]);

  const isInnerScreen = activeNavTab !== 'home';

  const getScreenTitle = () => {
    if (activeNavTab === 'academics') return 'Transit Operations & Trip';
    if (activeNavTab === 'referrals') return 'Business Referrals';
    if (activeNavTab === 'profile') {
      if (moreSection === 'checklist') return 'Pre-Trip Inspection';
      if (moreSection === 'payroll') return 'Driver Payroll & Slips';
      if (moreSection === 'notices') return 'Transit Notices';
      if (moreSection === 'safety') return 'Driver Safety Guidelines';
      if (moreSection === 'menu') return 'Fleet Services & Operations';
      return 'Driver Profile';
    }
    return 'Driver Fleet Command';
  };

  const handleBackNavigation = () => {
    if (activeNavTab === 'profile' && moreSection !== 'profile') {
      setMoreSection('profile');
    } else {
      setActiveNavTab('home');
    }
  };

  return (
    <View style={styles.container}>
      {/* ================= TOP DRIVER HEADER WITH BACK NAV & LOGOUT ================= */}
      <ScreenHeader
        showBack={isInnerScreen}
        onBack={handleBackNavigation}
        title={getScreenTitle()}
        subtitle={activeNavTab === 'home' ? `Bus ${driverProfile.busNo} • ${activeTrip ? 'On Route' : 'Standby'}` : undefined}
        userName={driverProfile.name}
        roleBadge="DRIVER"
        avatarText={driverProfile.name.substring(0, 2).toUpperCase()}
        userSubtitle={`Bus: ${driverProfile.busNo} • ${driverProfile.route}`}
        onProfilePress={() => {
          setActiveNavTab('profile');
          setMoreSection('profile');
        }}
        onLogoutPress={onLogout}
      />

      {/* ================= MAIN CONTENT BODY ================= */}
      <View style={styles.mainContent}>
        {/* TAB 1: HOME DASHBOARD */}
        {activeNavTab === 'home' && (
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
          >
            {/* 1. Visual Hero Banner with High Quality Campus Transit Driver Image */}
            <DashboardHeroBanner
              greeting={`Hello, ${driverProfile.name.split(' ')[0] || driverProfile.name} 👋`}
              subtitle="Drive Safe • Serve Better"
              image={require('../../../assets/images/dashboards/driver_hero.jpg')}
              tagline="Safe Rides Happy Students"
            />

            {/* Daily Duty Attendance Card (Punch In / Out synchronized with central ERP) */}
            <DailyDutyAttendanceCard user={user} style={{ marginHorizontal: 0, marginBottom: 12 }} />

            {/* 2. Trip Status Highlight Card (Matching Reference Design) */}
            <HighlightCard
              sectionTitle="Trip Status"
              actionText={activeTrip ? "Active" : "Details"}
              onActionPress={() => {
                setActiveNavTab('academics');
                setTransportSubTab('operations');
              }}
              icon="🚌"
              iconBg="#EFF6FF"
              title={driverProfile.route || 'Route 5 - Main Block'}
              subtitle={
                activeTrip
                  ? `Next Stop: ${stops.find((s) => !s.completed)?.name || 'Campus Terminal'}`
                  : `Vehicle: ${driverProfile.busNo} • ${driverProfile.capacity} Seats`
              }
              badgeText={activeTrip ? "In Transit" : "On Time"}
              badgeBg="#DCFCE7"
              badgeTextColor="#15803D"
              onPress={() => {
                setActiveNavTab('academics');
                setTransportSubTab('operations');
              }}
            />

            {/* 3. Quick Access 2x2 Grid (Matching Reference Design) */}
            <QuickAccessGrid
              title="Quick Access"
              seeAllText="All Modules →"
              onSeeAll={() => setActiveNavTab('academics')}
              items={[
                {
                  id: 'trip',
                  label: 'My Trip',
                  icon: '🚌',
                  bg: '#EFF6FF',
                  borderColor: '#DBEAFE',
                  textColor: '#1E40AF',
                  badge: activeTrip ? 'Active' : undefined,
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('operations');
                  },
                },
                {
                  id: 'vehicle',
                  label: 'My Vehicle',
                  icon: '🚐',
                  bg: '#ECFDF5',
                  borderColor: '#D1FAE5',
                  textColor: '#065F46',
                  badge: myVehicle?.status || 'Good',
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('vehicle');
                  },
                },
                {
                  id: 'route',
                  label: 'My Route',
                  icon: '📍',
                  bg: '#F5F3FF',
                  borderColor: '#EDE9FE',
                  textColor: '#5B21B6',
                  badge: stops.length > 0 ? `${stops.length} Stops` : undefined,
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('route');
                  },
                },
                {
                  id: 'students',
                  label: 'Student List',
                  icon: '🧑‍🤝‍🧑',
                  bg: '#FFFBEB',
                  borderColor: '#FEF3C7',
                  textColor: '#92400E',
                  badge: passengers.length > 0 ? `${passengers.length} Roster` : undefined,
                  onPress: () => {
                    setActiveNavTab('academics');
                    setTransportSubTab('students');
                  },
                },
              ]}
            />



            {/* UPCOMING / RECENT STOPS GLANCE */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <Text style={[styles.cardSectionTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>📍 Route Stops Overview</Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveNavTab('academics');
                    setTransportSubTab('route');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <Text style={styles.cardLinkText}>Full Itinerary →</Text>
                </TouchableOpacity>
              </View>

              {stops.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <Text style={styles.emptyCardText}>No stops configured for this route.</Text>
                </View>
              ) : (
                stops.slice(0, 4).map((stop) => (
                  <View key={stop.id} style={styles.stopGlanceRow}>
                    <TouchableOpacity
                      style={[
                        styles.stopGlanceCheck,
                        { backgroundColor: stop.completed ? '#10B981' : '#E2E8F0' },
                      ]}
                      onPress={() => toggleStopCompleted(stop.id)}
                    >
                      <Text style={styles.stopGlanceCheckText}>
                        {stop.completed ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.stopGlanceInfo}>
                      <Text style={styles.stopGlanceName}>{stop.name}</Text>
                      <Text style={styles.stopGlanceMeta}>
                        ETA: {stop.time} • {stop.studentsCount} Students Expected
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.stopGlanceStatus,
                        { color: stop.completed ? '#10B981' : '#94A3B8' },
                      ]}
                    >
                      {stop.completed ? 'Passed' : 'Pending'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* TRANSPORT NOTIFICATIONS & ALERTS */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <Text style={[styles.cardSectionTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>🔔 Transport Announcements</Text>
                <TouchableOpacity
                  onPress={() => {
                    setActiveNavTab('profile');
                    setMoreSection('notices');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  <Text style={styles.cardLinkText}>View All ({notifications.length})</Text>
                </TouchableOpacity>
              </View>

              {notifications.length === 0 ? (
                <View style={styles.emptyCardBox}>
                  <Text style={styles.emptyCardText}>No new transport notices posted today.</Text>
                </View>
              ) : (
                notifications.slice(0, 3).map((n, idx) => (
                  <View key={n._id || idx} style={styles.noticeGlanceItem}>
                    <Text style={styles.noticeGlanceTitle}>
                      {n.title || n.subject || 'Campus Transport Update'}
                    </Text>
                    <Text style={styles.noticeGlanceMsg} numberOfLines={2}>
                      {n.message || n.description || n.text || ''}
                    </Text>
                    <Text style={styles.noticeGlanceDate}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Today'}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Dedicated Driver Referral Rewards (Letters Fully Visible) */}
            <View style={styles.card}>
              <View style={styles.cardHeaderFlex}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.cardSectionTitle} numberOfLines={1}>💼 Driver Referral Rewards</Text>
                  <Text style={styles.sectionSubtitle} numberOfLines={2}>
                    Earn institutional incentives across 4 commercial partner categories
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveNavTab('referrals')} activeOpacity={0.7} style={{ flexShrink: 0 }}>
                  <Text style={styles.cardLinkText}>Open Hub →</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 8, marginTop: 4 }}>
                {[
                  { id: 'cards', title: 'Credit Cards', desc: 'Pre-approved fuel cashback & toll benefit cards', icon: '💳', bg: '#EFF6FF', badge: 'Up to ₹2,500' },
                  { id: 'insurance', title: 'Insurance Policies', desc: 'Commercial vehicle, personal accident & family health', icon: '🛡️', bg: '#ECFDF5', badge: 'Up to ₹5,000' },
                  { id: 'jobs', title: 'Job Openings', desc: 'Refer skilled heavy vehicle drivers & mechanics', icon: '💼', bg: '#F5F3FF', badge: 'Hiring Bonus' },
                  { id: 'banking', title: 'Bank Accounts', desc: 'Salary accounts with zero minimum balance & free ATM access', icon: '🏛️', bg: '#FFFBEB', badge: 'Up to ₹750' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: item.bg,
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(0,0,0,0.05)',
                    }}
                    onPress={() => setActiveNavTab('referrals')}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 6 }} numberOfLines={1}>{item.title}</Text>
                        <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexShrink: 0 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803D' }}>{item.badge}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }} numberOfLines={2}>{item.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        )}

        {/* TAB 2: MY TRIP (TRANSPORT OPERATIONS) */}
        {activeNavTab === 'academics' && (
          <View style={styles.flexOne}>
            {/* Context Header Banner */}
            <View style={styles.pageHeaderBanner}>
              <Text style={styles.pageHeaderTitle}>Campus Transit Operations</Text>
              <Text style={styles.pageHeaderDesc}>
                Start daily trips, record stop checkpoints, verify student passenger boarding, and check bus specs.
              </Text>
            </View>

            {/* Segmented Sub Tabs */}
            <View style={styles.subTabSegmentRow}>
              {[
                { id: 'operations', label: 'Trip Ops', icon: '🚦' },
                { id: 'route', label: 'My Route', icon: '🗺️' },
                { id: 'students', label: 'Student List', icon: '👨‍🎓' },
                { id: 'vehicle', label: 'My Vehicle', icon: '🚌' },
              ].map((sub) => {
                const isSelected = transportSubTab === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subTabButton, isSelected && styles.subTabButtonActive]}
                    onPress={() => setTransportSubTab(sub.id as TransportSubTab)}
                  >
                    <Text style={styles.subTabIcon}>{sub.icon}</Text>
                    <Text style={[styles.subTabLabel, isSelected && styles.subTabLabelActive]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
            >
              {/* SUB TAB: OPERATIONS */}
              {transportSubTab === 'operations' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🚦</Text>
                    <Text style={styles.guidanceTipText}>
                      Tap 'Start Morning / Evening Trip' before leaving the depot. Mark stops as 'Passed' as you reach each checkpoint along the itinerary.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>🚦 Live Trip Control Center</Text>
                    <Text style={styles.cardSectionDesc}>
                      Confirm departure and tap each checkpoint stop as you proceed along the itinerary.
                    </Text>

                    <View style={styles.tripStatusDetailsBox}>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Current State:</Text>
                        <Text
                          style={[
                            styles.tripStatusVal,
                            { color: activeTrip ? '#15803D' : '#64748B' },
                          ]}
                        >
                          {activeTrip ? '● EN ROUTE' : 'STANDBY AT DEPOT'}
                        </Text>
                      </View>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Active Route:</Text>
                        <Text style={styles.tripStatusVal}>{driverProfile.route}</Text>
                      </View>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Assigned Bus:</Text>
                        <Text style={styles.tripStatusVal}>{driverProfile.busNo}</Text>
                      </View>
                      <View style={styles.tripStatusRow}>
                        <Text style={styles.tripStatusLabel}>Passengers:</Text>
                        <Text style={styles.tripStatusVal}>
                          {passengers.filter((p) => p.boarded).length} / {passengers.length} Boarded
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.largeTripButton,
                        { backgroundColor: activeTrip ? '#EF4444' : '#10B981' },
                      ]}
                      onPress={() => {
                        if (activeTrip) {
                          setShowTripEndModal(true);
                        } else {
                          setShowTripStartModal(true);
                        }
                      }}
                    >
                      <Text style={styles.largeTripButtonText}>
                        {activeTrip ? '🏁 END TRIP & LOG ARRIVAL' : '🚦 START SCHEDULED TRIP'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Stop Checkpoints */}
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>📍 Checkpoint Progression</Text>
                    <Text style={styles.cardSectionDesc}>
                      Tap checkmark when reaching each stop to keep transport command informed.
                    </Text>

                    {stops.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No stops defined on this route.</Text>
                      </View>
                    ) : (
                      stops.map((stop, idx) => (
                        <View key={stop.id} style={styles.checkpointCard}>
                          <TouchableOpacity
                            style={[
                              styles.checkpointBox,
                              { backgroundColor: stop.completed ? '#10B981' : '#F1F5F9' },
                            ]}
                            onPress={() => toggleStopCompleted(stop.id)}
                          >
                            <Text
                              style={[
                                styles.checkpointBoxText,
                                { color: stop.completed ? '#FFFFFF' : '#94A3B8' },
                              ]}
                            >
                              {stop.completed ? '✓' : String(idx + 1)}
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.checkpointInfo}>
                            <Text style={styles.checkpointName}>{stop.name}</Text>
                            <Text style={styles.checkpointMeta}>
                              ETA: {stop.time} • {stop.studentsCount} Students
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.checkpointActionBtn,
                              { backgroundColor: stop.completed ? '#DCFCE7' : '#EFF6FF' },
                            ]}
                            onPress={() => toggleStopCompleted(stop.id)}
                          >
                            <Text
                              style={[
                                styles.checkpointActionText,
                                { color: stop.completed ? '#15803D' : '#1D4ED8' },
                              ]}
                            >
                              {stop.completed ? 'Passed' : 'Mark Arrived'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* SUB TAB: ROUTE */}
              {transportSubTab === 'route' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🗺️</Text>
                    <Text style={styles.guidanceTipText}>
                      Complete chronological stop sequence for your route. Review scheduled pickup times and assigned student counts.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>🗺️ Complete Route Stops Itinerary</Text>
                    <Text style={styles.cardSectionDesc}>
                      Authorized transit sequence for {driverProfile.route} ({driverProfile.routeId})
                    </Text>

                    {stops.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No route stops registered for this bus.</Text>
                      </View>
                    ) : (
                      stops.map((stop, idx) => (
                        <View key={stop.id} style={styles.routeTimelineItem}>
                          <View style={styles.timelineLeft}>
                            <View
                              style={[
                                styles.timelineCircle,
                                { backgroundColor: stop.completed ? '#10B981' : '#1E3A8A' },
                              ]}
                            >
                              <Text style={styles.timelineCircleText}>{idx + 1}</Text>
                            </View>
                            {idx < stops.length - 1 && <View style={styles.timelineLine} />}
                          </View>
                          <View style={styles.timelineContent}>
                            <Text style={styles.timelineStopTitle}>{stop.name}</Text>
                            <Text style={styles.timelineStopMeta}>
                              Scheduled Pickup: {stop.time}
                            </Text>
                            <Text style={styles.timelineStopStudents}>
                              👨‍🎓 {stop.studentsCount} Students Assigned
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* SUB TAB: STUDENT LIST */}
              {transportSubTab === 'students' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>👨‍🎓</Text>
                    <Text style={styles.guidanceTipText}>
                      Tap 'Board' when each scholar steps onto the bus. Tap 'Call Parent' if a registered student does not appear at their stop.
                    </Text>
                  </View>
                  {/* Search and Filter */}
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>👨‍🎓 Student Passenger Roster</Text>
                    <Text style={styles.cardSectionDesc}>
                      Verify boarding status and contact parents in case of absence.
                    </Text>

                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by student name or roll number..."
                      placeholderTextColor="#94A3B8"
                      value={studentSearch}
                      onChangeText={setStudentSearch}
                    />

                    {/* Stop Filter Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      {uniqueStops.map((stopName) => {
                        const isChipActive = selectedStopFilter === stopName;
                        return (
                          <TouchableOpacity
                            key={stopName}
                            style={[styles.filterChip, isChipActive && styles.filterChipActive]}
                            onPress={() => setSelectedStopFilter(stopName)}
                          >
                            <Text
                              style={[
                                styles.filterChipText,
                                isChipActive && styles.filterChipTextActive,
                              ]}
                            >
                              {stopName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Passenger List */}
                  {filteredStudents.length === 0 ? (
                    <View style={[styles.card, styles.emptyCardBox]}>
                      <Text style={styles.emptyCardText}>No matching student passengers found.</Text>
                    </View>
                  ) : (
                    filteredStudents.map((student) => (
                      <TouchableOpacity
                        key={student.id}
                        style={styles.passengerCard}
                        onPress={() => setSelectedPassengerProfile(student)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.passengerLeft}>
                          <View style={styles.passengerHeaderRow}>
                            <Text style={styles.passengerName}>{student.name}</Text>
                            <View
                              style={[
                                styles.boardingStatusPill,
                                { backgroundColor: student.boarded ? '#DCFCE7' : '#F1F5F9' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.boardingStatusPillText,
                                  { color: student.boarded ? '#15803D' : '#64748B' },
                                ]}
                              >
                                {student.boarded ? '✓ BOARDED' : 'WAITING'}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.passengerMeta}>
                            ID: {student.rollNo} • Stop: {student.stop}
                          </Text>

                          {/* Large Call Parent Action */}
                          <TouchableOpacity
                            style={styles.callParentButton}
                            onPress={() => handleCallParent(student.parentPhone, student.name)}
                          >
                            <Text style={styles.callParentIcon}>📞</Text>
                            <Text style={styles.callParentLabel}>
                              Call Parent ({student.parentPhone})
                            </Text>
                          </TouchableOpacity>

                          <Text style={{ fontSize: 11, color: '#2563EB', fontWeight: '700', marginTop: 4 }}>
                            View Passenger Profile ›
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.toggleBoardBtn,
                            { backgroundColor: student.boarded ? '#10B981' : '#EFF6FF' },
                          ]}
                          onPress={() => toggleBoarding(student.id)}
                        >
                          <Text
                            style={[
                              styles.toggleBoardBtnText,
                              { color: student.boarded ? '#FFFFFF' : '#2563EB' },
                            ]}
                          >
                            {student.boarded ? 'Unmark' : 'Board'}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              {/* SUB TAB: VEHICLE */}
              {transportSubTab === 'vehicle' && (
                <View>
                  <View style={styles.guidanceTipBox}>
                    <Text style={styles.guidanceTipEmoji}>🚌</Text>
                    <Text style={styles.guidanceTipText}>
                      Review assigned bus specifications, fitness certificate validity, and log mechanical maintenance issues for workshop inspection.
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <View style={styles.cardHeaderFlex}>
                      <Text style={styles.cardSectionTitle}>🚌 Assigned Vehicle Specs</Text>
                      <TouchableOpacity
                        style={styles.smallActionBtn}
                        onPress={() => setShowMaintModal(true)}
                      >
                        <Text style={styles.smallActionBtnText}>+ Log Service</Text>
                      </TouchableOpacity>
                    </View>

                    {[
                      { label: 'Vehicle Number', value: myVehicle?.vehicleNumber || driverProfile.busNo },
                      { label: 'Registration Plate', value: myVehicle?.registrationNumber || driverProfile.busNo },
                      { label: 'Seating Capacity', value: `${myVehicle?.capacity || driverProfile.capacity} Passengers` },
                      { label: 'Vehicle Status', value: myVehicle?.status || 'Active & Operational' },
                      { label: 'Fuel Type', value: myVehicle?.fuelType || 'Diesel' },
                      { label: 'Fitness Certificate (FC)', value: myVehicle?.fitnessExpiry ? new Date(myVehicle.fitnessExpiry).toLocaleDateString() : 'Valid / Up to date' },
                      { label: 'Insurance Expiry', value: myVehicle?.insuranceExpiry ? new Date(myVehicle.insuranceExpiry).toLocaleDateString() : 'Active Insured' },
                    ].map((spec, idx) => (
                      <View key={idx} style={styles.specItemRow}>
                        <Text style={styles.specItemLabel}>{spec.label}</Text>
                        <Text style={styles.specItemValue}>{spec.value}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Maintenance Log */}
                  <View style={styles.card}>
                    <Text style={styles.cardSectionTitle}>🔧 Maintenance & Workshop Log</Text>
                    {maintenanceList.length === 0 ? (
                      <View style={styles.emptyCardBox}>
                        <Text style={styles.emptyCardText}>No maintenance issues logged for this vehicle.</Text>
                      </View>
                    ) : (
                      maintenanceList.map((m, idx) => (
                        <View key={m._id || idx} style={styles.maintItemCard}>
                          <View style={styles.maintTopRow}>
                            <Text style={styles.maintTypeBadge}>{m.type || 'Service'}</Text>
                            <Text
                              style={[
                                styles.maintStatusBadge,
                                {
                                  color: m.status === 'Completed' ? '#15803D' : '#D97706',
                                  backgroundColor: m.status === 'Completed' ? '#DCFCE7' : '#FEF3C7',
                                },
                              ]}
                            >
                              {m.status || 'Under Review'}
                            </Text>
                          </View>
                          <Text style={styles.maintDesc}>{m.description || 'Routine maintenance'}</Text>
                          <Text style={styles.maintDate}>
                            Date: {m.date ? new Date(m.date).toLocaleDateString() : 'Recent'}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* TAB 3: BUSINESS REFERRALS */}
        {activeNavTab === 'referrals' && (
          <View style={styles.flexOne}>
            <ReferralHub user={user} />
          </View>
        )}

        {/* TAB 4: PROFILE */}
        {activeNavTab === 'profile' && (
          <View style={styles.flexOne}>
            {/* Top Sub-Navigation Switcher: Driver Profile vs Fleet Services */}
            <View style={styles.profileToggleHeader}>
              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  moreSection === 'profile' && styles.profileToggleTabActive,
                ]}
                onPress={() => setMoreSection('profile')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    moreSection === 'profile' && styles.profileToggleTabTextActive,
                  ]}
                >
                  👤 Driver Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.profileToggleTab,
                  moreSection !== 'profile' && styles.profileToggleTabActive,
                ]}
                onPress={() => setMoreSection('menu')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.profileToggleTabText,
                    moreSection !== 'profile' && styles.profileToggleTabTextActive,
                  ]}
                >
                  🚌 Fleet Services
                </Text>
              </TouchableOpacity>
            </View>

            {/* VIEW 1: OFFICIAL DRIVER PROFILE (PRIMARY VIEW FOR PROFILE TAB & TOP AVATAR) */}
            {moreSection === 'profile' && (
              <UserProfileScreen
                user={user}
                roleTitle="Campus Transit Driver"
                onLogout={onLogout}
                onBack={() => setActiveNavTab('home')}
                hideTopBar={true}
                roleAttributes={[
                  { label: 'Driver Employee ID', value: driverProfile.driverId },
                  { label: 'Assigned Vehicle', value: `${driverProfile.busNo} (${driverProfile.capacity} Seats)` },
                  { label: 'Transit Route', value: `${driverProfile.route} [${driverProfile.routeId}]` },
                  { label: 'Commercial Driving License', value: driverProfile.licenseNo },
                  { label: 'Emergency Contact', value: driverProfile.phone },
                  { label: 'Trip Operational Status', value: activeTrip ? 'En Route (Active Trip)' : 'Standby / Ready' },
                  { label: 'Vehicle Health Status', value: myVehicle?.status || 'Good' },
                ]}
              />
            )}

            {/* VIEW 2: FLEET SERVICES & TOOLS */}
            {moreSection !== 'profile' && (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
              >
                {/* DRIVER PROFILE CARD */}
                {moreSection === 'menu' && (
                  <View style={styles.profileSummaryCard}>
                    <View style={styles.profileAvatarLarge}>
                      <Text style={styles.profileAvatarLargeText}>
                        {driverProfile.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.profileSummaryInfo}>
                      <Text style={styles.profileSummaryName}>{driverProfile.name}</Text>
                      <Text style={styles.profileSummaryRole}>Institutional Campus Driver</Text>
                      <Text style={styles.profileSummaryMeta}>ID: {driverProfile.driverId}</Text>
                      <Text style={styles.profileSummaryMeta}>Bus: {driverProfile.busNo}</Text>
                      <Text style={styles.profileSummaryMeta}>License: {driverProfile.licenseNo}</Text>
                    </View>
                  </View>
                )}

              {/* NAVIGATION MENU ITEMS */}
              {moreSection === 'menu' && (
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>🛠️ Driver Services & Accounts</Text>

                {[
                  { id: 'profile', title: 'Driver Identity & Profile', sub: 'Verified employee details and route license', icon: '👤' },
                  { id: 'checklist', title: 'Daily Pre-Trip Inspection', sub: 'Brakes, tires, first-aid & emergency exit check', icon: '📋' },
                  { id: 'payroll', title: 'Salary Slips & Payroll', sub: 'View monthly earnings, allowances and net pay', icon: '💵' },
                  { id: 'notices', title: 'Transport Notices & Advisories', sub: 'Campus transit notifications and road alerts', icon: '🔔' },
                  { id: 'safety', title: 'Driver Safety Guidelines & SOP', sub: 'Institutional safety protocols and speed limits', icon: '🛡️' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.menuItemRow}
                    onPress={() => setMoreSection(item.id as MoreSection)}
                  >
                    <View style={styles.menuItemIconBox}>
                      <Text style={styles.menuItemIconText}>{item.icon}</Text>
                    </View>
                    <View style={styles.menuItemContent}>
                      <Text style={styles.menuItemTitle}>{item.title}</Text>
                      <Text style={styles.menuItemSub}>{item.sub}</Text>
                    </View>
                    <Text style={styles.menuItemArrow}>›</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.menuSignOutBtn} onPress={onLogout}>
                  <Text style={styles.menuSignOutText}>Sign Out from Driver Portal</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-SECTION: PRE-TRIP CHECKLIST */}
            {moreSection === 'checklist' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>📋 Daily Pre-Trip Safety Inspection</Text>
                <Text style={styles.cardSectionDesc}>
                  Perform inspection while stationary before starting daily student transit.
                </Text>

                {[
                  { key: 'brakes', label: 'Brakes & Steering System operational' },
                  { key: 'tires', label: 'Tire inflation and tread depth verified' },
                  { key: 'fluids', label: 'Engine oil, coolant and brake fluid adequate' },
                  { key: 'extinguisher', label: 'Fire extinguisher pressure in green safety zone' },
                  { key: 'firstAid', label: 'First Aid Kit stocked with emergency supplies' },
                  { key: 'emergencyExit', label: 'Emergency exit windows and door latches unblocked' },
                  { key: 'mirrors', label: 'Side mirrors and passenger rear-view mirror adjusted' },
                ].map((item) => {
                  const isChecked = !!checklist[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={styles.checklistRow}
                      onPress={() =>
                        setChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                    >
                      <View
                        style={[
                          styles.checkboxBox,
                          { backgroundColor: isChecked ? '#10B981' : '#F1F5F9' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkboxCheck,
                            { color: isChecked ? '#FFFFFF' : '#94A3B8' },
                          ]}
                        >
                          {isChecked ? '✓' : ''}
                        </Text>
                      </View>
                      <Text style={styles.checklistLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.saveChecklistBtn}
                  onPress={() => {
                    setInspectionReportModalVisible(true);
                  }}
                >
                  <Text style={styles.saveChecklistBtnText}>Confirm Pre-Trip Inspection ✓</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SUB-SECTION: PAYROLL */}
            {moreSection === 'payroll' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>💵 Driver Payslips & Payroll</Text>
                <Text style={styles.cardSectionDesc}>
                  Monthly institutional compensation and earnings statements.
                </Text>

                {salaries.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Text style={styles.emptyCardText}>
                      No electronic salary slips generated yet for driver account {driverProfile.driverId}.
                    </Text>
                  </View>
                ) : (
                  salaries.map((sal, idx) => (
                    <TouchableOpacity
                      key={sal._id || idx}
                      style={styles.payrollCard}
                      onPress={() => setSelectedSalarySlip(sal)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.payrollHeaderRow}>
                        <Text style={styles.payrollMonthTitle}>
                          {sal.month || 'Current Month'} {sal.year || ''}
                        </Text>
                        <View
                          style={[
                            styles.payrollStatusPill,
                            {
                              backgroundColor:
                                sal.status === 'Paid' ? '#DCFCE7' : '#FEF3C7',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.payrollStatusText,
                              {
                                color: sal.status === 'Paid' ? '#15803D' : '#D97706',
                              },
                            ]}
                          >
                            {sal.status || 'Processed'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.payrollBreakdownGrid}>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Basic Pay</Text>
                          <Text style={styles.payrollColVal}>
                            ₹{sal.basicSalary?.toLocaleString() || '18,500'}
                          </Text>
                        </View>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Allowances</Text>
                          <Text style={styles.payrollColVal}>
                            ₹{sal.allowances?.toLocaleString() || '3,200'}
                          </Text>
                        </View>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Deductions</Text>
                          <Text style={[styles.payrollColVal, { color: '#EF4444' }]}>
                            -₹{sal.deductions?.toLocaleString() || '1,100'}
                          </Text>
                        </View>
                        <View style={styles.payrollCol}>
                          <Text style={styles.payrollColLabel}>Net Take-Home</Text>
                          <Text style={[styles.payrollColVal, { color: '#059669', fontWeight: '800' }]}>
                            ₹{sal.netSalary?.toLocaleString() || '20,600'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* SUB-SECTION: NOTICES */}
            {moreSection === 'notices' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>🔔 Transport Notices & Alerts</Text>

                {notifications.length === 0 ? (
                  <View style={styles.emptyCardBox}>
                    <Text style={styles.emptyCardText}>No announcements posted.</Text>
                  </View>
                ) : (
                  notifications.map((n, idx) => (
                    <View key={n._id || idx} style={styles.noticeGlanceItem}>
                      <Text style={styles.noticeGlanceTitle}>
                        {n.title || n.subject || 'Notice'}
                      </Text>
                      <Text style={styles.noticeGlanceMsg}>
                        {n.message || n.description || n.text || ''}
                      </Text>
                      <Text style={styles.noticeGlanceDate}>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Recent'}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* SUB-SECTION: SAFETY */}
            {moreSection === 'safety' && (
              <View style={styles.card}>
                <View style={styles.backNavRow}>
                  <TouchableOpacity onPress={() => setMoreSection('menu')}>
                    <Text style={styles.backNavText}>← Back to Services</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSectionTitle}>🛡️ Driver Safety Guidelines & SOP</Text>

                {[
                  { rule: 'Campus Speed Limit: Strictly 20 KM/H inside college premises. 40 KM/H on city corridors.' },
                  { rule: 'Stationary Doors: Never open pneumatic doors until the bus is completely stationary and handbrake engaged.' },
                  { rule: 'No Distraction: Mobile phone operation strictly prohibited while moving. Pull over in safe bay before making urgent calls.' },
                  { rule: 'Student Handover: Wait until students have safely crossed onto sidewalk before continuing route.' },
                  { rule: 'Emergency Protocol: In case of vehicle breakdown, activate hazard flashers and notify Transport Control immediately.' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.safetyRuleRow}>
                    <Text style={styles.safetyRuleNumber}>{idx + 1}.</Text>
                    <Text style={styles.safetyRuleText}>{item.rule}</Text>
                  </View>
                ))}
              </View>
            )}

              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* ================= TRIP START CONFIRMATION MODAL ================= */}
      <Modal visible={showTripStartModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🚦 Confirm Trip Start</Text>
            <Text style={styles.modalSub}>
              Ensure vehicle is stationary and pre-trip inspection is completed.
            </Text>

            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoLabel}>Assigned Route:</Text>
              <Text style={styles.modalInfoVal}>{driverProfile.route} ({driverProfile.routeId})</Text>

              <Text style={styles.modalInfoLabel}>Vehicle:</Text>
              <Text style={styles.modalInfoVal}>{driverProfile.busNo}</Text>

              <Text style={styles.modalInfoLabel}>Select Transit Shift:</Text>
              <View style={styles.shiftPickerRow}>
                {(['Morning', 'Evening'] as const).map((shift) => (
                  <TouchableOpacity
                    key={shift}
                    style={[
                      styles.shiftBtn,
                      tripTypeSelection === shift && styles.shiftBtnActive,
                    ]}
                    onPress={() => setTripTypeSelection(shift)}
                  >
                    <Text
                      style={[
                        styles.shiftBtnText,
                        tripTypeSelection === shift && styles.shiftBtnTextActive,
                      ]}
                    >
                      {shift} Transit
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowTripStartModal(false)}
                disabled={tripSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmStartTrip}
                disabled={tripSubmitting}
              >
                {tripSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Start Trip 🚦</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= TRIP END CONFIRMATION MODAL ================= */}
      <Modal visible={showTripEndModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🏁 Conclude Active Trip</Text>
            <Text style={styles.modalSub}>
              Confirm bus is parked safely at destination and all passengers have disembarked.
            </Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder="Optional remarks (e.g., Safe campus arrival, on-time drop)..."
              placeholderTextColor="#94A3B8"
              value={tripRemarks}
              onChangeText={setTripRemarks}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowTripEndModal(false)}
                disabled={tripSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleConfirmEndTrip}
                disabled={tripSubmitting}
              >
                {tripSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>End Trip 🏁</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= LOG MAINTENANCE MODAL ================= */}
      <Modal visible={showMaintModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🔧 Report Vehicle Issue</Text>
            <Text style={styles.modalSub}>
              Log maintenance requirements for Bus {driverProfile.busNo}
            </Text>

            <Text style={styles.modalInfoLabel}>Issue Type:</Text>
            <View style={styles.shiftPickerRow}>
              {['Brakes/Tires', 'Engine/Fluid', 'Electrical', 'Body/Glass'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.shiftBtn, maintType === t && styles.shiftBtnActive]}
                  onPress={() => setMaintType(t)}
                >
                  <Text
                    style={[
                      styles.shiftBtnText,
                      maintType === t && styles.shiftBtnTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.modalTextInput, { height: 80 }]}
              placeholder="Describe vehicle defect, noise, or repair needed..."
              placeholderTextColor="#94A3B8"
              multiline
              value={maintDesc}
              onChangeText={setMaintDesc}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowMaintModal(false)}
                disabled={maintSubmitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleReportMaintenance}
                disabled={maintSubmitting}
              >
                {maintSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 4. STUDENT PASSENGER TRANSIT PROFILE MODAL                     */}
      {/* ============================================================== */}
      <Modal
        visible={selectedPassengerProfile !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPassengerProfile(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                CAMPUS FLEET TRANSIT DOSSIER
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                {selectedPassengerProfile?.name}
              </Text>
              <View
                style={{
                  backgroundColor: selectedPassengerProfile?.boarded ? '#DCFCE7' : '#EFF6FF',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  marginTop: 6,
                }}
              >
                <Text
                  style={{
                    color: selectedPassengerProfile?.boarded ? '#15803D' : '#1D4ED8',
                    fontSize: 12,
                    fontWeight: '800',
                  }}
                >
                  {selectedPassengerProfile?.boarded ? '✓ BOARDED ON VEHICLE' : 'WAITING AT STOP'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Student Roll No:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedPassengerProfile?.rollNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Assigned Stop:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedPassengerProfile?.stop}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Assigned Vehicle:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.busNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Emergency Contact:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{selectedPassengerProfile?.parentPhone}</Text>
                </View>
              </View>

              <View style={[styles.guidanceTipBox, { marginTop: 10 }]}>
                <Text style={styles.guidanceTipEmoji}>🚌</Text>
                <Text style={styles.guidanceTipText}>
                  Boarding updates sync with parent tracking notification feed in real-time.
                </Text>
              </View>
            </ScrollView>

            <View style={{ gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: selectedPassengerProfile?.boarded ? '#DC2626' : '#10B981', width: '100%' },
                ]}
                onPress={() => {
                  if (selectedPassengerProfile) {
                    toggleBoarding(selectedPassengerProfile.id);
                    setSelectedPassengerProfile((prev) => prev ? { ...prev, boarded: !prev.boarded } : null);
                  }
                }}
              >
                <Text style={styles.modalConfirmBtnText}>
                  {selectedPassengerProfile?.boarded ? 'Unmark Boarding' : '✓ Mark as Boarded'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedPassengerProfile(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#2563EB' }]}
                  onPress={() => {
                    if (selectedPassengerProfile?.parentPhone) {
                      Linking.openURL(`tel:${selectedPassengerProfile.parentPhone}`).catch(() => null);
                    }
                  }}
                >
                  <Text style={styles.modalConfirmBtnText}>📞 Call Parent</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 5. PRE-TRIP VEHICLE SAFETY INSPECTION REPORT MODAL             */}
      {/* ============================================================== */}
      <Modal
        visible={inspectionReportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectionReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 520 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                FLEET ROADWORTHINESS CERTIFICATION
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                Pre-Trip Safety Inspection
              </Text>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 }}>
                <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '800' }}>✓ CERTIFIED ROADWORTHY</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Vehicle Registration:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.busNo}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Inspected By (Driver):</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Certification Time:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{new Date().toLocaleTimeString()} (Today)</Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Inspection Checkpoint Audits</Text>
              <View style={{ backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' }}>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Pneumatic Brakes & Pressure: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Tire Tread & Inflation: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Engine Coolant & Lubricant: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Fire Extinguisher & Safety Equipment: OK</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ Emergency Exit Doors & Windows: Clear</Text>
                <Text style={{ fontSize: 12, color: '#15803D', fontWeight: '700' }}>✓ GPS Telematics & Dash Cam: Active</Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { marginTop: 14, width: '100%', backgroundColor: '#059669' }]}
              onPress={() => {
                setInspectionReportModalVisible(false);
                setMoreSection('menu');
              }}
            >
              <Text style={styles.modalConfirmBtnText}>Confirm & Log Inspection ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* 6. DRIVER SALARY SLIP VOUCHER MODAL                            */}
      {/* ============================================================== */}
      <Modal
        visible={selectedSalarySlip !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSalarySlip(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 500 }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1.2 }}>
                CAMPUS PAYROLL & HR DISBURSEMENT
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 2 }}>
                {selectedSalarySlip?.month || 'Current Month'} {selectedSalarySlip?.year || ''} Payslip
              </Text>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 }}>
                <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '800' }}>
                  ✓ {selectedSalarySlip?.status || 'PAID & TRANSFERRED'}
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 280 }}>
              <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Driver Employee ID:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{driverProfile.driverId}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Designation:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>Campus Senior Fleet Driver</Text>
                </View>
                <View style={{ height: 1, backgroundColor: '#CBD5E1', marginVertical: 4 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Basic Salary:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>₹{selectedSalarySlip?.basicSalary?.toLocaleString() || '18,500'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Fleet Allowances:</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>₹{selectedSalarySlip?.allowances?.toLocaleString() || '3,200'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>Deductions (PF/ESI):</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>-₹{selectedSalarySlip?.deductions?.toLocaleString() || '1,100'}</Text>
                </View>
              </View>

              <View style={{ marginTop: 12, backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A8A' }}>Net Take-Home Pay</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E3A8A' }}>
                    ₹{selectedSalarySlip?.netSalary?.toLocaleString() || '20,600'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, { marginTop: 14, width: '100%', backgroundColor: '#1E3A8A' }]}
              onPress={() => setSelectedSalarySlip(null)}
            >
              <Text style={styles.modalConfirmBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= DRIVER BOTTOM NAVIGATION ================= */}
      <BottomTabBar
        activeTab={activeNavTab}
        onTabChange={(t) => {
          if (t === 'profile') {
            setMoreSection('profile');
          }
          setActiveNavTab(t);
        }}
        notificationsCount={notifications.length}
        tabsList={['home', 'academics', 'referrals', 'profile']}
        tabLabels={{
          home: 'Home',
          academics: 'My Trip',
          referrals: 'Referrals',
          profile: 'Profile',
        }}
        tabIcons={{
          home: '🏠',
          academics: '🚌',
          referrals: '💼',
          profile: '👤',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  flexOne: {
    flex: 1,
  },
  // PROFILE / SERVICES TOGGLE
  profileToggleHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  profileToggleTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  profileToggleTabActive: {
    backgroundColor: '#1E3A8A',
  },
  profileToggleTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  profileToggleTabTextActive: {
    color: '#FFFFFF',
  },
  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  driverNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  driverSubText: {
    fontSize: 12,
    color: '#64748B',
  },
  signOutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signOutBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  mainContent: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 30,
  },
  tripHeroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  tripHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tripHeroBadge: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  tripHeroTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  tripHeroSub: {
    color: '#E2E8F0',
    fontSize: 12,
    marginTop: 2,
  },
  vehicleSpeedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  vehicleSpeedText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  vehicleSpeedVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  activeTripMetaBox: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  activeTripMetaText: {
    color: '#BBF7D0',
    fontSize: 12,
    fontWeight: '600',
  },
  largeTripButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  largeTripButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  largeTripButtonSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSectionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  cardHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderSub: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  gpayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gpayCol: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  gpayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gpayIcon: {
    fontSize: 22,
  },
  gpayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
  serviceRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIconEmoji: {
    fontSize: 18,
  },
  serviceRowContent: {
    flex: 1,
  },
  serviceRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  serviceRowSub: {
    fontSize: 11,
    color: '#64748B',
  },
  serviceChevron: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
    marginLeft: 6,
  },
  stopGlanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stopGlanceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stopGlanceCheckText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stopGlanceInfo: {
    flex: 1,
  },
  stopGlanceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopGlanceMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  stopGlanceStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCardBox: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  noticeGlanceItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noticeGlanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  noticeGlanceMsg: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  noticeGlanceDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  subTabSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  subTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 3,
    backgroundColor: '#F8FAFC',
  },
  subTabButtonActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  subTabIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  subTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabLabelActive: {
    color: '#1D4ED8',
  },
  tripStatusDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tripStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tripStatusLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  tripStatusVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  checkpointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkpointBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkpointBoxText: {
    fontSize: 12,
    fontWeight: '800',
  },
  checkpointInfo: {
    flex: 1,
  },
  checkpointName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkpointMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkpointActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  checkpointActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  routeTimelineItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStopTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineStopMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  timelineStopStudents: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 2,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  chipScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  passengerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerLeft: {
    flex: 1,
  },
  passengerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  boardingStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  boardingStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  passengerMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callParentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  callParentIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  callParentLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  toggleBoardBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  toggleBoardBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  smallActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  specItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  specItemLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  specItemValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
  },
  maintItemCard: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  maintTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  maintTypeBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E3A8A',
  },
  maintStatusBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  maintDesc: {
    fontSize: 12,
    color: '#334155',
  },
  maintDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  profileSummaryCard: {
    backgroundColor: '#1E3A8A',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarLargeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  profileSummaryInfo: {
    flex: 1,
  },
  profileSummaryName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  profileSummaryRole: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  profileSummaryMeta: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 2,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemIconText: {
    fontSize: 18,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  menuSignOutBtn: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  menuSignOutText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
  backNavRow: {
    marginBottom: 10,
  },
  backNavText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  checkboxCheck: {
    fontSize: 14,
    fontWeight: '900',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  saveChecklistBtn: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  saveChecklistBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  payrollCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  payrollHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  payrollMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  payrollStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payrollStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  payrollBreakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  payrollCol: {
    alignItems: 'center',
  },
  payrollColLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  payrollColVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
    marginTop: 2,
  },
  attendanceActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  attActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  attActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  attLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  attLogDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attLogTimes: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attLogBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  attLogBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  safetyRuleRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  safetyRuleNumber: {
    width: 24,
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  safetyRuleText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  modalInfoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  modalInfoVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  shiftPickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  shiftBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  shiftBtnActive: {
    backgroundColor: '#1E3A8A',
  },
  shiftBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  shiftBtnTextActive: {
    color: '#FFFFFF',
  },
  modalTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
    minWidth: 110,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pageHeaderBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  pageHeaderDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  guidanceTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  guidanceTipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  guidanceTipText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
});
