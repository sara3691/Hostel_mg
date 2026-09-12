// ═══════════════════════════════════════════════════════════
//  SMARTHOSTEL ERP — SHARED TYPESCRIPT TYPES
// ═══════════════════════════════════════════════════════════

export type UserRole =
  | 'SUPER_ADMIN'
  | 'HOSTEL_ADMIN'
  | 'ASSISTANT_WARDEN'
  | 'MESS_MANAGER'
  | 'SECURITY'
  | 'MAINTENANCE'
  | 'ACCOUNTANT'
  | 'STUDENT'
  | 'WARDEN'
  | 'STAFF'
  | 'WORKER';

export interface Hostel {
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

export interface UserProfile {
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
  bedNumber?: string | null;
  hostelStatus?: string | null;
  messId?: string | null;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
