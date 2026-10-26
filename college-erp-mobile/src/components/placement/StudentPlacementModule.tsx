import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiGet, apiPost, storage, type MobileUser } from '../../services/api';
import PlacementStageModal from './PlacementStageModal';

export type StudentPlacementModuleProps = {
  user: MobileUser;
  studentProfile?: {
    id: string;
    name: string;
    rollNo: string;
    dept: string;
    department?: string;
    cgpa?: number;
    arrears?: number;
    attendance?: string | number;
    [key: string]: any;
  };
  onNavigateToMarks?: () => void;
  onRefreshParent?: () => void;
};

export default function StudentPlacementModule({
  user,
  studentProfile,
  onNavigateToMarks,
  onRefreshParent,
}: StudentPlacementModuleProps) {
  const [activeTab, setActiveTab] = useState<'drives' | 'applications' | 'interviews' | 'eligibility' | 'guidelines'>('drives');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Stage Modal
  const [stageModalJob, setStageModalJob] = useState<any | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const [studentRecord, setStudentRecord] = useState<any | null>(null);

  const resolvedStudentId = String(studentProfile?.id || studentProfile?.rollNo || user.referenceId || user.studentId || user.userId || user._id || '').trim();
  const resolvedStudentName = String(studentProfile?.name || user.name || '').trim();
  const studentDept = studentProfile?.dept || studentProfile?.department || user.department || 'General';

  // Load Real Placement Data using authorized endpoints
  const loadPlacementData = useCallback(async () => {
    try {
      const [jobsRes, appsRes, intRes, selRes, marksRes, attRes, studentRes] = await Promise.all([
        apiGet<any[]>('placement/jobs').catch(() => []),
        apiGet<any[]>('placement/applications').catch(() => []),
        apiGet<any[]>('placement/interviews').catch(() => []),
        apiGet<any[]>('placement/selections').catch(() => []),
        resolvedStudentId ? apiGet<any[]>(`marks/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        resolvedStudentId ? apiGet<any[]>(`attendance/student/${encodeURIComponent(resolvedStudentId)}`).catch(() => []) : [],
        resolvedStudentId ? apiGet<any>(`students/${encodeURIComponent(resolvedStudentId)}`).catch(() => null) : null,
      ]);

      // 1. Process Jobs from API and cross-platform cached storage
      const rawJobs = Array.isArray(jobsRes) ? jobsRes : (jobsRes as any)?.jobs || [];
      const jobMap = new Map<string, any>();
      rawJobs.forEach((j: any) => {
        const id = String(j._id || j.jobId || j.id || '');
        if (id) jobMap.set(id, j);
      });

      // Synchronize with cross-platform offline / local storage
      try {
        const cachedRaw = await storage.getItem('erp_placement_jobs');
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (Array.isArray(parsed)) {
            parsed.forEach((j: any) => {
              const id = String(j._id || j.jobId || j.id || '');
              if (id && !jobMap.has(id)) jobMap.set(id, j);
            });
          }
        }
      } catch {}

      const userTenant = user.tenantId || user.collegeId;
      if (userTenant) {
        try {
          const tenantCached = await storage.getItem(`erp_placement_jobs_${userTenant}`);
          if (tenantCached) {
            const parsed = JSON.parse(tenantCached);
            if (Array.isArray(parsed)) {
              parsed.forEach((j: any) => {
                const id = String(j._id || j.jobId || j.id || '');
                if (id && !jobMap.has(id)) jobMap.set(id, j);
              });
            }
          }
        } catch {}
      }

      // If running on web browser, scan all localStorage keys starting with erp_placement_jobs
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('erp_placement_jobs')) {
              const localItems = JSON.parse(localStorage.getItem(key) || '[]');
              if (Array.isArray(localItems)) {
                localItems.forEach((j: any) => {
                  const id = String(j._id || j.jobId || j.id || '');
                  if (id && !jobMap.has(id)) jobMap.set(id, j);
                });
              }
            }
          }
        } catch {}
      }

      const mergedJobs = Array.from(jobMap.values());
      setJobs(mergedJobs);

      // 2. Student Record
      const sDoc = (studentRes && typeof studentRes === 'object' && !Array.isArray(studentRes)) ? (studentRes.data || studentRes) : null;
      if (sDoc) setStudentRecord(sDoc);

      // 3. Process Marks & Arrears
      const rawMarks = Array.isArray(marksRes) ? marksRes : (marksRes as any)?.marks || [];
      setMarks(rawMarks);

      // 4. Process Attendance
      const rawAtt = Array.isArray(attRes) ? attRes : (attRes as any)?.attendance || [];
      setAttendanceRecords(rawAtt);

      // 5. Process Applications for this student
      const rawApps = Array.isArray(appsRes) ? appsRes : (appsRes as any)?.applications || [];
      const myApps = rawApps.filter((app: any) => {
        const aId = String(app.studentId?._id || app.studentId || '').toLowerCase();
        const aReg = String(app.regNo || '').toLowerCase();
        const aName = String(app.student || '').toLowerCase();
        const targetId = resolvedStudentId.toLowerCase();
        const targetName = resolvedStudentName.toLowerCase();
        return (
          (aId && targetId && (aId === targetId || aId.includes(targetId))) ||
          (aReg && targetId && (aReg === targetId || aReg.includes(targetId))) ||
          (aName && targetName && (aName === targetName || aName.includes(targetName) || targetName.includes(aName)))
        );
      });
      setApplications(myApps);

      // 6. Process Interviews (Campus-wide & drive-matched interviews)
      const rawInt = Array.isArray(intRes) ? intRes : (intRes as any)?.interviews || [];
      setInterviews(rawInt);

      // 7. Process Selections / Offers
      const rawSel = Array.isArray(selRes) ? selRes : (selRes as any)?.selections || [];
      const mySel = rawSel.filter((s: any) => {
        const sReg = String(s.regNo || '').toLowerCase();
        const sName = String(s.student || s.studentName || '').toLowerCase();
        const targetId = resolvedStudentId.toLowerCase();
        const targetName = resolvedStudentName.toLowerCase();
        return (
          (sReg && targetId && sReg === targetId) ||
          (sName && targetName && (sName === targetName || sName.includes(targetName) || targetName.includes(sName)))
        );
      });
      setSelections(mySel);

    } catch (err) {
      console.error('Error loading mobile placement data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedStudentId, resolvedStudentName]);

  useEffect(() => {
    loadPlacementData();

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleSync = () => {
        loadPlacementData();
      };
      window.addEventListener('erp_placement_updated', handleSync);
      window.addEventListener('storage', handleSync);
      return () => {
        window.removeEventListener('erp_placement_updated', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }
  }, [loadPlacementData]);

  // Immediately refresh when switching to drives tab to ensure new jobs reflect
  useEffect(() => {
    if (activeTab === 'drives') {
      loadPlacementData();
    }
  }, [activeTab, loadPlacementData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlacementData();
    if (onRefreshParent) onRefreshParent();
  };

  // Live Computed Academic Metrics strictly from DB
  const computedMetrics = useMemo(() => {
    const sDoc = studentRecord || studentProfile;
    let cgpa = Number(sDoc?.cgpa ?? 0);
    let arrears = Number(sDoc?.arrears ?? 0);
    let failedCourses: any[] = [];

    if (marks.length > 0) {
      const gpas = marks
        .map((m: any) => {
          const rawTotal = m.totalMarks ?? ((m.internalMarks !== undefined || m.semesterMarks !== undefined) ? Number(m.internalMarks || 0) + Number(m.semesterMarks || 0) : m.marksObtained);
          const tot = Number(rawTotal ?? 0);
          return Number(m.cgpa || m.gpa || (tot > 0 ? (tot / 10).toFixed(2) : 0));
        })
        .filter((g: number) => g > 0);

      if (gpas.length > 0) {
        cgpa = Number((gpas.reduce((a: number, b: number) => a + b, 0) / gpas.length).toFixed(2));
      }

      failedCourses = marks.filter((m: any) => {
        const rawTotal = m.totalMarks ?? ((m.internalMarks !== undefined || m.semesterMarks !== undefined) ? Number(m.internalMarks || 0) + Number(m.semesterMarks || 0) : m.marksObtained);
        const tot = Number(rawTotal ?? 0);
        return m.arrearStatus === 'Arrear' || (m.totalMarks !== undefined && tot < 40);
      });
      if (failedCourses.length > 0) {
        arrears = failedCourses.length;
      }
    }

    let attendancePct = 100;
    if (attendanceRecords.length > 0) {
      const presents = attendanceRecords.filter((a: any) => ['Present', 'Late'].includes(a.status)).length;
      attendancePct = Math.round((presents / attendanceRecords.length) * 100);
    } else if (sDoc?.attendance !== undefined) {
      const num = parseInt(String(sDoc.attendance).replace('%', '').trim());
      attendancePct = isNaN(num) ? 0 : num;
    }

    const isEligible = cgpa >= 6.0 && arrears === 0 && attendancePct >= 75;

    return {
      cgpa,
      arrears,
      attendance: attendancePct,
      failedCourses,
      isEligible,
    };
  }, [marks, attendanceRecords, studentRecord, studentProfile]);

  // Handle Apply
  const handleApply = async (job: any) => {
    const jobId = String(job._id || job.jobId || job.id);
    const company = job.company || job.companyName;
    const role = job.role || job.designation;

    // Check if already applied
    const alreadyApplied = applications.some((a) => {
      const aCompany = String(a.company || '').toLowerCase();
      const aRole = String(a.role || '').toLowerCase();
      return aCompany === company.toLowerCase() && aRole === role.toLowerCase();
    });

    if (alreadyApplied) {
      Alert.alert('Already Applied', `You have already submitted an active application for ${company}.`);
      return;
    }

    // Confirmation dialog
    Alert.alert(
      'Confirm Recruitment Application',
      `Submit your official application for ${company} (${role})?\n\n• Verified CGPA: ${computedMetrics.cgpa}\n• Standing Arrears: ${computedMetrics.arrears}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Apply',
          style: 'default',
          onPress: async () => {
            setApplyingJobId(jobId);
            try {
              const payload = {
                jobId,
                studentId: studentProfile?.id || user.userId || user._id,
                student: studentProfile?.name || user.name || 'Scholar',
                regNo: studentProfile?.rollNo || studentProfile?.id || user.referenceId || 'REG001',
                dept: studentDept,
                cgpa: computedMetrics.cgpa,
                company,
                role,
                status: 'Applied',
                currentRound: 1,
              };

              const newApp = await apiPost<any>('placement/applications', payload);
              setApplications((prev) => [newApp, ...prev.filter(a => a.company !== company)]);

              if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
                try {
                  window.dispatchEvent(new CustomEvent('erp_placement_updated'));
                } catch {}
              }

              showToast(`✓ Application for ${company} submitted successfully!`);
              if (stageModalJob) setStageModalJob(null);
              // Trigger immediate refresh of real-time server records
              loadPlacementData();
              if (onRefreshParent) onRefreshParent();
            } catch (err: any) {
              Alert.alert('Application Failed', err?.message || 'Could not submit application.');
            } finally {
              setApplyingJobId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (j) =>
        (j.company || '').toLowerCase().includes(q) ||
        (j.role || '').toLowerCase().includes(q) ||
        (j.ctc || '').toLowerCase().includes(q)
    );
  }, [jobs, search]);

  return (
    <View style={styles.container}>
      {/* Toast Bar */}
      {Boolean(toastMsg) && (
        <View style={styles.toastCard}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Hero Strip & Live Metric Cards */}
      <View style={styles.heroStripCard}>
        <View style={styles.heroHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroPreTitle}>CAMPUS PLACEMENT CENTER</Text>
            <Text style={styles.heroTitle}>Corporate Recruitment Drives</Text>
            <Text style={styles.heroSubText}>
              Autonomous placement readiness, live applications & stage tracking
            </Text>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Text style={styles.syncBtnText}>🔄 Sync</Text>
          </TouchableOpacity>
        </View>

        {/* Live Metrics Row */}
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#2563EB' }]}>{computedMetrics.cgpa.toFixed(2)}</Text>
            <Text style={styles.metricLabel}>Live CGPA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#059669' }]}>{jobs.length}</Text>
            <Text style={styles.metricLabel}>Active Drives</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#7C3AED' }]}>{applications.length}</Text>
            <Text style={styles.metricLabel}>Applied</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text
              style={[
                styles.metricValue,
                { color: computedMetrics.arrears === 0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {computedMetrics.arrears}
            </Text>
            <Text style={styles.metricLabel}>Arrears</Text>
          </View>
        </View>

        {/* Academic Eligibility Banner */}
        <View
          style={[
            styles.standingPill,
            computedMetrics.isEligible
              ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
              : { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
          ]}
        >
          <Text
            style={[
              styles.standingPillText,
              computedMetrics.isEligible ? { color: '#047857' } : { color: '#B91C1C' },
            ]}
          >
            {computedMetrics.isEligible
              ? '✓ Placement Cleared • Eligible for Campus Recruitment'
              : `⚠️ Placement Notice: ${computedMetrics.arrears} Standing Arrear(s) Pending Clearance`}
          </Text>
          <TouchableOpacity onPress={() => setActiveTab('eligibility')}>
            <Text style={styles.standingPillLink}>Details →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Segment Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsContainer}>
        {[
          { id: 'drives', label: `Drives (${jobs.length})`, icon: '🏢' },
          { id: 'applications', label: `My Applications (${applications.length})`, icon: '📋' },
          { id: 'interviews', label: `Interviews (${interviews.length})`, icon: '📅' },
          { id: 'eligibility', label: 'Academic Standing', icon: '🎓' },
          { id: 'guidelines', label: 'Guidelines', icon: '📜' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.subTabPill, activeTab === tab.id && styles.subTabPillActive]}
            onPress={() => setActiveTab(tab.id as any)}
            activeOpacity={0.7}
          >
            <Text style={[styles.subTabPillText, activeTab === tab.id && styles.subTabPillTextActive]}>
              {tab.icon} {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Area */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Fetching real-time recruitment updates...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          {/* TAB 1: ACTIVE RECRUITMENT DRIVES */}
          {activeTab === 'drives' && (
            <View style={styles.contentCard}>
              {/* Search Bar */}
              <View style={styles.searchBoxRow}>
                <Text style={{ fontSize: 14 }}>🔍</Text>
                <TextInput
                  style={styles.searchBoxInput}
                  placeholder="Search company, designation, CTC..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                />
                {Boolean(search) && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Text style={{ fontSize: 13, color: '#94A3B8' }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {filteredJobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🏢</Text>
                  <Text style={styles.emptyTitle}>No Recruitment Drives Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {search ? `No jobs matching "${search}"` : 'Upcoming campus hiring visits will appear here.'}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 12 }}>
                  {filteredJobs.map((job, idx) => {
                    const company = job.company || job.companyName || 'Corporate Partner';
                    const role = job.role || job.designation || 'Graduate Engineer';
                    const ctc = job.ctc || job.package || '4.5 LPA';
                    const minCgpa = job.minCgpa ?? 6.0;
                    const maxArrears = job.maxArrears ?? 0;
                    const deadline = job.deadline
                      ? new Date(job.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Open Registration';

                    // Check if student applied
                    const studentApp = applications.find((a) => {
                      const aComp = String(a.company || '').toLowerCase();
                      const aRole = String(a.role || '').toLowerCase();
                      return aComp === company.toLowerCase() && aRole === role.toLowerCase();
                    });
                    const isApplied = Boolean(studentApp);
                    const appStatus = studentApp?.status || 'Applied';

                    // Criteria check
                    const meetsCgpa = computedMetrics.cgpa >= Number(minCgpa);
                    const meetsArrears = computedMetrics.arrears <= Number(maxArrears);
                    const criteriaMet = meetsCgpa && meetsArrears;

                    return (
                      <View key={job._id || job.jobId || idx} style={styles.driveCard}>
                        {/* Top Badges */}
                        <View style={styles.driveTopRow}>
                          <View style={styles.ctcBadge}>
                            <Text style={styles.ctcBadgeText}>{ctc}</Text>
                          </View>
                          <View
                            style={[
                              styles.criteriaPill,
                              criteriaMet ? { backgroundColor: '#DCFCE7' } : { backgroundColor: '#FEF3C7' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.criteriaPillText,
                                criteriaMet ? { color: '#15803D' } : { color: '#B45309' },
                              ]}
                            >
                              {criteriaMet ? '✓ Criteria Met' : 'Check Criteria'}
                            </Text>
                          </View>
                        </View>

                        {/* Company & Role */}
                        <Text style={styles.driveCompanyText}>{company}</Text>
                        <View style={styles.driveMetaRow}>
                          <Text style={{ fontSize: 13 }}>💼</Text>
                          <Text style={styles.driveRoleText}>{role}</Text>
                        </View>
                        <View style={styles.driveMetaRow}>
                          <Text style={{ fontSize: 12 }}>📍</Text>
                          <Text style={styles.driveLocationText}>{job.location || 'Campus / Multiple Locations'}</Text>
                        </View>

                        {/* Specs Strip */}
                        <View style={styles.driveSpecsStrip}>
                          <View style={styles.driveSpecColumn}>
                            <Text style={styles.driveSpecLabel}>Min CGPA</Text>
                            <Text style={styles.driveSpecValue}>{minCgpa}</Text>
                          </View>
                          <View style={styles.driveSpecDivider} />
                          <View style={styles.driveSpecColumn}>
                            <Text style={styles.driveSpecLabel}>Max Arrears</Text>
                            <Text style={styles.driveSpecValue}>{maxArrears === 0 ? '0 Backlogs' : maxArrears}</Text>
                          </View>
                          <View style={styles.driveSpecDivider} />
                          <View style={styles.driveSpecColumn}>
                            <Text style={styles.driveSpecLabel}>Cut-Off Date</Text>
                            <Text style={styles.driveSpecValueSmall}>{deadline}</Text>
                          </View>
                        </View>

                        {/* Actions Row */}
                        <View style={styles.driveActionsRow}>
                          <TouchableOpacity
                            style={styles.viewStageBtn}
                            onPress={() => setStageModalJob(job)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.viewStageBtnText}>👁️ View Stage Details</Text>
                          </TouchableOpacity>

                          {isApplied ? (
                            <View style={styles.appliedBadge}>
                              <Text style={styles.appliedBadgeText}>
                                ✓ {appStatus === 'Selected' ? 'Offer Issued 🏆' : `Applied (${appStatus})`}
                              </Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.applyBtn,
                                applyingJobId === (job._id || job.jobId) && { opacity: 0.7 },
                              ]}
                              onPress={() => handleApply(job)}
                              disabled={applyingJobId === (job._id || job.jobId)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.applyBtnText}>
                                {applyingJobId === (job._id || job.jobId) ? 'Applying...' : 'Apply Now →'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: MY APPLICATIONS & PROGRESS STEPPER */}
          {activeTab === 'applications' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>📋</Text>
                <Text style={styles.sectionTitle}>
                  Your Tracked Applications ({applications.length})
                </Text>
              </View>

              {/* Offer Banner if any is Selected */}
              {selections.length > 0 && (
                <View style={styles.offerCelebrationBanner}>
                  <Text style={styles.offerCelebrationEmoji}>🏆</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerCelebrationTitle}>Official Corporate Offer Received!</Text>
                    <Text style={styles.offerCelebrationText}>
                      Selected by {selections[0].company} for {selections[0].role}. Verification slip dispatched to Placement Cell.
                    </Text>
                  </View>
                </View>
              )}

              {applications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyTitle}>No Applications Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Apply to active recruitment drives to monitor round progression and interview schedules.
                  </Text>
                  <TouchableOpacity
                    style={[styles.applyBtn, { marginTop: 12, paddingHorizontal: 20 }]}
                    onPress={() => setActiveTab('drives')}
                  >
                    <Text style={styles.applyBtnText}>Explore Active Drives →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 12 }}>
                  {applications.map((app, idx) => {
                    const company = app.company || app.companyName || 'Corporate Partner';
                    const role = app.role || 'Graduate Trainee';
                    const status = app.status || 'Applied';
                    const currRound = Number(app.currentRound || 1);
                    const isSelected = status === 'Selected';
                    const isRejected = status === 'Rejected';

                    return (
                      <View key={app._id || app.applicationId || idx} style={styles.appCard}>
                        <View style={styles.appCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.appCardCompany}>{company}</Text>
                            <Text style={styles.appCardRole}>{role}</Text>
                          </View>
                          <View
                            style={[
                              styles.appStatusPill,
                              isSelected
                                ? { backgroundColor: '#DCFCE7' }
                                : isRejected
                                ? { backgroundColor: '#FEE2E2' }
                                : { backgroundColor: '#EFF6FF' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.appStatusPillText,
                                isSelected
                                  ? { color: '#15803D' }
                                  : isRejected
                                  ? { color: '#DC2626' }
                                  : { color: '#2563EB' },
                              ]}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.appCardMeta}>
                          Application ID: {app.applicationId || `APP-${idx + 1}`} • Applied on{' '}
                          {app.appliedDate || app.appliedAt ? new Date(app.appliedDate || app.appliedAt).toLocaleDateString('en-GB') : 'This Session'}
                        </Text>

                        {/* Visual Round-by-Round Progress Stepper */}
                        <View style={styles.stepperContainer}>
                          <Text style={styles.stepperTitle}>Selection Progress:</Text>
                          <View style={styles.stepperRow}>
                            {['R1: Aptitude', 'R2: Technical', 'R3: HR', 'Offer'].map((stepName, sIdx) => {
                              const stepNum = sIdx + 1;
                              const isCleared = isSelected || currRound > stepNum;
                              const isActive = !isSelected && !isRejected && currRound === stepNum;
                              const isFailed = isRejected && currRound === stepNum;

                              return (
                                <View key={sIdx} style={styles.stepperSegment}>
                                  <View
                                    style={[
                                      styles.stepperNode,
                                      isCleared && { backgroundColor: '#10B981' },
                                      isActive && { backgroundColor: '#2563EB' },
                                      isFailed && { backgroundColor: '#EF4444' },
                                      !isCleared && !isActive && !isFailed && { backgroundColor: '#E2E8F0' },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.stepperNodeText,
                                        (isCleared || isActive || isFailed) && { color: '#FFFFFF' },
                                      ]}
                                    >
                                      {isCleared ? '✓' : isFailed ? '✕' : String(stepNum)}
                                    </Text>
                                  </View>
                                  <Text style={styles.stepperLabel} numberOfLines={1}>
                                    {stepName}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        {/* View Stage Button */}
                        <TouchableOpacity
                          style={styles.viewTimelineBtn}
                          onPress={() => {
                            const matchingJob = jobs.find((j) => (j.company || '').toLowerCase() === company.toLowerCase()) || {
                              company,
                              role,
                            };
                            setStageModalJob(matchingJob);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewTimelineBtnText}>View Full Timeline & Process Flow ›</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 3: INTERVIEW SCHEDULE */}
          {activeTab === 'interviews' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>📅</Text>
                <Text style={styles.sectionTitle}>
                  Scheduled Assessments & Interviews ({interviews.length})
                </Text>
              </View>

              {interviews.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🎙️</Text>
                  <Text style={styles.emptyTitle}>No Interviews Scheduled</Text>
                  <Text style={styles.emptySubtitle}>
                    Once your application is shortlisted by recruiters, interview dates, timings, and venue details will appear here.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 12 }}>
                  {interviews.map((it, idx) => (
                    <View key={it._id || it.intId || idx} style={styles.interviewCard}>
                      <View style={styles.interviewCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.interviewCompany}>{it.company}</Text>
                          <Text style={styles.interviewRole}>{it.role || 'Campus Recruitment'}</Text>
                        </View>
                        <View style={styles.interviewRoundPill}>
                          <Text style={styles.interviewRoundPillText}>{it.round || 'Round 1'}</Text>
                        </View>
                      </View>

                      <View style={styles.interviewDetailsBox}>
                        <View style={styles.interviewDetailRow}>
                          <Text style={{ fontSize: 13 }}>📅</Text>
                          <Text style={styles.interviewDetailText}>
                            Date: {it.date ? new Date(it.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Upcoming'}
                          </Text>
                        </View>
                        <View style={styles.interviewDetailRow}>
                          <Text style={{ fontSize: 13 }}>⏰</Text>
                          <Text style={styles.interviewDetailText}>Time: {it.time || '10:00 AM – 01:00 PM'}</Text>
                        </View>
                        <View style={styles.interviewDetailRow}>
                          <Text style={{ fontSize: 13 }}>🏛️</Text>
                          <Text style={styles.interviewDetailText}>
                            Venue / Mode: {it.venue || it.mode || 'Placement Cell Lab 2 (Block B)'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.interviewNotice}>
                        <Text style={styles.interviewNoticeText}>
                          📌 Bring 2 printed resume copies, formal attire, college ID card, and report 15 mins prior.
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 4: ACADEMIC STANDING & MARKS ACCESS */}
          {activeTab === 'eligibility' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>🎓</Text>
                <Text style={styles.sectionTitle}>Autonomous Academic Eligibility</Text>
              </View>

              {/* Verified Scores Grid */}
              <View style={styles.academicGrid}>
                <View style={styles.academicGridItem}>
                  <Text style={styles.academicGridLabel}>Cumulative CGPA</Text>
                  <Text style={[styles.academicGridValue, { color: '#2563EB' }]}>
                    {computedMetrics.cgpa.toFixed(2)}
                  </Text>
                  <Text style={styles.academicGridSub}>Threshold: ≥ 6.0</Text>
                </View>

                <View style={styles.academicGridItem}>
                  <Text style={styles.academicGridLabel}>Standing Arrears</Text>
                  <Text
                    style={[
                      styles.academicGridValue,
                      { color: computedMetrics.arrears === 0 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {computedMetrics.arrears}
                  </Text>
                  <Text style={styles.academicGridSub}>Requirement: 0</Text>
                </View>

                <View style={styles.academicGridItem}>
                  <Text style={styles.academicGridLabel}>Attendance Rate</Text>
                  <Text style={[styles.academicGridValue, { color: '#059669' }]}>
                    {computedMetrics.attendance}%
                  </Text>
                  <Text style={styles.academicGridSub}>Requirement: ≥ 75%</Text>
                </View>

                <View style={styles.academicGridItem}>
                  <Text style={styles.academicGridLabel}>Department</Text>
                  <Text style={styles.academicGridValueSmall}>{studentDept}</Text>
                  <Text style={styles.academicGridSub}>Approved Stream</Text>
                </View>
              </View>

              {/* Standing Arrears Details if any */}
              {computedMetrics.arrears > 0 && (
                <View style={styles.arrearsNoticeBox}>
                  <Text style={styles.arrearsNoticeTitle}>
                    ⚠️ Standing Arrear Papers ({computedMetrics.arrears})
                  </Text>
                  <Text style={styles.arrearsNoticeSub}>
                    Corporate recruiters enforce zero standing backlogs at registration. Clear these via COE re-appearance.
                  </Text>

                  <View style={{ gap: 6, marginTop: 8 }}>
                    {computedMetrics.failedCourses.map((c: any, cIdx: number) => (
                      <View key={cIdx} style={styles.failedCoursePill}>
                        <Text style={styles.failedCourseCode}>{c.subjectCode || c.courseCode || 'RAM001'}</Text>
                        <Text style={styles.failedCourseName}>{c.subjectName || c.courseName || 'TAMIL'}</Text>
                        <Text style={styles.failedCourseMarks}>
                          CIA: {c.internalMarks ?? 15} • End-Sem: {c.semesterMarks ?? 'RA'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Direct Access to Semester Marks */}
              <TouchableOpacity
                style={styles.marksActionCard}
                onPress={() => onNavigateToMarks && onNavigateToMarks()}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.marksActionTitle}>📊 Inspect Complete Semester Marks</Text>
                  <Text style={styles.marksActionSub}>
                    Review course-wise internal assessments, grade points, and autonomous mark sheets.
                  </Text>
                </View>
                <Text style={styles.marksActionArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 5: GUIDELINES & POLICIES */}
          {activeTab === 'guidelines' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>📜</Text>
                <Text style={styles.sectionTitle}>Autonomous Placement Cell Guidelines</Text>
              </View>

              <View style={{ gap: 10, marginTop: 10 }}>
                {[
                  {
                    title: '1. Professional Dress Code & Grooming',
                    desc: 'Formal institutional attire with college blazer or clean formal wear and official ID cards is mandatory for all recruitment rounds.',
                  },
                  {
                    title: '2. Document Verification Readiness',
                    desc: 'Carry 3 updated resume copies, verified grade cards, autonomous clearance slip, and photo ID for all offline drives.',
                  },
                  {
                    title: '3. Single Offer & Dream Company Rule',
                    desc: 'Students receiving an initial offer up to ₹5 LPA may participate in subsequent "Dream Company" drives offering package ≥ ₹8 LPA.',
                  },
                  {
                    title: '4. Attendance & Punctuality Policy',
                    desc: 'Reporting 15 minutes prior to scheduled assessment slots is strictly required. Late entries result in automated disqualification.',
                  },
                ].map((item, iIdx) => (
                  <View key={iIdx} style={styles.guidelineCard}>
                    <Text style={styles.guidelineTitle}>{item.title}</Text>
                    <Text style={styles.guidelineDesc}>{item.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Stage Details Modal */}
      <PlacementStageModal
        visible={Boolean(stageModalJob)}
        onClose={() => setStageModalJob(null)}
        job={stageModalJob}
        application={applications.find(
          (a) =>
            (a.company || '').toLowerCase() === (stageModalJob?.company || stageModalJob?.companyName || '').toLowerCase()
        )}
        studentEligibility={{
          cgpa: computedMetrics.cgpa,
          arrears: computedMetrics.arrears,
          attendance: computedMetrics.attendance,
          dept: studentDept,
          isEligible: computedMetrics.isEligible,
        }}
        onApply={handleApply}
        isApplied={applications.some(
          (a) =>
            (a.company || '').toLowerCase() === (stageModalJob?.company || stageModalJob?.companyName || '').toLowerCase()
        )}
        applying={Boolean(applyingJobId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  toastCard: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroStripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroPreTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  heroSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  syncBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  syncBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  metricRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  standingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  standingPillText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  standingPillLink: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  subTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  subTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subTabPillTextActive: {
    color: '#FFFFFF',
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  searchBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchBoxInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  driveCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  driveTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ctcBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ctcBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  criteriaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  criteriaPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  driveCompanyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  driveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  driveRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  driveLocationText: {
    fontSize: 11,
    color: '#64748B',
  },
  driveSpecsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  driveSpecColumn: {
    flex: 1,
    alignItems: 'center',
  },
  driveSpecLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  driveSpecValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  driveSpecValueSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  driveSpecDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  driveActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewStageBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewStageBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  applyBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appliedBadge: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  appliedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  offerCelebrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  offerCelebrationEmoji: {
    fontSize: 26,
  },
  offerCelebrationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  offerCelebrationText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  appCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  appCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appCardCompany: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  appCardRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 1,
  },
  appStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  appStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  appCardMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  stepperContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stepperTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperSegment: {
    alignItems: 'center',
    flex: 1,
  },
  stepperNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  stepperNodeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  stepperLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  viewTimelineBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  viewTimelineBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  interviewCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
  },
  interviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  interviewCompany: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  interviewRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  interviewRoundPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  interviewRoundPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  interviewDetailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 6,
  },
  interviewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interviewDetailText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  interviewNotice: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
  },
  interviewNoticeText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  academicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  academicGridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    alignItems: 'center',
  },
  academicGridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  academicGridValue: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },
  academicGridValueSmall: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 3,
  },
  academicGridSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  arrearsNoticeBox: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  arrearsNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },
  arrearsNoticeSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 15,
  },
  failedCoursePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 8,
  },
  failedCourseCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  failedCourseName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 1,
  },
  failedCourseMarks: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  marksActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  marksActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  marksActionSub: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
  marksActionArrow: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  guidelineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  guidelineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  guidelineDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 3,
    lineHeight: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
});
