import React, { useState, useEffect } from 'react';
import { CheckSquare, Wrench, ShieldCheck, Clock, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTransportMaintenance, updateTransportMaintenance, getTransportComplaints, updateTransportComplaint } from '../../api/index';

const StaffTasks = () => {
  const [loading, setLoading] = useState(true);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [complaintTasks, setComplaintTasks] = useState([]);
  const [staffInfo, setStaffInfo] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const session = JSON.parse(sessionStorage.getItem('staff_session') || '{}');
      setStaffInfo(session);

      const [maintRes, compRes] = await Promise.all([
        getTransportMaintenance().catch(() => ({ data: [] })),
        getTransportComplaints().catch(() => ({ data: [] }))
      ]);

      const myName = session.name;
      
      // Filter complaints assigned to this staff member
      const myComplaints = compRes.data.filter(c => c.assignedTo === myName || c.assignedTo === `${myName} (Staff)`);

      setMaintenanceTasks(maintRes.data || []);
      setComplaintTasks(myComplaints);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateMaintenance = async (id, status) => {
    try {
      await updateTransportMaintenance(id, { status });
      fetchData();
      alert(`Maintenance marked as ${status}`);
    } catch (err) {
      alert('Failed to update maintenance status');
    }
  };

  const handleUpdateComplaint = async (id, status) => {
    try {
      await updateTransportComplaint(id, { status });
      fetchData();
      alert(`Complaint marked as ${status}`);
    } catch (err) {
      alert('Failed to update complaint status');
    }
  };

  if (loading) return <div className="p-8">Loading tasks...</div>;

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <CheckSquare className="text-blue-600" /> My Tasks
          </h1>
          <p className="text-gray-500 dark:text-gray-400">View and complete tasks or vehicle issues assigned to you.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Complaints/Issues Tasks */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-gray-400" /> Assigned Issues & Complaints
            </h2>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
              {complaintTasks.filter(c => c.status !== 'Resolved').length} Pending
            </span>
          </div>
          <div className="p-6 space-y-4">
            {complaintTasks.length === 0 ? (
              <p className="text-gray-500 text-center">No complaints assigned to you.</p>
            ) : (
              complaintTasks.map(task => (
                <div key={task._id} className="border border-red-100 dark:border-red-900/30 rounded-xl p-4 bg-red-50/50 dark:bg-red-900/10">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg text-red-700 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle size={18} /> {task.complaintType || task.category || 'General Issue'}
                      </h3>
                      <p className="text-sm text-gray-500">Reported by: {task.name} ({task.reporterType})</p>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Vehicle: {task.busNumber}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      task.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-3 bg-white dark:bg-[#1e1e1e] rounded-lg border border-red-100 dark:border-red-900/30">"{task.description}"</p>
                  
                  <div className="mt-4">
                    <Link to={`/staff/tasks/${task._id}`} className="w-full py-3 flex justify-center items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-sm shadow-sm transition-colors">
                      View Details & Chat <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maintenance Tasks */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wrench className="text-gray-400" /> General Fleet Maintenance
            </h2>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
              {maintenanceTasks.filter(m => m.status !== 'Completed').length} Total
            </span>
          </div>
          <div className="p-6 space-y-4">
            {maintenanceTasks.length === 0 ? (
              <p className="text-gray-500 text-center">No maintenance tasks scheduled.</p>
            ) : (
              maintenanceTasks.map(task => (
                <div key={task._id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg dark:text-white">{task.serviceType}</h3>
                      <p className="text-sm font-bold text-blue-600">Vehicle: {task.vehicleNumber}</p>
                      <p className="text-sm text-gray-500">Scheduled: {task.serviceDate}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                      task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  {task.remarks && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-700 rounded border border-gray-100 dark:border-gray-600">"{task.remarks}"</p>}
                  
                  {task.status !== 'Completed' && (
                    <div className="mt-4 flex gap-2">
                      {task.status === 'Scheduled' && (
                        <button onClick={() => handleUpdateMaintenance(task._id, 'In Progress')} className="flex-1 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg font-bold text-sm transition-colors">
                          Start Service
                        </button>
                      )}
                      <button onClick={() => handleUpdateMaintenance(task._id, 'Completed')} className="flex-1 py-2 flex justify-center items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors">
                        <CheckCircle size={16} /> Mark Completed
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StaffTasks;
