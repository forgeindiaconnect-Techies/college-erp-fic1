import React, { useState, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, Users, BookOpen, GraduationCap, Building2, 
  Wallet, AlertTriangle, FileText, Calendar, Filter, BrainCircuit, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import CustomSelect from '../../components/CustomSelect';
import './SystemAnalytics.css';

// Mock Data
const MOCK_ATTENDANCE_ANALYTICS = [
  { name: 'Week 1', rate: 92 },
  { name: 'Week 2', rate: 95 },
  { name: 'Week 3', rate: 88 },
  { name: 'Week 4', rate: 96 }
];

const MOCK_EXAM_PERFORMANCE = [
  { dept: 'CSE', passRate: 94 },
  { dept: 'ECE', passRate: 88 },
  { dept: 'MECH', passRate: 76 },
  { dept: 'EEE', passRate: 82 },
  { dept: 'IT', passRate: 95 }
];

const MOCK_FEES_COLLECTION = [
  { month: 'Jan', collected: 120, pending: 40 },
  { month: 'Feb', collected: 250, pending: 30 },
  { month: 'Mar', collected: 180, pending: 80 },
  { month: 'Apr', collected: 300, pending: 0 },
];

const MOCK_PLACEMENTS = [
  { _id: 'TCS', count: 45 },
  { _id: 'Infosys', count: 32 },
  { _id: 'Wipro', count: 28 },
  { _id: 'Cognizant', count: 24 },
  { _id: 'Accenture', count: 18 }
];

const MOCK_FEES = { totalCollected: 1250000, totalPending: 350000 };

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366F1'];

import { getAnalytics } from '../../api';

const SystemAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [userContext, setUserContext] = useState({ role: 'Guest', dept: null });
  
  // Filters
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [yearFilter, setYearFilter] = useState('2026');

  useEffect(() => {
    // Determine role
    let context = { role: 'Guest', dept: null };
    if (sessionStorage.getItem('admin_session')) context = { role: 'Admin', dept: null };
    else if (sessionStorage.getItem('subadmin_session')) context = { role: 'Sub Admin', dept: null };
    else if (sessionStorage.getItem('hod_session')) {
      try {
        const hData = JSON.parse(sessionStorage.getItem('hod_session'));
        context = { role: 'HOD', dept: hData.deptCode || 'CS' };
      } catch (e) {
        context = { role: 'HOD', dept: 'CSE' };
      }
    }
    // Principal could be handled too
    setUserContext(context);
    
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const { data } = await getAnalytics();
      
      // Provide graceful fallbacks if the database is currently empty
      if (!data.placements || data.placements.length === 0) {
        data.placements = MOCK_PLACEMENTS;
      }
      if (!data.fees || (data.fees.totalCollected === 0 && data.fees.totalPending === 0)) {
        data.fees = MOCK_FEES;
      }
      
      setAnalyticsData(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to fetch analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Crunching institutional data...</p>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg m-4">
        <h3 className="font-bold mb-2">Error Loading Analytics</h3>
        <p>{error || 'No data available. Please check backend connection.'}</p>
        <button onClick={fetchAnalyticsData} className="mt-4 px-4 py-2 bg-primary text-white rounded">Retry</button>
      </div>
    );
  }

  // Adjust mock data slightly based on HOD context
  const isHOD = userContext.role === 'HOD';

  return (
    <div className="system-analytics-page animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="mb-0">System Analytics & AI Insights 🔥</h1>
            <span className="role-tag">Viewing as: {userContext.role} {userContext.dept ? `(${userContext.dept})` : ''}</span>
          </div>
          <p className="text-muted m-0">
            Complete ERP performance, predictive insights, and advanced metrics tracking.
          </p>
        </div>
        <div className="header-actions">
          {userContext.role === 'Admin' && (
            <button className="btn-primary shadow-glow">
              <FileText size={16} /> Auto Report Generation
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="filters-row glass-card mb-4" style={{ borderRadius: '12px', borderBottom: 'none' }}>
        <div className="flex gap-4 flex-wrap">
          <div style={{ width: '280px' }}>
            <CustomSelect 
              value={deptFilter} 
              onChange={v => setDeptFilter(v)} 
              options={[
                { value: 'All Departments', label: 'All Departments' },
                ...[
                  'Computer Science Engineering',
                  'Information Technology',
                  'Electronics & Communication Engineering',
                  'Electrical & Electronics Engineering',
                  'Mechanical Engineering',
                  'Civil Engineering',
                  'Artificial Intelligence & Data Science',
                  'Artificial Intelligence & Machine Learning',
                  'Cyber Security',
                  'Biomedical Engineering',
                  'Aeronautical Engineering',
                  'Automobile Engineering',
                  'Robotics Engineering',
                  'Chemical Engineering',
                  'Biotechnology Engineering'
                ].map(d => ({ value: d, label: d }))
              ]}
              icon={Filter}
            />
          </div>
          <div style={{ width: '200px' }}>
            <CustomSelect 
              value={yearFilter} 
              onChange={v => setYearFilter(v)} 
              options={[
                { value: '2026', label: '2026-2027' },
                { value: '2025', label: '2025-2026' }
              ]}
              icon={Calendar}
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="analytics-kpi-grid">
        {!isHOD && (
          <div className="akpi-card glass-card">
            <Building2 size={20} className="text-blue-500" />
            <div className="akpi-info">
              <span className="akpi-val">8</span>
              <span className="akpi-lbl">Total Departments</span>
            </div>
          </div>
        )}
        <div className="akpi-card glass-card">
          <Users size={20} className="text-green-500" />
          <div className="akpi-info">
            <span className="akpi-val">{isHOD ? '450' : '3,240'}</span>
            <span className="akpi-lbl">Total Students</span>
          </div>
        </div>
        <div className="akpi-card glass-card">
          <GraduationCap size={20} className="text-purple-500" />
          <div className="akpi-info">
            <span className="akpi-val">{isHOD ? '35' : '180'}</span>
            <span className="akpi-lbl">Total Staff</span>
          </div>
        </div>
        <div className="akpi-card glass-card">
          <Activity size={20} className="text-orange-500" />
          <div className="akpi-info">
            <span className="akpi-val">
              {analyticsData.attendance.length > 0 
                ? Math.round((analyticsData.attendance.find(a => a._id === 'Present')?.count || 0) / (analyticsData.attendance.reduce((acc, curr) => acc + curr.count, 0)) * 100) + '%'
                : '0%'}
            </span>
            <span className="akpi-lbl">Overall Attendance</span>
          </div>
        </div>
        <div className="akpi-card glass-card">
          <BookOpen size={20} className="text-pink-500" />
          <div className="akpi-info">
            <span className="akpi-val">88.2%</span>
            <span className="akpi-lbl">Pass Percentage</span>
          </div>
        </div>
        <div className="akpi-card glass-card">
          <TrendingUp size={20} className="text-teal-500" />
          <div className="akpi-info">
            <span className="akpi-val">
              {analyticsData.placements.reduce((acc, curr) => acc + curr.count, 0)}
            </span>
            <span className="akpi-lbl">Total Placements</span>
          </div>
        </div>
      </div>

      {/* AI Insights & Real-time Alerts */}
      <div className="dashboard-grid mt-4">
        {userContext.role === 'Admin' || userContext.role === 'Sub Admin' ? (
          <div className="glass-card ai-insights-card">
            <h3 className="flex items-center gap-2 mb-3"><BrainCircuit size={18} className="text-primary"/> AI Predictive Insights</h3>
            <ul className="insight-list">
              <li>
                <div className="insight-icon bg-warning-light text-warning"><AlertTriangle size={14}/></div>
                <div>
                  <p className="insight-title">Low Attendance Prediction</p>
                  <p className="text-muted text-sm">45 students in Mechanical Engineering are likely to fall below 75% by mid-term based on current trends.</p>
                </div>
              </li>
              <li>
                <div className="insight-icon bg-success-light text-success"><TrendingUp size={14}/></div>
                <div>
                  <p className="insight-title">Predict Student Performance</p>
                  <p className="text-muted text-sm">Computer Science Engineering 3rd Year batch shows a projected average CGPA increase to 8.6 for the upcoming semester.</p>
                </div>
              </li>
              <li>
                <div className="insight-icon bg-primary-light text-primary"><Building2 size={14}/></div>
                <div>
                  <p className="insight-title">Department Ranking</p>
                  <p className="text-muted text-sm">Information Technology Department currently ranks #1 in combined attendance and exam performance.</p>
                </div>
              </li>
            </ul>
          </div>
        ) : (
          <div className="glass-card ai-insights-card">
            <h3 className="flex items-center gap-2 mb-3"><BrainCircuit size={18} className="text-primary"/> Department AI Insights</h3>
            <ul className="insight-list">
              <li>
                <div className="insight-icon bg-warning-light text-warning"><AlertTriangle size={14}/></div>
                <div>
                  <p className="insight-title">Performance Drop Warning</p>
                  <p className="text-muted text-sm">Section B shows a 12% drop in internal marks compared to last semester.</p>
                </div>
              </li>
            </ul>
          </div>
        )}

        <div className="glass-card">
          <h3 className="mb-3">Real-time Widgets</h3>
          <div className="rt-widgets-grid">
            <div className="rt-widget">
              <span className="rt-val">12</span>
              <span className="rt-lbl">Pending Leave Requests</span>
            </div>
            <div className="rt-widget">
              <span className="rt-val">4</span>
              <span className="rt-lbl">Upcoming Exams</span>
            </div>
            <div className="rt-widget">
              <span className="rt-val text-danger">28</span>
              <span className="rt-lbl">Low Attendance Alerts</span>
            </div>
            <div className="rt-widget">
              <span className="rt-val">3</span>
              <span className="rt-lbl">Latest Announcements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Charts Grid */}
      <div className="dashboard-grid mt-4">
        <div className="glass-card chart-card col-span-2">
          <h3>Attendance Analytics Trend</h3>
          <div className="chart-container" style={{ minHeight: '250px', height: '250px' }}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analyticsData.attendanceTrends || MOCK_ATTENDANCE_ANALYTICS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
                <Area type="monotone" name="Students" dataKey="students" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAtt)" />
                <Area type="monotone" name="Staff" dataKey="staff" stroke="#3b82f6" strokeWidth={3} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!isHOD && (
          <div className="glass-card chart-card">
            <h3>Placement Stats (by Company)</h3>
            <div className="chart-container" style={{ minHeight: '250px', height: '250px' }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analyticsData.placements} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={30}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="_id" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: 'var(--border-color)' }} contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {(!isHOD && userContext.role !== 'Sub Admin') && (
          <div className="glass-card chart-card col-span-3">
            <h3>Total Fees Collection Status</h3>
            <div className="chart-container" style={{ minHeight: '250px', height: '250px' }}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Collected', value: analyticsData.fees.totalCollected },
                      { name: 'Pending', value: analyticsData.fees.totalPending }
                    ]}
                    cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAnalytics;
