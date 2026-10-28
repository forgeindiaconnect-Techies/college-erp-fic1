import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, apiPost, type MobileUser } from '../../services/api';
import WatchmanRegisterPersonModal from './WatchmanRegisterPersonModal';

interface Props {
  user?: MobileUser;
  assignedGate?: string;
  stats?: {
    studentsInside: number;
    todayTotalStudents: number;
    todayCheckedOutStudents: number;
    staffInside: number;
    visitorsInside: number;
    todayTotalVisitors: number;
    expectedVisitors: number;
    pendingApprovals: number;
    vehiclesInside: number;
    parcelsAtGate: number;
    openIncidents: number;
    busStats?: {
      totalRegistered: number;
      insideCampus: number;
      departedToday: number;
      notArrivedToday: number;
    };
  };
  movements?: any[];
  officer?: {
    name: string;
    badgeId: string;
    gate: string;
    shift: string;
    shiftStatus: string;
  };
  onNavigateTab?: (tab: 'home' | 'academics' | 'referrals' | 'notifications' | 'profile') => void;
  onNavigateGate?: () => void;
  onNavigateVisitors?: () => void;
  onNavigateLogistics?: () => void;
  onRefresh?: () => void;
}

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)',
];

const PERSON_TYPES = ['Student', 'Staff', 'Visitor', 'Contractor', 'Vendor'];

