import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  User,
  Users,
  Home,
  PlusCircle,
  CheckCircle,
  LogOut,
  Moon,
  Sun,
  AlertTriangle,
  Settings,
  Grid,
  Clipboard,
  Calendar,
  Sparkles,
  ArrowRight,
  Bell,
  Search,
  QrCode,
  X,
  Menu,
  BookOpen,
  Layers,
  CreditCard,
  PieChart,
  Clock,
  ThumbsUp
} from 'lucide-react';

// Setup base url
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
axios.defaults.withCredentials = true;

type UserRole = 'SUPER_ADMIN' | 'WARDEN' | 'STUDENT' | 'STAFF';

interface Hostel {
  id: string;
  name: string;
  code: string;
  collegeName: string;
  address: string;
  capacity: number;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hostel?: Hostel;
  hostelId?: string | null;
  registerNumber?: string | null;
  qrToken?: string | null;
  room?: {
    id: string;
    roomNumber: string;
    block: string;
  } | null;
  roomId?: string | null;
}

// Attendance circular ring component
const AttendanceRing = ({ percentage }: { percentage: number }) => {
  const radius = 60;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg height={radius * 2} width={radius * 2}>
        <circle
          stroke="var(--border-color)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--primary)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fill="var(--text-main)"
          fontSize="1.1rem"
          fontWeight="800"
        >
          {percentage}%
        </text>
      </svg>
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Attendance</span>
    </div>
  );
};

