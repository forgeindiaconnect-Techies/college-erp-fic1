import React, { useState } from 'react';
import {
  Building, DoorOpen, Users, UserCheck, Utensils, 
  CreditCard, AlertOctagon, UserPlus, Clock, FileText,
  Plus, Search, BedDouble, CheckCircle, AlertCircle, Phone, Download, LayoutDashboard, X
} from 'lucide-react';
import { getHostelBlocks, getHostelRooms, getHostelStudents, getHostelComplaints, updateHostelComplaint, getStudents, updateStudent } from '../../api/index';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import './HostelManagement.css';

const MOCK_VISITORS = [
  { id: 'V001', name: 'Ramesh Doe', relation: 'Father', student: 'John Doe', inTime: '10:00 AM', outTime: '12:00 PM', date: '2026-05-26' },
];

const MOCK_MESS_MENU = [
  { day: 'Monday', breakfast: 'Idli, Sambar', lunch: 'Rice, Dal, Paneer', dinner: 'Chapati, Mixed Veg' },
  { day: 'Tuesday', breakfast: 'Poha, Jalebi', lunch: 'Rice, Rajma', dinner: 'Chapati, Egg Curry / Dal' },
  { day: 'Wednesday', breakfast: 'Upma, Chutney', lunch: 'Rice, Sambar, Cabbage Sabzi', dinner: 'Chapati, Chicken Curry / Paneer Butter Masala' },
  { day: 'Thursday', breakfast: 'Dosa, Sambar', lunch: 'Veg Biryani, Raita', dinner: 'Chapati, Dal Tadka' },
  { day: 'Friday', breakfast: 'Puri, Aloo Curry', lunch: 'Rice, Rasam, Bhindi Fry', dinner: 'Chapati, Gobi Manchurian' },
  { day: 'Saturday', breakfast: 'Pongal, Vada', lunch: 'Lemon Rice, Potato Chips', dinner: 'Fried Rice, Veg Manchurian' },
  { day: 'Sunday', breakfast: 'Chole Bhature', lunch: 'Chicken Biryani / Veg Pulao', dinner: 'Chapati, Dal Makhani' }
];

const CHART_DATA = [
  { name: 'Occupied', value: 490, color: '#10b981' },
  { name: 'Available', value: 60, color: '#f59e0b' },
];

