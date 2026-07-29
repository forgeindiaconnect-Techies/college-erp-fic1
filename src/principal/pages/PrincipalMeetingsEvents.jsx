import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Plus,
  Mail,
  FileText,
  CheckSquare,
  ClipboardList,
  AlertTriangle,
  Award,
  Image as ImageIcon,
  QrCode,
  Download,
  Share2,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckCircle,
  X,
  Send,
  Sparkles,
  Link as LinkIcon,
  BookOpen,
  UserCheck,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import '../../pages/Dashboard.css';

// Initial Events and Meetings seed data
const initialEvents = [
  {
    id: 1,
    name: 'Q3 Academic Review Meeting',
    type: 'HOD Meetings',
    department: 'All Departments',
    dateTime: '2026-05-27T10:00',
    organizer: 'Dr. R. K. Sharma (Principal)',
    venue: 'Conference Room A',
    status: 'Scheduled',
    agenda: 'Review final semester syllabus completion, lab equipment procurement, and placement status.',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    attendees: [
      { name: 'Dr. Amit Verma (CSE HOD)', attended: true },
      { name: 'Dr. Priya Nair (ECE HOD)', attended: true },
      { name: 'Dr. Sunil Rao (EEE HOD)', attended: false },
      { name: 'Dr. V. K. Malhotra (MECH HOD)', attended: true },
      { name: 'Prof. K. G. Menon (MBA Coordinator)', attended: true }
    ],
    notes: 'Approved the new syllabus updates. Lab budget approved up to ₹5 Lakhs per department.',
    documents: ['syllabus_review_draft.pdf', 'lab_budget_report.xlsx'],
    gallery: []
  },
  {
    id: 2,
    name: 'National Seminar on Quantum Computing',
    type: 'Seminars',
    department: 'CSE & ECE',
    dateTime: '2026-05-28T09:30',
    organizer: 'Dr. Amit Verma (CSE)',
    venue: 'Main Auditorium',
    status: 'Scheduled',
    agenda: 'Distinguished lectures on quantum computing paradigms, cryptography, and hands-on simulation tools.',
    meetingUrl: 'https://zoom.us/j/9876543210',
    attendees: [
      { name: 'Rohan Gupta (CSE Student)', attended: false },
      { name: 'Neha Reddy (ECE Student)', attended: false },
      { name: 'Pooja Hegde (CSE Student)', attended: false },
      { name: 'Shreya Iyer (CSE Student)', attended: false }
    ],
    notes: '',
    documents: ['quantum_seminar_brochure.pdf'],
    gallery: []
  },
  {
    id: 3,
    name: 'Google Cloud Campus Placement Drive',
    type: 'Placement Drives',
    department: 'CSE, ECE & BCA',
    dateTime: '2026-05-29T09:00',
    organizer: 'Prof. Sandeep Mehta (Placement Officer)',
    venue: 'Placement Cell & Seminar Hall 2',
    status: 'Scheduled',
    agenda: 'Pre-placement talk, coding rounds, and technical/HR interviews for Cloud Associate Engineer roles.',
    meetingUrl: 'https://meet.google.com/google-cloud-drive',
    attendees: [
      { name: 'Rohan Gupta (CSE Student)', attended: false },
      { name: 'Neha Reddy (ECE Student)', attended: false },
      { name: 'Pooja Hegde (CSE Student)', attended: false }
    ],
    notes: '',
    documents: ['google_placement_criteria.pdf'],
    gallery: []
  },
  {
    id: 4,
    name: 'Parent-Teacher Council Association Meet',
    type: 'Parent Meetings',
    department: 'All Departments',
    dateTime: '2026-05-26T14:30',
    organizer: 'Dr. R. K. Sharma (Principal)',
    venue: 'Open Amphitheatre',
    status: 'Ongoing',
    agenda: 'Discuss student discipline, exam outcomes, upcoming hostel renovation, and college transport routes.',
    meetingUrl: '',
    attendees: [
      { name: 'Mr. R. C. Gupta (Parent of Rohan)', attended: true },
      { name: 'Mrs. S. Reddy (Parent of Neha)', attended: true },
      { name: 'Mr. M. Hegde (Parent of Pooja)', attended: false }
    ],
    notes: 'Parents requested extra bus routes for the West campus line. Principal agreed to review with Transport In-charge.',
    documents: [],
    gallery: []
  },
  {
    id: 5,
    name: 'Advanced React & Node Workshop',
    type: 'Workshops',
    department: 'CSE & BCA',
    dateTime: '2026-05-25T10:00',
    organizer: 'Dr. Amit Verma (CSE)',
    venue: 'CSE Lab 4',
    status: 'Completed',
    agenda: 'Full stack development training, state management with Redux, database optimization, and deployment cycles.',
    meetingUrl: '',
    attendees: [
      { name: 'Rohan Gupta (CSE Student)', attended: true },
      { name: 'Pooja Hegde (CSE Student)', attended: true },
      { name: 'Shreya Iyer (CSE Student)', attended: true }
    ],
    notes: 'Workshop successfully completed by 80 engineering students. Performance reports generated.',
    documents: ['react_workshop_modules.pdf'],
    gallery: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800']
  },
  {
    id: 6,
    name: 'Proposed AI-ML Hackathon Approval',
    type: 'Academic Events',
    department: 'CSE',
    dateTime: '2026-06-02T10:00',
    organizer: 'Dr. Amit Verma (CSE)',
    venue: 'Seminar Hall 1',
    status: 'Pending Approval',
    agenda: 'Request approval for a 24-hour hackathon, cash prizes, food arrangements, and guest mentor invites.',
    meetingUrl: '',
    attendees: [],
    notes: '',
    documents: ['hackathon_budget_proposal.pdf'],
    gallery: []
  }
];

import { AuthContext } from '../../context/AuthContext';

