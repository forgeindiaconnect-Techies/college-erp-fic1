import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  QrCode, Search, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, Phone, MapPin, Building2, LogOut as ExitIcon,
  Shield, Check, ArrowRight, ArrowLeft, RefreshCw, Users,
  Sparkles, Camera, CameraOff, AlertCircle, UserPlus,
  LogIn, LogOut, GraduationCap, UserCheck, ShieldCheck,
  ChevronRight, Calendar, Upload, Image as ImageIcon,
  Car, Eye, Filter
} from 'lucide-react';
import {
  lookupCampusPerson,
  recordCampusIn,
  recordCampusOut,
  getCampusMovementStats,
  verifyVisitorPass,
  recordVisitorExit,
  admitPreRegisteredVisitor,
  getActiveVisitors,
  getCampusPeople,
  getPreRegisteredVisitors,
  getVisitorHistory
} from '../../api/index';
import {
  decodeQrFromCanvas,
  decodeQrFromFile,
  playScanBeep,
  loadQrScannerEngine
} from '../../utils/qrDecoder';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import '../watchman.css';

const GATES = [
  'Gate 1 (Main Entrance)',
  'Gate 2 (North Gate)',
  'Gate 3 (Hostel Gate)',
  'Gate 4 (Sports Complex Gate)',
  'Gate 5 (Back Gate / Delivery Bay)'
];

const QrVerificationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Mode: 'members_scanner' (Students, Staff, HOD) | 'visitor_scanner' (Visitors & Pre-Visitors)
  const initialParams = new URLSearchParams(location.search);
  const initialType = initialParams.get('type');
  const initialCode = initialParams.get('code') || initialParams.get('id');

  const [activeMode, setActiveMode] = useState(
    initialType === 'visitor' || initialCode?.startsWith('PASS-') || initialCode?.startsWith('V-')
      ? 'visitor_scanner'
      : 'members_scanner'
  );

  // Selected Gate
  const [gate, setGate] = useState('Gate 1 (Main Entrance)');
  const [remarks, setRemarks] = useState('');

  // Success / Error Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [crossScanAlert, setCrossScanAlert] = useState(null); // { type: 'visitor_on_members' | 'member_on_visitors', data: ... }

  // ══════════════════════════════════════════════════════════
  // SCANNER 1: INSTITUTIONAL MEMBERS (Student, Staff & HOD)
  // ══════════════════════════════════════════════════════════
  const [searchInput, setSearchInput] = useState(initialCode && !initialCode.startsWith('PASS-') ? initialCode : '');
  const [lookingUp, setLookingUp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [identifiedPerson, setIdentifiedPerson] = useState(null);
  const [personMovements, setPersonMovements] = useState([]);

  // Auto-loaded Registered Members Directory
  const [membersList, setMembersList] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('All'); // 'All' | 'Student' | 'Staff' | 'HOD'
  const [memberStatusFilter, setMemberStatusFilter] = useState('All'); // 'All' | 'Inside' | 'Outside'

  // ══════════════════════════════════════════════════════════
  // SCANNER 2: VISITORS & PRE-REGISTERED VISITORS
  // ══════════════════════════════════════════════════════════
  const [passQuery, setPassQuery] = useState(initialCode && (initialCode.startsWith('PASS-') || initialCode.startsWith('V-')) ? initialCode : '');
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorResult, setVisitorResult] = useState(null);

  // Auto-loaded Registered & Pre-Registered Visitors Directory
  const [visitorsList, setVisitorsList] = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [visitorSearch, setVisitorSearch] = useState('');
  const [visitorStatusFilter, setVisitorStatusFilter] = useState('All'); // 'All' | 'Inside' | 'Pre-Registered' | 'Checked Out'

  // Camera Live Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState('');
  const [scanPulse, setScanPulse] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);

  // Live Stats
  const [stats, setStats] = useState({
    totalRegistered: 0,
    currentlyInside: 0,
    currentlyOutside: 0,
    todayEntries: 0,
    todayExits: 0,
    members: {
      totalRegistered: 0,
      currentlyInside: 0,
      currentlyOutside: 0,
      todayEntries: 0,
      todayExits: 0
    },
    visitors: {
      currentlyInside: 0,
      preRegistered: 0,
      todayTotal: 0
    }
  });

  // Fetch Movement Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getCampusMovementStats();
      if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.warn('Stats fetch notice:', e.message);
    }
  }, []);

  // Fetch Registered Members (Students, Staff & HODs strictly)
  const fetchMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const res = await getCampusPeople({ personType: 'Members' });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setMembersList(list);
    } catch (err) {
      console.error('Failed to load registered members:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Fetch Registered & Pre-Registered Visitors strictly
  const fetchVisitors = useCallback(async () => {
    try {
      setLoadingVisitors(true);
      const [activeRes, preRegRes, histRes] = await Promise.allSettled([
        getActiveVisitors(),
        getPreRegisteredVisitors(),
        getVisitorHistory()
      ]);

      const activeList = activeRes.status === 'fulfilled' && Array.isArray(activeRes.value?.data?.data)
        ? activeRes.value.data.data
        : (Array.isArray(activeRes.value?.data) ? activeRes.value.data : []);

      const preRegList = preRegRes.status === 'fulfilled' && Array.isArray(preRegRes.value?.data?.data)
        ? preRegRes.value.data.data
        : (Array.isArray(preRegRes.value?.data) ? preRegRes.value.data : []);

      const histList = histRes.status === 'fulfilled' && Array.isArray(histRes.value?.data?.data)
        ? histRes.value.data.data
        : (Array.isArray(histRes.value?.data) ? histRes.value.data : []);

      // Merge and deduplicate by _id or passNumber
      const visitorMap = new Map();
      // 1. Add active visitors (highest priority)
      activeList.forEach(v => {
        if (v?._id) visitorMap.set(String(v._id), { ...v, status: 'Inside' });
      });
      // 2. Add pre-registered visitors
      preRegList.forEach(v => {
        if (v?._id && !visitorMap.has(String(v._id))) {
          visitorMap.set(String(v._id), v);
        }
      });
      // 3. Add history / checked out visitors
      histList.forEach(v => {
        if (v?._id && !visitorMap.has(String(v._id))) {
          visitorMap.set(String(v._id), v);
        }
      });

      setVisitorsList(Array.from(visitorMap.values()));
    } catch (err) {
      console.error('Failed to load visitors list:', err);
    } finally {
      setLoadingVisitors(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchMembers();
    fetchVisitors();
  }, [fetchStats, fetchMembers, fetchVisitors]);

  // Real-time synchronization
  useRealtimeSync(() => {
    fetchStats();
    fetchMembers();
    fetchVisitors();
  }, ['campus_movement', 'campus_people', 'watchman', 'student_tracking', 'visitors', 'visitor']);

  // Auto-sync when URL params change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let code = params.get('code') || params.get('id');
    const type = params.get('type');

    if (code && code.includes('code=')) {
      try {
        const match = code.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) code = decodeURIComponent(match[1]).trim();
      } catch (_) {}
    }

    if (type === 'visitor' || (code && (code.startsWith('PASS-') || code.startsWith('V-')))) {
      setActiveMode('visitor_scanner');
      setCrossScanAlert(null);
      setIdentifiedPerson(null);
      if (code) {
        setPassQuery(code);
        setVisitorResult(null);
        handleLookupVisitorDirect(code);
      }
    } else if (code) {
      setActiveMode('members_scanner');
      setCrossScanAlert(null);
      setSearchInput(code);
      setIdentifiedPerson(null);
      setVisitorResult(null);
      handleLookupMember(code);
    } else if (type === 'members') {
      setActiveMode('members_scanner');
      setCrossScanAlert(null);
    }
  }, [location.search]);

  // ══════════════════════════════════════════════════════════
  // CAMERA STREAM & BARCODE DETECTION
  // ══════════════════════════════════════════════════════════
  const startCamera = async () => {
    try {
      setCameraError('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const constraints = {
        video: { facingMode: cameraFacing, width: { ideal: 640 }, height: { ideal: 480 } }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startDetectionLoop();
      }
    } catch (err) {
      console.warn('Camera stream notice:', err);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera permissions in your browser or use the manual search field below.'
        : `Camera unavailable (${err.message || 'no webcam detected'}). You can use a barcode scanner gun or enter ID manually below.`);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 200);
    }
  };

  const startDetectionLoop = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    loadQrScannerEngine().catch(() => {});

    scanIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || video.ended) return;

      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        if (!width || !height) return;

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, width, height);

        const decoded = await decodeQrFromCanvas(canvas);
        if (decoded && decoded.trim()) {
          const now = Date.now();
          const cleanCode = decoded.trim();

          // Prevent rapid duplicate scans of the exact same code within 3 seconds
          if (cleanCode === lastScannedCodeRef.current && (now - lastScannedTimeRef.current) < 3000) {
            return;
          }

          lastScannedCodeRef.current = cleanCode;
          lastScannedTimeRef.current = now;

          playScanBeep();
          setScanPulse(true);
          setTimeout(() => setScanPulse(false), 1400);

          if (activeMode === 'members_scanner') {
            setSearchInput(cleanCode);
            handleLookupMember(cleanCode);
          } else {
            setPassQuery(cleanCode);
            handleLookupVisitorDirect(cleanCode);
          }
        }
      } catch (err) {
        console.warn('QR video frame decode tick error:', err);
      }
    }, 250);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setErrorMsg('');
      const decoded = await decodeQrFromFile(file);
      if (decoded && decoded.trim()) {
        playScanBeep();
        setScanPulse(true);
        setTimeout(() => setScanPulse(false), 1400);
        const code = decoded.trim();
        if (activeMode === 'members_scanner') {
          setSearchInput(code);
          handleLookupMember(code);
        } else {
          setPassQuery(code);
          handleLookupVisitorDirect(code);
        }
      } else {
        setErrorMsg('Could not detect a valid QR code in the uploaded image. Please ensure the QR code is clear and well-lit.');
      }
    } catch (err) {
      setErrorMsg('Failed to process QR image: ' + err.message);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ══════════════════════════════════════════════════════════
  // SCANNER 1: LOOKUP MEMBER (STUDENT, STAFF, HOD)
  // ══════════════════════════════════════════════════════════
  const handleLookupMember = async (codeToLookup, isSilent = false) => {
    let code = (codeToLookup || searchInput).trim();
    if (code.includes('code=')) {
      try {
        const match = code.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) code = decodeURIComponent(match[1]).trim();
      } catch (_) {}
    }

    if (!code) {
      if (!isSilent) setErrorMsg('Please enter or scan a Student Roll #, Staff ID, HOD ID, or Mobile number.');
      return;
    }

    // Direct check if user scanned a visitor pass on member scanner
    if (code.toUpperCase().startsWith('PASS-') || code.toUpperCase().startsWith('V-') || /^PASS/i.test(code)) {
      setCrossScanAlert({
        type: 'visitor_on_members',
        code: code,
        message: `Visitor Pass detected ("${code}"). This scanner is strictly for Students, Staff, and HODs.`
      });
      setErrorMsg('');
      setIdentifiedPerson(null);
      return;
    }

    try {
      if (!isSilent) setLookingUp(true);
      setErrorMsg('');
      setCrossScanAlert(null);
      if (!isSilent) setSuccessMsg('');

      const res = await lookupCampusPerson(code, { module: 'gate_operations' });
      if (res.data?.success && res.data?.person) {
        // Enforce non-visitor check
        if (res.data.person.personType === 'Visitor') {
          setCrossScanAlert({
            type: 'visitor_on_members',
            code: code,
            name: res.data.person.name,
            message: `Visitor Pass detected (${res.data.person.name} - ${res.data.person.personId}). This scanner is strictly for Students, Staff, and HODs.`
          });
          setIdentifiedPerson(null);
          return;
        }

        setIdentifiedPerson(res.data.person);
        setPersonMovements(res.data.movements || []);
        setSearchInput(res.data.person.personId);
      } else {
        setIdentifiedPerson(null);
        setErrorMsg(`No registered student, staff, or HOD found matching "${code}". Please register them using "Register Person".`);
      }
    } catch (err) {
      setIdentifiedPerson(null);
      if (err.response?.data?.isVisitorPass) {
        setCrossScanAlert({
          type: 'visitor_on_members',
          code: code,
          name: err.response.data.name,
          message: err.response.data.message || `Visitor Pass detected. This scanner is strictly for Students, Staff, and HODs.`
        });
      } else {
        setErrorMsg(err.response?.data?.message || `No registered student, staff, or HOD found matching "${code}".`);
      }
    } finally {
      if (!isSilent) setLookingUp(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // RECORD CAMPUS IN (LOGIN) & OUT (LOGOUT) FOR MEMBERS
  // ══════════════════════════════════════════════════════════
  const handleRecordInForPerson = async (person) => {
    const targetPerson = person || identifiedPerson;
    if (!targetPerson) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await recordCampusIn({
        personId: targetPerson.personId || targetPerson.id || targetPerson._id,
        gate,
        remarks: remarks.trim() || 'Gate Entry Logged',
        vehicleNumber: targetPerson.vehicleNumber || ''
      });

      if (res.data?.success) {
        setSuccessMsg(`Campus Entry Recorded! ${targetPerson.name} (${targetPerson.personId}) is now LOGGED IN (Inside Campus).`);
        setRemarks('');
        await handleLookupMember(targetPerson.personId, true);
        fetchStats();
        fetchMembers();
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const serverErr = err.response?.data?.error;
      const displayMsg = (serverMsg && serverErr && serverMsg !== serverErr) 
        ? `${serverMsg}: ${serverErr}`
        : (serverMsg || serverErr || 'Failed to record Campus In');
      setErrorMsg(displayMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordOutForPerson = async (person) => {
    const targetPerson = person || identifiedPerson;
    if (!targetPerson) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await recordCampusOut({
        personId: targetPerson.personId || targetPerson.id || targetPerson._id,
        gate,
        remarks: remarks.trim() || 'Gate Departure Logged'
      });

      if (res.data?.success) {
        setSuccessMsg(`Campus Exit Recorded! ${targetPerson.name} (${targetPerson.personId}) is now LOGGED OUT (Outside Campus).`);
        setRemarks('');
        await handleLookupMember(targetPerson.personId, true);
        fetchStats();
        fetchMembers();
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const serverErr = err.response?.data?.error;
      const displayMsg = (serverMsg && serverErr && serverMsg !== serverErr) 
        ? `${serverMsg}: ${serverErr}`
        : (serverMsg || serverErr || 'Failed to record Campus Out');
      setErrorMsg(displayMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // SCANNER 2: LOOKUP & VERIFY VISITOR PASS
  // ══════════════════════════════════════════════════════════
  const handleLookupVisitorDirect = async (code, silentPreload = false) => {
    if (!code) return;
    let cleanCode = code.toString().trim();
    if (cleanCode.includes('code=')) {
      try {
        const match = cleanCode.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) cleanCode = decodeURIComponent(match[1]).trim();
      } catch (_) {}
    }
    setPassQuery(cleanCode);

    // If matching active visitor is already in state, sync immediately
    if (!silentPreload) {
      const matched = (visitorsList || []).find(
        v => (v.passNumber && v.passNumber.toLowerCase() === cleanCode.toLowerCase()) ||
             (v.visitorId && v.visitorId.toLowerCase() === cleanCode.toLowerCase()) ||
             (v.phone && v.phone === cleanCode)
      );
      if (matched) {
        setVisitorResult({
          success: true,
          valid: true,
          validationStatus: matched.status === 'Inside' ? 'INSIDE' : 'VALID',
          statusMessage: matched.status === 'Inside'
            ? 'Visitor is currently inside campus (Active Pass). Ready for departure checkout.'
            : 'Pass verified against campus security registry.',
          data: matched,
          visitor: matched
        });
        silentPreload = true;
      }
    }

    try {
      setVisitorLoading(true);
      setErrorMsg('');
      setCrossScanAlert(null);
      if (!silentPreload) {
        setVisitorResult(null);
      }
      const res = await verifyVisitorPass(cleanCode);
      if (res.data?.success && res.data?.data) {
        setVisitorResult(res.data);
      } else if (!silentPreload) {
        setVisitorResult(null);
        setErrorMsg(res.data?.message || 'Visitor pass record not found.');
      }
    } catch (err) {
      if (err.response?.data?.isMemberPass) {
        setCrossScanAlert({
          type: 'member_on_visitors',
          code: cleanCode,
          name: err.response.data.name,
          personType: err.response.data.personType,
          message: err.response.data.message || `College member pass detected. This scanner is strictly for Visitors and Pre-Registered Visitors.`
        });
        setVisitorResult(null);
      } else {
        if (!silentPreload) setVisitorResult(null);
        setErrorMsg(err.response?.data?.message || 'Verification failed. Pass record not found.');
      }
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleVerifyVisitorSubmit = (e) => {
    if (e) e.preventDefault();
    handleLookupVisitorDirect(passQuery);
  };

  const handleSelectVisitorCard = (v) => {
    if (!v) return;
    const pNum = (v.passNumber || v.visitorId || '').trim();
    setPassQuery(pNum);
    setErrorMsg('');
    setCrossScanAlert(null);
    setVisitorResult({
      success: true,
      valid: true,
      validationStatus: v.status === 'Inside' ? 'INSIDE' : 'VALID',
      statusMessage: v.status === 'Inside'
        ? 'Visitor is currently inside campus (Active Pass). Ready for departure checkout.'
        : 'Pass verified against campus security registry.',
      data: v,
      visitor: v
    });
    if (pNum) {
      handleLookupVisitorDirect(pNum, true);
    }
  };

  const handleQuickCheckoutVisitor = async (vOverride) => {
    const v = vOverride || visitorResult?.data || visitorResult?.visitor || visitorResult;
    if (!v?._id) return;
    try {
      setVisitorLoading(true);
      setErrorMsg('');
      const res = await recordVisitorExit(v._id);
      if (res.data?.success) {
        setSuccessMsg(`Visitor ${v.name || 'Pass'} has been successfully Checked Out (Logged Out).`);
        if (v.passNumber) {
          handleLookupVisitorDirect(v.passNumber);
        }
        fetchVisitors();
        fetchStats();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Checkout failed');
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleQuickAdmitVisitor = async (vOverride) => {
    const v = vOverride || visitorResult?.data || visitorResult?.visitor || visitorResult;
    if (!v?._id) return;
    try {
      setVisitorLoading(true);
      setErrorMsg('');
      const res = await admitPreRegisteredVisitor(v._id, { gate });
      if (res.data?.success) {
        setSuccessMsg(`Pre-registered visitor ${v.name || 'Pass'} admitted successfully (Logged In).`);
        if (v.passNumber) {
          handleLookupVisitorDirect(v.passNumber);
        }
        fetchVisitors();
        fetchStats();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Admission failed');
    } finally {
      setVisitorLoading(false);
    }
  };

  // Helper Badge Colors
  const getPersonTypeBadge = (type) => {
    switch (type) {
      case 'Student':
        return { icon: <GraduationCap size={14} />, bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
      case 'Staff':
        return { icon: <UserCheck size={14} />, bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' };
      case 'HOD':
        return { icon: <Building2 size={14} />, bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      default:
        return { icon: <User size={14} />, bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    }
  };

  // Filter registered members
  const filteredMembers = membersList.filter(m => {
    if (m.personType === 'Visitor') return false; // strictly exclude visitors

    if (memberRoleFilter !== 'All' && m.personType !== memberRoleFilter) {
      return false;
    }
    if (memberStatusFilter === 'Inside' && m.currentStatus !== 'Inside Campus') {
      return false;
    }
    if (memberStatusFilter === 'Outside' && m.currentStatus === 'Inside Campus') {
      return false;
    }
    if (memberSearch.trim()) {
      const q = memberSearch.trim().toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchId = m.personId?.toLowerCase().includes(q);
      const matchPhone = m.phone?.includes(q);
      const matchDept = m.department?.toLowerCase().includes(q);
      const matchVeh = m.vehicleNumber?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchPhone && !matchDept && !matchVeh) {
        return false;
      }
    }
    return true;
  });

  const memberInsideCount = membersList.filter(m => m.personType !== 'Visitor' && m.currentStatus === 'Inside Campus').length;
  const memberOutsideCount = membersList.filter(m => m.personType !== 'Visitor' && m.currentStatus !== 'Inside Campus').length;
  const totalMemberCount = membersList.filter(m => m.personType !== 'Visitor').length;

  // Filter visitors
  const filteredVisitors = visitorsList.filter(v => {
    if (visitorStatusFilter === 'Inside' && v.status !== 'Inside') return false;
    if (visitorStatusFilter === 'Pre-Registered' && v.status !== 'Pre-Registered') return false;
    if (visitorStatusFilter === 'Checked Out' && v.status !== 'Checked Out') return false;

    if (visitorSearch.trim()) {
      const q = visitorSearch.trim().toLowerCase();
      const matchName = v.name?.toLowerCase().includes(q);
      const matchPass = (v.passNumber || v.visitorId)?.toLowerCase().includes(q);
      const matchPhone = v.phone?.includes(q);
      const matchHost = v.personToMeet?.toLowerCase().includes(q);
      const matchDept = v.department?.toLowerCase().includes(q);
      if (!matchName && !matchPass && !matchPhone && !matchHost && !matchDept) {
        return false;
      }
    }
    return true;
  });

  const visitorInsideCount = visitorsList.filter(v => v.status === 'Inside').length;
  const visitorPreRegCount = visitorsList.filter(v => v.status === 'Pre-Registered').length;
  const visitorCheckedOutCount = visitorsList.filter(v => v.status === 'Checked Out').length;

  return (
    <div className="wmn-page-container">
      {/* Page Header */}
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <QrCode size={24} style={{ color: '#2563eb' }} />
            <span>
              {activeMode === 'visitor_scanner'
                ? 'Visitor & Pre-Visitor Pass Scanner'
                : 'Member QR Scanner (Students, Staff & HOD)'}
            </span>
          </h2>
          <p>
            {activeMode === 'visitor_scanner'
              ? 'Dedicated Visitor Pass Scanner: Verify visitor passes, admit pre-registered appointments, and log campus departures in real time.'
              : 'Dedicated Member Scanner: Track Student Roll Nos, Staff IDs, and HOD QR badges with instant Login / Logout campus movement.'}
          </p>
        </div>

        {/* Gate Selection Dropdown & Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#475569' }}>Gate:</span>
            <select
              className="wmn-form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.84rem' }}
              value={gate}
              onChange={(e) => setGate(e.target.value)}
            >
              {GATES.map((g, i) => (
                <option key={i} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="wmn-btn-sec"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
            onClick={() => navigate('/watchman/register-person')}
          >
            <UserPlus size={15} style={{ color: '#2563eb' }} />
            <span>Register Person</span>
          </button>
        </div>
      </div>

      {/* DUAL SCANNER TABS SWITCHER (Strictly unbundled) */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        background: '#f1f5f9',
        padding: '6px',
        borderRadius: '12px'
      }}>
        {/* TAB 1: MEMBERS SCANNER */}
        <button
          type="button"
          className="wmn-btn"
          style={{
            flex: 1,
            background: activeMode === 'members_scanner' ? '#2563eb' : 'transparent',
            color: activeMode === 'members_scanner' ? '#ffffff' : '#334155',
            border: activeMode === 'members_scanner' ? '1px solid #1d4ed8' : 'none',
            fontWeight: 800,
            fontSize: '0.92rem',
            padding: '12px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: activeMode === 'members_scanner' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => {
            navigate('/watchman/qr-verification?type=members', { replace: true });
            setActiveMode('members_scanner');
            setErrorMsg('');
            setSuccessMsg('');
            setCrossScanAlert(null);
            fetchMembers();
          }}
        >
          <GraduationCap size={20} />
          <span>Member QR Scanner (Students, Staff & HOD)</span>
          <span style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: activeMode === 'members_scanner' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeMode === 'members_scanner' ? '#ffffff' : '#475569'
          }}>
            {memberInsideCount} Inside
          </span>
        </button>

        {/* TAB 2: VISITOR SCANNER */}
        <button
          type="button"
          className="wmn-btn"
          style={{
            flex: 1,
            background: activeMode === 'visitor_scanner' ? '#2563eb' : 'transparent',
            color: activeMode === 'visitor_scanner' ? '#ffffff' : '#334155',
            border: activeMode === 'visitor_scanner' ? '1px solid #1d4ed8' : 'none',
            fontWeight: 800,
            fontSize: '0.92rem',
            padding: '12px 20px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: activeMode === 'visitor_scanner' ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
            transition: 'all 0.15s ease'
          }}
          onClick={() => {
            navigate('/watchman/qr-verification?type=visitor', { replace: true });
            setActiveMode('visitor_scanner');
            setErrorMsg('');
            setSuccessMsg('');
            setCrossScanAlert(null);
            fetchVisitors();
          }}
        >
          <ShieldCheck size={20} />
          <span>Visitor & Pre-Visitor Pass Scanner</span>
          <span style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: activeMode === 'visitor_scanner' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
            color: activeMode === 'visitor_scanner' ? '#ffffff' : '#475569'
          }}>
            {visitorInsideCount} Inside
          </span>
        </button>
      </div>

      {/* Real-time Movement Metric Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        {activeMode === 'members_scanner' ? (
          <>
            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogIn size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Members Inside (Logged In)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{memberInsideCount}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Members Outside (Logged Out)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#64748b' }}>{memberOutsideCount}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Registered Members</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{totalMemberCount}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Today's Movements</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>
                  {(stats.todayEntries || 0) + (stats.todayExits || 0)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>({stats.todayEntries || 0} In / {stats.todayExits || 0} Out)</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Active Visitors Inside</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{visitorInsideCount}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Pre-Registered Expected</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{visitorPreRegCount}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ExitIcon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Departed / Checked Out</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#64748b' }}>{visitorCheckedOutCount}</div>
              </div>
            </div>

            <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Visitors Logged</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>{visitorsList.length}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Success Notification Banner */}
      {successMsg && (
        <div style={{
          padding: '12px 16px',
          background: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '8px',
          color: '#065f46',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '18px'
        }}>
          <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMsg && (
        <div style={{
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '18px'
        }}>
          <AlertCircle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Cross-Scan Alert Banner (when user scans visitor pass on member scanner or vice versa) */}
      {crossScanAlert && (
        <div style={{
          padding: '14px 18px',
          background: '#fffbeb',
          border: '1.5px solid #f59e0b',
          borderRadius: '10px',
          color: '#92400e',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={22} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800 }}>{crossScanAlert.message}</div>
              <div style={{ fontSize: '0.78rem', opacity: 0.85, marginTop: '2px' }}>
                {crossScanAlert.type === 'visitor_on_members'
                  ? 'Click below to switch directly to the Visitor & Pre-Visitor Pass Scanner.'
                  : 'Click below to switch directly to the Member QR Scanner.'}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="wmn-btn"
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            onClick={() => {
              if (crossScanAlert.type === 'visitor_on_members') {
                setActiveMode('visitor_scanner');
                setCrossScanAlert(null);
                setPassQuery(crossScanAlert.code);
                handleLookupVisitorDirect(crossScanAlert.code);
              } else {
                setActiveMode('members_scanner');
                setCrossScanAlert(null);
                setSearchInput(crossScanAlert.code);
                handleLookupMember(crossScanAlert.code);
              }
            }}
          >
            {crossScanAlert.type === 'visitor_on_members' ? 'Switch to Visitor Scanner →' : 'Switch to Member Scanner →'}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 1: MEMBER QR SCANNER (STUDENTS, STAFF & HOD)                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'members_scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '24px' }}>
          {/* Left Column: Search Gun + Camera + AUTOMATICALLY SHOWN REGISTERED MEMBERS */}
          <div>
            {/* 1. Barcode Scan Gun / Search Input at Top */}
            <div className="wmn-card" style={{ marginBottom: '16px', border: '1.5px solid #93c5fd', background: '#f8fafc' }}>
              <div className="wmn-card-header" style={{ marginBottom: '10px' }}>
                <div className="wmn-card-title">
                  <Search size={18} style={{ color: '#2563eb' }} />
                  <h3 style={{ fontSize: '0.95rem' }}>Barcode Scanner Gun / Manual Member Search</h3>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Supports Roll #, Staff ID & Phone
                </span>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleLookupMember(); }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="wmn-form-input"
                      style={{ paddingLeft: '36px', fontSize: '0.92rem', fontWeight: 600 }}
                      placeholder="Scan barcode gun or enter Student Roll #, Staff ID, Mobile #..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      autoFocus
                    />
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="wmn-btn-primary"
                    disabled={lookingUp}
                    style={{ whiteSpace: 'nowrap', padding: '0 18px', fontWeight: 700 }}
                  >
                    <Search size={15} />
                    <span>{lookingUp ? 'Searching...' : 'Search Member'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Live Camera Scanner Box (Compact on Standby) */}
            <div className="wmn-card" style={{ marginBottom: '16px' }}>
              <div className="wmn-card-header" style={{ marginBottom: '10px' }}>
                <div className="wmn-card-title">
                  <Camera size={18} style={{ color: '#2563eb' }} />
                  <h3 style={{ fontSize: '0.92rem' }}>Live Camera QR Scanner (Members)</h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {cameraActive && (
                    <button
                      type="button"
                      className="wmn-btn-sec"
                      style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                      onClick={toggleCameraFacing}
                      title="Flip between front and rear camera"
                    >
                      <RefreshCw size={13} />
                      <span>Flip</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', background: cameraActive ? '#fee2e2' : '#eff6ff', color: cameraActive ? '#dc2626' : '#2563eb' }}
                    onClick={cameraActive ? stopCamera : startCamera}
                  >
                    {cameraActive ? <><CameraOff size={13} /> Stop Camera</> : <><Camera size={13} /> Start Camera</>}
                  </button>
                </div>
              </div>

              {cameraError && (
                <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#92400e', fontSize: '0.78rem', marginBottom: '10px' }}>
                  {cameraError}
                </div>
              )}

              {/* Viewfinder Area */}
              <div style={{
                position: 'relative',
                background: '#0f172a',
                borderRadius: '10px',
                overflow: 'hidden',
                aspectRatio: cameraActive ? '16/9' : '21/9',
                maxHeight: cameraActive ? '400px' : '150px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: scanPulse ? '2.5px solid #10b981' : '1.5px solid #334155',
                transition: 'all 0.2s ease'
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />

                {!cameraActive && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '14px' }}>
                    <QrCode size={36} style={{ color: '#475569', margin: '0 auto 6px auto' }} />
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem' }}>Camera scanner is on standby.</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                        onClick={startCamera}
                      >
                        <Camera size={14} />
                        <span>Activate Camera</span>
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.78rem', padding: '6px 14px', background: '#1e293b', color: '#f8fafc', border: '1px solid #475569' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Upload QR File</span>
                      </button>
                    </div>
                  </div>
                )}

                {cameraActive && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '65%',
                    height: '65%',
                    border: '2px dashed rgba(255,255,255,0.7)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)'
                  }} />
                )}
              </div>

              {/* Upload QR Image file helper */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                <span>Scan Student Roll No, Staff Employee ID, or HOD QR Pass</span>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={12} />
                  <span>Upload QR Image</span>
                </button>
              </div>
            </div>

            {/* 3. AUTOMATICALLY SHOWN REGISTERED MEMBERS SECTION (Students, Staff & HOD) */}
            <div className="wmn-card">
              <div className="wmn-card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div className="wmn-card-title">
                  <Users size={18} style={{ color: '#2563eb' }} />
                  <h3>Registered Campus Members ({filteredMembers.length})</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    onClick={fetchMembers}
                    title="Refresh registered members from database"
                  >
                    <RefreshCw size={12} className={loadingMembers ? 'wmn-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', color: '#2563eb' }}
                    onClick={() => navigate('/watchman/register-person')}
                  >
                    <UserPlus size={12} />
                    <span>Register New</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar for Registered Members */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="text"
                  className="wmn-form-input"
                  style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                  placeholder="Filter registered members by name, ID, phone, department..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />

                {/* Role Filter Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Role:</span>
                  {['All', 'Student', 'Staff', 'HOD'].map(role => (
                    <button
                      key={role}
                      type="button"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: memberRoleFilter === role ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: memberRoleFilter === role ? '#eff6ff' : '#ffffff',
                        color: memberRoleFilter === role ? '#1d4ed8' : '#475569',
                        fontWeight: memberRoleFilter === role ? 800 : 600,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setMemberRoleFilter(role)}
                    >
                      {role === 'All' ? `All Roles (${totalMemberCount})` : `${role}s`}
                    </button>
                  ))}

                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginLeft: '8px' }}>Status:</span>
                  {['All', 'Inside', 'Outside'].map(st => (
                    <button
                      key={st}
                      type="button"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: memberStatusFilter === st ? '1.5px solid #059669' : '1px solid #cbd5e1',
                        background: memberStatusFilter === st ? '#ecfdf5' : '#ffffff',
                        color: memberStatusFilter === st ? '#065f46' : '#475569',
                        fontWeight: memberStatusFilter === st ? 800 : 600,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setMemberStatusFilter(st)}
                    >
                      {st === 'All' ? 'All Status' : st === 'Inside' ? `🟢 Inside (${memberInsideCount})` : `⚪ Outside (${memberOutsideCount})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members List Scrollable Container */}
              {loadingMembers ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
                  Loading registered campus members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <Users size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No registered members match filter</div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Click "Register New" above to register new Students, Staff or HODs.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredMembers.map(m => {
                    const isInside = m.currentStatus === 'Inside Campus';
                    const badge = getPersonTypeBadge(m.personType);
                    const isSelected = identifiedPerson?.personId === m.personId;

                    return (
                      <div
                        key={m.personId || m._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => {
                          setIdentifiedPerson(m);
                          setSearchInput(m.personId);
                          handleLookupMember(m.personId, true);
                        }}
                      >
                        {/* Member Identity Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {badge.icon}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{m.name}</strong>
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`
                              }}>
                                {m.personType}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{m.personId}</span>
                              {m.department ? ` • ${m.department}` : ''}
                              {m.phone ? ` • 📞 ${m.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Status & Quick Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isInside ? '#dcfce7' : '#f1f5f9',
                            color: isInside ? '#15803d' : '#64748b',
                            border: `1px solid ${isInside ? '#86efac' : '#cbd5e1'}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {isInside ? '🟢 INSIDE' : '⚪ OUTSIDE'}
                          </span>

                          {/* Quick 1-Click Action */}
                          {isInside ? (
                            <button
                              type="button"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                borderRadius: '6px',
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordOutForPerson(m);
                              }}
                              disabled={actionLoading}
                              title="Record Campus Out (Logout)"
                            >
                              <LogOut size={12} />
                              <span>Logout</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                borderRadius: '6px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRecordInForPerson(m);
                              }}
                              disabled={actionLoading}
                              title="Record Campus In (Login)"
                            >
                              <LogIn size={12} />
                              <span>Login</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Loaded Member Identity & Gate Actions */}
          <div>
            {identifiedPerson ? (() => {
              const badge = getPersonTypeBadge(identifiedPerson.personType);
              const isInside = identifiedPerson.currentStatus === 'Inside Campus';

              return (
                <div className="wmn-card" style={{
                  border: isInside ? '2px solid #059669' : '2px solid #2563eb',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                }}>
                  {/* Status Banner */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: isInside ? '#ecfdf5' : '#eff6ff',
                    border: `1.5px solid ${isInside ? '#6ee7b7' : '#93c5fd'}`,
                    color: isInside ? '#065f46' : '#1e40af'
                  }}>
                    {isInside ? <CheckCircle2 size={24} style={{ color: '#059669', flexShrink: 0 }} /> : <Clock size={24} style={{ color: '#2563eb', flexShrink: 0 }} />}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                        {isInside ? 'MEMBER CURRENTLY LOGGED IN (INSIDE CAMPUS)' : 'MEMBER CURRENTLY LOGGED OUT (OUTSIDE CAMPUS)'}
                      </div>
                      <div style={{ fontSize: '0.78rem', marginTop: '2px', opacity: 0.9 }}>
                        {isInside
                          ? `Inside campus since ${identifiedPerson.lastEntryTime ? new Date(identifiedPerson.lastEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}. Ready for departure checkout.`
                          : 'Outside campus. Ready for security clearance & gate entry.'}
                      </div>
                    </div>
                  </div>

                  {/* Header Profile */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {badge.icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{identifiedPerson.name}</h3>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`
                          }}>
                            {identifiedPerson.personType}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {identifiedPerson.department} • {identifiedPerson.designation || 'Member'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.92rem',
                        background: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        color: '#2563eb',
                        display: 'block'
                      }}>
                        {identifiedPerson.personId}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIdentifiedPerson(null);
                          setSearchInput('');
                          setErrorMsg('');
                          setSuccessMsg('');
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.74rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                        title="Clear and scan next member"
                      >
                        ✕ Clear
                      </button>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    fontSize: '0.82rem',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Contact Phone</span>
                      <strong style={{ color: '#0f172a' }}>📞 {identifiedPerson.phone || '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Vehicle #</span>
                      <strong style={{ color: '#0f172a' }}>🚗 {identifiedPerson.vehicleNumber || 'Pedestrian'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Last Entry Time</span>
                      <strong style={{ color: '#0f172a' }}>
                        {identifiedPerson.lastEntryTime ? new Date(identifiedPerson.lastEntryTime).toLocaleString('en-IN') : 'None recorded'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Last Exit Time</span>
                      <strong style={{ color: '#0f172a' }}>
                        {identifiedPerson.lastExitTime ? new Date(identifiedPerson.lastExitTime).toLocaleString('en-IN') : 'None recorded'}
                      </strong>
                    </div>
                  </div>

                  {/* Optional Movement Remarks */}
                  <div className="wmn-form-group" style={{ marginBottom: '16px' }}>
                    <label className="wmn-form-label" style={{ fontSize: '0.78rem' }}>Movement Remarks (Optional)</label>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. Regular classes, Lab visit, Official meeting..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>

                  {/* TWO DEDICATED ACTION BUTTONS: LOGIN / CAMPUS IN & LOGOUT / CAMPUS OUT */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {/* Button 1: Campus In (Login) */}
                    <button
                      type="button"
                      className="wmn-btn"
                      style={{
                        background: isInside ? '#f1f5f9' : '#059669',
                        color: isInside ? '#94a3b8' : '#ffffff',
                        border: `1px solid ${isInside ? '#cbd5e1' : '#047857'}`,
                        padding: '12px 14px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: isInside ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: isInside ? 'none' : '0 4px 12px rgba(5,150,105,0.25)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => handleRecordInForPerson()}
                      disabled={actionLoading || isInside}
                      title={isInside ? 'Person is already inside campus. Must record Campus Out first.' : 'Record campus entry (Login)'}
                    >
                      <LogIn size={18} />
                      <span>Login / Campus In</span>
                    </button>

                    {/* Button 2: Campus Out (Logout) */}
                    <button
                      type="button"
                      className="wmn-btn"
                      style={{
                        background: !isInside ? '#f1f5f9' : '#dc2626',
                        color: !isInside ? '#94a3b8' : '#ffffff',
                        border: `1px solid ${!isInside ? '#cbd5e1' : '#b91c1c'}`,
                        padding: '12px 14px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        cursor: !isInside ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: !isInside ? 'none' : '0 4px 12px rgba(220,38,38,0.25)',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => handleRecordOutForPerson()}
                      disabled={actionLoading || !isInside}
                      title={!isInside ? 'Person is currently outside campus. Must record Campus In first.' : 'Record campus exit (Logout)'}
                    >
                      <LogOut size={18} />
                      <span>Logout / Campus Out</span>
                    </button>
                  </div>

                  {/* Recent Movement History for this Person */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Recent Movement History ({personMovements.length})
                    </span>

                    {personMovements.length === 0 ? (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No recorded movements today for this individual.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                        {personMovements.map(m => (
                          <div
                            key={m.movementId || m._id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: m.direction === 'In' ? '#ecfdf5' : '#f8fafc',
                              border: `1px solid ${m.direction === 'In' ? '#a7f3d0' : '#e2e8f0'}`,
                              fontSize: '0.78rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: m.direction === 'In' ? '#059669' : '#64748b',
                                color: '#ffffff'
                              }}>
                                {m.direction === 'In' ? 'IN' : 'OUT'}
                              </span>
                              <span>{m.gate || 'Gate 1'} • {m.remarks || m.reason || 'Gate Movement'}</span>
                            </div>
                            <span style={{ color: '#64748b', fontSize: '0.74rem' }}>
                              {new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="wmn-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Shield size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Member Identity Loaded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Scan a QR card using the camera, scan with a barcode gun, or select from the Registered Members list on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODE 2: VISITOR & PRE-VISITOR PASS SCANNER                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeMode === 'visitor_scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '24px' }}>
          {/* Left Column: Pass Search + Camera + AUTOMATICALLY SHOWN REGISTERED & PRE-VISITORS */}
          <div>
            {/* 1. Barcode Scan Gun / Pass Search at Top */}
            <div className="wmn-card" style={{ marginBottom: '16px', border: '1.5px solid #93c5fd', background: '#f8fafc' }}>
              <div className="wmn-card-header" style={{ marginBottom: '10px' }}>
                <div className="wmn-card-title">
                  <Search size={18} style={{ color: '#2563eb' }} />
                  <h3 style={{ fontSize: '0.95rem' }}>Barcode Scanner Gun / Manual Visitor Pass Lookup</h3>
                </div>
                <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  Supports Pass # & Mobile
                </span>
              </div>
              <form onSubmit={handleVerifyVisitorSubmit}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="wmn-form-input"
                      style={{ paddingLeft: '36px', fontSize: '0.92rem', fontWeight: 600 }}
                      placeholder="Scan pass barcode gun or type Pass # (e.g. PASS-...), Visitor Mobile #..."
                      value={passQuery}
                      onChange={(e) => setPassQuery(e.target.value)}
                      autoFocus
                    />
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    {passQuery && (
                      <button
                        type="button"
                        onClick={() => setPassQuery('')}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="wmn-btn-primary"
                    disabled={visitorLoading}
                    style={{ whiteSpace: 'nowrap', padding: '0 18px', fontWeight: 700 }}
                  >
                    <Search size={15} />
                    <span>{visitorLoading ? 'Verifying...' : 'Verify Pass'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Live Camera Scanner Box (Compact on Standby) */}
            <div className="wmn-card" style={{ marginBottom: '16px' }}>
              <div className="wmn-card-header" style={{ marginBottom: '12px' }}>
                <div className="wmn-card-title">
                  <Camera size={18} style={{ color: '#2563eb' }} />
                  <h3>Live Camera QR Scanner (Visitor Passes)</h3>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {cameraActive && (
                    <button
                      type="button"
                      className="wmn-btn-sec"
                      style={{ fontSize: '0.74rem', padding: '4px 8px' }}
                      onClick={toggleCameraFacing}
                      title="Flip camera"
                    >
                      <RefreshCw size={13} />
                      <span>Flip</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', background: cameraActive ? '#fee2e2' : '#eff6ff', color: cameraActive ? '#dc2626' : '#2563eb' }}
                    onClick={cameraActive ? stopCamera : startCamera}
                  >
                    {cameraActive ? <><CameraOff size={13} /> Stop Camera</> : <><Camera size={13} /> Start Camera</>}
                  </button>
                </div>
              </div>

              {/* Camera Viewfinder */}
              <div style={{
                position: 'relative',
                background: '#0f172a',
                borderRadius: '10px',
                overflow: 'hidden',
                aspectRatio: cameraActive ? '16/9' : '21/9',
                maxHeight: cameraActive ? '400px' : '150px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: scanPulse ? '2.5px solid #10b981' : '1.5px solid #334155',
                transition: 'border 0.2s ease'
              }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none'
                  }}
                />

                {!cameraActive && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '14px' }}>
                    <ShieldCheck size={36} style={{ color: '#475569', margin: '0 auto 6px auto' }} />
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem' }}>Visitor QR scanner is on standby.</p>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                        onClick={startCamera}
                      >
                        <Camera size={14} />
                        <span>Activate Camera</span>
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ fontSize: '0.78rem', padding: '6px 14px', background: '#1e293b', color: '#f8fafc', border: '1px solid #475569' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Upload Pass QR</span>
                      </button>
                    </div>
                  </div>
                )}

                {cameraActive && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '65%',
                    height: '65%',
                    border: '2px dashed rgba(255,255,255,0.7)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)'
                  }} />
                )}
              </div>
            </div>



            {/* 3. AUTOMATICALLY SHOWN REGISTERED & PRE-REGISTERED VISITORS SECTION */}
            <div className="wmn-card">
              <div className="wmn-card-header" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div className="wmn-card-title">
                  <ShieldCheck size={18} style={{ color: '#2563eb' }} />
                  <h3>Registered & Pre-Registered Visitors ({filteredVisitors.length})</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.74rem', padding: '4px 10px' }}
                    onClick={fetchVisitors}
                    title="Refresh visitors from database"
                  >
                    <RefreshCw size={12} className={loadingVisitors ? 'wmn-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    className="wmn-btn-sec"
                    style={{ fontSize: '0.74rem', padding: '4px 10px', color: '#2563eb' }}
                    onClick={() => navigate('/watchman/visitor-entry')}
                  >
                    <UserPlus size={12} />
                    <span>New Visitor Entry</span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar for Visitors */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <input
                  type="text"
                  className="wmn-form-input"
                  style={{ fontSize: '0.82rem', padding: '8px 12px' }}
                  placeholder="Filter visitors by name, pass #, mobile, host person, department..."
                  value={visitorSearch}
                  onChange={(e) => setVisitorSearch(e.target.value)}
                />

                {/* Status Filter Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Filter:</span>
                  {[
                    { key: 'All', label: `All Visitors (${visitorsList.length})` },
                    { key: 'Inside', label: `🟢 Inside Campus (${visitorInsideCount})` },
                    { key: 'Pre-Registered', label: `🔵 Pre-Registered (${visitorPreRegCount})` },
                    { key: 'Checked Out', label: `⚪ Checked Out (${visitorCheckedOutCount})` }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: visitorStatusFilter === tab.key ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: visitorStatusFilter === tab.key ? '#eff6ff' : '#ffffff',
                        color: visitorStatusFilter === tab.key ? '#1d4ed8' : '#475569',
                        fontWeight: visitorStatusFilter === tab.key ? 800 : 600,
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => setVisitorStatusFilter(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visitors List Scrollable Container */}
              {loadingVisitors ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.85rem' }}>
                  Loading visitors registry...
                </div>
              ) : filteredVisitors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <ShieldCheck size={32} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>No visitors found matching filter</div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Click "New Visitor Entry" above to record a new walk-in visitor.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredVisitors.map(v => {
                    const isInside = v.status === 'Inside';
                    const isPreReg = v.status === 'Pre-Registered';
                    const isPreRegApproved = isPreReg && v.approvalStatus === 'Approved';
                    const isPreRegPending = isPreReg && v.approvalStatus !== 'Approved';
                    const isCheckedOut = v.status === 'Checked Out';
                    const isSelected = (passQuery === v.passNumber || passQuery === v.visitorId || visitorResult?.data?.passNumber === v.passNumber || visitorResult?.data?._id === v._id);

                    return (
                      <div
                        key={v._id || v.passNumber || v.visitorId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.15)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => handleSelectVisitorCard(v)}
                      >
                        {/* Visitor Details */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: isInside ? '#ecfdf5' : isPreRegApproved ? '#eff6ff' : isPreRegPending ? '#fffbeb' : '#f8fafc',
                            border: `1px solid ${isInside ? '#6ee7b7' : isPreRegApproved ? '#93c5fd' : isPreRegPending ? '#fde68a' : '#cbd5e1'}`,
                            color: isInside ? '#059669' : isPreRegApproved ? '#2563eb' : isPreRegPending ? '#d97706' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <ShieldCheck size={18} />
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{v.name}</strong>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                                color: '#2563eb',
                                background: '#f1f5f9',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                {v.passNumber || v.visitorId}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                              <span>To Meet: <strong>{v.personToMeet || 'Host'}</strong> ({v.department || 'General'})</span>
                              {v.phone ? ` • 📞 ${v.phone}` : ''}
                            </div>
                          </div>
                        </div>

                        {/* Status & Quick Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: isInside ? '#dcfce7' : isPreRegApproved ? '#eff6ff' : isPreRegPending ? '#fef3c7' : '#f1f5f9',
                            color: isInside ? '#15803d' : isPreRegApproved ? '#1e40af' : isPreRegPending ? '#b45309' : '#64748b',
                            border: `1px solid ${isInside ? '#86efac' : isPreRegApproved ? '#bfdbfe' : isPreRegPending ? '#fde68a' : '#cbd5e1'}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {isInside ? '🟢 INSIDE' : isPreRegApproved ? '🔵 PRE-REG APPROVED' : isPreRegPending ? '🟡 PENDING' : '⚪ CHECKED OUT'}
                          </span>

                          {/* Quick 1-Click Action */}
                          {isInside && (
                            <button
                              type="button"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                borderRadius: '6px',
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickCheckoutVisitor(v);
                              }}
                              disabled={visitorLoading}
                              title="Checkout Visitor"
                            >
                              <ExitIcon size={12} />
                              <span>Checkout</span>
                            </button>
                          )}

                          {isPreRegApproved && (
                            <button
                              type="button"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 800,
                                borderRadius: '6px',
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickAdmitVisitor(v);
                              }}
                              disabled={visitorLoading}
                              title="Admit Pre-Registered Visitor"
                            >
                              <Check size={12} />
                              <span>Admit</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Loaded Visitor Pass Clearance Card */}
          <div>
            {visitorResult ? (() => {
              const visitor = visitorResult.data || visitorResult.visitor || visitorResult;
              const isInside = visitor?.status === 'Inside';
              const isCheckedOut = visitor?.status === 'Checked Out';
              const isPreRegApproved = visitor?.status === 'Pre-Registered' && visitor?.approvalStatus === 'Approved';
              const isPreRegPending = visitor?.status === 'Pre-Registered' && visitor?.approvalStatus !== 'Approved';
              const isExpired = visitor?.status === 'Expired' || visitor?.status === 'Rejected';

              const isValid = visitorResult.valid !== undefined
                ? visitorResult.valid
                : (isInside || isPreRegApproved || (visitor?.status !== 'Checked Out' && visitor?.status !== 'Expired' && visitor?.status !== 'Rejected'));

              let headerBg = '#dcfce7';
              let headerColor = '#166534';
              let headerBorder = '#86efac';
              let headerIcon = <CheckCircle2 size={24} style={{ color: '#166534', flexShrink: 0 }} />;
              let headerTitle = 'OFFICIAL VALID VISITOR PASS';
              let headerSubtitle = visitorResult.statusMessage || 'Pass verified against campus security registry.';

              if (isInside) {
                headerBg = '#ecfdf5';
                headerColor = '#065f46';
                headerBorder = '#6ee7b7';
                headerIcon = <CheckCircle2 size={24} style={{ color: '#059669', flexShrink: 0 }} />;
                headerTitle = 'VISITOR CURRENTLY LOGGED IN (INSIDE CAMPUS)';
                headerSubtitle = `Visitor is inside campus (entered at ${visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}). Pass verified. Ready for departure checkout.`;
              } else if (isCheckedOut) {
                headerBg = '#f1f5f9';
                headerColor = '#334155';
                headerBorder = '#cbd5e1';
                headerIcon = <Clock size={24} style={{ color: '#64748b', flexShrink: 0 }} />;
                headerTitle = 'VISITOR PASS CHECKED OUT (LOGGED OUT)';
                headerSubtitle = visitorResult.statusMessage || `Visitor has completed visit and departed campus.`;
              } else if (isPreRegApproved) {
                headerBg = '#eff6ff';
                headerColor = '#1e40af';
                headerBorder = '#93c5fd';
                headerIcon = <CheckCircle2 size={24} style={{ color: '#2563eb', flexShrink: 0 }} />;
                headerTitle = 'PRE-REGISTERED PASS APPROVED (READY FOR ENTRY)';
                headerSubtitle = 'Visitor pass is approved by host department. Ready for campus entry check-in.';
              } else if (isPreRegPending) {
                headerBg = '#fffbeb';
                headerColor = '#92400e';
                headerBorder = '#fde68a';
                headerIcon = <Clock size={24} style={{ color: '#d97706', flexShrink: 0 }} />;
                headerTitle = 'APPOINTMENT PENDING HOST APPROVAL';
                headerSubtitle = 'This visitor appointment is pending approval from the host department.';
              } else if (!isValid || isExpired) {
                headerBg = '#fee2e2';
                headerColor = '#991b1b';
                headerBorder = '#fca5a5';
                headerIcon = <XCircle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />;
                headerTitle = 'PASS INACTIVE / EXPIRED';
                headerSubtitle = visitorResult.statusMessage || 'This pass cannot be used for gate clearance.';
              }

              const cardBorder = isInside ? '2px solid #059669' : isCheckedOut ? '2px solid #94a3b8' : isValid ? '2px solid #10b981' : '2px solid #ef4444';

              return (
                <div className="wmn-card" style={{
                  border: cardBorder,
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: headerBg,
                    border: `1px solid ${headerBorder}`,
                    color: headerColor
                  }}>
                    {headerIcon}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                        {headerTitle}
                      </div>
                      <div style={{ fontSize: '0.8rem', marginTop: '2px', opacity: 0.9 }}>{headerSubtitle}</div>
                    </div>
                  </div>

                  {visitor && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{visitor.name}</h3>
                          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>📞 {visitor.phone || 'No phone provided'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            background: '#f1f5f9',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            color: '#2563eb',
                            border: '1px solid #cbd5e1'
                          }}>
                            {visitor.passNumber || visitor.visitorId}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setVisitorResult(null);
                              setPassQuery('');
                              setErrorMsg('');
                              setSuccessMsg('');
                            }}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '0.74rem',
                              color: '#64748b',
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                            title="Clear and scan next visitor pass"
                          >
                            ✕ Clear
                          </button>
                        </div>
                      </div>

                      <div style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '14px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        fontSize: '0.82rem',
                        marginBottom: '16px'
                      }}>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Person to Meet</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.personToMeet || '—'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Department</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.department || 'General'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Purpose</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.purpose || 'Official Visit'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Vehicle #</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.vehicleNumber || 'Pedestrian / None'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Gate</span>
                          <strong style={{ color: '#0f172a' }}>{visitor.gate || 'Gate 1 (Main Entrance)'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', display: 'block' }}>Current Status</span>
                          <span style={{
                            display: 'inline-block',
                            marginTop: '2px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.76rem',
                            background: visitor.status === 'Inside' ? '#ecfdf5' : visitor.status === 'Checked Out' ? '#f1f5f9' : '#eff6ff',
                            color: visitor.status === 'Inside' ? '#059669' : visitor.status === 'Checked Out' ? '#475569' : '#2563eb',
                            border: `1px solid ${visitor.status === 'Inside' ? '#6ee7b7' : '#cbd5e1'}`
                          }}>
                            {visitor.status === 'Inside' ? '🟢 Inside Campus (Logged In)' : visitor.status === 'Checked Out' ? '⚪ Checked Out (Logged Out)' : visitor.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap' }}>
                        {visitor.status === 'Inside' && (
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{
                              background: '#dc2626',
                              flex: 1,
                              justifyContent: 'center',
                              padding: '10px 16px',
                              fontSize: '0.88rem',
                              fontWeight: 700,
                              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                            }}
                            onClick={() => handleQuickCheckoutVisitor()}
                            disabled={visitorLoading}
                          >
                            <ExitIcon size={18} />
                            <span>Confirm Visitor Exit / Checkout (Logout)</span>
                          </button>
                        )}

                        {visitor.status === 'Pre-Registered' && visitor.approvalStatus === 'Approved' && (
                          <button
                            type="button"
                            className="wmn-btn-primary"
                            style={{
                              background: '#059669',
                              flex: 1,
                              justifyContent: 'center',
                              padding: '10px 16px',
                              fontSize: '0.88rem',
                              fontWeight: 700
                            }}
                            onClick={() => handleQuickAdmitVisitor()}
                            disabled={visitorLoading}
                          >
                            <Check size={18} />
                            <span>Admit Pre-Registered Visitor (Login)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="wmn-btn-sec"
                          style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                          onClick={() => {
                            if (visitor.passNumber) {
                              handleLookupVisitorDirect(visitor.passNumber);
                            }
                          }}
                          disabled={visitorLoading}
                          title="Refresh live status from database"
                        >
                          <RefreshCw size={15} />
                          <span>Refresh Pass</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="wmn-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Shield size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Visitor Pass Loaded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Scan a visitor's QR badge, enter a pass number, or select from the Registered Visitors list on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QrVerificationPage;
