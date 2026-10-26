import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export type PlacementStageModalProps = {
  visible: boolean;
  onClose: () => void;
  job: any | null;
  application?: any | null;
  studentEligibility?: {
    cgpa: number;
    arrears: number;
    attendance: number | string;
    dept: string;
    isEligible: boolean;
  };
  onApply?: (job: any) => void;
  isApplied?: boolean;
  applying?: boolean;
};

export default function PlacementStageModal({
  visible,
  onClose,
  job,
  application,
  studentEligibility,
  onApply,
  isApplied = false,
  applying = false,
}: PlacementStageModalProps) {
  if (!visible || !job) return null;

  const company = job.company || job.companyName || 'Corporate Partner';
  const role = job.role || job.designation || 'Graduate Trainee';
  const ctc = job.ctc || job.package || '4.5 LPA';
  const location = job.location || 'Campus / Multiple Locations';
  const deadline = job.deadline
    ? new Date(job.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Open';
  const minCgpa = job.minCgpa ?? (job.eligibility?.match(/CGPA.*?([0-9.]+)/i)?.[1] || '6.0');
  const maxArrears = job.maxArrears ?? 0;
  const eligibleDepts = Array.isArray(job.eligibleDepartments) && job.eligibleDepartments.length > 0
    ? job.eligibleDepartments.join(', ')
    : 'All Engineering & Arts Streams';

  // Construct Rounds
  const totalRounds = Number(job.totalRounds) || (Array.isArray(job.rounds) ? job.rounds.length : 3);
  const defaultPresets = [
    {
      name: 'Round 1: Online Aptitude & Logic Assessment',
      type: 'Aptitude & Reasoning',
      description: 'Preliminary screening assessment evaluating quantitative logic, reasoning capability, verbal comprehension, and problem-solving speed under timed constraints.',
      steps: ['Quantitative & Verbal Test', 'Logical Reasoning Section', 'Automated Cut-Off Benchmark'],
      criteria: ['Speed & Accuracy (≥ 70%)', 'Analytical Logic', 'Negative Marking Clearance'],
    },
    {
      name: 'Round 2: Technical & Domain Coding Evaluation',
      type: 'Technical Problem Solving',
      description: 'Hands-on technical assessment evaluating data structures, algorithmic coding, system architecture, core engineering concepts, and live problem-solving.',
      steps: ['Live Algorithmic Challenge', 'Data Structures & Code Optimization', 'Technical Architecture Interview'],
      criteria: ['Code Efficiency & Complexity', 'Core Domain Competency', 'Debugging & Architecture Knowledge'],
    },
    {
      name: 'Round 3: Behavioral & HR Leadership Round',
      type: 'HR & Cultural Fitment',
      description: 'Comprehensive behavioral evaluation assessing professional communication, team dynamics, leadership fitment, work ethics, and final package confirmation.',
      steps: ['Behavioral Competency Evaluation', 'Corporate Culture & Values Alignment', 'Final Offer Confirmation & Rollout'],
      criteria: ['Professional Communication', 'Organizational Fitment', 'Career Aspirations & Adaptability'],
    },
    {
      name: 'Round 4: Management & Executive Discussion',
      type: 'Executive Review',
      description: 'Senior leadership interaction for role alignment, project allocations, and compensation structure finalization.',
      steps: ['Executive Interaction', 'Project Alignment', 'Direct Offer Handover'],
      criteria: ['Leadership Potential', 'Domain Preparedness', 'Long-term Commitment'],
    },
  ];

  const rounds = Array.isArray(job.rounds) && job.rounds.length > 0
    ? job.rounds.map((r: any, idx: number) => ({
        name: r.name || `Round ${idx + 1}: Assessment Stage`,
        type: r.type || (idx === 0 ? 'Aptitude' : idx === totalRounds - 1 ? 'HR' : 'Technical'),
        description: r.description || defaultPresets[idx]?.description || 'Corporate recruitment evaluation stage.',
        steps: r.steps || defaultPresets[idx]?.steps || ['Candidate Evaluation', 'Recruiter Review', 'Progression Recommendation'],
        criteria: r.criteria || defaultPresets[idx]?.criteria || ['Domain Competence', 'Clarity of Thought', 'Benchmark Clearance'],
      }))
    : defaultPresets.slice(0, totalRounds);

  // Application current progress
  const currentRoundNum = Number(application?.currentRound || 1);
  const appStatus = application?.status || 'Eligible';
  const isSelected = appStatus === 'Selected';
  const isRejected = appStatus === 'Rejected';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.companyRow}>
                <View style={styles.logoBadge}>
                  <Text style={styles.logoBadgeText}>{company.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyTitle} numberOfLines={1}>{company}</Text>
                  <Text style={styles.roleSubtitle} numberOfLines={1}>{role}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Package & Key Meta Strip */}
            <View style={styles.metaStripCard}>
              <View style={styles.metaColumn}>
                <Text style={styles.metaLabel}>Package CTC</Text>
                <Text style={styles.metaValueHighlight}>{ctc}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaColumn}>
                <Text style={styles.metaLabel}>Min CGPA</Text>
                <Text style={styles.metaValue}>{minCgpa}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaColumn}>
                <Text style={styles.metaLabel}>Max Arrears</Text>
                <Text style={[styles.metaValue, { color: maxArrears === 0 ? '#10B981' : '#EF4444' }]}>
                  {maxArrears === 0 ? '0 Allowed' : `≤ ${maxArrears}`}
                </Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaColumn}>
                <Text style={styles.metaLabel}>Deadline</Text>
                <Text style={styles.metaValueSmall}>{deadline}</Text>
              </View>
            </View>

            {/* Application Live Status Banner (if applied) */}
            {isApplied && (
              <View
                style={[
                  styles.statusBanner,
                  isSelected
                    ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }
                    : isRejected
                    ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                    : { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.statusBannerTitle,
                      isSelected ? { color: '#065F46' } : isRejected ? { color: '#991B1B' } : { color: '#1E40AF' },
                    ]}
                  >
                    {isSelected
                      ? '🏆 Congratulations! Official Offer Confirmed'
                      : isRejected
                      ? `✕ Evaluation Closed (Stage ${currentRoundNum})`
                      : `⏳ Application Active • Round ${currentRoundNum}`}
                  </Text>
                  <Text style={styles.statusBannerSubtitle}>
                    {isSelected
                      ? `Candidate selected for ${role} with package ${ctc}. Document verification pending.`
                      : isRejected
                      ? 'Eliminated during round progression. Best wishes for upcoming recruitment drives.'
                      : `Current Stage: ${rounds[currentRoundNum - 1]?.name || `Round ${currentRoundNum}`}.`}
                  </Text>
                </View>
              </View>
            )}

            {/* Eligibility Check Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>🎯</Text>
                <Text style={styles.sectionTitle}>Eligibility Criteria Breakdown</Text>
              </View>

              <View style={styles.criteriaList}>
                <View style={styles.criteriaItem}>
                  <Text style={styles.criteriaCheckIcon}>
                    {studentEligibility && studentEligibility.cgpa >= Number(minCgpa) ? '✓' : '•'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.criteriaText}>
                      Academic Aggregate: <Text style={styles.criteriaBold}>Min {minCgpa} CGPA</Text>
                    </Text>
                    {studentEligibility && (
                      <Text style={styles.criteriaSubText}>
                        Your Current CGPA: {studentEligibility.cgpa.toFixed(2)} (
                        {studentEligibility.cgpa >= Number(minCgpa) ? 'Eligible' : 'Below threshold'})
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.criteriaItem}>
                  <Text style={styles.criteriaCheckIcon}>
                    {studentEligibility && studentEligibility.arrears <= Number(maxArrears) ? '✓' : '•'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.criteriaText}>
                      Arrear Clearance: <Text style={styles.criteriaBold}>Max {maxArrears} Standing Arrear</Text>
                    </Text>
                    {studentEligibility && (
                      <Text style={styles.criteriaSubText}>
                        Your Standing Arrears: {studentEligibility.arrears} (
                        {studentEligibility.arrears <= Number(maxArrears) ? 'Clear' : 'Pending Clearance'})
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.criteriaItem}>
                  <Text style={styles.criteriaCheckIcon}>✓</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.criteriaText}>
                      Eligible Streams: <Text style={styles.criteriaBold}>{eligibleDepts}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.criteriaItem}>
                  <Text style={styles.criteriaCheckIcon}>📍</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.criteriaText}>
                      Location / Mode: <Text style={styles.criteriaBold}>{location}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Complete Selection Timeline & Stepper */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionIcon}>⚡</Text>
                <Text style={styles.sectionTitle}>Selection Process & Round Stepper</Text>
              </View>

              <View style={styles.timelineContainer}>
                {rounds.map((round: any, idx: number) => {
                  const rNum = idx + 1;
                  const isPast = isSelected || currentRoundNum > rNum;
                  const isCurrent = !isSelected && !isRejected && currentRoundNum === rNum;
                  const isEliminatedHere = isRejected && currentRoundNum === rNum;
                  const isFuture = !isPast && !isCurrent && !isEliminatedHere;

                  return (
                    <View key={idx} style={styles.timelineStepRow}>
                      {/* Left Stepper Indicator */}
                      <View style={styles.stepIndicatorColumn}>
                        <View
                          style={[
                            styles.stepNode,
                            isPast && styles.stepNodeCompleted,
                            isCurrent && styles.stepNodeCurrent,
                            isEliminatedHere && styles.stepNodeEliminated,
                            isFuture && styles.stepNodeFuture,
                          ]}
                        >
                          <Text
                            style={[
                              styles.stepNodeText,
                              (isPast || isCurrent || isEliminatedHere) && { color: '#FFFFFF' },
                            ]}
                          >
                            {isPast ? '✓' : isEliminatedHere ? '✕' : String(rNum)}
                          </Text>
                        </View>
                        {idx < rounds.length - 1 && (
                          <View
                            style={[
                              styles.stepConnectorLine,
                              isPast && { backgroundColor: '#10B981' },
                            ]}
                          />
                        )}
                      </View>

                      {/* Right Round Details Card */}
                      <View style={styles.stepContentCard}>
                        <View style={styles.stepHeaderRow}>
                          <Text style={styles.stepRoundBadge}>STAGE {rNum}</Text>
                          <View
                            style={[
                              styles.stepStatusPill,
                              isPast
                                ? { backgroundColor: '#DCFCE7' }
                                : isCurrent
                                ? { backgroundColor: '#DBEAFE' }
                                : isEliminatedHere
                                ? { backgroundColor: '#FEE2E2' }
                                : { backgroundColor: '#F1F5F9' },
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepStatusPillText,
                                isPast
                                  ? { color: '#15803D' }
                                  : isCurrent
                                  ? { color: '#1E40AF' }
                                  : isEliminatedHere
                                  ? { color: '#DC2626' }
                                  : { color: '#64748B' },
                              ]}
                            >
                              {isPast
                                ? 'Cleared'
                                : isCurrent
                                ? 'Active Stage'
                                : isEliminatedHere
                                ? 'Eliminated'
                                : 'Upcoming'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.stepTitle}>{round.name}</Text>
                        <Text style={styles.stepType}>{round.type}</Text>
                        <Text style={styles.stepDesc}>{round.description}</Text>

                        {/* Steps */}
                        <View style={styles.stepSubBlock}>
                          <Text style={styles.stepSubBlockTitle}>Process Flow:</Text>
                          {round.steps?.map((st: string, sIdx: number) => (
                            <Text key={sIdx} style={styles.stepBulletItem}>
                              • {st}
                            </Text>
                          ))}
                        </View>

                        {/* Benchmark Criteria */}
                        <View style={styles.stepSubBlock}>
                          <Text style={styles.stepSubBlockTitle}>Evaluation Benchmarks:</Text>
                          {round.criteria?.map((cr: string, cIdx: number) => (
                            <Text key={cIdx} style={styles.stepBulletItem}>
                              🎯 {cr}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Bottom Spacer */}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={styles.sheetFooter}>
            {isApplied ? (
              <View style={styles.appliedFooterRow}>
                <View style={styles.appliedConfirmBadge}>
                  <Text style={styles.appliedConfirmBadgeText}>
                    ✓ Applied on {application?.appliedDate || 'This Session'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.closeFooterBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.unappliedFooterRow}>
                <TouchableOpacity style={styles.closeGhostBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.closeGhostBtnText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applyPrimaryBtn, applying && { opacity: 0.7 }]}
                  onPress={() => onApply && onApply(job)}
                  disabled={applying}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyPrimaryBtnText}>
                    {applying ? 'Submitting Application...' : 'Apply for this Drive (₹0 Fee) →'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  companyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleSubtitle: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '800',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  metaStripCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  metaColumn: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaValueSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  metaDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  statusBannerSubtitle: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  criteriaList: {
    gap: 10,
  },
  criteriaItem: {
    flexDirection: 'row',
    gap: 10,
  },
  criteriaCheckIcon: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '800',
    marginTop: 2,
  },
  criteriaText: {
    fontSize: 12,
    color: '#334155',
  },
  criteriaBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  criteriaSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  stepIndicatorColumn: {
    alignItems: 'center',
    width: 28,
  },
  stepNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepNodeCompleted: {
    backgroundColor: '#10B981',
  },
  stepNodeCurrent: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNodeEliminated: {
    backgroundColor: '#EF4444',
  },
  stepNodeFuture: {
    backgroundColor: '#E2E8F0',
  },
  stepNodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  stepContentCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepRoundBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  stepType: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  stepDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 6,
    lineHeight: 16,
  },
  stepSubBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  stepSubBlockTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  stepBulletItem: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  appliedFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  appliedConfirmBadge: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  appliedConfirmBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  closeFooterBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  closeFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  unappliedFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeGhostBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  closeGhostBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  applyPrimaryBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  applyPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