// Simple SVG Bar Chart Component for Analytics
const SimpleBarChart = ({ data }: { data: { name: string; value: number }[] }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '140px', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      {data.map((item, idx) => {
        const heightPercent = (item.value / maxValue) * 100;
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>{item.value}</div>
            <div style={{
              width: '24px',
              height: `${Math.max(heightPercent, 5)}px`,
              background: 'linear-gradient(180deg, var(--primary), var(--primary-hover))',
              borderRadius: '6px 6px 0 0',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)'
            }} />
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', width: '50px', textAlign: 'center', fontWeight: 600 }}>
              {item.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'register' | 'dashboard' | 'qr_login'>('home');
  const [subView, setSubView] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Portal QR Scanner states
  const [isQrScannerPortal, setIsQrScannerPortal] = useState(false);
  const [qrPortalEmail, setQrPortalEmail] = useState('');
  const [qrPortalPassword, setQrPortalPassword] = useState('');
  const [scannerActive, setScannerActive] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState('Primary Webcam');
  const [scannerStatus, setScannerStatus] = useState<'Ready' | 'Scanning' | 'Processing' | 'Success' | 'Error' | 'Idle'>('Ready');
  const [lastScannedStudent, setLastScannedStudent] = useState<any | null>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [attendanceSettings, setAttendanceSettings] = useState<any>(null);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [newSessionName, setNewSessionName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionName, setEditingSessionName] = useState('');
  const [manualScanInput, setManualScanInput] = useState('');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form states
  const [regRole, setRegRole] = useState<UserRole>('STUDENT');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regHostelId, setRegHostelId] = useState('');
  const [regCollege, setRegCollege] = useState('');
  const [regDept, setRegDept] = useState('');
  const [regYear, setRegYear] = useState('1st Year');
  const [regNumber, setRegNumber] = useState('');
  const [regParentName, setRegParentName] = useState('');
  const [regParentMobile, setRegParentMobile] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Loaded data
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [visitors, setVisitors] = useState<any[]>([]);

  // Attendance states
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, absent: 0, percentage: 100 });
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanMessage, setQrScanMessage] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualIsPresent, setManualIsPresent] = useState(true);

  // Leave states
  const [leavesHistory, setLeavesHistory] = useState<any[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [remarksText, setRemarksText] = useState('');
  const [activeLeaveIdForRemarks, setActiveLeaveIdForRemarks] = useState<string | null>(null);

  // Complaint improvements
  const [assignStaffId, setAssignStaffId] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Visitor improvements
  const [visitorExpectedArrival, setVisitorExpectedArrival] = useState('');
  const [activeVisitorForQR, setActiveVisitorForQR] = useState<any | null>(null);

  // Modal / Inputs for Hostels/Rooms
  const [newHostelName, setNewHostelName] = useState('');
  const [newHostelCode, setNewHostelCode] = useState('');
  const [newHostelCollege, setNewHostelCollege] = useState('');
  const [newHostelAddress, setNewHostelAddress] = useState('');
  const [newHostelCapacity, setNewHostelCapacity] = useState('');

  const [newRoomBlock, setNewRoomBlock] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('0');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('4');
  const [newRoomHostelId, setNewRoomHostelId] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);

  // Complaint Inputs
  const [compTitle, setCompTitle] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compCategory, setCompCategory] = useState('Electrical');
  const [compPriority, setCompPriority] = useState('MEDIUM');

  // Visitor Inputs
  const [visName, setVisName] = useState('');
  const [visPurpose, setVisPurpose] = useState('');
  const [visDate, setVisDate] = useState('');

  // AI Assistant Chat state
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: 'Hello! I am your SmartHostel AI Assistant. Ask me anything about mess menus, attendance status, or hostel guidelines.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    // Check initial auth state
    checkAuth();
    // Load public hostels
    loadHostels();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const checkAuth = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data?.success) {
        setCurrentUser(res.data.data);
        setView('dashboard');
        loadDashboardData(res.data.data);
      }
    } catch (err) {
      setCurrentUser(null);
      setView('home');
    } finally {
      setLoading(false);
    }
  };

  const loadHostels = async () => {
    try {
      const res = await axios.get('/api/hostels');
      if (res.data?.success) {
        setHostels(res.data.data);
        if (res.data.data.length > 0) {
          setRegHostelId(res.data.data[0].id);
          setNewRoomHostelId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load hostels');
    }
  };

  const fetchAttendanceSettings = async () => {
    try {
      const res = await axios.get('/api/attendance/settings');
      if (res.data?.success) setAttendanceSettings(res.data.data);
    } catch (err) {
      console.error('Failed to fetch attendance settings', err);
    }
  };

  const fetchAttendanceSessions = async () => {
    try {
      const res = await axios.get('/api/attendance/sessions');
      if (res.data?.success) setAttendanceSessions(res.data.data);
    } catch (err) {
      console.error('Failed to fetch attendance sessions', err);
    }
  };

  const updateAttendanceSettings = async (payload: any) => {
    try {
      const res = await axios.patch('/api/attendance/settings', payload);
      if (res.data?.success) {
        setAttendanceSettings(res.data.data);
        alert('Settings updated successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update settings');
    }
  };

  const loadDashboardData = async (user: UserProfile) => {
    try {
      // 1. Core lists
      const resComp = await axios.get('/api/complaints');
      if (resComp.data?.success) setComplaints(resComp.data.data);

      const resVis = await axios.get('/api/visitors');
      if (resVis.data?.success) setVisitors(resVis.data.data);

      // 2. Attendance history & stats
      const resAttHistory = await axios.get('/api/attendance/history');
      if (resAttHistory.data?.success) setAttendanceHistory(resAttHistory.data.data);

      const resAttStats = await axios.get('/api/attendance/stats');
      if (resAttStats.data?.success) setAttendanceStats(resAttStats.data.data);

      // 3. Leaves history
      const resLeaves = await axios.get('/api/leaves');
      if (resLeaves.data?.success) setLeavesHistory(resLeaves.data.data);

      // 4. Settings & Sessions
      fetchAttendanceSettings();
      fetchAttendanceSessions();

      // 5. Role specific lists
      if (user.role === 'SUPER_ADMIN' || user.role === 'WARDEN') {
        const resPending = await axios.get('/api/admin/pending-approvals');
        if (resPending.data?.success) setPendingUsers(resPending.data.data);

        const resRooms = await axios.get('/api/rooms');
        if (resRooms.data?.success) setRooms(resRooms.data.data);
      }
    } catch (err) {
      console.error('Error loading dashboard sub-data', err);
    }
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.1, ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.12);
      }, 100);
    } catch (err) {
      console.error(err);
    }
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140.00, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (err) {
      console.error(err);
    }
  };

  const handleQRScan = async (tokenStr: string) => {
    if (!tokenStr.trim()) return;
    setScannerStatus('Processing');
    try {
      const res = await axios.post('/api/attendance/scan-qr', {
        qrToken: tokenStr,
        device: selectedCamera
      });
      if (res.data?.success) {
        playSuccessSound();
        setScannerStatus('Success');
        setLastScannedStudent({
          ...res.data.student,
          time: new Date().toLocaleTimeString(),
          status: 'PRESENT',
          message: 'Attendance Marked Successfully'
        });
        
        // Add to history
        const newLog = {
          id: res.data.attendance?.id || Math.random().toString(),
          studentName: res.data.student?.fullName,
          roomNumber: res.data.student?.roomNumber,
          session: res.data.attendance?.session || 'Morning',
          time: new Date(res.data.attendance?.date || new Date()).toLocaleTimeString(),
          status: 'PRESENT',
          scannedBy: res.data.attendance?.scannedBy || 'System',
          scannerDevice: res.data.attendance?.scannerDevice || 'Webcam',
          qrVerification: 'VERIFIED'
        };
        setScanHistory(prev => [newLog, ...prev]);
        
        // Reload dashboard details
        if (currentUser) loadDashboardData(currentUser);
      } else {
        playErrorSound();
        setScannerStatus('Error');
        if (res.data?.status === 'ALREADY_MARKED') {
          setLastScannedStudent({
            ...res.data.student,
            time: new Date().toLocaleTimeString(),
            status: 'ALREADY_MARKED',
            message: 'Attendance Already Marked'
          });
        } else {
          alert(res.data?.message || 'Verification Failed');
        }
      }
    } catch (err: any) {
      playErrorSound();
      setScannerStatus('Error');
      alert(err.response?.data?.error || 'QR Verification Failed');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    try {
      const res = await axios.post('/api/attendance/sessions', { name: newSessionName, isActive: true });
      if (res.data?.success) {
        setNewSessionName('');
        fetchAttendanceSessions();
        alert('Attendance session created!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create session');
    }
  };

  const handleUpdateSession = async (id: string, name: string, isActive: boolean) => {
    try {
      const res = await axios.patch(`/api/attendance/sessions/${id}`, { name, isActive });
      if (res.data?.success) {
        setEditingSessionId(null);
        fetchAttendanceSessions();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update session');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    try {
      const res = await axios.delete(`/api/attendance/sessions/${id}`);
      if (res.data?.success) {
        fetchAttendanceSessions();
        alert('Session deleted!');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete session');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsQrScannerPortal(false);
    try {
      const res = await axios.post('/api/auth/login', {
        email: loginEmail,
        password: loginPassword
      });
      if (res.data?.success) {
        setCurrentUser(res.data.data);
        setView('dashboard');
        setSubView('dashboard');
        loadDashboardData(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleQRLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/auth/login', {
        email: qrPortalEmail,
        password: qrPortalPassword
      });
      if (res.data?.success) {
        const user = res.data.data as UserProfile;
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'WARDEN') {
          alert('Access denied. Only Super Admins and Wardens can access the QR Attendance Panel.');
          await axios.post('/api/auth/logout');
          return;
        }
        setCurrentUser(user);
        setIsQrScannerPortal(true);
        setView('dashboard');
        setSubView('dashboard');
        loadDashboardData(user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/auth/register', {
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        mobileNumber: regMobile,
        role: regRole,
        hostelId: regHostelId || null,
        collegeName: regCollege,
        department: regDept,
        year: regYear,
        registerNumber: regNumber,
        parentName: regParentName,
        parentMobile: regParentMobile,
        address: regAddress
      });
      if (res.data?.success) {
        alert(res.data.message);
        setView('login');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setCurrentUser(null);
      setView('home');
      setSubView('dashboard');
    } catch (err) {
      console.error('Logout request failed');
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await axios.post('/api/admin/approve-user', { userId });
      if (res.data?.success) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        alert('User registration approved successfully!');
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await axios.post('/api/admin/reject-user', { userId });
      if (res.data?.success) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        alert('User registration rejected successfully!');
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  // Hostels / Rooms creations
  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/hostels', {
        name: newHostelName,
        code: newHostelCode,
        collegeName: newHostelCollege,
        address: newHostelAddress,
        capacity: Number(newHostelCapacity)
      });
      if (res.data?.success) {
        alert('Hostel created successfully!');
        loadHostels();
        setNewHostelName('');
        setNewHostelCode('');
        setNewHostelCollege('');
        setNewHostelAddress('');
        setNewHostelCapacity('');
      }
    } catch (err) {
      alert('Failed to create hostel');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/rooms', {
        block: newRoomBlock,
        floor: Number(newRoomFloor),
        roomNumber: newRoomNumber,
        capacity: Number(newRoomCapacity),
        hostelId: newRoomHostelId
      });
      if (res.data?.success) {
        alert('Room added successfully!');
        setNewRoomBlock('');
        setNewRoomNumber('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Failed to create room');
    }
  };

  // QR Attendance Workflow
  const handleQRCheckIn = async (hostelId: string) => {
    setQrScanMessage('Verifying QR Code...');
    try {
      const res = await axios.post('/api/attendance/check-in', { hostelId });
      if (res.data?.success) {
        setQrScanMessage('Check-in Verified! Welcome to the Hostel.');
        setTimeout(() => {
          setShowQRScanner(false);
          setQrScanMessage('');
          if (currentUser) loadDashboardData(currentUser);
        }, 1500);
      }
    } catch (err: any) {
      setQrScanMessage(err.response?.data?.error || 'QR Verification failed.');
    }
  };

  const handleQRCheckOut = async () => {
    setQrScanMessage('Processing Check-Out...');
    try {
      const res = await axios.post('/api/attendance/check-out');
      if (res.data?.success) {
        setQrScanMessage('Check-out Recorded! Goodbye.');
        setTimeout(() => {
          setShowQRScanner(false);
          setQrScanMessage('');
          if (currentUser) loadDashboardData(currentUser);
        }, 1500);
      }
    } catch (err: any) {
      setQrScanMessage(err.response?.data?.error || 'Check-out failed.');
    }
  };

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/attendance/manual', {
        studentId: manualStudentId,
        date: manualDate,
        isPresent: manualIsPresent
      });
      if (res.data?.success) {
        alert('Attendance marked manually!');
        setManualStudentId('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to record attendance');
    }
  };

  // Leave Management Workflow
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/leaves', {
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason
      });
      if (res.data?.success) {
        alert('Leave application submitted to Warden!');
        setLeaveStartDate('');
        setLeaveEndDate('');
        setLeaveReason('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit leave request');
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await axios.patch(`/api/leaves/${leaveId}`, {
        status,
        remarks: remarksText
      });
      if (res.data?.success) {
        alert(`Leave request ${status.toLowerCase()} successfully!`);
        setRemarksText('');
        setActiveLeaveIdForRemarks(null);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      const res = await axios.delete(`/api/leaves/${leaveId}`);
      if (res.data?.success) {
        alert('Leave request cancelled.');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancel failed');
    }
  };

  // Complaint actions
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/complaints', {
        title: compTitle,
        description: compDesc,
        category: compCategory,
        priority: compPriority
      });
      if (res.data?.success) {
        alert('Complaint filed successfully!');
        setCompTitle('');
        setCompDesc('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Failed to file complaint. Make sure you belong to a hostel.');
    }
  };

  const handleComplaintAction = async (complaintId: string, status: string) => {
    try {
      const payload: any = { status };
      if (assignStaffId) payload.staffId = assignStaffId;
      if (resolutionText) payload.resolutionImage = `https://images.unsplash.com/photo-1581092921461-eab62e97a780?w=400 (Fixed ${resolutionText})`;

      const res = await axios.patch(`/api/complaints/${complaintId}`, payload);
      if (res.data?.success) {
        alert('Complaint updated successfully!');
        setAssignStaffId('');
        setResolutionText('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleComplaintFeedback = async (complaintId: string) => {
    try {
      const res = await axios.patch(`/api/complaints/${complaintId}`, {
        studentFeedback: `${feedbackRating} Stars: ${feedbackComment}`
      });
      if (res.data?.success) {
        alert('Feedback submitted!');
        setFeedbackRating(5);
        setFeedbackComment('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Feedback submission failed');
    }
  };

  // Visitor Pass actions
  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/visitors', {
        name: visName,
        purpose: visPurpose,
        visitDate: visDate,
        expectedArrivalTime: visitorExpectedArrival
      });
      if (res.data?.success) {
        alert('Visitor request registered successfully!');
        setVisName('');
        setVisPurpose('');
        setVisDate('');
        setVisitorExpectedArrival('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Failed to request visitor.');
    }
  };

  const handleUpdateVisitorStatus = async (visitorId: string, status: string, checkIn?: boolean, checkOut?: boolean) => {
    try {
      const payload: any = { status };
      if (checkIn) payload.checkInTime = new Date();
      if (checkOut) payload.checkOutTime = new Date();

      const res = await axios.patch(`/api/visitors/${visitorId}`, payload);
      if (res.data?.success) {
        alert('Visitor updated!');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  // AI Assistant simulated answers
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Answer calculation
    setTimeout(() => {
      let aiText = "I'm sorry, I didn't quite get that. You can ask me about leaves, complaints, attendance, or the weekly mess menu.";
      const query = userMsg.toLowerCase();
      if (query.includes('menu') || query.includes('food') || query.includes('eat')) {
        aiText = "The Mess serves Scrambled Eggs & Toast for Breakfast, Veg Biryani & Curd for Lunch, and Paneer Butter Masala & Roti for Dinner today.";
      } else if (query.includes('leave') || query.includes('absent')) {
        aiText = `You have submitted ${leavesHistory.length} leave requests. Your most recent leave status is: ${leavesHistory[0]?.status || 'No leaves applied yet'}.`;
      } else if (query.includes('attendance') || query.includes('percent')) {
        aiText = `Your current attendance is ${attendanceStats.percentage}%. You have recorded ${attendanceStats.present} check-ins this month.`;
      } else if (query.includes('complaint')) {
        aiText = "To raise a complaint, click on 'Complaints' in your sidebar and fill out the form. Wardens will assign staff shortly.";
      } else if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
        aiText = "Hello! How can I assist you in your hostel operations today?";
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
    }, 800);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Loading SmartHostel Enterprise...</h2>
      </div>
    );
  }

  // Filter lists based on global search in navbar
  const filteredComplaints = complaints.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredVisitors = visitors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.purpose.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Side Navigation Menus definition by Role
  const renderSidebarContent = () => {
    if (!currentUser) return null;

    const items = [];
    if (currentUser.role === 'SUPER_ADMIN') {
      items.push(
        { id: 'dashboard', label: 'Dashboard', icon: Grid },
        { id: 'hostels', label: 'Hostels', icon: Home },
        { id: 'rooms', label: 'Rooms', icon: Layers },
        { id: 'attendance', label: 'Attendance', icon: QrCode },
        { id: 'leave', label: 'Leave Management', icon: Calendar },
        { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
        { id: 'visitors', label: 'Visitors', icon: Users },
        { id: 'laundry', label: 'Laundry', icon: Clipboard },
        { id: 'mess', label: 'Mess Menu', icon: BookOpen },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'ai_analytics', label: 'AI Analytics', icon: Sparkles },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'profile', label: 'Profile', icon: User }
      );
    } else if (currentUser.role === 'WARDEN') {
      items.push(
        { id: 'dashboard', label: 'Dashboard', icon: Grid },
        { id: 'rooms', label: 'Rooms', icon: Layers },
        { id: 'attendance', label: 'Attendance', icon: QrCode },
        { id: 'leave', label: 'Leave Requests', icon: Calendar },
        { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
        { id: 'visitors', label: 'Visitors', icon: Users },
        { id: 'laundry', label: 'Laundry Slots', icon: Clipboard },
        { id: 'mess', label: 'Mess Operations', icon: BookOpen },
        { id: 'profile', label: 'Profile', icon: User }
      );
    } else if (currentUser.role === 'STUDENT') {
      items.push(
        { id: 'dashboard', label: 'Dashboard', icon: Grid },
        { id: 'rooms', label: 'My Room', icon: Home },
        { id: 'attendance', label: 'Attendance', icon: QrCode },
        { id: 'leave', label: 'Apply Leave', icon: Calendar },
        { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
        { id: 'visitors', label: 'Visitor Pass', icon: Users },
        { id: 'laundry', label: 'Laundry Booking', icon: Clipboard },
        { id: 'mess', label: 'Mess Info', icon: BookOpen },
        { id: 'payments', label: 'Fee Status', icon: CreditCard },
        { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles },
        { id: 'profile', label: 'Profile', icon: User }
      );
    } else if (currentUser.role === 'STAFF') {
      items.push(
        { id: 'dashboard', label: 'Dashboard', icon: Grid },
        { id: 'complaints', label: 'Complaints Tasks', icon: AlertTriangle },
        { id: 'profile', label: 'Profile', icon: User }
      );
    }

    return (
      <>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`sidebar-item ${subView === item.id ? 'active' : ''}`}
              onClick={() => {
                setSubView(item.id);
                setMobileMenuOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className="sidebar-item" onClick={handleLogout} style={{ marginTop: 'auto', color: '#ef4444' }}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </>
    );
  };

  const exportHistoryToCSV = () => {
    if (scanHistory.length === 0) {
      alert("No scans available to export.");
      return;
    }
    const headers = ["Scan ID", "Student Name", "Room Number", "Session", "Time", "Status", "Scanned By", "Device", "Verification"];
    const rows = scanHistory.map(h => [
      h.id,
      h.studentName,
      h.roomNumber,
      h.session,
      h.time,
      h.status,
      h.scannedBy,
      h.scannerDevice,
      h.qrVerification
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderQRScannerPortal = () => {
    if (!currentUser) return null;
    
    // Calculate scanner portal stats
    const totalScans = scanHistory.length;
    const successScans = scanHistory.filter(h => h.status === 'PRESENT').length;
    const duplicateScans = scanHistory.filter(h => h.status === 'ALREADY_MARKED').length;
    
    return (
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
        {/* Top Portal Header */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '4px solid var(--primary)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={24} color="var(--primary)" />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>QR Security Gate Portal</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Logged in as: <strong style={{ color: 'var(--text-main)' }}>{currentUser.email}</strong> ({currentUser.role}) · Terminal Device: Web Viewfinder
            </p>
          </div>
          <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={handleLogout}>
            <LogOut size={16} /> Exit Gate Portal
          </button>
        </div>

        {/* Attendance Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TODAY'S TOTAL SCANS</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{totalScans}</span>
          </div>
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SUCCESSFUL MARKINGS</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{successScans}</span>
          </div>
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DUPLICATE DETECTIONS</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{duplicateScans}</span>
          </div>
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>SCANNER EFFICIENCY</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6366f1', marginTop: '0.25rem' }}>
              {totalScans > 0 ? `${Math.round((successScans / totalScans) * 100)}%` : '100%'}
            </span>
          </div>
        </div>

        {/* 2-Column Splitter */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          
          {/* Left Column: Viewfinder & Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Viewfinder Panel */}
            <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, alignSelf: 'flex-start' }}>Active Scanner Viewfinder</h3>
              
              {/* Scan Box */}
              <div style={{
                width: '100%',
                maxWidth: '300px',
                height: '240px',
                background: scannerActive ? '#000000' : 'rgba(255,255,255,0.01)',
                border: scannerActive ? '3px solid var(--primary)' : '2px dashed var(--border-color)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                {scannerActive ? (
                  <>
                    <QrCode size={100} color="rgba(99, 102, 241, 0.4)" />
                    {/* Viewfinder Scanning Grid Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'var(--primary)',
                      boxShadow: '0 0 12px var(--primary)',
                      animation: 'slideUp 2.5s linear infinite alternate'
                    }} />
                    <span style={{ position: 'absolute', bottom: '10px', fontSize: '0.75rem', color: '#10b981', background: 'rgba(0,0,0,0.6)', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }} /> Live Scanner Active
                    </span>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                    <QrCode size={48} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem' }}>Camera Stream Suspended</p>
                  </div>
                )}
              </div>

              {/* Viewfinder Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '300px' }}>
                <button 
                  className={`btn ${scannerActive ? 'btn-secondary' : 'btn-primary'}`} 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    setScannerActive(prev => !prev);
                    setScannerStatus(scannerActive ? 'Idle' : 'Ready');
                  }}
                >
                  {scannerActive ? 'Stop Stream' : 'Start Stream'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => alert("Flashlight is not supported by your current webcam device hardware.")}
                  disabled={!scannerActive}
                >
                  Toggle Flashlight
                </button>
              </div>

              {/* Device Selection */}
              <div style={{ width: '100%', maxWidth: '300px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Input Capture Device</label>
                <select className="form-input" value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} disabled={!scannerActive}>
                  <option value="Primary Webcam">Webcam HD (Integrated)</option>
                  <option value="Secondary Cam">Rear Camera (USB Video)</option>
                  <option value="Virtual Device">OBS Virtual Camera</option>
                </select>
              </div>
            </div>

            {/* Attendance Session / Date Overrides Settings */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Attendance Settings Override</h3>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Date Capture Mode</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="dateMode" 
                      checked={attendanceSettings ? !attendanceSettings.manualDateMode : true}
                      onChange={() => updateAttendanceSettings({ manualDateMode: false, autoDateDetection: true })}
                    />
                    Automatic System Date
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="dateMode" 
                      checked={attendanceSettings ? attendanceSettings.manualDateMode : false}
                      onChange={() => updateAttendanceSettings({ manualDateMode: true, autoDateDetection: false })}
                    />
                    Manual Selection
                  </label>
                </div>
              </div>

              {attendanceSettings?.manualDateMode && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="animate-slide-up">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Target Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={attendanceSettings?.manualDate ? new Date(attendanceSettings.manualDate).toISOString().slice(0, 10) : ''}
                      onChange={e => updateAttendanceSettings({ manualDate: new Date(e.target.value).toISOString() })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Active Session</label>
                    <select 
                      className="form-input"
                      value={attendanceSettings?.manualSession || 'Morning'}
                      onChange={e => updateAttendanceSettings({ manualSession: e.target.value })}
                    >
                      {attendanceSessions.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scan Simulator & Scanner Status / Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Last Scanned Student View */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '260px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Scanned Student Display</h3>
                <span className={`badge ${
                  scannerStatus === 'Success' ? 'badge-success' : 
                  scannerStatus === 'Error' ? 'badge-warning' : 'badge-info'
                }`}>
                  {scannerStatus.toUpperCase()}
                </span>
              </div>

              {lastScannedStudent ? (
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }} className="animate-slide-up">
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={lastScannedStudent.avatar} alt="Avatar" width="80" height="80" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <strong style={{ fontSize: '1.1rem' }}>{lastScannedStudent.fullName}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reg No: {lastScannedStudent.registerNumber}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Hostel: {lastScannedStudent.hostelName} | Room: {lastScannedStudent.roomNumber}</span>
                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${lastScannedStudent.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                        {lastScannedStudent.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: lastScannedStudent.status === 'PRESENT' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                        {lastScannedStudent.message}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  <User size={36} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.85rem' }}>Awaiting card swipe verification...</p>
                </div>
              )}
            </div>

            {/* Mock Card Swipe Scanner Simulation Block */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Security Card Simulator</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Simulate swiping a student's digital ID card to verify gate logs, duplicate detectors, and synthesized audio bells.
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ height: '40px' }}
                  placeholder="Enter Student QR Token (e.g. qr-student-...)"
                  value={manualScanInput}
                  onChange={e => setManualScanInput(e.target.value)}
                />
                <button 
                  className="btn btn-primary" 
                  style={{ whiteSpace: 'nowrap' }} 
                  onClick={() => {
                    handleQRScan(manualScanInput);
                    setManualScanInput('');
                  }}
                  disabled={!scannerActive}
                >
                  Verify QR
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Log History Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Gate Pass Scans Registry ({scanHistory.length})</h3>
            <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={exportHistoryToCSV}>
              Export to CSV Log
            </button>
          </div>
          {scanHistory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>No scan history recorded in this session yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem' }}>Room</th>
                    <th style={{ padding: '0.75rem' }}>Session</th>
                    <th style={{ padding: '0.75rem' }}>Time</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem' }}>Verified By</th>
                    <th style={{ padding: '0.75rem' }}>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{h.studentName}</td>
                      <td style={{ padding: '0.75rem' }}>{h.roomNumber}</td>
                      <td style={{ padding: '0.75rem' }}>{h.session}</td>
                      <td style={{ padding: '0.75rem' }}>{h.time}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${h.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}`}>
                          {h.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{h.scannedBy}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{h.scannerDevice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header / Navbar */}
      <header style={{
        height: '64px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        background: 'var(--bg-card)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Logo and Collapsible Side Menu Icon on Mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            style={{ display: 'none', padding: '0.5rem', border: 'none' }}
            onClick={() => setMobileMenuOpen(true)}
            id="mobile-drawer-toggle"
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setView(currentUser ? 'dashboard' : 'home')}>
            <Shield size={24} color="#6366f1" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              SmartHostel <span style={{ color: '#6366f1' }}>AI</span>
            </span>
          </div>
        </div>

        {/* Global Search Bar (Only shown when logged in) */}
        {currentUser && (
          <div style={{ position: 'relative', width: '300px', display: 'flex', alignItems: 'center' }} className="hide-mobile">
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.25rem', height: '36px', fontSize: '0.875rem' }}
              placeholder="Global Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Header Right Widgets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(view === 'home' || view === 'login' || view === 'register' || view === 'qr_login') && (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('home')}>Home</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('login')}>Sign In</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('qr_login')}>QR Portal</button>
              <button className="btn btn-primary" onClick={() => setView('register')}>Register</button>
            </div>
          )}

          {currentUser && (
            <>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSubView('complaints')}>
                <Bell size={18} color="var(--text-muted)" />
                {complaints.length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                )}
              </div>
              <div className="hide-mobile" style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.fullName}</span>
                <span style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'uppercase', fontWeight: 800 }}>{currentUser.role.replace('_', ' ')}</span>
              </div>
            </>
          )}

          <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Collapsible) */}
      <div className={`drawer-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`drawer-content ${mobileMenuOpen ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{currentUser ? 'All Modules' : 'Menu'}</span>
            <button className="btn btn-secondary" style={{ padding: '0.25rem' }} onClick={() => setMobileMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {currentUser ? renderSidebarContent() : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('home'); setMobileMenuOpen(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                Home
              </button>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('login'); setMobileMenuOpen(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                Sign In
              </button>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('qr_login'); setMobileMenuOpen(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                QR Portal
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => { setView('register'); setMobileMenuOpen(false); }}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Core Layout */}
      {view === 'home' || view === 'login' || view === 'register' || view === 'qr_login' ? (
        // Non-authenticated Content Shell
        <main style={{ flex: 1, padding: '2rem' }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              padding: '1rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span>{error}</span>
            </div>
          )}

          {/* HOME LANDING VIEW */}
          {view === 'home' && (
            <div className="animate-slide-up hero-container">
              <Sparkles size={48} color="#6366f1" style={{ marginBottom: '1.5rem' }} />
              <h1 className="hero-title" style={{ fontWeight: 800, marginBottom: '1rem', lineHeight: '1.1' }}>Enterprise Digital Hostel Suite</h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>A centralized multi-role platform supporting QR Attendance, leave cycles, automated booking operations, mess dashboards, and AI Assistant utilities.</p>
              <div className="hero-buttons">
                <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }} onClick={() => setView('register')}>Start System Setup <ArrowRight size={18} /></button>
                <button className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1rem' }} onClick={() => setView('login')}>Sign In</button>
              </div>
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '420px', margin: '3rem auto', padding: '2.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Welcome Back</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Enter credentials to access your hostel profile</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Email / Username</label>
                  <input className="form-input" type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@user" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Password</label>
                  <input className="form-input" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>Sign In</button>
              </form>
            </div>
          )}

          {/* QR ATTENDANCE LOGIN VIEW */}
          {view === 'qr_login' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '420px', margin: '3rem auto', padding: '2.5rem', border: '1px dashed var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <QrCode size={28} color="var(--primary)" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>QR Attendance Login</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Access-controlled portal for Super Admins and Wardens only. Students will be denied access.</p>
              <form onSubmit={handleQRLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Portal Email / Username</label>
                  <input className="form-input" type="text" value={qrPortalEmail} onChange={e => setQrPortalEmail(e.target.value)} placeholder="warden@user or admin@user" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Portal Security Password</label>
                  <input className="form-input" type="password" value={qrPortalPassword} onChange={e => setQrPortalPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Shield size={18} /> Authenticate & Open Gate Scanner
                </button>
              </form>
            </div>
          )}

          {/* REGISTER VIEW */}
          {view === 'register' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '640px', margin: '2rem auto', padding: '2.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Register Account</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>All applications require administrator approval before logging in.</p>

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Role Type</label>
                    <select className="form-input" value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}>
                      <option value="STUDENT">Student</option>
                      <option value="WARDEN">Warden</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Full Name</label>
                    <input className="form-input" type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)} placeholder="John Doe" required />
                  </div>
                </div>

                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email Address</label>
                    <input className="form-input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="john@example.com" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Password</label>
                    <input className="form-input" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 8 characters" required />
                  </div>
                </div>

                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Mobile Number</label>
                    <input className="form-input" type="tel" value={regMobile} onChange={e => setRegMobile(e.target.value)} placeholder="10 Digit Number" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Select Hostel</label>
                    <select className="form-input" value={regHostelId} onChange={e => setRegHostelId(e.target.value)}>
                      <option value="">No Hostel (Platform Admin)</option>
                      {hostels.map(h => (
                        <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {regRole === 'STUDENT' && (
                  <>
                    <div className="responsive-grid-3">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>College Name</label>
                        <input className="form-input" type="text" value={regCollege} onChange={e => setRegCollege(e.target.value)} placeholder="College name" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Department</label>
                        <input className="form-input" type="text" value={regDept} onChange={e => setRegDept(e.target.value)} placeholder="CSE, ECE etc" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Year</label>
                        <select className="form-input" value={regYear} onChange={e => setRegYear(e.target.value)}>
                          <option value="1st Year">1st Year</option>
                          <option value="2nd Year">2nd Year</option>
                          <option value="3rd Year">3rd Year</option>
                          <option value="4th Year">4th Year</option>
                        </select>
                      </div>
                    </div>

                    <div className="responsive-grid-3">
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Register Number</label>
                        <input className="form-input" type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Reg No" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Parent Name</label>
                        <input className="form-input" type="text" value={regParentName} onChange={e => setRegParentName(e.target.value)} placeholder="Parent's Name" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Parent Mobile</label>
                        <input className="form-input" type="tel" value={regParentMobile} onChange={e => setRegParentMobile(e.target.value)} placeholder="Parent's Mobile" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Residential Address</label>
                  <textarea className="form-input" value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Full street address..." rows={2}></textarea>
                </div>

                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>Submit Registration Application</button>
              </form>
            </div>
          )}
        </main>
      ) : isQrScannerPortal ? (
        // Dedicated QR Gate Scanner portal layout
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {renderQRScannerPortal()}
        </div>
      ) : (
        // Authenticated Left Sidebar + Main Panel Desktop Layout
        <div className="app-layout">
          {/* Desktop Left Sidebar */}
          <aside className="sidebar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {renderSidebarContent()}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* 1. ROLE DASHBOARDS */}
            {subView === 'dashboard' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="flex-responsive-header">
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome Back, {currentUser.fullName}!</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Role: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{currentUser.role.replace('_', ' ')}</span></p>
                  </div>
                  <span className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>Active Session</span>
                </div>

                {/* Dashboard statistics based on role */}
                <div className="dashboard-grid">
                  <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>My Attendance percentage</span>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{attendanceStats.percentage}%</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Target: 75% min</p>
                    </div>
                    <AttendanceRing percentage={attendanceStats.percentage} />
                  </div>

                  <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Registered Complaints</span>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{complaints.length}</h3>
                      <span className="badge badge-warning" style={{ marginTop: '0.5rem' }}>
                        {complaints.filter(c => c.status !== 'RESOLVED').length} Active
                      </span>
                    </div>
                    <AlertTriangle size={36} color="#f59e0b" />
                  </div>

                  <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Leaves</span>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
                        {leavesHistory.filter(l => l.status === 'APPROVED').length} Approved
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {leavesHistory.filter(l => l.status === 'PENDING').length} Pending Review
                      </p>
                    </div>
                    <Calendar size={36} color="#6366f1" />
                  </div>
                </div>

                {/* Dashboard Core Content Columns */}
                <div className="dashboard-layout-grid">
                  {/* Left Column: Recent Activities & Shortcuts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* SVG Analytics Chart for Admin/Warden, Check-in logs for Student */}
                    {currentUser.role === 'STUDENT' ? (
                      <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>My Recent Activities</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <Clock size={16} color="var(--primary)" />
                            <div>
                              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Checked In via QR Code</p>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Today at 09:15 AM</span>
                            </div>
                          </div>
                          {leavesHistory[0] && (
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                              <Calendar size={16} color="var(--accent)" />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Leave Request: {leavesHistory[0].reason}</p>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: {leavesHistory[0].status}</span>
                              </div>
                            </div>
                          )}
                          {complaints[0] && (
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0' }}>
                              <AlertTriangle size={16} color="#f59e0b" />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filed Complaint: {complaints[0].title}</p>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Status: {complaints[0].status}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Attendance & Leaves Analytics</h3>
                        <SimpleBarChart data={[
                          { name: 'Active User', value: pendingUsers.length + 10 },
                          { name: 'Present Today', value: attendanceHistory.filter(a => a.isPresent).length + 3 },
                          { name: 'On Leave', value: leavesHistory.filter(l => l.status === 'APPROVED').length },
                          { name: 'Complaints', value: complaints.filter(c => c.status !== 'RESOLVED').length },
                          { name: 'Visitors Pass', value: visitors.length }
                        ]} />
                      </div>
                    )}

                    {/* Quick Action Card Panels */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Quick Actions Shortcuts</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        {currentUser.role === 'STUDENT' && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setSubView('attendance')}>
                              <QrCode size={16} /> QR Scan Attendance
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('leave')}>
                              <Calendar size={16} /> Request Leave
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('complaints')}>
                              <AlertTriangle size={16} /> Report Complaint
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('visitors')}>
                              <Users size={16} /> Request Visitor Pass
                            </button>
                          </>
                        )}
                        {currentUser.role === 'WARDEN' && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setSubView('leave')}>
                              <Calendar size={16} /> Leave Requests ({leavesHistory.filter(l => l.status === 'PENDING').length})
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('attendance')}>
                              <QrCode size={16} /> Manual Attendance
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('complaints')}>
                              <AlertTriangle size={16} /> Resolve Complaints
                            </button>
                          </>
                        )}
                        {currentUser.role === 'SUPER_ADMIN' && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setSubView('hostels')}>
                              <PlusCircle size={16} /> Create Hostel
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('rooms')}>
                              <Layers size={16} /> Manage Rooms
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('attendance')}>
                              <PieChart size={16} /> System Attendance
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Announcements & Upcoming Events */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={18} color="#6366f1" /> Announcements
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Hostel Gate Timings Restructuring</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Main gates close strictly at 10:00 PM. Access requests after curfew must file visitor passes in advance.</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>Warden · 2 hours ago</span>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Mess Menu Enhancements</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>By student request, special dinner Paneer Butter Masala has been rescheduled for Thursday nights.</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>Mess Committee · Yesterday</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. QR ATTENDANCE MODULE */}
            {subView === 'attendance' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>QR Attendance Dashboard</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Student Left Card: Actions */}
                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', textAlign: 'center' }}>
                      <AttendanceRing percentage={attendanceStats.percentage} />
                      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowQRScanner(true); setQrScanMessage('Align the hostel QR Code in the scanner box'); }}>
                          <QrCode size={18} /> QR Scanner
                        </button>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <p>Verify check-in & check-out by scanning the display code near the hostel main office.</p>
                      </div>
                    </div>

                    {/* Student Right Card: logs */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>My Attendance Log History</h3>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem 0' }}>Date</th>
                              <th>Status</th>
                              <th>Check-In Time</th>
                              <th>Check-Out Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistory.map(log => (
                              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <td style={{ padding: '0.75rem 0' }}>{new Date(log.date).toLocaleDateString()}</td>
                                <td><span className={`badge ${log.isPresent ? 'badge-success' : 'badge-danger'}`}>{log.isPresent ? 'Present' : 'Absent'}</span></td>
                                <td>{log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '-'}</td>
                                <td>{log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warden controls: Manual mark and live logs */}
                {(currentUser.role === 'WARDEN' || currentUser.role === 'SUPER_ADMIN') && (
                  <div className="responsive-grid-1-2">
                    {/* Manual Form */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Manual Attendance Override</h3>
                      <form onSubmit={handleManualAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Student E-mail/ID</label>
                          <input className="form-input" type="text" placeholder="Enter student email" value={manualStudentId} onChange={e => setManualStudentId(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Date</label>
                          <input className="form-input" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Attendance Status</label>
                          <select className="form-input" value={manualIsPresent ? 'present' : 'absent'} onChange={e => setManualIsPresent(e.target.value === 'present')}>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                          </select>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Mark Attendance</button>
                      </form>
                    </div>

                    {/* Live logs */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Live Attendance Logs</h3>
                      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem' }}>Student Name</th>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Check-In</th>
                              <th>Check-Out</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistory.map(log => (
                              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{log.user?.fullName || 'Anonymous student'}</td>
                                <td>{new Date(log.date).toLocaleDateString()}</td>
                                <td><span className={`badge ${log.isPresent ? 'badge-success' : 'badge-danger'}`}>{log.isPresent ? 'Present' : 'Absent'}</span></td>
                                <td>{log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString() : '-'}</td>
                                <td>{log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUPER ADMIN OR WARDEN: Settings and Sessions Controls */}
                {currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'WARDEN') && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '2rem' }} className="animate-slide-up">
                    
                    {/* Settings Panel */}
                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>System Attendance Settings</h3>
                      {attendanceSettings ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.enableQrAttendance} 
                              onChange={e => updateAttendanceSettings({ enableQrAttendance: e.target.checked })} 
                            />
                            Enable QR Attendance System
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.enableCheckIn} 
                              onChange={e => updateAttendanceSettings({ enableCheckIn: e.target.checked })} 
                            />
                            Enable Scan Check-In
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.enableCheckOut} 
                              onChange={e => updateAttendanceSettings({ enableCheckOut: e.target.checked })} 
                            />
                            Enable Scan Check-Out
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.allowMultipleSessions} 
                              onChange={e => updateAttendanceSettings({ allowMultipleSessions: e.target.checked })} 
                            />
                            Allow Multi-Session Markings
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Scan Delay (sec)</span>
                              <input 
                                type="number" 
                                className="form-input" 
                                value={attendanceSettings.scanDelay} 
                                onChange={e => updateAttendanceSettings({ scanDelay: parseInt(e.target.value) || 2 })} 
                              />
                            </div>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resolution</span>
                              <select 
                                className="form-input" 
                                value={attendanceSettings.cameraResolution} 
                                onChange={e => updateAttendanceSettings({ cameraResolution: e.target.value })}
                              >
                                <option value="480p">480p SD</option>
                                <option value="720p">720p HD</option>
                                <option value="1080p">1080p Full HD</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading system settings...</p>
                      )}
                    </div>

                    {/* Sessions CRUD Panel */}
                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Attendance Shifts / Sessions</h3>
                      
                      {/* Create Form */}
                      {currentUser.role === 'SUPER_ADMIN' && (
                        <form onSubmit={handleCreateSession} style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Add session (e.g. Night)" 
                            value={newSessionName} 
                            onChange={e => setNewSessionName(e.target.value)} 
                            required 
                          />
                          <button className="btn btn-primary" type="submit">Add</button>
                        </form>
                      )}

                      {/* Sessions List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {attendanceSessions.map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            {editingSessionId === s.id ? (
                              <div style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ height: '32px' }} 
                                  value={editingSessionName} 
                                  onChange={e => setEditingSessionName(e.target.value)} 
                                />
                                <button className="btn btn-primary" style={{ padding: '0 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateSession(s.id, editingSessionName, s.isActive)}>Save</button>
                                <button className="btn btn-secondary" style={{ padding: '0 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditingSessionId(null)}>Cancel</button>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <strong style={{ fontSize: '0.85rem' }}>{s.name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: s.isActive ? '#10b981' : '#ef4444', marginLeft: '0.5rem' }}>
                                    {s.isActive ? 'Active' : 'Disabled'}
                                  </span>
                                </div>
                                {currentUser.role === 'SUPER_ADMIN' && (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} 
                                      onClick={() => { setEditingSessionId(s.id); setEditingSessionName(s.name); }}
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#ef4444' }} 
                                      onClick={() => handleDeleteSession(s.id)}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. LEAVE MANAGEMENT MODULE */}
            {subView === 'leave' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Leave Requests Hub</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Apply Form */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Apply for Leave Pass</h3>
                      <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Start Date</label>
                          <input className="form-input" type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>End Date</label>
                          <input className="form-input" type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Reason for Leave</label>
                          <textarea className="form-input" placeholder="Explain your reason (e.g. visiting parents, medical)" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} required rows={3}></textarea>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Submit Leave Request</button>
                      </form>
                    </div>

                    {/* Leave History */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>My Leave Cycle History</h3>
                      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem 0' }}>Duration</th>
                              <th>Reason</th>
                              <th>Status</th>
                              <th>Warden Remarks</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leavesHistory.map(leave => (
                              <tr key={leave.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <td style={{ padding: '0.75rem 0' }}>
                                  {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                </td>
                                <td>{leave.reason}</td>
                                <td>
                                  <span className={`badge ${
                                    leave.status === 'APPROVED' ? 'badge-success' :
                                    leave.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                                  }`}>{leave.status}</span>
                                </td>
                                <td>{leave.remarks || '-'}</td>
                                <td>
                                  {leave.status === 'PENDING' && (
                                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleCancelLeave(leave.id)}>
                                      Cancel
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warden/Admin leave approval view */}
                {(currentUser.role === 'WARDEN' || currentUser.role === 'SUPER_ADMIN') && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Warden Leave Approvals Hub</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <th style={{ padding: '0.75rem' }}>Student Name</th>
                            <th>Dates</th>
                            <th>Reason</th>
                            <th>Status</th>
                            <th>Remarks</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leavesHistory.map(leave => (
                            <tr key={leave.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{leave.user?.fullName || 'Anonymous Student'}</td>
                              <td>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</td>
                              <td>{leave.reason}</td>
                              <td>
                                <span className={`badge ${
                                  leave.status === 'APPROVED' ? 'badge-success' :
                                  leave.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                                }`}>{leave.status}</span>
                              </td>
                              <td>{leave.remarks || '-'}</td>
                              <td>
                                {leave.status === 'PENDING' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }}
                                      placeholder="Remarks"
                                      value={activeLeaveIdForRemarks === leave.id ? remarksText : ''}
                                      onChange={e => {
                                        setActiveLeaveIdForRemarks(leave.id);
                                        setRemarksText(e.target.value);
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLeaveStatus(leave.id, 'APPROVED')}>
                                        Approve
                                      </button>
                                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleUpdateLeaveStatus(leave.id, 'REJECTED')}>
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. COMPLAINTS MODULE */}
            {subView === 'complaints' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Hostel Grievance Redressal (Complaints)</h2>

                {/* Complaint form (For Students) */}
                {currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Raise a Maintenance Complaint</h3>
                    <form onSubmit={handleCreateComplaint} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <input className="form-input" type="text" value={compTitle} onChange={e => setCompTitle(e.target.value)} placeholder="Title (e.g. Broken Water Pipe)" required />
                      <input className="form-input" type="text" value={compDesc} onChange={e => setCompDesc(e.target.value)} placeholder="Describe details..." required />
                      <select className="form-input" value={compCategory} onChange={e => setCompCategory(e.target.value)}>
                        <option value="Electrical">Electrical</option>
                        <option value="Plumbing">Plumbing</option>
                        <option value="Internet">Internet</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Cleaning">Cleaning</option>
                      </select>
                      <select className="form-input" value={compPriority} onChange={e => setCompPriority(e.target.value)}>
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High Priority</option>
                      </select>
                      <button className="btn btn-primary" type="submit" style={{ gridColumn: '1 / -1' }}>File Grievance</button>
                    </form>
                  </div>
                )}

                {/* Grievance list */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Active Grievance Log List</h3>
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {filteredComplaints.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No complaints found matching filters.</p>
                    ) : (
                      filteredComplaints.map(c => (
                        <div key={c.id} style={{
                          padding: '1.5rem',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem'
                        }}>
                          <div className="flex-responsive-between">
                            <div>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.title}</h4>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{c.description}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <span className={`badge ${
                                c.priority === 'HIGH' ? 'badge-danger' :
                                c.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'
                              }`}>{c.priority} Priority</span>
                              <span className="badge badge-info">{c.category}</span>
                              <span className={`badge ${
                                c.status === 'RESOLVED' ? 'badge-success' :
                                c.status === 'ASSIGNED' ? 'badge-info' : 'badge-warning'
                              }`}>{c.status}</span>
                            </div>
                          </div>

                          {/* Timeline visualization */}
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}>
                              <CheckCircle size={14} /> Created
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: c.status !== 'PENDING' ? '#10b981' : 'var(--text-muted)' }}>
                              <Clock size={14} /> {c.status !== 'PENDING' ? 'Staff Assigned' : 'Awaiting Assignment'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: c.status === 'RESOLVED' ? '#10b981' : 'var(--text-muted)' }}>
                              <ThumbsUp size={14} /> {c.status === 'RESOLVED' ? 'Resolved' : 'Not Resolved'}
                            </div>
                          </div>

                          {c.resolutionImage && (
                            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle size={14} /> <strong>Resolution Details:</strong> {c.resolutionImage}
                            </div>
                          )}

                          {c.studentFeedback && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              <strong>Student Feedback:</strong> {c.studentFeedback}
                            </div>
                          )}

                          {/* Warden/Staff Action Area */}
                          {(currentUser.role === 'WARDEN' || currentUser.role === 'STAFF') && c.status !== 'RESOLVED' && (
                            <div className="flex-responsive-action" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                              {currentUser.role === 'WARDEN' && c.status === 'PENDING' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assign Staff Email/ID</label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    style={{ height: '32px', width: '200px' }}
                                    placeholder="Staff email"
                                    onChange={e => setAssignStaffId(e.target.value)}
                                  />
                                </div>
                              )}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Resolution Notes (Required to resolve)</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ height: '32px' }}
                                  placeholder="What was fixed?"
                                  onChange={e => setResolutionText(e.target.value)}
                                />
                              </div>
                              <button className="btn btn-primary" style={{ padding: '0.4rem 1rem' }} onClick={() => handleComplaintAction(c.id, c.status === 'PENDING' ? 'ASSIGNED' : 'RESOLVED')}>
                                {c.status === 'PENDING' ? 'Assign & Update' : 'Mark Resolved'}
                              </button>
                            </div>
                          )}

                          {/* Student Feedback Entry Area */}
                          {currentUser.role === 'STUDENT' && c.status === 'RESOLVED' && !c.studentFeedback && (
                            <div className="flex-responsive-center" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rate Resolution:</span>
                              <select className="form-input" style={{ width: '80px', height: '32px', padding: '0 4px' }} value={feedbackRating} onChange={e => setFeedbackRating(Number(e.target.value))}>
                                <option value="5">5 Star</option>
                                <option value="4">4 Star</option>
                                <option value="3">3 Star</option>
                                <option value="2">2 Star</option>
                                <option value="1">1 Star</option>
                              </select>
                              <input
                                type="text"
                                className="form-input"
                                style={{ height: '32px', flex: 1 }}
                                placeholder="Add comments on quality of work..."
                                value={feedbackComment}
                                onChange={e => setFeedbackComment(e.target.value)}
                              />
                              <button className="btn btn-primary" style={{ padding: '0.4rem 1rem' }} onClick={() => handleComplaintFeedback(c.id)}>Submit Feedback</button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. VISITORS PASS MODULE */}
            {subView === 'visitors' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Visitor Pass Management</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Request Form */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Request Visitor Security Pass</h3>
                      <form onSubmit={handleCreateVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Visitor Name</label>
                          <input className="form-input" type="text" placeholder="John Doe Sr" value={visName} onChange={e => setVisName(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Purpose of Visit</label>
                          <input className="form-input" type="text" placeholder="Delivering luggage, parent visit" value={visPurpose} onChange={e => setVisPurpose(e.target.value)} required />
                        </div>
                        <div className="responsive-grid">
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Visit Date</label>
                            <input className="form-input" type="date" value={visDate} onChange={e => setVisDate(e.target.value)} required />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Arrival Time</label>
                            <input className="form-input" type="time" value={visitorExpectedArrival} onChange={e => setVisitorExpectedArrival(e.target.value)} />
                          </div>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>Generate Pass Request</button>
                      </form>
                    </div>

                    {/* Student Passes List */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Registered Visitor Pass Cycles</h3>
                      <div style={{ display: 'grid', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
                        {filteredVisitors.map(v => (
                          <div key={v.id} className="flex-responsive-between" style={{
                            padding: '1rem',
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            alignItems: 'center'
                          }}>
                            <div>
                              <h4 style={{ fontWeight: 700 }}>Visitor: {v.name}</h4>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Purpose: {v.purpose} | Expected Date: {new Date(v.visitDate).toLocaleDateString()}</p>
                              {v.expectedArrivalTime && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Arrival: {new Date(v.expectedArrivalTime).toLocaleTimeString()}</p>}
                              <div style={{ marginTop: '0.5rem' }}>
                                <span className={`badge ${
                                  v.status === 'APPROVED' ? 'badge-success' :
                                  v.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                                }`}>{v.status}</span>
                              </div>
                            </div>
                            {v.status === 'APPROVED' && (
                              <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setActiveVisitorForQR(v)} title="Show QR Pass">
                                <QrCode size={20} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Warden approving and check-in / check-out logs */}
                {(currentUser.role === 'WARDEN' || currentUser.role === 'SUPER_ADMIN') && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Security Desk - Active Visitor Log Approvals</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <th style={{ padding: '0.75rem' }}>Visitor Name</th>
                            <th>Purpose</th>
                            <th>Status</th>
                            <th>Arrival Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVisitors.map(v => (
                            <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{v.name}</td>
                              <td>{v.purpose}</td>
                              <td>
                                <span className={`badge ${
                                  v.status === 'APPROVED' ? 'badge-success' :
                                  v.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                                }`}>{v.status}</span>
                              </td>
                              <td>{new Date(v.visitDate).toLocaleDateString()}</td>
                              <td>
                                {v.status === 'PENDING' ? (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateVisitorStatus(v.id, 'APPROVED')}>
                                      Approve
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleUpdateVisitorStatus(v.id, 'REJECTED')}>
                                      Reject
                                    </button>
                                  </div>
                                ) : v.status === 'APPROVED' ? (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {!v.checkInTime ? (
                                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateVisitorStatus(v.id, 'APPROVED', true, false)}>
                                        Check In
                                      </button>
                                    ) : !v.checkOutTime ? (
                                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleUpdateVisitorStatus(v.id, 'APPROVED', false, true)}>
                                        Check Out
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checked Out</span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rejected</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. AI ASSISTANT CHAT MODULE */}
            {subView === 'ai_assistant' && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={24} color="#6366f1" />
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>SmartHostel AI Concierge</h2>
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '420px' }}>
                  {/* Messages Area */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                    {chatMessages.map((msg, index) => (
                      <div key={index} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                        color: msg.sender === 'user' ? '#ffffff' : 'var(--text-main)',
                        padding: '0.75rem 1rem',
                        borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                        maxWidth: '75%',
                        fontSize: '0.875rem',
                        border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                        boxShadow: msg.sender === 'user' ? '0 4px 10px rgba(99,102,241,0.2)' : 'none'
                      }}>
                        {msg.text}
                      </div>
                    ))}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '40px' }}
                      placeholder="Ask about leave details, menu, or check-in..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit" style={{ padding: '0 1.25rem' }}>Send</button>
                  </form>
                </div>
              </div>
            )}

            {/* 7. OTHER PLACEHOLDER SIDEBAR VIEWS TO PREVENT SIDEBAR CRASHES */}
            {subView === 'hostels' && currentUser?.role === 'SUPER_ADMIN' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Create New Hostel Facility</h3>
                <form onSubmit={handleCreateHostel} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <input className="form-input" type="text" value={newHostelName} onChange={e => setNewHostelName(e.target.value)} placeholder="Hostel Name" required />
                  <input className="form-input" type="text" value={newHostelCode} onChange={e => setNewHostelCode(e.target.value)} placeholder="Hostel Code" required />
                  <input className="form-input" type="text" value={newHostelCollege} onChange={e => setNewHostelCollege(e.target.value)} placeholder="College Name" required />
                  <input className="form-input" type="text" value={newHostelAddress} onChange={e => setNewHostelAddress(e.target.value)} placeholder="Address" required />
                  <input className="form-input" type="number" value={newHostelCapacity} onChange={e => setNewHostelCapacity(e.target.value)} placeholder="Capacity" required />
                  <button className="btn btn-primary" type="submit">Add Hostel</button>
                </form>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Registered Hostels ({hostels.length})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {hostels.map(h => (
                      <div key={h.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <h4 style={{ fontWeight: 700 }}>{h.name}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Code: {h.code} | Cap: {h.capacity}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>College: {h.collegeName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {subView === 'students' && (currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'WARDEN') && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Student Accounts Management</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Pending Approvals ({pendingUsers.filter(u => u.role === 'STUDENT').length})</h4>
                    {pendingUsers.filter(u => u.role === 'STUDENT').length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student accounts awaiting approval.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {pendingUsers.filter(u => u.role === 'STUDENT').map(u => (
                          <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.9rem' }}>{u.fullName}</strong>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email: {u.email} | Mobile: {u.mobileNumber}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleApprove(u.id)}>Approve</button>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {subView === 'wardens' && currentUser?.role === 'SUPER_ADMIN' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Warden Accounts Management</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Pending Approvals ({pendingUsers.filter(u => u.role === 'WARDEN').length})</h4>
                    {pendingUsers.filter(u => u.role === 'WARDEN').length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No warden accounts awaiting approval.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {pendingUsers.filter(u => u.role === 'WARDEN').map(u => (
                          <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.9rem' }}>{u.fullName}</strong>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email: {u.email} | Mobile: {u.mobileNumber}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleApprove(u.id)}>Approve</button>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {subView === 'staff' && currentUser?.role === 'SUPER_ADMIN' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Staff Accounts Management</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Pending Approvals ({pendingUsers.filter(u => u.role === 'STAFF').length})</h4>
                    {pendingUsers.filter(u => u.role === 'STAFF').length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No staff accounts awaiting approval.</p>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {pendingUsers.filter(u => u.role === 'STAFF').map(u => (
                          <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                            <div>
                              <strong style={{ fontSize: '0.9rem' }}>{u.fullName}</strong>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email: {u.email} | Mobile: {u.mobileNumber}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleApprove(u.id)}>Approve</button>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {subView === 'rooms' && (currentUser?.role === 'WARDEN' || currentUser?.role === 'SUPER_ADMIN') && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Add Hostel Room</h3>
                <form onSubmit={handleCreateRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  <input className="form-input" type="text" value={newRoomBlock} onChange={e => setNewRoomBlock(e.target.value)} placeholder="Block (e.g. Block A)" required />
                  <input className="form-input" type="number" value={newRoomFloor} onChange={e => setNewRoomFloor(e.target.value)} placeholder="Floor (e.g. 2)" required />
                  <input className="form-input" type="text" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} placeholder="Room Number (e.g. 204)" required />
                  <input className="form-input" type="number" value={newRoomCapacity} onChange={e => setNewRoomCapacity(e.target.value)} placeholder="Capacity" required />
                  <select className="form-input" value={newRoomHostelId} onChange={e => setNewRoomHostelId(e.target.value)}>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" type="submit">Add Room</button>
                </form>
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Registered Hostel Rooms ({rooms.length})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {rooms.map((r, idx) => (
                      <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                        <h4 style={{ fontWeight: 700 }}>Room {r.roomNumber} ({r.block})</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Floor: {r.floor} | Max Capacity: {r.capacity}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Occupants: {r.users?.length || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {subView === 'laundry' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Laundry Slot Scheduler</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Book washing machines and dryers in advance to avoid long wait queues.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  {['Morning 08:00 - 10:00', 'Mid-Day 11:00 - 13:00', 'Afternoon 14:00 - 16:00', 'Evening 17:00 - 19:00'].map((slot, i) => (
                    <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <span style={{ fontWeight: 700 }}>{slot}</span>
                      <span className="badge badge-success">Available</span>
                      <button className="btn btn-primary" style={{ padding: '0.5rem' }} onClick={() => alert('Laundry Slot Booked!')}>Book Slot</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subView === 'mess' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Weekly Mess Menu Operation</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {[
                    { day: 'Monday', b: 'Idli & Sambar', l: 'Rice, Dal, Veg Salad', d: 'Chapati, Paneer Sabji' },
                    { day: 'Tuesday', b: 'Puri & Potato Curry', l: 'Pulao, Raita, Fryums', d: 'Rice, Sambar, Cabbage Poriyal' },
                    { day: 'Wednesday', b: 'Bread & Omelette', l: 'Lemon Rice & Curd Rice', d: 'Chapati, Mix Veg Korma' },
                    { day: 'Thursday', b: 'Dosa & Coconut Chutney', l: 'Veg Biryani, Onion Raita', d: 'Special Paneer Masala, Parotta' },
                    { day: 'Friday', b: 'Poha & Jalebi', l: 'Rice, Rasam, Egg Fry', d: 'Chapati, Potato Capsicum' }
                  ].map((menu, i) => (
                    <div key={i} className="mess-menu-grid" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <strong style={{ color: 'var(--primary)' }}>{menu.day}</strong>
                      <span>Breakfast: {menu.b}</span>
                      <span>Lunch: {menu.l}</span>
                      <span>Dinner: {menu.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subView === 'payments' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Hostel Fee & Payment Status</h3>
                <div className="flex-responsive-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '1.5rem', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontWeight: 700 }}>Hostel Maintenance Fee (Fall Semester)</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due Date: 30th August 2026</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>$1,200.00</span>
                    <span className="badge badge-warning" style={{ display: 'block', marginTop: '0.25rem' }}>Pending</span>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => alert('Simulating Pay Gateway...')}>Proceed to Payment</button>
              </div>
            )}

            {subView === 'profile' && currentUser && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                {/* Profile Details Card */}
                <div className="glass-panel animate-slide-up" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '2rem', fontWeight: 800 }}>
                      {currentUser.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentUser.fullName}</h3>
                      <span className="badge badge-info" style={{ marginTop: '0.25rem' }}>{currentUser.role}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Email ID</span>
                      <strong>{currentUser.email}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Approval Status</span>
                      <strong style={{ color: currentUser.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>{currentUser.status}</strong>
                    </div>
                    {currentUser.registerNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Register Number</span>
                        <strong>{currentUser.registerNumber}</strong>
                      </div>
                    )}
                    {currentUser.hostel && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Hostel Name</span>
                        <strong>{currentUser.hostel.name}</strong>
                      </div>
                    )}
                    {currentUser.room && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Room Number</span>
                        <strong>{currentUser.room.roomNumber}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Digital ID Card Preview & QR Code */}
                <div className="glass-panel animate-slide-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>Digital Hostel ID Card</h4>
                  
                  {/* Visual ID Card Mock */}
                  <div style={{
                    borderRadius: '16px',
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    width: '300px',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    border: '1px solid var(--primary)'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '2px', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
                      SMARTHOSTEL PASS
                    </div>
                    <img 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`} 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)', margin: '0 auto 1rem', display: 'block' }}
                      alt="Avatar"
                    />
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>{currentUser.fullName}</div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.2)', padding: '0.15rem 0.5rem', borderRadius: '12px', display: 'inline-block', margin: '0.25rem 0 1rem', fontWeight: 700 }}>
                      {currentUser.role}
                    </span>
                    <div style={{ textAlign: 'left', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Register No:</span><strong>{currentUser.registerNumber || 'N/A'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Hostel:</span><strong>{currentUser.hostel?.name || 'Demo Hostel A'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#94a3b8' }}>Room Number:</span><strong>{currentUser.room?.roomNumber || 'Unassigned'}</strong></div>
                    </div>
                    
                    {/* QR Code Container */}
                    <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '12px', width: '120px', height: '120px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${currentUser.qrToken || currentUser.id}`} 
                        alt="QR Code" 
                        width="100" 
                        height="100"
                      />
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary" 
                    style={{ width: '100%', maxWidth: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
                    onClick={() => {
                      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentUser.qrToken || currentUser.id}`;
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>${currentUser.fullName} - Hostel ID Card</title>
                              <style>
                                body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #0b0f19; color: #ffffff; }
                                .card { border: 2px solid #6366f1; border-radius: 20px; padding: 2rem; background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); width: 350px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                                .header { font-size: 1.25rem; font-weight: 800; color: #6366f1; letter-spacing: 2px; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.75rem; }
                                .avatar { width: 100px; height: 100px; border-radius: 50%; border: 3px solid #6366f1; margin: 0 auto 1rem; object-fit: cover; }
                                .name { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
                                .role { font-size: 0.75rem; text-transform: uppercase; color: #a5b4fc; background: rgba(99, 102, 241, 0.2); padding: 0.25rem 0.75rem; border-radius: 20px; display: inline-block; margin-bottom: 1.5rem; font-weight: 700; }
                                .details { text-align: left; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
                                .details-row { display: flex; justify-content: space-between; }
                                .details-label { color: #94a3b8; }
                                .details-val { font-weight: 600; color: #f8fafc; }
                                .qr { width: 130px; height: 130px; margin: 0 auto; background: #ffffff; padding: 0.5rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
                                .footer { margin-top: 1.5rem; font-size: 0.7rem; color: #64748b; text-transform: uppercase; }
                              </style>
                            </head>
                            <body>
                              <div class="card">
                                <div class="header">SMARTHOSTEL PASS</div>
                                <img class="avatar" src="https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName || '')}" alt="Student Avatar" />
                                <div class="name">${currentUser.fullName}</div>
                                <div class="role">${currentUser.role}</div>
                                <div class="details">
                                  <div class="details-row"><span class="details-label">Register No:</span><span class="details-val">${currentUser.registerNumber || 'N/A'}</span></div>
                                  <div class="details-row"><span class="details-label">Hostel:</span><span class="details-val">${currentUser.hostel?.name || 'Demo Hostel A'}</span></div>
                                  <div class="details-row"><span class="details-label">Room Number:</span><span class="details-val">${currentUser.room?.roomNumber || 'Unassigned'}</span></div>
                                </div>
                                <div class="qr"><img src="${qrUrl}" width="130" height="130" /></div>
                                <div class="footer">SmartHostel AI · Secure Verification Pass</div>
                              </div>
                              <script>
                                window.onload = function() {
                                  setTimeout(function() {
                                    window.print();
                                  }, 500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                  >
                    <QrCode size={18} /> Print / Download Pass
                  </button>
                </div>
              </div>
            )}

            {/* Placeholder modules to prevent sidebar crashes */}
            {['rooms', 'leave', 'complaints', 'visitors', 'laundry', 'mess', 'payments', 'profile', 'hostels', 'attendance', 'ai_assistant'].indexOf(subView) === -1 && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem', textAlign: 'center' }}>
                <Sparkles size={36} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h3>{subView.charAt(0).toUpperCase() + subView.slice(1).replace('_', ' ')} Module</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>This advanced enterprise module dashboard is fully structured and prepared for future database synchronization.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* QR Code view Modal for students */}
      {showQRScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowQRScanner(false)}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hostel QR Security Gate Scanner</h3>
            <div style={{
              width: '240px',
              height: '240px',
              border: '4px solid var(--primary)',
              borderRadius: '16px',
              margin: '0 auto',
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={140} color="var(--text-main)" />
              {/* Scanline Animation */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'var(--primary)',
                boxShadow: '0 0 12px var(--primary)',
                animation: 'slideUp 2s linear infinite alternate'
              }} />
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{qrScanMessage || 'Scanning for active codes...'}</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleQRCheckIn(currentUser?.hostelId || hostels[0]?.id || '')}>Mock Check-In</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleQRCheckOut}>Mock Check-Out</button>
            </div>
            <button className="btn btn-secondary" onClick={() => setShowQRScanner(false)}>Cancel Scan</button>
          </div>
        </div>
      )}

      {/* Visitor QR Pass Modal */}
      {activeVisitorForQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setActiveVisitorForQR(null)}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>Visitor Entry Pass</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gate Pass ID: {activeVisitorForQR.id}</span>
            <div style={{ margin: '0 auto', background: '#ffffff', padding: '1rem', borderRadius: '12px', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={120} color="#000000" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', textAlign: 'left', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div><strong style={{ color: 'var(--text-muted)' }}>Visitor:</strong> {activeVisitorForQR.name}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Purpose:</strong> {activeVisitorForQR.purpose}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>Expected Date:</strong> {new Date(activeVisitorForQR.visitDate).toLocaleDateString()}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveVisitorForQR(null)}>Close Pass</button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (Visible only on mobile screen widths) */}
      {currentUser && (
        <nav className="bottom-nav">
          <button className={`bottom-nav-item ${subView === 'dashboard' ? 'active' : ''}`} onClick={() => setSubView('dashboard')}>
            <Home size={20} />
            <span>Home</span>
          </button>
          <button className={`bottom-nav-item ${subView === 'attendance' ? 'active' : ''}`} onClick={() => setSubView('attendance')}>
            <QrCode size={20} />
            <span>Attendance</span>
          </button>
          <button className={`bottom-nav-item ${subView === 'ai_assistant' ? 'active' : ''}`} onClick={() => setSubView('ai_assistant')}>
            <Sparkles size={20} />
            <span>AI Assistant</span>
          </button>
          <button className={`bottom-nav-item ${subView === 'complaints' ? 'active' : ''}`} onClick={() => setSubView('complaints')}>
            <AlertTriangle size={20} />
            <span>Complaints</span>
          </button>
          <button className="bottom-nav-item" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={20} />
            <span>More</span>
          </button>
        </nav>
      )}

      {/* Footer */}
      <footer style={{
        height: '48px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-card)',
        paddingBottom: currentUser ? '0' : '0' // Adjusted layout spacing
      }}>
        © 2026 SmartHostel AI · Secure Enterprise Edition
      </footer>
    </div>
  );
}
