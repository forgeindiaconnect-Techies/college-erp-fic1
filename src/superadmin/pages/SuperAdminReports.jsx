import React, { useState, useEffect } from 'react';
import { 
  Building2, Crown, Ban, CreditCard, Download, FileText, PieChart as PieChartIcon, 
  BarChart as BarChartIcon, Activity 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  getSuperAdminReportOverview, 
  getSuperAdminReportRevenue, 
  getSuperAdminReportSubscriptions, 
  getSuperAdminReportTrials, 
  exportSuperAdminReport 
} from '../../api';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

const SuperAdminReports = () => {
  const [overview, setOverview] = useState({
    totalColleges: 0, activeSubscriptions: 0, expiredSubscriptions: 0, collegesOnTrial: 0, totalRevenue: 0
  });
  const [revenueData, setRevenueData] = useState([]);
  const [subData, setSubData] = useState([]);
  const [trialData, setTrialData] = useState({ totalTrials: 0, converted: 0, conversionRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [overviewRes, revRes, subRes, trialRes] = await Promise.all([
        getSuperAdminReportOverview(),
        getSuperAdminReportRevenue(),
        getSuperAdminReportSubscriptions(),
        getSuperAdminReportTrials()
      ]);
      setOverview(overviewRes.data);
      setRevenueData(revRes.data);
      setSubData(subRes.data);
      setTrialData(trialRes.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await exportSuperAdminReport(format);
      alert(`Report generated! Downloading ${format.toUpperCase()}...\n\nURL: ${res.data.downloadUrl}`);
    } catch (error) {
      alert('Failed to export report.');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Analytics...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Platform Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Comprehensive analytics, revenue statistics, and subscription reports.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => handleExport('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}>
            <FileText size={18} color="#ef4444" /> Export PDF
          </button>
          <button onClick={() => handleExport('excel')} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>
            <Download size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        {[
          { title: 'Total Colleges', value: overview.totalColleges, icon: Building2, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { title: 'Active Paid Plans', value: overview.activeSubscriptions, icon: Crown, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { title: 'Total Revenue', value: `₹${overview.totalRevenue.toLocaleString()}`, icon: CreditCard, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { title: 'Colleges on Trial', value: overview.collegesOnTrial, icon: Activity, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { title: 'Expired Plans', value: overview.expiredSubscriptions, icon: Ban, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
        ].map((card, idx) => (
          <div key={idx} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <card.icon size={20} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '2px', whiteSpace: 'nowrap' }}>{card.title}</div>
              <div style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Revenue Chart */}
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <BarChartIcon size={20} color="#10b981" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Monthly Revenue Growth</h2>
          </div>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'var(--bg-primary)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <PieChartIcon size={20} color="#8b5cf6" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>Plan Distribution</h2>
          </div>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={subData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {subData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '20px' }}>Summary Metrics Table</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>Report Type</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>Count</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Total Enrolled Colleges', count: overview.totalColleges },
              { label: 'Active Paid Plans', count: overview.activeSubscriptions },
              { label: 'Active Trial Plans', count: overview.collegesOnTrial },
              { label: 'Expired / Cancelled Plans', count: overview.expiredSubscriptions },
              { label: 'Successful Trial Conversions', count: trialData.converted },
            ].map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 500 }}>{row.label}</td>
                <td style={{ padding: '16px 20px', color: 'var(--text-main)', fontWeight: 700, textAlign: 'right' }}>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminReports;