export default function PrincipalMeetingsEvents() {
  const { user } = useContext(AuthContext);
  const tenantKey = `principal_meetings_events_${user?.tenantId || 'default'}`;
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem(tenantKey);
    return saved ? JSON.parse(saved) : initialEvents;
  });

  useEffect(() => {
    localStorage.setItem(tenantKey, JSON.stringify(events));
  }, [events, tenantKey]);
  
  // Navigation & View controllers
  const [activeView, setActiveView] = useState('list'); // 'list', 'calendar', 'reports'
  const [selectedTab, setSelectedTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Modal controllers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const [restrictionAction, setRestrictionAction] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [activityLogs, setActivityLogs] = useState([
    { time: '17:05', msg: 'System logs loaded. Pushed recent departmental updates.' },
    { time: '16:30', msg: 'Principal synced calendar invitations for HOD Meeting.' },
    { time: '15:15', msg: 'Completed workshop report filed for React & Node Workshop.' }
  ]);

  // Gallery file input reference
  const fileInputRef = useRef(null);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(new Date('2026-05-26'));

  // Form states for creating meeting & event
  const [formData, setFormData] = useState({
    name: '',
    type: 'Staff Meetings',
    department: 'All Departments',
    dateTime: '',
    organizer: 'Dr. R. K. Sharma (Principal)',
    venue: '',
    status: 'Scheduled',
    agenda: '',
    isOnline: false,
    meetingUrl: '',
    attendeesListString: 'Dr. Amit Verma, Dr. Priya Nair, Dr. Sunil Rao, Dr. V. K. Malhotra',
    agendaFile: ''
  });

  // Form states for editing meeting & event
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    type: 'Staff Meetings',
    department: 'All Departments',
    dateTime: '',
    organizer: '',
    venue: '',
    status: 'Scheduled',
    agenda: '',
    isOnline: false,
    meetingUrl: '',
    attendeesListString: '',
    agendaFile: ''
  });

  // Email Reminder State
  const [reminderData, setReminderData] = useState({
    eventId: null,
    eventName: '',
    subject: '',
    recipients: '',
    body: ''
  });

  // QR Check-in scanner state
  const [qrScanAttendee, setQrScanAttendee] = useState('');
  const [qrScanSuccess, setQrScanSuccess] = useState(false);

  // Certificate Generator template state
  const [certName, setCertName] = useState('');
  const [certSeminar, setCertSeminar] = useState('');

  // Trigger Toasts
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Activity logger helper
  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    setActivityLogs(prev => [{ time, msg }, ...prev]);
  };

  // Restrict access handler
  const handleRestrictedAction = (action) => {
    setRestrictionAction(action);
    setShowRestrictionDialog(true);
  };

  // Create event action
  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dateTime || !formData.venue) {
      triggerToast('⚠️ Please fill out all required fields.');
      return;
    }

    const attendeesParsed = formData.attendeesListString
      .split(',')
      .map(name => ({ name: name.trim(), attended: false }))
      .filter(item => item.name);

    const newEvent = {
      id: Date.now(),
      name: formData.name,
      type: formData.type,
      department: formData.department,
      dateTime: formData.dateTime,
      organizer: formData.organizer,
      venue: formData.venue,
      status: formData.status,
      agenda: formData.agenda,
      meetingUrl: formData.isOnline ? (formData.meetingUrl || 'https://meet.google.com/' + Math.random().toString(36).substring(2, 7)) : '',
      attendees: attendeesParsed,
      notes: '',
      documents: formData.agendaFile ? [formData.agendaFile] : [],
      gallery: []
    };

    setEvents(prev => [newEvent, ...prev]);
    setShowCreateModal(false);
    addLog(`Principal scheduled a new ${formData.type}: "${formData.name}"`);
    triggerToast(`🎉 Successfully scheduled "${formData.name}" and sent invites!`);
    
    // Reset form
    setFormData({
      name: '',
      type: 'Staff Meetings',
      department: 'All Departments',
      dateTime: '',
      organizer: 'Dr. R. K. Sharma (Principal)',
      venue: '',
      status: 'Scheduled',
      agenda: '',
      isOnline: false,
      meetingUrl: '',
      attendeesListString: 'Dr. Amit Verma, Dr. Priya Nair, Dr. Sunil Rao, Dr. V. K. Malhotra',
      agendaFile: ''
    });
  };

  // Edit Event trigger
  const openEditModal = (event, e) => {
    if (e) e.stopPropagation();
    setEditFormData({
      id: event.id,
      name: event.name,
      type: event.type,
      department: event.department,
      dateTime: event.dateTime,
      organizer: event.organizer,
      venue: event.venue,
      status: event.status,
      agenda: event.agenda || '',
      isOnline: !!event.meetingUrl,
      meetingUrl: event.meetingUrl || '',
      attendeesListString: event.attendees ? event.attendees.map(a => a.name).join(', ') : '',
      agendaFile: event.documents && event.documents.length > 0 ? event.documents[0] : ''
    });
    setShowEditModal(true);
  };

  // Save/Update event action
  const handleUpdateEvent = (e) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.dateTime || !editFormData.venue) {
      triggerToast('⚠️ Please fill out all required fields.');
      return;
    }

    setEvents(prev => prev.map(ev => {
      if (ev.id === editFormData.id) {
        // Build updated attendee list preserving attendance state where possible
        const existingAttendeesMap = new Map(ev.attendees ? ev.attendees.map(a => [a.name, a.attended]) : []);
        const attendeesParsed = editFormData.attendeesListString
          .split(',')
          .map(name => {
            const trimmed = name.trim();
            return {
              name: trimmed,
              attended: existingAttendeesMap.has(trimmed) ? existingAttendeesMap.get(trimmed) : false
            };
          })
          .filter(item => item.name);

        const updated = {
          ...ev,
          name: editFormData.name,
          type: editFormData.type,
          department: editFormData.department,
          dateTime: editFormData.dateTime,
          organizer: editFormData.organizer,
          venue: editFormData.venue,
          status: editFormData.status,
          agenda: editFormData.agenda,
          meetingUrl: editFormData.isOnline ? (editFormData.meetingUrl || ev.meetingUrl || 'https://meet.google.com/' + Math.random().toString(36).substring(2, 7)) : '',
          attendees: attendeesParsed,
          documents: editFormData.agendaFile ? [editFormData.agendaFile] : ev.documents
        };

        // If selected event is the one edited, update the selection view too
        if (selectedEvent && selectedEvent.id === ev.id) {
          setSelectedEvent(updated);
        }

        return updated;
      }
      return ev;
    }));

    setShowEditModal(false);
    addLog(`Principal updated details for ${editFormData.type}: "${editFormData.name}"`);
    triggerToast(`🎉 Successfully updated event "${editFormData.name}"!`);
  };

  // Status changer / Actions
  const handleApproveEvent = (id, e) => {
    if (e) e.stopPropagation();
    setEvents(prev => prev.map(ev => {
      if (ev.id === id) {
        const updated = { ...ev, status: 'Scheduled' };
        if (selectedEvent && selectedEvent.id === id) setSelectedEvent(updated);
        return updated;
      }
      return ev;
    }));
    const ev = events.find(e => e.id === id);
    addLog(`Principal approved proposed event: "${ev.name}"`);
    triggerToast(`✅ Event "${ev.name}" approved successfully!`);
  };

  const handleCancelEvent = (id, e) => {
    if (e) e.stopPropagation();
    setEvents(prev => prev.map(ev => {
      if (ev.id === id) {
        const updated = { ...ev, status: 'Cancelled' };
        if (selectedEvent && selectedEvent.id === id) setSelectedEvent(updated);
        return updated;
      }
      return ev;
    }));
    const ev = events.find(e => e.id === id);
    addLog(`Principal cancelled event: "${ev.name}"`);
    triggerToast(`❌ Event "${ev.name}" has been marked as Cancelled.`);
  };

  const openReminderDialog = (event, e) => {
    if (e) e.stopPropagation();
    
    const formattedDate = new Date(event.dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const bodyText = `Dear Team,\n\nThis is a friendly reminder regarding the upcoming event details:\n\nEvent Name: ${event.name}\nType: ${event.type}\nScheduled Time: ${formattedDate}\nVenue: ${event.venue}\n\nAgenda:\n${event.agenda || 'Review of current academic progress.'}\n\n${event.meetingUrl ? `Virtual Join Link: ${event.meetingUrl}\n\n` : ''}Please arrive on time. You can register your attendance at the venue entrance using your QR code badge scanner.\n\nBest regards,\nDr. R. K. Sharma\nOffice of the Principal`;

    setReminderData({
      eventId: event.id,
      eventName: event.name,
      subject: `Reminder: ${event.name} - ${formattedDate}`,
      recipients: event.attendees ? event.attendees.map(a => a.name).join(', ') : 'All Assigned Departments',
      body: bodyText
    });

    setShowReminderModal(true);
  };

  const sendCustomReminders = (e) => {
    e.preventDefault();
    addLog(`Principal dispatched custom reminder emails for "${reminderData.eventName}" to: ${reminderData.recipients}`);
    setShowReminderModal(false);
    triggerToast(`✉️ Customized email invitations sent successfully!`);
  };

  // Notes update simulator
  const [newNoteText, setNewNoteText] = useState('');
  const handleAddNote = (eventId) => {
    if (!newNoteText.trim()) return;
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const updated = {
          ...ev,
          notes: ev.notes ? ev.notes + '\n• ' + newNoteText : '• ' + newNoteText
        };
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(updated);
        }
        return updated;
      }
      return ev;
    }));
    const ev = events.find(e => e.id === eventId);
    addLog(`Updated meeting notes for "${ev.name}"`);
    setNewNoteText('');
    triggerToast('📝 Notes updated successfully.');
  };

  // Document upload simulator
  const handleDocUploadSim = (eventId) => {
    const docName = `agenda_appendix_${Math.floor(Math.random() * 1000)}.pdf`;
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const updated = { ...ev, documents: [...ev.documents, docName] };
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(updated);
        }
        return updated;
      }
      return ev;
    }));
    triggerToast(`📎 Document "${docName}" attached successfully!`);
  };

  // Image Upload handler (Real client uploader via object URLs)
  const handleGalleryUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedEvent) {
      triggerToast('⚠️ Please select an event to add photos to.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setEvents(prev => prev.map(ev => {
      if (ev.id === selectedEvent.id) {
        const updated = {
          ...ev,
          gallery: [...ev.gallery, localUrl]
        };
        setSelectedEvent(updated);
        return updated;
      }
      return ev;
    }));
    addLog(`Principal uploaded photo to "${selectedEvent.name}" event gallery.`);
    triggerToast('🖼️ New event snapshot added to gallery!');
  };

  // Filtered Events
  const filteredEvents = events.filter(ev => {
    const matchesSearch = ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ev.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ev.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === 'All') return matchesSearch;
    if (selectedTab === 'Meetings') return matchesSearch && (ev.type.includes('Meeting') || ev.type.includes('PTA'));
    if (selectedTab === 'Seminars & Workshops') return matchesSearch && (ev.type === 'Seminars' || ev.type === 'Workshops');
    if (selectedTab === 'Academic & Placement') return matchesSearch && (ev.type.includes('Placement') || ev.type.includes('Academic'));
    if (selectedTab === 'Pending Approvals') return matchesSearch && ev.status === 'Pending Approval';
    return matchesSearch;
  });

  // Derived metrics for dashboard cards
  const upcomingMeetingsCount = events.filter(e => (e.type.includes('Meeting') || e.type.includes('PTA')) && e.status === 'Scheduled').length;
  const todayEventsCount = events.filter(e => e.dateTime.startsWith('2026-05-26')).length;
  const pendingApprovalsCount = events.filter(e => e.status === 'Pending Approval').length;
  const scheduledSeminarsCount = events.filter(e => e.type === 'Seminars' && e.status === 'Scheduled').length;
  const departmentEventsCount = events.filter(e => e.department !== 'All Departments').length;

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
    // Pad previous month blanks
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Fill current month days
    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Open scheduler modal with calendar prefilled day
  const handleCalendarDayClick = (dayDate) => {
    if (!dayDate) return;
    const offset = dayDate.getTimezoneOffset();
    const localDate = new Date(dayDate.getTime() - (offset * 60 * 1000));
    const dateStr = localDate.toISOString().split('T')[0] + 'T10:00';
    
    setFormData(prev => ({
      ...prev,
      dateTime: dateStr
    }));
    setShowCreateModal(true);
  };

  // --- REPORT GENERATION AND ANALYTICS PREP ---
  const completedEvents = events.filter(e => e.status === 'Completed');
  
  // Calculate average attendance percentage
  let totalAttendeesExpected = 0;
  let totalAttendeesAttended = 0;
  completedEvents.forEach(e => {
    if (e.attendees && e.attendees.length > 0) {
      totalAttendeesExpected += e.attendees.length;
      totalAttendeesAttended += e.attendees.filter(a => a.attended).length;
    }
  });
  const avgAttendanceRate = totalAttendeesExpected > 0 ? Math.round((totalAttendeesAttended / totalAttendeesExpected) * 100) : 85;

  // Chart data 1: Attendance rate per completed/ongoing event
  const attendanceChartData = events
    .filter(e => e.status === 'Completed' || e.status === 'Ongoing')
    .map(e => {
      const total = e.attendees ? e.attendees.length : 0;
      const attended = e.attendees ? e.attendees.filter(a => a.attended).length : 0;
      const percent = total > 0 ? Math.round((attended / total) * 100) : 0;
      return {
        name: e.name.length > 15 ? e.name.substring(0, 15) + '...' : e.name,
        attendanceRate: percent,
        total: total,
        attended: attended
      };
    });

  // Chart data 2: Event distribution by type
  const eventTypesCounts = events.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {});
  const typeChartData = Object.keys(eventTypesCounts).map(key => ({
    name: key,
    value: eventTypesCounts[key]
  }));

  const COLORS = ['var(--primary)', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366F1', '#06b6d4', '#14b8a6'];

  // Visual workflow stepper helper
  const getStepperActiveStep = (status, notes, documents) => {
    if (status === 'Pending Approval') return 1;
    if (status === 'Cancelled') return -1;
    if (status === 'Scheduled') return 2;
    if (status === 'Ongoing') return 3;
    if (status === 'Completed') {
      // If it has reports/notes/appendix docs filed
      if (notes || (documents && documents.length > 1)) {
        return 5;
      }
      return 4;
    }
    return 2;
  };

  // --- RENDER HELPER: Selected Event Details Pane ---
  const renderSelectedEventDetails = () => {
    const step = getStepperActiveStep(selectedEvent.status, selectedEvent.notes, selectedEvent.documents);
    
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '280px' }}>
        
        {/* WORKFLOW STEPPER */}
        {selectedEvent.status !== 'Cancelled' ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            {[
              { label: 'Proposed', num: 1 },
              { label: 'Scheduled', num: 2 },
              { label: 'Ongoing', num: 3 },
              { label: 'Completed', num: 4 },
              { label: 'Report Filed', num: 5 }
            ].map((s, index, arr) => {
              const isPassed = step >= s.num;
              const isActive = step === s.num;
              
              return (
                <div key={s.num} className="workflow-step">
                  <div className="workflow-circle" style={{
                    backgroundColor: isActive ? 'var(--primary)' : isPassed ? 'var(--success)' : 'var(--bg-primary)',
                    color: isActive || isPassed ? 'white' : 'var(--text-muted)',
                    border: isActive ? '2px solid var(--primary)' : isPassed ? '2px solid var(--success)' : '2px solid var(--border-color)',
                  }}>
                    {isPassed && !isActive ? '✓' : s.num}
                  </div>
                  <span style={{ fontSize: '0.62rem', fontWeight: isActive || isPassed ? 700 : 500, color: isActive ? 'var(--primary)' : isPassed ? 'var(--success)' : 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    {s.label}
                  </span>
                  {index < arr.length - 1 && (
                    <div className="workflow-line" style={{
                      backgroundColor: step > s.num ? 'var(--success)' : 'var(--border-color)',
                      left: '50%',
                      width: '100%'
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', padding: '0.6rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.78rem', fontWeight: 700 }}>
            <AlertTriangle size={14} /> This event was cancelled and removed from the active calendar schedule.
          </div>
        )}

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

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
          <strong>Agenda:</strong> {selectedEvent.agenda || 'No specific agenda description uploaded yet.'}
        </p>

        {/* Simulated Attendance Roster */}
        <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Track Attendance Roster</span>
            
            {selectedEvent.status !== 'Cancelled' && (
              <button 
                onClick={() => {
                  // Reset scanner success state and select first un-checked attendee
                  setQrScanSuccess(false);
                  const pending = selectedEvent.attendees ? selectedEvent.attendees.find(a => !a.attended) : null;
                  setQrScanAttendee(pending ? pending.name : '');
                  setShowQrModal(true);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
              >
                <QrCode size={12} /> QR Scanner
              </button>
            )}
          </div>
          {selectedEvent.attendees && selectedEvent.attendees.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {selectedEvent.attendees.map((attendee, index) => (
                <div key={index} className="flex justify-between items-center" style={{ fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{attendee.name}</span>
                  <span style={{ 
                    color: attendee.attended ? 'var(--success)' : 'var(--danger)', 
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}>
                    {attendee.attended ? '✓ Attended' : '✗ Absent'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No attendees assigned to track yet.</span>
          )}
        </div>

        {/* Meeting Notes Panel */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Notes & Action Items (Workflow Step 4/5)
          </label>
          {selectedEvent.notes ? (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              whiteSpace: 'pre-wrap', 
              backgroundColor: 'rgba(245, 158, 11, 0.05)', 
              padding: '0.6rem', 
              borderRadius: '8px', 
              borderLeft: '3px solid var(--warning)',
              marginBottom: '0.5rem'
            }}>
              {selectedEvent.notes}
            </div>
          ) : (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No meeting notes documented yet. Notes are required to complete step 4.</p>
          )}
          
          {selectedEvent.status !== 'Cancelled' && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <input 
                type="text" 
                placeholder="Add note item..." 
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
              />
              <button 
                onClick={() => handleAddNote(selectedEvent.id)}
                style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Uploaded Documents */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Attached Agendas & Slides
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.5rem' }}>
            {selectedEvent.documents && selectedEvent.documents.map((doc, idx) => (
              <div key={idx} className="flex justify-between items-center" style={{ padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-primary)', fontSize: '0.7rem' }}>
                <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={11} className="text-[#3b82f6]" /> {doc}
                </span>
                <a href="#download" onClick={(e) => { e.preventDefault(); triggerToast(`📥 Downloading "${doc}"...`); }}><Download size={11} /></a>
              </div>
            ))}
          </div>
          
          {selectedEvent.status !== 'Cancelled' && (
            <button 
              onClick={() => handleDocUploadSim(selectedEvent.id)}
              style={{ background: 'transparent', border: '1px dashed var(--border-color)', width: '100%', padding: '0.4rem', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
            >
              📎 Upload Document Agenda
            </button>
          )}
        </div>

        {/* Event Gallery */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            Event Gallery Snapshot Upload
          </label>
          {selectedEvent.gallery && selectedEvent.gallery.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '0.5rem' }}>
              {selectedEvent.gallery.map((imgUrl, idx) => (
                <img 
                  key={idx} 
                  src={imgUrl} 
                  alt="Event Snapshot" 
                  style={{ width: '100%', height: '55px', objectFit: 'cover', borderRadius: '4px' }} 
                />
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No pictures uploaded yet.</p>
          )}
          
          {selectedEvent.status !== 'Cancelled' && (
            <>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleGalleryUpload}
                style={{ display: 'none' }}
              />
              <button 
                onClick={() => fileInputRef.current.click()}
                style={{ background: 'transparent', border: '1px dashed var(--border-color)', width: '100%', padding: '0.4rem', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
              >
                <ImageIcon size={11} /> Choose Gallery Image to Upload
              </button>
            </>
          )}
        </div>

        {/* Integration triggers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <button 
            onClick={() => triggerToast('📅 Calendar Synced! Calendar invites sent to Outlook/Google Calendar queues.')}
            style={{ padding: '0.5rem', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
          >
            <Calendar size={12} /> Sync Calendar
          </button>
          <button 
            onClick={() => {
              // Populate certificate template values
              const attendedAttendees = selectedEvent.attendees ? selectedEvent.attendees.filter(a => a.attended) : [];
              setCertName(attendedAttendees.length > 0 ? attendedAttendees[0].name : 'Rohan Gupta');
              setCertSeminar(selectedEvent.name);
              setShowCertificateModal(true);
            }}
            style={{ padding: '0.5rem', background: '#10b981', border: 'none', color: 'white', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', cursor: 'pointer' }}
          >
            <Award size={12} /> Generate Certificate
          </button>
        </div>

      </div>
    );
  };

  // --- RENDER HELPER: Empty Details State ---
  const renderEmptyEventDetails = () => {
    return (
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '280px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-muted)', textAlign: 'center' }}>
          <Calendar size={32} style={{ opacity: 0.5, marginBottom: '10px' }} />
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>No Event Selected</h4>
          <p style={{ fontSize: '0.75rem', maxWidth: '180px', margin: '4px auto 0' }}>Select any scheduled row to track attendance, notes, files, or print certificates.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="main-content" style={{ padding: '2rem', minHeight: 'calc(100vh - 70px)', background: 'var(--bg-primary)' }}>
      
      {/* Dynamic Embedded CSS style tag for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 96%; opacity: 0.8; }
          100% { top: 0%; opacity: 0.8; }
        }
        .scanner-viewfinder {
          position: relative;
          background: #111827;
          border: 2px solid var(--primary);
          border-radius: 8px;
          height: 180px;
          overflow: hidden;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .scanner-line {
          position: absolute;
          left: 0;
          width: 100%;
          height: 3px;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: scan 2.5s linear infinite;
        }
        .workflow-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
          text-align: center;
        }
        .workflow-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.75rem;
          z-index: 2;
          transition: all 0.3s ease;
        }
        .workflow-line {
          position: absolute;
          top: 14px;
          left: 50%;
          width: 100%;
          height: 3px;
          z-index: 1;
          transition: all 0.3s ease;
        }
        .calendar-cell {
          aspect-ratio: 1.2;
          border: 1px solid var(--border-color);
          padding: 0.4rem;
          min-height: 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s ease;
          background: var(--bg-secondary);
        }
        .calendar-cell:hover {
          background: rgba(79, 70, 229, 0.05);
        }
        .calendar-event-tag {
          font-size: 0.68rem;
          padding: 2px 4px;
          border-radius: 4px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 600;
          color: white;
          box-shadow: var(--shadow-sm);
        }
      `}} />

      {/* Toast Alert */}
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
          zIndex: 9999,
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

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar style={{ color: '#3730A5' }} size={28} /> Meetings & Event Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Schedule administrative forums, authorize departmental academic initiatives, compile attendee metrics, and sync schedules.
          </p>
        </div>

        {/* Oversight Access Control Indicator */}
        <div className="glass-card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', borderLeft: '3px solid #3730A5' }}>
          <UserCheck size={18} style={{ color: '#3730A5' }} />
          <div>
            <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Oversight Bounds</span>
            <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Principal Account - Scheduler Role</strong>
          </div>
        </div>
      </div>

      {/* VIEW TABS SELECTOR (Full width dashboard option) */}
      <div className="glass-card mb-6" style={{ padding: '0.4rem', borderRadius: '12px', display: 'inline-flex', gap: '0.5rem' }}>
        <button
          onClick={() => { setActiveView('list'); setSelectedEvent(null); }}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: activeView === 'list' ? '#3730A5' : 'transparent',
            color: activeView === 'list' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📋 Schedules List
        </button>
        <button
          onClick={() => { setActiveView('calendar'); setSelectedEvent(null); }}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: activeView === 'calendar' ? '#3730A5' : 'transparent',
            color: activeView === 'calendar' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📅 Interactive Calendar
        </button>
        <button
          onClick={() => { setActiveView('reports'); setSelectedEvent(null); }}
          style={{
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            backgroundColor: activeView === 'reports' ? '#3730A5' : 'transparent',
            color: activeView === 'reports' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📊 Analytics & Reports
        </button>
      </div>

      {/* --- DASHBOARD CARDS (5 Cards) --- */}
      {activeView !== 'reports' && (
        <div className="stats-grid mb-6 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Clock size={18} /></div>
            <div className="stat-details">
              <h3>Upcoming Meetings</h3>
              <p className="stat-value">{upcomingMeetingsCount}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Staff & HOD Syncs</span>
            </div>
          </div>

          <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Calendar size={18} /></div>
            <div className="stat-details">
              <h3>Today Events</h3>
              <p className="stat-value">{todayEventsCount}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Active schedules</span>
            </div>
          </div>

          <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: '#FAEEDA', color: 'var(--warning)' }}><AlertTriangle size={18} /></div>
            <div className="stat-details">
              <h3>Pending Approvals</h3>
              <p className="stat-value">{pendingApprovalsCount}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>HOD proposals</span>
            </div>
          </div>

          <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><BookOpen size={18} /></div>
            <div className="stat-details">
              <h3>Scheduled Seminars</h3>
              <p className="stat-value">{scheduledSeminarsCount}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)' }}>Invites dispatched</span>
            </div>
          </div>

          <div className="stat-card" style={{ border: '1px solid #E3E5EC' }}>
            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}><Users size={18} /></div>
            <div className="stat-details">
              <h3>Department Events</h3>
              <p className="stat-value">{departmentEventsCount}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cross-dept initiatives</span>
            </div>
          </div>
        </div>
      )}

      {/* --- RENDER VIEW: REPORTS & ANALYTICS --- */}
      {activeView === 'reports' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Analytics Statistics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
                <Calendar size={28} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Schedules Filed</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>{events.length}</strong>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #10b981' }}>
              <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckSquare size={28} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completed Operations</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>{completedEvents.length}</strong>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Users size={28} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Attendance Roster</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>{avgAttendanceRate}%</strong>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <AlertTriangle size={28} />
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Authorizations</span>
                <strong style={{ fontSize: '1.8rem', color: 'var(--text-main)' }}>{pendingApprovalsCount}</strong>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
            
            {/* Attendance Chart */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
                Roster Attendance Rate per Event (%)
              </h3>
              <div style={{ width: '100%', height: 300 }}>
                {attendanceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={attendanceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                      <Bar dataKey="attendanceRate" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Attendance %">
                        {attendanceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.attendanceRate > 75 ? '#10b981' : entry.attendanceRate > 50 ? '#3b82f6' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted">No completed events with attendance tracked.</div>
                )}
              </div>
            </div>

            {/* Event Distribution Chart */}
            <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1.2rem' }}>
                Event Category Distribution
              </h3>
              <div style={{ width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '60%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '0.4rem', justifyContent: 'center' }}>
                  {typeChartData.map((entry, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }}></span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Report Event Grid */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>
              Generate Official Institutional Summaries & PDF Reports
            </h3>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Event Details</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Expected Attendees</th>
                    <th>Attended Count</th>
                    <th>Attendance Rate</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const total = event.attendees ? event.attendees.length : 0;
                    const attended = event.attendees ? event.attendees.filter(a => a.attended).length : 0;
                    const pct = total > 0 ? Math.round((attended / total) * 100) : 0;

                    return (
                      <tr key={event.id}>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>{event.name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📍 {event.venue}</div>
                        </td>
                        <td>
                          <span style={{ padding: '2px 6px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {event.type}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                          {new Date(event.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{total || 'N/A'}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{total > 0 ? attended : 'N/A'}</td>
                        <td>
                          {total > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct > 75 ? 'var(--success)' : pct > 50 ? 'var(--primary)' : 'var(--danger)' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{pct}%</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No tracking</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowReportModal(true);
                            }}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                          >
                            Generate Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- RENDER VIEW: INTERACTIVE CALENDAR --- */}
      {activeView === 'calendar' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '1.5rem' }}>
          
          {/* Calendar Left Card */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
            
            {/* Calendar Month Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} className="text-[var(--primary)]" />
                {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handlePrevMonth} className="glass-card" style={{ padding: '0.4rem', borderRadius: '8px' }}><ChevronLeft size={16} /></button>
                <button onClick={() => setCalendarDate(new Date('2026-05-26'))} className="glass-card" style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>Today</button>
                <button onClick={handleNextMonth} className="glass-card" style={{ padding: '0.4rem', borderRadius: '8px' }}><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Days Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ padding: '0.2rem' }}>{d}</div>)}
            </div>

            {/* Calendar Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {getCalendarDays().map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} style={{ background: 'transparent', border: '1px solid transparent' }} />;
                
                const dateStr = day.toISOString().split('T')[0];
                const dayEvents = events.filter(e => e.dateTime.startsWith(dateStr));
                
                const isToday = dateStr === '2026-05-26';
                
                return (
                  <div
                    key={dateStr}
                    onClick={() => handleCalendarDayClick(day)}
                    className="calendar-cell"
                    style={{
                      border: isToday ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: isToday ? 'var(--primary)' : 'var(--text-main)',
                        background: isToday ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                        padding: '2px 6px',
                        borderRadius: '50%'
                      }}>
                        {day.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'white', borderRadius: '10px', padding: '0 4px', fontWeight: 700 }}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'hidden', maxHeight: '55px', marginTop: '4px' }}>
                      {dayEvents.slice(0, 3).map(ev => {
                        let bg = '#3b82f6';
                        if (ev.type.includes('Meeting')) bg = 'var(--primary)';
                        if (ev.type.includes('Seminar') || ev.type.includes('Workshop')) bg = '#6366F1';
                        if (ev.type.includes('Placement')) bg = '#10b981';
                        if (ev.status === 'Cancelled') bg = '#ef4444';
                        if (ev.status === 'Pending Approval') bg = '#f59e0b';

                        return (
                          <div
                            key={ev.id}
                            title={`${ev.name} (${ev.venue})`}
                            className="calendar-event-tag"
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
                      {dayEvents.length > 3 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>+{dayEvents.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', fontSize: '0.72rem', fontWeight: 700 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--primary)' }}></span> HOD/Staff Meetings</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#6366F1' }}></span> Seminars & Workshops</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }}></span> Placements</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }}></span> Pending Approvals</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }}></span> Cancelled</div>
            </div>

          </div>

          {/* Calendar Right column: Details Preview (Re-used standard detail block) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Selected Event Details Block */}
            {selectedEvent ? renderSelectedEventDetails() : renderEmptyEventDetails()}
            
            {/* Small activity logs in calendar */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem' }}>
                ⚡ Activity Logs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto' }}>
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

      {/* --- RENDER VIEW: STANDARD SCHEDULES LIST (Original Split Layout) --- */}
      {activeView === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '1.5rem' }}>
          
          {/* LEFT COLUMN: EVENTS TABLE */}
          <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', minHeight: '500px' }}>
            
            {/* Filter tab bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              
              {/* Tabs */}
              <div className="flex gap-2 flex-wrap">
                {['All', 'Meetings', 'Seminars & Workshops', 'Academic & Placement', 'Pending Approvals'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: selectedTab === tab ? 'var(--primary)' : 'transparent',
                      color: selectedTab === tab ? 'white' : 'var(--text-muted)',
                      border: selectedTab === tab ? 'none' : '1px solid var(--border-color)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Search & Add */}
              <div className="flex gap-2 items-center flex-wrap">
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="text"
                    placeholder="Search events, venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem 0.5rem 2.2rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      width: '180px'
                    }}
                  />
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}
                >
                  <Plus size={16} /> Create Schedule
                </button>
              </div>

            </div>

            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ClipboardList size={18} className="text-[var(--primary)]" /> Scheduled Operations & Forums
            </h2>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Event Details</th>
                    <th>Department</th>
                    <th>Date & Time</th>
                    <th>Organizer</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No meetings or events found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map(event => (
                      <tr key={event.id} style={{ cursor: 'pointer', background: selectedEvent && selectedEvent.id === event.id ? 'rgba(79, 70, 229, 0.05)' : '' }} onClick={() => setSelectedEvent(event)}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{event.name}</div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                            📂 {event.type}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            backgroundColor: 'rgba(79, 70, 229, 0.08)', 
                            color: 'var(--primary)', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.72rem',
                            fontWeight: 700 
                          }}>
                            {event.department}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <div>{new Date(event.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                            ⏰ {new Date(event.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {event.organizer}
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} className="text-[#3b82f6]" /> {event.venue}
                          </div>
                          {event.meetingUrl && (
                            <a 
                              href={event.meetingUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ fontSize: '0.7rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Video size={11} /> Launch Virtual Link
                            </a>
                          )}
                        </td>
                        <td>
                          <span style={{ 
                            backgroundColor: 
                              event.status === 'Scheduled' ? 'rgba(59, 130, 246, 0.1)' :
                              event.status === 'Ongoing' ? 'rgba(16, 185, 129, 0.1)' :
                              event.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' :
                              event.status === 'Cancelled' ? 'rgba(239, 68, 68, 0.1)' :
                              'rgba(245, 158, 11, 0.1)',
                            color: 
                              event.status === 'Scheduled' ? '#3b82f6' :
                              event.status === 'Ongoing' ? '#10b981' :
                              event.status === 'Completed' ? '#10b981' :
                              event.status === 'Cancelled' ? '#ef4444' :
                              '#f59e0b',
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '0.72rem', 
                            fontWeight: 700 
                          }}>
                            {event.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {event.status === 'Pending Approval' ? (
                              <button
                                onClick={(e) => handleApproveEvent(event.id, e)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--success)', color: 'white', fontSize: '0.72rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                            ) : (
                              <button
                                onClick={(e) => openReminderDialog(event, e)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--primary)', color: 'white', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', border: 'none', cursor: 'pointer' }}
                              >
                                <Mail size={11} /> Invite
                              </button>
                            )}

                            {/* Edit Action */}
                            <button
                              onClick={(e) => openEditModal(event, e)}
                              style={{ padding: '4px 6px', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.72rem', cursor: 'pointer' }}
                              title="Edit Event"
                            >
                              <Edit2 size={11} />
                            </button>
                            
                            {event.status !== 'Cancelled' && event.status !== 'Completed' && (
                              <button
                                onClick={(e) => handleCancelEvent(event.id, e)}
                                style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--danger)', color: 'white', fontSize: '0.72rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                              >
                                Cancel
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

          {/* RIGHT COLUMN: DETAIL PANEL / UTILITIES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {selectedEvent ? renderSelectedEventDetails() : renderEmptyEventDetails()}
            
            {/* Activity Log / Notification Flow Feed */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px' }}>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ⚡ Notification Flow & Activity Logs
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {activityLogs.map((log, idx) => (
                  <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', marginRight: '6px' }}>[{log.time}]</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* IT SUPERADMIN BOUNDARY SAFEGUARDS */}
            <div className="glass-card" style={{ padding: '1.2rem', borderRadius: '16px', borderLeft: '3px solid var(--danger)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🛡️ Role Clearance Restrictions
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.8rem' }}>
                Principal boundaries prohibit structural database mutations:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button 
                  onClick={() => handleRestrictedAction('Manage server databases / networks')}
                  className="glass-card" 
                  style={{ padding: '5px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  ❌ Manage Server/Database
                </button>
                <button 
                  onClick={() => handleRestrictedAction('Change core admin configurations')}
                  className="glass-card" 
                  style={{ padding: '5px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔑 Alter Super Admin Settings
                </button>
                <button 
                  onClick={() => handleRestrictedAction('Delete registered college users')}
                  className="glass-card" 
                  style={{ padding: '5px', fontSize: '0.72rem', borderRadius: '6px', textAlign: 'left', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
                >
                  🗑️ Delete System Users
                </button>
              </div>
            </div>

          </div>

        </div>
      )}




      {/* MODAL 1: CREATE MEETING & EVENT SCHEDULER */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus className="text-[var(--primary)]" size={20} /> Create New Meeting & Event Schedule
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Event / Meeting Name *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Q3 Syllabus HOD Forum" 
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
                    <option value="Staff Meetings">Staff Meetings</option>
                    <option value="HOD Meetings">HOD Meetings</option>
                    <option value="Parent Meetings">Parent Meetings</option>
                    <option value="College Events">College Events</option>
                    <option value="Seminars">Seminars</option>
                    <option value="Workshops">Workshops</option>
                    <option value="Placement Drives">Placement Drives</option>
                    <option value="Academic Events">Academic Events</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Assign Target Departments
                  </label>
                  <select 
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  >
                    <option value="All Departments">All Departments</option>
                    <option value="CSE Department">CSE Department</option>
                    <option value="IT Department">IT Department</option>
                    <option value="AI&DS Department">AI&DS Department</option>
                    <option value="Cyber Security Department">Cyber Security Department</option>
                    <option value="ECE Department">ECE Department</option>
                    <option value="EEE Department">EEE Department</option>
                    <option value="MECH Department">MECH Department</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Date & Scheduled Time *
                  </label>
                  <input 
                    type="datetime-local" 
                    required
                    value={formData.dateTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Venue Location *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Conference Hall B" 
                    value={formData.venue}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Agenda Details
                </label>
                <textarea 
                  rows="3"
                  placeholder="Outline the detailed schedule objectives..."
                  value={formData.agenda}
                  onChange={(e) => setFormData(prev => ({ ...prev, agenda: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              {/* Advanced Integrated Meeting Options */}
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="isOnline"
                    checked={formData.isOnline}
                    onChange={(e) => setFormData(prev => ({ ...prev, isOnline: e.target.checked }))}
                  />
                  <label htmlFor="isOnline" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Enable Google Meet / Zoom Virtual Link Integration
                  </label>
                </div>
                {formData.isOnline && (
                  <input 
                    type="text" 
                    placeholder="Optional: Paste URL (or blank to auto-generate link)" 
                    value={formData.meetingUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingUrl: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Invite Attendees (comma-separated names)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Dr. Amit Verma, Dr. Priya Nair, Rohan Gupta" 
                  value={formData.attendeesListString}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendeesListString: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Agenda Document / Brochure File name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. quantum_computing_flyer.pdf" 
                  value={formData.agendaFile}
                  onChange={(e) => setFormData(prev => ({ ...prev, agendaFile: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
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
                  Create & Send Invites
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SCHEDULE */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit2 className="text-[var(--primary)]" size={20} /> Edit Meeting & Event Schedule
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleUpdateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Event / Meeting Name *
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
                    <option value="Staff Meetings">Staff Meetings</option>
                    <option value="HOD Meetings">HOD Meetings</option>
                    <option value="Parent Meetings">Parent Meetings</option>
                    <option value="College Events">College Events</option>
                    <option value="Seminars">Seminars</option>
                    <option value="Workshops">Workshops</option>
                    <option value="Placement Drives">Placement Drives</option>
                    <option value="Academic Events">Academic Events</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Assign Target Departments
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
                    <option value="MBA Department">MBA Department</option>
                    <option value="BCA Department">BCA Department</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Date & Scheduled Time *
                  </label>
                  <input 
                    type="datetime-local" 
                    required
                    value={editFormData.dateTime}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Venue Location *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.venue}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, venue: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Agenda Details
                </label>
                <textarea 
                  rows="3"
                  value={editFormData.agenda}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, agenda: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'inherit' }}
                ></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Event Status
                </label>
                <select 
                  value={editFormData.status}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending Approval">Pending Approval</option>
                </select>
              </div>

              {/* Advanced Integrated Meeting Options */}
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.8rem', borderRadius: '8px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox" 
                    id="editIsOnline"
                    checked={editFormData.isOnline}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, isOnline: e.target.checked }))}
                  />
                  <label htmlFor="editIsOnline" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Enable Google Meet / Zoom Virtual Link Integration
                  </label>
                </div>
                {editFormData.isOnline && (
                  <input 
                    type="text" 
                    placeholder="Optional: Paste URL (or blank to auto-generate link)" 
                    value={editFormData.meetingUrl}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, meetingUrl: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Invite Attendees (comma-separated names)
                </label>
                <input 
                  type="text" 
                  value={editFormData.attendeesListString}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, attendeesListString: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Agenda Document / Brochure File
                </label>
                <input 
                  type="text" 
                  value={editFormData.agendaFile}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, agendaFile: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                />
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


      {/* MODAL 2: QR CHECK-IN ATTENDANCE SIMULATOR */}
      {showQrModal && selectedEvent && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '420px', textAlign: 'center', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-end">
              <button onClick={() => setShowQrModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            {/* VIEW FINDER BOX WITH GREEN LASER ANIMATION */}
            <div className="scanner-viewfinder" style={{ borderColor: qrScanSuccess ? '#10b981' : 'var(--primary)' }}>
              <div className="scanner-line" style={{ background: qrScanSuccess ? '#10b981' : 'var(--primary)', boxShadow: qrScanSuccess ? '0 0 10px #10b981' : '0 0 10px var(--primary)' }} />
              {qrScanSuccess ? (
                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem', zIndex: 5, animation: 'fadeIn 0.2s' }}>
                  ✓ Check-in Verified!
                </div>
              ) : (
                <QrCode size={90} className="text-[#3b82f6]" style={{ opacity: 0.8, zIndex: 3 }} />
              )}
            </div>
            
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              QR Code Event Check-in Scanner
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: '1.4' }}>
              Select a participant from the pending list to simulate scanning their badge at the door.
            </p>

            {/* Selector of pending attendees */}
            {selectedEvent.attendees && selectedEvent.attendees.filter(a => !a.attended).length > 0 ? (
              <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Choose Participant Badge:
                </label>
                <select
                  value={qrScanAttendee}
                  onChange={(e) => setQrScanAttendee(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)' }}
                >
                  <option value="">-- Choose Attendee --</option>
                  {selectedEvent.attendees.filter(a => !a.attended).map((a, idx) => (
                    <option key={idx} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ padding: '0.8rem', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--success)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                🎉 All expected attendees have checked in!
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={!qrScanAttendee || qrScanSuccess}
                onClick={() => {
                  if (!qrScanAttendee) return;
                  
                  // Flash screen verified state
                  setQrScanSuccess(true);
                  
                  setTimeout(() => {
                    // Update attendance state
                    setEvents(prev => prev.map(ev => {
                      if (ev.id === selectedEvent.id) {
                        const updated = {
                          ...ev,
                          attendees: ev.attendees.map(att => att.name === qrScanAttendee ? { ...att, attended: true } : att)
                        };
                        setSelectedEvent(updated);
                        return updated;
                      }
                      return ev;
                    }));

                    addLog(`Registered QR code check-in for "${qrScanAttendee}" at "${selectedEvent.name}"`);
                    triggerToast(`✓ Checked in ${qrScanAttendee}`);
                    
                    // Reset scanner success state
                    setQrScanSuccess(false);
                    
                    // Preselect next pending if any
                    const remaining = selectedEvent.attendees
                      .filter(a => a.name !== qrScanAttendee && !a.attended);
                    setQrScanAttendee(remaining.length > 0 ? remaining[0].name : '');
                  }, 1200);
                }} 
                className="btn-primary"
                style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: !qrScanAttendee || qrScanSuccess ? 0.6 : 1 }}
              >
                Scan Badge
              </button>

              <button
                onClick={() => {
                  // Simulate full batch scan check-in
                  setEvents(prev => prev.map(ev => {
                    if (ev.id === selectedEvent.id) {
                      const updated = {
                        ...ev,
                        attendees: ev.attendees.map(att => ({ ...att, attended: true }))
                      };
                      setSelectedEvent(updated);
                      return updated;
                    }
                    return ev;
                  }));
                  addLog(`Principal simulated batch attendance check-in for "${selectedEvent.name}"`);
                  triggerToast('✅ Registered all attendees via simulated check-in!');
                  setShowQrModal(false);
                }}
                className="btn-primary"
                style={{ background: '#3b82f6', padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                Scan All
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL 3: CERTIFICATE GENERATOR */}
      {showCertificateModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '660px', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Award className="text-[#10b981]" size={20} /> Certificate Generator
              </h3>
              <button onClick={() => setShowCertificateModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Select Attending Participant
                </label>
                {selectedEvent && selectedEvent.attendees && selectedEvent.attendees.filter(a => a.attended).length > 0 ? (
                  <select 
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  >
                    {selectedEvent.attendees.filter(a => a.attended).map((a, idx) => (
                      <option key={idx} value={a.name}>{a.name}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    placeholder="Enter Full Name..." 
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Seminar / Workshop Title
                </label>
                <input 
                  type="text" 
                  value={certSeminar}
                  onChange={(e) => setCertSeminar(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Certificate Template */}
            <div style={{
              border: '10px double var(--primary)',
              padding: '2.5rem',
              textAlign: 'center',
              backgroundColor: '#fffaf0',
              color: '#2d3748',
              borderRadius: '8px',
              fontFamily: 'serif',
              position: 'relative',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
            }}>
              
              {/* Badge Emblem Design */}
              <div style={{ position: 'absolute', top: '10px', right: '20px', width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #b7791f', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef08a' }}>
                <Award size={32} style={{ color: '#b7791f' }} />
              </div>

              <span style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--primary)', fontWeight: 'bold', display: 'block', marginBottom: '0.8rem' }}>
                LAKESIDE INSTITUTE OF TECHNOLOGY
              </span>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '3px', color: '#718096', fontWeight: 600, display: 'block', marginBottom: '1.5rem' }}>
                ISO 9001:2015 CERTIFIED INSTITUTION
              </span>
              
              <p style={{ fontSize: '0.95rem', fontStyle: 'italic', margin: '0.5rem 0' }}>This is proudly presented to</p>
              <h2 style={{ fontSize: '2.2rem', color: '#1a202c', margin: '0.8rem 0', fontFamily: 'serif', fontWeight: 700, fontStyle: 'normal' }}>
                {certName || '[Participant Name]'}
              </h2>
              
              <p style={{ fontSize: '0.95rem', fontStyle: 'italic', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: '1.4' }}>
                for active participation, outstanding performance, and completion of the institutional development course/seminar program:
              </p>
              
              <strong style={{ fontSize: '1.3rem', color: 'var(--primary)', display: 'block', marginBottom: '2rem' }}>
                "{certSeminar || '[Seminar or Workshop Topic]'}"
              </strong>

              <div className="flex justify-between items-center" style={{ marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', fontStyle: 'normal', fontSize: '0.8rem' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: '1rem', color: '#4a5568' }}>Dr. Amit Verma</div>
                  <strong style={{ display: 'block', marginTop: '2px' }}>Event Convener</strong>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'cursive', fontSize: '1rem', color: '#4a5568' }}>Dr. R. K. Sharma</div>
                  <strong style={{ display: 'block', marginTop: '2px' }}>Principal Signatory</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => {
                  triggerToast('📥 Downloading high-res certificate PDF...');
                  setShowCertificateModal(false);
                }}
                className="btn-primary"
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#10b981', border: 'none', cursor: 'pointer' }}
              >
                <Download size={14} /> Download Certificate
              </button>
            </div>

          </div>
        </div>
      )}


      {/* MODAL 4: IT ACCESS BLOCKER DETAILS */}
      {showRestrictionDialog && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', maxWidth: '460px', textAlign: 'center', background: 'var(--bg-secondary)', border: '1.5px solid var(--danger)' }}>
            <ShieldAlert size={48} className="text-[#ef4444]" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Clearance Violation (Access Blocked)
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              You attempted to: <strong style={{ color: 'var(--text-main)' }}>{restrictionAction}</strong>.<br />
              Principal oversight is bounded to academic, curriculum, and departmental schedules. Structural database configurations require Super Admin authorization.
            </p>

            <button 
              onClick={() => setShowRestrictionDialog(false)} 
              className="btn-primary"
              style={{ background: 'var(--danger)', color: 'white', padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Acknowledge Boundaries
            </button>
          </div>
        </div>
      )}

      {/* MODAL 5: EMAIL REMINDER / INVITATION CUSTOMIZE */}
      {showReminderModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '520px', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail className="text-[var(--primary)]" size={20} /> Customize Invitation & Reminder Emails
              </h3>
              <button onClick={() => setShowReminderModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={sendCustomReminders} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Recipient List (Emails/Names)
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
                  Email Subject Line
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
                  Email Body
                </label>
                <textarea 
                  rows="10"
                  required
                  value={reminderData.body}
                  onChange={(e) => setReminderData(prev => ({ ...prev, body: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4' }}
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
                  <Send size={14} /> Send Email Invites
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: OFFICIAL DETAILED INSTITUTIONAL REPORT */}
      {showReportModal && selectedEvent && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div className="glass-card animate-fade-in" style={{ padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
            <div className="flex justify-between items-center mb-4 border-bottom pb-2">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText className="text-[var(--primary)]" size={20} /> Official Academic Operations Report
              </h3>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Printable Report Layout */}
            <div id="printable-report" style={{
              background: '#ffffff',
              color: '#333333',
              padding: '2rem',
              borderRadius: '8px',
              fontFamily: 'serif',
              border: '1px solid #e2e8f0',
              lineHeight: '1.6',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              {/* College Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #3182ce', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#2b6cb0', fontWeight: 800 }}>LAKESIDE INSTITUTE OF TECHNOLOGY</h2>
                <span style={{ fontSize: '0.8rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '1px' }}>Affiliated to State Technical University • Accredited Grade A</span>
                <h4 style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', color: '#2d3748', textDecoration: 'underline' }}>EXECUTIVE ACTIVITY SUMMARY REPORT</h4>
              </div>

              {/* Event Metadata grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.85rem', marginBottom: '1.5rem', background: '#f7fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                <div><strong>Event Name:</strong> {selectedEvent.name}</div>
                <div><strong>Venue / Hall:</strong> {selectedEvent.venue}</div>
                <div><strong>Category Type:</strong> {selectedEvent.type}</div>
                <div><strong>Scheduled Date:</strong> {new Date(selectedEvent.dateTime).toLocaleString()}</div>
                <div><strong>Organizer / Host:</strong> {selectedEvent.organizer}</div>
                <div><strong>Target Department:</strong> {selectedEvent.department}</div>
              </div>

              {/* Agenda Details */}
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <h5 style={{ margin: '0 0 0.4rem 0', color: '#2b6cb0', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', fontSize: '0.95rem' }}>I. Event Agenda & Scope</h5>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#4a5568' }}>{selectedEvent.agenda || 'No specific agenda details uploaded.'}</p>
              </div>

              {/* Roster & Attendance Analysis */}
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#2b6cb0', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', fontSize: '0.95rem' }}>II. Attendance Metrics & Check-in Roster</h5>
                {selectedEvent.attendees && selectedEvent.attendees.length > 0 ? (
                  <>
                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.8rem', fontWeight: 'bold', color: '#4a5568' }}>
                      <div>Total Invited: {selectedEvent.attendees.length}</div>
                      <div>Attended: {selectedEvent.attendees.filter(a => a.attended).length}</div>
                      <div>Absentees: {selectedEvent.attendees.filter(a => !a.attended).length}</div>
                      <div style={{ color: '#2f855a' }}>
                        Attendance Rate: {Math.round((selectedEvent.attendees.filter(a => a.attended).length / selectedEvent.attendees.length) * 100)}%
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', background: '#fff', border: '1px solid #e2e8f0', padding: '0.6rem', borderRadius: '4px' }}>
                      {selectedEvent.attendees.map((att, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid #f7fafc', paddingBottom: '2px' }}>
                          <span>{att.name}</span>
                          <span style={{ color: att.attended ? '#2f855a' : '#c53030', fontWeight: 'bold' }}>
                            {att.attended ? '✓ Attended' : '✗ Absent'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: '#718096' }}>No expected roster tracked. Event was open invitation or guest seminar.</p>
                )}
              </div>

              {/* Meeting Notes */}
              <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                <h5 style={{ margin: '0 0 0.4rem 0', color: '#2b6cb0', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', fontSize: '0.95rem' }}>III. Minutes & Action Items Recorded</h5>
                {selectedEvent.notes ? (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#2d3748', background: '#fefcbf', padding: '0.8rem', borderRadius: '6px', border: '1px solid #faf089', fontSize: '0.85rem' }}>
                    {selectedEvent.notes}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: '#718096', fontStyle: 'italic' }}>No action items recorded for this schedule yet.</p>
                )}
              </div>

              {/* Appendix Documents */}
              <div style={{ marginBottom: '2rem', fontSize: '0.85rem' }}>
                <h5 style={{ margin: '0 0 0.4rem 0', color: '#2b6cb0', borderBottom: '1px solid #e2e8f0', paddingBottom: '2px', fontSize: '0.95rem' }}>IV. Filed Materials & Attachments</h5>
                {selectedEvent.documents && selectedEvent.documents.length > 0 ? (
                  <div style={{ color: '#4a5568' }}>
                    Registered attachments: {selectedEvent.documents.join(', ')}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: '#718096', fontStyle: 'italic' }}>No files or brochures attached.</p>
                )}
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3.5rem', fontSize: '0.85rem' }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderBottom: '1px solid #718096', height: '20px' }}></div>
                  <strong style={{ display: 'block', marginTop: '4px' }}>Administrative Officer</strong>
                </div>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ borderBottom: '1px solid #718096', height: '20px', fontFamily: 'cursive', color: '#4a5568' }}>Dr. R. K. Sharma</div>
                  <strong style={{ display: 'block', marginTop: '4px' }}>Dr. R. K. Sharma (Principal)</strong>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => {
                  triggerToast('📥 Dispatched PDF compilation download request...');
                  setShowReportModal(false);
                }}
                className="btn-primary"
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Download size={14} /> Download PDF Summary
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
