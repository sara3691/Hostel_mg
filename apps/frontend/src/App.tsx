import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import {
  Shield,
  User,
  Users,
  Home,
  Plus,
  PlusCircle,
  CheckCircle,
  CheckCircle2,
  LogOut,
  Moon,
  Sun,
  AlertTriangle,
  Settings,
  Grid,
  Clipboard,
  Calendar,
  ArrowRight,
  Bell,
  BellRing,
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
  Check,
  Key,
  Bot,
  RefreshCw,
  Sliders,
  Languages,
  Volume2,
  Save,
  Printer,
  Edit,
  Trash2,
  Copy
} from 'lucide-react';
import { useTranslation, languages } from './i18n';
import {
  AdmissionsPanel, AcademicYearPanel, BedManagementPanel,
  AssetManagementPanel, InspectionsPanel, IncidentPanel,
  HostelConfigPanel, DigitalIDPanel, LiveTrackingPanel,
  PreventiveMaintenancePanel, MessWasteForecastPanel, InventoryLedgerPanel,
  FeeStructurePanel, GuardianPortalPanel
} from './ErpPanels';


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

// Helper to convert base64 VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Live Camera Capture Modal Component (STRICTLY NO FILE UPLOAD) ──
const CameraCaptureModal = ({
  onCapture,
  onClose
}: {
  onCapture: (base64Image: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError(err.message || t('camera.error'));
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleUsePhoto = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      if (stream) stream.getTracks().forEach(t => t.stop());
      onClose();
    }
  };

  const handleClose = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container" style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <Camera size={18} color="var(--primary)" /> {t('camera.title')}
          </h3>
          <button className="btn btn-ghost" onClick={handleClose} style={{ padding: '0.35rem' }}>
            <X size={16} />
          </button>
        </div>

        {cameraError ? (
          <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={32} style={{ marginBottom: '0.5rem' }} />
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cameraError}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {t('camera.instruction')}
            </p>
          </div>
        ) : capturedPhoto ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <img src={capturedPhoto} alt="Captured Evidence" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} />
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={handleRetake} style={{ flex: 1 }}>{t('camera.retake')}</button>
              <button className="btn btn-primary" onClick={handleUsePhoto} style={{ flex: 1 }}>{t('camera.usePhoto')}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '100%', height: '260px', background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-color)' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={handleClose} style={{ flex: 1 }}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleCapture} style={{ flex: 1 }}>
                <Camera size={16} /> {t('camera.capture')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

type UserRole = 'SUPER_ADMIN' | 'HOSTEL_ADMIN' | 'ASSISTANT_WARDEN' | 'MESS_MANAGER' | 'SECURITY' | 'MAINTENANCE' | 'ACCOUNTANT' | 'STUDENT' | 'WARDEN' | 'STAFF' | 'WORKER';

interface Hostel {
  id: string;
  name: string;
  code: string;
  collegeName: string;
  address: string;
  capacity: number;
  gender?: string;
  status?: string;
  phone?: string;
  email?: string;
  totalBeds?: number;
  occupiedBeds?: number;
  availableBeds?: number;
  roomCount?: number;
  wardenId?: string;
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
  mobileNumber?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  bloodGroup?: string | null;
  medicalDetails?: string | null;
  department?: string | null;
  year?: string | null;
  parentName?: string | null;
  parentMobile?: string | null;
  guardianName?: string | null;
  guardianMobile?: string | null;
  collegeName?: string | null;
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
  const radius = 56;
  const stroke = 7;
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
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', strokeLinecap: 'round' }}
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
          fontSize="1rem"
          fontWeight="700"
        >
          {percentage}%
        </text>
      </svg>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t('dashboard.overallAttendance')}</span>
    </div>
  );
};

