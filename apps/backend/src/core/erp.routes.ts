import { Router, Request, Response } from 'express';
import * as argon2 from 'argon2';
import { prisma } from './prisma';
import { authMiddleware, requirePermission, requireRole, AuthRequest } from './auth.middleware';
import { Role, GatePassStatus, NoticeAudience } from '@prisma/client';
import { seedDatabase, clearAllTestData } from './seed.service';
import { pushService } from './push.service';

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

async function addComplaintTimeline(complaintId: string, event: string, title: string, description: string, actorName: string, actorRole: string) {
  try { await prisma.complaintTimeline.create({ data: { complaintId, event, title, description, actorName, actorRole } }); }
  catch (err) { console.error(err); }
}

// Valid Gate Pass state transitions. Anything not listed here is rejected.
const GATE_PASS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['EXITED'],
  EXITED: ['RETURNED'],
  REJECTED: [],
  RETURNED: []
};

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

// Dedicated Student Hostel Allocation
router.post('/students/:id/allocate', authMiddleware, requirePermission('manage_students'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { hostelId, roomId, bedNumber, academicYear } = req.body;
  if (!hostelId || !roomId) { res.status(400).json({ success: false, error: 'Hostel ID and Room ID are required' }); return; }

  try {
    const student = await prisma.user.findUnique({ where: { id } });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }

    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: { where: { isDeleted: false, status: 'APPROVED', role: 'STUDENT' } } } });
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }
    if (room.isMaintenance) { res.status(400).json({ success: false, error: 'Cannot allocate to room currently under maintenance' }); return; }
    if (room.users.length >= room.capacity) { res.status(400).json({ success: false, error: 'Room has reached maximum capacity' }); return; }

    if (bedNumber) {
      const existingBedOccupant = room.users.find(u => u.bedNumber === bedNumber && u.id !== id);
      if (existingBedOccupant) { res.status(400).json({ success: false, error: `Bed ${bedNumber} is already occupied` }); return; }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        hostelId,
        roomId,
        bedNumber: bedNumber || `Bed-${room.users.length + 1}`,
        status: 'APPROVED',
        allocationDate: new Date(),
        checkOutDate: null,
        checkOutReason: null
      }
    });

    await createNotification(id, 'Hostel Room Allocated', `You have been allocated Room ${room.roomNumber} (Block ${room.block}) in ${room.hostelId}.`, 'ANNOUNCEMENT');
    await logActivity(req, `Allocated student ${student.fullName} to Room ${room.roomNumber}`, 'STUDENTS', `Hostel: ${hostelId}, Room: ${room.roomNumber}, Bed: ${bedNumber || 'Auto'}`);
    res.json({ success: true, data: updatedUser });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Dedicated Student Room / Bed Transfer
router.post('/students/:id/transfer', authMiddleware, requirePermission('manage_students'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { targetHostelId, targetRoomId, targetBedNumber, reason, remarks } = req.body;
  if (!targetRoomId) { res.status(400).json({ success: false, error: 'Target Room ID is required' }); return; }

  try {
    const student = await prisma.user.findUnique({ where: { id }, include: { room: true } });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }

    const targetRoom = await prisma.room.findUnique({ where: { id: targetRoomId }, include: { users: { where: { isDeleted: false, status: 'APPROVED', role: 'STUDENT' } } } });
    if (!targetRoom) { res.status(404).json({ success: false, error: 'Target Room not found' }); return; }
    if (targetRoom.isMaintenance) { res.status(400).json({ success: false, error: 'Target room is under maintenance' }); return; }
    if (targetRoom.users.length >= targetRoom.capacity) { res.status(400).json({ success: false, error: 'Target room is full' }); return; }

    const oldLocation = student.room ? `Room ${student.room.roomNumber} (Block ${student.room.block})` : 'Unassigned';

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        hostelId: targetHostelId || targetRoom.hostelId,
        roomId: targetRoomId,
        bedNumber: targetBedNumber || `Bed-${targetRoom.users.length + 1}`,
        allocationDate: new Date()
      }
    });

    await createNotification(id, 'Room Transfer Processed', `Your room transfer to Room ${targetRoom.roomNumber} (Block ${targetRoom.block}) has been completed.`, 'ANNOUNCEMENT');
    await logActivity(req, `Transferred ${student.fullName} from ${oldLocation} to Room ${targetRoom.roomNumber}`, 'STUDENTS', `Reason: ${reason || 'N/A'}. Remarks: ${remarks || 'None'}`);
    res.json({ success: true, data: updatedUser });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Dedicated Student Check-Out
router.post('/students/:id/checkout', authMiddleware, requirePermission('manage_students'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { checkOutDate, reason, remarks } = req.body;

  try {
    const student = await prisma.user.findUnique({ where: { id }, include: { room: true } });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }

    const oldRoom = student.room?.roomNumber || 'N/A';

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        roomId: null,
        bedNumber: null,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : new Date(),
        checkOutReason: reason || 'Routine Check-out'
      }
    });

    await createNotification(id, 'Hostel Check-Out Completed', `Your check-out from Room ${oldRoom} has been processed.`, 'ANNOUNCEMENT');
    await logActivity(req, `Checked out student ${student.fullName} from Room ${oldRoom}`, 'STUDENTS', `Reason: ${reason || 'Check-out'}. Remarks: ${remarks || 'N/A'}`);
    res.json({ success: true, data: updatedUser });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Block & Floor Breakdown Endpoint
router.get('/hostels/:id/blocks', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const rooms = await prisma.room.findMany({
      where: { hostelId: id, isDeleted: false },
      include: { users: { where: { role: 'STUDENT', isDeleted: false, status: 'APPROVED' } } }
    });

    const blocksMap: any = {};
    rooms.forEach(r => {
      if (!blocksMap[r.block]) {
        blocksMap[r.block] = { blockName: r.block, totalRooms: 0, totalCapacity: 0, occupiedBeds: 0, availableBeds: 0, maintenanceRooms: 0, floors: {} };
      }
      const b = blocksMap[r.block];
      b.totalRooms += 1;
      b.totalCapacity += r.capacity;
      const occupied = r.users.length;
      b.occupiedBeds += occupied;
      if (r.isMaintenance) b.maintenanceRooms += 1;

      if (!b.floors[r.floor]) {
        b.floors[r.floor] = { floorNumber: r.floor, totalRooms: 0, totalCapacity: 0, occupiedBeds: 0, availableBeds: 0, maintenanceRooms: 0 };
      }
      const f = b.floors[r.floor];
      f.totalRooms += 1;
      f.totalCapacity += r.capacity;
      f.occupiedBeds += occupied;
      if (r.isMaintenance) f.maintenanceRooms += 1;
    });

    const blocksList = Object.values(blocksMap).map((b: any) => {
      b.availableBeds = b.totalCapacity - b.occupiedBeds;
      b.floors = Object.values(b.floors).map((f: any) => {
        f.availableBeds = f.totalCapacity - f.occupiedBeds;
        return f;
      }).sort((a: any, b: any) => a.floorNumber - b.floorNumber);
      return b;
    });

    res.json({ success: true, data: blocksList });
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
// MEAL CONFIRMATION & SKIP SYSTEM
// ============================================================

router.get('/meals', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { date, hostelId, block, floor } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    if (req.user?.role === 'STUDENT') {
      const student = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { hostelId: true, messId: true }
      });
      if (!student || !student.hostelId) {
        res.json({ success: true, data: [] });
        return;
      }
      const studentHostelId = student.hostelId;
      const studentMessId = student.messId;

      // Fetch active meals for student's hostel/mess using date range
      const mealWhere: any = {
        date: { gte: startOfDay, lte: endOfDay },
        hostelId: studentHostelId
      };
      if (studentMessId) {
        mealWhere.OR = [
          { messId: studentMessId },
          { messId: null }
        ];
      }

      const meals = await prisma.meal.findMany({
        where: mealWhere,
        orderBy: { mealTime: 'asc' }
      });

      // Fetch leaves for this student to check if they are away
      const isOnLeave = await prisma.leave.findFirst({
        where: {
          userId: req.user.id,
          status: 'APPROVED',
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay }
        }
      });

      const data = await Promise.all(meals.map(async (meal) => {
        const confirmation = await prisma.mealConfirmation.findUnique({
          where: {
            mealId_studentId: {
              mealId: meal.id,
              studentId: req.user!.id
            }
          }
        });

        // Cutoff check
        const isClosed = new Date() >= new Date(meal.cutoffTime);

        // If student is on approved leave, they are marked as SKIPPED automatically
        let displayStatus = 'TAKING';
        if (isOnLeave) {
          displayStatus = 'SKIPPED';
        } else if (confirmation) {
          displayStatus = confirmation.status;
        }

        return {
          ...meal,
          status: meal.status,
          userStatus: displayStatus,
          isClosed,
          isOnLeave: !!isOnLeave
        };
      }));

      res.json({ success: true, data });
    } else {
      // Admin / Mess Manager View: get stats
      const filterHostelId = (hostelId as string) || req.user?.hostelId;
      
      const whereClause: any = {
        date: { gte: startOfDay, lte: endOfDay }
      };
      if (filterHostelId) {
        whereClause.hostelId = filterHostelId;
      }

      const meals = await prisma.meal.findMany({
        where: whereClause,
        orderBy: { mealTime: 'asc' }
      });

      const data = await Promise.all(meals.map(async (meal) => {
        // Find active students eligible for this meal
        const studentQuery: any = {
          role: 'STUDENT',
          isDeleted: false,
          status: 'APPROVED',
          hostelId: meal.hostelId
        };
        if (meal.messId) studentQuery.messId = meal.messId;

        if (block || floor) {
          studentQuery.room = {};
          if (block) studentQuery.room.block = block as string;
          if (floor) studentQuery.room.floor = parseInt(floor as string);
        }

        const activeStudents = await prisma.user.findMany({
          where: studentQuery,
          select: { id: true, hostelId: true }
        });

        const activeStudentIds = activeStudents.map(s => s.id);

        // Find approved leaves covering this date
        const leaves = await prisma.leave.findMany({
          where: {
            status: 'APPROVED',
            startDate: { lte: meal.date },
            endDate: { gte: meal.date },
            userId: { in: activeStudentIds }
          },
          select: { userId: true }
        });
        const onLeaveStudentIds = new Set(leaves.map(l => l.userId));

        // Eligible students
        const eligibleStudents = activeStudents.filter(s => !onLeaveStudentIds.has(s.id));
        const eligibleStudentIds = eligibleStudents.map(s => s.id);

        // Find confirmations
        const confirmations = await prisma.mealConfirmation.findMany({
          where: {
            mealId: meal.id,
            studentId: { in: eligibleStudentIds }
          }
        });

        const skippedStudentIds = new Set(
          confirmations.filter(c => c.status === 'SKIPPED').map(c => c.studentId)
        );

        const totalEligible = eligibleStudents.length;
        const skippedCount = skippedStudentIds.size;
        const takingCount = totalEligible - skippedCount;

        // Hostel-wise Breakdown
        const hostels = await prisma.hostel.findMany();
        const hostelBreakdown = await Promise.all(hostels.map(async (h) => {
          const hActive = activeStudents.filter(s => s.hostelId === h.id);
          const hActiveIds = hActive.map(s => s.id);
          const hLeaves = leaves.filter(l => hActiveIds.includes(l.userId));
          const hLeaveUserIds = new Set(hLeaves.map(l => l.userId));
          
          const hEligible = hActive.filter(s => !hLeaveUserIds.has(s.id));
          const hEligibleIds = hEligible.map(s => s.id);
          
          const hConfirmations = confirmations.filter(c => hEligibleIds.includes(c.studentId));
          const hSkipped = hConfirmations.filter(c => c.status === 'SKIPPED').length;
          
          const hEligibleCount = hEligible.length;
          const hTakingCount = hEligibleCount - hSkipped;

          return {
            hostelId: h.id,
            hostelName: h.name,
            eligible: hEligibleCount,
            skipped: hSkipped,
            taking: hTakingCount
          };
        }));

        return {
          ...meal,
          isClosed: new Date() >= new Date(meal.cutoffTime),
          stats: {
            totalEligible,
            skippedCount,
            takingCount,
            hostelBreakdown: hostelBreakdown.filter(h => h.eligible > 0)
          }
        };
      }));

      res.json({ success: true, data });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/meals', authMiddleware, requirePermission('manage_mess'), async (req: AuthRequest, res: Response) => {
  const { date, type, menu, cutoffTime, mealTime, hostelId, messId } = req.body;
  if (!date || !type || !menu || !cutoffTime || !mealTime || !hostelId) {
    res.status(400).json({ success: false, error: 'Missing parameters' });
    return;
  }
  const cleanDate = new Date(new Date(date).setUTCHours(0, 0, 0, 0));

  try {
    const meal = await prisma.meal.upsert({
      where: {
        date_type_hostelId_messId: {
          date: cleanDate,
          type,
          hostelId,
          messId: messId || null
        }
      },
      update: {
        menu,
        cutoffTime: new Date(cutoffTime),
        mealTime: new Date(mealTime),
        status: 'ACTIVE'
      },
      create: {
        date: cleanDate,
        type,
        menu,
        cutoffTime: new Date(cutoffTime),
        mealTime: new Date(mealTime),
        hostelId,
        messId: messId || null,
        status: 'ACTIVE'
      }
    });

    // Notify eligible students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', hostelId, messId: messId || null, isDeleted: false }
    });
    for (const student of students) {
      await createNotification(
        student.id,
        'New Meal Menu Published',
        `Menu for ${type} on ${new Date(date).toLocaleDateString()} is published: ${menu}`,
        'MESS',
        'mess_confirm'
      );
    }

    await logActivity(req, 'Published Meal: ' + type + ' for ' + date, 'MESS');
    res.status(201).json({ success: true, data: meal });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/meals/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['TAKING', 'SKIPPED'].includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status' });
    return;
  }

  try {
    const meal = await prisma.meal.findUnique({ where: { id } });
    if (!meal) {
      res.status(404).json({ success: false, error: 'Meal not found' });
      return;
    }

    if (meal.status === 'CANCELLED') {
      res.status(400).json({ success: false, error: 'Meal is cancelled' });
      return;
    }

    if (new Date() >= new Date(meal.cutoffTime)) {
      res.status(400).json({ success: false, error: 'Meal confirmation is closed for this meal.' });
      return;
    }

    const confirmation = await prisma.mealConfirmation.upsert({
      where: {
        mealId_studentId: {
          mealId: id,
          studentId: req.user!.id
        }
      },
      update: { status },
      create: {
        mealId: id,
        studentId: req.user!.id,
        status
      }
    });

    res.json({ success: true, data: confirmation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/meals/:id/cancel', authMiddleware, requirePermission('manage_mess'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const meal = await prisma.meal.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // Notify students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT', hostelId: meal.hostelId, messId: meal.messId || null, isDeleted: false }
    });
    for (const student of students) {
      await createNotification(
        student.id,
        'Meal Cancelled',
        `The ${meal.type} on ${new Date(meal.date).toLocaleDateString()} has been cancelled.`,
        'MESS'
      );
    }

    await logActivity(req, 'Cancelled Meal: ' + meal.type + ' for ' + meal.date, 'MESS');
    res.json({ success: true, data: meal });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/meals/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role === 'STUDENT') {
      const confirmations = await prisma.mealConfirmation.findMany({
        where: { studentId: req.user.id },
        include: { meal: true },
        orderBy: { meal: { date: 'desc' } },
        take: 100
      });

      const data = confirmations.map(c => ({
        date: c.meal.date,
        meal: c.meal.type,
        status: c.status,
        menu: c.meal.menu
      }));

      res.json({ success: true, data });
    } else {
      const filterHostelId = req.query.hostelId as string || req.user?.hostelId;
      const whereClause: any = {};
      if (filterHostelId) {
        whereClause.hostelId = filterHostelId;
      }

      const meals = await prisma.meal.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        take: 150
      });

      const data = await Promise.all(meals.map(async (meal) => {
        const studentQuery: any = {
          role: 'STUDENT',
          isDeleted: false,
          status: 'APPROVED',
          hostelId: meal.hostelId
        };
        if (meal.messId) studentQuery.messId = meal.messId;

        const activeStudents = await prisma.user.findMany({
          where: studentQuery,
          select: { id: true }
        });
        const activeStudentIds = activeStudents.map(s => s.id);

        const leaves = await prisma.leave.findMany({
          where: {
            status: 'APPROVED',
            startDate: { lte: meal.date },
            endDate: { gte: meal.date },
            userId: { in: activeStudentIds }
          },
          select: { userId: true }
        });
        const onLeaveStudentIds = new Set(leaves.map(l => l.userId));
        const eligibleStudents = activeStudents.filter(s => !onLeaveStudentIds.has(s.id));
        const eligibleStudentIds = eligibleStudents.map(s => s.id);

        const confirmations = await prisma.mealConfirmation.findMany({
          where: { mealId: meal.id, studentId: { in: eligibleStudentIds } }
        });

        const skipped = confirmations.filter(c => c.status === 'SKIPPED').length;
        const eligible = eligibleStudents.length;
        const taking = eligible - skipped;

        return {
          id: meal.id,
          date: meal.date,
          meal: meal.type,
          eligible,
          taking,
          skipped,
          menu: meal.menu,
          status: meal.status
        };
      }));

      res.json({ success: true, data });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// FEE MANAGEMENT
