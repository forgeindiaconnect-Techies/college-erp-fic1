import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Users, BookOpen, Layers } from 'lucide-react';
import {
  getFacultyAllocations,
  createFacultyAllocation,
  deleteFacultyAllocation,
  getStaff,
  getSubjects,
  getAcademicYears,
  getRegulations,
  getDepartments,
  getCourses,
  getSemesters,
  getSections
} from '../../api/index';
import './AcademicMaster.css';
import './FacultyAllocation.css';



export default function FacultyAllocation() {
  const [allocations, setAllocations] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [regulations, setRegulations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  
  const [form, setForm] = useState({
    departmentId: '',
    department: '',
    courseId: '',
    semesterId: '',
    semester: '',
    sectionId: '',
    section: '',
    subjectId: '',
    staffId: '',
    academicYearId: '',
    regulationId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        allocRes,
        staffRes,
        subRes,
        yrRes,
        regRes,
        deptRes,
        courseRes,
        semesterRes,
        sectionRes
      ] = await Promise.all([
        getFacultyAllocations({ department: deptFilter }),
        getStaff(),
        getSubjects(),
        getAcademicYears(),
        getRegulations(),
        getDepartments(),
        getCourses(),
        getSemesters(),
        getSections()
      ]);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : (allocRes.data?.allocations || allocRes.data?.data || []));
      setStaffList(Array.isArray(staffRes.data) ? staffRes.data : (staffRes.data?.staff || staffRes.data?.data || []));
      setSubjects(Array.isArray(subRes.data) ? subRes.data : (subRes.data?.subjects || subRes.data?.data || []));
      setAcademicYears(Array.isArray(yrRes.data) ? yrRes.data : (yrRes.data?.academicYears || yrRes.data?.data || []));
      setRegulations(Array.isArray(regRes.data) ? regRes.data : (regRes.data?.regulations || regRes.data?.data || []));
      setDepartments(Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data?.departments || deptRes.data?.data || []));
      setCourses(Array.isArray(courseRes.data) ? courseRes.data : (courseRes.data?.courses || courseRes.data?.data || []));
      setSemesters(Array.isArray(semesterRes.data) ? semesterRes.data : (semesterRes.data?.semesters || semesterRes.data?.data || []));
      setSections(Array.isArray(sectionRes.data) ? sectionRes.data : (sectionRes.data?.sections || sectionRes.data?.data || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createFacultyAllocation(form);
      setForm({ ...form, subjectId: '', staffId: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to allocate faculty');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Remove this faculty allocation?')) {
      try {
        await deleteFacultyAllocation(id);
        fetchData();
      } catch (err) {
        alert('Failed to remove allocation');
      }
    }
  };

  const safeCourses = Array.isArray(courses) ? courses : [];
  const safeSemesters = Array.isArray(semesters) ? semesters : [];
  const safeSections = Array.isArray(sections) ? sections : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const safeDepartments = Array.isArray(departments) ? departments : [];
  const safeAcademicYears = Array.isArray(academicYears) ? academicYears : [];
  const safeRegulations = Array.isArray(regulations) ? regulations : [];
  const safeAllocations = Array.isArray(allocations) ? allocations : [];

  const filteredCourses = safeCourses.filter(
    (course) => course.departmentId === form.departmentId
  );

  const filteredSemesters = safeSemesters.filter(
    (semester) => semester.courseId === form.courseId
  );

  const filteredSections = safeSections.filter(
    (section) =>
      section.semesterId === form.semesterId &&
      section.status !== 'Inactive'
  );

  const filteredSubjects = safeSubjects.filter(
    (subject) =>
      (
        subject.departmentId === form.departmentId ||
        subject.department === form.department
      ) &&
      (
        subject.semesterId === form.semesterId ||
        subject.semester === form.semester
      ) &&
      (
        !Array.isArray(subject.sectionIds) ||
        subject.sectionIds.length === 0 ||
        subject.sectionIds.some(
          (id) => String(id) === String(form.sectionId)
        )
      )
  );

  const deptStaff = safeStaffList.filter(
    (staff) =>
      staff.dept === form.department ||
      staff.department === form.department
  );

  return (
    <div className="faculty-allocation-page animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" />
            Faculty Allocation
          </h1>
          <p className="text-gray-500 mt-1">Map faculty members to specific subjects, semesters, and sections.</p>
        </div>
      </div>

      <div className="grid">
        <div>
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> New Allocation</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Academic Year</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})} required>
                <option value="">Select Year</option>
                {safeAcademicYears.map(y => <option key={y._id} value={y._id}>{y.year}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Regulation (Optional)</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.regulationId} onChange={e => setForm({...form, regulationId: e.target.value})}>
                <option value="">-- None / Default --</option>
                {safeRegulations.map(r => <option key={r._id} value={r._id}>{r.regulationName}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">
                Department
              </label>

              <select
                className="form-select w-full p-2 border rounded-lg"
                value={form.departmentId}
                onChange={(event) => {
                  const department = safeDepartments.find(
                    (item) =>
                      (item.id || item._id) === event.target.value
                  );

                  setForm({
                    ...form,
                    departmentId: event.target.value,
                    department: department?.name || '',
                    courseId: '',
                    semesterId: '',
                    semester: '',
                    sectionId: '',
                    section: '',
                    subjectId: '',
                    staffId: ''
                  });
                }}
                required
              >
                <option value="">Select Department</option>

                {safeDepartments.map((department) => (
                  <option
                    key={department.id || department._id}
                    value={department.id || department._id}
                  >
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">
                Course
              </label>

              <select
                className="form-select w-full p-2 border rounded-lg"
                value={form.courseId}
                disabled={!form.departmentId}
                onChange={(event) =>
                  setForm({
                    ...form,
                    courseId: event.target.value,
                    semesterId: '',
                    semester: '',
                    sectionId: '',
                    section: '',
                    subjectId: ''
                  })
                }
                required
              >
                <option value="">Select Course</option>

                {filteredCourses.map((course) => (
                  <option
                    key={course.id || course._id}
                    value={course.id || course._id}
                  >
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">
                  Semester
                </label>

                <select
                  className="form-select w-full p-2 border rounded-lg"
                  value={form.semesterId}
                  disabled={!form.courseId}
                  onChange={(event) => {
                    const semester = safeSemesters.find(
                      (item) =>
                        (item.id || item._id) === event.target.value
                    );

                    setForm({
                      ...form,
                      semesterId: event.target.value,
                      semester:
                        semester?.name ||
                        `Semester ${semester?.semesterNumber || ''}`,
                      sectionId: '',
                      section: '',
                      subjectId: ''
                    });
                  }}
                  required
                >
                  <option value="">Select Semester</option>

                  {filteredSemesters.map((semester) => (
                    <option
                      key={semester.id || semester._id}
                      value={semester.id || semester._id}
                    >
                      {semester.name ||
                        `Semester ${semester.semesterNumber}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">
                  Section
                </label>

                <select
                  className="form-select w-full p-2 border rounded-lg"
                  value={form.sectionId}
                  disabled={!form.semesterId}
                  onChange={(event) => {
                    const section = safeSections.find(
                      (item) =>
                        (item.id || item._id) === event.target.value
                    );

                    setForm({
                      ...form,
                      sectionId: event.target.value,
                      section: section?.name || '',
                      subjectId: ''
                    });
                  }}
                  required
                >
                  <option value="">Select Section</option>

                  {filteredSections.map((section) => (
                    <option
                      key={section.id || section._id}
                      value={section.id || section._id}
                    >
                      Section {section.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Subject</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.subjectId} onChange={e => setForm({...form, subjectId: e.target.value})} required>
                <option value="">Select Subject</option>
                {filteredSubjects.map(s => <option key={s._id} value={s._id}>{s.subjectCode || s.code} - {s.subjectName || s.name}</option>)}
              </select>
              {filteredSubjects.length === 0 && <span className="text-xs text-red-500">No subjects found for this dept/sem.</span>}
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-600 mb-1">Faculty Member</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.staffId} onChange={e => setForm({...form, staffId: e.target.value})} required>
                <option value="">Select Faculty</option>
                {deptStaff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium">Allocate Faculty</button>
          </form>
        </div>
        
        <div>
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-700">Current Allocations</h3>
            <select
              className="form-select text-sm border-gray-200 rounded-lg"
              value={deptFilter}
              onChange={(event) => setDeptFilter(event.target.value)}
            >
              <option value="">All Departments</option>

              {safeDepartments.map((department) => (
                <option
                  key={department.id || department._id}
                  value={department.name}
                >
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          {loading ? (
            <div className="p-12 flex justify-center"><div className="loader"></div></div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-medium text-gray-600 text-sm">Faculty</th>
                  <th className="p-4 font-medium text-gray-600 text-sm">Subject</th>
                  <th className="p-4 font-medium text-gray-600 text-sm">Sem / Sec</th>
                  <th className="p-4 font-medium text-gray-600 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {safeAllocations.map(a => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{a.staffId?.name || 'Unknown'}</td>
                    <td className="p-4 text-gray-700 text-sm">
                      <div className="font-medium">{a.subjectId?.subjectName || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{a.subjectId?.subjectCode}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {a.semester} <span className="mx-1">•</span> <span className="font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">Sec {a.section}</span>
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleDelete(a._id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {safeAllocations.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No faculty allocations found for this department.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
