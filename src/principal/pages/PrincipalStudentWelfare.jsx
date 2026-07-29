import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Award,
  BookOpen,
  CalendarCheck,
  AlertOctagon,
  Search,
  CheckCircle,
  Eye,
  UserCheck,
  Calendar,
  Send,
  X,
  Sparkles,
  Mail,
  Activity,
  Heart,
  HelpCircle,
  ClipboardList
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { io } from 'socket.io-client';
import { getWelfareRecords, updateWelfareRecord, approveScholarship } from '../../api/index.js';
import '../../pages/Dashboard.css';

// Seed data representing active student discipline, complaints & welfare cases
const initialCases = [
  {
    id: 1,
    studentName: 'Rohan Sharma',
    department: 'CSE Department',
    issueType: 'Disciplinary',
    reportedBy: 'HOD CSE',
    priority: 'High',
    status: 'Counselor Assigned',
    date: '2026-05-24',
    description: 'Caught with unauthorized study materials during mid-semester examinations. Secondary misconduct reported by floor coordinator.',
    timeline: [
      { date: '2026-05-24', text: 'Misconduct incident reported by HOD CSE' },
      { date: '2026-05-25', text: 'Principal issued formal inquiry request' },
      { date: '2026-05-26', text: 'Counselor assigned for behavioral counseling assessment' }
    ]
  },
  {
    id: 2,
    studentName: 'Ananya Sen',
    department: 'ECE Department',
    issueType: 'Scholarship',
    reportedBy: 'Accounts Board',
    priority: 'Medium',
    status: 'Resolved',
    date: '2026-05-20',
    description: 'Application for Merit-cum-Means annual institutional fee waiver. Academic record verified at 9.4 CGPA.',
    timeline: [
      { date: '2026-05-20', text: 'Scholarship application compiled by registrar' },
      { date: '2026-05-21', text: 'Document and grade parameters approved by financial committee' },
      { date: '2026-05-23', text: 'Annual fee waiver disbursement successfully cleared' }
    ]
  },
  {
    id: 3,
    studentName: 'Karan Malhotra',
    department: 'MECH Department',
    issueType: 'Anti-Ragging',
    reportedBy: 'Student Welfare',
    priority: 'High',
    status: 'Under Investigation',
    date: '2026-05-25',
    description: 'First-year student lodged complaint regarding verbal intimidation by sophomores near the engineering lab block.',
    timeline: [
      { date: '2026-05-25', text: 'Hostel warden submitted report to Welfare Board' },
      { date: '2026-05-26', text: 'Anti-ragging cell mobilized for campus security footage inspection' }
    ]
  },
  {
    id: 4,
    studentName: 'Sneha Patil',
    department: 'CSE Department',
    issueType: 'Counseling',
    reportedBy: 'Self-referred',
    priority: 'Low',
    status: 'Scheduled',
    date: '2026-05-26',
    description: 'Requested professional guidance regarding high academic stress levels and time-management issues.',
    timeline: [
      { date: '2026-05-26', text: 'Mental health assessment request submitted' },
      { date: '2026-05-27', text: 'Weekly session scheduled with Dr. Asha Roy' }
    ]
  },
  {
    id: 5,
    studentName: 'Vikram Joshi',
    department: 'EEE Department',
    issueType: 'Complaint',
    reportedBy: 'Junior Student',
    priority: 'High',
    status: 'Pending',
    date: '2026-05-26',
    description: 'Reported persistent safety violations in electrical machine laboratory and inadequate presence of lab assistants.',
    timeline: [
      { date: '2026-05-26', text: 'Lab infrastructure safety complaint registered' }
    ]
  },
  {
    id: 6,
    studentName: 'Meera Nair',
    department: 'ECE Department',
    issueType: 'Behavior',
    reportedBy: 'Hostels Warden',
    priority: 'Medium',
    status: 'Under Investigation',
    date: '2026-05-22',
    description: 'Found staying out of hostel dorms past permitted hours on multiple weekends without prior authorization.',
    timeline: [
      { date: '2026-05-22', text: 'Curfew infraction notice flagged by warden' },
      { date: '2026-05-23', text: 'First warning notification sent to parents' }
    ]
  }
];

