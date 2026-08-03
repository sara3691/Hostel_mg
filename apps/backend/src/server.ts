import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import * as argon2 from 'argon2';
import { config } from './core/config';
import { prisma } from './core/prisma';
import { authMiddleware, requireRole, AuthRequest } from './core/auth.middleware';

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, hostelId: user.hostelId },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

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
app.get('/api/admin/pending-approvals', authMiddleware, requireRole(['SUPER_ADMIN', 'WARDEN']), async (req: AuthRequest, res) => {
  try {
    const whereClause: any = { status: 'PENDING' };
    if (req.user?.role === 'WARDEN' && req.user.hostelId) {
      whereClause.hostelId = req.user.hostelId;
      whereClause.role = 'STUDENT'; // Wardens approve students for their hostel
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

app.post('/api/admin/approve-user', authMiddleware, requireRole(['SUPER_ADMIN', 'WARDEN']), async (req, res) => {
  const { userId } = req.body;
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'APPROVED' }
    });
    res.json({ success: true, message: 'User registration approved' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/reject-user', authMiddleware, requireRole(['SUPER_ADMIN', 'WARDEN']), async (req, res) => {
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

app.post('/api/rooms', authMiddleware, requireRole(['SUPER_ADMIN', 'WARDEN']), async (req, res) => {
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
    } else if (req.user?.role === 'STAFF') {
      where.staffId = req.user.id;
    } else if (req.user?.role === 'WARDEN' && req.user.hostelId) {
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
  const { status, staffId } = req.body;
  try {
    const data: any = {};
    if (status) data.status = status;
    if (staffId) data.staffId = staffId;

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
  const { name, purpose, visitDate } = req.body;
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
        studentId: req.user.id,
        hostelId: req.user.hostelId
      }
    });
    res.status(201).json({ success: true, data: visitor });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Listen on localhost
const server = app.listen(config.PORT, '127.0.0.1', () => {
  console.log(`🚀 SmartHostel AI server running at http://127.0.0.1:${config.PORT}`);
});