// Simple SVG Bar Chart Component for Analytics (unused)

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

  const getStatusLabel = (status: string) => {
    if (!status) return '';
    const lower = status.toLowerCase();
    if (lower === 'in_progress') return t('common.inProgress');
    if (lower === 'picked_up') return t('common.pickedUp') || 'Picked Up';
    if (lower === 'delivered') return t('common.delivered') || 'Delivered';
    if (lower === 'paid') return t('common.paid') || 'Paid';
    if (lower === 'partial') return t('common.partial') || 'Partial';
    if (lower === 'exited') return t('common.exited') || 'Exited';
    if (lower === 'returned') return t('common.returned') || 'Returned';
    if (lower === 'resolved') return t('common.resolved') || 'Resolved';
    if (lower === 'unpaid') return t('common.unpaid') || 'Unpaid';
    return t(`common.${lower}`) || status;
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const [dismissPushBanner, setDismissPushBanner] = useState(false);
  // ── Dynamic 5-min Temporary QR states ──
  const [tempQrData, setTempQrData] = useState<any | null>(null);
  const [qrCountdownSeconds, setQrCountdownSeconds] = useState<number>(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Scanner GPS states ──
  const [scannerGps, setScannerGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('Detecting...');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });
  const [view, setView] = useState<'home' | 'login' | 'register' | 'dashboard' | 'qr_login'>(() => {
    try {
      const token = localStorage.getItem('access_token');
      const cached = localStorage.getItem('cached_user');
      return (token && cached) ? 'dashboard' : 'home';
    } catch (_) {
      return 'home';
    }
  });
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

  useEffect(() => {
    if (isQrScannerPortal) {
      startCameraStream();
      setScannerActive(true);
    }
  }, [isQrScannerPortal]);
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
  const [loginTab, setLoginTab] = useState<'STUDENT' | 'WARDEN' | 'WORKER' | 'SUPER_ADMIN'>('STUDENT');

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

  // Complaint creation & Live Camera state
  const [showCameraCaptureModal, setShowCameraCaptureModal] = useState(false);
  const [compEvidencePhoto, setCompEvidencePhoto] = useState<string | null>(null);


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

  // Hostel creation & filter states
  const [newHostelName, setNewHostelName] = useState('');
  const [newHostelCode, setNewHostelCode] = useState('');
  const [newHostelCollege, setNewHostelCollege] = useState('');
  const [newHostelAddress, setNewHostelAddress] = useState('');
  const [newHostelCapacity, setNewHostelCapacity] = useState<string | number>(120);
  const [newHostelGender, setNewHostelGender] = useState('MIXED');
  const [newHostelPhone, setNewHostelPhone] = useState('');
  const [newHostelEmail, setNewHostelEmail] = useState('');
  const [newHostelWardenId, setNewHostelWardenId] = useState('');
  const [hostelSearchQuery, setHostelSearchQuery] = useState('');
  const [hostelGenderFilter, setHostelGenderFilter] = useState('ALL');
  const [hostelStatusFilter, setHostelStatusFilter] = useState('ALL');
  const [showEditHostelModal, setShowEditHostelModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState<any | null>(null);

  // Room creation & filter states
  const [newRoomBlock, setNewRoomBlock] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState('0');
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('4');
  const [newRoomCategory, setNewRoomCategory] = useState('NON_AC');
  const [newRoomHostelId, setNewRoomHostelId] = useState('');
  const [newRoomIsMaintenance, setNewRoomIsMaintenance] = useState(false);
  const [roomHostelFilter, setRoomHostelFilter] = useState('ALL');
  const [_roomBlockFilter, _setRoomBlockFilter] = useState('ALL');
  const [_roomSearchQuery, _setRoomSearchQuery] = useState('');
  const [roomCategoryFilter, setRoomCategoryFilter] = useState('ALL');

  // Allocation & Transfer & Checkout Modal states
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedStudentForAllocate, setSelectedStudentForAllocate] = useState<any | null>(null);
  const [allocHostelId, setAllocHostelId] = useState('');
  const [allocRoomId, setAllocRoomId] = useState('');
  const [allocBedNumber, setAllocBedNumber] = useState('');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState<any | null>(null);
  const [targetHostelId, setTargetHostelId] = useState('');
  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetBedNumber, setTargetBedNumber] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferRemarks, setTransferRemarks] = useState('');

  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedStudentForCheckOut, setSelectedStudentForCheckOut] = useState<any | null>(null);
  const [checkOutDateInput, setCheckOutDateInput] = useState('');
  const [checkOutReasonInput, setCheckOutReasonInput] = useState('Routine Check-out');
  const [checkOutRemarksInput, setCheckOutRemarksInput] = useState('');

  // Fee & Receipt Modal states
  const [showPayFeeModal, setShowPayFeeModal] = useState(false);
  const [selectedFeeForPay, setSelectedFeeForPay] = useState<any | null>(null);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payModeInput, setPayModeInput] = useState('UPI');
  const [payTransactionIdInput, setPayTransactionIdInput] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<any | null>(null);

  // Damaged inventory modal states
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [selectedInventoryForDamage, setSelectedInventoryForDamage] = useState<any | null>(null);
  const [damageQtyInput, setDamageQtyInput] = useState(1);
  const [damageReasonInput, setDamageReasonInput] = useState('Damaged/Expired');

  // Admin User Management & Dev Seeding states
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [selectedUserForResetPass, setSelectedUserForResetPass] = useState<any | null>(null);
  const [newTestPasswordInput, setNewTestPasswordInput] = useState('Password123!');
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserMobile, setEditUserMobile] = useState('');
  const [editUserDept, setEditUserDept] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserHostelId, setEditUserHostelId] = useState('');
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedSizeInput, setSeedSizeInput] = useState<'small' | 'medium' | 'large'>('medium');
  const [seedClearInput, setSeedClearInput] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [latestSeedReport, setLatestSeedReport] = useState<any | null>(null);

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

  const [_payAmount, _setPayAmount] = useState(0);
  const [_payMode, _setPayMode] = useState('UPI');
  const [_payTxId, _setPayTxId] = useState('');

  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const [newMessName, setNewMessName] = useState('');
  // Mess Skip & confirmation states
  const [meals, setMeals] = useState<any[]>([]);
  const [mealHistory, setMealHistory] = useState<any[]>([]);
  const [isMealsLoading, setIsMealsLoading] = useState(false);
  const [mealPublishDate, setMealPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealPublishType, setMealPublishType] = useState('BREAKFAST');
  const [mealPublishMenu, setMealPublishMenu] = useState('');
  const [mealPublishCutoff, setMealPublishCutoff] = useState('');
  const [mealPublishTime, setMealPublishTime] = useState('');
  const [mealFilterHostelId, setMealFilterHostelId] = useState('');
  const [mealFilterBlock, setMealFilterBlock] = useState('');
  const [mealFilterFloor, setMealFilterFloor] = useState('');
  const [mealFilterDate, setMealFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSkipConfirmationModal, setShowSkipConfirmationModal] = useState(false);
  const [selectedMealForSkip, setSelectedMealForSkip] = useState<any | null>(null);
  const [showPublishMealModal, setShowPublishMealModal] = useState(false);
  const [activeMessTab, setActiveMessTab] = useState('today');
  // Admin dashboard stats states
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isAdminStatsLoading, setIsAdminStatsLoading] = useState(false);
  const [dashFilterDate, setDashFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [dashFilterHostelId, setDashFilterHostelId] = useState('');
  const [dashFilterBlock, setDashFilterBlock] = useState('');
  const [dashFilterFloor, setDashFilterFloor] = useState('');
  const [laundrySlots, setLaundrySlots] = useState<any[]>([]);
  // Gate Pass state
  const [gatePasses, setGatePasses] = useState<any[]>([]);
  const [gpPurpose, setGpPurpose] = useState('');
  const [gpDestination, setGpDestination] = useState('');
  const [gpExpectedReturn, setGpExpectedReturn] = useState('');
  const [gatePassFilter, setGatePassFilter] = useState('ALL');
  const [gatePassSearch, setGatePassSearch] = useState('');
  const [selectedGatePassDetails, setSelectedGatePassDetails] = useState<any | null>(null);

  // Notices state
  const [notices, setNotices] = useState<any[]>([]);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeAudience, setNoticeAudience] = useState('ALL');
  const [noticeIsEmergency, setNoticeIsEmergency] = useState(false);
  const [noticeIsPinned, setNoticeIsPinned] = useState(false);
  const [noticeSearch, setNoticeSearch] = useState('');
  const [noticeFilter, setNoticeFilter] = useState('ALL');
  const [selectedNoticeDetails, setSelectedNoticeDetails] = useState<any | null>(null);
  const [selectedNoticeForEdit, setSelectedNoticeForEdit] = useState<any | null>(null);
  const [editNoticeTitle, setEditNoticeTitle] = useState('');
  const [editNoticeContent, setEditNoticeContent] = useState('');
  const [editNoticeAudience, setEditNoticeAudience] = useState('ALL');
  const [editNoticeIsEmergency, setEditNoticeIsEmergency] = useState(false);
  const [editNoticeIsPinned, setEditNoticeIsPinned] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifFilter, setNotifFilter] = useState('ALL');
  const [notifSearch, setNotifSearch] = useState('');

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
  const [isSendingEmergency, setIsSendingEmergency] = useState(false);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>(() => {
    return (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'default';
  });

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
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSearch, setReportSearch] = useState('');

  // Audit logs state
  const [auditModuleFilter, setAuditModuleFilter] = useState('');
  const [auditUserSearch, setAuditUserSearch] = useState('');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditTotalCount, setAuditTotalCount] = useState(0);

  // App preferences settings
  const [prefSoundAlerts, setPrefSoundAlerts] = useState(() => localStorage.getItem('smarthostel_sounds') !== 'false');
  const [prefDesktopNotifs, setPrefDesktopNotifs] = useState(() => localStorage.getItem('smarthostel_notifs') !== 'false');
  const [prefGeofenceRadius, setPrefGeofenceRadius] = useState(5);
  const [prefTokenDuration, setPrefTokenDuration] = useState(300);

  // Profile Edit modal state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileMobile, setEditProfileMobile] = useState('');
  const [editProfileAddress, setEditProfileAddress] = useState('');
  const [editProfileEmergency, setEditProfileEmergency] = useState('');
  const [editProfileBloodGroup, setEditProfileBloodGroup] = useState('');
  const [editProfileMedical, setEditProfileMedical] = useState('');
  const [editProfileDept, setEditProfileDept] = useState('');
  const [editProfileYear, setEditProfileYear] = useState('');
  const [editProfileGuardianName, setEditProfileGuardianName] = useState('');
  const [editProfileGuardianMobile, setEditProfileGuardianMobile] = useState('');

  // Global search state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);



  const [rooms, setRooms] = useState<any[]>([]);
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

    // Register Service Worker and listen for push notifications.
    // Registering unconditionally (dev included) is required so the browser keeps
    // checking sw.js for updates — that's what lets a fixed sw.js replace a stale
    // one already installed from a previous visit. sw.js itself is scoped to only
    // ever cache-first hashed /assets/ build output, so it's a no-op during `vite dev`.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registration failed:', err));

      const handleSwMessage = (event: MessageEvent) => {
        if (event.data?.type === 'EMERGENCY_PUSH_RECEIVED') {
          playEmergencyAudio();
          loadEmergencyAlerts();
          showToast('error', '🚨 EMERGENCY ALERT', event.data.payload?.body || 'High priority alert received!');
        } else if (event.data?.type === 'NAVIGATE_EMERGENCY') {
          setSubView('emergencies');
        }
      };

      navigator.serviceWorker.addEventListener('message', handleSwMessage);

      // PWA install prompt
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredInstallPrompt(e);
        setShowInstallBanner(true);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Online/Offline detection with automatic reconnect verification
      const handleOnline = () => {
        setIsOnline(true);
        setShowOnlineBanner(true);
        setTimeout(() => setShowOnlineBanner(false), 3000);
        checkAuth();
      };
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
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

  const playEmergencyAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.6);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.9);
      osc.frequency.exponentialRampToValueAtTime(950, now + 1.2);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.6);
    } catch (_) {}
  }, []);

  const registerPushNotifications = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);
      if (permission !== 'granted') {
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        const res = await axios.get('/api/push/vapid-public-key');
        if (res.data?.success && res.data.publicKey) {
          const convertedVapidKey = urlBase64ToUint8Array(res.data.publicKey);
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }
      }

      if (subscription) {
        await axios.post('/api/push/register', { subscription });
      }
    } catch (err) {
      console.warn('Push notification subscription info:', err);
    }
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await axios.get('/api/auth/me');
      if (res.data?.success && res.data.data) {
        setCurrentUser(res.data.data);
        localStorage.setItem('cached_user', JSON.stringify(res.data.data));
        setView('dashboard');
        loadDashboardData(res.data.data);
        // Automatically sync push subscription if permission is already granted
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          registerPushNotifications();
        }
      }
    } catch (err: any) {
      // ONLY log out if the backend explicitly rejected authentication with 401 Unauthorized
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('cached_user');
        setCurrentUser(null);
        setView('home');
      } else {
        // Network drop / offline / server cold boot: PRESERVE cached login state!
        console.warn('Backend verification skipped due to network/connection state. Maintaining persistent login.');
        const cached = localStorage.getItem('cached_user');
        if (cached && token) {
          try {
            const parsed = JSON.parse(cached);
            setCurrentUser(parsed);
            setView('dashboard');
          } catch (_) {}
        }
      }
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

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      const resAttHistory = await axios.get('/api/attendance/history');
      if (resAttHistory.data?.success) setAttendanceHistory(resAttHistory.data.data);

      const resAttStats = await axios.get('/api/attendance/stats');
      if (resAttStats.data?.success) setAttendanceStats(resAttStats.data.data);
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchAttendanceHistory();
    const interval = setInterval(() => {
      fetchAttendanceHistory();
    }, 4000);
    return () => clearInterval(interval);
  }, [currentUser, fetchAttendanceHistory]);

  useEffect(() => {
    if (currentUser) {
      loadMeals();
    }
  }, [mealFilterDate, mealFilterHostelId, mealFilterBlock, mealFilterFloor]);

  useEffect(() => {
    if (currentUser && ['SUPER_ADMIN', 'WARDEN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role)) {
      loadAdminStats();
    }
  }, [dashFilterDate, dashFilterHostelId, dashFilterBlock, dashFilterFloor]);

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
    if (isSendingEmergency) return;
    setIsSendingEmergency(true);
    try {
      const res = await axios.post('/api/emergency/alert', {
        type: emergencyType,
        level: emergencyLevel,
        message: emergencyMessageInput
      });
      if (res.data?.success) {
        showToast('error', t('emergency.sendAlert'), t('emergency.active'));
        setShowEmergencyModal(false);
        setEmergencyMessageInput('');
        loadEmergencyAlerts();
        playEmergencyAudio();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || t('common.error'));
    } finally {
      setIsSendingEmergency(false);
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
        try { loadAdminStats(); } catch (e) {}
      }
      // Load new ERP modules
      try { loadGatePasses(); } catch (e) {}
      try { loadNotices(); } catch (e) {}
      try { loadNotifications(); } catch (e) {}
      try { loadLaundrySlots(); } catch (e) {}
      try { loadMessMenus(); } catch (e) {}
      try { loadMeals(); } catch (e) {}
      try { loadMealHistory(); } catch (e) {}
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
        fetchAttendanceHistory();
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
        if (res.data.data) {
          localStorage.setItem('cached_user', JSON.stringify(res.data.data));
        }
        setCurrentUser(res.data.data);
        setView('dashboard');
        setSubView('dashboard');
        loadDashboardData(res.data.data);
        registerPushNotifications();
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
          showToast('info', 'Notice', 'Access restricted to authorized personnel');
          await axios.post('/api/auth/logout');
          return;
        }
        localStorage.setItem('cached_user', JSON.stringify(user));
        setCurrentUser(user);
        setIsQrScannerPortal(true);
        setView('dashboard');
        setSubView('dashboard');
        loadDashboardData(user);
        registerPushNotifications();
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
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await axios.post('/api/push/unregister', { endpoint: subscription.endpoint });
          await subscription.unsubscribe();
        }
      }
    } catch (_) {}

    localStorage.removeItem('access_token');
    localStorage.removeItem('cached_user');
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
        capacity: Number(newHostelCapacity),
        phone: newHostelPhone,
        email: newHostelEmail,
        gender: newHostelGender,
        wardenId: newHostelWardenId || null
      });
      if (res.data?.success) {
        showToast('success', 'Hostel Added!', 'New hostel created successfully');
        loadHostels();
        setNewHostelName('');
        setNewHostelCode('');
        setNewHostelCollege('');
        setNewHostelAddress('');
        setNewHostelCapacity(120);
        setNewHostelPhone('');
        setNewHostelEmail('');
      }
    } catch (err: any) {
      showToast('error', 'Error Creating Hostel', err.response?.data?.error || 'Failed to create hostel');
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
        category: newRoomCategory,
        hostelId: newRoomHostelId || (hostels[0] ? hostels[0].id : ''),
        isMaintenance: newRoomIsMaintenance
      });
      if (res.data?.success) {
        showToast('success', 'Room Created!', `Room ${newRoomNumber} added successfully.`);
        setNewRoomNumber('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error Creating Room', err.response?.data?.error || 'Failed to create room');
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
        priority: compPriority,
        resolutionImage: compEvidencePhoto
      });
      if (res.data?.success) {
        showToast('success', 'Complaint Submitted Successfully!', 'Your maintenance ticket is recorded.');
        setCompTitle('');
        setCompDesc('');
        setCompEvidencePhoto(null);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error Submitting Complaint', err.response?.data?.error || 'Please try again.');
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
        const status = pct >= 75 ? 'Good standing' : pct >= 60 ? 'Below target' : 'Critical – at risk';
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
        showToast('success', 'Fee Created', 'Fee invoice created successfully');
        setFeeTitle('');
        setFeeAmount(0);
        setFeeStudentId('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || 'Failed to create fee');
    }
  };

  const handleUpdateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHostel) return;
    try {
      const res = await axios.patch(`/api/hostels/${editingHostel.id}`, editingHostel);
      if (res.data?.success) {
        showToast('success', 'Hostel Updated', 'Hostel details updated successfully!');
        setShowEditHostelModal(false);
        setEditingHostel(null);
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.error || 'Could not update hostel');
    }
  };

  const handleDeleteHostel = async (id: string) => {
    try {
      const res = await axios.delete(`/api/hostels/${id}`);
      if (res.data?.success) {
        showToast('success', 'Hostel Deactivated', 'Hostel status updated to INACTIVE');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Action Failed', err.response?.data?.error || 'Failed to update hostel status');
    }
  };

  const handleAllocateStudent = async () => {
    if (!selectedStudentForAllocate || !allocHostelId || !allocRoomId) {
      showToast('info', 'Notice', 'Hostel and Room selection are required');
      return;
    }
    try {
      const res = await axios.post(`/api/students/${selectedStudentForAllocate.id}/allocate`, {
        hostelId: allocHostelId,
        roomId: allocRoomId,
        bedNumber: allocBedNumber
      });
      if (res.data?.success) {
        showToast('success', 'Room Allocated!', `Student allocated to room successfully.`);
        setShowAllocateModal(false);
        setSelectedStudentForAllocate(null);
        setAllocHostelId(''); setAllocRoomId(''); setAllocBedNumber('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Allocation Error', err.response?.data?.error || 'Failed to allocate room');
    }
  };

  const handleTransferStudent = async () => {
    if (!selectedStudentForTransfer || !targetRoomId) {
      showToast('info', 'Notice', 'Target room selection is required');
      return;
    }
    try {
      const res = await axios.post(`/api/students/${selectedStudentForTransfer.id}/transfer`, {
        targetHostelId,
        targetRoomId,
        targetBedNumber,
        reason: transferReason,
        remarks: transferRemarks
      });
      if (res.data?.success) {
        showToast('success', 'Transfer Completed', 'Student room transfer processed successfully!');
        setShowTransferModal(false);
        setSelectedStudentForTransfer(null);
        setTargetHostelId(''); setTargetRoomId(''); setTargetBedNumber(''); setTransferReason(''); setTransferRemarks('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Transfer Failed', err.response?.data?.error || 'Room transfer failed');
    }
  };

  const handleCheckOutStudent = async () => {
    if (!selectedStudentForCheckOut) return;
    try {
      const res = await axios.post(`/api/students/${selectedStudentForCheckOut.id}/checkout`, {
        checkOutDate: checkOutDateInput,
        reason: checkOutReasonInput,
        remarks: checkOutRemarksInput
      });
      if (res.data?.success) {
        showToast('success', 'Check-Out Processed', 'Student checked out and room bed freed!');
        setShowCheckOutModal(false);
        setSelectedStudentForCheckOut(null);
        setCheckOutDateInput(''); setCheckOutReasonInput('Routine Check-out'); setCheckOutRemarksInput('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Check-out Error', err.response?.data?.error || 'Check-out failed');
    }
  };

  const handlePayFeePartial = async () => {
    if (!selectedFeeForPay || !payAmountInput) {
      showToast('info', 'Notice', 'Payment amount is required');
      return;
    }
    try {
      const res = await axios.post(`/api/fees/${selectedFeeForPay.id}/pay`, {
        amount: Number(payAmountInput),
        paymentMode: payModeInput,
        transactionId: payTransactionIdInput
      });
      if (res.data?.success) {
        showToast('success', 'Payment Recorded!', `Receipt Number: ${res.data.data.payment.receiptNumber}`);
        setShowPayFeeModal(false);
        setSelectedPaymentForReceipt(res.data.data.payment);
        setShowReceiptModal(true);
        setSelectedFeeForPay(null);
        setPayAmountInput(''); setPayTransactionIdInput('');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Payment Error', err.response?.data?.error || 'Failed to record payment');
    }
  };

  const handleDamageInventory = async () => {
    if (!selectedInventoryForDamage || !damageQtyInput) return;
    try {
      const res = await axios.post(`/api/inventory/${selectedInventoryForDamage.id}/damage`, {
        quantity: Number(damageQtyInput),
        purpose: damageReasonInput
      });
      if (res.data?.success) {
        showToast('success', 'Damaged Stock Logged', `Updated damaged quantity for ${selectedInventoryForDamage.itemName}`);
        setShowDamageModal(false);
        setSelectedInventoryForDamage(null);
        setDamageQtyInput(1); setDamageReasonInput('Damaged/Expired');
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Inventory Error', err.response?.data?.error || 'Failed to record damaged stock');
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
        if (currentUser) loadDashboardData(currentUser);
      }
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.error || '');
    }
  };

  // Admin User Management Handlers
  const fetchAdminUsers = useCallback(async () => {
    try {
      const res = await axios.get('/api/admin/users', {
        params: {
          role: userRoleFilter,
          status: userStatusFilter,
          search: userSearchQuery
        }
      });
      if (res.data?.success) {
        setAdminUsers(res.data.users || []);
        setAdminUsersTotal(res.data.pagination?.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin users', err);
    }
  }, [userRoleFilter, userStatusFilter, userSearchQuery]);

  useEffect(() => {
    if (subView === 'users' && currentUser && ['SUPER_ADMIN', 'HOSTEL_ADMIN'].includes(currentUser.role)) {
      fetchAdminUsers();
    }
  }, [subView, currentUser, fetchAdminUsers]);

  const handleUpdateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const res = await axios.put(`/api/admin/users/${userId}/status`, { status: newStatus });
      if (res.data?.success) {
        showToast('success', 'User Status Updated', `Account status updated to ${newStatus}`);
        fetchAdminUsers();
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleResetUserPassword = async () => {
    if (!selectedUserForResetPass || !newTestPasswordInput) return;
    try {
      const res = await axios.post(`/api/admin/users/${selectedUserForResetPass.id}/reset-password`, {
        newPassword: newTestPasswordInput
      });
      if (res.data?.success) {
        showToast('success', 'Password Reset Successful', `New hashed password set for ${selectedUserForResetPass.email}`);
        setShowResetPassModal(false);
        setSelectedUserForResetPass(null);
        setNewTestPasswordInput('Password123!');
      }
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.response?.data?.error || 'Failed to reset user password');
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', 'Copied', `${label} copied to clipboard`);
    } catch {
      showToast('error', 'Copy Failed', `Could not copy ${label.toLowerCase()}`);
    }
  };

  const handleOpenEditUser = (u: any) => {
    setSelectedUserForEdit(u);
    setEditUserFullName(u.fullName || '');
    setEditUserEmail(u.email || '');
    setEditUserMobile(u.mobileNumber || '');
    setEditUserDept(u.department || '');
    setEditUserRole(u.role || '');
    setEditUserHostelId(u.hostelId || '');
    setShowEditUserModal(true);
  };

  const handleSaveEditUser = async () => {
    if (!selectedUserForEdit) return;
    try {
      const res = await axios.patch(`/api/admin/users/${selectedUserForEdit.id}`, {
        fullName: editUserFullName,
        email: editUserEmail,
        mobileNumber: editUserMobile,
        department: editUserDept,
        role: editUserRole,
        hostelId: editUserHostelId
      });
      if (res.data?.success) {
        showToast('success', 'User Updated', `${editUserFullName}'s profile was updated`);
        setShowEditUserModal(false);
        setSelectedUserForEdit(null);
        fetchAdminUsers();
      }
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleTriggerDevSeed = async () => {
    setSeedLoading(true);
    try {
      const res = await axios.post('/api/dev/seed', {
        size: seedSizeInput,
        clearExisting: seedClearInput
      });
      if (res.data?.success) {
        setLatestSeedReport(res.data.report);
        showToast('success', 'Seeding Completed!', `${seedSizeInput.toUpperCase()} dataset populated with 30-day historical data.`);
        if (currentUser) loadDashboardData(currentUser);
        fetchAdminUsers();
      }
    } catch (err: any) {
      showToast('error', 'Seeding Failed', err.response?.data?.error || 'Database seeding failed');
    } finally {
      setSeedLoading(false);
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


  // CSV Export Helper
  const exportToCSV = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," + [
      headers.join(','),
      ...rows.map(e => e.map(item => `"${String(item ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  const loadAuditLogs = async (page = 1) => {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '25');
      if (auditModuleFilter) params.append('module', auditModuleFilter);
      if (auditUserSearch) params.append('userEmail', auditUserSearch);
      if (auditStartDate) params.append('startDate', auditStartDate);
      if (auditEndDate) params.append('endDate', auditEndDate);

      const res = await axios.get(`/api/audit-logs?${params.toString()}`);
      if (res.data?.success) {
        setAuditLogs(res.data.data);
        if (res.data.pagination) {
          setAuditPage(res.data.pagination.page);
          setAuditTotalPages(res.data.pagination.totalPages || 1);
          setAuditTotalCount(res.data.pagination.totalCount || 0);
        }
      }
    } catch (e) {}
  };

  const handleCreateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/gate-passes', { purpose: gpPurpose, destination: gpDestination, expectedReturn: gpExpectedReturn });
      if (res.data?.success) {
        showToast('success', t('common.success'), t('gatePass.submitRequest') + ' ' + t('common.success'));
        setGpPurpose('');
        setGpDestination('');
        setGpExpectedReturn('');
        loadGatePasses();
      }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleCancelGatePass = async (id: string) => {
    try {
      const res = await axios.delete(`/api/gate-passes/${id}`);
      if (res.data?.success) {
        showToast('success', t('common.success'), t('gatePass.cancelPass'));
        loadGatePasses();
      }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleUpdateGatePass = async (id: string, status: string, remarks?: string) => {
    try {
      const res = await axios.patch(`/api/gate-passes/${id}`, { status, remarks });
      if (res.data?.success) { showToast('success', `Gate Pass ${status}`, `Gate pass has been ${status.toLowerCase()}.`); loadGatePasses(); }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/notices', { title: noticeTitle, content: noticeContent, audience: noticeAudience, isEmergency: noticeIsEmergency, isPinned: noticeIsPinned, hostelId: currentUser?.hostelId || undefined });
      if (res.data?.success) { showToast('success', t('common.success'), t('dialogs.saveSuccess')); setNoticeTitle(''); setNoticeContent(''); loadNotices(); }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoticeForEdit) return;
    try {
      const res = await axios.patch(`/api/notices/${selectedNoticeForEdit.id}`, {
        title: editNoticeTitle,
        content: editNoticeContent,
        audience: editNoticeAudience,
        isEmergency: editNoticeIsEmergency,
        isPinned: editNoticeIsPinned
      });
      if (res.data?.success) {
        showToast('success', t('common.success'), t('dialogs.updateSuccess'));
        setSelectedNoticeForEdit(null);
        loadNotices();
      }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleDeleteNotice = async (id: string) => {
    try { await axios.delete(`/api/notices/${id}`); showToast('success', t('common.success'), t('notices.deleteNotice')); loadNotices(); } catch (e) { showToast('info', t('common.notice'), ''); }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try { await axios.patch(`/api/notifications/${id}/read`); loadNotifications(); } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try { await axios.post('/api/notifications/mark-all-read'); loadNotifications(); } catch (e) {}
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await axios.delete(`/api/notifications/${id}`);
      if (res.data?.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {}
  };

  const handleBookLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/laundry', { date: laundryDate, timeSlot: laundryTimeSlot, clothesCount: laundryClothes, notes: laundryNotes });
      if (res.data?.success) { showToast('success', t('common.success'), t('dialogs.saveSuccess')); setLaundryDate(''); setLaundryNotes(''); loadLaundrySlots(); }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleUpdateLaundry = async (id: string, status: string) => {
    try { await axios.patch(`/api/laundry/${id}`, { status }); loadLaundrySlots(); } catch (e) { showToast('info', t('common.notice'), ''); }
  };

  const handleUpdateMessMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/mess-menus', { dayOfWeek: menuDay, breakfast: menuBreakfast, lunch: menuLunch, dinner: menuDinner, hostelId: currentUser?.hostelId || hostels[0]?.id });
      if (res.data?.success) { showToast('success', t('common.success'), `Menu for ${menuDay} updated!`); setMenuBreakfast(''); setMenuLunch(''); setMenuDinner(''); loadMessMenus(); }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const loadAdminStats = async () => {
    setIsAdminStatsLoading(true);
    try {
      const params: any = { date: dashFilterDate };
      if (dashFilterHostelId) params.hostelId = dashFilterHostelId;
      if (dashFilterBlock) params.block = dashFilterBlock;
      if (dashFilterFloor) params.floor = dashFilterFloor;

      const res = await axios.get('/api/admin/dashboard-stats', { params });
      if (res.data?.success) {
        setAdminStats(res.data.data);
      }
    } catch (e) {
      console.error('Error loading admin dashboard stats', e);
    } finally {
      setIsAdminStatsLoading(false);
    }
  };

  const loadMeals = async () => {
    setIsMealsLoading(true);
    try {
      const params: any = { date: mealFilterDate };
      if (mealFilterHostelId) params.hostelId = mealFilterHostelId;
      if (mealFilterBlock) params.block = mealFilterBlock;
      if (mealFilterFloor) params.floor = mealFilterFloor;
      
      const res = await axios.get('/api/meals', { params });
      if (res.data?.success) {
        setMeals(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsMealsLoading(false);
    }
  };

  const loadMealHistory = async () => {
    try {
      const res = await axios.get('/api/meals/history');
      if (res.data?.success) {
        setMealHistory(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmMeal = async (mealId: string, status: 'TAKING' | 'SKIPPED') => {
    try {
      const res = await axios.post(`/api/meals/${mealId}/confirm`, { status });
      if (res.data?.success) {
        showToast('success', t('common.success'), status === 'TAKING' ? t('mess.mealConfirmed') : t('mess.mealSkipped'));
        loadMeals();
        loadMealHistory();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || '');
    }
  };

  const handlePublishMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/meals', {
        date: mealPublishDate,
        type: mealPublishType,
        menu: mealPublishMenu,
        cutoffTime: mealPublishCutoff,
        mealTime: mealPublishTime,
        hostelId: currentUser?.hostelId || hostels[0]?.id
      });
      if (res.data?.success) {
        showToast('success', t('common.success'), 'Meal published successfully!');
        setMealPublishMenu('');
        setMealPublishCutoff('');
        setMealPublishTime('');
        setShowPublishMealModal(false);
        loadMeals();
        loadMealHistory();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || '');
    }
  };

  const handleCancelMeal = async (mealId: string) => {
    try {
      const res = await axios.patch(`/api/meals/${mealId}/cancel`);
      if (res.data?.success) {
        showToast('success', t('common.success'), t('mess.mealCancelled'));
        loadMeals();
      }
    } catch (err: any) {
      showToast('error', t('common.error'), err.response?.data?.error || '');
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.append('startDate', reportStartDate);
      if (reportEndDate) params.append('endDate', reportEndDate);
      const queryStr = params.toString() ? `?${params.toString()}` : '';

      const res = await axios.get(`/api/reports/${reportType}${queryStr}`);
      if (res.data?.success) setReportData(res.data.data);
    } catch (err: any) { showToast('info', t('common.notice'), ''); }
    finally { setReportLoading(false); }
  };

  const handleExportReportCSV = () => {
    if (!reportData) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    if (reportType === 'fees' && reportData.fees) {
      const headers = ['Student Name', 'Register No', 'Fee Head', 'Amount (Rs)', 'Paid (Rs)', 'Status', 'Due Date'];
      const rows = reportData.fees.map((f: any) => [
        f.student?.fullName || 'N/A',
        f.student?.registerNumber || 'N/A',
        f.title,
        f.amount,
        f.paidAmount,
        f.status,
        new Date(f.dueDate).toLocaleDateString()
      ]);
      exportToCSV(`hostel_fees_report_${dateStr}.csv`, headers, rows);
    } else if (reportType === 'attendance' && reportData.records) {
      const headers = ['Student Name', 'Register No', 'Room', 'Date', 'Status', 'Session'];
      const rows = reportData.records.map((r: any) => [
        r.user?.fullName || 'N/A',
        r.user?.registerNumber || 'N/A',
        r.user?.room?.roomNumber || 'N/A',
        new Date(r.date).toLocaleDateString(),
        r.isPresent ? 'Present' : 'Absent',
        r.session || 'Morning'
      ]);
      exportToCSV(`hostel_attendance_report_${dateStr}.csv`, headers, rows);
    } else if (reportType === 'occupancy' && reportData.rooms) {
      const headers = ['Block', 'Room Number', 'Category', 'Capacity', 'Occupied Beds', 'Available Beds'];
      const rows = reportData.rooms.map((r: any) => [
        r.block,
        r.roomNumber,
        r.category || 'Standard',
        r.capacity,
        r.occupied,
        r.available
      ]);
      exportToCSV(`hostel_occupancy_report_${dateStr}.csv`, headers, rows);
    } else if (reportType === 'complaints' && reportData.complaints) {
      const headers = ['Ticket Title', 'Category', 'Priority', 'Status', 'Student Name', 'Worker Assigned', 'Created Date'];
      const rows = reportData.complaints.map((c: any) => [
        c.title,
        c.category,
        c.priority,
        c.status,
        c.student?.fullName || 'N/A',
        c.worker?.fullName || 'Unassigned',
        new Date(c.createdAt).toLocaleDateString()
      ]);
      exportToCSV(`hostel_complaints_report_${dateStr}.csv`, headers, rows);
    } else if (reportType === 'leaves' && reportData.leaves) {
      const headers = ['Student Name', 'Register No', 'Reason', 'Start Date', 'End Date', 'Status'];
      const rows = reportData.leaves.map((l: any) => [
        l.user?.fullName || 'N/A',
        l.user?.registerNumber || 'N/A',
        l.reason,
        new Date(l.startDate).toLocaleDateString(),
        new Date(l.endDate).toLocaleDateString(),
        l.status
      ]);
      exportToCSV(`hostel_leaves_report_${dateStr}.csv`, headers, rows);
    } else if (reportType === 'gatePasses' && reportData.gatePasses) {
      const headers = ['Student Name', 'Register No', 'Purpose', 'Destination', 'Status', 'Expected Return', 'Exit Time', 'Actual Return'];
      const rows = reportData.gatePasses.map((g: any) => [
        g.student?.fullName || 'N/A',
        g.student?.registerNumber || 'N/A',
        g.purpose,
        g.destination,
        g.status,
        new Date(g.expectedReturn).toLocaleString(),
        g.exitTime ? new Date(g.exitTime).toLocaleString() : 'N/A',
        g.actualReturn ? new Date(g.actualReturn).toLocaleString() : 'N/A'
      ]);
      exportToCSV(`hostel_gate_passes_report_${dateStr}.csv`, headers, rows);
    }
  };

  const handleExportAuditCSV = () => {
    if (auditLogs.length === 0) return;
    const headers = ['Timestamp', 'Operator Email', 'Module', 'Action', 'Details'];
    const rows = auditLogs.map(l => [
      new Date(l.createdAt).toLocaleString(),
      l.userEmail,
      l.module,
      l.action,
      l.details || ''
    ]);
    exportToCSV(`hostel_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.patch('/api/profile', {
        fullName: editProfileName,
        mobileNumber: editProfileMobile,
        address: editProfileAddress,
        emergencyContact: editProfileEmergency,
        bloodGroup: editProfileBloodGroup,
        medicalDetails: editProfileMedical,
        department: editProfileDept,
        year: editProfileYear,
        guardianName: editProfileGuardianName,
        guardianMobile: editProfileGuardianMobile
      });
      if (res.data?.success) {
        showToast('success', t('common.success'), t('profile.profileUpdated'));
        setCurrentUser(res.data.data);
        localStorage.setItem('smarthostel_user', JSON.stringify(res.data.data));
        setShowEditProfileModal(false);
      }
    } catch (err: any) { showToast('error', t('common.error'), err.response?.data?.error || ''); }
  };

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearchQuery.length < 2) return;
    setGlobalSearchLoading(true);
    try { const res = await axios.get(`/api/search?q=${encodeURIComponent(globalSearchQuery)}`); if (res.data?.success) setGlobalSearchResults(res.data.data); }
    catch (e) { showToast('info', t('common.notice'), ''); } finally { setGlobalSearchLoading(false); }
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

    const items: Array<{ id: string; label: string; icon: any; section?: string }> = [];
    if (currentUser.role === 'SUPER_ADMIN') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'hostels', label: t('nav.hostels'), icon: Home, section: 'Management' },
        { id: 'rooms', label: t('nav.rooms'), icon: Layers, section: 'Management' },
        { id: 'students', label: t('nav.students'), icon: Users, section: 'Management' },
        { id: 'admissions', label: t('nav.admissions'), icon: GraduationCap, section: 'Management' },
        { id: 'bed_management', label: t('nav.bedManagement'), icon: Home, section: 'Management' },
        { id: 'academic_years', label: t('nav.academicYears'), icon: Calendar, section: 'Management' },
        { id: 'workers', label: t('nav.workers'), icon: Wrench, section: 'Management' },
        { id: 'assets', label: t('nav.assets'), icon: Database, section: 'Operations' },
        { id: 'inspections', label: t('nav.inspections'), icon: CheckCheck, section: 'Operations' },
        { id: 'emergencies', label: t('emergency.title'), icon: ShieldAlert, section: 'Operations' },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode, section: 'Operations' },
        { id: 'leave', label: t('nav.leaves'), icon: Calendar, section: 'Operations' },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle, section: 'Operations' },
        { id: 'incidents', label: t('nav.incidents'), icon: ShieldAlert, section: 'Operations' },
        { id: 'visitors', label: t('nav.visitors'), icon: Users, section: 'Operations' },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard, section: 'Operations' },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen, section: 'Operations' },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard, section: 'Operations' },
        { id: 'gate_pass', label: t('nav.gatePass'), icon: Shield, section: 'Operations' },
        { id: 'live_tracking', label: t('nav.liveTracking'), icon: Activity, section: 'Operations' },
        { id: 'preventive_maintenance', label: t('nav.preventiveMaintenance'), icon: Wrench, section: 'Operations' },
        { id: 'mess_waste', label: t('nav.messWaste'), icon: BookOpen, section: 'Operations' },
        { id: 'inventory_ledger', label: t('nav.inventoryLedger'), icon: Database, section: 'Operations' },
        { id: 'fee_structures', label: t('nav.feeStructures'), icon: CreditCard, section: 'Management' },
        { id: 'guardian_portal', label: t('nav.guardianPortal'), icon: Users, section: 'Management' },
        { id: 'notices', label: t('nav.noticeBoard'), icon: Bell, section: 'Operations' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, section: 'Operations' },
        { id: 'reports', label: t('nav.reports'), icon: PieChart, section: 'System' },
        { id: 'users', label: 'User Management', icon: Users, section: 'System' },
        { id: 'hostel_config', label: 'Hostel Config', icon: Settings, section: 'System' },
        { id: 'audit_logs', label: t('nav.auditLogs'), icon: Activity, section: 'System' },
        { id: 'settings', label: t('nav.settings'), icon: Settings, section: 'System' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'HOSTEL_ADMIN') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'users', label: 'User Management', icon: Users, section: 'Management' },
        { id: 'rooms', label: t('nav.rooms'), icon: Layers, section: 'Management' },
        { id: 'students', label: t('nav.students'), icon: Users, section: 'Management' },
        { id: 'admissions', label: 'Admissions', icon: GraduationCap, section: 'Management' },
        { id: 'bed_management', label: 'Bed Management', icon: Home, section: 'Management' },
        { id: 'workers', label: t('nav.workers'), icon: Wrench, section: 'Management' },
        { id: 'assets', label: 'Assets', icon: Database, section: 'Operations' },
        { id: 'inspections', label: 'Inspections', icon: CheckCheck, section: 'Operations' },
        { id: 'emergencies', label: t('emergency.title'), icon: ShieldAlert, section: 'Operations' },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode, section: 'Operations' },
        { id: 'leave', label: t('nav.leaves'), icon: Calendar, section: 'Operations' },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle, section: 'Operations' },
        { id: 'incidents', label: 'Incidents', icon: ShieldAlert, section: 'Operations' },
        { id: 'visitors', label: t('nav.visitors'), icon: Users, section: 'Operations' },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard, section: 'Operations' },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen, section: 'Operations' },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard, section: 'Operations' },
        { id: 'gate_pass', label: t('nav.gatePass'), icon: Shield, section: 'Operations' },
        { id: 'live_tracking', label: 'Live Tracking', icon: Activity, section: 'Operations' },
        { id: 'notices', label: t('nav.noticeBoard'), icon: Bell, section: 'Operations' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, section: 'Operations' },
        { id: 'reports', label: t('nav.reports'), icon: PieChart, section: 'System' },
        { id: 'hostel_config', label: 'Hostel Config', icon: Settings, section: 'System' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'ASSISTANT_WARDEN') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'rooms', label: t('nav.rooms'), icon: Layers, section: 'Management' },
        { id: 'students', label: t('nav.students'), icon: Users, section: 'Management' },
        { id: 'workers', label: t('nav.workers'), icon: Wrench, section: 'Management' },
        { id: 'assets', label: 'Assets', icon: Database, section: 'Operations' },
        { id: 'inspections', label: 'Inspections', icon: CheckCheck, section: 'Operations' },
        { id: 'emergencies', label: t('emergency.title'), icon: ShieldAlert, section: 'Operations' },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode, section: 'Operations' },
        { id: 'leave', label: t('nav.leaves'), icon: Calendar, section: 'Operations' },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle, section: 'Operations' },
        { id: 'incidents', label: 'Incidents', icon: ShieldAlert, section: 'Operations' },
        { id: 'visitors', label: t('nav.visitors'), icon: Users, section: 'Operations' },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard, section: 'Operations' },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen, section: 'Operations' },
        { id: 'live_tracking', label: 'Live Tracking', icon: Activity, section: 'Operations' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'WORKER') {
      items.push(
        { id: 'worker_dashboard', label: t('worker.dashboardTitle'), icon: Wrench, section: 'Tasks' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, section: 'Tasks' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'MESS_MANAGER') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen, section: 'Mess Operations' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'SECURITY') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'visitors', label: t('nav.visitors'), icon: Users, section: 'Security Gate' },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode, section: 'Security Gate' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'MAINTENANCE') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'complaints', label: t('nav.complaints'), icon: AlertTriangle, section: 'Maintenance' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'ACCOUNTANT') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard, section: 'Finance' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else if (currentUser.role === 'STUDENT') {
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Portal' },
        { id: 'rooms', label: t('nav.rooms'), icon: Home, section: 'Living' },
        { id: 'attendance', label: t('nav.attendance'), icon: QrCode, section: 'Living' },
        { id: 'leave', label: t('leaves.applyLeave'), icon: Calendar, section: 'Requests' },
        { id: 'complaints', label: t('complaints.raiseComplaint'), icon: AlertTriangle, section: 'Requests' },
        { id: 'visitors', label: t('nav.visitors'), icon: Users, section: 'Requests' },
        { id: 'laundry', label: t('nav.laundry'), icon: Clipboard, section: 'Services' },
        { id: 'mess', label: t('nav.mess'), icon: BookOpen, section: 'Services' },
        { id: 'payments', label: t('nav.payments'), icon: CreditCard, section: 'Services' },
        { id: 'gate_pass', label: t('nav.gatePass'), icon: Shield, section: 'Services' },
        { id: 'hostel_id', label: 'My Hostel ID', icon: CreditCard, section: 'Services' },
        { id: 'notices', label: t('nav.noticeBoard'), icon: Bell, section: 'Updates' },
        { id: 'notifications', label: t('nav.notifications'), icon: Bell, section: 'Updates' },
        { id: 'ai_assistant', label: t('nav.aiAssistant'), icon: Bot, section: 'Updates' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    } else {
      // Fallback
      items.push(
        { id: 'dashboard', label: t('nav.dashboard'), icon: Grid, section: 'Overview' },
        { id: 'profile', label: t('nav.profile'), icon: User, section: 'Account' }
      );
    }

    return (
      <div className="sidebar-menu">
        {items.map((item, idx) => {
          const Icon = item.icon;
          const showSection = item.section && (idx === 0 || items[idx - 1]?.section !== item.section);
          return (
            <React.Fragment key={item.id}>
              {showSection && <div className="sidebar-group-title">{item.section}</div>}
              <button
                className={`sidebar-item ${subView === item.id ? 'active' : ''}`}
                onClick={() => {
                  setSubView(item.id);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          );
        })}
        <button className="sidebar-item" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--danger)' }}>
          <LogOut size={16} />
          <span>{t('common.logout')}</span>
        </button>
      </div>
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
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {/* Top Portal Header */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={20} color="var(--primary)" />
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('qrTerminal.title')}</h1>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
              {t('common.active')}: <strong style={{ color: 'var(--text-main)' }}>{currentUser.email}</strong> ({currentUser.role})
            </p>
          </div>
          <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)' }} onClick={handleLogout}>
            <LogOut size={15} /> {t('nav.logout')}
          </button>
        </div>

        {/* Attendance Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="stat-card">
            <span className="stat-card-title">{t('attendance.today')}</span>
            <div className="stat-card-value">{totalScans}</div>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">{t('qrTerminal.successfulMarkings')}</span>
            <div className="stat-card-value" style={{ color: 'var(--success)' }}>{successScans}</div>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">{t('qrTerminal.duplicateDetections')}</span>
            <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{duplicateScans}</div>
          </div>
          <div className="stat-card">
            <span className="stat-card-title">{t('qrTerminal.scannerEfficiency')}</span>
            <div className="stat-card-value" style={{ color: 'var(--primary)' }}>
              {totalScans > 0 ? `${Math.round((successScans / totalScans) * 100)}%` : '100%'}
            </div>
          </div>
        </div>

        {/* 2-Column Splitter */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Left Column: Viewfinder & Settings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Viewfinder Panel */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('qrTerminal.activeViewfinder')}</h3>
                <span className={`badge ${cameraActive || scannerActive ? 'badge-success' : 'badge-neutral'}`}>
                  {cameraActive || scannerActive ? t('common.active') : t('common.inactive')}
                </span>
              </div>
              
              {/* Scan Box with Real Live Video Camera Stream */}
              <div className={`viewfinder-frame ${cameraActive || scannerActive ? 'active' : ''}`}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover', 
                    display: (cameraActive || scannerActive) ? 'block' : 'none' 
                  }} 
                />
                {!(cameraActive || scannerActive) && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                    <QrCode size={40} style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.8rem' }}>{cameraError || t('camera.unavailable')}</p>
                    <p style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '0.2rem' }}>{t('qrTerminal.qrScanInstruction')}</p>
                  </div>
                )}
                {(cameraActive || scannerActive) && (
                  <div className="viewfinder-guide-corners" />
                )}
              </div>

              {/* Viewfinder Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '320px' }}>
                <button 
                  className={`btn ${(cameraActive || scannerActive) ? 'btn-secondary' : 'btn-primary'}`} 
                  style={{ flex: 1 }} 
                  onClick={() => {
                    if (cameraActive || scannerActive) {
                       stopCameraStream();
                      setScannerActive(false);
                      setScannerStatus('Idle');
                    } else {
                      startCameraStream();
                      setScannerActive(true);
                      setScannerStatus('Ready');
                    }
                  }}
                >
                  <Camera size={15} />
                  {(cameraActive || scannerActive) ? t('common.cancel') : t('camera.openCamera')}
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
                    setFacingMode(nextMode);
                    if (cameraActive || scannerActive) {
                      stopCameraStream();
                      setTimeout(() => startCameraStream(), 200);
                    }
                  }}
                >
                  {facingMode === 'environment' ? 'Rear Cam' : 'Front Cam'}
                </button>
              </div>

              {/* Device Selection */}
              <div style={{ width: '100%', maxWidth: '320px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('camera.openCamera')}</label>
                <select className="form-input" value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)}>
                  <option value="Primary Webcam">Webcam HD (Integrated)</option>
                  <option value="Secondary Cam">Rear Camera (USB Video)</option>
                  <option value="Virtual Device">OBS Virtual Camera</option>
                </select>
              </div>
            </div>

            {/* Attendance Session / Date Overrides Settings */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('qrTerminal.sessionOverride')}</h3>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{t('filters.date')}</label>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="dateMode" 
                      checked={attendanceSettings ? !attendanceSettings.manualDateMode : true}
                      onChange={() => updateAttendanceSettings({ manualDateMode: false, autoDateDetection: true })}
                    />
                    {t('attendance.today')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="dateMode" 
                      checked={attendanceSettings ? attendanceSettings.manualDateMode : false}
                      onChange={() => updateAttendanceSettings({ manualDateMode: true, autoDateDetection: false })}
                    />
                    {t('qrTerminal.manualOverride')}
                  </label>
                </div>
              </div>

              {attendanceSettings?.manualDateMode && (
                <div className="responsive-grid animate-slide-up">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>{t('filters.date')}</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={attendanceSettings?.manualDate ? new Date(attendanceSettings.manualDate).toISOString().slice(0, 10) : ''}
                      onChange={e => updateAttendanceSettings({ manualDate: new Date(e.target.value).toISOString() })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>{t('attendance.session')}</label>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Last Scanned Student View */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '240px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('qrTerminal.lastScannedResult')}</h3>
                <span className={`badge ${
                  scannerStatus === 'Success' ? 'badge-success' : 
                  scannerStatus === 'Error' ? 'badge-warning' : 'badge-info'
                }`}>
                  {scannerStatus.toUpperCase()}
                </span>
              </div>

              {lastScannedStudent ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} className="animate-slide-up">
                  <div style={{ width: '70px', height: '70px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={lastScannedStudent.avatar} alt="Avatar" width="70" height="70" />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{lastScannedStudent.fullName}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('auth.registerNumber')}: {lastScannedStudent.registerNumber}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('hostel.name')}: {lastScannedStudent.hostelName} | {t('rooms.roomNumber')}: {lastScannedStudent.roomNumber}</span>
                    <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${lastScannedStudent.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}`}>
                        {getStatusLabel(lastScannedStudent.status)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: lastScannedStudent.status === 'PRESENT' ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                        {lastScannedStudent.message}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                  <User size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.82rem' }}>{t('qrTerminal.noScanYet')}</p>
                </div>
              )}
            </div>

            {/* Mock Card Swipe Scanner Simulation Block */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('qrTerminal.tokenSimulator')}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {t('qrTerminal.qrScanInstruction')}
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={t('qrTerminal.tokenPlaceholder')}
                  value={manualScanInput}
                  onChange={e => setManualScanInput(e.target.value)}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    handleQRScan(manualScanInput);
                    setManualScanInput('');
                  }}
                  disabled={!scannerActive}
                >
                  {t('qrTerminal.simulateScan')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scan Log History Table */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('attendance.historyTitle')} ({scanHistory.length})</h3>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.78rem' }} onClick={exportHistoryToCSV}>
              <Download size={14} /> {t('common.export')} CSV
            </button>
          </div>
          {scanHistory.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem 0' }}>{t('common.noData')}</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('auth.fullName')}</th>
                    <th>{t('common.room')}</th>
                    <th>{t('attendance.session')}</th>
                    <th>{t('common.time')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('attendance.scannedBy')}</th>
                    <th>{t('common.device')}</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory.map((h, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{h.studentName}</td>
                      <td>{h.roomNumber}</td>
                      <td>{h.session}</td>
                      <td>{h.time}</td>
                      <td>
                        <span className={`badge ${h.status === 'PRESENT' ? 'badge-success' : 'badge-warning'}`}>
                          {getStatusLabel(h.status)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{h.scannedBy}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{h.scannerDevice}</td>
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>

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
      {/* Header / Navbar */}
      <header style={{
        height: '56px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        background: 'var(--bg-surface)',
        position: 'relative',
        zIndex: 50
      }}>
        {/* Logo and Collapsible Side Menu Icon on Mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            className="btn btn-ghost"
            style={{ display: 'none', padding: '0.4rem' }}
            onClick={() => setMobileMenuOpen(true)}
            id="mobile-drawer-toggle"
          >
            <Menu size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setView(currentUser ? 'dashboard' : 'home')}>
            <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={18} color="var(--primary-contrast)" />
            </div>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
              SmartHostel <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.4)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.15)' }}>ERP</span>
            </span>
          </div>
        </div>

        {/* Global Search Bar (Only shown when logged in) */}
        {currentUser && (
          <div style={{ position: 'relative', width: '280px', display: 'flex', alignItems: 'center' }} className="hide-mobile">
            <Search size={15} color="var(--text-subtle)" style={{ position: 'absolute', left: '10px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.1rem', height: '34px', fontSize: '0.82rem' }}
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Header Right Widgets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {(view === 'home' || view === 'login' || view === 'register' || view === 'qr_login') && (
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => setView('home')}>{t('nav.dashboard')}</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => setView('login')}>{t('auth.signIn')}</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }} onClick={() => setView('qr_login')}>{t('nav.qrPortal')}</button>
              <button className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }} onClick={() => setView('register')}>{t('nav.register')}</button>
            </div>
          )}

          {currentUser && (
            <>
              <div 
                style={{ 
                  position: 'relative', 
                  cursor: 'pointer', 
                  padding: '0.45rem', 
                  borderRadius: 'var(--radius-md)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'var(--bg-subtle)' 
                }} 
                onClick={() => setSubView('notifications')}
              >
                <Bell size={16} color="var(--text-muted)" />
                {unreadCount > 0 && (
                  <span style={{ 
                    position: 'absolute', 
                    top: '-2px', 
                    right: '-2px', 
                    minWidth: '15px', 
                    height: '15px', 
                    background: 'var(--danger)', 
                    borderRadius: '50%', 
                    fontSize: '0.62rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#fff', 
                    fontWeight: 700, 
                    padding: '0 2px' 
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-soft)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                  {currentUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.15 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{currentUser.fullName}</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{currentUser.role.replace('_', ' ')}</span>
                </div>
              </div>
            </>
          )}

          {/* Language Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              id="language-selector-btn"
            >
              <Globe size={14} color="var(--primary)" />
              <span>{languages.find(l => l.code === lang)?.nativeName || 'English'}</span>
            </button>

            {langDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-md)',
                  padding: '0.35rem',
                  zIndex: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  minWidth: '140px'
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
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: lang === l.code ? 'var(--primary-soft)' : 'transparent',
                      color: lang === l.code ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: lang === l.code ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      textAlign: 'left',
                      fontFamily: 'inherit'
                    }}
                    onClick={() => {
                      changeLanguage(l.code);
                      setLangDropdownOpen(false);
                    }}
                  >
                    <span>{l.flag}</span>
                    <span style={{ flex: 1 }}>{l.nativeName}</span>
                    {lang === l.code && <Check size={14} color="var(--primary)" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)' }} onClick={toggleTheme} title="Toggle Theme">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer (Collapsible) */}
      <div className={`drawer-overlay ${mobileMenuOpen ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className={`drawer-content ${mobileMenuOpen ? 'active' : ''}`} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{currentUser ? t('common.all') : 'SmartHostel Navigation'}</span>
            <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setMobileMenuOpen(false)}>
              <X size={16} />
            </button>
          </div>
          {currentUser ? renderSidebarContent() : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('home'); setMobileMenuOpen(false); }}
              >
                <Grid size={16} />
                <span>{t('nav.dashboard')}</span>
              </button>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('login'); setMobileMenuOpen(false); }}
              >
                <User size={16} />
                <span>{t('auth.signIn')}</span>
              </button>
              <button 
                className="sidebar-item" 
                onClick={() => { setView('qr_login'); setMobileMenuOpen(false); }}
              >
                <QrCode size={16} />
                <span>{t('nav.qrPortal')}</span>
              </button>
              <button 
                className="btn btn-primary" 
                onClick={() => { setView('register'); setMobileMenuOpen(false); }}
                style={{ width: '100%', marginTop: '0.75rem' }}
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
        <main style={{ flex: 1, padding: '2rem 1.25rem' }}>
          {error && (
            <div style={{
              background: 'var(--danger-soft)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem',
              maxWidth: '640px',
              margin: '0 auto 1.5rem auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <AlertTriangle size={16} color="var(--danger)" />
              <span>{error}</span>
            </div>
          )}

          {/* HOME LANDING VIEW */}
          {view === 'home' && (
            <div className="animate-slide-up hero-container">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1.25rem' }}>
                <Building2 size={13} /> {t('landing.badge')}
              </div>
              <h1 className="hero-title">{t('common.appName')}</h1>
              <p className="hero-subtitle">{t('common.subTitle')}</p>
              
              <div className="hero-buttons">
                <button className="btn btn-primary" style={{ padding: '0.65rem 1.5rem', fontSize: '0.9rem' }} onClick={() => setView('login')}>
                  {t('auth.signIn')} <ArrowRight size={16} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }} onClick={() => setView('qr_login')}>
                  <QrCode size={16} /> {t('nav.qrPortal')}
                </button>
              </div>

              {/* Feature Highlights Grid */}
              <div style={{ alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginTop: '3.5rem', textAlign: 'left' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <QrCode size={18} color="var(--primary)" />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>{t('landing.qrFeatureTitle')}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {t('landing.qrFeatureDesc')}
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--info-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <Calendar size={18} color="var(--info)" />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>{t('landing.leaveFeatureTitle')}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {t('landing.leaveFeatureDesc')}
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--success-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <BookOpen size={18} color="var(--success)" />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>{t('landing.messFeatureTitle')}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {t('landing.messFeatureDesc')}
                  </p>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--warning-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <Shield size={18} color="var(--warning)" />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem' }}>{t('landing.securityFeatureTitle')}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {t('landing.securityFeatureDesc')}
                  </p>
                </div>
              </div>

              {/* Trust Metrics Row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '1.75rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('landing.trustRbac')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('landing.trustRbacDesc')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('landing.trustQr')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('landing.trustQrDesc')}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('landing.trustPwa')}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('landing.trustPwaDesc')}</div>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN VIEW WITH DISTINCT ROLE PORTALS */}
          {view === 'login' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '460px', margin: '2rem auto', padding: '2rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}>{t('loginPortal.title')}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>{t('loginPortal.subtitle')}</p>
              </div>

              {/* 4 Distinct Role Selection Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem', marginBottom: '1.25rem', background: 'var(--bg-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  style={{
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: loginTab === 'STUDENT' ? 'var(--bg-card)' : 'transparent',
                    color: loginTab === 'STUDENT' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: loginTab === 'STUDENT' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => {
                    setLoginTab('STUDENT');
                    setLoginEmail('student@user');
                    setLoginPassword('password123');
                  }}
                >
                  <GraduationCap size={16} />
                  <span>{t('loginPortal.studentRole')}</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: loginTab === 'WARDEN' ? 'var(--bg-card)' : 'transparent',
                    color: loginTab === 'WARDEN' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: loginTab === 'WARDEN' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => {
                    setLoginTab('WARDEN');
                    setLoginEmail('admin@user');
                    setLoginPassword('password123');
                  }}
                >
                  <Shield size={16} />
                  <span>{t('loginPortal.wardenRole')}</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: loginTab === 'WORKER' ? 'var(--bg-card)' : 'transparent',
                    color: loginTab === 'WORKER' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: loginTab === 'WORKER' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => {
                    setLoginTab('WORKER');
                    setLoginEmail('worker@user');
                    setLoginPassword('password123');
                  }}
                >
                  <Wrench size={16} />
                  <span>{t('loginPortal.staffRole')}</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '0.5rem 0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    background: loginTab === 'SUPER_ADMIN' ? 'var(--bg-card)' : 'transparent',
                    color: loginTab === 'SUPER_ADMIN' ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: loginTab === 'SUPER_ADMIN' ? 'var(--shadow-xs)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit'
                  }}
                  onClick={() => {
                    setLoginTab('SUPER_ADMIN');
                    setLoginEmail('superadmin@user');
                    setLoginPassword('password123');
                  }}
                >
                  <Key size={16} />
                  <span>{t('loginPortal.adminRole')}</span>
                </button>
              </div>

              {/* Dynamic Helper callout based on selected login tab */}
              <div style={{ padding: '0.65rem 0.85rem', background: 'var(--primary-soft)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ color: 'var(--primary)', flexShrink: 0 }}>
                  {loginTab === 'STUDENT' && <GraduationCap size={18} />}
                  {loginTab === 'WARDEN' && <Shield size={18} />}
                  {loginTab === 'WORKER' && <Wrench size={18} />}
                  {loginTab === 'SUPER_ADMIN' && <Key size={18} />}
                </div>
                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'block' }}>
                    {loginTab === 'STUDENT' && t('loginPortal.studentBannerTitle')}
                    {loginTab === 'WARDEN' && t('loginPortal.wardenBannerTitle')}
                    {loginTab === 'WORKER' && t('loginPortal.staffBannerTitle')}
                    {loginTab === 'SUPER_ADMIN' && t('loginPortal.adminBannerTitle')}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {loginTab === 'STUDENT' && t('loginPortal.studentBannerDesc')}
                    {loginTab === 'WARDEN' && t('loginPortal.wardenBannerDesc')}
                    {loginTab === 'WORKER' && t('loginPortal.staffBannerDesc')}
                    {loginTab === 'SUPER_ADMIN' && t('loginPortal.adminBannerDesc')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    {loginTab === 'STUDENT' ? t('loginPortal.studentEmailLabel') : loginTab === 'WARDEN' ? t('loginPortal.wardenEmailLabel') : loginTab === 'WORKER' ? t('loginPortal.staffEmailLabel') : t('loginPortal.adminEmailLabel')}
                  </label>
                  <input className="form-input" type="text" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.password')}</label>
                  <input className="form-input" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.65rem', fontSize: '0.88rem', fontWeight: 600, marginTop: '0.25rem' }}>
                  {t('auth.signIn')} ({loginTab === 'STUDENT' ? t('loginPortal.studentRole') : loginTab === 'WARDEN' ? t('loginPortal.wardenRole') : loginTab === 'WORKER' ? t('loginPortal.staffRole') : t('loginPortal.adminRole')})
                </button>
              </form>
            </div>
          )}

          {/* QR ATTENDANCE LOGIN VIEW */}
          {view === 'qr_login' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '420px', margin: '2.5rem auto', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <QrCode size={22} color="var(--primary)" />
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{t('nav.qrPortal')}</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>{t('auth.loginTitle')}</p>
              <form onSubmit={handleQRLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.email')}</label>
                  <input className="form-input" type="text" value={qrPortalEmail} onChange={e => setQrPortalEmail(e.target.value)} placeholder="warden@user or admin@user" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>{t('auth.password')}</label>
                  <input className="form-input" type="password" value={qrPortalPassword} onChange={e => setQrPortalPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.65rem' }}>
                  <Shield size={16} /> {t('auth.signIn')}
                </button>
              </form>
            </div>
          )}

          {/* REGISTER VIEW */}
          {view === 'register' && (
            <div className="glass-panel animate-slide-up" style={{ maxWidth: '640px', margin: '1.5rem auto', padding: '2rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.25rem' }}>{t('auth.registerBtn')}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>{t('auth.pendingApproval')}</p>

              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.role')}</label>
                    <select className="form-input" value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}>
                      <option value="STUDENT">Student</option>
                      <option value="WARDEN">Warden</option>
                      <option value="WORKER">Worker</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="HOSTEL_ADMIN">Hostel Admin</option>
                      <option value="ASSISTANT_WARDEN">Assistant Warden</option>
                      <option value="MESS_MANAGER">Mess Manager</option>
                      <option value="SECURITY">Security</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.fullName')}</label>
                    <input className="form-input" type="text" value={regFullName} onChange={e => setRegFullName(e.target.value)} placeholder="John Doe" required />
                  </div>
                </div>

                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.email')}</label>
                    <input className="form-input" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="john@example.com" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.password')}</label>
                    <input className="form-input" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimum 8 characters" required />
                  </div>
                </div>

                <div className="responsive-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.mobile')}</label>
                    <input className="form-input" type="tel" value={regMobile} onChange={e => setRegMobile(e.target.value)} placeholder="10 Digit Number" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.selectHostel')}</label>
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
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.college')}</label>
                        <input className="form-input" type="text" value={regCollege} onChange={e => setRegCollege(e.target.value)} placeholder="College name" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.department')}</label>
                        <input className="form-input" type="text" value={regDept} onChange={e => setRegDept(e.target.value)} placeholder="CSE, ECE etc" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.year')}</label>
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
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.registerNumber')}</label>
                        <input className="form-input" type="text" value={regNumber} onChange={e => setRegNumber(e.target.value)} placeholder="Reg No" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.parentName')}</label>
                        <input className="form-input" type="text" value={regParentName} onChange={e => setRegParentName(e.target.value)} placeholder="Parent's Name" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.parentMobile')}</label>
                        <input className="form-input" type="tel" value={regParentMobile} onChange={e => setRegParentMobile(e.target.value)} placeholder="Parent's Mobile" />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.address')}</label>
                  <textarea className="form-input" value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Full street address..." rows={2}></textarea>
                </div>

                <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '0.65rem' }}>{t('auth.registerBtn')}</button>
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
            {renderSidebarContent()}
          </aside>

          {/* Main Content Area */}
          <main className="main-content">

            {/* Active Emergency Alert Banner Overlay */}
            {emergencyAlertsList.filter(a => a.status === 'ACTIVE').length > 0 && (
              <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <ShieldAlert size={22} color="var(--danger)" />
                  <div>
                    <h4 style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.9rem' }}>
                      {t('emergency.activeAlerts')} ({emergencyAlertsList.filter(a => a.status === 'ACTIVE').length})
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {emergencyAlertsList.find(a => a.status === 'ACTIVE')?.type} emergency reported in {emergencyAlertsList.find(a => a.status === 'ACTIVE')?.hostel?.name || 'Hostel'} (Room {emergencyAlertsList.find(a => a.status === 'ACTIVE')?.roomNumber || 'N/A'})
                    </p>
                  </div>
                </div>
                {currentUser && ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY', 'WARDEN'].includes(currentUser.role) && (
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', borderColor: 'var(--danger-border)', color: 'var(--danger)', padding: '0.35rem 0.75rem' }} onClick={() => setSubView('emergencies')}>
                    View Details
                  </button>
                )}
              </div>
            )}

            {/* Notification Permission Card (Prompt when permission is default) */}
            {currentUser && pushPermissionStatus === 'default' && !dismissPushBanner && (
              <div className="glass-panel animate-slide-up" style={{ padding: '0.85rem 1.25rem', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BellRing size={20} color="var(--primary)" />
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '0.85rem' }}>Enable Emergency Push Notifications</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Receive emergency alerts on your device even when this app is backgrounded or closed.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={registerPushNotifications}>
                    Enable Alerts
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setDismissPushBanner(true)} title="Dismiss">
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Floating Student Emergency Trigger Button */}
            {currentUser && currentUser.role === 'STUDENT' && (
              <div className="floating-emergency-btn">
                <button
                  className="btn btn-danger"
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    borderRadius: '999px',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    minHeight: '44px'
                  }}
                  onClick={() => setShowEmergencyModal(true)}
                >
                  <ShieldAlert size={18} /> {t('emergency.sendAlert')}
                </button>
              </div>
            )}

            {/* 1. ROLE DASHBOARDS */}
            {subView === 'dashboard' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="flex-responsive-header">
                  <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{t('dashboard.welcome', { name: currentUser.fullName })}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{t('dashboard.roleBadge', { role: currentUser.role.replace('_', ' ') })}</p>
                  </div>
                  <span className="badge badge-success" style={{ padding: '0.5rem 1rem' }}>{t('common.active')}</span>
                </div>

                {currentUser.role === 'STUDENT' ? (
                  /* STUDENT DASHBOARD (PRESERVED) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

                    <div className="dashboard-layout-grid">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('dashboard.quickActions')}</h3>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
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
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bell size={18} color="var(--primary)" /> {t('dashboard.recentAnnouncements')}
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
                ) : (
                  /* UPGRADED ADMIN DATA ANALYTICS DASHBOARD */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* GLOBAL FILTERS */}
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', background: 'var(--bg-subtle)' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Date</span>
                        <input className="form-input" style={{ height: '36px', width: '140px', padding: '0.4rem' }} type="date" value={dashFilterDate} onChange={e => setDashFilterDate(e.target.value)} />
                      </div>
                      
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Hostel Facility</span>
                        <select className="form-input" style={{ height: '36px', width: '160px', padding: '0.4rem' }} value={dashFilterHostelId} onChange={e => setDashFilterHostelId(e.target.value)}>
                          <option value="">All Hostels</option>
                          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Block</span>
                        <input className="form-input" style={{ height: '36px', width: '90px', padding: '0.4rem' }} type="text" placeholder="Block" value={dashFilterBlock} onChange={e => setDashFilterBlock(e.target.value)} />
                      </div>

                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Floor</span>
                        <input className="form-input" style={{ height: '36px', width: '80px', padding: '0.4rem' }} type="number" placeholder="Floor" value={dashFilterFloor} onChange={e => setDashFilterFloor(e.target.value)} />
                      </div>

                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', marginTop: '12px' }}>
                        <button className="btn btn-secondary" style={{ height: '36px', padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => {
                          setDashFilterDate(new Date().toISOString().split('T')[0]);
                          setDashFilterHostelId('');
                          setDashFilterBlock('');
                          setDashFilterFloor('');
                        }}>Clear Filters</button>
                      </div>
                    </div>

                    {/* Needs Attention Alert List */}
                    {adminStats?.needsAttention && adminStats.needsAttention.length > 0 && (
                      <div className="glass-panel" style={{ padding: '1.25rem', border: '1px solid var(--warning-border)', background: 'var(--warning-soft)' }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          <AlertTriangle size={16} /> {t('dashboard.needsAttention')}
                        </h4>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {adminStats.needsAttention.map((item: any, idx: number) => (
                            <button
                              key={idx}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-surface)' }}
                              onClick={() => setSubView(item.type)}
                            >
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }} />
                              <span>{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isAdminStatsLoading ? (
                      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
                    ) : !adminStats ? (
                      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>No analytics data loaded.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* 1. OVERVIEW KPI SECTION */}
                        <div className="dashboard-grid">
                          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dashboard.totalStudents')}</span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {adminStats.overview.totalStudents}
                            </h3>
                          </div>
                          
                          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dashboard.occupancy')}</span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {adminStats.overview.occupancyRate}%
                            </h3>
                          </div>

                          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dashboard.availableBeds')}</span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {adminStats.overview.availableBeds} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {adminStats.overview.totalBeds} total</span>
                            </h3>
                          </div>

                          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('attendance.today')}</span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {adminStats.overview.todayAttendanceRate}%
                            </h3>
                          </div>

                          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dashboard.openComplaints')}</span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {adminStats.overview.openComplaints}
                            </h3>
                          </div>

                          <div className="glass-panel stat-card" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('dashboard.activeWorkers')}</span>
                            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                              {adminStats.overview.activeWorkers}
                            </h3>
                          </div>
                        </div>

                        {/* SECTION 2: ATTENDANCE TREND & BREAKDOWN */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('attendance.title')} Trend (Last 7 Days)</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {adminStats.attendance.trend.map((t: any, idx: number) => {
                                const total = t.present + t.absent;
                                const rate = total > 0 ? Math.round((t.present / total) * 100) : 0;
                                return (
                                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div className="flex-responsive-between" style={{ fontSize: '0.75rem' }}>
                                      <span>{new Date(t.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}</span>
                                      <strong>{t.present} Present ({rate}%)</strong>
                                    </div>
                                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                      <div style={{ height: '100%', background: 'var(--primary)', width: `${rate}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Attendance Summary</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <div className="flex-responsive-between">
                                  <span style={{ color: 'var(--text-muted)' }}>Present Today</span>
                                  <strong style={{ color: 'var(--success)' }}>{adminStats.attendance.summary.present}</strong>
                                </div>
                                <div className="flex-responsive-between">
                                  <span style={{ color: 'var(--text-muted)' }}>Absent Today</span>
                                  <strong style={{ color: 'var(--danger)' }}>{adminStats.attendance.summary.absent}</strong>
                                </div>
                                <div className="flex-responsive-between">
                                  <span style={{ color: 'var(--text-muted)' }}>Attendance rate</span>
                                  <strong>{adminStats.attendance.summary.rate}%</strong>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '1.5rem' }}>
                              <div style={{ height: '100%', background: 'var(--primary)', width: `${adminStats.attendance.summary.rate}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: OCCUPANCY ANALYTICS */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.occupancyStats')}</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {adminStats.occupancy.hostelWise.map((h: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div className="flex-responsive-between" style={{ fontSize: '0.78rem' }}>
                                    <span>{h.hostelName}</span>
                                    <strong>{h.occupied} / {h.total} Beds ({h.percentage}%)</strong>
                                  </div>
                                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'var(--primary)', width: `${h.percentage}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>Room Distribution</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('dashboard.vacantRooms')}</span>
                                <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--primary)' }}>
                                  {adminStats.occupancy.roomDistribution.vacant}
                                </h4>
                              </div>
                              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('dashboard.partiallyOccupied')}</span>
                                <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#f59e0b' }}>
                                  {adminStats.occupancy.roomDistribution.partially}
                                </h4>
                              </div>
                              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('dashboard.fullyOccupied')}</span>
                                <h4 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text-main)' }}>
                                  {adminStats.occupancy.roomDistribution.fully}
                                </h4>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 4: COMPLAINTS & WORKER WORKLOADS */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <div className="flex-responsive-between" style={{ marginBottom: '1rem', alignItems: 'center' }}>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{t('dashboard.complaintStats')}</h3>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {t('dashboard.avgResolution')}: <strong>{adminStats.complaints.avgResolutionTime} hrs</strong>
                              </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                              <div>
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Status Breakdown</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                                  <div className="flex-responsive-between">
                                    <span>Pending</span>
                                    <strong>{adminStats.complaints.statusCounts.PENDING}</strong>
                                  </div>
                                  <div className="flex-responsive-between">
                                    <span>Assigned</span>
                                    <strong>{adminStats.complaints.statusCounts.ASSIGNED}</strong>
                                  </div>
                                  <div className="flex-responsive-between">
                                    <span>In Progress</span>
                                    <strong>{adminStats.complaints.statusCounts.IN_PROGRESS}</strong>
                                  </div>
                                  <div className="flex-responsive-between">
                                    <span>Resolved</span>
                                    <strong>{adminStats.complaints.statusCounts.RESOLVED}</strong>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>By Category</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                                  {adminStats.complaints.categoryCounts.slice(0, 4).map((c: any, idx: number) => (
                                    <div key={idx} className="flex-responsive-between">
                                      <span>{c.name}</span>
                                      <strong>{c.value}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.workerStats')}</h3>
                            <div className="table-wrapper" style={{ maxHeight: '170px', overflowY: 'auto' }}>
                              <table className="table" style={{ fontSize: '0.78rem' }}>
                                <thead>
                                  <tr>
                                    <th>Worker</th>
                                    <th>{t('dashboard.assigned')}</th>
                                    <th>{t('dashboard.inProgress')}</th>
                                    <th>{t('dashboard.completed')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {adminStats.workers.workloads.length === 0 ? (
                                    <tr>
                                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No workers loaded.</td>
                                    </tr>
                                  ) : (
                                    adminStats.workers.workloads.map((w: any, idx: number) => (
                                      <tr key={idx}>
                                        <td><strong>{w.workerName}</strong></td>
                                        <td>{w.assigned}</td>
                                        <td>{w.inProgress}</td>
                                        <td style={{ color: 'var(--success)' }}>{w.completed}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 5: MESS, LAUNDRY, LEAVE & EMERGENCIES */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                          {/* Mess Analytics */}
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.messStats')} (Today)</h3>
                            {adminStats.mess.mealWise.length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No active meal demand logs.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
                                {adminStats.mess.mealWise.map((meal: any, idx: number) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                    <div>
                                      <strong>{t(`mess.${meal.type.toLowerCase()}`)}</strong>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Menu: {meal.menu}</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{meal.taking} expected</span>
                                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{meal.skipped} skipped ({meal.skipRate}%)</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Laundry Stats */}
                          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.laundryStats')} (Today)</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                                <div className="flex-responsive-between">
                                  <span style={{ color: 'var(--text-muted)' }}>Booked Slots</span>
                                  <strong>{adminStats.laundry.booked}</strong>
                                </div>
                                <div className="flex-responsive-between">
                                  <span style={{ color: 'var(--text-muted)' }}>Completed Slots</span>
                                  <strong>{adminStats.laundry.completed}</strong>
                                </div>
                                <div className="flex-responsive-between">
                                  <span style={{ color: 'var(--text-muted)' }}>Utilization Rate</span>
                                  <strong>{adminStats.laundry.utilization}%</strong>
                                </div>
                              </div>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginTop: '1rem' }}>
                              <div style={{ height: '100%', background: 'var(--primary)', width: `${adminStats.laundry.utilization}%` }} />
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                          {/* Leave & Visitors */}
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.leaveStats')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.8rem' }}>
                              <div>
                                <h4 style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Leaves Today</h4>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Pending</span>
                                  <strong>{adminStats.leave.pending}</strong>
                                </div>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Approved</span>
                                  <strong style={{ color: 'var(--success)' }}>{adminStats.leave.approved}</strong>
                                </div>
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Visitors Today</h4>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Total Logged</span>
                                  <strong>{adminStats.visitors.today}</strong>
                                </div>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Inside Facility</span>
                                  <strong style={{ color: 'var(--warning)' }}>{adminStats.visitors.inside}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Emergencies & Payments */}
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.emergencyStats')} & {t('dashboard.paymentStats')}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.8rem' }}>
                              <div>
                                <h4 style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Alert Status</h4>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Active Warnings</span>
                                  <strong style={{ color: 'var(--danger)' }}>{adminStats.emergency.active}</strong>
                                </div>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Resolved Alerts</span>
                                  <strong style={{ color: 'var(--success)' }}>{adminStats.emergency.resolved}</strong>
                                </div>
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Fee Collection</h4>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Paid amount</span>
                                  <strong style={{ color: 'var(--success)' }}>${adminStats.payments.paid.toLocaleString()}</strong>
                                </div>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Pending amount</span>
                                  <strong style={{ color: 'var(--warning)' }}>${adminStats.payments.pending.toLocaleString()}</strong>
                                </div>
                                <div className="flex-responsive-between" style={{ paddingBottom: '0.35rem' }}>
                                  <span>Collection rate</span>
                                  <strong>{adminStats.payments.rate}%</strong>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 6: RECENT ACTIVITY TIMELINE */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem' }}>{t('dashboard.recentActivity')}</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {adminStats.recentActivities.length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No recent activities logged.</p>
                            ) : (
                              adminStats.recentActivities.map((act: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.82rem', alignItems: 'center' }}>
                                  <Clock size={14} color="var(--text-muted)" />
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                    {new Date(act.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span style={{ color: 'var(--text-main)' }}>{act.text}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. QR ATTENDANCE MODULE */}
            {subView === 'attendance' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('attendance.title')}</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Student Left Card: 5-Minute Temporary Attendance QR Generator */}
                    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('attendance.generateQr')}</h3>

                      {(() => {
                        const todayAttendanceRecord = attendanceHistory.find(a => 
                          (a.userId === currentUser.id || a.user?.id === currentUser.id) && 
                          new Date(a.date).toDateString() === new Date().toDateString() && 
                          a.isPresent
                        );

                        if (todayAttendanceRecord) {
                          return (
                            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', padding: '0.75rem 0', width: '100%' }}>
                              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-soft)', border: '1px solid var(--success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={32} color="var(--success)" />
                              </div>
                              <div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)' }}>{t('attendance.todayStatus')}</h4>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  {t('attendance.checkIn')}: <strong style={{ color: 'var(--text-main)' }}>{todayAttendanceRecord.checkInTime ? new Date(todayAttendanceRecord.checkInTime).toLocaleTimeString() : t('common.completed')}</strong>
                                </p>
                                {todayAttendanceRecord.checkOutTime && (
                                  <p style={{ fontSize: '0.78rem', color: 'var(--success)', marginTop: '0.15rem' }}>
                                    {t('attendance.checkOut')}: <strong>{new Date(todayAttendanceRecord.checkOutTime).toLocaleTimeString()}</strong>
                                  </p>
                                )}
                              </div>
                              <span className="badge badge-success">{t('tables.status')}: {t('common.active')}</span>
                              <button className="btn btn-secondary" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }} onClick={handleGenerateStudentQR}>
                                <QrCode size={14} /> {t('attendance.generateQr')}
                              </button>
                            </div>
                          );
                        }

                        if (tempQrData && qrCountdownSeconds > 0) {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', width: '100%' }}>
                              {/* QR Code Container with Real Scannable QRCodeSVG */}
                              <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: '190px', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: 'var(--shadow-xs)' }}>
                                <QRCodeSVG 
                                  value={tempQrData.qrString || JSON.stringify(tempQrData)} 
                                  size={165} 
                                  level="H" 
                                  includeMargin={false}
                                />
                              </div>

                              {/* Countdown Timer & Reference Pill */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }}>
                                <span className="badge badge-success" style={{ fontSize: '0.82rem', padding: '0.3rem 0.75rem' }}>
                                  {t('attendance.qrValidFor', {
                                    time: `${String(Math.floor(qrCountdownSeconds / 60)).padStart(2, '0')}:${String(qrCountdownSeconds % 60).padStart(2, '0')}`
                                  })}
                                </span>
                                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '0.2rem' }}>
                                  {t('attendance.refCode', { code: tempQrData.referenceCode })}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {t('attendance.locCode', { code: tempQrData.locationCode })}
                                </div>
                              </div>

                              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {t('attendance.qrValidFor', { time: '5m' })}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <QrCode size={36} color="var(--primary)" />
                            </div>
                            {qrCountdownSeconds === 0 && tempQrData && (
                              <span className="badge badge-danger">{t('attendance.qrExpired')}</span>
                            )}
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {tempQrData ? t('attendance.qrExpiredMsg') : t('attendance.generateQr')}
                            </p>
                            <button className="btn btn-primary" style={{ width: '100%', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }} onClick={handleGenerateStudentQR}>
                              <QrCode size={16} /> {t('attendance.generateQr')}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Student Right Card: logs */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem' }}>{t('attendance.historyTitle')}</h3>
                      <div className="table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table className="table">
                          <thead>
                            <tr>
                              <th>{t('tables.date')}</th>
                              <th>{t('tables.status')}</th>
                              <th>{t('attendance.checkIn')}</th>
                              <th>{t('attendance.checkOut')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceHistory.map(log => (
                              <tr key={log.id}>
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

                {/* Warden / Admin controls: QR scanner launcher, manual mark and live logs */}
                {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN', 'SECURITY'].includes(currentUser.role) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* QR Scanner Quick Action Banner */}
                    <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderLeft: '3px solid var(--primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <QrCode size={20} color="var(--primary)" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t('qrTerminal.title')}</h3>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('qrTerminal.qrScanInstruction')}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" onClick={() => { setShowQRScanner(true); startCameraStream(); }}>
                          <Camera size={15} /> {t('attendance.scanQr')}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setIsQrScannerPortal(true)}>
                          <QrCode size={15} /> {t('nav.qrPortal')}
                        </button>
                      </div>
                    </div>

                    <div className="responsive-grid-1-2">
                      {/* Manual Form */}
                      <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('attendance.markManual')}</h3>
                        <form onSubmit={handleManualAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('students.studentName')}</label>
                            <input className="form-input" type="text" placeholder={t('auth.email')} value={manualStudentId} onChange={e => setManualStudentId(e.target.value)} required />
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
                        <div className="table-wrapper" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                  </div>
                )}

                {/* SUPER ADMIN OR WARDEN / ADMIN: Settings and Sessions Controls */}
                {currentUser && ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN'].includes(currentUser.role) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '2rem' }} className="animate-slide-up">
                    
                    {/* Settings Panel */}
                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{t('settings.title')}</h3>
                      {attendanceSettings ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.enableQrAttendance} 
                              onChange={e => updateAttendanceSettings({ enableQrAttendance: e.target.checked })} 
                            />
                            {t('attendance.title')}
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.enableCheckIn} 
                              onChange={e => updateAttendanceSettings({ enableCheckIn: e.target.checked })} 
                            />
                            {t('attendance.checkIn')}
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.enableCheckOut} 
                              onChange={e => updateAttendanceSettings({ enableCheckOut: e.target.checked })} 
                            />
                            {t('attendance.checkOut')}
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                            <input 
                              type="checkbox" 
                              checked={attendanceSettings.allowMultipleSessions} 
                              onChange={e => updateAttendanceSettings({ allowMultipleSessions: e.target.checked })} 
                            />
                            {t('attendance.session')}
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
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
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('common.loading')}</p>
                      )}
                    </div>

                    {/* Sessions CRUD Panel */}
                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>{t('attendance.session')}</h3>
                      
                      {/* Create Form */}
                      {currentUser.role === 'SUPER_ADMIN' && (
                        <form onSubmit={handleCreateSession} style={{ display: 'flex', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder={t('attendance.session')} 
                            value={newSessionName} 
                            onChange={e => setNewSessionName(e.target.value)} 
                            required 
                          />
                          <button className="btn btn-primary" type="submit">{t('common.add')}</button>
                        </form>
                      )}

                      {/* Sessions List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                        {attendanceSessions.map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                            {editingSessionId === s.id ? (
                              <div style={{ display: 'flex', gap: '0.25rem', width: '100%' }}>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ height: '32px' }} 
                                  value={editingSessionName} 
                                  onChange={e => setEditingSessionName(e.target.value)} 
                                />
                                <button className="btn btn-primary" style={{ padding: '0 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateSession(s.id, editingSessionName, s.isActive)}>{t('common.save')}</button>
                                <button className="btn btn-secondary" style={{ padding: '0 0.5rem', fontSize: '0.75rem' }} onClick={() => setEditingSessionId(null)}>{t('common.cancel')}</button>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <strong style={{ fontSize: '0.85rem' }}>{s.name}</strong>
                                  <span style={{ fontSize: '0.7rem', color: s.isActive ? '#10b981' : '#ef4444', marginLeft: '0.5rem' }}>
                                    {s.isActive ? t('common.active') : t('common.inactive')}
                                  </span>
                                </div>
                                {currentUser.role === 'SUPER_ADMIN' && (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} 
                                      onClick={() => { setEditingSessionId(s.id); setEditingSessionName(s.name); }}
                                    >
                                      {t('common.edit')}
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: '#ef4444' }} 
                                      onClick={() => handleDeleteSession(s.id)}
                                    >
                                      {t('common.delete')}
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('leaves.title')}</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Apply Form */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('leaves.applyLeave')}</h3>
                      <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('leaves.startDate')}</label>
                          <input className="form-input" type="date" value={leaveStartDate} onChange={e => setLeaveStartDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('leaves.endDate')}</label>
                          <input className="form-input" type="date" value={leaveEndDate} onChange={e => setLeaveEndDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('leaves.reason')}</label>
                          <textarea className="form-input" placeholder={t('leaves.reason')} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} required rows={3}></textarea>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{t('leaves.submitRequest')}</button>
                      </form>
                    </div>

                    {/* Leave History */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('leaves.history')}</h3>
                      <div className="table-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <th style={{ padding: '0.75rem 0' }}>{t('tables.date')}</th>
                              <th>{t('leaves.reason')}</th>
                              <th>{t('tables.status')}</th>
                              <th>{t('leaves.remarks')}</th>
                              <th>{t('tables.actions')}</th>
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
                                      {t('common.cancel')}
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
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('leaves.pending')}</h3>
                    <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <th style={{ padding: '0.75rem' }}>{t('tables.name')}</th>
                            <th>{t('tables.date')}</th>
                            <th>{t('leaves.reason')}</th>
                            <th>{t('tables.status')}</th>
                            <th>{t('leaves.remarks')}</th>
                            <th>{t('tables.actions')}</th>
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
                                      placeholder={t('leaves.remarks')}
                                      value={activeLeaveIdForRemarks === leave.id ? remarksText : ''}
                                      onChange={e => {
                                        setActiveLeaveIdForRemarks(leave.id);
                                        setRemarksText(e.target.value);
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLeaveStatus(leave.id, 'APPROVED')}>
                                        {t('common.approved')}
                                      </button>
                                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleUpdateLeaveStatus(leave.id, 'REJECTED')}>
                                        {t('common.rejected')}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('common.completed')}</span>
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('complaints.title')}</h2>

                {/* Complaint form (For Students) */}
                {currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('complaints.raiseComplaint')}</h3>
                    <form onSubmit={handleCreateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <input className="form-input" type="text" value={compTitle} onChange={e => setCompTitle(e.target.value)} placeholder={t('complaints.complaintTitle')} required />
                        <select className="form-input" value={compCategory} onChange={e => setCompCategory(e.target.value)}>
                          {workerCategories.length > 0 ? (
                            workerCategories.map((cat: any) => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))
                          ) : (
                            <>
                              <option value="Plumbing">{t('complaints.plumbing')}</option>
                              <option value="Electrical">{t('complaints.electrical')}</option>
                              <option value="Carpentry">{t('complaints.carpentry')}</option>
                              <option value="Cleaning">{t('complaints.cleaning')}</option>
                              <option value="AC Technician">AC Technician</option>
                              <option value="Internet">{t('complaints.wifi')}</option>
                              <option value="Other">{t('emergency.other')}</option>
                            </>
                          )}
                        </select>
                        <select className="form-input" value={compPriority} onChange={e => setCompPriority(e.target.value)}>
                          <option value="LOW">{t('complaints.low')}</option>
                          <option value="MEDIUM">{t('complaints.medium')}</option>
                          <option value="HIGH">{t('complaints.high')}</option>
                        </select>
                      </div>

                      <textarea className="form-input" rows={3} value={compDesc} onChange={e => setCompDesc(e.target.value)} placeholder={t('complaints.description')} required />

                      {/* LIVE CAMERA CAPTURE ONLY FOR COMPLAINT EVIDENCE */}
                      <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Camera size={16} color="var(--primary)" /> {t('complaints.evidence')}
                        </label>
                        {compEvidencePhoto ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <img src={compEvidencePhoto} alt="Captured Evidence" style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--primary)' }} />
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCameraCaptureModal(true)} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
                              <Camera size={14} /> {t('camera.retake')}
                            </button>
                          </div>
                        ) : (
                          <div>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCameraCaptureModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Camera size={18} color="var(--primary)" /> {t('camera.openCamera')}
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.35rem' }}>
                              * Security Policy: Live camera capture is required for verified maintenance requests.
                            </span>
                          </div>
                        )}
                      </div>

                      <button className="btn btn-primary" type="submit" style={{ padding: '0.75rem' }}>{t('complaints.submit')}</button>
                    </form>
                  </div>
                )}


                {/* Grievance list */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('complaints.title')}</h3>
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {filteredComplaints.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
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
                              }`}>{c.priority}</span>
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
                              <div style={{ fontWeight: 700, color: '#10b981' }}>✓ {t('worker.completeWork')}</div>
                              <div style={{ marginTop: '0.2rem', color: 'var(--text-main)' }}>{t('worker.workDone')}: {c.completionNotes || t('common.completed')}</div>
                              {c.materialsUsed && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('worker.materialsUsed')}: {c.materialsUsed}</div>}
                            </div>
                          )}

                          {/* Action Toolbar */}
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                            {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (c.status === 'PENDING' || c.status === 'REJECTED') && (
                              <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedComplaintForAssign(c); setShowAssignWorkerModal(true); }}>
                                <Wrench size={13} /> {t('complaints.assignWorker')}
                              </button>
                            )}

                            {currentUser.role === 'STUDENT' && c.status === 'COMPLETED' && (
                              <>
                                <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: 'var(--success)' }} onClick={() => { setSelectedComplaintForConfirm(c); setShowConfirmResolutionModal(true); }}>
                                  <Check size={13} /> {t('complaints.confirm')}
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--warning)' }} onClick={() => { setSelectedComplaintForReopen(c); setShowReopenModal(true); }}>
                                  <AlertTriangle size={13} /> {t('common.reopened')}
                                </button>
                              </>
                            )}

                            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={() => { setSelectedComplaintTimeline(c); setShowTimelineModal(true); }}>
                              <Clock size={14} /> {t('complaints.timeline')}
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
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('visitors.title')}</h2>

                {currentUser.role === 'STUDENT' && (
                  <div className="responsive-grid-1-2">
                    {/* Request Form */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('visitors.createRequest')}</h3>
                      <form onSubmit={handleCreateVisitor} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('visitors.visitorName')}</label>
                          <input className="form-input" type="text" placeholder={t('visitors.name')} value={visName} onChange={e => setVisName(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('visitors.purpose')}</label>
                          <input className="form-input" type="text" placeholder={t('visitors.purpose')} value={visPurpose} onChange={e => setVisPurpose(e.target.value)} required />
                        </div>
                        <div className="responsive-grid">
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('visitors.visitDate')}</label>
                            <input className="form-input" type="date" value={visDate} onChange={e => setVisDate(e.target.value)} required />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('visitors.expectedArrival')}</label>
                            <input className="form-input" type="time" value={visitorExpectedArrival} onChange={e => setVisitorExpectedArrival(e.target.value)} />
                          </div>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%' }}>{t('visitors.registerVisitor')}</button>
                      </form>
                    </div>

                    {/* Student Passes List */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('visitors.history')}</h3>
                      <div style={{ display: 'grid', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
                        {filteredVisitors.map(v => (
                          <div key={v.id} className="flex-responsive-between" style={{
                            padding: '1rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            alignItems: 'center'
                          }}>
                            <div>
                              <h4 style={{ fontWeight: 700 }}>{v.name}</h4>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{t('visitors.purpose')}: {v.purpose} | {new Date(v.visitDate).toLocaleDateString()}</p>
                              {v.expectedArrivalTime && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('visitors.expectedArrival')}: {new Date(v.expectedArrivalTime).toLocaleTimeString()}</p>}
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
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('visitors.title')}</h3>
                    <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <th style={{ padding: '0.75rem' }}>{t('visitors.visitorName')}</th>
                            <th>{t('visitors.purpose')}</th>
                            <th>{t('tables.status')}</th>
                            <th>{t('visitors.visitDate')}</th>
                            <th>{t('tables.actions')}</th>
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
                                      {t('common.approved')}
                                    </button>
                                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleUpdateVisitorStatus(v.id, 'REJECTED')}>
                                      {t('common.rejected')}
                                    </button>
                                  </div>
                                ) : v.status === 'APPROVED' ? (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {!v.checkInTime ? (
                                      <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUpdateVisitorStatus(v.id, 'APPROVED', true, false)}>
                                        {t('visitors.checkIn')}
                                      </button>
                                    ) : !v.checkOutTime ? (
                                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleUpdateVisitorStatus(v.id, 'APPROVED', false, true)}>
                                        {t('visitors.checkOut')}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('common.completed')}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('common.rejected')}</span>
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
                  <Bot size={22} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{t('ai.title')}</h2>
                </div>

                {/* Quick Question Chips */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[
                    t('ai.askAttendance'),
                    t('ai.askMenu'),
                    t('ai.askLeave'),
                    t('ai.askFees'),
                    t('ai.askRoom')
                  ].map((q, idx) => (
                    <button key={idx} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: '999px' }}
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
                      placeholder={t('ai.placeholder')}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button className="btn btn-primary" type="submit" style={{ padding: '0 1.25rem' }} disabled={aiTyping}>{t('ai.send')}</button>
                  </form>
                </div>
              </div>
            )}

            {/* 7. OTHER PLACEHOLDER SIDEBAR VIEWS TO PREVENT SIDEBAR CRASHES */}
            {subView === 'hostels' && currentUser?.role === 'SUPER_ADMIN' && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Home size={22} color="var(--primary)" />
                      <span>Hostel Management</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Configure hostels, blocks, capacities, warden details and gender categories.</p>
                  </div>
                </div>

                {/* Add Hostel Form */}
                <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-secondary)' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem' }}>{t('hostel.addHostel')}</h4>
                  <form onSubmit={handleCreateHostel} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <input className="form-input" type="text" value={newHostelName} onChange={e => setNewHostelName(e.target.value)} placeholder={`${t('hostel.name')} *`} required />
                    <input className="form-input" type="text" value={newHostelCode} onChange={e => setNewHostelCode(e.target.value)} placeholder={`${t('hostel.code')} (e.g. H1) *`} required />
                    <input className="form-input" type="text" value={newHostelCollege} onChange={e => setNewHostelCollege(e.target.value)} placeholder={`${t('hostel.collegeName')} *`} required />
                    <input className="form-input" type="text" value={newHostelAddress} onChange={e => setNewHostelAddress(e.target.value)} placeholder={`${t('hostel.address')} *`} required />
                    <input className="form-input" type="number" value={newHostelCapacity} onChange={e => setNewHostelCapacity(e.target.value)} placeholder={t('hostel.capacity')} required />
                    <select className="form-input" value={newHostelGender} onChange={e => setNewHostelGender(e.target.value)}>
                      <option value="MIXED">Gender: Mixed</option>
                      <option value="MALE">Gender: Male Only</option>
                      <option value="FEMALE">Gender: Female Only</option>
                    </select>
                    <input className="form-input" type="tel" value={newHostelPhone} onChange={e => setNewHostelPhone(e.target.value)} placeholder="Contact Phone" />
                    <input className="form-input" type="email" value={newHostelEmail} onChange={e => setNewHostelEmail(e.target.value)} placeholder="Contact Email" />
                    <select className="form-input" value={newHostelWardenId} onChange={e => setNewHostelWardenId(e.target.value)}>
                      <option value="">-- Select Chief Warden (Optional) --</option>
                      {allStudents.filter(u => u.role === 'WARDEN' || u.role === 'HOSTEL_ADMIN').map(w => (
                        <option key={w.id} value={w.id}>{w.fullName} ({w.role})</option>
                      ))}
                    </select>
                    <button className="btn btn-primary" type="submit" style={{ gridColumn: '1 / -1' }}>
                      <Plus size={16} /> {t('hostel.add')}
                    </button>
                  </form>
                </div>

                {/* Filters & Search */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
                    <input className="form-input" type="text" placeholder="Search hostels by name, code or college..." value={hostelSearchQuery} onChange={e => setHostelSearchQuery(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select className="form-input" value={hostelGenderFilter} onChange={e => setHostelGenderFilter(e.target.value)} style={{ width: '140px' }}>
                      <option value="ALL">All Genders</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                    <select className="form-input" value={hostelStatusFilter} onChange={e => setHostelStatusFilter(e.target.value)} style={{ width: '140px' }}>
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Hostels Directory Cards */}
                <div>
                  <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>Active Hostels ({hostels.length})</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
                    {hostels
                      .filter(h => {
                        if (hostelGenderFilter !== 'ALL' && h.gender !== hostelGenderFilter) return false;
                        if (hostelStatusFilter !== 'ALL' && h.status !== hostelStatusFilter) return false;
                        if (hostelSearchQuery) {
                          const q = hostelSearchQuery.toLowerCase();
                          return h.name.toLowerCase().includes(q) || h.code.toLowerCase().includes(q) || (h.collegeName || '').toLowerCase().includes(q);
                        }
                        return true;
                      })
                      .map(h => {
                        const totalBeds = h.totalBeds ?? h.capacity;
                        const occupiedBeds = h.occupiedBeds ?? 0;
                        const availableBeds = h.availableBeds ?? (totalBeds - occupiedBeds);
                        const pct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

                        return (
                          <div key={h.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{h.name}</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: <strong style={{ color: 'var(--primary)' }}>{h.code}</strong> | {h.collegeName}</span>
                              </div>
                              <span className={`badge ${h.status === 'INACTIVE' ? 'badge-danger' : 'badge-success'}`}>
                                {h.status || 'ACTIVE'}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px' }}>
                              <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rooms</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{h.roomCount ?? 0}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Occupied</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--warning)' }}>{occupiedBeds}/{totalBeds}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available</div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--success)' }}>{availableBeds}</div>
                              </div>
                            </div>

                            <div className="occupancy-bar">
                              <div className="occupancy-bar-fill partial" style={{ width: `${pct}%` }} />
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Gender: <strong>{h.gender || 'MIXED'}</strong></span>
                              <span>{h.phone ? `Phone: ${h.phone}` : ''}</span>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => {
                                setEditingHostel({ ...h });
                                setShowEditHostelModal(true);
                              }}>
                                <Edit size={14} /> Edit Details
                              </button>
                              <button className="btn btn-secondary" style={{ color: h.status === 'INACTIVE' ? 'var(--success)' : 'var(--danger)', fontSize: '0.75rem', padding: '0.4rem' }} onClick={() => handleDeleteHostel(h.id)}>
                                {h.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {subView === 'students' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>{t('onboarding.title')}</h2>

                {currentUser.role === 'STUDENT' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Document Upload section */}
                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('onboarding.step1')}</h4>
                      <form onSubmit={handleUploadDocument} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <input className="form-input" type="text" placeholder={t('onboarding.docType')} value={docName} onChange={e => setDocName(e.target.value)} required />
                        <input className="form-input" type="text" placeholder="URL" value={docUrl} onChange={e => setDocUrl(e.target.value)} required />
                        <button className="btn btn-primary" type="submit">{t('onboarding.uploadBtn')}</button>
                      </form>
                      
                      <div style={{ marginTop: '1.5rem' }}>
                        <h5 style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>{t('students.profile')} ({studentDocs.length})</h5>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          {studentDocs.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <span>{doc.name}</span>
                              <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600 }}>{t('common.view')}</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Status Tracker */}
                    <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('onboarding.step2')}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                        <div style={{ opacity: currentUser.status === 'PENDING' ? 1 : 0.4 }}>
                          <span className="badge badge-warning" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{t('onboarding.pendingReview')}</span>
                        </div>
                        <div style={{ opacity: currentUser.status === 'VERIFIED' ? 1 : 0.4 }}>
                          <span className="badge badge-info" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{t('onboarding.verified')}</span>
                        </div>
                        <div style={{ opacity: currentUser.status === 'APPROVED' ? 1 : 0.4 }}>
                          <span className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>{t('common.approved')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Admin View
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    
                    {/* Phase 1: Documents Verification Queue */}
                    <div>
                      <h4 style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '1rem' }}>{t('onboarding.verifiedStatus')} ({pendingUsers.filter(u => u.status === 'PENDING').length})</h4>
                      {pendingUsers.filter(u => u.status === 'PENDING').length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('common.noData')}</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {pendingUsers.filter(u => u.status === 'PENDING').map(u => (
                            <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                              <div>
                                <strong style={{ fontSize: '0.95rem' }}>{u.fullName}</strong> ({u.role.replace('_', ' ')})
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auth.email')}: {u.email} | {t('auth.mobile')}: {u.mobileNumber}</p>
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {u.role === 'STUDENT' ? (
                                  <>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => {
                                      axios.get(`/api/students/${u.id}/documents`).then(res => {
                                        if (res.data?.success && res.data.data.length > 0) {
                                          showToast('info', `Documents for ${u.fullName}`, `${res.data.data.length} document(s) on file.`);
                                        } else {
                                          showToast('info', 'Notice', 'No documents uploaded yet.');
                                        }
                                      });
                                    }}>{t('common.view')}</button>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleStudentStatusUpdate(u.id, 'VERIFIED')}>{t('onboarding.verified')}</button>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', background: '#10b981' }} onClick={() => handleApprove(u.id)}>{t('common.approved')}</button>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>{t('common.reject')}</button>
                                  </>
                                ) : (
                                  <>
                                    <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => handleApprove(u.id)}>{t('common.approved')}</button>
                                    <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', color: '#ef4444' }} onClick={() => handleReject(u.id)}>{t('common.reject')}</button>
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
                      <h4 style={{ fontWeight: 700, color: '#f59e0b', marginBottom: '1rem' }}>{t('rooms.assignStudent')} ({pendingUsers.filter(u => u.status === 'VERIFIED' && u.role === 'STUDENT').length})</h4>
                      {pendingUsers.filter(u => u.status === 'VERIFIED' && u.role === 'STUDENT').length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('common.noData')}</p>
                      ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {pendingUsers.filter(u => u.status === 'VERIFIED' && u.role === 'STUDENT').map(u => (
                            <div key={u.id} className="flex-responsive-between" style={{ padding: '1rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                              <div>
                                <strong style={{ fontSize: '0.95rem' }}>{u.fullName}</strong>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('students.department')}: {u.department} | {t('students.year')}: {u.year}</p>
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
                                  <option value="">{t('auth.selectRoom')}</option>
                                  {rooms.filter(r => !r.users || r.users.length < r.capacity).map(r => (
                                    <option key={r.id} value={r.id}>{r.block} - {t('rooms.roomNumber')} {r.roomNumber} ({r.users?.length || 0}/{r.capacity})</option>
                                  ))}
                                </select>
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => {
                                  const roomId = selectedAllocatedRooms[u.id];
                                  if (!roomId) {
                                    showToast('info', 'Notice', 'Please select a room');
                                    return;
                                  }
                                  handleStudentStatusUpdate(u.id, 'APPROVED', roomId);
                                }}>{t('rooms.assignStudent')}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Phase 3: Complete Student Directory & Allocation Management */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h4 style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>
                          Student Roster & Allocation Management ({allStudents.length})
                        </h4>
                        <input className="form-input" type="text" placeholder="Search student name, reg no, department..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '260px', height: '36px' }} />
                      </div>

                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student Name</th>
                              <th>Reg No</th>
                              <th>Department / Year</th>
                              <th>Assigned Room & Bed</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allStudents.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No student records found.</td>
                              </tr>
                            ) : (
                              allStudents
                                .filter(s => {
                                  if (!searchQuery) return true;
                                  const q = searchQuery.toLowerCase();
                                  return s.fullName.toLowerCase().includes(q) || (s.registerNumber || '').toLowerCase().includes(q) || (s.department || '').toLowerCase().includes(q);
                                })
                                .map(s => (
                                  <tr key={s.id}>
                                    <td>
                                      <div style={{ fontWeight: 700 }}>{s.fullName}</div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                                    </td>
                                    <td><span style={{ fontWeight: 600 }}>{s.registerNumber || 'N/A'}</span></td>
                                    <td>{s.department || 'General'} ({s.year || '1st Year'})</td>
                                    <td>
                                      {s.room ? (
                                        <span className="badge badge-info">
                                          Room {s.room.roomNumber} ({s.room.block}) - {s.bedNumber || 'Bed-1'}
                                        </span>
                                      ) : (
                                        <span className="badge badge-warning">Unassigned</span>
                                      )}
                                    </td>
                                    <td>
                                      <span className={`badge ${s.status === 'APPROVED' ? 'badge-success' : s.status === 'VERIFIED' ? 'badge-info' : 'badge-warning'}`}>
                                        {s.status}
                                      </span>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                        {!s.roomId ? (
                                          <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={() => {
                                            setSelectedStudentForAllocate(s);
                                            setAllocHostelId(s.hostelId || (hostels[0] ? hostels[0].id : ''));
                                            setShowAllocateModal(true);
                                          }}>
                                            Allocate
                                          </button>
                                        ) : (
                                          <>
                                            <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={() => {
                                              setSelectedStudentForTransfer(s);
                                              setShowTransferModal(true);
                                            }}>
                                              Transfer
                                            </button>
                                            <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', color: 'var(--danger)' }} onClick={() => {
                                              setSelectedStudentForCheckOut(s);
                                              setShowCheckOutModal(true);
                                            }}>
                                              Check-Out
                                            </button>
                                          </>
                                        )}
                                        <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }} onClick={() => setSelectedStudentProfile(s)}>
                                          Profile
                                        </button>
                                      </div>
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
              </div>
            )}

            {/* 3. ROOMS MODULE */}
            {subView === 'rooms' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {currentUser.role === 'STUDENT' ? (
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building2 size={24} color="var(--primary)" />
                      <span>{t('rooms.roomDetails')}</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                      {t('hostel.name')}: <strong>{currentUser.hostel?.name || hostels.find(h => h.id === currentUser.hostelId)?.name || 'Main Campus Hostel'}</strong>
                    </p>

                    {currentUser.room || rooms.find(r => r.id === currentUser.roomId || r.roomNumber === currentUser.room?.roomNumber) ? (() => {
                      const myRoom = rooms.find(r => r.id === currentUser.roomId || r.roomNumber === currentUser.room?.roomNumber) || currentUser.room;
                      const roommates = myRoom?.users || [];
                      const roomCapacity = myRoom?.capacity || 4;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          {/* Room Summary Card */}
                          <div className="dashboard-grid">
                            <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('rooms.roomNumber')}</span>
                              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{myRoom?.roomNumber || 'N/A'}</h3>
                            </div>
                            <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('rooms.block')}</span>
                              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>{myRoom?.block || 'A'}</h3>
                            </div>
                            <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('rooms.floor')}</span>
                              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.25rem' }}>Floor {myRoom?.floor ?? 1}</h3>
                            </div>
                            <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('rooms.occupancy')}</span>
                              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>{roommates.length}/{roomCapacity}</h3>
                            </div>
                          </div>

                          {/* Roommates List */}
                          <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Users size={18} color="var(--primary)" />
                              <span>{t('students.title')} ({roommates.length})</span>
                            </h3>
                            {roommates.length === 0 ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>You are the primary resident assigned to this room.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                {roommates.map((rm: any) => (
                                  <div key={rm.id || rm.email} className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: rm.id === currentUser.id ? '1px solid var(--primary)' : '1px solid var(--border-color)' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                                      {rm.fullName ? rm.fullName.charAt(0) : 'S'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rm.fullName}</span>
                                        {rm.id === currentUser.id && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>You</span>}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rm.registerNumber || rm.department || 'Resident'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Room Emergency Action */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-danger"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                              onClick={() => {
                                setEmergencyLevel('ROOM');
                                setShowEmergencyModal(true);
                              }}
                            >
                              <ShieldAlert size={16} />
                              <span>{t('emergency.room')} {t('emergency.title')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })() : (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        <Home size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                        <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>No Room Allocated Yet</h4>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Please contact your hostel warden for room and bed assignment.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>{t('rooms.addRoom')}</h3>
                    <form onSubmit={handleCreateRoom} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                      <input className="form-input" type="text" value={newRoomBlock} onChange={e => setNewRoomBlock(e.target.value)} placeholder={`${t('rooms.block')} (e.g. Block A)`} required />
                      <input className="form-input" type="number" value={newRoomFloor} onChange={e => setNewRoomFloor(e.target.value)} placeholder={t('rooms.floor')} required />
                      <input className="form-input" type="text" value={newRoomNumber} onChange={e => setNewRoomNumber(e.target.value)} placeholder={t('rooms.roomNumber')} required />
                      <input className="form-input" type="number" value={newRoomCapacity} onChange={e => setNewRoomCapacity(e.target.value)} placeholder={t('rooms.capacity')} required />
                      <select className="form-input" value={newRoomCategory} onChange={e => setNewRoomCategory(e.target.value)}>
                        <option value="NON_AC_DOUBLE">Non-AC Double Sharing</option>
                        <option value="NON_AC_TRIPLE">Non-AC Triple Sharing</option>
                        <option value="AC_DOUBLE">AC Double Sharing</option>
                        <option value="AC_SINGLE">AC Single Deluxe</option>
                        <option value="DORMITORY">Dormitory</option>
                      </select>
                      <select className="form-input" value={newRoomHostelId} onChange={e => setNewRoomHostelId(e.target.value)}>
                        {hostels.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={newRoomIsMaintenance} onChange={e => setNewRoomIsMaintenance(e.target.checked)} />
                        <span>Under Maintenance</span>
                      </label>
                      <button className="btn btn-primary" type="submit" style={{ gridColumn: '1 / -1' }}>{t('rooms.addRoom')}</button>
                    </form>

                    {/* Filter & Search Bar */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <h4 style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={18} color="var(--primary)" /> {t('rooms.title')} ({rooms.length})
                      </h4>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select className="form-input" value={roomHostelFilter} onChange={e => setRoomHostelFilter(e.target.value)} style={{ width: '130px', height: '34px', fontSize: '0.75rem' }}>
                          <option value="ALL">All Hostels</option>
                          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                        <select className="form-input" value={roomCategoryFilter} onChange={e => setRoomCategoryFilter(e.target.value)} style={{ width: '140px', height: '34px', fontSize: '0.75rem' }}>
                          <option value="ALL">All Categories</option>
                          <option value="NON_AC_DOUBLE">Non-AC Double</option>
                          <option value="NON_AC_TRIPLE">Non-AC Triple</option>
                          <option value="AC_DOUBLE">AC Double</option>
                          <option value="AC_SINGLE">AC Single</option>
                          <option value="DORMITORY">Dormitory</option>
                        </select>
                        {['all', 'available', 'full', 'maintenance'].map(filter => (
                          <button
                            key={filter}
                            type="button"
                            className={`btn ${roomFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', textTransform: 'capitalize' }}
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
                          if (roomHostelFilter !== 'ALL' && r.hostelId !== roomHostelFilter) return false;
                          if (roomCategoryFilter !== 'ALL' && r.category !== roomCategoryFilter) return false;
                          if (roomFilter === 'maintenance') return r.isMaintenance;
                          const occupied = r.users?.length || 0;
                          if (roomFilter === 'available') return !r.isMaintenance && occupied < (r.capacity || 4);
                          if (roomFilter === 'full') return !r.isMaintenance && occupied >= (r.capacity || 4);
                          return true;
                        })
                        .map((r, idx) => {
                          const occupied = r.users?.length || 0;
                          const cap = r.capacity || 4;
                          const pct = Math.round((occupied / cap) * 100);
                          const statusClass = r.isMaintenance ? 'full' : occupied >= cap ? 'full' : occupied > 0 ? 'partial' : 'available';

                          return (
                            <div
                              key={idx}
                              className={`occupancy-card ${statusClass}`}
                              onClick={() => setSelectedRoom(r)}
                              style={{ position: 'relative', border: r.isMaintenance ? '1px dashed var(--danger)' : undefined }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{t('rooms.roomNumber')} {r.roomNumber}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flr {r.floor}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{r.block}</span>
                                <span>{r.category || 'Standard'}</span>
                              </div>

                              {r.isMaintenance ? (
                                <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', padding: '0.4rem', borderRadius: '6px', margin: '0.5rem 0' }}>
                                  UNDER MAINTENANCE
                                </div>
                              ) : (
                                <>
                                  <div className="bed-dots" style={{ margin: '0.5rem 0' }}>
                                    {Array.from({ length: cap }).map((_, i) => (
                                      <div key={i} className={`bed-dot ${i < occupied ? 'occupied' : 'empty'}`} />
                                    ))}
                                  </div>

                                  <div className="occupancy-bar">
                                    <div className={`occupancy-bar-fill ${statusClass}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                                    {occupied}/{cap} {t('rooms.totalBeds')}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {subView === 'mess' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="flex-responsive-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('mess.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Manage and confirm daily dining requirement</p>
                  </div>
                  
                  {/* Dynamic Sub-Tabs inside Mess */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      className={`btn ${activeMessTab === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => { setActiveMessTab('today'); loadMeals(); }}
                    >
                      {t('mess.today')}
                    </button>
                    <button
                      className={`btn ${activeMessTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => { setActiveMessTab('history'); loadMealHistory(); }}
                    >
                      {t('mess.mealHistory')}
                    </button>
                    {currentUser.role === 'STUDENT' && (
                      <button
                        className={`btn ${activeMessTab === 'plans' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => setActiveMessTab('plans')}
                      >
                        {t('mess.enrollPlan')}
                      </button>
                    )}
                    {['SUPER_ADMIN', 'MESS_MANAGER'].includes(currentUser.role) && (
                      <button
                        className={`btn ${activeMessTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => setActiveMessTab('attendance')}
                      >
                        Dining Registry
                      </button>
                    )}
                    <button
                      className={`btn ${activeMessTab === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => setActiveMessTab('weekly')}
                    >
                      {t('mess.weeklyMenu')}
                    </button>
                  </div>
                </div>

                {/* TAB 1: TODAY'S MEALS */}
                {activeMessTab === 'today' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Admin Actions Bar */}
                    {['SUPER_ADMIN', 'MESS_MANAGER', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
                      <div className="flex-responsive-between" style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-lg)', gap: '1rem', alignItems: 'center' }}>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Date</span>
                            <input className="form-input" style={{ height: '34px', padding: '0.35rem 0.5rem', width: '135px' }} type="date" value={mealFilterDate} onChange={e => setMealFilterDate(e.target.value)} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Block</span>
                            <input className="form-input" style={{ height: '34px', padding: '0.35rem 0.5rem', width: '90px' }} type="text" placeholder="Block" value={mealFilterBlock} onChange={e => setMealFilterBlock(e.target.value)} />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Floor</span>
                            <input className="form-input" style={{ height: '34px', padding: '0.35rem 0.5rem', width: '80px' }} type="number" placeholder="Floor" value={mealFilterFloor} onChange={e => setMealFilterFloor(e.target.value)} />
                          </div>
                          {hostels.length > 1 && (
                            <div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Hostel</span>
                              <select className="form-input" style={{ height: '34px', padding: '0.35rem 0.5rem', width: '140px' }} value={mealFilterHostelId} onChange={e => setMealFilterHostelId(e.target.value)}>
                                <option value="">All Hostels</option>
                                {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Publish Meal Button */}
                        {['SUPER_ADMIN', 'MESS_MANAGER'].includes(currentUser.role) && (
                          <button
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '38px', marginTop: '14px' }}
                            onClick={() => setShowPublishMealModal(true)}
                          >
                            <PlusCircle size={16} />
                            <span>{t('mess.publishMeal')}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {isMealsLoading ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
                    ) : meals.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
                        <p>{t('mess.noMealsToday')}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {meals.map((meal) => {
                          const isCancelled = meal.status === 'CANCELLED';
                          const isClosed = meal.isClosed;
                          const formattedDate = new Date(meal.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                          const cutoffDate = new Date(meal.cutoffTime);

                          if (currentUser.role === 'STUDENT') {
                            const isTaking = meal.userStatus === 'TAKING';
                            return (
                              <div
                                key={meal.id}
                                className="glass-panel"
                                style={{
                                  padding: '1.5rem',
                                  border: isCancelled
                                    ? '1px solid var(--danger-border)'
                                    : isClosed
                                    ? '1px solid var(--border-color)'
                                    : isTaking
                                    ? '1px solid var(--primary-border)'
                                    : '1px solid var(--warning-border)',
                                  borderRadius: 'var(--radius-lg)',
                                  background: isCancelled
                                    ? 'var(--danger-soft)'
                                    : isTaking
                                    ? 'var(--primary-soft)'
                                    : 'var(--warning-soft)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '1rem'
                                }}
                              >
                                <div className="flex-responsive-between" style={{ alignItems: 'flex-start' }}>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      {formattedDate} · {t('mess.mealTime')}: {new Date(meal.mealTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.15rem' }}>
                                      {t(`mess.${meal.type.toLowerCase()}`)}
                                    </h3>
                                  </div>
                                  <div>
                                    {isCancelled ? (
                                      <span className="badge badge-danger">{t('common.cancelled')}</span>
                                    ) : isClosed ? (
                                      <span className="badge badge-neutral">{t('mess.mealClosed')}</span>
                                    ) : isTaking ? (
                                      <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem' }}>✓ {t('mess.takingFood')}</span>
                                    ) : (
                                      <span className="badge badge-warning" style={{ padding: '0.35rem 0.75rem' }}>{t('mess.mealSkipped')}</span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.9rem', lineHeight: '1.45' }}>
                                  <strong style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Menu</strong>
                                  {meal.menu}
                                </div>

                                <div className="flex-responsive-between" style={{ alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {t('mess.skipCutoff')}: {cutoffDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({cutoffDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })})
                                  </span>

                                  {!isCancelled && !isClosed && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {isTaking ? (
                                        <button
                                          className="btn btn-secondary"
                                          style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)', minHeight: '38px', padding: '0.4rem 1.25rem' }}
                                          onClick={() => {
                                            setSelectedMealForSkip(meal);
                                            setShowSkipConfirmationModal(true);
                                          }}
                                        >
                                          {t('mess.skipFood')}
                                        </button>
                                      ) : (
                                        <button
                                          className="btn btn-primary"
                                          style={{ minHeight: '38px', padding: '0.4rem 1.25rem' }}
                                          onClick={() => handleConfirmMeal(meal.id, 'TAKING')}
                                        >
                                          {t('mess.takeFood')}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            // Admin/Mess view stats card
                            const stats = meal.stats || { totalEligible: 0, skippedCount: 0, takingCount: 0, hostelBreakdown: [] };
                            const skipRate = stats.totalEligible > 0 ? ((stats.skippedCount / stats.totalEligible) * 100).toFixed(1) : '0.0';

                            return (
                              <div key={meal.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: isCancelled ? '1px solid var(--danger-border)' : '1px solid var(--border-color)' }}>
                                <div className="flex-responsive-between" style={{ alignItems: 'flex-start' }}>
                                  <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      {formattedDate} · {t('mess.mealTime')}: {new Date(meal.mealTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '0.15rem' }}>
                                      {t(`mess.${meal.type.toLowerCase()}`)}
                                    </h3>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    {isCancelled ? (
                                      <span className="badge badge-danger">{t('common.cancelled')}</span>
                                    ) : isClosed ? (
                                      <span className="badge badge-neutral">{t('mess.mealClosed')}</span>
                                    ) : (
                                      <span className="badge badge-success">{t('common.active')}</span>
                                    )}
                                    
                                    {!isCancelled && ['SUPER_ADMIN', 'MESS_MANAGER'].includes(currentUser.role) && (
                                      <button
                                        className="btn btn-ghost"
                                        style={{ color: 'var(--danger)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => {
                                          if (confirm(t('mess.cancelConfirmText'))) {
                                            handleCancelMeal(meal.id);
                                          }
                                        }}
                                      >
                                        Cancel Meal
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                  {/* Menu details */}
                                  <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>Menu</span>
                                    <span style={{ fontSize: '0.88rem' }}>{meal.menu}</span>
                                  </div>

                                  {/* Visually Prominent cooking requirement count */}
                                  <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-border)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.03em' }}>{t('mess.foodWasteGoal')}</span>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', margin: '0.25rem 0' }}>
                                      {isCancelled ? 0 : stats.takingCount}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t('mess.recommendedCookingCount')}</span>
                                  </div>
                                </div>

                                {/* Operational demand breakdown */}
                                {!isCancelled && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                                    <div>
                                      <span style={{ color: 'var(--text-muted)' }}>{t('mess.totalEligible')}: </span>
                                      <strong>{stats.totalEligible}</strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-muted)' }}>{t('mess.takingCount')}: </span>
                                      <strong style={{ color: 'var(--success)' }}>{stats.takingCount}</strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-muted)' }}>{t('mess.skippedCount')}: </span>
                                      <strong style={{ color: 'var(--warning)' }}>{stats.skippedCount}</strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-muted)' }}>Skip Rate: </span>
                                      <strong>{skipRate}%</strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-muted)' }}>{t('mess.skipCutoff')}: </span>
                                      <strong>{cutoffDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</strong>
                                    </div>
                                  </div>
                                )}

                                {/* Hostel Breakdown */}
                                {!isCancelled && stats.hostelBreakdown && stats.hostelBreakdown.length > 0 && (
                                  <div>
                                    <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                      {t('mess.hostelBreakdown')}
                                    </h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                                      {stats.hostelBreakdown.map((h: any, idx: number) => (
                                        <div key={idx} style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontWeight: 700, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.hostelName}</span>
                                          <span style={{ marginTop: '0.2rem', color: 'var(--text-muted)' }}>
                                            Expected: <strong style={{ color: 'var(--primary)' }}>{h.taking}</strong>
                                          </span>
                                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.68rem' }}>
                                            Skipped: {h.skipped} / {h.eligible}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: MEAL HISTORY & LOGS */}
                {activeMessTab === 'history' && (
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('mess.mealHistory')}</h3>
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          {currentUser.role === 'STUDENT' ? (
                            <tr>
                              <th>Date</th>
                              <th>Meal</th>
                              <th>Menu</th>
                              <th>{t('common.status')}</th>
                            </tr>
                          ) : (
                            <tr>
                              <th>Date</th>
                              <th>Meal</th>
                              <th>Menu</th>
                              <th>Eligible</th>
                              <th>Expected / Cooking</th>
                              <th>Skipped</th>
                              <th>Skip Rate</th>
                              <th>Status</th>
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {mealHistory.length === 0 ? (
                            <tr>
                              <td colSpan={currentUser.role === 'STUDENT' ? 4 : 8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                                {t('common.noData')}
                              </td>
                            </tr>
                          ) : (
                            mealHistory.map((hist, idx) => {
                              const dateStr = new Date(hist.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
                              if (currentUser.role === 'STUDENT') {
                                return (
                                  <tr key={idx}>
                                    <td><strong>{dateStr}</strong></td>
                                    <td>{t(`mess.${hist.meal.toLowerCase()}`)}</td>
                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hist.menu}</td>
                                    <td>
                                      {hist.status === 'TAKING' ? (
                                        <span className="badge badge-success">✓ {t('mess.takingFood')}</span>
                                      ) : (
                                        <span className="badge badge-warning">{t('mess.mealSkipped')}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              } else {
                                const rate = hist.eligible > 0 ? ((hist.skipped / hist.eligible) * 100).toFixed(1) : '0.0';
                                return (
                                  <tr key={idx}>
                                    <td><strong>{dateStr}</strong></td>
                                    <td>{t(`mess.${hist.meal.toLowerCase()}`)}</td>
                                    <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hist.menu}>{hist.menu}</td>
                                    <td>{hist.eligible}</td>
                                    <td><strong style={{ color: 'var(--primary)' }}>{hist.taking}</strong></td>
                                    <td>{hist.skipped}</td>
                                    <td>{rate}%</td>
                                    <td>
                                      {hist.status === 'CANCELLED' ? (
                                        <span className="badge badge-danger">{t('common.cancelled')}</span>
                                      ) : (
                                        <span className="badge badge-success">{t('common.active')}</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              }
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 3: STUDENT PLANS ENROLLMENT (PRESERVED) */}
                {activeMessTab === 'plans' && currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('mess.currentPlan')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {messes.map(m => {
                        const isEnrolled = currentUser.messId === m.id;
                        return (
                          <div key={m.id} style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{m.name}</span>
                            <span className="badge badge-info">{m.students?.length || 0} {t('hostel.students')}</span>
                            {isEnrolled ? (
                              <button className="btn btn-secondary" style={{ pointerEvents: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>{t('common.active')}</button>
                            ) : (
                              <button className="btn btn-primary" onClick={() => handleEnrollMess(m.id)}>{t('mess.enrollPlan')}</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 4: DINING REGISTRY (PRESERVED MANUAL MARKING) */}
                {activeMessTab === 'attendance' && ['SUPER_ADMIN', 'MESS_MANAGER'].includes(currentUser.role) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Mess Manager Create Mess */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('mess.addMenu')}</h3>
                      <form onSubmit={handleCreateMess} style={{ display: 'flex', gap: '1rem' }}>
                        <input className="form-input" style={{ flex: 1 }} type="text" placeholder={t('mess.menu')} value={newMessName} onChange={e => setNewMessName(e.target.value)} required />
                        <button className="btn btn-primary" type="submit">{t('common.create')}</button>
                      </form>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Dining Attendance Registry</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      {messes.map(m => (
                        <div key={m.id} style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                          <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)' }}>{m.name}</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {allStudents.filter(s => s.messId === m.id).length === 0 ? (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('common.noData')}</p>
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
                  </div>
                )}

                {/* TAB 5: WEEKLY MENU REFERENCE (PRESERVED) */}
                {activeMessTab === 'weekly' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('mess.weeklyMenu')}</h3>
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
                          <span>{t('mess.breakfast')}: {menu.b}</span>
                          <span>{t('mess.lunch')}: {menu.l}</span>
                          <span>{t('mess.dinner')}: {menu.d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {subView === 'payments' && currentUser && (
              <div className="glass-panel animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('payments.title')}</h2>

                {/* Accountant / Admin Fee Assignment */}
                {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('payments.feeTitle')}</h3>
                    <form onSubmit={handleCreateFee} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <input className="form-input" type="text" placeholder={t('payments.feeTitle')} value={feeTitle} onChange={e => setFeeTitle(e.target.value)} required />
                      <input className="form-input" type="number" placeholder={t('payments.amount')} value={feeAmount || ''} onChange={e => setFeeAmount(Number(e.target.value))} required />
                      <input className="form-input" type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} required />
                      <select 
                        className="form-input" 
                        value={feeStudentId} 
                        onChange={e => setFeeStudentId(e.target.value)}
                        required
                      >
                        <option value="">{t('students.student')}</option>
                        {allStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.fullName} ({s.registerNumber || 'No Register No'})</option>
                        ))}
                      </select>
                      <button className="btn btn-primary" type="submit">{t('common.submit')}</button>
                    </form>
                  </div>
                )}

                {/* Summary Cards */}
                {(() => {
                  const totalDue = fees.reduce((sum, f) => sum + f.amount, 0);
                  const totalPaid = fees.reduce((sum, f) => sum + (f.paidAmount || 0), 0);
                  const outstanding = totalDue - totalPaid;
                  return (
                    <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
                      <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Fee Dues</span>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '0.2rem' }}>Rs. {totalDue.toLocaleString()}</h3>
                      </div>
                      <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Collected</span>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.2rem' }}>Rs. {totalPaid.toLocaleString()}</h3>
                      </div>
                      <div className="glass-panel stat-card" style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Outstanding Balance</span>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--danger)', marginTop: '0.2rem' }}>Rs. {outstanding.toLocaleString()}</h3>
                      </div>
                    </div>
                  );
                })()}

                {/* Main Fees List */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>{t('payments.history')}</h3>
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {fees.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('common.noData')}</p>
                    ) : (
                      fees.map(f => {
                        const isStudent = currentUser.role === 'STUDENT';
                        const belongsToMe = f.studentId === currentUser.id;
                        if (isStudent && !belongsToMe) return null;

                        const paid = f.paidAmount || 0;
                        const pendingBalance = f.amount - paid;

                        return (
                          <div key={f.id} className="flex-responsive-between" style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ fontWeight: 800, fontSize: '1.05rem' }}>{f.title}</h4>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                Student: <strong>{f.student?.fullName || 'Resident'}</strong> | Due Date: {new Date(f.dueDate).toLocaleDateString()}
                              </p>
                              <div style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', gap: '1rem' }}>
                                <span>Total: <strong>Rs. {f.amount}</strong></span>
                                <span style={{ color: 'var(--success)' }}>Paid: <strong>Rs. {paid}</strong></span>
                                <span style={{ color: 'var(--danger)' }}>Pending: <strong>Rs. {pendingBalance}</strong></span>
                              </div>
                              {f.payments && f.payments.length > 0 && (
                                <div style={{ marginTop: '0.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span><strong style={{ color: 'var(--primary)' }}>Receipt:</strong> {f.payments[0].receiptNumber} ({f.payments[0].paymentMode})</span>
                                  <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }} onClick={() => {
                                    setSelectedPaymentForReceipt(f.payments[0]);
                                    setShowReceiptModal(true);
                                  }}>
                                    <Printer size={12} /> Print Receipt
                                  </button>
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>Rs. {f.amount}</span>
                              <span className={`badge ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-info' : 'badge-warning'}`}>
                                {f.status}
                              </span>
                              
                              {f.status !== 'PAID' && (
                                <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', marginTop: '0.25rem' }} onClick={() => {
                                  setSelectedFeeForPay(f);
                                  setPayAmountInput(String(pendingBalance));
                                  setShowPayFeeModal(true);
                                }}>
                                  Record Payment
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>
                {/* Profile Details Card */}
                <div className="glass-panel animate-slide-up" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '2rem', fontWeight: 800 }}>
                      {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentUser.fullName}</h3>
                      <span className="badge badge-info" style={{ marginTop: '0.25rem' }}>{currentUser.role}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('auth.email')}</span>
                      <strong>{currentUser.email}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('common.status')}</span>
                      <strong style={{ color: currentUser.status === 'APPROVED' ? '#10b981' : '#f59e0b' }}>{currentUser.status}</strong>
                    </div>
                    {currentUser.mobileNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('auth.mobile')}</span>
                        <strong>{currentUser.mobileNumber}</strong>
                      </div>
                    )}
                    {currentUser.emergencyContact && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('profile.emergencyContact')}</span>
                        <strong style={{ color: 'var(--danger)' }}>{currentUser.emergencyContact}</strong>
                      </div>
                    )}
                    {currentUser.bloodGroup && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('profile.bloodGroup')}</span>
                        <strong>{currentUser.bloodGroup}</strong>
                      </div>
                    )}
                    {currentUser.registerNumber && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('auth.registerNumber')}</span>
                        <strong>{currentUser.registerNumber}</strong>
                      </div>
                    )}
                    {currentUser.department && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('auth.department')}</span>
                        <strong>{currentUser.department}</strong>
                      </div>
                    )}
                    {currentUser.hostel && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('hostel.name')}</span>
                        <strong>{currentUser.hostel.name}</strong>
                      </div>
                    )}
                    {currentUser.room && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('rooms.roomNumber')}</span>
                        <strong>{currentUser.room.roomNumber} ({currentUser.room.block})</strong>
                      </div>
                    )}
                    {currentUser.address && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('profile.address')}</span>
                        <span style={{ textAlign: 'right', maxWidth: '60%' }}>{currentUser.address}</span>
                      </div>
                    )}
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => {
                      setEditProfileName(currentUser.fullName || '');
                      setEditProfileMobile(currentUser.mobileNumber || '');
                      setEditProfileAddress(currentUser.address || '');
                      setEditProfileEmergency(currentUser.emergencyContact || '');
                      setEditProfileBloodGroup(currentUser.bloodGroup || '');
                      setEditProfileMedical(currentUser.medicalDetails || '');
                      setEditProfileDept(currentUser.department || '');
                      setEditProfileYear(currentUser.year || '');
                      setEditProfileGuardianName(currentUser.guardianName || currentUser.parentName || '');
                      setEditProfileGuardianMobile(currentUser.guardianMobile || currentUser.parentMobile || '');
                      setShowEditProfileModal(true);
                    }}
                  >
                    <User size={16} /> {t('profile.editProfile')}
                  </button>
                </div>

                {/* Digital ID Card Preview & QR Code */}
                <div className="glass-panel animate-slide-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-main)' }}>{t('visitors.entryPass')}</h4>
                  
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
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.fullName || 'User')}`} 
                      style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--primary)', margin: '0 auto 1rem', display: 'block' }}
                      alt="Avatar"
                    />
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>{currentUser.fullName}</div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-soft)', padding: '0.15rem 0.5rem', borderRadius: '12px', display: 'inline-block', margin: '0.25rem 0 1rem', fontWeight: 700 }}>
                      {currentUser.role}
                    </span>
                    <div style={{ textAlign: 'left', fontSize: '0.75rem', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('auth.registerNumber')}:</span><strong>{currentUser.registerNumber || 'N/A'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('hostel.name')}:</span><strong>{currentUser.hostel?.name || 'Main Campus Hostel'}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('rooms.roomNumber')}:</span><strong>{currentUser.room?.roomNumber || 'Unassigned'}</strong></div>
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
                                  <div class="details-row"><span class="details-label">Hostel:</span><span class="details-val">${currentUser.hostel?.name || 'Main Campus Hostel'}</span></div>
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
                    <QrCode size={18} /> {t('common.print')} / {t('common.download')} {t('visitors.pass')}
                  </button>
                </div>

                {/* Edit Profile Modal */}
                {showEditProfileModal && (
                  <div className="modal-overlay" style={{ zIndex: 1000 }}>
                    <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('profile.editProfile')}</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }} onClick={() => setShowEditProfileModal(false)}>✕</button>
                      </div>
                      <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('auth.fullName')}</label>
                            <input className="form-input" type="text" value={editProfileName} onChange={e => setEditProfileName(e.target.value)} required />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('auth.mobile')}</label>
                            <input className="form-input" type="text" value={editProfileMobile} onChange={e => setEditProfileMobile(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('profile.emergencyContact')}</label>
                            <input className="form-input" type="text" value={editProfileEmergency} onChange={e => setEditProfileEmergency(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('profile.bloodGroup')}</label>
                            <select className="form-input" value={editProfileBloodGroup} onChange={e => setEditProfileBloodGroup(e.target.value)}>
                              <option value="">Select Blood Group</option>
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('auth.department')}</label>
                            <input className="form-input" type="text" value={editProfileDept} onChange={e => setEditProfileDept(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('auth.year')}</label>
                            <input className="form-input" type="text" value={editProfileYear} onChange={e => setEditProfileYear(e.target.value)} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('profile.guardianName')}</label>
                            <input className="form-input" type="text" value={editProfileGuardianName} onChange={e => setEditProfileGuardianName(e.target.value)} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('profile.guardianMobile')}</label>
                            <input className="form-input" type="text" value={editProfileGuardianMobile} onChange={e => setEditProfileGuardianMobile(e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('profile.address')}</label>
                          <textarea className="form-input" rows={2} value={editProfileAddress} onChange={e => setEditProfileAddress(e.target.value)} style={{ resize: 'vertical' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('profile.medicalDetails')}</label>
                          <input className="form-input" type="text" placeholder="e.g. Allergies, Asthma" value={editProfileMedical} onChange={e => setEditProfileMedical(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => setShowEditProfileModal(false)}>{t('common.cancel')}</button>
                          <button type="submit" className="btn btn-primary">{t('profile.saveProfile')}</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
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
                        <div key={item.id} style={{ padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{item.itemName}</h4>
                              <span className="badge badge-info" style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>{item.category}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{item.quantity} {item.unit}</span>
                              {item.damagedCount > 0 && (
                                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 600 }}>
                                  Damaged: {item.damagedCount} {item.unit}
                                </span>
                              )}
                              {isLow && <span className="badge badge-danger" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.65rem' }}>Low Stock!</span>}
                            </div>
                          </div>

                          {/* Quick Logs inside card */}
                          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER', 'MAINTENANCE'].includes(currentUser.role) && (
                            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="form-input" style={{ height: '32px', fontSize: '0.8rem' }} type="number" placeholder="Qty" onChange={e => setInvUseQty(Number(e.target.value))} />
                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleUseInventory(item.id)}>Consume</button>
                                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--warning)' }} onClick={() => {
                                  setSelectedInventoryForDamage(item);
                                  setShowDamageModal(true);
                                }}>
                                  Damage
                                </button>
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

            {/* USER MANAGEMENT & DATA SEEDING MODULE */}
            {subView === 'users' && currentUser && ['SUPER_ADMIN', 'HOSTEL_ADMIN'].includes(currentUser.role) && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={24} color="var(--primary)" /> User Directory & Account Governance
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      Manage user roles, verify accounts, securely reset test passwords, and trigger historical data seeding.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => fetchAdminUsers()}>
                      <RefreshCw size={14} /> Refresh Roster
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowSeedModal(true)} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderColor: '#059669' }}>
                      <Database size={16} /> Seed Test Data (30-Day Logs)
                    </button>
                  </div>
                </div>

                {/* Summary KPI Cards */}
                <div className="dashboard-grid">
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Accounts</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{adminUsersTotal || adminUsers.length}</h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Approved Users</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>
                      {adminUsers.filter(u => u.status === 'APPROVED' || u.status === 'VERIFIED').length}
                    </h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Students</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                      {adminUsers.filter(u => u.role === 'STUDENT').length}
                    </h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Staff & Administration</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.25rem' }}>
                      {adminUsers.filter(u => u.role !== 'STUDENT').length}
                    </h3>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Search by name, email, register number..."
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      style={{ flex: 1, minWidth: '220px' }}
                    />
                    <select className="form-input" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} style={{ width: '160px' }}>
                      <option value="ALL">All Roles</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="HOSTEL_ADMIN">Hostel Admin</option>
                      <option value="WARDEN">Warden</option>
                      <option value="ASSISTANT_WARDEN">Assistant Warden</option>
                      <option value="MESS_MANAGER">Mess Manager</option>
                      <option value="SECURITY">Security</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="ACCOUNTANT">Accountant</option>
                      <option value="WORKER">Worker</option>
                      <option value="STAFF">Staff</option>
                      <option value="STUDENT">Student</option>
                    </select>
                    <select className="form-input" value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)} style={{ width: '150px' }}>
                      <option value="ALL">All Statuses</option>
                      <option value="APPROVED">Approved</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* User Directory Roster Table */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                          <th style={{ padding: '0.75rem' }}>User Profile</th>
                          <th>Role</th>
                          <th>Department / Reg No</th>
                          <th>Assigned Room / Bed</th>
                          <th>Account Status</th>
                          <th>Created Date</th>
                          <th style={{ textAlign: 'right' }}>Governance Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminUsers.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                              No users match the selected filters.
                            </td>
                          </tr>
                        ) : (
                          adminUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.875rem 0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'var(--primary-contrast)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                                    {u.fullName?.charAt(0) || 'U'}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700 }}>{u.fullName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                      <span>{u.email} · {u.mobileNumber || 'N/A'}</span>
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ padding: '0.15rem', minWidth: 'auto' }}
                                        title="Copy username (email)"
                                        onClick={() => handleCopyToClipboard(u.email, 'Username')}
                                      >
                                        <Copy size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${u.role === 'SUPER_ADMIN' || u.role === 'HOSTEL_ADMIN' ? 'badge-primary' : u.role === 'STUDENT' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                                  {u.role}
                                </span>
                              </td>
                              <td>
                                <div>{u.department || 'N/A'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.registerNumber || u.year || '-'}</div>
                              </td>
                              <td>
                                {u.room ? (
                                  <div>
                                    <strong>{u.room.roomNumber}</strong> ({u.room.block})
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.bedNumber || 'Bed Assigned'}</div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unassigned</span>
                                )}
                              </td>
                              <td>
                                <span className={`badge ${u.status === 'APPROVED' || u.status === 'VERIFIED' ? 'badge-success' : u.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                                  {u.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                  {u.status === 'APPROVED' ? (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                                      onClick={() => handleUpdateUserStatus(u.id, 'PENDING')}
                                    >
                                      Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: 'var(--success)', borderColor: 'var(--success)' }}
                                      onClick={() => handleUpdateUserStatus(u.id, 'APPROVED')}
                                    >
                                      Approve
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                    onClick={() => handleOpenEditUser(u)}
                                  >
                                    <Edit size={12} /> Edit
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                    onClick={() => {
                                      setSelectedUserForResetPass(u);
                                      setShowResetPassModal(true);
                                    }}
                                  >
                                    Reset Pass
                                  </button>
                                </div>
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

            {/* 11. AUDIT LOGS MODULE */}
            {subView === 'audit_logs' && currentUser && currentUser.role === 'SUPER_ADMIN' && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('auditLogs.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{t('auditLogs.subtitle')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => loadAuditLogs(auditPage)}>
                      <RefreshCw size={14} /> {t('common.refresh')}
                    </button>
                    <button className="btn btn-primary" onClick={handleExportAuditCSV} disabled={auditLogs.length === 0}>
                      <Download size={14} /> {t('auditLogs.exportCsv')}
                    </button>
                  </div>
                </div>
                
                {/* Search / Filters */}
                <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('auditLogs.searchUser')}</label>
                    <input className="form-input" style={{ width: '220px' }} type="text" placeholder="user@domain.com" value={auditUserSearch} onChange={e => setAuditUserSearch(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('tables.category')}</label>
                    <select className="form-input" style={{ width: '180px' }} value={auditModuleFilter} onChange={e => setAuditModuleFilter(e.target.value)}>
                      <option value="">{t('auditLogs.allModules')}</option>
                      <option value="GATE_PASS">Gate Pass</option>
                      <option value="NOTICES">Notice Board</option>
                      <option value="PROFILE">Profile</option>
                      <option value="MESS">Mess Operations</option>
                      <option value="FINANCE">Finance & Fees</option>
                      <option value="INVENTORY">Inventory stock</option>
                      <option value="PAYROLL">Payroll ledger</option>
                      <option value="SETTINGS">System Settings</option>
                      <option value="STUDENTS">Students Verify</option>
                      <option value="EMERGENCY">Emergency Alerts</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('reports.startDate')}</label>
                    <input className="form-input" type="date" value={auditStartDate} onChange={e => setAuditStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('reports.endDate')}</label>
                    <input className="form-input" type="date" value={auditEndDate} onChange={e => setAuditEndDate(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={() => loadAuditLogs(1)} style={{ height: '40px' }}>
                    <Search size={14} /> {t('common.filter')}
                  </button>
                </div>

                {/* Audit Logs table */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  {auditLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      <Activity size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                      <p>{t('common.noData')}</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            <th style={{ padding: '0.75rem' }}>{t('tables.time')}</th>
                            <th>{t('tables.name')} / Email</th>
                            <th>{t('tables.category')}</th>
                            <th>{t('tables.actions')}</th>
                            <th>{t('common.details')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.map(l => (
                            <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                              <td style={{ padding: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleString()}</td>
                              <td style={{ fontWeight: 600 }}>{l.userEmail}</td>
                              <td><span className="badge badge-info">{l.module}</span></td>
                              <td style={{ fontWeight: 600 }}>{l.action}</td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{l.details || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {t('reports.totalRecords')}: {auditTotalCount} · {t('auditLogs.page')} {auditPage} {t('auditLogs.of')} {auditTotalPages}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={auditPage <= 1} onClick={() => loadAuditLogs(auditPage - 1)}>
                        ← {t('auditLogs.prev')}
                      </button>
                      <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} disabled={auditPage >= auditTotalPages} onClick={() => loadAuditLogs(auditPage + 1)}>
                        {t('auditLogs.next')} →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 12. SYSTEM SETTINGS */}
            {subView === 'settings' && currentUser && (
              <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('settings.title')}</h2>

                {/* Application Preferences (Accessible to all authenticated users) */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sliders size={18} color="var(--primary)" /> {t('settings.appPreferences')}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Theme Preference */}
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />} {t('settings.theme')}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Choose between Dark Charcoal or Light Emerald interface styles.</p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setTheme('dark')}>Dark</button>
                        <button type="button" className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setTheme('light')}>Light</button>
                      </div>
                    </div>

                    {/* Language Preference */}
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Languages size={16} /> {t('settings.language')}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Select your preferred UI language (English, தமிழ், हिन्दी).</p>
                      <select className="form-input" value={lang} onChange={e => changeLanguage(e.target.value as any)}>
                        <option value="en">English (Default)</option>
                        <option value="ta">தமிழ் (Tamil)</option>
                        <option value="hi">हिन्दी (Hindi)</option>
                      </select>
                    </div>

                    {/* Sound Alerts Toggle */}
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Volume2 size={16} /> {t('settings.soundAlerts')}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('settings.enableSounds')}</p>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={prefSoundAlerts} onChange={e => setPrefSoundAlerts(e.target.checked)} />
                        <span>{t('common.active')}</span>
                      </label>
                    </div>

                    {/* Desktop Notifications Toggle */}
                    <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={16} /> {t('settings.desktopNotifications')}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{t('settings.enableDesktopNotifs')}</p>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="checkbox" checked={prefDesktopNotifs} onChange={e => setPrefDesktopNotifs(e.target.checked)} />
                        <span>{t('common.active')}</span>
                      </label>
                    </div>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      localStorage.setItem('smarthostel_sounds', String(prefSoundAlerts));
                      localStorage.setItem('smarthostel_notifs', String(prefDesktopNotifs));
                      showToast('success', t('common.success'), t('dialogs.saveSuccess'));
                    }}
                  >
                    <Save size={16} /> {t('settings.savePreferences')}
                  </button>
                </div>

                {/* Attendance Geofence Configuration (Admin Only) */}
                {['SUPER_ADMIN', 'HOSTEL_ADMIN'].includes(currentUser.role) && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Shield size={18} color="var(--primary)" /> {t('settings.attendanceConfig')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('settings.geofenceRadius')}</label>
                        <input className="form-input" type="number" value={prefGeofenceRadius} onChange={e => setPrefGeofenceRadius(Number(e.target.value))} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Default: 5.0 meters GPS precision limit</span>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('settings.tokenExpiry')}</label>
                        <input className="form-input" type="number" value={prefTokenDuration} onChange={e => setPrefTokenDuration(Number(e.target.value))} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>Default: 300 seconds (5 minutes rotating dynamic QR)</span>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => showToast('success', t('common.success'), t('dialogs.saveSuccess'))}>
                      <Save size={16} /> {t('common.save')}
                    </button>
                  </div>
                )}

                {/* Dynamic Role-Permission Matrix */}
                {currentUser && currentUser.role === 'SUPER_ADMIN' && (
                  <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>{t('settings.rolePermissions')}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{t('settings.rolePermissionsDesc')}</p>
                    
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
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('settings.dbBackups')}</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={handleExportBackup}>
                        <Database size={16} /> {t('settings.downloadBackup')}
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
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>{t('laundry.subtitle')}</p>
                  </div>
                  <button className="btn btn-primary" onClick={loadLaundrySlots}>↻ {t('common.refresh')}</button>
                </div>

                {currentUser.role === 'STUDENT' && (
                  <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(16,185,129,0.04)' }}>
                    <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>📅 {t('laundry.bookSlot')}</h4>
                    <form onSubmit={handleBookLaundry}>
                      <div className="responsive-grid" style={{ marginBottom: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('common.date')}</label>
                          <input className="form-input" type="date" value={laundryDate} onChange={e => setLaundryDate(e.target.value)} required />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('laundry.timeSlot')}</label>
                          <select className="form-input" value={laundryTimeSlot} onChange={e => setLaundryTimeSlot(e.target.value)}>
                            <option>8:00 AM - 10:00 AM</option>
                            <option>10:00 AM - 12:00 PM</option>
                            <option>12:00 PM - 2:00 PM</option>
                            <option>2:00 PM - 4:00 PM</option>
                            <option>4:00 PM - 6:00 PM</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('laundry.clothesCount')}</label>
                          <input className="form-input" type="number" min="1" max="50" value={laundryClothes} onChange={e => setLaundryClothes(Number(e.target.value))} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('laundry.notes')}</label>
                          <input className="form-input" type="text" placeholder="e.g. Delicate items, handle with care" value={laundryNotes} onChange={e => setLaundryNotes(e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-primary" type="submit">{t('laundry.book')}</button>
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
                        <div style={{ fontWeight: 600 }}>{slot.user?.fullName || 'Student'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('common.room')}: {slot.user?.room?.roomNumber || 'N/A'}</span></div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {t('common.date')}: {new Date(slot.date).toLocaleDateString()} · {t('laundry.slot')}: {slot.timeSlot} · {t('laundry.quantity')}: {slot.clothesCount} {t('laundry.items')}
                        </div>
                        {slot.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('laundry.notes')}: {slot.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge ${slot.status === 'DELIVERED' ? 'badge-success' : slot.status === 'PICKED_UP' ? 'badge-info' : slot.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>{getStatusLabel(slot.status)}</span>
                        {['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && slot.status === 'BOOKED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLaundry(slot.id, 'PICKED_UP')}>{t('common.pickedUp')}</button>
                        )}
                        {['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && slot.status === 'PICKED_UP' && (
                          <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateLaundry(slot.id, 'DELIVERED')}>{t('common.delivered')}</button>
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
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Wrench size={22} color="var(--primary)" />
                      <span>{t('worker.dashboardTitle')}</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
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
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.pendingAcceptance || 0}</h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('worker.inProgress')}</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.inProgress || 0}</h3>
                  </div>
                  <div className="glass-panel stat-card" style={{ padding: '1.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('worker.completed')}</span>
                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.25rem' }}>{workerDashboardData?.metrics?.completed || 0}</h3>
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
                            {(c.status === 'PENDING' || c.status === 'ASSIGNED') && (
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
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Wrench size={20} color="var(--primary)" />
                      <span>{t('worker.title')}</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>Configure operational categories and register hostel workers</p>
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
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldAlert size={20} color="var(--danger)" />
                      <span>{t('emergency.history')}</span>
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>Audit trail of all emergency alerts and response lifecycle</p>
                  </div>
                  <button className="btn btn-primary" onClick={loadEmergencyAlerts}>↻ Refresh</button>
                </div>

                <div className="glass-panel" style={{ padding: '2rem' }}>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {emergencyAlertsList.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No emergency alerts recorded.</p>
                    ) : (
                      emergencyAlertsList.map((e: any) => (
                        <div key={e.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderLeft: `3px solid ${e.status === 'ACTIVE' ? 'var(--danger)' : e.status === 'ACKNOWLEDGED' ? 'var(--warning)' : 'var(--success)'}`, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <span className="badge badge-danger">{e.type}</span>
                                <span className="badge badge-info">{e.level} Level</span>
                                <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Location: {e.hostel?.name} - Room {e.roomNumber || 'N/A'}</h4>
                              </div>
                              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{e.message}</p>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span>Reported By: <strong>{e.reportedBy?.fullName || 'Student'}</strong> ({e.reportedBy?.mobileNumber || 'N/A'})</span>
                                <span>Time: {new Date(e.createdAt).toLocaleString()}</span>
                                {e.acknowledgedBy && <span>Ack By: <strong>{e.acknowledgedBy.fullName}</strong></span>}
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

          

            {/* GATE PASS MODULE */}
      {subView === 'gate_pass' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('gatePass.title')}</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>{t('gatePass.subtitle')}</p>
            </div>
            <button className="btn btn-secondary" onClick={loadGatePasses}>
              <RefreshCw size={14} /> {t('common.refresh')}
            </button>
          </div>

          {/* Student Request Pass Form */}
          {currentUser.role === 'STUDENT' && (
            <div style={{ padding: '1.5rem', background: 'var(--primary-soft)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('gatePass.requestPass')}</h4>
              <form onSubmit={handleCreateGatePass} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <input className="form-input" type="text" placeholder={t('gatePass.purposePlaceholder')} value={gpPurpose} onChange={e => setGpPurpose(e.target.value)} required />
                <input className="form-input" type="text" placeholder={t('gatePass.destinationPlaceholder')} value={gpDestination} onChange={e => setGpDestination(e.target.value)} required />
                <input className="form-input" type="datetime-local" value={gpExpectedReturn} onChange={e => setGpExpectedReturn(e.target.value)} required />
                <button className="btn btn-primary" type="submit">{t('gatePass.submitRequest')}</button>
              </form>
            </div>
          )}

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                className="form-input"
                type="text"
                placeholder={t('gatePass.searchPlaceholder')}
                value={gatePassSearch}
                onChange={e => setGatePassSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXITED', 'RETURNED'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`btn ${gatePassFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => setGatePassFilter(st)}
                >
                  {st === 'ALL' ? t('gatePass.all') : st === 'PENDING' ? t('gatePass.pending') : st === 'APPROVED' ? t('gatePass.approved') : st === 'REJECTED' ? t('gatePass.rejected') : st === 'EXITED' ? t('gatePass.exited') : t('gatePass.returned')}
                </button>
              ))}
            </div>
          </div>

          {/* Passes List */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {gatePasses
              .filter((gp: any) => {
                if (gatePassFilter !== 'ALL' && gp.status !== gatePassFilter) return false;
                if (gatePassSearch) {
                  const q = gatePassSearch.toLowerCase();
                  const studentName = (gp.user?.fullName || gp.student?.fullName || '').toLowerCase();
                  const regNo = (gp.user?.registerNumber || gp.student?.registerNumber || '').toLowerCase();
                  const dest = (gp.destination || '').toLowerCase();
                  const purp = (gp.purpose || '').toLowerCase();
                  return studentName.includes(q) || regNo.includes(q) || dest.includes(q) || purp.includes(q);
                }
                return true;
              })
              .length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>{t('gatePass.noPasses')}</p>
              </div>
            ) : (
              gatePasses
                .filter((gp: any) => {
                  if (gatePassFilter !== 'ALL' && gp.status !== gatePassFilter) return false;
                  if (gatePassSearch) {
                    const q = gatePassSearch.toLowerCase();
                    const studentName = (gp.user?.fullName || gp.student?.fullName || '').toLowerCase();
                    const regNo = (gp.user?.registerNumber || gp.student?.registerNumber || '').toLowerCase();
                    const dest = (gp.destination || '').toLowerCase();
                    const purp = (gp.purpose || '').toLowerCase();
                    return studentName.includes(q) || regNo.includes(q) || dest.includes(q) || purp.includes(q);
                  }
                  return true;
                })
                .map((gp: any) => {
                  const isMine = currentUser.role === 'STUDENT' && (gp.userId === currentUser.id || gp.studentId === currentUser.id);
                  return (
                    <div key={gp.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{gp.user?.fullName || gp.student?.fullName || 'Student'}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ({gp.user?.registerNumber || gp.student?.registerNumber || 'No Reg'}) · {t('rooms.roomNumber')}: {gp.user?.room?.roomNumber || gp.student?.room?.roomNumber || 'N/A'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                          <strong>{t('gatePass.destinationPlaceholder')}:</strong> {gp.destination} · <strong>{t('gatePass.purposePlaceholder')}:</strong> {gp.purpose}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Expected Return: {new Date(gp.expectedReturn).toLocaleString()}
                          {gp.exitTime && <span> · Exit: {new Date(gp.exitTime).toLocaleTimeString()}</span>}
                          {gp.actualReturn && <span> · Return: {new Date(gp.actualReturn).toLocaleTimeString()}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className={`badge ${gp.status === 'APPROVED' ? 'badge-success' : gp.status === 'REJECTED' ? 'badge-danger' : gp.status === 'EXITED' ? 'badge-info' : gp.status === 'RETURNED' ? 'badge-success' : 'badge-warning'}`}>{gp.status}</span>
                        
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }} onClick={() => setSelectedGatePassDetails(gp)}>
                          <QrCode size={13} /> {t('gatePass.viewDetails')}
                        </button>

                        {isMine && gp.status === 'PENDING' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => handleCancelGatePass(gp.id)}>
                            {t('gatePass.cancelPass')}
                          </button>
                        )}

                        {['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN', 'WARDEN'].includes(currentUser.role) && gp.status === 'PENDING' && (
                          <>
                            <button className="btn btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'APPROVED')}>{t('common.approved')}</button>
                            <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: 'var(--danger)' }} onClick={() => handleUpdateGatePass(gp.id, 'REJECTED')}>{t('common.rejected')}</button>
                          </>
                        )}
                        {['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'APPROVED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'EXITED')}>{t('gatePass.markExit')}</button>
                        )}
                        {['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role) && gp.status === 'EXITED' && (
                          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleUpdateGatePass(gp.id, 'RETURNED')}>{t('gatePass.markReturn')}</button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Gate Pass Details & QR Modal */}
          {selectedGatePassDetails && (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-content glass-panel" style={{ maxWidth: '440px', width: '90%', padding: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{t('gatePass.qrPass')}</h3>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setSelectedGatePassDetails(null)}>✕</button>
                </div>
                
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', width: '160px', height: '160px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GATEPASS:${selectedGatePassDetails.id}`}
                    alt="Gate Pass QR"
                    width="140"
                    height="140"
                  />
                </div>

                <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('students.student')}:</span><strong>{selectedGatePassDetails.user?.fullName || selectedGatePassDetails.student?.fullName}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('gatePass.destinationPlaceholder')}:</span><strong>{selectedGatePassDetails.destination}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>{t('gatePass.purposePlaceholder')}:</span><strong>{selectedGatePassDetails.purpose}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Status:</span><span className="badge badge-info">{selectedGatePassDetails.status}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Expected Return:</span><strong>{new Date(selectedGatePassDetails.expectedReturn).toLocaleString()}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedGatePassDetails(null)}>{t('common.close')}</button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html><head><title>Gate Pass - ${selectedGatePassDetails.user?.fullName || 'Student'}</title>
                          <style>body{font-family:sans-serif;padding:2rem;text-align:center;color:#111;}.card{border:2px solid #333;border-radius:12px;padding:2rem;max-width:400px;margin:0 auto;}</style></head>
                          <body><div class="card"><h2>SMARTHOSTEL GATE PASS</h2><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GATEPASS:${selectedGatePassDetails.id}" /><p><strong>Student:</strong> ${selectedGatePassDetails.user?.fullName || ''}</p><p><strong>Destination:</strong> ${selectedGatePassDetails.destination}</p><p><strong>Purpose:</strong> ${selectedGatePassDetails.purpose}</p><p><strong>Expected Return:</strong> ${new Date(selectedGatePassDetails.expectedReturn).toLocaleString()}</p></div><script>window.print();</script></body></html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                  >
                    <Printer size={14} /> {t('gatePass.printPass')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTICE BOARD */}
      {subView === 'notices' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('notices.title')}</h2>
            <button className="btn btn-secondary" onClick={loadNotices}>
              <RefreshCw size={14} /> {t('common.refresh')}
            </button>
          </div>

          {/* Post Notice Form */}
          {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
            <div style={{ padding: '1.5rem', background: 'var(--primary-soft)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '2rem' }}>
              <h4 style={{ fontWeight: 700, marginBottom: '1rem' }}>{t('notices.postNotice')}</h4>
              <form onSubmit={handleCreateNotice} style={{ display: 'grid', gap: '1rem' }}>
                <input className="form-input" type="text" placeholder={t('notices.noticeTitle')} value={noticeTitle} onChange={e => setNoticeTitle(e.target.value)} required />
                <textarea className="form-input" rows={3} placeholder={t('notices.noticeContentPlaceholder')} value={noticeContent} onChange={e => setNoticeContent(e.target.value)} style={{ resize: 'vertical' }} required />
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select className="form-input" style={{ width: 'auto' }} value={noticeAudience} onChange={e => setNoticeAudience(e.target.value)}>
                    <option value="ALL">{t('notices.allUsers')}</option>
                    <option value="STUDENTS">{t('notices.studentsOnly')}</option>
                    <option value="STAFF">{t('notices.staffOnly')}</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={noticeIsEmergency} onChange={e => setNoticeIsEmergency(e.target.checked)} />
                    {t('notices.emergencyAlert')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="checkbox" checked={noticeIsPinned} onChange={e => setNoticeIsPinned(e.target.checked)} />
                    {t('notices.pinNotice')}
                  </label>
                  <button className="btn btn-primary" type="submit">{t('notices.postNotice')}</button>
                </div>
              </form>
            </div>
          )}

          {/* Search and Filter Pills */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                className="form-input"
                type="text"
                placeholder={t('notices.searchNotices')}
                value={noticeSearch}
                onChange={e => setNoticeSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'STUDENTS', 'STAFF', 'EMERGENCY', 'PINNED'].map(f => (
                <button
                  key={f}
                  type="button"
                  className={`btn ${noticeFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => setNoticeFilter(f)}
                >
                  {f === 'ALL' ? t('gatePass.all') : f === 'STUDENTS' ? t('notices.studentsOnly') : f === 'STAFF' ? t('notices.staffOnly') : f === 'EMERGENCY' ? t('common.emergency') : t('notices.pinned')}
                </button>
              ))}
            </div>
          </div>

          {/* Notices Grid */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {notices
              .filter((notice: any) => {
                if (noticeFilter === 'STUDENTS' && notice.audience !== 'STUDENTS') return false;
                if (noticeFilter === 'STAFF' && notice.audience !== 'STAFF') return false;
                if (noticeFilter === 'EMERGENCY' && !notice.isEmergency) return false;
                if (noticeFilter === 'PINNED' && !notice.isPinned) return false;
                if (noticeSearch) {
                  const q = noticeSearch.toLowerCase();
                  return (notice.title || '').toLowerCase().includes(q) || (notice.content || '').toLowerCase().includes(q);
                }
                return true;
              })
              .length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Activity size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>{t('notices.noNotices')}</p>
              </div>
            ) : (
              notices
                .filter((notice: any) => {
                  if (noticeFilter === 'STUDENTS' && notice.audience !== 'STUDENTS') return false;
                  if (noticeFilter === 'STAFF' && notice.audience !== 'STAFF') return false;
                  if (noticeFilter === 'EMERGENCY' && !notice.isEmergency) return false;
                  if (noticeFilter === 'PINNED' && !notice.isPinned) return false;
                  if (noticeSearch) {
                    const q = noticeSearch.toLowerCase();
                    return (notice.title || '').toLowerCase().includes(q) || (notice.content || '').toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((notice: any) => (
                  <div key={notice.id} style={{ padding: '1.5rem', background: notice.isEmergency ? 'rgba(201,74,74,0.06)' : 'var(--bg-card)', border: `1px solid ${notice.isEmergency ? 'rgba(201,74,74,0.3)' : notice.isPinned ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {notice.isPinned && <span style={{ fontSize: '1rem' }}>📌</span>}
                        {notice.isEmergency && <span className="badge badge-danger">{t('common.emergency')}</span>}
                        <h4 style={{ fontWeight: 700 }}>{notice.title}</h4>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge badge-info">{notice.audience}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(notice.createdAt).toLocaleDateString()}</span>
                        
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedNoticeDetails(notice)}
                        >
                          <Info size={12} /> {t('common.details')}
                        </button>

                        {['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN'].includes(currentUser.role) && (
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                setSelectedNoticeForEdit(notice);
                                setEditNoticeTitle(notice.title);
                                setEditNoticeContent(notice.content);
                                setEditNoticeAudience(notice.audience);
                                setEditNoticeIsEmergency(!!notice.isEmergency);
                                setEditNoticeIsPinned(!!notice.isPinned);
                              }}
                            >
                              <Edit size={12} /> {t('notices.editNotice')}
                            </button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}
                              onClick={() => handleDeleteNotice(notice.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{notice.content}</p>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('notices.postedBy', { name: notice.postedBy || 'Administration' })}</div>
                  </div>
                ))
            )}
          </div>

          {/* View Notice Details Modal */}
          {selectedNoticeDetails && (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-content glass-panel" style={{ maxWidth: '520px', width: '90%', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {selectedNoticeDetails.isPinned && <span>📌</span>}
                    {selectedNoticeDetails.isEmergency && <span className="badge badge-danger">{t('common.emergency')}</span>}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>{selectedNoticeDetails.title}</h3>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => setSelectedNoticeDetails(null)}>✕</button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {selectedNoticeDetails.content}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  <span>Audience: <strong style={{ color: 'var(--text-main)' }}>{selectedNoticeDetails.audience}</strong></span>
                  <span>Posted: {new Date(selectedNoticeDetails.createdAt).toLocaleString()}</span>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSelectedNoticeDetails(null)}>{t('common.close')}</button>
              </div>
            </div>
          )}

          {/* Edit Notice Modal */}
          {selectedNoticeForEdit && (
            <div className="modal-overlay" style={{ zIndex: 1000 }}>
              <div className="modal-content glass-panel" style={{ maxWidth: '520px', width: '90%', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('notices.editNotice')}</h3>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }} onClick={() => setSelectedNoticeForEdit(null)}>✕</button>
                </div>
                <form onSubmit={handleUpdateNotice} style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('notices.noticeTitle')}</label>
                    <input className="form-input" type="text" value={editNoticeTitle} onChange={e => setEditNoticeTitle(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('notices.noticeContent')}</label>
                    <textarea className="form-input" rows={4} value={editNoticeContent} onChange={e => setEditNoticeContent(e.target.value)} style={{ resize: 'vertical' }} required />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select className="form-input" style={{ width: 'auto' }} value={editNoticeAudience} onChange={e => setEditNoticeAudience(e.target.value)}>
                      <option value="ALL">{t('notices.allUsers')}</option>
                      <option value="STUDENTS">{t('notices.studentsOnly')}</option>
                      <option value="STAFF">{t('notices.staffOnly')}</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={editNoticeIsEmergency} onChange={e => setEditNoticeIsEmergency(e.target.checked)} />
                      {t('notices.emergencyAlert')}
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={editNoticeIsPinned} onChange={e => setEditNoticeIsPinned(e.target.checked)} />
                      {t('notices.pinNotice')}
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedNoticeForEdit(null)}>{t('common.cancel')}</button>
                    <button type="submit" className="btn btn-primary">{t('common.save')}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NOTIFICATIONS */}
      {subView === 'notifications' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {t('notifications.title')} {unreadCount > 0 && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>{unreadCount}</span>}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={loadNotifications}>
                <RefreshCw size={14} /> {t('common.refresh')}
              </button>
              {unreadCount > 0 && (
                <button className="btn btn-primary" onClick={handleMarkAllRead}>
                  <CheckCheck size={14} /> {t('notifications.markAllRead')}
                </button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <input
                className="form-input"
                type="text"
                placeholder={t('gatePass.searchPlaceholder')}
                value={notifSearch}
                onChange={e => setNotifSearch(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'UNREAD', 'EMERGENCY', 'COMPLAINTS', 'LEAVE', 'ATTENDANCE', 'GATE_PASS'].map(flt => (
                <button
                  key={flt}
                  type="button"
                  className={`btn ${notifFilter === flt ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => setNotifFilter(flt)}
                >
                  {flt === 'ALL' ? t('gatePass.all') : flt === 'UNREAD' ? 'Unread' : flt}
                </button>
              ))}
            </div>
          </div>

          {/* Notification Items */}
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {notifications
              .filter((notif: any) => {
                if (notifFilter === 'UNREAD' && notif.isRead) return false;
                if (notifFilter === 'EMERGENCY' && !notif.title?.toLowerCase().includes('emergency') && !notif.message?.toLowerCase().includes('emergency')) return false;
                if (notifSearch) {
                  const q = notifSearch.toLowerCase();
                  return (notif.title || '').toLowerCase().includes(q) || (notif.message || '').toLowerCase().includes(q);
                }
                return true;
              })
              .length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>{t('notifications.noNotifications')}</p>
              </div>
            ) : (
              notifications
                .filter((notif: any) => {
                  if (notifFilter === 'UNREAD' && notif.isRead) return false;
                  if (notifFilter === 'EMERGENCY' && !notif.title?.toLowerCase().includes('emergency') && !notif.message?.toLowerCase().includes('emergency')) return false;
                  if (notifSearch) {
                    const q = notifSearch.toLowerCase();
                    return (notif.title || '').toLowerCase().includes(q) || (notif.message || '').toLowerCase().includes(q);
                  }
                  return true;
                })
                .map((notif: any) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkNotificationRead(notif.id)}
                    style={{
                      padding: '1rem 1.25rem',
                      background: notif.isRead ? 'var(--bg-card)' : 'var(--primary-soft)',
                      border: `1px solid ${notif.isRead ? 'var(--border-color)' : 'var(--primary)'}`,
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {!notif.isRead && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }}></span>}
                        <span>{notif.title}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{notif.message}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(notif.createdAt).toLocaleDateString()}</span>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.3rem', color: 'var(--text-muted)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notif.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* MESS MENU MODULE */}
      {subView === 'mess_menu' && currentUser && (
        <div className="glass-panel animate-slide-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('mess.weeklyMenu')}</h2>
            <button className="btn btn-secondary" onClick={loadMessMenus}>
              <RefreshCw size={14} /> Refresh
            </button>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{t('reports.title')}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{t('reports.subtitle')}</p>
            </div>
            {reportData && (
              <button className="btn btn-primary" onClick={handleExportReportCSV}>
                <Download size={14} /> {t('reports.exportCsv')}
              </button>
            )}
          </div>

          {/* Report Type Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'fees', label: t('reports.feeCollection') },
              { id: 'attendance', label: t('reports.attendanceReport') },
              { id: 'occupancy', label: t('reports.roomOccupancy') },
              { id: 'complaints', label: t('reports.complaintsSummary') },
              { id: 'leaves', label: t('reports.leaveRequests') },
              { id: 'gatePasses', label: t('reports.gatePasses') }
            ].map(rt => (
              <button
                key={rt.id}
                type="button"
                className={`btn ${reportType === rt.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                onClick={() => {
                  setReportType(rt.id);
                  setReportData(null);
                }}
              >
                {rt.label}
              </button>
            ))}
          </div>

          {/* Date Range Filters and Generate Button */}
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('reports.startDate')}</label>
              <input className="form-input" type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('reports.endDate')}</label>
              <input className="form-input" type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>{t('reports.searchRecords')}</label>
              <input className="form-input" type="text" placeholder="Filter rows..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} style={{ width: '180px' }} />
            </div>
            <button className="btn btn-primary" onClick={handleGenerateReport} disabled={reportLoading} style={{ height: '40px' }}>
              <Search size={14} /> {reportLoading ? t('reports.generating') : t('reports.generateReport')}
            </button>
          </div>

          {/* Generated Report Data Display */}
          {reportData && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Metric Summary Cards */}
              {reportData.summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  {Object.entries(reportData.summary).map(([key, val]) => (
                    <div key={key} className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.25rem' }}>
                        {typeof val === 'number' && (key.includes('Due') || key.includes('Collected') || key.includes('outstanding') || key.includes('amount')) ? '₹' + Number(val).toLocaleString() : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Data Tables for each Report Type */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                      {reportType === 'fees' && ['Student', 'Reg No', 'Fee Head', 'Amount', 'Paid', 'Status', 'Due Date'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'attendance' && ['Student', 'Reg No', 'Room', 'Date', 'Status', 'Session'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'occupancy' && ['Block', 'Room', 'Category', 'Capacity', 'Occupied', 'Available'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'complaints' && ['Ticket Title', 'Category', 'Priority', 'Status', 'Student', 'Assigned Worker', 'Date'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'leaves' && ['Student', 'Reg No', 'Reason', 'Start Date', 'End Date', 'Status'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                      {reportType === 'gatePasses' && ['Student', 'Reg No', 'Purpose', 'Destination', 'Status', 'Expected Return', 'Exit Time'].map(h => <th key={h} style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Fees Rows */}
                    {reportType === 'fees' && reportData.fees
                      ?.filter((f: any) => {
                        if (!reportSearch) return true;
                        const q = reportSearch.toLowerCase();
                        return (f.student?.fullName || '').toLowerCase().includes(q) || (f.title || '').toLowerCase().includes(q) || (f.status || '').toLowerCase().includes(q);
                      })
                      .map((f: any) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{f.student?.fullName || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{f.student?.registerNumber || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{f.title}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>₹{f.amount.toLocaleString()}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: '#10b981' }}>₹{f.paidAmount.toLocaleString()}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${f.status === 'PAID' ? 'badge-success' : f.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>{f.status}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{new Date(f.dueDate).toLocaleDateString()}</td>
                        </tr>
                      ))}

                    {/* Attendance Rows */}
                    {reportType === 'attendance' && reportData.records
                      ?.filter((r: any) => {
                        if (!reportSearch) return true;
                        const q = reportSearch.toLowerCase();
                        return (r.user?.fullName || '').toLowerCase().includes(q) || (r.user?.registerNumber || '').toLowerCase().includes(q);
                      })
                      .map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.user?.fullName || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{r.user?.registerNumber || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{r.user?.room?.roomNumber || 'N/A'}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(r.date).toLocaleDateString()}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${r.isPresent ? 'badge-success' : 'badge-danger'}`}>{r.isPresent ? 'Present' : 'Absent'}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{r.session || 'Morning'}</td>
                        </tr>
                      ))}

                    {/* Occupancy Rows */}
                    {reportType === 'occupancy' && reportData.rooms
                      ?.filter((r: any) => {
                        if (!reportSearch) return true;
                        const q = reportSearch.toLowerCase();
                        return (r.block || '').toLowerCase().includes(q) || (r.roomNumber || '').toLowerCase().includes(q);
                      })
                      .map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.block}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{r.roomNumber}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-info">{r.category}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{r.capacity}</td>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{r.occupied}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span style={{ color: r.available === 0 ? 'var(--danger)' : 'var(--accent)', fontWeight: 700 }}>{r.available}</span></td>
                        </tr>
                      ))}

                    {/* Complaints Rows */}
                    {reportType === 'complaints' && reportData.complaints
                      ?.filter((c: any) => {
                        if (!reportSearch) return true;
                        const q = reportSearch.toLowerCase();
                        return (c.title || '').toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q) || (c.student?.fullName || '').toLowerCase().includes(q);
                      })
                      .map((c: any) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{c.title}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className="badge badge-info">{c.category}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${c.priority === 'URGENT' ? 'badge-danger' : c.priority === 'HIGH' ? 'badge-warning' : 'badge-info'}`}>{c.priority}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : c.status === 'IN_PROGRESS' ? 'badge-info' : 'badge-warning'}`}>{c.status}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{c.student?.fullName || 'Student'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{c.worker?.fullName || 'Unassigned'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}

                    {/* Leaves Rows */}
                    {reportType === 'leaves' && reportData.leaves
                      ?.filter((l: any) => {
                        if (!reportSearch) return true;
                        const q = reportSearch.toLowerCase();
                        return (l.user?.fullName || '').toLowerCase().includes(q) || (l.reason || '').toLowerCase().includes(q);
                      })
                      .map((l: any) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{l.user?.fullName || 'Student'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{l.user?.registerNumber || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{l.reason}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(l.startDate).toLocaleDateString()}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(l.endDate).toLocaleDateString()}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span></td>
                        </tr>
                      ))}

                    {/* Gate Passes Rows */}
                    {reportType === 'gatePasses' && reportData.gatePasses
                      ?.filter((gp: any) => {
                        if (!reportSearch) return true;
                        const q = reportSearch.toLowerCase();
                        return (gp.student?.fullName || '').toLowerCase().includes(q) || (gp.destination || '').toLowerCase().includes(q);
                      })
                      .map((gp: any) => (
                        <tr key={gp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{gp.student?.fullName || 'Student'}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{gp.student?.registerNumber || '-'}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{gp.purpose}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{gp.destination}</td>
                          <td style={{ padding: '0.6rem 0.75rem' }}><span className={`badge ${gp.status === 'APPROVED' ? 'badge-success' : gp.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>{gp.status}</span></td>
                          <td style={{ padding: '0.6rem 0.75rem' }}>{new Date(gp.expectedReturn).toLocaleString()}</td>
                          <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{gp.exitTime ? new Date(gp.exitTime).toLocaleTimeString() : '-'}</td>
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

      {/* ─── ADMISSIONS (Phase 3+4) ─── */}
      {subView === 'admissions' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN'].includes(currentUser.role) && (
        <AdmissionsPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── ACADEMIC YEARS (Phase 1+2) ─── */}
      {subView === 'academic_years' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN'].includes(currentUser.role) && (
        <AcademicYearPanel currentUser={currentUser} showToast={showToast} />
      )}

      {/* ─── BED MANAGEMENT (Phase 1+2) ─── */}
      {subView === 'bed_management' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN'].includes(currentUser.role) && (
        <BedManagementPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── ASSETS (Phase 5) ─── */}
      {subView === 'assets' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN'].includes(currentUser.role) && (
        <AssetManagementPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── INSPECTIONS (Phase 6+7) ─── */}
      {subView === 'inspections' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN'].includes(currentUser.role) && (
        <InspectionsPanel currentUser={currentUser} showToast={showToast} hostels={hostels} rooms={rooms} />
      )}

      {/* ─── INCIDENTS (Phase 13) ─── */}
      {subView === 'incidents' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN','WARDEN','SECURITY'].includes(currentUser.role) && (
        <IncidentPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── HOSTEL CONFIG (Phase 16) ─── */}
      {subView === 'hostel_config' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN'].includes(currentUser.role) && (
        <HostelConfigPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── DIGITAL HOSTEL ID (Phase 15) ─── */}
      {subView === 'hostel_id' && currentUser && currentUser.role === 'STUDENT' && (
        <DigitalIDPanel currentUser={currentUser} showToast={showToast} />
      )}

      {/* ─── LIVE TRACKING (Phase 19+20) ─── */}
      {subView === 'live_tracking' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN','WARDEN','SECURITY'].includes(currentUser.role) && (
        <LiveTrackingPanel currentUser={currentUser} showToast={showToast} />
      )}

      {/* ─── PREVENTIVE MAINTENANCE (Phase 7) ─── */}
      {subView === 'preventive_maintenance' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN','MAINTENANCE'].includes(currentUser.role) && (
        <PreventiveMaintenancePanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── MESS WASTE & DEMAND FORECAST (Phase 9+10) ─── */}
      {subView === 'mess_waste' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN','MESS_MANAGER'].includes(currentUser.role) && (
        <MessWasteForecastPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── INVENTORY LEDGER (Phase 11) ─── */}
      {subView === 'inventory_ledger' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','MESS_MANAGER'].includes(currentUser.role) && (
        <InventoryLedgerPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── FEE STRUCTURES (Phase 12) ─── */}
      {subView === 'fee_structures' && currentUser && ['SUPER_ADMIN','HOSTEL_ADMIN','ACCOUNTANT'].includes(currentUser.role) && (
        <FeeStructurePanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

      {/* ─── GUARDIAN PORTAL (Phase 17) ─── */}
      {subView === 'guardian_portal' && currentUser && (
        <GuardianPortalPanel currentUser={currentUser} showToast={showToast} hostels={hostels} />
      )}

          </main>

          {/* Mobile Bottom Navigation */}
          {currentUser && (
            <nav className="bottom-nav">
              {currentUser.role === 'STUDENT' && (
                <>
                  <button className={`bottom-nav-item ${subView === 'dashboard' ? 'active' : ''}`} onClick={() => setSubView('dashboard')}><Grid size={18}/><span>Home</span></button>
                  <button className={`bottom-nav-item ${subView === 'leave' ? 'active' : ''}`} onClick={() => setSubView('leave')}><Calendar size={18}/><span>Leave</span></button>
                  <button className={`bottom-nav-item ${subView === 'attendance' ? 'active' : ''}`} onClick={() => setSubView('attendance')}><QrCode size={18}/><span>Attend</span></button>
                  <button className={`bottom-nav-item ${subView === 'gate_pass' ? 'active' : ''}`} onClick={() => setSubView('gate_pass')}><Shield size={18}/><span>Gate</span></button>
                  <button className={`bottom-nav-item ${subView === 'profile' ? 'active' : ''}`} onClick={() => setSubView('profile')}><User size={18}/><span>Profile</span></button>
                </>
              )}
              {['SUPER_ADMIN','HOSTEL_ADMIN','ASSISTANT_WARDEN','WARDEN'].includes(currentUser.role) && (
                <>
                  <button className={`bottom-nav-item ${subView === 'dashboard' ? 'active' : ''}`} onClick={() => setSubView('dashboard')}><Grid size={18}/><span>Home</span></button>
                  <button className={`bottom-nav-item ${subView === 'students' ? 'active' : ''}`} onClick={() => setSubView('students')}><Users size={18}/><span>Students</span></button>
                  <button className={`bottom-nav-item ${subView === 'live_tracking' ? 'active' : ''}`} onClick={() => setSubView('live_tracking')}><Activity size={18}/><span>Track</span></button>
                  <button className={`bottom-nav-item ${subView === 'attendance' ? 'active' : ''}`} onClick={() => setSubView('attendance')}><QrCode size={18}/><span>Scan</span></button>
                  <button className={`bottom-nav-item ${subView === 'emergencies' ? 'active' : ''}`} onClick={() => setSubView('emergencies')}><ShieldAlert size={18}/><span>Alert</span></button>
                </>
              )}
              {currentUser.role === 'WORKER' && (
                <>
                  <button className={`bottom-nav-item ${subView === 'worker_dashboard' ? 'active' : ''}`} onClick={() => setSubView('worker_dashboard')}><Wrench size={18}/><span>Tasks</span></button>
                  <button className={`bottom-nav-item ${subView === 'profile' ? 'active' : ''}`} onClick={() => setSubView('profile')}><User size={18}/><span>Profile</span></button>
                </>
              )}
              {currentUser.role === 'SECURITY' && (
                <>
                  <button className={`bottom-nav-item ${subView === 'dashboard' ? 'active' : ''}`} onClick={() => setSubView('dashboard')}><Grid size={18}/><span>Home</span></button>
                  <button className={`bottom-nav-item ${subView === 'live_tracking' ? 'active' : ''}`} onClick={() => setSubView('live_tracking')}><Activity size={18}/><span>Track</span></button>
                  <button className={`bottom-nav-item ${subView === 'profile' ? 'active' : ''}`} onClick={() => setSubView('profile')}><User size={18}/><span>Profile</span></button>
                </>
              )}
            </nav>
          )}
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
                  <Camera size={16} /> {t('camera.openCamera')}
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={stopCameraStream}>
                  <CameraOff size={16} /> {t('common.close')}
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
                <input className="form-input" type="text" placeholder={t('qrTerminal.tokenPlaceholder')} value={manualScanInput} onChange={e => setManualScanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && manualScanInput && (handleQRScan(manualScanInput), setManualScanInput(''))} />
                <button className="btn btn-primary" onClick={() => { if (manualScanInput) { handleQRScan(manualScanInput); setManualScanInput(''); } }}>{t('common.submit')}</button>
              </div>
            </div>

            {/* Quick mock Check-In/Out fallback for development */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={() => handleQRCheckIn(currentUser?.hostelId || hostels[0]?.id || '')}>
                {t('attendance.checkIn')}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.8rem' }} onClick={handleQRCheckOut}>
                {t('attendance.checkOut')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visitor QR Pass Modal */}
      {activeVisitorForQR && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setActiveVisitorForQR(null)}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>{t('visitors.entryPass')}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('tables.id')}: {activeVisitorForQR.id}</span>
            <div style={{ margin: '0 auto', background: '#ffffff', padding: '0.75rem', borderRadius: '12px', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QRCodeSVG 
                value={JSON.stringify({ type: 'visitor_pass', id: activeVisitorForQR.id, name: activeVisitorForQR.name, date: activeVisitorForQR.visitDate })} 
                size={140} 
                level="M"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div><strong style={{ color: 'var(--text-muted)' }}>{t('visitors.name')}:</strong> {activeVisitorForQR.name}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>{t('visitors.purpose')}:</strong> {activeVisitorForQR.purpose}</div>
              <div><strong style={{ color: 'var(--text-muted)' }}>{t('visitors.expectedDate')}:</strong> {new Date(activeVisitorForQR.visitDate).toLocaleDateString()}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => setActiveVisitorForQR(null)}>{t('common.close')}</button>
          </div>
        </div>
      )}

      {/* Selected Room Details Modal */}
      {selectedRoom && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedRoom(null)}>
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '460px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{t('rooms.roomNumber')} {selectedRoom.roomNumber}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('rooms.block')} {selectedRoom.block} · {t('rooms.floor')} {selectedRoom.floor}</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setSelectedRoom(null)}><X size={16} /></button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} color="var(--primary)" /> {t('hostel.students')} ({selectedRoom.users?.length || 0} / {selectedRoom.capacity || 4})
              </h4>

              {(!selectedRoom.users || selectedRoom.users.length === 0) ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('common.noData')}</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {selectedRoom.users.map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('auth.registerNumber')}: {u.registerNumber || 'N/A'} · {t('auth.department')}: {u.department || 'N/A'}</div>
                      </div>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => { setSelectedRoom(null); setSelectedStudentProfile(u); }}>
                        {t('students.profile')} <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={() => setSelectedRoom(null)}>{t('common.close')}</button>
          </div>
        </div>
      )}

      {/* Student 360° Profile Modal */}
      {selectedStudentProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedStudentProfile(null)}>
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-contrast)' }}>
                  {selectedStudentProfile.fullName?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedStudentProfile.fullName}
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{selectedStudentProfile.status}</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <span>{t('auth.registerNumber')}: {selectedStudentProfile.registerNumber || 'STU-001'}</span> ·
                    <span>{t('rooms.roomNumber')}: {selectedStudentProfile.room?.roomNumber || 'Unassigned'}</span>
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
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{t('auth.email')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.email}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={12} /> {t('auth.mobile')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.mobileNumber || 'Not provided'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>Blood Group</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem', color: '#ef4444' }}>{selectedStudentProfile.bloodGroup || 'O+'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)', gridColumn: 'span 2' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={12} /> {t('auth.address')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.address || 'Address on file'}</div>
                </div>
              </div>
            )}

            {profileTab === 'academic' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}><GraduationCap size={12} /> {t('auth.college')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.collegeName || 'Engineering Campus'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{t('auth.department')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.department || 'Computer Science'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{t('auth.year')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.year || '3rd Year'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{t('auth.registerNumber')}</div>
                  <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedStudentProfile.registerNumber || 'REG-2026-99'}</div>
                </div>
              </div>
            )}

            {profileTab === 'hostel' && (
              <div style={{ display: 'grid', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{t('hostel.name')}</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedStudentProfile.hostel?.name || 'Main Hostel Facility'}</div>
                  </div>
                  <Building2 size={24} color="var(--primary)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>{t('rooms.roomNumber')}</div>
                    <div style={{ fontWeight: 700, marginTop: '0.2rem', color: 'var(--primary)' }}>{t('rooms.roomNumber')} {selectedStudentProfile.room?.roomNumber || 'Not assigned'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>QR Token</div>
                    <div style={{ fontWeight: 600, marginTop: '0.2rem', color: selectedStudentProfile.qrToken ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCheck size={14} /> {selectedStudentProfile.qrToken ? t('common.active') : t('common.pending')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'leaves' && (
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                {leavesHistory.filter((l: any) => l.userId === selectedStudentProfile.id).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>{t('common.noData')}</p>
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
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>{t('common.noData')}</p>
                ) : (
                  complaints.filter((c: any) => c.userId === selectedStudentProfile.id).map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('tables.category')}: {c.category}</div>
                      </div>
                      <span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>{c.status}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setSelectedStudentProfile(null)}>{t('common.close')}</button>
          </div>
        </div>
      )}

      {/* MODAL: EDIT HOSTEL */}
      {showEditHostelModal && editingHostel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Edit Hostel Details</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowEditHostelModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpdateHostel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hostel Name</label>
                <input className="form-input" type="text" value={editingHostel.name} onChange={e => setEditingHostel({ ...editingHostel, name: e.target.value })} required />
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Code</label>
                  <input className="form-input" type="text" value={editingHostel.code} onChange={e => setEditingHostel({ ...editingHostel, code: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gender Category</label>
                  <select className="form-input" value={editingHostel.gender || 'MIXED'} onChange={e => setEditingHostel({ ...editingHostel, gender: e.target.value })}>
                    <option value="MIXED">Mixed</option>
                    <option value="MALE">Male Only</option>
                    <option value="FEMALE">Female Only</option>
                  </select>
                </div>
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>College Name</label>
                  <input className="form-input" type="text" value={editingHostel.collegeName} onChange={e => setEditingHostel({ ...editingHostel, collegeName: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Total Capacity</label>
                  <input className="form-input" type="number" value={editingHostel.capacity} onChange={e => setEditingHostel({ ...editingHostel, capacity: e.target.value })} required />
                </div>
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Phone</label>
                  <input className="form-input" type="tel" value={editingHostel.phone || ''} onChange={e => setEditingHostel({ ...editingHostel, phone: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email</label>
                  <input className="form-input" type="email" value={editingHostel.email || ''} onChange={e => setEditingHostel({ ...editingHostel, email: e.target.value })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Address</label>
                <input className="form-input" type="text" value={editingHostel.address} onChange={e => setEditingHostel({ ...editingHostel, address: e.target.value })} required />
              </div>
              <button className="btn btn-primary" type="submit">Save Hostel Details</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT ALLOCATION */}
      {showAllocateModal && selectedStudentForAllocate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '460px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Allocate Room & Bed</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowAllocateModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 800 }}>{selectedStudentForAllocate.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reg No: {selectedStudentForAllocate.registerNumber || 'STU-NEW'} | Dept: {selectedStudentForAllocate.department || 'General'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>1. Select Hostel *</label>
                <select className="form-input" value={allocHostelId} onChange={e => setAllocHostelId(e.target.value)}>
                  <option value="">-- Choose Hostel --</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>2. Select Room *</label>
                <select className="form-input" value={allocRoomId} onChange={e => setAllocRoomId(e.target.value)}>
                  <option value="">-- Choose Available Room --</option>
                  {rooms
                    .filter(r => (!allocHostelId || r.hostelId === allocHostelId) && !r.isMaintenance && (r.users?.length || 0) < r.capacity)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Block {r.block} - Room {r.roomNumber} (Flr {r.floor}, {r.category}) - Free: {r.capacity - (r.users?.length || 0)} beds
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>3. Bed Number (Optional)</label>
                <input className="form-input" type="text" placeholder="e.g. Bed-1, Bed-A" value={allocBedNumber} onChange={e => setAllocBedNumber(e.target.value)} />
              </div>

              <button className="btn btn-primary" onClick={handleAllocateStudent}>Confirm Allocation</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ROOM TRANSFER */}
      {showTransferModal && selectedStudentForTransfer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Student Room Transfer</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowTransferModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 800 }}>{selectedStudentForTransfer.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Current Location: <strong style={{ color: 'var(--warning)' }}>Room {selectedStudentForTransfer.room?.roomNumber || 'Unassigned'} ({selectedStudentForTransfer.room?.block || 'N/A'})</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Target Room *</label>
                <select className="form-input" value={targetRoomId} onChange={e => setTargetRoomId(e.target.value)}>
                  <option value="">-- Choose New Room --</option>
                  {rooms
                    .filter(r => r.id !== selectedStudentForTransfer.roomId && !r.isMaintenance && (r.users?.length || 0) < r.capacity)
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        {r.hostel?.name || 'Hostel'} - Block {r.block}, Room {r.roomNumber} ({r.users?.length || 0}/{r.capacity})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Target Bed Number</label>
                <input className="form-input" type="text" placeholder="e.g. Bed-2" value={targetBedNumber} onChange={e => setTargetBedNumber(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Reason for Transfer</label>
                <input className="form-input" type="text" placeholder="e.g. Mutual swap, Maintenance, Medical reason" value={transferReason} onChange={e => setTransferReason(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Remarks</label>
                <textarea className="form-input" rows={2} placeholder="Additional notes" value={transferRemarks} onChange={e => setTransferRemarks(e.target.value)} />
              </div>

              <button className="btn btn-primary" onClick={handleTransferStudent}>Execute Room Transfer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT CHECK-OUT */}
      {showCheckOutModal && selectedStudentForCheckOut && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger)' }}>Process Student Check-Out</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowCheckOutModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 800 }}>{selectedStudentForCheckOut.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Releasing Room: <strong>{selectedStudentForCheckOut.room?.roomNumber || 'N/A'}</strong></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Check-Out Date</label>
                <input className="form-input" type="date" value={checkOutDateInput} onChange={e => setCheckOutDateInput(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Reason</label>
                <select className="form-input" value={checkOutReasonInput} onChange={e => setCheckOutReasonInput(e.target.value)}>
                  <option value="Routine Check-out">Routine Check-out</option>
                  <option value="Course Completion">Course Completion / Graduation</option>
                  <option value="Hostel Withdrawal">Hostel Withdrawal</option>
                  <option value="Disciplinary">Disciplinary Action</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Remarks</label>
                <textarea className="form-input" rows={2} placeholder="Check-out remarks" value={checkOutRemarksInput} onChange={e => setCheckOutRemarksInput(e.target.value)} />
              </div>

              <button className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleCheckOutStudent}>Confirm Check-Out</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAY FEE */}
      {showPayFeeModal && selectedFeeForPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Record Fee Payment</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowPayFeeModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{selectedFeeForPay.title}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student: {selectedFeeForPay.student?.fullName || 'Student'}</div>
              <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span>Total Fee: <strong>Rs. {selectedFeeForPay.amount}</strong></span>
                <span>Paid So Far: <strong style={{ color: 'var(--success)' }}>Rs. {selectedFeeForPay.paidAmount || 0}</strong></span>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.2rem' }}>
                Outstanding Balance: Rs. {selectedFeeForPay.amount - (selectedFeeForPay.paidAmount || 0)}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Payment Amount (Rs.) *</label>
                <input className="form-input" type="number" placeholder={`Max Rs. ${selectedFeeForPay.amount - (selectedFeeForPay.paidAmount || 0)}`} value={payAmountInput} onChange={e => setPayAmountInput(e.target.value)} required />
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Mode *</label>
                  <select className="form-input" value={payModeInput} onChange={e => setPayModeInput(e.target.value)}>
                    <option value="UPI">UPI / GPay</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="NET_BANKING">Net Banking</option>
                    <option value="CHEQUE">Cheque / DD</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Transaction ID / Ref</label>
                  <input className="form-input" type="text" placeholder="e.g. TXN987654" value={payTransactionIdInput} onChange={e => setPayTransactionIdInput(e.target.value)} />
                </div>
              </div>

              <button className="btn btn-primary" onClick={handlePayFeePartial}>Record Payment & Issue Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE RECEIPT */}
      {showReceiptModal && selectedPaymentForReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#ffffff', color: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e293b' }}>HOSTEL FEE PAYMENT RECEIPT</h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Official System Generated Receipt</span>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.3rem', color: '#000' }} onClick={() => setShowReceiptModal(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>RECEIPT NO</span>
                <div style={{ fontWeight: 800, color: '#2563eb' }}>{selectedPaymentForReceipt.receiptNumber}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>DATE & TIME</span>
                <div style={{ fontWeight: 700 }}>{new Date(selectedPaymentForReceipt.createdAt).toLocaleString()}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>STUDENT</span>
                <div style={{ fontWeight: 700 }}>{selectedPaymentForReceipt.student?.fullName || 'Student'}</div>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>PAYMENT MODE</span>
                <div style={{ fontWeight: 700 }}>{selectedPaymentForReceipt.paymentMode}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>AMOUNT RECEIVED</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#16a34a' }}>Rs. {selectedPaymentForReceipt.amount}</span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
              Transaction Ref: {selectedPaymentForReceipt.transactionId || 'N/A'}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>
                <Printer size={16} /> Print Receipt
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, color: '#0f172a' }} onClick={() => setShowReceiptModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG DAMAGED INVENTORY */}
      {showDamageModal && selectedInventoryForDamage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--warning)' }}>Log Damaged Stock</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowDamageModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 800 }}>{selectedInventoryForDamage.itemName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Available Stock: {selectedInventoryForDamage.quantity} {selectedInventoryForDamage.unit}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Damaged Quantity ({selectedInventoryForDamage.unit}) *</label>
                <input className="form-input" type="number" min={1} max={selectedInventoryForDamage.quantity} value={damageQtyInput} onChange={e => setDamageQtyInput(Number(e.target.value))} required />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Reason / Details</label>
                <input className="form-input" type="text" placeholder="e.g. Expired, Broken during handling" value={damageReasonInput} onChange={e => setDamageReasonInput(e.target.value)} />
              </div>

              <button className="btn btn-primary" style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={handleDamageInventory}>Log Damaged Stock</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET TEST USER PASSWORD */}
      {showResetPassModal && selectedUserForResetPass && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Reset User Password</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowResetPassModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.875rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 800 }}>{selectedUserForResetPass.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedUserForResetPass.email} · Role: <strong>{selectedUserForResetPass.role}</strong></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>New Test Password *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-input" type="text" value={newTestPasswordInput} onChange={e => setNewTestPasswordInput(e.target.value)} required style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem' }}
                    title="Copy password"
                    onClick={() => handleCopyToClipboard(newTestPasswordInput, 'Password')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  🔒 Password will be securely hashed with argon2. Plaintext is never stored.
                </span>
              </div>

              <button className="btn btn-primary" onClick={handleResetUserPassword}>Set New Password</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER */}
      {showEditUserModal && selectedUserForEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Edit User</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowEditUserModal(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Full Name</label>
                <input className="form-input" type="text" value={editUserFullName} onChange={e => setEditUserFullName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Username (Email)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className="form-input" type="text" value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Copy username" onClick={() => handleCopyToClipboard(editUserEmail, 'Username')}>
                    <Copy size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Mobile Number</label>
                <input className="form-input" type="text" value={editUserMobile} onChange={e => setEditUserMobile(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Department</label>
                <input className="form-input" type="text" value={editUserDept} onChange={e => setEditUserDept(e.target.value)} />
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Role</label>
                  <select className="form-input" value={editUserRole} onChange={e => setEditUserRole(e.target.value)}>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="HOSTEL_ADMIN">Hostel Admin</option>
                    <option value="WARDEN">Warden</option>
                    <option value="ASSISTANT_WARDEN">Assistant Warden</option>
                    <option value="MESS_MANAGER">Mess Manager</option>
                    <option value="SECURITY">Security</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="WORKER">Worker</option>
                    <option value="STAFF">Staff</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'block' }}>Hostel</label>
                  <select className="form-input" value={editUserHostelId} onChange={e => setEditUserHostelId(e.target.value)}>
                    <option value="">-- Unassigned --</option>
                    {hostels.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleSaveEditUser}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEV SEEDING & RESET CONTROL PANEL */}
      {showSeedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel animate-slide-up" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={22} color="var(--primary)" /> Seed 30-Day Development & Test Data
              </h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowSeedModal(false)}><X size={16} /></button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Populates realistic, interconnected historical data (previous 30 days → today) across all modules (Hostels, Rooms, Beds, Students, Attendance, Leaves, Complaints, Fees, Payments, Mess, Visitors, Inventory, Payroll, Activity Logs).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>1. Select Dataset Size Preset</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { id: 'small', title: 'Small (Dev)', desc: '50 Students, 2 Hostels, 80 Beds' },
                    { id: 'medium', title: 'Medium (Standard)', desc: '250 Students, 4 Hostels, 400 Beds' },
                    { id: 'large', title: 'Large (Perf)', desc: '1,000 Students, 8 Hostels, 2,000 Beds' }
                  ].map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSeedSizeInput(item.id as any)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: seedSizeInput === item.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        background: seedSizeInput === item.id ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.01)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{item.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={seedClearInput} onChange={e => setSeedClearInput(e.target.checked)} />
                <span>Clear existing test records before seeding (Recommended)</span>
              </label>

              <button
                className="btn btn-primary"
                disabled={seedLoading}
                onClick={handleTriggerDevSeed}
                style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {seedLoading ? '🌱 Seeding 30-Day Historical Data (Please wait)...' : '🚀 Trigger Seeding Engine'}
              </button>
            </div>

            {/* Seed Report Summary Card */}
            {latestSeedReport && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid var(--success)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.95rem' }}>
                    ✅ Seeding Completed ({latestSeedReport.durationMs}ms)
                  </h4>
                  <span className="badge badge-success">Validation Passed</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <div>Hostels: <strong>{latestSeedReport.counts.hostels}</strong></div>
                  <div>Rooms: <strong>{latestSeedReport.counts.rooms}</strong></div>
                  <div>Beds: <strong>{latestSeedReport.counts.beds}</strong></div>
                  <div>Occupancy: <strong>{latestSeedReport.counts.occupancyPercentage}%</strong></div>
                  <div>Students: <strong>{latestSeedReport.counts.students}</strong></div>
                  <div>Attendance: <strong>{latestSeedReport.counts.attendanceRecords}</strong></div>
                  <div>Leaves: <strong>{latestSeedReport.counts.leaveRecords}</strong></div>
                  <div>Complaints: <strong>{latestSeedReport.counts.complaints}</strong></div>
                  <div>Paid Fees: <strong>Rs. {latestSeedReport.counts.totalPaidAmount?.toLocaleString()}</strong></div>
                  <div>Pending Fees: <strong>Rs. {latestSeedReport.counts.totalPendingAmount?.toLocaleString()}</strong></div>
                </div>
              </div>
            )}

            <button className="btn btn-secondary" onClick={() => setShowSeedModal(false)}>Close</button>
          </div>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('worker.categoryName')}</label>
                <input className="form-input" type="text" placeholder="e.g. Plumber, Electrician" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('worker.desc')}</label>
                <textarea className="form-input" placeholder={t('worker.desc')} value={newCatDesc} onChange={e => setNewCatDesc(e.target.value)} rows={3}></textarea>
              </div>
              <button className="btn btn-primary" onClick={handleCreateWorkerCategory}>{t('common.save')}</button>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.fullName')} *</label>
                <input className="form-input" type="text" placeholder={t('auth.fullName')} value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} required />
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.email')} *</label>
                  <input className="form-input" type="email" placeholder="ravi@worker.com" value={newWorkerEmail} onChange={e => setNewWorkerEmail(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.password')} *</label>
                  <input className="form-input" type="password" placeholder="••••••••" value={newWorkerPassword} onChange={e => setNewWorkerPassword(e.target.value)} required />
                </div>
              </div>
              <div className="responsive-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('worker.category')} *</label>
                  <select className="form-input" value={newWorkerCategoryId} onChange={e => setNewWorkerCategoryId(e.target.value)} required>
                    <option value="">-- {t('worker.category')} --</option>
                    {workerCategories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('auth.mobile')}</label>
                  <input className="form-input" type="tel" placeholder="9876543210" value={newWorkerMobile} onChange={e => setNewWorkerMobile(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('worker.specialization')}</label>
                <input className="form-input" type="text" placeholder={t('worker.specialization')} value={newWorkerSpec} onChange={e => setNewWorkerSpec(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleCreateWorker}>{t('worker.addWorker')}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ASSIGN WORKER TO COMPLAINT */}
      {showAssignWorkerModal && selectedComplaintForAssign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('complaints.assignWorker')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowAssignWorkerModal(false)}><X size={16} /></button>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontWeight: 700 }}>{selectedComplaintForAssign.title}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{t('tables.category')}: <strong>{selectedComplaintForAssign.category}</strong></p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('complaints.assignWorker')}</label>
              <select className="form-input" value={selectedWorkerIdForAssign} onChange={e => setSelectedWorkerIdForAssign(e.target.value)}>
                <option value="">-- {t('tables.assignedWorker')} --</option>
                {workersList.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.fullName} ({w.workerProfile?.category?.name || 'General'}) - {w.workerProfile?.availability || 'AVAILABLE'}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAssignWorkerToComplaint}>{t('common.confirm')}</button>
          </div>
        </div>
      )}

      {/* MODAL 4: WORKER REJECT REASON */}
      {showRejectWorkerModal && selectedComplaintForReject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('worker.rejectTask')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowRejectWorkerModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('leaves.reason')} *</label>
              <select className="form-input" value={rejectReasonInput} onChange={e => setRejectReasonInput(e.target.value)}>
                <option value="">-- {t('leaves.reason')} --</option>
                <option value="Wrong Category Assignment">Wrong Category Assignment</option>
                <option value="Currently Unavailable / Busy">Currently Unavailable / Busy</option>
                <option value="Requires Additional Specialist Technician">Requires Additional Specialist Technician</option>
                <option value="On Leave">On Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ background: '#ef4444' }} onClick={handleRejectWorkerJob}>{t('common.reject')}</button>
          </div>
        </div>
      )}

      {/* MODAL 5: WORKER COMPLETE WORK */}
      {showCompleteWorkModal && selectedComplaintForComplete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '440px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('worker.completeWork')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowCompleteWorkModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('worker.workDone')} *</label>
              <textarea className="form-input" placeholder={t('worker.workDone')} value={completionNotesInput} onChange={e => setCompletionNotesInput(e.target.value)} rows={3} required></textarea>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('worker.materialsUsed')}</label>
              <input className="form-input" type="text" placeholder={t('worker.materialsUsed')} value={materialsUsedInput} onChange={e => setMaterialsUsedInput(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={handleCompleteWorkerJob}>{t('worker.completeWork')}</button>
          </div>
        </div>
      )}

      {/* MODAL 6: VISUAL COMPLAINT TIMELINE */}
      {showTimelineModal && selectedComplaintTimeline && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('complaints.timeline')}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedComplaintTimeline.title}</p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowTimelineModal(false)}><X size={16} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color)', margin: '0.5rem 0' }}>
              {!selectedComplaintTimeline.timeline || selectedComplaintTimeline.timeline.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontWeight: 700, color: '#10b981' }}>✓ {t('common.create')}</div>
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('complaints.confirm')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowConfirmResolutionModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('mess.rating')}</label>
              <select className="form-input" value={resolutionRatingInput} onChange={e => setResolutionRatingInput(Number(e.target.value))}>
                <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
                <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
                <option value={3}>⭐⭐⭐ 3 Stars</option>
                <option value={2}>⭐⭐ 2 Stars</option>
                <option value={1}>⭐ 1 Star</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('mess.feedback')}</label>
              <textarea className="form-input" placeholder={t('mess.feedback')} value={resolutionFeedbackInput} onChange={e => setResolutionFeedbackInput(e.target.value)} rows={3}></textarea>
            </div>
            <button className="btn btn-primary" onClick={handleConfirmComplaintResolution}>{t('complaints.confirm')}</button>
          </div>
        </div>
      )}

      {/* MODAL 8: STUDENT REOPEN COMPLAINT */}
      {showReopenModal && selectedComplaintForReopen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('common.reopened')}</h3>
              <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setShowReopenModal(false)}><X size={16} /></button>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('leaves.reason')} *</label>
              <textarea className="form-input" placeholder={t('leaves.reason')} value={reopenReasonInput} onChange={e => setReopenReasonInput(e.target.value)} rows={3} required></textarea>
            </div>
            <button className="btn btn-primary" style={{ background: '#f59e0b' }} onClick={handleReopenComplaint}>{t('common.reopened')}</button>
          </div>
        </div>
      )}

      {/* MODAL 9: TARGETED EMERGENCY ALERT */}
      {showEmergencyModal && (
        <div className="modal-backdrop" onClick={() => setShowEmergencyModal(false)}>
          <div className="glass-panel modal-container animate-scale-in" style={{ maxWidth: '440px', border: '1px solid var(--danger-border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={20} color="var(--danger)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--danger)' }}>{t('emergency.confirmTitle')}</h3>
              </div>
              <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowEmergencyModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('emergency.confirmDesc')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('emergency.level')}</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
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
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('emergency.type')}</label>
                <select className="form-input" value={emergencyType} onChange={e => setEmergencyType(e.target.value)}>
                  <option value="Fire">{t('emergency.fire')}</option>
                  <option value="Medical">{t('emergency.medical')}</option>
                  <option value="Electrical">{t('emergency.electrical')}</option>
                  <option value="Security">{t('emergency.security')}</option>
                  <option value="Gas Leak">{t('emergency.gasLeak')}</option>
                  <option value="Water Leak">{t('emergency.waterLeak')}</option>
                  <option value="Other">{t('emergency.other')}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('emergency.message')}</label>
                <textarea className="form-input" placeholder={t('emergency.message')} value={emergencyMessageInput} onChange={e => setEmergencyMessageInput(e.target.value)} rows={2}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button className="btn btn-secondary" style={{ flex: 1, minHeight: '44px' }} onClick={() => setShowEmergencyModal(false)} disabled={isSendingEmergency}>{t('emergency.cancel')}</button>
                <button
                  className="btn btn-danger"
                  style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', minHeight: '44px' }}
                  onClick={handleTriggerEmergency}
                  disabled={isSendingEmergency}
                >
                  {isSendingEmergency ? (
                    <span>Sending Alert...</span>
                  ) : (
                    <>
                      <ShieldAlert size={16} />
                      <span>{t('emergency.send')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT SKIP MEAL CONFIRMATION */}
      {showSkipConfirmationModal && selectedMealForSkip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel animate-scale-in" style={{ maxWidth: '420px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('mess.skipConfirmTitle')}</h3>
              <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowSkipConfirmationModal(false)}><X size={16} /></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t('mess.skipConfirmText')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowSkipConfirmationModal(false)}>{t('common.cancel')}</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1.5, background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => {
                  handleConfirmMeal(selectedMealForSkip.id, 'SKIPPED');
                  setShowSkipConfirmationModal(false);
                }}
              >
                {t('mess.skipFood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN PUBLISH MEAL */}
      {showPublishMealModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{t('mess.publishMeal')}</h3>
              <button className="btn btn-ghost" style={{ padding: '0.35rem' }} onClick={() => setShowPublishMealModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handlePublishMeal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Date</label>
                <input className="form-input" type="date" value={mealPublishDate} onChange={e => setMealPublishDate(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Meal Type</label>
                <select className="form-input" value={mealPublishType} onChange={e => setMealPublishType(e.target.value)}>
                  <option value="BREAKFAST">{t('mess.breakfast')}</option>
                  <option value="LUNCH">{t('mess.lunch')}</option>
                  <option value="SNACKS">{t('mess.snacks')}</option>
                  <option value="DINNER">{t('mess.dinner')}</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{t('mess.menu')}</label>
                <textarea className="form-input" rows={2} placeholder="Idli, Sambar, Chutney..." value={mealPublishMenu} onChange={e => setMealPublishMenu(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Meal Time</label>
                <input className="form-input" type="datetime-local" value={mealPublishTime} onChange={e => setMealPublishTime(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Skip Cutoff Time</label>
                <input className="form-input" type="datetime-local" value={mealPublishCutoff} onChange={e => setMealPublishCutoff(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowPublishMealModal(false)}>{t('common.cancel')}</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.5 }}>{t('mess.publishMeal')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE CAMERA CAPTURE MODAL */}
      {showCameraCaptureModal && (
        <CameraCaptureModal
          onCapture={(imgDataUrl) => setCompEvidencePhoto(imgDataUrl)}
          onClose={() => setShowCameraCaptureModal(false)}
        />
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
