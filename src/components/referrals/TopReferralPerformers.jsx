import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy, Award, Medal, CheckCircle2, RefreshCw, Search,
  Users, DollarSign, ArrowUpRight, ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { getTopReferralPerformers } from '../../api';
import './TopReferralPerformers.css';

/**
 * Returns initials from a full name (e.g., "Sundar" -> "SU", "Renuka S" -> "RS")
 */
function getInitials(name) {
  if (!name) return 'RP';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Formats numbers into Indian Rupee currency format (₹1,500)
 */
function formatRupee(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

export default function TopReferralPerformers({ collegeId = null, title = "Top Referral Performers", subtitle }) {
  const [performers, setPerformers] = useState([]);
  const [stats, setStats] = useState({ totalPerformers: 0, totalVerifiedReferrals: 0, totalEarnedIncentives: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const fetchPerformers = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = {};
      if (collegeId) params.collegeId = collegeId;

      const res = await getTopReferralPerformers(params);
      if (res && res.data && res.data.success) {
        setPerformers(Array.isArray(res.data.data) ? res.data.data : []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      } else {
        setPerformers([]);
      }
    } catch (err) {
      console.warn('Top referral performers fetch error:', err.message);
      setError('Unable to load leaderboard data at this moment.');
      setPerformers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchPerformers();
  }, [fetchPerformers]);

  // Filter performers by search text & optional category
  const filteredPerformers = useMemo(() => {
    return performers.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.department && p.department.toLowerCase().includes(q)) ||
        (p.role && p.role.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'ALL' ||
        (p.categories && (Array.isArray(p.categories) ? p.categories.includes(selectedCategory) : p.categories[selectedCategory]));

      return matchesSearch && matchesCategory;
    });
  }, [performers, searchQuery, selectedCategory]);

  const topThree = useMemo(() => {
    return filteredPerformers.slice(0, 3);
  }, [filteredPerformers]);

  return (
    <div className="trp-leaderboard-container">
      {/* ── Header ── */}
      <div className="trp-header">
        <div className="trp-title-area">
          <div className="trp-trophy-icon">
            <Trophy size={26} />
          </div>
          <div className="trp-title-text">
            <h2>
              <span>{title}</span>
              <span className="trp-verified-badge">
                <ShieldCheck size={13} />
                <span>Verified Milestones</span>
              </span>
            </h2>
            <p>
              {subtitle || "Celebrating top college faculty, staff, and drivers driving successful referrals and earned incentive rewards."}
            </p>
          </div>
        </div>

        <div className="trp-controls">
          <div className="trp-search-box">
            <Search size={14} className="trp-search-icon" />
            <input
              type="text"
              placeholder="Search performer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="trp-sync-btn"
            onClick={() => fetchPerformers(true)}
            disabled={refreshing || loading}
            title="Refresh leaderboard rankings"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ── Summary Metrics Strip ── */}
      <div className="trp-metrics-strip">
        <div className="trp-metric-card">
          <div className="trp-metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
            <Users size={18} />
          </div>
          <div className="trp-metric-data">
            <span className="trp-metric-label">Active Referrers</span>
            <span className="trp-metric-val">{stats.totalPerformers || performers.length}</span>
          </div>
        </div>

        <div className="trp-metric-card">
          <div className="trp-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669' }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="trp-metric-data">
            <span className="trp-metric-label">Verified Referrals</span>
            <span className="trp-metric-val">{stats.totalVerifiedReferrals || stats.totalSuccessfulReferrals || 0}</span>
          </div>
        </div>

        <div className="trp-metric-card">
          <div className="trp-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
            <DollarSign size={18} />
          </div>
          <div className="trp-metric-data">
            <span className="trp-metric-label">Total Earned Rewards</span>
            <span className="trp-metric-val">{formatRupee(stats.totalEarnedIncentives || stats.totalIncentivesEarned || 0)}</span>
          </div>
        </div>
      </div>

      {/* ── Loading / Error / Empty States ── */}
      {loading ? (
        <div className="trp-empty-state">
          <RefreshCw size={28} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 12px' }} />
          <h4>Loading Leaderboard...</h4>
          <p>Compiling verified referral milestones and incentive earnings.</p>
        </div>
      ) : error ? (
        <div className="trp-empty-state">
          <AlertCircle size={28} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
          <h4>Unable to Load Rankings</h4>
          <p>{error}</p>
        </div>
      ) : filteredPerformers.length === 0 ? (
        <div className="trp-empty-state">
          <Trophy size={32} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h4>No Qualifying Referrals Found</h4>
          <p>
            {searchQuery
              ? `No performers matching "${searchQuery}".`
              : "No verified successful referrals recorded yet. Approved referrals will appear here automatically."}
          </p>
        </div>
      ) : (
        <>
          {/* ── Top 3 Podium Cards ── */}
          {topThree.length > 0 && !searchQuery && (
            <div className="trp-podium-grid">
              {topThree.map((performer, idx) => {
                const rankNum = idx + 1;
                const medalIcon = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : '🥉';
                const rankTitle = rankNum === 1 ? '1st Place' : rankNum === 2 ? '2nd Place' : '3rd Place';

                return (
                  <div key={performer.userId || idx} className={`trp-podium-card rank-${rankNum}`}>
                    <div>
                      <div className="trp-podium-header">
                        <span className="trp-rank-badge">
                          <span>{medalIcon}</span>
                          <span>{rankTitle}</span>
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          #{performer.rank || rankNum} Ranked
                        </span>
                      </div>

                      <div className="trp-user-info-area">
                        <div className="trp-avatar">
                          {performer.avatar ? (
                            <img src={performer.avatar} alt={performer.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            getInitials(performer.name)
                          )}
                        </div>
                        <div className="trp-user-names">
                          <h4>{performer.name}</h4>
                          <div className="trp-user-tags">
                            <span className="trp-role-tag">{performer.role || 'Staff'}</span>
                            <span className="trp-dept-tag">• {performer.department || 'Campus'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="trp-podium-stats">
                      <div className="trp-stat-col">
                        <span className="stat-lbl">Successful</span>
                        <span className="stat-num">{performer.successfulReferrals}</span>
                      </div>
                      <div className="trp-stat-col incentive">
                        <span className="stat-lbl">Earned Incentive</span>
                        <span className="stat-num">{formatRupee(performer.earnedIncentive)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Full Desktop Rankings Table ── */}
          <div className="trp-table-wrapper">
            <table className="trp-table">
              <thead>
                <tr>
                  <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                  <th>Performer / Member</th>
                  <th>Department & Role</th>
                  <th style={{ textAlign: 'center' }}>Verified Referrals</th>
                  <th>Total Incentive Earned</th>
                  <th>Payment Status</th>
                  <th>Streams</th>
                </tr>
              </thead>
              <tbody>
                {filteredPerformers.map((p, index) => {
                  const rank = p.rank || index + 1;
                  const rankClass = rank === 1 ? 'top-1' : rank === 2 ? 'top-2' : rank === 3 ? 'top-3' : '';
                  const rankDisplay = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : rank;
                  const categoriesList = Array.isArray(p.categories)
                    ? p.categories
                    : (typeof p.categories === 'object' && p.categories !== null)
                      ? Object.keys(p.categories)
                      : [];

                  return (
                    <tr key={p.userId || index}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`trp-rank-cell ${rankClass}`}>{rankDisplay}</span>
                      </td>

                      <td>
                        <div className="trp-member-cell">
                          <div className="trp-table-avatar">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              getInitials(p.name)
                            )}
                          </div>
                          <div>
                            <div className="trp-member-name">{p.name}</div>
                            <div className="trp-member-meta">
                              <span>{p.email || (p.employeeId ? `ID: ${p.employeeId}` : 'Verified Referrer')}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>{p.department || 'General'}</span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{p.role || 'Member'}</span>
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="trp-success-badge">
                          <CheckCircle2 size={12} />
                          <span>{p.successfulReferrals} verified</span>
                        </span>
                      </td>

                      <td>
                        <span className="trp-incentive-amount">{formatRupee(p.earnedIncentive)}</span>
                      </td>

                      <td>
                        <div className="trp-status-pills">
                          {p.paidIncentive > 0 && (
                            <span className="trp-pill-paid">Paid: {formatRupee(p.paidIncentive)}</span>
                          )}
                          {p.pendingIncentive > 0 && (
                            <span className="trp-pill-pending">Pending: {formatRupee(p.pendingIncentive)}</span>
                          )}
                          {!p.paidIncentive && !p.pendingIncentive && (
                            <span className="trp-pill-pending">Processing</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {categoriesList.length > 0 ? (
                            categoriesList.slice(0, 2).map((cat, cIdx) => (
                              <span
                                key={cIdx}
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {cat}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Verified</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
