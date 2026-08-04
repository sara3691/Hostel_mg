import { PrismaClient, Role, ApprovalStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default hostel
  const hostel = await prisma.hostel.upsert({
    where: { code: 'DH001' },
    update: {},
    create: {
      name: 'Demo Hostel A',
      code: 'DH001',
      collegeName: 'Demo College',
      address: '123 College St',
      capacity: 200,
    },
  });
  console.log(`✓ Hostel: ${hostel.name} (${hostel.id})`);

  // Create super admin
  const adminPasswordHash = await argon2.hash('admin@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@user' },
    update: {},
    create: {
      email: 'admin@user',
      fullName: 'Super Admin',
      mobileNumber: '1234567890',
      passwordHash: adminPasswordHash,
      role: Role.SUPER_ADMIN,
      status: ApprovalStatus.APPROVED,
    },
  });
  console.log(`✓ Admin User: ${admin.email}`);

  // Create default attendance settings
  const settingsCount = await prisma.attendanceSettings.count();
  if (settingsCount === 0) {
    const settings = await prisma.attendanceSettings.create({
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
    console.log("✓ Default Attendance Settings Created");
  }

  // Create default attendance sessions
  const sessions = ['Morning', 'Afternoon', 'Evening', 'Night'];
  for (const sessionName of sessions) {
    await prisma.attendanceSession.upsert({
      where: { name: sessionName },
      update: {},
      create: {
        name: sessionName,
        isActive: true
      }
    });
  }
  console.log("✓ Attendance Sessions seeded: " + sessions.join(', '));

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
