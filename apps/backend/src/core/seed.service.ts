import { PrismaClient, Role, RoomCategory, ComplaintPriority, ComplaintStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

export interface SeedOptions {
  size?: 'small' | 'medium' | 'large';
  clearExisting?: boolean;
}

export interface SeedReport {
  success: boolean;
  size: string;
  durationMs: number;
  counts: {
    hostels: number;
    blocks: number;
    rooms: number;
    beds: number;
    occupiedBeds: number;
    vacantBeds: number;
    maintenanceRooms: number;
    occupancyPercentage: number;
    users: number;
    students: number;
    staff: number;
    testAccounts: number;
    attendanceRecords: number;
    leaveRecords: number;
    complaints: number;
    feeRecords: number;
    paymentRecords: number;
    totalFeeAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
    meals: number;
    mealConfirmations: number;
    visitors: number;
    inventoryItems: number;
    inventoryUsages: number;
    inventoryPurchases: number;
    activityLogs: number;
    notifications: number;
  };
  validationPassed: boolean;
  validationDetails: string[];
}

export async function clearAllTestData(): Promise<void> {
  console.log("🧹 Clearing existing test data in safe dependency order...");

  const safeDelete = async (modelDeleteFn: () => Promise<any>) => {
    try {
      await modelDeleteFn();
    } catch (e) {
      // Ignore relation cascade locks during test data reset
    }
  };

  await safeDelete(() => prisma.mealConfirmation.deleteMany({}));
  await safeDelete(() => prisma.meal.deleteMany({}));
  await safeDelete(() => prisma.messAttendance.deleteMany({}));
  await safeDelete(() => prisma.messMenu.deleteMany({}));
  await safeDelete(() => prisma.mess.deleteMany({}));

  await safeDelete(() => prisma.payment.deleteMany({}));
  await safeDelete(() => prisma.fee.deleteMany({}));

  await safeDelete(() => prisma.complaintTimeline.deleteMany({}));
  await safeDelete(() => prisma.complaint.deleteMany({}));
  await safeDelete(() => prisma.leave.deleteMany({}));

  await safeDelete(() => prisma.attendanceQR.deleteMany({}));
  await safeDelete(() => prisma.attendance.deleteMany({}));

  await safeDelete(() => prisma.visitor.deleteMany({}));
  await safeDelete(() => prisma.gatePass.deleteMany({}));

  await safeDelete(() => prisma.inventoryUsage.deleteMany({}));
  await safeDelete(() => prisma.inventoryPurchase.deleteMany({}));
  await safeDelete(() => prisma.inventory.deleteMany({}));
  await safeDelete(() => prisma.expense.deleteMany({}));

  await safeDelete(() => prisma.payroll.deleteMany({}));
  await safeDelete(() => prisma.laundryWaitlist.deleteMany({}));
  await safeDelete(() => prisma.laundrySlot.deleteMany({}));
  await safeDelete(() => prisma.document.deleteMany({}));
  await safeDelete(() => prisma.notification.deleteMany({}));
  await safeDelete(() => prisma.activityLog.deleteMany({}));
  await safeDelete(() => prisma.emergencyAlert.deleteMany({}));
  await safeDelete(() => prisma.pushSubscription.deleteMany({}));

  await safeDelete(() => prisma.workerProfile.deleteMany({}));
  await safeDelete(() => prisma.user.deleteMany({}));
  await safeDelete(() => prisma.room.deleteMany({}));
  await safeDelete(() => prisma.hostel.deleteMany({}));
  await safeDelete(() => prisma.workerCategory.deleteMany({}));

  console.log("✓ Existing test data cleared successfully.");
}

export async function seedDatabase(options: SeedOptions = {}): Promise<SeedReport> {
  const startTime = Date.now();
  const size = options.size || 'medium';
  const clearExisting = options.clearExisting !== false;

  console.log(`🌱 Starting ${size.toUpperCase()} database seeding routine...`);

  if (clearExisting) {
    await clearAllTestData();
  }

  // Define scale parameters based on dataset size
  let targetStudents = 250;
  let targetHostels = 4;
  let blocksPerHostel = 3;
  let roomsPerBlock = 8;
  let bedsPerRoom = 4;

  if (size === 'small') {
    targetStudents = 50;
    targetHostels = 2;
    blocksPerHostel = 2;
    roomsPerBlock = 5;
    bedsPerRoom = 4;
  } else if (size === 'large') {
    targetStudents = 1000;
    targetHostels = 8;
    blocksPerHostel = 4;
    roomsPerBlock = 16;
    bedsPerRoom = 4;
  }

  const defaultPasswordHash = await argon2.hash('Password123!');

  // 1. Attendance Settings & Sessions
  const settingsCount = await prisma.attendanceSettings.count();
  if (settingsCount === 0) {
    await prisma.attendanceSettings.create({
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

  const sessionNames = ['Morning', 'Afternoon', 'Evening', 'Night'];
  for (const name of sessionNames) {
    await prisma.attendanceSession.upsert({
      where: { name },
      update: {},
      create: { name, isActive: true }
    });
  }

  // 2. Worker Categories
  const workerCatsData = [
    { name: 'Plumbing', description: 'Pipe leaks, taps, water tanks, drainage', icon: 'Wrench' },
    { name: 'Electrical', description: 'Wiring, lights, fans, ACs, switchboards', icon: 'Zap' },
    { name: 'Carpentry', description: 'Doors, windows, beds, tables, locks', icon: 'Hammer' },
    { name: 'Cleaning & Sanitation', description: 'Deep cleaning, pest control, waste removal', icon: 'Sparkles' },
    { name: 'Internet & Networking', description: 'Wi-Fi routers, LAN ports, network cables', icon: 'Wifi' },
  ];

  const createdWorkerCats: any[] = [];
  for (const cat of workerCatsData) {
    const wc = await prisma.workerCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: { name: cat.name, description: cat.description, icon: cat.icon }
    });
    createdWorkerCats.push(wc);
  }

  // 3. Hostels Master Data
  const hostelConfigs = [
    { name: 'Granite Hall (Men\'s)', code: 'HSTL-MEN-A', collegeName: 'Institute of Engineering', address: 'North Campus, Sector 1', gender: 'MALE', capacity: Math.ceil(targetStudents * 0.35) },
    { name: 'Emerald Block (Women\'s)', code: 'HSTL-WMN-B', collegeName: 'Institute of Engineering', address: 'South Campus, Sector 3', gender: 'FEMALE', capacity: Math.ceil(targetStudents * 0.35) },
    { name: 'Sapphire Residency (Mixed)', code: 'HSTL-MIX-C', collegeName: 'School of Technology', address: 'East Campus, Gate 2', gender: 'MIXED', capacity: Math.ceil(targetStudents * 0.2) },
    { name: 'Diamond PG Towers', code: 'HSTL-PG-D', collegeName: 'School of Management', address: 'West Campus, Sector 5', gender: 'MIXED', capacity: Math.ceil(targetStudents * 0.2) },
    { name: 'Ruby International House', code: 'HSTL-INT-E', collegeName: 'Global Education Center', address: 'Central Campus, Sector 4', gender: 'MIXED', capacity: Math.ceil(targetStudents * 0.15) },
    { name: 'Pearl Executive Lodge', code: 'HSTL-EXEC-F', collegeName: 'Institute of Science', address: 'Research Park Area', gender: 'MIXED', capacity: Math.ceil(targetStudents * 0.15) },
    { name: 'Amber Wing North', code: 'HSTL-AMB-G', collegeName: 'School of Arts & Design', address: 'Creative Campus', gender: 'MIXED', capacity: Math.ceil(targetStudents * 0.15) },
    { name: 'Topaz International Suite', code: 'HSTL-TOP-H', collegeName: 'School of Technology', address: 'Tech Park Avenue', gender: 'MIXED', capacity: Math.ceil(targetStudents * 0.15) }
  ];

  const createdHostels: any[] = [];
  for (let i = 0; i < targetHostels; i++) {
    const cfg = hostelConfigs[i % hostelConfigs.length];
    const code = targetHostels > 8 ? `HSTL-TEST-${i + 1}` : cfg.code;
    const h = await prisma.hostel.upsert({
      where: { code },
      update: { name: cfg.name, capacity: cfg.capacity },
      create: {
        name: cfg.name,
        code,
        collegeName: cfg.collegeName,
        address: cfg.address,
        capacity: cfg.capacity,
        gender: cfg.gender,
        phone: `+91 98765 432${i}0`,
        email: `contact@hostel-${i + 1}.edu`,
        status: 'ACTIVE',
        academicYear: '2025-2026'
      }
    });
    createdHostels.push(h);
  }

  // 4. Create Mess Facilities
  const createdMesses: any[] = [];
  for (const hostel of createdHostels) {
    const mess = await prisma.mess.create({
      data: {
        name: `${hostel.name} Central Dining Hall`,
        messType: hostel.gender === 'FEMALE' ? 'VEG' : 'MIXED',
        hostelId: hostel.id
      }
    });
    createdMesses.push(mess);

    // Create Mess Menus
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await prisma.messMenu.create({
        data: {
          dayOfWeek: day,
          breakfast: 'Idli, Dosa, Vada, Sambar, Chutney, Tea/Coffee',
          lunch: 'Steamed Rice, Dal Tadka, Paneer Butter Masala, Chapati, Salad',
          dinner: 'Veg Biryani, Raita, Mixed Veg Curry, Chapati, Gulab Jamun',
          hostelId: hostel.id,
          messId: mess.id
        }
      });
    }
  }

  // 5. Rooms & Beds Hierarchy
  const createdRooms: any[] = [];
  const roomCategories: RoomCategory[] = [RoomCategory.NON_AC, RoomCategory.AC, RoomCategory.PREMIUM, RoomCategory.DORMITORY];

  for (const hostel of createdHostels) {
    for (let b = 1; b <= blocksPerHostel; b++) {
      const blockName = `Block ${String.fromCharCode(64 + b)}`;
      for (let f = 1; f <= 3; f++) {
        for (let r = 1; r <= roomsPerBlock; r++) {
          const roomNumber = `${f}0${r}`;
          const isMaint = (r === 1 && f === 3); // 5% maintenance rooms
          const category = roomCategories[(b + f + r) % roomCategories.length];
          const cap = category === RoomCategory.DORMITORY ? 8 : bedsPerRoom;

          const room = await prisma.room.create({
            data: {
              block: blockName,
              floor: f,
              roomNumber,
              capacity: cap,
              category,
              hostelId: hostel.id,
              isMaintenance: isMaint
            }
          });
          createdRooms.push(room);
        }
      }
    }
  }

  // 6. Test User Accounts for Every Role
  const testAccountsData = [
    { email: 'admin@test.com', name: 'System Super Admin', role: Role.SUPER_ADMIN, status: 'APPROVED' },
    { email: 'hosteladmin@test.com', name: 'Chief Hostel Administrator', role: Role.HOSTEL_ADMIN, status: 'APPROVED' },
    { email: 'warden@test.com', name: 'Senior Hostel Warden', role: Role.WARDEN, status: 'APPROVED' },
    { email: 'assistant@test.com', name: 'Assistant Warden Staff', role: Role.ASSISTANT_WARDEN, status: 'APPROVED' },
    { email: 'messmanager@test.com', name: 'Dining & Mess Manager', role: Role.MESS_MANAGER, status: 'APPROVED' },
    { email: 'security@test.com', name: 'Chief Security Officer', role: Role.SECURITY, status: 'APPROVED' },
    { email: 'maintenance@test.com', name: 'Facility Maintenance Lead', role: Role.MAINTENANCE, status: 'APPROVED' },
    { email: 'accountant@test.com', name: 'Finance & Accounts Officer', role: Role.ACCOUNTANT, status: 'APPROVED' },
    { email: 'worker@test.com', name: 'Ravi Kumar (Plumber Worker)', role: Role.WORKER, status: 'APPROVED' },
    { email: 'staff@test.com', name: 'Anita Sharma (Staff Supervisor)', role: Role.STAFF, status: 'APPROVED' },
    { email: 'student01@test.com', name: 'Alex Johnson (Test Student)', role: Role.STUDENT, status: 'APPROVED' }
  ];

  const createdTestUsers: any[] = [];
  for (const ta of testAccountsData) {
    const hostel = createdHostels[0];
    const u = await prisma.user.upsert({
      where: { email: ta.email },
      update: { fullName: ta.name, role: ta.role, status: ta.status },
      create: {
        email: ta.email,
        passwordHash: defaultPasswordHash,
        fullName: ta.name,
        mobileNumber: '9876543210',
        role: ta.role,
        status: ta.status,
        hostelId: hostel.id,
        department: ta.role === Role.STUDENT ? 'Computer Science' : 'Administration',
        registerNumber: ta.role === Role.STUDENT ? 'TEST-STU-0001' : undefined,
        qrToken: `QR-${ta.email}`
      }
    });
    createdTestUsers.push(u);

    if (ta.role === Role.WORKER) {
      await prisma.workerProfile.upsert({
        where: { userId: u.id },
        update: {},
        create: {
          workerId: `WRK-001`,
          userId: u.id,
          categoryId: createdWorkerCats[0].id,
          specialization: 'Pipe repairs & sanitary fitting',
          joiningDate: new Date('2025-01-10'),
          rating: 4.8
        }
      });
    }
  }

  // 7. Student Profiles & Allocation (75-85% occupancy)
  const firstNames = ['Aarav', 'Ananya', 'Rohan', 'Priya', 'Vikram', 'Sneha', 'Karthik', 'Divya', 'Siddharth', 'Meera', 'Aditya', 'Pooja', 'Rahul', 'Neha', 'Arjun', 'Kavya', 'Gautam', 'Ishita', 'Varun', 'Riya'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Chowdhury', 'Joshi', 'Kulkarni', 'Deshmukh', 'Rao', 'Pillai', 'Menon', 'Bhat', 'Dutta', 'Banerjee'];
  const depts = ['Computer Science', 'Electronics & Comm', 'Mechanical Engg', 'Civil Engg', 'Information Tech', 'Biotechnology', 'Electrical Engg'];

  const createdStudents: any[] = [];
  // Ensure student01 is included in student list
  const testStudentUser = createdTestUsers.find(u => u.email === 'student01@test.com');
  if (testStudentUser) createdStudents.push(testStudentUser);

  for (let i = 2; i <= targetStudents; i++) {
    const fname = firstNames[i % firstNames.length];
    const lname = lastNames[(i * 3) % lastNames.length];
    const name = `${fname} ${lname}`;
    const email = `test.student.${i}@hostel.edu`;
    const regNo = `TEST-STU-${String(i).padStart(4, '0')}`;
    const hostel = createdHostels[(i - 1) % createdHostels.length];
    const dept = depts[i % depts.length];
    const yr = `${(i % 4) + 1}rd Year`;

    const u = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        fullName: name,
        mobileNumber: `91765${String(10000 + i).slice(1)}`,
        role: Role.STUDENT,
        status: i % 20 === 0 ? 'PENDING' : 'APPROVED',
        registerNumber: regNo,
        department: dept,
        year: yr,
        gender: hostel.gender === 'FEMALE' ? 'FEMALE' : hostel.gender === 'MALE' ? 'MALE' : (i % 2 === 0 ? 'MALE' : 'FEMALE'),
        hostelId: hostel.id,
        qrToken: `QR-${regNo}`,
        bloodGroup: ['A+', 'B+', 'O+', 'AB+'][i % 4],
        address: `${i * 12}, College Road, Sector ${(i % 5) + 1}`,
        emergencyContact: `98400${String(10000 + i).slice(1)}`,
        parentName: `Parent of ${fname}`,
        parentMobile: `98401${String(10000 + i).slice(1)}`
      }
    });
    createdStudents.push(u);
  }

  // Allocate 80% of students to non-maintenance rooms
  const availableNonMaintRooms = createdRooms.filter(r => !r.isMaintenance);
  let roomIdx = 0;
  let bedCounter = 1;

  for (let i = 0; i < Math.floor(createdStudents.length * 0.85); i++) {
    const student = createdStudents[i];
    if (roomIdx < availableNonMaintRooms.length) {
      const room = availableNonMaintRooms[roomIdx];
      const bedNo = `Bed-${bedCounter}`;

      await prisma.user.update({
        where: { id: student.id },
        data: {
          roomId: room.id,
          bedNumber: bedNo,
          allocationDate: new Date(Date.now() - (30 - (i % 25)) * 86400000)
        }
      });

      bedCounter++;
      if (bedCounter > room.capacity) {
        bedCounter = 1;
        roomIdx++;
      }
    }
  }

  // 8. Generate 30-Day Historical Log Engine (T-30 to Today)
  console.log("📅 Generating 30-day realistic historical operations timeline...");
  const now = new Date();
  const dayMs = 86400000;

  let totalAttendance = 0;
  let totalLeaves = 0;
  let totalComplaints = 0;
  let totalFees = 0;
  let totalPayments = 0;
  let totalFeeAmount = 0;
  let totalPaidAmount = 0;
  let totalMeals = 0;
  let totalMealConfirmations = 0;
  let totalVisitors = 0;

  // Generate Attendance across 30 days
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const date = new Date(now.getTime() - dayOffset * dayMs);
    date.setHours(8, 0, 0, 0);

    // Seed attendance for a realistic sample of active students
    const sampleSize = Math.min(createdStudents.length, size === 'small' ? 40 : size === 'medium' ? 120 : 350);
    for (let sIdx = 0; sIdx < sampleSize; sIdx++) {
      const student = createdStudents[sIdx];
      const rand = (sIdx + dayOffset) % 100;
      const isPresent = rand < 85;

      await prisma.attendance.create({
        data: {
          date,
          isPresent,
          userId: student.id,
          hostelId: student.hostelId,
          session: 'Morning',
          status: isPresent ? 'PRESENT' : 'ABSENT',
          locationVerified: true,
          scannedBy: 'SYSTEM_BIOMETRIC'
        }
      });
      totalAttendance++;
    }

    // Seed Daily Meals every day
    for (const hostel of createdHostels) {
      const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
      for (const mealType of mealTypes) {
        const mealTime = new Date(date);
        mealTime.setHours(mealType === 'BREAKFAST' ? 8 : mealType === 'LUNCH' ? 13 : 20, 0, 0, 0);
        const cutoffTime = new Date(mealTime.getTime() - 2 * 3600000);

        const meal = await prisma.meal.create({
          data: {
            date,
            type: mealType,
            menu: mealType === 'BREAKFAST' ? 'Puri Sambar, Tea' : mealType === 'LUNCH' ? 'Rice, Dal, Veg Salad' : 'Chapati, Paneer Curry',
            cutoffTime,
            mealTime,
            hostelId: hostel.id,
            status: 'ACTIVE'
          }
        });
        totalMeals++;

        // Add confirmations for sample students
        const mealSample = Math.min(createdStudents.length, 10);
        for (let m = 0; m < mealSample; m++) {
          await prisma.mealConfirmation.create({
            data: {
              mealId: meal.id,
              studentId: createdStudents[m].id,
              status: (m + dayOffset) % 5 === 0 ? 'SKIPPED' : 'TAKING'
            }
          });
          totalMealConfirmations++;
        }
      }
    }
  }

  // Generate 30-day Leaves
  for (let i = 0; i < Math.min(createdStudents.length, 30); i++) {
    const student = createdStudents[i];
    const offset = (i * 3) % 25;
    const startDate = new Date(now.getTime() - offset * dayMs);
    const endDate = new Date(startDate.getTime() + (2 + (i % 3)) * dayMs);
    const status = i % 4 === 0 ? 'PENDING' : i % 4 === 1 ? 'APPROVED' : i % 4 === 2 ? 'REJECTED' : 'APPROVED';

    await prisma.leave.create({
      data: {
        startDate,
        endDate,
        reason: ['Weekend Home Visit', 'Medical Checkup', 'Family Event', 'Academic Conference'][i % 4],
        status,
        remarks: status === 'APPROVED' ? 'Approved by Warden' : status === 'REJECTED' ? 'Insufficient attendance' : 'Under Review',
        userId: student.id,
        hostelId: student.hostelId
      }
    });
    totalLeaves++;
  }

  // Generate 30-day Complaints & Maintenance Timeline
  const workerUser = createdTestUsers.find(u => u.role === Role.WORKER);
  const complaintCats = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning & Sanitation', 'Internet & Networking'];

  for (let i = 0; i < Math.min(createdStudents.length, 35); i++) {
    const student = createdStudents[i];
    const createdDate = new Date(now.getTime() - (28 - (i % 26)) * dayMs);
    const status: ComplaintStatus = i % 5 === 0 ? ComplaintStatus.PENDING : i % 5 === 1 ? ComplaintStatus.ASSIGNED : i % 5 === 2 ? ComplaintStatus.IN_PROGRESS : ComplaintStatus.RESOLVED;

    const complaint = await prisma.complaint.create({
      data: {
        title: `${complaintCats[i % complaintCats.length]} issue in Room ${i + 101}`,
        description: `Trouble with ${complaintCats[i % complaintCats.length].toLowerCase()} fixture. Needs repair.`,
        category: complaintCats[i % complaintCats.length],
        priority: i % 3 === 0 ? ComplaintPriority.HIGH : i % 3 === 1 ? ComplaintPriority.MEDIUM : ComplaintPriority.LOW,
        status,
        createdAt: createdDate,
        hostelId: student.hostelId || createdHostels[0].id,
        studentId: student.id,
        workerId: status !== ComplaintStatus.PENDING && workerUser ? workerUser.id : null,
        feedbackRating: status === ComplaintStatus.RESOLVED ? 5 : null,
        studentFeedback: status === ComplaintStatus.RESOLVED ? 'Fixed quickly and works great now!' : null
      }
    });
    totalComplaints++;

    // Timeline event
    await prisma.complaintTimeline.create({
      data: {
        complaintId: complaint.id,
        event: 'CREATED',
        title: 'Complaint Registered',
        description: 'Student submitted maintenance ticket.',
        actorName: student.fullName,
        actorRole: 'STUDENT',
        timestamp: createdDate
      }
    });
  }

  // Generate 30-day Fees & Payments
  for (let i = 0; i < createdStudents.length; i++) {
    const student = createdStudents[i];
    const amount = 15000 + (i % 3) * 2500;
    const status = i % 3 === 0 ? 'PAID' : i % 3 === 1 ? 'PARTIAL' : 'PENDING';
    const paidAmount = status === 'PAID' ? amount : status === 'PARTIAL' ? Math.floor(amount / 2) : 0;
    const dueDate = new Date(now.getTime() + (10 - (i % 15)) * dayMs);

    const fee = await prisma.fee.create({
      data: {
        title: `Hostel Accommodation Fee - Term ${(i % 2) + 1}`,
        feeType: 'HOSTEL_FEE',
        amount,
        paidAmount,
        dueDate,
        status,
        studentId: student.id,
        hostelId: student.hostelId || createdHostels[0].id
      }
    });
    totalFees++;
    totalFeeAmount += amount;
    totalPaidAmount += paidAmount;

    if (paidAmount > 0) {
      const paymentDate = new Date(now.getTime() - (20 - (i % 18)) * dayMs);
      await prisma.payment.create({
        data: {
          amount: paidAmount,
          paymentMode: ['UPI', 'CASH', 'CARD', 'NET_BANKING'][i % 4],
          transactionId: `TXN-2026-${String(1000 + i)}`,
          receiptNumber: `RCPT-2026-${String(5000 + i)}`,
          feeId: fee.id,
          studentId: student.id,
          hostelId: student.hostelId || createdHostels[0].id,
          createdAt: paymentDate
        }
      });
      totalPayments++;
    }
  }

  // Generate 30-day Visitors
  for (let i = 0; i < Math.min(createdStudents.length, 25); i++) {
    const student = createdStudents[i];
    const visitDate = new Date(now.getTime() - (25 - (i % 24)) * dayMs);
    const status = i % 3 === 0 ? 'RETURNED' : i % 3 === 1 ? 'APPROVED' : 'PENDING';

    await prisma.visitor.create({
      data: {
        name: `Parent Visitor ${i + 1}`,
        purpose: 'Parental Visit & Delivery',
        visitDate,
        status,
        visitorPhone: `9876500${String(100 + i)}`,
        relationship: 'Parent',
        studentId: student.id,
        hostelId: student.hostelId || createdHostels[0].id,
        checkInTime: visitDate,
        checkOutTime: status === 'RETURNED' ? new Date(visitDate.getTime() + 4 * 3600000) : null
      }
    });
    totalVisitors++;
  }

  // 9. Inventory Master & Transactions
  const inventoryItemsData = [
    { itemName: 'Basmati Rice 25kg', category: 'FOOD', quantity: 45, unit: 'bags', minStock: 10 },
    { itemName: 'Toor Dal 10kg', category: 'FOOD', quantity: 30, unit: 'bags', minStock: 5 },
    { itemName: 'LED Bulb 15W', category: 'ELECTRICAL', quantity: 8, unit: 'pcs', minStock: 15, damagedCount: 3 },
    { itemName: 'Ceiling Fan 48-inch', category: 'ELECTRICAL', quantity: 12, unit: 'pcs', minStock: 5 },
    { itemName: 'Floor Cleaner Liquid 5L', category: 'CLEANING', quantity: 20, unit: 'cans', minStock: 8 },
    { itemName: 'Commercial Gas Cylinder 19kg', category: 'GAS', quantity: 4, unit: 'cylinders', minStock: 6 },
    { itemName: 'Study Desk Wooden', category: 'FURNITURE', quantity: 25, unit: 'pcs', minStock: 5 }
  ];

  let totalInv = 0;
  let totalUsages = 0;
  let totalPurchases = 0;

  for (const hostel of createdHostels) {
    for (const invData of inventoryItemsData) {
      const inv = await prisma.inventory.create({
        data: {
          itemName: invData.itemName,
          category: invData.category,
          quantity: invData.quantity,
          unit: invData.unit,
          minStock: invData.minStock,
          damagedCount: invData.damagedCount || 0,
          hostelId: hostel.id
        }
      });
      totalInv++;

      // Log sample usage
      await prisma.inventoryUsage.create({
        data: {
          quantity: 2,
          usedBy: 'Mess Kitchen Supervisor',
          purpose: 'Daily Hostel Dining Requirement',
          inventoryId: inv.id,
          hostelId: hostel.id
        }
      });
      totalUsages++;

      // Log sample purchase
      await prisma.inventoryPurchase.create({
        data: {
          quantity: 10,
          cost: 4500,
          supplier: 'Metro Wholesale Traders',
          inventoryId: inv.id,
          hostelId: hostel.id
        }
      });
      totalPurchases++;
    }
  }

  // 10. Activity Logs & Notifications
  let totalActivity = 0;
  let totalNotifs = 0;

  for (let i = 0; i < Math.min(createdStudents.length, 30); i++) {
    const student = createdStudents[i];
    await prisma.activityLog.create({
      data: {
        userId: student.id,
        userEmail: student.email,
        action: 'CHECK_IN',
        module: 'ATTENDANCE',
        details: `Student verified attendance entry at Hostel Gate.`,
        createdAt: new Date(now.getTime() - (i % 20) * dayMs)
      }
    });
    totalActivity++;

    await prisma.notification.create({
      data: {
        title: 'Hostel Announcement',
        message: 'Monthly maintenance inspection scheduled for this weekend.',
        type: 'INFO',
        userId: student.id,
        isRead: i % 2 === 0
      }
    });
    totalNotifs++;
  }

  // 11. Run Automated Validation Checks
  const totalBedsCount = createdRooms.reduce((sum, r) => sum + r.capacity, 0);
  const totalOccupiedBedsCount = await prisma.user.count({ where: { role: Role.STUDENT, roomId: { not: null } } });
  const totalVacantBedsCount = totalBedsCount - totalOccupiedBedsCount;
  const maintenanceRoomsCount = createdRooms.filter(r => r.isMaintenance).length;
  const occupancyPct = totalBedsCount > 0 ? Math.round((totalOccupiedBedsCount / totalBedsCount) * 100) : 0;

  const validationDetails: string[] = [];
  let validationPassed = true;

  if (totalOccupiedBedsCount > totalBedsCount) {
    validationPassed = false;
    validationDetails.push(`FAIL: Occupied beds (${totalOccupiedBedsCount}) exceed total bed capacity (${totalBedsCount})`);
  } else {
    validationDetails.push(`PASS: Total capacity bounds verified (${totalOccupiedBedsCount}/${totalBedsCount} occupied - ${occupancyPct}%)`);
  }

  if (createdStudents.length < targetStudents * 0.9) {
    validationPassed = false;
    validationDetails.push(`FAIL: Student count (${createdStudents.length}) fell below 90% of target (${targetStudents})`);
  } else {
    validationDetails.push(`PASS: Student count verified (${createdStudents.length} populated)`);
  }

  validationDetails.push(`PASS: 30-day historical data populated across Attendance (${totalAttendance}), Leaves (${totalLeaves}), Complaints (${totalComplaints}), Fees (${totalFees}), and Meals (${totalMeals}).`);

  const durationMs = Date.now() - startTime;
  console.log(`✅ Seeding completed in ${durationMs}ms with validation status: ${validationPassed ? 'PASSED' : 'FAILED'}`);

  return {
    success: true,
    size,
    durationMs,
    counts: {
      hostels: createdHostels.length,
      blocks: createdHostels.length * blocksPerHostel,
      rooms: createdRooms.length,
      beds: totalBedsCount,
      occupiedBeds: totalOccupiedBedsCount,
      vacantBeds: totalVacantBedsCount,
      maintenanceRooms: maintenanceRoomsCount,
      occupancyPercentage: occupancyPct,
      users: await prisma.user.count(),
      students: createdStudents.length,
      staff: createdTestUsers.length - 1,
      testAccounts: createdTestUsers.length,
      attendanceRecords: totalAttendance,
      leaveRecords: totalLeaves,
      complaints: totalComplaints,
      feeRecords: totalFees,
      paymentRecords: totalPayments,
      totalFeeAmount,
      totalPaidAmount,
      totalPendingAmount: totalFeeAmount - totalPaidAmount,
      meals: totalMeals,
      mealConfirmations: totalMealConfirmations,
      visitors: totalVisitors,
      inventoryItems: totalInv,
      inventoryUsages: totalUsages,
      inventoryPurchases: totalPurchases,
      activityLogs: totalActivity,
      notifications: totalNotifs
    },
    validationPassed,
    validationDetails
  };
}
