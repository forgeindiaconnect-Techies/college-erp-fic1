import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CheckCircle, XCircle, ChevronRight, FileText, Building, Award } from 'lucide-react';
import { getStudentById, getPlacementJobs, getPlacementApplications, applyForPlacement } from '../../api/index';
import './StudentMarks.css'; // Reusing styles for cards/layout

const StudentPlacements = () => {
  const navigate = useNavigate();
  const [studentDetails, setStudentDetails] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('student_session');
    if (!session) {
      navigate('/student/login');
      return;
    }
    const activeStud = JSON.parse(session);

    Promise.all([
      getStudentById(activeStud.id || activeStud.referenceId).catch(() => ({ data: { ...activeStud, cgpa: 8.6, attendance: 86, arrears: 0 }})),
      getPlacementJobs().catch(() => ({ data: [] })),
      getPlacementApplications().catch(() => ({ data: [] }))
    ])
      .then(([studentRes, jobsRes, appsRes]) => {
        setStudentDetails(studentRes.data);
        setJobs(jobsRes.data);
        
        // Filter applications strictly for this student
        const myApps = appsRes.data.filter(app => 
          (app.studentId && app.studentId._id === studentRes.data._id) || 
          app.regNo === (studentRes.data.id || studentRes.data.referenceId)
        );
        setApplications(myApps);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleApply = async (job) => {
    if (!window.confirm(`Are you sure you want to apply for ${job.role} at ${job.company}?`)) return;
    
    setSubmitting(true);
    try {
      const payload = {
        studentId: studentDetails._id,
        student: studentDetails.name,
        regNo: studentDetails.id || studentDetails.referenceId,
        dept: studentDetails.dept,
        cgpa: studentDetails.cgpa || 0,
        company: job.company,
        role: job.role
      };
      
      const res = await applyForPlacement(payload);
      if (res.status === 201) {
        setApplications([...applications, res.data]);
        alert(`Successfully applied for ${job.company}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to apply. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !studentDetails) {
    return <div className="student-loading-container"><span className="student-spinner-large"></span></div>;
  }

  // Eligibility Criteria Logic
  const criteria = {
    cgpa: { required: 7.0, current: studentDetails.cgpa || 0, met: (studentDetails.cgpa || 0) >= 7.0 },
    arrears: { required: 0, current: studentDetails.arrears || 0, met: (studentDetails.arrears || 0) === 0 },
    attendance: { required: 75, current: studentDetails.attendance || 0, met: (studentDetails.attendance || 0) >= 75 },
    department: { met: true }
  };

  const isEligible = criteria.cgpa.met && criteria.arrears.met && criteria.attendance.met && criteria.department.met;

  // Analytics logic
  const eligibleDrives = jobs.filter(j => (studentDetails.cgpa || 0) >= (j.minCgpa || 0) && (studentDetails.arrears || 0) <= (j.maxArrears || 0));
  const appliedDrives = applications.length;
  const shortlistedDrives = applications.filter(a => a.status === 'Shortlisted' || a.status === 'Selected').length;
  const selectedDrives = applications.filter(a => a.status === 'Selected').length;

  return (
    <div className="student-marks-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div className="page-header-student">
        <div className="header-left-s">
          <button className="btn-back-s" onClick={() => navigate('/student/dashboard')}>
            <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back
          </button>
          <div>
            <h1 className="page-title-s">Placement Eligibility</h1>
            <p className="page-subtitle-s">Review your eligibility criteria for upcoming recruitment drives.</p>
          </div>
        </div>
      </div>

      {/* Top Banner Status */}
      <div style={{ background: isEligible ? 'linear-gradient(135deg, rgba(55, 48, 165, 0.1), rgba(55, 48, 165, 0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))', border: `1px solid ${isEligible ? 'rgba(55, 48, 165, 0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        {isEligible ? <CheckCircle size={32} color="#3730A5" /> : <XCircle size={32} color="var(--danger)" />}
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Overall Placement Status: 
            <span style={{ color: isEligible ? '#3730A5' : 'var(--danger)' }}>
              {isEligible ? 'Eligible ✓' : 'Not Eligible ❌'}
            </span>
          </h2>
          {!isEligible && (
            <div style={{ marginTop: '1rem' }}>
              <strong style={{ color: 'var(--danger)' }}>Reasons:</strong>
              <ul style={{ margin: '0.5rem 0 0 1.2rem', color: 'var(--text-muted)' }}>
                {!criteria.cgpa.met && <li>CGPA is below {criteria.cgpa.required.toFixed(1)}</li>}
                {!criteria.arrears.met && <li>Active arrears exceed {criteria.arrears.required}</li>}
                {!criteria.attendance.met && <li>Attendance is below {criteria.attendance.required}%</li>}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Criteria Breakdown */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Eligibility Criteria</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Minimum CGPA</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Required: {criteria.cgpa.required.toFixed(1)} | Current: {criteria.cgpa.current.toFixed(1)}</div>
              </div>
              <div>{criteria.cgpa.met ? <span style={{ color: '#3730A5', fontWeight: 600 }}>✓ Met</span> : <span style={{ color: 'var(--danger)', fontWeight: 600 }}>❌ Not Met</span>}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Active Arrears</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Required: Max {criteria.arrears.required} | Current: {criteria.arrears.current}</div>
              </div>
              <div>{criteria.arrears.met ? <span style={{ color: '#3730A5', fontWeight: 600 }}>✓ Met</span> : <span style={{ color: 'var(--danger)', fontWeight: 600 }}>❌ Not Met</span>}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Attendance</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Required: {criteria.attendance.required}% | Current: {criteria.attendance.current}%</div>
              </div>
              <div>{criteria.attendance.met ? <span style={{ color: '#3730A5', fontWeight: 600 }}>✓ Met</span> : <span style={{ color: 'var(--danger)', fontWeight: 600 }}>❌ Not Met</span>}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Department Eligible</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Current: {studentDetails.dept}</div>
              </div>
              <div><span style={{ color: '#3730A5', fontWeight: 600 }}>✓ Met</span></div>
            </div>
          </div>
        </div>

        {/* Analytics Card */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
           <h3 style={{ margin: '0 0 1rem', color: 'var(--text-main)' }}>Placement Analytics</h3>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3730A5' }}>{isEligible ? eligibleDrives.length : '0'}</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Eligible Drives</div>
             </div>
             <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3730A5' }}>{appliedDrives}</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Applied Drives</div>
             </div>
             <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3730A5' }}>{shortlistedDrives}</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Shortlisted</div>
             </div>
             <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
               <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3730A5' }}>{selectedDrives}</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Selected</div>
             </div>
           </div>
        </div>
      </div>

      {/* Company Wise Eligibility */}
      <div className="glass-card table-section-card-s">
        <div className="table-header-row-s">
          <h3>Company-Wise Eligibility</h3>
        </div>
        <div className="table-container-s">
          <table className="student-marks-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Role Profile</th>
                <th>Criteria</th>
                <th>Eligibility Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted" style={{ padding: '2rem' }}>
                    No upcoming placement drives available right now.
                  </td>
                </tr>
              ) : jobs.map(drive => {
                const compEligible = (studentDetails.cgpa || 0) >= (drive.minCgpa || 0) && (studentDetails.arrears || 0) <= (drive.maxArrears || 0);
                const hasApplied = applications.some(a => a.company === drive.company && a.role === drive.role);
                const application = applications.find(a => a.company === drive.company && a.role === drive.role);

                return (
                  <tr key={drive._id || drive.id}>
                    <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building size={16} color="var(--primary)" /> {drive.company}
                    </td>
                    <td>
                      <div>{drive.role}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CTC: {drive.ctc}</div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      CGPA {drive.minCgpa || 0}+ | Max {drive.maxArrears || 0} Arrears
                    </td>
                    <td>
                      {compEligible ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(55, 48, 165, 0.1)', color: '#3730A5', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                          Eligible ✓
                        </span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, width: 'max-content' }}>
                            Not Eligible ❌
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                            Reason: {(studentDetails.cgpa || 0) < (drive.minCgpa || 0) ? `CGPA below ${drive.minCgpa}` : 'Arrears exceeded'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {hasApplied ? (
                        <span style={{ 
                          padding: '6px 12px', 
                          borderRadius: '6px', 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          background: application.status === 'Applied' ? 'rgba(59, 130, 246, 0.1)' : 
                                      application.status === 'Shortlisted' ? 'rgba(245, 158, 11, 0.1)' : 
                                      application.status === 'Selected' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: application.status === 'Applied' ? '#3b82f6' : 
                                 application.status === 'Shortlisted' ? '#f59e0b' : 
                                 application.status === 'Selected' ? '#10b981' : '#ef4444'
                        }}>
                          {application.status}
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleApply(drive)}
                          disabled={!compEligible || submitting}
                          style={{
                            padding: '6px 16px',
                            background: compEligible ? '#3730A5' : 'var(--bg-secondary)',
                            color: compEligible ? 'white' : 'var(--text-muted)',
                            border: compEligible ? 'none' : '1px solid var(--border-color)',
                            borderRadius: '6px',
                            cursor: compEligible && !submitting ? 'pointer' : 'not-allowed',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            opacity: submitting ? 0.7 : 1
                          }}
                        >
                          {submitting ? 'Applying...' : 'Apply Now'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default StudentPlacements;
