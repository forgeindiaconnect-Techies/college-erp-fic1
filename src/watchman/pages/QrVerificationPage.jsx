import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  QrCode, Search, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, Phone, MapPin, Building2, LogOut as ExitIcon,
  Shield, Check, ArrowRight, ArrowLeft, RefreshCw, Users,
  Sparkles, Camera, CameraOff, AlertCircle, UserPlus,
  LogIn, LogOut, GraduationCap, UserCheck, ShieldCheck,
  ChevronRight, Calendar, Upload, Image as ImageIcon
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
  getCampusPeople
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

  // Mode: 'unified_scanner' (default: Students, Staff, HODs, Visitors) | 'visitor_pass'
  const initialParams = new URLSearchParams(location.search);
  const initialType = initialParams.get('type');
  const initialCode = initialParams.get('code') || initialParams.get('id');

  const [activeMode, setActiveMode] = useState(
    initialType === 'visitor' || initialCode?.startsWith('PASS-') || initialCode?.startsWith('V-')
      ? 'visitor_pass'
      : 'unified_scanner'
  );

  // Selected Gate
  const [gate, setGate] = useState('Gate 1 (Main Entrance)');
  const [remarks, setRemarks] = useState('');

  // ══════════════════════════════════════════════════════════
  // UNIFIED SCANNER STATE (Students, Staff, HODs, Visitors)
  // ══════════════════════════════════════════════════════════
  const [searchInput, setSearchInput] = useState(initialCode || '');
  const [lookingUp, setLookingUp] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [identifiedPerson, setIdentifiedPerson] = useState(null);
  const [personMovements, setPersonMovements] = useState([]);
  const [activePeopleList, setActivePeopleList] = useState([]);
  const [loadingActivePeople, setLoadingActivePeople] = useState(false);

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
    todayExits: 0
  });

  // Success / Error Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // ══════════════════════════════════════════════════════════
  // VISITOR PASS VERIFICATION STATE (Preserved)
  // ══════════════════════════════════════════════════════════
  const [passQuery, setPassQuery] = useState(initialCode || '');
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [visitorResult, setVisitorResult] = useState(null);
  const [activeVisitorsList, setActiveVisitorsList] = useState([]);
  const [loadingActiveVisitors, setLoadingActiveVisitors] = useState(false);

  // Fetch Movement Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getCampusMovementStats();
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.warn('Stats fetch notice:', e.message);
    }
  }, []);

  // Fetch People currently inside campus for quick selector
  const fetchActivePeople = useCallback(async () => {
    try {
      setLoadingActivePeople(true);
      const res = await getCampusPeople({ status: 'Inside Campus' });
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setActivePeopleList(list);
    } catch (err) {
      console.error('Failed to load active people:', err);
    } finally {
      setLoadingActivePeople(false);
    }
  }, []);

  // Fetch active visitors for visitor pass mode
  const fetchActiveVisitors = useCallback(async () => {
    try {
      setLoadingActiveVisitors(true);
      const res = await getActiveVisitors();
      const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setActiveVisitorsList(list);
    } catch (err) {
      console.error('Failed to load active visitors:', err);
    } finally {
      setLoadingActiveVisitors(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchActivePeople();
    if (activeMode === 'visitor_pass') {
      fetchActiveVisitors();
    }
  }, [fetchStats, fetchActivePeople, fetchActiveVisitors, activeMode]);

  // Real-time synchronization
  useRealtimeSync(() => {
    fetchStats();
    fetchActivePeople();
    if (activeMode === 'visitor_pass') {
      fetchActiveVisitors();
    }
  }, ['campus_movement', 'campus_people', 'watchman', 'student_tracking', 'visitors', 'visitor']);

  // Auto-sync visitorResult if activeVisitorsList loads or updates and matches current passQuery
  useEffect(() => {
    if (activeMode === 'visitor_pass' && passQuery && activeVisitorsList.length > 0) {
      const clean = passQuery.trim().toLowerCase();
      const matched = activeVisitorsList.find(
        v => (v.passNumber && v.passNumber.toLowerCase() === clean) ||
             (v.visitorId && v.visitorId.toLowerCase() === clean) ||
             (v.phone && v.phone === clean)
      );
      if (matched && (!visitorResult || (visitorResult?.data?.passNumber || visitorResult?.passNumber) !== matched.passNumber)) {
        setVisitorResult({
          success: true,
          valid: true,
          validationStatus: matched.status === 'Inside' ? 'INSIDE' : 'VALID',
          statusMessage: 'Visitor is currently inside campus (Active Pass). Ready for departure checkout.',
          data: matched,
          visitor: matched
        });
      }
    }
  }, [activeVisitorsList, passQuery, activeMode]);

  // Auto-lookup on URL parameter change
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
      setActiveMode('visitor_pass');
      setIdentifiedPerson(null); // Clear previous unified scanner person (e.g. Rahul)
      if (code) {
        setPassQuery(code);
        setSearchInput(code);
        setVisitorResult(null); // Clear previous visitor immediately to prevent showing wrong person
        handleLookupVisitorDirect(code);
      }
    } else if (code) {
      setActiveMode('unified_scanner');
      setSearchInput(code);
      setIdentifiedPerson(null); // Clear previous person before looking up
      setVisitorResult(null);
      handleLookupUnified(code);
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

          setSearchInput(cleanCode);
          handleLookupUnified(cleanCode);
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
        setSearchInput(decoded.trim());
        handleLookupUnified(decoded.trim());
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
  // UNIFIED PERSON LOOKUP (Students, Staff, HODs, Visitors)
  // ══════════════════════════════════════════════════════════
  const handleLookupUnified = async (codeToLookup, isSilent = false) => {
    let code = (codeToLookup || searchInput).trim();
    if (code.includes('code=')) {
      try {
        const match = code.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) code = decodeURIComponent(match[1]).trim();
      } catch (_) {}
    }

    if (!code) {
      if (!isSilent) setErrorMsg('Please enter or scan a Student ID, Staff ID, Pass Number, or mobile number');
      return;
    }

    try {
      if (!isSilent) setLookingUp(true);
      setErrorMsg('');
      if (!isSilent) setSuccessMsg('');

      const res = await lookupCampusPerson(code);
      if (res.data?.success && res.data?.person) {
        setIdentifiedPerson(res.data.person);
        setPersonMovements(res.data.movements || []);
        setSearchInput(res.data.person.personId);
      } else {
        setIdentifiedPerson(null);
        setErrorMsg(`No person found matching "${code}". Please register them using "Register New Person".`);
      }
    } catch (err) {
      setIdentifiedPerson(null);
      setErrorMsg(err.response?.data?.message || `No registered person found matching "${code}".`);
    } finally {
      if (!isSilent) setLookingUp(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // CAMPUS IN (LOGIN) & CAMPUS OUT (LOGOUT) ACTIONS
  // ══════════════════════════════════════════════════════════
  const handleRecordIn = async () => {
    if (!identifiedPerson) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await recordCampusIn({
        personId: identifiedPerson.personId,
        gate,
        remarks: remarks.trim() || 'Gate Entry Logged'
      });

      if (res.data?.success) {
        setSuccessMsg(`Campus Entry Recorded! ${identifiedPerson.name} (${identifiedPerson.personId}) is now INSIDE CAMPUS.`);
        setRemarks('');
        // Refresh person record & stats
        await handleLookupUnified(identifiedPerson.personId, true);
        fetchStats();
        fetchActivePeople();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to record Campus In');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordOut = async () => {
    if (!identifiedPerson) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await recordCampusOut({
        personId: identifiedPerson.personId,
        gate,
        remarks: remarks.trim() || 'Gate Departure Logged'
      });

      if (res.data?.success) {
        setSuccessMsg(`Campus Exit Recorded! ${identifiedPerson.name} (${identifiedPerson.personId}) has DEPARTED campus.`);
        setRemarks('');
        // Refresh person record & stats
        await handleLookupUnified(identifiedPerson.personId, true);
        fetchStats();
        fetchActivePeople();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to record Campus Out');
    } finally {
      setActionLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // VISITOR PASS ACTIONS (Preserved)
  // ══════════════════════════════════════════════════════════
  const handleSelectActiveVisitor = (v) => {
    if (!v) return;
    const pNum = (v.passNumber || v.visitorId || '').trim();
    setPassQuery(pNum);
    setErrorMsg('');
    setSuccessMsg('');
    // Instantly set the visitor clearance card with the real-time active visitor data
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
    // Asynchronously perform background verification to ensure live sync
    if (pNum) {
      handleLookupVisitorDirect(pNum, true);
    }
  };

  const handleVerifyVisitor = async (e) => {
    if (e) e.preventDefault();
    let query = (passQuery || '').trim();
    if (!query) {
      setErrorMsg('Please enter a Pass Number, Visitor ID, or mobile number to verify');
      return;
    }

    if (query.includes('code=')) {
      try {
        const match = query.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) {
          query = decodeURIComponent(match[1]).trim();
          setPassQuery(query);
        }
      } catch (_) {}
    }

    // Direct active visitor match from live state
    const matchedActive = (activeVisitorsList || []).find(
      v => (v.passNumber && v.passNumber.toLowerCase() === query.toLowerCase()) ||
           (v.visitorId && v.visitorId.toLowerCase() === query.toLowerCase()) ||
           (v.phone && v.phone === query) ||
           (v.name && v.name.toLowerCase() === query.toLowerCase())
    );

    if (matchedActive) {
      handleSelectActiveVisitor(matchedActive);
      return;
    }

    try {
      setVisitorLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      setVisitorResult(null); // Clear previous visitor result to prevent showing stale records
      const res = await verifyVisitorPass(query);
      if (res.data?.success && res.data?.data) {
        setVisitorResult(res.data);
      } else {
        setVisitorResult(null);
        setErrorMsg(res.data?.message || 'Pass record not found.');
      }
    } catch (err) {
      setVisitorResult(null);
      setErrorMsg(err.response?.data?.message || 'Verification failed. Pass record not found.');
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleLookupVisitorDirect = async (code, silentPreload = false) => {
    if (!code) return;
    let cleanCode = code.toString().trim();
    if (cleanCode.includes('code=')) {
      try {
        const match = cleanCode.match(/[?&]code=([^&#]+)/);
        if (match && match[1]) {
          cleanCode = decodeURIComponent(match[1]).trim();
        }
      } catch (_) {}
    }
    setPassQuery(cleanCode);

    // If matching active visitor is already loaded in memory, sync immediately
    if (!silentPreload) {
      const matched = (activeVisitorsList || []).find(
        v => (v.passNumber && v.passNumber.toLowerCase() === cleanCode.toLowerCase()) ||
             (v.visitorId && v.visitorId.toLowerCase() === cleanCode.toLowerCase())
      );
      if (matched) {
        setVisitorResult({
          success: true,
          valid: true,
          validationStatus: matched.status === 'Inside' ? 'INSIDE' : 'VALID',
          statusMessage: 'Visitor is currently inside campus (Active Pass). Ready for departure checkout.',
          data: matched,
          visitor: matched
        });
        silentPreload = true;
      }
    }

    try {
      setVisitorLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      if (!silentPreload) {
        setVisitorResult(null); // Clear stale previous visitor
      }
      const res = await verifyVisitorPass(cleanCode);
      if (res.data?.success && res.data?.data) {
        setVisitorResult(res.data);
      } else if (!silentPreload) {
        setVisitorResult(null);
        setErrorMsg(res.data?.message || 'Pass record not found.');
      }
    } catch (err) {
      if (!silentPreload) {
        setVisitorResult(null);
      }
      setErrorMsg(err.response?.data?.message || 'Verification failed. Pass record not found.');
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleQuickCheckoutVisitor = async () => {
    const v = visitorResult?.data || visitorResult;
    if (!v?._id) return;
    try {
      setVisitorLoading(true);
      setErrorMsg('');
      const res = await recordVisitorExit(v._id);
      if (res.data?.success) {
        setSuccessMsg(`Visitor ${v.name || 'Pass'} has been successfully Checked Out.`);
        if (v.passNumber) {
          handleLookupVisitorDirect(v.passNumber);
        }
        fetchActiveVisitors();
        fetchStats();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Checkout failed');
    } finally {
      setVisitorLoading(false);
    }
  };

  const handleQuickAdmitVisitor = async () => {
    const v = visitorResult?.data || visitorResult;
    if (!v?._id) return;
    try {
      setVisitorLoading(true);
      setErrorMsg('');
      const res = await admitPreRegisteredVisitor(v._id);
      if (res.data?.success) {
        setSuccessMsg(`Pre-registered visitor ${v.name || 'Pass'} admitted successfully.`);
        if (v.passNumber) {
          handleLookupVisitorDirect(v.passNumber);
        }
        fetchActiveVisitors();
        fetchStats();
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Admission failed');
    } finally {
      setVisitorLoading(false);
    }
  };

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

  return (
    <div className="wmn-page-container">
      {/* Page Header */}
      <div className="wmn-page-header">
        <div className="wmn-page-title-group">
          <h2>
            <QrCode size={24} style={{ color: '#2563eb' }} />
            <span>Campus Gate QR Scanner & Movement Control</span>
          </h2>
          <p>Scan official QR cards or search IDs for Students, Staff, HODs, and Visitors to record automated Campus In (Login) and Campus Out (Logout)</p>
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

      {/* Real-time Movement Metric Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogIn size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Currently Inside</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{stats.currentlyInside || 0}</div>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Registered</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>{stats.totalRegistered || 0}</div>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Outside Campus</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#64748b' }}>{stats.currentlyOutside || 0}</div>
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
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className="wmn-btn"
          style={{
            background: activeMode === 'unified_scanner' ? '#2563eb' : '#ffffff',
            color: activeMode === 'unified_scanner' ? '#ffffff' : '#475569',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            padding: '8px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeMode === 'unified_scanner' ? '0 2px 6px rgba(37,99,235,0.2)' : 'none'
          }}
          onClick={() => {
            setActiveMode('unified_scanner');
            setErrorMsg('');
            setSuccessMsg('');
          }}
        >
          <QrCode size={18} />
          <span>Unified QR Scanner (All People)</span>
        </button>

        <button
          type="button"
          className="wmn-btn"
          style={{
            background: activeMode === 'visitor_pass' ? '#2563eb' : '#ffffff',
            color: activeMode === 'visitor_pass' ? '#ffffff' : '#475569',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            padding: '8px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeMode === 'visitor_pass' ? '0 2px 6px rgba(37,99,235,0.2)' : 'none'
          }}
          onClick={() => {
            setActiveMode('visitor_pass');
            setErrorMsg('');
            setSuccessMsg('');
            if (!passQuery) {
              setVisitorResult(null);
            }
            fetchActiveVisitors();
          }}
        >
          <ShieldCheck size={18} />
          <span>Visitor Pass Clearance</span>
        </button>
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

      {/* ──────────────── MODE 1: UNIFIED CAMPUS SCANNER ──────────────── */}
      {activeMode === 'unified_scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Camera & Search Input */}
          <div>
            {/* Live Camera Scanner Box */}
            <div className="wmn-card" style={{ marginBottom: '20px' }}>
              <div className="wmn-card-header" style={{ marginBottom: '12px' }}>
                <div className="wmn-card-title">
                  <Camera size={18} style={{ color: '#2563eb' }} />
                  <h3>Live Camera QR Scanner</h3>
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
                    {cameraActive ? <CameraOff size={13} /> : <Camera size={13} />}
                    <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
                  </button>
                </div>
              </div>

              {cameraError && (
                <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.78rem', color: '#92400e', marginBottom: '12px' }}>
                  {cameraError}
                </div>
              )}

              {/* Viewfinder Element */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '240px',
                background: '#0f172a',
                borderRadius: '10px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: scanPulse ? '0 0 0 4px #10b981' : 'none',
                transition: 'box-shadow 0.2s ease'
              }}>
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: cameraActive ? 'block' : 'none'
                  }}
                  playsInline
                  muted
                />

                {!cameraActive && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>
                    <QrCode size={48} style={{ color: '#475569', margin: '0 auto 10px auto' }} />
                    <p style={{ margin: 0, fontSize: '0.84rem' }}>
                      Camera scanner is currently on standby.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                      <button
                        type="button"
                        className="wmn-btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        onClick={startCamera}
                      >
                        <Camera size={14} />
                        <span>Activate Camera</span>
                      </button>
                      <button
                        type="button"
                        className="wmn-btn-sec"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', background: '#f8fafc' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>Upload QR File</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Animated Targeting Scan Frame */}
                {cameraActive && (
                  <div style={{
                    position: 'absolute',
                    width: '180px',
                    height: '180px',
                    border: scanPulse ? '3px solid #10b981' : '2px solid #2563eb',
                    borderRadius: '12px',
                    boxShadow: scanPulse ? '0 0 16px rgba(16,185,129,0.7)' : '0 0 0 9999px rgba(15, 23, 42, 0.45)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'border 0.2s, box-shadow 0.2s'
                  }}>
                    <div style={{
                      width: '100%',
                      height: '2px',
                      background: scanPulse ? '#10b981' : '#3b82f6',
                      boxShadow: scanPulse ? '0 0 10px #10b981' : '0 0 8px #3b82f6',
                      animation: 'scanBeam 2s infinite ease-in-out'
                    }} />
                  </div>
                )}

                {/* Hidden File Input for QR Image Upload */}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Sub-actions under Viewfinder */}
              <div style={{
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem',
                color: '#64748b'
              }}>
                <span>Compatible with phone screens, printed badges & cards</span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={13} />
                  <span>Upload QR Image / Screenshot</span>
                </button>
              </div>
            </div>

            {/* Manual ID / Barcode Gun Search Form */}
            <div className="wmn-card">
              <div className="wmn-card-header" style={{ marginBottom: '8px' }}>
                <div className="wmn-card-title">
                  <Search size={18} style={{ color: '#2563eb' }} />
                  <h3>Scan Gun / Manual ID Search</h3>
                </div>
              </div>

              <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748b' }}>
                Use a barcode scanner gun, type any Student Roll No, Staff Employee ID, Visitor Pass #, or contact phone.
              </p>

              <form onSubmit={(e) => { e.preventDefault(); handleLookupUnified(); }}>
                <div className="wmn-form-group" style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="wmn-form-input"
                      placeholder="e.g. 21CS045, STF-102, PASS-1515-1523 or Mobile #"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="wmn-btn-primary"
                      disabled={lookingUp}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Search size={16} />
                      <span>{lookingUp ? 'Searching...' : 'Search'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Active Inside People Quick Pill Selector */}
              <div style={{
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    🟢 Currently Inside Campus ({activePeopleList.length})
                  </span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                    onClick={fetchActivePeople}
                  >
                    <RefreshCw size={11} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingActivePeople ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading active people...</div>
                ) : activePeopleList.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>No individuals currently inside campus.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                    {activePeopleList.map(p => (
                      <button
                        key={p.personId}
                        type="button"
                        style={{
                          fontSize: '0.74rem',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: identifiedPerson?.personId === p.personId ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          background: identifiedPerson?.personId === p.personId ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        onClick={() => handleLookupUnified(p.personId)}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>{p.personId}</span>
                        <span>: {p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Person Identity & In/Out Movement Action Card */}
          <div>
            {identifiedPerson ? (
              <div className="wmn-card" style={{
                border: identifiedPerson.currentStatus === 'Inside Campus' ? '2px solid #059669' : '2px solid #2563eb',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
              }}>
                {/* Person Header Badge */}
                {(() => {
                  const badge = getPersonTypeBadge(identifiedPerson.personType);
                  const isInside = identifiedPerson.currentStatus === 'Inside Campus';

                  return (
                    <div>
                      <div style={{
                        padding: '14px 18px',
                        borderRadius: '10px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isInside ? '#ecfdf5' : '#f8fafc',
                        border: `1px solid ${isInside ? '#6ee7b7' : '#cbd5e1'}`,
                        color: isInside ? '#065f46' : '#1e293b'
                      }}>
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
                              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{identifiedPerson.name}</h3>
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

                        <div style={{ textAlign: 'right' }}>
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
                          <span style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: isInside ? '#dcfce7' : '#f1f5f9',
                            color: isInside ? '#15803d' : '#64748b',
                            border: `1px solid ${isInside ? '#86efac' : '#cbd5e1'}`
                          }}>
                            {isInside ? '🟢 INSIDE CAMPUS' : '⚪ OUTSIDE CAMPUS'}
                          </span>
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

                      {/* Optional Movement Remarks Input */}
                      <div className="wmn-form-group" style={{ marginBottom: '16px' }}>
                        <label className="wmn-form-label" style={{ fontSize: '0.78rem' }}>Movement Remarks / Purpose (Optional)</label>
                        <input
                          type="text"
                          className="wmn-form-input"
                          placeholder="e.g. Regular classes, Lab visit, Official meeting..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                        />
                      </div>

                      {/* TWO DEDICATED SEPARATE BUTTONS: LOGIN / CAMPUS IN & LOGOUT / CAMPUS OUT */}
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
                          onClick={handleRecordIn}
                          disabled={actionLoading || isInside}
                          title={isInside ? 'Person is already inside campus. Must record Campus Out first.' : 'Record campus entry'}
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
                          onClick={handleRecordOut}
                          disabled={actionLoading || !isInside}
                          title={!isInside ? 'Person is currently outside campus. Must record Campus In first.' : 'Record campus exit'}
                        >
                          <LogOut size={18} />
                          <span>Logout / Campus Out</span>
                        </button>
                      </div>

                      {/* Recent Movement Activity for this Person */}
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
                })()}
              </div>
            ) : (
              <div className="wmn-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <Shield size={48} style={{ color: '#cbd5e1', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No Person Identity Loaded</h4>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Scan a QR card using the live camera, scan with a barcode gun, or search any ID above.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────── MODE 2: VISITOR GATE PASS CLEARANCE (Preserved) ──────────────── */}
      {activeMode === 'visitor_pass' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: Input & Active List */}
          <div className="wmn-card">
            <div className="wmn-card-header">
              <div className="wmn-card-title">
                <QrCode size={18} style={{ color: '#2563eb' }} />
                <h3>Visitor Pass Clearance & Gate Checkout</h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="wmn-btn-sec"
                  style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                  onClick={() => navigate('/watchman/visitor-exit')}
                >
                  <ExitIcon size={13} style={{ color: '#dc2626' }} />
                  <span>Active List</span>
                </button>
                <button
                  type="button"
                  className="wmn-btn-sec"
                  style={{ fontSize: '0.76rem', padding: '4px 8px' }}
                  onClick={() => navigate('/watchman/register-person')}
                >
                  <UserPlus size={13} style={{ color: '#2563eb' }} />
                  <span>New Entry</span>
                </button>
              </div>
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '0.82rem', color: '#64748b' }}>
              Scan the printed visitor QR voucher, use a barcode scanner gun, or enter the Pass Number / Visitor Phone Number below to verify clearance.
            </p>

            <form onSubmit={handleVerifyVisitor}>
              <div className="wmn-form-group">
                <label className="wmn-form-label">
                  Pass Number / QR String / Visitor Mobile #
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    className="wmn-form-input"
                    placeholder="e.g. PASS-1515-1523 or 9840123456"
                    value={passQuery}
                    onChange={(e) => setPassQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="wmn-btn-primary"
                    disabled={visitorLoading}
                  >
                    <Search size={16} />
                    <span>{visitorLoading ? 'Checking...' : 'Verify'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Currently Active Visitors on Campus Quick Selector */}
            <div style={{
              marginTop: '18px',
              padding: '14px',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🟢 Active Visitors Currently on Campus ({activeVisitorsList.length})
                </div>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={fetchActiveVisitors}
                  title="Refresh active visitors list"
                >
                  <RefreshCw size={12} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingActiveVisitors ? (
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Loading active visitors...</div>
              ) : activeVisitorsList.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  No visitors currently inside campus. All visitors checked out.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeVisitorsList.map((v) => {
                    const isSelected = (passQuery === v.passNumber || passQuery === v.visitorId || visitorResult?.data?.passNumber === v.passNumber || visitorResult?.data?._id === v._id);
                    return (
                      <button
                        key={v._id || v.passNumber}
                        type="button"
                        className="wmn-btn-sec"
                        style={{
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onClick={() => handleSelectActiveVisitor(v)}
                        title={`Click to verify and checkout ${v.name}`}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>{v.passNumber}</span>
                        <span style={{ color: '#0f172a' }}>: {v.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Visitor Verification Result */}
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
                headerTitle = 'VISITOR CURRENTLY ON CAMPUS (ACTIVE PASS)';
                headerSubtitle = `Visitor is inside campus (entered at ${visitor.entryTime ? new Date(visitor.entryTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'earlier today'}). Pass verified. Ready for departure checkout.`;
              } else if (isCheckedOut) {
                headerBg = '#f1f5f9';
                headerColor = '#334155';
                headerBorder = '#cbd5e1';
                headerIcon = <Clock size={24} style={{ color: '#64748b', flexShrink: 0 }} />;
                headerTitle = 'VISITOR PASS CHECKED OUT (DEPARTED)';
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
                            {visitor.status === 'Inside' ? '🟢 Inside Campus' : visitor.status || 'Active'}
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
                            onClick={handleQuickCheckoutVisitor}
                            disabled={visitorLoading}
                          >
                            <ExitIcon size={18} />
                            <span>Confirm Visitor Exit / Checkout</span>
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
                            onClick={handleQuickAdmitVisitor}
                            disabled={visitorLoading}
                          >
                            <Check size={18} />
                            <span>Admit Pre-Registered Visitor</span>
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
                  Enter a pass voucher code or scan a visitor's QR badge.
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
