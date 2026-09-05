import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, BookOpen, User, Hash, Percent, Award, Clock } from 'lucide-react';
import {
  getStaff,
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getRegulations,
  getDepartments,
  getCourses,
  getSemesters,
  getSections
} from '../../api/index';
import './SubjectsManagement.css';

const DEFAULT_SUBJECTS = [];

const DEPARTMENTS = [
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
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

const SubjectsManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [dbDepartments, setDbDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    regulationId: "",
    code: "",
    name: "",
    departmentId: "",
    dept: "",
    courseId: "",
    semesterId: "",
    sem: "",
    sectionIds: [],
    teacher: "",
    credits: 4,
    workload: 4
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const staffRes = await getStaff().catch(() => ({ data: [] }));
      setStaff(staffRes?.data || []);
      
      const regRes = await getRegulations().catch(() => ({ data: [] }));
      setRegulations(regRes.data || []);

      const deptsRes = await getDepartments().catch(() => ({ data: [] }));
      setDbDepartments(deptsRes.data || []);

      const courseRes = await getCourses().catch(() => ({
        data: { courses: [] }
      }));

      const semesterRes = await getSemesters().catch(() => ({
        data: { semesters: [] }
      }));

      const sectionRes = await getSections().catch(() => ({
        data: { sections: [] }
      }));

      setCourses(courseRes?.data?.courses || []);
      setSemesters(semesterRes?.data?.semesters || []);
      setSections(sectionRes?.data?.sections || []);
      
      const subRes = await getSubjects().catch(() => ({ data: [] }));
      const formattedSubs = subRes.data.map(s => ({
        id: s._id,
        regulationId: s.regulationId,
        departmentId: s.departmentId || "",
        courseId: s.courseId || "",
        semesterId: s.semesterId || "",
        sectionIds: s.sectionIds || [],
        code: s.subjectCode,
        name: s.subjectName,
        dept: s.department,
        sem: s.semester,
        teacher: s.teacher,
        credits: s.credits,
        workload: s.workload,
        type: s.type,
      }));
      setSubjects(formattedSubs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({
      regulationId: regulations[0]?._id || "",
      code: "",
      name: "",
      departmentId: "",
      dept: "",
      courseId: "",
      semesterId: "",
      sem: "",
      sectionIds: [],
      teacher: "",
      credits: 4,
      workload: 4
    });

    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (sub) => {
    setForm({
      regulationId:
        sub.regulationId?._id ||
        sub.regulationId ||
        "",
      code: sub.code,
      name: sub.name,
      departmentId: sub.departmentId || "",
      dept: sub.dept,
      courseId: sub.courseId || "",
      semesterId: sub.semesterId || "",
      sem: sub.sem,
      sectionIds: sub.sectionIds || [],
      teacher: sub.teacher || "",
      credits: sub.credits,
      workload: sub.workload
    });

    setEditTarget(sub.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      regulationId: form.regulationId || null,
      departmentId: form.departmentId,
      courseId: form.courseId,
      semesterId: form.semesterId,
      sectionIds: form.sectionIds,
      subjectCode: form.code,
      subjectName: form.name,
      department: form.dept,
      semester: form.sem,
      teacher: form.teacher,
      credits: Number(form.credits),
      workload: Number(form.workload),
    };

    try {
      if (editTarget) {
        await updateSubject(editTarget, payload);
      } else {
        await createSubject(payload);
      }
      fetchData();
      closeModal();
    } catch (err) {
      alert('Failed to save subject: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject record?')) {
      try {
        await deleteSubject(id);
        fetchData();
      } catch (err) {
        alert('Failed to delete subject');
      }
    }
  };

  const filtered = subjects.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.teacher.toLowerCase().includes(q);
    
    let sDept = s.dept;
    if (sDept === 'Computer Science') sDept = 'Computer Science Engineering';
    else if (sDept === 'Electronics & Comm.') sDept = 'Electronics & Communication Engineering';
    else if (sDept === 'Electrical Engg.') sDept = 'Electrical & Electronics Engineering';
    else if (sDept === 'Mechanical Engg.') sDept = 'Mechanical Engineering';
    else if (sDept === 'Civil Engg.') sDept = 'Civil Engineering';
    else if (sDept === 'Information Tech.') sDept = 'Information Technology';

    const matchesDept = deptFilter === 'All' || sDept === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="subjects-management animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Subjects Curriculum Management</h1>
          <p className="text-muted">Configure academic courses, assign credits weighting, and allocate teaching faculty workloads.</p>
        </div>
        <button className="btn-primary shadow-glow" onClick={openAdd}><Plus size={18} /> Add Subject</button>
      </div>

      <div className="sm-summary-row" style={{ marginTop: '1.5rem' }}>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Subjects</span>
          <span className="sm-summary-value">{subjects.length}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Credits Mapped</span>
          <span className="sm-summary-value text-success">{subjects.reduce((sum, s) => sum + s.credits, 0)}</span>
        </div>
        <div className="sm-summary-card glass-card">
          <span className="sm-summary-label">Total Teaching Hours</span>
          <span className="sm-summary-value gradient-text">{subjects.reduce((sum, s) => sum + s.workload, 0)}h / wk</span>
        </div>
      </div>

      <div className="glass-card table-wrapper" style={{ marginTop: '1.5rem' }}>
        <div className="filters-row">
          <div className="search-box">
            <Search size={18} className="text-muted" />
            <input 
              type="text" 
              placeholder="Search by course code, title, or instructor..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <select className="filter-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="All">All Departments</option>
              {(() => {
                const activeDepts = dbDepartments.length > 0 ? dbDepartments.map(d => d.name) : DEPARTMENTS;
                return activeDepts.map(d => <option key={d}>{d}</option>);
              })()}
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Allocated Faculty</th>
                <th>Credits</th>
                <th>Weekly Hours</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '16px', borderRadius: '4px' }}></div></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted" style={{ padding: '2rem' }}>
                    No subjects found.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="sub-icon"><BookOpen size={16} /></div>
                        <div>
                          <div className="sub-name">{sub.name}</div>
                          <div className="sub-code">{sub.code} • {regulations.find(r => r._id === (sub.regulationId?._id || sub.regulationId))?.regulationName || 'Gen'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-muted">
                        {(() => {
                          let d = sub.dept;
                          if (d === 'Computer Science') d = 'Computer Science Engineering';
                          else if (d === 'Electronics & Comm.') d = 'Electronics & Communication Engineering';
                          else if (d === 'Electrical Engg.') d = 'Electrical & Electronics Engineering';
                          else if (d === 'Mechanical Engg.') d = 'Mechanical Engineering';
                          else if (d === 'Civil Engg.') d = 'Civil Engineering';
                          else if (d === 'Information Tech.') d = 'Information Technology';
                          return d;
                        })()}
                      </span>
                    </td>
                    <td><span className="badge-outline">{sub.sem}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} className="text-muted" />
                        <span className="text-sm font-semibold">{sub.teacher || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td><span className="subject-credit-badge">{sub.credits} Credits</span></td>
                    <td><span className="subject-workload-badge">{sub.workload} Hrs</span></td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" onClick={() => openEdit(sub)}><Edit2 size={15} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(sub.id)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && <div className="table-footer">Showing {filtered.length} of {subjects.length} courses</div>}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTarget ? 'Edit Subject Curriculum' : 'Add Subject'}</h2>
              <button className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">

                <div className="form-group">
                  <label><Hash size={13} style={{ display: 'inline', marginRight: '4px' }} /> Subject Code *</label>
                  <input required placeholder="e.g. CS301" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                </div>
                
                <div className="form-group">
                  <label><BookOpen size={13} style={{ display: 'inline', marginRight: '4px' }} /> Subject Name *</label>
                  <input required placeholder="e.g. Data Structures" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>

                <div className="form-group">
                  <label>Regulation</label>
                  <select value={form.regulationId} onChange={e => setForm({ ...form, regulationId: e.target.value })}>
                    <option value="">— Select Regulation —</option>
                    {regulations.map(r => (
                      <option key={r._id} value={r._id}>{r.regulationName}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Department *</label>

                  <select
                    value={form.departmentId}
                    onChange={(event) => {
                      const selectedDepartment = dbDepartments.find(
                        (department) =>
                          department.id === event.target.value
                      );

                      setForm({
                        ...form,
                        departmentId: event.target.value,
                        dept: selectedDepartment?.name || "",
                        courseId: "",
                        semesterId: "",
                        sem: "",
                        sectionIds: []
                      });
                    }}
                    required
                  >
                    <option value="">Select Department</option>

                    {dbDepartments.map((department) => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Course *</label>

                  <select
                    value={form.courseId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        courseId: event.target.value,
                        semesterId: "",
                        sem: "",
                        sectionIds: []
                      })
                    }
                    required
                    disabled={!form.departmentId}
                  >
                    <option value="">Select Course</option>

                    {courses
                      .filter(
                        (course) =>
                          course.departmentId === form.departmentId &&
                          course.status !== "Inactive"
                      )
                      .map((course) => (
                        <option
                          key={course.id}
                          value={course.id}
                        >
                          {course.name} ({course.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Academic Semester *</label>

                  <select
                    value={form.semesterId}
                    onChange={(event) => {
                      const selectedSemester = semesters.find(
                        (semester) =>
                          semester.id === event.target.value
                      );

                      setForm({
                        ...form,
                        semesterId: event.target.value,
                        sem: selectedSemester?.name || "",
                        sectionIds: []
                      });
                    }}
                    required
                    disabled={!form.courseId}
                  >
                    <option value="">Select Semester</option>

                    {semesters
                      .filter(
                        (semester) =>
                          semester.courseId === form.courseId &&
                          semester.status !== "Inactive"
                      )
                      .map((semester) => (
                        <option
                          key={semester.id}
                          value={semester.id}
                        >
                          {semester.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Applicable Sections *</label>

                  <select
                    multiple
                    value={form.sectionIds}
                    onChange={(event) => {
                      const selectedSectionIds = Array.from(
                        event.target.selectedOptions,
                        (option) => option.value
                      );

                      setForm({
                        ...form,
                        sectionIds: selectedSectionIds
                      });
                    }}
                    required
                    disabled={!form.semesterId}
                    style={{ minHeight: "90px" }}
                  >
                    {sections
                      .filter(
                        (section) =>
                          section.semesterId === form.semesterId &&
                          section.status !== "Inactive"
                      )
                      .map((section) => (
                        <option
                          key={section.id}
                          value={section.id}
                        >
                          Section {section.name}
                        </option>
                      ))}
                  </select>

                  <small className="text-muted">
                    Hold Ctrl to select multiple sections.
                  </small>
                </div>

                <div className="form-group">
                  <label><User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Assign Instructor</label>
                  <select value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })}>
                    <option value="">— Select Instructor —</option>
                    {staff.map((f, idx) => (
                      <option key={f._id || f.id || idx} value={f.name}>{f.name}{f.department ? ` (${f.department})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label><Award size={13} style={{ display: 'inline', marginRight: '4px' }} /> Credits Weight</label>
                  <input type="number" min="1" max="6" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} />
                </div>

                <div className="form-group">
                  <label><Clock size={13} style={{ display: 'inline', marginRight: '4px' }} /> Workload Weekly Hours</label>
                  <input type="number" min="1" max="10" value={form.workload} onChange={e => setForm({ ...form, workload: e.target.value })} />
                </div>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn-primary">{editTarget ? 'Save Changes' : 'Create Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsManagement;