// ============================================================
router.get('/fees', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId, hostelId, status } = req.query;
  const filter: any = {};
  if (req.user?.role === 'STUDENT') {
    filter.studentId = req.user.id;
  } else if (studentId) {
    filter.studentId = studentId as string;
  }
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

router.post('/inventory/:id/damage', authMiddleware, requirePermission('manage_inventory'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity, purpose, hostelId } = req.body;
  if (!quantity) { res.status(400).json({ success: false, error: 'Quantity is required' }); return; }

  try {
    const inventory = await prisma.inventory.findUnique({ where: { id } });
    if (!inventory) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    const dmgQty = Number(quantity);
    const updatedInv = await prisma.inventory.update({
      where: { id },
      data: {
        damagedCount: (inventory.damagedCount || 0) + dmgQty,
        quantity: Math.max(0, inventory.quantity - dmgQty)
      }
    });

    await logActivity(req, `Reported ${dmgQty} ${inventory.unit} damaged for ${inventory.itemName}`, 'INVENTORY', `Reason: ${purpose || 'Damaged/Expired'}`);
    res.json({ success: true, data: updatedInv });
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
  const role = req.user?.role || '';

  if (!status) { res.status(400).json({ success: false, error: 'Status is required' }); return; }
  if (!['APPROVED', 'REJECTED', 'EXITED', 'RETURNED'].includes(status)) {
    res.status(400).json({ success: false, error: 'Invalid status value' });
    return;
  }

  const approvalRoles = ['HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SUPER_ADMIN', 'WARDEN'];
  const exitReturnRoles = ['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN'];
  const isApprovalAction = status === 'APPROVED' || status === 'REJECTED';
  const isExitReturnAction = status === 'EXITED' || status === 'RETURNED';

  if (isApprovalAction && !approvalRoles.includes(role)) {
    res.status(403).json({ success: false, error: 'You are not authorized to approve or reject gate passes' });
    return;
  }
  if (isExitReturnAction && !exitReturnRoles.includes(role)) {
    res.status(403).json({ success: false, error: 'You are not authorized to process gate pass exit/return' });
    return;
  }

  try {
    const existing = await prisma.gatePass.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Gate pass not found' }); return; }

    const allowedNext = GATE_PASS_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(status)) {
      res.status(400).json({ success: false, error: `Cannot change gate pass from ${existing.status} to ${status}` });
      return;
    }

    const updates: any = { status: status as GatePassStatus };
    if (remarks) updates.remarks = remarks;
    if (status === 'APPROVED') {
      updates.qrCode = 'gp-' + id + '-' + Math.random().toString(36).substring(2, 10);
      updates.approvedBy = req.user?.email;
    }
    if (status === 'EXITED') updates.exitTime = new Date();
    if (status === 'RETURNED') {
      updates.actualReturn = new Date();
      if (existing.expectedReturn < new Date()) updates.lateReturn = true;
    }
    const pass = await prisma.gatePass.update({ where: { id }, data: updates, include: { student: true } });
    if (status === 'APPROVED') await createNotification(pass.studentId, 'Gate Pass Approved', 'Your gate pass to ' + pass.destination + ' approved.', 'GATE_PASS', 'gate_pass');
    if (status === 'REJECTED') await createNotification(pass.studentId, 'Gate Pass Rejected', 'Your gate pass was rejected. ' + (remarks || ''), 'GATE_PASS', 'gate_pass');
    await logActivity(req, 'Updated gate pass to ' + status, 'GATE_PASS');
    res.json({ success: true, data: pass });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Cancel a pending gate pass (owner student, or hostel administration)
router.delete('/gate-passes/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const pass = await prisma.gatePass.findUnique({ where: { id } });
    if (!pass) { res.status(404).json({ success: false, error: 'Gate pass not found' }); return; }

    const isOwner = req.user?.role === 'STUDENT' && pass.studentId === req.user.id;
    const isAdmin = ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN'].includes(req.user?.role || '');
    if (!isOwner && !isAdmin) {
      res.status(403).json({ success: false, error: 'You are not authorized to cancel this gate pass' });
      return;
    }
    if (pass.status !== 'PENDING') {
      res.status(400).json({ success: false, error: 'Only a pending gate pass can be cancelled' });
      return;
    }

    await prisma.gatePass.delete({ where: { id } });
    await logActivity(req, 'Cancelled gate pass', 'GATE_PASS');
    res.json({ success: true, message: 'Gate pass cancelled successfully' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/gate-passes/scan', authMiddleware, requireRole(['SECURITY', 'HOSTEL_ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { qrCode, action } = req.body;
  if (!qrCode) { res.status(400).json({ success: false, error: 'QR code required' }); return; }
  if (action !== 'EXIT' && action !== 'RETURN') { res.status(400).json({ success: false, error: 'Invalid scan action' }); return; }
  try {
    const pass = await prisma.gatePass.findFirst({ where: { qrCode }, include: { student: { select: { fullName: true, registerNumber: true } } } });
    if (!pass) { res.status(404).json({ success: false, error: 'Invalid gate pass QR' }); return; }

    const targetStatus = action === 'EXIT' ? 'EXITED' : 'RETURNED';
    const allowedNext = GATE_PASS_TRANSITIONS[pass.status] || [];
    if (!allowedNext.includes(targetStatus)) {
      res.status(400).json({ success: false, error: `Cannot ${action === 'EXIT' ? 'exit' : 'return'} a gate pass with status ${pass.status}` });
      return;
    }

    const update: any = { status: targetStatus };
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

router.post('/laundry/waitlist', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user?.hostelId) { res.status(400).json({ success: false, error: 'Must belong to a hostel' }); return; }
  const { timeSlot, date } = req.body;
  if (!timeSlot || !date) { res.status(400).json({ success: false, error: 'Time slot and date required' }); return; }
  try {
    const entry = await prisma.laundryWaitlist.create({ data: { timeSlot, date: new Date(date), userId: req.user.id, hostelId: req.user.hostelId } });
    res.status(201).json({ success: true, data: entry });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

const LAUNDRY_TRANSITIONS: Record<string, string[]> = {
  BOOKED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

router.patch('/laundry/:id', authMiddleware, requireRole(['LAUNDRY', 'HOSTEL_ADMIN', 'SUPER_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    const existing = await prisma.laundrySlot.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Laundry slot not found' }); return; }

    if (status) {
      const allowedNext = LAUNDRY_TRANSITIONS[existing.status] || [];
      if (!allowedNext.includes(status)) {
        res.status(400).json({ success: false, error: `Cannot change laundry status from ${existing.status} to ${status}` });
        return;
      }
    }

    const slot = await prisma.laundrySlot.update({ where: { id }, data: { status: status || undefined, notes } });
    if (status === 'DELIVERED') await createNotification(slot.userId, 'Laundry Delivered', 'Your laundry has been delivered to your room.', 'ANNOUNCEMENT', 'laundry');
    res.json({ success: true, data: slot });
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

router.post('/notices', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN']), async (req: AuthRequest, res: Response) => {
  const { title, content, audience, isEmergency, isPinned, hostelId, department, expiresAt } = req.body;
  if (!title || !content) { res.status(400).json({ success: false, error: 'Title and content required' }); return; }
  try {
    const notice = await prisma.notice.create({ data: { title, content, audience: audience || 'ALL', isEmergency: Boolean(isEmergency), isPinned: Boolean(isPinned), hostelId: hostelId || req.user?.hostelId || null, department, expiresAt: expiresAt ? new Date(expiresAt) : null, postedBy: req.user?.email || 'admin' } });
    await logActivity(req, 'Posted notice: ' + title, 'NOTICES');
    res.status(201).json({ success: true, data: notice });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/notices/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, content, isPinned, isEmergency } = req.body;
  try {
    const notice = await prisma.notice.update({ where: { id }, data: { title, content, isPinned, isEmergency } });
    res.json({ success: true, data: notice });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/notices/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'WARDEN']), async (req: AuthRequest, res: Response) => {
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
    if (notif.userId !== req.user?.id) { res.status(403).json({ success: false, error: 'You can only delete your own notifications' }); return; }
    await prisma.notification.delete({ where: { id } });
    res.json({ success: true, message: 'Notification deleted' });
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
  try {
    const filter: any = {};
    if (hId) filter.user = { hostelId: hId };
    const records = await prisma.attendance.findMany({ where: filter, include: { user: { select: { fullName: true, registerNumber: true } } }, orderBy: { date: 'desc' }, take: 500 });
    const total = records.length, present = records.filter(r => r.isPresent).length;
    res.json({ success: true, data: { records, summary: { total, present, absent: total - present, rate: total > 0 ? Math.round((present / total) * 100) : 0 } } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/fees', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const fees = await prisma.fee.findMany({ where, include: { student: { select: { fullName: true, registerNumber: true } }, payments: true } });
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
      include: { student: { select: { fullName: true, registerNumber: true } }, worker: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json({ success: true, data: { complaints } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/leaves', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const leaves = await prisma.leave.findMany({
      where,
      include: { user: { select: { fullName: true, registerNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json({ success: true, data: { leaves } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/gatePasses', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = {};
    if (hostelId) where.hostelId = hostelId;
    const gatePasses = await prisma.gatePass.findMany({
      where,
      include: { student: { select: { fullName: true, registerNumber: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    res.json({ success: true, data: { gatePasses } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// AUDIT LOGS
// ============================================================
router.get('/audit-logs', authMiddleware, requirePermission('manage_settings'), async (req: AuthRequest, res: Response) => {
  const { module, userEmail } = req.query;
  const filter: any = {};
  if (module) filter.module = module as string;
  if (userEmail) filter.userEmail = { contains: userEmail as string };
  try {
    const logs = await prisma.activityLog.findMany({ where: filter, orderBy: { createdAt: 'desc' }, take: 200 });
    res.json({ success: true, data: logs });
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
// ADMIN DASHBOARD ANALYTICS
// ============================================================
router.get('/admin/dashboard-stats', authMiddleware, requireRole(['SUPER_ADMIN', 'WARDEN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { date, hostelId, block, floor } = req.query;
  const targetDate = date ? new Date(date as string) : new Date();
  const startOfDay = new Date(targetDate.setUTCHours(0,0,0,0));
  const endOfDay = new Date(targetDate.setUTCHours(23,59,59,999));

  try {
    const activeHostelId = hostelId as string || req.user?.hostelId || undefined;
    
    // Construct filters for student/user queries
    const userFilter: any = { role: 'STUDENT', isDeleted: false, status: 'APPROVED' };
    if (activeHostelId) userFilter.hostelId = activeHostelId;
    if (block) userFilter.room = { block: block as string };
    if (floor) userFilter.room = { ...userFilter.room, floor: parseInt(floor as string) };

    const totalStudents = await prisma.user.count({ where: userFilter });

    const roomFilter: any = { isDeleted: false };
    if (activeHostelId) roomFilter.hostelId = activeHostelId;
    if (block) roomFilter.block = block as string;
    if (floor) roomFilter.floor = parseInt(floor as string);

    const rooms = await prisma.room.findMany({
      where: roomFilter,
      include: { users: { where: { role: 'STUDENT', isDeleted: false, status: 'APPROVED' } } }
    });

    const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const occupiedBeds = rooms.reduce((sum, r) => sum + r.users.length, 0);
    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const attendanceFilter: any = {
      date: { gte: startOfDay, lte: endOfDay }
    };
    if (activeHostelId) attendanceFilter.hostelId = activeHostelId;
    if (block || floor) {
      attendanceFilter.user = {
        room: {
          ...(block && { block: block as string }),
          ...(floor && { floor: parseInt(floor as string) })
        }
      };
    }
    const todayAttendanceRecords = await prisma.attendance.findMany({ where: attendanceFilter });
    const presentCount = todayAttendanceRecords.filter(r => r.isPresent).length;
    const absentCount = totalStudents - presentCount > 0 ? totalStudents - presentCount : 0;
    const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    const complaintFilter: any = { isDeleted: false };
    if (activeHostelId) complaintFilter.hostelId = activeHostelId;
    if (block || floor) {
      complaintFilter.student = {
        room: {
          ...(block && { block: block as string }),
          ...(floor && { floor: parseInt(floor as string) })
        }
      };
    }
    const complaintsList = await prisma.complaint.findMany({ where: complaintFilter });
    const openComplaintsCount = complaintsList.filter(c => ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'REOPENED'].includes(c.status)).length;

    const activeWorkersCount = await prisma.user.count({
      where: { role: 'WORKER', isDeleted: false, status: 'APPROVED' }
    });

    // 7 Days Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const historyAttendance = await prisma.attendance.findMany({
      where: {
        date: { gte: sevenDaysAgo },
        ...(activeHostelId && { hostelId: activeHostelId }),
        ...(block || floor ? {
          user: {
            room: {
              ...(block && { block: block as string }),
              ...(floor && { floor: parseInt(floor as string) })
            }
          }
        } : {})
      }
    });

    const trendMap: { [date: string]: { present: number } } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      trendMap[dateKey] = { present: 0 };
    }

    historyAttendance.forEach(att => {
      const dateKey = att.date.toISOString().split('T')[0];
      if (trendMap[dateKey] && att.isPresent) {
        trendMap[dateKey].present++;
      }
    });

    const attendanceTrend = Object.keys(trendMap).sort().map(k => ({
      date: k,
      present: trendMap[k].present,
      absent: totalStudents - trendMap[k].present > 0 ? totalStudents - trendMap[k].present : 0
    }));

    const hostelsList = await prisma.hostel.findMany({
      include: {
        rooms: {
          where: { isDeleted: false },
          include: { users: { where: { role: 'STUDENT', isDeleted: false, status: 'APPROVED' } } }
        }
      }
    });
    const hostelWiseOccupancy = hostelsList.map(h => {
      const total = h.rooms.reduce((sum, r) => sum + r.capacity, 0);
      const occupied = h.rooms.reduce((sum, r) => sum + r.users.length, 0);
      return {
        hostelName: h.name,
        occupied,
        total,
        percentage: total > 0 ? Math.round((occupied / total) * 100) : 0
      };
    });

    const vacantRooms = rooms.filter(r => r.users.length === 0).length;
    const fullyOccupiedRooms = rooms.filter(r => r.users.length >= r.capacity).length;
    const partiallyOccupiedRooms = rooms.filter(r => r.users.length > 0 && r.users.length < r.capacity).length;

    const statusCounts = {
      PENDING: complaintsList.filter(c => c.status === 'PENDING').length,
      ASSIGNED: complaintsList.filter(c => c.status === 'ASSIGNED').length,
      ACCEPTED: complaintsList.filter(c => c.status === 'ACCEPTED').length,
      IN_PROGRESS: complaintsList.filter(c => c.status === 'IN_PROGRESS').length,
      COMPLETED: complaintsList.filter(c => c.status === 'COMPLETED').length,
      RESOLVED: complaintsList.filter(c => c.status === 'RESOLVED').length,
      REJECTED: complaintsList.filter(c => c.status === 'REJECTED').length
    };

    const categoryMap: { [cat: string]: number } = { Plumbing: 0, Electrical: 0, Cleaning: 0, Carpentry: 0, AC: 0, Other: 0 };
    complaintsList.forEach(c => {
      const cat = c.category;
      if (categoryMap[cat] !== undefined) categoryMap[cat]++;
      else categoryMap['Other']++;
    });
    const categoryCounts = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));

    const resolvedComplaints = complaintsList.filter(c => ['COMPLETED', 'RESOLVED'].includes(c.status) && c.completedAt);
    let avgResolutionTime = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        const start = new Date(c.createdAt).getTime();
        const end = new Date(c.completedAt!).getTime();
        return sum + (end - start) / (1000 * 60 * 60);
      }, 0);
      avgResolutionTime = parseFloat((totalHours / resolvedComplaints.length).toFixed(1));
    }

    const workers = await prisma.user.findMany({
      where: { role: 'WORKER', isDeleted: false },
      include: { workerAssignedComplaints: { where: { isDeleted: false } } }
    });

    const workerWorkloads = workers.map(w => {
      const complaints = w.workerAssignedComplaints;
      return {
        workerName: w.fullName,
        assigned: complaints.filter(c => c.status === 'ASSIGNED').length,
        inProgress: complaints.filter(c => c.status === 'IN_PROGRESS').length,
        completed: complaints.filter(c => ['COMPLETED', 'RESOLVED'].includes(c.status)).length
      };
    });

    const todayMeals = await prisma.meal.findMany({
      where: {
        date: startOfDay,
        ...(activeHostelId && { hostelId: activeHostelId })
      },
      include: { confirmations: true }
    });

    const mealWise = todayMeals.map(m => {
      const skipped = m.confirmations.filter(c => c.status === 'SKIPPED').length;
      const taking = totalStudents - skipped > 0 ? totalStudents - skipped : 0;
      return {
        id: m.id,
        type: m.type,
        menu: m.menu,
        eligible: totalStudents,
        skipped,
        taking,
        skipRate: totalStudents > 0 ? ((skipped / totalStudents) * 100).toFixed(1) : '0.0'
      };
    });

    const laundryFilter: any = { date: { gte: startOfDay, lte: endOfDay } };
    if (activeHostelId) laundryFilter.hostelId = activeHostelId;
    const laundrySlotsToday = await prisma.laundrySlot.findMany({ where: laundryFilter });

    const laundryStats = {
      booked: laundrySlotsToday.filter(s => s.status === 'BOOKED').length,
      completed: laundrySlotsToday.filter(s => s.status === 'DELIVERED').length,
      cancelled: laundrySlotsToday.filter(s => s.status === 'CANCELLED').length,
      total: laundrySlotsToday.length,
      utilization: laundrySlotsToday.length > 0 ? Math.round((laundrySlotsToday.filter(s => s.status === 'BOOKED' || s.status === 'DELIVERED').length / laundrySlotsToday.length) * 100) : 0
    };

    const leaveFilter: any = {};
    if (activeHostelId) leaveFilter.hostelId = activeHostelId;
    const leavesToday = await prisma.leave.findMany({ where: leaveFilter });
    const leaveStats = {
      pending: leavesToday.filter(l => l.status === 'PENDING').length,
      approved: leavesToday.filter(l => l.status === 'APPROVED').length,
      rejected: leavesToday.filter(l => l.status === 'REJECTED').length
    };

    const visitorFilter: any = { visitDate: { gte: startOfDay, lte: endOfDay } };
    if (activeHostelId) visitorFilter.hostelId = activeHostelId;
    const visitorsToday = await prisma.visitor.findMany({ where: visitorFilter });
    const visitorStats = {
      today: visitorsToday.length,
      inside: visitorsToday.filter(v => v.checkInTime && !v.checkOutTime).length,
      approved: visitorsToday.filter(v => v.status === 'APPROVED').length,
      pending: visitorsToday.filter(v => v.status === 'PENDING').length
    };

    const emergencyFilter: any = {};
    if (activeHostelId) emergencyFilter.hostelId = activeHostelId;
    const emergencies = await prisma.emergencyAlert.findMany({ where: emergencyFilter });
    const emergencyStats = {
      total: emergencies.length,
      active: emergencies.filter(e => e.status === 'ACTIVE').length,
      acknowledged: emergencies.filter(e => e.status === 'ACKNOWLEDGED').length,
      resolved: emergencies.filter(e => e.status === 'RESOLVED').length,
      roomLevel: emergencies.filter(e => e.level === 'ROOM').length,
      floorLevel: emergencies.filter(e => e.level === 'FLOOR').length,
      hostelLevel: emergencies.filter(e => e.level === 'HOSTEL').length
    };

    const feeFilter: any = {};
    if (activeHostelId) feeFilter.hostelId = activeHostelId;
    const fees = await prisma.fee.findMany({ where: feeFilter });
    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);
    const totalPending = totalFees - totalPaid;
    const paymentStats = {
      totalFees,
      paid: totalPaid,
      pending: totalPending,
      rate: totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0
    };

    const needsAttention = [];
    if (statusCounts.PENDING > 0) needsAttention.push({ type: 'complaints', count: statusCounts.PENDING, label: `${statusCounts.PENDING} Pending Complaints` });
    if (emergencyStats.active > 0) needsAttention.push({ type: 'emergencies', count: emergencyStats.active, label: `${emergencyStats.active} Active Emergencies` });
    if (leaveStats.pending > 0) needsAttention.push({ type: 'leaves', count: leaveStats.pending, label: `${leaveStats.pending} Pending Leave Requests` });

    const [recentComplaints, recentLeaves, recentEmergencies] = await Promise.all([
      prisma.complaint.findMany({ where: complaintFilter, orderBy: { createdAt: 'desc' }, take: 5, include: { student: { select: { fullName: true } } } }),
      prisma.leave.findMany({ where: leaveFilter, orderBy: { createdAt: 'desc' }, take: 5, include: { user: { select: { fullName: true } } } }),
      prisma.emergencyAlert.findMany({ where: emergencyFilter, orderBy: { createdAt: 'desc' }, take: 5 })
    ]);

    const recentActivities = [
      ...recentComplaints.map(c => ({ time: c.createdAt, text: `New complaint raised: "${c.title}" by ${c.student.fullName}`, type: 'complaint' })),
      ...recentLeaves.map(l => ({ time: l.createdAt, text: `Leave request submitted by ${l.user.fullName} (${l.status})`, type: 'leave' })),
      ...recentEmergencies.map(e => ({ time: e.createdAt, text: `Emergency Alert triggered: "${e.type}" in level ${e.level}`, type: 'emergency' }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyRate,
          todayAttendanceRate: attendanceRate,
          openComplaints: openComplaintsCount,
          activeWorkers: activeWorkersCount
        },
        attendance: {
          summary: { present: presentCount, absent: absentCount, rate: attendanceRate },
          trend: attendanceTrend
        },
        occupancy: {
          hostelWise: hostelWiseOccupancy,
          roomDistribution: { vacant: vacantRooms, partially: partiallyOccupiedRooms, fully: fullyOccupiedRooms }
        },
        complaints: {
          statusCounts,
          categoryCounts,
          avgResolutionTime
        },
        workers: {
          total: workers.length,
          workloads: workerWorkloads
        },
        mess: {
          mealWise
        },
        laundry: laundryStats,
        leave: leaveStats,
        visitors: visitorStats,
        emergency: emergencyStats,
        payments: paymentStats,
        needsAttention,
        recentActivities
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN USER MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/admin/users - Admin User Directory List with Filters & Search
router.get('/admin/users', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { role, status, search, hostelId, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role && role !== 'ALL') where.role = role as string;
    if (status && status !== 'ALL') where.status = status as string;
    if (hostelId && hostelId !== 'ALL') where.hostelId = hostelId as string;

    if (search) {
      const q = (search as string).trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { registerNumber: { contains: q, mode: 'insensitive' } },
        { mobileNumber: { contains: q } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          plainPassword: true,
          fullName: true,
          mobileNumber: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          registerNumber: true,
          department: true,
          year: true,
          bedNumber: true,
          allocationDate: true,
          checkOutDate: true,
          checkOutReason: true,
          hostelId: true,
          hostel: { select: { id: true, name: true, code: true } },
          roomId: true,
          room: { select: { id: true, roomNumber: true, block: true, floor: true } },
          workerProfile: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      users: users.map(u => ({
        ...u,
        plainPassword: u.plainPassword || (u.email === 'admin@user' ? 'admin@123' : (u.email?.includes('@test.com') || u.email?.endsWith('@user') ? 'Password123!' : null))
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/admin/users/:id/status - Update Account Status (Activate/Deactivate/Approve)
router.put('/admin/users/:id/status', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'VERIFIED', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status value' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    await prisma.activityLog.create({
      data: {
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        action: 'UPDATE_USER_STATUS',
        module: 'ADMIN_USER_MANAGEMENT',
        details: `User account status updated to ${status}`
      }
    });

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/users/:id - Edit a user's profile/account fields
router.patch('/admin/users/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fullName, email, mobileNumber, department, year, registerNumber, role, hostelId } = req.body;

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        res.status(400).json({ success: false, error: 'Another user already uses this email' });
        return;
      }
    }
    if (role && !Object.values(Role).includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role value' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { fullName, email, mobileNumber, department, year, registerNumber, role, hostelId: hostelId || undefined }
    });

    await prisma.activityLog.create({
      data: {
        userId: updatedUser.id,
        userEmail: updatedUser.email,
        action: 'EDIT_USER',
        module: 'ADMIN_USER_MANAGEMENT',
        details: `User profile updated by admin`
      }
    });

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/users/:id/reset-password - Secure Password Reset
router.post('/admin/users/:id/reset-password', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const argon2 = await import('argon2');
    const passwordHash = await argon2.hash(newPassword);

    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash, plainPassword: newPassword }
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'RESET_PASSWORD',
        module: 'ADMIN_USER_MANAGEMENT',
        details: `Password securely reset for user ${user.email}`
      }
    });

    res.json({ success: true, message: `Password reset successfully for ${user.email}` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// DEV SEEDING & RESET ENDPOINTS
// ==========================================

// POST /api/dev/seed - Trigger Database Seeding
router.post('/dev/seed', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { size = 'medium', clearExisting = true } = req.body;
    const report = await seedDatabase({ size, clearExisting });
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dev/reset - Clear All Test Data (highest-privilege only; no UI currently calls this)
router.post('/dev/reset', authMiddleware, requireRole(['SUPER_ADMIN']), async (req: Request, res: Response) => {
  try {
    await clearAllTestData();
    res.json({ success: true, message: 'All test data cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// COMPLAINT WORKFLOW (ASSIGN / CONFIRM / REOPEN)
// ============================================================

router.post('/complaints/:id/assign', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { workerId } = req.body;
  if (!workerId) { res.status(400).json({ success: false, error: 'Worker ID is required' }); return; }
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Complaint not found' }); return; }
    if (!['PENDING', 'REJECTED'].includes(complaint.status)) {
      res.status(400).json({ success: false, error: `Cannot assign a worker to a complaint with status ${complaint.status}` });
      return;
    }

    const worker = await prisma.user.findUnique({ where: { id: workerId } });
    if (!worker || worker.role !== 'WORKER') { res.status(400).json({ success: false, error: 'Selected user is not a registered worker' }); return; }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'ASSIGNED',
        workerId,
        assignedBy: req.user?.email || null,
        assignedAt: new Date(),
        rejectionReason: null
      }
    });

    await addComplaintTimeline(id, 'ASSIGNED', 'Worker Assigned', `${worker.fullName} was assigned to this complaint.`, req.user?.email || 'Admin', req.user?.role || 'ADMIN');
    await createNotification(workerId, 'New Job Assigned', `You have been assigned: "${complaint.title}"`, 'NEW_JOB_AVAILABLE', 'worker_dashboard');
    await logActivity(req, 'Assigned worker to complaint', 'COMPLAINTS', `Complaint: ${complaint.title}, Worker: ${worker.fullName}`);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complaints/:id/confirm', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { rating, feedback } = req.body;
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Complaint not found' }); return; }
    if (complaint.studentId !== req.user?.id) { res.status(403).json({ success: false, error: 'You can only confirm resolution of your own complaints' }); return; }
    if (complaint.status !== 'COMPLETED') { res.status(400).json({ success: false, error: 'Only a completed complaint can be confirmed' }); return; }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        feedbackRating: rating !== undefined ? Number(rating) : null,
        studentFeedback: feedback || null
      }
    });

    await addComplaintTimeline(id, 'RESOLVED', 'Resolution Confirmed', `Student confirmed resolution${rating ? ` (rating: ${rating}/5)` : ''}.`, req.user?.email || 'Student', 'STUDENT');
    await logActivity(req, 'Confirmed complaint resolution', 'COMPLAINTS', `Complaint: ${complaint.title}`);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complaints/:id/reopen', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ success: false, error: 'A reason is required to reopen a complaint' }); return; }
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Complaint not found' }); return; }
    if (complaint.studentId !== req.user?.id) { res.status(403).json({ success: false, error: 'You can only reopen your own complaints' }); return; }
    if (complaint.status !== 'COMPLETED') { res.status(400).json({ success: false, error: 'Only a completed complaint can be reopened' }); return; }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: 'REOPENED', reopenedAt: new Date(), reopenReason: reason }
    });

    await addComplaintTimeline(id, 'REOPENED', 'Complaint Reopened', reason, req.user?.email || 'Student', 'STUDENT');
    if (complaint.workerId) {
      await createNotification(complaint.workerId, 'Job Reopened', `The complaint "${complaint.title}" was reopened by the student. Reason: ${reason}`, 'NEW_JOB_AVAILABLE', 'worker_dashboard');
    }
    await logActivity(req, 'Reopened complaint', 'COMPLAINTS', `Complaint: ${complaint.title}. Reason: ${reason}`);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// WORKER JOB LIFECYCLE
// ============================================================

router.post('/worker/complaints/:id/accept', authMiddleware, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Job not found' }); return; }
    if (complaint.workerId !== req.user?.id) { res.status(403).json({ success: false, error: 'This job is not assigned to you' }); return; }
    if (!['PENDING', 'ASSIGNED'].includes(complaint.status)) { res.status(400).json({ success: false, error: `Cannot accept a job with status ${complaint.status}` }); return; }

    const updated = await prisma.complaint.update({ where: { id }, data: { status: 'ACCEPTED', acceptedAt: new Date() } });
    await addComplaintTimeline(id, 'ACCEPTED', 'Job Accepted', `${req.user?.email} accepted this job.`, req.user?.email || 'Worker', 'WORKER');
    await createNotification(complaint.studentId, 'Complaint Accepted', `Your complaint "${complaint.title}" has been accepted by a worker.`, 'ANNOUNCEMENT');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/worker/complaints/:id/reject', authMiddleware, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Job not found' }); return; }
    if (complaint.workerId !== req.user?.id) { res.status(403).json({ success: false, error: 'This job is not assigned to you' }); return; }
    if (!['PENDING', 'ASSIGNED'].includes(complaint.status)) { res.status(400).json({ success: false, error: `Cannot reject a job with status ${complaint.status}` }); return; }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date(), rejectionReason: reason || null, workerId: null }
    });
    await addComplaintTimeline(id, 'REJECTED', 'Job Rejected', reason || 'Rejected by worker.', req.user?.email || 'Worker', 'WORKER');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/worker/complaints/:id/start', authMiddleware, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Job not found' }); return; }
    if (complaint.workerId !== req.user?.id) { res.status(403).json({ success: false, error: 'This job is not assigned to you' }); return; }
    if (complaint.status !== 'ACCEPTED') { res.status(400).json({ success: false, error: `Cannot start a job with status ${complaint.status}` }); return; }

    const updated = await prisma.complaint.update({ where: { id }, data: { status: 'IN_PROGRESS', startedAt: new Date() } });
    await addComplaintTimeline(id, 'IN_PROGRESS', 'Work Started', `${req.user?.email} started work on this complaint.`, req.user?.email || 'Worker', 'WORKER');
    await createNotification(complaint.studentId, 'Work In Progress', `Work has started on your complaint "${complaint.title}".`, 'ANNOUNCEMENT');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/worker/complaints/:id/complete', authMiddleware, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { completionNotes, materialsUsed } = req.body;
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Job not found' }); return; }
    if (complaint.workerId !== req.user?.id) { res.status(403).json({ success: false, error: 'This job is not assigned to you' }); return; }
    if (complaint.status !== 'IN_PROGRESS') { res.status(400).json({ success: false, error: `Cannot complete a job with status ${complaint.status}` }); return; }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), completionNotes: completionNotes || null, materialsUsed: materialsUsed || null }
    });
    await addComplaintTimeline(id, 'COMPLETED', 'Work Completed', completionNotes || 'Marked as completed by worker.', req.user?.email || 'Worker', 'WORKER');
    await createNotification(complaint.studentId, 'Complaint Resolved', `Your complaint "${complaint.title}" has been marked complete. Please confirm resolution.`, 'ANNOUNCEMENT');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// WORKER MANAGEMENT
// ============================================================

router.get('/workers/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.workerCategory.findMany({
      include: { _count: { select: { workers: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: categories });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/workers/categories', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { name, description, icon } = req.body;
  if (!name) { res.status(400).json({ success: false, error: 'Category name is required' }); return; }
  try {
    const category = await prisma.workerCategory.create({ data: { name, description: description || null, icon: icon || null } });
    await logActivity(req, 'Created worker category: ' + name, 'WORKERS');
    res.status(201).json({ success: true, data: category });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/workers', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  try {
    const where: any = { role: 'WORKER', isDeleted: false };
    if (req.user?.role !== 'SUPER_ADMIN' && hostelId) where.hostelId = hostelId;
    const workers = await prisma.user.findMany({
      where,
      select: {
        id: true, fullName: true, email: true, mobileNumber: true, status: true, hostelId: true,
        workerProfile: {
          select: {
            workerId: true, specialization: true, availability: true, status: true,
            category: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: workers });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/workers', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { fullName, email, password, mobileNumber, categoryId, specialization, block } = req.body;
  if (!fullName || !email || !password || !categoryId) { res.status(400).json({ success: false, error: 'Full name, email, password and category are required' }); return; }
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ success: false, error: 'A user with this email already exists' }); return; }

    const category = await prisma.workerCategory.findUnique({ where: { id: categoryId } });
    if (!category) { res.status(404).json({ success: false, error: 'Worker category not found' }); return; }

    const passwordHash = await argon2.hash(password);
    const workerCode = 'WRK-' + Date.now().toString(36).toUpperCase();

    const user = await prisma.user.create({
      data: {
        email, fullName, mobileNumber: mobileNumber || '', role: 'WORKER', passwordHash, plainPassword: password,
        status: 'APPROVED', hostelId: req.user?.hostelId || null,
        workerProfile: {
          create: {
            workerId: workerCode,
            categoryId,
            specialization: specialization || null,
            hostelId: req.user?.hostelId || null,
            block: block || null
          }
        }
      },
      select: {
        id: true, fullName: true, email: true, mobileNumber: true, status: true, hostelId: true,
        workerProfile: {
          select: {
            workerId: true, specialization: true, availability: true, status: true,
            category: { select: { id: true, name: true } }
          }
        }
      }
    });

    await logActivity(req, 'Registered worker: ' + fullName, 'WORKERS', 'Category: ' + category.name);
    res.status(201).json({ success: true, data: user });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/worker/dashboard', authMiddleware, requireRole(['WORKER']), async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.workerProfile.findUnique({
      where: { userId: req.user!.id },
      include: { category: true }
    });

    const complaints = await prisma.complaint.findMany({
      where: { workerId: req.user!.id, isDeleted: false },
      include: { student: { select: { fullName: true, mobileNumber: true, room: { select: { roomNumber: true, block: true, floor: true } } } } },
      orderBy: { updatedAt: 'desc' }
    });

    const metrics = {
      assignedCount: complaints.length,
      pendingAcceptance: complaints.filter(c => ['PENDING', 'ASSIGNED'].includes(c.status)).length,
      inProgress: complaints.filter(c => ['ACCEPTED', 'IN_PROGRESS'].includes(c.status)).length,
      completed: complaints.filter(c => ['COMPLETED', 'RESOLVED'].includes(c.status)).length
    };

    res.json({ success: true, data: { profile, metrics, complaints } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// EMERGENCY MANAGEMENT
// ============================================================

router.get('/emergency/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.hostelId) where.hostelId = req.user.hostelId;
    const alerts = await prisma.emergencyAlert.findMany({
      where,
      include: {
        hostel: { select: { name: true } },
        reportedBy: { select: { fullName: true, mobileNumber: true } },
        acknowledgedBy: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json({ success: true, data: alerts });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/emergency/alert', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { type, level, message, roomId, roomNumber, block, floor } = req.body;
  if (!req.user?.hostelId) { res.status(400).json({ success: false, error: 'You must belong to a hostel to report an emergency' }); return; }
  if (!type || !level) { res.status(400).json({ success: false, error: 'Emergency type and level are required' }); return; }
  try {
    const alert = await prisma.emergencyAlert.create({
      data: {
        type, level, message: message || null,
        hostelId: req.user.hostelId,
        roomId: roomId || null, roomNumber: roomNumber || null,
        block: block || null, floor: floor ? Number(floor) : null,
        reportedById: req.user.id,
        status: 'ACTIVE'
      }
    });

    const responders = await prisma.user.findMany({
      where: { hostelId: req.user.hostelId, role: { in: ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY', 'WARDEN'] }, isDeleted: false },
      select: { id: true }
    });
    for (const r of responders) {
      await createNotification(r.id, `${type} Emergency Reported`, message || `A ${level.toLowerCase()}-level ${type} emergency was reported.`, 'EMERGENCY', 'emergencies');
    }

    await logActivity(req, `Reported ${type} emergency`, 'EMERGENCY', `Level: ${level}`);
    res.status(201).json({ success: true, data: alert });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/emergency/:id/acknowledge', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const alert = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!alert) { res.status(404).json({ success: false, error: 'Emergency alert not found' }); return; }
    if (alert.status !== 'ACTIVE') { res.status(400).json({ success: false, error: `Cannot acknowledge an alert with status ${alert.status}` }); return; }

    const updated = await prisma.emergencyAlert.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED', acknowledgedById: req.user!.id, acknowledgedAt: new Date() }
    });
    await createNotification(alert.reportedById, 'Emergency Acknowledged', `Your ${alert.type} emergency report has been acknowledged and is being responded to.`, 'EMERGENCY');
    await logActivity(req, 'Acknowledged emergency alert', 'EMERGENCY', `Type: ${alert.type}`);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/emergency/:id/resolve', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'SECURITY']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const alert = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!alert) { res.status(404).json({ success: false, error: 'Emergency alert not found' }); return; }
    if (alert.status === 'RESOLVED') { res.status(400).json({ success: false, error: 'This alert is already resolved' }); return; }

    const updated = await prisma.emergencyAlert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() }
    });
    await createNotification(alert.reportedById, 'Emergency Resolved', `Your ${alert.type} emergency report has been resolved.`, 'EMERGENCY');
    await logActivity(req, 'Resolved emergency alert', 'EMERGENCY', `Type: ${alert.type}`);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

router.get('/push/vapid-public-key', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const publicKey = pushService.getPublicKey();
    res.json({ success: true, publicKey });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/push/register', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { subscription } = req.body;
  if (!subscription) { res.status(400).json({ success: false, error: 'Subscription is required' }); return; }
  try {
    await pushService.registerSubscription(
      req.user!.id,
      req.user!.role as Role,
      req.user!.hostelId,
      subscription,
      req.headers['user-agent']
    );
    res.json({ success: true, message: 'Push subscription registered' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/push/unregister', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  try {
    await pushService.unregisterSubscription(req.user!.id, endpoint);
    res.json({ success: true, message: 'Push subscription removed' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// SELF-SERVICE PROFILE (compatibility route for existing /api/profile frontend call)
// ============================================================

router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  const {
    fullName, mobileNumber, address, emergencyContact, bloodGroup,
    medicalDetails, department, year, guardianName, guardianMobile, guardianRelation, photo
  } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        fullName, mobileNumber, address, emergencyContact, bloodGroup,
        medicalDetails, department, year, guardianName, guardianMobile, guardianRelation, photo
      },
      select: {
        id: true, email: true, fullName: true, role: true, status: true, mobileNumber: true,
        hostelId: true, hostel: true, roomId: true,
        room: { select: { id: true, roomNumber: true, block: true, floor: true } },
        bedNumber: true, department: true, year: true, registerNumber: true,
        gender: true, address: true, emergencyContact: true, bloodGroup: true, medicalDetails: true,
        guardianName: true, guardianMobile: true, guardianRelation: true, photo: true, qrToken: true,
        collegeName: true, staffType: true, hostelStatus: true, messId: true
      }
    });
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});


// ============================================================
// PHASE 1+2: ACADEMIC YEAR
// ============================================================

router.get('/academic-years', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const years = await prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
    res.json({ success: true, data: years });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/academic-years', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { label, startDate, endDate, isActive } = req.body;
  if (!label || !startDate || !endDate) { res.status(400).json({ success: false, error: 'label, startDate, endDate required' }); return; }
  try {
    if (isActive) await prisma.academicYear.updateMany({ where: {}, data: { isActive: false } });
    const year = await prisma.academicYear.create({ data: { label, startDate: new Date(startDate), endDate: new Date(endDate), isActive: Boolean(isActive) } });
    await logActivity(req, 'Created academic year: ' + label, 'SETTINGS');
    res.status(201).json({ success: true, data: year });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/academic-years/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { label, startDate, endDate, isActive, status } = req.body;
  try {
    if (isActive) await prisma.academicYear.updateMany({ where: { id: { not: id } }, data: { isActive: false } });
    const year = await prisma.academicYear.update({ where: { id }, data: { label, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isActive: isActive !== undefined ? Boolean(isActive) : undefined, status } });
    res.json({ success: true, data: year });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 1+2: BED-LEVEL MANAGEMENT
// ============================================================

router.get('/rooms/:id/beds', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const room = await prisma.room.findUnique({
      where: { id },
      include: { users: { where: { isDeleted: false, role: 'STUDENT' }, select: { id: true, fullName: true, registerNumber: true, bedNumber: true, hostelStatus: true } } }
    });
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }

    const bedStatusMap: Record<string, string> = (room.bedStatus as Record<string, string>) || {};
    const occupants = room.users;

    const beds: any[] = [];
    for (let i = 1; i <= room.capacity; i++) {
      const bedNum = `Bed-${i}`;
      const occupant = occupants.find(u => u.bedNumber === bedNum);
      let status = bedStatusMap[bedNum] || 'AVAILABLE';
      if (occupant) status = 'OCCUPIED';
      beds.push({ bedNumber: bedNum, status, occupant: occupant || null });
    }
    res.json({ success: true, data: { room: { id: room.id, roomNumber: room.roomNumber, block: room.block, floor: room.floor, capacity: room.capacity, isMaintenance: room.isMaintenance }, beds } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/rooms/:id/bed-status', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { bedNumber, status } = req.body;
  if (!bedNumber || !status) { res.status(400).json({ success: false, error: 'bedNumber and status required' }); return; }
  const validStatuses = ['AVAILABLE', 'RESERVED', 'MAINTENANCE'];
  if (!validStatuses.includes(status)) { res.status(400).json({ success: false, error: 'Invalid status. Use: AVAILABLE, RESERVED, MAINTENANCE' }); return; }
  try {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }
    const current: Record<string, string> = (room.bedStatus as Record<string, string>) || {};
    current[bedNumber] = status;
    const updated = await prisma.room.update({ where: { id }, data: { bedStatus: current } });
    await logActivity(req, `Updated bed ${bedNumber} in room ${room.roomNumber} to ${status}`, 'ROOMS');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/bed-allocations', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId, hostelId, status } = req.query;
  const filter: any = {};
  if (studentId) filter.studentId = studentId as string;
  else if (req.user?.role === 'STUDENT') filter.studentId = req.user.id;
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (status) filter.status = status as string;
  try {
    const allocations = await prisma.bedAllocation.findMany({
      where: filter,
      include: { student: { select: { fullName: true, registerNumber: true } }, room: { select: { roomNumber: true, block: true, floor: true } }, academicYear: { select: { label: true } } },
      orderBy: { allocationDate: 'desc' }
    });
    res.json({ success: true, data: allocations });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/bed-allocations/check-eligibility', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { studentId, roomId, bedNumber } = req.body;
  if (!studentId || !roomId) { res.status(400).json({ success: false, error: 'studentId and roomId required' }); return; }
  try {
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'STUDENT') { res.status(404).json({ success: false, error: 'Student not found' }); return; }
    if (student.isDeleted) { res.json({ success: true, eligible: false, reason: 'Student account is deleted' }); return; }

    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: { where: { isDeleted: false, role: 'STUDENT' } } } });
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }
    if (room.isDeleted) { res.json({ success: true, eligible: false, reason: 'Room is deleted' }); return; }
    if (room.isMaintenance) { res.json({ success: true, eligible: false, reason: 'Room is under maintenance' }); return; }
    if (room.users.length >= room.capacity) { res.json({ success: true, eligible: false, reason: 'Room is at full capacity' }); return; }

    const activeAllocation = await prisma.bedAllocation.findFirst({ where: { studentId, status: 'ACTIVE' } });
    if (activeAllocation) { res.json({ success: true, eligible: false, reason: 'Student already has an active bed allocation' }); return; }

    if (bedNumber) {
      const bedStatusMap: Record<string, string> = (room.bedStatus as Record<string, string>) || {};
      const bedStatus = bedStatusMap[bedNumber] || 'AVAILABLE';
      if (bedStatus === 'MAINTENANCE') { res.json({ success: true, eligible: false, reason: `Bed ${bedNumber} is under maintenance` }); return; }
      if (bedStatus === 'RESERVED') { res.json({ success: true, eligible: false, reason: `Bed ${bedNumber} is reserved` }); return; }
      const bedOccupied = room.users.find(u => u.bedNumber === bedNumber);
      if (bedOccupied) { res.json({ success: true, eligible: false, reason: `Bed ${bedNumber} is occupied by ${bedOccupied.fullName}` }); return; }
    }

    res.json({ success: true, eligible: true, student: { id: student.id, fullName: student.fullName, gender: student.gender, hostelStatus: student.hostelStatus }, room: { id: room.id, roomNumber: room.roomNumber, capacity: room.capacity, occupied: room.users.length, available: room.capacity - room.users.length } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 3: HOSTEL ADMISSION WORKFLOW
// ============================================================

router.get('/admissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status, hostelId, academicYearId } = req.query;
  const filter: any = {};
  if (req.user?.role === 'STUDENT') filter.studentId = req.user.id;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (hostelId) filter.hostelId = hostelId as string;
  if (status) filter.status = status as string;
  if (academicYearId) filter.academicYearId = academicYearId as string;
  try {
    const admissions = await prisma.hostelAdmission.findMany({
      where: filter,
      include: { student: { select: { fullName: true, email: true, registerNumber: true, department: true, year: true, gender: true, photo: true, mobileNumber: true } }, academicYear: { select: { label: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: admissions });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/admissions', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { preferredRoomCategory, requestedHostelId, applicationNote, academicYearId } = req.body;
  const studentId = req.user?.role === 'STUDENT' ? req.user.id : req.body.studentId;
  if (!studentId) { res.status(400).json({ success: false, error: 'Student ID required' }); return; }
  try {
    const existing = await prisma.hostelAdmission.findFirst({ where: { studentId, status: { in: ['PENDING', 'VERIFIED', 'APPROVED', 'WAITLIST', 'ALLOCATED', 'CHECKED_IN'] } } });
    if (existing) { res.status(400).json({ success: false, error: 'An active admission application already exists for this student' }); return; }
    const activeYear = academicYearId ? { academicYearId } : {};
    const admission = await prisma.hostelAdmission.create({ data: { studentId, preferredRoomCategory: preferredRoomCategory || null, requestedHostelId: requestedHostelId || null, applicationNote: applicationNote || null, ...activeYear } });
    await createNotification(studentId, 'Admission Application Submitted', 'Your hostel admission application has been submitted and is pending review.', 'ANNOUNCEMENT');
    await logActivity(req, 'Hostel admission application submitted', 'ADMISSIONS', 'Student: ' + studentId);
    res.status(201).json({ success: true, data: admission });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/admissions/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const admission = await prisma.hostelAdmission.findUnique({ where: { id }, include: { student: { select: { fullName: true, email: true, registerNumber: true, department: true, year: true, gender: true, photo: true, mobileNumber: true, parentMobile: true, address: true, bloodGroup: true } }, academicYear: { select: { label: true } } } });
    if (!admission) { res.status(404).json({ success: false, error: 'Admission not found' }); return; }
    res.json({ success: true, data: admission });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

const ADMISSION_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['VERIFIED', 'REJECTED', 'WAITLIST'],
  VERIFIED: ['APPROVED', 'REJECTED', 'WAITLIST'],
  APPROVED: ['ALLOCATED', 'REJECTED', 'CANCELLED'],
  WAITLIST: ['APPROVED', 'CANCELLED'],
  ALLOCATED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: [],
  REJECTED: [],
  CANCELLED: []
};

router.patch('/admissions/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason, hostelId, allocatedRoomId, allocatedBed, waitlistPosition } = req.body;
  if (!status) { res.status(400).json({ success: false, error: 'Status required' }); return; }
  try {
    const admission = await prisma.hostelAdmission.findUnique({ where: { id } });
    if (!admission) { res.status(404).json({ success: false, error: 'Admission not found' }); return; }
    const allowedNext = ADMISSION_TRANSITIONS[admission.status] || [];
    if (!allowedNext.includes(status)) { res.status(400).json({ success: false, error: `Cannot change admission from ${admission.status} to ${status}` }); return; }

    const updates: any = { status, reviewedBy: req.user?.email, reviewedAt: new Date() };
    if (rejectionReason) updates.rejectionReason = rejectionReason;
    if (hostelId) updates.hostelId = hostelId;
    if (allocatedRoomId) updates.allocatedRoomId = allocatedRoomId;
    if (allocatedBed) updates.allocatedBed = allocatedBed;
    if (waitlistPosition) updates.waitlistPosition = Number(waitlistPosition);
    if (status === 'ALLOCATED') updates.allocationDate = new Date();
    if (status === 'CHECKED_IN') {
      updates.checkInDate = new Date();
      updates.checkInBy = req.user?.email;
      // Update student hostel status and room
      await prisma.user.update({ where: { id: admission.studentId }, data: { hostelStatus: 'CHECKED_IN', hostelId: hostelId || admission.hostelId || undefined, roomId: allocatedRoomId || admission.allocatedRoomId || undefined, bedNumber: allocatedBed || admission.allocatedBed || undefined, allocationDate: new Date() } });
      // Record in BedAllocation history
      if (admission.allocatedRoomId || allocatedRoomId) {
        const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
        await prisma.bedAllocation.create({ data: { studentId: admission.studentId, hostelId: hostelId || admission.hostelId || '', roomId: allocatedRoomId || admission.allocatedRoomId || '', bedNumber: allocatedBed || admission.allocatedBed || 'Bed-1', academicYearId: activeYear?.id || null, status: 'ACTIVE' } });
      }
    }

    const updated = await prisma.hostelAdmission.update({ where: { id }, data: updates });
    const notifMsg: Record<string, string> = { VERIFIED: 'Your hostel application has been verified.', APPROVED: 'Your hostel application has been approved!', REJECTED: `Your hostel application was rejected. ${rejectionReason || ''}`, WAITLIST: `You are on the hostel waitlist. Position: ${waitlistPosition || 'TBD'}`, ALLOCATED: 'A room and bed have been allocated to you.', CHECKED_IN: 'Your hostel check-in is complete. Welcome!' };
    if (notifMsg[status]) await createNotification(admission.studentId, 'Admission Update', notifMsg[status], 'ANNOUNCEMENT');
    await logActivity(req, `Admission status changed to ${status}`, 'ADMISSIONS', `Student: ${admission.studentId}`);
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 4: ENHANCED CHECK-IN (formal with BedAllocation history)
// ============================================================

router.post('/students/:id/checkin', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { hostelId, roomId, bedNumber, academicYearId, notes } = req.body;
  if (!hostelId || !roomId) { res.status(400).json({ success: false, error: 'hostelId and roomId required' }); return; }
  try {
    const student = await prisma.user.findUnique({ where: { id }, include: { room: true } });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { users: { where: { isDeleted: false, role: 'STUDENT' } } } });
    if (!room) { res.status(404).json({ success: false, error: 'Room not found' }); return; }
    if (room.isMaintenance) { res.status(400).json({ success: false, error: 'Room is under maintenance' }); return; }
    if (room.users.length >= room.capacity) { res.status(400).json({ success: false, error: 'Room is full' }); return; }
    const activeAlloc = await prisma.bedAllocation.findFirst({ where: { studentId: id, status: 'ACTIVE' } });
    if (activeAlloc) { res.status(400).json({ success: false, error: 'Student already has an active bed allocation' }); return; }

    const finalBed = bedNumber || `Bed-${room.users.length + 1}`;
    const [updatedStudent] = await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { hostelId, roomId, bedNumber: finalBed, allocationDate: new Date(), hostelStatus: 'CHECKED_IN', checkOutDate: null, checkOutReason: null } }),
      prisma.bedAllocation.create({ data: { studentId: id, hostelId, roomId, bedNumber: finalBed, academicYearId: academicYearId || null, status: 'ACTIVE', notes: notes || null } })
    ]);
    await createNotification(id, 'Check-In Completed', `You have been checked in to Room ${room.roomNumber} (Block ${room.block}), Bed ${finalBed}.`, 'ANNOUNCEMENT');
    await logActivity(req, `Checked in student ${student.fullName} to Room ${room.roomNumber} Bed ${finalBed}`, 'CHECKIN');
    res.json({ success: true, data: updatedStudent });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Enhanced checkout — releases bed allocation history
router.post('/students/:id/checkout-full', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { checkOutDate, reason, remarks } = req.body;
  try {
    const student = await prisma.user.findUnique({ where: { id }, include: { room: true } });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }
    const oldRoom = student.room?.roomNumber || 'N/A';
    const coDate = checkOutDate ? new Date(checkOutDate) : new Date();

    // Release active bed allocation
    await prisma.bedAllocation.updateMany({ where: { studentId: id, status: 'ACTIVE' }, data: { status: 'RELEASED', releaseDate: coDate, releaseReason: reason || 'Checkout' } });

    const updatedUser = await prisma.user.update({ where: { id }, data: { roomId: null, bedNumber: null, checkOutDate: coDate, checkOutReason: reason || 'Checkout', hostelStatus: 'CHECKED_OUT' } });
    await createNotification(id, 'Check-Out Completed', `Your check-out from Room ${oldRoom} has been processed.`, 'ANNOUNCEMENT');
    await logActivity(req, `Checked out ${student.fullName} from Room ${oldRoom}`, 'CHECKOUT', `Reason: ${reason || 'N/A'}. Remarks: ${remarks || 'N/A'}`);
    res.json({ success: true, data: updatedUser });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 5: ASSET MANAGEMENT
// ============================================================

router.get('/assets', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId, category, status } = req.query;
  const filter: any = { isDeleted: false };
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (category) filter.category = category as string;
  if (status) filter.status = status as string;
  try {
    const assets = await prisma.hostelAsset.findMany({ where: filter, include: { assignments: { where: { status: 'ASSIGNED' }, include: { student: { select: { fullName: true, registerNumber: true } } }, take: 1 } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: assets });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/assets', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { category, description, hostelId, roomId, roomNumber, block, condition, purchaseDate, purchaseCost } = req.body;
  if (!category || !hostelId) { res.status(400).json({ success: false, error: 'category and hostelId required' }); return; }
  try {
    const assetCode = `ASSET-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const asset = await prisma.hostelAsset.create({ data: { assetCode, category, description: description || null, hostelId, roomId: roomId || null, roomNumber: roomNumber || null, block: block || null, condition: condition || 'GOOD', purchaseDate: purchaseDate ? new Date(purchaseDate) : null, purchaseCost: purchaseCost ? Number(purchaseCost) : null } });
    await logActivity(req, `Created asset ${assetCode} (${category})`, 'ASSETS');
    res.status(201).json({ success: true, data: asset });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/assets/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { condition, status, roomId, roomNumber, block, description } = req.body;
  try {
    const asset = await prisma.hostelAsset.update({ where: { id }, data: { condition, status, roomId, roomNumber, block, description } });
    res.json({ success: true, data: asset });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/assets/:id/assign', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { studentId, conditionAtAssign } = req.body;
  if (!studentId) { res.status(400).json({ success: false, error: 'studentId required' }); return; }
  try {
    const asset = await prisma.hostelAsset.findUnique({ where: { id } });
    if (!asset) { res.status(404).json({ success: false, error: 'Asset not found' }); return; }
    if (asset.status === 'ASSIGNED') { res.status(400).json({ success: false, error: 'Asset is already assigned' }); return; }
    const [assignment] = await prisma.$transaction([
      prisma.assetAssignment.create({ data: { assetId: id, studentId, conditionAtAssign: conditionAtAssign || asset.condition, assignedBy: req.user?.email } }),
      prisma.hostelAsset.update({ where: { id }, data: { status: 'ASSIGNED' } })
    ]);
    await logActivity(req, `Assigned asset ${asset.assetCode} to student ${studentId}`, 'ASSETS');
    res.status(201).json({ success: true, data: assignment });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/assets/:id/return', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { conditionAtReturn, damageNotes, damageAmount } = req.body;
  try {
    const asset = await prisma.hostelAsset.findUnique({ where: { id } });
    if (!asset) { res.status(404).json({ success: false, error: 'Asset not found' }); return; }
    const activeAssignment = await prisma.assetAssignment.findFirst({ where: { assetId: id, status: 'ASSIGNED' } });
    if (!activeAssignment) { res.status(400).json({ success: false, error: 'No active assignment found for this asset' }); return; }
    const returnStatus = damageNotes ? 'DAMAGED' : 'RETURNED';
    const newAssetCondition = conditionAtReturn || (damageNotes ? 'DAMAGED' : 'GOOD');
    await prisma.$transaction([
      prisma.assetAssignment.update({ where: { id: activeAssignment.id }, data: { status: returnStatus, returnedDate: new Date(), conditionAtReturn: conditionAtReturn || 'GOOD', damageNotes: damageNotes || null, damageAmount: damageAmount ? Number(damageAmount) : 0, returnedBy: req.user?.email } }),
      prisma.hostelAsset.update({ where: { id }, data: { status: 'AVAILABLE', condition: newAssetCondition } })
    ]);
    await logActivity(req, `Returned asset ${asset.assetCode}`, 'ASSETS');
    res.json({ success: true, message: 'Asset returned successfully' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/asset-assignments', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId, hostelId, status } = req.query;
  const filter: any = {};
  if (studentId) filter.studentId = studentId as string;
  else if (req.user?.role === 'STUDENT') filter.studentId = req.user.id;
  if (status) filter.status = status as string;
  try {
    const assignments = await prisma.assetAssignment.findMany({ where: filter, include: { asset: true, student: { select: { fullName: true, registerNumber: true } } }, orderBy: { assignedDate: 'desc' } });
    res.json({ success: true, data: assignments });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/assets/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.hostelAsset.update({ where: { id }, data: { isDeleted: true, status: 'DISPOSED' } });
    res.json({ success: true, message: 'Asset deleted' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 6: ROOM INSPECTION
// ============================================================

router.get('/inspections', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId, roomId, status } = req.query;
  const filter: any = {};
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (roomId) filter.roomId = roomId as string;
  if (status) filter.status = status as string;
  try {
    const inspections = await prisma.roomInspection.findMany({ where: filter, include: { room: { select: { roomNumber: true, block: true, floor: true } }, inspectedBy: { select: { fullName: true, role: true } } }, orderBy: { inspectionDate: 'desc' } });
    res.json({ success: true, data: inspections });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/inspections', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN']), async (req: AuthRequest, res: Response) => {
  const { roomId, hostelId, checklist, overallRating, damageFound, damageNotes, photosUrls, actionRequired, notes } = req.body;
  if (!roomId || !hostelId) { res.status(400).json({ success: false, error: 'roomId and hostelId required' }); return; }
  try {
    const inspection = await prisma.roomInspection.create({ data: { roomId, hostelId, inspectedById: req.user!.id, checklist: checklist || {}, overallRating: overallRating || 'GOOD', damageFound: Boolean(damageFound), damageNotes: damageNotes || null, photosUrls: photosUrls || [], actionRequired: actionRequired || null, notes: notes || null, status: 'OPEN' } });
    await logActivity(req, `Room inspection created for room ${roomId}`, 'INSPECTIONS');
    res.status(201).json({ success: true, data: inspection });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/inspections/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const inspection = await prisma.roomInspection.findUnique({ where: { id }, include: { room: { select: { roomNumber: true, block: true, floor: true, users: { select: { fullName: true, bedNumber: true, registerNumber: true } } } }, inspectedBy: { select: { fullName: true, role: true } }, linkedComplaints: { select: { id: true, title: true, status: true } } } });
    if (!inspection) { res.status(404).json({ success: false, error: 'Inspection not found' }); return; }
    res.json({ success: true, data: inspection });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/inspections/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, actionRequired, notes, damageNotes } = req.body;
  try {
    const updated = await prisma.roomInspection.update({ where: { id }, data: { status, actionRequired, notes, damageNotes } });
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 7: PREVENTIVE MAINTENANCE SCHEDULES
// ============================================================

router.get('/maintenance-schedules', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId, status } = req.query;
  const filter: any = { isActive: true };
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (status) filter.status = status as string;
  try {
    const now = new Date();
    const schedules = await prisma.preventiveMaintenance.findMany({ where: filter, include: { history: { orderBy: { serviceDate: 'desc' }, take: 3 } }, orderBy: { nextServiceDate: 'asc' } });
    // Auto-compute due/overdue status
    const enriched = schedules.map(s => {
      let computedStatus = s.status;
      if (s.nextServiceDate) {
        if (s.nextServiceDate < now) computedStatus = 'OVERDUE';
        else if (s.nextServiceDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) computedStatus = 'DUE';
        else computedStatus = 'OK';
      }
      return { ...s, computedStatus, daysUntilDue: s.nextServiceDate ? Math.ceil((s.nextServiceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null };
    });
    res.json({ success: true, data: enriched });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/maintenance-schedules', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { hostelId, equipmentName, equipmentCode, category, location, responsiblePerson, frequencyDays, lastServiceDate, notes } = req.body;
  if (!hostelId || !equipmentName) { res.status(400).json({ success: false, error: 'hostelId and equipmentName required' }); return; }
  try {
    const lastDate = lastServiceDate ? new Date(lastServiceDate) : null;
    const freq = Number(frequencyDays) || 90;
    const nextDate = lastDate ? new Date(lastDate.getTime() + freq * 24 * 60 * 60 * 1000) : null;
    const schedule = await prisma.preventiveMaintenance.create({ data: { hostelId, equipmentName, equipmentCode: equipmentCode || null, category: category || 'GENERAL', location: location || null, responsiblePerson: responsiblePerson || null, frequencyDays: freq, lastServiceDate: lastDate, nextServiceDate: nextDate, notes: notes || null } });
    await logActivity(req, `Created maintenance schedule for ${equipmentName}`, 'MAINTENANCE');
    res.status(201).json({ success: true, data: schedule });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/maintenance-schedules/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { equipmentName, category, location, responsiblePerson, frequencyDays, notes, isActive } = req.body;
  try {
    const updated = await prisma.preventiveMaintenance.update({ where: { id }, data: { equipmentName, category, location, responsiblePerson, frequencyDays: frequencyDays ? Number(frequencyDays) : undefined, notes, isActive } });
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/maintenance-schedules/:id/service', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'MAINTENANCE']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { servicedBy, notes, cost } = req.body;
  if (!servicedBy) { res.status(400).json({ success: false, error: 'servicedBy required' }); return; }
  try {
    const schedule = await prisma.preventiveMaintenance.findUnique({ where: { id } });
    if (!schedule) { res.status(404).json({ success: false, error: 'Schedule not found' }); return; }
    const now = new Date();
    const nextDate = new Date(now.getTime() + schedule.frequencyDays * 24 * 60 * 60 * 1000);
    const [logEntry] = await prisma.$transaction([
      prisma.maintenanceServiceLog.create({ data: { scheduleId: id, servicedBy, notes: notes || null, cost: cost ? Number(cost) : 0, nextServiceDate: nextDate } }),
      prisma.preventiveMaintenance.update({ where: { id }, data: { lastServiceDate: now, nextServiceDate: nextDate, status: 'OK' } })
    ]);
    await logActivity(req, `Service completed for ${schedule.equipmentName}`, 'MAINTENANCE');
    res.status(201).json({ success: true, data: logEntry });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 8: COMPLAINT SLA + SMART WORKER RECOMMENDATION
// ============================================================

router.get('/complaints/sla-config', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  if (!hostelId) { res.status(400).json({ success: false, error: 'hostelId required' }); return; }
  try {
    const config = await prisma.complaintSLAConfig.findUnique({ where: { hostelId } });
    res.json({ success: true, data: config || { hostelId, highPriorityHours: 2, mediumPriorityHours: 12, lowPriorityHours: 48 } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/complaints/sla-config', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { hostelId, highPriorityHours, mediumPriorityHours, lowPriorityHours } = req.body;
  if (!hostelId) { res.status(400).json({ success: false, error: 'hostelId required' }); return; }
  try {
    const config = await prisma.complaintSLAConfig.upsert({ where: { hostelId }, update: { highPriorityHours: Number(highPriorityHours) || 2, mediumPriorityHours: Number(mediumPriorityHours) || 12, lowPriorityHours: Number(lowPriorityHours) || 48 }, create: { hostelId, highPriorityHours: Number(highPriorityHours) || 2, mediumPriorityHours: Number(mediumPriorityHours) || 12, lowPriorityHours: Number(lowPriorityHours) || 48 } });
    await logActivity(req, 'Updated SLA configuration', 'SETTINGS');
    res.json({ success: true, data: config });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Smart Worker Recommendation (rule-based — clearly labeled)
router.get('/complaints/:id/smart-recommend', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const complaint = await prisma.complaint.findUnique({ where: { id }, include: { student: { select: { room: { select: { block: true } } } } } });
    if (!complaint) { res.status(404).json({ success: false, error: 'Complaint not found' }); return; }

    const hostelId = complaint.hostelId;
    const block = complaint.student?.room?.block;

    // Fetch all available workers
    const workers = await prisma.user.findMany({
      where: { role: 'WORKER', isDeleted: false, status: 'APPROVED', hostelId },
      include: {
        workerProfile: { include: { category: true } },
        workerAssignedComplaints: { where: { status: { in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] } } }
      }
    });

    // Score each worker (rule-based)
    const scored = workers.map(w => {
      let score = 0;
      const profile = w.workerProfile;
      // +10 if worker block matches complaint block
      if (block && profile?.block === block) score += 10;
      // +8 if category specialization matches complaint category
      if (profile?.category.name.toLowerCase().includes(complaint.category.toLowerCase())) score += 8;
      // -3 per active job (workload penalty)
      score -= w.workerAssignedComplaints.length * 3;
      // +5 if availability is AVAILABLE
      if (profile?.availability === 'AVAILABLE') score += 5;
      // +rating bonus (up to 5)
      score += Math.round(profile?.rating || 0);

      return {
        workerId: w.id,
        workerName: w.fullName,
        mobileNumber: w.mobileNumber,
        specialization: profile?.specialization,
        categoryName: profile?.category.name,
        availability: profile?.availability,
        currentWorkload: w.workerAssignedComplaints.length,
        rating: profile?.rating,
        block: profile?.block,
        score,
        recommendationNote: score >= 15 ? 'Strong Match' : score >= 8 ? 'Good Match' : 'Possible Match'
      };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    res.json({ success: true, method: 'RULE_BASED_SMART_RECOMMENDATION', data: scored });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET complaints (enhanced with SLA info)
router.get('/complaints', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status, hostelId, priority, category, includeTimeline } = req.query;
  const filter: any = { isDeleted: false };
  if (req.user?.role === 'STUDENT') filter.studentId = req.user.id;
  else if (req.user?.role === 'WORKER') filter.workerId = req.user.id;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (hostelId) filter.hostelId = hostelId as string;
  if (status) filter.status = status as string;
  if (priority) filter.priority = priority as string;
  if (category) filter.category = category as string;
  try {
    const now = new Date();
    const complaints = await prisma.complaint.findMany({
      where: filter,
      include: {
        student: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true, block: true } } } },
        staff: { select: { fullName: true } },
        worker: { select: { fullName: true, mobileNumber: true } },
        timeline: includeTimeline === 'true' ? { orderBy: { timestamp: 'asc' } } : false
      },
      orderBy: { createdAt: 'desc' }
    });
    // Enrich with SLA breach status
    const enriched = complaints.map(c => ({
      ...c,
      slaBreachedNow: c.slaDeadline ? (now > c.slaDeadline && !['COMPLETED', 'RESOLVED', 'CANCELLED'].includes(c.status)) : false
    }));
    res.json({ success: true, data: enriched });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// POST complaint (enhanced to set SLA deadline)
router.post('/complaints', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user?.hostelId) { res.status(400).json({ success: false, error: 'Must belong to a hostel' }); return; }
  const { title, description, category, priority } = req.body;
  if (!title || !description || !category) { res.status(400).json({ success: false, error: 'title, description, category required' }); return; }
  try {
    // Get SLA config for hostel
    const slaConfig = await prisma.complaintSLAConfig.findUnique({ where: { hostelId: req.user.hostelId } });
    const hoursMap: Record<string, number> = { HIGH: slaConfig?.highPriorityHours ?? 2, MEDIUM: slaConfig?.mediumPriorityHours ?? 12, LOW: slaConfig?.lowPriorityHours ?? 48 };
    const p = (priority || 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW';
    const slaHours = hoursMap[p] || 12;
    const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

    const complaint = await prisma.complaint.create({ data: { title, description, category, priority: p, studentId: req.user.id, hostelId: req.user.hostelId, slaDeadline } });
    await addComplaintTimeline(complaint.id, 'CREATED', 'Complaint Submitted', description, req.user.email || 'Student', 'STUDENT');
    await logActivity(req, 'Raised complaint: ' + title, 'COMPLAINTS');
    res.status(201).json({ success: true, data: complaint });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH complaint (status update with SLA tracking)
router.patch('/complaints/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'MAINTENANCE']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, priority, category, title, description } = req.body;
  try {
    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ success: false, error: 'Complaint not found' }); return; }
    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    if (title) updates.title = title;
    if (description) updates.description = description;
    // Track response time when first assigned
    if (status === 'ASSIGNED' && !existing.assignedAt) {
      updates.responseTime = Math.round((Date.now() - new Date(existing.createdAt).getTime()) / 60000);
    }
    // Track resolution time when completed
    if (status === 'COMPLETED' && !existing.completedAt) {
      updates.completedAt = new Date();
      updates.resolutionTime = Math.round((Date.now() - new Date(existing.createdAt).getTime()) / 60000);
    }
    const updated = await prisma.complaint.update({ where: { id }, data: updates });
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 9+10: MESS WASTE LOG + DEMAND FORECAST
// ============================================================

router.post('/meals/:id/waste-log', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { preparedQuantity, consumedQuantity, wastedQuantity, unit, estimatedCost, notes } = req.body;
  if (preparedQuantity === undefined) { res.status(400).json({ success: false, error: 'preparedQuantity required' }); return; }
  try {
    const meal = await prisma.meal.findUnique({ where: { id } });
    if (!meal) { res.status(404).json({ success: false, error: 'Meal not found' }); return; }
    const prep = Number(preparedQuantity);
    const consumed = Number(consumedQuantity) || 0;
    const wasted = Number(wastedQuantity) || Math.max(0, prep - consumed);
    const wastePercentage = prep > 0 ? parseFloat(((wasted / prep) * 100).toFixed(1)) : 0;
    // Count eligible students for cost per student
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', hostelId: meal.hostelId, isDeleted: false, status: 'APPROVED' } });
    const costPerStudent = estimatedCost && totalStudents > 0 ? parseFloat((Number(estimatedCost) / totalStudents).toFixed(2)) : 0;

    const log = await prisma.messWasteLog.upsert({
      where: { mealId: id },
      update: { preparedQuantity: prep, consumedQuantity: consumed, wastedQuantity: wasted, unit: unit || 'kg', wastePercentage, estimatedCost: estimatedCost ? Number(estimatedCost) : 0, costPerStudent, notes: notes || null, loggedBy: req.user?.email },
      create: { mealId: id, hostelId: meal.hostelId, preparedQuantity: prep, consumedQuantity: consumed, wastedQuantity: wasted, unit: unit || 'kg', wastePercentage, estimatedCost: estimatedCost ? Number(estimatedCost) : 0, costPerStudent, notes: notes || null, loggedBy: req.user?.email }
    });
    await logActivity(req, `Waste log recorded for meal ${id}`, 'MESS');
    res.json({ success: true, data: log });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/meals/:id/waste-log', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const log = await prisma.messWasteLog.findUnique({ where: { mealId: id }, include: { meal: { select: { type: true, date: true, menu: true } } } });
    res.json({ success: true, data: log });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/mess/waste-report', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const { startDate, endDate } = req.query;
  const filter: any = {};
  if (hostelId) filter.hostelId = hostelId;
  if (startDate) filter.createdAt = { gte: new Date(startDate as string) };
  if (endDate) filter.createdAt = { ...filter.createdAt, lte: new Date(endDate as string) };
  try {
    const logs = await prisma.messWasteLog.findMany({ where: filter, include: { meal: { select: { type: true, date: true, menu: true } } }, orderBy: { createdAt: 'desc' } });
    const totalPrepared = logs.reduce((s, l) => s + l.preparedQuantity, 0);
    const totalConsumed = logs.reduce((s, l) => s + l.consumedQuantity, 0);
    const totalWasted = logs.reduce((s, l) => s + l.wastedQuantity, 0);
    const avgWastePercent = logs.length > 0 ? parseFloat((logs.reduce((s, l) => s + (l.wastePercentage || 0), 0) / logs.length).toFixed(1)) : 0;
    const totalCost = logs.reduce((s, l) => s + (l.estimatedCost || 0), 0);
    res.json({ success: true, data: { logs, summary: { totalPrepared, totalConsumed, totalWasted, avgWastePercent, totalCost } } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Demand Forecast (rule-based statistical — clearly labeled)
router.get('/mess/demand-forecast', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();
  if (!hostelId) { res.status(400).json({ success: false, error: 'hostelId required' }); return; }
  try {
    const lookbackDays = 14;
    const cutoff = new Date(targetDate.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const historicalMeals = await prisma.meal.findMany({
      where: { hostelId, date: { gte: cutoff, lt: targetDate }, status: 'ACTIVE' },
      include: { confirmations: true }
    });

    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT', hostelId, isDeleted: false, status: 'APPROVED' } });

    const mealTypes = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
    const forecast = mealTypes.map(type => {
      const mealsOfType = historicalMeals.filter(m => m.type === type);
      if (mealsOfType.length === 0) return { type, expectedCount: totalStudents, confidence: 'LOW', method: 'DEFAULT_FALLBACK' };

      const avgTaking = mealsOfType.reduce((sum, m) => {
        const skipped = m.confirmations.filter(c => c.status === 'SKIPPED').length;
        return sum + (totalStudents - skipped);
      }, 0) / mealsOfType.length;

      return {
        type,
        expectedCount: Math.round(avgTaking),
        totalStudents,
        skipRate: totalStudents > 0 ? parseFloat(((1 - avgTaking / totalStudents) * 100).toFixed(1)) : 0,
        samplesUsed: mealsOfType.length,
        confidence: mealsOfType.length >= 7 ? 'HIGH' : mealsOfType.length >= 3 ? 'MEDIUM' : 'LOW',
        method: 'HISTORICAL_AVERAGE'
      };
    });

    // Also include today's confirmations if available
    const todayMeals = await prisma.meal.findMany({
      where: { hostelId, date: new Date(targetDate.setUTCHours(0, 0, 0, 0)), status: 'ACTIVE' },
      include: { confirmations: true }
    });

    const todayConfirmed = todayMeals.map(m => ({
      type: m.type,
      confirmedSkips: m.confirmations.filter(c => c.status === 'SKIPPED').length,
      confirmedTaking: m.confirmations.filter(c => c.status === 'TAKING').length,
      totalConfirmations: m.confirmations.length
    }));

    res.json({ success: true, method: 'STATISTICAL_RULE_BASED_FORECAST', disclaimer: 'Forecast based on 14-day historical average. Not machine learning.', data: { forecast, todayConfirmed, totalStudents } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 11: INVENTORY STOCK LEDGER
// ============================================================

router.get('/inventory/:id/ledger', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ledger = await prisma.inventoryLedger.findMany({ where: { inventoryId: id }, orderBy: { createdAt: 'desc' }, take: 200 });
    const inventory = await prisma.inventory.findUnique({ where: { id }, select: { itemName: true, quantity: true, unit: true, minStock: true } });
    if (!inventory) { res.status(404).json({ success: false, error: 'Inventory item not found' }); return; }
    res.json({ success: true, data: { item: inventory, ledger } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/inventory/:id/adjustment', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'MESS_MANAGER']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { adjustmentQty, reason, hostelId } = req.body;
  if (adjustmentQty === undefined || !reason) { res.status(400).json({ success: false, error: 'adjustmentQty and reason required' }); return; }
  try {
    const inventory = await prisma.inventory.findUnique({ where: { id } });
    if (!inventory) { res.status(404).json({ success: false, error: 'Item not found' }); return; }
    const adj = Number(adjustmentQty);
    const newQty = inventory.quantity + adj;
    if (newQty < 0) { res.status(400).json({ success: false, error: 'Adjustment would result in negative stock' }); return; }
    const [updatedInv, ledgerEntry] = await prisma.$transaction([
      prisma.inventory.update({ where: { id }, data: { quantity: newQty } }),
      prisma.inventoryLedger.create({ data: { inventoryId: id, hostelId: hostelId || inventory.hostelId, txnType: 'ADJUSTMENT', quantity: adj, balanceAfter: newQty, reason, performedBy: req.user?.email } })
    ]);
    await logActivity(req, `Stock adjustment: ${inventory.itemName} by ${adj} (reason: ${reason})`, 'INVENTORY');
    res.json({ success: true, data: { inventory: updatedInv, ledgerEntry } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 12: FEE STRUCTURE TEMPLATES
// ============================================================

router.get('/fee-structures', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId } = req.query;
  const filter: any = { isActive: true };
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  try {
    const structures = await prisma.feeStructure.findMany({ where: filter, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: structures });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/fee-structures', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT']), async (req: AuthRequest, res: Response) => {
  const { title, feeType, amount, dueAfterDays, hostelId, academicYear, description } = req.body;
  if (!title || !amount || !hostelId) { res.status(400).json({ success: false, error: 'title, amount, hostelId required' }); return; }
  try {
    const structure = await prisma.feeStructure.create({ data: { title, feeType: feeType || 'HOSTEL', amount: Number(amount), dueAfterDays: Number(dueAfterDays) || 30, hostelId, academicYear: academicYear || null, description: description || null } });
    await logActivity(req, 'Created fee structure: ' + title, 'FINANCE');
    res.status(201).json({ success: true, data: structure });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/fee-structures/:id/generate', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const structure = await prisma.feeStructure.findUnique({ where: { id } });
    if (!structure) { res.status(404).json({ success: false, error: 'Fee structure not found' }); return; }
    const students = await prisma.user.findMany({ where: { role: 'STUDENT', hostelId: structure.hostelId, isDeleted: false, status: 'APPROVED' } });
    if (students.length === 0) { res.json({ success: true, message: 'No eligible students found', generated: 0 }); return; }
    const dueDate = new Date(Date.now() + structure.dueAfterDays * 24 * 60 * 60 * 1000);
    let generated = 0;
    for (const student of students) {
      await prisma.fee.create({ data: { title: structure.title, feeType: structure.feeType, amount: structure.amount, dueDate, status: 'PENDING', studentId: student.id, hostelId: structure.hostelId } });
      await createNotification(student.id, 'New Fee Invoice', `Fee "${structure.title}" of Rs.${structure.amount} generated.`, 'FEE_DUE', 'payments');
      generated++;
    }
    await logActivity(req, `Generated ${generated} fee invoices from structure: ${structure.title}`, 'FINANCE');
    res.json({ success: true, message: `Generated ${generated} fee invoices`, generated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Expense lifecycle PATCH
router.patch('/expenses/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ACCOUNTANT']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { approvalStatus, category, amount, description } = req.body;
  try {
    const updates: any = {};
    if (approvalStatus) {
      updates.approvalStatus = approvalStatus;
      if (approvalStatus === 'APPROVED') { updates.approvedBy = req.user?.email; updates.approvedAt = new Date(); }
    }
    if (category) updates.category = category;
    if (amount) updates.amount = Number(amount);
    if (description !== undefined) updates.description = description;
    const updated = await prisma.expense.update({ where: { id }, data: updates });
    await logActivity(req, `Updated expense ${id} to ${approvalStatus || 'updated'}`, 'FINANCE');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 13: DISCIPLINE / INCIDENT MANAGEMENT
// ============================================================

router.get('/incidents', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN', 'SECURITY']), async (req: AuthRequest, res: Response) => {
  const { hostelId, studentId, status, incidentType } = req.query;
  const filter: any = {};
  if (hostelId) filter.hostelId = hostelId as string;
  else if (req.user?.hostelId && req.user.role !== 'SUPER_ADMIN') filter.hostelId = req.user.hostelId;
  if (studentId) filter.studentId = studentId as string;
  if (status) filter.status = status as string;
  if (incidentType) filter.incidentType = incidentType as string;
  try {
    const incidents = await prisma.incidentReport.findMany({ where: filter, include: { student: { select: { fullName: true, registerNumber: true, room: { select: { roomNumber: true, block: true } } } } }, orderBy: { incidentDate: 'desc' } });
    res.json({ success: true, data: incidents });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/incidents', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN', 'SECURITY']), async (req: AuthRequest, res: Response) => {
  const { studentId, hostelId, incidentType, severity, incidentDate, description, actionTaken, warningIssued, fineAmount, remarks, linkedGatePassId } = req.body;
  if (!studentId || !hostelId || !incidentType || !description) { res.status(400).json({ success: false, error: 'studentId, hostelId, incidentType, description required' }); return; }
  try {
    const incident = await prisma.incidentReport.create({ data: { studentId, hostelId, incidentType, severity: severity || 'MINOR', incidentDate: incidentDate ? new Date(incidentDate) : new Date(), description, actionTaken: actionTaken || null, warningIssued: Boolean(warningIssued), fineAmount: fineAmount ? Number(fineAmount) : 0, remarks: remarks || null, reportedBy: req.user?.email, linkedGatePassId: linkedGatePassId || null } });
    await createNotification(studentId, 'Incident Report Filed', `An incident report has been filed against you: ${incidentType}. Please check with hostel administration.`, 'ANNOUNCEMENT');
    await logActivity(req, `Filed incident report for student ${studentId}: ${incidentType}`, 'INCIDENTS');
    res.status(201).json({ success: true, data: incident });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/incidents/:id', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, actionTaken, fineAmount, fineStatus, remarks } = req.body;
  try {
    const updated = await prisma.incidentReport.update({ where: { id }, data: { status, actionTaken, fineAmount: fineAmount !== undefined ? Number(fineAmount) : undefined, fineStatus, remarks } });
    await logActivity(req, `Updated incident ${id} to ${status || 'updated'}`, 'INCIDENTS');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/incidents/student/:studentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  // Students can view their own, admins can view any
  if (req.user?.role === 'STUDENT' && req.user.id !== studentId) { res.status(403).json({ success: false, error: 'Access denied' }); return; }
  try {
    const incidents = await prisma.incidentReport.findMany({ where: { studentId }, orderBy: { incidentDate: 'desc' } });
    res.json({ success: true, data: incidents });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 14: EMERGENCY ESCALATION (improvements)
// ============================================================

router.post('/emergency/:id/assign', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN']), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { assignedToId, assignedToName } = req.body;
  try {
    const alert = await prisma.emergencyAlert.findUnique({ where: { id } });
    if (!alert) { res.status(404).json({ success: false, error: 'Emergency alert not found' }); return; }
    // Use message field to store assignment info since no dedicated field exists yet
    const assignNote = `Assigned to: ${assignedToName || assignedToId}`;
    const updated = await prisma.emergencyAlert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedById: req.user!.id, acknowledgedAt: alert.acknowledgedAt || new Date(), message: alert.message ? `${alert.message} | ${assignNote}` : assignNote } });
    if (assignedToId) {
      await createNotification(assignedToId, 'Emergency Assignment', `You have been assigned to handle a ${alert.type} emergency. Please respond immediately.`, 'EMERGENCY', 'emergencies');
    }
    await createNotification(alert.reportedById, 'Emergency Being Handled', `Your ${alert.type} emergency report has been assigned to a responder.`, 'EMERGENCY');
    await logActivity(req, `Assigned emergency ${id} to ${assignedToName || assignedToId}`, 'EMERGENCY');
    res.json({ success: true, data: updated });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 15: DIGITAL HOSTEL ID
// ============================================================

router.get('/students/:id/hostel-id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  // Allow student to view own ID, or admin to view any
  if (req.user?.role === 'STUDENT' && req.user.id !== id) { res.status(403).json({ success: false, error: 'Access denied' }); return; }
  try {
    const student = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, registerNumber: true, department: true, year: true,
        collegeName: true, photo: true, gender: true, bloodGroup: true,
        qrToken: true, hostelStatus: true, allocationDate: true,
        hostel: { select: { id: true, name: true, code: true, address: true } },
        room: { select: { roomNumber: true, block: true, floor: true } },
        bedNumber: true
      }
    });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }
    // Compute validity (current academic year end or 1 year from allocation)
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const validUntil = activeYear?.endDate || (student.allocationDate ? new Date(new Date(student.allocationDate).setFullYear(new Date(student.allocationDate).getFullYear() + 1)) : null);
    res.json({ success: true, data: { ...student, validUntil, qrContent: student.qrToken || `HOSTEL-ID:${student.id}`, generatedAt: new Date() } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 16: HOSTEL CONFIG (Rules, Timings, Calendar)
// ============================================================

router.get('/hostel-config/:hostelId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId } = req.params;
  try {
    const config = await prisma.hostelConfig.findUnique({ where: { hostelId } });
    res.json({ success: true, data: config || { hostelId, gateOpenTime: '06:00', gateCloseTime: '22:00', visitorStartTime: '09:00', visitorEndTime: '20:00', nightAttendanceTime: '21:30', outpassDeadline: '20:00', breakfastStart: '07:00', breakfastEnd: '09:00', lunchStart: '12:00', lunchEnd: '14:00', snacksStart: '16:00', snacksEnd: '17:00', dinnerStart: '19:00', dinnerEnd: '21:00', hostelRules: [] } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/hostel-config/:hostelId', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { hostelId } = req.params;
  const { gateOpenTime, gateCloseTime, visitorStartTime, visitorEndTime, nightAttendanceTime, outpassDeadline, breakfastStart, breakfastEnd, lunchStart, lunchEnd, snacksStart, snacksEnd, dinnerStart, dinnerEnd, hostelRules } = req.body;
  try {
    const config = await prisma.hostelConfig.upsert({ where: { hostelId }, update: { gateOpenTime, gateCloseTime, visitorStartTime, visitorEndTime, nightAttendanceTime, outpassDeadline, breakfastStart, breakfastEnd, lunchStart, lunchEnd, snacksStart, snacksEnd, dinnerStart, dinnerEnd, hostelRules: Array.isArray(hostelRules) ? hostelRules : undefined }, create: { hostelId, gateOpenTime: gateOpenTime || '06:00', gateCloseTime: gateCloseTime || '22:00', visitorStartTime: visitorStartTime || '09:00', visitorEndTime: visitorEndTime || '20:00', nightAttendanceTime: nightAttendanceTime || '21:30', outpassDeadline: outpassDeadline || '20:00', breakfastStart: breakfastStart || '07:00', breakfastEnd: breakfastEnd || '09:00', lunchStart: lunchStart || '12:00', lunchEnd: lunchEnd || '14:00', snacksStart: snacksStart || '16:00', snacksEnd: snacksEnd || '17:00', dinnerStart: dinnerStart || '19:00', dinnerEnd: dinnerEnd || '21:00', hostelRules: Array.isArray(hostelRules) ? hostelRules : [] } });
    await logActivity(req, 'Updated hostel config for ' + hostelId, 'SETTINGS');
    res.json({ success: true, data: config });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/hostel-config/:hostelId/calendar', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { hostelId } = req.params;
  const { month, year } = req.query;
  const calFilter: any = { hostelId };
  if (month && year) {
    const startOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const endOfMonth = new Date(Number(year), Number(month), 0, 23, 59, 59);
    calFilter.date = { gte: startOfMonth, lte: endOfMonth };
  }
  try {
    const entries = await prisma.hostelCalendar.findMany({ where: calFilter, orderBy: { date: 'asc' } });
    res.json({ success: true, data: entries });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/hostel-config/:hostelId/calendar', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { hostelId } = req.params;
  const { date, dayType, label, notes } = req.body;
  if (!date || !dayType) { res.status(400).json({ success: false, error: 'date and dayType required' }); return; }
  try {
    const entry = await prisma.hostelCalendar.upsert({ where: { hostelId_date: { hostelId, date: new Date(date) } }, update: { dayType, label: label || null, notes: notes || null }, create: { hostelId, date: new Date(date), dayType, label: label || null, notes: notes || null } });
    res.json({ success: true, data: entry });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/hostel-config/:hostelId/calendar/:entryId', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN']), async (req: AuthRequest, res: Response) => {
  const { entryId } = req.params;
  try {
    await prisma.hostelCalendar.delete({ where: { id: entryId } });
    res.json({ success: true, message: 'Calendar entry deleted' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 17: GUARDIAN READ-ONLY VIEW
// ============================================================

router.get('/guardian/student/:studentId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { studentId } = req.params;
  const requestingUserId = req.user?.id;
  const adminRoles = ['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN'];
  const isAdmin = adminRoles.includes(req.user?.role || '');
  try {
    const student = await prisma.user.findFirst({
      where: {
        OR: [
          { id: studentId },
          { registerNumber: studentId }
        ]
      },
      select: {
        id: true, fullName: true, registerNumber: true, department: true, year: true,
        photo: true, gender: true, mobileNumber: true, bloodGroup: true, hostelStatus: true,
        hostel: { select: { name: true, address: true, phone: true } },
        room: { select: { roomNumber: true, block: true, floor: true } },
        bedNumber: true, allocationDate: true
      }
    });
    if (!student) { res.status(404).json({ success: false, error: 'Student not found' }); return; }
    const isOwner = requestingUserId === student.id;
    if (!isAdmin && !isOwner) { res.status(403).json({ success: false, error: 'Access denied' }); return; }
    const [recentLeaves, recentGatePasses, recentAttendance, fees] = await Promise.all([
      prisma.leave.findMany({ where: { userId: student.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { startDate: true, endDate: true, reason: true, status: true, createdAt: true } }),
      prisma.gatePass.findMany({ where: { studentId: student.id }, orderBy: { createdAt: 'desc' }, take: 5, select: { destination: true, expectedReturn: true, actualReturn: true, status: true, exitTime: true, createdAt: true } }),
      prisma.attendance.findMany({ where: { userId: student.id }, orderBy: { date: 'desc' }, take: 10, select: { date: true, isPresent: true, session: true } }),
      prisma.fee.findMany({ where: { studentId: student.id }, select: { title: true, amount: true, paidAmount: true, status: true, dueDate: true } })
    ]);
    res.json({ success: true, data: { student, recentLeaves, recentGatePasses, recentAttendance, fees, generatedAt: new Date() } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ============================================================
// PHASE 19+20: ENHANCED REPORTS
// ============================================================

router.get('/reports/currently-outside', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const filterOut: any = { status: 'EXITED' };
  if (hostelId) filterOut.hostelId = hostelId;
  try {
    const now = new Date();
    const exitedPasses = await prisma.gatePass.findMany({ where: filterOut, include: { student: { select: { fullName: true, registerNumber: true, mobileNumber: true, room: { select: { roomNumber: true, block: true } } } } }, orderBy: { exitTime: 'asc' } });
    const currentlyOutside = exitedPasses.map(p => ({ ...p, isOverdue: p.expectedReturn < now, overdueMinutes: p.expectedReturn < now ? Math.round((now.getTime() - p.expectedReturn.getTime()) / 60000) : 0 }));
    const overdueCount = currentlyOutside.filter(p => p.isOverdue).length;
    const expectedBeforeEvening = currentlyOutside.filter(p => !p.isOverdue && p.expectedReturn.getHours() < 20).length;
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const todayTotal = await prisma.gatePass.count({ where: { ...(hostelId ? { hostelId } : {}), exitTime: { gte: startOfToday } } });
    const todayReturned = await prisma.gatePass.count({ where: { ...(hostelId ? { hostelId } : {}), status: 'RETURNED', actualReturn: { gte: startOfToday } } });
    res.json({ success: true, data: { currentlyOutside, summary: { outsideCount: currentlyOutside.length, overdueCount, expectedBeforeEvening, returnedToday: todayReturned, exitedToday: todayTotal }, generatedAt: now } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/overdue-returns', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const filterOD: any = { status: 'EXITED', expectedReturn: { lt: new Date() } };
  if (hostelId) filterOD.hostelId = hostelId;
  try {
    const overdue = await prisma.gatePass.findMany({ where: filterOD, include: { student: { select: { fullName: true, registerNumber: true, mobileNumber: true, parentMobile: true } } }, orderBy: { expectedReturn: 'asc' } });
    res.json({ success: true, data: overdue, count: overdue.length });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/assets', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const filterA: any = { isDeleted: false };
  if (hostelId) filterA.hostelId = hostelId;
  try {
    const assets = await prisma.hostelAsset.findMany({ where: filterA });
    const summary = { total: assets.length, available: assets.filter(a => a.status === 'AVAILABLE').length, assigned: assets.filter(a => a.status === 'ASSIGNED').length, underRepair: assets.filter(a => a.status === 'UNDER_REPAIR').length, good: assets.filter(a => a.condition === 'GOOD').length, fair: assets.filter(a => a.condition === 'FAIR').length, poor: assets.filter(a => a.condition === 'POOR').length, damaged: assets.filter(a => a.condition === 'DAMAGED').length, byCategory: assets.reduce((acc: Record<string, number>, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {}) };
    res.json({ success: true, data: { assets, summary } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/maintenance', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const filterM: any = { isDeleted: false };
  if (hostelId) filterM.hostelId = hostelId;
  try {
    const complaints = await prisma.complaint.findMany({ where: filterM, include: { worker: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
    const now = new Date();
    const slaBreached = complaints.filter(c => c.slaDeadline && now > c.slaDeadline && !['COMPLETED', 'RESOLVED'].includes(c.status));
    const avgResponse = complaints.filter(c => c.responseTime).reduce((s, c) => s + (c.responseTime || 0), 0) / Math.max(complaints.filter(c => c.responseTime).length, 1);
    const avgResolution = complaints.filter(c => c.resolutionTime).reduce((s, c) => s + (c.resolutionTime || 0), 0) / Math.max(complaints.filter(c => c.resolutionTime).length, 1);
    const workerMap: Record<string, { name: string; assigned: number; completed: number }> = {};
    complaints.forEach(c => { if (c.workerId && c.worker) { if (!workerMap[c.workerId]) workerMap[c.workerId] = { name: c.worker.fullName, assigned: 0, completed: 0 }; workerMap[c.workerId].assigned++; if (['COMPLETED', 'RESOLVED'].includes(c.status)) workerMap[c.workerId].completed++; } });
    res.json({ success: true, data: { totalComplaints: complaints.length, slaBreachedCount: slaBreached.length, avgResponseTimeMinutes: Math.round(avgResponse), avgResolutionTimeMinutes: Math.round(avgResolution), workerPerformance: Object.values(workerMap), slaBreachedComplaints: slaBreached.slice(0, 20) } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/mess-waste', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const filterW: any = {};
  if (hostelId) filterW.hostelId = hostelId;
  try {
    const wasteLogs = await prisma.messWasteLog.findMany({ where: filterW, include: { meal: { select: { type: true, date: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const mealTypeStats: Record<string, { count: number; totalWaste: number; totalCost: number }> = {};
    wasteLogs.forEach(l => { const type = l.meal.type; if (!mealTypeStats[type]) mealTypeStats[type] = { count: 0, totalWaste: 0, totalCost: 0 }; mealTypeStats[type].count++; mealTypeStats[type].totalWaste += l.wastedQuantity; mealTypeStats[type].totalCost += l.estimatedCost || 0; });
    res.json({ success: true, data: { logs: wasteLogs, mealTypeStats } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/reports/incidents', authMiddleware, requireRole(['SUPER_ADMIN', 'HOSTEL_ADMIN', 'ASSISTANT_WARDEN', 'WARDEN']), async (req: AuthRequest, res: Response) => {
  const hostelId = req.query.hostelId as string || req.user?.hostelId;
  const filterI: any = {};
  if (hostelId) filterI.hostelId = hostelId;
  try {
    const incidents = await prisma.incidentReport.findMany({ where: filterI, include: { student: { select: { fullName: true, registerNumber: true } } }, orderBy: { incidentDate: 'desc' }, take: 200 });
    const summary = { total: incidents.length, open: incidents.filter(i => i.status === 'OPEN').length, closed: incidents.filter(i => i.status === 'CLOSED').length, totalFines: incidents.reduce((s, i) => s + (i.fineAmount || 0), 0), byType: incidents.reduce((acc: Record<string, number>, i) => { acc[i.incidentType] = (acc[i.incidentType] || 0) + 1; return acc; }, {}), bySeverity: incidents.reduce((acc: Record<string, number>, i) => { acc[i.severity] = (acc[i.severity] || 0) + 1; return acc; }, {}) };
    res.json({ success: true, data: { incidents, summary } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