// Anonymous Complaint Inbox data
const initialAnonymousComplaints = [
  { id: 101, subject: 'Hostel mess hygiene issue', date: '2026-05-25', description: 'Kitchen staff not wearing gloves and hairnets regularly. Food quality is declining.', status: 'Pending' },
  { id: 102, subject: 'Library wifi connectivity lag', date: '2026-05-23', description: 'Second-floor study wing lacks stable internet connection. Signal drops repeatedly during exams.', status: 'Resolved' },
  { id: 103, subject: 'Lab equipment safety check', date: '2026-05-26', description: 'A few terminals in the chemistry lab have loose electrical wiring. Requires urgent repair.', status: 'Pending' }
];

// Recharts analytical metrics
const wellnessData = [
  { semester: 'Sem 1', wellnessIndex: 78, casesHandled: 12 },
  { semester: 'Sem 2', wellnessIndex: 82, casesHandled: 9 },
  { semester: 'Sem 3', wellnessIndex: 80, casesHandled: 15 },
  { semester: 'Sem 4', wellnessIndex: 85, casesHandled: 8 },
  { semester: 'Sem 5', wellnessIndex: 88, casesHandled: 5 }
];

const departmentIncidentData = [
  { name: 'CSE', Disciplinary: 4, Complaints: 2, AntiRagging: 0 },
  { name: 'ECE', Disciplinary: 1, Complaints: 3, AntiRagging: 1 },
  { name: 'MECH', Disciplinary: 3, Complaints: 1, AntiRagging: 2 },
  { name: 'EEE', Disciplinary: 2, Complaints: 2, AntiRagging: 1 }
];

