import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, Calendar, Settings, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Hash, Award, Clock, User } from 'lucide-react';
import { getDepartments, getStaff } from '../../api/index';
import './AcademicStructure.css';

const DEFAULT_DEPARTMENTS = [
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
];

const DEFAULT_SUBJECTS = [
  { id: 'SUB001', code: 'CS301', name: 'Data Structures', dept: 'Computer Science Engineering', sem: 'Semester 3', teacher: 'Dr. Ananya Rao', credits: 4, workload: 4 },
  { id: 'SUB002', code: 'CS302', name: 'DBMS', dept: 'Computer Science Engineering', sem: 'Semester 3', teacher: 'Dr. Agila', credits: 4, workload: 4 },
  { id: 'SUB003', code: 'CS401', name: 'Operating Systems', dept: 'Computer Science Engineering', sem: 'Semester 4', teacher: 'Dr. Agila', credits: 4, workload: 4 },
  { id: 'SUB004', code: 'CYB301', name: 'Introduction to Cyber Security', dept: 'Cyber Security', sem: 'Semester 3', teacher: 'Dr. Vaideeswari', credits: 4, workload: 4 },
  { id: 'SUB005', code: 'CYB302', name: 'Computer Networks', dept: 'Cyber Security', sem: 'Semester 3', teacher: 'Dr. Vaideeswari', credits: 4, workload: 4 },
];

const AcademicStructure = () => {
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDept, setExpandedDept] = useState(null);
  const [expandedSem, setExpandedSem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const staffRes = await getStaff().catch(() => ({ data: [] }));
      setStaff(staffRes?.data || []);

      const savedDepts = localStorage.getItem('erp_departments');
      if (savedDepts) {
        const parsed = JSON.parse(savedDepts);
        setDepartments([...new Set([...DEFAULT_DEPARTMENTS, ...parsed])]);
      } else {
        localStorage.setItem('erp_departments', JSON.stringify(DEFAULT_DEPARTMENTS));
        setDepartments(DEFAULT_DEPARTMENTS);
      }

      const savedSubs = localStorage.getItem(`erp_subjects_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      if (savedSubs) {
        let parsed = JSON.parse(savedSubs);
        // Normalize semesters for the structure
        parsed = parsed.map(s => ({...s, sem: s.sem.startsWith('Sem ') ? s.sem.replace('Sem ', 'Semester ') : s.sem}));
        setSubjects(parsed);
      } else {
        localStorage.setItem(`erp_subjects_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(DEFAULT_SUBJECTS));
        setSubjects(DEFAULT_SUBJECTS);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDept = (dept) => {
    if (expandedDept === dept) {
      setExpandedDept(null);
      setExpandedSem(null);
    } else {
      setExpandedDept(dept);
      setExpandedSem(null);
    }
  };

  const toggleSem = (sem) => {
    setExpandedSem(expandedSem === sem ? null : sem);
  };

  const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

  return (
    <div className="academic-structure animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Academic Management Module</h1>
          <p className="text-muted">Manage Departments, Semesters, Subjects, and Course Regulations across the institution.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary"><Settings size={18} /> Regulations</button>
          <button className="btn-primary shadow-glow"><Plus size={18} /> Add Department</button>
        </div>
      </div>

      <div className="structure-grid">
        {/* Left Column: Academic Tree */}
        <div className="glass-card structure-tree">
          <h2 className="section-title"><Layers size={20} className="text-primary" /> Institutional Structure</h2>
          <div className="tree-container">
            {loading ? (
              <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>Loading structure...</p>
            ) : (
              departments.map((dept) => {
                const deptSubjects = subjects.filter(s => s.dept === dept || s.dept.includes(dept.split(' ')[0]));
                const isDeptExpanded = expandedDept === dept;
                
                return (
                  <div key={dept} className="tree-node dept-node">
                    <div className={`node-header ${isDeptExpanded ? 'active' : ''}`} onClick={() => toggleDept(dept)}>
                      {isDeptExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="node-title">{dept}</span>
                      <span className="node-badge">{deptSubjects.length} Subjects</span>
                    </div>
                    
                    {isDeptExpanded && (
                      <div className="node-children">
                        {semesters.map(sem => {
                          const semSubjects = deptSubjects.filter(s => s.sem === sem);
                          const isSemExpanded = expandedSem === sem;
                          
                          return (
                            <div key={sem} className="tree-node sem-node">
                              <div className={`node-header ${isSemExpanded ? 'active' : ''}`} onClick={() => toggleSem(sem)}>
                                {isSemExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                <span className="node-title">{sem}</span>
                                {semSubjects.length > 0 && <span className="node-badge outline">{semSubjects.length} Courses</span>}
                              </div>
                              
                              {isSemExpanded && (
                                <div className="node-children subject-list">
                                  {semSubjects.length > 0 ? (
                                    semSubjects.map(sub => (
                                      <div key={sub.id} className="subject-item">
                                        <div className="subject-info">
                                          <span className="subject-code">{sub.code}</span>
                                          <span className="subject-name">{sub.name}</span>
                                        </div>
                                        <div className="subject-meta">
                                          <span className="meta-tag"><Award size={12} /> {sub.credits} Credits</span>
                                          <span className="meta-tag"><User size={12} /> {sub.teacher || 'Unassigned'}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="empty-subject">
                                      <p className="text-muted text-sm">No subjects allocated to this semester.</p>
                                      <button className="btn-link text-sm"><Plus size={14} /> Assign Subject</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quick Stats & Regulations */}
        <div className="structure-sidebar">
          <div className="glass-card stat-overview">
            <h3 className="section-title"><Calendar size={18} className="text-secondary" /> Academic Year</h3>
            <div className="current-year-card">
              <div className="year-title">2026 - 2027 (Odd Semester)</div>
              <div className="year-status text-success">● Active</div>
            </div>
            
            <div className="quick-stats-grid">
              <div className="q-stat">
                <span className="q-label">Departments</span>
                <span className="q-value">{departments.length}</span>
              </div>
              <div className="q-stat">
                <span className="q-label">Total Subjects</span>
                <span className="q-value">{subjects.length}</span>
              </div>
            </div>
          </div>

          <div className="glass-card quick-actions mt-4">
            <h3 className="section-title"><BookOpen size={18} className="text-primary" /> Subject Management</h3>
            <p className="text-sm text-muted mb-4">Centralized subject and curriculum configuration.</p>
            <button className="btn-secondary w-full justify-center mb-2"><Plus size={16} /> Add New Subject</button>
            <button className="btn-ghost w-full justify-center"><User size={16} /> Assign Faculty</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicStructure;
