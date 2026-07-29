import React, { useState, useEffect } from 'react';
import { Users, Search } from 'lucide-react';
import { getFacultyAllocations } from '../../api/index';
import './HodSubjects.css'; // Reuse CSS

const getHodSession = () => {
  try { return JSON.parse(sessionStorage.getItem('hod_session')) || { dept: 'Computer Science' }; }
  catch { return { dept: 'Computer Science' }; }
};

export default function HodFacultyAllocation() {
  const hod = getHodSession();
  const DEPT = hod.dept;

  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getFacultyAllocations({ department: DEPT });
        setAllocations(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [DEPT]);

  const filtered = allocations.filter(a => {
    const q = search.toLowerCase();
    const staffName = a.staffId?.name?.toLowerCase() || '';
    const subjectName = a.subjectId?.subjectName?.toLowerCase() || '';
    return staffName.includes(q) || subjectName.includes(q);
  });

  return (
    <div className="hod-subjects-page animate-fade-in p-6">
      <div className="page-header mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="text-blue-600"/> Faculty Allocation — {DEPT}</h1>
          <p className="text-gray-500">View all faculty subject assignments for your department.</p>
        </div>
      </div>

      <div className="glass-card table-section-card p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-semibold text-gray-700">Allocated Faculty</h3>
          <div className="flex bg-gray-50 rounded-lg p-2 border border-gray-200">
            <Search size={16} className="text-gray-400 mt-0.5 mr-2" />
            <input 
              type="text" 
              placeholder="Search faculty or subject..." 
              className="bg-transparent border-none outline-none text-sm w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><div className="loader"></div></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-medium text-gray-600 text-sm">Faculty</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Subject</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Semester</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Section</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a => (
                <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{a.staffId?.name || 'Unknown'}</td>
                  <td className="p-4 text-gray-700 text-sm">
                    <div className="font-medium">{a.subjectId?.subjectName || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{a.subjectId?.subjectCode}</div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">{a.semester}</td>
                  <td className="p-4 text-sm text-gray-600">
                    <span className="font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">Sec {a.section}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No faculty allocations found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
