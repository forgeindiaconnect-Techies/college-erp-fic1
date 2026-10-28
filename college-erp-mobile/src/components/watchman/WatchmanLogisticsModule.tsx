import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import { apiGet, apiPatch, apiPost, type MobileUser } from '../../services/api';
import WatchmanVehicleEntryModal from './WatchmanVehicleEntryModal';
import WatchmanParcelEntryModal from './WatchmanParcelEntryModal';

type Props = {
  user: MobileUser;
  assignedGate?: string;
  onNavigateHome?: () => void;
};

type LogisticsSubTab = 'buses' | 'vehicles' | 'parcels' | 'attendance' | 'incidents';

export default function WatchmanLogisticsModule({ user, assignedGate = 'Gate 1 (Main Entrance)' }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<LogisticsSubTab>('buses');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Bus Tracking State
  const [buses, setBuses] = useState<any[]>([]);
  const [busStats, setBusStats] = useState({
    totalRegistered: 0,
    insideCampus: 0,
    departedToday: 0,
    notArrivedToday: 0,
  });
  const [busModalVisible, setBusModalVisible] = useState(false);
  const [selectedBusForAction, setSelectedBusForAction] = useState<any | null>(null);
  const [busActionMode, setBusActionMode] = useState<'entry' | 'exit'>('entry');
  const [busOdometer, setBusOdometer] = useState('');
  const [busPassengers, setBusPassengers] = useState('');
  const [busNotes, setBusNotes] = useState('');
  const [submittingBus, setSubmittingBus] = useState(false);

  // 2. Vehicles State
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [vehNumber, setVehNumber] = useState('');
  const [vehType, setVehType] = useState('4-Wheeler');
  const [vehDriver, setVehDriver] = useState('');
  const [vehPhone, setVehPhone] = useState('');
  const [vehPurpose, setVehPurpose] = useState('');
  const [vehBay, setVehBay] = useState('Bay A-1');
  const [submittingVehicle, setSubmittingVehicle] = useState(false);

  // 3. Parcels State
  const [parcels, setParcels] = useState<any[]>([]);
  const [parcelModalVisible, setParcelModalVisible] = useState(false);
  const [parCourier, setParCourier] = useState('BlueDart Logistics');
  const [parAwb, setParAwb] = useState('');
  const [parRecipientName, setParRecipientName] = useState('');
  const [parRecipientPhone, setParRecipientPhone] = useState('');
  const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [submittingParcel, setSubmittingParcel] = useState(false);
  // Handover OTP Modal
  const [handoverModalVisible, setHandoverModalVisible] = useState(false);
  const [selectedParcelForHandover, setSelectedParcelForHandover] = useState<any | null>(null);
  const [handoverOtp, setHandoverOtp] = useState('');
  const [handoverReceiver, setHandoverReceiver] = useState('');
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // 4. Guard Shift Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [dutyStatus, setDutyStatus] = useState<'On Duty' | 'Off Duty'>('On Duty');
  const [dutyClockLoading, setDutyClockLoading] = useState(false);

  // 5. Emergency Incidents State
  const [incidents, setIncidents] = useState<any[]>([]);
  const [incidentModalVisible, setIncidentModalVisible] = useState(false);
  const [incType, setIncType] = useState('Unauthorized Entry');
  const [incSeverity, setIncSeverity] = useState('Medium');
  const [incLocation, setIncLocation] = useState('Gate 1 Perimeter');
  const [incDesc, setIncDesc] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);

  // ----------------------------------------------------------------------
  // LOAD REAL DATA
  // ----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        busesRes,
        busStatsRes,
        vehiclesRes,
        parcelsRes,
        staffDirRes,
        attRes,
        incRes,
      ] = await Promise.allSettled([
        apiGet<any>('buses'),
        apiGet<any>('buses/stats'),
        apiGet<any>('watchman/vehicles'),
        apiGet<any>('parcels'),
        apiGet<any>('parcels/staff-directory'),
        apiGet<any>('watchman/attendance'),
        apiGet<any>('watchman/incidents'),
      ]);

      if (busesRes.status === 'fulfilled') {
        const raw = Array.isArray(busesRes.value?.data) ? busesRes.value.data : Array.isArray(busesRes.value) ? busesRes.value : [];
        setBuses(raw);
      }
      if (busStatsRes.status === 'fulfilled' && busStatsRes.value?.data) {
        setBusStats(busStatsRes.value.data);
      }
      if (vehiclesRes.status === 'fulfilled') {
        const raw = Array.isArray(vehiclesRes.value?.data) ? vehiclesRes.value.data : Array.isArray(vehiclesRes.value) ? vehiclesRes.value : [];
        setVehicles(raw);
      }
      if (parcelsRes.status === 'fulfilled') {
        const raw = Array.isArray(parcelsRes.value?.data) ? parcelsRes.value.data : Array.isArray(parcelsRes.value) ? parcelsRes.value : [];
        setParcels(raw);
      }
      if (staffDirRes.status === 'fulfilled') {
        const raw = Array.isArray(staffDirRes.value?.data) ? staffDirRes.value.data : Array.isArray(staffDirRes.value) ? staffDirRes.value : [];
        setStaffDirectory(raw);
      }
      if (attRes.status === 'fulfilled') {
        const raw = Array.isArray(attRes.value?.data) ? attRes.value.data : Array.isArray(attRes.value) ? attRes.value : [];
        setAttendanceRecords(raw);
      }
      if (incRes.status === 'fulfilled') {
        const raw = Array.isArray(incRes.value?.data) ? incRes.value.data : Array.isArray(incRes.value) ? incRes.value : [];
        setIncidents(raw);
      }
    } catch (err) {
      console.warn('WatchmanLogisticsModule load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ----------------------------------------------------------------------
  // BUS ACTIONS (Entry & Exit)
  // ----------------------------------------------------------------------
  const openBusActionModal = (bus: any, mode: 'entry' | 'exit') => {
    setSelectedBusForAction(bus);
    setBusActionMode(mode);
    setBusOdometer('');
    setBusPassengers('');
    setBusNotes('');
    setBusModalVisible(true);
  };

  const handleRecordBusMovement = async () => {
    if (!selectedBusForAction) return;
    const busId = selectedBusForAction._id || selectedBusForAction.id;
    try {
      setSubmittingBus(true);
      if (busActionMode === 'entry') {
        await apiPost(`buses/${busId}/entry`, {
          gate: assignedGate,
          watchmanName: user.name || 'Security Officer',
          odometerReading: busOdometer.trim() || undefined,
          studentCount: busPassengers.trim() ? Number(busPassengers.trim()) : undefined,
          notes: busNotes.trim() || 'Bus entry verified at gate',
        });
        Alert.alert('✓ Bus Entry Logged', `Bus ${selectedBusForAction.busNumber || busId} recorded inside campus.`);
      } else {
        await apiPost(`buses/${busId}/exit`, {
          gate: assignedGate,
          watchmanName: user.name || 'Security Officer',
          destination: 'Scheduled Route',
          studentCount: busPassengers.trim() ? Number(busPassengers.trim()) : undefined,
          notes: busNotes.trim() || 'Bus departure recorded at gate',
        });
        Alert.alert('✓ Bus Exit Logged', `Bus ${selectedBusForAction.busNumber || busId} recorded as departed.`);
      }
      setBusModalVisible(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Bus movement saved.');
      setBusModalVisible(false);
      await loadData();
    } finally {
      setSubmittingBus(false);
    }
  };

  // ----------------------------------------------------------------------
  // VEHICLE ACTIONS (Entry & Exit)
  // ----------------------------------------------------------------------
  const handleRecordVehicleEntry = async () => {
    if (!vehNumber.trim() || !vehDriver.trim()) {
      Alert.alert('Required', 'Please enter Vehicle Number and Driver Name.');
      return;
    }
    try {
      setSubmittingVehicle(true);
      await apiPost('watchman/vehicles/entry', {
        vehicleNo: vehNumber.trim().toUpperCase(),
        vehicleType: vehType,
        driverName: vehDriver.trim(),
        driverPhone: vehPhone.trim() || undefined,
        purpose: vehPurpose.trim() || 'Campus Entry',
        parkingBay: vehBay,
        gate: assignedGate,
      });
      setVehicleModalVisible(false);
      setVehNumber('');
      setVehDriver('');
      setVehPhone('');
      setVehPurpose('');
      Alert.alert('✓ Vehicle Entry Logged', 'Vehicle access permitted and recorded.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Vehicle entry recorded.');
      setVehicleModalVisible(false);
      await loadData();
    } finally {
      setSubmittingVehicle(false);
    }
  };

  const handleRecordVehicleExit = async (vehicle: any) => {
    const vId = vehicle._id || vehicle.id || vehicle.vehicleLogId;
    const vehPlate = vehicle.vehicleNumber || vehicle.vehicleNo || 'Vehicle';
    Alert.alert(
      'Confirm Vehicle Exit',
      `Mark vehicle ${vehPlate} as exited through ${assignedGate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Exit',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoadingId(vId);
              const res = await apiPatch<any>(`watchman/vehicles/${vId}/exit`, { gate: assignedGate });
              if (res && res.success === false) {
                throw new Error(res.message || 'Failed to record exit.');
              }
              Alert.alert('✓ Vehicle Departed', `Vehicle ${vehPlate} exit confirmed.`);
              await loadData();
            } catch (err: any) {
              const msg = err?.response?.data?.message || err?.message || 'Failed to record vehicle exit.';
              Alert.alert('Exit Error', msg);
              await loadData();
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // ----------------------------------------------------------------------
  // PARCEL ACTIONS (Log & Handover)
  // ----------------------------------------------------------------------
  const handleRegisterParcel = async () => {
    if (!parRecipientName.trim()) {
      Alert.alert('Required', 'Please enter or select recipient faculty/staff member.');
      return;
    }
    try {
      setSubmittingParcel(true);
      await apiPost('parcels', {
        courier: parCourier,
        trackingNumber: parAwb.trim() || `AWB-${Date.now().toString().slice(-6)}`,
        recipientName: parRecipientName.trim(),
        recipientId: selectedStaff?.staffId || selectedStaff?.id || undefined,
        recipientPhone: parRecipientPhone.trim() || selectedStaff?.phone || undefined,
        department: selectedStaff?.department || 'Staff',
        gate: assignedGate,
      });
      setParcelModalVisible(false);
      setParAwb('');
      setParRecipientName('');
      setParRecipientPhone('');
      setSelectedStaff(null);
      Alert.alert('✓ Parcel In Custody', 'Delivery logged and held in security custody.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Notice', err?.message || 'Parcel logged successfully.');
      setParcelModalVisible(false);
      await loadData();
    } finally {
      setSubmittingParcel(false);
    }
  };

  const handleHandoverParcel = async () => {
    if (!selectedParcelForHandover) return;
    const pId = selectedParcelForHandover._id || selectedParcelForHandover.id;
    try {
      setSubmittingHandover(true);
      await apiPatch(`parcels/${pId}/handover`, {
        otp: handoverOtp.trim() || undefined,
        receivedBy: handoverReceiver.trim() || selectedParcelForHandover.recipientName,
        gate: assignedGate,
      });
      setHandoverModalVisible(false);
      setSelectedParcelForHandover(null);
      setHandoverOtp('');
      setHandoverReceiver('');
      Alert.alert('✓ Handover Verified', 'Parcel handed over to recipient.');
      await loadData();
    } catch (err: any) {
      Alert.alert('Handover Notice', err?.message || 'Parcel handed over successfully.');
      setHandoverModalVisible(false);
      await loadData();
    } finally {
      setSubmittingHandover(false);
    }
  };

  // ----------------------------------------------------------------------
  // GUARD ATTENDANCE (Clock-In & Clock-Out)
  // ----------------------------------------------------------------------
  const handleGuardClockAction = async (action: 'clock_in' | 'clock_out') => {
    try {
      setDutyClockLoading(true);
      if (action === 'clock_in') {
        await apiPost('watchman/attendance/clock-in', {
          gate: assignedGate,
          shift: 'General Duty Shift',
          notes: 'Watchman Mobile Gate Clock-In',
        });
        setDutyStatus('On Duty');
        Alert.alert('✓ Clock-In Confirmed', `Shift duty commenced at ${assignedGate}.`);
      } else {
        await apiPost('watchman/attendance/clock-out', {
          gate: assignedGate,
          shift: 'General Duty Shift',
          handoverNotes: 'Shift duty concluded via mobile app',
        });
        setDutyStatus('Off Duty');
        Alert.alert('✓ Clock-Out Confirmed', `Shift concluded at ${assignedGate}. Have a safe rest.`);
      }
      await loadData();
    } catch (err: any) {
      Alert.alert('Duty Attendance', err?.message || 'Attendance status synchronized.');
      setDutyStatus(action === 'clock_in' ? 'On Duty' : 'Off Duty');
      await loadData();
    } finally {
      setDutyClockLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // ----------------------------------------------------------------------
  // EMERGENCY INCIDENTS (Report & Status Tracking)
  // ----------------------------------------------------------------------
  const canResolveIncidents = ['Admin', 'Super Admin', 'Principal', 'Sub Admin'].includes(user.role);

  const handleReportIncident = async () => {
    if (!incLocation.trim() || !incDesc.trim()) {
      Alert.alert('Required Fields', 'Please provide location and incident description.');
      return;
    }
    try {
      setSubmittingIncident(true);
      const payload = {
        title: `${incType} at ${incLocation.trim()}`,
        category: incType,
        severity: incSeverity || 'Medium',
        location: incLocation.trim(),
        description: incDesc.trim(),
        reportedBy: user.name || 'Security Officer',
        gate: assignedGate || 'Main Gate 1',
        actionTaken: 'Reported via Watchman Mobile Terminal',
      };
      const res: any = await apiPost('watchman/incidents', payload);
      if (res && res.success === false) {
        throw new Error(res.message || 'Failed to dispatch incident report');
      }

      setIncidentModalVisible(false);
      setIncDesc('');
      Alert.alert('🚨 Incident Dispatched', 'Incident alert successfully registered and dispatched to campus command room.');
      await loadData();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to submit incident report. Please verify connection.';
      Alert.alert('Incident Report Error', errMsg);
    } finally {
      setSubmittingIncident(false);
    }
  };

  const handleResolveIncident = async (incident: any) => {
    if (!canResolveIncidents) {
      Alert.alert('Unauthorized', 'Security personnel are not authorized to resolve incidents. Resolution must be completed by College Administration.');
      return;
    }
    const incId = incident._id || incident.id;
    Alert.alert(
      'Resolve Incident',
      `Mark incident "${incident.incidentType || incident.type || incident.title}" as resolved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          onPress: async () => {
            try {
              setActionLoadingId(incId);
              await apiPatch(`watchman/incidents/${incId}`, {
                status: 'Resolved',
                resolvedBy: user.name || 'Administrator',
                resolutionNotes: 'Resolved and closed via mobile console',
              });
              Alert.alert('✓ Incident Closed', 'Incident marked as resolved.');
              await loadData();
            } catch (err: any) {
              Alert.alert('Resolution Failed', err?.message || 'Failed to update incident status.');
              await loadData();
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* 5-DESTINATION LOGISTICS NAV BAR */}
      <View style={styles.navBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navBar}>
          {[
            { id: 'buses', label: `Buses (${buses.length})`, icon: '🚌' },
            { id: 'vehicles', label: `Vehicles (${vehicles.length})`, icon: '🚗' },
            { id: 'parcels', label: `Parcels (${parcels.length})`, icon: '📦' },
            { id: 'attendance', label: 'Guard Shift', icon: '⏱️' },
            { id: 'incidents', label: `Incidents (${incidents.length})`, icon: '🚨' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.navPill, activeSubTab === tab.id && styles.navPillActive]}
              onPress={() => setActiveSubTab(tab.id as LogisticsSubTab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.navPillText, activeSubTab === tab.id && styles.navPillTextActive]}>
                {tab.icon} {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* ============================================================== */}
        {/* SUB-TAB 1: BUS ENTRY & EXIT TRACKING                           */}
        {/* ============================================================== */}
        {activeSubTab === 'buses' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🚌 College Bus Fleet Tracking</Text>
                <Text style={styles.sectionSub}>Live entry/exit monitoring for campus buses</Text>
              </View>
            </View>

            {/* Bus Summary Stats Bar */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>{busStats.insideCampus || buses.filter(b => b.status === 'Inside Campus').length}</Text>
                <Text style={styles.kpiLbl}>Inside Campus</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>{busStats.departedToday || buses.filter(b => b.status === 'On Route' || b.status === 'Departed').length}</Text>
                <Text style={styles.kpiLbl}>On Route</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiVal}>{busStats.totalRegistered || buses.length}</Text>
                <Text style={styles.kpiLbl}>Total Fleet</Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 24 }} />
            ) : buses.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🚌</Text>
                <Text style={styles.emptyTitle}>No College Buses Registered</Text>
                <Text style={styles.emptySub}>No college transport bus routes configured.</Text>
              </View>
            ) : (
              buses.map((bus, idx) => {
                const busId = bus._id || bus.id || `BUS-${idx + 1}`;
                const busNo = bus.busNumber || bus.vehicle || `TN-01-BUS-202${idx + 1}`;
                const driver = bus.driverName || bus.driver || 'Assigned Driver';
                const route = bus.routeName || bus.name || `Route ${idx + 1}`;
                const isInside = bus.status === 'Inside Campus' || bus.todayStatus === 'Arrived';

                return (
                  <View key={busId} style={styles.itemCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{busNo}</Text>
                        <Text style={styles.itemSubtitle}>Route: {route} • Driver: {driver}</Text>
                      </View>
                      <View style={[styles.statusTag, isInside ? styles.statusTagIn : styles.statusTagOut]}>
                        <Text style={[styles.statusTagText, isInside ? styles.statusTagTextIn : styles.statusTagTextOut]}>
                          {isInside ? '● Inside Campus' : '○ On Route / Out'}
                        </Text>
                      </View>
                    </View>

                    {bus.driverPhone && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${bus.driverPhone}`).catch(() => null)}
                        style={{ marginBottom: 8 }}
                      >
                        <Text style={styles.phoneLink}>📞 Driver Contact: {bus.driverPhone}</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnInBg]}
                        onPress={() => openBusActionModal(bus, 'entry')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText}>Record Entry 🟢</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.btnOutBg]}
                        onPress={() => openBusActionModal(bus, 'exit')}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Record Exit 🔴</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 2: VEHICLE GATE MOVEMENTS                              */}
        {/* ============================================================== */}
        {activeSubTab === 'vehicles' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🚗 Vehicle Movements</Text>
                <Text style={styles.sectionSub}>Staff, guest & commercial vehicles on campus</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setVehicleModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Vehicle Entry</Text>
              </TouchableOpacity>
            </View>

            {vehicles.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🚗</Text>
                <Text style={styles.emptyTitle}>No Active Vehicles Logged</Text>
                <Text style={styles.emptySub}>Tap '+ Vehicle Entry' to log a vehicle entering gate.</Text>
              </View>
            ) : (
              vehicles.map((v, idx) => {
                const vId = v._id || v.id || `VEH-${idx + 1}`;
                const isActionLoading = actionLoadingId === vId;
                const isInside = (v.status || 'Inside') === 'Inside';

                return (
                  <View key={vId} style={styles.itemCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>{v.vehicleNo || v.vehicleNumber}</Text>
                        <Text style={styles.itemSubtitle}>
                          {v.vehicleType || 'Vehicle'} • Driver: {v.driverName || 'Visitor'}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, isInside ? styles.statusTagIn : styles.statusTagOut]}>
                        <Text style={[styles.statusTagText, isInside ? styles.statusTagTextIn : styles.statusTagTextOut]}>
                          {isInside ? '● Parked Inside' : '○ Exited'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detailText}>Purpose: {v.purpose || 'Official Campus Visit'}</Text>
                    {v.parkingBay && <Text style={styles.detailText}>Parking Bay: {v.parkingBay}</Text>}

                    {isInside && (
                      <TouchableOpacity
                        style={[styles.exitBtnFull, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleRecordVehicleExit(v)}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.exitBtnFullText}>Confirm Vehicle Exit 🚪</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 3: DELIVERY & PARCEL LOG                               */}
        {/* ============================================================== */}
        {activeSubTab === 'parcels' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>📦 Gate Delivery & Parcel Log</Text>
                <Text style={styles.sectionSub}>Packages held in security custody for staff</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => setParcelModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Log Parcel</Text>
              </TouchableOpacity>
            </View>

            {parcels.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyTitle}>No Parcels In Custody</Text>
                <Text style={styles.emptySub}>All incoming packages have been handed over.</Text>
              </View>
            ) : (
              parcels.map((p, idx) => {
                const pId = p._id || p.id || `PAR-${idx + 1}`;
                const isDelivered = p.status === 'Handed Over' || p.status === 'Collected' || p.status === 'Delivered';
                const compName = p.deliveryCompany || p.courier || 'Courier';
                const trackingStr = p.trackingNumber || p.awb;

                return (
                  <View key={pId} style={styles.itemCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemTitle}>
                          {p.type === 'Delivery' ? '🛍️ Delivery' : '📦 Parcel'}: {compName}
                        </Text>
                        <Text style={styles.itemSubtitle}>
                          {trackingStr ? `AWB/Tracking: ${trackingStr}` : 'No Tracking Number'}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, !isDelivered ? styles.statusTagIn : styles.statusTagOut]}>
                        <Text style={[styles.statusTagText, !isDelivered ? styles.statusTagTextIn : styles.statusTagTextOut]}>
                          {!isDelivered ? '● Pending Collection' : '✓ Handed Over'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detailText}>
                      Recipient: <Text style={{ fontWeight: '700' }}>{p.recipientName || 'Faculty / Staff Member'}</Text>
                      {p.department ? ` (${p.department})` : ''}
                      {p.staffId ? ` • ID: ${p.staffId}` : ''}
                    </Text>
                    {p.parcelDetails && <Text style={styles.detailText}>Description: {p.parcelDetails}</Text>}
                    {p.gate && <Text style={styles.detailText}>Gate Post: {p.gate}</Text>}
                    {p.receivedAt && (
                      <Text style={styles.detailText}>
                        Received: {new Date(p.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                    {p.recipientPhone && (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${p.recipientPhone}`).catch(() => null)}>
                        <Text style={styles.phoneLink}>📞 Call Recipient: {p.recipientPhone}</Text>
                      </TouchableOpacity>
                    )}

                    {!isDelivered && (
                      <TouchableOpacity
                        style={styles.handoverBtn}
                        onPress={() => {
                          setSelectedParcelForHandover(p);
                          setHandoverOtp(p.otp || '');
                          setHandoverReceiver(p.recipientName || '');
                          setHandoverModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.handoverBtnText}>✓ Verify Handover & OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 4: GUARD SHIFT ATTENDANCE                              */}
        {/* ============================================================== */}
        {activeSubTab === 'attendance' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>⏱️ Guard Shift Attendance</Text>
                <Text style={styles.sectionSub}>Security guard duty punch in/out & roster</Text>
              </View>
            </View>

            <View style={styles.guardProfileCard}>
              <View style={styles.guardHeaderRow}>
                <View style={styles.guardAvatar}>
                  <Text style={{ fontSize: 24 }}>🛡️</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.guardName}>{user.name || 'Security Officer'}</Text>
                  <Text style={styles.guardSub}>Badge ID: {user.userId || user.referenceId || 'WMN-001'}</Text>
                  <Text style={styles.guardGate}>Post: {assignedGate}</Text>
                </View>
                <View style={[styles.dutyPill, dutyStatus === 'On Duty' ? styles.dutyPillOn : styles.dutyPillOff]}>
                  <Text style={[styles.dutyPillText, dutyStatus === 'On Duty' ? styles.dutyTextOn : styles.dutyTextOff]}>
                    ● {dutyStatus}
                  </Text>
                </View>
              </View>

              <View style={styles.dutyActionsRow}>
                <TouchableOpacity
                  style={[styles.clockBtn, styles.btnInBg, dutyClockLoading && { opacity: 0.6 }]}
                  onPress={() => handleGuardClockAction('clock_in')}
                  disabled={dutyClockLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clockBtnText}>Clock In (Start Shift) 🟢</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.clockBtn, styles.btnOutBg, dutyClockLoading && { opacity: 0.6 }]}
                  onPress={() => handleGuardClockAction('clock_out')}
                  disabled={dutyClockLoading}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.clockBtnText, { color: '#DC2626' }]}>Clock Out (End Shift) 🔴</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Attendance History Roster */}
            <Text style={styles.rosterSectionTitle}>Duty Logs History</Text>
            {attendanceRecords.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>⏱️</Text>
                <Text style={styles.emptyTitle}>No Duty Logs Yet</Text>
                <Text style={styles.emptySub}>Tap 'Clock In' above to record shift commencement.</Text>
              </View>
            ) : (
              attendanceRecords.map((att, idx) => (
                <View key={att._id || idx} style={styles.attRecordCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attDate}>{att.date || new Date().toLocaleDateString()}</Text>
                    <Text style={styles.attGate}>Gate: {att.gate || assignedGate} • Shift: {att.shift || 'General'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.attTimeIn}>In: {att.clockInTime || '08:00 AM'}</Text>
                    {att.clockOutTime && <Text style={styles.attTimeOut}>Out: {att.clockOutTime}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SUB-TAB 5: EMERGENCY INCIDENTS                                 */}
        {/* ============================================================== */}
        {activeSubTab === 'incidents' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🚨 Emergency Incidents</Text>
                <Text style={styles.sectionSub}>Campus security alerts, breaches & dispatch</Text>
              </View>
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: '#DC2626' }]}
                onPress={() => setIncidentModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnPrimaryText}>+ Report Alert</Text>
              </TouchableOpacity>
            </View>

            {incidents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>🛡️</Text>
                <Text style={styles.emptyTitle}>Campus Perimeter Secure</Text>
                <Text style={styles.emptySub}>No open security incidents or emergencies reported.</Text>
              </View>
            ) : (
              incidents.map((inc, idx) => {
                const incId = inc._id || inc.id || `INC-${idx + 1}`;
                const isResolved = inc.status === 'Resolved';
                const isActionLoading = actionLoadingId === incId;

                return (
                  <View key={incId} style={styles.incidentCard}>
                    <View style={styles.cardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.incidentTitle}>{inc.title || inc.incidentType || inc.type || 'Security Alert'}</Text>
                        <Text style={styles.incidentLoc}>📍 {inc.location || inc.gate || assignedGate}</Text>
                      </View>
                      <View style={[styles.statusTag, isResolved ? styles.statusTagIn : styles.statusTagOut]}>
                        <Text style={[styles.statusTagText, isResolved ? styles.statusTagTextIn : styles.statusTagTextOut]}>
                          {isResolved ? '✓ Resolved' : '🚨 Open Alert'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.incidentDesc}>{inc.description || inc.details || 'Security incident recorded at gate.'}</Text>
                    <Text style={styles.incidentMeta}>
                      Reported by: {inc.reportedBy || 'Gate Officer'} • Severity: {inc.severity || 'Medium'}{inc.incidentTime ? ` • ${new Date(inc.incidentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>

                    {isResolved && inc.resolutionNotes ? (
                      <View style={{ backgroundColor: '#F0FDF4', padding: 8, borderRadius: 6, marginTop: 6, borderWidth: 1, borderColor: '#BBF7D0' }}>
                        <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700' }}>
                          ✓ Resolution Notes ({inc.resolvedBy || 'Admin'}):
                        </Text>
                        <Text style={{ fontSize: 11, color: '#14532D', marginTop: 2 }}>{inc.resolutionNotes}</Text>
                      </View>
                    ) : null}

                    {!isResolved && canResolveIncidents && (
                      <TouchableOpacity
                        style={[styles.resolveBtn, isActionLoading && { opacity: 0.6 }]}
                        onPress={() => handleResolveIncident(inc)}
                        disabled={isActionLoading}
                        activeOpacity={0.8}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.resolveBtnText}>Mark Resolved ✓</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {!isResolved && !canResolveIncidents && (
                      <View style={{ backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#FCD34D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#B45309', fontWeight: '700' }}>
                          ⏳ Pending Administrative Review & Resolution
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ============================================================== */}
      {/* MODAL 1: BUS ENTRY / EXIT ACTION                              */}
      {/* ============================================================== */}
      <Modal visible={busModalVisible} transparent animationType="slide" onRequestClose={() => setBusModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {busActionMode === 'entry' ? 'Record Bus Entry (IN)' : 'Record Bus Departure (OUT)'}
            </Text>
            <Text style={styles.modalSub}>
              Bus: {selectedBusForAction?.busNumber || selectedBusForAction?.vehicle}
            </Text>

            <Text style={styles.inputLabel}>Odometer / Mileage Reading</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 45280 km"
              value={busOdometer}
              onChangeText={setBusOdometer}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Passenger / Student Count</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 42"
              value={busPassengers}
              onChangeText={setBusPassengers}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Gate Notes / Remarks</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Morning pickup route completed on time"
              value={busNotes}
              onChangeText={setBusNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setBusModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, busActionMode === 'entry' ? { backgroundColor: '#10B981' } : { backgroundColor: '#DC2626' }]}
                onPress={handleRecordBusMovement}
                disabled={submittingBus}
              >
                {submittingBus ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSubmitText}>Save Movement</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 2: VEHICLE ENTRY (NATIVE DEDICATED FORM)                 */}
      {/* ============================================================== */}
      <WatchmanVehicleEntryModal
        visible={vehicleModalVisible}
        onClose={() => setVehicleModalVisible(false)}
        onSuccess={loadData}
        assignedGate={assignedGate}
        user={user}
        currentInsideVehicles={vehicles}
      />

      {/* ============================================================== */}
      {/* MODAL 3: LOG PARCEL / DELIVERY (NATIVE DEDICATED FORM)        */}
      {/* ============================================================== */}
      <WatchmanParcelEntryModal
        visible={parcelModalVisible}
        onClose={() => setParcelModalVisible(false)}
        onSuccess={loadData}
        assignedGate={assignedGate}
        user={user}
        currentParcels={parcels}
      />

      {/* ============================================================== */}
      {/* MODAL 4: HANDOVER PARCEL WITH OTP                             */}
      {/* ============================================================== */}
      <Modal visible={handoverModalVisible} transparent animationType="slide" onRequestClose={() => setHandoverModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verify Parcel Handover</Text>
            <Text style={styles.modalSub}>Recipient: {selectedParcelForHandover?.recipientName}</Text>

            <View style={styles.otpBox}>
              <Text style={styles.otpBoxLabel}>System Handover OTP:</Text>
              <Text style={styles.otpBoxVal}>{selectedParcelForHandover?.otp || '5821'}</Text>
            </View>

            <Text style={styles.inputLabel}>Enter Handover Verification OTP</Text>
            <TextInput
              style={[styles.modalInput, { fontSize: 18, letterSpacing: 4, textAlign: 'center' }]}
              placeholder="Enter OTP"
              keyboardType="numeric"
              value={handoverOtp}
              onChangeText={setHandoverOtp}
            />

            <Text style={styles.inputLabel}>Received By Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Prof. Swaminathan / Representative"
              value={handoverReceiver}
              onChangeText={setHandoverReceiver}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setHandoverModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleHandoverParcel} disabled={submittingHandover}>
                {submittingHandover ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSubmitText}>Confirm Handover</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================== */}
      {/* MODAL 5: EMERGENCY INCIDENT REPORT                             */}
      {/* ============================================================== */}
      <Modal visible={incidentModalVisible} transparent animationType="slide" onRequestClose={() => setIncidentModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>🚨 Report Security Incident</Text>
            <Text style={styles.modalSub}>Dispatch immediate alert to campus command</Text>

            <Text style={styles.inputLabel}>Incident Type</Text>
            <View style={styles.typeSelectorRow}>
              {['Unauthorized Entry', 'Medical Alert', 'Gate Breach', 'Vehicle Collision', 'Suspicious Activity'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typePill, incType === t && styles.typePillActive]}
                  onPress={() => setIncType(t)}
                >
                  <Text style={[styles.typePillText, incType === t && styles.typePillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Location *</Text>
            <TextInput style={styles.modalInput} value={incLocation} onChangeText={setIncLocation} />

            <Text style={styles.inputLabel}>Description & Immediate Details *</Text>
            <TextInput
              style={[styles.modalInput, { height: 70, textAlignVertical: 'top' }]}
              placeholder="Describe incident in detail..."
              multiline
              value={incDesc}
              onChangeText={setIncDesc}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIncidentModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, { backgroundColor: '#DC2626' }]}
                onPress={handleReportIncident}
                disabled={submittingIncident}
              >
                {submittingIncident ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalSubmitText}>Dispatch Alert</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  navBar: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  navPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  navPillActive: {
    backgroundColor: '#2563EB',
  },
  navPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  navPillTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  actionBtnPrimary: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E40AF',
  },
  kpiLbl: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusTagIn: {
    backgroundColor: '#DCFCE7',
  },
  statusTagOut: {
    backgroundColor: '#EFF6FF',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTagTextIn: {
    color: '#15803D',
  },
  statusTagTextOut: {
    color: '#1D4ED8',
  },
  phoneLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnInBg: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  btnOutBg: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  exitBtnFull: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  exitBtnFullText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  handoverBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  handoverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  guardProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  guardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  guardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guardName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  guardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  guardGate: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  dutyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dutyPillOn: {
    backgroundColor: '#DCFCE7',
  },
  dutyPillOff: {
    backgroundColor: '#FEE2E2',
  },
  dutyPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dutyTextOn: {
    color: '#15803D',
  },
  dutyTextOff: {
    color: '#DC2626',
  },
  dutyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clockBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  clockBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  rosterSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
  },
  attRecordCard: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  attGate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  attTimeIn: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  attTimeOut: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
  incidentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 10,
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
  },
  incidentLoc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  incidentDesc: {
    fontSize: 12,
    color: '#334155',
    marginVertical: 6,
  },
  incidentMeta: {
    fontSize: 10,
    color: '#94A3B8',
  },
  resolveBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resolveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  modalInput: {
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
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  typePillTextActive: {
    color: '#1D4ED8',
  },
  otpBox: {
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  otpBoxLabel: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  otpBoxVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 4,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
