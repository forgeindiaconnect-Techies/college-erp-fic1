import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Save, X } from 'lucide-react';
import { getPeriodMasters, createPeriodMaster, deletePeriodMaster } from '../../api/index';
import './AcademicMaster.css';

export default function PeriodMaster() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    periodName: '',
    startTime: '',
    endTime: '',
    isBreak: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getPeriodMasters();
      setPeriods(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPeriodMaster(formData);
      setShowModal(false);
      setFormData({ periodName: '', startTime: '', endTime: '', isBreak: false });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating period');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this period?')) return;
    try {
      await deletePeriodMaster(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting period');
    }
  };

  return (
    <div className="animate-fade-in p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="text-blue-600" />
            Period Master
          </h1>
          <p className="text-gray-500">Define class periods, breaks, and lunch timings.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Period
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="loader"></div></div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-medium text-gray-600 text-sm">Period / Type</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Start Time</th>
                <th className="p-4 font-medium text-gray-600 text-sm">End Time</th>
                <th className="p-4 font-medium text-gray-600 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {periods.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <span className={`font-semibold px-2 py-1 rounded text-sm ${p.isBreak ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {p.periodName}
                    </span>
                  </td>
                  <td className="p-4 text-gray-700">{p.startTime}</td>
                  <td className="p-4 text-gray-700">{p.endTime}</td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(p._id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {periods.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">No periods defined. Add one above.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">Add New Period</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Name</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 1, 2, Break, Lunch"
                  value={formData.periodName}
                  onChange={e => setFormData({...formData, periodName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input 
                    type="time" 
                    required 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input 
                    type="time" 
                    required 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.endTime}
                    onChange={e => setFormData({...formData, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="isBreak"
                  checked={formData.isBreak}
                  onChange={e => setFormData({...formData, isBreak: e.target.checked})}
                />
                <label htmlFor="isBreak" className="text-sm text-gray-700 font-medium">This is a Break / Lunch period</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="btn-primary"><Save size={16} /> Save Period</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
