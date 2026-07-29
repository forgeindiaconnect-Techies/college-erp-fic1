import React, { useState, useEffect } from 'react';
import { Users, Save, Trash2, ShieldCheck, GraduationCap, X } from 'lucide-react';
import { getDepartments, getStaff, getClassAdvisors, assignClassAdvisor, removeClassAdvisor } from '../../api/index';

const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const ClassAdvisorAllocation = () => {
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSem, setSelectedSem] = useState(SEMESTERS[0]);
  const [selectedSec, setSelectedSec] = useState(SECTIONS[0]);
  const [selectedStaff, setSelectedStaff] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, staffRes, advisorRes] = await Promise.all([
        getDepartments(),
        getStaff(),
        getClassAdvisors()
      ]);
      setDepartments(deptRes.data || []);
      setStaffList(staffRes.data || []);
      setAdvisors(advisorRes.data || []);
      
      if (deptRes.data?.length > 0) {
        setSelectedDept(deptRes.data[0].name);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDept || !selectedSem || !selectedSec || !selectedStaff) {
      setError('Please select Department, Semester, Section and Faculty');
      return;
    }
    try {
      setError(null);
      await assignClassAdvisor({
        department: selectedDept,
        semester: selectedSem,
        section: selectedSec,
        staffId: selectedStaff
      });
      fetchData(); // Refresh list
      setSelectedStaff('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to assign class advisor');
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Are you sure you want to remove this class advisor?')) {
      try {
        await removeClassAdvisor(id);
        setAdvisors(advisors.filter(a => a._id !== id));
      } catch (err) {
        console.error(err);
        setError('Failed to remove advisor');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading Class Advisor Data...</p>
      </div>
    );
  }

  // Filter staff based on selected department (optional, but good practice)
  const deptStaff = staffList.filter(s => s.department === selectedDept);

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ 
          width: '48px', height: '48px', borderRadius: '12px', 
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.1) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1'
        }}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Class Advisor Management</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Assign Class Tutors/Advisors to specific classes.</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={18} /></button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* Assignment Form */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <Users size={18} /> Assign Class Advisor
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Department</label>
              <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                {departments.map(d => (
                  <option key={d._id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Semester</label>
                <select 
                  value={selectedSem} 
                  onChange={(e) => setSelectedSem(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  {SEMESTERS.map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Section</label>
                <select 
                  value={selectedSec} 
                  onChange={(e) => setSelectedSec(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  {SECTIONS.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem' }}>Select Faculty</label>
              <select 
                value={selectedStaff} 
                onChange={(e) => setSelectedStaff(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              >
                <option value="">-- Select Faculty --</option>
                {deptStaff.map(staff => (
                  <option key={staff._id} value={staff._id}>{staff.name} ({staff.designation || 'Staff'})</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleAssign}
              style={{ 
                marginTop: '1rem', padding: '0.75rem', background: '#6366f1', color: 'white', 
                border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#4f46e5'}
              onMouseOut={(e) => e.currentTarget.style.background = '#6366f1'}
            >
              <Save size={18} /> Assign Advisor
            </button>
          </div>
        </div>

        {/* Existing Assignments Table */}
        <div className="glass-card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
            <GraduationCap size={18} /> Current Allocations
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Class</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Class Advisor</th>
                  <th style={{ padding: '1rem 0.5rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {advisors.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No Class Advisors assigned yet.
                    </td>
                  </tr>
                ) : (
                  advisors.map(adv => (
                    <tr key={adv._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{adv.department}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {adv.semester} • Section {adv.section}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{adv.staffId?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{adv.staffId?.email || ''}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <button 
                          onClick={() => handleRemove(adv._id)}
                          style={{ 
                            padding: '0.5rem', background: '#fee2e2', color: '#ef4444', 
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.25rem'
                          }}
                          title="Remove Advisor"
                        >
                          <Trash2 size={16} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassAdvisorAllocation;
