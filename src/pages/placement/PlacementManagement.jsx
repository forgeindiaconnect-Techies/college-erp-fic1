import React, { useState } from 'react';
import {
  Briefcase, Building, Target, FileText, Calendar, 
  Users, Award, Search, Plus, MapPin, DollarSign,
  CheckCircle, XCircle, Clock, Download
} from 'lucide-react';
import { 
  getPlacementCompanies, getPlacementJobs, getPlacementApplications, 
  getPlacementInterviews, getPlacementSelections,
  createPlacementCompany, createPlacementJob, getEligibleStudentsForJob,
  updatePlacementApplicationStatus, createPlacementInterview, createPlacementSelection
} from '../../api/index';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import './PlacementManagement.css';

const CHART_DATA = [
  { month: 'Jul', placed: 20 }, { month: 'Aug', placed: 50 },
  { month: 'Sep', placed: 120 }, { month: 'Oct', placed: 250 },
  { month: 'Nov', placed: 310 }, { month: 'Dec', placed: 450 },
];

const PlacementManagement = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({ name: '', sector: '', location: '', website: '', hrName: '', hrEmail: '', hrContact: '' });

  const [showJobModal, setShowJobModal] = useState(false);
  const [jobForm, setJobForm] = useState({ company: '', role: '', ctc: '', eligibility: '', minCgpa: 0, maxArrears: 0, eligibleDepartments: [], driveDate: '', deadline: '' });

  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ company: '', role: '', round: '', date: '', time: '', mode: 'Online', venue: '', panel: '', candidates: 0 });

  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionForm, setSelectionForm] = useState({ student: '', regNo: '', company: '', role: '', ctc: '', date: '' });
  
  const [reportPreview, setReportPreview] = useState(null); // { title: string, headers: string[], rows: any[][] }

  // Eligibility tracker state
  const [selectedEligibleJob, setSelectedEligibleJob] = useState('');
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [notEligibleStudents, setNotEligibleStudents] = useState([]);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  React.useEffect(() => {
    fetchPlacementData();
  }, []);

  React.useEffect(() => {
    if (selectedEligibleJob) {
      const fetchEligible = async () => {
        setEligibilityLoading(true);
        try {
          const res = await getEligibleStudentsForJob(selectedEligibleJob);
          setEligibleStudents(res.data.eligible || []);
          setNotEligibleStudents(res.data.notEligible || []);
        } catch (error) {
          console.error('Failed to load eligible students', error);
          setEligibleStudents([]);
          setNotEligibleStudents([]);
        } finally {
          setEligibilityLoading(false);
        }
      };
      fetchEligible();
    } else {
      setEligibleStudents([]);
      setNotEligibleStudents([]);
    }
  }, [selectedEligibleJob]);

  const fetchPlacementData = async () => {
    try {
      setLoading(true);
      const [compRes, jobsRes, appsRes, intRes, selRes] = await Promise.all([
        getPlacementCompanies(),
        getPlacementJobs(),
        getPlacementApplications(),
        getPlacementInterviews(),
        getPlacementSelections()
      ]);
      setCompanies(compRes.data);
      setJobs(jobsRes.data);
      setApplications(appsRes.data);
      setInterviews(intRes.data);
      setSelections(selRes.data);
    } catch (error) {
      console.error('Failed to load placement data', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-select first job for Eligibility Tracker
  React.useEffect(() => {
    if (jobs.length > 0 && !selectedEligibleJob) {
      setSelectedEligibleJob(jobs[0]._id || jobs[0].jobId);
    }
  }, [jobs, selectedEligibleJob]);

  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      await createPlacementCompany(companyForm);
      setShowCompanyModal(false);
      setCompanyForm({ name: '', sector: '', location: '', website: '', hrName: '', hrEmail: '', hrContact: '' });
      fetchPlacementData();
    } catch (error) {
      console.error('Failed to add company', error);
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    try {
      await createPlacementJob(jobForm);
      setShowJobModal(false);
      setJobForm({ company: '', role: '', ctc: '', eligibility: '', minCgpa: 0, maxArrears: 0, eligibleDepartments: [], driveDate: '', deadline: '' });
      fetchPlacementData();
    } catch (error) {
      console.error('Failed to add job', error);
    }
  };

  const handleUpdateAppStatus = async (id, nextStatus) => {
    try {
      await updatePlacementApplicationStatus(id, nextStatus);
      fetchPlacementData();
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    }
  };

  const handleAddInterview = async (e) => {
    e.preventDefault();
    try {
      await createPlacementInterview(interviewForm);
      setShowInterviewModal(false);
      setInterviewForm({ company: '', role: '', round: '', date: '', time: '', mode: 'Online', venue: '', panel: '', candidates: 0 });
      fetchPlacementData();
    } catch (error) {
      console.error('Failed to schedule interview', error);
    }
  };

  const handleAddSelection = async (e) => {
    e.preventDefault();
    try {
      await createPlacementSelection(selectionForm);
      setShowSelectionModal(false);
      setSelectionForm({ student: '', regNo: '', company: '', role: '', ctc: '', date: '' });
      fetchPlacementData();
    } catch (error) {
      console.error('Failed to add selected student', error);
    }
  };

  const packageStats = React.useMemo(() => {
    let max = 0;
    let sum = 0;
    let count = 0;
    selections.forEach(sel => {
      const match = sel.ctc.match(/(\d+(\.\d+)?)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > max) max = val;
        sum += val;
        count++;
      }
    });
    return {
      highest: max > 0 ? `${max} LPA` : 'N/A',
      average: count > 0 ? `${(sum/count).toFixed(2)} LPA` : 'N/A'
    };
  }, [selections]);

  const viewNIRFReport = () => {
    const headers = ["Registration Number", "Student Name", "Placed Company", "Role", "Package (CTC)"];
    const rows = selections.map(sel => [sel.regNo, sel.student, sel.company, sel.role, sel.ctc]);
    setReportPreview({ title: "NIRF Placement Report", headers, rows });
  };

  const viewDepartmentSummary = () => {
    const headers = ["Company Name", "Sector", "Location", "Active Drives"];
    const rows = companies.map(comp => [comp.name, comp.sector, comp.location, comp.drives || 1]);
    setReportPreview({ title: "Department Placement Summary", headers, rows });
  };

  const TABS = [
    { name: 'Dashboard', icon: <Target size={16} /> },
    { name: 'Companies', icon: <Building size={16} /> },
    { name: 'Job Openings', icon: <Briefcase size={16} /> },
    { name: 'Eligibility Tracker', icon: <CheckCircle size={16} /> },
    { name: 'Applications', icon: <FileText size={16} /> },
    { name: 'Interviews', icon: <Calendar size={16} /> },
    { name: 'Selected Students', icon: <Award size={16} /> },
    { name: 'Reports', icon: <Download size={16} /> }
  ];

  return (
    <div className="placement-page animate-fade-in">
      <div className="placement-header">
        <h1><Briefcase size={32} className="text-blue-500" /> Advanced Placement Management</h1>
        <p className="text-muted mt-2">Manage campus recruitment drives, company profiles, student applications, and interview schedules.</p>
      </div>

      <div className="placement-tabs">
        {TABS.map(tab => (
          <button
            key={tab.name}
            className={`placement-tab ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div className="animate-fade-in">
          <div className="placement-grid grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="glass-card p-3 relative overflow-hidden">
              <Building size={18} className="text-blue-500 mb-1"/>
              <h3 className="text-xs text-muted uppercase font-bold">Total Companies</h3>
              <p className="text-lg font-bold mt-1">{companies.length}</p>
            </div>
            <div className="glass-card p-3 relative overflow-hidden">
              <Briefcase size={18} className="text-purple-500 mb-1"/>
              <h3 className="text-xs text-muted uppercase font-bold">Active Drives</h3>
              <p className="text-lg font-bold mt-1">{jobs.length}</p>
            </div>
            <div className="glass-card p-3 relative overflow-hidden">
              <Users size={18} className="text-yellow-500 mb-1"/>
              <h3 className="text-xs text-muted uppercase font-bold">Applications</h3>
              <p className="text-lg font-bold mt-1">{applications.length}</p>
            </div>
            <div className="glass-card p-3 relative overflow-hidden">
              <Award size={18} className="text-success mb-1"/>
              <h3 className="text-xs text-muted uppercase font-bold">Students Placed</h3>
              <p className="text-lg font-bold text-success mt-1">{selections.length}</p>
            </div>
            <div className="glass-card p-3 relative overflow-hidden">
              <DollarSign size={18} className="text-blue-400 mb-1"/>
              <h3 className="text-xs text-muted uppercase font-bold">Highest Package</h3>
              <p className="text-lg font-bold mt-1">{packageStats.highest}</p>
            </div>
            <div className="glass-card p-3 relative overflow-hidden">
              <DollarSign size={18} className="text-green-400 mb-1"/>
              <h3 className="text-xs text-muted uppercase font-bold">Avg Package</h3>
              <p className="text-lg font-bold mt-1">{packageStats.average}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4">Placement Trends (YTD)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={CHART_DATA}>
                    <defs>
                      <linearGradient id="colorPlaced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success-color)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--success-color)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="placed" stroke="var(--success-color)" fillOpacity={1} fill="url(#colorPlaced)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="glass-card p-6">
              <h3 className="font-bold mb-4">Department-wise Placement %</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { dept: 'CSE', percentage: 88 },
                    { dept: 'IT', percentage: 82 },
                    { dept: 'ECE', percentage: 75 },
                    { dept: 'EEE', percentage: 65 },
                    { dept: 'MECH', percentage: 55 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="dept" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                    <Bar dataKey="percentage" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Upcoming Interviews</h2>
                <button className="text-xs text-primary font-bold">View Calendar</button>
              </div>
              <div className="space-y-4">
                {interviews.map(interview => (
                  <div key={interview.interviewId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center border-l-4 border-blue-500">
                    <div>
                      <p className="font-bold">{interview.company} - {interview.role}</p>
                      <p className="text-xs text-muted mt-1 flex items-center gap-2">
                        <Calendar size={12}/> {new Date(interview.date).toLocaleDateString()} &nbsp; <Clock size={12}/> {interview.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{interview.round}</span>
                      <p className="text-xs text-muted mt-1">{interview.candidates} Candidates</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Companies' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Partner Companies</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowCompanyModal(true)}><Plus size={16}/> Add Company</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map(company => (
              <div key={company.companyId} className="glass-card company-card">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    {company.logo ? (
                      <img src={company.logo} alt={company.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">{company.name.charAt(0)}</div>
                    )}
                    <h3 className="font-bold text-lg">{company.name}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">{company.status}</span>
                </div>
                <p className="text-sm text-muted mb-4">{company.sector}</p>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted"><MapPin size={14}/> {company.location}</div>
                  {company.website && (
                    <div className="flex items-center gap-2 text-muted"><Search size={14}/> <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Website</a></div>
                  )}
                  {company.hrName && (
                    <div className="flex items-center gap-2 text-muted"><Users size={14}/> HR: {company.hrName} {company.hrContact ? `(${company.hrContact})` : ''}</div>
                  )}
                  <div className="flex items-center gap-2 text-muted"><Briefcase size={14}/> {company.drives} Active Drives</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Job Openings' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Active Campus Drives</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowJobModal(true)}><Plus size={16}/> Post Job</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {jobs.map(job => (
              <div key={job.jobId} className="glass-card job-card relative" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {job.applicants || 0} Applied
                </div>
                <h3 className="font-bold text-xl mb-1" style={{ maxWidth: '70%' }}>{job.role}</h3>
                <p className="font-bold mb-4" style={{ color: '#3b82f6' }}>{job.company}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted block text-xs">CTC Offered</span>
                    <span className="font-bold flex items-center gap-1"><DollarSign size={14}/> {job.ctc}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-xs">Eligibility</span>
                    <span className="font-bold flex items-center gap-1"><CheckCircle size={14}/> {job.eligibility}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-xs">Drive Date</span>
                    <span className="font-bold flex items-center gap-1"><Calendar size={14}/> {job.driveDate ? new Date(job.driveDate).toLocaleDateString() : 'TBA'}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-xs">Max Arrears</span>
                    <span className="font-bold flex items-center gap-1"><XCircle size={14}/> {job.maxArrears} allowed</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                  <span className="text-xs text-danger font-bold flex items-center gap-1"><Clock size={14}/> Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
                  <button className="btn-secondary text-xs py-1">View Applicants</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Applications' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Student Applications</h2>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search student or company..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Student Name</th>
                  <th>Department</th>
                  <th>CGPA</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app._id}>
                    <td className="font-mono text-sm">{app.regNo}</td>
                    <td className="font-medium">{app.studentId?.name || app.student}</td>
                    <td>{app.studentId?.dept || app.dept || '-'}</td>
                    <td className="font-bold">{app.studentId?.cgpa || app.cgpa || '-'}</td>
                    <td className="font-bold text-primary">{app.company}</td>
                    <td>{app.role}</td>
                    <td>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        app.status === 'Shortlisted' ? 'bg-green-100 text-green-700' : 
                        app.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                        app.status === 'Selected' ? 'bg-indigo-100 text-indigo-700' : 
                        app.status === 'Waitlisted' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={app.status} 
                        onChange={(e) => handleUpdateAppStatus(app._id, e.target.value)}
                        className="text-xs font-bold px-2 py-1 rounded cursor-pointer outline-none border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        <option value="Applied">Applied</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Selected">Selected</option>
                        <option value="Waitlisted">Waitlisted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Selected Students' && (
        <div className="animate-fade-in glass-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-green-50 dark:bg-green-900/10">
            <h2 className="font-bold text-success flex items-center gap-2"><Award size={20}/> Hall of Fame</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowSelectionModal(true)}><Plus size={16}/> Add Placement</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Student Name</th>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Package (CTC)</th>
                  <th>Offer Date</th>
                </tr>
              </thead>
              <tbody>
                {selections.map(sel => (
                  <tr key={sel.selectionId}>
                    <td className="font-mono text-sm">{sel.regNo}</td>
                    <td className="font-medium">{sel.student}</td>
                    <td className="font-bold text-primary">{sel.company}</td>
                    <td>{sel.role}</td>
                    <td className="font-bold text-success">{sel.ctc}</td>
                    <td>{new Date(sel.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Eligibility Tracker' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Student Eligibility</h2>
            <div className="flex gap-4">
              <select 
                value={selectedEligibleJob} 
                onChange={(e) => setSelectedEligibleJob(e.target.value)}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded px-3 py-1 outline-none text-sm"
              >
                <option value="">Select a Campus Drive...</option>
                {jobs.map(job => (
                  <option key={job._id || job.jobId} value={job._id || job.jobId}>{job.company} - {job.role}</option>
                ))}
              </select>
              <div className="search-box">
                <Search size={16} className="text-muted"/>
                <input type="text" placeholder="Search by Reg No..." />
              </div>
            </div>
          </div>
          <div className="table-container">
            {eligibilityLoading ? (
              <div className="p-8 text-center text-muted">Checking eligibility matrix...</div>
            ) : !selectedEligibleJob ? (
              <div className="p-8 text-center text-muted">Please select a campus drive to view eligible students.</div>
            ) : (eligibleStudents.length === 0 && notEligibleStudents.length === 0) ? (
              <div className="p-8 text-center text-muted">No students found.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Reg No</th>
                    <th>Student Name</th>
                    <th>Department</th>
                    <th>CGPA</th>
                    <th>Arrears</th>
                    <th>Status</th>
                    <th>Action/Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {eligibleStudents.map((student, idx) => (
                    <tr key={`el-${idx}`}>
                      <td className="font-mono text-sm">{student.id}</td>
                      <td className="font-medium">{student.name}</td>
                      <td>{student.dept}</td>
                      <td className="font-bold">{student.cgpa}</td>
                      <td>{student.arrears}</td>
                      <td><span style={{ backgroundColor: '#d1fae5', color: '#047857', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Eligible</span></td>
                      <td>
                        <button className="btn-secondary text-xs py-1 px-3" onClick={() => alert(`Eligibility notification sent to ${student.name}.`)}>Notify Student</button>
                      </td>
                    </tr>
                  ))}
                  {notEligibleStudents.map((student, idx) => (
                    <tr key={`nel-${idx}`} className="opacity-75 bg-gray-50 dark:bg-gray-800/50">
                      <td className="font-mono text-sm">{student.id}</td>
                      <td className="font-medium">{student.name}</td>
                      <td>{student.dept}</td>
                      <td className="font-bold">{student.cgpa}</td>
                      <td>{student.arrears}</td>
                      <td><span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✗ Not Eligible</span></td>
                      <td className="text-xs text-danger font-medium">{student.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Interviews' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Interview Schedules</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowInterviewModal(true)}><Plus size={16}/> Schedule Interview</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Round</th>
                  <th>Date & Time</th>
                  <th>Mode & Venue</th>
                  <th>Panel Details</th>
                  <th>Candidates</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {interviews.map(interview => (
                  <tr key={interview._id || interview.interviewId}>
                    <td className="font-bold text-primary">{interview.company}</td>
                    <td>{interview.role}</td>
                    <td><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{interview.round}</span></td>
                    <td>
                      <div className="flex flex-col text-sm">
                        <span className="font-bold flex items-center gap-1"><Calendar size={14}/> {new Date(interview.date).toLocaleDateString()}</span>
                        <span className="text-muted flex items-center gap-1"><Clock size={14}/> {interview.time}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col text-sm">
                        <span className={`font-bold ${interview.mode === 'Online' ? 'text-blue-500' : 'text-orange-500'}`}>{interview.mode}</span>
                        <span className="text-muted">{interview.venue || '-'}</span>
                      </div>
                    </td>
                    <td className="text-sm text-muted">{interview.panel || '-'}</td>
                    <td>{interview.candidates}</td>
                    <td>
                      <button className="btn-secondary text-xs py-1 px-3" onClick={() => alert('Interview list has been generated and sent to department coordinators.')}>View List</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Reports' && (
        <div className="animate-fade-in glass-card p-12 flex flex-col items-center text-center">
          <Download size={48} className="text-muted opacity-50 mb-4"/>
          <h2 className="text-xl font-bold mb-2">Placement Data Export</h2>
          <p className="text-muted max-w-md mb-6">Export NIRF placement data, company-wise selections, and department-wise statistics.</p>
          <div className="flex gap-4">
            <button className="btn-primary flex items-center gap-2" onClick={viewNIRFReport}><FileText size={16}/> NIRF Report</button>
            <button className="btn-secondary flex items-center gap-2" onClick={viewDepartmentSummary}><FileText size={16}/> Department Summary</button>
          </div>
        </div>
      )}

      {/* Add Company Modal */}
      {showCompanyModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>Add Partner Company</h2>
              <button className="close-btn" onClick={() => setShowCompanyModal(false)}><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleAddCompany} className="modal-form">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group col-span-2">
                  <label>Company Name</label>
                  <input type="text" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Industry Type</label>
                  <input type="text" value={companyForm.sector} onChange={e => setCompanyForm({...companyForm, sector: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Location (HQ)</label>
                  <input type="text" value={companyForm.location} onChange={e => setCompanyForm({...companyForm, location: e.target.value})} required />
                </div>
                <div className="form-group col-span-2">
                  <label>Website</label>
                  <input type="url" value={companyForm.website} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>HR Name</label>
                  <input type="text" value={companyForm.hrName} onChange={e => setCompanyForm({...companyForm, hrName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>HR Email</label>
                  <input type="email" value={companyForm.hrEmail} onChange={e => setCompanyForm({...companyForm, hrEmail: e.target.value})} />
                </div>
                <div className="form-group col-span-2">
                  <label>HR Contact (Phone)</label>
                  <input type="text" value={companyForm.hrContact} onChange={e => setCompanyForm({...companyForm, hrContact: e.target.value})} />
                </div>
              </div>
              <div className="modal-actions mt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowCompanyModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Job Modal */}
      {showJobModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h2>Post Campus Drive</h2>
              <button className="close-btn" onClick={() => setShowJobModal(false)}><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleAddJob} className="modal-form">
              <div className="form-group">
                <label>Company Name</label>
                <select value={jobForm.company} onChange={e => setJobForm({...jobForm, company: e.target.value})} required>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.companyId} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Job Role</label>
                  <input type="text" value={jobForm.role} onChange={e => setJobForm({...jobForm, role: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Package (CTC in LPA)</label>
                  <input type="text" value={jobForm.ctc} onChange={e => setJobForm({...jobForm, ctc: e.target.value})} required placeholder="e.g. 4.5 LPA" />
                </div>
              </div>
              <div className="form-group">
                <label>Eligibility Criteria Description (Visible to Students)</label>
                <input type="text" value={jobForm.eligibility} onChange={e => setJobForm({...jobForm, eligibility: e.target.value})} required placeholder="e.g. CGPA: 7.0+, Dept: CSE, IT" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Minimum CGPA Required</label>
                  <input type="number" step="0.1" value={jobForm.minCgpa} onChange={e => setJobForm({...jobForm, minCgpa: Number(e.target.value)})} required />
                </div>
                <div className="form-group">
                  <label>Maximum Arrears Allowed</label>
                  <input type="number" value={jobForm.maxArrears} onChange={e => setJobForm({...jobForm, maxArrears: Number(e.target.value)})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Eligible Departments (Comma separated codes like CSE, IT, ECE)</label>
                <input type="text" value={jobForm.eligibleDepartments.join(', ')} onChange={e => setJobForm({...jobForm, eligibleDepartments: e.target.value.split(',').map(d=>d.trim())})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Drive Date</label>
                  <input type="date" value={jobForm.driveDate} onChange={e => setJobForm({...jobForm, driveDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Last Date to Apply</label>
                  <input type="date" value={jobForm.deadline} onChange={e => setJobForm({...jobForm, deadline: e.target.value})} required />
                </div>
              </div>
              <div className="modal-actions mt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowJobModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Drive</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>Schedule Interview</h2>
              <button className="close-btn" onClick={() => setShowInterviewModal(false)}><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleAddInterview} className="modal-form">
              <div className="form-group">
                <label>Company</label>
                <select value={interviewForm.company} onChange={e => setInterviewForm({...interviewForm, company: e.target.value})} required>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.companyId} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={interviewForm.role} onChange={e => setInterviewForm({...interviewForm, role: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Interview Round (e.g. Technical Round 1)</label>
                <input type="text" value={interviewForm.round} onChange={e => setInterviewForm({...interviewForm, round: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" value={interviewForm.date} onChange={e => setInterviewForm({...interviewForm, date: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Time</label>
                  <input type="time" value={interviewForm.time} onChange={e => setInterviewForm({...interviewForm, time: e.target.value})} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Mode</label>
                  <select value={interviewForm.mode} onChange={e => setInterviewForm({...interviewForm, mode: e.target.value})}>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Venue / Link</label>
                  <input type="text" value={interviewForm.venue} onChange={e => setInterviewForm({...interviewForm, venue: e.target.value})} required placeholder="e.g. Main Auditorium / Zoom Link" />
                </div>
              </div>
              <div className="form-group">
                <label>Panel Details (Names / Roles)</label>
                <input type="text" value={interviewForm.panel} onChange={e => setInterviewForm({...interviewForm, panel: e.target.value})} placeholder="e.g. John Doe (Senior SDE)" />
              </div>
              <div className="form-group">
                <label>Number of Candidates Expected</label>
                <input type="number" value={interviewForm.candidates} onChange={e => setInterviewForm({...interviewForm, candidates: Number(e.target.value)})} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInterviewModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Selection Modal */}
      {showSelectionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>Add Selected Student</h2>
              <button className="close-btn" onClick={() => setShowSelectionModal(false)}><XCircle size={20}/></button>
            </div>
            <form onSubmit={handleAddSelection} className="modal-form">
              <div className="form-group">
                <label>Student Name</label>
                <input type="text" value={selectionForm.student} onChange={e => setSelectionForm({...selectionForm, student: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Registration Number</label>
                <input type="text" value={selectionForm.regNo} onChange={e => setSelectionForm({...selectionForm, regNo: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Company</label>
                <select value={selectionForm.company} onChange={e => setSelectionForm({...selectionForm, company: e.target.value})} required>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.companyId} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Role</label>
                <input type="text" value={selectionForm.role} onChange={e => setSelectionForm({...selectionForm, role: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Package (CTC in LPA)</label>
                <input type="text" value={selectionForm.ctc} onChange={e => setSelectionForm({...selectionForm, ctc: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Offer Date</label>
                <input type="date" value={selectionForm.date} onChange={e => setSelectionForm({...selectionForm, date: e.target.value})} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowSelectionModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Selection</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Preview Modal */}
      {reportPreview && (
        <div className="modal-overlay" style={{ zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2>{reportPreview.title}</h2>
              <button className="close-btn" onClick={() => setReportPreview(null)}><XCircle size={20}/></button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    {reportPreview.headers.map((h, i) => <th key={i} className="p-2 border-b dark:border-gray-700 font-bold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reportPreview.rows.map((row, i) => (
                    <tr key={i} className="border-b dark:border-gray-800">
                      {row.map((cell, j) => <td key={j} className="p-2 text-sm">{cell}</td>)}
                    </tr>
                  ))}
                  {reportPreview.rows.length === 0 && (
                    <tr><td colSpan={reportPreview.headers.length} className="p-4 text-center text-muted">No data available for this report.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800">
              <button className="btn-secondary flex items-center gap-2" onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," + [reportPreview.headers, ...reportPreview.rows].map(e => e.join(",")).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `${reportPreview.title.replace(/\s+/g, '_')}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}><Download size={16}/> Download CSV</button>
              <button className="btn-primary flex items-center gap-2" onClick={() => window.print()}><FileText size={16}/> Print</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlacementManagement;
