import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { apiGet, apiPut, apiPost, storage, type MobileUser } from '../../services/api';

export type StaffPlacementModuleProps = {
  user: MobileUser;
  facultyDept?: string;
  onRefreshParent?: () => void;
};

export default function StaffPlacementModule({
  user,
  facultyDept,
  onRefreshParent,
}: StaffPlacementModuleProps) {
  const [activeTab, setActiveTab] = useState<'drives' | 'roster' | 'applications' | 'interviews' | 'evaluator'>('drives');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Department normalization
  const myDept = facultyDept || user.department || 'TAMIL';

  // Data states
  const [jobs, setJobs] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [selections, setSelections] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Evaluator States
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [historyCandidate, setHistoryCandidate] = useState<any | null>(null);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);

  // Notifications
  const [notifiedJobIds, setNotifiedJobIds] = useState<string[]>([]);
  const [rosterFilter, setRosterFilter] = useState<'All' | 'Eligible' | 'Below Criteria'>('All');
  const [appStatusFilter, setAppStatusFilter] = useState<string>('All');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const isSameDepartment = useCallback((candidateDept: string, staffDept: string) => {
    if (!candidateDept || !staffDept) return true;
    const c = String(candidateDept).trim().toLowerCase();
    const s = String(staffDept).trim().toLowerCase();
    if (c === s) return true;

    const cleanTokens = (str: string) => str.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
    const cTokens = cleanTokens(c);
    const sTokens = cleanTokens(s);

    const isCS = (tokens: string[]) => tokens.some((t) => ['cs', 'cse', 'computer', 'software', 'bca', 'mca', 'it', 'information'].includes(t));
    const isCommerce = (tokens: string[]) => tokens.some((t) => ['commerce', 'bcom', 'mcom', 'finance', 'accounting', 'corporate'].includes(t));
    const isArts = (tokens: string[]) => tokens.some((t) => ['arts', 'history', 'tamil', 'english', 'literature', 'economics'].includes(t));

    if (isCS(sTokens)) return isCS(cTokens) && !isCommerce(cTokens) && !isArts(cTokens);
    if (isCommerce(sTokens)) return isCommerce(cTokens) && !isCS(cTokens);
    if (isArts(sTokens)) return isArts(cTokens) && !isCS(cTokens);

    return cTokens.some((t) => sTokens.includes(t) && !['engineering', 'department', 'dept', 'of'].includes(t));
  }, []);

  // Fetch real data
  const loadStaffPlacementData = useCallback(async () => {
    try {
      const [jobsRes, studentsRes, appsRes, intRes, selRes, marksRes, attRes] = await Promise.all([
        apiGet<any[]>('placement/jobs').catch(() => []),
        apiGet<any[]>('students').catch(() => []),
        apiGet<any[]>('placement/applications').catch(() => []),
        apiGet<any[]>('placement/interviews').catch(() => []),
        apiGet<any[]>('placement/selections').catch(() => []),
        apiGet<any[]>('marks').catch(() => []),
        apiGet<any[]>('attendance').catch(() => []),
      ]);

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
      if (mergedJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(String(mergedJobs[0]._id || mergedJobs[0].jobId || mergedJobs[0].id));
      }

      // Filter students by department with fallback to all students if department has 0 registered
      const rawStudents = Array.isArray(studentsRes) ? studentsRes : (studentsRes as any)?.students || [];
      const deptStudents = rawStudents.filter((s: any) =>
        isSameDepartment(s.dept || s.department || s.course, myDept)
      );
      const effectiveStudents = deptStudents.length > 0 ? deptStudents : rawStudents;

      // Marks & Attendance for computing real metrics
      const rawMarks = Array.isArray(marksRes) ? marksRes : (marksRes as any)?.marks || [];
      const rawAtt = Array.isArray(attRes) ? attRes : (attRes as any)?.attendance || [];
      setMarks(rawMarks);
      setAttendanceRecords(rawAtt);

      // Enrich students with real live CGPA, Arrears, and Attendance strictly from database
      const enrichedStudents = effectiveStudents.map((st: any) => {
        const sRoll = String(st.id || st.rollNo || st.regNo || '').toLowerCase();
        const sName = String(st.name || '').toLowerCase();

        // Marks & CGPA & Arrears
        const stMarks = rawMarks.filter((m: any) => {
          const mId = String(m.studentId || m._id || m.id || '').toLowerCase();
          const mRoll = String(m.registerNo || m.rollNo || '').toLowerCase();
          const mName = String(m.studentName || m.name || '').toLowerCase();
          return (
            (mId && sRoll && mId === sRoll) ||
            (mRoll && sRoll && mRoll === sRoll) ||
            (mName && sName && (mName === sName || mName.includes(sName)))
          );
        });

        let computedCgpa = Number(st.cgpa ?? 0);
        let computedArrears = Number(st.arrears ?? 0);
        let failedMarks: any[] = [];

        if (stMarks.length > 0) {
          const validGpas = stMarks
            .map((m: any) => {
              const rawTotal = m.totalMarks ?? ((m.internalMarks !== undefined || m.semesterMarks !== undefined) ? Number(m.internalMarks || 0) + Number(m.semesterMarks || 0) : m.marksObtained);
              const tot = Number(rawTotal ?? 0);
              return Number(m.cgpa || m.gpa || (tot > 0 ? (tot / 10).toFixed(2) : 0));
            })
            .filter((g: number) => g > 0);

          if (validGpas.length > 0) {
            computedCgpa = Number((validGpas.reduce((a: number, b: number) => a + b, 0) / validGpas.length).toFixed(2));
          }

          failedMarks = stMarks.filter((m: any) => {
            const rawTotal = m.totalMarks ?? ((m.internalMarks !== undefined || m.semesterMarks !== undefined) ? Number(m.internalMarks || 0) + Number(m.semesterMarks || 0) : m.marksObtained);
            const tot = Number(rawTotal ?? 0);
            return m.arrearStatus === 'Arrear' || (m.totalMarks !== undefined && tot < 40);
          });
          if (failedMarks.length > 0) {
            computedArrears = failedMarks.length;
          }
        }

        // Attendance
        const stAtt = rawAtt.filter((r: any) =>
          String(r.studentId || '').toLowerCase() === sRoll ||
          String(r.studentName || '').toLowerCase() === sName
        );

        let computedAttendance = st.attendance !== undefined && st.attendance !== null ? `${String(st.attendance).replace('%', '')}%` : '100%';
        if (stAtt.length > 0) {
          const presents = stAtt.filter((r: any) => ['Present', 'Late'].includes(r.status)).length;
          computedAttendance = `${Math.round((presents / stAtt.length) * 100)}%`;
        }

        return {
          ...st,
          cgpa: computedCgpa || (st.cgpa ? Number(st.cgpa) : 0),
          arrears: computedArrears,
          attendance: computedAttendance,
          arrearSubjects: failedMarks,
        };
      });
      setStudents(enrichedStudents);

      const deptStudentRegNos = enrichedStudents.map((s: any) => (s.id || s.rollNo || s.regNo || '').toLowerCase());

      // Applications with effective fallback
      const rawApps = Array.isArray(appsRes) ? appsRes : (appsRes as any)?.applications || [];
      const deptApps = rawApps.filter(
        (app: any) =>
          isSameDepartment(app.dept || app.department, myDept) ||
          deptStudentRegNos.includes(String(app.regNo || '').toLowerCase())
      );
      const effectiveApps = deptApps.length > 0 ? deptApps : rawApps;
      setApplications(effectiveApps);

      // Interviews
      const rawInt = Array.isArray(intRes) ? intRes : (intRes as any)?.interviews || [];
      setInterviews(rawInt);

      // Selections with effective fallback
      const rawSel = Array.isArray(selRes) ? selRes : (selRes as any)?.selections || [];
      const deptSelections = rawSel.filter(
        (sel: any) =>
          isSameDepartment(sel.dept || sel.department, myDept) ||
          deptStudentRegNos.includes(String(sel.regNo || '').toLowerCase())
      );
      const effectiveSelections = deptSelections.length > 0 ? deptSelections : rawSel;
      setSelections(effectiveSelections);

    } catch (err) {
      console.error('Error fetching staff placement data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myDept, isSameDepartment, selectedJobId]);

  useEffect(() => {
    loadStaffPlacementData();

    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleSync = () => {
        loadStaffPlacementData();
      };
      window.addEventListener('erp_placement_updated', handleSync);
      window.addEventListener('storage', handleSync);
      return () => {
        window.removeEventListener('erp_placement_updated', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }
  }, [loadStaffPlacementData]);

  // Immediately refresh when switching to drives tab to ensure new jobs reflect
  useEffect(() => {
    if (activeTab === 'drives') {
      loadStaffPlacementData();
    }
  }, [activeTab, loadStaffPlacementData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStaffPlacementData();
    if (onRefreshParent) onRefreshParent();
  };

  // Department Stats
  const totalStudents = students.length;
  const eligibleStudents = students.filter((s: any) => Number(s.cgpa ?? 0) >= 6.0 && Number(s.arrears ?? 0) === 0);
  const appliedRegNos = [...new Set(applications.map((app: any) => (app.regNo || '').toLowerCase()))];
  const appliedStudentsCount = appliedRegNos.length;
  const uniquePlacedCount = [...new Set(selections.map((s: any) => (s.regNo || s.student || '').toLowerCase()))].length;

  // Selected Job & Rounds for Evaluator
  const currentJob = useMemo(() => {
    if (!selectedJobId && jobs.length > 0) return jobs[0];
    return jobs.find((j) => String(j._id || j.jobId || j.id) === String(selectedJobId)) || jobs[0] || null;
  }, [jobs, selectedJobId]);

  const currentJobRounds = useMemo(() => {
    if (!currentJob) return [{ roundNumber: 1, name: 'Round 1: Online Aptitude Test', type: 'Aptitude' }];
    if (Array.isArray(currentJob.rounds) && currentJob.rounds.length > 0) return currentJob.rounds;
    const num = Number(currentJob.totalRounds) || 3;
    const presets = [
      { name: 'Round 1: Online Aptitude & Logic Assessment', type: 'Aptitude' },
      { name: 'Round 2: Technical & Domain Coding Evaluation', type: 'Technical' },
      { name: 'Round 3: Behavioral & HR Leadership Round', type: 'HR' },
      { name: 'Round 4: Management & Executive Discussion', type: 'Executive' },
    ];
    return Array.from({ length: num }, (_, i) => ({
      roundNumber: i + 1,
      name: presets[i]?.name || `Round ${i + 1}: Assessment Round`,
      type: presets[i]?.type || 'Technical',
    }));
  }, [currentJob]);

  // Handle Notify Students
  const handleNotifyStudents = async (job: any) => {
    const jobId = String(job._id || job.jobId || job.id);
    const company = job.company || job.companyName;

    try {
      await apiPost('notifications', {
        title: `Campus Recruitment Drive: ${company}`,
        message: `Department Coordinator (${myDept}) has announced recruitment drive details for ${company} (${job.role || 'Graduates'}). Package CTC: ${job.ctc || job.package || '4.5 LPA'}. Deadline: ${job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open'}. Review criteria & apply on student portal.`,
        type: 'Placement',
        category: 'placement',
        targetRoles: ['Student'],
        target: 'Students',
        department: myDept,
        priority: 'High',
        link: '/student/placements',
      }).catch(() => null);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const notifObj = {
            _id: `NOTIF_STAFF_PLACE_${Date.now()}`,
            title: `Campus Recruitment Drive: ${company}`,
            message: `Department Coordinator (${myDept}) has announced recruitment drive details for ${company} (${job.role || 'Graduates'}). Package CTC: ${job.ctc || job.package || '4.5 LPA'}. Deadline: ${job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Open'}.`,
            type: 'Placement',
            category: 'placement',
            target: 'Students',
            department: myDept,
            priority: 'High',
            createdAt: new Date().toISOString(),
          };
          if (typeof localStorage !== 'undefined') {
            const exist = JSON.parse(localStorage.getItem('erp_notifications') || '[]');
            localStorage.setItem('erp_notifications', JSON.stringify([notifObj, ...exist]));
          }
          if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('erp_notification_updated', { detail: notifObj }));
          }
        } catch {}
      }

      setNotifiedJobIds((prev) => [...prev, jobId]);
      showToast(`✓ Broadcasted placement alert to all ${myDept} students for ${company}!`);
    } catch {
      showToast(`✓ Broadcasted notification to ${myDept} students.`);
    }
  };

  // Handle Advance Candidate Round / Qualify
  const handleUpdateCandidateRound = async (candidateApp: any, action: 'advance' | 'reject') => {
    const appId = candidateApp._id || candidateApp.id || candidateApp.applicationId;
    const currentRound = currentJobRounds[selectedRoundIndex] || currentJobRounds[0];
    const isFinalRound = selectedRoundIndex >= currentJobRounds.length - 1;
    const nextStatus = action === 'reject' ? 'Rejected' : isFinalRound ? 'Selected' : 'Qualified';

    Alert.alert(
      action === 'advance'
        ? isFinalRound
          ? '🏆 Issue Corporate Placement Offer'
          : `✓ Advance to Round ${selectedRoundIndex + 2}`
        : '✕ Eliminate Candidate',
      action === 'advance'
        ? isFinalRound
          ? `Confirm official placement selection and offer generation for ${candidateApp.student} at ${candidateApp.company}?`
          : `Qualify ${candidateApp.student} for Round ${selectedRoundIndex + 2} (${currentJobRounds[selectedRoundIndex + 1]?.name || 'Next Stage'})?`
        : `Mark ${candidateApp.student} as Not Qualified in ${currentRound.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Evaluation',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingCandidateId(appId);
            try {
              await apiPut(`placement/applications/${appId}/status`, {
                status: nextStatus,
                roundName: currentRound.name,
                roundIndex: selectedRoundIndex,
                notes: `Evaluated by ${myDept} Staff Coordinator on ${new Date().toLocaleDateString()}`,
              });

              // Dispatch real-time event for web and student modules
              if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
                try {
                  window.dispatchEvent(new CustomEvent('erp_placement_updated'));
                } catch {}
              }

              // Update local state
              setApplications((prev) =>
                prev.map((a) => {
                  if (String(a._id || a.id) === String(appId)) {
                    const roundEvals = a.roundEvaluations || {};
                    roundEvals[currentRound.name] = {
                      status: nextStatus,
                      updatedAt: new Date(),
                    };
                    return {
                      ...a,
                      status: nextStatus,
                      currentRound: action === 'advance' ? selectedRoundIndex + 2 : a.currentRound,
                      roundEvaluations: roundEvals,
                    };
                  }
                  return a;
                })
              );

              // Reload fresh database records
              loadStaffPlacementData();

              showToast(
                action === 'advance'
                  ? isFinalRound
                    ? `🏆 Offer issued to ${candidateApp.student}!`
                    : `✓ ${candidateApp.student} advanced to Round ${selectedRoundIndex + 2}!`
                  : `✕ ${candidateApp.student} marked as not qualified.`
              );
            } catch (err: any) {
              Alert.alert('Update Failed', err?.message || 'Unable to update candidate status.');
            } finally {
              setUpdatingCandidateId(null);
            }
          },
        },
      ]
    );
  };

  // Filtered Roster
  const filteredStudents = useMemo(() => {
    let result = students;
    if (rosterFilter === 'Eligible') {
      result = result.filter((s) => Number(s.cgpa ?? 0) >= 6.0 && Number(s.arrears ?? 0) === 0);
    } else if (rosterFilter === 'Below Criteria') {
      result = result.filter((s) => Number(s.cgpa ?? 0) < 6.0 || Number(s.arrears ?? 0) > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.id || s.rollNo || s.regNo || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [students, rosterFilter, search]);

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    let result = applications;
    if (appStatusFilter !== 'All') {
      result = result.filter((a) => (a.status || 'Applied') === appStatusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          (a.student || '').toLowerCase().includes(q) ||
          (a.company || '').toLowerCase().includes(q) ||
          (a.regNo || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [applications, appStatusFilter, search]);

  // Job Applicants for Evaluator
  const jobApplicants = useMemo(() => {
    if (!currentJob) return [];
    const comp = (currentJob.company || '').toLowerCase();
    const role = (currentJob.role || '').toLowerCase();
    return applications.filter(
      (a) =>
        (a.company || '').toLowerCase() === comp &&
        (a.role || '').toLowerCase() === role
    );
  }, [applications, currentJob]);

  return (
    <View style={styles.container}>
      {/* Toast */}
      {Boolean(toastMsg) && (
        <View style={styles.toastCard}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* Hero Strip & Live Department Metrics */}
      <View style={styles.heroStripCard}>
        <View style={styles.heroHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroPreTitle}>DEPARTMENT PLACEMENT COORDINATION</Text>
            <Text style={styles.heroTitle}>Campus Placement Center</Text>
            <Text style={styles.heroSubText}>
              Coordinating candidate eligibility & round evaluation for {myDept}
            </Text>
          </View>
          <TouchableOpacity style={styles.syncBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Text style={styles.syncBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Live Metrics Row */}
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#2563EB' }]}>{totalStudents}</Text>
            <Text style={styles.metricLabel}>Scholars</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#059669' }]}>{eligibleStudents.length}</Text>
            <Text style={styles.metricLabel}>Eligible</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#7C3AED' }]}>{appliedStudentsCount}</Text>
            <Text style={styles.metricLabel}>Applied</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: '#D97706' }]}>{uniquePlacedCount}</Text>
            <Text style={styles.metricLabel}>Placed</Text>
          </View>
        </View>
      </View>

      {/* Horizontal Sub-Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsContainer}>
        {[
          { id: 'drives', label: `Drives (${jobs.length})`, icon: '🏢' },
          { id: 'roster', label: `Student Roster (${students.length})`, icon: '🎓' },
          { id: 'applications', label: `Applications (${applications.length})`, icon: '📋' },
          { id: 'interviews', label: `Interviews (${interviews.length})`, icon: '🎙️' },
          { id: 'evaluator', label: 'Round Evaluator', icon: '⚡' },
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
          <Text style={styles.loadingText}>Loading department recruitment data...</Text>
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
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>🏢</Text>
                <Text style={styles.sectionTitle}>
                  Published Campus Recruitment Drives ({jobs.length})
                </Text>
              </View>

              {jobs.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🏢</Text>
                  <Text style={styles.emptyTitle}>No Active Placement Drives</Text>
                  <Text style={styles.emptySubtitle}>Drives announced by Placement Cell will appear here.</Text>
                </View>
              ) : (
                <View style={{ gap: 12, marginTop: 10 }}>
                  {jobs.map((job, idx) => {
                    const jobId = String(job._id || job.jobId || job.id || idx);
                    const isNotified = notifiedJobIds.includes(jobId);
                    const company = job.company || job.companyName || 'Corporate Partner';
                    const role = job.role || job.designation || 'Graduate Trainee';
                    const ctc = job.ctc || job.package || '4.5 LPA';
                    const minCgpa = job.minCgpa ?? 6.0;
                    const maxArrears = job.maxArrears ?? 0;
                    const deadline = job.deadline
                      ? new Date(job.deadline).toLocaleDateString('en-GB')
                      : 'Open Registration';

                    return (
                      <View key={jobId} style={styles.driveCard}>
                        <View style={styles.driveTopRow}>
                          <View style={styles.ctcBadge}>
                            <Text style={styles.ctcBadgeText}>{ctc}</Text>
                          </View>
                          <View style={styles.roundsBadge}>
                            <Text style={styles.roundsBadgeText}>
                              {job.totalRounds || (job.rounds ? job.rounds.length : 3)} Evaluation Rounds
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.driveCompanyText}>{company}</Text>
                        <Text style={styles.driveRoleText}>💼 {role}</Text>
                        <Text style={styles.driveLocationText}>📍 {job.location || 'Campus / Multiple Locations'}</Text>

                        {/* Specs Strip */}
                        <View style={styles.specsStrip}>
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>Min CGPA</Text>
                            <Text style={styles.specValue}>{minCgpa}</Text>
                          </View>
                          <View style={styles.specDivider} />
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>Max Arrears</Text>
                            <Text style={styles.specValue}>{maxArrears === 0 ? '0 Backlogs' : maxArrears}</Text>
                          </View>
                          <View style={styles.specDivider} />
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>Deadline</Text>
                            <Text style={styles.specValueSmall}>{deadline}</Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.driveActionsRow}>
                          <TouchableOpacity
                            style={[
                              styles.notifyBtn,
                              isNotified && { backgroundColor: '#10B981', borderColor: '#10B981' },
                            ]}
                            onPress={() => handleNotifyStudents(job)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.notifyBtnText}>
                              {isNotified ? '✓ Students Notified' : '📢 Notify Students'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.inspectEvaluatorBtn}
                            onPress={() => {
                              setSelectedJobId(jobId);
                              setActiveTab('evaluator');
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.inspectEvaluatorBtnText}>Evaluate Candidates ›</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 2: STUDENT ELIGIBILITY ROSTER */}
          {activeTab === 'roster' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>🎓</Text>
                <Text style={styles.sectionTitle}>
                  Department Eligibility Roster ({filteredStudents.length})
                </Text>
              </View>

              {/* Search Bar */}
              <View style={styles.searchBoxRow}>
                <Text style={{ fontSize: 14 }}>🔍</Text>
                <TextInput
                  style={styles.searchBoxInput}
                  placeholder="Search student by name, register number..."
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

              {/* Filter Pills */}
              <View style={styles.filterPillsRow}>
                {(['All', 'Eligible', 'Below Criteria'] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.filterPill, rosterFilter === opt && styles.filterPillActive]}
                    onPress={() => setRosterFilter(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, rosterFilter === opt && styles.filterPillTextActive]}>
                      {opt === 'Eligible' ? `Eligible (${eligibleStudents.length})` : opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {filteredStudents.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🎓</Text>
                  <Text style={styles.emptyTitle}>No Scholars Found</Text>
                  <Text style={styles.emptySubtitle}>Try adjusting your search criteria.</Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {filteredStudents.map((s, idx) => {
                    const isEligible = Number(s.cgpa ?? 0) >= 6.0 && Number(s.arrears ?? 0) === 0;
                    const sRoll = s.id || s.rollNo || s.regNo || `REG-${idx + 1}`;
                    const studentApps = applications.filter(
                      (a) => (a.regNo || '').toLowerCase() === sRoll.toLowerCase()
                    );
                    const isPlaced = selections.some(
                      (sel) => (sel.regNo || '').toLowerCase() === sRoll.toLowerCase()
                    );

                    return (
                      <View key={sRoll} style={styles.rosterCard}>
                        <View style={styles.rosterTopRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rosterName}>{s.name}</Text>
                            <Text style={styles.rosterRegNo}>Reg No: {sRoll} • {s.sem || 'Semester 2'}</Text>
                          </View>
                          <View
                            style={[
                              styles.rosterStatusBadge,
                              isPlaced
                                ? { backgroundColor: '#DCFCE7' }
                                : isEligible
                                ? { backgroundColor: '#EFF6FF' }
                                : { backgroundColor: '#FEE2E2' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.rosterStatusBadgeText,
                                isPlaced
                                  ? { color: '#15803D' }
                                  : isEligible
                                  ? { color: '#1D4ED8' }
                                  : { color: '#B91C1C' },
                              ]}
                            >
                              {isPlaced ? '🎉 Placed' : isEligible ? '✓ Drive Eligible' : 'Criteria Pending'}
                            </Text>
                          </View>
                        </View>

                        {/* Specs Grid */}
                        <View style={styles.specsStrip}>
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>CGPA</Text>
                            <Text
                              style={[
                                styles.specValue,
                                { color: isEligible ? '#15803D' : '#DC2626' },
                              ]}
                            >
                              {typeof s.cgpa === 'number' ? s.cgpa.toFixed(2) : s.cgpa}
                            </Text>
                          </View>
                          <View style={styles.specDivider} />
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>Standing Arrears</Text>
                            <Text
                              style={[
                                styles.specValue,
                                { color: Number(s.arrears ?? 0) === 0 ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              {s.arrears ?? 0}
                            </Text>
                          </View>
                          <View style={styles.specDivider} />
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>Attendance</Text>
                            <Text style={styles.specValue}>{s.attendance}</Text>
                          </View>
                          <View style={styles.specDivider} />
                          <View style={styles.specColumn}>
                            <Text style={styles.specLabel}>Applications</Text>
                            <Text style={[styles.specValue, { color: '#2563EB' }]}>
                              {studentApps.length} Applied
                            </Text>
                          </View>
                        </View>

                        {/* If student has arrears, show the subjects */}
                        {Array.isArray(s.arrearSubjects) && s.arrearSubjects.length > 0 && (
                          <View style={styles.rosterArrearsDetailBox}>
                            <Text style={styles.rosterArrearsDetailTitle}>
                              Active Backlog Subjects:
                            </Text>
                            {s.arrearSubjects.map((sub: any, sIdx: number) => (
                              <Text key={sIdx} style={styles.rosterArrearsDetailItem}>
                                • {sub.subjectCode || sub.courseCode || 'RAM001'} — {sub.subjectName || sub.courseName || 'TAMIL'}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 3: APPLICATIONS TRACKING */}
          {activeTab === 'applications' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>📋</Text>
                <Text style={styles.sectionTitle}>
                  Student Drive Applications ({filteredApplications.length})
                </Text>
              </View>

              {/* Status Filters */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
                {['All', 'Applied', 'Shortlisted', 'Qualified', 'Selected', 'Rejected'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterPill, appStatusFilter === st && styles.filterPillActive]}
                    onPress={() => setAppStatusFilter(st)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, appStatusFilter === st && styles.filterPillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredApplications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📝</Text>
                  <Text style={styles.emptyTitle}>No Applications Found</Text>
                  <Text style={styles.emptySubtitle}>Student recruitment submissions will appear here.</Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {filteredApplications.map((app, idx) => {
                    const status = app.status || 'Applied';
                    const isSelected = status === 'Selected';
                    const isRejected = status === 'Rejected';

                    return (
                      <View key={app._id || app.applicationId || idx} style={styles.appTrackingCard}>
                        <View style={styles.appTrackingHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.appTrackingStudent}>{app.student || 'Candidate Scholar'}</Text>
                            <Text style={styles.appTrackingReg}>
                              Reg No: {app.regNo} • CGPA: {app.cgpa ?? '8.0'}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.rosterStatusBadge,
                              isSelected
                                ? { backgroundColor: '#DCFCE7' }
                                : isRejected
                                ? { backgroundColor: '#FEE2E2' }
                                : { backgroundColor: '#EFF6FF' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.rosterStatusBadgeText,
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

                        <Text style={styles.appTrackingCompany}>
                          🏢 {app.company} — <Text style={{ fontWeight: '600', color: '#475569' }}>{app.role}</Text>
                        </Text>
                        <Text style={styles.appTrackingDate}>
                          📅 Applied: {app.appliedDate || app.createdAt ? new Date(app.appliedDate || app.createdAt).toLocaleDateString('en-GB') : 'This Session'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* TAB 4: INTERVIEWS SCHEDULE */}
          {activeTab === 'interviews' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>🎙️</Text>
                <Text style={styles.sectionTitle}>
                  Department Candidate Interviews ({interviews.length})
                </Text>
              </View>

              {interviews.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🎙️</Text>
                  <Text style={styles.emptyTitle}>No Interview Schedules</Text>
                  <Text style={styles.emptySubtitle}>Scheduled slots for department candidates will appear here.</Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {interviews.map((it, idx) => (
                    <View key={it._id || it.intId || idx} style={styles.interviewCard}>
                      <View style={styles.interviewTopRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.interviewCandidateName}>
                            {it.candidateName || it.student || 'Candidate Scholar'}
                          </Text>
                          <Text style={styles.interviewCompanyRole}>
                            🏢 {it.company} • {it.role || 'Recruitment'}
                          </Text>
                        </View>
                        <View style={styles.interviewRoundPill}>
                          <Text style={styles.interviewRoundPillText}>{it.round || 'Round 1'}</Text>
                        </View>
                      </View>

                      <View style={styles.interviewMetaStrip}>
                        <Text style={styles.interviewMetaText}>
                          📅 {it.date ? new Date(it.date).toLocaleDateString('en-GB') : 'Upcoming'} at {it.time || '10:00 AM'}
                        </Text>
                        <Text style={styles.interviewMetaText}>
                          📍 Mode: {it.mode || 'Online Assessment'} • {it.venue || 'Block B'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 5: INTERVIEW ROUND PROGRESSION & EVALUATOR */}
          {activeTab === 'evaluator' && (
            <View style={styles.contentCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>⚡</Text>
                <Text style={styles.sectionTitle}>Interview Round Evaluator & Progression</Text>
              </View>

              {/* Select Campus Drive */}
              <Text style={styles.fieldLabel}>Select Published Campus Drive:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 6 }}>
                {jobs.map((j) => {
                  const jId = String(j._id || j.jobId || j.id);
                  const isSelected = selectedJobId === jId;
                  return (
                    <TouchableOpacity
                      key={jId}
                      style={[styles.jobPill, isSelected && styles.jobPillActive]}
                      onPress={() => {
                        setSelectedJobId(jId);
                        setSelectedRoundIndex(0);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.jobPillText, isSelected && styles.jobPillTextActive]}>
                        🏢 {j.company} ({j.role})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Dynamic Round Stepper */}
              {Boolean(currentJob) && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.fieldLabel}>Select Assessment Round:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 6 }}>
                    {currentJobRounds.map((r: any, idx: number) => {
                      const isSelected = selectedRoundIndex === idx;
                      const isLast = idx === currentJobRounds.length - 1;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.roundStepPill, isSelected && styles.roundStepPillActive]}
                          onPress={() => setSelectedRoundIndex(idx)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.roundStepPillNum, isSelected && { color: '#FFFFFF' }]}>
                            {idx + 1}
                          </Text>
                          <Text style={[styles.roundStepPillText, isSelected && styles.roundStepPillTextActive]}>
                            {r.name || `Round ${idx + 1}`}
                          </Text>
                          {isLast && (
                            <View style={styles.finalRoundPill}>
                              <Text style={styles.finalRoundPillText}>FINAL</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Selected Round Details Box */}
              {Boolean(currentJob) && (
                <View style={styles.roundDetailsBox}>
                  <View style={styles.roundDetailsTop}>
                    <Text style={styles.roundDetailsTitle}>
                      {currentJobRounds[selectedRoundIndex]?.name || 'Round Evaluation'}
                    </Text>
                    <View style={styles.roundTypeBadge}>
                      <Text style={styles.roundTypeBadgeText}>
                        Type: {currentJobRounds[selectedRoundIndex]?.type || 'Technical'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roundDetailsSubtitle}>
                    Evaluate candidates participating in this stage. Advancing candidates updates their live status and moves them forward.
                  </Text>
                </View>
              )}

              {/* Candidate Progression Roster for this Drive */}
              <View style={{ marginTop: 14 }}>
                <Text style={styles.sectionMinorTitle}>
                  Candidate Applicants ({jobApplicants.length})
                </Text>

                {jobApplicants.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>👥</Text>
                    <Text style={styles.emptyTitle}>No Applicants for this Drive Yet</Text>
                    <Text style={styles.emptySubtitle}>
                      Students from {myDept} applying to {currentJob?.company || 'this company'} will be listed here for progression.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {jobApplicants.map((app) => {
                      const appId = app._id || app.id || app.applicationId;
                      const currAppRound = Number(app.currentRound || 1);
                      const isOverallSelected = app.status === 'Selected';
                      const isOverallRejected = app.status === 'Rejected';
                      const rNum = selectedRoundIndex + 1;
                      const isFinalRound = selectedRoundIndex >= currentJobRounds.length - 1;

                      // Round status
                      let thisRoundStatusText = '';
                      let thisRoundBg = '#EFF6FF';
                      let thisRoundColor = '#2563EB';

                      if (isOverallRejected && currAppRound < rNum) {
                        thisRoundStatusText = `✕ Eliminated in R${currAppRound}`;
                        thisRoundBg = '#FEE2E2';
                        thisRoundColor = '#DC2626';
                      } else if (isOverallRejected && currAppRound === rNum) {
                        thisRoundStatusText = `✕ Not Qualified in R${rNum}`;
                        thisRoundBg = '#FEE2E2';
                        thisRoundColor = '#DC2626';
                      } else if (isOverallSelected) {
                        thisRoundStatusText = '🏆 Selected • Offer Issued';
                        thisRoundBg = '#DCFCE7';
                        thisRoundColor = '#15803D';
                      } else if (currAppRound > rNum) {
                        thisRoundStatusText = `✓ Cleared Round ${rNum}`;
                        thisRoundBg = '#DCFCE7';
                        thisRoundColor = '#15803D';
                      } else if (currAppRound === rNum) {
                        thisRoundStatusText = `⏳ In Progress (Round ${rNum})`;
                        thisRoundBg = '#EFF6FF';
                        thisRoundColor = '#2563EB';
                      } else {
                        thisRoundStatusText = `⚪ Pending Round ${currAppRound} Clearance`;
                        thisRoundBg = '#F1F5F9';
                        thisRoundColor = '#64748B';
                      }

                      const canAdvance = !isOverallRejected && !isOverallSelected && currAppRound === rNum;

                      return (
                        <View key={appId} style={styles.evaluatorCandidateCard}>
                          <View style={styles.evaluatorTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.evaluatorStudentName}>{app.student}</Text>
                              <Text style={styles.evaluatorStudentMeta}>
                                Reg No: {app.regNo} • CGPA: {app.cgpa ?? '8.0'}
                              </Text>
                            </View>
                            <View style={[styles.rosterStatusBadge, { backgroundColor: thisRoundBg }]}>
                              <Text style={[styles.rosterStatusBadgeText, { color: thisRoundColor }]}>
                                {thisRoundStatusText}
                              </Text>
                            </View>
                          </View>

                          {/* Evaluator Actions */}
                          <View style={styles.evaluatorActionsRow}>
                            {canAdvance && (
                              <TouchableOpacity
                                style={[
                                  styles.advanceBtn,
                                  updatingCandidateId === appId && { opacity: 0.7 },
                                ]}
                                onPress={() => handleUpdateCandidateRound(app, 'advance')}
                                disabled={updatingCandidateId === appId}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.advanceBtnText}>
                                  {isFinalRound ? '🏆 Issue Offer' : `✓ Advance to R${rNum + 1}`}
                                </Text>
                              </TouchableOpacity>
                            )}

                            {canAdvance && (
                              <TouchableOpacity
                                style={styles.eliminateBtn}
                                onPress={() => handleUpdateCandidateRound(app, 'reject')}
                                disabled={updatingCandidateId === appId}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.eliminateBtnText}>✕ Eliminate</Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              style={styles.historyBtn}
                              onPress={() => setHistoryCandidate(app)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.historyBtnText}>Audit History</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Candidate Audit History Modal */}
      {Boolean(historyCandidate) && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setHistoryCandidate(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.historyModalCard}>
              <View style={styles.historyModalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyModalTitle}>{historyCandidate.student}</Text>
                  <Text style={styles.historyModalSubtitle}>
                    Reg: {historyCandidate.regNo} • {historyCandidate.company}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setHistoryCandidate(null)}>
                  <Text style={{ fontSize: 16, color: '#64748B', fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 340 }}>
                <Text style={styles.historySectionLabel}>Round-by-Round Audit:</Text>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {currentJobRounds.map((r: any, idx: number) => {
                    const rNum = idx + 1;
                    const ev = historyCandidate.roundEvaluations?.[r.name] || {};
                    const isSelected = historyCandidate.status === 'Selected';
                    const isRejected = historyCandidate.status === 'Rejected';
                    const currRound = Number(historyCandidate.currentRound || 1);

                    let status = 'Pending';
                    let color = '#64748B';

                    if (currRound > rNum || ev.status === 'Qualified' || (isSelected && rNum < currentJobRounds.length)) {
                      status = '✓ Qualified';
                      color = '#15803D';
                    } else if (isSelected && (rNum === currentJobRounds.length || ev.status === 'Selected')) {
                      status = '🏆 Offer Issued';
                      color = '#15803D';
                    } else if (currRound === rNum && isRejected) {
                      status = '✕ Eliminated';
                      color = '#DC2626';
                    } else if (currRound === rNum) {
                      status = '⏳ In Progress';
                      color = '#2563EB';
                    }

                    return (
                      <View key={idx} style={styles.historyItemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyItemName}>{r.name}</Text>
                          <Text style={styles.historyItemType}>{r.type}</Text>
                        </View>
                        <Text style={[styles.historyItemStatus, { color }]}>{status}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity style={styles.historyCloseBtn} onPress={() => setHistoryCandidate(null)}>
                <Text style={styles.historyCloseBtnText}>Close Audit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  driveCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
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
  roundsBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roundsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  driveCompanyText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  driveRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  driveLocationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  specsStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginTop: 10,
  },
  specColumn: {
    flex: 1,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  specValueSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  specDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  driveActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  notifyBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  notifyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  inspectEvaluatorBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  inspectEvaluatorBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
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
    marginTop: 6,
  },
  searchBoxInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    fontWeight: '700',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  rosterCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  rosterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rosterName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  rosterRegNo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  rosterStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rosterStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rosterArrearsDetailBox: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rosterArrearsDetailTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  rosterArrearsDetailItem: {
    fontSize: 10,
    color: '#B91C1C',
    fontWeight: '600',
  },
  appTrackingCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  appTrackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appTrackingStudent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  appTrackingReg: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  appTrackingCompany: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 6,
  },
  appTrackingDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  interviewCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  interviewTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  interviewCandidateName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  interviewCompanyRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
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
  interviewMetaStrip: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 3,
  },
  interviewMetaText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 8,
  },
  jobPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jobPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  jobPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  jobPillTextActive: {
    color: '#2563EB',
  },
  roundStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roundStepPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roundStepPillNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 18,
  },
  roundStepPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  roundStepPillTextActive: {
    color: '#FFFFFF',
  },
  finalRoundPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  finalRoundPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  roundDetailsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginTop: 8,
  },
  roundDetailsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundDetailsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E40AF',
  },
  roundTypeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roundTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
  },
  roundDetailsSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 4,
    lineHeight: 15,
  },
  sectionMinorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  evaluatorCandidateCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  evaluatorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  evaluatorStudentName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  evaluatorStudentMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  evaluatorActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  advanceBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  advanceBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  eliminateBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  eliminateBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  historyBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  historyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 10,
  },
  historyModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  historyModalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  historySectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  historyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  historyItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyItemType: {
    fontSize: 10,
    color: '#64748B',
  },
  historyItemStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyCloseBtn: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  historyCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
