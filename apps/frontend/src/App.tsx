import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Activity,
  Database,
  Camera,
  CameraOff,
  Download,
  Wifi,
  WifiOff,
  CheckCheck,
  Info,
  ChevronRight,
  Building2,
  GraduationCap,
  Phone,
  MapPin,
  Globe,
  Compass,
  Wrench,
  ShieldAlert,
  Play,
  Check
} from 'lucide-react';
import { useTranslation, languages } from './i18n';


// Setup base url
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UserRole = 'SUPER_ADMIN' | 'HOSTEL_ADMIN' | 'ASSISTANT_WARDEN' | 'MESS_MANAGER' | 'SECURITY' | 'MAINTENANCE' | 'ACCOUNTANT' | 'STUDENT' | 'WARDEN' | 'STAFF' | 'WORKER';

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
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
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
  messId?: string | null;
}

// Attendance circular ring component
const AttendanceRing = ({ percentage }: { percentage: number }) => {
  const { t } = useTranslation();
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
      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dashboard.overallAttendance')}</span>
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
              background: 'var(--primary)',
              borderRadius: '4px 4px 0 0'
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

// =============================================
// TOAST NOTIFICATION SYSTEM
// =============================================
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

const ToastContainer = ({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) => {
  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertTriangle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{ animationDuration: '0.35s' }}>
          <span className="toast-icon">{icons[t.type]}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.message && <div className="toast-message">{t.message}</div>}
          </div>
          <button className="toast-close" onClick={() => removeToast(t.id)}><X size={14} /></button>
          <div className="toast-progress" style={{ animationDuration: `${t.duration || 4000}ms` }} />
        </div>
      ))}
    </div>
  );
};

