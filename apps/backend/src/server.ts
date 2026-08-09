import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { config } from './core/config';
import { prisma } from './core/prisma';
import { authMiddleware, requireRole, AuthRequest } from './core/auth.middleware';
import { sessionStore } from './core/sessionStore';
import erpRouter from './core/erp.routes';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Mount ERP system routes
app.use('/api', erpRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
  const {
    email, password, fullName, mobileNumber, role,
    hostelId, collegeName, department, year, registerNumber,
    gender, parentName, parentMobile, emergencyContact, address,
    qualification, experience, staffType
  } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, error: 'User with this email already exists' });
      return;
    }

    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        mobileNumber,
        role,
        passwordHash,
        status: role === 'SUPER_ADMIN' ? 'APPROVED' : 'PENDING',
        hostelId: hostelId || null,
        collegeName,
        department,
        year,
        registerNumber,
        gender,
        parentName,
        parentMobile,
        emergencyContact,
        address,
        qualification,
        experience,
        staffType
      }
    });

    res.status(201).json({ success: true, message: 'Registration submitted. Pending approval.', data: { id: user.id, email: user.email } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    if (user.status !== 'APPROVED') {
      res.status(403).json({ success: false, error: `Account registration is ${user.status.toLowerCase()}` });
      return;
    }

    const passwordMatch = await argon2.verify(user.passwordHash, password);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = sessionStore.createSession({
      id: user.id,
      email: user.email,
      role: user.role,
      hostelId: user.hostelId
    });

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: false, // Localhost dev
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        hostelId: user.hostelId
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.['access_token'];
  if (token) {
    sessionStore.deleteSession(token);
  }
  res.clearCookie('access_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { hostel: true }
    });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        hostel: user.hostel
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin management endpoints
app.get('/api/admin/pending-approvals', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res) => {
  try {
    const whereClause: any = { status: 'PENDING' };
    if ((req.user?.role === 'HOSTEL_ADMIN' || req.user?.role === 'ASSISTANT_WARDEN') && req.user.hostelId) {
      whereClause.hostelId = req.user.hostelId;
      whereClause.role = 'STUDENT'; // Hostel admins approve students for their hostel
    }

    const pending = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
        collegeName: true,
        department: true,
        registerNumber: true,
        staffType: true
      }
    });
    res.json({ success: true, data: pending });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/approve-user', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req, res) => {
  const { userId } = req.body;
  try {
    const qrToken = `qr-student-${userId}-${Math.random().toString(36).substring(2, 10)}`;
    await prisma.user.update({
      where: { id: userId },
      data: { 
        status: 'APPROVED',
        qrToken
      }
    });
    res.json({ success: true, message: 'User registration approved' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/reject-user', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req, res) => {
  const { userId } = req.body;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' }
    });
    res.json({ success: true, message: 'User registration rejected' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hostels management
app.get('/api/hostels', async (req, res) => {
  try {
    const hostels = await prisma.hostel.findMany();
    res.json({ success: true, data: hostels });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/hostels', authMiddleware, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { name, code, collegeName, address, capacity } = req.body;
  try {
    const hostel = await prisma.hostel.create({
      data: { name, code, collegeName, address, capacity }
    });
    res.status(201).json({ success: true, data: hostel });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rooms Management
app.get('/api/rooms', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.hostelId) {
      where.hostelId = req.user.hostelId;
    }
    const rooms = await prisma.room.findMany({
      where,
      include: { users: { select: { id: true, fullName: true, email: true } } }
    });
    res.json({ success: true, data: rooms });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/rooms', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req, res) => {
  const { block, floor, roomNumber, capacity, hostelId } = req.body;
  try {
    const room = await prisma.room.create({
      data: { block, floor: Number(floor), roomNumber, capacity: Number(capacity), hostelId }
    });
    res.status(201).json({ success: true, data: room });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Complaints
app.get('/api/complaints', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user?.role === 'STUDENT') {
      where.studentId = req.user.id;
    } else if (req.user?.role === 'MAINTENANCE' || req.user?.role === 'SECURITY') {
      where.staffId = req.user.id;
    } else if (req.user?.hostelId) {
      where.hostelId = req.user.hostelId;
    }
    const complaints = await prisma.complaint.findMany({
      where,
      include: { student: { select: { fullName: true } }, staff: { select: { fullName: true } } }
    });
    res.json({ success: true, data: complaints });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/complaints', authMiddleware, async (req: AuthRequest, res) => {
  const { title, description, category, priority } = req.body;
  if (!req.user || !req.user.hostelId) {
    res.status(400).json({ success: false, error: 'Student must belong to a hostel to file a complaint' });
    return;
  }
  try {
    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        category,
        priority,
        studentId: req.user.id,
        hostelId: req.user.hostelId
      }
    });
    res.status(201).json({ success: true, data: complaint });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/complaints/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, staffId, resolutionImage, studentFeedback } = req.body;
  try {
    const data: any = {};
    if (status) data.status = status;
    if (staffId) data.staffId = staffId;
    if (resolutionImage !== undefined) data.resolutionImage = resolutionImage;
    if (studentFeedback !== undefined) data.studentFeedback = studentFeedback;

    const updated = await prisma.complaint.update({
      where: { id },
      data
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Visitors
app.get('/api/visitors', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user?.role === 'STUDENT') {
      where.studentId = req.user.id;
    } else if (req.user?.hostelId) {
      where.hostelId = req.user.hostelId;
    }
    const visitors = await prisma.visitor.findMany({ where });
    res.json({ success: true, data: visitors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/visitors', authMiddleware, async (req: AuthRequest, res) => {
  const { name, purpose, visitDate, expectedArrivalTime } = req.body;
  if (!req.user || !req.user.hostelId) {
    res.status(400).json({ success: false, error: 'Student must belong to a hostel to request a visitor' });
    return;
  }
  try {
    const visitor = await prisma.visitor.create({
      data: {
        name,
        purpose,
        visitDate: new Date(visitDate),
        expectedArrivalTime: expectedArrivalTime ? new Date(expectedArrivalTime) : null,
        studentId: req.user.id,
        hostelId: req.user.hostelId
      }
    });
    res.status(201).json({ success: true, data: visitor });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/visitors/:id', authMiddleware, requireRole(['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY', 'SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { status, checkInTime, checkOutTime, exitTime } = req.body;
  try {
    const data: any = {};
    if (status) data.status = status;
    if (checkInTime) data.checkInTime = new Date(checkInTime);
    if (checkOutTime || exitTime) data.checkOutTime = checkOutTime ? new Date(checkOutTime) : new Date(exitTime);

    const updated = await prisma.visitor.update({
      where: { id },
      data
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Attendance Endpoints ---
app.post('/api/attendance/check-in', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    res.status(403).json({ success: false, error: 'Only students can check in via QR' });
    return;
  }
  const { hostelId } = req.body;
  if (!hostelId) {
    res.status(400).json({ success: false, error: 'Hostel ID is required' });
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find if already checked in today
    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (attendance) {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          isPresent: true,
          checkInTime: new Date()
        }
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          userId: req.user.id,
          isPresent: true,
          checkInTime: new Date(),
          date: new Date()
        }
      });
    }

    res.json({ success: true, message: 'Check-in recorded successfully!', data: attendance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/attendance/check-out', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    res.status(403).json({ success: false, error: 'Only students can check out' });
    return;
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: req.user.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (attendance) {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkOutTime: new Date()
        }
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          userId: req.user.id,
          isPresent: true,
          checkOutTime: new Date(),
          date: new Date()
        }
      });
    }

    res.json({ success: true, message: 'Check-out recorded successfully!', data: attendance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/attendance/history', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    const where: any = {};
    if (req.user.role === 'STUDENT') {
      where.userId = req.user.id;
    } else if (req.user.hostelId) {
      where.user = { hostelId: req.user.hostelId };
    }
    
    const history = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
            hostelId: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/attendance/manual', authMiddleware, requireRole(['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { studentId, date, isPresent } = req.body;
  if (!studentId) {
    res.status(400).json({ success: false, error: 'Student ID is required' });
    return;
  }

  try {
    const parsedDate = date ? new Date(date) : new Date();
    parsedDate.setHours(0, 0, 0, 0);
    const tomorrow = new Date(parsedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let attendance = await prisma.attendance.findFirst({
      where: {
        userId: studentId,
        date: {
          gte: parsedDate,
          lt: tomorrow
        }
      }
    });

    if (attendance) {
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { isPresent: Boolean(isPresent) }
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          userId: studentId,
          isPresent: Boolean(isPresent),
          date: parsedDate
        }
      });
    }

    res.json({ success: true, message: 'Attendance marked manually!', data: attendance });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/attendance/stats', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    const where: any = {};
    if (req.user.role === 'STUDENT') {
      where.userId = req.user.id;
    } else if (req.user.hostelId) {
      where.user = { hostelId: req.user.hostelId };
    }

    const total = await prisma.attendance.count({ where });
    const present = await prisma.attendance.count({
      where: {
        ...where,
        isPresent: true
      }
    });

    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    res.json({
      success: true,
      data: {
        total,
        present,
        absent: total - present,
        percentage
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Leave Management Endpoints ---
app.post('/api/leaves', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user || req.user.role !== 'STUDENT') {
    res.status(403).json({ success: false, error: 'Only students can apply for leaves' });
    return;
  }
  const { startDate, endDate, reason } = req.body;
  if (!startDate || !endDate || !reason) {
    res.status(400).json({ success: false, error: 'Start date, end date, and reason are required' });
    return;
  }

  try {
    const leave = await prisma.leave.create({
      data: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        userId: req.user.id,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, message: 'Leave request submitted successfully!', data: leave });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/leaves', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    const where: any = {};
    if (req.user.role === 'STUDENT') {
      where.userId = req.user.id;
    } else if (req.user.hostelId) {
      where.hostelId = req.user.hostelId;
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
            hostelId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: leaves });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/leaves/:id', authMiddleware, requireRole(['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status. Must be APPROVED or REJECTED.' });
    return;
  }

  try {
    const leave = await prisma.leave.update({
      where: { id },
      data: { status, remarks }
    });

    res.json({ success: true, message: `Leave request ${status.toLowerCase()} successfully!`, data: leave });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/leaves/:id', authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const leave = await prisma.leave.findUnique({ where: { id } });
    if (!leave) {
      res.status(404).json({ success: false, error: 'Leave request not found' });
      return;
    }

    if (leave.userId !== req.user?.id && req.user?.role !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Unauthorized to cancel this leave request' });
      return;
    }

    if (leave.status !== 'PENDING') {
      res.status(400).json({ success: false, error: 'Cannot cancel a leave request that has already been processed' });
      return;
    }

    await prisma.leave.delete({ where: { id } });
    res.json({ success: true, message: 'Leave request cancelled successfully!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ----------------------------------------------------
// QR ATTENDANCE SYSTEM ENHANCEMENTS
// ----------------------------------------------------

// 1. Get current Attendance Settings
app.get('/api/attendance/settings', authMiddleware, async (req: AuthRequest, res) => {
  try {
    let settings = await prisma.attendanceSettings.findFirst();
    if (!settings) {
      settings = await prisma.attendanceSettings.create({
        data: {
          enableQrAttendance: true,
          autoDateDetection: true,
          manualDateMode: false,
          allowMultipleSessions: false,
          enableCheckIn: true,
          enableCheckOut: true,
          timeWindow: 60,
          cameraResolution: "720p",
          scanDelay: 2,
          notificationsEnabled: true
        }
      });
    }
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Update Attendance Settings
app.patch('/api/attendance/settings', authMiddleware, requireRole(['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const existing = await prisma.attendanceSettings.findFirst();
    if (!existing) {
      const created = await prisma.attendanceSettings.create({ data: req.body });
      res.json({ success: true, data: created });
      return;
    }
    const updated = await prisma.attendanceSettings.update({
      where: { id: existing.id },
      data: req.body
    });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Attendance Sessions
app.get('/api/attendance/sessions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const sessions = await prisma.attendanceSession.findMany();
    res.json({ success: true, data: sessions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Create Session
app.post('/api/attendance/sessions', authMiddleware, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { name, isActive } = req.body;
  try {
    const session = await prisma.attendanceSession.create({
      data: { name, isActive: isActive ?? true }
    });
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update Session
app.patch('/api/attendance/sessions/:id', authMiddleware, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  const { name, isActive } = req.body;
  try {
    const session = await prisma.attendanceSession.update({
      where: { id },
      data: { name, isActive }
    });
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Delete Session
app.delete('/api/attendance/sessions/:id', authMiddleware, requireRole(['SUPER_ADMIN']), async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.attendanceSession.delete({ where: { id } });
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// 7a. Generate 5-Minute Temporary Attendance QR
app.post('/api/attendance/generate-qr', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const student = await prisma.user.findUnique({
      where: { id: user.id },
      include: { hostel: true }
    });
    if (!student) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const locationCode = student.hostel?.locationCode || 'HSTL-MAIN-001';
    const referenceCode = 'ATD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const issuedAt = new Date();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const qrRecord = await prisma.attendanceQR.create({
      data: {
        referenceCode,
        userId: student.id,
        locationCode,
        issuedAt,
        expiresAt,
        status: 'ACTIVE'
      }
    });

    const payload = {
      type: 'attendance',
      referenceCode,
      locationCode,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      validitySeconds: 300
    };

    res.json({
      success: true,
      data: {
        ...payload,
        qrString: JSON.stringify(payload),
        qrRecordId: qrRecord.id
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7b. Scan QR Token & Mark Attendance (with 5-meter GPS Location Validation)
app.post('/api/attendance/scan-qr', authMiddleware, requireRole(['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN']), async (req: AuthRequest, res) => {
  const { qrToken, device, latitude, longitude, accuracy } = req.body;
  if (!qrToken) {
    res.status(400).json({ success: false, error: 'QR Token is required' });
    return;
  }

  try {
    let studentId: string | null = null;
    let refCode: string | null = null;
    let locCode: string | null = null;
    let qrRecord: any = null;

    // Parse payload (JSON object string or raw ATD- token or permanent qrToken)
    let parsedPayload: any = null;
    if (typeof qrToken === 'string' && (qrToken.trim().startsWith('{') || qrToken.includes('referenceCode'))) {
      try { parsedPayload = JSON.parse(qrToken); } catch (_) {}
    }

    const lookupRef = parsedPayload?.referenceCode || (typeof qrToken === 'string' && qrToken.startsWith('ATD-') ? qrToken : null);

    if (lookupRef) {
      qrRecord = await prisma.attendanceQR.findUnique({
        where: { referenceCode: lookupRef }
      });

      if (!qrRecord) {
        res.status(404).json({ success: false, error: 'Invalid or unrecognized QR Code' });
        return;
      }

      if (qrRecord.status === 'EXPIRED' || new Date(qrRecord.expiresAt) < new Date()) {
        if (qrRecord.status !== 'EXPIRED') {
          await prisma.attendanceQR.update({ where: { id: qrRecord.id }, data: { status: 'EXPIRED' } });
        }
        res.status(400).json({
          success: false,
          status: 'EXPIRED',
          error: 'This attendance QR code has expired. Please generate a new QR code.',
          code: 'QR_EXPIRED'
        });
        return;
      }

      if (qrRecord.status === 'USED') {
        res.status(400).json({
          success: false,
          status: 'USED',
          error: 'This temporary QR code has already been scanned.',
          code: 'QR_USED'
        });
        return;
      }

      studentId = qrRecord.userId;
      refCode = qrRecord.referenceCode;
      locCode = qrRecord.locationCode;
    }

    // Find Student
    const student = await prisma.user.findFirst({
      where: studentId ? { id: studentId } : { qrToken },
      include: { hostel: true, room: true }
    });

    if (!student) {
      res.status(404).json({ success: false, error: 'Invalid or unrecognized QR Code' });
      return;
    }

    if (student.status !== 'APPROVED') {
      res.status(400).json({ success: false, error: `Student status is ${student.status.toLowerCase()}. Cannot mark attendance.` });
      return;
    }

    if (student.role !== 'STUDENT') {
      res.status(400).json({ success: false, error: 'Only student accounts can be scanned for attendance.' });
      return;
    }

    // ── GPS 5-METER LOCATION VALIDATION ──
    const hostel = student.hostel;
    const hostelLat = hostel?.latitude ?? 13.0827;
    const hostelLng = hostel?.longitude ?? 80.2707;
    const allowedRadius = hostel?.allowedRadius ?? 5.0; // 5 meters

    let distMeters: number | null = null;
    let locationVerified = true;

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      // Check GPS Accuracy
      if (typeof accuracy === 'number' && accuracy > 35) {
        res.status(400).json({
          success: false,
          status: 'LOCATION_LOW_ACCURACY',
          error: 'Location accuracy is too low. Please enable high-accuracy GPS and try again.',
          accuracy
        });
        return;
      }

      distMeters = calculateHaversineDistance(latitude, longitude, hostelLat, hostelLng);

      if (distMeters > allowedRadius) {
        res.status(400).json({
          success: false,
          status: 'OUTSIDE_RADIUS',
          error: `You are outside the allowed attendance location (${distMeters}m away). Please move within 5 meters of the hostel.`,
          distanceMeters: distMeters,
          allowedRadius
        });
        return;
      }
    }

    // Load configurations
    const settings = await prisma.attendanceSettings.findFirst() || {
      enableQrAttendance: true,
      autoDateDetection: true,
      manualDateMode: false,
      manualDate: null,
      manualSession: null
    };

    if (!settings.enableQrAttendance) {
      res.status(400).json({ success: false, error: 'QR Attendance System is currently disabled in system settings.' });
      return;
    }

    // Determine target date and session
    let targetDate = new Date();
    let targetSession = 'Morning';

    if (settings.manualDateMode && settings.manualDate) {
      targetDate = new Date(settings.manualDate);
      targetSession = settings.manualSession || 'Morning';
    } else {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) targetSession = 'Morning';
      else if (hour >= 12 && hour < 17) targetSession = 'Afternoon';
      else if (hour >= 17 && hour < 21) targetSession = 'Evening';
      else targetSession = 'Night';
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for duplicate scan
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: student.id,
        session: targetSession,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existing) {
      res.json({
        success: false,
        status: 'ALREADY_MARKED',
        message: 'Attendance Already Marked',
        student: {
          id: student.id,
          fullName: student.fullName,
          registerNumber: student.registerNumber || 'N/A',
          hostelName: student.hostel?.name || 'N/A',
          roomNumber: student.room?.roomNumber || 'Unassigned',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.fullName)}`
        }
      });
      return;
    }

    // Record attendance
    const attendance = await prisma.attendance.create({
      data: {
        userId: student.id,
        date: targetDate,
        isPresent: true,
        checkInTime: new Date(),
        hostelId: student.hostelId,
        roomNumber: student.room?.roomNumber || 'N/A',
        session: targetSession,
        status: 'PRESENT',
        scannedBy: req.user?.email || 'System',
        scannerDevice: device || 'Webcam Viewfinder',
        qrVerification: 'VERIFIED',
        referenceCode: refCode || null,
        locationCode: locCode || hostel?.locationCode || 'HSTL-MAIN-001',
        scannerLatitude: latitude || null,
        scannerLongitude: longitude || null,
        distanceMeters: distMeters ?? 0,
        locationVerified
      }
    });

    // Invalidate temporary QR
    if (qrRecord) {
      await prisma.attendanceQR.update({
        where: { id: qrRecord.id },
        data: { status: 'USED', usedAt: new Date() }
      });
    }

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      attendance,
      distanceMeters: distMeters ?? 0,
      locationVerified: true,
      student: {
        id: student.id,
        fullName: student.fullName,
        registerNumber: student.registerNumber || 'N/A',
        hostelName: student.hostel?.name || 'N/A',
        roomNumber: student.room?.roomNumber || 'Unassigned',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.fullName)}`
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Listen on localhost
const server = app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`🚀 SmartHostel AI server running at http://localhost:${config.PORT}`);
});