export default function WatchmanCommandCenter({
  user,
  assignedGate = 'Gate 1 (Main Entrance)',
  stats: propsStats,
  movements: propsMovements,
  officer: propsOfficer,
  onNavigateTab,
  onNavigateGate,
  onNavigateVisitors,
  onNavigateLogistics,
  onRefresh: propsOnRefresh,
}: Props) {
  // Self-managed state if not supplied via props
  const [internalStats, setInternalStats] = useState({
    studentsInside: 0,
    todayTotalStudents: 0,
    todayCheckedOutStudents: 0,
    staffInside: 0,
    visitorsInside: 0,
    todayTotalVisitors: 0,
    expectedVisitors: 0,
    pendingApprovals: 0,
    vehiclesInside: 0,
    parcelsAtGate: 0,
    openIncidents: 0,
    busStats: {
      totalRegistered: 0,
      insideCampus: 0,
      departedToday: 0,
      notArrivedToday: 0,
    },
  });
  const [internalMovements, setInternalMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const stats = propsStats || internalStats;
  const movements = propsMovements || internalMovements;
  const officer = propsOfficer || {
    name: user?.name || 'Security Officer',
    badgeId: user?.userId || user?.referenceId || 'WMN-001',
    gate: assignedGate,
    shift: 'General Duty Shift',
    shiftStatus: 'On Duty',
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, movesRes, busesRes] = await Promise.allSettled([
        apiGet<any>('watchman/stats'),
        apiGet<any>('watchman/campus-movements'),
        apiGet<any>('buses/stats'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const raw = statsRes.value?.data || statsRes.value;
        setInternalStats((prev) => ({ ...prev, ...raw }));
      }
      if (busesRes.status === 'fulfilled' && busesRes.value?.data) {
        setInternalStats((prev) => ({ ...prev, busStats: busesRes.value.data }));
      }
      if (movesRes.status === 'fulfilled' && movesRes.value) {
        const raw = Array.isArray(movesRes.value?.data) ? movesRes.value.data : Array.isArray(movesRes.value) ? movesRes.value : [];
        setInternalMovements(raw);
      }
    } catch (err) {
      console.warn('Command Center load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!propsStats || !propsMovements) {
      loadData();
    }
  }, [propsStats, propsMovements, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    if (propsOnRefresh) {
      propsOnRefresh();
      setRefreshing(false);
    } else {
      loadData();
    }
  };

  const handleNavigate = (tab: 'home' | 'academics' | 'referrals' | 'notifications' | 'profile') => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else if (tab === 'academics' && onNavigateGate) {
      onNavigateGate();
    } else if (tab === 'referrals' && onNavigateVisitors) {
      onNavigateVisitors();
    } else if (tab === 'notifications' && onNavigateLogistics) {
      onNavigateLogistics();
    }
  };

  // Movement view filters
  const [directionFilter, setDirectionFilter] = useState<'All' | 'In' | 'Out'>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Register Person & Gate Pass Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Quick In / Out Action Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionPersonId, setActionPersonId] = useState('');
  const [actionType, setActionType] = useState<'In' | 'Out'>('In');
  const [actionGate, setActionGate] = useState(officer.gate || GATES[0]);
  const [actionRemarks, setActionRemarks] = useState('');
  const [actionVehicle, setActionVehicle] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Filtered Movements
  const filteredMovements = movements.filter((m) => {
    if (directionFilter !== 'All') {
      const dir = (m.direction || '').toUpperCase();
      if (directionFilter === 'In' && dir !== 'IN') return false;
      if (directionFilter === 'Out' && dir !== 'OUT') return false;
    }
    if (roleFilter !== 'All') {
      const pType = (m.personType || '').toLowerCase();
      if (pType !== roleFilter.toLowerCase()) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const n = (m.name || '').toLowerCase();
      const id = (m.personId || m.id || '').toLowerCase();
      const g = (m.gate || '').toLowerCase();
      if (!n.includes(q) && !id.includes(q) && !g.includes(q)) return false;
    }
    return true;
  });


  // Handle Quick In / Out
  const handleQuickMovement = async () => {
    if (!actionPersonId.trim()) {
      Alert.alert('Required Field', 'Please enter Student Roll #, Staff Code, or Person ID.');
      return;
    }
    try {
      setActionSubmitting(true);
      const endpoint = actionType === 'In' ? 'watchman/campus-in' : 'watchman/campus-out';
      const payload: any = {
        personId: actionPersonId.trim(),
        gate: actionGate,
        remarks: actionRemarks.trim() || `${actionType} verified at gate`,
      };
      if (actionType === 'In' && actionVehicle.trim()) {
        payload.vehicleNumber = actionVehicle.trim();
      }

      await apiPost(endpoint, payload);
      Alert.alert(
        'Movement Logged',
        `Campus ${actionType.toUpperCase()} recorded for ${actionPersonId.trim()} at ${actionGate}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setActionModalOpen(false);
              setActionPersonId('');
              setActionRemarks('');
              setActionVehicle('');
              onRefresh();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Gate Notice', err?.message || `Failed to record campus ${actionType}.`);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 1. Command Center Gate Header Card */}
      <View style={styles.headerBanner}>
        <View style={styles.headerRow}>
          <View style={styles.gateShield}>
            <Text style={{ fontSize: 24 }}>🛡️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle}>Gate Command Center</Text>
            <Text style={styles.headerSubtitle}>{officer.gate} • {officer.shift}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>● {officer.shiftStatus}</Text>
          </View>
        </View>

        {/* Quick KPI Row */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity
            style={[styles.kpiCard, { borderLeftColor: '#2563EB' }]}
            activeOpacity={0.8}
            onPress={() => handleNavigate('academics')}
          >
            <Text style={styles.kpiNum}>{stats.studentsInside || 0}</Text>
            <Text style={styles.kpiLabel}>Students In</Text>
            <Text style={styles.kpiSub}>Total Today: {stats.todayTotalStudents || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { borderLeftColor: '#7C3AED' }]}
            activeOpacity={0.8}
            onPress={() => handleNavigate('academics')}
          >
            <Text style={[styles.kpiNum, { color: '#7C3AED' }]}>{stats.staffInside || 0}</Text>
            <Text style={styles.kpiLabel}>Staff Inside</Text>
            <Text style={styles.kpiSub}>Active Campus</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { borderLeftColor: '#059669' }]}
            activeOpacity={0.8}
            onPress={() => handleNavigate('referrals')}
          >
            <Text style={[styles.kpiNum, { color: '#059669' }]}>{stats.visitorsInside || 0}</Text>
            <Text style={styles.kpiLabel}>Active Guests</Text>
            <Text style={styles.kpiSub}>Total: {stats.todayTotalVisitors || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.kpiCard, { borderLeftColor: '#D97706' }]}
            activeOpacity={0.8}
            onPress={() => handleNavigate('notifications')}
          >
            <Text style={[styles.kpiNum, { color: '#D97706' }]}>{stats.vehiclesInside || 0}</Text>
            <Text style={styles.kpiLabel}>Vehicles In</Text>
            <Text style={styles.kpiSub}>Buses: {stats.busStats?.insideCampus || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Primary Fast Action Row */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Gate Control Actions</Text>
      </View>
      <View style={styles.quickActionRow}>
        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#10B981' }]}
          activeOpacity={0.8}
          onPress={() => {
            setActionType('In');
            setActionModalOpen(true);
          }}
        >
          <Text style={styles.quickActionIcon}>📥</Text>
          <Text style={styles.quickActionText}>Campus IN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#EF4444' }]}
          activeOpacity={0.8}
          onPress={() => {
            setActionType('Out');
            setActionModalOpen(true);
          }}
        >
          <Text style={styles.quickActionIcon}>📤</Text>
          <Text style={styles.quickActionText}>Campus OUT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#2563EB' }]}
          activeOpacity={0.8}
          onPress={() => setRegisterModalOpen(true)}
        >
          <Text style={styles.quickActionIcon}>👤</Text>
          <Text style={styles.quickActionText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickActionBtn, { backgroundColor: '#4F46E5' }]}
          activeOpacity={0.8}
          onPress={() => handleNavigate('academics')}
        >
          <Text style={styles.quickActionIcon}>📷</Text>
          <Text style={styles.quickActionText}>QR Scan</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Live Campus Movement Feed */}
      <View style={styles.feedCard}>
        <View style={styles.feedHeaderRow}>
          <View>
            <Text style={styles.feedTitle}>Campus In / Out Control</Text>
            <Text style={styles.feedSubtitle}>Today's live gate crossings and verifications</Text>
          </View>
          <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Text style={styles.refreshIconText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search commuter name, ID, or gate..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        {/* Direction Filter Pills */}
        <View style={styles.filterPillsRow}>
          {(['All', 'In', 'Out'] as const).map((dir) => (
            <TouchableOpacity
              key={dir}
              style={[styles.filterPill, directionFilter === dir && styles.filterPillActive]}
              onPress={() => setDirectionFilter(dir)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, directionFilter === dir && styles.filterPillTextActive]}>
                {dir === 'All' ? 'All Movements' : dir === 'In' ? '📥 Entry (IN)' : '📤 Exit (OUT)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Role Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['All', 'Student', 'Staff', 'Visitor', 'Contractor'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.rolePill, roleFilter === role && styles.rolePillActive]}
              onPress={() => setRoleFilter(role)}
              activeOpacity={0.7}
            >
              <Text style={[styles.rolePillText, roleFilter === role && styles.rolePillTextActive]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Movement Items List */}
        {filteredMovements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 32 }}>🛡️</Text>
            <Text style={styles.emptyTitle}>No gate movements found</Text>
            <Text style={styles.emptySubtitle}>Log an Entry or Exit using the buttons above.</Text>
          </View>
        ) : (
          filteredMovements.slice(0, 20).map((m, idx) => {
            const isEntry = (m.direction || '').toUpperCase() === 'IN';
            return (
              <View key={m.id || idx} style={styles.movementItem}>
                <View style={[styles.directionBadge, isEntry ? styles.dirBadgeIn : styles.dirBadgeOut]}>
                  <Text style={styles.dirBadgeText}>{isEntry ? 'IN' : 'OUT'}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.commuterName}>{m.name}</Text>
                    <Text style={styles.movementTime}>{m.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={styles.commuterMeta}>{m.personType || 'Commuter'} • {m.gate || 'Gate 1'}</Text>
                  </View>
                  {m.remarks ? <Text style={styles.movementRemarks}>📝 {m.remarks}</Text> : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 4. MODAL: Register Student / Staff / HOD / Visitor with Instant Gate QR Pass */}
      <WatchmanRegisterPersonModal
        visible={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        user={user || ({ name: officer.name } as any)}
        assignedGate={officer.gate}
        onNavigateScanner={() => {
          setRegisterModalOpen(false);
          handleNavigate('academics');
        }}
        onNavigateVisitors={() => {
          setRegisterModalOpen(false);
          handleNavigate('referrals');
        }}
        onRegistrationSuccess={onRefresh}
      />

      {/* 5. MODAL: Quick Campus In / Out */}
      <Modal visible={actionModalOpen} transparent animationType="slide" onRequestClose={() => setActionModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeaderTitle}>Record Campus {actionType.toUpperCase()}</Text>
            <Text style={styles.modalHeaderSubtitle}>Quick ID verification and gate logging</Text>

            <Text style={styles.fieldLabel}>Person ID / Roll # / Staff Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS2022001 or STF008"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={actionPersonId}
              onChangeText={setActionPersonId}
            />

            <Text style={styles.fieldLabel}>Gate Checkpost</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {GATES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.typeSelectBtn, actionGate === g && styles.typeSelectBtnActive]}
                  onPress={() => setActionGate(g)}
                >
                  <Text style={[styles.typeSelectText, actionGate === g && styles.typeSelectTextActive]}>
                    {g.split(' ')[0] + ' ' + g.split(' ')[1]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {actionType === 'In' ? (
              <>
                <Text style={styles.fieldLabel}>Vehicle Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. TN-01-AB-1234"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="characters"
                  value={actionVehicle}
                  onChangeText={setActionVehicle}
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Movement Remarks / Purpose (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Regular Entry, Outpass, Lunch, Duty"
              placeholderTextColor="#94A3B8"
              value={actionRemarks}
              onChangeText={setActionRemarks}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setActionModalOpen(false)}
                disabled={actionSubmitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  actionType === 'Out' && { backgroundColor: '#EF4444' },
                  actionSubmitting && styles.submitBtnDisabled,
                ]}
                onPress={handleQuickMovement}
                disabled={actionSubmitting}
              >
                {actionSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Confirm {actionType} ✓</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Register Person Modal */}
      <WatchmanRegisterPersonModal
        visible={registerModalOpen}
        user={user}
        defaultGate={assignedGate}
        initialPersonType="Student"
        allowedPersonTypes={['Student', 'Staff', 'HOD']}
        onClose={() => setRegisterModalOpen(false)}
        onRegistrationSuccess={(_person) => {
          loadData();
        }}
        onNavigateScanner={(_code) => {
          setRegisterModalOpen(false);
          handleNavigate('academics');
        }}
        onNavigateVisitors={() => {
          setRegisterModalOpen(false);
          handleNavigate('referrals');
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  gateShield: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  kpiNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 20,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    marginTop: 4,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  feedSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  refreshIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIconText: {
    fontSize: 14,
  },
  searchInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  rolePillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  rolePillText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  rolePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  directionBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirBadgeIn: {
    backgroundColor: '#DCFCE7',
  },
  dirBadgeOut: {
    backgroundColor: '#FEE2E2',
  },
  dirBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#15803D',
  },
  commuterName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  movementTime: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  commuterMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  movementRemarks: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 12,
  },
  typeSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeSelectBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  typeSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  typeSelectTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
