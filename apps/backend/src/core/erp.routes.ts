import { Router, Response } from 'express';
import { prisma } from './prisma';
import { authMiddleware, requirePermission, requireRole, AuthRequest } from './auth.middleware';
import { Role, GatePassStatus, NoticeAudience } from '@prisma/client';

const router = Router();

async function logActivity(req: AuthRequest, action: string, module: string, details?: string) {
  try {
    if (req.user) await prisma.activityLog.create({ data: { userId: req.user.id, userEmail: req.user.email, action, module, details } });
  } catch (err) { console.error(err); }
}

async function createNotification(userId: string, title: string, message: string, type: string, link?: string) {
  try { await prisma.notification.create({ data: { userId, title, message, type, link } }); }
  catch (err) { console.error(err); }
}

// ============================================================
// ROLE PERMISSIONS
// ============================================================
router.get('/permissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try { res.json({ success: true, data: await prisma.rolePermission.findMany() }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/permissions/update', authMiddleware, requirePermission('manage_settings'), async (req: AuthRequest, res: Response) => {
  const { role, permissions } = req.body;
  if (!role || !Array.isArray(permissions)) { res.status(400).json({ success: false, error: 'Invalid payload' }); return; }
  try {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { role: role as Role } }),
      prisma.rolePermission.createMany({ data: permissions.map((p: string) => ({ role: role as Role, permission: p })) })
    ]);
    await logActivity(req, 'Updated permissions for ' + role, 'SETTINGS');
    res.json({ success: true, message: 'Permissions updated' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// STUDENTS
// ============================================================
router.get('/students', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId, search, status } = req.query;
  const filter: any = { role: 'STUDENT', isDeleted: false };
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.role !== 'SUPER_ADMIN' && req.user?.hostelId) filter.hostelId = req.user.hostelId;
  if (status) filter.status = status as string;
  if (search) {
    filter.OR = [
      { fullName: { contains: search as string, mode: 'insensitive' } },
      { email: { contains: search as string, mode: 'insensitive' } },
      { registerNumber: { contains: search as string, mode: 'insensitive' } }
    ];
  }
  try {
    const students = await prisma.user.findMany({
      where: filter,
      select: { id: true, fullName: true, email: true, role: true, status: true, mobileNumber: true, registerNumber: true, department: true, year: true, collegeName: true, gender: true, hostelId: true, roomId: true, messId: true, qrToken: true, photo: true, bloodGroup: true, createdAt: true, hostel: { select: { name: true } }, room: { select: { roomNumber: true, block: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: students });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/students/:id/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { photo, bloodGroup, medicalDetails, guardianName, guardianMobile, guardianRelation, mobileNumber, address, emergencyContact } = req.body;
  try {
    const updated = await prisma.user.update({ where: { id }, data: { photo, bloodGroup, medicalDetails, guardianName, guardianMobile, guardianRelation, mobileNumber, address, emergencyContact } });
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/students/:id/documents', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try { res.json({ success: true, data: await prisma.document.findMany({ where: { userId: id } }) }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/students/:id/documents', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, fileUrl, hostelId, docType } = req.body;
  if (!name || !fileUrl || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const doc = await prisma.document.create({ data: { name, fileUrl, userId: id, hostelId, docType: docType || 'OTHER' } });
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/students/:id/status', authMiddleware, requirePermission('manage_students'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, roomId } = req.body;
  if (!status) { res.status(400).json({ success: false, error: 'Status required' }); return; }
  try {
    const student = await prisma.user.findUnique({ where: { id } });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }
    const updates: any = { status };
    if (status === 'APPROVED') {
      if (!roomId) { res.status(400).json({ success: false, error: 'Room ID required' }); return; }
      const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: true } });
      if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }
      if (room.users.length >= room.capacity) { res.status(400).json({ success: false, error: 'Room full' }); return; }
      updates.roomId = roomId;
      if (!student.registerNumber) updates.registerNumber = 'STU-' + Date.now();
      if (!student.qrToken) updates.qrToken = 'qr-' + id + '-' + Math.random().toString(36).substring(2, 10);
    }
    const updatedUser = await prisma.user.update({ where: { id }, data: updates });
    await createNotification(id, 'Registration ' + status, 'Your hostel registration has been ' + status.toLowerCase() + '.', 'ANNOUNCEMENT');
    await logActivity(req, 'Updated student status to ' + status, 'STUDENTS', 'Student: ' + student.fullName);
    res.json({ success: true, data: updatedUser });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/students/:id - Full 360° student profile
router.get('/students/:id/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, email: true, role: true, status: true,
        mobileNumber: true, registerNumber: true, department: true, year: true,
        collegeName: true, gender: true, bloodGroup: true, photo: true,
        address: true, emergencyContact: true, medicalDetails: true,
        guardianName: true, guardianMobile: true, guardianRelation: true,
        createdAt: true, qrToken: true, hostelId: true, roomId: true, messId: true,
        hostel: { select: { name: true, code: true, collegeName: true, address: true } },
        room: { select: { roomNumber: true, block: true, floor: true, capacity: true } },
        documents: true,
        leaves: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, startDate: true, endDate: true, reason: true, status: true, createdAt: true }
        },
        complaintsRaised: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, category: true, status: true, priority: true, createdAt: true }
        },
        fees: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, amount: true, status: true, dueDate: true }
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 30,
          select: { id: true, date: true, isPresent: true, session: true }
        }
      }
    });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }

    // Compute attendance summary
    const attended = student.attendances.filter((a: any) => a.isPresent).length;
    const total = student.attendances.length;
    const attendanceSummary = {
      total,
      present: attended,
      absent: total - attended,
      percentage: total > 0 ? Math.round((attended / total) * 100) : 100
    };

    res.json({ success: true, data: { ...student, attendanceSummary } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/dashboard/stats - Role-specific dashboard statistics
router.get('/dashboard/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const hostelFilter = user.role !== 'SUPER_ADMIN' && user.hostelId ? { hostelId: user.hostelId } : {};

    const [totalStudents, totalRooms, pendingLeaves, openComplaints, totalHostels, recentAttendances] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', isDeleted: false, ...hostelFilter } }),
      prisma.room.count({ where: { ...hostelFilter } }),
      prisma.leave.count({ where: { status: 'PENDING', ...(hostelFilter.hostelId ? { user: { hostelId: hostelFilter.hostelId } } : {}) } }),
      prisma.complaint.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] }, ...hostelFilter } }),
      user.role === 'SUPER_ADMIN' ? prisma.hostel.count() : Promise.resolve(1),
      prisma.attendance.findMany({
        where: {
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          ...(hostelFilter.hostelId ? { user: { hostelId: hostelFilter.hostelId } } : {})
        },
        select: { isPresent: true }
      })
    ]);

    const weeklyPresent = recentAttendances.filter(a => a.isPresent).length;
    const weeklyTotal = recentAttendances.length;

    res.json({
      success: true,
      data: {
        totalStudents,
        totalRooms,
        totalHostels,
        pendingLeaves,
        openComplaints,
        weeklyAttendance: weeklyTotal > 0 ? Math.round((weeklyPresent / weeklyTotal) * 100) : 0,
        weeklyPresent,
        weeklyTotal
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});


// ============================================================
// HOSTEL SETTINGS
// ============================================================
router.patch('/hostels/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, collegeName, address, capacity, phone, email, logo, gender, academicYear, status, wardenId } = req.body;
  try {
    const updated = await prisma.hostel.update({ where: { id }, data: { name, collegeName, address, capacity: capacity ? Number(capacity) : undefined, phone, email, logo, gender, academicYear, status, wardenId } });
    await logActivity(req, 'Updated hostel settings', 'SETTINGS', 'Hostel: ' + updated.name);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// ROOM UPDATE
// ============================================================
router.patch('/rooms/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { block, floor, roomNumber, capacity, category } = req.body;
  try {
    const updated = await prisma.room.update({ where: { id }, data: { block, floor: floor ? Number(floor) : undefined, roomNumber, capacity: capacity ? Number(capacity) : undefined, category } });
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// MESS MANAGEMENT
// ============================================================
router.get('/messes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const messes = await prisma.mess.findMany({ where, include: { students: { select: { id: true, fullName: true } } } });
    res.json({ success: true, data: messes });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/messes', authMiddleware, requirePermission('manage_mess'), async (req: AuthRequest, res: Response) => {
  const { name, hostelId, messType } = req.body;
  if (!name || !hostelId) { res.status(400).json({ success: false, error: 'Name and Hostel ID required' }); return; }
  try {
    const mess = await prisma.mess.create({ data: { name, hostelId, messType: messType || 'VEG' } });
    await logActivity(req, 'Created Mess: ' + name, 'MESS');
    res.status(201).json({ success: true, data: mess });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/messes/enroll', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId, messId } = req.body;
  if (!studentId || !messId) { res.status(400).json({ success: false, error: 'Student ID and Mess ID required' }); return; }
  try {
    const user = await prisma.user.update({ where: { id: studentId }, data: { messId } });
    await logActivity(req, 'Student enrolled in mess', 'MESS', 'Student: ' + user.fullName);
    res.json({ success: true, message: 'Enrolled in mess successfully' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/messes/attendance', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { messId, date } = req.query;
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const filter: any = {};
    if (hostelId) filter.hostelId = hostelId;
    if (messId) filter.messId = messId as string;
    if (date) {
      const d = new Date(date as string);
      d.setHours(0, 0, 0, 0);
      const t = new Date(d);
      t.setDate(t.getDate() + 1);
      filter.date = { gte: d, lt: t };
    }
    const attendance = await prisma.messAttendance.findMany({ where: filter, include: { student: { select: { fullName: true, registerNumber: true } }, mess: { select: { name: true } } } });
    res.json({ success: true, data: attendance });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/messes/attendance', authMiddleware, requirePermission('mark_mess_attendance'), async (req: AuthRequest, res: Response) => {
  const { studentId, messId, mealType, isPresent, date, hostelId } = req.body;
  if (!studentId || !messId || !mealType || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const att = await prisma.messAttendance.create({ data: { studentId, messId, mealType, isPresent: isPresent ?? true, hostelId, date: date ? new Date(date) : new Date() } });
    res.status(201).json({ success: true, data: att });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// MESS MENU
// ============================================================
router.get('/mess-menus', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const messId = req.query.messId as string;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    if (messId) where.messId = messId;
    const menus = await prisma.messMenu.findMany({ where, include: { mess: { select: { name: true } } } });
    res.json({ success: true, data: menus });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/mess-menus', authMiddleware, requirePermission('manage_mess'), async (req: AuthRequest, res: Response) => {
  const { dayOfWeek, breakfast, lunch, dinner, hostelId, messId } = req.body;
  if (!dayOfWeek || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const existing = await prisma.messMenu.findFirst({ where: { dayOfWeek, hostelId, messId: messId || null } });
    let menu;
    if (existing) {
      menu = await prisma.messMenu.update({ where: { id: existing.id }, data: { breakfast: breakfast || '', lunch: lunch || '', dinner: dinner || '' } });
    } else {
      menu = await prisma.messMenu.create({ data: { dayOfWeek, breakfast: breakfast || '', lunch: lunch || '', dinner: dinner || '', hostelId, messId: messId || null } });
    }
    await logActivity(req, 'Updated mess menu for ' + dayOfWeek, 'MESS');
    res.json({ success: true, data: menu });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// FEE MANAGEMENT
// ============================================================
router.get('/fees', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId, hostelId, status } = req.query;
  const filter: any = {};
  if (studentId) filter.studentId = studentId as string;
  else if (req.user?.role === 'STUDENT') filter.studentId = req.user.id;
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId) filter.hostelId = req.user.hostelId;
  if (status) filter.status = status as string;
  try {
    const fees = await prisma.fee.findMany({ where: filter, include: { student: { select: { fullName: true, registerNumber: true } }, payments: true } });
    res.json({ success: true, data: fees });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/fees', authMiddleware, requirePermission('manage_fees'), async (req: AuthRequest, res: Response) => {
  const { title, feeType, amount, dueDate, studentId, hostelId, discount } = req.body;
  if (!title || !amount || !dueDate || !studentId || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const fee = await prisma.fee.create({ data: { title, feeType: feeType || 'GENERAL', amount: Number(amount), dueDate: new Date(dueDate), status: 'PENDING', studentId, hostelId, discount: Number(discount || 0) } });
    await createNotification(studentId, 'New Fee Invoice', 'Fee "' + title + '" of Rs.' + amount + ' assigned.', 'FEE_DUE', 'payments');
    await logActivity(req, 'Assigned Fee: ' + title, 'FINANCE', 'Amount: ' + amount);
    res.status(201).json({ success: true, data: fee });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/fees/:id/pay', authMiddleware, requirePermission('manage_fees'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, paymentMode, transactionId } = req.body;
  if (!amount || !paymentMode) { res.status(400).json({ success: false, error: 'Amount and payment mode required' }); return; }
  try {
    const fee = await prisma.fee.findUnique({ where: { id } });
    if (!fee) { res.status(404).json({ success: false, error: 'Fee not found' }); return; }
    const payAmt = Number(amount);
    const newPaidAmount = fee.paidAmount + payAmt;
    const status = newPaidAmount >= fee.amount ? 'PAID' : 'PARTIAL';
    const receiptNumber = 'RCP-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const [updatedFee, payment] = await prisma.$transaction([
      prisma.fee.update({ where: { id }, data: { paidAmount: newPaidAmount, status } }),
      prisma.payment.create({ data: { amount: payAmt, paymentMode, transactionId, receiptNumber, feeId: id, studentId: fee.studentId, hostelId: fee.hostelId } })
    ]);
    await createNotification(fee.studentId, 'Payment Confirmed', 'Payment of Rs.' + payAmt + ' received. Receipt: ' + receiptNumber, 'FEE_DUE', 'payments');
    await logActivity(req, 'Recorded Payment', 'FINANCE', 'Receipt: ' + receiptNumber);
    res.json({ success: true, data: { fee: updatedFee, payment } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/payments', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId, hostelId } = req.query;
  const filter: any = {};
  if (studentId) filter.studentId = studentId as string;
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId) filter.hostelId = req.user.hostelId;
  try {
    const payments = await prisma.payment.findMany({ where: filter, include: { fee: { select: { title: true } }, student: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: payments });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// INVENTORY
// ============================================================
router.get('/inventory', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const inventory = await prisma.inventory.findMany({ where, include: { usages: { orderBy: { createdAt: 'desc' }, take: 5 }, purchases: { orderBy: { purchaseDate: 'desc' }, take: 5 } } });
    res.json({ success: true, data: inventory });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/inventory', authMiddleware, requirePermission('manage_inventory'), async (req: AuthRequest, res: Response) => {
  const { itemName, category, quantity, unit, minStock, hostelId, messId } = req.body;
  if (!itemName || !category || quantity === undefined || !unit || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const item = await prisma.inventory.create({ data: { itemName, category, quantity: Number(quantity), unit, minStock: minStock !== undefined ? Number(minStock) : 5, hostelId, messId: messId || null } });
    await logActivity(req, 'Added Inventory: ' + itemName, 'INVENTORY');
    res.status(201).json({ success: true, data: item });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/inventory/:id/usage', authMiddleware, requirePermission('manage_inventory'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity, usedBy, purpose, hostelId } = req.body;
  try {
    const inventory = await prisma.inventory.findUnique({ where: { id } });
    if (!inventory) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    const useQty = Number(quantity);
    if (inventory.quantity < useQty) { res.status(400).json({ success: false, error: 'Insufficient stock' }); return; }
    const [updatedInv, usage] = await prisma.$transaction([
      prisma.inventory.update({ where: { id }, data: { quantity: inventory.quantity - useQty } }),
      prisma.inventoryUsage.create({ data: { quantity: useQty, usedBy, purpose, inventoryId: id, hostelId } })
    ]);
    res.json({ success: true, data: { inventory: updatedInv, usage } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/inventory/:id/purchase', authMiddleware, requirePermission('manage_inventory'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity, cost, supplier, hostelId } = req.body;
  try {
    const inventory = await prisma.inventory.findUnique({ where: { id } });
    if (!inventory) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    const [updatedInv, purchase] = await prisma.$transaction([
      prisma.inventory.update({ where: { id }, data: { quantity: inventory.quantity + Number(quantity) } }),
      prisma.inventoryPurchase.create({ data: { quantity: Number(quantity), cost: Number(cost), supplier, inventoryId: id, hostelId } })
    ]);
    res.json({ success: true, data: { inventory: updatedInv, purchase } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// EXPENSES
// ============================================================
router.get('/expenses', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    res.json({ success: true, data: await prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' } }) });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/expenses', authMiddleware, requirePermission('manage_expenses'), async (req: AuthRequest, res: Response) => {
  const { category, amount, description, hostelId, messId } = req.body;
  if (!category || !amount || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const expense = await prisma.expense.create({ data: { category, amount: Number(amount), description, hostelId, messId: messId || null } });
    await logActivity(req, 'Added Expense: ' + category, 'FINANCE', 'Amount: ' + amount);
    res.status(201).json({ success: true, data: expense });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PAYROLL
// ============================================================
router.get('/payroll', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const payrolls = await prisma.payroll.findMany({ where, include: { staff: { select: { fullName: true, email: true, role: true } } }, orderBy: { month: 'desc' } });
    res.json({ success: true, data: payrolls });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/payroll/generate', authMiddleware, requirePermission('manage_payroll'), async (req: AuthRequest, res: Response) => {
  const { staffId, month, baseSalary, bonus, deductions, advance, pf, esi, hostelId } = req.body;
  if (!staffId || !month || !baseSalary || !hostelId) { res.status(400).json({ success: false, error: 'Missing parameters' }); return; }
  try {
    const base = Number(baseSalary), bon = Number(bonus || 0), ded = Number(deductions || 0), adv = Number(advance || 0), pfAmt = Number(pf || 0), esiAmt = Number(esi || 0);
    const netSalary = base + bon - ded - adv - pfAmt - esiAmt;
    const payslipNo = 'PS-' + month + '-' + Date.now();
    const payroll = await prisma.payroll.create({ data: { staffId, month, baseSalary: base, bonus: bon, deductions: ded, advance: adv, pf: pfAmt, esi: esiAmt, netSalary, status: 'PENDING', payslipNo, hostelId } });
    await createNotification(staffId, 'Payslip Generated', 'Your payslip for ' + month + ' generated. Net: Rs.' + netSalary, 'ANNOUNCEMENT', 'payroll');
    await logActivity(req, 'Generated Payslip: ' + payslipNo, 'PAYROLL');
    res.status(201).json({ success: true, data: payroll });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/payroll/:id/pay', authMiddleware, requirePermission('manage_payroll'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const payroll = await prisma.payroll.update({ where: { id }, data: { status: 'PAID', paidDate: new Date() } });
    await createNotification(payroll.staffId, 'Salary Disbursed', 'Salary for ' + payroll.month + ' disbursed. Rs.' + payroll.netSalary, 'ANNOUNCEMENT');
    await logActivity(req, 'Paid Salary', 'PAYROLL', 'Payslip: ' + payroll.payslipNo);
    res.json({ success: true, data: payroll });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// GATE PASS
// ============================================================
router.get('/gate-passes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const filter: any = {};
  if (req.user?.role === 'STUDENT') filter.studentId = req.user.id;
  else if (req.user?.hostelId) filter.hostelId = req.user.hostelId;
  if (status) filter.status = status as GatePassStatus;
  try {
    const passes = await prisma.gatePass.findMany({ where: filter, include: { student: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true, block: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: passes });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/gate-passes', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user?.hostelId) { res.status(400).json({ success: false, error: 'Must belong to a hostel' }); return; }
  const { purpose, destination, expectedReturn } = req.body;
  if (!purpose || !destination || !expectedReturn) { res.status(400).json({ success: false, error: 'Missing required fields' }); return; }
  try {
    const pass = await prisma.gatePass.create({ data: { purpose, destination, expectedReturn: new Date(expectedReturn), studentId: req.user.id, hostelId: req.user.hostelId } });
    res.status(201).json({ success: true, data: pass });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/gate-passes/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  try {
    const updates: any = {};
    if (status) updates.status = status as GatePassStatus;
    if (remarks) updates.remarks = remarks;
    if (status === 'APPROVED') {
      updates.qrCode = 'gp-' + id + '-' + Math.random().toString(36).substring(2, 10);
      updates.approvedBy = req.user?.email;
    }
    if (status === 'EXITED') updates.exitTime = new Date();
    if (status === 'RETURNED') {
      const p = await prisma.gatePass.findUnique({ where: { id } });
      updates.actualReturn = new Date();
      if (p && p.expectedReturn < new Date()) updates.lateReturn = true;
    }
    const pass = await prisma.gatePass.update({ where: { id }, data: updates, include: { student: true } });
    if (status === 'APPROVED') await createNotification(pass.studentId, 'Gate Pass Approved', 'Your gate pass to ' + pass.destination + ' approved.', 'GATE_PASS', 'gate_pass');
    if (status === 'REJECTED') await createNotification(pass.studentId, 'Gate Pass Rejected', 'Your gate pass was rejected. ' + (remarks || ''), 'GATE_PASS', 'gate_pass');
    await logActivity(req, 'Updated gate pass to ' + status, 'GATE_PASS');
    res.json({ success: true, data: pass });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/gate-passes/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const pass = await prisma.gatePass.findUnique({ where: { id } });
    if (!pass) { res.status(404).json({ success: false, error: 'Gate pass not found' }); return; }
    if (req.user?.role === 'STUDENT' && pass.studentId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Unauthorized to cancel this pass' });
      return;
    }
    await prisma.gatePass.delete({ where: { id } });
    await logActivity(req, 'Cancelled gate pass #' + id, 'GATE_PASS');
    res.json({ success: true, message: 'Gate pass cancelled successfully' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/gate-passes/scan', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { qrCode, action } = req.body;
  if (!qrCode) { res.status(400).json({ success: false, error: 'QR code required' }); return; }
  try {
    const pass = await prisma.gatePass.findFirst({ where: { qrCode }, include: { student: { select: { fullName: true, registerNumber: true } } } });
    if (!pass) { res.status(404).json({ success: false, error: 'Invalid gate pass QR' }); return; }
    const update: any = { status: action === 'EXIT' ? 'EXITED' : 'RETURNED' };
    if (action === 'EXIT') update.exitTime = new Date();
    if (action === 'RETURN') { update.actualReturn = new Date(); if (pass.expectedReturn < new Date()) update.lateReturn = true; }
    const updated = await prisma.gatePass.update({ where: { id: pass.id }, data: update });
    await logActivity(req, 'Gate pass scanned: ' + action, 'GATE_PASS', 'Student: ' + pass.student.fullName);
    res.json({ success: true, data: updated, student: pass.student });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// LAUNDRY
// ============================================================
router.get('/laundry', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  const filter: any = {};
  if (req.user?.role === 'STUDENT') filter.userId = req.user.id;
  else if (req.user?.hostelId) filter.hostelId = req.user.hostelId;
  if (status) filter.status = status as string;
  try {
    const slots = await prisma.laundrySlot.findMany({ where: filter, include: { user: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true } } } } }, orderBy: { date: 'desc' } });
    res.json({ success: true, data: slots });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/laundry', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user?.hostelId) { res.status(400).json({ success: false, error: 'Must belong to a hostel' }); return; }
  const { date, timeSlot, clothesCount, notes } = req.body;
  if (!date || !timeSlot) { res.status(400).json({ success: false, error: 'Date and time slot required' }); return; }
  try {
    const slot = await prisma.laundrySlot.create({ data: { date: new Date(date), timeSlot, clothesCount: Number(clothesCount || 0), notes, userId: req.user.id, hostelId: req.user.hostelId } });
    res.status(201).json({ success: true, data: slot });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/laundry/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    const slot = await prisma.laundrySlot.update({ where: { id }, data: { status, notes } });
    if (status === 'DELIVERED') {
      await createNotification(slot.userId, 'Laundry Delivered', 'Your laundry has been delivered to your room.', 'ANNOUNCEMENT', 'laundry');
    }

    if (status === 'CANCELLED' || status === 'DELIVERED') {
      const startOfDay = new Date(slot.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(slot.date);
      endOfDay.setHours(23, 59, 59, 999);

      const waitingList = await prisma.laundryWaitlist.findMany({
        where: {
          timeSlot: slot.timeSlot,
          date: { gte: startOfDay, lte: endOfDay },
          status: 'WAITING'
        }
      });

      for (const entry of waitingList) {
        await prisma.notification.create({
          data: {
            userId: entry.userId,
            type: 'LAUNDRY_AVAILABLE',
            title: 'Laundry Slot Available',
            message: `A laundry slot for ${entry.timeSlot} on ${new Date(entry.date).toLocaleDateString()} has become available! Book your slot now.`
          }
        });
        await prisma.laundryWaitlist.update({
          where: { id: entry.id },
          data: { status: 'NOTIFIED' }
        });
      }
    }

    res.json({ success: true, data: slot });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/laundry/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const slot = await prisma.laundrySlot.findUnique({ where: { id } });
    if (!slot) { res.status(404).json({ success: false, error: 'Slot not found' }); return; }

    await prisma.laundrySlot.delete({ where: { id } });

    const startOfDay = new Date(slot.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(slot.date);
    endOfDay.setHours(23, 59, 59, 999);

    const waitingList = await prisma.laundryWaitlist.findMany({
      where: {
        timeSlot: slot.timeSlot,
        date: { gte: startOfDay, lte: endOfDay },
        status: 'WAITING'
      }
    });

    for (const entry of waitingList) {
      await prisma.notification.create({
        data: {
          userId: entry.userId,
          type: 'LAUNDRY_AVAILABLE',
          title: 'Laundry Slot Available',
          message: `A laundry slot for ${entry.timeSlot} on ${new Date(entry.date).toLocaleDateString()} has opened up! Book your slot now.`
        }
      });
      await prisma.laundryWaitlist.update({
        where: { id: entry.id },
        data: { status: 'NOTIFIED' }
      });
    }

    res.json({ success: true, message: 'Laundry booking cancelled and waitlist notified.' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// NOTICE BOARD
// ============================================================
router.get('/notices', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const orConditions: any[] = [{ hostelId: null }];
    if (req.user?.hostelId) orConditions.push({ hostelId: req.user.hostelId });
    const notices = await prisma.notice.findMany({ where: { OR: orConditions }, orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }] });
    res.json({ success: true, data: notices });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/notices', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { title, content, audience, isEmergency, isPinned, hostelId, department, expiresAt } = req.body;
  if (!title || !content) { res.status(400).json({ success: false, error: 'Title and content required' }); return; }
  try {
    const notice = await prisma.notice.create({ data: { title, content, audience: audience || 'ALL', isEmergency: Boolean(isEmergency), isPinned: Boolean(isPinned), hostelId: hostelId || req.user?.hostelId || null, department, expiresAt: expiresAt ? new Date(expiresAt) : null, postedBy: req.user?.email || 'admin' } });
    await logActivity(req, 'Posted notice: ' + title, 'NOTICES');
    res.status(201).json({ success: true, data: notice });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/notices/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, isPinned, isEmergency } = req.body;
  try {
    const notice = await prisma.notice.update({ where: { id }, data: { title, content, isPinned, isEmergency } });
    res.json({ success: true, data: notice });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/notices/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try { await prisma.notice.delete({ where: { id } }); res.json({ success: true, message: 'Notice deleted' }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }
  try {
    const notifications = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
    const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/notifications/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try { await prisma.notification.update({ where: { id }, data: { isRead: true } }); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/notifications/mark-all-read', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/notifications/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) { res.status(404).json({ success: false, error: 'Notification not found' }); return; }
    if (notif.userId !== req.user?.id) { res.status(403).json({ success: false, error: 'Unauthorized' }); return; }
    await prisma.notification.delete({ where: { id } });
    res.json({ success: true, message: 'Notification dismissed' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PROFILE ENDPOINTS
// ============================================================
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }
  try {
    const profile = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { hostel: true, room: true }
    });
    res.json({ success: true, data: profile });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }
  const { fullName, mobileNumber, address, emergencyContact, bloodGroup, medicalDetails, parentName, parentMobile, department, year, guardianName, guardianMobile } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(fullName && { fullName }),
        ...(mobileNumber && { mobileNumber }),
        ...(address !== undefined && { address }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(medicalDetails !== undefined && { medicalDetails }),
        ...(parentName !== undefined && { parentName }),
        ...(parentMobile !== undefined && { parentMobile }),
        ...(department !== undefined && { department }),
        ...(year !== undefined && { year }),
        ...(guardianName !== undefined && { guardianName }),
        ...(guardianMobile !== undefined && { guardianMobile })
      },
      include: { hostel: true, room: true }
    });
    await logActivity(req, 'Updated profile details', 'PROFILE');
    res.json({ success: true, data: updated, message: 'Profile updated successfully' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// GLOBAL SEARCH
// ============================================================
router.get('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { q } = req.query;
  if (!q || (q as string).length < 2) { res.status(400).json({ success: false, error: 'Query too short' }); return; }
  const query = q as string;
  const hostelId = req.user?.role !== 'SUPER_ADMIN' ? req.user?.hostelId : undefined;
  try {
    const userFilter: any = {
      OR: [
        { fullName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { registerNumber: { contains: query, mode: 'insensitive' } }
      ],
      isDeleted: false
    };
    if (hostelId) userFilter.hostelId = hostelId;
    const [students, complaints, fees] = await Promise.all([
      prisma.user.findMany({ where: { ...userFilter, role: 'STUDENT' }, select: { id: true, fullName: true, email: true, registerNumber: true, role: true, status: true }, take: 10 }),
      prisma.complaint.findMany({ where: { title: { contains: query, mode: 'insensitive' }, ...(hostelId && { hostelId }), isDeleted: false }, take: 10 }),
      prisma.fee.findMany({ where: { title: { contains: query, mode: 'insensitive' }, ...(hostelId && { hostelId }) }, include: { student: { select: { fullName: true } } }, take: 10 })
    ]);
    res.json({ success: true, data: { students, complaints, fees, query } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// REPORTS
// ============================================================
router.get('/reports/attendance', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hId = req.query.hostelId as string || req.user?.hostelId;
  const { startDate, endDate } = req.query;
  try {
    const filter: any = {};
    if (hId) filter.user = { hostelId: hId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.gte = new Date(startDate as string);
      if (endDate) {
        const e = new Date(endDate as string);
        e.setHours(23, 59, 59, 999);
        filter.date.lte = e;
      }
    }
    const records = await prisma.attendance.findMany({ where: filter, include: { user: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true } } } } }, orderBy: { date: 'desc' }, take: 500 });
    const total = records.length, present = records.filter(r => r.isPresent).length;
    res.json({ success: true, data: { records, summary: { total, present, absent: total - present, rate: total > 0 ? Math.round((present / total) * 100) : 0 } } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/fees', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const fees = await prisma.fee.findMany({ where, include: { student: { select: { fullName: true, registerNumber: true } }, payments: true }, orderBy: { dueDate: 'desc' } });
    const totalDue = fees.reduce((s, f) => s + f.amount, 0);
    const totalCollected = fees.reduce((s, f) => s + f.paidAmount, 0);
    res.json({ success: true, data: { fees, summary: { totalDue, totalCollected, outstanding: totalDue - totalCollected, pending: fees.filter(f => f.status !== 'PAID').length } } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/occupancy', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = { isDeleted: false };
    if (hostelId) where.hostelId = hostelId;
    const rooms = await prisma.room.findMany({ where, include: { users: { select: { id: true }, where: { isDeleted: false } } } });
    const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
    const occupiedBeds = rooms.reduce((s, r) => s + r.users.length, 0);
    res.json({ success: true, data: { rooms: rooms.map(r => ({ id: r.id, block: r.block, roomNumber: r.roomNumber, capacity: r.capacity, occupied: r.users.length, available: r.capacity - r.users.length, category: r.category })), summary: { totalBeds, occupiedBeds, availableBeds: totalBeds - occupiedBeds, occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0 } } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/complaints', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = { isDeleted: false };
    if (hostelId) where.hostelId = hostelId;
    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        student: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true, block: true } } } },
        worker: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'COMPLETED').length;
    const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ACCEPTED').length;
    const pending = complaints.filter(c => c.status === 'PENDING' || c.status === 'ASSIGNED').length;

    res.json({
      success: true,
      data: {
        complaints,
        summary: { total, resolved, inProgress, pending, resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0 }
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/leaves', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const leaves = await prisma.leave.findMany({
      where,
      include: { user: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true } } } } },
      orderBy: { createdAt: 'desc' }
    });

    const total = leaves.length;
    const approved = leaves.filter(l => l.status === 'APPROVED').length;
    const pending = leaves.filter(l => l.status === 'PENDING').length;
    const rejected = leaves.filter(l => l.status === 'REJECTED').length;

    res.json({
      success: true,
      data: {
        leaves,
        summary: { total, approved, pending, rejected, approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0 }
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/gate-passes', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const gatePasses = await prisma.gatePass.findMany({
      where,
      include: { student: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true } } } } },
      orderBy: { createdAt: 'desc' }
    });

    const total = gatePasses.length;
    const approved = gatePasses.filter(g => g.status === 'APPROVED').length;
    const exited = gatePasses.filter(g => g.status === 'EXITED').length;
    const returned = gatePasses.filter(g => g.status === 'RETURNED').length;
    const pending = gatePasses.filter(g => g.status === 'PENDING').length;

    res.json({
      success: true,
      data: {
        gatePasses,
        summary: { total, approved, exited, returned, pending }
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// AUDIT LOGS
// ============================================================
router.get('/audit-logs', authMiddleware, requirePermission('manage_settings'), async (req: AuthRequest, res: Response) => {
  const { module, userEmail, page = '1', limit = '50', startDate, endDate } = req.query;
  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(200, Math.max(10, parseInt(limit as string) || 50));
  const skip = (pageNum - 1) * limitNum;

  const filter: any = {};
  if (module) filter.module = module as string;
  if (userEmail) filter.userEmail = { contains: userEmail as string, mode: 'insensitive' };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.gte = new Date(startDate as string);
    if (endDate) {
      const e = new Date(endDate as string);
      e.setHours(23, 59, 59, 999);
      filter.createdAt.lte = e;
    }
  }

  try {
    const [logs, totalCount] = await Promise.all([
      prisma.activityLog.findMany({ where: filter, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.activityLog.count({ where: filter })
    ]);
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// BACKUP & RESTORE
// ============================================================
router.get('/backup/export', authMiddleware, requirePermission('manage_settings'), async (req: AuthRequest, res: Response) => {
  try {
    const [hostels, rooms, messes, fees, inventory, expenses, payrolls, notices, rolePermissions] = await Promise.all([
      prisma.hostel.findMany(), prisma.room.findMany(), prisma.mess.findMany(), prisma.fee.findMany(),
      prisma.inventory.findMany(), prisma.expense.findMany(), prisma.payroll.findMany(), prisma.notice.findMany(), prisma.rolePermission.findMany()
    ]);
    res.json({ success: true, data: { exportedAt: new Date().toISOString(), data: { hostels, rooms, messes, fees, inventory, expenses, payrolls, notices, rolePermissions } } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/backup/restore', authMiddleware, requirePermission('manage_settings'), async (req: AuthRequest, res: Response) => {
  const { backup } = req.body;
  if (!backup || !backup.data) { res.status(400).json({ success: false, error: 'Invalid backup file' }); return; }
  try {
    const { hostels, rolePermissions } = backup.data;
    if (Array.isArray(hostels) && hostels.length > 0) {
      for (const h of hostels) {
        await prisma.hostel.upsert({ where: { id: h.id }, update: { name: h.name, code: h.code }, create: { id: h.id, name: h.name, code: h.code, collegeName: h.collegeName || '', address: h.address || '', capacity: h.capacity || 0 } });
      }
    }
    if (Array.isArray(rolePermissions) && rolePermissions.length > 0) {
      await prisma.rolePermission.deleteMany({});
      await prisma.rolePermission.createMany({ data: rolePermissions.map((rp: any) => ({ role: rp.role, permission: rp.permission })) });
    }
    await logActivity(req, 'Restored database from backup', 'SETTINGS');
    res.json({ success: true, message: 'Configuration restored successfully' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// WORKER MANAGEMENT & CATEGORIES
// ============================================================

router.get('/workers/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    let categories = await prisma.workerCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { workers: true } } }
    });

    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Plumber', description: 'Water leaks, tap replacement, pipe repair', icon: 'Wrench' },
        { name: 'Electrician', description: 'Wiring, switches, fan, lights, AC power', icon: 'Zap' },
        { name: 'Carpenter', description: 'Doors, windows, cupboards, chairs, beds', icon: 'Hammer' },
        { name: 'Cleaner', description: 'Room cleaning, floor wash, waste disposal', icon: 'Sparkles' },
        { name: 'AC Technician', description: 'AC cooling, gas refill, filter cleaning', icon: 'Wind' },
        { name: 'Maintenance', description: 'General civil repair and masonry work', icon: 'Settings' },
        { name: 'Internet Technician', description: 'Wi-Fi router, LAN cable, network ports', icon: 'Wifi' },
        { name: 'Security', description: 'Gate pass and perimeter security', icon: 'Shield' }
      ];

      for (const cat of defaultCategories) {
        await prisma.workerCategory.upsert({
          where: { name: cat.name },
          update: {},
          create: cat
        });
      }

      categories = await prisma.workerCategory.findMany({
        where: { isActive: true },
        include: { _count: { select: { workers: true } } }
      });
    }

    res.json({ success: true, data: categories });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/workers/categories', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { name, description, icon } = req.body;
  if (!name) { res.status(400).json({ success: false, error: 'Category name is required' }); return; }
  try {
    const category = await prisma.workerCategory.create({
      data: { name, description, icon: icon || 'Wrench' }
    });
    res.json({ success: true, data: category });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/workers', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { categoryId, availability, hostelId } = req.query;
  const filter: any = { role: 'WORKER' };
  if (hostelId) filter.hostelId = hostelId as string;

  try {
    const workers = await prisma.user.findMany({
      where: filter,
      select: {
        id: true, fullName: true, email: true, mobileNumber: true, role: true, status: true, hostelId: true,
        workerProfile: {
          include: { category: true }
        }
      }
    });

    let filtered = workers.filter(w => w.workerProfile !== null);
    if (categoryId) {
      filtered = filtered.filter(w => w.workerProfile?.categoryId === categoryId);
    }
    if (availability) {
      filtered = filtered.filter(w => w.workerProfile?.availability === availability);
    }

    res.json({ success: true, data: filtered });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/workers', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { fullName, email, password, mobileNumber, categoryId, specialization, hostelId, block } = req.body;
  if (!fullName || !email || !password || !categoryId) {
    res.status(400).json({ success: false, error: 'Full name, email, password and category are required' });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ success: false, error: 'Email already registered' }); return; }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);
    const workerId = 'WRK-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    const workerUser = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        mobileNumber: mobileNumber || '0000000000',
        role: 'WORKER',
        status: 'APPROVED',
        hostelId: hostelId || req.user?.hostelId || null,
        workerProfile: {
          create: {
            workerId,
            categoryId,
            specialization: specialization || null,
            hostelId: hostelId || req.user?.hostelId || null,
            block: block || null,
            status: 'ACTIVE',
            availability: 'AVAILABLE'
          }
        }
      },
      include: { workerProfile: { include: { category: true } } }
    });

    res.json({ success: true, data: workerUser });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// WORKER PORTAL & COMPLAINT WORKFLOW
// ============================================================

router.get('/worker/dashboard', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: user.id },
      include: { category: true }
    });

    const categoryName = profile?.category?.name;
    const workerHostelId = profile?.hostelId || user.hostelId;

    const whereCondition: any = {
      isDeleted: false,
      OR: [
        { workerId: user.id },
        { staffId: user.id }
      ]
    };

    if (categoryName) {
      whereCondition.OR.push({
        workerId: null,
        category: { equals: categoryName, mode: 'insensitive' },
        ...(workerHostelId ? { hostelId: workerHostelId } : {})
      });
    }

    const complaints = await prisma.complaint.findMany({
      where: whereCondition,
      include: {
        student: { select: { fullName: true, mobileNumber: true, registerNumber: true, room: true } },
        hostel: { select: { name: true } },
        timeline: { orderBy: { timestamp: 'desc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const assignedCount = complaints.length;
    const pendingAcceptance = complaints.filter(c => c.status === 'PENDING' || c.status === 'ASSIGNED').length;
    const inProgress = complaints.filter(c => c.status === 'ACCEPTED' || c.status === 'IN_PROGRESS').length;
    const completed = complaints.filter(c => c.status === 'COMPLETED' || c.status === 'RESOLVED' || c.status === 'VERIFIED').length;

    res.json({
      success: true,
      data: {
        profile,
        metrics: { assignedCount, pendingAcceptance, inProgress, completed, rating: profile?.rating || 5.0 },
        complaints
      }
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/worker/complaints/:id/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Worker';
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        workerId: user.id,
        staffId: user.id,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        timeline: {
          create: {
            event: 'ACCEPTED',
            title: 'Worker Accepted Job',
            description: `Worker ${actorName} accepted the complaint assignment.`,
            actorName: actorName,
            actorRole: 'WORKER'
          }
        }
      }
    });

    await prisma.notification.create({
      data: {
        userId: complaint.studentId,
        type: 'COMPLAINT_ACCEPTED',
        title: 'Worker Accepted Complaint',
        message: `Worker ${actorName} accepted your complaint "${complaint.title}".`
      }
    });

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});


router.post('/worker/complaints/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Worker';
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'REJECTED',
        workerId: null,
        staffId: null,
        rejectedAt: new Date(),
        rejectionReason: reason || 'Not specified',
        timeline: {
          create: {
            event: 'REJECTED',
            title: 'Worker Rejected Assignment',
            description: `Worker ${actorName} rejected the assignment. Reason: ${reason || 'Not specified'}`,
            actorName: actorName,
            actorRole: 'WORKER'
          }
        }
      }
    });

    // Notify Hostel Admins and Wardens so they can reassign
    try {
      const targetAdmins = await prisma.user.findMany({
        where: {
          role: { in: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN'] },
          ...(complaint.hostelId ? { OR: [{ hostelId: complaint.hostelId }, { role: 'SUPER_ADMIN' }] } : {})
        }
      });

      if (targetAdmins.length > 0) {
        await prisma.notification.createMany({
          data: targetAdmins.map(admin => ({
            userId: admin.id,
            type: 'COMPLAINT_REJECTED',
            title: 'Complaint Assignment Rejected',
            message: `Worker ${actorName} rejected complaint "${complaint.title}". Reason: ${reason || 'Not specified'}. Ready for reassignment.`
          }))
        });
      }
    } catch (notifErr) {
      console.error('Error notifying admins on worker rejection:', notifErr);
    }

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/worker/complaints/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Worker';
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        timeline: {
          create: {
            event: 'STARTED',
            title: 'Work Started',
            description: `Worker ${actorName} has started work on site.`,
            actorName: actorName,
            actorRole: 'WORKER'
          }
        }
      }
    });

    await prisma.notification.create({
      data: {
        userId: complaint.studentId,
        type: 'COMPLAINT_STARTED',
        title: 'Work Started',
        message: `Worker ${actorName} is currently working on "${complaint.title}".`
      }
    });

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/worker/complaints/:id/complete', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { completionNotes, materialsUsed } = req.body;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Worker';
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completionNotes: completionNotes || 'Work completed successfully',
        materialsUsed: materialsUsed || 'None',
        timeline: {
          create: {
            event: 'COMPLETED',
            title: 'Work Completed',
            description: `Notes: ${completionNotes || 'Work completed'}. Materials: ${materialsUsed || 'None'}.`,
            actorName: actorName,
            actorRole: 'WORKER'
          }
        }
      }
    });

    await prisma.workerProfile.updateMany({
      where: { userId: user.id },
      data: { completedCount: { increment: 1 } }
    });

    await prisma.notification.create({
      data: {
        userId: complaint.studentId,
        type: 'COMPLAINT_COMPLETED',
        title: 'Complaint Completed',
        message: `Worker ${actorName} has completed your complaint "${complaint.title}". Please confirm resolution.`
      }
    });

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complaints/:id/assign', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { workerId } = req.body;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Admin';
  try {
    const workerUser = await prisma.user.findUnique({ where: { id: workerId } });
    if (!workerUser) { res.status(404).json({ success: false, error: 'Worker not found' }); return; }

    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        workerId,
        staffId: workerId,
        status: 'ASSIGNED',
        assignedBy: actorName,
        assignedAt: new Date(),
        timeline: {
          create: {
            event: 'ASSIGNED',
            title: 'Worker Assigned',
            description: `Assigned to worker ${workerUser.fullName} by ${actorName}.`,
            actorName: actorName,
            actorRole: user.role
          }
        }
      }
    });

    await prisma.workerProfile.updateMany({
      where: { userId: workerId },
      data: { assignedCount: { increment: 1 } }
    });

    await prisma.notification.create({
      data: {
        userId: workerId,
        type: 'JOB_ASSIGNED',
        title: 'New Complaint Assigned',
        message: `You have been assigned to complaint "${complaint.title}".`
      }
    });

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complaints/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Student';
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        feedbackRating: rating ? Number(rating) : 5,
        studentFeedback: feedback || 'Confirmed resolved',
        timeline: {
          create: {
            event: 'CONFIRMED',
            title: 'Student Confirmed Resolution',
            description: `Rating: ${rating || 5} Stars. Feedback: ${feedback || 'Confirmed resolved.'}`,
            actorName: actorName,
            actorRole: 'STUDENT'
          }
        }
      }
    });

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complaints/:id/reopen', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;
  const actorName = (user as any).fullName || user.email || 'Student';
  try {
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'REOPENED',
        reopenedAt: new Date(),
        reopenReason: reason || 'Issue persists',
        timeline: {
          create: {
            event: 'REOPENED',
            title: 'Student Reopened Complaint',
            description: `Reason: ${reason || 'Issue persists'}`,
            actorName: actorName,
            actorRole: 'STUDENT'
          }
        }
      }
    });

    if (complaint.workerId) {
      await prisma.notification.create({
        data: {
          userId: complaint.workerId,
          type: 'COMPLAINT_REOPENED',
          title: 'Complaint Reopened',
          message: `Student ${actorName} reopened complaint "${complaint.title}".`
        }
      });
    }

    res.json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});


// ============================================================
// EMERGENCY ALERT SYSTEM
// ============================================================

router.post('/emergency/alert', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { type, level, message } = req.body;
  const user = req.user!;
  if (!type || !level) {
    res.status(400).json({ success: false, error: 'Emergency type and level are required' });
    return;
  }

  try {
    const studentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { room: true, hostel: true }
    });

    const hostelId = studentUser?.hostelId || req.user?.hostelId || '';
    const block = studentUser?.room?.block || null;
    const floor = studentUser?.room?.floor || null;
    const roomId = studentUser?.roomId || null;
    const roomNumber = studentUser?.room?.roomNumber || null;

    const alertRecord = await prisma.emergencyAlert.create({
      data: {
        type,
        level,
        hostelId,
        block,
        floor,
        roomId,
        roomNumber,
        message: message || `${type} emergency reported at ${level} level.`,
        reportedById: user.id,
        status: 'ACTIVE'
      },
      include: { reportedBy: { select: { fullName: true, mobileNumber: true } }, hostel: { select: { name: true } } }
    });

    let targetUsers: any[] = [];
    if (level === 'ROOM' && roomId) {
      targetUsers = await prisma.user.findMany({
        where: { OR: [{ roomId }, { role: { in: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY'] } }] }
      });
    } else if (level === 'FLOOR' && floor !== null) {
      targetUsers = await prisma.user.findMany({
        where: {
          OR: [
            { room: { floor, block: block || undefined } },
            { role: { in: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY'] } }
          ]
        }
      });
    } else {
      targetUsers = await prisma.user.findMany({
        where: { OR: [{ hostelId }, { role: 'SUPER_ADMIN' }] }
      });
    }

    if (targetUsers.length > 0) {
      const alertTitle = `🚨 EMERGENCY: ${type.toUpperCase()} (${level})`;
      const alertMsg = `Location: ${studentUser?.room?.block || 'Hostel'} - Room ${roomNumber || 'N/A'}. Details: ${message || type}`;

      await prisma.notification.createMany({
        data: targetUsers.map(u => ({
          userId: u.id,
          type: 'EMERGENCY',
          title: alertTitle,
          message: alertMsg,
          isRead: false
        }))
      });
    }

    res.json({ success: true, data: alertRecord, notifiedCount: targetUsers.length });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/emergency/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const filter: any = {};
    if (user.role !== 'SUPER_ADMIN' && user.hostelId) {
      filter.hostelId = user.hostelId;
    }

    const alerts = await prisma.emergencyAlert.findMany({
      where: filter,
      include: {
        reportedBy: { select: { fullName: true, mobileNumber: true } },
        acknowledgedBy: { select: { fullName: true } },
        hostel: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ success: true, data: alerts });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/emergency/:id/acknowledge', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  try {
    const alert = await prisma.emergencyAlert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedById: user.id
      }
    });
    res.json({ success: true, data: alert });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/emergency/:id/resolve', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const alert = await prisma.emergencyAlert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date()
      }
    });
    res.json({ success: true, data: alert });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// LAUNDRY WAITLIST
// ============================================================

router.post('/laundry/waitlist', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { timeSlot, date } = req.body;
  const user = req.user!;
  if (!timeSlot || !date) {
    res.status(400).json({ success: false, error: 'Time slot and date are required' });
    return;
  }

  try {
    const waitlistEntry = await prisma.laundryWaitlist.create({
      data: {
        timeSlot,
        date: new Date(date),
        userId: user.id,
        hostelId: user.hostelId || '',
        status: 'WAITING'
      }
    });

    res.json({ success: true, data: waitlistEntry });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;

