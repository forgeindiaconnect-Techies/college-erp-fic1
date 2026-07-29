import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Award,
  FileText,
  CheckCircle,
  Plus,
  Search,
  Mail,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Send,
  Download,
  BookOpen,
  Users,
  Info,
  Settings,
  AlertCircle,
  Cpu,
  CalendarCheck
} from 'lucide-react';
import '../../pages/Dashboard.css';

// Seed data for academic calendar planning
const initialSchedules = [
  {
    id: 1,
    name: 'Odd Semester Academic Commencement',
    type: 'Semester Planning',
    department: 'All Departments',
    startDate: '2026-06-01',
    endDate: '2026-06-02',
    coordinator: 'Dr. R. K. Sharma (Principal)',
    status: 'Active',
    notes: 'Registration and induction schedules for freshers and seniors.'
  },
  {
    id: 2,
    name: 'CSE & IT Phase I Midterm Exams',
    type: 'Exam Calendar',
    department: 'CSE Department',
    startDate: '2026-07-15',
    endDate: '2026-07-20',
    coordinator: 'Dr. Amit Verma (CSE HOD)',
    status: 'Active',
    notes: 'Midterm exams covering first 2 units.'
  },
  {
    id: 3,
    name: 'Independence Day Institutional Holiday',
    type: 'Holiday Management',
    department: 'All Departments',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    coordinator: 'Registrar Office',
    status: 'Published',
    notes: 'National holiday campus closures.'
  },
  {
    id: 4,
    name: 'ECE & EEE Lab Internal Examinations',
    type: 'Exam Calendar',
    department: 'ECE Department',
    startDate: '2026-09-10',
    endDate: '2026-09-14',
    coordinator: 'Dr. Priya Nair (ECE HOD)',
    status: 'Draft',
    notes: 'Practical lab exam schedules.'
  },
  {
    id: 5,
    name: 'Diwali Autumn Vacation',
    type: 'Holiday Management',
    department: 'All Departments',
    startDate: '2026-11-02',
    endDate: '2026-11-06',
    coordinator: 'HR Administration',
    status: 'Published',
    notes: 'Autumn semester break holidays.'
  },
  {
    id: 6,
    name: 'MECH Final Capstone Review',
    type: 'Department Schedule',
    department: 'MECH Department',
    startDate: '2026-10-12',
    endDate: '2026-10-14',
    coordinator: 'Dr. V. K. Malhotra (MECH HOD)',
    status: 'Active',
    notes: 'Department presentation of major undergraduate projects.'
  }
];

