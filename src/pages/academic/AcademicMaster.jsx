import React, { useState, useEffect } from 'react';
import { Plus, Settings, BookOpen, Search, CheckCircle, X } from 'lucide-react';
import { getAcademicYears, createAcademicYear, getRegulations, createRegulation } from '../../api/index';
import './AcademicMaster.css';

export default function AcademicMaster() {
  const [activeTab, setActiveTab] = useState('years');
  const [years, setYears] = useState([]);
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [yearForm, setYearForm] = useState({ year: '', isActive: true });
  const [regForm, setRegForm] = useState({ regulationName: '', academicYearId: '', isActive: true });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [yrRes, regRes] = await Promise.all([
        getAcademicYears(),
        getRegulations()
      ]);
      setYears(yrRes.data || []);
      setRegulations(regRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateYear = async (e) => {
    e.preventDefault();
    try {
      await createAcademicYear(yearForm);
      setYearForm({ year: '', isActive: true });
      fetchData();
    } catch (err) {
      alert('Failed to create Academic Year');
    }
  };

  const handleCreateReg = async (e) => {
    e.preventDefault();
    try {
      await createRegulation(regForm);
      setRegForm({ regulationName: '', academicYearId: '', isActive: true });
      fetchData();
    } catch (err) {
      alert('Failed to create Regulation');
    }
  };

  return (
    <div className="academic-master-container p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-blue-600" />
            Academic Master
          </h1>
          <p className="text-gray-500 mt-1">Manage core academic structures like Years and Regulations.</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button 
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'years' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('years')}
        >
          Academic Years
        </button>
        <button 
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'regs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('regs')}
        >
          Regulations
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="loader"></div></div>
      ) : activeTab === 'years' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> New Academic Year</h3>
            <form onSubmit={handleCreateYear}>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">Year (e.g. 2026-2027)</label>
                <input type="text" className="form-input w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                  value={yearForm.year} onChange={e => setYearForm({...yearForm, year: e.target.value})} required placeholder="2026-2027" />
              </div>
              <div className="mb-4 flex items-center gap-2">
                <input type="checkbox" checked={yearForm.isActive} onChange={e => setYearForm({...yearForm, isActive: e.target.checked})} id="isActY" />
                <label htmlFor="isActY" className="text-sm text-gray-700">Active</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium">Create Year</button>
            </form>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-medium text-gray-600">Year</th>
                  <th className="p-4 font-medium text-gray-600">Status</th>
                  <th className="p-4 font-medium text-gray-600">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {years.map(y => (
                  <tr key={y._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{y.year}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${y.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {y.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{new Date(y.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {years.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-500">No Academic Years defined</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><Plus size={18} /> New Regulation</h3>
            <form onSubmit={handleCreateReg}>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">Regulation Name (e.g. R2023)</label>
                <input type="text" className="form-input w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100" 
                  value={regForm.regulationName} onChange={e => setRegForm({...regForm, regulationName: e.target.value})} required placeholder="R2023" />
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">Academic Year</label>
                <select className="form-select w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-100"
                  value={regForm.academicYearId} onChange={e => setRegForm({...regForm, academicYearId: e.target.value})} required>
                  <option value="">Select Year</option>
                  {years.map(y => <option key={y._id} value={y._id}>{y.year}</option>)}
                </select>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <input type="checkbox" checked={regForm.isActive} onChange={e => setRegForm({...regForm, isActive: e.target.checked})} id="isActR" />
                <label htmlFor="isActR" className="text-sm text-gray-700">Active</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors font-medium">Create Regulation</button>
            </form>
          </div>
          
          <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-medium text-gray-600">Regulation Name</th>
                  <th className="p-4 font-medium text-gray-600">Academic Year</th>
                  <th className="p-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {regulations.map(r => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-800">{r.regulationName}</td>
                    <td className="p-4 text-gray-600">{r.academicYearId?.year || 'Unknown'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {regulations.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-500">No Regulations defined</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