export default function App() {
  const { t, lang, changeLanguage } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // ── Dynamic 5-min Temporary QR states ──
  const [tempQrData, setTempQrData] = useState<any | null>(null);
  const [qrCountdownSeconds, setQrCountdownSeconds] = useState<number>(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Scanner GPS states ──
  const [scannerGps, setScannerGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('Detecting...');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'register' | 'dashboard' | 'qr_login'>('home');
  const [subView, setSubView] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // â”€â”€ Toast System â”€â”€
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((type: Toast['type'], title: string, message?: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration + 300);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // â”€â”€ PWA States â”€â”€
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);

  // â”€â”€ Camera QR Scanner â”€â”€
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // â”€â”€ Leave Type â”€â”€
  const [leaveType, setLeaveType] = useState('Casual');

  // â”€â”€ Student Profile View â”€â”€
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null);
  const [profileTab, setProfileTab] = useState('personal');

  // â”€â”€ Room Filter â”€â”€
  const [roomFilter, setRoomFilter] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  // â”€â”€ AI Typing Indicator â”€â”€
  const [aiTyping, setAiTyping] = useState(false);

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
  const [leavesHistory, setLeavesHistory] = useState<any[]>([]);

  // Hostel creation state
  const [newHostelName, setNewHostelName] = useState('');
  const [newHostelCode, setNewHostelCode] = useState('');
  const [newHostelCollege, setNewHostelCollege] = useState('');
  const [newHostelAddress, setNewHostelAddress] = useState('');
  const [newHostelCapacity, setNewHostelCapacity] = useState<string | number>(120);

  // Room creation state
  const [newRoomBlock, setNewRoomBlock] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('0');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('4');

  // ERP modules state
  const [messes, setMesses] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [studentDocs, setStudentDocs] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Form selections and parameters
  const [newInvName, setNewInvName] = useState('');
  const [newInvCat, setNewInvCat] = useState('FOOD');
  const [newInvQty, setNewInvQty] = useState(0);
  const [newInvUnit, setNewInvUnit] = useState('kg');
  const [newInvMin, setNewInvMin] = useState(5);
  const [invUseQty, setInvUseQty] = useState(0);
  const [invUseBy, setInvUseBy] = useState('');
  const [invUsePurpose, setInvUsePurpose] = useState('');
  const [invBuyQty, setInvBuyQty] = useState(0);
  const [invBuyCost, setInvBuyCost] = useState(0);
  const [invBuySupplier, setInvBuySupplier] = useState('');

  const [newExpCat, setNewExpCat] = useState('ELECTRICITY');
  const [newExpAmt, setNewExpAmt] = useState(0);
  const [newExpDesc, setNewExpDesc] = useState('');

  const [newPayStaffId, setNewPayStaffId] = useState('');
  const [newPayMonth, setNewPayMonth] = useState('2026-08');
  const [newPayBase, setNewPayBase] = useState(0);
  const [newPayBonus, setNewPayBonus] = useState(0);
  const [newPayDeductions, setNewPayDeductions] = useState(0);

  const [feeTitle, setFeeTitle] = useState('');
  const [feeAmount, setFeeAmount] = useState(0);
  const [feeDueDate, setFeeDueDate] = useState('');
  const [feeStudentId, setFeeStudentId] = useState('');

  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState('UPI');
  const [payTxId, setPayTxId] = useState('');

  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [newMessName, setNewMessName] = useState('');
  const [laundrySlots, setLaundrySlots] = useState<any[]>([]);
  // Gate Pass state
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [gpPurpose, setGpPurpose] = useState('');
  const [gpDestination, setGpDestination] = useState('');
  const [gpExpectedReturn, setGpExpectedReturn] = useState('');

  // Notices state
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeAudience, setNoticeAudience] = useState('ALL');
  const [noticeIsEmergency, setNoticeIsEmergency] = useState(false);
  const [noticeIsPinned, setNoticeIsPinned] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Worker Management & Emergency States ──
  const [workerCategories, setWorkerCategories] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [workerDashboardData, setWorkerDashboardData] = useState<any | null>(null);
  const [emergencyAlertsList, setEmergencyAlertsList] = useState<any[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerEmail, setNewWorkerEmail] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');
  const [newWorkerMobile, setNewWorkerMobile] = useState('');
  const [newWorkerCategoryId, setNewWorkerCategoryId] = useState('');
  const [newWorkerSpec, setNewWorkerSpec] = useState('');

  // Complaint Assignment & Timeline States
  const [showAssignWorkerModal, setShowAssignWorkerModal] = useState(false);
  const [selectedComplaintForAssign, setSelectedComplaintForAssign] = useState<any | null>(null);
  const [selectedWorkerIdForAssign, setSelectedWorkerIdForAssign] = useState('');
  const [showRejectWorkerModal, setShowRejectWorkerModal] = useState(false);
  const [selectedComplaintForReject, setSelectedComplaintForReject] = useState<any | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [showCompleteWorkModal, setShowCompleteWorkModal] = useState(false);
  const [selectedComplaintForComplete, setSelectedComplaintForComplete] = useState<any | null>(null);
  const [completionNotesInput, setCompletionNotesInput] = useState('');
  const [materialsUsedInput, setMaterialsUsedInput] = useState('');
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedComplaintTimeline, setSelectedComplaintTimeline] = useState<any | null>(null);
  const [showConfirmResolutionModal, setShowConfirmResolutionModal] = useState(false);
  const [selectedComplaintForConfirm, setSelectedComplaintForConfirm] = useState<any | null>(null);
  const [resolutionRatingInput, setResolutionRatingInput] = useState(5);
  const [resolutionFeedbackInput, setResolutionFeedbackInput] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedComplaintForReopen, setSelectedComplaintForReopen] = useState<any | null>(null);
  const [reopenReasonInput, setReopenReasonInput] = useState('');

  // Emergency Modal States
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyLevel, setEmergencyLevel] = useState<'ROOM' | 'FLOOR' | 'HOSTEL'>('ROOM');
  const [emergencyType, setEmergencyType] = useState('Medical');
  const [emergencyMessageInput, setEmergencyMessageInput] = useState('');

  // Laundry date state
  const [laundryDate, setLaundryDate] = useState('');
  const [laundryTimeSlot, setLaundryTimeSlot] = useState('8:00 AM - 10:00 AM');
  const [laundryClothes, setLaundryClothes] = useState(5);
  const [laundryNotes, setLaundryNotes] = useState('');

  // Mess menu state
  const [messMenus, setMessMenus] = useState<any[]>([]);
  const [menuDay, setMenuDay] = useState('Monday');
  const [menuBreakfast, setMenuBreakfast] = useState('');
  const [menuLunch, setMenuLunch] = useState('');
  const [menuDinner, setMenuDinner] = useState('');

  // Reports state
  const [reportType, setReportType] = useState('fees');
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);



  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoomHostelId, setNewRoomHostelId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [remarksText, setRemarksText] = useState('');
  const [activeLeaveIdForRemarks, setActiveLeaveIdForRemarks] = useState<string | null>(null);

  // Complaint improvements


  // Visitor improvements
  const [visitorExpectedArrival, setVisitorExpectedArrival] = useState('');
  const [activeVisitorForQR, setActiveVisitorForQR] = useState<any | null>(null);

  const [selectedAllocatedRooms, setSelectedAllocatedRooms] = useState<Record<string, string>>({});

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

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));
    }

    // PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Online/Offline detection
    const handleOnline = () => {
      setIsOnline(true);
      setShowOnlineBanner(true);
      setTimeout(() => setShowOnlineBanner(false), 3000);
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Camera cleanup on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const captureScannerGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('Geolocation not supported');
      setGpsError('Geolocation is not supported by this browser.');
      return;
    }
    setGpsStatus('Detecting GPS location...');
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setScannerGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setGpsStatus(`GPS Active (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setGpsError(err.message || 'Location permission denied');
        setGpsStatus('Location Unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, []);

  const handleGenerateStudentQR = async () => {
    try {
      const res = await axios.post('/api/attendance/generate-qr');
      if (res.data?.success) {
        setTempQrData(res.data.data);
        setQrCountdownSeconds(300); // 5 minutes

        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = setInterval(() => {
          setQrCountdownSeconds((prev) => {
            if (prev <= 1) {
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        showToast('success', t('attendance.generateQr'), t('attendance.qrValidFor', { time: '05:00' }));
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to generate QR');
    }
  };

  // Camera QR scanning functions
  const startCameraStream = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } }
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);

      // Try BarcodeDetector API
      if ('BarcodeDetector' in window) {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        scanIntervalRef.current = setInterval(async () => {
          if (videoRef.current && barcodeDetectorRef.current) {
            try {
              const codes = await barcodeDetectorRef.current.detect(videoRef.current);
              if (codes.length > 0) {
                const rawValue = codes[0].rawValue;
                if (rawValue) {
                  stopCameraStream();
                  handleQRScan(rawValue);
                }
              }
            } catch (_) {}
          }
        }, 500);
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera access denied. Please enable camera permissions or use manual input.');
      setCameraActive(false);
    }
  };

  const stopCameraStream = () => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (cameraStreamRef.current) { cameraStreamRef.current.getTracks().forEach(t => t.stop()); cameraStreamRef.current = null; }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    setCameraActive(false);
  };

  const handlePwaInstall = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('success', 'App Installed!', 'SmartHostel AI has been added to your home screen.');
    }
    setDeferredInstallPrompt(null);
    setShowInstallBanner(false);
  };

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
        showToast('success', 'Settings Updated', 'Attendance settings saved successfully.');
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.error || 'Failed to update settings');
    }
  };

  const loadWorkerCategories = async () => {
    try {
      const res = await axios.get('/api/workers/categories');
      if (res.data?.success) setWorkerCategories(res.data.data);
    } catch (e) {}
  };

  const loadWorkersList = async () => {
    try {
      const res = await axios.get('/api/workers');
      if (res.data?.success) setWorkersList(res.data.data);
    } catch (e) {}
  };

  const loadWorkerDashboard = async () => {
    try {
      const res = await axios.get('/api/worker/dashboard');
      if (res.data?.success) setWorkerDashboardData(res.data.data);
    } catch (e) {}
  };

  const loadEmergencyAlerts = async () => {
    try {
      const res = await axios.get('/api/emergency/alerts');
      if (res.data?.success) setEmergencyAlertsList(res.data.data);
    } catch (e) {}
  };

  const handleCreateWorkerCategory = async () => {
    if (!newCatName) return;
    try {
      const res = await axios.post('/api/workers/categories', { name: newCatName, description: newCatDesc });
      if (res.data?.success) {
        showToast('success', t('worker.categories'), 'Worker category created');
        setShowAddCategoryModal(false);
        setNewCatName(''); setNewCatDesc('');
        loadWorkerCategories();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to create category');
    }
  };

  const handleCreateWorker = async () => {
    if (!newWorkerName || !newWorkerEmail || !newWorkerPassword || !newWorkerCategoryId) {
      showToast('error', t('common.error'), 'Please fill in all required fields');
      return;
    }
    try {
      const res = await axios.post('/api/workers', {
        fullName: newWorkerName,
        email: newWorkerEmail,
        password: newWorkerPassword,
        mobileNumber: newWorkerMobile,
        categoryId: newWorkerCategoryId,
        specialization: newWorkerSpec
      });
      if (res.data?.success) {
        showToast('success', t('worker.addWorker'), 'Worker registered successfully');
        setShowAddWorkerModal(false);
        setNewWorkerName(''); setNewWorkerEmail(''); setNewWorkerPassword(''); setNewWorkerMobile(''); setNewWorkerCategoryId(''); setNewWorkerSpec('');
        loadWorkersList();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to register worker');
    }
  };

  const handleAssignWorkerToComplaint = async () => {
    if (!selectedComplaintForAssign || !selectedWorkerIdForAssign) return;
    try {
      const res = await axios.post(`/api/complaints/${selectedComplaintForAssign.id}/assign`, { workerId: selectedWorkerIdForAssign });
      if (res.data?.success) {
        showToast('success', t('worker.assignedJobs'), 'Worker assigned successfully');
        setShowAssignWorkerModal(false);
        setSelectedComplaintForAssign(null);
        setSelectedWorkerIdForAssign('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to assign worker');
    }
  };

  const handleAcceptWorkerJob = async (id: string) => {
    try {
      const res = await axios.post(`/api/worker/complaints/${id}/accept`);
      if (res.data?.success) {
        showToast('success', t('worker.accept'), 'Job accepted');
        loadWorkerDashboard();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to accept job');
    }
  };

  const handleRejectWorkerJob = async () => {
    if (!selectedComplaintForReject) return;
    try {
      const res = await axios.post(`/api/worker/complaints/${selectedComplaintForReject.id}/reject`, { reason: rejectReasonInput });
      if (res.data?.success) {
        showToast('success', t('worker.reject'), 'Job assignment rejected');
        setShowRejectWorkerModal(false);
        setSelectedComplaintForReject(null);
        setRejectReasonInput('');
        loadWorkerDashboard();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to reject job');
    }
  };

  const handleStartWorkerJob = async (id: string) => {
    try {
      const res = await axios.post(`/api/worker/complaints/${id}/start`);
      if (res.data?.success) {
        showToast('success', t('worker.startWork'), 'Status updated to In Progress');
        loadWorkerDashboard();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || 'Failed to start job');
    }
  };

  const handleCompleteWorkerJob = async () => {
    if (!selectedComplaintForComplete) return;
    try {
      const res = await axios.post(`/api/worker/complaints/${selectedComplaintForComplete.id}/complete`, {
        completionNotes: completionNotesInput,
        materialsUsed: materialsUsedInput
      });
      if (res.data?.success) {
        showToast('success', t('worker.completeWork'), t('dialogs.saveSuccess'));
        setShowCompleteWorkModal(false);
        setSelectedComplaintForComplete(null);
        setCompletionNotesInput('');
        setMaterialsUsedInput('');
        loadWorkerDashboard();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const handleConfirmComplaintResolution = async () => {
    if (!selectedComplaintForConfirm) return;
    try {
      const res = await axios.post(`/api/complaints/${selectedComplaintForConfirm.id}/confirm`, {
        rating: resolutionRatingInput,
        feedback: resolutionFeedbackInput
      });
      if (res.data?.success) {
        showToast('success', t('complaints.confirm'), t('dialogs.saveSuccess'));
        setShowConfirmResolutionModal(false);
        setSelectedComplaintForConfirm(null);
        setResolutionRatingInput(5);
        setResolutionFeedbackInput('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const handleReopenComplaint = async () => {
    if (!selectedComplaintForReopen) return;
    try {
      const res = await axios.post(`/api/complaints/${selectedComplaintForReopen.id}/reopen`, {
        reason: reopenReasonInput
      });
      if (res.data?.success) {
        showToast('warning', t('common.reopened'), t('complaints.reopened'));
        setShowReopenModal(false);
        setSelectedComplaintForReopen(null);
        setReopenReasonInput('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const handleTriggerEmergency = async () => {
    try {
      const res = await axios.post('/api/emergency/alert', {
        type: emergencyType,
        level: emergencyLevel,
        message: emergencyMessageInput
      });
      if (res.data?.success) {
        showToast('error', `🚨 ${t('emergency.sendAlert')}`, `${t('emergency.active')}`);
        setShowEmergencyModal(false);
        setEmergencyMessageInput('');
        loadEmergencyAlerts();

        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1);
        } catch (_) {}
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const handleAcknowledgeEmergency = async (id: string) => {
    try {
      const res = await axios.post(`/api/emergency/${id}/acknowledge`);
      if (res.data?.success) {
        showToast('info', t('emergency.acknowledge'), t('emergency.acknowledged'));
        loadEmergencyAlerts();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const handleResolveEmergency = async (id: string) => {
    try {
      const res = await axios.post(`/api/emergency/${id}/resolve`);
      if (res.data?.success) {
        showToast('success', t('emergency.resolve'), t('emergency.resolved'));
        loadEmergencyAlerts();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const handleJoinLaundryWaitlist = async (timeSlot: string, date: string) => {
    try {
      const res = await axios.post('/api/laundry/waitlist', { timeSlot, date });
      if (res.data?.success) {
        showToast('success', t('waitlist.inWaitlist'), t('waitlist.slotAvailableMsg'));
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    }
  };

  const loadDashboardData = async (user: UserProfile) => {
    try {
      // 1. Core lists
      const resComp = await axios.get('/api/complaints');
      if (resComp.data?.success) setComplaints(resComp.data.data);

      const resVis = await axios.get('/api/visitors');
      if (resVis.data?.success) setVisitors(resVis.data.data);

      // Worker & Emergency Data
      loadWorkerCategories();
      loadWorkersList();
      loadEmergencyAlerts();
      if (user.role === 'WORKER') {
        loadWorkerDashboard();
        setSubView('worker_dashboard');
      }

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

      // Load ERP-specific tables in individual try-catch blocks
      try {
        const resPerms = await axios.get('/api/permissions');
        if (resPerms.data?.success) setRolePermissions(resPerms.data.data);
      } catch (e) {}

      try {
        const resMesses = await axios.get('/api/messes');
        if (resMesses.data?.success) setMesses(resMesses.data.data);
      } catch (e) {}

      try {
        const resFees = await axios.get('/api/fees');
        if (resFees.data?.success) setFees(resFees.data.data);
      } catch (e) {}



      try {
        const resInv = await axios.get('/api/inventory');
        if (resInv.data?.success) setInventory(resInv.data.data);
      } catch (e) {}

      try {
        const resExp = await axios.get('/api/expenses');
        if (resExp.data?.success) setExpenses(resExp.data.data);
      } catch (e) {}

      try {
        const resPayroll = await axios.get('/api/payroll');
        if (resPayroll.data?.success) setPayroll(resPayroll.data.data);
      } catch (e) {}

      try {
        const resLogs = await axios.get('/api/audit-logs');
        if (resLogs.data?.success) setAuditLogs(resLogs.data.data);
      } catch (e) {}

      try {
        const resStudents = await axios.get('/api/students');
        if (resStudents.data?.success) setAllStudents(resStudents.data.data);
      } catch (e) {}

      if (user.role === 'STUDENT') {
        try {
          const resDocs = await axios.get(`/api/students/${user.id}/documents`);
          if (resDocs.data?.success) setStudentDocs(resDocs.data.data);
        } catch (e) {}
      }

      // 5. Role specific lists
      if (['SUPER_ADMIN', 'WARDEN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(user.role)) {
        const resPending = await axios.get('/api/admin/pending-approvals');
        if (resPending.data?.success) setPendingUsers(resPending.data.data);

        const resRooms = await axios.get('/api/rooms');
        if (resRooms.data?.success) setRooms(resRooms.data.data);
      }
      // Load new ERP modules
      try { loadGatePasses(); } catch (e) {}
      try { loadNotices(); } catch (e) {}
      try { loadNotifications(); } catch (e) {}
      try { loadLaundrySlots(); } catch (e) {}
      try { loadMessMenus(); } catch (e) {}
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
        device: selectedCamera,
        latitude: scannerGps?.latitude,
        longitude: scannerGps?.longitude,
        accuracy: scannerGps?.accuracy
      });
      if (res.data?.success) {
        playSuccessSound();
        setScannerStatus('Success');
        const distStr = typeof res.data.distanceMeters === 'number' ? ` (${res.data.distanceMeters}m)` : '';
        setLastScannedStudent({
          ...res.data.student,
          time: new Date().toLocaleTimeString(),
          status: 'PRESENT',
          message: `${t('attendance.markedSuccess')}${distStr}`
        });
        showToast('success', t('attendance.markedSuccess'), `${t('attendance.locationVerified')}${distStr}`);
        
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
          qrVerification: 'VERIFIED',
          referenceCode: res.data.attendance?.referenceCode || 'ATD-LIVE',
          locationCode: res.data.attendance?.locationCode || 'HSTL-MAIN-001',
          distanceMeters: res.data.distanceMeters ?? 0
        };
        setScanHistory(prev => [newLog, ...prev]);
        
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
          showToast('warning', t('attendance.title'), t('attendance.alreadyMarked') || 'Attendance already recorded for this session.');
        } else if (res.data?.status === 'OUTSIDE_RADIUS') {
          showToast('error', t('attendance.locationFailed'), res.data.error || t('attendance.outsideRadius'));
        } else if (res.data?.status === 'LOCATION_LOW_ACCURACY') {
          showToast('warning', t('attendance.locationRequired'), t('attendance.locationLowAccuracy'));
        } else if (res.data?.status === 'EXPIRED') {
          showToast('error', t('attendance.qrExpired'), t('attendance.qrExpiredMsg'));
        } else {
          showToast('error', t('attendance.locationFailed'), res.data?.error || res.data?.message || 'Verification Failed');
        }
      }
    } catch (err: any) {
      playErrorSound();
      setScannerStatus('Error');
      showToast('error', 'QR Scan Error', err.response?.data?.error || 'QR Verification Failed');
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
        showToast('success', 'Session Created', `Attendance session created successfully.`);
      }
    } catch (err: any) {
      showToast('error', 'Failed', err.response?.data?.error || 'Failed to create session');
    }
  };

  const handleUpdateSession = async (id: string, name: string, isActive: boolean) => {
    try {
      const res = await axios.patch(`/api/attendance/sessions/${id}`, { name, isActive });
      if (res.data?.success) {
        setEditingSessionId(null);
        fetchAttendanceSessions();
        showToast('success', 'Session Updated', 'Changes saved.');
      }
    } catch (err: any) {
      showToast('error', 'Failed', err.response?.data?.error || 'Failed to update session');
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      const res = await axios.delete(`/api/attendance/sessions/${id}`);
      if (res.data?.success) {
        fetchAttendanceSessions();
        showToast('info', 'Session Deleted', 'Attendance session removed.');
      }
    } catch (err: any) {
      showToast('error', 'Failed', err.response?.data?.error || 'Failed to delete session');
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
        if (res.data.token) {
          localStorage.setItem('access_token', res.data.token);
        }
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
        if (res.data.token) {
          localStorage.setItem('access_token', res.data.token);
        }
        const user = res.data.data as UserProfile;
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'WARDEN') {
          showToast('info', 'Notice', '');
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
        showToast('info', 'Notice', res.data.message);
        setView('login');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('access_token');
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout request failed');
    }
    setCurrentUser(null);
    setView('home');
    setSubView('dashboard');
  };

  const handleApprove = async (userId: string) => {
    try {
      const res = await axios.post('/api/admin/approve-user', { userId });
      if (res.data?.success) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        showToast('success', 'Done', '');
      }
    } catch (err) {
      showToast('info', 'Notice', '');
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const res = await axios.post('/api/admin/reject-user', { userId });
      if (res.data?.success) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
        showToast('success', 'Done', '');
      }
    } catch (err) {
      showToast('info', 'Notice', '');
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
        showToast('success', 'Done', '');
        loadHostels();
        setNewHostelName('');
        setNewHostelCode('');
        setNewHostelCollege('');
        setNewHostelAddress('');
        setNewHostelCapacity('');
      }
    } catch (err) {
      showToast('info', 'Notice', '');
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
        showToast('success', 'Done', '');
        setNewRoomBlock('');
        setNewRoomNumber('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
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
        showToast('info', 'Notice', '');
        setManualStudentId('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  // Leave Management Workflow
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullReason = leaveType !== 'Other' ? `[${leaveType.toUpperCase()}] ${leaveReason}` : leaveReason;
      const res = await axios.post('/api/leaves', {
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: fullReason
      });
      if (res.data?.success) {
        showToast('success', 'Leave Applied', `Your ${leaveType} leave request has been submitted for approval.`);
        setLeaveStartDate('');
        setLeaveEndDate('');
        setLeaveReason('');
        setLeaveType('Casual');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Leave Failed', err.response?.data?.error || 'Could not submit leave request');
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await axios.patch(`/api/leaves/${leaveId}`, {
        status,
        remarks: remarksText
      });
      if (res.data?.success) {
        showToast('success', `Leave ${status}`, `Leave request ${status.toLowerCase()} successfully!`);
        setRemarksText('');
        setActiveLeaveIdForRemarks(null);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    // confirm: ''
    try {
      const res = await axios.delete(`/api/leaves/${leaveId}`);
      if (res.data?.success) {
        showToast('info', 'Notice', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
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
        showToast('success', 'Done', '');
        setCompTitle('');
        setCompDesc('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
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
        showToast('success', 'Done', '');
        setVisName('');
        setVisPurpose('');
        setVisDate('');
        setVisitorExpectedArrival('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
    }
  };

  const handleUpdateVisitorStatus = async (visitorId: string, status: string, checkIn?: boolean, checkOut?: boolean) => {
    try {
      const payload: any = { status };
      if (checkIn) payload.checkInTime = new Date();
      if (checkOut) payload.checkOutTime = new Date();

      const res = await axios.patch(`/api/visitors/${visitorId}`, payload);
      if (res.data?.success) {
        showToast('success', 'Done', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
    }
  };

  // AI Assistant simulated answers
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setAiTyping(true);

    // Data-aware AI response engine
    setTimeout(() => {
      setAiTyping(false);
      const q = userMsg.toLowerCase();
      let aiText = '';

      // === ATTENDANCE ===
      if (q.includes('attendance') || q.includes('percent') || q.includes('present') || q.includes('absent')) {
        const pct = attendanceStats.percentage;
        const status = pct >= 75 ? '✅ Good standing' : pct >= 60 ? '⚠️ Below target' : '🔴 Critical – at risk';
        aiText = `Your current attendance is **${pct}%** (${attendanceStats.present} present, ${attendanceStats.absent} absent). Status: ${status}. The minimum required is 75%.`;
        if (pct < 75) aiText += ` You need to attend more sessions to avoid academic penalties.`;
      }

      // === LEAVES ===
      else if (q.includes('leave') || q.includes('absence')) {
        const total = leavesHistory.length;
        const pending = leavesHistory.filter(l => l.status === 'PENDING').length;
        const approved = leavesHistory.filter(l => l.status === 'APPROVED').length;
        const recent = leavesHistory[0];
        if (total === 0) {
          aiText = `You haven't applied for any leaves yet. Go to **Leaves Hub** in the sidebar to apply.`;
        } else {
          aiText = `You have **${total}** leave requests: ${approved} approved, ${pending} pending review.`;
          if (recent) aiText += ` Your most recent request (${recent.reason?.slice(0, 40)}) is **${recent.status}**.`;
        }
      }

      // === COMPLAINTS ===
      else if (q.includes('complaint') || q.includes('issue') || q.includes('problem') || q.includes('repair')) {
        const active = complaints.filter(c => c.status !== 'RESOLVED').length;
        const resolved = complaints.filter(c => c.status === 'RESOLVED').length;
        if (complaints.length === 0) {
          aiText = `You have no complaints raised. Go to **Complaints** in the sidebar to report any maintenance or hostel issue.`;
        } else {
          aiText = `You have **${complaints.length}** complaint(s): ${active} active, ${resolved} resolved. `;
          if (complaints[0]) aiText += `Latest: "${complaints[0].title}" (${complaints[0].status}).`;
        }
      }

      // === MESS / MENU ===
      else if (q.includes('menu') || q.includes('food') || q.includes('eat') || q.includes('breakfast') || q.includes('lunch') || q.includes('dinner') || q.includes('mess')) {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayMenu = messMenus.find((m: any) => m.dayOfWeek === today);
        if (todayMenu) {
          aiText = `🍽️ Today's menu (${today}):\n• **Breakfast**: ${todayMenu.breakfast || 'Not set'}\n• **Lunch**: ${todayMenu.lunch || 'Not set'}\n• **Dinner**: ${todayMenu.dinner || 'Not set'}`;
        } else if (messMenus.length > 0) {
          const sample = messMenus[0];
          aiText = `Today's specific menu isn't set, but ${sample.dayOfWeek}'s menu has: Breakfast: ${sample.breakfast}, Lunch: ${sample.lunch}, Dinner: ${sample.dinner}.`;
        } else {
          aiText = `The mess menu hasn't been updated yet for this week. Please check with the Mess Manager.`;
        }
      }

      // === FEES / PAYMENTS ===
      else if (q.includes('fee') || q.includes('payment') || q.includes('due') || q.includes('paid') || q.includes('money')) {
        const pending = fees.filter((f: any) => f.status === 'PENDING').length;
        const overdue = fees.filter((f: any) => f.status === 'OVERDUE').length;
        if (fees.length === 0) {
          aiText = `No fee records found for your account. Check with the Accountant if you expect fees to appear.`;
        } else {
          aiText = `Your fee summary: **${fees.length}** total fee records, **${pending}** pending, **${overdue}** overdue. Go to **Fee Summary** to view payment details.`;
        }
      }

      // === ROOM ===
      else if (q.includes('room') || q.includes('bed') || q.includes('hostel') || q.includes('floor')) {
        const room = currentUser?.room;
        if (room) {
          aiText = `You are assigned to Room **${room.roomNumber}**, Block **${room.block}**. Contact your warden if you need room changes.`;
        } else {
          aiText = `You don't have a room assigned yet. Please contact the Hostel Admin to get a room allocated.`;
        }
      }

      // === LAUNDRY ===
      else if (q.includes('laundry') || q.includes('wash') || q.includes('clothes')) {
        const mySlots = laundrySlots.filter((s: any) => s.status !== 'DELIVERED' && s.status !== 'CANCELLED');
        if (mySlots.length > 0) {
          aiText = `You have **${mySlots.length}** active laundry booking(s). Next slot: ${new Date(mySlots[0].date).toLocaleDateString()} at ${mySlots[0].timeSlot}.`;
        } else {
          aiText = `No active laundry slots. Go to **Laundry** in the sidebar to book a pickup slot.`;
        }
      }

      // === GATE PASS ===
      else if (q.includes('gate') || q.includes('exit') || q.includes('pass') || q.includes('outside')) {
        const myPasses = gatePasses.filter((gp: any) => ['PENDING', 'APPROVED', 'EXITED'].includes(gp.status));
        if (myPasses.length > 0) {
          aiText = `You have **${myPasses.length}** active gate pass(es). To request an exit pass, go to **Gate Pass** in the sidebar.`;
        } else {
          aiText = `No active gate passes. You can request one from the **Gate Pass** section. Note: approval is required before exit.`;
        }
      }

      // === VISITORS ===
      else if (q.includes('visitor') || q.includes('guest') || q.includes('family') || q.includes('parents')) {
        aiText = `To register a visitor, go to the **Visitor Pass** section and fill in visitor details. Security staff verify visitor passes at the gate. You currently have **${visitors.length}** visitor record(s).`;
      }

      // === NOTICES ===
      else if (q.includes('notice') || q.includes('announcement') || q.includes('news')) {
        const pinned = notices.filter((n: any) => n.isPinned);
        const emergency = notices.filter((n: any) => n.isEmergency);
        if (notices.length === 0) {
          aiText = `No notices posted currently. Check the **Notice Board** for updates.`;
        } else {
          aiText = `There are **${notices.length}** notice(s) posted. ${emergency.length > 0 ? `⚠️ ${emergency.length} emergency notice(s)!` : ''} ${pinned.length > 0 ? `📌 ${pinned.length} pinned.` : ''} Check the **Notice Board** for details.`;
        }
      }

      // === GREETINGS ===
      else if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('good morning') || q.includes('good evening')) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        aiText = `${greeting}, ${currentUser?.fullName?.split(' ')[0] || 'there'}! 👋 I'm your SmartHostel AI assistant. I can help with attendance, leaves, complaints, fees, mess menus, laundry, and more.`;
      }

      // === HELP ===
      else if (q.includes('help') || q.includes('what can') || q.includes('capabilities')) {
        aiText = `I can answer questions about:\n• 📊 Attendance percentage & history\n• 🗓️ Leave applications & status\n• ⚠️ Complaints & maintenance\n• 🍽️ Today's mess menu\n• 💳 Fee payments & due dates\n• 🏠 Room information\n• 🧺 Laundry bookings\n• 🚪 Gate pass status\n• 👥 Visitor registrations\n• 📢 Notices & announcements\n\nJust ask naturally!`;
      }

      else {
        aiText = `I'm not sure about that. Try asking me about your **attendance**, **leaves**, **complaints**, **mess menu**, or **fee status**. Type "help" to see all I can do!`;
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: aiText }]);
    }, 900);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // ERP Backend Handlers
  const handleCreateMess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessName) return;
    try {
      const res = await axios.post('/api/messes', { name: newMessName, hostelId: currentUser?.hostelId || hostels[0]?.id });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setNewMessName('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleEnrollMess = async (messId: string) => {
    try {
      const res = await axios.post('/api/messes/enroll', { studentId: currentUser?.id, messId });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleMarkMessAttendance = async (studentId: string, messId: string, mealType: string, isPresent: boolean) => {
    try {
      const res = await axios.post('/api/messes/attendance', {
        studentId, messId, mealType, isPresent, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/fees', {
        title: feeTitle, amount: feeAmount, dueDate: feeDueDate, studentId: feeStudentId, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setFeeTitle('');
        setFeeAmount(0);
        setFeeStudentId('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handlePayFee = async (feeId: string) => {
    try {
      const res = await axios.post(`/api/fees/${feeId}/pay`, {
        amount: payAmount || 1200, paymentMode: payMode, transactionId: payTxId
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setPayAmount(0);
        setPayTxId('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/inventory', {
        itemName: newInvName, category: newInvCat, quantity: newInvQty, unit: newInvUnit, minStock: newInvMin, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setNewInvName('');
        setNewInvQty(0);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleUseInventory = async (itemId: string) => {
    try {
      const res = await axios.post(`/api/inventory/${itemId}/usage`, {
        quantity: invUseQty, usedBy: invUseBy || currentUser?.fullName, purpose: invUsePurpose, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setInvUseQty(0);
        setInvUseBy('');
        setInvUsePurpose('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleBuyInventory = async (itemId: string) => {
    try {
      const res = await axios.post(`/api/inventory/${itemId}/purchase`, {
        quantity: invBuyQty, cost: invBuyCost, supplier: invBuySupplier, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setInvBuyQty(0);
        setInvBuyCost(0);
        setInvBuySupplier('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/expenses', {
        category: newExpCat, amount: newExpAmt, description: newExpDesc, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setNewExpAmt(0);
        setNewExpDesc('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/payroll/generate', {
        staffId: newPayStaffId, month: newPayMonth, baseSalary: newPayBase, bonus: newPayBonus, deductions: newPayDeductions, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setNewPayStaffId('');
        setNewPayBase(0);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handlePayPayroll = async (payrollId: string) => {
    try {
      const res = await axios.post(`/api/payroll/${payrollId}/pay`);
      if (res.data?.success) {
        showToast('success', 'Done', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/students/${currentUser?.id}/documents`, {
        name: docName, fileUrl: docUrl, hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        setDocName('');
        setDocUrl('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleStudentStatusUpdate = async (studentId: string, status: string, roomId?: string) => {
    try {
      const res = await axios.post(`/api/students/${studentId}/status`, { status, roomId });
      if (res.data?.success) {
        showToast('success', 'Student Updated', `Verification state updated to ${status}!`);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleUpdatePermissions = async (role: string, perms: string[]) => {
    try {
      const res = await axios.post('/api/permissions/update', { role, permissions: perms });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await axios.get('/api/backup/export');
      if (res.data?.success) {
        const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.data));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", jsonContent);
        downloadAnchor.setAttribute("download", `hostel_erp_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
    }
  };

  const handleRestoreBackup = async (backupText: string) => {
    try {
      const backup = JSON.parse(backupText);
      const res = await axios.post('/api/backup/restore', { backup });
      if (res.data?.success) {
        showToast('success', 'Done', '');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err) {
      showToast('info', 'Notice', '');
    }
  };


  const loadGatePasses = async () => {
    try { const res = await axios.get('/api/gate-passes'); if (res.data?.success) setGatePasses(res.data.data); } catch (e) {}
  };
  const loadNotices = async () => {
    try { const res = await axios.get('/api/notices'); if (res.data?.success) setNotices(res.data.data); } catch (e) {}
  };
  const loadNotifications = async () => {
    try { const res = await axios.get('/api/notifications'); if (res.data?.success) { setNotifications(res.data.data); setUnreadCount(res.data.unreadCount || 0); } } catch (e) {}
  };
  const loadLaundrySlots = async () => {
    try { const res = await axios.get('/api/laundry'); if (res.data?.success) setLaundrySlots(res.data.data); } catch (e) {}
  };
  const loadMessMenus = async () => {
    try { const res = await axios.get('/api/mess-menus'); if (res.data?.success) setMessMenus(res.data.data); } catch (e) {}
  };

  const handleCreateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/gate-passes', { purpose: gpPurpose, destination: gpDestination, expectedReturn: gpExpectedReturn });
      if (res.data?.success) { showToast('info', 'Notice', ''); setGpPurpose(''); setGpDestination(''); setGpExpectedReturn(''); loadGatePasses(); }
    } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); }
  };
  const handleUpdateGatePass = async (id: string, status: string, remarks?: string) => {
    try {
      const res = await axios.patch(`/api/gate-passes/${id}`, { status, remarks });
      if (res.data?.success) { showToast('success', `Gate Pass ${status}`, `Gate pass has been ${status.toLowerCase()}.`); loadGatePasses(); }
    } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); }
  };
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/notices', { title: noticeTitle, content: noticeContent, audience: noticeAudience, isEmergency: noticeIsEmergency, isPinned: noticeIsPinned, hostelId: currentUser?.hostelId || undefined });
      if (res.data?.success) { showToast('success', 'Done', ''); setNoticeTitle(''); setNoticeContent(''); loadNotices(); }
    } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); }
  };
  const handleDeleteNotice = async (id: string) => {
    // confirm: ''
    try { await axios.delete(`/api/notices/${id}`); loadNotices(); } catch (e) { showToast('info', 'Notice', ''); }
  };
  const handleMarkNotificationRead = async (id: string) => {
    try { await axios.patch(`/api/notifications/${id}/read`); loadNotifications(); } catch (e) {}
  };
  const handleMarkAllRead = async () => {
    try { await axios.post('/api/notifications/mark-all-read'); loadNotifications(); } catch (e) {}
  };
  const handleBookLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/laundry', { date: laundryDate, timeSlot: laundryTimeSlot, clothesCount: laundryClothes, notes: laundryNotes });
      if (res.data?.success) { showToast('success', 'Done', ''); setLaundryDate(''); setLaundryNotes(''); loadLaundrySlots(); }
    } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); }
  };
  const handleUpdateLaundry = async (id: string, status: string) => {
    try { await axios.patch(`/api/laundry/${id}`, { status }); loadLaundrySlots(); } catch (e) { showToast('info', 'Notice', ''); }
  };
  const handleUpdateMessMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/mess-menus', { dayOfWeek: menuDay, breakfast: menuBreakfast, lunch: menuLunch, dinner: menuDinner, hostelId: currentUser?.hostelId || hostels[0]?.id });
      if (res.data?.success) { showToast('success', 'Menu Updated', `Menu for ${menuDay} updated!`); setMenuBreakfast(''); setMenuLunch(''); setMenuDinner(''); loadMessMenus(); }
    } catch (err: any) { showToast('error', 'Error', err.response?.data?.error || ''); }
  };
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try { const res = await axios.get(`/api/reports/${reportType}`); if (res.data?.success) setReportData(res.data.data); }
    catch (err: any) { showToast('info', 'Notice', ''); } finally { setReportLoading(false); }
  };
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchQuery.length < 2) return;
    setGlobalSearchLoading(true);
    try { const res = await axios.get(`/api/search?q=${encodeURIComponent(globalSearchQuery)}`); if (res.data?.success) setGlobalSearchResults(res.data.data); }
    catch (e) { showToast('info', 'Notice', ''); } finally { setGlobalSearchLoading(false); }
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
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'hostels', label: t('nav.hostels'), icon: Home },
        { id: 'rooms', label: t('nav.rooms'), icon: Layers },
        { id: 'students', label: t('nav.students'), icon: Users },
        { id: 'workers', label: t('nav.workers'), icon: Wrench },
        { id: 'emergencies', label: t('emergency.title'), icon: ShieldAlert },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode },
        { id: 'leave', label: t('nav.leaves'), icon: Calendar },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle },
        { id: 'visitors', label: t('nav.visitors'), icon: Users },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard },
        { id: 'gate_pass', label: t('nav.gatePass'), icon: Shield },
        { id: 'notices', label: t('nav.noticeBoard'), icon: Bell },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell },
        { id: 'reports', label: t('nav.reports'), icon: PieChart },
        { id: 'audit_logs', label: t('nav.auditLogs'), icon: Activity },
        { id: 'settings', label: t('nav.settings'), icon: Settings },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'HOSTEL_ADMIN') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'rooms', label: t('nav.rooms'), icon: Layers },
        { id: 'students', label: t('nav.students'), icon: Users },
        { id: 'workers', label: t('nav.workers'), icon: Wrench },
        { id: 'emergencies', label: t('emergency.title'), icon: ShieldAlert },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode },
        { id: 'leave', label: t('nav.leaves'), icon: Calendar },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle },
        { id: 'visitors', label: t('nav.visitors'), icon: Users },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard },
        { id: 'gate_pass', label: t('nav.gatePass'), icon: Shield },
        { id: 'notices', label: t('nav.noticeBoard'), icon: Bell },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell },
        { id: 'reports', label: t('nav.reports'), icon: PieChart },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'ASSISTANT_WARDEN') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'rooms', label: t('nav.rooms'), icon: Layers },
        { id: 'students', label: t('nav.students'), icon: Users },
        { id: 'workers', label: t('nav.workers'), icon: Wrench },
        { id: 'emergencies', label: t('emergency.title'), icon: ShieldAlert },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode },
        { id: 'leave', label: t('nav.leaves'), icon: Calendar },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle },
        { id: 'visitors', label: t('nav.visitors'), icon: Users },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'WORKER') {
      items.push(
        { id: 'worker_dashboard', label: t('worker.dashboardTitle'), icon: Wrench },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'MESS_MANAGER') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'SECURITY') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'visitors', label: t('nav.visitors'), icon: Users },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'MAINTENANCE') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'ACCOUNTANT') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else if (currentUser.role === 'STUDENT') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'rooms', label: t('nav.rooms'), icon: Home },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode },
        { id: 'leave', label: t('leaves.applyLeave'), icon: Calendar },
        { id: 'complaints', label: t('complaints.raiseComplaint'), icon: AlertTriangle },
        { id: 'visitors', label: t('nav.visitors'), icon: Users },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard },
        { id: 'gate_pass', label: t('nav.gatePass'), icon: Shield },
        { id: 'notices', label: t('nav.noticeBoard'), icon: Bell },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell },
        { id: 'ai_assistant', label: t('nav.aiAssistant'), icon: Sparkles },
        { id: 'profile', label: t('nav.profile'), icon: User }
      );
    } else {
      // Fallback
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid },
        { id: 'profile', label: t('nav.profile'), icon: User }
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
      showToast('warning', 'Nothing to Export', 'No scan history recorded in this session yet.');
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
              Logged in as: <strong style={{ color: 'var(--text-main)' }}>{currentUser.email}</strong> ({currentUser.role}) Â· Terminal Device: Web Viewfinder
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
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
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
                    <QrCode size={100} color="var(--primary)" style={{ opacity: 0.4 }} />
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
                  onClick={() => showToast('info', 'Not Supported', 'Flashlight is not supported by your current webcam device hardware.')}
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

      {/* Toast Notification System */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={16} /> You are offline. Some features may be unavailable.
        </div>
      )}

      {/* Online Restored Banner */}
      {showOnlineBanner && isOnline && (
        <div className="offline-banner online-banner">
          <Wifi size={16} /> Back online! All features restored.
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && deferredInstallPrompt && (
        <div className="pwa-banner">
          <Shield size={24} color="var(--primary)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Install SmartHostel AI</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add to home screen for offline access</div>
          </div>
          <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={handlePwaInstall}>
            <Download size={14} /> Install
          </button>
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={() => setShowInstallBanner(false)}>
            <X size={14} />
          </button>
        </div>
      )}

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
            <Shield size={24} color="var(--primary)" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              SmartHostel <span style={{ color: 'var(--primary)' }}>AI</span>
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
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Header Right Widgets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {(view === 'home' || view === 'login' || view === 'register' || view === 'qr_login') && (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('home')}>{t('nav.dashboard')}</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('login')}>{t('auth.signIn')}</button>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setView('qr_login')}>{t('nav.qrPortal')}</button>
              <button className="btn btn-primary" onClick={() => setView('register')}>{t('nav.register')}</button>
            </div>
          )}

          {currentUser && (
            <>
              <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSubView('notifications')}>
                <Bell size={18} color="var(--text-muted)" />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '16px', height: '16px', background: '#ef4444', borderRadius: '50%', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, padding: '0 2px' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="hide-mobile" style={{ display: 'flex', flexDirection: 'column', textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{currentUser.fullName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 800 }}>{currentUser.role.replace('_', ' ')}</span>
              </div>
            </>
          )}

          {/* Language Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              id="language-selector-btn"
            >
              <Globe size={16} color="var(--primary)" />
              <span>{languages.find(l => l.code === lang)?.nativeName || 'English'}</span>
            </button>

            {langDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  padding: '0.5rem',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  minWidth: '130px'
                }}
              >
                {languages.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: lang === l.code ? 'var(--primary-soft)' : 'transparent',
                      color: lang === l.code ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: lang === l.code ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      textAlign: 'left'
                    }}
                    onClick={() => {
                      changeLanguage(l.code);
                      setLangDropdownOpen(false);
                    }}
                  >
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>


      {/* Mobile Drawer (Collapsible) */}
      <div className={`drawer-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`drawer-content ${mobileMenuOpen ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{currentUser ? t('common.all') : t('common.notice')}</span>
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
                {t('nav.dashboard')}
              </button>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('login'); setMobileMenuOpen(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                {t('auth.signIn')}
              </button>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('qr_login'); setMobileMenuOpen(false); }}
                style={{ justifyContent: 'flex-start' }}
              >
                {t('nav.qrPortal')}
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => { setView('register'); setMobileMenuOpen(false); }}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {t('nav.register')}
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
              <Sparkles size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
              <h1 className="hero-title" style={{ fontWeight: 800, marginBottom: '1rem', lineHeight: '1.1' }}>{t('common.appName')}</h1>
              <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>{t('common.subTitle')}</p>
              <div className="hero-buttons">
                <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1rem' }} onClick={() => setView('register')}>{t('auth.registerBtn')} <ArrowRight size={18} /></button>
                <button className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1rem' }} onClick={() => setView('login')}>{t('auth.signIn')}</button>
              </div>
            </div>
          )}

          {/* LOGIN VIEW */}
          {view === 'login' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '420px', margin: '3rem auto', padding: '2.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('auth.welcomeBack')}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{t('auth.loginTitle')}</p>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.email')}</label>
                  <input className="form-input" type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin@user" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.password')}</label>
                  <input className="form-input" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>{t('auth.signIn')}</button>
              </form>
            </div>
          )}

          {/* QR ATTENDANCE LOGIN VIEW */}
          {view === 'qr_login' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '420px', margin: '3rem auto', padding: '2.5rem', border: '1px dashed var(--primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <QrCode size={28} color="var(--primary)" />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('nav.qrPortal')}</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{t('auth.loginTitle')}</p>
              <form onSubmit={handleQRLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.email')}</label>
                  <input className="form-input" type="text" value={qrPortalEmail} onChange={e => setQrPortalEmail(e.target.value)} placeholder="warden@user or admin@user" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.password')}</label>
                  <input className="form-input" type="password" value={qrPortalPassword} onChange={e => setQrPortalPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Shield size={18} /> {t('auth.signIn')}
                </button>
              </form>
            </div>
          )}

          {/* REGISTER VIEW */}
          {view === 'register' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '640px', margin: '2rem auto', padding: '2.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t('auth.registerBtn')}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>{t('auth.pendingApproval')}</p>

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.role')}</label>
                    <select className="form-input" value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}>
                      <option value="STUDENT">Student</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="HOSTEL_ADMIN">Hostel Admin</option>
                      <option value="ASSISTANT_WARDEN">Assistant Warden</option>
                      <option value="MESS_MANAGER">Mess Manager</option>
                      <option value="SECURITY">Security</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="ACCOUNTANT">Accountant</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.fullName')}</label>
                    <input className="form-input" type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)} placeholder="John Doe" required />
                  </div>
                </div>

                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.email')}</label>
                    <input className="form-input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="john@example.com" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.password')}</label>
                    <input className="form-input" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 8 characters" required />
                  </div>
                </div>

                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.mobile')}</label>
                    <input className="form-input" type="tel" value={regMobile} onChange={e => setRegMobile(e.target.value)} placeholder="10 Digit Number" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.selectHostel')}</label>
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
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.college')}</label>
                        <input className="form-input" type="text" value={regCollege} onChange={e => setRegCollege(e.target.value)} placeholder="College name" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.department')}</label>
                        <input className="form-input" type="text" value={regDept} onChange={e => setRegDept(e.target.value)} placeholder="CSE, ECE etc" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.year')}</label>
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
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.registerNumber')}</label>
                        <input className="form-input" type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Reg No" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.parentName')}</label>
                        <input className="form-input" type="text" value={regParentName} onChange={e => setRegParentName(e.target.value)} placeholder="Parent's Name" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.parentMobile')}</label>
                        <input className="form-input" type="tel" value={regParentMobile} onChange={e => setRegParentMobile(e.target.value)} placeholder="Parent's Mobile" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.address')}</label>
                  <textarea className="form-input" value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Full street address..." rows={2}></textarea>
                </div>

                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.75rem' }}>{t('auth.registerBtn')}</button>
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

            {/* Active Emergency Alert Banner Overlay */}
            {emergencyAlertsList.filter(a => a.status === 'ACTIVE').length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldAlert size={28} color="#ef4444" style={{ animation: 'pulse 1s infinite' }} />
                  <div>
                    <h4 style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                      🚨 {t('emergency.activeAlerts')} ({emergencyAlertsList.filter(a => a.status === 'ACTIVE').length})
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {emergencyAlertsList.find(a => a.status === 'ACTIVE')?.type} emergency reported in {emergencyAlertsList.find(a => a.status === 'ACTIVE')?.hostel?.name || 'Hostel'} (Room {emergencyAlertsList.find(a => a.status === 'ACTIVE')?.roomNumber || 'N/A'})
                    </p>
                  </div>
                </div>
                {currentUser && ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY'].includes(currentUser.role) && (
                  <button className="btn btn-secondary" style={{ fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }} onClick={() => setSubView('emergencies')}>
                    View Emergency Details
                  </button>
                )}
              </div>
            )}

            {/* Floating Student Emergency Trigger Button */}
            {currentUser && currentUser.role === 'STUDENT' && (
              <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 900 }}>
                <button
                  className="btn btn-danger"
                  style={{
                    padding: '0.85rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    borderRadius: '999px',
                    boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onClick={() => setShowEmergencyModal(true)}
                >
                  <ShieldAlert size={20} /> 🚨 {t('emergency.sendAlert')}
                </button>
              </div>
            )}

            {/* 1. ROLE DASHBOARDS */}
            {subView === 'dashboard' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="flex-responsive-header">
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('dashboard.welcome', { name: currentUser.fullName })}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('dashboard.roleBadge', { role: currentUser.role.replace('_', ' ') })}</p>
                  </div>
                  <span className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>{t('common.active')}</span>
                </div>

                {/* Dashboard statistics based on role */}
                <div className="dashboard-grid">
                  <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('dashboard.overallAttendance')}</span>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{attendanceStats.percentage}%</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Target: 75% min</p>
                    </div>
                    <AttendanceRing percentage={attendanceStats.percentage} />
                  </div>

                  <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('dashboard.openComplaints')}</span>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{complaints.length}</h3>
                      <span className="badge badge-warning" style={{ marginTop: '0.5rem' }}>
                        {complaints.filter(c => c.status !== 'RESOLVED').length} {t('common.active')}
                      </span>
                    </div>
                    <AlertTriangle size={36} color="#f59e0b" />
                  </div>

                  <div className="glass-panel stat-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('dashboard.pendingLeaves')}</span>
                      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>
                        {leavesHistory.filter(l => l.status === 'APPROVED').length} {t('common.approved')}
                      </h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {leavesHistory.filter(l => l.status === 'PENDING').length} {t('common.pending')}
                      </p>
                    </div>
                    <Calendar size={36} color="var(--primary)" />
                  </div>
                </div>

                {/* Dashboard Core Content Columns */}
                <div className="dashboard-layout-grid">
                  {/* Left Column: Recent Activities & Shortcuts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* SVG Analytics Chart for Admin/Warden, Check-in logs for Student */}
                    {currentUser.role === 'STUDENT' ? (
                      <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.recentActivity')}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                            <Clock size={16} color="var(--primary)" />
                            <div>
                              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('attendance.checkIn')}</p>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('attendance.today')}</span>
                            </div>
                          </div>
                          {leavesHistory[0] && (
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                              <Calendar size={16} color="var(--primary)" />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('leaves.title')}: {leavesHistory[0].reason}</p>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('common.status')}: {leavesHistory[0].status}</span>
                              </div>
                            </div>
                          )}
                          {complaints[0] && (
                            <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0' }}>
                              <AlertTriangle size={16} color="#f59e0b" />
                              <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('complaints.title')}: {complaints[0].title}</p>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('common.status')}: {complaints[0].status}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('ai.analytics')}</h3>
                        <SimpleBarChart data={[
                          { name: t('common.active'), value: pendingUsers.length + 10 },
                          { name: t('attendance.today'), value: attendanceHistory.filter(a => a.isPresent).length + 3 },
                          { name: t('leaves.title'), value: leavesHistory.filter(l => l.status === 'APPROVED').length },
                          { name: t('complaints.title'), value: complaints.filter(c => c.status !== 'RESOLVED').length },
                          { name: t('visitors.title'), value: visitors.length }
                        ]} />
                      </div>
                    )}

                    {/* Quick Action Card Panels */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('dashboard.quickActions')}</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        {currentUser.role === 'STUDENT' && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setSubView('attendance')}>
                              <QrCode size={16} /> {t('attendance.scanQr')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('leave')}>
                              <Calendar size={16} /> {t('leaves.applyLeave')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('complaints')}>
                              <AlertTriangle size={16} /> {t('complaints.raiseComplaint')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('visitors')}>
                              <Users size={16} /> {t('visitors.createRequest')}
                            </button>
                          </>
                        )}
                        {currentUser.role === 'WARDEN' && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setSubView('leave')}>
                              <Calendar size={16} /> {t('leaves.title')} ({leavesHistory.filter(l => l.status === 'PENDING').length})
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('attendance')}>
                              <QrCode size={16} /> {t('attendance.title')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('complaints')}>
                              <AlertTriangle size={16} /> {t('complaints.title')}
                            </button>
                          </>
                        )}
                        {currentUser.role === 'SUPER_ADMIN' && (
                          <>
                            <button className="btn btn-secondary" onClick={() => setSubView('hostels')}>
                              <PlusCircle size={16} /> {t('hostel.add')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('rooms')}>
                              <Layers size={16} /> {t('rooms.title')}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSubView('attendance')}>
                              <PieChart size={16} /> {t('attendance.title')}
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
                        <Bell size={18} color="var(--primary)" /> {t('dashboard.recentAnnouncements')}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Hostel Gate Timings Restructuring</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Main gates close strictly at 10:00 PM. Access requests after curfew must file visitor passes in advance.</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>Warden Â· 2 hours ago</span>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--accent)' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Mess Menu Enhancements</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>By student request, special dinner Paneer Butter Masala has been rescheduled for Thursday nights.</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>Mess Committee Â· Yesterday</span>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('attendance.title')}</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Student Left Card: 5-Minute Temporary Attendance QR Generator */}
                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{t('attendance.generateQr')}</h3>

                      {tempQrData && qrCountdownSeconds > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
                          {/* QR Code Container */}
                          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '16px', border: '4px solid var(--primary)', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}>
                            <QrCode size={150} color="#000000" />
                          </div>

                          {/* Countdown Timer & Reference Pill */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'center' }}>
                            <span className="badge badge-success" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem', fontWeight: 800 }}>
                              {t('attendance.qrValidFor', {
                                time: `${String(Math.floor(qrCountdownSeconds / 60)).padStart(2, '0')}:${String(qrCountdownSeconds % 60).padStart(2, '0')}`
                              })}
                            </span>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {t('attendance.refCode', { code: tempQrData.referenceCode })}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {t('attendance.locCode', { code: tempQrData.locationCode })}
                            </div>
                          </div>

                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {t('attendance.qrValidFor', { time: '5m' })}
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <QrCode size={56} color="var(--primary)" />
                          </div>
                          {qrCountdownSeconds === 0 && tempQrData && (
                            <span className="badge badge-danger">{t('attendance.qrExpired')}</span>
                          )}
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {tempQrData ? t('attendance.qrExpiredMsg') : t('attendance.generateQr')}
                          </p>
                          <button className="btn btn-primary" style={{ width: '100%', padding: '0.75rem 1.5rem', fontSize: '0.9rem' }} onClick={handleGenerateStudentQR}>
                            <QrCode size={18} /> {t('attendance.generateQr')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Student Right Card: logs */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('attendance.historyTitle')}</h3>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem 0' }}>{t('tables.date')}</th>
                              <th>{t('tables.status')}</th>
                              <th>{t('attendance.checkIn')}</th>
                              <th>{t('attendance.checkOut')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistory.map(log => (
                              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <td style={{ padding: '0.75rem 0' }}>{new Date(log.date).toLocaleDateString()}</td>
                                <td><span className={`badge ${log.isPresent ? 'badge-success' : 'badge-danger'}`}>{log.isPresent ? t('common.active') : t('common.inactive')}</span></td>
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
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('attendance.title')}</h3>
                      <form onSubmit={handleManualAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('students.studentName')}</label>
                          <input className="form-input" type="text" placeholder="Enter student email" value={manualStudentId} onChange={e => setManualStudentId(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('tables.date')}</label>
                          <input className="form-input" type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('tables.status')}</label>
                          <select className="form-input" value={manualIsPresent ? 'present' : 'absent'} onChange={e => setManualIsPresent(e.target.value === 'present')}>
                            <option value="present">{t('common.active')}</option>
                            <option value="absent">{t('common.inactive')}</option>
                          </select>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{t('common.submit')}</button>
                      </form>
                    </div>

                    {/* Live logs */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('attendance.historyTitle')}</h3>
                      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem' }}>{t('tables.name')}</th>
                              <th>{t('tables.date')}</th>
                              <th>{t('tables.status')}</th>
                              <th>{t('attendance.checkIn')}</th>
                              <th>{t('attendance.checkOut')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistory.map(log => (
                              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>{log.user?.fullName || 'Anonymous student'}</td>
                                <td>{new Date(log.date).toLocaleDateString()}</td>
                                <td><span className={`badge ${log.isPresent ? 'badge-success' : 'badge-danger'}`}>{log.isPresent ? t('common.active') : t('common.inactive')}</span></td>
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
                        {workerCategories.length > 0 ? (
                          workerCategories.map((cat: any) => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))
                        ) : (
                          <>
                            <option value="Plumbing">Plumbing</option>
                            <option value="Electrical">Electrical</option>
                            <option value="Carpentry">Carpentry</option>
                            <option value="Cleaning">Cleaning</option>
                            <option value="AC Technician">AC Technician</option>
                            <option value="Internet">Internet</option>
                            <option value="Other">Other</option>
                          </>
                        )}
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
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span className={`badge ${
                                c.priority === 'HIGH' ? 'badge-danger' :
                                c.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'
                              }`}>{c.priority} Priority</span>
                              <span className="badge badge-info">{c.category}</span>
                              <span className={`badge ${
                                c.status === 'RESOLVED' || c.status === 'COMPLETED' ? 'badge-success' :
                                c.status === 'ASSIGNED' || c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS' ? 'badge-info' :
                                c.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'
                              }`}>{c.status}</span>
                            </div>
                          </div>

                          {/* Worker Completion Banner */}
                          {c.status === 'COMPLETED' && (
                            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 700, color: '#10b981' }}>✓ Work Completed by Worker</div>
                              <div style={{ marginTop: '0.2rem', color: 'var(--text-main)' }}>Notes: {c.completionNotes || 'Work completed'}</div>
                              {c.materialsUsed && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Materials Used: {c.materialsUsed}</div>}
                            </div>
                          )}

                          {/* Action Toolbar */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                            {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (c.status === 'PENDING' || c.status === 'REJECTED') && (
                              <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedComplaintForAssign(c); setShowAssignWorkerModal(true); }}>
                                👷 Assign Worker
                              </button>
                            )}

                            {currentUser.role === 'STUDENT' && c.status === 'COMPLETED' && (
                              <>
                                <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: '#10b981' }} onClick={() => { setSelectedComplaintForConfirm(c); setShowConfirmResolutionModal(true); }}>
                                  ✓ Confirm Resolution
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#f59e0b' }} onClick={() => { setSelectedComplaintForReopen(c); setShowReopenModal(true); }}>
                                  ⚠️ Report Issue / Reopen
                                </button>
                              </>
                            )}

                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedComplaintTimeline(c); setShowTimelineModal(true); }}>
                              <Clock size={14} /> View Timeline
                            </button>
                          </div>
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
                  <Sparkles size={24} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>SmartHostel AI Concierge</h2>
                </div>

                {/* Quick Question Chips */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {["What's my attendance?", "Today's mess menu?", "My leave status", "Any pending fees?", "My room info"].map(q => (
                    <button key={q} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: '999px' }}
                      onClick={() => { setChatInput(q); }}>
                      {q}
                    </button>
                  ))}
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '420px' }}>
                  {/* Messages Area */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                    {chatMessages.map((msg, index) => (
                      <div key={index} style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'user' ? 'var(--primary)' : 'var(--bg-main)',
                        color: msg.sender === 'user' ? '#ffffff' : 'var(--text-main)',
                        padding: '0.75rem 1rem',
                        borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        maxWidth: '80%',
                        fontSize: '0.875rem',
                        border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line'
                      }}>
                        {msg.text.replace(/\*\*(.+?)\*\*/g, '$1')}
                      </div>
                    ))}
                    {/* Typing Indicator */}
                    {aiTyping && (
                      <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '16px 16px 16px 2px', padding: '0.5rem 1rem' }}>
                        <div className="ai-typing-indicator">
                          <div className="ai-typing-dot" />
                          <div className="ai-typing-dot" />
                          <div className="ai-typing-dot" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ height: '40px' }}
                      placeholder="Ask about attendance, leaves, mess menu, fees..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit" style={{ padding: '0 1.25rem' }} disabled={aiTyping}>Send</button>
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

            {subView === 'students' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Student Registration Onboarding & Verification Portal</h2>

                {currentUser.role === 'STUDENT' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Document Upload section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Step 1: Upload Verification Documents</h4>
                      <form onSubmit={handleUploadDocument} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <input className="form-input" type="text" placeholder="Document Name (e.g. Aadhar Card)" value={docName} onChange={e => setDocName(e.target.value)} required />
                        <input className="form-input" type="text" placeholder="Document File URL" value={docUrl} onChange={e => setDocUrl(e.target.value)} required />
                        <button className="btn btn-primary" type="submit">Upload Document</button>
                      </form>
                      
                      <div style={{ marginTop: '1.5rem' }}>
                        <h5 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>Uploaded Documents ({studentDocs.length})</h5>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {studentDocs.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <span>{doc.name}</span>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>View File</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Status Tracker */}
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Step 2: Onboarding Progress Tracker</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                        <div style={{ opacity: currentUser.status === 'PENDING' ? 1 : 0.4 }}>
                          <span className="badge badge-warning" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>1. Pending Review</span>
                        </div>
                        <div style={{ opacity: currentUser.status === 'VERIFIED' ? 1 : 0.4 }}>
                          <span className="badge badge-info" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>2. Documents Verified</span>
                        </div>
                        <div style={{ opacity: currentUser.status === 'APPROVED' ? 1 : 0.4 }}>
                          <span className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>3. Fully Approved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Admin View
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    
                    {/* Phase 1: Documents Verification Queue */}
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>Phase 1: Documents Verification Queue ({pendingUsers.filter(u => u.status === 'PENDING').length})</h4>
                      {pendingUsers.filter(u => u.status === 'PENDING').length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No accounts awaiting document verification.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {pendingUsers.filter(u => u.status === 'PENDING').map(u => (
                            <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                              <div>
                                <strong style={{ fontSize: '0.95rem' }}>{u.fullName}</strong> ({u.role.replace('_', ' ')})
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email: {u.email} | Mobile: {u.mobileNumber}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {u.role === 'STUDENT' ? (
                                  <>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => {
                                      axios.get(`/api/students/${u.id}/documents`).then(res => {
                                        if (res.data?.success && res.data.data.length > 0) {
                                          showToast('info', `Documents for ${u.fullName}`, `${res.data.data.length} document(s) on file. Check the student profile for details.`);
                                        } else {
                                          showToast('info', 'Notice', '');
                                        }
                                      });
                                    }}>View Docs</button>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleStudentStatusUpdate(u.id, 'VERIFIED')}>Verify & Pass</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleApprove(u.id)}>Approve</button>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>Reject</button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phase 2: Verified Student Room Allocation */}
                    <div>
                      <h4 style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '1rem' }}>Phase 2: Room Allocation & Final Approval Queue ({pendingUsers.filter(u => u.status === 'VERIFIED' && u.role === 'STUDENT').length})</h4>
                      {pendingUsers.filter(u => u.status === 'VERIFIED' && u.role === 'STUDENT').length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No student accounts awaiting final room allocation.</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {pendingUsers.filter(u => u.status === 'VERIFIED' && u.role === 'STUDENT').map(u => (
                            <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                              <div>
                                <strong style={{ fontSize: '0.95rem' }}>{u.fullName}</strong>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>College: {u.collegeName} | Dept: {u.department} | Year: {u.year}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select 
                                  className="form-input" 
                                  style={{ width: '180px', height: '36px' }}
                                  value={selectedAllocatedRooms[u.id] || ''}
                                  onChange={(e) => {
                                    setSelectedAllocatedRooms(prev => ({ ...prev, [u.id]: e.target.value }));
                                  }}
                                >
                                  <option value="">Select Room</option>
                                  {rooms.filter(r => !r.users || r.users.length < r.capacity).map(r => (
                                    <option key={r.id} value={r.id}>{r.block} - Room {r.roomNumber} ({r.users?.length || 0}/{r.capacity})</option>
                                  ))}
                                </select>
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => {
                                  const roomId = selectedAllocatedRooms[u.id];
                                  if (!roomId) {
                                    showToast('info', 'Notice', '');
                                    return;
                                  }
                                  handleStudentStatusUpdate(u.id, 'APPROVED', roomId);
                                }}>Allocate & Approve</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                  <div className="flex-responsive-between" style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>
                    <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={18} color="var(--primary)" /> Registered Rooms ({rooms.length})
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['all', 'available', 'full'].map(filter => (
                        <button
                          key={filter}
                          type="button"
                          className={`btn ${roomFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
                          onClick={() => setRoomFilter(filter)}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="occupancy-grid">
                    {rooms
                      .filter(r => {
                        const occupied = r.users?.length || 0;
                        if (roomFilter === 'available') return occupied < (r.capacity || 4);
                        if (roomFilter === 'full') return occupied >= (r.capacity || 4);
                        return true;
                      })
                      .map((r, idx) => {
                        const occupied = r.users?.length || 0;
                        const cap = r.capacity || 4;
                        const pct = Math.round((occupied / cap) * 100);
                        const statusClass = occupied >= cap ? 'full' : occupied > 0 ? 'partial' : 'available';

                        return (
                          <div
                            key={idx}
                            className={`occupancy-card ${statusClass}`}
                            onClick={() => setSelectedRoom(r)}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Room {r.roomNumber}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flr {r.floor}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              {r.block}
                            </div>

                            <div className="bed-dots">
                              {Array.from({ length: cap }).map((_, i) => (
                                <div key={i} className={`bed-dot ${i < occupied ? 'occupied' : 'empty'}`} />
                              ))}
                            </div>

                            <div className="occupancy-bar">
                              <div className={`occupancy-bar-fill ${statusClass}`} style={{ width: `${pct}%` }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                              {occupied}/{cap} Beds
                            </div>
                          </div>
                        );
                      })}
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
                      <button className="btn btn-primary" style={{ padding: '0.5rem' }} onClick={() => showToast('success', 'Booked!', 'Laundry slot booking confirmed.')}>Book Slot</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subView === 'mess' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Weekly Mess & Dining Operations</h2>

                {/* Student Enrollment View */}
                {currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>My Mess Enrollment</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Select a mess plan to enroll. Swapping options takes effect from the next billing cycle.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {messes.map(m => {
                        const isEnrolled = currentUser.messId === m.id;
                        return (
                          <div key={m.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{m.name}</span>
                            <span className="badge badge-info">{m.students?.length || 0} enrolled students</span>
                            {isEnrolled ? (
                              <button className="btn btn-secondary" style={{ pointerEvents: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>Enrolled</button>
                            ) : (
                              <button className="btn btn-primary" onClick={() => handleEnrollMess(m.id)}>Enroll Plan</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mess Manager Create Mess */}
                {['SUPER_ADMIN', 'MESS_MANAGER'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Establish New Dining Mess</h3>
                    <form onSubmit={handleCreateMess} style={{ display: 'flex', gap: '1rem' }}>
                      <input className="form-input" style={{ flex: 1 }} type="text" placeholder="Mess Name (e.g. Veg Special Mess, South Indian Mess)" value={newMessName} onChange={e => setNewMessName(e.target.value)} required />
                      <button className="btn btn-primary" type="submit">Create Mess</button>
                    </form>
                  </div>
                )}

                {/* Dining Attendance Registry */}
                {['SUPER_ADMIN', 'MESS_MANAGER'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Dining Meal Attendance Registry</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                      {messes.map(m => (
                        <div key={m.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                          <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>{m.name}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {allStudents.filter(s => s.messId === m.id).length === 0 ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No students enrolled in this mess.</p>
                            ) : (
                              allStudents.filter(s => s.messId === m.id).map(s => (
                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                  <span style={{ fontSize: '0.85rem' }}>{s.fullName}</span>
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {['BREAKFAST', 'LUNCH', 'DINNER'].map(meal => (
                                      <button 
                                        key={meal} 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}
                                        onClick={() => handleMarkMessAttendance(s.id, m.id, meal, true)}
                                      >
                                        {meal.charAt(0)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Static Weekly Menu reference */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Weekly Reference Menu</h3>
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
              </div>
            )}

            {subView === 'payments' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Hostel Fees & Payments Ledger</h2>

                {/* Accountant / Admin Fee Assignment */}
                {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Assign Fee Invoice to Student</h3>
                    <form onSubmit={handleCreateFee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <input className="form-input" type="text" placeholder="Fee Title (e.g. Mess Fee Jan, Rent)" value={feeTitle} onChange={e => setFeeTitle(e.target.value)} required />
                      <input className="form-input" type="number" placeholder="Amount ($)" value={feeAmount || ''} onChange={e => setFeeAmount(Number(e.target.value))} required />
                      <input className="form-input" type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} required />
                      <select 
                        className="form-input" 
                        value={feeStudentId} 
                        onChange={e => setFeeStudentId(e.target.value)}
                        required
                      >
                        <option value="">Select Student</option>
                        {allStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.fullName} ({s.registerNumber || 'No Register No'})</option>
                        ))}
                      </select>
                      <button className="btn btn-primary" type="submit">Assign Invoice</button>
                    </form>
                  </div>
                )}

                {/* Main Fees List */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Fee Invoices Log</h3>
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {fees.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No fee invoices logged.</p>
                    ) : (
                      fees.map(f => {
                        const isStudent = currentUser.role === 'STUDENT';
                        const belongsToMe = f.studentId === currentUser.id;
                        if (isStudent && !belongsToMe) return null;

                        return (
                          <div key={f.id} className="flex-responsive-between" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ fontWeight: 700 }}>{f.title}</h4>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Student: {f.student?.fullName || 'Warden'} | Due: {new Date(f.dueDate).toLocaleDateString()}
                              </p>
                              {f.payments && f.payments.length > 0 && (
                                <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                                  <strong style={{ color: 'var(--primary)' }}>Payment Receipt:</strong> Mode: {f.payments[0].paymentMode} | Ref ID: {f.payments[0].transactionId || 'CASH'} | Date: {new Date(f.payments[0].paymentDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>${f.amount.toFixed(2)}</span>
                              <span className={`badge ${f.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{f.status}</span>
                              
                              {f.status === 'PENDING' && belongsToMe && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                                  <select className="form-input" style={{ height: '32px', fontSize: '0.8rem', padding: '0.2rem' }} value={payMode} onChange={e => setPayMode(e.target.value)}>
                                    <option value="UPI">UPI Transfer</option>
                                    <option value="CASH">Cash payment</option>
                                    <option value="CARD">Debit/Credit Card</option>
                                  </select>
                                  <input className="form-input" style={{ height: '32px', fontSize: '0.8rem' }} type="text" placeholder="Txn Reference ID" onChange={e => setPayTxId(e.target.value)} />
                                  <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handlePayFee(f.id)}>Submit Payment</button>
                                </div>
                              )}

                              {f.status === 'PENDING' && !isStudent && ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT'].includes(currentUser.role) && (
                                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginTop: '0.5rem' }} onClick={() => {
                                  setPayMode('CASH');
                                  handlePayFee(f.id);
                                }}>
                                  Mark as Paid (Cash)
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
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
                    background: 'var(--bg-card)',
                    width: '300px',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                    border: '2px solid var(--primary)'
                  }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '2px', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      SMARTHOSTEL PASS
                    </div>
                    <img 
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName)}`} 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)', margin: '0 auto 1rem', display: 'block' }}
                      alt="Avatar"
                    />
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{currentUser.fullName}</div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-soft)', padding: '0.15rem 0.5rem', borderRadius: '12px', display: 'inline-block', margin: '0.25rem 0 1rem', fontWeight: 700 }}>
                      {currentUser.role}
                    </span>
                    <div style={{ textAlign: 'left', fontSize: '0.75rem', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Register No:</span><strong>{currentUser.registerNumber || 'N/A'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Hostel:</span><strong>{currentUser.hostel?.name || 'Demo Hostel A'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Room Number:</span><strong>{currentUser.room?.roomNumber || 'Unassigned'}</strong></div>
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
                                body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #101715; color: #EDF5F2; }
                                .card { border: 2px solid #4DB89A; border-radius: 16px; padding: 2rem; background: #17211E; width: 350px; text-align: center; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
                                .header { font-size: 1.25rem; font-weight: 800; color: #4DB89A; letter-spacing: 2px; margin-bottom: 1.5rem; border-bottom: 1px solid #293934; padding-bottom: 0.75rem; }
                                .avatar { width: 100px; height: 100px; border-radius: 50%; border: 3px solid #4DB89A; margin: 0 auto 1rem; object-fit: cover; }
                                .name { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
                                .role { font-size: 0.75rem; text-transform: uppercase; color: #4DB89A; background: #2A4A40; padding: 0.25rem 0.75rem; border-radius: 20px; display: inline-block; margin-bottom: 1.5rem; font-weight: 700; }
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
                                <div class="footer">SmartHostel AI Â· Secure Verification Pass</div>
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

            {/* 8. INVENTORY MODULE */}
            {subView === 'inventory' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Inventory Control & Assets Registry</h2>
                
                {/* Form to Create Item */}
                {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'MAINTENANCE'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Add New Stock/Asset Item</h3>
                    <form onSubmit={handleCreateInventory} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                      <input className="form-input" type="text" placeholder="Item Name (e.g. Tomato, Bulb)" value={newInvName} onChange={e => setNewInvName(e.target.value)} required />
                      <select className="form-input" value={newInvCat} onChange={e => setNewInvCat(e.target.value)}>
                        <option value="FOOD">Food & Groceries</option>
                        <option value="FURNITURE">Furniture</option>
                        <option value="ELECTRICAL">Electricals</option>
                        <option value="CLEANING">Cleaning Materials</option>
                        <option value="GAS">Gas Cylinders</option>
                        <option value="ASSETS">Assets</option>
                      </select>
                      <input className="form-input" type="number" placeholder="Initial Qty" value={newInvQty || ''} onChange={e => setNewInvQty(Number(e.target.value))} required />
                      <input className="form-input" type="text" placeholder="Unit (kg, pcs)" value={newInvUnit} onChange={e => setNewInvUnit(e.target.value)} required />
                      <input className="form-input" type="number" placeholder="Low Stock Warning Qty" value={newInvMin || ''} onChange={e => setNewInvMin(Number(e.target.value))} />
                      <button className="btn btn-primary" type="submit">Add Stock</button>
                    </form>
                  </div>
                )}

                {/* Stock List Registry */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Current Stock Registry</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {inventory.map(item => {
                      const isLow = item.quantity <= item.minStock;
                      return (
                        <div key={item.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{item.itemName}</h4>
                              <span className="badge badge-info" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>{item.category}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{item.quantity} {item.unit}</span>
                              {isLow && <span className="badge badge-danger" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.65rem' }}>Low Stock!</span>}
                            </div>
                          </div>

                          {/* Quick Logs inside card */}
                          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'MAINTENANCE'].includes(currentUser.role) && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="form-input" style={{ height: '32px', fontSize: '0.8rem' }} type="number" placeholder="Qty" onChange={e => setInvUseQty(Number(e.target.value))} />
                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUseInventory(item.id)}>Consume</button>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="form-input" style={{ height: '32px', fontSize: '0.8rem' }} type="number" placeholder="Qty" onChange={e => setInvBuyQty(Number(e.target.value))} />
                                <input className="form-input" style={{ height: '32px', fontSize: '0.8rem' }} type="number" placeholder="Cost ($)" onChange={e => setInvBuyCost(Number(e.target.value))} />
                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleBuyInventory(item.id)}>Purchase</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 9. PAYROLL MODULE */}
            {subView === 'payroll' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Staff Payroll Ledger</h2>

                {/* Form to Generate Payslip */}
                {['SUPER_ADMIN', 'ACCOUNTANT'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Generate Monthly Staff Payslip</h3>
                    <form onSubmit={handleGeneratePayroll} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                      <input className="form-input" type="text" placeholder="Staff Name/Email/ID" value={newPayStaffId} onChange={e => setNewPayStaffId(e.target.value)} required />
                      <input className="form-input" type="month" value={newPayMonth} onChange={e => setNewPayMonth(e.target.value)} required />
                      <input className="form-input" type="number" placeholder="Base Salary ($)" value={newPayBase || ''} onChange={e => setNewPayBase(Number(e.target.value))} required />
                      <input className="form-input" type="number" placeholder="Bonus ($)" value={newPayBonus || ''} onChange={e => setNewPayBonus(Number(e.target.value))} />
                      <input className="form-input" type="number" placeholder="Deductions ($)" value={newPayDeductions || ''} onChange={e => setNewPayDeductions(Number(e.target.value))} />
                      <button className="btn btn-primary" type="submit">Generate Payslip</button>
                    </form>
                  </div>
                )}

                {/* Payslip History table */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Payslips Register</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '0.75rem' }}>Payslip No</th>
                          <th>Staff Details</th>
                          <th>Month</th>
                          <th>Net Salary</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payroll.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{p.payslipNo}</td>
                            <td>{p.staff?.fullName || 'Warden'} ({p.staff?.role})</td>
                            <td>{p.month}</td>
                            <td>${p.netSalary.toFixed(2)}</td>
                            <td>
                              <span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span>
                            </td>
                            <td>
                              {p.status === 'PENDING' && ['SUPER_ADMIN', 'ACCOUNTANT'].includes(currentUser.role) ? (
                                <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handlePayPayroll(p.id)}>Disburse</button>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.paidDate ? new Date(p.paidDate).toLocaleDateString() : 'N/A'}</span>
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

            {/* 10. EXPENSES MODULE */}
            {subView === 'expenses' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Hostel Operations Expense Ledger</h2>

                {/* Form to Log Expense */}
                {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT', 'MESS_MANAGER'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Add Operation Expense Record</h3>
                    <form onSubmit={handleCreateExpense} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <select className="form-input" value={newExpCat} onChange={e => setNewExpCat(e.target.value)}>
                        <option value="ELECTRICITY">Electricity Utilities</option>
                        <option value="WATER">Water Utilities</option>
                        <option value="INTERNET">WiFi & Network Infrastructure</option>
                        <option value="SALARY">Salaries & Payroll disbursements</option>
                        <option value="FOOD">Mess Food Ingredients</option>
                        <option value="MAINTENANCE">Maintenance Repairs</option>
                        <option value="CLEANING">Cleaning Materials & Staff</option>
                        <option value="GAS">Gas Cylinder purchases</option>
                        <option value="MISC">Miscellaneous</option>
                      </select>
                      <input className="form-input" type="number" placeholder="Amount ($)" value={newExpAmt || ''} onChange={e => setNewExpAmt(Number(e.target.value))} required />
                      <input className="form-input" type="text" placeholder="Description/Note" value={newExpDesc} onChange={e => setNewExpDesc(e.target.value)} />
                      <button className="btn btn-primary" type="submit">Log Expense</button>
                    </form>
                  </div>
                )}

                {/* Expenses Log Ledger */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Expenses Log Register</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '0.75rem' }}>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(e => (
                          <tr key={e.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '0.75rem' }}>{new Date(e.expenseDate).toLocaleDateString()}</td>
                            <td style={{ fontWeight: 600 }}>{e.category.replace('_', ' ')}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{e.description || '-'}</td>
                            <td style={{ fontWeight: 700, color: '#ef4444' }}>-${e.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 11. AUDIT LOGS MODULE */}
            {subView === 'audit_logs' && currentUser && currentUser.role === 'SUPER_ADMIN' && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Enterprise Security Audit Trail</h2>
                
                {/* Search / Filters */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <input className="form-input" style={{ width: '250px' }} type="text" placeholder="Filter by User Email" onChange={async e => {
                    const res = await axios.get(`/api/audit-logs?userEmail=${e.target.value}`);
                    if (res.data?.success) setAuditLogs(res.data.data);
                  }} />
                  <select className="form-input" style={{ width: '200px' }} onChange={async e => {
                    const res = await axios.get(`/api/audit-logs?module=${e.target.value}`);
                    if (res.data?.success) setAuditLogs(res.data.data);
                  }}>
                    <option value="">All Modules</option>
                    <option value="MESS">Mess Operations</option>
                    <option value="FINANCE">Finance & Fees</option>
                    <option value="INVENTORY">Inventory stock</option>
                    <option value="PAYROLL">Payroll ledger</option>
                    <option value="SETTINGS">System Settings</option>
                    <option value="STUDENTS">Students Verify</option>
                  </select>
                </div>

                {/* Audit Logs table */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '0.75rem' }}>Timestamp</th>
                          <th>Operator Email</th>
                          <th>Module</th>
                          <th>Action Description</th>
                          <th>details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map(l => (
                          <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{new Date(l.createdAt).toLocaleString()}</td>
                            <td style={{ fontWeight: 600 }}>{l.userEmail}</td>
                            <td><span className="badge badge-info">{l.module}</span></td>
                            <td>{l.action}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{l.details || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 12. SYSTEM SETTINGS & DYNAMIC PERMISSION MATRIX */}
            {subView === 'settings' && currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'HOSTEL_ADMIN') && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>System Settings & Operations Dashboard</h2>

                {/* Dynamic Role-Permission Matrix */}
                {currentUser && currentUser.role === 'SUPER_ADMIN' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Dynamic Role Permission Matrix</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Assign resource permissions dynamically across user roles (changes take effect instantly).</p>
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '0.75rem' }}>System Permission</th>
                            <th>Hostel Admin</th>
                            <th>Assistant Warden</th>
                            <th>Mess Manager</th>
                            <th>Security Staff</th>
                            <th>Maintenance Staff</th>
                            <th>Accountant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            'manage_hostels',
                            'manage_rooms',
                            'manage_students',
                            'mark_mess_attendance',
                            'manage_mess',
                            'manage_fees',
                            'manage_inventory',
                            'manage_payroll',
                            'manage_expenses',
                            'manage_settings'
                          ].map(perm => (
                            <tr key={perm} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                              <td style={{ padding: '0.75rem', fontWeight: 600 }}>{perm.replace('_', ' ')}</td>
                              {['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'MESS_MANAGER', 'SECURITY', 'MAINTENANCE', 'ACCOUNTANT'].map(role => {
                                const isChecked = rolePermissions.some(rp => rp.role === role && rp.permission === perm);
                                return (
                                  <td key={role}>
                                    <input 
                                      type="checkbox" 
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const currentPerms = rolePermissions.filter(rp => rp.role === role).map(rp => rp.permission);
                                        const newPerms = e.target.checked 
                                          ? [...currentPerms, perm] 
                                          : currentPerms.filter(p => p !== perm);
                                        handleUpdatePermissions(role, newPerms);
                                      }}
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Database Backup Vault */}
                {currentUser && currentUser.role === 'SUPER_ADMIN' && (
                  <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Database Configuration Backups</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleExportBackup}>
                        <Database size={16} /> Download DB Backup JSON
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="file" 
                          accept=".json"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  handleRestoreBackup(event.target.result as string);
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LAUNDRY ERP MODULE */}
            {subView === 'laundry' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🧺 {t('laundry.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>Book pickup slots and track laundry delivery status</p>
                  </div>
                  <button className="btn btn-primary" onClick={loadLaundrySlots}>↻ Refresh</button>
                </div>

                {currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(16,185,129,0.04)' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>📅 {t('laundry.bookSlot')}</h4>
                    <form onSubmit={handleBookLaundry}>
                      <div className="responsive-grid" style={{ marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Pickup Date</label>
                          <input className="form-input" type="date" value={laundryDate} onChange={e => setLaundryDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Time Slot</label>
                          <select className="form-input" value={laundryTimeSlot} onChange={e => setLaundryTimeSlot(e.target.value)}>
                            <option>8:00 AM - 10:00 AM</option>
                            <option>10:00 AM - 12:00 PM</option>
                            <option>12:00 PM - 2:00 PM</option>
                            <option>2:00 PM - 4:00 PM</option>
                            <option>4:00 PM - 6:00 PM</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>No. of Clothes</label>
                          <input className="form-input" type="number" min="1" max="50" value={laundryClothes} onChange={e => setLaundryClothes(Number(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Notes (optional)</label>
                          <input className="form-input" type="text" placeholder="e.g. Delicate items, handle with care" value={laundryNotes} onChange={e => setLaundryNotes(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" type="submit">Book Laundry Slot</button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                          onClick={() => handleJoinLaundryWaitlist(laundryTimeSlot, laundryDate || new Date().toISOString().split('T')[0])}
                        >
                          🔔 {t('waitlist.notifyAvailable')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {laundrySlots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🧺</div>
                      <p>{t('common.noData')}</p>
                    </div>
                  ) : laundrySlots.map(slot => (
                    <div key={slot.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{slot.user?.fullName || 'Student'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Room: {slot.user?.room?.roomNumber || 'N/A'}</span></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          📅 {new Date(slot.date).toLocaleDateString()} · ⏰ {slot.timeSlot} · 👕 {slot.clothesCount} items
                        </div>
                        {slot.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notes: {slot.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge ${slot.status === 'DELIVERED' ? 'badge-success' : slot.status === 'PICKED_UP' ? 'badge-info' : slot.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>{slot.status}</span>
                        {['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && slot.status === 'BOOKED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLaundry(slot.id, 'PICKED_UP')}>Picked Up</button>
                        )}
                        {['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && slot.status === 'PICKED_UP' && (
                          <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLaundry(slot.id, 'DELIVERED')}>✓ Delivered</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WORKER PORTAL DASHBOARD */}
            {subView === 'worker_dashboard' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="flex-responsive-header">
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>👷 {t('worker.dashboardTitle')}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Category: <strong style={{ color: 'var(--primary)' }}>{workerDashboardData?.profile?.category?.name || 'Technician'}</strong> · ID: {workerDashboardData?.profile?.workerId || 'WRK-001'}
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={loadWorkerDashboard}>↻ Refresh</button>
                </div>

                {/* Worker Metrics Cards */}
                <div className="dashboard-grid">
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('worker.assignedJobs')}</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.assignedCount || 0}</h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('worker.pendingAcceptance')}</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.pendingAcceptance || 0}</h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('worker.inProgress')}</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.inProgress || 0}</h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('worker.completed')}</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.completed || 0}</h3>
                  </div>
                </div>

                {/* Assigned Complaints List */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('worker.myJobs')}</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {!workerDashboardData?.complaints || workerDashboardData.complaints.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No assigned jobs at the moment.</p>
                    ) : (
                      workerDashboardData.complaints.map((c: any) => (
                        <div key={c.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className={`badge ${c.priority === 'HIGH' ? 'badge-danger' : c.priority === 'MEDIUM' ? 'badge-warning' : 'badge-info'}`}>{c.priority} Priority</span>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{c.title}</h4>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{c.description}</p>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span>📍 Room: <strong>{c.student?.room?.roomNumber || 'N/A'}</strong> (Block {c.student?.room?.block || 'A'}, Floor {c.student?.room?.floor || 1})</span>
                                <span>👤 Student: <strong>{c.student?.fullName || 'Student'}</strong> ({c.student?.mobileNumber || 'N/A'})</span>
                              </div>
                            </div>
                            <span className={`badge ${c.status === 'COMPLETED' || c.status === 'RESOLVED' ? 'badge-success' : c.status === 'IN_PROGRESS' ? 'badge-info' : c.status === 'ACCEPTED' ? 'badge-info' : c.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                              {c.status}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                            {c.status === 'ASSIGNED' && (
                              <>
                                <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => handleAcceptWorkerJob(c.id)}>
                                  <Check size={14} /> {t('worker.accept')}
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#ef4444' }} onClick={() => { setSelectedComplaintForReject(c); setShowRejectWorkerModal(true); }}>
                                  <X size={14} /> {t('worker.reject')}
                                </button>
                              </>
                            )}

                            {c.status === 'ACCEPTED' && (
                              <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => handleStartWorkerJob(c.id)}>
                                <Play size={14} /> {t('worker.startWork')}
                              </button>
                            )}

                            {c.status === 'IN_PROGRESS' && (
                              <button className="btn btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#10b981' }} onClick={() => { setSelectedComplaintForComplete(c); setShowCompleteWorkModal(true); }}>
                                <Check size={14} /> {t('worker.completeWork')}
                              </button>
                            )}

                            <button className="btn btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => { setSelectedComplaintTimeline(c); setShowTimelineModal(true); }}>
                              <Clock size={14} /> View Timeline
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* WORKER MANAGEMENT (ADMIN / WARDEN) */}
            {subView === 'workers' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>👷 {t('worker.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Configure operational categories and register hostel workers</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={() => setShowAddCategoryModal(true)}>+ {t('worker.addCategory')}</button>
                    <button className="btn btn-primary" onClick={() => setShowAddWorkerModal(true)}>+ {t('worker.addWorker')}</button>
                  </div>
                </div>

                {/* Worker Categories Grid */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('worker.categories')}</h3>
                  <div className="responsive-grid-3">
                    {workerCategories.map((cat: any) => (
                      <div key={cat.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ fontWeight: 800, fontSize: '1rem' }}>{cat.name}</h4>
                          <span className="badge badge-info">{cat._count?.workers || 0} Workers</span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cat.description || 'General maintenance category'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Registered Workers Directory */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Registered Workers Directory</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <th style={{ padding: '0.75rem' }}>Worker Name</th>
                          <th>Category</th>
                          <th>Specialization</th>
                          <th>Contact</th>
                          <th>Availability</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workersList.map((w: any) => (
                          <tr key={w.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '0.75rem', fontWeight: 700 }}>{w.fullName} <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{w.workerProfile?.workerId}</div></td>
                            <td><span className="badge badge-info">{w.workerProfile?.category?.name || 'General'}</span></td>
                            <td>{w.workerProfile?.specialization || 'All maintenance'}</td>
                            <td>{w.mobileNumber || w.email}</td>
                            <td>
                              <span className={`badge ${w.workerProfile?.availability === 'AVAILABLE' ? 'badge-success' : 'badge-warning'}`}>
                                {w.workerProfile?.availability || 'AVAILABLE'}
                              </span>
                            </td>
                            <td><span className="badge badge-success">{w.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* EMERGENCY AUDIT LOG (ADMIN / WARDEN) */}
            {subView === 'emergencies' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🚨 {t('emergency.history')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Audit trail of all emergency alerts and response lifecycle</p>
                  </div>
                  <button className="btn btn-primary" onClick={loadEmergencyAlerts}>↻ Refresh</button>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {emergencyAlertsList.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No emergency alerts recorded.</p>
                    ) : (
                      emergencyAlertsList.map((e: any) => (
                        <div key={e.id} className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${e.status === 'ACTIVE' ? '#ef4444' : e.status === 'ACKNOWLEDGED' ? '#f59e0b' : '#10b981'}`, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="badge badge-danger">🚨 {e.type}</span>
                                <span className="badge badge-info">{e.level} Level</span>
                                <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>Location: {e.hostel?.name} - Room {e.roomNumber || 'N/A'}</h4>
                              </div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{e.message}</p>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span>👤 Reported By: <strong>{e.reportedBy?.fullName || 'Student'}</strong> ({e.reportedBy?.mobileNumber || 'N/A'})</span>
                                <span>⏰ Time: {new Date(e.createdAt).toLocaleString()}</span>
                                {e.acknowledgedBy && <span>✓ Ack By: <strong>{e.acknowledgedBy.fullName}</strong></span>}
                              </div>
                            </div>
                            <span className={`badge ${e.status === 'ACTIVE' ? 'badge-danger' : e.status === 'ACKNOWLEDGED' ? 'badge-warning' : 'badge-success'}`}>
                              {e.status}
                            </span>
                          </div>

                          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY'].includes(currentUser.role) && e.status !== 'RESOLVED' && (
                            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                              {e.status === 'ACTIVE' && (
                                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleAcknowledgeEmergency(e.id)}>
                                  {t('emergency.acknowledge')}
                                </button>
                              )}
                              <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleResolveEmergency(e.id)}>
                                {t('emergency.resolve')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* QR Code view Modal for students – Real Camera Scanner */}
      {showQRScanner && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => { stopCameraStream(); setShowQRScanner(false); }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{t('attendance.scanQr')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { stopCameraStream(); setShowQRScanner(false); }}>
                <X size={16} />
              </button>
            </div>

            {/* GPS Location Status Indicator Pill */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem', background: scannerGps ? 'rgba(16,185,129,0.1)' : gpsError ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: scannerGps ? '#10b981' : gpsError ? '#ef4444' : '#f59e0b', padding: '0.35rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border-color)' }}>
              <Compass size={14} />
              <span>{gpsError || gpsStatus}</span>
              {!scannerGps && (
                <button type="button" className="btn btn-secondary" style={{ padding: '0.1rem 0.4rem', fontSize: '0.65rem' }} onClick={captureScannerGps}>
                  Enable GPS
                </button>
              )}
            </div>

            {/* Camera Viewfinder */}
            <div className="qr-video-container" style={{ margin: '0 auto' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }} />
              {!cameraActive && !cameraError && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.6)' }}>
                  <Camera size={48} style={{ opacity: 0.4 }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0 1rem' }}>Tap "Start Camera" to scan your QR code</p>
                </div>
              )}
              {cameraError && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239,68,68,0.1)' }}>
                  <CameraOff size={32} color="#ef4444" />
                  <p style={{ fontSize: '0.75rem', color: '#fca5a5', lineHeight: 1.4 }}>{cameraError}</p>
                </div>
              )}
              {cameraActive && (
                <div className="qr-scanner-overlay">
                  <div className="qr-scanner-corners" />
                  <div className="qr-scan-line" />
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!cameraActive ? (
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={startCameraStream}>
                  <Camera size={16} /> Start Camera
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={stopCameraStream}>
                  <CameraOff size={16} /> Stop Camera
                </button>
              )}
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
                disabled={!cameraActive} title="Flip Camera">
                🔄 Flip
              </button>
            </div>

            {/* BarcodeDetector status */}
            {cameraActive && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {qrScanMessage || ('BarcodeDetector' in window ? '✓ Auto-scanning active – hold QR code in view' : '⚠️ Auto-scan not supported. Use manual input below.')}
              </p>
            )}

            {/* Manual fallback */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Or enter QR token manually:</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input className="form-input" type="text" placeholder="Paste QR token here..." value={manualScanInput} onChange={e => setManualScanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manualScanInput && (handleQRScan(manualScanInput), setManualScanInput(''))} />
                <button className="btn btn-primary" onClick={() => { if (manualScanInput) { handleQRScan(manualScanInput); setManualScanInput(''); } }}>Scan</button>
              </div>
            </div>

            {/* Quick mock Check-In/Out fallback for development */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleQRCheckIn(currentUser?.hostelId || hostels[0]?.id || '')}>
                Quick Check-In
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleQRCheckOut}>
                Quick Check-Out
              </button>
            </div>
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

      {/* Selected Room Details Modal */}
      {selectedRoom && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedRoom(null)}>
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '460px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Room {selectedRoom.roomNumber}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Block {selectedRoom.block} · Floor {selectedRoom.floor}</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setSelectedRoom(null)}><X size={16} /></button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} color="var(--primary)" /> Occupants ({selectedRoom.users?.length || 0} / {selectedRoom.capacity || 4})
              </h4>

              {(!selectedRoom.users || selectedRoom.users.length === 0) ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No students allocated to this room yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {selectedRoom.users.map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reg: {u.registerNumber || 'N/A'} · Dept: {u.department || 'N/A'}</div>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => { setSelectedRoom(null); setSelectedStudentProfile(u); }}>
                        Profile <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={() => setSelectedRoom(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Student 360° Profile Modal */}
      {selectedStudentProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedStudentProfile(null)}>
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem', color: '#fff' }}>
                  {selectedStudentProfile.fullName?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedStudentProfile.fullName}
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{selectedStudentProfile.status}</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span>Reg: {selectedStudentProfile.registerNumber || 'STU-001'}</span> ·
                    <span>Room: {selectedStudentProfile.room?.roomNumber || 'Unassigned'}</span>
                  </p>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setSelectedStudentProfile(null)}><X size={16} /></button>
            </div>

            <div className="profile-tabs" style={{ marginBottom: '0.5rem' }}>
              {['personal', 'academic', 'hostel', 'leaves', 'complaints'].map(tab => (
                <button
                  key={tab}
                  className={`profile-tab ${profileTab === tab ? 'active' : ''}`}
                  onClick={() => setProfileTab(tab)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {profileTab === 'personal' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Email Address</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.email}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} /> Phone Number</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.mobileNumber || 'Not provided'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Blood Group</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem', color: '#ef4444' }}>{selectedStudentProfile.bloodGroup || 'O+'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> Permanent Address</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.address || 'Address on file'}</div>
                </div>
              </div>
            )}

            {profileTab === 'academic' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><GraduationCap size={12} /> College</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.collegeName || 'Engineering Campus'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Department</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.department || 'Computer Science'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Academic Year</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.year || '3rd Year'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Register Number</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.registerNumber || 'REG-2026-99'}</div>
                </div>
              </div>
            )}

            {profileTab === 'hostel' && (
              <div style={{ display: 'grid', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Hostel Block</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedStudentProfile.hostel?.name || 'Main Hostel Facility'}</div>
                  </div>
                  <Building2 size={24} color="var(--primary)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Assigned Room</div>
                    <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--primary)' }}>Room {selectedStudentProfile.room?.roomNumber || 'Not assigned'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>QR Token Status</div>
                    <div style={{ fontWeight: 600, marginTop: '0.2rem', color: selectedStudentProfile.qrToken ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCheck size={14} /> {selectedStudentProfile.qrToken ? 'Active Token' : 'Pending Generation'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'leaves' && (
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                {leavesHistory.filter((l: any) => l.userId === selectedStudentProfile.id).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>No leave history on record for this student.</p>
                ) : (
                  leavesHistory.filter((l: any) => l.userId === selectedStudentProfile.id).map((l: any) => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{l.reason}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}</div>
                      </div>
                      <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {profileTab === 'complaints' && (
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                {complaints.filter((c: any) => c.userId === selectedStudentProfile.id).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>No complaints submitted by this student.</p>
                ) : (
                  complaints.filter((c: any) => c.userId === selectedStudentProfile.id).map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category: {c.category}</div>
                      </div>
                      <span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>{c.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            <button className="btn btn-secondary" onClick={() => setSelectedStudentProfile(null)}>Close Profile</button>
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


      {/* GATE PASS MODULE */}
      {subView === 'gate_pass' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Gate Pass Management</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>Student exit/entry pass with QR verification</p>
            </div>
            <button className="btn btn-secondary" onClick={loadGatePasses}>Refresh</button>
          </div>
          {currentUser.role === 'STUDENT' && (
            <div style={{ padding: '1.5rem', background: 'var(--primary-soft)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Request Gate Pass</h4>
              <form onSubmit={handleCreateGatePass} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <input className="form-input" type="text" placeholder="Purpose (e.g. Medical)" value={gpPurpose} onChange={e => setGpPurpose(e.target.value)} required />
                <input className="form-input" type="text" placeholder="Destination" value={gpDestination} onChange={e => setGpDestination(e.target.value)} required />
                <input className="form-input" type="datetime-local" value={gpExpectedReturn} onChange={e => setGpExpectedReturn(e.target.value)} required />
                <button className="btn btn-primary" type="submit">Submit Request</button>
              </form>
            </div>
          )}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {gatePasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No gate passes found.</p></div>
            ) : gatePasses.map((gp: any) => (
              <div key={gp.id} style={{ padding: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{gp.student?.fullName || 'Student'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>#{gp.student?.registerNumber || '-'}</span></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>To: {gp.destination} | Purpose: {gp.purpose}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Return by: {new Date(gp.expectedReturn).toLocaleString()}</div>
                    {gp.lateReturn && <span className="badge badge-danger">LATE RETURN</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge ${gp.status === 'APPROVED' ? 'badge-success' : gp.status === 'REJECTED' ? 'badge-danger' : gp.status === 'EXITED' ? 'badge-info' : gp.status === 'RETURNED' ? 'badge-success' : 'badge-warning'}`}>{gp.status}</span>
                    {['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'PENDING' && (
                      <>
                        <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'APPROVED')}>Approve</button>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'REJECTED')}>Reject</button>
                      </>
                    )}
                    {['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'APPROVED' && (
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'EXITED')}>Mark Exit</button>
                    )}
                    {['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'EXITED' && (
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'RETURNED')}>Mark Return</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTICE BOARD */}
      {subView === 'notices' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Notice Board</h2>
            <button className="btn btn-secondary" onClick={loadNotices}>Refresh</button>
          </div>
          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
            <div style={{ padding: '1.5rem', background: 'var(--primary-soft)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Post Notice</h4>
              <form onSubmit={handleCreateNotice} style={{ display: 'grid', gap: '1rem' }}>
                <input className="form-input" type="text" placeholder="Notice Title" value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} required />
                <textarea className="form-input" rows={3} placeholder="Notice content..." value={noticeContent} onChange={e => setNoticeContent(e.target.value)} style={{ resize: 'vertical' }} required />
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className="form-input" style={{ width: 'auto' }} value={noticeAudience} onChange={e => setNoticeAudience(e.target.value)}>
                    <option value="ALL">All Users</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="STAFF">Staff Only</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={noticeIsEmergency} onChange={e => setNoticeIsEmergency(e.target.checked)} />
                    Emergency Alert
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={noticeIsPinned} onChange={e => setNoticeIsPinned(e.target.checked)} />
                    Pin Notice
                  </label>
                  <button className="btn btn-primary" type="submit">Post Notice</button>
                </div>
              </form>
            </div>
          )}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {notices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No notices posted yet.</p></div>
            ) : notices.map((notice: any) => (
              <div key={notice.id} style={{ padding: '1.5rem', background: notice.isEmergency ? 'rgba(201,74,74,0.06)' : 'var(--bg-card)', border: `1px solid ${notice.isEmergency ? 'rgba(201,74,74,0.3)' : notice.isPinned ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {notice.isPinned && <span style={{ fontSize: '1rem' }}>📌</span>}
                    {notice.isEmergency && <span className="badge badge-danger">Emergency</span>}
                    <h4 style={{ fontWeight: 700 }}>{notice.title}</h4>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge badge-info">{notice.audience}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    {['SUPER_ADMIN', 'HOSTEL_ADMIN'].includes(currentUser.role) && (
                      <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => handleDeleteNotice(notice.id)}>X</button>
                    )}
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{notice.content}</p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>By: {notice.postedBy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {subView === 'notifications' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Notifications {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{unreadCount}</span>}</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={loadNotifications}>Refresh</button>
              {unreadCount > 0 && <button className="btn btn-primary" onClick={handleMarkAllRead}>Mark All Read</button>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No notifications. You are all caught up!</p></div>
            ) : notifications.map((notif: any) => (
              <div key={notif.id} onClick={() => !notif.isRead && handleMarkNotificationRead(notif.id)} style={{ padding: '1rem 1.25rem', background: notif.isRead ? 'var(--bg-card)' : 'var(--primary-soft)', border: `1px solid ${notif.isRead ? 'var(--border-color)' : 'var(--primary)'}`, borderRadius: '10px', cursor: notif.isRead ? 'default' : 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {!notif.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block', marginRight: '0.5rem' }}></span>}
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{notif.message}</div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MESS MENU MODULE */}
      {subView === 'mess_menu' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Weekly Mess Menu</h2>
            <button className="btn btn-secondary" onClick={loadMessMenus}>Refresh</button>
          </div>
          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
            <div style={{ padding: '1.5rem', background: 'rgba(16,185,129,0.04)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Update Day Menu</h4>
              <form onSubmit={handleUpdateMessMenu} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <select className="form-input" value={menuDay} onChange={e => setMenuDay(e.target.value)}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                </select>
                <input className="form-input" type="text" placeholder="Breakfast" value={menuBreakfast} onChange={e => setMenuBreakfast(e.target.value)} />
                <input className="form-input" type="text" placeholder="Lunch" value={menuLunch} onChange={e => setMenuLunch(e.target.value)} />
                <input className="form-input" type="text" placeholder="Dinner" value={menuDinner} onChange={e => setMenuDinner(e.target.value)} />
                <button className="btn btn-primary" type="submit">Save Menu</button>
              </form>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                  {['Day', 'Breakfast', 'Lunch', 'Dinner'].map(h => <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border-color)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                  const menu = messMenus.find((m: any) => m.dayOfWeek === day);
                  return (
                    <tr key={day} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{day}</td>
                      <td style={{ padding: '0.75rem 1rem', color: menu?.breakfast ? 'var(--text-main)' : 'var(--text-muted)' }}>{menu?.breakfast || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: menu?.lunch ? 'var(--text-main)' : 'var(--text-muted)' }}>{menu?.lunch || '-'}</td>
                      <td style={{ padding: '0.75rem 1rem', color: menu?.dinner ? 'var(--text-main)' : 'var(--text-muted)' }}>{menu?.dinner || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORTS MODULE */}
      {subView === 'reports' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Reports and Analytics</h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[{id:'fees',label:'Fee Collection'},{id:'attendance',label:'Attendance'},{id:'occupancy',label:'Room Occupancy'}].map(rt => (
              <button key={rt.id} className={`btn ${reportType === rt.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setReportType(rt.id)}>{rt.label}</button>
            ))}
            <button className="btn btn-primary" onClick={handleGenerateReport} disabled={reportLoading}>
              {reportLoading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
          {reportData && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {reportData.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {Object.entries(reportData.summary).map(([key, val]) => (
                    <div key={key} className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{typeof val === 'number' && (key.includes('Due') || key.includes('Collected') || key.includes('outstanding')) ? '₹' + Number(val).toLocaleString() : String(val)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                      {reportType === 'fees' && ['Student', 'Fee', 'Amount', 'Paid', 'Status', 'Due Date'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'attendance' && ['Student', 'Reg No', 'Date', 'Status', 'Session'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'occupancy' && ['Block', 'Room', 'Category', 'Capacity', 'Occupied', 'Available'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {reportType === 'fees' && reportData.fees?.slice(0, 50).map((f: any) => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{f.student?.fullName || '-'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{f.title}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>Rs.{f.amount.toLocaleString()}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>Rs.{f.paidAmount.toLocaleString()}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{f.status}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(f.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {reportType === 'attendance' && reportData.records?.slice(0, 50).map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.user?.fullName || '-'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.user?.registerNumber || '-'}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(r.date).toLocaleDateString()}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${r.isPresent ? 'badge-success' : 'badge-danger'}`}>{r.isPresent ? 'Present' : 'Absent'}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.session || 'Morning'}</td>
                      </tr>
                    ))}
                    {reportType === 'occupancy' && reportData.rooms?.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.block}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.roomNumber}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-info">{r.category}</span></td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.capacity}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>{r.occupied}</td>
                        <td style={{ padding: '0.6rem 0.75rem' }}><span style={{ color: r.available === 0 ? 'var(--danger)' : 'var(--accent)' }}>{r.available}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GLOBAL SEARCH */}
      {subView === 'search' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Global Search</h2>
          <form onSubmit={handleGlobalSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <input className="form-input" style={{ flex: 1, minWidth: '200px' }} type="text" placeholder="Search students, complaints, fees..." value={globalSearchQuery} onChange={e => setGlobalSearchQuery(e.target.value)} />
            <button className="btn btn-primary" type="submit" disabled={globalSearchLoading}>{globalSearchLoading ? 'Searching...' : 'Search'}</button>
          </form>
          {globalSearchResults && (
            <div style={{ display: 'grid', gap: '2rem' }}>
              {globalSearchResults.students?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>Students ({globalSearchResults.students.length})</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {globalSearchResults.students.map((s: any) => (
                      <div key={s.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <div><span style={{ fontWeight: 700 }}>{s.fullName}</span> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.email} | #{s.registerNumber}</span></div>
                        <span className={`badge ${s.status === 'APPROVED' ? 'badge-success' : s.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>{s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {globalSearchResults.complaints?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Complaints ({globalSearchResults.complaints.length})</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {globalSearchResults.complaints.map((c: any) => (
                      <div key={c.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 700 }}>{c.title}</span>
                        <span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {globalSearchResults.fees?.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Fee Records ({globalSearchResults.fees.length})</h4>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {globalSearchResults.fees.map((f: any) => (
                      <div key={f.id} style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <div><span style={{ fontWeight: 700 }}>{f.title}</span> <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Student: {f.student?.fullName} | Rs.{f.amount}</span></div>
                        <span className={`badge ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{f.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!globalSearchResults.students?.length && !globalSearchResults.complaints?.length && !globalSearchResults.fees?.length && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}><p>No results found for "{globalSearchResults.query}"</p></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD WORKER CATEGORY */}
      {showAddCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('worker.addCategory')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowAddCategoryModal(false)}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Category Name</label>
                <input className="form-input" type="text" placeholder="e.g. Plumber, Electrician" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Description</label>
                <textarea className="form-input" placeholder="Scope of work..." value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} rows={3}></textarea>
              </div>
              <button className="btn btn-primary" onClick={handleCreateWorkerCategory}>Save Category</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER NEW WORKER */}
      {showAddWorkerModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('worker.addWorker')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowAddWorkerModal(false)}><X size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Full Name *</label>
                <input className="form-input" type="text" placeholder="Ravi Kumar" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} required />
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email / Login ID *</label>
                  <input className="form-input" type="email" placeholder="ravi@worker.com" value={newWorkerEmail} onChange={e => setNewWorkerEmail(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Password *</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={newWorkerPassword} onChange={e => setNewWorkerPassword(e.target.value)} required />
                </div>
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Worker Category *</label>
                  <select className="form-input" value={newWorkerCategoryId} onChange={e => setNewWorkerCategoryId(e.target.value)} required>
                    <option value="">-- Select Category --</option>
                    {workerCategories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Mobile Number</label>
                  <input className="form-input" type="tel" placeholder="9876543210" value={newWorkerMobile} onChange={e => setNewWorkerMobile(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Specialization Notes</label>
                <input className="form-input" type="text" placeholder="e.g. Sanitary & tap repairs" value={newWorkerSpec} onChange={e => setNewWorkerSpec(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleCreateWorker}>Register Worker Account</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN WORKER TO COMPLAINT */}
      {showAssignWorkerModal && selectedComplaintForAssign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Assign Worker to Grievance</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowAssignWorkerModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontWeight: 700 }}>{selectedComplaintForAssign.title}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Category: <strong>{selectedComplaintForAssign.category}</strong></p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Select Available Worker</label>
              <select className="form-input" value={selectedWorkerIdForAssign} onChange={e => setSelectedWorkerIdForAssign(e.target.value)}>
                <option value="">-- Choose Worker --</option>
                {workersList.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.workerProfile?.category?.name || 'General'}) - {w.workerProfile?.availability || 'AVAILABLE'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAssignWorkerToComplaint}>Confirm Assignment</button>
          </div>
        </div>
      )}

      {/* MODAL 4: WORKER REJECT REASON */}
      {showRejectWorkerModal && selectedComplaintForReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Reject Job Assignment</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowRejectWorkerModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Rejection Reason *</label>
              <select className="form-input" value={rejectReasonInput} onChange={e => setRejectReasonInput(e.target.value)}>
                <option value="">-- Select Reason --</option>
                <option value="Wrong Category Assignment">Wrong Category Assignment</option>
                <option value="Currently Unavailable / Busy">Currently Unavailable / Busy</option>
                <option value="Requires Additional Specialist Technician">Requires Additional Specialist Technician</option>
                <option value="On Leave">On Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={handleRejectWorkerJob}>Confirm Rejection</button>
          </div>
        </div>
      )}

      {/* MODAL 5: WORKER COMPLETE WORK */}
      {showCompleteWorkModal && selectedComplaintForComplete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Complete Work Task</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowCompleteWorkModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Work Completion Notes *</label>
              <textarea className="form-input" placeholder="Describe work done (e.g. Replaced leaking tap washer)..." value={completionNotesInput} onChange={e => setCompletionNotesInput(e.target.value)} rows={3} required></textarea>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Materials / Spare Parts Used</label>
              <input className="form-input" type="text" placeholder="e.g. 1 x Tap washer, Teflon tape" value={materialsUsedInput} onChange={e => setMaterialsUsedInput(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={handleCompleteWorkerJob}>Submit Work Completion</button>
          </div>
        </div>
      )}

      {/* MODAL 6: VISUAL COMPLAINT TIMELINE */}
      {showTimelineModal && selectedComplaintTimeline && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Complaint Timeline</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedComplaintTimeline.title}</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowTimelineModal(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)', margin: '0.5rem 0' }}>
              {!selectedComplaintTimeline.timeline || selectedComplaintTimeline.timeline.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>✓ Created</div>
                  <div style={{ fontSize: '0.75rem' }}>{new Date(selectedComplaintTimeline.createdAt).toLocaleString()}</div>
                </div>
              ) : (
                selectedComplaintTimeline.timeline.map((item: any, idx: number) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-1.95rem', top: '0.2rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }} />
                    <h5 style={{ fontWeight: 800, fontSize: '0.9rem' }}>{item.title}</h5>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.description}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.actorName} ({item.actorRole}) · {new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: STUDENT CONFIRM RESOLUTION */}
      {showConfirmResolutionModal && selectedComplaintForConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Confirm Resolution</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowConfirmResolutionModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Rating (1 - 5 Stars)</label>
              <select className="form-input" value={resolutionRatingInput} onChange={e => setResolutionRatingInput(Number(e.target.value))}>
                <option value={5}>⭐⭐⭐⭐⭐ 5 Stars (Excellent)</option>
                <option value={4}>⭐⭐⭐⭐ 4 Stars (Good)</option>
                <option value={3}>⭐⭐⭐ 3 Stars (Satisfactory)</option>
                <option value={2}>⭐⭐ 2 Stars (Poor)</option>
                <option value={1}>⭐ 1 Star (Unsatisfactory)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Feedback Remarks</label>
              <textarea className="form-input" placeholder="Add optional comments..." value={resolutionFeedbackInput} onChange={e => setResolutionFeedbackInput(e.target.value)} rows={3}></textarea>
            </div>
            <button className="btn btn-primary" onClick={handleConfirmComplaintResolution}>Confirm & Close Complaint</button>
          </div>
        </div>
      )}

      {/* MODAL 8: STUDENT REOPEN COMPLAINT */}
      {showReopenModal && selectedComplaintForReopen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Reopen Complaint</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowReopenModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Reason for Reopening *</label>
              <textarea className="form-input" placeholder="Explain why the issue persists..." value={reopenReasonInput} onChange={e => setReopenReasonInput(e.target.value)} rows={3} required></textarea>
            </div>
            <button className="btn btn-primary" style={{ background: '#f59e0b' }} onClick={handleReopenComplaint}>Reopen Complaint</button>
          </div>
        </div>
      )}

      {/* MODAL 9: TARGETED EMERGENCY ALERT */}
      {showEmergencyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(239,68,68,0.3)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2rem', border: '2px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={24} color="#ef4444" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>{t('emergency.confirmTitle')}</h3>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowEmergencyModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('emergency.confirmDesc')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('emergency.level')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {(['ROOM', 'FLOOR', 'HOSTEL'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      className={`btn ${emergencyLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                      onClick={() => setEmergencyLevel(lvl)}
                    >
                      {lvl === 'ROOM' ? t('emergency.roomLevel') : lvl === 'FLOOR' ? t('emergency.floorLevel') : t('emergency.hostelLevel')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('emergency.type')}</label>
                <select className="form-input" value={emergencyType} onChange={e => setEmergencyType(e.target.value)}>
                  <option value="Fire">🔥 Fire Emergency</option>
                  <option value="Medical">🚑 Medical Emergency</option>
                  <option value="Electrical">⚡ Electrical Hazard</option>
                  <option value="Security">🛡️ Security Breach / Violence</option>
                  <option value="Gas Leak">💨 Gas Leak</option>
                  <option value="Water Leak">💧 Water Leak / Flooding</option>
                  <option value="Other">⚠️ Other Incident</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('emergency.message')}</label>
                <textarea className="form-input" placeholder="Brief details about location and incident..." value={emergencyMessageInput} onChange={e => setEmergencyMessageInput(e.target.value)} rows={2}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowEmergencyModal(false)}>{t('emergency.cancel')}</button>
                <button className="btn btn-danger" style={{ flex: 1.5, background: '#ef4444', fontWeight: 800 }} onClick={handleTriggerEmergency}>
                  🚨 {t('emergency.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
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