const HostelManagement = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [blocks, setBlocks] = useState(() => {
    const saved = localStorage.getItem('erp_hostel_blocks');
    return saved ? JSON.parse(saved) : [];
  });
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('erp_hostel_rooms');
    return saved ? JSON.parse(saved) : [];
  });
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wardens State
  const [wardens, setWardens] = useState(() => {
    const saved = localStorage.getItem('erp_wardens');
    return saved ? JSON.parse(saved) : [
      { id: 'W1', name: 'Mr. Ramesh Kumar', block: 'Block A', contact: '+91 9876543210', shift: 'Day Shift', status: 'Active' },
      { id: 'W2', name: 'Mrs. Sunita Verma', block: 'Block B', contact: '+91 9876543211', shift: 'Night Shift', status: 'Active' }
    ];
  });

  // Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocForm, setAllocForm] = useState({
    studentId: '',
    hostelName: '',
    blockWing: '',
    roomNumber: '',
    bedNumber: '',
    wardenName: '',
    wardenContact: '',
    hostelFeeAmount: '',
    hostelFeeStatus: 'pending'
  });

  // Visitor Log State
  const [visitors, setVisitors] = useState(() => {
    const saved = localStorage.getItem(`erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    return saved ? JSON.parse(saved) : MOCK_VISITORS;
  });
  const [showAddVisitorModal, setShowAddVisitorModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({ name: '', relation: '', student: '', inTime: '', outTime: '', date: new Date().toISOString().split('T')[0] });

  // Add Block State
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ name: '', warden: '', capacity: '' });

  // Add Room State
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({ roomId: '', block: '', type: '2-Sharing', capacity: '2' });

  // Add Warden State
  const [showAddWardenModal, setShowAddWardenModal] = useState(false);
  
  // Update Complaint State
  const [showUpdateComplaintModal, setShowUpdateComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintUpdateForm, setComplaintUpdateForm] = useState({ status: '', resolutionRemarks: '' });
  const [wardenForm, setWardenForm] = useState({ name: '', block: '', contact: '', shift: 'Day Shift' });
  const [selectedAttendanceBlock, setSelectedAttendanceBlock] = useState(null);

  // Mess Menu State
  const [messMenu, setMessMenu] = useState(() => {
    const saved = localStorage.getItem(`erp_mess_menu_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    return saved ? JSON.parse(saved) : MOCK_MESS_MENU;
  });
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [editMenuForm, setEditMenuForm] = useState(messMenu);

  // Gate Passes State
  const [gatePasses, setGatePasses] = useState(() => {
    const saved = localStorage.getItem(`erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
    return saved ? JSON.parse(saved) : [];
  });

  const handleEditMenuSubmit = (e) => {
    e.preventDefault();
    setMessMenu(editMenuForm);
    localStorage.setItem(`erp_mess_menu_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(editMenuForm));
    setShowEditMenuModal(false);
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocForm.studentId) return;
    
    try {
      const payload = {
        hostelRequired: 'yes',
        hostelName: allocForm.hostelName,
        blockWing: allocForm.blockWing,
        roomNumber: allocForm.roomNumber,
        bedNumber: allocForm.bedNumber,
        wardenName: allocForm.wardenName,
        wardenContact: allocForm.wardenContact,
        hostelFeeAmount: allocForm.hostelFeeAmount ? Number(allocForm.hostelFeeAmount) : 0,
        hostelFeeStatus: allocForm.hostelFeeStatus
      };
      
      await updateStudent(allocForm.studentId, payload);
      
      setShowAllocateModal(false);
      setAllocForm({ studentId:'', hostelName:'', blockWing:'', roomNumber:'', bedNumber:'', wardenName:'', wardenContact:'', hostelFeeAmount:'', hostelFeeStatus:'pending' });
      fetchHostelData();
    } catch (err) {
      console.error('Failed to allocate hostel', err);
      alert('Error allocating hostel. See console for details.');
    }
  };

  const handleAddBlock = (e) => {
    e.preventDefault();
    if (!blockForm.name || !blockForm.warden || !blockForm.capacity) return;
    const newBlock = {
      blockId: 'B' + (blocks.length + 1),
      name: blockForm.name,
      warden: blockForm.warden,
      capacity: Number(blockForm.capacity),
      occupied: 0
    };
    setBlocks(prev => {
      const updated = [...prev, newBlock];
      localStorage.setItem('erp_hostel_blocks', JSON.stringify(updated));
      return updated;
    });
    setShowAddBlockModal(false);
    setBlockForm({ name: '', warden: '', capacity: '' });
  };

  const handleAddRoom = (e) => {
    e.preventDefault();
    if (!roomForm.roomId || !roomForm.block) return;
    const newRoom = {
      roomId: roomForm.roomId,
      block: roomForm.block,
      type: roomForm.type,
      capacity: Number(roomForm.capacity),
      occupied: 0,
      status: 'Available'
    };
    setRooms(prev => {
      const updated = [...prev, newRoom];
      localStorage.setItem('erp_hostel_rooms', JSON.stringify(updated));
      return updated;
    });
    setShowAddRoomModal(false);
    setRoomForm({ roomId: '', block: '', type: '2-Sharing', capacity: '2' });
  };

  const handleAddWarden = (e) => {
    e.preventDefault();
    if (!wardenForm.name || !wardenForm.block || !wardenForm.contact) return;
    
    const newWarden = {
      id: 'W' + (wardens.length + 1),
      name: wardenForm.name,
      block: wardenForm.block,
      contact: wardenForm.contact,
      shift: wardenForm.shift,
      status: 'Active'
    };
    
    setWardens(prev => {
      const updated = [...prev, newWarden];
      localStorage.setItem('erp_wardens', JSON.stringify(updated));
      return updated;
    });
    alert(`Successfully added ${wardenForm.name} as Warden for ${wardenForm.block}`);
    setShowAddWardenModal(false);
    setWardenForm({ name: '', block: '', contact: '', shift: 'Day Shift' });
  };

  const handleUpdateComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    try {
      const updatedData = {
        status: complaintUpdateForm.status,
        resolutionRemarks: complaintUpdateForm.resolutionRemarks
      };
      
      const res = await updateHostelComplaint(selectedComplaint._id || selectedComplaint.complaintId, updatedData);
      
      if (res.data) {
        setComplaints(prev => prev.map(comp => 
          (comp._id === selectedComplaint._id || comp.complaintId === selectedComplaint.complaintId) 
            ? { ...comp, ...updatedData, closedDate: (updatedData.status === 'Resolved' || updatedData.status === 'Rejected') ? new Date() : comp.closedDate } 
            : comp
        ));
      }
      
      alert(`Complaint ${selectedComplaint.complaintId} status updated successfully.`);
      setShowUpdateComplaintModal(false);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Failed to update complaint", error);
      alert('Error updating complaint. Please try again.');
    }
  };

  const handleAddVisitor = (e) => {
    e.preventDefault();
    
    // Format the time input to AM/PM string
    const timeValue = visitorForm.inTime;
    let formattedTime = timeValue;
    if (timeValue) {
      const [hours, minutes] = timeValue.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 || 12;
      formattedTime = `${formattedH}:${minutes} ${ampm}`;
    }

    const newVisitor = {
      id: 'V' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      name: visitorForm.name,
      relation: visitorForm.relation,
      student: visitorForm.student,
      inTime: formattedTime,
      outTime: '--',
      date: visitorForm.date
    };
    
    setVisitors(prev => {
      const updated = [newVisitor, ...prev];
      localStorage.setItem(`erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });
    
    setShowAddVisitorModal(false);
    setVisitorForm({ name: '', relation: '', student: '', inTime: '', outTime: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleMarkOut = (id) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setVisitors(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, outTime: timeNow } : v);
      localStorage.setItem(`erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateGatePass = (id, newStatus) => {
    setGatePasses(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, status: newStatus } : p);
      localStorage.setItem(`erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`, JSON.stringify(updated));
      return updated;
    });
    // Trigger storage event so other tabs sync
    window.dispatchEvent(new Event('storage'));
  };

  React.useEffect(() => {
    fetchHostelData();

    // Listen for changes from the HOD tab or Student tab
    const handleStorage = (e) => {
      if (e?.key === `erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) fetchHostelData();
      if (e?.key === `erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}` || !e?.key) {
        const saved = localStorage.getItem(`erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`);
        if (saved) setGatePasses(JSON.parse(saved));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const fetchHostelData = async () => {
    try {
      setLoading(true);
      const [blocksRes, roomsRes, studentsRes, complaintsRes, allStudentsRes] = await Promise.all([
        getHostelBlocks().catch(() => ({ data: [] })),
        getHostelRooms().catch(() => ({ data: [] })),
        getHostelStudents().catch(() => ({ data: [] })),
        getHostelComplaints().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] }))
      ]);
      const fetchedBlocks = blocksRes?.data || [];
      const fetchedRooms = roomsRes?.data || [];
      
      setBlocks(fetchedBlocks.length > 0 ? fetchedBlocks : [
        { blockId: 'B1', name: 'Boys Hostel A', warden: 'Mr. Kumar', capacity: 200, occupied: 150 },
        { blockId: 'B2', name: 'Girls Hostel A', warden: 'Mrs. Sharma', capacity: 150, occupied: 120 }
      ]);
      setRooms(fetchedRooms.length > 0 ? fetchedRooms : [
        { roomId: 'A-101', block: 'Boys Hostel A', type: '2-Sharing', capacity: 2, occupied: 2, status: 'Occupied' },
        { roomId: 'A-102', block: 'Boys Hostel A', type: '2-Sharing', capacity: 2, occupied: 1, status: 'Available' },
        { roomId: 'A-103', block: 'Girls Hostel A', type: '3-Sharing', capacity: 3, occupied: 0, status: 'Available' }
      ]);
      setAllStudents(allStudentsRes?.data || []);
      
      const adminHostelers = (allStudentsRes?.data || [])
        .filter(s => s.hostelRequired === 'Yes')
        .map(s => ({
            studentId: s.id,
            name: s.name,
            block: 'Pending Allocation',
            room: s.roomNumber || 'Unassigned'
        }));

      // Pull hostel students created locally via HOD portal
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      const localHostelers = erpStudents
        .filter(s => s.hostelerStatus === 'Hosteler' || s.hostelRequired === 'Yes')
        .map(s => ({
            studentId: s.rollNo || s.id,
            name: s.name,
            block: 'Pending Allocation',
            room: s.roomNumber || 'Unassigned'
        }));

      const backendHostelers = studentsRes?.data || [];
      const combinedHostelers = [...backendHostelers];
      
      [...adminHostelers, ...localHostelers].forEach(lh => {
        if (!combinedHostelers.find(ch => ch.studentId === lh.studentId)) {
          combinedHostelers.push(lh);
        }
      });

      setStudents(combinedHostelers);
      setComplaints(complaintsRes?.data || []);
    } catch (error) {
      console.error('Failed to load hostel data', error);
      // Fallback
      setBlocks([]);
      setRooms([]);
      
      const erpStudents = JSON.parse(localStorage.getItem(`erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
      setStudents(erpStudents
        .filter(s => s.hostelerStatus === 'Hosteler' || s.hostelRequired === 'Yes')
        .map(s => ({ studentId: s.rollNo || s.id, name: s.name, block: 'Pending Allocation', room: s.roomNumber || 'Unassigned' }))
      );
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCapacity = blocks.reduce((acc, curr) => acc + curr.capacity, 0);
  const totalOccupied = blocks.reduce((acc, curr) => acc + curr.occupied, 0);
  const totalAvailable = totalCapacity - totalOccupied;

  const dynamicChartData = [
    { name: 'Occupied', value: totalOccupied || 1, color: '#10b981' },
    { name: 'Available', value: totalAvailable || 1, color: '#f59e0b' },
  ];

  const pendingRequests = allStudents.filter(s => s.hostelRequired?.toLowerCase() === 'yes' && !s.roomNumber);
  const allocatedStudents = allStudents.filter(s => s.hostelRequired?.toLowerCase() === 'yes' && s.roomNumber);

  const TABS = [
    { name: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { name: 'Hostel Requests', icon: <AlertCircle size={16} /> },
    { name: 'Student Allocation', icon: <Users size={16} /> },
    { name: 'Gate Passes', icon: <CheckCircle size={16} /> },
    { name: 'Hostel Blocks', icon: <Building size={16} /> },
    { name: 'Rooms', icon: <DoorOpen size={16} /> },
    { name: 'Wardens', icon: <UserCheck size={16} /> },
    { name: 'Mess Menu', icon: <Utensils size={16} /> },
    { name: 'Hostel Fees', icon: <CreditCard size={16} /> },
    { name: 'Complaints', icon: <AlertOctagon size={16} /> },
    { name: 'Visitors', icon: <UserPlus size={16} /> },
    { name: 'Attendance', icon: <Clock size={16} /> },
    { name: 'Reports', icon: <FileText size={16} /> }
  ];

  return (
    <div className="hostel-page animate-fade-in">
      <div className="hostel-header">
        <h1><Building size={32} className="text-primary" /> Advanced Hostel Management</h1>
        <p className="text-muted mt-2">Manage college accommodations, mess operations, wardens, and daily hostel logistics.</p>
      </div>

      <div className="hostel-tabs">
        {TABS.map(tab => (
          <button
            key={tab.name}
            className={`hostel-tab ${activeTab === tab.name ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.name)}
          >
            {tab.icon} {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'Dashboard' && (
        <div className="animate-fade-in">
          <div className="hostel-grid">
            <div className="glass-card p-5 relative overflow-hidden">
              <AlertCircle size={24} className="text-warning mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Pending Requests</h3>
              <p className="text-2xl font-bold mt-1 text-warning">{pendingRequests.length}</p>
            </div>
            <div className="glass-card p-5 relative overflow-hidden">
              <Users size={24} className="text-primary mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Allocated Students</h3>
              <p className="text-2xl font-bold mt-1">{allocatedStudents.length}</p>
            </div>
            <div className="glass-card p-5 relative overflow-hidden">
              <BedDouble size={24} className="text-green-500 mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Available Rooms</h3>
              <p className="text-2xl font-bold mt-1 text-success">{totalAvailable}</p>
            </div>
            <div className="glass-card p-5 relative overflow-hidden">
              <DoorOpen size={24} className="text-blue-500 mb-2"/>
              <h3 className="text-sm text-muted uppercase font-bold">Occupied Rooms</h3>
              <p className="text-2xl font-bold mt-1">{totalOccupied}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Overall Capacity Status</h2>
              <div className="flex items-center justify-center h-64">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={dynamicChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {dynamicChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{background:'var(--bg-secondary)', border:'none', borderRadius:'8px'}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {dynamicChartData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{background: d.color}}></span>
                    <span className="text-sm font-bold">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Recent Complaints</h2>
                <button className="text-xs text-primary font-bold">View All</button>
              </div>
              <div className="space-y-4">
                {complaints.slice(0, 3).map(comp => (
                  <div key={comp.complaintId} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{comp.issue}</p>
                      <p className="text-xs text-muted">Room {comp.room} • {comp.student} • {new Date(comp.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${comp.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {comp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Hostel Blocks' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Manage Blocks</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddBlockModal(true)}><Plus size={16}/> Add Block</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blocks.map(block => (
              <div key={block.blockId} className="glass-card p-6 border-t-4 border-primary">
                <h3 className="font-bold text-lg mb-2">{block.name}</h3>
                <p className="text-sm text-muted mb-4 flex items-center gap-2"><UserCheck size={14}/> Warden: {block.warden}</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-muted">Occupancy</span>
                  <span className="text-xs font-bold">{block.occupied} / {block.capacity}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{width: `${(block.occupied/block.capacity)*100}%`}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Rooms' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search room number..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddRoomModal(true)}><Plus size={16}/> Add Room</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rooms.filter(r => r.roomId.includes(search)).map(room => (
              <div key={room.roomId} className="glass-card room-card">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl">{room.roomId}</h3>
                    <p className="text-xs text-muted">{room.block}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${room.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                    {room.status}
                  </span>
                </div>
                <div className="mt-2 text-sm">
                  <p>Type: <strong>{room.type}</strong></p>
                  <p>Occupied: <strong>{room.occupied}/{room.capacity}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Hostel Requests' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Pending Hostel Requests</h2>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search requests..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register No</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Request Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase())).map(st => (
                  <tr key={st.id}>
                    <td className="font-medium">{st.name}</td>
                    <td className="font-mono text-sm">{st.id}</td>
                    <td>{st.dept}</td>
                    <td>{st.sem}</td>
                    <td><span className="bg-warning-light text-warning px-2 py-1 rounded text-xs font-bold" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>Pending</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-primary text-xs py-1 px-3" onClick={() => { setAllocForm({...allocForm, studentId: st.id}); setShowAllocateModal(true); }}>Approve</button>
                        <button className="btn-secondary text-xs py-1 px-3 text-danger hover:bg-red-50">Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted p-8">No pending hostel requests.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Student Allocation' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Allocated Students</h2>
            <div className="flex gap-4 items-center">
              <div className="search-box">
                <Search size={16} className="text-muted"/>
                <input type="text" placeholder="Search allocated..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowAllocateModal(true)}>
                <Plus size={16}/> Allocate Room
              </button>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Room No</th>
                  <th>Bed No</th>
                  <th>Hostel Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocatedStudents.filter(s => 
                   s.name.toLowerCase().includes(search.toLowerCase()) || 
                   s.id.toLowerCase().includes(search.toLowerCase()) || 
                   (s.roomNumber || '').toLowerCase().includes(search.toLowerCase()) || 
                   (s.dept || '').toLowerCase().includes(search.toLowerCase())
                ).map(st => (
                  <tr key={st.id}>
                    <td>
                      <div className="font-medium">{st.name}</div>
                      <div className="text-xs text-muted font-mono">{st.id}</div>
                    </td>
                    <td>{st.dept}</td>
                    <td><span className="bg-primary-light text-primary px-2 py-1 rounded text-xs font-bold">{st.roomNumber}</span></td>
                    <td>{st.bedNumber || 'N/A'}</td>
                    <td><span className="bg-success-light text-success px-2 py-1 rounded text-xs font-bold" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Allocated</span></td>
                    <td>
                      <button className="btn-secondary text-xs py-1 px-3">Transfer</button>
                    </td>
                  </tr>
                ))}
                {allocatedStudents.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted p-8">No students have been allocated a room yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Gate Passes' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Student Gate Passes</h2>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search passes..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Room</th>
                  <th>Pass Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gatePasses.filter(p => p.studentName?.toLowerCase().includes(search.toLowerCase()) || p.studentId?.toLowerCase().includes(search.toLowerCase())).map(pass => (
                  <tr key={pass.id}>
                    <td>
                      <div className="font-medium">{pass.studentName}</div>
                      <div className="text-xs text-muted font-mono">{pass.studentId}</div>
                    </td>
                    <td className="font-bold text-primary">{pass.room || 'N/A'}</td>
                    <td>{pass.type}</td>
                    <td className="font-medium text-sm">{pass.dates}</td>
                    <td className="text-sm max-w-[200px] truncate" title={pass.reason}>{pass.reason}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        pass.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        pass.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {pass.status}
                      </span>
                    </td>
                    <td>
                      {pass.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <button className="btn-primary text-xs py-1 px-3" onClick={() => handleUpdateGatePass(pass.id, 'Approved')}>Approve</button>
                          <button className="btn-secondary text-xs py-1 px-3 text-danger hover:bg-red-50" onClick={() => handleUpdateGatePass(pass.id, 'Rejected')}>Reject</button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {gatePasses.length === 0 && (
                  <tr><td colSpan="7" className="text-center text-muted p-8">No gate passes have been requested yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Mess Menu' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-[#3730A5]">
              Weekly Mess Menu
            </h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => { setEditMenuForm([...messMenu]); setShowEditMenuModal(true); }}>Edit Menu</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {messMenu.map((menu, idx) => {
              const isToday = menu.day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
              return (
                <div key={idx} className={`bg-white dark:bg-gray-900 rounded-xl p-5 border ${isToday ? 'border-[#3730A5] shadow-md shadow-[#3730A5]/10' : 'border-gray-200 dark:border-gray-800'} transition-transform hover:-translate-y-1`}>
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="font-bold text-lg text-[#3730A5]">{menu.day}</h3>
                    {isToday && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EEEDFE', color: '#3730A5' }}>Today</span>
                    )}
                    {menu.day === 'Sunday' && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}>Sunday Special</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="w-fit px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#FAEEDA', color: '#D97706' }}>Breakfast</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 pl-1">{menu.breakfast}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="w-fit px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}>Lunch</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 pl-1">{menu.lunch}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="w-fit px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: '#EEEDFE', color: '#3730A5' }}>Dinner</span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 pl-1">{menu.dinner}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'Wardens' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Hostel Wardens</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddWardenModal(true)}><Plus size={16}/> Add Warden</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Block Assigned</th>
                  <th>Contact No</th>
                  <th>Shift</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {wardens.map(warden => (
                  <tr key={warden.id}>
                    <td className="font-medium">{warden.name}</td>
                    <td>{warden.block}</td>
                    <td>{warden.contact}</td>
                    <td>{warden.shift}</td>
                    <td><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">{warden.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Hostel Fees' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Fee Defaulters</h2>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search student..." />
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Student Name</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocatedStudents.map(st => {
                  const totalFee = st.hostelFeeAmount || 80000;
                  const isPaid = st.hostelFeeStatus === 'paid';
                  const paidAmount = isPaid ? totalFee : 0;
                  const dueAmount = isPaid ? 0 : totalFee;
                  
                  return (
                    <tr key={st.id}>
                      <td className="font-mono text-sm">{st.id}</td>
                      <td className="font-medium">{st.name}</td>
                      <td>₹ {totalFee.toLocaleString()}</td>
                      <td>₹ {paidAmount.toLocaleString()}</td>
                      <td className={isPaid ? "text-success font-bold" : "text-danger font-bold"}>
                        ₹ {dueAmount.toLocaleString()}
                      </td>
                      <td>
                        {isPaid ? (
                          <button className="btn-secondary text-xs py-1 px-2">View Receipt</button>
                        ) : (
                          <button 
                            className="btn-secondary text-xs py-1 px-2"
                            onClick={() => alert(`A fee reminder has been sent to ${st.name} (${st.id}) via Email and SMS.`)}
                          >
                            Send Reminder
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {allocatedStudents.length === 0 && (
                  <tr><td colSpan="6" className="text-center text-muted p-8">No allocated students to display fees for.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Complaints' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Maintenance Complaints</h2>
            <button className="btn-primary flex items-center gap-2"><Plus size={16}/> Log Complaint</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Room</th>
                  <th>Issue Details</th>
                  <th>Logged By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(comp => (
                  <tr key={comp.complaintId || comp._id}>
                    <td className="font-mono text-xs">{comp.complaintId}</td>
                    <td className="font-bold">
                      {comp.room && comp.room !== 'Not Assigned' ? comp.room : (() => {
                        const s = allStudents.find(student => student.id === comp.studentId || student.rollNo === comp.studentId);
                        return s?.roomNumber ? `${s.blockWing || ''}-${s.roomNumber}` : 'Unassigned';
                      })()}
                    </td>
                    <td>
                      <div className="font-bold">{comp.category || 'General'}</div>
                      <div className="text-xs text-muted truncate max-w-[200px]" title={comp.description || comp.issue}>{comp.description || comp.issue}</div>
                      {comp.priority && (
                        <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${comp.priority === 'High' ? 'bg-red-100 text-red-700' : comp.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {comp.priority}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="font-medium">{comp.studentName || comp.student}</div>
                      <div className="text-xs text-muted">{comp.studentId}</div>
                    </td>
                    <td>{new Date(comp.date || comp.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${comp.status === 'Resolved' ? 'bg-green-100 text-green-700' : comp.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : comp.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {comp.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-secondary text-xs py-1 px-3" 
                        onClick={() => {
                          setSelectedComplaint(comp);
                          setComplaintUpdateForm({ status: comp.status, resolutionRemarks: comp.resolutionRemarks || '' });
                          setShowUpdateComplaintModal(true);
                        }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
                {complaints.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted p-8">
                      No maintenance complaints have been logged yet. Students can log complaints from their portal, or you can log one manually.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Visitors' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Visitor Log</h2>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddVisitorModal(true)}><Plus size={16}/> New Entry</button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Visitor Name</th>
                  <th>Relation</th>
                  <th>Student Name</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map(vis => (
                  <tr key={vis.id}>
                    <td>{vis.date}</td>
                    <td className="font-medium">{vis.name}</td>
                    <td>{vis.relation}</td>
                    <td>{vis.student}</td>
                    <td className="font-mono">{vis.inTime}</td>
                    <td className="font-mono">
                      {vis.outTime === '--' ? (
                        <span className="text-warning font-bold">Inside</span>
                      ) : (
                        <span className="text-muted">{vis.outTime}</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted p-8">No visitor records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Attendance' && (
        <div className="animate-fade-in glass-card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h2 className="font-bold">Night Attendance</h2>
            <input type="date" className="border border-gray-300 dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Block</th>
                  <th>Total Students</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>On Leave</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map(block => {
                  const allAttendances = JSON.parse(localStorage.getItem(`erp_hostel_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
                  const todayStr = new Date().toISOString().split('T')[0];
                  
                  // Find if any students from this block manually marked attendance today
                  let manualPresentCount = allAttendances.filter(a => {
                    const blockA = (a.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const blockB = (block.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    return (blockA === blockB || blockB.includes(blockA) || blockA.includes(blockB.replace('boyshostel', '')) || blockA.includes(blockB.replace('girlshostel', ''))) && a.date === todayStr;
                  }).length;
                  
                  if (manualPresentCount === 0) {
                    manualPresentCount = allAttendances.filter(a => a.date === todayStr).length;
                  }
                  
                  // For demo visual feedback: start with base mock (occupied - 2) and add the manual check-ins
                  const displayPresent = Math.min(block.occupied, Math.max(0, block.occupied - 2) + manualPresentCount);
                  const displayLeave = 1;
                  const displayAbsent = Math.max(0, block.occupied - displayPresent - displayLeave);

                  return (
                    <tr key={block.blockId}>
                      <td className="font-bold">{block.name}</td>
                      <td>{block.occupied}</td>
                      <td className="text-success font-bold">{displayPresent}</td>
                      <td className="text-danger font-bold">{displayAbsent}</td>
                      <td className="text-blue-500 font-bold">{displayLeave}</td>
                      <td><button className="btn-secondary text-xs py-1 px-2" onClick={() => setSelectedAttendanceBlock(block)}>View Details</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Reports' && (
        <div className="animate-fade-in glass-card p-12 flex flex-col items-center text-center">
          <FileText size={48} className="text-muted opacity-50 mb-4"/>
          <h2 className="text-xl font-bold mb-2">Hostel Reports</h2>
          <p className="text-muted max-w-md mb-6">Export room occupancy, mess attendance, and fee defaulters data to Excel/PDF.</p>
          <div className="flex gap-4">
            <button className="btn-primary flex items-center gap-2"><Download size={16}/> Occupancy Report</button>
          </div>
        </div>
      )}

      {showAllocateModal && (
        <div className="modal-overlay" onClick={() => setShowAllocateModal(false)} style={{ alignItems: 'flex-start', paddingTop: '5vh', paddingBottom: '5vh', overflowY: 'auto' }}>
          <div className="modal-box glass-card" style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd" style={{ flexShrink: 0 }}>
              <div>
                <h2>Allocate Hostel Room</h2>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '2px'}}>Assign a student to a hostel room and log fee status</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAllocateModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAllocateSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Select Student <span className="req">*</span></label>
                    <select 
                      required
                      value={allocForm.studentId}
                      onChange={e => setAllocForm({...allocForm, studentId: e.target.value})}
                    >
                      <option value="">-- Select Non-Hosteller Student --</option>
                      {allStudents.filter(s => s.hostelRequired !== 'yes').map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="fld">
                    <label>Hostel Name <span className="req">*</span></label>
                    <input required type="text" value={allocForm.hostelName} onChange={e => setAllocForm({...allocForm, hostelName: e.target.value})} placeholder="e.g. Boys Hostel A" />
                  </div>
                  <div className="fld">
                    <label>Block / Wing <span className="req">*</span></label>
                    <input required type="text" value={allocForm.blockWing} onChange={e => setAllocForm({...allocForm, blockWing: e.target.value})} placeholder="e.g. North Wing" />
                  </div>
                  
                  <div className="fld">
                    <label>Room Number <span className="req">*</span></label>
                    <input required type="text" value={allocForm.roomNumber} onChange={e => setAllocForm({...allocForm, roomNumber: e.target.value})} placeholder="e.g. A-204" />
                  </div>
                  <div className="fld">
                    <label>Bed Number <span className="req">*</span></label>
                    <input required type="text" value={allocForm.bedNumber} onChange={e => setAllocForm({...allocForm, bedNumber: e.target.value})} placeholder="e.g. 2" />
                  </div>

                  <div className="fld">
                    <label>Warden Name <span className="req">*</span></label>
                    <input required type="text" value={allocForm.wardenName} onChange={e => setAllocForm({...allocForm, wardenName: e.target.value})} placeholder="e.g. Mr. Kumar" />
                  </div>
                  <div className="fld">
                    <label>Warden Contact</label>
                    <input type="text" value={allocForm.wardenContact} onChange={e => setAllocForm({...allocForm, wardenContact: e.target.value})} placeholder="Phone Number" />
                  </div>

                  <div className="fld">
                    <label>Hostel Fee Amount (₹) <span className="req">*</span></label>
                    <input required type="number" value={allocForm.hostelFeeAmount} onChange={e => setAllocForm({...allocForm, hostelFeeAmount: e.target.value})} placeholder="e.g. 45000" />
                  </div>
                  <div className="fld">
                    <label>Fee Status <span className="req">*</span></label>
                    <select required value={allocForm.hostelFeeStatus} onChange={e => setAllocForm({...allocForm, hostelFeeStatus: e.target.value})}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-ft" style={{ flexShrink: 0 }}>
                <button type="button" onClick={() => setShowAllocateModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BLOCK MODAL */}
      {showAddBlockModal && (
        <div className="modal-overlay" onClick={() => setShowAddBlockModal(false)} style={{ alignItems: 'flex-start', paddingTop: '5vh', paddingBottom: '5vh', overflowY: 'auto' }}>
          <div className="modal-box glass-card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd" style={{ flexShrink: 0 }}>
              <div>
                <h2>Add New Hostel Block</h2>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '2px'}}>Register a new hostel building or block.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddBlockModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddBlock} noValidate style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Block Name <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. Boys Hostel A" required 
                           value={blockForm.name} onChange={e => setBlockForm({...blockForm, name: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Warden Name <span className="req">*</span></label>
                    <select required value={blockForm.warden} onChange={e => setBlockForm({...blockForm, warden: e.target.value})}>
                      <option value="">— Select Warden —</option>
                      {wardens.map(w => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Total Capacity <span className="req">*</span></label>
                    <input type="number" placeholder="e.g. 200" required min="1"
                           value={blockForm.capacity} onChange={e => setBlockForm({...blockForm, capacity: e.target.value})} />
                  </div>
                </div>
              </div>
              
              <div className="modal-ft" style={{ flexShrink: 0 }}>
                <button type="button" onClick={() => setShowAddBlockModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Add Block</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showAddRoomModal && (
        <div className="modal-overlay" onClick={() => setShowAddRoomModal(false)} style={{ alignItems: 'flex-start', paddingTop: '5vh', paddingBottom: '5vh', overflowY: 'auto' }}>
          <div className="modal-box glass-card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd" style={{ flexShrink: 0 }}>
              <div>
                <h2>Add New Room</h2>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '2px'}}>Create a new room in an existing block.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddRoomModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddRoom} noValidate style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Room Number <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. A-102" required 
                           value={roomForm.roomId} onChange={e => setRoomForm({...roomForm, roomId: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Hostel Block <span className="req">*</span></label>
                    <select required value={roomForm.block} onChange={e => setRoomForm({...roomForm, block: e.target.value})}>
                      <option value="">— Select Block —</option>
                      {blocks.map(b => (
                        <option key={b.blockId} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Room Type</label>
                    <select value={roomForm.type} onChange={e => setRoomForm({...roomForm, type: e.target.value, capacity: e.target.value.split('-')[0] || '1'})}>
                      <option value="1-Sharing">1-Sharing</option>
                      <option value="2-Sharing">2-Sharing</option>
                      <option value="3-Sharing">3-Sharing</option>
                      <option value="4-Sharing">4-Sharing</option>
                    </select>
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Capacity</label>
                    <input type="number" readOnly value={roomForm.capacity} style={{opacity: 0.7, cursor: 'not-allowed'}} />
                  </div>
                </div>
              </div>
              
              <div className="modal-ft" style={{ flexShrink: 0 }}>
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD WARDEN MODAL */}
      {showAddWardenModal && (
        <div className="modal-overlay" onClick={() => setShowAddWardenModal(false)} style={{ alignItems: 'flex-start', paddingTop: '5vh', paddingBottom: '5vh', overflowY: 'auto' }}>
          <div className="modal-box glass-card" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd" style={{ flexShrink: 0 }}>
              <div>
                <h2>Add New Warden</h2>
                <p className="text-muted" style={{fontSize: '0.85rem', marginTop: '2px'}}>Assign a warden to supervise a block.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddWardenModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddWarden} noValidate style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
              <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Warden Name <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. Mrs. Sunita Verma" required 
                           value={wardenForm.name} onChange={e => setWardenForm({...wardenForm, name: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Assign to Block <span className="req">*</span></label>
                    <select required value={wardenForm.block} onChange={e => setWardenForm({...wardenForm, block: e.target.value})}>
                      <option value="">— Select Block —</option>
                      {blocks.map(b => (
                        <option key={b.blockId} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Contact Number <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. +91 9876543210" required 
                           value={wardenForm.contact} onChange={e => setWardenForm({...wardenForm, contact: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Duty Shift <span className="req">*</span></label>
                    <select required value={wardenForm.shift} onChange={e => setWardenForm({...wardenForm, shift: e.target.value})}>
                      <option value="Day Shift">Day Shift (8 AM - 8 PM)</option>
                      <option value="Night Shift">Night Shift (8 PM - 8 AM)</option>
                      <option value="Rotating Shift">Rotating Shift</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="modal-ft" style={{ flexShrink: 0 }}>
                <button type="button" onClick={() => setShowAddWardenModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Add Warden</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MENU MODAL */}
      {showEditMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowEditMenuModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold">Edit Mess Menu</h3>
                <p className="text-sm text-muted">Update the weekly food menu for the hostel mess.</p>
              </div>
              <button className="text-muted hover:text-danger" onClick={() => setShowEditMenuModal(false)}><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="edit-menu-form" onSubmit={handleEditMenuSubmit} className="space-y-6">
                {editMenuForm.map((dayMenu, index) => (
                  <div key={dayMenu.day} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                    <h4 className="font-bold text-primary mb-3">{dayMenu.day}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-muted uppercase">Breakfast</label>
                        <input type="text" className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" required 
                               value={dayMenu.breakfast} onChange={e => {
                                 const newForm = [...editMenuForm];
                                 newForm[index] = {...newForm[index], breakfast: e.target.value};
                                 setEditMenuForm(newForm);
                               }} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-muted uppercase">Lunch</label>
                        <input type="text" className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" required 
                               value={dayMenu.lunch} onChange={e => {
                                 const newForm = [...editMenuForm];
                                 newForm[index] = {...newForm[index], lunch: e.target.value};
                                 setEditMenuForm(newForm);
                               }} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-muted uppercase">Dinner</label>
                        <input type="text" className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" required 
                               value={dayMenu.dinner} onChange={e => {
                                 const newForm = [...editMenuForm];
                                 newForm[index] = {...newForm[index], dinner: e.target.value};
                                 setEditMenuForm(newForm);
                               }} />
                      </div>
                    </div>
                  </div>
                ))}
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowEditMenuModal(false)} className="btn-ghost">Cancel</button>
              <button type="submit" form="edit-menu-form" className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE COMPLAINT MODAL */}
      {showUpdateComplaintModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowUpdateComplaintModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">Update Complaint Status</h3>
                <p className="text-sm text-muted">Ticket: {selectedComplaint.complaintId}</p>
              </div>
              <button className="text-muted hover:text-danger" onClick={() => setShowUpdateComplaintModal(false)}><X size={20}/></button>
            </div>
            
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-sm font-bold text-primary mb-1">{selectedComplaint.category || 'General Issue'}</p>
              <p className="text-sm text-muted mb-2">{selectedComplaint.description || selectedComplaint.issue}</p>
              <p className="text-xs font-medium">From: {selectedComplaint.studentName || selectedComplaint.student} ({selectedComplaint.room})</p>
            </div>
            
            <form onSubmit={handleUpdateComplaint} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Current Status</label>
                <select 
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary"
                  value={complaintUpdateForm.status}
                  onChange={(e) => setComplaintUpdateForm({...complaintUpdateForm, status: e.target.value})}
                  required
                >
                  <option value="Pending Review">Pending Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Resolution Remarks (Optional)</label>
                <textarea 
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary min-h-[100px] resize-none"
                  placeholder="Enter remarks for the student..."
                  value={complaintUpdateForm.resolutionRemarks}
                  onChange={(e) => setComplaintUpdateForm({...complaintUpdateForm, resolutionRemarks: e.target.value})}
                ></textarea>
              </div>
              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setShowUpdateComplaintModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Update Status</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VISITOR MODAL */}
      {showAddVisitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddVisitorModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">New Visitor Entry</h3>
                <p className="text-sm text-muted">Log a new visitor for a hostel student</p>
              </div>
              <button className="text-muted hover:text-danger" onClick={() => setShowAddVisitorModal(false)}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddVisitor} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Visitor Name</label>
                <input type="text" className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary" required value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} placeholder="e.g. Ramesh Doe" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Relation</label>
                <input type="text" className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary" required value={visitorForm.relation} onChange={e => setVisitorForm({...visitorForm, relation: e.target.value})} placeholder="e.g. Father, Mother, Brother" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold">Student Name</label>
                <input type="text" className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary" required value={visitorForm.student} onChange={e => setVisitorForm({...visitorForm, student: e.target.value})} placeholder="Student being visited" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold">Date</label>
                  <input type="date" className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary" required value={visitorForm.date} onChange={e => setVisitorForm({...visitorForm, date: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold">In Time</label>
                  <input type="time" className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 outline-none focus:border-primary" required value={visitorForm.inTime} onChange={e => setVisitorForm({...visitorForm, inTime: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={() => setShowAddVisitorModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Add Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ATTENDANCE DETAILS MODAL */}
      {selectedAttendanceBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedAttendanceBlock(null)}>
          <div className="rounded-2xl w-full max-w-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--bg-secondary, white)', border: '1px solid var(--border-color, #e5e7eb)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold">Attendance: {selectedAttendanceBlock.name}</h3>
                <p className="text-sm text-muted">Today's Check-ins ({new Date().toLocaleDateString()})</p>
              </div>
              <button className="text-muted hover:text-danger" onClick={() => setSelectedAttendanceBlock(null)}><X size={20}/></button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">Student Name</th>
                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">Student ID</th>
                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">Block</th>
                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">Time</th>
                    <th className="p-3 border-b border-gray-200 dark:border-gray-700 font-bold text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const allAttendances = JSON.parse(localStorage.getItem(`erp_hostel_attendance_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`) || '[]');
                    const presentStudents = allAttendances.filter(a => {
                      if (a.date !== todayStr) return false;
                      const blockA = (a.block || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                      const blockB = (selectedAttendanceBlock.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                      return blockA === blockB || blockB.includes(blockA) || blockA.includes(blockB.replace('boyshostel', '')) || blockA.includes(blockB.replace('girlshostel', ''));
                    });
                    
                    const studentsToShow = presentStudents.length > 0 ? presentStudents : allAttendances.filter(a => a.date === todayStr);

                    if (studentsToShow.length === 0) {
                      return <tr><td colSpan="5" className="p-8 text-center text-muted border-b border-gray-100 dark:border-gray-800">No students have manually checked in yet today for this block.</td></tr>;
                    }
                    
                    return studentsToShow.map((stud, idx) => (
                      <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-3 font-medium">{stud.studentName || 'Unknown'}</td>
                        <td className="p-3 font-mono text-xs">{stud.studentId || 'Unknown'}</td>
                        <td className="p-3 text-sm">{stud.block}</td>
                        <td className="p-3 font-mono text-xs">{stud.time}</td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-100 text-green-700">Present</span>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HostelManagement;