export default function PrincipalAcademicPlanning() {
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem(`principal_academic_planning_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    return saved ? JSON.parse(saved) : initialSchedules;
  });

  useEffect(() => {
    localStorage.setItem(`principal_academic_planning_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(schedules));
  }, [schedules]);

  // View States
  const [activeView, setActiveView] = useState('list'); // 'list', 'calendar', 'planner'
  const [selectedTab, setSelectedTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Modals States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showClashModal, setShowClashModal] = useState(false);
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);

  // AI Planner States
  const [plannerStart, setPlannerStart] = useState('2026-06-01');
  const [plannerWeeks, setPlannerWeeks] = useState(16);
  const [plannerMidterms, setPlannerMidterms] = useState(8);
  const [plannerLabs, setPlannerLabs] = useState(14);
  const [plannerEndsem, setPlannerEndsem] = useState(16);
  const [plannerOptimizing, setPlannerOptimizing] = useState(false);
  const [plannerProposal, setPlannerProposal] = useState(null);
  const [plannerMessage, setPlannerMessage] = useState('');

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    type: 'Semester Planning',
    department: 'All Departments',
    startDate: '',
    endDate: '',
    coordinator: 'Dr. R. K. Sharma (Principal)',
    status: 'Draft',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    type: 'Semester Planning',
    department: 'All Departments',
    startDate: '',
    endDate: '',
    coordinator: '',
    status: 'Draft',
    notes: ''
  });

  // Clash Warning Data
  const [clashData, setClashData] = useState([]);
  const [pendingClashSubmit, setPendingClashSubmit] = useState(null); // stores {data, isEdit}

  // Reminder State
  const [reminderData, setReminderData] = useState({
    eventName: '',
    recipients: '',
    subject: '',
    body: ''
  });

  // Access Restriction
  const [restrictionAction, setRestrictionAction] = useState('');

  // Toast Alerts
  const [toastMessage, setToastMessage] = useState('');
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Activity Logs
  const [activityLogs, setActivityLogs] = useState([
    { time: '10:15', msg: 'Principal updated Odd Semester registration outline.' },
    { time: '09:40', msg: 'AI Planner suggested optimized midterm schedule guidelines.' },
    { time: '08:30', msg: 'Diwali holiday calendar approved & published to HOD mailing lists.' }
  ]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setActivityLogs(prev => [{ time, msg }, ...prev]);
  };

  // Calendar States
  const [calendarDate, setCalendarDate] = useState(new Date('2026-06-01'));

  // --- BUSINESS LOGIC: DATE OVERLAPS & CLASH DETECTION ---
  const detectClashes = (newEvent, excludeId = null) => {
    const conflicts = [];
    const newStart = new Date(newEvent.startDate);
    const newEnd = new Date(newEvent.endDate);

    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) return conflicts;

    schedules.forEach(item => {
      if (item.id === excludeId) return;

      const itemStart = new Date(item.startDate);
      const itemEnd = new Date(item.endDate);

      // Check overlap
      const isOverlapping = (newStart <= itemEnd && newEnd >= itemStart);

      if (isOverlapping) {
        // Clash cases:
        // 1. Holiday overlap
        if (item.type === 'Holiday Management') {
          conflicts.push({
            type: 'Holiday Conflict',
            message: `⚠️ "${newEvent.name}" overlaps with scheduled holiday "${item.name}" (${item.startDate}).`
          });
        }
        // 2. Exam overlap in the same department
        if (newEvent.type === 'Exam Calendar' && item.type === 'Exam Calendar') {
          if (newEvent.department === 'All Departments' || item.department === 'All Departments' || newEvent.department === item.department) {
            conflicts.push({
              type: 'Exam Clash',
              message: `🚨 Dual Exam Overlap: "${newEvent.name}" and "${item.name}" are scheduled on overlapping dates for ${newEvent.department}.`
            });
          }
        }
      }
    });

    return conflicts;
  };

  // --- ACTIONS ---

  const handleCreateSubmit = (e) => {
    if (e) e.preventDefault();

    if (!formData.name || !formData.startDate || !formData.endDate) {
      triggerToast('⚠️ Please fill out all required fields.');
      return;
    }

    const clashes = detectClashes(formData);
    if (clashes.length > 0) {
      setClashData(clashes);
      setPendingClashSubmit({ data: { ...formData }, isEdit: false });
      setShowClashModal(true);
      return;
    }

    proceedCreate(formData);
  };

  const proceedCreate = (data) => {
    const newSchedule = {
      ...data,
      id: Date.now()
    };
    setSchedules(prev => [newSchedule, ...prev]);
    setShowCreateModal(false);
    addLog(`Principal scheduled new ${data.type}: "${data.name}"`);
    triggerToast(`🎉 "${data.name}" successfully created!`);
    resetCreateForm();
  };

  const resetCreateForm = () => {
    setFormData({
      name: '',
      type: 'Semester Planning',
      department: 'All Departments',
      startDate: '',
      endDate: '',
      coordinator: 'Dr. R. K. Sharma (Principal)',
      status: 'Draft',
      notes: ''
    });
  };

  const openEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditFormData({
      id: item.id,
      name: item.name,
      type: item.type,
      department: item.department,
      startDate: item.startDate,
      endDate: item.endDate,
      coordinator: item.coordinator,
      status: item.status,
      notes: item.notes || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();

    if (!editFormData.name || !editFormData.startDate || !editFormData.endDate) {
      triggerToast('⚠️ Please fill out all required fields.');
      return;
    }

    const clashes = detectClashes(editFormData, editFormData.id);
    if (clashes.length > 0) {
      setClashData(clashes);
      setPendingClashSubmit({ data: { ...editFormData }, isEdit: true });
      setShowClashModal(true);
      return;
    }

    proceedEdit(editFormData);
  };

  const proceedEdit = (data) => {
    setSchedules(prev => prev.map(item => (item.id === data.id ? data : item)));
    setShowEditModal(false);
    addLog(`Principal updated details for: "${data.name}"`);
    triggerToast(`🎉 Successfully updated schedule "${data.name}"!`);
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    const item = schedules.find(s => s.id === id);
    if (confirm(`Are you sure you want to delete academic plan "${item.name}"?`)) {
      setSchedules(prev => prev.filter(s => s.id !== id));
      addLog(`Principal removed scheduled event: "${item.name}"`);
      triggerToast(`🗑️ "${item.name}" removed from calendars.`);
      if (selectedEvent && selectedEvent.id === id) {
        setSelectedEvent(null);
      }
    }
  };

  const handlePublish = (id, e) => {
    if (e) e.stopPropagation();
    setSchedules(prev => prev.map(s => (s.id === id ? { ...s, status: 'Published' } : s)));
    const item = schedules.find(s => s.id === id);
    addLog(`Principal published schedule ERP-wide: "${item.name}"`);
    triggerToast(`📢 Published "${item.name}"! Synced across ERP.`);
  };

  // Reminder trigger
  const openReminder = (item, e) => {
    if (e) e.stopPropagation();
    
    const formattedRange = `${new Date(item.startDate).toLocaleDateString()} to ${new Date(item.endDate).toLocaleDateString()}`;
    const body = `Dear HODs and Faculty Teams,\n\nPlease make note of the upcoming academic event details published by the Principal Office:\n\nEvent Name: ${item.name}\nDepartment Scope: ${item.department}\nDuration: ${formattedRange}\nCoordinator: ${item.coordinator}\n\nNotes/Instructions:\n${item.notes || 'Please adjust class timetables and faculty workloads accordingly.'}\n\nBest regards,\nOffice of the Principal\nLakeside Institute of Technology`;

    setReminderData({
      eventName: item.name,
      recipients: item.department === 'All Departments' ? 'All Department Heads, Faculty Members' : `${item.department} Faculty, Coordinator`,
      subject: `Academic Schedule notification: ${item.name}`,
      body: body
    });

    setShowReminderModal(true);
  };

  const dispatchReminder = (e) => {
    e.preventDefault();
    addLog(`Auto email notification dispatched for "${reminderData.eventName}"`);
    setShowReminderModal(false);
    triggerToast('✉️ Reminder notifications dispatched successfully!');
  };

  // Simulated AI Academic Planner Proposal
  const handleAIEngineOptimize = () => {
    setPlannerOptimizing(true);
    setPlannerMessage('AI Engine reading institutional workloads...');
    
    setTimeout(() => {
      setPlannerMessage('AI scanning for university holiday conflicts...');
    }, 500);

    setTimeout(() => {
      setPlannerMessage('AI allocating optimum exam prep gaps...');
    }, 1000);

    setTimeout(() => {
      const baseDate = new Date(plannerStart);
      
      // Calculate optimized dates helper
      const addWeeks = (date, w) => {
        const d = new Date(date);
        d.setDate(d.getDate() + (w * 7));
        return d.toISOString().split('T')[0];
      };

      const orientationStart = baseDate.toISOString().split('T')[0];
      const midtermStart = addWeeks(baseDate, plannerMidterms);
      const midtermEnd = addWeeks(midtermStart, 1);
      const labStart = addWeeks(baseDate, plannerLabs);
      const labEnd = addWeeks(labStart, 1);
      const endsemStart = addWeeks(baseDate, plannerEndsem);
      const endsemEnd = addWeeks(endsemStart, 2);

      const proposed = [
        {
          name: 'Semester Classroom Orientation & Academic Start',
          type: 'Semester Planning',
          department: 'All Departments',
          startDate: orientationStart,
          endDate: orientationStart,
          coordinator: 'Dr. R. K. Sharma (Principal)',
          status: 'Draft',
          notes: 'AI Recommended commencement day.'
        },
        {
          name: 'AI Optimized Midterm Exam Week',
          type: 'Exam Calendar',
          department: 'All Departments',
          startDate: midtermStart,
          endDate: midtermEnd,
          coordinator: 'Dr. Amit Verma (Exam Controller)',
          status: 'Draft',
          notes: 'Proposed slot at Week 8 to balance syllabus coverage.'
        },
        {
          name: 'AI Optimized Internal Laboratory Exams',
          type: 'Exam Calendar',
          department: 'All Departments',
          startDate: labStart,
          endDate: labEnd,
          coordinator: 'Lab Affairs Committee',
          status: 'Draft',
          notes: 'Arranged lab testing slots prior to finals.'
        },
        {
          name: 'AI Optimized Final Semester End Examinations',
          type: 'Exam Calendar',
          department: 'All Departments',
          startDate: endsemStart,
          endDate: endsemEnd,
          coordinator: 'Dr. Amit Verma (Exam Controller)',
          status: 'Draft',
          notes: 'Final examinations semester wrap.'
        }
      ];

      setPlannerProposal(proposed);
      setPlannerOptimizing(false);
      addLog('AI Academic Planner generated new optimized semester layout.');
      triggerToast('🤖 AI semester schedule generated! Review proposal below.');
    }, 1600);
  };

  const mergeAIPosal = () => {
    if (!plannerProposal) return;
    
    // Add IDs
    const formatted = plannerProposal.map((p, idx) => ({
      ...p,
      id: Date.now() + idx
    }));

    setSchedules(prev => [...formatted, ...prev]);
    setPlannerProposal(null);
    addLog('Principal merged AI-optimized schedules into active calendars.');
    triggerToast('✅ AI schedules integrated! Notifications pushed.');
  };

  // Boundary Restrictions Blocker Trigger
  const triggerRestricted = (action) => {
    setRestrictionAction(action);
    setShowRestrictionModal(true);
  };

  // Filter schedules
  const filteredSchedules = schedules.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.coordinator.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === 'All') return matchesSearch;
    if (selectedTab === 'Semesters') return matchesSearch && item.type === 'Semester Planning';
    if (selectedTab === 'Exams') return matchesSearch && item.type === 'Exam Calendar';
    if (selectedTab === 'Holidays') return matchesSearch && item.type === 'Holiday Management';
    if (selectedTab === 'Departments') return matchesSearch && item.type === 'Department Schedule';
    return matchesSearch;
  });

  // Derived metrics
  const upcomingExams = schedules.filter(s => s.type === 'Exam Calendar' && new Date(s.startDate) >= new Date('2026-05-27')).length;
  const upcomingHolidays = schedules.filter(s => s.type === 'Holiday Management' && new Date(s.startDate) >= new Date('2026-05-27')).length;
  const pendingTasks = schedules.filter(s => s.status === 'Draft').length;
  const activeDeptSchedules = schedules.filter(s => s.department !== 'All Departments').length;

  // Calendar Helpers
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Open create with calendar prefilled day
  const handleDayClick = (day) => {
    if (!day) return;
    const formatted = day.toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      startDate: formatted,
      endDate: formatted
    }));
    setShowCreateModal(true);
  };

  return (
    <div className="main-content animate-fade-in" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      
      {/* Toast Alert popup */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text)',
          padding: '1rem 1.5rem',
          borderRadius: '10px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '4px solid var(--success)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <Sparkles size={18} className="text-[#10b981]" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{toastMessage}</span>
        </div>
      )}

      {/* Embedded Animations CSS style tag */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 5px rgba(79, 70, 229, 0.4); }
          50% { box-shadow: 0 0 15px rgba(79, 70, 229, 0.8); }
          100% { box-shadow: 0 0 5px rgba(79, 70, 229, 0.4); }
        }
        .ai-glow-btn {
          animation: pulseGlow 2.5s infinite ease-in-out;
        }
        .calendar-cell-plan {
          aspect-ratio: 1.1;
          border: 1px solid var(--border-color);
          padding: 0.3rem;
          min-height: 85px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s ease;
          background: var(--bg-secondary);
        }
        .calendar-cell-plan:hover {
          background: rgba(79, 70, 229, 0.04);
        }
        .calendar-tag-plan {
          font-size: 0.65rem;
          padding: 2px 4px;
          border-radius: 4px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          color: white;
        }
        .workflow-box {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          background: var(--bg-secondary);
          padding: 1rem 1.5rem;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1.5rem;
        }
        .workflow-step-node {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .workflow-step-node.active {
          color: var(--primary);
        }
        .workflow-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--bg-primary);
          border: 1.5px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .workflow-step-node.active .workflow-num {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
      `}} />

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarCheck style={{ color: '#3730A5' }} size={28} /> Academic Calendar & Planning Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Manage the master calendar, schedule semesters and exams, set institutional holidays, and coordinate with departments.
          </p>
        </div>

        {/* Oversight Bounds Clearance Info */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5', transition: 'none' }}>
          <Users size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Oversight Bounds</span>
            <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Principal Account - Master Planner</strong>
          </div>
        </div>
      </div>

      {/* REAL WORKFLOW STATUS STEPPER */}
      <div className="workflow-box">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={14} className="text-[var(--primary)]" /> Planning Workflow:
        </span>
        {[
          { num: 1, label: 'Semester Plan Created' },
          { num: 2, label: 'Departments Scheduled' },
          { num: 3, label: 'Exam Calendar Published' },
          { num: 4, label: 'Auto Reminders Dispatched' },
          { num: 5, label: 'ERP Calendars Synced' }
        ].map((step, idx) => (
          <div key={idx} className="workflow-step-node active">
            <div className="workflow-num">{step.num}</div>
            <span>{step.label}</span>
            {idx < 4 && <span style={{ color: 'var(--border-color)' }}>➔</span>}
          </div>
        ))}
      </div>

      {/* VIEW TABS SELECTOR */}
      <div className="glass-card mb-6" style={{ padding: '0.4rem', borderRadius: '12px', display: 'inline-flex', gap: '0.5rem', transition: 'none' }}>
        <button
          onClick={() => { setActiveView('list'); }}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeView === 'list' ? '#3730A5' : 'transparent',
            color: activeView === 'list' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
          }}
        >
          📋 Schedules Master List
        </button>
        <button
          onClick={() => { setActiveView('calendar'); }}
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeView === 'calendar' ? '#3730A5' : 'transparent',
            color: activeView === 'calendar' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease'
          }}
        >
          📅 Academic Calendar
        </button>
        <button
          onClick={() => { setActiveView('planner'); }}
          className="ai-glow-btn"
          style={{
            padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
            backgroundColor: activeView === 'planner' ? '#3730A5' : 'transparent',
            color: activeView === 'planner' ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          <Cpu size={14} /> AI Academic Planner
        </button>
      </div>

      {/* --- DASHBOARD METRIC CARDS --- */}
      <div className="stats-grid mb-6 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><BookOpen size={18} /></div>
          <div className="stat-details">
            <h3>Upcoming Exams</h3>
            <p className="stat-value">{upcomingExams}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Phase midterms & finals</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Calendar size={18} /></div>
          <div className="stat-details">
            <h3>Upcoming Holidays</h3>
            <p className="stat-value">{upcomingHolidays}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Campus breaks</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>
          <div className="stat-icon-wrapper" style={{ background: '#FAEEDA', color: 'var(--warning)' }}><AlertCircle size={18} /></div>
          <div className="stat-details">
            <h3>Pending Tasks</h3>
            <p className="stat-value">{pendingTasks}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>Draft plans in review</span>
          </div>
        </div>

        <div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Users size={18} /></div>
          <div className="stat-details">
            <h3>Dept Schedules</h3>
            <p className="stat-value">{activeDeptSchedules}</p>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assigned workloads</span>
          </div>
        </div>

        {/* SEMESTER PROGRESS CARD */}
        <div className="stat-card" style={{ border: '1px solid #E3E5EC', minWidth: '240px', transition: 'none' }}>
          <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Clock size={18} /></div>
          <div className="stat-details" style={{ width: '100%' }}>
            <h3>Odd Semester Progress</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '72%', background: 'var(--secondary)' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>72%</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Ends in 48 instructional days</span>
          </div>
        </div>

      </div>

      {/* --- RENDER VIEW: MASTER SCHEDULES LIST --- */}
      {activeView === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7.5fr) minmax(0, 2.5fr)', gap: '1.5rem' }}>
          
          {/* Main Table Column */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', transition: 'none' }}>
            
            {/* Filters Header Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              
              {/* Tab Filters */}
              <div className="flex gap-2 flex-wrap">
                {['All', 'Semesters', 'Exams', 'Holidays', 'Departments'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    style={{
                      padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                      backgroundColor: selectedTab === tab ? '#3730A5' : 'transparent',
                      color: selectedTab === tab ? 'white' : 'var(--text-muted)',
                      border: selectedTab === tab ? 'none' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search and Action buttons */}
              <div className="flex gap-2 items-center flex-wrap">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="text"
                    placeholder="Search schedules..."
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

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1.2rem', borderRadius: '8px' }}
                >
                  <Plus size={16} /> Create Schedule
                </button>
              </div>

            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Department</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Coordinator</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No planning schedules found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map(item => (
                      <tr 
                        key={item.id} 
                        style={{ cursor: 'pointer', background: selectedEvent && selectedEvent.id === item.id ? 'rgba(79, 70, 229, 0.05)' : '' }}
                        onClick={() => setSelectedEvent(item)}
                      >
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.name}</div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                            📂 {item.type}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                          }}>
                            {item.department}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          {new Date(item.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {item.coordinator}
                        </td>
                        <td>
                          <span style={{
                            backgroundColor: item.status === 'Published' || item.status === 'Active' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            color: item.status === 'Published' || item.status === 'Active' ? 'var(--success)' : 'var(--warning)',
                            padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {item.status === 'Draft' ? (
                              <button
                                onClick={(e) => handlePublish(item.id, e)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--success)', color: 'white', fontSize: '0.72rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                onClick={(e) => openReminder(item, e)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', border: 'none', cursor: 'pointer' }}
                                title="Send reminder to faculty"
                              >
                                <Mail size={11} /> Remind
                              </button>
                            )}

                            {/* Edit */}
                            <button
                              onClick={(e) => openEdit(item, e)}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.72rem', cursor: 'pointer' }}
                              title="Edit Event"
                            >
                              <Edit2 size={11} />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={(e) => handleDelete(item.id, e)}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--danger)', border: '1px solid var(--border-color)', fontSize: '0.72rem', cursor: 'pointer' }}
                              title="Delete Plan"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Sidebar Info Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Event Details pane */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '260px', transition: 'none' }}>
              {selectedEvent ? (
                <div className="animate-fade-in">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {selectedEvent.type.toUpperCase()}
                      </span>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                        {selectedEvent.name}
                      </h3>
                    </div>
                    <button onClick={() => setSelectedEvent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                    <div><strong>Department Scope:</strong> {selectedEvent.department}</div>
                    <div><strong>Coordinator:</strong> {selectedEvent.coordinator}</div>
                    <div><strong>Start Date:</strong> {new Date(selectedEvent.startDate).toLocaleDateString()}</div>
                    <div><strong>End Date:</strong> {new Date(selectedEvent.endDate).toLocaleDateString()}</div>
                  </div>

                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.78rem', lineHeight: '1.4', marginBottom: '1rem' }}>
                    <strong>Notes:</strong> {selectedEvent.notes || 'No notes added to this planner block.'}
                  </div>

                  {/* Manual conflict check action */}
                  <button
                    onClick={() => {
                      const clashes = detectClashes(selectedEvent, selectedEvent.id);
                      if (clashes.length > 0) {
                        setClashData(clashes);
                        setPendingClashSubmit(null);
                        setShowClashModal(true);
                      } else {
                        triggerToast('✅ Clash Check Passed! Date range is completely clear.');
                      }
                    }}
                    style={{
                      width: '100%', padding: '0.5rem', background: 'transparent', border: '1px dashed var(--border-color)',
                      color: 'var(--primary)', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Check Schedule Conflicts
                  </button>

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-muted)', textAlign: 'center' }}>
                  <Calendar size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>No Schedule Selected</h4>
                  <p style={{ fontSize: '0.75rem', maxWidth: '180px', margin: '4px auto 0' }}>Select any scheduled row to check details, run conflict validation, or configure reminders.</p>
                </div>
              )}
            </div>

            {/* Simulated integrations card */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', transition: 'none' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                📅 ERP Calendar Sync & PDF Export
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1rem' }}>
                Synchronize changes to campus portals, student timetables, and external directories.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.5rem' }}>
                <button
                  onClick={() => triggerToast('📅 Synced! Master calendar pushed to student & parent mobile app queues.')}
                  style={{ padding: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                >
                  <CalendarCheck size={12} /> Google Calendar
                </button>
                <button
                  onClick={() => triggerToast('📥 Compiled PDF! Initiated download for LIT Master Academic Calendar 2026-27.')}
                  style={{ padding: '0.5rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
                >
                  <Download size={12} /> Export PDF
                </button>
              </div>
            </div>

            {/* ACCESS RESTRICTIONS BOUNDARY SAFEGUARDS CARD */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', borderLeft: '3px solid var(--danger)', transition: 'none' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🛡️ Role Clearance Restrictions
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.8rem' }}>
                Principal permissions prohibit database mutations or admin profile management:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button 
                  onClick={() => triggerRestricted('Modify database structures and servers')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  ❌ Manage Server/Database
                </button>
                <button 
                  onClick={() => triggerRestricted('Altering administration security configurations')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔑 Change Admin Security Settings
                </button>
                <button 
                  onClick={() => triggerRestricted('Deleting registered administration accounts')}
                  className="glass-card" 
                  style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🗑️ Delete Admin Accounts
                </button>
              </div>
            </div>

            {/* Small activity logs in schedules list */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', transition: 'none' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                ⚡ Activity Logs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '160px', overflowY: 'auto' }}>
                {activityLogs.slice(0, 4).map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '6px' }}>[{log.time}]</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* --- RENDER VIEW: ACADEMIC CALENDAR (GRID VIEW) --- */}
      {activeView === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7.5fr) minmax(0, 2.5fr)', gap: '1.5rem' }}>
          
          {/* Monthly Calendar Card */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', transition: 'none' }}>
            
            {/* Header controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarCheck size={20} className="text-[var(--primary)]" />
                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handlePrevMonth} className="glass-card" style={{ padding: '0.4rem', borderRadius: '8px' }}><ChevronLeft size={16} /></button>
                <button onClick={() => setCalendarDate(new Date('2026-06-01'))} className="glass-card" style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>commencement</button>
                <button onClick={handleNextMonth} className="glass-card" style={{ padding: '0.4rem', borderRadius: '8px' }}><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Days header row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ padding: '0.2rem' }}>{d}</div>)}
            </div>

            {/* Days Grid cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {getCalendarDays().map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} style={{ background: 'transparent' }} />;
                
                const dateStr = day.toISOString().split('T')[0];
                const dayEvents = schedules.filter(item => {
                  return dateStr >= item.startDate && dateStr <= item.endDate;
                });

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleDayClick(day)}
                    className="calendar-cell-plan"
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Tag list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'hidden', maxHeight: '55px' }}>
                      {dayEvents.slice(0, 3).map(ev => {
                        let bg = '#3b82f6';
                        if (ev.type === 'Semester Planning') bg = 'var(--primary)';
                        if (ev.type === 'Holiday Management') bg = '#10b981';
                        if (ev.type === 'Exam Calendar') bg = '#ef4444';
                        if (ev.type === 'Department Schedule') bg = '#6366F1';

                        return (
                          <div
                            key={ev.id}
                            title={`${ev.name} (Coordinator: ${ev.coordinator})`}
                            className="calendar-tag-plan"
                            style={{ backgroundColor: bg }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                          >
                            {ev.name}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center' }}>+{dayEvents.length - 3} more</div>}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Colors legend */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', fontSize: '0.72rem', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--primary)' }}></span> Semester Planning</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }}></span> Holidays</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }}></span> Exam Calendar</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#6366F1' }}></span> Department Workloads</div>
            </div>

          </div>

          {/* Right info details (reused) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {selectedEvent ? (
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', transition: 'none' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      {selectedEvent.type.toUpperCase()}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                      {selectedEvent.name}
                    </h3>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.8rem' }}>
                  <div><strong>Department:</strong> {selectedEvent.department}</div>
                  <div><strong>Coordinator:</strong> {selectedEvent.coordinator}</div>
                  <div><strong>Start Date:</strong> {selectedEvent.startDate}</div>
                  <div><strong>End Date:</strong> {selectedEvent.endDate}</div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.75rem', marginBottom: '1rem' }}>
                  {selectedEvent.notes || 'No description notes.'}
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-muted)', textAlign: 'center', transition: 'none' }}>
                <CalendarCheck size={28} style={{ opacity: 0.5, marginBottom: '8.88px' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>No Day Selected</h4>
                <p style={{ fontSize: '0.75rem', maxWidth: '180px', margin: '4px auto 0' }}>Click any day grid square to quickly add a new semester plan, exam, or holiday.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- RENDER VIEW: AI ACADEMIC PLANNER --- */}
      {activeView === 'planner' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '4fr 6fr', gap: '1.5rem' }}>
          
          {/* Planner inputs */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', transition: 'none' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={18} className="text-[var(--primary)]" /> AI Schedule Parameters
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
              Define structural bounds, and the LIT optimization model will automatically map dates, balancing syllabus distribution and holiday gaps.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Semester Start Commencement *
                </label>
                <input
                  type="date"
                  value={plannerStart}
                  onChange={(e) => setPlannerStart(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Total Weeks
                  </label>
                  <input
                    type="number"
                    value={plannerWeeks}
                    onChange={(e) => setPlannerWeeks(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Midterm Offset (Wk)
                  </label>
                  <input
                    type="number"
                    value={plannerMidterms}
                    onChange={(e) => setPlannerMidterms(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Lab Exam Offset (Wk)
                  </label>
                  <input
                    type="number"
                    value={plannerLabs}
                    onChange={(e) => setPlannerLabs(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Finals Offset (Wk)
                  </label>
                  <input
                    type="number"
                    value={plannerEndsem}
                    onChange={(e) => setPlannerEndsem(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <button
                onClick={handleAIEngineOptimize}
                disabled={plannerOptimizing}
                className="btn-primary"
                style={{ justifyContent: 'center', padding: '0.6rem', borderRadius: '8px', marginTop: '0.5rem' }}
              >
                {plannerOptimizing ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="spinner" style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    {plannerMessage}
                  </span>
                ) : (
                  <>
                    <Cpu size={16} /> Generate AI Schedule Proposal
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Proposal results panel */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '380px', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Proposed AI Schedule Recommendation
              </h3>
              {plannerProposal && (
                <button
                  onClick={mergeAIPosal}
                  style={{ padding: '0.5rem 1rem', background: 'var(--success)', border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✓ Approve & Merge Proposal
                </button>
              )}
            </div>

            {plannerProposal ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {plannerProposal.map((prop, idx) => (
                  <div key={idx} style={{ padding: '1rem', background: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {prop.type}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        📅 {prop.startDate} {prop.endDate !== prop.startDate && `to ${prop.endDate}`}
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', margin: '4px 0' }}>{prop.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <strong>Coordinator:</strong> {prop.coordinator} | <strong>Notes:</strong> {prop.notes}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)', textAlign: 'center' }}>
                <Cpu size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>No Proposal Generated</h4>
                <p style={{ fontSize: '0.75rem', maxWidth: '240px', margin: '4px auto 0' }}>Adjust start date and offsets in weeks on the left, then click Generate proposal to run optimizer engine.</p>
              </div>
            )}

          </div>

        </div>
      )}


      {/* MODAL 1: CREATE SCHEDULE PLAN */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus className="text-[var(--primary)]" size={20} /> Create Master Schedule Block
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Academic Event / Exam Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Autumn Semester Final Assessment Week" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Category Type
                  </label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="Semester Planning">Semester Planning</option>
                    <option value="Exam Calendar">Exam Calendar</option>
                    <option value="Holiday Management">Holiday Management</option>
                    <option value="Department Schedule">Department Schedule</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Target Department Scope
                  </label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="CSE Department">CSE Department</option>
                    <option value="ECE Department">ECE Department</option>
                    <option value="EEE Department">EEE Department</option>
                    <option value="MECH Department">MECH Department</option>
                    <option value="BCA Department">BCA Department</option>
                    <option value="MBA Department">MBA Department</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Start Date *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    End Date *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Event Coordinator
                  </label>
                  <input 
                    type="text" 
                    value={formData.coordinator}
                    onChange={(e) => setFormData(prev => ({ ...prev, coordinator: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Planning Status
                  </label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Planning Notes & Remarks
                </label>
                <textarea 
                  rows="3"
                  placeholder="Additional syllabus notes or classroom allocations..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Schedule Plan
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SCHEDULE PLAN */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit2 className="text-[var(--primary)]" size={20} /> Edit Schedule Details
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Academic Event / Exam Name *
                </label>
                <input 
                  type="text" 
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Category Type
                  </label>
                  <select 
                    value={editFormData.type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="Semester Planning">Semester Planning</option>
                    <option value="Exam Calendar">Exam Calendar</option>
                    <option value="Holiday Management">Holiday Management</option>
                    <option value="Department Schedule">Department Schedule</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Target Department Scope
                  </label>
                  <select 
                    value={editFormData.department}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, department: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="CSE Department">CSE Department</option>
                    <option value="ECE Department">ECE Department</option>
                    <option value="EEE Department">EEE Department</option>
                    <option value="MECH Department">MECH Department</option>
                    <option value="BCA Department">BCA Department</option>
                    <option value="MBA Department">MBA Department</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Start Date *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    End Date *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Event Coordinator
                  </label>
                  <input 
                    type="text" 
                    value={editFormData.coordinator}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, coordinator: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Planning Status
                  </label>
                  <select 
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active</option>
                    <option value="Published">Published</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Planning Notes & Remarks
                </label>
                <textarea 
                  rows="3"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* MODAL 3: CLASH RESOLUTION DIALOG */}
      {showClashModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100000
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '480px', background: 'var(--bg-secondary)', border: '1.5px solid var(--warning)', transition: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning)', marginBottom: '1rem' }}>
              <AlertTriangle size={32} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Schedule Clash Detected!</h3>
            </div>
            
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: '1.5' }}>
              Our calendar engine scanned structural allocations and detected conflicts with the proposed dates:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {clashData.map((clash, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--warning)', padding: '0.6rem', borderRadius: '8px', borderLeft: '3px solid var(--warning)' }}>
                  {clash.message}
                </div>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowClashModal(false);
                  // user acknowledges, closes to adjust dates
                }}
                className="glass-card"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Go Back & Adjust
              </button>

              {pendingClashSubmit && (
                <button
                  onClick={() => {
                    const data = pendingClashSubmit.data;
                    if (pendingClashSubmit.isEdit) {
                      proceedEdit(data);
                    } else {
                      proceedCreate(data);
                    }
                    setShowClashModal(false);
                  }}
                  className="btn-primary"
                  style={{ background: 'var(--warning)', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                >
                  Force Schedule Anyway
                </button>
              )}
            </div>

          </div>
        </div>
      )}


      {/* MODAL 4: EMAIL REMINDER NOTIFICATION */}
      {showReminderModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)', transition: 'none' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail className="text-[var(--primary)]" size={20} /> Dispatch Academic Reminder Mail
              </h3>
              <button onClick={() => setShowReminderModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={dispatchReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Target Recipients (Emails/Groups)
                </label>
                <input 
                  type="text" 
                  required
                  value={reminderData.recipients}
                  onChange={(e) => setReminderData(prev => ({ ...prev, recipients: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Subject Line
                </label>
                <input 
                  type="text" 
                  required
                  value={reminderData.subject}
                  onChange={(e) => setReminderData(prev => ({ ...prev, subject: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Email Body message
                </label>
                <textarea 
                  rows="9"
                  required
                  value={reminderData.body}
                  onChange={(e) => setReminderData(prev => ({ ...prev, body: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: '1.4' }}
                ></textarea>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowReminderModal(false)}
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Send size={14} /> Send Auto Notifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 5: ROLE CLEARANCE SAFETY WARNING DIALOG */}
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
              You attempted to: <strong style={{ color: 'var(--text-main)' }}>{restrictionAction}</strong>.<br />
              Principal permissions are restricted to academic planners, syllabi tracks, and department calendars. Administrative profiles, users data, and server structures must be modified by Super Admins.
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

    </div>
  );
}
