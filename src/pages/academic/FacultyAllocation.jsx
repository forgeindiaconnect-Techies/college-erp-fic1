import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Users, BookOpen, Layers } from 'lucide-react';
import { getFacultyAllocations, createFacultyAllocation, deleteFacultyAllocation, getStaff, getSubjects, getAcademicYears, getRegulations } from '../../api/index';
import './AcademicMaster.css';

const DEPARTMENTS = [
  'Computer Science Engineering', 'Information Technology', 'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering',
  'Artificial Intelligence & Data Science', 'Cyber Security'
];
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
const SECTIONS = ['A', 'B', 'C', 'D'];

export default function FacultyAllocation() {
  const [allocations, setAllocations] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [regulations, setRegulations] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('Computer Science Engineering');
  
  const [form, setForm] = useState({
    department: 'Computer Science Engineering',
    semester: 'Semester 3',
    section: 'A',
    subjectId: '',
    staffId: '',
    academicYearId: '',
    regulationId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allocRes, staffRes, subRes, yrRes, regRes] = await Promise.all([
        getFacultyAllocations({ department: deptFilter }),
        getStaff(),
        getSubjects(),
        getAcademicYears(),
        getRegulations()
      ]);
      setAllocations(allocRes.data || []);
      setStaffList(staffRes.data || []);
      setSubjects(subRes.data || []);
      setAcademicYears(yrRes.data || []);
      setRegulations(regRes.data || []);
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

  const filteredSubjects = subjects.filter(s => s.department === form.department && s.semester === form.semester);
  const deptStaff = staffList.filter(s => s.dept === form.department);

  return (
    <div className="academic-master-container p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="text-blue-600" />
            Faculty Allocation
          </h1>
          <p className="text-gray-500 mt-1">Map faculty members to specific subjects, semesters, and sections.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> New Allocation</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Academic Year</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.academicYearId} onChange={e => setForm({...form, academicYearId: e.target.value})} required>
                <option value="">Select Year</option>
                {academicYears.map(y => <option key={y._id} value={y._id}>{y.year}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Regulation (Optional)</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.regulationId} onChange={e => setForm({...form, regulationId: e.target.value})}>
                <option value="">-- None / Default --</option>
                {regulations.map(r => <option key={r._id} value={r._id}>{r.regulationName}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Department</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Semester</label>
                <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                  value={form.semester} onChange={e => setForm({...form, semester: e.target.value})} required>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">Section</label>
                <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                  value={form.section} onChange={e => setForm({...form, section: e.target.value})} required>
                  {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Subject</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.subjectId} onChange={e => setForm({...form, subjectId: e.target.value})} required>
                <option value="">Select Subject</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
              {filteredSubjects.length === 0 && <span className="text-xs text-red-500">No subjects found for this dept/sem.</span>}
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-600 mb-1">Faculty Member</label>
              <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                value={form.staffId} onChange={e => setForm({...form, staffId: e.target.value})} required>
                <option value="">Select Faculty</option>
                {deptStaff.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium">Allocate Faculty</button>
          </form>
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-semibold text-gray-700">Current Allocations</h3>
            <select className="form-select text-sm border-gray-200 rounded-lg" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
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
                {allocations.map(a => (
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
                {allocations.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No faculty allocations found for this department.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
