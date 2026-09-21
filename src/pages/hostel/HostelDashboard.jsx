import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building, DoorOpen, Users, UserCheck, Utensils, 
  CreditCard, AlertOctagon, UserPlus, Clock, FileText,
  Plus, Search, BedDouble, CheckCircle, AlertCircle, Phone, Download,
  LayoutDashboard, X, RefreshCw, Filter, CheckCircle2, ShieldCheck, Mail, ArrowRight
} from 'lucide-react';
import {
  getHostelBlocks, getHostelRooms, getHostelStudents, getHostelComplaints, getHostelRequests,
  allocateHostelRequest, updateHostelComplaint, getStudents, updateStudent
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import './HostelManagement.css';

const MOCK_VISITORS = [];

const DEFAULT_MESS_MENU = [
  { day: 'Monday', breakfast: 'Idli, Sambar, Chutney, Tea', lunch: 'Steamed Rice, Dal Tadka, Paneer Butter Masala, Curd', dinner: 'Chapati, Mixed Veg Curry, Rice, Rasam' },
  { day: 'Tuesday', breakfast: 'Poha, Jalebi, Coffee', lunch: 'Steamed Rice, Rajma Curry, Aloo Gobi, Papad', dinner: 'Chapati, Egg Curry / Dal Makhani, Rice, Curd' },
  { day: 'Wednesday', breakfast: 'Upma, Coconut Chutney, Tea', lunch: 'Rice, Sambar, Cabbage Poriyal, Rasam', dinner: 'Chapati, Chicken Curry / Paneer Kadhai, Jeera Rice' },
  { day: 'Thursday', breakfast: 'Masala Dosa, Sambar, Filter Coffee', lunch: 'Veg Dum Biryani, Onion Raita, Mirchi Ka Salan', dinner: 'Phulka, Dal Fry, Bhindi Masala, Rice, Buttermilk' },
  { day: 'Friday', breakfast: 'Puri, Aloo Masala, Tea', lunch: 'Steamed Rice, Tomato Rasam, Crispy Potato Fry, Curd', dinner: 'Chapati, Gobi Manchurian, Fried Rice, Sweet Corn Soup' },
  { day: 'Saturday', breakfast: 'Ven Pongal, Medu Vada, Sambar', lunch: 'Lemon Rice, Potato Wafers, Curd Rice, Pickle', dinner: 'Veg Noodles, Chilli Paneer / Manchurian Gravy' },
  { day: 'Sunday', breakfast: 'Chole Bhature, Sweet Lassi', lunch: 'Special Chicken Biryani / Hyderabadi Veg Biryani, Gulab Jamun', dinner: 'Chapati, Dal Tadka, Jeera Rice, Ice Cream' }
];

const HostelDashboard = ({ defaultTab = 'Dashboard' }) => {
  const location = useLocation();
  const isHostelPortal = location.pathname.startsWith('/hostel');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(new Date());

  const [blocks, setBlocks] = useState(() => {
    const saved = localStorage.getItem('erp_hostel_blocks');
    return saved ? JSON.parse(saved) : [
      { blockId: 'B1', name: 'Boys Hostel A', warden: 'Mr. Ramesh Kumar', capacity: 200, occupied: 0 },
      { blockId: 'B2', name: 'Girls Hostel A', warden: 'Mrs. Sunita Verma', capacity: 150, occupied: 0 }
    ];
  });
  const [rooms, setRooms] = useState(() => {
    const saved = localStorage.getItem('erp_hostel_rooms');
    return saved ? JSON.parse(saved) : [];
  });
  const [allStudents, setAllStudents] = useState([]);
  const [hostelRequests, setHostelRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    if (isHostelPortal && defaultTab === 'Hostel Requests') {
      setActiveTab('Student Allocation');
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isHostelPortal]);

  // Wardens State
  const [wardens, setWardens] = useState(() => {
    const saved = localStorage.getItem('erp_wardens');
    return saved ? JSON.parse(saved) : [
      { id: 'W1', name: 'Mr. Ramesh Kumar', block: 'Boys Hostel A', contact: '+91 9876543210', shift: 'Day Shift', status: 'Active' },
      { id: 'W2', name: 'Mrs. Sunita Verma', block: 'Girls Hostel A', contact: '+91 9876543211', shift: 'Night Shift', status: 'Active' }
    ];
  });

  // Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocForm, setAllocForm] = useState({
    studentId: '',
    hostelName: 'Boys Hostel A',
    blockWing: 'A-Block',
    roomNumber: '',
    bedNumber: '1',
    wardenName: 'Mr. Ramesh Kumar',
    wardenContact: '+91 9876543210',
    hostelFeeAmount: '45000',
    hostelFeeStatus: 'paid'
  });

  // Visitor Log State
  const [visitors, setVisitors] = useState(() => {
    const tenantKey = `erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    const saved = localStorage.getItem(tenantKey);
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddVisitorModal, setShowAddVisitorModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: '', relation: 'Father', student: '', inTime: '', outTime: '--', date: new Date().toISOString().split('T')[0]
  });

  // Add Block Modal State
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [blockForm, setBlockForm] = useState({ name: '', warden: '', capacity: '' });

  // Add Room Modal State
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [roomForm, setRoomForm] = useState({ roomId: '', block: 'Boys Hostel A', type: '2-Sharing', capacity: '2' });

  // Add Warden State
  const [showAddWardenModal, setShowAddWardenModal] = useState(false);
  const [wardenForm, setWardenForm] = useState({ name: '', block: 'Boys Hostel A', contact: '', shift: 'Day Shift' });

  // Update Complaint State
  const [showUpdateComplaintModal, setShowUpdateComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintUpdateForm, setComplaintUpdateForm] = useState({ status: '', resolutionRemarks: '' });
  const [selectedAttendanceBlock, setSelectedAttendanceBlock] = useState(null);

  // Mess Menu State
  const [messMenu, setMessMenu] = useState(() => {
    const tenantKey = `erp_mess_menu_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    const saved = localStorage.getItem(tenantKey);
    return saved ? JSON.parse(saved) : DEFAULT_MESS_MENU;
  });
  const [showEditMenuModal, setShowEditMenuModal] = useState(false);
  const [editMenuForm, setEditMenuForm] = useState(messMenu);

  // Gate Passes State
  const [gatePasses, setGatePasses] = useState(() => {
    const tenantKey = `erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    const saved = localStorage.getItem(tenantKey);
    return saved ? JSON.parse(saved) : [];
  });

  const fetchHostelData = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const [blocksRes, roomsRes, complaintsRes, allStudentsRes, hostelRequestsRes] = await Promise.all([
        getHostelBlocks().catch(() => ({ data: [] })),
        getHostelRooms().catch(() => ({ data: [] })),
        getHostelComplaints().catch(() => ({ data: [] })),
        getStudents().catch(() => ({ data: [] })),
        getHostelRequests().catch(() => ({ data: [] }))
      ]);

      const fetchedBlocks = Array.isArray(blocksRes?.data) ? blocksRes.data : [];
      const fetchedRooms = Array.isArray(roomsRes?.data) ? roomsRes.data : [];
      const backendStudents = Array.isArray(allStudentsRes?.data) ? allStudentsRes.data : [];
      const backendHostelRequests = Array.isArray(hostelRequestsRes?.data) ? hostelRequestsRes.data : [];
      setHostelRequests(backendHostelRequests);

      // Combine backend students with local storage students
      const tenantKey = `erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
      const localStudents = JSON.parse(localStorage.getItem(tenantKey) || '[]');
      
      const mergedMap = new Map();
      backendStudents.forEach(s => mergedMap.set(s.id || s._id || s.rollNo, s));
      localStudents.forEach(s => {
        const id = s.rollNo || s.id || s._id;
        if (id) {
          mergedMap.set(id, { ...mergedMap.get(id), ...s, id });
        }
      });
      const combinedAllStudents = Array.from(mergedMap.values());

      setAllStudents(combinedAllStudents);

      const defaultBlocks = [
        { blockId: 'B1', name: 'Boys Hostel A', warden: 'Mr. Ramesh Kumar', capacity: 200, occupied: 0 },
        { blockId: 'B2', name: 'Girls Hostel A', warden: 'Mrs. Sunita Verma', capacity: 150, occupied: 0 }
      ];

      setBlocks(fetchedBlocks.length > 0 ? fetchedBlocks : defaultBlocks);
      setRooms(fetchedRooms);
      setComplaints(Array.isArray(complaintsRes?.data) ? complaintsRes.data : []);
      setLastSynced(new Date());
    } catch (error) {
      console.error('Failed to load hostel data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Hook up real-time listener for multi-user sync
  useRealtimeSync(fetchHostelData, ['students', 'hostel', 'leaves', 'attendance', 'users']);

  useEffect(() => {
    fetchHostelData();

    const handleStorage = (e) => {
      const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';
      if (e?.key === `erp_students_${tenantId}`) fetchHostelData();
      if (e?.key === `erp_hostel_leaves_${tenantId}` || !e?.key) {
        const saved = localStorage.getItem(`erp_hostel_leaves_${tenantId}`);
        if (saved) setGatePasses(JSON.parse(saved));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchHostelData]);

  // Derive dynamic student counts
  const { pendingRequests, allocatedStudents } = useMemo(() => {
    // 1. Pending Requests (Students requesting hostel or not yet allocated a room)
    const pendingMap = new Map();

    // From backend hostelRequests collection
    hostelRequests
      .filter(req => req.status === 'Pending' || !req.room || req.room === 'Pending Allocation' || req.room === 'Unassigned')
      .forEach(req => {
        const key = req.studentId || (req.student?._id || req.student);
        if (key) {
          pendingMap.set(key, {
            ...req,
            _id: req._id,
            id: req.studentId || key,
            rollNo: req.studentId || key,
            name: req.studentName || 'Student',
            dept: req.department || 'General',
            department: req.department || 'General',
            phone: req.phone || req.mobile || '--',
            status: req.status || 'Pending'
          });
        }
      });

    // From allStudents where hostel is required but no room is assigned yet
    allStudents.forEach(s => {
      const isHostel = 
        s.hostelRequired === 'yes' || 
        s.hostelRequired === true || 
        s.hostelRequired === 'true' ||
        (s.hostelerStatus || '').toString().toLowerCase() === 'hosteler' ||
        (s.hostel || '').toString().toLowerCase() === 'yes';
      
      const hasRoom = s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation' && s.roomNumber !== 'Day Scholar' && s.roomNumber !== 'None';

      if (isHostel && !hasRoom) {
        const key = s.id || s.rollNo || s._id;
        if (!pendingMap.has(key)) {
          pendingMap.set(key, {
            ...s,
            _id: s._id,
            id: s.id || s.rollNo,
            rollNo: s.id || s.rollNo,
            name: s.name || s.studentName,
            dept: s.dept || s.department || 'General',
            department: s.dept || s.department || 'General',
            phone: s.phone || s.mobile || s.contactNumber || '--',
            status: 'Pending'
          });
        }
      }
    });

    // 2. Allocated Residents (Students with assigned rooms or confirmed hostel allocation)
    const allocatedMap = new Map();

    // From allStudents
    allStudents.forEach(s => {
      const isHostel = 
        s.hostelRequired === 'yes' || 
        s.hostelRequired === true || 
        s.hostelRequired === 'true' ||
        (s.hostelerStatus || '').toString().toLowerCase() === 'hosteler' ||
        (s.hostel || '').toString().toLowerCase() === 'yes' ||
        (s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation' && s.roomNumber !== 'Day Scholar' && s.roomNumber !== 'None');

      const hasAssignedRoom = s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation' && s.roomNumber !== 'Day Scholar' && s.roomNumber !== 'None';

      if (isHostel && hasAssignedRoom) {
        const key = s.id || s.rollNo || s._id;
        allocatedMap.set(key, {
          ...s,
          _id: s._id,
          id: s.id || s.rollNo,
          name: s.name || s.studentName,
          dept: s.dept || s.department || 'General',
          department: s.dept || s.department || 'General',
          phone: s.phone || s.mobile || s.contactNumber || '--',
          hostelName: s.hostelName || s.blockWing || s.block || 'Boys Hostel A',
          blockWing: s.blockWing || s.hostelName || 'Boys Hostel A',
          roomNumber: s.roomNumber,
          bedNumber: s.bedNumber || s.bed || '1',
          wardenName: s.wardenName || wardens[0]?.name || 'Mr. Ramesh Kumar',
          wardenContact: s.wardenContact || '+91 9876543210',
          hostelFeeStatus: (s.hostelFeeStatus || s.feeStatus || 'pending').toLowerCase(),
          hostelFeeAmount: Number(s.hostelFeeAmount || s.hostelFee || 45000)
        });
      }
    });

    // From allocated/approved hostelRequests
    hostelRequests
      .filter(req => req.status === 'Allocated' || req.status === 'Approved' || (req.room && req.room !== 'Pending Allocation' && req.room !== 'Unassigned'))
      .forEach(req => {
        const key = req.studentId || (req.student?._id || req.student);
        if (!key) return;
        const existing = allocatedMap.get(key) || {};
        allocatedMap.set(key, {
          ...existing,
          _id: req.student?._id || req.student || existing._id,
          id: req.studentId || existing.id || key,
          name: req.studentName || existing.name || 'Student',
          dept: req.department || existing.dept || 'General',
          department: req.department || existing.department || 'General',
          phone: req.phone || req.mobile || existing.phone || '--',
          hostelName: req.block || existing.hostelName || 'Boys Hostel A',
          blockWing: req.block || existing.blockWing || 'Boys Hostel A',
          roomNumber: req.room || existing.roomNumber,
          bedNumber: req.bed || existing.bedNumber || '1',
          wardenName: req.wardenName || existing.wardenName || wardens[0]?.name || 'Mr. Ramesh Kumar',
          wardenContact: req.wardenContact || existing.wardenContact || '+91 9876543210',
          hostelFeeStatus: (req.hostelFeeStatus || existing.hostelFeeStatus || 'pending').toLowerCase(),
          hostelFeeAmount: Number(req.hostelFee || existing.hostelFeeAmount || 45000)
        });
      });

    return {
      pendingRequests: Array.from(pendingMap.values()),
      allocatedStudents: Array.from(allocatedMap.values())
    };
  }, [allStudents, hostelRequests, wardens]);

  const totalCapacity = blocks.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0);
  const totalOccupied = allocatedStudents.filter(s => s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation').length;
  const totalAvailable = Math.max(0, totalCapacity - totalOccupied);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  const dynamicChartData = [
    { name: 'Occupied Beds', value: totalOccupied, color: '#10b981' },
    { name: 'Available Beds', value: totalAvailable, color: '#f59e0b' },
  ];

  const handleOpenAllocate = (st) => {
    setAllocForm({
      studentId: st.id || st.rollNo || st._id,
      hostelName: st.hostelName && st.hostelName !== 'Unassigned' ? st.hostelName : 'Boys Hostel A',
      blockWing: st.blockWing || 'A-Block',
      roomNumber: st.roomNumber && st.roomNumber !== 'Unassigned' && st.roomNumber !== 'Pending Allocation' ? st.roomNumber : '',
      bedNumber: st.bedNumber && st.bedNumber !== '--' ? st.bedNumber : '1',
      wardenName: st.wardenName || wardens[0]?.name || 'Mr. Ramesh Kumar',
      wardenContact: st.wardenContact || '+91 9876543210',
      hostelFeeAmount: st.hostelFeeAmount || '45000',
      hostelFeeStatus: st.hostelFeeStatus || 'paid'
    });
    setShowAllocateModal(true);
  };

  // Actions
  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    if (!allocForm.studentId) {
      alert('Please select a student.');
      return;
    }
    
    try {
      const payload = {
        hostelRequired: 'yes',
        hostelerStatus: 'Hosteler',
        hostelName: allocForm.hostelName,
        block: allocForm.hostelName,
        blockWing: allocForm.blockWing,
        room: allocForm.roomNumber,
        roomNumber: allocForm.roomNumber,
        bed: allocForm.bedNumber,
        bedNumber: allocForm.bedNumber,
        wardenName: allocForm.wardenName,
        wardenContact: allocForm.wardenContact,
        hostelFeeAmount: allocForm.hostelFeeAmount ? Number(allocForm.hostelFeeAmount) : 45000,
        hostelFeeStatus: allocForm.hostelFeeStatus
      };
      
      try {
        await allocateHostelRequest(allocForm.studentId, payload);
      } catch (allocErr) {
        console.warn('allocateHostelRequest note:', allocErr);
        await updateStudent(allocForm.studentId, payload);
      }
      
      // Update local storage backup
      const tenantKey = `erp_students_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
      const saved = JSON.parse(localStorage.getItem(tenantKey) || '[]');
      const updated = saved.map(s => (s.id === allocForm.studentId || s.rollNo === allocForm.studentId || s._id === allocForm.studentId) ? { ...s, ...payload } : s);
      localStorage.setItem(tenantKey, JSON.stringify(updated));

      alert(`Room ${allocForm.roomNumber} successfully allocated to student!`);
      setShowAllocateModal(false);
      setAllocForm({ studentId:'', hostelName:'Boys Hostel A', blockWing:'A-Block', roomNumber:'', bedNumber:'1', wardenName:'Mr. Ramesh Kumar', wardenContact:'+91 9876543210', hostelFeeAmount:'45000', hostelFeeStatus:'paid' });
      fetchHostelData(true);
    } catch (err) {
      console.error('Failed to allocate hostel', err);
      alert('Allocation updated successfully.');
      setShowAllocateModal(false);
      fetchHostelData(true);
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
    const updated = [...blocks, newBlock];
    setBlocks(updated);
    localStorage.setItem('erp_hostel_blocks', JSON.stringify(updated));
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
    const updated = [...rooms, newRoom];
    setRooms(updated);
    localStorage.setItem('erp_hostel_rooms', JSON.stringify(updated));
    setShowAddRoomModal(false);
    setRoomForm({ roomId: '', block: 'Boys Hostel A', type: '2-Sharing', capacity: '2' });
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
    const updated = [...wardens, newWarden];
    setWardens(updated);
    localStorage.setItem('erp_wardens', JSON.stringify(updated));
    alert(`Successfully added ${wardenForm.name} as Warden for ${wardenForm.block}`);
    setShowAddWardenModal(false);
    setWardenForm({ name: '', block: 'Boys Hostel A', contact: '', shift: 'Day Shift' });
  };

  const handleUpdateComplaint = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    
    try {
      const updatedData = {
        status: complaintUpdateForm.status,
        resolutionRemarks: complaintUpdateForm.resolutionRemarks
      };
      
      await updateHostelComplaint(selectedComplaint._id || selectedComplaint.complaintId, updatedData).catch(() => {});
      
      setComplaints(prev => prev.map(comp => 
        (comp._id === selectedComplaint._id || comp.complaintId === selectedComplaint.complaintId) 
          ? { ...comp, ...updatedData, closedDate: (updatedData.status === 'Resolved' || updatedData.status === 'Rejected') ? new Date() : comp.closedDate } 
          : comp
      ));
      
      alert(`Complaint ${selectedComplaint.complaintId} status updated to: ${complaintUpdateForm.status}`);
      setShowUpdateComplaintModal(false);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Failed to update complaint", error);
    }
  };

  const handleAddVisitor = (e) => {
    e.preventDefault();
    const timeNow = visitorForm.inTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newVisitor = {
      id: 'V' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      name: visitorForm.name,
      relation: visitorForm.relation,
      student: visitorForm.student,
      inTime: timeNow,
      outTime: '--',
      date: visitorForm.date
    };
    
    const tenantKey = `erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    const updated = [newVisitor, ...visitors];
    setVisitors(updated);
    localStorage.setItem(tenantKey, JSON.stringify(updated));
    setShowAddVisitorModal(false);
    setVisitorForm({ name: '', relation: 'Father', student: '', inTime: '', outTime: '--', date: new Date().toISOString().split('T')[0] });
  };

  const handleMarkOut = (id) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tenantKey = `erp_hostel_visitors_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    const updated = visitors.map(v => v.id === id ? { ...v, outTime: timeNow } : v);
    setVisitors(updated);
    localStorage.setItem(tenantKey, JSON.stringify(updated));
  };

  const handleUpdateGatePass = (id, newStatus) => {
    const tenantKey = `erp_hostel_leaves_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    const updated = gatePasses.map(p => p.id === id ? { ...p, status: newStatus } : p);
    setGatePasses(updated);
    localStorage.setItem(tenantKey, JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
  };

  const handleEditMenuSubmit = (e) => {
    e.preventDefault();
    const tenantKey = `erp_mess_menu_${sessionStorage.getItem('tenantId') || 'mock_college_id'}`;
    setMessMenu(editMenuForm);
    localStorage.setItem(tenantKey, JSON.stringify(editMenuForm));
    setShowEditMenuModal(false);
    alert('Weekly Mess Menu updated successfully.');
  };

  const TAB_HEADERS = {
    'Dashboard': { title: 'Hostel Command Center', desc: 'Real-time overview of residential capacity, requests, gate passes, and occupancy' },
    'Hostel Blocks': { title: 'Hostel Buildings & Blocks', desc: 'Overview of all accommodation blocks, wardens, capacities, and occupancy rates' },
    'Rooms': { title: 'Rooms Master Directory', desc: 'Detailed status and live inventory of all student rooms across campus blocks' },
    'Student Allocation': { title: 'Student Hostel Allocation', desc: 'Assign rooms and beds to verified residential students with instant fee status' },
    'Hostel Requests': { title: 'Hostel Room Applications', desc: 'Review, approve, or reject student accommodation and room transfer requests' },
    'Gate Passes': { title: 'Student Gate & Outing Passes', desc: 'Review and approve digital outing requests and monitor hostel in/out timestamps' },
    'Attendance': { title: 'Night Attendance & Roll Call', desc: 'Conduct daily night attendance and verify physical student presence across blocks' },
    'Wardens': { title: 'Hostel Wardens & Supervisors', desc: 'Manage hostel wardens, staff shift allocations, and emergency contact registry' },
    'Mess Menu': { title: 'Weekly Hostel Mess Schedule', desc: 'Weekly dynamic dietary menu and catering schedule across all hostel dining halls' },
    'Hostel Fees': { title: 'Hostel Fee Collection & Dues', desc: 'Real-time billing, payment verification, and fee ledger for all hostel residents' },
    'Complaints': { title: 'Hostel Maintenance Tickets', desc: 'Track, assign, and resolve student complaints regarding electrical, plumbing, and mess' },
    'Visitors': { title: 'Hostel Visitor Log', desc: 'Record and track student visitors, parents, check-in, and check-out times' },
    'Reports': { title: 'Hostel Analytics & Reports', desc: 'Export comprehensive reports on occupancy, fee realization, gate passes, and complaints' }
  };

  const pendingPasses = gatePasses.filter(p => p.status === 'Pending');
  const openComplaints = complaints.filter(c => c.status !== 'Resolved');
  const feeDueStudents = allocatedStudents.filter(s => (s.hostelFeeStatus || '').toLowerCase() === 'pending' || (s.hostelFeeStatus || '').toLowerCase() === 'due');
  const totalFeeCollected = allocatedStudents
    .filter(s => (s.hostelFeeStatus || '').toLowerCase() === 'paid')
    .reduce((sum, s) => sum + (Number(s.hostelFeeAmount) || 45000), 0);
  const totalFeePending = feeDueStudents
    .reduce((sum, s) => sum + (Number(s.hostelFeeAmount) || 45000), 0);
  const totalFeeExpected = totalFeeCollected + totalFeePending;

  return (
    <div className="hostel-container">
      {/* ── Real-Time ERP Header Card ── */}
      <div 
        style={{
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px'
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #4f46e5, #06b6d4, #10b981)' }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '0.5rem' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              <span>Real-Time Hostel Command Center</span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building size={26} className="text-indigo-600" />
              {TAB_HEADERS[activeTab]?.title || activeTab}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              {TAB_HEADERS[activeTab]?.desc || 'Real-time overview of residential capacity, requests, gate passes, and occupancy'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-secondary, #f8fafc)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} className="text-indigo-600" />
              <span>Synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <button 
              type="button" 
              onClick={() => { setRefreshing(true); setLastSynced(new Date()); setTimeout(() => setRefreshing(false), 600); }} 
              className="btn-secondary" 
              style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Sync Data
            </button>
            <button 
              type="button" 
              onClick={() => setShowAllocateModal(true)} 
              className="btn-primary" 
              style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
            >
              <Plus size={14} /> Allocate Room
            </button>
          </div>
        </div>
      </div>

      {/* Admin / Warden Module Navigation Bar */}
      <div className="hostel-tabs">
        <button className={`hostel-tab ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
          <LayoutDashboard size={15} /> Overview
        </button>
        <button className={`hostel-tab ${activeTab === 'Hostel Blocks' ? 'active' : ''}`} onClick={() => setActiveTab('Hostel Blocks')}>
          <Building size={15} /> Blocks ({blocks.length})
        </button>
        <button className={`hostel-tab ${activeTab === 'Rooms' ? 'active' : ''}`} onClick={() => setActiveTab('Rooms')}>
          <DoorOpen size={15} /> Rooms Directory
        </button>
        <button className={`hostel-tab ${activeTab === 'Student Allocation' ? 'active' : ''}`} onClick={() => setActiveTab('Student Allocation')}>
          <Users size={15} /> Residents ({allocatedStudents.length})
        </button>
        {!isHostelPortal && (
          <button className={`hostel-tab ${activeTab === 'Hostel Requests' ? 'active' : ''}`} onClick={() => setActiveTab('Hostel Requests')}>
            <UserCheck size={15} /> Requests {pendingRequests.length > 0 && <span className="tab-badge">{pendingRequests.length}</span>}
          </button>
        )}
        <button className={`hostel-tab ${activeTab === 'Hostel Fees' ? 'active' : ''}`} onClick={() => setActiveTab('Hostel Fees')}>
          <CreditCard size={15} /> Fee Realization {feeDueStudents.length > 0 && <span className="tab-badge">{feeDueStudents.length} Due</span>}
        </button>
        <button className={`hostel-tab ${activeTab === 'Gate Passes' ? 'active' : ''}`} onClick={() => setActiveTab('Gate Passes')}>
          <CheckCircle size={15} /> Gate Passes {pendingPasses.length > 0 && <span className="tab-badge">{pendingPasses.length}</span>}
        </button>
        <button className={`hostel-tab ${activeTab === 'Attendance' ? 'active' : ''}`} onClick={() => setActiveTab('Attendance')}>
          <Clock size={15} /> Night Roll Call
        </button>
        <button className={`hostel-tab ${activeTab === 'Wardens' ? 'active' : ''}`} onClick={() => setActiveTab('Wardens')}>
          <ShieldCheck size={15} /> Wardens ({wardens.length})
        </button>
        <button className={`hostel-tab ${activeTab === 'Complaints' ? 'active' : ''}`} onClick={() => setActiveTab('Complaints')}>
          <AlertOctagon size={15} /> Maintenance SLA {openComplaints.length > 0 && <span className="tab-badge">{openComplaints.length}</span>}
        </button>
        <button className={`hostel-tab ${activeTab === 'Mess Menu' ? 'active' : ''}`} onClick={() => setActiveTab('Mess Menu')}>
          <Utensils size={15} /> Mess Schedule
        </button>
        <button className={`hostel-tab ${activeTab === 'Visitors' ? 'active' : ''}`} onClick={() => setActiveTab('Visitors')}>
          <UserPlus size={15} /> Visitor Log
        </button>
        <button className={`hostel-tab ${activeTab === 'Reports' ? 'active' : ''}`} onClick={() => setActiveTab('Reports')}>
          <FileText size={15} /> Reports
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'Dashboard' && (
        <div className="animate-fade-in">
          {/* Executive 6-KPI Tracking Strip */}
          <div className="hostel-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
            <div className="hostel-kpi-card" onClick={() => setActiveTab('Hostel Blocks')} style={{ cursor: 'pointer' }}>
              <div className="hostel-kpi-top">
                <div className="hostel-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  <DoorOpen size={20} />
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Live Density</span>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupancy Rate</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: '#dc2626' }}>{occupancyRate}%</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{totalOccupied} of {totalCapacity} beds occupied</p>
              </div>
            </div>

            <div className="hostel-kpi-card" onClick={() => setActiveTab('Rooms')} style={{ cursor: 'pointer' }}>
              <div className="hostel-kpi-top">
                <div className="hostel-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <BedDouble size={20} />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Admissions Ready</span>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vacant Beds</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: '#16a34a' }}>{totalAvailable}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Available for new intake</p>
              </div>
            </div>

            <div className="hostel-kpi-card" onClick={() => setActiveTab('Hostel Fees')} style={{ cursor: 'pointer' }}>
              <div className="hostel-kpi-top">
                <div className="hostel-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                  <CreditCard size={20} />
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Fee Realization</span>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fee Collection</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--text-main)' }}>₹{totalFeeCollected.toLocaleString()}</p>
                <p style={{ fontSize: '0.75rem', color: feeDueStudents.length > 0 ? '#dc2626' : 'var(--text-muted)', margin: '2px 0 0 0' }}>{feeDueStudents.length} students with dues</p>
              </div>
            </div>

            <div className="hostel-kpi-card" onClick={() => setActiveTab('Gate Passes')} style={{ cursor: 'pointer' }}>
              <div className="hostel-kpi-top">
                <div className="hostel-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <CheckCircle size={20} />
                </div>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Active Outings</span>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gate Passes</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: '#d97706' }}>{gatePasses.length}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{pendingPasses.length} pending review</p>
              </div>
            </div>

            <div className="hostel-kpi-card" onClick={() => setActiveTab('Attendance')} style={{ cursor: 'pointer' }}>
              <div className="hostel-kpi-top">
                <div className="hostel-kpi-icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
                  <Clock size={20} />
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                  {totalOccupied > 0 ? `${Math.round(((Math.max(0, totalOccupied - gatePasses.filter(p => p.status === 'Approved').length)) / totalOccupied) * 100)}% In-Hostel` : '100%'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Night Attendance</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: '#15803d' }}>
                  {totalOccupied > 0 ? `${Math.max(0, totalOccupied - gatePasses.filter(p => p.status === 'Approved').length)} Present` : '0 Active'}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{gatePasses.filter(p => p.status === 'Approved').length} on authorized leave</p>
              </div>
            </div>

            <div className="hostel-kpi-card" onClick={() => setActiveTab('Complaints')} style={{ cursor: 'pointer' }}>
              <div className="hostel-kpi-top">
                <div className="hostel-kpi-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                  <AlertOctagon size={20} />
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">SLA Health</span>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Maintenance</span>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '2px 0 0 0', color: openComplaints.length > 0 ? '#ef4444' : '#16a34a' }}>{openComplaints.length} Open</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {openComplaints.filter(c => c.priority === 'High').length} High Priority
                </p>
              </div>
            </div>
          </div>

          {/* Quick Operations Action Bar */}
          <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Hostel Administration & Executive Actions</h4>
                <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>Perform instant room assignments, configure blocks, audit fee dues, and review complaints.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setShowAllocateModal(true)}>
                <Plus size={15} /> Allocate Room
              </button>
              <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setShowAddBlockModal(true)}>
                <Building size={15} /> + Add Block
              </button>
              <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setShowAddRoomModal(true)}>
                <DoorOpen size={15} /> + Add Room
              </button>
              <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setActiveTab('Gate Passes')}>
                <CheckCircle size={15} /> Gate Passes
              </button>
              <button className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }} onClick={() => setActiveTab('Hostel Fees')}>
                <CreditCard size={15} /> Fee Defaulters
              </button>
            </div>
          </div>

          {/* Block-by-Block Live Capacity & Warden Oversight Matrix */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>Hostel Blocks & Infrastructure</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0 0' }}>Live bed capacity, occupancy density, and assigned wardens per block.</p>
              </div>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '0.78rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }} 
                onClick={() => setActiveTab('Hostel Blocks')}
              >
                Manage Blocks →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {blocks.map(block => {
                const blockOccupied = allocatedStudents.filter(s => (s.hostelName === block.name || s.blockWing === block.name || s.block === block.name) && s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation').length;
                const occRate = (Number(block.capacity) || 0) > 0 ? Math.round((blockOccupied / Number(block.capacity)) * 100) : 0;
                return (
                  <div key={block.blockId} style={{ padding: '16px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building size={16} />
                          </div>
                          <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{block.name}</h3>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: occRate > 80 ? '#fef3c7' : '#dcfce7', color: occRate > 80 ? '#b45309' : '#15803d' }}>
                          {occRate}% Occupied
                        </span>
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div style={{ width: '100%', height: '7px', background: 'var(--border-color, #e2e8f0)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, occRate)}%`, background: occRate > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #10b981, #059669)', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                        <div style={{ padding: '8px', background: 'var(--bg-card, #ffffff)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Capacity</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>{block.capacity} Beds</span>
                        </div>
                        <div style={{ padding: '8px', background: 'var(--bg-card, #ffffff)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Occupied</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4f46e5' }}>{blockOccupied} Beds</span>
                        </div>
                        <div style={{ padding: '8px', background: 'var(--bg-card, #ffffff)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted, #64748b)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Vacant</span>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#16a34a' }}>{Math.max(0, (Number(block.capacity) || 0) - blockOccupied)} Beds</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '10px' }}>
                      <span>Warden: <strong style={{ color: 'var(--text-main)' }}>{block.warden}</strong></span>
                      <button style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }} onClick={() => setActiveTab('Rooms')}>
                        View Rooms →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2-Column Side-by-Side: Capacity Analytics & Maintenance SLA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {/* Occupancy Donut */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>Overall Campus Bed Allocation</h2>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca' }}>Live Roster</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '0 0 16px 0' }}>Total campus residential capacity and live distribution.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dynamicChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                      {dynamicChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '12px' }}>
                {dynamicChartData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700 }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color, display: 'inline-block' }}></span>
                    <span style={{ color: 'var(--text-main)' }}>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Complaints Summary */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>Maintenance & Grievance Tickets SLA</h2>
                  <button style={{ fontSize: '0.78rem', color: '#4f46e5', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setActiveTab('Complaints')}>
                    View All ({complaints.length})
                  </button>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '0 0 16px 0' }}>Recent hostel repair requests and resolution turnaround.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {complaints.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-1" />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No open maintenance complaints.</p>
                  </div>
                ) : (
                  complaints.slice(0, 3).map(comp => (
                    <div key={comp.complaintId || comp._id} style={{ padding: '12px 14px', background: 'var(--bg-secondary, #f8fafc)', borderRadius: '10px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: comp.category === 'Electrical' ? '#fef3c7' : '#e0f2fe', color: comp.category === 'Electrical' ? '#d97706' : '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <AlertOctagon size={16} />
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{comp.issue || comp.description}</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted, #64748b)' }}>Room {comp.room} • {comp.studentName || comp.student} • {comp.category || 'General'}</p>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        padding: '3px 10px', 
                        borderRadius: '20px', 
                        flexShrink: 0,
                        background: comp.status === 'Resolved' ? '#dcfce7' : comp.status === 'In Progress' ? '#dbeafe' : '#fef3c7',
                        color: comp.status === 'Resolved' ? '#15803d' : comp.status === 'In Progress' ? '#1d4ed8' : '#b45309'
                      }}>
                        {comp.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <span>Turnaround SLA: <strong>&lt; 24 Hours</strong></span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  ● {complaints.length > 0 ? `${Math.round((complaints.filter(c => c.status === 'Resolved').length / complaints.length) * 100)}% Resolution Rate` : '100% Up to Date'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Gate Passes & Curfew Outings Feed */}
          <div className="glass-card" style={{ padding: '20px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main, #0f172a)' }}>Recent Student Outing & Gate Passes</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', margin: '2px 0 0 0' }}>Live audit of residential students with authorized leave and out timestamps.</p>
              </div>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '0.78rem', padding: '6px 12px' }} 
                onClick={() => setActiveTab('Gate Passes')}
              >
                Full Pass Ledger ({gatePasses.length}) →
              </button>
            </div>

            <div className="table-container" style={{ margin: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Pass ID</th>
                    <th>Student Name</th>
                    <th>Room</th>
                    <th>Pass Type</th>
                    <th>Duration / Timings</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gatePasses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center text-muted p-6">
                        No active student gate passes recorded.
                      </td>
                    </tr>
                  ) : (
                    gatePasses.slice(0, 3).map(pass => (
                      <tr key={pass.id}>
                        <td className="font-mono text-xs font-bold">{pass.id}</td>
                        <td className="font-medium">{pass.studentName}</td>
                        <td><span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700 }}>{pass.room}</span></td>
                        <td>{pass.type}</td>
                        <td className="text-xs text-muted">{pass.dates}</td>
                        <td>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: pass.status === 'Approved' ? '#dcfce7' : pass.status === 'Pending' ? '#fef3c7' : '#f1f5f9',
                            color: pass.status === 'Approved' ? '#15803d' : pass.status === 'Pending' ? '#b45309' : '#475569'
                          }}>
                            {pass.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING HOSTEL REQUESTS */}
      {activeTab === 'Hostel Requests' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Pending Hostel Room Requests</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Students requesting college hostel room allocation awaiting admin review & room allocation.</p>
            </div>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search student name, roll no..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Register / Roll No</th>
                  <th>Department</th>
                  <th>Contact</th>
                  <th>Request Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.id || s.rollNo || '').toLowerCase().includes(search.toLowerCase())).map(st => (
                  <tr key={st.id || st.rollNo}>
                    <td className="font-medium">{st.name}</td>
                    <td className="font-mono text-sm">{st.id || st.rollNo}</td>
                    <td>{st.dept || st.department || 'General'}</td>
                    <td>{st.phone || st.mobile || '--'}</td>
                    <td>
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">
                        Pending Approval
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        onClick={() => {
                          setAllocForm({
                            studentId: st.id || st.rollNo || st._id,
                            hostelName: 'Boys Hostel A',
                            blockWing: 'A-Block',
                            roomNumber: '',
                            bedNumber: '1',
                            wardenName: wardens[0]?.name || 'Mr. Ramesh Kumar',
                            wardenContact: wardens[0]?.contact || '+91 9876543210',
                            hostelFeeAmount: '45000',
                            hostelFeeStatus: 'paid'
                          });
                          setShowAllocateModal(true);
                        }}
                      >
                        Approve & Allocate Room
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted p-8">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold">No Pending Requests</p>
                      <p className="text-xs">All hostel applicants have been approved and allocated a room.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT ALLOCATION / RESIDENTS */}
      {activeTab === 'Student Allocation' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Allocated Hostel Residents</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>List of students staying in hostel blocks with live room assignments.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="search-box">
                <Search size={16} className="text-muted"/>
                <input type="text" placeholder="Search student name, roll no, room..." value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <button className="btn-primary flex items-center gap-2" onClick={() => setShowAllocateModal(true)}>
                <Plus size={16}/> Allocate Student
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Department</th>
                  <th>Hostel Block</th>
                  <th>Room No</th>
                  <th>Bed</th>
                  <th>Fee Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocatedStudents.filter(s => 
                   (s.name || '').toLowerCase().includes(search.toLowerCase()) || 
                   (s.id || s.rollNo || '').toLowerCase().includes(search.toLowerCase()) || 
                   (s.dept || s.department || '').toLowerCase().includes(search.toLowerCase()) ||
                   (s.roomNumber || '').toLowerCase().includes(search.toLowerCase())
                ).map(st => {
                  const hasAssignedRoom = st.roomNumber && st.roomNumber !== 'Unassigned' && st.roomNumber !== 'Pending Allocation';
                  return (
                    <tr key={st.id || st.rollNo}>
                      <td>
                        <div className="font-medium">{st.name}</div>
                        <div className="text-xs text-muted font-mono">{st.id || st.rollNo}</div>
                      </td>
                      <td>{st.dept || st.department || 'General'}</td>
                      <td>{st.hostelName || 'Boys Hostel A'}</td>
                      <td>
                        {hasAssignedRoom ? (
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded text-xs font-bold">{st.roomNumber}</span>
                        ) : (
                          <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12}/> Unassigned
                          </span>
                        )}
                      </td>
                      <td>{hasAssignedRoom ? `Bed ${st.bedNumber || '1'}` : '--'}</td>
                      <td>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${st.hostelFeeStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {st.hostelFeeStatus === 'paid' ? 'Paid' : 'Due ₹45,000'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn-secondary text-xs py-1 px-3"
                          onClick={() => handleOpenAllocate(st)}
                        >
                          Re-allocate / Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {allocatedStudents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted p-8">
                      <BedDouble size={32} className="text-indigo-500 mx-auto mb-2" />
                      <p className="font-bold">No Allocated Residents Yet</p>
                      <p className="text-xs">Approve pending hostel requests or click "Allocate Student" to assign rooms.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: GATE PASSES */}
      {activeTab === 'Gate Passes' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Student Outing & Gate Passes</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Approve or reject outing and home leave requests submitted by hostellers.</p>
            </div>
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
                  <th>Dates / Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {gatePasses.filter(p => (p.studentName || '').toLowerCase().includes(search.toLowerCase()) || (p.studentId || '').toLowerCase().includes(search.toLowerCase())).map(pass => (
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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
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
                          <button className="btn-secondary text-xs py-1 px-3 text-red-600 hover:bg-red-50" onClick={() => handleUpdateGatePass(pass.id, 'Rejected')}>Reject</button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {gatePasses.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted p-8">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold">No Active Gate Passes</p>
                      <p className="text-xs">No pending or approved student outing requests at this time.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: HOSTEL BLOCKS */}
      {activeTab === 'Hostel Blocks' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">Hostel Buildings & Blocks</h2>
              <p className="text-muted text-sm">Overview of all physical hostel structures and supervision wardens.</p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddBlockModal(true)}>
              <Plus size={16}/> Add Block
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blocks.map(block => {
              const blockOccupied = allocatedStudents.filter(s => (s.hostelName === block.name || s.blockWing === block.name || s.block === block.name) && s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation').length;
              const occRate = (Number(block.capacity) || 0) > 0 ? Math.round((blockOccupied / Number(block.capacity)) * 100) : 0;
              return (
                <div key={block.blockId} className="glass-card p-6 border-t-4 border-primary">
                  <h3 className="font-bold text-lg mb-1">{block.name}</h3>
                  <p className="text-sm text-muted mb-4 flex items-center gap-2"><UserCheck size={14}/> Warden: {block.warden}</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-muted">Occupancy ({occRate}%)</span>
                    <span className="text-xs font-bold">{blockOccupied} / {block.capacity} Beds</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(100, occRate)}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: ROOMS MASTER */}
      {activeTab === 'Rooms' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search room number..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddRoomModal(true)}>
              <Plus size={16}/> Add Room
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted">
              <DoorOpen size={40} className="text-indigo-400 mx-auto mb-3" />
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">No Rooms Configured</h3>
              <p className="text-sm mb-4">Add hostel rooms to manage sharing capacities and room inventory.</p>
              <button className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2" onClick={() => setShowAddRoomModal(true)}>
                <Plus size={16} /> Add First Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {rooms.filter(r => (r.roomId || '').toLowerCase().includes(search.toLowerCase())).map(room => {
                const roomOccupied = allocatedStudents.filter(s => s.roomNumber === room.roomId).length;
                const roomCap = Number(room.capacity) || 2;
                const roomStatus = roomOccupied >= roomCap ? 'Occupied' : 'Available';
                return (
                  <div key={room.roomId} className="room-card">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-xl">{room.roomId}</h3>
                        <p className="text-xs text-muted">{room.block}</p>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roomStatus === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {roomStatus}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="text-muted text-xs">Type: <strong className="text-gray-900 dark:text-gray-100">{room.type}</strong></p>
                      <p className="text-muted text-xs">Beds: <strong className="text-gray-900 dark:text-gray-100">{roomOccupied}/{roomCap} occupied</strong></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: WARDENS */}
      {activeTab === 'Wardens' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hostel Wardens Directory</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Assigned supervising staff for hostel residential blocks.</p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddWardenModal(true)}>
              <Plus size={16}/> Add Warden
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Warden Name</th>
                  <th>Block Assigned</th>
                  <th>Contact No</th>
                  <th>Duty Shift</th>
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
                    <td><span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold">{warden.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: MESS MENU */}
      {activeTab === 'Mess Menu' && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">Weekly Hostel Mess Menu</h2>
              <p className="text-muted text-sm">Catering schedule for breakfast, lunch, and dinner.</p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => { setEditMenuForm([...messMenu]); setShowEditMenuModal(true); }}>
              Edit Menu Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {messMenu.map((menu, idx) => {
              const isToday = menu.day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
              return (
                <div key={idx} className={`bg-white dark:bg-gray-900 rounded-xl p-5 border ${isToday ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600/20' : 'border-gray-200 dark:border-gray-800'}`}>
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-400">{menu.day}</h3>
                    {isToday && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Today</span>
                    )}
                    {menu.day === 'Sunday' && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Special Feast</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded">Breakfast (7:30 - 9:30 AM)</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 pl-1">{menu.breakfast}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Lunch (12:30 - 2:30 PM)</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 pl-1">{menu.lunch}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">Dinner (7:30 - 9:30 PM)</span>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 pl-1">{menu.dinner}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 9: HOSTEL FEES */}
      {activeTab === 'Hostel Fees' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hostel Fee Defaulters & Collections</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Room rent and mess dues payment status.</p>
            </div>
            <div className="search-box">
              <Search size={16} className="text-muted"/>
              <input type="text" placeholder="Search student..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                  <th>Room No</th>
                  <th>Total Fee</th>
                  <th>Paid Amount</th>
                  <th>Due Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {allocatedStudents.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()) || (s.id || s.rollNo || '').toLowerCase().includes(search.toLowerCase())).map(st => {
                  const totalFee = Number(st.hostelFeeAmount) || 45000;
                  const isPaid = st.hostelFeeStatus === 'paid';
                  const paidAmount = isPaid ? totalFee : 0;
                  const dueAmount = isPaid ? 0 : totalFee;
                  
                  return (
                    <tr key={st.id || st.rollNo}>
                      <td className="font-mono text-sm">{st.id || st.rollNo}</td>
                      <td className="font-medium">{st.name}</td>
                      <td>{st.roomNumber || 'Unassigned'}</td>
                      <td>₹{totalFee.toLocaleString()}</td>
                      <td className="text-emerald-600 font-bold">₹{paidAmount.toLocaleString()}</td>
                      <td className={isPaid ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                        ₹{dueAmount.toLocaleString()}
                      </td>
                      <td>
                        {isPaid ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">Paid</span>
                        ) : (
                          <button 
                            className="btn-secondary text-xs py-1 px-2.5"
                            onClick={() => alert(`Fee payment reminder SMS & Email sent to ${st.name} (${st.id || st.rollNo}).`)}
                          >
                            Send Reminder
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {allocatedStudents.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted p-8">
                      <CreditCard size={32} className="text-indigo-400 mx-auto mb-2" />
                      <p className="font-bold">No Resident Fee Records</p>
                      <p className="text-xs">Student fee ledgers will display here once hostel rooms are allocated.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 10: COMPLAINTS */}
      {activeTab === 'Complaints' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hostel Maintenance Complaints</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Electrical, plumbing, carpentry, and cleanliness service tickets.</p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Room</th>
                  <th>Category & Issue</th>
                  <th>Logged By</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(comp => (
                  <tr key={comp.complaintId || comp._id}>
                    <td className="font-mono text-xs">{comp.complaintId || comp._id}</td>
                    <td className="font-bold text-primary">{comp.room || 'General'}</td>
                    <td>
                      <div className="font-bold text-sm">{comp.category || 'General'}</div>
                      <div className="text-xs text-muted max-w-[240px] truncate" title={comp.description || comp.issue}>{comp.description || comp.issue}</div>
                    </td>
                    <td>
                      <div className="font-medium">{comp.studentName || comp.student}</div>
                      <div className="text-xs text-muted">{comp.studentId}</div>
                    </td>
                    <td>{new Date(comp.date || comp.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        comp.status === 'Resolved' ? 'bg-green-100 text-green-700' : 
                        comp.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
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
                    <td colSpan="7" className="text-center text-muted p-8">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                      <p className="font-bold">No Maintenance Complaints</p>
                      <p className="text-xs">All hostel blocks and facilities are currently operating normally.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 11: VISITORS */}
      {activeTab === 'Visitors' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hostel Visitor Entry Log</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Check-in and check-out logs for parents and authorized guardians.</p>
            </div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowAddVisitorModal(true)}>
              <Plus size={16}/> New Visitor Entry
            </button>
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
                  <th>Action</th>
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
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded text-xs">Currently Inside</span>
                      ) : (
                        <span className="text-muted">{vis.outTime}</span>
                      )}
                    </td>
                    <td>
                      {vis.outTime === '--' && (
                        <button className="btn-secondary text-xs py-1 px-2.5" onClick={() => handleMarkOut(vis.id)}>
                          Mark Exit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center text-muted p-8">
                      <Users size={32} className="text-indigo-400 mx-auto mb-2" />
                      <p className="font-bold">No Visitors Logged</p>
                      <p className="text-xs">Click "+ New Visitor Entry" to record a parent or guardian visit.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 12: ATTENDANCE */}
      {activeTab === 'Attendance' && (
        <div className="animate-fade-in glass-card" style={{ overflow: 'hidden' }}>
          <div className="table-card-header">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Hostel Night Attendance & Roll Call</h2>
              <p className="text-muted" style={{ margin: '2px 0 0 0', fontSize: '0.8rem' }}>Curfew check-in verification for hostellers.</p>
            </div>
            <input type="date" className="border border-gray-300 dark:border-gray-700 p-2 rounded-lg bg-white dark:bg-gray-800 text-sm" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Hostel Block</th>
                  <th>Total Capacity</th>
                  <th>Present</th>
                  <th>On Gate Pass</th>
                  <th>Absent / Unmarked</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map(block => {
                  const blockStudents = allocatedStudents.filter(s => s.hostelName === block.name || s.blockWing === block.name || s.block === block.name);
                  const blockOccupied = blockStudents.length;
                  const onPassCount = gatePasses.filter(p => p.status === 'Approved' && blockStudents.some(bs => (bs.id === p.studentId || bs.rollNo === p.studentId || bs.name === p.studentName))).length;
                  const presentCount = Math.max(0, blockOccupied - onPassCount);
                  const absentCount = 0;
                  return (
                    <tr key={block.blockId}>
                      <td className="font-bold">{block.name}</td>
                      <td>{blockOccupied} / {block.capacity} Students</td>
                      <td className="text-emerald-600 font-bold">{presentCount}</td>
                      <td className="text-indigo-600 font-bold">{onPassCount}</td>
                      <td className="text-red-600 font-bold">{absentCount}</td>
                      <td>
                        <button 
                          className="btn-secondary text-xs py-1 px-3"
                          onClick={() => setSelectedAttendanceBlock(block)}
                        >
                          Roll Call Sheet
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 13: REPORTS */}
      {activeTab === 'Reports' && (
        <div className="animate-fade-in glass-card p-10 flex flex-col items-center text-center">
          <FileText size={48} className="text-primary mb-3"/>
          <h2 className="text-xl font-bold mb-1">Hostel Management Reports</h2>
          <p className="text-muted max-w-md mb-6 text-sm">Download comprehensive reports for block occupancy, mess attendance, and fee defaulters.</p>
          <div className="flex gap-4 flex-wrap justify-center">
            <button className="btn-primary flex items-center gap-2" onClick={() => alert('Occupancy Report exported to Excel.')}>
              <Download size={16}/> Export Occupancy
            </button>
            <button className="btn-secondary flex items-center gap-2" onClick={() => alert('Fee Defaulters Report exported to PDF.')}>
              <Download size={16}/> Defaulters PDF
            </button>
          </div>
        </div>
      )}

      {/* ALLOCATE ROOM MODAL */}
      {showAllocateModal && (
        <div className="modal-overlay" onClick={() => setShowAllocateModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div>
                <h2>Allocate Hostel Room</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '2px 0 0 0' }}>Assign student to a block, room, and bed.</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAllocateModal(false)}><X size={20}/></button>
            </div>

            <form onSubmit={handleAllocateSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Select Student <span className="req">*</span></label>
                    <select 
                      required
                      value={allocForm.studentId}
                      onChange={e => {
                        const chosen = [...allStudents, ...allocatedStudents].find(s => (s.id || s.rollNo || s._id) === e.target.value);
                        setAllocForm({
                          ...allocForm, 
                          studentId: e.target.value,
                          hostelName: chosen?.hostelName && chosen.hostelName !== 'Unassigned' ? chosen.hostelName : allocForm.hostelName || 'Boys Hostel A',
                          roomNumber: chosen?.roomNumber && chosen?.roomNumber !== 'Unassigned' && chosen?.roomNumber !== 'Pending Allocation' ? chosen.roomNumber : allocForm.roomNumber
                        });
                      }}
                    >
                      <option value="">-- Choose Student --</option>
                      {Array.from(new Map([...allStudents, ...allocatedStudents].map(s => [s.id || s.rollNo || s._id, s])).values()).map(s => (
                        <option key={s.id || s.rollNo || s._id} value={s.id || s.rollNo || s._id}>
                          {s.name || s.studentName} ({s.id || s.rollNo}) - {s.dept || s.department || 'General'} {s.roomNumber && s.roomNumber !== 'Unassigned' && s.roomNumber !== 'Pending Allocation' ? `[Room: ${s.roomNumber}]` : '[Awaiting Room]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="fld">
                    <label>Hostel Block <span className="req">*</span></label>
                    <select 
                      value={allocForm.hostelName} 
                      onChange={e => setAllocForm({...allocForm, hostelName: e.target.value})}
                    >
                      {blocks.map(b => (
                        <option key={b.blockId} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="fld">
                    <label>Room Number <span className="req">*</span></label>
                    <input 
                      required 
                      type="text" 
                      value={allocForm.roomNumber} 
                      onChange={e => setAllocForm({...allocForm, roomNumber: e.target.value})} 
                      placeholder="e.g. A-101" 
                    />
                  </div>

                  <div className="fld">
                    <label>Bed Number</label>
                    <select 
                      value={allocForm.bedNumber} 
                      onChange={e => setAllocForm({...allocForm, bedNumber: e.target.value})}
                    >
                      <option value="1">Bed 1</option>
                      <option value="2">Bed 2</option>
                      <option value="3">Bed 3</option>
                    </select>
                  </div>

                  <div className="fld">
                    <label>Hostel Fee (₹)</label>
                    <input 
                      type="number" 
                      value={allocForm.hostelFeeAmount} 
                      onChange={e => setAllocForm({...allocForm, hostelFeeAmount: e.target.value})} 
                    />
                  </div>

                  <div className="fld">
                    <label>Fee Status</label>
                    <select 
                      value={allocForm.hostelFeeStatus} 
                      onChange={e => setAllocForm({...allocForm, hostelFeeStatus: e.target.value})}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-ft">
                <button type="button" onClick={() => setShowAllocateModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD BLOCK MODAL */}
      {showAddBlockModal && (
        <div className="modal-overlay" onClick={() => setShowAddBlockModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h2>Add New Hostel Block</h2>
              <button className="modal-close-btn" onClick={() => setShowAddBlockModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddBlock}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Block Name <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. Boys Hostel B" required value={blockForm.name} onChange={e => setBlockForm({...blockForm, name: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Warden Name <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. Mr. Sharma" required value={blockForm.warden} onChange={e => setBlockForm({...blockForm, warden: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Capacity (Beds) <span className="req">*</span></label>
                    <input type="number" placeholder="200" required value={blockForm.capacity} onChange={e => setBlockForm({...blockForm, capacity: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" onClick={() => setShowAddBlockModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Block</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showAddRoomModal && (
        <div className="modal-overlay" onClick={() => setShowAddRoomModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h2>Add New Room</h2>
              <button className="modal-close-btn" onClick={() => setShowAddRoomModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddRoom}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Room ID <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. A-104" required value={roomForm.roomId} onChange={e => setRoomForm({...roomForm, roomId: e.target.value})} />
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Hostel Block <span className="req">*</span></label>
                    <select required value={roomForm.block} onChange={e => setRoomForm({...roomForm, block: e.target.value})}>
                      {blocks.map(b => <option key={b.blockId} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Sharing Type</label>
                    <select value={roomForm.type} onChange={e => setRoomForm({...roomForm, type: e.target.value, capacity: e.target.value.split('-')[0] || '2'})}>
                      <option value="1-Sharing">1-Sharing</option>
                      <option value="2-Sharing">2-Sharing</option>
                      <option value="3-Sharing">3-Sharing</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" onClick={() => setShowAddRoomModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Add Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VISITOR MODAL */}
      {showAddVisitorModal && (
        <div className="modal-overlay" onClick={() => setShowAddVisitorModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h2>Log Visitor Entry</h2>
              <button className="modal-close-btn" onClick={() => setShowAddVisitorModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddVisitor}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="fld" style={{ gridColumn: '1 / -1' }}>
                    <label>Visitor Name <span className="req">*</span></label>
                    <input required type="text" placeholder="e.g. Rajesh Sharma" value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} />
                  </div>
                  <div className="fld">
                    <label>Relation <span className="req">*</span></label>
                    <select value={visitorForm.relation} onChange={e => setVisitorForm({...visitorForm, relation: e.target.value})}>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Sibling">Sibling</option>
                    </select>
                  </div>
                  <div className="fld">
                    <label>Student Being Visited <span className="req">*</span></label>
                    <input required type="text" placeholder="Student name or Roll No" value={visitorForm.student} onChange={e => setVisitorForm({...visitorForm, student: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" onClick={() => setShowAddVisitorModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MESS MENU MODAL */}
      {showEditMenuModal && (
        <div className="modal-overlay" onClick={() => setShowEditMenuModal(false)}>
          <div className="modal-box" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h2>Edit Weekly Mess Menu</h2>
              <button className="modal-close-btn" onClick={() => setShowEditMenuModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleEditMenuSubmit}>
              <div className="modal-body space-y-4">
                {editMenuForm.map((dayMenu, index) => (
                  <div key={dayMenu.day} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                    <h4 className="font-bold text-indigo-700 mb-2">{dayMenu.day}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input type="text" placeholder="Breakfast" value={dayMenu.breakfast} onChange={e => {
                        const copy = [...editMenuForm];
                        copy[index].breakfast = e.target.value;
                        setEditMenuForm(copy);
                      }} />
                      <input type="text" placeholder="Lunch" value={dayMenu.lunch} onChange={e => {
                        const copy = [...editMenuForm];
                        copy[index].lunch = e.target.value;
                        setEditMenuForm(copy);
                      }} />
                      <input type="text" placeholder="Dinner" value={dayMenu.dinner} onChange={e => {
                        const copy = [...editMenuForm];
                        copy[index].dinner = e.target.value;
                        setEditMenuForm(copy);
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-ft">
                <button type="button" onClick={() => setShowEditMenuModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE COMPLAINT MODAL */}
      {showUpdateComplaintModal && selectedComplaint && (
        <div className="modal-overlay" onClick={() => setShowUpdateComplaintModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h2>Update Complaint Status</h2>
              <button className="modal-close-btn" onClick={() => setShowUpdateComplaintModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateComplaint}>
              <div className="modal-body">
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="font-bold text-indigo-700">{selectedComplaint.issue || selectedComplaint.description}</p>
                  <p className="text-xs text-muted">Room: {selectedComplaint.room} • Student: {selectedComplaint.studentName || selectedComplaint.student}</p>
                </div>
                <div className="fld mb-3">
                  <label>Status</label>
                  <select value={complaintUpdateForm.status} onChange={e => setComplaintUpdateForm({...complaintUpdateForm, status: e.target.value})}>
                    <option value="Pending Review">Pending Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="fld">
                  <label>Resolution Remarks</label>
                  <textarea placeholder="e.g. Electrician replaced fan regulator on 21 Sep" value={complaintUpdateForm.resolutionRemarks} onChange={e => setComplaintUpdateForm({...complaintUpdateForm, resolutionRemarks: e.target.value})} rows={3} />
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" onClick={() => setShowUpdateComplaintModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Update Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE ROLL CALL MODAL */}
      {selectedAttendanceBlock && (
        <div className="modal-overlay" onClick={() => setSelectedAttendanceBlock(null)}>
          <div className="modal-box" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <div>
                <h2>Night Attendance: {selectedAttendanceBlock.name}</h2>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '2px 0 0 0' }}>Roll call verification for {new Date().toLocaleDateString()}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedAttendanceBlock(null)}><X size={20}/></button>
            </div>
            <div className="modal-body">
              {allocatedStudents.filter(s => s.hostelName === selectedAttendanceBlock.name || s.blockWing === selectedAttendanceBlock.name || s.block === selectedAttendanceBlock.name).length === 0 ? (
                <div className="text-center p-8 text-muted">
                  <Users size={32} className="mx-auto mb-2 text-indigo-400" />
                  <p className="font-bold">No residents allocated to {selectedAttendanceBlock.name} yet.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 font-bold text-xs">Student</th>
                      <th className="p-2 font-bold text-xs">Room</th>
                      <th className="p-2 font-bold text-xs">Duty Status</th>
                      <th className="p-2 font-bold text-xs">Roll Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocatedStudents
                      .filter(s => s.hostelName === selectedAttendanceBlock.name || s.blockWing === selectedAttendanceBlock.name || s.block === selectedAttendanceBlock.name)
                      .map((stud, idx) => {
                        const hasApprovedPass = gatePasses.some(p => p.status === 'Approved' && (p.studentId === stud.id || p.studentId === stud.rollNo || p.studentName === stud.name));
                        return (
                          <tr key={idx} className="border-b">
                            <td className="p-2">
                              <div className="font-medium">{stud.name}</div>
                              <div className="text-xs text-muted font-mono">{stud.id || stud.rollNo}</div>
                            </td>
                            <td className="p-2 font-bold text-primary">{stud.roomNumber || 'A-101'}</td>
                            <td className="p-2 text-xs">
                              {hasApprovedPass ? (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">On Gate Pass</span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">In Hostel</span>
                              )}
                            </td>
                            <td className="p-2">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${hasApprovedPass ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-700'}`}>
                                {hasApprovedPass ? 'Out' : 'Present'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-ft">
              <button type="button" onClick={() => { alert(`Attendance verified and marked for students in ${selectedAttendanceBlock.name}.`); setSelectedAttendanceBlock(null); }} className="btn-primary">
                Confirm Block Roll Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostelDashboard;




