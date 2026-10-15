import React, { useState, useEffect } from 'react';
import {
  Trophy, Sparkles, Plus, Search, Filter, Calendar, MapPin, Users,
  Award, Building2, CheckCircle2, Clock, Eye, Edit3, Trash2, Download,
  RefreshCw, AlertCircle, ExternalLink, ChevronRight, X, Check, Star
} from 'lucide-react';
import './SuperAdminDashboard.css';

// Default Multi-Talent Events Seed Data
const DEFAULT_EVENTS = [
  {
    id: 'MTE-2026-001',
    title: 'National Inter-Collegiate Multi-Talent Hackathon & Techfest 2026',
    category: 'Technical & Hackathons',
    hostCollege: 'Marudhar Kesari Jain College for Women',
    hostCity: 'Vaniyambadi, Tamil Nadu',
    venue: 'Vivekananda Auditorium & Smart Computing Labs',
    startDate: '2026-11-14',
    endDate: '2026-11-16',
    registrationDeadline: '2026-11-05',
    prizePool: 250000,
    status: 'Published',
    maxTeamsPerCollege: 5,
    enrolledCollegesCount: 14,
    totalContestants: 168,
    eligibility: 'All Enrolled UG/PG Engineering, Arts & Science Students',
    description: 'Premier inter-collegiate techfest featuring 36-hour hackathon, robotics duel, UI/UX design derby, and AI product innovation sprint with cash prizes and placement interview passes.',
    rounds: ['Preliminary Abstract Submission', 'Virtual Pitch & Prototype Demo', 'On-Campus 36-Hour Grand Finale'],
    participatingColleges: [
      { name: 'Marudhar Kesari Jain College for Women', teamsCount: 5, status: 'Host Institution' },
      { name: 'Arignar Anna College of Arts and Science', teamsCount: 4, status: 'Registered' },
      { name: 'Sacred Heart College (Autonomous)', teamsCount: 3, status: 'Shortlisted' },
      { name: 'Government Arts College', teamsCount: 2, status: 'Registered' }
    ]
  },
  {
    id: 'MTE-2026-002',
    title: 'Yuva Kalanjali 2026: State Cultural & Performing Arts Conclave',
    category: 'Cultural & Performing Arts',
    hostCollege: 'Arignar Anna College of Arts and Science',
    hostCity: 'Krishnagiri, Tamil Nadu',
    venue: 'Open-Air Amphitheatre & Kala Bhavan',
    startDate: '2026-12-02',
    endDate: '2026-12-04',
    registrationDeadline: '2026-11-20',
    prizePool: 180000,
    status: 'Published',
    maxTeamsPerCollege: 8,
    enrolledCollegesCount: 18,
    totalContestants: 240,
    eligibility: 'All Bonafide College Students',
    description: 'Flagship inter-college multi-talent cultural carnival showcasing classical & western dance, music bands, street theatre, fine arts, photography, and fashion runway.',
    rounds: ['Zonal Selection Rounds', 'Semi-Final Stage Show', 'Mega Cultural Night Grand Finals'],
    participatingColleges: [
      { name: 'Arignar Anna College of Arts and Science', teamsCount: 8, status: 'Host Institution' },
      { name: 'Marudhar Kesari Jain College for Women', teamsCount: 6, status: 'Shortlisted' },
      { name: 'Islamiah College (Autonomous)', teamsCount: 4, status: 'Registered' }
    ]
  },
  {
    id: 'MTE-2026-003',
    title: 'Apex All-India College Debate & Literary Parliament 2026',
    category: 'Academic & Literary',
    hostCollege: 'Loyola Academy of Higher Learning',
    hostCity: 'Chennai, Tamil Nadu',
    venue: 'Council Hall & Golden Jubilee Block',
    startDate: '2026-10-28',
    endDate: '2026-10-29',
    registrationDeadline: '2026-10-20',
    prizePool: 120000,
    status: 'Registration Open',
    maxTeamsPerCollege: 3,
    enrolledCollegesCount: 12,
    totalContestants: 72,
    eligibility: 'UG and PG Literary Society Members',
    description: 'National parliamentary debate competition, extempore oratory, policy drafting, and quiz tournament addressing national economic development and education policy.',
    rounds: ['Preliminary Debate Knockouts', 'Quarter-Finals & Semi-Finals', 'Parliamentary Grand Mock Assembly'],
    participatingColleges: [
      { name: 'Loyola Academy of Higher Learning', teamsCount: 3, status: 'Host Institution' },
      { name: 'Marudhar Kesari Jain College for Women', teamsCount: 2, status: 'Registered' },
      { name: 'Arignar Anna College of Arts and Science', teamsCount: 2, status: 'Registered' }
    ]
  },
  {
    id: 'MTE-2026-004',
    title: 'Inter-Collegiate Multi-Sports Championship & Athletics Meet',
    category: 'Sports & Athletics',
    hostCollege: 'Dr. MGR Sports & Physical Education Complex',
    hostCity: 'Vellore, Tamil Nadu',
    venue: 'University Stadium & Indoor Arena',
    startDate: '2026-12-18',
    endDate: '2026-12-21',
    registrationDeadline: '2026-12-05',
    prizePool: 300000,
    status: 'Upcoming',
    maxTeamsPerCollege: 12,
    enrolledCollegesCount: 22,
    totalContestants: 380,
    eligibility: 'College Athletic Association Enrolled Athletes',
    description: 'Annual inter-college sports festival featuring track and field events, basketball, volleyball, badminton, table tennis, and chess championships.',
    rounds: ['College Knockout Matches', 'Zonal Semi-Finals', 'Championship Medals Final'],
    participatingColleges: [
      { name: 'Dr. MGR Sports Complex', teamsCount: 10, status: 'Host Institution' },
      { name: 'Marudhar Kesari Jain College for Women', teamsCount: 8, status: 'Registered' },
      { name: 'Arignar Anna College of Arts and Science', teamsCount: 7, status: 'Registered' }
    ]
  }
];