export default function PrincipalStudentWelfare() {
  const [cases, setCases] = useState([]);

  const [anonymousComplaints, setAnonymousComplaints] = useState(() => {
    const saved = localStorage.getItem(`principal_anonymous_complaints_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    return saved ? JSON.parse(saved) : initialAnonymousComplaints;
  });

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await getWelfareRecords();
        setCases(res.data.map(item => ({...item, id: item._id})));
      } catch (err) {
        console.warn('Failed to fetch welfare records', err);
        setCases(initialCases); // fallback
      }
    };
    
    fetchCases();
    
    const socket = io('http://localhost:5000');
    socket.on('welfareUpdated', fetchCases);
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    localStorage.setItem(`principal_anonymous_complaints_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(anonymousComplaints));
  }, [anonymousComplaints]);

  // Tab management
  const [activeTab, setActiveTab] = useState('disciplinary'); // 'disciplinary', 'wellness-analytics', 'anonymous'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssueType, setSelectedIssueType] = useState('All');

  // Modal displays
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showCounselorModal, setShowCounselorModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showScholarshipModal, setShowScholarshipModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Forms inputs
  const [counselorData, setCounselorData] = useState({
    counselorName: 'Dr. Asha Roy',
    urgency: 'Medium',
    instruction: ''
  });

  const [meetingData, setMeetingData] = useState({
    date: '2026-06-03',
    time: '11:00',
    venue: 'Principal Office Conference Wing',
    agenda: ''
  });

  const [warningData, setWarningData] = useState({
    parentEmail: '',
    warningText: ''
  });

  const [scholarshipData, setScholarshipData] = useState({
    name: 'Merit Scholarship',
    amount: 20000
  });

  const [replyText, setReplyText] = useState('');

  const [emergencyAlertText, setEmergencyAlertText] = useState('');
  const [restrictedAction, setRestrictedAction] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Activity log tracking
  const [welfareLogs, setWelfareLogs] = useState([
    { time: '14:20', msg: 'Principal reviewed anti-ragging response files.' },
    { time: '11:05', msg: 'Scholarship waivers compiled and cleared.' },
    { time: '09:30', msg: 'Welfare board completed safety audits of hostels.' }
  ]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setWelfareLogs(prev => [{ time, msg }, ...prev]);
  };

  // Filter logic
  const filteredCases = cases.filter(c => {
    const matchesSearch = c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.reportedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.issueType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedIssueType === 'All' || c.issueType === selectedIssueType;
    return matchesSearch && matchesType;
  });

  const pendingComplaintsCount = cases.filter(c => c.status === 'Pending').length + anonymousComplaints.filter(a => a.status === 'Pending').length;
  const activeDisciplineCount = cases.filter(c => c.issueType === 'Disciplinary' && c.status !== 'Resolved').length;
  const activeCounselingCount = cases.filter(c => c.issueType === 'Counseling').length;
  const scholarshipCount = cases.filter(c => c.issueType === 'Scholarship').length;
  const highRiskCount = cases.filter(c => c.priority === 'High' && c.status !== 'Resolved').length;
  const parentMeetingsCount = 2; // simulated count

  // Handler triggers
  const handleOpenCounselor = (c) => {
    setSelectedCase(c);
    setCounselorData({
      counselorName: 'Dr. Asha Roy',
      urgency: c.priority,
      instruction: `Please schedule a behavioral monitoring and academic stress analysis session with ${c.studentName}.`
    });
    setShowCounselorModal(true);
  };

  const assignCounselorAction = async (e) => {
    e.preventDefault();
    const newTimelineEntry = { date: new Date().toISOString().split('T')[0], text: `Assigned counselor ${counselorData.counselorName} (Urgency: ${counselorData.urgency})` };
    const updatedTimeline = [...(selectedCase.timeline || []), newTimelineEntry];
    
    try {
      await updateWelfareRecord(selectedCase.id, {
        status: 'Counselor Assigned',
        timeline: updatedTimeline
      });
      addLog(`Principal allocated counselor ${counselorData.counselorName} for student ${selectedCase.studentName}.`);
      setShowCounselorModal(false);
      triggerToast(`🧑‍⚕️ Counselor assigned to ${selectedCase.studentName} successfully!`);
    } catch (err) {
      triggerToast('❌ Failed to update record');
    }
  };

  const handleOpenParentMeeting = (c) => {
    setSelectedCase(c);
    setMeetingData({
      date: '2026-06-03',
      time: '11:00',
      venue: 'Principal Office Conference Wing',
      agenda: `Urgent parent meeting regarding student ${c.studentName}'s recent ${c.issueType} report (${c.description.substring(0, 50)}...).`
    });
    setShowMeetingModal(true);
  };

  const scheduleParentMeetingAction = async (e) => {
    e.preventDefault();
    const newTimelineEntry = { date: new Date().toISOString().split('T')[0], text: `Parent meeting scheduled at ${meetingData.venue} on ${meetingData.date}` };
    const updatedTimeline = [...(selectedCase.timeline || []), newTimelineEntry];
    
    try {
      await updateWelfareRecord(selectedCase.id, {
        status: 'Scheduled',
        timeline: updatedTimeline
      });
      addLog(`Principal scheduled parent-disciplinary board meeting for student ${selectedCase.studentName}.`);
      setShowMeetingModal(false);
      triggerToast(`📅 Parent meeting scheduled. Invitation sent to parents!`);
    } catch (err) {
      triggerToast('❌ Failed to schedule meeting');
    }
  };

  const handleOpenWarning = (c) => {
    setSelectedCase(c);
    setWarningData({
      parentEmail: `${c.studentName.toLowerCase().replace(/\s+/g, '')}.parent@email.com`,
      warningText: `Dear Parent,\n\nWe are writing to notify you of an institutional review regarding ${c.studentName} of the ${c.department}.\n\nSpecifically, the student has been reported for: "${c.description}".\n\nPlease ensure this behavior is optimized. Repeated actions will warrant direct disciplinary suspension.\n\nBest regards,\nOffice of the Principal`
    });
    setShowWarningModal(true);
  };

  const sendWarningAction = async (e) => {
    e.preventDefault();
    const newTimelineEntry = { date: new Date().toISOString().split('T')[0], text: `Official warning dispatch sent to parent (${warningData.parentEmail})` };
    const updatedTimeline = [...(selectedCase.timeline || []), newTimelineEntry];
    
    try {
      await updateWelfareRecord(selectedCase.id, { timeline: updatedTimeline });
      addLog(`Principal sent parental warning notice for student ${selectedCase.studentName}.`);
      setShowWarningModal(false);
      triggerToast(`✉️ Disciplinary Warning dispatched to parent mailbox!`);
    } catch (err) {
      triggerToast('❌ Failed to dispatch warning');
    }
  };

  const resolveCaseAction = async (c) => {
    const newTimelineEntry = { date: new Date().toISOString().split('T')[0], text: 'Case marked as RESOLVED by the Principal' };
    const updatedTimeline = [...(c.timeline || []), newTimelineEntry];
    
    try {
      await updateWelfareRecord(c.id, {
        status: 'Resolved',
        timeline: updatedTimeline
      });
      addLog(`Principal marked welfare/disciplinary case of ${c.studentName} as Resolved.`);
      triggerToast(`✅ Case resolved for student ${c.studentName}!`);
    } catch (err) {
      triggerToast('❌ Failed to resolve case');
    }
  };

  const handleOpenScholarship = (c) => {
    setSelectedCase(c);
    setScholarshipData({ name: 'Merit Scholarship', amount: 20000 });
    setShowScholarshipModal(true);
  };

  const approveScholarshipAction = async (e) => {
    e.preventDefault();
    try {
      await approveScholarship(selectedCase.id, {
        studentId: 'CS2022001', // Fallback
        name: scholarshipData.name,
        amount: Number(scholarshipData.amount)
      });
      addLog(`Principal approved ${scholarshipData.name} of ₹${scholarshipData.amount} for ${selectedCase.studentName}.`);
      setShowScholarshipModal(false);
      triggerToast(`🎉 Scholarship approved! Fee recalculated in Accounts.`);
    } catch (err) {
      triggerToast('❌ Failed to approve scholarship');
    }
  };

  const rejectScholarshipAction = async (c) => {
    const newTimelineEntry = { date: new Date().toISOString().split('T')[0], text: 'Scholarship request was REJECTED by the Principal' };
    const updatedTimeline = [...(c.timeline || []), newTimelineEntry];
    
    try {
      await updateWelfareRecord(c.id, {
        status: 'Rejected',
        timeline: updatedTimeline
      });
      addLog(`Principal rejected scholarship request for ${c.studentName}.`);
      triggerToast(`❌ Scholarship rejected.`);
    } catch (err) {
      triggerToast('❌ Failed to reject case');
    }
  };

  const handleOpenReply = (c) => {
    setSelectedCase(c);
    setReplyText('');
    setShowReplyModal(true);
  };

  const addReplyAction = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    const newTimelineEntry = { 
      date: new Date().toISOString().split('T')[0], 
      text: `Principal Reply: ${replyText}` 
    };
    
    const updatedTimeline = [...(selectedCase.timeline || []), newTimelineEntry];
    
    try {
      await updateWelfareRecord(selectedCase.id, {
        status: 'Under Review', // Change status to show it's being handled
        timeline: updatedTimeline
      });
      addLog(`Principal replied to ${selectedCase.studentName}'s request.`);
      setShowReplyModal(false);
      triggerToast(`💬 Reply sent to student successfully!`);
    } catch (err) {
      triggerToast('❌ Failed to send reply');
    }
  };

  // Anonymous complaints helpers
  const resolveAnonymousAction = (id) => {
    setAnonymousComplaints(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: 'Resolved' };
      }
      return item;
    }));
    addLog(`Principal resolved anonymous ticket #${id}.`);
    triggerToast(`✅ Anonymous complaint resolved successfully!`);
  };

  // Emergency Alert simulator
  const handleTriggerEmergencyAlert = (e) => {
    e.preventDefault();
    if (!emergencyAlertText.trim()) return;
    addLog(`⚠️ EMERGENCY BROADCAST SYSTEM TRIGGERED: "${emergencyAlertText}"`);
    triggerToast(`🚨 Emergency Alert Broadcast sent to all students and staff!`);
    setEmergencyAlertText('');
  };

  const triggerRestriction = (action) => {
    setRestrictedAction(action);
    setShowRestrictionModal(true);
  };

  return (
    <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      
      {/* Toast popup alerts */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px',
          backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)',
          padding: '1rem 1.5rem', borderRadius: '10px', boxShadow: 'var(--shadow-lg)',
          zIndex: 99999, display: 'flex', alignItems: 'center', gap: '8px',
          borderLeft: '4px solid var(--success)', animation: 'fadeIn 0.3s ease-out'
        }}>
          <Sparkles size={18} className="text-[#10b981]" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert style={{ color: '#3730A5' }} size={28} /> Student Welfare & Discipline Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Coordinate counseling sessions, resolve anonymous campus feedback, monitor anti-ragging programs, and track student disciplinary cases.
          </p>
        </div>

        {/* Oversight Bounds Info */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5' }}>
          <AlertOctagon size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Access Level</span>
            <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Principal Account - Executive Officer</strong>
          </div>
        </div>
      </div>

      {/* VIEW TABS SELECTOR */}
      <div className="glass-card mb-6" style={{ padding: '0.4rem', borderRadius: '12px', display: 'inline-flex', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('disciplinary')}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeTab === 'disciplinary' ? '#3730A5' : 'transparent',
            color: activeTab === 'disciplinary' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
          }}
        >
          🚨 Disciplinary & Welfare Cases
        </button>
        <button
          onClick={() => setActiveTab('wellness-analytics')}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeTab === 'wellness-analytics' ? '#3730A5' : 'transparent',
            color: activeTab === 'wellness-analytics' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
          }}
        >
          📈 Student Wellness Analytics
        </button>
        <button
          onClick={() => setActiveTab('anonymous')}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeTab === 'anonymous' ? '#3730A5' : 'transparent',
            color: activeTab === 'anonymous' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          <MessageSquare size={14} /> Anonymous Inbox
        </button>
      </div>

      {/* --- DASHBOARD STATS CARDS --- */}
      <div className="stats-grid mb-6 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FCEBEB', color: 'var(--danger)' }}><AlertOctagon size={18} /></div>
          <div className="stat-details">
            <h3>Disciplinary Cases</h3>
            <p className="stat-value">{activeDisciplineCount}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active records</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FAEEDA', color: 'var(--warning)' }}><MessageSquare size={18} /></div>
          <div className="stat-details">
            <h3>Pending Complaints</h3>
            <p className="stat-value">{pendingComplaintsCount}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Needs attention</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><UserCheck size={18} /></div>
          <div className="stat-details">
            <h3>Counseling Sessions</h3>
            <p className="stat-value">{activeCounselingCount}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ongoing</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Award size={18} /></div>
          <div className="stat-details">
            <h3>Scholarship Waiver</h3>
            <p className="stat-value">{scholarshipCount}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Welfare beneficiaries</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FCEBEB', color: 'var(--danger)' }}><Heart size={18} /></div>
          <div className="stat-details">
            <h3>High Risk Cases</h3>
            <p className="stat-value" style={{ color: '#db2777' }}>{highRiskCount}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>Action Required</span>
          </div>
        </div>

      </div>

      {/* --- TAB VIEW: DISCIPLINARY & WELFARE CASES --- */}
      {activeTab === 'disciplinary' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7.5fr) minmax(0, 2.5fr)', gap: '1.5rem' }}>
          
          {/* Main Incidents Table */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            
            {/* Table Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="flex gap-2">
                {['All', 'Disciplinary', 'Anti-Ragging', 'Counseling', 'Scholarship', 'Behavior'].map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedIssueType(type)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                      backgroundColor: selectedIssueType === type ? 'var(--primary)' : 'transparent',
                      color: selectedIssueType === type ? 'white' : 'var(--text-muted)',
                      border: selectedIssueType === type ? 'none' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem 0.5rem 2.2rem', borderRadius: '8px', fontSize: '0.85rem',
                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)',
                    width: '180px'
                  }}
                />
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Datagrid */}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>Issue Type</th>
                    <th>Reported By</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No welfare or discipline cases match selected parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedCase(c)}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.studentName}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Date: {c.date}</span>
                        </td>
                        <td>{c.department.replace(' Department', '')}</td>
                        <td>
                          <span style={{
                            backgroundColor: c.issueType === 'Disciplinary' || c.issueType === 'Anti-Ragging' ? 'rgba(239, 68, 68, 0.08)' : c.issueType === 'Scholarship' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                            color: c.issueType === 'Disciplinary' || c.issueType === 'Anti-Ragging' ? 'var(--danger)' : c.issueType === 'Scholarship' ? 'var(--success)' : 'var(--primary)',
                            padding: '3px 7px', borderRadius: '5px', fontSize: '0.75rem', fontWeight: 600
                          }}>
                            {c.issueType}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.reportedBy}</td>
                        <td>
                          <span style={{
                            color: c.priority === 'High' ? 'var(--danger)' : c.priority === 'Medium' ? 'var(--warning)' : 'var(--success)',
                            fontWeight: 700, fontSize: '0.8rem'
                          }}>
                            ● {c.priority}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.12)' : c.status === 'Pending' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: c.status === 'Resolved' ? 'var(--success)' : c.status === 'Pending' ? 'var(--danger)' : 'var(--warning)',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { setSelectedCase(c); setShowCaseModal(true); }}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--primary)', color: 'white', border: 'none', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Timeline
                            </button>
                            {c.status !== 'Resolved' && (
                              <button
                                onClick={() => resolveCaseAction(c)}
                                style={{ padding: '4px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: 'none', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Right Action panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Quick Details panel */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '260px' }}>
              {selectedCase ? (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {selectedCase.priority} Priority Case
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                        {selectedCase.studentName}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedCase(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                    <div><strong>Department:</strong> {selectedCase.department}</div>
                    <div><strong>Reported By:</strong> {selectedCase.reportedBy}</div>
                    <div><strong>Case Type:</strong> {selectedCase.issueType}</div>
                    <div><strong>Description:</strong></div>
                    <p style={{ fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      "{selectedCase.description}"
                    </p>
                  </div>

                  {selectedCase.status !== 'Resolved' && selectedCase.status !== 'Rejected' && selectedCase.status !== 'Approved' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {selectedCase.issueType === 'Scholarship' ? (
                        <>
                          <button
                            onClick={() => handleOpenScholarship(selectedCase)}
                            style={{ padding: '0.5rem', background: '#10B981', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                          >
                            <Heart size={12} /> Approve Scholarship
                          </button>
                          <button
                            onClick={() => rejectScholarshipAction(selectedCase)}
                            style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                          >
                            <X size={12} /> Reject Request
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenCounselor(selectedCase)}
                              style={{ padding: '0.5rem', background: '#6366F1', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                            >
                              <Users size={12} /> Assign Counselor
                            </button>
                            <button
                              onClick={() => handleOpenParentMeeting(selectedCase)}
                              style={{ padding: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                            >
                              <Calendar size={12} /> Parent Meeting
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleOpenWarning(selectedCase)}
                            style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                          >
                            <Mail size={12} /> Send Official Warning
                          </button>
                          
                          <button
                            onClick={() => handleOpenReply(selectedCase)}
                            style={{ padding: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                          >
                            <MessageSquare size={12} /> Reply to Student
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {selectedCase.status === 'Resolved' && (
                    <div style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--success)', padding: '8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
                      ✓ Case closed and resolved successfully.
                    </div>
                  )}

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <ShieldAlert size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>No Case Selected</h4>
                  <p style={{ fontSize: '0.75rem', maxWidth: '180px', margin: '4px auto 0' }}>Select any student record to review the timeline, allocate counselors, or schedule parent meetings.</p>
                </div>
              )}
            </div>

            {/* Quick Emergency Broadcaster Alert panel */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', borderLeft: '3px solid var(--danger)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🚨 Campus Emergency Broadcaster
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.8rem', lineHeight: '1.3' }}>
                Instantly trigger security notifications or emergency announcements to all connected staff and students.
              </p>
              
              <form onSubmit={handleTriggerEmergencyAlert}>
                <input
                  type="text"
                  placeholder="Input emergency broadcast text..."
                  value={emergencyAlertText}
                  onChange={(e) => setEmergencyAlertText(e.target.value)}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem',
                    border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)',
                    marginBottom: '0.5rem'
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.72rem', borderRadius: '8px', background: 'var(--danger)', justifyContent: 'center' }}
                >
                  Broadcast Security Alert
                </button>
              </form>
            </div>

            {/* Role boundary overrides panel */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                🛡️ Role Clearance Limits
              </h3>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.8rem' }}>
                Clearance boundary gates restrict super-admin operations:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button 
                  onClick={() => triggerRestriction('Modify database structural parameters')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  ❌ Manage Server/Database
                </button>
                <button 
                  onClick={() => triggerRestriction('Altering network security configs')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔑 Change Admin Security Settings
                </button>
                <button 
                  onClick={() => triggerRestriction('Deleting admin user accounts')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🗑️ Delete Admin Users
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB VIEW: STUDENT WELLNESS ANALYTICS --- */}
      {activeTab === 'wellness-analytics' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
          
          {/* Main Charts */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
              Student Wellness & Disciplinary Trend Indices
            </h3>

            {/* Wellness Index Line Chart */}
            <div className="mb-6">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Student Mental Wellness Index vs Handled Cases
              </h4>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={wellnessData}>
                    <defs>
                      <linearGradient id="colorWellness" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" />
                    <YAxis label={{ value: 'Score %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="wellnessIndex" stroke="#10b981" fillOpacity={1} fill="url(#colorWellness)" name="Student Wellness Index" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incident Distribution by Department Bar Chart */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Incident Categories Mapping by Engineering Department
              </h4>
              <div style={{ width: '100%', height: '220px' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentIncidentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Disciplinary" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Complaints" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="AntiRagging" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Analytics Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Anti-ragging compliance log */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                📢 Anti-Ragging Anti-Harassment Compliance
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <span>Committee Registered</span>
                  <strong style={{ color: 'var(--text-main)' }}>Active (9 Members)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <span>Anti-ragging Campus Patrols</span>
                  <strong style={{ color: 'var(--text-main)' }}>3 Daily Patrols</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <span>Emergency SOS Stations</span>
                  <strong style={{ color: 'var(--text-main)' }}>Operational</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.4rem' }}>
                  <span>Compliance Filing Status</span>
                  <strong style={{ color: 'var(--success)' }}>100% Up to date</strong>
                </div>
              </div>
            </div>

            {/* Activity Logs */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                ⚡ Recent Welfare Operations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto' }}>
                {welfareLogs.map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '6px' }}>[{log.time}]</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- TAB VIEW: ANONYMOUS COMPLAINTS INBOX --- */}
      {activeTab === 'anonymous' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '1.5rem' }}>
          
          {/* Complaints Table */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Anonymous Feedback & Grievance Logs
            </h3>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Grievance Ticket ID</th>
                    <th>Date Lodged</th>
                    <th>Issue Description</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {anonymousComplaints.map(comp => (
                    <tr key={comp.id}>
                      <td style={{ fontWeight: 700 }}>#ANON-{comp.id}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{comp.date}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                        <strong>{comp.subject}:</strong> {comp.description}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: comp.status === 'Resolved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: comp.status === 'Resolved' ? 'var(--success)' : 'var(--danger)',
                          padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                        }}>
                          {comp.status}
                        </span>
                      </td>
                      <td>
                        {comp.status !== 'Resolved' ? (
                          <button
                            onClick={() => resolveAnonymousAction(comp.id)}
                            style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--success)', color: 'white', border: 'none', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Resolve Ticket
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Quick instructions card */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={16} className="text-[#6366F1]" /> Anonymous Complaints System
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Students can report campus infrastructure issues, mess hygiene concerns, or lab terminal malfunctions completely anonymously.
              <br /><br />
              Resolved tickets are logged in the ERP database and removed from the active alerts notifications.
            </p>
          </div>

        </div>
      )}


      {/* MODAL 1: VIEW CASE TIMELINE AND DETAILS */}
      {showCaseModal && selectedCase && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ClipboardList className="text-[#6366F1]" size={20} /> Incident Timeline: {selectedCase.studentName}
              </h3>
              <button onClick={() => setShowCaseModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Case Description:</span>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px', fontStyle: 'italic' }}>
                  "{selectedCase.description}"
                </p>
              </div>

              {/* Timeline nodes */}
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Action Log History:</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                  {selectedCase.timeline.map((node, idx) => (
                    <div key={idx} style={{ position: 'relative', fontSize: '0.78rem' }}>
                      <div style={{
                        position: 'absolute', left: '-13px', top: '3px', width: '8px', height: '8px',
                        borderRadius: '50%', backgroundColor: 'var(--primary)'
                      }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{node.date}</span>
                      <p style={{ color: 'var(--text-main)', marginTop: '2px' }}>{node.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setShowCaseModal(false)}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1.2rem', borderRadius: '8px' }}
                >
                  Close Timeline
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* MODAL 2: ALLOCATE PROFESSIONAL COUNSELOR */}
      {showCounselorModal && selectedCase && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck className="text-[#6366F1]" size={20} /> Assign Welfare Counselor
              </h3>
              <button onClick={() => setShowCounselorModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={assignCounselorAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Target Student
                </label>
                <input 
                  type="text" disabled
                  value={selectedCase.studentName}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Choose Professional Counselor
                </label>
                <select
                  value={counselorData.counselorName}
                  onChange={(e) => setCounselorData(prev => ({ ...prev, counselorName: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                >
                  <option value="Dr. Asha Roy">Dr. Asha Roy (Mental Health Specialist)</option>
                  <option value="Prof. S. K. Bose">Prof. S. K. Bose (Academic Welfare Dean)</option>
                  <option value="Sister Teresa">Sister Teresa (Campus Counselor)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Urgency Rating
                </label>
                <select
                  value={counselorData.urgency}
                  onChange={(e) => setCounselorData(prev => ({ ...prev, urgency: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                >
                  <option value="Low">Low (General Guidance)</option>
                  <option value="Medium">Medium (Regular Assessment)</option>
                  <option value="High">High (Immediate Intervention)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Specific Instructions / Session Objectives
                </label>
                <textarea 
                  rows="3" required
                  value={counselorData.instruction}
                  onChange={(e) => setCounselorData(prev => ({ ...prev, instruction: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" onClick={() => setShowCounselorModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Confirm Counselor Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 3: SCHEDULE PARENT MEETING */}
      {showMeetingModal && selectedCase && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar className="text-[#3b82f6]" size={20} /> Schedule Parent Disciplinary Review
              </h3>
              <button onClick={() => setShowMeetingModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={scheduleParentMeetingAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Student
                </label>
                <input 
                  type="text" disabled
                  value={selectedCase.studentName}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Meeting Date
                  </label>
                  <input 
                    type="date" required
                    value={meetingData.date}
                    onChange={(e) => setMeetingData(prev => ({ ...prev, date: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Time Slot
                  </label>
                  <input 
                    type="time" required
                    value={meetingData.time}
                    onChange={(e) => setMeetingData(prev => ({ ...prev, time: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Venue
                </label>
                <input 
                  type="text" required
                  value={meetingData.venue}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, venue: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Meeting Agenda
                </label>
                <textarea 
                  rows="3" required
                  value={meetingData.agenda}
                  onChange={(e) => setMeetingData(prev => ({ ...prev, agenda: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" onClick={() => setShowMeetingModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Dispatch Invitation & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 4: SEND DISCIPLINARY WARNING EMAIL TO PARENT */}
      {showWarningModal && selectedCase && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail className="text-[#ef4444]" size={20} /> Send Disciplinary Notice to Parent
              </h3>
              <button onClick={() => setShowWarningModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={sendWarningAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Parent Email Address
                </label>
                <input 
                  type="email" required
                  value={warningData.parentEmail}
                  onChange={(e) => setWarningData(prev => ({ ...prev, parentEmail: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Disciplinary Warning Text
                </label>
                <textarea 
                  rows="9" required
                  value={warningData.warningText}
                  onChange={(e) => setWarningData(prev => ({ ...prev, warningText: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" onClick={() => setShowWarningModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ background: 'var(--danger)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Send size={14} /> Send Official Warning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 5: ACCESS CLEARANCE SECURITY LIMITS SAFES */}
      {showRestrictionModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '460px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--danger)', transition: 'none' }}>
            <ShieldAlert size={48} className="text-[#ef4444]" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Clearance Violation (Access Denied)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You attempted to: <strong style={{ color: 'var(--text-main)' }}>{restrictedAction}</strong>.<br />
              Principal permissions do not clear system server configurations, administrative database tables manipulation, or Super Admin user profile deletions. Please coordinate with the IT System Administrator.
            </p>

            <button 
              onClick={() => setShowRestrictionModal(false)} 
              className="btn-primary"
              style={{ background: 'var(--danger)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Acknowledge Boundaries
            </button>
          </div>
        </div>
      )}

      {/* Approve Scholarship Modal */}
      {showScholarshipModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Heart size={18} color="#10b981"/> Approve Scholarship
              </h3>
              <button onClick={() => setShowScholarshipModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={approveScholarshipAction} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Scholarship Name</label>
                <input 
                  type="text" 
                  value={scholarshipData.name} 
                  onChange={e => setScholarshipData({...scholarshipData, name: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Discount Amount (₹)</label>
                <input 
                  type="number" 
                  value={scholarshipData.amount} 
                  onChange={e => setScholarshipData({...scholarshipData, amount: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none' }}
                  required
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                Approving this scholarship will automatically recalculate the fee structure for {selectedCase?.studentName} and notify the Accounts Department.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowScholarshipModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#10b981', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}>Confirm Approval</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reply to Student Modal */}
      {showReplyModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '450px', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <MessageSquare size={18} color="#4f46e5"/> Reply to {selectedCase?.studentName}
              </h3>
              <button onClick={() => setShowReplyModal(false)} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={20}/></button>
            </div>
            <form onSubmit={addReplyAction} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Your Message</label>
                <textarea 
                  rows="4"
                  value={replyText} 
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your response here. The student will see this in their Support Center..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', outline: 'none', resize: 'none' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowReplyModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#4f46e5', color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)' }}>Send Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
