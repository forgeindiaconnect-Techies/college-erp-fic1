import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, ArrowRight, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, Search, CheckSquare, Square } from 'lucide-react';
import { getStudents, getDepartments, promoteStudents } from '../api/index';

const ACADEMIC_YEARS = ['2025-2026', '2026-2027', '2027-2028'];
const SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

export default function StudentPromotion() {
  const [departments, setDepartments] = useState([]);
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [selectedDept, setSelectedDept] = useState('Computer Science Engineering');
  const [currentSem, setCurrentSem] = useState('Semester 1');
  const [targetSem, setTargetSem] = useState('Semester 2');
  const [isGraduation, setIsGraduation] = useState(false);

  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudentsForPromotion();
  }, [selectedDept, currentSem]);

  // Sync next semester automatically when current sem changes
  useEffect(() => {
    const num = parseInt(currentSem.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num) && num < 8) {
      setTargetSem(`Semester ${num + 1}`);
      setIsGraduation(false);
    } else if (num === 8) {
      setTargetSem('Graduated');
      setIsGraduation(true);
    }
  }, [currentSem]);

  const fetchDepartments = async () => {
    try {
      const res = await getDepartments();
      if (res?.data && res.data.length > 0) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.warn('Error loading departments:', err);
    }
  };

  const fetchStudentsForPromotion = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await getStudents();
      if (res?.data) {
        const normSem = (s) => (s || '').toLowerCase().trim();
        const normDept = (d) => (d || '').toLowerCase().trim();

        const filtered = res.data.filter(st => {
          const matchDept = normDept(st.dept) === normDept(selectedDept) || normDept(st.department) === normDept(selectedDept);
          const matchSem = normSem(st.sem) === normSem(currentSem) || normSem(st.sem) === normSem(currentSem.replace('Semester ', 'Sem '));
          return matchDept && matchSem;
        });

        setStudents(filtered);
        // By default select all students who don't have severe arrears
        setSelectedStudentIds(filtered.map(s => s.id));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleExecutePromotion = async () => {
    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student to promote.');
      return;
    }

    const actionText = isGraduation ? 'mark as GRADUATED' : `promote to ${targetSem}`;
    if (!window.confirm(`Are you sure you want to ${actionText} ${selectedStudentIds.length} student(s)?`)) {
      return;
    }

    setPromoting(true);
    setStatusMessage(null);
    try {
      const payload = {
        studentIds: selectedStudentIds,
        currentSem,
        nextSem: targetSem,
        isGraduation
      };
      const res = await promoteStudents(payload);
      setStatusMessage({
        type: 'success',
        text: res.data?.message || `Successfully processed promotion for ${selectedStudentIds.length} students!`
      });

      // Reload students table
      fetchStudentsForPromotion();
    } catch (err) {
      console.error('Promotion error:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to process student promotion. Please try again.'
      });
    } finally {
      setPromoting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <GraduationCap className="text-blue-600" size={28} /> Student Lifecycle & Semester Promotion
          </h1>
          <p className="text-gray-500 mt-1">Bulk promote eligible students to the next academic semester or process graduation.</p>
        </div>
        
        <button 
          onClick={handleExecutePromotion}
          disabled={promoting || selectedStudentIds.length === 0}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            background: isGraduation ? '#10b981' : '#2563eb',
            color: '#fff',
            fontWeight: 700,
            border: 'none',
            cursor: (promoting || selectedStudentIds.length === 0) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
          }}
        >
          {promoting ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          <span>{isGraduation ? 'Mark Selected as Graduated' : `Promote Selected (${selectedStudentIds.length})`}</span>
        </button>
      </div>

      {statusMessage && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          background: statusMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
          border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600
        }}>
          {statusMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Filter Selection Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm text-uppercase tracking-wider">Promotion Parameters</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Academic Year</label>
            <select 
              value={academicYear} 
              onChange={e => setAcademicYear(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"
            >
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
            <select 
              value={selectedDept} 
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"
            >
              {departments.length > 0 ? (
                departments.map(d => <option key={d._id || d.name || d} value={d.name || d}>{d.name || d}</option>)
              ) : (
                <option value="Computer Science Engineering">Computer Science Engineering</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Current Semester</label>
            <select 
              value={currentSem} 
              onChange={e => setCurrentSem(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"
            >
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Promote To Semester</label>
            <select 
              value={targetSem} 
              onChange={e => {
                setTargetSem(e.target.value);
                setIsGraduation(e.target.value === 'Graduated');
              }}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium"
            >
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
              <option value="Graduated">Graduated (Final Completion)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 font-semibold">Loaded Students</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{students.length}</h3>
          </div>
          <Users className="text-blue-500" size={28} />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 font-semibold">Eligible for Promotion</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{students.length}</h3>
          </div>
          <CheckCircle className="text-emerald-500" size={28} />
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 font-semibold">Target Status</p>
            <h3 className="text-xl font-bold text-indigo-600 mt-1">{targetSem}</h3>
          </div>
          <ShieldCheck className="text-indigo-500" size={28} />
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-blue-600"
            >
              {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="text-blue-600" size={18} />
              ) : (
                <Square className="text-gray-400" size={18} />
              )}
              <span>Select All ({selectedStudentIds.length}/{filteredStudents.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search by student name or roll no..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4">Reg / Roll No</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Current Sem</th>
                <th className="p-4">Result Status</th>
                <th className="p-4">Target Semester</th>
                <th className="p-4 text-center">Select</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    <RefreshCw className="animate-spin inline-block mr-2" size={18} /> Loading student records for promotion...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No active student records found for {selectedDept} ({currentSem}).
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  return (
                    <tr key={st.id || st._id} className={isSelected ? 'bg-blue-50/40' : 'hover:bg-gray-50'}>
                      <td className="p-4 text-center font-medium text-gray-400">{idx + 1}</td>
                      <td className="p-4 font-bold text-gray-800">{st.id}</td>
                      <td className="p-4 font-medium text-gray-900">{st.name}</td>
                      <td className="p-4"><span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded text-xs font-semibold">{st.sem}</span></td>
                      <td className="p-4">
                        <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                          <CheckCircle size={12} /> Passed
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${isGraduation ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          <ArrowRight size={12} /> {targetSem}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(st.id)}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
