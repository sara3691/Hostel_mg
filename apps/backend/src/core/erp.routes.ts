import { Router, Request, Response } from 'express';
import { prisma } from './prisma';
import { authMiddleware, requirePermission, requireRole, AuthRequest } from './auth.middleware';
import { Role, GatePassStatus, NoticeAudience } from '@prisma/client';
import { seedDatabase, clearAllTestData } from './seed.service';

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
  const cleanDate = new Date(targetDate.setUTCHours(0, 0, 0, 0));

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

      // Fetch active meals for student's hostel/mess
      const meals = await prisma.meal.findMany({
        where: {
          date: cleanDate,
          hostelId: studentHostelId,
          messId: studentMessId || null
        },
        orderBy: { mealTime: 'asc' }
      });

      // Fetch leaves for this student to check if they are away
      const isOnLeave = await prisma.leave.findFirst({
        where: {
          userId: req.user.id,
          status: 'APPROVED',
          startDate: { lte: cleanDate },
          endDate: { gte: cleanDate }
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
        date: cleanDate
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
router.get('/admin/users', async (req: Request, res: Response) => {
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
      users,
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
router.put('/admin/users/:id/status', async (req: Request, res: Response) => {
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

// POST /api/admin/users/:id/reset-password - Secure Password Reset
router.post('/admin/users/:id/reset-password', async (req: Request, res: Response) => {
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
      data: { passwordHash }
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
router.post('/dev/seed', async (req: Request, res: Response) => {
  try {
    const { size = 'medium', clearExisting = true } = req.body;
    const report = await seedDatabase({ size, clearExisting });
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dev/reset - Clear All Test Data
router.post('/dev/reset', async (req: Request, res: Response) => {
  try {
    await clearAllTestData();
    res.json({ success: true, message: 'All test data cleared successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

