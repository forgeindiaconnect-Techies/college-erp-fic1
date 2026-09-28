import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, MoreVertical, Edit2, Trash2, Mail, Phone, Clock, AlertTriangle, CheckCircle, Bus, UserCheck, ShieldCheck, Users, X, Eye, EyeOff } from 'lucide-react';
import { getTransportDrivers, createTransportDriver, updateTransportDriver, deleteTransportDriver, getTransportVehicles, getTransportRoutes } from '../../api/index';
import '../transport/TransportManagement.css';

const EMPTY_FORM = { 
  name: '', email: '', password: '', phone: '', license: '', experience: '', status: 'Active'
};
const getInitials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
const AVATAR_COLORS = ['bg-gradient-blue', 'bg-gradient-purple', 'bg-gradient-orange', 'bg-gradient-green', 'bg-gradient-teal'];

const DriverManagement = () => {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [activeTab, setActiveTab] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [drRes, vehRes, routeRes] = await Promise.all([
        getTransportDrivers(),
        getTransportVehicles(),
        getTransportRoutes()
      ]);
      setDrivers(drRes.data || []);
      setVehicles(vehRes.data || []);
      setRoutes(routeRes.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      // fallback
      const local = localStorage.getItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
      setDrivers(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = drivers.filter(d => {
    const matchSearch = (d?.name || '').toLowerCase().includes(search.toLowerCase()) || ((d?.driverId || '').toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'All' || d?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openAdd = () => { 
    setForm(EMPTY_FORM); 
    setActiveTab(1);
    setModalOpen(true); 
  };
  const closeModal = () => { setModalOpen(false); setForm(EMPTY_FORM); };

  const handleEdit = (driver) => {
    setForm({
      _id: driver._id,
      driverId: driver.driverId,
      name: driver.name || '',
      email: driver.email || '',
      password: '',
      phone: driver.phone || '',
      license: driver.license || '',
      experience: driver.experience || '',
      status: driver.status || 'Active'
    });
    setActiveTab(1);
    setModalOpen(true);
  };

  const handleDelete = async (driver) => {
    if (!window.confirm(`Are you sure you want to remove ${driver.name || 'this driver'} and revoke access?`)) return;
    try {
      if (driver._id && !driver._id.startsWith('mock-') && driver._id.length > 10) {
        await deleteTransportDriver(driver._id);
      }
      setDrivers(prev => {
        const updated = prev.filter(d => (d._id !== driver._id && d.driverId !== driver.driverId));
        localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
        return updated;
      });
      showToast('Driver removed successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove driver', 'warning');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.license) return;

    try {
      if (form._id && !form._id.startsWith('mock-') && form._id.length > 10) {
        const res = await updateTransportDriver(form._id, form);
        const updatedDriver = res.data;
        setDrivers(prev => {
          const updated = prev.map(d => d._id === form._id ? { ...d, ...updatedDriver } : d);
          localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
          return updated;
        });
        showToast(`Successfully updated driver ${form.name}`);
      } else {
        const res = await createTransportDriver(form);
        const newDriver = res.data;
        setDrivers(prev => {
          const updated = [newDriver, ...prev.filter(d => d.email !== form.email && d.driverId !== newDriver.driverId)];
          localStorage.setItem(`erp_transport_drivers_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
          return updated;
        });
        showToast(`Successfully saved driver ${form.name} with login credentials`);
      }
      closeModal();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message;
      showToast(`Error: ${errorMessage}`, 'warning');
    }
  };

  return (
    <div className="tm-erp-container p-6 animate-fade-in min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><Bus size={32} /></div>
            Driver Management
          </h1>
          <p className="text-slate-500 mt-2 pl-14">Manage transport driver profiles and system credentials</p>
        </div>
        <div className="flex gap-4">
          <button className="tm-btn tm-btn-primary flex items-center gap-2" onClick={openAdd}>
            <Plus size={20} /> Add New Driver
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Total Drivers</p>
            <h3 className="text-4xl font-bold mt-2 text-slate-800">{drivers.length}</h3>
          </div>
          <div className="p-4 bg-primary/10 text-primary rounded-2xl"><Users size={32} /></div>
        </div>
        <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Active Drivers</p>
            <h3 className="text-4xl font-bold mt-2 text-success">
              {drivers.filter(d => d.status === 'Active').length}
            </h3>
          </div>
          <div className="p-4 bg-success/10 text-success rounded-2xl"><CheckCircle size={32} /></div>
        </div>
        <div className="glass-card bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center hover:-translate-y-1 transition-transform">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold">Inactive Drivers</p>
            <h3 className="text-4xl font-bold mt-2 text-danger">
              {drivers.filter(d => d.status !== 'Active').length}
            </h3>
          </div>
          <div className="p-4 bg-danger/10 text-danger rounded-2xl"><AlertTriangle size={32} /></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="search-bar relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="input-field w-full pl-12"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filters flex gap-3 w-full md:w-auto">
            <select 
              className="input-field flex-1 md:w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Driver Profile</th>
                  <th>Contact Info</th>
                  <th>Experience & License</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr key={d._id || d.id || i} className="hover:bg-slate-50/5">
                    <td>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                          {getInitials(d.name || 'Unknown')}
                        </div>
                        <div>
                          <p className="font-bold text-lg text-slate-800">{d.name}</p>
                          <p className="text-sm text-muted">ID: {d.driverId}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-sm text-muted">
                        {d.email && <span className="flex items-center gap-2"><Mail size={14} /> {d.email}</span>}
                        <span className="flex items-center gap-2"><Phone size={14} /> {d.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-sm">
                        <span className="font-semibold text-slate-800">{d.experience} Experience</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted">Lic: {d.license}</span>
                          {d.licenseExpiryDate && new Date(d.licenseExpiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                            <span className="badge badge-warning flex items-center gap-1 text-[10px] px-2 py-0.5" title="Expiring within 30 days">
                              <AlertTriangle size={10} /> Expiring
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                        {d.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="icon-btn tooltip-trigger" data-tooltip="Edit Details" onClick={() => handleEdit(d)}>
                          <Edit2 size={18} />
                        </button>
                        <button className="icon-btn text-danger tooltip-trigger" data-tooltip="Revoke Access" onClick={() => handleDelete(d)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-muted">
                      <div className="flex flex-col items-center">
                        <Bus size={48} className="opacity-20 mb-4" />
                        <p className="text-lg">No drivers found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {modalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '38rem',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                  {form._id ? 'Edit Driver Details' : 'Provision Driver'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                  {form._id ? 'Update driver profile and system credentials.' : 'Create driver profile and generate secure system credentials.'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={closeModal}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                  e.preventDefault();
                }
              }}
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Driver Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Login Email</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      placeholder="e.g. driver@college.edu"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      autoComplete="off"
                      data-lpignore="true"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '100%', position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        required
                        autoComplete="new-password"
                        data-lpignore="true"
                        style={{ width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Account Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>License Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TN-38-XXXX"
                    value={form.license}
                    onChange={(e) => setForm(prev => ({ ...prev, license: e.target.value }))}
                    required
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>Experience Level</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 Years"
                    value={form.experience}
                    onChange={(e) => setForm(prev => ({ ...prev, experience: e.target.value }))}
                    required
                    style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{ padding: '0.65rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.35rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3730a5, #4f46e5)', color: '#ffffff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(55, 48, 165, 0.25)' }}
                >
                  {form._id ? 'Save Changes' : 'Create Driver Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl text-white flex items-center gap-3 animate-fade-in z-50 ${toast.type === 'success' ? 'bg-success' : 'bg-warning'}`}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