export default function CollegeMultiTalentEvent() {
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('college_multi_talent_events');
      return saved ? JSON.parse(saved) : DEFAULT_EVENTS;
    } catch (e) {
      return DEFAULT_EVENTS;
    }
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Technical & Hackathons',
    hostCollege: 'Marudhar Kesari Jain College for Women',
    hostCity: '',
    venue: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    prizePool: 100000,
    status: 'Published',
    maxTeamsPerCollege: 5,
    eligibility: 'All Enrolled College Students',
    description: '',
    rounds: 'Round 1: Preliminary Screening\nRound 2: Semi-Final Presentation\nRound 3: Grand Finale'
  });

  useEffect(() => {
    try {
      localStorage.setItem('college_multi_talent_events', JSON.stringify(events));
    } catch (e) {
      console.error(e);
    }
  }, [events]);

  const categories = [
    'All',
    'Technical & Hackathons',
    'Cultural & Performing Arts',
    'Academic & Literary',
    'Sports & Athletics'
  ];

  const totalPrizePool = events.reduce((sum, ev) => sum + (Number(ev.prizePool) || 0), 0);
  const totalContestants = events.reduce((sum, ev) => sum + (Number(ev.totalContestants) || 0), 0);
  const totalHostColleges = new Set(events.map(ev => ev.hostCollege)).size;

  const filteredEvents = events.filter((ev) => {
    if (activeCategory !== 'All' && ev.category !== activeCategory) return false;
    if (statusFilter !== 'All' && ev.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        ev.title?.toLowerCase().includes(q) ||
        ev.hostCollege?.toLowerCase().includes(q) ||
        ev.hostCity?.toLowerCase().includes(q) ||
        ev.id?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenCreate = () => {
    setEditingEventId(null);
    setFormData({
      title: '',
      category: 'Technical & Hackathons',
      hostCollege: 'Marudhar Kesari Jain College for Women',
      hostCity: 'Vaniyambadi, Tamil Nadu',
      venue: 'Main College Auditorium & Multi-Purpose Hall',
      startDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 17).toISOString().split('T')[0],
      registrationDeadline: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      prizePool: 150000,
      status: 'Published',
      maxTeamsPerCollege: 5,
      eligibility: 'All Enrolled College Students',
      description: '',
      rounds: 'Round 1: Preliminary Screening\nRound 2: Semi-Final Presentation\nRound 3: Grand Finale'
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (ev) => {
    setEditingEventId(ev.id);
    setFormData({
      title: ev.title,
      category: ev.category,
      hostCollege: ev.hostCollege,
      hostCity: ev.hostCity,
      venue: ev.venue,
      startDate: ev.startDate,
      endDate: ev.endDate,
      registrationDeadline: ev.registrationDeadline,
      prizePool: ev.prizePool,
      status: ev.status,
      maxTeamsPerCollege: ev.maxTeamsPerCollege,
      eligibility: ev.eligibility,
      description: ev.description,
      rounds: (ev.rounds || []).join('\n')
    });
    setShowCreateModal(true);
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.hostCollege) {
      alert('Please fill out the Event Title and Host College.');
      return;
    }

    const roundsArr = typeof formData.rounds === 'string'
      ? formData.rounds.split('\n').map(s => s.trim()).filter(Boolean)
      : formData.rounds;

    if (editingEventId) {
      setEvents(events.map(ev => ev.id === editingEventId ? {
        ...ev,
        ...formData,
        prizePool: Number(formData.prizePool),
        rounds: roundsArr
      } : ev));
    } else {
      const newEv = {
        ...formData,
        id: `MTE-2026-${String(events.length + 1).padStart(3, '0')}`,
        prizePool: Number(formData.prizePool),
        enrolledCollegesCount: 1,
        totalContestants: 24,
        rounds: roundsArr,
        participatingColleges: [
          { name: formData.hostCollege, teamsCount: 3, status: 'Host Institution' }
        ]
      };
      setEvents([newEv, ...events]);
    }

    setShowCreateModal(false);
  };

  const handleDeleteEvent = (id) => {
    if (!window.confirm('Are you sure you want to delete this Multi-Talent event?')) return;
    setEvents(events.filter(ev => ev.id !== id));
  };

  const exportCSV = () => {
    const headers = ['Event ID', 'Title', 'Category', 'Host College', 'City', 'Start Date', 'Deadline', 'Prize Pool', 'Status'];
    const rows = filteredEvents.map(ev => [
      ev.id,
      `"${ev.title}"`,
      `"${ev.category}"`,
      `"${ev.hostCollege}"`,
      `"${ev.hostCity}"`,
      ev.startDate,
      ev.registrationDeadline,
      ev.prizePool,
      ev.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `college_multi_talent_events_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', background: 'var(--bg-main, #f8fafc)', minHeight: '100vh' }}>
      {/* ── Top Header Banner ── */}
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}>
            <Trophy size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                College Multi-Talent Event Central
              </h1>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                ● Super Admin Portal Active
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.86rem' }}>
              Super Admin central command for Inter-Collegiate competitions, hackathons, cultural fests & multi-talent festivals across partner institutions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={exportCSV}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              color: '#334155',
              padding: '9px 15px',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} /> Export CSV
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              background: '#2563eb',
              border: '1px solid #2563eb',
              borderRadius: '10px',
              color: '#ffffff',
              padding: '9px 18px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Plus size={16} /> Host New Multi-Talent Event
          </button>
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Events</span>
            <Trophy size={20} style={{ color: '#4f46e5' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{events.length}</div>
          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Across technical, cultural & sports</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Host Colleges</span>
            <Building2 size={20} style={{ color: '#0ea5e9' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{totalHostColleges}</div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Multi-Tenant partner campuses</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Contestants</span>
            <Users size={20} style={{ color: '#10b981' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>{totalContestants.toLocaleString()}</div>
          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Active registered students & teams</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Prize Pool</span>
            <Award size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>₹{totalPrizePool.toLocaleString()}</div>
          <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>Sanctioned cash prizes & scholarships</span>
        </div>
      </div>

      {/* ── Category Tabs Strip ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              border: 'none',
              background: activeCategory === cat ? '#2563eb' : 'transparent',
              color: activeCategory === cat ? '#ffffff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.88rem',
              borderRadius: '10px 10px 0 0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
          >
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by event title, host college, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.86rem',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.86rem',
              background: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published / Active</option>
            <option value="Registration Open">Registration Open</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Concluded">Concluded</option>
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
          Showing <strong>{filteredEvents.length}</strong> of <strong>{events.length}</strong> events
        </div>
      </div>

      {/* ── Events Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {filteredEvents.map((ev) => (
          <div
            key={ev.id}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  {ev.category}
                </span>

                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: ev.status === 'Published' || ev.status === 'Registration Open' ? '#ecfdf5' : '#f1f5f9',
                  color: ev.status === 'Published' || ev.status === 'Registration Open' ? '#059669' : '#475569',
                  border: ev.status === 'Published' || ev.status === 'Registration Open' ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                  padding: '3px 10px',
                  borderRadius: '12px'
                }}>
                  ● {ev.status}
                </span>
              </div>

              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                {ev.title}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.84rem', marginBottom: '8px' }}>
                <Building2 size={15} style={{ color: '#6366f1', flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{ev.hostCollege}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem', marginBottom: '14px' }}>
                <MapPin size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                <span>{ev.hostCity || ev.venue}</span>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {ev.description}
              </p>

              {/* Event Meta Badges */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginBottom: '16px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Prize Pool</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#059669' }}>₹{Number(ev.prizePool).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Contestants</div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b' }}>{ev.totalContestants} enrolled</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Event Date</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>{ev.startDate}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Deadline</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#dc2626' }}>{ev.registrationDeadline}</div>
                </div>
              </div>
            </div>

            {/* Card Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '14px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSelectedEvent(ev)}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  color: '#1d4ed8',
                  padding: '7px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Users size={14} />
                <span>Colleges & Teams ({ev.participatingColleges?.length || 0})</span>
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(ev)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#475569',
                    padding: '7px 10px',
                    cursor: 'pointer'
                  }}
                  title="Edit Event"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteEvent(ev.id)}
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    padding: '7px 10px',
                    cursor: 'pointer'
                  }}
                  title="Delete Event"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PARTICIPATING COLLEGES MODAL / DRAWER ── */}
      {selectedEvent && (
        <div className="ref-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="ref-modal-card" style={{ maxWidth: '640px', width: '92%' }} onClick={(e) => e.stopPropagation()}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">
                <Trophy size={20} style={{ color: '#2563eb' }} />
                <span>Participating Colleges: {selectedEvent.title}</span>
              </div>
              <button type="button" className="ref-modal-close" onClick={() => setSelectedEvent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="ref-modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Host Institution</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{selectedEvent.hostCollege}</div>
                <div style={{ fontSize: '0.78rem', color: '#2563eb', marginTop: '2px' }}>{selectedEvent.venue}</div>
              </div>

              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                Multi-Tenant Member Institutions ({selectedEvent.participatingColleges?.length || 0})
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedEvent.participatingColleges || []).map((col, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={18} style={{ color: '#6366f1' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>{col.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Registered Teams: <strong>{col.teamsCount}</strong>
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: col.status === 'Host Institution' ? '#eff6ff' : '#ecfdf5',
                      color: col.status === 'Host Institution' ? '#2563eb' : '#059669',
                      border: '1px solid',
                      borderColor: col.status === 'Host Institution' ? '#bfdbfe' : '#a7f3d0',
                      padding: '3px 10px',
                      borderRadius: '12px'
                    }}>
                      {col.status}
                    </span>
                  </div>
                ))}
              </div>

              <h4 style={{ margin: '18px 0 10px 0', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
                Event Rounds & Progression
              </h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
                {(selectedEvent.rounds || []).map((round, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{round}</li>
                ))}
              </ul>
            </div>

            <div className="ref-modal-footer">
              <button type="button" className="ref-btn-secondary" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT EVENT MODAL ── */}
      {showCreateModal && (
        <div className="ref-modal-overlay">
          <div className="ref-modal-card" style={{ maxWidth: '720px', width: '92%' }}>
            <div className="ref-modal-header">
              <div className="ref-modal-title">
                <Trophy size={20} style={{ color: '#2563eb' }} />
                <span>{editingEventId ? 'Edit Multi-Talent Event' : 'Host New College Multi-Talent Event'}</span>
              </div>
              <button type="button" className="ref-modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="ref-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label className="ref-form-label">Event Title *</label>
                    <input
                      type="text"
                      className="ref-input"
                      placeholder="e.g. National Inter-College Hackathon 2026"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="ref-form-label">Event Category *</label>
                    <select
                      className="ref-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Technical & Hackathons">Technical & Hackathons</option>
                      <option value="Cultural & Performing Arts">Cultural & Performing Arts</option>
                      <option value="Academic & Literary">Academic & Literary</option>
                      <option value="Sports & Athletics">Sports & Athletics</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label className="ref-form-label">Host College / University *</label>
                    <input
                      type="text"
                      className="ref-input"
                      placeholder="e.g. Marudhar Kesari Jain College for Women"
                      value={formData.hostCollege}
                      onChange={(e) => setFormData({ ...formData, hostCollege: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="ref-form-label">Host City & State</label>
                    <input
                      type="text"
                      className="ref-input"
                      placeholder="e.g. Vaniyambadi, Tamil Nadu"
                      value={formData.hostCity}
                      onChange={(e) => setFormData({ ...formData, hostCity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Venue / Auditorium</label>
                  <input
                    type="text"
                    className="ref-input"
                    placeholder="e.g. Main Auditorium & Central Seminar Hall"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label className="ref-form-label">Start Date</label>
                    <input
                      type="date"
                      className="ref-input"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ref-form-label">End Date</label>
                    <input
                      type="date"
                      className="ref-input"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="ref-form-label">Registration Deadline</label>
                    <input
                      type="date"
                      className="ref-input"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label className="ref-form-label">Prize Pool (₹)</label>
                    <input
                      type="number"
                      className="ref-input"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="ref-form-label">Publishing Status</label>
                    <select
                      className="ref-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Published">Published / Live</option>
                      <option value="Registration Open">Registration Open</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Concluded">Concluded</option>
                    </select>
                  </div>
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Event Description & Rules</label>
                  <textarea
                    rows={3}
                    className="ref-textarea"
                    placeholder="Provide overview of events, eligibility rules, judging criteria..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="ref-form-group">
                  <label className="ref-form-label">Event Rounds (One per line)</label>
                  <textarea
                    rows={3}
                    className="ref-textarea"
                    placeholder="Round 1: Preliminary Abstract&#10;Round 2: Semi-Final Demo&#10;Round 3: Grand Finale"
                    value={formData.rounds}
                    onChange={(e) => setFormData({ ...formData, rounds: e.target.value })}
                  />
                </div>
              </div>

              <div className="ref-modal-footer">
                <button type="button" className="ref-btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ref-btn-primary">
                  <Check size={16} /> {editingEventId ? 'Update Event' : 'Publish Multi-Talent Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
