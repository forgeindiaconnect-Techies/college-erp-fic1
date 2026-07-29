import React, { useState } from 'react';
import { Globe, Shield, Bell, Save, CheckCircle2, Lock, Key, Mail, Smartphone } from 'lucide-react';

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept:'Computer Science', name:'HOD' }; }
  catch { return { dept:'Computer Science', name:'HOD' }; }
};

const TABS = [
  { id:'general',  label:'General',       Icon:Globe   },
  { id:'security', label:'Security',      Icon:Shield  },
  { id:'notif',    label:'Notifications', Icon:Bell    },
];

/* Toggle switch */
const Toggle = ({ checked, onChange }) => (
  <label style={{ position:'relative', width:42, height:22, display:'inline-block', flexShrink:0 }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity:0, width:0, height:0, position:'absolute' }}/>
    <span style={{
      position:'absolute', inset:0, borderRadius:999,
      background: checked ? 'var(--primary,#3b82f6)' : '#cbd5e1',
      cursor:'pointer', transition:'background 0.25s'
    }}>
      <span style={{
        position:'absolute', top:3, left: checked?21:3,
        width:16, height:16, borderRadius:'50%',
        background:'white', boxShadow:'0 1px 4px rgba(0,0,0,.2)',
        transition:'left 0.25s cubic-bezier(.4,0,.2,1)'
      }}/>
    </span>
  </label>
);

const HodSettings = () => {
  const hod = getHodSession();
  const [tab, setTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    displayName: hod.name || 'HOD',
    dept: hod.dept || 'Computer Science',
    minAttendance: 75,
    semesterState: 'Even Semester',
    currentPwd: '',
    newPwd: '',
    confirmPwd: '',
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
    leaveAlerts: true,
    lowAttAlert: true,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]:v }));

  const handleSave = (e) => {
    if(e?.preventDefault) e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-fade-in" style={{ padding:'1.5rem' }}>
      <div className="page-header">
        <div><h1>HOD Settings — {hod.dept}</h1><p className="text-muted">Configure your department portal preferences and account security.</p></div>
        <button className="btn-primary shadow-glow" onClick={handleSave} style={{display:'flex',alignItems:'center',gap:6}}><Save size={16}/> Save Changes</button>
      </div>

      {saved && (
        <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.35)',color:'#10b981',fontWeight:600,fontSize:'0.875rem',padding:'0.7rem 1.2rem',borderRadius:8,marginTop:'1rem',marginBottom:'0.5rem'}}>
          <CheckCircle2 size={16}/> Settings saved successfully!
        </div>
      )}

      {/* Two-col layout */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:'1.5rem', marginTop:'1.5rem', alignItems:'start' }}>
        {/* Nav */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={()=>setTab(id)} style={{
              display:'flex', alignItems:'center', gap:'0.75rem',
              padding:'0.85rem 1rem', borderRadius:10,
              border: `1px solid ${tab===id?'rgba(59,130,246,0.4)':'var(--border-color)'}`,
              background: tab===id ? 'rgba(59,130,246,0.08)' : 'transparent',
              color: tab===id ? 'var(--primary,#3b82f6)' : 'var(--text-muted)',
              fontWeight:600, fontSize:'0.875rem', cursor:'pointer', textAlign:'left',
              transition:'all 0.2s ease'
            }}>
              <Icon size={16}/> {label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="glass-card" style={{ padding:'2rem' }}>
          {tab === 'general' && (
            <div className="animate-fade-in">
              <h3 style={{fontWeight:700,color:'var(--text-main)',borderBottom:'1px solid var(--border-color)',paddingBottom:'0.75rem',marginBottom:'1.5rem'}}>Department Configuration</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
                  <div className="form-group"><label>Display Name</label><input value={form.displayName} onChange={e=>set('displayName',e.target.value)}/></div>
                  <div className="form-group"><label>Department</label><input value={form.dept} readOnly style={{opacity:0.6,cursor:'not-allowed'}}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.25rem' }}>
                  <div className="form-group">
                    <label>Min. Attendance Threshold (%)</label>
                    <input type="number" min={60} max={100} value={form.minAttendance} onChange={e=>set('minAttendance',Number(e.target.value))}/>
                  </div>
                  <div className="form-group">
                    <label>Semester State</label>
                    <select value={form.semesterState} onChange={e=>set('semesterState',e.target.value)}>
                      <option>Even Semester</option>
                      <option>Odd Semester</option>
                      <option>Vacation Period</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="animate-fade-in">
              <h3 style={{fontWeight:700,color:'var(--text-main)',borderBottom:'1px solid var(--border-color)',paddingBottom:'0.75rem',marginBottom:'1.5rem'}}>Change Password</h3>
              <form onSubmit={handleSave} style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
                <div className="form-group"><label><Lock size={12} style={{display:'inline',marginRight:4}}/>Current Password</label><input type="password" placeholder="••••••••" value={form.currentPwd} onChange={e=>set('currentPwd',e.target.value)}/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.25rem'}}>
                  <div className="form-group"><label><Key size={12} style={{display:'inline',marginRight:4}}/>New Password</label><input type="password" placeholder="Min 8 characters" value={form.newPwd} onChange={e=>set('newPwd',e.target.value)}/></div>
                  <div className="form-group"><label>Confirm Password</label><input type="password" placeholder="Re-enter password" value={form.confirmPwd} onChange={e=>set('confirmPwd',e.target.value)}/></div>
                </div>
              </form>
            </div>
          )}

          {tab === 'notif' && (
            <div className="animate-fade-in">
              <h3 style={{fontWeight:700,color:'var(--text-main)',borderBottom:'1px solid var(--border-color)',paddingBottom:'0.75rem',marginBottom:'1.5rem'}}>Notification Preferences</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                {[
                  { key:'emailAlerts',   label:'Email Notifications',          desc:'Receive leave approvals and student alerts by email.', Icon:Mail },
                  { key:'smsAlerts',     label:'SMS Alerts',                   desc:'Get critical notifications via SMS.', Icon:Smartphone },
                  { key:'pushAlerts',    label:'Browser Push Notifications',   desc:'In-dashboard alerts for new leave requests.', Icon:Bell },
                  { key:'leaveAlerts',   label:'New Leave Request Alerts',     desc:'Notify when a student or staff submits a leave.', Icon:Bell },
                  { key:'lowAttAlert',   label:'Low Attendance Student Alert', desc:`Alert when any student drops below ${form.minAttendance}% attendance.`, Icon:Bell },
                ].map(({ key, label, desc, Icon }) => (
                  <div key={key} style={{display:'flex',alignItems:'flex-start',gap:'1rem',padding:'1.1rem 1.25rem',borderRadius:10,border:'1px solid var(--border-color)',background:'rgba(248,250,252,0.4)'}}>
                    <Toggle checked={form[key]} onChange={e=>set(key,e.target.checked)}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:'0.9rem',color:'var(--text-main)',display:'flex',alignItems:'center',gap:6}}><Icon size={14}/>{label}</div>
                      <div style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:'0.2rem'}}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HodSettings;
