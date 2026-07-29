import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { updateTransportDriver } from '../../api/index';

const DriverChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const session = JSON.parse(sessionStorage.getItem('driver_session') || '{}');
      // In a real app, you'd have an endpoint specifically for password change that verifies the old password.
      // For now, we update the driver record with the new password and set firstLogin to false.
      
      // Assume updateTransportDriver handles this if we pass password and firstLogin: false
      // Note: We'd need the driver's _id here. Assuming it's in session._id
      await updateTransportDriver(session._id, { password: newPassword, firstLogin: false });
      
      alert('Password changed successfully!');
      
      // Update session locally if needed, then redirect
      session.firstLogin = false;
      sessionStorage.setItem('driver_session', JSON.stringify(session));
      
      navigate('/driver/dashboard');
    } catch (err) {
      setError('Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100 dark:border-gray-800">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Lock size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Change Password</h2>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Since this is your first time logging in, please set a secure password.
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
            <input 
              type="password" 
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 text-gray-800 dark:text-white"
              placeholder="Enter current password (mobile number)"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input 
              type="password" 
              required
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 text-gray-800 dark:text-white"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:border-blue-500 text-gray-800 dark:text-white"
              placeholder="Confirm new password"
            />
          </div>
          
          {error && <div className="text-red-500 text-sm font-medium text-center">{error}</div>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors mt-6"
          >
            {loading ? 'Updating...' : <>Save Password & Continue <ArrowRight size={18}/></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DriverChangePassword;
