import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp, 
  ShieldAlert,
  Activity,
  ArrowRight,
  Globe
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import '../../../src/pages/Dashboard.css';
import CollegeInfoCard from '../../components/common/CollegeInfoCard';
import api from '../../api';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const MOCK_REVENUE = [
  { month: 'Jan', revenue: 120000, trials: 5 },
  { month: 'Feb', revenue: 180000, trials: 8 },
  { month: 'Mar', revenue: 250000, trials: 12 },
  { month: 'Apr', revenue: 320000, trials: 15 },
  { month: 'May', revenue: 410000, trials: 22 },
  { month: 'Jun', revenue: 520000, trials: 30 }
];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);

  const fetchColleges = React.useCallback(async () => {
    try {
      const response = await api.get('/auth/colleges');
      setColleges(response.data);
    } catch (error) {
      console.error('Error fetching colleges:', error);
    }
  }, []);

  useEffect(() => {
    fetchColleges();
  }, [fetchColleges]);

  // Auto-refresh when a new college is registered or toggled
  useRealtimeSync(fetchColleges, ['colleges']);

  return (
    <div className="dashboard animate-fade-in" style={{ padding: '2rem' }}>
      <div className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Platform Overview</h1>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>Monitor all tenant colleges, subscriptions, and global revenue.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => navigate('/superadmin/colleges')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={16} /> Manage Colleges
          </button>
          <button className="btn-primary" onClick={() => navigate('/get-access')} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            + Onboard College
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card glass-card p-6">
          <div className="stat-icon-wrapper bg-gradient-blue" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <Globe size={24} />
          </div>
          <div className="stat-details">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600 }}>TOTAL ACTIVE COLLEGES</h3>
            <p className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>42</p>
            <p className="stat-change positive"><TrendingUp size={14} /> +4 this month</p>
          </div>
        </div>

        <div className="stat-card glass-card p-6">
          <div className="stat-icon-wrapper bg-gradient-green" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <CreditCard size={24} />
          </div>
          <div className="stat-details">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600 }}>MRR (REVENUE)</h3>
            <p className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹5.2L</p>
            <p className="stat-change positive"><TrendingUp size={14} /> +12% growth</p>
          </div>
        </div>

        <div className="stat-card glass-card p-6">
          <div className="stat-icon-wrapper bg-gradient-orange" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-details">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600 }}>ACTIVE TRIALS</h3>
            <p className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>14</p>
            <p className="stat-change text-muted"><Activity size={14} /> Awaiting conversion</p>
          </div>
        </div>

        <div className="stat-card glass-card p-6">
          <div className="stat-icon-wrapper bg-gradient-purple" style={{ width: '48px', height: '48px', borderRadius: '12px' }}>
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3 style={{ fontSize: '0.85rem', fontWeight: 600 }}>TOTAL PLATFORM USERS</h3>
            <p className="stat-value" style={{ fontSize: '1.8rem', fontWeight: 800 }}>124K</p>
            <p className="stat-change positive"><TrendingUp size={14} /> Students & Staff</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="chart-card glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Platform Revenue Growth (MRR)</h3>
          </div>
          <div className="chart-container" style={{ height: '300px', width: '100%', minWidth: '0' }}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MOCK_REVENUE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)', boxShadow: 'var(--shadow-md)' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Plan Distribution</h3>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                <span>Enterprise (15)</span>
                <span>35%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '35%', height: '100%', background: '#6366f1' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                <span>Premium (18)</span>
                <span>43%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '43%', height: '100%', background: '#3b82f6' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                <span>Basic (9)</span>
                <span>22%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: '22%', height: '100%', background: '#10b981' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Colleges Table */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Recently Onboarded Colleges</h3>
          <button style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            View All <ArrowRight size={16} />
          </button>
        </div>
        <div className="table-responsive" style={{ width: '100%', overflowX: 'hidden' }}>
          <table className="erp-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: '50%' }}>College Name</th>
                <th style={{ width: '20%' }}>Subscription Plan</th>
                <th style={{ width: '15%' }}>Status</th>
                <th style={{ width: '15%' }}>Total Users</th>
              </tr>
            </thead>
            <tbody>
              {colleges.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading college data...</td>
                </tr>
              ) : (
                colleges.map(college => (
                  <tr key={college._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {college.name || college.collegeName || 'Unknown College'}
                    </td>
                  <td>
                    <span className="badge-outline" style={{ borderColor: college.subscriptionPlan === 'Elite' ? '#6366f1' : college.subscriptionPlan === 'Premium' ? '#3b82f6' : '#8b5cf6', color: college.subscriptionPlan === 'Elite' ? '#6366f1' : college.subscriptionPlan === 'Premium' ? '#3b82f6' : '#8b5cf6' }}>
                      {college.subscriptionPlan || 'None'}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ 
                      background: college.subscriptionStatus === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                      color: college.subscriptionStatus === 'Active' ? '#10b981' : '#f59e0b',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}>
                      {college.subscriptionStatus || 'Pending'}
                    </span>
                  </td>
                  <td>{college.totalUsers ? college.totalUsers.toLocaleString() : 0}</td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
